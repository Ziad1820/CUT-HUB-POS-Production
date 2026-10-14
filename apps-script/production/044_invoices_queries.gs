function getOptionalDateRange(data, filters, requireBoth) {
  const source = filters || {};
  const rawFrom = source.fromDate || data.fromDate || data.startDate || "";
  const rawTo = source.toDate || data.toDate || data.endDate || "";
  const hasFrom = String(rawFrom || "").trim() !== "";
  const hasTo = String(rawTo || "").trim() !== "";
  if (!hasFrom && !hasTo) return null;
  if (requireBoth && (!hasFrom || !hasTo)) throw new Error("Both fromDate and toDate are required.");

  const fromDate = hasFrom ? getDateKey(rawFrom, TIME_ZONE) : "";
  const toDate = hasTo ? getDateKey(rawTo, TIME_ZONE) : "";
  if ((hasFrom && !isCanonicalDateKey(fromDate)) || (hasTo && !isCanonicalDateKey(toDate))) {
    throw new Error("A valid date range is required.");
  }
  if (fromDate && toDate && fromDate > toDate) throw new Error("fromDate must not be after toDate.");
  return { fromDate, toDate };
}

function isCanonicalDateKey(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(year, month, 0).getDate();
}

function isDateInOptionalRange(value, range) {
  if (!range) return true;
  const dateKey = getDateKey(value, TIME_ZONE);
  return Boolean(dateKey) &&
    (!range.fromDate || dateKey >= range.fromDate) &&
    (!range.toDate || dateKey <= range.toDate);
}

function isTransientInvoiceReadFailure(error) {
  return /^Service Spreadsheets failed while accessing document\b/i.test(String(error && error.message || ""));
}

function readInvoiceDataSnapshot() {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const sheet = SpreadsheetApp.getActive().getSheetByName("DATA");
      if (!sheet) return { sheetFound: false };
      const schema = inspectDataInvoiceSchemaReadOnly(sheet) || {};
      const lastRow = sheet.getLastRow();
      return {
        sheetFound: true,
        lastRow,
        invoiceRequestIdColumn: schema.invoiceRequestIdColumn || 0,
        rows: lastRow < 2 ? [] : sheet.getRange(2, 1, lastRow - 1, Math.max(Math.min(sheet.getLastColumn(), 13), schema.invoiceRequestIdColumn || 0)).getValues()
      };
    } catch (error) {
      if (!isTransientInvoiceReadFailure(error) || attempt === 2) throw error;
      // Retry only these read-only sheet calls, after authentication has run.
      // No request, session handling, invoice creation or mutation is replayed.
      Utilities.sleep(attempt === 0 ? 250 : 750);
    }
  }
}

function getInvoices(data) {
  const filters = data.filters || {};
  let range;
  try {
    range = getOptionalDateRange(data, filters);
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
  let snapshot;
  try {
    snapshot = readInvoiceDataSnapshot();
  } catch (error) {
    const temporary = isTransientInvoiceReadFailure(error);
    const schema = /^INVOICE_SCHEMA_/.test(String(error.code || ""));
    return jsonOutput({
      status: "error",
      code: temporary ? "INVOICE_READ_TEMPORARILY_UNAVAILABLE" : schema ? error.code : "INVOICE_READ_FAILED",
      message: temporary ? "تعذر قراءة الفواتير مؤقتًا. حاول تحميلها مرة أخرى." : schema
        ? error.message : "تعذر قراءة بيانات الفواتير.",
      retryable: temporary
    });
  }
  if (!snapshot.sheetFound) {
    return jsonOutput({
      status: "error",
      code: "INVOICE_SCHEMA_NOT_READY",
      message: "Sheet DATA not found."
    });
  }

  const lastRow = snapshot.lastRow;
  if (lastRow < 2) {
    return jsonOutput({
      status: "success",
      invoices: [],
      hasMore: false,
      nextOffset: 0,
      totalMatches: 0,
      filterOptions: { barbers: [], paymentMethods: [] }
    });
  }
  const search = String(filters.search || data.search || "").trim().toLowerCase();
  const targetDate = String(filters.date || data.date || data.dateKey || "").trim();
  const targetBarber = String(filters.barber || data.barber || "").trim();
  const targetPayment = String(filters.payment || data.payment || data.paymentMethod || "").trim();
  const limit = Math.min(Math.max(Number(data.limit) || 100, 1), 500);
  const offset = Math.max(Number(data.offset) || 0, 0);
  const rows = snapshot.rows;
  const matches = [];
  const barberOptions = {};
  const paymentOptions = {};
  function invoiceResponse(row, rowNumber) {
    return {
      invoiceId: `DATA-${rowNumber}`,
      invoiceRequestId: snapshot.invoiceRequestIdColumn ? String(row[snapshot.invoiceRequestIdColumn - 1] || "").trim() : "",
      rowNumber, date: getDisplayDateTime(row[0]), dateKey: getDateKey(row[0], TIME_ZONE),
      customerName: String(row[1] || "").trim(), customerPhone: String(row[2] || "").trim(),
      services: String(row[3] || "").trim(), pdfUrl: String(row[4] || "").trim(),
      total: parseSheetAmount(row[5]), paidAmount: parseSheetAmount(row[6]), tipAmount: parseSheetAmount(row[7]),
      paymentMethod: String(row[8] || "").trim(), barber: String(row[9] || "").trim(), note: String(row[10] || "").trim(),
      discountPercent: parseSheetAmount(row[11]), discountAmount: parseSheetAmount(row[12])
    };
  }

  for (let index = rows.length - 1; index >= 0; index--) {
    const row = rows[index];
    const rowNumber = index + 2;
    const invoice = {
      invoiceId: `DATA-${rowNumber}`,
      invoiceRequestId: snapshot.invoiceRequestIdColumn ? String(row[snapshot.invoiceRequestIdColumn - 1] || "").trim() : "",
      rowNumber,
      date: String(row[0] || "").trim(),
      dateKey: targetDate || range ? getDateKey(row[0], TIME_ZONE) : "",
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

    const hasData =
      invoice.date ||
      invoice.customerName ||
      invoice.customerPhone ||
      invoice.services ||
      invoice.pdfUrl ||
      invoice.total ||
      invoice.paymentMethod ||
      invoice.barber ||
      invoice.note;

    if (!hasData) continue;
    if (invoice.barber) barberOptions[invoice.barber] = true;
    if (invoice.paymentMethod) paymentOptions[invoice.paymentMethod] = true;
    if (targetDate && invoice.dateKey !== targetDate) continue;
    if (!isDateInOptionalRange(invoice.dateKey, range)) continue;
    if (targetBarber && invoice.barber !== targetBarber) continue;
    if (targetPayment && invoice.paymentMethod !== targetPayment) continue;
    if (search) {
      const searchText = `${invoice.customerName} ${invoice.customerPhone} ${invoice.services} ${invoice.note}`.toLowerCase();
      if (searchText.indexOf(search) === -1) continue;
    }

    matches.push({ row, rowNumber });
  }

  const invoices = matches.slice(offset, offset + limit).map(item => invoiceResponse(item.row, item.rowNumber));
  const nextOffset = offset + invoices.length;

  return jsonOutput({
    status: "success",
    invoices,
    hasMore: nextOffset < matches.length,
    nextOffset,
    totalMatches: matches.length,
    filterOptions: {
      barbers: Object.keys(barberOptions).sort(),
      paymentMethods: Object.keys(paymentOptions).sort()
    }
  });
}

function getDisplayDateTime(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, TIME_ZONE, "yyyy-MM-dd HH:mm:ss");
  }

  return String(value || "").trim();
}
