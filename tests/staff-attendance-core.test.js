const test = require("node:test");
const assert = require("node:assert/strict");

const core = require("../scripts/staff-attendance-core");
const schema = require("../scripts/staff-attendance-schema");

function day(overrides = {}) {
  return {
    date: "2026-07-29",
    scheduledStart: "09:00",
    scheduledEnd: "17:00",
    requiredWorkMinutes: 480,
    checkIn: "09:00",
    checkOut: "17:00",
    breaks: [],
    policy: {},
    ...overrides
  };
}

function event(type, overrides = {}) {
  return {
    type,
    timestamp: "2026-07-29T09:00:00+03:00",
    actorId: "user-1",
    actorStaffId: "staff-1",
    actorName: "Test User",
    actorRole: "STAFF",
    permission: "attendance.self_action",
    requestId: `req-${type}`,
    ...overrides
  };
}

test("schema exposes all six required separated models plus break and audit support", () => {
  for (const name of [
    "BARBER_SCHEDULE", "STAFF_SCHEDULE_OVERRIDES", "ATTENDANCE",
    "STAFF_WORK_POLICIES", "ATTENDANCE_ADJUSTMENTS",
    "PAYROLL_ATTENDANCE_SETTLEMENTS"
  ]) assert.ok(schema.SHEET_SCHEMAS[name]);
  assert.ok(schema.SHEET_SCHEMAS.ATTENDANCE_EVENTS);
  assert.ok(schema.SHEET_SCHEMAS.STAFF_LEAVE_LEDGER);
  assert.ok(schema.SHEET_SCHEMAS.ATTENDANCE_OVERTIME_APPROVALS);
  assert.ok(schema.SHEET_SCHEMAS.STAFF_ATTENDANCE_AUDIT);
});

test("every proposed schema has unique headers and preserves legacy column prefixes", () => {
  for (const [name, headers] of Object.entries(schema.SHEET_SCHEMAS)) {
    assert.equal(new Set(headers).size, headers.length, `${name} contains duplicate headers`);
  }
  assert.deepEqual(
    schema.SHEET_SCHEMAS.ATTENDANCE.slice(0, schema.LEGACY_ATTENDANCE_HEADERS.length),
    [...schema.LEGACY_ATTENDANCE_HEADERS]
  );
  assert.deepEqual(
    schema.SHEET_SCHEMAS.BARBER_SCHEDULE.slice(0, schema.LEGACY_SCHEDULE_HEADERS.length),
    [...schema.LEGACY_SCHEDULE_HEADERS]
  );
});

test("eight-hour shift calculates exact raw minutes", () => {
  const result = core.calculateDailyAttendance(day());
  assert.equal(result.presenceMinutesRaw, 480);
  assert.equal(result.workedMinutesRaw, 480);
  assert.equal(result.deficitMinutesRaw, 0);
  assert.equal(result.rawOvertimeMinutesRaw, 0);
});

test("ten-hour shift supports a ten-hour requirement", () => {
  const result = core.calculateDailyAttendance(day({
    scheduledEnd: "19:00", checkOut: "19:00", requiredWorkMinutes: 600
  }));
  assert.equal(result.workedMinutesRaw, 600);
  assert.equal(result.deficitMinutesRaw, 0);
});

test("unpaid break reduces credited work", () => {
  const result = core.calculateDailyAttendance(day({
    breaks: [{ start: "13:00", end: "14:00" }],
    requiredWorkMinutes: 420,
    policy: { allowedBreakMinutes: 60, breakPaymentType: "UNPAID" }
  }));
  assert.equal(result.workedMinutesRaw, 420);
  assert.equal(result.creditedWorkMinutesRaw, 420);
});

test("paid break credits only the configured allowance", () => {
  const result = core.calculateDailyAttendance(day({
    breaks: [{ start: "13:00", end: "14:00" }],
    policy: { allowedBreakMinutes: 60, breakPaymentType: "PAID" }
  }));
  assert.equal(result.workedMinutesRaw, 420);
  assert.equal(result.paidBreakCreditMinutesRaw, 60);
  assert.equal(result.creditedWorkMinutesRaw, 480);
  assert.equal(result.deficitMinutesRaw, 0);
});

test("excess paid break contributes to deficit exactly once", () => {
  const result = core.calculateDailyAttendance(day({
    breaks: [{ start: "12:30", end: "14:00" }],
    policy: { allowedBreakMinutes: 60, breakPaymentType: "PAID" }
  }));
  assert.equal(result.excessBreakMinutesRaw, 30);
  assert.equal(result.deficitMinutesRaw, 30);
  assert.equal(result.lateMinutesRaw, 0);
});

test("late arrival is diagnostic and does not double-count deficit", () => {
  const result = core.calculateDailyAttendance(day({ checkIn: "09:30" }));
  assert.equal(result.lateMinutesRaw, 30);
  assert.equal(result.deficitMinutesRaw, 30);
});

test("early departure is diagnostic and does not double-count deficit", () => {
  const result = core.calculateDailyAttendance(day({ checkOut: "16:30" }));
  assert.equal(result.earlyLeaveMinutesRaw, 30);
  assert.equal(result.deficitMinutesRaw, 30);
});

test("late arrival plus early departure produces one 60-minute deficit", () => {
  const result = core.calculateDailyAttendance(day({ checkIn: "09:30", checkOut: "16:30" }));
  assert.equal(result.lateMinutesRaw, 30);
  assert.equal(result.earlyLeaveMinutesRaw, 30);
  assert.equal(result.deficitMinutesRaw, 60);
});

test("multiple breaks are summed", () => {
  const result = core.calculateDailyAttendance(day({
    breaks: [{ start: "11:00", end: "11:15" }, { start: "14:00", end: "14:30" }],
    requiredWorkMinutes: 435
  }));
  assert.equal(result.actualBreakMinutesRaw, 45);
  assert.equal(result.workedMinutesRaw, 435);
});

test("open breaks are rejected for final calculation", () => {
  assert.throws(
    () => core.calculateDailyAttendance(day({ breaks: [{ start: "13:00" }] })),
    (error) => error.code === "OPEN_BREAK"
  );
});

test("overlapping breaks are rejected", () => {
  assert.throws(() => core.calculateDailyAttendance(day({
    breaks: [{ start: "12:00", end: "13:00" }, { start: "12:30", end: "13:30" }]
  })), (error) => error.code === "OVERLAPPING_BREAKS");
});

test("breaks outside presence are rejected", () => {
  assert.throws(() => core.calculateDailyAttendance(day({
    breaks: [{ start: "08:30", end: "09:15" }]
  })), (error) => error.code === "BREAK_OUTSIDE_PRESENCE");
});

test("maximum single break is enforced", () => {
  assert.throws(() => core.calculateDailyAttendance(day({
    breaks: [{ start: "12:00", end: "13:01" }],
    policy: { maximumSingleBreakMinutes: 60 }
  })), (error) => error.code === "BREAK_TOO_LONG");
});

test("overnight shifts use a civil timeline without browser timezone parsing", () => {
  const result = core.calculateDailyAttendance(day({
    scheduledStart: "22:00", scheduledEnd: "06:00",
    checkIn: "22:00", checkOut: "06:00",
    breaks: [{ start: "02:00", end: "02:30" }],
    requiredWorkMinutes: 450
  }));
  assert.equal(result.presenceMinutesRaw, 480);
  assert.equal(result.workedMinutesRaw, 450);
});

test("multiple attendance sessions sum presence without counting the gap", () => {
  const result = core.calculateDailyAttendance(day({
    sessions: [
      { checkIn: "09:00", checkOut: "13:00" },
      { checkIn: "14:00", checkOut: "18:00" }
    ],
    checkIn: undefined,
    checkOut: undefined
  }));
  assert.equal(result.presenceMinutesRaw, 480);
  assert.equal(result.attendanceSessions.length, 2);
  assert.equal(result.deficitMinutesRaw, 0);
});

test("overlapping attendance sessions are rejected", () => {
  assert.throws(() => core.calculateDailyAttendance(day({
    sessions: [
      { checkIn: "09:00", checkOut: "13:00" },
      { checkIn: "12:30", checkOut: "17:00" }
    ]
  })), (error) => error.code === "OVERLAPPING_ATTENDANCE_SESSIONS");
});

test("a break in the gap between sessions is rejected", () => {
  assert.throws(() => core.calculateDailyAttendance(day({
    sessions: [
      { checkIn: "09:00", checkOut: "13:00" },
      { checkIn: "14:00", checkOut: "18:00" }
    ],
    breaks: [{ start: "13:15", end: "13:45" }]
  })), (error) => error.code === "BREAK_OUTSIDE_PRESENCE");
});

test("equal interval endpoints are rejected instead of becoming 24 hours", () => {
  assert.throws(() => core.calculateDailyAttendance(day({
    checkIn: "09:00", checkOut: "09:00"
  })), (error) => error.code === "ZERO_DURATION_INTERVAL");
  assert.throws(() => core.normalizeInterval("2026-07-29", "09:00", "09:00"),
    (error) => error.code === "ZERO_DURATION_INTERVAL");
});

test("calendar parsing rejects rollover dates and remains timezone independent", () => {
  assert.equal(core.parseDateKey("2024-02-29").text, "2024-02-29");
  assert.throws(() => core.parseDateKey("2026-02-29"), (error) => error.code === "INVALID_DATE");
});

test("explicit-offset attendance instants preserve elapsed minutes across a DST offset change", () => {
  const result = core.calculateDailyAttendance(day({
    scheduledStart: "23:00",
    scheduledEnd: "07:00",
    requiredWorkMinutes: 420,
    checkIn: undefined,
    checkOut: undefined,
    checkInAt: "2026-04-23T23:00:00+02:00",
    checkOutAt: "2026-04-24T07:00:00+03:00"
  }));
  assert.equal(result.presenceMinutesRaw, 420);
  assert.equal(result.deficitMinutesRaw, 0);
});

test("instant-based breaks use elapsed time and must remain inside one session", () => {
  const result = core.calculateDailyAttendance(day({
    requiredWorkMinutes: 420,
    checkIn: undefined,
    checkOut: undefined,
    checkInAt: "2026-07-29T09:00:00+03:00",
    checkOutAt: "2026-07-29T17:00:00+03:00",
    breaks: [{
      startedAt: "2026-07-29T13:00:00+03:00",
      endedAt: "2026-07-29T14:00:00+03:00"
    }]
  }));
  assert.equal(result.actualBreakMinutesRaw, 60);
  assert.equal(result.workedMinutesRaw, 420);
});

test("grace periods zero small late and early diagnostics", () => {
  const result = core.calculateDailyAttendance(day({
    checkIn: "09:05", checkOut: "16:55",
    policy: { graceLateMinutes: 5, graceEarlyLeaveMinutes: 5 }
  }));
  assert.equal(result.lateMinutesRaw, 0);
  assert.equal(result.earlyLeaveMinutesRaw, 0);
  assert.equal(result.deficitMinutesRaw, 0);
});

test("paid-break grace does not create a hidden deficit", () => {
  const result = core.calculateDailyAttendance(day({
    breaks: [{ start: "12:00", end: "13:05" }],
    policy: {
      breakPaymentType: "PAID", allowedBreakMinutes: 60,
      breakGraceMinutes: 5, excessBreakContributesToDeficit: true
    }
  }));
  assert.equal(result.excessBreakMinutesRaw, 0);
  assert.equal(result.deficitMinutesRaw, 0);
});

test("rounding preserves raw values and rounds reported values", () => {
  const result = core.calculateDailyAttendance(day({
    checkOut: "16:53",
    policy: { roundingIncrementMinutes: 15, roundingMode: "CEIL" }
  }));
  assert.equal(result.deficitMinutesRaw, 7);
  assert.equal(result.deficitMinutes, 15);
});

test("fixed late penalty and proportional deficit use separate values", () => {
  assert.equal(core.calculateDeficitValue({
    approvedDeficitMinutes: 30,
    deficitRatePerHour: 120,
    fixedLatePenalty: 10
  }), 70);
});

test("daily deduction cap is applied", () => {
  assert.equal(core.calculateDeficitValue({
    approvedDeficitMinutes: 600,
    deficitRatePerHour: 100,
    dailyMaximumDeduction: 250
  }), 250);
});

test("weekly day off never consumes leave allowance", () => {
  const result = core.calculateLeaveAllowance({
    allowedLeaveDays: 4,
    entries: [{ type: "DAY_OFF" }, { type: "APPROVED_LEAVE" }]
  });
  assert.equal(result.chargeableAbsenceDays, 1);
});

test("exact monthly allowance creates no excess absence", () => {
  const result = core.calculateLeaveAllowance({
    allowedLeaveDays: 4,
    entries: Array.from({ length: 4 }, () => ({ type: "APPROVED_LEAVE" }))
  });
  assert.equal(result.usedAllowanceDays, 4);
  assert.equal(result.excessAbsenceDays, 0);
});

test("one absence beyond a four-day allowance is one excess day", () => {
  const result = core.calculateLeaveAllowance({
    allowedLeaveDays: 4,
    entries: Array.from({ length: 5 }, () => ({ type: "ABSENT" }))
  });
  assert.equal(result.excessAbsenceDays, 1);
});

test("two-times excess absence multiplier produces the required 800 example", () => {
  assert.equal(core.calculateExcessAbsenceDeduction({
    policy: "DAY_VALUE_MULTIPLIER",
    excessAbsenceDays: 1,
    dayValue: 400,
    multiplier: 2
  }), 800);
});

test("fixed excess-absence amount is calculated per actual day", () => {
  assert.equal(core.calculateExcessAbsenceDeduction({
    policy: "FIXED_AMOUNT_PER_DAY",
    excessAbsenceDays: 1.5,
    fixedAmountPerDay: 300
  }), 450);
});

test("working-hours excess absence supports fractional minutes", () => {
  assert.equal(core.calculateExcessAbsenceDeduction({
    policy: "WORKING_HOURS_BASED",
    excessAbsenceMinutes: 240,
    deficitRatePerHour: 100,
    multiplier: 1.5
  }), 600);
});

test("partial-day leave is converted to a fractional day", () => {
  const result = core.calculateLeaveAllowance({
    allowedLeaveDays: 1,
    entries: [{ type: "PARTIAL_ABSENCE", minutes: 240, requiredDailyMinutes: 480 }]
  });
  assert.equal(result.chargeableAbsenceDays, 0.5);
});

test("hire-date proration is explicit", () => {
  const result = core.calculateLeaveAllowance({
    allowedLeaveDays: 4,
    prorationFactor: 0.5,
    entries: []
  });
  assert.equal(result.allowedLeaveDays, 2);
});

test("employment-date proration derives an inclusive period factor", () => {
  const result = core.calculateEmploymentProration({
    periodStart: "2026-07-01", periodEnd: "2026-07-31", hireDate: "2026-07-17"
  });
  assert.equal(result.periodDays, 31);
  assert.equal(result.employedDays, 15);
  assert.equal(result.prorationFactor, 0.483871);
});

test("termination-date proration excludes days after termination", () => {
  const result = core.calculateEmploymentProration({
    periodStart: "2026-07-01", periodEnd: "2026-07-31", terminationDate: "2026-07-10"
  });
  assert.equal(result.employedDays, 10);
  assert.equal(result.prorationFactor, 0.322581);
});

test("paid, unpaid, sick, emergency, and unauthorized absence types remain distinct", () => {
  const result = core.calculateLeaveAllowance({
    allowedLeaveDays: 10,
    consumingLeaveTypes: [
      "APPROVED_LEAVE", "UNPAID_LEAVE", "SICK_LEAVE", "EMERGENCY_LEAVE", "ABSENT"
    ],
    entries: [
      { type: "APPROVED_LEAVE" },
      { type: "UNPAID_LEAVE" },
      { type: "SICK_LEAVE" },
      { type: "EMERGENCY_LEAVE" },
      { type: "ABSENT" },
      { type: "DAY_OFF" }
    ]
  });
  assert.equal(result.chargeableAbsenceDays, 5);
});

test("leave reset keys separate months and validate custom payroll periods", () => {
  assert.equal(core.resolveLeavePeriodKey({ date: "2026-07-29", resetPeriod: "MONTHLY" }), "2026-07");
  assert.equal(core.resolveLeavePeriodKey({
    date: "2026-07-29", resetPeriod: "CUSTOM_PAYROLL_PERIOD",
    periodStart: "2026-07-15", periodEnd: "2026-08-14"
  }), "2026-07-15/2026-08-14");
  assert.throws(() => core.resolveLeavePeriodKey({
    date: "2026-07-01", resetPeriod: "PAYROLL_PERIOD",
    periodStart: "2026-07-15", periodEnd: "2026-08-14"
  }), (error) => error.code === "DATE_OUTSIDE_LEAVE_PERIOD");
});

test("carry forward is capped", () => {
  const result = core.calculateLeaveAllowance({
    allowedLeaveDays: 4,
    carryForwardEnabled: true,
    carriedDays: 3,
    maximumCarryForwardDays: 1
  });
  assert.equal(result.allowedLeaveDays, 5);
});

test("leave corrections use compensating credits without rewriting original usage", () => {
  const result = core.calculateLeaveAllowance({
    allowedLeaveDays: 4,
    entries: [
      { type: "APPROVED_LEAVE", direction: "DEBIT", fraction: 1, status: "APPROVED" },
      { type: "APPROVED_LEAVE", direction: "CREDIT", fraction: 1, status: "APPROVED" }
    ]
  });
  assert.equal(result.chargeableAbsenceDays, 0);
});

test("OFFSET_DEFICIT_ONLY offsets deficit and never pays a remainder", () => {
  const result = core.settleOvertime({
    mode: "OFFSET_DEFICIT_ONLY", deficitMinutes: 60, approvedOvertimeMinutes: 120,
    approved: true, deficitRatePerHour: 100, overtimeRatePerHour: 100
  });
  assert.equal(result.deficitValue, 0);
  assert.equal(result.overtimeValue, 0);
});

test("OFFSET_THEN_PAY pays value remaining after deficit", () => {
  const result = core.settleOvertime({
    mode: "OFFSET_THEN_PAY", deficitMinutes: 60, approvedOvertimeMinutes: 120,
    approved: true, deficitRatePerHour: 100, overtimeRatePerHour: 100
  });
  assert.equal(result.offsetValue, 100);
  assert.equal(result.overtimeValue, 100);
});

test("PAY_ALL_OVERTIME_SEPARATELY preserves both ledgers", () => {
  const result = core.settleOvertime({
    mode: "PAY_ALL_OVERTIME_SEPARATELY", deficitMinutes: 60, approvedOvertimeMinutes: 120,
    approved: true, deficitRatePerHour: 100, overtimeRatePerHour: 100
  });
  assert.equal(result.deficitValue, 100);
  assert.equal(result.overtimeValue, 200);
  assert.equal(result.netValue, 100);
});

test("settlement monetary arithmetic exposes exact integer minor units", () => {
  const result = core.settleOvertime({
    mode: "PAY_ALL_OVERTIME_SEPARATELY",
    deficitMinutes: 60,
    approvedOvertimeMinutes: 60,
    approved: true,
    deficitRatePerHour: 0.1,
    overtimeRatePerHour: 0.2
  });
  assert.equal(Number.isInteger(result.grossDeficitValueMinor), true);
  assert.equal(Number.isInteger(result.grossOvertimeValueMinor), true);
  assert.equal(result.grossDeficitValueMinor, 10);
  assert.equal(result.grossOvertimeValueMinor, 20);
});

test("NO_OVERTIME records no monetary overtime", () => {
  const result = core.settleOvertime({
    mode: "NO_OVERTIME", deficitMinutes: 0, approvedOvertimeMinutes: 120,
    approved: true, deficitRatePerHour: 100, overtimeRatePerHour: 100
  });
  assert.equal(result.grossOvertimeValue, 0);
  assert.equal(result.overtimeValue, 0);
});

test("unapproved overtime has zero approved minutes", () => {
  const result = core.settleOvertime({
    mode: "PAY_ALL_OVERTIME_SEPARATELY", approvedOvertimeMinutes: 120,
    approved: false, overtimeRatePerHour: 100
  });
  assert.equal(result.approvedOvertimeMinutes, 0);
});

test("daily and period overtime caps are both enforced", () => {
  const result = core.settleOvertime({
    mode: "PAY_ALL_OVERTIME_SEPARATELY", approvedOvertimeMinutes: 300,
    approved: true, overtimeRatePerHour: 60, dailyCapMinutes: 180, periodCapMinutes: 120
  });
  assert.equal(result.approvedOvertimeMinutes, 120);
});

test("daily overtime cap is applied to each day before the period cap", () => {
  const result = core.settleOvertime({
    mode: "PAY_ALL_OVERTIME_SEPARATELY",
    dailyApprovedOvertimeMinutes: [200, 200],
    approved: true,
    overtimeRatePerHour: 60,
    dailyCapMinutes: 120,
    periodCapMinutes: 210
  });
  assert.equal(result.approvedOvertimeMinutes, 210);
});

test("overtime monetary multiplier is applied after approval", () => {
  const result = core.settleOvertime({
    mode: "PAY_ALL_OVERTIME_SEPARATELY",
    approvedOvertimeMinutes: 60,
    approved: true,
    overtimeRatePerHour: 100,
    overtimeMultiplier: 1.5
  });
  assert.equal(result.grossOvertimeValue, 150);
});

test("minimum overtime threshold is enforced", () => {
  const result = core.settleOvertime({
    mode: "PAY_ALL_OVERTIME_SEPARATELY", approvedOvertimeMinutes: 14,
    approved: true, overtimeRatePerHour: 60, minimumThresholdMinutes: 15
  });
  assert.equal(result.approvedOvertimeMinutes, 0);
});

test("all day-value methods are explicit", () => {
  assert.equal(core.calculateDayValue({ method: "FIXED_DAY_VALUE", fixedDayValue: 400 }), 400);
  assert.equal(core.calculateDayValue({
    method: "MONTHLY_SALARY_DIVIDED_BY_CALENDAR_DAYS", monthlySalary: 3100, calendarDays: 31
  }), 100);
  assert.equal(core.calculateDayValue({
    method: "MONTHLY_SALARY_DIVIDED_BY_WORKING_DAYS", monthlySalary: 2600, workingDays: 26
  }), 100);
  assert.equal(core.calculateDayValue({
    method: "REQUIRED_DAILY_HOURS_AT_HOURLY_RATE", requiredDailyMinutes: 480, hourlyRate: 50
  }), 400);
});

test("employee policy overrides the organization default by effective date", () => {
  const result = core.resolveEffectivePolicy([
    { policyId: "default", staffId: "", effectiveFrom: "2026-01-01", active: true, requiredDailyMinutes: 480 },
    { policyId: "staff", staffId: "staff-1", effectiveFrom: "2026-07-01", active: true, requiredDailyMinutes: 600 }
  ], "staff-1", "2026-07-29");
  assert.equal(result.source, "EMPLOYEE");
  assert.equal(result.policyId, "staff");
  assert.equal(result.snapshot.requiredDailyMinutes, 600);
});

test("overlapping effective policies at the same precedence are rejected", () => {
  assert.throws(() => core.resolveEffectivePolicy([
    { policyId: "one", staffId: "staff-1", effectiveFrom: "2026-01-01", effectiveTo: "2026-12-31" },
    { policyId: "two", staffId: "staff-1", effectiveFrom: "2026-07-01", effectiveTo: "2026-08-01" }
  ], "staff-1", "2026-07-29"), (error) => error.code === "OVERLAPPING_EFFECTIVE_POLICIES");
});

test("custom shift overrides recurring schedule", () => {
  const result = core.resolveEffectiveSchedule({
    staffId: "staff-1", date: "2026-07-29",
    schedules: [{
      scheduleId: "s1", staffId: "staff-1", weekday: "WEDNESDAY",
      shiftStart: "09:00", shiftEnd: "17:00", requiredWorkMinutes: 480, active: true
    }],
    overrides: [{
      overrideId: "o1", staffId: "staff-1", date: "2026-07-29", type: "CUSTOM_SHIFT",
      shiftStart: "10:00", shiftEnd: "18:00", requiredWorkMinutes: 480, status: "APPROVED"
    }]
  });
  assert.equal(result.source, "OVERRIDE");
  assert.equal(result.segments[0].start, "10:00");
});

test("effective recurring schedule resolves without an override", () => {
  const result = core.resolveEffectiveSchedule({
    staffId: "staff-1", date: "2026-07-29",
    schedules: [{
      scheduleId: "s1", staffId: "staff-1", weekday: "WEDNESDAY",
      shiftStart: "09:00", shiftEnd: "17:00", requiredWorkMinutes: 480,
      effectiveFrom: "2026-07-01", effectiveTo: "2026-07-31", active: true
    }]
  });
  assert.equal(result.available, true);
  assert.equal(result.source, "RECURRING");
  assert.equal(result.segments[0].id, "s1");
});

test("required minutes use all schedule segments before falling back to policy", () => {
  assert.equal(core.resolveRequiredWorkMinutes({
    available: true,
    segments: [{ requiredWorkMinutes: 240 }, { requiredWorkMinutes: 180 }]
  }, { snapshot: { requiredDailyMinutes: 480 } }), 420);
  assert.equal(core.resolveRequiredWorkMinutes({
    available: true,
    segments: [{ requiredWorkMinutes: null }]
  }, { snapshot: { requiredDailyMinutes: 480 } }), 480);
  assert.throws(() => core.resolveRequiredWorkMinutes({
    available: true,
    segments: [{ requiredWorkMinutes: 240 }, { requiredWorkMinutes: null }]
  }, { snapshot: { requiredDailyMinutes: 480 } }),
  (error) => error.code === "PARTIAL_REQUIRED_MINUTES");
});

test("approved leave blocks the day before recurring schedule resolution", () => {
  const result = core.resolveEffectiveSchedule({
    staffId: "staff-1", date: "2026-07-29",
    schedules: [{
      staffId: "staff-1", weekday: "WEDNESDAY", shiftStart: "09:00",
      shiftEnd: "17:00", requiredWorkMinutes: 480
    }],
    overrides: [{
      staffId: "staff-1", date: "2026-07-29", type: "APPROVED_LEAVE", status: "APPROVED"
    }]
  });
  assert.equal(result.available, false);
  assert.equal(result.reason, "APPROVED_LEAVE");
});

test("approved absence blocks the day before recurring schedule resolution", () => {
  const result = core.resolveEffectiveSchedule({
    staffId: "staff-1", date: "2026-07-29",
    schedules: [{
      staffId: "staff-1", weekday: "WEDNESDAY", shiftStart: "09:00",
      shiftEnd: "17:00", requiredWorkMinutes: 480
    }],
    overrides: [{
      staffId: "staff-1", date: "2026-07-29", type: "ABSENT", status: "APPROVED"
    }]
  });
  assert.equal(result.available, false);
  assert.equal(result.reason, "ABSENT");
});

test("conflicting approved full-day overrides are rejected", () => {
  assert.throws(() => core.resolveEffectiveSchedule({
    staffId: "staff-1", date: "2026-07-29",
    overrides: [
      { staffId: "staff-1", date: "2026-07-29", type: "ABSENT", status: "APPROVED" },
      { staffId: "staff-1", date: "2026-07-29", type: "SICK_LEAVE", status: "APPROVED" }
    ]
  }), (error) => error.code === "CONFLICTING_FULL_DAY_OVERRIDES");
});

test("branch closure blocks a scheduled employee", () => {
  const result = core.resolveEffectiveSchedule({
    staffId: "staff-1", date: "2026-07-29",
    overrides: [{
      staffId: "staff-1", date: "2026-07-29", type: "BRANCH_CLOSED", status: "APPROVED"
    }]
  });
  assert.equal(result.available, false);
  assert.equal(result.reason, "BRANCH_CLOSED");
});

test("planned breaks remain interval blocks rather than full-day closures", () => {
  const result = core.resolveEffectiveSchedule({
    staffId: "staff-1", date: "2026-07-29",
    schedules: [{
      staffId: "staff-1", weekday: "WEDNESDAY", shiftStart: "09:00",
      shiftEnd: "17:00", requiredWorkMinutes: 480
    }],
    overrides: [{
      overrideId: "break-1", staffId: "staff-1", date: "2026-07-29",
      type: "PLANNED_BREAK", blockStart: "13:00", blockEnd: "14:00", status: "APPROVED"
    }]
  });
  assert.equal(result.available, true);
  assert.deepEqual(result.blocks, [{ type: "PLANNED_BREAK", start: "13:00", end: "14:00", id: "break-1" }]);
});

test("multiple non-overlapping schedule segments are supported", () => {
  const result = core.resolveEffectiveSchedule({
    staffId: "staff-1", date: "2026-07-29",
    schedules: [
      { staffId: "staff-1", weekday: "WEDNESDAY", shiftStart: "09:00", shiftEnd: "13:00", requiredWorkMinutes: 240 },
      { staffId: "staff-1", weekday: "WEDNESDAY", shiftStart: "15:00", shiftEnd: "19:00", requiredWorkMinutes: 240 }
    ]
  });
  assert.equal(result.segments.length, 2);
});

test("overlapping schedule segments are rejected", () => {
  assert.throws(() => core.resolveEffectiveSchedule({
    staffId: "staff-1", date: "2026-07-29",
    schedules: [
      { staffId: "staff-1", weekday: "WEDNESDAY", shiftStart: "09:00", shiftEnd: "14:00", requiredWorkMinutes: 300 },
      { staffId: "staff-1", weekday: "WEDNESDAY", shiftStart: "13:00", shiftEnd: "17:00", requiredWorkMinutes: 240 }
    ]
  }), (error) => error.code === "OVERLAPPING_SHIFT_SEGMENTS");
});

test("state machine accepts the normal multi-break progression", () => {
  let record = { staffId: "staff-1", state: core.STATES.NOT_STARTED, breaks: [], history: [] };
  record = core.transitionAttendanceState(record, event(core.EVENTS.CHECK_IN));
  record = core.transitionAttendanceState(record, event(core.EVENTS.START_BREAK));
  record = core.transitionAttendanceState(record, event(core.EVENTS.END_BREAK));
  record = core.transitionAttendanceState(record, event(core.EVENTS.START_BREAK, { requestId: "req-break-2" }));
  record = core.transitionAttendanceState(record, event(core.EVENTS.END_BREAK, { requestId: "req-break-3" }));
  record = core.transitionAttendanceState(record, event(core.EVENTS.CHECK_OUT));
  assert.equal(record.state, core.STATES.CHECKED_OUT);
  assert.equal(record.breaks.length, 2);
});

test("break before check-in is rejected", () => {
  assert.throws(() => core.transitionAttendanceState(
    { staffId: "staff-1", state: core.STATES.NOT_STARTED, breaks: [], history: [] },
    event(core.EVENTS.START_BREAK)
  ), (error) => error.code === "INVALID_ATTENDANCE_TRANSITION");
});

test("repeated check-in is rejected", () => {
  assert.throws(() => core.transitionAttendanceState(
    { staffId: "staff-1", state: core.STATES.CHECKED_IN, breaks: [], history: [] },
    event(core.EVENTS.CHECK_IN)
  ), (error) => error.code === "INVALID_ATTENDANCE_TRANSITION");
});

test("repeated open break is rejected", () => {
  assert.throws(() => core.transitionAttendanceState(
    { staffId: "staff-1", state: core.STATES.ON_BREAK, breaks: [{ startedAt: "x", endedAt: "" }], history: [] },
    event(core.EVENTS.START_BREAK)
  ), (error) => error.code === "INVALID_ATTENDANCE_TRANSITION");
});

test("check-out on an open break requires explicit manager auto-close", () => {
  const record = { staffId: "staff-1", state: core.STATES.ON_BREAK, breaks: [{ startedAt: "x", endedAt: "" }], history: [] };
  assert.throws(() => core.transitionAttendanceState(record, event(core.EVENTS.CHECK_OUT)));
  const closed = core.transitionAttendanceState(record, event(core.EVENTS.CHECK_OUT, {
    permission: "attendance.manage", autoCloseOpenBreak: true, reason: "Manager confirmed checkout"
  }));
  assert.equal(closed.state, core.STATES.CHECKED_OUT);
  assert.deepEqual(closed.lastAction.warnings, ["OPEN_BREAK_AUTO_CLOSED"]);
});

test("self action for another employee is rejected", () => {
  assert.throws(() => core.transitionAttendanceState(
    { staffId: "staff-2", state: core.STATES.NOT_STARTED, breaks: [], history: [] },
    event(core.EVENTS.CHECK_IN)
  ), (error) => error.code === "PERMISSION_DENIED");
});

test("mark absent requires attendance.manage and cannot be authorized by leave approval", () => {
  const record = { staffId: "staff-1", state: core.STATES.NOT_STARTED, breaks: [], history: [] };
  assert.throws(() => core.transitionAttendanceState(record, event(core.EVENTS.MARK_ABSENT, {
    permission: "leave.approve"
  })), (error) => error.code === "INVALID_ATTENDANCE_TRANSITION");
  const absent = core.transitionAttendanceState(record, event(core.EVENTS.MARK_ABSENT, {
    permission: "attendance.manage", reason: "No show confirmed"
  }));
  assert.equal(absent.state, core.STATES.ABSENT);
});

test("attendance.manage can create attendance for another employee", () => {
  const record = { staffId: "staff-2", state: core.STATES.NOT_STARTED, breaks: [], history: [] };
  const checkedIn = core.transitionAttendanceState(record, event(core.EVENTS.CHECK_IN, {
    actorStaffId: "staff-1", permission: "attendance.manage", reason: "Terminal unavailable"
  }));
  assert.equal(checkedIn.state, core.STATES.CHECKED_IN);
});

test("leave state requires an approved override reference and reason", () => {
  const record = { staffId: "staff-1", state: core.STATES.NOT_STARTED, breaks: [], history: [] };
  assert.throws(() => core.transitionAttendanceState(record, event(core.EVENTS.APPROVE_LEAVE, {
    permission: "leave.approve"
  })), (error) => error.code === "INVALID_ATTENDANCE_TRANSITION");
  const leave = core.transitionAttendanceState(record, event(core.EVENTS.APPROVE_LEAVE, {
    permission: "leave.approve",
    reason: "Approved paid leave",
    sourceEntityType: "STAFF_SCHEDULE_OVERRIDE",
    sourceEntityId: "override-1"
  }));
  assert.equal(leave.state, core.STATES.LEAVE);
  assert.equal(leave.lastAction.sourceEntityId, "override-1");
});

test("manager correction cancellation requires reason and records audit evidence", () => {
  let record = { staffId: "staff-1", state: core.STATES.NOT_STARTED, breaks: [], history: [] };
  record = core.transitionAttendanceState(record, event(core.EVENTS.CHECK_IN));
  record = core.transitionAttendanceState(record, event(core.EVENTS.CANCEL_LAST_ACTION, {
    permission: "attendance.correct", reason: "Accidental tap", requestId: "cancel-1"
  }));
  assert.equal(record.state, core.STATES.NOT_STARTED);
  assert.equal(record.checkInAt, "");
  assert.equal(record.lastAction.reason, "Accidental tap");
});

test("duplicate attendance request replays without appending another event", () => {
  const initial = { staffId: "staff-1", state: core.STATES.NOT_STARTED, breaks: [], history: [] };
  const command = event(core.EVENTS.CHECK_IN);
  const first = core.transitionAttendanceState(initial, command);
  const replay = core.transitionAttendanceState(first, command);
  assert.equal(replay.idempotentReplay, true);
  assert.equal(replay.history.length, 1);
});

test("reusing an attendance request ID with changed input is rejected", () => {
  const initial = { staffId: "staff-1", state: core.STATES.NOT_STARTED, breaks: [], history: [] };
  const first = core.transitionAttendanceState(initial, event(core.EVENTS.CHECK_IN));
  assert.throws(() => core.transitionAttendanceState(first, event(core.EVENTS.START_BREAK, {
    requestId: "req-CHECK_IN"
  })),
    (error) => error.code === "IDEMPOTENCY_KEY_REUSED");
});

test("attendance events can cross midnight but cannot regress in time", () => {
  let record = { staffId: "staff-1", state: core.STATES.NOT_STARTED, breaks: [], history: [] };
  record = core.transitionAttendanceState(record, event(core.EVENTS.CHECK_IN, {
    timestamp: "2026-07-29T23:55:00+03:00", requestId: "cross-1"
  }));
  record = core.transitionAttendanceState(record, event(core.EVENTS.CHECK_OUT, {
    timestamp: "2026-07-30T00:10:00+03:00", requestId: "cross-2"
  }));
  assert.equal(record.state, core.STATES.CHECKED_OUT);
  assert.throws(() => core.transitionAttendanceState(record, event(core.EVENTS.REOPEN, {
    timestamp: "2026-07-29T23:59:00+03:00", requestId: "cross-3",
    permission: "attendance.correct", reason: "wrong order"
  })), (error) => error.code === "EVENT_TIME_REGRESSION");
});

test("locked mutation helper times out without running and always releases after running", () => {
  let ran = false;
  assert.throws(() => core.executeLockedMutation({
    tryLock: () => false,
    releaseLock: () => { throw new Error("must not release"); }
  }, 1000, () => { ran = true; }), (error) => error.code === "LOCK_TIMEOUT");
  assert.equal(ran, false);
  let released = false;
  const value = core.executeLockedMutation({
    tryLock: () => true,
    releaseLock: () => { released = true; }
  }, 1000, () => 42);
  assert.equal(value, 42);
  assert.equal(released, true);
});

test("overtime approval is bounded by raw overtime and audited", () => {
  const reviewed = core.reviewOvertime({ rawOvertimeMinutes: 90 }, {
    permission: "attendance.approve_overtime", status: "APPROVED",
    approvedMinutes: 120, actorId: "manager", timestamp: "now", requestId: "req-ot"
  });
  assert.equal(reviewed.approvedOvertimeMinutes, 90);
  assert.equal(reviewed.overtimeApprovalStatus, "APPROVED");
});

test("attendance adjustment approval applies proposed state with audit context", () => {
  const reviewed = core.reviewAdjustment({
    status: "PENDING", beforeState: { checkIn: "09:30" }, proposedState: { checkIn: "09:00" }
  }, {
    permission: "attendance.approve_adjustment", status: "APPROVED",
    actorId: "manager", timestamp: "now", requestId: "req-adjust", reason: "Verified CCTV"
  });
  assert.deepEqual(reviewed.finalState, { checkIn: "09:00" });
});

test("attendance adjustment requester cannot approve their own correction", () => {
  assert.throws(() => core.reviewAdjustment({
    status: "PENDING", requestedBy: "manager",
    beforeState: { checkIn: "09:30" }, proposedState: { checkIn: "09:00" }
  }, {
    permission: "attendance.approve_adjustment", status: "APPROVED",
    actorId: "manager", timestamp: "now", requestId: "req-self", reason: "self approval"
  }), (error) => error.code === "SELF_APPROVAL_FORBIDDEN");
});

test("locked settlement cannot be recalculated", () => {
  assert.throws(() => core.calculateSettlement({ locked: true }), (error) => error.code === "SETTLEMENT_LOCKED");
});

test("approved settlement lock and privileged reasoned reopen are explicit", () => {
  const locked = core.lockSettlement({ status: "APPROVED", locked: false }, {
    permission: "payroll_settlement.approve", actorId: "manager",
    timestamp: "2026-07-31T20:00:00+03:00", requestId: "lock-1"
  });
  assert.equal(locked.locked, true);
  const reopened = core.reopenSettlement(locked, {
    permission: "payroll_settlement.approve", actorId: "owner",
    timestamp: "2026-08-01T09:00:00+03:00", requestId: "reopen-1",
    reason: "Approved payroll correction"
  });
  assert.equal(reopened.status, "REOPENED");
  assert.equal(reopened.locked, false);
  assert.equal(reopened.reopenReason, "Approved payroll correction");
});

test("settlement stores a detached policy snapshot", () => {
  const policy = { policyId: "p1", rate: 100 };
  const settlement = core.calculateSettlement({
    policySnapshot: policy,
    overtime: {
      mode: "NO_OVERTIME", deficitMinutes: 0, approvedOvertimeMinutes: 0,
      deficitRatePerHour: 0, overtimeRatePerHour: 0
    },
    excessAbsence: {
      policy: "FIXED_AMOUNT_PER_DAY", excessAbsenceDays: 0, fixedAmountPerDay: 0
    }
  });
  policy.rate = 200;
  assert.equal(settlement.policySnapshot.rate, 100);
  assert.equal(Object.isFrozen(settlement.policySnapshot), true);
});

test("dry-run migration plans zero writes and appends without reordering", () => {
  const plan = core.planSchemaMigration({
    ATTENDANCE: [...schema.LEGACY_ATTENDANCE_HEADERS],
    BARBER_SCHEDULE: [...schema.LEGACY_SCHEDULE_HEADERS]
  }, {
    environment: "local-review", expectedSpreadsheetId: "memory-1", actualSpreadsheetId: "memory-1"
  });
  assert.equal(plan.dryRun, true);
  assert.equal(plan.writes, 0);
  assert.equal(plan.safe, true);
  assert.equal(plan.appendColumns.ATTENDANCE[0], "ATTENDANCE_DAY_ID");
});

test("migration planning is deterministic and idempotent", () => {
  const existing = Object.fromEntries(
    Object.entries(schema.SHEET_SCHEMAS).map(([name, headers]) => [name, [...headers]])
  );
  const first = core.planSchemaMigration(existing);
  const identity = {
    environment: "local-review", expectedSpreadsheetId: "memory-1", actualSpreadsheetId: "memory-1"
  };
  const correctedFirst = core.planSchemaMigration(existing, identity);
  const second = core.planSchemaMigration(existing, identity);
  assert.equal(first.safe, false);
  assert.deepEqual(correctedFirst, second);
  assert.deepEqual(correctedFirst.createSheets, []);
  assert.deepEqual(correctedFirst.appendColumns, {});
  assert.equal(correctedFirst.safe, true);
});

test("partial incompatible attendance schema blocks migration planning", () => {
  const headers = [...schema.LEGACY_ATTENDANCE_HEADERS];
  headers[3] = "EMPLOYEE_NAME";
  const plan = core.planSchemaMigration({ ATTENDANCE: headers }, {
    environment: "local-review", expectedSpreadsheetId: "memory-1", actualSpreadsheetId: "memory-1"
  });
  assert.equal(plan.safe, false);
  assert.equal(plan.errors[0].code, "INCOMPATIBLE_EXISTING_SCHEMA");
});

test("legacy attendance rows are read-only compatibility records mapped by header name", () => {
  const row = schema.LEGACY_ATTENDANCE_HEADERS.map((header) => ({
    ID: "ATT-1", DATE: "2026-07-29", STAFF_ID: "staff-1", STAFF_NAME: "Historical Name",
    RECORD_TYPE: "work", CHECK_IN: "09:00", CHECK_OUT: "17:00",
    WORK_HOURS: 8, APPROVED_DEDUCTION: 12.5, APPROVAL_STATUS: "approved"
  })[header] || "");
  const record = core.normalizeLegacyAttendanceRow(row, schema.LEGACY_ATTENDANCE_HEADERS);
  assert.equal(record.compatibilityStatus, "LEGACY_UNMIGRATED");
  assert.equal(record.staffNameSnapshot, "Historical Name");
  assert.equal(record.approvedDeductionLegacy, 12.5);
  assert.equal(record.readOnly, true);
});

test("migration planning blocks unspecified or mismatched spreadsheet identity", () => {
  const unspecified = core.planSchemaMigration({});
  assert.equal(unspecified.safe, false);
  assert.ok(unspecified.errors.some((error) => error.code === "MIGRATION_IDENTITY_REQUIRED"));
  const mismatch = core.planSchemaMigration({}, {
    environment: "local-review", expectedSpreadsheetId: "one", actualSpreadsheetId: "two"
  });
  assert.ok(mismatch.errors.some((error) => error.code === "SPREADSHEET_IDENTITY_MISMATCH"));
  const unapprovedProduction = core.planSchemaMigration({}, {
    environment: "production", expectedSpreadsheetId: "one", actualSpreadsheetId: "one"
  });
  assert.ok(unapprovedProduction.errors.some((error) => error.code === "ENVIRONMENT_NOT_APPROVED"));
});

test("migration duplicate detection canonicalizes spaces, hyphens, and underscores", () => {
  const plan = core.planSchemaMigration({
    ATTENDANCE: [...schema.LEGACY_ATTENDANCE_HEADERS, "CUSTOM FIELD", "CUSTOM-FIELD"]
  }, {
    environment: "local-review", expectedSpreadsheetId: "memory-1", actualSpreadsheetId: "memory-1"
  });
  assert.ok(plan.errors.some((error) => error.code === "DUPLICATE_HEADERS"));
});

test("idempotency fingerprint ignores object key order but not payload changes", () => {
  const first = core.requestFingerprint("checkIn", "u1", { staffId: "s1", time: "09:00" });
  const reordered = core.requestFingerprint("checkIn", "u1", { time: "09:00", staffId: "s1" });
  const changed = core.requestFingerprint("checkIn", "u1", { staffId: "s1", time: "09:01" });
  assert.equal(first, reordered);
  assert.notEqual(first, changed);
});

test("isolated Phase 1 core contains no Google Sheets or network side effects", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const source = fs.readFileSync(path.join(__dirname, "..", "scripts", "staff-attendance-core.js"), "utf8");
  assert.doesNotMatch(source, /\bSpreadsheetApp\b|\bUrlFetchApp\b|\bDriveApp\b/);
});
