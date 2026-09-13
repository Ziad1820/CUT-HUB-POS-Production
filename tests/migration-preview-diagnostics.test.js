const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const { buildBundle } = require("../scripts/build-booking-availability-phase5-bundle");

const ROOT = path.resolve(__dirname, "..");

function createHarness(environment = "staging") {
  const logs = [];
  const state = { environment, reads: 0, writes: 0, stagingChecks: 0 };
  const config = {
    environment,
    spreadsheetId: "staging-sheet-id-1234567890",
    stagingSpreadsheetId: "staging-sheet-id-1234567890"
  };
  const spreadsheet = {
    getId: () => config.spreadsheetId,
    getSheetByName() { state.reads += 1; return null; },
    insertSheet() { state.writes += 1; throw new Error("diagnostic preview must not create sheets"); },
    appendRow() { state.writes += 1; throw new Error("diagnostic preview must not append rows"); },
    getRange() { state.writes += 1; throw new Error("unexpected range access for a missing sheet"); }
  };
  const context = vm.createContext({
    console: { log(value) { logs.push(value); } },
    getCutHubEnvironmentConfig() {
      config.environment = state.environment;
      return config;
    },
    assertStagingEnvironment() {
      state.stagingChecks += 1;
      if (state.environment !== "staging") throw new Error("invalid staging identity");
      return { config, spreadsheet };
    },
    SpreadsheetApp: { getActive: () => spreadsheet }
  });
  vm.runInContext(buildBundle({ write: false }).bundle, context);
  return { context, logs, state };
}

const WRAPPERS = [
  ["diagnosticPreviewStaffScheduleMigration", "previewStaffScheduleMigration",
    "SCHEDULE_DIAGNOSTIC_PREVIEW_ENVIRONMENT_BLOCKED"],
  ["diagnosticPreviewAttendanceMigration", "previewAttendanceMigration",
    "ATTENDANCE_DIAGNOSTIC_PREVIEW_ENVIRONMENT_BLOCKED"],
  ["diagnosticPreviewPayrollPhase4Migration", "previewPayrollPhase4Migration",
    "PAYROLL_DIAGNOSTIC_PREVIEW_ENVIRONMENT_BLOCKED"]
];

test("diagnostic migration previews log complete JSON, return the original result, and stay zero-write", () => {
  const harness = createHarness();
  for (const [wrapperName] of WRAPPERS) {
    const beforeWrites = harness.state.writes;
    const result = harness.context[wrapperName]();
    assert.equal(harness.state.writes, beforeWrites);
    assert.equal(result.writes, 0);
    assert.equal(result.rollback.historicalRowsTouched, 0);
    assert.equal(harness.logs[harness.logs.length - 1], JSON.stringify(result, null, 2));
  }
  assert.equal(harness.logs.length, WRAPPERS.length);
  assert.equal(harness.state.stagingChecks, 5);
});

test("diagnostic wrappers delegate unchanged and return the exact preview result", () => {
  const harness = createHarness("development");
  WRAPPERS.forEach(([wrapperName, previewName], index) => {
    const sentinel = { preview: previewName, index };
    harness.context[previewName] = () => sentinel;
    const result = harness.context[wrapperName]({ ignoredByDiagnostic: true });
    assert.equal(result, sentinel);
    assert.equal(harness.logs[harness.logs.length - 1], JSON.stringify(sentinel, null, 2));
  });
  assert.equal(harness.state.stagingChecks, 0);
  assert.equal(harness.state.writes, 0);
});

test("diagnostic migration previews fail closed in production before reads or logs", () => {
  const harness = createHarness("production");
  for (const [wrapperName, , expectedCode] of WRAPPERS) {
    assert.throws(() => harness.context[wrapperName](), error => error.code === expectedCode);
  }
  assert.equal(harness.state.reads, 0);
  assert.equal(harness.state.writes, 0);
  assert.equal(harness.state.stagingChecks, 0);
  assert.deepEqual(harness.logs, []);
});

function createLiveStagingHarness(propertyOverrides = {}) {
  const logs = [];
  const state = { spreadsheetAccesses: 0, sheetReads: 0, writes: 0 };
  const properties = {
    CUT_HUB_ENVIRONMENT: "staging",
    CUT_HUB_SPREADSHEET_ID: "staging-sheet-id-1234567890",
    CUT_HUB_STAGING_SPREADSHEET_ID: "staging-sheet-id-1234567890",
    CUT_HUB_BACKEND_VERSION: "test",
    ...propertyOverrides
  };
  const spreadsheet = {
    getId: () => "staging-sheet-id-1234567890",
    getSheetByName() { state.sheetReads += 1; return null; },
    insertSheet() { state.writes += 1; throw new Error("preview must not create sheets"); }
  };
  const scriptProperties = {
    getProperty: key => properties[key] || "",
    setProperty() { state.writes += 1; throw new Error("preview must not set properties"); },
    deleteProperty() { state.writes += 1; throw new Error("preview must not delete properties"); }
  };
  const context = vm.createContext({
    console: { log(value) { logs.push(value); } },
    PropertiesService: { getScriptProperties: () => scriptProperties },
    SpreadsheetApp: {
      getActive() { state.spreadsheetAccesses += 1; return spreadsheet; }
    }
  });
  vm.runInContext(fs.readFileSync(
    path.join(ROOT, "scripts/app-script-final-owner-access.js"), "utf8"), context);
  vm.runInContext(buildBundle({ write: false }).bundle, context);
  return { context, logs, state };
}

test("live Staging Schedule diagnostic approval follows strict identity and remains zero-write", () => {
  const harness = createLiveStagingHarness();
  const result = harness.context.diagnosticPreviewStaffScheduleMigration();
  assert.equal(result.identity.environment, "staging");
  assert.equal(result.identity.expectedSpreadsheetId, result.identity.actualSpreadsheetId);
  assert.equal(result.dryRun, true);
  assert.equal(result.writes, 0);
  assert.equal(result.rollback.historicalRowsTouched, 0);
  assert.equal(result.errors.some(item => item.code === "ENVIRONMENT_NOT_APPROVED"), false);
  assert.equal(result.safe, true);
  assert.equal(result.createSheets.length, 6);
  assert.equal(result.createSheets.some(item => item.sheetName === "STAFF"), true);
  assert.equal(harness.state.writes, 0);
  assert.equal(harness.logs[0], JSON.stringify(result, null, 2));
});

test("live Staging Schedule diagnostic blocks mismatched pins and Production before sheet access", () => {
  const mismatch = createLiveStagingHarness({
    CUT_HUB_STAGING_SPREADSHEET_ID: "different-staging-sheet-1234567890"
  });
  assert.throws(
    () => mismatch.context.diagnosticPreviewStaffScheduleMigration(),
    error => error.message === "STAGING_CONFIGURATION_INVALID"
  );
  assert.equal(mismatch.state.sheetReads, 0);
  assert.equal(mismatch.state.writes, 0);

  const production = createLiveStagingHarness({ CUT_HUB_ENVIRONMENT: "production" });
  assert.throws(
    () => production.context.diagnosticPreviewStaffScheduleMigration(),
    error => error.code === "SCHEDULE_DIAGNOSTIC_PREVIEW_ENVIRONMENT_BLOCKED"
  );
  assert.equal(production.state.spreadsheetAccesses, 0);
  assert.equal(production.state.sheetReads, 0);
  assert.equal(production.state.writes, 0);
  assert.deepEqual(production.logs, []);
});

const ATTENDANCE_CHUNKED_DIAGNOSTICS = [
  "diagnosticPreviewAttendanceMigrationSummary",
  "diagnosticPreviewAttendanceMigrationSheets",
  "diagnosticPreviewAttendanceMigrationColumns",
  "diagnosticPreviewAttendanceMigrationSafety"
];

test("Attendance chunked diagnostics are compact, complete, and zero-write in strict Staging", () => {
  const harness = createLiveStagingHarness();

  const summaryResult = harness.context.diagnosticPreviewAttendanceMigrationSummary();
  assert.equal(harness.state.writes, 0);
  assert.equal(harness.logs.length, 1);
  const summary = JSON.parse(harness.logs[0]);
  assert.equal(summary.schemaVersion, summaryResult.schemaVersion);
  assert.equal(summary.dryRun, true);
  assert.equal(summary.writes, 0);
  assert.deepEqual(summary.createSheetNames, JSON.parse(JSON.stringify(
    summaryResult.createSheets.map(item => item.sheetName)
  )));
  assert.deepEqual(summary.initializeBlankSheetNames, []);
  assert.deepEqual(summary.appendColumnSheetNames, []);
  assert.deepEqual(summary.unchangedSheetNames, []);
  assert.deepEqual(summary.errorCodes, JSON.parse(JSON.stringify(
    summaryResult.errors.map(item => item.code)
  )));
  assert.equal(summary.safe, summaryResult.safe);
  assert.equal(summary.errorCodes.includes("PHASE3_ENVIRONMENT_BLOCKED"), false);
  assert.equal(summary.errorCodes.includes("ENVIRONMENT_NOT_APPROVED"), false);
  assert.equal(summary.safe, true);
  assert.equal(harness.logs[0].includes("\n"), false);

  harness.logs.length = 0;
  const sheetsResult = harness.context.diagnosticPreviewAttendanceMigrationSheets();
  assert.equal(harness.state.writes, 0);
  assert.equal(harness.logs.length, sheetsResult.createSheets.length);
  const loggedSheets = harness.logs.map(line => {
    assert.equal(line.includes("\n"), false);
    return JSON.parse(line);
  });
  assert.deepEqual(loggedSheets, JSON.parse(JSON.stringify(
    sheetsResult.createSheets.map(item => ({
      sheetName: item.sheetName,
      headerCount: item.headers.length,
      headers: item.headers
    }))
  )));
  loggedSheets.forEach((sheet, index) => {
    assert.equal(sheet.headerCount, sheet.headers.length, `header count for sheet ${index}`);
  });

  harness.logs.length = 0;
  const columnsResult = harness.context.diagnosticPreviewAttendanceMigrationColumns();
  assert.equal(harness.state.writes, 0);
  assert.equal(harness.logs.length, 1);
  assert.deepEqual(JSON.parse(harness.logs[0]), JSON.parse(JSON.stringify({
    appendColumns: columnsResult.appendColumns,
    preservedUnknownColumns: columnsResult.preservedUnknownColumns
  })));
  assert.equal(harness.logs[0].includes("\n"), false);

  harness.logs.length = 0;
  const safetyResult = harness.context.diagnosticPreviewAttendanceMigrationSafety();
  assert.equal(harness.state.writes, 0);
  assert.equal(harness.logs.length, 1);
  assert.deepEqual(JSON.parse(harness.logs[0]), JSON.parse(JSON.stringify({
    errors: safetyResult.errors,
    rollback: safetyResult.rollback,
    safe: safetyResult.safe,
    dryRun: safetyResult.dryRun,
    writes: safetyResult.writes,
    historicalRowsTouched: safetyResult.rollback.historicalRowsTouched
  })));
  assert.equal(harness.logs[0].includes("\n"), false);
});

test("every Attendance chunked diagnostic blocks Production before spreadsheet access or logging", () => {
  for (const functionName of ATTENDANCE_CHUNKED_DIAGNOSTICS) {
    const harness = createLiveStagingHarness({ CUT_HUB_ENVIRONMENT: "production" });
    assert.throws(
      () => harness.context[functionName](),
      error => error.code === "ATTENDANCE_DIAGNOSTIC_PREVIEW_ENVIRONMENT_BLOCKED"
    );
    assert.equal(harness.state.spreadsheetAccesses, 0);
    assert.equal(harness.state.sheetReads, 0);
    assert.equal(harness.state.writes, 0);
    assert.deepEqual(harness.logs, []);
  }
});

test("Attendance diagnostic rejects mismatched Staging pins and unknown environments without writes", () => {
  const mismatch = createLiveStagingHarness({
    CUT_HUB_STAGING_SPREADSHEET_ID: "different-staging-sheet-1234567890"
  });
  assert.throws(
    () => mismatch.context.diagnosticPreviewAttendanceMigrationSummary(),
    error => error.message === "STAGING_CONFIGURATION_INVALID"
  );
  assert.equal(mismatch.state.sheetReads, 0);
  assert.equal(mismatch.state.writes, 0);
  assert.deepEqual(mismatch.logs, []);

  const unknown = createLiveStagingHarness({ CUT_HUB_ENVIRONMENT: "unknown" });
  assert.throws(
    () => unknown.context.diagnosticPreviewAttendanceMigrationSummary(),
    error => error.code === "ATTENDANCE_DIAGNOSTIC_PREVIEW_ENVIRONMENT_BLOCKED"
  );
  assert.equal(unknown.state.spreadsheetAccesses, 0);
  assert.equal(unknown.state.sheetReads, 0);
  assert.equal(unknown.state.writes, 0);
  assert.deepEqual(unknown.logs, []);
});

const PAYROLL_CHUNKED_DIAGNOSTICS = [
  "diagnosticPreviewPayrollPhase4MigrationSummary",
  "diagnosticPreviewPayrollPhase4MigrationSafety",
  "diagnosticPreviewPayrollPhase4MigrationSheets",
  "diagnosticPreviewPayrollPhase4MigrationColumns"
];

test("Payroll chunked diagnostics are compact, complete, and zero-write in strict Staging", () => {
  const harness = createLiveStagingHarness();

  const summaryResult = harness.context.diagnosticPreviewPayrollPhase4MigrationSummary();
  assert.equal(harness.state.writes, 0);
  assert.equal(harness.logs.length, 1);
  const summary = JSON.parse(harness.logs[0]);
  assert.equal(summary.schemaVersion, summaryResult.schemaVersion);
  assert.equal(summary.version, harness.context.StaffPayrollAttendancePhase4.VERSION);
  assert.equal(summary.dryRun, true);
  assert.equal(summary.writes, 0);
  assert.equal(summary.executionAllowed, false);
  assert.deepEqual(summary.createSheetNames, JSON.parse(JSON.stringify(
    summaryResult.createSheets.map(item => item.sheetName)
  )));
  assert.deepEqual(summary.initializeBlankSheetNames, []);
  assert.deepEqual(summary.appendColumnSheetNames, []);
  assert.deepEqual(summary.unchangedSheetNames, []);
  assert.deepEqual(summary.errorCodes, JSON.parse(JSON.stringify(
    summaryResult.errors.map(item => item.code)
  )));
  assert.equal(summary.safe, true);
  assert.equal(summary.createSheetNames.length, summaryResult.createSheets.length);
  assert.equal(harness.logs[0].includes("\n"), false);

  harness.logs.length = 0;
  const safetyResult = harness.context.diagnosticPreviewPayrollPhase4MigrationSafety();
  assert.equal(harness.state.writes, 0);
  assert.equal(harness.logs.length, 1);
  assert.deepEqual(JSON.parse(harness.logs[0]), JSON.parse(JSON.stringify({
    errors: safetyResult.errors,
    rollback: safetyResult.rollback,
    safe: safetyResult.safe,
    dryRun: safetyResult.dryRun,
    writes: safetyResult.writes,
    executionAllowed: safetyResult.executionAllowed,
    historicalRowsTouched: safetyResult.rollback.historicalRowsTouched
  })));
  assert.equal(harness.logs[0].includes("\n"), false);

  harness.logs.length = 0;
  const sheetsResult = harness.context.diagnosticPreviewPayrollPhase4MigrationSheets();
  assert.equal(harness.state.writes, 0);
  assert.equal(harness.logs.length, sheetsResult.createSheets.length);
  const loggedSheets = harness.logs.map(line => {
    assert.equal(line.includes("\n"), false);
    return JSON.parse(line);
  });
  assert.deepEqual(loggedSheets, JSON.parse(JSON.stringify(
    sheetsResult.createSheets.map(item => ({
      sheetName: item.sheetName,
      headerCount: item.headers.length,
      headers: item.headers
    }))
  )));
  loggedSheets.forEach(sheet => assert.equal(sheet.headerCount, sheet.headers.length));

  harness.logs.length = 0;
  const columnsResult = harness.context.diagnosticPreviewPayrollPhase4MigrationColumns();
  assert.equal(harness.state.writes, 0);
  assert.equal(harness.logs.length, 1);
  assert.deepEqual(JSON.parse(harness.logs[0]), JSON.parse(JSON.stringify({
    appendColumns: columnsResult.appendColumns,
    preservedUnknownColumns: columnsResult.preservedUnknownColumns
  })));
  assert.equal(harness.logs[0].includes("\n"), false);
});

test("Payroll chunked diagnostics reject Production and mismatched Staging pins without writes", () => {
  for (const functionName of PAYROLL_CHUNKED_DIAGNOSTICS) {
    const production = createLiveStagingHarness({ CUT_HUB_ENVIRONMENT: "production" });
    assert.throws(
      () => production.context[functionName](),
      error => error.code === "PAYROLL_DIAGNOSTIC_PREVIEW_ENVIRONMENT_BLOCKED"
    );
    assert.equal(production.state.spreadsheetAccesses, 0);
    assert.equal(production.state.sheetReads, 0);
    assert.equal(production.state.writes, 0);
    assert.deepEqual(production.logs, []);

    const unknown = createLiveStagingHarness({ CUT_HUB_ENVIRONMENT: "unknown" });
    assert.throws(
      () => unknown.context[functionName](),
      error => error.code === "PAYROLL_DIAGNOSTIC_PREVIEW_ENVIRONMENT_BLOCKED"
    );
    assert.equal(unknown.state.spreadsheetAccesses, 0);
    assert.equal(unknown.state.sheetReads, 0);
    assert.equal(unknown.state.writes, 0);
    assert.deepEqual(unknown.logs, []);

    const mismatch = createLiveStagingHarness({
      CUT_HUB_STAGING_SPREADSHEET_ID: "different-staging-sheet-1234567890"
    });
    assert.throws(
      () => mismatch.context[functionName](),
      error => error.message === "STAGING_CONFIGURATION_INVALID"
    );
    assert.equal(mismatch.state.sheetReads, 0);
    assert.equal(mismatch.state.writes, 0);
    assert.deepEqual(mismatch.logs, []);
  }
});
