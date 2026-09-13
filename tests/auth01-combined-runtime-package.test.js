"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const definition = JSON.parse(fs.readFileSync(
  path.join(ROOT, "config/apps-script-deployment-package.json"), "utf8"
));
const sources = definition.filesInReviewOrder.map(file => ({
  file,
  source: fs.readFileSync(path.join(ROOT, file), "utf8")
}));

function fingerprint(key) {
  return crypto.createHash("sha256")
    .update("CUT-HUB-POS|AUTH01:IDKEY:v1|", "utf8")
    .update(Buffer.from(key, "base64url"))
    .digest("base64url");
}

function harness() {
  const key = Buffer.alloc(32, 7).toString("base64url");
  const values = {
    "AUTH01:IDKEY:v1": key,
    "AUTH01:IDKEYFP:v1": fingerprint(key)
  };
  let uuid = 0;
  const properties = {
    getProperty: name => values[name] ?? null,
    setProperty(name, value) { values[name] = String(value); return this; },
    deleteProperty(name) { delete values[name]; return this; },
    getProperties: () => ({ ...values })
  };
  const cacheValues = {};
  const context = {
    Date, JSON, Math, Number, Object, String, Boolean, Array, Set, Map, Error,
    console: { log() {}, warn() {}, error() {} },
    Logger: { log() {} },
    PropertiesService: {
      getScriptProperties: () => properties,
      getUserProperties: () => properties
    },
    CacheService: { getScriptCache: () => ({
      get: name => cacheValues[name] || null,
      put: (name, value) => { cacheValues[name] = String(value); },
      remove: name => { delete cacheValues[name]; }
    }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    SpreadsheetApp: { getActive: () => ({ getSheetByName: () => null }), flush() {} },
    Utilities: {
      DigestAlgorithm: { SHA_256: "SHA_256" }, Charset: { UTF_8: "UTF_8" },
      computeDigest(_algorithm, input) {
        const bytes = Array.isArray(input) ? Buffer.from(input.map(value => value & 255)) : Buffer.from(String(input));
        return Array.from(crypto.createHash("sha256").update(bytes).digest(), value => value > 127 ? value - 256 : value);
      },
      base64EncodeWebSafe(input) { return Buffer.from(Array.from(input, value => value & 255)).toString("base64url"); },
      base64DecodeWebSafe(input) { return Array.from(Buffer.from(String(input), "base64url"), value => value > 127 ? value - 256 : value); },
      getUuid() { uuid += 1; return `00000000-0000-4000-8000-${String(uuid).padStart(12, "0")}`; },
      formatDate() { return "2026-08-21 12:00:00"; }
    },
    ContentService: { MimeType: { JSON: "JSON" }, createTextOutput(value) { return { value, setMimeType() { return this; } }; } },
    HtmlService: { createHtmlOutput: value => value }
  };
  vm.createContext(context);
  sources.forEach(item => vm.runInContext(item.source, context, { filename: item.file }));
  context.jsonOutput = value => value;
  context.validateCutHubRequestEnvironment = () => {};
  context.readUsersFromSheet = () => [];
  context.auth01RuntimeOptions = () => ({
    testPolicy: { iterations: 2, allowedIterations: [2], maximumIterations: 2 },
    randomBytes: length => new Array(length).fill(9), properties,
    cache: context.CacheService.getScriptCache(),
    lockFactory: () => ({ tryLock: () => true, releaseLock() {} })
  });
  return { context, values };
}

test("actual two-file package executes in declared Apps Script review order", () => {
  assert.deepEqual(definition.filesInReviewOrder, [
    "scripts/app-script-final-owner-access.js",
    "scripts/booking-availability-phase5-apps-script-bundle.gs"
  ]);
  const h = harness();
  assert.equal(typeof h.context.doPost, "function");
  assert.equal(typeof h.context.loginUser, "function");
  assert.equal(typeof h.context.stageCoreStagingBootstrapCredential, "function");
  assert.equal(typeof h.context.resetOwnerPasswordEmergency, "function");
});

test("combined router keeps SEC-01 gate and resolves AUTH-01 login implementation", () => {
  const h = harness();
  let protectedCalls = 0;
  h.context.getTotalIncome = () => { protectedCalls += 1; return { status: "success" }; };
  const denied = h.context.doPost({ postData: { contents: JSON.stringify({ action: "totalIncome" }) } });
  assert.equal(denied.authRequired, true);
  assert.equal(protectedCalls, 0);
  const login = h.context.doPost({ postData: { contents: JSON.stringify({
    action: "loginUser", username: "unknown", password: "wrong"
  }) } });
  assert.deepEqual(JSON.parse(JSON.stringify(login)), {
    status: "error", message: "Invalid username or password."
  });
  assert.ok(h.values["AUTH01:RL:v1:G"]);
});

test("no legacy helper shadows crypto, bootstrap, reset, or router definitions", () => {
  const combined = sources.map(item => item.source).join("\n");
  for (const name of [
    "doPost", "loginUser", "auth01VerifyCredential", "createModernCredential",
    "auth01ReserveLoginAttempt", "auth01FinalizeLoginAttempt", "resetOwnerPasswordEmergency",
    "stageCoreStagingBootstrapCredential"
  ]) {
    assert.equal((combined.match(new RegExp(`function\\s+${name}\\s*\\(`, "g")) || []).length, 1, name);
  }
  const h = harness();
  const credential = h.context.createModernCredential("package-password", h.context.auth01RuntimeOptions());
  assert.equal(h.context.coreStagingBootstrapValidPasswordHash(credential), true);
  assert.equal(h.context.auth01VerifyCredential(
    { password: "", passwordHash: credential }, "package-password", h.context.auth01RuntimeOptions()
  ).ok, true);
});
