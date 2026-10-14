function getMonthlyClosingSheet() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("MONTHLY_CLOSINGS");
  if (!sheet) {
    throw new Error("Sheet MONTHLY_CLOSINGS not found");
  }
  return sheet;
}

function isDateKeyBetween(dateKey, fromDate, toDate) {
  return Boolean(dateKey && fromDate && toDate && dateKey >= fromDate && dateKey <= toDate);
}

function readMonthlyClosings() {
  const sheet = getMonthlyClosingSheet();
  const rows = getSheetRangeFromRow2(sheet, 1, 9);

  return rows
    .map((row, index) => ({
      rowNumber: index + 2,
      month: String(row[0] || "").trim(),
      monthKey: String(row[0] || "").trim(),
      fromDate: getDateKey(row[1], TIME_ZONE) || String(row[1] || "").trim(),
      toDate: getDateKey(row[2], TIME_ZONE) || String(row[2] || "").trim(),
      totalIncome: parseSheetAmount(row[3]),
      totalExpenses: parseSheetAmount(row[4]),
      totalWithdrawals: parseSheetAmount(row[5]),
      netProfit: parseSheetAmount(row[6]),
      closedBy: String(row[7] || "").trim(),
      closedAt: getDisplayDateTime(row[8])
    }))
    .filter(closing => closing.month || closing.fromDate || closing.toDate);
}

function calculateIncomeStatementRange(fromDateValue, toDateValue) {
  const fromDate = getDateKey(fromDateValue, TIME_ZONE);
  const toDate = getDateKey(toDateValue, TIME_ZONE);

  if (!fromDate || !toDate) {
    throw new Error("Choose from date and to date.");
  }

  if (fromDate > toDate) {
    throw new Error("From date must be before to date.");
  }

  const spreadsheet = SpreadsheetApp.getActive();
  const dataSheet = spreadsheet.getSheetByName("DATA");
  if (!dataSheet) {
    throw new Error("Sheet DATA not found");
  }

  const expensesSheet = spreadsheet.getSheetByName("EXPENSES");
  const withdrawalsSheet = spreadsheet.getSheetByName("WITHDRAWLS");

  const invoiceRows = getSheetRangeFromRow2(dataSheet, 1, 12);
  const expenseRows = expensesSheet ? getSheetRangeFromRow2(expensesSheet, 1, 6) : [];
  const withdrawalRows = withdrawalsSheet ? getSheetRangeFromRow2(withdrawalsSheet, 1, 5) : [];

  let totalSales = 0;
  let totalTips = 0;
  let cashTotal = 0;
  let instapayTotal = 0;
  let vodafoneCashTotal = 0;
  let visaTotal = 0;
  let invoiceCount = 0;
  const customers = {};

  invoiceRows.forEach(row => {
    const dateKey = getDateKey(row[0], TIME_ZONE);
    if (!isDateKeyBetween(dateKey, fromDate, toDate)) return;

    const hasData = row.some(cell => cell !== "" && cell !== null);
    if (!hasData) return;

    invoiceCount += 1;
    const invoiceTotal = parseSheetAmount(row[5]);
    const tipAmount = parseSheetAmount(row[7]);
    const payment = normalizePaymentMethod(row[8]);

    totalSales += invoiceTotal;
    totalTips += tipAmount;

    const paymentAmount = invoiceTotal + tipAmount;

    if (payment === "cash") cashTotal += paymentAmount;
    if (payment === "visa") visaTotal += paymentAmount;
    if (payment === "instapay") instapayTotal += paymentAmount;
    if (payment === "vodafone_cash") vodafoneCashTotal += paymentAmount;

    const customerKey = String(row[2] || row[1] || "").trim();
    if (customerKey) customers[customerKey] = true;
  });

  const totalExpenses = expenseRows.reduce((sum, row) => {
    const dateKey = getDateKey(row[4], TIME_ZONE);
    return isDateKeyBetween(dateKey, fromDate, toDate)
      ? sum + parseSheetAmount(row[1])
      : sum;
  }, 0);

  const totalWithdrawals = withdrawalRows.reduce((sum, row) => {
    const dateKey = getDateKey(row[3], TIME_ZONE);
    return isDateKeyBetween(dateKey, fromDate, toDate)
      ? sum + parseSheetAmount(row[1])
      : sum;
  }, 0);

  const totalIncome = totalSales + totalTips;
  const netProfit = totalIncome - totalExpenses - totalWithdrawals;

  return {
    fromDate,
    toDate,
    totalSales,
    totalIncome,
    totalTips,
    cashTotal,
    instapayTotal,
    vodafoneCashTotal,
    visaTotal,
    totalExpenses,
    totalWithdrawals,
    netProfit,
    totalClients: Object.keys(customers).length,
    invoiceCount,
    totalStaffSales: totalSales,
    averageInvoice: invoiceCount ? totalSales / invoiceCount : 0
  };
}

function getIncomeStatementRange(data) {
  try {
    const statement = calculateIncomeStatementRange(
      data.fromDate || data.startDate || data.date,
      data.toDate || data.endDate || data.date
    );

    return jsonOutput({
      status: "success",
      ...statement,
      statement
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function getMonthlyClosings(data) {
  try {
    return jsonOutput({
      status: "success",
      closings: readMonthlyClosings().reverse()
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}


function deleteMonthlyClosing(data) {
  try {
    if (!actorCanManageUsers(data || {})) {
      return jsonOutput({
        status: "error",
        message: "Only the system owner can delete a monthly closing."
      });
    }

    const sheet = getMonthlyClosingSheet();
    const rowNumber = Number(data.rowNumber || 0);
    const monthKey = String(data.month || data.monthKey || "").trim();
    const fromDate = getDateKey(data.fromDate || "", TIME_ZONE) || String(data.fromDate || "").trim();
    const toDate = getDateKey(data.toDate || "", TIME_ZONE) || String(data.toDate || "").trim();

    const closings = readMonthlyClosings();
    const closing = closings.find(item =>
      (rowNumber && item.rowNumber === rowNumber) ||
      (monthKey && (item.monthKey === monthKey || item.month === monthKey)) ||
      (fromDate && toDate && item.fromDate === fromDate && item.toDate === toDate)
    );

    if (!closing) {
      return jsonOutput({
        status: "error",
        message: "Monthly closing not found."
      });
    }

    sheet.deleteRow(closing.rowNumber);

    logActivity(
      data,
      "delete_month_lock",
      "monthly_closing",
      closing.monthKey || closing.month || "",
      `Deleted monthly closing ${closing.monthKey || closing.month || ""} | From: ${closing.fromDate} | To: ${closing.toDate}`
    );

    return jsonOutput({
      status: "success",
      deleted: closing
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function monthLock(data) {
  try {
    if (!actorCanManageUsers(data || {})) {
      return jsonOutput({
        status: "error",
        message: "Only the system owner can lock a month."
      });
    }

    const fromDate = getDateKey(data.fromDate || data.startDate, TIME_ZONE);
    const toDate = getDateKey(data.toDate || data.endDate, TIME_ZONE);

    if (!fromDate || !toDate) {
      throw new Error("Choose from date and to date.");
    }

    if (fromDate > toDate) {
      throw new Error("From date must be before to date.");
    }

    const monthKey = String(data.month || data.monthKey || fromDate.slice(0, 7)).trim();
    const existing = readMonthlyClosings().find(closing =>
      closing.monthKey === monthKey ||
      closing.month === monthKey ||
      (closing.fromDate === fromDate && closing.toDate === toDate)
    );

    if (existing) {
      return jsonOutput({
        status: "error",
        message: "This month is already locked."
      });
    }

    const sheet = getMonthlyClosingSheet();
    const actor = getActor(data || {});
    const statement = calculateIncomeStatementRange(fromDate, toDate);
    const closedAt = getCairoDateTime();

    sheet.appendRow([
      monthKey,
      fromDate,
      toDate,
      statement.totalIncome,
      statement.totalExpenses,
      statement.totalWithdrawals,
      statement.netProfit,
      actor.displayName || actor.userName,
      closedAt
    ]);

    logActivity(
      data,
      "month_lock",
      "monthly_closing",
      monthKey,
      `Locked month ${monthKey} | Income: ${statement.totalIncome} | Expenses: ${statement.totalExpenses} | Withdrawals: ${statement.totalWithdrawals} | Net: ${statement.netProfit}`
    );

    return jsonOutput({
      status: "success",
      closing: {
        month: monthKey,
        monthKey,
        closedBy: actor.displayName || actor.userName,
        closedAt,
        ...statement
      }
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function getLockedMonthForDate(value) {
  const dateKey = getDateKey(value, TIME_ZONE);
  if (!dateKey) return null;

  try {
    return readMonthlyClosings().find(closing =>
      isDateKeyBetween(dateKey, closing.fromDate, closing.toDate)
    ) || null;
  } catch (error) {
    return null;
  }
}

function getLockedDateError(value, entityLabel) {
  const locked = getLockedMonthForDate(value);
  if (!locked) return "";

  const monthLabel = locked.month || locked.monthKey || `${locked.fromDate} / ${locked.toDate}`;
  return `${entityLabel} is inside locked month ${monthLabel}. Delete the monthly closing first.`;
}

