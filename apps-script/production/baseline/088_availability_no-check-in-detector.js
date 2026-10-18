function bookingAvailabilityPhase5DetectorCaps() {
  return {
    maxBranches: 5,
    maxStaff: 40,
    maxBookings: 150,
    maxConflicts: 30,
    timeBudgetMs: 240000,
    executionSafetyMarginMs: 30000
  };
}

function bookingAvailabilityPhase5DetectorLimits(data) {
  var caps = bookingAvailabilityPhase5DetectorCaps();
  var requested = data && data.detectorLimits || {};
  function bounded(name, minimum) {
    var value = Math.floor(Number(requested[name]));
    if (!Number.isFinite(value) || value < minimum) return caps[name];
    return Math.min(value, caps[name]);
  }
  return {
    maxBranches: bounded("maxBranches", 1),
    maxStaff: bounded("maxStaff", 1),
    maxBookings: bounded("maxBookings", 1),
    maxConflicts: bounded("maxConflicts", 1),
    timeBudgetMs: bounded("timeBudgetMs", 1000),
    executionSafetyMarginMs: caps.executionSafetyMarginMs,
    serverCapsApplied: true
  };
}

function bookingAvailabilityPhase5DetectorNowMs() {
  return new Date().getTime();
}

function bookingAvailabilityPhase5DetectorCheckpointStorage() {
  // Contract only. A future activation task may provide an audited durable
  // implementation. This implementation intentionally never writes Properties,
  // Sheets, Cache, or any other remote checkpoint state.
  return {
    enabled: false,
    productionWritesEnabled: false,
    load: function () { return null; },
    save: function () { return { written: false, reason: "CHECKPOINT_WRITES_DISABLED" }; },
    clear: function () { return { written: false, reason: "CHECKPOINT_WRITES_DISABLED" }; }
  };
}

function bookingAvailabilityPhase5DetectorActor(data) {
  var interactive = null;
  try {
    interactive = bookingAvailabilityPhase5Actor(data);
  } catch (authenticationError) {
    if (authenticationError.code !== "AVAILABILITY_AUTH_REQUIRED") throw authenticationError;
  }
  if (interactive) return interactive;
  // A time-driven trigger has no browser session. Its identity is accepted only
  // when the effective Apps Script user exactly matches an operator-reviewed
  // property. Production execution remains blocked independently above.
  var properties = PropertiesService.getScriptProperties();
  var expectedEmail = bookingAvailabilityPhase5Text(
    properties.getProperty("BOOKING_NO_CHECK_IN_TRIGGER_OWNER_EMAIL")).toLowerCase();
  var effectiveEmail = "";
  if (typeof Session !== "undefined" && Session.getEffectiveUser) {
    effectiveEmail = bookingAvailabilityPhase5Text(
      Session.getEffectiveUser().getEmail()).toLowerCase();
  }
  if (!expectedEmail || !effectiveEmail || expectedEmail !== effectiveEmail) {
    throw BookingAvailabilityPhase5.availabilityError(
      "NO_CHECK_IN_TRIGGER_IDENTITY_INVALID",
      "The effective trigger owner does not match the reviewed deployer identity.");
  }
  return {
    actorId: "trigger:" + effectiveEmail, username: "owner", role: "OWNER",
    owner: true, active: true, permissions: BookingAvailabilityPhase5.PERMISSIONS,
    branchIds: []
  };
}

function bookingAvailabilityPhase5DetectorError(error, scope, identifiers) {
  return {
    scope: scope,
    branchId: bookingAvailabilityPhase5Text(identifiers && identifiers.branchId),
    staffId: bookingAvailabilityPhase5Text(identifiers && identifiers.staffId),
    bookingId: bookingAvailabilityPhase5Text(identifiers && identifiers.bookingId),
    code: bookingAvailabilityPhase5Text(error && error.code) || "NO_CHECK_IN_ITEM_FAILED",
    message: bookingAvailabilityPhase5Text(error && error.message) || "Detector item failed."
  };
}

function bookingAvailabilityPhase5DetectorUnits(snapshot) {
  var branches = (snapshot.branches || []).filter(function (branch) {
    return branch.active === true || String(branch.active).toUpperCase() === "TRUE";
  }).slice().sort(function (left, right) {
    return bookingAvailabilityPhase5Text(left.branchId).localeCompare(
      bookingAvailabilityPhase5Text(right.branchId));
  });
  var units = [];
  branches.forEach(function (branch) {
    var branchId = bookingAvailabilityPhase5Text(branch.branchId);
    (snapshot.staff || []).filter(function (staff) {
      return bookingAvailabilityPhase5Text(staff.branchId) === branchId &&
        (staff.active === true || String(staff.active).toUpperCase() === "TRUE");
    }).slice().sort(function (left, right) {
      return bookingAvailabilityPhase5Text(left.staffId).localeCompare(
        bookingAvailabilityPhase5Text(right.staffId));
    }).forEach(function (staff) {
      units.push({
        key: branchId + "|" + bookingAvailabilityPhase5Text(staff.staffId),
        branchId: branchId,
        staffId: bookingAvailabilityPhase5Text(staff.staffId)
      });
    });
  });
  return { branches: branches, units: units };
}

function bookingAvailabilityPhase5DetectorFingerprint(snapshot, plan) {
  return BookingAvailabilityPhase5.hash({
    units: plan.units.map(function (unit) { return unit.key; }),
    bookings: (snapshot.bookings || []).map(function (booking) {
      return [booking.id || booking.bookingId, booking.branchId, booking.employeeId,
        booking.date, booking.time, booking.status, booking.deleted === true];
    }).sort()
  });
}

function bookingAvailabilityPhase5DetectorContinuation(data, fingerprint, units) {
  var token = data && data.continuationToken;
  if (!token || typeof token !== "object") return { unitIndex: 0, afterBookingId: "" };
  if (Number(token.version) !== 1 || token.fingerprint !== fingerprint) {
    return { unitIndex: 0, afterBookingId: "", restarted: true,
      error: { scope: "checkpoint", code: "NO_CHECK_IN_CHECKPOINT_STALE",
        message: "The source snapshot changed; processing restarted safely." } };
  }
  var key = bookingAvailabilityPhase5Text(token.unitKey);
  var index = units.map(function (unit) { return unit.key; }).indexOf(key);
  if (index < 0) return { unitIndex: 0, afterBookingId: "", restarted: true,
    error: { scope: "checkpoint", code: "NO_CHECK_IN_CHECKPOINT_INVALID",
      message: "The continuation position is no longer valid; processing restarted safely." } };
  return { unitIndex: index, afterBookingId: bookingAvailabilityPhase5Text(token.afterBookingId) };
}

function bookingAvailabilityPhase5DetectorToken(fingerprint, unit, afterBookingId) {
  return {
    version: 1, fingerprint: fingerprint, unitKey: unit.key,
    afterBookingId: bookingAvailabilityPhase5Text(afterBookingId)
  };
}

function bookingAvailabilityPhase5DetectorScheduleEligible(schedule, nowMinute) {
  if (!schedule || !schedule.active || [
    "DAY_OFF", "WEEKLY_DAY_OFF", "APPROVED_LEAVE", "UNPAID_LEAVE",
    "SICK_LEAVE", "ABSENT", "BRANCH_CLOSED", "CLOSED", "NOT_SCHEDULED"
  ].indexOf(String(schedule.classification).toUpperCase()) !== -1 ||
      !schedule.shiftSegments || !schedule.shiftSegments.length) return false;
  var starts = schedule.shiftSegments.map(function (segment) {
    return bookingAvailabilityPhase5ClockMinutes(segment.shiftStart);
  }).filter(function (minute) { return minute !== null; });
  if (!starts.length) return false;
  return nowMinute > Math.min.apply(null, starts) +
    BookingAvailabilityPhase5.DEFAULTS.noCheckInGraceMinutes;
}

function bookingAvailabilityPhase5DetectorContextFingerprint(context) {
  return BookingAvailabilityPhase5.hash({
    branch: context.branch,
    schedule: context.schedule,
    attendance: context.attendance,
    branchHours: (context.snapshot.branchHours || []).filter(function (row) {
      return bookingAvailabilityPhase5Text(row.branchId) ===
        bookingAvailabilityPhase5Text(context.branch.branchId);
    }),
    versions: (context.snapshot.versions || []).filter(function (row) {
      return bookingAvailabilityPhase5Text(row.branchId) ===
        bookingAvailabilityPhase5Text(context.branch.branchId) &&
        bookingAvailabilityPhase5Text(row.date) === context.date;
    })
  });
}

function bookingAvailabilityPhase5DetectorFreshContext(unit) {
  var snapshot = bookingAvailabilityPhase5RequestSnapshot();
  var branches = snapshot.branches.filter(function (branch) {
    return bookingAvailabilityPhase5Text(branch.branchId) === unit.branchId;
  });
  if (branches.length !== 1) throw BookingAvailabilityPhase5.availabilityError(
    "NO_CHECK_IN_BRANCH_CHANGED", "Detector branch identity changed during processing.");
  var branch = branches[0];
  if (!(branch.active === true || String(branch.active).toUpperCase() === "TRUE") ||
      String(branch.closureStatus).toUpperCase() === "CLOSED") {
    throw BookingAvailabilityPhase5.availabilityError(
      "NO_CHECK_IN_BRANCH_UNAVAILABLE", "Detector branch is no longer operational.");
  }
  BookingAvailabilityPhase5.validateBranchConfiguration(branch, { allowClosed: true });
  var timeZone = bookingAvailabilityPhase5Text(branch.timeZone);
  var now = new Date();
  var date;
  var nowMinute;
  try {
    date = Utilities.formatDate(now, timeZone, "yyyy-MM-dd");
    nowMinute = Number(Utilities.formatDate(now, timeZone, "H")) * 60 +
      Number(Utilities.formatDate(now, timeZone, "m"));
  } catch (timeZoneError) {
    var invalidTimeZone = BookingAvailabilityPhase5.availabilityError(
      "NO_CHECK_IN_TIMEZONE_INVALID", "The detector branch timezone is not usable.");
    invalidTimeZone.details = { timeZone: timeZone };
    throw invalidTimeZone;
  }
  var staffMatches = snapshot.staff.filter(function (staff) {
    return bookingAvailabilityPhase5Text(staff.staffId) === unit.staffId &&
      bookingAvailabilityPhase5Text(staff.branchId) === unit.branchId &&
      (staff.active === true || String(staff.active).toUpperCase() === "TRUE");
  });
  if (staffMatches.length !== 1) throw BookingAvailabilityPhase5.availabilityError(
    "NO_CHECK_IN_STAFF_CHANGED", "Detector staff identity changed during processing.");
  var staff = staffMatches[0];
  var schedule = bookingAvailabilityPhase5ResolveSchedule(staff, date, snapshot);
  var attendance = bookingAvailabilityPhase5Attendance(staff, date, snapshot);
  return {
    snapshot: snapshot, branch: branch, staff: staff, schedule: schedule,
    attendance: attendance, date: date, nowMinute: nowMinute
  };
}

function previewBookingNoCheckInTriggerInstallation(data) {
  var identity = bookingAvailabilityPhase5AssertIdentity({ preview: true });
  var actor = bookingAvailabilityPhase5Actor(data);
  if (!actor.owner) throw BookingAvailabilityPhase5.availabilityError(
    "AVAILABILITY_OWNER_REQUIRED", "Only owner can preview the detector trigger.");
  return {
    environment: identity.config.environment, dryRun: true,
    executionAllowed: false, installed: false, writes: 0, checkpointWrites: 0,
    handler: "runBookingNoCheckInDetector", cadenceMinutes: 5,
    limits: bookingAvailabilityPhase5DetectorLimits(data),
    checkpoint: { mode: "REPRODUCIBLE_TOKEN", durableWritesEnabled: false },
    requiredGates: ["non-production", "PHASE5", "planned-enabled",
      "attendance-live-enabled", "conflict-resolution-enabled", "detector-enabled"],
    note: "Preview only. No conflicts, audits, checkpoints, generations, data, or ScriptApp triggers are written."
  };
}

function runBookingNoCheckInDetector(data) {
  data = data || {};
  var identity = bookingAvailabilityPhase5AssertIdentity();
  if (["development", "test"].indexOf(identity.config.environment) === -1) {
    throw BookingAvailabilityPhase5.availabilityError(
      "PHASE5_ENVIRONMENT_BLOCKED", "Detector production and staging execution remain disabled.");
  }
  var actor = bookingAvailabilityPhase5DetectorActor(data);
  if (!actor.owner) throw BookingAvailabilityPhase5.availabilityError(
    "AVAILABILITY_OWNER_REQUIRED", "Only owner can run the reviewed detector.");
  var flags = bookingAvailabilityPhase5Flags();
  if (flags.engine !== "PHASE5" || !flags.plannedEnabled ||
      !flags.attendanceLiveEnabled || !flags.conflictResolutionEnabled ||
      !flags.noCheckInDetectorEnabled) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_FEATURE_DISABLED", "The no-check-in detector feature gates are disabled.");
  }

  var startedMs = bookingAvailabilityPhase5DetectorNowMs();
  var startedAt = bookingAvailabilityPhase5Now();
  var limits = bookingAvailabilityPhase5DetectorLimits(data);
  var deadlineMs = startedMs + Math.min(
    limits.timeBudgetMs, 360000 - limits.executionSafetyMarginMs);
  var snapshot = bookingAvailabilityPhase5RequestSnapshot();
  var plan = bookingAvailabilityPhase5DetectorUnits(snapshot);
  var fingerprint = bookingAvailabilityPhase5DetectorFingerprint(snapshot, plan);
  var continuation = bookingAvailabilityPhase5DetectorContinuation(
    data, fingerprint, plan.units);
  var errors = continuation.error ? [continuation.error] : [];
  var runId = bookingAvailabilityPhase5ValidRequestId(data.clientRequestId)
    ? bookingAvailabilityPhase5Text(data.clientRequestId) : "NCDRUN-" + Utilities.getUuid();
  var summary = {
    runId: runId, startTime: startedAt, endTime: "", mode: "DEVELOPMENT_TEST_MUTATION",
    branchesScanned: 0, staffScanned: 0, bookingsScanned: 0,
    eligibleNoCheckIns: 0, conflictsCreated: 0, conflictsAlreadyExisting: 0,
    conflictsReviewed: 0, skippedRecords: 0, failedRecords: errors.length,
    revalidatedRecords: 0, sourceChangesRevalidated: 0,
    status: "PARTIAL", continuationToken: null, checkpointWritten: false,
    batchAuditReused: false, errorSummaries: errors, limits: limits
  };
  var branchSeen = {};
  var invalidBranches = {};
  var stopped = false;

  for (var unitIndex = continuation.unitIndex; unitIndex < plan.units.length; unitIndex += 1) {
    var unit = plan.units[unitIndex];
    var newBranch = !branchSeen[unit.branchId];
    if ((newBranch && summary.branchesScanned >= limits.maxBranches) ||
        summary.staffScanned >= limits.maxStaff ||
        bookingAvailabilityPhase5DetectorNowMs() >= deadlineMs) {
      summary.continuationToken = bookingAvailabilityPhase5DetectorToken(
        fingerprint, unit, "");
      stopped = true;
      break;
    }
    if (newBranch) {
      branchSeen[unit.branchId] = true;
      summary.branchesScanned += 1;
    }
    if (invalidBranches[unit.branchId]) {
      summary.skippedRecords += 1;
      continue;
    }
    summary.staffScanned += 1;
    var initialContext;
    try {
      initialContext = bookingAvailabilityPhase5DetectorFreshContext(unit);
      if (!bookingAvailabilityPhase5DetectorScheduleEligible(
        initialContext.schedule, initialContext.nowMinute) ||
          String(initialContext.attendance.state).toUpperCase() !== "NOT_STARTED") {
        summary.skippedRecords += 1;
        continue;
      }
      summary.eligibleNoCheckIns += 1;
    } catch (unitError) {
      summary.failedRecords += 1;
      var unitErrorCode = bookingAvailabilityPhase5Text(unitError && unitError.code);
      var unitScope = unitErrorCode.indexOf("BRANCH") !== -1 ||
        unitErrorCode.indexOf("TIMEZONE") !== -1 ? "branch" : "staff";
      if (unitScope === "branch") invalidBranches[unit.branchId] = true;
      summary.errorSummaries.push(bookingAvailabilityPhase5DetectorError(
        unitError, unitScope, unit));
      continue;
    }

    var bookings = initialContext.snapshot.bookings.filter(function (booking) {
      return !booking.deleted &&
        bookingAvailabilityPhase5Text(booking.branchId) === unit.branchId &&
        bookingAvailabilityPhase5Text(booking.employeeId) === unit.staffId &&
        bookingAvailabilityPhase5Text(booking.date) === initialContext.date &&
        ["confirmed", "proposed", "pending"].indexOf(
          String(booking.status).toLowerCase()) !== -1;
    }).slice().sort(function (left, right) {
      return bookingAvailabilityPhase5Text(left.id || left.bookingId).localeCompare(
        bookingAvailabilityPhase5Text(right.id || right.bookingId));
    });
    var afterBookingId = unitIndex === continuation.unitIndex
      ? continuation.afterBookingId : "";
    if (afterBookingId) bookings = bookings.filter(function (booking) {
      return bookingAvailabilityPhase5Text(booking.id || booking.bookingId) > afterBookingId;
    });

    for (var bookingIndex = 0; bookingIndex < bookings.length; bookingIndex += 1) {
      var bookingId = bookingAvailabilityPhase5Text(
        bookings[bookingIndex].id || bookings[bookingIndex].bookingId);
      if (summary.bookingsScanned >= limits.maxBookings ||
          summary.conflictsReviewed >= limits.maxConflicts ||
          bookingAvailabilityPhase5DetectorNowMs() >= deadlineMs) {
        summary.continuationToken = bookingAvailabilityPhase5DetectorToken(
          fingerprint, unit, bookingIndex ? bookingAvailabilityPhase5Text(
            bookings[bookingIndex - 1].id || bookings[bookingIndex - 1].bookingId) : afterBookingId);
        stopped = true;
        break;
      }
      summary.bookingsScanned += 1;
      summary.conflictsReviewed += 1;
      try {
        var mutationResult = bookingAvailabilityPhase5WithLock(function () {
          var fresh = bookingAvailabilityPhase5DetectorFreshContext(unit);
          summary.revalidatedRecords += 1;
          if (bookingAvailabilityPhase5DetectorContextFingerprint(initialContext) !==
              bookingAvailabilityPhase5DetectorContextFingerprint(fresh)) {
            summary.sourceChangesRevalidated += 1;
          }
          if (!bookingAvailabilityPhase5DetectorScheduleEligible(fresh.schedule, fresh.nowMinute) ||
              String(fresh.attendance.state).toUpperCase() !== "NOT_STARTED") {
            return { skipped: true, code: "NO_CHECK_IN_RESTRICTION_DISAPPEARED" };
          }
          var currentBookings = fresh.snapshot.bookings.filter(function (booking) {
            return bookingAvailabilityPhase5Text(booking.id || booking.bookingId) === bookingId &&
              !booking.deleted && bookingAvailabilityPhase5Text(booking.branchId) === unit.branchId &&
              bookingAvailabilityPhase5Text(booking.employeeId) === unit.staffId &&
              bookingAvailabilityPhase5Text(booking.date) === fresh.date &&
              ["confirmed", "proposed", "pending"].indexOf(
                String(booking.status).toLowerCase()) !== -1;
          });
          if (currentBookings.length !== 1) {
            return { skipped: true, code: "NO_CHECK_IN_BOOKING_CHANGED" };
          }
          var result = { attendanceDay: {
            staffId: fresh.staff.staffId, branchId: fresh.branch.branchId,
            attendanceDate: fresh.date, state: "ABSENT", status: "ABSENT",
            dayLifecycle: "OPEN", attendanceDayId: fresh.attendance.attendanceDayId,
            sourceEventIds: fresh.attendance.sourceEventIds,
            scheduleSourceIds: fresh.schedule.sourceIds || []
          } };
          var created = bookingAvailabilityPhase5RecordConflicts("attendance", {
            detectorNoCheckIn: true, bookingSnapshot: currentBookings,
            conflictSnapshot: schedulePhase2ReadRows("BOOKING_AVAILABILITY_CONFLICTS"),
            clientRequestId: "NOCHK-" + BookingAvailabilityPhase5.hash({
              branchId: unit.branchId, staffId: unit.staffId, date: fresh.date
            })
          }, result, unit.branchId, fresh.date, actor);
          return { skipped: false, created: created.length };
        });
        if (mutationResult.skipped) summary.skippedRecords += 1;
        else if (mutationResult.created) summary.conflictsCreated += mutationResult.created;
        else summary.conflictsAlreadyExisting += 1;
      } catch (bookingError) {
        summary.failedRecords += 1;
        summary.errorSummaries.push(bookingAvailabilityPhase5DetectorError(
          bookingError, "booking", {
            branchId: unit.branchId, staffId: unit.staffId, bookingId: bookingId
          }));
      }
    }
    if (stopped) break;
  }

  summary.endTime = bookingAvailabilityPhase5Now();
  summary.status = summary.continuationToken || summary.failedRecords ? "PARTIAL" : "COMPLETE";
  var checkpoint = bookingAvailabilityPhase5DetectorCheckpointStorage();
  summary.checkpointWritten = summary.continuationToken
    ? checkpoint.save(summary.continuationToken).written === true : false;
  try {
    var batchAuditId = "BAU-NCD-" + BookingAvailabilityPhase5.hash({
      runId: runId, continuation: data.continuationToken || null
    });
    var priorBatchAudits = schedulePhase2ReadRows("BOOKING_AVAILABILITY_AUDIT")
      .filter(function (item) {
        return bookingAvailabilityPhase5Text(item.auditId) === batchAuditId;
      });
    if (priorBatchAudits.length > 1) throw BookingAvailabilityPhase5.availabilityError(
      "NO_CHECK_IN_BATCH_AUDIT_AMBIGUOUS", "Detector batch audit identity is ambiguous.");
    if (priorBatchAudits.length === 1) {
      summary.batchAuditReused = true;
    } else {
      bookingAvailabilityPhase5AppendAudit({
        auditId: batchAuditId,
        action: summary.status === "COMPLETE" ? "NO_CHECK_IN_DETECTION_BATCH_COMPLETE" :
          "NO_CHECK_IN_DETECTION_BATCH_PARTIAL",
        entityType: "BOOKING_AVAILABILITY_BATCH", entityId: runId,
        actorId: actor.actorId, actorRole: actor.role,
        reasonCode: "NO_CHECK_IN_DETECTOR", afterState: summary,
        requestId: bookingAvailabilityPhase5Text(data.clientRequestId)
      });
    }
  } catch (auditError) {
    summary.status = "PARTIAL";
    summary.failedRecords += 1;
    summary.errorSummaries.push(bookingAvailabilityPhase5DetectorError(
      auditError, "batch-audit", {}));
  }
  summary.evaluatedStaffCount = summary.eligibleNoCheckIns;
  summary.createdConflictCount = summary.conflictsCreated;
  return summary;
}

