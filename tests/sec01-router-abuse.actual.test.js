"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(root, "scripts", "app-script-final-owner-access.js"),
  "utf8"
);

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} missing`);

  const brace = source.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;

  for (let i = brace; i < source.length; i++) {
    const ch = source[i];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        quote = "";
      }
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }

    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }

  throw new Error(`Could not extract ${name}`);
}

const publicMatch = source.match(
  /const\s+PUBLIC_ACTIONS\s*=\s*Object\.freeze\(\s*(\[[\s\S]*?\])\s*\)\s*;/
);

assert.ok(publicMatch, "PUBLIC_ACTIONS missing");

const PUBLIC_ACTIONS = vm.runInNewContext(publicMatch[1]);

const harnessSource = `
const PUBLIC_ACTIONS = Object.freeze(${JSON.stringify(PUBLIC_ACTIONS)});
${extractFunction("isPublicAction")}
${extractFunction("doPost")}
globalThis.__doPost = doPost;
`;

function makeHarness() {
  const calls = {};

  function stub(name) {
    return function () {
      calls[name] = (calls[name] || 0) + 1;
      return { status: "handler", handler: name };
    };
  }

  const context = {
    Object,
    String,
    JSON,

    validateCutHubRequestEnvironment() {},

    parsePostRequestData(e) {
      return JSON.parse(e.postData.contents);
    },

    getSessionToken(data) {
      return String(
        data.sessionToken || data.token || data.authToken || ""
      ).trim();
    },

    resolveAuthenticatedRequestContext(data) {
      return data.sessionToken === "valid-session"
        ? { username: "owner", sessionPropertyKey: "internal-only" }
        : null;
    },

    jsonOutput(payload) {
      return payload;
    },

    stagingIdentity: stub("stagingIdentity"),
    logoutUser(_data, authContext) {
      calls.logoutUser = (calls.logoutUser || 0) + 1;
      return authContext
        ? { status: "success", logoutAccepted: true, clientCleanupAllowed: true }
        : { status: "success", logoutAccepted: true, clientCleanupAllowed: true };
    },
    getInvoices: stub("getInvoices"),
    getActivityLogs: stub("getActivityLogs"),
    getPublicBookingOptions: stub("getPublicBookingOptions"),
    handleBookingAvailabilityPhase5Action:
      stub("handleBookingAvailabilityPhase5Action"),

    StaffSchedulingPhase2: {
      ACTIONS: ["listStaffSchedules"]
    },

    StaffAttendancePhase3: {
      ACTIONS: ["getAttendanceDashboard"]
    },

    StaffPayrollAttendancePhase4: {
      ACTIONS: ["listPayrollPeriods"]
    },

    handleStaffSchedulingPhase2Action:
      stub("handleStaffSchedulingPhase2Action"),

    handleStaffAttendancePhase3Action:
      stub("handleStaffAttendancePhase3Action"),

    handleStaffPayrollAttendancePhase4Action:
      stub("handleStaffPayrollAttendancePhase4Action")
  };

  vm.createContext(context);
  vm.runInContext(harnessSource, context);

  return {
    calls,
    post(data) {
      return context.__doPost({
        postData: { contents: JSON.stringify(data) }
      });
    }
  };
}

function count(h, name) {
  return h.calls[name] || 0;
}

test("PUBLIC allowlist is exact", () => {
  assert.deepEqual(
    Array.from(PUBLIC_ACTIONS),
    [
      "loginUser",
      "listPublicBookingBranches",
      "getPublicBookingOptions",
      "createPublicBookingRequest",
      "getPublicBookingStatus",
      "respondToBookingProposal",
      "submitBookingRating",
      "getBookingRating",
      "getBarberRatings"
    ]
  );
});

test("missing token blocks protected handler", () => {
  const h = makeHarness();
  const r = h.post({ action: "getInvoices" });

  assert.equal(r.status, "error");
  assert.equal(r.authRequired, true);
  assert.equal(count(h, "getInvoices"), 0);
});

test("invalid token blocks protected handler", () => {
  const h = makeHarness();

  const r = h.post({
    action: "getInvoices",
    sessionToken: "invalid"
  });

  assert.equal(r.status, "error");
  assert.equal(r.authRequired, true);
  assert.equal(count(h, "getInvoices"), 0);
});

test("valid token reaches protected handler once", () => {
  const h = makeHarness();

  const r = h.post({
    action: "getInvoices",
    sessionToken: "valid-session"
  });

  assert.equal(r.handler, "getInvoices");
  assert.equal(count(h, "getInvoices"), 1);
});

test("public action works anonymously", () => {
  const h = makeHarness();

  const r = h.post({
    action: "getPublicBookingOptions"
  });

  assert.equal(r.handler, "getPublicBookingOptions");
  assert.equal(count(h, "getPublicBookingOptions"), 1);
});

test("logout is a router-authenticated special action with uniform anonymous cleanup response", () => {
  const anonymous = makeHarness();
  const anonymousResult = anonymous.post({ action: "logoutUser" });
  assert.equal(anonymousResult.logoutAccepted, true);
  assert.equal(count(anonymous, "logoutUser"), 1);

  const authenticated = makeHarness();
  const authenticatedResult = authenticated.post({
    action: "logoutUser",
    sessionToken: "valid-session",
    username: "forged-owner",
    role: "OWNER",
    audience: "forged",
    branch: "forged"
  });
  assert.equal(authenticatedResult.logoutAccepted, true);
  assert.equal(count(authenticated, "logoutUser"), 1);
});

test("forged identity hints cannot bypass authentication", () => {
  const h = makeHarness();

  const r = h.post({
    action: "getActivityLogs",
    username: "owner",
    role: "OWNER",
    actorRole: "OWNER",
    audience: "internal",
    branchId: "CUT_HUB_MAIN"
  });

  assert.equal(r.status, "error");
  assert.equal(r.authRequired, true);
  assert.equal(count(h, "getActivityLogs"), 0);
});

test("stagingIdentity requires authentication", () => {
  const h = makeHarness();

  const denied = h.post({
    action: "stagingIdentity"
  });

  assert.equal(denied.authRequired, true);
  assert.equal(count(h, "stagingIdentity"), 0);

  const allowed = h.post({
    action: "stagingIdentity",
    sessionToken: "valid-session"
  });

  assert.equal(allowed.handler, "stagingIdentity");
  assert.equal(count(h, "stagingIdentity"), 1);
});

test("Phase 2 3 and 4 actions are protected before module handler", () => {
  const cases = [
    ["listStaffSchedules", "handleStaffSchedulingPhase2Action"],
    ["getAttendanceDashboard", "handleStaffAttendancePhase3Action"],
    ["listPayrollPeriods", "handleStaffPayrollAttendancePhase4Action"]
  ];

  for (const [action, handler] of cases) {
    const h = makeHarness();
    const r = h.post({ action });

    assert.equal(r.authRequired, true);
    assert.equal(count(h, handler), 0);
  }
});

test("unknown anonymous action fails closed with no handler", () => {
  const h = makeHarness();

  const r = h.post({
    action: "__SEC01_UNKNOWN__"
  });

  assert.equal(r.status, "error");
  assert.equal(r.authRequired, true);

  const totalCalls = Object.values(h.calls)
    .reduce((sum, n) => sum + n, 0);

  assert.equal(totalCalls, 0);
});

test("unknown authenticated action reaches only Unknown action response", () => {
  const h = makeHarness();

  const r = h.post({
    action: "__SEC01_UNKNOWN__",
    sessionToken: "valid-session"
  });

  assert.equal(r.status, "error");
  assert.equal(r.message, "Unknown action");

  const totalCalls = Object.values(h.calls)
    .reduce((sum, n) => sum + n, 0);

  assert.equal(totalCalls, 0);
});
