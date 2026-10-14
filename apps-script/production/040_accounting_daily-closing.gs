function getDailyClosingSheet() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("DAILY_CLOSINGS");
  if (!sheet) {
    throw new Error("Sheet DAILY_CLOSINGS not found");
  }
  return sheet;
}

function readDailyClosings() {
  const sheet = getDailyClosingSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) return [];

  const rows = sheet.getRange(2, 1, lastRow - 1, 13).getValues();

  return rows
    .map((row, index) => ({
      rowNumber: index + 2,
      closingId: String(row[0] || "").trim(),
      date: getDateKey(row[1], TIME_ZONE) || String(row[1] || "").trim(),
      salesTotal: parseSheetAmount(row[2]),
      cashTotal: parseSheetAmount(row[3]),
      visaTotal: parseSheetAmount(row[4]),
      instapayTotal: parseSheetAmount(row[5]),
      vodafoneCashTotal: parseSheetAmount(row[6]),
      expensesTotal: parseSheetAmount(row[7]),
      withdrawalsTotal: parseSheetAmount(row[8]),
      netTotal: parseSheetAmount(row[9]),
      closedByUserName: String(row[10] || "").trim(),
      closedByDisplayName: String(row[11] || "").trim(),
      closedAt: getDisplayDateTime(row[12])
    }))
    .filter(item => item.closingId || item.date);
}

function findDailyClosingByDate(dateKey) {
  return readDailyClosings().find(item => item.date === dateKey) || null;
}

function normalizePaymentMethod(value) {
  let text = normalizeDigits(String(value || ""))
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/[\u0623\u0625\u0622]/g, "\u0627")
    .replace(/\u0649/g, "\u064A")
    .replace(/\u0629/g, "\u0647");

  if (text.includes("cash") || text.includes("\u0646\u0642\u062F")) return "cash";
  if (text.includes("visa") || text.includes("\u0641\u064A\u0632\u0627")) return "visa";
  if (text.includes("insta") || text.includes("\u0627\u0646\u0633\u062A\u0627")) return "instapay";
  if (text.includes("vodafone") || text.includes("\u0641\u0648\u062F\u0627\u0641\u0648\u0646")) return "vodafone_cash";

  return text;
}
function calculateSalesAndPaymentTotals(dateKey) {
  const sheet = SpreadsheetApp.getActive().getSheetByName("DATA");
  const totals = {
    salesTotal: 0,
    tipTotal: 0,
    cashTotal: 0,
    visaTotal: 0,
    instapayTotal: 0,
    vodafoneCashTotal: 0
  };

  if (!sheet) return totals;

  const rows = getSheetRangeFromRow2(sheet, 1, 11);

  rows.forEach(row => {
    const rowDateKey = getDateKey(row[0], TIME_ZONE);
    if (rowDateKey !== dateKey) return;

    const amount = parseSheetAmount(row[5]);
    const tipAmount = parseSheetAmount(row[7]);
    const payment = normalizePaymentMethod(row[8]);

    totals.salesTotal += amount;
    totals.tipTotal += tipAmount;

    const paymentAmount = amount + tipAmount;

    if (payment === "cash") totals.cashTotal += paymentAmount;
    if (payment === "visa") totals.visaTotal += paymentAmount;
    if (payment === "instapay") totals.instapayTotal += paymentAmount;
    if (payment === "vodafone_cash") totals.vodafoneCashTotal += paymentAmount;
  });

  return totals;
}
function calculateExpensesTotal(dateKey) {
  const sheet = SpreadsheetApp.getActive().getSheetByName("EXPENSES");
  if (!sheet) return 0;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const rows = sheet.getRange(2, 1, lastRow - 1, 5).getValues();

  return rows.reduce((sum, row) => {
    const rowDateKey = getDateKey(row[4], TIME_ZONE);
    if (rowDateKey !== dateKey) return sum;
    return sum + parseSheetAmount(row[1]);
  }, 0);
}

function calculateWithdrawalsTotal(dateKey) {
  const sheet = SpreadsheetApp.getActive().getSheetByName("WITHDRAWLS");
  if (!sheet) return 0;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const rows = sheet.getRange(2, 1, lastRow - 1, 4).getValues();

  return rows.reduce((sum, row) => {
    const rowDateKey = getDateKey(row[3], TIME_ZONE);
    if (rowDateKey !== dateKey) return sum;
    return sum + parseSheetAmount(row[1]);
  }, 0);
}

function buildDailyClosingPreview(dateKey, summaryOnly) {
  if (summaryOnly) {
    const fastSummary = buildCashierSummaryFromSheets(dateKey);
    if (fastSummary) return fastSummary;
  }
  const paymentTotals = calculateSalesAndPaymentTotals(dateKey);
  const expensesTotal = calculateExpensesTotal(dateKey);
  const withdrawalsTotal = calculateWithdrawalsTotal(dateKey);
  const netTotal = paymentTotals.salesTotal + paymentTotals.tipTotal - expensesTotal - withdrawalsTotal;
  const existingClosing = summaryOnly ? null : findDailyClosingByDate(dateKey);

  return {
    date: dateKey,
    salesTotal: paymentTotals.salesTotal,
    tipTotal: paymentTotals.tipTotal,
    salesIncludesTips: false,
    cashTotal: paymentTotals.cashTotal,
    visaTotal: paymentTotals.visaTotal,
    instapayTotal: paymentTotals.instapayTotal,
    vodafoneCashTotal: paymentTotals.vodafoneCashTotal,
    expensesTotal,
    withdrawalsTotal,
    netTotal,
    alreadyClosed: Boolean(existingClosing),
    closingId: existingClosing ? existingClosing.closingId : "",
    closedBy: existingClosing ? (existingClosing.closedByDisplayName || existingClosing.closedByUserName) : "",
    closedAt: existingClosing ? existingClosing.closedAt : ""
  };
}

function buildCashierSummaryFromSheets(dateKey) {
  buildCashierSummaryFromSheets.diagnostics = { mode: "UNAVAILABLE", readMs: 0 };
  if (typeof SpreadsheetApp === "undefined" || typeof Utilities === "undefined" || !Utilities.parseDate) return null;
  const started = Date.now();
  try {
    const midnight = Utilities.parseDate(dateKey, TIME_ZONE, "yyyy-MM-dd").getTime();
    const parts = dateKey.split("-").map(Number);
    const nextDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + 1)).toISOString().slice(0, 10);
    const nextMidnight = Utilities.parseDate(nextDate, TIME_ZONE, "yyyy-MM-dd").getTime();
    const spreadsheet = SpreadsheetApp.getActive();
    const totals = { date: dateKey, salesTotal: 0, tipTotal: 0, salesIncludesTips: false,
      cashTotal: 0, visaTotal: 0, instapayTotal: 0, vodafoneCashTotal: 0, expensesTotal: 0, withdrawalsTotal: 0 };
    const fields = { cash: "cashTotal", visa: "visaTotal", instapay: "instapayTotal", vodafone_cash: "vodafoneCashTotal" };
    const specs = [{ name: "DATA", dateColumn: 0, width: 9 },
      { name: "EXPENSES", dateColumn: 4, width: 5 }, { name: "WITHDRAWLS", dateColumn: 3, width: 4 }];
    specs.forEach(spec => {
      const sheet = spreadsheet.getSheetByName(spec.name);
      if (!sheet) return;
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) return;
      const rows = sheet.getRange(2, 1, lastRow - 1, spec.width).getValues();
      rows.forEach(row => {
        const rawDate = row[spec.dateColumn];
        // Compare timestamps with two Cairo midnights, including 23/25-hour DST days.
        // String cells retain the legacy parser and its calendar-date semantics.
        const matches = rawDate instanceof Date && !isNaN(rawDate.getTime())
          ? rawDate.getTime() >= midnight && rawDate.getTime() < nextMidnight
          : getDateKey(rawDate, TIME_ZONE) === dateKey;
        if (!matches) return;
        if (spec.name === "DATA") {
          const amount = parseSheetAmount(row[5]), tip = parseSheetAmount(row[7]);
          totals.salesTotal += amount; totals.tipTotal += tip;
          const payment = normalizePaymentMethod(row[8]);
          if (fields[payment]) totals[fields[payment]] += amount + tip;
        } else totals[spec.name === "EXPENSES" ? "expensesTotal" : "withdrawalsTotal"] += parseSheetAmount(row[1]);
      });
    });
    totals.netTotal = totals.salesTotal + totals.tipTotal - totals.expensesTotal - totals.withdrawalsTotal;
    buildCashierSummaryFromSheets.diagnostics = { mode: "ROWS", readMs: Date.now() - started };
    return totals;
  } catch (_) {
    buildCashierSummaryFromSheets.diagnostics = { mode: "ROWS_FALLBACK", readMs: Date.now() - started };
    return null;
  }
}

function dashboardTodayStats(data) {
  try {
    const sheet = SpreadsheetApp.getActive().getSheetByName("DATA");
    if (!sheet) {
      return jsonOutput({ status: "error", message: "Sheet DATA not found" });
    }

    const targetDateKey = getRequestedDateKey(data || {}, TIME_ZONE);
    const rows = getSheetRangeFromRow2(sheet, 1, 9);
    const customers = {};
    let todayInvoices = 0;
    let todaySales = 0;
    let todayTips = 0;

    rows.forEach(row => {
      const dateKey = getDateKey(row[0], TIME_ZONE);
      if (dateKey !== targetDateKey) return;

      todayInvoices += 1;
      todaySales += parseSheetAmount(row[5]);
      todayTips += parseSheetAmount(row[7]);

      const customerName = String(row[1] || "").trim().toLowerCase();
      const customerPhone = String(row[2] || "").replace(/\D/g, "");
      const customerKey = customerPhone || customerName || `invoice-${todayInvoices}`;
      customers[customerKey] = true;
    });

    return jsonOutput({
      status: "success",
      dateKey: targetDateKey,
      todayInvoices,
      todayCustomers: Object.keys(customers).length,
      todaySales,
      todayTips,
      averageInvoice: todayInvoices ? todaySales / todayInvoices : 0
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}
function getDailyClosingPreview(data, authenticatedContext) {
  try {
    const started = Date.now();
    if (data.cashierSummary === true) {
      if (!cashierContextAllows(authenticatedContext)) return jsonOutput({ status: "error", code: "PERMISSION_DENIED", message: "Cashier permission is required." });
    }
    const dateKey = getRequestedDateKey(data, TIME_ZONE);
    const preview = buildDailyClosingPreview(dateKey, data.cashierSummary === true);
    if (data.cashierSummary === true) {
      ["alreadyClosed", "closingId", "closedBy", "closedAt"].forEach(key => { delete preview[key]; });
    }

    return jsonOutput({
      status: "success",
      preview,
      performanceDiagnostics: data.cashierSummary === true && data.performanceProbe === true
        ? Object.assign({}, buildCashierSummaryFromSheets.diagnostics, { calculationMs: Date.now() - started }) : undefined
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function getDailyClosings(data) {
  try {
    const closings = readDailyClosings()
      .map(item => ({
        closingId: item.closingId,
        date: item.date,
        salesTotal: item.salesTotal,
        cashTotal: item.cashTotal,
        visaTotal: item.visaTotal,
        instapayTotal: item.instapayTotal,
        vodafoneCashTotal: item.vodafoneCashTotal,
        expensesTotal: item.expensesTotal,
        withdrawalsTotal: item.withdrawalsTotal,
        netTotal: item.netTotal,
        closedByUserName: item.closedByUserName,
        closedByDisplayName: item.closedByDisplayName,
        closedBy: item.closedByDisplayName || item.closedByUserName,
        closedAt: item.closedAt
      }))
      .reverse();

    return jsonOutput({
      status: "success",
      closings
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function closeDay(data) {
  try {
    const permissionError = requirePermission(data, "view_daily_closing", "You do not have permission to close the day.");
    if (permissionError) return permissionError;

    const sheet = getDailyClosingSheet();
    const actor = getActor(data || {});
    const dateKey = getRequestedDateKey(data, TIME_ZONE);
    const preview = buildDailyClosingPreview(dateKey);
    const existingClosing = findDailyClosingByDate(dateKey);
    const isManager = actorCanManageUsers(data || {});

    if (existingClosing && !isManager) {
      return jsonOutput({
        status: "error",
        message: "This day is already closed. Only a manager can close it again.",
        alreadyClosed: true
      });
    }

    const closingId = existingClosing ? existingClosing.closingId : Utilities.getUuid();
    const closedAt = getCairoDateTime();

    const rowValues = [
      closingId,
      dateKey,
      preview.salesTotal,
      preview.cashTotal,
      preview.visaTotal,
      preview.instapayTotal,
      preview.vodafoneCashTotal,
      preview.expensesTotal,
      preview.withdrawalsTotal,
      preview.netTotal,
      actor.userName,
      actor.displayName,
      closedAt
    ];

    if (existingClosing && isManager) {
      sheet.getRange(existingClosing.rowNumber, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }

    logActivity(
      data,
      "close_day",
      "daily_closing",
      closingId,
      `${existingClosing ? "Re-closed" : "Closed"} day ${dateKey} | Sales: ${preview.salesTotal} | Tips: ${preview.tipTotal} | Expenses: ${preview.expensesTotal} | Withdrawals: ${preview.withdrawalsTotal} | Net: ${preview.netTotal}`
    );

    return jsonOutput({
      status: "success",
      closing: {
        closingId,
        date: dateKey,
        salesTotal: preview.salesTotal,
        tipTotal: preview.tipTotal,
        cashTotal: preview.cashTotal,
        visaTotal: preview.visaTotal,
        instapayTotal: preview.instapayTotal,
        vodafoneCashTotal: preview.vodafoneCashTotal,
        expensesTotal: preview.expensesTotal,
        withdrawalsTotal: preview.withdrawalsTotal,
        netTotal: preview.netTotal,
        closedByUserName: actor.userName,
        closedByDisplayName: actor.displayName,
        closedBy: actor.displayName || actor.userName,
        closedAt
      }
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function deleteDailyClosing(data) {
  try {
    if (!actorCanManageUsers(data || {})) {
      return jsonOutput({
        status: "error",
        message: "Only the system owner can delete a daily closing."
      });
    }

    const sheet = getDailyClosingSheet();
    const closings = readDailyClosings();
    const targetClosingId = String(data.closingId || "").trim();
    const targetDateKey = getRequestedDateKey(data, TIME_ZONE);

    const closing = closings.find(item => {
      const idMatches = targetClosingId && item.closingId === targetClosingId;
      const dateMatches = !targetClosingId && item.date === targetDateKey;
      return idMatches || dateMatches;
    });

    if (!closing) {
      return jsonOutput({
        status: "error",
        message: "Daily closing not found."
      });
    }

    sheet.deleteRow(closing.rowNumber);

    logActivity(
      data,
      "delete_daily_closing",
      "daily_closing",
      closing.closingId || closing.date,
      `Deleted daily closing ${closing.date} | Sales: ${closing.salesTotal} | Expenses: ${closing.expensesTotal} | Withdrawals: ${closing.withdrawalsTotal} | Net: ${closing.netTotal}`
    );

    return jsonOutput({
      status: "success",
      deletedClosing: {
        closingId: closing.closingId,
        date: closing.date
      }
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

