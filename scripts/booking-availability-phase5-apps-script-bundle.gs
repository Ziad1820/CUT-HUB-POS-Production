/* GENERATED FILE. Upload this bundle instead of the constituent Phase 1-5 modules. */
/* Order: schema -> Phase 1 core -> Phase 2 -> Phase 3 -> Phase 4 -> Staging schema executor -> Core Auth bootstrap -> Phase 5 contract -> Branch Foundation -> Canonical branch row -> Phase 5 GAS. */

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
  return {
    username: username,
    actorId: username,
    actorName: schedulePhase2Text(user.displayName || username),
    role: owner ? "OWNER" : schedulePhase2Text(scope.role || "EMPLOYEE"),
    staffId: owner ? "" : schedulePhase2Text(scope.staffId),
    branchIds: owner ? [] : (Array.isArray(scope.branchIds) ? scope.branchIds : []),
    permissions: normalizeManagedPermissions(user.username, user.permissions),
    owner: owner
  };
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

/* BEGIN staff-import-preview-staging.js */
/* global BookingAvailabilityPhase5, DriveApp, Session,
  StaffSchedulingPhase2, assertStagingEnvironment, getCutHubEnvironmentConfig,
  schedulePhase2AssertHeaders, schedulePhase2ReadRows */

/**
 * Read-only, owner-authorized Staging preview for a reviewed STAFF append plan.
 * This module intentionally exposes no execute or mutation entry point.
 */

function staffImportPreviewError(code, message, details) {
  var error = new Error(message || code);
  error.code = code;
  if (details !== undefined) error.details = details;
  return error;
}

function staffImportPreviewText(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function staffImportPreviewStagingIdentityAndOwner() {
  var config = getCutHubEnvironmentConfig();
  var environment = staffImportPreviewText(config.environment).toLowerCase();
  if (environment !== "staging") {
    throw staffImportPreviewError(
      "STAFF_IMPORT_STAGING_ONLY", "STAFF import Preview is restricted to Staging."
    );
  }
  if (!config.spreadsheetId || !config.stagingSpreadsheetId ||
      config.spreadsheetId !== config.stagingSpreadsheetId) {
    throw staffImportPreviewError(
      "STAFF_IMPORT_STAGING_PIN_MISMATCH", "Expected and Staging Spreadsheet pins must match."
    );
  }
  var strict = assertStagingEnvironment();
  if (!strict || !strict.spreadsheet ||
      strict.spreadsheet.getId() !== config.spreadsheetId ||
      strict.spreadsheet.getId() !== config.stagingSpreadsheetId) {
    throw staffImportPreviewError(
      "STAFF_IMPORT_STAGING_IDENTITY_MISMATCH", "Strict Staging identity validation failed."
    );
  }
  var effectiveEmail = "";
  var activeEmail = "";
  var ownerEmail = "";
  try {
    effectiveEmail = staffImportPreviewText(Session.getEffectiveUser().getEmail()).toLowerCase();
    activeEmail = staffImportPreviewText(Session.getActiveUser().getEmail()).toLowerCase();
    ownerEmail = staffImportPreviewText(
      DriveApp.getFileById(strict.spreadsheet.getId()).getOwner().getEmail()
    ).toLowerCase();
  } catch (_error) {
    effectiveEmail = "";
    activeEmail = "";
    ownerEmail = "";
  }
  if (!effectiveEmail || !activeEmail || !ownerEmail ||
      effectiveEmail !== activeEmail || activeEmail !== ownerEmail) {
    throw staffImportPreviewError(
      "STAFF_IMPORT_OWNER_REQUIRED", "Only the verified interactive Staging owner can run this Preview."
    );
  }
  return { config: config, spreadsheet: strict.spreadsheet, actorIdentity: effectiveEmail };
}

function staffImportPreviewActiveBranches() {
  schedulePhase2AssertHeaders(
    "BOOKING_BRANCH_REGISTRY",
    BookingAvailabilityPhase5.SHEET_SCHEMAS.BOOKING_BRANCH_REGISTRY
  );
  return schedulePhase2ReadRows("BOOKING_BRANCH_REGISTRY").filter(function (branch) {
    var active = branch.active === true || String(branch.active || "").toUpperCase() === "TRUE";
    return active && staffImportPreviewText(branch.branchId) && staffImportPreviewText(branch.branchName);
  });
}

function staffImportPreviewCanonicalValue(row, header) {
  if (Object.prototype.hasOwnProperty.call(row, header)) return row[header];
  var camel = header.toLowerCase().replace(/_([a-z])/g, function (_match, letter) {
    return letter.toUpperCase();
  });
  return row[camel];
}

function staffImportPreviewNormalizeApprovedRows(rows) {
  var headers = StaffSchedulingPhase2.PHASE2_SHEET_SCHEMAS.STAFF;
  return rows.map(function (row) {
    var result = {};
    headers.forEach(function (header) {
      result[header] = staffImportPreviewCanonicalValue(row || {}, header);
    });
    return result;
  });
}

function staffImportPreviewNumber(value) {
  var number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function staffImportPreviewCode(value) {
  return staffImportPreviewText(value).toUpperCase();
}

function staffImportPreviewRowsEqual(left, right) {
  return StaffSchedulingPhase2.PHASE2_SHEET_SCHEMAS.STAFF.filter(function (header) {
    return header !== "CREATED_AT" && header !== "UPDATED_AT";
  }).every(function (header) {
    var leftValue = staffImportPreviewCanonicalValue(left, header);
    var rightValue = staffImportPreviewCanonicalValue(right, header);
    if (["SALARY", "PERCENTAGE", "BONUS", "DEDUCTION"].indexOf(header) !== -1) {
      return staffImportPreviewNumber(leftValue) === staffImportPreviewNumber(rightValue);
    }
    if (header === "ACTIVE" || header === "IS_BARBER") {
      return Boolean(leftValue) === Boolean(rightValue);
    }
    return staffImportPreviewText(leftValue) === staffImportPreviewText(rightValue);
  });
}

function staffImportPreviewHash(rows) {
  var input = JSON.stringify(rows.map(function (row) {
    return StaffSchedulingPhase2.PHASE2_SHEET_SCHEMAS.STAFF.map(function (header) {
      return staffImportPreviewCanonicalValue(row, header);
    });
  }));
  var result = 2166136261;
  for (var index = 0; index < input.length; index += 1) {
    result ^= input.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(16).padStart(8, "0");
}

function staffImportPreviewPlan(canonicalRows, existingRows) {
  var errors = [];
  var sourceIds = {};
  var sourceCodes = {};
  canonicalRows.forEach(function (row, index) {
    var id = staffImportPreviewText(row.ID);
    var code = staffImportPreviewCode(row.CODE);
    if (sourceIds[id] !== undefined) {
      errors.push({ code: "STAFF_IMPORT_DUPLICATE_ID", id: id,
        sourceIndexes: [sourceIds[id], index] });
    } else sourceIds[id] = index;
    if (sourceCodes[code] !== undefined) {
      errors.push({ code: "STAFF_IMPORT_DUPLICATE_CODE", staffCode: code,
        sourceIndexes: [sourceCodes[code], index] });
    } else sourceCodes[code] = index;
  });

  var existingById = {};
  var existingByCode = {};
  existingRows.forEach(function (row, index) {
    var id = staffImportPreviewText(staffImportPreviewCanonicalValue(row, "ID"));
    var code = staffImportPreviewCode(staffImportPreviewCanonicalValue(row, "CODE"));
    if (id) {
      if (existingById[id]) errors.push({ code: "STAFF_EXISTING_DUPLICATE_ID", id: id });
      else existingById[id] = { row: row, index: index };
    }
    if (code) {
      if (existingByCode[code]) errors.push({ code: "STAFF_EXISTING_DUPLICATE_CODE", staffCode: code });
      else existingByCode[code] = { row: row, index: index };
    }
  });

  var proposedRows = [];
  var unchangedCount = 0;
  canonicalRows.forEach(function (row, sourceIndex) {
    var id = staffImportPreviewText(row.ID);
    var code = staffImportPreviewCode(row.CODE);
    var sameId = existingById[id];
    var sameCode = existingByCode[code];
    if (sameId) {
      if (staffImportPreviewRowsEqual(sameId.row, row)) unchangedCount += 1;
      else errors.push({ code: "STAFF_IMPORT_EXISTING_ID_CONFLICT", sourceIndex: sourceIndex,
        existingRow: sameId.index });
      return;
    }
    if (sameCode) {
      errors.push({ code: "STAFF_IMPORT_EXISTING_CODE_CONFLICT", sourceIndex: sourceIndex,
        existingRow: sameCode.index });
      return;
    }
    proposedRows.push(row);
  });
  return { errors: errors, proposedRows: proposedRows, unchangedCount: unchangedCount,
    planHash: staffImportPreviewHash(canonicalRows) };
}

function previewStaffImportStaging(data) {
  data = data && typeof data === "object" ? data : {};
  try {
    var identity = staffImportPreviewStagingIdentityAndOwner();
    var approvedRows = Array.isArray(data.proposedRows) ? data.proposedRows : [];
    if (approvedRows.length !== 6) {
      throw staffImportPreviewError(
        "STAFF_IMPORT_APPROVED_ROW_COUNT_INVALID", "Exactly six approved STAFF rows are required.",
        { expected: 6, actual: approvedRows.length }
      );
    }
    var canonicalRows = staffImportPreviewNormalizeApprovedRows(approvedRows);
    schedulePhase2AssertHeaders("STAFF", StaffSchedulingPhase2.PHASE2_SHEET_SCHEMAS.STAFF);
    var existingRows = schedulePhase2ReadRows("STAFF");
    var activeBranches = staffImportPreviewActiveBranches();
    if (activeBranches.length !== 1) {
      throw staffImportPreviewError(
        "STAFF_IMPORT_CANONICAL_BRANCH_COUNT_INVALID",
        "Exactly one active canonical branch is required.", { activeBranchCount: activeBranches.length }
      );
    }
    var branchId = staffImportPreviewText(activeBranches[0].branchId);
    var timestamp = staffImportPreviewText(canonicalRows[0].CREATED_AT);
    var contractErrors = [];
    canonicalRows.forEach(function (row, index) {
      if (!staffImportPreviewText(row.NAME) || !staffImportPreviewText(row.CODE) ||
          !staffImportPreviewText(row.ID) || staffImportPreviewNumber(row.SALARY) === null ||
          staffImportPreviewNumber(row.SALARY) < 0 || typeof row.IS_BARBER !== "boolean") {
        contractErrors.push({ code: "STAFF_IMPORT_APPROVED_ROW_REQUIRED_VALUE_INVALID", sourceIndex: index });
      }
      if (staffImportPreviewNumber(row.PERCENTAGE) !== 0 ||
          staffImportPreviewNumber(row.BONUS) !== 0 ||
          staffImportPreviewNumber(row.DEDUCTION) !== 0 ||
          row.ACTIVE !== true || staffImportPreviewText(row.CREATED_AT) !== timestamp ||
          staffImportPreviewText(row.UPDATED_AT) !== timestamp ||
          staffImportPreviewText(row.BRANCH_ID) !== branchId) {
        contractErrors.push({ code: "STAFF_IMPORT_APPROVED_ROW_CONTRACT_INVALID", sourceIndex: index });
      }
    });
    if (!timestamp || Number.isNaN(Date.parse(timestamp))) {
      contractErrors.push({ code: "STAFF_IMPORT_TIMESTAMP_INVALID" });
    }
    var plan = staffImportPreviewPlan(canonicalRows, existingRows);
    var errors = contractErrors.concat(plan.errors || []);
    var safe = errors.length === 0;
    return {
      schemaVersion: "STAFF_STAGING_IMPORT_PREVIEW_V1",
      dryRun: true,
      writes: 0,
      safe: safe,
      identity: {
        environment: identity.config.environment,
        expectedSpreadsheetId: identity.config.spreadsheetId,
        actualSpreadsheetId: identity.spreadsheet.getId()
      },
      branch: { branchId: branchId, branchName: activeBranches[0].branchName },
      sourceCount: canonicalRows.length,
      existingStaffRowCount: existingRows.length,
      unchangedCount: plan.unchangedCount,
      proposedCount: plan.proposedRows.length,
      errors: errors,
      appendOperations: safe ? plan.proposedRows.map(function (row) {
        return { type: "APPEND_ROW", sheetName: "STAFF", row: row };
      }) : [],
      planHash: plan.planHash
    };
  } catch (error) {
    return {
      schemaVersion: "STAFF_STAGING_IMPORT_PREVIEW_V1",
      dryRun: true,
      writes: 0,
      safe: false,
      sourceCount: Array.isArray(data.proposedRows) ? data.proposedRows.length : 0,
      proposedCount: 0,
      appendOperations: [],
      errors: [{ code: error.code || "STAFF_IMPORT_PREVIEW_FAILED", message: error.message,
        details: error.details || null }]
    };
  }
}

/* END staff-import-preview-staging.js */

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

/* BEGIN staff-payroll-attendance-phase4.js */
(function (root, factory) {
  const schema = typeof module !== "undefined" && module.exports
    ? require("./staff-attendance-schema") : root.StaffAttendanceSchema;
  const core = typeof module !== "undefined" && module.exports
    ? require("./staff-attendance-core") : root.StaffAttendanceCore;
  const api = factory(schema, core);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.StaffPayrollAttendancePhase4 = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (schema, core) {
  "use strict";

  const VERSION = "PAYROLL_ATTENDANCE_PHASE4_V1";
  const TIME_ZONE = "Africa/Cairo";
  const CURRENCY = "EGP";
  const MINOR_SCALE = 2;
  const PERIOD_STATUSES = Object.freeze([
    "DRAFT", "CALCULATED", "UNDER_REVIEW", "APPROVED", "LOCKED", "REOPENED"
  ]);
  const ACTIONS = Object.freeze([
    "listPayrollPeriods", "createPayrollPeriod", "calculatePayrollPeriod",
    "getEmployeePayrollSettlement", "listEmployeePayrollSettlements",
    "recalculateEmployeePayrollSettlement", "recalculatePayrollPeriod",
    "submitPayrollPeriodForReview", "approvePayrollPeriod", "lockPayrollPeriod",
    "reopenPayrollPeriod", "requestPayrollManualAdjustment",
    "approvePayrollManualAdjustment", "rejectPayrollManualAdjustment",
    "getPayrollSettlementAudit", "getUnresolvedPayrollBlockers",
    "previewPayrollAttendanceExport", "exportPayrollAttendanceReport",
    "previewPayrollPhase4Migration"
  ]);
  const READ_ACTIONS = new Set([
    "listPayrollPeriods", "getEmployeePayrollSettlement",
    "listEmployeePayrollSettlements", "getPayrollSettlementAudit",
    "getUnresolvedPayrollBlockers", "previewPayrollAttendanceExport",
    "previewPayrollPhase4Migration"
  ]);
  const WRITE_ACTIONS = new Set(ACTIONS.filter((action) => !READ_ACTIONS.has(action)));
  const SECRET = /password|token|secret|fingerprint|spreadsheet|environment|recovery|requestid|lastrequestid/i;
  const FINANCIAL = /salary|rate|amount|deduction|compensation|minor$|baseperiod|currency|manual|grossattendanceadjustment|netattendanceadjustment|value/i;
  const BLOCKING_DAY_STATUSES = new Set(["UNRESOLVED", "NOT_STARTED", "CHECKED_IN", "ON_BREAK"]);
  const PAID_LEAVE = new Set(["APPROVED_LEAVE", "PAID_LEAVE", "TRAINING"]);
  const EXEMPT_DAY = new Set(["WEEKLY_DAY_OFF", "DAY_OFF", "BRANCH_CLOSED", "CLOSED"]);
  const ABSENCE = new Set(["ABSENT", "PLANNED_ABSENT", "MANAGER_MARK_ABSENT"]);

  function error(code, message, details) {
    const result = new Error(message);
    result.code = code;
    if (details !== undefined) result.details = details;
    return result;
  }
  function text(value) { return String(value === undefined || value === null ? "" : value).trim(); }
  function upper(value) { return text(value).toUpperCase(); }
  function bool(value) {
    if (value === true || value === false) return value;
    return ["TRUE", "YES", "1"].includes(upper(value));
  }
  function number(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : (fallback === undefined ? 0 : fallback);
  }
  function present(value) {
    return value !== undefined && value !== null && value !== "";
  }
  function integer(value, name) {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed)) {
      throw error("PAYROLL_INTEGER_REQUIRED", `${name || "Value"} must be a safe integer.`);
    }
    return parsed;
  }
  function nonNegativeInteger(value, name) {
    const parsed = integer(value, name);
    if (parsed < 0) throw error("PAYROLL_NEGATIVE_VALUE", `${name || "Value"} cannot be negative.`);
    return parsed;
  }
  function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
  function stable(value) {
    if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }
  function parseJson(value, fallback) {
    if (value && typeof value === "object") return clone(value);
    try { return JSON.parse(text(value)); } catch (_error) { return clone(fallback); }
  }
  function requireText(value, code, message) {
    const result = text(value);
    if (!result) throw error(code, message);
    return result;
  }
  function dateKey(value) { return core.parseDateKey(value).text; }
  function dateRange(start, end) {
    const first = core.parseDateKey(start);
    const last = core.parseDateKey(end);
    if (last.epochDay < first.epochDay) {
      throw error("PAYROLL_PERIOD_DATE_RANGE_INVALID", "Payroll period end date precedes start date.");
    }
    if (last.epochDay - first.epochDay > 366) {
      throw error("PAYROLL_PERIOD_TOO_LONG", "Payroll period cannot exceed 367 days.");
    }
    return { start: first.text, end: last.text, days: last.epochDay - first.epochDay + 1 };
  }
  function dateKeysBetween(start, end) {
    const range = dateRange(start, end);
    const first = core.parseDateKey(range.start);
    const result = [];
    for (let offset = 0; offset < range.days; offset += 1) {
      const value = new Date(Date.UTC(first.year, first.month - 1, first.day + offset));
      result.push([
        value.getUTCFullYear(),
        String(value.getUTCMonth() + 1).padStart(2, "0"),
        String(value.getUTCDate()).padStart(2, "0")
      ].join("-"));
    }
    return result;
  }
  function parseMajorToMinor(value, currency) {
    if (upper(currency || CURRENCY) !== CURRENCY) {
      throw error("PAYROLL_CURRENCY_UNSUPPORTED", "Only EGP is supported in Phase 4.");
    }
    if (typeof value === "number") {
      if (!Number.isFinite(value)) throw error("PAYROLL_MONEY_INVALID", "Money must be finite.");
      value = String(value);
    }
    const source = text(value);
    if (!/^-?\d+(?:\.\d{1,2})?$/.test(source)) {
      throw error("PAYROLL_PRECISION_UNSUPPORTED", "EGP values support at most two decimal places.");
    }
    const negative = source.startsWith("-");
    const clean = negative ? source.slice(1) : source;
    const parts = clean.split(".");
    const result = Number(parts[0]) * 100 + Number((parts[1] || "").padEnd(2, "0"));
    if (!Number.isSafeInteger(result)) throw error("PAYROLL_MONEY_OVERFLOW", "Money exceeds safe range.");
    return negative ? -result : result;
  }
  function parseDecimalToScaledInteger(value, digits, name) {
    const source = text(value);
    const places = nonNegativeInteger(digits, "decimal scale");
    if (!new RegExp(`^\\d+(?:\\.\\d{1,${places}})?$`).test(source)) {
      throw error("PAYROLL_PERCENTAGE_PRECISION_UNSUPPORTED",
        `${name || "Percentage"} supports at most ${places} decimal places.`);
    }
    const parts = source.split(".");
    const scale = 10 ** places;
    const result = checkedAdd(
      checkedMultiply(Number(parts[0]), scale),
      Number((parts[1] || "").padEnd(places, "0"))
    );
    return nonNegativeInteger(result, name || "scaled decimal");
  }
  function checkedAdd(left, right) {
    const first = integer(left, "money operand");
    const second = integer(right, "money operand");
    if ((second > 0 && first > Number.MAX_SAFE_INTEGER - second) ||
        (second < 0 && first < Number.MIN_SAFE_INTEGER - second)) {
      throw error("PAYROLL_MONEY_OVERFLOW", "Calculated money exceeds safe range.");
    }
    return first + second;
  }
  function checkedMultiply(left, right) {
    const first = integer(left, "money operand");
    const second = integer(right, "money operand");
    if (first !== 0 && Math.abs(second) > Math.floor(Number.MAX_SAFE_INTEGER / Math.abs(first))) {
      throw error("PAYROLL_MONEY_OVERFLOW", "Calculated money exceeds safe range.");
    }
    const result = first * second;
    if (!Number.isSafeInteger(result)) {
      throw error("PAYROLL_MONEY_OVERFLOW", "Calculated money exceeds safe range.");
    }
    return result;
  }
  function roundDivide(numerator, denominator) {
    let top = integer(numerator, "rounding numerator");
    const bottom = integer(denominator, "rounding denominator");
    if (bottom <= 0) throw error("PAYROLL_RATE_DENOMINATOR_INVALID", "Rate denominator must be positive.");
    const negative = top < 0;
    if (negative) top = -top;
    let rounded = Math.floor(top / bottom);
    const remainder = top % bottom;
    if (remainder >= Math.ceil(bottom / 2)) rounded = checkedAdd(rounded, 1);
    return negative ? -rounded : rounded;
  }
  function multiplyDivide(left, right, denominator) {
    return roundDivide(checkedMultiply(left, right), denominator);
  }
  function cap(value, maximum) {
    const max = number(maximum, 0);
    return max > 0 ? Math.min(value, nonNegativeInteger(max, "cap")) : value;
  }
  function actor(value) {
    const source = value || {};
    return Object.freeze({
      actorId: text(source.actorId || source.username),
      actorName: text(source.actorName || source.displayName || source.username),
      role: upper(source.role || "EMPLOYEE"),
      staffId: text(source.staffId),
      branchIds: Array.isArray(source.branchIds) ? source.branchIds.map(text).filter(Boolean) : [],
      permissions: Array.isArray(source.permissions) ? source.permissions.map(text) : [],
      owner: source.owner === true || text(source.username).toLowerCase() === "owner"
    });
  }
  function hasPermission(resolved, permission) {
    return resolved.owner || resolved.permissions.includes(permission);
  }
  function requirePermission(resolved, permission) {
    if (!resolved.actorId) throw error("PAYROLL_IDENTITY_UNKNOWN", "Authenticated identity is required.");
    if (!hasPermission(resolved, permission)) {
      throw error("PAYROLL_PERMISSION_DENIED", `Permission ${permission} is required.`);
    }
  }
  function assertBranch(resolved, branchId) {
    if (resolved.owner) return;
    if (!branchId || !resolved.branchIds.includes(text(branchId))) {
      throw error("PAYROLL_BRANCH_SCOPE_DENIED", "Payroll record is outside the actor branch scope.");
    }
  }
  function filterSecrets(value, allowFinancial) {
    if (Array.isArray(value)) return value.map((item) => filterSecrets(item, allowFinancial));
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !SECRET.test(key) && key !== "_rowNumber" &&
        (allowFinancial || !FINANCIAL.test(key)))
      .map(([key, item]) => {
        if (/Json$/i.test(key) && typeof item === "string") {
          const parsed = parseJson(item, null);
          return [key, parsed === null ? "" : stable(filterSecrets(parsed, allowFinancial))];
        }
        return [key, filterSecrets(item, allowFinancial)];
      }));
  }
  function canSeeFinancial(resolved) {
    return resolved.owner || [
      "payroll_attendance.calculate", "payroll_attendance.review",
      "payroll_attendance.approve", "payroll_attendance.lock",
      "payroll_attendance.reopen", "payroll_attendance.adjust",
      "payroll_attendance.export"
    ].some((permission) => hasPermission(resolved, permission));
  }
  function responseDto(value, resolved) {
    return filterSecrets(value, canSeeFinancial(resolved));
  }
  function policySnapshot(policy) {
    const source = policy || {};
    return Object.freeze({
      policyId: text(source.policyId),
      currency: upper(source.currency || CURRENCY),
      currencyMinorScale: number(source.currencyMinorScale, MINOR_SCALE),
      salaryBasis: upper(source.salaryBasis || "MONTHLY"),
      requiredDailyMinutes: number(source.requiredDailyMinutes, 0),
      monthlySalaryMinor: source.monthlySalaryMinor,
      monthlySalary: source.monthlySalary,
      fixedDayValue: source.fixedDayValue,
      hourlyRate: source.hourlyRate,
      deficitRateType: upper(source.deficitRateType || "SALARY_DERIVED"),
      deficitRateMinorPerMinute: present(source.deficitRateMinorPerMinute)
        ? nonNegativeInteger(source.deficitRateMinorPerMinute, "deficit rate minor per minute") : 0,
      deficitRatePerHour: source.deficitRatePerHour,
      dailyDeductionCapMinor: present(source.dailyDeductionCapMinor)
        ? nonNegativeInteger(source.dailyDeductionCapMinor, "daily deduction cap minor") : 0,
      dailyDeductionCap: source.dailyDeductionCap,
      periodDeductionCapMinor: present(source.periodDeductionCapMinor)
        ? nonNegativeInteger(source.periodDeductionCapMinor, "period deduction cap minor") : 0,
      overtimeRateType: upper(source.overtimeRateType ||
        (number(source.overtimeRatePerHour, 0) > 0 ? "FIXED_HOURLY" : "SALARY_DERIVED")),
      overtimeRateMinorPerMinute: present(source.overtimeRateMinorPerMinute)
        ? nonNegativeInteger(source.overtimeRateMinorPerMinute, "overtime rate minor per minute") : 0,
      overtimeRatePerHour: source.overtimeRatePerHour,
      overtimeMultiplierBps: present(source.overtimeMultiplierBps)
        ? nonNegativeInteger(source.overtimeMultiplierBps, "overtime multiplier basis points")
        : parseDecimalToScaledInteger(
          present(source.overtimeMultiplier) ? source.overtimeMultiplier : "1",
          4, "overtime multiplier"),
      periodOvertimeCapMinutes: number(source.periodOvertimeCapMinutes, 0),
      unpaidLeaveMultiplierBps: present(source.unpaidLeaveMultiplierBps)
        ? nonNegativeInteger(source.unpaidLeaveMultiplierBps, "unpaid leave multiplier") : 10000,
      absenceMultiplierBps: present(source.absenceMultiplierBps)
        ? nonNegativeInteger(source.absenceMultiplierBps, "absence multiplier") : 10000,
      sickLeavePaid: !(source.sickLeavePaid === false ||
        ["FALSE", "NO", "0"].includes(upper(source.sickLeavePaid))),
      unresolvedBehavior: upper(source.unresolvedBehavior || "BLOCK"),
      monthlyAllowedLeaveDays: number(source.monthlyAllowedLeaveDays, 0)
    });
  }
  function resolvePolicy(policies, staff, date) {
    const resolution = core.resolveEffectivePolicy(policies || [], staff.staffId, date);
    const snapshot = policySnapshot(resolution.snapshot);
    if (snapshot.currency !== CURRENCY || snapshot.currencyMinorScale !== MINOR_SCALE) {
      throw error("PAYROLL_CURRENCY_UNSUPPORTED", "Payroll policy currency or precision is unsupported.");
    }
    return { policyId: resolution.policyId, snapshot };
  }
  function resolveSalary(staff, policy, period, contractualMinutes, scheduledDays) {
    const currency = upper(staff.currency || policy.currency || CURRENCY);
    if (currency !== CURRENCY) throw error("PAYROLL_CURRENCY_UNSUPPORTED", "Only EGP salary is supported.");
    const basis = upper(staff.salaryBasis || policy.salaryBasis || "MONTHLY");
    const staffSalaryCandidates = [
      ["baseSalaryMinor", staff.baseSalaryMinor, (value) =>
        nonNegativeInteger(value, "base salary minor")],
      ["salaryMinor", staff.salaryMinor, (value) =>
        nonNegativeInteger(value, "salary minor")],
      ["salary", staff.salary, (value) => parseMajorToMinor(value, currency)],
      ["monthlySalary", staff.monthlySalary, (value) => parseMajorToMinor(value, currency)]
    ].filter((item) => present(item[1])).map((item) => ({
      field: item[0], value: item[2](item[1])
    }));
    if (new Set(staffSalaryCandidates.map((item) => item.value)).size > 1) {
      throw error("PAYROLL_SALARY_AMBIGUOUS",
        `Conflicting salary fields exist for staff ${staff.staffId}.`);
    }
    const policyMonthlyCandidates = [
      present(policy.monthlySalaryMinor)
        ? nonNegativeInteger(policy.monthlySalaryMinor, "policy salary minor") : null,
      present(policy.monthlySalary)
        ? parseMajorToMinor(policy.monthlySalary, currency) : null
    ].filter((value) => value !== null);
    if (!staffSalaryCandidates.length &&
        new Set(policyMonthlyCandidates).size > 1) {
      throw error("PAYROLL_SALARY_AMBIGUOUS",
        `Conflicting policy salary fields exist for staff ${staff.staffId}.`);
    }
    let baseSalaryMinor;
    if (staffSalaryCandidates.length) {
      baseSalaryMinor = staffSalaryCandidates[0].value;
    } else if (policy.monthlySalaryMinor !== undefined && policy.monthlySalaryMinor !== "") {
      baseSalaryMinor = nonNegativeInteger(policy.monthlySalaryMinor, "policy salary minor");
    } else if (basis === "DAILY" && policy.fixedDayValue !== undefined &&
        policy.fixedDayValue !== "") {
      baseSalaryMinor = parseMajorToMinor(policy.fixedDayValue, currency);
    } else if (basis === "HOURLY" && policy.hourlyRate !== undefined &&
        policy.hourlyRate !== "") {
      baseSalaryMinor = parseMajorToMinor(policy.hourlyRate, currency);
    } else if (policy.monthlySalary !== undefined && policy.monthlySalary !== "") {
      baseSalaryMinor = parseMajorToMinor(policy.monthlySalary, currency);
    } else {
      throw error("PAYROLL_SALARY_MISSING", `Salary is missing for staff ${staff.staffId}.`);
    }
    if (baseSalaryMinor < 0) throw error("PAYROLL_NEGATIVE_VALUE", "Salary cannot be negative.");
    let basePeriodAmountMinor;
    let rateNumerator;
    let rateDenominator;
    if (basis === "MONTHLY") {
      const start = core.parseDateKey(period.startDate);
      const end = core.parseDateKey(period.endDate);
      if (start.year !== end.year || start.month !== end.month) {
        throw error("PAYROLL_MONTHLY_PERIOD_AMBIGUOUS",
          "Monthly salary periods spanning calendar months require an explicit period salary.");
      }
      const calendarDays = new Date(Date.UTC(start.year, start.month, 0)).getUTCDate();
      basePeriodAmountMinor = multiplyDivide(baseSalaryMinor, period.days, calendarDays);
      if (contractualMinutes <= 0) {
        throw error("PAYROLL_CONTRACTUAL_MINUTES_REQUIRED",
          "Salary-derived rates require positive contractual minutes.");
      }
      rateNumerator = basePeriodAmountMinor;
      rateDenominator = contractualMinutes;
    } else if (basis === "DAILY") {
      basePeriodAmountMinor = checkedMultiply(baseSalaryMinor, scheduledDays);
      rateNumerator = basePeriodAmountMinor;
      rateDenominator = Math.max(1, contractualMinutes);
    } else if (basis === "HOURLY") {
      basePeriodAmountMinor = multiplyDivide(baseSalaryMinor, contractualMinutes, 60);
      rateNumerator = baseSalaryMinor;
      rateDenominator = 60;
    } else if (basis === "PER_MINUTE") {
      basePeriodAmountMinor = checkedMultiply(baseSalaryMinor, contractualMinutes);
      rateNumerator = baseSalaryMinor;
      rateDenominator = 1;
    } else {
      throw error("PAYROLL_SALARY_BASIS_UNSUPPORTED", "Salary basis is unsupported.");
    }
    return Object.freeze({
      currency, salaryBasis: basis, baseSalaryMinor, basePeriodAmountMinor,
      baseRateNumeratorMinor: rateNumerator, baseRateDenominatorMinutes: rateDenominator
    });
  }
  function rate(policy, salary, kind) {
    const fixedRate = (minorValue, hourlyValue, label) => {
      const perMinute = present(minorValue)
        ? nonNegativeInteger(minorValue, `${label} rate minor per minute`) : null;
      const perHour = present(hourlyValue)
        ? parseMajorToMinor(hourlyValue, CURRENCY) : null;
      if (perMinute !== null && perMinute > 0 && perHour !== null && perHour > 0 &&
          checkedMultiply(perMinute, 60) !== perHour) {
        throw error("PAYROLL_RATE_AMBIGUOUS", `Conflicting ${label} rates are configured.`);
      }
      if (perMinute !== null && perMinute > 0) {
        return { numerator: perMinute, denominator: 1 };
      }
      if (perHour !== null && perHour > 0) {
        return { numerator: perHour, denominator: 60 };
      }
      return null;
    };
    if (kind === "DEFICIT") {
      const configured = fixedRate(
        policy.deficitRateMinorPerMinute, policy.deficitRatePerHour, "deficit");
      if (configured) return configured;
      return { numerator: salary.baseRateNumeratorMinor, denominator: salary.baseRateDenominatorMinutes };
    }
    const result = fixedRate(
      policy.overtimeRateMinorPerMinute, policy.overtimeRatePerHour, "overtime") ||
      { numerator: salary.baseRateNumeratorMinor, denominator: salary.baseRateDenominatorMinutes };
    result.multiplierBps = nonNegativeInteger(policy.overtimeMultiplierBps, "overtime multiplier");
    return result;
  }
  function daySnapshot(day) {
    const firstPresent = (...values) => values.find((value) => present(value));
    const malformedJson = (...values) => values.some((value) => {
      if (typeof value !== "string" || !text(value)) return false;
      try { JSON.parse(value); return false; } catch (_caught) { return true; }
    });
    return Object.freeze({
      attendanceDayId: text(day.attendanceDayId),
      staffId: text(day.staffId),
      attendanceDate: dateKey(day.attendanceDate),
      calculationVersion: text(day.calculationVersion),
      sourceEventHash: text(day.sourceEventHash),
      status: upper(day.status || day.state),
      dayLifecycle: upper(day.dayLifecycle || day.status || day.state),
      requiredMinutes: nonNegativeInteger(number(firstPresent(
        day.requiredWorkMinutesRounded, day.requiredMinutes), 0), "required minutes"),
      workedMinutes: nonNegativeInteger(number(firstPresent(
        day.workedMinutesRounded, day.workedMinutesRaw, day.workedMinutes), 0), "worked minutes"),
      deficitMinutes: nonNegativeInteger(number(firstPresent(
        day.deficitMinutesRounded, day.deficitMinutesRaw, day.deficitMinutes), 0), "deficit minutes"),
      rawOvertimeMinutes: nonNegativeInteger(number(day.rawOvertimeMinutes, 0), "raw overtime minutes"),
      approvedOvertimeMinutes: nonNegativeInteger(number(day.approvedOvertimeMinutes, 0),
        "approved overtime minutes"),
      overtimeApprovalStatus: upper(day.overtimeApprovalStatus ||
        (number(day.approvedOvertimeMinutes, 0) > 0 ? "" : "NOT_REQUESTED")),
      eligibleOvertimeMinutes: nonNegativeInteger(number(
        day.eligibleOvertimeMinutes === undefined
          ? day.approvedOvertimeMinutes : day.eligibleOvertimeMinutes, 0),
      "eligible overtime minutes"),
      leaveOrAbsenceType: upper(day.leaveOrAbsenceType),
      locked: bool(day.locked),
      reopenedCount: nonNegativeInteger(number(day.reopenedCount, 0), "reopened count"),
      openSession: bool(day.openSession),
      openBreak: bool(day.openBreak),
      staleCalculation: bool(day.staleCalculation),
      malformedSource: malformedJson(
        day.policySnapshotJson, day.policySnapshot,
        day.scheduleSnapshotJson, day.scheduleSnapshot,
        day.calculationWarnings),
      policySnapshot: parseJson(day.policySnapshotJson || day.policySnapshot, {}),
      scheduleSnapshot: parseJson(day.scheduleSnapshotJson || day.scheduleSnapshot, {}),
      warnings: Array.isArray(day.calculationWarnings) ? clone(day.calculationWarnings) :
        parseJson(day.calculationWarnings, [])
    });
  }
  function calculateEmployeeSettlement(input) {
    const data = input || {};
    const period = data.period;
    const staff = data.staff;
    if (!period || !staff) throw error("PAYROLL_CALCULATION_CONTEXT_REQUIRED", "Period and staff are required.");
    const days = (data.days || []).map(daySnapshot)
      .filter((day) => day.attendanceDate >= period.startDate && day.attendanceDate <= period.endDate)
      .sort((a, b) => a.attendanceDate.localeCompare(b.attendanceDate) ||
        a.attendanceDayId.localeCompare(b.attendanceDayId));
    const duplicateDates = days.filter((day, index) =>
      days.findIndex((candidate) => candidate.attendanceDate === day.attendanceDate) !== index);
    if (duplicateDates.length) {
      throw error("PAYROLL_ATTENDANCE_DAY_AMBIGUOUS", "Multiple authoritative days exist for staff/date.");
    }
    const warnings = [];
    const blockers = [];
    if (!days.length) blockers.push("NO_ATTENDANCE_AGGREGATES");
    const presentDates = new Set(days.map((day) => day.attendanceDate));
    dateKeysBetween(period.startDate, period.endDate).forEach((date) => {
      if (!presentDates.has(date)) blockers.push(`MISSING_ATTENDANCE_DAY:${date}`);
    });
    days.forEach((day) => {
      if (day.staffId !== text(staff.staffId)) {
        throw error("PAYROLL_ATTENDANCE_STAFF_MISMATCH",
          "Authoritative attendance day does not belong to the settlement staff.");
      }
      if (!day.attendanceDayId || !day.calculationVersion || !day.sourceEventHash) {
        blockers.push(`INCOMPLETE_SOURCE:${day.attendanceDate}`);
      }
      if (day.malformedSource) blockers.push(`MALFORMED_SOURCE:${day.attendanceDate}`);
      if (day.staleCalculation) blockers.push(`STALE_ATTENDANCE:${day.attendanceDate}`);
      if (day.approvedOvertimeMinutes > day.eligibleOvertimeMinutes) {
        blockers.push(`OVERTIME_APPROVAL_EXCEEDS_ELIGIBILITY:${day.attendanceDate}`);
      }
      if (day.approvedOvertimeMinutes > 0 &&
          day.overtimeApprovalStatus !== "APPROVED") {
        blockers.push(`OVERTIME_APPROVAL_INVALID:${day.attendanceDate}`);
      }
      if (day.openSession || day.openBreak || BLOCKING_DAY_STATUSES.has(day.status)) {
        blockers.push(`UNRESOLVED_ATTENDANCE:${day.attendanceDate}`);
      }
      if (!day.locked) blockers.push(`UNLOCKED_ATTENDANCE:${day.attendanceDate}`);
      if (day.dayLifecycle === "REOPENED") {
        blockers.push(`REOPENED_ATTENDANCE:${day.attendanceDate}`);
      }
      if (day.reopenedCount > 0) warnings.push(`REOPENED_ATTENDANCE:${day.attendanceDate}`);
      day.warnings.forEach((warning) => warnings.push(`${day.attendanceDate}:${warning}`));
    });
    const contractualMinutes = days.reduce((sum, day) => sum + day.requiredMinutes, 0);
    const scheduledDays = days.filter((day) => day.requiredMinutes > 0).length;
    const policyResolutions = dateKeysBetween(period.startDate, period.endDate)
      .map((date) => resolvePolicy(data.policies || [], staff, date));
    const policyResolution = policyResolutions[0];
    if (policyResolutions.some((item) =>
      item.policyId !== policyResolution.policyId ||
      stable(item.snapshot) !== stable(policyResolution.snapshot))) {
      throw error("PAYROLL_PERIOD_POLICY_AMBIGUOUS",
        "A payroll period cannot cross effective payroll policy boundaries.");
    }
    const policy = policyResolution.snapshot;
    const salary = resolveSalary(staff, policy, {
      startDate: period.startDate, endDate: period.endDate,
      days: dateRange(period.startDate, period.endDate).days
    }, contractualMinutes, scheduledDays);
    const deficitRate = rate(policy, salary, "DEFICIT");
    const overtimeRate = rate(policy, salary, "OVERTIME");
    let requiredMinutes = 0;
    let workedMinutes = 0;
    let deficitMinutes = 0;
    let rawOvertimeMinutes = 0;
    let approvedOvertimeMinutes = 0;
    let paidLeaveMinutes = 0;
    let unpaidLeaveMinutes = 0;
    let absenceMinutes = 0;
    let deficitDeductionMinor = 0;
    days.forEach((day) => {
      const classification = day.leaveOrAbsenceType || day.status;
      requiredMinutes += day.requiredMinutes;
      workedMinutes += day.workedMinutes;
      rawOvertimeMinutes += day.rawOvertimeMinutes;
      approvedOvertimeMinutes += !day.staleCalculation &&
        day.overtimeApprovalStatus === "APPROVED" &&
        day.approvedOvertimeMinutes <= day.eligibleOvertimeMinutes
        ? day.approvedOvertimeMinutes : 0;
      if (classification === "UNPAID_LEAVE" ||
          (classification === "SICK_LEAVE" && !policy.sickLeavePaid)) {
        unpaidLeaveMinutes += day.requiredMinutes;
      } else if (ABSENCE.has(classification) || ABSENCE.has(day.status)) {
        absenceMinutes += day.requiredMinutes;
      } else if (PAID_LEAVE.has(classification) ||
          (classification === "SICK_LEAVE" && policy.sickLeavePaid)) {
        paidLeaveMinutes += day.requiredMinutes;
      } else if (!EXEMPT_DAY.has(classification) && !EXEMPT_DAY.has(day.status)) {
        deficitMinutes += day.deficitMinutes;
        let dayDeduction = multiplyDivide(day.deficitMinutes,
          deficitRate.numerator, deficitRate.denominator);
        const dailyCapMinor = policy.dailyDeductionCapMinor > 0
          ? policy.dailyDeductionCapMinor
          : (number(policy.dailyDeductionCap, 0) > 0
            ? parseMajorToMinor(policy.dailyDeductionCap, CURRENCY) : 0);
        dayDeduction = cap(dayDeduction, dailyCapMinor);
        deficitDeductionMinor = checkedAdd(deficitDeductionMinor, dayDeduction);
      }
    });
    const leaveUnitMinutes = policy.requiredDailyMinutes > 0
      ? policy.requiredDailyMinutes
      : Math.max(1, ...days.map((day) => day.requiredMinutes));
    const allowedLeaveDays = Math.max(0, policy.monthlyAllowedLeaveDays);
    const consumedLeaveDays = paidLeaveMinutes / leaveUnitMinutes;
    const excessLeaveDays = Math.max(0, consumedLeaveDays - allowedLeaveDays);
    if (allowedLeaveDays > 0 && excessLeaveDays > 0) {
      blockers.push("LEAVE_ALLOWANCE_EXCEEDED");
    }
    deficitDeductionMinor = cap(deficitDeductionMinor, policy.periodDeductionCapMinor);
    const unpaidLeaveDeductionMinor = roundDivide(checkedMultiply(
      multiplyDivide(unpaidLeaveMinutes, deficitRate.numerator, deficitRate.denominator),
      nonNegativeInteger(policy.unpaidLeaveMultiplierBps, "unpaid leave multiplier")), 10000);
    const absenceDeductionMinor = roundDivide(checkedMultiply(
      multiplyDivide(absenceMinutes, deficitRate.numerator, deficitRate.denominator),
      nonNegativeInteger(policy.absenceMultiplierBps, "absence multiplier")), 10000);
    approvedOvertimeMinutes = cap(approvedOvertimeMinutes, policy.periodOvertimeCapMinutes);
    const overtimeCompensationMinor = roundDivide(
      checkedMultiply(checkedMultiply(approvedOvertimeMinutes, overtimeRate.numerator),
        overtimeRate.multiplierBps),
      checkedMultiply(overtimeRate.denominator, 10000));
    const approvedAdjustments = (data.adjustments || []).filter((item) =>
      upper(item.status) === "APPROVED");
    const manualAdjustmentMinor = approvedAdjustments.reduce((sum, item) => {
      const amount = nonNegativeInteger(item.amountMinor, "manual adjustment");
      return checkedAdd(sum, upper(item.direction) === "DEBIT" ? -amount : amount);
    }, 0);
    const grossAttendanceAdjustmentMinor = checkedAdd(
      overtimeCompensationMinor, Math.max(0, manualAdjustmentMinor));
    const netAttendanceAdjustmentMinor = [
      manualAdjustmentMinor, -deficitDeductionMinor,
      -unpaidLeaveDeductionMinor, -absenceDeductionMinor
    ].reduce((sum, value) => checkedAdd(sum, value), overtimeCompensationMinor);
    const sourceAttendanceSnapshot = days;
    const salarySnapshot = salary;
    const sourceAggregateHash = core.requestFingerprint(
      "PAYROLL_ATTENDANCE_SOURCE", staff.staffId, {
        period: {
          payrollPeriodId: period.payrollPeriodId,
          startDate: period.startDate,
          endDate: period.endDate,
          scopeType: period.scopeType || (period.branchId ? "BRANCH" : "ORGANIZATION"),
          branchId: period.branchId || "",
          calculationVersion: period.calculationVersion || VERSION
        },
        employee: {
          staffId: staff.staffId,
          branchId: staff.branchId || "",
          active: staff.active !== false
        },
        calculationVersion: VERSION,
        days: sourceAttendanceSnapshot,
        policy,
        salary: salarySnapshot,
        adjustments: approvedAdjustments.map((item) => ({
          adjustmentId: item.adjustmentId, amountMinor: item.amountMinor,
          direction: upper(item.direction), status: upper(item.status)
        }))
      });
    return Object.freeze({
      payrollPeriodId: period.payrollPeriodId,
      staffId: staff.staffId,
      staffNameSnapshot: staff.staffName || staff.name || "",
      branchId: staff.branchId || "",
      currency: CURRENCY,
      baseSalaryMinor: salary.baseSalaryMinor,
      salaryBasis: salary.salaryBasis,
      contractualMinutes,
      attendedRequiredMinutes: requiredMinutes,
      requiredMinutes,
      workedMinutes,
      deficitMinutes,
      rawOvertimeMinutes,
      approvedOvertimeMinutes,
      approvedPaidLeaveMinutes: paidLeaveMinutes,
      allowedLeaveDays,
      consumedLeaveDays,
      excessLeaveDays,
      excessAbsenceDays: excessLeaveDays,
      unpaidLeaveMinutes,
      absenceMinutes,
      deficitRateMinorPerMinute: roundDivide(deficitRate.numerator, deficitRate.denominator),
      overtimeRateMinorPerMinute: roundDivide(overtimeRate.numerator, overtimeRate.denominator),
      basePeriodAmountMinor: salary.basePeriodAmountMinor,
      deficitDeductionMinor,
      unpaidLeaveDeductionMinor,
      absenceDeductionMinor,
      overtimeCompensationMinor,
      manualAdjustmentsMinor: manualAdjustmentMinor,
      grossAttendanceAdjustmentMinor,
      netAttendanceAdjustmentMinor,
      sourceAttendanceDayIds: days.map((day) => day.attendanceDayId),
      sourceAttendanceSnapshot,
      sourceAggregateHash,
      policyId: policyResolution.policyId,
      policySnapshot: policy,
      salarySnapshot,
      warnings: [...new Set([...warnings, ...blockers])],
      blockers: [...new Set(blockers)],
      calculationVersion: VERSION,
      status: blockers.length ? "REVIEW_REQUIRED" : "CALCULATED",
      locked: false,
      stale: false
    });
  }

  function normalizeLegacyPayrollRows(headers, rows) {
    const canonical = (value) => text(value).toUpperCase()
      .replace(/[\s-]+/g, "_").replace(/_+/g, "_");
    const names = (headers || []).map(canonical);
    if (names.some((name, index) => name && names.indexOf(name) !== index)) {
      throw error("PAYROLL_LEGACY_DUPLICATE_HEADERS", "Legacy payroll headers are ambiguous.");
    }
    const required = ["SETTLEMENT_ID", "STAFF_ID"];
    required.forEach((name) => {
      if (!names.includes(name)) {
        throw error("PAYROLL_LEGACY_SCHEMA_INCOMPATIBLE",
          `Legacy payroll header is missing: ${name}.`);
      }
    });
    const known = new Set(schema.SHEET_SCHEMAS.PAYROLL_ATTENDANCE_SETTLEMENTS);
    const records = (rows || []).filter((row) =>
      Array.isArray(row) && row.some((value) => text(value))).map((row, index) => {
      const value = (name) => row[names.indexOf(name)];
      const issues = [];
      const settlementId = text(value("SETTLEMENT_ID"));
      const staffId = text(value("STAFF_ID"));
      if (!settlementId) issues.push("MISSING_SETTLEMENT_ID");
      if (!staffId) issues.push("MISSING_STAFF_ID");
      const currency = upper(value("CURRENCY") || CURRENCY);
      if (currency !== CURRENCY) issues.push("UNSUPPORTED_CURRENCY");
      names.filter((name) =>
        /(?:VALUE|AMOUNT|ADJUSTMENTS?|DEDUCTION)(?:_MINOR)?$/.test(name))
        .forEach((name) => {
          const raw = value(name);
          if (!present(raw)) return;
          try {
            const parsed = name.endsWith("_MINOR")
              ? integer(raw, `legacy ${name}`)
              : parseMajorToMinor(raw, currency);
            if (parsed < 0) issues.push(`NEGATIVE_MONEY:${name}`);
          } catch (_caught) {
            issues.push(`MALFORMED_MONEY:${name}`);
          }
        });
      return {
        settlementId, staffId, staffName: text(value("STAFF_NAME")),
        periodStart: text(value("PERIOD_START")), periodEnd: text(value("PERIOD_END")),
        currency,
        compatibilityStatus: issues.length ? "LEGACY_INVALID" : "LEGACY_HISTORICAL",
        issues, sourceRowNumber: index + 2, readOnly: true,
        unknownColumns: names.filter((name) => name && !known.has(name))
      };
    });
    const groups = new Map();
    records.forEach((item) => {
      if (!item.settlementId) return;
      if (!groups.has(item.settlementId)) groups.set(item.settlementId, []);
      groups.get(item.settlementId).push(item);
    });
    groups.forEach((items) => {
      if (items.length < 2) return;
      items.forEach((item) => {
        item.compatibilityStatus = "LEGACY_AMBIGUOUS";
        item.issues.push("DUPLICATE_SETTLEMENT_ID");
      });
    });
    return records.map((item) => Object.freeze(item));
  }

  function createMemoryRepository(seed) {
    const input = clone(seed || {});
    let state = {
      periods: input.periods || [], settlements: input.settlements || [],
      adjustments: input.adjustments || [], attendanceDays: input.attendanceDays || [],
      staff: input.staff || [], policies: input.policies || [], audit: input.audit || [],
      idempotency: input.idempotency || [], exports: input.exports || []
    };
    const save = (collection, key, record) => {
      const index = state[collection].findIndex((item) => text(item[key]) === text(record[key]));
      if (index >= 0) state[collection][index] = clone(record);
      else state[collection].push(clone(record));
      return clone(record);
    };
    const unique = (collection, key, value, code) => {
      const matches = state[collection].filter((item) => text(item[key]) === text(value));
      if (matches.length > 1) throw error(code, "Duplicate entity identity is ambiguous.");
      return clone(matches[0] || null);
    };
    return {
      listPeriods: () => clone(state.periods),
      getPeriod: (id) => unique("periods", "payrollPeriodId", id, "PAYROLL_PERIOD_ID_AMBIGUOUS"),
      savePeriod: (record) => save("periods", "payrollPeriodId", record),
      listSettlements: (filters = {}) => clone(state.settlements.filter((item) =>
        (!filters.payrollPeriodId || item.payrollPeriodId === filters.payrollPeriodId) &&
        (!filters.staffId || item.staffId === filters.staffId) &&
        (!filters.status || upper(item.status) === upper(filters.status)))),
      getSettlement: (id) => unique("settlements", "settlementId", id, "PAYROLL_SETTLEMENT_ID_AMBIGUOUS"),
      saveSettlement: (record) => save("settlements", "settlementId", record),
      listAdjustments: (filters = {}) => clone(state.adjustments.filter((item) =>
        (!filters.settlementId || item.settlementId === filters.settlementId) &&
        (!filters.payrollPeriodId || item.payrollPeriodId === filters.payrollPeriodId) &&
        (!filters.status || upper(item.status) === upper(filters.status)))),
      getAdjustment: (id) => unique("adjustments", "adjustmentId", id, "PAYROLL_ADJUSTMENT_ID_AMBIGUOUS"),
      appendAdjustment: (record) => {
        if (state.adjustments.some((item) => item.adjustmentId === record.adjustmentId)) {
          throw error("PAYROLL_ADJUSTMENT_ID_COLLISION", "Adjustment ID collision.");
        }
        state.adjustments.push(clone(record)); return clone(record);
      },
      listAttendanceDays: (filters = {}) => clone(state.attendanceDays.filter((item) =>
        (!filters.staffId || item.staffId === filters.staffId) &&
        (!filters.dateFrom || item.attendanceDate >= filters.dateFrom) &&
        (!filters.dateTo || item.attendanceDate <= filters.dateTo))),
      listStaff: () => clone(state.staff),
      getStaff: (id) => unique("staff", "staffId", id, "PAYROLL_STAFF_ID_AMBIGUOUS"),
      listPolicies: () => clone(state.policies),
      appendAudit: (record) => {
        if (state.audit.some((item) => item.actionId === record.actionId)) {
          throw error("PAYROLL_AUDIT_ID_COLLISION", "Audit ID collision.");
        }
        state.audit.push(clone(record)); return clone(record);
      },
      listAudit: (filters = {}) => clone(state.audit.filter((item) =>
        (!filters.entityId || item.entityId === filters.entityId) &&
        (!filters.staffId || item.staffId === filters.staffId))),
      getIdempotency: (id) => unique("idempotency", "requestId", id, "PAYROLL_IDEMPOTENCY_AMBIGUOUS"),
      saveIdempotency: (record) => save("idempotency", "requestId", record),
      withTransaction: (_details, callback) => {
        const before = clone(state);
        try { return callback(); } catch (caught) { state = before; throw caught; }
      },
      getState: () => clone(state)
    };
  }

  function createService(options) {
    const config = options || {};
    const repository = config.repository;
    if (!repository) throw error("PAYROLL_REPOSITORY_REQUIRED", "Payroll repository is required.");
    const actorResolver = config.actorResolver || (() => null);
    const now = config.now || (() => new Date().toISOString());
    const uuid = config.uuid || (() => Math.random().toString(36).slice(2));
    const withLock = config.withLock || ((_details, callback) => callback());
    function resolvedActor(data) { return actor(actorResolver(data || {})); }
    function allocate(prefix, exists) {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const candidate = `${prefix}-${text(uuid()).replace(/[^A-Za-z0-9-]/g, "").slice(0, 48)}`;
        if (!exists(candidate)) return candidate;
      }
      throw error("PAYROLL_ID_ALLOCATION_FAILED", `Unable to allocate ${prefix} ID.`);
    }
    function fingerprint(action, resolved, data) {
      const excluded = new Set([
        "sessionToken", "token", "authToken", "actor", "actorId", "actorRole",
        "actorName", "timestamp", "createdAt", "updatedAt"
      ]);
      return core.requestFingerprint(action, resolved.actorId,
        Object.fromEntries(Object.entries(data || {}).filter(([key]) => !excluded.has(key))));
    }
    function staffInScope(resolved, staffId) {
      const staff = repository.getStaff(requireText(staffId,
        "PAYROLL_STAFF_ID_REQUIRED", "Stable staff ID is required."));
      if (!staff || staff.active === false) throw error("PAYROLL_STAFF_NOT_FOUND", "Active staff was not found.");
      assertBranch(resolved, staff.branchId);
      return staff;
    }
    function assertPeriodScope(resolved, branchId) {
      if (branchId) {
        assertBranch(resolved, branchId);
        return;
      }
      if (!resolved.owner) {
        throw error("PAYROLL_ORGANIZATION_SCOPE_DENIED",
          "Organization-wide payroll periods require owner scope.");
      }
    }
    function periodInScope(resolved, id) {
      const period = repository.getPeriod(requireText(id,
        "PAYROLL_PERIOD_ID_REQUIRED", "Payroll period ID is required."));
      if (!period) throw error("PAYROLL_PERIOD_NOT_FOUND", "Payroll period was not found.");
      assertPeriodScope(resolved, period.branchId);
      return period;
    }
    function currentSettlement(periodId, staffId) {
      const active = repository.listSettlements({ payrollPeriodId: periodId, staffId })
        .filter((item) => upper(item.status) !== "SUPERSEDED")
        .sort((a, b) => number(b.settlementVersion, 0) - number(a.settlementVersion, 0));
      if (active.length > 1) {
        throw error("PAYROLL_SETTLEMENT_AMBIGUOUS", "Current settlement version is ambiguous.");
      }
      return active[0] || null;
    }
    function eligibleStaff(period, resolved) {
      return repository.listStaff().filter((item) => item.active !== false)
        .filter((item) => !period.branchId || item.branchId === period.branchId)
        .filter((item) => {
          try { assertBranch(resolved, item.branchId); return true; } catch (_caught) { return false; }
        });
    }
    function employeeSetHash(period, resolved) {
      return core.requestFingerprint("PAYROLL_EMPLOYEE_SET", period.payrollPeriodId,
        eligibleStaff(period, resolved).map((item) => ({
          staffId: item.staffId, branchId: item.branchId, active: item.active !== false
        })));
    }
    function audit(action, type, entityId, resolved, before, after, reason, requestId, staffId, branchId) {
      repository.appendAudit({
        actionId: allocate("PAYAUD", (id) =>
          repository.listAudit({}).some((item) => item.actionId === id)),
        entityType: type, entityId, action, actorId: resolved.actorId,
        actorName: resolved.actorName, actorRole: resolved.role,
        staffId: staffId || "", branchId: branchId || "",
        beforeStateJson: stable(before || null), afterStateJson: stable(after || null),
        reason, timestamp: now(), requestId
      });
    }
    function mutate(action, data, permission, callback) {
      const requestId = requireText(data.requestId, "PAYROLL_REQUEST_ID_REQUIRED", "Request ID is required.");
      const reason = requireText(data.reason, "PAYROLL_REASON_REQUIRED", "Mutation reason is required.");
      return withLock({ action, requestId }, () => {
        const resolved = resolvedActor(data);
        requirePermission(resolved, permission);
        const requestFingerprint = fingerprint(action, resolved, data);
        const replay = repository.getIdempotency(requestId);
        if (replay) {
          if (replay.requestFingerprint !== requestFingerprint || replay.action !== action ||
              replay.actorId !== resolved.actorId) {
            throw error("PAYROLL_IDEMPOTENCY_CONFLICT", "Request ID was already used with different input.");
          }
          return responseDto(parseJson(replay.responseJson, {}), resolved);
        }
        return repository.withTransaction({ action, requestId, actorId: resolved.actorId }, () => {
          const result = callback(resolved, requestId, reason, requestFingerprint);
          repository.saveIdempotency({
            requestId, action, actorId: resolved.actorId, requestFingerprint,
            responseJson: stable(result), status: "COMPLETED", createdAt: now()
          });
          return responseDto(result, resolved);
        });
      });
    }
    function calculateFor(period, staff, resolved, requestId, reason) {
      const previous = currentSettlement(period.payrollPeriodId, staff.staffId);
      if (previous && (previous.locked || upper(previous.status) === "LOCKED")) {
        throw error("PAYROLL_SETTLEMENT_LOCKED", "Locked settlement cannot be recalculated.");
      }
      const adjustments = repository.listAdjustments({ payrollPeriodId: period.payrollPeriodId })
        .filter((item) => item.staffId === staff.staffId);
      const calculated = calculateEmployeeSettlement({
        period, staff,
        days: repository.listAttendanceDays({
          staffId: staff.staffId, dateFrom: period.startDate, dateTo: period.endDate
        }),
        policies: repository.listPolicies(), adjustments
      });
      const version = previous ? number(previous.settlementVersion, 0) + 1 : 1;
      const settlementId = allocate(`PAYS-${period.payrollPeriodId}-${staff.staffId}-V${version}`,
        (id) => !!repository.getSettlement(id));
      if (previous) repository.saveSettlement({
        ...previous, status: "SUPERSEDED", locked: false,
        updatedAt: now(), updatedBy: resolved.actorId
      });
      const record = {
        ...calculated, settlementId, settlementVersion: version,
        periodStart: period.startDate, periodEnd: period.endDate,
        settlementPeriod: period.payrollPeriodId,
        sourceAttendanceDayIdsJson: stable(calculated.sourceAttendanceDayIds),
        sourceAttendanceSnapshotJson: stable(calculated.sourceAttendanceSnapshot),
        policySnapshotJson: stable(calculated.policySnapshot),
        salarySnapshotJson: stable(calculated.salarySnapshot),
        warningsJson: stable(calculated.warnings),
        supersedesSettlementId: previous ? previous.settlementId : "",
        createdAt: now(), createdBy: resolved.actorId,
        updatedAt: now(), updatedBy: resolved.actorId,
        lastRequestId: requestId
      };
      repository.saveSettlement(record);
      audit(previous ? "RECALCULATE_SETTLEMENT" : "CALCULATE_SETTLEMENT",
        "PAYROLL_SETTLEMENT", settlementId, resolved, previous, record,
        reason, requestId, staff.staffId, staff.branchId);
      return record;
    }
    function supersedeIneligibleSettlements(period, eligible, resolved, requestId, reason) {
      const eligibleIds = new Set(eligible.map((item) => text(item.staffId)));
      repository.listSettlements({ payrollPeriodId: period.payrollPeriodId })
        .filter((item) => upper(item.status) !== "SUPERSEDED")
        .filter((item) => !eligibleIds.has(text(item.staffId)))
        .forEach((item) => {
          if (item.locked || upper(item.status) === "LOCKED") {
            throw error("PAYROLL_SETTLEMENT_LOCKED",
              "Locked settlement cannot be removed from the eligible employee set.");
          }
          const updated = {
            ...item, status: "SUPERSEDED", stale: true,
            updatedAt: now(), updatedBy: resolved.actorId
          };
          repository.saveSettlement(updated);
          audit("SUPERSEDE_INELIGIBLE_SETTLEMENT", "PAYROLL_SETTLEMENT",
            item.settlementId, resolved, item, updated, reason, requestId,
            item.staffId, item.branchId);
        });
    }
    function staleSettlement(record) {
      if (!record || upper(record.status) === "SUPERSEDED") return record;
      const period = repository.getPeriod(record.payrollPeriodId);
      const staff = repository.getStaff(record.staffId);
      if (!period || !staff) return { ...record, stale: true, warnings: ["SOURCE_CONTEXT_MISSING"] };
      try {
        const recalculated = calculateEmployeeSettlement({
          period, staff,
          days: repository.listAttendanceDays({
            staffId: staff.staffId, dateFrom: period.startDate, dateTo: period.endDate
          }),
          policies: repository.listPolicies(),
          adjustments: repository.listAdjustments({ payrollPeriodId: period.payrollPeriodId })
            .filter((item) => item.staffId === staff.staffId)
        });
        return {
          ...record,
          stale: upper(record.status) === "REOPENED" ||
            bool(record.stale) ||
            text(record.sourceAggregateHash) !== text(recalculated.sourceAggregateHash),
          warnings: parseJson(record.warningsJson || record.warnings, [])
        };
      } catch (_caught) {
        return { ...record, stale: true, warnings: ["SOURCE_RECALCULATION_FAILED"] };
      }
    }
    function transitionPeriod(data, action, permission, from, to) {
      return mutate(action, data, permission, (resolved, requestId, reason) => {
        const period = periodInScope(resolved, data.payrollPeriodId);
        if (!from.includes(upper(period.status))) {
          throw error("PAYROLL_PERIOD_TRANSITION_INVALID",
            `Cannot apply ${action} while period is ${period.status}.`);
        }
        const settlements = repository.listSettlements({ payrollPeriodId: period.payrollPeriodId })
          .filter((item) => upper(item.status) !== "SUPERSEDED").map(staleSettlement);
        if (["UNDER_REVIEW", "APPROVED", "LOCKED"].includes(to) &&
            settlements.some((item) => item.stale || item.blockers && item.blockers.length ||
              upper(item.status) === "REVIEW_REQUIRED")) {
          throw error("PAYROLL_PERIOD_BLOCKED", "Period contains stale or unresolved settlements.");
        }
        if (period.sourceEmployeeHash &&
            period.sourceEmployeeHash !== employeeSetHash(period, resolved)) {
          throw error("PAYROLL_EMPLOYEE_SET_STALE", "Eligible employee set changed after calculation.");
        }
        if (to === "APPROVED" && period.submittedBy === resolved.actorId) {
          throw error("PAYROLL_SELF_APPROVAL_FORBIDDEN", "Period submitter cannot approve the period.");
        }
        const updated = {
          ...period, status: to, updatedAt: now(), updatedBy: resolved.actorId,
          lastRequestId: requestId
        };
        if (to === "UNDER_REVIEW") Object.assign(updated, { submittedBy: resolved.actorId, submittedAt: now() });
        if (to === "APPROVED") Object.assign(updated, { approvedBy: resolved.actorId, approvedAt: now() });
        if (to === "LOCKED") Object.assign(updated, { lockedBy: resolved.actorId, lockedAt: now() });
        repository.savePeriod(updated);
        settlements.forEach((item) => repository.saveSettlement({
          ...item, status: to, locked: to === "LOCKED",
          lockedAt: to === "LOCKED" ? now() : item.lockedAt,
          lockedBy: to === "LOCKED" ? resolved.actorId : item.lockedBy,
          approvedAt: to === "APPROVED" ? now() : item.approvedAt,
          approvedBy: to === "APPROVED" ? resolved.actorId : item.approvedBy,
          updatedAt: now(), updatedBy: resolved.actorId
        }));
        audit(action, "PAYROLL_PERIOD", period.payrollPeriodId, resolved,
          period, updated, reason, requestId, "", period.branchId);
        return { status: "success", code: `PAYROLL_PERIOD_${to}`, payrollPeriod: updated };
      });
    }
    const handlers = {
      listPayrollPeriods(data) {
        const resolved = resolvedActor(data); requirePermission(resolved, "payroll_attendance.view");
        const periods = repository.listPeriods().filter((period) => {
          try { assertPeriodScope(resolved, period.branchId); return true; }
          catch (_caught) { return false; }
        }).map((period) => ({
          ...period,
          staleEmployeeSet: !!period.sourceEmployeeHash &&
            period.sourceEmployeeHash !== employeeSetHash(period, resolved)
        }));
        return responseDto({ status: "success", code: "PAYROLL_PERIODS_OK", payrollPeriods: periods }, resolved);
      },
      createPayrollPeriod(data) {
        return mutate("createPayrollPeriod", data, "payroll_attendance.calculate",
          (resolved, requestId, reason) => {
            const range = dateRange(data.startDate, data.endDate);
            let branchId = text(data.branchId);
            if (!branchId && !resolved.owner && resolved.branchIds.length === 1) {
              branchId = resolved.branchIds[0];
            }
            assertPeriodScope(resolved, branchId);
            const overlaps = repository.listPeriods().filter((item) =>
              upper(item.status) !== "SUPERSEDED" &&
              text(item.branchId) === branchId &&
              item.startDate <= range.end && item.endDate >= range.start);
            if (overlaps.length) throw error("PAYROLL_PERIOD_OVERLAP", "Payroll period overlaps an existing scope period.");
            const payrollPeriodId = allocate("PAYPER", (id) => !!repository.getPeriod(id));
            const record = {
              payrollPeriodId, scopeType: branchId ? "BRANCH" : "ORGANIZATION",
              branchId, startDate: range.start, endDate: range.end,
              timezone: TIME_ZONE, status: "DRAFT", calculationVersion: VERSION,
              sourceEmployeeHash: "", notes: text(data.notes), createdBy: resolved.actorId,
              createdAt: now(), updatedBy: resolved.actorId, updatedAt: now(),
              lastRequestId: requestId
            };
            repository.savePeriod(record);
            audit("CREATE_PERIOD", "PAYROLL_PERIOD", payrollPeriodId, resolved,
              null, record, reason, requestId, "", branchId);
            return { status: "success", code: "PAYROLL_PERIOD_CREATED", payrollPeriod: record };
          });
      },
      calculatePayrollPeriod(data) {
        return mutate("calculatePayrollPeriod", data, "payroll_attendance.calculate",
          (resolved, requestId, reason) => {
            const period = periodInScope(resolved, data.payrollPeriodId);
            if (!["DRAFT", "CALCULATED", "REOPENED"].includes(upper(period.status))) {
              throw error("PAYROLL_PERIOD_TRANSITION_INVALID", "Period cannot be calculated in its current status.");
            }
            const staff = eligibleStaff(period, resolved);
            if (!staff.length) throw error("PAYROLL_PERIOD_NO_STAFF", "No eligible staff exists in period scope.");
            supersedeIneligibleSettlements(period, staff, resolved, requestId, reason);
            const settlements = staff.map((item) => calculateFor(period, item, resolved, requestId, reason));
            const sourceEmployeeHash = employeeSetHash(period, resolved);
            const updated = {
              ...period, status: "CALCULATED", sourceEmployeeHash,
              calculatedBy: resolved.actorId, calculatedAt: now(),
              updatedBy: resolved.actorId, updatedAt: now(), lastRequestId: requestId
            };
            repository.savePeriod(updated);
            audit("CALCULATE_PERIOD", "PAYROLL_PERIOD", period.payrollPeriodId,
              resolved, period, updated, reason, requestId, "", period.branchId);
            return {
              status: "success", code: "PAYROLL_PERIOD_CALCULATED",
              payrollPeriod: updated, settlements
            };
          });
      },
      recalculatePayrollPeriod(data) {
        return mutate("recalculatePayrollPeriod", data, "payroll_attendance.calculate",
          (resolved, requestId, reason) => {
            const period = periodInScope(resolved, data.payrollPeriodId);
            if (upper(period.status) === "LOCKED") {
              throw error("PAYROLL_PERIOD_LOCKED", "Locked period cannot be recalculated.");
            }
            if (!["CALCULATED", "REOPENED"].includes(upper(period.status))) {
              throw error("PAYROLL_PERIOD_TRANSITION_INVALID",
                "Only a calculated or reopened period can be recalculated.");
            }
            const staff = eligibleStaff(period, resolved);
            if (!staff.length) throw error("PAYROLL_PERIOD_NO_STAFF", "No eligible staff exists in period scope.");
            supersedeIneligibleSettlements(period, staff, resolved, requestId, reason);
            const settlements = staff.map((item) =>
              calculateFor(period, item, resolved, requestId, reason));
            const updated = {
              ...period, status: "CALCULATED",
              sourceEmployeeHash: employeeSetHash(period, resolved),
              calculatedBy: resolved.actorId, calculatedAt: now(),
              updatedBy: resolved.actorId, updatedAt: now(), lastRequestId: requestId
            };
            repository.savePeriod(updated);
            audit("RECALCULATE_PERIOD", "PAYROLL_PERIOD", period.payrollPeriodId,
              resolved, period, updated, reason, requestId, "", period.branchId);
            return {
              status: "success", code: "PAYROLL_PERIOD_RECALCULATED",
              payrollPeriod: updated, settlements
            };
          });
      },
      recalculateEmployeePayrollSettlement(data) {
        return mutate("recalculateEmployeePayrollSettlement", data, "payroll_attendance.calculate",
          (resolved, requestId, reason) => {
            const period = periodInScope(resolved, data.payrollPeriodId);
            if (upper(period.status) === "LOCKED") {
              throw error("PAYROLL_PERIOD_LOCKED", "Locked period cannot be recalculated.");
            }
            if (!["CALCULATED", "REOPENED"].includes(upper(period.status))) {
              throw error("PAYROLL_PERIOD_TRANSITION_INVALID",
                "Employee settlement can be recalculated only in a calculated or reopened period.");
            }
            const staff = staffInScope(resolved, data.staffId);
            const settlement = calculateFor(period, staff, resolved, requestId, reason);
            return { status: "success", code: "PAYROLL_SETTLEMENT_RECALCULATED", settlement };
          });
      },
      listEmployeePayrollSettlements(data) {
        const resolved = resolvedActor(data); requirePermission(resolved, "payroll_attendance.view");
        const period = periodInScope(resolved, data.payrollPeriodId);
        const settlements = repository.listSettlements({ payrollPeriodId: period.payrollPeriodId })
          .filter((item) => upper(item.status) !== "SUPERSEDED")
          .filter((item) => {
            try { assertBranch(resolved, item.branchId); return true; } catch (_caught) { return false; }
          })
          .filter((item) => resolved.role !== "EMPLOYEE" || item.staffId === resolved.staffId)
          .map(staleSettlement);
        return responseDto({
          status: "success", code: "PAYROLL_SETTLEMENTS_OK",
          payrollPeriod: period, settlements
        }, resolved);
      },
      getEmployeePayrollSettlement(data) {
        const resolved = resolvedActor(data); requirePermission(resolved, "payroll_attendance.view");
        const settlement = (data.settlementId ? repository.getSettlement(data.settlementId) : null) ||
          currentSettlement(data.payrollPeriodId, data.staffId);
        if (!settlement) throw error("PAYROLL_SETTLEMENT_NOT_FOUND", "Settlement was not found.");
        if (!resolved.owner && resolved.role === "EMPLOYEE" && resolved.staffId !== settlement.staffId) {
          throw error("PAYROLL_SELF_SCOPE_DENIED", "Employee may view only their own settlement.");
        }
        assertBranch(resolved, settlement.branchId);
        return responseDto({
          status: "success", code: "PAYROLL_SETTLEMENT_OK",
          settlement: staleSettlement(settlement),
          adjustments: repository.listAdjustments({ payrollPeriodId: settlement.payrollPeriodId })
            .filter((item) => item.staffId === settlement.staffId)
        }, resolved);
      },
      submitPayrollPeriodForReview(data) {
        return transitionPeriod(data, "submitPayrollPeriodForReview",
          "payroll_attendance.review", ["CALCULATED", "REOPENED"], "UNDER_REVIEW");
      },
      approvePayrollPeriod(data) {
        return transitionPeriod(data, "approvePayrollPeriod",
          "payroll_attendance.approve", ["UNDER_REVIEW"], "APPROVED");
      },
      lockPayrollPeriod(data) {
        return transitionPeriod(data, "lockPayrollPeriod",
          "payroll_attendance.lock", ["APPROVED"], "LOCKED");
      },
      reopenPayrollPeriod(data) {
        return mutate("reopenPayrollPeriod", data, "payroll_attendance.reopen",
          (resolved, requestId, reason) => {
            const period = periodInScope(resolved, data.payrollPeriodId);
            if (upper(period.status) !== "LOCKED") {
              throw error("PAYROLL_PERIOD_NOT_LOCKED", "Only a locked period can be reopened.");
            }
            const updated = {
              ...period, status: "REOPENED", reopenedBy: resolved.actorId,
              reopenedAt: now(), reopenReason: reason, updatedBy: resolved.actorId,
              updatedAt: now(), lastRequestId: requestId
            };
            repository.savePeriod(updated);
            repository.listSettlements({ payrollPeriodId: period.payrollPeriodId })
              .filter((item) => upper(item.status) !== "SUPERSEDED")
              .forEach((item) => repository.saveSettlement({
                ...item, locked: false, status: "REOPENED",
                stale: true, updatedAt: now(), updatedBy: resolved.actorId
              }));
            audit("REOPEN_PERIOD", "PAYROLL_PERIOD", period.payrollPeriodId,
              resolved, period, updated, reason, requestId, "", period.branchId);
            return { status: "success", code: "PAYROLL_PERIOD_REOPENED", payrollPeriod: updated };
          });
      },
      requestPayrollManualAdjustment(data) {
        return mutate("requestPayrollManualAdjustment", data, "payroll_attendance.adjust",
          (resolved, requestId, reason, requestFingerprint) => {
            const settlement = repository.getSettlement(data.settlementId);
            if (!settlement) throw error("PAYROLL_SETTLEMENT_NOT_FOUND", "Settlement was not found.");
            assertBranch(resolved, settlement.branchId);
            if (settlement.locked || upper(settlement.status) === "LOCKED") {
              throw error("PAYROLL_SETTLEMENT_LOCKED", "Locked settlement cannot receive adjustments.");
            }
            const period = periodInScope(resolved, settlement.payrollPeriodId);
            if (!["CALCULATED", "REOPENED"].includes(upper(period.status))) {
              throw error("PAYROLL_PERIOD_TRANSITION_INVALID",
                "Adjustments require a calculated or reopened payroll period.");
            }
            const authoritative = currentSettlement(
              settlement.payrollPeriodId, settlement.staffId);
            if (!authoritative || authoritative.settlementId !== settlement.settlementId) {
              throw error("PAYROLL_ADJUSTMENT_SETTLEMENT_SUPERSEDED",
                "Adjustment must target the current settlement version.");
            }
            const settlementAdjustments = repository.listAdjustments({
              settlementId: settlement.settlementId
            });
            const decidedRequestIds = new Set(settlementAdjustments
              .map((item) => item.reversesAdjustmentId).filter(Boolean));
            if (settlementAdjustments.some((item) =>
              upper(item.status) === "PENDING" &&
              !decidedRequestIds.has(item.adjustmentId))) {
              throw error("PAYROLL_ADJUSTMENT_PENDING",
                "Resolve the current pending adjustment before requesting another.");
            }
            const amountMinor = nonNegativeInteger(data.amountMinor, "adjustment amount");
            if (amountMinor <= 0) throw error("PAYROLL_ADJUSTMENT_AMOUNT_INVALID", "Adjustment amount must be positive.");
            const direction = upper(data.direction);
            if (!["CREDIT", "DEBIT"].includes(direction)) {
              throw error("PAYROLL_ADJUSTMENT_DIRECTION_INVALID", "Adjustment direction is invalid.");
            }
            const adjustmentId = allocate("PAYADJ", (id) => !!repository.getAdjustment(id));
            const record = {
              adjustmentId, settlementId: settlement.settlementId,
              payrollPeriodId: settlement.payrollPeriodId, staffId: settlement.staffId,
              amountMinor, direction, category: requireText(data.category,
                "PAYROLL_ADJUSTMENT_CATEGORY_REQUIRED", "Adjustment category is required."),
              reason, status: "PENDING", requestedBy: resolved.actorId,
              requestedAt: now(), beforeStateJson: stable(settlement),
              afterStateJson: "", reversesAdjustmentId: "", requestId, requestFingerprint
            };
            repository.appendAdjustment(record);
            audit("REQUEST_ADJUSTMENT", "PAYROLL_ADJUSTMENT", adjustmentId, resolved,
              null, record, reason, requestId, settlement.staffId, settlement.branchId);
            return { status: "success", code: "PAYROLL_ADJUSTMENT_REQUESTED", adjustment: record };
          });
      },
      approvePayrollManualAdjustment(data) {
        return decideAdjustment(data, "APPROVED");
      },
      rejectPayrollManualAdjustment(data) {
        return decideAdjustment(data, "REJECTED");
      },
      getPayrollSettlementAudit(data) {
        const resolved = resolvedActor(data); requirePermission(resolved, "payroll_attendance.view");
        if (resolved.role === "EMPLOYEE" && text(data.staffId) !== resolved.staffId) {
          throw error("PAYROLL_SELF_SCOPE_DENIED",
            "Employee audit access requires their own stable staff ID.");
        }
        if (data.staffId) staffInScope(resolved, data.staffId);
        const auditRows = repository.listAudit({
          entityId: data.entityId, staffId: data.staffId
        }).filter((item) => {
          if (resolved.role === "EMPLOYEE" && item.staffId !== resolved.staffId) return false;
          try {
            if (item.branchId) assertBranch(resolved, item.branchId);
            return true;
          } catch (_caught) {
            return false;
          }
        });
        return responseDto({
          status: "success", code: "PAYROLL_AUDIT_OK",
          audit: auditRows.slice(-500)
        }, resolved);
      },
      getUnresolvedPayrollBlockers(data) {
        const resolved = resolvedActor(data); requirePermission(resolved, "payroll_attendance.view");
        const period = periodInScope(resolved, data.payrollPeriodId);
        const blockers = repository.listSettlements({ payrollPeriodId: period.payrollPeriodId })
          .filter((item) => upper(item.status) !== "SUPERSEDED")
          .filter((item) => resolved.role !== "EMPLOYEE" || item.staffId === resolved.staffId)
          .map(staleSettlement)
          .filter((item) => item.stale || parseJson(item.warningsJson || item.warnings, [])
            .some((warning) => /UNRESOLVED|UNLOCKED|STALE|NO_ATTENDANCE|INCOMPLETE_SOURCE/.test(warning)))
          .map((item) => ({
            settlementId: item.settlementId, staffId: item.staffId,
            stale: item.stale, warnings: parseJson(item.warningsJson || item.warnings, [])
          }));
        return responseDto({ status: "success", code: "PAYROLL_BLOCKERS_OK", blockers }, resolved);
      },
      previewPayrollAttendanceExport(data) {
        const resolved = resolvedActor(data); requirePermission(resolved, "payroll_attendance.export");
        const exportResult = buildExport(resolved, data, false);
        return responseDto(exportResult, resolved);
      },
      exportPayrollAttendanceReport(data) {
        return mutate("exportPayrollAttendanceReport", data, "payroll_attendance.export",
          (resolved, requestId, reason) => {
            const result = buildExport(resolved, data, true);
            audit("EXPORT_PAYROLL_ATTENDANCE", "PAYROLL_PERIOD", data.payrollPeriodId,
              resolved, null, { rowCount: result.rowCount, format: result.format },
              reason, requestId, "", result.payrollPeriod.branchId);
            return result;
          });
      }
    };
    function decideAdjustment(data, status) {
      const actionName = status === "APPROVED"
        ? "approvePayrollManualAdjustment" : "rejectPayrollManualAdjustment";
      return mutate(actionName, data, "payroll_attendance.adjust",
        (resolved, requestId, reason) => {
          const request = repository.getAdjustment(data.adjustmentId);
          if (!request) throw error("PAYROLL_ADJUSTMENT_NOT_FOUND", "Adjustment was not found.");
          if (upper(request.status) !== "PENDING") {
            throw error("PAYROLL_ADJUSTMENT_ALREADY_DECIDED", "Adjustment was already decided.");
          }
          if (repository.listAdjustments({ payrollPeriodId: request.payrollPeriodId })
            .some((item) => item.reversesAdjustmentId === request.adjustmentId &&
              ["APPROVED", "REJECTED"].includes(upper(item.status)))) {
            throw error("PAYROLL_ADJUSTMENT_ALREADY_DECIDED", "Adjustment was already decided.");
          }
          if (request.requestedBy === resolved.actorId) {
            throw error("PAYROLL_SELF_APPROVAL_FORBIDDEN", "Adjustment requester cannot decide it.");
          }
          const settlement = repository.getSettlement(request.settlementId);
          if (!settlement) throw error("PAYROLL_SETTLEMENT_NOT_FOUND", "Settlement was not found.");
          assertBranch(resolved, settlement.branchId);
          if (settlement.locked || upper(settlement.status) === "LOCKED") {
            throw error("PAYROLL_SETTLEMENT_LOCKED", "Locked settlement cannot change.");
          }
          const period = periodInScope(resolved, settlement.payrollPeriodId);
          if (!["CALCULATED", "REOPENED"].includes(upper(period.status))) {
            throw error("PAYROLL_PERIOD_TRANSITION_INVALID",
              "Adjustment decisions require a calculated or reopened payroll period.");
          }
          const authoritative = currentSettlement(
            settlement.payrollPeriodId, settlement.staffId);
          if (!authoritative || authoritative.settlementId !== settlement.settlementId) {
            throw error("PAYROLL_ADJUSTMENT_SETTLEMENT_SUPERSEDED",
              "Adjustment decision targets a superseded settlement version.");
          }
          const decisionId = allocate("PAYADJ", (id) => !!repository.getAdjustment(id));
          const decision = {
            ...request, adjustmentId: decisionId, status, decidedBy: resolved.actorId,
            decidedAt: now(), decisionReason: reason, reversesAdjustmentId: request.adjustmentId,
            beforeStateJson: stable(request), afterStateJson: stable({ status }),
            requestId, requestFingerprint: fingerprint(actionName, resolved, data)
          };
          repository.appendAdjustment(decision);
          audit(`${status}_ADJUSTMENT`, "PAYROLL_ADJUSTMENT", decisionId, resolved,
            request, decision, reason, requestId, settlement.staffId, settlement.branchId);
          return { status: "success", code: `PAYROLL_ADJUSTMENT_${status}`, adjustment: decision };
        });
    }
    function csvCell(value) {
      let source = String(value === undefined || value === null ? "" : value);
      const dangerous = /^[\u0000-\u0020\u007f]*[=+\-@]/.test(source) ||
        /^[\u0000-\u001f\u007f]/.test(source);
      source = source.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
      if (dangerous) source = `'${source}`;
      return `"${source.replace(/"/g, '""')}"`;
    }
    function buildExport(resolved, data, execute) {
      const period = periodInScope(resolved, data.payrollPeriodId);
      const settlements = repository.listSettlements({ payrollPeriodId: period.payrollPeriodId })
        .filter((item) => upper(item.status) !== "SUPERSEDED").map(staleSettlement);
      const stale = settlements.some((item) => item.stale);
      if (execute && upper(period.status) !== "LOCKED") {
        throw error("PAYROLL_EXPORT_REQUIRES_LOCKED_PERIOD", "Authorized export requires a locked period.");
      }
      if (execute && stale) throw error("PAYROLL_EXPORT_STALE", "Stale settlements cannot be exported.");
      const headers = [
        "PAYROLL_PERIOD_ID", "STAFF_ID", "STAFF_NAME", "BRANCH_ID", "REQUIRED_MINUTES",
        "WORKED_MINUTES", "DEFICIT_MINUTES", "APPROVED_OVERTIME_MINUTES",
        "DEFICIT_DEDUCTION_MINOR", "UNPAID_LEAVE_DEDUCTION_MINOR",
        "ABSENCE_DEDUCTION_MINOR", "OVERTIME_COMPENSATION_MINOR",
        "MANUAL_ADJUSTMENTS_MINOR", "NET_ATTENDANCE_ADJUSTMENT_MINOR",
        "CURRENCY", "CALCULATION_VERSION", "SOURCE_AGGREGATE_HASH", "STATUS",
        "WARNINGS", "APPROVED_BY", "LOCKED_BY", "LOCKED_AT"
      ];
      const rows = settlements.map((item) => [
        period.payrollPeriodId, item.staffId, item.staffNameSnapshot, item.branchId,
        item.requiredMinutes, item.workedMinutes, item.deficitMinutes,
        item.approvedOvertimeMinutes, item.deficitDeductionMinor,
        item.unpaidLeaveDeductionMinor, item.absenceDeductionMinor,
        item.overtimeCompensationMinor, item.manualAdjustmentsMinor,
        item.netAttendanceAdjustmentMinor, item.currency, item.calculationVersion,
        item.sourceAggregateHash, item.status,
        parseJson(item.warningsJson || item.warnings, []).join("|"),
        period.approvedBy || "", period.lockedBy || "", period.lockedAt || ""
      ]);
      const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
      return {
        status: "success", code: execute ? "PAYROLL_EXPORT_OK" : "PAYROLL_EXPORT_PREVIEW_OK",
        format: "CSV_UTF8", payrollPeriod: period, rowCount: rows.length,
        staleWarning: stale, headers, rows, csv
      };
    }
    return Object.freeze({
      execute(action, data) {
        if (!ACTIONS.includes(action) || action === "previewPayrollPhase4Migration") {
          throw error("PAYROLL_ACTION_UNKNOWN", "Payroll attendance action is unsupported.");
        }
        return handlers[action](data || {});
      }
    });
  }

  function planMigration(existingSheets, identity) {
    const plan = clone(core.planSchemaMigration(existingSheets || {}, identity || {}));
    const environment = text(identity && identity.environment).toLowerCase();
    if (environment === "production") {
      plan.errors = (plan.errors || []).filter((item) => item.code !== "ENVIRONMENT_NOT_APPROVED");
      plan.errors.push({ code: "PHASE4_ENVIRONMENT_BLOCKED" });
      plan.blocked = true;
    }
    plan.phase = 4;
    plan.executionAllowed = false;
    plan.writes = 0;
    plan.rollback.historicalRowsTouched = 0;
    plan.sourceDataReadiness = {
      requiresPhase3AggregateFields: [
        "ATTENDANCE_DAY_ID", "ATTENDANCE_DATE", "CALCULATION_VERSION",
        "SOURCE_EVENT_HASH", "DEFICIT_MINUTES_ROUNDED", "APPROVED_OVERTIME_MINUTES",
        "POLICY_SNAPSHOT", "SCHEDULE_SNAPSHOT", "LOCKED"
      ]
    };
    return Object.freeze(plan);
  }

  return Object.freeze({
    VERSION, TIME_ZONE, CURRENCY, MINOR_SCALE, PERIOD_STATUSES, ACTIONS, WRITE_ACTIONS,
    SHEET_SCHEMAS: schema.SHEET_SCHEMAS, parseMajorToMinor, roundDivide,
    calculateEmployeeSettlement, normalizeLegacyPayrollRows,
    filterSecrets, createMemoryRepository,
    createService, planMigration, error
  });
});

/* END staff-payroll-attendance-phase4.js */

/* BEGIN staff-payroll-attendance-phase4-gas.js */
/* global StaffPayrollAttendancePhase4, SpreadsheetApp, LockService, PropertiesService,
  Utilities, console, getCutHubEnvironmentConfig, assertStagingEnvironment, jsonOutput, schedulePhase2Actor,
  schedulePhase2ReadRows, schedulePhase2Headers, schedulePhase2AssertHeaders,
  schedulePhase2AssertNoDuplicateHeaders, schedulePhase2Canonical, schedulePhase2Camel,
  schedulePhase2Sheet, schedulePhase2RecordUndo, schedulePhase2RollbackTransaction,
  attendancePhase3ReadDays, attendancePhase3Save */

var payrollAttendancePhase4Transaction = null;

function payrollAttendancePhase4Now() {
  return Utilities.formatDate(new Date(), StaffPayrollAttendancePhase4.TIME_ZONE,
    "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function payrollAttendancePhase4ReadJsonFields(record, fields) {
  fields.forEach(function (key) {
    if (typeof record[key] === "string") {
      try { record[key] = JSON.parse(record[key]); } catch (_error) { record[key] = []; }
    }
  });
  return record;
}

function payrollAttendancePhase4DateOnly(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, StaffPayrollAttendancePhase4.TIME_ZONE, "yyyy-MM-dd");
  }
  var source = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(source)) return source;
  if (/^\d{4}-\d{2}-\d{2}T/.test(source)) {
    var parsed = new Date(source);
    if (!isNaN(parsed.getTime())) {
      return Utilities.formatDate(parsed, StaffPayrollAttendancePhase4.TIME_ZONE, "yyyy-MM-dd");
    }
  }
  return source;
}

function payrollAttendancePhase4NormalizeDateOnlyFields(record, fields) {
  fields.forEach(function (key) {
    record[key] = payrollAttendancePhase4DateOnly(record[key]);
  });
  return record;
}

function payrollAttendancePhase4ReadPeriods() {
  return schedulePhase2ReadRows("PAYROLL_ATTENDANCE_PERIODS").map(function (item) {
    return payrollAttendancePhase4NormalizeDateOnlyFields(item, ["startDate", "endDate"]);
  });
}

function payrollAttendancePhase4ReadStaff() {
  var sheet = schedulePhase2Sheet("STAFF", true);
  if (sheet.getLastRow() < 2) return [];
  var width = Math.max(11, sheet.getLastColumn());
  var headers = schedulePhase2Headers(sheet);
  schedulePhase2AssertNoDuplicateHeaders("STAFF", headers);
  var branchIndex = headers.indexOf("BRANCH_ID");
  var salaryBasisIndex = headers.indexOf("SALARY_BASIS");
  var currencyIndex = headers.indexOf("CURRENCY");
  var salaryMinorIndex = headers.indexOf("BASE_SALARY_MINOR");
  var staff = sheet.getRange(2, 1, sheet.getLastRow() - 1, width).getValues()
    .map(function (row, index) {
      return {
        staffId: String(row[4] || "").trim(),
        staffName: String(row[0] || "").trim(),
        salary: row[2],
        salaryMinor: salaryMinorIndex >= 0 ? row[salaryMinorIndex] : "",
        salaryBasis: salaryBasisIndex >= 0 ? row[salaryBasisIndex] : "MONTHLY",
        currency: currencyIndex >= 0 ? row[currencyIndex] : "EGP",
        branchId: branchIndex >= 0 ? String(row[branchIndex] || "").trim() : "",
        active: row[7] === "" ? true : String(row[7]).toUpperCase() !== "FALSE",
        sourceRowNumber: index + 2
      };
    }).filter(function (staff) { return !!staff.staffName; });
  var active = staff.filter(function (item) { return item.active !== false; });
  if (active.some(function (item) { return !item.staffId; })) {
    var missingId = new Error("Active payroll staff requires a stable STAFF_ID.");
    missingId.code = "PAYROLL_STAFF_ID_REQUIRED";
    throw missingId;
  }
  var seen = {};
  active.forEach(function (item) {
    seen[item.staffId] = (seen[item.staffId] || 0) + 1;
  });
  if (Object.keys(seen).some(function (id) { return seen[id] > 1; })) {
    var duplicateId = new Error("Active payroll STAFF_ID values must be unique.");
    duplicateId.code = "PAYROLL_STAFF_ID_AMBIGUOUS";
    throw duplicateId;
  }
  return staff.map(function (item) {
    delete item.sourceRowNumber;
    return item;
  });
}

function payrollAttendancePhase4ReadSettlements() {
  return schedulePhase2ReadRows("PAYROLL_ATTENDANCE_SETTLEMENTS").map(function (item) {
    payrollAttendancePhase4NormalizeDateOnlyFields(item, ["periodStart", "periodEnd"]);
    payrollAttendancePhase4ReadJsonFields(item, [
      "sourceAttendanceDayIds", "sourceAttendanceSnapshot",
      "policySnapshot", "salarySnapshot", "warnings", "blockers"
    ]);
    item.locked = item.locked === true || String(item.locked).toUpperCase() === "TRUE";
    item.stale = item.stale === true || String(item.stale).toUpperCase() === "TRUE";
    return item;
  });
}

function payrollAttendancePhase4Unique(rows, key, value, code) {
  var matches = rows.filter(function (item) {
    return String(item[key] || "").trim() === String(value || "").trim();
  });
  if (matches.length > 1) {
    var duplicate = new Error("Duplicate payroll entity identity.");
    duplicate.code = code;
    throw duplicate;
  }
  return matches[0] || null;
}

function payrollAttendancePhase4WithTransaction(details, callback) {
  var properties = PropertiesService.getScriptProperties();
  var markerKey = "PAYROLL_ATTENDANCE_RECOVERY_" + details.requestId;
  var marker = {
    version: StaffPayrollAttendancePhase4.VERSION,
    action: details.action,
    requestId: details.requestId,
    actorId: details.actorId,
    status: "IN_PROGRESS",
    startedAt: payrollAttendancePhase4Now()
  };
  properties.setProperty(markerKey, JSON.stringify(marker));
  schedulePhase2Transaction = { entries: [] };
  payrollAttendancePhase4Transaction = schedulePhase2Transaction;
  try {
    var result = callback();
    properties.deleteProperty(markerKey);
    schedulePhase2Transaction = null;
    payrollAttendancePhase4Transaction = null;
    return result;
  } catch (caught) {
    var failures = schedulePhase2RollbackTransaction();
    schedulePhase2Transaction = null;
    payrollAttendancePhase4Transaction = null;
    if (failures.length) {
      marker.status = "COMPENSATION_FAILED";
      marker.failureCount = failures.length;
      marker.originalErrorCode = caught.code || "";
      properties.setProperty(markerKey, JSON.stringify(marker));
      var recoveryError = new Error("Payroll write failed and compensation was incomplete.");
      recoveryError.code = "PAYROLL_COMPENSATION_FAILED";
      recoveryError.details = { recoverable: true };
      throw recoveryError;
    }
    properties.deleteProperty(markerKey);
    throw caught;
  }
}

function payrollAttendancePhase4CreateRepository() {
  return {
    listPeriods: payrollAttendancePhase4ReadPeriods,
    getPeriod: function (id) {
      return payrollAttendancePhase4Unique(
        payrollAttendancePhase4ReadPeriods(),
        "payrollPeriodId", id, "PAYROLL_PERIOD_ID_AMBIGUOUS");
    },
    savePeriod: function (record) {
      return attendancePhase3Save("PAYROLL_ATTENDANCE_PERIODS",
        StaffPayrollAttendancePhase4.SHEET_SCHEMAS.PAYROLL_ATTENDANCE_PERIODS,
        "PAYROLL_PERIOD_ID", record, false);
    },
    listSettlements: function (filters) {
      filters = filters || {};
      return payrollAttendancePhase4ReadSettlements().filter(function (item) {
        return (!filters.payrollPeriodId || item.payrollPeriodId === filters.payrollPeriodId) &&
          (!filters.staffId || item.staffId === filters.staffId) &&
          (!filters.status || String(item.status).toUpperCase() ===
            String(filters.status).toUpperCase());
      });
    },
    getSettlement: function (id) {
      return payrollAttendancePhase4Unique(payrollAttendancePhase4ReadSettlements(),
        "settlementId", id, "PAYROLL_SETTLEMENT_ID_AMBIGUOUS");
    },
    saveSettlement: function (record) {
      return attendancePhase3Save("PAYROLL_ATTENDANCE_SETTLEMENTS",
        StaffPayrollAttendancePhase4.SHEET_SCHEMAS.PAYROLL_ATTENDANCE_SETTLEMENTS,
        "SETTLEMENT_ID", record, false);
    },
    listAdjustments: function (filters) {
      filters = filters || {};
      return schedulePhase2ReadRows("PAYROLL_ATTENDANCE_ADJUSTMENTS").filter(function (item) {
        return (!filters.settlementId || item.settlementId === filters.settlementId) &&
          (!filters.payrollPeriodId || item.payrollPeriodId === filters.payrollPeriodId) &&
          (!filters.status || String(item.status).toUpperCase() ===
            String(filters.status).toUpperCase());
      });
    },
    getAdjustment: function (id) {
      return payrollAttendancePhase4Unique(
        schedulePhase2ReadRows("PAYROLL_ATTENDANCE_ADJUSTMENTS"),
        "adjustmentId", id, "PAYROLL_ADJUSTMENT_ID_AMBIGUOUS");
    },
    appendAdjustment: function (record) {
      return attendancePhase3Save("PAYROLL_ATTENDANCE_ADJUSTMENTS",
        StaffPayrollAttendancePhase4.SHEET_SCHEMAS.PAYROLL_ATTENDANCE_ADJUSTMENTS,
        "ADJUSTMENT_ID", record, true);
    },
    listAttendanceDays: function (filters) {
      filters = filters || {};
      return attendancePhase3ReadDays().filter(function (item) {
        return (!filters.staffId || item.staffId === filters.staffId) &&
          (!filters.dateFrom || item.attendanceDate >= filters.dateFrom) &&
          (!filters.dateTo || item.attendanceDate <= filters.dateTo);
      });
    },
    listStaff: payrollAttendancePhase4ReadStaff,
    getStaff: function (id) {
      return payrollAttendancePhase4Unique(payrollAttendancePhase4ReadStaff(),
        "staffId", id, "PAYROLL_STAFF_ID_AMBIGUOUS");
    },
    listPolicies: function () { return schedulePhase2ReadRows("STAFF_WORK_POLICIES"); },
    appendAudit: function (record) {
      return attendancePhase3Save("PAYROLL_ATTENDANCE_AUDIT",
        StaffPayrollAttendancePhase4.SHEET_SCHEMAS.PAYROLL_ATTENDANCE_AUDIT,
        "ACTION_ID", record, true);
    },
    listAudit: function (filters) {
      filters = filters || {};
      return schedulePhase2ReadRows("PAYROLL_ATTENDANCE_AUDIT").filter(function (item) {
        return (!filters.entityId || item.entityId === filters.entityId) &&
          (!filters.staffId || item.staffId === filters.staffId);
      });
    },
    getIdempotency: function (id) {
      var item = payrollAttendancePhase4Unique(
        schedulePhase2ReadRows("PAYROLL_ATTENDANCE_IDEMPOTENCY"),
        "requestId", id, "PAYROLL_IDEMPOTENCY_AMBIGUOUS");
      if (item) {
        item.requestFingerprint = item.requestFingerprint || item.fingerprint;
        item.responseJson = typeof item.response === "object"
          ? JSON.stringify(item.response) : (item.responseJson || item.response || "");
      }
      return item;
    },
    saveIdempotency: function (record) {
      return attendancePhase3Save("PAYROLL_ATTENDANCE_IDEMPOTENCY",
        StaffPayrollAttendancePhase4.SHEET_SCHEMAS.PAYROLL_ATTENDANCE_IDEMPOTENCY,
        "REQUEST_ID", record, false);
    },
    withTransaction: payrollAttendancePhase4WithTransaction
  };
}

function payrollAttendancePhase4WithLock(_details, callback) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    var lockError = new Error("Another payroll attendance mutation is in progress.");
    lockError.code = "PAYROLL_WRITE_LOCK_TIMEOUT";
    throw lockError;
  }
  try { return callback(); } finally { lock.releaseLock(); }
}

function payrollAttendancePhase4Environment() {
  var config = getCutHubEnvironmentConfig();
  var spreadsheet = SpreadsheetApp.getActive();
  if (!config.environment ||
      ["development", "test", "staging", "production"].indexOf(config.environment) === -1) {
    var environmentError = new Error("Payroll environment identity is invalid.");
    environmentError.code = "PAYROLL_ENVIRONMENT_IDENTITY_INVALID";
    throw environmentError;
  }
  if (!config.spreadsheetId || !spreadsheet || spreadsheet.getId() !== config.spreadsheetId) {
    var spreadsheetError = new Error("Payroll spreadsheet identity does not match configuration.");
    spreadsheetError.code = "PAYROLL_SPREADSHEET_IDENTITY_MISMATCH";
    throw spreadsheetError;
  }
  return { config: config, spreadsheet: spreadsheet };
}

function payrollAttendancePhase4AssertSchema() {
  [
    "ATTENDANCE", "STAFF_WORK_POLICIES", "PAYROLL_ATTENDANCE_PERIODS",
    "PAYROLL_ATTENDANCE_SETTLEMENTS", "PAYROLL_ATTENDANCE_ADJUSTMENTS",
    "PAYROLL_ATTENDANCE_AUDIT", "PAYROLL_ATTENDANCE_IDEMPOTENCY"
  ].forEach(function (name) {
    schedulePhase2AssertHeaders(name, StaffPayrollAttendancePhase4.SHEET_SCHEMAS[name]);
  });
}

function payrollAttendancePhase4AssertPreviewEnvironment() {
  var config = getCutHubEnvironmentConfig();
  var environment = String(config.environment || "").toLowerCase();
  if (environment === "production") {
    var blocked = new Error("Phase 4 migration preview cannot access production.");
    blocked.code = "PHASE4_ENVIRONMENT_BLOCKED";
    throw blocked;
  }
  if (["development", "test", "staging"].indexOf(environment) === -1) {
    var invalid = new Error("Phase 4 migration preview requires a recognized environment identity.");
    invalid.code = "PAYROLL_ENVIRONMENT_IDENTITY_INVALID";
    throw invalid;
  }
  if (environment === "staging") {
    return assertStagingEnvironment().config;
  }
  return config;
}

function previewPayrollPhase4Migration(data) {
  var config = payrollAttendancePhase4AssertPreviewEnvironment();
  var identity = payrollAttendancePhase4Environment();
  var existing = {};
  Object.keys(StaffPayrollAttendancePhase4.SHEET_SCHEMAS).forEach(function (name) {
    var sheet = identity.spreadsheet.getSheetByName(name);
    existing[name] = sheet ? schedulePhase2Headers(sheet) : null;
  });
  return StaffPayrollAttendancePhase4.planMigration(existing, {
    environment: identity.config.environment,
    expectedSpreadsheetId: identity.config.spreadsheetId,
    actualSpreadsheetId: identity.spreadsheet.getId(),
    environmentReviewApproved: config.environment === "staging"
  });
}

function diagnosticPreviewPayrollPhase4Migration(data) {
  var config = getCutHubEnvironmentConfig();
  var environment = String(config.environment || "").toLowerCase();
  if (["development", "staging"].indexOf(environment) === -1) {
    var blocked = new Error("Payroll migration diagnostic preview is limited to development and staging.");
    blocked.code = "PAYROLL_DIAGNOSTIC_PREVIEW_ENVIRONMENT_BLOCKED";
    throw blocked;
  }
  if (environment === "staging") assertStagingEnvironment();
  var result = previewPayrollPhase4Migration(data);
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function payrollAttendancePhase4RunDiagnosticPreview(data) {
  var config = getCutHubEnvironmentConfig();
  var environment = String(config.environment || "").toLowerCase();
  if (["development", "staging"].indexOf(environment) === -1) {
    var blocked = new Error("Payroll migration diagnostic preview is limited to development and staging.");
    blocked.code = "PAYROLL_DIAGNOSTIC_PREVIEW_ENVIRONMENT_BLOCKED";
    throw blocked;
  }
  if (environment === "staging") assertStagingEnvironment();
  return previewPayrollPhase4Migration(data);
}

function diagnosticPreviewPayrollPhase4MigrationSummary(data) {
  var result = payrollAttendancePhase4RunDiagnosticPreview(data);
  console.log(JSON.stringify({
    schemaVersion: result.schemaVersion,
    version: result.version || StaffPayrollAttendancePhase4.VERSION,
    dryRun: result.dryRun,
    writes: result.writes,
    executionAllowed: result.executionAllowed,
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

function diagnosticPreviewPayrollPhase4MigrationSafety(data) {
  var result = payrollAttendancePhase4RunDiagnosticPreview(data);
  console.log(JSON.stringify({
    errors: result.errors || [],
    rollback: result.rollback || {},
    safe: result.safe,
    dryRun: result.dryRun,
    writes: result.writes,
    executionAllowed: result.executionAllowed,
    historicalRowsTouched: result.rollback && result.rollback.historicalRowsTouched
  }));
  return result;
}

function diagnosticPreviewPayrollPhase4MigrationSheets(data) {
  var result = payrollAttendancePhase4RunDiagnosticPreview(data);
  (result.createSheets || []).forEach(function (item) {
    console.log(JSON.stringify({
      sheetName: item.sheetName,
      headerCount: (item.headers || []).length,
      headers: item.headers || []
    }));
  });
  return result;
}

function diagnosticPreviewPayrollPhase4MigrationColumns(data) {
  var result = payrollAttendancePhase4RunDiagnosticPreview(data);
  console.log(JSON.stringify({
    appendColumns: result.appendColumns || {},
    preservedUnknownColumns: result.preservedUnknownColumns || {}
  }));
  return result;
}

function handleStaffPayrollAttendancePhase4Action(data) {
  try {
    if (!StaffPayrollAttendancePhase4 ||
        StaffPayrollAttendancePhase4.ACTIONS.indexOf(data.action) === -1) {
      throw StaffPayrollAttendancePhase4.error(
        "PAYROLL_ACTION_UNKNOWN", "Payroll attendance action is unsupported.");
    }
    if (data.action === "previewPayrollPhase4Migration") {
      payrollAttendancePhase4AssertPreviewEnvironment();
      var previewActor = schedulePhase2Actor(data);
      if (!previewActor || !previewActor.owner) {
        throw StaffPayrollAttendancePhase4.error(
          "PAYROLL_OWNER_REQUIRED", "Only owner can preview Phase 4 migration.");
      }
      return jsonOutput({
        status: "success", code: "PAYROLL_MIGRATION_PREVIEW_OK",
        migration: StaffPayrollAttendancePhase4.filterSecrets(
          previewPayrollPhase4Migration(data), true)
      });
    }
    payrollAttendancePhase4Environment();
    if (StaffPayrollAttendancePhase4.WRITE_ACTIONS.has(data.action)) {
      payrollAttendancePhase4AssertSchema();
    }
    var service = StaffPayrollAttendancePhase4.createService({
      repository: payrollAttendancePhase4CreateRepository(),
      actorResolver: schedulePhase2Actor,
      withLock: payrollAttendancePhase4WithLock,
      now: payrollAttendancePhase4Now,
      uuid: function () { return Utilities.getUuid(); }
    });
    return jsonOutput(service.execute(data.action, data));
  } catch (caught) {
    return jsonOutput({
      status: "error", code: caught.code || "PAYROLL_INTERNAL_ERROR",
      message: caught.message || "Payroll attendance request failed.",
      details: StaffPayrollAttendancePhase4.filterSecrets(caught.details || {}, false)
    });
  }
}

/* END staff-payroll-attendance-phase4-gas.js */

/* BEGIN staff-schema-migration-staging-executor.js */
/* global SpreadsheetApp, PropertiesService, LockService, Utilities, Session, DriveApp,
  console, getCutHubEnvironmentConfig, assertStagingEnvironment,
  previewStaffScheduleMigration, previewAttendanceMigration, previewPayrollPhase4Migration,
  previewBranchFoundationMigration */

var STAFF_SCHEMA_MIGRATION_JOURNAL_PREFIX = "STAFF_SCHEMA_MIGRATION_JOURNAL_";
var STAFF_SCHEMA_MIGRATION_TOKEN_PREFIX = "STAFF_SCHEMA_MIGRATION_TOKEN_";
var STAFF_SCHEMA_MIGRATION_TOKEN_TTL_MS = 5 * 60 * 1000;
var STAFF_SCHEMA_MIGRATION_LOCK_TIMEOUT_MS = 30000;
var STAFF_SCHEMA_MIGRATION_JOURNAL_MAX_BYTES = 8000;
var STAFF_SCHEMA_MIGRATION_PROPERTY_STORE_MAX_BYTES = 450000;
var STAFF_SCHEMA_MIGRATION_ERROR_MESSAGE_MAX_LENGTH = 500;

function staffSchemaMigrationError(code, message, details) {
  var error = new Error(message || code);
  error.code = code;
  if (details !== undefined) error.details = details;
  return error;
}

function staffSchemaMigrationCanonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map(staffSchemaMigrationCanonical).join(",") + "]";
  }
  return "{" + Object.keys(value).sort().map(function (key) {
    return JSON.stringify(key) + ":" + staffSchemaMigrationCanonical(value[key]);
  }).join(",") + "}";
}

function staffSchemaMigrationHash(value) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    staffSchemaMigrationCanonical(value),
    Utilities.Charset.UTF_8
  );
  return "sha256:" + bytes.map(function (value) {
    var byte = value < 0 ? value + 256 : value;
    return byte.toString(16).padStart(2, "0");
  }).join("");
}

function staffSchemaMigrationPlanHash(plan) {
  plan = plan || {};
  return staffSchemaMigrationHash({
    schemaVersion: plan.schemaVersion,
    version: plan.version,
    dryRun: plan.dryRun,
    writes: plan.writes,
    executionAllowed: plan.executionAllowed,
    identity: plan.identity || {},
    headerNormalization: plan.headerNormalization,
    createSheets: plan.createSheets || [],
    initializeBlankSheets: plan.initializeBlankSheets || [],
    appendColumns: plan.appendColumns || {},
    unchangedSheets: plan.unchangedSheets || [],
    preservedUnknownColumns: plan.preservedUnknownColumns || {},
    errors: plan.errors || [],
    rollback: plan.rollback || {},
    safe: plan.safe
  });
}

function staffSchemaMigrationNow() {
  return new Date().toISOString();
}

function staffSchemaMigrationPhaseDefinition(phase) {
  var key = String(phase || "").toUpperCase();
  var definitions = {
    PHASE2: {
      phase: "PHASE2", migrationId: "STAFF_SCHEDULING_PHASE2_SCHEMA",
      preview: function () {
        return previewStaffScheduleMigration({ environmentReviewApproved: true });
      }, previousPhase: ""
    },
    PHASE3: {
      phase: "PHASE3", migrationId: "ATTENDANCE_PHASE3_SCHEMA",
      preview: function () { return previewAttendanceMigration({}); }, previousPhase: "PHASE2"
    },
    PHASE4: {
      phase: "PHASE4", migrationId: "PAYROLL_ATTENDANCE_PHASE4_SCHEMA",
      preview: function () { return previewPayrollPhase4Migration({}); }, previousPhase: "PHASE3"
    },
    BRANCH_FOUNDATION: {
      phase: "BRANCH_FOUNDATION", migrationId: "BRANCH_FOUNDATION_V1",
      preview: function () { return previewBranchFoundationMigration({}); }, previousPhase: ""
    }
  };
  if (!definitions[key]) {
    throw staffSchemaMigrationError("MIGRATION_PHASE_INVALID", "Migration phase is unsupported.");
  }
  return definitions[key];
}

function staffSchemaMigrationPreflightStaging() {
  var config = getCutHubEnvironmentConfig();
  var environment = String(config.environment || "").trim().toLowerCase();
  if (environment !== "staging") {
    throw staffSchemaMigrationError(
      "MIGRATION_STAGING_ONLY", "Schema migration execution is restricted to Staging."
    );
  }
  if (!config.spreadsheetId || !config.stagingSpreadsheetId ||
      config.spreadsheetId !== config.stagingSpreadsheetId) {
    throw staffSchemaMigrationError(
      "MIGRATION_STAGING_PIN_MISMATCH", "Expected and Staging spreadsheet pins must match."
    );
  }
  var strict = assertStagingEnvironment();
  if (!strict || !strict.spreadsheet ||
      strict.spreadsheet.getId() !== config.spreadsheetId ||
      strict.spreadsheet.getId() !== config.stagingSpreadsheetId) {
    throw staffSchemaMigrationError(
      "MIGRATION_STAGING_IDENTITY_MISMATCH", "Strict Staging identity validation failed."
    );
  }
  return strict;
}

function staffSchemaMigrationAssertOwner(strict) {
  var effectiveEmail = "";
  var activeEmail = "";
  var ownerEmail = "";
  try {
    effectiveEmail = String(Session.getEffectiveUser().getEmail() || "").trim().toLowerCase();
    activeEmail = String(Session.getActiveUser().getEmail() || "").trim().toLowerCase();
    var file = DriveApp.getFileById(strict.spreadsheet.getId());
    var owner = file && file.getOwner ? file.getOwner() : null;
    ownerEmail = String(owner && owner.getEmail ? owner.getEmail() : "").trim().toLowerCase();
  } catch (_error) {
    effectiveEmail = "";
    ownerEmail = "";
  }
  if (!effectiveEmail || !activeEmail || !ownerEmail ||
      effectiveEmail !== activeEmail || activeEmail !== ownerEmail) {
    throw staffSchemaMigrationError(
      "MIGRATION_OWNER_REQUIRED", "Only the verified Staging spreadsheet owner can run schema migration controls."
    );
  }
  return { actorId: effectiveEmail, actorIdentity: effectiveEmail };
}

function staffSchemaMigrationIdentityAndOwner() {
  var strict = staffSchemaMigrationPreflightStaging();
  var actor = staffSchemaMigrationAssertOwner(strict);
  return {
    config: strict.config,
    spreadsheet: strict.spreadsheet,
    actorId: actor.actorId,
    actorIdentity: actor.actorIdentity
  };
}

function staffSchemaMigrationAssertPreview(plan, identity) {
  var errors = plan && Array.isArray(plan.errors) ? plan.errors : [];
  if (!plan || plan.safe !== true || errors.length !== 0 ||
      plan.dryRun !== true || Number(plan.writes) !== 0) {
    throw staffSchemaMigrationError(
      "MIGRATION_PREVIEW_NOT_SAFE", "The approved preview preconditions were not satisfied.",
      { errors: errors }
    );
  }
  var planIdentity = plan.identity || {};
  if (String(planIdentity.environment || "").toLowerCase() !== "staging" ||
      String(planIdentity.expectedSpreadsheetId || "") !== identity.spreadsheet.getId() ||
      String(planIdentity.actualSpreadsheetId || "") !== identity.spreadsheet.getId()) {
    throw staffSchemaMigrationError(
      "MIGRATION_PREVIEW_IDENTITY_MISMATCH", "Preview identity does not match strict Staging identity."
    );
  }
  return plan;
}

function staffSchemaMigrationPendingOperations(plan) {
  return (plan.createSheets || []).length +
    (plan.initializeBlankSheets || []).length +
    Object.keys(plan.appendColumns || {}).length;
}

function staffSchemaMigrationAssertExecutionOrder(definition, identity) {
  if (!definition.previousPhase) return;
  var previous = staffSchemaMigrationPhaseDefinition(definition.previousPhase);
  var previousPlan = staffSchemaMigrationAssertPreview(previous.preview(), identity);
  if (staffSchemaMigrationPendingOperations(previousPlan) !== 0) {
    throw staffSchemaMigrationError(
      "MIGRATION_EXECUTION_ORDER_REQUIRED",
      previous.phase + " schema must be complete before " + definition.phase + "."
    );
  }
}

function staffSchemaMigrationSchemaVersion(plan) {
  return String(plan.schemaVersion || plan.version || "");
}

function staffSchemaMigrationJournalKey(phase, requestId, spreadsheetId, actorIdentity) {
  return STAFF_SCHEMA_MIGRATION_JOURNAL_PREFIX +
    String(phase) + "_" +
    staffSchemaMigrationHash(String(spreadsheetId)).slice(7) + "_" +
    staffSchemaMigrationHash(String(actorIdentity)).slice(7) + "_" +
    staffSchemaMigrationHash(String(requestId)).slice(7);
}

function staffSchemaMigrationTokenKey(phase) {
  return STAFF_SCHEMA_MIGRATION_TOKEN_PREFIX + String(phase);
}

function staffSchemaMigrationReadJson(store, key) {
  var raw = store.getProperty(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (_error) {
    throw staffSchemaMigrationError("MIGRATION_STATE_CORRUPT", "Migration state is not valid JSON.");
  }
}

function staffSchemaMigrationWriteJournal(key, journal) {
  journal.updatedAt = staffSchemaMigrationNow();
  var payload = JSON.stringify(journal);
  var byteLength = typeof Utilities.newBlob === "function"
    ? Utilities.newBlob(payload).getBytes().length
    : unescape(encodeURIComponent(payload)).length;
  if (byteLength > STAFF_SCHEMA_MIGRATION_JOURNAL_MAX_BYTES) {
    throw staffSchemaMigrationError(
      "MIGRATION_JOURNAL_SIZE_LIMIT",
      "Migration journal exceeds the guarded Script Property size limit.",
      { byteLength: byteLength, maximumBytes: STAFF_SCHEMA_MIGRATION_JOURNAL_MAX_BYTES }
    );
  }
  var properties = PropertiesService.getScriptProperties();
  var current = properties.getProperties();
  var totalBytes = Object.keys(current).reduce(function (total, currentKey) {
    return total + (typeof Utilities.newBlob === "function"
      ? Utilities.newBlob(currentKey + current[currentKey]).getBytes().length
      : unescape(encodeURIComponent(currentKey + current[currentKey])).length);
  }, 0);
  var replacedBytes = current[key] ? (typeof Utilities.newBlob === "function"
    ? Utilities.newBlob(key + current[key]).getBytes().length
    : unescape(encodeURIComponent(key + current[key])).length) : 0;
  var projectedBytes = totalBytes - replacedBytes + byteLength +
    (typeof Utilities.newBlob === "function"
      ? Utilities.newBlob(key).getBytes().length
      : unescape(encodeURIComponent(key)).length);
  if (projectedBytes > STAFF_SCHEMA_MIGRATION_PROPERTY_STORE_MAX_BYTES) {
    throw staffSchemaMigrationError(
      "MIGRATION_PROPERTY_STORE_SIZE_LIMIT",
      "Migration journal would exceed the guarded Script Property store limit.",
      { projectedBytes: projectedBytes, maximumBytes: STAFF_SCHEMA_MIGRATION_PROPERTY_STORE_MAX_BYTES }
    );
  }
  properties.setProperty(key, payload);
}

function staffSchemaMigrationErrorDetail(error) {
  return {
    code: String(error && error.code || "MIGRATION_EXECUTION_FAILED").slice(0, 120),
    message: String(error && error.message || error || "Migration execution failed.")
      .slice(0, STAFF_SCHEMA_MIGRATION_ERROR_MESSAGE_MAX_LENGTH)
  };
}

function staffSchemaMigrationFingerprint(definition, requestId, planHash, identity, requestContext) {
  return staffSchemaMigrationHash({
    phase: definition.phase,
    migrationId: definition.migrationId,
    requestId: requestId,
    planHash: planHash,
    spreadsheetId: identity.spreadsheet.getId(),
    actorIdentity: identity.actorIdentity,
    requestContext: String(requestContext || "")
  });
}

function staffSchemaMigrationTryLocks(callback) {
  var scriptLock = LockService.getScriptLock();
  var documentLock = LockService.getDocumentLock ? LockService.getDocumentLock() : null;
  if (!scriptLock.tryLock(STAFF_SCHEMA_MIGRATION_LOCK_TIMEOUT_MS)) {
    throw staffSchemaMigrationError("MIGRATION_CONCURRENT_EXECUTION", "Another migration is active.");
  }
  var documentLocked = false;
  try {
    if (documentLock) {
      documentLocked = documentLock.tryLock(STAFF_SCHEMA_MIGRATION_LOCK_TIMEOUT_MS);
      if (!documentLocked) {
        throw staffSchemaMigrationError("MIGRATION_CONCURRENT_EXECUTION", "Spreadsheet migration lock is active.");
      }
    }
    return callback();
  } finally {
    if (documentLock && documentLocked) documentLock.releaseLock();
    scriptLock.releaseLock();
  }
}

function staffSchemaMigrationPrepare(phase, data) {
  data = data && typeof data === "object" ? data : {};
  var definition = staffSchemaMigrationPhaseDefinition(phase);
  var identity = staffSchemaMigrationIdentityAndOwner();
  var requestId = String(data.requestId || Utilities.getUuid() || "").trim();
  var requestContext = String(data.requestContext || "").trim();
  if (!requestId || requestId.length > 160) {
    throw staffSchemaMigrationError("MIGRATION_REQUEST_ID_INVALID", "A valid requestId is required.");
  }
  return staffSchemaMigrationTryLocks(function () {
    var journalKey = staffSchemaMigrationJournalKey(
      definition.phase, requestId, identity.spreadsheet.getId(), identity.actorIdentity
    );
    var scriptProperties = PropertiesService.getScriptProperties();
    var existing = staffSchemaMigrationReadJson(scriptProperties, journalKey);
    if (existing && ["APPLYING", "RECOVERY_REQUIRED"].indexOf(existing.status) !== -1) {
      throw staffSchemaMigrationError(
        "MIGRATION_REQUEST_NOT_PREPARABLE", "The existing request requires completion or recovery."
      );
    }
    staffSchemaMigrationAssertExecutionOrder(definition, identity);
    var plan = staffSchemaMigrationAssertPreview(definition.preview(), identity);
    var planHash = staffSchemaMigrationPlanHash(plan);
    var bindingPlanHash = existing && existing.status === "COMMITTED"
      ? existing.exactPlanHash : planHash;
    var fingerprint = staffSchemaMigrationFingerprint(
      definition, requestId, bindingPlanHash, identity, requestContext
    );
    if (existing && existing.requestFingerprint !== fingerprint) {
      throw staffSchemaMigrationError(
        "MIGRATION_REQUEST_ID_REUSED", "requestId was already bound to a different migration payload."
      );
    }
    var now = Date.now();
    var token = Utilities.getUuid() + "-" + Utilities.getUuid();
    var tokenRecord = {
      token: token,
      tokenHash: staffSchemaMigrationHash(token),
      phase: definition.phase,
      requestId: requestId,
      requestFingerprint: fingerprint,
      exactPlanHash: bindingPlanHash,
      spreadsheetId: identity.spreadsheet.getId(),
      actorIdentity: identity.actorIdentity,
      expiresAt: new Date(now + STAFF_SCHEMA_MIGRATION_TOKEN_TTL_MS).toISOString()
    };
    var journal = existing && existing.status === "COMMITTED" ? existing : {
      migrationId: definition.migrationId,
      schemaVersion: staffSchemaMigrationSchemaVersion(plan),
      phase: definition.phase,
      requestId: requestId,
      actorIdentity: identity.actorIdentity,
      expectedSpreadsheetId: identity.spreadsheet.getId(),
      startedTimestamp: staffSchemaMigrationNow(),
      completedTimestamp: "",
      status: "PREPARED",
      exactPlanHash: planHash,
      requestFingerprint: fingerprint,
      requestContext: requestContext,
      createdSheetNames: [],
      initializedBlankSheets: [],
      appendedColumnRanges: [],
      errorDetails: [],
      writes: 0,
      finalResult: null
    };
    if (journal.status !== "COMMITTED") staffSchemaMigrationWriteJournal(journalKey, journal);
    PropertiesService.getUserProperties().setProperty(
      staffSchemaMigrationTokenKey(definition.phase), JSON.stringify(tokenRecord)
    );
    var summary = {
      token: token,
      expiresAt: tokenRecord.expiresAt,
      phase: definition.phase,
      requestId: requestId,
      exactPlanHash: bindingPlanHash,
      spreadsheetId: tokenRecord.spreadsheetId,
      actorIdentity: tokenRecord.actorIdentity,
      createSheetNames: (plan.createSheets || []).map(function (item) { return item.sheetName; }),
      initializeBlankSheetNames: (plan.initializeBlankSheets || []).map(function (item) {
        return item.sheetName;
      }),
      appendColumnSheetNames: Object.keys(plan.appendColumns || {}),
      alreadyCommitted: journal.status === "COMMITTED"
    };
    console.log(JSON.stringify({
      tokenIssued: true,
      expiresAt: summary.expiresAt,
      phase: summary.phase,
      requestId: summary.requestId,
      exactPlanHash: summary.exactPlanHash,
      spreadsheetId: summary.spreadsheetId,
      actorIdentity: summary.actorIdentity,
      createSheetNames: summary.createSheetNames,
      initializeBlankSheetNames: summary.initializeBlankSheetNames,
      appendColumnSheetNames: summary.appendColumnSheetNames,
      alreadyCommitted: summary.alreadyCommitted
    }));
    return summary;
  });
}

function prepareStaffScheduleMigrationExecution(data) {
  return staffSchemaMigrationPrepare("PHASE2", data);
}

function prepareAttendanceMigrationExecution(data) {
  return staffSchemaMigrationPrepare("PHASE3", data);
}

function preparePayrollPhase4MigrationExecution(data) {
  return staffSchemaMigrationPrepare("PHASE4", data);
}

function prepareBranchFoundationMigration(data) {
  return staffSchemaMigrationPrepare("BRANCH_FOUNDATION", data);
}

function staffSchemaMigrationReadPreparedToken(phase, suppliedToken) {
  var userProperties = PropertiesService.getUserProperties();
  var key = staffSchemaMigrationTokenKey(phase);
  var record = staffSchemaMigrationReadJson(userProperties, key);
  if (!record || !suppliedToken || record.tokenHash !== staffSchemaMigrationHash(suppliedToken)) {
    throw staffSchemaMigrationError("MIGRATION_TOKEN_INVALID", "Confirmation token is invalid or already consumed.");
  }
  if (Date.parse(record.expiresAt || "") <= Date.now()) {
    userProperties.deleteProperty(key);
    throw staffSchemaMigrationError("MIGRATION_TOKEN_EXPIRED", "Confirmation token has expired.");
  }
  return { key: key, record: record, store: userProperties };
}

function staffSchemaMigrationHeaderValues(sheet) {
  var lastColumn = sheet.getLastColumn();
  if (!lastColumn) return [];
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function (value) {
    return String(value == null ? "" : value).trim().toUpperCase()
      .replace(/[\s-]+/g, "_").replace(/_+/g, "_");
  });
}

function staffSchemaMigrationEnsureColumns(sheet, count) {
  var maximum = sheet.getMaxColumns ? sheet.getMaxColumns() : sheet.getLastColumn();
  if (maximum < count) sheet.insertColumnsAfter(Math.max(1, maximum), count - maximum);
}

function staffSchemaMigrationOperations(plan) {
  var operations = [];
  (plan.createSheets || []).forEach(function (item) {
    operations.push({ type: "CREATE_SHEET", sheetName: item.sheetName, headers: item.headers || [] });
  });
  (plan.initializeBlankSheets || []).forEach(function (item) {
    operations.push({ type: "INITIALIZE_BLANK_SHEET", sheetName: item.sheetName, headers: item.headers || [] });
  });
  (plan.rollback && plan.rollback.appendedColumnRanges || []).forEach(function (item) {
    operations.push({
      type: "APPEND_COLUMNS", sheetName: item.sheetName,
      startColumn: item.startColumn, endColumn: item.endColumn, headers: item.headers || []
    });
  });
  return operations;
}

function staffSchemaMigrationEnrichOperation(spreadsheet, operation) {
  if (operation.type === "CREATE_SHEET") return operation;
  var sheet = spreadsheet.getSheetByName(operation.sheetName);
  if (!sheet) return operation;
  var maximum = sheet.getMaxColumns ? sheet.getMaxColumns() : sheet.getLastColumn();
  var required = operation.type === "APPEND_COLUMNS"
    ? operation.endColumn : operation.headers.length;
  operation.preExistingMaxColumns = maximum;
  operation.insertedColumnCount = Math.max(0, required - maximum);
  operation.insertedColumnStart = operation.insertedColumnCount
    ? required - operation.insertedColumnCount + 1 : 0;
  return operation;
}

function staffSchemaMigrationApplyOperation(spreadsheet, operation) {
  var sheet;
  if (operation.type === "CREATE_SHEET") {
    if (spreadsheet.getSheetByName(operation.sheetName)) {
      throw staffSchemaMigrationError("MIGRATION_STATE_CHANGED", "A planned missing sheet now exists.");
    }
    sheet = spreadsheet.insertSheet(operation.sheetName);
    staffSchemaMigrationEnsureColumns(sheet, operation.headers.length);
    if (operation.headers.length) {
      sheet.getRange(1, 1, 1, operation.headers.length).setValues([operation.headers]);
    }
    return;
  }
  sheet = spreadsheet.getSheetByName(operation.sheetName);
  if (!sheet) throw staffSchemaMigrationError("MIGRATION_STATE_CHANGED", "Planned sheet is missing.");
  if (operation.type === "INITIALIZE_BLANK_SHEET") {
    if (staffSchemaMigrationHeaderValues(sheet).filter(Boolean).length) {
      throw staffSchemaMigrationError("MIGRATION_STATE_CHANGED", "Planned blank sheet is no longer blank.");
    }
    staffSchemaMigrationEnsureColumns(sheet, operation.headers.length);
    sheet.getRange(1, 1, 1, operation.headers.length).setValues([operation.headers]);
    return;
  }
  if (operation.type === "APPEND_COLUMNS") {
    var headers = staffSchemaMigrationHeaderValues(sheet);
    if (headers.length + 1 !== operation.startColumn) {
      throw staffSchemaMigrationError("MIGRATION_STATE_CHANGED", "Append position changed after preview.");
    }
    staffSchemaMigrationEnsureColumns(sheet, operation.endColumn);
    sheet.getRange(1, operation.startColumn, 1, operation.headers.length)
      .setValues([operation.headers]);
  }
}

function staffSchemaMigrationRangeHasDataBelow(sheet, startColumn, width) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  var range = sheet.getRange(2, startColumn, lastRow - 1, width);
  var hasValue = range.getValues().some(function (row) {
    return row.some(function (value) { return value !== "" && value !== null; });
  });
  var hasFormula = typeof range.getFormulas === "function" &&
    range.getFormulas().some(function (row) {
      return row.some(function (formula) { return String(formula || "") !== ""; });
    });
  return hasValue || hasFormula;
}

function staffSchemaMigrationHeaderProof(headers) {
  var normalized = (headers || []).map(function (value) {
    return String(value == null ? "" : value).trim().toUpperCase()
      .replace(/[\s-]+/g, "_").replace(/_+/g, "_");
  });
  return { headerCount: normalized.length, headerHash: staffSchemaMigrationHash(normalized) };
}

function staffSchemaMigrationHeadersMatch(sheet, startColumn, proof) {
  if (!proof.headerCount) return true;
  var actual = sheet.getRange(1, startColumn, 1, proof.headerCount).getValues()[0];
  return staffSchemaMigrationHeaderProof(actual).headerHash === proof.headerHash;
}

function staffSchemaMigrationRollback(spreadsheet, journal) {
  var failures = [];
  var appended = (journal.appendedColumnRanges || []).slice().reverse();
  appended.forEach(function (item) {
    try {
      var sheet = spreadsheet.getSheetByName(item.sheetName);
      var width = item.endColumn - item.startColumn + 1;
      if (!sheet) throw new Error("Append target sheet is missing.");
      if (sheet.getLastColumn() < item.startColumn) return;
      if (sheet.getLastColumn() !== item.endColumn ||
          !staffSchemaMigrationHeadersMatch(sheet, item.startColumn, item) ||
          staffSchemaMigrationRangeHasDataBelow(sheet, item.startColumn, width)) {
        throw new Error("Appended columns are not provably unused.");
      }
      sheet.getRange(1, item.startColumn, 1, width).clearContent();
      if (item.insertedColumnCount) {
        sheet.deleteColumns(item.insertedColumnStart, item.insertedColumnCount);
      }
    } catch (error) {
      failures.push({
        operation: "APPEND_COLUMNS", sheetName: item.sheetName,
        message: String(error.message || error).slice(0, STAFF_SCHEMA_MIGRATION_ERROR_MESSAGE_MAX_LENGTH)
      });
    }
  });
  (journal.initializedBlankSheets || []).slice().reverse().forEach(function (item) {
    try {
      var sheet = spreadsheet.getSheetByName(item.sheetName);
      if (!sheet) throw new Error("Initialized sheet is missing.");
      if (!staffSchemaMigrationHeaderValues(sheet).filter(Boolean).length) return;
      if (sheet.getLastColumn() !== item.headerCount ||
          !staffSchemaMigrationHeadersMatch(sheet, 1, item) ||
          staffSchemaMigrationRangeHasDataBelow(sheet, 1, item.headerCount)) {
        throw new Error("Initialized headers are not provably unused.");
      }
      sheet.getRange(1, 1, 1, item.headerCount).clearContent();
      if (item.insertedColumnCount) {
        sheet.deleteColumns(item.insertedColumnStart, item.insertedColumnCount);
      }
    } catch (error) {
      failures.push({
        operation: "INITIALIZE_BLANK_SHEET", sheetName: item.sheetName,
        message: String(error.message || error).slice(0, STAFF_SCHEMA_MIGRATION_ERROR_MESSAGE_MAX_LENGTH)
      });
    }
  });
  (journal.createdSheets || []).slice().reverse().forEach(function (item) {
    try {
      var sheet = spreadsheet.getSheetByName(item.sheetName);
      if (!sheet) return;
      if (sheet.getLastRow() === 0) {
        spreadsheet.deleteSheet(sheet);
        return;
      }
      if (sheet.getLastColumn() !== item.headerCount ||
          !staffSchemaMigrationHeadersMatch(sheet, 1, item) ||
          sheet.getLastRow() > 1) {
        throw new Error("Created sheet is not provably header-only.");
      }
      spreadsheet.deleteSheet(sheet);
    } catch (error) {
      failures.push({
        operation: "CREATE_SHEET", sheetName: item.sheetName,
        message: String(error.message || error).slice(0, STAFF_SCHEMA_MIGRATION_ERROR_MESSAGE_MAX_LENGTH)
      });
    }
  });
  return failures;
}

function staffSchemaMigrationRecordOperation(journal, operation) {
  var proof = staffSchemaMigrationHeaderProof(operation.headers);
  if (operation.type === "CREATE_SHEET") {
    journal.createdSheetNames.push(operation.sheetName);
    journal.createdSheets = journal.createdSheets || [];
    journal.createdSheets.push({
      sheetName: operation.sheetName,
      headerCount: proof.headerCount,
      headerHash: proof.headerHash
    });
  } else if (operation.type === "INITIALIZE_BLANK_SHEET") {
    journal.initializedBlankSheets.push({
      sheetName: operation.sheetName,
      preExistingMaxColumns: operation.preExistingMaxColumns,
      insertedColumnStart: operation.insertedColumnStart,
      insertedColumnCount: operation.insertedColumnCount || 0,
      headerCount: proof.headerCount,
      headerHash: proof.headerHash
    });
  } else if (operation.type === "APPEND_COLUMNS") {
    journal.appendedColumnRanges.push({
      sheetName: operation.sheetName, startColumn: operation.startColumn,
      endColumn: operation.endColumn,
      preExistingMaxColumns: operation.preExistingMaxColumns,
      insertedColumnStart: operation.insertedColumnStart,
      insertedColumnCount: operation.insertedColumnCount || 0,
      headerCount: proof.headerCount,
      headerHash: proof.headerHash
    });
  }
}

function staffSchemaMigrationOperationProof(operation) {
  var proof = staffSchemaMigrationHeaderProof(operation.headers);
  return {
    type: operation.type,
    sheetName: operation.sheetName,
    startColumn: operation.startColumn || 1,
    endColumn: operation.endColumn || proof.headerCount,
    preExistingMaxColumns: operation.preExistingMaxColumns,
    insertedColumnStart: operation.insertedColumnStart || 0,
    insertedColumnCount: operation.insertedColumnCount || 0,
    headerCount: proof.headerCount,
    headerHash: proof.headerHash
  };
}

function staffSchemaMigrationExecute(phase, data) {
  if (!data || typeof data !== "object") {
    throw staffSchemaMigrationError(
      "MIGRATION_CONFIRMATION_REQUIRED", "No-argument migration execution is prohibited."
    );
  }
  var definition = staffSchemaMigrationPhaseDefinition(phase);
  var requestId = String(data.requestId || "").trim();
  var confirmationToken = String(data.confirmationToken || "").trim();
  if (!requestId || !confirmationToken) {
    throw staffSchemaMigrationError(
      "MIGRATION_CONFIRMATION_REQUIRED", "requestId and confirmationToken are required."
    );
  }
  var identity = staffSchemaMigrationIdentityAndOwner();
  return staffSchemaMigrationTryLocks(function () {
    var prepared = staffSchemaMigrationReadPreparedToken(definition.phase, confirmationToken);
    var token = prepared.record;
    if (token.phase !== definition.phase || token.requestId !== requestId ||
        token.spreadsheetId !== identity.spreadsheet.getId() ||
        token.actorIdentity !== identity.actorIdentity) {
      throw staffSchemaMigrationError("MIGRATION_TOKEN_MISMATCH", "Confirmation token binding is invalid.");
    }
    var journalKey = staffSchemaMigrationJournalKey(
      definition.phase, requestId, identity.spreadsheet.getId(), identity.actorIdentity
    );
    var journal = staffSchemaMigrationReadJson(PropertiesService.getScriptProperties(), journalKey);
    if (!journal || journal.requestFingerprint !== token.requestFingerprint ||
        journal.exactPlanHash !== token.exactPlanHash) {
      throw staffSchemaMigrationError("MIGRATION_PREPARED_STATE_MISMATCH", "Prepared journal does not match token.");
    }
    if (journal.status === "COMMITTED") {
      prepared.store.deleteProperty(prepared.key);
      return journal.finalResult;
    }
    if (journal.status !== "PREPARED") {
      throw staffSchemaMigrationError("MIGRATION_REQUEST_NOT_EXECUTABLE", "Migration request is not PREPARED.");
    }
    staffSchemaMigrationAssertExecutionOrder(definition, identity);
    var plan = staffSchemaMigrationAssertPreview(definition.preview(), identity);
    var planHash = staffSchemaMigrationPlanHash(plan);
    var fingerprint = staffSchemaMigrationFingerprint(
      definition, requestId, planHash, identity, journal.requestContext
    );
    if (planHash !== token.exactPlanHash || fingerprint !== token.requestFingerprint) {
      throw staffSchemaMigrationError("MIGRATION_PLAN_HASH_MISMATCH", "Schema changed after preparation.");
    }
    prepared.store.deleteProperty(prepared.key);
    journal.status = "APPLYING";
    staffSchemaMigrationWriteJournal(journalKey, journal);
    try {
      staffSchemaMigrationOperations(plan).forEach(function (operation) {
        operation = staffSchemaMigrationEnrichOperation(identity.spreadsheet, operation);
        journal.inFlightOperation = staffSchemaMigrationOperationProof(operation);
        staffSchemaMigrationRecordOperation(journal, operation);
        staffSchemaMigrationWriteJournal(journalKey, journal);
        staffSchemaMigrationApplyOperation(identity.spreadsheet, operation);
        journal.writes += 1;
        journal.inFlightOperation = null;
        staffSchemaMigrationWriteJournal(journalKey, journal);
      });
      var verification = staffSchemaMigrationAssertPreview(definition.preview(), identity);
      if (staffSchemaMigrationPendingOperations(verification) !== 0) {
        throw staffSchemaMigrationError("MIGRATION_FINAL_VERIFICATION_FAILED", "Final schema is incomplete.");
      }
      var result = {
        status: "COMMITTED", migrationId: definition.migrationId,
        phase: definition.phase, requestId: requestId,
        schemaVersion: journal.schemaVersion, exactPlanHash: planHash,
        expectedSpreadsheetId: identity.spreadsheet.getId(), actorIdentity: identity.actorIdentity,
        createdSheetNames: journal.createdSheetNames.slice(),
        appendedColumnRanges: journal.appendedColumnRanges.slice(),
        writes: journal.writes, historicalRowsTouched: 0,
        completedTimestamp: staffSchemaMigrationNow()
      };
      journal.status = "COMMITTED";
      journal.completedTimestamp = result.completedTimestamp;
      journal.finalResult = result;
      staffSchemaMigrationWriteJournal(journalKey, journal);
      return result;
    } catch (caught) {
      journal.inFlightOperation = null;
      journal.errorDetails.push(staffSchemaMigrationErrorDetail(caught));
      var rollbackFailures = staffSchemaMigrationRollback(identity.spreadsheet, journal);
      if (rollbackFailures.length) {
        journal.status = "RECOVERY_REQUIRED";
        journal.errorDetails = journal.errorDetails.concat(rollbackFailures);
      } else {
        journal.status = "ROLLED_BACK";
        journal.completedTimestamp = staffSchemaMigrationNow();
      }
      staffSchemaMigrationWriteJournal(journalKey, journal);
      if (rollbackFailures.length) {
        throw staffSchemaMigrationError(
          "MIGRATION_RECOVERY_REQUIRED", "Migration rollback could not be proven safe.", rollbackFailures
        );
      }
      throw caught;
    }
  });
}

function executeStaffScheduleMigrationStaging(data) {
  return staffSchemaMigrationExecute("PHASE2", data);
}

function executeAttendanceMigrationStaging(data) {
  return staffSchemaMigrationExecute("PHASE3", data);
}

function executePayrollPhase4MigrationStaging(data) {
  return staffSchemaMigrationExecute("PHASE4", data);
}

function executeBranchFoundationMigrationStaging(data) {
  return staffSchemaMigrationExecute("BRANCH_FOUNDATION", data);
}

function staffSchemaMigrationExecutePrepared(phase) {
  var definition = staffSchemaMigrationPhaseDefinition(phase);
  var record = staffSchemaMigrationReadJson(
    PropertiesService.getUserProperties(), staffSchemaMigrationTokenKey(definition.phase)
  );
  if (!record) {
    throw staffSchemaMigrationError(
      "MIGRATION_CONFIRMATION_REQUIRED", "Run the matching prepare function immediately before execution."
    );
  }
  return staffSchemaMigrationExecute(definition.phase, {
    requestId: record.requestId,
    confirmationToken: record.token
  });
}

function executePreparedStaffScheduleMigrationStaging() {
  return staffSchemaMigrationExecutePrepared("PHASE2");
}

function executePreparedAttendanceMigrationStaging() {
  return staffSchemaMigrationExecutePrepared("PHASE3");
}

function executePreparedPayrollPhase4MigrationStaging() {
  return staffSchemaMigrationExecutePrepared("PHASE4");
}

function executePreparedBranchFoundationMigrationStaging() {
  return staffSchemaMigrationExecutePrepared("BRANCH_FOUNDATION");
}

function staffSchemaMigrationDiagnostic(statuses) {
  staffSchemaMigrationIdentityAndOwner();
  var properties = PropertiesService.getScriptProperties().getProperties();
  var results = Object.keys(properties).filter(function (key) {
    return key.indexOf(STAFF_SCHEMA_MIGRATION_JOURNAL_PREFIX) === 0;
  }).map(function (key) {
    try { return JSON.parse(properties[key]); } catch (_error) { return null; }
  }).filter(Boolean).filter(function (journal) {
    return !statuses || statuses.indexOf(journal.status) !== -1;
  }).map(function (journal) {
    var manualRemediation = [];
    if (["APPLYING", "RECOVERY_REQUIRED"].indexOf(journal.status) !== -1) {
      manualRemediation.push(
        "Do not rerun this phase. Preserve a Spreadsheet backup and compare every item below before any manual change."
      );
      (journal.createdSheets || []).forEach(function (item) {
        manualRemediation.push(
          "Created sheet " + item.sheetName + ": delete only if it is completely empty, or if it has no rows " +
          "below row 1, its last used column equals " + item.headerCount +
          ", and row 1 hash equals " + item.headerHash + "."
        );
      });
      (journal.appendedColumnRanges || []).forEach(function (item) {
        manualRemediation.push(
          "Appended columns " + item.sheetName + "!" + item.startColumn + ":" + item.endColumn +
          ": if they are still trailing, their header hash equals " + item.headerHash +
          ", and every cell below row 1 has neither a value nor a formula, clear only the row 1 headers" +
          (item.insertedColumnCount
            ? " and delete only request-created physical columns " + item.insertedColumnStart + ":" + item.endColumn
            : "; do not delete any physical column") + "."
        );
      });
      (journal.initializedBlankSheets || []).forEach(function (item) {
        manualRemediation.push(
          "Initialized sheet " + item.sheetName + ": clear only row 1 columns 1:" + item.headerCount +
          " if the header hash equals " + item.headerHash +
          " and no value or formula exists below" +
          (item.insertedColumnCount
            ? "; delete only request-created physical columns " + item.insertedColumnStart + ":" + item.headerCount
            : "; do not delete any physical column") + "."
        );
      });
    }
    return {
      migrationId: journal.migrationId, schemaVersion: journal.schemaVersion,
      phase: journal.phase, requestId: journal.requestId, actorIdentity: journal.actorIdentity,
      expectedSpreadsheetId: journal.expectedSpreadsheetId,
      startedTimestamp: journal.startedTimestamp, completedTimestamp: journal.completedTimestamp,
      status: journal.status, exactPlanHash: journal.exactPlanHash,
      createdSheetNames: journal.createdSheetNames || [],
      appendedColumnRanges: journal.appendedColumnRanges || [],
      initializedBlankSheets: journal.initializedBlankSheets || [],
      inFlightOperation: journal.inFlightOperation || null,
      errorDetails: journal.errorDetails || [], writes: journal.writes || 0,
      manualRemediation: manualRemediation
    };
  });
  console.log(JSON.stringify(results));
  return results;
}

function diagnosticMigrationExecutionStatus() {
  return staffSchemaMigrationDiagnostic(null);
}

function diagnosticMigrationRecoveryStatus() {
  return staffSchemaMigrationDiagnostic(["APPLYING", "ROLLED_BACK", "RECOVERY_REQUIRED"]);
}

/* END staff-schema-migration-staging-executor.js */

/* BEGIN core-staging-auth-bootstrap.js */
/* global SpreadsheetApp, PropertiesService, LockService, Utilities, Session, DriveApp,
  HtmlService, hashPassword, getCutHubEnvironmentConfig, assertStagingEnvironment,
  staffSchemaMigrationHash, staffSchemaMigrationCanonical, staffSchemaMigrationWriteJournal,
  staffSchemaMigrationReadJson, staffSchemaMigrationTryLocks, staffSchemaMigrationNow,
  staffSchemaMigrationErrorDetail, console */

var CORE_STAGING_BOOTSTRAP_SCHEMA_VERSION = "CORE_AUTH_BOOTSTRAP_V1";
var CORE_STAGING_BOOTSTRAP_ID = "CORE_AUTH_STAGING_BOOTSTRAP";
var CORE_STAGING_BOOTSTRAP_JOURNAL_PREFIX = "CORE_AUTH_BOOTSTRAP_JOURNAL_";
var CORE_STAGING_BOOTSTRAP_TOKEN_KEY = "CORE_AUTH_BOOTSTRAP_TOKEN";
var CORE_STAGING_BOOTSTRAP_CREDENTIAL_KEY = "CORE_AUTH_BOOTSTRAP_CREDENTIAL";
var CORE_STAGING_BOOTSTRAP_TOKEN_TTL_MS = 5 * 60 * 1000;
var CORE_STAGING_BOOTSTRAP_CREDENTIAL_TTL_MS = 10 * 60 * 1000;
var CORE_STAGING_BOOTSTRAP_PASSWORD_MIN_LENGTH = 12;
var CORE_STAGING_BOOTSTRAP_USERS_HEADERS = Object.freeze([
  "USERNAME", "PASSWORD", "DISPLAY_NAME", "PERMISSIONS", "CREATED_AT", "PASSWORD_HASH"
]);
var CORE_STAGING_BOOTSTRAP_OPTIONAL_DASHBOARD_SHEETS = Object.freeze([
  Object.freeze({
    sheetName: "DATA",
    absenceBehavior: "Dashboard invoice/stat endpoints return controlled errors; Promise.allSettled keeps the page open."
  }),
  Object.freeze({
    sheetName: "DAILY_CLOSINGS",
    absenceBehavior: "Daily-closing preview errors are caught by the Dashboard and rendered as an empty preview."
  }),
  Object.freeze({
    sheetName: "EXPENSES",
    absenceBehavior: "Dashboard aggregation safely treats the missing sheet as zero expenses."
  }),
  Object.freeze({
    sheetName: "WITHDRAWLS",
    absenceBehavior: "Dashboard aggregation safely treats the missing sheet as zero withdrawals."
  })
]);

function coreStagingBootstrapError(code, message, details) {
  var error = new Error(message || code);
  error.code = code;
  if (details !== undefined) error.details = details;
  return error;
}

function coreStagingBootstrapIdentityAndOwner() {
  var config = getCutHubEnvironmentConfig();
  var environment = String(config.environment || "").trim().toLowerCase();
  if (environment !== "staging") {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_STAGING_ONLY", "Core Authentication bootstrap is restricted to Staging."
    );
  }
  if (!config.spreadsheetId || !config.stagingSpreadsheetId ||
      config.spreadsheetId !== config.stagingSpreadsheetId) {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_STAGING_PIN_MISMATCH", "Expected and Staging Spreadsheet pins must match."
    );
  }
  var strict = assertStagingEnvironment();
  var effectiveEmail = "";
  var activeEmail = "";
  var ownerEmail = "";
  try {
    effectiveEmail = String(Session.getEffectiveUser().getEmail() || "").trim().toLowerCase();
    activeEmail = String(Session.getActiveUser().getEmail() || "").trim().toLowerCase();
    var file = DriveApp.getFileById(strict.spreadsheet.getId());
    var owner = file && file.getOwner ? file.getOwner() : null;
    ownerEmail = String(owner && owner.getEmail ? owner.getEmail() : "").trim().toLowerCase();
  } catch (_error) {
    effectiveEmail = "";
    activeEmail = "";
    ownerEmail = "";
  }
  if (!effectiveEmail || !activeEmail || !ownerEmail ||
      effectiveEmail !== activeEmail || activeEmail !== ownerEmail) {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_OWNER_REQUIRED",
      "Only the verified interactive Staging Spreadsheet owner can control Core Authentication bootstrap."
    );
  }
  if (!strict || !strict.spreadsheet ||
      strict.spreadsheet.getId() !== config.spreadsheetId ||
      strict.spreadsheet.getId() !== config.stagingSpreadsheetId) {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_STAGING_IDENTITY_MISMATCH", "Strict Staging identity validation failed."
    );
  }
  return {
    config: strict.config,
    spreadsheet: strict.spreadsheet,
    actorIdentity: effectiveEmail
  };
}

function coreStagingBootstrapHashText(value) {
  return staffSchemaMigrationHash(String(value == null ? "" : value));
}

function coreStagingBootstrapCredentialFingerprint(passwordHash) {
  return coreStagingBootstrapHashText("CORE_AUTH_CREDENTIAL:" + String(passwordHash || ""));
}

function coreStagingBootstrapValidPasswordHash(value) {
  return /^[a-f0-9]{64}$/.test(String(value || ""));
}

function coreStagingBootstrapHeaders(sheet) {
  var lastColumn = Math.max(0, Number(sheet.getLastColumn()) || 0);
  if (!lastColumn) return [];
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function (value) {
    return String(value == null ? "" : value);
  });
}

function coreStagingBootstrapHeadersExact(headers) {
  if (!Array.isArray(headers) || headers.length < CORE_STAGING_BOOTSTRAP_USERS_HEADERS.length) {
    return false;
  }
  return CORE_STAGING_BOOTSTRAP_USERS_HEADERS.every(function (header, index) {
    return headers[index] === header;
  });
}

function coreStagingBootstrapRowFingerprint(row) {
  return staffSchemaMigrationHash((row || []).slice(0, 6));
}

function coreStagingBootstrapReadUsersState(spreadsheet) {
  var sheet = spreadsheet.getSheetByName("USERS");
  if (!sheet) {
    return {
      exists: false,
      headersExact: false,
      headers: [],
      unknownTrailingColumns: [],
      rows: [],
      ownerRows: [],
      errors: []
    };
  }
  var headers = coreStagingBootstrapHeaders(sheet);
  var errors = [];
  if (typeof sheet.getRange(1, 1, 1, Math.max(1, headers.length)).getFormulas === "function") {
    var headerFormulas = sheet.getRange(1, 1, 1, Math.max(1, headers.length)).getFormulas()[0];
    if (headerFormulas.some(function (formula) { return String(formula || "") !== ""; })) {
      errors.push({ code: "CORE_USERS_HEADER_FORMULA_UNSAFE" });
    }
  }
  if (!coreStagingBootstrapHeadersExact(headers)) {
    errors.push({
      code: "CORE_USERS_HEADERS_INCOMPATIBLE",
      message: "USERS columns 1-6 must match the approved exact positional header order."
    });
  }
  var lastRow = Math.max(0, Number(sheet.getLastRow()) || 0);
  var rows = lastRow < 2 ? [] : sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  var formulas = lastRow < 2 || typeof sheet.getRange(2, 1, lastRow - 1, 6).getFormulas !== "function"
    ? [] : sheet.getRange(2, 1, lastRow - 1, 6).getFormulas();
  var usernames = {};
  rows.forEach(function (row, index) {
    var username = String(row[0] || "").trim();
    var normalized = username.toLowerCase();
    var password = String(row[1] || "");
    var displayName = String(row[2] || "").trim();
    var createdAt = row[4];
    var passwordHash = String(row[5] || "").trim();
    if (formulas[index] && formulas[index].some(function (formula) {
      return String(formula || "") !== "";
    })) {
      errors.push({ code: "CORE_USERS_FORMULA_UNSAFE", rowNumber: index + 2 });
    }
    if (!username) {
      errors.push({ code: "CORE_USERS_USERNAME_MISSING", rowNumber: index + 2 });
      return;
    }
    if (usernames[normalized]) {
      errors.push({ code: "CORE_USERS_USERNAME_DUPLICATE", rowNumber: index + 2 });
    }
    usernames[normalized] = true;
    if (password) errors.push({ code: "CORE_USERS_PLAINTEXT_PRESENT", rowNumber: index + 2 });
    if (!displayName) errors.push({ code: "CORE_USERS_DISPLAY_NAME_MISSING", rowNumber: index + 2 });
    if (!createdAt || !Number.isFinite(Date.parse(String(createdAt)))) {
      errors.push({ code: "CORE_USERS_CREATED_AT_INVALID", rowNumber: index + 2 });
    }
    if (!coreStagingBootstrapValidPasswordHash(passwordHash)) {
      errors.push({ code: "CORE_USERS_PASSWORD_HASH_INVALID", rowNumber: index + 2 });
    }
  });
  var ownerRows = rows.map(function (row, index) {
    return { row: row, rowNumber: index + 2 };
  }).filter(function (item) {
    return String(item.row[0] || "").trim().toLowerCase() === "owner";
  });
  if (ownerRows.length > 1) {
    errors.push({ code: "CORE_USERS_OWNER_DUPLICATE", count: ownerRows.length });
  }
  if (ownerRows.length === 1 && String(ownerRows[0].row[0] || "").trim() !== "owner") {
    errors.push({ code: "CORE_USERS_OWNER_USERNAME_NOT_CANONICAL", rowNumber: ownerRows[0].rowNumber });
  }
  return {
    exists: true,
    headersExact: coreStagingBootstrapHeadersExact(headers),
    headers: headers.slice(0, 6),
    unknownTrailingColumns: headers.slice(6),
    rows: rows,
    ownerRows: ownerRows,
    errors: errors
  };
}

function coreStagingBootstrapPlanHash(plan) {
  return staffSchemaMigrationHash({
    schemaVersion: plan.schemaVersion,
    dryRun: plan.dryRun,
    writes: plan.writes,
    identity: plan.identity,
    approvedUsersHeaders: plan.approvedUsersHeaders,
    mandatoryCoreSheets: plan.mandatoryCoreSheets,
    createSheets: plan.createSheets,
    createOwnerRecord: plan.createOwnerRecord,
    ownerUsername: plan.ownerUsername,
    ownerDisplayName: plan.ownerDisplayName,
    credentialFingerprint: plan.credentialFingerprint,
    preservedUnknownColumns: plan.preservedUnknownColumns,
    errors: plan.errors,
    blockers: plan.blockers,
    safeToInitialize: plan.safeToInitialize,
    completed: plan.completed
  });
}

function coreStagingBootstrapOptionalDashboardState(spreadsheet) {
  return CORE_STAGING_BOOTSTRAP_OPTIONAL_DASHBOARD_SHEETS.map(function (item) {
    return {
      sheetName: item.sheetName,
      exists: !!spreadsheet.getSheetByName(item.sheetName),
      mandatoryForPageOpen: false,
      absenceBehavior: item.absenceBehavior
    };
  });
}

function previewCoreStagingBootstrap(data) {
  data = data && typeof data === "object" ? data : {};
  var identity = coreStagingBootstrapIdentityAndOwner();
  if (!data.ownerDisplayName && !data.credentialFingerprint) {
    var stagedCredential = coreStagingBootstrapCredentialRecord();
    if (stagedCredential) {
      try {
        stagedCredential = coreStagingBootstrapValidateCredential(stagedCredential, identity);
        data = {
          ownerDisplayName: stagedCredential.ownerDisplayName,
          credentialFingerprint: stagedCredential.credentialFingerprint
        };
      } catch (_credentialError) {
        // Invalid or expired staged credentials remain a compact preview blocker and are never consumed here.
      }
    }
  }
  var users = coreStagingBootstrapReadUsersState(identity.spreadsheet);
  var ownerDisplayName = String(data.ownerDisplayName || "").trim();
  var credentialFingerprint = String(data.credentialFingerprint || "").trim();
  var errors = users.errors.slice();
  var blockers = [];
  var createSheets = [];
  var createOwnerRecord = false;
  var ownerRows = users.ownerRows;
  var missingMandatoryCoreSheets = users.exists ? [] : ["USERS"];
  var missingRequiredUsersColumns = users.exists && users.headersExact ? [] :
    CORE_STAGING_BOOTSTRAP_USERS_HEADERS.map(function (header, index) {
      return { column: index + 1, header: header };
    });
  var incompatibleCoreSheets = users.exists && !users.headersExact ? ["USERS"] : [];

  if (!users.exists) {
    createSheets.push({ sheetName: "USERS", headers: CORE_STAGING_BOOTSTRAP_USERS_HEADERS.slice() });
    createOwnerRecord = true;
  } else if (users.headersExact && ownerRows.length === 0) {
    if (users.rows.length) {
      errors.push({
        code: "CORE_USERS_EXISTING_DATA_WITHOUT_OWNER",
        message: "Existing USERS data without an owner cannot be proven safe for automatic bootstrap."
      });
    } else {
      createOwnerRecord = true;
    }
  }

  if (createOwnerRecord) {
    if (!ownerDisplayName) blockers.push({ code: "CORE_OWNER_DISPLAY_NAME_REQUIRED" });
    if (!/^sha256:[a-f0-9]{64}$/.test(credentialFingerprint)) {
      blockers.push({ code: "CORE_OWNER_CREDENTIAL_REQUIRED" });
    }
  }

  var ownerRecordState = "MISSING";
  if (ownerRows.length === 1) {
    var owner = ownerRows[0].row;
    var hasPlaintext = String(owner[1] || "") !== "";
    var validHash = coreStagingBootstrapValidPasswordHash(String(owner[5] || "").trim());
    ownerRecordState = validHash && !hasPlaintext ? "HASHED_ONLY" :
      (validHash ? "HASHED_WITH_PLAINTEXT_RETAINED" : (hasPlaintext ? "PLAINTEXT_LEGACY" : "MISSING"));
  } else if (ownerRows.length > 1) {
    ownerRecordState = "DUPLICATE";
  }

  var completed = users.exists && users.headersExact && errors.length === 0 &&
    ownerRows.length === 1 && ownerRecordState === "HASHED_ONLY";
  var plan = {
    schemaVersion: CORE_STAGING_BOOTSTRAP_SCHEMA_VERSION,
    dryRun: true,
    writes: 0,
    identity: {
      environment: identity.config.environment,
      expectedSpreadsheetId: identity.config.spreadsheetId,
      stagingSpreadsheetId: identity.config.stagingSpreadsheetId,
      actualSpreadsheetId: identity.spreadsheet.getId(),
      actorIdentity: identity.actorIdentity
    },
    approvedUsersHeaders: CORE_STAGING_BOOTSTRAP_USERS_HEADERS.slice(),
    mandatoryCoreSheets: ["USERS"],
    optionalDashboardDependencies: coreStagingBootstrapOptionalDashboardState(identity.spreadsheet),
    createSheets: createSheets,
    createOwnerRecord: createOwnerRecord,
    ownerUsername: "owner",
    ownerDisplayName: createOwnerRecord ? ownerDisplayName :
      (ownerRows.length === 1 ? String(ownerRows[0].row[2] || "").trim() : ""),
    credentialFingerprint: createOwnerRecord ? credentialFingerprint :
      (ownerRows.length === 1 && coreStagingBootstrapValidPasswordHash(ownerRows[0].row[5])
        ? coreStagingBootstrapCredentialFingerprint(String(ownerRows[0].row[5]).trim()) : ""),
    missingMandatoryCoreSheets: missingMandatoryCoreSheets,
    missingRequiredUsersColumns: missingRequiredUsersColumns,
    incompatibleCoreSheets: incompatibleCoreSheets,
    preservedUnknownColumns: users.headersExact ? users.unknownTrailingColumns.slice() : [],
    ownerRecordCount: ownerRows.length,
    ownerPasswordState: ownerRecordState,
    plaintextPasswordCellEmpty: ownerRows.length === 1 ? String(ownerRows[0].row[1] || "") === "" : null,
    errors: errors,
    blockers: blockers,
    safeToInitialize: errors.length === 0 && blockers.length === 0,
    completed: completed
  };
  plan.exactPlanHash = coreStagingBootstrapPlanHash(plan);
  return plan;
}

function previewStagingAuthenticationInitialization() {
  var plan = previewCoreStagingBootstrap({});
  return {
    schemaVersion: plan.schemaVersion,
    dryRun: plan.dryRun,
    writes: plan.writes,
    identity: plan.identity,
    canonicalAuthenticationSheet: "USERS",
    approvedUsersHeaders: plan.approvedUsersHeaders,
    missingCoreSheets: plan.missingMandatoryCoreSheets,
    missingColumns: plan.missingRequiredUsersColumns,
    existingCompatibleSheets: plan.incompatibleCoreSheets.length || plan.missingMandatoryCoreSheets.length
      ? [] : ["USERS"],
    incompatibleSheets: plan.incompatibleCoreSheets,
    optionalDashboardDependencies: plan.optionalDashboardDependencies,
    ownerRecordCount: plan.ownerRecordCount,
    passwordStorage: {
      hashAlgorithm: "SHA-256",
      salted: false,
      plaintextFallbackAcceptedByLogin: true,
      ownerPasswordState: plan.ownerPasswordState,
      plaintextPasswordCellEmpty: plan.plaintextPasswordCellEmpty
    },
    safeToInitialize: plan.safeToInitialize,
    completed: plan.completed,
    blockers: plan.blockers,
    errors: plan.errors
  };
}

function diagnosticPreviewStagingAuthenticationInitialization() {
  coreStagingBootstrapIdentityAndOwner();
  var result = previewStagingAuthenticationInitialization();
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function diagnosticPreviewCoreStagingBootstrap() {
  coreStagingBootstrapIdentityAndOwner();
  var result = previewCoreStagingBootstrap();
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function coreStagingBootstrapCredentialRecord() {
  return staffSchemaMigrationReadJson(
    PropertiesService.getUserProperties(), CORE_STAGING_BOOTSTRAP_CREDENTIAL_KEY
  );
}

function coreStagingBootstrapValidateCredential(record, identity) {
  if (!record || !coreStagingBootstrapValidPasswordHash(record.passwordHash)) {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_CREDENTIAL_REQUIRED", "Use the secure credential dialog before preparation."
    );
  }
  if (Date.parse(record.expiresAt || "") <= Date.now()) {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_CREDENTIAL_EXPIRED", "The staged owner credential has expired."
    );
  }
  if (record.spreadsheetId !== identity.spreadsheet.getId() ||
      record.actorIdentity !== identity.actorIdentity ||
      record.ownerUsername !== "owner" || !String(record.ownerDisplayName || "").trim() ||
      !String(record.requestId || "").trim()) {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_CREDENTIAL_MISMATCH", "The staged owner credential binding is invalid."
    );
  }
  if (record.credentialFingerprint !== coreStagingBootstrapCredentialFingerprint(record.passwordHash)) {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_CREDENTIAL_MISMATCH", "The staged owner credential fingerprint is invalid."
    );
  }
  return record;
}

function stageCoreStagingBootstrapCredential(data) {
  if (!data || typeof data !== "object") {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_CREDENTIAL_INPUT_REQUIRED", "Secure credential input is required."
    );
  }
  var identity = coreStagingBootstrapIdentityAndOwner();
  var password = data.password == null ? "" : String(data.password);
  var confirmation = data.passwordConfirmation == null ? "" : String(data.passwordConfirmation);
  var displayName = String(data.ownerDisplayName || "").trim();
  var requestId = String(data.requestId || Utilities.getUuid() || "").trim();
  if (password !== confirmation) {
    throw coreStagingBootstrapError(
      "PASSWORD_CONFIRMATION_MISMATCH", "Password confirmation does not match."
    );
  }
  if (Array.from(password).length < CORE_STAGING_BOOTSTRAP_PASSWORD_MIN_LENGTH) {
    throw coreStagingBootstrapError(
      "PASSWORD_TOO_SHORT",
      "Password must be at least " + CORE_STAGING_BOOTSTRAP_PASSWORD_MIN_LENGTH + " characters."
    );
  }
  if (!displayName || displayName.length > 160 || !requestId || requestId.length > 160) {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_CREDENTIAL_CONTEXT_INVALID", "Owner display name and requestId are required."
    );
  }
  var passwordHash = hashPassword(password);
  data.password = "";
  data.passwordConfirmation = "";
  password = "";
  confirmation = "";
  return staffSchemaMigrationTryLocks(function () {
    var now = Date.now();
    var record = {
      requestId: requestId,
      ownerUsername: "owner",
      ownerDisplayName: displayName,
      passwordHash: passwordHash,
      credentialFingerprint: coreStagingBootstrapCredentialFingerprint(passwordHash),
      spreadsheetId: identity.spreadsheet.getId(),
      actorIdentity: identity.actorIdentity,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + CORE_STAGING_BOOTSTRAP_CREDENTIAL_TTL_MS).toISOString()
    };
    var userProperties = PropertiesService.getUserProperties();
    userProperties.setProperty(CORE_STAGING_BOOTSTRAP_CREDENTIAL_KEY, JSON.stringify(record));
    userProperties.deleteProperty(CORE_STAGING_BOOTSTRAP_TOKEN_KEY);
    passwordHash = "";
    return {
      status: "CREDENTIAL_STAGED",
      requestId: requestId,
      ownerUsername: "owner",
      ownerDisplayName: displayName,
      expiresAt: record.expiresAt
    };
  });
}

function openCoreStagingBootstrapCredentialDialog() {
  coreStagingBootstrapIdentityAndOwner();
  var html = '<!doctype html><html><head><base target="_top"><style>' +
    'body{font:14px Arial,sans-serif;padding:18px;direction:rtl}label{display:block;margin:10px 0 4px}' +
    'input{box-sizing:border-box;width:100%;padding:8px}button{margin-top:16px;padding:9px 16px}' +
    '.hint{display:block;margin-top:4px;color:#555}#status{margin-top:12px;white-space:pre-wrap}</style></head><body>' +
    '<h3>تهيئة مالك Staging</h3><label>اسم العرض</label><input id="display" autocomplete="name">' +
    '<label>Request ID</label><input id="request" autocomplete="off">' +
    '<label for="password">كلمة المرور</label><input id="password" name="password" type="password" ' +
    'autocomplete="new-password" minlength="12" aria-describedby="password-requirements">' +
    '<span id="password-requirements" class="hint">الحد الأدنى: 12 حرفًا. تُحفظ المسافات كما أُدخلت.</span>' +
    '<label for="passwordConfirmation">تأكيد كلمة المرور</label>' +
    '<input id="passwordConfirmation" name="passwordConfirmation" type="password" ' +
    'autocomplete="new-password" minlength="12">' +
    '<button id="submit" type="button">تجهيز الاعتماد المؤقت</button><div id="status"></div><script>' +
    'document.getElementById("submit").onclick=function(){var b=this;b.disabled=true;' +
    'var p=document.getElementById("password"),c=document.getElementById("passwordConfirmation"),' +
    's=document.getElementById("status");' +
    'if(p.value!==c.value){s.textContent="PASSWORD_CONFIRMATION_MISMATCH: تأكيد كلمة المرور غير مطابق.";' +
    'b.disabled=false;return;}if(Array.from(p.value).length<12){' +
    's.textContent="PASSWORD_TOO_SHORT: يجب ألا تقل كلمة المرور عن 12 حرفًا.";b.disabled=false;return;}' +
    'var payload={ownerDisplayName:document.getElementById("display").value,' +
    'requestId:document.getElementById("request").value,password:p.value,passwordConfirmation:c.value};' +
    'google.script.run.withSuccessHandler(function(r){p.value="";c.value="";' +
    's.textContent="تم تجهيز الاعتماد. Request ID: "+r.requestId;' +
    'b.disabled=false;}).withFailureHandler(function(e){p.value="";c.value="";' +
    's.textContent=e.message||"فشل التجهيز";b.disabled=false;})' +
    '.stageCoreStagingBootstrapCredential(payload);};' +
    '</script></body></html>';
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(460).setHeight(520),
    "Core Authentication Bootstrap"
  );
  return { status: "CREDENTIAL_DIALOG_OPENED" };
}

function coreStagingBootstrapJournalKey(requestId, spreadsheetId, actorIdentity) {
  return CORE_STAGING_BOOTSTRAP_JOURNAL_PREFIX +
    coreStagingBootstrapHashText(spreadsheetId).slice(7) + "_" +
    coreStagingBootstrapHashText(actorIdentity).slice(7) + "_" +
    coreStagingBootstrapHashText(requestId).slice(7);
}

function coreStagingBootstrapRequestFingerprint(requestId, planHash, identity, credential) {
  return staffSchemaMigrationHash({
    bootstrapId: CORE_STAGING_BOOTSTRAP_ID,
    requestId: requestId,
    planHash: planHash,
    spreadsheetId: identity.spreadsheet.getId(),
    actorIdentity: identity.actorIdentity,
    ownerUsername: credential.ownerUsername,
    ownerDisplayName: credential.ownerDisplayName,
    credentialFingerprint: credential.credentialFingerprint
  });
}

function coreStagingBootstrapAssertPlan(plan) {
  if (!plan || plan.dryRun !== true || Number(plan.writes) !== 0 ||
      plan.safeToInitialize !== true || (plan.errors || []).length || (plan.blockers || []).length) {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_PREVIEW_NOT_SAFE", "Core Authentication preview is not safe to execute."
    );
  }
  return plan;
}

function coreStagingBootstrapPrepareSummary(plan, record, alreadyCommitted) {
  return {
    status: "PREPARED",
    requestId: record.requestId,
    ownerUsername: record.ownerUsername,
    ownerDisplayName: record.ownerDisplayName,
    expiresAt: record.expiresAt,
    exactPlanHash: record.exactPlanHash,
    spreadsheetId: record.spreadsheetId,
    createSheetNames: (plan.createSheets || []).map(function (item) { return item.sheetName; }),
    createOwnerRecord: plan.createOwnerRecord === true,
    alreadyCommitted: alreadyCommitted === true
  };
}

function prepareCoreStagingBootstrap(data) {
  data = data && typeof data === "object" ? data : {};
  var identity = coreStagingBootstrapIdentityAndOwner();
  return staffSchemaMigrationTryLocks(function () {
    var credential = coreStagingBootstrapValidateCredential(
      coreStagingBootstrapCredentialRecord(), identity
    );
    if (data.requestId && String(data.requestId).trim() !== credential.requestId) {
      throw coreStagingBootstrapError(
        "CORE_BOOTSTRAP_REQUEST_ID_MISMATCH", "requestId does not match the staged credential."
      );
    }
    var plan = coreStagingBootstrapAssertPlan(previewCoreStagingBootstrap({
      ownerDisplayName: credential.ownerDisplayName,
      credentialFingerprint: credential.credentialFingerprint
    }));
    var journalKey = coreStagingBootstrapJournalKey(
      credential.requestId, identity.spreadsheet.getId(), identity.actorIdentity
    );
    var scriptProperties = PropertiesService.getScriptProperties();
    var existing = staffSchemaMigrationReadJson(scriptProperties, journalKey);
    if (existing && existing.credentialFingerprint !== credential.credentialFingerprint) {
      throw coreStagingBootstrapError(
        "CORE_BOOTSTRAP_REQUEST_ID_REUSED", "requestId is already bound to different bootstrap context."
      );
    }
    if (!existing && plan.completed && plan.credentialFingerprint !== credential.credentialFingerprint) {
      throw coreStagingBootstrapError(
        "CORE_BOOTSTRAP_EXISTING_OWNER_CREDENTIAL_MISMATCH",
        "The staged credential does not match the existing hash-only owner record."
      );
    }
    if (existing && ["APPLYING", "RECOVERY_REQUIRED"].indexOf(existing.status) !== -1) {
      throw coreStagingBootstrapError(
        "CORE_BOOTSTRAP_REQUEST_NOT_PREPARABLE", "The request requires recovery before reuse."
      );
    }
    var planHash = existing && existing.status === "COMMITTED" ? existing.exactPlanHash : plan.exactPlanHash;
    var fingerprint = coreStagingBootstrapRequestFingerprint(
      credential.requestId, planHash, identity, credential
    );
    if (existing && existing.requestFingerprint !== fingerprint) {
      throw coreStagingBootstrapError(
        "CORE_BOOTSTRAP_REQUEST_ID_REUSED", "requestId is already bound to different bootstrap context."
      );
    }
    var token = Utilities.getUuid() + "-" + Utilities.getUuid();
    var expiresAt = new Date(Date.now() + CORE_STAGING_BOOTSTRAP_TOKEN_TTL_MS).toISOString();
    var tokenRecord = {
      token: token,
      tokenHash: coreStagingBootstrapHashText(token),
      bootstrapId: CORE_STAGING_BOOTSTRAP_ID,
      requestId: credential.requestId,
      requestFingerprint: fingerprint,
      exactPlanHash: planHash,
      spreadsheetId: identity.spreadsheet.getId(),
      actorIdentity: identity.actorIdentity,
      ownerUsername: credential.ownerUsername,
      ownerDisplayName: credential.ownerDisplayName,
      credentialFingerprint: credential.credentialFingerprint,
      expiresAt: expiresAt
    };
    var journal = existing && existing.status === "COMMITTED" ? existing : {
      bootstrapId: CORE_STAGING_BOOTSTRAP_ID,
      schemaVersion: CORE_STAGING_BOOTSTRAP_SCHEMA_VERSION,
      requestId: credential.requestId,
      actorIdentity: identity.actorIdentity,
      expectedSpreadsheetId: identity.spreadsheet.getId(),
      ownerUsername: credential.ownerUsername,
      ownerDisplayName: credential.ownerDisplayName,
      credentialFingerprint: credential.credentialFingerprint,
      startedTimestamp: staffSchemaMigrationNow(),
      completedTimestamp: "",
      status: "PREPARED",
      exactPlanHash: plan.exactPlanHash,
      requestFingerprint: fingerprint,
      operationIntents: [],
      completedOperations: [],
      createdSheetNames: [],
      ownerRowsCreated: [],
      inFlightOperation: null,
      errorDetails: [],
      writes: 0,
      finalResult: null
    };
    if (journal.status !== "COMMITTED") staffSchemaMigrationWriteJournal(journalKey, journal);
    PropertiesService.getUserProperties().setProperty(
      CORE_STAGING_BOOTSTRAP_TOKEN_KEY, JSON.stringify(tokenRecord)
    );
    token = "";
    var summary = coreStagingBootstrapPrepareSummary(
      plan, tokenRecord, journal.status === "COMMITTED"
    );
    console.log(JSON.stringify({
      status: summary.status,
      requestId: summary.requestId,
      ownerUsername: summary.ownerUsername,
      ownerDisplayName: summary.ownerDisplayName,
      expiresAt: summary.expiresAt,
      exactPlanHash: summary.exactPlanHash,
      spreadsheetId: summary.spreadsheetId,
      createSheetNames: summary.createSheetNames,
      createOwnerRecord: summary.createOwnerRecord,
      alreadyCommitted: summary.alreadyCommitted
    }));
    return summary;
  });
}

function coreStagingBootstrapReadPreparedToken(suppliedToken) {
  var store = PropertiesService.getUserProperties();
  var record = staffSchemaMigrationReadJson(store, CORE_STAGING_BOOTSTRAP_TOKEN_KEY);
  if (!record || !suppliedToken || record.tokenHash !== coreStagingBootstrapHashText(suppliedToken)) {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_TOKEN_INVALID", "Confirmation token is invalid or already consumed."
    );
  }
  if (Date.parse(record.expiresAt || "") <= Date.now()) {
    throw coreStagingBootstrapError("CORE_BOOTSTRAP_TOKEN_EXPIRED", "Confirmation token has expired.");
  }
  return { store: store, record: record };
}

function coreStagingBootstrapOperationProof(operation) {
  return {
    type: operation.type,
    sheetName: "USERS",
    headerHash: staffSchemaMigrationHash(CORE_STAGING_BOOTSTRAP_USERS_HEADERS),
    headerCount: CORE_STAGING_BOOTSTRAP_USERS_HEADERS.length,
    rowNumber: operation.rowNumber || 0,
    rowFingerprint: operation.rowFingerprint || ""
  };
}

function coreStagingBootstrapOperations(plan, credential) {
  var operations = [];
  if ((plan.createSheets || []).some(function (item) { return item.sheetName === "USERS"; })) {
    operations.push({ type: "CREATE_USERS_SHEET" });
  }
  if (plan.createOwnerRecord) {
    var row = [
      "owner", "", credential.ownerDisplayName, "", staffSchemaMigrationNow(), credential.passwordHash
    ];
    operations.push({
      type: "CREATE_OWNER_ROW",
      rowNumber: 2,
      row: row,
      rowFingerprint: coreStagingBootstrapRowFingerprint(row)
    });
  }
  return operations;
}

function coreStagingBootstrapTestPoint(name, details) {
  if (typeof coreStagingBootstrapFailureInjector === "function") {
    coreStagingBootstrapFailureInjector(name, details || {});
  }
}

function coreStagingBootstrapApplyOperation(spreadsheet, operation) {
  if (operation.type === "CREATE_USERS_SHEET") {
    if (spreadsheet.getSheetByName("USERS")) {
      throw coreStagingBootstrapError("CORE_BOOTSTRAP_STATE_CHANGED", "USERS now exists.");
    }
    var created = spreadsheet.insertSheet("USERS");
    var maximum = Math.max(1, Number(created.getMaxColumns ? created.getMaxColumns() : 1) || 1);
    if (maximum < CORE_STAGING_BOOTSTRAP_USERS_HEADERS.length) {
      created.insertColumnsAfter(maximum, CORE_STAGING_BOOTSTRAP_USERS_HEADERS.length - maximum);
    }
    created.getRange(1, 1, 1, CORE_STAGING_BOOTSTRAP_USERS_HEADERS.length)
      .setValues([CORE_STAGING_BOOTSTRAP_USERS_HEADERS.slice()]);
    coreStagingBootstrapTestPoint("AFTER_USERS_SHEET_WRITE_BEFORE_PROGRESS", operation);
    return;
  }
  if (operation.type === "CREATE_OWNER_ROW") {
    var sheet = spreadsheet.getSheetByName("USERS");
    if (!sheet || !coreStagingBootstrapHeadersExact(coreStagingBootstrapHeaders(sheet)) ||
        sheet.getLastRow() >= 2) {
      throw coreStagingBootstrapError(
        "CORE_BOOTSTRAP_STATE_CHANGED", "USERS is no longer a compatible header-only sheet."
      );
    }
    sheet.getRange(operation.rowNumber, 1, 1, 6).setValues([operation.row]);
    coreStagingBootstrapTestPoint("AFTER_OWNER_ROW_WRITE_BEFORE_PROGRESS", operation);
  }
}

function coreStagingBootstrapSheetHeaderProof(sheet) {
  return staffSchemaMigrationHash(coreStagingBootstrapHeaders(sheet).slice(0, 6));
}

function coreStagingBootstrapRollback(spreadsheet, journal) {
  var failures = [];
  var intendedOwner = (journal.operationIntents || []).filter(function (item) {
    return item.type === "CREATE_OWNER_ROW";
  }).slice(-1)[0];
  var intendedSheet = (journal.operationIntents || []).some(function (item) {
    return item.type === "CREATE_USERS_SHEET";
  });
  try {
    var sheet = spreadsheet.getSheetByName("USERS");
    if (!sheet) return failures;
    var headerProof = staffSchemaMigrationHash(CORE_STAGING_BOOTSTRAP_USERS_HEADERS);
    var lastRow = Math.max(0, Number(sheet.getLastRow()) || 0);
    if (intendedSheet) {
      if (lastRow === 0) {
        spreadsheet.deleteSheet(sheet);
        return failures;
      }
      var usedHeaders = coreStagingBootstrapHeaders(sheet);
      var headerFormulas = typeof sheet.getRange(1, 1, 1, Math.max(1, usedHeaders.length)).getFormulas === "function"
        ? sheet.getRange(1, 1, 1, Math.max(1, usedHeaders.length)).getFormulas()[0] : [];
      var requestOnlyHeaders = usedHeaders.length <= CORE_STAGING_BOOTSTRAP_USERS_HEADERS.length &&
        usedHeaders.every(function (value, index) {
          return value === "" || value === CORE_STAGING_BOOTSTRAP_USERS_HEADERS[index];
        }) && !headerFormulas.some(function (formula) { return String(formula || "") !== ""; });
      if (!requestOnlyHeaders) {
        throw new Error("Request-created USERS headers or formulas changed; automatic rollback is unsafe.");
      }
      if (lastRow > 2) throw new Error("Request-created USERS has unexpected rows.");
      if (lastRow === 2) {
        if (!intendedOwner) throw new Error("Owner row has no matching operation intent.");
        var createdRow = sheet.getRange(2, 1, 1, 6).getValues()[0];
        var createdFormulas = typeof sheet.getRange(2, 1, 1, 6).getFormulas === "function"
          ? sheet.getRange(2, 1, 1, 6).getFormulas()[0] : [];
        if (coreStagingBootstrapRowFingerprint(createdRow) !== intendedOwner.rowFingerprint) {
          throw new Error("Request-created owner row proof changed.");
        }
        if (createdFormulas.some(function (formula) { return String(formula || "") !== ""; })) {
          throw new Error("Request-created owner row contains a formula.");
        }
      }
      spreadsheet.deleteSheet(sheet);
      return failures;
    }
    if (coreStagingBootstrapSheetHeaderProof(sheet) !== headerProof) {
      throw new Error("USERS header proof changed; automatic rollback is unsafe.");
    }
    if (intendedOwner) {
      if (lastRow !== intendedOwner.rowNumber) {
        throw new Error("Owner row is not the exact trailing request-created row.");
      }
      var row = sheet.getRange(intendedOwner.rowNumber, 1, 1, 6).getValues()[0];
      var rowFormulas = typeof sheet.getRange(intendedOwner.rowNumber, 1, 1, 6).getFormulas === "function"
        ? sheet.getRange(intendedOwner.rowNumber, 1, 1, 6).getFormulas()[0] : [];
      if (coreStagingBootstrapRowFingerprint(row) !== intendedOwner.rowFingerprint) {
        throw new Error("Request-created owner row proof changed.");
      }
      if (rowFormulas.some(function (formula) { return String(formula || "") !== ""; })) {
        throw new Error("Request-created owner row contains a formula.");
      }
      sheet.deleteRow(intendedOwner.rowNumber);
    }
  } catch (error) {
    failures.push({
      operation: "CORE_AUTH_ROLLBACK",
      sheetName: "USERS",
      message: String(error.message || error).slice(0, 500)
    });
  }
  return failures;
}

function coreStagingBootstrapVerifyCompleted(identity, journal) {
  var verification = previewCoreStagingBootstrap({});
  if (verification.safeToInitialize !== true || verification.completed !== true ||
      verification.dryRun !== true || Number(verification.writes) !== 0 ||
      verification.missingMandatoryCoreSheets.length ||
      verification.missingRequiredUsersColumns.length ||
      verification.incompatibleCoreSheets.length ||
      verification.ownerRecordCount !== 1 || verification.ownerPasswordState !== "HASHED_ONLY" ||
      verification.plaintextPasswordCellEmpty !== true ||
      verification.errors.length || verification.blockers.length ||
      verification.identity.actualSpreadsheetId !== identity.spreadsheet.getId()) {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_FINAL_VERIFICATION_FAILED", "Final Core Authentication verification failed."
    );
  }
  var users = coreStagingBootstrapReadUsersState(identity.spreadsheet);
  var currentFingerprint = coreStagingBootstrapCredentialFingerprint(
    String(users.ownerRows[0].row[5] || "").trim()
  );
  if (currentFingerprint !== journal.credentialFingerprint) {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_FINAL_CREDENTIAL_MISMATCH", "Final owner credential does not match preparation."
    );
  }
  return verification;
}

function coreStagingBootstrapConsumeSecrets(prepared, credentialStore) {
  prepared.store.deleteProperty(CORE_STAGING_BOOTSTRAP_TOKEN_KEY);
  credentialStore.deleteProperty(CORE_STAGING_BOOTSTRAP_CREDENTIAL_KEY);
}

function executeCoreStagingBootstrap(data) {
  if (!data || typeof data !== "object") {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_CONFIRMATION_REQUIRED", "No-argument Core Authentication execution is prohibited."
    );
  }
  var requestId = String(data.requestId || "").trim();
  var confirmationToken = String(data.confirmationToken || "").trim();
  if (!requestId || !confirmationToken) {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_CONFIRMATION_REQUIRED", "requestId and confirmationToken are required."
    );
  }
  var identity = coreStagingBootstrapIdentityAndOwner();
  return staffSchemaMigrationTryLocks(function () {
    var prepared = coreStagingBootstrapReadPreparedToken(confirmationToken);
    var token = prepared.record;
    var credentialStore = PropertiesService.getUserProperties();
    var credential = coreStagingBootstrapValidateCredential(
      coreStagingBootstrapCredentialRecord(), identity
    );
    if (token.bootstrapId !== CORE_STAGING_BOOTSTRAP_ID ||
        token.requestId !== requestId || credential.requestId !== requestId ||
        token.spreadsheetId !== identity.spreadsheet.getId() ||
        token.actorIdentity !== identity.actorIdentity ||
        token.ownerUsername !== credential.ownerUsername ||
        token.ownerDisplayName !== credential.ownerDisplayName ||
        token.credentialFingerprint !== credential.credentialFingerprint) {
      throw coreStagingBootstrapError(
        "CORE_BOOTSTRAP_TOKEN_MISMATCH", "Prepared token binding is invalid."
      );
    }
    var journalKey = coreStagingBootstrapJournalKey(
      requestId, identity.spreadsheet.getId(), identity.actorIdentity
    );
    var journal = staffSchemaMigrationReadJson(
      PropertiesService.getScriptProperties(), journalKey
    );
    if (!journal || journal.requestFingerprint !== token.requestFingerprint ||
        journal.exactPlanHash !== token.exactPlanHash ||
        journal.credentialFingerprint !== credential.credentialFingerprint) {
      throw coreStagingBootstrapError(
        "CORE_BOOTSTRAP_PREPARED_STATE_MISMATCH", "Prepared journal does not match token."
      );
    }
    if (journal.status === "COMMITTED") {
      coreStagingBootstrapVerifyCompleted(identity, journal);
      coreStagingBootstrapConsumeSecrets(prepared, credentialStore);
      return journal.finalResult;
    }
    if (journal.status !== "PREPARED") {
      throw coreStagingBootstrapError(
        "CORE_BOOTSTRAP_REQUEST_NOT_EXECUTABLE", "Bootstrap request is not PREPARED."
      );
    }
    var plan = coreStagingBootstrapAssertPlan(previewCoreStagingBootstrap({
      ownerDisplayName: credential.ownerDisplayName,
      credentialFingerprint: credential.credentialFingerprint
    }));
    var fingerprint = coreStagingBootstrapRequestFingerprint(
      requestId, plan.exactPlanHash, identity, credential
    );
    if (plan.exactPlanHash !== token.exactPlanHash || fingerprint !== token.requestFingerprint) {
      throw coreStagingBootstrapError(
        "CORE_BOOTSTRAP_PLAN_HASH_MISMATCH", "Core schema changed after preparation."
      );
    }
    coreStagingBootstrapConsumeSecrets(prepared, credentialStore);
    journal.status = "APPLYING";
    staffSchemaMigrationWriteJournal(journalKey, journal);
    try {
      var operations = coreStagingBootstrapOperations(plan, credential);
      operations.forEach(function (operation) {
        var proof = coreStagingBootstrapOperationProof(operation);
        journal.inFlightOperation = proof;
        journal.operationIntents.push(proof);
        staffSchemaMigrationWriteJournal(journalKey, journal);
        coreStagingBootstrapApplyOperation(identity.spreadsheet, operation);
        journal.completedOperations.push(proof);
        if (operation.type === "CREATE_USERS_SHEET") journal.createdSheetNames.push("USERS");
        if (operation.type === "CREATE_OWNER_ROW") {
          journal.ownerRowsCreated.push({
            sheetName: "USERS", rowNumber: operation.rowNumber,
            rowFingerprint: operation.rowFingerprint
          });
        }
        journal.writes += 1;
        journal.inFlightOperation = null;
        staffSchemaMigrationWriteJournal(journalKey, journal);
      });
      coreStagingBootstrapTestPoint("AFTER_ALL_WRITES_BEFORE_VERIFICATION", {});
      coreStagingBootstrapVerifyCompleted(identity, journal);
      coreStagingBootstrapTestPoint("AFTER_VERIFICATION_BEFORE_COMMITTED", {});
      var result = {
        status: "COMMITTED",
        bootstrapId: CORE_STAGING_BOOTSTRAP_ID,
        schemaVersion: CORE_STAGING_BOOTSTRAP_SCHEMA_VERSION,
        requestId: requestId,
        expectedSpreadsheetId: identity.spreadsheet.getId(),
        actorIdentity: identity.actorIdentity,
        ownerUsername: "owner",
        ownerDisplayName: journal.ownerDisplayName,
        createdSheetNames: journal.createdSheetNames.slice(),
        ownerRowsCreated: journal.ownerRowsCreated.map(function (item) {
          return { sheetName: item.sheetName, rowNumber: item.rowNumber };
        }),
        writes: journal.writes,
        completedTimestamp: staffSchemaMigrationNow()
      };
      journal.status = "COMMITTED";
      journal.completedTimestamp = result.completedTimestamp;
      journal.finalResult = result;
      staffSchemaMigrationWriteJournal(journalKey, journal);
      return result;
    } catch (caught) {
      journal.errorDetails.push(staffSchemaMigrationErrorDetail(caught));
      var rollbackFailures = coreStagingBootstrapRollback(identity.spreadsheet, journal);
      journal.inFlightOperation = null;
      if (rollbackFailures.length) {
        journal.status = "RECOVERY_REQUIRED";
        journal.errorDetails = journal.errorDetails.concat(rollbackFailures);
      } else {
        journal.status = "ROLLED_BACK";
        journal.completedTimestamp = staffSchemaMigrationNow();
      }
      staffSchemaMigrationWriteJournal(journalKey, journal);
      if (rollbackFailures.length) {
        throw coreStagingBootstrapError(
          "CORE_BOOTSTRAP_RECOVERY_REQUIRED",
          "Core Authentication rollback could not be proven safe.", rollbackFailures
        );
      }
      throw caught;
    }
  });
}

function executePreparedCoreStagingBootstrap() {
  var record = staffSchemaMigrationReadJson(
    PropertiesService.getUserProperties(), CORE_STAGING_BOOTSTRAP_TOKEN_KEY
  );
  if (!record) {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_CONFIRMATION_REQUIRED", "Run prepareCoreStagingBootstrap immediately before execution."
    );
  }
  return executeCoreStagingBootstrap({
    requestId: record.requestId,
    confirmationToken: record.token
  });
}

function coreStagingBootstrapDiagnostic(statuses) {
  coreStagingBootstrapIdentityAndOwner();
  var properties = PropertiesService.getScriptProperties().getProperties();
  var records = Object.keys(properties).filter(function (key) {
    return key.indexOf(CORE_STAGING_BOOTSTRAP_JOURNAL_PREFIX) === 0;
  }).map(function (key) {
    try { return JSON.parse(properties[key]); } catch (_error) { return null; }
  }).filter(Boolean).filter(function (journal) {
    return !statuses || statuses.indexOf(journal.status) !== -1;
  }).map(function (journal) {
    var remediation = [];
    if (["APPLYING", "RECOVERY_REQUIRED"].indexOf(journal.status) !== -1) {
      remediation.push("Do not rerun bootstrap until USERS is compared with the operation proofs.");
      if ((journal.operationIntents || []).some(function (item) {
        return item.type === "CREATE_USERS_SHEET";
      })) {
        remediation.push(
          "Delete USERS only if it was created by this request, columns 1-6 exactly match the approved headers, " +
          "and it contains no row except a provably matching request-created owner row."
        );
      } else if ((journal.operationIntents || []).some(function (item) {
        return item.type === "CREATE_OWNER_ROW";
      })) {
        remediation.push(
          "Delete only the exact trailing owner row if its stored row fingerprint still matches and no later row exists."
        );
      }
    }
    return {
      bootstrapId: journal.bootstrapId,
      schemaVersion: journal.schemaVersion,
      requestId: journal.requestId,
      actorIdentity: journal.actorIdentity,
      expectedSpreadsheetId: journal.expectedSpreadsheetId,
      ownerUsername: journal.ownerUsername,
      ownerDisplayName: journal.ownerDisplayName,
      startedTimestamp: journal.startedTimestamp,
      completedTimestamp: journal.completedTimestamp,
      status: journal.status,
      exactPlanHash: journal.exactPlanHash,
      createdSheetNames: journal.createdSheetNames || [],
      ownerRowsCreated: (journal.ownerRowsCreated || []).map(function (item) {
        return { sheetName: item.sheetName, rowNumber: item.rowNumber };
      }),
      inFlightOperation: journal.inFlightOperation ? {
        type: journal.inFlightOperation.type,
        sheetName: journal.inFlightOperation.sheetName,
        rowNumber: journal.inFlightOperation.rowNumber || 0
      } : null,
      errorDetails: journal.errorDetails || [],
      writes: journal.writes || 0,
      manualRemediation: remediation
    };
  });
  console.log(JSON.stringify(records));
  return records;
}

function diagnosticCoreStagingBootstrapStatus() {
  return coreStagingBootstrapDiagnostic(null);
}

function diagnosticCoreStagingBootstrapRecovery() {
  return coreStagingBootstrapDiagnostic(["APPLYING", "ROLLED_BACK", "RECOVERY_REQUIRED"]);
}

/* END core-staging-auth-bootstrap.js */

/* BEGIN booking-availability-phase5.js */
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
    if (!environment || !["development", "test", "staging"].includes(environment)) {
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
      phase: 5, version: VERSION, environment, dryRun: true,
      blocked: errors.length > 0, errors,
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

/* END booking-availability-phase5.js */

/* BEGIN branch-foundation-staging.js */
/* global BookingAvailabilityPhase5, getCutHubEnvironmentConfig, assertStagingEnvironment,
  staffSchemaMigrationAssertOwner, schedulePhase2Headers, schedulePhase2ReadRows */

var BRANCH_FOUNDATION_VERSION = "BRANCH_FOUNDATION_V1";
var BRANCH_FOUNDATION_SHEET = "BOOKING_BRANCH_REGISTRY";
var BRANCH_FOUNDATION_WEEKDAYS = [
  "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"
];

function branchFoundationPhase5Contract() {
  if (typeof BookingAvailabilityPhase5 !== "undefined") return BookingAvailabilityPhase5;
  if (typeof require === "function") return require("./booking-availability-phase5");
  throw branchFoundationError("BRANCH_FOUNDATION_CONTRACT_MISSING", "Phase 5 contract is unavailable.");
}

function branchFoundationError(code, message, details) {
  var error = new Error(message || code);
  error.code = code;
  if (details !== undefined) error.details = details;
  return error;
}

function branchFoundationNormalizeHeader(value) {
  return String(value == null ? "" : value).trim().toUpperCase()
    .replace(/[\s-]+/g, "_").replace(/_+/g, "_");
}

function branchFoundationIdentity() {
  var config = getCutHubEnvironmentConfig();
  var environment = String(config.environment || "").trim().toLowerCase();
  if (environment !== "staging") {
    throw branchFoundationError(
      "BRANCH_FOUNDATION_STAGING_ONLY", "Branch Foundation is restricted to Staging."
    );
  }
  if (!config.spreadsheetId || !config.stagingSpreadsheetId ||
      config.spreadsheetId !== config.stagingSpreadsheetId) {
    throw branchFoundationError(
      "BRANCH_FOUNDATION_STAGING_PIN_MISMATCH", "Staging spreadsheet pins must match."
    );
  }
  var strict = assertStagingEnvironment();
  if (!strict || !strict.spreadsheet ||
      strict.spreadsheet.getId() !== config.spreadsheetId ||
      strict.spreadsheet.getId() !== config.stagingSpreadsheetId) {
    throw branchFoundationError(
      "BRANCH_FOUNDATION_IDENTITY_MISMATCH", "Strict Staging identity validation failed."
    );
  }
  var actor = staffSchemaMigrationAssertOwner(strict);
  return {
    environment: "staging",
    expectedSpreadsheetId: config.spreadsheetId,
    actualSpreadsheetId: strict.spreadsheet.getId(),
    actorIdentity: actor.actorIdentity,
    spreadsheet: strict.spreadsheet
  };
}

function branchFoundationPlanMigration(existingHeaders, identity) {
  var expected = branchFoundationPhase5Contract()
    .SHEET_SCHEMAS[BRANCH_FOUNDATION_SHEET].slice();
  var errors = [];
  var createSheets = [];
  var unchangedSheets = [];
  var current = Array.isArray(existingHeaders) ? existingHeaders.map(branchFoundationNormalizeHeader) : null;
  var normalizedExpected = expected.map(branchFoundationNormalizeHeader);
  if (current === null) {
    createSheets.push({ sheetName: BRANCH_FOUNDATION_SHEET, headers: expected });
  } else {
    var duplicates = current.filter(function (header, index) {
      return header && current.indexOf(header) !== index;
    });
    var unknown = current.filter(function (header) {
      return header && normalizedExpected.indexOf(header) === -1;
    });
    if (duplicates.length) {
      errors.push({ code: "BRANCH_FOUNDATION_DUPLICATE_HEADERS", headers: duplicates });
    }
    if (unknown.length) {
      errors.push({ code: "BRANCH_FOUNDATION_UNKNOWN_COLUMNS", headers: unknown });
    }
    if (current.length !== normalizedExpected.length || current.some(function (header, index) {
      return header !== normalizedExpected[index];
    })) {
      errors.push({ code: "BRANCH_FOUNDATION_HEADER_ORDER_INCOMPATIBLE" });
    }
    if (!errors.length) unchangedSheets.push(BRANCH_FOUNDATION_SHEET);
  }
  return {
    schemaVersion: BRANCH_FOUNDATION_VERSION,
    version: BRANCH_FOUNDATION_VERSION,
    dryRun: true,
    writes: 0,
    executionAllowed: false,
    identity: {
      environment: String(identity && identity.environment || ""),
      expectedSpreadsheetId: String(identity && identity.expectedSpreadsheetId || ""),
      actualSpreadsheetId: String(identity && identity.actualSpreadsheetId || "")
    },
    headerNormalization: "TRIM_UPPERCASE_SPACES_HYPHENS_TO_UNDERSCORE",
    createSheets: createSheets,
    initializeBlankSheets: [],
    appendColumns: {},
    unchangedSheets: unchangedSheets,
    preservedUnknownColumns: {},
    errors: errors,
    rollback: {
      createdSheets: createSheets.map(function (item) { return item.sheetName; }),
      appendedColumnRanges: [],
      historicalRowsTouched: 0
    },
    safe: errors.length === 0
  };
}

function previewBranchFoundationMigration() {
  var identity = branchFoundationIdentity();
  var sheet = identity.spreadsheet.getSheetByName(BRANCH_FOUNDATION_SHEET);
  var headers = sheet ? schedulePhase2Headers(sheet) : null;
  return branchFoundationPlanMigration(headers, identity);
}

function diagnosticPreviewBranchFoundationMigration() {
  var result = previewBranchFoundationMigration();
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function branchConfigurationText(value) {
  return String(value == null ? "" : value).trim();
}

function branchConfigurationBoolean(value, field, errors) {
  if (typeof value !== "boolean") {
    errors.push({ code: "BRANCH_CONFIGURATION_BOOLEAN_REQUIRED", field: field });
    return false;
  }
  return value;
}

function branchConfigurationPreviewPlan(data, existingBranches) {
  data = data && typeof data === "object" ? data : {};
  existingBranches = Array.isArray(existingBranches) ? existingBranches : [];
  var errors = [];
  var branchId = branchConfigurationText(data.branchId);
  var branchName = branchConfigurationText(data.branchName);
  var timeZone = branchConfigurationText(data.timeZone);
  var closureStatus = branchConfigurationText(data.closureStatus).toUpperCase();
  var closureReason = branchConfigurationText(data.closureReason);
  var hours = Array.isArray(data.weeklyOpeningHours) ? data.weeklyOpeningHours : null;
  var active = branchConfigurationBoolean(data.active, "ACTIVE", errors);
  var publicSelectable = branchConfigurationBoolean(
    data.publicSelectable, "PUBLIC_SELECTABLE", errors
  );
  if (!branchId) errors.push({ code: "BRANCH_ID_REQUIRED" });
  if (!branchName) errors.push({ code: "BRANCH_NAME_REQUIRED" });
  if (!/^[A-Za-z_]+(?:\/[A-Za-z0-9_+\-]+)+$/.test(timeZone)) {
    errors.push({ code: "BRANCH_TIME_ZONE_INVALID" });
  }
  if (["OPEN", "CLOSED"].indexOf(closureStatus) === -1) {
    errors.push({ code: "BRANCH_CLOSURE_STATUS_INVALID" });
  }
  if (closureStatus === "CLOSED" && !closureReason) {
    errors.push({ code: "BRANCH_CLOSURE_REASON_REQUIRED" });
  }
  var exactMatches = existingBranches.filter(function (branch) {
    return branchConfigurationText(branch.branchId || branch.BRANCH_ID) === branchId;
  });
  var caseMatches = existingBranches.filter(function (branch) {
    var existingId = branchConfigurationText(branch.branchId || branch.BRANCH_ID);
    return existingId && branchId && existingId.toLowerCase() === branchId.toLowerCase() && existingId !== branchId;
  });
  if (exactMatches.length) errors.push({ code: "BRANCH_ID_DUPLICATE" });
  if (caseMatches.length) errors.push({ code: "BRANCH_ID_CASE_AMBIGUOUS" });
  if (active && existingBranches.some(function (branch) {
    return (branch.active === true || String(branch.ACTIVE).toLowerCase() === "true");
  })) {
    errors.push({ code: "SINGLE_BRANCH_ACTIVE_LIMIT" });
  }
  if (!hours || !hours.length) {
    errors.push({ code: "BRANCH_WEEKLY_HOURS_REQUIRED" });
  } else {
    var seen = {};
    hours.forEach(function (item, index) {
      var weekday = branchConfigurationText(item && item.weekday).toUpperCase();
      var openTime = branchConfigurationText(item && item.openTime);
      var closeTime = branchConfigurationText(item && item.closeTime);
      if (BRANCH_FOUNDATION_WEEKDAYS.indexOf(weekday) === -1) {
        errors.push({ code: "BRANCH_WEEKDAY_INVALID", index: index });
      } else if (seen[weekday]) {
        errors.push({ code: "BRANCH_WEEKDAY_DUPLICATE", weekday: weekday });
      }
      seen[weekday] = true;
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(openTime) ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(closeTime) || openTime === closeTime) {
        errors.push({ code: "BRANCH_HOURS_INVALID", index: index });
      }
    });
  }
  return {
    version: "BRANCH_CONFIGURATION_PREVIEW_V1",
    dryRun: true,
    writes: 0,
    safe: errors.length === 0,
    errors: errors,
    proposedBranch: {
      branchId: branchId,
      branchName: branchName,
      timeZone: timeZone,
      active: active,
      publicSelectable: publicSelectable,
      closureStatus: closureStatus,
      closureReason: closureReason
    },
    weeklyOpeningHours: hours || [],
    operations: errors.length ? [] : [{ type: "CREATE_BRANCH", branchId: branchId }].concat(
      (hours || []).map(function (item) {
        return { type: "CREATE_BRANCH_HOURS", branchId: branchId,
          weekday: branchConfigurationText(item.weekday).toUpperCase() };
      })
    )
  };
}

function previewBranchConfigurationStaging(data) {
  var identity = branchFoundationIdentity();
  var sheet = identity.spreadsheet.getSheetByName(BRANCH_FOUNDATION_SHEET);
  if (!sheet) {
    throw branchFoundationError(
      "BRANCH_FOUNDATION_SCHEMA_NOT_READY", "BOOKING_BRANCH_REGISTRY is required first."
    );
  }
  var headers = schedulePhase2Headers(sheet).map(branchFoundationNormalizeHeader);
  var expected = branchFoundationPhase5Contract().SHEET_SCHEMAS[BRANCH_FOUNDATION_SHEET]
    .map(branchFoundationNormalizeHeader);
  if (headers.length !== expected.length || headers.some(function (header, index) {
    return header !== expected[index];
  })) {
    throw branchFoundationError(
      "BRANCH_FOUNDATION_SCHEMA_INCOMPATIBLE", "Branch registry headers are incompatible."
    );
  }
  return branchConfigurationPreviewPlan(data, schedulePhase2ReadRows(BRANCH_FOUNDATION_SHEET));
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    VERSION: BRANCH_FOUNDATION_VERSION,
    SHEET: BRANCH_FOUNDATION_SHEET,
    WEEKDAYS: BRANCH_FOUNDATION_WEEKDAYS,
    planMigration: branchFoundationPlanMigration,
    previewConfiguration: branchConfigurationPreviewPlan
  };
}

/* END branch-foundation-staging.js */

/* BEGIN branch-registry-row-staging.js */
/* global BookingAvailabilityPhase5, PropertiesService, Utilities, console,
  branchFoundationIdentity, branchFoundationNormalizeHeader,
  staffSchemaMigrationTryLocks, staffSchemaMigrationHash,
  staffSchemaMigrationJournalKey, staffSchemaMigrationTokenKey,
  staffSchemaMigrationReadJson, staffSchemaMigrationWriteJournal,
  staffSchemaMigrationNow, staffSchemaMigrationError */

var BRANCH_REGISTRY_ROW_VERSION = "CANONICAL_BRANCH_REGISTRY_ROW_V1";
var BRANCH_REGISTRY_ROW_PHASE = "BRANCH_REGISTRY_ROW";
var BRANCH_REGISTRY_ROW_SHEET = "BOOKING_BRANCH_REGISTRY";
var BRANCH_REGISTRY_ROW_TOKEN_TTL_MS = 5 * 60 * 1000;
var BRANCH_REGISTRY_ROW_APPROVED = Object.freeze({
  BRANCH_ID: "CUT_HUB_MAIN",
  BRANCH_NAME: "CUT HUB POS STAGING",
  ACTIVE: true,
  TIME_ZONE: "Africa/Cairo",
  PUBLIC_SELECTABLE: true,
  CLOSURE_STATUS: "OPEN",
  CLOSURE_REASON: ""
});

function branchRegistryRowContract() {
  if (typeof BookingAvailabilityPhase5 !== "undefined") return BookingAvailabilityPhase5;
  if (typeof require === "function") return require("./booking-availability-phase5");
  throw new Error("Booking Availability contract is unavailable.");
}

function branchRegistryRowExpectedHeaders() {
  return branchRegistryRowContract().SHEET_SCHEMAS[BRANCH_REGISTRY_ROW_SHEET].slice();
}

function branchRegistryRowNormalized(value) {
  if (typeof branchFoundationNormalizeHeader === "function") {
    return branchFoundationNormalizeHeader(value);
  }
  return String(value == null ? "" : value).trim().toUpperCase()
    .replace(/[\s-]+/g, "_").replace(/_+/g, "_");
}

function branchRegistryRowBusinessValues(row) {
  row = Array.isArray(row) ? row : [];
  return {
    BRANCH_ID: String(row[0] == null ? "" : row[0]).trim(),
    BRANCH_NAME: String(row[1] == null ? "" : row[1]).trim(),
    ACTIVE: row[2] === true || String(row[2]).trim().toLowerCase() === "true",
    TIME_ZONE: String(row[3] == null ? "" : row[3]).trim(),
    PUBLIC_SELECTABLE: row[4] === true || String(row[4]).trim().toLowerCase() === "true",
    CLOSURE_STATUS: String(row[5] == null ? "" : row[5]).trim().toUpperCase(),
    CLOSURE_REASON: String(row[6] == null ? "" : row[6]).trim()
  };
}

function branchRegistryRowBusinessEqual(left, right) {
  return Object.keys(BRANCH_REGISTRY_ROW_APPROVED).every(function (key) {
    return left[key] === right[key];
  });
}

function branchRegistryRowPreviewPlan(headers, rows, identity) {
  var expectedHeaders = branchRegistryRowExpectedHeaders();
  var normalizedHeaders = Array.isArray(headers) ? headers.map(branchRegistryRowNormalized) : [];
  var normalizedExpected = expectedHeaders.map(branchRegistryRowNormalized);
  var errors = [];
  if (normalizedHeaders.length !== normalizedExpected.length ||
      normalizedHeaders.some(function (header, index) {
        return header !== normalizedExpected[index];
      })) {
    errors.push({ code: "BRANCH_REGISTRY_HEADERS_INCOMPATIBLE" });
  }
  rows = Array.isArray(rows) ? rows : [];
  var exactMatches = rows.filter(function (row) {
    return String(row[0] == null ? "" : row[0]).trim() === BRANCH_REGISTRY_ROW_APPROVED.BRANCH_ID;
  });
  var caseVariants = rows.filter(function (row) {
    var branchId = String(row[0] == null ? "" : row[0]).trim();
    return branchId && branchId !== BRANCH_REGISTRY_ROW_APPROVED.BRANCH_ID &&
      branchId.toLowerCase() === BRANCH_REGISTRY_ROW_APPROVED.BRANCH_ID.toLowerCase();
  });
  if (exactMatches.length > 1) {
    errors.push({ code: "BRANCH_REGISTRY_DUPLICATE_ID", count: exactMatches.length });
  } else if (exactMatches.length === 1 && !branchRegistryRowBusinessEqual(
    branchRegistryRowBusinessValues(exactMatches[0]), BRANCH_REGISTRY_ROW_APPROVED
  )) {
    errors.push({ code: "BRANCH_REGISTRY_ID_CONFLICT" });
  }
  if (caseVariants.length) {
    errors.push({ code: "BRANCH_REGISTRY_CASE_AMBIGUOUS", count: caseVariants.length });
  }
  var identical = exactMatches.length === 1 && errors.length === 0;
  var operations = [];
  if (!errors.length && !identical) {
    operations.push({
      type: "APPEND_ROW",
      sheetName: BRANCH_REGISTRY_ROW_SHEET,
      values: {
        BRANCH_ID: BRANCH_REGISTRY_ROW_APPROVED.BRANCH_ID,
        BRANCH_NAME: BRANCH_REGISTRY_ROW_APPROVED.BRANCH_NAME,
        ACTIVE: BRANCH_REGISTRY_ROW_APPROVED.ACTIVE,
        TIME_ZONE: BRANCH_REGISTRY_ROW_APPROVED.TIME_ZONE,
        PUBLIC_SELECTABLE: BRANCH_REGISTRY_ROW_APPROVED.PUBLIC_SELECTABLE,
        CLOSURE_STATUS: BRANCH_REGISTRY_ROW_APPROVED.CLOSURE_STATUS,
        CLOSURE_REASON: BRANCH_REGISTRY_ROW_APPROVED.CLOSURE_REASON,
        CREATED_AT: "SERVER_TIMESTAMP",
        CREATED_BY: "VERIFIED_ACTOR",
        UPDATED_AT: "SERVER_TIMESTAMP",
        UPDATED_BY: "VERIFIED_ACTOR",
        LAST_REQUEST_ID: "EXECUTION_REQUEST_ID"
      }
    });
  }
  return {
    schemaVersion: BRANCH_REGISTRY_ROW_VERSION,
    version: BRANCH_REGISTRY_ROW_VERSION,
    dryRun: true,
    writes: 0,
    identity: {
      environment: String(identity && identity.environment || ""),
      expectedSpreadsheetId: String(identity && identity.expectedSpreadsheetId || ""),
      actualSpreadsheetId: String(identity && identity.actualSpreadsheetId || "")
    },
    sheetName: BRANCH_REGISTRY_ROW_SHEET,
    expectedHeaders: expectedHeaders,
    registryStateFingerprint: branchRegistryRowContract().hash({
      headers: normalizedHeaders,
      rows: rows
    }),
    proposedBranch: Object.assign({}, BRANCH_REGISTRY_ROW_APPROVED),
    operations: operations,
    unchanged: identical,
    errors: errors,
    safe: errors.length === 0
  };
}

function branchRegistryRowReadState(identity) {
  var sheet = identity.spreadsheet.getSheetByName(BRANCH_REGISTRY_ROW_SHEET);
  if (!sheet) {
    throw staffSchemaMigrationError(
      "BRANCH_REGISTRY_SCHEMA_NOT_READY", "BOOKING_BRANCH_REGISTRY is required."
    );
  }
  var lastColumn = sheet.getLastColumn();
  var headers = lastColumn ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0] : [];
  var lastRow = sheet.getLastRow();
  var rows = lastRow > 1
    ? sheet.getRange(2, 1, lastRow - 1, Math.max(1, lastColumn)).getValues()
    : [];
  return { sheet: sheet, headers: headers, rows: rows };
}

function previewCanonicalBranchRegistryRow() {
  var identity = branchFoundationIdentity();
  var state = branchRegistryRowReadState(identity);
  return branchRegistryRowPreviewPlan(state.headers, state.rows, identity);
}

function diagnosticPreviewCanonicalBranchRegistryRow() {
  var result = previewCanonicalBranchRegistryRow();
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function branchRegistryRowPlanHash(plan) {
  return staffSchemaMigrationHash({
    schemaVersion: plan.schemaVersion,
    identity: plan.identity,
    sheetName: plan.sheetName,
    expectedHeaders: plan.expectedHeaders,
    registryStateFingerprint: plan.registryStateFingerprint,
    proposedBranch: plan.proposedBranch,
    operations: plan.operations,
    unchanged: plan.unchanged,
    errors: plan.errors,
    safe: plan.safe,
    dryRun: plan.dryRun,
    writes: plan.writes
  });
}

function branchRegistryRowAssertPlan(plan) {
  if (!plan || plan.safe !== true || plan.dryRun !== true || Number(plan.writes) !== 0 ||
      !Array.isArray(plan.errors) || plan.errors.length !== 0 ||
      !Array.isArray(plan.operations) || plan.operations.length > 1) {
    throw staffSchemaMigrationError(
      "BRANCH_REGISTRY_PREVIEW_NOT_SAFE", "Canonical branch row preview is not executable."
    );
  }
  return plan;
}

function branchRegistryRowFingerprint(requestId, planHash, identity) {
  return staffSchemaMigrationHash({
    phase: BRANCH_REGISTRY_ROW_PHASE,
    version: BRANCH_REGISTRY_ROW_VERSION,
    requestId: requestId,
    planHash: planHash,
    spreadsheetId: identity.spreadsheet.getId(),
    actorIdentity: identity.actorIdentity,
    approvedBranch: BRANCH_REGISTRY_ROW_APPROVED
  });
}

function branchRegistryRowPrepare(data) {
  data = data && typeof data === "object" ? data : {};
  var requestId = String(data.requestId || "").trim();
  if (!requestId || requestId.length > 160) {
    throw staffSchemaMigrationError(
      "BRANCH_REGISTRY_REQUEST_ID_REQUIRED", "An explicit requestId is required."
    );
  }
  var identity = branchFoundationIdentity();
  return staffSchemaMigrationTryLocks(function () {
    var journalKey = staffSchemaMigrationJournalKey(
      BRANCH_REGISTRY_ROW_PHASE, requestId,
      identity.spreadsheet.getId(), identity.actorIdentity
    );
    var scriptStore = PropertiesService.getScriptProperties();
    var existing = staffSchemaMigrationReadJson(scriptStore, journalKey);
    if (existing && ["APPLYING", "RECOVERY_REQUIRED"].indexOf(existing.status) !== -1) {
      throw staffSchemaMigrationError(
        "BRANCH_REGISTRY_REQUEST_NOT_PREPARABLE", "The request requires recovery."
      );
    }
    var plan = branchRegistryRowAssertPlan(previewCanonicalBranchRegistryRow());
    var livePlanHash = branchRegistryRowPlanHash(plan);
    var bindingPlanHash = existing && existing.status === "COMMITTED"
      ? existing.exactPlanHash : livePlanHash;
    var fingerprint = branchRegistryRowFingerprint(requestId, bindingPlanHash, identity);
    if (existing && existing.requestFingerprint !== fingerprint) {
      throw staffSchemaMigrationError(
        "BRANCH_REGISTRY_REQUEST_ID_REUSED", "requestId is bound to different state."
      );
    }
    var rawToken = Utilities.getUuid() + "-" + Utilities.getUuid();
    var tokenRecord = {
      token: rawToken,
      tokenHash: staffSchemaMigrationHash(rawToken),
      phase: BRANCH_REGISTRY_ROW_PHASE,
      requestId: requestId,
      exactPlanHash: bindingPlanHash,
      requestFingerprint: fingerprint,
      spreadsheetId: identity.spreadsheet.getId(),
      actorIdentity: identity.actorIdentity,
      expiresAt: new Date(Date.now() + BRANCH_REGISTRY_ROW_TOKEN_TTL_MS).toISOString()
    };
    var journal = existing && existing.status === "COMMITTED" ? existing : {
      migrationId: BRANCH_REGISTRY_ROW_VERSION,
      schemaVersion: BRANCH_REGISTRY_ROW_VERSION,
      phase: BRANCH_REGISTRY_ROW_PHASE,
      requestId: requestId,
      actorIdentity: identity.actorIdentity,
      expectedSpreadsheetId: identity.spreadsheet.getId(),
      startedTimestamp: staffSchemaMigrationNow(),
      completedTimestamp: "",
      status: "PREPARED",
      exactPlanHash: livePlanHash,
      requestFingerprint: fingerprint,
      createdSheetNames: [],
      appendedColumnRanges: [],
      insertedRows: [],
      errorDetails: [],
      writes: 0,
      finalResult: null
    };
    if (journal.status !== "COMMITTED") staffSchemaMigrationWriteJournal(journalKey, journal);
    PropertiesService.getUserProperties().setProperty(
      staffSchemaMigrationTokenKey(BRANCH_REGISTRY_ROW_PHASE), JSON.stringify(tokenRecord)
    );
    return {
      tokenIssued: true,
      expiresAt: tokenRecord.expiresAt,
      requestId: requestId,
      phase: BRANCH_REGISTRY_ROW_PHASE,
      exactPlanHash: bindingPlanHash,
      operationCount: plan.operations.length,
      operationSummary: plan.operations.map(function (operation) {
        return {
          type: operation.type,
          sheetName: operation.sheetName,
          branchId: operation.values && operation.values.BRANCH_ID || ""
        };
      }),
      proposedBranch: plan.proposedBranch,
      alreadyCommitted: journal.status === "COMMITTED"
    };
  });
}

function prepareCanonicalBranchRegistryRow() {
  var result = branchRegistryRowPrepare({ requestId: Utilities.getUuid() });
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function branchRegistryRowValues(identity, requestId, timestamp) {
  return [
    BRANCH_REGISTRY_ROW_APPROVED.BRANCH_ID,
    BRANCH_REGISTRY_ROW_APPROVED.BRANCH_NAME,
    BRANCH_REGISTRY_ROW_APPROVED.ACTIVE,
    BRANCH_REGISTRY_ROW_APPROVED.TIME_ZONE,
    BRANCH_REGISTRY_ROW_APPROVED.PUBLIC_SELECTABLE,
    BRANCH_REGISTRY_ROW_APPROVED.CLOSURE_STATUS,
    BRANCH_REGISTRY_ROW_APPROVED.CLOSURE_REASON,
    timestamp,
    identity.actorIdentity,
    timestamp,
    identity.actorIdentity,
    requestId
  ];
}

function branchRegistryRowValuesEqual(left, right) {
  return Array.isArray(left) && Array.isArray(right) && left.length === right.length &&
    left.every(function (value, index) { return value === right[index]; });
}

function branchRegistryRowRollback(sheet, journal) {
  var operation = journal.inFlightOperation || (journal.insertedRows || [])[0];
  if (!operation) return [];
  try {
    if (sheet.getLastRow() < operation.rowNumber) return [];
    if (sheet.getLastRow() !== operation.rowNumber) {
      throw new Error("Inserted row is no longer the last row.");
    }
    var actual = sheet.getRange(operation.rowNumber, 1, 1, operation.values.length).getValues()[0];
    if (!branchRegistryRowValuesEqual(actual, operation.values)) {
      throw new Error("Inserted row no longer matches the request proof.");
    }
    sheet.deleteRow(operation.rowNumber);
    return [];
  } catch (error) {
    return [{
      operation: "APPEND_ROW",
      rowNumber: operation.rowNumber,
      message: String(error && error.message || error).slice(0, 500)
    }];
  }
}

function branchRegistryRowExecutePrepared() {
  var identity = branchFoundationIdentity();
  return staffSchemaMigrationTryLocks(function () {
    var tokenKey = staffSchemaMigrationTokenKey(BRANCH_REGISTRY_ROW_PHASE);
    var userStore = PropertiesService.getUserProperties();
    var token = staffSchemaMigrationReadJson(userStore, tokenKey);
    if (!token || token.phase !== BRANCH_REGISTRY_ROW_PHASE || !token.token ||
        token.tokenHash !== staffSchemaMigrationHash(token.token)) {
      throw staffSchemaMigrationError(
        "BRANCH_REGISTRY_TOKEN_INVALID", "Prepared token is missing or invalid."
      );
    }
    if (Date.parse(token.expiresAt || "") <= Date.now()) {
      userStore.deleteProperty(tokenKey);
      throw staffSchemaMigrationError("BRANCH_REGISTRY_TOKEN_EXPIRED", "Prepared token expired.");
    }
    if (token.spreadsheetId !== identity.spreadsheet.getId() ||
        token.actorIdentity !== identity.actorIdentity) {
      throw staffSchemaMigrationError(
        "BRANCH_REGISTRY_TOKEN_MISMATCH", "Prepared token identity does not match."
      );
    }
    var journalKey = staffSchemaMigrationJournalKey(
      BRANCH_REGISTRY_ROW_PHASE, token.requestId,
      identity.spreadsheet.getId(), identity.actorIdentity
    );
    var journal = staffSchemaMigrationReadJson(
      PropertiesService.getScriptProperties(), journalKey
    );
    if (!journal || journal.requestFingerprint !== token.requestFingerprint ||
        journal.exactPlanHash !== token.exactPlanHash) {
      throw staffSchemaMigrationError(
        "BRANCH_REGISTRY_PREPARED_STATE_MISMATCH", "Prepared journal does not match token."
      );
    }
    if (journal.status === "COMMITTED") {
      userStore.deleteProperty(tokenKey);
      return journal.finalResult;
    }
    if (journal.status !== "PREPARED") {
      throw staffSchemaMigrationError(
        "BRANCH_REGISTRY_REQUEST_NOT_EXECUTABLE", "Request is not PREPARED."
      );
    }
    var plan = branchRegistryRowAssertPlan(previewCanonicalBranchRegistryRow());
    var planHash = branchRegistryRowPlanHash(plan);
    var fingerprint = branchRegistryRowFingerprint(token.requestId, planHash, identity);
    if (planHash !== token.exactPlanHash || fingerprint !== token.requestFingerprint) {
      throw staffSchemaMigrationError(
        "BRANCH_REGISTRY_PLAN_DRIFT", "Branch registry state changed after preparation."
      );
    }
    userStore.deleteProperty(tokenKey);
    journal.status = "APPLYING";
    staffSchemaMigrationWriteJournal(journalKey, journal);
    var state = branchRegistryRowReadState(identity);
    try {
      if (plan.operations.length === 1) {
        var timestamp = new Date().toISOString();
        var values = branchRegistryRowValues(identity, token.requestId, timestamp);
        var operation = {
          type: "APPEND_ROW",
          sheetName: BRANCH_REGISTRY_ROW_SHEET,
          rowNumber: state.sheet.getLastRow() + 1,
          values: values
        };
        journal.inFlightOperation = operation;
        staffSchemaMigrationWriteJournal(journalKey, journal);
        state.sheet.getRange(operation.rowNumber, 1, 1, values.length).setValues([values]);
        journal.insertedRows.push(operation);
        journal.inFlightOperation = null;
        journal.writes = 1;
        staffSchemaMigrationWriteJournal(journalKey, journal);
      }
      var verification = branchRegistryRowAssertPlan(previewCanonicalBranchRegistryRow());
      if (!verification.unchanged || verification.operations.length !== 0) {
        throw staffSchemaMigrationError(
          "BRANCH_REGISTRY_FINAL_VERIFICATION_FAILED", "Canonical branch row verification failed."
        );
      }
      var result = {
        status: "COMMITTED",
        migrationId: BRANCH_REGISTRY_ROW_VERSION,
        phase: BRANCH_REGISTRY_ROW_PHASE,
        requestId: token.requestId,
        exactPlanHash: planHash,
        spreadsheetId: identity.spreadsheet.getId(),
        actorIdentity: identity.actorIdentity,
        branchId: BRANCH_REGISTRY_ROW_APPROVED.BRANCH_ID,
        insertedRowNumber: journal.insertedRows.length
          ? journal.insertedRows[0].rowNumber : 0,
        writes: journal.writes,
        completedTimestamp: staffSchemaMigrationNow()
      };
      journal.status = "COMMITTED";
      journal.completedTimestamp = result.completedTimestamp;
      journal.finalResult = result;
      staffSchemaMigrationWriteJournal(journalKey, journal);
      return result;
    } catch (caught) {
      journal.errorDetails.push({
        code: String(caught && caught.code || "BRANCH_REGISTRY_EXECUTION_FAILED").slice(0, 120),
        message: String(caught && caught.message || caught).slice(0, 500)
      });
      var rollbackFailures = branchRegistryRowRollback(state.sheet, journal);
      journal.inFlightOperation = rollbackFailures.length ? journal.inFlightOperation : null;
      journal.status = rollbackFailures.length ? "RECOVERY_REQUIRED" : "ROLLED_BACK";
      if (rollbackFailures.length) journal.errorDetails = journal.errorDetails.concat(rollbackFailures);
      else journal.completedTimestamp = staffSchemaMigrationNow();
      staffSchemaMigrationWriteJournal(journalKey, journal);
      if (rollbackFailures.length) {
        throw staffSchemaMigrationError(
          "BRANCH_REGISTRY_RECOVERY_REQUIRED",
          "Canonical branch row rollback could not be proven safe.", rollbackFailures
        );
      }
      throw caught;
    }
  });
}

function executePreparedCanonicalBranchRegistryRowStaging() {
  var result = branchRegistryRowExecutePrepared();
  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    VERSION: BRANCH_REGISTRY_ROW_VERSION,
    APPROVED: BRANCH_REGISTRY_ROW_APPROVED,
    previewPlan: branchRegistryRowPreviewPlan
  };
}

/* END branch-registry-row-staging.js */

/* BEGIN booking-availability-phase5-gas.js */
/* global BookingAvailabilityPhase5, StaffAttendancePhase3, StaffSchedulingPhase2,
  SpreadsheetApp, PropertiesService, CacheService, Utilities, getCutHubEnvironmentConfig,
  getAuthenticatedUser, normalizeManagedPermissions, schedulePhase2Actor,
  schedulePhase2ReadRows, schedulePhase2ReadStaff, schedulePhase2ReadSchedules,
  schedulePhase2Headers, schedulePhase2Save, attendancePhase3ReadDays,
  attendancePhase3ResolveSchedule, getAllBookingsV2, jsonOutput, LockService, Session */

function bookingAvailabilityPhase5Text(value) {
  return String(value === undefined || value === null ? "" : value).trim();
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
  return (prefetchedRows || schedulePhase2ReadRows("BRANCH_BOOKING_HOURS")).filter(function (item) {
    var active = item.active === true || String(item.active).toUpperCase() === "TRUE";
    return active && bookingAvailabilityPhase5Text(item.branchId) === bookingAvailabilityPhase5Text(branchId) &&
      String(item.weekday || "").toUpperCase() === weekday &&
      (!item.effectiveFrom || item.effectiveFrom <= date) &&
      (!item.effectiveTo || item.effectiveTo >= date);
  }).map(function (item) {
    return { start: bookingAvailabilityPhase5Text(item.openTime), end: bookingAvailabilityPhase5Text(item.closeTime) };
  });
}

function bookingAvailabilityPhase5RequestSnapshot() {
  var staff = schedulePhase2ReadStaff();
  var versions = schedulePhase2ReadRows("BOOKING_AVAILABILITY_VERSIONS");
  var generations = schedulePhase2ReadRows("BOOKING_AVAILABILITY_GENERATIONS");
  var hours = schedulePhase2ReadRows("BRANCH_BOOKING_HOURS");
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
  return schedulePhase2ReadRows("BRANCH_BOOKING_HOURS").filter(function (item) {
    return actor.owner || (actor.branchIds || []).indexOf(item.branchId) !== -1;
  }).map(function (item) {
    return {
      branchHoursId: item.branchHoursId, branchId: item.branchId,
      weekday: String(item.weekday || "").toUpperCase(),
      openTime: item.openTime || "", closeTime: item.closeTime || "",
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

/* END booking-availability-phase5-gas.js */