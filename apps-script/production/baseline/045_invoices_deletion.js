function deleteInvoice(data) {
  const permissionError = requirePermission(data, "view_invoices", "You do not have permission to delete invoices.");
  if (permissionError) return permissionError;

  const sheet = SpreadsheetApp.getActive().getSheetByName("DATA");
  if (!sheet) {
    return jsonOutput({ status: "error", message: "Sheet DATA not found" });
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return jsonOutput({ status: "error", message: "Invoice not found" });
  }

  const targetRowNumber = Number(data.rowNumber);
  const targetInvoiceId = String(data.invoiceId || "").trim();

  if (
    targetRowNumber < 2 ||
    targetRowNumber > lastRow ||
    !targetInvoiceId ||
    targetInvoiceId !== `DATA-${targetRowNumber}`
  ) {
    return jsonOutput({ status: "error", message: "Invoice must be loaded from the sheet before deletion." });
  }

  if (
    targetRowNumber >= 2 &&
    targetRowNumber <= lastRow &&
    (!targetInvoiceId || targetInvoiceId === `DATA-${targetRowNumber}`)
  ) {
    const row = sheet.getRange(targetRowNumber, 1, 1, 13).getValues()[0];
    const lockedError = getLockedDateError(row[0], "Invoice");
    if (lockedError) {
      return jsonOutput({ status: "error", message: lockedError, locked: true });
    }

    sheet.deleteRow(targetRowNumber);

    logActivity(
      data,
      "delete",
      "invoice",
      targetInvoiceId || `DATA-${targetRowNumber}`,
      `Deleted invoice | Customer: ${row[1] || "-"} | Phone: ${row[2] || "-"} | Total: ${row[5] || 0} | Barber: ${row[9] || "-"}`
    );

    return jsonOutput({ status: "success" });
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
  const targetName = String(data.customerName || "").trim();
  const targetPhone = String(data.customerPhone || "").trim();
  const targetTotal = parseSheetAmount(data.total);
  const targetPdfUrl = String(data.pdfUrl || "").trim();
  const targetDate = String(data.date || "").trim();

  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];

    const nameMatches = !targetName || String(row[1] || "").trim() === targetName;
    const phoneMatches = !targetPhone || String(row[2] || "").trim() === targetPhone;
    const totalMatches = !targetTotal || parseSheetAmount(row[5]) === targetTotal;
    const pdfMatches = !targetPdfUrl || String(row[4] || "").trim() === targetPdfUrl;
    const dateMatches = !targetDate || getDateKey(row[0], TIME_ZONE) === getDateKey(targetDate, TIME_ZONE);

    if (nameMatches && phoneMatches && totalMatches && pdfMatches && dateMatches) {
      const lockedError = getLockedDateError(row[0], "Invoice");
      if (lockedError) {
        return jsonOutput({ status: "error", message: lockedError, locked: true });
      }

      sheet.deleteRow(i + 2);

      logActivity(
        data,
        "delete",
        "invoice",
        `DATA-${i + 2}`,
        `Deleted invoice | Customer: ${row[1] || "-"} | Phone: ${row[2] || "-"} | Total: ${row[5] || 0} | Barber: ${row[9] || "-"}`
      );

      return jsonOutput({ status: "success" });
    }
  }

  return jsonOutput({ status: "error", message: "Invoice not found" });
}

