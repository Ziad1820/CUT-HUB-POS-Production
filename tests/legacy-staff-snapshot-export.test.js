const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(
  path.join(__dirname, "../public/pages/staff-accounting.html"), "utf8"
);

function inlineScript(id) {
  const match = html.match(new RegExp(`<script id="${id}">([\\s\\S]*?)<\\/script>`));
  assert.ok(match, `missing inline script ${id}`);
  return match[1];
}

const logicSource = inlineScript("legacyStaffSnapshotExportLogic");
const uiSource = inlineScript("legacyStaffSnapshotExportUi");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(logicSource, context);
const exporter = context.window.LegacyStaffSnapshotExport;

function storageWith(value) {
  const calls = [];
  const mutations = [];
  return {
    calls,
    mutations,
    getItem(key) { calls.push(key); return value; },
    setItem(...args) { mutations.push(["setItem", ...args]); },
    removeItem(...args) { mutations.push(["removeItem", ...args]); },
    clear(...args) { mutations.push(["clear", ...args]); }
  };
}

test("missing key returns the controlled NOT_FOUND state", () => {
  const result = exporter.read(storageWith(null));
  assert.equal(result.status, "LEGACY_STAFF_SOURCE_NOT_FOUND");
  assert.equal(result.validation.recordCount, 0);
  assert.deepEqual(Array.from(result.records), []);
});

test("invalid JSON or a non-record collection returns the controlled INVALID state", () => {
  assert.equal(exporter.read(storageWith("{")) .status, "LEGACY_STAFF_SOURCE_INVALID");
  assert.equal(exporter.read(storageWith(JSON.stringify({ id: 1 }))).status,
    "LEGACY_STAFF_SOURCE_INVALID");
  assert.equal(exporter.read(storageWith(JSON.stringify([null]))).status,
    "LEGACY_STAFF_SOURCE_INVALID");
});

test("extraction reads only the permitted key and invokes no storage mutation", () => {
  const storage = storageWith("[]");
  const result = exporter.read(storage);
  assert.equal(result.status, "ACTUAL_LEGACY_STAFF_SNAPSHOT_FOUND");
  assert.deepEqual(storage.calls, ["romeo-pos-staff-accounting-v2"]);
  assert.deepEqual(storage.mutations, []);
});

test("export contains only approved fields and excludes private local-only fields", () => {
  const source = [{
    staffId: "7", staffName: "Nour", staffCode: "C07", salaries: 1500,
    salaryPercentage: 12, bonus: 3, debt: 4, isBarber: true,
    customers: [{ secret: true }], totalSales: 9999, withdraw: 800,
    attendanceDeduction: 25, unrelated: "private"
  }];
  const result = exporter.read(storageWith(JSON.stringify(source)));
  assert.deepEqual(Object.keys(result.records[0]).sort(),
    ["bonus", "code", "deduction", "id", "isBarber", "name", "percentage", "salary"]);
  assert.deepEqual(JSON.parse(JSON.stringify(result.records[0])), {
    id: "7", name: "Nour", code: "C07", salary: 1500,
    percentage: 12, bonus: 3, deduction: 4, isBarber: true
  });
  const serialized = JSON.stringify(result);
  for (const forbidden of ["customers", "totalSales", "withdraw", "attendanceDeduction", "unrelated", "secret"]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});

test("missing and duplicate identities are reported without generating IDs", () => {
  const source = [
    { id: " A ", name: "One", code: " c06 ", isBarber: false },
    { staffId: "A", staffName: "Two", staffCode: "C06", isBarber: true },
    { name: "Three", code: "C03", isBarber: false },
    { id: "D", code: "C04", isBarber: true },
    { id: "E", name: "Five", isBarber: true }
  ];
  const sourceBefore = JSON.stringify(source);
  const result = exporter.read(storageWith(sourceBefore));
  assert.equal(result.records.length, 5);
  assert.equal(result.records[2].id, null);
  assert.deepEqual(Array.from(result.validation.missingIds), [3]);
  assert.deepEqual(Array.from(result.validation.missingNames), [4]);
  assert.deepEqual(Array.from(result.validation.missingCodes), [5]);
  assert.deepEqual(JSON.parse(JSON.stringify(result.validation.duplicateIds)),
    [{ value: "A", recordNumbers: [1, 2] }]);
  assert.deepEqual(JSON.parse(JSON.stringify(result.validation.duplicateCodes)),
    [{ value: "C06", recordNumbers: [1, 2] }]);
  assert.equal(JSON.stringify(source), sourceBefore);
});

test("C06 and non-barber records are reported but remain in the snapshot", () => {
  const source = [
    { id: 1, name: "One", code: "C06", isBarber: false },
    { id: 2, name: "Two", code: "C02", isBarber: true }
  ];
  const result = exporter.read(storageWith(JSON.stringify(source)));
  assert.equal(result.records.length, 2);
  assert.equal(result.records[0].isBarber, false);
  assert.deepEqual(JSON.parse(JSON.stringify(result.validation.c06Records)), [
    { recordNumber: 1, id: 1, code: "C06", review: "HUMAN_REVIEW_REQUIRED" }
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(result.validation.nonBarberRecords)), [
    { recordNumber: 1, id: 1 }
  ]);
});

test("selected source values remain exact and are not normalized in the export", () => {
  const source = [{
    staffId: " 007 ", staffName: "  Ahmed Ali  ", staffCode: " c07 ",
    salaries: "1500.00", salaryPercentage: " 12 ", bonus: "03",
    lateDiscount: " 5 ", isBarber: false
  }];
  const result = exporter.read(storageWith(JSON.stringify(source)));
  assert.deepEqual(JSON.parse(JSON.stringify(result.records[0])), {
    id: " 007 ", name: "  Ahmed Ali  ", code: " c07 ", salary: "1500.00",
    percentage: " 12 ", bonus: "03", deduction: " 5 ", isBarber: false
  });
});

test("temporary export UI is authenticated-surface-only and has no remote or write path", () => {
  assert.match(html, /RomeoAuth\.requireAuth\("view_staff_accounting"\)/);
  assert.match(html, /id="legacyStaffSnapshotBtn"/);
  assert.match(html, /id="legacyStaffSnapshotDialog"/);
  assert.match(html, /TEMPORARY STAFF BOOTSTRAP SUPPORT/);
  const exportSources = logicSource + "\n" + uiSource;
  assert.doesNotMatch(exportSources, /localStorage\.(?:setItem|removeItem|clear)/);
  assert.doesNotMatch(exportSources, /sessionStorage|indexedDB/);
  assert.doesNotMatch(exportSources, /RomeoApi|fetch\s*\(|XMLHttpRequest|saveStaff|executeStaffImport|commitStaffImport/);
  assert.doesNotMatch(exportSources, /innerHTML/);
  assert.match(exportSources, /navigator\.clipboard\.writeText/);
  assert.doesNotThrow(() => new vm.Script(logicSource));
  assert.doesNotThrow(() => new vm.Script(uiSource));
});
