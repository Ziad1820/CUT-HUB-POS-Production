"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const js = fs.readFileSync(path.join(
  __dirname, "../public/assets/js/pages/attendance.js"), "utf8");
const html = fs.readFileSync(path.join(
  __dirname, "../public/pages/attendance.html"), "utf8");

test("employee filtering preserves the complete selector for direct switching", () => {
  assert.match(js, /if \(!currentStaff\) \{[\s\S]*?staffSelect\.replaceChildren/);
  assert.match(js, /staffSelect\.value = currentStaff && \[\.\.\.staffSelect\.options\]\.some/);
});

test("changing branch clears stale employee identity before reloading", () => {
  assert.match(js, /byId\("branchFilter"\)\.addEventListener\("change", \(\) => \{[\s\S]*?byId\("staffFilter"\)\.value = "";[\s\S]*?loadDashboard\(\);/);
});

test("Attendance page cache-busts the corrected selector behavior", () => {
  assert.match(html, /attendance\.js\?v=20260811-1/);
});

test("Attendance renders server-derived fractional durations as whole minutes", () => {
  assert.match(js, /Number\.isFinite\(numeric\) \? Math\.round\(numeric\) : 0/);
});
