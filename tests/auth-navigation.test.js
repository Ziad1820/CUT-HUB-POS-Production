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

test("auth publishes the runtime API for the shared layout", () => {
  const { auth, window } = authForPermissions(["access_dashboard"]);
  assert.equal(window.RomeoAuth, auth);
  assert.equal(window.RomeoAuth.hasPermission("access_dashboard"), true);
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
