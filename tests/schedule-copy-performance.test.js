"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), vm = require("node:vm"), path = require("node:path");
const base = path.resolve(__dirname, "../apps-script/production");
function runtime(adapter = false) {
  const c = vm.createContext({ console, Utilities: {
    DigestAlgorithm: { SHA_256: "sha256" }, Charset: { UTF_8: "utf8" },
    computeDigest: (_algorithm, value) => Array.from(require("node:crypto").createHash("sha256").update(value).digest())
  } });
  for (const file of ["062_phase_staff-attendance-schema.gs", "063_phase_staff-attendance-core.gs", "064_phase_staff-scheduling-phase2.gs",
    ...(adapter ? ["065_phase_staff-scheduling-phase2-gas.gs"] : [])]) vm.runInContext(fs.readFileSync(path.join(base, file), "utf8"), c);
  return c;
}
const shift = { scheduleId: "SOURCE", staffId: "S1", weekday: "MONDAY", shiftStart: "09:00", shiftEnd: "17:00",
  segmentIndex: 1, requiredWorkMinutes: 420, allowedBreakMinutes: 60, active: true, effectiveFrom: "2026-10-13", effectiveTo: "" };
function fixture(extra = []) {
  const e = runtime().StaffSchedulingPhase2;
  const staff = ["S1", "S2"].map(staffId => ({ staffId, staffName: staffId, branchId: "B1", active: true }));
  const repo = e.createMemoryRepository({ staff, schedules: [shift, ...extra].map(row => e.validateScheduleSegment(row, { staff: staff.find(item => item.staffId === row.staffId) })) });
  const counts = {}; let serial = 0;
  for (const name of ["listSchedules", "getSchedule", "getStaff"]) {
    const fn = repo[name]; repo[name] = (...args) => { counts[name] = (counts[name] || 0) + 1; return fn(...args); };
  }
  repo.saveCopiedSchedules = records => { counts.batchWrites = (counts.batchWrites || 0) + 1; records.forEach(repo.saveSchedule); };
  const service = e.createService({ repository: repo, actorResolver: () => ({ actorId: "owner", owner: true }), uuid: () => String(++serial) });
  const data = { staffId: "S1", fromWeekday: "MONDAY", toWeekdays: ["TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"], effectiveFrom: "2026-10-13", requestId: "COPY-1", reason: "owner copy" };
  return { e, repo, service, counts, data };
}
test("copying four weekdays reads schedules once, validates then writes once, and replays without writing", () => {
  const h = fixture(); const result = h.service.execute("copyScheduleDay", h.data);
  assert.equal(result.count, 4);
  assert.deepEqual(h.counts, { getStaff: 1, listSchedules: 1, batchWrites: 1 });
  assert.equal(new Set(result.schedules.map(x => x.scheduleId)).size, 4);
  assert.equal(h.service.execute("copyScheduleDay", h.data).idempotentReplay, true);
  assert.equal(h.counts.batchWrites, 1);
});
test("employee copy checks each employee once and shares one schedule snapshot", () => {
  const h = fixture(); const result = h.service.execute("copyEmployeeSchedule", { ...h.data, sourceStaffId: "S1", targetStaffId: "S2" });
  assert.equal(result.schedules[0].staffId, "S2");
  assert.deepEqual(h.counts, { getStaff: 2, listSchedules: 1, batchWrites: 1 });
});
test("a conflict in any target rejects the entire copy before writing", () => {
  const h = fixture([{ ...shift, scheduleId: "TARGET", weekday: "THURSDAY" }]);
  const before = JSON.stringify(h.repo.state);
  assert.throws(() => h.service.execute("copyScheduleDay", h.data), error => /CONFLICT|DUPLICATE/.test(error.code));
  assert.equal(JSON.stringify(h.repo.state), before);
  assert.equal(h.counts.batchWrites, undefined);
});
test("audit failure rolls all copied schedules and idempotency back", () => {
  const h = fixture(); const before = JSON.stringify(h.repo.state);
  h.repo.appendAudit = () => { throw Error("audit failure"); };
  assert.throws(() => h.service.execute("copyScheduleDay", h.data), /audit failure/);
  assert.equal(JSON.stringify(h.repo.state), before);
});
test("copy keeps overnight conflict checks across the following weekday", () => {
  const h = fixture([{ ...shift, scheduleId: "EARLY", weekday: "WEDNESDAY", shiftStart: "01:00", shiftEnd: "03:00", requiredWorkMinutes: 120, allowedBreakMinutes: 0 }]);
  h.repo.state.schedules[0] = h.e.validateScheduleSegment({ ...shift, shiftStart: "22:00", shiftEnd: "02:00", requiredWorkMinutes: 240, allowedBreakMinutes: 0 }, { staff: h.repo.state.staff[0] });
  assert.throws(() => h.service.execute("copyScheduleDay", { ...h.data, toWeekdays: ["TUESDAY"] }), { code: "SCHEDULE_SHIFT_CONFLICT" });
  assert.equal(h.counts.batchWrites, undefined);
});
test("copied UUIDs are reserved before persistence and collision exhaustion writes nothing", () => {
  const h = fixture(), e = runtime().StaffSchedulingPhase2;
  const service = e.createService({ repository: h.repo, actorResolver: () => ({ actorId: "owner", owner: true }), uuid: () => "SAME" });
  assert.throws(() => service.execute("copyScheduleDay", h.data), { code: "SCHEDULE_ID_ALLOCATION_FAILED" });
  assert.equal(h.repo.state.schedules.length, 1);
  assert.equal(h.counts.batchWrites, undefined);
});
function sheetFixture() {
  const c = runtime(true), headers = Array.from(c.StaffSchedulingPhase2.PHASE2_SHEET_SCHEMAS.BARBER_SCHEDULE).concat("EXTRA_COLUMN");
  const rows = [headers.slice()]; let writes = 0, max = 20, partialFail = false;
  const sheet = {
    getLastColumn: () => headers.length, getLastRow: () => rows.length, getMaxRows: () => max,
    insertRowsAfter: (_row, count) => { max += count; }, deleteRow: n => rows.splice(n - 1, 1),
    getRange: (r, col, height = 1, width = 1) => ({
      getValues: () => Array.from({ length: height }, (_, i) => Array.from({ length: width }, (_, j) => rows[r + i - 1]?.[col + j - 1] ?? "")),
      getValue: () => rows[r - 1]?.[col - 1] ?? "",
      setValues: values => {
        writes++;
        values.forEach((row, i) => { if (partialFail && i > 0) throw Error("partial write"); rows[r + i - 1] = row.slice(); });
      }
    })
  };
  c.SpreadsheetApp = { getActive: () => ({ getSheetByName: () => sheet }) };
  c.PropertiesService = { getScriptProperties: () => ({ setProperty() {}, deleteProperty() {} }) };
  const repo = c.schedulePhase2CreateRepository();
  return { c, rows, headers, repo, writes: () => writes, fail: () => { partialFail = true; } };
}
test("production adapter writes copied rows in one range, preserving positional headers and blank extension columns", () => {
  const h = sheetFixture();
  h.c.schedulePhase2WithTransaction({ requestId: "BATCH", action: "copyScheduleDay" }, () => h.repo.saveCopiedSchedules([
    { ...shift, scheduleId: "A" }, { ...shift, scheduleId: "B", weekday: "TUESDAY" }
  ]));
  assert.equal(h.writes(), 1);
  assert.equal(h.rows.length, 3);
  assert.equal(h.rows[1][0], "A"); assert.equal(h.rows[2][0], "B");
  assert.equal(h.rows[1].at(-1), ""); assert.deepEqual(h.rows[0], h.headers);
});
test("production adapter compensates a partial range write", () => {
  const h = sheetFixture(); h.fail();
  assert.throws(() => h.c.schedulePhase2WithTransaction({ requestId: "BATCH", action: "copyScheduleDay" }, () => h.repo.saveCopiedSchedules([
    { ...shift, scheduleId: "A" }, { ...shift, scheduleId: "B" }
  ])), /partial write/);
  assert.equal(h.rows.length, 1);
});
test("production adapter rejects duplicate identities and unguarded writes", () => {
  const h = sheetFixture();
  assert.throws(() => h.repo.saveCopiedSchedules([shift]), { code: "SCHEDULE_TRANSACTION_REQUIRED" });
  assert.throws(() => h.c.schedulePhase2WithTransaction({ requestId: "BATCH" }, () => h.repo.saveCopiedSchedules([shift, shift])), { code: "SCHEDULE_ENTITY_ID_AMBIGUOUS" });
  assert.equal(h.writes(), 0);
});
test("confirmed copies render immediately; refresh uses only range and audit and keeps saved rows on failure", async () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../public/assets/js/pages/schedule-management.js"), "utf8");
  const calls = [], statuses = []; let rendered = false;
  const c = vm.createContext({
    state: { schedules: [], selectedRequestSequence: 0, weeklyLoading: false }, selectedStaff: () => ({ staffId: "S1" }),
    byId: () => ({ value: "2026-10-13" }), renderWeekly: () => { rendered = true; }, renderRange() {}, renderAudit() {},
    loadSelected: () => { throw Error("unexpected full reload"); }, setStatus: value => statuses.push(value),
    api: action => { assert.equal(rendered, true); calls.push(action); return action === "resolveStaffSchedulesRange" ? Promise.reject(Error("temporary")) : Promise.resolve({ audit: [] }); }
  });
  vm.runInContext(source.match(/async function refreshCopiedSelection\(result\) \{[\s\S]*?\n  \}/)[0], c);
  await c.refreshCopiedSelection({ schedules: [{ ...shift, scheduleId: "COPY" }] });
  assert.deepEqual(calls, ["resolveStaffSchedulesRange", "getScheduleAuditHistory"]);
  assert.equal(c.state.schedules[0].scheduleId, "COPY");
  assert.match(statuses.at(-1), /تم حفظ النسخ/); assert.match(statuses.at(-1), /لا تعِد النسخ/);
});
