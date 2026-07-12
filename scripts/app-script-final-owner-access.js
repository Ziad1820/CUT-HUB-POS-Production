function doPost(e) {
  const data = JSON.parse(e.postData.contents || "{}");

  if (data.action === "invoice") return createInvoice(data);
  if (data.action === "getInvoices") return getInvoices(data);
  if (data.action === "deleteInvoice") return deleteInvoice(data);
  if (data.action === "updateInvoice") return updateInvoice(data);

  if (data.action === "withdrawal") return createWithdrawal(data);
  if (data.action === "getWithdrawals") return getWithdrawals(data);
  if (data.action === "deleteWithdrawal") return deleteWithdrawal(data);
  if (data.action === "expense") return createExpense(data);
  if (data.action === "getExpenses") return getExpenses(data);
  if (data.action === "deleteExpense") return deleteExpense(data);

  if (data.action === "loginUser") return loginUser(data);
  if (data.action === "logoutUser" || data.action === "logout") return logoutUser(data);
  if (data.action === "getUsers") return getUsersFromSheet(data);
  if (data.action === "createUser") return createUserInSheet(data);
  if (data.action === "updateUser") return updateUserInSheet(data);
  if (data.action === "deleteUser") return deleteUserFromSheet(data);

  if (data.action === "getServices") return getServices();
  if (data.action === "saveServices") return saveServices(data);

  if (data.action === "getStaff") return getStaff();
  if (data.action === "saveStaff") return saveStaff(data);

  if (data.action === "getActivityLogs") return getActivityLogs(data);
  if (data.action === "deleteActivityLog") return deleteActivityLog(data);

  if (data.action === "createAttendanceRecord") return createAttendanceRecord(data);
  if (data.action === "getAttendanceRecords") return getAttendanceRecords(data);
  if (data.action === "updateAttendanceStep") return updateAttendanceStep(data);
  if (data.action === "approveAttendanceDeduction") return approveAttendanceDeduction(data);
  if (data.action === "deleteAttendanceRecord") return deleteAttendanceRecord(data);

  if (data.action === "createBooking") return createBooking(data);
  if (data.action === "getBookings") return getBookings(data);
  if (data.action === "updateBooking") return updateBooking(data);
  if (data.action === "deleteBooking") return deleteBooking(data);

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
  "access_dashboard",
  "access_cashier",
  "edit_prices",
  "view_invoices",
  "view_income_statement",
  "view_daily_closing",
  "view_data_analysis",
  "view_activity_log",
  "view_staff_accounting",
  "view_withdrawals",
  "view_expenses",
  "view_inventory",
  "view_staff_discount",
  "view_attendance",
  "view_bookings",
  "manage_users"
];

const SESSION_TTL_SECONDS = 6 * 60 * 60;
const SESSION_CACHE_PREFIX = "romeo-session-";

function getCairoDateTime() {
  return Utilities.formatDate(new Date(), TIME_ZONE, "yyyy-MM-dd HH:mm:ss");
}

function getInvoiceDateTime(data) {
  const selectedDate = getDateKey(data.reportDate || data.date || data.dateKey || "", TIME_ZONE);
  const currentTime = Utilities.formatDate(new Date(), TIME_ZONE, "HH:mm:ss");
  return selectedDate ? `${selectedDate} ${currentTime}` : getCairoDateTime();
}

function getCairoDateKey() {
  return Utilities.formatDate(new Date(), TIME_ZONE, "yyyy-MM-dd");
}

function getRequestedDateKey(data, timeZone) {
  const requestedDate = String(data.reportDate || data.date || "").trim();
  if (requestedDate) return getDateKey(requestedDate, timeZone);
  return Utilities.formatDate(new Date(), timeZone, "yyyy-MM-dd");
}

function getSessionToken(data) {
  return String(data.sessionToken || data.token || data.authToken || "").trim();
}

function createSessionForUser(user) {
  const token = `${Utilities.getUuid()}-${Utilities.getUuid()}`;
  const session = {
    username: user.username,
    createdAt: getCairoDateTime(),
    expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString()
  };

  CacheService
    .getScriptCache()
    .put(SESSION_CACHE_PREFIX + token, JSON.stringify(session), SESSION_TTL_SECONDS);

  return { token, expiresAt: session.expiresAt };
}

function readSessionRecord(token) {
  if (!token) return null;

  const raw = CacheService.getScriptCache().get(SESSION_CACHE_PREFIX + token);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function deleteSession(token) {
  if (!token) return;
  CacheService.getScriptCache().remove(SESSION_CACHE_PREFIX + token);
}

function getAuthenticatedUser(data) {
  const token = getSessionToken(data || {});
  const session = readSessionRecord(token);
  if (!session || !session.username) return null;

  const sessionUsername = String(session.username || "").trim().toLowerCase();
  return readUsersFromSheet().find(user =>
    String(user.username || "").trim().toLowerCase() === sessionUsername
  ) || null;
}

function getActor(data) {
  const user = getAuthenticatedUser(data || {});
  if (!user) {
    return { userName: "system", displayName: "system" };
  }

  return {
    userName: user.username,
    displayName: user.displayName || user.username
  };
}

function getActorPermissions(data) {
  const user = getAuthenticatedUser(data || {});
  return user ? normalizeManagedPermissions(user.username, user.permissions) : [];
}

function actorCanManageUsers(data) {
  const user = getAuthenticatedUser(data || {});
  return !!user && String(user.username || "").trim().toLowerCase() === "owner";
}

function actorHasPermission(data, permission) {
  const user = getAuthenticatedUser(data || {});
  if (!user) return false;
  if (String(user.username || "").trim().toLowerCase() === "owner") return true;

  return normalizeManagedPermissions(user.username, user.permissions).indexOf(permission) !== -1;
}

function requirePermission(data, permission, message) {
  if (actorHasPermission(data || {}, permission)) {
    return null;
  }

  return jsonOutput({
    status: "error",
    permissionDenied: true,
    message: message || "You do not have permission to perform this action."
  });
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
      return jsonOutput({ status: "success", logs: [], hasMore: false, totalLogs: 0 });
    }

    const totalRows = lastRow - 1;
    const limit = Math.max(1, Math.min(Number(data.limit) || 100, 500));
    const offset = Math.max(0, Number(data.offset) || 0);
    const remainingRows = Math.max(0, totalRows - offset);

    if (!remainingRows) {
      return jsonOutput({ status: "success", logs: [], hasMore: false, totalLogs: totalRows });
    }

    const rowsToRead = Math.min(limit, remainingRows);
    const startRow = lastRow - offset - rowsToRead + 1;
    const rows = sheet.getRange(startRow, 1, rowsToRead, 8).getValues();

    const logs = rows
      .map((row, index) => ({
        rowNumber: startRow + index,
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

    return jsonOutput({
      status: "success",
      logs,
      hasMore: offset + rowsToRead < totalRows,
      totalLogs: totalRows
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function deleteActivityLog(data) {
  try {
    const permissionError = requirePermission(data, "manage_users", "Only managers can delete activity logs.");
    if (permissionError) return permissionError;

    const logId = String(data.logId || data.id || "").trim();
    const rowNumber = Number(data.rowNumber || 0);
    if (!logId && !rowNumber) {
      return jsonOutput({ status: "error", message: "Missing logId." });
    }

    const sheet = getActivityLogSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return jsonOutput({ status: "error", message: "Activity log not found." });
    }

    if (logId && !/^ROW-\d+$/i.test(logId) && !/^LOG-\d+$/i.test(logId)) {
      const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      const index = ids.findIndex(row => String(row[0] || "").trim() === logId);
      if (index !== -1) {
        sheet.deleteRow(index + 2);
        SpreadsheetApp.flush();
        return jsonOutput({ status: "success", message: "Activity log deleted." });
      }
    }

    if (rowNumber >= 2 && rowNumber <= lastRow) {
      sheet.deleteRow(rowNumber);
      SpreadsheetApp.flush();
      return jsonOutput({ status: "success", message: "Activity log deleted." });
    }

    return jsonOutput({ status: "error", message: "Activity log not found." });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function getUsersSheet() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("USERS");
  if (!sheet) {
    throw new Error("Sheet USERS not found");
  }
  ensureUsersSheetColumns(sheet);
  return sheet;
}

function ensureUsersSheetColumns(sheet) {
  const requiredColumns = 6;
  const currentColumns = sheet.getMaxColumns();
  if (currentColumns < requiredColumns) {
    sheet.insertColumnsAfter(currentColumns, requiredColumns - currentColumns);
  }

  const hashHeader = String(sheet.getRange(1, 6).getValue() || "").trim();
  if (!hashHeader) {
    sheet.getRange(1, 6).setValue("PASSWORD_HASH");
  }
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

function normalizeManagedPermissions(username, permissions) {
  if (String(username || "").trim().toLowerCase() === "owner") {
    return ALL_PERMISSIONS;
  }

  return (Array.isArray(permissions) ? permissions : [])
    .map(permission => String(permission || "").trim())
    .filter(permission => permission && permission !== "manage_users");
}

function sanitizeUser(user) {
  return {
    username: user.username,
    displayName: user.displayName,
    permissions: normalizeManagedPermissions(user.username, user.permissions)
  };
}

function hashPassword(password) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(password || ""),
    Utilities.Charset.UTF_8
  );

  return digest
    .map(byte => {
      const value = byte < 0 ? byte + 256 : byte;
      return (`0${value.toString(16)}`).slice(-2);
    })
    .join("");
}

function verifyPassword(user, password) {
  const plainPassword = String(password || "");
  const storedHash = String(user.passwordHash || "").trim();
  if (storedHash && storedHash === hashPassword(plainPassword)) return true;

  return String(user.password || "") === plainPassword;
}

function ensureUserPasswordHash(user, password) {
  if (!user || !user.rowNumber || user.passwordHash) return;

  const sheet = getUsersSheet();
  sheet.getRange(user.rowNumber, 6).setValue(hashPassword(password));
}

function readUsersFromSheet() {
  const sheet = getUsersSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) return [];

  const rows = sheet.getRange(2, 1, lastRow - 1, 6).getValues();

  return rows
    .map((row, index) => ({
      rowNumber: index + 2,
      username: String(row[0] || "").trim(),
      password: String(row[1] || ""),
      displayName: String(row[2] || "").trim(),
      permissions: parsePermissions(row[3]),
      createdAt: row[4],
      passwordHash: String(row[5] || "").trim()
    }))
    .filter(user => user.username);
}

function getUsersFromSheet(data) {
  try {
    if (!actorCanManageUsers(data || {})) {
      return jsonOutput({
        status: "error",
        message: "Only the system owner can view users."
      });
    }

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
      verifyPassword(item, password)
    );

    if (!user) {
      return jsonOutput({
        status: "error",
        message: "Invalid username or password."
      });
    }

    ensureUserPasswordHash(user, password);
    const session = createSessionForUser(user);

    logActivity(
      { sessionToken: session.token },
      "login",
      "system",
      user.username,
      `User logged in: ${user.displayName || user.username}`
    );

    return jsonOutput({
      status: "success",
      user: sanitizeUser(user),
      sessionToken: session.token,
      expiresAt: session.expiresAt
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function logoutUser(data) {
  try {
    const actor = getActor(data || {});

    logActivity(
      data,
      "logout",
      "system",
      actor.userName,
      `User logged out: ${actor.displayName || actor.userName}`
    );

    deleteSession(getSessionToken(data || {}));

    return jsonOutput({ status: "success" });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function createUserInSheet(data) {
  try {
    if (!actorCanManageUsers(data || {})) {
      return jsonOutput({
        status: "error",
        message: "Only the system owner can create users."
      });
    }

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

    const finalPermissions = normalizeManagedPermissions(username, permissions);

    sheet.appendRow([
      username,
      "",
      displayName,
      stringifyPermissions(finalPermissions),
      getCairoDateKey(),
      hashPassword(password)
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
    if (!actorCanManageUsers(data || {})) {
      return jsonOutput({
        status: "error",
        message: "Only the system owner can update users."
      });
    }

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
    const password = String(data.password || "");
    const permissions = normalizeManagedPermissions(
      username,
      Array.isArray(data.permissions) ? data.permissions : user.permissions
    );

    sheet.getRange(user.rowNumber, 2, 1, 3).setValues([[
      password ? "" : user.password,
      displayName,
      stringifyPermissions(permissions)
    ]]);
    if (password) {
      sheet.getRange(user.rowNumber, 6).setValue(hashPassword(password));
    } else if (!user.passwordHash && user.password) {
      ensureUserPasswordHash(user, user.password);
    }

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
    if (!actorCanManageUsers(data || {})) {
      return jsonOutput({
        status: "error",
        message: "Only the system owner can delete users."
      });
    }

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
  const permissionError = requirePermission(data, "edit_prices", "You do not have permission to edit prices.");
  if (permissionError) return permissionError;

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
    const attendanceTotals = getApprovedAttendanceTotalsForCurrentMonth();

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
      .map(staffMember => {
        const attendanceDeduction = attendanceTotals[normalizeLookupKey(staffMember.name)] || 0;
        return {
        id: staffMember.id,
        name: staffMember.name,
        code: staffMember.code,
        salary: staffMember.salary,
        percentage: staffMember.percentage,
        bonus: staffMember.bonus,
        deduction: staffMember.deduction,
        attendanceDeduction,
        totalDeduction: staffMember.deduction + attendanceDeduction,
        isBarber: staffMember.isBarber
        };
      });

    return jsonOutput({ status: "success", staff });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function saveStaff(data) {
  try {
    const permissionError = requirePermission(data, "view_staff_accounting", "You do not have permission to edit staff.");
    if (permissionError) return permissionError;

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

const ATTENDANCE_HEADERS = [
  "ID",
  "DATE",
  "STAFF_ID",
  "STAFF_NAME",
  "RECORD_TYPE",
  "SHIFT_START",
  "CHECK_IN",
  "BREAK_OUT",
  "BREAK_IN",
  "CHECK_OUT",
  "WORK_HOURS",
  "BREAK_HOURS",
  "LATE_HOURS",
  "SHORT_HOURS",
  "ABSENCE_DAYS",
  "PENALTY_AMOUNT",
  "PENALTY_REASON",
  "SUGGESTED_DEDUCTION",
  "APPROVED_DEDUCTION",
  "APPROVAL_STATUS",
  "APPROVED_BY",
  "NOTE",
  "CREATED_AT",
  "UPDATED_AT"
];

function getAttendanceSheet() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName("ATTENDANCE");

  if (!sheet) {
    sheet = ss.insertSheet("ATTENDANCE");
  }

  ensureAttendanceHeaders(sheet);
  return sheet;
}

function ensureAttendanceHeaders(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, ATTENDANCE_HEADERS.length);
  const currentHeaders = headerRange.getValues()[0].map(value => String(value || "").trim());
  const hasHeaders = currentHeaders.some(Boolean);
  const matches = ATTENDANCE_HEADERS.every((header, index) => currentHeaders[index] === header);

  if (!hasHeaders || !matches) {
    headerRange.setValues([ATTENDANCE_HEADERS]);
  }
}

function normalizeLookupKey(value) {
  return String(value || "").trim().toLowerCase();
}

function parseTimeMinutes(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  const parts = text.split(":");
  if (parts.length < 2) return null;

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  return (hours * 60) + minutes;
}

function getHoursBetween(startValue, endValue) {
  const start = parseTimeMinutes(startValue);
  const end = parseTimeMinutes(endValue);

  if (start === null || end === null || end < start) {
    return 0;
  }

  return (end - start) / 60;
}

function roundHours(value) {
  return Math.round(parseSheetAmount(value) * 100) / 100;
}

function getMonthlyAbsenceCount(staffName, dateKey, excludeId) {
  const sheet = getAttendanceSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const monthKey = String(dateKey || "").slice(0, 7);
  const staffKey = normalizeLookupKey(staffName);
  const rows = sheet.getRange(2, 1, lastRow - 1, ATTENDANCE_HEADERS.length).getValues();

  return rows.filter(row => {
    const id = String(row[0] || "").trim();
    const rowDate = getDateKey(row[1], TIME_ZONE);
    const rowStaff = normalizeLookupKey(row[3]);
    const type = String(row[4] || "").trim();
    return id !== excludeId
      && rowDate.slice(0, 7) === monthKey
      && rowStaff === staffKey
      && type === "absent";
  }).length;
}

function calculateAttendanceValues(data) {
  const recordType = String(data.recordType || "work").trim();
  const salary = parseSheetAmount(data.salary);
  const dailyRate = salary > 0 ? salary / 26 : 0;
  const hourlyRate = dailyRate > 0 ? dailyRate / 8 : 0;
  const penaltyAmount = parseSheetAmount(data.penaltyAmount);
  const shiftStart = String(data.shiftStart || "12:00").trim();
  const checkIn = String(data.checkIn || "").trim();
  const checkOut = String(data.checkOut || "").trim();
  const breakOut = String(data.breakOut || "").trim();
  const breakIn = String(data.breakIn || "").trim();

  if (recordType === "absent") {
    const absenceCount = getMonthlyAbsenceCount(data.staffName, data.dateKey || data.date);
    const isPaidLeave = absenceCount < 4;
    return {
      workHours: 0,
      breakHours: 0,
      lateHours: 0,
      shortHours: 0,
      absenceDays: 1,
      suggestedDeduction: roundHours(isPaidLeave ? penaltyAmount : dailyRate + penaltyAmount)
    };
  }

  if (recordType === "penalty") {
    return {
      workHours: 0,
      breakHours: 0,
      lateHours: 0,
      shortHours: 0,
      absenceDays: 0,
      suggestedDeduction: roundHours(penaltyAmount)
    };
  }

  if (!checkOut) {
    return {
      workHours: 0,
      breakHours: 0,
      lateHours: 0,
      shortHours: 0,
      absenceDays: 0,
      suggestedDeduction: 0
    };
  }

  const presenceHours = getHoursBetween(checkIn, checkOut);
  const breakHours = getHoursBetween(breakOut, breakIn);
  const workHours = Math.max(0, presenceHours - breakHours);
  const lateHours = Math.max(0, getHoursBetween(shiftStart, checkIn));
  const shortHours = Math.max(0, 8 - workHours);
  const billableMissingHours = Math.max(lateHours, shortHours);
  const suggestedDeduction = (billableMissingHours * hourlyRate) + penaltyAmount;

  return {
    workHours: roundHours(workHours),
    breakHours: roundHours(breakHours),
    lateHours: roundHours(lateHours),
    shortHours: roundHours(shortHours),
    absenceDays: 0,
    suggestedDeduction: roundHours(suggestedDeduction)
  };
}

function attendanceRecordFromRow(row, rowNumber) {
  return {
    rowNumber,
    id: String(row[0] || "").trim(),
    date: getDateKey(row[1], TIME_ZONE),
    staffId: String(row[2] || "").trim(),
    staffName: String(row[3] || "").trim(),
    recordType: String(row[4] || "work").trim(),
    shiftStart: String(row[5] || "").trim(),
    checkIn: String(row[6] || "").trim(),
    breakOut: String(row[7] || "").trim(),
    breakIn: String(row[8] || "").trim(),
    checkOut: String(row[9] || "").trim(),
    workHours: parseSheetAmount(row[10]),
    breakHours: parseSheetAmount(row[11]),
    lateHours: parseSheetAmount(row[12]),
    shortHours: parseSheetAmount(row[13]),
    absenceDays: parseSheetAmount(row[14]),
    penaltyAmount: parseSheetAmount(row[15]),
    penaltyReason: String(row[16] || "").trim(),
    suggestedDeduction: parseSheetAmount(row[17]),
    approvedDeduction: parseSheetAmount(row[18]),
    approvalStatus: String(row[19] || "pending").trim(),
    approvedBy: String(row[20] || "").trim(),
    note: String(row[21] || "").trim(),
    createdAt: getDisplayDateTime(row[22]),
    updatedAt: getDisplayDateTime(row[23])
  };
}

function createAttendanceRecord(data) {
  try {
    const permissionError = requirePermission(data, "view_attendance", "You do not have permission to manage attendance.");
    if (permissionError) return permissionError;

    const sheet = getAttendanceSheet();
    const now = getCairoDateTime();
    const dateKey = getDateKey(data.date || data.dateKey || now, TIME_ZONE);
    const staffName = String(data.staffName || "").trim();

    if (!staffName) {
      return jsonOutput({ status: "error", message: "Staff name is required." });
    }

    const existingOpenRecord = findOpenAttendanceRecord(sheet, staffName, dateKey);
    if (String(data.recordType || "work").trim() === "work" && existingOpenRecord) {
      return jsonOutput({ status: "error", message: "This staff member already has an open attendance record today." });
    }

    const values = calculateAttendanceValues({ ...data, dateKey });
    const id = String(data.id || `ATT-${Utilities.getUuid()}`).trim();
    const row = [
      id,
      dateKey,
      String(data.staffId || "").trim(),
      staffName,
      String(data.recordType || "work").trim(),
      String(data.shiftStart || "12:00").trim(),
      String(data.checkIn || "").trim(),
      String(data.breakOut || "").trim(),
      String(data.breakIn || "").trim(),
      String(data.checkOut || "").trim(),
      values.workHours,
      values.breakHours,
      values.lateHours,
      values.shortHours,
      values.absenceDays,
      parseSheetAmount(data.penaltyAmount),
      String(data.penaltyReason || "").trim(),
      values.suggestedDeduction,
      0,
      String(data.recordType || "work").trim() === "work" && !String(data.checkOut || "").trim() ? "open" : "pending",
      "",
      String(data.note || "").trim(),
      now,
      now
    ];

    sheet.appendRow(row);
    logActivity(data, "create", "attendance", id, `Created attendance record for ${staffName} on ${dateKey}. Suggested deduction: ${values.suggestedDeduction}`);

    return jsonOutput({ status: "success", record: attendanceRecordFromRow(row, sheet.getLastRow()) });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function findOpenAttendanceRecord(sheet, staffName, dateKey) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const staffKey = normalizeLookupKey(staffName);
  const rows = sheet.getRange(2, 1, lastRow - 1, ATTENDANCE_HEADERS.length).getValues();

  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const record = attendanceRecordFromRow(rows[index], index + 2);
    if (
      record.date === dateKey &&
      normalizeLookupKey(record.staffName) === staffKey &&
      record.recordType === "work" &&
      !record.checkOut &&
      record.approvalStatus !== "approved"
    ) {
      return record;
    }
  }

  return null;
}

function updateAttendanceStep(data) {
  try {
    const permissionError = requirePermission(data, "view_attendance", "You do not have permission to update attendance.");
    if (permissionError) return permissionError;

    const sheet = getAttendanceSheet();
    const rowNumber = Number(data.rowNumber);
    if (!rowNumber || rowNumber < 2 || rowNumber > sheet.getLastRow()) {
      return jsonOutput({ status: "error", message: "Attendance record was not found." });
    }

    const step = String(data.step || "").trim();
    const timeValue = String(data.time || "").trim();
    const stepColumns = {
      checkIn: 7,
      breakOut: 8,
      breakIn: 9,
      checkOut: 10
    };

    if (!stepColumns[step] || !timeValue) {
      return jsonOutput({ status: "error", message: "Invalid attendance step." });
    }

    const row = sheet.getRange(rowNumber, 1, 1, ATTENDANCE_HEADERS.length).getValues()[0];
    const record = attendanceRecordFromRow(row, rowNumber);

    if (record.approvalStatus === "approved") {
      return jsonOutput({ status: "error", message: "Approved attendance records cannot be edited." });
    }

    const updatedRecord = {
      ...record,
      [step]: timeValue,
      salary: data.salary
    };
    const values = calculateAttendanceValues(updatedRecord);
    const status = step === "checkOut" ? "pending" : "open";
    const now = getCairoDateTime();

    sheet.getRange(rowNumber, stepColumns[step]).setValue(timeValue);
    sheet.getRange(rowNumber, 11, 1, 10).setValues([[
      values.workHours,
      values.breakHours,
      values.lateHours,
      values.shortHours,
      values.absenceDays,
      record.penaltyAmount,
      record.penaltyReason,
      values.suggestedDeduction,
      0,
      status
    ]]);
    sheet.getRange(rowNumber, 24).setValue(now);

    logActivity(data, "update", "attendance", record.id, `Updated attendance ${step} for ${record.staffName} on ${record.date}.`);

    return jsonOutput({
      status: "success",
      record: attendanceRecordFromRow(sheet.getRange(rowNumber, 1, 1, ATTENDANCE_HEADERS.length).getValues()[0], rowNumber)
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function getAttendanceRecords(data) {
  try {
    const permissionError = requirePermission(data, "view_attendance", "You do not have permission to view attendance.");
    if (permissionError) return permissionError;

    const sheet = getAttendanceSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return jsonOutput({ status: "success", records: [] });
    }

    const fromDate = getDateKey(data.fromDate || data.date || "", TIME_ZONE);
    const toDate = getDateKey(data.toDate || data.date || "", TIME_ZONE);
    const staffKey = normalizeLookupKey(data.staffName);
    const status = String(data.approvalStatus || "").trim();
    const rows = sheet.getRange(2, 1, lastRow - 1, ATTENDANCE_HEADERS.length).getValues();

    const records = rows
      .map((row, index) => attendanceRecordFromRow(row, index + 2))
      .filter(record => {
        if (fromDate && record.date < fromDate) return false;
        if (toDate && record.date > toDate) return false;
        if (staffKey && normalizeLookupKey(record.staffName) !== staffKey) return false;
        if (status && record.approvalStatus !== status) return false;
        return true;
      })
      .sort((a, b) => String(b.date).localeCompare(String(a.date)) || b.rowNumber - a.rowNumber);

    return jsonOutput({ status: "success", records });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function approveAttendanceDeduction(data) {
  try {
    const permissionError = requirePermission(data, "view_staff_accounting", "You do not have permission to approve deductions.");
    if (permissionError) return permissionError;

    const sheet = getAttendanceSheet();
    const rowNumber = Number(data.rowNumber);
    if (!rowNumber || rowNumber < 2 || rowNumber > sheet.getLastRow()) {
      return jsonOutput({ status: "error", message: "Attendance record was not found." });
    }

    const row = sheet.getRange(rowNumber, 1, 1, ATTENDANCE_HEADERS.length).getValues()[0];
    const record = attendanceRecordFromRow(row, rowNumber);
    const approvedDeduction = data.approvedDeduction === undefined || data.approvedDeduction === null || data.approvedDeduction === ""
      ? record.suggestedDeduction
      : parseSheetAmount(data.approvedDeduction);
    const actor = getActor(data);
    const now = getCairoDateTime();

    sheet.getRange(rowNumber, 19, 1, 6).setValues([[
      approvedDeduction,
      "approved",
      actor.displayName,
      record.note,
      record.createdAt || row[22],
      now
    ]]);

    logActivity(data, "update", "attendance", record.id, `Approved attendance deduction for ${record.staffName}. Amount: ${approvedDeduction}`);

    return jsonOutput({
      status: "success",
      record: {
        ...record,
        approvedDeduction,
        approvalStatus: "approved",
        approvedBy: actor.displayName,
        updatedAt: now
      }
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function deleteAttendanceRecord(data) {
  try {
    const permissionError = requirePermission(data, "view_staff_accounting", "You do not have permission to delete attendance records.");
    if (permissionError) return permissionError;

    const sheet = getAttendanceSheet();
    const rowNumber = Number(data.rowNumber);
    if (!rowNumber || rowNumber < 2 || rowNumber > sheet.getLastRow()) {
      return jsonOutput({ status: "error", message: "Attendance record was not found." });
    }

    const row = sheet.getRange(rowNumber, 1, 1, ATTENDANCE_HEADERS.length).getValues()[0];
    const record = attendanceRecordFromRow(row, rowNumber);
    sheet.deleteRow(rowNumber);

    logActivity(data, "delete", "attendance", record.id, `Deleted attendance record for ${record.staffName} on ${record.date}.`);
    return jsonOutput({ status: "success" });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function getApprovedAttendanceTotalsForCurrentMonth() {
  try {
    const today = getCairoDateKey();
    const monthKey = today.slice(0, 7);
    const sheet = getAttendanceSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return {};

    const rows = sheet.getRange(2, 1, lastRow - 1, ATTENDANCE_HEADERS.length).getValues();
    return rows.reduce((totals, row) => {
      const record = attendanceRecordFromRow(row, 0);
      if (record.date.slice(0, 7) !== monthKey || record.approvalStatus !== "approved") {
        return totals;
      }

      const key = normalizeLookupKey(record.staffName);
      totals[key] = (totals[key] || 0) + record.approvedDeduction;
      return totals;
    }, {});
  } catch (error) {
    return {};
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

function ensureDataInvoiceColumns(sheet) {
  const requiredColumns = 11;
  const currentColumns = sheet.getMaxColumns();
  if (currentColumns < requiredColumns) {
    sheet.insertColumnsAfter(currentColumns, requiredColumns - currentColumns);
  }

  sheet.getRange(1, 6, 1, 6).setValues([["TOTAL", "paid amount", "tip amount", "PAYMENT", "BARBER", "Notes"]]);
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
    note: String(row[10] || "").trim()
  };
}

function createInvoice(data) {
  const permissionError = requirePermission(data, "access_cashier", "You do not have permission to create invoices.");
  if (permissionError) return permissionError;

  const sheet = SpreadsheetApp.getActive().getSheetByName("DATA");
  ensureDataInvoiceColumns(sheet);
  const invoiceDateTime = getInvoiceDateTime(data);
  const lockedError = getLockedDateError(invoiceDateTime, "Invoice");

  if (lockedError) {
    return jsonOutput({ status: "error", message: lockedError, locked: true });
  }

  const pdfUrl = createInvoicePdf(data);
  const paymentDetails = getInvoicePaymentDetails(data);

  sheet.appendRow([
    invoiceDateTime,
    data.customerName || "",
    data.customerPhone || "",
    data.services || "",
    pdfUrl,
    data.total || 0,
    paymentDetails.paidAmount,
    paymentDetails.tipAmount,
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
    const permissionError = requirePermission(data, "view_invoices", "You do not have permission to edit invoices.");
    if (permissionError) return permissionError;

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
      !targetInvoiceId ||
      (targetInvoiceId && targetInvoiceId !== `DATA-${targetRowNumber}`)
    ) {
      return jsonOutput({ status: "error", message: "Invoice must be loaded from the sheet before editing." });
    }

    ensureDataInvoiceColumns(sheet);
    const currentRow = sheet.getRange(targetRowNumber, 1, 1, 12).getValues()[0];
    const beforeUpdate = invoiceRowAuditSnapshot(currentRow);
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
      data.paidAmount || currentRow[6] || data.total || 0,
      data.tipAmount || currentRow[7] || 0,
      data.payment || data.paymentMethod || "",
      data.barber || "",
      data.note || data.invoiceNote || ""
    ];

    sheet.getRange(targetRowNumber, 1, 1, 11).setValues([updatedRow]);
    const afterUpdate = invoiceRowAuditSnapshot(updatedRow);

    logActivity(
      data,
      "update",
      "invoice",
      targetInvoiceId || `DATA-${targetRowNumber}`,
      `Updated invoice ${targetInvoiceId || `DATA-${targetRowNumber}`} | Before: ${JSON.stringify(beforeUpdate)} | After: ${JSON.stringify(afterUpdate)}`
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
        paidAmount: parseSheetAmount(updatedRow[6]),
        tipAmount: parseSheetAmount(updatedRow[7]),
        paymentMethod: String(updatedRow[8] || "").trim(),
        barber: String(updatedRow[9] || "").trim(),
        note: String(updatedRow[10] || "").trim()
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
    return jsonOutput({ status: "success", invoices: [], hasMore: false, nextOffset: 0, totalMatches: 0 });
  }

  const filters = data.filters || {};
  const search = String(filters.search || data.search || "").trim().toLowerCase();
  const targetDate = String(filters.date || data.date || data.dateKey || "").trim();
  const fromDate = String(filters.fromDate || data.fromDate || data.startDate || "").trim();
  const toDate = String(filters.toDate || data.toDate || data.endDate || "").trim();
  const targetBarber = String(filters.barber || data.barber || "").trim();
  const targetPayment = String(filters.payment || data.payment || data.paymentMethod || "").trim();
  const limit = Math.min(Math.max(Number(data.limit) || 100, 1), 500);
  const offset = Math.max(Number(data.offset) || 0, 0);
  ensureDataInvoiceColumns(sheet);
  const rows = sheet.getRange(2, 1, lastRow - 1, Math.min(sheet.getLastColumn(), 12)).getValues();
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
    note: String(row[10] || "").trim()
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
    if (fromDate && invoice.dateKey < fromDate) continue;
    if (toDate && invoice.dateKey > toDate) continue;
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
    const row = sheet.getRange(targetRowNumber, 1, 1, 11).getValues()[0];
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

function createWithdrawal(data) {
  const permissionError = requirePermission(data, "view_withdrawals", "You do not have permission to add withdrawals.");
  if (permissionError) return permissionError;

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

function getWithdrawals(data) {
  const sheet = SpreadsheetApp.getActive().getSheetByName("WITHDRAWLS");
  if (!sheet) {
    return jsonOutput({ status: "error", message: "Sheet WITHDRAWLS not found" });
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return jsonOutput({ status: "success", withdrawals: [] });
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  const withdrawals = rows.map((row, index) => {
    const rowNumber = index + 2;
    const withdrawalId = row[4] || `WITHDRAWLS-${rowNumber}`;
    return {
      id: withdrawalId,
      withdrawalId,
      rowNumber,
      staffName: row[0] || "",
      staffCode: "",
      amount: parseSheetAmount(row[1]),
      note: row[2] || "",
      date: getDateKey(row[3], TIME_ZONE)
    };
  }).reverse();

  return jsonOutput({ status: "success", withdrawals });
}

function deleteWithdrawal(data) {
  const permissionError = requirePermission(data, "view_withdrawals", "You do not have permission to delete withdrawals.");
  if (permissionError) return permissionError;

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
  const permissionError = requirePermission(data, "view_expenses", "You do not have permission to add expenses.");
  if (permissionError) return permissionError;

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

function getExpenses(data) {
  const sheet = SpreadsheetApp.getActive().getSheetByName("EXPENSES");
  if (!sheet) {
    return jsonOutput({ status: "error", message: "Sheet EXPENSES not found" });
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return jsonOutput({ status: "success", expenses: [] });
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  const expenses = rows.map((row, index) => {
    const rowNumber = index + 2;
    const expenseId = row[5] || `EXPENSES-${rowNumber}`;
    return {
      id: expenseId,
      expenseId,
      rowNumber,
      category: row[0] || "",
      amount: parseSheetAmount(row[1]),
      title: row[2] || "",
      note: row[3] || "",
      date: getDateKey(row[4], TIME_ZONE)
    };
  }).reverse();

  return jsonOutput({ status: "success", expenses });
}

function deleteExpense(data) {
  const permissionError = requirePermission(data, "view_expenses", "You do not have permission to delete expenses.");
  if (permissionError) return permissionError;

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
  const invoiceDate = escapeHtml(getInvoiceDateTime(data));
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
  const rows = getSheetRangeFromRow2(sheet, 1, 10, true);

  const count = rows.filter(row => {
    const hasData = row.some(cell => String(cell || "").trim() !== "");
    const rowBarber = normalizeBarberName(row[9]);
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
  const rows = getSheetRangeFromRow2(sheet, 1, 10);

  const totalSales = rows.reduce((sum, row) => {
    const hasData = row.some(cell => cell !== "" && cell !== null);
    const rowBarber = normalizeBarberName(row[9]);

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

function getBookingsSheet() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("Bookings");
  if (!sheet) {
    throw new Error("Sheet Bookings not found");
  }
  ensureBookingsColumns(sheet);
  return sheet;
}

function ensureBookingsColumns(sheet) {
  const headers = [
    "ID",
    "DATE",
    "TIME",
    "CUSTOMER",
    "PHONE",
    "EMPLOYEE",
    "SERVICE",
    "NOTE",
    "STATUS",
    "CREATED_AT",
    "UPDATED_AT"
  ];

  const currentColumns = sheet.getMaxColumns();
  if (currentColumns < headers.length) {
    sheet.insertColumnsAfter(currentColumns, headers.length - currentColumns);
  }

  const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const hasHeaders = currentHeaders.some(value => String(value || "").trim());
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function normalizeBookingStatus(value) {
  const status = String(value || "pending").trim().toLowerCase();
  const allowed = {
    pending: true,
    confirmed: true,
    done: true,
    cancelled: true
  };

  return allowed[status] ? status : "pending";
}

function bookingFromRow(row, rowNumber) {
  const id = String(row[0] || "").trim() || `BOOK-${rowNumber}`;

  return {
    id,
    bookingId: id,
    rowNumber,
    date: getDateKey(row[1], TIME_ZONE) || String(row[1] || "").trim(),
    time: getBookingTimeValue(row[2]),
    customerName: String(row[3] || "").trim(),
    customerPhone: String(row[4] || "").trim(),
    employee: String(row[5] || "").trim(),
    service: String(row[6] || "").trim(),
    note: String(row[7] || "").trim(),
    status: normalizeBookingStatus(row[8]),
    createdAt: getDisplayDateTime(row[9]),
    updatedAt: getDisplayDateTime(row[10])
  };
}

function getBookingTimeValue(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, TIME_ZONE, "HH:mm");
  }

  const text = normalizeDigits(String(value || "").trim());
  const timeMatch = text.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    return `${padDatePart(timeMatch[1])}:${timeMatch[2]}`;
  }

  return text;
}

function findBookingRow(sheet, data) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const targetRowNumber = Number(data.rowNumber || 0);
  const targetId = String(data.id || data.bookingId || "").trim();

  if (targetRowNumber >= 2 && targetRowNumber <= lastRow) {
    const row = sheet.getRange(targetRowNumber, 1, 1, 11).getValues()[0];
    const booking = bookingFromRow(row, targetRowNumber);
    if (!targetId || booking.id === targetId || targetId === `BOOK-${targetRowNumber}`) {
      return { rowNumber: targetRowNumber, row, booking };
    }
  }

  if (!targetId) return null;

  const rows = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
  for (let index = 0; index < rows.length; index++) {
    const rowNumber = index + 2;
    const booking = bookingFromRow(rows[index], rowNumber);
    if (booking.id === targetId || targetId === `BOOK-${rowNumber}`) {
      return { rowNumber, row: rows[index], booking };
    }
  }

  return null;
}

function createBooking(data) {
  try {
    const permissionError = requirePermission(data, "view_bookings", "You do not have permission to create bookings.");
    if (permissionError) return permissionError;

    const sheet = getBookingsSheet();
    const now = getCairoDateTime();
    const id = String(data.id || data.bookingId || Utilities.getUuid()).trim();
    const date = getDateKey(data.date || data.bookingDate || "", TIME_ZONE);
    const time = String(data.time || data.bookingTime || "").trim();
    const customerName = String(data.customerName || data.customer || "").trim();
    const customerPhone = String(data.customerPhone || data.phone || "").trim();
    const employee = String(data.employee || data.barber || "").trim();
    const service = String(data.service || data.services || "").trim();
    const note = String(data.note || "").trim();
    const status = normalizeBookingStatus(data.status);

    if (!date || !time || !customerName || !customerPhone || !employee || !service) {
      return jsonOutput({ status: "error", message: "Missing required booking fields." });
    }

    sheet.appendRow([
      id,
      date,
      time,
      customerName,
      customerPhone,
      employee,
      service,
      note,
      status,
      now,
      now
    ]);

    SpreadsheetApp.flush();
    const rowNumber = sheet.getLastRow();
    const booking = bookingFromRow(sheet.getRange(rowNumber, 1, 1, 11).getValues()[0], rowNumber);

    logActivity(
      data,
      "create",
      "booking",
      id,
      `Created booking | Customer: ${customerName} | Phone: ${customerPhone} | Date: ${date} ${time} | Employee: ${employee} | Service: ${service}`
    );

    return jsonOutput({ status: "success", booking });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function getBookings(data) {
  try {
    const permissionError = requirePermission(data, "view_bookings", "You do not have permission to view bookings.");
    if (permissionError) return permissionError;

    const sheet = getBookingsSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return jsonOutput({ status: "success", bookings: [] });
    }

    const filters = data.filters || {};
    const targetDate = getDateKey(filters.date || data.date || data.bookingDate || "", TIME_ZONE);
    const fromDate = getDateKey(filters.fromDate || data.fromDate || "", TIME_ZONE);
    const toDate = getDateKey(filters.toDate || data.toDate || "", TIME_ZONE);
    const targetStatus = String(filters.status || data.status || "").trim().toLowerCase();
    const search = String(filters.search || data.search || "").trim().toLowerCase();
    const rows = sheet.getRange(2, 1, lastRow - 1, 11).getValues();

    const bookings = rows
      .map((row, index) => bookingFromRow(row, index + 2))
      .filter(booking =>
        booking.id ||
        booking.date ||
        booking.time ||
        booking.customerName ||
        booking.customerPhone ||
        booking.employee ||
        booking.service
      )
      .filter(booking => !targetDate || booking.date === targetDate)
      .filter(booking => !fromDate || booking.date >= fromDate)
      .filter(booking => !toDate || booking.date <= toDate)
      .filter(booking => !targetStatus || booking.status === targetStatus)
      .filter(booking => {
        if (!search) return true;
        const haystack = `${booking.customerName} ${booking.customerPhone} ${booking.employee} ${booking.service} ${booking.note}`.toLowerCase();
        return haystack.indexOf(search) !== -1;
      })
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

    return jsonOutput({ status: "success", bookings });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function updateBooking(data) {
  try {
    const permissionError = requirePermission(data, "view_bookings", "You do not have permission to edit bookings.");
    if (permissionError) return permissionError;

    const sheet = getBookingsSheet();
    const found = findBookingRow(sheet, data);
    if (!found) {
      return jsonOutput({ status: "error", message: "Booking not found" });
    }

    const beforeUpdate = found.booking;
    const now = getCairoDateTime();
    const nextDate = getDateKey(data.date || data.bookingDate || beforeUpdate.date, TIME_ZONE);
    const updatedRow = [
      beforeUpdate.id,
      nextDate,
      String(data.time || data.bookingTime || beforeUpdate.time || "").trim(),
      String(data.customerName || data.customer || beforeUpdate.customerName || "").trim(),
      String(data.customerPhone || data.phone || beforeUpdate.customerPhone || "").trim(),
      String(data.employee || data.barber || beforeUpdate.employee || "").trim(),
      String(data.service || data.services || beforeUpdate.service || "").trim(),
      String(data.note !== undefined ? data.note : beforeUpdate.note || "").trim(),
      normalizeBookingStatus(data.status || beforeUpdate.status),
      beforeUpdate.createdAt || getCairoDateTime(),
      now
    ];

    if (!updatedRow[1] || !updatedRow[2] || !updatedRow[3] || !updatedRow[4] || !updatedRow[5] || !updatedRow[6]) {
      return jsonOutput({ status: "error", message: "Missing required booking fields." });
    }

    sheet.getRange(found.rowNumber, 1, 1, 11).setValues([updatedRow]);
    const booking = bookingFromRow(updatedRow, found.rowNumber);

    logActivity(
      data,
      "update",
      "booking",
      beforeUpdate.id,
      `Updated booking ${beforeUpdate.id} | Before: ${JSON.stringify(beforeUpdate)} | After: ${JSON.stringify(booking)}`
    );

    return jsonOutput({ status: "success", booking });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function deleteBooking(data) {
  try {
    const permissionError = requirePermission(data, "view_bookings", "You do not have permission to delete bookings.");
    if (permissionError) return permissionError;

    const sheet = getBookingsSheet();
    const found = findBookingRow(sheet, data);
    if (!found) {
      return jsonOutput({ status: "error", message: "Booking not found" });
    }

    sheet.deleteRow(found.rowNumber);

    logActivity(
      data,
      "delete",
      "booking",
      found.booking.id,
      `Deleted booking | Customer: ${found.booking.customerName || "-"} | Phone: ${found.booking.customerPhone || "-"} | Date: ${found.booking.date || "-"} ${found.booking.time || "-"} | Employee: ${found.booking.employee || "-"}`
    );

    return jsonOutput({ status: "success" });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
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




