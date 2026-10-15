function getTotalIncome() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("DATA");
  const values = getSheetColumnValuesFromRow2(sheet, 6);
  return jsonOutput({ status: "success", totalIncome: sumValues(values) });
}

function getTotalStaffSales() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("DATA");
  const values = getSheetColumnValuesFromRow2(sheet, 6);
  return jsonOutput({ status: "success", totalStaffSales: sumValues(values) });
}

function getTotalClients() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("DATA");
  const rows = getSheetRangeFromRow2(sheet, 1, 8);

  const count = rows.filter(row =>
    row.some(cell => cell !== "" && cell !== null)
  ).length;

  return jsonOutput({ status: "success", totalClients: count });
}

function sumValues(values) {
  return values.reduce((total, cell) => total + parseSheetAmount(cell), 0);
}

function getSheetRangeFromRow2(sheet, startColumn, columnsCount, displayValues) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const range = sheet.getRange(2, startColumn, lastRow - 1, columnsCount);
  return displayValues ? range.getDisplayValues() : range.getValues();
}

function getSheetColumnValuesFromRow2(sheet, columnNumber) {
  return getSheetRangeFromRow2(sheet, columnNumber, 1).flat();
}

function testDriveAccess() {
  const file = DriveApp.createFile("test.txt", "hello");
  Logger.log(file.getUrl());
}

function getCustomerLookup() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("DATA");
  const rows = getSheetRangeFromRow2(sheet, 2, 2, true);

  const seenPhones = {};
  const customers = rows
    .map(row => ({
      name: String(row[0] || "").trim(),
      phone: String(row[1] || "").replace(/\D/g, "")
    }))
    .filter(customer => customer.name && customer.phone)
    .filter(customer => {
      if (seenPhones[customer.phone]) return false;
      seenPhones[customer.phone] = true;
      return true;
    });

  return jsonOutput({ status: "success", customers });
}

function getStaffClientCount(data) {
  const sheet = SpreadsheetApp.getActive().getSheetByName("DATA");

  let range;
  try {
    range = getOptionalDateRange(data, null, true);
  } catch (error) {
    return jsonOutput({
      status: "error",
      message: error.message
    });
  }

  if (!sheet) {
    return jsonOutput({
      status: "success",
      totalClients: 0
    });
  }

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

  const readWidth = Math.max(
    10,
    barberIdColumn || 0,
    barberCodeColumn || 0,
    barberNameColumn || 0
  );

  const rows = getSheetRangeFromRow2(
    sheet,
    1,
    readWidth,
    true
  );

  const columns = {
    barberIdColumn,
    barberCodeColumn,
    barberNameColumn
  };

  const count = rows.filter(row => {
    const hasData = row.some(
      cell => String(cell || "").trim() !== ""
    );

    return (
      hasData &&
      invoiceRowMatchesStaff(row, columns, data) &&
      isDateInOptionalRange(row[0], range)
    );
  }).length;

  return jsonOutput({
    status: "success",
    totalClients: count
  });
}

function normalizeBarberName(value) {
  const name = String(value || "").trim().toUpperCase().replace(/\s+/g, " ");
  const aliases = {
    KAREM: "KAREEM",
    "8ATYH": "8AYTH"
  };

  return aliases[name] || name;
}

function invoiceRowMatchesStaff(row, columns, data) {
  const targetId = String(data.barberId || "").trim();
  const targetCode = String(data.barberCode || "").trim().toUpperCase();
  const targetName = normalizeBarberName(data.barber || data.barberName || "");

  const rowId = columns.barberIdColumn
    ? String(row[columns.barberIdColumn - 1] || "").trim()
    : "";

  const rowCode = columns.barberCodeColumn
    ? String(row[columns.barberCodeColumn - 1] || "").trim().toUpperCase()
    : "";

  const storedBarberName = columns.barberNameColumn
  ? String(row[columns.barberNameColumn - 1] || "").trim()
  : "";

const rowName = normalizeBarberName(
  storedBarberName || row[9]
);

  if (rowId) {
    return !!targetId && rowId === targetId;
  }

  if (rowCode) {
    return !!targetCode && rowCode === targetCode;
  }

  return !!targetName && rowName === targetName;
}

function getStaffTotalSales(data) {
  let range;

  try {
    range = getOptionalDateRange(data, null, true);
  } catch (error) {
    return jsonOutput({
      status: "error",
      message: error.message
    });
  }

  const sheet = SpreadsheetApp.getActive().getSheetByName("DATA");

  if (!sheet) {
    return jsonOutput({
      status: "success",
      totalSales: 0
    });
  }

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

  const readWidth = Math.max(
    10,
    barberIdColumn || 0,
    barberCodeColumn || 0,
    barberNameColumn || 0
  );

  const rows = getSheetRangeFromRow2(
    sheet,
    1,
    readWidth
  );

  const columns = {
    barberIdColumn,
    barberCodeColumn,
    barberNameColumn
  };

  const totalSales = rows.reduce((sum, row) => {
    const hasData = row.some(
      cell => cell !== "" && cell !== null
    );

    if (
      !hasData ||
      !invoiceRowMatchesStaff(row, columns, data) ||
      !isDateInOptionalRange(row[0], range)
    ) {
      return sum;
    }

    return sum + parseSheetAmount(row[5]);
  }, 0);

  return jsonOutput({
    status: "success",
    totalSales
  });
}

function buildStaffAccountingActivity(data, staff, timing) {
  const startedAt = Date.now();
  const range = getOptionalDateRange(data, null, true);
  const totals = staff.map(() => ({ customers: 0, totalSales: 0 }));
  if (!staff.length) return totals;
  const sheet = SpreadsheetApp.getActive().getSheetByName("DATA");
  if (!sheet) return totals;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return totals;
  const lastColumn = sheet.getLastColumn(), maxColumns = sheet.getMaxColumns();
  const physicalWidth = maxColumns || lastColumn;
  const headerWidth = minimum => physicalWidth ? Math.min(physicalWidth, Math.max(minimum, lastColumn)) : Math.max(minimum, lastColumn);
  const headers = sheet.getRange(1, 1, 1, headerWidth(17)).getValues()[0];
  const columns = {
    barberIdColumn: findEquivalentHeaderColumn(headers.slice(0, headerWidth(15)), BARBER_ID_HEADER_ALIASES),
    barberCodeColumn: findEquivalentHeaderColumn(headers.slice(0, headerWidth(16)), BARBER_CODE_HEADER_ALIASES),
    barberNameColumn: findEquivalentHeaderColumn(headers, BARBER_NAME_HEADER_ALIASES)
  };
  const width = Math.max(10, columns.barberIdColumn || 0, columns.barberCodeColumn || 0, columns.barberNameColumn || 0);
  const source = sheet.getRange(2, 1, lastRow - 1, width);
  // Preserve the legacy count's displayed identity/date values and sales' raw amounts.
  const raw = source.getValues(), displayed = source.getDisplayValues();
  if (timing) timing.dataReadMs = Date.now() - startedAt;
  let start = null, end = null;
  if (Number(range.fromDate.slice(0, 4)) >= 100 && Number(range.toDate.slice(0, 4)) >= 100) {
    const next = new Date(range.toDate + "T12:00:00Z");
    next.setUTCDate(next.getUTCDate() + 1);
    const endKey = next.toISOString().slice(0, 10);
    try {
      const first = Utilities.parseDate(range.fromDate, TIME_ZONE, "yyyy-MM-dd");
      const last = Utilities.parseDate(endKey, TIME_ZONE, "yyyy-MM-dd");
      if (getDateKey(first, TIME_ZONE) === range.fromDate && getDateKey(last, TIME_ZONE) === endKey) {
        start = first.getTime(); end = last.getTime();
      }
    } catch (_) { /* Use the existing parser for unusual date boundaries. */ }
  }
  const matchesRawDate = value => value instanceof Date && start !== null
    ? value.getTime() >= start && value.getTime() < end : isDateInOptionalRange(value, range);
  const queries = staff.map(item => ({ barberId: item.staffId || "", barberCode: item.code || "", barber: item.name || "" }));
  raw.forEach((row, rowIndex) => {
    const display = displayed[rowIndex];
    const countable = display.some(cell => String(cell || "").trim() !== "") && isDateInOptionalRange(display[0], range);
    const saleable = row.some(cell => cell !== "" && cell !== null) && matchesRawDate(row[0]);
    if (!countable && !saleable) return;
    queries.forEach((query, index) => {
      if (countable && invoiceRowMatchesStaff(display, columns, query)) totals[index].customers++;
      if (saleable && invoiceRowMatchesStaff(row, columns, query)) totals[index].totalSales += parseSheetAmount(row[5]);
    });
  });
  return totals;
}

function getTodaySales(data) {
  const sheet = SpreadsheetApp.getActive().getSheetByName("DATA");
  if (!sheet) {
    return jsonOutput({ status: "error", message: "Sheet DATA not found" });
  }

  const targetDateKey = getRequestedDateKey(data, TIME_ZONE);
  const rows = getSheetRangeFromRow2(sheet, 1, 8);

  const totals = rows.reduce((summary, row) => {
    const dateKey = getDateKey(row[0], TIME_ZONE);
    if (dateKey !== targetDateKey) return summary;
    summary.todaySales += parseSheetAmount(row[5]);
    summary.todayTips += parseSheetAmount(row[7]);
    return summary;
  }, { todaySales: 0, todayTips: 0 });

  return jsonOutput({ status: "success", todaySales: totals.todaySales, todayTips: totals.todayTips });
}

function getTodayPaymentTotals(data) {
  const sheet = SpreadsheetApp.getActive().getSheetByName("DATA");
  if (!sheet) {
    return { status: "error", message: "Sheet DATA not found" };
  }

  const targetDateKey = getRequestedDateKey(data, TIME_ZONE);
  const totals = calculateSalesAndPaymentTotals(targetDateKey);

  return {
    status: "success",
    cashTotal: totals.cashTotal,
    instapayTotal: totals.instapayTotal,
    vodafoneCashTotal: totals.vodafoneCashTotal,
    visaTotal: totals.visaTotal
  };
}

