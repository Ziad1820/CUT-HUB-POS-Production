function bookingAvailabilityPhase5Now() {
  return Utilities.formatDate(
    new Date(), BookingAvailabilityPhase5.TIME_ZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function bookingAvailabilityPhase5WithLock(callback) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    var error = new Error("Another Booking Availability mutation is in progress.");
    error.code = "AVAILABILITY_WRITE_LOCK_TIMEOUT";
    throw error;
  }
  try { return callback(); } finally { lock.releaseLock(); }
}

function bookingAvailabilityPhase5FailurePoint(data, boundary) {
  var requested = bookingAvailabilityPhase5Text(data && data.phase5FailurePoint);
  if (!requested || requested !== boundary) return;
  var identity = bookingAvailabilityPhase5AssertIdentity();
  if (["development", "test"].indexOf(identity.config.environment) === -1) return;
  var error = new Error("Injected Phase 5 failure after " + boundary + ".");
  error.code = "AVAILABILITY_INJECTED_FAILURE";
  throw error;
}

function bookingAvailabilityPhase5SaveTransaction(record) {
  return schedulePhase2Save(
    "BOOKING_AVAILABILITY_TRANSACTIONS",
    BookingAvailabilityPhase5.SHEET_SCHEMAS.BOOKING_AVAILABILITY_TRANSACTIONS,
    "TRANSACTION_ID", record
  );
}

function bookingAvailabilityPhase5FindTransaction(action, requestId) {
  var matches = schedulePhase2ReadRows("BOOKING_AVAILABILITY_TRANSACTIONS").filter(function (item) {
    return bookingAvailabilityPhase5Text(item.requestId) === bookingAvailabilityPhase5Text(requestId) &&
      bookingAvailabilityPhase5Text(item.action) === bookingAvailabilityPhase5Text(action);
  });
  if (matches.length > 1) throw BookingAvailabilityPhase5.availabilityError(
    "AVAILABILITY_TRANSACTION_AMBIGUOUS", "Transaction request identity is ambiguous.");
  return matches[0] || null;
}

function bookingAvailabilityPhase5CommittedResultForRequest(requestId) {
  if (!bookingAvailabilityPhase5ValidRequestId(requestId)) return null;
  var matches = schedulePhase2ReadRows("BOOKING_AVAILABILITY_TRANSACTIONS").filter(function (item) {
    return bookingAvailabilityPhase5Text(item.requestId) ===
      bookingAvailabilityPhase5Text(requestId);
  });
  if (matches.length > 1) throw BookingAvailabilityPhase5.availabilityError(
    "AVAILABILITY_TRANSACTION_AMBIGUOUS", "Transaction request identity is ambiguous.");
  if (!matches.length) return null;
  if (String(matches[0].status).toUpperCase() === "COMMITTED") {
    return bookingAvailabilityPhase5TransactionResult(matches[0]);
  }
  if (bookingAvailabilityPhase5TransactionSafelyRetryable(matches[0])) return null;
  var error = BookingAvailabilityPhase5.availabilityError(
    "AVAILABILITY_RECOVERY_REQUIRED", "The original request has a durable recovery state.");
  error.details = {
    transactionId: matches[0].transactionId, status: matches[0].status,
    writeBoundary: matches[0].writeBoundary,
    recoveryRequired: matches[0].recoveryRequired === true
  };
  throw error;
}

function bookingAvailabilityPhase5TransactionSafelyRetryable(record) {
  if (!record || String(record.status || "").toUpperCase() !== "COMPENSATED" ||
      record.recoveryRequired === true ||
      String(record.recoveryRequired || "").toUpperCase() === "TRUE") return false;
  var compensation = record.compensationState || {};
  return compensation.completed === true ||
    String(compensation.completed || "").toUpperCase() === "TRUE";
}

function bookingAvailabilityPhase5BusinessFailureHasNoEffect(error) {
  return !!error && (error.businessMutationState === "NOT_STARTED" ||
    error.noBusinessMutation === true);
}

function bookingAvailabilityPhase5RetryHistory(record) {
  var compensation = record && record.compensationState || {};
  var history = Array.isArray(compensation.retryHistory) ? compensation.retryHistory.slice(-9) : [];
  history.push({
    status: record.status, errorCode: record.errorCode, errorMessage: record.errorMessage,
    writeBoundary: record.writeBoundary, compensationCompleted: compensation.completed === true,
    compensationSteps: compensation.steps || [], updatedAt: record.updatedAt
  });
  return history;
}

function bookingAvailabilityPhase5TransactionResult(record) {
  var result = record && record.result;
  if (result && typeof result === "object") return result;
  try { return JSON.parse(record && record.resultJson || "{}"); } catch (_error) { return {}; }
}

function bookingAvailabilityPhase5RunTransaction(options) {
  var data = options.data || {};
  var requestId = bookingAvailabilityPhase5Text(options.requestId);
  var action = bookingAvailabilityPhase5Text(options.action);
  if (!bookingAvailabilityPhase5ValidRequestId(requestId)) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_TRANSACTION_REQUEST_INVALID", "A valid transaction request ID is required.");
  }
  var prior = bookingAvailabilityPhase5FindTransaction(action, requestId);
  var retryHistory = [];
  if (prior) {
    var status = String(prior.status || "").toUpperCase();
    if (status === "COMMITTED") return bookingAvailabilityPhase5TransactionResult(prior);
    if (bookingAvailabilityPhase5TransactionSafelyRetryable(prior)) {
      retryHistory = bookingAvailabilityPhase5RetryHistory(prior);
    } else {
      var recovery = BookingAvailabilityPhase5.availabilityError(
        "AVAILABILITY_RECOVERY_REQUIRED", "The original request requires deterministic recovery.");
      recovery.details = {
        transactionId: prior.transactionId, status: status,
        writeBoundary: prior.writeBoundary, recoveryRequired: true
      };
      throw recovery;
    }
  }
  var identity = bookingAvailabilityPhase5AssertIdentity();
  var actor = options.actor || bookingAvailabilityPhase5Actor(data, true);
  var now = bookingAvailabilityPhase5Now();
  var transaction = prior || {
    transactionId: "BAT-" + Utilities.getUuid(), requestId: requestId, action: action,
    createdAt: now
  };
  Object.assign(transaction, {
    requestId: requestId, action: action,
    entityType: options.entityType || "", entityId: options.entityId || "",
    branchId: options.branchId || "", date: options.date || "",
    actorId: actor ? actor.actorId : "public", environment: identity.config.environment,
    status: "INTENT", writeBoundary: "INTENT", beforeState: options.beforeState || {},
    businessState: {}, versionState: {}, auditState: {}, result: {},
    errorCode: "", errorMessage: "",
    compensationState: { retryCount: retryHistory.length, retryHistory: retryHistory },
    recoveryRequired: false, updatedAt: now
  });
  bookingAvailabilityPhase5SaveTransaction(transaction);
  var businessResult;
  var businessAttempted = false;
  try {
    bookingAvailabilityPhase5FailurePoint(data, "INTENT");
    transaction.status = "BUSINESS_STARTED";
    transaction.writeBoundary = "BUSINESS_STARTED";
    transaction.updatedAt = bookingAvailabilityPhase5Now();
    bookingAvailabilityPhase5SaveTransaction(transaction);
    businessAttempted = true;
    businessResult = options.business(transaction);
    transaction.entityId = transaction.entityId ||
      bookingAvailabilityPhase5Text(businessResult && (businessResult.id ||
        businessResult.bookingId || businessResult.operationalOverrideId ||
        businessResult.conflictId));
    transaction.businessState = businessResult || {};
    transaction.status = "BUSINESS_WRITTEN";
    transaction.writeBoundary = "BUSINESS";
    transaction.updatedAt = bookingAvailabilityPhase5Now();
    bookingAvailabilityPhase5SaveTransaction(transaction);
    bookingAvailabilityPhase5FailurePoint(data, "BUSINESS");

    transaction.versionState = options.version ? options.version(businessResult, transaction) : {};
    transaction.status = "VERSION_WRITTEN";
    transaction.writeBoundary = "VERSION";
    transaction.updatedAt = bookingAvailabilityPhase5Now();
    bookingAvailabilityPhase5SaveTransaction(transaction);
    bookingAvailabilityPhase5FailurePoint(data, "VERSION");

    transaction.auditState = options.audit ? options.audit(businessResult, transaction) : {};
    transaction.status = "AUDIT_WRITTEN";
    transaction.writeBoundary = "AUDIT";
    transaction.updatedAt = bookingAvailabilityPhase5Now();
    bookingAvailabilityPhase5SaveTransaction(transaction);
    bookingAvailabilityPhase5FailurePoint(data, "AUDIT");

    var result = options.response ? options.response(businessResult, transaction) : businessResult;
    transaction.result = result || {};
    transaction.status = "COMMITTED";
    transaction.writeBoundary = "RESULT";
    transaction.updatedAt = bookingAvailabilityPhase5Now();
    bookingAvailabilityPhase5SaveTransaction(transaction);
    bookingAvailabilityPhase5FailurePoint(data, "RESULT");
    return result;
  } catch (error) {
    if (String(transaction.status).toUpperCase() === "COMMITTED") {
      return transaction.result || {};
    }
    var compensation = {
      attempted: true, completed: false, steps: [],
      retryCount: Number(transaction.compensationState && transaction.compensationState.retryCount) || 0,
      retryHistory: transaction.compensationState && transaction.compensationState.retryHistory || []
    };
    try {
      if (options.compensateAudit && transaction.auditState &&
          Object.keys(transaction.auditState).length) {
        options.compensateAudit(transaction.auditState, transaction);
        compensation.steps.push("AUDIT");
      }
      if (options.compensateVersion && transaction.versionState &&
          Object.keys(transaction.versionState).length) {
        options.compensateVersion(transaction.versionState, transaction);
        compensation.steps.push("VERSION");
      }
      if (!businessAttempted) {
        compensation.steps.push("BUSINESS_NOT_STARTED");
      } else if (bookingAvailabilityPhase5BusinessFailureHasNoEffect(error)) {
        compensation.steps.push("BUSINESS_NOT_WRITTEN");
      } else if (options.compensateBusiness) {
        options.compensateBusiness(businessResult, transaction);
        compensation.steps.push("BUSINESS");
      } else {
        throw BookingAvailabilityPhase5.availabilityError(
          "AVAILABILITY_COMPENSATION_UNAVAILABLE",
          "Business compensation is not available for an attempted mutation.");
      }
      bookingAvailabilityPhase5FailurePoint(data, "COMPENSATION");
      compensation.completed = true;
    } catch (compensationError) {
      compensation.errorCode = compensationError.code || "AVAILABILITY_COMPENSATION_FAILED";
      compensation.errorMessage = compensationError.message || String(compensationError);
    }
    transaction.status = compensation.completed ? "COMPENSATED" : "RECOVERY_REQUIRED";
    transaction.writeBoundary = "FAILED";
    transaction.errorCode = error.code || "AVAILABILITY_TRANSACTION_FAILED";
    transaction.errorMessage = error.message || String(error);
    transaction.compensationState = compensation;
    transaction.recoveryRequired = !compensation.completed;
    transaction.updatedAt = bookingAvailabilityPhase5Now();
    bookingAvailabilityPhase5SaveTransaction(transaction);
    var failure = BookingAvailabilityPhase5.availabilityError(
      compensation.completed ? transaction.errorCode : "AVAILABILITY_RECOVERY_REQUIRED",
      compensation.completed ? transaction.errorMessage :
        "The request is fail-closed and requires recovery.");
    failure.details = {
      transactionId: transaction.transactionId, status: transaction.status,
      writeBoundary: transaction.writeBoundary, recoveryRequired: transaction.recoveryRequired
    };
    throw failure;
  }
}

