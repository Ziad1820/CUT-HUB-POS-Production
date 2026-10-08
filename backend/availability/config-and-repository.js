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

