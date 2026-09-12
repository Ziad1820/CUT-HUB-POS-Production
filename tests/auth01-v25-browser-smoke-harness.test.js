"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const createHarness = require("./fixtures/auth01-v25-browser-smoke-harness.js");

test("retained-token harness exposes only safe outcomes and probes the exact token once", async () => {
  let issuedToken = "test-retained-token";
  let protectedCalls = 0;
  const harness = createHarness({
    fingerprintToken: async token => `sha256:${token.length}`,
    async request(payload) {
      if (payload.action === "loginUser") {
        return { status: "success", sessionCreated: true, sessionToken: issuedToken };
      }
      if (payload.action === "logoutUser") {
        return { status: "success", logoutAccepted: true, clientCleanupAllowed: true };
      }
      protectedCalls += 1;
      return protectedCalls === 1 ? { status: "success" } : { status: "error", authRequired: true };
    }
  });
  await harness.observedRequest({ action: "loginUser" });
  assert.equal(await harness.runProtectedRead(), true);
  await harness.observedRequest({ action: "logoutUser" });
  ["request-start", "response", "local-clear-start", "local-clear-complete", "redirect"]
    .forEach(phase => harness.observeAuthEvent({ detail: { action: "logout", phase } }));
  assert.equal(await harness.runRevokedTokenProbe(), true);
  await assert.rejects(harness.runRevokedTokenProbe(), /preconditions/);
  const report = harness.safeReport();
  assert.deepEqual(report, {
    loginRequestCount: 1,
    loginSuccessCount: 1,
    safeTokenFingerprint: "sha256:19",
    protectedReadPass: true,
    logoutRequestCount: 1,
    logoutResponseSemanticPass: true,
    localClearAfterRevocation: true,
    redirectAfterLocalClear: true,
    revokedTokenReusePass: true,
    protectedHandlerExecuted: false
  });
  assert.doesNotMatch(JSON.stringify(report), new RegExp(issuedToken));
  issuedToken = "";
});

test("harness source cannot log, render, store, persist, or place the token in a URL", () => {
  const source = require("node:fs").readFileSync(
    require("node:path").join(__dirname, "fixtures/auth01-v25-browser-smoke-harness.js"), "utf8"
  );
  assert.doesNotMatch(source, /console\.|localStorage|sessionStorage|document\.|location\.|URLSearchParams/);
  assert.doesNotMatch(source, /return\s+retainedToken|retainedToken\s*:/);
});
