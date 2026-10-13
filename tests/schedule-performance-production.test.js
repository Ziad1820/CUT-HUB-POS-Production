"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
function engine() {
  const c = vm.createContext({ console });
  for (const name of ["062_phase_staff-attendance-schema.gs", "063_phase_staff-attendance-core.gs", "064_phase_staff-scheduling-phase2.gs"]) {
    vm.runInContext(fs.readFileSync(path.join(root, "apps-script/production", name), "utf8"), c);
  }
  return c.StaffSchedulingPhase2;
}
test("63-day resolution reads each dataset once and matches individual days including branch closure", () => {
  const e = engine();
  const repo = e.createMemoryRepository({ staff: [{ staffId: "S1", staffName: "Staff", branchId: "B1", active: true }],
    schedules: [{ scheduleId: "SCH1", staffId: "S1", weekday: "FRIDAY", shiftStart: "12:00", shiftEnd: "00:00",
      segmentIndex: 1, requiredWorkMinutes: 660, allowedBreakMinutes: 60, active: true,
      effectiveFrom: "2026-10-13", effectiveTo: "2026-10-31" }],
    overrides: [{ overrideId: "OV1", scopeType: "BRANCH", branchId: "B1", type: "BRANCH_CLOSED", date: "2026-10-16", status: "APPROVED" }] });
  const counts = {};
  for (const key of ["listSchedules", "listOverrides", "listPolicies"]) {
    const original = repo[key]; repo[key] = (...args) => { counts[key] = (counts[key] || 0) + 1; return original(...args); };
  }
  const service = e.createService({ repository: repo, actorResolver: () => ({ actorId: "owner", owner: true }) });
  const result = service.execute("resolveStaffSchedulesRange", { staffIds: ["S1"], dateFrom: "2026-10-13", dateTo: "2026-12-14" });
  assert.equal(result.resolvedSchedules.length, 63);
  assert.deepEqual(counts, { listOverrides: 1, listPolicies: 1, listSchedules: 1 });
  for (const row of result.resolvedSchedules) {
    const single = service.execute("resolveStaffSchedule", { staffId: "S1", date: row.date }).resolvedSchedule;
    assert.deepEqual(JSON.parse(JSON.stringify(row)), JSON.parse(JSON.stringify(single)));
  }
  assert.equal(result.resolvedSchedules.find(x => x.date === "2026-10-16").classification, "BRANCH_CLOSED");
});
const page = fs.readFileSync(path.join(root, "public/assets/js/pages/schedule-management.js"), "utf8");
test("weekly results remain visible when the separate range request fails", async () => {
  let weeklyResolve, rangeReject;
  const weekly = new Promise(resolve => { weeklyResolve = resolve; });
  const range = new Promise((_resolve, reject) => { rangeReject = reject; });
  const rendered = [], statuses = [];
  const c = vm.createContext({
    state: { selectedRequestSequence: 0, schedules: [], overrides: [], resolved: [] },
    selectedStaff: () => ({ staffId: "S1" }),
    byId: () => ({ value: "2026-10-13" }),
    document: { querySelector: () => ({ setAttribute() {} }) },
    setStatus: (...args) => statuses.push(args),
    loadWorkPolicies: async () => {},
    renderWeekly: () => rendered.push(c.state.weeklyLoading ? "loading" : c.state.schedules.length),
    renderOverrides() {}, renderRange() {}, renderAudit() {},
    api: action => action === "getStaffWeeklySchedule" ? weekly : action === "resolveStaffSchedulesRange" ? range : Promise.resolve({})
  });
  vm.runInContext(page.match(/async function loadSelected\(\) \{[\s\S]*?\n  \}/)[0], c);
  const pending = c.loadSelected();
  assert.equal(rendered[0], "loading");
  weeklyResolve({ schedules: [{ scheduleId: "SCH1" }] });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(rendered.at(-1), 1);
  rangeReject(Object.assign(new Error("range unavailable"), { code: "TEMPORARY" }));
  await pending;
  assert.equal(c.state.schedules[0].scheduleId, "SCH1");
  assert.equal(c.state.weeklyLoadFailed, false);
  assert.equal(statuses.at(-1)[1], "error");
});
test("a conflict tells the user to edit without dumping internal transaction details", () => {
  const c = vm.createContext({});
  vm.runInContext(page.match(/function scheduleManagementErrorMessage\(error\) \{[\s\S]*?\n\}/)[0], c);
  const message = c.scheduleManagementErrorMessage({ code: "SCHEDULE_SHIFT_CONFLICT", details: { transactionId: "PRIVATE" } });
  assert.match(message, /تعديل/);
  assert.match(message, /لم تُحفظ/);
  assert.doesNotMatch(message, /PRIVATE|transactionId|COMPENSATED/);
});
