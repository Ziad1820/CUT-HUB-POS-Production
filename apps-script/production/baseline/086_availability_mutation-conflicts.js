function bookingAvailabilityPhase5RecordConflicts(kind, data, result, branchId, date, actor) {
  var day = result && (result.attendanceDay || result.day);
  var scheduleMutation = result && (result.override || result.scheduleOverride || result.record);
  var state = String((day && (day.state || day.status)) || "").toUpperCase();
  var lifecycle = String((day && day.dayLifecycle) || "").toUpperCase();
  var conflictCode = "";
  if (kind === "attendance") {
    if (data && data.detectorNoCheckIn) conflictCode = "NO_CHECK_IN_CONFLICT";
    else if (state === "ABSENT") conflictCode = "STAFF_ABSENT_WITH_FUTURE_BOOKINGS";
    else if (state === "ON_BREAK" && day && day.openBreak) conflictCode = "OPEN_BREAK_CONFLICT";
    else if (state === "CHECKED_OUT" && Number(day && day.earlyLeaveMinutesRaw) > 0) {
      conflictCode = "EARLY_CHECKOUT_CONFLICT";
    } else if (state === "UNRESOLVED" || lifecycle === "REOPENED") {
      conflictCode = "UNRESOLVED_ATTENDANCE_CONFLICT";
    }
  } else if (kind === "schedule") {
    conflictCode = String((scheduleMutation && scheduleMutation.type) || data.type || "").toUpperCase() === "BRANCH_CLOSED"
      ? "BRANCH_CLOSURE_CONFLICT" : "SCHEDULE_OVERRIDE_CONFLICT";
  }
  if (!conflictCode) return [];
  var staffId = bookingAvailabilityPhase5Text(
    (day && day.staffId) || (scheduleMutation && scheduleMutation.staffId) ||
    data.staffId || data.employeeId);
  var branchWide = conflictCode === "BRANCH_CLOSURE_CONFLICT";
  if (!staffId && !branchWide) return [];
  var existingConflicts = data && data.conflictSnapshot ||
    schedulePhase2ReadRows("BOOKING_AVAILABILITY_CONFLICTS");
  var now = bookingAvailabilityPhase5Now();
  var created = [];
  ((data && data.bookingSnapshot) || getAllBookingsV2()).filter(function (booking) {
    var subjectMatches = branchWide
      ? bookingAvailabilityPhase5Text(booking.branchId) === branchId
      : bookingAvailabilityPhase5Text(booking.employeeId) === staffId;
    return !booking.deleted && subjectMatches &&
      bookingAvailabilityPhase5Text(booking.date) === date &&
      ["confirmed", "proposed", "pending"].indexOf(String(booking.status).toLowerCase()) !== -1;
  }).forEach(function (booking) {
    var evidenceScheduleIds = (day && day.scheduleSourceIds) ||
      (scheduleMutation && [scheduleMutation.overrideId || scheduleMutation.scheduleId].filter(Boolean)) || [];
    var evidenceAttendanceDayId = (day && day.attendanceDayId) || "";
    var evidenceEventIds = (day && day.sourceEventIds) || [];
    var duplicate = existingConflicts.some(function (item) {
      var sameSubject = bookingAvailabilityPhase5Text(item.bookingId) ===
          bookingAvailabilityPhase5Text(booking.id) &&
        String(item.conflictCode).toUpperCase() === conflictCode;
      if (!sameSubject) return false;
      var sameEvidence = BookingAvailabilityPhase5.stable(item.scheduleSourceIds || []) ===
          BookingAvailabilityPhase5.stable(evidenceScheduleIds) &&
        bookingAvailabilityPhase5Text(item.attendanceDayId) ===
          bookingAvailabilityPhase5Text(evidenceAttendanceDayId) &&
        BookingAvailabilityPhase5.stable(item.attendanceEventIds || []) ===
          BookingAvailabilityPhase5.stable(evidenceEventIds);
      return sameEvidence || ["OPEN", "ACKNOWLEDGED"]
        .indexOf(String(item.status).toUpperCase()) !== -1;
    });
    if (duplicate) return;
    var record = {
      conflictId: "BCF-" + Utilities.getUuid(), conflictCode: conflictCode,
      bookingId: booking.id, branchId: branchId,
      staffId: bookingAvailabilityPhase5Text(booking.employeeId) || staffId, date: date,
      slotStart: String(booking.status).toUpperCase() === "PROPOSED" && booking.proposedTime
        ? booking.proposedTime : booking.time,
      slotEnd: bookingAvailabilityPhase5AddMinutes(
        String(booking.status).toUpperCase() === "PROPOSED" && booking.proposedTime
          ? booking.proposedTime : booking.time, Number(booking.durationMinutes) || 30),
      status: "OPEN",
      scheduleSourceIds: evidenceScheduleIds,
      attendanceDayId: evidenceAttendanceDayId,
      attendanceEventIds: evidenceEventIds,
      detectedAt: now, detectedBy: actor ? actor.actorId : "system",
      acknowledgedAt: "", acknowledgedBy: "", resolvedAt: "", resolvedBy: "",
      resolutionReason: "", dismissedAt: "", dismissedBy: "", dismissalReason: "",
      lastRequestId: data.clientRequestId || data.requestId || ""
    };
    // One detector/mutation can surface several protected Bookings. Each
    // conflict therefore needs its own deterministic transaction identity.
    var transactionRequestId = "CONFLICT-" + BookingAvailabilityPhase5.hash({
      requestId: record.lastRequestId, bookingId: booking.id,
      conflictCode: conflictCode,
      source: record.scheduleSourceIds.concat(record.attendanceEventIds)
    });
    var committed = bookingAvailabilityPhase5RunTransaction({
      data: data, requestId: transactionRequestId,
      action: "CONFLICT_CREATE_" + conflictCode,
      entityType: "BOOKING_AVAILABILITY_CONFLICT", entityId: record.conflictId,
      branchId: branchId, date: date, actor: actor, beforeState: {},
      business: function () {
        schedulePhase2Save(
          "BOOKING_AVAILABILITY_CONFLICTS",
          BookingAvailabilityPhase5.SHEET_SCHEMAS.BOOKING_AVAILABILITY_CONFLICTS,
          "CONFLICT_ID", record
        );
        return record;
      },
      version: function () {
        return bookingAvailabilityPhase5IncrementVersion(
          "attendance", branchId, date, actor);
      },
      audit: function () {
        return bookingAvailabilityPhase5AppendAudit({
          action: "EXISTING_BOOKING_CONFLICT_DETECTED",
          entityType: "BOOKING_AVAILABILITY_CONFLICT", entityId: record.conflictId,
          branchId: branchId, staffId: staffId, date: date,
          actorId: actor ? actor.actorId : "system", actorRole: actor ? actor.role : "SYSTEM",
          reasonCode: conflictCode,
          sourceIds: record.scheduleSourceIds.concat(record.attendanceEventIds),
          afterState: { status: "OPEN", bookingId: booking.id },
          requestId: transactionRequestId
        });
      },
      compensateBusiness: function () {
        record.status = "DISMISSED_WITH_REASON";
        record.dismissedAt = bookingAvailabilityPhase5Now();
        record.dismissedBy = "transaction-compensation";
        record.dismissalReason = "COMPENSATED_UNCOMMITTED_CONFLICT";
        schedulePhase2Save(
          "BOOKING_AVAILABILITY_CONFLICTS",
          BookingAvailabilityPhase5.SHEET_SCHEMAS.BOOKING_AVAILABILITY_CONFLICTS,
          "CONFLICT_ID", record
        );
      }
    });
    created.push(committed);
    existingConflicts.push(record);
  });
  return created;
}

function bookingAvailabilityPhase5AfterBookingMutationUnderLock(data, booking) {
  var flags = bookingAvailabilityPhase5Flags();
  if (flags.engine === "LEGACY") return;
  var branchId = bookingAvailabilityPhase5Text(booking && booking.branchId);
  var date = bookingAvailabilityPhase5Text(booking && booking.date);
  if (!branchId || !date) return;
  var actor = bookingAvailabilityPhase5Actor(data, true);
  bookingAvailabilityPhase5IncrementVersion("booking", branchId, date, actor);
}

function bookingAvailabilityPhase5AfterGlobalServiceMutationUnderLock(data) {
  var flags = bookingAvailabilityPhase5Flags();
  if (flags.engine === "LEGACY") return;
  var actor = bookingAvailabilityPhase5Actor(data, true);
  bookingAvailabilityPhase5IncrementGeneration(
    "service", "GLOBAL", "GLOBAL", actor,
    bookingAvailabilityPhase5Text(data && (data.clientRequestId || data.requestId)));
}

