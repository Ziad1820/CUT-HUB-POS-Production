const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const coreSource = fs.readFileSync(path.join(root, "public/assets/js/core/staff-import-preview.js"), "utf8");
const gasSource = fs.readFileSync(path.join(root, "scripts/staff-import-preview-staging.js"), "utf8");
const STAFF_HEADERS = ["NAME", "CODE", "SALARY", "PERCENTAGE", "ID", "BONUS", "DEDUCTION",
  "ACTIVE", "CREATED_AT", "UPDATED_AT", "IS_BARBER", "BRANCH_ID"];
const BRANCH_HEADERS = ["BRANCH_ID", "BRANCH_NAME", "ACTIVE"];
const TIMESTAMP = "2026-08-03T12:00:00.000Z";

function approvedRows(branchId = "BRANCH-CANONICAL") {
  return [
    ["osama", "C07", 1500, "1", true],
    ["yousef", "C06", 1500, "2", true],
    ["el tamemy", "C08", 1250, "3", false],
    ["Eleby", "C05", 2250, "5", true],
    ["Hossam", "C04", 3000, "6", false],
    ["khaled", "C01", 1250, "7", true]
  ].map(([name, code, salary, id, barber]) => ({
    NAME: name, CODE: code, SALARY: salary, PERCENTAGE: 0, ID: id,
    BONUS: 0, DEDUCTION: 0, ACTIVE: true, CREATED_AT: TIMESTAMP,
    UPDATED_AT: TIMESTAMP, IS_BARBER: barber, BRANCH_ID: branchId
  }));
}

function harness(options = {}) {
  let sheetReads = 0;
  const spreadsheet = { getId: () => "STAGING_SPREADSHEET_ID_12345" };
  const context = {
    console,
    StaffSchedulingPhase2: { PHASE2_SHEET_SCHEMAS: { STAFF: STAFF_HEADERS } },
    BookingAvailabilityPhase5: { SHEET_SCHEMAS: { BOOKING_BRANCH_REGISTRY: BRANCH_HEADERS } },
    getCutHubEnvironmentConfig: () => ({
      environment: options.environment || "staging",
      spreadsheetId: "STAGING_SPREADSHEET_ID_12345",
      stagingSpreadsheetId: "STAGING_SPREADSHEET_ID_12345"
    }),
    assertStagingEnvironment: () => ({
      config: { environment: "staging" }, spreadsheet
    }),
    Session: {
      getEffectiveUser: () => ({ getEmail: () => "owner@example.com" }),
      getActiveUser: () => ({ getEmail: () => "owner@example.com" })
    },
    DriveApp: { getFileById: () => ({ getOwner: () => ({ getEmail: () => "owner@example.com" }) }) },
    schedulePhase2AssertHeaders: () => { sheetReads += 1; },
    schedulePhase2ReadRows: name => {
      sheetReads += 1;
      if (name === "STAFF") return options.existingRows || [];
      if (name === "BOOKING_BRANCH_REGISTRY") return options.branches === undefined
        ? [{ branchId: "BRANCH-CANONICAL", branchName: "CUT HUB", active: true }]
        : options.branches;
      return [];
    }
  };
  vm.createContext(context);
  vm.runInContext(coreSource, context);
  vm.runInContext(gasSource, context);
  return { context, getSheetReads: () => sheetReads };
}

test("valid Staging contract returns exactly six zero-write append operations", () => {
  const { context } = harness();
  const result = context.previewStaffImportStaging({ proposedRows: approvedRows() });
  assert.equal(result.safe, true);
  assert.equal(result.dryRun, true);
  assert.equal(result.writes, 0);
  assert.equal(result.sourceCount, 6);
  assert.equal(result.proposedCount, 6);
  assert.equal(result.appendOperations.length, 6);
  assert.ok(result.appendOperations.every(operation => operation.type === "APPEND_ROW" && operation.sheetName === "STAFF"));
});

test("matching rows are idempotently unchanged and conflicts are rejected", () => {
  const rows = approvedRows();
  const existingRows = rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => {
    const camel = key.toLowerCase().replace(/_([a-z])/g, (_m, letter) => letter.toUpperCase());
    return [camel, value];
  })));
  const matching = harness({ existingRows }).context.previewStaffImportStaging({ proposedRows: rows });
  assert.equal(matching.safe, true);
  assert.equal(matching.proposedCount, 0);
  assert.equal(matching.unchangedCount, 6);
  assert.equal(matching.appendOperations.length, 0);

  existingRows[0].salary = 999;
  const conflict = harness({ existingRows }).context.previewStaffImportStaging({ proposedRows: rows });
  assert.equal(conflict.safe, false);
  assert.ok(conflict.errors.some(error => error.code === "STAFF_IMPORT_EXISTING_ID_CONFLICT"));
});

test("duplicate IDs and case-insensitive codes are rejected", () => {
  const rows = approvedRows();
  rows[1].ID = rows[0].ID;
  rows[2].CODE = rows[0].CODE.toLowerCase();
  const result = harness().context.previewStaffImportStaging({ proposedRows: rows });
  assert.equal(result.safe, false);
  assert.ok(result.errors.some(error => error.code === "STAFF_IMPORT_DUPLICATE_ID"));
  assert.ok(result.errors.some(error => error.code === "STAFF_IMPORT_DUPLICATE_CODE"));
});

test("missing canonical values and invalid timestamps are rejected", () => {
  const rows = approvedRows();
  rows[0].NAME = "";
  rows[1].IS_BARBER = "TRUE";
  rows.forEach(row => { row.CREATED_AT = "not-a-date"; row.UPDATED_AT = "not-a-date"; });
  const result = harness().context.previewStaffImportStaging({ proposedRows: rows });
  assert.equal(result.safe, false);
  assert.ok(result.errors.some(error => error.code === "STAFF_IMPORT_APPROVED_ROW_REQUIRED_VALUE_INVALID"));
  assert.ok(result.errors.some(error => error.code === "STAFF_IMPORT_TIMESTAMP_INVALID"));
});

test("zero, multiple, inactive, or mismatched canonical branches fail closed", () => {
  for (const branches of [[], [
    { branchId: "A", active: true }, { branchId: "B", active: true }
  ], [{ branchId: "BRANCH-CANONICAL", active: false }]]) {
    const result = harness({ branches }).context.previewStaffImportStaging({ proposedRows: approvedRows() });
    assert.equal(result.safe, false);
    assert.equal(result.errors[0].code, "STAFF_IMPORT_CANONICAL_BRANCH_COUNT_INVALID");
  }
  const mismatch = harness().context.previewStaffImportStaging({ proposedRows: approvedRows("WRONG") });
  assert.equal(mismatch.safe, false);
  assert.ok(mismatch.errors.some(error => error.code === "STAFF_IMPORT_APPROVED_ROW_CONTRACT_INVALID"));
});

test("Production is blocked before any Spreadsheet access", () => {
  const instance = harness({ environment: "production" });
  const result = instance.context.previewStaffImportStaging({ proposedRows: approvedRows() });
  assert.equal(result.safe, false);
  assert.equal(result.errors[0].code, "STAFF_IMPORT_STAGING_ONLY");
  assert.equal(instance.getSheetReads(), 0);
});

test("server Preview source exposes no execute or write path", () => {
  assert.doesNotMatch(gasSource, /function\s+execute|appendRow|setValues|setValue|clearContent|deleteRow|insertSheet/);
  assert.match(gasSource, /schedulePhase2ReadRows\("STAFF"\)/);
  assert.match(gasSource, /dryRun:\s*true/);
  assert.match(gasSource, /writes:\s*0/);
});
