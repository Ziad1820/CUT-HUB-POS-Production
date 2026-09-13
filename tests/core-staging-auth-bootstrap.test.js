"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const routerSource = fs.readFileSync(path.join(ROOT, "scripts/app-script-final-owner-access.js"), "utf8");
const executorSource = fs.readFileSync(path.join(ROOT, "scripts/staff-schema-migration-staging-executor.js"), "utf8");
const bootstrapSource = fs.readFileSync(path.join(ROOT, "scripts/core-staging-auth-bootstrap.js"), "utf8");
const SPREADSHEET_ID = "stagingCoreAuthSpreadsheet_12345";
const OWNER_EMAIL = "owner@example.test";
const HEADERS = ["USERNAME", "PASSWORD", "DISPLAY_NAME", "PERMISSIONS", "CREATED_AT", "PASSWORD_HASH"];

function makeStore(initial = {}, onWrite = () => {}) {
  const values = { ...initial };
  return {
    getProperty(key) { return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null; },
    setProperty(key, value) { onWrite("set", key); values[key] = String(value); return this; },
    deleteProperty(key) { onWrite("delete", key); delete values[key]; return this; },
    getProperties() { return { ...values }; },
    values
  };
}

function makeHarness(options = {}) {
  const state = {
    environment: Object.prototype.hasOwnProperty.call(options, "environment") ? options.environment : "staging",
    spreadsheetId: options.spreadsheetId || SPREADSHEET_ID,
    stagingSpreadsheetId: options.stagingSpreadsheetId || SPREADSHEET_ID,
    activeSpreadsheetId: options.activeSpreadsheetId || SPREADSHEET_ID,
    effectiveEmail: Object.prototype.hasOwnProperty.call(options, "effectiveEmail") ? options.effectiveEmail : OWNER_EMAIL,
    activeEmail: Object.prototype.hasOwnProperty.call(options, "activeEmail") ? options.activeEmail : OWNER_EMAIL,
    ownerEmail: Object.prototype.hasOwnProperty.call(options, "ownerEmail") ? options.ownerEmail : OWNER_EMAIL,
    spreadsheetAccesses: 0,
    sheetReads: 0,
    sheetWrites: 0,
    scriptPropertyWrites: 0,
    userPropertyWrites: 0,
    logs: [],
    uuid: 0,
    lockOrder: [],
    releasedLocks: [],
    scriptLockAvailable: options.scriptLockAvailable !== false,
    documentLockAvailable: options.documentLockAvailable !== false,
    failurePoint: options.failurePoint || "",
    unsafeRollback: options.unsafeRollback === true
  };
  const scriptProperties = makeStore({
    CUT_HUB_ENVIRONMENT: state.environment,
    CUT_HUB_SPREADSHEET_ID: state.spreadsheetId,
    CUT_HUB_STAGING_SPREADSHEET_ID: state.stagingSpreadsheetId,
    CUT_HUB_BACKEND_VERSION: "test",
    "AUTH01:IDKEY:v1": Buffer.alloc(32, 7).toString("base64url"),
    "AUTH01:IDKEYFP:v1": "9xFfse5gsBd1s31RTEeNj10Y61xk6FcvOX_0RvbnO5s"
  }, () => { state.scriptPropertyWrites += 1; });
  const userProperties = makeStore({}, () => { state.userPropertyWrites += 1; });

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
    getValue() { return this.getValues()[0][0]; }
    getFormulas() {
      return Array.from({ length: this.rowCount }, () => new Array(this.columnCount).fill(""));
    }
    setValues(values) {
      state.sheetWrites += 1;
      values.forEach((sourceRow, rowOffset) => sourceRow.forEach((value, columnOffset) => {
        const rowIndex = this.row - 1 + rowOffset;
        const columnIndex = this.column - 1 + columnOffset;
        while (this.sheet.rows.length <= rowIndex) this.sheet.rows.push([]);
        this.sheet.rows[rowIndex][columnIndex] = value;
      }));
      return this;
    }
    setValue(value) { return this.setValues([[value]]); }
    clearContent() {
      state.sheetWrites += 1;
      for (let r = 0; r < this.rowCount; r += 1) {
        for (let c = 0; c < this.columnCount; c += 1) {
          if (this.sheet.rows[this.row - 1 + r]) this.sheet.rows[this.row - 1 + r][this.column - 1 + c] = "";
        }
      }
      return this;
    }
  }

  class Sheet {
    constructor(name, rows = []) {
      this.name = name;
      this.rows = rows.map(row => row.slice());
      this.maxColumns = Math.max(1, ...this.rows.map(row => row.length));
    }
    getName() { return this.name; }
    getLastColumn() {
      let last = 0;
      this.rows.forEach(row => row.forEach((value, index) => {
        if (value !== "" && value !== null && value !== undefined) last = Math.max(last, index + 1);
      }));
      return last;
    }
    getLastRow() {
      let last = 0;
      this.rows.forEach((row, index) => {
        if (row.some(value => value !== "" && value !== null && value !== undefined)) last = index + 1;
      });
      return last;
    }
    getMaxColumns() { return this.maxColumns; }
    insertColumnsAfter(_after, count) { state.sheetWrites += 1; this.maxColumns += count; }
    deleteColumns(start, count) { state.sheetWrites += 1; this.rows.forEach(row => row.splice(start - 1, count)); }
    deleteRow(rowNumber) { state.sheetWrites += 1; this.rows.splice(rowNumber - 1, 1); }
    appendRow(row) { state.sheetWrites += 1; this.rows.push(row.slice()); }
    getRange(row, column, rowCount = 1, columnCount = 1) {
      return new Range(this, row, column, rowCount, columnCount);
    }
  }

  const sheets = new Map();
  Object.entries(options.sheets || {}).forEach(([name, rows]) => sheets.set(name, new Sheet(name, rows)));
  const spreadsheet = {
    getId() { return state.activeSpreadsheetId; },
    getName() { return "CUT HUB POS STAGING"; },
    getSpreadsheetTimeZone() { return "Africa/Cairo"; },
    getSheetByName(name) { state.sheetReads += 1; return sheets.get(name) || null; },
    insertSheet(name) {
      state.sheetWrites += 1;
      const sheet = new Sheet(name);
      sheets.set(name, sheet);
      return sheet;
    },
    deleteSheet(sheet) { state.sheetWrites += 1; sheets.delete(sheet.getName()); },
    getUi() {
      return {
        showModalDialog(output) { state.dialogHtml = output && output.content || ""; }
      };
    }
  };

  function lock(kind) {
    return {
      tryLock() {
        state.lockOrder.push(kind);
        return kind === "script" ? state.scriptLockAvailable : state.documentLockAvailable;
      },
      releaseLock() { state.releasedLocks.push(kind); }
    };
  }

  const context = {
    Date, JSON, Object, Array, String, Number, Boolean, Math, Error, Set, Map,
    console: { log(value) { state.logs.push(String(value)); }, warn() {}, error() {} },
    Logger: { log(value) { state.logs.push(String(value)); } },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput(value) { return { value, setMimeType() { return this; } }; }
    },
    CacheService: {
      getScriptCache() { return { get() { return null; }, put() {}, remove() {} }; }
    },
    getCutHubEnvironmentConfig() {
      return {
        environment: state.environment,
        spreadsheetId: state.spreadsheetId,
        stagingSpreadsheetId: state.stagingSpreadsheetId,
        backendVersion: "test"
      };
    },
    SpreadsheetApp: {
      getActive() { state.spreadsheetAccesses += 1; return spreadsheet; },
      getUi() { return spreadsheet.getUi(); },
      flush() {}
    },
    PropertiesService: {
      getScriptProperties() { return scriptProperties; },
      getUserProperties() { return userProperties; }
    },
    LockService: {
      getScriptLock() { return lock("script"); },
      getDocumentLock() { return lock("document"); }
    },
    Session: {
      getEffectiveUser() { return { getEmail: () => state.effectiveEmail }; },
      getActiveUser() { return { getEmail: () => state.activeEmail }; }
    },
    DriveApp: {
      getFileById() { return { getOwner: () => ({ getEmail: () => state.ownerEmail }) }; }
    },
    HtmlService: {
      createHtmlOutput(content) {
        return { content, setWidth() { return this; }, setHeight() { return this; } };
      }
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: "SHA_256" }, Charset: { UTF_8: "UTF_8" },
      computeDigest(_algorithm, value) {
        return Array.from(crypto.createHash("sha256").update(String(value), "utf8").digest())
          .map(byte => byte > 127 ? byte - 256 : byte);
      },
      base64EncodeWebSafe(bytes) {
        return Buffer.from(Array.from(bytes, byte => byte & 255)).toString("base64")
          .replace(/\+/g, "-").replace(/\//g, "_");
      },
      base64DecodeWebSafe(value) {
        return Array.from(Buffer.from(String(value).replace(/-/g, "+").replace(/_/g, "/"), "base64"))
          .map(byte => byte > 127 ? byte - 256 : byte);
      },
      newBlob(value) { return { getBytes: () => Array.from(Buffer.from(String(value), "utf8")) }; },
      getUuid() { state.uuid += 1; return `uuid-${state.uuid}`; },
      formatDate() { return "2026-08-02 12:00:00"; }
    }
  };
  vm.createContext(context);
  vm.runInContext(routerSource, context, { filename: "app-script-final-owner-access.js" });
  context.auth01RuntimeOptions = () => ({
    testPolicy: { iterations: 2, allowedIterations: [2], maximumIterations: 2 },
    randomBytes: length => Array.from({ length }, (_, index) => index + 1)
  });
  vm.runInContext(executorSource, context, { filename: "staff-schema-migration-staging-executor.js" });
  vm.runInContext(bootstrapSource, context, { filename: "core-staging-auth-bootstrap.js" });
  context.coreStagingBootstrapFailureInjector = (point) => {
    if (state.failurePoint !== point) return;
    state.failurePoint = "";
    if (state.unsafeRollback && point === "AFTER_OWNER_ROW_WRITE_BEFORE_PROGRESS") {
      sheets.get("USERS").rows.push(["external", "", "External", "", "2026-08-02", "c".repeat(64)]);
    }
    throw Object.assign(new Error(`injected ${point}`), { code: "INJECTED_FAILURE" });
  };

  function stage(input = {}) {
    return context.stageCoreStagingBootstrapCredential({
      requestId: input.requestId || "CORE-REQUEST-1",
      ownerDisplayName: input.ownerDisplayName || "Staging Owner",
      password: input.password || "Very-Strong-Password-123!",
      passwordConfirmation: input.passwordConfirmation || input.password || "Very-Strong-Password-123!"
    });
  }
  function tokenRecord() {
    return JSON.parse(userProperties.getProperty("CORE_AUTH_BOOTSTRAP_TOKEN"));
  }
  function journals() {
    return Object.entries(scriptProperties.values)
      .filter(([key]) => key.startsWith("CORE_AUTH_BOOTSTRAP_JOURNAL_"))
      .map(([, value]) => JSON.parse(value));
  }
  return { context, state, sheets, spreadsheet, scriptProperties, userProperties, stage, tokenRecord, journals };
}

function prepare(h, input) {
  h.stage(input);
  return h.context.prepareCoreStagingBootstrap();
}

test("preview creates only USERS and reports optional Dashboard fallbacks", () => {
  const h = makeHarness();
  const staged = h.stage();
  const credential = JSON.parse(h.userProperties.getProperty("CORE_AUTH_BOOTSTRAP_CREDENTIAL"));
  const plan = h.context.previewCoreStagingBootstrap();
  assert.deepEqual(Array.from(plan.mandatoryCoreSheets), ["USERS"]);
  assert.deepEqual(Array.from(plan.createSheets, item => item.sheetName), ["USERS"]);
  assert.equal(plan.optionalDashboardDependencies.every(item => item.mandatoryForPageOpen === false), true);
  assert.deepEqual(Array.from(plan.approvedUsersHeaders), HEADERS);
  assert.equal(plan.safeToInitialize, true);
  assert.equal(plan.dryRun, true);
  assert.equal(plan.writes, 0);
  assert.equal(plan.ownerDisplayName, staged.ownerDisplayName);
  assert.equal(plan.credentialFingerprint, credential.credentialFingerprint);
  assert.equal(h.state.sheetWrites, 0);
});

test("authentication initialization diagnostic logs the complete preview and remains zero-write", () => {
  const h = makeHarness();
  const result = h.context.diagnosticPreviewStagingAuthenticationInitialization();
  assert.equal(result.dryRun, true);
  assert.equal(result.writes, 0);
  assert.equal(h.state.logs.length, 1);
  assert.equal(h.state.logs[0], JSON.stringify(result, null, 2));
  assert.equal(h.state.sheetWrites, 0);
  assert.equal(h.state.scriptPropertyWrites, 0);
  assert.equal(h.state.userPropertyWrites, 0);
});

test("authentication initialization diagnostic blocks Production before Spreadsheet access or logging", () => {
  const h = makeHarness({ environment: "production" });
  assert.throws(
    () => h.context.diagnosticPreviewStagingAuthenticationInitialization(),
    error => error.code === "CORE_BOOTSTRAP_STAGING_ONLY"
  );
  assert.equal(h.state.spreadsheetAccesses, 0);
  assert.equal(h.state.sheetReads, 0);
  assert.equal(h.state.sheetWrites, 0);
  assert.equal(h.state.logs.length, 0);
  assert.equal(h.state.scriptPropertyWrites, 0);
  assert.equal(h.state.userPropertyWrites, 0);
});

test("Core Staging bootstrap diagnostic logs the complete staged preview without writes or consumption", () => {
  const h = makeHarness();
  h.stage({ requestId: "DIAGNOSTIC-PREVIEW" });
  const credentialBefore = h.userProperties.getProperty("CORE_AUTH_BOOTSTRAP_CREDENTIAL");
  const writesBefore = {
    sheets: h.state.sheetWrites,
    scriptProperties: h.state.scriptPropertyWrites,
    userProperties: h.state.userPropertyWrites
  };
  const result = h.context.diagnosticPreviewCoreStagingBootstrap();
  assert.equal(result.dryRun, true);
  assert.equal(result.writes, 0);
  assert.equal(result.safeToInitialize, true);
  assert.equal(h.state.logs.at(-1), JSON.stringify(result, null, 2));
  assert.equal(h.state.sheetWrites, writesBefore.sheets);
  assert.equal(h.state.scriptPropertyWrites, writesBefore.scriptProperties);
  assert.equal(h.state.userPropertyWrites, writesBefore.userProperties);
  assert.equal(h.userProperties.getProperty("CORE_AUTH_BOOTSTRAP_CREDENTIAL"), credentialBefore);
  assert.equal(h.userProperties.getProperty("CORE_AUTH_BOOTSTRAP_TOKEN"), null);
});

test("Core Staging bootstrap diagnostic blocks Production before Spreadsheet access or logging", () => {
  const h = makeHarness({ environment: "production" });
  assert.throws(
    () => h.context.diagnosticPreviewCoreStagingBootstrap(),
    error => error.code === "CORE_BOOTSTRAP_STAGING_ONLY"
  );
  assert.equal(h.state.spreadsheetAccesses, 0);
  assert.equal(h.state.sheetReads, 0);
  assert.equal(h.state.sheetWrites, 0);
  assert.equal(h.state.logs.length, 0);
  assert.equal(h.state.scriptPropertyWrites, 0);
  assert.equal(h.state.userPropertyWrites, 0);
});

test("credential dialog fields map exactly to the server payload and show the 12-character minimum", () => {
  const h = makeHarness();
  h.context.openCoreStagingBootstrapCredentialDialog();
  const html = h.state.dialogHtml;
  assert.match(html, /id="password" name="password"[^>]*minlength="12"/);
  assert.match(html, /id="passwordConfirmation" name="passwordConfirmation"[^>]*minlength="12"/);
  assert.match(html, /الحد الأدنى: 12 حرفًا/);
  assert.match(html, /p=document\.getElementById\("password"\),c=document\.getElementById\("passwordConfirmation"\)/);
  assert.match(html, /password:p\.value,passwordConfirmation:c\.value/);
  assert.match(html, /stageCoreStagingBootstrapCredential\(payload\)/);
  assert.equal(h.state.sheetWrites, 0);
  assert.equal(h.state.scriptPropertyWrites, 0);
  assert.equal(h.state.userPropertyWrites, 0);
});

test("credential validation distinguishes matching, mismatch, minimum length, spaces, and Unicode", () => {
  const valid = "Matching-Password-12";
  const matching = makeHarness();
  const matchingResult = matching.context.stageCoreStagingBootstrapCredential({
    requestId: "PASSWORD-MATCH", ownerDisplayName: "Owner",
    password: valid, passwordConfirmation: valid
  });
  assert.equal(matchingResult.status, "CREDENTIAL_STAGED");
  assert.equal(JSON.stringify(matchingResult).includes(valid), false);
  assert.equal(matching.state.logs.join("\n").includes(valid), false);

  const mismatch = makeHarness();
  assert.throws(() => mismatch.context.stageCoreStagingBootstrapCredential({
    requestId: "PASSWORD-MISMATCH", ownerDisplayName: "Owner",
    password: valid, passwordConfirmation: valid + "x"
  }), error => error.code === "PASSWORD_CONFIRMATION_MISMATCH");
  assert.equal(mismatch.state.userPropertyWrites, 0);

  const short = makeHarness();
  assert.throws(() => short.context.stageCoreStagingBootstrapCredential({
    requestId: "PASSWORD-SHORT", ownerDisplayName: "Owner",
    password: "short-pass", passwordConfirmation: "short-pass"
  }), error => error.code === "PASSWORD_TOO_SHORT");
  assert.equal(short.state.userPropertyWrites, 0);

  const spacedPassword = "  spaced password  ";
  const spaces = makeHarness();
  spaces.context.stageCoreStagingBootstrapCredential({
    requestId: "PASSWORD-SPACES", ownerDisplayName: "Owner",
    password: spacedPassword, passwordConfirmation: spacedPassword
  });
  const spacedRecord = JSON.parse(spaces.userProperties.getProperty("CORE_AUTH_BOOTSTRAP_CREDENTIAL"));
  assert.ok(spaces.context.auth01ParseModernCredential(
    spacedRecord.passwordHash, spaces.context.auth01RuntimeOptions()
  ));
  assert.equal(spaces.context.auth01VerifyCredential(
    { passwordHash: spacedRecord.passwordHash, password: "" },
    spacedPassword, spaces.context.auth01RuntimeOptions()
  ).ok, true);
  assert.equal(spaces.context.auth01VerifyCredential(
    { passwordHash: spacedRecord.passwordHash, password: "" },
    spacedPassword.trim(), spaces.context.auth01RuntimeOptions()
  ).ok, false);

  const unicodePassword = "كلمة-مرور-آمنة-١٢٣";
  const unicode = makeHarness();
  const unicodeResult = unicode.context.stageCoreStagingBootstrapCredential({
    requestId: "PASSWORD-UNICODE", ownerDisplayName: "Owner",
    password: unicodePassword, passwordConfirmation: unicodePassword
  });
  assert.equal(unicodeResult.status, "CREDENTIAL_STAGED");
  assert.equal(JSON.stringify(unicodeResult).includes(unicodePassword), false);
  assert.equal(unicode.state.logs.join("\n").includes(unicodePassword), false);
});

test("exact positional headers are required and incompatible existing data blocks", () => {
  const swapped = makeHarness({ sheets: { USERS: [[HEADERS[1], HEADERS[0], ...HEADERS.slice(2)]] } });
  const plan = swapped.context.previewCoreStagingBootstrap();
  assert.equal(plan.safeToInitialize, false);
  assert.deepEqual(Array.from(plan.incompatibleCoreSheets), ["USERS"]);
  assert.equal(plan.errors.some(item => item.code === "CORE_USERS_HEADERS_INCOMPATIBLE"), true);

  const dataWithoutOwner = makeHarness({
    sheets: { USERS: [HEADERS, ["user", "", "User", "", "2026-08-02", "a".repeat(64)]] }
  });
  const unsafe = dataWithoutOwner.context.previewCoreStagingBootstrap();
  assert.equal(unsafe.errors.some(item => item.code === "CORE_USERS_EXISTING_DATA_WITHOUT_OWNER"), true);

  const nonCanonicalOwner = makeHarness({
    sheets: { USERS: [HEADERS, ["OWNER", "", "Owner", "", "not-a-date", "a".repeat(64)]] }
  }).context.previewCoreStagingBootstrap();
  assert.equal(nonCanonicalOwner.errors.some(item => item.code === "CORE_USERS_OWNER_USERNAME_NOT_CANONICAL"), true);
  assert.equal(nonCanonicalOwner.errors.some(item => item.code === "CORE_USERS_CREATED_AT_INVALID"), true);
});

test("duplicate owner and plaintext credentials are blocked", () => {
  const duplicate = makeHarness({
    sheets: { USERS: [HEADERS,
      ["owner", "", "Owner", "", "2026-08-02", "a".repeat(64)],
      ["OWNER", "", "Owner 2", "", "2026-08-02", "b".repeat(64)]] }
  });
  const duplicatePlan = duplicate.context.previewCoreStagingBootstrap();
  assert.equal(duplicatePlan.errors.some(item => item.code === "CORE_USERS_OWNER_DUPLICATE"), true);

  const plaintext = makeHarness({
    sheets: { USERS: [HEADERS, ["owner", "plaintext", "Owner", "", "2026-08-02", "a".repeat(64)]] }
  });
  const plaintextPlan = plaintext.context.previewCoreStagingBootstrap();
  assert.equal(plaintextPlan.ownerPasswordState, "HASHED_WITH_PLAINTEXT_RETAINED");
  assert.equal(plaintextPlan.errors.some(item => item.code === "CORE_USERS_PLAINTEXT_PRESENT"), true);
});

test("secure staging creates a hash-only owner without logging credential material", () => {
  const password = "Never-Log-This-Password-123!";
  const h = makeHarness();
  const summary = prepare(h, { requestId: "CREATE-OWNER", password });
  const storedCredential = JSON.parse(h.userProperties.getProperty("CORE_AUTH_BOOTSTRAP_CREDENTIAL"));
  const rawToken = h.tokenRecord().token;
  assert.equal(JSON.stringify(summary).includes(rawToken), false);
  assert.equal(JSON.stringify(summary).includes(storedCredential.passwordHash), false);
  assert.equal(h.state.logs.join("\n").includes(rawToken), false);
  assert.equal(h.state.logs.join("\n").includes(password), false);
  assert.equal(h.state.logs.join("\n").includes(storedCredential.passwordHash), false);
  const result = h.context.executePreparedCoreStagingBootstrap();
  const rows = h.sheets.get("USERS").rows;
  assert.deepEqual(rows[0].slice(0, 6), HEADERS);
  assert.equal(rows[1][0], "owner");
  assert.equal(rows[1][1], "");
  assert.equal(rows[1][2], "Staging Owner");
  assert.equal(rows[1][3], "");
  assert.match(rows[1][4], /^\d{4}-\d{2}-\d{2}T/);
  assert.ok(h.context.auth01ParseModernCredential(
    rows[1][5], h.context.auth01RuntimeOptions()
  ));
  assert.equal(rows.flat().includes(password), false);
  assert.equal(JSON.stringify(result).includes(rows[1][5]), false);
  assert.equal(JSON.stringify(h.journals()).includes(rows[1][5]), false);
  assert.equal(h.userProperties.getProperty("CORE_AUTH_BOOTSTRAP_TOKEN"), null);
  assert.equal(h.userProperties.getProperty("CORE_AUTH_BOOTSTRAP_CREDENTIAL"), null);
  assert.deepEqual(h.state.lockOrder.slice(-2), ["script", "document"]);
  assert.deepEqual(h.state.releasedLocks.slice(-2), ["document", "script"]);
});

test("Production, unknown, pin mismatch, and non-owner identities fail closed", () => {
  for (const environment of ["production", "unknown", ""]) {
    const h = makeHarness({ environment });
    assert.throws(() => h.context.previewCoreStagingBootstrap(), error => error.code === "CORE_BOOTSTRAP_STAGING_ONLY");
    assert.throws(() => h.context.stageCoreStagingBootstrapCredential({
      requestId: "BLOCKED", ownerDisplayName: "Blocked",
      password: "Blocked-Password-123!", passwordConfirmation: "Blocked-Password-123!"
    }), error => error.code === "CORE_BOOTSTRAP_STAGING_ONLY");
    assert.throws(() => h.context.executeCoreStagingBootstrap({
      requestId: "BLOCKED", confirmationToken: "blocked"
    }), error => error.code === "CORE_BOOTSTRAP_STAGING_ONLY");
    assert.equal(h.state.spreadsheetAccesses, 0);
    assert.equal(h.state.sheetReads, 0);
    assert.equal(h.state.sheetWrites, 0);
  }
  const pin = makeHarness({ stagingSpreadsheetId: "differentStagingSpreadsheet_98765" });
  assert.throws(() => pin.context.previewCoreStagingBootstrap(), error => error.code === "CORE_BOOTSTRAP_STAGING_PIN_MISMATCH");
  assert.equal(pin.state.spreadsheetAccesses, 0);
  for (const identities of [
    { effectiveEmail: "", activeEmail: "", ownerEmail: OWNER_EMAIL },
    { effectiveEmail: "other@example.test", activeEmail: "other@example.test", ownerEmail: OWNER_EMAIL },
    { effectiveEmail: OWNER_EMAIL, activeEmail: "alias@example.test", ownerEmail: OWNER_EMAIL }
  ]) {
    const h = makeHarness(identities);
    assert.throws(() => h.context.previewCoreStagingBootstrap(), error => error.code === "CORE_BOOTSTRAP_OWNER_REQUIRED");
    assert.equal(h.state.sheetWrites, 0);
  }
  const direct = makeHarness();
  assert.throws(() => direct.context.executeCoreStagingBootstrap(), error => error.code === "CORE_BOOTSTRAP_CONFIRMATION_REQUIRED");
  assert.equal(direct.state.spreadsheetAccesses, 0);
});

test("invalid, expired, reused, mismatched tokens and plan changes do not leak or prematurely consume valid state", () => {
  const invalid = makeHarness();
  const invalidSummary = prepare(invalid, { requestId: "INVALID" });
  assert.throws(() => invalid.context.executeCoreStagingBootstrap({
    requestId: invalidSummary.requestId, confirmationToken: "wrong"
  }), error => error.code === "CORE_BOOTSTRAP_TOKEN_INVALID");
  assert.ok(invalid.userProperties.getProperty("CORE_AUTH_BOOTSTRAP_TOKEN"));

  const credentialExpired = makeHarness();
  credentialExpired.stage({ requestId: "CREDENTIAL-EXPIRED" });
  const expiredCredentialRecord = JSON.parse(
    credentialExpired.userProperties.getProperty("CORE_AUTH_BOOTSTRAP_CREDENTIAL")
  );
  expiredCredentialRecord.expiresAt = "2000-01-01T00:00:00.000Z";
  credentialExpired.userProperties.setProperty(
    "CORE_AUTH_BOOTSTRAP_CREDENTIAL", JSON.stringify(expiredCredentialRecord)
  );
  assert.throws(() => credentialExpired.context.prepareCoreStagingBootstrap(),
    error => error.code === "CORE_BOOTSTRAP_CREDENTIAL_EXPIRED");

  const expired = makeHarness();
  const expiredSummary = prepare(expired, { requestId: "EXPIRED" });
  const expiredRecord = expired.tokenRecord();
  expiredRecord.expiresAt = "2000-01-01T00:00:00.000Z";
  expired.userProperties.setProperty("CORE_AUTH_BOOTSTRAP_TOKEN", JSON.stringify(expiredRecord));
  assert.throws(() => expired.context.executeCoreStagingBootstrap({
    requestId: expiredSummary.requestId, confirmationToken: expiredRecord.token
  }), error => error.code === "CORE_BOOTSTRAP_TOKEN_EXPIRED");

  const mismatch = makeHarness();
  const mismatchSummary = prepare(mismatch, { requestId: "MISMATCH" });
  const mismatchToken = mismatch.tokenRecord();
  assert.throws(() => mismatch.context.executeCoreStagingBootstrap({
    requestId: "OTHER", confirmationToken: mismatchToken.token
  }), error => error.code === "CORE_BOOTSTRAP_TOKEN_MISMATCH");
  assert.ok(mismatch.userProperties.getProperty("CORE_AUTH_BOOTSTRAP_TOKEN"));

  const changed = makeHarness();
  const changedSummary = prepare(changed, { requestId: "PLAN-CHANGE" });
  const changedToken = changed.tokenRecord();
  changed.spreadsheet.insertSheet("USERS").getRange(1, 1, 1, 6).setValues([HEADERS]);
  assert.throws(() => changed.context.executeCoreStagingBootstrap({
    requestId: changedSummary.requestId, confirmationToken: changedToken.token
  }), error => ["CORE_BOOTSTRAP_PLAN_HASH_MISMATCH", "CORE_BOOTSTRAP_PREVIEW_NOT_SAFE"].includes(error.code));
  assert.ok(changed.userProperties.getProperty("CORE_AUTH_BOOTSTRAP_TOKEN"));

  const reused = makeHarness();
  const reusedSummary = prepare(reused, { requestId: "REUSED" });
  const reusedToken = reused.tokenRecord().token;
  reused.context.executePreparedCoreStagingBootstrap();
  assert.throws(() => reused.context.executeCoreStagingBootstrap({
    requestId: reusedSummary.requestId, confirmationToken: reusedToken
  }), error => error.code === "CORE_BOOTSTRAP_TOKEN_INVALID");
});

for (const point of [
  "AFTER_USERS_SHEET_WRITE_BEFORE_PROGRESS",
  "AFTER_OWNER_ROW_WRITE_BEFORE_PROGRESS",
  "AFTER_ALL_WRITES_BEFORE_VERIFICATION",
  "AFTER_VERIFICATION_BEFORE_COMMITTED"
]) {
  test(`failure at ${point} safely rolls back request-created objects`, () => {
    const h = makeHarness({ failurePoint: point });
    prepare(h, { requestId: `ROLLBACK-${point}` });
    assert.throws(() => h.context.executePreparedCoreStagingBootstrap(), error => error.code === "INJECTED_FAILURE");
    assert.equal(h.sheets.has("USERS"), false);
    assert.equal(h.journals()[0].status, "ROLLED_BACK");
  });
}

test("abrupt sheet and owner-row writes remain detectable from pre-write journal intent", () => {
  for (const existingHeaderOnly of [false, true]) {
    const h = makeHarness({ sheets: existingHeaderOnly ? { USERS: [HEADERS] } : {} });
    h.stage({ requestId: existingHeaderOnly ? "ABRUPT-OWNER" : "ABRUPT-SHEET" });
    h.context.prepareCoreStagingBootstrap();
    const credential = JSON.parse(h.userProperties.getProperty("CORE_AUTH_BOOTSTRAP_CREDENTIAL"));
    const plan = h.context.previewCoreStagingBootstrap({
      ownerDisplayName: credential.ownerDisplayName,
      credentialFingerprint: credential.credentialFingerprint
    });
    const operation = h.context.coreStagingBootstrapOperations(plan, credential)[0];
    const proof = h.context.coreStagingBootstrapOperationProof(operation);
    const journalKey = Object.keys(h.scriptProperties.values)
      .find(key => key.startsWith("CORE_AUTH_BOOTSTRAP_JOURNAL_"));
    const journal = JSON.parse(h.scriptProperties.values[journalKey]);
    journal.status = "APPLYING";
    journal.inFlightOperation = proof;
    journal.operationIntents.push(proof);
    h.context.staffSchemaMigrationWriteJournal(journalKey, journal);
    h.context.coreStagingBootstrapApplyOperation(h.spreadsheet, operation);
    const diagnostic = h.context.diagnosticCoreStagingBootstrapRecovery();
    assert.equal(diagnostic[0].status, "APPLYING");
    assert.equal(diagnostic[0].inFlightOperation.type, operation.type);
    assert.equal(diagnostic[0].manualRemediation.length > 0, true);
  }
});

test("rollback deletes a request-created still-empty USERS sheet", () => {
  const h = makeHarness();
  h.spreadsheet.insertSheet("USERS");
  const journal = {
    operationIntents: [{ type: "CREATE_USERS_SHEET", sheetName: "USERS" }]
  };
  assert.deepEqual(Array.from(h.context.coreStagingBootstrapRollback(h.spreadsheet, journal)), []);
  assert.equal(h.sheets.has("USERS"), false);
});

test("unsafe rollback is marked RECOVERY_REQUIRED with non-mutating remediation", () => {
  const h = makeHarness({
    failurePoint: "AFTER_OWNER_ROW_WRITE_BEFORE_PROGRESS",
    unsafeRollback: true
  });
  prepare(h, { requestId: "RECOVERY" });
  assert.throws(() => h.context.executePreparedCoreStagingBootstrap(), error => error.code === "CORE_BOOTSTRAP_RECOVERY_REQUIRED");
  assert.equal(h.sheets.has("USERS"), true);
  assert.equal(h.journals()[0].status, "RECOVERY_REQUIRED");
  const writesBefore = h.state.sheetWrites;
  const recovery = h.context.diagnosticCoreStagingBootstrapRecovery();
  assert.equal(recovery.length, 1);
  assert.equal(recovery[0].manualRemediation.length > 0, true);
  assert.equal(h.state.sheetWrites, writesBefore);
});

test("committed retry returns the original result and a new request is idempotent with zero writes", () => {
  const h = makeHarness();
  const first = prepare(h, { requestId: "IDEMPOTENT", password: "Idempotent-Password-123!" });
  const result = h.context.executePreparedCoreStagingBootstrap();
  const writesAfterFirst = h.state.sheetWrites;
  assert.equal(result.status, "COMMITTED");

  h.stage({ requestId: "IDEMPOTENT", password: "Idempotent-Password-123!" });
  const retryPrepare = h.context.prepareCoreStagingBootstrap();
  assert.equal(retryPrepare.alreadyCommitted, true);
  const retry = h.context.executePreparedCoreStagingBootstrap();
  assert.equal(JSON.stringify(retry), JSON.stringify(result));
  assert.equal(h.state.sheetWrites, writesAfterFirst);

  h.stage({ requestId: "IDEMPOTENT-SECOND", password: "Idempotent-Password-123!" });
  h.context.prepareCoreStagingBootstrap();
  const second = h.context.executePreparedCoreStagingBootstrap();
  assert.equal(second.writes, 0);
  assert.equal(h.state.sheetWrites, writesAfterFirst);
  assert.equal(h.context.previewCoreStagingBootstrap().completed, true);
  assert.equal(first.ownerUsername, "owner");
});

test("request IDs are collision-isolated and different context cannot overwrite a committed journal", () => {
  const a = makeHarness();
  prepare(a, { requestId: "COLLISION-A", password: "Collision-Password-A-123!" });
  a.context.executePreparedCoreStagingBootstrap();
  a.stage({ requestId: "COLLISION-A", password: "Different-Password-B-123!" });
  assert.throws(() => a.context.prepareCoreStagingBootstrap(), error => error.code === "CORE_BOOTSTRAP_REQUEST_ID_REUSED");

  const keyA = a.context.coreStagingBootstrapJournalKey("A", SPREADSHEET_ID, OWNER_EMAIL);
  const keyB = a.context.coreStagingBootstrapJournalKey("B", SPREADSHEET_ID, OWNER_EMAIL);
  const keyUser = a.context.coreStagingBootstrapJournalKey("A", SPREADSHEET_ID, "other@example.test");
  const keySheet = a.context.coreStagingBootstrapJournalKey("A", "otherSpreadsheet_123456789", OWNER_EMAIL);
  assert.equal(new Set([keyA, keyB, keyUser, keySheet]).size, 4);
});

test("journal size guard and concurrent lock rejection remain enforced", () => {
  const h = makeHarness();
  assert.throws(() => h.context.staffSchemaMigrationWriteJournal("CORE_TEST", {
    oversized: "x".repeat(9000)
  }), error => error.code === "MIGRATION_JOURNAL_SIZE_LIMIT");
  const locked = makeHarness();
  locked.stage({ requestId: "LOCKED" });
  locked.state.scriptLockAvailable = false;
  assert.throws(() => locked.context.prepareCoreStagingBootstrap(), error => error.code === "MIGRATION_CONCURRENT_EXECUTION");
  assert.equal(locked.state.sheetWrites, 0);
});

test("created owner is compatible with the current login implementation", () => {
  const h = makeHarness({ sheets: { ACTIVITY_LOG: [["ID", "ACTION", "TYPE", "ENTITY", "USER", "DISPLAY", "DETAILS", "AT"]] } });
  const password = "Login-Compatible-Password-123!";
  prepare(h, { requestId: "LOGIN", password });
  h.context.executePreparedCoreStagingBootstrap();
  const output = h.context.loginUser({ username: "owner", password });
  const response = JSON.parse(output.value);
  assert.equal(response.status, "success");
  assert.equal(response.user.username, "owner");
  assert.equal(h.sheets.get("USERS").rows[1][1], "");
  assert.ok(h.context.auth01ParseModernCredential(
    h.sheets.get("USERS").rows[1][5], h.context.auth01RuntimeOptions()
  ));
});
