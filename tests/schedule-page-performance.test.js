"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const source = fs.readFileSync(process.env.CUT_HUB_SCHEDULE_SOURCE_OVERRIDE ||
  path.join(__dirname, "../public/assets/js/pages/schedule-management.js"), "utf8");
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const tick = () => new Promise(resolve => setImmediate(resolve));
function dispatcher(request) {
  const c = vm.createContext({});
  vm.runInContext(source.match(/function createScheduleReadDispatcher\(request, observe\) \{[\s\S]*?\n\}/)[0], c);
  return c.createScheduleReadDispatcher(request);
}
test("the selected employee's four sections share one bundle request and section failures remain independent", async () => {
  const c = vm.createContext({});
  vm.runInContext(source.match(/function createScheduleSelectionReader\(api, staffId, dateFrom, dateTo\) \{[\s\S]*?\n\}/)[0], c);
  const pending = deferred(), calls = [];
  const read = c.createScheduleSelectionReader((action, payload) => { calls.push({ action, payload }); return pending.promise; }, "S1", "2026-10-16", "2026-10-29");
  const weekly = read("getStaffWeeklySchedule"), range = read("resolveStaffSchedulesRange");
  const audit = read("getScheduleAuditHistory"), overrides = read("listScheduleOverrides");
  pending.resolve({ weekly: { status: "success", schedules: [{ scheduleId: "SCH" }] },
    resolved: { status: "error", code: "SCHEDULE_RESOLUTION_RANGE_INVALID", message: "Invalid dates" },
    audit: { status: "success", audit: [] }, overrides: { status: "success", overrides: [] } });
  assert.equal((await weekly).schedules[0].scheduleId, "SCH");
  await assert.rejects(range, { code: "SCHEDULE_RESOLUTION_RANGE_INVALID" });
  await Promise.all([audit, overrides]); assert.equal(calls.length, 1);
  assert.equal(calls[0].action, "getScheduleSelection");
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].payload)), { staffId: "S1", dateFrom: "2026-10-16", dateTo: "2026-10-29" });
});
test("concurrent identical reads share transport; other employees and dates stay independent; settled reads are fresh", async () => {
  const calls = [];
  const api = dispatcher((action, payload) => { const d = deferred(); calls.push({ action, payload, ...d }); return d.promise; });
  const first = api("getStaffWeeklySchedule", { staffId: "S1" });
  assert.equal(api("getStaffWeeklySchedule", { staffId: "S1" }), first);
  const second = api("getStaffWeeklySchedule", { staffId: "S2" });
  const range1 = api("resolveStaffSchedulesRange", { dateFrom: "2026-10-16" });
  const range2 = api("resolveStaffSchedulesRange", { dateFrom: "2026-10-17" });
  await tick(); assert.equal(calls.length, 4);
  calls.forEach(c => c.resolve({ status: "success" }));
  await Promise.all([first, second, range1, range2]);
  const fresh = api("getStaffWeeklySchedule", { staffId: "S1" });
  await tick(); assert.equal(calls.length, 5); calls[4].resolve({}); await fresh;
});
test("writes never coalesce or retry and invalidate pending reads before reconciliation", async () => {
  const calls = [];
  const api = dispatcher(action => { const d = deferred(); calls.push({ action, ...d }); return d.promise; });
  const oldRead = api("getStaffWeeklySchedule", { staffId: "S1" });
  const write = api("copyScheduleDay", { requestId: "ONE" });
  const afterWrite = api("getStaffWeeklySchedule", { staffId: "S1" });
  assert.notEqual(afterWrite, oldRead);
  await tick(); assert.deepEqual(calls.map(c => c.action), ["getStaffWeeklySchedule", "copyScheduleDay", "getStaffWeeklySchedule"]);
  calls[0].resolve({}); await oldRead;
  assert.equal(api("getStaffWeeklySchedule", { staffId: "S1" }), afterWrite);
  calls[1].reject(Error("uncertain write")); await assert.rejects(write, /uncertain/);
  calls[2].resolve({}); await afterWrite; assert.equal(calls.length, 3);
});
test("a rejected read is not cached or silently retried", async () => {
  let count = 0;
  const api = dispatcher(() => { count++; return Promise.reject(Error("offline")); });
  await assert.rejects(api("listWorkPolicies", { staffId: "S1" }), /offline/);
  assert.equal(count, 1);
  await assert.rejects(api("listWorkPolicies", { staffId: "S1" }), /offline/);
  assert.equal(count, 2);
});
test("bootstrap releases the employee selector without waiting for owner scopes or loading duplicate policies", async () => {
  const branch = { value: "B1", replaceChildren() {}, appendChild() {} };
  const elements = { branchFilter: branch, scopePanel: {} };
  let scopeStarted = 0, policiesRendered = 0;
  const c = vm.createContext({ state: {},
    byId: id => elements[id], option: () => ({}), setStatus() {},
    populateSelectors() {}, applyPermissions() {}, renderWorkPolicies() { policiesRendered++; },
    loadScheduleScopes() { scopeStarted++; return new Promise(() => {}); },
    api: async action => { assert.equal(action, "getSchedulePageData"); return { staff: [{ staffId: "S1" }], permissions: { owner: true }, branches: ["B1"] }; }
  });
  vm.runInContext(source.match(/async function loadPageData\(\) \{[\s\S]*?\n  \}/)[0], c);
  await c.loadPageData();
  assert.equal(c.state.staff[0].staffId, "S1"); assert.equal(branch.value, "B1");
  assert.equal(scopeStarted, 1); assert.equal(policiesRendered, 1);
});
test("range and exceptions render while audit is still pending, and superseded responses cannot overwrite the current employee", async () => {
  const calls = [], renders = [];
  let staffId = "S1";
  const c = vm.createContext({
    state: { selectedRequestSequence: 0 }, selectedStaff: () => ({ staffId }),
    byId: () => ({ value: "2026-10-16" }), document: { querySelector: () => ({ setAttribute() {} }) },
    setStatus() {}, loadWorkPolicies: async () => {}, renderWeekly() {},
    createScheduleSelectionReader: api => api,
    renderRange() { renders.push(["range", c.state.resolved?.[0]?.id]); },
    renderOverrides() { renders.push(["overrides", c.state.overrides?.[0]?.id]); }, renderAudit() {},
    api(action, payload) { const d = deferred(); calls.push({ action, payload, ...d }); return d.promise; }
  });
  vm.runInContext(source.match(/async function loadSelected\(\) \{[\s\S]*?\n  \}/)[0], c);
  const first = c.loadSelected();
  calls.find(x => x.action === "resolveStaffSchedulesRange").resolve({ resolvedSchedules: [{ id: "early-range" }] });
  calls.find(x => x.action === "listScheduleOverrides").resolve({ overrides: [{ id: "early-override" }] });
  await tick();
  assert.ok(renders.some(x => x[1] === "early-range")); assert.ok(renders.some(x => x[1] === "early-override"));
  staffId = "S2";
  const second = c.loadSelected();
  calls.slice(0, 4).forEach(x => x.resolve({ schedules: [{ staffId: "S1" }] }));
  await first;
  assert.equal(c.state.schedules.length, 0);
  calls.slice(4).forEach(x => x.resolve({ schedules: [{ staffId: "S2" }], resolvedSchedules: [{ id: "new-range" }] }));
  await second; assert.equal(c.state.schedules[0].staffId, "S2"); assert.equal(c.state.resolved[0].id, "new-range");
});

function adapter() {
  const c = vm.createContext({ console });
  for (const name of ["062_phase_staff-attendance-schema.gs", "063_phase_staff-attendance-core.gs",
    "064_phase_staff-scheduling-phase2.gs", "065_phase_staff-scheduling-phase2-gas.gs"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "../apps-script/production", name), "utf8"), c);
  }
  return c;
}
test("production audit reads staff once per request with unchanged authorization and response; a new request reads fresh staff", () => {
  const c = adapter();
  const staff = [{ staffId: "S1", staffName: "One", branchId: "B1", active: true },
    { staffId: "S2", staffName: "Two", branchId: "B2", active: true }];
  let staffReads = 0;
  c.schedulePhase2ReadStaff = () => { staffReads++; return staff.map(x => ({ ...x })); };
  c.schedulePhase2ReadRows = name => name === "STAFF_ATTENDANCE_AUDIT"
    ? Array.from({ length: 25 }, (_, i) => ({ actionId: "A" + i, staffId: i % 2 ? "S1" : "S2", entityId: "SCH" + i })) : [];
  const actors = [{ actorId: "owner", owner: true },
    { actorId: "employee", role: "EMPLOYEE", staffId: "S1", permissions: ["schedule.view"] },
    { actorId: "manager", role: "BRANCH_MANAGER", branchIds: ["B1"], permissions: ["schedule.view"] }];
  for (const actor of actors) {
    const run = action => c.StaffSchedulingPhase2.createService({ repository: c.schedulePhase2CreateRepository(action), actorResolver: () => actor })
      .execute("getScheduleAuditHistory", {});
    staffReads = 0; const expected = run(); assert.equal(staffReads, 25);
    staffReads = 0; const actual = run("getScheduleAuditHistory"); assert.equal(staffReads, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(actual)), JSON.parse(JSON.stringify(expected)));
    assert.equal(actual.audit.length, actor.owner ? 25 : 12);
    if (!actor.owner) assert.ok(actual.audit.every(row => row.staffId === "S1"));
    run("getScheduleAuditHistory"); assert.equal(staffReads, 2);
  }
});
test("snapshot copies protect nested values and dates; write and unknown action repositories retain live reads", () => {
  const c = adapter();
  vm.runInContext('var sample = [{ staffId: "S1", createdAt: new Date("2026-10-16T00:00:00Z"), nested: { value: 1 } }];', c);
  let count = 0;
  c.schedulePhase2ReadStaff = () => { count++; return c.sample; };
  const repo = c.schedulePhase2CreateRepository("getScheduleAuditHistory");
  const first = repo.getStaff("S1"); first.nested.value = 99; first.createdAt.setFullYear(2020);
  assert.equal(repo.getStaff("S1").nested.value, 1);
  assert.equal(repo.getStaff("S1").createdAt.getUTCFullYear(), 2026); assert.equal(count, 1);
  for (const action of [undefined, "saveScheduleSegment", "copyScheduleDay", "saveScheduleUserScope", "UNKNOWN"]) {
    const live = c.schedulePhase2CreateRepository(action); const before = count;
    live.getStaff("S1"); live.getStaff("S1"); assert.equal(count, before + 2);
  }
});
test("production selection bundle matches all original reads, shares staff data, and preserves employee/branch/permission boundaries", () => {
  const c = adapter(), e = c.StaffSchedulingPhase2;
  const staff = [{ staffId: "S1", staffName: "One", branchId: "B1", active: true },
    { staffId: "S2", staffName: "Two", branchId: "B2", active: true }];
  let reads = 0;
  c.schedulePhase2ReadStaff = () => { reads++; return staff; };
  c.schedulePhase2ReadSchedules = () => [e.validateScheduleSegment({ scheduleId: "SCH", staffId: "S1", weekday: "FRIDAY",
    shiftStart: "12:00", shiftEnd: "00:00", segmentIndex: 1, requiredWorkMinutes: 660,
    allowedBreakMinutes: 60, effectiveFrom: "2026-10-13", effectiveTo: "2026-10-31", active: true }, { staff: staff[0] })];
  c.schedulePhase2ReadRows = name => name === "STAFF_ATTENDANCE_AUDIT"
    ? [{ actionId: "A1", staffId: "S1" }, { actionId: "A2", staffId: "S2" }] : [];
  const data = { staffId: "S1", dateFrom: "2026-10-16", dateTo: "2026-10-29", staffIds: ["S1"], limit: 200 };
  for (const actor of [{ actorId: "owner", owner: true },
    { actorId: "employee", role: "EMPLOYEE", staffId: "S1", permissions: ["schedule.view"] },
    { actorId: "manager", role: "MANAGER", branchIds: ["B1"], permissions: ["schedule.view"] }]) {
    const old = e.createService({ repository: c.schedulePhase2CreateRepository(), actorResolver: () => actor });
    const expected = Object.fromEntries([["weekly", "getStaffWeeklySchedule"], ["overrides", "listScheduleOverrides"],
      ["resolved", "resolveStaffSchedulesRange"], ["audit", "getScheduleAuditHistory"]].map(([key, action]) => [key, old.execute(action, data)]));
    reads = 0; let authCalls = 0;
    const service = e.createService({ repository: c.schedulePhase2CreateRepository("getScheduleSelection"), actorResolver: () => { authCalls++; return actor; } });
    const actual = service.execute("getScheduleSelection", { ...data, actorId: "owner", actions: ["saveScheduleSegment"] });
    for (const key of Object.keys(expected)) assert.deepEqual(JSON.parse(JSON.stringify(actual[key])), JSON.parse(JSON.stringify(expected[key])));
    assert.equal(reads, 1); assert.equal(authCalls, 1);
    if (!actor.owner) assert.throws(() => service.execute("getScheduleSelection", { ...data, staffId: "S2" }), { code: "SCHEDULE_SCOPE_DENIED" });
    const invalidRange = service.execute("getScheduleSelection", { ...data, dateTo: "2025-01-01" });
    assert.equal(invalidRange.weekly.status, "success");
    assert.equal(invalidRange.resolved.status, "error");
  }
  const denied = e.createService({ repository: c.schedulePhase2CreateRepository("getScheduleSelection"), actorResolver: () => ({ actorId: "denied", permissions: [] }) });
  assert.throws(() => denied.execute("getScheduleSelection", data), { code: "PERMISSION_DENIED" });
});
