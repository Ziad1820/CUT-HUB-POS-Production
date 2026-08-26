"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

const authSource = fs.readFileSync(path.join(
  __dirname, "../public/assets/js/core/auth.js"), "utf8");
const apiSource = fs.readFileSync(path.join(
  __dirname, "../public/assets/js/core/api.js"), "utf8");
const layout = require("../public/assets/js/utils/layout.js");
const loginPageSource = fs.readFileSync(path.join(
  __dirname, "../public/pages/login.html"), "utf8");

function authForPermissions(permissions, username = "limited-user") {
  const session = JSON.stringify({
    user: { username, displayName: "Limited", permissions },
    sessionToken: "session-token"
  });
  const sessionStorage = {
    getItem(key) { return key === "romeo-pos-session" ? session : null; },
    removeItem() {}, setItem() {}
  };
  const localStorage = { removeItem() {}, getItem() { return null; }, setItem() {} };
  const location = {
    pathname: "/pages/dashboard.html", search: "",
    href: "https://example.test/pages/dashboard.html",
    replace(value) { this.href = value; }
  };
  const context = vm.createContext({
    window: { location }, location, sessionStorage, localStorage,
    alert() {}, console, fetch: async () => { throw new Error("unexpected network access"); },
    URL, URLSearchParams, Promise, setTimeout, clearTimeout
  });
  vm.runInContext(`${authSource}\nglobalThis.__auth = RomeoAuth;`, context);
  return { auth: context.__auth, location, window: context.window };
}

function logoutHarness(request, options = {}) {
  let sessionValue = options.missingSession ? null : JSON.stringify({
    user: { username: "owner", displayName: "Owner", permissions: [] },
    sessionToken: "00000000-0000-4000-8000-000000000001-00000000-0000-4000-8000-000000000002"
  });
  const removals = [];
  const alerts = [];
  const warnings = [];
  const sessionStorage = {
    getItem(key) { return key === "romeo-pos-session" ? sessionValue : null; },
    setItem(key, value) { if (key === "romeo-pos-session") sessionValue = String(value); },
    removeItem(key) {
      removals.push(["session", key]);
      if (key === "romeo-pos-session") sessionValue = null;
    }
  };
  const localStorage = {
    getItem() { return null; }, setItem() {},
    removeItem(key) { removals.push(["local", key]); }
  };
  const location = {
    pathname: "/pages/dashboard.html",
    href: "https://example.test/pages/dashboard.html",
    replace(value) { this.href = value; }
  };
  const RomeoApi = {
    async request(payload) {
      const result = await request(payload);
      if (options.echoCorrelation === false || !result || typeof result !== "object") return result;
      return { ...result, authRequestId: payload.authRequestId };
    }
  };
  const window = {
    location,
    RomeoApi,
    alert(message) { alerts.push(message); }
  };
  const context = vm.createContext({
    window, location, RomeoApi, sessionStorage, localStorage,
    alert: window.alert, console: { warn(message) { warnings.push(message); } },
    URL, URLSearchParams, Promise, setTimeout, clearTimeout
  });
  vm.runInContext(`${authSource}\nglobalThis.__auth = RomeoAuth;`, context);
  return {
    auth: context.__auth,
    location,
    alerts,
    warnings,
    removals,
    hasSession: () => sessionValue !== null,
    sessionValue: () => sessionValue
  };
}

function loginPageHarness(request) {
  let sessionValue = null;
  let handler = null;
  let handlerRegistrations = 0;
  let requestSequence = 0;
  const observations = [];
  const scheduled = [];
  const navigations = [];
  const attributes = {};
  const form = {
    dataset: {},
    addEventListener(type, next) {
      assert.equal(type, "submit");
      handlerRegistrations += 1;
      handler = next;
    },
    querySelector() { return button; }
  };
  const button = {
    disabled: false,
    setAttribute(name, value) { attributes[name] = String(value); }
  };
  const usernameInput = { value: "owner" };
  const passwordInput = { value: "secret" };
  const statusBox = { textContent: "", className: "status" };
  const splash = { activations: 0, classList: { add() { splash.activations += 1; } } };
  const sessionStorage = {
    getItem(key) { return key === "romeo-pos-session" ? sessionValue : null; },
    setItem(key, value) { if (key === "romeo-pos-session") sessionValue = String(value); },
    removeItem(key) { if (key === "romeo-pos-session") sessionValue = null; }
  };
  const localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
  const location = { pathname: "/pages/login.html", search: "", href: "https://example.test/pages/login.html" };
  const RomeoApi = {
    async request(payload) {
      const result = await request(payload);
      return result && typeof result === "object"
        ? { ...result, authRequestId: payload.authRequestId }
        : result;
    }
  };
  const window = {
    location,
    RomeoApi,
    crypto: { randomUUID() { requestSequence += 1; return `00000000-0000-4000-8000-${String(requestSequence).padStart(12, "0")}`; } },
    CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init.detail; },
    dispatchEvent(event) { observations.push(event.detail); },
    alert() {}
  };
  const context = vm.createContext({
    window, location, RomeoApi, sessionStorage, localStorage,
    alert: window.alert, console, URL, URLSearchParams, Promise, setTimeout, clearTimeout
  });
  vm.runInContext(`${authSource}\nglobalThis.__auth = RomeoAuth;`, context);
  const options = {
    form, button, submitButton: button, usernameInput, passwordInput, statusBox, splash,
    schedule(callback) { scheduled.push(callback); },
    navigate(target) { navigations.push(target); }
  };
  return {
    auth: context.__auth,
    attributes,
    button,
    form,
    handlerRegistrations: () => handlerRegistrations,
    initialize: () => context.__auth.initializeLoginPage(options),
    navigations,
    observations,
    scheduled,
    sessionValue: () => sessionValue,
    splash,
    statusBox,
    submit: () => handler({ preventDefault() {} })
  };
}

test("auth publishes the runtime API for the shared layout", () => {
  const { auth, window } = authForPermissions(["access_dashboard"]);
  assert.equal(window.RomeoAuth, auth);
  assert.equal(window.RomeoAuth.hasPermission("access_dashboard"), true);
});

test("login page delegates idempotent binding to the canonical auth module", () => {
  assert.match(loginPageSource, /RomeoAuth\.initializeLoginPage\(/);
  assert.doesNotMatch(loginPageSource, /loginForm\.addEventListener\("submit"/);
});

test("owner receives the complete canonical navigation", () => {
  const { auth } = authForPermissions([], "owner");
  const navigation = layout.buildNavigation({
    language: "en",
    currentPage: "dashboard.html",
    hasPermission: auth.hasPermission
  });
  assert.deepEqual(
    navigation.map(item => item.href),
    layout.NAVIGATION_ITEMS.map(item => item.href)
  );
});

test("restricted user sees only explicitly authorized navigation", () => {
  const { auth } = authForPermissions(["access_dashboard", "view_bookings"]);
  const navigation = layout.buildNavigation({
    language: "en",
    currentPage: "dashboard.html",
    hasPermission: auth.hasPermission
  });
  assert.deepEqual(navigation.map(item => item.href), ["dashboard.html", "bookings.html"]);
});

test("legacy comma-separated and JSON permission strings normalize safely", () => {
  for (const permissions of [
    "access_dashboard, view_bookings",
    '["access_dashboard", "view_bookings"]'
  ]) {
    const { auth } = authForPermissions(permissions);
    assert.equal(auth.hasPermission("access_dashboard"), true);
    assert.equal(auth.hasPermission("view_bookings"), true);
    assert.equal(auth.hasPermission("manage_users"), false);
  }
});

test("missing, empty, and unknown permissions fail closed", () => {
  for (const permissions of [undefined, "", "unknown_permission"]) {
    const { auth } = authForPermissions(permissions);
    assert.equal(auth.hasPermission("access_dashboard"), false);
    assert.equal(auth.hasPermission("manage_users"), false);
  }
});

[
  ["payroll_attendance.view", "payroll-attendance.html"],
  ["booking_availability.view", "booking-availability-admin.html"],
  ["view_data_analysis", "data-analysis.html"],
  ["view_staff_discount", "staff-discount.html"]
].forEach(([permission, expectedPage]) => {
  test(`limited ${permission} user is routed to ${expectedPage}`, () => {
    const { auth, location } = authForPermissions([permission]);
    assert.equal(auth.requireAuth("access_dashboard"), null);
    assert.equal(location.href, expectedPage);
  });
});

test("routing order prefers payroll before booking availability when both are granted", () => {
  const { auth, location } = authForPermissions([
    "booking_availability.view", "payroll_attendance.view"
  ]);
  assert.equal(auth.requireAuth("access_dashboard"), null);
  assert.equal(location.href, "payroll-attendance.html");
});

test("a user authorized for the requested page is not redirected", () => {
  const { auth, location } = authForPermissions(["booking_availability.view"]);
  const user = auth.requireAuth("booking_availability.view");
  assert.equal(user.username, "limited-user");
  assert.equal(location.href, "https://example.test/pages/dashboard.html");
});

test("a user with no page permissions fails closed to login", () => {
  const { auth, location } = authForPermissions([]);
  assert.equal(auth.requireAuth("access_dashboard"), null);
  assert.equal(location.href, "login.html");
});

test("session expiry redirects once and leaves the protected API request unresolved", async () => {
  const removed = [];
  const location = {
    pathname: "/pages/booking-availability-admin.html", search: "",
    href: "https://example.test/pages/booking-availability-admin.html",
    replace(value) { this.href = value; }
  };
  const storage = {
    getItem() { return JSON.stringify({ sessionToken: "expired-token" }); },
    removeItem(key) { removed.push(key); }, setItem() {}
  };
  const window = {
    location, ROMEO_API_URL: "https://script.google.com/macros/s/staging-test/exec",
    addEventListener() {}, dispatchEvent() {}
  };
  const context = vm.createContext({
    window, location, localStorage: storage, sessionStorage: storage,
    document: { readyState: "complete", addEventListener() {} },
    navigator: { onLine: true }, CustomEvent: function CustomEvent() {},
    fetch: async () => ({ ok: true, json: async () => ({ sessionExpired: true }) }),
    URL, JSON, Promise, Error
  });
  vm.runInContext(apiSource, context);
  const request = context.window.RomeoApi.request({ action: "protectedRead" });
  const outcome = await Promise.race([
    request.then(() => "resolved", () => "rejected"),
    new Promise(resolve => setTimeout(() => resolve("pending"), 10))
  ]);
  assert.equal(outcome, "pending");
  assert.match(location.href, /login\.html\?reason=session-expired&returnTo=booking-availability-admin\.html/);
  assert.equal(removed.length, 2);
});

test("missing runtime API endpoint fails closed before any network request", async () => {
  let fetchCalls = 0;
  const location = {
    pathname: "/pages/login.html", href: "https://example.test/pages/login.html",
    replace() {}
  };
  const storage = { getItem() { return null; }, removeItem() {}, setItem() {} };
  const window = { location, addEventListener() {}, dispatchEvent() {} };
  const context = vm.createContext({
    window, location, localStorage: storage, sessionStorage: storage,
    document: { readyState: "complete", addEventListener() {} },
    navigator: { onLine: true }, CustomEvent: function CustomEvent() {},
    fetch: async () => { fetchCalls += 1; throw new Error("network must not run"); },
    URL, JSON, Promise, Error
  });
  vm.runInContext(apiSource, context);
  await assert.rejects(
    context.window.RomeoApi.request({ action: "login" }),
    error => Boolean(error && error.message)
  );
  assert.equal(fetchCalls, 0);
});

test("API wrapper owns the single canonical logout credential and ignores caller selectors", async () => {
  const calls = [];
  const location = {
    pathname: "/pages/dashboard.html", href: "https://example.test/pages/dashboard.html",
    replace(value) { this.href = value; }
  };
  const storage = {
    getItem(key) {
      return key === "romeo-pos-session"
        ? JSON.stringify({ sessionToken: "canonical-session-token" })
        : null;
    },
    removeItem() {}, setItem() {}
  };
  const window = {
    location,
    ROMEO_API_URL: "https://script.google.com/macros/s/staging-test/exec",
    addEventListener() {}, dispatchEvent() {}
  };
  const context = vm.createContext({
    window, location, localStorage: storage, sessionStorage: storage,
    document: { readyState: "complete", body: null, addEventListener() {} },
    navigator: { onLine: true }, CustomEvent: function CustomEvent() {},
    async fetch(url, options) {
      calls.push({ url, options });
      return { ok: true, async json() {
        return { status: "success", logoutAccepted: true, clientCleanupAllowed: true };
      } };
    },
    URL, JSON, Promise, Error
  });
  vm.runInContext(apiSource, context);
  const result = await context.window.RomeoApi.request({
    action: "logoutUser",
    authRequestId: "logout-wrapper-correlation-001",
    sessionToken: "forged-selector",
    token: "second-forged-selector",
    authToken: "third-forged-selector"
  });
  assert.equal(result.logoutAccepted, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.keepalive, true);
  assert.equal(calls[0].options.headers["Content-Type"], "text/plain;charset=utf-8");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    action: "logoutUser",
    authRequestId: "logout-wrapper-correlation-001",
    sessionToken: "canonical-session-token"
  });
});

function successfulLoginResponse() {
  return {
    status: "success",
    user: { username: "owner", displayName: "Owner", permissions: [] },
    sessionToken: "test-session-token",
    sessionCreated: true
  };
}

test("single login submit issues exactly one correlated request and schedules one navigation", async () => {
  const requests = [];
  const h = loginPageHarness(async payload => {
    requests.push(payload);
    return successfulLoginResponse();
  });
  assert.equal(h.initialize(), true);
  await h.submit();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].action, "loginUser");
  assert.match(requests[0].authRequestId, /^login-/);
  assert.equal(h.button.disabled, true);
  assert.equal(h.scheduled.length, 1);
  h.scheduled[0]();
  assert.deepEqual(h.navigations, ["dashboard.html"]);
  assert.ok(h.sessionValue());
});

test("double click and repeated Enter while pending each produce zero duplicate requests", async () => {
  for (const interaction of ["double-click", "enter-repeat"]) {
    let calls = 0;
    let resolveRequest;
    const h = loginPageHarness(() => {
      calls += 1;
      return new Promise(resolve => { resolveRequest = resolve; });
    });
    h.initialize();
    const first = h.submit();
    const duplicate = h.submit();
    await duplicate;
    assert.equal(calls, 1, interaction);
    assert.equal(h.button.disabled, true, interaction);
    resolveRequest(successfulLoginResponse());
    await first;
    assert.equal(h.scheduled.length, 1, interaction);
  }
});

test("failed login unlocks the UI and permits one later deliberate retry", async () => {
  let calls = 0;
  const h = loginPageHarness(async () => {
    calls += 1;
    return calls === 1
      ? { status: "error", message: "Invalid username or password." }
      : successfulLoginResponse();
  });
  h.initialize();
  await h.submit();
  assert.equal(calls, 1);
  assert.equal(h.button.disabled, false);
  assert.equal(h.attributes["aria-busy"], "false");
  assert.equal(h.statusBox.className, "status error");
  await h.submit();
  assert.equal(calls, 2);
  assert.equal(h.button.disabled, true);
  assert.equal(h.scheduled.length, 1);
});

test("successful login blocks re-entry and navigates exactly once", async () => {
  let calls = 0;
  const h = loginPageHarness(async () => { calls += 1; return successfulLoginResponse(); });
  h.initialize();
  await h.submit();
  await h.submit();
  assert.equal(calls, 1);
  assert.equal(h.scheduled.length, 1);
  h.scheduled[0]();
  assert.equal(h.navigations.length, 1);
  assert.equal(h.splash.activations, 1);
});

test("duplicate login-page initialization registers one effective submit handler", () => {
  const h = loginPageHarness(async () => successfulLoginResponse());
  assert.equal(h.initialize(), true);
  assert.equal(h.initialize(), false);
  assert.equal(h.handlerRegistrations(), 1);
  assert.equal(h.form.dataset.authLoginReady, "true");
});

test("independent completed login page contexts may each create a separate session", async () => {
  let calls = 0;
  const request = async () => { calls += 1; return successfulLoginResponse(); };
  const first = loginPageHarness(request);
  const second = loginPageHarness(request);
  first.initialize();
  second.initialize();
  await first.submit();
  await second.submit();
  assert.equal(calls, 2);
  assert.equal(first.scheduled.length, 1);
  assert.equal(second.scheduled.length, 1);
});

test("logout sends no duplicate token and clears only after correlated cleanup acknowledgement", async () => {
  let resolveRequest;
  let capturedRequestId = "";
  const h = logoutHarness(payload => {
    capturedRequestId = payload.authRequestId;
    assert.equal(payload.action, "logoutUser");
    assert.equal(Object.prototype.hasOwnProperty.call(payload, "sessionToken"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(payload, "token"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(payload, "authToken"), false);
    return new Promise(resolve => { resolveRequest = resolve; });
  });

  const pending = h.auth.logout();
  await Promise.resolve();
  assert.match(capturedRequestId, /^logout-/);
  assert.equal(h.hasSession(), true);
  assert.equal(h.location.href, "https://example.test/pages/dashboard.html");

  resolveRequest({ status: "success", logoutAccepted: true, clientCleanupAllowed: true });
  const result = await pending;
  assert.equal(result.success, true);
  assert.equal(result.revoked, false);
  assert.equal(result.serverConfirmedRevocation, false);
  assert.equal(result.clientCleanupAllowed, true);
  assert.equal(h.hasSession(), false);
  assert.equal(h.location.href, "login.html");
  assert.equal(h.alerts.length, 0);
});

test("logout rejects a mismatched correlation response and retains local state", async () => {
  const h = logoutHarness(async payload => ({
    status: "success", logoutAccepted: true, clientCleanupAllowed: true,
    authRequestId: `${payload.authRequestId}-mismatch`
  }), { echoCorrelation: false });
  const result = await h.auth.logout();
  assert.equal(result.success, false);
  assert.equal(result.revoked, false);
  assert.equal(h.hasSession(), true);
  assert.equal(h.location.href, "https://example.test/pages/dashboard.html");
});

test("network rejection retains authenticated state and surfaces deterministic failure", async () => {
  const h = logoutHarness(async () => { throw new Error("network down"); });
  const result = await h.auth.logout();
  assert.equal(result.success, false);
  assert.equal(result.revoked, false);
  assert.equal(h.hasSession(), true);
  assert.equal(h.location.href, "https://example.test/pages/dashboard.html");
  assert.equal(h.alerts.length, 1);
  assert.doesNotMatch(h.warnings.join(" "), /00000000|sessionToken/);
});

test("timeout-style transport rejection does not present logout as complete", async () => {
  const h = logoutHarness(async () => { throw new Error("timeout"); });
  const result = await h.auth.logout();
  assert.equal(result.success, false);
  assert.equal(h.hasSession(), true);
  assert.notEqual(h.location.href, "login.html");
});

test("backend error and explicit revocation failure retain state for retry", async () => {
  for (const response of [
    { status: "error", code: "SESSION_PROPERTY_DELETE_FAILED", revoked: false },
    { status: "success", revoked: false }
  ]) {
    const h = logoutHarness(async () => response);
    const result = await h.auth.logout();
    assert.equal(result.success, false);
    assert.equal(h.hasSession(), true);
    assert.equal(h.location.href, "https://example.test/pages/dashboard.html");
    assert.equal(h.alerts.length, 1);
  }
});

test("safe extra backend diagnostics do not change generic cleanup semantics", async () => {
  const h = logoutHarness(async () => ({
    status: "success", logoutAccepted: true, clientCleanupAllowed: true, activityLogFailed: true
  }));
  const result = await h.auth.logout();
  assert.equal(result.success, true);
  assert.equal(result.serverConfirmedRevocation, false);
  assert.equal(h.hasSession(), false);
  assert.equal(h.location.href, "login.html");
});

test("frontend does not infer server revocation details from cleanup acknowledgement", async () => {
  const h = logoutHarness(async () => ({
    status: "success", logoutAccepted: true, clientCleanupAllowed: true,
    serverConfirmedRevocation: true, cacheRemovalFailed: true
  }));
  const result = await h.auth.logout();
  assert.equal(result.success, true);
  assert.equal(result.serverConfirmedRevocation, false);
  assert.equal(Object.prototype.hasOwnProperty.call(result, "cacheRemovalFailed"), false);
  assert.equal(h.hasSession(), false);
  assert.equal(h.location.href, "login.html");
});

test("idempotent cleanup acknowledgement never becomes confirmed server revocation", async () => {
  const h = logoutHarness(async () => ({
    status: "success", logoutAccepted: true, clientCleanupAllowed: true,
    alreadyRevoked: true, revoked: true
  }));
  const result = await h.auth.logout();
  assert.equal(result.success, true);
  assert.equal(result.revoked, false);
  assert.equal(result.serverConfirmedRevocation, false);
  assert.equal(Object.prototype.hasOwnProperty.call(result, "alreadyRevoked"), false);
  assert.equal(h.hasSession(), false);
  assert.equal(h.location.href, "login.html");
});

test("concurrent logout attempts issue one request and preserve state until it completes", async () => {
  let calls = 0;
  let resolveRequest;
  const h = logoutHarness(() => {
    calls += 1;
    return new Promise(resolve => { resolveRequest = resolve; });
  });
  const first = h.auth.logout();
  const second = await h.auth.logout();
  assert.equal(calls, 1);
  assert.equal(second.success, false);
  assert.equal(second.inProgress, true);
  assert.equal(h.hasSession(), true);
  assert.equal(h.alerts.length, 0);

  resolveRequest({ status: "success", logoutAccepted: true, clientCleanupAllowed: true });
  assert.equal((await first).success, true);
  assert.equal(h.hasSession(), false);
});

test("missing local token uses generic cleanup acknowledgement without a selector", async () => {
  let calls = 0;
  const h = logoutHarness(async payload => {
    calls += 1;
    assert.equal(Object.prototype.hasOwnProperty.call(payload, "sessionToken"), false);
    return { status: "success", logoutAccepted: true, clientCleanupAllowed: true };
  }, { missingSession: true });
  const result = await h.auth.logout();
  assert.equal(result.success, true);
  assert.equal(result.serverConfirmedRevocation, false);
  assert.equal(calls, 1);
  assert.equal(h.location.href, "login.html");
  assert.equal(h.alerts.length, 0);
});
