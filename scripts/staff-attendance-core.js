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
