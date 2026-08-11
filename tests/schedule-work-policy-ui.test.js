"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const js = fs.readFileSync(path.join(
  __dirname, "../public/assets/js/pages/schedule-management.js"), "utf8");
const html = fs.readFileSync(path.join(
  __dirname, "../public/pages/schedule-management.html"), "utf8");
const css = fs.readFileSync(path.join(
  __dirname, "../public/assets/css/pages/schedule-management.css"), "utf8");

function loadPureHelpers() {
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
  return context;
}

test("Work Policy controls are owner-only in markup and permission logic", () => {
  const context = loadPureHelpers();
  assert.equal(context.shouldShowWorkPolicyUi({ owner: true }), true);
  assert.equal(context.shouldShowWorkPolicyUi({ owner: false, manage: true }), false);
  assert.match(html, /id="workPolicyPanel"[^>]*class="panel owner-only"|class="panel owner-only"[^>]*id="workPolicyPanel"/);
  assert.match(js, /workPolicyPanel"\)\.hidden = !shouldShowWorkPolicyUi\(state\.permissions\)/);
});

test("create form builds the exact canonical clone payload", () => {
  const context = loadPureHelpers();
  const payload = JSON.parse(JSON.stringify(context.buildWorkPolicyCreatePayload({
    staffId: " 1784232573966 ",
    sourcePolicyId: " POL-STAGING-PAYROLL-OSAMA-20260809 ",
    effectiveFrom: "2026-08-10", effectiveTo: "2026-08-10",
    requiredWorkMinutes: "60", allowedBreakMinutes: "0",
    salaryBasis: "monthly", currency: "egp", reason: " controlled test "
  }, "REQ-ONE")));
  assert.deepEqual(payload, {
    action: "createWorkPolicy", requestId: "REQ-ONE", reason: "controlled test",
    sourcePolicyId: "POL-STAGING-PAYROLL-OSAMA-20260809",
    staffId: "1784232573966", effectiveFrom: "2026-08-10",
    effectiveTo: "2026-08-10", requiredWorkMinutes: 60,
    allowedBreakMinutes: 0, salaryBasis: "MONTHLY", currency: "EGP"
  });
});

test("canonical clone payload validates every client-owned override before submit", () => {
  const context = loadPureHelpers();
  const base = {
    staffId: "1784232573966", sourcePolicyId: "POL-STAGING-PAYROLL-OSAMA-20260809",
    effectiveFrom: "2026-08-10", effectiveTo: "2026-08-10",
    requiredWorkMinutes: "60", allowedBreakMinutes: "0",
    salaryBasis: "MONTHLY", currency: "EGP", reason: "controlled test"
  };
  assert.throws(() => context.buildWorkPolicyCreatePayload(
    { ...base, sourcePolicyId: "" }, "REQ-MISSING"), /sourcePolicyId/);
  assert.throws(() => context.buildWorkPolicyCreatePayload(
    { ...base, requiredWorkMinutes: undefined }, "REQ-MINUTES"), /minutes/);
  const payload = context.buildWorkPolicyCreatePayload(base, "REQ-VALID");
  assert.equal(payload.sourcePolicyId, "POL-STAGING-PAYROLL-OSAMA-20260809");
  assert.equal(Object.values(payload).some(value => value === undefined), false);
});

test("canonical backend clone hydrates omitted blank JSON fields from the stored source", () => {
  const mapper = fs.readFileSync(path.join(
    __dirname, "../scripts/staff-scheduling-phase2-gas.js"), "utf8");
  assert.match(mapper, /name === "STAFF_WORK_POLICIES"[\s\S]*?record\[canonicalJsonKey\] = canonicalJsonValue/);
  const backend = fs.readFileSync(path.join(
    __dirname, "../scripts/staff-attendance-phase3.js"), "utf8");
  assert.match(backend, /normalizeCompleteWorkPolicy\(copied, \{ trustedStoredSource: true \}\)/);
  assert.doesNotMatch(backend, /storedValue === undefined \? "" : storedValue/);
});

test("deactivation payload requires stable identity, reason, and request ID", () => {
  const context = loadPureHelpers();
  const payload = JSON.parse(JSON.stringify(context.buildWorkPolicyDeactivatePayload(
    " POL-1 ", " cleanup reason ", "REQ-DEACTIVATE")));
  assert.deepEqual(payload, {
    action: "deactivateWorkPolicy", requestId: "REQ-DEACTIVATE",
    policyId: "POL-1", reason: "cleanup reason"
  });
  assert.match(js, /requestDecision\(\{[\s\S]*?تعطيل سياسة العمل[\s\S]*?danger: true/);
});

test("single-flight creation prevents duplicate submission and refreshes after success", () => {
  const body = js.match(/async function createWorkPolicyFromForm\(\) \{([\s\S]*?)\n  \}/);
  assert.ok(body);
  assert.match(body[1], /if \(state\.policyBusy\) return;/);
  assert.ok(body[1].indexOf("state.policyBusy = true") < body[1].indexOf("await api(payload.action, payload)"));
  assert.ok(body[1].indexOf("button.disabled = true") < body[1].indexOf("await api(payload.action, payload)"));
  assert.ok(body[1].indexOf("await loadWorkPolicies()") > body[1].indexOf("await api(payload.action, payload)"));
  assert.match(body[1], /finally \{[\s\S]*?state\.policyBusy = false;[\s\S]*?button\.disabled = false;/);
});

test("policy UI uses only RomeoApi, safe DOM, visible errors, and post-create audit verification", () => {
  assert.match(js, /result = await RomeoApi\.request\(\{ action, \.\.\.\(payload \|\| \{\}\) \}\)/);
  assert.doesNotMatch(js, /fetch\(|innerHTML|insertAdjacentHTML/);
  assert.match(js, /setWorkPolicyStatus\(message, "error"\)/);
  assert.match(js, /api\("getAttendanceAuditHistory"/);
  assert.match(js, /lastCreateAuditCount/);
  assert.match(html, /role="status" aria-live="polite"/);
});

test("RTL mobile layout contains policy inputs and permits horizontal table containment", () => {
  assert.match(html, /<html lang="ar" dir="rtl">/);
  assert.match(css, /\.work-policy-table\{min-width:860px\}/);
  assert.match(css, /@media\(max-width:520px\)[^{]*\{[^}]*\.work-policy-form-grid\{grid-template-columns:minmax\(0,1fr\)\}/);
  assert.match(css, /\.work-policy-form-grid>\*\{min-width:0\}/);
  assert.match(html, /class="table-scroll"[\s\S]*?class="work-policy-table"/);
});
