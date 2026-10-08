function bookingAvailabilityPhase5Evaluate(options) {
  var data = options || {};
  var identity = bookingAvailabilityPhase5AssertIdentity();
  var flags = bookingAvailabilityPhase5Flags();
  if (!flags.plannedEnabled) {
    var disabled = new Error("Phase 2 planned Booking Availability is disabled.");
    disabled.code = "AVAILABILITY_PHASE2_DISABLED";
    throw disabled;
  }
  var snapshot = data.snapshot || bookingAvailabilityPhase5RequestSnapshot();
  var staff = snapshot.staffById
    ? snapshot.staffById[bookingAvailabilityPhase5Text(data.employeeId)]
    : snapshot.staff.filter(function (item) {
      return bookingAvailabilityPhase5Text(item.staffId) === bookingAvailabilityPhase5Text(data.employeeId);
    })[0];
  if (!staff) {
    var staffError = new Error("Booking Availability staff does not exist.");
    staffError.code = "AVAILABILITY_STAFF_NOT_FOUND";
    throw staffError;
  }
  var branchId = bookingAvailabilityPhase5Text(data.branchId);
  if (!branchId || bookingAvailabilityPhase5Text(staff.branchId) !== branchId) {
    var branchError = new Error("Staff branch membership is missing or mismatched.");
    branchError.code = "AVAILABILITY_BRANCH_SCOPE_MISMATCH";
    throw branchError;
  }
  var audience = data.audience === "internal" ? "internal" : "public";
  var branch = bookingAvailabilityPhase5Branch(
    branchId, { publicAudience: audience === "public" }, snapshot.branches);
  var branchTimeZone = bookingAvailabilityPhase5Text(branch.timeZone) ||
    BookingAvailabilityPhase5.TIME_ZONE;
  var actor = audience === "internal" ? bookingAvailabilityPhase5Actor(data.requestData || data) : null;
  if (actor) {
    if (!bookingAvailabilityPhase5HasPermission(actor, "booking_availability.view")) {
      throw BookingAvailabilityPhase5.availabilityError(
        "AVAILABILITY_PERMISSION_DENIED", "Booking Availability permission is required.");
    }
    bookingAvailabilityPhase5AssertBranchScope(actor, branchId);
  }
  var versions = bookingAvailabilityPhase5ReadVersions(
    branchId, data.date, snapshot.versions);
  var generations = bookingAvailabilityPhase5ReadGenerations(
    branchId, snapshot.generations);
  var now = new Date();
  var generatedAt = Utilities.formatDate(
    now, branchTimeZone, "yyyy-MM-dd'T'HH:mm:ssXXX");
  var today = Utilities.formatDate(now, branchTimeZone, "yyyy-MM-dd");
  if (flags.engine === "PHASE5" && data.date === today && !flags.attendanceLiveEnabled) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_ATTENDANCE_DISABLED",
      "Current-day Booking availability requires the live Attendance authority.");
  }
  var input = {
    environment: identity.config.environment,
    spreadsheetHash: BookingAvailabilityPhase5.hash(identity.spreadsheet.getId()),
    branchId: branchId, date: data.date,
    today: today,
    audience: audience, staff: staff,
    attendanceLiveEnabled: flags.attendanceLiveEnabled,
    durationMinutes: data.durationMinutes,
    preparationMinutes: data.preparationMinutes || 0,
    cleanupMinutes: data.cleanupMinutes || 0,
    versions: versions, generations: generations, serviceSetHash: data.serviceSetHash || "",
    branchTimeZone: branchTimeZone,
    generatedAt: generatedAt, serverNowMs: now.getTime(),
    serverNowMinute: Number(Utilities.formatDate(now, branchTimeZone, "H")) * 60 +
      Number(Utilities.formatDate(now, branchTimeZone, "m")),
    noCheckInGraceMinutes: BookingAvailabilityPhase5.DEFAULTS.noCheckInGraceMinutes,
    sameDayLeadMinutes: BookingAvailabilityPhase5.DEFAULTS.sameDayLeadMinutes
  };
  var cache = CacheService.getScriptCache();
  var cacheKey = bookingAvailabilityPhase5CacheKey(input);
  if (!data.finalValidation) {
    try {
      var cached = cache.get(cacheKey);
      if (cached && cached.length <= 90000) {
        var cachedResult = bookingAvailabilityPhase5CachedResult(cached, input);
        if (cachedResult) return cachedResult;
      }
    } catch (_cacheReadError) {}
  }
  var schedule = bookingAvailabilityPhase5ResolveSchedule(staff, data.date, snapshot);
  var attendance = flags.attendanceLiveEnabled
    ? bookingAvailabilityPhase5Attendance(staff, data.date, snapshot)
    : { state: "NOT_STARTED", dayLifecycle: "OPEN", breaks: [] };
  var branchSegments = bookingAvailabilityPhase5BranchSegments(
    branchId, data.date, branchTimeZone, snapshot.branchHours);
  input.schedule = schedule;
  input.attendance = attendance;
  input.branchOpen = branchSegments.length > 0;
  input.branchSegments = branchSegments;
  input.bookings = bookingAvailabilityPhase5BookingBuffers(
    bookingAvailabilityPhase5ScopedBookings(
      data.bookings || snapshot.bookings, staff, branchId, data.date,
      snapshot, now.getTime()
    )
  );
  input.operationalOverrides = bookingAvailabilityPhase5ActiveOverrides(
    staff.staffId, branchId, data.date, audience, actor, flags, snapshot.overrides);
  var result = BookingAvailabilityPhase5.calculateAvailability(input);
  if (!data.finalValidation) {
    try {
      var serialized = JSON.stringify(result);
      if (serialized.length <= 90000) {
        cache.put(cacheKey, serialized, audience === "internal" ? 10 : 30);
      }
    } catch (_cacheWriteError) {}
  }
  return result;
}

function bookingAvailabilityPhase5ValidateAppointment(options) {
  var bookings = (options.bookings || getAllBookingsV2()).filter(function (booking) {
    return !options.excludeId ||
      bookingAvailabilityPhase5Text(booking.id || booking.bookingId) !==
        bookingAvailabilityPhase5Text(options.excludeId);
  });
  var result = bookingAvailabilityPhase5Evaluate({
    employeeId: options.employeeId, branchId: options.branchId, date: options.date,
    audience: options.audience || "public", requestData: options.requestData || {},
    durationMinutes: options.durationMinutes,
    preparationMinutes: options.preparationMinutes || 0,
    cleanupMinutes: options.cleanupMinutes || 0,
    serviceSetHash: options.serviceSetHash || "",
    bookings: bookings, finalValidation: true
  });
  var match = (result.slots || []).filter(function (slot) {
    return slot.start === options.time;
  })[0];
  if (!match) {
    return { ok: false, code: "SLOT_UNAVAILABLE", message: "This appointment is no longer available." };
  }
  return {
    ok: true, barber: options.barber, date: options.date, time: options.time,
    durationMinutes: options.durationMinutes, branchId: result.branchId,
    availabilityToken: result.availabilityToken, versions: result.versions,
    preparationMinutes: result.preparationMinutes, cleanupMinutes: result.cleanupMinutes,
    operationalOverrideId: bookingAvailabilityPhase5Text(match.operationalOverrideId)
  };
}

function bookingAvailabilityPhase5PreviewMigration(data) {
  var identity = bookingAvailabilityPhase5AssertIdentity({ preview: true });
  var actor = bookingAvailabilityPhase5Actor(data);
  if (!actor.owner) {
    var ownerError = new Error("Only owner can preview Phase 5 migration.");
    ownerError.code = "AVAILABILITY_OWNER_REQUIRED";
    throw ownerError;
  }
  var existing = {};
  Object.keys(BookingAvailabilityPhase5.SHEET_SCHEMAS).concat(["Bookings", "SERVICES"])
    .forEach(function (name) {
      var sheet = identity.spreadsheet.getSheetByName(name);
      existing[name] = sheet ? schedulePhase2Headers(sheet) : null;
    });
  return BookingAvailabilityPhase5.planMigration(existing, {
    environment: identity.config.environment,
    expectedSpreadsheetId: identity.config.spreadsheetId,
    actualSpreadsheetId: identity.spreadsheet.getId()
  });
}

