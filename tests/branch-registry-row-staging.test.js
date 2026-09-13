"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const phase5 = require("../scripts/booking-availability-phase5");
const rowModule = require("../scripts/branch-registry-row-staging");

const HEADERS = [...phase5.SHEET_SCHEMAS.BOOKING_BRANCH_REGISTRY];
const IDENTITY = {
  environment: "staging",
  expectedSpreadsheetId: "staging-sheet",
  actualSpreadsheetId: "staging-sheet"
};

function approvedRow(metadata = {}) {
  return [
    "CUT_HUB_MAIN", "CUT HUB POS STAGING", true, "Africa/Cairo", true, "OPEN", "",
    metadata.createdAt || "2026-01-01T00:00:00.000Z",
    metadata.createdBy || "owner@example.com",
    metadata.updatedAt || "2026-01-01T00:00:00.000Z",
    metadata.updatedBy || "owner@example.com",
    metadata.requestId || "request-1"
  ];
}

test("safe preview proposes exactly one canonical APPEND_ROW with zero writes", () => {
  const plan = rowModule.previewPlan(HEADERS, [], IDENTITY);
  assert.equal(plan.safe, true);
  assert.equal(plan.dryRun, true);
  assert.equal(plan.writes, 0);
  assert.deepEqual(plan.errors, []);
  assert.equal(plan.operations.length, 1);
  assert.deepEqual(plan.operations[0], {
    type: "APPEND_ROW",
    sheetName: "BOOKING_BRANCH_REGISTRY",
    values: {
      BRANCH_ID: "CUT_HUB_MAIN",
      BRANCH_NAME: "CUT HUB POS STAGING",
      ACTIVE: true,
      TIME_ZONE: "Africa/Cairo",
      PUBLIC_SELECTABLE: true,
      CLOSURE_STATUS: "OPEN",
      CLOSURE_REASON: "",
      CREATED_AT: "SERVER_TIMESTAMP",
      CREATED_BY: "VERIFIED_ACTOR",
      UPDATED_AT: "SERVER_TIMESTAMP",
      UPDATED_BY: "VERIFIED_ACTOR",
      LAST_REQUEST_ID: "EXECUTION_REQUEST_ID"
    }
  });
});

test("identical existing row is unchanged and never proposed twice", () => {
  const plan = rowModule.previewPlan(HEADERS, [approvedRow()], IDENTITY);
  assert.equal(plan.safe, true);
  assert.equal(plan.unchanged, true);
  assert.deepEqual(plan.operations, []);
});

test("conflicting, duplicate, and case-ambiguous branch IDs fail closed", () => {
  const conflicting = approvedRow();
  conflicting[1] = "CONFLICTING NAME";
  const cases = [
    [[conflicting], "BRANCH_REGISTRY_ID_CONFLICT"],
    [[approvedRow(), approvedRow({ requestId: "request-2" })], "BRANCH_REGISTRY_DUPLICATE_ID"],
    [[["cut_hub_main", "Name", true, "Africa/Cairo", true, "OPEN", ""]],
      "BRANCH_REGISTRY_CASE_AMBIGUOUS"]
  ];
  for (const [rows, code] of cases) {
    const plan = rowModule.previewPlan(HEADERS, rows, IDENTITY);
    assert.equal(plan.safe, false);
    assert.ok(plan.errors.some(error => error.code === code));
    assert.deepEqual(plan.operations, []);
  }
});

test("wrong positional registry headers fail closed", () => {
  const headers = HEADERS.slice();
  [headers[0], headers[1]] = [headers[1], headers[0]];
  const plan = rowModule.previewPlan(headers, [], IDENTITY);
  assert.equal(plan.safe, false);
  assert.ok(plan.errors.some(error => error.code === "BRANCH_REGISTRY_HEADERS_INCOMPATIBLE"));
  assert.deepEqual(plan.operations, []);
});

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}

function hash(value) {
  return `sha256:${crypto.createHash("sha256").update(canonical(value), "utf8").digest("hex")}`;
}

function store() {
  const values = {};
  return {
    values,
    getProperty(key) { return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null; },
    setProperty(key, value) { values[key] = String(value); },
    deleteProperty(key) { delete values[key]; },
    getProperties() { return { ...values }; }
  };
}

function harness(options = {}) {
  const state = {
    environment: options.environment || "staging",
    expectedId: options.expectedId || "staging-sheet",
    actualId: options.actualId || "staging-sheet",
    actor: options.actor || "owner@example.com",
    writes: 0,
    unrelatedWrites: 0,
    spreadsheetAccesses: 0,
    uuid: 0,
    logs: []
  };
  const scriptStore = store();
  const userStore = store();

  class Range {
    constructor(sheet, row, column, rowCount, columnCount) {
      Object.assign(this, { sheet, row, column, rowCount, columnCount });
    }
    getValues() {
      return Array.from({ length: this.rowCount }, (_, r) =>
        Array.from({ length: this.columnCount }, (_, c) =>
          this.sheet.rows[this.row - 1 + r]?.[this.column - 1 + c] ?? ""));
    }
    setValues(values) {
      state.writes += 1;
      if (this.sheet.name !== "BOOKING_BRANCH_REGISTRY") state.unrelatedWrites += 1;
      values.forEach((row, r) => row.forEach((value, c) => {
        const ri = this.row - 1 + r;
        while (this.sheet.rows.length <= ri) this.sheet.rows.push([]);
        this.sheet.rows[ri][this.column - 1 + c] = value;
      }));
      if (options.failAfterRowWrite && this.sheet.name === "BOOKING_BRANCH_REGISTRY" && this.row > 1) {
        if (options.makeRollbackUnsafe) this.sheet.rows[this.row - 1][1] = "externally changed";
        throw Object.assign(new Error("injected row-write failure"), { code: "INJECTED_FAILURE" });
      }
      return this;
    }
  }
  class Sheet {
    constructor(name, rows) { this.name = name; this.rows = rows.map(row => row.slice()); }
    getLastColumn() { return Math.max(0, ...this.rows.map(row => row.length)); }
    getLastRow() {
      let last = 0;
      this.rows.forEach((row, index) => { if (row.some(value => value !== "")) last = index + 1; });
      return last;
    }
    getRange(row, column, rowCount, columnCount) {
      return new Range(this, row, column, rowCount, columnCount);
    }
    deleteRow(row) { state.writes += 1; this.rows.splice(row - 1, 1); }
  }

  const registry = new Sheet("BOOKING_BRANCH_REGISTRY", [
    options.headers || HEADERS,
    ...(options.rows || [])
  ]);
  const unrelated = new Sheet("STAFF", [["NAME"], ["existing"]]);
  const sheets = new Map([[registry.name, registry], [unrelated.name, unrelated]]);
  const spreadsheet = {
    getId() { return state.actualId; },
    getSheetByName(name) { return sheets.get(name) || null; }
  };
  const source = fs.readFileSync(path.join(
    __dirname, "../scripts/branch-registry-row-staging.js"), "utf8");
  const context = {
    Date, JSON, Object, Array, String, Number, Boolean, Math, Error,
    BookingAvailabilityPhase5: phase5,
    console: { log(value) { state.logs.push(String(value)); } },
    branchFoundationNormalizeHeader(value) {
      return String(value == null ? "" : value).trim().toUpperCase()
        .replace(/[\s-]+/g, "_").replace(/_+/g, "_");
    },
    branchFoundationIdentity() {
      if (state.environment !== "staging") {
        throw Object.assign(new Error("staging only"), { code: "BRANCH_FOUNDATION_STAGING_ONLY" });
      }
      if (state.expectedId !== state.actualId) {
        throw Object.assign(new Error("pin mismatch"), { code: "BRANCH_FOUNDATION_IDENTITY_MISMATCH" });
      }
      state.spreadsheetAccesses += 1;
      return {
        environment: state.environment,
        expectedSpreadsheetId: state.expectedId,
        actualSpreadsheetId: state.actualId,
        actorIdentity: state.actor,
        spreadsheet
      };
    },
    staffSchemaMigrationTryLocks(callback) { return callback(); },
    staffSchemaMigrationHash: hash,
    staffSchemaMigrationJournalKey(phase, requestId, spreadsheetId, actor) {
      return `STAFF_SCHEMA_MIGRATION_JOURNAL_${phase}_${hash(spreadsheetId)}_${hash(actor)}_${hash(requestId)}`;
    },
    staffSchemaMigrationTokenKey(phase) { return `STAFF_SCHEMA_MIGRATION_TOKEN_${phase}`; },
    staffSchemaMigrationReadJson(target, key) {
      const raw = target.getProperty(key);
      return raw ? JSON.parse(raw) : null;
    },
    staffSchemaMigrationWriteJournal(key, value) {
      scriptStore.setProperty(key, JSON.stringify(value));
    },
    staffSchemaMigrationNow() { return new Date().toISOString(); },
    staffSchemaMigrationError(code, message, details) {
      const error = Object.assign(new Error(message || code), { code });
      if (details !== undefined) error.details = details;
      return error;
    },
    PropertiesService: {
      getScriptProperties() { return scriptStore; },
      getUserProperties() { return userStore; }
    },
    Utilities: {
      getUuid() { state.uuid += 1; return `uuid-${state.uuid}`; }
    }
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "branch-registry-row-staging.js" });
  return { context, state, registry, unrelated, scriptStore, userStore };
}

test("live preview is zero-write and diagnostic returns the exact same object", () => {
  const h = harness();
  const preview = h.context.previewCanonicalBranchRegistryRow();
  const diagnostic = h.context.diagnosticPreviewCanonicalBranchRegistryRow();
  assert.equal(preview.safe, true);
  assert.equal(preview.operations.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(diagnostic)), JSON.parse(JSON.stringify(preview)));
  assert.equal(h.state.writes, 0);
  assert.equal(h.state.logs.length, 1);
});

test("zero-argument prepare logs and returns a server-requestId result without Sheet writes", () => {
  const h = harness();
  const unrelatedBefore = JSON.stringify(h.unrelated.rows);
  const prepared = h.context.prepareCanonicalBranchRegistryRow();
  assert.ok(prepared.requestId);
  assert.equal(prepared.requestId, "uuid-1");
  assert.equal(prepared.tokenIssued, true);
  assert.equal(prepared.operationCount, 1);
  assert.deepEqual(JSON.parse(h.state.logs[0]), JSON.parse(JSON.stringify(prepared)));
  assert.equal(h.state.writes, 0);
  assert.equal(h.state.logs.length, 1);
  assert.equal(JSON.stringify(h.unrelated.rows), unrelatedBefore);
});

test("zero-argument prepared execute logs and returns exactly one canonical row result", () => {
  const h = harness();
  const unrelatedBefore = JSON.stringify(h.unrelated.rows);
  const prepared = h.context.prepareCanonicalBranchRegistryRow();
  const result = h.context.executePreparedCanonicalBranchRegistryRowStaging();
  assert.equal(result.status, "COMMITTED");
  assert.equal(result.writes, 1);
  assert.deepEqual(JSON.parse(h.state.logs[1]), JSON.parse(JSON.stringify(result)));
  assert.equal(h.registry.rows.length, 2);
  assert.deepEqual(h.registry.rows[1].slice(0, 7), approvedRow().slice(0, 7));
  assert.equal(h.registry.rows[1][8], "owner@example.com");
  assert.equal(h.registry.rows[1][10], "owner@example.com");
  assert.equal(h.registry.rows[1][11], prepared.requestId);
  assert.equal(JSON.stringify(h.unrelated.rows), unrelatedBefore);
  assert.equal(h.state.unrelatedWrites, 0);
});

test("invalid and expired prepared tokens are rejected without row writes", () => {
  const invalid = harness();
  invalid.context.prepareCanonicalBranchRegistryRow();
  const key = "STAFF_SCHEMA_MIGRATION_TOKEN_BRANCH_REGISTRY_ROW";
  const bad = JSON.parse(invalid.userStore.values[key]);
  bad.tokenHash = "wrong";
  invalid.userStore.values[key] = JSON.stringify(bad);
  assert.throws(() => invalid.context.executePreparedCanonicalBranchRegistryRowStaging(),
    error => error.code === "BRANCH_REGISTRY_TOKEN_INVALID");
  assert.equal(invalid.state.writes, 0);

  const expired = harness();
  expired.context.prepareCanonicalBranchRegistryRow();
  const stale = JSON.parse(expired.userStore.values[key]);
  stale.expiresAt = "2000-01-01T00:00:00.000Z";
  expired.userStore.values[key] = JSON.stringify(stale);
  assert.throws(() => expired.context.executePreparedCanonicalBranchRegistryRowStaging(),
    error => error.code === "BRANCH_REGISTRY_TOKEN_EXPIRED");
  assert.equal(expired.state.writes, 0);
});

test("plan drift after prepare is rejected before row writes", () => {
  const h = harness();
  h.context.prepareCanonicalBranchRegistryRow();
  h.registry.rows.push(["ANOTHER_BRANCH", "Another", false, "Africa/Cairo", false, "OPEN", ""]);
  assert.throws(() => h.context.executePreparedCanonicalBranchRegistryRowStaging(),
    error => error.code === "BRANCH_REGISTRY_PLAN_DRIFT");
  assert.equal(h.state.writes, 0);
});

test("committed request retry returns the original result without duplicate writes", () => {
  const h = harness();
  h.context.branchRegistryRowPrepare({ requestId: "idempotent-request" });
  const first = h.context.executePreparedCanonicalBranchRegistryRowStaging();
  assert.equal(h.state.writes, 1);
  h.context.branchRegistryRowPrepare({ requestId: "idempotent-request" });
  const retry = h.context.executePreparedCanonicalBranchRegistryRowStaging();
  assert.deepEqual(JSON.parse(JSON.stringify(retry)), JSON.parse(JSON.stringify(first)));
  assert.equal(h.state.writes, 1);
  assert.equal(h.registry.rows.length, 2);
});

test("missing or consumed prepared token fails safely and cannot duplicate the row", () => {
  const missing = harness();
  assert.throws(() => missing.context.executePreparedCanonicalBranchRegistryRowStaging(),
    error => error.code === "BRANCH_REGISTRY_TOKEN_INVALID");
  assert.equal(missing.state.writes, 0);

  const consumed = harness();
  consumed.context.prepareCanonicalBranchRegistryRow();
  consumed.context.executePreparedCanonicalBranchRegistryRowStaging();
  assert.throws(() => consumed.context.executePreparedCanonicalBranchRegistryRowStaging(),
    error => error.code === "BRANCH_REGISTRY_TOKEN_INVALID");
  assert.equal(consumed.registry.rows.length, 2);
  assert.equal(consumed.state.writes, 1);
});

test("wrong environment and Spreadsheet identity fail before writes", () => {
  const production = harness({ environment: "production" });
  assert.throws(() => production.context.previewCanonicalBranchRegistryRow(),
    error => error.code === "BRANCH_FOUNDATION_STAGING_ONLY");
  assert.equal(production.state.spreadsheetAccesses, 0);
  assert.equal(production.state.writes, 0);

  const mismatch = harness({ actualId: "wrong-sheet" });
  assert.throws(() => mismatch.context.previewCanonicalBranchRegistryRow(),
    error => error.code === "BRANCH_FOUNDATION_IDENTITY_MISMATCH");
  assert.equal(mismatch.state.spreadsheetAccesses, 0);
  assert.equal(mismatch.state.writes, 0);
});

test("wrong live headers prevent prepare and no unrelated sheet or row changes occur", () => {
  const headers = HEADERS.slice();
  headers.reverse();
  const h = harness({ headers });
  const unrelatedBefore = JSON.stringify(h.unrelated.rows);
  assert.throws(() => h.context.prepareCanonicalBranchRegistryRow(),
    error => error.code === "BRANCH_REGISTRY_PREVIEW_NOT_SAFE");
  assert.equal(h.state.writes, 0);
  assert.equal(JSON.stringify(h.unrelated.rows), unrelatedBefore);
});

test("request-owned unchanged row is rolled back after a write failure", () => {
  const h = harness({ failAfterRowWrite: true });
  h.context.prepareCanonicalBranchRegistryRow();
  assert.throws(() => h.context.executePreparedCanonicalBranchRegistryRowStaging(),
    error => error.code === "INJECTED_FAILURE");
  assert.equal(h.registry.rows.length, 1);
  const journals = Object.values(h.scriptStore.values).map(value => JSON.parse(value));
  assert.equal(journals.at(-1).status, "ROLLED_BACK");
});

test("changed request row is preserved and marked RECOVERY_REQUIRED", () => {
  const h = harness({ failAfterRowWrite: true, makeRollbackUnsafe: true });
  h.context.prepareCanonicalBranchRegistryRow();
  assert.throws(() => h.context.executePreparedCanonicalBranchRegistryRowStaging(),
    error => error.code === "BRANCH_REGISTRY_RECOVERY_REQUIRED");
  assert.equal(h.registry.rows.length, 2);
  const journals = Object.values(h.scriptStore.values).map(value => JSON.parse(value));
  assert.equal(journals.at(-1).status, "RECOVERY_REQUIRED");
});
