"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const phase4 = require("../scripts/staff-payroll-attendance-phase4");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(
  path.join(root, "public/assets/css/pages/payroll-attendance.css"),
  "utf8"
);
const pageScript = fs.readFileSync(
  path.join(root, "public/assets/js/pages/payroll-attendance.js"),
  "utf8"
);
const pageHtml = fs.readFileSync(
  path.join(root, "public/pages/payroll-attendance.html"),
  "utf8"
);

test("Payroll Attendance contains its wide table inside the page viewport", () => {
  assert.match(css, /\.table-panel\s*\{[^}]*min-width:\s*0;/s);
  assert.match(css, /\.table-scroll\s*\{[^}]*max-width:\s*100%;[^}]*overflow:\s*auto;/s);
});

test("Payroll Attendance does not translate the inactive canonical sidebar into view", () => {
  assert.match(css, /\.system-sidebar\s*\{[^}]*transform:\s*none;/s);
});

function zeroSalaryInput() {
  return {
    period: {
      payrollPeriodId: "PER-ZERO",
      startDate: "2026-08-09",
      endDate: "2026-08-09"
    },
    staff: {
      staffId: "1784232573966",
      staffName: "osama",
      branchId: "CUT_HUB_MAIN",
      salary: "0",
      salaryBasis: "MONTHLY"
    },
    policies: [{
      policyId: "POL-ZERO",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-12-31",
      active: true,
      currency: "EGP",
      salaryBasis: "MONTHLY",
      overtimeMultiplierBps: 15000,
      unpaidLeaveMultiplierBps: 10000,
      absenceMultiplierBps: 10000
    }],
    days: [{
      attendanceDayId: "ATD-1784232573966-2026-08-09",
      staffId: "1784232573966",
      attendanceDate: "2026-08-09",
      calculationVersion: "STAFF_ATTENDANCE_PHASE3_V1",
      sourceEventHash: "STAGING-TEST-HASH",
      status: "PRESENT",
      requiredWorkMinutesRounded: 480,
      workedMinutesRounded: 480,
      deficitMinutesRounded: 0,
      rawOvertimeMinutes: 0,
      approvedOvertimeMinutes: 0,
      overtimeApprovalStatus: "NOT_REQUESTED",
      locked: true,
      policySnapshot: {},
      scheduleSnapshot: {},
      calculationWarnings: ["NO_SCHEDULE"]
    }],
    adjustments: []
  };
}

test("zero salary remains finite and source warnings remain visible", () => {
  const result = phase4.calculateEmployeeSettlement({
    ...zeroSalaryInput()
  });

  const moneyFields = [
    result.baseSalaryMinor,
    result.basePeriodAmountMinor,
    result.deficitDeductionMinor,
    result.unpaidLeaveDeductionMinor,
    result.absenceDeductionMinor,
    result.overtimeCompensationMinor,
    result.netAttendanceAdjustmentMinor
  ];
  assert.deepEqual(moneyFields, moneyFields.map(() => 0));
  assert.ok(moneyFields.every(Number.isSafeInteger));
  assert.ok(result.warnings.includes("2026-08-09:NO_SCHEDULE"));
});

test("unscheduled zero-required-minute payroll fails closed with a stable code", () => {
  const input = zeroSalaryInput();
  input.days[0].requiredWorkMinutesRounded = 0;
  input.days[0].workedMinutesRounded = 0;
  assert.throws(
    () => phase4.calculateEmployeeSettlement(input),
    error => error && error.code === "PAYROLL_CONTRACTUAL_MINUTES_REQUIRED"
  );
});

test("initial payroll-period read has a bounded timeout and stable error code", () => {
  assert.match(pageScript, /PAYROLL_INITIAL_READ_TIMEOUT_MS\s*=\s*45000/);
  assert.match(pageScript, /error\.code\s*=\s*["']PAYROLL_READ_TIMEOUT["']/);
  assert.match(pageScript,
    /withInitialReadTimeout\(api\(\{\s*action:\s*["']listPayrollPeriods["']\s*\}\)\)/s);
  assert.match(pageScript, /Promise\.race\(\[promise, timeout\]\)\.finally/);
  assert.match(pageHtml, /payroll-attendance\.js\?v=20260809-1/);
});

test("Payroll Attendance uses the lexical RomeoAuth binding and reaches its initial read", () => {
  assert.match(pageScript,
    /const user\s*=\s*RomeoAuth\.requireAuth\(["']payroll_attendance\.view["']\)/);
  assert.match(pageScript, /return RomeoAuth\.hasPermission\(permission\)/);
  assert.doesNotMatch(pageScript, /window\.RomeoAuth/);
  assert.match(pageScript, /await loadPeriods\(true\)/);
});
