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
  ),
  barberIdColumn: ensureSheetHeaderColumn(
    sheet,
    BARBER_ID_HEADER_ALIASES,
    "barberId",
    15
  ),
  barberCodeColumn: ensureSheetHeaderColumn(
    sheet,
    BARBER_CODE_HEADER_ALIASES,
    "barberCode",
    16
  ),
  barberNameColumn: ensureSheetHeaderColumn(
    sheet,
    BARBER_NAME_HEADER_ALIASES,
    "barberName",
    17
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
      duplicate: true
    };
  }
  return null;
}

function getInvoicePaymentDetails(data) {
  const total = parseSheetAmount(data.total);
  const paidAmount = parseSheetAmount(data.paidAmount || data.paid || total);
  const tipAmount = parseSheetAmount(data.tipAmount || data.tip || 0);
  const finalPaidAmount = paidAmount > 0 ? paidAmount : total;

  return {
    paidAmount: finalPaidAmount,
    tipAmount: Math.max(0, tipAmount)
  };
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

