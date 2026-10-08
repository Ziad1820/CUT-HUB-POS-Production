"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const builder = require("../scripts/build-backend");
const phase5 = require("../scripts/build-booking-availability-phase5-bundle");

function runtime(modular) {
  const context = vm.createContext({ console });
  const outputs = new Map(builder.manifestOutputs().map(output => [output.path, output]));
  const order = ["scripts/app-script-final-owner-access.js",
    ...phase5.SOURCE_ORDER.map(name => `scripts/${name}`)];
  const files = modular ? order.flatMap(output => outputs.get(output).sources)
    : [order[0], `scripts/${phase5.OUTPUT_NAME}`];
  for (const file of files) {
    vm.runInContext(fs.readFileSync(path.join(builder.ROOT, file), "utf8"), context, { filename: file });
  }
  context.jsonOutput = value => value;
  return context;
}

test("all backend outputs are synchronized with the authoritative modules", () => {
  const result = builder.buildBackend({ write: false });
  assert.deepEqual(result.stale, []);
  const registered = new Set(builder.manifestOutputs().flatMap(output => output.sources));
  const actual = fs.readdirSync(path.join(builder.ROOT, "backend"), { recursive: true })
    .filter(file => file.endsWith(".js")).map(file => `backend/${file.replace(/\\/g, "/")}`);
  assert.deepEqual(new Set(actual), registered, "No module can be silently omitted from the build");
});

test("deployment validation blocks a compatibility output edited outside its modules", t => {
  const originalRead = fs.readFileSync;
  const target = path.join(builder.ROOT, "scripts/app-script-final-owner-access.js");
  t.mock.method(fs, "readFileSync", function (file, ...args) {
    const content = originalRead.call(this, file, ...args);
    if (file !== target) return content;
    const suffix = "\n// simulated accidental direct edit\n";
    return typeof content === "string" ? content + suffix : Buffer.concat([content, Buffer.from(suffix)]);
  });
  const result = require("../scripts/validate-apps-script-deployment-package").validatePackage();
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.code === "DEPLOYMENT_BACKEND_OUTPUT_STALE" &&
    error.file === "scripts/app-script-final-owner-access.js"));
});

test("deployment validation reports a missing module before preparing a package", t => {
  const originalRead = fs.readFileSync;
  const target = path.join(builder.ROOT, "backend/auth/sessions.js");
  t.mock.method(fs, "readFileSync", function (file, ...args) {
    if (file === target) throw new Error("simulated missing session source");
    return originalRead.call(this, file, ...args);
  });
  const result = require("../scripts/validate-apps-script-deployment-package").validatePackage();
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.code === "DEPLOYMENT_BACKEND_SOURCE_INVALID"));
});

test("loading separate modules preserves every exposed runtime function and engine", () => {
  const bundled = runtime(false);
  const modular = runtime(true);
  assert.deepEqual(Object.keys(modular).sort(), Object.keys(bundled).sort());
  for (const name of Object.keys(bundled)) {
    if (name === "console") continue;
    if (typeof bundled[name] === "function") {
      assert.equal(String(modular[name]), String(bundled[name]), name);
    } else if (bundled[name] && typeof bundled[name] === "object") {
      assert.deepEqual(Object.keys(modular[name]).sort(), Object.keys(bundled[name]).sort(), name);
      for (const member of Object.keys(bundled[name])) {
        if (typeof bundled[name][member] === "function") {
          assert.equal(String(modular[name][member]), String(bundled[name][member]), `${name}.${member}`);
        }
      }
    }
  }
  assert.equal(vm.runInContext("TIME_ZONE", modular), "Africa/Cairo");
  assert.equal(vm.runInContext("ALL_PERMISSIONS.length", modular),
    vm.runInContext("ALL_PERMISSIONS.length", bundled));
});

test("separate modules keep authorization, date validation, and credential verification", () => {
  for (const context of [runtime(false), runtime(true)]) {
    context.validateCutHubRequestEnvironment = () => {};
    let protectedCalls = 0;
    context.getTotalIncome = () => { protectedCalls += 1; return {}; };
    const denied = context.doPost({ postData: { contents: JSON.stringify({ action: "totalIncome" }) } });
    assert.equal(denied.authRequired, true);
    assert.equal(protectedCalls, 0);
    assert.equal(context.normalizeDigits("٢٠٢٦"), "2026");
    assert.equal(context.isValidBookingDateKey("2026-10-08"), true);
    assert.equal(context.isValidBookingDateKey("2026-02-30"), false);
    const options = { testPolicy: { iterations: 2, allowedIterations: [2], maximumIterations: 2 },
      randomBytes: length => new Array(length).fill(9) };
    context.Utilities = {
      base64EncodeWebSafe: values => Buffer.from(Array.from(values, value => value & 255)).toString("base64url"),
      base64DecodeWebSafe: value => Array.from(Buffer.from(value, "base64url"), byte => byte > 127 ? byte - 256 : byte)
    };
    const hash = context.createModernCredential("module-password", options);
    assert.equal(context.auth01VerifyCredential({ password: "", passwordHash: hash },
      "module-password", options).ok, true);
    assert.equal(context.auth01VerifyCredential({ password: "", passwordHash: hash },
      "wrong-password", options).ok, false);
  }
});
