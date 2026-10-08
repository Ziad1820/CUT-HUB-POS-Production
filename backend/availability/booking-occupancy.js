function bookingAvailabilityPhase5StaffNameKey(value) {
  if (typeof normalizeLookupKey === "function") return normalizeLookupKey(value);
  return bookingAvailabilityPhase5Text(value).toLowerCase().replace(/\s+/g, " ");
}

function bookingAvailabilityPhase5BookingScopeError() {
  return BookingAvailabilityPhase5.availabilityError(
    "AVAILABILITY_BOOKING_SCOPE_UNRESOLVED",
    "A legacy Booking row cannot be resolved to a unique staff and branch scope."
  );
}

function bookingAvailabilityPhase5BookingOccupiedDate(booking) {
  var status = String((booking && booking.status) || "").toUpperCase();
  var proposed = status === "PROPOSED" &&
    bookingAvailabilityPhase5Text(booking && booking.proposedDate) &&
    bookingAvailabilityPhase5Text(booking && booking.proposedTime);
  return bookingAvailabilityPhase5Text(
    proposed ? booking.proposedDate : (booking && booking.date)
  );
}

function bookingAvailabilityPhase5ScopedBookings(bookings, staff, branchId, date, snapshot, serverNowMs) {
  var rows = snapshot && Array.isArray(snapshot.staff) ? snapshot.staff : [];
  var targetStaffId = bookingAvailabilityPhase5Text(staff && staff.staffId);
  var targetBranchId = bookingAvailabilityPhase5Text(branchId);
  var targetDate = bookingAvailabilityPhase5Text(date);
  var trustedNowMs = Number(serverNowMs);

  return (bookings || []).map(function (booking) {
    var copy = Object.assign({}, booking);

    if (!BookingAvailabilityPhase5.bookingBlocks(
      copy, Number.isFinite(trustedNowMs) ? trustedNowMs : Date.now()
    )) return null;

    var occupiedDate = bookingAvailabilityPhase5BookingOccupiedDate(copy);
    if (occupiedDate && occupiedDate !== targetDate) return null;

    var bookingBranchId = bookingAvailabilityPhase5Text(copy.branchId);
    if (bookingBranchId && bookingBranchId !== targetBranchId) return null;

    var employeeId = bookingAvailabilityPhase5Text(copy.employeeId || copy.staffId);
    if (employeeId && employeeId !== targetStaffId) return null;

    if (!occupiedDate) throw bookingAvailabilityPhase5BookingScopeError();

    if (!employeeId) {
      var nameKey = bookingAvailabilityPhase5StaffNameKey(
        copy.employee || copy.staffName || copy.barber
      );
      if (!nameKey) throw bookingAvailabilityPhase5BookingScopeError();

      var matches = rows.filter(function (item) {
        return item.active !== false &&
          bookingAvailabilityPhase5Text(item.branchId) === targetBranchId &&
          bookingAvailabilityPhase5StaffNameKey(item.staffName) === nameKey;
      });
      if (matches.length !== 1) throw bookingAvailabilityPhase5BookingScopeError();

      employeeId = bookingAvailabilityPhase5Text(matches[0].staffId);
      bookingBranchId = bookingBranchId ||
        bookingAvailabilityPhase5Text(matches[0].branchId);
    }

    if (employeeId !== targetStaffId) return null;

    if (!bookingBranchId) bookingBranchId = targetBranchId;
    if (!bookingBranchId || bookingBranchId !== targetBranchId) {
      throw bookingAvailabilityPhase5BookingScopeError();
    }

    copy.employeeId = employeeId;
    copy.branchId = bookingBranchId;
    return copy;
  }).filter(Boolean);
}

function bookingAvailabilityPhase5BookingBuffers(bookings) {
  return (bookings || []).map(function (booking) {
    var copy = Object.assign({}, booking);
    /* Compatibility rule: legacy rows without immutable snapshot columns keep
       their recorded duration and use zero buffers. Reads never infer history
       from the current SERVICES sheet and never rewrite the Booking row. */
    copy.serviceDurationSnapshot = Number(copy.serviceDurationSnapshot) ||
      Number(copy.durationMinutes) || 30;
    copy.preparationMinutesSnapshot = Number(copy.preparationMinutesSnapshot) || 0;
    copy.cleanupMinutesSnapshot = Number(copy.cleanupMinutesSnapshot) || 0;
    return copy;
  });
}

