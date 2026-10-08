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

  const logoutAction = data.action === "logoutUser" || data.action === "logout";
  const strictReadOnlyAuthAction = data.action === "getMyAuthSecurityState";
  let authenticatedRequestContext = null;
  if (!isPublicAction(data.action)) {
    const sessionToken = getSessionToken(data);
    try {
      authenticatedRequestContext = protectedReadCapability(data.action)
        ? resolveProtectedReadAuthContext(data)
        : sessionToken ? resolveAuthenticatedRequestContext(data, strictReadOnlyAuthAction
          ? { strictReadOnly: true }
          : undefined)
        : null;
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
    if (!sessionToken || !authenticatedRequestContext) {
      if (logoutAction) return logoutUser(data, null);
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
  if (logoutAction) return logoutUser(data, authenticatedRequestContext);
  if (data.action === "getMyAuthSecurityState") {
    return getMyAuthSecurityState(data, authenticatedRequestContext);
  }
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

  if (data.action === "getStaff") return getStaff(data);
  if (data.action === "saveStaff") return saveStaff(data);
  if (data.action === "updateStaffMember") return saveStaff({ ...data, mode: "updateExisting" });

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
  if (data.action === "getInternalBookingOptions") return getInternalBookingOptions(data);
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

