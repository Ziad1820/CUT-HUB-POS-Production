"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const jsPath = path.join(__dirname, "../public/assets/js/pages/schedule-management.js");
const js = fs.readFileSync(jsPath, "utf8");
const html = fs.readFileSync(path.join(
  __dirname, "../public/pages/schedule-management.html"), "utf8");
const css = fs.readFileSync(path.join(
  __dirname, "../public/assets/css/pages/schedule-management.css"), "utf8");

function loadClassifier() {
  const context = {
    Date, JSON, Object, Array, String, Number, Boolean, Math, Error, URLSearchParams,
    window: { crypto: {} },
    document: {
      addEventListener() {},
      getElementById() { return null; },
      querySelectorAll() { return []; }
    },
    RomeoApi: { request() { throw new Error("not invoked"); } },
    RomeoAuth: { requireAuth() { return null; } }
  };
  vm.createContext(context);
  vm.runInContext(js, context, { filename: "schedule-management.js" });
  return error => JSON.parse(JSON.stringify(
    context.classifyScheduleManagementLoadError(error)
  ));
}

test("all three STAFF schema failures receive the dedicated schema classification", () => {
  const classify = loadClassifier();
  const cases = [
    { code: "SCHEDULE_SCHEMA_NOT_READY", details: { sheetName: "STAFF" } },
    { code: "INCOMPATIBLE_STAFF_POSITIONAL_PREFIX" },
    { code: "SCHEDULE_SCHEMA_DUPLICATE_HEADERS", details: { sheetName: "STAFF" } }
  ];
  cases.forEach(error => assert.deepEqual(classify(error), {
    kind: "STAFF_SCHEMA", code: error.code
  }));
});

test("network, authentication, generic, and non-STAFF schema failures remain API failures", () => {
  const classify = loadClassifier();
  [
    { code: "SCHEDULE_NETWORK_ERROR" },
    { code: "PERMISSION_DENIED" },
    { code: "REQUEST_FAILED" },
    { code: "SCHEDULE_SCHEMA_DUPLICATE_HEADERS", details: { sheetName: "BARBER_SCHEDULE" } }
  ].forEach(error => assert.equal(classify(error).kind, "API_FAILURE"));
});

test("load failure clears the misleading empty-roster message for API failures", () => {
  assert.match(js, /classification\.kind === "STAFF_SCHEMA"/);
  assert.match(js, /else\s*\{\s*showStaffEmptyState\(""\);\s*\}/);
  assert.match(js, /!state\.staff\.length[\s\S]*?لا توجد بيانات موظفين متاحة/);
});

test("valid employee-empty and valid schedule-empty states remain separate", () => {
  assert.match(js, /const emptyMessage = !state\.staff\.length/);
  assert.match(js, /if \(!staff\) \{[\s\S]*?renderWeekly\(\); renderOverrides\(\);/);
  assert.match(js, /join\("، "\) \|\| "غير مجدول"/);
});

test("refresh reloads page data before the selected employee schedule and reports failure", () => {
  const handler = js.match(/byId\("refreshBtn"\)\.addEventListener\("click", async \(\) => \{([\s\S]*?)\n\s*\}\);/);
  assert.ok(handler);
  assert.ok(handler[1].indexOf("await loadPageData();") < handler[1].indexOf("await loadSelected();"));
  assert.match(handler[1], /setStatus\(`\$\{error\.code\}: \$\{error\.message\}`/);
});

test("page-data refresh preserves a still-valid branch filter", () => {
  assert.match(js, /const previousBranch = branch\.value;/);
  assert.match(js, /const branchIds = result\.branches \|\| \[\];/);
  assert.match(js, /branch\.value = branchIds\.includes\(previousBranch\) \? previousBranch : "";/);
});

test("selected schedule loads are latest-wins and policy loading survives range failure", () => {
  assert.match(js, /selectedRequestSequence:\s*0, policyRequestSequence:\s*0/);
  const selected = js.match(/async function loadSelected\(\) \{([\s\S]*?)\n  \}/);
  assert.ok(selected);
  assert.match(selected[1], /const sequence = \+\+state\.selectedRequestSequence;/);
  assert.match(selected[1], /const policyLoad = loadWorkPolicies\(staff\.staffId\);/);
  assert.match(selected[1], /sequence !== state\.selectedRequestSequence/);
  assert.match(selected[1], /selectedStaff\(\)\?\.staffId !== staff\.staffId/);
  assert.match(selected[1], /finally \{[\s\S]*?await policyLoad;/);
  assert.ok(selected[1].indexOf("const policyLoad") < selected[1].indexOf("await Promise.all"));
});

test("Work Policy reads cannot overwrite a newer employee selection", () => {
  const policies = js.match(/async function loadWorkPolicies\(expectedStaffId\) \{([\s\S]*?)\n  \}/);
  assert.ok(policies);
  assert.match(policies[1], /const sequence = \+\+state\.policyRequestSequence;/);
  assert.match(policies[1], /expectedStaffId && staff\?\.staffId !== expectedStaffId/);
  assert.match(policies[1], /sequence !== state\.policyRequestSequence/);
  assert.match(policies[1], /selectedStaff\(\)\?\.staffId !== staff\.staffId/);
});

test("RTL header keeps the menu group first at the far-left layout edge", () => {
  const header = html.match(/<header class="schedule-header system-header">([\s\S]*?)<\/header>/);
  assert.ok(header);
  assert.ok(header[1].indexOf('class="system-header-menu"') <
    header[1].indexOf('class="header-copy"'));
  assert.match(css, /\.schedule-header\{direction:ltr\}/);
  assert.match(css, /\.schedule-header>\.header-copy\{direction:rtl/);
  assert.match(css, /@media\(max-width:850px\)[\s\S]*?grid-template-columns:48px minmax\(0,1fr\)/);
});

test("narrow filters use zero-minimum tracks and bounded controls", () => {
  assert.match(css, /\.schedule-app \.panel\{min-width:0\}/);
  assert.match(css, /\.filters>label,\.filters input,\.filters select\{min-width:0;max-width:100%\}/);
  assert.match(css, /@media\(max-width:850px\)[\s\S]*?\.filters\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
  assert.match(css, /@media\(max-width:520px\)\{\.filters\{grid-template-columns:minmax\(0,1fr\)\}/);
});
