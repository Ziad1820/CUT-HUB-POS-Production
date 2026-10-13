function createInvoice(data) {
  const permissionError = requirePermission(data, "access_cashier", "You do not have permission to create invoices.");
  if (permissionError) return permissionError;
  const lock = LockService.getScriptLock();
  let sheet = null;
  let invoiceRowNumber = 0;
  let inventoryTransaction = null;
  let pdfUrl = "";
  let persistedRequestId = "";
  let invoiceRequestIdColumn = 0;
  try {
    lock.waitLock(30000);
    const invoiceCache = CacheService.getScriptCache();
    const requestId = inventoryText(data.idempotencyKey || data.clientRequestId);
    const fingerprint = inventoryText(data.invoiceFingerprint);
    const fingerprintDigest = fingerprint
      ? Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, fingerprint)).replace(/=+$/, "")
      : "";
    const requestCacheKey = requestId ? `invoice-request-${requestId}` : "";
    const fingerprintCacheKey = fingerprintDigest ? `invoice-fingerprint-${fingerprintDigest}` : "";
    const cachedInvoice = (requestCacheKey && invoiceCache.get(requestCacheKey)) || (fingerprintCacheKey && invoiceCache.get(fingerprintCacheKey));
    if (cachedInvoice) return jsonOutput(JSON.parse(cachedInvoice));

    sheet = SpreadsheetApp.getActive().getSheetByName("DATA");
    const persistedInvoice = findInvoiceByRequestId(sheet, requestId);
    if (persistedInvoice) return jsonOutput(persistedInvoice);
    const invoiceDateTime = getInvoiceDateTime(data);
    const lockedError = getLockedDateError(invoiceDateTime, "Invoice");
    if (lockedError) return jsonOutput({ success: false, status: "error", message: lockedError, locked: true });

    const inventoryPlan = prepareInventoryCheckout(data);
    if (inventoryPlan.error) {
      return jsonOutput({
        success: false,
        status: "error",
        inventoryError: true,
        code: inventoryPlan.code || "INVENTORY_ERROR",
        message: inventoryPlan.message || "The inventory could not be validated.",
        items: inventoryPlan.items || inventoryPlan.insufficientItems || []
      });
    }

    persistedRequestId = requestId || `invoice-server-${Utilities.getUuid()}`;
    invoiceRequestIdColumn = ensureDataInvoiceColumns(sheet).invoiceRequestIdColumn;
    pdfUrl = createInvoicePdf(data);
    const paymentDetails = getInvoicePaymentDetails(data);
    const invoiceRow = [
      invoiceDateTime,
      data.customerName || "",
      data.customerPhone || "",
      data.services || "",
      pdfUrl,
      data.total || 0,
      paymentDetails.paidAmount,
      paymentDetails.tipAmount,
      data.payment || data.paymentMethod || "",
      data.barber || "",
      data.note || data.invoiceNote || "",
      parseSheetAmount(data.discountPercent || 0),
      parseSheetAmount(data.discountAmount || 0)
    ];
    while (invoiceRow.length < invoiceRequestIdColumn) invoiceRow.push("");
    invoiceRow[invoiceRequestIdColumn - 1] = persistedRequestId;
    sheet.appendRow(invoiceRow);
    invoiceRowNumber = sheet.getLastRow();
    const invoiceId = `DATA-${invoiceRowNumber}`;
    inventoryTransaction = applyInventoryCheckout(
      inventoryPlan,
      requestId ? data : { ...data, idempotencyKey: persistedRequestId },
      invoiceId
    );

    logActivity(data, "create", "invoice", invoiceId, `Created invoice for ${data.customerName || "-"} | Total: ${data.total || 0} | Barber: ${data.barber || "-"}`);
    const response = { success: true, status: "success", pdfUrl, invoiceId, rowNumber: invoiceRowNumber, duplicate: false };
    const cachedResponse = JSON.stringify(response);
    try {
      if (requestCacheKey) invoiceCache.put(requestCacheKey, cachedResponse, 21600);
      if (fingerprintCacheKey) invoiceCache.put(fingerprintCacheKey, JSON.stringify({ ...response, duplicate: true }), 300);
    } catch (cacheError) {
      console.warn("Invoice idempotency cache could not be updated:", cacheError);
    }
    return jsonOutput(response);
  } catch (error) {
    if (inventoryTransaction) {
      try { rollbackInventoryCheckout(inventoryTransaction); } catch (rollbackError) {
        console.error("Inventory rollback failed:", rollbackError);
      }
    }
    if (sheet && invoiceRowNumber >= 2 && invoiceRowNumber <= sheet.getLastRow()) {
      try {
        const persistedInvoice = findInvoiceByRequestId(sheet, persistedRequestId, invoiceRequestIdColumn);
        const rollbackRowNumber = persistedInvoice?.rowNumber || invoiceRowNumber;
        const rollbackRequestId = invoiceRequestIdColumn && typeof sheet.getRange === "function"
          ? inventoryText(sheet.getRange(rollbackRowNumber, invoiceRequestIdColumn).getValue())
          : persistedRequestId;
        if (rollbackRequestId === persistedRequestId) sheet.deleteRow(rollbackRowNumber);
      } catch (rollbackError) {
        console.error("Invoice rollback failed:", rollbackError);
      }
    }
    if (pdfUrl) {
      try {
        const fileIdMatch = String(pdfUrl).match(/\/d\/([^/]+)/);
        if (fileIdMatch) DriveApp.getFileById(fileIdMatch[1]).setTrashed(true);
      } catch (rollbackError) {
        console.error("Invoice PDF rollback failed:", rollbackError);
      }
    }
    return jsonOutput({
      success: false,
      status: "error",
      code: "INVOICE_COMPLETION_FAILED",
      message: "The invoice could not be completed. No invoice or inventory changes were saved."
    });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}


function updateInvoice(data) {
  try {
    const permissionError = requirePermission(data, "view_invoices", "You do not have permission to edit invoices.");
    if (permissionError) return permissionError;

    const sheet = SpreadsheetApp.getActive().getSheetByName("DATA");
    if (!sheet) {
      return jsonOutput({ status: "error", message: "Sheet DATA not found" });
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return jsonOutput({ status: "error", message: "Invoice not found" });
    }

    const targetRowNumber = Number(data.rowNumber || 0);
    const targetInvoiceId = String(data.invoiceId || "").trim();

    if (
      targetRowNumber < 2 ||
      targetRowNumber > lastRow ||
      !targetInvoiceId ||
      (targetInvoiceId && targetInvoiceId !== `DATA-${targetRowNumber}`)
    ) {
      return jsonOutput({ status: "error", message: "Invoice must be loaded from the sheet before editing." });
    }

    ensureDataInvoiceColumns(sheet);
    const currentRow = sheet.getRange(targetRowNumber, 1, 1, 13).getValues()[0];
    const beforeUpdate = invoiceRowAuditSnapshot(currentRow);
    const currentDate = currentRow[0];
    const nextDate = getDateKey(data.date || data.dateKey || currentDate, TIME_ZONE) || currentDate;

    const currentLockedError = getLockedDateError(currentDate, "Invoice");
    if (currentLockedError) {
      return jsonOutput({ status: "error", message: currentLockedError, locked: true });
    }

    const nextLockedError = getLockedDateError(nextDate, "Invoice");
    if (nextLockedError) {
      return jsonOutput({ status: "error", message: nextLockedError, locked: true });
    }

    const updatedRow = [
      nextDate,
      data.customerName || "",
      data.customerPhone || "",
      data.services || "",
      data.pdfUrl || currentRow[4] || "",
      data.total || 0,
      data.paidAmount || currentRow[6] || data.total || 0,
      data.tipAmount || currentRow[7] || 0,
      data.payment || data.paymentMethod || "",
      data.barber || "",
      data.note || data.invoiceNote || "",
      parseSheetAmount(data.discountPercent || currentRow[11] || 0),
      parseSheetAmount(data.discountAmount || currentRow[12] || 0)
    ];

    sheet.getRange(targetRowNumber, 1, 1, 13).setValues([updatedRow]);
    const afterUpdate = invoiceRowAuditSnapshot(updatedRow);

    logActivity(
      data,
      "update",
      "invoice",
      targetInvoiceId || `DATA-${targetRowNumber}`,
      `Updated invoice ${targetInvoiceId || `DATA-${targetRowNumber}`} | Before: ${JSON.stringify(beforeUpdate)} | After: ${JSON.stringify(afterUpdate)}`
    );

    return jsonOutput({
      status: "success",
      invoice: {
        invoiceId: targetInvoiceId || `DATA-${targetRowNumber}`,
        rowNumber: targetRowNumber,
        date: getDisplayDateTime(updatedRow[0]),
        dateKey: getDateKey(updatedRow[0], TIME_ZONE),
        customerName: String(updatedRow[1] || "").trim(),
        customerPhone: String(updatedRow[2] || "").trim(),
        services: String(updatedRow[3] || "").trim(),
        pdfUrl: String(updatedRow[4] || "").trim(),
        total: parseSheetAmount(updatedRow[5]),
        paidAmount: parseSheetAmount(updatedRow[6]),
        tipAmount: parseSheetAmount(updatedRow[7]),
        paymentMethod: String(updatedRow[8] || "").trim(),
        barber: String(updatedRow[9] || "").trim(),
        note: String(updatedRow[10] || "").trim(),
        discountPercent: parseSheetAmount(updatedRow[11]),
        discountAmount: parseSheetAmount(updatedRow[12])
      }
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

