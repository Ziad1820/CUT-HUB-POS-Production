const DATA_INVOICE_READ_HEADER_CONTRACT = Object.freeze([
  Object.freeze({ name: "DATE", aliases: Object.freeze(["DATE", "INVOICE DATE", "INVOICE_DATE"]) }),
  Object.freeze({ name: "CUSTOMER", aliases: Object.freeze(["CUSTOMER", "CUSTOMER NAME", "CUSTOMER_NAME", "NAME"]) }),
  Object.freeze({ name: "PHONE", aliases: Object.freeze(["PHONE", "CUSTOMER PHONE", "CUSTOMER_PHONE"]) }),
  Object.freeze({ name: "SERVICES", aliases: Object.freeze(["SERVICES", "SERVICE"]) }),
  Object.freeze({ name: "PDF", aliases: Object.freeze(["PDF", "PDF URL", "PDF_URL", "INVOICE PDF", "INVOICE_PDF"]) }),
  Object.freeze({ name: "TOTAL", aliases: Object.freeze(["TOTAL"]) }),
  Object.freeze({ name: "PAID_AMOUNT", aliases: Object.freeze(["PAID", "PAID AMOUNT", "PAID_AMOUNT"]) }),
  Object.freeze({ name: "TIP_AMOUNT", aliases: Object.freeze(["TIP", "TIP AMOUNT", "TIP_AMOUNT"]) }),
  Object.freeze({ name: "PAYMENT", aliases: Object.freeze(["PAYMENT", "PAYMENT METHOD", "PAYMENT_METHOD"]) }),
  Object.freeze({ name: "BARBER", aliases: Object.freeze(["BARBER", "STAFF", "EMPLOYEE"]) }),
  Object.freeze({ name: "NOTES", aliases: Object.freeze(["NOTE", "NOTES"]) }),
  Object.freeze({ name: "DISCOUNT_PERCENT", aliases: Object.freeze(["DISCOUNT", "DISCOUNT PERCENT", "DISCOUNT_PERCENT"]) }),
  Object.freeze({ name: "DISCOUNT_AMOUNT", aliases: Object.freeze(["DISCOUNT AMOUNT", "DISCOUNT_AMOUNT"]) })
]);

function inspectDataInvoiceSchemaReadOnly(sheet) {
  const inspected = inspectPositionalSheetSchema(sheet, {
    sheetName: "DATA",
    label: "Invoice DATA",
    contract: DATA_INVOICE_READ_HEADER_CONTRACT,
    notReadyCode: "INVOICE_SCHEMA_NOT_READY",
    incompatibleCode: "INVOICE_SCHEMA_INCOMPATIBLE",
    duplicateCode: "INVOICE_SCHEMA_DUPLICATE_HEADERS"
  });
  const requestIdAliases = INVOICE_REQUEST_ID_HEADER_ALIASES.map(normalizeSheetHeader);
  const requestIdColumns = inspected.normalized.reduce((columns, header, index) => {
    if (requestIdAliases.indexOf(header) !== -1) columns.push(index + 1);
    return columns;
  }, []);
  if (requestIdColumns.length > 1) {
    throw schemaContractError(
      "INVOICE_SCHEMA_DUPLICATE_HEADERS",
      "Invoice DATA schema contains ambiguous invoice request ID headers.",
      { sheetName: "DATA", columns: requestIdColumns }
    );
  }
  return { headers: inspected.headers, invoiceRequestIdColumn: requestIdColumns[0] || 0 };
}

function ensureDataInvoiceColumns(sheet) {
  const requiredColumns = 13;
  const currentColumns = sheet.getMaxColumns();
  if (currentColumns < requiredColumns) {
    sheet.insertColumnsAfter(currentColumns, requiredColumns - currentColumns);
  }

  sheet.getRange(1, 6, 1, 6).setValues([["TOTAL", "paid amount", "tip amount", "PAYMENT", "BARBER", "Notes"]]);
  sheet.getRange(1, 12, 1, 2).setValues([["discount percent", "discount amount"]]);
  return {
    invoiceRequestIdColumn: ensureSheetHeaderColumn(
      sheet,
      INVOICE_REQUEST_ID_HEADER_ALIASES,
      "invoice request id",
      14
    )
  };
}

function getInvoiceRequestIdColumn(sheet) {
  return findSheetHeaderColumn(
    sheet,
    INVOICE_REQUEST_ID_HEADER_ALIASES,
    14
  );
}

function findInvoiceByRequestId(sheet, requestId, requestIdColumn) {
  const actualRequestIdColumn = requestIdColumn || getInvoiceRequestIdColumn(sheet);
  if (!sheet || !requestId || !actualRequestIdColumn || typeof sheet.getRange !== "function") return null;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const requestIds = sheet.getRange(2, actualRequestIdColumn, lastRow - 1, 1).getValues();
  for (let index = requestIds.length - 1; index >= 0; index -= 1) {
    if (inventoryText(requestIds[index][0]) !== requestId) continue;
    const rowNumber = index + 2;
    const row = sheet.getRange(rowNumber, 1, 1, Math.max(13, actualRequestIdColumn)).getValues()[0];
    return {
      success: true,
      status: "success",
      pdfUrl: inventoryText(row[4]),
      invoiceId: `DATA-${rowNumber}`,
      rowNumber,
      duplicate: true,
      invoiceRequestId: requestId
    };
  }
  return null;
}

function getInvoicePaymentDetails(data) {
  return {
    paidAmount: financialNumber(data.paidAmount ?? data.paid ?? data.total),
    tipAmount: financialNumber(data.tipAmount ?? data.tip ?? 0)
  };
}

// Validate wire values before tolerant spreadsheet parsers can coerce invalid input to zero.
function financialNumber(value) {
  if (typeof value !== "number" && typeof value !== "string") return NaN;
  if (typeof value === "string" && !/^\d+(?:\.\d+)?$/.test(value.trim())) return NaN;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= Number.MAX_SAFE_INTEGER / 100 ? number : NaN;
}

function validateInvoiceFinance(data) {
  for (const key of ["total", "paidAmount", "paid", "tipAmount", "tip", "discountPercent", "discountAmount"]) {
    if (data[key] !== undefined && !Number.isFinite(financialNumber(data[key]))) {
      return { status: "error", success: false, code: "INVALID_FINANCIAL_VALUE", message: "قيمة مالية غير صحيحة: " + key };
    }
  }
  const fields = { total: data.total, paidAmount: data.paidAmount ?? data.paid ?? data.total,
    tipAmount: data.tipAmount ?? data.tip ?? 0, discountPercent: data.discountPercent ?? 0,
    discountAmount: data.discountAmount ?? 0 };
  for (const key of Object.keys(fields)) {
    if (!Number.isFinite(financialNumber(fields[key]))) return { status: "error", success: false,
      code: "INVALID_FINANCIAL_VALUE", message: "قيمة مالية غير صحيحة: " + key };
  }
  const total = financialNumber(fields.total), paid = financialNumber(fields.paidAmount), tip = financialNumber(fields.tipAmount);
  if (Number(fields.discountPercent) > 100 || paid + 0.01 < total + tip) {
    return { status: "error", success: false, code: "INVALID_INVOICE_AMOUNTS", message: "راجع الخصم والمبلغ المدفوع والبقشيش." };
  }
  if (data.subtotalBeforePremium !== undefined || data.premiumExtra !== undefined) {
    const subtotal = financialNumber(data.subtotalBeforePremium ?? 0), premium = financialNumber(data.premiumExtra ?? 0);
    const gross = subtotal + premium, discount = Number(fields.discountAmount);
    if (!Number.isFinite(gross) || discount > gross || Math.abs(total - (gross - discount)) > 0.01 ||
        Math.abs(discount - Math.round(gross * Number(fields.discountPercent) / 100)) > 0.01) {
      return { status: "error", success: false, code: "INVOICE_TOTAL_MISMATCH", message: "إجمالي الفاتورة والخصم غير متطابقين." };
    }
  }
  const payment = String(data.payment || data.paymentMethod || "").trim().toLowerCase().replace(/\s+/g, " ");
  const allowed = ["cash", "visa", "instapay", "insta pay", "vodafone_cash", "vodafone cash",
    "نقدي", "نقدى", "كاش", "فيزا", "انستا باي", "انستاباي", "إنستا باي", "فودافون كاش"];
  if (allowed.indexOf(payment) === -1) return { status: "error", success: false,
    code: "INVALID_PAYMENT_METHOD", message: "اختار طريقة دفع صحيحة." };
  return null;
}

// The existing business ID column is the durable receipt. Hold the script lock across lookup and append.
function appendFinanceOnce(data, sheetName, row, label) {
  let paymentMethod;
  try { paymentMethod = financePaymentMethod(data.paymentMethod ?? data.payment); }
  catch (_) { return jsonOutput({ status: "error", code: "INVALID_PAYMENT_METHOD", message: "اختار طريقة دفع صحيحة." }); }
  const id = row[row.length - 1];
  if (!id || String(id).length > 200) return jsonOutput({ status: "error", code: "INVALID_OPERATION_ID", message: "رقم العملية مطلوب." });
  if (!Number.isFinite(financialNumber(row[1])) || financialNumber(row[1]) <= 0) {
    return jsonOutput({ status: "error", code: "INVALID_FINANCIAL_VALUE", message: "المبلغ لازم يكون رقم أكبر من صفر." });
  }
  row[1] = financialNumber(row[1]);
  const lock = LockService.getScriptLock();
  let held = false;
  try {
    lock.waitLock(30000); held = true;
    const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
    if (!sheet) return jsonOutput({ status: "error", message: "Sheet " + sheetName + " not found" });
    const rows = readFinanceRows(sheet, row.length + 1);
    for (let index = rows.length - 1; index >= 0; index -= 1) {
      const previous = rows[index];
      if (String(previous[row.length - 1]) !== String(id)) continue;
      const equal = financePaymentMethod(previous[row.length]) === paymentMethod && row.every((value, column) => {
        if (column === 1) return Number(previous[column]) === value;
        if (column === row.length - 2 && previous[column] instanceof Date) {
          return getDateKey(previous[column], TIME_ZONE) === String(value).slice(0, 10);
        }
        return String(previous[column] ?? "") === String(value ?? "");
      });
      return jsonOutput(equal ? { status: "success", duplicate: true, operationId: String(id) }
        : { status: "error", code: "OPERATION_ID_CONFLICT", message: "رقم العملية مستخدم ببيانات مختلفة. راجع السجل." });
    }
    const lockedError = getLockedDateError(row[row.length - 2], label);
    if (lockedError) return jsonOutput({ status: "error", message: lockedError, locked: true });
    ensureFinanceColumns(sheet, row.length + 1, ["PAYMENT_METHOD"]);
    sheet.appendRow(row.concat([paymentMethod]));
    // Do not turn a committed financial write into a retryable failure if secondary logging fails.
    let auditPending = false;
    try { logActivity(data, "create", label.toLowerCase(), String(id), "Created " + label + " | Amount: " + row[1] + " | Payment: " + paymentMethod); }
    catch (_) { auditPending = true; }
    return jsonOutput({ status: "success", operationId: String(id), auditPending });
  } catch (_) {
    return jsonOutput({ status: "error", code: "FINANCE_SAVE_UNCONFIRMED", message: "لم يتأكد الحفظ. أعد المحاولة بنفس رقم العملية." });
  } finally {
    if (held) { try { lock.releaseLock(); } catch (_) {} }
  }
}

function financePaymentMethod(value) {
  const text = String(value ?? "").trim().toLowerCase().replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/\s+/g, " ");
  const methods = { "": "cash", cash: "cash", "نقدي": "cash", "كاش": "cash", visa: "visa", "فيزا": "visa",
    instapay: "instapay", "insta pay": "instapay", "انستا باي": "instapay", "انستاباي": "instapay",
    vodafone_cash: "vodafone_cash", "vodafone cash": "vodafone_cash", "فودافون كاش": "vodafone_cash" };
  if (!Object.prototype.hasOwnProperty.call(methods, text)) throw new Error("INVALID_PAYMENT_METHOD");
  return methods[text];
}

function readFinanceRows(sheet, width) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const available = typeof sheet.getMaxColumns === "function" ? Math.min(width, sheet.getMaxColumns()) : width;
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, available).getValues();
}

function ensureFinanceColumns(sheet, startColumn, headers) {
  if (typeof sheet.getMaxColumns !== "function") return;
  const end = startColumn + headers.length - 1, capacity = sheet.getMaxColumns();
  if (capacity < end) sheet.insertColumnsAfter(capacity, end - capacity);
  headers.forEach((header, index) => {
    const cell = sheet.getRange(1, startColumn + index);
    const current = String(cell.getValue() || "").trim();
    if (current && current !== header) throw new Error("FINANCE_COLUMN_CONFLICT");
    if (!current) cell.setValue(header);
  });
}

function financePaymentBreakdown(receipts, expenseRows, withdrawalRows, matchesDate) {
  const expenses = { cash: 0, visa: 0, instapay: 0, vodafone_cash: 0 };
  const withdrawals = { cash: 0, visa: 0, instapay: 0, vodafone_cash: 0 };
  expenseRows.forEach(row => { if (matchesDate(row[4])) expenses[financePaymentMethod(row[6])] += parseSheetAmount(row[1]); });
  withdrawalRows.forEach(row => { if (matchesDate(row[3])) withdrawals[financePaymentMethod(row[5])] += parseSheetAmount(row[1]); });
  const balances = {};
  Object.keys(expenses).forEach(method => { balances[method] = (receipts[method] || 0) - expenses[method] - withdrawals[method]; });
  return { paymentReceipts: receipts, expensePayments: expenses, withdrawalPayments: withdrawals, paymentBalances: balances };
}

function invoiceRowAuditSnapshot(row) {
  return {
    date: getDateKey(row[0], TIME_ZONE) || String(row[0] || "").trim(),
    customerName: String(row[1] || "").trim(),
    customerPhone: String(row[2] || "").trim(),
    services: String(row[3] || "").trim(),
    pdfUrl: String(row[4] || "").trim(),
    total: parseSheetAmount(row[5]),
    paidAmount: parseSheetAmount(row[6]),
    tipAmount: parseSheetAmount(row[7]),
    paymentMethod: String(row[8] || "").trim(),
    barber: String(row[9] || "").trim(),
    note: String(row[10] || "").trim(),
    discountPercent: parseSheetAmount(row[11]),
    discountAmount: parseSheetAmount(row[12])
  };
}

