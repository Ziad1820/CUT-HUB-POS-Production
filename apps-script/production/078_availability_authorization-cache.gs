function bookingAvailabilityPhase5Actor(data, optional) {
  var actor = schedulePhase2Actor(data || {});
  if (!actor && !optional) {
    var error = new Error("Authenticated Booking Availability actor is required.");
    error.code = "AVAILABILITY_AUTH_REQUIRED";
    throw error;
  }
  return actor;
}

function bookingAvailabilityPhase5HasPermission(actor, permission) {
  return !!actor && (actor.owner || (actor.permissions || []).indexOf(permission) !== -1);
}

function bookingAvailabilityPhase5AssertBranchScope(actor, branchId) {
  if (!actor || actor.owner) return;
  if ((actor.branchIds || []).indexOf(branchId) === -1) {
    var error = new Error("Booking Availability branch is outside the actor scope.");
    error.code = "AVAILABILITY_BRANCH_SCOPE_DENIED";
    throw error;
  }
}

function bookingAvailabilityPhase5ActiveOverrides(staffId, branchId, date, audience, actor, flags, prefetchedRows) {
  if (audience !== "internal" || !flags.managerOverrideEnabled || !actor ||
      !bookingAvailabilityPhase5HasPermission(actor, "booking_availability.override_internal")) return [];
  bookingAvailabilityPhase5RequireSheet("BOOKING_OPERATIONAL_OVERRIDES");
  return (prefetchedRows || schedulePhase2ReadRows("BOOKING_OPERATIONAL_OVERRIDES")).filter(function (item) {
    return String(item.status).toUpperCase() === "ACTIVE" &&
      bookingAvailabilityPhase5Text(item.staffId) === staffId &&
      bookingAvailabilityPhase5Text(item.branchId) === branchId &&
      bookingAvailabilityPhase5Text(item.date) === date;
  }).sort(function (left, right) {
    return bookingAvailabilityPhase5Text(left.operationalOverrideId)
      .localeCompare(bookingAvailabilityPhase5Text(right.operationalOverrideId));
  });
}

function bookingAvailabilityPhase5CacheKey(input) {
  return "BA5:" + BookingAvailabilityPhase5.hash({
    environment: input.environment, spreadsheetHash: input.spreadsheetHash,
    branchId: input.branchId, date: input.date, audience: input.audience,
    staffId: input.staff.staffId, serviceSetHash: input.serviceSetHash,
    durationMinutes: input.durationMinutes, preparationMinutes: input.preparationMinutes,
    cleanupMinutes: input.cleanupMinutes, versions: input.versions,
    generations: input.generations,
    attendanceLiveEnabled: input.attendanceLiveEnabled
  });
}

function bookingAvailabilityPhase5CachedResult(value, input) {
  try {
    var parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.slots) ||
        bookingAvailabilityPhase5Text(parsed.staffId) !==
          bookingAvailabilityPhase5Text(input.staff.staffId) ||
        bookingAvailabilityPhase5Text(parsed.branchId) !==
          bookingAvailabilityPhase5Text(input.branchId) ||
        bookingAvailabilityPhase5Text(parsed.date) !== bookingAvailabilityPhase5Text(input.date) ||
        bookingAvailabilityPhase5Text(parsed.audience) !== bookingAvailabilityPhase5Text(input.audience) ||
        BookingAvailabilityPhase5.stable(parsed.generations || {}) !==
          BookingAvailabilityPhase5.stable(input.generations || {}) ||
        !bookingAvailabilityPhase5Text(parsed.availabilityToken)) return null;
    return parsed;
  } catch (_error) {
    return null;
  }
}

