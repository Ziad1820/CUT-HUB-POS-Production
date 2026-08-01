(function (root, factory) {
  const schema = typeof module !== "undefined" && module.exports
    ? require("./staff-attendance-schema") : root.StaffAttendanceSchema;
  const core = typeof module !== "undefined" && module.exports
    ? require("./staff-attendance-core") : root.StaffAttendanceCore;
  const scheduling = typeof module !== "undefined" && module.exports
    ? require("./staff-scheduling-phase2") : root.StaffSchedulingPhase2;
  const api = factory(schema, core, scheduling);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.StaffAttendancePhase3 = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (schema, core, scheduling) {
  "use strict";

  const PHASE3_VERSION = "STAFF_ATTENDANCE_PHASE3_V1";
  const TIME_ZONE = "Africa/Cairo";
  const EVENT_TYPES = Object.freeze([
    "CHECK_IN", "BREAK_START", "BREAK_END", "CHECK_OUT",
    "MANAGER_MARK_ABSENT", "CANCEL_EVENT", "CORRECTION", "REOPEN_DAY",
    "CLOSE_DAY", "OVERTIME_REQUEST", "OVERTIME_APPROVED",
    "OVERTIME_REJECTED", "ADJUSTMENT_REQUESTED", "ADJUSTMENT_APPROVED",
    "ADJUSTMENT_REJECTED"
  ]);
  const ACTIONS = Object.freeze([
    "getAttendanceDashboard", "getEmployeeAttendanceDay", "listAttendanceEvents",
    "attendanceCheckIn", "attendanceStartBreak", "attendanceEndBreak",
    "attendanceCheckOut", "markAttendanceAbsent", "requestAttendanceCorrection",
    "approveAttendanceCorrection", "rejectAttendanceCorrection",
    "cancelAttendanceEvent", "reopenAttendanceDay", "closeAttendanceDay",
    "recalculateAttendanceDay", "requestAttendanceOvertime",
    "approveAttendanceOvertime", "rejectAttendanceOvertime",
    "listUnresolvedAttendanceDays", "listOpenAttendanceBreaks",
    "getAttendanceAuditHistory", "listLegacyAttendanceRecords", "previewAttendanceMigration"
  ]);
  const WRITE_ACTIONS = new Set(ACTIONS.filter((action) => ![
    "getAttendanceDashboard", "getEmployeeAttendanceDay", "listAttendanceEvents",
    "listUnresolvedAttendanceDays", "listOpenAttendanceBreaks",
    "getAttendanceAuditHistory", "listLegacyAttendanceRecords", "previewAttendanceMigration"
  ].includes(action)));
  const BLOCKED_CLASSIFICATIONS = new Set([
    "WEEKLY_DAY_OFF", "APPROVED_LEAVE", "UNPAID_LEAVE", "SICK_LEAVE",
    "BRANCH_CLOSED", "ABSENT", "CLOSED", "DAY_OFF"
  ]);
  const CALCULATION_EVENT_TYPES = Object.freeze([
    "CHECK_IN", "BREAK_START", "BREAK_END", "CHECK_OUT",
    "MANAGER_MARK_ABSENT", "CANCEL_EVENT", "CORRECTION"
  ]);
  const MAX_SESSIONS_PER_DAY = 20;
  const MAX_BREAKS_PER_DAY = 50;
  const SENSITIVE = /salary|wage|rate|currency|amount|deduction|settlement|password|token|secret|fingerprint|spreadsheet|environment|recovery|requestid|lastrequestid/i;

  function text(value) { return String(value === undefined || value === null ? "" : value).trim(); }
  function upper(value) { return text(value).toUpperCase(); }
  function number(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : (fallback === undefined ? 0 : fallback);
  }
  function bool(value) { return value === true || upper(value) === "TRUE"; }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function attendanceError(code, message, details) {
    const error = new Error(message);
    error.code = code;
    if (details !== undefined) error.details = details;
    return error;
  }
  function requireText(value, code, message) {
    const result = text(value);
    if (!result) throw attendanceError(code, message);
    return result;
  }
  function parseJson(value, fallback) {
    if (value && typeof value === "object") return clone(value);
    try { return JSON.parse(text(value) || JSON.stringify(fallback)); } catch (_error) { return clone(fallback); }
  }
  function stable(value) {
    if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map(key =>
        `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value === undefined ? null : value);
  }
  function fingerprint(action, actorId, data) {
    const excluded = new Set([
      "sessionToken", "token", "authToken", "actor", "actorId", "actorName",
      "actorRole", "timestamp", "eventAt", "createdAt", "updatedAt"
    ]);
    const safe = Object.fromEntries(Object.entries(data || {}).filter(([key]) => !excluded.has(key)));
    return core.requestFingerprint(action, actorId, safe);
  }
  function filterSensitiveFields(value) {
    if (Array.isArray(value)) return value.map(filterSensitiveFields);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !SENSITIVE.test(key) && key !== "_rowNumber")
      .map(([key, item]) => {
        if (/Json$/i.test(key) && typeof item === "string") {
          const parsed = parseJson(item, null);
          return [key, parsed === null ? "" : stable(filterSensitiveFields(parsed))];
        }
        return [key, filterSensitiveFields(item)];
      }));
  }
  function normalizeLegacyAttendanceRows(headers, rows) {
    const canonical = (value) => text(value).toUpperCase()
      .replace(/[\s-]+/g, "_").replace(/_+/g, "_");
    const names = (headers || []).map(canonical);
    const duplicateHeaders = names.filter((name, index) =>
      name && names.indexOf(name) !== index);
    if (duplicateHeaders.length) {
      throw attendanceError("ATTENDANCE_LEGACY_DUPLICATE_HEADERS",
        "Legacy attendance headers are ambiguous.");
    }
    const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
    const normalized = (rows || []).filter((row) =>
      Array.isArray(row) && row.some((value) => text(value))).map((row, index) => {
      let item;
      const issues = [];
      try {
        item = clone(core.normalizeLegacyAttendanceRow(row, headers));
      } catch (error) {
        item = { compatibilityStatus: "LEGACY_INVALID", readOnly: true };
        issues.push(error.code || "INCOMPATIBLE_EXISTING_SCHEMA");
      }
      ["checkInLegacy", "breakOutLegacy", "breakInLegacy", "checkOutLegacy"].forEach((field) => {
        if (item[field] && !timePattern.test(item[field])) {
          issues.push(`MALFORMED_${field.toUpperCase()}`);
        }
      });
      if (!item.id) issues.push("MISSING_STABLE_ID");
      if (!item.staffId) issues.push("MISSING_STAFF_ID");
      if (!item.date) issues.push("MISSING_DATE");
      const value = (header) => {
        const column = names.indexOf(canonical(header));
        return column < 0 ? "" : text(row[column]);
      };
      const deleted = ["DELETED", "IS_DELETED"].some((header) =>
        ["TRUE", "YES", "1"].includes(upper(value(header)))) ||
        upper(value("ACTIVE")) === "FALSE" || upper(value("STATUS")) === "DELETED";
      return {
        ...item,
        sourceRowNumber: index + 2,
        compatibilityStatus: deleted ? "LEGACY_DELETED" :
          issues.length ? "LEGACY_INVALID" : "LEGACY_UNMIGRATED",
        issues: [...new Set(issues)],
        readOnly: true
      };
    });
    const groups = new Map();
    normalized.forEach((item) => {
      if (item.compatibilityStatus !== "LEGACY_UNMIGRATED") return;
      const key = `${item.staffId}|${item.date}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    groups.forEach((items) => {
      if (items.length < 2) return;
      items.forEach((item) => {
        item.compatibilityStatus = "LEGACY_AMBIGUOUS";
        item.issues.push("DUPLICATE_STAFF_DATE");
      });
    });
    return normalized.map((item) => Object.freeze(item));
  }
  function normalizeActor(value) {
    const actor = value || {};
    return Object.freeze({
      actorId: text(actor.actorId || actor.username),
      actorName: text(actor.actorName || actor.displayName || actor.username),
      role: upper(actor.role || "EMPLOYEE"),
      staffId: text(actor.staffId),
      branchIds: Array.isArray(actor.branchIds) ? actor.branchIds.map(text).filter(Boolean) : [],
      permissions: Array.isArray(actor.permissions) ? actor.permissions.map(text) : [],
      owner: actor.owner === true || text(actor.username).toLowerCase() === "owner"
    });
  }
  function attendancePolicySnapshot(value) {
    const policy = value || {};
    return Object.freeze({
      policyId: text(policy.policyId),
      requiredDailyMinutes: number(policy.requiredDailyMinutes, 0),
      allowedBreakMinutes: number(policy.allowedBreakMinutes, 0),
      breakPaymentType: upper(policy.breakPaymentType || "UNPAID"),
      allowMultipleBreaks: policy.allowMultipleBreaks !== false,
      maximumSingleBreakMinutes: number(
        policy.maximumSingleBreakMinutes || policy.maxSingleBreakMinutes, 0),
      breakGraceMinutes: number(policy.breakGraceMinutes, 0),
      excessBreakContributesToDeficit: policy.excessBreakContributesToDeficit !== false,
      graceLateMinutes: number(policy.graceLateMinutes, 0),
      graceEarlyLeaveMinutes: number(policy.graceEarlyLeaveMinutes, 0),
      overtimeApprovalRequired: policy.overtimeApprovalRequired !== false,
      minimumOvertimeThresholdMinutes: number(
        policy.minimumOvertimeThresholdMinutes || policy.minOvertimeThresholdMinutes, 0),
      dailyOvertimeCapMinutes: number(policy.dailyOvertimeCapMinutes, 0),
      roundingIncrementMinutes: number(policy.roundingIncrementMinutes, 0),
      roundingMode: upper(policy.roundingMode || "NONE")
    });
  }
  function hasPermission(actor, permission) {
    return actor.owner || actor.permissions.includes(permission);
  }
  function requirePermission(actor, permission) {
    if (!hasPermission(actor, permission)) {
      throw attendanceError("ATTENDANCE_PERMISSION_DENIED", `Permission required: ${permission}.`);
    }
  }
  function assertScope(actor, staff, selfOnly) {
    if (!staff || !staff.staffId) throw attendanceError("ATTENDANCE_STAFF_NOT_FOUND", "Staff record was not found.");
    if (staff.active === false) throw attendanceError("ATTENDANCE_STAFF_INACTIVE", "Inactive staff cannot record attendance.");
    if (actor.owner) return;
    if (selfOnly && actor.staffId !== staff.staffId) {
      throw attendanceError("ATTENDANCE_SELF_ONLY", "Employees may act only for themselves.");
    }
    if (actor.staffId === staff.staffId) return;
    if (!staff.branchId || !actor.branchIds.includes(staff.branchId)) {
      throw attendanceError("ATTENDANCE_BRANCH_SCOPE_DENIED", "Staff is outside the actor branch scope.");
    }
  }
  function id(prefix, uuid) {
    return `${prefix}-${text(uuid()).replace(/[^A-Za-z0-9]/g, "").slice(0, 24)}`;
  }
  function dateFromInstant(instant) {
    const match = text(instant).match(/^(\d{4}-\d{2}-\d{2})T/);
    if (!match || !Number.isFinite(Date.parse(instant))) {
      throw attendanceError("ATTENDANCE_SERVER_TIME_INVALID", "Server timestamp must be an ISO instant.");
    }
    return match[1];
  }
  function previousDate(date) {
    const parsed = core.parseDateKey(date);
    return new Date((parsed.epochDay - 1) * 86400000).toISOString().slice(0, 10);
  }
  function clockFromInstant(instant) { return text(instant).slice(11, 16); }
  function instantMinute(instant) {
    const value = Date.parse(instant);
    if (!Number.isFinite(value)) throw attendanceError("ATTENDANCE_EVENT_TIME_INVALID", "Attendance event timestamp is invalid.");
    return Math.floor(value / 60000);
  }

  function resolveAttendanceContext(options) {
    const data = options || {};
    const staff = data.staff;
    const at = requireText(data.serverNow, "ATTENDANCE_SERVER_TIME_REQUIRED", "Server time is required.");
    const cairoDate = dateFromInstant(at);
    const yesterday = previousDate(cairoDate);
    const requested = data.requestedDate ? core.parseDateKey(data.requestedDate).text : "";
    const candidates = [cairoDate, yesterday];
    if (requested === cairoDate || requested === yesterday) candidates.unshift(requested);
    const unique = [...new Set(candidates)];
    const resolved = unique.map((date) => ({
      date,
      schedule: data.scheduleResolver(staff, date)
    }));
    let selected = resolved[0];
    const atDate = core.parseDateKey(cairoDate);
    const atCivilMinute = core.parseClock(clockFromInstant(at));
    for (const candidate of resolved) {
      const segments = candidate.schedule && candidate.schedule.shiftSegments || [];
      if (!segments.length) continue;
      const first = segments[0];
      const last = segments[segments.length - 1];
      const candidateDate = core.parseDateKey(candidate.date);
      const eventTimeline = (atDate.epochDay - candidateDate.epochDay) * 1440 + atCivilMinute;
      const start = core.parseClock(first.shiftStart);
      let end = core.parseClock(last.shiftEnd);
      if (end <= start) end += 1440;
      if (eventTimeline >= start - 360 && eventTimeline <= end + 360) {
        selected = candidate;
        break;
      }
    }
    return Object.freeze({
      date: selected.date,
      schedule: selected.schedule || {
        date: selected.date, sourceType: "NONE", sourceIds: [], shiftSegments: [],
        requiredWorkMinutes: 0, allowedBreakMinutes: 0, classification: "NOT_SCHEDULED",
        warnings: ["NO_RESOLVED_SCHEDULE"]
      },
      timezone: TIME_ZONE
    });
  }

  function effectiveEvents(events) {
    const ordered = (events || []).slice().sort((a, b) =>
      instantMinute(a.eventAt) - instantMinute(b.eventAt) ||
      number(a.eventSequence, Number.MAX_SAFE_INTEGER) -
        number(b.eventSequence, Number.MAX_SAFE_INTEGER) ||
      text(a.createdAt).localeCompare(text(b.createdAt)) ||
      text(a.eventId).localeCompare(text(b.eventId)));
    const cancelled = new Set(ordered.filter((item) => item.eventType === "CANCEL_EVENT")
      .map((item) => item.reversesEventId).filter(Boolean));
    const corrections = new Map();
    ordered.filter((item) => item.eventType === "CORRECTION").forEach((item) => {
      const payload = parseJson(item.correctionPayloadJson || item.correctionPayload, {});
      if (payload.replacesEventId) corrections.set(payload.replacesEventId, {
        ...payload, correctionEventSequence: number(item.eventSequence, Number.MAX_SAFE_INTEGER),
        correctionCreatedAt: item.createdAt, correctionEventId: item.eventId
      });
    });
    return ordered.filter((item) =>
      !["CANCEL_EVENT", "CORRECTION", "REOPEN_DAY", "CLOSE_DAY",
        "OVERTIME_REQUEST", "OVERTIME_APPROVED", "OVERTIME_REJECTED",
        "ADJUSTMENT_REQUESTED", "ADJUSTMENT_APPROVED", "ADJUSTMENT_REJECTED"].includes(item.eventType) &&
      !cancelled.has(item.eventId)).map((item) => {
      const correction = corrections.get(item.eventId);
      return correction && correction.eventAt
        ? { ...item, eventAt: correction.eventAt, corrected: true } : item;
    }).concat(ordered.filter((item) => item.eventType === "CORRECTION")
      .map((item) => ({
        correction: item,
        payload: parseJson(item.correctionPayloadJson || item.correctionPayload, {})
      }))
      .filter((item) => item.payload.insertEventType && item.payload.eventAt)
      .map((item) => ({
        eventId: `CORRECTED-${item.correction.eventId}`,
        eventType: item.payload.insertEventType,
        eventAt: item.payload.eventAt,
        eventSequence: number(item.correction.eventSequence, Number.MAX_SAFE_INTEGER),
        createdAt: item.correction.createdAt,
        corrected: true
      }))).sort((a, b) =>
        instantMinute(a.eventAt) - instantMinute(b.eventAt) ||
        number(a.eventSequence, Number.MAX_SAFE_INTEGER) -
          number(b.eventSequence, Number.MAX_SAFE_INTEGER) ||
        text(a.createdAt).localeCompare(text(b.createdAt)) ||
        text(a.eventId).localeCompare(text(b.eventId)));
  }

  function buildEventState(events) {
    const valid = effectiveEvents(events);
    const sessions = [];
    const breaks = [];
    let openSession = null;
    let openBreak = null;
    let absent = false;
    let state = "NOT_STARTED";
    let previousMinute = -Infinity;
    valid.forEach((event) => {
      const minute = instantMinute(event.eventAt);
      if (minute < previousMinute) throw attendanceError("ATTENDANCE_EVENT_TIME_REGRESSION", "Events are not monotonic.");
      previousMinute = minute;
      if (event.eventType === "CHECK_IN") {
        if (openSession) throw attendanceError("ATTENDANCE_SESSION_ALREADY_OPEN", "A session is already open.");
        if (absent) throw attendanceError("ATTENDANCE_ABSENT_CONFLICT", "An absent day cannot contain attendance.");
        if (sessions.length >= MAX_SESSIONS_PER_DAY) {
          throw attendanceError("ATTENDANCE_SESSION_LIMIT_EXCEEDED",
            "Attendance day exceeds the maximum supported session count.");
        }
        openSession = {
          sessionIndex: number(event.sessionIndex, sessions.length + 1),
          checkInAt: event.eventAt, checkOutAt: ""
        };
        sessions.push(openSession);
        state = "CHECKED_IN";
      } else if (event.eventType === "BREAK_START") {
        if (!openSession) throw attendanceError("ATTENDANCE_BREAK_BEFORE_CHECK_IN", "Break requires an open session.");
        if (openBreak) throw attendanceError("ATTENDANCE_BREAK_ALREADY_OPEN", "A break is already open.");
        if (breaks.length >= MAX_BREAKS_PER_DAY) {
          throw attendanceError("ATTENDANCE_BREAK_LIMIT_EXCEEDED",
            "Attendance day exceeds the maximum supported break count.");
        }
        openBreak = {
          breakIndex: number(event.breakIndex, breaks.length + 1),
          sessionIndex: openSession.sessionIndex,
          startedAt: event.eventAt, endedAt: ""
        };
        breaks.push(openBreak);
        state = "ON_BREAK";
      } else if (event.eventType === "BREAK_END") {
        if (!openBreak) throw attendanceError("ATTENDANCE_BREAK_NOT_OPEN", "No break is open.");
        if (minute <= instantMinute(openBreak.startedAt)) {
          throw attendanceError("ATTENDANCE_ZERO_OR_REVERSED_INTERVAL", "Break end must follow break start.");
        }
        openBreak.endedAt = event.eventAt;
        openBreak = null;
        state = "CHECKED_IN";
      } else if (event.eventType === "CHECK_OUT") {
        if (!openSession) throw attendanceError("ATTENDANCE_SESSION_NOT_OPEN", "No session is open.");
        if (openBreak) throw attendanceError("ATTENDANCE_OPEN_BREAK", "End the break before checking out.");
        if (minute <= instantMinute(openSession.checkInAt)) {
          throw attendanceError("ATTENDANCE_ZERO_OR_REVERSED_INTERVAL", "Checkout must follow check-in.");
        }
        openSession.checkOutAt = event.eventAt;
        openSession = null;
        state = "CHECKED_OUT";
      } else if (event.eventType === "MANAGER_MARK_ABSENT") {
        if (sessions.length) throw attendanceError("ATTENDANCE_ABSENT_CONFLICT", "Attendance already exists for this day.");
        absent = true;
        state = "ABSENT";
      }
    });
    for (let index = 1; index < sessions.length; index += 1) {
      if (Date.parse(sessions[index].checkInAt) < Date.parse(sessions[index - 1].checkOutAt)) {
        throw attendanceError("ATTENDANCE_OVERLAPPING_SESSIONS", "Attendance sessions overlap.");
      }
    }
    return { state, sessions, breaks, openSession: !!openSession, openBreak: !!openBreak, absent, validEvents: valid };
  }

  function dailyStatus(schedule, eventState) {
    const classification = upper(schedule.classification);
    if (eventState.absent) return "ABSENT";
    if (eventState.sessions.length) {
      if (BLOCKED_CLASSIFICATIONS.has(classification)) return "UNSCHEDULED_ATTENDANCE";
      return eventState.openSession || eventState.openBreak ? eventState.state : "PRESENT";
    }
    if (classification === "WEEKLY_DAY_OFF") return "WEEKLY_DAY_OFF";
    if (classification === "DAY_OFF") return "DAY_OFF";
    if (classification === "ABSENT") return "PLANNED_ABSENT";
    if (classification.includes("LEAVE")) return classification;
    if (classification.includes("CLOSED") || schedule.closure) return "BRANCH_CLOSED";
    if (classification === "UNRESOLVED") return "UNRESOLVED";
    return "NOT_STARTED";
  }

  function calculateDay(input) {
    const data = input || {};
    const schedule = data.schedule || {};
    const eventState = buildEventState(data.events || []);
    const segments = schedule.shiftSegments || [];
    const policy = data.policy || {};
    const warnings = [...(schedule.warnings || [])];
    if (eventState.openSession) warnings.push("OPEN_SESSION");
    if (eventState.openBreak) warnings.push("OPEN_BREAK");
    if ((data.events || []).some((item) =>
      item.eventType === "BREAK_END" && item.sourceEntityType === "CHECKOUT_CORRECTION")) {
      warnings.push("OPEN_BREAK_EXPLICITLY_CLOSED");
    }
    if (!segments.length && !BLOCKED_CLASSIFICATIONS.has(upper(schedule.classification))) {
      warnings.push("NO_SCHEDULE");
    }
    const sourceEvents = (data.events || []).filter((item) =>
      CALCULATION_EVENT_TYPES.includes(upper(item.eventType)))
      .slice().sort((left, right) =>
        number(left.eventSequence, Number.MAX_SAFE_INTEGER) -
          number(right.eventSequence, Number.MAX_SAFE_INTEGER) ||
        text(left.createdAt).localeCompare(text(right.createdAt)) ||
        text(left.eventId).localeCompare(text(right.eventId)));
    const sourceEventIds = sourceEvents.map((item) => text(item.eventId));
    const sourceEventHash = core.requestFingerprint(
      "ATTENDANCE_DAY_EVIDENCE", text(data.staff && data.staff.staffId), sourceEvents.map((item) => ({
        eventId: text(item.eventId), eventType: upper(item.eventType),
        eventAt: text(item.eventAt), eventSequence: number(item.eventSequence, 0),
        reversesEventId: text(item.reversesEventId),
        correctionPayload: parseJson(item.correctionPayloadJson || item.correctionPayload, {})
      })));
    let result = {};
    const completeSessions = eventState.sessions.filter((item) => item.checkOutAt);
    const completeBreaks = eventState.breaks.filter((item) => item.endedAt);
    if (completeSessions.length && segments.length) {
      result = core.calculateDailyAttendance({
        date: data.date,
        scheduledStart: segments[0].shiftStart,
        scheduledEnd: segments[segments.length - 1].shiftEnd,
        requiredWorkMinutes: number(schedule.requiredWorkMinutes, 0),
        sessions: completeSessions,
        breaks: completeBreaks,
        policy: {
          allowedBreakMinutes: number(schedule.allowedBreakMinutes, number(policy.allowedBreakMinutes, 0)),
          breakPaymentType: upper(policy.breakPaymentType || "UNPAID"),
          breakGraceMinutes: number(policy.breakGraceMinutes, 0),
          maximumSingleBreakMinutes: number(policy.maximumSingleBreakMinutes || policy.maxSingleBreakMinutes, 0) || undefined,
          excessBreakContributesToDeficit: policy.excessBreakContributesToDeficit !== false,
          graceLateMinutes: number(policy.graceLateMinutes, 0),
          graceEarlyLeaveMinutes: number(policy.graceEarlyLeaveMinutes, 0),
          roundingIncrementMinutes: number(policy.roundingIncrementMinutes, 0),
          roundingMode: upper(policy.roundingMode || "NONE")
        }
      });
    }
    const latestApproval = (data.overtimeApprovals || []).filter((item) =>
      ["APPROVED", "REJECTED"].includes(upper(item.status)) && !bool(item.stale))
      .sort((a, b) => text(a.createdAt).localeCompare(text(b.createdAt))).pop();
    const rawOvertime = number(result.rawOvertimeMinutesRaw, 0);
    const roundedOvertime = number(result.rawOvertimeMinutes, rawOvertime);
    const overtimeThreshold = number(policy.minimumOvertimeThresholdMinutes, 0);
    const overtimeCap = number(policy.dailyOvertimeCapMinutes, 0);
    const eligibleOvertime = roundedOvertime < overtimeThreshold ? 0
      : (overtimeCap > 0 ? Math.min(roundedOvertime, overtimeCap) : roundedOvertime);
    const approvedOvertime = latestApproval && upper(latestApproval.status) === "APPROVED" &&
      number(latestApproval.rawOvertimeMinutes, 0) === rawOvertime &&
      text(latestApproval.daySourceEventHash) === sourceEventHash
      ? Math.min(eligibleOvertime, number(latestApproval.approvedOvertimeMinutes, 0)) : 0;
    if (latestApproval && (number(latestApproval.rawOvertimeMinutes, 0) !== rawOvertime ||
        text(latestApproval.daySourceEventHash) !== sourceEventHash)) {
      warnings.push("STALE_OVERTIME_APPROVAL");
    }
    const now = data.now;
    return Object.freeze({
      attendanceDayId: data.attendanceDayId,
      staffId: data.staff.staffId,
      staffName: data.staff.staffName,
      branchId: data.staff.branchId || "",
      attendanceDate: data.date,
      timezone: TIME_ZONE,
      status: dailyStatus(schedule, eventState),
      state: eventState.state,
      scheduleSource: schedule.sourceType || "NONE",
      scheduleSourceIds: clone(schedule.sourceIds || []),
      scheduledStart: segments[0] ? segments[0].shiftStart : "",
      scheduledEnd: segments.length ? segments[segments.length - 1].shiftEnd : "",
      shiftSegments: clone(segments),
      requiredWorkMinutesRaw: number(schedule.requiredWorkMinutes, 0),
      requiredWorkMinutesRounded: number(result.requiredMinutes, number(schedule.requiredWorkMinutes, 0)),
      allowedBreakMinutes: number(schedule.allowedBreakMinutes, number(policy.allowedBreakMinutes, 0)),
      actualCheckIn: eventState.sessions[0] ? eventState.sessions[0].checkInAt : "",
      actualCheckOut: eventState.sessions.length &&
        eventState.sessions[eventState.sessions.length - 1].checkOutAt || "",
      sessionCount: eventState.sessions.length,
      presenceMinutesRaw: number(result.presenceMinutesRaw, 0),
      presenceMinutesRounded: number(result.presenceMinutes, 0),
      actualBreakMinutesRaw: number(result.actualBreakMinutesRaw, 0),
      actualBreakMinutesRounded: number(result.actualBreakMinutes, 0),
      paidBreakCreditMinutesRaw: number(result.paidBreakCreditMinutesRaw, 0),
      workedMinutesRaw: number(result.workedMinutesRaw, 0),
      workedMinutesRounded: number(result.workedMinutes, 0),
      creditedWorkMinutesRaw: number(result.creditedWorkMinutesRaw, 0),
      lateMinutesRaw: number(result.lateMinutesRaw, 0),
      lateMinutesRounded: number(result.lateMinutes, 0),
      earlyLeaveMinutesRaw: number(result.earlyLeaveMinutesRaw, 0),
      earlyLeaveMinutesRounded: number(result.earlyLeaveMinutes, 0),
      excessBreakMinutesRaw: number(result.excessBreakMinutesRaw, 0),
      excessBreakMinutesRounded: number(result.excessBreakMinutes, 0),
      deficitMinutesRaw: number(result.deficitMinutesRaw, 0),
      deficitMinutesRounded: number(result.deficitMinutes, 0),
      rawOvertimeMinutes: rawOvertime,
      eligibleOvertimeMinutes: eligibleOvertime,
      approvedOvertimeMinutes: approvedOvertime,
      overtimeApprovalStatus: latestApproval ? upper(latestApproval.status) : "NOT_REQUESTED",
      leaveOrAbsenceType: BLOCKED_CLASSIFICATIONS.has(upper(schedule.classification))
        ? upper(schedule.classification) : (eventState.absent ? "ABSENT" : ""),
      openSession: eventState.openSession,
      openBreak: eventState.openBreak,
      calculationWarnings: [...new Set(warnings)],
      policyId: text(data.policyResolution && data.policyResolution.policyId),
      policySnapshot: clone(policy),
      scheduleSnapshot: clone(schedule),
      sourceEventIds,
      sourceEventHash,
      staleCalculation: false,
      lastEventAt: sourceEvents.length
        ? sourceEvents[sourceEvents.length - 1].eventAt : "",
      calculatedAt: now,
      dayLifecycle: upper(data.dayLifecycle || "OPEN"),
      calculationVersion: PHASE3_VERSION,
      locked: bool(data.locked),
      reopenedCount: number(data.reopenedCount, 0),
      reopenedAt: text(data.reopenedAt),
      reopenedBy: text(data.reopenedBy),
      updatedAt: now,
      sessions: eventState.sessions,
      breaks: eventState.breaks
    });
  }

  function createMemoryRepository(seed) {
    const initial = clone(seed || {});
    let state = {
      staff: initial.staff || [], days: initial.days || [], events: initial.events || [],
      adjustments: initial.adjustments || [], overtime: initial.overtime || [],
      policies: initial.policies || [], audit: initial.audit || [], legacy: initial.legacy || [],
      idempotency: initial.idempotency || [], recovery: initial.recovery || []
    };
    const findUnique = (items, key, value, code) => {
      const matches = items.filter((item) => text(item[key]) === text(value));
      if (matches.length > 1) throw attendanceError(code, "Duplicate entity ID is ambiguous.");
      return matches[0] || null;
    };
    const save = (list, key, record) => {
      const index = state[list].findIndex((item) => text(item[key]) === text(record[key]));
      if (index >= 0) state[list][index] = clone(record);
      else state[list].push(clone(record));
      return clone(record);
    };
    return {
      listStaff: () => clone(state.staff),
      getStaff: (staffId) => findUnique(state.staff, "staffId", staffId, "ATTENDANCE_STAFF_ID_AMBIGUOUS"),
      listDays: (filters = {}) => clone(state.days.filter((item) =>
        (!filters.staffId || item.staffId === filters.staffId) &&
        (!filters.date || item.attendanceDate === filters.date) &&
        (!filters.dateFrom || item.attendanceDate >= filters.dateFrom) &&
        (!filters.dateTo || item.attendanceDate <= filters.dateTo))),
      getDay: (idValue) => clone(findUnique(state.days, "attendanceDayId", idValue, "ATTENDANCE_DAY_ID_AMBIGUOUS")),
      saveDay: (record) => save("days", "attendanceDayId", record),
      listEvents: (filters = {}) => clone(state.events.filter((item) =>
        (!filters.attendanceDayId || item.attendanceDayId === filters.attendanceDayId) &&
        (!filters.staffId || item.staffId === filters.staffId))),
      getEvent: (eventId) => clone(findUnique(state.events, "eventId", eventId, "ATTENDANCE_EVENT_ID_AMBIGUOUS")),
      appendEvent: (record) => {
        if (state.events.some((item) => item.eventId === record.eventId)) {
          throw attendanceError("ATTENDANCE_EVENT_ID_COLLISION", "Attendance event ID collision.");
        }
        state.events.push(clone(record)); return clone(record);
      },
      listAdjustments: (filters = {}) => clone(state.adjustments.filter((item) =>
        (!filters.attendanceDayId || item.attendanceDayId === filters.attendanceDayId) &&
        (!filters.status || upper(item.status) === upper(filters.status)))),
      getAdjustment: (value) => clone(findUnique(state.adjustments, "adjustmentId", value, "ATTENDANCE_ADJUSTMENT_ID_AMBIGUOUS")),
      saveAdjustment: (record) => save("adjustments", "adjustmentId", record),
      listOvertime: (filters = {}) => clone(state.overtime.filter((item) =>
        (!filters.attendanceDayId || item.attendanceDayId === filters.attendanceDayId))),
      getOvertime: (value) => clone(findUnique(state.overtime, "overtimeApprovalId", value, "ATTENDANCE_OVERTIME_ID_AMBIGUOUS")),
      appendOvertime: (record) => {
        if (state.overtime.some((item) => item.overtimeApprovalId === record.overtimeApprovalId)) {
          throw attendanceError("ATTENDANCE_OVERTIME_ID_COLLISION", "Overtime ID collision.");
        }
        state.overtime.push(clone(record)); return clone(record);
      },
      listPolicies: () => clone(state.policies),
      listLegacy: () => clone(state.legacy),
      appendAudit: (record) => {
        if (state.audit.some((item) => item.actionId === record.actionId)) {
          throw attendanceError("ATTENDANCE_AUDIT_ID_COLLISION", "Audit ID collision.");
        }
        state.audit.push(clone(record)); return clone(record);
      },
      listAudit: (filters = {}) => clone(state.audit.filter((item) =>
        (!filters.entityId || item.entityId === filters.entityId) &&
        (!filters.staffId || item.staffId === filters.staffId))),
      getIdempotency: (requestId) => clone(findUnique(state.idempotency, "requestId", requestId, "ATTENDANCE_IDEMPOTENCY_AMBIGUOUS")),
      saveIdempotency: (record) => save("idempotency", "requestId", record),
      withTransaction: (_details, callback) => {
        const before = clone(state);
        try { return callback(); } catch (error) { state = before; throw error; }
      },
      getState: () => clone(state)
    };
  }

  function createService(options) {
    const config = options || {};
    const repository = config.repository;
    if (!repository) throw attendanceError("ATTENDANCE_REPOSITORY_REQUIRED", "Attendance repository is required.");
    const actorResolver = config.actorResolver || (() => null);
    const scheduleResolver = config.scheduleResolver || (() => null);
    const now = config.now || (() => new Date().toISOString());
    const uuid = config.uuid || (() => Math.random().toString(36).slice(2));
    const withLock = config.withLock || ((_details, callback) => callback());
    function allocateId(prefix, exists, code) {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const candidate = id(prefix, uuid);
        if (!exists(candidate)) return candidate;
      }
      throw attendanceError(code, `Unable to allocate a unique ${prefix} identifier.`);
    }

    function actor(data) {
      const result = normalizeActor(actorResolver(data || {}));
      if (!result.actorId) throw attendanceError("ATTENDANCE_IDENTITY_UNKNOWN", "Authenticated identity could not be resolved.");
      return result;
    }
    function staffFor(data, resolvedActor, selfAction) {
      const staffId = text(data.staffId || resolvedActor.staffId);
      if (!staffId) throw attendanceError("ATTENDANCE_STAFF_ID_REQUIRED", "Stable staff ID is required.");
      const staff = repository.getStaff(staffId);
      assertScope(resolvedActor, staff, selfAction);
      return staff;
    }
    function policyFor(staff, date) {
      const policies = repository.listPolicies();
      try {
        const resolution = core.resolveEffectivePolicy(policies, staff.staffId, date);
        const snapshot = attendancePolicySnapshot(resolution.snapshot);
        return {
          resolution: { ...resolution, snapshot },
          snapshot
        };
      } catch (error) {
        if (error.code !== "POLICY_NOT_FOUND") throw error;
        const fallback = Object.freeze({
          policyId: "PHASE3_SAFE_DEFAULT", requiredDailyMinutes: 0,
          allowedBreakMinutes: 0, breakPaymentType: "UNPAID",
          roundingIncrementMinutes: 0, roundingMode: "NONE"
        });
        return { resolution: { source: "SAFE_DEFAULT", policyId: fallback.policyId, snapshot: fallback }, snapshot: fallback };
      }
    }
    function dayId(staffId, date) { return `ATD-${staffId}-${date}`; }
    function loadDay(staff, date, serverNow) {
      const existing = repository.listDays({ staffId: staff.staffId, date });
      if (existing.length > 1) throw attendanceError("ATTENDANCE_DAY_AMBIGUOUS", "Multiple daily results exist.");
      const current = existing[0];
      const schedule = scheduleResolver(staff, date) || {
        date, staffId: staff.staffId, sourceType: "NONE", sourceIds: [], shiftSegments: [],
        requiredWorkMinutes: 0, allowedBreakMinutes: 0, classification: "NOT_SCHEDULED",
        warnings: ["NO_RESOLVED_SCHEDULE"]
      };
      const policy = policyFor(staff, date);
      const attendanceDayId = current ? current.attendanceDayId : dayId(staff.staffId, date);
      const calculated = calculateDay({
        attendanceDayId, staff, date, schedule, policy: policy.snapshot,
        policyResolution: policy.resolution,
        events: repository.listEvents({ attendanceDayId }),
        overtimeApprovals: repository.listOvertime({ attendanceDayId }),
        locked: current && current.locked,
        reopenedCount: current && current.reopenedCount,
        reopenedAt: current && current.reopenedAt,
        reopenedBy: current && current.reopenedBy,
        dayLifecycle: current && current.dayLifecycle,
        now: serverNow
      });
      return Object.freeze({
        ...calculated,
        staleCalculation: !!current && (
          text(current.sourceEventHash) !== text(calculated.sourceEventHash) ||
          text(current.calculationVersion) !== PHASE3_VERSION)
      });
    }
    function persistDay(record) {
      return repository.saveDay({ ...record, staleCalculation: false });
    }
    function adjustmentDto(item) {
      return {
        adjustmentId: item.adjustmentId,
        attendanceDayId: item.attendanceDayId,
        staffId: item.staffId,
        date: item.date,
        type: item.type,
        reason: item.reason,
        status: item.status,
        requestedAt: item.requestedAt,
        requestedBy: item.requestedBy,
        reviewedAt: item.reviewedAt,
        reviewedBy: item.reviewedBy,
        reviewNote: item.reviewNote
      };
    }
    function overtimeDto(item) {
      return {
        overtimeApprovalId: item.overtimeApprovalId,
        attendanceDayId: item.attendanceDayId,
        staffId: item.staffId,
        date: item.date,
        rawOvertimeMinutes: number(item.rawOvertimeMinutes, 0),
        approvedOvertimeMinutes: number(item.approvedOvertimeMinutes, 0),
        status: item.status,
        decisionReason: item.decisionReason,
        decidedAt: item.decidedAt,
        decidedBy: item.decidedBy,
        createdAt: item.createdAt,
        createdBy: item.createdBy,
        stale: bool(item.stale)
      };
    }
    function audit(action, entityType, entityId, staffId, resolvedActor, before, after, reason, requestId, at) {
      repository.appendAudit({
        actionId: allocateId("AAU", (candidate) =>
          repository.listAudit({}).some((item) => item.actionId === candidate),
        "ATTENDANCE_AUDIT_ID_ALLOCATION_FAILED"), entityType, entityId, action,
        actorId: resolvedActor.actorId, actorName: resolvedActor.actorName,
        actorRole: resolvedActor.role, staffId, beforeStateJson: stable(before || {}),
        afterStateJson: stable(after || {}), reason, timestamp: at, requestId
      });
    }
    function appendEvent(type, staff, day, resolvedActor, requestId, reason, at, extra = {}) {
      const existingEvents = repository.listEvents({ attendanceDayId: day.attendanceDayId });
      const record = {
        eventId: allocateId("AEV", (candidate) => !!repository.getEvent(candidate),
          "ATTENDANCE_EVENT_ID_ALLOCATION_FAILED"),
        attendanceDayId: day.attendanceDayId,
        staffId: staff.staffId, staffName: staff.staffName, date: day.attendanceDate,
        branchId: staff.branchId || "", timezone: TIME_ZONE, eventType: type,
        eventAt: at, sessionIndex: number(extra.sessionIndex, 0),
        breakIndex: number(extra.breakIndex, 0),
        eventSequence: existingEvents.reduce((maximum, item) =>
          Math.max(maximum, number(item.eventSequence, 0)), 0) + 1,
        status: "ACTIVE",
        reversesEventId: text(extra.reversesEventId), sourceEntityType: text(extra.sourceEntityType),
        sourceEntityId: text(extra.sourceEntityId), reason,
        correctionPayloadJson: extra.correctionPayload ? stable(extra.correctionPayload) : "",
        actorId: resolvedActor.actorId, actorName: resolvedActor.actorName,
        actorRole: resolvedActor.role, createdAt: at, requestId,
        requestFingerprint: fingerprint(type, resolvedActor.actorId, {
          staffId: staff.staffId, attendanceDate: day.attendanceDate, reason, ...extra
        })
      };
      repository.appendEvent(record);
      return record;
    }
    function validateCorrectionProposal(proposed, day) {
      const value = proposed || {};
      if (!value.eventAt || (!value.insertEventType && !value.replacesEventId)) {
        throw attendanceError("ATTENDANCE_CORRECTION_INVALID",
          "Correction requires a timestamp and event insertion or replacement.");
      }
      if (!/(Z|[+-]\d{2}:\d{2})$/.test(text(value.eventAt)) ||
          !Number.isFinite(Date.parse(value.eventAt))) {
        throw attendanceError("ATTENDANCE_CORRECTION_TIME_INVALID",
          "Correction timestamp must be an explicit-offset ISO instant.");
      }
      if (value.insertEventType && !["CHECK_IN", "BREAK_START", "BREAK_END", "CHECK_OUT"].includes(upper(value.insertEventType))) {
        throw attendanceError("ATTENDANCE_CORRECTION_EVENT_TYPE_INVALID",
          "Correction event type is unsupported.");
      }
      if (value.replacesEventId) {
        const referenced = repository.getEvent(value.replacesEventId);
        if (!referenced || referenced.attendanceDayId !== day.attendanceDayId) {
          throw attendanceError("ATTENDANCE_CORRECTION_EVENT_NOT_FOUND",
            "Referenced event does not belong to this attendance day.");
        }
      }
      return value;
    }
    function mutation(action, data, permission, callback) {
      const requestId = requireText(data.requestId, "ATTENDANCE_REQUEST_ID_REQUIRED", "Request ID is required.");
      const reason = requireText(data.reason, "ATTENDANCE_REASON_REQUIRED", "Reason is required.");
      return withLock({ action, requestId }, () => {
        const resolvedActor = actor(data);
        requirePermission(resolvedActor, typeof permission === "function"
          ? permission(resolvedActor, data) : permission);
        const fp = fingerprint(action, resolvedActor.actorId, data);
        const prior = repository.getIdempotency(requestId);
        if (prior) {
          if (prior.action !== action || prior.actorId !== resolvedActor.actorId || prior.requestFingerprint !== fp) {
            throw attendanceError("ATTENDANCE_IDEMPOTENCY_KEY_REUSED", "Request ID was used with different input.");
          }
          return parseJson(prior.responseJson, {});
        }
        const execute = () => {
          const response = filterSensitiveFields({
            status: "success", code: `${action.toUpperCase()}_OK`,
            ...callback(resolvedActor, requestId, reason, now())
          });
          repository.saveIdempotency({
            requestId, action, actorId: resolvedActor.actorId,
            requestFingerprint: fp, responseJson: stable(response),
            status: "COMPLETED", createdAt: now(), expiresAt: ""
          });
          return response;
        };
        return repository.withTransaction
          ? repository.withTransaction({ action, requestId, actorId: resolvedActor.actorId }, execute)
          : execute();
      });
    }
    function eventMutation(action, data, eventType, permission, validStates, selfAction) {
      return mutation(action, data, permission, (resolvedActor, requestId, reason, at) => {
        const staff = staffFor(data, resolvedActor, selfAction);
        const context = resolveAttendanceContext({
          staff, serverNow: at, requestedDate: data.attendanceDate, scheduleResolver
        });
        let day = loadDay(staff, context.date, at);
        if (day.locked) throw attendanceError("ATTENDANCE_DAY_LOCKED", "Attendance day is locked.");
        if (eventType === "CHECK_IN" && BLOCKED_CLASSIFICATIONS.has(upper(day.scheduleSnapshot.classification)) &&
            !(hasPermission(resolvedActor, "attendance.manage") && data.managerOverride === true)) {
          throw attendanceError("ATTENDANCE_DAY_BLOCKED", "The resolved schedule blocks attendance.");
        }
        if (!validStates.includes(day.state)) {
          const codes = {
            CHECK_IN: day.state === "CHECKED_IN" || day.state === "ON_BREAK"
              ? "ATTENDANCE_SESSION_ALREADY_OPEN" : "ATTENDANCE_CHECK_IN_INVALID_STATE",
            BREAK_START: day.state === "ON_BREAK" ? "ATTENDANCE_BREAK_ALREADY_OPEN" : "ATTENDANCE_BREAK_BEFORE_CHECK_IN",
            BREAK_END: "ATTENDANCE_BREAK_NOT_OPEN",
            CHECK_OUT: day.state === "ON_BREAK" ? "ATTENDANCE_OPEN_BREAK" : "ATTENDANCE_SESSION_NOT_OPEN",
            MANAGER_MARK_ABSENT: "ATTENDANCE_MARK_ABSENT_INVALID_STATE"
          };
          throw attendanceError(codes[eventType], `Cannot apply ${eventType} while ${day.state}.`);
        }
        const priorFactual = repository.listEvents({ attendanceDayId: day.attendanceDayId })
          .filter((item) => ["CHECK_IN", "BREAK_START", "BREAK_END", "CHECK_OUT",
            "MANAGER_MARK_ABSENT"].includes(item.eventType))
          .sort((left, right) => text(left.createdAt).localeCompare(text(right.createdAt))).pop();
        if (priorFactual && instantMinute(at) < instantMinute(priorFactual.eventAt)) {
          throw attendanceError("ATTENDANCE_EVENT_TIME_REGRESSION",
            "Server time is earlier than the latest factual attendance event.");
        }
        if (eventType === "CHECK_OUT" && day.openBreak) {
          if (!(data.closeOpenBreak === true && hasPermission(resolvedActor, "attendance.correct"))) {
            throw attendanceError("ATTENDANCE_OPEN_BREAK", "End the open break before checking out.");
          }
          appendEvent("BREAK_END", staff, day, resolvedActor, `${requestId}-BREAK`, reason, at,
            {
              sessionIndex: day.sessionCount,
              breakIndex: day.breaks.length,
              sourceEntityType: "CHECKOUT_CORRECTION", sourceEntityId: requestId
            });
        }
        const eventIndex = {
          sessionIndex: eventType === "CHECK_IN" ? day.sessionCount + 1 : day.sessionCount,
          breakIndex: eventType === "BREAK_START" ? day.breaks.length + 1 :
            (["BREAK_END", "CHECK_OUT"].includes(eventType) ? day.breaks.length : 0)
        };
        const event = appendEvent(
          eventType, staff, day, resolvedActor, requestId, reason, at, eventIndex);
        const before = day;
        day = loadDay(staff, context.date, at);
        persistDay({ ...day, locked: false, lastActionId: event.eventId, lastRequestId: requestId });
        audit(eventType, "ATTENDANCE_DAY", day.attendanceDayId, staff.staffId,
          resolvedActor, before, day, reason, requestId, at);
        return { attendanceDay: day, event };
      });
    }

    const handlers = {
      getAttendanceDashboard(data) {
        const resolvedActor = actor(data); requirePermission(resolvedActor, "attendance.view");
        const date = core.parseDateKey(data.date || dateFromInstant(now())).text;
        const staff = repository.listStaff().filter((item) => {
          if (item.active === false) return false;
          if (resolvedActor.owner) return true;
          if (resolvedActor.staffId === item.staffId) return true;
          return item.branchId && resolvedActor.branchIds.includes(item.branchId);
        }).filter((item) => !data.branchId || item.branchId === data.branchId)
          .filter((item) => !data.staffId || item.staffId === data.staffId);
        const days = staff.map((item) => {
          const day = loadDay(item, date, now());
          const overtimeRecords = repository.listOvertime({
            attendanceDayId: day.attendanceDayId
          });
          const decidedRequestIds = new Set(overtimeRecords
            .map((entry) => text(entry.reversesApprovalId)).filter(Boolean));
          return {
            ...day,
            pendingAdjustments: repository.listAdjustments({
              attendanceDayId: day.attendanceDayId, status: "PENDING"
            }).map(adjustmentDto),
            pendingOvertime: overtimeRecords
              .filter((entry) => upper(entry.status) === "PENDING" &&
                !decidedRequestIds.has(entry.overtimeApprovalId))
              .map(overtimeDto)
          };
        });
        return filterSensitiveFields({
          status: "success", code: "ATTENDANCE_DASHBOARD_OK", date, attendanceDays: days,
          permissions: {
            selfStaffId: resolvedActor.staffId || "",
            selfAction: hasPermission(resolvedActor, "attendance.self_action"),
            manage: hasPermission(resolvedActor, "attendance.manage"),
            correct: hasPermission(resolvedActor, "attendance.correct"),
            approveAdjustment: hasPermission(resolvedActor, "attendance.approve_adjustment"),
            approveOvertime: hasPermission(resolvedActor, "attendance.approve_overtime"),
            previewMigration: resolvedActor.owner
          }, serverNow: now()
        });
      },
      getEmployeeAttendanceDay(data) {
        const resolvedActor = actor(data); requirePermission(resolvedActor, "attendance.view");
        const staff = staffFor(data, resolvedActor, false);
        const date = core.parseDateKey(data.attendanceDate).text;
        return filterSensitiveFields({
          status: "success", code: "ATTENDANCE_DAY_OK",
          attendanceDay: loadDay(staff, date, now())
        });
      },
      listAttendanceEvents(data) {
        const resolvedActor = actor(data); requirePermission(resolvedActor, "attendance.view");
        const requestedDayId = requireText(data.attendanceDayId,
          "ATTENDANCE_DAY_ID_REQUIRED", "Attendance day ID is required.");
        const day = repository.getDay(requestedDayId);
        let staff;
        if (day) {
          staff = repository.getStaff(day.staffId);
        } else {
          const date = core.parseDateKey(data.attendanceDate).text;
          staff = staffFor(data, resolvedActor, false);
          if (requestedDayId !== dayId(staff.staffId, date)) {
            throw attendanceError("ATTENDANCE_DAY_NOT_FOUND", "Attendance day was not found.");
          }
        }
        assertScope(resolvedActor, staff, false);
        return filterSensitiveFields({
          status: "success", code: "ATTENDANCE_EVENTS_OK",
          events: repository.listEvents({ attendanceDayId: requestedDayId })
        });
      },
      attendanceCheckIn: (data) => eventMutation("attendanceCheckIn", data, "CHECK_IN",
        (resolvedActor, payload) => payload.staffId && payload.staffId !== resolvedActor.staffId
          ? "attendance.manage" : "attendance.self_action",
        ["NOT_STARTED", "CHECKED_OUT"], false),
      attendanceStartBreak: (data) => eventMutation("attendanceStartBreak", data, "BREAK_START",
        (resolvedActor, payload) => payload.staffId && payload.staffId !== resolvedActor.staffId
          ? "attendance.manage" : "attendance.self_action",
        ["CHECKED_IN"], false),
      attendanceEndBreak: (data) => eventMutation("attendanceEndBreak", data, "BREAK_END",
        (resolvedActor, payload) => payload.staffId && payload.staffId !== resolvedActor.staffId
          ? "attendance.manage" : "attendance.self_action",
        ["ON_BREAK"], false),
      attendanceCheckOut: (data) => eventMutation("attendanceCheckOut", data, "CHECK_OUT",
        (resolvedActor, payload) => payload.staffId && payload.staffId !== resolvedActor.staffId
          ? "attendance.manage" : "attendance.self_action",
        ["CHECKED_IN", ...(data.closeOpenBreak === true ? ["ON_BREAK"] : [])], false),
      markAttendanceAbsent: (data) => eventMutation("markAttendanceAbsent", data, "MANAGER_MARK_ABSENT",
        "attendance.manage", ["NOT_STARTED"], false),
      cancelAttendanceEvent(data) {
        return mutation("cancelAttendanceEvent", data, "attendance.correct",
          (resolvedActor, requestId, reason, at) => {
            const original = repository.getEvent(requireText(data.eventId,
              "ATTENDANCE_EVENT_ID_REQUIRED", "Event ID is required."));
            if (!original) throw attendanceError("ATTENDANCE_EVENT_NOT_FOUND", "Event was not found.");
            if (!["CHECK_IN", "BREAK_START", "BREAK_END", "CHECK_OUT",
              "MANAGER_MARK_ABSENT"].includes(original.eventType)) {
              throw attendanceError("ATTENDANCE_EVENT_NOT_CANCELLABLE",
                "Only original factual attendance events can be cancelled.");
            }
            if (repository.listEvents({ attendanceDayId: original.attendanceDayId })
              .some((event) => event.eventType === "CANCEL_EVENT" &&
                event.reversesEventId === original.eventId)) {
              throw attendanceError("ATTENDANCE_EVENT_ALREADY_CANCELLED",
                "Attendance event was already cancelled.");
            }
            const day = repository.getDay(original.attendanceDayId);
            if (!day) throw attendanceError("ATTENDANCE_DAY_NOT_FOUND", "Attendance day was not found.");
            if (day.locked) throw attendanceError("ATTENDANCE_DAY_LOCKED", "Reopen the day before correction.");
            const staff = repository.getStaff(day.staffId); assertScope(resolvedActor, staff, false);
            const event = appendEvent("CANCEL_EVENT", staff, day, resolvedActor, requestId, reason, at,
              { reversesEventId: original.eventId });
            const recalculated = loadDay(staff, day.attendanceDate, at);
            persistDay({ ...recalculated, lastActionId: event.eventId, lastRequestId: requestId });
            audit("CANCEL_EVENT", "ATTENDANCE_EVENT", original.eventId, staff.staffId,
              resolvedActor, original, event, reason, requestId, at);
            return { attendanceDay: recalculated, event, originalEvent: original };
          });
      },
      requestAttendanceCorrection(data) {
        return mutation("requestAttendanceCorrection", data,
          (resolvedActor) => hasPermission(resolvedActor, "attendance.correct")
            ? "attendance.correct" : "attendance.self_action",
          (resolvedActor, requestId, reason, at) => {
            const day = repository.getDay(requireText(data.attendanceDayId,
              "ATTENDANCE_DAY_ID_REQUIRED", "Attendance day ID is required."));
            if (!day) throw attendanceError("ATTENDANCE_DAY_NOT_FOUND", "Attendance day was not found.");
            const staff = repository.getStaff(day.staffId); assertScope(resolvedActor, staff, !hasPermission(resolvedActor, "attendance.correct"));
            const proposed = validateCorrectionProposal(data.proposedState || {}, day);
            if (repository.listAdjustments({
              attendanceDayId: day.attendanceDayId, status: "PENDING"
            }).length) {
              throw attendanceError("ATTENDANCE_ADJUSTMENT_PENDING_CONFLICT",
                "Resolve the existing pending attendance adjustment first.");
            }
            const adjustment = {
              adjustmentId: allocateId("ADJ", (candidate) =>
                !!repository.getAdjustment(candidate),
              "ATTENDANCE_ADJUSTMENT_ID_ALLOCATION_FAILED"),
              attendanceDayId: day.attendanceDayId,
              staffId: staff.staffId, date: day.attendanceDate, type: upper(data.correctionType || "EVENT_CORRECTION"),
              beforeStateJson: stable(day), proposedStateJson: stable(proposed),
              finalStateJson: "", reason, status: "PENDING", requestedAt: at,
              requestedBy: resolvedActor.actorId, reviewedAt: "", reviewedBy: "",
              reviewNote: "", appliedAt: "", appliedBy: "", actionId: "", requestId,
              requestFingerprint: fingerprint("requestAttendanceCorrection", resolvedActor.actorId, data)
            };
            repository.saveAdjustment(adjustment);
            const event = appendEvent("ADJUSTMENT_REQUESTED", staff, day, resolvedActor, requestId, reason, at,
              { sourceEntityType: "ATTENDANCE_ADJUSTMENT", sourceEntityId: adjustment.adjustmentId });
            audit("ADJUSTMENT_REQUESTED", "ATTENDANCE_ADJUSTMENT", adjustment.adjustmentId,
              staff.staffId, resolvedActor, day, adjustment, reason, requestId, at);
            return { adjustment: adjustmentDto(adjustment), event };
          });
      },
      approveAttendanceCorrection(data) {
        return mutation("approveAttendanceCorrection", data, "attendance.approve_adjustment",
          (resolvedActor, requestId, reason, at) => {
            const adjustment = repository.getAdjustment(requireText(data.adjustmentId,
              "ATTENDANCE_ADJUSTMENT_ID_REQUIRED", "Adjustment ID is required."));
            if (!adjustment) throw attendanceError("ATTENDANCE_ADJUSTMENT_NOT_FOUND", "Adjustment was not found.");
            if (upper(adjustment.status) !== "PENDING") throw attendanceError("ATTENDANCE_ADJUSTMENT_NOT_PENDING", "Only pending adjustments can be reviewed.");
            if (adjustment.requestedBy === resolvedActor.actorId) {
              throw attendanceError("ATTENDANCE_SELF_APPROVAL_FORBIDDEN", "Requester cannot approve their adjustment.");
            }
            const day = repository.getDay(adjustment.attendanceDayId);
            if (day.locked) throw attendanceError("ATTENDANCE_DAY_LOCKED", "Reopen the day before correction.");
            const staff = repository.getStaff(adjustment.staffId); assertScope(resolvedActor, staff, false);
            const proposed = validateCorrectionProposal(
              parseJson(adjustment.proposedStateJson || adjustment.proposedState, {}), day);
            const approvalEvent = appendEvent(
              "ADJUSTMENT_APPROVED", staff, day, resolvedActor,
              `${requestId}-APPROVAL`, reason, at,
              { sourceEntityType: "ATTENDANCE_ADJUSTMENT", sourceEntityId: adjustment.adjustmentId });
            const event = appendEvent("CORRECTION", staff, day, resolvedActor, requestId, reason, at,
              { sourceEntityType: "ATTENDANCE_ADJUSTMENT", sourceEntityId: adjustment.adjustmentId,
                correctionPayload: proposed });
            const updated = { ...adjustment, status: "APPROVED", finalStateJson: stable(proposed),
              reviewedAt: at, reviewedBy: resolvedActor.actorId, reviewNote: reason,
              appliedAt: at, appliedBy: resolvedActor.actorId, actionId: event.eventId };
            repository.saveAdjustment(updated);
            const recalculated = loadDay(staff, day.attendanceDate, at);
            persistDay({ ...recalculated, lastActionId: event.eventId, lastRequestId: requestId });
            audit("ADJUSTMENT_APPROVED", "ATTENDANCE_ADJUSTMENT", updated.adjustmentId,
              staff.staffId, resolvedActor, adjustment, updated, reason, requestId, at);
            return { adjustment: adjustmentDto(updated), attendanceDay: recalculated,
              approvalEvent, event };
          });
      },
      rejectAttendanceCorrection(data) {
        return mutation("rejectAttendanceCorrection", data, "attendance.approve_adjustment",
          (resolvedActor, requestId, reason, at) => {
            const adjustment = repository.getAdjustment(data.adjustmentId);
            if (!adjustment) throw attendanceError("ATTENDANCE_ADJUSTMENT_NOT_FOUND", "Adjustment was not found.");
            if (upper(adjustment.status) !== "PENDING") throw attendanceError("ATTENDANCE_ADJUSTMENT_NOT_PENDING", "Only pending adjustments can be reviewed.");
            if (adjustment.requestedBy === resolvedActor.actorId) throw attendanceError("ATTENDANCE_SELF_APPROVAL_FORBIDDEN", "Requester cannot reject their adjustment.");
            const staff = repository.getStaff(adjustment.staffId); assertScope(resolvedActor, staff, false);
            const updated = { ...adjustment, status: "REJECTED", reviewedAt: at,
              reviewedBy: resolvedActor.actorId, reviewNote: reason };
            repository.saveAdjustment(updated);
            const day = repository.getDay(adjustment.attendanceDayId);
            const event = appendEvent("ADJUSTMENT_REJECTED", staff, day, resolvedActor, requestId, reason, at,
              { sourceEntityType: "ATTENDANCE_ADJUSTMENT", sourceEntityId: adjustment.adjustmentId });
            audit("ADJUSTMENT_REJECTED", "ATTENDANCE_ADJUSTMENT", updated.adjustmentId,
              staff.staffId, resolvedActor, adjustment, updated, reason, requestId, at);
            return { adjustment: adjustmentDto(updated), event };
          });
      },
      reopenAttendanceDay(data) {
        return mutation("reopenAttendanceDay", data, "attendance.correct",
          (resolvedActor, requestId, reason, at) => {
            const current = repository.getDay(data.attendanceDayId);
            if (!current) throw attendanceError("ATTENDANCE_DAY_NOT_FOUND", "Attendance day was not found.");
            if (!current.locked) throw attendanceError("ATTENDANCE_DAY_NOT_LOCKED", "Only a locked day can be reopened.");
            const staff = repository.getStaff(current.staffId); assertScope(resolvedActor, staff, false);
            const updated = { ...current, locked: false, dayLifecycle: "REOPENED",
              reopenedCount: number(current.reopenedCount, 0) + 1,
              reopenedAt: at, reopenedBy: resolvedActor.actorId, updatedAt: at };
            const event = appendEvent("REOPEN_DAY", staff, updated, resolvedActor, requestId, reason, at);
            persistDay({ ...updated, lastActionId: event.eventId, lastRequestId: requestId });
            audit("REOPEN_DAY", "ATTENDANCE_DAY", current.attendanceDayId, staff.staffId,
              resolvedActor, current, updated, reason, requestId, at);
            return { attendanceDay: updated, event };
          });
      },
      closeAttendanceDay(data) {
        return mutation("closeAttendanceDay", data, "attendance.manage",
          (resolvedActor, requestId, reason, at) => {
            const current = repository.getDay(data.attendanceDayId);
            if (!current) throw attendanceError("ATTENDANCE_DAY_NOT_FOUND", "Attendance day was not found.");
            if (current.locked) throw attendanceError("ATTENDANCE_DAY_LOCKED", "Attendance day is already locked.");
            if (current.openSession || current.openBreak) throw attendanceError("ATTENDANCE_DAY_UNRESOLVED", "Open sessions or breaks must be corrected first.");
            const staff = repository.getStaff(current.staffId); assertScope(resolvedActor, staff, false);
            const recalculated = loadDay(staff, current.attendanceDate, at);
            const missingScheduledAttendance = recalculated.state === "NOT_STARTED" &&
              (recalculated.shiftSegments || []).length > 0;
            const updated = {
              ...recalculated,
              locked: true,
              dayLifecycle: "CLOSED",
              status: missingScheduledAttendance ? "UNRESOLVED" : recalculated.status,
              calculationWarnings: missingScheduledAttendance
                ? [...new Set([...(recalculated.calculationWarnings || []), "MISSING_ATTENDANCE"])]
                : recalculated.calculationWarnings,
              updatedAt: at
            };
            const event = appendEvent("CLOSE_DAY", staff, updated, resolvedActor, requestId, reason, at);
            persistDay({ ...updated, lastActionId: event.eventId, lastRequestId: requestId });
            audit("CLOSE_DAY", "ATTENDANCE_DAY", current.attendanceDayId, staff.staffId,
              resolvedActor, current, updated, reason, requestId, at);
            return { attendanceDay: updated, event };
          });
      },
      recalculateAttendanceDay(data) {
        return mutation("recalculateAttendanceDay", data, "attendance.manage",
          (resolvedActor, requestId, reason, at) => {
            const current = repository.getDay(data.attendanceDayId);
            if (!current) throw attendanceError("ATTENDANCE_DAY_NOT_FOUND", "Attendance day was not found.");
            if (current.locked) throw attendanceError("ATTENDANCE_DAY_LOCKED", "Reopen the day before recalculation.");
            const staff = repository.getStaff(current.staffId); assertScope(resolvedActor, staff, false);
            const updated = loadDay(staff, current.attendanceDate, at);
            persistDay({ ...updated, lastRequestId: requestId });
            audit("RECALCULATE_DAY", "ATTENDANCE_DAY", current.attendanceDayId, staff.staffId,
              resolvedActor, current, updated, reason, requestId, at);
            return { attendanceDay: updated };
          });
      },
      requestAttendanceOvertime(data) {
        return mutation("requestAttendanceOvertime", data,
          (resolvedActor, payload) => {
            const target = text(payload.staffId || resolvedActor.staffId);
            return target === resolvedActor.staffId
              ? "attendance.self_action" : "attendance.manage";
          },
          (resolvedActor, requestId, reason, at) => {
            const day = repository.getDay(data.attendanceDayId);
            if (!day) throw attendanceError("ATTENDANCE_DAY_NOT_FOUND", "Attendance day was not found.");
            if (day.locked) throw attendanceError(
              "ATTENDANCE_DAY_LOCKED", "Reopen the day before requesting overtime.");
            const staff = repository.getStaff(day.staffId);
            assertScope(resolvedActor, staff, resolvedActor.staffId === day.staffId);
            const overtimeRecords = repository.listOvertime({
              attendanceDayId: day.attendanceDayId
            });
            const decided = new Set(overtimeRecords
              .map((entry) => text(entry.reversesApprovalId)).filter(Boolean));
            if (overtimeRecords.some((entry) => upper(entry.status) === "PENDING" &&
                !decided.has(entry.overtimeApprovalId))) {
              throw attendanceError("ATTENDANCE_OVERTIME_PENDING_CONFLICT",
                "Resolve the existing pending overtime request first.");
            }
            if (number(day.eligibleOvertimeMinutes, 0) <= 0) {
              throw attendanceError("ATTENDANCE_OVERTIME_NOT_ELIGIBLE",
                "No eligible overtime exists after rounding, threshold, and cap.");
            }
            const record = {
              overtimeApprovalId: allocateId("OVT", (candidate) =>
                !!repository.getOvertime(candidate),
              "ATTENDANCE_OVERTIME_ID_ALLOCATION_FAILED"),
              attendanceDayId: day.attendanceDayId,
              staffId: staff.staffId, date: day.attendanceDate,
              rawOvertimeMinutes: day.rawOvertimeMinutes, approvedOvertimeMinutes: 0,
              status: "PENDING", decisionReason: reason, decidedAt: "", decidedBy: "",
              reversesApprovalId: "", dayCalculationVersion: day.calculationVersion,
              dayLastEventAt: day.lastEventAt,
              daySourceEventHash: day.sourceEventHash,
              stale: false, createdAt: at,
              createdBy: resolvedActor.actorId, requestId,
              requestFingerprint: fingerprint("requestAttendanceOvertime", resolvedActor.actorId, data)
            };
            repository.appendOvertime(record);
            const event = appendEvent("OVERTIME_REQUEST", staff, day, resolvedActor, requestId, reason, at,
              { sourceEntityType: "ATTENDANCE_OVERTIME_APPROVAL", sourceEntityId: record.overtimeApprovalId });
            audit("OVERTIME_REQUEST", "ATTENDANCE_OVERTIME_APPROVAL", record.overtimeApprovalId,
              staff.staffId, resolvedActor, day, record, reason, requestId, at);
            return { overtimeApproval: overtimeDto(record), event };
          });
      },
      approveAttendanceOvertime(data) {
        return mutation("approveAttendanceOvertime", data, "attendance.approve_overtime",
          (resolvedActor, requestId, reason, at) => {
            const pending = repository.getOvertime(data.overtimeApprovalId);
            if (!pending) throw attendanceError("ATTENDANCE_OVERTIME_NOT_FOUND", "Overtime request was not found.");
            if (upper(pending.status) !== "PENDING") throw attendanceError("ATTENDANCE_OVERTIME_NOT_PENDING", "Only pending overtime can be approved.");
            if (repository.listOvertime({ attendanceDayId: pending.attendanceDayId })
              .some((item) => item.reversesApprovalId === pending.overtimeApprovalId)) {
              throw attendanceError("ATTENDANCE_OVERTIME_ALREADY_REVIEWED",
                "Overtime request already has an append-only decision.");
            }
            if (pending.createdBy === resolvedActor.actorId) throw attendanceError("ATTENDANCE_SELF_APPROVAL_FORBIDDEN", "Requester cannot approve their overtime.");
            const day = repository.getDay(pending.attendanceDayId);
            if (day.locked) throw attendanceError("ATTENDANCE_DAY_LOCKED", "Reopen the day before overtime review.");
            const staff = repository.getStaff(day.staffId); assertScope(resolvedActor, staff, false);
            if (pending.dayLastEventAt !== day.lastEventAt ||
                text(pending.daySourceEventHash) !== text(day.sourceEventHash) ||
                number(pending.rawOvertimeMinutes, 0) !== number(day.rawOvertimeMinutes, 0)) {
              throw attendanceError("ATTENDANCE_OVERTIME_STALE", "Attendance changed after the overtime request.");
            }
            const approved = number(data.approvedMinutes, day.eligibleOvertimeMinutes);
            if (approved < 0 || approved > number(day.eligibleOvertimeMinutes, 0)) {
              throw attendanceError("ATTENDANCE_OVERTIME_EXCEEDS_ELIGIBLE", "Approved overtime exceeds raw overtime or policy cap.");
            }
            const decision = { ...pending,
              overtimeApprovalId: allocateId("OVT", (candidate) =>
                !!repository.getOvertime(candidate),
              "ATTENDANCE_OVERTIME_ID_ALLOCATION_FAILED"),
              approvedOvertimeMinutes: approved, status: "APPROVED", decisionReason: reason,
              decidedAt: at, decidedBy: resolvedActor.actorId,
              reversesApprovalId: pending.overtimeApprovalId, createdAt: at,
              createdBy: resolvedActor.actorId, requestId };
            repository.appendOvertime(decision);
            const event = appendEvent("OVERTIME_APPROVED", staff, day, resolvedActor, requestId, reason, at,
              { sourceEntityType: "ATTENDANCE_OVERTIME_APPROVAL", sourceEntityId: decision.overtimeApprovalId });
            const updated = loadDay(staff, day.attendanceDate, at);
            persistDay({ ...updated, lastActionId: event.eventId, lastRequestId: requestId });
            audit("OVERTIME_APPROVED", "ATTENDANCE_OVERTIME_APPROVAL", decision.overtimeApprovalId,
              staff.staffId, resolvedActor, pending, decision, reason, requestId, at);
            return { overtimeApproval: overtimeDto(decision), attendanceDay: updated, event };
          });
      },
      rejectAttendanceOvertime(data) {
        return mutation("rejectAttendanceOvertime", data, "attendance.approve_overtime",
          (resolvedActor, requestId, reason, at) => {
            const pending = repository.getOvertime(data.overtimeApprovalId);
            if (!pending) throw attendanceError("ATTENDANCE_OVERTIME_NOT_FOUND", "Overtime request was not found.");
            if (upper(pending.status) !== "PENDING") throw attendanceError("ATTENDANCE_OVERTIME_NOT_PENDING", "Only pending overtime can be rejected.");
            if (repository.listOvertime({ attendanceDayId: pending.attendanceDayId })
              .some((item) => item.reversesApprovalId === pending.overtimeApprovalId)) {
              throw attendanceError("ATTENDANCE_OVERTIME_ALREADY_REVIEWED",
                "Overtime request already has an append-only decision.");
            }
            if (pending.createdBy === resolvedActor.actorId) throw attendanceError("ATTENDANCE_SELF_APPROVAL_FORBIDDEN", "Requester cannot reject their overtime.");
            const day = repository.getDay(pending.attendanceDayId);
            if (day.locked) throw attendanceError(
              "ATTENDANCE_DAY_LOCKED", "Reopen the day before overtime review.");
            const staff = repository.getStaff(day.staffId); assertScope(resolvedActor, staff, false);
            const decision = { ...pending,
              overtimeApprovalId: allocateId("OVT", (candidate) =>
                !!repository.getOvertime(candidate),
              "ATTENDANCE_OVERTIME_ID_ALLOCATION_FAILED"),
              approvedOvertimeMinutes: 0, status: "REJECTED", decisionReason: reason,
              decidedAt: at, decidedBy: resolvedActor.actorId,
              reversesApprovalId: pending.overtimeApprovalId, createdAt: at,
              createdBy: resolvedActor.actorId, requestId };
            repository.appendOvertime(decision);
            const event = appendEvent("OVERTIME_REJECTED", staff, day, resolvedActor, requestId, reason, at,
              { sourceEntityType: "ATTENDANCE_OVERTIME_APPROVAL", sourceEntityId: decision.overtimeApprovalId });
            audit("OVERTIME_REJECTED", "ATTENDANCE_OVERTIME_APPROVAL", decision.overtimeApprovalId,
              staff.staffId, resolvedActor, pending, decision, reason, requestId, at);
            return { overtimeApproval: overtimeDto(decision), event };
          });
      },
      listUnresolvedAttendanceDays(data) {
        const resolvedActor = actor(data); requirePermission(resolvedActor, "attendance.view");
        return filterSensitiveFields({
          status: "success", code: "ATTENDANCE_UNRESOLVED_OK",
          serverNow: now(),
          attendanceDays: repository.listDays({}).filter((day) =>
            day.openSession || day.openBreak || day.status === "UNRESOLVED" ||
            (day.calculationWarnings || []).length)
            .filter((day) => {
              try { assertScope(resolvedActor, repository.getStaff(day.staffId), false); return true; }
              catch (_error) { return false; }
            })
        });
      },
      listOpenAttendanceBreaks(data) {
        const resolvedActor = actor(data); requirePermission(resolvedActor, "attendance.view");
        return filterSensitiveFields({
          status: "success", code: "ATTENDANCE_OPEN_BREAKS_OK",
          serverNow: now(),
          attendanceDays: repository.listDays({}).filter((day) => day.openBreak)
            .filter((day) => {
              try { assertScope(resolvedActor, repository.getStaff(day.staffId), false); return true; }
              catch (_error) { return false; }
            })
        });
      },
      getAttendanceAuditHistory(data) {
        const resolvedActor = actor(data); requirePermission(resolvedActor, "attendance.view");
        if (data.staffId) assertScope(resolvedActor, repository.getStaff(data.staffId), false);
        return filterSensitiveFields({
          status: "success", code: "ATTENDANCE_AUDIT_OK",
          audit: repository.listAudit({ entityId: data.entityId, staffId: data.staffId }).slice(-300)
        });
      },
      listLegacyAttendanceRecords(data) {
        const resolvedActor = actor(data); requirePermission(resolvedActor, "attendance.view");
        const records = (repository.listLegacy ? repository.listLegacy() : []).filter((item) => {
          if (!item.staffId) return resolvedActor.owner;
          const staff = repository.getStaff(item.staffId);
          if (!staff) return resolvedActor.owner;
          try { assertScope(resolvedActor, staff, false); return true; }
          catch (_error) { return false; }
        });
        return filterSensitiveFields({
          status: "success", code: "ATTENDANCE_LEGACY_READ_ONLY_OK",
          readOnly: true, records
        });
      }
    };
    return Object.freeze({
      execute(action, data) {
        if (!ACTIONS.includes(action) || action === "previewAttendanceMigration") {
          throw attendanceError("ATTENDANCE_ACTION_UNKNOWN", "Attendance action is not supported by the service.");
        }
        return handlers[action](data || {});
      }
    });
  }

  function planAttendanceMigration(existingSheets, identity) {
    const plan = clone(core.planSchemaMigration(existingSheets, identity));
    const environment = text(identity && identity.environment).toLowerCase();
    if (["production", "staging"].includes(environment)) {
      plan.errors = (plan.errors || []).filter((item) => item.code !== "ENVIRONMENT_NOT_APPROVED");
      plan.errors.push({ code: "PHASE3_ENVIRONMENT_BLOCKED" });
      plan.blocked = true;
    }
    plan.phase = 3;
    plan.executionAllowed = false;
    plan.writes = 0;
    plan.rollback.historicalRowsTouched = 0;
    return Object.freeze(plan);
  }

  return Object.freeze({
    PHASE3_VERSION, TIME_ZONE, EVENT_TYPES, ACTIONS, WRITE_ACTIONS,
    SHEET_SCHEMAS: schema.SHEET_SCHEMAS, filterSensitiveFields,
    resolveAttendanceContext, effectiveEvents, buildEventState, calculateDay,
    createMemoryRepository, createService, normalizeLegacyAttendanceRows,
    planAttendanceMigration, attendanceError
  });
});
