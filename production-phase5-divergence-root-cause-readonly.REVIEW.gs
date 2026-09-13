// LOCAL REVIEW ONLY. Temporary Production HEAD diagnostic; never bundle or deploy.
// Does not activate SHADOW. Requires the exact existing SHADOW baseline.
function previewProductionPhase5DivergenceReadOnly() {
  var stage = "identity";
  var code = "IDENTITY_CHECK_FAILED";
  try {
    var scriptId = "1UmjdRMGLukMt_0Be_ZL2krphwtZ-CQHPOiZ3GF10pY9-glgvoubfGflP";
    var spreadsheetId = "1r0I9J-IZF1GhMC4Yvj73S8VdjJQxMfmOgP4v0ZFNOb0";
    var props = PropertiesService.getScriptProperties();
    function requireValue(condition, failureCode) {
      if (!condition) { code = failureCode; throw new Error(failureCode); }
    }
    requireValue(ScriptApp.getScriptId() === scriptId, "SCRIPT_ID_MISMATCH");
    requireValue(props.getProperty("CUT_HUB_ENVIRONMENT") === "production", "ENVIRONMENT_MISMATCH");
    requireValue(props.getProperty("CUT_HUB_PRODUCTION_SPREADSHEET_ID") === spreadsheetId,
      "SPREADSHEET_PIN_MISMATCH");
    var spreadsheet = SpreadsheetApp.getActive();
    requireValue(spreadsheet && spreadsheet.getId() === spreadsheetId, "ACTIVE_SPREADSHEET_MISMATCH");
    function email(user) {
      return String(user && user.getEmail ? user.getEmail() : "").trim().toLowerCase();
    }
    var active = email(Session.getActiveUser());
    var effective = email(Session.getEffectiveUser());
    var owner = email(DriveApp.getFileById(spreadsheetId).getOwner());
    requireValue(active && effective && owner && active === effective && active === owner,
      "PRODUCTION_OWNER_REQUIRED");

    stage = "baseline";
    code = "BASELINE_CHECK_FAILED";
    var baselineFields = [
      ["BOOKING_AVAILABILITY_ENGINE", "engine", "SHADOW"],
      ["BOOKING_PHASE2_PLANNED_ENABLED", "plannedEnabled", "true"],
      ["BOOKING_ATTENDANCE_LIVE_ENABLED", "attendanceLiveEnabled", "false"],
      ["BOOKING_CUSTOMER_LIVE_REFRESH_ENABLED", "customerLiveRefreshEnabled", "false"],
      ["BOOKING_INTERNAL_LIVE_REFRESH_ENABLED", "internalLiveRefreshEnabled", "false"],
      ["BOOKING_MANAGER_OVERRIDE_ENABLED", "managerOverrideEnabled", "false"],
      ["BOOKING_CONFLICT_RESOLUTION_ENABLED", "conflictResolutionEnabled", "false"],
      ["BOOKING_NO_CHECK_IN_DETECTOR_ENABLED", "noCheckInDetectorEnabled", "false"]
    ];
    function readBaseline(failureCode) {
      var values = {};
      baselineFields.forEach(function (field) {
        values[field[1]] = props.getProperty(field[0]);
      });
      requireValue(baselineFields.every(function (field) {
        return values[field[1]] === field[2];
      }), failureCode);
      return values;
    }
    var baseline = readBaseline("BASELINE_MISMATCH");
    var canary = Object.freeze({
      branchId: "CUT_HUB_MAIN", date: "2026-09-30",
      serviceId: "SRV-bb949f91-2808-487f-aaa6-0d3e47790e37", staffId: "1784232573966",
      expectedStaffName: "osama", durationMinutes: 30,
      preparationMinutes: 0, cleanupMinutes: 0, audience: "public"
    });

    stage = "service";
    code = "SERVICE_READ_FAILED";
    var services = publicBookingServices().filter(function (service) {
      return service.serviceId === canary.serviceId;
    });
    requireValue(services.length === 1, "SERVICE_NOT_UNIQUE_OR_NOT_PUBLIC");
    var service = services[0];
    requireValue(service.active === true, "SERVICE_NOT_ACTIVE");
    requireValue(service.durationMinutes === canary.durationMinutes && service.preparationMinutes === canary.preparationMinutes &&
      service.cleanupMinutes === canary.cleanupMinutes, "SERVICE_TIMING_MISMATCH");

    stage = "staff";
    code = "STAFF_READ_FAILED";
    // Keep the complete public barber list for LEGACY's name-disambiguation behavior.
    var barbers = publicBookingBarbers();
    var matches = barbers.filter(function (barber) { return barber.staffId === canary.staffId; });
    requireValue(matches.length === 1, "STAFF_NOT_UNIQUE_OR_NOT_PUBLIC");
    var barber = matches[0];
    requireValue(barber.active === true && barber.isBarber === true, "STAFF_NOT_ACTIVE_PUBLIC_BARBER");
    requireValue(barber.branchId === canary.branchId, "STAFF_BRANCH_MISMATCH");
    requireValue(barber.name === canary.expectedStaffName, "STAFF_NAME_MISMATCH");

    stage = "snapshot";
    code = "SNAPSHOT_READ_FAILED";
    var snapshot = bookingAvailabilityPhase5RequestSnapshot();
    var snapshotStaff = snapshot.staff.filter(function (staff) { return staff.staffId === canary.staffId; });
    requireValue(snapshotStaff.length === 1 && snapshotStaff[0].active === true &&
      snapshotStaff[0].branchId === canary.branchId, "SNAPSHOT_STAFF_MISMATCH");
    var bookings = snapshot.bookings;
    var serviceSetHash = bookingServiceSetHash(services, [canary.serviceId]);


    // PINNED_CORE_COPY: availabilityError
  function availabilityError(code, message, details) {
    const error = new Error(message || code);
    error.code = code;
    if (details !== undefined) error.details = details;
    return error;
  }

    // PINNED_CORE_COPY: text
  function text(value) {
    return String(value === undefined || value === null ? "" : value).trim();
  }

    // PINNED_CORE_COPY: upper
  function upper(value) {
    return text(value).toUpperCase();
  }

    // PINNED_CORE_COPY: number
  function number(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : (fallback === undefined ? 0 : fallback);
  }

    // PINNED_CORE_COPY: clockMinutes
  function clockMinutes(value) {
    const match = text(value).match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  }

    // PINNED_CORE_COPY: timelineMinutes
  function timelineMinutes(value, anchor) {
    let minute = clockMinutes(value);
    const anchorMinute = clockMinutes(anchor);
    if (minute === null || anchorMinute === null) return null;
    if (minute < anchorMinute) minute += 1440;
    return minute;
  }

    // PINNED_CORE_COPY: timeText
  function timeText(value) {
    const normalized = ((Math.round(value) % 1440) + 1440) % 1440;
    return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
  }

    // PINNED_CORE_COPY: normalizeInterval
  function normalizeInterval(date, start, end, anchor) {
    const startMinute = anchor ? timelineMinutes(start, anchor) : clockMinutes(start);
    let endMinute = anchor ? timelineMinutes(end, anchor) : clockMinutes(end);
    if (startMinute === null || endMinute === null) {
      throw availabilityError("AVAILABILITY_INTERVAL_INVALID", "Availability interval has an invalid clock value.");
    }
    if (endMinute <= startMinute) endMinute += 1440;
    return { date, start: text(start), end: text(end), startMinute, endMinute };
  }

    // PINNED_CORE_COPY: overlaps
  function overlaps(leftStart, leftEnd, rightStart, rightEnd) {
    return leftStart < rightEnd && leftEnd > rightStart;
  }

    // PINNED_CORE_COPY: contains
  function contains(container, start, end) {
    return start >= container.startMinute && end <= container.endMinute;
  }

    // PINNED_CORE_COPY: blockingClassification
  function blockingClassification(value) {
    return [
      "INACTIVE_STAFF", "WEEKLY_DAY_OFF", "DAY_OFF", "APPROVED_LEAVE",
      "UNPAID_LEAVE", "SICK_LEAVE", "ABSENT", "BRANCH_CLOSED",
      "CLOSED", "NOT_SCHEDULED", "UNRESOLVED"
    ].includes(upper(value));
  }

    // PINNED_CORE_COPY: bookingBlocks
  function bookingBlocks(booking, serverNowMs) {
    if (!booking || booking.deleted) return false;
    const status = upper(booking.status);
    if (status === "CONFIRMED" || status === "PROPOSED") return true;
    if (status !== "PENDING") return false;
    if (!booking.holdExpiresAt) return true;
    const expiry = Date.parse(booking.holdExpiresAt);
    return !Number.isFinite(expiry) || expiry > serverNowMs;
  }

    // PINNED_CORE_COPY: bookingInterval
  function bookingInterval(booking, date, anchor) {
    const proposed = upper(booking.status) === "PROPOSED" && booking.proposedDate && booking.proposedTime;
    const occupiedDate = proposed ? booking.proposedDate : booking.date;
    if (occupiedDate !== date) return null;
    const occupiedTime = proposed ? booking.proposedTime : booking.time;
    const hasSnapshot = !!text(booking.occupiedStartTime) || !!text(booking.occupiedEndTime);
    const snapshotStart = text(booking.occupiedStartTime);
    const snapshotEnd = text(booking.occupiedEndTime);
    if (hasSnapshot && (!snapshotStart || !snapshotEnd ||
        clockMinutes(snapshotStart) === null ||
        clockMinutes(snapshotEnd) === null ||
        !Number.isFinite(Number(booking.serviceDurationSnapshot)) ||
        Number(booking.serviceDurationSnapshot) < 15 ||
        !Number.isFinite(Number(booking.preparationMinutesSnapshot)) ||
        Number(booking.preparationMinutesSnapshot) < 0 ||
        !Number.isFinite(Number(booking.cleanupMinutesSnapshot)) ||
        Number(booking.cleanupMinutesSnapshot) < 0)) {
      throw availabilityError(
        "AVAILABILITY_BOOKING_SNAPSHOT_INVALID",
        "A persisted Booking occupancy snapshot is malformed.");
    }
    const appointmentMinute = timelineMinutes(occupiedTime, anchor);
    if (appointmentMinute === null) return null;
    let startMinute = hasSnapshot ? clockMinutes(snapshotStart) : appointmentMinute;
    if (hasSnapshot) {
      while (startMinute > appointmentMinute) startMinute -= 1440;
      while (startMinute <= appointmentMinute - 1440) startMinute += 1440;
    }
    const preparation = Math.max(0, number(
      booking.preparationMinutesSnapshot, number(booking.preparationMinutes, 0)));
    const cleanup = Math.max(0, number(
      booking.cleanupMinutesSnapshot, number(booking.cleanupMinutes, 0)));
    const duration = Math.max(15, number(
      booking.serviceDurationSnapshot, number(booking.durationMinutes, 30)));
    let endMinute = hasSnapshot ? clockMinutes(snapshotEnd) :
      startMinute + duration + cleanup;
    if (hasSnapshot) {
      while (endMinute <= appointmentMinute) endMinute += 1440;
      while (endMinute > appointmentMinute + 1440) endMinute -= 1440;
    }
    return {
      startMinute: hasSnapshot ? startMinute : startMinute - preparation,
      endMinute: endMinute,
      bookingId: text(booking.id || booking.bookingId)
    };
  }

    // PINNED_CORE_COPY: operationalDecision
  function operationalDecision(input, slot) {
    const data = input || {};
    if (data.date !== data.today || data.attendanceLiveEnabled === false) {
      return { allowed: true, reasonCode: "AVAILABLE" };
    }
    const attendance = data.attendance || {};
    const state = upper(attendance.state || attendance.status || "NOT_STARTED");
    const lifecycle = upper(attendance.dayLifecycle || "OPEN");
    const override = data.audience === "internal" &&
      (data.operationalOverrideIntervals || []).some(interval =>
        contains(interval, slot.occupiedStartMinute, slot.occupiedEndMinute));
    const now = number(data.serverNowMinute, 0);
    const firstShift = number(data.firstShiftMinute, 0);
    const grace = number(data.noCheckInGraceMinutes, DEFAULTS.noCheckInGraceMinutes);

    if (slot.startMinute < now + number(data.sameDayLeadMinutes, DEFAULTS.sameDayLeadMinutes) +
        number(data.preparationMinutes, 0)) {
      return { allowed: false, reasonCode: "ALREADY_STARTED" };
    }
    if (lifecycle === "REOPENED" || state === "UNRESOLVED" || attendance.staleCalculation) {
      return override
        ? { allowed: true, reasonCode: "ALLOWED_BY_OPERATIONAL_OVERRIDE" }
        : { allowed: false, reasonCode: "UNRESOLVED_ATTENDANCE", conflictCode: "UNRESOLVED_ATTENDANCE_CONFLICT" };
    }
    if (state === "ABSENT") {
      return override
        ? { allowed: true, reasonCode: "ALLOWED_BY_OPERATIONAL_OVERRIDE" }
        : { allowed: false, reasonCode: "STAFF_OPERATIONALLY_UNAVAILABLE", conflictCode: "STAFF_ABSENT_WITH_FUTURE_BOOKINGS" };
    }
    if (state === "NOT_STARTED" && now > firstShift + grace) {
      return override
        ? { allowed: true, reasonCode: "ALLOWED_BY_OPERATIONAL_OVERRIDE" }
        : { allowed: false, reasonCode: "NO_CHECK_IN", conflictCode: "NO_CHECK_IN_CONFLICT" };
    }
    if (state === "ON_BREAK") {
      const openBreak = attendance.openBreak !== false;
      const breaks = Array.isArray(attendance.breaks) ? attendance.breaks : [];
      if (openBreak) {
        return override
          ? { allowed: true, reasonCode: "ALLOWED_BY_OPERATIONAL_OVERRIDE" }
          : { allowed: false, reasonCode: "OPEN_BREAK", conflictCode: "OPEN_BREAK_CONFLICT" };
      }
      const intersects = breaks.some(item => {
        if (!item.startedAt || !item.endedAt) return false;
        const start = timelineMinutes(text(item.startedAt).slice(11, 16), data.anchor);
        const end = timelineMinutes(text(item.endedAt).slice(11, 16), data.anchor);
        return start !== null && end !== null && overlaps(slot.startMinute, slot.endMinute, start, end);
      });
      if (intersects) return { allowed: false, reasonCode: "BREAK_INTERVAL" };
    }
    if (state === "CHECKED_OUT") {
      const checkoutClock = text(attendance.actualCheckOut).slice(11, 16) ||
        text(attendance.actualCheckOut).slice(-5);
      const checkout = timelineMinutes(checkoutClock, data.anchor);
      if (checkout !== null && checkout < number(data.lastShiftMinute, checkout) &&
          slot.startMinute >= checkout) {
        return override
          ? { allowed: true, reasonCode: "ALLOWED_BY_OPERATIONAL_OVERRIDE" }
          : { allowed: false, reasonCode: "EARLY_CHECKOUT", conflictCode: "EARLY_CHECKOUT_CONFLICT" };
      }
    }
    return { allowed: true, reasonCode: "AVAILABLE" };
  }

    var DEFAULTS = BookingAvailabilityPhase5.DEFAULTS;

    // Only explicit projections leave this function. No exception payload is exposed.
    function safeTime(value) {
      requireValue(typeof value === "string" && clockMinutes(value) !== null, "UNSAFE_TIME_VALUE");
      return value;
    }
    function safeEnum(value, values) {
      requireValue(values.indexOf(value) !== -1, "UNSAFE_METADATA_VALUE");
      return value;
    }
    var classifications = ["WORKING_DAY", "INACTIVE_STAFF", "WEEKLY_DAY_OFF", "DAY_OFF",
      "APPROVED_LEAVE", "UNPAID_LEAVE", "SICK_LEAVE", "ABSENT", "BRANCH_CLOSED",
      "CLOSED", "NOT_SCHEDULED", "UNRESOLVED", "NO_SHIFT"];
    var sources = ["NONE", "OVERRIDE", "RECURRING_DAY_OFF", "CUSTOM_SHIFT", "RECURRING", "POLICY_FALLBACK"];
    var reasons = classifications.concat(["AVAILABLE", "UNAVAILABLE", "STAFF_UNAVAILABLE", "PAST_DATE",
      "BRANCH_SCOPE_MISMATCH", "NO_AVAILABLE_SLOTS", "UNRESOLVED_ATTENDANCE",
      "STAFF_OPERATIONALLY_UNAVAILABLE", "NO_CHECK_IN", "OPEN_BREAK", "EARLY_CHECKOUT",
      "BREAK_INTERVAL", "ALREADY_STARTED", "OPERATIONALLY_UNAVAILABLE"]);
    function projectSchedule(value) {
      return {
        active: !!value.active,
        classification: safeEnum(upper(value.classification || "NO_SHIFT"), classifications),
        sourceType: safeEnum(text(value.sourceType || "NONE"), sources),
        sourceIds: (value.sourceIds || []).map(function (id) {
          // Schedule identifiers are explicitly allowed; never take IDs from Bookings.
          requireValue(typeof id === "string" && /^[A-Za-z0-9_-]{1,160}$/.test(id), "UNSAFE_SOURCE_ID");
          return id;
        }),
        shiftSegments: (value.shiftSegments || []).map(function (s) {
          return { shiftStart: safeTime(s.shiftStart), shiftEnd: safeTime(s.shiftEnd) };
        }),
        blockedIntervals: (value.blockedIntervals || []).map(function (b) {
          return { start: safeTime(b.start || b.blockStart), end: safeTime(b.end || b.blockEnd) };
        })
      };
    }
    function legacyProjection(list) {
      // These are the exact two scheduling readers used by availableSlotsForBarberLegacy.
      var s = getScheduleForBarber(barber, canary.date, list);
      var a = s.scheduled ? getAttendanceOverride(barber, canary.date, list) : null;
      var unavailable = !!(a && a.unavailable);
      return {
        scheduled: !!s.scheduled, shiftStart: safeTime(s.shiftStart), shiftEnd: safeTime(s.shiftEnd),
        source: null,
        attendanceOverrideApplied: !!(a && (unavailable || a.shiftStart || a.checkOut)),
        effectiveShiftStart: s.scheduled && !unavailable ? safeTime(a && a.shiftStart || s.shiftStart) : null,
        effectiveShiftEnd: s.scheduled && !unavailable ? safeTime(a && a.checkOut || s.shiftEnd) : null
      };
    }
    function branchProjection(input) {
      var branch = bookingAvailabilityPhase5Branch(canary.branchId, { publicAudience: true }, input.branches);
      var zone = text(branch.timeZone) || BookingAvailabilityPhase5.TIME_ZONE;
      // Use the branch configuration validated by the production resolver and formatter.
      var intervals = bookingAvailabilityPhase5BranchSegments(canary.branchId, canary.date, zone, input.branchHours)
        .map(function (s) { return { start: safeTime(s.start), end: safeTime(s.end) }; });
      return { weekday: bookingAvailabilityPhase5Weekday(canary.date, zone), timeZone: zone,
        branchOpen: intervals.length > 0, matchingRowCount: intervals.length,
        normalizedHours: intervals.map(function (s) { return { openTime: s.start, closeTime: s.end }; }),
        branchSegments: intervals };
    }
    function fields(row, names) {
      return names.map(function (name) {
        var value = row[name];
        // The typed branch-hours reader preserves Date cells; stable({Date}) alone loses their value.
        return value instanceof Date ? value.getTime() : value === undefined ? null : value;
      });
    }
    function fingerprint(input, list, legacy) {
      // Canonical structural input fingerprint retained locally, never included in output.
      // Keep order and duplicates because first-row selection and occupancy counts depend on them.
      var structural = {
        staff: input.staff.filter(function (s) { return s.staffId === canary.staffId; })
          .map(function (s) { return fields(s, ["active", "branchId"]); }),
        schedules: input.schedules.filter(function (s) { return s.staffId === canary.staffId; })
          .map(function (s) { return fields(s, ["scheduleId", "active", "weekday", "resolutionEligible", "effectiveFrom",
            "effectiveTo", "recordType", "segmentIndex", "shiftStart", "shiftEnd", "requiredWorkMinutes", "allowedBreakMinutes"]); }),
        overrides: input.scheduleOverrides.filter(function (s) {
          return s.scopeType === "ORGANIZATION" || s.branchId === canary.branchId || s.staffId === canary.staffId;
        }).map(function (s) { return fields(s, ["overrideId", "scopeType", "status", "date", "type", "shiftStart",
          "shiftEnd", "segmentIndex", "blockStart", "blockEnd", "requiredWorkMinutes", "allowedBreakMinutes"])
          .concat([s.staffId === canary.staffId, s.branchId === canary.branchId]); }),
        // Every policy's date boundaries are parsed before staff/default precedence is selected.
        policies: input.policies.map(function (s) {
          return fields(s, ["active", "effectiveFrom", "effectiveTo"])
            .concat([text(s.staffId) === canary.staffId, !text(s.staffId)])
            .concat(!text(s.staffId) || text(s.staffId) === canary.staffId ?
              fields(s, ["policyId", "requiredDailyMinutes", "allowedBreakMinutes"]) : []);
        }),
        hours: input.branchHours.filter(function (s) { return text(s.branchId) === canary.branchId; })
          .map(function (s) { return fields(s, ["weekday", "active", "effectiveFrom", "effectiveTo", "openTime", "closeTime"]); }),
        branches: input.branches.filter(function (s) { return text(s.branchId) === canary.branchId; })
          .map(function (s) { return fields(s, ["active", "publicSelectable", "closureStatus", "timeZone"]); }),
        bookings: input.bookings.filter(function (b) { return b.date === canary.date || b.proposedDate === canary.date; })
          .map(function (b) {
            return fields(b, ["date", "time", "proposedDate", "proposedTime", "status", "deleted", "durationMinutes",
              "occupiedStartTime", "occupiedEndTime", "serviceDurationSnapshot", "preparationMinutesSnapshot", "cleanupMinutesSnapshot"])
              .concat([Number.isFinite(Date.parse(b.holdExpiresAt)) ? Date.parse(b.holdExpiresAt) : null,
                b.id === "", bookingEmployeeMatchesV2(b, canary.staffId, barber.name, list)]);
          }),
        legacy: legacy
      };
      // Canonical equality also avoids relying on a short hash's collision resistance.
      return BookingAvailabilityPhase5.stable(structural);
    }
    stage = "inputs"; code = "INPUT_READ_FAILED";
    var legacySchedule = legacyProjection(barbers);
    var inputFingerprint = fingerprint(snapshot, barbers, legacySchedule);
    var phase5Schedule = projectSchedule(bookingAvailabilityPhase5ResolveSchedule(snapshotStaff[0], canary.date, snapshot));
    var branchHours = branchProjection(snapshot);
    var now = new Date();
    var today = Utilities.formatDate(now, branchHours.timeZone, "yyyy-MM-dd");
    var earlyRejectionCodes = [];
    if (!canary.date || !snapshotStaff[0].staffId || !snapshotStaff[0].active) earlyRejectionCodes.push("STAFF_UNAVAILABLE");
    if (today && canary.date < today) earlyRejectionCodes.push("PAST_DATE");
    if (!text(canary.branchId) || text(snapshotStaff[0].branchId) !== text(canary.branchId)) earlyRejectionCodes.push("BRANCH_SCOPE_MISMATCH");
    if (!branchHours.branchOpen) earlyRejectionCodes.push("BRANCH_CLOSED");
    if (!phase5Schedule.active || blockingClassification(phase5Schedule.classification)) earlyRejectionCodes.push(phase5Schedule.classification);
    if (!phase5Schedule.shiftSegments.length) earlyRejectionCodes.push("NO_SHIFT");
    var rawSegments = phase5Schedule.shiftSegments;
    // With no shift the core rejects before occupancy; use a fixed clock anchor solely for aggregate diagnostics.
    var anchor = rawSegments.length ? rawSegments[0].shiftStart : "00:00";
    var segments = rawSegments.map(function (s) { return normalizeInterval(canary.date, s.shiftStart, s.shiftEnd, anchor); })
      .sort(function (a, b) { return a.startMinute - b.startMinute || a.endMinute - b.endMinute; });
    requireValue(!segments.some(function (s, i) { return i > 0 && s.startMinute < segments[i - 1].endMinute; }), "SCHEDULE_AMBIGUOUS");
    var branches = branchHours.branchSegments.map(function (s) { return normalizeInterval(canary.date, s.start, s.end); });
    var blocks = phase5Schedule.blockedIntervals.map(function (s) { return normalizeInterval(canary.date, s.start, s.end, anchor); });
    // Adapter compatibility conversion is part of the current committed behavior.
    var intervals = bookingAvailabilityPhase5BookingBuffers(bookings).filter(function (b) { return bookingBlocks(b, now.getTime()); })
      .map(function (b) {
        var interval = bookingInterval(b, canary.date, anchor);
        if (!interval) return null;
        return { startMinute: interval.startMinute, endMinute: interval.endMinute,
          target: bookingEmployeeMatchesV2(b, canary.staffId, barber.name, barbers) };
      }).filter(Boolean);
    function bookingBlocked(start, otherOnly) {
      var minute = timelineMinutes(start, anchor);
      return intervals.some(function (b) { return (!otherOnly || !b.target) && overlaps(minute, minute + 30, b.startMinute, b.endMinute); });
    }
    function legacyBlocked(start) {
      return !bookingSlotIsFree(canary.staffId, barber.name, canary.date, start, 30, "", bookings,
        legacySchedule.effectiveShiftStart || legacySchedule.shiftStart, barbers);
    }
    var occupancy = {
      phase5BlockingIntervalCount: intervals.length,
      targetStaffBlockingIntervalCount: intervals.filter(function (b) { return b.target; }).length,
      otherOrUnmatchedStaffBlockingIntervalCount: intervals.filter(function (b) { return !b.target; }).length,
      phase5BlockingIntervals: intervals.map(function (b) { return { start: timeText(b.startMinute), end: timeText(b.endMinute) }; }),
      legacyBlockedAt1300: legacyBlocked("13:00"), legacyBlockedAt1330: legacyBlocked("13:30"),
      phase5BlockedAt1300: bookingBlocked("13:00", false), phase5BlockedAt1330: bookingBlocked("13:30", false),
      otherOrUnmatchedStaffBlocks1300: bookingBlocked("13:00", true), otherOrUnmatchedStaffBlocks1330: bookingBlocked("13:30", true)
    };
    stage = "trace"; code = "TRACE_FAILED";
    var candidates = ["13:00", "13:30"].map(function (start) {
      var minute = timelineMinutes(start, anchor), end = minute + 30;
      var onGrid = segments.some(function (s) {
        return minute >= s.startMinute && end <= s.endMinute && (minute - s.startMinute) % Math.max(5, DEFAULTS.slotIntervalMinutes) === 0;
      });
      var insideSchedule = segments.some(function (s) { return contains(s, minute, end); });
      var insideBranch = branches.some(function (s) { return contains(s, minute, end); });
      var scheduleBlock = blocks.some(function (s) { return overlaps(minute, end, s.startMinute, s.endMinute); });
      var bookingBlock = bookingBlocked(start, false);
      var elimination = earlyRejectionCodes.length ? "NOT_EVALUABLE" : !onGrid ? "NOT_ON_GRID" :
        !insideSchedule ? "SCHEDULE" : !insideBranch ? "BRANCH_HOURS" : scheduleBlock ? "SCHEDULE_BLOCK" : bookingBlock ? "BOOKING" : null;
      var decision = elimination ? null : operationalDecision({ date: canary.date, today: today, attendanceLiveEnabled: false },
        { startMinute: minute, endMinute: end, occupiedStartMinute: minute, occupiedEndMinute: end });
      if (!elimination) elimination = decision.allowed ? "AVAILABLE" : "OPERATIONAL";
      return { start: start, end: timeText(end), onGenerationGrid: onGrid, insideSchedule: insideSchedule,
        insideBranchHours: insideBranch, blockedByScheduleBlock: scheduleBlock, blockedByBooking: bookingBlock,
        allowedByOperationalDecision: decision ? decision.allowed : null,
        operationalReasonCode: decision ? safeEnum(decision.reasonCode, reasons) : null,
        finalAvailable: elimination === "AVAILABLE", firstEliminationStage: elimination };
    });
    stage = "evaluate"; code = "PHASE5_EVALUATE_FAILED";
    var result = bookingAvailabilityPhase5Evaluate({ employeeId: canary.staffId, branchId: canary.branchId,
      date: canary.date, audience: canary.audience, durationMinutes: canary.durationMinutes,
      preparationMinutes: canary.preparationMinutes, cleanupMinutes: canary.cleanupMinutes,
      serviceSetHash: serviceSetHash, snapshot: snapshot, bookings: snapshot.bookings, finalValidation: true });
    var phase5Result = {
      availability: safeEnum(result.availability, ["AVAILABLE", "UNAVAILABLE"]),
      reasonCode: safeEnum(result.reasonCode, reasons),
      publicReasonCode: safeEnum(BookingAvailabilityPhase5.publicDto(result).reasonCode, reasons),
      scheduleSource: safeEnum(result.scheduleSource, sources),
      operationalRestriction: safeEnum(result.operationalRestriction, [""].concat(reasons)),
      slots: result.slots.map(function (s) { return { start: safeTime(s.start), end: safeTime(s.end) }; })
    };
    var traceMatchesEvaluate = candidates.every(function (c) {
      return c.finalAvailable === phase5Result.slots.some(function (s) { return s.start === c.start; });
    });
    requireValue(traceMatchesEvaluate, "TRACE_EVALUATE_MISMATCH");
    var rootCauseCandidates = [];
    // Compare effective coverage, merging adjacent segments to avoid cosmetic divergence.
    function coverage(rows) {
      var merged = [];
      // Compare clock coverage across midnight, including an equivalent split overnight shift.
      var circular = [];
      rows.forEach(function (s) {
        if (s.endMinute > 1440) {
          circular.push({ startMinute: s.startMinute, endMinute: 1440 });
          circular.push({ startMinute: 0, endMinute: s.endMinute - 1440 });
        } else circular.push(s);
      });
      circular.sort(function (a, b) { return a.startMinute - b.startMinute; }).forEach(function (s) {
        var previous = merged[merged.length - 1];
        if (previous && previous.endMinute >= s.startMinute) previous.endMinute = Math.max(previous.endMinute, s.endMinute);
        else merged.push({ startMinute: s.startMinute, endMinute: s.endMinute });
      });
      return JSON.stringify(merged);
    }
    var legacyCoverage = legacySchedule.effectiveShiftStart ?
      [normalizeInterval(canary.date, legacySchedule.effectiveShiftStart, legacySchedule.effectiveShiftEnd)] : [];
    var phaseCoverage = phase5Schedule.active && !blockingClassification(phase5Schedule.classification) ?
      rawSegments.map(function (s) { return normalizeInterval(canary.date, s.shiftStart, s.shiftEnd); }) : [];
    if (coverage(legacyCoverage) !== coverage(phaseCoverage)) rootCauseCandidates.push("SCHEDULE_RESOLVER_DIVERGENCE");
    if (candidates.some(function (c) { return c.insideSchedule && !c.insideBranchHours; })) rootCauseCandidates.push("BRANCH_HOURS_INTERSECTION");
    if ((occupancy.otherOrUnmatchedStaffBlocks1300 && !occupancy.legacyBlockedAt1300) ||
        (occupancy.otherOrUnmatchedStaffBlocks1330 && !occupancy.legacyBlockedAt1330)) rootCauseCandidates.push("BOOKING_OCCUPANCY_SCOPE_DIVERGENCE");
    if (candidates.some(function (c) { return c.firstEliminationStage === "SCHEDULE_BLOCK"; })) rootCauseCandidates.push("SCHEDULE_BLOCK");
    if (candidates.some(function (c) { return c.insideSchedule && !c.onGenerationGrid; })) rootCauseCandidates.push("GENERATION_GRID");
    if (candidates.some(function (c) { return c.firstEliminationStage === "OPERATIONAL"; })) rootCauseCandidates.push("OPERATIONAL_RESTRICTION");
    if (earlyRejectionCodes.some(function (c) { return ["PAST_DATE", "STAFF_UNAVAILABLE", "BRANCH_SCOPE_MISMATCH"].indexOf(c) !== -1; }))
      rootCauseCandidates.push("OTHER_DETERMINISTIC_RULE");
    stage = "stability"; code = "INPUT_RECHECK_FAILED";
    // Re-read only diagnostic input tables, not a second Phase5 request snapshot.
    var fresh = { staff: schedulePhase2ReadStaff(), schedules: schedulePhase2ReadSchedules(),
      scheduleOverrides: schedulePhase2ReadRows("STAFF_SCHEDULE_OVERRIDES"), policies: schedulePhase2ReadRows("STAFF_WORK_POLICIES"),
      branchHours: bookingAvailabilityPhase5ReadBranchHours(), branches: schedulePhase2ReadRows("BOOKING_BRANCH_REGISTRY"),
      bookings: getAllBookingsV2() };
    var freshBarbers = publicBookingBarbers();
    requireValue(inputFingerprint === fingerprint(fresh, freshBarbers, legacyProjection(freshBarbers)), "INPUT_CHANGED_DURING_DIAGNOSTIC");
    // Pending expiry and date rollover can change decisions without a row change.
    requireValue(today === Utilities.formatDate(new Date(), branchHours.timeZone, "yyyy-MM-dd") &&
      bookings.every(function (b) { return bookingBlocks(b, now.getTime()) === bookingBlocks(b, Date.now()); }),
      "INPUT_CHANGED_DURING_DIAGNOSTIC");
    stage = "baseline_recheck"; code = "BASELINE_RECHECK_FAILED";
    readBaseline("BASELINE_CHANGED_DURING_DIAGNOSTIC");
    return { status: "success", diagnostic: "PRODUCTION_PHASE5_DIVERGENCE_READONLY",
      identity: { scriptId: scriptId, spreadsheetId: spreadsheetId, environment: "production", ownerVerified: true },
      canary: canary, baseline: baseline, authority: "LEGACY", legacySchedule: legacySchedule,
      phase5Schedule: phase5Schedule, branchHours: branchHours, occupancy: occupancy,
      earlyRejectionCodes: earlyRejectionCodes, candidates: candidates, phase5Result: phase5Result,
      traceMatchesEvaluate: traceMatchesEvaluate, rootCauseCandidates: rootCauseCandidates,
      writes: { spreadsheet: 0, scriptProperties: 0, cache: 0, triggers: 0 } };
  } catch (ignored) {
    return { status: "error", diagnostic: "PRODUCTION_PHASE5_DIVERGENCE_READONLY_FAILED", stage: stage, code: code };
  }
}
