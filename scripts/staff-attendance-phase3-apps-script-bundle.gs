/* GENERATED FILE. Upload this bundle instead of the six constituent modules. */
/* Order: schema -> Phase 1 core -> Phase 2 domain/adapter -> Phase 3 domain/adapter. */

/* BEGIN staff-attendance-schema.js */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.StaffAttendanceSchema = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SCHEMA_VERSION = "STAFF_ATTENDANCE_V4";

  const SHEET_SCHEMAS = Object.freeze({
    BARBER_SCHEDULE: Object.freeze([
      "SCHEDULE_ID", "STAFF_ID", "STAFF_NAME", "WEEKDAY", "SHIFT_START",
      "SHIFT_END", "ACTIVE", "UPDATED_AT", "SEGMENT_INDEX",
      "REQUIRED_WORK_MINUTES", "ALLOWED_BREAK_MINUTES", "EFFECTIVE_FROM",
      "EFFECTIVE_TO", "CREATED_AT", "CREATED_BY", "UPDATED_BY", "BRANCH_ID",
      "LAST_REQUEST_ID", "RECORD_TYPE"
    ]),
    STAFF_SCHEDULE_OVERRIDES: Object.freeze([
      "OVERRIDE_ID", "STAFF_ID", "STAFF_NAME", "DATE", "TYPE", "SEGMENT_INDEX",
      "SHIFT_START", "SHIFT_END", "REQUIRED_WORK_MINUTES", "ALLOWED_BREAK_MINUTES",
      "BLOCK_START", "BLOCK_END", "REASON", "STATUS", "APPROVED_BY",
      "APPROVED_AT", "CREATED_AT", "CREATED_BY", "UPDATED_AT", "UPDATED_BY",
      "SCOPE_TYPE", "BRANCH_ID", "SOURCE_EVIDENCE", "REQUESTED_BY",
      "REVIEW_REASON", "CANCELLED_AT", "CANCELLED_BY",
      "CANCELLATION_REASON", "LAST_REQUEST_ID", "EFFECT_SCOPE"
    ]),
    ATTENDANCE: Object.freeze([
      "ID", "DATE", "STAFF_ID", "STAFF_NAME", "RECORD_TYPE", "SHIFT_START",
      "CHECK_IN", "BREAK_OUT", "BREAK_IN", "CHECK_OUT", "WORK_HOURS",
      "BREAK_HOURS", "LATE_HOURS", "SHORT_HOURS", "ABSENCE_DAYS",
      "PENALTY_AMOUNT", "PENALTY_REASON", "SUGGESTED_DEDUCTION",
      "APPROVED_DEDUCTION", "APPROVAL_STATUS", "APPROVED_BY", "NOTE",
      "CREATED_AT", "UPDATED_AT",
      "ATTENDANCE_DAY_ID", "BRANCH_ID", "ATTENDANCE_DATE", "TIMEZONE",
      "STATUS", "SCHEDULE_SOURCE", "SCHEDULE_SOURCE_IDS", "SCHEDULED_START",
      "SCHEDULED_END", "SHIFT_SEGMENTS", "REQUIRED_WORK_MINUTES_RAW",
      "REQUIRED_WORK_MINUTES_ROUNDED", "ALLOWED_BREAK_MINUTES",
      "ACTUAL_CHECK_IN", "ACTUAL_CHECK_OUT", "SESSION_COUNT",
      "PRESENCE_MINUTES_RAW", "PRESENCE_MINUTES_ROUNDED",
      "ACTUAL_BREAK_MINUTES_RAW", "ACTUAL_BREAK_MINUTES_ROUNDED",
      "PAID_BREAK_CREDIT_MINUTES_RAW", "WORKED_MINUTES_RAW",
      "WORKED_MINUTES_ROUNDED", "CREDITED_WORK_MINUTES_RAW",
      "LATE_MINUTES_RAW", "LATE_MINUTES_ROUNDED",
      "EARLY_LEAVE_MINUTES_RAW", "EARLY_LEAVE_MINUTES_ROUNDED",
      "EXCESS_BREAK_MINUTES_RAW", "EXCESS_BREAK_MINUTES_ROUNDED",
      "DEFICIT_MINUTES_RAW", "DEFICIT_MINUTES_ROUNDED",
      "RAW_OVERTIME_MINUTES", "ELIGIBLE_OVERTIME_MINUTES",
      "APPROVED_OVERTIME_MINUTES",
      "OVERTIME_APPROVAL_STATUS", "LEAVE_OR_ABSENCE_TYPE", "OPEN_SESSION",
      "OPEN_BREAK", "CALCULATION_WARNINGS", "POLICY_ID", "POLICY_SNAPSHOT",
      "SCHEDULE_SNAPSHOT", "SOURCE_EVENT_IDS", "SOURCE_EVENT_HASH",
      "STALE_CALCULATION", "LAST_EVENT_AT", "CALCULATED_AT", "DAY_LIFECYCLE",
      "CALCULATION_VERSION", "LOCKED", "REOPENED_COUNT", "REOPENED_AT",
      "REOPENED_BY", "LAST_ACTION_ID", "LAST_REQUEST_ID"
    ]),
    ATTENDANCE_EVENTS: Object.freeze([
      "EVENT_ID", "ATTENDANCE_DAY_ID", "STAFF_ID", "STAFF_NAME", "DATE",
      "BRANCH_ID", "TIMEZONE", "EVENT_TYPE", "EVENT_AT", "SESSION_INDEX",
      "BREAK_INDEX", "EVENT_SEQUENCE", "STATUS",
      "REVERSES_EVENT_ID", "SOURCE_ENTITY_TYPE", "SOURCE_ENTITY_ID", "REASON",
      "CORRECTION_PAYLOAD_JSON", "ACTOR_ID", "ACTOR_NAME", "ACTOR_ROLE",
      "CREATED_AT", "REQUEST_ID", "REQUEST_FINGERPRINT"
    ]),
    STAFF_WORK_POLICIES: Object.freeze([
      "POLICY_ID", "STAFF_ID", "EFFECTIVE_FROM", "EFFECTIVE_TO",
      "REQUIRED_DAILY_MINUTES", "DEFAULT_SHIFT_START", "DEFAULT_SHIFT_END",
      "ALLOWED_BREAK_MINUTES", "BREAK_PAYMENT_TYPE", "ALLOW_MULTIPLE_BREAKS",
      "MAX_SINGLE_BREAK_MINUTES", "BREAK_GRACE_MINUTES",
      "EXCESS_BREAK_CONTRIBUTES_TO_DEFICIT", "GRACE_LATE_MINUTES",
      "GRACE_EARLY_LEAVE_MINUTES", "DEFICIT_RATE_TYPE",
      "DEFICIT_RATE_PER_HOUR", "FIXED_LATE_PENALTY", "DAILY_DEDUCTION_CAP",
      "OVERTIME_RATE_PER_HOUR", "OVERTIME_MULTIPLIER", "OVERTIME_POLICY",
      "OVERTIME_APPROVAL_REQUIRED", "MIN_OVERTIME_THRESHOLD_MINUTES",
      "DAILY_OVERTIME_CAP_MINUTES", "PERIOD_OVERTIME_CAP_MINUTES",
      "OVERTIME_ALLOWED_WINDOWS_JSON", "ROUNDING_INCREMENT_MINUTES",
      "ROUNDING_MODE", "SETTLEMENT_PERIOD", "MONTHLY_ALLOWED_LEAVE_DAYS",
      "LEAVE_CARRY_FORWARD", "MAX_CARRY_FORWARD_DAYS",
      "LEAVE_TYPES_CONSUMING_JSON", "LEAVE_TYPES_EXEMPT_JSON",
      "PARTIAL_LEAVE_UNIT", "LEAVE_APPROVAL_REQUIRED",
      "LEAVE_RESET_PERIOD", "HIRE_DATE_PRORATION", "TERMINATION_DATE_PRORATION",
      "EXCESS_ABSENCE_POLICY", "EXCESS_ABSENCE_MULTIPLIER",
      "EXCESS_ABSENCE_FIXED_AMOUNT", "MAX_EXCESS_ABSENCE_DEDUCTION",
      "DAY_VALUE_METHOD", "FIXED_DAY_VALUE", "MONTHLY_SALARY",
      "WORKING_DAYS_DIVISOR", "HOURLY_RATE", "CURRENCY", "ACTIVE", "CREATED_AT",
      "CREATED_BY", "UPDATED_AT", "UPDATED_BY",
      "CURRENCY_MINOR_SCALE", "SALARY_BASIS",
      "MONTHLY_SALARY_MINOR",
      "DEFICIT_RATE_MINOR_PER_MINUTE", "DAILY_DEDUCTION_CAP_MINOR",
      "PERIOD_DEDUCTION_CAP_MINOR", "OVERTIME_RATE_TYPE",
      "OVERTIME_RATE_MINOR_PER_MINUTE", "OVERTIME_MULTIPLIER_BPS",
      "UNPAID_LEAVE_MULTIPLIER_BPS", "ABSENCE_MULTIPLIER_BPS",
      "SICK_LEAVE_PAID", "UNRESOLVED_BEHAVIOR"
    ]),
    ATTENDANCE_ADJUSTMENTS: Object.freeze([
      "ADJUSTMENT_ID", "ATTENDANCE_DAY_ID", "STAFF_ID", "DATE", "TYPE",
      "BEFORE_STATE_JSON", "PROPOSED_STATE_JSON", "FINAL_STATE_JSON", "REASON",
      "STATUS", "REQUESTED_AT", "REQUESTED_BY", "REVIEWED_AT", "REVIEWED_BY",
      "REVIEW_NOTE", "APPLIED_AT", "APPLIED_BY", "ACTION_ID", "REQUEST_ID",
      "REQUEST_FINGERPRINT"
    ]),
    STAFF_LEAVE_LEDGER: Object.freeze([
      "LEAVE_ENTRY_ID", "STAFF_ID", "STAFF_NAME", "PERIOD_KEY", "DATE",
      "LEAVE_TYPE", "SOURCE_OVERRIDE_ID", "UNITS_DAYS", "MINUTES", "DIRECTION",
      "STATUS", "REVERSES_ENTRY_ID", "SETTLEMENT_ID", "POLICY_ID",
      "POLICY_SNAPSHOT_JSON", "REASON", "CREATED_AT", "CREATED_BY", "REQUEST_ID"
    ]),
    ATTENDANCE_OVERTIME_APPROVALS: Object.freeze([
      "OVERTIME_APPROVAL_ID", "ATTENDANCE_DAY_ID", "STAFF_ID", "DATE",
      "RAW_OVERTIME_MINUTES", "APPROVED_OVERTIME_MINUTES", "STATUS",
      "DECISION_REASON", "DECIDED_AT", "DECIDED_BY", "REVERSES_APPROVAL_ID",
      "DAY_CALCULATION_VERSION", "DAY_LAST_EVENT_AT", "DAY_SOURCE_EVENT_HASH",
      "STALE", "CREATED_AT",
      "CREATED_BY", "REQUEST_ID", "REQUEST_FINGERPRINT"
    ]),
    PAYROLL_ATTENDANCE_PERIODS: Object.freeze([
      "PAYROLL_PERIOD_ID", "SCOPE_TYPE", "BRANCH_ID", "START_DATE", "END_DATE",
      "TIMEZONE", "STATUS", "CALCULATION_VERSION", "SOURCE_EMPLOYEE_HASH",
      "NOTES", "CREATED_BY", "CREATED_AT", "CALCULATED_BY", "CALCULATED_AT",
      "SUBMITTED_BY", "SUBMITTED_AT", "APPROVED_BY", "APPROVED_AT",
      "LOCKED_BY", "LOCKED_AT", "REOPENED_BY", "REOPENED_AT",
      "REOPEN_REASON", "UPDATED_BY", "UPDATED_AT", "LAST_REQUEST_ID"
    ]),
    PAYROLL_ATTENDANCE_SETTLEMENTS: Object.freeze([
      "SETTLEMENT_ID", "STAFF_ID", "STAFF_NAME", "PERIOD_START", "PERIOD_END",
      "SETTLEMENT_PERIOD", "REQUIRED_MINUTES", "WORKED_MINUTES",
      "DEFICIT_MINUTES", "RAW_OVERTIME_MINUTES", "APPROVED_OVERTIME_MINUTES",
      "ALLOWED_LEAVE_DAYS", "CONSUMED_LEAVE_DAYS", "EXCESS_ABSENCE_DAYS",
      "DEFICIT_VALUE", "OVERTIME_VALUE", "EXCESS_ABSENCE_DEDUCTION",
      "MANUAL_ADJUSTMENTS", "NET_ATTENDANCE_ADJUSTMENT", "DAY_VALUE",
      "DAY_VALUE_METHOD", "POLICY_ID", "POLICY_SNAPSHOT_JSON",
      "CALCULATION_VERSION", "STATUS", "APPROVED_BY", "APPROVED_AT", "LOCKED",
      "LOCKED_AT", "LOCKED_BY", "REOPENED_AT", "REOPENED_BY",
      "REOPEN_REASON", "CREATED_AT", "CREATED_BY", "UPDATED_AT", "UPDATED_BY",
      "LAST_REQUEST_ID", "CURRENCY", "DEFICIT_VALUE_MINOR", "OVERTIME_VALUE_MINOR",
      "EXCESS_ABSENCE_DEDUCTION_MINOR", "MANUAL_ADJUSTMENTS_MINOR",
      "NET_ATTENDANCE_ADJUSTMENT_MINOR",
      "PAYROLL_PERIOD_ID", "SETTLEMENT_VERSION", "STAFF_NAME_SNAPSHOT",
      "BRANCH_ID", "SALARY_BASIS", "BASE_SALARY_MINOR",
      "CONTRACTUAL_MINUTES", "ATTENDED_REQUIRED_MINUTES",
      "APPROVED_PAID_LEAVE_MINUTES", "UNPAID_LEAVE_MINUTES",
      "ABSENCE_MINUTES", "DEFICIT_RATE_MINOR_PER_MINUTE",
      "OVERTIME_RATE_MINOR_PER_MINUTE", "BASE_PERIOD_AMOUNT_MINOR",
      "DEFICIT_DEDUCTION_MINOR", "UNPAID_LEAVE_DEDUCTION_MINOR",
      "ABSENCE_DEDUCTION_MINOR", "OVERTIME_COMPENSATION_MINOR",
      "GROSS_ATTENDANCE_ADJUSTMENT_MINOR", "SOURCE_ATTENDANCE_DAY_IDS_JSON",
      "SOURCE_ATTENDANCE_SNAPSHOT_JSON", "SOURCE_AGGREGATE_HASH",
      "SALARY_SNAPSHOT_JSON", "WARNINGS_JSON", "STALE", "SUPERSEDES_SETTLEMENT_ID"
    ]),
    PAYROLL_ATTENDANCE_ADJUSTMENTS: Object.freeze([
      "ADJUSTMENT_ID", "SETTLEMENT_ID", "PAYROLL_PERIOD_ID", "STAFF_ID",
      "AMOUNT_MINOR", "DIRECTION", "CATEGORY", "REASON", "STATUS",
      "REQUESTED_BY", "REQUESTED_AT", "DECIDED_BY", "DECIDED_AT",
      "DECISION_REASON", "BEFORE_STATE_JSON", "AFTER_STATE_JSON",
      "REVERSES_ADJUSTMENT_ID", "REQUEST_ID", "REQUEST_FINGERPRINT"
    ]),
    PAYROLL_ATTENDANCE_AUDIT: Object.freeze([
      "ACTION_ID", "ENTITY_TYPE", "ENTITY_ID", "ACTION", "ACTOR_ID",
      "ACTOR_NAME", "ACTOR_ROLE", "STAFF_ID", "BRANCH_ID",
      "BEFORE_STATE_JSON", "AFTER_STATE_JSON", "REASON", "TIMESTAMP",
      "REQUEST_ID"
    ]),
    PAYROLL_ATTENDANCE_IDEMPOTENCY: Object.freeze([
      "REQUEST_ID", "ACTION", "ACTOR_ID", "REQUEST_FINGERPRINT",
      "RESPONSE_JSON", "STATUS", "CREATED_AT", "EXPIRES_AT"
    ]),
    STAFF_ATTENDANCE_AUDIT: Object.freeze([
      "ACTION_ID", "ENTITY_TYPE", "ENTITY_ID", "ACTION", "ACTOR_ID",
      "ACTOR_NAME", "ACTOR_ROLE", "STAFF_ID", "BEFORE_STATE_JSON",
      "AFTER_STATE_JSON", "REASON", "TIMESTAMP", "REQUEST_ID"
    ]),
    STAFF_ATTENDANCE_IDEMPOTENCY: Object.freeze([
      "REQUEST_ID", "ACTION", "ACTOR_ID", "REQUEST_FINGERPRINT",
      "RESPONSE_JSON", "STATUS", "CREATED_AT", "EXPIRES_AT"
    ])
  });

  const LEGACY_ATTENDANCE_HEADERS = Object.freeze(SHEET_SCHEMAS.ATTENDANCE.slice(0, 24));
  const LEGACY_SCHEDULE_HEADERS = Object.freeze([
    "SCHEDULE_ID", "STAFF_ID", "STAFF_NAME", "WEEKDAY",
    "SHIFT_START", "SHIFT_END", "ACTIVE", "UPDATED_AT"
  ]);

  const PERMISSIONS = Object.freeze([
    "attendance.view", "attendance.self_action", "attendance.manage",
    "attendance.correct", "attendance.approve_adjustment", "attendance.approve_overtime",
    "schedule.view", "schedule.manage", "leave.request", "leave.approve", "payroll_policy.view",
    "payroll_policy.manage", "payroll_settlement.view",
    "payroll_settlement.approve",
    "payroll_attendance.view", "payroll_attendance.calculate",
    "payroll_attendance.review", "payroll_attendance.approve",
    "payroll_attendance.lock", "payroll_attendance.reopen",
    "payroll_attendance.adjust", "payroll_attendance.export"
  ]);

  return Object.freeze({
    SCHEMA_VERSION,
    SHEET_SCHEMAS,
    LEGACY_ATTENDANCE_HEADERS,
    LEGACY_SCHEDULE_HEADERS,
    PERMISSIONS
  });
});

/* END staff-attendance-schema.js */

/* BEGIN staff-attendance-core.js */
(function (root, factory) {
  const schema = typeof module !== "undefined" && module.exports
    ? require("./staff-attendance-schema")
    : root.StaffAttendanceSchema;
  const api = factory(schema);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.StaffAttendanceCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (schema) {
  "use strict";

  if (!schema) throw new Error("STAFF_ATTENDANCE_SCHEMA_REQUIRED");

  const CALCULATION_VERSION = "STAFF_ATTENDANCE_CALC_V1";
  const STATES = Object.freeze({
    NOT_STARTED: "NOT_STARTED",
    CHECKED_IN: "CHECKED_IN",
    ON_BREAK: "ON_BREAK",
    CHECKED_OUT: "CHECKED_OUT",
    ABSENT: "ABSENT",
    LEAVE: "LEAVE"
  });
  const EVENTS = Object.freeze({
    CHECK_IN: "CHECK_IN",
    START_BREAK: "START_BREAK",
    END_BREAK: "END_BREAK",
    CHECK_OUT: "CHECK_OUT",
    MARK_ABSENT: "MARK_ABSENT",
    APPROVE_LEAVE: "APPROVE_LEAVE",
    CANCEL_LAST_ACTION: "CANCEL_LAST_ACTION",
    REOPEN: "REOPEN"
  });
  const OVERRIDE_TYPES = Object.freeze([
    "CUSTOM_SHIFT", "DAY_OFF", "APPROVED_LEAVE", "UNPAID_LEAVE", "SICK_LEAVE",
    "EMERGENCY_LEAVE", "ABSENT", "PARTIAL_ABSENCE", "PLANNED_BREAK", "TRAINING",
    "BRANCH_CLOSED"
  ]);
  const BLOCKING_OVERRIDE_TYPES = Object.freeze([
    "DAY_OFF", "APPROVED_LEAVE", "UNPAID_LEAVE", "SICK_LEAVE", "ABSENT",
    "BRANCH_CLOSED"
  ]);
  const OVERTIME_MODES = Object.freeze([
    "OFFSET_DEFICIT_ONLY", "OFFSET_THEN_PAY",
    "PAY_ALL_OVERTIME_SEPARATELY", "NO_OVERTIME"
  ]);

  function domainError(code, message, details) {
    const error = new Error(message || code);
    error.code = code;
    if (details !== undefined) error.details = details;
    return error;
  }

  function finiteNumber(value, fallback) {
    const result = Number(value);
    return Number.isFinite(result) ? result : (fallback === undefined ? 0 : fallback);
  }

  function nonNegative(value, name) {
    const result = finiteNumber(value, NaN);
    if (!Number.isFinite(result) || result < 0) {
      throw domainError("INVALID_NON_NEGATIVE_NUMBER", `${name || "value"} must be a non-negative number.`);
    }
    return result;
  }

  function positive(value, name) {
    const result = finiteNumber(value, NaN);
    if (!Number.isFinite(result) || result <= 0) {
      throw domainError("INVALID_POSITIVE_NUMBER", `${name || "value"} must be a positive number.`);
    }
    return result;
  }

  function roundMoney(value) {
    return moneyMinorUnits(value) / 100;
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.getOwnPropertyNames(value).forEach((key) => deepFreeze(value[key]));
    return Object.freeze(value);
  }

  function moneyMinorUnits(value) {
    return Math.round((finiteNumber(value) + Number.EPSILON) * 100);
  }

  function minuteRateMinorUnits(minutes, hourlyRate, multiplier) {
    return Math.round(
      nonNegative(minutes, "minutes") *
      nonNegative(hourlyRate, "hourly rate") *
      positive(multiplier === undefined ? 1 : multiplier, "rate multiplier") /
      60 * 100 + Number.EPSILON
    );
  }

  function parseDateKey(value) {
    const text = String(value || "").trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!match) throw domainError("INVALID_DATE", "Date must use YYYY-MM-DD.");
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const stamp = Date.UTC(year, month - 1, day);
    const check = new Date(stamp);
    if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
      throw domainError("INVALID_DATE", "Date is not a valid calendar day.");
    }
    return { text, year, month, day, epochDay: Math.floor(stamp / 86400000) };
  }

  function parseClock(value) {
    const text = String(value || "").trim();
    const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(text);
    if (!match) throw domainError("INVALID_TIME", "Time must use 24-hour HH:mm or HH:mm:ss.");
    return Number(match[1]) * 60 + Number(match[2]) + Number(match[3] || 0) / 60;
  }

  function civilMinute(dateKey, time) {
    return parseDateKey(dateKey).epochDay * 1440 + parseClock(time);
  }

  function parseIsoInstant(value) {
    const text = String(value || "").trim();
    const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?)(Z|[+-]\d{2}:\d{2})$/.exec(text);
    const epochMilliseconds = Date.parse(text);
    if (!match || !Number.isFinite(epochMilliseconds)) {
      throw domainError("INVALID_INSTANT", "Timestamp must be an ISO instant with an explicit UTC offset.");
    }
    return {
      text,
      epochMilliseconds,
      civilMinute: civilMinute(match[1], match[2].slice(0, 8))
    };
  }

  function timelineMinute(dateKey, time, anchorMinute) {
    let value = civilMinute(dateKey, time);
    if (anchorMinute !== undefined && value < anchorMinute) value += 1440;
    return value;
  }

  function normalizeInterval(dateKey, start, end, anchorMinute) {
    if (parseClock(start) === parseClock(end)) {
      throw domainError("ZERO_DURATION_INTERVAL", "Start and end times cannot be equal.");
    }
    const startMinute = timelineMinute(dateKey, start, anchorMinute);
    let endMinute = timelineMinute(dateKey, end, startMinute);
    if (endMinute <= startMinute) endMinute += 1440;
    return { startMinute, endMinute, minutes: endMinute - startMinute };
  }

  function roundMinutes(value, increment, mode) {
    const minutes = nonNegative(value, "minutes");
    const step = finiteNumber(increment, 0);
    const roundingMode = String(mode || "NONE").toUpperCase();
    if (!step || roundingMode === "NONE") return Math.round(minutes * 1000) / 1000;
    positive(step, "rounding increment");
    const ratio = minutes / step;
    if (roundingMode === "FLOOR") return Math.floor(ratio) * step;
    if (roundingMode === "CEIL") return Math.ceil(ratio) * step;
    if (roundingMode === "NEAREST") return Math.round(ratio) * step;
    throw domainError("INVALID_ROUNDING_MODE", "Unsupported rounding mode.");
  }

  function applyGrace(value, grace) {
    const minutes = nonNegative(value, "minutes");
    return minutes <= nonNegative(grace || 0, "grace minutes") ? 0 : minutes;
  }

  function validateBreaks(breaks, sessions, options) {
    const list = Array.isArray(breaks) ? breaks : [];
    const allowOpen = !!(options && options.allowOpenBreak);
    const maxSingle = finiteNumber(options && options.maximumSingleBreakMinutes, 0);
    const firstSessionStart = sessions[0].startMinute;
    const instantMode = sessions.every((session) => session.startEpoch !== undefined);
    const normalized = list.map((item, index) => {
      const usesInstant = !!(item && (item.startedAt || item.endedAt));
      if (usesInstant !== instantMode) {
        throw domainError("MIXED_TIME_FORMAT", "Attendance sessions and breaks must use the same time format.");
      }
      if (instantMode) {
        if (!item.startedAt) throw domainError("INVALID_BREAK", `Break ${index + 1} has no start timestamp.`);
        const started = parseIsoInstant(item.startedAt);
        if (!item.endedAt) {
          if (!allowOpen) throw domainError("OPEN_BREAK", "All breaks must be ended before calculation.");
          return {
            index, startMinute: started.civilMinute, endMinute: null,
            startEpoch: started.epochMilliseconds, endEpoch: null, minutes: 0, open: true
          };
        }
        const ended = parseIsoInstant(item.endedAt);
        if (ended.epochMilliseconds <= started.epochMilliseconds) {
          throw domainError("INVALID_BREAK_DURATION", "Break end must be after break start.");
        }
        const containingSession = sessions.find((session) =>
          started.epochMilliseconds >= session.startEpoch && ended.epochMilliseconds <= session.endEpoch);
        if (!containingSession) {
          throw domainError("BREAK_OUTSIDE_PRESENCE", "Break must be inside one attendance session.");
        }
        const minutes = (ended.epochMilliseconds - started.epochMilliseconds) / 60000;
        if (maxSingle > 0 && minutes > maxSingle) {
          throw domainError("BREAK_TOO_LONG", "A break exceeds the maximum single-break limit.");
        }
        return {
          index,
          startMinute: started.civilMinute,
          endMinute: ended.civilMinute,
          startEpoch: started.epochMilliseconds,
          endEpoch: ended.epochMilliseconds,
          minutes,
          open: false
        };
      }
      if (!item || !item.start) throw domainError("INVALID_BREAK", `Break ${index + 1} has no start time.`);
      const startMinute = timelineMinute(options.dateKey, item.start, firstSessionStart);
      if (!item.end) {
        if (!allowOpen) throw domainError("OPEN_BREAK", "All breaks must be ended before calculation.");
        return { index, startMinute, endMinute: null, minutes: 0, open: true };
      }
      let endMinute = timelineMinute(options.dateKey, item.end, startMinute);
      if (endMinute <= startMinute) endMinute += 1440;
      const containingSession = sessions.find((session) =>
        startMinute >= session.startMinute && endMinute <= session.endMinute);
      if (!containingSession) {
        throw domainError("BREAK_OUTSIDE_PRESENCE", "Break must be inside the attendance interval.");
      }
      const minutes = endMinute - startMinute;
      if (maxSingle > 0 && minutes > maxSingle) {
        throw domainError("BREAK_TOO_LONG", "A break exceeds the maximum single-break limit.");
      }
      return { index, startMinute, endMinute, minutes, open: false };
    }).sort((a, b) => instantMode ? a.startEpoch - b.startEpoch : a.startMinute - b.startMinute);
    for (let index = 1; index < normalized.length; index += 1) {
      const previous = normalized[index - 1];
      const overlaps = instantMode
        ? previous.endEpoch === null || normalized[index].startEpoch < previous.endEpoch
        : previous.endMinute === null || normalized[index].startMinute < previous.endMinute;
      if (overlaps) {
        throw domainError("OVERLAPPING_BREAKS", "Break intervals cannot overlap.");
      }
    }
    return normalized;
  }

  function calculateDailyAttendance(input) {
    const data = input || {};
    const dateKey = parseDateKey(data.date).text;
    const scheduled = normalizeInterval(dateKey, data.scheduledStart, data.scheduledEnd);
    const requiredMinutesRaw = nonNegative(data.requiredWorkMinutes, "required work minutes");
    const sessionInputs = Array.isArray(data.sessions) && data.sessions.length
      ? data.sessions
      : [{
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        checkInAt: data.checkInAt,
        checkOutAt: data.checkOutAt
      }];
    const instantMode = sessionInputs.some((session) => session && (session.checkInAt || session.checkOutAt));
    if (sessionInputs.some((session) => !!(session && (session.checkInAt || session.checkOutAt)) !== instantMode)) {
      throw domainError("MIXED_TIME_FORMAT", "All attendance sessions must use the same time format.");
    }
    const sessions = sessionInputs.map((session, index) => {
      if (instantMode) {
        if (!session || !session.checkInAt || !session.checkOutAt) {
          throw domainError("INCOMPLETE_ATTENDANCE", "Every attendance session requires check-in and check-out timestamps.");
        }
        const started = parseIsoInstant(session.checkInAt);
        const ended = parseIsoInstant(session.checkOutAt);
        if (ended.epochMilliseconds <= started.epochMilliseconds) {
          throw domainError("INVALID_ATTENDANCE_DURATION", "Attendance check-out must be after check-in.");
        }
        const minutes = (ended.epochMilliseconds - started.epochMilliseconds) / 60000;
        if (minutes > 1440) throw domainError("ATTENDANCE_TOO_LONG", "An attendance session cannot exceed 24 hours.");
        return {
          index,
          startMinute: started.civilMinute,
          endMinute: ended.civilMinute,
          startEpoch: started.epochMilliseconds,
          endEpoch: ended.epochMilliseconds,
          minutes
        };
      }
      if (!session || !session.checkIn || !session.checkOut) {
        throw domainError("INCOMPLETE_ATTENDANCE", "Every attendance session requires check-in and check-out.");
      }
      if (parseClock(session.checkIn) === parseClock(session.checkOut)) {
        throw domainError("ZERO_DURATION_INTERVAL", "Attendance check-in and check-out cannot be equal.");
      }
      const startMinute = timelineMinute(dateKey, session.checkIn, scheduled.startMinute - 720);
      let endMinute = timelineMinute(dateKey, session.checkOut, startMinute);
      if (endMinute <= startMinute) endMinute += 1440;
      if (endMinute - startMinute > 1440) {
        throw domainError("ATTENDANCE_TOO_LONG", "An attendance session cannot exceed 24 hours.");
      }
      return { index, startMinute, endMinute, minutes: endMinute - startMinute };
    }).sort((a, b) => instantMode ? a.startEpoch - b.startEpoch : a.startMinute - b.startMinute);
    for (let index = 1; index < sessions.length; index += 1) {
      const overlaps = instantMode
        ? sessions[index].startEpoch < sessions[index - 1].endEpoch
        : sessions[index].startMinute < sessions[index - 1].endMinute;
      if (overlaps) {
        throw domainError("OVERLAPPING_ATTENDANCE_SESSIONS", "Attendance sessions cannot overlap.");
      }
    }
    const checkInMinute = sessions[0].startMinute;
    const checkOutMinute = sessions[sessions.length - 1].endMinute;
    const policy = data.policy || {};
    const breaks = validateBreaks(data.breaks, sessions, {
      dateKey,
      allowOpenBreak: false,
      maximumSingleBreakMinutes: policy.maximumSingleBreakMinutes
    });
    const presenceMinutesRaw = sessions.reduce((total, session) => total + session.minutes, 0);
    const actualBreakMinutesRaw = breaks.reduce((total, item) => total + item.minutes, 0);
    const workedMinutesRaw = Math.max(0, presenceMinutesRaw - actualBreakMinutesRaw);
    const allowedBreakMinutes = nonNegative(policy.allowedBreakMinutes || 0, "allowed break minutes");
    const breakGrace = nonNegative(policy.breakGraceMinutes || 0, "break grace minutes");
    const excessContributes = policy.excessBreakContributesToDeficit !== false;
    const paidBreakCreditMinutesRaw = String(policy.breakPaymentType || "UNPAID").toUpperCase() === "PAID"
      ? Math.min(actualBreakMinutesRaw, excessContributes
        ? allowedBreakMinutes + breakGrace
        : actualBreakMinutesRaw)
      : 0;
    const creditedWorkMinutesRaw = workedMinutesRaw + paidBreakCreditMinutesRaw;
    const excessBreakMinutesRaw = Math.max(0, actualBreakMinutesRaw - allowedBreakMinutes - breakGrace);
    const lateBeforeGrace = Math.max(0, checkInMinute - scheduled.startMinute);
    const earlyBeforeGrace = Math.max(0, scheduled.endMinute - checkOutMinute);
    const lateGrace = nonNegative(policy.graceLateMinutes || 0, "late grace minutes");
    const earlyGrace = nonNegative(policy.graceEarlyLeaveMinutes || 0, "early-leave grace minutes");
    const lateMinutesRaw = applyGrace(lateBeforeGrace, lateGrace);
    const earlyLeaveMinutesRaw = applyGrace(earlyBeforeGrace, earlyGrace);
    const forgivenMinutes = (lateBeforeGrace <= lateGrace ? lateBeforeGrace : 0) +
      (earlyBeforeGrace <= earlyGrace ? earlyBeforeGrace : 0);
    const deficitMinutesRaw = Math.max(0, requiredMinutesRaw - creditedWorkMinutesRaw - forgivenMinutes);
    const rawOvertimeMinutesRaw = Math.max(0, creditedWorkMinutesRaw - requiredMinutesRaw);
    const increment = nonNegative(policy.roundingIncrementMinutes || 0, "rounding increment");
    const mode = String(policy.roundingMode || "NONE").toUpperCase();
    const rounded = (value) => roundMinutes(value, increment, mode);
    return Object.freeze({
      calculationVersion: CALCULATION_VERSION,
      date: dateKey,
      scheduledStartMinute: scheduled.startMinute,
      scheduledEndMinute: scheduled.endMinute,
      checkInMinute,
      checkOutMinute,
      presenceMinutesRaw,
      actualBreakMinutesRaw,
      paidBreakCreditMinutesRaw,
      workedMinutesRaw,
      creditedWorkMinutesRaw,
      requiredMinutesRaw,
      lateMinutesRaw,
      earlyLeaveMinutesRaw,
      excessBreakMinutesRaw,
      deficitMinutesRaw,
      rawOvertimeMinutesRaw,
      presenceMinutes: rounded(presenceMinutesRaw),
      actualBreakMinutes: rounded(actualBreakMinutesRaw),
      paidBreakCreditMinutes: rounded(paidBreakCreditMinutesRaw),
      workedMinutes: rounded(workedMinutesRaw),
      creditedWorkMinutes: rounded(creditedWorkMinutesRaw),
      requiredMinutes: rounded(requiredMinutesRaw),
      lateMinutes: rounded(lateMinutesRaw),
      earlyLeaveMinutes: rounded(earlyLeaveMinutesRaw),
      excessBreakMinutes: rounded(excessBreakMinutesRaw),
      deficitMinutes: rounded(deficitMinutesRaw),
      rawOvertimeMinutes: rounded(rawOvertimeMinutesRaw),
      attendanceSessions: sessions,
      breakIntervals: breaks
    });
  }

  function resolveEffectivePolicy(policies, staffId, dateKey) {
    const date = parseDateKey(dateKey).text;
    const employeeId = String(staffId || "").trim();
    if (!employeeId) throw domainError("STAFF_ID_REQUIRED", "A stable staff ID is required.");
    const active = (Array.isArray(policies) ? policies : []).filter((item) => {
      if (!item || item.active === false) return false;
      const from = item.effectiveFrom ? parseDateKey(item.effectiveFrom).text : "0000-01-01";
      const to = item.effectiveTo ? parseDateKey(item.effectiveTo).text : "9999-12-31";
      if (from > to) throw domainError("INVALID_POLICY_RANGE", "Policy effective-from cannot be after effective-to.");
      return from <= date && to >= date;
    });
    const employee = active.filter((item) => String(item.staffId || "").trim() === employeeId);
    const defaults = active.filter((item) => !String(item.staffId || "").trim());
    if (employee.length > 1 || defaults.length > 1) {
      throw domainError("OVERLAPPING_EFFECTIVE_POLICIES", "More than one policy applies at the same precedence.");
    }
    const selected = employee[0] || defaults[0];
    if (!selected) throw domainError("POLICY_NOT_FOUND", "No effective work policy was found.");
    return Object.freeze({
      source: employee.length ? "EMPLOYEE" : "ORGANIZATION_DEFAULT",
      policyId: String(selected.policyId || ""),
      effectiveDate: date,
      snapshot: deepFreeze(JSON.parse(JSON.stringify(selected)))
    });
  }

  function calculateDeficitValue(options) {
    const data = options || {};
    const minutes = nonNegative(data.approvedDeficitMinutes, "approved deficit minutes");
    const rate = nonNegative(data.deficitRatePerHour, "deficit rate per hour");
    let valueMinor = minuteRateMinorUnits(minutes, rate, 1);
    const fixedPenalty = nonNegative(data.fixedLatePenalty || 0, "fixed late penalty");
    if (minutes > 0) valueMinor += moneyMinorUnits(fixedPenalty);
    const cap = finiteNumber(data.dailyMaximumDeduction, 0);
    if (cap > 0) valueMinor = Math.min(valueMinor, moneyMinorUnits(cap));
    return valueMinor / 100;
  }

  function calculateDayValue(options) {
    const data = options || {};
    const method = String(data.method || "").toUpperCase();
    if (method === "FIXED_DAY_VALUE") return roundMoney(nonNegative(data.fixedDayValue, "fixed day value"));
    if (method === "MONTHLY_SALARY_DIVIDED_BY_CALENDAR_DAYS") {
      return roundMoney(nonNegative(data.monthlySalary, "monthly salary") / positive(data.calendarDays, "calendar days"));
    }
    if (method === "MONTHLY_SALARY_DIVIDED_BY_WORKING_DAYS") {
      return roundMoney(nonNegative(data.monthlySalary, "monthly salary") / positive(data.workingDays, "working days"));
    }
    if (method === "REQUIRED_DAILY_HOURS_AT_HOURLY_RATE") {
      return roundMoney(nonNegative(data.requiredDailyMinutes, "required daily minutes") / 60 *
        nonNegative(data.hourlyRate, "hourly rate"));
    }
    throw domainError("INVALID_DAY_VALUE_METHOD", "Unsupported day-value method.");
  }

  function calculateLeaveAllowance(options) {
    const data = options || {};
    const base = nonNegative(data.allowedLeaveDays || 0, "allowed leave days");
    const carry = data.carryForwardEnabled
      ? Math.min(nonNegative(data.carriedDays || 0, "carried days"),
        nonNegative(data.maximumCarryForwardDays === undefined ? data.carriedDays || 0 : data.maximumCarryForwardDays,
          "maximum carry-forward days"))
      : 0;
    const proration = data.prorationFactor === undefined ? 1 : finiteNumber(data.prorationFactor, NaN);
    if (!Number.isFinite(proration) || proration < 0 || proration > 1) {
      throw domainError("INVALID_PRORATION", "Proration factor must be between zero and one.");
    }
    const allowedLeaveDays = Math.round((base * proration + carry) * 1000) / 1000;
    const consumingTypes = new Set((data.consumingLeaveTypes || [
      "APPROVED_LEAVE", "UNPAID_LEAVE", "SICK_LEAVE", "ABSENT", "PARTIAL_ABSENCE"
    ]).map(String));
    const exemptTypes = new Set((data.exemptLeaveTypes || ["DAY_OFF"]).map(String));
    const entries = Array.isArray(data.entries) ? data.entries : [];
    const chargeableAbsenceDays = Math.max(0, entries.reduce((total, entry) => {
      const type = String(entry.type || "");
      const status = String(entry.status || "APPROVED").toUpperCase();
      if (exemptTypes.has(type) || !consumingTypes.has(type) || entry.approved === false ||
        ["REJECTED", "REVERSED", "CANCELLED"].indexOf(status) !== -1) return total;
      const units = entry.fraction !== undefined
        ? nonNegative(entry.fraction, "leave fraction")
        : (entry.minutes !== undefined
          ? nonNegative(entry.minutes, "leave minutes") / positive(entry.requiredDailyMinutes, "required daily minutes")
          : 1);
      const direction = String(entry.direction || "DEBIT").toUpperCase();
      if (["DEBIT", "CREDIT"].indexOf(direction) === -1) {
        throw domainError("INVALID_LEAVE_DIRECTION", "Leave ledger direction must be DEBIT or CREDIT.");
      }
      return total + (direction === "CREDIT" ? -units : units);
    }, 0));
    const usedAllowanceDays = Math.min(chargeableAbsenceDays, allowedLeaveDays);
    const excessAbsenceDays = Math.max(0, chargeableAbsenceDays - allowedLeaveDays);
    return Object.freeze({
      allowedLeaveDays,
      chargeableAbsenceDays: Math.round(chargeableAbsenceDays * 1000) / 1000,
      usedAllowanceDays: Math.round(usedAllowanceDays * 1000) / 1000,
      excessAbsenceDays: Math.round(excessAbsenceDays * 1000) / 1000
    });
  }

  function calculateEmploymentProration(options) {
    const data = options || {};
    const periodStart = parseDateKey(data.periodStart);
    const periodEnd = parseDateKey(data.periodEnd);
    if (periodEnd.epochDay < periodStart.epochDay) {
      throw domainError("INVALID_PERIOD", "Period end cannot be before period start.");
    }
    const hire = data.hireDate ? parseDateKey(data.hireDate) : periodStart;
    const termination = data.terminationDate ? parseDateKey(data.terminationDate) : periodEnd;
    const employedStart = Math.max(periodStart.epochDay, hire.epochDay);
    const employedEnd = Math.min(periodEnd.epochDay, termination.epochDay);
    const periodDays = periodEnd.epochDay - periodStart.epochDay + 1;
    const employedDays = Math.max(0, employedEnd - employedStart + 1);
    return Object.freeze({
      periodDays,
      employedDays,
      prorationFactor: Math.round(employedDays / periodDays * 1000000) / 1000000
    });
  }

  function resolveLeavePeriodKey(options) {
    const data = options || {};
    const date = parseDateKey(data.date).text;
    const reset = String(data.resetPeriod || "MONTHLY").toUpperCase();
    if (reset === "MONTHLY") return date.slice(0, 7);
    if (reset === "PAYROLL_PERIOD" || reset === "CUSTOM_PAYROLL_PERIOD") {
      const start = parseDateKey(data.periodStart).text;
      const end = parseDateKey(data.periodEnd).text;
      if (start > end || date < start || date > end) {
        throw domainError("DATE_OUTSIDE_LEAVE_PERIOD", "Date must fall inside the leave period.");
      }
      return `${start}/${end}`;
    }
    throw domainError("INVALID_LEAVE_RESET_PERIOD", "Unsupported leave reset period.");
  }

  function calculateExcessAbsenceDeduction(options) {
    const data = options || {};
    const policy = String(data.policy || "").toUpperCase();
    const days = nonNegative(data.excessAbsenceDays || 0, "excess absence days");
    const minutes = nonNegative(data.excessAbsenceMinutes || 0, "excess absence minutes");
    const multiplier = positive(data.multiplier === undefined ? 1 : data.multiplier, "multiplier");
    let valueMinor;
    if (policy === "DAY_VALUE_MULTIPLIER") {
      valueMinor = moneyMinorUnits(days * nonNegative(data.dayValue, "day value") * multiplier);
    } else if (policy === "FIXED_AMOUNT_PER_DAY") {
      valueMinor = moneyMinorUnits(days * nonNegative(data.fixedAmountPerDay, "fixed amount per day"));
    } else if (policy === "WORKING_HOURS_BASED") {
      valueMinor = minuteRateMinorUnits(minutes, data.deficitRatePerHour, multiplier);
    } else {
      throw domainError("INVALID_EXCESS_ABSENCE_POLICY", "Unsupported excess-absence policy.");
    }
    const cap = finiteNumber(data.periodMaximumDeduction, 0);
    if (cap > 0) valueMinor = Math.min(valueMinor, moneyMinorUnits(cap));
    return valueMinor / 100;
  }

  function settleOvertime(options) {
    const data = options || {};
    const mode = String(data.mode || "").toUpperCase();
    if (OVERTIME_MODES.indexOf(mode) === -1) {
      throw domainError("INVALID_OVERTIME_MODE", "Unsupported overtime mode.");
    }
    const deficitMinutes = nonNegative(data.deficitMinutes || 0, "deficit minutes");
    const dailyEntries = Array.isArray(data.dailyApprovedOvertimeMinutes)
      ? data.dailyApprovedOvertimeMinutes
      : null;
    const threshold = nonNegative(data.minimumThresholdMinutes || 0, "minimum overtime threshold");
    const dailyCap = finiteNumber(data.dailyCapMinutes, 0);
    const periodCap = finiteNumber(data.periodCapMinutes, 0);
    let overtimeMinutes;
    if (data.approved === false) {
      overtimeMinutes = 0;
    } else if (dailyEntries) {
      overtimeMinutes = dailyEntries.reduce((total, value) => {
        let dailyMinutes = nonNegative(value, "daily approved overtime minutes");
        if (dailyMinutes < threshold) dailyMinutes = 0;
        if (dailyCap > 0) dailyMinutes = Math.min(dailyMinutes, dailyCap);
        return total + dailyMinutes;
      }, 0);
    } else {
      overtimeMinutes = nonNegative(data.approvedOvertimeMinutes || 0, "approved overtime minutes");
      if (overtimeMinutes < threshold) overtimeMinutes = 0;
      if (dailyCap > 0) overtimeMinutes = Math.min(overtimeMinutes, dailyCap);
    }
    if (periodCap > 0) overtimeMinutes = Math.min(overtimeMinutes, periodCap);
    const deficitRate = nonNegative(data.deficitRatePerHour || 0, "deficit rate");
    const overtimeRate = nonNegative(data.overtimeRatePerHour || 0, "overtime rate");
    const multiplier = positive(data.overtimeMultiplier === undefined ? 1 : data.overtimeMultiplier, "overtime multiplier");
    const grossDeficitMinor = minuteRateMinorUnits(deficitMinutes, deficitRate, 1);
    const grossOvertimeMinor = mode === "NO_OVERTIME"
      ? 0
      : minuteRateMinorUnits(overtimeMinutes, overtimeRate, multiplier);
    let deficitMinor = grossDeficitMinor;
    let overtimeMinor = grossOvertimeMinor;
    let offsetMinor = 0;
    if (mode === "OFFSET_DEFICIT_ONLY" || mode === "OFFSET_THEN_PAY") {
      offsetMinor = Math.min(deficitMinor, overtimeMinor);
      deficitMinor -= offsetMinor;
      overtimeMinor = mode === "OFFSET_THEN_PAY" ? overtimeMinor - offsetMinor : 0;
    }
    if (mode === "NO_OVERTIME") overtimeMinor = 0;
    return Object.freeze({
      mode,
      approvedOvertimeMinutes: overtimeMinutes,
      grossDeficitValueMinor: grossDeficitMinor,
      grossOvertimeValueMinor: grossOvertimeMinor,
      offsetValueMinor: offsetMinor,
      deficitValueMinor: deficitMinor,
      overtimeValueMinor: overtimeMinor,
      netValueMinor: overtimeMinor - deficitMinor,
      grossDeficitValue: grossDeficitMinor / 100,
      grossOvertimeValue: grossOvertimeMinor / 100,
      offsetValue: offsetMinor / 100,
      deficitValue: deficitMinor / 100,
      overtimeValue: overtimeMinor / 100,
      netValue: (overtimeMinor - deficitMinor) / 100
    });
  }

  function validateOverride(override) {
    const item = override || {};
    const type = String(item.type || "").toUpperCase();
    if (OVERRIDE_TYPES.indexOf(type) === -1) throw domainError("INVALID_OVERRIDE_TYPE", "Unsupported override type.");
    parseDateKey(item.date);
    if (type === "CUSTOM_SHIFT") {
      if (!item.shiftStart || !item.shiftEnd) throw domainError("CUSTOM_SHIFT_REQUIRES_TIMES", "Custom shift requires start and end.");
      normalizeInterval(item.date, item.shiftStart, item.shiftEnd);
      nonNegative(item.requiredWorkMinutes, "required work minutes");
    }
    if (type === "PLANNED_BREAK" || type === "PARTIAL_ABSENCE") {
      if (!item.blockStart || !item.blockEnd) throw domainError("BLOCK_REQUIRES_TIMES", "Interval override requires block start and end.");
      normalizeInterval(item.date, item.blockStart, item.blockEnd);
    }
    return Object.freeze({ ...item, type });
  }

  function resolveEffectiveSchedule(options) {
    const data = options || {};
    const date = parseDateKey(data.date);
    const staffId = String(data.staffId || "").trim();
    if (!staffId) throw domainError("STAFF_ID_REQUIRED", "A stable staff ID is required.");
    const approved = (data.overrides || [])
      .map(validateOverride)
      .filter((item) => String(item.staffId || "").trim() === staffId &&
        item.date === date.text && String(item.status || "APPROVED").toUpperCase() === "APPROVED");
    const fullDays = approved.filter((item) => BLOCKING_OVERRIDE_TYPES.indexOf(item.type) !== -1);
    if (fullDays.length > 1) {
      throw domainError("CONFLICTING_FULL_DAY_OVERRIDES", "Only one approved full-day override may apply to an employee date.");
    }
    if (fullDays.length) {
      return Object.freeze({ available: false, source: "OVERRIDE", reason: fullDays[0].type, segments: [], blocks: [] });
    }
    const custom = approved.filter((item) => item.type === "CUSTOM_SHIFT");
    const weekday = date.epochDay % 7 < 0 ? (date.epochDay % 7) + 7 : date.epochDay % 7;
    const weekdayName = ["THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY"][weekday];
    const recurring = (data.schedules || []).filter((item) => {
      const effectiveFrom = item.effectiveFrom ? parseDateKey(item.effectiveFrom).text : "";
      const effectiveTo = item.effectiveTo ? parseDateKey(item.effectiveTo).text : "";
      if (effectiveFrom && effectiveTo && effectiveFrom > effectiveTo) {
        throw domainError("INVALID_SCHEDULE_RANGE", "Schedule effective-from cannot be after effective-to.");
      }
      return String(item.staffId || "").trim() === staffId &&
        String(item.weekday || "").toUpperCase() === weekdayName &&
        item.active !== false &&
        (!effectiveFrom || effectiveFrom <= date.text) &&
        (!effectiveTo || effectiveTo >= date.text);
    });
    const sourceRows = custom.length ? custom : recurring;
    const segments = sourceRows.map((item) => ({
      id: item.overrideId || item.scheduleId || "",
      start: item.shiftStart,
      end: item.shiftEnd,
      requiredWorkMinutes: item.requiredWorkMinutes === undefined || item.requiredWorkMinutes === ""
        ? null
        : nonNegative(item.requiredWorkMinutes, "required work minutes"),
      allowedBreakMinutes: item.allowedBreakMinutes === undefined || item.allowedBreakMinutes === ""
        ? null
        : nonNegative(item.allowedBreakMinutes, "allowed break minutes")
    })).sort((a, b) => parseClock(a.start) - parseClock(b.start));
    for (let index = 1; index < segments.length; index += 1) {
      const previous = normalizeInterval(date.text, segments[index - 1].start, segments[index - 1].end);
      const current = normalizeInterval(date.text, segments[index].start, segments[index].end, previous.startMinute);
      if (current.startMinute < previous.endMinute) throw domainError("OVERLAPPING_SHIFT_SEGMENTS", "Shift segments cannot overlap.");
    }
    const blocks = approved.filter((item) => ["PLANNED_BREAK", "PARTIAL_ABSENCE", "TRAINING"].indexOf(item.type) !== -1)
      .map((item) => ({ type: item.type, start: item.blockStart, end: item.blockEnd, id: item.overrideId || "" }));
    return Object.freeze({
      available: segments.length > 0,
      source: custom.length ? "OVERRIDE" : "RECURRING",
      reason: segments.length ? "" : "NOT_SCHEDULED",
      segments,
      blocks
    });
  }

  function resolveRequiredWorkMinutes(effectiveSchedule, policyResolution) {
    const schedule = effectiveSchedule || {};
    const segments = Array.isArray(schedule.segments) ? schedule.segments : [];
    if (!schedule.available || !segments.length) return 0;
    const specified = segments.filter((segment) => segment.requiredWorkMinutes !== null &&
      segment.requiredWorkMinutes !== undefined);
    if (specified.length && specified.length !== segments.length) {
      throw domainError("PARTIAL_REQUIRED_MINUTES", "Required minutes must be set for every segment or inherited entirely from policy.");
    }
    if (specified.length) return specified.reduce((total, segment) => total + nonNegative(segment.requiredWorkMinutes), 0);
    const snapshot = policyResolution && policyResolution.snapshot
      ? policyResolution.snapshot
      : (policyResolution || {});
    return nonNegative(snapshot.requiredDailyMinutes, "policy required daily minutes");
  }

  function transitionAttendanceState(record, eventInput) {
    const current = record || { state: STATES.NOT_STARTED, breaks: [], history: [] };
    const event = eventInput || {};
    const type = String(event.type || "").toUpperCase();
    const state = String(current.state || STATES.NOT_STARTED).toUpperCase();
    const permission = String(event.permission || "");
    if (!event.timestamp || !event.actorId || !event.requestId) {
      throw domainError("AUDIT_CONTEXT_REQUIRED", "Timestamp, actor ID, and request ID are required.");
    }
    if (!/(Z|[+-]\d{2}:\d{2})$/.test(String(event.timestamp)) || !Number.isFinite(Date.parse(event.timestamp))) {
      throw domainError("INVALID_EVENT_TIMESTAMP", "Event timestamp must be an ISO instant with an explicit offset.");
    }
    const eventFingerprint = requestFingerprint(type, event.actorId, {
      staffId: current.staffId || "",
      timestamp: event.timestamp,
      reason: event.reason || "",
      sourceEntityType: event.sourceEntityType || "",
      sourceEntityId: event.sourceEntityId || "",
      reopenToState: event.reopenToState || "",
      autoCloseOpenBreak: event.autoCloseOpenBreak === true
    });
    const existingRequest = (current.history || []).find((item) => item.requestId === String(event.requestId));
    if (existingRequest) {
      if (existingRequest.requestFingerprint !== eventFingerprint) {
        throw domainError("IDEMPOTENCY_KEY_REUSED", "Request ID was already used with different attendance input.");
      }
      return Object.freeze({ ...current, idempotentReplay: true });
    }
    const priorAction = current.history && current.history[current.history.length - 1];
    if (priorAction && Date.parse(event.timestamp) < Date.parse(priorAction.timestamp)) {
      throw domainError("EVENT_TIME_REGRESSION", "Attendance events must be appended in timestamp order.");
    }
    let nextState;
    let breaks = (current.breaks || []).map((item) => ({ ...item }));
    const warnings = [];
    const selfAction = permission === "attendance.self_action" &&
      String(event.actorStaffId || "").trim() &&
      String(event.actorStaffId || "").trim() === String(current.staffId || "").trim();
    const canOperate = selfAction || permission === "attendance.manage";
    if ([EVENTS.CHECK_IN, EVENTS.START_BREAK, EVENTS.END_BREAK, EVENTS.CHECK_OUT].indexOf(type) !== -1 &&
        !canOperate) {
      throw domainError("PERMISSION_DENIED", "The actor cannot perform this attendance action.");
    }
    if (permission === "attendance.manage" && !selfAction &&
      [EVENTS.CHECK_IN, EVENTS.START_BREAK, EVENTS.END_BREAK, EVENTS.CHECK_OUT].indexOf(type) !== -1 &&
      !String(event.reason || "").trim()) {
      throw domainError("REASON_REQUIRED", "Manager-created attendance actions require a reason.");
    }
    if (type === EVENTS.CHECK_IN && state === STATES.NOT_STARTED) nextState = STATES.CHECKED_IN;
    else if (type === EVENTS.START_BREAK && state === STATES.CHECKED_IN) {
      nextState = STATES.ON_BREAK;
      breaks.push({ startedAt: event.timestamp, endedAt: "" });
    } else if (type === EVENTS.END_BREAK && state === STATES.ON_BREAK) {
      nextState = STATES.CHECKED_IN;
      breaks[breaks.length - 1].endedAt = event.timestamp;
    } else if (type === EVENTS.CHECK_OUT && state === STATES.CHECKED_IN) nextState = STATES.CHECKED_OUT;
    else if (type === EVENTS.CHECK_OUT && state === STATES.ON_BREAK && event.autoCloseOpenBreak === true &&
      ["attendance.manage", "attendance.correct"].indexOf(permission) !== -1 &&
      String(event.reason || "").trim()) {
      breaks[breaks.length - 1].endedAt = event.timestamp;
      nextState = STATES.CHECKED_OUT;
      warnings.push("OPEN_BREAK_AUTO_CLOSED");
    } else if (type === EVENTS.MARK_ABSENT && state === STATES.NOT_STARTED &&
      permission === "attendance.manage" && String(event.reason || "").trim()) {
      nextState = STATES.ABSENT;
    } else if (type === EVENTS.APPROVE_LEAVE && state === STATES.NOT_STARTED &&
      permission === "leave.approve" && String(event.reason || "").trim() &&
      String(event.sourceEntityType || "") === "STAFF_SCHEDULE_OVERRIDE" &&
      String(event.sourceEntityId || "").trim()) {
      nextState = STATES.LEAVE;
    } else if (type === EVENTS.REOPEN && [STATES.CHECKED_OUT, STATES.ABSENT, STATES.LEAVE].indexOf(state) !== -1 &&
      permission === "attendance.correct" && String(event.reason || "").trim()) {
      const defaultReopenState = state === STATES.CHECKED_OUT ? STATES.CHECKED_IN : STATES.NOT_STARTED;
      nextState = String(event.reopenToState || defaultReopenState).toUpperCase();
      if ([STATES.NOT_STARTED, STATES.CHECKED_IN].indexOf(nextState) === -1) {
        throw domainError("INVALID_REOPEN_STATE", "A reopened day must return to NOT_STARTED or CHECKED_IN.");
      }
    } else if (type === EVENTS.CANCEL_LAST_ACTION && permission === "attendance.correct" &&
      String(event.reason || "").trim() && current.history && current.history.length) {
      const last = current.history[current.history.length - 1];
      nextState = last.beforeState;
      if (last.type === EVENTS.START_BREAK) breaks.pop();
      if (last.type === EVENTS.END_BREAK && breaks.length) breaks[breaks.length - 1].endedAt = "";
    } else {
      throw domainError("INVALID_ATTENDANCE_TRANSITION", `Cannot apply ${type || "UNKNOWN"} while attendance is ${state}.`);
    }
    const action = Object.freeze({
      actionId: String(event.actionId || event.requestId),
      type,
      actorId: String(event.actorId),
      actorName: String(event.actorName || ""),
      actorRole: String(event.actorRole || ""),
      timestamp: String(event.timestamp),
      requestId: String(event.requestId),
      requestFingerprint: eventFingerprint,
      reason: String(event.reason || ""),
      sourceEntityType: String(event.sourceEntityType || ""),
      sourceEntityId: String(event.sourceEntityId || ""),
      beforeState: state,
      afterState: nextState,
      warnings
    });
    return Object.freeze({
      ...current,
      idempotentReplay: false,
      state: nextState,
      checkInAt: type === EVENTS.CHECK_IN
        ? event.timestamp
        : (type === EVENTS.CANCEL_LAST_ACTION && current.history[current.history.length - 1].type === EVENTS.CHECK_IN
          ? "" : current.checkInAt),
      checkOutAt: type === EVENTS.CHECK_OUT
        ? event.timestamp
        : (type === EVENTS.CANCEL_LAST_ACTION && current.history[current.history.length - 1].type === EVENTS.CHECK_OUT
          ? "" : current.checkOutAt),
      breaks,
      history: Object.freeze([...(current.history || []), action]),
      lastAction: action
    });
  }

  function reviewOvertime(record, decision) {
    const current = record || {};
    const input = decision || {};
    if (String(input.permission || "") !== "attendance.approve_overtime") {
      throw domainError("PERMISSION_DENIED", "Overtime approval permission is required.");
    }
    const status = String(input.status || "").toUpperCase();
    if (["APPROVED", "REJECTED"].indexOf(status) === -1) {
      throw domainError("INVALID_OVERTIME_DECISION", "Overtime must be approved or rejected.");
    }
    if (!input.actorId || !input.timestamp || !input.requestId) {
      throw domainError("AUDIT_CONTEXT_REQUIRED", "Overtime review requires complete audit context.");
    }
    const raw = nonNegative(current.rawOvertimeMinutes || 0, "raw overtime minutes");
    const approved = status === "APPROVED"
      ? Math.min(raw, nonNegative(input.approvedMinutes === undefined ? raw : input.approvedMinutes, "approved overtime minutes"))
      : 0;
    return Object.freeze({
      ...current,
      approvedOvertimeMinutes: approved,
      overtimeApprovalStatus: status,
      overtimeReviewedBy: String(input.actorId),
      overtimeReviewedAt: String(input.timestamp),
      lastRequestId: String(input.requestId)
    });
  }

  function reviewAdjustment(record, decision) {
    const current = record || {};
    const input = decision || {};
    if (String(input.permission || "") !== "attendance.approve_adjustment") {
      throw domainError("PERMISSION_DENIED", "Attendance adjustment approval permission is required.");
    }
    const status = String(input.status || "").toUpperCase();
    if (String(current.status || "PENDING").toUpperCase() !== "PENDING" ||
      ["APPROVED", "REJECTED"].indexOf(status) === -1) {
      throw domainError("INVALID_ADJUSTMENT_DECISION", "Only pending adjustments can be approved or rejected.");
    }
    if (!input.actorId || !input.timestamp || !input.requestId || !String(input.reason || "").trim()) {
      throw domainError("AUDIT_CONTEXT_REQUIRED", "Adjustment review requires actor, timestamp, request ID, and reason.");
    }
    if (String(current.requestedBy || "") &&
      String(current.requestedBy) === String(input.actorId)) {
      throw domainError("SELF_APPROVAL_FORBIDDEN", "An adjustment requester cannot approve their own adjustment.");
    }
    return Object.freeze({
      ...current,
      status,
      finalState: status === "APPROVED" ? JSON.parse(JSON.stringify(current.proposedState || {})) : current.beforeState,
      reviewedBy: String(input.actorId),
      reviewedAt: String(input.timestamp),
      reviewNote: String(input.reason),
      requestId: String(input.requestId)
    });
  }

  function calculateSettlement(options) {
    const data = options || {};
    if (data.locked) throw domainError("SETTLEMENT_LOCKED", "A locked settlement cannot be recalculated.");
    const overtime = settleOvertime(data.overtime || {});
    const excessDeduction = calculateExcessAbsenceDeduction(data.excessAbsence || {});
    const manualMinor = moneyMinorUnits(data.manualAdjustments || 0);
    const excessDeductionMinor = moneyMinorUnits(excessDeduction);
    const netMinor = overtime.overtimeValueMinor - overtime.deficitValueMinor -
      excessDeductionMinor + manualMinor;
    return Object.freeze({
      calculationVersion: CALCULATION_VERSION,
      requiredMinutes: nonNegative(data.requiredMinutes || 0, "required minutes"),
      workedMinutes: nonNegative(data.workedMinutes || 0, "worked minutes"),
      deficitMinutes: nonNegative((data.overtime || {}).deficitMinutes || 0, "deficit minutes"),
      rawOvertimeMinutes: nonNegative(data.rawOvertimeMinutes || 0, "raw overtime minutes"),
      approvedOvertimeMinutes: overtime.approvedOvertimeMinutes,
      deficitValue: overtime.deficitValue,
      overtimeValue: overtime.overtimeValue,
      overtimeValueMinor: overtime.overtimeValueMinor,
      excessAbsenceDeduction: excessDeduction,
      excessAbsenceDeductionMinor: excessDeductionMinor,
      deficitValueMinor: overtime.deficitValueMinor,
      manualAdjustments: manualMinor / 100,
      manualAdjustmentsMinor: manualMinor,
      netAttendanceAdjustment: netMinor / 100,
      netAttendanceAdjustmentMinor: netMinor,
      policySnapshot: deepFreeze(JSON.parse(JSON.stringify(data.policySnapshot || {})))
    });
  }

  function lockSettlement(settlement, command) {
    const current = settlement || {};
    const input = command || {};
    if (String(input.permission || "") !== "payroll_settlement.approve") {
      throw domainError("PERMISSION_DENIED", "Payroll settlement approval permission is required.");
    }
    if (current.locked) throw domainError("SETTLEMENT_LOCKED", "Settlement is already locked.");
    if (String(current.status || "").toUpperCase() !== "APPROVED") {
      throw domainError("SETTLEMENT_NOT_APPROVED", "Only an approved settlement can be locked.");
    }
    if (!input.actorId || !input.timestamp || !input.requestId) {
      throw domainError("AUDIT_CONTEXT_REQUIRED", "Settlement locking requires complete audit context.");
    }
    return Object.freeze({
      ...current,
      locked: true,
      lockedAt: String(input.timestamp),
      lockedBy: String(input.actorId),
      lastRequestId: String(input.requestId)
    });
  }

  function reopenSettlement(settlement, command) {
    const current = settlement || {};
    const input = command || {};
    if (String(input.permission || "") !== "payroll_settlement.approve") {
      throw domainError("PERMISSION_DENIED", "Payroll settlement approval permission is required.");
    }
    if (!current.locked) throw domainError("SETTLEMENT_NOT_LOCKED", "Only a locked settlement can be reopened.");
    if (!input.actorId || !input.timestamp || !input.requestId || !String(input.reason || "").trim()) {
      throw domainError("AUDIT_CONTEXT_REQUIRED", "Reopening requires actor, timestamp, request ID, and reason.");
    }
    return Object.freeze({
      ...current,
      locked: false,
      status: "REOPENED",
      reopenedAt: String(input.timestamp),
      reopenedBy: String(input.actorId),
      reopenReason: String(input.reason),
      lastRequestId: String(input.requestId)
    });
  }

  function executeLockedMutation(lock, timeoutMilliseconds, mutation) {
    if (!lock || typeof lock.tryLock !== "function" || typeof lock.releaseLock !== "function") {
      throw domainError("LOCK_REQUIRED", "A mutation lock is required.");
    }
    if (typeof mutation !== "function") throw domainError("MUTATION_REQUIRED", "A mutation function is required.");
    if (!lock.tryLock(nonNegative(timeoutMilliseconds || 0, "lock timeout"))) {
      throw domainError("LOCK_TIMEOUT", "The attendance mutation is busy; retry safely with the same request ID.");
    }
    try {
      return mutation();
    } finally {
      lock.releaseLock();
    }
  }

  function canonicalHeader(value) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, "_")
      .replace(/_+/g, "_");
  }

  function normalizeLegacyAttendanceRow(row, headers) {
    const values = Array.isArray(row) ? row : [];
    const names = Array.isArray(headers) ? headers.map(canonicalHeader) : [];
    const value = (header) => {
      const index = names.indexOf(canonicalHeader(header));
      return index >= 0 ? values[index] : "";
    };
    for (const required of schema.LEGACY_ATTENDANCE_HEADERS) {
      if (names.indexOf(canonicalHeader(required)) === -1) {
        throw domainError("INCOMPATIBLE_EXISTING_SCHEMA", `Legacy attendance header is missing: ${required}`);
      }
    }
    return Object.freeze({
      compatibilityStatus: "LEGACY_UNMIGRATED",
      id: String(value("ID") || "").trim(),
      date: value("DATE") ? parseDateKey(String(value("DATE")).slice(0, 10)).text : "",
      staffId: String(value("STAFF_ID") || "").trim(),
      staffNameSnapshot: String(value("STAFF_NAME") || "").trim(),
      recordType: String(value("RECORD_TYPE") || "work").trim(),
      checkInLegacy: String(value("CHECK_IN") || "").trim(),
      breakOutLegacy: String(value("BREAK_OUT") || "").trim(),
      breakInLegacy: String(value("BREAK_IN") || "").trim(),
      checkOutLegacy: String(value("CHECK_OUT") || "").trim(),
      workHoursLegacy: finiteNumber(value("WORK_HOURS"), 0),
      approvedDeductionLegacy: roundMoney(value("APPROVED_DEDUCTION")),
      approvalStatusLegacy: String(value("APPROVAL_STATUS") || "").trim(),
      readOnly: true
    });
  }

  function planSchemaMigration(existingSheets, identity) {
    const existing = existingSheets || {};
    const target = identity || {};
    const plan = {
      schemaVersion: schema.SCHEMA_VERSION,
      dryRun: true,
      writes: 0,
      identity: {
        environment: String(target.environment || ""),
        expectedSpreadsheetId: String(target.expectedSpreadsheetId || ""),
        actualSpreadsheetId: String(target.actualSpreadsheetId || "")
      },
      headerNormalization: "trim, uppercase, convert spaces/hyphens to underscores, collapse repeated underscores",
      createSheets: [],
      initializeBlankSheets: [],
      appendColumns: {},
      unchangedSheets: [],
      preservedUnknownColumns: {},
      errors: [],
      rollback: { createdSheets: [], appendedColumnRanges: [], historicalRowsTouched: 0 }
    };
    if (!plan.identity.environment || !plan.identity.expectedSpreadsheetId || !plan.identity.actualSpreadsheetId) {
      plan.errors.push({ code: "MIGRATION_IDENTITY_REQUIRED" });
    } else if (plan.identity.expectedSpreadsheetId !== plan.identity.actualSpreadsheetId) {
      plan.errors.push({ code: "SPREADSHEET_IDENTITY_MISMATCH" });
    }
    if (["production", "staging"].indexOf(plan.identity.environment.toLowerCase()) !== -1 &&
      target.environmentReviewApproved !== true) {
      plan.errors.push({ code: "ENVIRONMENT_NOT_APPROVED" });
    }
    Object.entries(schema.SHEET_SCHEMAS).forEach(([sheetName, desiredHeaders]) => {
      const current = Array.isArray(existing[sheetName]) ? existing[sheetName].map(canonicalHeader) : null;
      if (!current) {
        plan.createSheets.push({ sheetName, headers: [...desiredHeaders] });
        plan.rollback.createdSheets.push(sheetName);
        return;
      }
      const nonBlank = current.filter(Boolean);
      if (!nonBlank.length) {
        plan.initializeBlankSheets.push({ sheetName, headers: [...desiredHeaders] });
        return;
      }
      const duplicates = nonBlank.filter((header, index) => nonBlank.indexOf(header) !== index);
      if (duplicates.length) {
        plan.errors.push({ sheetName, code: "DUPLICATE_HEADERS", headers: [...new Set(duplicates)] });
        return;
      }
      const desiredSet = new Set(desiredHeaders.map(canonicalHeader));
      const conflictingLegacy = sheetName === "ATTENDANCE" &&
        schema.LEGACY_ATTENDANCE_HEADERS.some((header, index) => current[index] !== canonicalHeader(header));
      const conflictingSchedule = sheetName === "BARBER_SCHEDULE" &&
        schema.LEGACY_SCHEDULE_HEADERS.some((header, index) => current[index] !== canonicalHeader(header));
      if (conflictingLegacy || conflictingSchedule) {
        plan.errors.push({ sheetName, code: "INCOMPATIBLE_EXISTING_SCHEMA" });
        return;
      }
      const unknown = nonBlank.filter((header) => !desiredSet.has(header));
      if (unknown.length) plan.preservedUnknownColumns[sheetName] = unknown;
      const missing = [...desiredSet].filter((header) => !current.includes(header));
      if (missing.length) {
        plan.appendColumns[sheetName] = missing;
        plan.rollback.appendedColumnRanges.push({
          sheetName,
          startColumn: current.length + 1,
          endColumn: current.length + missing.length,
          headers: missing
        });
      }
      else plan.unchangedSheets.push(sheetName);
    });
    plan.safe = plan.errors.length === 0;
    return Object.freeze(plan);
  }

  function stableStringify(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }

  function requestFingerprint(action, actorId, payload) {
    const text = `${String(action || "")}|${String(actorId || "")}|${stableStringify(payload || {})}`;
    if (typeof Utilities !== "undefined" && Utilities.computeDigest) {
      const bytes = Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        text,
        Utilities.Charset.UTF_8
      );
      const hex = bytes.map((byte) => (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, "0")).join("");
      return `sha256:${hex}`;
    }
    if (typeof require === "function") {
      const crypto = require("node:crypto");
      return `sha256:${crypto.createHash("sha256").update(text, "utf8").digest("hex")}`;
    }
    throw domainError("SHA256_UNAVAILABLE", "A SHA-256 implementation is required for idempotency fingerprints.");
  }

  return Object.freeze({
    CALCULATION_VERSION,
    STATES,
    EVENTS,
    OVERRIDE_TYPES,
    OVERTIME_MODES,
    parseDateKey,
    parseClock,
    normalizeInterval,
    roundMinutes,
    calculateDailyAttendance,
    calculateDeficitValue,
    calculateDayValue,
    resolveEffectivePolicy,
    calculateLeaveAllowance,
    calculateEmploymentProration,
    resolveLeavePeriodKey,
    calculateExcessAbsenceDeduction,
    settleOvertime,
    validateOverride,
    resolveEffectiveSchedule,
    resolveRequiredWorkMinutes,
    transitionAttendanceState,
    reviewOvertime,
    reviewAdjustment,
    calculateSettlement,
    lockSettlement,
    reopenSettlement,
    executeLockedMutation,
    planSchemaMigration,
    normalizeLegacyAttendanceRow,
    requestFingerprint
  });
});

/* END staff-attendance-core.js */

/* BEGIN staff-scheduling-phase2.js */
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

  const PHASE2_VERSION = "STAFF_SCHEDULING_PHASE2_V2";
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
  const STAFF_LEGACY_HEADERS = Object.freeze([
    "NAME", "CODE", "SALARY", "PERCENTAGE", "ID", "BONUS", "DEDUCTION",
    "ACTIVE", "CREATED_AT", "UPDATED_AT", "IS_BARBER"
  ]);
  const PHASE2_SHEET_SCHEMAS = Object.freeze({
    STAFF: Object.freeze([...STAFF_LEGACY_HEADERS, "BRANCH_ID"]),
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
      if (sheetName === "STAFF" && STAFF_LEGACY_HEADERS.some((header, index) =>
        current[index] !== canonicalHeader(header))) {
        report.errors.push({ sheetName, code: "INCOMPATIBLE_STAFF_POSITIONAL_PREFIX" });
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
    PHASE2_SHEET_SCHEMAS, STAFF_LEGACY_HEADERS,
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

/* END staff-scheduling-phase2.js */

/* BEGIN staff-scheduling-phase2-gas.js */
/* global StaffSchedulingPhase2, SpreadsheetApp, LockService, Utilities, console,
  getAuthenticatedUser, normalizeManagedPermissions, getCutHubEnvironmentConfig, assertStagingEnvironment,
  readUsersFromSheet, jsonOutput */

/**
 * Google Apps Script adapter for Staff Scheduling Phase 2.
 *
 * This file never creates a sheet, writes headers, or runs a migration. All
 * mutations fail closed until the reviewed Phase 2 schema exists.
 */

function schedulePhase2Text(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function schedulePhase2Canonical(value) {
  return schedulePhase2Text(value).toUpperCase().replace(/[\s-]+/g, "_").replace(/_+/g, "_");
}

function schedulePhase2Camel(header) {
  return schedulePhase2Canonical(header).toLowerCase().replace(/_([a-z])/g, function (_match, letter) {
    return letter.toUpperCase();
  });
}

function schedulePhase2Sheet(name, required) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sheet && required) {
    var error = new Error("Required Phase 2 sheet is missing: " + name);
    error.code = "SCHEDULE_SCHEMA_NOT_READY";
    throw error;
  }
  return sheet;
}

function schedulePhase2Headers(sheet) {
  if (!sheet || sheet.getLastColumn() < 1) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(schedulePhase2Canonical);
}

function schedulePhase2AssertNoDuplicateHeaders(name, headers) {
  var duplicates = headers.filter(function (header, index) {
    return header && headers.indexOf(header) !== index;
  });
  if (duplicates.length) {
    var error = new Error("Duplicate normalized headers in " + name);
    error.code = "SCHEDULE_SCHEMA_DUPLICATE_HEADERS";
    error.details = { sheetName: name, headers: Array.from(new Set(duplicates)) };
    throw error;
  }
}

function schedulePhase2AssertHeaders(name, expected) {
  var sheet = schedulePhase2Sheet(name, true);
  var headers = schedulePhase2Headers(sheet);
  schedulePhase2AssertNoDuplicateHeaders(name, headers);
  if (name === "BARBER_SCHEDULE") {
    var legacyPrefix = [
      "SCHEDULE_ID", "STAFF_ID", "STAFF_NAME", "WEEKDAY",
      "SHIFT_START", "SHIFT_END", "ACTIVE", "UPDATED_AT"
    ];
    var displaced = legacyPrefix.some(function (header, index) {
      return headers[index] !== header;
    });
    if (displaced) {
      var prefixError = new Error("Protected legacy BARBER_SCHEDULE columns were displaced.");
      prefixError.code = "INCOMPATIBLE_LEGACY_SCHEDULE_PREFIX";
      throw prefixError;
    }
  }
  if (name === "STAFF") {
    var staffPrefix = StaffSchedulingPhase2.STAFF_LEGACY_HEADERS;
    var staffDisplaced = staffPrefix.some(function (header, index) {
      return headers[index] !== schedulePhase2Canonical(header);
    });
    if (staffDisplaced) {
      var staffPrefixError = new Error("Protected positional STAFF columns were displaced.");
      staffPrefixError.code = "INCOMPATIBLE_STAFF_POSITIONAL_PREFIX";
      throw staffPrefixError;
    }
  }
  var missing = expected.filter(function (header) {
    return headers.indexOf(schedulePhase2Canonical(header)) === -1;
  });
  if (missing.length) {
    var missingError = new Error("Phase 2 schema is not ready for " + name + ": " + missing.join(", "));
    missingError.code = "SCHEDULE_SCHEMA_NOT_READY";
    missingError.details = { sheetName: name, missingHeaders: missing };
    throw missingError;
  }
  return { sheet: sheet, headers: headers };
}

function schedulePhase2ReadRows(name) {
  var sheet = schedulePhase2Sheet(name, false);
  if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) return [];
  var headers = schedulePhase2Headers(sheet);
  schedulePhase2AssertNoDuplicateHeaders(name, headers);
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues().map(function (row, offset) {
    var record = { _rowNumber: offset + 2 };
    headers.forEach(function (header, index) {
      var key = schedulePhase2Camel(header);
      var value = row[index];
      if (value instanceof Date) {
        value = /(^DATE$|_FROM$|_TO$)/.test(header)
          ? Utilities.formatDate(value, StaffSchedulingPhase2.TIME_ZONE, "yyyy-MM-dd")
          : value.toISOString();
      }
      if (/_JSON$/.test(header)) {
        var canonicalJsonKey = key;
        var canonicalJsonValue = value === undefined || value === null ? "" : String(value);
        try { value = value ? JSON.parse(String(value)) : (header === "BRANCH_IDS_JSON" ? [] : null); }
        catch (_error) { value = header === "BRANCH_IDS_JSON" ? [] : null; }
        key = key.replace(/Json$/, "");
        if (name === "STAFF_WORK_POLICIES") {
          record[canonicalJsonKey] = canonicalJsonValue;
        }
      }
      record[key] = value;
    });
    if (record.requestFingerprint !== undefined) record.fingerprint = schedulePhase2Text(record.requestFingerprint);
    if (record.response !== undefined && typeof record.response === "string") {
      try { record.response = JSON.parse(record.response); } catch (_error) { record.response = null; }
    }
    return record;
  });
}

function schedulePhase2CellValue(header, record) {
  var key = schedulePhase2Camel(header);
  if (header === "REQUEST_FINGERPRINT") key = "fingerprint";
  if (header === "RESPONSE_JSON") key = "response";
  if (/_JSON$/.test(header)) {
    key = key.replace(/Json$/, "");
    return JSON.stringify(record[key] === undefined ? null : record[key]);
  }
  if (header === "BEFORE_STATE_JSON") return JSON.stringify(record.beforeState || null);
  if (header === "AFTER_STATE_JSON") return JSON.stringify(record.afterState || null);
  return record[key] === undefined || record[key] === null ? "" : record[key];
}

function schedulePhase2Save(name, schema, idHeader, record) {
  var ready = schedulePhase2AssertHeaders(name, schema);
  var idKey = schedulePhase2Camel(idHeader);
  var id = schedulePhase2Text(record[idKey]);
  var matches = schedulePhase2ReadRows(name).filter(function (item) {
    return schedulePhase2Text(item[idKey]) === id;
  });
  if (matches.length > 1) {
    var ambiguousError = new Error("Duplicate entity IDs exist in " + name);
    ambiguousError.code = "SCHEDULE_ENTITY_ID_AMBIGUOUS";
    ambiguousError.details = { sheetName: name, idHeader: idHeader, id: id };
    throw ambiguousError;
  }
  var existing = matches[0];
  var original = existing
    ? ready.sheet.getRange(existing._rowNumber, 1, 1, ready.headers.length).getValues()[0]
    : [];
  var schemaHeaders = schema.map(schedulePhase2Canonical);
  var values = ready.headers.map(function (header, index) {
    return schemaHeaders.indexOf(header) === -1
      ? (existing ? original[index] : "")
      : schedulePhase2CellValue(header, record);
  });
  if (existing) {
    schedulePhase2RecordUndo({
      type: "UPDATE", sheetName: name, rowNumber: existing._rowNumber, values: original
    });
    ready.sheet.getRange(existing._rowNumber, 1, 1, values.length).setValues([values]);
  } else {
    var rowNumber = ready.sheet.getLastRow() + 1;
    schedulePhase2RecordUndo({
      type: "APPEND", sheetName: name, rowNumber: rowNumber,
      idHeader: schedulePhase2Canonical(idHeader), id: id
    });
    ready.sheet.appendRow(values);
  }
  return record;
}

function schedulePhase2ReadStaff() {
  var ready = schedulePhase2AssertHeaders(
    "STAFF", StaffSchedulingPhase2.PHASE2_SHEET_SCHEMAS.STAFF
  );
  var sheet = ready.sheet;
  if (sheet.getLastRow() < 2) return [];
  var headers = ready.headers;
  var width = headers.length;
  var branchIndex = headers.indexOf("BRANCH_ID");
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, width).getValues()
    .map(function (row, index) {
      return {
        staffId: schedulePhase2Text(row[4] || "STAFF-" + String(index + 1).padStart(3, "0")),
        staffName: schedulePhase2Text(row[0]),
        branchId: branchIndex >= 0 ? schedulePhase2Text(row[branchIndex]) : "",
        active: row[7] === "" ? true : String(row[7]).toUpperCase() !== "FALSE"
      };
    })
    .filter(function (staff) { return !!staff.staffName; });
}

function schedulePhase2ReadSchedules() {
  var sheet = schedulePhase2Sheet("BARBER_SCHEDULE", false);
  if (!sheet || sheet.getLastRow() < 2) return [];
  var headers = schedulePhase2Headers(sheet);
  schedulePhase2AssertNoDuplicateHeaders("BARBER_SCHEDULE", headers);
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  var normalized = rows.map(function (row) {
    var safeRow = row.map(function (value, index) {
      if (!(value instanceof Date)) return value;
      if (headers[index] === "SHIFT_START" || headers[index] === "SHIFT_END") {
        return Utilities.formatDate(value, StaffSchedulingPhase2.TIME_ZONE, "HH:mm");
      }
      if (/(^DATE$|_FROM$|_TO$)/.test(headers[index])) {
        return Utilities.formatDate(value, StaffSchedulingPhase2.TIME_ZONE, "yyyy-MM-dd");
      }
      return value.toISOString();
    });
    return StaffSchedulingPhase2.normalizeLegacyScheduleRow(safeRow, headers, {});
  });
  return StaffSchedulingPhase2.classifyLegacyScheduleRows(normalized);
}

var schedulePhase2Transaction = null;

function schedulePhase2RecordUndo(entry) {
  if (schedulePhase2Transaction) schedulePhase2Transaction.entries.push(entry);
}

function schedulePhase2RollbackTransaction() {
  var failures = [];
  var entries = schedulePhase2Transaction ? schedulePhase2Transaction.entries.slice().reverse() : [];
  entries.forEach(function (entry) {
    try {
      var sheet = schedulePhase2Sheet(entry.sheetName, true);
      if (entry.type === "UPDATE") {
        sheet.getRange(entry.rowNumber, 1, 1, entry.values.length).setValues([entry.values]);
      } else if (entry.type === "APPEND" && sheet.getLastRow() >= entry.rowNumber) {
        var headers = schedulePhase2Headers(sheet);
        var idIndex = headers.indexOf(entry.idHeader);
        var actualId = idIndex >= 0
          ? schedulePhase2Text(sheet.getRange(entry.rowNumber, idIndex + 1).getValue()) : "";
        if (actualId === entry.id) sheet.deleteRow(entry.rowNumber);
        else if (actualId) failures.push({
          sheetName: entry.sheetName, rowNumber: entry.rowNumber, code: "ROLLBACK_ROW_ID_MISMATCH"
        });
      }
    } catch (error) {
      failures.push({
        sheetName: entry.sheetName, rowNumber: entry.rowNumber,
        code: "ROLLBACK_OPERATION_FAILED", message: error.message
      });
    }
  });
  return failures;
}

function schedulePhase2WithTransaction(details, callback) {
  var properties = PropertiesService.getScriptProperties();
  var markerKey = "SCHEDULE_RECOVERY_" + details.requestId;
  var marker = {
    version: StaffSchedulingPhase2.PHASE2_VERSION,
    action: details.action, requestId: details.requestId, actorId: details.actorId,
    status: "IN_PROGRESS", startedAt: new Date().toISOString()
  };
  properties.setProperty(markerKey, JSON.stringify(marker));
  schedulePhase2Transaction = { entries: [] };
  try {
    var result = callback();
    properties.deleteProperty(markerKey);
    schedulePhase2Transaction = null;
    return result;
  } catch (error) {
    var failures = schedulePhase2RollbackTransaction();
    schedulePhase2Transaction = null;
    if (failures.length) {
      marker.status = "COMPENSATION_FAILED";
      marker.failures = failures;
      marker.originalError = { code: error.code || "", message: error.message || "" };
      properties.setProperty(markerKey, JSON.stringify(marker));
      var compensationError = new Error("Schedule write failed and compensation was incomplete.");
      compensationError.code = "SCHEDULE_COMPENSATION_FAILED";
      compensationError.details = { recoveryMarker: markerKey, failures: failures };
      throw compensationError;
    }
    properties.deleteProperty(markerKey);
    throw error;
  }
}

function schedulePhase2CreateRepository() {
  return {
    listStaff: schedulePhase2ReadStaff,
    getStaff: function (staffId) {
      return schedulePhase2ReadStaff().filter(function (item) {
        return item.staffId === schedulePhase2Text(staffId);
      })[0] || null;
    },
    listSchedules: function (filters) {
      filters = filters || {};
      return schedulePhase2ReadSchedules().filter(function (item) {
        return (!filters.staffId || item.staffId === filters.staffId) &&
          (!filters.weekday || item.weekday === filters.weekday) &&
          (filters.active === undefined || item.active === filters.active);
      });
    },
    getSchedule: function (id) {
      var matches = schedulePhase2ReadSchedules().filter(function (item) {
        return item.scheduleId === schedulePhase2Text(id);
      });
      if (matches.length > 1) {
        var error = new Error("Schedule ID is ambiguous.");
        error.code = "SCHEDULE_ENTITY_ID_AMBIGUOUS";
        throw error;
      }
      return matches[0] || null;
    },
    saveSchedule: function (record) {
      return schedulePhase2Save(
        "BARBER_SCHEDULE", StaffSchedulingPhase2.PHASE2_SHEET_SCHEMAS.BARBER_SCHEDULE,
        "SCHEDULE_ID", record
      );
    },
    listOverrides: function (filters) {
      filters = filters || {};
      return schedulePhase2ReadRows("STAFF_SCHEDULE_OVERRIDES").filter(function (item) {
        return (!filters.staffId || item.staffId === filters.staffId || item.scopeType !== "STAFF") &&
          (!filters.dateFrom || item.date >= filters.dateFrom) &&
          (!filters.dateTo || item.date <= filters.dateTo) &&
          (!filters.status || item.status === filters.status);
      });
    },
    getOverride: function (id) {
      var matches = schedulePhase2ReadRows("STAFF_SCHEDULE_OVERRIDES").filter(function (item) {
        return item.overrideId === schedulePhase2Text(id);
      });
      if (matches.length > 1) {
        var error = new Error("Override ID is ambiguous.");
        error.code = "SCHEDULE_ENTITY_ID_AMBIGUOUS";
        throw error;
      }
      return matches[0] || null;
    },
    saveOverride: function (record) {
      return schedulePhase2Save(
        "STAFF_SCHEDULE_OVERRIDES",
        StaffSchedulingPhase2.PHASE2_SHEET_SCHEMAS.STAFF_SCHEDULE_OVERRIDES,
        "OVERRIDE_ID", record
      );
    },
    listPolicies: function () { return schedulePhase2ReadRows("STAFF_WORK_POLICIES"); },
    appendAudit: function (record) {
      if (schedulePhase2ReadRows("STAFF_ATTENDANCE_AUDIT").some(function (item) {
        return item.actionId === record.actionId;
      })) {
        var error = new Error("Audit action ID collision.");
        error.code = "SCHEDULE_AUDIT_ID_COLLISION";
        throw error;
      }
      return schedulePhase2Save(
        "STAFF_ATTENDANCE_AUDIT",
        StaffSchedulingPhase2.PHASE2_SHEET_SCHEMAS.STAFF_ATTENDANCE_AUDIT,
        "ACTION_ID", record
      );
    },
    listAudit: function (filters) {
      filters = filters || {};
      return schedulePhase2ReadRows("STAFF_ATTENDANCE_AUDIT").filter(function (item) {
        return (!filters.entityId || item.entityId === filters.entityId) &&
          (!filters.staffId || item.staffId === filters.staffId);
      });
    },
    getIdempotency: function (requestId) {
      var matches = schedulePhase2ReadRows("STAFF_ATTENDANCE_IDEMPOTENCY").filter(function (item) {
        return item.requestId === schedulePhase2Text(requestId);
      });
      if (matches.length > 1) {
        var error = new Error("Idempotency request ID is ambiguous.");
        error.code = "SCHEDULE_IDEMPOTENCY_AMBIGUOUS";
        throw error;
      }
      return matches[0] || null;
    },
    saveIdempotency: function (record) {
      return schedulePhase2Save(
        "STAFF_ATTENDANCE_IDEMPOTENCY",
        StaffSchedulingPhase2.PHASE2_SHEET_SCHEMAS.STAFF_ATTENDANCE_IDEMPOTENCY,
        "REQUEST_ID", record
      );
    },
    listScopes: function () { return schedulePhase2ReadRows("SCHEDULE_USER_SCOPES"); },
    saveScope: function (record) {
      return schedulePhase2Save(
        "SCHEDULE_USER_SCOPES",
        StaffSchedulingPhase2.PHASE2_SHEET_SCHEMAS.SCHEDULE_USER_SCOPES,
        "SCOPE_ID", record
      );
    },
    withTransaction: schedulePhase2WithTransaction
  };
}

function schedulePhase2Actor(data) {
  var cachedActor = typeof protectedReadCachedActor === "function"
    ? protectedReadCachedActor(data) : null;
  if (cachedActor) return cachedActor;
  var user = getAuthenticatedUser(data || {});
  if (!user) return null;
  var username = schedulePhase2Text(user.username);
  var owner = username.toLowerCase() === "owner";
  var activeScopes = schedulePhase2ReadRows("SCHEDULE_USER_SCOPES").filter(function (item) {
    return schedulePhase2Text(item.username).toLowerCase() === username.toLowerCase() &&
      (item.active === true || String(item.active).toUpperCase() === "TRUE");
  });
  if (!owner && activeScopes.length > 1) {
    var ambiguousError = new Error("Multiple active schedule scopes exist for this authenticated user.");
    ambiguousError.code = "SCHEDULE_SCOPE_AMBIGUOUS";
    throw ambiguousError;
  }
  var scope = activeScopes[0];
  if (!owner && !scope) {
    var error = new Error("A reviewed staff/branch scope mapping is required.");
    error.code = "SCHEDULE_SCOPE_NOT_CONFIGURED";
    throw error;
  }
  if (!owner) {
    var role = schedulePhase2Text(scope.role).toUpperCase();
    var branchIds = Array.isArray(scope.branchIds) ? scope.branchIds.filter(Boolean) : [];
    if (["EMPLOYEE", "MANAGER"].indexOf(role) === -1) {
      var roleError = new Error("Schedule scope role is invalid.");
      roleError.code = "SCHEDULE_SCOPE_ROLE_INVALID";
      throw roleError;
    }
    if (role === "EMPLOYEE") {
      var mappedStaff = schedulePhase2ReadStaff().filter(function (item) {
        return item.staffId === schedulePhase2Text(scope.staffId);
      })[0];
      if (!mappedStaff) {
        var staffError = new Error("Schedule scope staff mapping does not resolve.");
        staffError.code = "SCHEDULE_SCOPE_STAFF_NOT_FOUND";
        throw staffError;
      }
    }
    if (role === "MANAGER" && !branchIds.length) {
      var branchError = new Error("Manager schedule scope requires at least one branch.");
      branchError.code = "SCHEDULE_SCOPE_BRANCH_REQUIRED";
      throw branchError;
    }
  }
  var actor = {
    username: username,
    actorId: username,
    actorName: schedulePhase2Text(user.displayName || username),
    role: owner ? "OWNER" : schedulePhase2Text(scope.role || "EMPLOYEE"),
    staffId: owner ? "" : schedulePhase2Text(scope.staffId),
    branchIds: owner ? [] : (Array.isArray(scope.branchIds) ? scope.branchIds : []),
    permissions: normalizeManagedPermissions(user.username, user.permissions),
    owner: owner
  };
  return typeof protectedReadRememberActor === "function"
    ? protectedReadRememberActor(data, actor) : actor;
}

function schedulePhase2WithLock(_details, callback) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    var error = new Error("Another schedule write is in progress.");
    error.code = "SCHEDULE_WRITE_LOCK_TIMEOUT";
    throw error;
  }
  try { return callback(); } finally { lock.releaseLock(); }
}

function schedulePhase2AssertWriteReady() {
  Object.keys(StaffSchedulingPhase2.PHASE2_SHEET_SCHEMAS).forEach(function (name) {
    schedulePhase2AssertHeaders(name, StaffSchedulingPhase2.PHASE2_SHEET_SCHEMAS[name]);
  });
}

function schedulePhase2AssertEnvironmentIdentity() {
  var config = getCutHubEnvironmentConfig();
  var spreadsheet = SpreadsheetApp.getActive();
  if (!config.environment || ["development", "test", "staging", "production"].indexOf(config.environment) === -1) {
    var environmentError = new Error("Schedule environment identity is missing or invalid.");
    environmentError.code = "SCHEDULE_ENVIRONMENT_IDENTITY_INVALID";
    throw environmentError;
  }
  if (!config.spreadsheetId || !spreadsheet || spreadsheet.getId() !== config.spreadsheetId) {
    var spreadsheetError = new Error("Schedule spreadsheet identity does not match configuration.");
    spreadsheetError.code = "SCHEDULE_SPREADSHEET_IDENTITY_MISMATCH";
    throw spreadsheetError;
  }
  return { config: config, spreadsheet: spreadsheet };
}

function previewStaffScheduleMigration(data) {
  data = data && typeof data === "object" ? data : {};
  var spreadsheet = SpreadsheetApp.getActive();
  var config = getCutHubEnvironmentConfig();
  var existing = {};
  Object.keys(StaffSchedulingPhase2.PHASE2_SHEET_SCHEMAS).forEach(function (name) {
    var sheet = spreadsheet.getSheetByName(name);
    existing[name] = sheet ? schedulePhase2Headers(sheet) : null;
  });
  return StaffSchedulingPhase2.planScheduleMigration(existing, {
    environment: config.environment,
    expectedSpreadsheetId: config.spreadsheetId,
    actualSpreadsheetId: spreadsheet.getId(),
    environmentReviewApproved: data.environmentReviewApproved === true
  });
}

function diagnosticPreviewStaffScheduleMigration(data) {
  var config = getCutHubEnvironmentConfig();
  var environment = String(config.environment || "").toLowerCase();
  if (["development", "staging"].indexOf(environment) === -1) {
    var blocked = new Error("Schedule migration diagnostic preview is limited to development and staging.");
    blocked.code = "SCHEDULE_DIAGNOSTIC_PREVIEW_ENVIRONMENT_BLOCKED";
    throw blocked;
  }
  var previewData = data && typeof data === "object" ? Object.assign({}, data) : {};
  if (environment === "staging") {
    assertStagingEnvironment();
    previewData.environmentReviewApproved = true;
  }
  var result = previewStaffScheduleMigration(previewData);
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function handleStaffSchedulingPhase2Action(data) {
  try {
    if (!StaffSchedulingPhase2 || StaffSchedulingPhase2.ACTIONS.indexOf(data.action) === -1) {
      throw StaffSchedulingPhase2.schedulingError("SCHEDULE_ACTION_UNKNOWN", "Schedule action is not supported.");
    }
    schedulePhase2AssertEnvironmentIdentity();
    if (data.action === "previewStaffScheduleMigration") {
      var previewActor = schedulePhase2Actor(data);
      if (!previewActor || !previewActor.owner) {
        throw StaffSchedulingPhase2.schedulingError("OWNER_REQUIRED", "Only owner can preview the migration.");
      }
      return jsonOutput({
        status: "success", code: "SCHEDULE_MIGRATION_PREVIEW_OK",
        migration: StaffSchedulingPhase2.filterSensitiveFields(previewStaffScheduleMigration(data))
      });
    }
    if (StaffSchedulingPhase2.WRITE_ACTIONS.has(data.action)) schedulePhase2AssertWriteReady();
    var service = StaffSchedulingPhase2.createService({
      repository: schedulePhase2CreateRepository(),
      actorResolver: schedulePhase2Actor,
      userResolver: function (username) {
        return readUsersFromSheet().filter(function (user) {
          return schedulePhase2Text(user.username).toLowerCase() ===
            schedulePhase2Text(username).toLowerCase();
        })[0] || null;
      },
      withLock: function (details, callback) {
        return schedulePhase2WithLock(details, function () {
          if (typeof publishOperationalMutationTransactionUnderCurrentLock === "function") {
            return publishOperationalMutationTransactionUnderCurrentLock(
              "schedule", data, callback);
          }
          var mutationResult = callback();
          if (typeof publishOperationalMutationUnderCurrentLock === "function") {
            publishOperationalMutationUnderCurrentLock("schedule", data, mutationResult);
          }
          return mutationResult;
        });
      },
      now: function () { return new Date().toISOString(); },
      uuid: function () { return Utilities.getUuid(); }
    });
    var result = service.execute(data.action, data);
    return jsonOutput(result);
  } catch (error) {
    return jsonOutput({
      status: "error",
      code: error.code || "SCHEDULE_INTERNAL_ERROR",
      message: error.message || "Schedule request failed.",
      details: error.details || undefined
    });
  }
}

/* END staff-scheduling-phase2-gas.js */

/* BEGIN staff-attendance-phase3.js */
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
    "getAttendanceAuditHistory", "listLegacyAttendanceRecords", "previewAttendanceMigration",
    "listWorkPolicies", "createWorkPolicy", "deactivateWorkPolicy"
  ]);
  const WRITE_ACTIONS = new Set(ACTIONS.filter((action) => ![
    "getAttendanceDashboard", "getEmployeeAttendanceDay", "listAttendanceEvents",
    "listUnresolvedAttendanceDays", "listOpenAttendanceBreaks",
    "getAttendanceAuditHistory", "listLegacyAttendanceRecords", "previewAttendanceMigration",
    "listWorkPolicies"
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
  const WORK_POLICY_SERVER_FIELDS = new Set([
    "policyId", "active", "createdAt", "createdBy", "updatedAt", "updatedBy"
  ]);
  const WORK_POLICY_NUMERIC_FIELDS = new Set([
    "requiredDailyMinutes", "allowedBreakMinutes", "maxSingleBreakMinutes",
    "breakGraceMinutes", "graceLateMinutes", "graceEarlyLeaveMinutes",
    "deficitRatePerHour", "fixedLatePenalty", "dailyDeductionCap",
    "overtimeRatePerHour", "overtimeMultiplier", "minOvertimeThresholdMinutes",
    "dailyOvertimeCapMinutes", "periodOvertimeCapMinutes", "roundingIncrementMinutes",
    "monthlyAllowedLeaveDays", "maxCarryForwardDays", "excessAbsenceMultiplier",
    "excessAbsenceFixedAmount", "maxExcessAbsenceDeduction", "fixedDayValue",
    "monthlySalary", "workingDaysDivisor", "hourlyRate", "currencyMinorScale",
    "monthlySalaryMinor", "deficitRateMinorPerMinute", "dailyDeductionCapMinor",
    "periodDeductionCapMinor", "overtimeRateMinorPerMinute", "overtimeMultiplierBps",
    "unpaidLeaveMultiplierBps", "absenceMultiplierBps"
  ]);
  const WORK_POLICY_BOOLEAN_FIELDS = new Set([
    "allowMultipleBreaks", "excessBreakContributesToDeficit",
    "overtimeApprovalRequired", "leaveCarryForward", "leaveApprovalRequired",
    "hireDateProration", "terminationDateProration", "sickLeavePaid"
  ]);
  const WORK_POLICY_ENUMS = Object.freeze({
    breakPaymentType: ["PAID", "UNPAID"],
    deficitRateType: ["SALARY_DERIVED", "FIXED_HOURLY", "FIXED_PER_MINUTE"],
    overtimePolicy: ["NONE", "PAID", "TIME_OFF", "OFFSET_DEFICIT"],
    roundingMode: ["NONE", "FLOOR", "CEIL", "NEAREST"],
    settlementPeriod: ["DAILY", "WEEKLY", "MONTHLY", "PAYROLL_PERIOD", "CUSTOM_PAYROLL_PERIOD"],
    partialLeaveUnit: ["MINUTES", "HOURS", "HALF_DAY", "DAY"],
    leaveResetPeriod: ["MONTHLY", "PAYROLL_PERIOD", "CUSTOM_PAYROLL_PERIOD"],
    excessAbsencePolicy: ["DAY_VALUE_MULTIPLIER", "FIXED_AMOUNT_PER_DAY", "WORKING_HOURS_BASED"],
    dayValueMethod: ["FIXED_DAY_VALUE", "MONTHLY_SALARY_DIVIDED_BY_CALENDAR_DAYS",
      "MONTHLY_SALARY_DIVIDED_BY_WORKING_DAYS", "REQUIRED_DAILY_HOURS_AT_HOURLY_RATE"],
    salaryBasis: ["MONTHLY", "DAILY", "HOURLY", "PER_MINUTE"],
    overtimeRateType: ["SALARY_DERIVED", "FIXED_HOURLY", "FIXED_PER_MINUTE"],
    unresolvedBehavior: ["BLOCK", "EXCLUDE"]
  });
  function workPolicyKey(header) {
    return String(header || "").toLowerCase().replace(/_([a-z0-9])/g,
      (_match, character) => character.toUpperCase());
  }
  function workPolicyInputValue(source, key) {
    if (Object.prototype.hasOwnProperty.call(source, key)) return source[key];
    const header = schema.SHEET_SCHEMAS.STAFF_WORK_POLICIES.find((item) =>
      workPolicyKey(item) === key);
    if (header && Object.prototype.hasOwnProperty.call(source, header)) return source[header];
    if (key === "requiredDailyMinutes" &&
        Object.prototype.hasOwnProperty.call(source, "requiredWorkMinutes")) {
      return source.requiredWorkMinutes;
    }
    return undefined;
  }
  function workPolicyDate(value, field) {
    try { return core.parseDateKey(value).text; } catch (_error) {
      throw attendanceError("WORK_POLICY_DATE_INVALID", `${field} must be YYYY-MM-DD.`);
    }
  }
  function workPolicyBoolean(value, field) {
    if (value === true || value === false) return value;
    if (["TRUE", "FALSE"].includes(upper(value))) return upper(value) === "TRUE";
    throw attendanceError("WORK_POLICY_BOOLEAN_INVALID", `${field} must be a boolean.`);
  }
  function workPolicyNumber(value, field) {
    if (value === "" || value === null) return "";
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw attendanceError("WORK_POLICY_NUMBER_INVALID", `${field} must be finite and non-negative.`);
    }
    return parsed;
  }
  function normalizeCompleteWorkPolicy(source, options) {
    const trustedStoredSource = options && options.trustedStoredSource === true;
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      throw attendanceError("WORK_POLICY_COMPLETE_PAYLOAD_REQUIRED",
        "A complete work policy object is required.");
    }
    const record = {};
    schema.SHEET_SCHEMAS.STAFF_WORK_POLICIES.map(workPolicyKey).forEach((key) => {
      if (WORK_POLICY_SERVER_FIELDS.has(key)) return;
      const value = workPolicyInputValue(source, key);
      if (value === undefined) {
        throw attendanceError("WORK_POLICY_FIELD_REQUIRED", `Complete policy field is required: ${key}.`,
          { field: key });
      }
      if (key === "staffId") record[key] = requireText(value,
        "WORK_POLICY_STAFF_ID_REQUIRED", "Stable staff ID is required.");
      else if (key === "effectiveFrom") record[key] = workPolicyDate(value, key);
      else if (key === "effectiveTo") record[key] = value === "" || value === null
        ? "" : workPolicyDate(value, key);
      else if (WORK_POLICY_BOOLEAN_FIELDS.has(key)) record[key] =
        trustedStoredSource && text(value) === "" ? "" : workPolicyBoolean(value, key);
      else if (WORK_POLICY_NUMERIC_FIELDS.has(key)) record[key] = workPolicyNumber(value, key);
      else if (key.endsWith("Json")) {
        try {
          if (trustedStoredSource && text(value) === "") record[key] = "";
          else {
            const parsed = typeof value === "string" ? JSON.parse(value || "[]") : clone(value);
            record[key] = stable(parsed);
          }
        } catch (_error) {
          throw attendanceError("WORK_POLICY_JSON_INVALID", `${key} must contain valid JSON.`);
        }
      } else if (WORK_POLICY_ENUMS[key]) {
        const normalized = upper(value);
        if (trustedStoredSource && !normalized) {
          record[key] = "";
          return;
        }
        if (!WORK_POLICY_ENUMS[key].includes(normalized)) {
          throw attendanceError("WORK_POLICY_ENUM_INVALID", `${key} contains an unsupported value.`,
            { field: key });
        }
        record[key] = normalized;
      } else if (key === "currency") {
        const currency = upper(value);
        if (!/^[A-Z]{3}$/.test(currency)) {
          throw attendanceError("WORK_POLICY_CURRENCY_INVALID", "Currency must be a three-letter code.");
        }
        record[key] = currency;
      } else if (["defaultShiftStart", "defaultShiftEnd"].includes(key)) {
        const time = text(value);
        if (time && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
          throw attendanceError("WORK_POLICY_TIME_INVALID", `${key} must be HH:mm or blank.`);
        }
        record[key] = time;
      } else record[key] = text(value);
    });
    if (record.effectiveTo && record.effectiveTo < record.effectiveFrom) {
      throw attendanceError("WORK_POLICY_DATE_RANGE_INVALID",
        "Effective-to cannot be before effective-from.");
    }
    ["requiredDailyMinutes", "allowedBreakMinutes", "maxSingleBreakMinutes",
      "roundingIncrementMinutes", "currencyMinorScale", "monthlySalaryMinor",
      "deficitRateMinorPerMinute", "dailyDeductionCapMinor", "periodDeductionCapMinor",
      "overtimeRateMinorPerMinute", "overtimeMultiplierBps", "unpaidLeaveMultiplierBps",
      "absenceMultiplierBps"].forEach((key) => {
      if (record[key] !== "" && !Number.isInteger(record[key])) {
        throw attendanceError("WORK_POLICY_INTEGER_REQUIRED", `${key} must be an integer.`);
      }
    });
    return record;
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
      getPolicy: (policyId) => clone(findUnique(state.policies, "policyId", policyId,
        "WORK_POLICY_ID_AMBIGUOUS")),
      savePolicy: (record) => save("policies", "policyId", record),
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
    const beforeWorkPolicyNormalization = config.beforeWorkPolicyNormalization || (() => {});
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
      const persistedSchedule = current && current.scheduleSnapshot &&
        typeof current.scheduleSnapshot === "object" ? clone(current.scheduleSnapshot) : null;
      const persistedPolicy = current && current.policySnapshot &&
        typeof current.policySnapshot === "object" ? clone(current.policySnapshot) : null;
      const schedule = persistedSchedule || scheduleResolver(staff, date) || {
        date, staffId: staff.staffId, sourceType: "NONE", sourceIds: [], shiftSegments: [],
        requiredWorkMinutes: 0, allowedBreakMinutes: 0, classification: "NOT_SCHEDULED",
        warnings: ["NO_RESOLVED_SCHEDULE"]
      };
      const policy = persistedPolicy ? {
        resolution: {
          source: "PERSISTED_ATTENDANCE_SNAPSHOT",
          policyId: text(persistedPolicy.policyId),
          snapshot: persistedPolicy
        },
        snapshot: persistedPolicy
      } : policyFor(staff, date);
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
      const persistedEventIds = current && Array.isArray(current.sourceEventIds)
        ? current.sourceEventIds.map(text) : [];
      const calculatedEventIds = (calculated.sourceEventIds || []).map(text);
      const evidenceMatches = !!current && (
        (!!text(current.sourceEventHash) &&
          text(current.sourceEventHash) === text(calculated.sourceEventHash)) ||
        (persistedEventIds.length > 0 && stable(persistedEventIds) === stable(calculatedEventIds))
      );
      const persistedCompleted = !!current && !calculated.openSession && !calculated.openBreak &&
        evidenceMatches &&
        text(current.calculationVersion) === PHASE3_VERSION;
      if (persistedCompleted) {
        return Object.freeze({
          ...calculated,
          ...clone(current),
          state: calculated.state,
          sessions: calculated.sessions,
          breaks: calculated.breaks,
          sourceEventIds: calculated.sourceEventIds,
          sourceEventHash: calculated.sourceEventHash,
          approvedOvertimeMinutes: calculated.approvedOvertimeMinutes,
          overtimeApprovalStatus: calculated.overtimeApprovalStatus,
          openSession: false,
          openBreak: false,
          staleCalculation: false
        });
      }
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
    function requireOwner(resolvedActor) {
      if (!resolvedActor.owner) {
        throw attendanceError("WORK_POLICY_OWNER_REQUIRED",
          "Only the owner can manage work policies.");
      }
    }
    function workPolicyDto(item) {
      return {
        policyId: text(item.policyId), staffId: text(item.staffId),
        effectiveFrom: text(item.effectiveFrom), effectiveTo: text(item.effectiveTo),
        requiredDailyMinutes: number(item.requiredDailyMinutes, 0),
        allowedBreakMinutes: number(item.allowedBreakMinutes, 0),
        salaryBasis: upper(item.salaryBasis), currency: upper(item.currency),
        active: item.active !== false && upper(item.active) !== "FALSE",
        createdAt: text(item.createdAt), createdBy: text(item.createdBy),
        updatedAt: text(item.updatedAt), updatedBy: text(item.updatedBy)
      };
    }
    function workPolicyRangesOverlap(left, right) {
      const leftEnd = text(left.effectiveTo) || "9999-12-31";
      const rightEnd = text(right.effectiveTo) || "9999-12-31";
      return text(left.effectiveFrom) <= rightEnd && text(right.effectiveFrom) <= leftEnd;
    }
    function completeWorkPolicyPayload(data) {
      if (data.policy) return normalizeCompleteWorkPolicy(data.policy);
      const sourcePolicyId = text(data.sourcePolicyId);
      if (!sourcePolicyId) {
        throw attendanceError("WORK_POLICY_COMPLETE_PAYLOAD_REQUIRED",
          "Provide a complete policy object or an explicit source policy ID.");
      }
      const source = repository.getPolicy(sourcePolicyId);
      if (!source) throw attendanceError("WORK_POLICY_SOURCE_NOT_FOUND",
        "The source work policy was not found.");
      const copied = {};
      schema.SHEET_SCHEMAS.STAFF_WORK_POLICIES.map(workPolicyKey).forEach((key) => {
        if (!WORK_POLICY_SERVER_FIELDS.has(key)) copied[key] = source[key];
      });
      ["staffId", "effectiveFrom", "effectiveTo", "requiredDailyMinutes",
        "requiredWorkMinutes", "allowedBreakMinutes", "salaryBasis", "currency"]
        .forEach((key) => {
          if (Object.prototype.hasOwnProperty.call(data, key)) copied[key] = data[key];
        });
      if (Object.prototype.hasOwnProperty.call(copied, "requiredWorkMinutes")) {
        copied.requiredDailyMinutes = copied.requiredWorkMinutes;
        delete copied.requiredWorkMinutes;
      }
      beforeWorkPolicyNormalization(clone(copied));
      return normalizeCompleteWorkPolicy(copied, { trustedStoredSource: true });
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
      listWorkPolicies(data) {
        const resolvedActor = actor(data); requireOwner(resolvedActor);
        const policies = repository.listPolicies()
          .filter((item) => !data.staffId || text(item.staffId) === text(data.staffId))
          .filter((item) => data.includeInactive === true ||
            (item.active !== false && upper(item.active) !== "FALSE"))
          .map(workPolicyDto);
        return {
          status: "success", code: "WORK_POLICY_LIST_OK", workPolicies: policies,
          serverNow: now()
        };
      },
      createWorkPolicy(data) {
        return mutation("createWorkPolicy", data, "attendance.manage",
          (resolvedActor, requestId, reason, at) => {
            requireOwner(resolvedActor);
            const policy = completeWorkPolicyPayload(data);
            const staff = repository.getStaff(policy.staffId);
            if (!staff) throw attendanceError("WORK_POLICY_STAFF_NOT_FOUND",
              "The employee does not exist.");
            if (staff.active === false || upper(staff.active) === "FALSE") {
              throw attendanceError("WORK_POLICY_STAFF_INACTIVE",
                "An inactive employee cannot receive a new work policy.");
            }
            const overlap = repository.listPolicies().find((item) =>
              text(item.staffId) === policy.staffId &&
              item.active !== false && upper(item.active) !== "FALSE" &&
              workPolicyRangesOverlap(item, policy));
            if (overlap) throw attendanceError("WORK_POLICY_EFFECTIVE_OVERLAP",
              "An active work policy already overlaps this effective range.",
              { conflictingPolicyId: text(overlap.policyId) });
            const record = {
              ...policy,
              policyId: allocateId("POL", (candidate) => !!repository.getPolicy(candidate),
                "WORK_POLICY_ID_ALLOCATION_FAILED"),
              active: true, createdAt: at, createdBy: resolvedActor.actorId,
              updatedAt: at, updatedBy: resolvedActor.actorId
            };
            repository.savePolicy(record);
            audit("CREATE_WORK_POLICY", "STAFF_WORK_POLICY", record.policyId,
              record.staffId, resolvedActor, {}, record, reason, requestId, at);
            return { code: "CREATE_WORK_POLICY_OK", workPolicy: workPolicyDto(record) };
          });
      },
      deactivateWorkPolicy(data) {
        return mutation("deactivateWorkPolicy", data, "attendance.manage",
          (resolvedActor, requestId, reason, at) => {
            requireOwner(resolvedActor);
            const policyId = requireText(data.policyId, "WORK_POLICY_ID_REQUIRED",
              "Stable policy ID is required.");
            const current = repository.getPolicy(policyId);
            if (!current) throw attendanceError("WORK_POLICY_NOT_FOUND",
              "The work policy was not found.");
            if (current.active === false || upper(current.active) === "FALSE") {
              throw attendanceError("WORK_POLICY_ALREADY_INACTIVE",
                "The work policy is already inactive.");
            }
            const updated = { ...current, active: false, updatedAt: at,
              updatedBy: resolvedActor.actorId };
            repository.savePolicy(updated);
            audit("DEACTIVATE_WORK_POLICY", "STAFF_WORK_POLICY", current.policyId,
              current.staffId, resolvedActor, current, updated, reason, requestId, at);
            return { code: "DEACTIVATE_WORK_POLICY_OK", workPolicy: workPolicyDto(updated) };
          });
      },
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
    if (environment === "production") {
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

/* END staff-attendance-phase3.js */

/* BEGIN staff-attendance-phase3-gas.js */
/* global StaffAttendancePhase3, StaffSchedulingPhase2, SpreadsheetApp, LockService,
  PropertiesService, Utilities, console, getCutHubEnvironmentConfig, assertStagingEnvironment, getAuthenticatedUser,
  normalizeManagedPermissions, jsonOutput, schedulePhase2Actor, schedulePhase2ReadRows,
  schedulePhase2ReadStaff, schedulePhase2ReadSchedules, schedulePhase2Headers,
  schedulePhase2AssertHeaders, schedulePhase2AssertNoDuplicateHeaders,
  schedulePhase2Canonical, schedulePhase2Camel, schedulePhase2Sheet,
  schedulePhase2RecordUndo, schedulePhase2RollbackTransaction */

var attendancePhase3Transaction = null;

function attendancePhase3IsoNow() {
  return Utilities.formatDate(new Date(), StaffAttendancePhase3.TIME_ZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function attendancePhase3CellValue(header, record) {
  var key = schedulePhase2Camel(header);
  var value = record[key];
  if (/_JSON$/.test(header)) {
    if (value === undefined) value = record[key.replace(/Json$/, "")];
    return typeof value === "string" ? value : JSON.stringify(value === undefined ? null : value);
  }
  if (Array.isArray(value) || (value && typeof value === "object")) return JSON.stringify(value);
  return value === undefined || value === null ? "" : value;
}

function attendancePhase3Save(name, schema, idHeader, record, appendOnly) {
  var ready = schedulePhase2AssertHeaders(name, schema);
  var idKey = schedulePhase2Camel(idHeader);
  var entityId = String(record[idKey] || "").trim();
  if (!entityId) {
    var idError = new Error("Stable entity ID is required.");
    idError.code = "ATTENDANCE_ENTITY_ID_REQUIRED";
    throw idError;
  }
  var matches = schedulePhase2ReadRows(name).filter(function (item) {
    return String(item[idKey] || "").trim() === entityId;
  });
  if (matches.length > 1) {
    var duplicateError = new Error("Duplicate entity IDs exist in " + name);
    duplicateError.code = "ATTENDANCE_ENTITY_ID_AMBIGUOUS";
    throw duplicateError;
  }
  if (appendOnly && matches.length) {
    var collisionError = new Error("Append-only entity ID collision in " + name);
    collisionError.code = "ATTENDANCE_APPEND_ID_COLLISION";
    throw collisionError;
  }
  var existing = matches[0];
  var original = existing
    ? ready.sheet.getRange(existing._rowNumber, 1, 1, ready.headers.length).getValues()[0] : [];
  var schemaSet = {};
  schema.map(schedulePhase2Canonical).forEach(function (header) { schemaSet[header] = true; });
  var values = ready.headers.map(function (header, index) {
    return schemaSet[header] ? attendancePhase3CellValue(header, record)
      : (existing ? original[index] : "");
  });
  if (existing) {
    schedulePhase2RecordUndo({
      type: "UPDATE", sheetName: name, rowNumber: existing._rowNumber, values: original
    });
    ready.sheet.getRange(existing._rowNumber, 1, 1, values.length).setValues([values]);
  } else {
    var rowNumber = ready.sheet.getLastRow() + 1;
    schedulePhase2RecordUndo({
      type: "APPEND", sheetName: name, rowNumber: rowNumber,
      idHeader: schedulePhase2Canonical(idHeader), id: entityId
    });
    ready.sheet.appendRow(values);
  }
  return record;
}

function attendancePhase3WithTransaction(details, callback) {
  var properties = PropertiesService.getScriptProperties();
  var markerKey = "ATTENDANCE_RECOVERY_" + details.requestId;
  var marker = {
    version: StaffAttendancePhase3.PHASE3_VERSION, action: details.action,
    requestId: details.requestId, actorId: details.actorId,
    status: "IN_PROGRESS", startedAt: attendancePhase3IsoNow()
  };
  properties.setProperty(markerKey, JSON.stringify(marker));
  schedulePhase2Transaction = { entries: [] };
  attendancePhase3Transaction = schedulePhase2Transaction;
  try {
    var result = callback();
    properties.deleteProperty(markerKey);
    schedulePhase2Transaction = null;
    attendancePhase3Transaction = null;
    return result;
  } catch (error) {
    var failures = schedulePhase2RollbackTransaction();
    schedulePhase2Transaction = null;
    attendancePhase3Transaction = null;
    if (failures.length) {
      marker.status = "COMPENSATION_FAILED";
      marker.failures = failures;
      marker.originalError = { code: error.code || "", message: error.message || "" };
      properties.setProperty(markerKey, JSON.stringify(marker));
      var recoveryError = new Error("Attendance write failed and compensation was incomplete.");
      recoveryError.code = "ATTENDANCE_COMPENSATION_FAILED";
      recoveryError.details = { recoveryMarker: markerKey, failures: failures };
      throw recoveryError;
    }
    properties.deleteProperty(markerKey);
    throw error;
  }
}

function attendancePhase3DateOnly(value, timezone) {
  var resolvedTimezone = String(timezone || StaffAttendancePhase3.TIME_ZONE || "Africa/Cairo");
  if (Object.prototype.toString.call(value) === "[object Date]" &&
      !isNaN(value.getTime())) {
    return Utilities.formatDate(value, resolvedTimezone, "yyyy-MM-dd");
  }
  var text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    var instant = new Date(text);
    if (!isNaN(instant.getTime())) {
      return Utilities.formatDate(instant, resolvedTimezone, "yyyy-MM-dd");
    }
  }
  return text;
}

function attendancePhase3TimeOnly(value, timezone) {
  var resolvedTimezone = String(timezone || StaffAttendancePhase3.TIME_ZONE || "Africa/Cairo");
  if (Object.prototype.toString.call(value) === "[object Date]" &&
      !isNaN(value.getTime())) {
    return Utilities.formatDate(value, resolvedTimezone, "HH:mm");
  }
  var text = String(value || "").trim();
  if (/^\d{2}:\d{2}$/.test(text)) return text;
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    var instant = new Date(text);
    if (!isNaN(instant.getTime())) {
      return Utilities.formatDate(instant, resolvedTimezone, "HH:mm");
    }
  }
  return text;
}

function attendancePhase3ReadDays() {
  var rows = schedulePhase2ReadRows("ATTENDANCE");
  return rows.filter(function (item) { return !!String(item.attendanceDayId || "").trim(); })
    .map(function (item) {
      item.attendanceDate = attendancePhase3DateOnly(item.attendanceDate, item.timezone);
      item.scheduledStart = attendancePhase3TimeOnly(item.scheduledStart, item.timezone);
      item.scheduledEnd = attendancePhase3TimeOnly(item.scheduledEnd, item.timezone);
      item.staffId = schedulePhase2Text(item.staffId);
      [
        "scheduleSourceIds", "shiftSegments", "calculationWarnings",
        "policySnapshot", "scheduleSnapshot", "sourceEventIds", "sessions", "breaks"
      ].forEach(function (key) {
        if (typeof item[key] === "string") {
          try { item[key] = JSON.parse(item[key]); } catch (_error) { item[key] = []; }
        }
      });
      item.locked = item.locked === true || String(item.locked).toUpperCase() === "TRUE";
      item.openSession = item.openSession === true || String(item.openSession).toUpperCase() === "TRUE";
      item.openBreak = item.openBreak === true || String(item.openBreak).toUpperCase() === "TRUE";
      item.staleCalculation = item.staleCalculation === true ||
        String(item.staleCalculation).toUpperCase() === "TRUE";
      return item;
    });
}

function attendancePhase3ReadLegacy() {
  var sheet = schedulePhase2Sheet("ATTENDANCE", false);
  if (!sheet || sheet.getLastRow() < 2) return [];
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  return StaffAttendancePhase3.normalizeLegacyAttendanceRows(headers, rows)
    .filter(function (item) {
      return !String(item.attendanceDayId || "").trim();
    });
}

function attendancePhase3Unique(rows, key, value, code) {
  var matches = rows.filter(function (item) {
    return String(item[key] || "").trim() === String(value || "").trim();
  });
  if (matches.length > 1) {
    var error = new Error("Duplicate attendance entity mapping.");
    error.code = code;
    throw error;
  }
  return matches[0] || null;
}

function attendancePhase3CreateRepository() {
  return {
    listStaff: schedulePhase2ReadStaff,
    getStaff: function (staffId) {
      return attendancePhase3Unique(schedulePhase2ReadStaff(), "staffId", staffId,
        "ATTENDANCE_STAFF_ID_AMBIGUOUS");
    },
    listDays: function (filters) {
      filters = filters || {};
      return attendancePhase3ReadDays().filter(function (item) {
        return (!filters.staffId || item.staffId === filters.staffId) &&
          (!filters.date || item.attendanceDate === filters.date) &&
          (!filters.dateFrom || item.attendanceDate >= filters.dateFrom) &&
          (!filters.dateTo || item.attendanceDate <= filters.dateTo);
      });
    },
    getDay: function (dayId) {
      return attendancePhase3Unique(attendancePhase3ReadDays(), "attendanceDayId", dayId,
        "ATTENDANCE_DAY_ID_AMBIGUOUS");
    },
    saveDay: function (record) {
      var existing = attendancePhase3ReadDays().filter(function (item) {
        return item.attendanceDayId === record.attendanceDayId;
      });
      if (existing.length > 1) {
        var ambiguous = new Error("Attendance day ID is ambiguous.");
        ambiguous.code = "ATTENDANCE_DAY_ID_AMBIGUOUS";
        throw ambiguous;
      }
      if (existing[0] && !existing[0].attendanceDayId) {
        var legacy = new Error("Legacy attendance rows are immutable.");
        legacy.code = "ATTENDANCE_LEGACY_READ_ONLY";
        throw legacy;
      }
      return attendancePhase3Save("ATTENDANCE",
        StaffAttendancePhase3.SHEET_SCHEMAS.ATTENDANCE, "ATTENDANCE_DAY_ID", record, false);
    },
    listEvents: function (filters) {
      filters = filters || {};
      return schedulePhase2ReadRows("ATTENDANCE_EVENTS").filter(function (item) {
        return (!filters.attendanceDayId || item.attendanceDayId === filters.attendanceDayId) &&
          (!filters.staffId || item.staffId === filters.staffId);
      });
    },
    getEvent: function (eventId) {
      return attendancePhase3Unique(schedulePhase2ReadRows("ATTENDANCE_EVENTS"),
        "eventId", eventId, "ATTENDANCE_EVENT_ID_AMBIGUOUS");
    },
    appendEvent: function (record) {
      return attendancePhase3Save("ATTENDANCE_EVENTS",
        StaffAttendancePhase3.SHEET_SCHEMAS.ATTENDANCE_EVENTS, "EVENT_ID", record, true);
    },
    listAdjustments: function (filters) {
      filters = filters || {};
      return schedulePhase2ReadRows("ATTENDANCE_ADJUSTMENTS").filter(function (item) {
        return (!filters.attendanceDayId || item.attendanceDayId === filters.attendanceDayId) &&
          (!filters.status || String(item.status).toUpperCase() === String(filters.status).toUpperCase());
      });
    },
    getAdjustment: function (adjustmentId) {
      return attendancePhase3Unique(schedulePhase2ReadRows("ATTENDANCE_ADJUSTMENTS"),
        "adjustmentId", adjustmentId, "ATTENDANCE_ADJUSTMENT_ID_AMBIGUOUS");
    },
    saveAdjustment: function (record) {
      return attendancePhase3Save("ATTENDANCE_ADJUSTMENTS",
        StaffAttendancePhase3.SHEET_SCHEMAS.ATTENDANCE_ADJUSTMENTS,
        "ADJUSTMENT_ID", record, false);
    },
    listOvertime: function (filters) {
      filters = filters || {};
      return schedulePhase2ReadRows("ATTENDANCE_OVERTIME_APPROVALS").filter(function (item) {
        return !filters.attendanceDayId || item.attendanceDayId === filters.attendanceDayId;
      });
    },
    getOvertime: function (approvalId) {
      return attendancePhase3Unique(schedulePhase2ReadRows("ATTENDANCE_OVERTIME_APPROVALS"),
        "overtimeApprovalId", approvalId, "ATTENDANCE_OVERTIME_ID_AMBIGUOUS");
    },
    appendOvertime: function (record) {
      return attendancePhase3Save("ATTENDANCE_OVERTIME_APPROVALS",
        StaffAttendancePhase3.SHEET_SCHEMAS.ATTENDANCE_OVERTIME_APPROVALS,
        "OVERTIME_APPROVAL_ID", record, true);
    },
    listPolicies: function () { return schedulePhase2ReadRows("STAFF_WORK_POLICIES"); },
    getPolicy: function (policyId) {
      return attendancePhase3Unique(schedulePhase2ReadRows("STAFF_WORK_POLICIES"),
        "policyId", policyId, "WORK_POLICY_ID_AMBIGUOUS");
    },
    savePolicy: function (record) {
      return attendancePhase3Save("STAFF_WORK_POLICIES",
        StaffAttendancePhase3.SHEET_SCHEMAS.STAFF_WORK_POLICIES,
        "POLICY_ID", record, false);
    },
    listLegacy: attendancePhase3ReadLegacy,
    appendAudit: function (record) {
      return attendancePhase3Save("STAFF_ATTENDANCE_AUDIT",
        StaffAttendancePhase3.SHEET_SCHEMAS.STAFF_ATTENDANCE_AUDIT,
        "ACTION_ID", record, true);
    },
    listAudit: function (filters) {
      filters = filters || {};
      return schedulePhase2ReadRows("STAFF_ATTENDANCE_AUDIT").filter(function (item) {
        return (!filters.entityId || item.entityId === filters.entityId) &&
          (!filters.staffId || item.staffId === filters.staffId);
      });
    },
    getIdempotency: function (requestId) {
      var row = attendancePhase3Unique(schedulePhase2ReadRows("STAFF_ATTENDANCE_IDEMPOTENCY"),
        "requestId", requestId, "ATTENDANCE_IDEMPOTENCY_AMBIGUOUS");
      if (row) {
        row.requestFingerprint = row.requestFingerprint || row.fingerprint;
        row.responseJson = typeof row.response === "object"
          ? JSON.stringify(row.response) : (row.responseJson || row.response || "");
      }
      return row;
    },
    saveIdempotency: function (record) {
      return attendancePhase3Save("STAFF_ATTENDANCE_IDEMPOTENCY",
        StaffAttendancePhase3.SHEET_SCHEMAS.STAFF_ATTENDANCE_IDEMPOTENCY,
        "REQUEST_ID", record, false);
    },
    withTransaction: attendancePhase3WithTransaction
  };
}

function attendancePhase3ResolveSchedule(staff, date) {
  var policies = schedulePhase2ReadRows("STAFF_WORK_POLICIES");
  var policyResolution;
  try {
    policyResolution = StaffAttendanceCore.resolveEffectivePolicy(policies, staff.staffId, date);
  } catch (error) {
    if (error.code !== "POLICY_NOT_FOUND") throw error;
    policyResolution = { source: "SAFE_DEFAULT", policyId: "PHASE3_SAFE_DEFAULT",
      snapshot: { requiredDailyMinutes: 0, allowedBreakMinutes: 0 } };
  }
  return StaffSchedulingPhase2.resolveSchedule({
    staff: staff, date: date, schedules: schedulePhase2ReadSchedules(),
    overrides: schedulePhase2ReadRows("STAFF_SCHEDULE_OVERRIDES"),
    policyResolution: policyResolution
  });
}

function attendancePhase3WithLock(_details, callback) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    var error = new Error("Another attendance mutation is in progress.");
    error.code = "ATTENDANCE_WRITE_LOCK_TIMEOUT";
    throw error;
  }
  try { return callback(); } finally { lock.releaseLock(); }
}

function attendancePhase3AssertEnvironmentIdentity() {
  var config = getCutHubEnvironmentConfig();
  var spreadsheet = SpreadsheetApp.getActive();
  if (!config.environment ||
      ["development", "test", "staging", "production"].indexOf(config.environment) === -1) {
    var environmentError = new Error("Attendance environment identity is invalid.");
    environmentError.code = "ATTENDANCE_ENVIRONMENT_IDENTITY_INVALID";
    throw environmentError;
  }
  if (!config.spreadsheetId || !spreadsheet || spreadsheet.getId() !== config.spreadsheetId) {
    var spreadsheetError = new Error("Attendance spreadsheet identity does not match configuration.");
    spreadsheetError.code = "ATTENDANCE_SPREADSHEET_IDENTITY_MISMATCH";
    throw spreadsheetError;
  }
  return { config: config, spreadsheet: spreadsheet };
}

function attendancePhase3AssertWriteReady() {
  [
    "ATTENDANCE", "ATTENDANCE_EVENTS", "ATTENDANCE_ADJUSTMENTS",
    "ATTENDANCE_OVERTIME_APPROVALS", "STAFF_WORK_POLICIES",
    "STAFF_ATTENDANCE_AUDIT", "STAFF_ATTENDANCE_IDEMPOTENCY"
  ].forEach(function (name) {
    schedulePhase2AssertHeaders(name, StaffAttendancePhase3.SHEET_SCHEMAS[name]);
  });
}

function attendancePhase3AssertPreviewEnvironment() {
  var config = getCutHubEnvironmentConfig();
  var environment = String(config.environment || "").toLowerCase();
  if (environment === "production") {
    var blocked = new Error("Phase 3 migration preview cannot access production.");
    blocked.code = "PHASE3_ENVIRONMENT_BLOCKED";
    throw blocked;
  }
  if (["development", "test", "staging"].indexOf(environment) === -1) {
    var invalid = new Error("Phase 3 migration preview requires a recognized environment identity.");
    invalid.code = "ATTENDANCE_ENVIRONMENT_IDENTITY_INVALID";
    throw invalid;
  }
  if (environment === "staging") {
    return assertStagingEnvironment().config;
  }
  return config;
}

function previewAttendanceMigration(data) {
  data = data && typeof data === "object" ? data : {};
  var config = attendancePhase3AssertPreviewEnvironment();
  var identity = attendancePhase3AssertEnvironmentIdentity();
  var existing = {};
  Object.keys(StaffAttendancePhase3.SHEET_SCHEMAS).forEach(function (name) {
    var sheet = identity.spreadsheet.getSheetByName(name);
    existing[name] = sheet ? schedulePhase2Headers(sheet) : null;
  });
  return StaffAttendancePhase3.planAttendanceMigration(existing, {
    environment: identity.config.environment,
    expectedSpreadsheetId: identity.config.spreadsheetId,
    actualSpreadsheetId: identity.spreadsheet.getId(),
    environmentReviewApproved: config.environment === "staging"
  });
}

function diagnosticPreviewAttendanceMigration(data) {
  var config = getCutHubEnvironmentConfig();
  var environment = String(config.environment || "").toLowerCase();
  if (["development", "staging"].indexOf(environment) === -1) {
    var blocked = new Error("Attendance migration diagnostic preview is limited to development and staging.");
    blocked.code = "ATTENDANCE_DIAGNOSTIC_PREVIEW_ENVIRONMENT_BLOCKED";
    throw blocked;
  }
  if (environment === "staging") assertStagingEnvironment();
  var result = previewAttendanceMigration(data);
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function attendancePhase3RunDiagnosticPreview(data) {
  var config = getCutHubEnvironmentConfig();
  var environment = String(config.environment || "").toLowerCase();
  if (["development", "staging"].indexOf(environment) === -1) {
    var blocked = new Error("Attendance migration diagnostic preview is limited to development and staging.");
    blocked.code = "ATTENDANCE_DIAGNOSTIC_PREVIEW_ENVIRONMENT_BLOCKED";
    throw blocked;
  }
  if (environment === "staging") assertStagingEnvironment();
  return previewAttendanceMigration(data);
}

function diagnosticPreviewAttendanceMigrationSummary(data) {
  var result = attendancePhase3RunDiagnosticPreview(data);
  console.log(JSON.stringify({
    schemaVersion: result.schemaVersion,
    dryRun: result.dryRun,
    writes: result.writes,
    identity: result.identity,
    createSheetNames: (result.createSheets || []).map(function (item) { return item.sheetName; }),
    initializeBlankSheetNames: (result.initializeBlankSheets || []).map(function (item) {
      return item.sheetName;
    }),
    appendColumnSheetNames: Object.keys(result.appendColumns || {}),
    unchangedSheetNames: result.unchangedSheets || [],
    errorCodes: (result.errors || []).map(function (item) { return item.code; }),
    safe: result.safe
  }));
  return result;
}

function diagnosticPreviewAttendanceMigrationSheets(data) {
  var result = attendancePhase3RunDiagnosticPreview(data);
  (result.createSheets || []).forEach(function (item) {
    console.log(JSON.stringify({
      sheetName: item.sheetName,
      headerCount: (item.headers || []).length,
      headers: item.headers || []
    }));
  });
  return result;
}

function diagnosticPreviewAttendanceMigrationColumns(data) {
  var result = attendancePhase3RunDiagnosticPreview(data);
  console.log(JSON.stringify({
    appendColumns: result.appendColumns || {},
    preservedUnknownColumns: result.preservedUnknownColumns || {}
  }));
  return result;
}

function diagnosticPreviewAttendanceMigrationSafety(data) {
  var result = attendancePhase3RunDiagnosticPreview(data);
  console.log(JSON.stringify({
    errors: result.errors || [],
    rollback: result.rollback || {},
    safe: result.safe,
    dryRun: result.dryRun,
    writes: result.writes,
    historicalRowsTouched: result.rollback && result.rollback.historicalRowsTouched
  }));
  return result;
}

function handleStaffAttendancePhase3Action(data) {
  try {
    if (!StaffAttendancePhase3 ||
        StaffAttendancePhase3.ACTIONS.indexOf(data.action) === -1) {
      throw StaffAttendancePhase3.attendanceError(
        "ATTENDANCE_ACTION_UNKNOWN", "Attendance action is not supported.");
    }
    if (data.action === "previewAttendanceMigration") {
      attendancePhase3AssertPreviewEnvironment();
      var previewActor = schedulePhase2Actor(data);
      if (!previewActor || !previewActor.owner) {
        throw StaffAttendancePhase3.attendanceError(
          "ATTENDANCE_OWNER_REQUIRED", "Only owner can preview attendance migration.");
      }
      return jsonOutput({
        status: "success", code: "ATTENDANCE_MIGRATION_PREVIEW_OK",
        migration: StaffAttendancePhase3.filterSensitiveFields(previewAttendanceMigration(data))
      });
    }
    attendancePhase3AssertEnvironmentIdentity();
    if (StaffAttendancePhase3.WRITE_ACTIONS.has(data.action)) attendancePhase3AssertWriteReady();
    var service = StaffAttendancePhase3.createService({
      repository: attendancePhase3CreateRepository(),
      actorResolver: schedulePhase2Actor,
      scheduleResolver: attendancePhase3ResolveSchedule,
      withLock: function (details, callback) {
        return attendancePhase3WithLock(details, function () {
          if (typeof publishOperationalMutationTransactionUnderCurrentLock === "function") {
            return publishOperationalMutationTransactionUnderCurrentLock(
              "attendance", data, callback);
          }
          var mutationResult = callback();
          if (typeof publishOperationalMutationUnderCurrentLock === "function") {
            publishOperationalMutationUnderCurrentLock("attendance", data, mutationResult);
          }
          return mutationResult;
        });
      },
      now: attendancePhase3IsoNow,
      uuid: function () { return Utilities.getUuid(); }
    });
    var result = service.execute(data.action, data);
    return jsonOutput(result);
  } catch (error) {
    return jsonOutput({
      status: "error", code: error.code || "ATTENDANCE_INTERNAL_ERROR",
      message: error.message || "Attendance request failed.",
      details: StaffAttendancePhase3.filterSensitiveFields(error.details || undefined)
    });
  }
}

/* END staff-attendance-phase3-gas.js */