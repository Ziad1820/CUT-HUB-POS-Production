"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const SOURCE = fs.readFileSync(
  path.join(ROOT, "scripts", "app-script-final-owner-access.js"), "utf8"
);
const IMMUTABLE_V31_SOURCE = fs.readFileSync(
  path.join(ROOT, ".auth01-v32-logout-root-cause-20260824", "v31", "router.js"), "utf8"
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

test("PBKDF2-HMAC-SHA-256 matches published known-answer vectors", () => {
  const h = harness();
  const vectors = [
    [1, "120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b"],
    [2, "ae4d0c95af6b46d32d0adff928f06dd02a303f8ef3c251dfd6e2d85a95474c43"],
    [4096, "c5e478d59288c841aa530db6845c4c8d962893a001ce4e11a4963873aa98134a"]
  ];
  vectors.forEach(([iterations, expected]) => {
    const actual = h.context.auth01Pbkdf2HmacSha256(
      h.context.auth01Utf8Bytes("password"), h.context.auth01Utf8Bytes("salt"), iterations, 32
    );
    assert.equal(h.context.auth01BytesToHex(actual), expected);
  });
});

test("modern format parser is strict, canonical, and cost bounded", () => {
  const h = harness();
  const record = modern(h, "correct horse", 3);
  const parsed = h.context.auth01ParseModernCredential(record, { testPolicy: TEST_POLICY });
  assert.equal(parsed.iterations, 2);
  assert.equal(parsed.salt.length, 16);
  assert.equal(parsed.verifier.length, 32);
  const invalid = [
    record.replace("cuthub$1", "cuthub$2"),
    record.replace("pbkdf2-sha256", "pbkdf2-sha512"),
    record.replace("i=2,l=32", "i=3,l=32"),
    record.replace("i=2,l=32", "i=999999,l=32"),
    record + "$extra",
    record.replace(/\$([^$]+)$/, "$bad+base64"),
    record.replace(/\$([^$]+)$/, (_m, dk) => `$${dk.slice(1)}`),
    record.replace(/\$([^$]+)\$([^$]+)$/, (_m, salt, dk) => `$${salt.slice(1)}$${dk}`),
    record.replace("i=2,l=32", "i=02,l=32")
  ];
  invalid.forEach(value => assert.equal(
    h.context.auth01ParseModernCredential(value, { testPolicy: TEST_POLICY }), null
  ));
});

test("modern verification preserves spaces, normalizes NFC, and uses fresh salts", () => {
  const h = harness();
  const decomposed = "  Cafe\u0301 password  ";
  const first = modern(h, decomposed, 1);
  const second = modern(h, decomposed, 2);
  assert.notEqual(first, second);
  assert.equal(h.context.auth01VerifyCredential(
    { password: "", passwordHash: first }, "  Caf\u00e9 password  ", { testPolicy: TEST_POLICY }
  ).ok, true);
  assert.equal(h.context.auth01VerifyCredential(
    { password: "", passwordHash: first }, "Caf\u00e9 password", { testPolicy: TEST_POLICY }
  ).ok, false);
});

test("credential classifier covers all states and plaintext residue", () => {
  const h = harness();
  const record = modern(h, "secret");
  const classify = value => h.context.auth01ClassifyCredential(value, { testPolicy: TEST_POLICY });
  assert.equal(classify({ password: "", passwordHash: record }).state, "MODERN_V1");
  assert.equal(classify({ password: "", passwordHash: legacyHash("secret") }).state, "LEGACY_SHA256");
  assert.equal(classify({ password: "secret", passwordHash: "" }).state, "LEGACY_PLAINTEXT");
  assert.equal(classify({ password: "", passwordHash: "bad" }).state, "INVALID");
  assert.equal(classify({ password: "", passwordHash: "" }).state, "EMPTY");
  assert.equal(classify({ password: "residue", passwordHash: record }).plaintextResidue, true);
  assert.equal(classify({ password: "residue", passwordHash: legacyHash("secret") }).plaintextResidue, true);
  assert.equal(classify({ password: "residue", passwordHash: "bad" }).plaintextResidue, true);
});

test("nonempty hash mismatch never falls back to plaintext", () => {
  const h = harness();
  const fixtures = [modern(h, "modern"), legacyHash("legacy"), "invalid"];
  fixtures.forEach(passwordHash => assert.equal(h.context.auth01VerifyCredential(
    { password: "fallback", passwordHash }, "fallback",
    { testPolicy: TEST_POLICY, allowLegacyPlaintext: true }
  ).ok, false));
});

test("legacy plaintext requires explicit policy and legacy SHA keeps raw semantics", () => {
  const h = harness();
  assert.equal(h.context.auth01VerifyCredential(
    { password: " raw ", passwordHash: "" }, " raw ", { testPolicy: TEST_POLICY }
  ).ok, false);
  assert.equal(h.context.auth01VerifyCredential(
    { password: " raw ", passwordHash: "" }, " raw ",
    { testPolicy: TEST_POLICY, allowLegacyPlaintext: true }
  ).ok, true);
  assert.equal(h.context.auth01VerifyCredential(
    { password: "", passwordHash: legacyHash("e\u0301") }, "e\u0301", { testPolicy: TEST_POLICY }
  ).ok, true);
  assert.equal(h.context.auth01VerifyCredential(
    { password: "", passwordHash: legacyHash("e\u0301") }, "\u00e9", { testPolicy: TEST_POLICY }
  ).ok, false);
});

test("SHA and plaintext migrations commit modern hash, clear plaintext, and preserve epoch", () => {
  for (const fixture of [
    { password: "", passwordHash: legacyHash("secret"), allow: false },
    { password: "secret", passwordHash: "", allow: true }
  ]) {
    const users = sheet([HEADERS, ["owner", fixture.password, "Owner", "", "2026-08-21", fixture.passwordHash]]);
    const h = harness({ users });
    const user = h.context.readUsersFromSheet()[0];
    const options = Object.assign({}, h.runtimeOptions, {
      allowLegacyPlaintext: fixture.allow,
      requestId: `migration-${fixture.allow}`
    });
    const verification = h.context.auth01VerifyCredential(user, "secret", options);
    const migrated = h.context.auth01MigrateCredential(user, "secret", verification, options);
    assert.equal(users.rows[1][1], "");
    assert.equal(h.context.auth01ClassifyCredential(migrated, options).state, "MODERN_V1");
    assert.equal(h.context.auth01ReadCredentialEpoch("owner", options), 0);
    assert.equal(Object.keys(h.props.values).some(key => key.startsWith("AUTH01:MIG:v1:")), false);
  }
});

test("concurrent completed migration is accepted and changed rows are never overwritten", () => {
  const users = sheet([HEADERS, ["owner", "", "Owner", "", "2026-08-21", legacyHash("secret")]]);
  const h = harness({ users });
  const stale = h.context.readUsersFromSheet()[0];
  const verification = h.context.auth01VerifyCredential(stale, "secret", h.runtimeOptions);
  const committed = modern(h, "secret", 9);
  users.rows[1][5] = committed;
  const result = h.context.auth01MigrateCredential(stale, "secret", verification, h.runtimeOptions);
  assert.equal(result.passwordHash, committed);
  users.rows[1][5] = "invalid-newer-state";
  assert.throws(
    () => h.context.auth01MigrateCredential(stale, "secret", verification, h.runtimeOptions),
    error => error.code === "AUTH01_MIGRATION_ROW_CHANGED"
  );
  assert.equal(users.rows[1][5], "invalid-newer-state");
});

test("migration failures create secret-free recovery state and never restore plaintext", () => {
  const users = sheet([HEADERS, ["owner", "legacy-secret", "Owner", "", "2026-08-21", ""]], {
    failPlaintextClear: true
  });
  const h = harness({ users });
  const user = h.context.readUsersFromSheet()[0];
  const options = Object.assign({}, h.runtimeOptions, {
    allowLegacyPlaintext: true, requestId: "recovery-case"
  });
  const verification = h.context.auth01VerifyCredential(user, "legacy-secret", options);
  assert.throws(
    () => h.context.auth01MigrateCredential(user, "legacy-secret", verification, options),
    error => error.code === "AUTH01_MIGRATION_RECOVERY_REQUIRED"
  );
  assert.equal(users.rows[1][1], "legacy-secret");
  assert.match(users.rows[1][5], /^cuthub\$1\$/);
  const journal = h.props.getProperty("AUTH01:MIG:v1:recovery-case");
  assert.match(journal, /RECOVERY_REQUIRED/);
  assert.doesNotMatch(journal, /legacy-secret|cuthub\$|sessionToken|passwordHash/);
});

test("safe hash-write failure leaves source credential and no journal", () => {
  const users = sheet([HEADERS, ["owner", "", "Owner", "", "2026-08-21", legacyHash("secret")]], {
    failHashWrite: true
  });
  const h = harness({ users });
  const user = h.context.readUsersFromSheet()[0];
  const verification = h.context.auth01VerifyCredential(user, "secret", h.runtimeOptions);
  assert.throws(() => h.context.auth01MigrateCredential(
    user, "secret", verification, Object.assign({}, h.runtimeOptions, { requestId: "safe-fail" })
  ));
  assert.equal(users.rows[1][5], legacyHash("secret"));
  assert.equal(h.props.getProperty("AUTH01:MIG:v1:safe-fail"), null);
});

test("canonical usernames, collision detection, and opaque identifiers are deterministic and private", () => {
  const h = harness();
  assert.equal(h.context.auth01CanonicalUsername("  OWNE\u0301R "), "own\u00e9r");
  assert.equal(h.context.auth01FindCanonicalUsernameCollisions([
    { username: "Owner" }, { username: " owner " }
  ]).length, 1);
  const opaque = h.context.auth01OpaqueUserId("Owner", h.runtimeOptions);
  assert.equal(opaque, h.context.auth01OpaqueUserId(" owner ", h.runtimeOptions));
  assert.doesNotMatch(opaque, /owner/i);
  const generated = h.context.auth01GenerateIdentifierKey({ randomBytes: n => new Array(n).fill(11) });
  assert.equal(Buffer.from(generated, "base64url").length, 32);
});

test("credential epoch defaults to zero, reset increments it, and rehash does not", () => {
  const users = sheet([HEADERS, ["owner", "", "Owner", "", "2026-08-21", legacyHash("old")]]);
  const h = harness({ users });
  assert.equal(h.context.auth01ReadCredentialEpoch("owner", h.runtimeOptions), 0);
  const oldUser = h.context.readUsersFromSheet()[0];
  const verification = h.context.auth01VerifyCredential(oldUser, "old", h.runtimeOptions);
  h.context.auth01MigrateCredential(oldUser, "old", verification, h.runtimeOptions);
  assert.equal(h.context.auth01ReadCredentialEpoch("owner", h.runtimeOptions), 0);
  const migrated = h.context.readUsersFromSheet()[0];
  const changed = h.context.auth01ReplaceCredential(migrated, "new", h.runtimeOptions);
  assert.equal(changed.credentialEpoch, 1);
  assert.equal(users.rows[1][1], "");
  assert.equal(h.context.auth01VerifyCredential(changed.user, "new", h.runtimeOptions).ok, true);
});

test("sessions require key identity and epoch changes reject every stale session", () => {
  const users = sheet([HEADERS, ["owner", "", "Owner", "", "2026-08-21", modern(harness(), "secret")]]);
  const h = harness({ users });
  const expiry = new Date(Date.now() + 600000).toISOString();
  h.props.setProperty("romeo-session-legacy", JSON.stringify({ username: "owner", expiresAt: expiry }));
  assert.equal(h.context.getAuthenticatedUser({ sessionToken: "legacy" }), null);
  const first = h.context.createSessionForUser(h.context.readUsersFromSheet()[0]);
  const second = h.context.createSessionForUser(h.context.readUsersFromSheet()[0]);
  assert.ok(h.context.getAuthenticatedUser({ sessionToken: first.token }));
  assert.ok(h.context.getAuthenticatedUser({ sessionToken: second.token }));
  h.context.auth01IncrementCredentialEpoch("owner", h.runtimeOptions);
  assert.equal(h.context.getAuthenticatedUser({ sessionToken: "legacy" }), null);
  assert.equal(h.context.getAuthenticatedUser({ sessionToken: first.token }), null);
  assert.equal(h.context.getAuthenticatedUser({ sessionToken: second.token }), null);
  const fresh = h.context.createSessionForUser(h.context.readUsersFromSheet()[0]);
  assert.ok(h.context.getAuthenticatedUser({ sessionToken: fresh.token }));
});

test("logout revokes only the requested session and retry is idempotent", () => {
  const users = sheet([HEADERS, ["owner", "", "Owner", "", "2026-08-21", modern(harness(), "secret")]]);
  const h = harness({ users });
  const first = h.context.createSessionForUser(h.context.readUsersFromSheet()[0]);
  const second = h.context.createSessionForUser(h.context.readUsersFromSheet()[0]);
  const credentialBefore = JSON.stringify(users.rows);

  assert.ok(h.context.getAuthenticatedUser({ sessionToken: first.token }));
  assert.ok(h.context.getAuthenticatedUser({ sessionToken: second.token }));

  const firstContext = resolvedAuthContext(h, first.token);
  const result = h.context.logoutUser({}, firstContext);
  assert.equal(result.status, "success");
  assert.equal(result.logoutAccepted, true);
  assert.equal(result.clientCleanupAllowed, true);
  assert.equal(Object.prototype.hasOwnProperty.call(result, "revoked"), false);
  assert.equal(h.props.getProperty(`romeo-session-${first.token}`), null);
  assert.equal(h.context.getAuthenticatedUser({ sessionToken: first.token }), null);
  assert.ok(h.context.getAuthenticatedUser({ sessionToken: second.token }));

  const retryContext = resolvedAuthContext(h, first.token);
  assert.equal(retryContext, null);
  const retry = h.context.logoutUser({}, retryContext);
  assert.equal(retry.status, "success");
  assert.equal(retry.logoutAccepted, true);
  assert.equal(retry.clientCleanupAllowed, true);
  assert.equal(Object.prototype.hasOwnProperty.call(retry, "revoked"), false);
  assert.equal(h.props.getProperty(`romeo-session-${first.token}`), null);
  assert.ok(h.context.getAuthenticatedUser({ sessionToken: second.token }));
  assert.equal(JSON.stringify(users.rows), credentialBefore);
});

test("activity-log failure cannot block authoritative logout", () => {
  const cache = cacheStore();
  const users = sheet([HEADERS, ["owner", "", "Owner", "", "2026-08-21", modern(harness(), "secret")]]);
  const h = harness({ users, cache });
  const session = h.context.createSessionForUser(h.context.readUsersFromSheet()[0]);
  h.context.logActivity = () => { throw new Error("activity unavailable"); };

  const result = logoutCurrentSession(h, session.token);
  assert.equal(result.status, "success");
  assert.equal(result.logoutAccepted, true);
  assert.equal(h.props.getProperty(`romeo-session-${session.token}`), null);
  assert.ok(cache.calls.remove >= 1);
  assert.equal(h.context.getAuthenticatedUser({ sessionToken: session.token }), null);
});

test("cache removal failure cannot preserve authorization after property deletion", () => {
  const cacheOptions = {};
  const cache = cacheStore(cacheOptions);
  const users = sheet([HEADERS, ["owner", "", "Owner", "", "2026-08-21", modern(harness(), "secret")]]);
  const h = harness({ users, cache });
  const session = h.context.createSessionForUser(h.context.readUsersFromSheet()[0]);
  const sessionKey = `romeo-session-${session.token}`;
  assert.ok(cache.values[sessionKey]);
  cacheOptions.failRemove = true;

  const authContext = resolvedAuthContext(h, session.token);
  const result = h.context.revokeResolvedSession(authContext);
  assert.equal(result.ok, true);
  assert.equal(result.revoked, true);
  assert.equal(result.cacheRemovalAttempted, true);
  assert.equal(result.cacheRemovalFailed, true);
  assert.equal(h.props.getProperty(sessionKey), null);
  assert.ok(cache.values[sessionKey], "stale cache fixture should remain after remove failure");
  assert.equal(h.context.getAuthenticatedUser({ sessionToken: session.token }), null);
});

test("stale positive cache is never authoritative when the session property is absent", () => {
  const cache = cacheStore();
  const users = sheet([HEADERS, ["owner", "", "Owner", "", "2026-08-21", modern(harness(), "secret")]]);
  const h = harness({ users, cache });
  const session = h.context.createSessionForUser(h.context.readUsersFromSheet()[0]);
  const sessionKey = `romeo-session-${session.token}`;
  const stale = cache.values[sessionKey];
  h.props.deleteProperty(sessionKey);
  cache.values[sessionKey] = stale;

  assert.equal(h.context.getAuthenticatedUser({ sessionToken: session.token }), null);
  assert.equal(cache.calls.get, 0, "protected resolution must not read a positive cache first");

  let protectedCalls = 0;
  h.context.validateCutHubRequestEnvironment = () => {};
  h.context.getInvoices = () => { protectedCalls += 1; return { status: "handler" }; };
  const denied = h.context.doPost({ postData: { contents: JSON.stringify({
    action: "getInvoices", sessionToken: session.token
  }) } });
  assert.equal(denied.authRequired, true);
  assert.equal(protectedCalls, 0);
});

test("cache outage is fail-safe and cannot resurrect a revoked session", () => {
  const cacheOptions = {};
  const cache = cacheStore(cacheOptions);
  const users = sheet([HEADERS, ["owner", "", "Owner", "", "2026-08-21", modern(harness(), "secret")]]);
  const h = harness({ users, cache });
  const session = h.context.createSessionForUser(h.context.readUsersFromSheet()[0]);
  const sessionKey = `romeo-session-${session.token}`;
  cacheOptions.fail = true;

  assert.ok(h.context.getAuthenticatedUser({ sessionToken: session.token }),
    "authoritative property remains usable when cache acceleration is unavailable");
  h.props.deleteProperty(sessionKey);
  assert.equal(h.context.getAuthenticatedUser({ sessionToken: session.token }), null);
});

test("session creation remains coherent when cache acceleration is unavailable", () => {
  const cache = cacheStore({ fail: true });
  const users = sheet([HEADERS, ["owner", "", "Owner", "", "2026-08-21", modern(harness(), "secret")]]);
  const h = harness({ users, cache });
  const session = h.context.createSessionForUser(h.context.readUsersFromSheet()[0]);
  assert.ok(session.token);
  assert.ok(h.props.getProperty(`romeo-session-${session.token}`));
  assert.ok(h.context.getAuthenticatedUser({ sessionToken: session.token }));
});

test("property deletion failure cannot produce false logout success", () => {
  const propertyFailure = { delete: false };
  const props = store({ "unrelated-property": "preserve" }, propertyFailure);
  const users = sheet([HEADERS, ["owner", "", "Owner", "", "2026-08-21", modern(harness(), "secret")]]);
  const h = harness({ users, properties: props });
  const session = h.context.createSessionForUser(h.context.readUsersFromSheet()[0]);
  propertyFailure.delete = true;

  const authContext = resolvedAuthContext(h, session.token);
  const result = h.context.logoutUser({}, authContext);
  assert.equal(result.status, "error");
  assert.equal(result.logoutAccepted, false);
  assert.equal(result.clientCleanupAllowed, false);
  assert.equal(result.code, "LOGOUT_NOT_COMPLETED");
  assert.ok(h.props.getProperty(`romeo-session-${session.token}`));
  assert.ok(h.context.getAuthenticatedUser({ sessionToken: session.token }));
  assert.equal(h.props.getProperty("unrelated-property"), "preserve");
});

test("missing malformed and unknown logout credentials never claim confirmed revocation", () => {
  const h = authenticatedSessionHarness();
  const realSession = h.context.createSessionForUser({ username: "owner" });
  const realKey = `romeo-session-${realSession.token}`;
  const missing = h.context.logoutUser({}, null);
  assert.equal(missing.status, "success");
  assert.equal(missing.logoutAccepted, true);
  assert.equal(Object.prototype.hasOwnProperty.call(missing, "revoked"), false);

  const malformedContext = resolvedAuthContext(h, "bad token");
  assert.equal(malformedContext, null);
  const malformed = h.context.logoutUser({}, malformedContext);
  assert.equal(malformed.status, "success");
  assert.equal(Object.prototype.hasOwnProperty.call(malformed, "revoked"), false);

  const unknownContext = resolvedAuthContext(
    h, "00000000-0000-4000-8000-900000000001-00000000-0000-4000-8000-900000000002"
  );
  assert.equal(unknownContext, null);
  const unknown = h.context.logoutUser({}, unknownContext);
  assert.equal(unknown.status, "success");
  assert.equal(Object.prototype.hasOwnProperty.call(unknown, "revoked"), false);
  assert.ok(h.props.getProperty(realKey));
  assert.ok(h.context.getAuthenticatedUser({ sessionToken: realSession.token }));
});

test("logout echoes only the safe request correlation and preserves the revocation contract", () => {
  const users = sheet([HEADERS, ["owner", "", "Owner", "", "2026-08-21", modern(harness(), "secret")]]);
  const h = harness({ users });
  const session = h.context.createSessionForUser(h.context.readUsersFromSheet()[0]);
  const request = { authRequestId: "logout-local-correlation-001" };
  const result = h.context.logoutUser(request, resolvedAuthContext(h, session.token));
  assert.equal(result.status, "success");
  assert.equal(result.logoutAccepted, true);
  assert.equal(result.authRequestId, "logout-local-correlation-001");
  assert.equal(h.props.getProperty(`romeo-session-${session.token}`), null);
});

test("logout contract 01/18 current session revokes and is rejected", () => {
  const h = authenticatedSessionHarness();
  const session = h.context.createSessionForUser({ username: "owner" });
  assert.ok(resolvedAuthContext(h, session.token));
  const result = logoutCurrentSession(h, session.token);
  assert.equal(result.logoutAccepted, true);
  assert.equal(h.context.getAuthenticatedUser({ sessionToken: session.token }), null);
});

test("logout contract 02/18 wrong valid-format token never confirms target revocation", () => {
  const h = authenticatedSessionHarness();
  const session = h.context.createSessionForUser({ username: "owner" });
  const key = `romeo-session-${session.token}`;
  const wrong = "00000000-0000-4000-8000-900000000001-00000000-0000-4000-8000-900000000002";
  assert.equal(resolvedAuthContext(h, wrong), null);
  const result = h.context.logoutUser({}, null);
  assert.equal(Object.prototype.hasOwnProperty.call(result, "revoked"), false);
  assert.ok(h.props.getProperty(key));
  assert.ok(h.context.getAuthenticatedUser({ sessionToken: session.token }));
});

test("logout contract 03/18 forged payload token cannot replace authenticated target", () => {
  const h = authenticatedSessionHarness();
  const first = h.context.createSessionForUser({ username: "owner" });
  const second = h.context.createSessionForUser({ username: "owner" });
  const context = resolvedAuthContext(h, first.token);
  const result = h.context.logoutUser({
    sessionToken: second.token,
    token: second.token,
    authToken: second.token
  }, context);
  assert.equal(result.logoutAccepted, true);
  assert.equal(h.context.getAuthenticatedUser({ sessionToken: first.token }), null);
  assert.ok(h.context.getAuthenticatedUser({ sessionToken: second.token }));
});

test("logout contract 04/18 exact authenticated A revokes A", () => {
  const h = authenticatedSessionHarness();
  const session = h.context.createSessionForUser({ username: "owner" });
  const context = resolvedAuthContext(h, session.token);
  const internal = h.context.revokeResolvedSession(context);
  assert.equal(internal.code, "REVOKED_CURRENT_SESSION");
  assert.equal(internal.targetProven, true);
  assert.equal(internal.revoked, true);
});

test("logout contract 05/18 replay is harmless and never claims confirmed deletion", () => {
  const h = authenticatedSessionHarness();
  const session = h.context.createSessionForUser({ username: "owner" });
  logoutCurrentSession(h, session.token);
  const deleteCount = h.props.calls ? h.props.calls.delete : 0;
  const replay = h.context.logoutUser({}, resolvedAuthContext(h, session.token));
  assert.equal(replay.logoutAccepted, true);
  assert.equal(Object.prototype.hasOwnProperty.call(replay, "revoked"), false);
  assert.equal(h.context.getAuthenticatedUser({ sessionToken: session.token }), null);
  if (h.props.calls) assert.equal(h.props.calls.delete, deleteCount);
});

test("logout contract 06/18 unknown token has uniform outward response and no deletes", () => {
  const propertyFailure = { delete: false };
  const properties = store({ preserve: "yes" }, propertyFailure);
  const h = authenticatedSessionHarness({ properties });
  const unknown = resolvedAuthContext(h,
    "00000000-0000-4000-8000-800000000001-00000000-0000-4000-8000-800000000002");
  assert.equal(unknown, null);
  const response = h.context.logoutUser({ authRequestId: "uniform-unknown-001" }, unknown);
  assert.equal(response.status, "success");
  assert.equal(response.logoutAccepted, true);
  assert.equal(response.clientCleanupAllowed, true);
  assert.equal(Object.prototype.hasOwnProperty.call(response, "revoked"), false);
  assert.equal(properties.getProperty("preserve"), "yes");
});

test("logout contract 07/18 expired session is rejected deterministically", () => {
  const h = authenticatedSessionHarness();
  const session = h.context.createSessionForUser({ username: "owner" });
  const key = `romeo-session-${session.token}`;
  const record = JSON.parse(h.props.getProperty(key));
  record.expiresAt = new Date(Date.now() - 1000).toISOString();
  h.props.setProperty(key, JSON.stringify(record));
  assert.equal(resolvedAuthContext(h, session.token), null);
  assert.equal(h.props.getProperty(key), null);
});

test("logout contract 08/18 cache hit and property present invalidates both", () => {
  const cache = cacheStore();
  const h = authenticatedSessionHarness({ cache });
  const session = h.context.createSessionForUser({ username: "owner" });
  const key = `romeo-session-${session.token}`;
  assert.ok(cache.values[key]);
  const internal = h.context.revokeResolvedSession(resolvedAuthContext(h, session.token));
  assert.equal(internal.revoked, true);
  assert.equal(h.props.getProperty(key), null);
  assert.equal(cache.values[key], undefined);
});

test("logout contract 09/18 property present and cache absent revokes authoritatively", () => {
  const cache = cacheStore();
  const h = authenticatedSessionHarness({ cache });
  const session = h.context.createSessionForUser({ username: "owner" });
  const key = `romeo-session-${session.token}`;
  delete cache.values[key];
  const internal = h.context.revokeResolvedSession(resolvedAuthContext(h, session.token));
  assert.equal(internal.revoked, true);
  assert.equal(h.props.getProperty(key), null);
});

test("logout contract 10/18 missing property with stale cache cannot authenticate", () => {
  const cache = cacheStore();
  const h = authenticatedSessionHarness({ cache });
  const session = h.context.createSessionForUser({ username: "owner" });
  const key = `romeo-session-${session.token}`;
  const stale = cache.values[key];
  h.props.deleteProperty(key);
  cache.values[key] = stale;
  assert.equal(resolvedAuthContext(h, session.token), null);
  assert.equal(cache.values[key], undefined);
});

test("logout contract 11/18 double logout is harmless", () => {
  const h = authenticatedSessionHarness();
  const session = h.context.createSessionForUser({ username: "owner" });
  assert.equal(logoutCurrentSession(h, session.token).logoutAccepted, true);
  const second = h.context.logoutUser({}, resolvedAuthContext(h, session.token));
  assert.equal(second.logoutAccepted, true);
  assert.equal(Object.prototype.hasOwnProperty.call(second, "revoked"), false);
});

test("logout contract 12/18 session A logout preserves session B for same user", () => {
  const h = authenticatedSessionHarness();
  const first = h.context.createSessionForUser({ username: "owner" });
  const second = h.context.createSessionForUser({ username: "owner" });
  logoutCurrentSession(h, first.token);
  assert.equal(h.context.getAuthenticatedUser({ sessionToken: first.token }), null);
  assert.ok(h.context.getAuthenticatedUser({ sessionToken: second.token }));
});

test("logout contract 13/18 cross-user session revocation is isolated", () => {
  const users = sheet([
    HEADERS,
    ["owner", "", "Owner", "", "2026-08-24", "unused"],
    ["staff", "", "Staff", "access_dashboard", "2026-08-24", "unused"]
  ]);
  const h = harness({ users });
  const records = h.context.readUsersFromSheet();
  const ownerSession = h.context.createSessionForUser(records.find(user => user.username === "owner"));
  const staffSession = h.context.createSessionForUser(records.find(user => user.username === "staff"));
  logoutCurrentSession(h, ownerSession.token);
  assert.equal(h.context.getAuthenticatedUser({ sessionToken: ownerSession.token }), null);
  assert.equal(h.context.getAuthenticatedUser({ sessionToken: staffSession.token }).username, "staff");
});

test("logout contract 14/18 forged identity fields cannot influence target", () => {
  const h = authenticatedSessionHarness();
  const first = h.context.createSessionForUser({ username: "owner" });
  const second = h.context.createSessionForUser({ username: "owner" });
  const context = resolvedAuthContext(h, first.token, {
    username: "forged", role: "OWNER", audience: "internal", branch: "forged",
    permissions: ["manage_users"]
  });
  h.context.logoutUser({
    username: "forged", role: "OWNER", audience: "internal", branch: "forged",
    permissions: ["manage_users"], sessionToken: second.token
  }, context);
  assert.equal(h.context.getAuthenticatedUser({ sessionToken: first.token }), null);
  assert.ok(h.context.getAuthenticatedUser({ sessionToken: second.token }));
});

test("logout contract 15/18 response lost after revoke retries safely", () => {
  const h = authenticatedSessionHarness();
  const session = h.context.createSessionForUser({ username: "owner" });
  const firstContext = resolvedAuthContext(h, session.token);
  h.context.logoutUser({ authRequestId: "lost-after-001" }, firstContext);
  assert.equal(h.context.getAuthenticatedUser({ sessionToken: session.token }), null);
  const retry = h.context.logoutUser({ authRequestId: "retry-after-001" },
    resolvedAuthContext(h, session.token));
  assert.equal(retry.logoutAccepted, true);
  assert.equal(Object.prototype.hasOwnProperty.call(retry, "revoked"), false);
});

test("logout contract 16/18 response lost before revoke keeps target available for retry", () => {
  const h = authenticatedSessionHarness();
  const session = h.context.createSessionForUser({ username: "owner" });
  const abandonedContext = resolvedAuthContext(h, session.token);
  assert.ok(abandonedContext);
  assert.ok(h.context.getAuthenticatedUser({ sessionToken: session.token }));
  const retryContext = resolvedAuthContext(h, session.token);
  const retry = h.context.logoutUser({ authRequestId: "retry-before-001" }, retryContext);
  assert.equal(retry.logoutAccepted, true);
  assert.equal(h.context.getAuthenticatedUser({ sessionToken: session.token }), null);
});

test("logout contract 17/18 concurrent resolved revokes serialize under lock", () => {
  const h = authenticatedSessionHarness();
  const session = h.context.createSessionForUser({ username: "owner" });
  const firstContext = resolvedAuthContext(h, session.token);
  const concurrentContext = resolvedAuthContext(h, session.token);
  const first = h.context.revokeResolvedSession(firstContext);
  const second = h.context.revokeResolvedSession(concurrentContext);
  assert.equal(first.code, "REVOKED_CURRENT_SESSION");
  assert.equal(second.code, "ALREADY_REVOKED_CURRENT_SESSION");
  assert.equal(second.targetProven, true);
  assert.equal(second.revoked, false);
  assert.equal(second.alreadyRevoked, true);
});

test("logout contract 18/18 malformed or empty auth context cannot delete", () => {
  const h = authenticatedSessionHarness();
  const session = h.context.createSessionForUser({ username: "owner" });
  const key = `romeo-session-${session.token}`;
  for (const context of [null, {}, { sessionPropertyKey: key }, Object.freeze({
    sessionPropertyKey: key,
    serializedSession: h.props.getProperty(key)
  })]) {
    const result = h.context.revokeResolvedSession(context);
    assert.equal(result.code, "AUTH_SESSION_CONTEXT_INVALID");
    assert.equal(result.targetProven, false);
    assert.equal(result.revoked, false);
    assert.ok(h.props.getProperty(key));
  }
});

test("account throttle uses a fixed non-extendable cooldown then restores a full budget", () => {
  let now = 1000;
  const policy = {
    accountFailureThreshold: 2, accountWindowMs: 1000,
    accountInitialCooldownMs: 100, accountMaximumCooldownMs: 200,
    globalFailureThreshold: 20, globalUnknownFailureThreshold: 20, globalWindowMs: 1000,
    globalInitialCooldownMs: 100, globalMaximumCooldownMs: 200,
    reservationTtlMs: 50, maximumReservations: 20
  };
  const h = harness({ throttlePolicy: policy, now: () => now });
  const options = Object.assign({}, h.runtimeOptions, { throttlePolicy: policy, now: () => now });
  for (let count = 0; count < 2; count++) {
    const reservation = h.context.auth01ReserveLoginAttempt("owner", options);
    assert.equal(reservation.allowed, true);
    h.context.auth01FinalizeLoginAttempt(reservation, "failure", options);
  }
  assert.equal(h.context.auth01ReserveLoginAttempt("owner", options).allowed, false);
  now += 50;
  assert.equal(h.context.auth01ReserveLoginAttempt("owner", options).allowed, false);
  const accountKey = Object.keys(h.props.values).find(key => key.startsWith("AUTH01:RL:v1:A:"));
  const state = JSON.parse(h.props.getProperty(accountKey));
  assert.ok(state.blockedUntil - now <= 200);
  now = state.blockedUntil;
  const firstRecoveryAttempt = h.context.auth01ReserveLoginAttempt("owner", options);
  assert.equal(firstRecoveryAttempt.allowed, true);
  h.context.auth01FinalizeLoginAttempt(firstRecoveryAttempt, "success", options);
  const reset = JSON.parse(h.props.getProperty(accountKey));
  assert.equal(reset.failures, 0);
  assert.equal(reset.status, "OPEN");
});

test("global throttle protects unknown usernames without per-account state", () => {
  let now = 100;
  const policy = {
    accountFailureThreshold: 2, accountWindowMs: 1000,
    accountInitialCooldownMs: 100, accountMaximumCooldownMs: 200,
    globalFailureThreshold: 2, globalUnknownFailureThreshold: 2, globalWindowMs: 1000,
    globalInitialCooldownMs: 100, globalMaximumCooldownMs: 200,
    reservationTtlMs: 50, maximumReservations: 10
  };
  const h = harness({ throttlePolicy: policy, now: () => now });
  const options = Object.assign({}, h.runtimeOptions, { throttlePolicy: policy, now: () => now });
  for (let count = 0; count < 2; count++) {
    const reservation = h.context.auth01ReserveLoginAttempt("", options);
    h.context.auth01FinalizeLoginAttempt(reservation, "failure", options);
  }
  assert.equal(h.context.auth01ReserveLoginAttempt("", options).allowed, false);
  assert.equal(Object.keys(h.props.values).some(key => key.startsWith("AUTH01:RL:v1:A:")), false);
  assert.ok(h.props.getProperty("AUTH01:RL:v1:G"));
});

test("abandoned reservations expire and cache eviction never authorizes", () => {
  let now = 0;
  const policy = {
    accountFailureThreshold: 2, accountWindowMs: 1000,
    accountInitialCooldownMs: 100, accountMaximumCooldownMs: 200,
    globalFailureThreshold: 3, globalUnknownFailureThreshold: 3, globalWindowMs: 1000,
    globalInitialCooldownMs: 100, globalMaximumCooldownMs: 200,
    reservationTtlMs: 10, maximumReservations: 3
  };
  const h = harness({ throttlePolicy: policy, now: () => now, cache: cacheStore({ fail: true }) });
  const options = Object.assign({}, h.runtimeOptions, { throttlePolicy: policy, now: () => now });
  assert.equal(h.context.auth01ReserveLoginAttempt("owner", options).allowed, true);
  now = 11;
  assert.equal(h.context.auth01ReserveLoginAttempt("owner", options).allowed, true);
});

test("property and lock failures fail closed", () => {
  const failedProperties = store({ "AUTH01:IDKEY:v1": Buffer.alloc(32, 7).toString("base64url") }, { get: true });
  const h = harness({ properties: failedProperties });
  assert.throws(
    () => h.context.auth01ReserveLoginAttempt("", h.runtimeOptions),
    error => error.code === "AUTH01_THROTTLE_STORE_UNAVAILABLE"
  );
  const locked = harness({ lockAvailable: false });
  assert.throws(
    () => locked.context.auth01ReserveLoginAttempt("", locked.runtimeOptions),
    error => error.code === "AUTH01_THROTTLE_LOCK_UNAVAILABLE"
  );
});

test("login returns identical generic errors and unknown users create no account key", () => {
  const users = sheet([HEADERS, ["owner", "", "Owner", "", "2026-08-21", modern(harness(), "secret")]]);
  const h = harness({ users });
  const wrong = h.context.loginUser({ username: "owner", password: "wrong" });
  const unknown = h.context.loginUser({ username: "not-a-user", password: "wrong" });
  assert.deepEqual(JSON.parse(JSON.stringify(wrong)), JSON.parse(JSON.stringify(unknown)));
  assert.equal(wrong.message, "Invalid username or password.");
  assert.equal(Object.keys(h.props.values).filter(key => key.startsWith("AUTH01:RL:v1:A:")).length, 1);
});

test("one correlated login request creates one session and one success finalization per scope", () => {
  const users = sheet([HEADERS, ["owner", "", "Owner", "", "2026-08-21", modern(harness(), "secret")]]);
  const h = harness({ users });
  const result = h.context.loginUser({
    username: "owner",
    password: "secret",
    authRequestId: "login-local-correlation-001"
  });
  assert.equal(result.status, "success");
  assert.equal(result.sessionCreated, true);
  assert.equal(result.authRequestId, "login-local-correlation-001");
  assert.equal(Object.keys(h.props.values).filter(key => key.startsWith("romeo-session-")).length, 1);
  const globalState = JSON.parse(h.props.values["AUTH01:RL:v1:G"]);
  const accountKey = Object.keys(h.props.values).find(key => key.startsWith("AUTH01:RL:v1:A:"));
  const accountState = JSON.parse(h.props.values[accountKey]);
  assert.equal(Object.keys(globalState.finalizations).length, 1);
  assert.equal(Object.values(globalState.finalizations)[0].startsWith("S:"), true);
  assert.equal(Object.keys(accountState.finalizations).length, 1);
  assert.equal(Object.values(accountState.finalizations)[0].startsWith("S:"), true);
});

test("cache put failure during correlated login cannot create a second session", () => {
  const users = sheet([HEADERS, ["owner", "", "Owner", "", "2026-08-21", modern(harness(), "secret")]]);
  const h = harness({ users, cache: cacheStore({ failPut: true }) });
  const result = h.context.loginUser({
    username: "owner",
    password: "secret",
    authRequestId: "login-cache-failure-001"
  });
  assert.equal(result.status, "success");
  assert.equal(result.sessionCreated, true);
  assert.equal(Object.keys(h.props.values).filter(key => key.startsWith("romeo-session-")).length, 1);
});

test("create and update writers store modern credentials and blank plaintext", () => {
  const users = sheet([HEADERS, ["owner", "", "Owner", "", "2026-08-21", modern(harness(), "owner-pass")]]);
  const h = harness({ users });
  h.context.actorCanManageUsers = () => true;
  h.context.logActivity = () => {};
  assert.equal(h.context.createUserInSheet({
    username: "cashier", password: " cash password ", displayName: "Cashier", permissions: []
  }).status, "success");
  assert.equal(users.rows[2][1], "");
  assert.match(users.rows[2][5], /^cuthub\$1\$/);
  assert.equal(h.context.updateUserInSheet({
    username: "cashier", password: "new password", displayName: "Cashier", permissions: []
  }).status, "success");
  assert.equal(users.rows[2][1], "");
  assert.equal(h.context.auth01VerifyCredential(
    { password: users.rows[2][1], passwordHash: users.rows[2][5] }, "new password", h.runtimeOptions
  ).ok, true);
  assert.equal(h.context.auth01ReadCredentialEpoch("cashier", h.runtimeOptions), 1);
});

test("create writer rejects an unverified malformed persistence result", () => {
  const users = sheet([HEADERS], { corruptAppendHash: true });
  const originalAppend = users.appendRow;
  users.appendRow = row => {
    originalAppend(row);
    users.rows[users.rows.length - 1][5] = "malformed";
  };
  const h = harness({ users });
  h.context.actorCanManageUsers = () => true;
  h.context.logActivity = () => {};
  const result = h.context.createUserInSheet({
    username: "cashier", password: "secret password", displayName: "Cashier", permissions: []
  });
  assert.equal(result.status, "error");
  assert.match(result.message, /could not be verified/i);
  assert.equal(users.rows[1][1], "");
  assert.equal(users.rows[1][5], "malformed");
});

test("emergency owner reset executes the production replacement path with hash-only persistence", () => {
  const resetSource = SOURCE.replace(
    'const NEW_OWNER_PASSWORD = "change-this-password";',
    'const NEW_OWNER_PASSWORD = "emergency-password-2026";'
  );
  const users = sheet([HEADERS, ["owner", "", "Owner", "", "2026-08-21", modern(harness(), "old-password")]]);
  const h = harness({ users, source: resetSource });
  h.context.resetOwnerPasswordEmergency();
  assert.equal(users.rows[1][1], "");
  assert.equal(h.context.auth01VerifyCredential(
    { password: users.rows[1][1], passwordHash: users.rows[1][5] },
    "emergency-password-2026", h.runtimeOptions
  ).ok, true);
  assert.equal(h.context.auth01ReadCredentialEpoch("owner", h.runtimeOptions), 1);
});

test("bootstrap and owner reset writers use modern credentials without plaintext rollback", () => {
  const bootstrap = fs.readFileSync(
    path.join(ROOT, "scripts", "core-staging-auth-bootstrap.js"), "utf8"
  );
  assert.match(bootstrap, /createModernCredential\(password,/);
  assert.match(bootstrap, /"owner", "", credential\.ownerDisplayName/);
  assert.doesNotMatch(bootstrap, /hashPassword\(password\)/);
  assert.match(SOURCE, /function resetOwnerPasswordEmergency[\s\S]*?auth01ReplaceCredential/);
  assert.doesNotMatch(
    SOURCE.match(/function resetOwnerPasswordEmergency[\s\S]*?\n}/)[0],
    /hashPassword\(/
  );
});

test("production SHA-256 and HMAC primitives match published and long-input vectors", () => {
  const h = harness();
  const hex = bytes => h.context.auth01BytesToHex(bytes);
  assert.equal(hex(h.context.auth01Sha256Bytes(h.context.auth01Utf8Bytes(""))),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  assert.equal(hex(h.context.auth01Sha256Bytes(h.context.auth01Utf8Bytes("abc"))),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  const hmacVectors = [
    [Buffer.alloc(20, 0x0b), Buffer.from("Hi There"), "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7"],
    [Buffer.from("Jefe"), Buffer.from("what do ya want for nothing?"), "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843"],
    [Buffer.alloc(131, 0xaa), Buffer.from("Test Using Larger Than Block-Size Key - Hash Key First"),
      "60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54"],
    [Buffer.alloc(131, 0xaa), Buffer.from("This is a test using a larger than block-size key and a larger than block-size data. The key needs to be hashed before being used by the HMAC algorithm."),
      "9b09ffa71b942fcb27635fbcd5b0e944bfdc63644f0713938a7f51535c3a35e2"]
  ];
  hmacVectors.forEach(([key, message, expected]) => assert.equal(
    hex(h.context.auth01HmacSha256Bytes([...key], [...message])), expected
  ));
});

test("production PBKDF2 supports long inputs, Unicode NFC, and multi-block output", () => {
  const h = harness();
  const cases = [
    ["long-password-".repeat(20), "long-salt-".repeat(20), 17, 64,
      "32058904e55bffc6983ca722ae4477cc350bf1b0038166995bb3105973c783afff5827cc46320d2f62ae13ea8eeff5e26c98b19dcfbe3fe294ab519ce8ba1bb3"],
    ["Cafe\u0301-كلمة", "ملح-طويل", 4096, 48,
      "318289abcb69a3726b9d8d0bdd522e0b9907af38b56571a563d18aa1cffb76ecac9f34c63703000beaab3755e355ddc5"]
  ];
  cases.forEach(([password, salt, iterations, length, expected]) => {
    const normalized = password.normalize("NFC");
    const actual = h.context.auth01Pbkdf2HmacSha256(
      h.context.auth01Utf8Bytes(normalized), h.context.auth01Utf8Bytes(salt), iterations, length
    );
    assert.equal(h.context.auth01BytesToHex(actual), expected);
    assert.equal(Buffer.from(actual).toString("hex"),
      crypto.pbkdf2Sync(normalized, salt, iterations, length, "sha256").toString("hex"));
  });
});

test("identifier key provisioning is write-once and continuity failures close epoch/session access", () => {
  const empty = harness({ properties: store(), preserveIdentifierConfig: true });
  const created = empty.context.auth01ProvisionIdentifierKey(empty.runtimeOptions);
  assert.equal(created.created, true);
  assert.equal(empty.props.getProperty("AUTH01:IDKEYFP:v1"), created.fingerprint);
  assert.equal(empty.context.auth01ProvisionIdentifierKey(empty.runtimeOptions).created, false);
  const h = harness();
  const stableKey = h.props.getProperty("AUTH01:IDKEY:v1");
  const stableFingerprint = h.props.getProperty("AUTH01:IDKEYFP:v1");
  assert.deepEqual(JSON.parse(JSON.stringify(h.context.auth01ProvisionIdentifierKey(h.runtimeOptions))), {
    created: false, fingerprint: stableFingerprint
  });
  assert.equal(h.props.getProperty("AUTH01:IDKEY:v1"), stableKey);
  const users = sheet([HEADERS, ["owner", "", "Owner", "", "2026-08-21", modern(h, "secret")]]);
  const sessionHarness = harness({ users });
  const session = sessionHarness.context.createSessionForUser(sessionHarness.context.readUsersFromSheet()[0]);
  const replacement = Buffer.alloc(32, 8).toString("base64url");
  sessionHarness.props.setProperty("AUTH01:IDKEY:v1", replacement);
  assert.throws(() => sessionHarness.context.auth01ReadCredentialEpoch("owner", sessionHarness.runtimeOptions),
    error => error.code === "AUTH01_IDENTIFIER_KEY_CONTINUITY_INVALID");
  assert.throws(() => sessionHarness.context.getAuthenticatedUser({ sessionToken: session.token }),
    error => error.code === "AUTH01_IDENTIFIER_KEY_CONTINUITY_INVALID");
});

test("missing, malformed, partial, and mismatched identifier configuration fail closed", () => {
  for (const values of [
    {},
    { "AUTH01:IDKEY:v1": "not-base64" },
    { "AUTH01:IDKEYFP:v1": "fingerprint-only" },
    { "AUTH01:IDKEY:v1": Buffer.alloc(32, 7).toString("base64url"), "AUTH01:IDKEYFP:v1": "wrong" }
  ]) {
    const h = harness({ properties: store(values), preserveIdentifierConfig: true });
    assert.throws(() => h.context.auth01OpaqueUserId("owner", h.runtimeOptions),
      error => /^AUTH01_IDENTIFIER_/.test(error.code));
  }
});

test("identifier v2 activation is explicit, version-isolated, and fail-closed", () => {
  const h = harness();
  const v1Opaque = h.context.auth01OpaqueUserId("owner", h.runtimeOptions);
  const v1Fingerprint = h.context.auth01CurrentIdentifierFingerprint(h.runtimeOptions);
  const v1Key = h.props.getProperty("AUTH01:IDKEY:v1");

  h.props.setProperty("AUTH01:IDKEY:v2", v1Key);
  h.props.setProperty("AUTH01:IDKEYFP:v2", identifierFingerprint(v1Key, "v2"));
  h.props.setProperty("AUTH01:IDKEYACTIVE:v1", "v2");
  const v2Opaque = h.context.auth01OpaqueUserId("owner", h.runtimeOptions);
  assert.notEqual(v2Opaque, v1Opaque, "version domain separation must survive accidental key reuse");
  assert.notEqual(h.context.auth01CurrentIdentifierFingerprint(h.runtimeOptions), v1Fingerprint);
  assert.equal(v2Opaque, h.context.auth01OpaqueUserId(" OWNER ", h.runtimeOptions));
  assert.throws(() => h.context.auth01ProvisionIdentifierKey(h.runtimeOptions),
    error => error.code === "AUTH01_IDENTIFIER_PROVISIONING_DISABLED");
  assert.equal(h.props.getProperty("AUTH01:IDKEY:v1"), v1Key);

  h.props.setProperty("AUTH01:IDKEYACTIVE:v1", "v3");
  assert.throws(() => h.context.auth01OpaqueUserId("owner", h.runtimeOptions),
    error => error.code === "AUTH01_IDENTIFIER_VERSION_INVALID");

  h.props.setProperty("AUTH01:IDKEYACTIVE:v1", "v2");
  h.props.deleteProperty("AUTH01:IDKEYFP:v2");
  assert.throws(() => h.context.auth01CurrentIdentifierFingerprint(h.runtimeOptions),
    error => error.code === "AUTH01_IDENTIFIER_KEY_MISSING");
});

test("v2 provisioning is atomic, idempotent, and inactive until explicit activation", () => {
  const h = harness();
  const v1Opaque = h.context.auth01OpaqueUserId("owner", h.runtimeOptions);
  const v1Fingerprint = h.context.auth01CurrentIdentifierFingerprint(h.runtimeOptions);
  const v2Key = Buffer.alloc(32, 19).toString("base64url");
  const provisioned = h.context.auth01ProvisionIdentifierKeyV2(v2Key, h.runtimeOptions);
  assert.equal(provisioned.created, true);
  assert.equal(h.context.auth01ActiveIdentifierKeyVersion(h.runtimeOptions), "v1");
  assert.equal(h.context.auth01OpaqueUserId("owner", h.runtimeOptions), v1Opaque);
  assert.equal(h.context.auth01CurrentIdentifierFingerprint(h.runtimeOptions), v1Fingerprint);
  assert.equal(h.context.auth01ProvisionIdentifierKeyV2(v2Key, h.runtimeOptions).created, false);
  const v1EpochKey = h.context.auth01EpochPropertyKeyForVersion("owner", "v1", h.runtimeOptions);
  const v2EpochKey = h.context.auth01EpochPropertyKeyForVersion("owner", "v2", h.runtimeOptions);
  assert.equal(h.context.auth01IncrementCredentialEpoch("owner", h.runtimeOptions), 1);
  assert.equal(h.props.getProperty(v1EpochKey), "1");
  assert.equal(h.props.getProperty(v2EpochKey), null);
  const reservation = h.context.auth01ReserveLoginAttempt("owner", h.runtimeOptions);
  assert.equal(reservation.accountKey, `AUTH01:RL:v1:A:${v1Opaque}`);
  h.context.auth01FinalizeLoginAttempt(reservation, "success", h.runtimeOptions);
  const session = h.context.createSessionForUser({ username: "owner" });
  assert.equal(
    JSON.parse(h.props.getProperty(`romeo-session-${session.token}`)).identifierKeyFingerprint,
    v1Fingerprint
  );

  const partialKey = harness();
  partialKey.props.setProperty("AUTH01:IDKEY:v2", v2Key);
  assert.throws(() => partialKey.context.auth01ProvisionIdentifierKeyV2(v2Key, partialKey.runtimeOptions),
    error => error.code === "AUTH01_IDENTIFIER_V2_CONTINUITY_INVALID");
  assert.equal(partialKey.context.auth01ActiveIdentifierKeyVersion(partialKey.runtimeOptions), "v1");
  assert.throws(() => partialKey.context.auth01ActivateIdentifierKeyV2(partialKey.runtimeOptions),
    error => error.code === "AUTH01_IDENTIFIER_KEY_MISSING");

  const partialFingerprint = harness();
  partialFingerprint.props.setProperty("AUTH01:IDKEYFP:v2", identifierFingerprint(v2Key, "v2"));
  assert.throws(
    () => partialFingerprint.context.auth01ProvisionIdentifierKeyV2(v2Key, partialFingerprint.runtimeOptions),
    error => error.code === "AUTH01_IDENTIFIER_V2_CONTINUITY_INVALID"
  );
  assert.equal(partialFingerprint.context.auth01OpaqueUserId("owner", partialFingerprint.runtimeOptions), v1Opaque);
});

test("v2 provisioning classifies pre-write failure and lost response without partial success", () => {
  const beforeFailure = {};
  const beforeStore = store({}, beforeFailure);
  const before = harness({ properties: beforeStore });
  beforeFailure.setProperties = "before";
  const v2Key = Buffer.alloc(32, 23).toString("base64url");
  assert.throws(() => before.context.auth01ProvisionIdentifierKeyV2(v2Key, before.runtimeOptions),
    error => error.code === "AUTH01_IDENTIFIER_V2_PROVISION_FAILED");
  assert.equal(before.props.getProperty("AUTH01:IDKEY:v2"), null);
  assert.equal(before.props.getProperty("AUTH01:IDKEYFP:v2"), null);

  const afterFailure = {};
  const afterStore = store({}, afterFailure);
  const after = harness({ properties: afterStore });
  afterFailure.setProperties = "after";
  const recovered = after.context.auth01ProvisionIdentifierKeyV2(v2Key, after.runtimeOptions);
  assert.equal(recovered.created, true);
  assert.ok(after.props.getProperty("AUTH01:IDKEY:v2"));
  assert.ok(after.props.getProperty("AUTH01:IDKEYFP:v2"));
  assert.equal(after.context.auth01ActiveIdentifierKeyVersion(after.runtimeOptions), "v1");
});

test("activation fails closed, is transport-loss safe, and requires quiescent auth state", () => {
  const v2Key = Buffer.alloc(32, 29).toString("base64url");
  const activationFailure = {};
  const failed = harness({ properties: store({}, activationFailure) });
  failed.context.auth01ProvisionIdentifierKeyV2(v2Key, failed.runtimeOptions);
  activationFailure.set = key => key === "AUTH01:IDKEYACTIVE:v1";
  assert.throws(() => failed.context.auth01ActivateIdentifierKeyV2(failed.runtimeOptions),
    error => error.code === "AUTH01_IDENTIFIER_ACTIVATION_FAILED");
  assert.equal(failed.context.auth01ActiveIdentifierKeyVersion(failed.runtimeOptions), "v1");

  const responseLoss = {};
  const recovered = harness({ properties: store({}, responseLoss) });
  recovered.context.auth01ProvisionIdentifierKeyV2(v2Key, recovered.runtimeOptions);
  responseLoss.setAfter = key => key === "AUTH01:IDKEYACTIVE:v1";
  assert.equal(recovered.context.auth01ActivateIdentifierKeyV2(recovered.runtimeOptions).activated, true);
  assert.equal(recovered.context.auth01ActiveIdentifierKeyVersion(recovered.runtimeOptions), "v2");
  assert.equal(recovered.context.auth01ActivateIdentifierKeyV2(recovered.runtimeOptions).alreadyActive, true);

  const busySession = authenticatedSessionHarness();
  busySession.context.auth01ProvisionIdentifierKeyV2(v2Key, busySession.runtimeOptions);
  const session = busySession.context.createSessionForUser({ username: "owner" });
  assert.throws(() => busySession.context.auth01ActivateIdentifierKeyV2(busySession.runtimeOptions),
    error => error.code === "AUTH01_IDENTIFIER_ACTIVATION_BLOCKED");
  busySession.context.revokeResolvedSession(resolvedAuthContext(busySession, session.token));
  assert.equal(busySession.context.auth01ActivateIdentifierKeyV2(busySession.runtimeOptions).activated, true);

  const busyThrottle = harness({ now: () => 1000 });
  busyThrottle.context.auth01ProvisionIdentifierKeyV2(v2Key, busyThrottle.runtimeOptions);
  const reservation = busyThrottle.context.auth01ReserveLoginAttempt("owner", busyThrottle.runtimeOptions);
  assert.throws(() => busyThrottle.context.auth01ActivateIdentifierKeyV2(busyThrottle.runtimeOptions),
    error => error.code === "AUTH01_IDENTIFIER_ACTIVATION_BLOCKED");
  busyThrottle.context.auth01FinalizeLoginAttempt(reservation, "success", busyThrottle.runtimeOptions);
  assert.equal(busyThrottle.context.auth01ActivateIdentifierKeyV2(busyThrottle.runtimeOptions).activated, true);
});

test("post-activation compatibility backend restart preserves v2 state and rejects selector rollback claims", () => {
  const users = sheet([HEADERS, ["owner", "", "Owner", "", "2026-08-25", "synthetic-not-used"]]);
  const h = harness({ users, now: () => 2000 });
  const v2Key = Buffer.alloc(32, 37).toString("base64url");
  h.context.auth01ProvisionIdentifierKeyV2(v2Key, h.runtimeOptions);
  assert.equal(h.context.auth01ActiveIdentifierKeyVersion(h.runtimeOptions), "v1");
  assert.equal(h.context.auth01ActivateIdentifierKeyV2(h.runtimeOptions).activated, true);
  assert.equal(h.context.auth01IncrementCredentialEpoch("owner", h.runtimeOptions), 1);
  const reservation = h.context.auth01ReserveLoginAttempt("owner", h.runtimeOptions);
  h.context.auth01FinalizeLoginAttempt(reservation, "success", h.runtimeOptions);
  const session = h.context.createSessionForUser({ username: "owner" });

  const restartedUsers = sheet([HEADERS, ["owner", "", "Owner", "", "2026-08-25", "synthetic-not-used"]]);
  const restarted = harness({
    properties: store(h.props.getProperties()), users: restartedUsers, preserveIdentifierConfig: true, now: () => 2001
  });
  assert.equal(restarted.context.auth01ActiveIdentifierKeyVersion(restarted.runtimeOptions), "v2");
  assert.equal(restarted.context.auth01ReadCredentialEpoch("owner", restarted.runtimeOptions), 1);
  assert.ok(restarted.context.getAuthenticatedUser({ sessionToken: session.token }));

  restarted.props.setProperty("AUTH01:IDKEYACTIVE:v1", "v1");
  assert.equal(restarted.context.getAuthenticatedUser({ sessionToken: session.token }), null,
    "selector rollback is intentionally not a safe post-activation rollback strategy");
});

test("identifier v2 prevents cross-user opaque collisions in the tested transition set", () => {
  const h = harness();
  activateIdentifierV2(h);
  const usernames = ["owner", "staff", "cashier", "manager", "branch-a", "branch-b"];
  const identifiers = usernames.map(username => h.context.auth01OpaqueUserId(username, h.runtimeOptions));
  assert.equal(new Set(identifiers).size, usernames.length);
  assert.notEqual(
    h.context.auth01OpaqueUserIdForVersion("owner", "v1", h.runtimeOptions),
    h.context.auth01OpaqueUserIdForVersion("owner", "v2", h.runtimeOptions)
  );
});

test("credential epoch transition reads v1 only as fallback and writes v2 only", () => {
  const h = harness();
  const legacyKey = h.context.auth01EpochPropertyKeyForVersion("owner", "v1", h.runtimeOptions);
  h.props.setProperty(legacyKey, "4");
  activateIdentifierV2(h);
  const activeKey = h.context.auth01EpochPropertyKeyForVersion("owner", "v2", h.runtimeOptions);
  assert.equal(h.context.auth01ReadCredentialEpoch("owner", h.runtimeOptions), 4);
  assert.equal(h.props.getProperty(activeKey), null);
  assert.equal(h.context.auth01IncrementCredentialEpoch("owner", h.runtimeOptions), 5);
  assert.equal(h.props.getProperty(activeKey), "5");
  assert.equal(h.props.getProperty(legacyKey), "4", "active writes must never update the legacy key");
  h.props.setProperty(legacyKey, "99");
  assert.equal(h.context.auth01ReadCredentialEpoch("owner", h.runtimeOptions), 5,
    "an active record must deterministically outrank legacy fallback");
});

test("account throttle transition consumes legacy state and persists only under v2", () => {
  let now = 1000;
  const h = harness({ now: () => now });
  const first = h.context.auth01ReserveLoginAttempt("owner", h.runtimeOptions);
  assert.equal(first.allowed, true);
  h.context.auth01FinalizeLoginAttempt(first, "failure", h.runtimeOptions);
  const legacyKey = first.accountKey;
  const legacyRaw = h.props.getProperty(legacyKey);
  assert.ok(legacyRaw);

  activateIdentifierV2(h);
  now += 1;
  const second = h.context.auth01ReserveLoginAttempt("owner", h.runtimeOptions);
  assert.equal(second.allowed, true);
  assert.notEqual(second.accountKey, legacyKey);
  assert.ok(h.props.getProperty(second.accountKey), "v2 reservation must anchor state under the active key");
  assert.equal(h.props.getProperty(legacyKey), legacyRaw, "legacy throttle state must remain read-only");
  h.context.auth01FinalizeLoginAttempt(second, "success", h.runtimeOptions);
  assert.equal(JSON.parse(h.props.getProperty(second.accountKey)).failures, 0);
});

test("session fingerprints bind exclusively to the active identifier version", () => {
  const users = sheet([HEADERS, ["owner", "", "Owner", "", "2026-08-24", "synthetic-not-used"]]);
  const h = harness({ users });
  const user = h.context.readUsersFromSheet()[0];
  const before = h.context.createSessionForUser(user);
  assert.ok(h.context.getAuthenticatedUser({ sessionToken: before.token }));

  activateIdentifierV2(h);
  assert.equal(h.context.getAuthenticatedUser({ sessionToken: before.token }), null,
    "a pre-rotation fingerprint cannot authenticate after activation");
  const after = h.context.createSessionForUser(user);
  assert.ok(h.context.getAuthenticatedUser({ sessionToken: after.token }));

  h.props.setProperty("AUTH01:IDKEYACTIVE:v1", "v1");
  assert.equal(h.context.getAuthenticatedUser({ sessionToken: after.token }), null,
    "rollback cannot make a v2-bound session valid under v1");
});

test("identifier v1 retirement requires every explicit safety condition", () => {
  const h = harness();
  const safe = {
    activeVersion: "v2", v2ContinuityPass: true, preRotationSessionsRemaining: 0,
    legacyEpochRecordsRemaining: 0, legacyThrottleRecordsRemaining: 0, rollbackWindowClosed: true
  };
  assert.deepEqual(JSON.parse(JSON.stringify(h.context.auth01IdentifierRetirementDecision(safe))), {
    eligible: true, retiredVersion: "v1"
  });
  Object.keys(safe).forEach(key => {
    const unsafe = Object.assign({}, safe, {
      [key]: typeof safe[key] === "boolean" ? false : (typeof safe[key] === "number" ? 1 : "v1")
    });
    assert.equal(h.context.auth01IdentifierRetirementDecision(unsafe).eligible, false);
  });
});

test("same synthetic MODERN_V1 credential is rejected by v31 and accepted by candidate", () => {
  const candidate = harness();
  const record = candidate.context.createModernCredential("synthetic-modern-password", {
    randomBytes: length => Array.from({ length }, (_, index) => (index + 21) & 255)
  });
  const user = { password: "", passwordHash: record };
  const v31 = harness({ source: IMMUTABLE_V31_SOURCE, preserveIdentifierConfig: true });
  assert.equal(v31.context.verifyPassword(user, "synthetic-modern-password"), false);
  assert.equal(candidate.context.auth01VerifyCredential(
    user, "synthetic-modern-password"
  ).ok, true);
});

test("two synthetic current-format MODERN_V1 rows classify without plaintext", () => {
  const h = harness();
  const rows = [modern(h, "synthetic-row-one", 31), modern(h, "synthetic-row-two", 47)];
  rows.forEach(passwordHash => {
    const parsed = h.context.auth01ParseModernCredential(passwordHash, { testPolicy: TEST_POLICY });
    assert.ok(parsed);
    assert.equal(h.context.auth01ClassifyCredential(
      { password: "", passwordHash }, { testPolicy: TEST_POLICY }
    ).state, "MODERN_V1");
  });
});

test("authoritative throttle corruption is preserved, marked, and rejected before KDF", () => {
  const fixtures = [
    "{bad-json",
    JSON.stringify({ version: 2 }),
    JSON.stringify({ version: 1, unexpected: true }),
    JSON.stringify({
      version: 1, scope: "GLOBAL", status: "BLOCKED", windowStartedAt: 1000,
      failures: 1, backoffLevel: 0, blockedUntil: Number.MAX_SAFE_INTEGER,
      reservations: {}, finalizations: {}, updatedAt: 1000
    })
  ];
  fixtures.forEach(raw => {
    let kdfCalls = 0;
    const h = harness({ now: () => 1000 });
    h.props.setProperty("AUTH01:RL:v1:G", raw);
    const original = h.context.auth01Pbkdf2HmacSha256;
    h.context.auth01Pbkdf2HmacSha256 = (...args) => { kdfCalls += 1; return original(...args); };
    const result = h.context.loginUser({ username: "unknown", password: "wrong" });
    assert.equal(result.code, "AUTHENTICATION_SERVICE_UNAVAILABLE");
    assert.equal(kdfCalls, 0);
    assert.equal(h.props.getProperty("AUTH01:RL:v1:G"), raw);
    assert.equal(Object.keys(h.props.values).some(key => key.startsWith("AUTH01:RL:RECOVERY:v1:")), true);
  });
});

test("throttle validator rejects fractional, past-horizon, impossible, oversized, and inflated records", () => {
  const now = 50000000000;
  const h = harness({ now: () => now });
  const policy = h.context.auth01ThrottlePolicy(h.runtimeOptions);
  const base = h.context.auth01EmptyThrottleState(now, "GLOBAL");
  const invalid = [
    { ...base, updatedAt: now + 0.5 },
    { ...base, windowStartedAt: 1 },
    { ...base, status: "OPEN", blockedUntil: now + 1 },
    { ...base, reservations: { ["x".repeat(129)]: { expiresAt: now + 1 } } },
    { ...base, finalizations: Object.fromEntries(Array.from({ length: policy.maximumReservations + 1 }, (_, i) =>
      [`f${i}`, { outcome: "failure", finalizedAt: now }])) }
  ];
  invalid.forEach(state => assert.throws(
    () => h.context.auth01ValidateThrottleState(state, JSON.stringify(state), now, "GLOBAL", policy),
    error => error.code === "AUTH01_THROTTLE_STATE_CORRUPT"
  ));
  assert.throws(() => h.context.auth01ValidateThrottleState(
    base, JSON.stringify(base) + "x".repeat(8192), now, "GLOBAL", policy
  ), error => error.code === "AUTH01_THROTTLE_STATE_CORRUPT");
});

test("account and global cooldowns cannot be extended by denied requests and reopen deterministically", () => {
  let now = 1000;
  const policy = {
    accountFailureThreshold: 2, accountWindowMs: 1000, accountInitialCooldownMs: 100,
    accountMaximumCooldownMs: 200, globalFailureThreshold: 3, globalUnknownFailureThreshold: 3, globalWindowMs: 1000,
    globalInitialCooldownMs: 120, globalMaximumCooldownMs: 240, reservationTtlMs: 50,
    maximumReservations: 10
  };
  const h = harness({ throttlePolicy: policy, now: () => now });
  const options = { ...h.runtimeOptions, throttlePolicy: policy, now: () => now };
  for (let i = 0; i < 2; i++) {
    const r = h.context.auth01ReserveLoginAttempt("owner", options);
    h.context.auth01FinalizeLoginAttempt(r, "failure", options);
  }
  const accountKey = Object.keys(h.props.values).find(key => key.startsWith("AUTH01:RL:v1:A:"));
  const accountDeadline = JSON.parse(h.props.getProperty(accountKey)).blockedUntil;
  for (const at of [1010, 1050, 1099]) {
    now = at;
    assert.equal(h.context.auth01ReserveLoginAttempt("owner", options).allowed, false);
    assert.equal(JSON.parse(h.props.getProperty(accountKey)).blockedUntil, accountDeadline);
  }
  now = accountDeadline;
  assert.equal(h.context.auth01ReserveLoginAttempt("owner", options).allowed, true);

  const g = harness({ throttlePolicy: policy, now: () => now });
  const globalOptions = { ...g.runtimeOptions, throttlePolicy: policy, now: () => now };
  for (let i = 0; i < 3; i++) {
    const r = g.context.auth01ReserveLoginAttempt("", globalOptions);
    g.context.auth01FinalizeLoginAttempt(r, "failure", globalOptions);
  }
  const globalDeadline = JSON.parse(g.props.getProperty("AUTH01:RL:v1:G")).blockedUntil;
  now = globalDeadline - 1;
  assert.equal(g.context.auth01ReserveLoginAttempt("", globalOptions).allowed, false);
  assert.equal(JSON.parse(g.props.getProperty("AUTH01:RL:v1:G")).blockedUntil, globalDeadline);
  now = globalDeadline;
  assert.equal(g.context.auth01ReserveLoginAttempt("", globalOptions).allowed, true);
});

test("default rate windows preserve five per 15 minutes and 100 per five minutes", () => {
  const h = harness({ now: () => 1000 });
  const policy = h.context.auth01ThrottlePolicy(h.runtimeOptions);
  const account = h.context.auth01EmptyThrottleState(1000, "ACCOUNT");
  account.failures = policy.accountFailureThreshold - 1;
  h.context.auth01ApplyThrottleFailure(
    account, 1000, policy.accountFailureThreshold, policy.accountWindowMs,
    policy.accountInitialCooldownMs, policy.accountMaximumCooldownMs
  );
  assert.equal(account.blockedUntil, 1000 + 15 * 60 * 1000);
  const global = h.context.auth01EmptyThrottleState(1000, "GLOBAL");
  global.failures = policy.globalFailureThreshold - 1;
  h.context.auth01ApplyThrottleFailure(
    global, 1000, policy.globalFailureThreshold, policy.globalWindowMs,
    policy.globalInitialCooldownMs, policy.globalMaximumCooldownMs
  );
  assert.equal(global.blockedUntil, 1000 + 5 * 60 * 1000);
  assert.equal(policy.globalUnknownFailureThreshold, 80);
});

test("sustained attackers can only reacquire fresh bounded windows, not extend an existing block", () => {
  let now = 1000;
  const policy = {
    accountFailureThreshold: 2, accountWindowMs: 100, accountInitialCooldownMs: 10,
    accountMaximumCooldownMs: 100, globalFailureThreshold: 4, globalUnknownFailureThreshold: 3,
    globalWindowMs: 50, globalInitialCooldownMs: 10, globalMaximumCooldownMs: 50,
    reservationTtlMs: 10, maximumReservations: 4
  };
  const h = harness({ throttlePolicy: policy, now: () => now });
  const options = { ...h.runtimeOptions, throttlePolicy: policy, now: () => now };

  for (let window = 0; window < 5; window++) {
    for (let attempt = 0; attempt < policy.accountFailureThreshold; attempt++) {
      options.reservationId = `account-${window}-${attempt}`;
      const reservation = h.context.auth01ReserveLoginAttempt("owner", options);
      assert.equal(reservation.allowed, true);
      h.context.auth01FinalizeLoginAttempt(reservation, "failure", options);
    }
    const accountKey = Object.keys(h.props.values).find(key => key.startsWith("AUTH01:RL:v1:A:"));
    const blocked = JSON.parse(h.props.getProperty(accountKey));
    assert.equal(blocked.status, "BLOCKED");
    const deadline = blocked.blockedUntil;

    for (let denied = 0; denied < 3; denied++) {
      now = deadline - 1;
      options.reservationId = `denied-${window}-${denied}`;
      assert.equal(h.context.auth01ReserveLoginAttempt("owner", options).allowed, false);
      assert.equal(JSON.parse(h.props.getProperty(accountKey)).blockedUntil, deadline);
    }

    now = deadline;
    options.reservationId = `reopen-${window}`;
    const reopened = h.context.auth01ReserveLoginAttempt("owner", options);
    assert.equal(reopened.allowed, true);
    h.context.auth01FinalizeLoginAttempt(reopened, "system", options);
  }
});

test("sustained global unknown pressure cannot consume the known-account lane or extend a live global deadline", () => {
  let now = 1000;
  const policy = {
    accountFailureThreshold: 3, accountWindowMs: 100, accountInitialCooldownMs: 10,
    accountMaximumCooldownMs: 100, globalFailureThreshold: 5, globalUnknownFailureThreshold: 3,
    globalWindowMs: 50, globalInitialCooldownMs: 10, globalMaximumCooldownMs: 50,
    reservationTtlMs: 10, maximumReservations: 5
  };
  const h = harness({ throttlePolicy: policy, now: () => now });
  const options = { ...h.runtimeOptions, throttlePolicy: policy, now: () => now };

  for (let window = 0; window < 5; window++) {
    for (let i = 0; i < policy.globalUnknownFailureThreshold; i++) {
      options.reservationId = `unknown-${window}-${i}`;
      const reservation = h.context.auth01ReserveLoginAttempt("", options);
      assert.equal(reservation.allowed, true);
      h.context.auth01FinalizeLoginAttempt(reservation, "failure", options);
    }
    options.reservationId = `known-${window}`;
    const known = h.context.auth01ReserveLoginAttempt("owner", options);
    assert.equal(known.allowed, true, "known-account capacity must survive unknown-user saturation");
    h.context.auth01FinalizeLoginAttempt(known, "system", options);

    options.reservationId = `unknown-denied-${window}`;
    assert.equal(h.context.auth01ReserveLoginAttempt("", options).allowed, false);
    now += policy.globalWindowMs;
  }
});

test("unknown-user global pressure cannot consume the reserved known-account lane", () => {
  const policy = {
    accountFailureThreshold: 5, accountWindowMs: 1000, accountInitialCooldownMs: 100,
    accountMaximumCooldownMs: 1000, globalFailureThreshold: 10,
    globalUnknownFailureThreshold: 8, globalWindowMs: 1000,
    globalInitialCooldownMs: 100, globalMaximumCooldownMs: 1000,
    reservationTtlMs: 50, maximumReservations: 10
  };
  const h = harness({ throttlePolicy: policy, now: () => 1000 });
  const options = { ...h.runtimeOptions, throttlePolicy: policy, now: () => 1000 };
  for (let i = 0; i < 8; i++) {
    options.reservationId = `unknown-${i}`;
    const reservation = h.context.auth01ReserveLoginAttempt("", options);
    assert.equal(reservation.allowed, true);
    h.context.auth01FinalizeLoginAttempt(reservation, "failure", options);
  }
  options.reservationId = "unknown-denied";
  assert.equal(h.context.auth01ReserveLoginAttempt("", options).allowed, false);
  options.reservationId = "known-reserved";
  assert.equal(h.context.auth01ReserveLoginAttempt("owner", options).allowed, true);
  assert.equal(Object.keys(h.props.values).filter(key => key.startsWith("AUTH01:RL:v1:A:")).length, 1);
});

test("throttle finalization is idempotent, conflict-safe, expiry-safe, and retry-safe", () => {
  let now = 1000;
  const policy = {
    accountFailureThreshold: 5, accountWindowMs: 1000, accountInitialCooldownMs: 100,
    accountMaximumCooldownMs: 200, globalFailureThreshold: 20, globalUnknownFailureThreshold: 20, globalWindowMs: 1000,
    globalInitialCooldownMs: 100, globalMaximumCooldownMs: 200, reservationTtlMs: 50,
    maximumReservations: 20
  };
  const h = harness({ throttlePolicy: policy, now: () => now });
  const options = { ...h.runtimeOptions, throttlePolicy: policy, now: () => now, reservationId: "duplicate-1" };
  const reservation = h.context.auth01ReserveLoginAttempt("owner", options);
  h.context.auth01FinalizeLoginAttempt(reservation, "failure", options);
  h.context.auth01FinalizeLoginAttempt(reservation, "failure", options);
  assert.equal(JSON.parse(h.props.getProperty("AUTH01:RL:v1:G")).failures, 1);
  assert.throws(() => h.context.auth01FinalizeLoginAttempt(reservation, "success", options),
    error => error.code === "AUTH01_THROTTLE_FINALIZATION_CONFLICT");

  const successOptions = { ...options, reservationId: "duplicate-success" };
  const successReservation = h.context.auth01ReserveLoginAttempt("owner", successOptions);
  h.context.auth01FinalizeLoginAttempt(successReservation, "success", successOptions);
  h.context.auth01FinalizeLoginAttempt(successReservation, "success", successOptions);
  assert.equal(JSON.parse(h.props.getProperty(successReservation.accountKey)).failures, 0);
  const systemOptions = { ...options, reservationId: "duplicate-system" };
  const systemReservation = h.context.auth01ReserveLoginAttempt("owner", systemOptions);
  h.context.auth01FinalizeLoginAttempt(systemReservation, "system", systemOptions);
  h.context.auth01FinalizeLoginAttempt(systemReservation, "system", systemOptions);

  const expiredOptions = { ...options, reservationId: "expired-1" };
  const expired = h.context.auth01ReserveLoginAttempt("owner", expiredOptions);
  now += 51;
  h.context.auth01FinalizeLoginAttempt(expired, "failure", expiredOptions);
  assert.equal(JSON.parse(h.props.getProperty("AUTH01:RL:v1:G")).failures, 1);

  let failAccountFinalize = false;
  const partialProperties = store({}, {
    set(key, value) {
      if (failAccountFinalize && key.startsWith("AUTH01:RL:v1:A:") && String(value).includes("partial-1")) {
        failAccountFinalize = false;
        return true;
      }
      return false;
    }
  });
  now = 2000;
  const partial = harness({ properties: partialProperties, throttlePolicy: policy, now: () => now });
  const partialOptions = { ...partial.runtimeOptions, throttlePolicy: policy, now: () => now, reservationId: "partial-1" };
  const partialReservation = partial.context.auth01ReserveLoginAttempt("owner", partialOptions);
  failAccountFinalize = true;
  assert.throws(() => partial.context.auth01FinalizeLoginAttempt(partialReservation, "failure", partialOptions));
  partial.context.auth01FinalizeLoginAttempt(partialReservation, "failure", partialOptions);
  const partialAccount = JSON.parse(partial.props.getProperty(partialReservation.accountKey));
  assert.equal(JSON.parse(partial.props.getProperty("AUTH01:RL:v1:G")).failures, 1);
  assert.equal(partialAccount.failures, 1);
});

test("journal inventory retains unresolved state and only cleans bounded stale terminal records", () => {
  const now = Date.now();
  const h = harness({ now: () => now });
  const opaque = "A".repeat(43);
  const write = (id, status, recoveryRequired = false) => h.context.auth01WriteMigrationJournal(
    h.props, `AUTH01:MIG:v1:${id}`,
    { requestId: id, opaqueUserId: opaque, rowNumber: 2, sourceState: "LEGACY_SHA256",
      status, phase: status, recoveryRequired }
  );
  write("applying", "APPLYING");
  write("recovery", "RECOVERY_REQUIRED", true);
  write("terminal", "COMMITTED");
  const terminalKey = "AUTH01:MIG:v1:terminal";
  const applyingKey = "AUTH01:MIG:v1:applying";
  const applying = JSON.parse(h.props.getProperty(applyingKey));
  applying.createdAt = new Date(now - 2 * 86400000).toISOString();
  applying.updatedAt = applying.createdAt;
  h.props.setProperty(applyingKey, JSON.stringify(applying));
  const terminal = JSON.parse(h.props.getProperty(terminalKey));
  terminal.createdAt = new Date(now - 8 * 86400000).toISOString();
  terminal.updatedAt = terminal.createdAt;
  h.props.setProperty(terminalKey, JSON.stringify(terminal));
  h.props.setProperty("AUTH01:MIG:v1:malformed", "{bad");
  const inventory = h.context.auth01MigrationJournalInventory(h.runtimeOptions);
  assert.equal(inventory.find(item => item.key.endsWith("applying")).attentionRequired, true);
  assert.equal(inventory.find(item => item.key.endsWith("recovery")).attentionRequired, true);
  assert.equal(inventory.find(item => item.key.endsWith("malformed")).malformed, true);
  const cleanup = h.context.auth01CleanupTerminalMigrationJournals(h.runtimeOptions);
  assert.equal(cleanup.deleted, 1);
  assert.equal(h.props.getProperty(terminalKey), null);
  assert.ok(h.props.getProperty("AUTH01:MIG:v1:recovery"));
  assert.ok(h.props.getProperty(applyingKey));
  assert.equal(h.props.getProperty("AUTH01:MIG:v1:malformed"), "{bad");
});

test("journal scan and throttle serialized/cardinality limits remain conservative", () => {
  const tooMany = {};
  for (let i = 0; i < 201; i++) tooMany[`AUTH01:MIG:v1:q${i}`] = "{}";
  const inventoryHarness = harness({ properties: store(tooMany), preserveIdentifierConfig: true });
  const pagedInventory = inventoryHarness.context.auth01MigrationJournalInventory(inventoryHarness.runtimeOptions);
  assert.equal(pagedInventory.length, 100);
  assert.equal(pagedInventory.total, 201);
  assert.equal(pagedInventory.overflow, 101);
  assert.equal(pagedInventory.nextOffset, 100);

  let now = 1000;
  const policy = {
    accountFailureThreshold: 110, accountWindowMs: 10000, accountInitialCooldownMs: 100,
    accountMaximumCooldownMs: 1000, globalFailureThreshold: 110, globalUnknownFailureThreshold: 110, globalWindowMs: 10000,
    globalInitialCooldownMs: 100, globalMaximumCooldownMs: 1000, reservationTtlMs: 5000,
    maximumReservations: 110
  };
  const h = harness({ throttlePolicy: policy, now: () => now });
  const options = { ...h.runtimeOptions, throttlePolicy: policy, now: () => now };
  const reservations = [];
  for (let i = 0; i < 100; i++) {
    options.reservationId = `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
    const reservation = h.context.auth01ReserveLoginAttempt("owner", options);
    assert.equal(reservation.allowed, true);
    reservations.push(reservation);
  }
  const globalRaw = h.props.getProperty("AUTH01:RL:v1:G");
  const accountKey = Object.keys(h.props.values).find(key => key.startsWith("AUTH01:RL:v1:A:"));
  const accountRaw = h.props.getProperty(accountKey);
  assert.ok(globalRaw.length < 8192);
  assert.ok(accountRaw.length < 8192);
  assert.equal(Object.keys(JSON.parse(globalRaw).reservations).length, 100);
  reservations.forEach(reservation => h.context.auth01FinalizeLoginAttempt(reservation, "success", options));
  const finalizedGlobalRaw = h.props.getProperty("AUTH01:RL:v1:G");
  const finalizedAccountRaw = h.props.getProperty(accountKey);
  assert.ok(finalizedGlobalRaw.length < 8192);
  assert.ok(finalizedAccountRaw.length < 8192);
  assert.equal(Object.keys(JSON.parse(finalizedGlobalRaw).finalizations).length, 100);
});

test("verification-class failures pay one modern KDF and expose one generic response", () => {
  const fixtures = [
    null,
    { password: "", passwordHash: modern(harness(), "secret") },
    { password: "", passwordHash: legacyHash("secret") },
    { password: "", passwordHash: "invalid" },
    { password: "", passwordHash: "" },
    { password: "legacy", passwordHash: "" }
  ];
  fixtures.forEach((credential, index) => {
    const rows = credential
      ? [HEADERS, ["owner", credential.password, "Owner", "", "2026-08-21", credential.passwordHash]]
      : [HEADERS];
    const h = harness({ users: sheet(rows) });
    let calls = 0;
    const original = h.context.auth01Pbkdf2HmacSha256;
    h.context.auth01Pbkdf2HmacSha256 = (...args) => { calls += 1; return original(...args); };
    const result = h.context.loginUser({ username: credential ? "owner" : "unknown", password: "wrong" });
    assert.equal(result.message, "Invalid username or password.", `fixture ${index}`);
    assert.equal(calls, 1, `fixture ${index}`);
  });
});



test("migration journal admission is bounded, cleanup works above 200, and old terminal records stay parseable", () => {
  const now = Date.UTC(2026, 7, 21);
  const opaque = "A".repeat(43);
  const values = {};
  const make = (id, status, ageDays, recoveryRequired = false) => {
    const stamp = new Date(now - ageDays * 86400000).toISOString();
    values[`AUTH01:MIG:v1:${id}`] = JSON.stringify({
      version: 1, requestId: id, opaqueUserId: opaque, rowNumber: 2,
      sourceState: "LEGACY_SHA256", targetState: "MODERN_V1", status, phase: status,
      createdAt: stamp, updatedAt: stamp, recoveryRequired
    });
  };
  for (let i = 0; i < 205; i++) make(`terminal-${i}`, i % 2 ? "COMMITTED" : "ABORTED", 40);
  make("applying-old", "APPLYING", 40);
  make("recovery-old", "RECOVERY_REQUIRED", 40, true);
  const h = harness({ properties: store(values), preserveIdentifierConfig: true, now: () => now });
  const options = { ...h.runtimeOptions, now: () => now };
  const first = h.context.auth01MigrationJournalInventory(options);
  assert.equal(first.total, 207);
  assert.equal(first.length, 100);
  assert.ok(first.overflow > 0);
  const cleanup1 = h.context.auth01CleanupTerminalMigrationJournals(options);
  assert.equal(cleanup1.deleted, 25);
  const cleanup2 = h.context.auth01CleanupTerminalMigrationJournals(options);
  assert.equal(cleanup2.deleted, 25);
  assert.ok(h.props.getProperty("AUTH01:MIG:v1:applying-old"));
  assert.ok(h.props.getProperty("AUTH01:MIG:v1:recovery-old"));
  assert.doesNotThrow(() => h.context.auth01ParseMigrationJournal(
    h.props.getProperty("AUTH01:MIG:v1:applying-old"), now
  ));
});

test("migration journal admission blocks unsafe pressure before credential mutation", () => {
  const now = Date.UTC(2026, 7, 21);
  const opaque = "A".repeat(43);
  const values = {};
  for (let i = 0; i < 40; i++) {
    const stamp = new Date(now - 1000).toISOString();
    values[`AUTH01:MIG:v1:active-${i}`] = JSON.stringify({
      version: 1, requestId: `active-${i}`, opaqueUserId: opaque, rowNumber: 2,
      sourceState: "LEGACY_SHA256", targetState: "MODERN_V1", status: "APPLYING", phase: "APPLYING",
      createdAt: stamp, updatedAt: stamp, recoveryRequired: false
    });
  }
  const users = sheet([HEADERS, ["owner", "", "Owner", "", "2026-08-21", legacyHash("secret")]]);
  const h = harness({ users, properties: store(values), preserveIdentifierConfig: true, now: () => now });
  const identifierKey = Buffer.alloc(32, 7).toString("base64url");
  h.props.setProperty("AUTH01:IDKEY:v1", identifierKey);
  h.props.setProperty("AUTH01:IDKEYFP:v1", identifierFingerprint(identifierKey));
  const options = { ...h.runtimeOptions, now: () => now, sheet: users };
  const beforeWrites = users.writeCount();
  const user = h.context.readUsersFromSheet()[0];
  const verification = h.context.auth01VerifyCredential(user, "secret", options);
  assert.throws(() => h.context.auth01MigrateCredential(user, "secret", verification, options),
    error => error.code === "AUTH01_MIGRATION_JOURNAL_CAPACITY_EXHAUSTED");
  assert.equal(users.writeCount(), beforeWrites);
});

test("throttle parser rejects reservation/finalization overlap", () => {
  const h = harness({ now: () => 1000 });
  const policy = h.context.auth01ThrottlePolicy(h.runtimeOptions);
  const state = h.context.auth01EmptyThrottleState(1000, "GLOBAL");
  state.reservations["same-id"] = { expiresAt: 1050, kind: "K" };
  state.finalizations["same-id"] = h.context.auth01EncodeThrottleFinalization("failure", 1000);
  const raw = JSON.stringify(state);
  assert.throws(() => h.context.auth01ValidateThrottleState(state, raw, 1000, "GLOBAL", policy),
    error => error.code === "AUTH01_THROTTLE_STATE_CORRUPT");
});

test("account-finalized/global-unfinalized retry completes once without double count", () => {
  let now = 1000;
  const policy = {
    accountFailureThreshold: 5, accountWindowMs: 1000, accountInitialCooldownMs: 100,
    accountMaximumCooldownMs: 200, globalFailureThreshold: 20, globalUnknownFailureThreshold: 20,
    globalWindowMs: 1000, globalInitialCooldownMs: 100, globalMaximumCooldownMs: 200,
    reservationTtlMs: 50, maximumReservations: 20
  };
  const h = harness({ throttlePolicy: policy, now: () => now });
  const options = { ...h.runtimeOptions, throttlePolicy: policy, now: () => now, reservationId: "inverse-partial" };
  const reservation = h.context.auth01ReserveLoginAttempt("owner", options);
  const account = JSON.parse(h.props.getProperty(reservation.accountKey));
  delete account.reservations[reservation.reservationId];
  account.finalizations[reservation.reservationId] = h.context.auth01EncodeThrottleFinalization("failure", now);
  account.failures = 1;
  h.props.setProperty(reservation.accountKey, JSON.stringify(account));
  h.context.auth01FinalizeLoginAttempt(reservation, "failure", options);
  h.context.auth01FinalizeLoginAttempt(reservation, "failure", options);
  const global = JSON.parse(h.props.getProperty("AUTH01:RL:v1:G"));
  const finalAccount = JSON.parse(h.props.getProperty(reservation.accountKey));
  assert.equal(global.failures, 1);
  assert.equal(finalAccount.failures, 1);
  assert.ok(global.finalizations[reservation.reservationId]);
  assert.ok(finalAccount.finalizations[reservation.reservationId]);
});

test("authenticated security-state read reports clean modern state with zero writes", () => {
  const h = harness();
  const credential = modern(h, "correct horse", 44);
  h.users.rows.push(["observable-user", "", "Observable User", "view_invoices", "", credential]);
  const created = h.context.createSessionForUser({
    username: "observable-user", displayName: "Observable User", permissions: ["view_invoices"]
  });
  const authContext = h.context.resolveAuthenticatedRequestContext(
    { sessionToken: created.token }, { strictReadOnly: true }
  );
  const propertiesBefore = { ...h.props.values };
  const cacheCallsBefore = { ...h.cache.calls };
  const sheetWritesBefore = h.users.writeCount();

  const result = h.context.getMyAuthSecurityState({
    username: "owner", role: "OWNER", permissions: ["manage_users"], audience: "forged"
  }, authContext);

  assert.equal(result.status, "success");
  assert.equal(result.credentialClass, "MODERN_V1");
  assert.equal(result.credentialStructureValid, true);
  assert.equal(result.plaintextBlank, true);
  assert.equal(result.sessionValid, true);
  assert.equal(result.sessionEpochMatch, true);
  assert.equal(result.sessionIdentifierMatch, true);
  assert.equal(result.identifierContinuity, "PASS");
  assert.equal(result.targetThrottleReservationCount, 0);
  assert.equal(result.authSecurityState, "CLEAN_MODERN");
  assert.deepEqual(h.props.values, propertiesBefore);
  assert.deepEqual(h.cache.calls, cacheCallsBefore);
  assert.equal(h.users.writeCount(), sheetWritesBefore);
});

test("authenticated security-state read classifies legacy compatibility without migration", () => {
  const h = harness();
  const credential = legacyHash("legacy password");
  h.users.rows.push(["observable-user", "", "Observable User", "view_invoices", "", credential]);
  const created = h.context.createSessionForUser({
    username: "observable-user", displayName: "Observable User", permissions: ["view_invoices"]
  });
  const authContext = h.context.resolveAuthenticatedRequestContext(
    { sessionToken: created.token }, { strictReadOnly: true }
  );
  const before = { ...h.props.values };
  const result = h.context.getMyAuthSecurityState({}, authContext);

  assert.equal(result.status, "success");
  assert.equal(result.credentialClass, "LEGACY_SHA256");
  assert.equal(result.credentialStructureValid, true);
  assert.equal(result.authSecurityState, "LEGACY_COMPAT");
  assert.equal(h.users.rows[1][5], credential);
  assert.deepEqual(h.props.values, before);
});

test("security-state read detects account-local journal and throttle inconsistency without repair", () => {
  const h = harness();
  h.users.rows.push(["observable-user", "", "Observable User", "view_invoices", "", modern(h, "secret", 51)]);
  const created = h.context.createSessionForUser({
    username: "observable-user", displayName: "Observable User", permissions: ["view_invoices"]
  });
  const authContext = h.context.resolveAuthenticatedRequestContext(
    { sessionToken: created.token }, { strictReadOnly: true }
  );
  const opaqueUserId = h.context.auth01OpaqueUserId("observable-user", h.runtimeOptions);
  h.props.setProperty("AUTH01:MIG:v1:malformed-local", JSON.stringify({ opaqueUserId }));
  const throttleKey = h.context.auth01VersionedIdentifierPropertyKeys(
    "observable-user", "AUTH01:RL:v1:A:", h.runtimeOptions
  ).activeKey;
  h.props.setProperty(throttleKey, "{malformed");
  const before = { ...h.props.values };
  const result = h.context.getMyAuthSecurityState({}, authContext);

  assert.equal(result.status, "success");
  assert.equal(result.migrationJournalState, "MALFORMED");
  assert.equal(result.migrationRecoveryRequired, true);
  assert.equal(result.recoveryArtifactCount, 1);
  assert.equal(result.targetThrottleMalformed, true);
  assert.equal(result.authSecurityState, "RECOVERY_REQUIRED");
  assert.deepEqual(h.props.values, before);
});

test("strict read-only authentication never cleans cache or session properties", () => {
  const h = harness();
  const before = { ...h.props.values };
  const cacheBefore = { ...h.cache.calls };
  const result = h.context.resolveAuthenticatedRequestContext({
    sessionToken: "00000000-0000-4000-8000-000000000099"
  }, { strictReadOnly: true });

  assert.equal(result, null);
  assert.deepEqual(h.props.values, before);
  assert.deepEqual(h.cache.calls, cacheBefore);
});

test("security-state output is allowlisted and exposes no identity or secret material", () => {
  const h = harness();
  const credential = modern(h, "not-returned", 61);
  h.users.rows.push(["observable-user", "", "Observable User", "view_invoices", "", credential]);
  const created = h.context.createSessionForUser({
    username: "observable-user", displayName: "Observable User", permissions: ["view_invoices"]
  });
  const authContext = h.context.resolveAuthenticatedRequestContext(
    { sessionToken: created.token }, { strictReadOnly: true }
  );
  const result = h.context.getMyAuthSecurityState({}, authContext);
  const serialized = JSON.stringify(result);

  assert.deepEqual(Object.keys(result).sort(), [
    "authSecurityState", "credentialClass", "credentialStructureValid",
    "effectiveCredentialEpoch", "identifierContinuity", "identifierVersion",
    "migrationJournalPresent", "migrationJournalState", "migrationRecoveryRequired",
    "plaintextBlank", "recoveryArtifactCount", "sessionEpochMatch",
    "sessionIdentifierMatch", "sessionValid", "status", "targetThrottleActiveBlock",
    "targetThrottleMalformed", "targetThrottleReservationCount"
  ].sort());
  assert.doesNotMatch(serialized, /observable-user|not-returned|cuthub\$|romeo-session-|AUTH01:IDKEY|sessionToken|passwordHash/i);
  assert.equal(h.context.getMyAuthSecurityState({}, Object.freeze({ username: "observable-user" })).authRequired, true);
});

test("local benchmark harness measures all injected-cost cases without changing runtime default", (t) => {
  const h = harness();
  const measure = operation => {
    const started = process.hrtime.bigint();
    operation();
    return Number(process.hrtime.bigint() - started) / 1e6;
  };
  let credential;
  const metrics = {
    oneDerivationMs: measure(() => { credential = modern(h, "correct", 1); }),
    repeatedCorrectVerificationMs: measure(() => {
      for (let index = 0; index < 10; index++) assert.equal(h.context.auth01VerifyCredential(
        { password: "", passwordHash: credential }, "correct", h.runtimeOptions
      ).ok, true);
    }),
    repeatedWrongVerificationMs: measure(() => {
      for (let index = 0; index < 10; index++) assert.equal(h.context.auth01VerifyCredential(
        { password: "", passwordHash: credential }, "wrong", h.runtimeOptions
      ).ok, false);
    }),
    unicodePasswordMs: measure(() => modern(h, "Cafe\u0301-كلمة-مرور", 2)),
    longPasswordMs: measure(() => modern(h, "x".repeat(1024), 3))
  };
  Object.values(metrics).forEach(value => assert.ok(Number.isFinite(value) && value >= 0));
  t.diagnostic(`AUTH01_BENCH_TEST_COST=${JSON.stringify(metrics)}`);
  assert.equal(vm.runInContext("AUTH01_CREDENTIAL_POLICY.iterations", h.context), 600000);
});
