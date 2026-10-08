function bookingAvailabilityPhase5RevalidateConflict(conflict, actor) {
  bookingAvailabilityPhase5AssertBranchScope(actor, conflict.branchId);
  var matches = getAllBookingsV2().filter(function (booking) {
    return bookingAvailabilityPhase5Text(booking.id || booking.bookingId) ===
      bookingAvailabilityPhase5Text(conflict.bookingId);
  });
  if (matches.length !== 1) throw BookingAvailabilityPhase5.availabilityError(
    matches.length ? "AVAILABILITY_CONFLICT_BOOKING_AMBIGUOUS" :
      "AVAILABILITY_CONFLICT_BOOKING_GONE",
    "The conflict Booking no longer exists uniquely.");
  var booking = matches[0];
  if (["OPEN", "ACKNOWLEDGED"].indexOf(String(conflict.status).toUpperCase()) === -1) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_CONFLICT_ALREADY_FINAL", "The conflict already has a final disposition.");
  }
  if (booking.deleted || ["cancelled", "rejected", "done", "completed", "expired"].indexOf(
      String(booking.status || "").toLowerCase()) !== -1) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_CONFLICT_BOOKING_INACTIVE", "The conflict Booking is no longer active.");
  }
  if (bookingAvailabilityPhase5Text(booking.branchId) !==
        bookingAvailabilityPhase5Text(conflict.branchId) ||
      bookingAvailabilityPhase5Text(booking.employeeId) !==
        bookingAvailabilityPhase5Text(conflict.staffId)) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_CONFLICT_STAFF_CHANGED", "The Booking branch or staff changed.");
  }
  var proposed = String(booking.status).toUpperCase() === "PROPOSED" &&
    booking.proposedDate && booking.proposedTime;
  var effectiveDate = proposed ? booking.proposedDate : booking.date;
  var effectiveTime = proposed ? booking.proposedTime : booking.time;
  if (bookingAvailabilityPhase5Text(effectiveDate) !==
        bookingAvailabilityPhase5Text(conflict.date) ||
      bookingAvailabilityPhase5Text(effectiveTime) !==
        bookingAvailabilityPhase5Text(conflict.slotStart)) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_CONFLICT_RESCHEDULED", "The Booking was rescheduled.");
  }
  var staff = schedulePhase2ReadStaff().filter(function (item) {
    return bookingAvailabilityPhase5Text(item.staffId) ===
      bookingAvailabilityPhase5Text(conflict.staffId);
  });
  if (staff.length !== 1) throw BookingAvailabilityPhase5.availabilityError(
    "AVAILABILITY_CONFLICT_SOURCE_CHANGED", "Conflict staff evidence changed.");
  var code = String(conflict.conflictCode).toUpperCase();
  if (["NO_CHECK_IN_CONFLICT", "STAFF_ABSENT_WITH_FUTURE_BOOKINGS",
      "OPEN_BREAK_CONFLICT", "EARLY_CHECKOUT_CONFLICT",
      "UNRESOLVED_ATTENDANCE_CONFLICT"].indexOf(code) !== -1) {
    var attendance = bookingAvailabilityPhase5Attendance(staff[0], conflict.date);
    var state = String(attendance.state).toUpperCase();
    var lifecycle = String(attendance.dayLifecycle).toUpperCase();
    var restrictionExists = (code === "NO_CHECK_IN_CONFLICT" && state === "NOT_STARTED") ||
      (code === "STAFF_ABSENT_WITH_FUTURE_BOOKINGS" && state === "ABSENT") ||
      (code === "OPEN_BREAK_CONFLICT" && state === "ON_BREAK" && attendance.openBreak) ||
      (code === "EARLY_CHECKOUT_CONFLICT" && state === "CHECKED_OUT") ||
      (code === "UNRESOLVED_ATTENDANCE_CONFLICT" &&
        (state === "UNRESOLVED" || lifecycle === "REOPENED" || attendance.staleCalculation));
    if (!restrictionExists) {
      throw BookingAvailabilityPhase5.availabilityError(
        "AVAILABILITY_CONFLICT_RESTRICTION_DISAPPEARED",
        "The underlying Attendance restriction no longer exists.");
    }
    if (bookingAvailabilityPhase5Text(attendance.attendanceDayId) !==
          bookingAvailabilityPhase5Text(conflict.attendanceDayId) ||
        BookingAvailabilityPhase5.stable(attendance.sourceEventIds || []) !==
          BookingAvailabilityPhase5.stable(conflict.attendanceEventIds || [])) {
      throw BookingAvailabilityPhase5.availabilityError(
        "AVAILABILITY_CONFLICT_SOURCE_CHANGED", "Attendance evidence changed.");
    }
  } else if (["SCHEDULE_OVERRIDE_CONFLICT", "BRANCH_CLOSURE_CONFLICT"].indexOf(code) !== -1) {
    var snapshot = bookingAvailabilityPhase5RequestSnapshot();
    var schedule = bookingAvailabilityPhase5ResolveSchedule(staff[0], conflict.date, snapshot);
    var sourceIds = schedule.sourceIds || schedule.scheduleSourceIds || [];
    if (code === "BRANCH_CLOSURE_CONFLICT") {
      var branch = bookingAvailabilityPhase5Branch(
        conflict.branchId, { allowClosed: true }, snapshot.branches);
      if (String(branch.closureStatus || "OPEN").toUpperCase() !== "CLOSED" &&
          ["BRANCH_CLOSED", "CLOSED"].indexOf(String(schedule.classification).toUpperCase()) === -1) {
        throw BookingAvailabilityPhase5.availabilityError(
          "AVAILABILITY_CONFLICT_RESTRICTION_DISAPPEARED",
          "The branch closure restriction no longer exists.");
      }
    } else if (!["DAY_OFF", "WEEKLY_DAY_OFF", "APPROVED_LEAVE", "UNPAID_LEAVE",
        "SICK_LEAVE", "ABSENT", "NOT_SCHEDULED", "INACTIVE_STAFF"].some(function (value) {
          return value === String(schedule.classification).toUpperCase();
        })) {
      throw BookingAvailabilityPhase5.availabilityError(
        "AVAILABILITY_CONFLICT_RESTRICTION_DISAPPEARED",
        "The schedule restriction no longer exists.");
    }
    if (BookingAvailabilityPhase5.stable(sourceIds) !==
        BookingAvailabilityPhase5.stable(conflict.scheduleSourceIds || [])) {
      throw BookingAvailabilityPhase5.availabilityError(
        "AVAILABILITY_CONFLICT_SOURCE_CHANGED", "Schedule evidence changed.");
    }
  }
  return booking;
}

function bookingAvailabilityPhase5TransitionConflict(data, actor) {
  if (!bookingAvailabilityPhase5Flags().conflictResolutionEnabled) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_FEATURE_DISABLED", "Booking conflict resolution is disabled.");
  }
  if (!bookingAvailabilityPhase5HasPermission(actor, "booking_availability.resolve_conflict")) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_PERMISSION_DENIED", "Conflict resolution permission is required.");
  }
  var requestId = bookingAvailabilityPhase5Text(data.clientRequestId);
  if (!bookingAvailabilityPhase5ValidRequestId(requestId)) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_CONFLICT_REQUEST_INVALID",
      "Conflict transitions require a valid client request ID.");
  }
  return bookingAvailabilityPhase5WithLock(function () {
    var rows = schedulePhase2ReadRows("BOOKING_AVAILABILITY_CONFLICTS").filter(function (item) {
      return bookingAvailabilityPhase5Text(item.conflictId) ===
        bookingAvailabilityPhase5Text(data.conflictId);
    });
    if (rows.length !== 1) {
      throw BookingAvailabilityPhase5.availabilityError(
        rows.length ? "AVAILABILITY_CONFLICT_AMBIGUOUS" : "AVAILABILITY_CONFLICT_NOT_FOUND",
        "Booking Availability conflict was not found uniquely.");
    }
    var current = rows[0];
    bookingAvailabilityPhase5AssertBranchScope(actor, current.branchId);
    var next = String(data.status || "").toUpperCase();
    var reason = bookingAvailabilityPhase5Text(data.reason);
    if (String(current.status).toUpperCase() === next &&
        bookingAvailabilityPhase5Text(current.lastRequestId) === requestId) return current;
    BookingAvailabilityPhase5.assertConflictTransition(current.status, next, reason);
    if (["RESOLVED", "DISMISSED_WITH_REASON"].indexOf(next) !== -1) {
      if (!current.acknowledgedBy || bookingAvailabilityPhase5Text(current.acknowledgedBy) ===
          bookingAvailabilityPhase5Text(actor.actorId)) {
        throw BookingAvailabilityPhase5.availabilityError(
          "AVAILABILITY_FOUR_EYES_REQUIRED",
          "A different authorized actor must acknowledge before final disposition.");
      }
      bookingAvailabilityPhase5RevalidateConflict(current, actor);
    }
    var original = JSON.parse(JSON.stringify(current));
    var before = { status: current.status };
    var now = bookingAvailabilityPhase5Now();
    if (next === "ACKNOWLEDGED") {
      current.acknowledgedAt = now; current.acknowledgedBy = actor.actorId;
    } else if (next === "RESOLVED") {
      current.resolvedAt = now; current.resolvedBy = actor.actorId;
      current.resolutionReason = reason;
    } else {
      current.dismissedAt = now; current.dismissedBy = actor.actorId;
      current.dismissalReason = reason;
    }
    return bookingAvailabilityPhase5RunTransaction({
      data: data, requestId: requestId, action: "CONFLICT_" + next,
      entityType: "BOOKING_AVAILABILITY_CONFLICT", entityId: current.conflictId,
      branchId: current.branchId, date: current.date, actor: actor, beforeState: original,
      business: function () {
        current.status = next;
        current.lastRequestId = requestId;
        schedulePhase2Save(
          "BOOKING_AVAILABILITY_CONFLICTS",
          BookingAvailabilityPhase5.SHEET_SCHEMAS.BOOKING_AVAILABILITY_CONFLICTS,
          "CONFLICT_ID", current
        );
        return current;
      },
      version: function () {
        return bookingAvailabilityPhase5IncrementVersion(
          "attendance", current.branchId, current.date, actor);
      },
      audit: function () {
        return bookingAvailabilityPhase5AppendAudit({
          action: "AVAILABILITY_CONFLICT_" + next, entityType: "BOOKING_AVAILABILITY_CONFLICT",
          entityId: current.conflictId, branchId: current.branchId, staffId: current.staffId,
          date: current.date, actorId: actor.actorId, actorRole: actor.role,
          reasonCode: current.conflictCode, beforeState: before, afterState: { status: next },
          requestId: current.lastRequestId
        });
      },
      compensateBusiness: function () {
        schedulePhase2Save(
          "BOOKING_AVAILABILITY_CONFLICTS",
          BookingAvailabilityPhase5.SHEET_SCHEMAS.BOOKING_AVAILABILITY_CONFLICTS,
          "CONFLICT_ID", original
        );
      }
    });
  });
}

