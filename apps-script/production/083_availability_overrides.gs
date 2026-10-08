function bookingAvailabilityPhase5CreateOverride(data, actor) {
  if (!bookingAvailabilityPhase5Flags().managerOverrideEnabled) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_FEATURE_DISABLED", "Booking operational overrides are disabled.");
  }
  if (!bookingAvailabilityPhase5HasPermission(actor, "booking_availability.manage_override") ||
      !bookingAvailabilityPhase5HasPermission(actor, "booking_availability.override_internal")) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_PERMISSION_DENIED", "Operational override permission is required.");
  }
  var branchId = bookingAvailabilityPhase5Text(data.branchId);
  var staffId = bookingAvailabilityPhase5Text(data.staffId);
  var date = bookingAvailabilityPhase5Text(data.date);
  var reason = bookingAvailabilityPhase5Text(data.reason);
  var startTime = bookingAvailabilityPhase5Text(data.startTime);
  var endTime = bookingAvailabilityPhase5Text(data.endTime);
  var requestId = bookingAvailabilityPhase5Text(data.clientRequestId);
  if (!branchId || !staffId || !reason || !bookingAvailabilityPhase5ValidDate(date) ||
      bookingAvailabilityPhase5ClockMinutes(startTime) === null ||
      bookingAvailabilityPhase5ClockMinutes(endTime) === null ||
      startTime === endTime || !bookingAvailabilityPhase5ValidRequestId(requestId)) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_OVERRIDE_INVALID",
      "Override branch, staff, valid date/interval, reason, and client request ID are required.");
  }
  bookingAvailabilityPhase5AssertBranchScope(actor, branchId);
  var branch = bookingAvailabilityPhase5Branch(branchId);
  return bookingAvailabilityPhase5WithLock(function () {
    var today = Utilities.formatDate(
      new Date(), branch.timeZone || BookingAvailabilityPhase5.TIME_ZONE, "yyyy-MM-dd");
    if (date !== today) {
      throw BookingAvailabilityPhase5.availabilityError(
        "AVAILABILITY_OVERRIDE_DATE_INVALID",
        "Operational overrides are allowed only for the current Cairo operational date.");
    }
    var staffMatches = schedulePhase2ReadStaff().filter(function (item) {
      return bookingAvailabilityPhase5Text(item.staffId) === staffId;
    });
    var bookingEligible = typeof publicBookingBarbers !== "function" ||
      publicBookingBarbers().some(function (item) {
        return bookingAvailabilityPhase5Text(item.staffId) === staffId;
      });
    if (staffMatches.length !== 1 || !staffMatches[0].active || !bookingEligible ||
        bookingAvailabilityPhase5Text(staffMatches[0].branchId) !== branchId) {
      throw BookingAvailabilityPhase5.availabilityError(
        "AVAILABILITY_OVERRIDE_STAFF_INVALID",
        "Override staff must be active, Booking-eligible, and assigned to the selected branch.");
    }
    var schedule = attendancePhase3ResolveSchedule(staffMatches[0], date);
    var segments = schedule.shiftSegments || [];
    var start = bookingAvailabilityPhase5ClockMinutes(startTime);
    var end = bookingAvailabilityPhase5ClockMinutes(endTime);
    var intervalFits = segments.some(function (segment) {
      var shiftStart = bookingAvailabilityPhase5ClockMinutes(segment.shiftStart);
      var shiftEnd = bookingAvailabilityPhase5ClockMinutes(segment.shiftEnd);
      if (shiftStart === null || shiftEnd === null) return false;
      if (shiftEnd <= shiftStart) shiftEnd += 1440;
      var candidateStart = start < shiftStart ? start + 1440 : start;
      var candidateEnd = end <= candidateStart ? end + 1440 : end;
      return candidateStart >= shiftStart && candidateEnd <= shiftEnd;
    });
    if (!schedule.active || !segments.length || !intervalFits) {
      throw BookingAvailabilityPhase5.availabilityError(
        "AVAILABILITY_OVERRIDE_OUTSIDE_PLANNED_SHIFT",
        "Operational overrides cannot create capacity outside an authorized Phase 2 shift.");
    }
    bookingAvailabilityPhase5RequireSheet("BOOKING_OPERATIONAL_OVERRIDES");
    var existing = schedulePhase2ReadRows("BOOKING_OPERATIONAL_OVERRIDES");
    var replay = existing.filter(function (item) {
      return bookingAvailabilityPhase5Text(item.lastRequestId) === requestId;
    });
    if (replay.length > 1) {
      throw BookingAvailabilityPhase5.availabilityError(
        "AVAILABILITY_OVERRIDE_IDEMPOTENCY_AMBIGUOUS",
        "Operational override request identity is ambiguous.");
    }
    if (replay.length === 1) {
      var same = replay[0];
      if (bookingAvailabilityPhase5Text(same.branchId) === branchId &&
          bookingAvailabilityPhase5Text(same.staffId) === staffId &&
          bookingAvailabilityPhase5Text(same.date) === date &&
          bookingAvailabilityPhase5Text(same.startTime) === startTime &&
          bookingAvailabilityPhase5Text(same.endTime) === endTime &&
          bookingAvailabilityPhase5Text(same.reason) === reason) return same;
      throw BookingAvailabilityPhase5.availabilityError(
        "AVAILABILITY_OVERRIDE_IDEMPOTENCY_REUSED",
        "Operational override request ID was reused with a different payload.");
    }
    var overlap = existing.some(function (item) {
      if (String(item.status).toUpperCase() !== "ACTIVE" ||
          bookingAvailabilityPhase5Text(item.branchId) !== branchId ||
          bookingAvailabilityPhase5Text(item.staffId) !== staffId ||
          bookingAvailabilityPhase5Text(item.date) !== date) return false;
      var otherStart = bookingAvailabilityPhase5ClockMinutes(item.startTime);
      var otherEnd = bookingAvailabilityPhase5ClockMinutes(item.endTime);
      if (otherStart === null || otherEnd === null) return true;
      if (otherEnd <= otherStart) otherEnd += 1440;
      var candidateStart = start < otherStart && otherStart >= 720 ? start + 1440 : start;
      var candidateEnd = end <= candidateStart ? end + 1440 : end;
      return candidateStart < otherEnd && candidateEnd > otherStart;
    });
    if (overlap) {
      throw BookingAvailabilityPhase5.availabilityError(
        "AVAILABILITY_OVERRIDE_OVERLAP",
        "An active operational override already overlaps this interval.");
    }
    var attendance = bookingAvailabilityPhase5Attendance(staffMatches[0], date);
    var record = {
      operationalOverrideId: "BOV-" + Utilities.getUuid(),
      branchId: branchId, staffId: staffId, date: date,
      startTime: startTime, endTime: endTime, status: "ACTIVE",
      reason: reason, sourceAttendanceDayId: attendance.attendanceDayId,
      sourceEventIds: attendance.sourceEventIds,
      createdAt: bookingAvailabilityPhase5Now(), createdBy: actor.actorId,
      revokedAt: "", revokedBy: "", revocationReason: "",
      lastRequestId: requestId
    };
    return bookingAvailabilityPhase5RunTransaction({
      data: data, requestId: requestId, action: "OPERATIONAL_OVERRIDE_CREATE",
      entityType: "BOOKING_OPERATIONAL_OVERRIDE", entityId: record.operationalOverrideId,
      branchId: branchId, date: date, actor: actor, beforeState: {},
      business: function () {
        schedulePhase2Save(
          "BOOKING_OPERATIONAL_OVERRIDES",
          BookingAvailabilityPhase5.SHEET_SCHEMAS.BOOKING_OPERATIONAL_OVERRIDES,
          "OPERATIONAL_OVERRIDE_ID", record
        );
        return record;
      },
      version: function () {
        return bookingAvailabilityPhase5IncrementVersion(
          "operationalOverride", branchId, date, actor);
      },
      audit: function () {
        return bookingAvailabilityPhase5AppendAudit({
          action: "OPERATIONAL_OVERRIDE_CREATED", entityType: "BOOKING_OPERATIONAL_OVERRIDE",
          entityId: record.operationalOverrideId, branchId: branchId, staffId: staffId,
          date: date, actorId: actor.actorId, actorRole: actor.role,
          reasonCode: "MANAGER_OPERATIONAL_OVERRIDE", sourceIds: record.sourceEventIds,
          afterState: { status: "ACTIVE", startTime: record.startTime, endTime: record.endTime },
          requestId: record.lastRequestId
        });
      },
      compensateBusiness: function () {
        record.status = "REVOKED";
        record.revokedAt = bookingAvailabilityPhase5Now();
        record.revokedBy = "transaction-compensation";
        record.revocationReason = "COMPENSATED_UNCOMMITTED_OVERRIDE";
        schedulePhase2Save(
          "BOOKING_OPERATIONAL_OVERRIDES",
          BookingAvailabilityPhase5.SHEET_SCHEMAS.BOOKING_OPERATIONAL_OVERRIDES,
          "OPERATIONAL_OVERRIDE_ID", record
        );
      }
    });
  });
}

function bookingAvailabilityPhase5RevokeOverride(data, actor) {
  if (!bookingAvailabilityPhase5Flags().managerOverrideEnabled) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_FEATURE_DISABLED", "Booking operational overrides are disabled.");
  }
  if (!bookingAvailabilityPhase5HasPermission(actor, "booking_availability.manage_override")) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_PERMISSION_DENIED", "Operational override permission is required.");
  }
  var overrideId = bookingAvailabilityPhase5Text(data.operationalOverrideId);
  var reason = bookingAvailabilityPhase5Text(data.reason);
  var requestId = bookingAvailabilityPhase5Text(data.clientRequestId);
  if (!overrideId || !reason || !bookingAvailabilityPhase5ValidRequestId(requestId)) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_OVERRIDE_INVALID",
      "Override id, revocation reason, and client request ID are required.");
  }
  return bookingAvailabilityPhase5WithLock(function () {
    var rows = schedulePhase2ReadRows("BOOKING_OPERATIONAL_OVERRIDES").filter(function (item) {
      return bookingAvailabilityPhase5Text(item.operationalOverrideId) === overrideId;
    });
    if (rows.length !== 1) {
      throw BookingAvailabilityPhase5.availabilityError(
        rows.length ? "AVAILABILITY_OVERRIDE_AMBIGUOUS" : "AVAILABILITY_OVERRIDE_NOT_FOUND",
        "Booking operational override was not found uniquely.");
    }
    var current = rows[0];
    bookingAvailabilityPhase5AssertBranchScope(actor, current.branchId);
    if (String(current.status).toUpperCase() === "REVOKED" &&
        bookingAvailabilityPhase5Text(current.lastRequestId) === requestId) return current;
    if (String(current.status).toUpperCase() !== "ACTIVE") {
      throw BookingAvailabilityPhase5.availabilityError(
        "AVAILABILITY_OVERRIDE_NOT_ACTIVE", "Only an active override can be revoked.");
    }
    var before = {
      status: current.status, startTime: current.startTime, endTime: current.endTime
    };
    var original = JSON.parse(JSON.stringify(current));
    return bookingAvailabilityPhase5RunTransaction({
      data: data, requestId: requestId, action: "OPERATIONAL_OVERRIDE_REVOKE",
      entityType: "BOOKING_OPERATIONAL_OVERRIDE", entityId: current.operationalOverrideId,
      branchId: current.branchId, date: current.date, actor: actor, beforeState: original,
      business: function () {
        current.status = "REVOKED";
        current.revokedAt = bookingAvailabilityPhase5Now();
        current.revokedBy = actor.actorId;
        current.revocationReason = reason;
        current.lastRequestId = requestId;
        schedulePhase2Save(
          "BOOKING_OPERATIONAL_OVERRIDES",
          BookingAvailabilityPhase5.SHEET_SCHEMAS.BOOKING_OPERATIONAL_OVERRIDES,
          "OPERATIONAL_OVERRIDE_ID", current
        );
        return current;
      },
      version: function () {
        return bookingAvailabilityPhase5IncrementVersion(
          "operationalOverride", current.branchId, current.date, actor);
      },
      audit: function () {
        return bookingAvailabilityPhase5AppendAudit({
          action: "OPERATIONAL_OVERRIDE_REVOKED", entityType: "BOOKING_OPERATIONAL_OVERRIDE",
          entityId: current.operationalOverrideId, branchId: current.branchId,
          staffId: current.staffId, date: current.date,
          actorId: actor.actorId, actorRole: actor.role,
          reasonCode: "MANAGER_OPERATIONAL_OVERRIDE_REVOKED",
          sourceIds: current.sourceEventIds || [], beforeState: before,
          afterState: { status: "REVOKED" }, requestId: current.lastRequestId
        });
      },
      compensateBusiness: function () {
        schedulePhase2Save(
          "BOOKING_OPERATIONAL_OVERRIDES",
          BookingAvailabilityPhase5.SHEET_SCHEMAS.BOOKING_OPERATIONAL_OVERRIDES,
          "OPERATIONAL_OVERRIDE_ID", original
        );
      }
    });
  });
}

