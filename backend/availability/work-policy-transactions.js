function bookingAvailabilityPhase5AfterMutationUnderLock(kind, data, result) {
  var flags = bookingAvailabilityPhase5Flags();
  if (flags.engine === "LEGACY") return;
  var day = result && (result.attendanceDay || result.day);
  var branchId = bookingAvailabilityPhase5Text(
    (day && day.branchId) || data.branchId || "");
  var date = bookingAvailabilityPhase5Text(
    (day && (day.attendanceDate || day.date)) || data.date || "");
  if (!branchId || !date) return;
  var actor = bookingAvailabilityPhase5Actor(data, true);
  bookingAvailabilityPhase5IncrementVersion(kind, branchId, date, actor);
  bookingAvailabilityPhase5RecordConflicts(kind, data, result, branchId, date, actor);
}

function bookingAvailabilityPhase5AfterMutation(kind, data, result) {
  return bookingAvailabilityPhase5WithLock(function () {
    return bookingAvailabilityPhase5AfterMutationUnderLock(kind, data, result);
  });
}

function publishOperationalMutationVersion(kind, data, result) {
  return bookingAvailabilityPhase5AfterMutation(kind, data, result);
}

function publishOperationalMutationUnderCurrentLock(kind, data, result) {
  return bookingAvailabilityPhase5AfterMutationUnderLock(kind, data, result);
}

function bookingAvailabilityPhase5PolicyDates(effectiveFrom, effectiveTo) {
  var start = bookingAvailabilityPhase5Text(effectiveFrom);
  var end = bookingAvailabilityPhase5Text(effectiveTo);
  if (!bookingAvailabilityPhase5ValidDate(start) ||
      (end && !bookingAvailabilityPhase5ValidDate(end)) || (end && end < start)) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_POLICY_DATE_SCOPE_INVALID", "Work Policy date scope is invalid.");
  }
  if (!end) return [];
  var dates = [];
  var cursor = new Date(start + "T00:00:00Z");
  var finalDate = new Date(end + "T00:00:00Z");
  while (cursor <= finalDate) {
    if (dates.length >= 366) throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_POLICY_DATE_SCOPE_TOO_LARGE",
      "Work Policy date scope exceeds the bounded invalidation contract.");
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function bookingAvailabilityPhase5ResolveWorkPolicyScope(data, result) {
  var action = bookingAvailabilityPhase5Text(data && data.action);
  if (["createWorkPolicy", "deactivateWorkPolicy"].indexOf(action) === -1) return null;
  var policy = result && result.workPolicy;
  var staffId = bookingAvailabilityPhase5Text(policy && policy.staffId);
  if (!staffId) throw BookingAvailabilityPhase5.availabilityError(
    "AVAILABILITY_POLICY_STAFF_SCOPE_INVALID", "Work Policy staff scope is invalid.");
  var matches = schedulePhase2ReadStaff().filter(function (item) {
    return bookingAvailabilityPhase5Text(item.staffId) === staffId;
  });
  if (matches.length !== 1 || !bookingAvailabilityPhase5Text(matches[0].branchId)) {
    throw BookingAvailabilityPhase5.availabilityError(
      matches.length > 1 ? "AVAILABILITY_POLICY_STAFF_SCOPE_AMBIGUOUS" :
        "AVAILABILITY_POLICY_STAFF_BRANCH_REQUIRED",
      "Work Policy staff must resolve to exactly one canonical branch.");
  }
  var branchId = bookingAvailabilityPhase5Text(matches[0].branchId);
  var suppliedBranchId = bookingAvailabilityPhase5Text(data && data.branchId);
  if (suppliedBranchId && suppliedBranchId !== branchId) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_POLICY_BRANCH_SCOPE_MISMATCH",
      "Client-supplied branch scope cannot override canonical STAFF authority.");
  }
  bookingAvailabilityPhase5Branch(branchId, { allowClosed: true });
  var effectiveFrom = bookingAvailabilityPhase5Text(policy.effectiveFrom);
  var effectiveTo = bookingAvailabilityPhase5Text(policy.effectiveTo);
  return {
    policyId: bookingAvailabilityPhase5Text(policy.policyId), staffId: staffId,
    branchId: branchId, effectiveFrom: effectiveFrom, effectiveTo: effectiveTo,
    dates: bookingAvailabilityPhase5PolicyDates(effectiveFrom, effectiveTo)
  };
}

function bookingAvailabilityPhase5PreflightWorkPolicyScope(data) {
  if (bookingAvailabilityPhase5Text(data && data.action) !== "createWorkPolicy") return null;
  var input = data && data.policy || {};
  var staffId = bookingAvailabilityPhase5Text(input.staffId || input.STAFF_ID || data.staffId);
  if (!staffId) return null;
  var matches = schedulePhase2ReadStaff().filter(function (item) {
    return bookingAvailabilityPhase5Text(item.staffId) === staffId;
  });
  if (matches.length !== 1 || !bookingAvailabilityPhase5Text(matches[0].branchId)) {
    throw BookingAvailabilityPhase5.availabilityError(
      matches.length > 1 ? "AVAILABILITY_POLICY_STAFF_SCOPE_AMBIGUOUS" :
        "AVAILABILITY_POLICY_STAFF_BRANCH_REQUIRED",
      "Work Policy staff must resolve to exactly one canonical branch.");
  }
  var branchId = bookingAvailabilityPhase5Text(matches[0].branchId);
  var suppliedBranchId = bookingAvailabilityPhase5Text(data && data.branchId);
  if (suppliedBranchId && suppliedBranchId !== branchId) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_POLICY_BRANCH_SCOPE_MISMATCH",
      "Client-supplied branch scope cannot override canonical STAFF authority.");
  }
  bookingAvailabilityPhase5Branch(branchId, { allowClosed: true });
  return { branchId: branchId, staffId: staffId };
}

function bookingAvailabilityPhase5InvalidateWorkPolicy(scope, actor, requestId) {
  var generation = bookingAvailabilityPhase5IncrementGeneration(
    "attendance", "BRANCH", scope.branchId, actor, requestId);
  var versions = scope.dates.map(function (date) {
    return bookingAvailabilityPhase5IncrementVersionOnly(
      "attendance", scope.branchId, date, actor);
  });
  return {
    kind: "WORK_POLICY", scopeType: "BRANCH", branchId: scope.branchId,
    staffId: scope.staffId, effectiveFrom: scope.effectiveFrom,
    effectiveTo: scope.effectiveTo, affectedDates: scope.dates,
    generation: generation, versions: versions
  };
}

function bookingAvailabilityPhase5WorkPolicyAudit(scope, actor, requestId) {
  var matches = schedulePhase2ReadRows("BOOKING_AVAILABILITY_AUDIT").filter(function (item) {
    return bookingAvailabilityPhase5Text(item.requestId) === requestId &&
      bookingAvailabilityPhase5Text(item.entityId) === scope.policyId &&
      bookingAvailabilityPhase5Text(item.action) === "WORK_POLICY_AVAILABILITY_INVALIDATED";
  });
  if (matches.length > 1) throw BookingAvailabilityPhase5.availabilityError(
    "AVAILABILITY_POLICY_AUDIT_AMBIGUOUS", "Work Policy invalidation audit is ambiguous.");
  if (matches.length === 1) return matches[0];
  return bookingAvailabilityPhase5AppendAudit({
    action: "WORK_POLICY_AVAILABILITY_INVALIDATED", entityType: "STAFF_WORK_POLICY",
    entityId: scope.policyId, branchId: scope.branchId, staffId: scope.staffId,
    date: scope.effectiveFrom, actorId: actor ? actor.actorId : "system",
    actorRole: actor ? actor.role : "SYSTEM", reasonCode: "WORK_POLICY_SCOPE_CHANGED",
    sourceIds: [scope.policyId], afterState: {
      effectiveFrom: scope.effectiveFrom, effectiveTo: scope.effectiveTo,
      affectedDates: scope.dates
    }, requestId: requestId
  });
}

function bookingAvailabilityPhase5RunOperationalMutationTransaction(kind, data, callback) {
  if (bookingAvailabilityPhase5Flags().engine === "LEGACY") return callback();
  var requestId = bookingAvailabilityPhase5Text(data && (data.clientRequestId || data.requestId));
  if (!bookingAvailabilityPhase5ValidRequestId(requestId)) {
    requestId = "OPERATION-" + BookingAvailabilityPhase5.hash({
      kind: kind, action: data && data.action, staffId: data && (data.staffId || data.employeeId),
      branchId: data && data.branchId, date: data && data.date
    });
  }
  var actor = bookingAvailabilityPhase5Actor(data, true);
  var policyPreflight = bookingAvailabilityPhase5PreflightWorkPolicyScope(data);
  return bookingAvailabilityPhase5RunTransaction({
    data: data, requestId: requestId,
    action: String(kind).toUpperCase() + "_AVAILABILITY_INVALIDATION",
    entityType: String(kind).toUpperCase() + "_MUTATION",
    branchId: policyPreflight ? policyPreflight.branchId :
      bookingAvailabilityPhase5Text(data && data.branchId),
    date: bookingAvailabilityPhase5Text(data && data.date),
    actor: actor, beforeState: {},
    business: function () {
      try {
        return callback();
      } catch (error) {
        var domainCode = String(error && error.code || "").toUpperCase();
        if (domainCode !== "SCHEDULE_COMPENSATION_FAILED" &&
            domainCode !== "ATTENDANCE_COMPENSATION_FAILED") {
          error.noBusinessMutation = true;
        }
        throw error;
      }
    },
    version: function (result, transaction) {
      var policyScope = bookingAvailabilityPhase5ResolveWorkPolicyScope(data, result);
      if (policyScope) {
        transaction.branchId = policyScope.branchId;
        transaction.date = policyScope.effectiveFrom;
        transaction.entityType = "STAFF_WORK_POLICY";
        transaction.entityId = policyScope.policyId;
        return bookingAvailabilityPhase5InvalidateWorkPolicy(policyScope, actor, requestId);
      }
      var day = result && (result.attendanceDay || result.day);
      var record = result && (result.override || result.scheduleOverride || result.record);
      var branchId = bookingAvailabilityPhase5Text(
        (day && day.branchId) || (record && record.branchId) || data.branchId);
      var date = bookingAvailabilityPhase5Text(
        (day && (day.attendanceDate || day.date)) ||
        (record && (record.date || record.effectiveFrom)) || data.date);
      if (!branchId || !date) return bookingAvailabilityPhase5IncrementGeneration(
        kind === "schedule" ? "recurringSchedule" : "attendance",
        kind === "schedule" ? "GLOBAL" : "BRANCH",
        kind === "schedule" ? "GLOBAL" : branchId, actor, requestId);
      return bookingAvailabilityPhase5IncrementVersion(kind, branchId, date, actor);
    },
    audit: function (result) {
      var policyScope = bookingAvailabilityPhase5ResolveWorkPolicyScope(data, result);
      if (policyScope) return bookingAvailabilityPhase5WorkPolicyAudit(
        policyScope, actor, requestId);
      var day = result && (result.attendanceDay || result.day);
      var record = result && (result.override || result.scheduleOverride || result.record);
      var branchId = bookingAvailabilityPhase5Text(
        (day && day.branchId) || (record && record.branchId) || data.branchId);
      var date = bookingAvailabilityPhase5Text(
        (day && (day.attendanceDate || day.date)) || (record && record.date) || data.date);
      bookingAvailabilityPhase5RecordConflicts(kind, data, result, branchId, date, actor);
      return bookingAvailabilityPhase5AppendAudit({
        action: String(kind).toUpperCase() + "_AVAILABILITY_INVALIDATED",
        entityType: String(kind).toUpperCase() + "_MUTATION",
        entityId: bookingAvailabilityPhase5Text(
          (day && day.attendanceDayId) || (record && (record.overrideId || record.scheduleId))),
        branchId: branchId, staffId: bookingAvailabilityPhase5Text(
          (day && day.staffId) || (record && record.staffId)),
        date: date, actorId: actor ? actor.actorId : "system",
        actorRole: actor ? actor.role : "SYSTEM",
        reasonCode: "AVAILABILITY_INVALIDATION", requestId: requestId
      });
    },
    response: function (result) { return result; }
  });
}

function bookingAvailabilityPhase5RecoverWorkPolicyTransaction(data, actor) {
  if (!actor || !actor.owner) throw BookingAvailabilityPhase5.availabilityError(
    "AVAILABILITY_OWNER_REQUIRED", "Only owner can recover availability transactions.");
  var transactionId = bookingAvailabilityPhase5Text(data.transactionId);
  var originalRequestId = bookingAvailabilityPhase5Text(data.originalRequestId);
  var recoveryRequestId = bookingAvailabilityPhase5Text(data.requestId);
  if (!transactionId || !bookingAvailabilityPhase5ValidRequestId(originalRequestId) ||
      !bookingAvailabilityPhase5ValidRequestId(recoveryRequestId)) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_RECOVERY_REQUEST_INVALID", "Recovery transaction and request identity are required.");
  }
  return bookingAvailabilityPhase5WithLock(function () {
    var matches = schedulePhase2ReadRows("BOOKING_AVAILABILITY_TRANSACTIONS").filter(function (item) {
      return bookingAvailabilityPhase5Text(item.transactionId) === transactionId &&
        bookingAvailabilityPhase5Text(item.requestId) === originalRequestId;
    });
    if (matches.length !== 1) throw BookingAvailabilityPhase5.availabilityError(
      matches.length ? "AVAILABILITY_TRANSACTION_AMBIGUOUS" : "AVAILABILITY_TRANSACTION_NOT_FOUND",
      "Recovery transaction was not found uniquely.");
    var transaction = matches[0];
    if (String(transaction.status).toUpperCase() === "COMMITTED") {
      return { recovered: true, replay: true, transactionId: transactionId,
        result: bookingAvailabilityPhase5TransactionResult(transaction) };
    }
    if (String(transaction.status).toUpperCase() === "COMPENSATED" &&
        transaction.recoveryRequired !== true &&
        String(transaction.recoveryRequired || "").toUpperCase() !== "TRUE") {
      return { recovered: true, replay: true, compensated: true,
        transactionId: transactionId, result: {} };
    }
    var transactionAction = String(transaction.action || "").toUpperCase();
    var domainPrefix = transactionAction === "SCHEDULE_AVAILABILITY_INVALIDATION"
      ? "SCHEDULE" : transactionAction === "ATTENDANCE_AVAILABILITY_INVALIDATION"
        ? "ATTENDANCE" : "";
    var domainRecoveryMarker = domainPrefix
      ? PropertiesService.getScriptProperties().getProperty(
        domainPrefix + "_RECOVERY_" + originalRequestId) : "";
    var compensation = transaction.compensationState || {};
    var emptyOperationalState = [transaction.businessState, transaction.versionState,
      transaction.auditState, transaction.result].every(function (value) {
        return !value || !Object.keys(value).length;
      });
    var domainCompensationFailed = String(transaction.errorCode || "").toUpperCase() ===
      domainPrefix + "_COMPENSATION_FAILED";
    if (String(transaction.status).toUpperCase() === "RECOVERY_REQUIRED" &&
        domainPrefix && emptyOperationalState && !domainRecoveryMarker &&
        !domainCompensationFailed &&
        String(compensation.errorCode || "").toUpperCase() ===
          "AVAILABILITY_COMPENSATION_UNAVAILABLE") {
      transaction.compensationState = {
        attempted: true, completed: true,
        steps: ["BUSINESS_ROLLED_BACK_BY_DOMAIN_TRANSACTION"],
        retryCount: Number(compensation.retryCount) || 0,
        retryHistory: compensation.retryHistory || []
      };
      transaction.status = "COMPENSATED";
      transaction.writeBoundary = "RECOVERY_COMPENSATED";
      transaction.recoveryRequired = false;
      transaction.updatedAt = bookingAvailabilityPhase5Now();
      bookingAvailabilityPhase5SaveTransaction(transaction);
      return { recovered: true, replay: false, compensated: true,
        transactionId: transactionId, result: {} };
    }
    if (String(transaction.status).toUpperCase() !== "RECOVERY_REQUIRED" ||
        bookingAvailabilityPhase5Text(transaction.action) !== "ATTENDANCE_AVAILABILITY_INVALIDATION" ||
        bookingAvailabilityPhase5Text(transaction.errorCode) !== "AVAILABILITY_GENERATION_SCOPE_INVALID") {
      throw BookingAvailabilityPhase5.availabilityError(
        "AVAILABILITY_RECOVERY_STATE_UNSUPPORTED",
        "Only the proven Work Policy invalidation recovery state is supported.");
    }
    var result = transaction.businessState;
    var policy = result && result.workPolicy;
    if (!policy || ["CREATE_WORK_POLICY_OK", "DEACTIVATE_WORK_POLICY_OK"].indexOf(
        bookingAvailabilityPhase5Text(result.code)) === -1) {
      throw BookingAvailabilityPhase5.availabilityError(
        "AVAILABILITY_RECOVERY_BUSINESS_EVIDENCE_INVALID",
        "Committed Work Policy business evidence is missing.");
    }
    var policyRows = schedulePhase2ReadRows("STAFF_WORK_POLICIES").filter(function (item) {
      return bookingAvailabilityPhase5Text(item.policyId) ===
        bookingAvailabilityPhase5Text(policy.policyId);
    });
    var idempotencyRows = schedulePhase2ReadRows("STAFF_ATTENDANCE_IDEMPOTENCY").filter(function (item) {
      return bookingAvailabilityPhase5Text(item.requestId) === originalRequestId &&
        String(item.status || "").toUpperCase() === "COMPLETED";
    });
    if (policyRows.length !== 1 || idempotencyRows.length !== 1) {
      throw BookingAvailabilityPhase5.availabilityError(
        "AVAILABILITY_RECOVERY_BUSINESS_EVIDENCE_INVALID",
        "Work Policy and idempotency evidence must each exist exactly once.");
    }
    var originalAction = bookingAvailabilityPhase5Text(idempotencyRows[0].action);
    var scope = bookingAvailabilityPhase5ResolveWorkPolicyScope(
      { action: originalAction }, result);
    if (!transaction.versionState || !Object.keys(transaction.versionState).length) {
      transaction.versionState = bookingAvailabilityPhase5InvalidateWorkPolicy(
        scope, actor, originalRequestId);
      transaction.status = "VERSION_WRITTEN";
      transaction.writeBoundary = "RECOVERY_VERSION";
      transaction.branchId = scope.branchId;
      transaction.date = scope.effectiveFrom;
      transaction.entityType = "STAFF_WORK_POLICY";
      transaction.entityId = scope.policyId;
      transaction.updatedAt = bookingAvailabilityPhase5Now();
      bookingAvailabilityPhase5SaveTransaction(transaction);
    }
    if (!transaction.auditState || !Object.keys(transaction.auditState).length) {
      transaction.auditState = bookingAvailabilityPhase5WorkPolicyAudit(
        scope, actor, originalRequestId);
      transaction.status = "AUDIT_WRITTEN";
      transaction.writeBoundary = "RECOVERY_AUDIT";
      transaction.updatedAt = bookingAvailabilityPhase5Now();
      bookingAvailabilityPhase5SaveTransaction(transaction);
    }
    transaction.result = result;
    transaction.status = "COMMITTED";
    transaction.writeBoundary = "RECOVERED";
    transaction.errorCode = "";
    transaction.errorMessage = "";
    transaction.recoveryRequired = false;
    transaction.compensationState = {
      recovered: true, recoveryRequestId: recoveryRequestId,
      recoveredAt: bookingAvailabilityPhase5Now(), recoveredBy: actor.actorId
    };
    transaction.updatedAt = bookingAvailabilityPhase5Now();
    bookingAvailabilityPhase5SaveTransaction(transaction);
    return { recovered: true, replay: false, transactionId: transactionId,
      branchId: scope.branchId, staffId: scope.staffId,
      affectedDates: scope.dates, result: result };
  });
}

function publishOperationalMutationTransactionUnderCurrentLock(kind, data, callback) {
  return bookingAvailabilityPhase5RunOperationalMutationTransaction(kind, data, callback);
}

