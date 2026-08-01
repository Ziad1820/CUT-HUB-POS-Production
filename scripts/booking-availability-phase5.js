(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.BookingAvailabilityPhase5 = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = "BOOKING_AVAILABILITY_PHASE5_V1";
  const TIME_ZONE = "Africa/Cairo";
  const ENGINE_MODES = Object.freeze(["LEGACY", "SHADOW", "PHASE5"]);
  const DEFAULTS = Object.freeze({
    noCheckInGraceMinutes: 15,
    sameDayLeadMinutes: 15,
    preparationMinutes: 0,
    cleanupMinutes: 0,
    slotIntervalMinutes: 30
  });
  const MAX_GENERATION = 9007199254740000;
  const PERMISSIONS = Object.freeze([
    "booking_availability.view",
    "booking_availability.view_operational",
    "booking_availability.view_restrictions",
    "booking_availability.manage_override",
    "booking_availability.resolve_conflict",
    "booking_availability.override_internal",
    "booking_availability.view_audit"
  ]);
  const CONFLICT_CODES = Object.freeze([
    "STAFF_OPERATIONALLY_UNAVAILABLE",
    "BOOKING_REQUIRES_MANAGER_ACTION",
    "STAFF_ABSENT_WITH_FUTURE_BOOKINGS",
    "OPEN_BREAK_CONFLICT",
    "EARLY_CHECKOUT_CONFLICT",
    "NO_CHECK_IN_CONFLICT",
    "SCHEDULE_OVERRIDE_CONFLICT",
    "BRANCH_CLOSURE_CONFLICT",
    "UNRESOLVED_ATTENDANCE_CONFLICT"
  ]);
  const CONFLICT_TRANSITIONS = Object.freeze({
    OPEN: ["ACKNOWLEDGED", "DISMISSED_WITH_REASON"],
    ACKNOWLEDGED: ["RESOLVED", "DISMISSED_WITH_REASON"],
    RESOLVED: [],
    DISMISSED_WITH_REASON: []
  });
  const SHEET_SCHEMAS = Object.freeze({
    BOOKING_BRANCH_REGISTRY: Object.freeze([
      "BRANCH_ID", "BRANCH_NAME", "ACTIVE", "TIME_ZONE", "PUBLIC_SELECTABLE",
      "CLOSURE_STATUS", "CLOSURE_REASON", "CREATED_AT", "CREATED_BY",
      "UPDATED_AT", "UPDATED_BY", "LAST_REQUEST_ID"
    ]),
    BRANCH_BOOKING_HOURS: Object.freeze([
      "BRANCH_HOURS_ID", "BRANCH_ID", "WEEKDAY", "OPEN_TIME", "CLOSE_TIME",
      "ACTIVE", "EFFECTIVE_FROM", "EFFECTIVE_TO", "CREATED_AT", "CREATED_BY",
      "UPDATED_AT", "UPDATED_BY", "LAST_REQUEST_ID"
    ]),
    BOOKING_AVAILABILITY_VERSIONS: Object.freeze([
      "VERSION_ID", "BRANCH_ID", "DATE", "BOOKING_VERSION", "SCHEDULE_VERSION",
      "ATTENDANCE_OPERATIONAL_VERSION", "OPERATIONAL_OVERRIDE_VERSION",
      "SERVICE_VERSION", "BRANCH_HOURS_VERSION", "UPDATED_AT", "UPDATED_BY"
    ]),
    BOOKING_AVAILABILITY_GENERATIONS: Object.freeze([
      "GENERATION_ID", "SCOPE_TYPE", "SCOPE_ID", "RECURRING_SCHEDULE_GENERATION",
      "SERVICE_GENERATION", "BRANCH_HOURS_GENERATION", "STAFF_MEMBERSHIP_GENERATION",
      "ATTENDANCE_OPERATIONAL_GENERATION", "OPERATIONAL_OVERRIDE_GENERATION",
      "BOOKING_OCCUPANCY_GENERATION", "EPOCH", "UPDATED_AT", "UPDATED_BY",
      "LAST_REQUEST_ID"
    ]),
    BOOKING_AVAILABILITY_TRANSACTIONS: Object.freeze([
      "TRANSACTION_ID", "REQUEST_ID", "ACTION", "ENTITY_TYPE", "ENTITY_ID",
      "BRANCH_ID", "DATE", "ACTOR_ID", "ENVIRONMENT", "STATUS", "WRITE_BOUNDARY",
      "BEFORE_STATE_JSON", "BUSINESS_STATE_JSON", "VERSION_STATE_JSON",
      "AUDIT_STATE_JSON", "RESULT_JSON", "ERROR_CODE", "ERROR_MESSAGE",
      "COMPENSATION_STATE_JSON", "RECOVERY_REQUIRED", "CREATED_AT", "UPDATED_AT"
    ]),
    BOOKING_OPERATIONAL_OVERRIDES: Object.freeze([
      "OPERATIONAL_OVERRIDE_ID", "BRANCH_ID", "STAFF_ID", "DATE", "START_TIME",
      "END_TIME", "STATUS", "REASON", "SOURCE_ATTENDANCE_DAY_ID",
      "SOURCE_EVENT_IDS_JSON", "CREATED_AT", "CREATED_BY", "REVOKED_AT",
      "REVOKED_BY", "REVOCATION_REASON", "LAST_REQUEST_ID"
    ]),
    BOOKING_AVAILABILITY_CONFLICTS: Object.freeze([
      "CONFLICT_ID", "CONFLICT_CODE", "BOOKING_ID", "BRANCH_ID", "STAFF_ID",
      "DATE", "SLOT_START", "SLOT_END", "STATUS", "SCHEDULE_SOURCE_IDS_JSON",
      "ATTENDANCE_DAY_ID", "ATTENDANCE_EVENT_IDS_JSON", "DETECTED_AT",
      "DETECTED_BY", "ACKNOWLEDGED_AT", "ACKNOWLEDGED_BY", "RESOLVED_AT",
      "RESOLVED_BY", "RESOLUTION_REASON", "DISMISSED_AT", "DISMISSED_BY",
      "DISMISSAL_REASON", "LAST_REQUEST_ID"
    ]),
    BOOKING_AVAILABILITY_AUDIT: Object.freeze([
      "AUDIT_ID", "ACTION", "ENTITY_TYPE", "ENTITY_ID", "BRANCH_ID", "STAFF_ID",
      "DATE", "ACTOR_ID", "ACTOR_ROLE", "REASON_CODE", "SOURCE_IDS_JSON",
      "BEFORE_STATE_JSON", "AFTER_STATE_JSON", "REQUEST_ID", "CREATED_AT"
    ])
  });
  const BOOKING_APPEND_HEADERS = Object.freeze([
    "BRANCH_ID", "AVAILABILITY_TOKEN", "SCHEDULE_VERSION",
    "ATTENDANCE_OPERATIONAL_VERSION", "OPERATIONAL_OVERRIDE_ID",
    "VALIDATED_AT", "VALIDATION_SOURCE_VERSION", "SERVICE_DURATION_SNAPSHOT",
    "PREPARATION_MINUTES_SNAPSHOT", "CLEANUP_MINUTES_SNAPSHOT",
    "OCCUPIED_START_TIME", "OCCUPIED_END_TIME", "SERVICE_CONFIGURATION_VERSION"
  ]);
  const SERVICE_APPEND_HEADERS = Object.freeze(["PREPARATION_MINUTES", "CLEANUP_MINUTES"]);

  function availabilityError(code, message, details) {
    const error = new Error(message || code);
    error.code = code;
    if (details !== undefined) error.details = details;
    return error;
  }

  function text(value) {
    return String(value === undefined || value === null ? "" : value).trim();
  }

  function upper(value) {
    return text(value).toUpperCase();
  }

  function bool(value, fallback) {
    if (value === true || upper(value) === "TRUE" || text(value) === "1") return true;
    if (value === false || upper(value) === "FALSE" || text(value) === "0") return false;
    return fallback === true;
  }

  function number(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : (fallback === undefined ? 0 : fallback);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function clockMinutes(value) {
    const match = text(value).match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  }

  function timelineMinutes(value, anchor) {
    let minute = clockMinutes(value);
    const anchorMinute = clockMinutes(anchor);
    if (minute === null || anchorMinute === null) return null;
    if (minute < anchorMinute) minute += 1440;
    return minute;
  }

  function timeText(value) {
    const normalized = ((Math.round(value) % 1440) + 1440) % 1440;
    return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
  }

  function normalizeInterval(date, start, end, anchor) {
    const startMinute = anchor ? timelineMinutes(start, anchor) : clockMinutes(start);
    let endMinute = anchor ? timelineMinutes(end, anchor) : clockMinutes(end);
    if (startMinute === null || endMinute === null) {
      throw availabilityError("AVAILABILITY_INTERVAL_INVALID", "Availability interval has an invalid clock value.");
    }
    if (endMinute <= startMinute) endMinute += 1440;
    return { date, start: text(start), end: text(end), startMinute, endMinute };
  }

  function overlaps(leftStart, leftEnd, rightStart, rightEnd) {
    return leftStart < rightEnd && leftEnd > rightStart;
  }

  function contains(container, start, end) {
    return start >= container.startMinute && end <= container.endMinute;
  }

  function stable(value) {
    if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map(key =>
        `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value === undefined ? null : value);
  }

  function hash(value) {
    const input = typeof value === "string" ? value : stable(value);
    let result = 2166136261;
    for (let index = 0; index < input.length; index += 1) {
      result ^= input.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return (result >>> 0).toString(16).padStart(8, "0");
  }

  function generationValue(value) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= MAX_GENERATION ? parsed : 0;
  }

  function nextGeneration(value, epoch) {
    const current = generationValue(value);
    const currentEpoch = generationValue(epoch);
    return current >= MAX_GENERATION
      ? Object.freeze({ value: 1, epoch: currentEpoch >= MAX_GENERATION ? 1 : currentEpoch + 1, reset: true })
      : Object.freeze({ value: current + 1, epoch: currentEpoch, reset: false });
  }

  function normalizeGenerations(value) {
    const source = value || {};
    return Object.freeze({
      recurringScheduleGeneration: generationValue(source.recurringScheduleGeneration),
      serviceGeneration: generationValue(source.serviceGeneration),
      branchHoursGeneration: generationValue(source.branchHoursGeneration),
      staffMembershipGeneration: generationValue(source.staffMembershipGeneration),
      attendanceOperationalGeneration: generationValue(source.attendanceOperationalGeneration),
      operationalOverrideGeneration: generationValue(source.operationalOverrideGeneration),
      bookingOccupancyGeneration: generationValue(source.bookingOccupancyGeneration),
      epoch: generationValue(source.epoch)
    });
  }

  function validateBranchConfiguration(branch, options) {
    const value = branch || {};
    const branchId = text(value.branchId);
    if (!branchId) throw availabilityError("AVAILABILITY_BRANCH_REQUIRED", "A stable branch ID is required.");
    if (value.active !== true && !(options && options.allowInactive)) {
      throw availabilityError("AVAILABILITY_BRANCH_INACTIVE", "The selected branch is inactive.");
    }
    const timeZone = text(value.timeZone) || TIME_ZONE;
    if (!/^[A-Za-z_]+(?:\/[A-Za-z0-9_+\-]+)+$/.test(timeZone)) {
      throw availabilityError("AVAILABILITY_BRANCH_TIMEZONE_INVALID", "Branch timezone is invalid.");
    }
    if (options && options.publicAudience && value.publicSelectable !== true) {
      throw availabilityError("AVAILABILITY_BRANCH_NOT_PUBLIC", "The selected branch is not publicly selectable.");
    }
    if (upper(value.closureStatus) === "CLOSED" && !(options && options.allowClosed)) {
      throw availabilityError("AVAILABILITY_BRANCH_CLOSED", "The selected branch is closed.");
    }
    return Object.freeze({ branchId, timeZone, active: value.active === true,
      publicSelectable: value.publicSelectable === true });
  }

  function normalizeFlags(values) {
    const source = values || {};
    const mode = upper(source.BOOKING_AVAILABILITY_ENGINE || source.engine || "LEGACY");
    if (!ENGINE_MODES.includes(mode)) {
      throw availabilityError("AVAILABILITY_ENGINE_INVALID", "Booking availability engine mode is invalid.");
    }
    return Object.freeze({
      engine: mode,
      plannedEnabled: bool(source.BOOKING_PHASE2_PLANNED_ENABLED, mode === "PHASE5"),
      attendanceLiveEnabled: bool(source.BOOKING_ATTENDANCE_LIVE_ENABLED, mode === "PHASE5"),
      customerLiveRefreshEnabled: bool(source.BOOKING_CUSTOMER_LIVE_REFRESH_ENABLED, false),
      internalLiveRefreshEnabled: bool(source.BOOKING_INTERNAL_LIVE_REFRESH_ENABLED, false),
      managerOverrideEnabled: bool(source.BOOKING_MANAGER_OVERRIDE_ENABLED, false),
      conflictResolutionEnabled: bool(source.BOOKING_CONFLICT_RESOLUTION_ENABLED, false),
      // This gate is deliberately independent from conflict resolution. A future
      // operator must opt in to detector execution after the Staging runbook is
      // approved; PHASE5 alone must never start scheduled detection.
      noCheckInDetectorEnabled: bool(source.BOOKING_NO_CHECK_IN_DETECTOR_ENABLED, false)
    });
  }

  function executeAuthoritativeEngine(options) {
    const data = options || {};
    const mode = upper(data.mode || "LEGACY");
    if (!ENGINE_MODES.includes(mode)) throw availabilityError("AVAILABILITY_ENGINE_INVALID", "Unknown engine.");
    if (typeof data.legacy !== "function" || typeof data.phase5 !== "function") {
      throw availabilityError("AVAILABILITY_ENGINE_CALLBACK_MISSING", "Both engine callbacks are required.");
    }
    if (mode === "LEGACY") {
      return { authority: "LEGACY", result: data.legacy(), comparison: null };
    }
    if (mode === "SHADOW") {
      const legacyResult = data.legacy();
      let phase5Result;
      let phase5Error = null;
      try { phase5Result = data.phase5(); } catch (error) {
        phase5Error = { code: error.code || "PHASE5_SHADOW_ERROR", message: error.message };
      }
      const comparison = {
        equal: !phase5Error && stable(legacyResult) === stable(phase5Result),
        legacyHash: hash(legacyResult),
        phase5Hash: phase5Error ? "" : hash(phase5Result),
        phase5Error
      };
      if (typeof data.onComparison === "function") data.onComparison(comparison);
      return { authority: "LEGACY", result: legacyResult, comparison };
    }
    try {
      return { authority: "PHASE5", result: data.phase5(), comparison: null };
    } catch (error) {
      if (!error.code) error.code = "PHASE5_AVAILABILITY_FAILED_CLOSED";
      throw error;
    }
  }

  function blockingClassification(value) {
    return [
      "INACTIVE_STAFF", "WEEKLY_DAY_OFF", "DAY_OFF", "APPROVED_LEAVE",
      "UNPAID_LEAVE", "SICK_LEAVE", "ABSENT", "BRANCH_CLOSED",
      "CLOSED", "NOT_SCHEDULED", "UNRESOLVED"
    ].includes(upper(value));
  }

  function bookingBlocks(booking, serverNowMs) {
    if (!booking || booking.deleted) return false;
    const status = upper(booking.status);
    if (status === "CONFIRMED" || status === "PROPOSED") return true;
    if (status !== "PENDING") return false;
    if (!booking.holdExpiresAt) return true;
    const expiry = Date.parse(booking.holdExpiresAt);
    return !Number.isFinite(expiry) || expiry > serverNowMs;
  }

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

  function calculateAvailability(input) {
    const data = input || {};
    const date = text(data.date);
    const staff = data.staff || {};
    const schedule = data.schedule || {};
    const audience = data.audience === "internal" ? "internal" : "public";
    const duration = Math.max(15, number(data.durationMinutes, 30));
    const preparation = Math.max(0, number(data.preparationMinutes, DEFAULTS.preparationMinutes));
    const cleanup = Math.max(0, number(data.cleanupMinutes, DEFAULTS.cleanupMinutes));
    const interval = Math.max(5, number(data.slotIntervalMinutes, DEFAULTS.slotIntervalMinutes));
    const versions = clone(data.versions || {});
    const generatedAt = text(data.generatedAt || new Date().toISOString());
    const serverNowMs = Number.isFinite(data.serverNowMs) ? data.serverNowMs : Date.parse(generatedAt);
    const reasons = [];

    if (!date || !staff.staffId || !staff.active) reasons.push("STAFF_UNAVAILABLE");
    if (data.today && date < data.today) reasons.push("PAST_DATE");
    if (!text(data.branchId) || text(staff.branchId) !== text(data.branchId)) reasons.push("BRANCH_SCOPE_MISMATCH");
    if (data.branchOpen === false) reasons.push("BRANCH_CLOSED");
    if (!schedule.active || blockingClassification(schedule.classification)) {
      reasons.push(upper(schedule.classification || "NO_SHIFT"));
    }
    const rawSegments = Array.isArray(schedule.shiftSegments) ? schedule.shiftSegments : [];
    if (!rawSegments.length) reasons.push("NO_SHIFT");
    if (reasons.length) {
      const empty = {
        staffId: text(staff.staffId), date, branchId: text(data.branchId), audience,
        availability: "UNAVAILABLE", reasonCode: reasons[0], slots: [],
        scheduleSource: text(schedule.sourceType || "NONE"), scheduleSourceIds: clone(schedule.sourceIds || []),
        operationalRestriction: "", versions, generatedAt, durationMinutes: duration,
        generations: clone(data.generations || {}),
        preparationMinutes: preparation, cleanupMinutes: cleanup
      };
      empty.availabilityToken = compositeToken(data, empty);
      return Object.freeze(empty);
    }

    const anchor = rawSegments[0].shiftStart;
    const segments = rawSegments.map(item => normalizeInterval(date, item.shiftStart, item.shiftEnd, anchor))
      .sort((left, right) => left.startMinute - right.startMinute || left.endMinute - right.endMinute);
    if (segments.some((segment, index) => index > 0 &&
        segment.startMinute < segments[index - 1].endMinute)) {
      throw availabilityError(
        "AVAILABILITY_SCHEDULE_AMBIGUOUS", "Effective schedule segments overlap.");
    }
    const branchSegments = (Array.isArray(data.branchSegments) && data.branchSegments.length
      ? data.branchSegments : [{ start: anchor, end: rawSegments[rawSegments.length - 1].shiftEnd }])
      .map(item => normalizeInterval(date, item.start || item.openTime, item.end || item.closeTime));
    const blocks = (schedule.blockedIntervals || []).map(item =>
      normalizeInterval(date, item.start || item.blockStart, item.end || item.blockEnd, anchor));
    const operationalOverrideIntervals = (data.operationalOverrides || []).map(item => {
      const interval = normalizeInterval(date, item.startTime, item.endTime, anchor);
      interval.operationalOverrideId = text(item.operationalOverrideId);
      return interval;
    });
    const bookings = (data.bookings || []).filter(item => bookingBlocks(item, serverNowMs))
      .map(item => bookingInterval(item, date, anchor)).filter(Boolean);
    const firstShiftMinute = Math.min(...segments.map(item => item.startMinute));
    const lastShiftMinute = Math.max(...segments.map(item => item.endMinute));
    const slots = [];
    const restrictionCodes = new Set();

    segments.forEach(segment => {
      for (let start = segment.startMinute; start + duration <= segment.endMinute; start += interval) {
        const occupiedStart = start - preparation;
        const occupiedEnd = start + duration + cleanup;
        if (!contains(segment, occupiedStart, occupiedEnd)) continue;
        if (!branchSegments.some(branch => contains(branch, occupiedStart, occupiedEnd))) continue;
        if (blocks.some(block => overlaps(occupiedStart, occupiedEnd, block.startMinute, block.endMinute))) continue;
        if (bookings.some(booking => overlaps(occupiedStart, occupiedEnd, booking.startMinute, booking.endMinute))) continue;
        const slot = {
          start: timeText(start), end: timeText(start + duration),
          startMinute: start, endMinute: start + duration,
          occupiedStartMinute: occupiedStart, occupiedEndMinute: occupiedEnd
        };
        const decision = operationalDecision({
          ...data, date, audience, anchor, firstShiftMinute, lastShiftMinute,
          operationalOverrideIntervals,
          preparationMinutes: preparation
        }, slot);
        if (!decision.allowed) {
          restrictionCodes.add(decision.reasonCode);
          continue;
        }
        const appliedOverride = decision.reasonCode === "ALLOWED_BY_OPERATIONAL_OVERRIDE"
          ? operationalOverrideIntervals.find(item =>
            contains(item, slot.occupiedStartMinute, slot.occupiedEndMinute)) : null;
        slots.push(Object.freeze({
          start: slot.start, end: slot.end, status: "AVAILABLE",
          reasonCode: decision.reasonCode,
          operationalOverrideId: appliedOverride ? appliedOverride.operationalOverrideId : ""
        }));
      }
    });

    const result = {
      staffId: text(staff.staffId), date, branchId: text(data.branchId), audience,
      availability: slots.length ? "AVAILABLE" : "UNAVAILABLE",
      reasonCode: slots.length ? "AVAILABLE" :
        ([
          "UNRESOLVED_ATTENDANCE", "STAFF_OPERATIONALLY_UNAVAILABLE",
          "NO_CHECK_IN", "OPEN_BREAK", "EARLY_CHECKOUT", "BREAK_INTERVAL",
          "ALREADY_STARTED"
        ].find(code => restrictionCodes.has(code)) ||
          restrictionCodes.values().next().value || "NO_AVAILABLE_SLOTS"),
      slots, scheduleSource: text(schedule.sourceType),
      scheduleSourceIds: clone(schedule.sourceIds || []),
      operationalRestriction: restrictionCodes.values().next().value || "",
      versions, generations: clone(data.generations || {}), generatedAt, durationMinutes: duration,
      preparationMinutes: preparation, cleanupMinutes: cleanup
    };
    result.availabilityToken = compositeToken(data, result);
    return Object.freeze(result);
  }

  function compositeToken(input, result) {
    return `${VERSION}:${hash({
      environment: text(input.environment), spreadsheetHash: text(input.spreadsheetHash),
      branchId: text(input.branchId), date: text(input.date), audience: text(input.audience),
      staffId: text(result.staffId), serviceSetHash: text(input.serviceSetHash),
      duration: result.durationMinutes, preparation: result.preparationMinutes,
      cleanup: result.cleanupMinutes, generations: clone(input.generations || normalizeGenerations()),
      versions: result.versions,
      slots: result.slots.map(slot => [slot.start, slot.end])
    })}`;
  }

  function delta(previous, current) {
    if (text(previous && previous.availabilityToken) === text(current && current.availabilityToken)) {
      return Object.freeze({
        status: "success", unchanged: true,
        availabilityToken: current.availabilityToken,
        generatedAt: current.generatedAt, retryAfterSeconds: current.audience === "internal" ? 10 : 30
      });
    }
    const prior = new Set(((previous && previous.slots) || []).map(slot => `${slot.start}|${slot.end}`));
    const next = new Set((current.slots || []).map(slot => `${slot.start}|${slot.end}`));
    return Object.freeze({
      status: "success", unchanged: false, availabilityToken: current.availabilityToken,
      generatedAt: current.generatedAt, retryAfterSeconds: current.audience === "internal" ? 10 : 30,
      changedSlots: (current.slots || []).filter(slot => !prior.has(`${slot.start}|${slot.end}`)),
      removedSlots: ((previous && previous.slots) || []).filter(slot => !next.has(`${slot.start}|${slot.end}`))
        .map(slot => ({ start: slot.start, end: slot.end })),
      snapshot: publicDto(current)
    });
  }

  function publicDto(result) {
    return Object.freeze({
      staffId: text(result.staffId), date: text(result.date), branchId: text(result.branchId),
      availability: text(result.availability),
      reasonCode: ["AVAILABLE", "BRANCH_CLOSED", "NO_SHIFT", "NO_AVAILABLE_SLOTS", "PAST_DATE"]
        .includes(text(result.reasonCode)) ? text(result.reasonCode) : "OPERATIONALLY_UNAVAILABLE",
      slots: clone(result.slots || []).map(slot => ({
        start: slot.start, end: slot.end, status: slot.status
      })),
      availabilityToken: text(result.availabilityToken),
      generatedAt: text(result.generatedAt),
      serviceDurationMinutes: number(result.durationMinutes, 0)
    });
  }

  function internalDto(result, permissions) {
    const allowed = new Set(permissions || []);
    const dto = { ...publicDto(result) };
    if (allowed.has("booking_availability.view_operational")) {
      dto.scheduleSource = text(result.scheduleSource);
      dto.operationalRestriction = text(result.operationalRestriction);
    }
    if (allowed.has("booking_availability.view_restrictions")) {
      dto.scheduleSourceIds = clone(result.scheduleSourceIds || []);
      dto.versions = clone(result.versions || {});
      dto.generations = clone(result.generations || {});
    }
    if (allowed.has("booking_availability.override_internal")) {
      dto.managerOverrideAllowed = true;
    }
    return Object.freeze(dto);
  }

  function assertConflictTransition(current, next, reason) {
    const from = upper(current);
    const to = upper(next);
    if (!(CONFLICT_TRANSITIONS[from] || []).includes(to)) {
      throw availabilityError("AVAILABILITY_CONFLICT_TRANSITION_INVALID", "Conflict transition is not allowed.");
    }
    if (!text(reason)) {
      throw availabilityError("AVAILABILITY_CONFLICT_REASON_REQUIRED", "Conflict decisions require a reason.");
    }
    return true;
  }

  function planMigration(existingSheets, identity) {
    const existing = existingSheets || {};
    const environment = text(identity && identity.environment).toLowerCase();
    const errors = [];
    if (!environment || !["development", "test"].includes(environment)) {
      errors.push({ code: "PHASE5_ENVIRONMENT_BLOCKED" });
    }
    if (!identity || !identity.expectedSpreadsheetId ||
        identity.expectedSpreadsheetId !== identity.actualSpreadsheetId) {
      errors.push({ code: "PHASE5_SPREADSHEET_IDENTITY_MISMATCH" });
    }
    const createdSheets = [];
    const appendedColumns = {};
    const migrationHeader = value => upper(value).replace(/[\s-]+/g, "_");
    function duplicateHeaders(name, current) {
      const normalized = current.map(migrationHeader);
      const duplicates = [...new Set(normalized.filter((header, index) =>
        header && normalized.indexOf(header) !== index))];
      if (duplicates.length) {
        errors.push({ code: "PHASE5_DUPLICATE_HEADERS", sheet: name, headers: duplicates });
      }
      return normalized;
    }
    Object.keys(SHEET_SCHEMAS).forEach(name => {
      const current = existing[name];
      if (!Array.isArray(current)) {
        createdSheets.push(name);
      } else {
        const normalized = duplicateHeaders(name, current);
        const expected = SHEET_SCHEMAS[name].map(migrationHeader);
        const unknown = normalized.filter(header => header && !expected.includes(header));
        const known = normalized.filter(header => expected.includes(header));
        if (unknown.length) {
          errors.push({ code: "PHASE5_UNKNOWN_SCHEMA_COLUMNS", sheet: name, headers: unknown });
        }
        if (known.some((header, index) => header !== expected[index])) {
          errors.push({ code: "PHASE5_SCHEMA_ORDER_INCOMPATIBLE", sheet: name });
        }
        const missing = SHEET_SCHEMAS[name].filter(header => !normalized.includes(migrationHeader(header)));
        if (missing.length) appendedColumns[name] = missing;
      }
    });
    [["Bookings", BOOKING_APPEND_HEADERS], ["SERVICES", SERVICE_APPEND_HEADERS]].forEach(([name, headers]) => {
      const current = Array.isArray(existing[name]) ? duplicateHeaders(name, existing[name]) : [];
      const presentPhase5 = current.filter(header => headers.map(migrationHeader).includes(header));
      const expectedPresent = headers.slice(0, presentPhase5.length).map(migrationHeader);
      if (presentPhase5.some((header, index) => header !== expectedPresent[index])) {
        errors.push({ code: "PHASE5_APPEND_ORDER_INCOMPATIBLE", sheet: name });
      }
      const missing = headers.filter(header => !current.includes(migrationHeader(header)));
      if (missing.length) appendedColumns[name] = missing;
    });
    return Object.freeze({
      phase: 5, version: VERSION, blocked: errors.length > 0, errors,
      plannedCreatedSheets: createdSheets, plannedAppendedColumns: appendedColumns,
      executionAllowed: false, writes: 0, historicalRowsTouched: 0
    });
  }

  return Object.freeze({
    VERSION, TIME_ZONE, ENGINE_MODES, DEFAULTS, MAX_GENERATION, PERMISSIONS, CONFLICT_CODES,
    CONFLICT_TRANSITIONS, SHEET_SCHEMAS, BOOKING_APPEND_HEADERS, SERVICE_APPEND_HEADERS,
    availabilityError, normalizeFlags, executeAuthoritativeEngine, calculateAvailability,
    compositeToken, delta, publicDto, internalDto, assertConflictTransition,
    planMigration, hash, stable, bookingBlocks, generationValue, nextGeneration,
    normalizeGenerations, validateBranchConfiguration
  });
});
