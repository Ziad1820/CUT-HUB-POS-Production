const CUT_HUB_ENVIRONMENT_PROPERTY = "CUT_HUB_ENVIRONMENT";
const CUT_HUB_SPREADSHEET_ID_PROPERTY = "CUT_HUB_SPREADSHEET_ID";
const CUT_HUB_BACKEND_VERSION_PROPERTY = "CUT_HUB_BACKEND_VERSION";
const CUT_HUB_STAGING_SPREADSHEET_ID_PROPERTY = "CUT_HUB_STAGING_SPREADSHEET_ID";
const STAGING_CONFIGURATION_ERROR = "STAGING_CONFIGURATION_INVALID";
const CUT_HUB_SPREADSHEET_ID_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;

function getCutHubEnvironmentConfig() {
  const properties = PropertiesService.getScriptProperties();
  return {
    environment: String(properties.getProperty(CUT_HUB_ENVIRONMENT_PROPERTY) || "").trim().toLowerCase(),
    spreadsheetId: String(properties.getProperty(CUT_HUB_SPREADSHEET_ID_PROPERTY) || "").trim(),
    stagingSpreadsheetId: String(
      properties.getProperty(CUT_HUB_STAGING_SPREADSHEET_ID_PROPERTY) || "").trim(),
    backendVersion: String(properties.getProperty(CUT_HUB_BACKEND_VERSION_PROPERTY) || "").trim()
  };
}

function assertStagingEnvironment() {
  try {
    const identity = assertCutHubSpreadsheetIdentity();
    const config = identity.config;
    const spreadsheet = identity.spreadsheet;
    if (
      config.environment !== "staging" ||
      !CUT_HUB_SPREADSHEET_ID_PATTERN.test(config.stagingSpreadsheetId) ||
      config.spreadsheetId !== config.stagingSpreadsheetId
    ) {
      throw new Error(STAGING_CONFIGURATION_ERROR);
    }
    return { config, spreadsheet };
  } catch (error) {
    throw new Error(STAGING_CONFIGURATION_ERROR);
  }
}

function assertCutHubSpreadsheetIdentity() {
  try {
    const config = getCutHubEnvironmentConfig();
    const spreadsheet = SpreadsheetApp.getActive();
    const activeSpreadsheetId = spreadsheet && String(spreadsheet.getId() || "").trim();
    if (
      ["development", "test", "staging", "production"].indexOf(config.environment) === -1 ||
      !CUT_HUB_SPREADSHEET_ID_PATTERN.test(config.spreadsheetId) ||
      !spreadsheet ||
      !CUT_HUB_SPREADSHEET_ID_PATTERN.test(activeSpreadsheetId) ||
      activeSpreadsheetId !== config.spreadsheetId
    ) {
      throw new Error(STAGING_CONFIGURATION_ERROR);
    }
    return { config, spreadsheet };
  } catch (error) {
    throw new Error(STAGING_CONFIGURATION_ERROR);
  }
}

function validateCutHubRequestEnvironment() {
  const identity = assertCutHubSpreadsheetIdentity();
  if (identity.config.environment === "staging") return assertStagingEnvironment().config;
  return identity.config;
}

function getStagingIdentityValues() {
  const staging = assertStagingEnvironment();
  return {
    environment: staging.config.environment,
    spreadsheetName: staging.spreadsheet.getName(),
    spreadsheetId: staging.spreadsheet.getId(),
    timezone: staging.spreadsheet.getSpreadsheetTimeZone(),
    backendVersion: staging.config.backendVersion
  };
}

function verifyStagingEnvironment() {
  const identity = getStagingIdentityValues();
  Logger.log(JSON.stringify(identity));
  return identity;
}

function stagingIdentity() {
  const config = getCutHubEnvironmentConfig();
  if (config.environment !== "staging") {
    return jsonOutput({
      status: "error",
      code: "PERMISSION_DENIED",
      message: "This action is available only in staging."
    });
  }
  return jsonOutput(getStagingIdentityValues());
}

function parsePostRequestData(e) {
  const contents = e && e.postData ? e.postData.contents : "";
  let raw = String(contents == null ? "" : contents).replace(/^\uFEFF/, "").trim();
  if (!raw) return {};
  let data = JSON.parse(raw);
  if (typeof data === "string") {
    raw = data.replace(/^\uFEFF/, "").trim();
    data = JSON.parse(raw);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("INVALID_JSON_REQUEST");
  }
  return data;
}

const PUBLIC_ACTIONS = Object.freeze([
  "loginUser",
  "logoutUser",
  "logout",
  "listPublicBookingBranches",
  "getPublicBookingOptions",
  "createPublicBookingRequest",
  "getPublicBookingStatus",
  "respondToBookingProposal",
  "submitBookingRating",
  "getBookingRating",
  "getBarberRatings"
]);

function isPublicAction(action) {
  return PUBLIC_ACTIONS.indexOf(String(action || "").trim()) !== -1;
}

function doPost(e) {
  try {
    validateCutHubRequestEnvironment();
  } catch (error) {
    return jsonOutput({
      status: "error",
      code: STAGING_CONFIGURATION_ERROR,
      message: STAGING_CONFIGURATION_ERROR
    });
  }

  let data;
  try {
    data = parsePostRequestData(e);
  } catch (error) {
    return jsonOutput({
      status: "error",
      code: "INVALID_JSON_REQUEST",
      message: "The request body must be a valid JSON object."
    });
  }

  if (!isPublicAction(data.action)) {
    const sessionToken = getSessionToken(data);
    let authenticatedUser = null;
    try {
      authenticatedUser = sessionToken ? getAuthenticatedUser(data) : null;
    } catch (error) {
      if (error && /^AUTH01_/.test(String(error.code || ""))) {
        return jsonOutput({
          status: "error",
          code: "AUTHENTICATION_SERVICE_UNAVAILABLE",
          message: "Authentication service is temporarily unavailable."
        });
      }
      return jsonOutput({
        status: "error",
        code: error.code || "AUTHENTICATION_SCHEMA_ERROR",
        message: error.message || "Authentication schema validation failed."
      });
    }
    if (!sessionToken || !authenticatedUser) {
      return jsonOutput({
        status: "error",
        sessionExpired: true,
        authRequired: true,
        message: "Your session has expired. Please sign in again."
      });
    }
  }

  if (data.action === "stagingIdentity") return stagingIdentity();

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

  if (data.action === "getInventoryData") return getInventoryData(data);
  if (data.action === "getSellableProducts") return getSellableProducts(data);
  if (data.action === "saveInventoryItem") return saveInventoryItem(data);
  if (data.action === "deleteInventoryItem") return deleteInventoryItem(data);
  if (data.action === "addInventoryPurchase") return addInventoryPurchase(data);
  if (data.action === "updateInventoryPurchase") return updateInventoryPurchase(data);
  if (data.action === "getServiceRecipes") return getServiceRecipes(data);
  if (data.action === "saveServiceRecipe") return saveServiceRecipe(data);
  if (data.action === "getBarberConsumptionReport") return getBarberConsumptionReport(data);

  if (data.action === "getStaff") return getStaff();
  if (data.action === "saveStaff") return saveStaff(data);

  if (data.action === "getActivityLogs") return getActivityLogs(data);
  if (data.action === "deleteActivityLog") return deleteActivityLog(data);
  if (data.action === "deleteActivityLogs") return deleteActivityLogs(data);

  if ([
    "createAttendanceRecord", "getAttendanceRecords", "updateAttendanceStep",
    "approveAttendanceDeduction", "deleteAttendanceRecord"
  ].includes(data.action)) {
    return jsonOutput({
      status: "error",
      code: "ATTENDANCE_LEGACY_PATH_DISABLED",
      message: "Legacy Attendance API is disabled. Use the reviewed Phase 3 attendance workflow."
    });
  }

  if (typeof StaffPayrollAttendancePhase4 !== "undefined" &&
      StaffPayrollAttendancePhase4.ACTIONS.indexOf(data.action) !== -1) {
    return handleStaffPayrollAttendancePhase4Action(data);
  }

  if (typeof StaffAttendancePhase3 !== "undefined" &&
      StaffAttendancePhase3.ACTIONS.indexOf(data.action) !== -1) {
    return handleStaffAttendancePhase3Action(data);
  }

  if (typeof StaffSchedulingPhase2 !== "undefined" &&
      StaffSchedulingPhase2.ACTIONS.indexOf(data.action) !== -1) {
    return handleStaffSchedulingPhase2Action(data);
  }

  if ([
    "previewBookingAvailabilityMigration", "getBookingAvailabilityFlags",
    "listPublicBookingBranches", "listBookingBranches", "saveBookingBranchHours",
    "saveBookingBranchConfiguration",
    "recoverBookingAvailabilityTransaction",
    "previewBookingNoCheckInTriggerInstallation", "runBookingNoCheckInDetector",
    "createBookingOperationalOverride", "revokeBookingOperationalOverride",
    "listBookingOperationalOverrides", "listBookingAvailabilityConflicts",
    "listBookingAvailabilityAudit",
    "transitionBookingAvailabilityConflict"
  ].includes(data.action)) {
    return handleBookingAvailabilityPhase5Action(data);
  }

  if (data.action === "getPublicBookingOptions") return getPublicBookingOptions(data);
  if (data.action === "createPublicBookingRequest") return createPublicBookingRequest(data);
  if (data.action === "getPublicBookingStatus") return getPublicBookingStatus(data);
  if (data.action === "respondToBookingProposal") return respondToBookingProposal(data);
  if (data.action === "createBooking") return createBookingV2(data);
  if (data.action === "getBookings") return getBookingsV2(data);
  if (data.action === "updateBooking") return updateBookingV2(data);
  if (data.action === "deleteBooking") return deleteBooking(data);
  if (data.action === "submitBookingRating") return submitBookingRating(data);
  if (data.action === "getBookingRating") return getBookingRating(data);
  if (data.action === "getBarberRatings") return getBarberRatings(data);
  if (data.action === "getRatingsAdmin") return getRatingsAdmin(data);
  if (data.action === "updateRatingStatus") return updateRatingStatus(data);

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
  "attendance.view",
  "attendance.self_action",
  "attendance.manage",
  "attendance.correct",
  "attendance.approve_adjustment",
  "attendance.approve_overtime",
  "schedule.view",
  "schedule.manage",
  "leave.request",
  "leave.approve",
  "payroll_attendance.view",
  "payroll_attendance.calculate",
  "payroll_attendance.review",
  "payroll_attendance.approve",
  "payroll_attendance.lock",
  "payroll_attendance.reopen",
  "payroll_attendance.adjust",
  "payroll_attendance.export",
  "view_bookings",
  "create_bookings",
  "manage_bookings",
  "delete_bookings",
  "booking_availability.view",
  "booking_availability.view_operational",
  "booking_availability.view_restrictions",
  "booking_availability.manage_override",
  "booking_availability.resolve_conflict",
  "booking_availability.override_internal",
  "booking_availability.view_audit",
  "view_ratings",
  "manage_ratings",
  "manage_users"
];

const SESSION_TTL_SECONDS = 12 * 60 * 60;
const SESSION_CACHE_MAX_SECONDS = 6 * 60 * 60;
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

function auth01RequestCorrelationId(data) {
  const value = String(data && data.authRequestId || "").trim();
  return value.length >= 8 && value.length <= 128 &&
    /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value) ? value : "";
}

function auth01CorrelatedJsonOutput(payload, authRequestId) {
  const response = Object.assign({}, payload || {});
  if (authRequestId) response.authRequestId = authRequestId;
  return jsonOutput(response);
}

function isValidSessionToken(token) {
  const value = String(token || "").trim();
  return value.length > 0 && value.length <= 256 && /^[A-Za-z0-9._:-]+$/.test(value);
}

function removeSessionCacheBestEffort(sessionKey) {
  try {
    CacheService.getScriptCache().remove(sessionKey);
    return { attempted: true, failed: false };
  } catch (error) {
    return { attempted: true, failed: true };
  }
}

function createSessionForUser(user) {
  cleanupExpiredSessions();
  const token = `${Utilities.getUuid()}-${Utilities.getUuid()}`;
  const credentialEpoch = auth01ReadCredentialEpoch(user.username);
  const identifierKeyFingerprint = auth01CurrentIdentifierFingerprint();
  const session = {
    username: user.username,
    credentialEpoch,
    identifierKeyFingerprint,
    createdAt: getCairoDateTime(),
    expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString()
  };
  const serializedSession = JSON.stringify(session);

  PropertiesService.getScriptProperties().setProperty(SESSION_CACHE_PREFIX + token, serializedSession);
  try {
    CacheService
      .getScriptCache()
      .put(SESSION_CACHE_PREFIX + token, serializedSession, SESSION_CACHE_MAX_SECONDS);
  } catch (error) {
    // Cache is acceleration only; the authoritative property was committed.
  }

  return { token, expiresAt: session.expiresAt };
}

function cleanupExpiredSessions() {
  const properties = PropertiesService.getScriptProperties();
  const sessions = properties.getProperties();
  const now = Date.now();

  Object.keys(sessions).forEach((key) => {
    if (key.indexOf(SESSION_CACHE_PREFIX) !== 0) return;
    try {
      const session = JSON.parse(sessions[key]);
      if (Date.parse(session.expiresAt || "") > now) return;
    } catch (error) {
      // Invalid session records are removed below.
    }
    properties.deleteProperty(key);
    removeSessionCacheBestEffort(key);
  });
}

function readSessionRecord(token) {
  if (!isValidSessionToken(token)) return null;

  const sessionKey = SESSION_CACHE_PREFIX + token;
  let properties;
  let raw;

  try {
    properties = PropertiesService.getScriptProperties();
    // Script Properties is authoritative. A positive cache entry can never
    // resurrect a session whose durable property is absent.
    raw = properties.getProperty(sessionKey);
  } catch (error) {
    return null;
  }

  if (!raw) {
    removeSessionCacheBestEffort(sessionKey);
    return null;
  }

  try {
    const session = JSON.parse(raw);
    const expiresAt = Date.parse(session.expiresAt || "");
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      try { properties.deleteProperty(sessionKey); } catch (error) {}
      removeSessionCacheBestEffort(sessionKey);
      return null;
    }

    const remainingSeconds = Math.max(1, Math.floor((expiresAt - Date.now()) / 1000));
    try {
      CacheService.getScriptCache().put(
        sessionKey,
        raw,
        Math.min(remainingSeconds, SESSION_CACHE_MAX_SECONDS)
      );
    } catch (error) {
      // Cache is acceleration only; authoritative validation already passed.
    }
    return session;
  } catch (error) {
    try { properties.deleteProperty(sessionKey); } catch (deleteError) {}
    removeSessionCacheBestEffort(sessionKey);
    return null;
  }
}

function revokeSession(token) {
  const normalizedToken = String(token || "").trim();
  if (!isValidSessionToken(normalizedToken)) {
    return {
      ok: false,
      code: "INVALID_SESSION_TOKEN",
      revoked: false,
      alreadyRevoked: false,
      cacheRemovalAttempted: false,
      cacheRemovalFailed: false
    };
  }

  const sessionKey = SESSION_CACHE_PREFIX + normalizedToken;
  let properties;
  try {
    properties = PropertiesService.getScriptProperties();
  } catch (error) {
    return {
      ok: false,
      code: "SESSION_PROPERTY_READ_FAILED",
      revoked: false,
      alreadyRevoked: false,
      cacheRemovalAttempted: false,
      cacheRemovalFailed: false
    };
  }
  let existing;

  try {
    existing = properties.getProperty(sessionKey);
  } catch (error) {
    return {
      ok: false,
      code: "SESSION_PROPERTY_READ_FAILED",
      revoked: false,
      alreadyRevoked: false,
      cacheRemovalAttempted: false,
      cacheRemovalFailed: false
    };
  }

  if (existing == null) {
    const cacheResult = removeSessionCacheBestEffort(sessionKey);
    return {
      ok: true,
      revoked: true,
      alreadyRevoked: true,
      cacheRemovalAttempted: cacheResult.attempted,
      cacheRemovalFailed: cacheResult.failed
    };
  }

  try {
    properties.deleteProperty(sessionKey);
  } catch (error) {
    return {
      ok: false,
      code: "SESSION_PROPERTY_DELETE_FAILED",
      revoked: false,
      alreadyRevoked: false,
      cacheRemovalAttempted: false,
      cacheRemovalFailed: false
    };
  }

  try {
    if (properties.getProperty(sessionKey) != null) {
      return {
        ok: false,
        code: "SESSION_PROPERTY_DELETE_UNVERIFIED",
        revoked: false,
        alreadyRevoked: false,
        cacheRemovalAttempted: false,
        cacheRemovalFailed: false
      };
    }
  } catch (error) {
    return {
      ok: false,
      code: "SESSION_PROPERTY_DELETE_UNVERIFIED",
      revoked: false,
      alreadyRevoked: false,
      cacheRemovalAttempted: false,
      cacheRemovalFailed: false
    };
  }

  const cacheResult = removeSessionCacheBestEffort(sessionKey);
  return {
    ok: true,
    revoked: true,
    alreadyRevoked: false,
    cacheRemovalAttempted: cacheResult.attempted,
    cacheRemovalFailed: cacheResult.failed
  };
}

function deleteSession(token) {
  return revokeSession(token);
}

function getAuthenticatedUser(data) {
  const token = getSessionToken(data || {});
  const session = readSessionRecord(token);
  if (!session || !session.username) return null;

  const sessionUsername = auth01CanonicalUsername(session.username);
  const user = readUsersFromSheet().find(item =>
    auth01CanonicalUsername(item.username) === sessionUsername
  ) || null;
  if (!user) return null;

  const sessionEpoch = session.credentialEpoch == null ? 0 : Number(session.credentialEpoch);
  const currentFingerprint = auth01CurrentIdentifierFingerprint();
  if (typeof session.identifierKeyFingerprint !== "string" ||
      session.identifierKeyFingerprint !== currentFingerprint) {
    deleteSession(token);
    return null;
  }
  const currentEpoch = auth01ReadCredentialEpoch(user.username);
  if (!Number.isSafeInteger(sessionEpoch) || sessionEpoch < 0 || sessionEpoch !== currentEpoch) {
    deleteSession(token);
    return null;
  }
  return user;
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
  const user = getAuthenticatedUser(data || {});
  if (!user) {
    return jsonOutput({
      status: "error",
      sessionExpired: true,
      authRequired: true,
      message: "Your session has expired. Please sign in again."
    });
  }

  const username = String(user.username || "").trim().toLowerCase();
  const permissions = normalizeManagedPermissions(user.username, user.permissions);
  if (username === "owner" || permissions.indexOf(permission) !== -1) {
    return null;
  }

  return jsonOutput({
    status: "error",
    code: "PERMISSION_DENIED",
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

function deleteActivityLogs(data) {
  try {
    const permissionError = requirePermission(data, "manage_users", "Only managers can delete activity logs.");
    if (permissionError) return permissionError;

    const logs = Array.isArray(data.logs) ? data.logs : [];
    if (!logs.length) {
      return jsonOutput({ status: "error", message: "No activity logs selected." });
    }

    const sheet = getActivityLogSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return jsonOutput({ status: "success", deletedCount: 0 });
    }

    const rowsToDelete = [];
    const requestedIds = logs
      .map(log => String(log.logId || log.id || "").trim())
      .filter(id => id && !/^ROW-\d+$/i.test(id) && !/^LOG-\d+$/i.test(id));

    if (requestedIds.length) {
      const idSet = new Set(requestedIds);
      const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      ids.forEach((row, index) => {
        const currentId = String(row[0] || "").trim();
        if (idSet.has(currentId)) rowsToDelete.push(index + 2);
      });
    }

    logs.forEach(log => {
      const rowNumber = Number(log.rowNumber || 0);
      if (rowNumber >= 2 && rowNumber <= lastRow) {
        rowsToDelete.push(rowNumber);
      }
    });

    const sortedRows = [...new Set(rowsToDelete)]
      .filter(row => row >= 2 && row <= lastRow)
      .sort((a, b) => b - a);

    let deletedCount = 0;
    for (let i = 0; i < sortedRows.length; i++) {
      const endRow = sortedRows[i];
      let startRow = endRow;
      while (i + 1 < sortedRows.length && sortedRows[i + 1] === startRow - 1) {
        i++;
        startRow = sortedRows[i];
      }

      const count = endRow - startRow + 1;
      sheet.deleteRows(startRow, count);
      deletedCount += count;
    }

    SpreadsheetApp.flush();
    return jsonOutput({ status: "success", deletedCount });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

const USERS_HEADER_CONTRACT = Object.freeze([
  Object.freeze({ name: "USERNAME", aliases: Object.freeze(["USERNAME"]) }),
  Object.freeze({ name: "PASSWORD", aliases: Object.freeze(["PASSWORD"]) }),
  Object.freeze({ name: "DISPLAY_NAME", aliases: Object.freeze(["DISPLAY_NAME", "DISPLAY NAME"]) }),
  Object.freeze({ name: "PERMISSIONS", aliases: Object.freeze(["PERMISSIONS"]) }),
  Object.freeze({ name: "CREATED_AT", aliases: Object.freeze(["CREATED_AT", "CREATED AT"]) }),
  Object.freeze({ name: "PASSWORD_HASH", aliases: Object.freeze(["PASSWORD_HASH", "PASSWORD HASH"]) })
]);

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

function getUsersSheetReadOnly() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("USERS");
  if (!sheet) {
    throw schemaContractError(
      "USERS_SCHEMA_NOT_READY", "Sheet USERS not found.", { sheetName: "USERS" });
  }
  inspectPositionalSheetSchema(sheet, {
    sheetName: "USERS",
    label: "USERS",
    contract: USERS_HEADER_CONTRACT,
    notReadyCode: "USERS_SCHEMA_NOT_READY",
    incompatibleCode: "USERS_SCHEMA_INCOMPATIBLE",
    duplicateCode: "USERS_SCHEMA_DUPLICATE_HEADERS"
  });
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

function normalizeManagedPermissions(username, permissions) {
  if (String(username || "").trim().toLowerCase() === "owner") {
    return ALL_PERMISSIONS;
  }

  const normalized = (Array.isArray(permissions) ? permissions : [])
    .map(permission => String(permission || "").trim())
    .filter(permission => permission && permission !== "manage_users");
  if (normalized.includes("view_attendance") && !normalized.includes("attendance.view")) {
    normalized.push("attendance.view");
  }
  return normalized;
}

function sanitizeUser(user) {
  return {
    username: user.username,
    displayName: user.displayName,
    permissions: normalizeManagedPermissions(user.username, user.permissions)
  };
}

// AUTH-01 cryptographic primitives implement RFC 8018 PBKDF2 using the
// SHA-256/HMAC construction specified by FIPS 180-4 and RFC 2104. The code is
// deliberately self-contained for the Apps Script V8 runtime and is verified
// by published PBKDF2-HMAC-SHA-256 known-answer vectors in the AUTH-01 suite.
const AUTH01_CREDENTIAL_POLICY = Object.freeze({
  formatVersion: 1,
  algorithm: "pbkdf2-sha256",
  iterations: 600000,
  allowedIterations: Object.freeze([600000]),
  maximumIterations: 1200000,
  saltBytes: 16,
  derivedKeyBytes: 32
});
const AUTH01_IDENTIFIER_KEY_PROPERTY = "AUTH01:IDKEY:v1";
const AUTH01_IDENTIFIER_FINGERPRINT_PROPERTY = "AUTH01:IDKEYFP:v1";
const AUTH01_EPOCH_PREFIX = "AUTH01:EPOCH:v1:";
const AUTH01_MIGRATION_PREFIX = "AUTH01:MIG:v1:";
const AUTH01_MIGRATION_JOURNAL_POLICY = Object.freeze({
  attentionAfterMs: 24 * 60 * 60 * 1000,
  terminalRetentionMs: 7 * 24 * 60 * 60 * 1000,
  earliestValidTimestampMs: Date.UTC(2000, 0, 1),
  maximumInventoryScan: 200,
  inventoryPageSize: 100,
  maximumCleanupBatch: 25,
  maximumTotalJournals: 180,
  maximumUnresolvedJournals: 40,
  maximumRecoveryRequiredJournals: 20,
  maximumSerializedBytes: 2048
});
const AUTH01_MODERN_PREFIX = "cuthub$";
const AUTH01_CREDENTIAL_STATES = Object.freeze({
  MODERN_V1: "MODERN_V1",
  LEGACY_SHA256: "LEGACY_SHA256",
  LEGACY_PLAINTEXT: "LEGACY_PLAINTEXT",
  INVALID: "INVALID",
  EMPTY: "EMPTY"
});
const AUTH01_PLAINTEXT_COMPATIBILITY_DEFAULT = false;
const AUTH01_SHA256_K = Object.freeze([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);

function auth01Error(code, message, details) {
  const error = new Error(message || code);
  error.code = code;
  if (details) error.details = details;
  return error;
}

function auth01CredentialPolicy(options) {
  const override = options && options.testPolicy;
  if (!override) return AUTH01_CREDENTIAL_POLICY;
  return {
    formatVersion: 1,
    algorithm: "pbkdf2-sha256",
    iterations: Number(override.iterations),
    allowedIterations: (override.allowedIterations || [Number(override.iterations)]).slice(),
    maximumIterations: Number(override.maximumIterations || override.iterations),
    saltBytes: 16,
    derivedKeyBytes: 32
  };
}

function auth01NormalizeModernPassword(password) {
  const value = String(password == null ? "" : password);
  return typeof value.normalize === "function" ? value.normalize("NFC") : value;
}

function auth01Utf8Bytes(value) {
  const text = String(value == null ? "" : value);
  const bytes = [];
  for (let index = 0; index < text.length; index++) {
    let point = text.codePointAt(index);
    if (point > 0xffff) index++;
    if (point >= 0xd800 && point <= 0xdfff) point = 0xfffd;
    if (point <= 0x7f) bytes.push(point);
    else if (point <= 0x7ff) {
      bytes.push(0xc0 | (point >>> 6), 0x80 | (point & 0x3f));
    } else if (point <= 0xffff) {
      bytes.push(0xe0 | (point >>> 12), 0x80 | ((point >>> 6) & 0x3f), 0x80 | (point & 0x3f));
    } else {
      bytes.push(
        0xf0 | (point >>> 18), 0x80 | ((point >>> 12) & 0x3f),
        0x80 | ((point >>> 6) & 0x3f), 0x80 | (point & 0x3f)
      );
    }
  }
  return bytes;
}

function auth01RotateRight(value, bits) {
  return (value >>> bits) | (value << (32 - bits));
}

const AUTH01_SHA256_IV = Object.freeze([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
]);
const AUTH01_SHA256_WORDS = new Uint32Array(64);

// SHA-256/HMAC/PBKDF2 structure adapted from @noble/hashes 2.3.0 (MIT),
// pinned npm shasum 505fd39c3134a37e67c8c4e6c6049a496154879c. The compact
// implementation remains self-contained for Apps Script V8 and is checked by
// published PBKDF2-HMAC-SHA-256 known-answer vectors. The SHA-256 round core is
// mechanically unrolled to reduce V8 loop overhead without changing the algorithm.
function auth01Sha256Rounds(hash) {
  const w = AUTH01_SHA256_WORDS;
  { const x=w[1], y=w[14]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[16]=(w[0]+s0+w[9]+s1)>>>0; }
  { const x=w[2], y=w[15]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[17]=(w[1]+s0+w[10]+s1)>>>0; }
  { const x=w[3], y=w[16]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[18]=(w[2]+s0+w[11]+s1)>>>0; }
  { const x=w[4], y=w[17]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[19]=(w[3]+s0+w[12]+s1)>>>0; }
  { const x=w[5], y=w[18]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[20]=(w[4]+s0+w[13]+s1)>>>0; }
  { const x=w[6], y=w[19]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[21]=(w[5]+s0+w[14]+s1)>>>0; }
  { const x=w[7], y=w[20]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[22]=(w[6]+s0+w[15]+s1)>>>0; }
  { const x=w[8], y=w[21]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[23]=(w[7]+s0+w[16]+s1)>>>0; }
  { const x=w[9], y=w[22]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[24]=(w[8]+s0+w[17]+s1)>>>0; }
  { const x=w[10], y=w[23]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[25]=(w[9]+s0+w[18]+s1)>>>0; }
  { const x=w[11], y=w[24]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[26]=(w[10]+s0+w[19]+s1)>>>0; }
  { const x=w[12], y=w[25]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[27]=(w[11]+s0+w[20]+s1)>>>0; }
  { const x=w[13], y=w[26]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[28]=(w[12]+s0+w[21]+s1)>>>0; }
  { const x=w[14], y=w[27]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[29]=(w[13]+s0+w[22]+s1)>>>0; }
  { const x=w[15], y=w[28]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[30]=(w[14]+s0+w[23]+s1)>>>0; }
  { const x=w[16], y=w[29]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[31]=(w[15]+s0+w[24]+s1)>>>0; }
  { const x=w[17], y=w[30]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[32]=(w[16]+s0+w[25]+s1)>>>0; }
  { const x=w[18], y=w[31]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[33]=(w[17]+s0+w[26]+s1)>>>0; }
  { const x=w[19], y=w[32]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[34]=(w[18]+s0+w[27]+s1)>>>0; }
  { const x=w[20], y=w[33]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[35]=(w[19]+s0+w[28]+s1)>>>0; }
  { const x=w[21], y=w[34]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[36]=(w[20]+s0+w[29]+s1)>>>0; }
  { const x=w[22], y=w[35]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[37]=(w[21]+s0+w[30]+s1)>>>0; }
  { const x=w[23], y=w[36]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[38]=(w[22]+s0+w[31]+s1)>>>0; }
  { const x=w[24], y=w[37]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[39]=(w[23]+s0+w[32]+s1)>>>0; }
  { const x=w[25], y=w[38]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[40]=(w[24]+s0+w[33]+s1)>>>0; }
  { const x=w[26], y=w[39]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[41]=(w[25]+s0+w[34]+s1)>>>0; }
  { const x=w[27], y=w[40]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[42]=(w[26]+s0+w[35]+s1)>>>0; }
  { const x=w[28], y=w[41]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[43]=(w[27]+s0+w[36]+s1)>>>0; }
  { const x=w[29], y=w[42]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[44]=(w[28]+s0+w[37]+s1)>>>0; }
  { const x=w[30], y=w[43]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[45]=(w[29]+s0+w[38]+s1)>>>0; }
  { const x=w[31], y=w[44]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[46]=(w[30]+s0+w[39]+s1)>>>0; }
  { const x=w[32], y=w[45]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[47]=(w[31]+s0+w[40]+s1)>>>0; }
  { const x=w[33], y=w[46]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[48]=(w[32]+s0+w[41]+s1)>>>0; }
  { const x=w[34], y=w[47]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[49]=(w[33]+s0+w[42]+s1)>>>0; }
  { const x=w[35], y=w[48]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[50]=(w[34]+s0+w[43]+s1)>>>0; }
  { const x=w[36], y=w[49]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[51]=(w[35]+s0+w[44]+s1)>>>0; }
  { const x=w[37], y=w[50]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[52]=(w[36]+s0+w[45]+s1)>>>0; }
  { const x=w[38], y=w[51]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[53]=(w[37]+s0+w[46]+s1)>>>0; }
  { const x=w[39], y=w[52]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[54]=(w[38]+s0+w[47]+s1)>>>0; }
  { const x=w[40], y=w[53]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[55]=(w[39]+s0+w[48]+s1)>>>0; }
  { const x=w[41], y=w[54]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[56]=(w[40]+s0+w[49]+s1)>>>0; }
  { const x=w[42], y=w[55]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[57]=(w[41]+s0+w[50]+s1)>>>0; }
  { const x=w[43], y=w[56]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[58]=(w[42]+s0+w[51]+s1)>>>0; }
  { const x=w[44], y=w[57]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[59]=(w[43]+s0+w[52]+s1)>>>0; }
  { const x=w[45], y=w[58]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[60]=(w[44]+s0+w[53]+s1)>>>0; }
  { const x=w[46], y=w[59]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[61]=(w[45]+s0+w[54]+s1)>>>0; }
  { const x=w[47], y=w[60]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[62]=(w[46]+s0+w[55]+s1)>>>0; }
  { const x=w[48], y=w[61]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[63]=(w[47]+s0+w[56]+s1)>>>0; }
  let a=hash[0], b=hash[1], c=hash[2], d=hash[3], e=hash[4], f=hash[5], g=hash[6], h=hash[7];
  { const s1=((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)); const ch=(e&f)^(~e&g); const t1=(h+s1+ch+0x428a2f98+w[0])>>>0; const s0=((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10)); const maj=(a&b)^(a&c)^(b&c); d=(d+t1)>>>0; h=(t1+s0+maj)>>>0; }
  { const s1=((d>>>6)|(d<<26))^((d>>>11)|(d<<21))^((d>>>25)|(d<<7)); const ch=(d&e)^(~d&f); const t1=(g+s1+ch+0x71374491+w[1])>>>0; const s0=((h>>>2)|(h<<30))^((h>>>13)|(h<<19))^((h>>>22)|(h<<10)); const maj=(h&a)^(h&b)^(a&b); c=(c+t1)>>>0; g=(t1+s0+maj)>>>0; }
  { const s1=((c>>>6)|(c<<26))^((c>>>11)|(c<<21))^((c>>>25)|(c<<7)); const ch=(c&d)^(~c&e); const t1=(f+s1+ch+0xb5c0fbcf+w[2])>>>0; const s0=((g>>>2)|(g<<30))^((g>>>13)|(g<<19))^((g>>>22)|(g<<10)); const maj=(g&h)^(g&a)^(h&a); b=(b+t1)>>>0; f=(t1+s0+maj)>>>0; }
  { const s1=((b>>>6)|(b<<26))^((b>>>11)|(b<<21))^((b>>>25)|(b<<7)); const ch=(b&c)^(~b&d); const t1=(e+s1+ch+0xe9b5dba5+w[3])>>>0; const s0=((f>>>2)|(f<<30))^((f>>>13)|(f<<19))^((f>>>22)|(f<<10)); const maj=(f&g)^(f&h)^(g&h); a=(a+t1)>>>0; e=(t1+s0+maj)>>>0; }
  { const s1=((a>>>6)|(a<<26))^((a>>>11)|(a<<21))^((a>>>25)|(a<<7)); const ch=(a&b)^(~a&c); const t1=(d+s1+ch+0x3956c25b+w[4])>>>0; const s0=((e>>>2)|(e<<30))^((e>>>13)|(e<<19))^((e>>>22)|(e<<10)); const maj=(e&f)^(e&g)^(f&g); h=(h+t1)>>>0; d=(t1+s0+maj)>>>0; }
  { const s1=((h>>>6)|(h<<26))^((h>>>11)|(h<<21))^((h>>>25)|(h<<7)); const ch=(h&a)^(~h&b); const t1=(c+s1+ch+0x59f111f1+w[5])>>>0; const s0=((d>>>2)|(d<<30))^((d>>>13)|(d<<19))^((d>>>22)|(d<<10)); const maj=(d&e)^(d&f)^(e&f); g=(g+t1)>>>0; c=(t1+s0+maj)>>>0; }
  { const s1=((g>>>6)|(g<<26))^((g>>>11)|(g<<21))^((g>>>25)|(g<<7)); const ch=(g&h)^(~g&a); const t1=(b+s1+ch+0x923f82a4+w[6])>>>0; const s0=((c>>>2)|(c<<30))^((c>>>13)|(c<<19))^((c>>>22)|(c<<10)); const maj=(c&d)^(c&e)^(d&e); f=(f+t1)>>>0; b=(t1+s0+maj)>>>0; }
  { const s1=((f>>>6)|(f<<26))^((f>>>11)|(f<<21))^((f>>>25)|(f<<7)); const ch=(f&g)^(~f&h); const t1=(a+s1+ch+0xab1c5ed5+w[7])>>>0; const s0=((b>>>2)|(b<<30))^((b>>>13)|(b<<19))^((b>>>22)|(b<<10)); const maj=(b&c)^(b&d)^(c&d); e=(e+t1)>>>0; a=(t1+s0+maj)>>>0; }
  { const s1=((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)); const ch=(e&f)^(~e&g); const t1=(h+s1+ch+0xd807aa98+w[8])>>>0; const s0=((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10)); const maj=(a&b)^(a&c)^(b&c); d=(d+t1)>>>0; h=(t1+s0+maj)>>>0; }
  { const s1=((d>>>6)|(d<<26))^((d>>>11)|(d<<21))^((d>>>25)|(d<<7)); const ch=(d&e)^(~d&f); const t1=(g+s1+ch+0x12835b01+w[9])>>>0; const s0=((h>>>2)|(h<<30))^((h>>>13)|(h<<19))^((h>>>22)|(h<<10)); const maj=(h&a)^(h&b)^(a&b); c=(c+t1)>>>0; g=(t1+s0+maj)>>>0; }
  { const s1=((c>>>6)|(c<<26))^((c>>>11)|(c<<21))^((c>>>25)|(c<<7)); const ch=(c&d)^(~c&e); const t1=(f+s1+ch+0x243185be+w[10])>>>0; const s0=((g>>>2)|(g<<30))^((g>>>13)|(g<<19))^((g>>>22)|(g<<10)); const maj=(g&h)^(g&a)^(h&a); b=(b+t1)>>>0; f=(t1+s0+maj)>>>0; }
  { const s1=((b>>>6)|(b<<26))^((b>>>11)|(b<<21))^((b>>>25)|(b<<7)); const ch=(b&c)^(~b&d); const t1=(e+s1+ch+0x550c7dc3+w[11])>>>0; const s0=((f>>>2)|(f<<30))^((f>>>13)|(f<<19))^((f>>>22)|(f<<10)); const maj=(f&g)^(f&h)^(g&h); a=(a+t1)>>>0; e=(t1+s0+maj)>>>0; }
  { const s1=((a>>>6)|(a<<26))^((a>>>11)|(a<<21))^((a>>>25)|(a<<7)); const ch=(a&b)^(~a&c); const t1=(d+s1+ch+0x72be5d74+w[12])>>>0; const s0=((e>>>2)|(e<<30))^((e>>>13)|(e<<19))^((e>>>22)|(e<<10)); const maj=(e&f)^(e&g)^(f&g); h=(h+t1)>>>0; d=(t1+s0+maj)>>>0; }
  { const s1=((h>>>6)|(h<<26))^((h>>>11)|(h<<21))^((h>>>25)|(h<<7)); const ch=(h&a)^(~h&b); const t1=(c+s1+ch+0x80deb1fe+w[13])>>>0; const s0=((d>>>2)|(d<<30))^((d>>>13)|(d<<19))^((d>>>22)|(d<<10)); const maj=(d&e)^(d&f)^(e&f); g=(g+t1)>>>0; c=(t1+s0+maj)>>>0; }
  { const s1=((g>>>6)|(g<<26))^((g>>>11)|(g<<21))^((g>>>25)|(g<<7)); const ch=(g&h)^(~g&a); const t1=(b+s1+ch+0x9bdc06a7+w[14])>>>0; const s0=((c>>>2)|(c<<30))^((c>>>13)|(c<<19))^((c>>>22)|(c<<10)); const maj=(c&d)^(c&e)^(d&e); f=(f+t1)>>>0; b=(t1+s0+maj)>>>0; }
  { const s1=((f>>>6)|(f<<26))^((f>>>11)|(f<<21))^((f>>>25)|(f<<7)); const ch=(f&g)^(~f&h); const t1=(a+s1+ch+0xc19bf174+w[15])>>>0; const s0=((b>>>2)|(b<<30))^((b>>>13)|(b<<19))^((b>>>22)|(b<<10)); const maj=(b&c)^(b&d)^(c&d); e=(e+t1)>>>0; a=(t1+s0+maj)>>>0; }
  { const s1=((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)); const ch=(e&f)^(~e&g); const t1=(h+s1+ch+0xe49b69c1+w[16])>>>0; const s0=((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10)); const maj=(a&b)^(a&c)^(b&c); d=(d+t1)>>>0; h=(t1+s0+maj)>>>0; }
  { const s1=((d>>>6)|(d<<26))^((d>>>11)|(d<<21))^((d>>>25)|(d<<7)); const ch=(d&e)^(~d&f); const t1=(g+s1+ch+0xefbe4786+w[17])>>>0; const s0=((h>>>2)|(h<<30))^((h>>>13)|(h<<19))^((h>>>22)|(h<<10)); const maj=(h&a)^(h&b)^(a&b); c=(c+t1)>>>0; g=(t1+s0+maj)>>>0; }
  { const s1=((c>>>6)|(c<<26))^((c>>>11)|(c<<21))^((c>>>25)|(c<<7)); const ch=(c&d)^(~c&e); const t1=(f+s1+ch+0x0fc19dc6+w[18])>>>0; const s0=((g>>>2)|(g<<30))^((g>>>13)|(g<<19))^((g>>>22)|(g<<10)); const maj=(g&h)^(g&a)^(h&a); b=(b+t1)>>>0; f=(t1+s0+maj)>>>0; }
  { const s1=((b>>>6)|(b<<26))^((b>>>11)|(b<<21))^((b>>>25)|(b<<7)); const ch=(b&c)^(~b&d); const t1=(e+s1+ch+0x240ca1cc+w[19])>>>0; const s0=((f>>>2)|(f<<30))^((f>>>13)|(f<<19))^((f>>>22)|(f<<10)); const maj=(f&g)^(f&h)^(g&h); a=(a+t1)>>>0; e=(t1+s0+maj)>>>0; }
  { const s1=((a>>>6)|(a<<26))^((a>>>11)|(a<<21))^((a>>>25)|(a<<7)); const ch=(a&b)^(~a&c); const t1=(d+s1+ch+0x2de92c6f+w[20])>>>0; const s0=((e>>>2)|(e<<30))^((e>>>13)|(e<<19))^((e>>>22)|(e<<10)); const maj=(e&f)^(e&g)^(f&g); h=(h+t1)>>>0; d=(t1+s0+maj)>>>0; }
  { const s1=((h>>>6)|(h<<26))^((h>>>11)|(h<<21))^((h>>>25)|(h<<7)); const ch=(h&a)^(~h&b); const t1=(c+s1+ch+0x4a7484aa+w[21])>>>0; const s0=((d>>>2)|(d<<30))^((d>>>13)|(d<<19))^((d>>>22)|(d<<10)); const maj=(d&e)^(d&f)^(e&f); g=(g+t1)>>>0; c=(t1+s0+maj)>>>0; }
  { const s1=((g>>>6)|(g<<26))^((g>>>11)|(g<<21))^((g>>>25)|(g<<7)); const ch=(g&h)^(~g&a); const t1=(b+s1+ch+0x5cb0a9dc+w[22])>>>0; const s0=((c>>>2)|(c<<30))^((c>>>13)|(c<<19))^((c>>>22)|(c<<10)); const maj=(c&d)^(c&e)^(d&e); f=(f+t1)>>>0; b=(t1+s0+maj)>>>0; }
  { const s1=((f>>>6)|(f<<26))^((f>>>11)|(f<<21))^((f>>>25)|(f<<7)); const ch=(f&g)^(~f&h); const t1=(a+s1+ch+0x76f988da+w[23])>>>0; const s0=((b>>>2)|(b<<30))^((b>>>13)|(b<<19))^((b>>>22)|(b<<10)); const maj=(b&c)^(b&d)^(c&d); e=(e+t1)>>>0; a=(t1+s0+maj)>>>0; }
  { const s1=((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)); const ch=(e&f)^(~e&g); const t1=(h+s1+ch+0x983e5152+w[24])>>>0; const s0=((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10)); const maj=(a&b)^(a&c)^(b&c); d=(d+t1)>>>0; h=(t1+s0+maj)>>>0; }
  { const s1=((d>>>6)|(d<<26))^((d>>>11)|(d<<21))^((d>>>25)|(d<<7)); const ch=(d&e)^(~d&f); const t1=(g+s1+ch+0xa831c66d+w[25])>>>0; const s0=((h>>>2)|(h<<30))^((h>>>13)|(h<<19))^((h>>>22)|(h<<10)); const maj=(h&a)^(h&b)^(a&b); c=(c+t1)>>>0; g=(t1+s0+maj)>>>0; }
  { const s1=((c>>>6)|(c<<26))^((c>>>11)|(c<<21))^((c>>>25)|(c<<7)); const ch=(c&d)^(~c&e); const t1=(f+s1+ch+0xb00327c8+w[26])>>>0; const s0=((g>>>2)|(g<<30))^((g>>>13)|(g<<19))^((g>>>22)|(g<<10)); const maj=(g&h)^(g&a)^(h&a); b=(b+t1)>>>0; f=(t1+s0+maj)>>>0; }
  { const s1=((b>>>6)|(b<<26))^((b>>>11)|(b<<21))^((b>>>25)|(b<<7)); const ch=(b&c)^(~b&d); const t1=(e+s1+ch+0xbf597fc7+w[27])>>>0; const s0=((f>>>2)|(f<<30))^((f>>>13)|(f<<19))^((f>>>22)|(f<<10)); const maj=(f&g)^(f&h)^(g&h); a=(a+t1)>>>0; e=(t1+s0+maj)>>>0; }
  { const s1=((a>>>6)|(a<<26))^((a>>>11)|(a<<21))^((a>>>25)|(a<<7)); const ch=(a&b)^(~a&c); const t1=(d+s1+ch+0xc6e00bf3+w[28])>>>0; const s0=((e>>>2)|(e<<30))^((e>>>13)|(e<<19))^((e>>>22)|(e<<10)); const maj=(e&f)^(e&g)^(f&g); h=(h+t1)>>>0; d=(t1+s0+maj)>>>0; }
  { const s1=((h>>>6)|(h<<26))^((h>>>11)|(h<<21))^((h>>>25)|(h<<7)); const ch=(h&a)^(~h&b); const t1=(c+s1+ch+0xd5a79147+w[29])>>>0; const s0=((d>>>2)|(d<<30))^((d>>>13)|(d<<19))^((d>>>22)|(d<<10)); const maj=(d&e)^(d&f)^(e&f); g=(g+t1)>>>0; c=(t1+s0+maj)>>>0; }
  { const s1=((g>>>6)|(g<<26))^((g>>>11)|(g<<21))^((g>>>25)|(g<<7)); const ch=(g&h)^(~g&a); const t1=(b+s1+ch+0x06ca6351+w[30])>>>0; const s0=((c>>>2)|(c<<30))^((c>>>13)|(c<<19))^((c>>>22)|(c<<10)); const maj=(c&d)^(c&e)^(d&e); f=(f+t1)>>>0; b=(t1+s0+maj)>>>0; }
  { const s1=((f>>>6)|(f<<26))^((f>>>11)|(f<<21))^((f>>>25)|(f<<7)); const ch=(f&g)^(~f&h); const t1=(a+s1+ch+0x14292967+w[31])>>>0; const s0=((b>>>2)|(b<<30))^((b>>>13)|(b<<19))^((b>>>22)|(b<<10)); const maj=(b&c)^(b&d)^(c&d); e=(e+t1)>>>0; a=(t1+s0+maj)>>>0; }
  { const s1=((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)); const ch=(e&f)^(~e&g); const t1=(h+s1+ch+0x27b70a85+w[32])>>>0; const s0=((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10)); const maj=(a&b)^(a&c)^(b&c); d=(d+t1)>>>0; h=(t1+s0+maj)>>>0; }
  { const s1=((d>>>6)|(d<<26))^((d>>>11)|(d<<21))^((d>>>25)|(d<<7)); const ch=(d&e)^(~d&f); const t1=(g+s1+ch+0x2e1b2138+w[33])>>>0; const s0=((h>>>2)|(h<<30))^((h>>>13)|(h<<19))^((h>>>22)|(h<<10)); const maj=(h&a)^(h&b)^(a&b); c=(c+t1)>>>0; g=(t1+s0+maj)>>>0; }
  { const s1=((c>>>6)|(c<<26))^((c>>>11)|(c<<21))^((c>>>25)|(c<<7)); const ch=(c&d)^(~c&e); const t1=(f+s1+ch+0x4d2c6dfc+w[34])>>>0; const s0=((g>>>2)|(g<<30))^((g>>>13)|(g<<19))^((g>>>22)|(g<<10)); const maj=(g&h)^(g&a)^(h&a); b=(b+t1)>>>0; f=(t1+s0+maj)>>>0; }
  { const s1=((b>>>6)|(b<<26))^((b>>>11)|(b<<21))^((b>>>25)|(b<<7)); const ch=(b&c)^(~b&d); const t1=(e+s1+ch+0x53380d13+w[35])>>>0; const s0=((f>>>2)|(f<<30))^((f>>>13)|(f<<19))^((f>>>22)|(f<<10)); const maj=(f&g)^(f&h)^(g&h); a=(a+t1)>>>0; e=(t1+s0+maj)>>>0; }
  { const s1=((a>>>6)|(a<<26))^((a>>>11)|(a<<21))^((a>>>25)|(a<<7)); const ch=(a&b)^(~a&c); const t1=(d+s1+ch+0x650a7354+w[36])>>>0; const s0=((e>>>2)|(e<<30))^((e>>>13)|(e<<19))^((e>>>22)|(e<<10)); const maj=(e&f)^(e&g)^(f&g); h=(h+t1)>>>0; d=(t1+s0+maj)>>>0; }
  { const s1=((h>>>6)|(h<<26))^((h>>>11)|(h<<21))^((h>>>25)|(h<<7)); const ch=(h&a)^(~h&b); const t1=(c+s1+ch+0x766a0abb+w[37])>>>0; const s0=((d>>>2)|(d<<30))^((d>>>13)|(d<<19))^((d>>>22)|(d<<10)); const maj=(d&e)^(d&f)^(e&f); g=(g+t1)>>>0; c=(t1+s0+maj)>>>0; }
  { const s1=((g>>>6)|(g<<26))^((g>>>11)|(g<<21))^((g>>>25)|(g<<7)); const ch=(g&h)^(~g&a); const t1=(b+s1+ch+0x81c2c92e+w[38])>>>0; const s0=((c>>>2)|(c<<30))^((c>>>13)|(c<<19))^((c>>>22)|(c<<10)); const maj=(c&d)^(c&e)^(d&e); f=(f+t1)>>>0; b=(t1+s0+maj)>>>0; }
  { const s1=((f>>>6)|(f<<26))^((f>>>11)|(f<<21))^((f>>>25)|(f<<7)); const ch=(f&g)^(~f&h); const t1=(a+s1+ch+0x92722c85+w[39])>>>0; const s0=((b>>>2)|(b<<30))^((b>>>13)|(b<<19))^((b>>>22)|(b<<10)); const maj=(b&c)^(b&d)^(c&d); e=(e+t1)>>>0; a=(t1+s0+maj)>>>0; }
  { const s1=((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)); const ch=(e&f)^(~e&g); const t1=(h+s1+ch+0xa2bfe8a1+w[40])>>>0; const s0=((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10)); const maj=(a&b)^(a&c)^(b&c); d=(d+t1)>>>0; h=(t1+s0+maj)>>>0; }
  { const s1=((d>>>6)|(d<<26))^((d>>>11)|(d<<21))^((d>>>25)|(d<<7)); const ch=(d&e)^(~d&f); const t1=(g+s1+ch+0xa81a664b+w[41])>>>0; const s0=((h>>>2)|(h<<30))^((h>>>13)|(h<<19))^((h>>>22)|(h<<10)); const maj=(h&a)^(h&b)^(a&b); c=(c+t1)>>>0; g=(t1+s0+maj)>>>0; }
  { const s1=((c>>>6)|(c<<26))^((c>>>11)|(c<<21))^((c>>>25)|(c<<7)); const ch=(c&d)^(~c&e); const t1=(f+s1+ch+0xc24b8b70+w[42])>>>0; const s0=((g>>>2)|(g<<30))^((g>>>13)|(g<<19))^((g>>>22)|(g<<10)); const maj=(g&h)^(g&a)^(h&a); b=(b+t1)>>>0; f=(t1+s0+maj)>>>0; }
  { const s1=((b>>>6)|(b<<26))^((b>>>11)|(b<<21))^((b>>>25)|(b<<7)); const ch=(b&c)^(~b&d); const t1=(e+s1+ch+0xc76c51a3+w[43])>>>0; const s0=((f>>>2)|(f<<30))^((f>>>13)|(f<<19))^((f>>>22)|(f<<10)); const maj=(f&g)^(f&h)^(g&h); a=(a+t1)>>>0; e=(t1+s0+maj)>>>0; }
  { const s1=((a>>>6)|(a<<26))^((a>>>11)|(a<<21))^((a>>>25)|(a<<7)); const ch=(a&b)^(~a&c); const t1=(d+s1+ch+0xd192e819+w[44])>>>0; const s0=((e>>>2)|(e<<30))^((e>>>13)|(e<<19))^((e>>>22)|(e<<10)); const maj=(e&f)^(e&g)^(f&g); h=(h+t1)>>>0; d=(t1+s0+maj)>>>0; }
  { const s1=((h>>>6)|(h<<26))^((h>>>11)|(h<<21))^((h>>>25)|(h<<7)); const ch=(h&a)^(~h&b); const t1=(c+s1+ch+0xd6990624+w[45])>>>0; const s0=((d>>>2)|(d<<30))^((d>>>13)|(d<<19))^((d>>>22)|(d<<10)); const maj=(d&e)^(d&f)^(e&f); g=(g+t1)>>>0; c=(t1+s0+maj)>>>0; }
  { const s1=((g>>>6)|(g<<26))^((g>>>11)|(g<<21))^((g>>>25)|(g<<7)); const ch=(g&h)^(~g&a); const t1=(b+s1+ch+0xf40e3585+w[46])>>>0; const s0=((c>>>2)|(c<<30))^((c>>>13)|(c<<19))^((c>>>22)|(c<<10)); const maj=(c&d)^(c&e)^(d&e); f=(f+t1)>>>0; b=(t1+s0+maj)>>>0; }
  { const s1=((f>>>6)|(f<<26))^((f>>>11)|(f<<21))^((f>>>25)|(f<<7)); const ch=(f&g)^(~f&h); const t1=(a+s1+ch+0x106aa070+w[47])>>>0; const s0=((b>>>2)|(b<<30))^((b>>>13)|(b<<19))^((b>>>22)|(b<<10)); const maj=(b&c)^(b&d)^(c&d); e=(e+t1)>>>0; a=(t1+s0+maj)>>>0; }
  { const s1=((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)); const ch=(e&f)^(~e&g); const t1=(h+s1+ch+0x19a4c116+w[48])>>>0; const s0=((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10)); const maj=(a&b)^(a&c)^(b&c); d=(d+t1)>>>0; h=(t1+s0+maj)>>>0; }
  { const s1=((d>>>6)|(d<<26))^((d>>>11)|(d<<21))^((d>>>25)|(d<<7)); const ch=(d&e)^(~d&f); const t1=(g+s1+ch+0x1e376c08+w[49])>>>0; const s0=((h>>>2)|(h<<30))^((h>>>13)|(h<<19))^((h>>>22)|(h<<10)); const maj=(h&a)^(h&b)^(a&b); c=(c+t1)>>>0; g=(t1+s0+maj)>>>0; }
  { const s1=((c>>>6)|(c<<26))^((c>>>11)|(c<<21))^((c>>>25)|(c<<7)); const ch=(c&d)^(~c&e); const t1=(f+s1+ch+0x2748774c+w[50])>>>0; const s0=((g>>>2)|(g<<30))^((g>>>13)|(g<<19))^((g>>>22)|(g<<10)); const maj=(g&h)^(g&a)^(h&a); b=(b+t1)>>>0; f=(t1+s0+maj)>>>0; }
  { const s1=((b>>>6)|(b<<26))^((b>>>11)|(b<<21))^((b>>>25)|(b<<7)); const ch=(b&c)^(~b&d); const t1=(e+s1+ch+0x34b0bcb5+w[51])>>>0; const s0=((f>>>2)|(f<<30))^((f>>>13)|(f<<19))^((f>>>22)|(f<<10)); const maj=(f&g)^(f&h)^(g&h); a=(a+t1)>>>0; e=(t1+s0+maj)>>>0; }
  { const s1=((a>>>6)|(a<<26))^((a>>>11)|(a<<21))^((a>>>25)|(a<<7)); const ch=(a&b)^(~a&c); const t1=(d+s1+ch+0x391c0cb3+w[52])>>>0; const s0=((e>>>2)|(e<<30))^((e>>>13)|(e<<19))^((e>>>22)|(e<<10)); const maj=(e&f)^(e&g)^(f&g); h=(h+t1)>>>0; d=(t1+s0+maj)>>>0; }
  { const s1=((h>>>6)|(h<<26))^((h>>>11)|(h<<21))^((h>>>25)|(h<<7)); const ch=(h&a)^(~h&b); const t1=(c+s1+ch+0x4ed8aa4a+w[53])>>>0; const s0=((d>>>2)|(d<<30))^((d>>>13)|(d<<19))^((d>>>22)|(d<<10)); const maj=(d&e)^(d&f)^(e&f); g=(g+t1)>>>0; c=(t1+s0+maj)>>>0; }
  { const s1=((g>>>6)|(g<<26))^((g>>>11)|(g<<21))^((g>>>25)|(g<<7)); const ch=(g&h)^(~g&a); const t1=(b+s1+ch+0x5b9cca4f+w[54])>>>0; const s0=((c>>>2)|(c<<30))^((c>>>13)|(c<<19))^((c>>>22)|(c<<10)); const maj=(c&d)^(c&e)^(d&e); f=(f+t1)>>>0; b=(t1+s0+maj)>>>0; }
  { const s1=((f>>>6)|(f<<26))^((f>>>11)|(f<<21))^((f>>>25)|(f<<7)); const ch=(f&g)^(~f&h); const t1=(a+s1+ch+0x682e6ff3+w[55])>>>0; const s0=((b>>>2)|(b<<30))^((b>>>13)|(b<<19))^((b>>>22)|(b<<10)); const maj=(b&c)^(b&d)^(c&d); e=(e+t1)>>>0; a=(t1+s0+maj)>>>0; }
  { const s1=((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)); const ch=(e&f)^(~e&g); const t1=(h+s1+ch+0x748f82ee+w[56])>>>0; const s0=((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10)); const maj=(a&b)^(a&c)^(b&c); d=(d+t1)>>>0; h=(t1+s0+maj)>>>0; }
  { const s1=((d>>>6)|(d<<26))^((d>>>11)|(d<<21))^((d>>>25)|(d<<7)); const ch=(d&e)^(~d&f); const t1=(g+s1+ch+0x78a5636f+w[57])>>>0; const s0=((h>>>2)|(h<<30))^((h>>>13)|(h<<19))^((h>>>22)|(h<<10)); const maj=(h&a)^(h&b)^(a&b); c=(c+t1)>>>0; g=(t1+s0+maj)>>>0; }
  { const s1=((c>>>6)|(c<<26))^((c>>>11)|(c<<21))^((c>>>25)|(c<<7)); const ch=(c&d)^(~c&e); const t1=(f+s1+ch+0x84c87814+w[58])>>>0; const s0=((g>>>2)|(g<<30))^((g>>>13)|(g<<19))^((g>>>22)|(g<<10)); const maj=(g&h)^(g&a)^(h&a); b=(b+t1)>>>0; f=(t1+s0+maj)>>>0; }
  { const s1=((b>>>6)|(b<<26))^((b>>>11)|(b<<21))^((b>>>25)|(b<<7)); const ch=(b&c)^(~b&d); const t1=(e+s1+ch+0x8cc70208+w[59])>>>0; const s0=((f>>>2)|(f<<30))^((f>>>13)|(f<<19))^((f>>>22)|(f<<10)); const maj=(f&g)^(f&h)^(g&h); a=(a+t1)>>>0; e=(t1+s0+maj)>>>0; }
  { const s1=((a>>>6)|(a<<26))^((a>>>11)|(a<<21))^((a>>>25)|(a<<7)); const ch=(a&b)^(~a&c); const t1=(d+s1+ch+0x90befffa+w[60])>>>0; const s0=((e>>>2)|(e<<30))^((e>>>13)|(e<<19))^((e>>>22)|(e<<10)); const maj=(e&f)^(e&g)^(f&g); h=(h+t1)>>>0; d=(t1+s0+maj)>>>0; }
  { const s1=((h>>>6)|(h<<26))^((h>>>11)|(h<<21))^((h>>>25)|(h<<7)); const ch=(h&a)^(~h&b); const t1=(c+s1+ch+0xa4506ceb+w[61])>>>0; const s0=((d>>>2)|(d<<30))^((d>>>13)|(d<<19))^((d>>>22)|(d<<10)); const maj=(d&e)^(d&f)^(e&f); g=(g+t1)>>>0; c=(t1+s0+maj)>>>0; }
  { const s1=((g>>>6)|(g<<26))^((g>>>11)|(g<<21))^((g>>>25)|(g<<7)); const ch=(g&h)^(~g&a); const t1=(b+s1+ch+0xbef9a3f7+w[62])>>>0; const s0=((c>>>2)|(c<<30))^((c>>>13)|(c<<19))^((c>>>22)|(c<<10)); const maj=(c&d)^(c&e)^(d&e); f=(f+t1)>>>0; b=(t1+s0+maj)>>>0; }
  { const s1=((f>>>6)|(f<<26))^((f>>>11)|(f<<21))^((f>>>25)|(f<<7)); const ch=(f&g)^(~f&h); const t1=(a+s1+ch+0xc67178f2+w[63])>>>0; const s0=((b>>>2)|(b<<30))^((b>>>13)|(b<<19))^((b>>>22)|(b<<10)); const maj=(b&c)^(b&d)^(c&d); e=(e+t1)>>>0; a=(t1+s0+maj)>>>0; }
  hash[0]=(hash[0]+a)>>>0; hash[1]=(hash[1]+b)>>>0; hash[2]=(hash[2]+c)>>>0; hash[3]=(hash[3]+d)>>>0;
  hash[4]=(hash[4]+e)>>>0; hash[5]=(hash[5]+f)>>>0; hash[6]=(hash[6]+g)>>>0; hash[7]=(hash[7]+h)>>>0;
}

function auth01Sha256Compress(hash, bytes, offset) {
  const words = AUTH01_SHA256_WORDS;
  for (let index = 0; index < 16; index++) {
    const at = offset + index * 4;
    words[index] = (
      (bytes[at] << 24) | (bytes[at + 1] << 16) |
      (bytes[at + 2] << 8) | bytes[at + 3]
    ) >>> 0;
  }
  auth01Sha256Rounds(hash);
}

function auth01Sha256FromState(prefixState, prefixLength, input) {
  const message = Uint8Array.from(input || [], value => Number(value) & 0xff);
  const totalLength = prefixLength + message.length;
  const paddedLength = Math.ceil((message.length + 1 + 8) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(message);
  padded[message.length] = 0x80;
  const bitLength = totalLength * 8;
  const high = Math.floor(bitLength / 0x100000000);
  const low = bitLength >>> 0;
  const at = padded.length - 8;
  padded[at] = (high >>> 24) & 0xff; padded[at + 1] = (high >>> 16) & 0xff;
  padded[at + 2] = (high >>> 8) & 0xff; padded[at + 3] = high & 0xff;
  padded[at + 4] = (low >>> 24) & 0xff; padded[at + 5] = (low >>> 16) & 0xff;
  padded[at + 6] = (low >>> 8) & 0xff; padded[at + 7] = low & 0xff;
  const hash = prefixState.slice();
  for (let offset = 0; offset < padded.length; offset += 64) {
    auth01Sha256Compress(hash, padded, offset);
  }
  return hash;
}

function auth01Sha256StateToBytes(hash) {
  const output = [];
  hash.forEach(word => {
    output.push((word >>> 24) & 0xff, (word >>> 16) & 0xff, (word >>> 8) & 0xff, word & 0xff);
  });
  return output;
}

function auth01Sha256Bytes(input) {
  return auth01Sha256StateToBytes(auth01Sha256FromState(AUTH01_SHA256_IV, 0, input));
}

function auth01PrepareHmacSha256(keyInput) {
  let key = Array.prototype.slice.call(keyInput || []).map(value => Number(value) & 0xff);
  if (key.length > 64) key = auth01Sha256Bytes(key);
  const innerPad = new Uint8Array(64);
  const outerPad = new Uint8Array(64);
  for (let index = 0; index < 64; index++) {
    const value = index < key.length ? key[index] : 0;
    innerPad[index] = value ^ 0x36;
    outerPad[index] = value ^ 0x5c;
  }
  const innerState = AUTH01_SHA256_IV.slice();
  const outerState = AUTH01_SHA256_IV.slice();
  auth01Sha256Compress(innerState, innerPad, 0);
  auth01Sha256Compress(outerState, outerPad, 0);
  const innerBlock = new Uint8Array(64);
  const outerBlock = new Uint8Array(64);
  const innerHashScratch = new Uint32Array(8);
  const outerHashScratch = new Uint32Array(8);

  function digestInto(messageInput, output) {
    const message = messageInput || [];
    if (message.length <= 55) {
      innerBlock.fill(0);
      for (let index = 0; index < message.length; index++) innerBlock[index] = Number(message[index]) & 0xff;
      innerBlock[message.length] = 0x80;
      const innerBits = (64 + message.length) * 8;
      innerBlock[60] = (innerBits >>> 24) & 0xff; innerBlock[61] = (innerBits >>> 16) & 0xff;
      innerBlock[62] = (innerBits >>> 8) & 0xff; innerBlock[63] = innerBits & 0xff;
      for (let index = 0; index < 8; index++) innerHashScratch[index] = innerState[index];
      auth01Sha256Compress(innerHashScratch, innerBlock, 0);

      outerBlock.fill(0);
      for (let index = 0; index < 8; index++) {
        const word = innerHashScratch[index];
        const at = index * 4;
        outerBlock[at] = (word >>> 24) & 0xff; outerBlock[at + 1] = (word >>> 16) & 0xff;
        outerBlock[at + 2] = (word >>> 8) & 0xff; outerBlock[at + 3] = word & 0xff;
      }
      outerBlock[32] = 0x80;
      outerBlock[62] = 0x03;
      outerBlock[63] = 0x00;
      for (let index = 0; index < 8; index++) outerHashScratch[index] = outerState[index];
      auth01Sha256Compress(outerHashScratch, outerBlock, 0);
      for (let index = 0; index < 8; index++) {
        const word = outerHashScratch[index];
        const at = index * 4;
        output[at] = (word >>> 24) & 0xff; output[at + 1] = (word >>> 16) & 0xff;
        output[at + 2] = (word >>> 8) & 0xff; output[at + 3] = word & 0xff;
      }
      return output;
    }
    const innerDigest = auth01Sha256StateToBytes(
      auth01Sha256FromState(innerState, 64, message)
    );
    const result = auth01Sha256StateToBytes(auth01Sha256FromState(outerState, 64, innerDigest));
    for (let index = 0; index < result.length; index++) output[index] = result[index];
    return output;
  }
  // Fast path for PBKDF2 U2..Uc: every message is exactly one 32-byte HMAC output.
  // This preserves HMAC-SHA-256 semantics while avoiding generic message packing
  // in the 599,999 repeated rounds of the 600k runtime policy.
  function digest32Into(message, output) {
    const words = AUTH01_SHA256_WORDS;
    words[0] = ((message[0] << 24) | (message[1] << 16) | (message[2] << 8) | message[3]) >>> 0;
    words[1] = ((message[4] << 24) | (message[5] << 16) | (message[6] << 8) | message[7]) >>> 0;
    words[2] = ((message[8] << 24) | (message[9] << 16) | (message[10] << 8) | message[11]) >>> 0;
    words[3] = ((message[12] << 24) | (message[13] << 16) | (message[14] << 8) | message[15]) >>> 0;
    words[4] = ((message[16] << 24) | (message[17] << 16) | (message[18] << 8) | message[19]) >>> 0;
    words[5] = ((message[20] << 24) | (message[21] << 16) | (message[22] << 8) | message[23]) >>> 0;
    words[6] = ((message[24] << 24) | (message[25] << 16) | (message[26] << 8) | message[27]) >>> 0;
    words[7] = ((message[28] << 24) | (message[29] << 16) | (message[30] << 8) | message[31]) >>> 0;
    words[8] = 0x80000000; words[9] = 0; words[10] = 0; words[11] = 0;
    words[12] = 0; words[13] = 0; words[14] = 0; words[15] = 0x00000300;
    for (let index = 0; index < 8; index++) innerHashScratch[index] = innerState[index];
    auth01Sha256Rounds(innerHashScratch);

    words[0] = innerHashScratch[0]; words[1] = innerHashScratch[1];
    words[2] = innerHashScratch[2]; words[3] = innerHashScratch[3];
    words[4] = innerHashScratch[4]; words[5] = innerHashScratch[5];
    words[6] = innerHashScratch[6]; words[7] = innerHashScratch[7];
    words[8] = 0x80000000; words[9] = 0; words[10] = 0; words[11] = 0;
    words[12] = 0; words[13] = 0; words[14] = 0; words[15] = 0x00000300;
    for (let index = 0; index < 8; index++) outerHashScratch[index] = outerState[index];
    auth01Sha256Rounds(outerHashScratch);

    for (let index = 0; index < 8; index++) {
      const word = outerHashScratch[index];
      const at = index * 4;
      output[at] = (word >>> 24) & 0xff; output[at + 1] = (word >>> 16) & 0xff;
      output[at + 2] = (word >>> 8) & 0xff; output[at + 3] = word & 0xff;
    }
    return output;
  }

  const prepared = function auth01PreparedHmac(messageInput) {
    return Array.from(digestInto(messageInput, new Uint8Array(32)));
  };
  prepared.digestInto = digestInto;
  prepared.digest32Into = digest32Into;
  return prepared;
}

function auth01HmacSha256Bytes(keyInput, messageInput) {
  return auth01PrepareHmacSha256(keyInput)(messageInput);
}

function auth01Pbkdf2HmacSha256(passwordBytes, saltBytes, iterations, derivedKeyLength) {
  const count = Number(iterations);
  const length = Number(derivedKeyLength);
  if (!Number.isSafeInteger(count) || count < 1 || !Number.isSafeInteger(length) || length < 1 || length > 1024) {
    throw auth01Error("AUTH01_KDF_PARAMETERS_INVALID", "PBKDF2 parameters are invalid.");
  }
  const hmac = auth01PrepareHmacSha256(passwordBytes);
  const output = [];
  const salt = Array.prototype.slice.call(saltBytes || []);
  const blocks = Math.ceil(length / 32);
  for (let blockIndex = 1; blockIndex <= blocks; blockIndex++) {
    const block = salt.concat([
      (blockIndex >>> 24) & 0xff, (blockIndex >>> 16) & 0xff,
      (blockIndex >>> 8) & 0xff, blockIndex & 0xff
    ]);
    let current = hmac.digestInto(block, new Uint8Array(32));
    let next = new Uint8Array(32);
    const derived = current.slice();
    for (let round = 1; round < count; round++) {
      hmac.digest32Into(current, next);
      const swap = current; current = next; next = swap;
      for (let index = 0; index < derived.length; index++) derived[index] ^= current[index];
    }
    for (let index = 0; index < derived.length && output.length < length; index++) output.push(derived[index]);
  }
  return output;
}

function auth01SignedBytes(bytes) {
  return Array.prototype.slice.call(bytes || []).map(value => {
    const normalized = Number(value) & 0xff;
    return normalized > 127 ? normalized - 256 : normalized;
  });
}

function auth01Base64UrlEncode(bytes) {
  return String(Utilities.base64EncodeWebSafe(auth01SignedBytes(bytes)) || "").replace(/=+$/g, "");
}

function auth01Base64UrlDecodeCanonical(value) {
  const text = String(value || "");
  if (!text || !/^[A-Za-z0-9_-]+$/.test(text) || /=/.test(text)) return null;
  try {
    const bytes = Array.prototype.slice.call(Utilities.base64DecodeWebSafe(text))
      .map(item => Number(item) & 0xff);
    return auth01Base64UrlEncode(bytes) === text ? bytes : null;
  } catch (error) {
    return null;
  }
}

function auth01BytesToHex(bytes) {
  return Array.prototype.slice.call(bytes || []).map(value => (`0${(Number(value) & 0xff).toString(16)}`).slice(-2)).join("");
}

function auth01HexToBytes(value) {
  const text = String(value || "");
  if (!/^[a-f0-9]+$/.test(text) || text.length % 2) return null;
  const bytes = [];
  for (let index = 0; index < text.length; index += 2) bytes.push(parseInt(text.slice(index, index + 2), 16));
  return bytes;
}

function auth01ConstantTimeEqual(left, right) {
  const a = Array.prototype.slice.call(left || []);
  const b = Array.prototype.slice.call(right || []);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index++) difference |= (Number(a[index]) & 0xff) ^ (Number(b[index]) & 0xff);
  return difference === 0;
}

function auth01GenerateSalt(options) {
  if (options && typeof options.randomBytes === "function") {
    const injected = Array.prototype.slice.call(options.randomBytes(16) || []);
    if (injected.length !== 16) throw auth01Error("AUTH01_SALT_GENERATION_FAILED", "Injected salt must be 16 bytes.");
    return injected.map(value => Number(value) & 0xff);
  }
  const material = `${Utilities.getUuid()}|${Utilities.getUuid()}`;
  return auth01Sha256Bytes(auth01Utf8Bytes(material)).slice(0, 16);
}

function auth01EncodeModernCredential(iterations, salt, verifier) {
  return `cuthub$1$pbkdf2-sha256$i=${iterations},l=32$${auth01Base64UrlEncode(salt)}$${auth01Base64UrlEncode(verifier)}`;
}

function auth01ParseModernCredential(value, options) {
  const text = String(value || "");
  if (text.length > 256) return null;
  const parts = text.split("$");
  if (parts.length !== 6 || parts[0] !== "cuthub" || parts[1] !== "1" || parts[2] !== "pbkdf2-sha256") return null;
  const parameterMatch = /^i=([1-9][0-9]*),l=32$/.exec(parts[3]);
  if (!parameterMatch) return null;
  const iterations = Number(parameterMatch[1]);
  const policy = auth01CredentialPolicy(options);
  if (!Number.isSafeInteger(iterations) || iterations > policy.maximumIterations ||
      policy.allowedIterations.indexOf(iterations) === -1) return null;
  const salt = auth01Base64UrlDecodeCanonical(parts[4]);
  const verifier = auth01Base64UrlDecodeCanonical(parts[5]);
  if (!salt || salt.length !== 16 || !verifier || verifier.length !== 32) return null;
  const canonical = auth01EncodeModernCredential(iterations, salt, verifier);
  if (canonical !== text) return null;
  return { version: 1, algorithm: "pbkdf2-sha256", iterations, length: 32, salt, verifier, encoded: text };
}

function createModernCredential(password, options) {
  const policy = auth01CredentialPolicy(options);
  if (policy.allowedIterations.indexOf(policy.iterations) === -1 || policy.iterations > policy.maximumIterations) {
    throw auth01Error("AUTH01_KDF_POLICY_INVALID", "The credential policy is invalid.");
  }
  const salt = auth01GenerateSalt(options);
  const passwordBytes = auth01Utf8Bytes(auth01NormalizeModernPassword(password));
  const verifier = auth01Pbkdf2HmacSha256(passwordBytes, salt, policy.iterations, 32);
  return auth01EncodeModernCredential(policy.iterations, salt, verifier);
}

function auth01ClassifyCredential(user, options) {
  const password = String(user && user.password != null ? user.password : "");
  const passwordHash = String(user && user.passwordHash != null ? user.passwordHash : "").trim();
  const plaintextResidue = !!password && !!passwordHash;
  const modern = passwordHash ? auth01ParseModernCredential(passwordHash, options) : null;
  let state = AUTH01_CREDENTIAL_STATES.EMPTY;
  if (modern) state = AUTH01_CREDENTIAL_STATES.MODERN_V1;
  else if (/^[a-f0-9]{64}$/.test(passwordHash)) state = AUTH01_CREDENTIAL_STATES.LEGACY_SHA256;
  else if (passwordHash) state = AUTH01_CREDENTIAL_STATES.INVALID;
  else if (password) state = AUTH01_CREDENTIAL_STATES.LEGACY_PLAINTEXT;
  return { state, plaintextResidue, modern, passwordHashPresent: !!passwordHash, passwordPresent: !!password };
}

function hashPassword(password) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(password || ""),
    Utilities.Charset.UTF_8
  );
  return auth01BytesToHex(digest);
}

function auth01VerifyCredential(user, password, options) {
  const classification = auth01ClassifyCredential(user, options);
  const plainPassword = String(password || "");
  if (classification.state === AUTH01_CREDENTIAL_STATES.MODERN_V1) {
    const parsed = classification.modern;
    const candidate = auth01Pbkdf2HmacSha256(
      auth01Utf8Bytes(auth01NormalizeModernPassword(password)), parsed.salt,
      parsed.iterations, parsed.length
    );
    return { ok: auth01ConstantTimeEqual(candidate, parsed.verifier), state: classification.state, classification };
  }
  if (classification.state === AUTH01_CREDENTIAL_STATES.LEGACY_SHA256) {
    const stored = auth01HexToBytes(String(user.passwordHash || "").trim());
    const candidate = auth01HexToBytes(hashPassword(plainPassword));
    return {
      ok: !!stored && !!candidate && auth01ConstantTimeEqual(stored, candidate),
      state: classification.state,
      classification,
      migrationEligible: true
    };
  }
  if (classification.state === AUTH01_CREDENTIAL_STATES.LEGACY_PLAINTEXT) {
    const allowed = !!(options && options.allowLegacyPlaintext);
    const storedDigest = auth01Sha256Bytes(auth01Utf8Bytes(String(user.password || "")));
    const candidateDigest = auth01Sha256Bytes(auth01Utf8Bytes(plainPassword));
    return {
      ok: allowed && auth01ConstantTimeEqual(storedDigest, candidateDigest),
      state: classification.state,
      classification,
      migrationEligible: allowed
    };
  }
  return { ok: false, state: classification.state, classification, migrationEligible: false };
}

function auth01RunDummyModernVerification(password, options) {
  const parsed = auth01ParseModernCredential(auth01DummyModernCredential(options), options);
  const candidate = auth01Pbkdf2HmacSha256(
    auth01Utf8Bytes(auth01NormalizeModernPassword(password)), parsed.salt,
    parsed.iterations, parsed.length
  );
  auth01ConstantTimeEqual(candidate, parsed.verifier);
}

function verifyPassword(user, password) {
  return auth01VerifyCredential(user, password, {
    allowLegacyPlaintext: AUTH01_PLAINTEXT_COMPATIBILITY_DEFAULT
  }).ok;
}

function auth01CanonicalUsername(username) {
  const value = String(username == null ? "" : username).trim();
  const normalized = typeof value.normalize === "function" ? value.normalize("NFC") : value;
  return normalized.toLowerCase();
}

function auth01FindCanonicalUsernameCollisions(users) {
  const seen = {};
  const collisions = [];
  (users || []).forEach(user => {
    const stored = String(user && user.username != null ? user.username : "");
    const canonical = auth01CanonicalUsername(stored);
    if (!canonical) return;
    if (Object.prototype.hasOwnProperty.call(seen, canonical) && seen[canonical] !== stored) {
      collisions.push({ canonical, usernames: [seen[canonical], stored] });
    } else {
      seen[canonical] = stored;
    }
  });
  return collisions;
}

function auth01GenerateIdentifierKey(options) {
  if (options && typeof options.randomBytes === "function") {
    const bytes = Array.prototype.slice.call(options.randomBytes(32) || []);
    if (bytes.length !== 32) throw auth01Error("AUTH01_IDENTIFIER_KEY_INVALID", "Identifier key must be 32 bytes.");
    return auth01Base64UrlEncode(bytes);
  }
  const material = `${Utilities.getUuid()}|${Utilities.getUuid()}|${Utilities.getUuid()}|${Utilities.getUuid()}`;
  return auth01Base64UrlEncode(auth01Sha256Bytes(auth01Utf8Bytes(material)));
}

function auth01IdentifierKeyFingerprint(rawKey) {
  const bytes = auth01Base64UrlDecodeCanonical(rawKey);
  if (!bytes || bytes.length !== 32) {
    throw auth01Error("AUTH01_IDENTIFIER_KEY_INVALID", "Authentication identifier configuration is invalid.");
  }
  return auth01Base64UrlEncode(auth01Sha256Bytes(
    auth01Utf8Bytes("CUT-HUB-POS|AUTH01:IDKEY:v1|").concat(bytes)
  ));
}

function auth01ProvisionIdentifierKey(options) {
  const properties = auth01ScriptProperties(options);
  const lock = auth01AcquireScriptLock(options);
  try {
    const existingKey = properties.getProperty(AUTH01_IDENTIFIER_KEY_PROPERTY);
    const existingFingerprint = properties.getProperty(AUTH01_IDENTIFIER_FINGERPRINT_PROPERTY);
    if (existingKey || existingFingerprint) {
      if (!existingKey || !existingFingerprint ||
          auth01IdentifierKeyFingerprint(existingKey) !== existingFingerprint) {
        throw auth01Error("AUTH01_IDENTIFIER_KEY_CONTINUITY_INVALID", "Authentication identifier continuity is invalid.");
      }
      return { created: false, fingerprint: existingFingerprint };
    }
    const key = auth01GenerateIdentifierKey(options);
    const fingerprint = auth01IdentifierKeyFingerprint(key);
    properties.setProperty(AUTH01_IDENTIFIER_KEY_PROPERTY, key);
    properties.setProperty(AUTH01_IDENTIFIER_FINGERPRINT_PROPERTY, fingerprint);
    if (properties.getProperty(AUTH01_IDENTIFIER_KEY_PROPERTY) !== key ||
        properties.getProperty(AUTH01_IDENTIFIER_FINGERPRINT_PROPERTY) !== fingerprint) {
      throw auth01Error("AUTH01_IDENTIFIER_KEY_WRITE_FAILED", "Authentication identifier configuration could not be verified.");
    }
    return { created: true, fingerprint };
  } finally {
    lock.releaseLock();
  }
}

function auth01ScriptProperties(options) {
  return options && options.properties ? options.properties : PropertiesService.getScriptProperties();
}

function auth01IdentifierKeyBytes(options) {
  const properties = auth01ScriptProperties(options);
  const raw = properties.getProperty(AUTH01_IDENTIFIER_KEY_PROPERTY);
  const storedFingerprint = properties.getProperty(AUTH01_IDENTIFIER_FINGERPRINT_PROPERTY);
  const bytes = auth01Base64UrlDecodeCanonical(raw);
  if (!bytes || bytes.length !== 32 || !storedFingerprint) {
    throw auth01Error("AUTH01_IDENTIFIER_KEY_MISSING", "Authentication identifier configuration is unavailable.");
  }
  const actualFingerprint = auth01IdentifierKeyFingerprint(raw);
  if (!auth01ConstantTimeEqual(
    auth01Utf8Bytes(actualFingerprint), auth01Utf8Bytes(storedFingerprint)
  )) {
    throw auth01Error("AUTH01_IDENTIFIER_KEY_CONTINUITY_INVALID", "Authentication identifier continuity is invalid.");
  }
  return bytes;
}

function auth01CurrentIdentifierFingerprint(options) {
  auth01IdentifierKeyBytes(options);
  return auth01ScriptProperties(options).getProperty(AUTH01_IDENTIFIER_FINGERPRINT_PROPERTY);
}

function auth01OpaqueUserId(username, options) {
  const canonical = auth01CanonicalUsername(username);
  if (!canonical) throw auth01Error("AUTH01_USERNAME_INVALID", "User identifier is invalid.");
  return auth01Base64UrlEncode(auth01HmacSha256Bytes(
    auth01IdentifierKeyBytes(options), auth01Utf8Bytes(canonical)
  ));
}

function auth01EpochPropertyKey(username, options) {
  return AUTH01_EPOCH_PREFIX + auth01OpaqueUserId(username, options);
}

function auth01ReadCredentialEpoch(username, options) {
  const raw = auth01ScriptProperties(options).getProperty(auth01EpochPropertyKey(username, options));
  if (raw == null || raw === "") return 0;
  const epoch = Number(raw);
  if (!Number.isSafeInteger(epoch) || epoch < 0) {
    throw auth01Error("AUTH01_CREDENTIAL_EPOCH_INVALID", "Credential epoch state is invalid.");
  }
  return epoch;
}

function auth01IncrementCredentialEpoch(username, options) {
  const properties = auth01ScriptProperties(options);
  const key = auth01EpochPropertyKey(username, options);
  const current = auth01ReadCredentialEpoch(username, options);
  const next = current + 1;
  properties.setProperty(key, String(next));
  if (auth01ReadCredentialEpoch(username, options) !== next) {
    throw auth01Error("AUTH01_CREDENTIAL_EPOCH_WRITE_FAILED", "Credential epoch could not be verified.");
  }
  return next;
}

function resetOwnerPasswordEmergency() {
  const NEW_OWNER_PASSWORD = "change-this-password";
  if (NEW_OWNER_PASSWORD === "change-this-password") {
    throw new Error("Set NEW_OWNER_PASSWORD before running resetOwnerPasswordEmergency.");
  }

  const sheet = getUsersSheet();
  const users = readUsersFromSheet();
  const owner = users.find(user => String(user.username || "").trim().toLowerCase() === "owner");

  if (!owner) {
    throw new Error("Owner user was not found in USERS sheet.");
  }

  auth01ReplaceCredential(owner, NEW_OWNER_PASSWORD, Object.assign({}, auth01RuntimeOptions() || {}, { sheet }));
  Logger.log("Owner password was reset successfully.");
}

function readUsersFromSheet() {
  const sheet = getUsersSheetReadOnly();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) return [];

  const width = Math.max(6, sheet.getLastColumn());
  const headers = sheet.getRange(1, 1, 1, width).getValues()[0].map((value) =>
    String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_"));
  const preparationIndex = headers.indexOf("PREPARATION_MINUTES");
  const cleanupIndex = headers.indexOf("CLEANUP_MINUTES");
  const rows = sheet.getRange(2, 1, lastRow - 1, width).getValues();

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

function auth01AcquireScriptLock(options) {
  const lock = options && options.lock ? options.lock : LockService.getScriptLock();
  if (!lock || typeof lock.tryLock !== "function" || !lock.tryLock(30000)) {
    throw auth01Error("AUTH01_LOCK_UNAVAILABLE", "Authentication service is temporarily unavailable.");
  }
  return lock;
}

function auth01FindCurrentUser(expected) {
  const canonical = auth01CanonicalUsername(expected && expected.username);
  return readUsersFromSheet().find(user =>
    user.rowNumber === Number(expected && expected.rowNumber) &&
    auth01CanonicalUsername(user.username) === canonical
  ) || null;
}

function auth01CredentialCells(sheet, rowNumber) {
  return {
    password: String(sheet.getRange(rowNumber, 2).getValue() || ""),
    passwordHash: String(sheet.getRange(rowNumber, 6).getValue() || "").trim()
  };
}

function auth01WriteMigrationJournal(properties, key, record) {
  const now = new Date().toISOString();
  const safe = {
    version: 1,
    requestId: String(record.requestId || ""),
    opaqueUserId: String(record.opaqueUserId || ""),
    rowNumber: Number(record.rowNumber || 0),
    sourceState: String(record.sourceState || ""),
    targetState: AUTH01_CREDENTIAL_STATES.MODERN_V1,
    status: String(record.status || "PREPARED"),
    phase: String(record.phase || "PREPARED"),
    createdAt: String(record.createdAt || now),
    updatedAt: now,
    recoveryRequired: !!record.recoveryRequired
  };
  const serialized = JSON.stringify(safe);
  if (serialized.length > AUTH01_MIGRATION_JOURNAL_POLICY.maximumSerializedBytes) {
    throw auth01Error("AUTH01_MIGRATION_JOURNAL_TOO_LARGE", "Migration recovery state is invalid.");
  }
  properties.setProperty(key, serialized);
  return safe;
}

function auth01ParseMigrationJournal(raw, now) {
  let journal;
  try { journal = JSON.parse(String(raw || "")); } catch (error) {
    throw auth01Error("AUTH01_MIGRATION_JOURNAL_CORRUPT", "Migration recovery state is invalid.");
  }
  const expected = [
    "createdAt", "opaqueUserId", "phase", "recoveryRequired", "requestId", "rowNumber",
    "sourceState", "status", "targetState", "updatedAt", "version"
  ];
  if (!journal || Array.isArray(journal) || typeof journal !== "object" ||
      Object.keys(journal).sort().join("|") !== expected.sort().join("|") || journal.version !== 1 ||
      ["PREPARED", "APPLYING", "RECOVERY_REQUIRED", "COMMITTED", "ABORTED"].indexOf(journal.status) === -1 ||
      typeof journal.phase !== "string" || journal.phase.length > 64 ||
      typeof journal.requestId !== "string" || !/^[A-Za-z0-9._:-]{1,128}$/.test(journal.requestId) ||
      typeof journal.opaqueUserId !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(journal.opaqueUserId) ||
      !Number.isSafeInteger(journal.rowNumber) || journal.rowNumber < 2 ||
      Object.keys(AUTH01_CREDENTIAL_STATES).map(key => AUTH01_CREDENTIAL_STATES[key])
        .indexOf(journal.sourceState) === -1 ||
      journal.targetState !== AUTH01_CREDENTIAL_STATES.MODERN_V1 ||
      typeof journal.recoveryRequired !== "boolean" ||
      journal.recoveryRequired !== (journal.status === "RECOVERY_REQUIRED")) {
    throw auth01Error("AUTH01_MIGRATION_JOURNAL_CORRUPT", "Migration recovery state is invalid.");
  }
  const createdAt = Date.parse(journal.createdAt);
  const updatedAt = Date.parse(journal.updatedAt);
  if (!Number.isFinite(createdAt) || !Number.isFinite(updatedAt) || createdAt > updatedAt ||
      createdAt < AUTH01_MIGRATION_JOURNAL_POLICY.earliestValidTimestampMs ||
      updatedAt > now + 5 * 60 * 1000) {
    throw auth01Error("AUTH01_MIGRATION_JOURNAL_CORRUPT", "Migration recovery state is invalid.");
  }
  return journal;
}

function auth01MigrationJournalSnapshot(options) {
  const properties = auth01ScriptProperties(options);
  const now = auth01Now(options);
  let all;
  try { all = properties.getProperties(); } catch (error) {
    throw auth01Error("AUTH01_MIGRATION_JOURNAL_STORE_UNAVAILABLE", "Migration recovery inventory is unavailable.");
  }
  const keys = Object.keys(all).filter(key => key.indexOf(AUTH01_MIGRATION_PREFIX) === 0).sort();
  const items = [];
  const counts = { total: keys.length, unresolved: 0, recoveryRequired: 0, malformed: 0, terminal: 0 };
  keys.forEach(key => {
    try {
      const journal = auth01ParseMigrationJournal(all[key], now);
      const unresolved = ["PREPARED", "APPLYING", "RECOVERY_REQUIRED"].indexOf(journal.status) !== -1;
      const terminal = journal.status === "COMMITTED" || journal.status === "ABORTED";
      if (unresolved) counts.unresolved += 1;
      if (journal.status === "RECOVERY_REQUIRED") counts.recoveryRequired += 1;
      if (terminal) counts.terminal += 1;
      items.push({
        key, status: journal.status, phase: journal.phase, updatedAt: journal.updatedAt,
        attentionRequired: unresolved && (journal.status === "RECOVERY_REQUIRED" ||
          now - Date.parse(journal.updatedAt) >= AUTH01_MIGRATION_JOURNAL_POLICY.attentionAfterMs),
        malformed: false, terminal
      });
    } catch (error) {
      counts.malformed += 1;
      items.push({ key, status: "MALFORMED", attentionRequired: true, malformed: true, terminal: false });
    }
  });
  return { properties, now, keys, items, counts };
}

function auth01MigrationJournalInventory(options) {
  const snapshot = auth01MigrationJournalSnapshot(options);
  const maximumScan = Math.min(
    AUTH01_MIGRATION_JOURNAL_POLICY.maximumInventoryScan,
    Math.max(1, Number(options && options.maximumScan) || AUTH01_MIGRATION_JOURNAL_POLICY.maximumInventoryScan)
  );
  const start = Math.max(0, Number(options && options.inventoryOffset) || 0);
  const pageSize = Math.min(
    AUTH01_MIGRATION_JOURNAL_POLICY.inventoryPageSize, maximumScan,
    Math.max(1, Number(options && options.inventoryPageSize) || AUTH01_MIGRATION_JOURNAL_POLICY.inventoryPageSize)
  );
  const inventory = snapshot.items.slice(start, start + pageSize);
  inventory.total = snapshot.counts.total;
  inventory.unresolved = snapshot.counts.unresolved;
  inventory.recoveryRequired = snapshot.counts.recoveryRequired;
  inventory.malformed = snapshot.counts.malformed;
  inventory.overflow = Math.max(0, snapshot.counts.total - (start + inventory.length));
  inventory.nextOffset = start + inventory.length < snapshot.counts.total ? start + inventory.length : null;
  return inventory;
}

function auth01CleanupTerminalMigrationJournals(options) {
  const snapshot = auth01MigrationJournalSnapshot(options);
  let deleted = 0;
  for (let index = 0; index < snapshot.items.length; index++) {
    const item = snapshot.items[index];
    if (deleted >= AUTH01_MIGRATION_JOURNAL_POLICY.maximumCleanupBatch) break;
    if (item.malformed || !item.terminal) continue;
    const journal = auth01ParseMigrationJournal(snapshot.properties.getProperty(item.key), snapshot.now);
    if (snapshot.now - Date.parse(journal.updatedAt) >= AUTH01_MIGRATION_JOURNAL_POLICY.terminalRetentionMs) {
      snapshot.properties.deleteProperty(item.key);
      deleted += 1;
    }
  }
  return {
    scanned: snapshot.items.length, deleted, retained: snapshot.items.length - deleted,
    totalBefore: snapshot.counts.total, overflow: Math.max(0, snapshot.counts.total - AUTH01_MIGRATION_JOURNAL_POLICY.maximumInventoryScan)
  };
}

function auth01EnsureMigrationJournalAdmission(options) {
  let snapshot = auth01MigrationJournalSnapshot(options);
  if (snapshot.counts.malformed > 0) {
    throw auth01Error("AUTH01_MIGRATION_JOURNAL_ATTENTION_REQUIRED", "Migration recovery state requires operator attention.");
  }
  const policy = AUTH01_MIGRATION_JOURNAL_POLICY;
  const needsCapacity = snapshot.counts.total >= policy.maximumTotalJournals;
  if (needsCapacity && snapshot.counts.terminal > 0) {
    auth01CleanupTerminalMigrationJournals(options);
    snapshot = auth01MigrationJournalSnapshot(options);
  }
  if (snapshot.counts.total >= policy.maximumTotalJournals ||
      snapshot.counts.unresolved >= policy.maximumUnresolvedJournals ||
      snapshot.counts.recoveryRequired >= policy.maximumRecoveryRequiredJournals) {
    throw auth01Error("AUTH01_MIGRATION_JOURNAL_CAPACITY_EXHAUSTED", "Migration recovery capacity is unavailable.");
  }
  return snapshot.counts;
}

function auth01MigrationResultUser(current, modernCredential) {
  return Object.assign({}, current, { password: "", passwordHash: modernCredential });
}

function auth01MigrateCredential(user, password, verification, options) {
  if (!verification || !verification.ok ||
      [AUTH01_CREDENTIAL_STATES.LEGACY_SHA256, AUTH01_CREDENTIAL_STATES.LEGACY_PLAINTEXT]
        .indexOf(verification.state) === -1) {
    throw auth01Error("AUTH01_MIGRATION_SOURCE_INVALID", "Credential migration source is invalid.");
  }
  const modernCredential = createModernCredential(password, options);
  const lock = auth01AcquireScriptLock(options);
  const properties = auth01ScriptProperties(options);
  const requestId = String((options && options.requestId) || Utilities.getUuid());
  const journalKey = AUTH01_MIGRATION_PREFIX + requestId;
  const sheet = options && options.sheet ? options.sheet : getUsersSheet();
  let journal = null;
  let current = null;
  try {
    current = auth01FindCurrentUser(user);
    if (!current) throw auth01Error("AUTH01_MIGRATION_ROW_CHANGED", "Credential row changed before migration.");
    const currentClassification = auth01ClassifyCredential(current, options);
    if (currentClassification.state === AUTH01_CREDENTIAL_STATES.MODERN_V1) {
      const committed = auth01VerifyCredential(current, password, options);
      if (!committed.ok) throw auth01Error("AUTH01_MIGRATION_ROW_CHANGED", "Credential changed before migration.");
      if (currentClassification.plaintextResidue) {
        sheet.getRange(current.rowNumber, 2).setValue("");
        SpreadsheetApp.flush();
        if (auth01CredentialCells(sheet, current.rowNumber).password !== "") {
          throw auth01Error("AUTH01_MIGRATION_RECOVERY_REQUIRED", "Plaintext cleanup requires recovery.");
        }
      }
      return auth01MigrationResultUser(current, current.passwordHash);
    }
    if (currentClassification.state !== verification.state ||
        current.passwordHash !== String(user.passwordHash || "") ||
        current.password !== String(user.password || "")) {
      throw auth01Error("AUTH01_MIGRATION_ROW_CHANGED", "Credential row changed before migration.");
    }

    auth01EnsureMigrationJournalAdmission(options);
    journal = auth01WriteMigrationJournal(properties, journalKey, {
      requestId,
      opaqueUserId: auth01OpaqueUserId(current.username, options),
      rowNumber: current.rowNumber,
      sourceState: currentClassification.state,
      status: "APPLYING",
      phase: "PREPARED"
    });
    sheet.getRange(current.rowNumber, 6).setValue(modernCredential);
    SpreadsheetApp.flush();
    let cells = auth01CredentialCells(sheet, current.rowNumber);
    if (cells.passwordHash !== modernCredential) {
      if (cells.passwordHash === current.passwordHash && cells.password === current.password) {
        properties.deleteProperty(journalKey);
        throw auth01Error("AUTH01_MIGRATION_WRITE_FAILED", "Credential migration did not start.");
      }
      auth01WriteMigrationJournal(properties, journalKey, Object.assign({}, journal, {
        status: "RECOVERY_REQUIRED", phase: "HASH_WRITE_UNPROVEN", recoveryRequired: true
      }));
      throw auth01Error("AUTH01_MIGRATION_RECOVERY_REQUIRED", "Credential migration requires recovery.");
    }
    journal = auth01WriteMigrationJournal(properties, journalKey, Object.assign({}, journal, {
      status: "APPLYING", phase: "MODERN_HASH_VERIFIED"
    }));
    sheet.getRange(current.rowNumber, 2).setValue("");
    SpreadsheetApp.flush();
    cells = auth01CredentialCells(sheet, current.rowNumber);
    if (cells.passwordHash !== modernCredential || cells.password !== "") {
      auth01WriteMigrationJournal(properties, journalKey, Object.assign({}, journal, {
        status: "RECOVERY_REQUIRED", phase: "PLAINTEXT_CLEAR_UNPROVEN", recoveryRequired: true
      }));
      throw auth01Error("AUTH01_MIGRATION_RECOVERY_REQUIRED", "Credential migration requires recovery.");
    }
    const persisted = auth01VerifyCredential(
      auth01MigrationResultUser(current, modernCredential), password, options
    );
    if (!persisted.ok) {
      auth01WriteMigrationJournal(properties, journalKey, Object.assign({}, journal, {
        status: "RECOVERY_REQUIRED", phase: "POST_WRITE_VERIFY_FAILED", recoveryRequired: true
      }));
      throw auth01Error("AUTH01_MIGRATION_RECOVERY_REQUIRED", "Credential migration requires recovery.");
    }
    properties.deleteProperty(journalKey);
    return auth01MigrationResultUser(current, modernCredential);
  } catch (error) {
    if (!journal || error.code === "AUTH01_MIGRATION_RECOVERY_REQUIRED") throw error;
    let cells = null;
    try { cells = current ? auth01CredentialCells(sheet, current.rowNumber) : null; } catch (readError) {}
    if (cells && cells.passwordHash === modernCredential && cells.password === "") {
      properties.deleteProperty(journalKey);
      return auth01MigrationResultUser(current, modernCredential);
    }
    if (cells && cells.passwordHash === current.passwordHash && cells.password === current.password) {
      properties.deleteProperty(journalKey);
      throw error;
    }
    auth01WriteMigrationJournal(properties, journalKey, Object.assign({}, journal, {
      status: "RECOVERY_REQUIRED", phase: "UNEXPECTED_FAILURE", recoveryRequired: true
    }));
    throw auth01Error("AUTH01_MIGRATION_RECOVERY_REQUIRED", "Credential migration requires recovery.");
  } finally {
    lock.releaseLock();
  }
}

function auth01ReplaceCredential(user, password, options) {
  const modernCredential = createModernCredential(password, options);
  const lock = auth01AcquireScriptLock(options);
  const properties = auth01ScriptProperties(options);
  const requestId = String((options && options.requestId) || Utilities.getUuid());
  const journalKey = AUTH01_MIGRATION_PREFIX + requestId;
  const sheet = options && options.sheet ? options.sheet : getUsersSheet();
  let journal = null;
  let current = null;
  try {
    current = auth01FindCurrentUser(user);
    if (!current) throw auth01Error("AUTH01_PASSWORD_CHANGE_ROW_CHANGED", "Credential row changed before password update.");
    auth01EnsureMigrationJournalAdmission(options);
    journal = auth01WriteMigrationJournal(properties, journalKey, {
      requestId,
      opaqueUserId: auth01OpaqueUserId(current.username, options),
      rowNumber: current.rowNumber,
      sourceState: auth01ClassifyCredential(current, options).state,
      status: "APPLYING",
      phase: "PREPARED"
    });
    const credentialEpoch = auth01IncrementCredentialEpoch(current.username, options);
    journal = auth01WriteMigrationJournal(properties, journalKey, Object.assign({}, journal, {
      status: "APPLYING", phase: "EPOCH_INCREMENTED"
    }));
    sheet.getRange(current.rowNumber, 6).setValue(modernCredential);
    SpreadsheetApp.flush();
    let cells = auth01CredentialCells(sheet, current.rowNumber);
    if (cells.passwordHash !== modernCredential) {
      if (cells.passwordHash === current.passwordHash && cells.password === current.password) {
        properties.deleteProperty(journalKey);
        throw auth01Error("AUTH01_PASSWORD_CHANGE_WRITE_FAILED", "Password update did not start.");
      }
      auth01WriteMigrationJournal(properties, journalKey, Object.assign({}, journal, {
        status: "RECOVERY_REQUIRED", phase: "HASH_WRITE_UNPROVEN", recoveryRequired: true
      }));
      throw auth01Error("AUTH01_MIGRATION_RECOVERY_REQUIRED", "Password update requires recovery.");
    }
    sheet.getRange(current.rowNumber, 2).setValue("");
    SpreadsheetApp.flush();
    cells = auth01CredentialCells(sheet, current.rowNumber);
    const updated = auth01MigrationResultUser(current, modernCredential);
    if (cells.password !== "" || cells.passwordHash !== modernCredential ||
        !auth01VerifyCredential(updated, password, options).ok) {
      auth01WriteMigrationJournal(properties, journalKey, Object.assign({}, journal, {
        status: "RECOVERY_REQUIRED", phase: "POST_WRITE_VERIFY_FAILED", recoveryRequired: true
      }));
      throw auth01Error("AUTH01_MIGRATION_RECOVERY_REQUIRED", "Password update requires recovery.");
    }
    properties.deleteProperty(journalKey);
    return { user: updated, credentialEpoch };
  } catch (error) {
    if (!journal || error.code === "AUTH01_MIGRATION_RECOVERY_REQUIRED") throw error;
    let cells = null;
    try { cells = current ? auth01CredentialCells(sheet, current.rowNumber) : null; } catch (readError) {}
    if (cells && cells.passwordHash === modernCredential && cells.password === "") {
      properties.deleteProperty(journalKey);
      return {
        user: auth01MigrationResultUser(current, modernCredential),
        credentialEpoch: auth01ReadCredentialEpoch(current.username, options)
      };
    }
    if (cells && cells.passwordHash === current.passwordHash && cells.password === current.password) {
      properties.deleteProperty(journalKey);
      throw error;
    }
    auth01WriteMigrationJournal(properties, journalKey, Object.assign({}, journal, {
      status: "RECOVERY_REQUIRED", phase: "UNEXPECTED_FAILURE", recoveryRequired: true
    }));
    throw auth01Error("AUTH01_MIGRATION_RECOVERY_REQUIRED", "Password update requires recovery.");
  } finally {
    lock.releaseLock();
  }
}

const AUTH01_THROTTLE_GLOBAL_KEY = "AUTH01:RL:v1:G";
const AUTH01_THROTTLE_ACCOUNT_PREFIX = "AUTH01:RL:v1:A:";
const AUTH01_THROTTLE_CACHE_PREFIX = "AUTH01:RL:C:v1:";
const AUTH01_THROTTLE_RECOVERY_PREFIX = "AUTH01:RL:RECOVERY:v1:";
const AUTH01_THROTTLE_STATE_MAX_BYTES = 8192;
const AUTH01_THROTTLE_HISTORY_HORIZON_MS = 400 * 24 * 60 * 60 * 1000;
const AUTH01_THROTTLE_CLOCK_SKEW_MS = 5 * 60 * 1000;
// Availability/security guarantee: denied requests cannot extend blockedUntil,
// and every individual account/global cooldown is bounded by the configured
// maximum. Re-blocking requires a fresh full threshold of reserved failures in
// a newly opened window; one sparse request cannot perpetuate an existing block.
// This deliberately does NOT claim that a password-only endpoint can guarantee
// a legitimate caller a verification slot against a continuously active attacker
// who knows the same username and races every fresh budget. Without an additional
// trusted signal (for example a challenge/device factor), those callers are
// indistinguishable before password verification. That sustained-race condition
// is an explicit residual availability risk, not a throttle-state lockout.
// The AUTH-01 objective here is bounded application rate limiting with no
// attacker-extendable single-probe state and a hard bound on PBKDF2 work per
// window.
const AUTH01_THROTTLE_POLICY = Object.freeze({
  accountFailureThreshold: 5,
  accountWindowMs: 15 * 60 * 1000,
  accountInitialCooldownMs: 30 * 1000,
  accountMaximumCooldownMs: 15 * 60 * 1000,
  globalFailureThreshold: 100,
  globalUnknownFailureThreshold: 80,
  globalWindowMs: 5 * 60 * 1000,
  globalInitialCooldownMs: 60 * 1000,
  globalMaximumCooldownMs: 5 * 60 * 1000,
  reservationTtlMs: 2 * 60 * 1000,
  maximumReservations: 120
});

function auth01ThrottlePolicy(options) {
  const override = options && options.throttlePolicy;
  const policy = override ? Object.assign({}, AUTH01_THROTTLE_POLICY, override) : AUTH01_THROTTLE_POLICY;
  if (override && !Object.prototype.hasOwnProperty.call(override, "globalUnknownFailureThreshold")) {
    policy.globalUnknownFailureThreshold = Math.max(
      1, Math.min(policy.globalFailureThreshold, Math.floor(policy.globalFailureThreshold * 0.8))
    );
  }
  const positiveIntegers = [
    "accountFailureThreshold", "accountWindowMs", "accountInitialCooldownMs",
    "accountMaximumCooldownMs", "globalFailureThreshold", "globalUnknownFailureThreshold",
    "globalWindowMs", "globalInitialCooldownMs", "globalMaximumCooldownMs",
    "reservationTtlMs", "maximumReservations"
  ];
  if (positiveIntegers.some(key => !Number.isSafeInteger(policy[key]) || policy[key] < 1) ||
      policy.globalUnknownFailureThreshold > policy.globalFailureThreshold ||
      policy.accountInitialCooldownMs > policy.accountMaximumCooldownMs ||
      policy.globalInitialCooldownMs > policy.globalMaximumCooldownMs ||
      policy.maximumReservations < Math.max(policy.accountFailureThreshold, policy.globalFailureThreshold)) {
    throw auth01Error("AUTH01_THROTTLE_POLICY_INVALID", "Authentication throttle policy is invalid.");
  }
  return policy;
}

function auth01Now(options) {
  const now = options && typeof options.now === "function" ? Number(options.now()) : Date.now();
  if (!Number.isSafeInteger(now) || now < 0) {
    throw auth01Error("AUTH01_TIME_INVALID", "Authentication service time is invalid.");
  }
  return now;
}

function auth01ThrottleCache(options) {
  try {
    return options && options.cache ? options.cache : CacheService.getScriptCache();
  } catch (error) {
    return null;
  }
}

function auth01ThrottleLock(options) {
  const lock = options && typeof options.lockFactory === "function"
    ? options.lockFactory()
    : (options && options.lock ? options.lock : LockService.getScriptLock());
  if (!lock || typeof lock.tryLock !== "function" || !lock.tryLock(5000)) {
    throw auth01Error("AUTH01_THROTTLE_LOCK_UNAVAILABLE", "Authentication service is temporarily unavailable.");
  }
  return lock;
}

function auth01EmptyThrottleState(now, scope) {
  return {
    version: 1,
    scope,
    status: "OPEN",
    windowStartedAt: now,
    failures: 0,
    unknownFailures: 0,
    backoffLevel: 0,
    blockedUntil: 0,
    reservations: {},
    finalizations: {},
    updatedAt: now
  };
}

function auth01ThrottleInteger(value, minimum, maximum) {
  return Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}

function auth01ThrottleRecordIdValid(value) {
  return typeof value === "string" && /^[A-Za-z0-9._:-]{1,128}$/.test(value);
}

function auth01EncodeThrottleFinalization(outcome, finalizedAt) {
  return ({ failure: "F", success: "S", system: "E" })[outcome] + ":" + finalizedAt;
}

function auth01DecodeThrottleFinalization(value) {
  const match = /^([FSE]):([0-9]{1,16})$/.exec(String(value || ""));
  if (!match) return null;
  return {
    outcome: ({ F: "failure", S: "success", E: "system" })[match[1]],
    finalizedAt: Number(match[2])
  };
}

function auth01ValidateThrottleState(state, raw, now, scope, policy) {
  const expected = [
    "backoffLevel", "blockedUntil", "failures", "finalizations", "reservations",
    "scope", "status", "unknownFailures", "updatedAt", "version", "windowStartedAt"
  ];
  const maximumCooldown = scope === "GLOBAL"
    ? policy.globalMaximumCooldownMs : policy.accountMaximumCooldownMs;
  const maximumFailures = scope === "GLOBAL"
    ? policy.globalFailureThreshold : policy.accountFailureThreshold;
  if (!state || Array.isArray(state) || typeof state !== "object" || state.version !== 1 ||
      state.scope !== scope || ["OPEN", "BLOCKED"].indexOf(state.status) === -1 ||
      Object.keys(state).sort().join("|") !== expected.sort().join("|") ||
      typeof raw !== "string" || raw.length > AUTH01_THROTTLE_STATE_MAX_BYTES ||
      !auth01ThrottleInteger(state.windowStartedAt, 0, now + AUTH01_THROTTLE_CLOCK_SKEW_MS) ||
      state.windowStartedAt < Math.max(0, now - AUTH01_THROTTLE_HISTORY_HORIZON_MS) ||
      !auth01ThrottleInteger(state.updatedAt, state.windowStartedAt, now + AUTH01_THROTTLE_CLOCK_SKEW_MS) ||
      !auth01ThrottleInteger(state.failures, 0, maximumFailures) ||
      !auth01ThrottleInteger(state.unknownFailures, 0, state.failures) ||
      (scope === "ACCOUNT" && state.unknownFailures !== 0) ||
      (scope === "GLOBAL" && state.unknownFailures > policy.globalUnknownFailureThreshold) ||
      state.backoffLevel !== 0 ||
      !auth01ThrottleInteger(state.blockedUntil, 0, now + maximumCooldown) ||
      (state.status === "BLOCKED") !== (state.blockedUntil > 0) ||
      (state.blockedUntil && state.blockedUntil < state.updatedAt) ||
      !state.reservations || Array.isArray(state.reservations) || typeof state.reservations !== "object" ||
      !state.finalizations || Array.isArray(state.finalizations) || typeof state.finalizations !== "object") {
    throw auth01Error("AUTH01_THROTTLE_STATE_CORRUPT", "Authentication throttle state is invalid.");
  }
  const reservationIds = Object.keys(state.reservations);
  const finalizationIds = Object.keys(state.finalizations);
  const finalizationSet = {};
  finalizationIds.forEach(id => { finalizationSet[id] = true; });
  if (reservationIds.some(id => finalizationSet[id])) {
    throw auth01Error("AUTH01_THROTTLE_STATE_CORRUPT", "Authentication throttle reservation/finalization state overlaps.");
  }
  if (reservationIds.length > policy.maximumReservations ||
      finalizationIds.length > policy.maximumReservations ||
      reservationIds.length + finalizationIds.length > policy.maximumReservations) {
    throw auth01Error("AUTH01_THROTTLE_STATE_CORRUPT", "Authentication throttle state is invalid.");
  }
  reservationIds.forEach(id => {
    const item = state.reservations[id];
    if (!auth01ThrottleRecordIdValid(id) || !item || Array.isArray(item) ||
        Object.keys(item).sort().join("|") !== (scope === "GLOBAL" ? "expiresAt|kind" : "expiresAt") ||
        (scope === "GLOBAL" && ["K", "U"].indexOf(item.kind) === -1) ||
        !auth01ThrottleInteger(item.expiresAt, state.updatedAt, now + policy.reservationTtlMs)) {
      throw auth01Error("AUTH01_THROTTLE_STATE_CORRUPT", "Authentication throttle reservation is invalid.");
    }
  });
  finalizationIds.forEach(id => {
    const item = auth01DecodeThrottleFinalization(state.finalizations[id]);
    if (!auth01ThrottleRecordIdValid(id) || !item ||
        !auth01ThrottleInteger(item.finalizedAt, Math.max(0, now - AUTH01_THROTTLE_HISTORY_HORIZON_MS),
          now + AUTH01_THROTTLE_CLOCK_SKEW_MS)) {
      throw auth01Error("AUTH01_THROTTLE_STATE_CORRUPT", "Authentication throttle finalization is invalid.");
    }
  });
  return state;
}

function auth01NormalizeThrottleState(state, now, windowMs, scope, policy) {
  const retainedFinalizations = {};
  Object.keys(state.finalizations).forEach(id => {
    const finalization = auth01DecodeThrottleFinalization(state.finalizations[id]);
    if (finalization && finalization.finalizedAt + policy.reservationTtlMs > now) {
      retainedFinalizations[id] = state.finalizations[id];
    }
  });
  const blockExpired = state.status === "BLOCKED" && state.blockedUntil <= now;
  const windowExpired = now - state.windowStartedAt >= windowMs;
  if (blockExpired || (state.status === "OPEN" && windowExpired)) {
    state = auth01EmptyThrottleState(now, scope);
    state.finalizations = retainedFinalizations;
  } else {
    Object.keys(state.reservations).forEach(id => {
      if (state.reservations[id].expiresAt <= now) delete state.reservations[id];
    });
    state.finalizations = retainedFinalizations;
    state.updatedAt = now;
  }
  return state;
}

function auth01ThrottleRecoveryMarker(properties, key, code, now) {
  const markerKey = AUTH01_THROTTLE_RECOVERY_PREFIX + auth01Base64UrlEncode(
    auth01Sha256Bytes(auth01Utf8Bytes(key))
  );
  const marker = JSON.stringify({ version: 1, code: String(code), detectedAt: now });
  try { properties.setProperty(markerKey, marker); } catch (error) {}
}

function auth01ReadThrottleState(properties, key, now, windowMs, scope, policy) {
  let raw;
  try { raw = properties.getProperty(key); } catch (error) {
    throw auth01Error("AUTH01_THROTTLE_STORE_UNAVAILABLE", "Authentication service is temporarily unavailable.");
  }
  if (raw == null || raw === "") return auth01EmptyThrottleState(now, scope);
  let parsed;
  try { parsed = JSON.parse(raw); } catch (error) {
    auth01ThrottleRecoveryMarker(properties, key, "MALFORMED_JSON", now);
    throw auth01Error("AUTH01_THROTTLE_STATE_CORRUPT", "Authentication throttle state is invalid.");
  }
  try {
    auth01ValidateThrottleState(parsed, raw, now, scope, policy);
  } catch (error) {
    auth01ThrottleRecoveryMarker(properties, key, error.code || "INVALID_SCHEMA", now);
    throw error;
  }
  return auth01NormalizeThrottleState(parsed, now, windowMs, scope, policy);
}

function auth01WriteThrottleState(properties, key, state, now, scope, policy) {
  try {
    const raw = JSON.stringify(state);
    auth01ValidateThrottleState(state, raw, now, scope, policy);
    properties.setProperty(key, raw);
  } catch (error) {
    if (error && error.code === "AUTH01_THROTTLE_STATE_CORRUPT") throw error;
    throw auth01Error("AUTH01_THROTTLE_STORE_UNAVAILABLE", "Authentication service is temporarily unavailable.");
  }
}

function auth01CacheKeyForProperty(propertyKey) {
  if (propertyKey === AUTH01_THROTTLE_GLOBAL_KEY) return AUTH01_THROTTLE_CACHE_PREFIX + "G";
  return AUTH01_THROTTLE_CACHE_PREFIX + "A:" + propertyKey.slice(AUTH01_THROTTLE_ACCOUNT_PREFIX.length);
}

function auth01CacheBlockedUntil(cache, propertyKey) {
  if (!cache) return 0;
  try { return Math.max(0, Number(cache.get(auth01CacheKeyForProperty(propertyKey))) || 0); }
  catch (error) { return 0; }
}

function auth01CacheBlock(cache, propertyKey, blockedUntil, now) {
  if (!cache || blockedUntil <= now) return;
  try {
    cache.put(
      auth01CacheKeyForProperty(propertyKey), String(blockedUntil),
      Math.max(1, Math.min(21600, Math.ceil((blockedUntil - now) / 1000)))
    );
  } catch (error) {
    // Cache is acceleration only; durable state remains authoritative.
  }
}

function auth01CacheClear(cache, propertyKey) {
  if (!cache) return;
  try { cache.remove(auth01CacheKeyForProperty(propertyKey)); } catch (error) {}
}

function auth01ApplyThrottleFailure(state, now, threshold, windowMs, initialCooldown, maximumCooldown, kind) {
  state.failures = Math.min(threshold, state.failures + 1);
  if (state.scope === "GLOBAL" && kind === "U") {
    state.unknownFailures = Math.min(state.failures, state.unknownFailures + 1);
  }
  if (state.failures < threshold) return;
  auth01StartThrottleCooldown(state, now, threshold, windowMs, initialCooldown, maximumCooldown);
}

function auth01StartThrottleCooldown(state, now, threshold, windowMs, initialCooldown, maximumCooldown) {
  state.backoffLevel = Math.min(32, Math.max(0, state.failures - threshold));
  const cooldown = Math.min(maximumCooldown, initialCooldown * Math.pow(2, state.backoffLevel));
  state.blockedUntil = Math.min(
    now + maximumCooldown,
    Math.max(now + cooldown, state.windowStartedAt + windowMs)
  );
  state.status = "BLOCKED";
}

function auth01ReserveLoginAttempt(knownUsername, options) {
  const policy = auth01ThrottlePolicy(options);
  const now = auth01Now(options);
  const properties = auth01ScriptProperties(options);
  const cache = auth01ThrottleCache(options);
  const accountKey = knownUsername
    ? AUTH01_THROTTLE_ACCOUNT_PREFIX + auth01OpaqueUserId(knownUsername, options)
    : "";
  const cacheKeys = [AUTH01_THROTTLE_GLOBAL_KEY].concat(accountKey ? [accountKey] : []);
  if (cacheKeys.some(key => auth01CacheBlockedUntil(cache, key) > now)) {
    return { allowed: false, reason: "COOLDOWN" };
  }
  const lock = auth01ThrottleLock(options);
  try {
    const globalState = auth01ReadThrottleState(
      properties, AUTH01_THROTTLE_GLOBAL_KEY, now, policy.globalWindowMs, "GLOBAL", policy
    );
    const accountState = accountKey
      ? auth01ReadThrottleState(properties, accountKey, now, policy.accountWindowMs, "ACCOUNT", policy)
      : null;
    const globalInflight = Object.keys(globalState.reservations).length;
    const globalUnknownInflight = Object.keys(globalState.reservations)
      .filter(id => globalState.reservations[id].kind === "U").length;
    const accountInflight = accountState ? Object.keys(accountState.reservations).length : 0;
    const unknownLaneDenied = !accountKey &&
      globalState.unknownFailures + globalUnknownInflight >= policy.globalUnknownFailureThreshold;
    let globalDenied = globalState.status === "BLOCKED" ||
      globalInflight >= policy.maximumReservations ||
      globalState.failures + globalInflight >= policy.globalFailureThreshold;
    if (unknownLaneDenied && !globalDenied) {
      auth01WriteThrottleState(properties, AUTH01_THROTTLE_GLOBAL_KEY, globalState, now, "GLOBAL", policy);
      return { allowed: false, reason: "GLOBAL_UNKNOWN_LIMIT" };
    }
    if (globalDenied) {
      if (globalState.status !== "BLOCKED") {
        auth01StartThrottleCooldown(
          globalState, now, policy.globalFailureThreshold,
          policy.globalWindowMs,
          policy.globalInitialCooldownMs, policy.globalMaximumCooldownMs
        );
      }
      auth01WriteThrottleState(properties, AUTH01_THROTTLE_GLOBAL_KEY, globalState, now, "GLOBAL", policy);
      auth01CacheBlock(cache, AUTH01_THROTTLE_GLOBAL_KEY, globalState.blockedUntil, now);
      return { allowed: false, reason: "GLOBAL_LIMIT" };
    }
    let accountDenied = !!accountState && accountInflight >= policy.accountFailureThreshold;
    if (accountState && !accountDenied) {
      accountDenied = accountState.status === "BLOCKED" ||
        accountState.failures + accountInflight >= policy.accountFailureThreshold;
    }
    if (accountState && accountDenied) {
      if (accountState.status !== "BLOCKED") {
        auth01StartThrottleCooldown(
          accountState, now, policy.accountFailureThreshold,
          policy.accountWindowMs,
          policy.accountInitialCooldownMs, policy.accountMaximumCooldownMs
        );
      }
      auth01WriteThrottleState(properties, accountKey, accountState, now, "ACCOUNT", policy);
      auth01CacheBlock(cache, accountKey, accountState.blockedUntil, now);
      return { allowed: false, reason: "ACCOUNT_LIMIT" };
    }
    const reservationId = String((options && options.reservationId) || Utilities.getUuid());
    const expiresAt = now + policy.reservationTtlMs;
    if (!auth01ThrottleRecordIdValid(reservationId)) {
      throw auth01Error("AUTH01_THROTTLE_RESERVATION_INVALID", "Authentication service is temporarily unavailable.");
    }
    if (globalState.reservations[reservationId] || globalState.finalizations[reservationId] ||
        (accountState && (accountState.reservations[reservationId] || accountState.finalizations[reservationId]))) {
      throw auth01Error("AUTH01_THROTTLE_RESERVATION_COLLISION", "Authentication service is temporarily unavailable.");
    }
    globalState.reservations[reservationId] = { expiresAt, kind: accountKey ? "K" : "U" };
    auth01WriteThrottleState(properties, AUTH01_THROTTLE_GLOBAL_KEY, globalState, now, "GLOBAL", policy);
    if (accountState) {
      accountState.reservations[reservationId] = { expiresAt };
      auth01WriteThrottleState(properties, accountKey, accountState, now, "ACCOUNT", policy);
    }
    return { allowed: true, reservationId, accountKey, createdAt: now };
  } finally {
    lock.releaseLock();
  }
}

function auth01FinalizeLoginAttempt(reservation, outcome, options) {
  if (!reservation || !reservation.allowed || !reservation.reservationId) return;
  if (["failure", "success", "system"].indexOf(outcome) === -1) {
    throw auth01Error("AUTH01_THROTTLE_OUTCOME_INVALID", "Authentication service is temporarily unavailable.");
  }
  const policy = auth01ThrottlePolicy(options);
  const now = auth01Now(options);
  const properties = auth01ScriptProperties(options);
  const cache = auth01ThrottleCache(options);
  const lock = auth01ThrottleLock(options);
  try {
    const globalState = auth01ReadThrottleState(
      properties, AUTH01_THROTTLE_GLOBAL_KEY, now, policy.globalWindowMs, "GLOBAL", policy
    );
    const globalFinal = auth01DecodeThrottleFinalization(globalState.finalizations[reservation.reservationId]);
    if (globalFinal && globalFinal.outcome !== outcome) {
      throw auth01Error("AUTH01_THROTTLE_FINALIZATION_CONFLICT", "Authentication service is temporarily unavailable.");
    }
    const globalReservation = globalState.reservations[reservation.reservationId] || null;
    const globalReserved = !!globalReservation;
    if (!globalFinal && globalReserved) {
      delete globalState.reservations[reservation.reservationId];
      globalState.finalizations[reservation.reservationId] = auth01EncodeThrottleFinalization(outcome, now);
    }
    if (!globalFinal && globalReserved && outcome === "failure") {
      auth01ApplyThrottleFailure(
        globalState, now, policy.globalFailureThreshold,
        policy.globalWindowMs,
        policy.globalInitialCooldownMs, policy.globalMaximumCooldownMs,
        globalReservation.kind
      );
    }
    auth01WriteThrottleState(properties, AUTH01_THROTTLE_GLOBAL_KEY, globalState, now, "GLOBAL", policy);
    auth01CacheBlock(cache, AUTH01_THROTTLE_GLOBAL_KEY, globalState.blockedUntil, now);

    if (reservation.accountKey) {
      const accountState = auth01ReadThrottleState(
        properties, reservation.accountKey, now, policy.accountWindowMs, "ACCOUNT", policy
      );
      const accountFinal = auth01DecodeThrottleFinalization(accountState.finalizations[reservation.reservationId]);
      if (accountFinal && accountFinal.outcome !== outcome) {
        throw auth01Error("AUTH01_THROTTLE_FINALIZATION_CONFLICT", "Authentication service is temporarily unavailable.");
      }
      const accountReserved = !!accountState.reservations[reservation.reservationId];
      if (!accountFinal && accountReserved) {
        delete accountState.reservations[reservation.reservationId];
        accountState.finalizations[reservation.reservationId] = auth01EncodeThrottleFinalization(outcome, now);
        if (outcome === "success") {
          accountState.failures = 0;
          accountState.backoffLevel = 0;
          accountState.blockedUntil = 0;
          accountState.status = "OPEN";
          accountState.windowStartedAt = now;
          auth01CacheClear(cache, reservation.accountKey);
        } else if (outcome === "failure") {
          auth01ApplyThrottleFailure(
            accountState, now, policy.accountFailureThreshold,
            policy.accountWindowMs,
            policy.accountInitialCooldownMs, policy.accountMaximumCooldownMs
          );
        }
      }
      auth01WriteThrottleState(properties, reservation.accountKey, accountState, now, "ACCOUNT", policy);
      auth01CacheBlock(cache, reservation.accountKey, accountState.blockedUntil, now);
    }
  } catch (error) {
    if (error && /^AUTH01_/.test(String(error.code || ""))) throw error;
    throw auth01Error("AUTH01_THROTTLE_STORE_UNAVAILABLE", "Authentication service is temporarily unavailable.");
  } finally {
    lock.releaseLock();
  }
}

function auth01DummyModernCredential(options) {
  const policy = auth01CredentialPolicy(options);
  return auth01EncodeModernCredential(
    policy.iterations, new Array(16).fill(0), new Array(32).fill(0)
  );
}

function auth01RuntimeOptions() {
  // Production code has no request-controlled override. Unit/benchmark harnesses
  // may replace this function inside their isolated VM only.
  return null;
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
  let reservation = null;
  let finalized = false;
  const authRequestId = auth01RequestCorrelationId(data);
  const respond = payload => auth01CorrelatedJsonOutput(payload, authRequestId);
  try {
    const username = String(data.username || "");
    const password = String(data.password || "");
    const canonicalUsername = auth01CanonicalUsername(username);
    const users = readUsersFromSheet();
    if (auth01FindCanonicalUsernameCollisions(users).length) {
      throw auth01Error("AUTH01_USERNAME_COLLISION", "Authentication service is temporarily unavailable.");
    }
    let user = users.find(item => auth01CanonicalUsername(item.username) === canonicalUsername) || null;
    const runtimeOptions = auth01RuntimeOptions() || {};
    // Key continuity is a service-wide precondition, including unknown-user
    // attempts, so a broken identifier namespace cannot become an enumeration
    // oracle or create fresh epoch-zero state.
    auth01IdentifierKeyBytes(runtimeOptions);
    reservation = auth01ReserveLoginAttempt(user ? user.username : "", runtimeOptions);
    if (!reservation.allowed) {
      return respond({
        status: "error",
        message: "Invalid username or password."
      });
    }

    const verification = user
      ? auth01VerifyCredential(user, password, Object.assign({}, runtimeOptions, {
        allowLegacyPlaintext: !!runtimeOptions.allowLegacyPlaintext
      }))
      : auth01VerifyCredential(
        { password: "", passwordHash: auth01DummyModernCredential(runtimeOptions) },
        password,
        runtimeOptions
      );
    // Verification-class requests always pay at least one active-policy PBKDF2.
    // Throttle-denied requests are a separate class and perform no KDF. This
    // narrows user/credential-state timing without turning global denial into a
    // PBKDF2 amplification path.
    if (user && verification.state !== AUTH01_CREDENTIAL_STATES.MODERN_V1) {
      auth01RunDummyModernVerification(password, runtimeOptions);
    }
    if (!user || !verification.ok) {
      auth01FinalizeLoginAttempt(reservation, "failure", runtimeOptions);
      finalized = true;
      return respond({ status: "error", message: "Invalid username or password." });
    }
    if (verification.migrationEligible) {
      user = auth01MigrateCredential(user, password, verification, runtimeOptions);
    }
    auth01FinalizeLoginAttempt(reservation, "success", runtimeOptions);
    finalized = true;
    const session = createSessionForUser(user);

    logActivity(
      { sessionToken: session.token },
      "login",
      "system",
      user.username,
      `User logged in: ${user.displayName || user.username}`
    );

    return respond({
      status: "success",
      user: sanitizeUser(user),
      sessionToken: session.token,
      expiresAt: session.expiresAt,
      sessionCreated: true
    });
  } catch (error) {
    if (reservation && reservation.allowed && !finalized) {
      try { auth01FinalizeLoginAttempt(reservation, "system", auth01RuntimeOptions() || {}); }
      catch (finalizeError) {}
    }
    if (error && /^USERS_SCHEMA_/.test(String(error.code || ""))) {
      return respond({
        status: "error",
        code: "AUTHENTICATION_SERVICE_UNAVAILABLE",
        message: "Authentication service is temporarily unavailable."
      });
    }
    if (error && /^AUTH01_/.test(String(error.code || ""))) {
      return respond({
        status: "error",
        code: "AUTHENTICATION_SERVICE_UNAVAILABLE",
        message: "Authentication service is temporarily unavailable."
      });
    }
    return respond({ status: "error", message: "Authentication service is temporarily unavailable." });
  }
}

function logoutUser(data) {
  const request = data || {};
  const authRequestId = auth01RequestCorrelationId(request);
  const respond = payload => auth01CorrelatedJsonOutput(payload, authRequestId);
  let actor = { userName: "system", displayName: "system" };
  try { actor = getActor(request); } catch (error) {}

  const revocation = revokeSession(getSessionToken(request));
  if (!revocation.ok || !revocation.revoked) {
    return respond({
      status: "error",
      code: revocation.code || "SESSION_REVOCATION_FAILED",
      revoked: false,
      message: "Session revocation could not be confirmed. Please retry."
    });
  }

  try {
    logActivity(
      request,
      "logout",
      "system",
      actor.userName,
      `User logged out: ${actor.displayName || actor.userName}`
    );
  } catch (error) {
    Logger.log("Logout activity log failed: " + error.message);
  }

  return respond({
    status: "success",
    revoked: true,
    alreadyRevoked: !!revocation.alreadyRevoked,
    cacheRemovalAttempted: !!revocation.cacheRemovalAttempted,
    cacheRemovalFailed: !!revocation.cacheRemovalFailed
  });
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
    if (users.some(user => auth01CanonicalUsername(user.username) === auth01CanonicalUsername(username))) {
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
      createModernCredential(password, auth01RuntimeOptions() || undefined)
    ]);
    SpreadsheetApp.flush();
    const persistedRow = sheet.getLastRow();
    const persisted = sheet.getRange(persistedRow, 1, 1, 6).getValues()[0];
    const persistedUser = {
      username: String(persisted[0] || "").trim(),
      password: String(persisted[1] || ""),
      passwordHash: String(persisted[5] || "").trim()
    };
    if (auth01CanonicalUsername(persistedUser.username) !== auth01CanonicalUsername(username) ||
        persistedUser.password !== "" ||
        !auth01VerifyCredential(persistedUser, password, auth01RuntimeOptions() || undefined).ok) {
      throw auth01Error("AUTH01_USER_CREATE_WRITE_UNPROVEN", "User credential write could not be verified.");
    }

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

    if (password) auth01ReplaceCredential(
      user, password, Object.assign({}, auth01RuntimeOptions() || {}, { sheet })
    );
    sheet.getRange(user.rowNumber, 3, 1, 2).setValues([[
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

  const width = Math.max(6, sheet.getLastColumn());
  const headers = sheet.getRange(1, 1, 1, width).getValues()[0].map((value) =>
    String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_"));
  const preparationIndex = headers.indexOf("PREPARATION_MINUTES");
  const cleanupIndex = headers.indexOf("CLEANUP_MINUTES");
  const rows = sheet.getRange(2, 1, lastRow - 1, width).getValues();

  const services = rows
    .map((row, index) => ({
      name: String(row[0] || "").trim(),
      price: parseSheetAmount(row[1]),
      active: parseServiceActiveFlag(row[2]),
      order: Number(row[3]) || index + 1,
      serviceId: String(row[4] || "").trim(),
      durationMinutes: Math.max(15, Number(row[5]) || 30),
      preparationMinutes: preparationIndex >= 0 ? Math.max(0, Number(row[preparationIndex]) || 0) : 0,
      cleanupMinutes: cleanupIndex >= 0 ? Math.max(0, Number(row[cleanupIndex]) || 0) : 0
    }))
    .filter(service => service.name && service.active)
    .sort((a, b) => a.order - b.order)
    .map(service => ({
      name: service.name,
      price: service.price,
      serviceId: service.serviceId,
      durationMinutes: service.durationMinutes,
      preparationMinutes: service.preparationMinutes,
      cleanupMinutes: service.cleanupMinutes
    }));

  return jsonOutput({ status: "success", services });
}

function saveServices(data) {
  const permissionError = requirePermission(data, "edit_prices", "You do not have permission to edit prices.");
  if (permissionError) return permissionError;
  return withBookingMutationLock({
    bookingRequestId: String(data.clientRequestId || "SERVICES").trim()
  }, () => {

  const sheet = SpreadsheetApp.getActive().getSheetByName("SERVICES");
  if (!sheet) {
    return jsonOutput({ status: "error", message: "Sheet SERVICES not found" });
  }

  const services = Array.isArray(data.services) ? data.services : [];
  const lastRow = sheet.getLastRow();
  const width = Math.max(6, sheet.getLastColumn());
  const headers = sheet.getRange(1, 1, 1, width).getValues()[0].map((value) =>
    String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_"));
  const preparationIndex = headers.indexOf("PREPARATION_MINUTES");
  const cleanupIndex = headers.indexOf("CLEANUP_MINUTES");
  const existingRows = lastRow > 1
    ? sheet.getRange(2, 1, lastRow - 1, width).getValues()
    : [];
  const existingIds = {};

  existingRows.forEach((row) => {
    const name = String(row[0] || "").trim().toLowerCase();
    const serviceId = String(row[4] || "").trim();
    if (name && serviceId) existingIds[name] = {
      serviceId,
      durationMinutes: Math.max(15, Number(row[5]) || 30),
      preparationMinutes: preparationIndex >= 0 ? Math.max(0, Number(row[preparationIndex]) || 0) : 0,
      cleanupMinutes: cleanupIndex >= 0 ? Math.max(0, Number(row[cleanupIndex]) || 0) : 0
    };
  });

  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, width).clearContent();
  }

  const rows = services
    .filter(service => String(service.name || "").trim())
    .map((service, index) => {
      const name = String(service.name || "").trim();
      const existing = existingIds[name.toLowerCase()] || {};
      const row = new Array(width).fill("");
      row[0] = name;
      row[1] = parseSheetAmount(service.price);
      row[2] = "TRUE";
      row[3] = index + 1;
      row[4] = String(service.serviceId || existing.serviceId || `SRV-${Utilities.getUuid()}`).trim();
      row[5] = Math.max(15, Number(service.durationMinutes) || existing.durationMinutes || 30);
      if (preparationIndex >= 0) {
        row[preparationIndex] = Math.max(0,
          service.preparationMinutes === undefined
            ? Number(existing.preparationMinutes) || 0 : Number(service.preparationMinutes) || 0);
      }
      if (cleanupIndex >= 0) {
        row[cleanupIndex] = Math.max(0,
          service.cleanupMinutes === undefined
            ? Number(existing.cleanupMinutes) || 0 : Number(service.cleanupMinutes) || 0);
      }
      return row;
    });

  const responseServices = rows.map(row => ({
      name: row[0],
      price: row[1],
      serviceId: row[4],
      durationMinutes: row[5],
      preparationMinutes: preparationIndex >= 0 ? Number(row[preparationIndex]) || 0 : 0,
      cleanupMinutes: cleanupIndex >= 0 ? Number(row[cleanupIndex]) || 0 : 0
    }));
  const writeServices = () => {
    if (rows.length > 0) sheet.getRange(2, 1, rows.length, width).setValues(rows);
  };
  if (typeof bookingAvailabilityPhase5RunTransaction === "function" &&
      bookingAvailabilityEngineMode() === "PHASE5") {
    const requestId = String(data.clientRequestId || "SERVICES-SAVE").trim();
    const actor = bookingAvailabilityPhase5Actor(data, true);
    const result = bookingAvailabilityPhase5RunTransaction({
      data, requestId, action: "SERVICE_CONFIGURATION_SAVE",
      entityType: "SERVICES", entityId: "SERVICES", actor,
      beforeState: { rows: existingRows },
      business: () => { writeServices(); SpreadsheetApp.flush(); return { services: responseServices }; },
      version: () => bookingAvailabilityPhase5IncrementGeneration(
        "service", "GLOBAL", "GLOBAL", actor, requestId),
      audit: () => bookingAvailabilityPhase5AppendAudit({
        action: "SERVICE_CONFIGURATION_SAVED", entityType: "SERVICES",
        entityId: "SERVICES", actorId: actor ? actor.actorId : "system",
        actorRole: actor ? actor.role : "SYSTEM", reasonCode: "SERVICE_CONFIGURATION",
        beforeState: { count: existingRows.length }, afterState: { count: rows.length },
        requestId
      }),
      compensateBusiness: () => {
        if (existingRows.length) {
          sheet.getRange(2, 1, existingRows.length, width).setValues(existingRows);
        }
        if (rows.length > existingRows.length) {
          const surplus = rows.slice(existingRows.length).map(row => {
            const copy = row.slice(); copy[2] = "FALSE"; return copy;
          });
          sheet.getRange(2 + existingRows.length, 1, surplus.length, width).setValues(surplus);
        }
        SpreadsheetApp.flush();
      },
      response: value => value
    });
    logActivity(data, "update", "services", "SERVICES",
      `Saved services list. Total services: ${rows.length}`);
    return jsonOutput({ status: "success", services: result.services });
  }
  writeServices();
  logActivity(data, "update", "services", "SERVICES",
    `Saved services list. Total services: ${rows.length}`);
  if (typeof bookingAvailabilityPhase5AfterGlobalServiceMutationUnderLock === "function") {
    bookingAvailabilityPhase5AfterGlobalServiceMutationUnderLock(data);
  }
  return jsonOutput({ status: "success", services: responseServices });
  });
}

const CORE_AUTH_PREVIEW_SHEETS = [
  {
    name: "USERS",
    role: "AUTHENTICATION",
    minimumColumns: 6,
    fieldsByPosition: [
      "USERNAME", "PASSWORD", "DISPLAY_NAME", "PERMISSIONS", "CREATED_AT", "PASSWORD_HASH"
    ]
  },
  {
    name: "ACTIVITY_LOG",
    role: "LOGIN_AUDIT_OPTIONAL_AT_RUNTIME",
    minimumColumns: 8,
    fieldsByPosition: [
      "LOG_ID", "ACTION", "ENTITY_TYPE", "ENTITY_ID", "USERNAME", "DISPLAY_NAME",
      "DETAILS", "CREATED_AT"
    ]
  },
  {
    name: "DATA",
    role: "DEFAULT_OWNER_DASHBOARD",
    minimumColumns: 13,
    fieldsByPosition: [
      "DATE_TIME", "CUSTOMER_NAME", "CUSTOMER_PHONE", "SERVICES", "PDF_URL", "TOTAL",
      "PAID_AMOUNT", "TIP_AMOUNT", "PAYMENT_METHOD", "BARBER", "NOTE",
      "DISCOUNT_PERCENT", "DISCOUNT_AMOUNT"
    ]
  },
  {
    name: "DAILY_CLOSINGS",
    role: "DEFAULT_OWNER_DASHBOARD",
    minimumColumns: 13,
    fieldsByPosition: [
      "CLOSING_ID", "DATE", "SALES_TOTAL", "CASH_TOTAL", "VISA_TOTAL", "INSTAPAY_TOTAL",
      "VODAFONE_CASH_TOTAL", "EXPENSES_TOTAL", "WITHDRAWALS_TOTAL", "NET_TOTAL",
      "CLOSED_BY_USERNAME", "CLOSED_BY_DISPLAY_NAME", "CLOSED_AT"
    ]
  },
  {
    name: "EXPENSES",
    role: "DEFAULT_OWNER_DASHBOARD_TOTALS",
    minimumColumns: 6,
    fieldsByPosition: ["CATEGORY", "AMOUNT", "TITLE", "NOTE", "DATE", "EXPENSE_ID"]
  },
  {
    name: "WITHDRAWLS",
    role: "DEFAULT_OWNER_DASHBOARD_TOTALS",
    minimumColumns: 5,
    fieldsByPosition: ["STAFF_NAME", "AMOUNT", "NOTE", "DATE", "WITHDRAWAL_ID"]
  }
];

function coreAuthPreviewAssertStagingOwner() {
  const config = getCutHubEnvironmentConfig();
  if (String(config.environment || "").trim().toLowerCase() !== "staging") {
    throw new Error("CORE_AUTH_PREVIEW_STAGING_ONLY");
  }
  if (
    !CUT_HUB_SPREADSHEET_ID_PATTERN.test(config.spreadsheetId) ||
    !CUT_HUB_SPREADSHEET_ID_PATTERN.test(config.stagingSpreadsheetId) ||
    config.spreadsheetId !== config.stagingSpreadsheetId
  ) {
    throw new Error("CORE_AUTH_PREVIEW_STAGING_IDENTITY_INVALID");
  }

  const strict = assertStagingEnvironment();
  let effectiveEmail = "";
  let activeEmail = "";
  let ownerEmail = "";
  try {
    effectiveEmail = String(Session.getEffectiveUser().getEmail() || "").trim().toLowerCase();
    activeEmail = String(Session.getActiveUser().getEmail() || "").trim().toLowerCase();
    const owner = DriveApp.getFileById(strict.spreadsheet.getId()).getOwner();
    ownerEmail = String(owner && owner.getEmail ? owner.getEmail() : "").trim().toLowerCase();
  } catch (error) {
    effectiveEmail = "";
    activeEmail = "";
    ownerEmail = "";
  }
  if (!effectiveEmail || !activeEmail || !ownerEmail ||
      effectiveEmail !== activeEmail || activeEmail !== ownerEmail) {
    throw new Error("CORE_AUTH_PREVIEW_OWNER_REQUIRED");
  }
  return {
    config: strict.config,
    spreadsheet: strict.spreadsheet,
    actorIdentity: effectiveEmail
  };
}

function coreAuthPreviewSheetState(spreadsheet, definition) {
  const sheet = spreadsheet.getSheetByName(definition.name);
  if (!sheet) {
    return {
      sheetName: definition.name,
      role: definition.role,
      exists: false,
      compatible: false,
      minimumColumns: definition.minimumColumns,
      missingColumns: definition.fieldsByPosition.map((field, index) => ({
        column: index + 1,
        field
      })),
      headerContract: definition.name === "USERS"
        ? "Columns 1-5 are positional; only column 6 has a literal header check in runtime source."
        : "Positional runtime contract; header labels are not validated by runtime source."
    };
  }

  const lastColumn = Math.max(0, Number(sheet.getLastColumn()) || 0);
  const width = Math.max(1, Math.min(definition.minimumColumns, lastColumn || definition.minimumColumns));
  const headers = sheet.getRange(1, 1, 1, width).getValues()[0]
    .map(value => String(value || "").trim());
  const missingColumns = definition.fieldsByPosition
    .map((field, index) => ({ column: index + 1, field }))
    .filter(item => item.column > lastColumn);
  const headerIssues = [];
  if (definition.name === "USERS" && lastColumn >= 6 && headers[5] !== "PASSWORD_HASH") {
    headerIssues.push({ column: 6, expected: "PASSWORD_HASH", actual: headers[5] || "" });
  }

  return {
    sheetName: definition.name,
    role: definition.role,
    exists: true,
    compatible: missingColumns.length === 0 && headerIssues.length === 0,
    minimumColumns: definition.minimumColumns,
    actualColumns: lastColumn,
    missingColumns,
    headerIssues,
    headerContract: definition.name === "USERS"
      ? "Columns 1-5 are positional; only column 6 has a literal header check in runtime source."
      : "Positional runtime contract; header labels are not validated by runtime source."
  };
}

function coreAuthPreviewOwnerState(spreadsheet) {
  const sheet = spreadsheet.getSheetByName("USERS");
  if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) {
    return {
      exists: false,
      credentialState: "NO_OWNER_RECORD",
      requiredFieldsPresent: false
    };
  }
  const width = Math.min(6, Math.max(1, sheet.getLastColumn()));
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, width).getValues();
  const owner = rows.find(row => String(row[0] || "").trim().toLowerCase() === "owner");
  if (!owner) {
    return {
      exists: false,
      credentialState: "NO_OWNER_RECORD",
      requiredFieldsPresent: false
    };
  }
  const hasPlaintext = Boolean(String(owner[1] || ""));
  const hasHash = Boolean(String(owner[5] || "").trim());
  return {
    exists: true,
    usernameIsCanonicalOwner: true,
    displayNamePresent: Boolean(String(owner[2] || "").trim()),
    permissionsStored: Boolean(String(owner[3] || "").trim()),
    createdAtPresent: Boolean(owner[4]),
    credentialState: hasHash && hasPlaintext
      ? "HASHED_WITH_PLAINTEXT_RETAINED"
      : (hasHash ? "HASHED_ONLY" : (hasPlaintext ? "PLAINTEXT_LEGACY" : "MISSING")),
    requiredFieldsPresent: hasHash || hasPlaintext
  };
}

function legacyPreviewStagingAuthenticationInitialization() {
  const identity = coreAuthPreviewAssertStagingOwner();
  const sheetStates = CORE_AUTH_PREVIEW_SHEETS.map(definition =>
    coreAuthPreviewSheetState(identity.spreadsheet, definition));
  const ownerRecord = coreAuthPreviewOwnerState(identity.spreadsheet);
  const missingCoreSheets = sheetStates.filter(item => !item.exists).map(item => item.sheetName);
  const incompatibleSheets = sheetStates.filter(item => item.exists && !item.compatible)
    .map(item => item.sheetName);
  const usersState = sheetStates.find(item => item.sheetName === "USERS");
  const initializationRequired = missingCoreSheets.length > 0 || !ownerRecord.exists;
  const blockers = [];
  if (initializationRequired) blockers.push("NO_APPROVED_CORE_BOOTSTRAP_EXISTS");
  if (!usersState.exists) blockers.push("USERS_COLUMNS_1_TO_5_HAVE_NO_LITERAL_CANONICAL_HEADERS_IN_SOURCE");
  if (incompatibleSheets.length) blockers.push("EXISTING_CORE_SHEET_INCOMPATIBLE");

  return {
    schemaVersion: "CORE_AUTH_PREVIEW_V2",
    dryRun: true,
    writes: 0,
    identity: {
      environment: identity.config.environment,
      expectedSpreadsheetId: identity.config.spreadsheetId,
      stagingSpreadsheetId: identity.config.stagingSpreadsheetId,
      actualSpreadsheetId: identity.spreadsheet.getId(),
      actorIdentity: identity.actorIdentity
    },
    canonicalAuthenticationSheet: "USERS",
    usersRuntimeColumnContract: CORE_AUTH_PREVIEW_SHEETS[0].fieldsByPosition.map((field, index) => ({
      column: index + 1,
      field,
      literalHeaderRequiredBySource: index === 5 ? "PASSWORD_HASH" : null
    })),
    missingCoreSheets,
    missingColumns: sheetStates.filter(item => item.missingColumns.length).map(item => ({
      sheetName: item.sheetName,
      columns: item.missingColumns
    })),
    existingCompatibleSheets: sheetStates.filter(item => item.compatible).map(item => item.sheetName),
    incompatibleSheets,
    sheetStates,
    requiredInitialOwnerRecordFields: [
      { column: 1, field: "USERNAME", requiredValue: "owner", requiredForLogin: true },
      { column: 2, field: "PASSWORD", requiredValue: "blank for a new secure record", requiredForLogin: false },
      { column: 3, field: "DISPLAY_NAME", requiredValue: "non-empty display name", requiredForLogin: false },
      { column: 4, field: "PERMISSIONS", requiredValue: "owner permissions are implicit", requiredForLogin: false },
      { column: 5, field: "CREATED_AT", requiredValue: "creation timestamp", requiredForLogin: false },
      { column: 6, field: "PASSWORD_HASH", requiredValue: "canonical cuthub$1 modern credential", requiredForLogin: true }
    ],
    passwordStorage: {
      hashAlgorithm: "PBKDF2-HMAC-SHA-256",
      credentialFormat: "cuthub$1",
      candidateIterations: AUTH01_CREDENTIAL_POLICY.iterations,
      stagingBenchmarkRequired: true,
      salted: true,
      plaintextFallbackAccepted: false,
      successfulLegacyLoginMigratesForward: true,
      successfulLegacyLoginClearsPlaintext: true,
      ownerRecord
    },
    initializationRequired,
    safeToInitialize: !initializationRequired && incompatibleSheets.length === 0,
    blockers
  };
}

const INVENTORY_SHEETS = {
  items: "INVENTORY_ITEMS",
  batches: "INVENTORY_BATCHES",
  recipes: "SERVICE_RECIPES",
  log: "INVENTORY_LOG",
  invoiceItems: "INVOICE_ITEMS"
};

function inventorySheet(name) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sheet) throw new Error(`Sheet ${name} not found`);
  return sheet;
}

function inventoryText(value) {
  return String(value === null || value === undefined ? "" : value).trim();
}

function normalizeSheetHeader(value) {
  return inventoryText(value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[\s_-]+/g, "");
}

function schemaContractError(code, message, details) {
  const error = new Error(message);
  error.code = code;
  if (details !== undefined) error.details = details;
  return error;
}

function inspectPositionalSheetSchema(sheet, options) {
  const contract = options.contract || [];
  const lastColumn = sheet && typeof sheet.getLastColumn === "function"
    ? sheet.getLastColumn() : 0;
  if (lastColumn < contract.length) {
    throw schemaContractError(
      options.notReadyCode,
      `${options.label} schema is missing required columns.`,
      { sheetName: options.sheetName, requiredColumns: contract.length, actualColumns: lastColumn }
    );
  }

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const normalized = headers.map(normalizeSheetHeader);
  const duplicateNormalized = normalized.filter((header, index) =>
    header && normalized.indexOf(header) !== index);
  if (duplicateNormalized.length) {
    throw schemaContractError(
      options.duplicateCode,
      `${options.label} schema contains duplicate headers.`,
      { sheetName: options.sheetName, headers: [...new Set(duplicateNormalized)] }
    );
  }

  contract.forEach((field, index) => {
    const accepted = (field.aliases || [field.name]).map(normalizeSheetHeader);
    const matches = normalized.reduce((result, header, headerIndex) => {
      if (accepted.indexOf(header) !== -1) result.push(headerIndex + 1);
      return result;
    }, []);
    if (matches.length > 1) {
      throw schemaContractError(
        options.duplicateCode,
        `${options.label} schema contains an ambiguous ${field.name} header.`,
        { sheetName: options.sheetName, header: field.name, columns: matches }
      );
    }
    if (accepted.indexOf(normalized[index]) === -1) {
      throw schemaContractError(
        options.incompatibleCode,
        `${options.label} protected header ${field.name} is missing or displaced.`,
        { sheetName: options.sheetName, header: field.name, expectedColumn: index + 1 }
      );
    }
  });

  return { headers, normalized };
}

function inspectNamedSheetSchema(sheet, options) {
  const lastColumn = sheet && typeof sheet.getLastColumn === "function"
    ? sheet.getLastColumn() : 0;
  if (lastColumn < 1) {
    throw schemaContractError(
      options.notReadyCode,
      `${options.label} schema is not initialized.`,
      { sheetName: options.sheetName }
    );
  }
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    .map((header) => String(header || "").trim());
  const canonicalize = options.canonicalize || normalizeSheetHeader;
  const keys = headers.map(canonicalize);
  const duplicateKeys = keys.filter((key, index) => key && keys.indexOf(key) !== index);
  if (duplicateKeys.length) {
    throw schemaContractError(
      options.duplicateCode,
      `${options.label} schema contains duplicate or ambiguous headers.`,
      { sheetName: options.sheetName, headers: [...new Set(duplicateKeys)] }
    );
  }
  const expectedKeys = (options.expectedHeaders || []).map(canonicalize);
  const missing = expectedKeys.filter((key) => keys.indexOf(key) === -1);
  if (missing.length) {
    throw schemaContractError(
      options.notReadyCode,
      `${options.label} schema is missing required headers.`,
      { sheetName: options.sheetName, missingHeaders: missing }
    );
  }
  return { headers, keys };
}

function findEquivalentHeaderColumn(headers, aliases) {
  const accepted = aliases.map(normalizeSheetHeader);
  for (let index = 0; index < headers.length; index += 1) {
    if (accepted.indexOf(normalizeSheetHeader(headers[index])) !== -1) return index + 1;
  }
  return 0;
}

function findSheetHeaderColumn(sheet, aliases, minimumWidth) {
  if (!sheet || typeof sheet.getRange !== "function") return 0;
  const lastColumn = typeof sheet.getLastColumn === "function" ? sheet.getLastColumn() : 0;
  const maxColumns = typeof sheet.getMaxColumns === "function" ? sheet.getMaxColumns() : 0;
  const desiredWidth = Math.max(Number(minimumWidth) || 0, lastColumn);
  const physicalWidth = maxColumns || lastColumn;
  const width = physicalWidth ? Math.min(physicalWidth, desiredWidth) : desiredWidth;
  if (width < 1) return 0;
  return findEquivalentHeaderColumn(
    sheet.getRange(1, 1, 1, width).getValues()[0],
    aliases
  );
}

function ensureSheetHeaderColumn(sheet, aliases, canonicalHeader, preferredColumn) {
  const existingColumn = findSheetHeaderColumn(sheet, aliases, preferredColumn);
  if (existingColumn) return existingColumn;

  const lastColumn = typeof sheet.getLastColumn === "function" ? sheet.getLastColumn() : 0;
  const targetColumn = lastColumn < preferredColumn ? preferredColumn : lastColumn + 1;
  const maxColumns = sheet.getMaxColumns();
  if (maxColumns < targetColumn) {
    sheet.insertColumnsAfter(maxColumns, targetColumn - maxColumns);
  }
  sheet.getRange(1, targetColumn).setValue(canonicalHeader);
  return targetColumn;
}

const INVOICE_REQUEST_ID_HEADER_ALIASES = [
  "invoice request id",
  "invoiceRequestId",
  "invoice idempotency key",
  "client request id",
  "request id",
  "idempotency key"
];

const BALANCE_BEFORE_HEADER_ALIASES = [
  "balanceBefore",
  "balance before",
  "previous balance",
  "stock balance before",
  "opening balance"
];

const BARBER_ID_HEADER_ALIASES = ["barberId", "barber id"];
const BARBER_NAME_HEADER_ALIASES = ["barberName", "barber name"];

function inventoryNumber(value) {
  const number = Number(String(value === null || value === undefined ? "" : value).replace(/,/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function inventoryQuantity(value) {
  return Math.round((inventoryNumber(value) + Number.EPSILON) * 1000000) / 1000000;
}

function inventoryBoolean(value, fallback) {
  if (value === true || value === false) return value;
  const text = inventoryText(value).toUpperCase();
  if (!text) return fallback;
  return ["TRUE", "YES", "Y", "1"].indexOf(text) !== -1;
}

function inventoryRows(sheet, width) {
  const lastRow = sheet.getLastRow();
  return lastRow < 2 ? [] : sheet.getRange(2, 1, lastRow - 1, width).getValues();
}

function readInventoryItems() {
  return inventoryRows(inventorySheet(INVENTORY_SHEETS.items), 15)
    .map((row, index) => ({
      rowNumber: index + 2,
      itemId: inventoryText(row[0]),
      name: inventoryText(row[1]),
      category: inventoryText(row[2]),
      itemType: inventoryText(row[3]) || "consumable",
      usageUnit: inventoryText(row[4]) || "piece",
      packageSize: inventoryNumber(row[5]),
      purchasePrice: inventoryNumber(row[6]),
      salePrice: inventoryNumber(row[7]),
      serviceEnabled: inventoryBoolean(row[8], true),
      saleEnabled: inventoryBoolean(row[9], false),
      minimumStock: inventoryNumber(row[10]),
      barcode: inventoryText(row[11]),
      active: inventoryBoolean(row[12], true),
      createdAt: inventoryText(row[13]),
      updatedAt: inventoryText(row[14])
    }))
    .filter((item) => item.itemId && item.name);
}

function readInventoryBatches() {
  return inventoryRows(inventorySheet(INVENTORY_SHEETS.batches), 15)
    .map((row, index) => ({
      rowNumber: index + 2,
      batchId: inventoryText(row[0]),
      itemId: inventoryText(row[1]),
      purchaseDate: getDateKey(row[2], TIME_ZONE) || inventoryText(row[2]),
      supplier: inventoryText(row[3]),
      purchasedPacks: inventoryNumber(row[4]),
      packageSize: inventoryNumber(row[5]),
      usageUnit: inventoryText(row[6]),
      sealedPacks: inventoryNumber(row[7]),
      openedPacks: inventoryNumber(row[8]),
      openedQuantity: inventoryNumber(row[9]),
      purchasePrice: inventoryNumber(row[10]),
      expiryDate: getDateKey(row[11], TIME_ZONE) || inventoryText(row[11]),
      status: inventoryText(row[12]) || "active",
      createdAt: inventoryText(row[13]),
      updatedAt: inventoryText(row[14])
    }))
    .filter((batch) => batch.batchId && batch.itemId);
}

function ensureInventoryLogBarberColumns() {
  const sheet = inventorySheet(INVENTORY_SHEETS.log);
  const barberIdColumn = ensureSheetHeaderColumn(sheet, BARBER_ID_HEADER_ALIASES, "barberId", 16);
  const barberNameColumn = ensureSheetHeaderColumn(sheet, BARBER_NAME_HEADER_ALIASES, "barberName", 17);
  const balanceBeforeColumn = ensureSheetHeaderColumn(
    sheet,
    BALANCE_BEFORE_HEADER_ALIASES,
    "balanceBefore",
    18
  );
  return {
    sheet,
    barberIdColumn,
    barberNameColumn,
    balanceBeforeColumn,
    width: Math.max(15, barberIdColumn, barberNameColumn, balanceBeforeColumn)
  };
}

function readInventoryLog(limit) {
  const logColumns = ensureInventoryLogBarberColumns();
  const rows = inventoryRows(logColumns.sheet, logColumns.width)
    .map((row) => ({
      transactionId: inventoryText(row[0]),
      dateTime: inventoryText(row[1]),
      itemId: inventoryText(row[2]),
      itemName: inventoryText(row[3]),
      batchId: inventoryText(row[4]),
      movementType: inventoryText(row[5]),
      stockBucket: inventoryText(row[6]),
      quantity: inventoryNumber(row[7]),
      unit: inventoryText(row[8]),
      invoiceId: inventoryText(row[9]),
      serviceId: inventoryText(row[10]),
      username: inventoryText(row[11]),
      balanceAfter: inventoryNumber(row[12]),
      note: inventoryText(row[13]),
      requestId: inventoryText(row[14]),
      barberId: inventoryText(row[logColumns.barberIdColumn - 1]),
      barberName: inventoryText(row[logColumns.barberNameColumn - 1]),
      balanceBefore: inventoryText(row[logColumns.balanceBeforeColumn - 1]) === ""
        ? null
        : inventoryNumber(row[logColumns.balanceBeforeColumn - 1])
    }))
    .filter((entry) => entry.transactionId)
    .reverse();

  return rows.slice(0, Math.max(1, Number(limit) || 200));
}

function isInventoryBatchUsable(batch) {
  if (!batch || batch.status === "deleted" || batch.status === "expired") return false;
  return !batch.expiryDate || batch.expiryDate >= getCairoDateKey();
}

function buildInventoryStock(items, batches) {
  const stock = {};
  items.forEach((item) => {
    stock[item.itemId] = {
      sealedPacks: 0,
      openedPacks: 0,
      openedQuantity: 0,
      totalQuantity: 0,
      stockValue: 0
    };
  });

  batches.forEach((batch) => {
    if (!stock[batch.itemId] || !isInventoryBatchUsable(batch)) return;
    const entry = stock[batch.itemId];
    entry.sealedPacks += batch.sealedPacks;
    entry.openedPacks += batch.openedPacks;
    entry.openedQuantity += batch.openedQuantity;
    entry.totalQuantity += (batch.sealedPacks * batch.packageSize) + batch.openedQuantity;
    const unitCost = batch.packageSize > 0 ? batch.purchasePrice / batch.packageSize : 0;
    entry.stockValue += (batch.sealedPacks * batch.purchasePrice) + (batch.openedQuantity * unitCost);
  });

  return stock;
}

function getInventoryData(data) {
  try {
    const permissionError = requirePermission(data, "view_inventory", "You do not have permission to view inventory.");
    if (permissionError) return permissionError;
    const items = readInventoryItems();
    const batches = readInventoryBatches();
    const stock = buildInventoryStock(items, batches);
    return jsonOutput({
      status: "success",
      items: items.map((item) => ({ ...item, stock: stock[item.itemId] || {} })),
      batches,
      log: readInventoryLog(data.limit)
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function getSellableProducts(data) {
  try {
    const permissionError = requirePermission(data, "access_cashier", "You do not have permission to view sellable products.");
    if (permissionError) return permissionError;
    const items = readInventoryItems().filter((item) => item.active && item.saleEnabled);
    const stock = buildInventoryStock(items, readInventoryBatches());
    return jsonOutput({
      status: "success",
      products: items.map((item) => ({
        itemId: item.itemId,
        name: item.name,
        salePrice: item.salePrice,
        sealedPacks: inventoryNumber(stock[item.itemId]?.sealedPacks)
      }))
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function saveInventoryItem(data) {
  try {
    const permissionError = requirePermission(data, "view_inventory", "You do not have permission to edit inventory.");
    if (permissionError) return permissionError;
    const input = data.item || data;
    const name = inventoryText(input.name);
    const packageSize = inventoryNumber(input.packageSize);
    if (!name) return jsonOutput({ status: "error", message: "Item name is required." });
    if (packageSize <= 0) return jsonOutput({ status: "error", message: "Package size must be greater than zero." });

    const sheet = inventorySheet(INVENTORY_SHEETS.items);
    const existing = readInventoryItems().find((item) => item.itemId === inventoryText(input.itemId));
    const now = getCairoDateTime();
    const itemId = existing ? existing.itemId : `ITM-${Utilities.getUuid()}`;
    const row = [
      itemId,
      name,
      inventoryText(input.category),
      inventoryText(input.itemType) || "consumable",
      inventoryText(input.usageUnit) || "piece",
      packageSize,
      inventoryNumber(input.purchasePrice),
      inventoryNumber(input.salePrice),
      inventoryBoolean(input.serviceEnabled, true),
      inventoryBoolean(input.saleEnabled, false),
      inventoryNumber(input.minimumStock),
      inventoryText(input.barcode),
      inventoryBoolean(input.active, true),
      existing ? existing.createdAt : now,
      now
    ];

    if (existing) sheet.getRange(existing.rowNumber, 1, 1, row.length).setValues([row]);
    else sheet.appendRow(row);

    logActivity(data, existing ? "update" : "create", "inventory_item", itemId, `${existing ? "Updated" : "Created"} inventory item: ${name}`);
    return jsonOutput({ status: "success", itemId });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function deleteInventoryItem(data) {
  try {
    const permissionError = requirePermission(data, "view_inventory", "You do not have permission to edit inventory.");
    if (permissionError) return permissionError;
    const itemId = inventoryText(data.itemId);
    const item = readInventoryItems().find((entry) => entry.itemId === itemId);
    if (!item) return jsonOutput({ status: "error", message: "Inventory item not found." });
    inventorySheet(INVENTORY_SHEETS.items).getRange(item.rowNumber, 13).setValue(false);
    inventorySheet(INVENTORY_SHEETS.items).getRange(item.rowNumber, 15).setValue(getCairoDateTime());
    logActivity(data, "delete", "inventory_item", itemId, `Disabled inventory item: ${item.name}`);
    return jsonOutput({ status: "success" });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function appendInventoryLog(entry) {
  const logColumns = ensureInventoryLogBarberColumns();
  const row = [
    entry.transactionId || `TXN-${Utilities.getUuid()}`,
    entry.dateTime || getCairoDateTime(),
    entry.itemId || "",
    entry.itemName || "",
    entry.batchId || "",
    entry.movementType || "",
    entry.stockBucket || "",
    inventoryNumber(entry.quantity),
    entry.unit || "",
    entry.invoiceId || "",
    entry.serviceId || "",
    entry.username || "",
    inventoryNumber(entry.balanceAfter),
    entry.note || "",
    entry.requestId || ""
  ];
  while (row.length < logColumns.width) row.push("");
  row[logColumns.barberIdColumn - 1] = entry.barberId || "";
  row[logColumns.barberNameColumn - 1] = entry.barberName || "";
  row[logColumns.balanceBeforeColumn - 1] = inventoryNumber(entry.balanceBefore);
  logColumns.sheet.appendRow(row);
}

function addInventoryPurchase(data) {
  const lock = LockService.getScriptLock();
  try {
    const permissionError = requirePermission(data, "view_inventory", "You do not have permission to add inventory purchases.");
    if (permissionError) return permissionError;
    lock.waitLock(30000);
    const input = data.purchase || data;
    const item = readInventoryItems().find((entry) => entry.itemId === inventoryText(input.itemId) && entry.active);
    if (!item) return jsonOutput({ status: "error", message: "Inventory item not found." });
    const packs = inventoryNumber(input.purchasedPacks);
    const packageSize = inventoryNumber(input.packageSize) || item.packageSize;
    const purchasePrice = inventoryNumber(input.purchasePrice);
    if (packs <= 0 || packageSize <= 0) return jsonOutput({ status: "error", message: "Purchase packs and package size must be greater than zero." });

    const previousStock = buildInventoryStock([item], readInventoryBatches())[item.itemId] || { totalQuantity: 0 };
    const batchId = `BAT-${Utilities.getUuid()}`;
    const now = getCairoDateTime();
    inventorySheet(INVENTORY_SHEETS.batches).appendRow([
      batchId,
      item.itemId,
      getDateKey(input.purchaseDate || getCairoDateKey(), TIME_ZONE) || getCairoDateKey(),
      inventoryText(input.supplier),
      packs,
      packageSize,
      item.usageUnit,
      packs,
      0,
      0,
      purchasePrice,
      getDateKey(input.expiryDate || "", TIME_ZONE) || "",
      "active",
      now,
      now
    ]);

    appendInventoryLog({
      itemId: item.itemId,
      itemName: item.name,
      batchId,
      movementType: "purchase",
      stockBucket: "sealed",
      quantity: packs,
      unit: "pack",
      username: getAuthenticatedUser(data)?.username || inventoryText(data.username),
      balanceAfter: previousStock.totalQuantity + (packs * packageSize),
      note: inventoryText(input.note),
      requestId: inventoryText(data.requestId || data.clientRequestId)
    });

    logActivity(data, "create", "inventory_purchase", batchId, `Purchased ${packs} pack(s) of ${item.name}`);
    return jsonOutput({ status: "success", batchId });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

function updateInventoryPurchase(data) {
  const lock = LockService.getScriptLock();
  try {
    const permissionError = requirePermission(data, "view_inventory", "You do not have permission to edit inventory purchases.");
    if (permissionError) return permissionError;
    lock.waitLock(30000);

    const input = data.purchase || data;
    const batch = readInventoryBatches().find((entry) => entry.batchId === inventoryText(input.batchId));
    if (!batch) return jsonOutput({ status: "error", message: "Inventory purchase not found." });
    const item = readInventoryItems().find((entry) => entry.itemId === batch.itemId);
    if (!item) return jsonOutput({ status: "error", message: "Inventory item not found." });

    const purchasedPacks = Math.floor(inventoryNumber(input.purchasedPacks));
    const committedPacks = Math.max(0, batch.purchasedPacks - batch.sealedPacks - batch.openedPacks);
    const minimumPacks = committedPacks + batch.openedPacks;
    if (purchasedPacks <= 0) return jsonOutput({ status: "error", message: "عدد العبوات يجب أن يكون أكبر من صفر." });
    if (purchasedPacks < minimumPacks) {
      return jsonOutput({
        status: "error",
        message: `لا يمكن تقليل عملية الشراء عن ${minimumPacks} عبوة لأن جزءًا منها تم استهلاكه بالفعل.`
      });
    }

    const newSealedPacks = purchasedPacks - committedPacks - batch.openedPacks;
    const now = getCairoDateTime();
    const updatedRow = [
      batch.batchId,
      batch.itemId,
      getDateKey(input.purchaseDate || batch.purchaseDate, TIME_ZONE) || batch.purchaseDate,
      inventoryText(input.supplier),
      purchasedPacks,
      batch.packageSize,
      batch.usageUnit,
      newSealedPacks,
      batch.openedPacks,
      batch.openedQuantity,
      inventoryNumber(input.purchasePrice),
      getDateKey(input.expiryDate || "", TIME_ZONE) || "",
      newSealedPacks <= 0 && batch.openedQuantity <= 0 ? "depleted" : "active",
      batch.createdAt,
      now
    ];
    inventorySheet(INVENTORY_SHEETS.batches).getRange(batch.rowNumber, 1, 1, updatedRow.length).setValues([updatedRow]);

    const currentStock = buildInventoryStock([item], readInventoryBatches())[item.itemId] || { totalQuantity: 0 };
    appendInventoryLog({
      itemId: item.itemId,
      itemName: item.name,
      batchId: batch.batchId,
      movementType: "purchase_edit",
      stockBucket: "sealed",
      quantity: newSealedPacks - batch.sealedPacks,
      unit: "pack",
      username: getAuthenticatedUser(data)?.username || inventoryText(data.username),
      balanceAfter: currentStock.totalQuantity,
      note: inventoryText(input.note) || `Purchase corrected from ${batch.purchasedPacks} to ${purchasedPacks} pack(s).`,
      requestId: inventoryText(data.requestId || data.clientRequestId)
    });
    logActivity(data, "update", "inventory_purchase", batch.batchId, `Updated purchase for ${item.name}: ${batch.purchasedPacks} -> ${purchasedPacks} pack(s)`);
    return jsonOutput({ status: "success", batchId: batch.batchId });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

function getServiceRecipes(data) {
  try {
    const permissionError = requirePermission(data, "view_inventory", "You do not have permission to view service recipes.");
    if (permissionError) return permissionError;
    const recipes = inventoryRows(inventorySheet(INVENTORY_SHEETS.recipes), 11)
      .map((row) => ({
        recipeId: inventoryText(row[0]),
        serviceId: inventoryText(row[1]),
        serviceName: inventoryText(row[2]),
        itemId: inventoryText(row[3]),
        itemName: inventoryText(row[4]),
        quantity: inventoryNumber(row[5]),
        unit: inventoryText(row[6]),
        usageType: inventoryText(row[7]) || "consume",
        active: inventoryBoolean(row[8], true),
        createdAt: inventoryText(row[9]),
        updatedAt: inventoryText(row[10])
      }))
      .filter((recipe) => recipe.recipeId && recipe.serviceId && recipe.itemId && recipe.active);
    return jsonOutput({ status: "success", recipes });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function saveServiceRecipe(data) {
  try {
    const permissionError = requirePermission(data, "view_inventory", "You do not have permission to edit service recipes.");
    if (permissionError) return permissionError;
    const serviceId = inventoryText(data.serviceId);
    const serviceName = inventoryText(data.serviceName);
    if (!serviceId || !serviceName) return jsonOutput({ status: "error", message: "Service is required." });
    const sheet = inventorySheet(INVENTORY_SHEETS.recipes);
    const existingRows = inventoryRows(sheet, 11);
    const keptRows = existingRows.filter((row) => inventoryText(row[1]) !== serviceId);
    const now = getCairoDateTime();
    const itemsById = {};
    readInventoryItems().forEach((item) => { itemsById[item.itemId] = item; });
    const recipeRows = (Array.isArray(data.ingredients) ? data.ingredients : [])
      .map((ingredient) => {
        const item = itemsById[inventoryText(ingredient.itemId)];
        const quantity = inventoryNumber(ingredient.quantity);
        if (!item || quantity <= 0) return null;
        return [
          `RCP-${Utilities.getUuid()}`,
          serviceId,
          serviceName,
          item.itemId,
          item.name,
          quantity,
          item.usageUnit,
          "consume",
          true,
          now,
          now
        ];
      })
      .filter(Boolean);

    const allRows = keptRows.concat(recipeRows);
    if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, 11).clearContent();
    if (allRows.length) sheet.getRange(2, 1, allRows.length, 11).setValues(allRows);
    logActivity(data, "update", "service_recipe", serviceId, `Saved inventory recipe for ${serviceName}. Ingredients: ${recipeRows.length}`);
    return jsonOutput({ status: "success", recipes: recipeRows.length });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function readActiveServiceRecipes() {
  return inventoryRows(inventorySheet(INVENTORY_SHEETS.recipes), 11)
    .map((row) => ({
      serviceId: inventoryText(row[1]),
      itemId: inventoryText(row[3]),
      quantity: inventoryNumber(row[5]),
      active: inventoryBoolean(row[8], true)
    }))
    .filter((recipe) => recipe.serviceId && recipe.itemId && recipe.quantity > 0 && recipe.active);
}

function inventoryBatchSortKey(batch) {
  return `${batch.expiryDate || "9999-12-31"}|${batch.purchaseDate || "9999-12-31"}|${batch.rowNumber}`;
}

function prepareInventoryCheckout(data) {
  const lines = Array.isArray(data.invoiceItems) ? data.invoiceItems : [];
  if (!lines.length) {
    return { enabled: false, lines: [], batchUpdates: [], newBatches: [], movements: [], insufficientItems: [] };
  }

  const allowNegativeInventory = data.allowNegativeInventory === true
    || String(data.allowNegativeInventory || "").trim().toLowerCase() === "true";
  const items = readInventoryItems();
  const itemsById = {};
  items.forEach((item) => { itemsById[item.itemId] = item; });
  const recipes = readActiveServiceRecipes();
  const batches = readInventoryBatches().map((batch) => ({ ...batch }));
  const stockBefore = buildInventoryStock(items, batches);
  const serviceRequirements = {};
  const productRequirements = {};

  lines.forEach((line) => {
    const lineQuantity = Math.max(1, inventoryQuantity(line.quantity) || 1);
    if (inventoryText(line.lineType) === "product") {
      const itemId = inventoryText(line.referenceId || line.itemId);
      if (!itemId) return;
      productRequirements[itemId] = inventoryQuantity((productRequirements[itemId] || 0) + lineQuantity);
      return;
    }

    const serviceId = inventoryText(line.referenceId || line.serviceId);
    const serviceName = inventoryText(line.itemName || line.name);
    recipes.filter((recipe) => recipe.serviceId === serviceId).forEach((recipe) => {
      const requirement = serviceRequirements[recipe.itemId] || {
        quantity: 0,
        serviceIds: [],
        serviceNames: []
      };
      requirement.quantity = inventoryQuantity(requirement.quantity + (recipe.quantity * lineQuantity));
      if (serviceId && requirement.serviceIds.indexOf(serviceId) === -1) requirement.serviceIds.push(serviceId);
      if (serviceName && requirement.serviceNames.indexOf(serviceName) === -1) requirement.serviceNames.push(serviceName);
      serviceRequirements[recipe.itemId] = requirement;
    });
  });

  const insufficientItems = [];
  const configurationItems = [];

  Object.keys(productRequirements).forEach((itemId) => {
    const item = itemsById[itemId];
    if (!item) {
      configurationItems.push({ itemName: "Inventory item", unit: "pack" });
      return;
    }
    const availableQuantity = inventoryQuantity(stockBefore[itemId]?.sealedPacks);
    const requiredQuantity = inventoryQuantity(productRequirements[itemId]);
    const projectedQuantity = inventoryQuantity(availableQuantity - requiredQuantity);
    if (!item.active || !item.saleEnabled || projectedQuantity < 0) {
      insufficientItems.push({
        itemId,
        itemName: item.name,
        unit: "pack",
        availableQuantity,
        requiredQuantity,
        projectedQuantity
      });
    }
  });

  Object.keys(serviceRequirements).forEach((itemId) => {
    const item = itemsById[itemId];
    if (!item) {
      configurationItems.push({ itemName: "Inventory item", unit: "unit" });
      return;
    }
    const availableQuantity = inventoryQuantity(stockBefore[itemId]?.totalQuantity);
    const requiredQuantity = inventoryQuantity(serviceRequirements[itemId].quantity);
    const projectedQuantity = inventoryQuantity(availableQuantity - requiredQuantity);
    if (!item.active || !item.serviceEnabled || projectedQuantity < 0) {
      insufficientItems.push({
        itemId,
        itemName: item.name,
        unit: item.usageUnit,
        availableQuantity,
        requiredQuantity,
        projectedQuantity
      });
    }
  });

  if (configurationItems.length) {
    return {
      success: false,
      enabled: true,
      error: true,
      code: "INVENTORY_CONFIGURATION_ERROR",
      message: "A service or product has an invalid inventory setup. Please review its inventory recipe.",
      items: configurationItems
    };
  }

  if (insufficientItems.length && !allowNegativeInventory) {
    return {
      success: false,
      enabled: true,
      error: true,
      inventoryError: true,
      code: "INSUFFICIENT_INVENTORY",
      message: "Some inventory items do not have enough stock.",
      items: insufficientItems,
      insufficientItems
    };
  }

  const changedRows = {};
  const newBatches = [];
  const movements = [];

  function createDeficitBatch(item) {
    const now = getCairoDateTime();
    const batch = {
      rowNumber: 0,
      batchId: `BAT-NEG-${Utilities.getUuid()}`,
      itemId: item.itemId,
      purchaseDate: getCairoDateKey(),
      supplier: "",
      purchasedPacks: 0,
      packageSize: item.packageSize > 0 ? item.packageSize : 1,
      usageUnit: item.usageUnit,
      sealedPacks: 0,
      openedPacks: 0,
      openedQuantity: 0,
      purchasePrice: item.purchasePrice,
      expiryDate: "",
      status: "negative",
      createdAt: now,
      updatedAt: now
    };
    batches.push(batch);
    newBatches.push(batch);
    return batch;
  }

  Object.keys(productRequirements).forEach((itemId) => {
    const item = itemsById[itemId];
    let remaining = productRequirements[itemId];
    const itemBatches = batches
      .filter((batch) => batch.itemId === itemId && isInventoryBatchUsable(batch))
      .sort((a, b) => inventoryBatchSortKey(a).localeCompare(inventoryBatchSortKey(b)));

    itemBatches.forEach((batch) => {
      if (remaining <= 0 || batch.sealedPacks <= 0) return;
      const used = inventoryQuantity(Math.min(batch.sealedPacks, remaining));
      batch.sealedPacks = inventoryQuantity(batch.sealedPacks - used);
      remaining = inventoryQuantity(remaining - used);
      if (batch.rowNumber) changedRows[batch.rowNumber] = batch;
      movements.push({ item, batch, movementType: "product_sale", stockBucket: "sealed", quantity: -used, unit: "pack" });
    });

    if (remaining > 0) {
      const deficitBatch = itemBatches[itemBatches.length - 1] || createDeficitBatch(item);
      deficitBatch.sealedPacks = inventoryQuantity(deficitBatch.sealedPacks - remaining);
      if (deficitBatch.rowNumber) changedRows[deficitBatch.rowNumber] = deficitBatch;
      movements.push({ item, batch: deficitBatch, movementType: "product_sale", stockBucket: "sealed", quantity: -remaining, unit: "pack" });
    }
  });

  Object.keys(serviceRequirements).forEach((itemId) => {
    const item = itemsById[itemId];
    const requirement = serviceRequirements[itemId];
    let remaining = requirement.quantity;
    const itemBatches = batches
      .filter((batch) => batch.itemId === itemId && isInventoryBatchUsable(batch))
      .sort((a, b) => inventoryBatchSortKey(a).localeCompare(inventoryBatchSortKey(b)));
    const movementDetails = {
      serviceId: requirement.serviceIds.join(","),
      serviceName: requirement.serviceNames.join("، ")
    };

    itemBatches.forEach((batch) => {
      if (remaining <= 0 || batch.openedQuantity <= 0) return;
      const used = inventoryQuantity(Math.min(batch.openedQuantity, remaining));
      batch.openedQuantity = inventoryQuantity(batch.openedQuantity - used);
      remaining = inventoryQuantity(remaining - used);
      if (batch.openedQuantity <= 0) batch.openedPacks = 0;
      if (batch.rowNumber) changedRows[batch.rowNumber] = batch;
      movements.push({
        item,
        batch,
        ...movementDetails,
        movementType: "service_consumption",
        stockBucket: "opened",
        quantity: -used,
        unit: item.usageUnit
      });
    });

    itemBatches.forEach((batch) => {
      while (remaining > 0 && batch.sealedPacks > 0) {
        batch.sealedPacks = inventoryQuantity(batch.sealedPacks - 1);
        const used = inventoryQuantity(Math.min(batch.packageSize, remaining));
        const leftover = inventoryQuantity(batch.packageSize - used);
        remaining = inventoryQuantity(remaining - used);
        batch.openedPacks = leftover > 0 ? 1 : 0;
        batch.openedQuantity = leftover;
        if (batch.rowNumber) changedRows[batch.rowNumber] = batch;
        movements.push({ item, batch, movementType: "open_pack", stockBucket: "sealed", quantity: -1, unit: "pack" });
        movements.push({
          item,
          batch,
          ...movementDetails,
          movementType: "service_consumption",
          stockBucket: "opened",
          quantity: -used,
          unit: item.usageUnit
        });
      }
    });

    if (remaining > 0) {
      const deficitBatch = itemBatches[itemBatches.length - 1] || createDeficitBatch(item);
      deficitBatch.openedPacks = 0;
      deficitBatch.openedQuantity = inventoryQuantity(deficitBatch.openedQuantity - remaining);
      if (deficitBatch.rowNumber) changedRows[deficitBatch.rowNumber] = deficitBatch;
      movements.push({
        item,
        batch: deficitBatch,
        ...movementDetails,
        movementType: "service_consumption",
        stockBucket: "opened",
        quantity: -remaining,
        unit: item.usageUnit
      });
    }
  });

  const balances = {};
  items.forEach((item) => {
    balances[item.itemId] = inventoryQuantity(stockBefore[item.itemId]?.totalQuantity);
  });
  movements.forEach((movement) => {
    movement.balanceBefore = inventoryQuantity(balances[movement.item.itemId]);
    if (movement.movementType === "product_sale") {
      balances[movement.item.itemId] = inventoryQuantity(
        balances[movement.item.itemId] - (Math.abs(movement.quantity) * movement.batch.packageSize)
      );
    } else if (movement.movementType === "service_consumption") {
      balances[movement.item.itemId] = inventoryQuantity(
        balances[movement.item.itemId] - Math.abs(movement.quantity)
      );
    }
    movement.balanceAfter = inventoryQuantity(balances[movement.item.itemId]);
  });

  return {
    enabled: true,
    lines,
    batchUpdates: Object.keys(changedRows).map((key) => changedRows[key]),
    newBatches,
    movements,
    itemsById,
    recipes,
    insufficientItems
  };
}

function estimateInvoiceLineCost(line, itemsById, recipes) {
  if (inventoryText(line.lineType) === "product") {
    return inventoryNumber(itemsById[inventoryText(line.referenceId)]?.purchasePrice);
  }
  const serviceId = inventoryText(line.referenceId || line.serviceId);
  return recipes
    .filter((recipe) => recipe.serviceId === serviceId)
    .reduce((sum, recipe) => {
      const item = itemsById[recipe.itemId];
      const unitCost = item && item.packageSize > 0 ? item.purchasePrice / item.packageSize : 0;
      return sum + (unitCost * recipe.quantity);
    }, 0);
}

function rollbackInventoryCheckout(transaction) {
  if (!transaction) return;
  const batchSheet = inventorySheet(INVENTORY_SHEETS.batches);
  const logSheet = inventorySheet(INVENTORY_SHEETS.log);
  const invoiceItemsSheet = inventorySheet(INVENTORY_SHEETS.invoiceItems);

  (transaction.batchRows || []).forEach((snapshot) => {
    batchSheet.getRange(snapshot.rowNumber, 1, 1, snapshot.values.length).setValues([snapshot.values]);
  });

  function deleteMatchingAppendedRows(sheet, previousLastRow, width, matches) {
    const addedRows = sheet.getLastRow() - previousLastRow;
    if (addedRows <= 0) return;
    if (typeof sheet.getRange !== "function") {
      sheet.deleteRows(previousLastRow + 1, addedRows);
      return;
    }
    let rows;
    try {
      const range = sheet.getRange(previousLastRow + 1, 1, addedRows, width);
      if (!range || typeof range.getValues !== "function") throw new Error("Range values are unavailable");
      rows = range.getValues();
    } catch (error) {
      sheet.deleteRows(previousLastRow + 1, addedRows);
      return;
    }
    for (let index = rows.length - 1; index >= 0; index -= 1) {
      if (!matches(rows[index])) continue;
      const rowNumber = previousLastRow + 1 + index;
      if (typeof sheet.deleteRow === "function") sheet.deleteRow(rowNumber);
      else sheet.deleteRows(rowNumber, 1);
    }
  }

  deleteMatchingAppendedRows(
    invoiceItemsSheet,
    transaction.invoiceItemsLastRow,
    14,
    row => inventoryText(row[1]) === transaction.invoiceId
  );
  deleteMatchingAppendedRows(
    logSheet,
    transaction.logLastRow,
    18,
    row => inventoryText(row[9]) === transaction.invoiceId
  );
  const newBatchIds = transaction.newBatchIds || [];
  deleteMatchingAppendedRows(
    batchSheet,
    transaction.batchLastRow,
    15,
    row => newBatchIds.indexOf(inventoryText(row[0])) !== -1
  );
}

function applyInventoryCheckout(plan, data, invoiceId) {
  if (!plan.enabled) return null;
  const batchSheet = inventorySheet(INVENTORY_SHEETS.batches);
  const logSheet = ensureInventoryLogBarberColumns().sheet;
  const invoiceItemsSheet = inventorySheet(INVENTORY_SHEETS.invoiceItems);
  const now = getCairoDateTime();
  const transaction = {
    batchLastRow: batchSheet.getLastRow(),
    logLastRow: logSheet.getLastRow(),
    invoiceItemsLastRow: invoiceItemsSheet.getLastRow(),
    invoiceId,
    newBatchIds: (plan.newBatches || []).map(batch => batch.batchId),
    batchRows: (plan.batchUpdates || []).map((batch) => ({
      rowNumber: batch.rowNumber,
      values: batchSheet.getRange(batch.rowNumber, 1, 1, 15).getValues()[0]
    }))
  };

  try {
    (plan.newBatches || []).forEach((batch) => {
      batchSheet.appendRow([
        batch.batchId,
        batch.itemId,
        batch.purchaseDate,
        batch.supplier,
        batch.purchasedPacks,
        batch.packageSize,
        batch.usageUnit,
        batch.sealedPacks,
        batch.openedPacks,
        batch.openedQuantity,
        batch.purchasePrice,
        batch.expiryDate,
        "negative",
        batch.createdAt || now,
        now
      ]);
    });

    plan.batchUpdates.forEach((batch) => {
      batchSheet.getRange(batch.rowNumber, 8, 1, 3).setValues([[batch.sealedPacks, batch.openedPacks, batch.openedQuantity]]);
      const isNegative = batch.sealedPacks < 0 || batch.openedQuantity < 0;
      batchSheet.getRange(batch.rowNumber, 13).setValue(
        isNegative ? "negative" : (batch.sealedPacks <= 0 && batch.openedQuantity <= 0 ? "depleted" : "active")
      );
      batchSheet.getRange(batch.rowNumber, 15).setValue(now);
    });

    const actor = getAuthenticatedUser(data);
    const requestId = inventoryText(data.idempotencyKey || data.clientRequestId);
    const invoiceBarberId = inventoryText(data.barberId || data.barberCode || data.barber);
    const invoiceBarberName = inventoryText(data.barberName || data.barber);
    plan.movements.forEach((movement) => {
      const isBarberConsumption = movement.movementType === "service_consumption";
      const serviceLabel = inventoryText(movement.serviceName);
      appendInventoryLog({
        itemId: movement.item.itemId,
        itemName: movement.item.name,
        batchId: movement.batch.batchId,
        movementType: movement.movementType,
        stockBucket: movement.stockBucket,
        quantity: movement.quantity,
        unit: movement.unit,
        invoiceId,
        serviceId: inventoryText(movement.serviceId),
        username: actor ? actor.username : "",
        balanceBefore: movement.balanceBefore,
        balanceAfter: movement.balanceAfter,
        note: serviceLabel
          ? `Automatic inventory movement for ${invoiceId} | Service: ${serviceLabel}`
          : `Automatic inventory movement for ${invoiceId}`,
        requestId,
        barberId: isBarberConsumption ? invoiceBarberId : "",
        barberName: isBarberConsumption ? invoiceBarberName : ""
      });
    });

    const grossInvoiceTotal = Math.max(0, inventoryNumber(data.subtotalBeforePremium) + inventoryNumber(data.premiumExtra));
    const invoiceDiscount = inventoryNumber(data.discountAmount);
    const itemRows = plan.lines.map((line) => {
      const quantity = Math.max(1, inventoryNumber(line.quantity) || 1);
      const unitPrice = inventoryNumber(line.unitPrice || line.price);
      const grossTotal = unitPrice * quantity;
      const allocatedDiscount = grossInvoiceTotal > 0 ? (grossTotal / grossInvoiceTotal) * invoiceDiscount : 0;
      const unitCost = estimateInvoiceLineCost(line, plan.itemsById, plan.recipes);
      return [
        `INI-${Utilities.getUuid()}`,
        invoiceId,
        inventoryText(line.lineType) || "service",
        inventoryText(line.referenceId || line.serviceId || line.itemId),
        inventoryText(line.itemName || line.name),
        quantity,
        unitPrice,
        grossTotal,
        inventoryNumber(data.discountPercent),
        allocatedDiscount,
        Math.max(0, grossTotal - allocatedDiscount),
        unitCost,
        unitCost * quantity,
        now
      ];
    });
    if (itemRows.length) {
      invoiceItemsSheet.getRange(invoiceItemsSheet.getLastRow() + 1, 1, itemRows.length, 14).setValues(itemRows);
    }
    return transaction;
  } catch (error) {
    try { rollbackInventoryCheckout(transaction); } catch (rollbackError) {
      console.error("Inventory rollback failed:", rollbackError);
    }
    throw error;
  }
}

function readActiveInventoryBarbers() {
  const sheet = getStaffSheet();
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 11).getValues()
    .map((row, index) => ({
      barberId: inventoryText(row[1] || row[4] || `STAFF-${index + 1}`),
      barberName: inventoryText(row[0]),
      active: inventoryBoolean(row[7], true),
      isBarber: inventoryBoolean(row[10], true)
    }))
    .filter((barber) => barber.barberId && barber.barberName && barber.active && barber.isBarber);
}

function getBarberConsumptionReport(data) {
  try {
    const permissionError = requirePermission(data, "view_inventory", "You do not have permission to view barber consumption.");
    if (permissionError) return permissionError;

    const fromDate = getDateKey(data.fromDate || "", TIME_ZONE);
    const toDate = getDateKey(data.toDate || "", TIME_ZONE);
    const selectedBarberId = inventoryText(data.barberId);
    const batchesById = {};
    readInventoryBatches().forEach((batch) => { batchesById[batch.batchId] = batch; });
    const itemsById = {};
    readInventoryItems().forEach((item) => { itemsById[item.itemId] = item; });
    const barberMap = {};
    readActiveInventoryBarbers().forEach((barber) => { barberMap[barber.barberId] = barber; });

    const groups = {};
    const invoices = {};
    let totalCost = 0;
    let totalMovements = 0;

    readInventoryLog(100000).forEach((entry) => {
      if (entry.movementType !== "service_consumption" || !entry.barberId) return;
      const dateKey = getDateKey(entry.dateTime, TIME_ZONE);
      if (fromDate && dateKey < fromDate) return;
      if (toDate && dateKey > toDate) return;
      if (selectedBarberId && entry.barberId !== selectedBarberId) return;

      if (!barberMap[entry.barberId]) {
        barberMap[entry.barberId] = { barberId: entry.barberId, barberName: entry.barberName || entry.barberId };
      }
      const quantity = Math.abs(inventoryNumber(entry.quantity));
      const batch = batchesById[entry.batchId];
      const item = itemsById[entry.itemId];
      const packageSize = inventoryNumber(batch?.packageSize || item?.packageSize);
      const purchasePrice = inventoryNumber(batch?.purchasePrice || item?.purchasePrice);
      const unitCost = packageSize > 0 ? purchasePrice / packageSize : 0;
      const cost = quantity * unitCost;
      const key = [entry.barberId, entry.itemId, entry.unit].join("|");
      if (!groups[key]) {
        groups[key] = {
          barberId: entry.barberId,
          barberName: entry.barberName || barberMap[entry.barberId].barberName,
          itemId: entry.itemId,
          itemName: entry.itemName,
          unit: entry.unit,
          quantity: 0,
          cost: 0,
          invoiceIds: {}
        };
      }
      groups[key].quantity += quantity;
      groups[key].cost += cost;
      if (entry.invoiceId) {
        groups[key].invoiceIds[entry.invoiceId] = true;
        invoices[entry.invoiceId] = true;
      }
      totalCost += cost;
      totalMovements += 1;
    });

    const rows = Object.keys(groups).map((key) => {
      const group = groups[key];
      return {
        barberId: group.barberId,
        barberName: group.barberName,
        itemId: group.itemId,
        itemName: group.itemName,
        unit: group.unit,
        quantity: group.quantity,
        cost: group.cost,
        invoiceCount: Object.keys(group.invoiceIds).length
      };
    }).sort((a, b) => a.barberName.localeCompare(b.barberName) || b.cost - a.cost || a.itemName.localeCompare(b.itemName));

    return jsonOutput({
      status: "success",
      barbers: Object.keys(barberMap).map((key) => barberMap[key]).sort((a, b) => a.barberName.localeCompare(b.barberName)),
      rows,
      summary: {
        totalCost,
        totalMovements,
        invoiceCount: Object.keys(invoices).length
      }
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
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
    return jsonOutput({
      status: "error",
      ...(error && error.code ? { code: error.code } : {}),
      message: error.message
    });
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
    const beforeRows = lastRow > 1
      ? sheet.getRange(2, 1, lastRow - 1, 11).getValues() : [];

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

    const responseStaff = rows.map(row => ({
      name: row[0], code: row[1], salary: row[2], percentage: row[3],
      id: row[4], bonus: row[5], deduction: row[6], isBarber: row[10] !== "FALSE"
    }));
    const writeStaff = () => {
      if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, 11).clearContent();
      if (rows.length > 0) sheet.getRange(2, 1, rows.length, 11).setValues(rows);
    };
    if (typeof bookingAvailabilityPhase5RunTransaction === "function" &&
        bookingAvailabilityEngineMode() === "PHASE5") {
      return withBookingMutationLock({
        bookingRequestId: String(data.clientRequestId || "STAFF-SAVE").trim()
      }, () => {
        const requestId = String(data.clientRequestId || "STAFF-SAVE").trim();
        const actor = bookingAvailabilityPhase5Actor(data, true);
        const result = bookingAvailabilityPhase5RunTransaction({
          data, requestId, action: "STAFF_MEMBERSHIP_SAVE",
          entityType: "STAFF_MEMBERSHIP", entityId: "STAFF", actor,
          beforeState: { rows: beforeRows },
          business: () => { writeStaff(); SpreadsheetApp.flush(); return { staff: responseStaff }; },
          version: () => bookingAvailabilityPhase5IncrementGeneration(
            "staffMembership", "GLOBAL", "GLOBAL", actor, requestId),
          audit: () => bookingAvailabilityPhase5AppendAudit({
            action: "STAFF_MEMBERSHIP_SAVED", entityType: "STAFF_MEMBERSHIP",
            entityId: "STAFF", actorId: actor ? actor.actorId : "system",
            actorRole: actor ? actor.role : "SYSTEM", reasonCode: "STAFF_MEMBERSHIP",
            beforeState: { count: beforeRows.length }, afterState: { count: rows.length },
            requestId
          }),
          compensateBusiness: () => {
            const affected = Math.max(beforeRows.length, rows.length);
            if (affected) sheet.getRange(2, 1, affected, 11).clearContent();
            if (beforeRows.length) sheet.getRange(2, 1, beforeRows.length, 11).setValues(beforeRows);
            SpreadsheetApp.flush();
          },
          response: value => value
        });
        logActivity(data, "update", "staff", "STAFF",
          `Saved staff list. Total staff: ${rows.length}`);
        return jsonOutput({ status: "success", staff: result.staff });
      });
    }
    writeStaff();

    logActivity(
      data,
      "update",
      "staff",
      "STAFF",
      `Saved staff list. Total staff: ${rows.length}`
    );

    return jsonOutput({
      status: "success",
      staff: responseStaff
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

function getAttendanceSheetReadOnly() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("ATTENDANCE");
  if (!sheet) {
    throw schemaContractError(
      "ATTENDANCE_SCHEMA_NOT_READY", "Sheet ATTENDANCE not found.",
      { sheetName: "ATTENDANCE" });
  }
  inspectPositionalSheetSchema(sheet, {
    sheetName: "ATTENDANCE",
    label: "Legacy ATTENDANCE",
    contract: ATTENDANCE_HEADERS.map((header) => ({ name: header, aliases: [header] })),
    notReadyCode: "ATTENDANCE_SCHEMA_NOT_READY",
    incompatibleCode: "ATTENDANCE_SCHEMA_INCOMPATIBLE",
    duplicateCode: "ATTENDANCE_SCHEMA_DUPLICATE_HEADERS"
  });
  return sheet;
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

    const sheet = getAttendanceSheetReadOnly();
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
    return jsonOutput({
      status: "error",
      ...(error && error.code ? { code: error.code } : {}),
      message: error.message
    });
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
    const sheet = getAttendanceSheetReadOnly();
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
    if (error && /^ATTENDANCE_SCHEMA_/.test(String(error.code || ""))) throw error;
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

function createInvoice(data) {
  const permissionError = requirePermission(data, "access_cashier", "You do not have permission to create invoices.");
  if (permissionError) return permissionError;
  const lock = LockService.getScriptLock();
  let sheet = null;
  let invoiceRowNumber = 0;
  let inventoryTransaction = null;
  let pdfUrl = "";
  let persistedRequestId = "";
  let invoiceRequestIdColumn = 0;
  try {
    lock.waitLock(30000);
    const invoiceCache = CacheService.getScriptCache();
    const requestId = inventoryText(data.idempotencyKey || data.clientRequestId);
    const fingerprint = inventoryText(data.invoiceFingerprint);
    const fingerprintDigest = fingerprint
      ? Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, fingerprint)).replace(/=+$/, "")
      : "";
    const requestCacheKey = requestId ? `invoice-request-${requestId}` : "";
    const fingerprintCacheKey = fingerprintDigest ? `invoice-fingerprint-${fingerprintDigest}` : "";
    const cachedInvoice = (requestCacheKey && invoiceCache.get(requestCacheKey)) || (fingerprintCacheKey && invoiceCache.get(fingerprintCacheKey));
    if (cachedInvoice) return jsonOutput(JSON.parse(cachedInvoice));

    sheet = SpreadsheetApp.getActive().getSheetByName("DATA");
    const persistedInvoice = findInvoiceByRequestId(sheet, requestId);
    if (persistedInvoice) return jsonOutput(persistedInvoice);
    const invoiceDateTime = getInvoiceDateTime(data);
    const lockedError = getLockedDateError(invoiceDateTime, "Invoice");
    if (lockedError) return jsonOutput({ success: false, status: "error", message: lockedError, locked: true });

    const inventoryPlan = prepareInventoryCheckout(data);
    if (inventoryPlan.error) {
      return jsonOutput({
        success: false,
        status: "error",
        inventoryError: true,
        code: inventoryPlan.code || "INVENTORY_ERROR",
        message: inventoryPlan.message || "The inventory could not be validated.",
        items: inventoryPlan.items || inventoryPlan.insufficientItems || []
      });
    }

    persistedRequestId = requestId || `invoice-server-${Utilities.getUuid()}`;
    invoiceRequestIdColumn = ensureDataInvoiceColumns(sheet).invoiceRequestIdColumn;
    pdfUrl = createInvoicePdf(data);
    const paymentDetails = getInvoicePaymentDetails(data);
    const invoiceRow = [
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
      data.note || data.invoiceNote || "",
      parseSheetAmount(data.discountPercent || 0),
      parseSheetAmount(data.discountAmount || 0)
    ];
    while (invoiceRow.length < invoiceRequestIdColumn) invoiceRow.push("");
    invoiceRow[invoiceRequestIdColumn - 1] = persistedRequestId;
    sheet.appendRow(invoiceRow);
    invoiceRowNumber = sheet.getLastRow();
    const invoiceId = `DATA-${invoiceRowNumber}`;
    inventoryTransaction = applyInventoryCheckout(
      inventoryPlan,
      requestId ? data : { ...data, idempotencyKey: persistedRequestId },
      invoiceId
    );

    logActivity(data, "create", "invoice", invoiceId, `Created invoice for ${data.customerName || "-"} | Total: ${data.total || 0} | Barber: ${data.barber || "-"}`);
    const response = { success: true, status: "success", pdfUrl, invoiceId, rowNumber: invoiceRowNumber, duplicate: false };
    const cachedResponse = JSON.stringify(response);
    try {
      if (requestCacheKey) invoiceCache.put(requestCacheKey, cachedResponse, 21600);
      if (fingerprintCacheKey) invoiceCache.put(fingerprintCacheKey, JSON.stringify({ ...response, duplicate: true }), 300);
    } catch (cacheError) {
      console.warn("Invoice idempotency cache could not be updated:", cacheError);
    }
    return jsonOutput(response);
  } catch (error) {
    if (inventoryTransaction) {
      try { rollbackInventoryCheckout(inventoryTransaction); } catch (rollbackError) {
        console.error("Inventory rollback failed:", rollbackError);
      }
    }
    if (sheet && invoiceRowNumber >= 2 && invoiceRowNumber <= sheet.getLastRow()) {
      try {
        const persistedInvoice = findInvoiceByRequestId(sheet, persistedRequestId, invoiceRequestIdColumn);
        const rollbackRowNumber = persistedInvoice?.rowNumber || invoiceRowNumber;
        const rollbackRequestId = invoiceRequestIdColumn && typeof sheet.getRange === "function"
          ? inventoryText(sheet.getRange(rollbackRowNumber, invoiceRequestIdColumn).getValue())
          : persistedRequestId;
        if (rollbackRequestId === persistedRequestId) sheet.deleteRow(rollbackRowNumber);
      } catch (rollbackError) {
        console.error("Invoice rollback failed:", rollbackError);
      }
    }
    if (pdfUrl) {
      try {
        const fileIdMatch = String(pdfUrl).match(/\/d\/([^/]+)/);
        if (fileIdMatch) DriveApp.getFileById(fileIdMatch[1]).setTrashed(true);
      } catch (rollbackError) {
        console.error("Invoice PDF rollback failed:", rollbackError);
      }
    }
    return jsonOutput({
      success: false,
      status: "error",
      code: "INVOICE_COMPLETION_FAILED",
      message: "The invoice could not be completed. No invoice or inventory changes were saved."
    });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
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
    const currentRow = sheet.getRange(targetRowNumber, 1, 1, 13).getValues()[0];
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
      data.note || data.invoiceNote || "",
      parseSheetAmount(data.discountPercent || currentRow[11] || 0),
      parseSheetAmount(data.discountAmount || currentRow[12] || 0)
    ];

    sheet.getRange(targetRowNumber, 1, 1, 13).setValues([updatedRow]);
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
        note: String(updatedRow[10] || "").trim(),
        discountPercent: parseSheetAmount(updatedRow[11]),
        discountAmount: parseSheetAmount(updatedRow[12])
      }
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

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
  const rows = sheet.getRange(2, 1, lastRow - 1, Math.min(sheet.getLastColumn(), 13)).getValues();
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
    const row = sheet.getRange(targetRowNumber, 1, 1, 13).getValues()[0];
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
  let range;
  try {
    range = getOptionalDateRange(data, null, true);
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
  const sheet = SpreadsheetApp.getActive().getSheetByName("WITHDRAWLS");
  if (!sheet || sheet.getLastRow() < 2) {
    return jsonOutput({ status: "success", withdrawals: [] });
  }

  const lastRow = sheet.getLastRow();
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
  }).filter(withdrawal => isDateInOptionalRange(withdrawal.date, range)).reverse();

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
  let range;
  try {
    range = getOptionalDateRange(data, null, true);
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
  const sheet = SpreadsheetApp.getActive().getSheetByName("EXPENSES");
  if (!sheet || sheet.getLastRow() < 2) {
    return jsonOutput({ status: "success", expenses: [] });
  }

  const lastRow = sheet.getLastRow();
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
  }).filter(expense => isDateInOptionalRange(expense.date, range)).reverse();

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
  const discountPercent = parseSheetAmount(data.discountPercent || 0);
  const discountAmount = formatInvoiceMoney(data.discountAmount || 0);

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
          .summary { margin: 0 0 12px; border: 1px solid #ead9bd; border-radius: 12px; overflow: hidden; }
          .summary-row { display: table; width: 100%; border-bottom: 1px solid #ead9bd; }
          .summary-row:last-child { border-bottom: 0; }
          .summary-label { display: table-cell; padding: 10px 12px; color: #7d6a58; font-size: 13px; font-weight: 700; }
          .summary-value { display: table-cell; padding: 10px 12px; color: #2a2118; font-size: 14px; font-weight: 800; text-align: right; }
          .total-box { background: #19764d; color: #ffffff; border-radius: 14px; padding: 18px 20px; display: table; width: 100%; margin-top: 12px; }
          .total-label { display: table-cell; font-size: 18px; font-weight: 800; vertical-align: middle; }
          .total-value { display: table-cell; font-size: 30px; font-weight: 900; text-align: right; vertical-align: middle; }
          .footer { margin-top: 24px; padding-top: 16px; border-top: 1px dashed #d9c3a3; text-align: center; color: #7d6a58; font-size: 13px; line-height: 1.7; }
        </style>
      </head>
      <body>
        <div class="invoice">
          <div class="header">
            <h1 class="brand">CUT HUB</h1>
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
            <div class="summary">
              <div class="summary-row">
                <span class="summary-label">Discount Percent</span>
                <span class="summary-value">${discountPercent}%</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Discount Amount</span>
                <span class="summary-value">${discountAmount}</span>
              </div>
            </div>
            <div class="total-box">
              <div class="total-label">Total</div>
              <div class="total-value">${total}</div>
            </div>
            <div class="footer">
              Your style, our passion<br>
              Thank you for visiting CUT HUB
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const blob = Utilities.newBlob(html, "text/html", "invoice.html")
    .getAs("application/pdf")
    .setName(`invoice-${Date.now()}.pdf`);

  let file = null;
  try {
    file = DriveApp.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return `https://drive.google.com/file/d/${file.getId()}/view?usp=sharing`;
  } catch (error) {
    if (file) {
      try { file.setTrashed(true); } catch (cleanupError) {
        console.error("Incomplete invoice PDF cleanup failed:", cleanupError);
      }
    }
    throw error;
  }
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
  let range;
  try {
    range = getOptionalDateRange(data, null, true);
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
  if (!sheet) {
    return jsonOutput({ status: "success", totalClients: 0 });
  }
  const barber = normalizeBarberName(data.barber);
  const rows = getSheetRangeFromRow2(sheet, 1, 10, true);

  const count = rows.filter(row => {
    const hasData = row.some(cell => String(cell || "").trim() !== "");
    const rowBarber = normalizeBarberName(row[9]);
    return hasData && rowBarber === barber && isDateInOptionalRange(row[0], range);
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
  let range;
  try {
    range = getOptionalDateRange(data, null, true);
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
  const sheet = SpreadsheetApp.getActive().getSheetByName("DATA");
  if (!sheet) {
    return jsonOutput({ status: "success", totalSales: 0 });
  }

  const barber = normalizeBarberName(data.barber);
  const rows = getSheetRangeFromRow2(sheet, 1, 10);

  const totalSales = rows.reduce((sum, row) => {
    const hasData = row.some(cell => cell !== "" && cell !== null);
    const rowBarber = normalizeBarberName(row[9]);

    if (!hasData || rowBarber !== barber || !isDateInOptionalRange(row[0], range)) return sum;

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

const BOOKING_HEADERS_V2 = [
  "ID", "DATE", "TIME", "CUSTOMER", "PHONE", "EMPLOYEE", "SERVICE", "NOTE", "STATUS",
  "CREATED_AT", "UPDATED_AT", "SERVICE_ID", "DURATION_MINUTES", "SOURCE", "TRACKING_TOKEN",
  "REQUESTED_AT", "CONFIRMED_AT", "CONFIRMED_BY", "REJECTION_REASON", "PROPOSED_DATE",
  "PROPOSED_TIME", "HOLD_EXPIRES_AT", "CUSTOMER_RESPONSE", "EMPLOYEE_ID",
  "CANCELLED_AT", "CANCELLED_BY", "CANCELLATION_REASON", "COMPLETED_AT", "COMPLETED_BY",
  "DELETED", "DELETED_AT", "DELETED_BY", "SERVICE_IDS", "TOTAL_PRICE", "DELETION_REASON",
  "CLIENT_REQUEST_ID", "CLIENT_REQUEST_FINGERPRINT",
  "BRANCH_ID", "AVAILABILITY_TOKEN", "SCHEDULE_VERSION",
  "ATTENDANCE_OPERATIONAL_VERSION", "OPERATIONAL_OVERRIDE_ID",
  "VALIDATED_AT", "VALIDATION_SOURCE_VERSION", "SERVICE_DURATION_SNAPSHOT",
  "PREPARATION_MINUTES_SNAPSHOT", "CLEANUP_MINUTES_SNAPSHOT",
  "OCCUPIED_START_TIME", "OCCUPIED_END_TIME", "SERVICE_CONFIGURATION_VERSION"
];

const BOOKING_SLOT_INTERVAL_MINUTES = 30;
const MAX_BOOKING_DURATION_MINUTES = 12 * 60;
const MAX_BOOKING_TOTAL_PRICE = 1000000;
const BOOKING_LOCK_WAIT_MS = 10000;
const PUBLIC_RATING_MINIMUM_COUNT = 5;

// Canonical policy for user/operator-controlled booking and rating free text:
// trim only the outer whitespace boundary, preserve meaningful whitespace inside,
// and leave formula safety to the explicit stringValue sheet writer.
function normalizeProtectedText(value, maxLength) {
  let text = String(value == null ? "" : value).trim();
  if (Number.isFinite(Number(maxLength)) && Number(maxLength) >= 0) {
    text = text.slice(0, Number(maxLength)).replace(/\s+$/, "");
  }
  return text;
}

function parseServiceActiveFlag(value) {
  if (value === null || value === undefined || String(value).trim() === "") return true;
  if (value === false || value === 0) return false;
  if (value === true || value === 1) return true;
  const normalized = String(value).trim().toUpperCase();
  if (normalized === "FALSE" || normalized === "0") return false;
  if (normalized === "TRUE" || normalized === "1") return true;
  return false;
}

function bookingApiError(code, message) {
  return jsonOutput({ status: "error", code, message });
}

function bookingErrorResponse(error, fallbackCode) {
  return jsonOutput({
    status: "error",
    code: (error && error.code) || fallbackCode || "BOOKING_INTERNAL_ERROR",
    message: (error && error.message) || "Booking request failed.",
    ...((error && error.details) ? { details: error.details } : {})
  });
}

function bookingPublicErrorResponse(error, fallbackCode) {
  return jsonOutput({
    status: "error",
    code: (error && error.code) || fallbackCode || "BOOKING_PUBLIC_ERROR",
    message: (error && error.message) || "Booking request failed."
  });
}

function bookingMutationDiagnostic(event, details) {
  const safeDetails = details || {};
  const payload = {
    event,
    executionId: safeDetails.executionId || "",
    lockRequestedAt: safeDetails.lockRequestedAt || "",
    lockAcquiredAt: safeDetails.lockAcquiredAt || "",
    lockReleasedAt: safeDetails.lockReleasedAt || "",
    bookingRequestId: safeDetails.bookingRequestId || "",
    employeeId: safeDetails.employeeId || "",
    date: safeDetails.date || "",
    time: safeDetails.time || "",
    durationMinutes: Number(safeDetails.durationMinutes) || 0
  };
  try { Logger.log(JSON.stringify(payload)); } catch (ignore) {}
}

function withBookingMutationLock(details, callback) {
  const lock = LockService.getScriptLock();
  const diagnostic = {
    executionId: `EXEC-${Utilities.getUuid()}`,
    lockRequestedAt: new Date().toISOString(),
    bookingRequestId: String((details && details.bookingRequestId) || "").trim(),
    employeeId: String((details && details.employeeId) || "").trim(),
    date: String((details && details.date) || "").trim(),
    time: String((details && details.time) || "").trim(),
    durationMinutes: Number(details && details.durationMinutes) || 0
  };
  let acquired = false;
  bookingMutationDiagnostic("booking_lock_requested", diagnostic);
  try {
    if (typeof lock.tryLock === "function") {
      acquired = lock.tryLock(BOOKING_LOCK_WAIT_MS);
    } else {
      lock.waitLock(BOOKING_LOCK_WAIT_MS);
      acquired = true;
    }
    if (!acquired) {
      bookingMutationDiagnostic("booking_lock_timeout", diagnostic);
      return bookingApiError("BOOKING_LOCK_TIMEOUT", "The booking system is busy. Please retry this request.");
    }
    diagnostic.lockAcquiredAt = new Date().toISOString();
    bookingMutationDiagnostic("booking_lock_acquired", diagnostic);
    return callback(diagnostic);
  } catch (error) {
    if (!acquired && /lock|timeout/i.test(String(error && error.message || error))) {
      bookingMutationDiagnostic("booking_lock_timeout", diagnostic);
      return bookingApiError("BOOKING_LOCK_TIMEOUT", "The booking system is busy. Please retry this request.");
    }
    throw error;
  } finally {
    if (acquired) {
      diagnostic.lockReleasedAt = new Date().toISOString();
      try { lock.releaseLock(); } finally {
        bookingMutationDiagnostic("booking_lock_released", diagnostic);
      }
    }
  }
}

function isStrictBookingTime(value) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(normalizeDigits(String(value || "").trim()));
}

function isValidBookingDateKey(value) {
  const text = normalizeDigits(String(value || "").trim());
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 2000 || month < 1 || month > 12 || day < 1) return false;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth;
}

function isValidBookingDuration(value) {
  const duration = Number(value);
  return Number.isFinite(duration) && Number.isInteger(duration) &&
    duration >= 15 && duration <= MAX_BOOKING_DURATION_MINUTES;
}

function isValidBookingPrice(value) {
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 && price <= MAX_BOOKING_TOTAL_PRICE;
}

function generateUniqueBookingIdV2(bookings) {
  const existingIds = new Set((bookings || []).map((booking) => String(booking.id || "").trim()));
  for (let attempt = 0; attempt < 50; attempt++) {
    const id = `BOOK-${Utilities.getUuid()}`;
    if (!existingIds.has(id)) return id;
  }
  throw new Error("Could not create a unique booking ID. Please try again.");
}

const BARBER_SCHEDULE_HEADERS = [
  "SCHEDULE_ID", "STAFF_ID", "STAFF_NAME", "WEEKDAY", "SHIFT_START", "SHIFT_END", "ACTIVE", "UPDATED_AT"
];

function ensureBookingHeadersV2(sheet) {
  const existingWidth = Math.max(1, sheet.getLastColumn());
  const current = sheet.getRange(1, 1, 1, existingWidth).getValues()[0];
  const existingKeys = {};
  current.forEach((header) => { if (header) existingKeys[canonicalBookingHeaderKey(header)] = true; });
  const missing = BOOKING_HEADERS_V2.filter((header) => !existingKeys[canonicalBookingHeaderKey(header)]);
  if (!missing.length) return;
  const hasHeaders = current.some((header) => String(header || "").trim());
  const startColumn = hasHeaders ? existingWidth + 1 : 1;
  const neededWidth = startColumn + missing.length - 1;
  if (sheet.getMaxColumns() < neededWidth) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), neededWidth - sheet.getMaxColumns());
  }
  sheet.getRange(1, startColumn, 1, missing.length).setValues([missing]);
}

function normalizeBookingHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function canonicalBookingHeaderKey(value) {
  const key = normalizeBookingHeader(value);
  return ({
    bookingid: "id",
    bookingdate: "date",
    bookingtime: "time",
    customername: "customer",
    customerphone: "phone",
    barber: "employee",
    employeename: "employee",
    services: "service",
    notes: "note",
    duration: "durationminutes",
    trackingcode: "trackingtoken",
    staffid: "employeeid"
  })[key] || key;
}

function getBookingHeadersV2(sheet) {
  const width = Math.max(1, sheet.getLastColumn());
  return sheet.getRange(1, 1, 1, width).getValues()[0].map((header) => String(header || "").trim());
}

function bookingHeaderIndexV2(headers, name, aliases) {
  const keys = [name].concat(aliases || []).map(canonicalBookingHeaderKey);
  return headers.findIndex((header) => keys.indexOf(canonicalBookingHeaderKey(header)) !== -1);
}

function bookingRowValueV2(row, headers, name, aliases) {
  const index = bookingHeaderIndexV2(headers, name, aliases);
  return index >= 0 ? row[index] : "";
}

function setBookingRowValueV2(row, headers, name, value, aliases) {
  const index = bookingHeaderIndexV2(headers, name, aliases);
  if (index >= 0) row[index] = value;
}

function getBookingsSheetV2() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("Bookings");
  if (!sheet) throw new Error("Sheet Bookings not found");
  ensureBookingHeadersV2(sheet);
  return sheet;
}

function getBookingsSheetV2ReadOnly() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("Bookings");
  if (!sheet) {
    throw schemaContractError(
      "BOOKING_SCHEMA_NOT_READY", "Sheet Bookings not found.", { sheetName: "Bookings" });
  }
  inspectNamedSheetSchema(sheet, {
    sheetName: "Bookings",
    label: "Bookings",
    expectedHeaders: BOOKING_HEADERS_V2,
    canonicalize: canonicalBookingHeaderKey,
    notReadyCode: "BOOKING_SCHEMA_NOT_READY",
    duplicateCode: "BOOKING_SCHEMA_DUPLICATE_HEADERS"
  });
  return sheet;
}

function getBarberScheduleSheet() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName("BARBER_SCHEDULE");
  if (!sheet) sheet = ss.insertSheet("BARBER_SCHEDULE");

  if (sheet.getMaxColumns() < BARBER_SCHEDULE_HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), BARBER_SCHEDULE_HEADERS.length - sheet.getMaxColumns());
  }
  const current = sheet.getRange(1, 1, 1, BARBER_SCHEDULE_HEADERS.length).getValues()[0];
  if (!current.some((value) => String(value || "").trim())) {
    sheet.getRange(1, 1, 1, BARBER_SCHEDULE_HEADERS.length).setValues([BARBER_SCHEDULE_HEADERS]);
  }
  return sheet;
}

function getBarberScheduleSheetReadOnly() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("BARBER_SCHEDULE");
  if (!sheet) {
    throw schemaContractError(
      "BARBER_SCHEDULE_SCHEMA_NOT_READY", "Sheet BARBER_SCHEDULE not found.",
      { sheetName: "BARBER_SCHEDULE" });
  }
  inspectPositionalSheetSchema(sheet, {
    sheetName: "BARBER_SCHEDULE",
    label: "BARBER_SCHEDULE",
    contract: BARBER_SCHEDULE_HEADERS.map((header) => ({ name: header, aliases: [header] })),
    notReadyCode: "BARBER_SCHEDULE_SCHEMA_NOT_READY",
    incompatibleCode: "BARBER_SCHEDULE_SCHEMA_INCOMPATIBLE",
    duplicateCode: "BARBER_SCHEDULE_SCHEMA_DUPLICATE_HEADERS"
  });
  return sheet;
}

function normalizeBookingStatusV2(value) {
  const status = String(value || "pending").trim().toLowerCase();
  if (status === "completed") return "done";
  return ["pending", "confirmed", "proposed", "rejected", "done", "cancelled", "expired"].indexOf(status) !== -1
    ? status
    : "pending";
}

function isRecognizedBookingStatusV2(value) {
  return ["pending", "confirmed", "proposed", "rejected", "done", "completed", "cancelled", "expired"]
    .indexOf(String(value || "").trim().toLowerCase()) !== -1;
}

function bookingFromRowV2(row, rowNumber, headers) {
  headers = headers || BOOKING_HEADERS_V2;
  const value = (name, aliases) => bookingRowValueV2(row, headers, name, aliases);
  const id = String(value("ID", ["BOOKING_ID"]) || "").trim() || `BOOK-${rowNumber}`;
  return {
    id,
    bookingId: id,
    rowNumber,
    date: getDateKey(value("DATE", ["BOOKING_DATE"]), TIME_ZONE) || String(value("DATE", ["BOOKING_DATE"]) || "").trim(),
    time: getBookingTimeValue(value("TIME", ["BOOKING_TIME"])),
    customerName: normalizeProtectedText(value("CUSTOMER", ["CUSTOMER_NAME"]), 100),
    customerPhone: String(value("PHONE", ["CUSTOMER_PHONE"]) || "").trim(),
    employee: normalizeProtectedText(value("EMPLOYEE", ["BARBER", "EMPLOYEE_NAME"]), 100),
    service: normalizeProtectedText(value("SERVICE", ["SERVICES"]), 500),
    note: normalizeProtectedText(value("NOTE", ["NOTES"]), 500),
    status: normalizeBookingStatusV2(value("STATUS")),
    createdAt: getDisplayDateTime(value("CREATED_AT")),
    updatedAt: getDisplayDateTime(value("UPDATED_AT")),
    serviceId: String(value("SERVICE_ID") || "").trim(),
    serviceIds: String(value("SERVICE_IDS") || value("SERVICE_ID") || "").split(",").map((item) => item.trim()).filter(Boolean),
    durationMinutes: Math.max(15, Number(value("DURATION_MINUTES", ["DURATION"])) || 30),
    totalPrice: Number(value("TOTAL_PRICE")) || 0,
    source: String(value("SOURCE") || "staff").trim(),
    trackingToken: String(value("TRACKING_TOKEN", ["TRACKING_CODE"]) || "").trim(),
    requestedAt: getDisplayDateTime(value("REQUESTED_AT")),
    confirmedAt: getDisplayDateTime(value("CONFIRMED_AT")),
    confirmedBy: normalizeProtectedText(value("CONFIRMED_BY"), 100),
    rejectionReason: normalizeProtectedText(value("REJECTION_REASON"), 500),
    proposedDate: getDateKey(value("PROPOSED_DATE"), TIME_ZONE) || String(value("PROPOSED_DATE") || "").trim(),
    proposedTime: getBookingTimeValue(value("PROPOSED_TIME")),
    holdExpiresAt: String(value("HOLD_EXPIRES_AT") || "").trim(),
    customerResponse: String(value("CUSTOMER_RESPONSE") || "").trim(),
    employeeId: String(value("EMPLOYEE_ID", ["STAFF_ID"]) || "").trim(),
    cancelledAt: getDisplayDateTime(value("CANCELLED_AT")),
    cancelledBy: normalizeProtectedText(value("CANCELLED_BY"), 100),
    cancellationReason: normalizeProtectedText(value("CANCELLATION_REASON"), 500),
    completedAt: getDisplayDateTime(value("COMPLETED_AT")),
    completedBy: normalizeProtectedText(value("COMPLETED_BY"), 100),
    deleted: parseSheetBoolean(value("DELETED"), false),
    deletedAt: getDisplayDateTime(value("DELETED_AT")),
    deletedBy: normalizeProtectedText(value("DELETED_BY"), 100),
    deletionReason: normalizeProtectedText(value("DELETION_REASON"), 500),
    clientRequestId: String(value("CLIENT_REQUEST_ID") || "").trim(),
    clientRequestFingerprint: String(value("CLIENT_REQUEST_FINGERPRINT") || "").trim(),
    branchId: String(value("BRANCH_ID") || "").trim(),
    availabilityToken: String(value("AVAILABILITY_TOKEN") || "").trim(),
    scheduleVersion: Number(value("SCHEDULE_VERSION")) || 0,
    attendanceOperationalVersion: Number(value("ATTENDANCE_OPERATIONAL_VERSION")) || 0,
    operationalOverrideId: String(value("OPERATIONAL_OVERRIDE_ID") || "").trim(),
    validatedAt: String(value("VALIDATED_AT") || "").trim(),
    validationSourceVersion: String(value("VALIDATION_SOURCE_VERSION") || "").trim(),
    serviceDurationSnapshot: Number(value("SERVICE_DURATION_SNAPSHOT")) ||
      Math.max(15, Number(value("DURATION_MINUTES", ["DURATION"])) || 30),
    preparationMinutesSnapshot: Math.max(0, Number(value("PREPARATION_MINUTES_SNAPSHOT")) || 0),
    cleanupMinutesSnapshot: Math.max(0, Number(value("CLEANUP_MINUTES_SNAPSHOT")) || 0),
    occupiedStartTime: String(value("OCCUPIED_START_TIME") || "").trim(),
    occupiedEndTime: String(value("OCCUPIED_END_TIME") || "").trim(),
    serviceConfigurationVersion: String(value("SERVICE_CONFIGURATION_VERSION") || "").trim()
  };
}

function bookingToRowV2(booking, headers, existingRow) {
  headers = headers || BOOKING_HEADERS_V2;
  const row = existingRow ? existingRow.slice() : new Array(headers.length).fill("");
  const values = {
    ID: booking.id, DATE: booking.date, TIME: booking.time,
    CUSTOMER: normalizeProtectedText(booking.customerName, 100),
    PHONE: booking.customerPhone,
    EMPLOYEE: normalizeProtectedText(booking.employee, 100),
    SERVICE: normalizeProtectedText(booking.service, 500),
    NOTE: normalizeProtectedText(booking.note, 500),
    STATUS: booking.status, CREATED_AT: booking.createdAt, UPDATED_AT: booking.updatedAt,
    SERVICE_ID: booking.serviceId, DURATION_MINUTES: booking.durationMinutes, SOURCE: booking.source,
    TRACKING_TOKEN: booking.trackingToken, REQUESTED_AT: booking.requestedAt, CONFIRMED_AT: booking.confirmedAt,
    CONFIRMED_BY: normalizeProtectedText(booking.confirmedBy, 100),
    REJECTION_REASON: normalizeProtectedText(booking.rejectionReason, 500),
    PROPOSED_DATE: booking.proposedDate,
    PROPOSED_TIME: booking.proposedTime, HOLD_EXPIRES_AT: booking.holdExpiresAt, CUSTOMER_RESPONSE: booking.customerResponse,
    EMPLOYEE_ID: booking.employeeId, CANCELLED_AT: booking.cancelledAt,
    CANCELLED_BY: normalizeProtectedText(booking.cancelledBy, 100),
    CANCELLATION_REASON: normalizeProtectedText(booking.cancellationReason, 500),
    COMPLETED_AT: booking.completedAt,
    COMPLETED_BY: normalizeProtectedText(booking.completedBy, 100),
    DELETED: booking.deleted === true, DELETED_AT: booking.deletedAt,
    DELETED_BY: normalizeProtectedText(booking.deletedBy, 100),
    SERVICE_IDS: Array.isArray(booking.serviceIds) ? booking.serviceIds.join(",") : (booking.serviceIds || booking.serviceId || ""),
    TOTAL_PRICE: Number(booking.totalPrice) || 0,
    DELETION_REASON: normalizeProtectedText(booking.deletionReason, 500),
    CLIENT_REQUEST_ID: booking.clientRequestId, CLIENT_REQUEST_FINGERPRINT: booking.clientRequestFingerprint,
    BRANCH_ID: booking.branchId, AVAILABILITY_TOKEN: booking.availabilityToken,
    SCHEDULE_VERSION: booking.scheduleVersion,
    ATTENDANCE_OPERATIONAL_VERSION: booking.attendanceOperationalVersion,
    OPERATIONAL_OVERRIDE_ID: booking.operationalOverrideId,
    VALIDATED_AT: booking.validatedAt,
    VALIDATION_SOURCE_VERSION: booking.validationSourceVersion,
    SERVICE_DURATION_SNAPSHOT: booking.serviceDurationSnapshot,
    PREPARATION_MINUTES_SNAPSHOT: booking.preparationMinutesSnapshot,
    CLEANUP_MINUTES_SNAPSHOT: booking.cleanupMinutesSnapshot,
    OCCUPIED_START_TIME: booking.occupiedStartTime,
    OCCUPIED_END_TIME: booking.occupiedEndTime,
    SERVICE_CONFIGURATION_VERSION: booking.serviceConfigurationVersion
  };
  Object.keys(values).forEach((name) => setBookingRowValueV2(row, headers, name, values[name]));
  return row;
}

function writeBookingRowV2(sheet, rowNumber, booking, existingRow) {
  const headers = getBookingHeadersV2(sheet);
  const row = bookingToRowV2(booking, headers, existingRow);
  writeSheetRowWithExplicitValues(sheet, rowNumber, row);
  return row;
}

function appendBookingRowV2(sheet, booking) {
  const rowNumber = sheet.getLastRow() + 1;
  return { rowNumber, row: writeBookingRowV2(sheet, rowNumber, booking) };
}

function sheetExtendedValue(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return { numberValue: (value.getTime() / 86400000) + 25569 };
  }
  if (typeof value === "boolean") return { boolValue: value };
  if (typeof value === "number" && Number.isFinite(value)) return { numberValue: value };
  return { stringValue: String(value == null ? "" : value) };
}

function writeSheetRowWithExplicitValues(sheet, rowNumber, row) {
  if (!sheet || typeof sheet.getSheetId !== "function" ||
      typeof Sheets === "undefined" || !Sheets.Spreadsheets ||
      typeof Sheets.Spreadsheets.batchUpdate !== "function") {
    const error = new Error("SAFE_SHEET_WRITE_UNAVAILABLE");
    error.code = "SAFE_SHEET_WRITE_UNAVAILABLE";
    error.businessMutationState = "NOT_STARTED";
    throw error;
  }
  const spreadsheet = SpreadsheetApp.getActive();
  if (!spreadsheet || typeof spreadsheet.getId !== "function") {
    const error = new Error("SAFE_SHEET_WRITE_UNAVAILABLE");
    error.code = "SAFE_SHEET_WRITE_UNAVAILABLE";
    error.businessMutationState = "NOT_STARTED";
    throw error;
  }
  Sheets.Spreadsheets.batchUpdate({
    requests: [{
      updateCells: {
        start: {
          sheetId: sheet.getSheetId(),
          rowIndex: Number(rowNumber) - 1,
          columnIndex: 0
        },
        rows: [{
          values: (row || []).map((value) => ({
            userEnteredValue: sheetExtendedValue(value)
          }))
        }],
        fields: "userEnteredValue"
      }
    }]
  }, spreadsheet.getId());
}

function validateClientRequestId(value) {
  const requestId = String(value || "").trim();
  if (!requestId) return { ok: true, value: "" };
  if (requestId.length < 8 || requestId.length > 128 ||
      !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(requestId)) {
    return { ok: false, value: "", code: "INVALID_CLIENT_REQUEST_ID" };
  }
  return { ok: true, value: requestId };
}

function bookingRequestFingerprint(kind, values) {
  const canonical = JSON.stringify({
    kind: String(kind || ""),
    customerName: normalizeProtectedText(values.customerName, 100),
    customerPhone: normalizePublicPhone(values.customerPhone),
    employeeId: String(values.employeeId || "").trim(),
    date: normalizeDigits(String(values.date || "").trim()),
    time: normalizeDigits(String(values.time || "").trim()),
    serviceIds: (values.serviceIds || []).map((item) => String(item || "").trim()).sort(),
    manualService: normalizeProtectedText(values.manualService, 100),
    manualDuration: Number(values.manualDuration) || 0,
    note: normalizeProtectedText(values.note, 500)
  });
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    canonical,
    Utilities.Charset.UTF_8
  );
  return digest.map((byte) => (`0${(byte < 0 ? byte + 256 : byte).toString(16)}`).slice(-2)).join("");
}

function findBookingByClientRequestId(bookings, requestId) {
  const target = String(requestId || "").trim();
  return target
    ? (bookings || []).find((booking) => String(booking.clientRequestId || "").trim() === target) || null
    : null;
}

function bookingIdempotencyResult(existing, fingerprint, responseBuilder) {
  if (!existing) return null;
  if (!existing.clientRequestFingerprint || existing.clientRequestFingerprint !== fingerprint) {
    return bookingApiError("IDEMPOTENCY_KEY_REUSED", "This client request ID was already used for a different booking request.");
  }
  return responseBuilder(existing);
}

function findBookingRowV2(sheet, data) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const targetRow = Number(data.rowNumber || 0);
  const targetId = String(data.id || data.bookingId || "").trim();
  if (!targetId) return null;
  const headers = getBookingHeadersV2(sheet);
  const rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  for (let index = 0; index < rows.length; index++) {
    const rowNumber = index + 2;
    const storedId = String(bookingRowValueV2(rows[index], headers, "ID", ["BOOKING_ID"]) || "").trim();
    const booking = bookingFromRowV2(rows[index], rowNumber, headers);
    const idMatches = storedId && storedId === targetId;
    const rowMatches = targetRow && targetRow === rowNumber;
    if ((rowMatches && idMatches) || (!targetRow && idMatches)) {
      return { rowNumber, booking, row: rows[index] };
    }
  }
  return null;
}

function publicBookingServices() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("SERVICES");
  if (!sheet || sheet.getLastRow() < 2) return [];
  const width = typeof sheet.getLastColumn === "function" ? Math.max(6, sheet.getLastColumn()) : 6;
  const headers = width > 6
    ? sheet.getRange(1, 1, 1, width).getValues()[0].map((value) =>
      String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_"))
    : [];
  const preparationIndex = headers.indexOf("PREPARATION_MINUTES");
  const cleanupIndex = headers.indexOf("CLEANUP_MINUTES");
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, width).getValues();
  return rows.map((row, index) => {
    const rawDuration = String(row[5] == null ? "" : row[5]).trim();
    return {
      name: String(row[0] || "").trim(),
      price: parseSheetAmount(row[1]),
      active: parseServiceActiveFlag(row[2]),
      order: Number(row[3]) || index + 1,
      // Missing legacy IDs are reported, never generated by this read action.
      serviceId: String(row[4] || "").trim(),
      durationMinutes: rawDuration ? Number(row[5]) : 30,
      preparationMinutes: preparationIndex >= 0 ? Math.max(0, Number(row[preparationIndex]) || 0) : 0,
      cleanupMinutes: cleanupIndex >= 0 ? Math.max(0, Number(row[cleanupIndex]) || 0) : 0
    };
  }).filter((service) => {
    const name = service.name.toLowerCase();
    const separators = (name.match(/[-–—]/g) || []).length;
    const isPackage = /[+＋]/.test(name)
      || /باك(?:ي)?دج|package|pack|vip/i.test(name)
      || separators >= 2;
    return service.name && service.serviceId && service.active && !isPackage;
  }).sort((a, b) => a.order - b.order);
}

function getPublicBookingServiceIds(data) {
  const values = data && Array.isArray(data.serviceIds)
    ? data.serviceIds
    : String((data && data.serviceId) || "").split(",");
  return values.map((value) => String(value || "").trim()).filter(Boolean);
}

function bookingServiceIdsInputIsValid(data) {
  return !data || !Object.prototype.hasOwnProperty.call(data, "serviceIds") ||
    Array.isArray(data.serviceIds);
}

function bookingServiceIdsHaveDuplicates(serviceIds) {
  const ids = Array.isArray(serviceIds) ? serviceIds : [];
  return new Set(ids).size !== ids.length;
}

function getSelectedPublicBookingServices(data, services) {
  const ids = getPublicBookingServiceIds(data);
  const selected = services.filter((service) => ids.indexOf(service.serviceId) !== -1);
  return selected.length ? selected : services.slice(0, 1);
}

function applyBookingOccupancySnapshot(booking, preparationMinutes, cleanupMinutes, configurationVersion, occupiedTime) {
  const start = bookingMinutes(occupiedTime || booking.time);
  const duration = Math.max(15, Number(booking.durationMinutes) || 30);
  const preparation = Math.max(0, Number(preparationMinutes) || 0);
  const cleanup = Math.max(0, Number(cleanupMinutes) || 0);
  booking.serviceDurationSnapshot = duration;
  booking.preparationMinutesSnapshot = preparation;
  booking.cleanupMinutesSnapshot = cleanup;
  booking.occupiedStartTime = start === null ? "" : minutesToBookingTime(start - preparation);
  booking.occupiedEndTime = start === null ? "" : minutesToBookingTime(start + duration + cleanup);
  booking.serviceConfigurationVersion = String(configurationVersion || "").trim();
  return booking;
}

function commitBookingPhase5UnderCurrentLock(options) {
  const data = options.data || {};
  const booking = options.booking;
  const fallbackHash = typeof BookingAvailabilityPhase5 !== "undefined"
    ? BookingAvailabilityPhase5.hash({
      action: options.action, bookingId: booking.id, updatedAt: booking.updatedAt,
      status: booking.status, date: booking.date, time: booking.time
    })
    : String(booking.id || "").replace(/[^A-Za-z0-9]/g, "").slice(-24);
  const requestId = String(options.requestId || data.clientRequestId ||
    `BOOKING-${fallbackHash}`).trim();
  if (typeof bookingAvailabilityPhase5RunTransaction !== "function" ||
      bookingAvailabilityEngineMode() === "LEGACY") {
    options.business();
    if (typeof bookingAvailabilityPhase5AfterBookingMutationUnderLock === "function") {
      bookingAvailabilityPhase5AfterBookingMutationUnderLock(data, booking);
    }
    return booking;
  }
  const actor = typeof bookingAvailabilityPhase5Actor === "function"
    ? bookingAvailabilityPhase5Actor(data, true) : null;
  return bookingAvailabilityPhase5RunTransaction({
    data,
    requestId,
    action: options.action,
    entityType: "BOOKING",
    entityId: booking.id,
    branchId: booking.branchId,
    date: booking.date,
    actor,
    beforeState: options.beforeState || {},
    business: () => {
      options.business();
      return booking;
    },
    version: () => bookingAvailabilityPhase5IncrementVersion(
      "booking", booking.branchId, booking.date, actor),
    audit: () => bookingAvailabilityPhase5AppendAudit({
      action: options.action,
      entityType: "BOOKING",
      entityId: booking.id,
      branchId: booking.branchId,
      staffId: booking.employeeId,
      date: booking.date,
      actorId: actor ? actor.actorId : "public",
      actorRole: actor ? actor.role : "PUBLIC",
      reasonCode: options.reasonCode || options.action,
      beforeState: options.beforeState || {},
      afterState: {
        status: booking.status, date: booking.date, time: booking.time,
        staffId: booking.employeeId,
        serviceConfigurationVersion: booking.serviceConfigurationVersion
      },
      requestId
    }),
    compensateBusiness: () => options.compensate()
  });
}

function committedBookingMutationRetry(data) {
  if (typeof bookingAvailabilityPhase5CommittedResultForRequest !== "function" ||
      bookingAvailabilityEngineMode() !== "PHASE5") return null;
  const requestId = String((data && data.clientRequestId) || "").trim();
  return bookingAvailabilityPhase5CommittedResultForRequest(requestId);
}

function bookingServiceSetHash(services, fallbackIds) {
  const configuration = (services || []).map((service) => ({
    serviceId: String(service.serviceId || "").trim(),
    durationMinutes: Number(service.durationMinutes) || 0,
    preparationMinutes: Number(service.preparationMinutes) || 0,
    cleanupMinutes: Number(service.cleanupMinutes) || 0
  })).sort((left, right) => left.serviceId.localeCompare(right.serviceId));
  const value = configuration.length ? configuration :
    (fallbackIds || []).map((serviceId) => ({ serviceId: String(serviceId || "").trim() }));
  return typeof BookingAvailabilityPhase5 !== "undefined"
    ? BookingAvailabilityPhase5.hash(value) : JSON.stringify(value);
}

function resolveTrustedBookingServiceTotals(booking, services) {
  const ids = Array.isArray(booking.serviceIds) ? booking.serviceIds : [];
  if (!ids.length) {
    if (!booking.service || !isValidBookingDuration(booking.durationMinutes) ||
        !isValidBookingPrice(booking.totalPrice)) {
      return bookingAppointmentValidationError("INVALID_SERVICES", "The booking service configuration is invalid.");
    }
    return {
      ok: true,
      durationMinutes: Number(booking.durationMinutes),
      totalPrice: Number(booking.totalPrice) || 0,
      preparationMinutes: Number(booking.preparationMinutes) || 0,
      cleanupMinutes: Number(booking.cleanupMinutes) || 0,
      serviceSetHash: bookingServiceSetHash([], booking.serviceIds || [])
    };
  }
  if (bookingServiceIdsHaveDuplicates(ids)) {
    return bookingAppointmentValidationError("INVALID_SERVICES", "Duplicate service IDs are not allowed.");
  }
  const available = Array.isArray(services) ? services : publicBookingServices();
  const selected = available.filter((service) => ids.indexOf(service.serviceId) !== -1);
  if (selected.length !== ids.length || !selected.length ||
      !selected.every((service) =>
        isValidBookingDuration(service.durationMinutes) && isValidBookingPrice(service.price))) {
    return bookingAppointmentValidationError("INVALID_SERVICES", "One or more booking services are unavailable.");
  }
  const durationMinutes = selected.reduce((sum, service) => sum + Number(service.durationMinutes), 0);
  const totalPrice = selected.reduce((sum, service) => sum + Number(service.price), 0);
  const preparationMinutes = selected.reduce((sum, service) =>
    sum + Math.max(0, Number(service.preparationMinutes) || 0), 0);
  const cleanupMinutes = selected.reduce((sum, service) =>
    sum + Math.max(0, Number(service.cleanupMinutes) || 0), 0);
  if (!isValidBookingDuration(durationMinutes) || !isValidBookingPrice(totalPrice)) {
    return bookingAppointmentValidationError("INVALID_SERVICES", "The booking service configuration is invalid.");
  }
  return {
    ok: true, durationMinutes, totalPrice, preparationMinutes, cleanupMinutes,
    serviceSetHash: bookingServiceSetHash(selected, ids)
  };
}

function publicBookingBarbers() {
  const sheet = getStaffSheet();
  if (sheet.getLastRow() < 2) return [];
  const width = typeof sheet.getLastColumn === "function" ? Math.max(11, sheet.getLastColumn()) : 11;
  const headers = width > 11
    ? sheet.getRange(1, 1, 1, width).getValues()[0].map((value) =>
      String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_"))
    : [];
  const branchIndex = headers.indexOf("BRANCH_ID");
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, width).getValues()
    .map((row, index) => ({
      staffId: String(row[4] || buildStaffId(index + 1)).trim(),
      name: String(row[0] || "").trim(),
      code: String(row[1] || "").trim(),
      active: parseSheetBoolean(row[7], true),
      isBarber: parseSheetBoolean(row[10], true),
      branchId: branchIndex >= 0 ? String(row[branchIndex] || "").trim() : ""
    }))
    .filter((barber) => barber.staffId && barber.name && barber.active && barber.isBarber);
}

function getUniqueActiveBarberByNameV2(employeeName, barbers) {
  const employeeKey = normalizeLookupKey(employeeName);
  if (!employeeKey) return null;
  const activeBarbers = Array.isArray(barbers) ? barbers : publicBookingBarbers();
  const matches = activeBarbers.filter((barber) => normalizeLookupKey(barber.name) === employeeKey);
  return matches.length === 1 ? matches[0] : null;
}

function bookingWeekday(dateKey) {
  const day = Utilities.formatDate(new Date(`${dateKey}T12:00:00`), TIME_ZONE, "EEEE");
  return String(day || "").trim().toLowerCase();
}

function normalizeScheduleWeekday(value) {
  const key = String(value || "").trim().toLowerCase();
  const aliases = {
    "0": "sunday", sun: "sunday", sunday: "sunday", "الأحد": "sunday", "الاحد": "sunday",
    "1": "monday", mon: "monday", monday: "monday", "الاثنين": "monday", "الإثنين": "monday",
    "2": "tuesday", tue: "tuesday", tuesday: "tuesday", "الثلاثاء": "tuesday",
    "3": "wednesday", wed: "wednesday", wednesday: "wednesday", "الأربعاء": "wednesday", "الاربعاء": "wednesday",
    "4": "thursday", thu: "thursday", thursday: "thursday", "الخميس": "thursday",
    "5": "friday", fri: "friday", friday: "friday", "الجمعة": "friday",
    "6": "saturday", sat: "saturday", saturday: "saturday", "السبت": "saturday"
  };
  return aliases[key] || key;
}

function getScheduleForBarber(barber, dateKey, barbers) {
  const sheet = getBarberScheduleSheetReadOnly();
  const weekday = bookingWeekday(dateKey);
  let matching = null;
  if (sheet.getLastRow() >= 2) {
    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, BARBER_SCHEDULE_HEADERS.length).getValues();
    matching = rows.find((row) => {
      const rowStaffId = String(row[1] || "").trim();
      const rowStaffName = normalizeLookupKey(row[2]);
      const rowDay = normalizeScheduleWeekday(row[3]);
      const active = parseSheetBoolean(row[6], true);
      const employeeMatches = rowStaffId
        ? rowStaffId === barber.staffId
        : String((getUniqueActiveBarberByNameV2(rowStaffName, barbers) || {}).staffId || "") === barber.staffId;
      return active && rowDay === weekday && employeeMatches;
    }) || null;
  }

  if (!matching) return { shiftStart: "12:00", shiftEnd: "02:00", scheduled: false };
  return {
    shiftStart: getBookingTimeValue(matching[4]) || "12:00",
    shiftEnd: getBookingTimeValue(matching[5]) || "02:00",
    scheduled: true
  };
}

function getAttendanceOverride(barber, dateKey, barbers) {
  const sheet = getAttendanceSheetReadOnly();
  if (sheet.getLastRow() < 2) return null;
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, ATTENDANCE_HEADERS.length).getValues();
  const matches = rows.filter((row) => {
    const rowDate = getDateKey(row[1], TIME_ZONE);
    const staffId = String(row[2] || "").trim();
    const staffName = normalizeLookupKey(row[3]);
    const employeeMatches = staffId
      ? staffId === barber.staffId
      : String((getUniqueActiveBarberByNameV2(staffName, barbers) || {}).staffId || "") === barber.staffId;
    return rowDate === dateKey && employeeMatches;
  });
  if (!matches.length) return null;
  const absent = matches.find((row) => String(row[4] || "").trim().toLowerCase() === "absent");
  if (absent) return { unavailable: true, recordType: "absent" };
  const work = matches.reverse().find((row) => String(row[4] || "work").trim().toLowerCase() === "work");
  return work ? {
    unavailable: false,
    recordType: "work",
    shiftStart: getBookingTimeValue(work[5]),
    checkIn: getBookingTimeValue(work[6]),
    checkOut: getBookingTimeValue(work[9])
  } : null;
}

function bookingMinutes(value) {
  const parts = String(value || "").trim().split(":");
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? (hours * 60) + minutes : null;
}

function minutesToBookingTime(value) {
  const normalized = ((Number(value) % (24 * 60)) + (24 * 60)) % (24 * 60);
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

function bookingTimelineMinutes(value, shiftStart) {
  let minutes = bookingMinutes(value);
  const startMinutes = bookingMinutes(shiftStart);
  if (minutes !== null && startMinutes !== null && minutes < startMinutes) minutes += 24 * 60;
  return minutes;
}

function bookingHoldIsActive(booking) {
  if (booking.status !== "pending") return false;
  if (!booking.holdExpiresAt) return true;
  const expires = new Date(booking.holdExpiresAt);
  return isNaN(expires.getTime()) || expires.getTime() > Date.now();
}

function bookingBlocksSlot(booking) {
  return !booking.deleted && (booking.status === "confirmed" || booking.status === "proposed" || bookingHoldIsActive(booking));
}

function isBookingStatusTransitionAllowed(currentStatus, nextStatus) {
  const allowed = {
    pending: ["confirmed", "proposed", "rejected", "cancelled", "expired"],
    proposed: ["confirmed", "rejected", "cancelled", "expired"],
    confirmed: ["done", "cancelled"],
    done: [],
    rejected: [],
    cancelled: [],
    expired: []
  };
  const current = normalizeBookingStatusV2(currentStatus);
  const next = normalizeBookingStatusV2(nextStatus);
  return current !== next && (allowed[current] || []).indexOf(next) !== -1;
}

function bookingStatusIsTerminal(status) {
  return ["done", "cancelled", "rejected", "expired"].indexOf(normalizeBookingStatusV2(status)) !== -1;
}

function getAllBookingsV2() {
  const sheet = getBookingsSheetV2ReadOnly();
  if (sheet.getLastRow() < 2) return [];
  const headers = getBookingHeadersV2(sheet);
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues()
    .map((row, index) => bookingFromRowV2(row, index + 2, headers));
}

function getAllBookingsV2ForWrite() {
  const sheet = getBookingsSheetV2();
  if (sheet.getLastRow() < 2) return [];
  const headers = getBookingHeadersV2(sheet);
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues()
    .map((row, index) => bookingFromRowV2(row, index + 2, headers));
}

function bookingEmployeeMatchesV2(booking, employeeId, employeeName, barbers) {
  const bookingEmployeeId = String(booking.employeeId || "").trim();
  const requestedEmployeeId = String(employeeId || "").trim();
  if (bookingEmployeeId && requestedEmployeeId) return bookingEmployeeId === requestedEmployeeId;
  if (bookingEmployeeId) return false;
  const bookingEmployeeName = normalizeLookupKey(booking.employee);
  if (!bookingEmployeeName) return false;
  const uniqueBarber = getUniqueActiveBarberByNameV2(bookingEmployeeName, barbers);
  if (!uniqueBarber) return false;
  if (requestedEmployeeId) {
    return String(uniqueBarber.staffId || "").trim() === requestedEmployeeId;
  }
  return bookingEmployeeName === normalizeLookupKey(employeeName);
}

function bookingSlotIsFree(employeeId, employeeName, dateKey, time, durationMinutes, excludeId, bookings, shiftStart, barbers) {
  const start = shiftStart ? bookingTimelineMinutes(time, shiftStart) : bookingMinutes(time);
  if (start === null) return false;
  const end = start + Math.max(15, Number(durationMinutes) || 30);
  const bookingRows = Array.isArray(bookings) ? bookings : getAllBookingsV2();
  return !bookingRows.some((booking) => {
    const occupiedDate = booking.status === "proposed" && booking.proposedDate ? booking.proposedDate : booking.date;
    const occupiedTime = booking.status === "proposed" && booking.proposedTime ? booking.proposedTime : booking.time;
    if (booking.id === excludeId || occupiedDate !== dateKey ||
        !bookingEmployeeMatchesV2(booking, employeeId, employeeName, barbers) ||
        !bookingBlocksSlot(booking)) return false;
    const otherStart = shiftStart ? bookingTimelineMinutes(occupiedTime, shiftStart) : bookingMinutes(occupiedTime);
    if (otherStart === null) return false;
    const otherEnd = otherStart + Math.max(15, Number(booking.durationMinutes) || 30);
    return start < otherEnd && end > otherStart;
  });
}

function resolveBookingBarberV2(employeeId, employeeName, barbers) {
  const rows = Array.isArray(barbers) ? barbers : publicBookingBarbers();
  const cleanId = String(employeeId || "").trim();
  if (cleanId) return rows.find((barber) => String(barber.staffId || "").trim() === cleanId) || null;
  const nameMatches = rows.filter((barber) => normalizeLookupKey(barber.name) === normalizeLookupKey(employeeName));
  return nameMatches.length === 1 ? nameMatches[0] : null;
}

function bookingAppointmentValidationError(code, message) {
  return { ok: false, code: code || "SLOT_UNAVAILABLE", message };
}

function validateBookingAppointmentLegacyV2(options) {
  const dateKey = String(options.date || "").trim();
  const time = normalizeDigits(String(options.time || "").trim());
  const durationMinutes = Number(options.durationMinutes);
  if (!isValidBookingDateKey(dateKey) || !isStrictBookingTime(time) || !isValidBookingDuration(durationMinutes)) {
    return bookingAppointmentValidationError("INVALID_APPOINTMENT", "The appointment date, time, or duration is invalid.");
  }
  const barber = resolveBookingBarberV2(options.employeeId, options.employeeName, options.barbers);
  if (!barber) return bookingAppointmentValidationError("EMPLOYEE_UNAVAILABLE", "The selected employee does not exist or is inactive.");
  const schedule = getScheduleForBarber(barber, dateKey, options.barbers);
  if (!schedule.scheduled) return bookingAppointmentValidationError("EMPLOYEE_UNAVAILABLE", "The selected employee is not scheduled to work on this date.");
  const attendance = getAttendanceOverride(barber, dateKey, options.barbers);
  if (attendance && attendance.unavailable) {
    return bookingAppointmentValidationError("EMPLOYEE_UNAVAILABLE", "The selected employee is absent or unavailable.");
  }
  const shiftStart = attendance && attendance.shiftStart ? attendance.shiftStart : schedule.shiftStart;
  const shiftEnd = attendance && attendance.checkOut ? attendance.checkOut : schedule.shiftEnd;
  if (!isStrictBookingTime(shiftStart) || !isStrictBookingTime(shiftEnd)) {
    return bookingAppointmentValidationError("INVALID_APPOINTMENT", "The employee schedule contains an invalid time.");
  }
  const shiftStartMinutes = bookingMinutes(shiftStart);
  let shiftEndMinutes = bookingMinutes(shiftEnd);
  const appointmentStart = bookingTimelineMinutes(time, shiftStart);
  if (shiftStartMinutes === null || shiftEndMinutes === null || appointmentStart === null) {
    return bookingAppointmentValidationError("INVALID_APPOINTMENT", "The employee schedule contains an invalid time.");
  }
  if (shiftEndMinutes <= shiftStartMinutes) shiftEndMinutes += 24 * 60;
  const appointmentEnd = appointmentStart + durationMinutes;
  if (appointmentStart < shiftStartMinutes || appointmentEnd > shiftEndMinutes ||
      (appointmentStart - shiftStartMinutes) % BOOKING_SLOT_INTERVAL_MINUTES !== 0) {
    return bookingAppointmentValidationError("SLOT_UNAVAILABLE", "The appointment is outside the employee shift or does not align with booking slots.");
  }
  const today = Utilities.formatDate(new Date(), TIME_ZONE, "yyyy-MM-dd");
  if (dateKey < today) return bookingAppointmentValidationError("SLOT_UNAVAILABLE", "Appointments cannot be created in the past.");
  if (dateKey === today) {
    const nowMinutes = bookingMinutes(Utilities.formatDate(new Date(), TIME_ZONE, "HH:mm"));
    if (appointmentStart < Math.ceil((nowMinutes + 15) / BOOKING_SLOT_INTERVAL_MINUTES) * BOOKING_SLOT_INTERVAL_MINUTES) {
      return bookingAppointmentValidationError("SLOT_UNAVAILABLE", "The appointment time is in the past.");
    }
  }
  const bookings = Array.isArray(options.bookings) ? options.bookings : getAllBookingsV2();
  if (!bookingSlotIsFree(
    barber.staffId, barber.name, dateKey, time, durationMinutes,
    options.excludeId || "", bookings, shiftStart, options.barbers
  )) {
    return bookingAppointmentValidationError("SLOT_UNAVAILABLE", "This appointment overlaps another active booking.");
  }
  return { ok: true, barber, date: dateKey, time, durationMinutes, shiftStart, shiftEnd };
}

function bookingEffectiveStatusV2(booking, nowMs) {
  const status = normalizeBookingStatusV2(booking && booking.status);
  if (status !== "pending" || !booking.holdExpiresAt) return status;
  const expiry = Date.parse(booking.holdExpiresAt);
  return Number.isFinite(expiry) && expiry <= (Number(nowMs) || Date.now())
    ? "expired" : status;
}

function bookingAvailabilityEngineMode() {
  if (typeof bookingAvailabilityPhase5Flags === "function") {
    return bookingAvailabilityPhase5Flags().engine;
  }
  return "LEGACY";
}

function bookingAvailabilityLiveRefreshEnabled(audience) {
  if (typeof bookingAvailabilityPhase5Flags !== "function") return false;
  const flags = bookingAvailabilityPhase5Flags();
  return audience === "internal"
    ? flags.internalLiveRefreshEnabled === true
    : flags.customerLiveRefreshEnabled === true;
}

function runBookingAvailabilityAuthority(legacyCallback, phase5Callback, context) {
  const mode = bookingAvailabilityEngineMode();
  if (typeof BookingAvailabilityPhase5 !== "undefined" &&
      typeof BookingAvailabilityPhase5.executeAuthoritativeEngine === "function") {
    return BookingAvailabilityPhase5.executeAuthoritativeEngine({
      mode,
      legacy: legacyCallback,
      phase5: phase5Callback,
      onComparison: (comparison) => {
        try {
          Logger.log(JSON.stringify({
            event: "booking_availability_shadow_comparison",
            context: context || {},
            comparison
          }));
        } catch (ignore) {}
      }
    }).result;
  }
  if (mode === "PHASE5") {
    const error = new Error("Booking Availability Phase 5 runtime is unavailable.");
    error.code = "PHASE5_AVAILABILITY_FAILED_CLOSED";
    throw error;
  }
  return legacyCallback();
}

function validateBookingAppointmentV2(options) {
  return runBookingAvailabilityAuthority(
    () => validateBookingAppointmentLegacyV2(options),
    () => {
      if (typeof bookingAvailabilityPhase5ValidateAppointment !== "function") {
        throw new Error("Booking Availability Phase 5 adapter is unavailable.");
      }
      const barber = resolveBookingBarberV2(options.employeeId, options.employeeName, options.barbers);
      if (!barber) {
        return bookingAppointmentValidationError(
          "EMPLOYEE_UNAVAILABLE", "The selected employee does not exist or is inactive.");
      }
      return bookingAvailabilityPhase5ValidateAppointment({
        ...options,
        barber,
        employeeId: barber.staffId,
        audience: options.audience || "public",
        requestData: options.requestData || {}
      });
    },
    {
      operation: "final_validation",
      employeeId: options.employeeId,
      date: options.date,
      time: options.time
    }
  );
}

function availableSlotsForBarberLegacy(barber, dateKey, durationMinutes, bookings, barbers) {
  const today = Utilities.formatDate(new Date(), TIME_ZONE, "yyyy-MM-dd");
  if (!dateKey || dateKey < today) return { slots: [], availability: "unavailable", shiftStart: "", shiftEnd: "" };
  const schedule = getScheduleForBarber(barber, dateKey, barbers);
  if (!schedule.scheduled) return { slots: [], availability: "unavailable", shiftStart: "", shiftEnd: "" };
  const attendance = getAttendanceOverride(barber, dateKey, barbers);
  if (attendance && attendance.unavailable) {
    return { slots: [], availability: "unavailable", shiftStart: schedule.shiftStart, shiftEnd: schedule.shiftEnd };
  }

  const shiftStart = attendance && attendance.shiftStart ? attendance.shiftStart : schedule.shiftStart;
  const shiftEnd = attendance && attendance.checkOut ? attendance.checkOut : schedule.shiftEnd;
  if (!isStrictBookingTime(shiftStart) || !isStrictBookingTime(shiftEnd)) {
    return { slots: [], availability: "unavailable", shiftStart, shiftEnd };
  }
  const startMinutes = bookingMinutes(shiftStart);
  let endMinutes = bookingMinutes(shiftEnd);
  if (startMinutes === null || endMinutes === null) {
    return { slots: [], availability: "unavailable", shiftStart, shiftEnd };
  }
  if (endMinutes <= startMinutes) endMinutes += 24 * 60;

  let earliest = startMinutes;
  if (dateKey === today) {
    const nowText = Utilities.formatDate(new Date(), TIME_ZONE, "HH:mm");
    const nowMinutes = bookingMinutes(nowText);
    earliest = Math.max(earliest, Math.ceil((nowMinutes + 15) / 30) * 30);
  }

  const slots = [];
  for (let minute = startMinutes; minute + durationMinutes <= endMinutes; minute += BOOKING_SLOT_INTERVAL_MINUTES) {
    const time = minutesToBookingTime(minute);
    if (minute >= earliest && bookingSlotIsFree(
      barber.staffId, barber.name, dateKey, time, durationMinutes,
      "", bookings, shiftStart, barbers
    )) slots.push(time);
  }

  let availability = slots.length ? "available" : "unavailable";
  if (dateKey === today && bookingMinutes(Utilities.formatDate(new Date(), TIME_ZONE, "HH:mm")) < startMinutes) availability = "not_started";
  return { slots, availability, shiftStart, shiftEnd };
}

function availableSlotsForBarber(barber, dateKey, durationMinutes, bookings, barbers, options) {
  const data = options || {};
  return runBookingAvailabilityAuthority(
    () => availableSlotsForBarberLegacy(barber, dateKey, durationMinutes, bookings, barbers),
    () => {
      if (typeof bookingAvailabilityPhase5Evaluate !== "function") {
        throw new Error("Booking Availability Phase 5 adapter is unavailable.");
      }
      const result = bookingAvailabilityPhase5Evaluate({
        employeeId: barber.staffId,
        branchId: data.branchId || barber.branchId,
        date: dateKey,
        audience: data.audience === "internal" ? "internal" : "public",
        requestData: data,
        durationMinutes,
        preparationMinutes: data.preparationMinutes || 0,
        cleanupMinutes: data.cleanupMinutes || 0,
        serviceSetHash: data.serviceSetHash || "",
        snapshot: data.availabilitySnapshot,
        bookings
      });
      const internalActor = data.audience === "internal" &&
          typeof schedulePhase2Actor === "function" ? schedulePhase2Actor(data) : null;
      const dtoPermissions = internalActor && internalActor.owner
        ? BookingAvailabilityPhase5.PERMISSIONS : ((internalActor && internalActor.permissions) || []);
      const safeResult = typeof BookingAvailabilityPhase5 !== "undefined" &&
          data.audience === "internal" &&
          typeof BookingAvailabilityPhase5.internalDto === "function"
        ? BookingAvailabilityPhase5.internalDto(result, dtoPermissions)
        : typeof BookingAvailabilityPhase5 !== "undefined" &&
            typeof BookingAvailabilityPhase5.publicDto === "function"
          ? BookingAvailabilityPhase5.publicDto(result)
        : { reasonCode: "UNAVAILABLE", availabilityToken: result.availabilityToken,
            generatedAt: result.generatedAt };
      return {
        slots: (result.slots || []).map((slot) => slot.start),
        availability: String(result.availability || "").toLowerCase(),
        shiftStart: "",
        shiftEnd: "",
        reasonCode: safeResult.reasonCode,
        availabilityToken: safeResult.availabilityToken,
        generatedAt: safeResult.generatedAt,
        ...(safeResult.scheduleSource ? { scheduleSource: safeResult.scheduleSource } : {}),
        ...(safeResult.operationalRestriction
          ? { operationalRestriction: safeResult.operationalRestriction } : {}),
        ...(safeResult.scheduleSourceIds ? { scheduleSourceIds: safeResult.scheduleSourceIds } : {}),
        ...(safeResult.versions ? { versions: safeResult.versions } : {}),
        ...(safeResult.managerOverrideAllowed
          ? { managerOverrideAllowed: true } : {})
      };
    },
    { operation: "slot_generation", employeeId: barber.staffId, date: dateKey }
  );
}

function bookingAvailabilityResponseCacheKey(token, context) {
  if (!token || typeof BookingAvailabilityPhase5 === "undefined") return "";
  return `BA5RESP:${BookingAvailabilityPhase5.hash({
    token: String(token), audience: context.audience, date: context.date,
    serviceSetHash: context.serviceSetHash
  })}`;
}

function bookingAvailabilityCacheResponseSnapshot(token, context, barbers) {
  const key = bookingAvailabilityResponseCacheKey(token, context);
  if (!key) return;
  try {
    CacheService.getScriptCache().put(key, JSON.stringify({ barbers }), 120);
  } catch (ignore) {}
}

function bookingAvailabilityReadResponseSnapshot(token, context) {
  const key = bookingAvailabilityResponseCacheKey(token, context);
  if (!key) return null;
  try {
    const parsed = JSON.parse(CacheService.getScriptCache().get(key) || "null");
    return parsed && Array.isArray(parsed.barbers) ? parsed : null;
  } catch (ignore) {
    return null;
  }
}

function getPublicBookingOptions(data) {
  try {
    if (!bookingServiceIdsInputIsValid(data)) {
      return bookingApiError("INVALID_SERVICES", "serviceIds must be an array.");
    }
    const services = publicBookingServices();
    const selectedServices = getSelectedPublicBookingServices(data, services);
    const dateKey = getDateKey(data.date || "", TIME_ZONE) || Utilities.formatDate(new Date(), TIME_ZONE, "yyyy-MM-dd");
    const requestedServiceIds = getPublicBookingServiceIds(data);
    if (bookingServiceIdsHaveDuplicates(requestedServiceIds)) {
      return jsonOutput({ status: "error", code: "INVALID_SERVICES", message: "Duplicate service IDs are not allowed." });
    }
    const hasDurationOverride = !requestedServiceIds.length && data.durationMinutes !== undefined && data.durationMinutes !== "";
    if (hasDurationOverride && !isValidBookingDuration(Number(data.durationMinutes))) {
      return jsonOutput({ status: "error", code: "INVALID_APPOINTMENT", message: "The requested booking duration is invalid." });
    }
    const durationOverride = hasDurationOverride ? Number(data.durationMinutes) : 0;
    const durationMinutes = Math.max(15, durationOverride || selectedServices.reduce((total, service) => total + service.durationMinutes, 0) || 30);
    const preparationMinutes = selectedServices.reduce((total, service) =>
      total + Math.max(0, Number(service.preparationMinutes) || 0), 0);
    const cleanupMinutes = selectedServices.reduce((total, service) =>
      total + Math.max(0, Number(service.cleanupMinutes) || 0), 0);
    if (!isValidBookingDuration(durationMinutes)) {
      return jsonOutput({ status: "error", code: "INVALID_APPOINTMENT", message: "The requested booking duration is invalid." });
    }
    const bookings = getAllBookingsV2();
    const ratings = getAllBookingRatings();
    const availabilitySnapshot = typeof bookingAvailabilityPhase5RequestSnapshot === "function"
      && bookingAvailabilityEngineMode() === "PHASE5"
      ? bookingAvailabilityPhase5RequestSnapshot() : null;
    const selectedBranchId = String(data.branchId || "").trim();
    if (availabilitySnapshot) {
      bookingAvailabilityPhase5Branch(
        selectedBranchId, { publicAudience: true }, availabilitySnapshot.branches);
    }
    const activeBarbers = publicBookingBarbers().filter((barber) =>
      !availabilitySnapshot || barber.branchId === selectedBranchId);
    const barbers = activeBarbers.map((barber) => {
      const summary = calculatePublicBarberRatingSummary(barber.staffId, ratings, bookings);
      return {
        staffId: barber.staffId,
        name: barber.name,
        code: barber.code,
        averageRating: summary.averageRating,
        ratingsCount: summary.ratingsCount,
        ...availableSlotsForBarber(barber, dateKey, durationMinutes, bookings, activeBarbers, {
          ...data,
          audience: "public",
          branchId: selectedBranchId,
          availabilitySnapshot,
          preparationMinutes,
          cleanupMinutes,
          serviceSetHash: bookingServiceSetHash(selectedServices, requestedServiceIds)
        })
      };
    });
    const responseToken = typeof BookingAvailabilityPhase5 !== "undefined"
      ? BookingAvailabilityPhase5.hash(barbers.map((barber) => ({
        staffId: barber.staffId, token: barber.availabilityToken || "", slots: barber.slots || []
      })))
      : "";
    const responseContext = {
      audience: "public",
      date: dateKey,
      serviceSetHash: bookingServiceSetHash(selectedServices, requestedServiceIds)
    };
    if (data.ifNoneMatch && responseToken && data.ifNoneMatch === responseToken) {
      return jsonOutput({
        status: "success", unchanged: true, availabilityToken: responseToken,
        generatedAt: getCairoDateTime(), retryAfterSeconds: 30,
        liveRefreshEnabled: bookingAvailabilityLiveRefreshEnabled("public")
      });
    }
    if (data.ifNoneMatch && responseToken) {
      const previous = bookingAvailabilityReadResponseSnapshot(data.ifNoneMatch, responseContext);
      if (previous) {
        const currentByStaff = new Map(barbers.map((barber) => [String(barber.staffId), barber]));
        const previousByStaff = new Map(previous.barbers.map((barber) => [String(barber.staffId), barber]));
        const changedBarbers = barbers.filter((barber) =>
          JSON.stringify(barber) !== JSON.stringify(previousByStaff.get(String(barber.staffId)) || null));
        const removedStaffIds = previous.barbers
          .map((barber) => String(barber.staffId))
          .filter((staffId) => !currentByStaff.has(staffId));
        bookingAvailabilityCacheResponseSnapshot(responseToken, responseContext, barbers);
        return jsonOutput({
          status: "success", unchanged: false, delta: true, date: dateKey, services,
          selectedServiceIds: selectedServices.map((service) => service.serviceId),
          durationMinutes, preparationMinutes, cleanupMinutes,
          changedBarbers, removedStaffIds, availabilityToken: responseToken,
          generatedAt: getCairoDateTime(),
          retryAfterSeconds: 30,
          liveRefreshEnabled: bookingAvailabilityLiveRefreshEnabled("public")
        });
      }
    }
    bookingAvailabilityCacheResponseSnapshot(responseToken, responseContext, barbers);
    return jsonOutput({
      status: "success", date: dateKey, services,
      selectedServiceIds: selectedServices.map((service) => service.serviceId),
      durationMinutes, preparationMinutes, cleanupMinutes, barbers,
      availabilityToken: responseToken, generatedAt: getCairoDateTime(),
      retryAfterSeconds: 30,
      liveRefreshEnabled: bookingAvailabilityLiveRefreshEnabled("public")
    });
  } catch (error) {
    return bookingPublicErrorResponse(error, "AVAILABILITY_OPTIONS_FAILED");
  }
}

function normalizePublicPhone(value) {
  let digits = normalizeDigits(String(value || "")).replace(/\D/g, "");
  if (digits.indexOf("0020") === 0) digits = digits.slice(4);
  else if (digits.indexOf("20") === 0 && digits.length === 12) digits = digits.slice(2);
  if (digits.length === 10 && digits.charAt(0) === "1") digits = `0${digits}`;
  return digits;
}

function isValidEgyptianMobile(value) {
  return /^01(?:0|1|2|5)\d{8}$/.test(normalizePublicPhone(value));
}

function verifyBookingTrackingPhone(booking, phoneLast4) {
  const expected = normalizePublicPhone(booking.customerPhone).slice(-4);
  const supplied = normalizeDigits(String(phoneLast4 || "")).replace(/\D/g, "");
  return supplied.length === 4 && expected && supplied === expected;
}

function trackingVerificationError() {
  return jsonOutput({
    status: "error",
    code: "TRACKING_VERIFICATION_FAILED",
    message: "The tracking code or phone verification digits are incorrect."
  });
}

function generatePublicBookingTrackingToken(bookings) {
  const existingTokens = new Set((bookings || []).map((booking) => String(booking.trackingToken || "").trim().toUpperCase()));
  for (let attempt = 0; attempt < 50; attempt++) {
    const token = `CH-${String(Math.floor(Math.random() * 1000000)).padStart(6, "0")}`;
    if (!existingTokens.has(token)) return token;
  }
  throw new Error("Could not create a unique booking tracking code. Please try again.");
}

function publicBookingCreationResponse(booking) {
  return jsonOutput({
    status: "success",
    bookingId: booking.id,
    trackingToken: booking.trackingToken,
    trackingPath: `customer-booking.html?tracking=${booking.trackingToken}`,
    booking: publicBookingView(booking)
  });
}

function internalBookingCreationResponse(booking) {
  return jsonOutput({ status: "success", booking });
}

function createPublicBookingRequest(data) {
  try {
    if (!bookingServiceIdsInputIsValid(data)) {
      return bookingApiError("INVALID_SERVICES", "serviceIds must be an array.");
    }
    const customerName = normalizeProtectedText(data.customerName, 100);
    const customerPhone = normalizePublicPhone(data.customerPhone);
    const rawDate = normalizeDigits(String(data.date || "").trim());
    const rawTime = normalizeDigits(String(data.time || "").trim());
    const dateKey = getDateKey(rawDate, TIME_ZONE);
    const time = getBookingTimeValue(rawTime);
    const employeeId = String(data.employeeId || "").trim();
    const serviceIds = getPublicBookingServiceIds(data);
    const requestIdValidation = validateClientRequestId(data.clientRequestId);
    if (!requestIdValidation.ok) {
      return bookingApiError("INVALID_CLIENT_REQUEST_ID", "clientRequestId must be 8-128 safe identifier characters.");
    }
    const clientRequestId = requestIdValidation.value;
    if (bookingServiceIdsHaveDuplicates(serviceIds)) {
      return jsonOutput({ status: "error", code: "INVALID_SERVICES", message: "Duplicate service IDs are not allowed." });
    }
    const note = normalizeProtectedText(data.note, 500);
    if (customerName.length < 2 || !isValidEgyptianMobile(customerPhone) ||
        !isValidBookingDateKey(rawDate) || !isStrictBookingTime(rawTime) ||
        !dateKey || !time || !employeeId || !serviceIds.length) {
      return jsonOutput({ status: "error", message: "Please complete all required booking details." });
    }
    const fingerprint = bookingRequestFingerprint("public", {
      customerName, customerPhone, employeeId, date: rawDate, time: rawTime, serviceIds, note
    });
    return withBookingMutationLock({
      bookingRequestId: clientRequestId, employeeId, date: dateKey, time
    }, (diagnostic) => {
      const sheet = getBookingsSheetV2();
      const bookings = getAllBookingsV2ForWrite();
      const existing = findBookingByClientRequestId(bookings, clientRequestId);
      const retry = bookingIdempotencyResult(existing, fingerprint, publicBookingCreationResponse);
      if (retry) return retry;

    const publicServices = publicBookingServices();
    const selectedServices = publicServices.filter((item) => serviceIds.indexOf(item.serviceId) !== -1);
    if (selectedServices.length !== serviceIds.length || !selectedServices.length) {
      return jsonOutput({ status: "error", message: "The selected service is no longer available." });
    }
    if (!selectedServices.every((service) =>
      isValidBookingDuration(service.durationMinutes) && isValidBookingPrice(service.price))) {
      return jsonOutput({ status: "error", message: "The selected service configuration is invalid." });
    }
    const durationMinutes = selectedServices.reduce((total, service) => total + Number(service.durationMinutes), 0);
    const totalPrice = selectedServices.reduce((sum, service) => sum + Number(service.price), 0);
    const preparationMinutes = selectedServices.reduce((sum, service) =>
      sum + Math.max(0, Number(service.preparationMinutes) || 0), 0);
    const cleanupMinutes = selectedServices.reduce((sum, service) =>
      sum + Math.max(0, Number(service.cleanupMinutes) || 0), 0);
    diagnostic.durationMinutes = durationMinutes;
    if (!isValidBookingDuration(durationMinutes) || !isValidBookingPrice(totalPrice)) {
      return jsonOutput({ status: "error", message: "The selected service configuration is invalid." });
    }
    const serviceName = selectedServices.map((service) => service.name).join("، ");
    const serviceId = selectedServices.map((service) => service.serviceId).join(",");
    const barbers = publicBookingBarbers();
    const appointment = validateBookingAppointmentV2({
      employeeId, branchId: data.branchId, date: dateKey, time, durationMinutes, preparationMinutes,
      cleanupMinutes, serviceSetHash: bookingServiceSetHash(selectedServices, serviceIds),
      bookings, barbers, audience: "public", requestData: data
    });
    if (!appointment.ok) return jsonOutput({ status: "error", code: appointment.code, message: appointment.message });
    const barber = appointment.barber;

    const now = new Date();
    const nowText = getCairoDateTime();
    const id = generateUniqueBookingIdV2(bookings);
    const token = generatePublicBookingTrackingToken(bookings);
    const booking = {
      id, date: dateKey, time, customerName, customerPhone, employee: barber.name,
      service: serviceName, note, status: "pending", createdAt: nowText, updatedAt: nowText,
      serviceId, serviceIds, durationMinutes,
      totalPrice,
      source: "public", trackingToken: token,
      requestedAt: nowText, confirmedAt: "", confirmedBy: "", rejectionReason: "",
      proposedDate: "", proposedTime: "", holdExpiresAt: new Date(now.getTime() + (15 * 60 * 1000)).toISOString(),
      customerResponse: "pending", employeeId, cancelledAt: "", cancelledBy: "",
      cancellationReason: "", completedAt: "", completedBy: "", deleted: false, deletedAt: "", deletedBy: "",
      deletionReason: "", clientRequestId, clientRequestFingerprint: fingerprint,
      branchId: appointment.branchId || barber.branchId || "",
      availabilityToken: appointment.availabilityToken || "",
      scheduleVersion: Number(appointment.versions && appointment.versions.scheduleVersion) || 0,
      attendanceOperationalVersion:
        Number(appointment.versions && appointment.versions.attendanceOperationalVersion) || 0,
      operationalOverrideId: appointment.operationalOverrideId || "",
      validatedAt: nowText,
      validationSourceVersion: typeof BookingAvailabilityPhase5 !== "undefined"
        ? BookingAvailabilityPhase5.VERSION : "LEGACY"
    };
    applyBookingOccupancySnapshot(
      booking, preparationMinutes, cleanupMinutes,
      bookingServiceSetHash(selectedServices, serviceIds));
    let appended = null;
    commitBookingPhase5UnderCurrentLock({
      data, requestId: clientRequestId, action: "PUBLIC_BOOKING_CREATED",
      booking, beforeState: {},
      business: () => {
        appended = appendBookingRowV2(sheet, booking);
        SpreadsheetApp.flush();
      },
      compensate: () => {
        booking.deleted = true;
        booking.deletedAt = getCairoDateTime();
        booking.deletedBy = "transaction-compensation";
        booking.deletionReason = "COMPENSATED_UNCOMMITTED_BOOKING";
        writeBookingRowV2(sheet, appended.rowNumber, booking, appended.row);
        SpreadsheetApp.flush();
      }
    });
    logActivity({}, "create", "booking", id, `Created public booking | Employee: ${barber.name}`);
    return publicBookingCreationResponse(booking);
    });
  } catch (error) {
    return bookingPublicErrorResponse(error, "BOOKING_CREATE_FAILED");
  }
}

function findBookingByTrackingToken(token, options) {
  const cleanToken = String(token || "").trim().toUpperCase();
  if (!cleanToken) return null;
  const sheet = options && options.forWrite
    ? getBookingsSheetV2() : getBookingsSheetV2ReadOnly();
  if (sheet.getLastRow() < 2) return null;
  const headers = getBookingHeadersV2(sheet);
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  for (let index = 0; index < rows.length; index++) {
    const booking = bookingFromRowV2(rows[index], index + 2, headers);
    if (!booking.deleted && String(booking.trackingToken || "").trim().toUpperCase() === cleanToken) {
      return { sheet, rowNumber: index + 2, booking, row: rows[index], headers };
    }
  }
  return null;
}

function publicBookingView(booking) {
  return {
    bookingId: booking.id,
    date: booking.date,
    time: booking.time,
    employee: booking.employee,
    service: booking.service,
    durationMinutes: booking.durationMinutes,
    status: bookingEffectiveStatusV2(booking),
    proposedDate: booking.proposedDate,
    proposedTime: booking.proposedTime,
    rejectionReason: booking.rejectionReason,
    customerResponse: booking.customerResponse,
    updatedAt: booking.updatedAt
  };
}

function getPublicBookingStatus(data) {
  try {
    const found = findBookingByTrackingToken(data.trackingToken);
    if (!found) return jsonOutput({ status: "error", message: "Booking request not found." });
    if (!verifyBookingTrackingPhone(found.booking, data.phoneLast4)) return trackingVerificationError();
    return jsonOutput({ status: "success", booking: publicBookingView(found.booking) });
  } catch (error) {
    return bookingPublicErrorResponse(error, "BOOKING_STATUS_FAILED");
  }
}

function respondToBookingProposal(data) {
  try {
    return withBookingMutationLock({
      bookingRequestId: String(data.trackingToken || "").trim()
    }, () => {
    const committedRetry = committedBookingMutationRetry(data);
    if (committedRetry) {
      return jsonOutput({ status: "success", booking: publicBookingView(committedRetry) });
    }
    const found = findBookingByTrackingToken(data.trackingToken, { forWrite: true });
    if (!found || found.booking.status !== "proposed") return jsonOutput({ status: "error", message: "There is no active appointment proposal." });
    if (!verifyBookingTrackingPhone(found.booking, data.phoneLast4)) return trackingVerificationError();
    const response = String(data.response || "").trim().toLowerCase();
    if (["accept", "reject"].indexOf(response) === -1) {
      return jsonOutput({ status: "error", code: "INVALID_RESPONSE", message: "The proposal response must be accept or reject." });
    }
    const accepted = response === "accept";
    const booking = found.booking;
    const beforeBooking = JSON.parse(JSON.stringify(booking));
    const responseStatus = accepted ? "confirmed" : "rejected";
    if (!isBookingStatusTransitionAllowed(booking.status, responseStatus)) {
      return jsonOutput({ status: "error", code: "INVALID_STATUS_TRANSITION", message: "The booking proposal can no longer be changed." });
    }
    booking.updatedAt = getCairoDateTime();
    if (!accepted) {
      booking.status = "rejected";
      booking.customerResponse = "declined";
      booking.rejectionReason = "Customer declined the proposed appointment.";
    } else {
      const trustedServices = resolveTrustedBookingServiceTotals(booking, publicBookingServices());
      if (!trustedServices.ok) {
        return jsonOutput({ status: "error", code: trustedServices.code, message: trustedServices.message });
      }
      const bookings = getAllBookingsV2ForWrite();
      const appointment = validateBookingAppointmentV2({
        employeeId: booking.employeeId, employeeName: booking.employee,
        branchId: booking.branchId,
        date: booking.proposedDate, time: booking.proposedTime,
        durationMinutes: trustedServices.durationMinutes,
        preparationMinutes: trustedServices.preparationMinutes,
        cleanupMinutes: trustedServices.cleanupMinutes,
        serviceSetHash: trustedServices.serviceSetHash,
        excludeId: booking.id, bookings, barbers: publicBookingBarbers(),
        audience: "public", requestData: data
      });
      if (!appointment.ok) return jsonOutput({ status: "error", code: appointment.code, message: appointment.message });
      booking.date = booking.proposedDate;
      booking.time = booking.proposedTime;
      booking.employeeId = appointment.barber.staffId;
      booking.employee = appointment.barber.name;
      booking.durationMinutes = trustedServices.durationMinutes;
      booking.totalPrice = trustedServices.totalPrice;
      booking.branchId = appointment.branchId || booking.branchId;
      booking.availabilityToken = appointment.availabilityToken || booking.availabilityToken;
      booking.scheduleVersion = Number(appointment.versions && appointment.versions.scheduleVersion) ||
        booking.scheduleVersion;
      booking.attendanceOperationalVersion =
        Number(appointment.versions && appointment.versions.attendanceOperationalVersion) ||
        booking.attendanceOperationalVersion;
      booking.validatedAt = booking.updatedAt;
      booking.validationSourceVersion = typeof BookingAvailabilityPhase5 !== "undefined"
        ? BookingAvailabilityPhase5.VERSION : "LEGACY";
      applyBookingOccupancySnapshot(
        booking, trustedServices.preparationMinutes, trustedServices.cleanupMinutes,
        trustedServices.serviceSetHash);
      booking.status = "confirmed";
      booking.customerResponse = "accepted";
      booking.confirmedAt = booking.updatedAt;
      booking.confirmedBy = "customer";
    }
    commitBookingPhase5UnderCurrentLock({
      data,
      requestId: data.clientRequestId ||
        `PROPOSAL-${String(data.trackingToken || "").replace(/[^A-Za-z0-9]/g, "")}-${response}`,
      action: accepted ? "BOOKING_PROPOSAL_ACCEPTED" : "BOOKING_PROPOSAL_REJECTED",
      booking, beforeState: beforeBooking,
      business: () => {
        writeBookingRowV2(found.sheet, found.rowNumber, booking, found.row);
        SpreadsheetApp.flush();
      },
      compensate: () => {
        writeBookingRowV2(found.sheet, found.rowNumber, beforeBooking, found.row);
        SpreadsheetApp.flush();
      }
    });
    logActivity({}, accepted ? "confirm" : "reject", "booking", booking.id, `Public proposal response | Previous: proposed | Next: ${booking.status} | Employee: ${booking.employee}`);
    return jsonOutput({ status: "success", booking: publicBookingView(booking) });
    });
  } catch (error) {
    return bookingPublicErrorResponse(error, "BOOKING_PROPOSAL_RESPONSE_FAILED");
  }
}

function createBookingV2(data) {
  try {
    const permissionError = requirePermission(data, "create_bookings", "You do not have permission to create bookings.");
    if (permissionError) return permissionError;
    if (!bookingServiceIdsInputIsValid(data)) {
      return bookingApiError("INVALID_SERVICES", "serviceIds must be an array.");
    }
    const requestIdValidation = validateClientRequestId(data.clientRequestId);
    if (!requestIdValidation.ok) {
      return bookingApiError("INVALID_CLIENT_REQUEST_ID", "clientRequestId must be 8-128 safe identifier characters.");
    }
    const clientRequestId = requestIdValidation.value;
    const requestedServiceIds = getPublicBookingServiceIds(data);
    const rawDate = normalizeDigits(String(data.date || data.bookingDate || "").trim());
    const rawTime = normalizeDigits(String(data.time || data.bookingTime || "").trim());
    const fingerprint = bookingRequestFingerprint("internal", {
      customerName: data.customerName || data.customer,
      customerPhone: data.customerPhone || data.phone,
      employeeId: data.employeeId,
      date: rawDate,
      time: rawTime,
      serviceIds: requestedServiceIds,
      manualService: data.service || data.services,
      manualDuration: data.durationMinutes,
      note: data.note
    });
    return withBookingMutationLock({
      bookingRequestId: clientRequestId,
      employeeId: data.employeeId,
      date: rawDate,
      time: rawTime,
      durationMinutes: data.durationMinutes
    }, (diagnostic) => {
    const sheet = getBookingsSheetV2();
    const now = getCairoDateTime();
    const bookings = getAllBookingsV2ForWrite();
    const existing = findBookingByClientRequestId(bookings, clientRequestId);
    const retry = bookingIdempotencyResult(existing, fingerprint, internalBookingCreationResponse);
    if (retry) return retry;
    if (bookingServiceIdsHaveDuplicates(requestedServiceIds)) {
      return jsonOutput({ status: "error", code: "INVALID_SERVICES", message: "Duplicate service IDs are not allowed." });
    }
    const knownServices = publicBookingServices();
    const selectedServices = knownServices.filter((service) => requestedServiceIds.indexOf(service.serviceId) !== -1);
    const otherService = requestedServiceIds.length === 0;
    const manualServiceName = normalizeProtectedText(data.service || data.services, 100);
    const manualDuration = Number(data.durationMinutes);
    if (otherService && (!manualServiceName || !isValidBookingDuration(manualDuration))) {
      return jsonOutput({ status: "error", message: "Other Service requires a service name and duration." });
    }
    if (!otherService && selectedServices.length !== requestedServiceIds.length) {
      return jsonOutput({ status: "error", message: "One or more selected services are unavailable." });
    }
    if (!otherService && !selectedServices.every((service) =>
      isValidBookingDuration(service.durationMinutes) && isValidBookingPrice(service.price))) {
      return jsonOutput({ status: "error", message: "The selected service configuration is invalid." });
    }
    const durationMinutes = otherService
      ? manualDuration
      : selectedServices.reduce((sum, service) => sum + Number(service.durationMinutes), 0);
    const totalPrice = otherService ? 0 : selectedServices.reduce((sum, service) => sum + Number(service.price), 0);
    const preparationMinutes = otherService ? 0 : selectedServices.reduce((sum, service) =>
      sum + Math.max(0, Number(service.preparationMinutes) || 0), 0);
    const cleanupMinutes = otherService ? 0 : selectedServices.reduce((sum, service) =>
      sum + Math.max(0, Number(service.cleanupMinutes) || 0), 0);
    diagnostic.durationMinutes = durationMinutes;
    if (!isValidBookingDuration(durationMinutes) || !isValidBookingPrice(totalPrice)) {
      return jsonOutput({ status: "error", message: "The selected service configuration is invalid." });
    }
    const barbers = publicBookingBarbers();
    if (!isValidBookingDateKey(rawDate) || !isStrictBookingTime(rawTime)) {
      return jsonOutput({ status: "error", code: "INVALID_APPOINTMENT", message: "The appointment date or time is invalid." });
    }
    const appointment = validateBookingAppointmentV2({
      employeeId: String(data.employeeId || "").trim(),
      branchId: data.branchId || ((barbers.find((item) =>
        item.staffId === String(data.employeeId || "").trim()) || {}).branchId),
      date: getDateKey(rawDate, TIME_ZONE),
      time: getBookingTimeValue(rawTime),
      durationMinutes, preparationMinutes, cleanupMinutes,
      serviceSetHash: bookingServiceSetHash(selectedServices, requestedServiceIds),
      bookings, barbers, audience: "internal", requestData: data
    });
    if (!appointment.ok) return jsonOutput({ status: "error", code: appointment.code, message: appointment.message });
    const barber = appointment.barber;
    const booking = {
      id: generateUniqueBookingIdV2(bookings),
      date: appointment.date,
      time: appointment.time,
      customerName: normalizeProtectedText(data.customerName || data.customer, 100),
      customerPhone: normalizePublicPhone(data.customerPhone || data.phone),
      employee: barber.name,
      service: otherService ? manualServiceName : selectedServices.map((service) => service.name).join(", "),
      note: normalizeProtectedText(data.note, 500), status: "pending",
      createdAt: now, updatedAt: now, serviceId: otherService ? "" : requestedServiceIds.join(","),
      serviceIds: otherService ? [] : requestedServiceIds,
      durationMinutes, totalPrice, source: "staff",
      trackingToken: "", requestedAt: now, confirmedAt: "", confirmedBy: "",
      rejectionReason: "", proposedDate: "", proposedTime: "", holdExpiresAt: "", customerResponse: "",
      employeeId: barber.staffId, cancelledAt: "", cancelledBy: "", cancellationReason: "",
      completedAt: "", completedBy: "", deleted: false, deletedAt: "", deletedBy: "",
      deletionReason: "", clientRequestId, clientRequestFingerprint: fingerprint,
      branchId: appointment.branchId || barber.branchId || "",
      availabilityToken: appointment.availabilityToken || "",
      scheduleVersion: Number(appointment.versions && appointment.versions.scheduleVersion) || 0,
      attendanceOperationalVersion:
        Number(appointment.versions && appointment.versions.attendanceOperationalVersion) || 0,
      operationalOverrideId: appointment.operationalOverrideId || "",
      validatedAt: now,
      validationSourceVersion: typeof BookingAvailabilityPhase5 !== "undefined"
        ? BookingAvailabilityPhase5.VERSION : "LEGACY"
    };
    applyBookingOccupancySnapshot(
      booking, preparationMinutes, cleanupMinutes,
      bookingServiceSetHash(selectedServices, requestedServiceIds));
    if (!booking.date || !booking.time || !booking.customerName || !isValidEgyptianMobile(booking.customerPhone) || !booking.employee || !booking.service) {
      return jsonOutput({ status: "error", message: "Missing required booking fields." });
    }
    let appended = null;
    commitBookingPhase5UnderCurrentLock({
      data, requestId: clientRequestId, action: "INTERNAL_BOOKING_CREATED",
      booking, beforeState: {},
      business: () => {
        appended = appendBookingRowV2(sheet, booking);
        SpreadsheetApp.flush();
      },
      compensate: () => {
        booking.deleted = true;
        booking.deletedAt = getCairoDateTime();
        booking.deletedBy = "transaction-compensation";
        booking.deletionReason = "COMPENSATED_UNCOMMITTED_BOOKING";
        writeBookingRowV2(sheet, appended.rowNumber, booking, appended.row);
        SpreadsheetApp.flush();
      }
    });
    logActivity(data, "create", "booking", booking.id, `Created booking | Employee: ${booking.employee}`);
    return internalBookingCreationResponse(
      bookingFromRowV2(appended.row, appended.rowNumber, getBookingHeadersV2(sheet))
    );
    });
  } catch (error) {
    return bookingErrorResponse(error, "BOOKING_CREATE_FAILED");
  }
}

function getBookingsV2(data) {
  try {
    const permissionError = requirePermission(data, "view_bookings", "You do not have permission to view bookings.");
    if (permissionError) return permissionError;
    const filters = data.filters || {};
    const targetDate = getDateKey(filters.date || data.date || "", TIME_ZONE);
    const targetStatus = String(filters.status || data.status || "").trim().toLowerCase();
    const search = String(filters.search || data.search || "").trim().toLowerCase();
    const includeDeleted = parseSheetBoolean(filters.includeDeleted || data.includeDeleted, false) &&
      (actorHasPermission(data, "manage_bookings") || actorHasPermission(data, "delete_bookings"));
    const bookings = getAllBookingsV2().map((booking) => ({
      ...booking, status: bookingEffectiveStatusV2(booking)
    })).filter((booking) => includeDeleted || !booking.deleted)
      .filter((booking) => !targetDate || booking.date === targetDate)
      .filter((booking) => !targetStatus || booking.status === targetStatus)
      .filter((booking) => !search || `${booking.customerName} ${booking.customerPhone} ${booking.employee} ${booking.service} ${booking.note} ${booking.trackingToken}`.toLowerCase().indexOf(search) !== -1)
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    return jsonOutput({ status: "success", bookings });
  } catch (error) {
    return bookingErrorResponse(error, "BOOKING_LIST_FAILED");
  }
}

function updateBookingV2(data) {
  try {
    const permissionError = requirePermission(data, "manage_bookings", "You do not have permission to edit bookings.");
    if (permissionError) return permissionError;
    return withBookingMutationLock({
      bookingRequestId: String(data.id || data.bookingId || "").trim(),
      employeeId: data.employeeId,
      date: data.date || data.bookingDate || data.proposedDate,
      time: data.time || data.bookingTime || data.proposedTime,
      durationMinutes: data.durationMinutes
    }, () => {
    const committedRetry = committedBookingMutationRetry(data);
    if (committedRetry) return jsonOutput({ status: "success", booking: committedRetry });
    const sheet = getBookingsSheetV2();
    const found = findBookingRowV2(sheet, data);
    if (!found) return jsonOutput({ status: "error", message: "Booking not found" });
    const booking = found.booking;
    const beforeBooking = JSON.parse(JSON.stringify(booking));
    if (booking.deleted) {
      return jsonOutput({ status: "error", code: "BOOKING_DELETED", message: "Deleted bookings cannot be updated." });
    }
    if (bookingStatusIsTerminal(bookingEffectiveStatusV2(booking))) {
      return jsonOutput({ status: "error", code: "BOOKING_IMMUTABLE", message: "Terminal bookings cannot be updated." });
    }
    const requestedStatus = String(data.status || "").trim();
    if (requestedStatus && !isRecognizedBookingStatusV2(requestedStatus)) {
      return jsonOutput({ status: "error", code: "INVALID_STATUS", message: "The requested booking status is invalid." });
    }
    const nextStatus = requestedStatus ? normalizeBookingStatusV2(requestedStatus) : booking.status;
    const statusChanged = nextStatus !== booking.status;
    const hasDateInput = data.date !== undefined || data.bookingDate !== undefined;
    const hasTimeInput = data.time !== undefined || data.bookingTime !== undefined;
    const hasProposedDateInput = data.proposedDate !== undefined;
    const hasProposedTimeInput = data.proposedTime !== undefined;
    const hasRejectionReasonInput = data.rejectionReason !== undefined;
    if (hasRejectionReasonInput && !(statusChanged && nextStatus === "rejected")) {
      return jsonOutput({
        status: "error",
        code: "INVALID_LIFECYCLE_METADATA",
        message: "A rejection reason can only be supplied while rejecting a booking."
      });
    }
    if ((hasDateInput && !isValidBookingDateKey(data.date !== undefined ? data.date : data.bookingDate)) ||
        (hasTimeInput && !isStrictBookingTime(data.time !== undefined ? data.time : data.bookingTime)) ||
        (hasProposedDateInput && !isValidBookingDateKey(data.proposedDate)) ||
        (hasProposedTimeInput && !isStrictBookingTime(data.proposedTime))) {
      return jsonOutput({ status: "error", code: "INVALID_APPOINTMENT", message: "The appointment date or time is invalid." });
    }
    if (statusChanged && (hasDateInput || hasTimeInput) && nextStatus !== "confirmed") {
      return jsonOutput({ status: "error", code: "INVALID_UPDATE", message: "Appointment edits must be submitted separately from this status change." });
    }
    if ((hasProposedDateInput || hasProposedTimeInput) && nextStatus !== "proposed") {
      return jsonOutput({ status: "error", code: "INVALID_UPDATE", message: "Proposal times can only be set while proposing an appointment." });
    }
    if ((hasDateInput || hasTimeInput) && nextStatus === "proposed") {
      return jsonOutput({ status: "error", code: "INVALID_UPDATE", message: "Original appointment edits and proposal edits must be submitted separately." });
    }
    let nextDate = getDateKey(data.date || data.bookingDate || booking.date, TIME_ZONE);
    let nextTime = getBookingTimeValue(data.time || data.bookingTime || booking.time);
    const proposedDate = getDateKey(data.proposedDate || booking.proposedDate, TIME_ZONE);
    const proposedTime = getBookingTimeValue(data.proposedTime || booking.proposedTime);
    if (statusChanged && !isBookingStatusTransitionAllowed(booking.status, nextStatus)) {
      return jsonOutput({
        status: "error",
        code: "INVALID_STATUS_TRANSITION",
        message: `Booking status cannot change from ${booking.status} to ${nextStatus}.`
      });
    }
    const rejectionReason = statusChanged && nextStatus === "rejected"
      ? normalizeProtectedText(data.rejectionReason, 500)
      : booking.rejectionReason;
    if (statusChanged && nextStatus === "rejected" && booking.source === "public" && !rejectionReason) {
      return jsonOutput({ status: "error", message: "A rejection reason is required for public bookings." });
    }
    if (statusChanged && booking.status === "proposed" && nextStatus === "confirmed" && proposedDate && proposedTime) {
      nextDate = proposedDate;
      nextTime = proposedTime;
    }
    const timeChanged = nextDate !== booking.date || nextTime !== booking.time;
    const proposalChanged = proposedDate !== booking.proposedDate || proposedTime !== booking.proposedTime;
    const needsAppointmentValidation =
      (statusChanged && (nextStatus === "confirmed" || nextStatus === "proposed")) ||
      (!statusChanged && (timeChanged || (nextStatus === "proposed" && proposalChanged)));
    let appointment = null;
    let trustedServices = null;
    if (needsAppointmentValidation) {
      trustedServices = resolveTrustedBookingServiceTotals(booking, publicBookingServices());
      if (!trustedServices.ok) {
        return jsonOutput({ status: "error", code: trustedServices.code, message: trustedServices.message });
      }
      const appointmentDate = nextStatus === "proposed" ? proposedDate : nextDate;
      const appointmentTime = nextStatus === "proposed" ? proposedTime : nextTime;
      appointment = validateBookingAppointmentV2({
        employeeId: booking.employeeId, employeeName: booking.employee,
        branchId: booking.branchId,
        date: appointmentDate, time: appointmentTime, durationMinutes: trustedServices.durationMinutes,
        preparationMinutes: trustedServices.preparationMinutes,
        cleanupMinutes: trustedServices.cleanupMinutes,
        serviceSetHash: trustedServices.serviceSetHash,
        excludeId: booking.id, bookings: getAllBookingsV2ForWrite(), barbers: publicBookingBarbers(),
        audience: "internal", requestData: data
      });
      if (!appointment.ok) return jsonOutput({ status: "error", code: appointment.code, message: appointment.message });
    }
    const nextNote = data.note !== undefined ? normalizeProtectedText(data.note, 500) : booking.note;
    if (!statusChanged && !timeChanged && !proposalChanged && nextNote === booking.note) {
      return jsonOutput({ status: "success", booking, unchanged: true });
    }
    booking.date = nextDate;
    booking.time = nextTime;
    booking.status = nextStatus;
    booking.note = nextNote;
    booking.updatedAt = getCairoDateTime();
    booking.rejectionReason = rejectionReason;
    booking.proposedDate = proposedDate;
    booking.proposedTime = proposedTime;
    if (appointment && appointment.barber) {
      booking.employeeId = appointment.barber.staffId;
      booking.employee = appointment.barber.name;
      booking.durationMinutes = trustedServices.durationMinutes;
      booking.totalPrice = trustedServices.totalPrice;
      booking.branchId = appointment.branchId || booking.branchId;
      booking.availabilityToken = appointment.availabilityToken || booking.availabilityToken;
      booking.scheduleVersion = Number(appointment.versions && appointment.versions.scheduleVersion) ||
        booking.scheduleVersion;
      booking.attendanceOperationalVersion =
        Number(appointment.versions && appointment.versions.attendanceOperationalVersion) ||
        booking.attendanceOperationalVersion;
      booking.validatedAt = booking.updatedAt;
      booking.validationSourceVersion = typeof BookingAvailabilityPhase5 !== "undefined"
        ? BookingAvailabilityPhase5.VERSION : "LEGACY";
      applyBookingOccupancySnapshot(
        booking, trustedServices.preparationMinutes, trustedServices.cleanupMinutes,
        trustedServices.serviceSetHash, nextStatus === "proposed" ? proposedTime : booking.time);
    }
    const actor = getActor(data);
    if (statusChanged && nextStatus === "confirmed") {
      booking.confirmedAt = booking.updatedAt;
      booking.confirmedBy = actor.displayName;
      booking.customerResponse = booking.customerResponse || "confirmed_by_staff";
    }
    if (statusChanged && nextStatus === "rejected") booking.customerResponse = "rejected_by_staff";
    if (statusChanged && nextStatus === "cancelled") {
      booking.cancellationReason = normalizeProtectedText(data.cancellationReason, 500);
      booking.cancelledAt = booking.updatedAt;
      booking.cancelledBy = actor.displayName;
    }
    if (statusChanged && nextStatus === "done") {
      booking.completedAt = booking.updatedAt;
      booking.completedBy = actor.displayName;
    }
    const action = statusChanged
      ? (({ confirmed: "confirm", proposed: "propose", rejected: "reject", cancelled: "cancel", done: "complete" })[nextStatus] || "update")
      : "update";
    commitBookingPhase5UnderCurrentLock({
      data,
      requestId: data.clientRequestId,
      action: `BOOKING_${action.toUpperCase()}`,
      booking, beforeState: beforeBooking,
      business: () => {
        writeBookingRowV2(sheet, found.rowNumber, booking, found.row);
        SpreadsheetApp.flush();
      },
      compensate: () => {
        writeBookingRowV2(sheet, found.rowNumber, beforeBooking, found.row);
        SpreadsheetApp.flush();
      }
    });
    logActivity(data, action, "booking", booking.id, `Booking status | Previous: ${found.booking.status} | Next: ${nextStatus} | Employee: ${booking.employee} | Customer: ${booking.customerName}`);
    return jsonOutput({ status: "success", booking });
    });
  } catch (error) {
    return bookingErrorResponse(error, "BOOKING_UPDATE_FAILED");
  }
}

const BOOKING_RATING_HEADERS = [
  "RATING_ID", "BOOKING_ID", "TRACKING_TOKEN", "EMPLOYEE_ID", "EMPLOYEE_NAME",
  "RATING", "COMMENT", "SERVICE", "BOOKING_DATE", "CREATED_AT", "STATUS",
  "CUSTOMER_PHONE_HASH", "UPDATED_AT"
];

function getBookingRatingsSheet() {
  const spreadsheet = SpreadsheetApp.getActive();
  let sheet = spreadsheet.getSheetByName("BOOKING_RATINGS");
  if (!sheet) sheet = spreadsheet.insertSheet("BOOKING_RATINGS");
  const width = Math.max(1, sheet.getLastColumn());
  const headers = sheet.getRange(1, 1, 1, width).getValues()[0];
  const existing = {};
  headers.forEach((header) => { if (header) existing[normalizeBookingHeader(header)] = true; });
  const missing = BOOKING_RATING_HEADERS.filter((header) => !existing[normalizeBookingHeader(header)]);
  if (missing.length) {
    const start = headers.some((header) => String(header || "").trim()) ? width + 1 : 1;
    const needed = start + missing.length - 1;
    if (sheet.getMaxColumns() < needed) sheet.insertColumnsAfter(sheet.getMaxColumns(), needed - sheet.getMaxColumns());
    sheet.getRange(1, start, 1, missing.length).setValues([missing]);
  }
  return sheet;
}

function getBookingRatingsSheetReadOnly(optional) {
  const sheet = SpreadsheetApp.getActive().getSheetByName("BOOKING_RATINGS");
  if (!sheet) {
    if (optional) return null;
    throw schemaContractError(
      "BOOKING_RATINGS_SCHEMA_NOT_READY", "Sheet BOOKING_RATINGS not found.",
      { sheetName: "BOOKING_RATINGS" });
  }
  inspectNamedSheetSchema(sheet, {
    sheetName: "BOOKING_RATINGS",
    label: "BOOKING_RATINGS",
    expectedHeaders: BOOKING_RATING_HEADERS,
    canonicalize: normalizeBookingHeader,
    notReadyCode: "BOOKING_RATINGS_SCHEMA_NOT_READY",
    duplicateCode: "BOOKING_RATINGS_SCHEMA_DUPLICATE_HEADERS"
  });
  return sheet;
}

function initializeBookingStagingEnvironment() {
  assertStagingEnvironment();
  const sheets = [
    getBookingsSheetV2(),
    getBookingRatingsSheet(),
    getBarberScheduleSheet()
  ];
  return {
    environment: "staging",
    spreadsheetId: getCutHubEnvironmentConfig().spreadsheetId,
    sheets: sheets.map((sheet) => ({
      name: sheet.getName(),
      headerCount: Math.max(0, sheet.getLastColumn())
    }))
  };
}

function getRatingHeaders(sheet) {
  return sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0]
    .map((header) => String(header || "").trim());
}

function ratingFromRow(row, headers, rowNumber) {
  const value = (name) => bookingRowValueV2(row, headers, name);
  return {
    rowNumber,
    ratingId: String(value("RATING_ID") || "").trim(),
    bookingId: String(value("BOOKING_ID") || "").trim(),
    trackingToken: String(value("TRACKING_TOKEN") || "").trim(),
    employeeId: String(value("EMPLOYEE_ID") || "").trim(),
    employeeName: normalizeProtectedText(value("EMPLOYEE_NAME"), 100),
    rating: Number(value("RATING")) || 0,
    comment: normalizeProtectedText(value("COMMENT"), 500),
    service: normalizeProtectedText(value("SERVICE"), 500),
    bookingDate: getDateKey(value("BOOKING_DATE"), TIME_ZONE) || String(value("BOOKING_DATE") || "").trim(),
    createdAt: getDisplayDateTime(value("CREATED_AT")),
    status: String(value("STATUS") || "published").trim().toLowerCase(),
    customerPhoneHash: String(value("CUSTOMER_PHONE_HASH") || "").trim(),
    updatedAt: getDisplayDateTime(value("UPDATED_AT"))
  };
}

function ratingToRow(rating, headers, existingRow) {
  const row = existingRow ? existingRow.slice() : new Array(headers.length).fill("");
  const values = {
    RATING_ID: rating.ratingId, BOOKING_ID: rating.bookingId, TRACKING_TOKEN: rating.trackingToken,
    EMPLOYEE_ID: rating.employeeId,
    EMPLOYEE_NAME: normalizeProtectedText(rating.employeeName, 100),
    RATING: rating.rating,
    COMMENT: normalizeProtectedText(rating.comment, 500),
    SERVICE: normalizeProtectedText(rating.service, 500),
    BOOKING_DATE: rating.bookingDate,
    CREATED_AT: rating.createdAt, STATUS: rating.status, CUSTOMER_PHONE_HASH: rating.customerPhoneHash,
    UPDATED_AT: rating.updatedAt
  };
  Object.keys(values).forEach((name) => setBookingRowValueV2(row, headers, name, values[name]));
  return row;
}

function writeBookingRatingRow(sheet, rowNumber, rating, existingRow) {
  const headers = getRatingHeaders(sheet);
  const row = ratingToRow(rating, headers, existingRow);
  writeSheetRowWithExplicitValues(sheet, rowNumber, row);
  return row;
}

function appendBookingRatingRow(sheet, rating) {
  const rowNumber = sheet.getLastRow() + 1;
  return { rowNumber, row: writeBookingRatingRow(sheet, rowNumber, rating) };
}

function getAllBookingRatings() {
  const sheet = getBookingRatingsSheetReadOnly(true);
  if (!sheet) return [];
  if (sheet.getLastRow() < 2) return [];
  const headers = getRatingHeaders(sheet);
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues()
    .map((row, index) => ratingFromRow(row, headers, index + 2));
}

function getActiveBookingRatings(ratings, bookings) {
  const ratingRows = Array.isArray(ratings) ? ratings : getAllBookingRatings();
  const bookingRows = Array.isArray(bookings) ? bookings : getAllBookingsV2();
  const activeBookingIds = new Set(
    bookingRows.filter((booking) => !booking.deleted).map((booking) => String(booking.id || "").trim())
  );
  return ratingRows.filter((rating) => activeBookingIds.has(String(rating.bookingId || "").trim()));
}

function publicRatingView(rating) {
  return {
    ratingId: rating.ratingId,
    bookingId: rating.bookingId,
    employeeId: rating.employeeId,
    employeeName: rating.employeeName,
    rating: rating.rating,
    comment: rating.comment,
    service: rating.service,
    bookingDate: rating.bookingDate,
    createdAt: rating.createdAt,
    status: rating.status
  };
}

function bookingRatingStatusForComment(comment) {
  const text = normalizeProtectedText(comment, 500);
  const blocked = /(fuck|shit|كس\s*م|شرموط|زبال)/i.test(text);
  const repeated = /(.)\1{9,}/i.test(text);
  const suspiciousUrl = /(?:https?:\/\/|www\.|bit\.ly|t\.me\/)/i.test(text);
  return blocked || repeated || suspiciousUrl ? "flagged" : "published";
}

function getRatingSalt() {
  const properties = PropertiesService.getScriptProperties();
  let salt = properties.getProperty("BOOKING_RATING_PHONE_SALT");
  if (!salt) {
    salt = Utilities.getUuid() + Utilities.getUuid();
    properties.setProperty("BOOKING_RATING_PHONE_SALT", salt);
  }
  return salt;
}

function hashBookingPhone(phone) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    `${getRatingSalt()}:${normalizePublicPhone(phone)}`,
    Utilities.Charset.UTF_8
  );
  return digest.map((byte) => (`0${(byte < 0 ? byte + 256 : byte).toString(16)}`).slice(-2)).join("");
}

function submitBookingRating(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const found = findBookingByTrackingToken(data.trackingToken, { forWrite: true });
    if (!found || !verifyBookingTrackingPhone(found.booking, data.phoneLast4)) return trackingVerificationError();
    if (found.booking.status !== "done") {
      return jsonOutput({ status: "error", code: "BOOKING_NOT_COMPLETED", message: "Only completed bookings can be rated." });
    }
    const ratingValue = Number(data.rating);
    if (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return jsonOutput({ status: "error", code: "INVALID_RATING", message: "Rating must be an integer from 1 to 5." });
    }
    const rawComment = normalizeProtectedText(data.comment);
    if (rawComment.length > 500) return jsonOutput({ status: "error", code: "INVALID_RATING", message: "Comment cannot exceed 500 characters." });
    const comment = normalizeProtectedText(rawComment, 500);
    const sheet = getBookingRatingsSheet();
    const headers = getRatingHeaders(sheet);
    const ratings = getAllBookingRatings();
    if (ratings.some((item) => item.bookingId === found.booking.id)) {
      return jsonOutput({ status: "error", code: "RATING_ALREADY_SUBMITTED", message: "A rating was already submitted for this booking." });
    }
    const now = getCairoDateTime();
    const rating = {
      ratingId: `RATE-${Utilities.getUuid()}`, bookingId: found.booking.id,
      trackingToken: found.booking.trackingToken, employeeId: found.booking.employeeId,
      employeeName: found.booking.employee, rating: ratingValue, comment,
      service: found.booking.service, bookingDate: found.booking.date, createdAt: now,
      status: bookingRatingStatusForComment(comment), customerPhoneHash: hashBookingPhone(found.booking.customerPhone),
      updatedAt: now
    };
    appendBookingRatingRow(sheet, rating);
    SpreadsheetApp.flush();
    logActivity({}, "submit", "booking_rating", rating.ratingId, `Submitted rating | Booking: ${rating.bookingId} | Employee: ${rating.employeeName} | Rating ID: ${rating.ratingId}`);
    return jsonOutput({ status: "success", rating: publicRatingView(rating) });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

function getBookingRating(data) {
  try {
    const found = findBookingByTrackingToken(data.trackingToken);
    if (!found || !verifyBookingTrackingPhone(found.booking, data.phoneLast4)) return trackingVerificationError();
    const rating = getAllBookingRatings().find((item) => item.bookingId === found.booking.id);
    return jsonOutput({ status: "success", rating: rating ? publicRatingView(rating) : null });
  } catch (error) {
    return bookingPublicErrorResponse(error, "BOOKING_RATING_READ_FAILED");
  }
}

function calculateBarberRatingSummary(employeeId, ratings, bookings, includeHistorical) {
  const ratingRows = Array.isArray(ratings) ? ratings : getAllBookingRatings();
  const activeRatings = includeHistorical ? ratingRows : getActiveBookingRatings(ratingRows, bookings);
  const rows = activeRatings.filter((item) =>
    item.status === "published" && (!employeeId || item.employeeId === employeeId)
  );
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  rows.forEach((item) => { if (distribution[item.rating] !== undefined) distribution[item.rating]++; });
  const total = rows.reduce((sum, item) => sum + item.rating, 0);
  return {
    averageRating: rows.length ? Math.round((total / rows.length) * 10) / 10 : 0,
    ratingsCount: rows.length,
    distribution
  };
}

function calculatePublicBarberRatingSummary(employeeId, ratings, bookings) {
  const summary = calculateBarberRatingSummary(employeeId, ratings, bookings, false);
  return {
    ...summary,
    averageRating: summary.ratingsCount >= PUBLIC_RATING_MINIMUM_COUNT
      ? summary.averageRating
      : null
  };
}

function getBarberRatings(data) {
  try {
    const employeeId = String(data.employeeId || "").trim();
    if (!employeeId) return jsonOutput({ status: "error", message: "employeeId is required." });
    return jsonOutput({ status: "success", ...calculatePublicBarberRatingSummary(employeeId) });
  } catch (error) {
    return bookingPublicErrorResponse(error, "BOOKING_RATINGS_READ_FAILED");
  }
}

function getRatingsAdmin(data) {
  try {
    const permissionError = requirePermission(data, "view_ratings", "You do not have permission to view ratings.");
    if (permissionError) return permissionError;
    const filters = data.filters || {};
    const employeeId = String(filters.employeeId || data.employeeId || "").trim();
    const status = String(filters.status || data.ratingStatus || "").trim().toLowerCase();
    const fromDate = getDateKey(filters.fromDate || data.fromDate || "", TIME_ZONE);
    const toDate = getDateKey(filters.toDate || data.toDate || "", TIME_ZONE);
    const search = String(filters.search || data.search || "").trim().toLowerCase();
    const page = Math.max(1, Number(filters.page || data.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize || data.pageSize) || 25));
    const includeHistorical = parseSheetBoolean(filters.includeHistorical || data.includeHistorical, false);
    const bookings = getAllBookingsV2();
    const storedRatings = getAllBookingRatings();
    const allRatings = includeHistorical ? storedRatings : getActiveBookingRatings(storedRatings, bookings);
    const filtered = allRatings.filter((item) => !employeeId || item.employeeId === employeeId)
      .filter((item) => !status || item.status === status)
      .filter((item) => !fromDate || item.bookingDate >= fromDate)
      .filter((item) => !toDate || item.bookingDate <= toDate)
      .filter((item) => !search || `${item.employeeName} ${item.service} ${item.comment} ${item.bookingId}`.toLowerCase().indexOf(search) !== -1)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const monthKey = Utilities.formatDate(new Date(), TIME_ZONE, "yyyy-MM");
    const previousDate = new Date();
    previousDate.setMonth(previousDate.getMonth() - 1);
    const previousMonthKey = Utilities.formatDate(previousDate, TIME_ZONE, "yyyy-MM");
    const monthSummary = (key) => {
      const rows = allRatings.filter((item) => item.status === "published" && item.bookingDate.indexOf(key) === 0);
      return rows.length ? Math.round((rows.reduce((sum, item) => sum + item.rating, 0) / rows.length) * 10) / 10 : 0;
    };
    const employeeIds = {};
    allRatings.forEach((item) => { if (item.employeeId) employeeIds[item.employeeId] = item.employeeName; });
    const barberSummaries = Object.keys(employeeIds).map((id) => ({
      employeeId: id, employeeName: employeeIds[id],
      ...calculateBarberRatingSummary(id, allRatings, bookings, includeHistorical)
    }));
    return jsonOutput({
      status: "success",
      ratings: filtered.slice((page - 1) * pageSize, page * pageSize).map(publicRatingView),
      total: filtered.length, page, pageSize, barberSummaries, includeHistorical,
      currentMonthAverage: monthSummary(monthKey),
      previousMonthAverage: monthSummary(previousMonthKey),
      lowestRatings: allRatings.filter((item) => item.rating <= 2).slice(-10).reverse().map(publicRatingView)
    });
  } catch (error) {
    return bookingErrorResponse(error, "BOOKING_RATINGS_ADMIN_READ_FAILED");
  }
}

function updateRatingStatus(data) {
  const lock = LockService.getScriptLock();
  try {
    const permissionError = requirePermission(data, "manage_ratings", "You do not have permission to moderate ratings.");
    if (permissionError) return permissionError;
    const nextStatus = String(data.ratingStatus || data.status || "").trim().toLowerCase();
    if (["published", "hidden", "flagged"].indexOf(nextStatus) === -1) {
      return jsonOutput({ status: "error", message: "Invalid rating status." });
    }
    lock.waitLock(10000);
    const sheet = getBookingRatingsSheet();
    const headers = getRatingHeaders(sheet);
    if (sheet.getLastRow() < 2) return jsonOutput({ status: "error", message: "Rating not found." });
    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
    const targetId = String(data.ratingId || "").trim();
    const index = rows.findIndex((row, rowIndex) => ratingFromRow(row, headers, rowIndex + 2).ratingId === targetId);
    if (index < 0) return jsonOutput({ status: "error", message: "Rating not found." });
    const rating = ratingFromRow(rows[index], headers, index + 2);
    const previousStatus = rating.status;
    rating.status = nextStatus;
    rating.updatedAt = getCairoDateTime();
    writeBookingRatingRow(sheet, index + 2, rating, rows[index]);
    SpreadsheetApp.flush();
    logActivity(data, "moderate", "booking_rating", rating.ratingId, `Rating moderation | Rating ID: ${rating.ratingId} | Previous: ${previousStatus} | Next: ${nextStatus} | Booking: ${rating.bookingId}`);
    return jsonOutput({ status: "success", rating: publicRatingView(rating) });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
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
    const permissionError = requirePermission(data, "delete_bookings", "You do not have permission to delete bookings.");
    if (permissionError) return permissionError;
    return withBookingMutationLock({
      bookingRequestId: String(data.id || data.bookingId || "").trim()
    }, () => {
    const committedRetry = committedBookingMutationRetry(data);
    if (committedRetry) return jsonOutput({ status: "success", booking: committedRetry });
    const sheet = getBookingsSheetV2();
    const found = findBookingRowV2(sheet, data);
    if (!found) {
      return jsonOutput({ status: "error", message: "Booking not found" });
    }
    if (found.booking.deleted) return jsonOutput({ status: "success", booking: found.booking });
    const beforeBooking = JSON.parse(JSON.stringify(found.booking));
    const deletionReason = normalizeProtectedText(data.reason || data.deletionReason, 500);
    if (!deletionReason) return jsonOutput({ status: "error", message: "A deletion reason is required." });
    const actor = getActor(data);
    found.booking.deleted = true;
    found.booking.deletedAt = getCairoDateTime();
    found.booking.deletedBy = actor.displayName;
    found.booking.deletionReason = deletionReason;
    found.booking.updatedAt = found.booking.deletedAt;
    commitBookingPhase5UnderCurrentLock({
      data, requestId: data.clientRequestId, action: "BOOKING_DELETED",
      booking: found.booking, beforeState: beforeBooking,
      business: () => {
        writeBookingRowV2(sheet, found.rowNumber, found.booking, found.row);
        SpreadsheetApp.flush();
      },
      compensate: () => {
        writeBookingRowV2(sheet, found.rowNumber, beforeBooking, found.row);
        SpreadsheetApp.flush();
      }
    });
    logActivity(
      data,
      "soft_delete",
      "booking",
      found.booking.id,
      `Soft deleted booking | Customer: ${found.booking.customerName || "-"} | Date: ${found.booking.date || "-"} ${found.booking.time || "-"} | Employee: ${found.booking.employee || "-"} | Reason: ${found.booking.deletionReason || "-"}`
    );
    return jsonOutput({ status: "success", booking: found.booking });
    });
  } catch (error) {
    return bookingErrorResponse(error, "BOOKING_DELETE_FAILED");
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


