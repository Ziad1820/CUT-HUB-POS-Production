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
    if (["production", "staging"].includes(environment)) {
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
