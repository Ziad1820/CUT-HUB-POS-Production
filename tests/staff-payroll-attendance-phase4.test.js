const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const phase4 = require("../scripts/staff-payroll-attendance-phase4");
const schema = require("../scripts/staff-attendance-schema");
const { buildBundle, SOURCE_ORDER } =
  require("../scripts/build-staff-payroll-attendance-phase4-bundle");

const ROOT = path.resolve(__dirname, "..");

function policy(overrides = {}) {
  return {
    policyId: "POL-1", staffId: "", effectiveFrom: "2026-01-01",
    effectiveTo: "2026-12-31", active: true, currency: "EGP",
    salaryBasis: "MONTHLY", overtimeMultiplierBps: 15000,
    unpaidLeaveMultiplierBps: 10000, absenceMultiplierBps: 10000,
    ...overrides
  };
}

function day(date = "2026-07-01", overrides = {}) {
  const result = {
    attendanceDayId: `ATD-S1-${date}`, staffId: "S1", attendanceDate: date,
    calculationVersion: "STAFF_ATTENDANCE_PHASE3_V1",
    sourceEventHash: `HASH-${date}`, status: "CHECKED_OUT",
    requiredWorkMinutesRounded: 480, workedMinutesRounded: 480,
    deficitMinutesRounded: 0, rawOvertimeMinutes: 0,
    approvedOvertimeMinutes: 0, locked: true,
    policySnapshot: {}, scheduleSnapshot: {}, calculationWarnings: [],
    ...overrides
  };
  if (!Object.prototype.hasOwnProperty.call(overrides, "overtimeApprovalStatus")) {
    result.overtimeApprovalStatus = Number(result.approvedOvertimeMinutes || 0) > 0
      ? "APPROVED" : "NOT_REQUESTED";
  }
  return result;
}

function direct(overrides = {}) {
  return phase4.calculateEmployeeSettlement({
    period: {
      payrollPeriodId: "PER-1", startDate: "2026-07-01", endDate: "2026-07-01"
    },
    staff: {
      staffId: "S1", staffName: "Ali", branchId: "B1",
      salary: "26000.00", salaryBasis: "MONTHLY"
    },
    policies: [policy()],
    days: [day()],
    adjustments: [],
    ...overrides
  });
}

function harness(options = {}) {
  const actors = {
    calculator: {
      actorId: "calculator", actorName: "Calculator", role: "PAYROLL", branchIds: ["B1"],
      permissions: ["payroll_attendance.view", "payroll_attendance.calculate",
        "payroll_attendance.adjust", "payroll_attendance.export"]
    },
    reviewer: {
      actorId: "reviewer", actorName: "Reviewer", role: "PAYROLL", branchIds: ["B1"],
      permissions: ["payroll_attendance.view", "payroll_attendance.review"]
    },
    approver: {
      actorId: "approver", actorName: "Approver", role: "PAYROLL", branchIds: ["B1"],
      permissions: ["payroll_attendance.view", "payroll_attendance.approve",
        "payroll_attendance.lock", "payroll_attendance.adjust",
        "payroll_attendance.export"]
    },
    dual: {
      actorId: "dual", actorName: "Dual Reviewer", role: "PAYROLL", branchIds: ["B1"],
      permissions: ["payroll_attendance.view", "payroll_attendance.review",
        "payroll_attendance.approve"]
    },
    reopener: {
      actorId: "reopener", actorName: "Reopener", role: "OWNER", branchIds: ["B1"],
      permissions: ["payroll_attendance.view", "payroll_attendance.reopen"]
    },
    manager: {
      actorId: "manager", actorName: "Manager", role: "MANAGER", branchIds: ["B1"],
      permissions: ["payroll_attendance.view"]
    },
    outsider: {
      actorId: "outsider", actorName: "Outsider", role: "MANAGER", branchIds: ["B2"],
      permissions: ["payroll_attendance.view", "payroll_attendance.calculate"]
    },
    employee: {
      actorId: "employee", actorName: "Employee", role: "EMPLOYEE",
      staffId: "S1", branchIds: ["B1"], permissions: ["payroll_attendance.view"]
    },
    owner: {
      actorId: "owner", actorName: "Owner", role: "OWNER", owner: true,
      permissions: []
    },
    legacy: {
      actorId: "legacy", actorName: "Legacy", role: "MANAGER", branchIds: ["B1"],
      permissions: ["view_attendance", "view_staff_accounting"]
    }
  };
  const repository = options.repository || phase4.createMemoryRepository({
    periods: options.periods || [],
    settlements: options.settlements || [],
    adjustments: options.adjustments || [],
    attendanceDays: options.attendanceDays || [day()],
    staff: options.staff || [
      { staffId: "S1", staffName: "Ali", branchId: "B1", salary: "26000", active: true },
      { staffId: "S2", staffName: "Mona", branchId: "B2", salary: "20000", active: true }
    ],
    policies: options.policies || [policy()],
    audit: options.audit || []
  });
  let clock = "2026-07-30T10:00:00+03:00";
  let counter = 0;
  const service = phase4.createService({
    repository,
    actorResolver: data => actors[data.as || "calculator"] || null,
    now: () => clock,
    uuid: () => `uuid-${++counter}`,
    withLock: options.withLock || ((_details, callback) => callback())
  });
  return {
    repository, service, actors,
    execute(action, data = {}) {
      return service.execute(action, {
        action, as: data.as || "calculator",
        requestId: data.requestId || `REQ-${++counter}`,
        reason: data.reason || "reviewed payroll reason",
        ...data
      });
    },
    setNow(value) { clock = value; }
  };
}

function code(fn, expected) {
  assert.throws(fn, caught => caught && caught.code === expected);
}

test("Phase 4 schemas are append-only and expose periods, settlements, adjustments, audit, and idempotency", () => {
  for (const name of [
    "PAYROLL_ATTENDANCE_PERIODS", "PAYROLL_ATTENDANCE_SETTLEMENTS",
    "PAYROLL_ATTENDANCE_ADJUSTMENTS", "PAYROLL_ATTENDANCE_AUDIT",
    "PAYROLL_ATTENDANCE_IDEMPOTENCY"
  ]) {
    assert.ok(schema.SHEET_SCHEMAS[name], name);
    assert.equal(new Set(schema.SHEET_SCHEMAS[name]).size, schema.SHEET_SCHEMAS[name].length);
  }
  assert.equal(schema.SHEET_SCHEMAS.PAYROLL_ATTENDANCE_SETTLEMENTS[0], "SETTLEMENT_ID");
  assert.ok(schema.SHEET_SCHEMAS.PAYROLL_ATTENDANCE_SETTLEMENTS.includes("SOURCE_AGGREGATE_HASH"));
  assert.deepEqual(phase4.PERIOD_STATUSES, [
    "DRAFT", "CALCULATED", "UNDER_REVIEW", "APPROVED", "LOCKED", "REOPENED"
  ]);
});

test("EGP parsing uses exact integer piastres", () => {
  assert.equal(phase4.parseMajorToMinor("123.45", "EGP"), 12345);
  assert.equal(phase4.parseMajorToMinor("0.01", "EGP"), 1);
  assert.equal(phase4.parseMajorToMinor(123.45, "EGP"), 12345);
});

test("unsupported money precision and currency fail explicitly", () => {
  code(() => phase4.parseMajorToMinor("1.001", "EGP"), "PAYROLL_PRECISION_UNSUPPORTED");
  code(() => phase4.parseMajorToMinor("1.00", "USD"), "PAYROLL_CURRENCY_UNSUPPORTED");
});

test("negative salary and unsafe integer money are rejected", () => {
  code(() => direct({ staff: {
    staffId: "S1", staffName: "Ali", branchId: "B1", salary: "-1", salaryBasis: "MONTHLY"
  }}), "PAYROLL_NEGATIVE_VALUE");
  code(() => phase4.roundDivide(Number.MAX_SAFE_INTEGER + 1, 1),
    "PAYROLL_INTEGER_REQUIRED");
  code(() => phase4.parseMajorToMinor("90071992547410.00", "EGP"),
    "PAYROLL_MONEY_OVERFLOW");
});

test("half-up rational rounding handles boundaries without floating-point money", () => {
  assert.equal(phase4.roundDivide(1, 3), 0);
  assert.equal(phase4.roundDivide(1, 2), 1);
  assert.equal(phase4.roundDivide(2, 3), 1);
});

test("half-piastre, malformed, exponent, and over-precision money inputs fail closed", () => {
  for (const value of ["0.005", "12x", "1e3", "", "  "]) {
    code(() => phase4.parseMajorToMinor(value, "EGP"), "PAYROLL_PRECISION_UNSUPPORTED");
  }
});

test("conflicting staff salary fields and fixed rates are rejected as ambiguous", () => {
  code(() => direct({ staff: {
    staffId: "S1", staffName: "Ali", branchId: "B1",
    salary: "26000", salaryMinor: 2500000, salaryBasis: "MONTHLY"
  }}), "PAYROLL_SALARY_AMBIGUOUS");
  code(() => direct({ policies: [policy({
    overtimeRateMinorPerMinute: 100, overtimeRatePerHour: "61"
  })] }), "PAYROLL_RATE_AMBIGUOUS");
  code(() => direct({
    staff: { staffId: "S1", staffName: "Ali", branchId: "B1", salaryBasis: "MONTHLY" },
    policies: [policy({ monthlySalaryMinor: 2600000, monthlySalary: "25000" })]
  }), "PAYROLL_SALARY_AMBIGUOUS");
});

test("legacy decimal overtime multiplier converts to exact basis points without rounding", () => {
  const result = direct({ policies: [policy({
    overtimeMultiplierBps: undefined, overtimeMultiplier: "1.2345"
  })] });
  assert.equal(result.policySnapshot.overtimeMultiplierBps, 12345);
  code(() => direct({ policies: [policy({
    overtimeMultiplierBps: undefined, overtimeMultiplier: "1.23456"
  })] }), "PAYROLL_PERCENTAGE_PRECISION_UNSUPPORTED");
});

for (const [basis, salary, expected] of [
  ["MONTHLY", "31000", 100000],
  ["DAILY", "1000", 100000],
  ["HOURLY", "100", 80000],
  ["PER_MINUTE", "2", 96000]
]) {
  test(`${basis.toLowerCase()} salary basis resolves a deterministic one-day base period`, () => {
    const result = direct({ staff: {
      staffId: "S1", staffName: "Ali", branchId: "B1", salary, salaryBasis: basis
    }});
    assert.equal(result.basePeriodAmountMinor, expected);
  });
}

test("simple authoritative deficit is deducted exactly once", () => {
  const result = direct({ days: [day("2026-07-01", {
    workedMinutesRounded: 420, deficitMinutesRounded: 60
  })] });
  assert.equal(result.deficitMinutes, 60);
  assert.equal(result.deficitDeductionMinor, 10484);
  assert.equal(result.netAttendanceAdjustmentMinor, -10484);
});

test("late, early, and excess-break diagnostics never add a second deduction", () => {
  const result = direct({ days: [day("2026-07-01", {
    workedMinutesRounded: 420, deficitMinutesRounded: 60,
    lateMinutesRounded: 30, earlyLeaveMinutesRounded: 30,
    excessBreakMinutesRounded: 30
  })] });
  assert.equal(result.deficitMinutes, 60);
  assert.equal(result.deficitDeductionMinor, 10484);
});

test("daily and period deduction caps apply to minor-unit results", () => {
  const result = direct({
    policies: [policy({ dailyDeductionCapMinor: 5000, periodDeductionCapMinor: 3000 })],
    days: [day("2026-07-01", { deficitMinutesRounded: 480, workedMinutesRounded: 0 })]
  });
  assert.equal(result.deficitDeductionMinor, 3000);
});

test("raw overtime is diagnostic and never paid without Phase 3 approval", () => {
  const result = direct({ days: [day("2026-07-01", {
    workedMinutesRounded: 600, rawOvertimeMinutes: 120, approvedOvertimeMinutes: 0
  })] });
  assert.equal(result.rawOvertimeMinutes, 120);
  assert.equal(result.overtimeCompensationMinor, 0);
});

test("approved overtime uses fixed hourly rate and multiplier basis points", () => {
  const result = direct({
    policies: [policy({
      overtimeRateType: "FIXED_HOURLY", overtimeRatePerHour: "120.00",
      overtimeMultiplierBps: 15000
    })],
    days: [day("2026-07-01", {
      workedMinutesRounded: 540, rawOvertimeMinutes: 60, approvedOvertimeMinutes: 60
    })]
  });
  assert.equal(result.overtimeCompensationMinor, 18000);
});

test("period overtime cap limits approved minutes before compensation", () => {
  const result = direct({
    policies: [policy({ periodOvertimeCapMinutes: 30, overtimeRatePerHour: "60" })],
    days: [day("2026-07-01", { approvedOvertimeMinutes: 60, rawOvertimeMinutes: 60 })]
  });
  assert.equal(result.approvedOvertimeMinutes, 30);
});

test("stale or above-eligible overtime approval is excluded and blocks review", () => {
  const stale = direct({ days: [day("2026-07-01", {
    approvedOvertimeMinutes: 60, eligibleOvertimeMinutes: 60,
    rawOvertimeMinutes: 60, staleCalculation: true
  })] });
  assert.equal(stale.approvedOvertimeMinutes, 0);
  assert.equal(stale.overtimeCompensationMinor, 0);
  const excessive = direct({ days: [day("2026-07-01", {
    approvedOvertimeMinutes: 61, eligibleOvertimeMinutes: 60, rawOvertimeMinutes: 61
  })] });
  assert.equal(excessive.approvedOvertimeMinutes, 0);
  assert.ok(excessive.blockers.some(item =>
    item.startsWith("OVERTIME_APPROVAL_EXCEEDS_ELIGIBILITY")));
});

test("non-approved overtime status is excluded even when minutes are populated", () => {
  const result = direct({ days: [day("2026-07-01", {
    rawOvertimeMinutes: 60, eligibleOvertimeMinutes: 60,
    approvedOvertimeMinutes: 60, overtimeApprovalStatus: "REJECTED"
  })] });
  assert.equal(result.approvedOvertimeMinutes, 0);
  assert.equal(result.overtimeCompensationMinor, 0);
  assert.ok(result.blockers.includes("OVERTIME_APPROVAL_INVALID:2026-07-01"));
});

test("paid leave, unpaid leave, absence, weekly rest, and closure remain distinct", () => {
  const dates = ["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04", "2026-07-05"];
  const result = phase4.calculateEmployeeSettlement({
    period: { payrollPeriodId: "P", startDate: dates[0], endDate: dates[4] },
    staff: { staffId: "S1", staffName: "Ali", branchId: "B1", salary: "31000" },
    policies: [policy()],
    days: [
      day(dates[0], { status: "LEAVE", leaveOrAbsenceType: "APPROVED_LEAVE" }),
      day(dates[1], { status: "LEAVE", leaveOrAbsenceType: "UNPAID_LEAVE" }),
      day(dates[2], { status: "ABSENT", leaveOrAbsenceType: "ABSENT" }),
      day(dates[3], { status: "DAY_OFF", leaveOrAbsenceType: "WEEKLY_DAY_OFF",
        requiredWorkMinutesRounded: 0 }),
      day(dates[4], { status: "BRANCH_CLOSED", leaveOrAbsenceType: "BRANCH_CLOSED",
        requiredWorkMinutesRounded: 0 })
    ]
  });
  assert.equal(result.approvedPaidLeaveMinutes, 480);
  assert.equal(result.unpaidLeaveMinutes, 480);
  assert.equal(result.absenceMinutes, 480);
  assert.equal(result.deficitMinutes, 0);
  assert.ok(result.unpaidLeaveDeductionMinor > 0);
  assert.ok(result.absenceDeductionMinor > 0);
});

test("sick leave payment policy and leave allowance are explicit", () => {
  const paid = direct({
    policies: [policy({ requiredDailyMinutes: 480, monthlyAllowedLeaveDays: 0, sickLeavePaid: true })],
    days: [day("2026-07-01", { leaveOrAbsenceType: "SICK_LEAVE", status: "LEAVE" })]
  });
  assert.equal(paid.approvedPaidLeaveMinutes, 480);
  assert.equal(paid.unpaidLeaveMinutes, 0);
  const unpaid = direct({
    policies: [policy({ requiredDailyMinutes: 480, sickLeavePaid: false })],
    days: [day("2026-07-01", { leaveOrAbsenceType: "SICK_LEAVE", status: "LEAVE" })]
  });
  assert.equal(unpaid.approvedPaidLeaveMinutes, 0);
  assert.equal(unpaid.unpaidLeaveMinutes, 480);
});

test("paid leave above configured allowance blocks approval without silently deducting twice", () => {
  const result = direct({
    policies: [policy({ requiredDailyMinutes: 480, monthlyAllowedLeaveDays: 0.5 })],
    days: [day("2026-07-01", { leaveOrAbsenceType: "APPROVED_LEAVE", status: "LEAVE" })]
  });
  assert.equal(result.consumedLeaveDays, 1);
  assert.equal(result.excessLeaveDays, 0.5);
  assert.ok(result.blockers.includes("LEAVE_ALLOWANCE_EXCEEDED"));
  assert.equal(result.deficitDeductionMinor, 0);
});

test("partial absence uses authoritative required and deficit minutes only", () => {
  const result = direct({ days: [day("2026-07-01", {
    leaveOrAbsenceType: "PARTIAL_ABSENCE", requiredWorkMinutesRounded: 240,
    workedMinutesRounded: 180, deficitMinutesRounded: 60
  })] });
  assert.equal(result.requiredMinutes, 240);
  assert.equal(result.deficitMinutes, 60);
});

for (const [name, override, warning] of [
  ["open session", { openSession: true, status: "CHECKED_IN" }, "UNRESOLVED_ATTENDANCE"],
  ["open break", { openBreak: true, status: "ON_BREAK" }, "UNRESOLVED_ATTENDANCE"],
  ["stale day", { staleCalculation: true }, "STALE_ATTENDANCE"],
  ["reopened lifecycle", { dayLifecycle: "REOPENED" }, "REOPENED_ATTENDANCE"],
  ["malformed snapshot", { policySnapshot: "{bad" }, "MALFORMED_SOURCE"],
  ["unlocked day", { locked: false }, "UNLOCKED_ATTENDANCE"],
  ["unresolved day", { status: "UNRESOLVED" }, "UNRESOLVED_ATTENDANCE"]
]) {
  test(`${name} produces explicit review-required blocker`, () => {
    const result = direct({ days: [day("2026-07-01", override)] });
    assert.equal(result.status, "REVIEW_REQUIRED");
    assert.ok(result.blockers.some(item => item.startsWith(warning)));
  });
}

test("attendance aggregate staff identity mismatch fails before financial calculation", () => {
  code(() => direct({ days: [day("2026-07-01", { staffId: "S2" })] }),
    "PAYROLL_ATTENDANCE_STAFF_MISMATCH");
});

test("missing calendar-date aggregate is never silently treated as absence", () => {
  const result = direct({
    period: { payrollPeriodId: "P", startDate: "2026-07-01", endDate: "2026-07-02" },
    days: [day("2026-07-01")]
  });
  assert.equal(result.status, "REVIEW_REQUIRED");
  assert.ok(result.blockers.includes("MISSING_ATTENDANCE_DAY:2026-07-02"));
  assert.equal(result.absenceMinutes, 0);
});

test("authoritative rounded zero never falls back to nonzero raw minutes", () => {
  const result = direct({ days: [day("2026-07-01", {
    workedMinutesRounded: 0, workedMinutesRaw: 120,
    deficitMinutesRounded: 0, deficitMinutesRaw: 360
  })] });
  assert.equal(result.workedMinutes, 0);
  assert.equal(result.deficitMinutes, 0);
  assert.equal(result.deficitDeductionMinor, 0);
});

test("source hash is deterministic and changes with authoritative attendance", () => {
  const first = direct();
  const replay = direct();
  const changed = direct({ days: [day("2026-07-01", { deficitMinutesRounded: 1 })] });
  assert.equal(first.sourceAggregateHash, replay.sourceAggregateHash);
  assert.notEqual(first.sourceAggregateHash, changed.sourceAggregateHash);
});

test("source hash covers period boundaries, scope, calculation version, and employee branch", () => {
  const base = direct();
  const boundary = direct({
    period: {
      payrollPeriodId: "PER-1", startDate: "2026-07-01", endDate: "2026-07-02"
    },
    days: [day("2026-07-01"), day("2026-07-02")]
  });
  const scope = direct({ period: {
    payrollPeriodId: "PER-1", startDate: "2026-07-01", endDate: "2026-07-01",
    scopeType: "BRANCH", branchId: "B1"
  }});
  const version = direct({ period: {
    payrollPeriodId: "PER-1", startDate: "2026-07-01", endDate: "2026-07-01",
    calculationVersion: "FUTURE_VERSION"
  }});
  const employeeBranch = direct({ staff: {
    staffId: "S1", staffName: "Ali", branchId: "B2",
    salary: "26000.00", salaryBasis: "MONTHLY"
  }});
  for (const changed of [boundary, scope, version, employeeBranch]) {
    assert.notEqual(base.sourceAggregateHash, changed.sourceAggregateHash);
  }
});

test("salary and policy changes make an unlocked settlement stale before lock", () => {
  const stored = { ...direct(), settlementId: "SET", status: "CALCULATED" };
  const salaryChanged = harness({
    periods: [{ payrollPeriodId: "PER-1", startDate: "2026-07-01", endDate: "2026-07-01",
      status: "CALCULATED", branchId: "B1" }],
    settlements: [stored],
    staff: [{ staffId: "S1", staffName: "Ali", branchId: "B1", salary: "27000", active: true }]
  });
  assert.equal(salaryChanged.execute("getEmployeePayrollSettlement", {
    settlementId: "SET"
  }).settlement.stale, true);
  const policyChanged = harness({
    periods: [{ payrollPeriodId: "PER-1", startDate: "2026-07-01", endDate: "2026-07-01",
      status: "CALCULATED", branchId: "B1" }],
    settlements: [stored],
    staff: [{ staffId: "S1", staffName: "Ali", branchId: "B1", salary: "26000", active: true }],
    policies: [policy({ overtimeMultiplierBps: 20000 })]
  });
  assert.equal(policyChanged.execute("getEmployeePayrollSettlement", {
    settlementId: "SET"
  }).settlement.stale, true);
});

test("salary, rate, policy, and daily sources are snapshotted", () => {
  const result = direct();
  assert.equal(result.salarySnapshot.baseSalaryMinor, 2600000);
  assert.equal(result.policySnapshot.policyId, "POL-1");
  assert.deepEqual(result.sourceAttendanceDayIds, ["ATD-S1-2026-07-01"]);
  assert.equal(result.sourceAttendanceSnapshot[0].calculationVersion,
    "STAFF_ATTENDANCE_PHASE3_V1");
});

test("missing salary and ambiguous monthly cross-month periods fail closed", () => {
  code(() => direct({ staff: {
    staffId: "S1", staffName: "Ali", branchId: "B1", salaryBasis: "MONTHLY"
  }}), "PAYROLL_SALARY_MISSING");
  code(() => direct({
    period: { payrollPeriodId: "P", startDate: "2026-07-31", endDate: "2026-08-01" },
    days: [day("2026-07-31"), day("2026-08-01")]
  }), "PAYROLL_MONTHLY_PERIOD_AMBIGUOUS");
});

test("policy salary fallback is deterministic when staff salary is absent", () => {
  const result = direct({
    staff: { staffId: "S1", staffName: "Ali", branchId: "B1", salaryBasis: "MONTHLY" },
    policies: [policy({ monthlySalary: "31000.00" })]
  });
  assert.equal(result.baseSalaryMinor, 3100000);
});

test("period crossing effective payroll policies fails instead of blending rates silently", () => {
  code(() => phase4.calculateEmployeeSettlement({
    period: { payrollPeriodId: "P", startDate: "2026-07-01", endDate: "2026-07-02" },
    staff: { staffId: "S1", staffName: "Ali", branchId: "B1", salary: "26000" },
    policies: [
      policy({ policyId: "P1", effectiveTo: "2026-07-01" }),
      policy({ policyId: "P2", effectiveFrom: "2026-07-02" })
    ],
    days: [day("2026-07-01"), day("2026-07-02")]
  }), "PAYROLL_PERIOD_POLICY_AMBIGUOUS");
});

test("temporary policy change inside a period is detected even when endpoint policy matches", () => {
  code(() => phase4.calculateEmployeeSettlement({
    period: { payrollPeriodId: "P", startDate: "2026-07-01", endDate: "2026-07-03" },
    staff: { staffId: "S1", staffName: "Ali", branchId: "B1", salary: "31000" },
    policies: [
      policy(),
      policy({ policyId: "POL-TEMP", staffId: "S1",
        effectiveFrom: "2026-07-02", effectiveTo: "2026-07-02",
        overtimeMultiplierBps: 20000 })
    ],
    days: [day("2026-07-01"), day("2026-07-02"), day("2026-07-03")]
  }), "PAYROLL_PERIOD_POLICY_AMBIGUOUS");
});

test("period creation, calculation, review, approval, lock, and reopen lifecycle is enforced", () => {
  const h = harness({ staff: [
    { staffId: "S1", staffName: "Ali", branchId: "B1", salary: "26000", active: true }
  ] });
  const created = h.execute("createPayrollPeriod", {
    startDate: "2026-07-01", endDate: "2026-07-01"
  }).payrollPeriod;
  assert.equal(created.status, "DRAFT");
  assert.equal(h.execute("calculatePayrollPeriod", {
    payrollPeriodId: created.payrollPeriodId
  }).payrollPeriod.status, "CALCULATED");
  assert.equal(h.execute("submitPayrollPeriodForReview", {
    as: "reviewer", payrollPeriodId: created.payrollPeriodId
  }).payrollPeriod.status, "UNDER_REVIEW");
  assert.equal(h.execute("approvePayrollPeriod", {
    as: "approver", payrollPeriodId: created.payrollPeriodId
  }).payrollPeriod.status, "APPROVED");
  assert.equal(h.execute("lockPayrollPeriod", {
    as: "approver", payrollPeriodId: created.payrollPeriodId
  }).payrollPeriod.status, "LOCKED");
  assert.equal(h.execute("reopenPayrollPeriod", {
    as: "reopener", payrollPeriodId: created.payrollPeriodId
  }).payrollPeriod.status, "REOPENED");
});

test("organization period calculates multiple employees across multiple branches for owner only", () => {
  const h = harness({
    attendanceDays: [
      day("2026-07-01"),
      day("2026-07-01", {
        attendanceDayId: "ATD-S2-2026-07-01", staffId: "S2", sourceEventHash: "HASH-S2"
      })
    ]
  });
  const period = h.execute("createPayrollPeriod", {
    as: "owner", startDate: "2026-07-01", endDate: "2026-07-01"
  }).payrollPeriod;
  const result = h.execute("calculatePayrollPeriod", {
    as: "owner", payrollPeriodId: period.payrollPeriodId
  });
  assert.equal(result.settlements.length, 2);
  assert.deepEqual(new Set(result.settlements.map(item => item.branchId)), new Set(["B1", "B2"]));
});

test("branch actors cannot open or export organization-wide payroll periods", () => {
  const h = harness();
  const period = h.execute("createPayrollPeriod", {
    as: "owner", startDate: "2026-07-01", endDate: "2026-07-01"
  }).payrollPeriod;
  assert.equal(period.branchId, "");
  const visible = h.execute("listPayrollPeriods", { as: "manager" });
  assert.equal(visible.payrollPeriods.length, 0);
  h.actors.manager.permissions.push("payroll_attendance.export");
  code(() => h.execute("previewPayrollAttendanceExport", {
    as: "manager", payrollPeriodId: period.payrollPeriodId
  }), "PAYROLL_ORGANIZATION_SCOPE_DENIED");
});

test("single-branch actor omission resolves to the authenticated branch, never organization scope", () => {
  const h = harness();
  const period = h.execute("createPayrollPeriod", {
    startDate: "2026-07-01", endDate: "2026-07-01"
  }).payrollPeriod;
  assert.equal(period.scopeType, "BRANCH");
  assert.equal(period.branchId, "B1");
});

test("period submitter cannot approve their own period", () => {
  const h = harness({ staff: [
    { staffId: "S1", staffName: "Ali", branchId: "B1", salary: "26000", active: true }
  ] });
  const period = h.execute("createPayrollPeriod", {
    startDate: "2026-07-01", endDate: "2026-07-01"
  }).payrollPeriod;
  h.execute("calculatePayrollPeriod", { payrollPeriodId: period.payrollPeriodId });
  h.execute("submitPayrollPeriodForReview", {
    as: "dual", payrollPeriodId: period.payrollPeriodId
  });
  code(() => h.execute("approvePayrollPeriod", {
    as: "dual", payrollPeriodId: period.payrollPeriodId
  }), "PAYROLL_SELF_APPROVAL_FORBIDDEN");
});

test("employee recalculation cannot bypass review or approval lifecycle", () => {
  const h = harness({ staff: [
    { staffId: "S1", staffName: "Ali", branchId: "B1", salary: "26000", active: true }
  ] });
  const period = h.execute("createPayrollPeriod", {
    startDate: "2026-07-01", endDate: "2026-07-01"
  }).payrollPeriod;
  h.execute("calculatePayrollPeriod", { payrollPeriodId: period.payrollPeriodId });
  h.execute("submitPayrollPeriodForReview", {
    as: "reviewer", payrollPeriodId: period.payrollPeriodId
  });
  code(() => h.execute("recalculateEmployeePayrollSettlement", {
    payrollPeriodId: period.payrollPeriodId, staffId: "S1"
  }), "PAYROLL_PERIOD_TRANSITION_INVALID");
  h.execute("approvePayrollPeriod", {
    as: "approver", payrollPeriodId: period.payrollPeriodId
  });
  code(() => h.execute("recalculateEmployeePayrollSettlement", {
    payrollPeriodId: period.payrollPeriodId, staffId: "S1"
  }), "PAYROLL_PERIOD_TRANSITION_INVALID");
});

test("legacy attendance and staff-accounting permissions grant no Phase 4 access", () => {
  const h = harness();
  code(() => h.execute("listPayrollPeriods", { as: "legacy" }), "PAYROLL_PERMISSION_DENIED");
});

test("manager branch scope and employee self scope fail closed", () => {
  const h = harness({
    periods: [{ payrollPeriodId: "P", startDate: "2026-07-01", endDate: "2026-07-01",
      status: "CALCULATED", branchId: "B2" }]
  });
  code(() => h.execute("listEmployeePayrollSettlements", {
    as: "manager", payrollPeriodId: "P"
  }), "PAYROLL_BRANCH_SCOPE_DENIED");
});

test("employee self-view cannot read another employee settlement and receives no money", () => {
  const own = { ...direct(), settlementId: "OWN", status: "CALCULATED" };
  const other = { ...direct(), settlementId: "OTHER", staffId: "S2",
    branchId: "B1", status: "CALCULATED" };
  const h = harness({
    periods: [{ payrollPeriodId: "PER-1", startDate: "2026-07-01", endDate: "2026-07-01",
      status: "CALCULATED", branchId: "B1" }],
    settlements: [own, other],
    staff: [
      { staffId: "S1", staffName: "Ali", branchId: "B1", salary: "26000", active: true },
      { staffId: "S2", staffName: "Mona", branchId: "B1", salary: "20000", active: true }
    ]
  });
  const result = h.execute("getEmployeePayrollSettlement", {
    as: "employee", settlementId: "OWN"
  });
  assert.equal(result.settlement.baseSalaryMinor, undefined);
  code(() => h.execute("getEmployeePayrollSettlement", {
    as: "employee", settlementId: "OTHER"
  }), "PAYROLL_SELF_SCOPE_DENIED");
});

test("employee list, blocker, and audit reads are restricted to self", () => {
  const own = { ...direct(), settlementId: "OWN", status: "CALCULATED",
    warningsJson: JSON.stringify(["UNLOCKED_ATTENDANCE:2026-07-01"]) };
  const other = { ...direct({
    staff: { staffId: "S3", staffName: "Other", branchId: "B1",
      salary: "20000", salaryBasis: "MONTHLY" },
    days: [day("2026-07-01", { attendanceDayId: "ATD-S3", staffId: "S3" })]
  }), settlementId: "OTHER", staffId: "S3", staffNameSnapshot: "Other",
  status: "REVIEW_REQUIRED", warningsJson: JSON.stringify(["UNLOCKED_ATTENDANCE:2026-07-01"]) };
  const h = harness({
    periods: [{ payrollPeriodId: "PER-1", startDate: "2026-07-01", endDate: "2026-07-01",
      status: "CALCULATED", branchId: "B1" }],
    settlements: [own, other],
    staff: [
      { staffId: "S1", staffName: "Ali", branchId: "B1", salary: "26000", active: true },
      { staffId: "S3", staffName: "Other", branchId: "B1", salary: "20000", active: true }
    ],
    attendanceDays: [
      day(), day("2026-07-01", { attendanceDayId: "ATD-S3", staffId: "S3" })
    ],
    audit: [
      { actionId: "A1", entityId: "OWN", staffId: "S1", branchId: "B1", action: "OWN" },
      { actionId: "A2", entityId: "OTHER", staffId: "S3", branchId: "B1", action: "OTHER" }
    ]
  });
  const listed = h.execute("listEmployeePayrollSettlements", {
    as: "employee", payrollPeriodId: "PER-1"
  });
  assert.deepEqual(listed.settlements.map((item) => item.staffId), ["S1"]);
  const blockers = h.execute("getUnresolvedPayrollBlockers", {
    as: "employee", payrollPeriodId: "PER-1"
  });
  assert.ok(blockers.blockers.every((item) => item.staffId === "S1"));
  code(() => h.execute("getPayrollSettlementAudit", {
    as: "employee", staffId: "S3"
  }), "PAYROLL_SELF_SCOPE_DENIED");
  const audit = h.execute("getPayrollSettlementAudit", {
    as: "employee", staffId: "S1"
  });
  assert.deepEqual(audit.audit.map((item) => item.action), ["OWN"]);
});

test("browser-forged salary, rate, actor, and branch never enter calculation", () => {
  const h = harness({ staff: [
    { staffId: "S1", staffName: "Ali", branchId: "B1", salary: "26000", active: true }
  ] });
  const period = h.execute("createPayrollPeriod", {
    startDate: "2026-07-01", endDate: "2026-07-01",
    salary: "1", overtimeRatePerHour: "1", actorId: "owner", branchId: "B1"
  }).payrollPeriod;
  const result = h.execute("calculatePayrollPeriod", {
    payrollPeriodId: period.payrollPeriodId, salary: "1", overtimeRatePerHour: "1",
    actorId: "owner"
  });
  assert.equal(result.settlements[0].baseSalaryMinor, 2600000);
});

test("idempotent replay returns the same period and changed input conflicts", () => {
  const h = harness();
  const data = {
    startDate: "2026-07-01", endDate: "2026-07-01", requestId: "SAME"
  };
  const first = h.execute("createPayrollPeriod", data);
  const replay = h.execute("createPayrollPeriod", data);
  assert.equal(first.payrollPeriod.payrollPeriodId, replay.payrollPeriod.payrollPeriodId);
  code(() => h.execute("createPayrollPeriod", {
    ...data, endDate: "2026-07-02"
  }), "PAYROLL_IDEMPOTENCY_CONFLICT");
});

test("mock lock timeout performs no writes", () => {
  const h = harness({ withLock() {
    const caught = new Error("locked"); caught.code = "PAYROLL_WRITE_LOCK_TIMEOUT"; throw caught;
  }});
  code(() => h.execute("createPayrollPeriod", {
    startDate: "2026-07-01", endDate: "2026-07-01"
  }), "PAYROLL_WRITE_LOCK_TIMEOUT");
  assert.equal(h.repository.getState().periods.length, 0);
});

test("manual adjustments are append-only, four-eyes, and make settlement stale until recalculation", () => {
  const base = direct();
  const h = harness({
    periods: [{ payrollPeriodId: "PER-1", startDate: "2026-07-01", endDate: "2026-07-01",
      status: "CALCULATED", branchId: "B1" }],
    settlements: [{ ...base, settlementId: "SET-1", settlementVersion: 1,
      periodStart: "2026-07-01", periodEnd: "2026-07-01" }],
    staff: [{ staffId: "S1", staffName: "Ali", branchId: "B1", salary: "26000", active: true }]
  });
  const request = h.execute("requestPayrollManualAdjustment", {
    settlementId: "SET-1", amountMinor: 1000, direction: "CREDIT", category: "CORRECTION"
  }).adjustment;
  code(() => h.execute("approvePayrollManualAdjustment", {
    adjustmentId: request.adjustmentId
  }), "PAYROLL_SELF_APPROVAL_FORBIDDEN");
  const decision = h.execute("approvePayrollManualAdjustment", {
    as: "approver", adjustmentId: request.adjustmentId
  }).adjustment;
  assert.equal(decision.status, "APPROVED");
  assert.equal(h.repository.getState().adjustments.length, 2);
  code(() => h.execute("rejectPayrollManualAdjustment", {
    as: "approver", adjustmentId: request.adjustmentId
  }), "PAYROLL_ADJUSTMENT_ALREADY_DECIDED");
  const read = h.execute("getEmployeePayrollSettlement", {
    settlementId: "SET-1"
  });
  assert.equal(read.settlement.stale, true);
});

test("approved credit and debit adjustments affect only the separate manual component", () => {
  const result = direct({ adjustments: [
    { adjustmentId: "A1", status: "APPROVED", amountMinor: 1000, direction: "CREDIT" },
    { adjustmentId: "A2", status: "APPROVED", amountMinor: 250, direction: "DEBIT" },
    { adjustmentId: "A3", status: "PENDING", amountMinor: 9999, direction: "CREDIT" }
  ] });
  assert.equal(result.manualAdjustmentsMinor, 750);
  assert.equal(result.netAttendanceAdjustmentMinor, 750);
  assert.equal(result.deficitDeductionMinor, 0);
});

test("recalculation supersedes an unlocked settlement and increments version", () => {
  const h = harness({ staff: [
    { staffId: "S1", staffName: "Ali", branchId: "B1", salary: "26000", active: true }
  ] });
  const period = h.execute("createPayrollPeriod", {
    startDate: "2026-07-01", endDate: "2026-07-01"
  }).payrollPeriod;
  const first = h.execute("calculatePayrollPeriod", {
    payrollPeriodId: period.payrollPeriodId
  }).settlements[0];
  const second = h.execute("recalculateEmployeePayrollSettlement", {
    payrollPeriodId: period.payrollPeriodId, staffId: "S1"
  }).settlement;
  assert.equal(second.settlementVersion, 2);
  assert.equal(second.supersedesSettlementId, first.settlementId);
  assert.equal(h.repository.getSettlement(first.settlementId).status, "SUPERSEDED");
});

test("full-period recalculation supersedes employees removed from the eligible set", () => {
  const s1 = { ...direct(), settlementId: "S1-V1", settlementVersion: 1 };
  const s2 = {
    ...direct({
      staff: { staffId: "S2", staffName: "Mona", branchId: "B1",
        salary: "20000", salaryBasis: "MONTHLY" },
      days: [day("2026-07-01", { attendanceDayId: "ATD-S2", staffId: "S2" })]
    }),
    settlementId: "S2-V1", settlementVersion: 1,
    staffId: "S2", staffNameSnapshot: "Mona"
  };
  const h = harness({
    periods: [{ payrollPeriodId: "PER-1", startDate: "2026-07-01", endDate: "2026-07-01",
      status: "CALCULATED", branchId: "B1" }],
    settlements: [s1, s2],
    staff: [{ staffId: "S1", staffName: "Ali", branchId: "B1", salary: "26000", active: true }],
    attendanceDays: [day()]
  });
  h.execute("recalculatePayrollPeriod", { payrollPeriodId: "PER-1" });
  assert.equal(h.repository.getSettlement("S2-V1").status, "SUPERSEDED");
  assert.ok(h.repository.getState().audit.some((item) =>
    item.action === "SUPERSEDE_INELIGIBLE_SETTLEMENT" && item.staffId === "S2"));
  const current = h.repository.listSettlements({ payrollPeriodId: "PER-1" })
    .filter((item) => item.status !== "SUPERSEDED");
  assert.deepEqual(current.map((item) => item.staffId), ["S1"]);
});

test("multiple non-superseded settlement versions fail as ambiguous", () => {
  const base = direct();
  const h = harness({
    periods: [{ payrollPeriodId: "PER-1", startDate: "2026-07-01", endDate: "2026-07-01",
      status: "CALCULATED", branchId: "B1" }],
    settlements: [
      { ...base, settlementId: "SET-1", settlementVersion: 1 },
      { ...base, settlementId: "SET-2", settlementVersion: 2 }
    ],
    staff: [{ staffId: "S1", staffName: "Ali", branchId: "B1", salary: "26000", active: true }]
  });
  code(() => h.execute("getEmployeePayrollSettlement", {
    payrollPeriodId: "PER-1", staffId: "S1"
  }), "PAYROLL_SETTLEMENT_AMBIGUOUS");
});

test("pending adjustment conflicts and superseded-version decisions fail closed", () => {
  const h = harness({ staff: [
    { staffId: "S1", staffName: "Ali", branchId: "B1", salary: "26000", active: true }
  ] });
  const period = h.execute("createPayrollPeriod", {
    startDate: "2026-07-01", endDate: "2026-07-01"
  }).payrollPeriod;
  const settlement = h.execute("calculatePayrollPeriod", {
    payrollPeriodId: period.payrollPeriodId
  }).settlements[0];
  const pending = h.execute("requestPayrollManualAdjustment", {
    settlementId: settlement.settlementId, amountMinor: 100,
    direction: "CREDIT", category: "CORRECTION"
  }).adjustment;
  code(() => h.execute("requestPayrollManualAdjustment", {
    settlementId: settlement.settlementId, amountMinor: 200,
    direction: "DEBIT", category: "CORRECTION"
  }), "PAYROLL_ADJUSTMENT_PENDING");
  h.execute("recalculateEmployeePayrollSettlement", {
    payrollPeriodId: period.payrollPeriodId, staffId: "S1"
  });
  code(() => h.execute("approvePayrollManualAdjustment", {
    as: "approver", adjustmentId: pending.adjustmentId
  }), "PAYROLL_ADJUSTMENT_SETTLEMENT_SUPERSEDED");
});

test("locked settlement and period cannot be recalculated or adjusted", () => {
  const base = { ...direct(), settlementId: "SET", status: "LOCKED", locked: true };
  const h = harness({
    periods: [{ payrollPeriodId: "PER-1", startDate: "2026-07-01", endDate: "2026-07-01",
      status: "LOCKED", branchId: "B1" }],
    settlements: [base],
    staff: [{ staffId: "S1", staffName: "Ali", branchId: "B1", salary: "26000", active: true }]
  });
  code(() => h.execute("recalculateEmployeePayrollSettlement", {
    payrollPeriodId: "PER-1", staffId: "S1"
  }), "PAYROLL_PERIOD_LOCKED");
});

test("negative, zero, missing-reason, and locked-settlement adjustments fail", () => {
  const base = direct();
  const h = harness({
    periods: [{ payrollPeriodId: "PER-1", startDate: "2026-07-01", endDate: "2026-07-01",
      status: "LOCKED", branchId: "B1" }],
    settlements: [{ ...base, settlementId: "SET-1", status: "LOCKED", locked: true }],
    staff: [{ staffId: "S1", staffName: "Ali", branchId: "B1", salary: "26000", active: true }]
  });
  code(() => h.execute("requestPayrollManualAdjustment", {
    settlementId: "SET-1", amountMinor: 100, direction: "CREDIT", category: "X"
  }), "PAYROLL_SETTLEMENT_LOCKED");
  const unlocked = harness({
    periods: [{ payrollPeriodId: "PER-1", startDate: "2026-07-01", endDate: "2026-07-01",
      status: "CALCULATED", branchId: "B1" }],
    settlements: [{ ...base, settlementId: "SET-2", status: "CALCULATED", locked: false }],
    staff: [{ staffId: "S1", staffName: "Ali", branchId: "B1", salary: "26000", active: true }]
  });
  code(() => unlocked.execute("requestPayrollManualAdjustment", {
    settlementId: "SET-2", amountMinor: -1, direction: "CREDIT", category: "X"
  }), "PAYROLL_NEGATIVE_VALUE");
  code(() => unlocked.execute("requestPayrollManualAdjustment", {
    settlementId: "SET-2", amountMinor: 0, direction: "CREDIT", category: "X"
  }), "PAYROLL_ADJUSTMENT_AMOUNT_INVALID");
  code(() => unlocked.execute("requestPayrollManualAdjustment", {
    settlementId: "SET-2", amountMinor: 1, direction: "CREDIT", category: "X", reason: ""
  }), "PAYROLL_REASON_REQUIRED");
});

test("financial DTOs are hidden from view-only manager and preserved for payroll calculator", () => {
  const settlement = { ...direct(), settlementId: "SET", status: "CALCULATED" };
  const h = harness({
    periods: [{ payrollPeriodId: "PER-1", startDate: "2026-07-01", endDate: "2026-07-01",
      status: "CALCULATED", branchId: "B1" }],
    settlements: [settlement],
    staff: [{ staffId: "S1", staffName: "Ali", branchId: "B1", salary: "26000", active: true }]
  });
  const manager = h.execute("getEmployeePayrollSettlement", { as: "manager", settlementId: "SET" });
  assert.equal(manager.settlement.baseSalaryMinor, undefined);
  assert.equal(manager.settlement.deficitDeductionMinor, undefined);
  assert.equal(manager.settlement.grossAttendanceAdjustmentMinor, undefined);
  assert.equal(manager.settlement.netAttendanceAdjustmentMinor, undefined);
  const calculator = h.execute("getEmployeePayrollSettlement", { settlementId: "SET" });
  assert.equal(calculator.settlement.baseSalaryMinor, 2600000);
});

test("unresolved payroll blocker query returns scoped warnings without financial fields to manager", () => {
  const settlement = {
    ...direct({ days: [day("2026-07-01", { locked: false })] }),
    settlementId: "SET", status: "REVIEW_REQUIRED",
    warningsJson: JSON.stringify(["UNLOCKED_ATTENDANCE:2026-07-01"])
  };
  const h = harness({
    periods: [{ payrollPeriodId: "PER-1", startDate: "2026-07-01", endDate: "2026-07-01",
      status: "CALCULATED", branchId: "B1" }],
    settlements: [settlement],
    staff: [{ staffId: "S1", staffName: "Ali", branchId: "B1", salary: "26000", active: true }]
  });
  const result = h.execute("getUnresolvedPayrollBlockers", {
    as: "manager", payrollPeriodId: "PER-1"
  });
  assert.equal(result.blockers.length, 1);
  assert.equal(result.blockers[0].staffId, "S1");
  assert.equal(result.blockers[0].baseSalaryMinor, undefined);
});

test("nested and serialized audit secrets are filtered", () => {
  const filtered = phase4.filterSecrets({
    beforeStateJson: JSON.stringify({
      password: "secret", recoveryMarker: "internal", salaryMinor: 100, safe: "yes"
    })
  }, false);
  const serialized = JSON.stringify(filtered);
  assert.doesNotMatch(serialized, /password|secret|recovery|salaryMinor|100/);
  assert.match(serialized, /yes/);
});

test("export preview contains version, source hash, minor units, and formula-safe CSV", () => {
  const item = { ...direct(), settlementId: "SET", staffNameSnapshot: "=SUM(A1:A2)",
    status: "CALCULATED" };
  const h = harness({
    periods: [{ payrollPeriodId: "PER-1", startDate: "2026-07-01", endDate: "2026-07-01",
      status: "CALCULATED", branchId: "B1" }],
    settlements: [item],
    staff: [{ staffId: "S1", staffName: "=SUM(A1:A2)", branchId: "B1", salary: "26000", active: true }]
  });
  const result = h.execute("previewPayrollAttendanceExport", {
    payrollPeriodId: "PER-1"
  });
  assert.match(result.csv, /CALCULATION_VERSION/);
  assert.match(result.csv, /SOURCE_AGGREGATE_HASH/);
  assert.match(result.csv, /"'=SUM\(A1:A2\)"/);
});

test("CSV export neutralizes tabs, leading controls, quotes, and line breaks", () => {
  const item = {
    ...direct(), settlementId: "SET", staffNameSnapshot: "\t=CMD(\"x\")\nnext",
    staffId: "\u0000@evil", status: "CALCULATED"
  };
  const h = harness({
    periods: [{ payrollPeriodId: "PER-1", startDate: "2026-07-01", endDate: "2026-07-01",
      status: "CALCULATED", branchId: "B1" }],
    settlements: [item],
    staff: [{ staffId: "\u0000@evil", staffName: "\t=CMD(\"x\")\nnext",
      branchId: "B1", salary: "26000", active: true }]
  });
  const result = h.execute("previewPayrollAttendanceExport", {
    payrollPeriodId: "PER-1"
  });
  assert.doesNotMatch(result.csv, /[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f]/);
  assert.match(result.csv, /"'=CMD\(""x""\) next"/);
  assert.match(result.csv, /"'@evil"/);
});

test("authorized export requires a locked non-stale period", () => {
  const item = { ...direct(), settlementId: "SET", status: "CALCULATED" };
  const h = harness({
    periods: [{ payrollPeriodId: "PER-1", startDate: "2026-07-01", endDate: "2026-07-01",
      status: "CALCULATED", branchId: "B1" }],
    settlements: [item],
    staff: [{ staffId: "S1", staffName: "Ali", branchId: "B1", salary: "26000", active: true }]
  });
  code(() => h.execute("exportPayrollAttendanceReport", {
    payrollPeriodId: "PER-1"
  }), "PAYROLL_EXPORT_REQUIRES_LOCKED_PERIOD");
});

test("locked approved period produces authorized CSV and unauthorized role is denied", () => {
  const h = harness({ staff: [
    { staffId: "S1", staffName: "Ali", branchId: "B1", salary: "26000", active: true }
  ] });
  const period = h.execute("createPayrollPeriod", {
    startDate: "2026-07-01", endDate: "2026-07-01"
  }).payrollPeriod;
  h.execute("calculatePayrollPeriod", { payrollPeriodId: period.payrollPeriodId });
  h.execute("submitPayrollPeriodForReview", {
    as: "reviewer", payrollPeriodId: period.payrollPeriodId
  });
  h.execute("approvePayrollPeriod", {
    as: "approver", payrollPeriodId: period.payrollPeriodId
  });
  h.execute("lockPayrollPeriod", {
    as: "approver", payrollPeriodId: period.payrollPeriodId
  });
  const exported = h.execute("exportPayrollAttendanceReport", {
    as: "approver", payrollPeriodId: period.payrollPeriodId
  });
  assert.equal(exported.format, "CSV_UTF8");
  assert.equal(exported.rowCount, 1);
  code(() => h.execute("previewPayrollAttendanceExport", {
    as: "manager", payrollPeriodId: period.payrollPeriodId
  }), "PAYROLL_PERMISSION_DENIED");
});

for (const boundary of ["savePeriod", "saveSettlement", "appendAudit", "saveIdempotency"]) {
  test(`${boundary} failure compensates every Phase 4 business collection`, () => {
    const base = phase4.createMemoryRepository({
      staff: [{ staffId: "S1", staffName: "Ali", branchId: "B1", salary: "26000", active: true }],
      policies: [policy()], attendanceDays: [day()]
    });
    const repository = Object.create(base);
    repository[boundary] = function () {
      const caught = new Error("injected");
      caught.code = `INJECTED_${boundary.toUpperCase()}`;
      throw caught;
    };
    const h = harness({ repository });
    const action = boundary === "saveSettlement" ? "calculatePayrollPeriod" : "createPayrollPeriod";
    if (action === "calculatePayrollPeriod") {
      base.savePeriod({
        payrollPeriodId: "P", startDate: "2026-07-01", endDate: "2026-07-01",
        status: "DRAFT", branchId: "B1"
      });
      code(() => h.execute(action, { payrollPeriodId: "P" }),
        `INJECTED_${boundary.toUpperCase()}`);
      assert.equal(base.getState().settlements.length, 0);
    } else {
      code(() => h.execute(action, {
        startDate: "2026-07-01", endDate: "2026-07-01"
      }), `INJECTED_${boundary.toUpperCase()}`);
      assert.equal(base.getState().periods.length, 0);
    }
    assert.equal(base.getState().audit.length, 0);
    assert.equal(base.getState().idempotency.length, 0);
  });
}

for (const boundary of ["appendAudit", "saveIdempotency"]) {
  test(`${boundary} failure after settlement persistence rolls the full calculation back`, () => {
    const base = phase4.createMemoryRepository({
      periods: [{ payrollPeriodId: "P", startDate: "2026-07-01", endDate: "2026-07-01",
        status: "DRAFT", branchId: "B1" }],
      staff: [{ staffId: "S1", staffName: "Ali", branchId: "B1", salary: "26000", active: true }],
      policies: [policy()], attendanceDays: [day()]
    });
    const repository = Object.create(base);
    repository[boundary] = function () {
      const caught = new Error("injected");
      caught.code = `AFTER_SETTLEMENT_${boundary.toUpperCase()}`;
      throw caught;
    };
    const h = harness({ repository });
    code(() => h.execute("calculatePayrollPeriod", { payrollPeriodId: "P" }),
      `AFTER_SETTLEMENT_${boundary.toUpperCase()}`);
    const state = base.getState();
    assert.equal(state.settlements.length, 0);
    assert.equal(state.periods[0].status, "DRAFT");
    assert.equal(state.audit.length, 0);
    assert.equal(state.idempotency.length, 0);
  });
}

test("compensated failure can retry the same request without duplicate settlement", () => {
  const base = phase4.createMemoryRepository({
    periods: [{ payrollPeriodId: "P", startDate: "2026-07-01", endDate: "2026-07-01",
      status: "DRAFT", branchId: "B1" }],
    staff: [{ staffId: "S1", staffName: "Ali", branchId: "B1", salary: "26000", active: true }],
    policies: [policy()], attendanceDays: [day()]
  });
  const repository = Object.create(base);
  let fail = true;
  repository.appendAudit = function (record) {
    if (fail) {
      fail = false;
      const caught = new Error("injected"); caught.code = "RETRYABLE_FAILURE"; throw caught;
    }
    return base.appendAudit(record);
  };
  const h = harness({ repository });
  code(() => h.execute("calculatePayrollPeriod", {
    payrollPeriodId: "P", requestId: "RETRY"
  }), "RETRYABLE_FAILURE");
  const result = h.execute("calculatePayrollPeriod", {
    payrollPeriodId: "P", requestId: "RETRY"
  });
  assert.equal(result.settlements.length, 1);
  assert.equal(base.getState().settlements.length, 1);
});

test("failure after superseding the prior version restores the authoritative settlement", () => {
  const base = phase4.createMemoryRepository({
    periods: [{ payrollPeriodId: "P", startDate: "2026-07-01", endDate: "2026-07-01",
      status: "CALCULATED", branchId: "B1" }],
    settlements: [{ ...direct(), payrollPeriodId: "P",
      settlementId: "SET-1", settlementVersion: 1 }],
    staff: [{ staffId: "S1", staffName: "Ali", branchId: "B1", salary: "26000", active: true }],
    policies: [policy()], attendanceDays: [day()]
  });
  const repository = Object.create(base);
  let writes = 0;
  repository.saveSettlement = function (record) {
    writes += 1;
    if (writes === 2) {
      const caught = new Error("injected"); caught.code = "AFTER_SUPERSEDE"; throw caught;
    }
    return base.saveSettlement(record);
  };
  const h = harness({ repository });
  code(() => h.execute("recalculateEmployeePayrollSettlement", {
    payrollPeriodId: "P", staffId: "S1"
  }), "AFTER_SUPERSEDE");
  const state = base.getState();
  assert.equal(state.settlements.length, 1);
  assert.equal(state.settlements[0].settlementId, "SET-1");
  assert.notEqual(state.settlements[0].status, "SUPERSEDED");
  assert.equal(state.audit.length, 0);
  assert.equal(state.idempotency.length, 0);
});

test("adjustment audit failure rolls back append-only request and idempotency", () => {
  const base = phase4.createMemoryRepository({
    periods: [{ payrollPeriodId: "PER-1", startDate: "2026-07-01", endDate: "2026-07-01",
      status: "CALCULATED", branchId: "B1" }],
    settlements: [{ ...direct(), settlementId: "SET", settlementVersion: 1 }],
    staff: [{ staffId: "S1", staffName: "Ali", branchId: "B1", salary: "26000", active: true }],
    policies: [policy()], attendanceDays: [day()]
  });
  const repository = Object.create(base);
  repository.appendAudit = function () {
    const caught = new Error("injected"); caught.code = "ADJUSTMENT_AUDIT_FAILURE"; throw caught;
  };
  const h = harness({ repository });
  code(() => h.execute("requestPayrollManualAdjustment", {
    settlementId: "SET", amountMinor: 100, direction: "CREDIT", category: "CORRECTION"
  }), "ADJUSTMENT_AUDIT_FAILURE");
  const state = base.getState();
  assert.equal(state.adjustments.length, 0);
  assert.equal(state.audit.length, 0);
  assert.equal(state.idempotency.length, 0);
});

test("adjustment append failure leaves no audit or idempotency residue", () => {
  const base = phase4.createMemoryRepository({
    periods: [{ payrollPeriodId: "PER-1", startDate: "2026-07-01", endDate: "2026-07-01",
      status: "CALCULATED", branchId: "B1" }],
    settlements: [{ ...direct(), settlementId: "SET", settlementVersion: 1 }],
    staff: [{ staffId: "S1", staffName: "Ali", branchId: "B1", salary: "26000", active: true }],
    policies: [policy()], attendanceDays: [day()]
  });
  const repository = Object.create(base);
  repository.appendAdjustment = function () {
    const caught = new Error("injected"); caught.code = "ADJUSTMENT_APPEND_FAILURE"; throw caught;
  };
  const h = harness({ repository });
  code(() => h.execute("requestPayrollManualAdjustment", {
    settlementId: "SET", amountMinor: 100, direction: "CREDIT", category: "CORRECTION"
  }), "ADJUSTMENT_APPEND_FAILURE");
  assert.equal(base.getState().adjustments.length, 0);
  assert.equal(base.getState().audit.length, 0);
  assert.equal(base.getState().idempotency.length, 0);
});

test("lock settlement-write failure rolls period and settlements back to approved", () => {
  const base = phase4.createMemoryRepository({
    periods: [{ payrollPeriodId: "PER-1", startDate: "2026-07-01", endDate: "2026-07-01",
      status: "APPROVED", branchId: "B1" }],
    settlements: [{ ...direct({ period: {
      payrollPeriodId: "PER-1", startDate: "2026-07-01", endDate: "2026-07-01",
      scopeType: "BRANCH", branchId: "B1"
    }}), settlementId: "SET", settlementVersion: 1,
      status: "APPROVED", locked: false }],
    staff: [{ staffId: "S1", staffName: "Ali", branchId: "B1", salary: "26000", active: true }],
    policies: [policy()], attendanceDays: [day()]
  });
  const repository = Object.create(base);
  repository.saveSettlement = function () {
    const caught = new Error("injected"); caught.code = "LOCK_SETTLEMENT_FAILURE"; throw caught;
  };
  const h = harness({ repository });
  code(() => h.execute("lockPayrollPeriod", {
    as: "approver", payrollPeriodId: "PER-1"
  }), "LOCK_SETTLEMENT_FAILURE");
  assert.equal(base.getPeriod("PER-1").status, "APPROVED");
  assert.equal(base.getSettlement("SET").status, "APPROVED");
  assert.equal(base.getSettlement("SET").locked, false);
});

test("reopen audit failure restores the locked period and settlement", () => {
  const base = phase4.createMemoryRepository({
    periods: [{ payrollPeriodId: "PER-1", startDate: "2026-07-01", endDate: "2026-07-01",
      status: "LOCKED", branchId: "B1" }],
    settlements: [{ ...direct(), settlementId: "SET", settlementVersion: 1,
      status: "LOCKED", locked: true }],
    staff: [{ staffId: "S1", staffName: "Ali", branchId: "B1", salary: "26000", active: true }],
    policies: [policy()], attendanceDays: [day()]
  });
  const repository = Object.create(base);
  repository.appendAudit = function () {
    const caught = new Error("injected"); caught.code = "REOPEN_AUDIT_FAILURE"; throw caught;
  };
  const h = harness({ repository });
  code(() => h.execute("reopenPayrollPeriod", {
    as: "reopener", payrollPeriodId: "PER-1"
  }), "REOPEN_AUDIT_FAILURE");
  assert.equal(base.getPeriod("PER-1").status, "LOCKED");
  assert.equal(base.getSettlement("SET").status, "LOCKED");
  assert.equal(base.getSettlement("SET").locked, true);
});

test("export audit failure produces no completed idempotency or export evidence", () => {
  const locked = {
    ...direct(), settlementId: "SET", settlementVersion: 1,
    status: "LOCKED", locked: true
  };
  const base = phase4.createMemoryRepository({
    periods: [{ payrollPeriodId: "PER-1", startDate: "2026-07-01", endDate: "2026-07-01",
      status: "LOCKED", branchId: "", calculationVersion: phase4.VERSION }],
    settlements: [locked],
    staff: [{ staffId: "S1", staffName: "Ali", branchId: "B1", salary: "26000", active: true }],
    policies: [policy()], attendanceDays: [day()]
  });
  const repository = Object.create(base);
  repository.appendAudit = function () {
    const caught = new Error("injected"); caught.code = "EXPORT_AUDIT_FAILURE"; throw caught;
  };
  const h = harness({ repository });
  code(() => h.execute("exportPayrollAttendanceReport", {
    as: "owner", payrollPeriodId: "PER-1"
  }), "EXPORT_AUDIT_FAILURE");
  assert.equal(base.getState().audit.length, 0);
  assert.equal(base.getState().idempotency.length, 0);
});

test("migration preview is zero-write and blocks staging and production", () => {
  const identity = {
    environment: "development", expectedSpreadsheetId: "X",
    actualSpreadsheetId: "X", environmentReviewApproved: true
  };
  const preview = phase4.planMigration({}, identity);
  assert.equal(preview.writes, 0);
  assert.equal(preview.rollback.historicalRowsTouched, 0);
  assert.equal(preview.executionAllowed, false);
  assert.deepEqual(phase4.planMigration({}, identity), preview);
  const complete = phase4.planMigration(schema.SHEET_SCHEMAS, identity);
  assert.equal(complete.writes, 0);
  assert.ok(complete.unchangedSheets.includes("PAYROLL_ATTENDANCE_PERIODS"));
  const partial = phase4.planMigration({
    PAYROLL_ATTENDANCE_PERIODS:
      schema.SHEET_SCHEMAS.PAYROLL_ATTENDANCE_PERIODS.slice(0, 3)
  }, identity);
  assert.deepEqual(partial.appendColumns.PAYROLL_ATTENDANCE_PERIODS,
    schema.SHEET_SCHEMAS.PAYROLL_ATTENDANCE_PERIODS.slice(3));
  const duplicate = phase4.planMigration({
    PAYROLL_ATTENDANCE_PERIODS: ["PAYROLL_PERIOD_ID", "payroll-period-id"]
  }, identity);
  assert.ok(duplicate.errors.some(item => item.code === "DUPLICATE_HEADERS"));
  for (const environment of ["staging", "production"]) {
    const blocked = phase4.planMigration({}, { ...identity, environment });
    assert.ok(blocked.errors.some(item => item.code === "PHASE4_ENVIRONMENT_BLOCKED"));
  }
});

test("legacy payroll rows are classified read-only and ambiguous IDs never activate", () => {
  const headers = [
    "SETTLEMENT_ID", "STAFF_ID", "STAFF_NAME", "PERIOD_START",
    "PERIOD_END", "DEFICIT_VALUE", "UNKNOWN_LEGACY"
  ];
  const records = phase4.normalizeLegacyPayrollRows(headers, [
    ["OLD-1", "S1", "Ali", "2026-06-01", "2026-06-30", 100, "keep"],
    ["OLD-1", "S1", "Ali", "2026-06-01", "2026-06-30", 100, "keep"],
    ["", "", "", "", "", "", ""]
  ]);
  assert.equal(records.length, 2);
  assert.ok(records.every(item => item.readOnly));
  assert.ok(records.every(item => item.compatibilityStatus === "LEGACY_AMBIGUOUS"));
  assert.ok(records[0].unknownColumns.includes("UNKNOWN_LEGACY"));
});

test("duplicate normalized legacy payroll headers fail explicitly", () => {
  code(() => phase4.normalizeLegacyPayrollRows(
    ["SETTLEMENT_ID", "staff id", "STAFF-ID"], [["A", "S1", "S1"]]
  ), "PAYROLL_LEGACY_DUPLICATE_HEADERS");
});

test("legacy malformed, negative, and ambiguous-currency money remains read-only and flagged", () => {
  const headers = [
    "SETTLEMENT_ID", "STAFF_ID", "CURRENCY",
    "DEFICIT_VALUE", "MANUAL_ADJUSTMENTS_MINOR"
  ];
  const [malformed, negative, currency] = phase4.normalizeLegacyPayrollRows(headers, [
    ["A", "S1", "EGP", "not-money", 100],
    ["B", "S2", "EGP", "-1.00", -5],
    ["C", "S3", "USD", "1.00", 100]
  ]);
  assert.ok(malformed.issues.includes("MALFORMED_MONEY:DEFICIT_VALUE"));
  assert.ok(negative.issues.includes("NEGATIVE_MONEY:DEFICIT_VALUE"));
  assert.ok(negative.issues.includes("NEGATIVE_MONEY:MANUAL_ADJUSTMENTS_MINOR"));
  assert.ok(currency.issues.includes("UNSUPPORTED_CURRENCY"));
  assert.ok([malformed, negative, currency].every((item) => item.readOnly));
});

test("Phase 4 bundle is exact, ordered, CommonJS-free at runtime, and loadable", () => {
  assert.deepEqual(SOURCE_ORDER.slice(-2), [
    "staff-payroll-attendance-phase4.js",
    "staff-payroll-attendance-phase4-gas.js"
  ]);
  const generated = buildBundle({ write: false }).bundle;
  const stored = fs.readFileSync(path.join(ROOT,
    "scripts/staff-payroll-attendance-phase4-apps-script-bundle.gs"), "utf8");
  assert.equal(stored, generated);
  const context = vm.createContext({});
  vm.runInContext(generated, context);
  assert.ok(context.StaffPayrollAttendancePhase4);
  assert.equal(typeof context.handleStaffPayrollAttendancePhase4Action, "function");
});

test("GAS recovery marker is removed on success and retained only for failed compensation", () => {
  const stored = buildBundle({ write: false }).bundle;
  const values = new Map();
  const context = vm.createContext({
    PropertiesService: {
      getScriptProperties() {
        return {
          setProperty(key, value) { values.set(key, value); },
          deleteProperty(key) { values.delete(key); }
        };
      }
    },
    Utilities: {
      formatDate() { return "2026-07-30T10:00:00+03:00"; }
    }
  });
  vm.runInContext(stored, context);
  context.schedulePhase2RollbackTransaction = () => [];
  assert.equal(context.payrollAttendancePhase4WithTransaction({
    action: "TEST", requestId: "OK", actorId: "A"
  }, () => 42), 42);
  assert.equal(values.has("PAYROLL_ATTENDANCE_RECOVERY_OK"), false);
  context.schedulePhase2RollbackTransaction = () => [{ type: "APPEND" }];
  assert.throws(() => context.payrollAttendancePhase4WithTransaction({
    action: "TEST", requestId: "FAIL", actorId: "A"
  }, () => { throw new Error("business failure"); }), caught =>
    caught.code === "PAYROLL_COMPENSATION_FAILED" &&
    caught.details && caught.details.recoverable === true);
  assert.equal(values.has("PAYROLL_ATTENDANCE_RECOVERY_FAIL"), true);
});

test("GAS payroll staff reader rejects missing and duplicate stable IDs", () => {
  const context = vm.createContext({});
  vm.runInContext(buildBundle({ write: false }).bundle, context);
  context.schedulePhase2Headers = () => [
    "NAME", "CODE", "SALARY", "PERCENTAGE", "STAFF_ID", "BONUS",
    "DEDUCTION", "ACTIVE", "CREATED_AT", "UPDATED_AT", "IS_BARBER"
  ];
  context.schedulePhase2AssertNoDuplicateHeaders = () => {};
  let rows = [["Ali", "", 26000, "", "", "", "", "TRUE", "", "", "TRUE"]];
  context.schedulePhase2Sheet = () => ({
    getLastRow: () => rows.length + 1,
    getLastColumn: () => 11,
    getRange: () => ({ getValues: () => rows })
  });
  assert.throws(() => context.payrollAttendancePhase4ReadStaff(),
    caught => caught.code === "PAYROLL_STAFF_ID_REQUIRED");
  rows = [
    ["Ali", "", 26000, "", "S1", "", "", "TRUE", "", "", "TRUE"],
    ["Mona", "", 20000, "", "S1", "", "", "TRUE", "", "", "TRUE"]
  ];
  assert.throws(() => context.payrollAttendancePhase4ReadStaff(),
    caught => caught.code === "PAYROLL_STAFF_ID_AMBIGUOUS");
});

test("active migration handler blocks staging and production before actor or spreadsheet access", () => {
  for (const environment of ["staging", "production"]) {
    let actorCalls = 0;
    let spreadsheetCalls = 0;
    const context = vm.createContext({
      getCutHubEnvironmentConfig: () => ({ environment, spreadsheetId: "X" }),
      schedulePhase2Actor: () => { actorCalls += 1; return { owner: true }; },
      SpreadsheetApp: {
        getActive() { spreadsheetCalls += 1; throw new Error("must not access"); }
      },
      jsonOutput: (value) => value
    });
    vm.runInContext(buildBundle({ write: false }).bundle, context);
    const result = context.handleStaffPayrollAttendancePhase4Action({
      action: "previewPayrollPhase4Migration"
    });
    assert.equal(result.code, "PHASE4_ENVIRONMENT_BLOCKED");
    assert.equal(actorCalls, 0);
    assert.equal(spreadsheetCalls, 0);
  }
});

test("active router exposes Phase 4 before Phase 3 and legacy deductions remain excluded", () => {
  const source = fs.readFileSync(path.join(ROOT, "scripts/app-script-final-owner-access.js"), "utf8");
  const phase4Index = source.indexOf("handleStaffPayrollAttendancePhase4Action");
  const phase3Index = source.indexOf("handleStaffAttendancePhase3Action");
  assert.ok(phase4Index > 0 && phase4Index < phase3Index);
  assert.match(source, /ATTENDANCE_LEGACY_PATH_DISABLED/);
});

test("Phase 4 UI is Arabic RTL, permission wired, text-safe, and includes lifecycle/export controls", () => {
  const html = fs.readFileSync(path.join(ROOT, "public/pages/payroll-attendance.html"), "utf8");
  const js = fs.readFileSync(path.join(ROOT, "public/assets/js/pages/payroll-attendance.js"), "utf8");
  const layout = fs.readFileSync(path.join(ROOT, "public/assets/js/utils/layout.js"), "utf8");
  assert.match(html, /lang="ar" dir="rtl"/);
  assert.match(html, /calculateBtn/);
  assert.match(html, /exportPreviewBtn/);
  assert.match(js, /payroll_attendance\.view/);
  assert.match(js, /sourceAttendanceSnapshot/);
  assert.match(js, /getUnresolvedPayrollBlockers/);
  assert.match(js, /recalculatePayrollPeriod/);
  assert.doesNotMatch(js, /\.innerHTML\s*=/);
  assert.doesNotMatch(html, /\son[a-z]+=/i);
  assert.match(layout, /payroll-attendance\.html/);
});

test("Phase 4 source has no Booking Availability, payment execution, or external provider integration", () => {
  const source = [
    "scripts/staff-payroll-attendance-phase4.js",
    "scripts/staff-payroll-attendance-phase4-gas.js",
    "public/assets/js/pages/payroll-attendance.js"
  ].map(file => fs.readFileSync(path.join(ROOT, file), "utf8")).join("\n");
  assert.doesNotMatch(source, /createBooking|booking availability|cancelBooking|slot generation/i);
  assert.doesNotMatch(source, /bank transfer|payment provider|executePayment|payroll provider/i);
});
