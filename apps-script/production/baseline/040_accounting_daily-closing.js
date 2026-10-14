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

function buildDailyClosingPreview(dateKey) {
  const paymentTotals = calculateSalesAndPaymentTotals(dateKey);
  const expensesTotal = calculateExpensesTotal(dateKey);
  const withdrawalsTotal = calculateWithdrawalsTotal(dateKey);
  const netTotal = paymentTotals.salesTotal + paymentTotals.tipTotal - expensesTotal - withdrawalsTotal;
  const existingClosing = findDailyClosingByDate(dateKey);

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
function getDailyClosingPreview(data) {
  try {
    const dateKey = getRequestedDateKey(data, TIME_ZONE);
    const preview = buildDailyClosingPreview(dateKey);

    return jsonOutput({
      status: "success",
      preview
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

