"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(
  __dirname, "../scripts/staff-schema-migration-staging-executor.js"), "utf8");
const SPREADSHEET_ID = "stagingSpreadsheetId_12345";
const OWNER_EMAIL = "owner@example.com";
const SCHEMAS = {
  PHASE2: { SCHEDULE_SCHEMA: ["BASE", "NEW"] },
  PHASE3: { ATTENDANCE_SCHEMA: ["ATTENDANCE_ID", "STAFF_ID"] },
  PHASE4: { PAYROLL_SCHEMA: ["SETTLEMENT_ID", "PERIOD_ID"] },
  BRANCH_FOUNDATION: { BOOKING_BRANCH_REGISTRY: ["BRANCH_ID", "BRANCH_NAME", "ACTIVE"] }
};

function canonical(value) {
  return String(value == null ? "" : value).trim().toUpperCase()
    .replace(/[\s-]+/g, "_").replace(/_+/g, "_");
}

function makeStore(initial = {}) {
  const values = { ...initial };
  return {
    getProperty(key) { return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null; },
    setProperty(key, value) { values[key] = String(value); return this; },
    deleteProperty(key) { delete values[key]; return this; },
    getProperties() { return { ...values }; },
    values
  };
}

function makeHarness(options = {}) {
  const state = {
    environment: options.environment || "staging",
    spreadsheetId: options.spreadsheetId || SPREADSHEET_ID,
    stagingSpreadsheetId: options.stagingSpreadsheetId || SPREADSHEET_ID,
    activeSpreadsheetId: options.activeSpreadsheetId || SPREADSHEET_ID,
    effectiveEmail: options.effectiveEmail || OWNER_EMAIL,
    activeEmail: Object.prototype.hasOwnProperty.call(options, "activeEmail")
      ? options.activeEmail : (options.effectiveEmail || OWNER_EMAIL),
    ownerEmail: options.ownerEmail || OWNER_EMAIL,
    spreadsheetAccesses: 0,
    sheetWrites: 0,
    historicalWrites: 0,
    triggerInstalls: 0,
    uuid: 0,
    failMode: "",
    scriptLockAvailable: options.scriptLockAvailable !== false,
    documentLockAvailable: options.documentLockAvailable !== false,
    logs: []
  };
  const scriptProperties = makeStore();
  const userProperties = makeStore();

  class Range {
    constructor(sheet, row, column, rowCount, columnCount) {
      this.sheet = sheet; this.row = row; this.column = column;
      this.rowCount = rowCount; this.columnCount = columnCount;
    }
    getValues() {
      return Array.from({ length: this.rowCount }, (_, rowOffset) =>
        Array.from({ length: this.columnCount }, (_, columnOffset) =>
          this.sheet.rows[this.row - 1 + rowOffset]?.[this.column - 1 + columnOffset] ?? ""));
    }
    getFormulas() {
      return Array.from({ length: this.rowCount }, (_, rowOffset) =>
        Array.from({ length: this.columnCount }, (_, columnOffset) =>
          this.sheet.formulas[this.row - 1 + rowOffset]?.[this.column - 1 + columnOffset] ?? ""));
    }
    setValues(values) {
      state.sheetWrites += 1;
      if (this.row > 1) state.historicalWrites += 1;
      values.forEach((row, rowOffset) => row.forEach((value, columnOffset) => {
        const rowIndex = this.row - 1 + rowOffset;
        const columnIndex = this.column - 1 + columnOffset;
        while (this.sheet.rows.length <= rowIndex) this.sheet.rows.push([]);
        this.sheet.rows[rowIndex][columnIndex] = value;
      }));
      if (state.failMode === "header-write") {
        state.failMode = "";
        throw Object.assign(new Error("injected header failure"), { code: "INJECTED_FAILURE" });
      }
      if (state.failMode === "unsafe-header-write") {
        state.failMode = "";
        while (this.sheet.rows.length < 2) this.sheet.rows.push([]);
        this.sheet.rows[1][this.column - 1] = "external-data";
        throw Object.assign(new Error("injected unsafe failure"), { code: "INJECTED_FAILURE" });
      }
      return this;
    }
    clearContent() {
      state.sheetWrites += 1;
      for (let r = 0; r < this.rowCount; r += 1) {
        for (let c = 0; c < this.columnCount; c += 1) {
          if (this.sheet.rows[this.row - 1 + r]) {
            this.sheet.rows[this.row - 1 + r][this.column - 1 + c] = "";
          }
        }
      }
      return this;
    }
  }

  class Sheet {
    constructor(name, rows = []) {
      this.name = name;
      this.rows = rows.map(row => row.slice());
      this.formulas = [];
      this.maxColumns = Math.max(1, ...this.rows.map(row => row.length));
    }
    getName() { return this.name; }
    getLastColumn() {
      let last = 0;
      this.rows.forEach(row => row.forEach((value, index) => {
        if (value !== "" && value !== null && value !== undefined) last = Math.max(last, index + 1);
      }));
      this.formulas.forEach(row => row.forEach((value, index) => {
        if (value) last = Math.max(last, index + 1);
      }));
      return last;
    }
    getLastRow() {
      let last = 0;
      this.rows.forEach((row, index) => {
        if (row.some(value => value !== "" && value !== null && value !== undefined)) last = index + 1;
      });
      this.formulas.forEach((row, index) => {
        if (row.some(Boolean)) last = Math.max(last, index + 1);
      });
      return last;
    }
    getMaxColumns() { return this.maxColumns; }
    insertColumnsAfter(_after, count) { this.maxColumns += count; state.sheetWrites += 1; }
    deleteColumns(start, count) {
      this.rows.forEach(row => row.splice(start - 1, count));
      this.formulas.forEach(row => row.splice(start - 1, count));
      this.maxColumns = Math.max(1, this.maxColumns - count);
      state.sheetWrites += 1;
    }
    getRange(row, column, rowCount, columnCount) {
      return new Range(this, row, column, rowCount, columnCount);
    }
  }

  const sheets = new Map();
  Object.entries(options.sheets || {}).forEach(([name, rows]) => sheets.set(name, new Sheet(name, rows)));
  const spreadsheet = {
    getId() { return state.activeSpreadsheetId; },
    getSheetByName(name) { return sheets.get(name) || null; },
    insertSheet(name) {
      state.sheetWrites += 1;
      const sheet = new Sheet(name);
      sheets.set(name, sheet);
      return sheet;
    },
    deleteSheet(sheet) { state.sheetWrites += 1; sheets.delete(sheet.getName()); }
  };

  function makeLock(kind) {
    return {
      tryLock() { return kind === "script" ? state.scriptLockAvailable : state.documentLockAvailable; },
      releaseLock() {}
    };
  }

  function preview(phase) {
    const schema = SCHEMAS[phase];
    const plan = {
      schemaVersion: phase + "-schema-v1", version: phase + "-v1",
      dryRun: true, writes: 0,
      identity: {
        environment: state.environment,
        expectedSpreadsheetId: state.spreadsheetId,
        actualSpreadsheetId: state.activeSpreadsheetId
      },
      createSheets: [], initializeBlankSheets: [], appendColumns: {}, unchangedSheets: [],
      preservedUnknownColumns: {}, errors: [],
      rollback: { createdSheets: [], appendedColumnRanges: [], historicalRowsTouched: 0 }
    };
    Object.entries(schema).forEach(([sheetName, desired]) => {
      const sheet = sheets.get(sheetName);
      if (!sheet) {
        plan.createSheets.push({ sheetName, headers: desired.slice() });
        plan.rollback.createdSheets.push(sheetName);
        return;
      }
      const current = sheet.getLastColumn()
        ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(canonical) : [];
      if (!current.filter(Boolean).length) {
        plan.initializeBlankSheets.push({ sheetName, headers: desired.slice() });
        return;
      }
      const unknown = current.filter(header => !desired.map(canonical).includes(header));
      if (unknown.length) plan.preservedUnknownColumns[sheetName] = unknown;
      const missing = desired.map(canonical).filter(header => !current.includes(header));
      if (missing.length) {
        plan.appendColumns[sheetName] = missing;
        plan.rollback.appendedColumnRanges.push({
          sheetName, startColumn: current.length + 1,
          endColumn: current.length + missing.length, headers: missing.slice()
        });
      } else plan.unchangedSheets.push(sheetName);
    });
    plan.safe = plan.errors.length === 0;
    if (phase === "PHASE4") plan.executionAllowed = false;
    return plan;
  }

  const context = {
    Date, JSON, Object, Array, String, Number, Boolean, Math, Error,
    console: { log(value) { state.logs.push(String(value)); } },
    getCutHubEnvironmentConfig() {
      return {
        environment: state.environment,
        spreadsheetId: state.spreadsheetId,
        stagingSpreadsheetId: state.stagingSpreadsheetId
      };
    },
    assertStagingEnvironment() {
      state.spreadsheetAccesses += 1;
      if (state.environment !== "staging" || state.spreadsheetId !== state.stagingSpreadsheetId ||
          state.activeSpreadsheetId !== state.spreadsheetId) throw new Error("STAGING_CONFIGURATION_INVALID");
      return { config: context.getCutHubEnvironmentConfig(), spreadsheet };
    },
    SpreadsheetApp: { getActive() { state.spreadsheetAccesses += 1; return spreadsheet; } },
    PropertiesService: {
      getScriptProperties() { return scriptProperties; },
      getUserProperties() { return userProperties; }
    },
    LockService: {
      getScriptLock() { return makeLock("script"); },
      getDocumentLock() { return makeLock("document"); }
    },
    Session: {
      getEffectiveUser() { return { getEmail: () => state.effectiveEmail }; },
      getActiveUser() { return { getEmail: () => state.activeEmail }; }
    },
    DriveApp: {
      getFileById() { return { getOwner: () => ({ getEmail: () => state.ownerEmail }) }; }
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: "SHA_256" }, Charset: { UTF_8: "UTF_8" },
      computeDigest(_algorithm, value) {
        return Array.from(crypto.createHash("sha256").update(String(value), "utf8").digest())
          .map(byte => byte > 127 ? byte - 256 : byte);
      },
      newBlob(value) { return { getBytes: () => Array.from(Buffer.from(String(value), "utf8")) }; },
      getUuid() { state.uuid += 1; return `uuid-${state.uuid}`; }
    },
    previewStaffScheduleMigration() { return preview("PHASE2"); },
    previewAttendanceMigration() { return preview("PHASE3"); },
    previewPayrollPhase4Migration() { return preview("PHASE4"); },
    previewBranchFoundationMigration() { return preview("BRANCH_FOUNDATION"); }
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "staff-schema-migration-staging-executor.js" });

  return {
    context, state, sheets, spreadsheet, scriptProperties, userProperties,
    prepare(phase, data) { return context.staffSchemaMigrationPrepare(phase, data); },
    execute(phase, prepared) {
      return context.staffSchemaMigrationExecute(phase, {
        requestId: prepared.requestId, confirmationToken: prepared.token
      });
    },
    journals() {
      return Object.entries(scriptProperties.values)
        .filter(([key]) => key.startsWith("STAFF_SCHEMA_MIGRATION_JOURNAL_"))
        .map(([, value]) => JSON.parse(value));
    }
  };
}

test("Production and unknown environments are blocked before Spreadsheet access and writes", () => {
  for (const environment of ["production", "unknown"]) {
    const h = makeHarness({ environment });
    assert.throws(() => h.context.executeStaffScheduleMigrationStaging({
      requestId: "r", confirmationToken: "t"
    }), error => error.code === "MIGRATION_STAGING_ONLY");
    assert.equal(h.state.spreadsheetAccesses, 0);
    assert.equal(h.state.sheetWrites, 0);
  }
});

test("Branch Foundation prepare/execute is one-sheet-only, journaled, and idempotent", () => {
  const h = makeHarness();
  const prepared = h.context.prepareBranchFoundationMigration({ requestId: "branch-foundation-1" });
  assert.deepEqual(Array.from(prepared.createSheetNames), ["BOOKING_BRANCH_REGISTRY"]);
  assert.equal(h.state.sheetWrites, 0);
  const result = h.context.executeBranchFoundationMigrationStaging({
    requestId: prepared.requestId,
    confirmationToken: prepared.token
  });
  assert.equal(result.status, "COMMITTED");
  assert.deepEqual(Array.from(result.createdSheetNames), ["BOOKING_BRANCH_REGISTRY"]);
  assert.equal(result.historicalRowsTouched, 0);
  assert.equal(h.sheets.get("BOOKING_BRANCH_REGISTRY").getLastRow(), 1);
  assert.equal(h.sheets.size, 1);

  const second = h.context.prepareBranchFoundationMigration({ requestId: "branch-foundation-2" });
  const secondResult = h.context.executePreparedBranchFoundationMigrationStaging();
  assert.equal(secondResult.status, "COMMITTED");
  assert.equal(secondResult.writes, 0);
  assert.deepEqual(Array.from(secondResult.createdSheetNames), []);
});

test("Branch Foundation direct no-argument execution and production are blocked before writes", () => {
  const noArgument = makeHarness();
  assert.throws(() => noArgument.context.executeBranchFoundationMigrationStaging(),
    error => error.code === "MIGRATION_CONFIRMATION_REQUIRED");
  assert.equal(noArgument.state.spreadsheetAccesses, 0);
  assert.equal(noArgument.state.sheetWrites, 0);

  const production = makeHarness({ environment: "production" });
  assert.throws(() => production.context.prepareBranchFoundationMigration({ requestId: "blocked" }),
    error => error.code === "MIGRATION_STAGING_ONLY");
  assert.equal(production.state.spreadsheetAccesses, 0);
  assert.equal(production.state.sheetWrites, 0);
});

test("Branch Foundation rolls back an unmodified request-owned sheet", () => {
  const h = makeHarness();
  const prepared = h.context.prepareBranchFoundationMigration({ requestId: "branch-rollback" });
  h.state.failMode = "header-write";
  assert.throws(() => h.context.executeBranchFoundationMigrationStaging({
    requestId: prepared.requestId,
    confirmationToken: prepared.token
  }), error => error.code === "INJECTED_FAILURE");
  assert.equal(h.sheets.has("BOOKING_BRANCH_REGISTRY"), false);
  assert.equal(h.journals().at(-1).status, "ROLLED_BACK");
});

test("Branch Foundation marks recovery required when rollback safety cannot be proven", () => {
  const h = makeHarness();
  const prepared = h.context.prepareBranchFoundationMigration({ requestId: "branch-recovery" });
  h.state.failMode = "unsafe-header-write";
  assert.throws(() => h.context.executeBranchFoundationMigrationStaging({
    requestId: prepared.requestId,
    confirmationToken: prepared.token
  }), error => error.code === "MIGRATION_RECOVERY_REQUIRED");
  assert.equal(h.sheets.has("BOOKING_BRANCH_REGISTRY"), true);
  assert.equal(h.journals().at(-1).status, "RECOVERY_REQUIRED");
});

test("Spreadsheet pin mismatch, non-owner, and no-argument execution are blocked", () => {
  const mismatch = makeHarness({ stagingSpreadsheetId: "differentSpreadsheetId_999" });
  assert.throws(() => mismatch.prepare("PHASE2", { requestId: "pin" }),
    error => error.code === "MIGRATION_STAGING_PIN_MISMATCH");
  assert.equal(mismatch.state.spreadsheetAccesses, 0);

  const nonOwner = makeHarness({ effectiveEmail: "editor@example.com" });
  assert.throws(() => nonOwner.prepare("PHASE2", { requestId: "owner" }),
    error => error.code === "MIGRATION_OWNER_REQUIRED");
  assert.equal(nonOwner.state.sheetWrites, 0);

  for (const activeEmail of ["", "alias@example.com"]) {
    const nonInteractive = makeHarness({ activeEmail });
    assert.throws(() => nonInteractive.prepare("PHASE2", { requestId: "interactive-owner" }),
      error => error.code === "MIGRATION_OWNER_REQUIRED");
    assert.equal(nonInteractive.state.sheetWrites, 0);
  }

  const noArgument = makeHarness();
  assert.throws(() => noArgument.context.executeStaffScheduleMigrationStaging(),
    error => error.code === "MIGRATION_CONFIRMATION_REQUIRED");
  assert.equal(noArgument.state.spreadsheetAccesses, 0);
});

test("invalid, expired, reused, wrong-phase tokens and plan hash changes are rejected", () => {
  const invalid = makeHarness();
  const prepared = invalid.prepare("PHASE2", { requestId: "token-invalid" });
  assert.throws(() => invalid.context.executeStaffScheduleMigrationStaging({
    requestId: prepared.requestId, confirmationToken: "wrong"
  }), error => error.code === "MIGRATION_TOKEN_INVALID");

  const expired = makeHarness();
  const exp = expired.prepare("PHASE2", { requestId: "token-expired" });
  const tokenKey = "STAFF_SCHEMA_MIGRATION_TOKEN_PHASE2";
  const record = JSON.parse(expired.userProperties.values[tokenKey]);
  record.expiresAt = "2000-01-01T00:00:00.000Z";
  expired.userProperties.values[tokenKey] = JSON.stringify(record);
  assert.throws(() => expired.execute("PHASE2", exp), error => error.code === "MIGRATION_TOKEN_EXPIRED");

  const reused = makeHarness();
  const oneTime = reused.prepare("PHASE2", { requestId: "token-reused" });
  reused.execute("PHASE2", oneTime);
  assert.throws(() => reused.execute("PHASE2", oneTime), error => error.code === "MIGRATION_TOKEN_INVALID");

  const wrongPhase = makeHarness({ sheets: { SCHEDULE_SCHEMA: [["BASE", "NEW"]] } });
  const p3 = wrongPhase.prepare("PHASE3", { requestId: "wrong-phase" });
  assert.throws(() => wrongPhase.context.executePayrollPhase4MigrationStaging({
    requestId: p3.requestId, confirmationToken: p3.token
  }), error => error.code === "MIGRATION_TOKEN_INVALID");

  const changed = makeHarness();
  const hash = changed.prepare("PHASE2", { requestId: "hash-change" });
  changed.spreadsheet.insertSheet("SCHEDULE_SCHEMA").getRange(1, 1, 1, 1).setValues([["EXTERNAL"]]);
  assert.throws(() => changed.execute("PHASE2", hash),
    error => error.code === "MIGRATION_PLAN_HASH_MISMATCH");
  assert.ok(changed.userProperties.getProperty("STAFF_SCHEMA_MIGRATION_TOKEN_PHASE2"),
    "plan mismatch must not consume a valid token");
});

test("first execution commits, editor wrapper consumes its token, and second run is zero-write", () => {
  const h = makeHarness();
  const first = h.prepare("PHASE2", { requestId: "first", requestContext: "CHG-100" });
  assert.equal(h.state.sheetWrites, 0, "prepare must not write Sheets");
  assert.equal(h.state.logs.length, 1);
  assert.equal(JSON.parse(h.state.logs[0]).exactPlanHash, first.exactPlanHash);
  assert.equal(h.state.logs[0].includes(first.token), false, "persistent console log must omit token");
  assert.equal(h.scriptProperties.getProperties()[Object.keys(h.scriptProperties.values)[0]].includes(first.token), false);
  const result = h.context.executePreparedStaffScheduleMigrationStaging();
  assert.equal(result.status, "COMMITTED");
  assert.equal(result.writes, 1);
  assert.deepEqual(Array.from(result.createdSheetNames), ["SCHEDULE_SCHEMA"]);
  assert.equal(result.historicalRowsTouched, 0);
  assert.equal(JSON.stringify(result).includes(first.token), false);
  assert.equal(h.state.historicalWrites, 0);
  assert.equal(h.state.triggerInstalls, 0);

  const before = h.state.sheetWrites;
  const second = h.prepare("PHASE2", { requestId: "second" });
  const secondResult = h.execute("PHASE2", second);
  assert.equal(secondResult.writes, 0);
  assert.equal(h.state.sheetWrites, before);

  const retryPrepare = h.prepare("PHASE2", { requestId: first.requestId, requestContext: "CHG-100" });
  const retry = h.execute("PHASE2", retryPrepare);
  assert.equal(retry.completedTimestamp, result.completedTimestamp);
  assert.equal(h.state.sheetWrites, before);
  assert.throws(() => h.prepare("PHASE2", {
    requestId: first.requestId, requestContext: "CHG-DIFFERENT"
  }), error => error.code === "MIGRATION_REQUEST_ID_REUSED");
});

test("journal keys isolate phase, request, actor, and Spreadsheet and enforce size limits", () => {
  const h = makeHarness();
  const key = h.context.staffSchemaMigrationJournalKey;
  const keys = new Set([
    key("PHASE2", "request-a", "sheet-a", "owner-a"),
    key("PHASE3", "request-a", "sheet-a", "owner-a"),
    key("PHASE2", "request-b", "sheet-a", "owner-a"),
    key("PHASE2", "request-a", "sheet-b", "owner-a"),
    key("PHASE2", "request-a", "sheet-a", "owner-b")
  ]);
  assert.equal(keys.size, 5);
  assert.throws(() => h.context.staffSchemaMigrationWriteJournal("oversized", {
    status: "PREPARED", errorDetails: [{ message: "x".repeat(9000) }]
  }), error => error.code === "MIGRATION_JOURNAL_SIZE_LIMIT");
  assert.equal(h.scriptProperties.getProperty("oversized"), null);

  for (let index = 0; index < 57; index += 1) {
    h.scriptProperties.setProperty(`existing-${index}`, "y".repeat(7900));
  }
  assert.throws(() => h.context.staffSchemaMigrationWriteJournal("within-item-limit", {
    status: "PREPARED", requestId: "store-capacity"
  }), error => error.code === "MIGRATION_PROPERTY_STORE_SIZE_LIMIT");
  assert.equal(h.scriptProperties.getProperty("within-item-limit"), null);
});

test("canonical plan hashing is deterministic and excludes volatile/log metadata", () => {
  const h = makeHarness();
  const plan = h.context.previewStaffScheduleMigration();
  const reordered = {
    safe: plan.safe, rollback: plan.rollback, errors: plan.errors,
    preservedUnknownColumns: plan.preservedUnknownColumns,
    unchangedSheets: plan.unchangedSheets, appendColumns: plan.appendColumns,
    initializeBlankSheets: plan.initializeBlankSheets, createSheets: plan.createSheets,
    identity: plan.identity, writes: plan.writes, dryRun: plan.dryRun,
    version: plan.version, schemaVersion: plan.schemaVersion,
    generatedAt: "2099-01-01T00:00:00.000Z", logMetadata: { executionId: "one" }
  };
  const another = { ...reordered,
    generatedAt: "2100-01-01T00:00:00.000Z", logMetadata: { executionId: "two" } };
  assert.equal(h.context.staffSchemaMigrationPlanHash(plan),
    h.context.staffSchemaMigrationPlanHash(reordered));
  assert.equal(h.context.staffSchemaMigrationPlanHash(reordered),
    h.context.staffSchemaMigrationPlanHash(another));
  assert.equal(h.context.staffSchemaMigrationCanonical({ b: 2, a: [1, { z: 3, y: 4 }] }),
    h.context.staffSchemaMigrationCanonical({ a: [1, { y: 4, z: 3 }], b: 2 }));
});

test("COMMITTED and RECOVERY_REQUIRED journals cannot be overwritten by prepare", () => {
  const committed = makeHarness();
  const prepared = committed.prepare("PHASE2", { requestId: "immutable", requestContext: "A" });
  committed.execute("PHASE2", prepared);
  const committedKey = Object.keys(committed.scriptProperties.values)
    .find(key => key.startsWith("STAFF_SCHEMA_MIGRATION_JOURNAL_"));
  const committedRaw = committed.scriptProperties.getProperty(committedKey);
  committed.prepare("PHASE2", { requestId: "immutable", requestContext: "A" });
  assert.equal(committed.scriptProperties.getProperty(committedKey), committedRaw);

  const recovery = makeHarness({ sheets: { SCHEDULE_SCHEMA: [["BASE"]] } });
  const recoveryPrepared = recovery.prepare("PHASE2", { requestId: "recovery-immutable" });
  recovery.state.failMode = "unsafe-header-write";
  assert.throws(() => recovery.execute("PHASE2", recoveryPrepared),
    error => error.code === "MIGRATION_RECOVERY_REQUIRED");
  const recoveryKey = Object.keys(recovery.scriptProperties.values)
    .find(key => key.startsWith("STAFF_SCHEMA_MIGRATION_JOURNAL_"));
  const recoveryRaw = recovery.scriptProperties.getProperty(recoveryKey);
  assert.throws(() => recovery.prepare("PHASE2", { requestId: "recovery-immutable" }),
    error => error.code === "MIGRATION_REQUEST_NOT_PREPARABLE");
  assert.equal(recovery.scriptProperties.getProperty(recoveryKey), recoveryRaw);
});

test("partial schemas append only planned columns and preserve unknown columns and historical rows", () => {
  const h = makeHarness({
    sheets: { SCHEDULE_SCHEMA: [["BASE", "CUSTOM"], ["old", "keep"]] }
  });
  const beforeRows = JSON.stringify(h.sheets.get("SCHEDULE_SCHEMA").rows.slice(1));
  const prepared = h.prepare("PHASE2", { requestId: "partial" });
  const result = h.execute("PHASE2", prepared);
  assert.equal(result.writes, 1);
  assert.deepEqual(h.sheets.get("SCHEDULE_SCHEMA").rows[0].slice(0, 3), ["BASE", "CUSTOM", "NEW"]);
  assert.equal(JSON.stringify(h.sheets.get("SCHEDULE_SCHEMA").rows.slice(1)), beforeRows);
  assert.equal(h.state.historicalWrites, 0);
});

test("required Phase 2, Phase 3, Phase 4 order is enforced and all valid Staging phases commit", () => {
  const blocked = makeHarness();
  assert.throws(() => blocked.prepare("PHASE3", { requestId: "out-of-order" }),
    error => error.code === "MIGRATION_EXECUTION_ORDER_REQUIRED");

  const h = makeHarness();
  const p2 = h.prepare("PHASE2", { requestId: "sequence-2" });
  h.execute("PHASE2", p2);
  const p3 = h.prepare("PHASE3", { requestId: "sequence-3" });
  assert.equal(h.context.executePreparedAttendanceMigrationStaging().status, "COMMITTED");
  const p4 = h.prepare("PHASE4", { requestId: "sequence-4" });
  assert.equal(h.context.executePreparedPayrollPhase4MigrationStaging().status, "COMMITTED");
  assert.deepEqual(h.journals().map(item => item.status), ["COMMITTED", "COMMITTED", "COMMITTED"]);
  assert.ok(p3.token && p4.token);
});

test("concurrent execution is rejected without writes", () => {
  const h = makeHarness();
  h.state.scriptLockAvailable = false;
  assert.throws(() => h.prepare("PHASE2", { requestId: "locked" }),
    error => error.code === "MIGRATION_CONCURRENT_EXECUTION");
  assert.equal(h.state.sheetWrites, 0);
});

test("failure rolls back a newly created header-only sheet", () => {
  const h = makeHarness();
  const prepared = h.prepare("PHASE2", { requestId: "rollback-sheet" });
  h.state.failMode = "header-write";
  assert.throws(() => h.execute("PHASE2", prepared), error => error.code === "INJECTED_FAILURE");
  assert.equal(h.sheets.has("SCHEDULE_SCHEMA"), false);
  assert.equal(h.journals()[0].status, "ROLLED_BACK");
});

test("failure rolls back only newly appended unused columns", () => {
  const h = makeHarness({ sheets: { SCHEDULE_SCHEMA: [["BASE"], ["historical"]] } });
  const prepared = h.prepare("PHASE2", { requestId: "rollback-columns" });
  h.state.failMode = "header-write";
  assert.throws(() => h.execute("PHASE2", prepared), error => error.code === "INJECTED_FAILURE");
  assert.deepEqual(h.sheets.get("SCHEDULE_SCHEMA").rows[0].slice(0, 1), ["BASE"]);
  assert.equal(h.sheets.get("SCHEDULE_SCHEMA").rows[1][0], "historical");
  assert.equal(h.journals()[0].status, "ROLLED_BACK");
});

test("rollback preserves pre-existing physical columns and formatting capacity", () => {
  const h = makeHarness({ sheets: { SCHEDULE_SCHEMA: [["BASE"], ["historical"]] } });
  const sheet = h.sheets.get("SCHEDULE_SCHEMA");
  sheet.maxColumns = 8;
  const prepared = h.prepare("PHASE2", { requestId: "rollback-formatting" });
  h.state.failMode = "header-write";
  assert.throws(() => h.execute("PHASE2", prepared), error => error.code === "INJECTED_FAILURE");
  assert.equal(sheet.maxColumns, 8, "pre-existing formatted column capacity must remain");
  assert.deepEqual(sheet.rows[0].slice(0, 2), ["BASE", ""]);
  assert.equal(h.journals()[0].status, "ROLLED_BACK");
});

test("rollback treats empty-result formulas beneath appended columns as protected data", () => {
  const h = makeHarness({ sheets: { SCHEDULE_SCHEMA: [["BASE"], ["historical"]] } });
  const sheet = h.sheets.get("SCHEDULE_SCHEMA");
  sheet.maxColumns = 1;
  const prepared = h.prepare("PHASE2", { requestId: "rollback-formula" });
  h.state.failMode = "header-write";
  const originalSetValues = sheet.getRange(1, 1, 1, 1).constructor.prototype.setValues;
  let injected = false;
  sheet.getRange(1, 1, 1, 1).constructor.prototype.setValues = function (values) {
    try { return originalSetValues.call(this, values); } catch (error) {
      if (!injected && this.column === 2) {
        injected = true;
        while (sheet.formulas.length < 2) sheet.formulas.push([]);
        sheet.formulas[1][1] = '=IF(TRUE,"","")';
      }
      throw error;
    }
  };
  assert.throws(() => h.execute("PHASE2", prepared),
    error => error.code === "MIGRATION_RECOVERY_REQUIRED");
  assert.equal(h.journals()[0].status, "RECOVERY_REQUIRED");
});

test("unsafe rollback is stopped and marked RECOVERY_REQUIRED", () => {
  const h = makeHarness({ sheets: { SCHEDULE_SCHEMA: [["BASE"]] } });
  const prepared = h.prepare("PHASE2", { requestId: "recovery" });
  h.state.failMode = "unsafe-header-write";
  assert.throws(() => h.execute("PHASE2", prepared),
    error => error.code === "MIGRATION_RECOVERY_REQUIRED");
  assert.equal(h.journals()[0].status, "RECOVERY_REQUIRED");
  const diagnostics = h.context.diagnosticMigrationRecoveryStatus();
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].status, "RECOVERY_REQUIRED");
  assert.ok(diagnostics[0].manualRemediation.some(item => item.includes("Appended columns")));
});

function simulateAbruptAfterWrite(h, phase) {
  const definition = h.context.staffSchemaMigrationPhaseDefinition(phase);
  const plan = definition.preview();
  const operation = h.context.staffSchemaMigrationEnrichOperation(
    h.spreadsheet, h.context.staffSchemaMigrationOperations(plan)[0]);
  const journalKey = Object.keys(h.scriptProperties.values)
    .find(key => key.startsWith("STAFF_SCHEMA_MIGRATION_JOURNAL_"));
  const journal = JSON.parse(h.scriptProperties.getProperty(journalKey));
  journal.status = "APPLYING";
  journal.inFlightOperation = h.context.staffSchemaMigrationOperationProof(operation);
  h.context.staffSchemaMigrationRecordOperation(journal, operation);
  h.context.staffSchemaMigrationWriteJournal(journalKey, journal);
  h.context.staffSchemaMigrationApplyOperation(h.spreadsheet, operation);
  return { journalKey, journal, operation };
}

test("abrupt termination after sheet creation but before progress update is durably detectable", () => {
  const h = makeHarness();
  h.prepare("PHASE2", { requestId: "abrupt-sheet" });
  const simulated = simulateAbruptAfterWrite(h, "PHASE2");
  const persisted = JSON.parse(h.scriptProperties.getProperty(simulated.journalKey));
  assert.equal(persisted.status, "APPLYING");
  assert.equal(persisted.inFlightOperation.type, "CREATE_SHEET");
  assert.deepEqual(persisted.createdSheetNames, ["SCHEDULE_SCHEMA"]);
  assert.equal(h.sheets.has("SCHEDULE_SCHEMA"), true);
  const recovery = h.context.diagnosticMigrationRecoveryStatus();
  assert.equal(recovery[0].status, "APPLYING");
  assert.ok(recovery[0].manualRemediation.some(item => item.includes("Created sheet SCHEDULE_SCHEMA")));
});

test("abrupt termination after column append but before progress update is durably detectable", () => {
  const h = makeHarness({ sheets: { SCHEDULE_SCHEMA: [["BASE"], ["historical"]] } });
  h.prepare("PHASE2", { requestId: "abrupt-column" });
  const simulated = simulateAbruptAfterWrite(h, "PHASE2");
  const persisted = JSON.parse(h.scriptProperties.getProperty(simulated.journalKey));
  assert.equal(persisted.status, "APPLYING");
  assert.equal(persisted.inFlightOperation.type, "APPEND_COLUMNS");
  assert.equal(persisted.appendedColumnRanges[0].startColumn, 2);
  assert.deepEqual(h.sheets.get("SCHEDULE_SCHEMA").rows[0], ["BASE", "NEW"]);
  assert.equal(h.sheets.get("SCHEDULE_SCHEMA").rows[1][0], "historical");
});

test("abrupt termination after all writes and after verification remains visible before COMMITTED", () => {
  const h = makeHarness();
  h.prepare("PHASE2", { requestId: "abrupt-post-write" });
  const simulated = simulateAbruptAfterWrite(h, "PHASE2");
  simulated.journal.writes += 1;
  simulated.journal.inFlightOperation = null;
  h.context.staffSchemaMigrationWriteJournal(simulated.journalKey, simulated.journal);

  let persisted = JSON.parse(h.scriptProperties.getProperty(simulated.journalKey));
  assert.equal(persisted.status, "APPLYING", "after all writes but before verification");
  const verification = h.context.previewStaffScheduleMigration();
  assert.equal(verification.safe, true);
  assert.deepEqual(verification.createSheets, []);
  assert.deepEqual(verification.initializeBlankSheets, []);
  assert.deepEqual(verification.appendColumns, {});
  persisted = JSON.parse(h.scriptProperties.getProperty(simulated.journalKey));
  assert.equal(persisted.status, "APPLYING", "after verification but before COMMITTED");
  assert.equal(h.context.diagnosticMigrationRecoveryStatus()[0].status, "APPLYING");
});

test("post-commit schema verification is exact and has no pending operation", () => {
  const h = makeHarness();
  const prepared = h.prepare("PHASE2", { requestId: "post-commit-verification" });
  h.execute("PHASE2", prepared);
  const verification = h.context.previewStaffScheduleMigration();
  assert.equal(verification.safe, true);
  assert.deepEqual(verification.errors, []);
  assert.deepEqual(verification.createSheets, []);
  assert.deepEqual(verification.initializeBlankSheets, []);
  assert.deepEqual(verification.appendColumns, {});
});

test("generic execution and recovery diagnostics include canonical branch-row journals without writes", () => {
  const h = makeHarness();
  const committedKey = "STAFF_SCHEMA_MIGRATION_JOURNAL_BRANCH_ROW_COMMITTED";
  const recoveryKey = "STAFF_SCHEMA_MIGRATION_JOURNAL_BRANCH_ROW_RECOVERY";
  const baseJournal = {
    migrationId: "CANONICAL_BRANCH_REGISTRY_ROW_V1",
    schemaVersion: "CANONICAL_BRANCH_REGISTRY_ROW_V1",
    phase: "BRANCH_REGISTRY_ROW",
    actorIdentity: OWNER_EMAIL,
    expectedSpreadsheetId: SPREADSHEET_ID,
    startedTimestamp: "2026-08-03T10:00:00.000Z",
    completedTimestamp: "2026-08-03T10:01:00.000Z",
    exactPlanHash: "plan-hash",
    createdSheetNames: [],
    appendedColumnRanges: [],
    initializedBlankSheets: [],
    errorDetails: [],
    writes: 1
  };
  h.scriptProperties.setProperty(committedKey, JSON.stringify({
    ...baseJournal, requestId: "branch-committed", status: "COMMITTED"
  }));
  h.scriptProperties.setProperty(recoveryKey, JSON.stringify({
    ...baseJournal, requestId: "branch-recovery", status: "RECOVERY_REQUIRED",
    completedTimestamp: "", inFlightOperation: { type: "APPEND_ROW", sheetName: "BOOKING_BRANCH_REGISTRY" }
  }));
  const sheetWritesBefore = h.state.sheetWrites;
  const scriptPropertiesBefore = JSON.stringify(h.scriptProperties.values);
  const userPropertiesBefore = JSON.stringify(h.userProperties.values);

  const execution = h.context.diagnosticMigrationExecutionStatus();
  const recovery = h.context.diagnosticMigrationRecoveryStatus();

  assert.equal(execution.filter(item => item.migrationId === "CANONICAL_BRANCH_REGISTRY_ROW_V1").length, 2);
  assert.equal(recovery.length, 1);
  assert.equal(recovery[0].migrationId, "CANONICAL_BRANCH_REGISTRY_ROW_V1");
  assert.equal(recovery[0].requestId, "branch-recovery");
  assert.equal(h.state.sheetWrites, sheetWritesBefore);
  assert.equal(JSON.stringify(h.scriptProperties.values), scriptPropertiesBefore);
  assert.equal(JSON.stringify(h.userProperties.values), userPropertiesBefore);
});

test("bundle source exposes all prepare, execute, editor, and diagnostic globals", () => {
  for (const name of [
    "prepareStaffScheduleMigrationExecution", "prepareAttendanceMigrationExecution",
    "preparePayrollPhase4MigrationExecution", "executeStaffScheduleMigrationStaging",
    "executeAttendanceMigrationStaging", "executePayrollPhase4MigrationStaging",
    "executePreparedStaffScheduleMigrationStaging", "executePreparedAttendanceMigrationStaging",
    "executePreparedPayrollPhase4MigrationStaging", "diagnosticMigrationExecutionStatus",
    "diagnosticMigrationRecoveryStatus"
  ]) assert.equal(typeof makeHarness().context[name], "function", name);
});
