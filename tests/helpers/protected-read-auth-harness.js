"use strict";

// Offline adapters follow the existing AUTH-01 crypto/session harness. Fixture
// setup may write; the protected-read tests install effect spies afterwards.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "../..");
const SOURCE = fs.readFileSync(
  path.join(ROOT, "scripts", "app-script-final-owner-access.js"), "utf8"
);
const HEADERS = ["USERNAME", "PASSWORD", "DISPLAY_NAME", "PERMISSIONS", "CREATED_AT", "PASSWORD_HASH"];
const TEST_POLICY = {
  iterations: 2,
  allowedIterations: [1, 2, 4096],
  maximumIterations: 4096
};

function signed(bytes) {
  return Array.from(bytes, value => value > 127 ? value - 256 : value);
}

function identifierFingerprint(key, version = "v1") {
  return crypto.createHash("sha256")
    .update(Buffer.from(`CUT-HUB-POS|AUTH01:IDKEY:${version}|`, "utf8"))
    .update(Buffer.from(key, "base64url"))
    .digest("base64url");
}

function activateIdentifierV2(h, byte = 8) {
  const key = Buffer.alloc(32, byte).toString("base64url");
  h.props.setProperty("AUTH01:IDKEY:v2", key);
  h.props.setProperty("AUTH01:IDKEYFP:v2", identifierFingerprint(key, "v2"));
  h.props.setProperty("AUTH01:IDKEYACTIVE:v1", "v2");
  return key;
}

function store(initial = {}, failure = {}) {
  const values = { ...initial };
  return {
    getProperty(key) {
      if (failure.get) throw new Error("property get failed");
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null;
    },
    setProperty(key, value) {
      if (failure.set === true || (typeof failure.set === "function" && failure.set(key, value))) {
        throw new Error("property set failed");
      }
      values[key] = String(value);
      if (failure.setAfter === true ||
          (typeof failure.setAfter === "function" && failure.setAfter(key, value))) {
        throw new Error("property set response lost");
      }
      return this;
    },
    setProperties(entries) {
      if (failure.setProperties === "before") throw new Error("property batch set failed");
      Object.keys(entries || {}).forEach(key => { values[key] = String(entries[key]); });
      if (failure.setProperties === "after") throw new Error("property batch response lost");
      return this;
    },
    deleteProperty(key) {
      if (failure.delete) throw new Error("property delete failed");
      delete values[key]; return this;
    },
    getProperties() { return { ...values }; },
    values
  };
}

function cacheStore(options = {}) {
  const values = {};
  const calls = { get: 0, put: 0, remove: 0 };
  return {
    get(key) {
      calls.get += 1;
      if (options.fail || options.failGet) throw new Error("cache failed");
      return values[key] || null;
    },
    put(key, value) {
      calls.put += 1;
      if (options.fail || options.failPut) throw new Error("cache failed");
      values[key] = String(value);
    },
    remove(key) {
      calls.remove += 1;
      if (options.fail || options.failRemove) throw new Error("cache failed");
      delete values[key];
    },
    values,
    calls
  };
}

function sheet(rows, options = {}) {
  const values = rows.map(row => row.slice());
  let failHash = !!options.failHashWrite;
  let failPlain = !!options.failPlaintextClear;
  let writes = 0;
  function cell(row, column) { return values[row - 1]?.[column - 1] ?? ""; }
  function ensure(row, column) {
    while (values.length < row) values.push([]);
    while (values[row - 1].length < column) values[row - 1].push("");
  }
  return {
    getName: () => "USERS",
    getMaxColumns: () => Math.max(6, ...values.map(row => row.length)),
    getLastColumn: () => Math.max(6, ...values.map(row => row.length)),
    getLastRow: () => values.length,
    getRange(row, column, rowCount = 1, columnCount = 1) {
      return {
        getValue: () => cell(row, column),
        getValues: () => Array.from({ length: rowCount }, (_, r) =>
          Array.from({ length: columnCount }, (_, c) => cell(row + r, column + c))),
        setValue(value) {
          if (column === 6 && failHash) { failHash = false; throw new Error("hash write failed"); }
          if (column === 2 && failPlain) { failPlain = false; throw new Error("plaintext clear failed"); }
          writes += 1; ensure(row, column); values[row - 1][column - 1] = value; return this;
        },
        setValues(next) {
          writes += 1;
          next.forEach((sourceRow, r) => sourceRow.forEach((value, c) => {
            ensure(row + r, column + c); values[row + r - 1][column + c - 1] = value;
          }));
          return this;
        }
      };
    },
    appendRow(row) { writes += 1; values.push(row.slice()); },
    deleteRow(row) { writes += 1; values.splice(row - 1, 1); },
    insertColumnsAfter() { writes += 1; },
    rows: values,
    writeCount: () => writes
  };
}

function harness(options = {}) {
  const props = options.properties || store();
  const cache = options.cache || cacheStore();
  const users = options.users || sheet([HEADERS]);
  const workbook = {
    getSheetByName(name) { return name === "USERS" ? users : null; },
    getId: () => "local-only"
  };
  let uuid = 0;
  const context = {
    Date, JSON, Math, Number, Object, String, Boolean, Array, Set, Map, Error,
    console: { log() {}, warn() {}, error() {} },
    Logger: { log() {} },
    SpreadsheetApp: { getActive: () => workbook, flush() {} },
    PropertiesService: { getScriptProperties: () => props },
    CacheService: { getScriptCache: () => cache },
    LockService: {
      getScriptLock() {
        return {
          tryLock: () => options.lockAvailable !== false,
          releaseLock() {}
        };
      }
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: "SHA_256" }, Charset: { UTF_8: "UTF_8" },
      computeDigest(_algorithm, value) {
        const input = Array.isArray(value) ? Buffer.from(value.map(v => v & 255)) : Buffer.from(String(value), "utf8");
        return signed(crypto.createHash("sha256").update(input).digest());
      },
      base64EncodeWebSafe(bytes) {
        return Buffer.from(Array.from(bytes, value => value & 255)).toString("base64")
          .replace(/\+/g, "-").replace(/\//g, "_");
      },
      base64DecodeWebSafe(value) {
        const text = String(value).replace(/-/g, "+").replace(/_/g, "/");
        return signed(Buffer.from(text + "=".repeat((4 - text.length % 4) % 4), "base64"));
      },
      getUuid() { uuid += 1; return `00000000-0000-4000-8000-${String(uuid).padStart(12, "0")}`; },
      formatDate(_date, _zone, format) {
        return format === "yyyy-MM-dd" ? "2026-08-21" : "2026-08-21 12:00:00";
      }
    },
    ContentService: {
      MimeType: { JSON: "JSON" },
      createTextOutput(value) { return { value, setMimeType() { return this; } }; }
    }
  };
  vm.createContext(context);
  vm.runInContext(options.source || SOURCE, context, { filename: "app-script-final-owner-access.js" });
  context.jsonOutput = value => value;
  const runtimeOptions = {
    testPolicy: TEST_POLICY,
    randomBytes(length) { return Array.from({ length }, (_, index) => (index + uuid + 1) & 255); },
    throttlePolicy: options.throttlePolicy,
    now: options.now,
    properties: props,
    cache,
    lockFactory() {
      return { tryLock: () => options.lockAvailable !== false, releaseLock() {} };
    },
    sheet: users
  };
  context.auth01RuntimeOptions = () => runtimeOptions;
  if (!options.preserveIdentifierConfig) {
    const identifierKey = Buffer.alloc(32, 7).toString("base64url");
    props.setProperty("AUTH01:IDKEY:v1", identifierKey);
    props.setProperty("AUTH01:IDKEYFP:v1", identifierFingerprint(identifierKey));
  }
  return { context, props, cache, users, runtimeOptions };
}

function legacyHash(password) {
  return crypto.createHash("sha256").update(password, "utf8").digest("hex");
}

function modern(h, password, seed = 1) {
  return h.context.createModernCredential(password, {
    testPolicy: TEST_POLICY,
    randomBytes: length => Array.from({ length }, (_, index) => (index + seed) & 255)
  });
}

function resolvedAuthContext(h, token, forged = {}) {
  return h.context.resolveAuthenticatedRequestContext(Object.assign({}, forged, {
    sessionToken: token
  }));
}

function logoutCurrentSession(h, token, request = {}) {
  const authContext = resolvedAuthContext(h, token, request);
  return h.context.logoutUser(request, authContext);
}

function authenticatedSessionHarness(options = {}) {
  const users = options.users || sheet([
    HEADERS,
    ["owner", "", "Owner", "", "2026-08-24", "synthetic-not-used"]
  ]);
  return harness(Object.assign({}, options, { users }));
}


module.exports = { harness, modern, sheet };
