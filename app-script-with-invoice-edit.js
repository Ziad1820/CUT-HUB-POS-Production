function doPost(e) {
  const data = JSON.parse(e.postData.contents || "{}");

  if (data.action === "invoice") return createInvoice(data);
  if (data.action === "getInvoices") return getInvoices(data);
  if (data.action === "deleteInvoice") return deleteInvoice(data);
  if (data.action === "updateInvoice") return updateInvoice(data);

  if (data.action === "withdrawal") return createWithdrawal(data);
  if (data.action === "deleteWithdrawal") return deleteWithdrawal(data);
  if (data.action === "expense") return createExpense(data);
  if (data.action === "deleteExpense") return deleteExpense(data);

  if (data.action === "loginUser") return loginUser(data);
  if (data.action === "logoutUser" || data.action === "logout") return logoutUser(data);
  if (data.action === "getUsers") return getUsersFromSheet();
  if (data.action === "createUser") return createUserInSheet(data);
  if (data.action === "updateUser") return updateUserInSheet(data);
  if (data.action === "deleteUser") return deleteUserFromSheet(data);

  if (data.action === "getServices") return getServices();
  if (data.action === "saveServices") return saveServices(data);

  if (data.action === "getStaff") return getStaff();
  if (data.action === "saveStaff") return saveStaff(data);

  if (data.action === "getActivityLogs") return getActivityLogs(data);

  if (data.action === "getDailyClosingPreview") return getDailyClosingPreview(data);
  if (data.action === "dashboardTodayStats") return dashboardTodayStats(data);
  if (data.action === "getDailyClosings") return getDailyClosings(data);
  if (data.action === "closeDay") return closeDay(data);
  if (data.action === "deleteDailyClosing") return deleteDailyClosing(data);
  if (data.action === "getIncomeStatementRange") return getIncomeStatementRange(data);
  if (data.action === "getMonthlyClosings") return getMonthlyClosings(data);
  if (data.action === "deleteMonthlyClosing") return deleteMonthlyClosing(data);
  if (data.action === "monthLock") return monthLock(data);

  if (data.action === "totalIncome") return getTotalIncome();
  if (data.action === "totalStaffSales") return getTotalStaffSales();
  if (data.action === "totalClients") return getTotalClients();
  if (data.action === "customerLookup") return getCustomerLookup();
  if (data.action === "staffClientCount") return getStaffClientCount(data);
  if (data.action === "staffTotalSales") return getStaffTotalSales(data);
  if (data.action === "todaySales") return getTodaySales(data);
  if (data.action === "todayPaymentTotals") return jsonOutput(getTodayPaymentTotals(data));

  return jsonOutput({ status: "error", message: "Unknown action" });
}

function jsonOutput(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

const TIME_ZONE = "Africa/Cairo";

const ALL_PERMISSIONS = [
  "access_cashier",
  "edit_prices",
  "view_income_statement",
  "view_staff_accounting",
  "manage_users"
];

function getCairoDateTime() {
  return Utilities.formatDate(new Date(), TIME_ZONE, "yyyy-MM-dd HH:mm:ss");
}

function getCairoDateKey() {
  return Utilities.formatDate(new Date(), TIME_ZONE, "yyyy-MM-dd");
}

function getRequestedDateKey(data, timeZone) {
  const requestedDate = String(data.reportDate || data.date || "").trim();
  if (requestedDate) return getDateKey(requestedDate, timeZone);
  return Utilities.formatDate(new Date(), timeZone, "yyyy-MM-dd");
}

function getActor(data) {
  const currentUser = data.currentUser || data.actor || {};
  const userName = String(
    data.actorUserName ||
    data.performedBy ||
    currentUser.username ||
    currentUser.userName ||
    data.username ||
    ""
  ).trim();

  const displayName = String(
    data.actorDisplayName ||
    currentUser.displayName ||
    currentUser.name ||
    data.displayName ||
    userName ||
    "system"
  ).trim();

  return {
    userName: userName || "system",
    displayName: displayName || "system"
  };
}

function getActorPermissions(data) {
  const currentUser = data.currentUser || data.actor || {};
  const permissions = currentUser.permissions || data.permissions || [];

  return Array.isArray(permissions)
    ? permissions.map(permission => String(permission || "").trim()).filter(Boolean)
    : [];
}

function actorCanManageUsers(data) {
  const actor = getActor(data || {});
  const permissions = getActorPermissions(data || {});
  return actor.userName === "owner" || permissions.includes("manage_users");
}

function getActivityLogSheet() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("ACTIVITY_LOG");
  if (!sheet) {
    throw new Error("Sheet ACTIVITY_LOG not found");
  }
  return sheet;
}

function logActivity(data, action, entityType, entityId, details) {
  try {
    const sheet = getActivityLogSheet();
    const actor = getActor(data || {});

    sheet.appendRow([
      Utilities.getUuid(),
      action || "",
      entityType || "",
      entityId || "",
      actor.userName,
      actor.displayName,
      details || "",
      getCairoDateTime()
    ]);

    SpreadsheetApp.flush();
  } catch (error) {
    Logger.log("Activity log failed: " + error.message);
  }
}

function getActivityLogs(data) {
  try {
    const sheet = getActivityLogSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      return jsonOutput({ status: "success", logs: [] });
    }

    const rows = sheet.getRange(2, 1, lastRow - 1, 8).getValues();

    const logs = rows
      .map(row => ({
        logId: String(row[0] || "").trim(),
        action: String(row[1] || "").trim(),
        entityType: String(row[2] || "").trim(),
        entityId: String(row[3] || "").trim(),
        userName: String(row[4] || "").trim(),
        displayName: String(row[5] || "").trim(),
        details: String(row[6] || "").trim(),
        createdAt: getDisplayDateTime(row[7])
      }))
      .filter(log =>
        log.logId ||
        log.action ||
        log.entityType ||
        log.entityId ||
        log.userName ||
        log.displayName ||
        log.details ||
        log.createdAt
      )
      .reverse();

    return jsonOutput({ status: "success", logs });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function getUsersSheet() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("USERS");
  if (!sheet) {
    throw new Error("Sheet USERS not found");
  }
  return sheet;
}

function parsePermissions(value) {
  return String(value || "")
    .split(",")
    .map(permission => permission.trim())
    .filter(Boolean);
}

function stringifyPermissions(permissions) {
  return (Array.isArray(permissions) ? permissions : [])
    .map(permission => String(permission || "").trim())
    .filter(Boolean)
    .join(",");
}

function sanitizeUser(user) {
  return {
    username: user.username,
    displayName: user.displayName,
    permissions: user.permissions
  };
}

function readUsersFromSheet() {
  const sheet = getUsersSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) return [];

  const rows = sheet.getRange(2, 1, lastRow - 1, 5).getValues();

  return rows
    .map((row, index) => ({
      rowNumber: index + 2,
      username: String(row[0] || "").trim(),
      password: String(row[1] || ""),
      displayName: String(row[2] || "").trim(),
      permissions: parsePermissions(row[3]),
      createdAt: row[4]
    }))
    .filter(user => user.username);
}

function getUsersFromSheet() {
  try {
    const users = readUsersFromSheet().map(sanitizeUser);
    return jsonOutput({ status: "success", users });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function loginUser(data) {
  try {
    const username = String(data.username || "").trim();
    const password = String(data.password || "");

    const user = readUsersFromSheet().find(item =>
      item.username === username &&
      item.password === password
    );

    if (!user) {
      return jsonOutput({
        status: "error",
        message: "Invalid username or password."
      });
    }

    logActivity(
      { actorUserName: user.username, actorDisplayName: user.displayName },
      "login",
      "system",
      user.username,
      `User logged in: ${user.displayName || user.username}`
    );

    return jsonOutput({
      status: "success",
      user: sanitizeUser(user)
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function logoutUser(data) {
  try {
    const actor = getActor(data || {});

    logActivity(
      {
        currentUser: {
          username: actor.userName,
          displayName: actor.displayName
        },
        actorUserName: actor.userName,
        actorDisplayName: actor.displayName
      },
      "logout",
      "system",
      actor.userName,
      `User logged out: ${actor.displayName || actor.userName}`
    );

    return jsonOutput({ status: "success" });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function createUserInSheet(data) {
  try {
    const sheet = getUsersSheet();
    const username = String(data.username || "").trim();
    const password = String(data.password || "");
    const displayName = String(data.displayName || "").trim() || username;
    const permissions = Array.isArray(data.permissions) ? data.permissions : [];

    if (!username || !password || !displayName) {
      return jsonOutput({
        status: "error",
        message: "Please enter display name, username, and password."
      });
    }

    const users = readUsersFromSheet();
    if (users.some(user => user.username === username)) {
      return jsonOutput({
        status: "error",
        message: "Username already exists."
      });
    }

    const finalPermissions = username === "owner" ? ALL_PERMISSIONS : permissions;

    sheet.appendRow([
      username,
      password,
      displayName,
      stringifyPermissions(finalPermissions),
      getCairoDateKey()
    ]);

    logActivity(
      data,
      "create",
      "user",
      username,
      `Created user: ${displayName} (${username})`
    );

    return jsonOutput({
      status: "success",
      user: {
        username,
        displayName,
        permissions: finalPermissions
      }
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function updateUserInSheet(data) {
  try {
    const sheet = getUsersSheet();
    const username = String(data.username || "").trim();

    if (!username) {
      return jsonOutput({ status: "error", message: "User name is required" });
    }

    const users = readUsersFromSheet();
    const user = users.find(item => item.username === username);

    if (!user) {
      return jsonOutput({ status: "error", message: "User not found." });
    }

    const oldDisplayName = user.displayName;
    const displayName = String(data.displayName || user.displayName).trim() || username;
    const password = String(data.password || user.password);
    const permissions = username === "owner"
      ? ALL_PERMISSIONS
      : (Array.isArray(data.permissions) ? data.permissions : user.permissions);

    sheet.getRange(user.rowNumber, 2, 1, 3).setValues([[
      password,
      displayName,
      stringifyPermissions(permissions)
    ]]);

    logActivity(
      data,
      "update",
      "user",
      username,
      `Updated user: ${oldDisplayName || username} -> ${displayName}`
    );

    return jsonOutput({
      status: "success",
      user: {
        username,
        displayName,
        permissions
      }
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function deleteUserFromSheet(data) {
  try {
    const sheet = getUsersSheet();
    const username = String(data.username || "").trim();

    if (username === "owner") {
      return jsonOutput({
        status: "error",
        message: "System owner cannot be deleted."
      });
    }

    const users = readUsersFromSheet();
    const user = users.find(item => item.username === username);

    if (!user) {
      return jsonOutput({ status: "error", message: "User not found." });
    }

    sheet.deleteRow(user.rowNumber);

    logActivity(
      data,
      "delete",
      "user",
      username,
      `Deleted user: ${user.displayName || username} (${username})`
    );

    return jsonOutput({ status: "success" });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function getServices() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("SERVICES");
  if (!sheet) {
    return jsonOutput({ status: "error", message: "Sheet SERVICES not found" });
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return jsonOutput({ status: "success", services: [] });
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, 4).getValues();

  const services = rows
    .map((row, index) => ({
      name: String(row[0] || "").trim(),
      price: parseSheetAmount(row[1]),
      active: String(row[2] || "TRUE").trim().toUpperCase() !== "FALSE",
      order: Number(row[3]) || index + 1
    }))
    .filter(service => service.name && service.active)
    .sort((a, b) => a.order - b.order)
    .map(service => ({
      name: service.name,
      price: service.price
    }));

  return jsonOutput({ status: "success", services });
}

function saveServices(data) {
  const sheet = SpreadsheetApp.getActive().getSheetByName("SERVICES");
  if (!sheet) {
    return jsonOutput({ status: "error", message: "Sheet SERVICES not found" });
  }

  const services = Array.isArray(data.services) ? data.services : [];
  const lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 4).clearContent();
  }

  const rows = services
    .filter(service => String(service.name || "").trim())
    .map((service, index) => [
      String(service.name || "").trim(),
      parseSheetAmount(service.price),
      "TRUE",
      index + 1
    ]);

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 4).setValues(rows);
  }

  logActivity(
    data,
    "update",
    "services",
    "SERVICES",
    `Saved services list. Total services: ${rows.length}`
  );

  return jsonOutput({
    status: "success",
    services: rows.map(row => ({
      name: row[0],
      price: row[1]
    }))
  });
}

function getStaffSheet() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("STAFF");
  if (!sheet) {
    throw new Error("Sheet STAFF not found");
  }
  return sheet;
}

function buildStaffId(index) {
  return `STAFF-${String(index).padStart(3, "0")}`;
}

function parseSheetBoolean(value, defaultValue) {
  if (value === true || value === false) return value;

  const text = String(value || "").trim().toUpperCase();
  if (!text) return defaultValue;

  if (["TRUE", "YES", "1", "Y"].indexOf(text) !== -1) return true;
  if (["FALSE", "NO", "0", "N"].indexOf(text) !== -1) return false;

  return defaultValue;
}

function normalizeStaffForSheet(staff, index) {
  const name = String(staff.name || staff.staffName || "").trim();
  const code = String(staff.code || staff.staffCode || "").trim().toUpperCase();

  return {
    id: String(staff.id || staff.staffId || buildStaffId(index + 1)).trim(),
    name,
    code,
    salary: parseSheetAmount(staff.salary || staff.salaries),
    percentage: parseSheetAmount(staff.percentage || staff.salaryPercentage),
    bonus: parseSheetAmount(staff.bonus),
    deduction: parseSheetAmount(staff.deduction || staff.debt || staff.lateDiscount),
    isBarber: parseSheetBoolean(staff.isBarber, true),
    active: parseSheetBoolean(staff.active, true)
  };
}

function getStaff() {
  try {
    const sheet = getStaffSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      return jsonOutput({ status: "success", staff: [] });
    }

    const rows = sheet.getRange(2, 1, lastRow - 1, 11).getValues();

    const staff = rows
      .map((row, index) => ({
        rowNumber: index + 2,
        name: String(row[0] || "").trim(),
        code: String(row[1] || "").trim().toUpperCase(),
        salary: parseSheetAmount(row[2]),
        percentage: parseSheetAmount(row[3]),
        id: String(row[4] || buildStaffId(index + 1)).trim(),
        bonus: parseSheetAmount(row[5]),
        deduction: parseSheetAmount(row[6]),
        active: parseSheetBoolean(row[7], true),
        createdAt: getDisplayDateTime(row[8]),
        updatedAt: getDisplayDateTime(row[9]),
        isBarber: parseSheetBoolean(row[10], true)
      }))
      .filter(staffMember => staffMember.name && staffMember.active)
      .map(staffMember => ({
        id: staffMember.id,
        name: staffMember.name,
        code: staffMember.code,
        salary: staffMember.salary,
        percentage: staffMember.percentage,
        bonus: staffMember.bonus,
        deduction: staffMember.deduction,
        isBarber: staffMember.isBarber
      }));

    return jsonOutput({ status: "success", staff });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function saveStaff(data) {
  try {
    const sheet = getStaffSheet();
    const staffList = Array.isArray(data.staff) ? data.staff : [];
    const lastRow = sheet.getLastRow();
    const now = getCairoDateTime();

    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, 11).clearContent();
    }

    const rows = staffList
      .map(normalizeStaffForSheet)
      .filter(staff => staff.name)
      .map(staff => [
        staff.name,
        staff.code,
        staff.salary,
        staff.percentage,
        staff.id,
        staff.bonus,
        staff.deduction,
        staff.active ? "TRUE" : "FALSE",
        now,
        now,
        staff.isBarber ? "TRUE" : "FALSE"
      ]);

    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, 11).setValues(rows);
    }

    logActivity(
      data,
      "update",
      "staff",
      "STAFF",
      `Saved staff list. Total staff: ${rows.length}`
    );

    return jsonOutput({
      status: "success",
      staff: rows.map(row => ({
        name: row[0],
        code: row[1],
        salary: row[2],
        percentage: row[3],
        id: row[4],
        bonus: row[5],
        deduction: row[6],
        isBarber: row[10] !== "FALSE"
      }))
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}
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
    cashTotal: 0,
    visaTotal: 0,
    instapayTotal: 0,
    vodafoneCashTotal: 0
  };

  if (!sheet) return totals;

  const rows = getSheetRangeFromRow2(sheet, 1, 7);

  rows.forEach(row => {
    const rowDateKey = getDateKey(row[0], TIME_ZONE);
    if (rowDateKey !== dateKey) return;

    const amount = parseSheetAmount(row[5]);
    const payment = normalizePaymentMethod(row[6]);

    totals.salesTotal += amount;

    if (payment === "cash") totals.cashTotal += amount;
    if (payment === "visa") totals.visaTotal += amount;
    if (payment === "instapay") totals.instapayTotal += amount;
    if (payment === "vodafone_cash") totals.vodafoneCashTotal += amount;
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
  const netTotal = paymentTotals.salesTotal - expensesTotal - withdrawalsTotal;
  const existingClosing = findDailyClosingByDate(dateKey);

  return {
    date: dateKey,
    salesTotal: paymentTotals.salesTotal,
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

    rows.forEach(row => {
      const dateKey = getDateKey(row[0], TIME_ZONE);
      if (dateKey !== targetDateKey) return;

      todayInvoices += 1;
      todaySales += parseSheetAmount(row[5]);

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
      `${existingClosing ? "Re-closed" : "Closed"} day ${dateKey} | Sales: ${preview.salesTotal} | Expenses: ${preview.expensesTotal} | Withdrawals: ${preview.withdrawalsTotal} | Net: ${preview.netTotal}`
    );

    return jsonOutput({
      status: "success",
      closing: {
        closingId,
        date: dateKey,
        salesTotal: preview.salesTotal,
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

  const invoiceRows = getSheetRangeFromRow2(dataSheet, 1, 9);
  const expenseRows = expensesSheet ? getSheetRangeFromRow2(expensesSheet, 1, 6) : [];
  const withdrawalRows = withdrawalsSheet ? getSheetRangeFromRow2(withdrawalsSheet, 1, 5) : [];

  let totalIncome = 0;
  let invoiceCount = 0;
  const customers = {};

  invoiceRows.forEach(row => {
    const dateKey = getDateKey(row[0], TIME_ZONE);
    if (!isDateKeyBetween(dateKey, fromDate, toDate)) return;

    const hasData = row.some(cell => cell !== "" && cell !== null);
    if (!hasData) return;

    invoiceCount += 1;
    totalIncome += parseSheetAmount(row[5]);

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

  const netProfit = totalIncome - totalExpenses - totalWithdrawals;

  return {
    fromDate,
    toDate,
    totalIncome,
    totalExpenses,
    totalWithdrawals,
    netProfit,
    totalClients: Object.keys(customers).length,
    invoiceCount,
    totalStaffSales: totalIncome,
    averageInvoice: invoiceCount ? totalIncome / invoiceCount : 0
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

function createInvoice(data) {
  const sheet = SpreadsheetApp.getActive().getSheetByName("DATA");
  const invoiceDateTime = getCairoDateTime();
  const lockedError = getLockedDateError(invoiceDateTime, "Invoice");

  if (lockedError) {
    return jsonOutput({ status: "error", message: lockedError, locked: true });
  }

  const pdfUrl = createInvoicePdf(data);

  sheet.appendRow([
    invoiceDateTime,
    data.customerName || "",
    data.customerPhone || "",
    data.services || "",
    pdfUrl,
    data.total || 0,
    data.payment || data.paymentMethod || "",
    data.barber || "",
    data.note || data.invoiceNote || ""
  ]);

  logActivity(
    data,
    "create",
    "invoice",
    pdfUrl,
    `Created invoice for ${data.customerName || "-"} | Total: ${data.total || 0} | Barber: ${data.barber || "-"}`
  );

  return jsonOutput({ status: "success", pdfUrl });
}


function updateInvoice(data) {
  try {
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
      (targetInvoiceId && targetInvoiceId !== `DATA-${targetRowNumber}`)
    ) {
      return jsonOutput({ status: "error", message: "Invoice not found" });
    }

    const currentRow = sheet.getRange(targetRowNumber, 1, 1, 9).getValues()[0];
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
      data.payment || data.paymentMethod || "",
      data.barber || "",
      data.note || data.invoiceNote || ""
    ];

    sheet.getRange(targetRowNumber, 1, 1, 9).setValues([updatedRow]);

    logActivity(
      data,
      "update",
      "invoice",
      targetInvoiceId || `DATA-${targetRowNumber}`,
      `Updated invoice | Customer: ${updatedRow[1] || "-"} | Phone: ${updatedRow[2] || "-"} | Total: ${updatedRow[5] || 0} | Barber: ${updatedRow[7] || "-"}`
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
        paymentMethod: String(updatedRow[6] || "").trim(),
        barber: String(updatedRow[7] || "").trim(),
        note: String(updatedRow[8] || "").trim()
      }
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function getInvoices(data) {
  const sheet = SpreadsheetApp.getActive().getSheetByName("DATA");
  if (!sheet) {
    return jsonOutput({ status: "error", message: "Sheet DATA not found" });
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return jsonOutput({ status: "success", invoices: [] });
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, 9).getValues();

  const invoices = rows
    .map((row, index) => {
      const rowNumber = index + 2;

      return {
        invoiceId: `DATA-${rowNumber}`,
        rowNumber,
        date: getDisplayDateTime(row[0]),
        dateKey: getDateKey(row[0], TIME_ZONE),
        customerName: String(row[1] || "").trim(),
        customerPhone: String(row[2] || "").trim(),
        services: String(row[3] || "").trim(),
        pdfUrl: String(row[4] || "").trim(),
        total: parseSheetAmount(row[5]),
        paymentMethod: String(row[6] || "").trim(),
        barber: String(row[7] || "").trim(),
        note: String(row[8] || "").trim()
      };
    })
    .filter(invoice =>
      invoice.date ||
      invoice.customerName ||
      invoice.customerPhone ||
      invoice.services ||
      invoice.pdfUrl ||
      invoice.total ||
      invoice.paymentMethod ||
      invoice.barber ||
      invoice.note
    );

  return jsonOutput({ status: "success", invoices });
}

function getDisplayDateTime(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, TIME_ZONE, "yyyy-MM-dd HH:mm:ss");
  }

  return String(value || "").trim();
}

function deleteInvoice(data) {
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
    targetRowNumber >= 2 &&
    targetRowNumber <= lastRow &&
    (!targetInvoiceId || targetInvoiceId === `DATA-${targetRowNumber}`)
  ) {
    const row = sheet.getRange(targetRowNumber, 1, 1, 9).getValues()[0];
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
      `Deleted invoice | Customer: ${row[1] || "-"} | Phone: ${row[2] || "-"} | Total: ${row[5] || 0} | Barber: ${row[7] || "-"}`
    );

    return jsonOutput({ status: "success" });
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
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
        `Deleted invoice | Customer: ${row[1] || "-"} | Phone: ${row[2] || "-"} | Total: ${row[5] || 0} | Barber: ${row[7] || "-"}`
      );

      return jsonOutput({ status: "success" });
    }
  }

  return jsonOutput({ status: "error", message: "Invoice not found" });
}

function createWithdrawal(data) {
  const sheet = SpreadsheetApp.getActive().getSheetByName("WITHDRAWLS");
  if (!sheet) {
    return jsonOutput({ status: "error", message: "Sheet WITHDRAWLS not found" });
  }

  const withdrawalDate = data.date || getCairoDateKey();
  const lockedError = getLockedDateError(withdrawalDate, "Withdrawal");
  if (lockedError) {
    return jsonOutput({ status: "error", message: lockedError, locked: true });
  }

  sheet.appendRow([
    data.staffName || "",
    data.amount || 0,
    data.note || "",
    withdrawalDate,
    data.withdrawalId || ""
  ]);

  logActivity(
    data,
    "create",
    "withdrawal",
    data.withdrawalId || "",
    `Created withdrawal | Staff: ${data.staffName || "-"} | Amount: ${data.amount || 0} | Note: ${data.note || "-"}`
  );

  return jsonOutput({ status: "success" });
}

function deleteWithdrawal(data) {
  const sheet = SpreadsheetApp.getActive().getSheetByName("WITHDRAWLS");
  if (!sheet) {
    return jsonOutput({ status: "error", message: "Sheet WITHDRAWLS not found" });
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return jsonOutput({ status: "error", message: "Withdrawal not found" });
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  const targetId = String(data.withdrawalId || "").trim();
  const targetName = String(data.staffName || "").trim();
  const targetAmount = parseSheetAmount(data.amount);
  const targetNote = String(data.note || "").trim();
  const targetDate = String(data.date || "").trim();

  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    const rowId = String(row[4] || "").trim();

    const idMatches = targetId && rowId && rowId === targetId;
    const fallbackMatches =
      String(row[0] || "").trim() === targetName &&
      parseSheetAmount(row[1]) === targetAmount &&
      String(row[2] || "").trim() === targetNote &&
      getDateKey(row[3], TIME_ZONE) === targetDate;

    if (idMatches || fallbackMatches) {
      const lockedError = getLockedDateError(row[3], "Withdrawal");
      if (lockedError) {
        return jsonOutput({ status: "error", message: lockedError, locked: true });
      }

      sheet.deleteRow(i + 2);

      logActivity(
        data,
        "delete",
        "withdrawal",
        rowId || targetId || `WITHDRAWLS-${i + 2}`,
        `Deleted withdrawal | Staff: ${row[0] || "-"} | Amount: ${row[1] || 0} | Note: ${row[2] || "-"}`
      );

      return jsonOutput({ status: "success" });
    }
  }

  return jsonOutput({ status: "error", message: "Withdrawal not found" });
}

function createExpense(data) {
  const sheet = SpreadsheetApp.getActive().getSheetByName("EXPENSES");
  if (!sheet) {
    return jsonOutput({ status: "error", message: "Sheet EXPENSES not found" });
  }

  const expenseDate = data.date || getCairoDateKey();
  const lockedError = getLockedDateError(expenseDate, "Expense");
  if (lockedError) {
    return jsonOutput({ status: "error", message: lockedError, locked: true });
  }

  sheet.appendRow([
    data.category || "",
    data.amount || 0,
    data.title || "",
    data.note || "",
    expenseDate,
    data.expenseId || ""
  ]);

  logActivity(
    data,
    "create",
    "expense",
    data.expenseId || "",
    `Created expense | Category: ${data.category || "-"} | Title: ${data.title || "-"} | Amount: ${data.amount || 0}`
  );

  return jsonOutput({ status: "success" });
}

function deleteExpense(data) {
  const sheet = SpreadsheetApp.getActive().getSheetByName("EXPENSES");
  if (!sheet) {
    return jsonOutput({ status: "error", message: "Sheet EXPENSES not found" });
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return jsonOutput({ status: "error", message: "Expense not found" });
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  const targetId = String(data.expenseId || "").trim();
  const targetCategory = String(data.category || "").trim();
  const targetAmount = parseSheetAmount(data.amount);
  const targetTitle = String(data.title || "").trim();
  const targetNote = String(data.note || "").trim();
  const targetDate = String(data.date || "").trim();

  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    const rowId = String(row[5] || "").trim();

    const idMatches = targetId && rowId && rowId === targetId;
    const fallbackMatches =
      String(row[0] || "").trim() === targetCategory &&
      parseSheetAmount(row[1]) === targetAmount &&
      String(row[2] || "").trim() === targetTitle &&
      String(row[3] || "").trim() === targetNote &&
      getDateKey(row[4], TIME_ZONE) === targetDate;

    if (idMatches || fallbackMatches) {
      const lockedError = getLockedDateError(row[4], "Expense");
      if (lockedError) {
        return jsonOutput({ status: "error", message: lockedError, locked: true });
      }

      sheet.deleteRow(i + 2);

      logActivity(
        data,
        "delete",
        "expense",
        rowId || targetId || `EXPENSES-${i + 2}`,
        `Deleted expense | Category: ${row[0] || "-"} | Title: ${row[2] || "-"} | Amount: ${row[1] || 0}`
      );

      return jsonOutput({ status: "success" });
    }
  }

  return jsonOutput({ status: "error", message: "Expense not found" });
}

function createInvoicePdf(data) {
  const invoiceNumber = `INV-${Utilities.formatDate(new Date(), TIME_ZONE, "yyyyMMdd-HHmmss")}`;
  const customerName = escapeHtml(data.customerName || "-");
  const customerPhone = escapeHtml(data.customerPhone || "-");
  const paymentMethod = escapeHtml(data.payment || data.paymentMethod || "-");
  const barber = escapeHtml(data.barber || "-");
  const invoiceDate = escapeHtml(getCairoDateTime());
  const total = formatInvoiceMoney(data.total || 0);

  const servicesText = String(data.services || "").trim();
  const services = servicesText
    ? servicesText.split(/[,\n]+/).map(service => service.trim()).filter(Boolean)
    : [];

  const servicesRows = services.length
    ? services.map((service, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(service)}</td>
        </tr>
      `).join("")
    : `
        <tr>
          <td>1</td>
          <td>No services recorded</td>
        </tr>
      `;

  const html = `
    <!DOCTYPE html>
    <html lang="en" dir="ltr">
      <head>
        <meta charset="UTF-8">
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 28px;
            font-family: Arial, Tahoma, sans-serif;
            color: #2a2118;
            background: #ffffff;
          }
          .invoice {
            width: 100%;
            max-width: 720px;
            margin: 0 auto;
            border: 1px solid #ead9bd;
            border-radius: 18px;
            overflow: hidden;
          }
          .header {
            background: #3b2412;
            color: #ffffff;
            padding: 26px 28px;
            text-align: center;
          }
          .brand { margin: 0; font-size: 28px; letter-spacing: 1px; font-weight: 800; }
          .subtitle { margin: 8px 0 0; color: #ead9bd; font-size: 14px; }
          .content { padding: 26px 28px 30px; }
          .meta { width: 100%; margin-bottom: 22px; border-collapse: collapse; }
          .meta td { width: 50%; padding: 10px 12px; border: 1px solid #f0dfc6; vertical-align: top; }
          .label { display: block; color: #7d6a58; font-size: 12px; margin-bottom: 5px; }
          .value { display: block; font-size: 16px; font-weight: 700; color: #2a2118; }
          .section-title { margin: 0 0 10px; font-size: 17px; font-weight: 800; }
          table.services { width: 100%; border-collapse: collapse; margin-bottom: 22px; }
          .services th { background: #f4ead9; color: #5b4633; font-size: 13px; text-align: left; padding: 12px; border: 1px solid #ead9bd; }
          .services td { padding: 13px 12px; border: 1px solid #ead9bd; font-size: 15px; }
          .services td:first-child, .services th:first-child { width: 70px; text-align: center; }
          .total-box { background: #19764d; color: #ffffff; border-radius: 14px; padding: 18px 20px; display: table; width: 100%; margin-top: 12px; }
          .total-label { display: table-cell; font-size: 18px; font-weight: 800; vertical-align: middle; }
          .total-value { display: table-cell; font-size: 30px; font-weight: 900; text-align: right; vertical-align: middle; }
          .footer { margin-top: 24px; padding-top: 16px; border-top: 1px dashed #d9c3a3; text-align: center; color: #7d6a58; font-size: 13px; line-height: 1.7; }
        </style>
      </head>
      <body>
        <div class="invoice">
          <div class="header">
            <h1 class="brand">SALONIX</h1>
            <p class="subtitle">Sales Invoice</p>
          </div>
          <div class="content">
            <table class="meta">
              <tr>
                <td><span class="label">Invoice No.</span><span class="value">${invoiceNumber}</span></td>
                <td><span class="label">Date</span><span class="value">${invoiceDate}</span></td>
              </tr>
              <tr>
                <td><span class="label">Customer Name</span><span class="value">${customerName}</span></td>
                <td><span class="label">Phone</span><span class="value">${customerPhone}</span></td>
              </tr>
              <tr>
                <td><span class="label">Payment Method</span><span class="value">${paymentMethod}</span></td>
                <td><span class="label">Barber</span><span class="value">${barber}</span></td>
              </tr>
            </table>
            <h2 class="section-title">Services</h2>
            <table class="services">
              <thead><tr><th>#</th><th>Service</th></tr></thead>
              <tbody>${servicesRows}</tbody>
            </table>
            <div class="total-box">
              <div class="total-label">Total</div>
              <div class="total-value">${total}</div>
            </div>
            <div class="footer">
              Thank you for visiting Salonix<br>
              The smart way to run your salon
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const blob = Utilities.newBlob(html, "text/html", "invoice.html")
    .getAs("application/pdf")
    .setName(`invoice-${Date.now()}.pdf`);

  const file = DriveApp.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return file.getUrl();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatInvoiceMoney(value) {
  return `${parseSheetAmount(value).toLocaleString("en-US")} EGP`;
}
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
  const barber = normalizeBarberName(data.barber);
  const rows = getSheetRangeFromRow2(sheet, 1, 8, true);

  const count = rows.filter(row => {
    const hasData = row.some(cell => String(cell || "").trim() !== "");
    const rowBarber = normalizeBarberName(row[7]);
    return hasData && rowBarber === barber;
  }).length;

  return jsonOutput({ status: "success", totalClients: count });
}

function normalizeBarberName(value) {
  const name = String(value || "").trim().toUpperCase().replace(/\s+/g, " ");
  const aliases = {
    KAREM: "KAREEM",
    "8ATYH": "8AYTH"
  };

  return aliases[name] || name;
}

function getStaffTotalSales(data) {
  const sheet = SpreadsheetApp.getActive().getSheetByName("DATA");
  if (!sheet) {
    return jsonOutput({ status: "error", message: "Sheet DATA not found" });
  }

  const barber = normalizeBarberName(data.barber);
  const rows = getSheetRangeFromRow2(sheet, 1, 8);

  const totalSales = rows.reduce((sum, row) => {
    const hasData = row.some(cell => cell !== "" && cell !== null);
    const rowBarber = normalizeBarberName(row[7]);

    if (!hasData || rowBarber !== barber) return sum;

    return sum + parseSheetAmount(row[5]);
  }, 0);

  return jsonOutput({ status: "success", totalSales });
}

function getTodaySales(data) {
  const sheet = SpreadsheetApp.getActive().getSheetByName("DATA");
  if (!sheet) {
    return jsonOutput({ status: "error", message: "Sheet DATA not found" });
  }

  const targetDateKey = getRequestedDateKey(data, TIME_ZONE);
  const rows = getSheetRangeFromRow2(sheet, 1, 6);

  const todaySales = rows.reduce((sum, row) => {
    const dateKey = getDateKey(row[0], TIME_ZONE);
    if (dateKey !== targetDateKey) return sum;
    return sum + parseSheetAmount(row[5]);
  }, 0);

  return jsonOutput({ status: "success", todaySales });
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
function getDateKey(value, timeZone) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, timeZone, "yyyy-MM-dd");
  }

  const text = normalizeDigits(String(value || "").trim());
  if (!text) return "";

  const ymd = text.match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
  if (ymd) {
    return `${ymd[1]}-${padDatePart(ymd[2])}-${padDatePart(ymd[3])}`;
  }

  const dmy = text.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (dmy) {
    return `${dmy[3]}-${padDatePart(dmy[2])}-${padDatePart(dmy[1])}`;
  }

  const parsed = new Date(text);
  return isNaN(parsed.getTime())
    ? ""
    : Utilities.formatDate(parsed, timeZone, "yyyy-MM-dd");
}

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

function normalizeDigits(value) {
  const digitMap = {
    "\u0660": "0", "\u0661": "1", "\u0662": "2", "\u0663": "3", "\u0664": "4",
    "\u0665": "5", "\u0666": "6", "\u0667": "7", "\u0668": "8", "\u0669": "9",
    "\u06F0": "0", "\u06F1": "1", "\u06F2": "2", "\u06F3": "3", "\u06F4": "4",
    "\u06F5": "5", "\u06F6": "6", "\u06F7": "7", "\u06F8": "8", "\u06F9": "9"
  };

  return String(value).replace(/[\u0660-\u0669\u06F0-\u06F9]/g, digit => digitMap[digit] || digit);
}
function parseSheetAmount(value) {
  if (typeof value === "number") return value;

  let text = String(value || "").trim();
  if (!text) return 0;

  if (text.includes(",") && !text.includes(".")) {
    text = /,\d{1,2}$/.test(text)
      ? text.replace(",", ".")
      : text.replace(/,/g, "");
  } else {
    text = text.replace(/,/g, "");
  }

  const num = parseFloat(text.replace(/[^\d.-]/g, ""));
  return isFinite(num) ? num : 0;
}




