"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(process.env.CUT_HUB_PAYROLL_SOURCE_OVERRIDE || path.join(root, "public/assets/js/pages/payroll-attendance.js"), "utf8");
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const tick = () => new Promise(resolve => setImmediate(resolve));
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
function ui() {
  const elements = {}, calls = [], errors = [];
  const element = id => elements[id] ||= { value: "P1", textContent: "", setAttribute() {}, replaceChildren() {} };
  element("periodSelect");
  const c = vm.createContext({ state: { requestSequence: 0, detailSequence: 0, loading: false, mutating: false, periods: [], settlements: [], period: null },
    byId: element, currentPeriodId: () => element("periodSelect").value, withInitialReadTimeout: promise => promise,
    populatePeriods() {}, populateFilters() {}, renderRows() {}, renderPeriod() {},
    showMessage: message => errors.push(message), errorMessage: e => e.message });
  for (const name of ["createPayrollReadDispatcher", "loadPage", "periodReady", "beginMutation", "endMutation"]) {
    const pattern = name === "createPayrollReadDispatcher" ? /function createPayrollReadDispatcher\(request, observe\) \{[\s\S]*?\n\}/
      : new RegExp("function " + name + "\\([^)]*\\) \\{[\\s\\S]*?\\n  \\}");
    if (name === "endMutation") { vm.runInContext(source.match(/function endMutation\(\) \{[^\n]+\}/)[0], c); continue; }
    vm.runInContext(source.match(pattern)[0], c);
  }
  c.api = c.createPayrollReadDispatcher(payload => { const d = deferred(); calls.push({ ...d, payload }); return d.promise; });
  return { c, elements, calls, errors };
}
const response = id => ({ payrollPeriods: [{ payrollPeriodId: id }], payrollPeriod: { payrollPeriodId: id }, settlements: [{ settlementId: id }], blockers: [] });
test("same-period refreshes share one read, while stale period responses cannot overwrite a new selection", async () => {
  const h = ui(), first = h.c.loadPage("P1");
  assert.equal(h.c.loadPage("P1"), first); await tick(); assert.equal(h.calls.length, 1);
  h.elements.periodSelect.value = "P2"; const next = h.c.loadPage("P2"); await tick();
  h.calls[0].resolve(response("P1")); assert.equal(await first, false); assert.equal(h.c.state.period, null);
  h.calls[1].resolve(response("P2")); assert.equal(await next, true);
  assert.equal(h.c.state.period.payrollPeriodId, "P2"); assert.equal(h.c.periodReady(), true);
});
test("a failed refresh preserves displayed data but disables financial actions until a fresh read succeeds", async () => {
  const h = ui(); h.c.state.period = { payrollPeriodId: "P1" }; h.c.state.settlements = [{ settlementId: "old" }];
  const read = h.c.loadPage("P1"); await tick(); h.calls[0].reject(Error("offline")); assert.equal(await read, false);
  assert.equal(h.c.state.settlements[0].settlementId, "old"); assert.equal(h.c.periodReady(), false);
  assert.equal(h.c.state.loading, false); assert.equal(h.errors.at(-1), "offline");
  const retry = h.c.loadPage("P1"); await tick(); h.calls[1].resolve(response("P1")); await retry;
  assert.equal(h.c.periodReady(), true); assert.equal(h.calls.length, 2);
});
test("mutations lock once and invalidate pending reads without replaying writes", async () => {
  const h = ui(); const pending = h.c.loadPage("P1"); await tick();
  assert.equal(h.c.beginMutation(), false);
  h.calls[0].resolve(response("P1")); await pending;
  assert.equal(h.c.beginMutation(), true); assert.equal(h.c.beginMutation(), false);
  assert.equal(h.c.periodReady(), false); h.c.endMutation(); assert.equal(h.c.periodReady(), false);
  const writes = [];
  const api = h.c.createPayrollReadDispatcher(payload => { writes.push(payload); return Promise.reject(Error("unknown outcome")); });
  await assert.rejects(api({ action: "approvePayrollPeriod", requestId: "ONE" }), /unknown outcome/);
  assert.equal(writes.length, 1);
});
test("manual adjustment submits once with exact minor units and refreshes only after confirmed success", async () => {
  const h = ui();
  h.c.state.period = { payrollPeriodId: "P1" }; h.c.state.loadedPeriodId = "P1";
  h.c.state.selected = { settlementId: "SET" };
  for (const [id, value] of Object.entries({ adjustmentAmount: "1.25", adjustmentDirection: "DEBIT", adjustmentCategory: "manual", adjustmentReason: "test" })) h.c.byId(id).value = value;
  let refreshes = 0;
  h.c.requestId = () => "ONE"; h.c.adjustmentDialog = { close() {} };
  h.c.loadSettlements = async () => { refreshes++; h.c.state.loadedPeriodId = "P1"; };
  vm.runInContext(source.match(/function majorInputToMinor\(value\) \{[\s\S]*?\n  \}/)[0], h.c);
  const body = source.match(/byId\("adjustmentForm"\)\.addEventListener\("submit", async event => \{([\s\S]*?)\n  \}\);/)[1];
  vm.runInContext("async function submitAdjustment(event) {" + body + "\n}", h.c);
  const event = { preventDefault() {}, submitter: {} };
  const first = h.c.submitAdjustment(event); await h.c.submitAdjustment(event); await tick();
  assert.equal(h.calls.length, 1); assert.equal(refreshes, 0);
  assert.equal(h.calls[0].payload.amountMinor, 125); assert.equal(h.calls[0].payload.settlementId, "SET");
  h.calls[0].resolve({ status: "success" }); await first;
  assert.equal(refreshes, 1); assert.equal(h.c.state.mutating, false);
});
test("connectivity notifications preserve loading and failed-read state instead of falsely claiming fresh data", () => {
  const h = ui();
  const body = source.match(/window\.addEventListener\("romeo-connectivity-change", event => \{([\s\S]*?)\n  \}\);/)[1];
  vm.runInContext("function connectivity(event) {" + body + "\n}", h.c);
  h.c.state.loading = true; h.c.connectivity({ detail: { online: true } });
  assert.match(h.c.byId("syncState").textContent, /جارٍ تحميل/);
  h.c.state.loading = false; h.c.state.readFailed = true; h.c.connectivity({ detail: { online: true } });
  assert.match(h.c.byId("syncState").textContent, /حدّث البيانات/);
  h.c.connectivity({ detail: { online: false } }); assert.equal(h.c.byId("syncState").textContent, "غير متصل");
});
