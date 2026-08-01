(function (root, factory) {
  const schema = typeof module !== "undefined" && module.exports
    ? require("./staff-attendance-schema")
    : root.StaffAttendanceSchema;
  const attendanceCore = typeof module !== "undefined" && module.exports
    ? require("./staff-attendance-core")
    : root.StaffAttendanceCore;
  const api = factory(schema, attendanceCore);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.StaffSchedulingPhase2 = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (schema, core) {
  "use strict";

  if (!schema || !core) throw new Error("STAFF_SCHEDULING_PHASE2_DEPENDENCY_REQUIRED");

  const PHASE2_VERSION = "STAFF_SCHEDULING_PHASE2_V1";
  const TIME_ZONE = "Africa/Cairo";
  const WEEKDAYS = Object.freeze([
    "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"
  ]);
  const OVERRIDE_TYPES = Object.freeze([
    "CUSTOM_SHIFT", "DAY_OFF", "APPROVED_LEAVE", "UNPAID_LEAVE", "SICK_LEAVE",
    "ABSENT", "PARTIAL_ABSENCE", "PLANNED_BREAK", "TRAINING", "BRANCH_CLOSED"
  ]);
  const FULL_DAY_TYPES = Object.freeze([
    "DAY_OFF", "APPROVED_LEAVE", "UNPAID_LEAVE", "SICK_LEAVE", "ABSENT", "BRANCH_CLOSED"
  ]);
  const INTERVAL_TYPES = Object.freeze(["PARTIAL_ABSENCE", "PLANNED_BREAK", "TRAINING"]);
  const APPROVAL_CONTROLLED_TYPES = Object.freeze([
    "APPROVED_LEAVE", "UNPAID_LEAVE", "SICK_LEAVE"
  ]);
  const OVERRIDE_TRANSITIONS = Object.freeze({
    DRAFT: Object.freeze(["PENDING", "APPROVED", "CANCELLED"]),
    PENDING: Object.freeze(["APPROVED", "REJECTED", "CANCELLED"]),
    APPROVED: Object.freeze(["CANCELLED"]),
    REJECTED: Object.freeze([]),
    CANCELLED: Object.freeze([])
  });
  const ACTIONS = Object.freeze([
    "listStaffSchedules", "getStaffWeeklySchedule", "saveScheduleSegment",
    "bulkSaveScheduleSegments", "deactivateScheduleSegment", "copyScheduleDay",
    "setWeeklyDayOff", "copyEmployeeSchedule", "applyScheduleDateRange", "listScheduleOverrides",
    "createScheduleOverride", "transitionScheduleOverride", "cancelScheduleOverride",
    "reviewScheduleOverride", "resolveStaffSchedule", "resolveStaffSchedulesRange",
    "getScheduleAuditHistory", "getSchedulePageData", "listScheduleUserScopes",
    "saveScheduleUserScope", "previewStaffScheduleMigration"
  ]);
  const WRITE_ACTIONS = new Set([
    "saveScheduleSegment", "bulkSaveScheduleSegments", "deactivateScheduleSegment",
    "copyScheduleDay", "setWeeklyDayOff", "copyEmployeeSchedule", "applyScheduleDateRange",
    "createScheduleOverride", "transitionScheduleOverride", "cancelScheduleOverride",
    "reviewScheduleOverride", "saveScheduleUserScope"
  ]);
  const PHASE2_SHEET_SCHEMAS = Object.freeze({
    BARBER_SCHEDULE: schema.SHEET_SCHEMAS.BARBER_SCHEDULE,
    STAFF_SCHEDULE_OVERRIDES: schema.SHEET_SCHEMAS.STAFF_SCHEDULE_OVERRIDES,
    STAFF_ATTENDANCE_AUDIT: schema.SHEET_SCHEMAS.STAFF_ATTENDANCE_AUDIT,
    STAFF_ATTENDANCE_IDEMPOTENCY: schema.SHEET_SCHEMAS.STAFF_ATTENDANCE_IDEMPOTENCY,
    SCHEDULE_USER_SCOPES: Object.freeze([
      "SCOPE_ID", "USERNAME", "STAFF_ID", "ROLE", "BRANCH_IDS_JSON", "ACTIVE",
      "CREATED_AT", "CREATED_BY", "UPDATED_AT", "UPDATED_BY", "REQUEST_ID"
    ])
  });

  function schedulingError(code, message, details) {
    const error = new Error(message || code);
    error.code = code;
    if (details !== undefined) error.details = details;
    return error;
  }

  function text(value) {
    return String(value === undefined || value === null ? "" : value).trim();
  }

  function number(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : (fallback === undefined ? 0 : fallback);
  }

  function boolean(value, fallback) {
    if (value === true || value === false) return value;
    const normalized = text(value).toUpperCase();
    if (["TRUE", "YES", "1", "Y"].includes(normalized)) return true;
    if (["FALSE", "NO", "0", "N"].includes(normalized)) return false;
    return fallback;
  }

  function normalizeWeekday(value) {
    const key = text(value).toLowerCase();
    const aliases = {
      "0": "SUNDAY", "1": "MONDAY", "2": "TUESDAY", "3": "WEDNESDAY",
      "4": "THURSDAY", "5": "FRIDAY", "6": "SATURDAY",
      sun: "SUNDAY", sunday: "SUNDAY", "الأحد": "SUNDAY", "الاحد": "SUNDAY",
      mon: "MONDAY", monday: "MONDAY", "الاثنين": "MONDAY", "الإثنين": "MONDAY",
      tue: "TUESDAY", tuesday: "TUESDAY", "الثلاثاء": "TUESDAY",
      wed: "WEDNESDAY", wednesday: "WEDNESDAY", "الأربعاء": "WEDNESDAY", "الاربعاء": "WEDNESDAY",
      thu: "THURSDAY", thursday: "THURSDAY", "الخميس": "THURSDAY",
      fri: "FRIDAY", friday: "FRIDAY", "الجمعة": "FRIDAY",
      sat: "SATURDAY", saturday: "SATURDAY", "السبت": "SATURDAY"
    };
    const weekday = aliases[key] || key.toUpperCase();
    if (!WEEKDAYS.includes(weekday)) {
      throw schedulingError("SCHEDULE_WEEKDAY_INVALID", "Weekday is not supported.");
    }
    return weekday;
  }

  function validateId(value, field, prefix) {
    const result = text(value);
    if (!result || result.length > 120 || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(result)) {
      throw schedulingError(`${prefix || "SCHEDULE"}_${field}_INVALID`, `${field} is invalid.`);
    }
    return result;
  }

  function dateRange(fromValue, toValue, prefix) {
    const from = core.parseDateKey(fromValue).text;
    const to = toValue ? core.parseDateKey(toValue).text : "";
    if (to && from > to) {
      throw schedulingError(`${prefix}_EFFECTIVE_RANGE_INVALID`, "Effective-from cannot be after effective-to.");
    }
    return { from, to };
  }

  function shiftInterval(weekday, start, end) {
    const normalizedWeekday = normalizeWeekday(weekday);
    const dayIndex = WEEKDAYS.indexOf(normalizedWeekday);
    const local = core.normalizeInterval("2026-01-05", start, end);
    return {
      weekday: normalizedWeekday,
      start: text(start),
      end: text(end),
      durationMinutes: local.minutes,
      weekStart: dayIndex * 1440 + core.parseClock(start),
      weekEnd: dayIndex * 1440 + core.parseClock(start) + local.minutes
    };
  }

  function effectiveRangesOverlap(a, b) {
    const aEnd = a.effectiveTo || "9999-12-31";
    const bEnd = b.effectiveTo || "9999-12-31";
    return a.effectiveFrom <= bEnd && b.effectiveFrom <= aEnd;
  }

  function weeklyIntervalsOverlap(a, b) {
    const week = 7 * 1440;
    return [-week, 0, week].some((offset) =>
      a.weekStart < b.weekEnd + offset && a.weekEnd > b.weekStart + offset);
  }

  function normalizeStaff(staff) {
    return Object.freeze({
      staffId: text(staff && (staff.staffId || staff.id)),
      staffName: text(staff && (staff.staffName || staff.name)),
      branchId: text(staff && staff.branchId),
      active: boolean(staff && staff.active, true)
    });
  }

  function validateScheduleSegment(input, context) {
    const data = input || {};
    const staff = normalizeStaff(context && context.staff);
    const staffId = validateId(data.staffId, "STAFF_ID", "SCHEDULE");
    if (!staff.staffId || staff.staffId !== staffId) {
      throw schedulingError("SCHEDULE_STAFF_NOT_FOUND", "Staff ID does not exist.");
    }
    if (!staff.active && !(context && context.allowInactiveStaff === true)) {
      throw schedulingError("SCHEDULE_STAFF_INACTIVE", "Inactive staff cannot receive an active schedule.");
    }
    const recordType = text(data.recordType || "SHIFT").toUpperCase();
    if (!["SHIFT", "WEEKLY_DAY_OFF"].includes(recordType)) {
      throw schedulingError("SCHEDULE_RECORD_TYPE_INVALID", "Schedule record type is invalid.");
    }
    if (recordType === "WEEKLY_DAY_OFF") {
      const weekday = normalizeWeekday(data.weekday);
      const range = dateRange(data.effectiveFrom, data.effectiveTo, "SCHEDULE");
      const hasShiftFields = text(data.shiftStart) !== "" || text(data.shiftEnd) !== "";
      const hasNonZeroMinutes =
        (text(data.requiredWorkMinutes) !== "" && number(data.requiredWorkMinutes, NaN) !== 0) ||
        (text(data.allowedBreakMinutes) !== "" && number(data.allowedBreakMinutes, NaN) !== 0);
      if (hasShiftFields || hasNonZeroMinutes) {
        throw schedulingError("SCHEDULE_DAY_OFF_FIELDS_INVALID", "Weekly day off cannot retain shift or minute fields.");
      }
      return Object.freeze({
        scheduleId: data.scheduleId ? validateId(data.scheduleId, "ID", "SCHEDULE") : "",
        staffId, staffName: staff.staffName, branchId: staff.branchId, weekday,
        shiftStart: "", shiftEnd: "", segmentIndex: 0, requiredWorkMinutes: 0,
        allowedBreakMinutes: 0, active: boolean(data.active, true),
        effectiveFrom: range.from, effectiveTo: range.to, durationMinutes: 0,
        weekStart: WEEKDAYS.indexOf(weekday) * 1440,
        weekEnd: WEEKDAYS.indexOf(weekday) * 1440,
        recordType, legacy: false, resolutionEligible: true
      });
    }
    const interval = shiftInterval(data.weekday, data.shiftStart, data.shiftEnd);
    const required = number(data.requiredWorkMinutes, NaN);
    const allowedBreak = number(data.allowedBreakMinutes, NaN);
    if (!Number.isInteger(required) || required < 0) {
      throw schedulingError("SCHEDULE_REQUIRED_MINUTES_INVALID", "Required work minutes must be a non-negative integer.");
    }
    if (!Number.isInteger(allowedBreak) || allowedBreak < 0) {
      throw schedulingError("SCHEDULE_BREAK_MINUTES_INVALID", "Allowed break minutes must be a non-negative integer.");
    }
    if (required > interval.durationMinutes) {
      throw schedulingError("SCHEDULE_REQUIRED_EXCEEDS_SHIFT", "Required work minutes exceed shift duration.");
    }
    if (allowedBreak > interval.durationMinutes || required + allowedBreak > interval.durationMinutes) {
      throw schedulingError("SCHEDULE_BREAK_INCOMPATIBLE", "Required work plus allowed break exceeds shift duration.");
    }
    const range = dateRange(data.effectiveFrom, data.effectiveTo, "SCHEDULE");
    const segmentIndex = number(data.segmentIndex, NaN);
    if (!Number.isInteger(segmentIndex) || segmentIndex < 1 || segmentIndex > 20) {
      throw schedulingError("SCHEDULE_SEGMENT_INDEX_INVALID", "Segment index must be an integer from 1 to 20.");
    }
    return Object.freeze({
      scheduleId: data.scheduleId ? validateId(data.scheduleId, "ID", "SCHEDULE") : "",
      staffId,
      staffName: staff.staffName,
      branchId: staff.branchId,
      weekday: interval.weekday,
      shiftStart: interval.start,
      shiftEnd: interval.end,
      segmentIndex,
      requiredWorkMinutes: required,
      allowedBreakMinutes: allowedBreak,
      active: boolean(data.active, true),
      effectiveFrom: range.from,
      effectiveTo: range.to,
      durationMinutes: interval.durationMinutes,
      weekStart: interval.weekStart,
      weekEnd: interval.weekEnd,
      recordType,
      resolutionEligible: true,
      legacy: false
    });
  }

  function scheduleConflict(candidate, existing) {
    if (!candidate.active || !existing.active || candidate.scheduleId === existing.scheduleId ||
      candidate.staffId !== existing.staffId || !effectiveRangesOverlap(candidate, existing)) return null;
    const candidateType = candidate.recordType || "SHIFT";
    const existingType = existing.recordType || "SHIFT";
    if (candidate.weekday === existing.weekday &&
      (candidateType === "WEEKLY_DAY_OFF" || existingType === "WEEKLY_DAY_OFF")) {
      return {
        code: candidateType === existingType
          ? "SCHEDULE_DUPLICATE_WEEKLY_DAY_OFF" : "SCHEDULE_DAY_OFF_CONFLICT",
        conflictingScheduleId: existing.scheduleId,
        weekday: candidate.weekday
      };
    }
    if (candidate.weekday === existing.weekday && candidate.segmentIndex === existing.segmentIndex &&
      candidate.shiftStart === existing.shiftStart && candidate.shiftEnd === existing.shiftEnd &&
      candidate.effectiveFrom === existing.effectiveFrom &&
      (candidate.effectiveTo || "") === (existing.effectiveTo || "")) {
      return {
        code: "SCHEDULE_DUPLICATE_ACTIVE_SEGMENT",
        conflictingScheduleId: existing.scheduleId
      };
    }
    if (weeklyIntervalsOverlap(candidate, existing)) {
      return {
        code: "SCHEDULE_SHIFT_CONFLICT",
        conflictingScheduleId: existing.scheduleId,
        weekday: candidate.weekday,
        candidate: `${candidate.shiftStart}-${candidate.shiftEnd}`,
        existing: `${existing.shiftStart}-${existing.shiftEnd}`
      };
    }
    return null;
  }

  function assertNoScheduleConflicts(candidate, schedules) {
    const conflict = (schedules || []).map((item) => scheduleConflict(candidate, item)).find(Boolean);
    if (conflict) throw schedulingError(conflict.code, "Schedule segment conflicts with an active segment.", conflict);
  }

  function normalizeOverrideStatus(value) {
    const status = text(value || "DRAFT").toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(OVERRIDE_TRANSITIONS, status)) {
      throw schedulingError("OVERRIDE_STATUS_INVALID", "Override status is invalid.");
    }
    return status;
  }

  function assertEmptyFields(data, fields, code) {
    const retained = fields.filter((field) => text(data[field]) !== "");
    if (retained.length) {
      throw schedulingError(code, "Override contains fields that do not apply to its type.", { fields: retained });
    }
  }

  function validateOverride(input, context) {
    const data = input || {};
    const type = text(data.type).toUpperCase();
    if (!OVERRIDE_TYPES.includes(type)) {
      throw schedulingError("OVERRIDE_TYPE_INVALID", "Override type is not supported.");
    }
    const date = core.parseDateKey(data.date).text;
    const scopeType = text(data.scopeType || (type === "BRANCH_CLOSED" ? "" : "STAFF")).toUpperCase();
    if (!["STAFF", "BRANCH", "ORGANIZATION"].includes(scopeType)) {
      throw schedulingError("OVERRIDE_SCOPE_INVALID", "Override scope must be STAFF, BRANCH, or ORGANIZATION.");
    }
    if (type !== "BRANCH_CLOSED" && scopeType !== "STAFF") {
      throw schedulingError("OVERRIDE_SCOPE_TYPE_MISMATCH", "This override type must be scoped to one staff member.");
    }
    if (type === "BRANCH_CLOSED" && scopeType === "STAFF") {
      throw schedulingError("BRANCH_CLOSURE_SCOPE_INVALID", "Branch closure must be branch-wide or organization-wide.");
    }
    const branchId = text(data.branchId);
    if (scopeType === "BRANCH" && !branchId) {
      throw schedulingError("OVERRIDE_BRANCH_REQUIRED", "Branch-scoped override requires a branch ID.");
    }
    if (scopeType !== "BRANCH" && branchId) {
      throw schedulingError("OVERRIDE_BRANCH_NOT_ALLOWED", "Branch ID is allowed only for branch-scoped overrides.");
    }
    if (scopeType !== "STAFF" && text(data.staffId)) {
      throw schedulingError("OVERRIDE_STAFF_NOT_ALLOWED", "Staff ID is allowed only for staff-scoped overrides.");
    }
    let staff = { staffId: "", staffName: "", branchId: "", active: true };
    if (scopeType === "STAFF") {
      staff = normalizeStaff(context && context.staff);
      const requestedStaffId = validateId(data.staffId, "STAFF_ID", "OVERRIDE");
      if (!staff.staffId || requestedStaffId !== staff.staffId) {
        throw schedulingError("OVERRIDE_STAFF_NOT_FOUND", "Staff ID does not exist.");
      }
    }
    const status = normalizeOverrideStatus(data.status || "DRAFT");
    const reason = text(data.reason);
    if (!reason || reason.length > 500) {
      throw schedulingError("OVERRIDE_REASON_REQUIRED", "A concise override reason is required.");
    }
    let shiftStart = "";
    let shiftEnd = "";
    let requiredWorkMinutes = "";
    let allowedBreakMinutes = "";
    let blockStart = "";
    let blockEnd = "";
    if (type === "CUSTOM_SHIFT") {
      assertEmptyFields(data, ["blockStart", "blockEnd"], "OVERRIDE_CUSTOM_SHIFT_FIELDS_INVALID");
      const interval = core.normalizeInterval(date, data.shiftStart, data.shiftEnd);
      shiftStart = text(data.shiftStart);
      shiftEnd = text(data.shiftEnd);
      requiredWorkMinutes = number(data.requiredWorkMinutes, NaN);
      allowedBreakMinutes = number(data.allowedBreakMinutes, NaN);
      if (!Number.isInteger(requiredWorkMinutes) || requiredWorkMinutes < 0 ||
        requiredWorkMinutes > interval.minutes) {
        throw schedulingError("OVERRIDE_REQUIRED_MINUTES_INVALID", "Custom shift required minutes are invalid.");
      }
      if (!Number.isInteger(allowedBreakMinutes) || allowedBreakMinutes < 0 ||
        requiredWorkMinutes + allowedBreakMinutes > interval.minutes) {
        throw schedulingError("OVERRIDE_BREAK_MINUTES_INVALID", "Custom shift break allowance is invalid.");
      }
    } else if (INTERVAL_TYPES.includes(type)) {
      assertEmptyFields(
        data,
        ["shiftStart", "shiftEnd", "requiredWorkMinutes", "allowedBreakMinutes"],
        "OVERRIDE_INTERVAL_FIELDS_INVALID"
      );
      core.normalizeInterval(date, data.blockStart, data.blockEnd);
      blockStart = text(data.blockStart);
      blockEnd = text(data.blockEnd);
    } else {
      assertEmptyFields(
        data,
        ["shiftStart", "shiftEnd", "requiredWorkMinutes", "allowedBreakMinutes", "blockStart", "blockEnd"],
        "OVERRIDE_FULL_DAY_FIELDS_INVALID"
      );
    }
    if (APPROVAL_CONTROLLED_TYPES.includes(type) && status === "APPROVED" &&
      !text(data.sourceEvidence)) {
      throw schedulingError("OVERRIDE_APPROVAL_EVIDENCE_REQUIRED", "Approved leave requires source evidence.");
    }
    const customSegmentIndex = type === "CUSTOM_SHIFT" ? number(data.segmentIndex, 1) : "";
    if (type === "CUSTOM_SHIFT" &&
      (!Number.isInteger(customSegmentIndex) || customSegmentIndex < 1 || customSegmentIndex > 20)) {
      throw schedulingError("OVERRIDE_SEGMENT_INDEX_INVALID", "Custom shift segment index must be an integer from 1 to 20.");
    }
    return Object.freeze({
      overrideId: data.overrideId ? validateId(data.overrideId, "ID", "OVERRIDE") : "",
      staffId: staff.staffId,
      staffName: staff.staffName,
      branchId,
      scopeType,
      date,
      type,
      segmentIndex: customSegmentIndex,
      shiftStart,
      shiftEnd,
      requiredWorkMinutes,
      allowedBreakMinutes,
      blockStart,
      blockEnd,
      reason,
      sourceEvidence: text(data.sourceEvidence),
      status,
      requestedBy: text(data.requestedBy),
      effectScope: "SCHEDULE_ONLY"
    });
  }

  function intervalsOnDateOverlap(aStart, aEnd, bStart, bEnd) {
    const a = core.normalizeInterval("2026-01-05", aStart, aEnd);
    const b = core.normalizeInterval("2026-01-05", bStart, bEnd);
    return a.startMinute < b.endMinute && a.endMinute > b.startMinute;
  }

  function overrideConflict(candidate, existing) {
    if (existing.overrideId === candidate.overrideId || existing.status !== "APPROVED" ||
      candidate.status !== "APPROVED" || existing.date !== candidate.date) return null;
    const sameTarget = candidate.scopeType === existing.scopeType &&
      (candidate.scopeType === "STAFF" ? candidate.staffId === existing.staffId
        : candidate.scopeType === "BRANCH" ? candidate.branchId === existing.branchId : true);
    if (!sameTarget) return null;
    if (candidate.type === "CUSTOM_SHIFT" && existing.type === "CUSTOM_SHIFT" &&
      intervalsOnDateOverlap(candidate.shiftStart, candidate.shiftEnd, existing.shiftStart, existing.shiftEnd)) {
      return { code: "OVERRIDE_CUSTOM_SHIFT_CONFLICT", conflictingOverrideId: existing.overrideId };
    }
    if (INTERVAL_TYPES.includes(candidate.type) && INTERVAL_TYPES.includes(existing.type) &&
      intervalsOnDateOverlap(candidate.blockStart, candidate.blockEnd, existing.blockStart, existing.blockEnd)) {
      return { code: "OVERRIDE_INTERVAL_CONFLICT", conflictingOverrideId: existing.overrideId };
    }
    if (FULL_DAY_TYPES.includes(candidate.type) && FULL_DAY_TYPES.includes(existing.type) &&
      candidate.type !== "BRANCH_CLOSED" && existing.type !== "BRANCH_CLOSED") {
      return { code: "OVERRIDE_FULL_DAY_CONFLICT", conflictingOverrideId: existing.overrideId };
    }
    return null;
  }

  function assertNoOverrideConflicts(candidate, overrides) {
    const conflict = (overrides || []).map((item) => overrideConflict(candidate, item)).find(Boolean);
    if (conflict) throw schedulingError(conflict.code, "Override conflicts with an approved override.", conflict);
  }

  function dateWeekday(dateKey) {
    const epochDay = core.parseDateKey(dateKey).epochDay;
    return WEEKDAYS[(epochDay + 3) % 7 < 0 ? (epochDay + 3) % 7 + 7 : (epochDay + 3) % 7];
  }

  function resolveSchedule(options) {
    const data = options || {};
    const staff = normalizeStaff(data.staff);
    const date = core.parseDateKey(data.date).text;
    const trace = [];
    const warnings = [];
    if (!staff.staffId) throw schedulingError("SCHEDULE_STAFF_NOT_FOUND", "Staff ID does not exist.");
    trace.push({ step: "STAFF_STATUS", staffId: staff.staffId, active: staff.active });
    if (!staff.active) {
      return Object.freeze({
        date, staffId: staff.staffId, staffName: staff.staffName, timezone: TIME_ZONE,
        active: false, sourceType: "NONE", sourceIds: [], shiftSegments: [],
        requiredWorkMinutes: 0, allowedBreakMinutes: 0, blockedIntervals: [],
        classification: "INACTIVE_STAFF", dayOff: false, closure: false,
        warnings, resolutionTrace: trace
      });
    }
    const approved = (data.overrides || []).filter((item) => item.status === "APPROVED" && item.date === date)
      .filter((item) => item.scopeType === "ORGANIZATION" ||
        (item.scopeType === "BRANCH" && item.branchId && item.branchId === staff.branchId) ||
        (item.scopeType === "STAFF" && item.staffId === staff.staffId));
    trace.push({ step: "APPROVED_OVERRIDES", ids: approved.map((item) => item.overrideId) });
    const priority = {
      BRANCH_CLOSED: 100, ABSENT: 90, UNPAID_LEAVE: 80, SICK_LEAVE: 75,
      APPROVED_LEAVE: 70, DAY_OFF: 60
    };
    const blocking = approved.filter((item) => FULL_DAY_TYPES.includes(item.type))
      .sort((a, b) => (priority[b.type] || 0) - (priority[a.type] || 0) ||
        a.overrideId.localeCompare(b.overrideId));
    if (blocking.length > 1) warnings.push("MULTIPLE_FULL_DAY_OVERRIDES_RESOLVED_BY_PRECEDENCE");
    const selectedBlock = blocking[0] || null;
    if (selectedBlock) {
      trace.push({ step: "FULL_DAY_BLOCK", id: selectedBlock.overrideId, type: selectedBlock.type });
      return Object.freeze({
        date, staffId: staff.staffId, staffName: staff.staffName, timezone: TIME_ZONE,
        active: true, sourceType: "OVERRIDE", sourceIds: [selectedBlock.overrideId],
        shiftSegments: [], requiredWorkMinutes: 0, allowedBreakMinutes: 0,
        blockedIntervals: [], classification: selectedBlock.type,
        dayOff: selectedBlock.type === "DAY_OFF",
        closure: selectedBlock.type === "BRANCH_CLOSED",
        warnings, resolutionTrace: trace
      });
    }
    const custom = approved.filter((item) => item.type === "CUSTOM_SHIFT")
      .sort((a, b) => number(a.segmentIndex, 1) - number(b.segmentIndex, 1) ||
        a.shiftStart.localeCompare(b.shiftStart));
    const weekday = dateWeekday(date);
    const unresolved = (data.schedules || []).filter((item) =>
      item.staffId === staff.staffId && item.resolutionEligible === false);
    if (unresolved.length) {
      warnings.push("UNRESOLVED_LEGACY_SCHEDULE_ROWS_EXCLUDED");
      trace.push({
        step: "UNRESOLVED_LEGACY_ROWS",
        ids: unresolved.map((item) => item.scheduleId || item.legacyRowKey || "UNKNOWN")
      });
    }
    const recurringCandidates = (data.schedules || []).filter((item) =>
      item.active && item.staffId === staff.staffId && item.weekday === weekday &&
      item.resolutionEligible !== false &&
      item.effectiveFrom <= date && (!item.effectiveTo || item.effectiveTo >= date));
    const weeklyDayOffs = recurringCandidates.filter((item) =>
      item.recordType === "WEEKLY_DAY_OFF").sort((a, b) =>
      a.effectiveFrom.localeCompare(b.effectiveFrom) || a.scheduleId.localeCompare(b.scheduleId));
    if (weeklyDayOffs.length) {
      const selected = weeklyDayOffs[weeklyDayOffs.length - 1];
      trace.push({ step: "WEEKLY_DAY_OFF", id: selected.scheduleId });
      return Object.freeze({
        date, staffId: staff.staffId, staffName: staff.staffName, timezone: TIME_ZONE,
        active: true, sourceType: "RECURRING_DAY_OFF", sourceIds: [selected.scheduleId],
        shiftSegments: [], requiredWorkMinutes: 0, allowedBreakMinutes: 0,
        blockedIntervals: [], classification: "WEEKLY_DAY_OFF", dayOff: true,
        closure: false, warnings, resolutionTrace: trace
      });
    }
    const recurring = recurringCandidates.filter((item) =>
      (item.recordType || "SHIFT") === "SHIFT")
      .sort((a, b) => number(a.segmentIndex, 1) - number(b.segmentIndex, 1) ||
        a.shiftStart.localeCompare(b.shiftStart));
    const source = custom.length ? custom : recurring;
    const sourceType = custom.length ? "CUSTOM_SHIFT" : recurring.length ? "RECURRING" : "POLICY_FALLBACK";
    trace.push({ step: "SHIFT_SOURCE", sourceType, ids: source.map((item) => item.overrideId || item.scheduleId) });
    const segments = source.map((item) => ({
      sourceId: item.overrideId || item.scheduleId,
      segmentIndex: number(item.segmentIndex, 1),
      shiftStart: item.shiftStart,
      shiftEnd: item.shiftEnd,
      overnight: core.parseClock(item.shiftEnd) <= core.parseClock(item.shiftStart),
      requiredWorkMinutes: item.requiredWorkMinutes === "" || item.requiredWorkMinutes === undefined
        ? null : number(item.requiredWorkMinutes),
      allowedBreakMinutes: item.allowedBreakMinutes === "" || item.allowedBreakMinutes === undefined
        ? null : number(item.allowedBreakMinutes)
    }));
    const resolvedForCore = {
      available: segments.length > 0,
      segments: segments.map((item) => ({ requiredWorkMinutes: item.requiredWorkMinutes }))
    };
    const policy = data.policyResolution || { snapshot: data.policy || {} };
    const requiredWorkMinutes = segments.length
      ? core.resolveRequiredWorkMinutes(resolvedForCore, policy)
      : number(policy.snapshot && policy.snapshot.requiredDailyMinutes, 0);
    const explicitBreaks = segments.filter((item) => item.allowedBreakMinutes !== null);
    if (explicitBreaks.length && explicitBreaks.length !== segments.length) {
      throw schedulingError("SCHEDULE_PARTIAL_BREAK_ALLOWANCE", "Break allowance must be set for every segment or inherited from policy.");
    }
    const allowedBreakMinutes = explicitBreaks.length
      ? explicitBreaks.reduce((sum, item) => sum + item.allowedBreakMinutes, 0)
      : number(policy.snapshot && policy.snapshot.allowedBreakMinutes, 0);
    const blocks = approved.filter((item) => INTERVAL_TYPES.includes(item.type))
      .sort((a, b) => a.blockStart.localeCompare(b.blockStart) || a.overrideId.localeCompare(b.overrideId))
      .map((item) => {
        const block = core.normalizeInterval(date, item.blockStart, item.blockEnd);
        const relations = segments.map((segment) => {
          const shift = core.normalizeInterval(date, segment.shiftStart, segment.shiftEnd);
          const candidates = [block.startMinute, block.startMinute + 1440];
          return {
            overlaps: candidates.some((blockStart) =>
              blockStart < shift.endMinute && blockStart + block.minutes > shift.startMinute),
            contained: candidates.some((blockStart) =>
              blockStart >= shift.startMinute && blockStart + block.minutes <= shift.endMinute)
          };
        });
        const overlaps = relations.some((relation) => relation.overlaps);
        const contained = relations.some((relation) => relation.contained);
        if (segments.length && !overlaps) warnings.push(`OVERRIDE_BLOCK_OUTSIDE_SHIFT:${item.overrideId}`);
        else if (segments.length && !contained) warnings.push(`OVERRIDE_BLOCK_PARTIALLY_OUTSIDE_SHIFT:${item.overrideId}`);
        return {
          overrideId: item.overrideId,
          type: item.type,
          start: item.blockStart,
          end: item.blockEnd,
          overlapsShift: overlaps,
          containedInShift: contained
        };
      });
    trace.push({ step: "INTERVAL_BLOCKS", ids: blocks.map((item) => item.overrideId) });
    if (!segments.length) warnings.push("NO_EFFECTIVE_SHIFT_SEGMENTS");
    return Object.freeze({
      date, staffId: staff.staffId, staffName: staff.staffName, timezone: TIME_ZONE,
      active: true, sourceType, sourceIds: segments.map((item) => item.sourceId),
      shiftSegments: segments, requiredWorkMinutes, allowedBreakMinutes,
      blockedIntervals: blocks, classification: segments.length ? "WORKING_DAY" : "NOT_SCHEDULED",
      dayOff: false, closure: false, warnings, resolutionTrace: trace
    });
  }

  function sanitizePayloadForFingerprint(data) {
    const excluded = new Set([
      "sessionToken", "token", "authToken", "actor", "actorId", "actorName",
      "actorRole", "approvedBy", "createdAt", "updatedAt"
    ]);
    return Object.fromEntries(Object.entries(data || {}).filter(([key]) => !excluded.has(key)));
  }

  function normalizeActor(actor) {
    const value = actor || {};
    return Object.freeze({
      actorId: text(value.actorId || value.username),
      actorName: text(value.actorName || value.displayName || value.username),
      role: text(value.role || "USER").toUpperCase(),
      staffId: text(value.staffId),
      branchIds: Array.isArray(value.branchIds) ? value.branchIds.map(text).filter(Boolean) : [],
      permissions: Array.isArray(value.permissions) ? value.permissions.map(text) : [],
      owner: value.owner === true || text(value.username).toLowerCase() === "owner"
    });
  }

  function hasPermission(actor, permission) {
    return actor.owner || actor.permissions.includes(permission);
  }

  function requirePermission(actor, permission) {
    if (!actor.actorId) throw schedulingError("AUTH_REQUIRED", "Authentication is required.");
    if (!hasPermission(actor, permission)) {
      throw schedulingError("PERMISSION_DENIED", `Permission required: ${permission}.`);
    }
  }

  function canAccessStaff(actor, staff, manage) {
    if (actor.owner) return true;
    if (manage && !hasPermission(actor, "schedule.manage")) return false;
    if (actor.staffId && actor.staffId === staff.staffId) return true;
    if (actor.role === "EMPLOYEE") return false;
    return !!staff.branchId && actor.branchIds.includes(staff.branchId);
  }

  function filterSensitiveFields(value) {
    if (Array.isArray(value)) return value.map(filterSensitiveFields);
    if (!value || typeof value !== "object") return value;
    const forbidden = new Set([
      "salary", "rate", "hourlyRate", "deficitRatePerHour", "overtimeRatePerHour",
      "deduction", "settlement", "monthlySalary", "fixedDayValue", "percentage",
      "bonus", "requestFingerprint", "fingerprint", "password", "passwordHash",
      "sessionToken", "token", "spreadsheetId", "expectedSpreadsheetId",
      "actualSpreadsheetId", "lastRequestId", "requestId", "_rowNumber"
    ]);
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !forbidden.has(key))
      .map(([key, item]) => [key, filterSensitiveFields(item)]));
  }

  function createMemoryRepository(seed) {
    const data = seed || {};
    const state = {
      staff: (data.staff || []).map((item) => ({ ...normalizeStaff(item) })),
      schedules: (data.schedules || []).map((item) => ({ ...item })),
      overrides: (data.overrides || []).map((item) => ({ ...item })),
      policies: (data.policies || []).map((item) => ({ ...item })),
      audits: (data.audits || []).map((item) => ({ ...item })),
      idempotency: (data.idempotency || []).map((item) => ({ ...item })),
      scopes: (data.scopes || []).map((item) => ({ ...item }))
    };
    function restore(snapshot) {
      Object.keys(state).forEach((key) => {
        state[key].splice(0, state[key].length, ...snapshot[key].map((item) => ({ ...item })));
      });
    }
    return {
      state,
      withTransaction: (_details, callback) => {
        const snapshot = Object.fromEntries(Object.entries(state)
          .map(([key, rows]) => [key, rows.map((item) => ({ ...item }))]));
        try {
          return callback();
        } catch (error) {
          restore(snapshot);
          throw error;
        }
      },
      listStaff: () => state.staff.map((item) => ({ ...item })),
      getStaff: (staffId) => state.staff.find((item) => item.staffId === text(staffId)) || null,
      listSchedules: (filters) => state.schedules.filter((item) =>
        (!filters.staffId || item.staffId === filters.staffId) &&
        (!filters.weekday || item.weekday === filters.weekday) &&
        (filters.active === undefined || item.active === filters.active))
        .map((item) => ({ ...item })),
      getSchedule: (id) => state.schedules.find((item) => item.scheduleId === text(id)) || null,
      saveSchedule: (record) => {
        const index = state.schedules.findIndex((item) => item.scheduleId === record.scheduleId);
        if (index >= 0) state.schedules[index] = { ...record };
        else state.schedules.push({ ...record });
        return { ...record };
      },
      listOverrides: (filters) => state.overrides.filter((item) =>
        (!filters.staffId || item.staffId === filters.staffId || item.scopeType !== "STAFF") &&
        (!filters.dateFrom || item.date >= filters.dateFrom) &&
        (!filters.dateTo || item.date <= filters.dateTo) &&
        (!filters.status || item.status === filters.status))
        .map((item) => ({ ...item })),
      getOverride: (id) => state.overrides.find((item) => item.overrideId === text(id)) || null,
      saveOverride: (record) => {
        const index = state.overrides.findIndex((item) => item.overrideId === record.overrideId);
        if (index >= 0) state.overrides[index] = { ...record };
        else state.overrides.push({ ...record });
        return { ...record };
      },
      listPolicies: () => state.policies.map((item) => ({ ...item })),
      appendAudit: (record) => { state.audits.push({ ...record }); return { ...record }; },
      listAudit: (filters) => state.audits.filter((item) =>
        (!filters.entityId || item.entityId === filters.entityId) &&
        (!filters.staffId || item.staffId === filters.staffId))
        .map((item) => ({ ...item })),
      getIdempotency: (requestId) => state.idempotency.find((item) => item.requestId === requestId) || null,
      saveIdempotency: (record) => {
        const index = state.idempotency.findIndex((item) => item.requestId === record.requestId);
        if (index >= 0) state.idempotency[index] = { ...record };
        else state.idempotency.push({ ...record });
      },
      listScopes: () => state.scopes.map((item) => ({ ...item })),
      saveScope: (record) => {
        const index = state.scopes.findIndex((item) => item.scopeId === record.scopeId);
        if (index >= 0) state.scopes[index] = { ...record };
        else state.scopes.push({ ...record });
        return { ...record };
      }
    };
  }

  function createService(dependencies) {
    const deps = dependencies || {};
    const repository = deps.repository;
    if (!repository) throw schedulingError("SCHEDULE_REPOSITORY_REQUIRED", "Schedule repository is required.");
    const now = deps.now || (() => new Date().toISOString());
    const uuid = deps.uuid || (() => `${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const withLock = deps.withLock || ((_details, callback) => callback());
    const actorResolver = deps.actorResolver || (() => null);
    const userResolver = deps.userResolver || (() => ({}));

    function allocateId(prefix, exists, code) {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const candidate = `${prefix}-${uuid()}`;
        if (!exists(candidate)) return candidate;
      }
      throw schedulingError(code || "SCHEDULE_ID_ALLOCATION_FAILED", "Could not allocate a unique entity ID.");
    }

    function actorFor(data) {
      const authenticated = normalizeActor(actorResolver(data || {}));
      if (!authenticated.actorId) throw schedulingError("AUTH_REQUIRED", "Authentication is required.");
      return authenticated;
    }

    function staffFor(actor, staffId, manage) {
      const staff = repository.getStaff(staffId);
      if (!staff) throw schedulingError("SCHEDULE_STAFF_NOT_FOUND", "Staff ID does not exist.");
      if (!canAccessStaff(actor, staff, manage)) {
        throw schedulingError("SCHEDULE_SCOPE_DENIED", "Staff member is outside the actor scope.");
      }
      return staff;
    }

    function audit(action, entityType, entityId, staffId, actor, before, after, reason, requestId) {
      repository.appendAudit({
        actionId: allocateId("AUD", (id) =>
          repository.listAudit({}).some((item) => item.actionId === id), "SCHEDULE_AUDIT_ID_ALLOCATION_FAILED"),
        action, entityType, entityId,
        actorId: actor.actorId, actorName: actor.actorName, actorRole: actor.role,
        staffId: staffId || "", beforeState: before || null, afterState: after || null,
        reason: text(reason), timestamp: now(), requestId: requestId || ""
      });
    }

    function mutation(action, data, permission, callback) {
      const requestId = validateId(data.requestId, "REQUEST_ID", "SCHEDULE");
      if (!text(data.reason)) {
        throw schedulingError("SCHEDULE_WRITE_REASON_REQUIRED", "A reason is required for schedule writes.");
      }
      return withLock({ action, requestId }, () => {
        const actor = actorFor(data);
        const requiredPermission = typeof permission === "function"
          ? permission(actor, data) : permission;
        requirePermission(actor, requiredPermission);
        const fingerprint = core.requestFingerprint(action, actor.actorId, sanitizePayloadForFingerprint(data));
        const executeMutation = () => {
        const existing = repository.getIdempotency(requestId);
        if (existing) {
          if (existing.fingerprint !== fingerprint) {
            throw schedulingError("IDEMPOTENCY_KEY_REUSED", "Request ID was used with different input.");
          }
          return { ...existing.response, idempotentReplay: true };
        }
        const result = callback(actor, requestId);
        const response = filterSensitiveFields({ status: "success", code: `${action.toUpperCase()}_OK`, ...result });
        repository.saveIdempotency({
          requestId, action, actorId: actor.actorId, fingerprint,
          response, status: "COMPLETED", createdAt: now()
        });
        return response;
        };
        return typeof repository.withTransaction === "function"
          ? repository.withTransaction({ action, requestId, actorId: actor.actorId }, executeMutation)
          : executeMutation();
      });
    }

    function scheduleRecord(input, actor, requestId, existing, allowDayOff) {
      const staff = staffFor(actor, input.staffId, true);
      const validated = validateScheduleSegment(input, { staff });
      if (validated.recordType === "WEEKLY_DAY_OFF" && allowDayOff !== true) {
        throw schedulingError("SCHEDULE_DAY_OFF_ACTION_REQUIRED", "Use the weekly day-off action.");
      }
      if (existing && existing.readOnly) {
        throw schedulingError("SCHEDULE_LEGACY_READ_ONLY", "Legacy schedule rows cannot be edited or rewritten.");
      }
      const record = {
        ...validated,
        scheduleId: validated.scheduleId || allocateId(
          "SCH", (id) => !!repository.getSchedule(id), "SCHEDULE_ID_ALLOCATION_FAILED"
        ),
        createdAt: existing ? existing.createdAt : now(),
        createdBy: existing ? existing.createdBy : actor.actorId,
        updatedAt: now(),
        updatedBy: actor.actorId,
        lastRequestId: requestId
      };
      const all = repository.listSchedules({});
      assertNoScheduleConflicts(record, all);
      return record;
    }

    function listSchedules(data) {
      const actor = actorFor(data);
      requirePermission(actor, "schedule.view");
      const filters = {
        staffId: text(data.staffId),
        weekday: data.weekday ? normalizeWeekday(data.weekday) : "",
        active: data.active === undefined || data.active === "" ? undefined : boolean(data.active, true)
      };
      let records = repository.listSchedules(filters);
      records = records.filter((item) => {
        const staff = repository.getStaff(item.staffId);
        return staff && canAccessStaff(actor, staff, false);
      });
      const offset = Math.max(0, number(data.offset, 0));
      const limit = Math.min(200, Math.max(1, number(data.limit, 50)));
      return {
        status: "success", code: "SCHEDULE_LIST_OK",
        schedules: filterSensitiveFields(records.slice(offset, offset + limit)),
        total: records.length, offset, limit
      };
    }

    function listOverrides(data) {
      const actor = actorFor(data);
      requirePermission(actor, "schedule.view");
      let records = repository.listOverrides({
        staffId: text(data.staffId),
        dateFrom: data.dateFrom ? core.parseDateKey(data.dateFrom).text : "",
        dateTo: data.dateTo ? core.parseDateKey(data.dateTo).text : "",
        status: data.status ? normalizeOverrideStatus(data.status) : ""
      });
      records = records.filter((item) => {
        if (item.scopeType === "ORGANIZATION") return actor.owner || actor.branchIds.length > 0;
        if (item.scopeType === "BRANCH") return actor.owner || actor.branchIds.includes(item.branchId);
        const staff = repository.getStaff(item.staffId);
        return staff && canAccessStaff(actor, staff, false);
      });
      const offset = Math.max(0, number(data.offset, 0));
      const limit = Math.min(200, Math.max(1, number(data.limit, 50)));
      return {
        status: "success", code: "OVERRIDE_LIST_OK",
        overrides: filterSensitiveFields(records.slice(offset, offset + limit)),
        total: records.length, offset, limit
      };
    }

    const handlers = {
      listStaffSchedules: listSchedules,
      getStaffWeeklySchedule(data) {
        return listSchedules({ ...data, limit: 200 });
      },
      saveScheduleSegment(data) {
        return mutation("saveScheduleSegment", data, "schedule.manage", (actor, requestId) => {
          const existing = data.scheduleId ? repository.getSchedule(data.scheduleId) : null;
          if (existing && existing.staffId !== text(data.staffId)) {
            throw schedulingError("SCHEDULE_ID_STAFF_MISMATCH", "Schedule ID belongs to another staff member.");
          }
          const record = scheduleRecord(data, actor, requestId, existing);
          repository.saveSchedule(record);
          audit(existing ? "UPDATE" : "CREATE", "BARBER_SCHEDULE", record.scheduleId,
            record.staffId, actor, existing, record, data.reason, requestId);
          return { schedule: record };
        });
      },
      bulkSaveScheduleSegments(data) {
        return mutation("bulkSaveScheduleSegments", data, "schedule.manage", (actor, requestId) => {
          const inputs = Array.isArray(data.segments) ? data.segments : [];
          if (!inputs.length || inputs.length > 200) {
            throw schedulingError("SCHEDULE_BULK_SIZE_INVALID", "Bulk save requires 1–200 segments.");
          }
          const prepared = [];
          const simulated = repository.listSchedules({});
          inputs.forEach((input) => {
            const existing = input.scheduleId ? repository.getSchedule(input.scheduleId) : null;
            const record = scheduleRecord(input, actor, requestId, existing);
            assertNoScheduleConflicts(record, simulated.concat(prepared));
            prepared.push(record);
          });
          prepared.forEach((record) => {
            const before = repository.getSchedule(record.scheduleId);
            repository.saveSchedule(record);
            audit(before ? "UPDATE" : "CREATE", "BARBER_SCHEDULE", record.scheduleId,
              record.staffId, actor, before, record, data.reason, requestId);
          });
          return { schedules: prepared, count: prepared.length };
        });
      },
      deactivateScheduleSegment(data) {
        return mutation("deactivateScheduleSegment", data, "schedule.manage", (actor, requestId) => {
          const existing = repository.getSchedule(data.scheduleId);
          if (!existing) throw schedulingError("SCHEDULE_NOT_FOUND", "Schedule record was not found.");
          if (existing.readOnly) {
            throw schedulingError("SCHEDULE_LEGACY_READ_ONLY", "Legacy schedule rows cannot be deactivated or rewritten.");
          }
          staffFor(actor, existing.staffId, true);
          const record = { ...existing, active: false, updatedAt: now(), updatedBy: actor.actorId, lastRequestId: requestId };
          repository.saveSchedule(record);
          audit("DEACTIVATE", "BARBER_SCHEDULE", record.scheduleId, record.staffId,
            actor, existing, record, data.reason, requestId);
          return { schedule: record };
        });
      },
      setWeeklyDayOff(data) {
        return mutation("setWeeklyDayOff", data, "schedule.manage", (actor, requestId) => {
          const staff = staffFor(actor, data.staffId, true);
          const weekday = normalizeWeekday(data.weekday);
          const reason = text(data.reason);
          if (!reason) throw schedulingError("SCHEDULE_DAY_OFF_REASON_REQUIRED", "Weekly day-off reason is required.");
          const existing = repository.listSchedules({
            staffId: staff.staffId, weekday, active: true
          });
          if (existing.some((item) => item.readOnly)) {
            throw schedulingError("SCHEDULE_LEGACY_READ_ONLY", "Legacy schedule rows must remain unchanged.");
          }
          const records = existing.map((item) => ({
            ...item, active: false, updatedAt: now(), updatedBy: actor.actorId,
            lastRequestId: requestId
          }));
          const validated = validateScheduleSegment({
            staffId: staff.staffId, weekday, recordType: "WEEKLY_DAY_OFF",
            effectiveFrom: data.effectiveFrom, effectiveTo: data.effectiveTo,
            active: true
          }, { staff });
          const marker = {
            ...validated,
            scheduleId: allocateId(
              "SCH", (id) => !!repository.getSchedule(id), "SCHEDULE_ID_ALLOCATION_FAILED"
            ),
            createdAt: now(),
            createdBy: actor.actorId, updatedAt: now(), updatedBy: actor.actorId,
            lastRequestId: requestId
          };
          const existingIds = new Set(existing.map((item) => item.scheduleId));
          assertNoScheduleConflicts(marker, repository.listSchedules({})
            .filter((item) => !existingIds.has(item.scheduleId)));
          records.forEach((record) => repository.saveSchedule(record));
          repository.saveSchedule(marker);
          audit("SET_WEEKLY_DAY_OFF", "BARBER_SCHEDULE",
            records.concat(marker).map((item) => item.scheduleId).join(","), staff.staffId,
            actor, existing, records.concat(marker), reason, requestId);
          return {
            weekday, schedules: records, dayOffRecord: marker,
            count: records.length + 1, weeklyDayOff: true
          };
        });
      },
      copyScheduleDay(data) {
        return mutation("copyScheduleDay", data, "schedule.manage", (actor, requestId) => {
          const staff = staffFor(actor, data.staffId, true);
          const from = normalizeWeekday(data.fromWeekday);
          const targets = [...new Set((data.toWeekdays || []).map(normalizeWeekday))].filter((day) => day !== from);
          if (!targets.length) throw schedulingError("SCHEDULE_COPY_TARGET_REQUIRED", "At least one target weekday is required.");
          const sources = repository.listSchedules({ staffId: staff.staffId, weekday: from, active: true });
          sources.sort((a, b) =>
            number(a.segmentIndex, 0) - number(b.segmentIndex, 0) ||
            text(a.shiftStart).localeCompare(text(b.shiftStart)) ||
            text(a.effectiveFrom).localeCompare(text(b.effectiveFrom)) ||
            text(a.scheduleId).localeCompare(text(b.scheduleId)));
          if (!sources.length) throw schedulingError("SCHEDULE_COPY_SOURCE_EMPTY", "Source weekday has no active segments.");
          const records = [];
          targets.forEach((weekday) => sources.forEach((source) => {
            const record = scheduleRecord({
              ...source, scheduleId: "", weekday,
              effectiveFrom: data.effectiveFrom || source.effectiveFrom,
              effectiveTo: data.effectiveTo === undefined ? source.effectiveTo : data.effectiveTo
            }, actor, requestId, null, true);
            assertNoScheduleConflicts(record, repository.listSchedules({}).concat(records));
            records.push(record);
          }));
          records.forEach((record) => repository.saveSchedule(record));
          audit("COPY_DAY", "BARBER_SCHEDULE", records.map((item) => item.scheduleId).join(","),
            staff.staffId, actor, null, records, data.reason, requestId);
          return { schedules: records, count: records.length };
        });
      },
      copyEmployeeSchedule(data) {
        return mutation("copyEmployeeSchedule", data, "schedule.manage", (actor, requestId) => {
          const sourceStaff = staffFor(actor, data.sourceStaffId, false);
          const targetStaff = staffFor(actor, data.targetStaffId, true);
          if (sourceStaff.staffId === targetStaff.staffId) {
            throw schedulingError("SCHEDULE_COPY_SAME_STAFF", "Source and target staff must differ.");
          }
          const sources = repository.listSchedules({ staffId: sourceStaff.staffId, active: true });
          sources.sort((a, b) =>
            WEEKDAYS.indexOf(a.weekday) - WEEKDAYS.indexOf(b.weekday) ||
            number(a.segmentIndex, 0) - number(b.segmentIndex, 0) ||
            text(a.shiftStart).localeCompare(text(b.shiftStart)) ||
            text(a.effectiveFrom).localeCompare(text(b.effectiveFrom)) ||
            text(a.scheduleId).localeCompare(text(b.scheduleId)));
          const records = sources.map((source) => scheduleRecord({
            ...source, scheduleId: "", staffId: targetStaff.staffId,
            effectiveFrom: data.effectiveFrom || source.effectiveFrom,
            effectiveTo: data.effectiveTo === undefined ? source.effectiveTo : data.effectiveTo
          }, actor, requestId, null, true));
          records.forEach((record, index) =>
            assertNoScheduleConflicts(record, repository.listSchedules({}).concat(records.slice(0, index))));
          records.forEach((record) => repository.saveSchedule(record));
          audit("COPY_EMPLOYEE", "BARBER_SCHEDULE", records.map((item) => item.scheduleId).join(","),
            targetStaff.staffId, actor, null, records, data.reason, requestId);
          return { schedules: records, count: records.length };
        });
      },
      applyScheduleDateRange(data) {
        return mutation("applyScheduleDateRange", data, "schedule.manage", (actor, requestId) => {
          const staff = staffFor(actor, data.staffId, true);
          const range = dateRange(data.effectiveFrom, data.effectiveTo, "SCHEDULE");
          const templates = Array.isArray(data.segments) ? data.segments : [];
          if (!templates.length) throw schedulingError("SCHEDULE_TEMPLATE_REQUIRED", "Date-range assignment requires segments.");
          const records = templates.map((item) => scheduleRecord({
            ...item, scheduleId: "", staffId: staff.staffId,
            effectiveFrom: range.from, effectiveTo: range.to
          }, actor, requestId, null, true));
          records.forEach((record, index) =>
            assertNoScheduleConflicts(record, repository.listSchedules({}).concat(records.slice(0, index))));
          records.forEach((record) => repository.saveSchedule(record));
          audit("APPLY_DATE_RANGE", "BARBER_SCHEDULE", records.map((item) => item.scheduleId).join(","),
            staff.staffId, actor, null, records, data.reason, requestId);
          return { schedules: records, count: records.length, effectiveFrom: range.from, effectiveTo: range.to };
        });
      },
      listScheduleOverrides: listOverrides,
      createScheduleOverride(data) {
        const rawType = text(data.type).toUpperCase();
        return mutation("createScheduleOverride", data, (actor) =>
          APPROVAL_CONTROLLED_TYPES.includes(rawType) &&
          text(data.staffId) === actor.staffId ? "leave.request" : "schedule.manage",
        (actor, requestId) => {
          const selfLeave = APPROVAL_CONTROLLED_TYPES.includes(rawType) &&
            text(data.staffId) === actor.staffId;
          const staff = text(data.staffId) ? staffFor(actor, data.staffId, !selfLeave) : null;
          if (selfLeave && (!actor.staffId || actor.staffId !== text(data.staffId))) {
            throw schedulingError("LEAVE_SELF_ONLY", "Employees can request leave only for themselves.");
          }
          const desiredStatus = APPROVAL_CONTROLLED_TYPES.includes(rawType)
            ? "PENDING" : (data.status || "DRAFT");
          if (!APPROVAL_CONTROLLED_TYPES.includes(rawType) &&
            !["DRAFT", "APPROVED"].includes(text(desiredStatus).toUpperCase())) {
            throw schedulingError(
              "OVERRIDE_INITIAL_STATUS_INVALID",
              "Non-leave overrides must be created as DRAFT or APPROVED."
            );
          }
          const record = {
            ...validateOverride({ ...data, status: desiredStatus, requestedBy: actor.actorId }, { staff }),
            overrideId: allocateId(
              "OVR", (id) => !!repository.getOverride(id), "OVERRIDE_ID_ALLOCATION_FAILED"
            ),
            approvedBy: "",
            approvedAt: "",
            createdAt: now(), createdBy: actor.actorId,
            updatedAt: now(), updatedBy: actor.actorId,
            lastRequestId: requestId
          };
          assertNoOverrideConflicts(record, repository.listOverrides({}));
          repository.saveOverride(record);
          audit("CREATE", "STAFF_SCHEDULE_OVERRIDES", record.overrideId, record.staffId,
            actor, null, record, record.reason, requestId);
          return { override: record };
        });
      },
      transitionScheduleOverride(data) {
        return mutation("transitionScheduleOverride", data, "schedule.manage", (actor, requestId) => {
          const existing = repository.getOverride(data.overrideId);
          if (!existing) throw schedulingError("OVERRIDE_NOT_FOUND", "Override was not found.");
          if (existing.staffId) staffFor(actor, existing.staffId, true);
          const next = normalizeOverrideStatus(data.nextStatus);
          const approvalControlled = APPROVAL_CONTROLLED_TYPES.includes(existing.type);
          const allowed = existing.status === "DRAFT" &&
            ((approvalControlled && next === "PENDING") ||
              (!approvalControlled && next === "APPROVED"));
          if (!allowed) {
            throw schedulingError("OVERRIDE_TRANSITION_INVALID", "Override status transition is invalid.");
          }
          const record = {
            ...existing, status: next,
            approvedBy: next === "APPROVED" ? actor.actorId : existing.approvedBy,
            approvedAt: next === "APPROVED" ? now() : existing.approvedAt,
            updatedAt: now(), updatedBy: actor.actorId, lastRequestId: requestId
          };
          assertNoOverrideConflicts(record, repository.listOverrides({}));
          repository.saveOverride(record);
          audit("STATUS_CHANGE", "STAFF_SCHEDULE_OVERRIDES", record.overrideId, record.staffId,
            actor, existing, record, data.reason, requestId);
          return { override: record };
        });
      },
      cancelScheduleOverride(data) {
        return mutation("cancelScheduleOverride", data, (actor) => {
          const candidate = repository.getOverride(data.overrideId);
          const selfPendingLeave = candidate &&
            APPROVAL_CONTROLLED_TYPES.includes(candidate.type) &&
            ["DRAFT", "PENDING"].includes(candidate.status) &&
            candidate.requestedBy === actor.actorId &&
            candidate.staffId === actor.staffId;
          return selfPendingLeave ? "leave.request" : "schedule.manage";
        }, (actor, requestId) => {
          const existing = repository.getOverride(data.overrideId);
          if (!existing) throw schedulingError("OVERRIDE_NOT_FOUND", "Override was not found.");
          const selfPendingLeave = APPROVAL_CONTROLLED_TYPES.includes(existing.type) &&
            ["DRAFT", "PENDING"].includes(existing.status) &&
            existing.requestedBy === actor.actorId &&
            existing.staffId === actor.staffId;
          if (existing.staffId) staffFor(actor, existing.staffId, !selfPendingLeave);
          if (!(OVERRIDE_TRANSITIONS[existing.status] || []).includes("CANCELLED")) {
            throw schedulingError("OVERRIDE_TRANSITION_INVALID", "Override cannot be cancelled from its current status.");
          }
          if (!text(data.reason)) throw schedulingError("OVERRIDE_CANCEL_REASON_REQUIRED", "Cancellation reason is required.");
          const record = {
            ...existing, status: "CANCELLED",
            cancelledAt: now(), cancelledBy: actor.actorId,
            updatedAt: now(), updatedBy: actor.actorId, cancellationReason: text(data.reason),
            lastRequestId: requestId
          };
          repository.saveOverride(record);
          audit("CANCEL", "STAFF_SCHEDULE_OVERRIDES", record.overrideId, record.staffId,
            actor, existing, record, data.reason, requestId);
          return { override: record, compensatingEvidence: true };
        });
      },
      reviewScheduleOverride(data) {
        return mutation("reviewScheduleOverride", data, "leave.approve", (actor, requestId) => {
          const existing = repository.getOverride(data.overrideId);
          if (!existing) throw schedulingError("OVERRIDE_NOT_FOUND", "Override was not found.");
          if (!APPROVAL_CONTROLLED_TYPES.includes(existing.type) || existing.status !== "PENDING") {
            throw schedulingError("OVERRIDE_TRANSITION_INVALID", "Only pending leave overrides can be reviewed.");
          }
          if (existing.requestedBy === actor.actorId) {
            throw schedulingError("LEAVE_SELF_APPROVAL_FORBIDDEN", "Leave requester cannot approve their own request.");
          }
          staffFor(actor, existing.staffId, false);
          const decision = text(data.decision).toUpperCase();
          if (!["APPROVED", "REJECTED"].includes(decision)) {
            throw schedulingError("OVERRIDE_REVIEW_DECISION_INVALID", "Decision must be APPROVED or REJECTED.");
          }
          const record = {
            ...existing, status: decision, approvedBy: decision === "APPROVED" ? actor.actorId : "",
            approvedAt: decision === "APPROVED" ? now() : "", reviewReason: text(data.reason),
            sourceEvidence: existing.sourceEvidence || text(data.sourceEvidence),
            updatedAt: now(), updatedBy: actor.actorId, lastRequestId: requestId
          };
          if (decision === "APPROVED" && !record.sourceEvidence) {
            throw schedulingError("OVERRIDE_APPROVAL_EVIDENCE_REQUIRED", "Approval evidence is required.");
          }
          assertNoOverrideConflicts(record, repository.listOverrides({}));
          repository.saveOverride(record);
          audit(`REVIEW_${decision}`, "STAFF_SCHEDULE_OVERRIDES", record.overrideId, record.staffId,
            actor, existing, record, data.reason, requestId);
          return { override: record };
        });
      },
      resolveStaffSchedule(data) {
        const actor = actorFor(data);
        requirePermission(actor, "schedule.view");
        const staff = staffFor(actor, data.staffId, false);
        const schedules = repository.listSchedules({ staffId: staff.staffId });
        const overrides = repository.listOverrides({
          dateFrom: core.parseDateKey(data.date).text,
          dateTo: core.parseDateKey(data.date).text
        });
        let policyResolution = { snapshot: {} };
        const policies = repository.listPolicies();
        if (policies.length) policyResolution = core.resolveEffectivePolicy(policies, staff.staffId, data.date);
        return {
          status: "success", code: "SCHEDULE_RESOLUTION_OK",
          resolvedSchedule: filterSensitiveFields(resolveSchedule({
            staff, date: data.date, schedules, overrides, policyResolution
          }))
        };
      },
      resolveStaffSchedulesRange(data) {
        const actor = actorFor(data);
        requirePermission(actor, "schedule.view");
        const from = core.parseDateKey(data.dateFrom);
        const to = core.parseDateKey(data.dateTo);
        if (from.epochDay > to.epochDay || to.epochDay - from.epochDay > 62) {
          throw schedulingError("SCHEDULE_RESOLUTION_RANGE_INVALID", "Resolution range must be 1–63 days.");
        }
        const requestedIds = Array.isArray(data.staffIds) && data.staffIds.length
          ? [...new Set(data.staffIds.map(text))]
          : repository.listStaff().map((item) => item.staffId);
        if (requestedIds.length > 100) throw schedulingError("SCHEDULE_RESOLUTION_STAFF_LIMIT", "At most 100 staff may be resolved.");
        const results = [];
        requestedIds.forEach((staffId) => {
          const staff = staffFor(actor, staffId, false);
          for (let epoch = from.epochDay; epoch <= to.epochDay; epoch += 1) {
            const date = new Date(epoch * 86400000).toISOString().slice(0, 10);
            const schedules = repository.listSchedules({ staffId });
            const overrides = repository.listOverrides({ dateFrom: date, dateTo: date });
            const policies = repository.listPolicies();
            const policyResolution = policies.length
              ? core.resolveEffectivePolicy(policies, staffId, date) : { snapshot: {} };
            results.push(filterSensitiveFields(resolveSchedule({
              staff, date, schedules, overrides, policyResolution
            })));
          }
        });
        return { status: "success", code: "SCHEDULE_RANGE_RESOLUTION_OK", resolvedSchedules: results };
      },
      getScheduleAuditHistory(data) {
        const actor = actorFor(data);
        requirePermission(actor, "schedule.view");
        const records = repository.listAudit({ entityId: text(data.entityId), staffId: text(data.staffId) });
        const filtered = records.filter((item) => {
          if (!item.staffId) return actor.owner;
          const staff = repository.getStaff(item.staffId);
          return staff && canAccessStaff(actor, staff, false);
        });
        return { status: "success", code: "SCHEDULE_AUDIT_OK", audit: filterSensitiveFields(filtered.slice(-200)) };
      },
      getSchedulePageData(data) {
        const actor = actorFor(data);
        requirePermission(actor, "schedule.view");
        const staff = repository.listStaff().filter((item) => canAccessStaff(actor, item, false));
        return {
          status: "success", code: "SCHEDULE_PAGE_DATA_OK",
          staff: filterSensitiveFields(staff),
          permissions: {
            view: true,
            manage: hasPermission(actor, "schedule.manage"),
            leaveRequest: hasPermission(actor, "leave.request"),
            leaveApprove: hasPermission(actor, "leave.approve"),
            owner: actor.owner
          },
          branches: [...new Set(staff.map((item) => item.branchId).filter(Boolean))]
        };
      },
      listScheduleUserScopes(data) {
        const actor = actorFor(data);
        if (!actor.owner) throw schedulingError("OWNER_REQUIRED", "Only owner can view schedule user scopes.");
        return {
          status: "success", code: "SCHEDULE_SCOPE_LIST_OK",
          scopes: filterSensitiveFields(repository.listScopes())
        };
      },
      saveScheduleUserScope(data) {
        const actor = actorFor(data);
        if (!actor.owner) throw schedulingError("OWNER_REQUIRED", "Only owner can manage schedule user scopes.");
        return mutation("saveScheduleUserScope", data, "schedule.manage", (verifiedActor, requestId) => {
          const username = validateId(data.username, "USERNAME", "SCHEDULE_SCOPE");
          if (!userResolver(username)) {
            throw schedulingError("SCHEDULE_SCOPE_USER_NOT_FOUND", "Scope username is not an authenticated application user.");
          }
          const staffId = text(data.staffId);
          if (staffId && !repository.getStaff(staffId)) {
            throw schedulingError("SCHEDULE_SCOPE_STAFF_NOT_FOUND", "Scope staff ID does not exist.");
          }
          const role = text(data.role || "EMPLOYEE").toUpperCase();
          if (!["EMPLOYEE", "MANAGER"].includes(role)) {
            throw schedulingError("SCHEDULE_SCOPE_ROLE_INVALID", "Scope role must be EMPLOYEE or MANAGER.");
          }
          const branchIds = Array.isArray(data.branchIds)
            ? [...new Set(data.branchIds.map(text).filter(Boolean))] : [];
          if (role === "EMPLOYEE" && !staffId) {
            throw schedulingError("SCHEDULE_SCOPE_STAFF_REQUIRED", "Employee scope requires a staff ID.");
          }
          if (role === "MANAGER" && !branchIds.length) {
            throw schedulingError("SCHEDULE_SCOPE_BRANCH_REQUIRED", "Manager scope requires at least one branch.");
          }
          const scopes = repository.listScopes();
          const usernameMatches = scopes.filter((item) => item.username === username);
          let before = null;
          if (data.scopeId) {
            before = scopes.find((item) => item.scopeId === text(data.scopeId)) || null;
            if (!before) throw schedulingError("SCHEDULE_SCOPE_NOT_FOUND", "Schedule scope was not found.");
            if (before.username !== username) {
              throw schedulingError("SCHEDULE_SCOPE_USERNAME_IMMUTABLE", "Scope username cannot be changed.");
            }
          } else if (usernameMatches.length > 1) {
            throw schedulingError("SCHEDULE_SCOPE_AMBIGUOUS", "Specify the scope ID to repair duplicate mappings.");
          } else {
            before = usernameMatches[0] || null;
          }
          const record = {
            scopeId: data.scopeId || (before && before.scopeId) || allocateId(
              "SCOPE",
              (id) => repository.listScopes().some((item) => item.scopeId === id),
              "SCHEDULE_SCOPE_ID_ALLOCATION_FAILED"
            ),
            username, staffId,
            role,
            branchIds,
            active: boolean(data.active, true), updatedAt: now(), updatedBy: verifiedActor.actorId,
            createdAt: (before && before.createdAt) || now(),
            createdBy: (before && before.createdBy) || verifiedActor.actorId,
            requestId
          };
          repository.saveScope(record);
          audit(before ? "UPDATE_SCOPE" : "CREATE_SCOPE", "SCHEDULE_USER_SCOPES",
            record.scopeId, record.staffId, verifiedActor, before, record, data.reason, requestId);
          return { scope: record };
        });
      }
    };

    return Object.freeze({
      execute(action, data) {
        if (!ACTIONS.includes(action) || action === "previewStaffScheduleMigration") {
          throw schedulingError("SCHEDULE_ACTION_UNKNOWN", "Schedule action is not supported.");
        }
        return handlers[action](data || {});
      },
      handlers
    });
  }

  function canonicalHeader(value) {
    return text(value).toUpperCase().replace(/[\s-]+/g, "_").replace(/_+/g, "_");
  }

  function normalizeLegacyClock(value) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0 && value < 1) {
      const totalMinutes = Math.round(value * 1440) % 1440;
      return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${
        String(totalMinutes % 60).padStart(2, "0")}`;
    }
    const raw = text(value);
    const match = /^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?$/.exec(raw);
    if (!match || Number(match[1]) > 23) return raw;
    return `${String(Number(match[1])).padStart(2, "0")}:${match[2]}${
      match[3] ? `:${match[3]}` : ""}`;
  }

  function planScheduleMigration(existingSheets, identity) {
    const existing = existingSheets || {};
    const target = identity || {};
    const report = {
      version: PHASE2_VERSION,
      dryRun: true,
      writes: 0,
      identity: {
        environment: text(target.environment),
        expectedSpreadsheetId: text(target.expectedSpreadsheetId),
        actualSpreadsheetId: text(target.actualSpreadsheetId)
      },
      createSheets: [],
      initializeBlankSheets: [],
      appendColumns: {},
      unchangedSheets: [],
      preservedUnknownColumns: {},
      errors: [],
      rollback: { createdSheets: [], appendedColumnRanges: [], historicalRowsTouched: 0 }
    };
    if (!report.identity.environment || !report.identity.expectedSpreadsheetId || !report.identity.actualSpreadsheetId) {
      report.errors.push({ code: "MIGRATION_IDENTITY_REQUIRED" });
    } else if (report.identity.expectedSpreadsheetId !== report.identity.actualSpreadsheetId) {
      report.errors.push({ code: "SPREADSHEET_IDENTITY_MISMATCH" });
    }
    if (["production", "staging"].includes(report.identity.environment.toLowerCase()) &&
      target.environmentReviewApproved !== true) {
      report.errors.push({ code: "ENVIRONMENT_NOT_APPROVED" });
    }
    Object.entries(PHASE2_SHEET_SCHEMAS).forEach(([sheetName, desired]) => {
      const raw = Object.prototype.hasOwnProperty.call(existing, sheetName) ? existing[sheetName] : null;
      if (raw === null) {
        report.createSheets.push({ sheetName, headers: [...desired] });
        report.rollback.createdSheets.push(sheetName);
        return;
      }
      const current = (raw || []).map(canonicalHeader);
      const nonBlank = current.filter(Boolean);
      if (!nonBlank.length) {
        report.initializeBlankSheets.push({ sheetName, headers: [...desired] });
        return;
      }
      const duplicates = nonBlank.filter((header, index) => nonBlank.indexOf(header) !== index);
      if (duplicates.length) {
        report.errors.push({ sheetName, code: "DUPLICATE_HEADERS", headers: [...new Set(duplicates)] });
        return;
      }
      const legacy = sheetName === "BARBER_SCHEDULE" ? schema.LEGACY_SCHEDULE_HEADERS : [];
      if (legacy.some((header, index) => current[index] !== canonicalHeader(header))) {
        report.errors.push({ sheetName, code: "INCOMPATIBLE_LEGACY_SCHEDULE_PREFIX" });
        return;
      }
      const desiredKeys = desired.map(canonicalHeader);
      const unknown = nonBlank.filter((header) => !desiredKeys.includes(header));
      if (unknown.length) report.preservedUnknownColumns[sheetName] = unknown;
      const missing = desiredKeys.filter((header) => !current.includes(header));
      if (missing.length) {
        report.appendColumns[sheetName] = missing;
        report.rollback.appendedColumnRanges.push({
          sheetName, startColumn: current.length + 1,
          endColumn: current.length + missing.length, headers: missing
        });
      } else {
        report.unchangedSheets.push(sheetName);
      }
    });
    report.safe = report.errors.length === 0;
    return Object.freeze(report);
  }

  function normalizeLegacyScheduleRow(row, headers, fallbackPolicy) {
    const values = Array.isArray(row) ? row : [];
    const names = Array.isArray(headers) ? headers.map(canonicalHeader) : [];
    const value = (header) => {
      const index = names.indexOf(canonicalHeader(header));
      return index >= 0 ? values[index] : "";
    };
    schema.LEGACY_SCHEDULE_HEADERS.forEach((header) => {
      if (!names.includes(canonicalHeader(header))) {
        throw schedulingError("INCOMPATIBLE_LEGACY_SCHEDULE_PREFIX", `Missing legacy schedule header: ${header}.`);
      }
    });
    if (values.every((item) => text(item) === "")) {
      return Object.freeze({
        blank: true, readOnly: true, resolutionEligible: false,
        compatibilityStatus: "LEGACY_BLANK_ROW", warnings: ["LEGACY_BLANK_ROW_IGNORED"]
      });
    }
    const issues = [];
    const scheduleId = text(value("SCHEDULE_ID"));
    const staffId = text(value("STAFF_ID"));
    const staffName = text(value("STAFF_NAME"));
    if (!scheduleId) issues.push("LEGACY_SCHEDULE_ID_MISSING");
    if (!staffId) issues.push("LEGACY_STAFF_ID_MISSING");
    if (!staffName) issues.push("LEGACY_STAFF_NAME_MISSING");
    let weekday = "";
    let interval = null;
    try {
      weekday = normalizeWeekday(value("WEEKDAY"));
    } catch (_error) {
      issues.push("LEGACY_WEEKDAY_INVALID");
    }
    const recordType = text(value("RECORD_TYPE") || "SHIFT").toUpperCase();
    if (recordType === "WEEKLY_DAY_OFF") {
      interval = { start: "", end: "", durationMinutes: 0,
        weekStart: WEEKDAYS.indexOf(weekday) * 1440,
        weekEnd: WEEKDAYS.indexOf(weekday) * 1440 };
    } else if (weekday) {
      try {
        interval = shiftInterval(
          weekday, normalizeLegacyClock(value("SHIFT_START")),
          normalizeLegacyClock(value("SHIFT_END"))
        );
      } catch (_error) {
        issues.push("LEGACY_SHIFT_TIME_INVALID");
      }
    }
    let effectiveFrom = "0001-01-01";
    let effectiveTo = "";
    try {
      if (value("EFFECTIVE_FROM")) effectiveFrom = core.parseDateKey(value("EFFECTIVE_FROM")).text;
      if (value("EFFECTIVE_TO")) effectiveTo = core.parseDateKey(value("EFFECTIVE_TO")).text;
      if (effectiveTo && effectiveFrom > effectiveTo) issues.push("LEGACY_EFFECTIVE_RANGE_INVALID");
    } catch (_error) {
      issues.push("LEGACY_EFFECTIVE_DATE_INVALID");
    }
    const phase2 = names.includes("SEGMENT_INDEX");
    const unresolved = issues.length > 0;
    return Object.freeze({
      scheduleId,
      staffId,
      staffName,
      weekday,
      shiftStart: interval ? interval.start : text(value("SHIFT_START")),
      shiftEnd: interval ? interval.end : text(value("SHIFT_END")),
      active: boolean(value("ACTIVE"), true),
      updatedAt: text(value("UPDATED_AT")),
      createdAt: text(value("CREATED_AT")),
      createdBy: text(value("CREATED_BY")),
      updatedBy: text(value("UPDATED_BY")),
      branchId: text(value("BRANCH_ID")),
      lastRequestId: text(value("LAST_REQUEST_ID")),
      segmentIndex: value("SEGMENT_INDEX") === "" ? 1 : number(value("SEGMENT_INDEX"), 1),
      requiredWorkMinutes: value("REQUIRED_WORK_MINUTES") === ""
        ? (fallbackPolicy && fallbackPolicy.requiredDailyMinutes !== undefined
          ? number(fallbackPolicy.requiredDailyMinutes, 0) : "")
        : number(value("REQUIRED_WORK_MINUTES")),
      allowedBreakMinutes: value("ALLOWED_BREAK_MINUTES") === ""
        ? (fallbackPolicy && fallbackPolicy.allowedBreakMinutes !== undefined
          ? number(fallbackPolicy.allowedBreakMinutes, 0) : "")
        : number(value("ALLOWED_BREAK_MINUTES")),
      effectiveFrom,
      effectiveTo,
      recordType: recordType === "WEEKLY_DAY_OFF" ? recordType : "SHIFT",
      compatibilityStatus: unresolved
        ? "LEGACY_UNRESOLVED" : phase2 ? "PHASE2" : "LEGACY_INHERITED_POLICY",
      readOnly: !phase2 || unresolved,
      resolutionEligible: !unresolved,
      warnings: issues,
      durationMinutes: interval ? interval.durationMinutes : 0,
      weekStart: interval ? interval.weekStart : 0,
      weekEnd: interval ? interval.weekEnd : 0,
      legacy: !phase2
    });
  }

  function classifyLegacyScheduleRows(rows) {
    const records = (rows || []).map((item) => ({ ...item, warnings: [...(item.warnings || [])] }));
    for (let left = 0; left < records.length; left += 1) {
      const a = records[left];
      if (!a.legacy || a.blank || a.resolutionEligible === false || !a.active) continue;
      for (let right = left + 1; right < records.length; right += 1) {
        const b = records[right];
        if (!b.legacy || b.blank || b.resolutionEligible === false || !b.active ||
          a.staffId !== b.staffId || !effectiveRangesOverlap(a, b) ||
          !weeklyIntervalsOverlap(a, b)) continue;
        a.resolutionEligible = false;
        b.resolutionEligible = false;
        a.readOnly = true;
        b.readOnly = true;
        a.compatibilityStatus = "LEGACY_UNRESOLVED";
        b.compatibilityStatus = "LEGACY_UNRESOLVED";
        if (!a.warnings.includes("LEGACY_AMBIGUOUS_OVERLAP")) a.warnings.push("LEGACY_AMBIGUOUS_OVERLAP");
        if (!b.warnings.includes("LEGACY_AMBIGUOUS_OVERLAP")) b.warnings.push("LEGACY_AMBIGUOUS_OVERLAP");
      }
    }
    return records.filter((item) => !item.blank).map((item) => Object.freeze(item));
  }

  return Object.freeze({
    PHASE2_VERSION,
    TIME_ZONE,
    WEEKDAYS,
    OVERRIDE_TYPES,
    FULL_DAY_TYPES,
    INTERVAL_TYPES,
    APPROVAL_CONTROLLED_TYPES,
    OVERRIDE_TRANSITIONS,
    ACTIONS,
    WRITE_ACTIONS,
    PHASE2_SHEET_SCHEMAS,
    normalizeWeekday,
    validateScheduleSegment,
    scheduleConflict,
    assertNoScheduleConflicts,
    validateOverride,
    overrideConflict,
    assertNoOverrideConflicts,
    resolveSchedule,
    filterSensitiveFields,
    createMemoryRepository,
    createService,
    planScheduleMigration,
    normalizeLegacyScheduleRow,
    classifyLegacyScheduleRows,
    schedulingError
  });
});
