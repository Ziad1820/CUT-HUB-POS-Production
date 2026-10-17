"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const plain = value => JSON.parse(JSON.stringify(value));
function runtime() {
  const c = vm.createContext({ console, Utilities: { DigestAlgorithm: { SHA_256: "SHA_256" }, Charset: { UTF_8: "UTF_8" },
    computeDigest: (_algorithm, value) => Array.from(require("node:crypto").createHash("sha256").update(value).digest()) } });
  for (const file of ["062_phase_staff-attendance-schema.gs", "063_phase_staff-attendance-core.gs",
    "069_phase_staff-payroll-attendance-phase4.gs", "070_phase_staff-payroll-attendance-phase4-gas.gs"]) {
    vm.runInContext(fs.readFileSync(path.join(root, "apps-script/production", file), "utf8"), c);
  }
  return c;
}
function fixture(actor) {
  const c = runtime(), e = c.StaffPayrollAttendancePhase4, counts = {};
  const staff = ["S1", "S2"].map(staffId => ({ staffId, staffName: staffId, branchId: "B1", active: true, salary: "26000", salaryBasis: "MONTHLY" }));
  const period = { payrollPeriodId: "P1", startDate: "2026-10-01", endDate: "2026-10-01", branchId: "B1", status: "CALCULATED" };
  const policies = [{ policyId: "POL", active: true, currency: "EGP", salaryBasis: "MONTHLY", effectiveFrom: "2026-01-01", effectiveTo: "2026-12-31", overtimeMultiplierBps: 15000, unpaidLeaveMultiplierBps: 10000, absenceMultiplierBps: 10000 }];
  const days = staff.map((item, i) => ({ staffId: item.staffId, attendanceDayId: "D" + i, attendanceDate: "2026-10-01",
    calculationVersion: "STAFF_ATTENDANCE_PHASE3_V1", sourceEventHash: "HASH" + i, status: "CHECKED_OUT", requiredWorkMinutesRounded: 480,
    workedMinutesRounded: i ? 450 : 515, deficitMinutesRounded: i ? 30 : 0, rawOvertimeMinutes: i ? 0 : 35,
    approvedOvertimeMinutes: i ? 0 : 15, overtimeApprovalStatus: i ? "NOT_REQUESTED" : "APPROVED",
    locked: true, policySnapshot: {}, scheduleSnapshot: {}, calculationWarnings: [] }));
  const settlements = staff.map((item, i) => ({ ...e.calculateEmployeeSettlement({ period, staff: item,
    days: [days[i]], policies, adjustments: [] }), payrollPeriodId: "P1", staffId: item.staffId, branchId: "B1", settlementId: "SET" + i, settlementVersion: 1, status: "CALCULATED" }));
  const audit = staff.map((item, i) => ({ actionId: "A" + i, entityId: "SET" + i, staffId: item.staffId, branchId: "B1", action: "CALCULATE", token: "NEVER", amountMinor: 99 }));
  const read = (name, rows) => () => { counts[name] = (counts[name] || 0) + 1; return plain(rows); };
  c.payrollAttendancePhase4ReadPeriods = read("periods", [period]);
  c.payrollAttendancePhase4ReadStaff = read("staff", staff);
  c.payrollAttendancePhase4ReadSettlements = read("settlements", settlements);
  c.attendancePhase3ReadDays = read("days", days);
  c.schedulePhase2ReadRows = name => read(name, name === "STAFF_WORK_POLICIES" ? policies : name === "PAYROLL_ATTENDANCE_AUDIT" ? audit : [])();
  let auth = 0;
  const service = action => e.createService({ repository: c.payrollAttendancePhase4CreateRepository(action), actorResolver: () => { auth++; return actor; } });
  return { c, e, counts, service, auth: () => auth, period, settlements };
}
const actors = [
  { actorId: "owner", role: "OWNER", owner: true },
  { actorId: "finance", role: "PAYROLL", branchIds: ["B1"], permissions: ["payroll_attendance.view", "payroll_attendance.calculate"] },
  { actorId: "manager", role: "MANAGER", branchIds: ["B1"], permissions: ["payroll_attendance.view"] },
  { actorId: "employee", role: "EMPLOYEE", staffId: "S1", branchIds: ["B1"], permissions: ["payroll_attendance.view"] }
];
test("page bundle matches the original period, settlement, blocker and financial masking results with one read per dataset", () => {
  for (const actor of actors) {
    const h = fixture(actor), old = h.service();
    const expectedPeriods = old.execute("listPayrollPeriods", {}).payrollPeriods;
    const expected = old.execute("listEmployeePayrollSettlements", { payrollPeriodId: "P1" });
    const expectedBlockers = old.execute("getUnresolvedPayrollBlockers", { payrollPeriodId: "P1" }).blockers;
    assert.ok(h.counts.periods > 1); Object.keys(h.counts).forEach(key => delete h.counts[key]);
    const beforeAuth = h.auth();
    const actual = h.service("getPayrollAttendancePage").execute("getPayrollAttendancePage", { payrollPeriodId: "P1", actorId: "owner", actions: ["approvePayrollPeriod"] });
    assert.deepEqual(plain(actual.payrollPeriods), plain(expectedPeriods));
    assert.deepEqual(plain(actual.settlements), plain(expected.settlements));
    assert.deepEqual(plain(actual.payrollPeriod), plain(expected.payrollPeriod));
    assert.deepEqual(plain(actual.blockers), plain(expectedBlockers));
    assert.equal(h.auth() - beforeAuth, 1);
    Object.values(h.counts).forEach(count => assert.equal(count, 1));
    if (actor.role === "EMPLOYEE") assert.deepEqual(Array.from(actual.settlements, x => x.staffId), ["S1"]);
    if (["MANAGER", "EMPLOYEE"].includes(actor.role)) assert.equal(actual.settlements[0].netAttendanceAdjustmentMinor, undefined);
    assert.equal(h.e.WRITE_ACTIONS.has("getPayrollAttendancePage"), false);
    assert.equal(h.e.WRITE_ACTIONS.has("getPayrollAttendanceDetails"), false);
  }
});
test("details bundle matches original detail/audit permissions and cannot use a forged staff identity", () => {
  for (const actor of actors) {
    const h = fixture(actor), old = h.service();
    const detail = old.execute("getEmployeePayrollSettlement", { settlementId: "SET0" });
    const audit = old.execute("getPayrollSettlementAudit", { entityId: "SET0", staffId: "S1" }).audit;
    const actual = h.service("getPayrollAttendanceDetails").execute("getPayrollAttendanceDetails", { settlementId: "SET0", staffId: "S2", actorId: "owner" });
    assert.deepEqual(plain(actual.settlement), plain(detail.settlement));
    assert.deepEqual(plain(actual.adjustments), plain(detail.adjustments));
    assert.deepEqual(plain(actual.audit), plain(audit)); assert.doesNotMatch(JSON.stringify(actual), /NEVER/);
    if (actor.role === "EMPLOYEE") assert.throws(() => h.service("getPayrollAttendanceDetails").execute("getPayrollAttendanceDetails", { settlementId: "SET1", staffId: "S1" }), { code: "PAYROLL_SELF_SCOPE_DENIED" });
  }
});
test("page read preserves branch, organization, permission and duplicate-period protections", () => {
  const outside = fixture({ actorId: "outside", branchIds: ["B2"], permissions: ["payroll_attendance.view"] });
  assert.throws(() => outside.service("getPayrollAttendancePage").execute("getPayrollAttendancePage", { payrollPeriodId: "P1" }), { code: "PAYROLL_BRANCH_SCOPE_DENIED" });
  assert.equal(outside.service("getPayrollAttendancePage").execute("getPayrollAttendancePage", {}).payrollPeriods.length, 0);
  const denied = fixture({ actorId: "denied", permissions: [] });
  assert.throws(() => denied.service("getPayrollAttendancePage").execute("getPayrollAttendancePage", {}), { code: "PAYROLL_PERMISSION_DENIED" });
  const h = fixture(actors[2]);
  h.c.payrollAttendancePhase4ReadPeriods = () => [{ ...h.period, branchId: "" }];
  assert.throws(() => h.service("getPayrollAttendancePage").execute("getPayrollAttendancePage", { payrollPeriodId: "P1" }), { code: "PAYROLL_ORGANIZATION_SCOPE_DENIED" });
  h.c.payrollAttendancePhase4ReadPeriods = () => [h.period, h.period];
  assert.throws(() => h.service("getPayrollAttendancePage").execute("getPayrollAttendancePage", { payrollPeriodId: "P1" }), { code: "PAYROLL_PERIOD_ID_AMBIGUOUS" });
});
test("new reads see changed attendance; mutations and default repositories keep live reads", () => {
  const h = fixture(actors[0]);
  const first = h.service("getPayrollAttendancePage").execute("getPayrollAttendancePage", {});
  h.c.attendancePhase3ReadDays = () => [];
  const next = h.service("getPayrollAttendancePage").execute("getPayrollAttendancePage", {});
  assert.notDeepEqual(plain(first.blockers), plain(next.blockers));
  for (const action of [undefined, "approvePayrollPeriod", "createPayrollPeriod", "exportPayrollAttendanceReport", "UNKNOWN"]) {
    const repo = h.c.payrollAttendancePhase4CreateRepository(action), before = h.counts.staff || 0;
    repo.getStaff("S1"); repo.getStaff("S1"); assert.equal(h.counts.staff - before, 2);
  }
});
