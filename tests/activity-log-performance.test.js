"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm");
function ui(request) {
  const html = fs.readFileSync(process.env.CUT_HUB_ACTIVITY_SOURCE_OVERRIDE || "public/pages/activity-log.html", "utf8");
  const elements = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m => [m[1], { value: "", textContent: "", innerHTML: "", dataset: {}, addEventListener() {} }]));
  const c = vm.createContext({ RomeoApi: { request }, RomeoAuth: { requireAuth() {} }, URLSearchParams,
    document: { getElementById: id => elements[id], body: { dataset: { language: "ar" } } },
    localStorage: { getItem: () => null }, window: { location: { search: "" }, addEventListener() {} },
    console: { info() {} }, confirm: () => true, alert() {}, elements });
  const source = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes('RomeoAuth.requireAuth("view_activity_log")'));
  vm.runInContext(source.replace(/    loadLogs\(\);\s*$/, "") + '\nfunction inspect(){return {logs:state.logs,filtered:state.filtered,offset:state.offset,hasMore:state.hasMore,selected:[...state.selectedIds]};}', c);
  return c;
}
const row = (id, action = "create") => ({ logId: id, rowNumber: Number(id) + 2, action, entityType: "invoice", displayName: "Fixture", details: "Test record", createdAt: "2026-10-15 10:00:00" });
const page = (rows, hasMore = true) => ({ status: "success", logs: rows, hasMore });
test("repeated refresh and repeated more share one request and consume each page once", async () => {
  const calls = [], finishes = [], c = ui(p => { calls.push(p); return new Promise(r => finishes.push(r)); });
  const first = c.loadLogs(); assert.equal(c.loadLogs(), first); finishes[0](page([row("1")])); await first;
  const more = c.loadLogs({ append: true }); assert.equal(c.loadLogs({ append: true }), more);
  assert.equal(calls.length, 2); assert.equal(calls[1].offset, 1);
  finishes[1](page([row("2")], false)); await more;
  assert.equal(c.inspect().logs.length, 2); assert.equal(c.inspect().offset, 2); assert.equal(c.elements.loadMoreBtn.disabled, false);
  await c.loadLogs({ append: true }); assert.equal(calls.length, 2);
});
test("refresh supersedes an older more response with just one pending refresh", async () => {
  let finish, calls = 0; const c = ui(() => { calls++; return new Promise(r => finish = r); });
  const first = c.loadLogs(); finish(page([row("1")])); await first;
  const more = c.loadLogs({ append: true }), oldFinish = finish;
  const refresh = c.loadLogs(); assert.equal(c.loadLogs(), refresh);
  oldFinish(page([row("2")])); await more;
  assert.equal(c.inspect().logs.length, 1); assert.equal(calls, 3);
  finish(page([row("3")], false)); await refresh;
  assert.deepEqual(Array.from(c.inspect().logs, r => r.logId), ["3"]);
});
test("failed refresh and more retain rows, cursor, metrics and selection, then allow retry", async () => {
  let fail = false; const c = ui(async () => fail ? { status: "error", message: "private source details" } : page([row("1")]));
  await c.loadLogs(); vm.runInContext('state.selectedIds.add("1")', c);
  const before = c.elements.logsBody.innerHTML; fail = true;
  await c.loadLogs(); await c.loadLogs({ append: true });
  assert.equal(c.elements.logsBody.innerHTML, before); assert.equal(c.inspect().offset, 1);
  assert.deepEqual(Array.from(c.inspect().selected), ["1"]); assert.equal(c.elements.totalLogs.textContent, 1);
  assert.ok(c.elements.logsStatus.textContent); assert.doesNotMatch(c.elements.logsStatus.textContent, /private/);
  fail = false; await c.loadLogs(); assert.equal(c.elements.logsStatus.textContent, "");
});
test("newly appended audit entries overlapping pages are displayed once", async () => {
  let n = 0; const c = ui(async () => n++ ? page([row("2"), row("3")], false) : page([row("1"), row("2")]));
  await c.loadLogs(); await c.loadLogs({ append: true });
  assert.equal(c.inspect().logs.length, 3); assert.equal(c.inspect().offset, 4);
});
test("a successful empty response ends the loading state and shows the empty result", async () => {
  const c = ui(async () => page([], false)); await c.loadLogs();
  assert.equal(c.elements.logsStatus.textContent, ""); assert.doesNotMatch(c.elements.logsBody.innerHTML, /جاري تحميل/);
  assert.match(c.elements.logsBody.innerHTML, /لا توجد عمليات/); assert.equal(c.inspect().hasMore, false);
});
test("cached search preserves combined date, entity, action filters and metrics without a request", async () => {
  let calls = 0; const c = ui(async () => { calls++; return page([row("1"), row("2", "delete")], false); });
  await c.loadLogs(); c.elements.searchInput.value = "fixture"; c.elements.entityFilter.value = "invoice";
  c.elements.actionFilter.value = "delete"; c.elements.fromDate.value = "2026-10-15"; c.elements.toDate.value = "2026-10-15";
  c.applyFilters(); assert.equal(c.inspect().filtered.length, 1); assert.equal(c.elements.deleteLogs.textContent, 1);
  c.elements.fromDate.value = "2026-10-16"; c.applyFilters(); assert.equal(c.inspect().filtered.length, 0); assert.equal(calls, 1);
});
test("single deletion is submitted once, blocks competing writes and reloads after success", async () => {
  const calls = []; let finishWrite;
  const c = ui(p => { calls.push(p.action); return p.action === "deleteActivityLog" ? new Promise(r => finishWrite = r) : Promise.resolve(page([row("1")], false)); });
  await c.loadLogs(); const deleting = c.deleteSingleLog("1");
  await c.deleteSingleLog("1"); await c.deleteSelectedLogs(); await c.loadLogs();
  assert.deepEqual(calls, ["getActivityLogs", "deleteActivityLog"]);
  finishWrite({ status: "success" }); await deleting;
  assert.deepEqual(calls, ["getActivityLogs", "deleteActivityLog", "getActivityLogs"]);
});
test("deletion cannot race an in-flight read, and failed writes are never retried", async () => {
  let finish; const calls = [], c = ui(p => { calls.push(p.action); return p.action === "getActivityLogs" ? new Promise(r => finish = r) : Promise.resolve({ status: "error" }); });
  const reading = c.loadLogs(); await c.deleteSingleLog("1"); finish(page([row("1")])); await reading;
  await c.deleteSingleLog("1"); assert.deepEqual(calls, ["getActivityLogs", "deleteActivityLog"]); assert.equal(c.inspect().logs.length, 1);
});
test("backend audit reads remain bounded to the requested page with stable identity and newest-first order", () => {
  const ranges = [], rows = Array.from({ length: 1001 }, (_, i) => [String(i), "create", "invoice", "", "Fixture", "Fixture", "details", "time"]);
  const c = vm.createContext({ SpreadsheetApp: { getActive: () => ({ getSheetByName: () => ({ getLastRow: () => rows.length, getRange: (r, col, n, w) => { ranges.push([r, col, n, w]); return { getValues: () => rows.slice(r - 1, r - 1 + n) }; } }) }) }, jsonOutput: x => x, getDisplayDateTime: String });
  vm.runInContext(fs.readFileSync("apps-script/production/009_audit_activity-log.gs", "utf8"), c);
  const result = c.getActivityLogs({ limit: 100, offset: 100 }); assert.deepEqual(ranges, [[802, 1, 100, 8]]);
  assert.equal(result.logs.length, 100); assert.equal(result.logs[0].rowNumber, 901); assert.equal(result.logs[0].logId, "900");
});
