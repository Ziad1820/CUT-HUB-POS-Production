/* global BookingAvailabilityPhase5, StaffAttendancePhase3, StaffSchedulingPhase2,
  SpreadsheetApp, PropertiesService, CacheService, Utilities, getCutHubEnvironmentConfig,
  getAuthenticatedUser, normalizeManagedPermissions, schedulePhase2Actor,
  schedulePhase2ReadRows, schedulePhase2ReadStaff, schedulePhase2ReadSchedules,
  schedulePhase2Headers, schedulePhase2Save, attendancePhase3ReadDays,
  attendancePhase3ResolveSchedule, getAllBookingsV2, jsonOutput, LockService, Session */

function bookingAvailabilityPhase5Text(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function bookingAvailabilityPhase5ClockText(value, timeZone) {
  if (value instanceof Date && isFinite(value.getTime())) {
    return Utilities.formatDate(value, timeZone || BookingAvailabilityPhase5.TIME_ZONE || "Africa/Cairo", "HH:mm");
  }
  var text = bookingAvailabilityPhase5Text(value);
  var match = /^(\d{1,2}):([0-5]\d)$/.exec(text);
  if (typeof value === "string" && match && Number(match[1]) < 24) {
    return (match[1].length === 1 ? "0" : "") + match[1] + ":" + match[2];
  }
  // Preserve invalid nonblank values for downstream clock validation.
  return text;
}

function bookingAvailabilityPhase5ReadBranchHours() {
  var rows = schedulePhase2ReadRows("BRANCH_BOOKING_HOURS");
  if (!rows.length || !rows.some(function (item) { return item._rowNumber >= 2; })) return rows;
  // The shared reader serializes time Dates to ISO. Restore only these two
  // typed cells locally; never parse arbitrary timestamp strings as clocks.
  var sheet = SpreadsheetApp.getActive().getSheetByName("BRANCH_BOOKING_HOURS");
  var headers = schedulePhase2Headers(sheet);
  var openColumn = headers.indexOf("OPEN_TIME");
  var closeColumn = headers.indexOf("CLOSE_TIME");
  if (openColumn < 0 || closeColumn < 0) return rows;
  var firstColumn = Math.min(openColumn, closeColumn);
  var rawTimes = sheet.getRange(2, firstColumn + 1, sheet.getLastRow() - 1,
    Math.abs(closeColumn - openColumn) + 1).getValues();
  return rows.map(function (item) {
    var raw = rawTimes[item._rowNumber - 2];
    if (!raw) return item;
    var restored = Object.assign({}, item);
    restored.openTime = raw[openColumn - firstColumn];
    restored.closeTime = raw[closeColumn - firstColumn];
    return restored;
  });
}

function bookingAvailabilityPhase5AddMinutes(time, minutes) {
  var match = /^(\d{1,2}):(\d{2})$/.exec(bookingAvailabilityPhase5Text(time));
  if (!match) return bookingAvailabilityPhase5Text(time);
  var total = ((Number(match[1]) * 60 + Number(match[2]) + Number(minutes)) % 1440 + 1440) % 1440;
  var hours = String(Math.floor(total / 60));
  var mins = String(total % 60);
  return (hours.length < 2 ? "0" : "") + hours + ":" + (mins.length < 2 ? "0" : "") + mins;
}

function bookingAvailabilityPhase5ClockMinutes(value) {
  var match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(bookingAvailabilityPhase5Text(value));
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function bookingAvailabilityPhase5ValidDate(value) {
  var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(bookingAvailabilityPhase5Text(value));
  if (!match) return false;
  var date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[3]);
}

function bookingAvailabilityPhase5ValidRequestId(value) {
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(bookingAvailabilityPhase5Text(value));
}

function bookingAvailabilityPhase5Flags() {
  var properties = PropertiesService.getScriptProperties();
  var names = [
    "BOOKING_AVAILABILITY_ENGINE", "BOOKING_PHASE2_PLANNED_ENABLED",
    "BOOKING_ATTENDANCE_LIVE_ENABLED", "BOOKING_CUSTOMER_LIVE_REFRESH_ENABLED",
    "BOOKING_INTERNAL_LIVE_REFRESH_ENABLED", "BOOKING_MANAGER_OVERRIDE_ENABLED",
    "BOOKING_CONFLICT_RESOLUTION_ENABLED", "BOOKING_NO_CHECK_IN_DETECTOR_ENABLED"
  ];
  var values = {};
  names.forEach(function (name) { values[name] = properties.getProperty(name); });
  return BookingAvailabilityPhase5.normalizeFlags(values);
}

function bookingAvailabilityPhase5AssertIdentity(options) {
  var data = options || {};
  var config = getCutHubEnvironmentConfig();
  var spreadsheet = SpreadsheetApp.getActive();
  if (!config.environment ||
      ["development", "test", "staging", "production"].indexOf(config.environment) === -1) {
    var environmentError = new Error("Booking Availability environment identity is invalid.");
    environmentError.code = "AVAILABILITY_ENVIRONMENT_IDENTITY_INVALID";
    throw environmentError;
  }
  if (!config.spreadsheetId || !spreadsheet || spreadsheet.getId() !== config.spreadsheetId) {
    var spreadsheetError = new Error("Booking Availability spreadsheet identity does not match configuration.");
    spreadsheetError.code = "AVAILABILITY_SPREADSHEET_IDENTITY_MISMATCH";
    throw spreadsheetError;
  }
  if (data.preview && config.environment === "production") {
    var previewError = new Error("Phase 5 preview cannot access production.");
    previewError.code = "PHASE5_ENVIRONMENT_BLOCKED";
    throw previewError;
  }
  return { config: config, spreadsheet: spreadsheet };
}

function bookingAvailabilityPhase5RequireSheet(name) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sheet) {
    var error = new Error("Required Phase 5 sheet is missing: " + name);
    error.code = "AVAILABILITY_SCHEMA_NOT_READY";
    throw error;
  }
  return sheet;
}

function bookingAvailabilityPhase5ReadVersions(branchId, date, prefetchedRows) {
  bookingAvailabilityPhase5RequireSheet("BOOKING_AVAILABILITY_VERSIONS");
  var matches = (prefetchedRows || schedulePhase2ReadRows(
    "BOOKING_AVAILABILITY_VERSIONS")).filter(function (item) {
    return bookingAvailabilityPhase5Text(item.branchId) === bookingAvailabilityPhase5Text(branchId) &&
      bookingAvailabilityPhase5Text(item.date) === bookingAvailabilityPhase5Text(date);
  });
  if (matches.length > 1) {
    var error = new Error("Availability version scope is ambiguous.");
    error.code = "AVAILABILITY_VERSION_AMBIGUOUS";
    throw error;
  }
  var row = matches[0] || {};
  return {
    bookingVersion: Number(row.bookingVersion) || 0,
    scheduleVersion: Number(row.scheduleVersion) || 0,
    attendanceOperationalVersion: Number(row.attendanceOperationalVersion) || 0,
    operationalOverrideVersion: Number(row.operationalOverrideVersion) || 0,
    serviceVersion: Number(row.serviceVersion) || 0,
    branchHoursVersion: Number(row.branchHoursVersion) || 0
  };
}

function bookingAvailabilityPhase5ReadGenerations(branchId, prefetchedRows) {
  bookingAvailabilityPhase5RequireSheet("BOOKING_AVAILABILITY_GENERATIONS");
  var rows = prefetchedRows || schedulePhase2ReadRows("BOOKING_AVAILABILITY_GENERATIONS");
  var globalRows = rows.filter(function (item) {
    return String(item.scopeType || "").toUpperCase() === "GLOBAL" &&
      bookingAvailabilityPhase5Text(item.scopeId) === "GLOBAL";
  });
  var branchRows = rows.filter(function (item) {
    return String(item.scopeType || "").toUpperCase() === "BRANCH" &&
      bookingAvailabilityPhase5Text(item.scopeId) === bookingAvailabilityPhase5Text(branchId);
  });
  if (globalRows.length > 1 || branchRows.length > 1) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_GENERATION_AMBIGUOUS", "Availability generation scope is ambiguous.");
  }
  function normalized(row) {
    return BookingAvailabilityPhase5.normalizeGenerations(row || {});
  }
  return { global: normalized(globalRows[0]), branch: normalized(branchRows[0]) };
}

function bookingAvailabilityPhase5GenerationField(kind) {
  var fields = {
    recurringSchedule: "recurringScheduleGeneration",
    service: "serviceGeneration",
    branchHours: "branchHoursGeneration",
    staffMembership: "staffMembershipGeneration",
    attendance: "attendanceOperationalGeneration",
    operationalOverride: "operationalOverrideGeneration",
    booking: "bookingOccupancyGeneration"
  };
  var field = fields[kind];
  if (!field) throw BookingAvailabilityPhase5.availabilityError(
    "AVAILABILITY_GENERATION_KIND_INVALID", "Availability generation kind is invalid.");
  return field;
}

function bookingAvailabilityPhase5IncrementGeneration(kind, scopeType, scopeId, actor, requestId) {
  var field = bookingAvailabilityPhase5GenerationField(kind);
  var type = String(scopeType || "").toUpperCase();
  var id = bookingAvailabilityPhase5Text(scopeId);
  if (["GLOBAL", "BRANCH"].indexOf(type) === -1 || !id) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_GENERATION_SCOPE_INVALID", "Availability generation scope is invalid.");
  }
  bookingAvailabilityPhase5RequireSheet("BOOKING_AVAILABILITY_GENERATIONS");
  var rows = schedulePhase2ReadRows("BOOKING_AVAILABILITY_GENERATIONS").filter(function (item) {
    return String(item.scopeType || "").toUpperCase() === type &&
      bookingAvailabilityPhase5Text(item.scopeId) === id;
  });
  if (rows.length > 1) throw BookingAvailabilityPhase5.availabilityError(
    "AVAILABILITY_GENERATION_AMBIGUOUS", "Availability generation scope is ambiguous.");
  var record = rows[0] || {
    generationId: "BAG-" + type + "-" + id, scopeType: type, scopeId: id,
    recurringScheduleGeneration: 0, serviceGeneration: 0, branchHoursGeneration: 0,
    staffMembershipGeneration: 0, attendanceOperationalGeneration: 0,
    operationalOverrideGeneration: 0, bookingOccupancyGeneration: 0, epoch: 0
  };
  var next = BookingAvailabilityPhase5.nextGeneration(record[field], record.epoch);
  record[field] = next.value;
  record.epoch = next.epoch;
  record.updatedAt = bookingAvailabilityPhase5Now();
  record.updatedBy = actor ? actor.actorId : "system";
  record.lastRequestId = requestId || "";
  schedulePhase2Save(
    "BOOKING_AVAILABILITY_GENERATIONS",
    BookingAvailabilityPhase5.SHEET_SCHEMAS.BOOKING_AVAILABILITY_GENERATIONS,
    "GENERATION_ID", record
  );
  return { before: rows[0] || null, after: record, reset: next.reset };
}

function bookingAvailabilityPhase5Branch(branchId, options, prefetchedRows) {
  bookingAvailabilityPhase5RequireSheet("BOOKING_BRANCH_REGISTRY");
  var id = bookingAvailabilityPhase5Text(branchId);
  if (!id) throw BookingAvailabilityPhase5.availabilityError(
    "AVAILABILITY_BRANCH_REQUIRED", "A branch must be selected explicitly.");
  var matches = (prefetchedRows || schedulePhase2ReadRows("BOOKING_BRANCH_REGISTRY")).filter(function (item) {
    return bookingAvailabilityPhase5Text(item.branchId) === id;
  });
  if (matches.length !== 1) throw BookingAvailabilityPhase5.availabilityError(
    matches.length ? "AVAILABILITY_BRANCH_AMBIGUOUS" : "AVAILABILITY_BRANCH_NOT_FOUND",
    "Booking branch was not found uniquely.");
  BookingAvailabilityPhase5.validateBranchConfiguration(matches[0], options || {});
  return matches[0];
}

function bookingAvailabilityPhase5Weekday(date, timeZone) {
  return Utilities.formatDate(new Date(date + "T12:00:00"), timeZone || BookingAvailabilityPhase5.TIME_ZONE, "EEEE")
    .toUpperCase();
}

function bookingAvailabilityPhase5BranchSegments(branchId, date, timeZone, prefetchedRows) {
  bookingAvailabilityPhase5RequireSheet("BRANCH_BOOKING_HOURS");
  var weekday = bookingAvailabilityPhase5Weekday(date, timeZone);
  return (prefetchedRows || bookingAvailabilityPhase5ReadBranchHours()).filter(function (item) {
    var active = item.active === true || String(item.active).toUpperCase() === "TRUE";
    return active && bookingAvailabilityPhase5Text(item.branchId) === bookingAvailabilityPhase5Text(branchId) &&
      String(item.weekday || "").toUpperCase() === weekday &&
      (!item.effectiveFrom || item.effectiveFrom <= date) &&
      (!item.effectiveTo || item.effectiveTo >= date);
  }).map(function (item) {
    return {
      start: bookingAvailabilityPhase5ClockText(item.openTime, timeZone),
      end: bookingAvailabilityPhase5ClockText(item.closeTime, timeZone)
    };
  });
}

function bookingAvailabilityPhase5RequestSnapshot() {
  var staff = schedulePhase2ReadStaff();
  var versions = schedulePhase2ReadRows("BOOKING_AVAILABILITY_VERSIONS");
  var generations = schedulePhase2ReadRows("BOOKING_AVAILABILITY_GENERATIONS");
  var hours = bookingAvailabilityPhase5ReadBranchHours();
  var overrides = schedulePhase2ReadRows("BOOKING_OPERATIONAL_OVERRIDES");
  var attendanceDays = attendancePhase3ReadDays();
  var attendanceEvents = schedulePhase2ReadRows("ATTENDANCE_EVENTS");
  var bookings = getAllBookingsV2();
  var branches = schedulePhase2ReadRows("BOOKING_BRANCH_REGISTRY");
  var schedules = schedulePhase2ReadSchedules();
  var scheduleOverrides = schedulePhase2ReadRows("STAFF_SCHEDULE_OVERRIDES");
  var policies = schedulePhase2ReadRows("STAFF_WORK_POLICIES");
  var staffById = {};
  var attendanceDaysByStaffDate = {};
  var attendanceEventsByDayId = {};
  staff.forEach(function (item) { staffById[bookingAvailabilityPhase5Text(item.staffId)] = item; });
  attendanceDays.forEach(function (item) {
    var key = bookingAvailabilityPhase5Text(item.staffId) + "|" +
      bookingAvailabilityPhase5Text(item.attendanceDate || item.date);
    if (!attendanceDaysByStaffDate[key]) attendanceDaysByStaffDate[key] = [];
    attendanceDaysByStaffDate[key].push(item);
  });
  attendanceEvents.forEach(function (item) {
    var key = bookingAvailabilityPhase5Text(item.attendanceDayId);
    if (!attendanceEventsByDayId[key]) attendanceEventsByDayId[key] = [];
    attendanceEventsByDayId[key].push(item);
  });
  return {
    staff: staff, staffById: staffById, versions: versions, generations: generations,
    branchHours: hours, overrides: overrides, attendanceDays: attendanceDays,
    attendanceEvents: attendanceEvents, bookings: bookings, branches: branches,
    schedules: schedules, scheduleOverrides: scheduleOverrides, policies: policies,
    attendanceDaysByStaffDate: attendanceDaysByStaffDate,
    attendanceEventsByDayId: attendanceEventsByDayId
  };
}

function bookingAvailabilityPhase5QuotaEstimate(staffCount) {
  var count = Math.max(0, Number(staffCount) || 0);
  return {
    estimateOnly: true,
    authoritativeSheetReadsPerRequest: 12,
    authoritativeSheetWritesPerReadRequest: 0,
    cacheReadsPerStaff: 1,
    cacheWritesPerStaffMaximum: 1,
    note: "Fixed request snapshot estimate; measure Apps Script runtime and quotas before production claims."
  };
}

function bookingAvailabilityPhase5ResolveSchedule(staff, date, snapshot) {
  if (!snapshot || !snapshot.schedules || !snapshot.scheduleOverrides || !snapshot.policies) {
    return attendancePhase3ResolveSchedule(staff, date);
  }
  if (typeof StaffAttendanceCore === "undefined" ||
      typeof StaffSchedulingPhase2 === "undefined") {
    return attendancePhase3ResolveSchedule(staff, date);
  }
  var policyResolution;
  try {
    policyResolution = StaffAttendanceCore.resolveEffectivePolicy(
      snapshot.policies, staff.staffId, date);
  } catch (error) {
    if (error.code !== "POLICY_NOT_FOUND") throw error;
    policyResolution = { source: "SAFE_DEFAULT", policyId: "PHASE3_SAFE_DEFAULT",
      snapshot: { requiredDailyMinutes: 0, allowedBreakMinutes: 0 } };
  }
  return StaffSchedulingPhase2.resolveSchedule({
    staff: staff, date: date, schedules: snapshot.schedules,
    overrides: snapshot.scheduleOverrides, policyResolution: policyResolution
  });
}

function bookingAvailabilityPhase5Attendance(staff, date, snapshot) {
  var indexedDays = snapshot && snapshot.attendanceDaysByStaffDate;
  var days = indexedDays
    ? (indexedDays[bookingAvailabilityPhase5Text(staff.staffId) + "|" + date] || [])
    : ((snapshot && snapshot.attendanceDays) || attendancePhase3ReadDays()).filter(function (item) {
    return bookingAvailabilityPhase5Text(item.staffId) === bookingAvailabilityPhase5Text(staff.staffId) &&
      bookingAvailabilityPhase5Text(item.attendanceDate || item.date) === date;
  });
  if (days.length > 1) {
    var duplicate = new Error("Attendance day is ambiguous for Booking Availability.");
    duplicate.code = "AVAILABILITY_ATTENDANCE_DAY_AMBIGUOUS";
    throw duplicate;
  }
  var day = days[0] || null;
  var indexedEvents = snapshot && snapshot.attendanceEventsByDayId;
  var events = day ? (indexedEvents
    ? (indexedEvents[bookingAvailabilityPhase5Text(day.attendanceDayId)] || [])
    : ((snapshot && snapshot.attendanceEvents) ||
    schedulePhase2ReadRows("ATTENDANCE_EVENTS")).filter(function (item) {
    return bookingAvailabilityPhase5Text(item.attendanceDayId) ===
      bookingAvailabilityPhase5Text(day.attendanceDayId);
  })) : [];
  var eventState = StaffAttendancePhase3.buildEventState(events);
  return {
    attendanceDayId: day ? bookingAvailabilityPhase5Text(day.attendanceDayId) : "",
    state: day && String(day.status).toUpperCase() === "UNRESOLVED"
      ? "UNRESOLVED" : eventState.state,
    status: day ? bookingAvailabilityPhase5Text(day.status) : "NOT_STARTED",
    dayLifecycle: day ? bookingAvailabilityPhase5Text(day.dayLifecycle || "OPEN") : "OPEN",
    staleCalculation: !!(day && day.staleCalculation),
    openSession: eventState.openSession,
    openBreak: eventState.openBreak,
    breaks: eventState.breaks,
    actualCheckIn: day ? bookingAvailabilityPhase5Text(day.actualCheckIn) : "",
    actualCheckOut: day ? bookingAvailabilityPhase5Text(day.actualCheckOut) :
      (eventState.sessions.length ? bookingAvailabilityPhase5Text(
        eventState.sessions[eventState.sessions.length - 1].checkOutAt) : ""),
    sourceEventIds: eventState.validEvents.map(function (item) { return item.eventId; })
  };
}

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
  input.bookings = bookingAvailabilityPhase5BookingBuffers(data.bookings || snapshot.bookings);
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

function bookingAvailabilityPhase5AppendAudit(record) {
  return schedulePhase2Save(
    "BOOKING_AVAILABILITY_AUDIT",
    BookingAvailabilityPhase5.SHEET_SCHEMAS.BOOKING_AVAILABILITY_AUDIT,
    "AUDIT_ID",
    {
      auditId: record.auditId || "BAU-" + Utilities.getUuid(),
      action: record.action, entityType: record.entityType, entityId: record.entityId,
      branchId: record.branchId, staffId: record.staffId, date: record.date,
      actorId: record.actorId, actorRole: record.actorRole,
      reasonCode: record.reasonCode, sourceIds: record.sourceIds || [],
      beforeState: record.beforeState || {}, afterState: record.afterState || {},
      requestId: record.requestId || "", createdAt: record.createdAt || bookingAvailabilityPhase5Now()
    }
  );
}

function bookingAvailabilityPhase5IncrementVersion(kind, branchId, date, actor) {
  var fieldByKind = {
    booking: "bookingVersion", schedule: "scheduleVersion",
    attendance: "attendanceOperationalVersion",
    operationalOverride: "operationalOverrideVersion",
    service: "serviceVersion", branchHours: "branchHoursVersion"
  };
  var field = fieldByKind[kind];
  if (!field) return null;
  bookingAvailabilityPhase5RequireSheet("BOOKING_AVAILABILITY_VERSIONS");
  var rows = schedulePhase2ReadRows("BOOKING_AVAILABILITY_VERSIONS").filter(function (item) {
    return bookingAvailabilityPhase5Text(item.branchId) === bookingAvailabilityPhase5Text(branchId) &&
      bookingAvailabilityPhase5Text(item.date) === bookingAvailabilityPhase5Text(date);
  });
  if (rows.length > 1) {
    var duplicate = new Error("Availability version scope is ambiguous.");
    duplicate.code = "AVAILABILITY_VERSION_AMBIGUOUS";
    throw duplicate;
  }
  var before = rows[0] ? JSON.parse(JSON.stringify(rows[0])) : null;
  var current = rows[0] || {
    versionId: "BAV-" + bookingAvailabilityPhase5Text(branchId) + "-" +
      bookingAvailabilityPhase5Text(date),
    branchId: branchId, date: date, bookingVersion: 0, scheduleVersion: 0,
    attendanceOperationalVersion: 0, operationalOverrideVersion: 0,
    serviceVersion: 0, branchHoursVersion: 0
  };
  var next = BookingAvailabilityPhase5.nextGeneration(current[field], 0);
  current[field] = next.value;
  current.updatedAt = bookingAvailabilityPhase5Now();
  current.updatedBy = actor ? actor.actorId : "system";
  schedulePhase2Save(
    "BOOKING_AVAILABILITY_VERSIONS",
    BookingAvailabilityPhase5.SHEET_SCHEMAS.BOOKING_AVAILABILITY_VERSIONS,
    "VERSION_ID", current
  );
  var generationKind = kind === "schedule" ? "recurringSchedule" : kind;
  var generationScope = ["service", "recurringSchedule", "staffMembership"].indexOf(
    generationKind) !== -1 ? "GLOBAL" : "BRANCH";
  var generationId = generationScope === "GLOBAL" ? "GLOBAL" : branchId;
  var generation = bookingAvailabilityPhase5IncrementGeneration(
    generationKind, generationScope, generationId, actor, "");
  return { before: before, after: current, generation: generation };
}

function bookingAvailabilityPhase5IncrementVersionOnly(kind, branchId, date, actor) {
  var fieldByKind = {
    booking: "bookingVersion", schedule: "scheduleVersion",
    attendance: "attendanceOperationalVersion",
    operationalOverride: "operationalOverrideVersion",
    service: "serviceVersion", branchHours: "branchHoursVersion"
  };
  var field = fieldByKind[kind];
  if (!field || !bookingAvailabilityPhase5Text(branchId) ||
      !bookingAvailabilityPhase5ValidDate(date)) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_VERSION_SCOPE_INVALID", "Availability version scope is invalid.");
  }
  bookingAvailabilityPhase5RequireSheet("BOOKING_AVAILABILITY_VERSIONS");
  var rows = schedulePhase2ReadRows("BOOKING_AVAILABILITY_VERSIONS").filter(function (item) {
    return bookingAvailabilityPhase5Text(item.branchId) === bookingAvailabilityPhase5Text(branchId) &&
      bookingAvailabilityPhase5Text(item.date) === bookingAvailabilityPhase5Text(date);
  });
  if (rows.length > 1) throw BookingAvailabilityPhase5.availabilityError(
    "AVAILABILITY_VERSION_AMBIGUOUS", "Availability version scope is ambiguous.");
  var before = rows[0] ? JSON.parse(JSON.stringify(rows[0])) : null;
  var current = rows[0] || {
    versionId: "BAV-" + bookingAvailabilityPhase5Text(branchId) + "-" + date,
    branchId: branchId, date: date, bookingVersion: 0, scheduleVersion: 0,
    attendanceOperationalVersion: 0, operationalOverrideVersion: 0,
    serviceVersion: 0, branchHoursVersion: 0
  };
  current[field] = BookingAvailabilityPhase5.nextGeneration(current[field], 0).value;
  current.updatedAt = bookingAvailabilityPhase5Now();
  current.updatedBy = actor ? actor.actorId : "system";
  schedulePhase2Save(
    "BOOKING_AVAILABILITY_VERSIONS",
    BookingAvailabilityPhase5.SHEET_SCHEMAS.BOOKING_AVAILABILITY_VERSIONS,
    "VERSION_ID", current
  );
  return { before: before, after: current };
}

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

function bookingAvailabilityPhase5ListBranches(actor, publicAudience) {
  bookingAvailabilityPhase5RequireSheet("BOOKING_BRANCH_REGISTRY");
  return schedulePhase2ReadRows("BOOKING_BRANCH_REGISTRY").filter(function (item) {
    var active = item.active === true || String(item.active).toUpperCase() === "TRUE";
    if (publicAudience) {
      return active && (item.publicSelectable === true ||
        String(item.publicSelectable).toUpperCase() === "TRUE");
    }
    if (actor.owner) return true;
    return active && (actor.branchIds || []).indexOf(item.branchId) !== -1;
  }).map(function (item) {
    return {
      branchId: item.branchId, branchName: item.branchName,
      active: item.active === true || String(item.active).toUpperCase() === "TRUE",
      timeZone: item.timeZone || BookingAvailabilityPhase5.TIME_ZONE,
      publicSelectable: item.publicSelectable === true ||
        String(item.publicSelectable).toUpperCase() === "TRUE",
      closureStatus: item.closureStatus || "OPEN",
      closureReason: publicAudience ? "" : (item.closureReason || "")
    };
  });
}

function bookingAvailabilityPhase5ListBranchHours(actor) {
  if (!actor.owner &&
      !bookingAvailabilityPhase5HasPermission(actor, "booking_availability.view_operational") &&
      !bookingAvailabilityPhase5HasPermission(actor, "booking_availability.manage_override")) {
    return [];
  }
  bookingAvailabilityPhase5RequireSheet("BRANCH_BOOKING_HOURS");
  var branches = schedulePhase2ReadRows("BOOKING_BRANCH_REGISTRY");
  return bookingAvailabilityPhase5ReadBranchHours().filter(function (item) {
    return actor.owner || (actor.branchIds || []).indexOf(item.branchId) !== -1;
  }).map(function (item) {
    var matches = branches.filter(function (branch) {
      return bookingAvailabilityPhase5Text(branch.branchId) === bookingAvailabilityPhase5Text(item.branchId);
    });
    var timeZone = matches.length === 1 ? bookingAvailabilityPhase5Text(matches[0].timeZone) : "";
    return {
      branchHoursId: item.branchHoursId, branchId: item.branchId,
      weekday: String(item.weekday || "").toUpperCase(),
      openTime: bookingAvailabilityPhase5ClockText(item.openTime, timeZone),
      closeTime: bookingAvailabilityPhase5ClockText(item.closeTime, timeZone),
      active: item.active === true || String(item.active).toUpperCase() === "TRUE",
      effectiveFrom: item.effectiveFrom || "", effectiveTo: item.effectiveTo || ""
    };
  });
}

function bookingAvailabilityPhase5SaveBranchHours(data, actor) {
  if (!actor.owner && !bookingAvailabilityPhase5HasPermission(
      actor, "booking_availability.manage_override")) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_PERMISSION_DENIED", "Branch-hours management permission is required.");
  }
  var branchId = bookingAvailabilityPhase5Text(data.branchId);
  bookingAvailabilityPhase5AssertBranchScope(actor, branchId);
  var branch = bookingAvailabilityPhase5Branch(branchId, { allowClosed: true });
  var requestId = bookingAvailabilityPhase5Text(data.clientRequestId);
  var weekday = String(data.weekday || "").toUpperCase();
  var openTime = bookingAvailabilityPhase5Text(data.openTime);
  var closeTime = bookingAvailabilityPhase5Text(data.closeTime);
  var effectiveFrom = bookingAvailabilityPhase5Text(data.effectiveFrom);
  var effectiveTo = bookingAvailabilityPhase5Text(data.effectiveTo);
  if (!bookingAvailabilityPhase5ValidRequestId(requestId) ||
      ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
        .indexOf(weekday) === -1 ||
      bookingAvailabilityPhase5ClockMinutes(openTime) === null ||
      bookingAvailabilityPhase5ClockMinutes(closeTime) === null || openTime === closeTime) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_BRANCH_HOURS_INVALID", "Valid branch hours and request ID are required.");
  }
  if ((effectiveFrom && !bookingAvailabilityPhase5ValidDate(effectiveFrom)) ||
      (effectiveTo && !bookingAvailabilityPhase5ValidDate(effectiveTo)) ||
      (effectiveFrom && effectiveTo && effectiveFrom > effectiveTo)) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_BRANCH_HOURS_EFFECTIVE_RANGE_INVALID",
      "Branch-hours effective dates must be valid and ordered.");
  }
  return bookingAvailabilityPhase5WithLock(function () {
    var id = branchId + "-" + weekday;
    var rows = schedulePhase2ReadRows("BRANCH_BOOKING_HOURS").filter(function (item) {
      return bookingAvailabilityPhase5Text(item.branchHoursId) === id;
    });
    if (rows.length > 1) throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_BRANCH_HOURS_AMBIGUOUS", "Branch hours are ambiguous.");
    var before = rows[0] ? JSON.parse(JSON.stringify(rows[0])) : null;
    var now = bookingAvailabilityPhase5Now();
    var record = rows[0] || {
      branchHoursId: id, branchId: branchId, weekday: weekday,
      createdAt: now, createdBy: actor.actorId
    };
    record.openTime = openTime; record.closeTime = closeTime;
    record.active = data.active !== false;
    record.effectiveFrom = effectiveFrom;
    record.effectiveTo = effectiveTo;
    record.updatedAt = now; record.updatedBy = actor.actorId; record.lastRequestId = requestId;
    return bookingAvailabilityPhase5RunTransaction({
      data: data, requestId: requestId, action: "BRANCH_HOURS_SAVE",
      entityType: "BRANCH_BOOKING_HOURS", entityId: id, branchId: branchId,
      actor: actor, beforeState: before || {},
      business: function () {
        schedulePhase2Save(
          "BRANCH_BOOKING_HOURS",
          BookingAvailabilityPhase5.SHEET_SCHEMAS.BRANCH_BOOKING_HOURS,
          "BRANCH_HOURS_ID", record);
        return record;
      },
      version: function () {
        return bookingAvailabilityPhase5IncrementGeneration(
          "branchHours", "BRANCH", branchId, actor, requestId);
      },
      audit: function () {
        return bookingAvailabilityPhase5AppendAudit({
          action: "BRANCH_BOOKING_HOURS_SAVED", entityType: "BRANCH_BOOKING_HOURS",
          entityId: id, branchId: branchId, actorId: actor.actorId, actorRole: actor.role,
          reasonCode: "BRANCH_HOURS_CONFIGURATION", beforeState: before || {},
          afterState: record, requestId: requestId
        });
      },
      compensateBusiness: function () {
        if (!before) {
          record.active = false;
          record.updatedAt = bookingAvailabilityPhase5Now();
          record.updatedBy = "transaction-compensation";
          schedulePhase2Save("BRANCH_BOOKING_HOURS",
            BookingAvailabilityPhase5.SHEET_SCHEMAS.BRANCH_BOOKING_HOURS,
            "BRANCH_HOURS_ID", record);
        } else {
          schedulePhase2Save("BRANCH_BOOKING_HOURS",
            BookingAvailabilityPhase5.SHEET_SCHEMAS.BRANCH_BOOKING_HOURS,
            "BRANCH_HOURS_ID", before);
        }
      },
      response: function () {
        return {
          branchId: branch.branchId, weekday: weekday, openTime: openTime,
          closeTime: closeTime, active: record.active
        };
      }
    });
  });
}

function bookingAvailabilityPhase5SaveBranchConfiguration(data, actor) {
  if (!actor.owner) throw BookingAvailabilityPhase5.availabilityError(
    "AVAILABILITY_OWNER_REQUIRED", "Only owner can manage the canonical branch registry.");
  var branchId = bookingAvailabilityPhase5Text(data.branchId);
  var branchName = bookingAvailabilityPhase5Text(data.branchName);
  var timeZone = bookingAvailabilityPhase5Text(data.timeZone) ||
    BookingAvailabilityPhase5.TIME_ZONE;
  var requestId = bookingAvailabilityPhase5Text(data.clientRequestId);
  if (!branchId || !branchName || !bookingAvailabilityPhase5ValidRequestId(requestId)) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_BRANCH_CONFIGURATION_INVALID",
      "Stable branch ID, branch name, timezone, and request ID are required.");
  }
  var candidate = {
    branchId: branchId, branchName: branchName, active: data.active !== false,
    timeZone: timeZone, publicSelectable: data.publicSelectable === true,
    closureStatus: String(data.closureStatus || "OPEN").toUpperCase(),
    closureReason: bookingAvailabilityPhase5Text(data.closureReason)
  };
  if (candidate.active) BookingAvailabilityPhase5.validateBranchConfiguration(candidate);
  return bookingAvailabilityPhase5WithLock(function () {
    var matches = schedulePhase2ReadRows("BOOKING_BRANCH_REGISTRY").filter(function (item) {
      return bookingAvailabilityPhase5Text(item.branchId) === branchId;
    });
    if (matches.length > 1) throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_BRANCH_AMBIGUOUS", "Branch registry identity is ambiguous.");
    var before = matches[0] ? JSON.parse(JSON.stringify(matches[0])) : null;
    var now = bookingAvailabilityPhase5Now();
    var record = matches[0] || {
      branchId: branchId, createdAt: now, createdBy: actor.actorId
    };
    Object.keys(candidate).forEach(function (key) { record[key] = candidate[key]; });
    record.updatedAt = now; record.updatedBy = actor.actorId; record.lastRequestId = requestId;
    return bookingAvailabilityPhase5RunTransaction({
      data: data, requestId: requestId, action: "BRANCH_CONFIGURATION_SAVE",
      entityType: "BOOKING_BRANCH", entityId: branchId, branchId: branchId,
      actor: actor, beforeState: before || {},
      business: function () {
        schedulePhase2Save("BOOKING_BRANCH_REGISTRY",
          BookingAvailabilityPhase5.SHEET_SCHEMAS.BOOKING_BRANCH_REGISTRY,
          "BRANCH_ID", record);
        return record;
      },
      version: function () {
        return bookingAvailabilityPhase5IncrementGeneration(
          "branchHours", "BRANCH", branchId, actor, requestId);
      },
      audit: function () {
        return bookingAvailabilityPhase5AppendAudit({
          action: "BOOKING_BRANCH_CONFIGURATION_SAVED", entityType: "BOOKING_BRANCH",
          entityId: branchId, branchId: branchId, actorId: actor.actorId,
          actorRole: actor.role, reasonCode: "BRANCH_CONFIGURATION",
          beforeState: before || {}, afterState: record, requestId: requestId
        });
      },
      compensateBusiness: function () {
        var compensation = before || Object.assign({}, record, {
          active: false, publicSelectable: false,
          closureStatus: "CLOSED", closureReason: "COMPENSATED_UNCOMMITTED_BRANCH"
        });
        schedulePhase2Save("BOOKING_BRANCH_REGISTRY",
          BookingAvailabilityPhase5.SHEET_SCHEMAS.BOOKING_BRANCH_REGISTRY,
          "BRANCH_ID", compensation);
      }
    });
  });
}

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

function handleBookingAvailabilityPhase5Action(data) {
  try {
    if (data.action === "listPublicBookingBranches") {
      bookingAvailabilityPhase5AssertIdentity();
      return jsonOutput({
        status: "success", branches: bookingAvailabilityPhase5ListBranches(null, true)
      });
    }
    if (data.action === "previewBookingAvailabilityMigration") {
      return jsonOutput({
        status: "success", code: "AVAILABILITY_MIGRATION_PREVIEW_OK",
        migration: bookingAvailabilityPhase5PreviewMigration(data)
      });
    }
    bookingAvailabilityPhase5AssertIdentity();
    var actor = bookingAvailabilityPhase5Actor(data);
    if (data.action === "getBookingAvailabilityFlags") {
      if (!bookingAvailabilityPhase5HasPermission(actor, "booking_availability.view")) {
        throw BookingAvailabilityPhase5.availabilityError(
          "AVAILABILITY_PERMISSION_DENIED", "Booking Availability permission is required.");
      }
      var currentFlags = bookingAvailabilityPhase5Flags();
      return jsonOutput({
        status: "success", flags: currentFlags,
        cacheStatus: {
          available: typeof CacheService !== "undefined",
          tokenVersioningEnabled: currentFlags.engine !== "LEGACY"
        },
        quotaEstimate: bookingAvailabilityPhase5QuotaEstimate(schedulePhase2ReadStaff().length)
      });
    }
    if (data.action === "listBookingBranches") {
      if (!bookingAvailabilityPhase5HasPermission(actor, "booking_availability.view")) {
        throw BookingAvailabilityPhase5.availabilityError(
          "AVAILABILITY_PERMISSION_DENIED", "Booking Availability permission is required.");
      }
      return jsonOutput({
        status: "success", branches: bookingAvailabilityPhase5ListBranches(actor, false),
        branchHours: bookingAvailabilityPhase5ListBranchHours(actor)
      });
    }
    if (data.action === "saveBookingBranchHours") {
      return jsonOutput({
        status: "success", branchHours: bookingAvailabilityPhase5SaveBranchHours(data, actor)
      });
    }
    if (data.action === "saveBookingBranchConfiguration") {
      return jsonOutput({
        status: "success",
        branch: bookingAvailabilityPhase5SaveBranchConfiguration(data, actor)
      });
    }
    if (data.action === "recoverBookingAvailabilityTransaction") {
      return jsonOutput({
        status: "success",
        recovery: bookingAvailabilityPhase5RecoverWorkPolicyTransaction(data, actor)
      });
    }
    if (data.action === "previewBookingNoCheckInTriggerInstallation") {
      return jsonOutput({
        status: "success", preview: previewBookingNoCheckInTriggerInstallation(data)
      });
    }
    if (data.action === "runBookingNoCheckInDetector") {
      return jsonOutput({
        status: "success", detector: runBookingNoCheckInDetector(data)
      });
    }
    if (data.action === "createBookingOperationalOverride") {
      return jsonOutput({
        status: "success", operationalOverride: bookingAvailabilityPhase5CreateOverride(data, actor)
      });
    }
    if (data.action === "revokeBookingOperationalOverride") {
      return jsonOutput({
        status: "success", operationalOverride: bookingAvailabilityPhase5RevokeOverride(data, actor)
      });
    }
    if (data.action === "listBookingAvailabilityConflicts") {
      if (!bookingAvailabilityPhase5HasPermission(actor, "booking_availability.view_restrictions")) {
        throw BookingAvailabilityPhase5.availabilityError(
          "AVAILABILITY_PERMISSION_DENIED", "Conflict viewing permission is required.");
      }
      var conflicts = schedulePhase2ReadRows("BOOKING_AVAILABILITY_CONFLICTS").filter(function (item) {
        if (actor.owner) return true;
        return (actor.branchIds || []).indexOf(item.branchId) !== -1;
      }).map(function (item) {
        return {
          conflictId: item.conflictId, conflictCode: item.conflictCode,
          bookingId: item.bookingId, branchId: item.branchId, staffId: item.staffId,
          date: item.date, slotStart: item.slotStart, slotEnd: item.slotEnd,
          status: item.status, detectedAt: item.detectedAt
        };
      });
      return jsonOutput({ status: "success", conflicts: conflicts });
    }
    if (data.action === "listBookingOperationalOverrides") {
      if (!bookingAvailabilityPhase5HasPermission(actor, "booking_availability.view_operational")) {
        throw BookingAvailabilityPhase5.availabilityError(
          "AVAILABILITY_PERMISSION_DENIED", "Operational availability permission is required.");
      }
      var overrides = schedulePhase2ReadRows("BOOKING_OPERATIONAL_OVERRIDES").filter(function (item) {
        return actor.owner || (actor.branchIds || []).indexOf(item.branchId) !== -1;
      }).map(function (item) {
        return {
          operationalOverrideId: item.operationalOverrideId, branchId: item.branchId,
          staffId: item.staffId, date: item.date, startTime: item.startTime,
          endTime: item.endTime, status: item.status, reason: item.reason
        };
      });
      return jsonOutput({ status: "success", operationalOverrides: overrides });
    }
    if (data.action === "listBookingAvailabilityAudit") {
      if (!bookingAvailabilityPhase5HasPermission(actor, "booking_availability.view_audit")) {
        throw BookingAvailabilityPhase5.availabilityError(
          "AVAILABILITY_PERMISSION_DENIED", "Booking Availability audit permission is required.");
      }
      var audits = schedulePhase2ReadRows("BOOKING_AVAILABILITY_AUDIT").filter(function (item) {
        return actor.owner || (actor.branchIds || []).indexOf(item.branchId) !== -1;
      }).map(function (item) {
        return {
          auditId: item.auditId, action: item.action, entityType: item.entityType,
          entityId: item.entityId, branchId: item.branchId, staffId: item.staffId,
          date: item.date, actorId: item.actorId, actorRole: item.actorRole,
          reasonCode: item.reasonCode, sourceIds: item.sourceIds,
          beforeState: item.beforeState, afterState: item.afterState,
          requestId: item.requestId, createdAt: item.createdAt
        };
      });
      return jsonOutput({ status: "success", audit: audits });
    }
    if (data.action === "transitionBookingAvailabilityConflict") {
      return jsonOutput({
        status: "success", conflict: bookingAvailabilityPhase5TransitionConflict(data, actor)
      });
    }
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_ACTION_UNKNOWN", "Booking Availability action is not supported.");
  } catch (error) {
    return jsonOutput({
      status: "error", code: error.code || "AVAILABILITY_INTERNAL_ERROR",
      message: error.message || "Booking Availability request failed.",
      details: error.details || undefined
    });
  }
}
