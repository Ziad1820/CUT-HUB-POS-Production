"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const phase5 = require("../scripts/booking-availability-phase5");
const foundation = require("../scripts/branch-foundation-staging");
const fs = require("node:fs");
const path = require("node:path");

const identity = {
  environment: "test",
  expectedSpreadsheetId: "sheet-id",
  actualSpreadsheetId: "sheet-id"
};

function allPhase5Sheets() {
  return Object.fromEntries(Object.entries(phase5.SHEET_SCHEMAS)
    .map(([name, headers]) => [name, [...headers]]));
}

function summarize(plan) {
  return {
    blocked: plan.blocked,
    errors: plan.errors,
    plannedCreatedSheets: plan.plannedCreatedSheets,
    plannedAppendedColumns: plan.plannedAppendedColumns
  };
}

test("official Phase 5 planner partial-state compatibility matrix is deterministic", () => {
  const registry = [...phase5.SHEET_SCHEMAS.BOOKING_BRANCH_REGISTRY];
  const hours = [...phase5.SHEET_SCHEMAS.BRANCH_BOOKING_HOURS];
  const completeSheets = allPhase5Sheets();
  const scenarios = [
    { name: "none", state: {}, blocked: false, creates: 8 },
    { name: "registry-only", state: { BOOKING_BRANCH_REGISTRY: registry }, blocked: false, creates: 7 },
    { name: "registry-hours", state: {
      BOOKING_BRANCH_REGISTRY: registry,
      BRANCH_BOOKING_HOURS: hours
    }, blocked: false, creates: 6 },
    { name: "all-eight", state: completeSheets, blocked: false, creates: 0 },
    { name: "complete", state: {
      ...completeSheets,
      Bookings: [...phase5.BOOKING_APPEND_HEADERS],
      SERVICES: [...phase5.SERVICE_APPEND_HEADERS]
    }, blocked: false, creates: 0, noAppends: true },
    { name: "reordered", state: { BOOKING_BRANCH_REGISTRY: [
      registry[1], registry[0], ...registry.slice(2)
    ] }, blocked: true, error: "PHASE5_SCHEMA_ORDER_INCOMPATIBLE" },
    { name: "extra", state: {
      BOOKING_BRANCH_REGISTRY: [...registry, "EXTRA"]
    }, blocked: true, error: "PHASE5_UNKNOWN_SCHEMA_COLUMNS" },
    // Rows are intentionally absent from planner input: the official planner reads headers only.
    { name: "registry-with-valid-row", state: {
      BOOKING_BRANCH_REGISTRY: registry
    }, blocked: false, creates: 7 }
  ];

  for (const scenario of scenarios) {
    const first = phase5.planMigration(scenario.state, identity);
    const second = phase5.planMigration(scenario.state, identity);
    assert.deepEqual(summarize(first), summarize(second), scenario.name);
    assert.equal(first.blocked, scenario.blocked, scenario.name);
    assert.equal(first.plannedCreatedSheets.length, scenario.creates ?? 7, scenario.name);
    if (scenario.error) assert.ok(first.errors.some(error => error.code === scenario.error));
    if (scenario.noAppends) assert.deepEqual(first.plannedAppendedColumns, {});
    else {
      assert.deepEqual(Object.keys(first.plannedAppendedColumns), ["Bookings", "SERVICES"]);
    }
  }
});

test("registry-only and registry-hours states remain upgrade-safe", () => {
  const registry = [...phase5.SHEET_SCHEMAS.BOOKING_BRANCH_REGISTRY];
  const hours = [...phase5.SHEET_SCHEMAS.BRANCH_BOOKING_HOURS];
  for (const state of [
    { BOOKING_BRANCH_REGISTRY: registry },
    { BOOKING_BRANCH_REGISTRY: registry, BRANCH_BOOKING_HOURS: hours }
  ]) {
    const plan = phase5.planMigration(state, identity);
    assert.equal(plan.blocked, false);
    assert.ok(!plan.plannedCreatedSheets.includes("BOOKING_BRANCH_REGISTRY"));
    assert.equal(plan.errors.length, 0);
  }
});

test("Branch Foundation plans only the exact registry contract and is idempotent", () => {
  const expected = [...phase5.SHEET_SCHEMAS.BOOKING_BRANCH_REGISTRY];
  const missing = foundation.planMigration(null, identity);
  assert.equal(missing.safe, true);
  assert.equal(missing.dryRun, true);
  assert.equal(missing.writes, 0);
  assert.deepEqual(missing.createSheets, [{
    sheetName: "BOOKING_BRANCH_REGISTRY", headers: expected
  }]);
  assert.deepEqual(missing.initializeBlankSheets, []);
  assert.deepEqual(missing.appendColumns, {});
  assert.equal(missing.rollback.historicalRowsTouched, 0);

  const complete = foundation.planMigration(expected, identity);
  assert.equal(complete.safe, true);
  assert.deepEqual(complete.createSheets, []);
  assert.deepEqual(complete.unchangedSheets, ["BOOKING_BRANCH_REGISTRY"]);
});

test("Branch Foundation blocks reordered, extra, missing, and duplicate headers", () => {
  const headers = [...phase5.SHEET_SCHEMAS.BOOKING_BRANCH_REGISTRY];
  const cases = [
    [headers.slice().reverse(), "BRANCH_FOUNDATION_HEADER_ORDER_INCOMPATIBLE"],
    [[...headers, "EXTRA"], "BRANCH_FOUNDATION_UNKNOWN_COLUMNS"],
    [headers.slice(0, -1), "BRANCH_FOUNDATION_HEADER_ORDER_INCOMPATIBLE"],
    [[...headers.slice(0, -1), headers[0]], "BRANCH_FOUNDATION_DUPLICATE_HEADERS"]
  ];
  for (const [current, code] of cases) {
    const plan = foundation.planMigration(current, identity);
    assert.equal(plan.safe, false);
    assert.ok(plan.errors.some(error => error.code === code));
    assert.deepEqual(plan.createSheets, []);
  }
});

function validConfiguration(overrides = {}) {
  return {
    branchId: "BRANCH-OPERATOR-SUPPLIED",
    branchName: "Operator supplied name",
    timeZone: "Africa/Cairo",
    active: true,
    publicSelectable: true,
    closureStatus: "OPEN",
    closureReason: "",
    weeklyOpeningHours: [
      { weekday: "SUNDAY", openTime: "09:00", closeTime: "22:00" }
    ],
    ...overrides
  };
}

test("branch configuration preview validates explicit canonical inputs with zero writes", () => {
  const preview = foundation.previewConfiguration(validConfiguration(), []);
  assert.equal(preview.safe, true);
  assert.equal(preview.dryRun, true);
  assert.equal(preview.writes, 0);
  assert.deepEqual(preview.operations.map(item => item.type), [
    "CREATE_BRANCH", "CREATE_BRANCH_HOURS"
  ]);
});

test("branch configuration preview blocks duplicate and case-ambiguous identifiers", () => {
  const duplicate = foundation.previewConfiguration(validConfiguration(), [
    { BRANCH_ID: "BRANCH-OPERATOR-SUPPLIED", ACTIVE: false }
  ]);
  assert.ok(duplicate.errors.some(error => error.code === "BRANCH_ID_DUPLICATE"));

  const ambiguous = foundation.previewConfiguration(validConfiguration(), [
    { BRANCH_ID: "branch-operator-supplied", ACTIVE: false }
  ]);
  assert.ok(ambiguous.errors.some(error => error.code === "BRANCH_ID_CASE_AMBIGUOUS"));
});

test("branch configuration preview blocks invalid timezone, weekday, time, and second active branch", () => {
  const preview = foundation.previewConfiguration(validConfiguration({
    timeZone: "Cairo",
    weeklyOpeningHours: [{ weekday: "FUNDAY", openTime: "9:00", closeTime: "9:00" }]
  }), [{ BRANCH_ID: "EXISTING", ACTIVE: true }]);
  const codes = preview.errors.map(error => error.code);
  assert.ok(codes.includes("BRANCH_TIME_ZONE_INVALID"));
  assert.ok(codes.includes("BRANCH_WEEKDAY_INVALID"));
  assert.ok(codes.includes("BRANCH_HOURS_INVALID"));
  assert.ok(codes.includes("SINGLE_BRANCH_ACTIVE_LIMIT"));
  assert.deepEqual(preview.operations, []);
});

test("closed branch requires a reason and all boolean/operator fields are explicit", () => {
  const preview = foundation.previewConfiguration(validConfiguration({
    active: undefined,
    publicSelectable: undefined,
    closureStatus: "CLOSED",
    closureReason: ""
  }), []);
  const codes = preview.errors.map(error => error.code);
  assert.equal(codes.filter(code => code === "BRANCH_CONFIGURATION_BOOLEAN_REQUIRED").length, 2);
  assert.ok(codes.includes("BRANCH_CLOSURE_REASON_REQUIRED"));
});

test("Branch Foundation diagnostic wrapper only previews, logs sanitized JSON, and returns", () => {
  const source = fs.readFileSync(path.join(
    __dirname, "../scripts/branch-foundation-staging.js"), "utf8");
  const match = source.match(
    /function diagnosticPreviewBranchFoundationMigration\(\)\s*\{([\s\S]*?)\n\}/
  );
  assert.ok(match);
  assert.match(match[1], /var result = previewBranchFoundationMigration\(\);/);
  assert.match(match[1], /console\.log\(JSON\.stringify\(result, null, 2\)\);/);
  assert.match(match[1], /return result;/);
  assert.doesNotMatch(match[1], /setValue|setValues|insertSheet|PropertiesService|LockService|prepare|execute/i);
});
