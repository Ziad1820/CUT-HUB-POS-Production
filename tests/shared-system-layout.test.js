const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const layout = require("../public/assets/js/utils/layout.js");
const root = path.join(__dirname, "..");
const phasePages = ["attendance.html", "schedule-management.html", "payroll-attendance.html"];

test("canonical navigation is complete, permission filtered, ordered, and singly active", () => {
  const all = layout.buildNavigation({
    language: "en",
    currentPage: "schedule-management.html",
    hasPermission: () => true
  });
  assert.deepEqual(all.map(item => item.href), layout.NAVIGATION_ITEMS.map(item => item.href));
  assert.equal(all.filter(item => item.active).length, 1);
  assert.equal(all.find(item => item.active).href, "schedule-management.html");

  const allowed = new Set(["access_dashboard", "attendance.view", "payroll_attendance.view"]);
  const filtered = layout.buildNavigation({
    language: "ar",
    currentPage: "attendance.html",
    hasPermission: permission => allowed.has(permission)
  });
  assert.deepEqual(filtered.map(item => item.href), [
    "dashboard.html", "attendance.html", "payroll-attendance.html"
  ]);
  assert.equal(filtered.filter(item => item.active).length, 1);
});

test("cashier and Phase 2-4 pages contain only the shared sidebar shell", () => {
  for (const page of ["cashier.html", ...phasePages]) {
    const html = fs.readFileSync(path.join(root, "public/pages", page), "utf8");
    const sidebar = html.match(/<aside class="[^"]*sidebar[^"]*" id="sidebar"[\s\S]*?<\/aside>/)?.[0] || "";
    assert.ok(sidebar, page);
    assert.doesNotMatch(sidebar, /class="sidebar-link/, page);
    assert.match(sidebar, /id="logoutBtn"/, page);
    assert.match(html, /assets\/js\/utils\/layout\.js/, page);
  }
});

test("all three phase pages use the canonical cashier-compatible shell", () => {
  for (const page of phasePages) {
    const html = fs.readFileSync(path.join(root, "public/pages", page), "utf8");
    assert.match(html, /assets\/css\/shared\.css/, page);
    assert.match(html, /assets\/css\/system-layout\.css/, page);
    assert.match(html, /system-app/, page);
    assert.match(html, /system-header/, page);
    assert.match(html, /system-header-menu/, page);
    assert.match(html, /system-content/, page);
    assert.match(html, /system-sidebar-overlay/, page);
    assert.match(html, /system-sidebar/, page);
  }
});

test("shared shell owns menu placement, overlay animation, scrolling, and responsive behavior", () => {
  const css = fs.readFileSync(path.join(root, "public/assets/css/system-layout.css"), "utf8");
  assert.match(css, /\.system-header-menu[\s\S]*left:\s*24px/);
  assert.match(css, /\.system-sidebar[\s\S]*overflow-y:\s*auto/);
  assert.match(css, /transition:\s*left/);
  assert.match(css, /\.system-sidebar-overlay\.active/);
  assert.match(css, /@media\s*\(max-width:\s*720px\)/);
});

test("existing Attendance, Scheduling, and Settlement feature modules remain wired", () => {
  const expected = {
    "attendance.html": "assets/js/pages/attendance.js",
    "schedule-management.html": "assets/js/pages/schedule-management.js",
    "payroll-attendance.html": "assets/js/pages/payroll-attendance.js"
  };
  for (const [page, script] of Object.entries(expected)) {
    const html = fs.readFileSync(path.join(root, "public/pages", page), "utf8");
    assert.match(html, new RegExp(script.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
