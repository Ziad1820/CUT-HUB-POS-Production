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

function getInvoices(data) {
  const filters = data.filters || {};
  let range;
  try {
    range = getOptionalDateRange(data, filters);
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
  const sheet = SpreadsheetApp.getActive().getSheetByName("DATA");
  if (!sheet) {
    return jsonOutput({
      status: "error",
      code: "INVOICE_SCHEMA_NOT_READY",
      message: "Sheet DATA not found."
    });
  }

  try {
    inspectDataInvoiceSchemaReadOnly(sheet);
  } catch (error) {
    return jsonOutput({
      status: "error",
      code: error.code || "INVOICE_SCHEMA_INCOMPATIBLE",
      message: error.message || "Invoice DATA schema is incompatible."
    });
  }

  const lastRow = sheet.getLastRow();
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
  const barberIdColumn = findSheetHeaderColumn(
  sheet,
  BARBER_ID_HEADER_ALIASES,
  15
);

const barberCodeColumn = findSheetHeaderColumn(
  sheet,
  BARBER_CODE_HEADER_ALIASES,
  16
);

const barberNameColumn = findSheetHeaderColumn(
  sheet,
  BARBER_NAME_HEADER_ALIASES,
  17
);

const invoiceReadWidth = Math.max(
  13,
  barberIdColumn || 0,
  barberCodeColumn || 0,
  barberNameColumn || 0
);

const rows = sheet.getRange(
  2,
  1,
  lastRow - 1,
  invoiceReadWidth
).getValues();
  const matches = [];
  const barberOptions = {};
  const paymentOptions = {};

  for (let index = rows.length - 1; index >= 0; index--) {
    const row = rows[index];
    const rowNumber = index + 2;
    const invoice = {
      invoiceId: `DATA-${rowNumber}`,
      rowNumber,
      date: getDisplayDateTime(row[0]),
      dateKey: getDateKey(row[0], TIME_ZONE),
      customerName: String(row[1] || "").trim(),
      customerPhone: String(row[2] || "").trim(),
      services: String(row[3] || "").trim(),
      pdfUrl: String(row[4] || "").trim(),
      total: parseSheetAmount(row[5]),
      paidAmount: parseSheetAmount(row[6]),
      tipAmount: parseSheetAmount(row[7]),
      paymentMethod: String(row[8] || "").trim(),
      barber: String(row[9] || "").trim(),
      barberId: barberIdColumn
        ? String(row[barberIdColumn - 1] || "").trim()
        : "",

      barberCode: barberCodeColumn
        ? String(row[barberCodeColumn - 1] || "").trim().toUpperCase()
        : "",

      barberName: barberNameColumn
        ? String(row[barberNameColumn - 1] || "").trim()
        : String(row[9] || "").trim(),
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

    matches.push(invoice);
  }

  const invoices = matches.slice(offset, offset + limit);
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

