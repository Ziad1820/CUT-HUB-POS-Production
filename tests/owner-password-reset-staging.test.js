"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const SOURCE = fs.readFileSync(
  path.join(__dirname, "../scripts/owner-password-reset-staging.js"), "utf8"
);
const STAGING_ID = "1TNR5WJ-I2U23-DPSaL70MVjPY_J_gsQm7ElLTTfmjtA";
const STAGING_NAME = "CUT HUB POS - STAGING";
const HEADERS = ["USERNAME", "PASSWORD", "DISPLAY_NAME", "PERMISSIONS", "CREATED_AT", "PASSWORD_HASH"];
const OLD_HASH = sha256("old-password");
const VALID_PASSWORD = "new-secure-password";

function sha256(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest("hex");
}

function ownerRow(overrides = {}) {
  return ["owner", "", "zeyad yasser", "", "2026-08-02T01:54:24.152Z", OLD_HASH]
    .map((value, index) => Object.prototype.hasOwnProperty.call(overrides, HEADERS[index])
      ? overrides[HEADERS[index]] : value);
}

function harness(options = {}) {
  const state = {
    environment: options.environment || "staging",
    expectedId: options.expectedId || STAGING_ID,
    stagingId: options.stagingId || STAGING_ID,
    actualId: options.actualId || STAGING_ID,
    spreadsheetName: options.spreadsheetName || STAGING_NAME,
    actor: options.actor === undefined ? "owner@example.com" : options.actor,
    writes: [], logs: [], lockReleased: false, flushes: 0, bootstrapCalls: 0, hashCalls: 0,
    corruptionApplied: false, rollbackStarted: false
  };
  const rows = [options.headers || HEADERS, ...(options.rows || [ownerRow()])]
    .map(row => row.slice());

  class Range {
    constructor(row, column, rowCount = 1, columnCount = 1) {
      Object.assign(this, { row, column, rowCount, columnCount });
    }
    getValues() {
      return Array.from({ length: this.rowCount }, (_, r) =>
        Array.from({ length: this.columnCount }, (_, c) =>
          rows[this.row - 1 + r]?.[this.column - 1 + c] ?? ""));
    }
    setValue(value) {
      state.writes.push({ row: this.row, column: this.column, value });
      while (rows.length < this.row) rows.push([]);
      if (options.rollbackFailure && state.rollbackStarted && this.column === 6) {
        throw new Error("rollback failed");
      }
      rows[this.row - 1][this.column - 1] = value;
      if (this.column === 6 && options.postWriteVerificationFailure && !state.corruptionApplied) {
        rows[this.row - 1][this.column - 1] = "malformed";
        state.corruptionApplied = true;
        state.rollbackStarted = true;
      } else if (state.corruptionApplied && this.column === 2) {
        state.rollbackStarted = true;
      }
      return this;
    }
  }

  const sheet = {
    getLastColumn() { return Math.max(...rows.map(row => row.length)); },
    getLastRow() { return rows.length; },
    getRange(row, column, rowCount, columnCount) {
      return new Range(row, column, rowCount, columnCount);
    }
  };
  const spreadsheet = {
    getId() { return state.actualId; },
    getName() { return state.spreadsheetName; },
    getSheetByName(name) { return name === "USERS" && options.usersMissing !== true ? sheet : null; }
  };
  const context = {
    Date, JSON, Object, Array, String, Number, Boolean, Math, Error,
    Logger: { log(value) { state.logs.push(String(value)); } },
    SpreadsheetApp: { flush() { state.flushes += 1; } },
    LockService: {
      getScriptLock() {
        return {
          tryLock() { return options.lockAvailable !== false; },
          releaseLock() { state.lockReleased = true; }
        };
      }
    },
    hashPassword(value) { state.hashCalls += 1; return sha256(value); },
    staffImportPreviewStagingIdentityAndOwner() {
      return {
        config: {
          environment: state.environment,
          spreadsheetId: state.expectedId,
          stagingSpreadsheetId: state.stagingId
        },
        spreadsheet,
        actorIdentity: state.actor
      };
    },
    executeCoreStagingBootstrap() { state.bootstrapCalls += 1; },
    module: { exports: {} }
  };
  vm.createContext(context);
  vm.runInContext(SOURCE, context, { filename: "owner-password-reset-staging.js" });
  return {
    context, state, rows,
    reset(password = VALID_PASSWORD) { return context.resetStagingOwnerPassword(password); }
  };
}

test("valid Staging reset commits and verifies hashed-only storage", () => {
  const h = harness();
  const result = h.reset();
  assert.equal(result.status, "COMMITTED");
  assert.equal(result.verificationStatus, "HASHED_ONLY_VERIFIED");
  assert.equal(h.rows[1][1], "");
  assert.equal(h.rows[1][5], sha256(VALID_PASSWORD));
  assert.equal(h.state.lockReleased, true);
});

test("Production is rejected before hash or write", () => {
  const h = harness({ environment: "production" });
  assert.throws(() => h.reset(), error => error.code === "OWNER_PASSWORD_RESET_STAGING_ONLY");
  assert.equal(h.state.hashCalls, 0);
  assert.equal(h.state.writes.length, 0);
});

test("spreadsheet identity and name mismatches are rejected", () => {
  for (const options of [{ actualId: "wrong-sheet" }, { spreadsheetName: "Wrong" }]) {
    const h = harness(options);
    assert.throws(() => h.reset(), error =>
      error.code === "OWNER_PASSWORD_RESET_SPREADSHEET_IDENTITY_INVALID");
    assert.equal(h.state.writes.length, 0);
  }
});

test("an authenticated interactive owner identity is required", () => {
  const h = harness({ actor: "" });
  assert.throws(() => h.reset(), error => error.code === "OWNER_PASSWORD_RESET_OWNER_REQUIRED");
  assert.equal(h.state.writes.length, 0);
});

test("missing and short passwords are rejected without writes", () => {
  for (const password of [undefined, "", "short"]) {
    const h = harness();
    assert.throws(() => h.context.resetStagingOwnerPassword(password), error =>
      error.code === (password && password.length ?
        "OWNER_PASSWORD_RESET_PASSWORD_TOO_SHORT" : "OWNER_PASSWORD_RESET_PASSWORD_REQUIRED"));
    assert.equal(h.state.writes.length, 0);
  }
});

test("the existing password is rejected without writes", () => {
  const h = harness();
  assert.throws(() => h.reset("old-password"), error =>
    error.code === "OWNER_PASSWORD_RESET_PASSWORD_UNCHANGED");
  assert.equal(h.state.writes.length, 0);
});

test("missing, duplicate, or malformed owner rows are rejected", () => {
  const cases = [
    [{ rows: [] }, "OWNER_PASSWORD_RESET_OWNER_MISSING"],
    [{ rows: [ownerRow(), ownerRow()] }, "OWNER_PASSWORD_RESET_OWNER_DUPLICATED"],
    [{ rows: [ownerRow({ PASSWORD_HASH: "bad" })] }, "OWNER_PASSWORD_RESET_OWNER_ROW_INVALID"],
    [{ rows: [ownerRow({ PASSWORD: "legacy" })] }, "OWNER_PASSWORD_RESET_OWNER_ROW_INVALID"]
  ];
  for (const [options, code] of cases) {
    const h = harness(options);
    assert.throws(() => h.reset(), error => error.code === code);
    assert.equal(h.state.writes.length, 0);
  }
});

test("only the existing owner credential cells change", () => {
  const unrelated = ["cashier", "", "Cashier", "sales", "2026-08-03", sha256("cashier")];
  const h = harness({ rows: [ownerRow(), unrelated] });
  const ownerBefore = h.rows[1].slice();
  const unrelatedBefore = h.rows[2].slice();
  h.reset();
  assert.deepEqual(h.state.writes.map(item => [item.row, item.column]), [[2, 2], [2, 6]]);
  [0, 2, 3, 4].forEach(index => assert.equal(h.rows[1][index], ownerBefore[index]));
  assert.deepEqual(h.rows[2], unrelatedBefore);
});

test("plaintext password and generated hash are not returned or logged", () => {
  const h = harness();
  const result = h.reset();
  const observable = JSON.stringify(result) + "\n" + h.state.logs.join("\n");
  assert.doesNotMatch(observable, new RegExp(VALID_PASSWORD));
  assert.doesNotMatch(observable, new RegExp(sha256(VALID_PASSWORD)));
  assert.doesNotMatch(observable, /passwordHash|passwordConfirmation/i);
});

test("standalone UI uses direct in-memory reset without UI or property storage", () => {
  assert.match(SOURCE, /function doGet\(\)/);
  assert.match(SOURCE, /\.resetStagingOwnerPassword\(v\)/);
  assert.doesNotMatch(SOURCE, /SpreadsheetApp\.getUi|PropertiesService|setProperty/);
});

test("lock failure blocks without writing", () => {
  const h = harness({ lockAvailable: false });
  assert.throws(() => h.reset(), error => error.code === "OWNER_PASSWORD_RESET_LOCK_UNAVAILABLE");
  assert.equal(h.state.writes.length, 0);
});

test("post-write verification failure rolls credentials back", () => {
  const h = harness({ postWriteVerificationFailure: true });
  assert.throws(() => h.reset(), error =>
    error.code === "OWNER_PASSWORD_RESET_OWNER_ROW_INVALID" ||
    error.code === "OWNER_PASSWORD_RESET_POST_WRITE_VERIFICATION_FAILED");
  assert.equal(h.rows[1][1], "");
  assert.equal(h.rows[1][5], OLD_HASH);
});

test("failed rollback reports RECOVERY_REQUIRED", () => {
  const h = harness({ postWriteVerificationFailure: true, rollbackFailure: true });
  assert.throws(() => h.reset(), error => error.code === "RECOVERY_REQUIRED");
});

test("safe verification exposes structure only and bootstrap is never invoked", () => {
  const h = harness();
  const result = h.context.verifyOwnerPasswordResetStateStaging();
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    ownerRowExists: true, ownerRowCount: 1, passwordState: "EMPTY",
    passwordHashState: "PRESENT", hashFormatValid: true, structurallyValid: true
  });
  h.reset();
  assert.equal(h.state.bootstrapCalls, 0);
});
