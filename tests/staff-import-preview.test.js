const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const previewModule = require("../public/assets/js/core/staff-import-preview.js");

const LEGACY = Object.freeze([
  { id: 1, name: "osama", code: "C07", salary: 1500, isBarber: true },
  { id: 2, name: "yousef", code: "C06", salary: 1500, isBarber: true },
  { id: 3, name: "el tamemy", code: "C08", salary: 1250, isBarber: false },
  { id: 4, name: "anas", code: "C06", salary: 0, isBarber: false },
  { id: 5, name: "Eleby", code: "C05", salary: 2250, isBarber: true },
  { id: 6, name: "Hossam", code: "C04", salary: 3000, isBarber: false },
  { id: 7, name: "khaled", code: "C01", salary: 1250, isBarber: true }
]);

const DEFAULTS = Object.freeze({ percentage: 0, bonus: 0, deduction: 0, active: true });
const TIMESTAMP = "2026-08-03T12:00:00.000Z";

function branches(records = LEGACY) {
  return Object.fromEntries(records.map(record => [String(record.id), "BR-CAIRO"]));
}

function preview(sourceRecords = LEGACY, overrides = {}) {
  return previewModule.previewLegacyStaffImport({
    sourceRecords,
    existingStaffRows: [],
    branchById: branches(sourceRecords),
    defaultsConfirmed: true,
    defaults: DEFAULTS,
    importTimestamp: TIMESTAMP,
    ...overrides
  });
}

test("confirmed legacy snapshot is blocked by duplicate C06", () => {
  const result = preview();
  assert.equal(result.dryRun, true);
  assert.equal(result.writes, 0);
  assert.equal(result.safe, false);
  assert.deepEqual(
    result.duplicateConflicts.filter(item => item.code === "STAFF_IMPORT_DUPLICATE_CODE"),
    [{ code: "STAFF_IMPORT_DUPLICATE_CODE", staffCode: "C06", sourceIndexes: [1, 3] }]
  );
});

test("explicit operator exclusion removes only ID 4 from the plan without mutating the source", () => {
  const sourceBefore = JSON.stringify(LEGACY);
  const result = preview(LEGACY, { excludedSourceIds: ["4"] });
  assert.equal(result.sourceCount, 7);
  assert.equal(result.excludedCount, 1);
  assert.equal(result.proposedCount, 6);
  assert.equal(result.operationCount, 6);
  assert.equal(result.safe, true);
  assert.deepEqual(result.excludedRecords.map(item => item.sourceId), ["4"]);
  assert.deepEqual(result.duplicateConflicts, []);
  assert.deepEqual(result.proposedRows.map(row => row.CODE), ["C07", "C06", "C08", "C05", "C04", "C01"]);
  assert.deepEqual(result.proposedRows.map(row => row.ID), ["1", "2", "3", "5", "6", "7"]);
  assert.equal(JSON.stringify(LEGACY), sourceBefore);
});

test("exclusions use canonical IDs and invalid exclusions or branches fail closed", () => {
  const missingExclusion = preview(LEGACY, { excludedSourceIds: ["missing"] });
  assert.equal(missingExclusion.safe, false);
  assert.ok(missingExclusion.errors.some(error => error.code === "STAFF_IMPORT_EXCLUSION_NOT_FOUND"));

  const invalidBranch = preview([LEGACY[0]], {
    validBranchIds: ["CANONICAL-BRANCH"],
    branchById: { "1": "INVENTED-BRANCH" }
  });
  assert.equal(invalidBranch.safe, false);
  assert.ok(invalidBranch.errors.some(error => error.code === "STAFF_IMPORT_BRANCH_INVALID"));
});

test("duplicate canonical IDs are rejected", () => {
  const records = [
    { id: "STAFF-1", name: "One", code: "C01", salary: 1, isBarber: true },
    { id: "STAFF-1", name: "Two", code: "C02", salary: 2, isBarber: false }
  ];
  const result = preview(records);
  assert.equal(result.safe, false);
  assert.ok(result.errors.some(error => error.code === "STAFF_IMPORT_DUPLICATE_ID"));
});

test("an explicit branch is required for every source record", () => {
  const records = [{ id: "STAFF-1", name: "One", code: "C01", salary: 1, isBarber: true }];
  const result = preview(records, { branchById: {} });
  assert.equal(result.safe, false);
  assert.ok(result.errors.some(error => error.code === "STAFF_IMPORT_BRANCH_REQUIRED"));
});

test("unconfirmed or unresolved defaults block preview", () => {
  const records = [{ id: "STAFF-1", name: "One", code: "C01", salary: 1, isBarber: true }];
  const result = preview(records, { defaultsConfirmed: false, defaults: { percentage: 0 } });
  assert.equal(result.safe, false);
  assert.ok(result.errors.some(error => error.code === "STAFF_IMPORT_DEFAULTS_UNCONFIRMED"));
  assert.ok(result.errors.some(error => error.code === "STAFF_IMPORT_DEFAULT_UNRESOLVED" && error.field === "bonus"));
});

test("mapping preserves IDs and applies only confirmed canonical defaults", () => {
  const records = [{ id: 91, name: " One ", code: " c01 ", salary: 1200, isBarber: false }];
  const result = preview(records);
  assert.equal(result.safe, true);
  assert.equal(result.operationCount, 1);
  assert.deepEqual(result.proposedRows[0], {
    NAME: "One", CODE: "C01", SALARY: 1200, PERCENTAGE: 0, ID: "91",
    BONUS: 0, DEDUCTION: 0, ACTIVE: true,
    CREATED_AT: TIMESTAMP, UPDATED_AT: TIMESTAMP,
    IS_BARBER: false, BRANCH_ID: "BR-CAIRO"
  });
});

test("existing ID or code conflicts never become silent overwrites", () => {
  const records = [{ id: "STAFF-1", name: "New", code: "C01", salary: 1, isBarber: true }];
  const result = preview(records, {
    existingStaffRows: [{ ID: "STAFF-1", NAME: "Existing", CODE: "C01", SALARY: 99 }]
  });
  assert.equal(result.safe, false);
  assert.equal(result.proposedRows.length, 0);
  assert.ok(result.errors.some(error => error.code === "STAFF_IMPORT_EXISTING_ID_CONFLICT"));
});

test("a repeated import plan is idempotent by ID and unique code", () => {
  const records = [
    { id: "STAFF-1", name: "One", code: "C01", salary: 1, isBarber: true },
    { id: "STAFF-2", name: "Two", code: "C02", salary: 2, isBarber: false }
  ];
  const first = preview(records);
  assert.equal(first.safe, true);
  assert.equal(first.operationCount, 2);
  const second = preview(records, {
    existingStaffRows: first.proposedRows,
    importTimestamp: "2026-08-04T12:00:00.000Z"
  });
  assert.equal(second.safe, true);
  assert.equal(second.operationCount, 0);
  assert.equal(second.alreadyPresentCount, 2);
});

test("preview implementation has no browser-storage mutation or remote-write API", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../public/assets/js/core/staff-import-preview.js"), "utf8"
  );
  assert.doesNotMatch(source, /localStorage\.(?:setItem|removeItem|clear)/);
  assert.doesNotMatch(source, /sessionStorage\.(?:setItem|removeItem|clear)/);
  assert.doesNotMatch(source, /indexedDB|fetch\(|RomeoApi\.request|saveStaff/);
  assert.doesNotMatch(source, /name[^\n]+identity/i);
});

test("CODE uniqueness is required by code-based cashier and withdrawal matching", () => {
  const cashier = fs.readFileSync(path.join(__dirname, "../public/assets/js/pages/cashier.js"), "utf8");
  const withdrawals = fs.readFileSync(path.join(__dirname, "../public/assets/js/pages/withdrawals.js"), "utf8");
  assert.match(cashier, /BARBER_NAMES_BY_CODE/);
  assert.match(cashier, /String\(staff\.code/);
  assert.match(withdrawals, /String\(staff\.code[^\n]+=== staffCode/);
  assert.equal(previewModule.previewLegacyStaffImport({}).uniqueness.code, "REQUIRED_UNIQUE_CASE_INSENSITIVE");
});

test("staff accounting exposes preview only and keeps Reset Data unchanged", () => {
  const html = fs.readFileSync(path.join(__dirname, "../public/pages/staff-accounting.html"), "utf8");
  assert.match(html, /id="importPreviewBtn"/);
  assert.match(html, /id="staffImportPreviewDialog"/);
  assert.match(html, /core\/staff-import-preview\.js/);
  assert.match(html, /id="resetBtn"/);
  assert.match(html, /OPERATOR_EXCLUSION_RULE\s*=\s*Object\.freeze\(\{ code: "C06", salary: 0, isBarber: false \}\)/);
  assert.match(html, /resolveOperatorExcludedStaffIds/);
  assert.doesNotMatch(html, /OPERATOR_EXCLUDED_STAFF_(?:NAMES|CODES)/);
  assert.doesNotMatch(html, /OPERATOR_EXCLUSION_RULE[^\n]+name/i);
  assert.doesNotMatch(html, /executeStaffImport|commitStaffImport|clearLegacyStaffStorage/);
  const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1].trim())
    .filter(Boolean);
  inlineScripts.forEach(source => assert.doesNotThrow(() => new vm.Script(source)));
});
