const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "public/pages/booking-availability-admin.html"), "utf8");
const page = fs.readFileSync(path.join(root, "public/assets/js/pages/booking-availability-admin.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "public/assets/css/pages/booking-availability-admin.css"), "utf8");
const gas = fs.readFileSync(path.join(root, "scripts/booking-availability-phase5-gas.js"), "utf8");
const engine = fs.readFileSync(path.join(root, "scripts/booking-availability-phase5.js"), "utf8");
const createOverrideSource = gas.slice(
  gas.indexOf("function bookingAvailabilityPhase5CreateOverride"),
  gas.indexOf("function bookingAvailabilityPhase5RevokeOverride")
);

test("admin UI gates every protected surface and backend remains the security boundary", () => {
  assert.match(page, /requireAuth\("booking_availability\.view"\)/);
  for (const permission of [
    "booking_availability.view_restrictions",
    "booking_availability.manage_override",
    "booking_availability.view_operational",
    "booking_availability.view_audit"
  ]) assert.match(`${html}\n${page}`, new RegExp(permission.replaceAll(".", "\\.")));
  assert.match(gas, /AVAILABILITY_PERMISSION_DENIED/);
  assert.match(gas, /bookingAvailabilityPhase5AssertBranchScope\(actor, branchId\)/);
  assert.match(gas, /Only owner can preview Phase 5 migration/);
  assert.match(gas, /Only owner can preview the detector trigger/);
});

test("branch changes clear stale records and queue the canonical reload", () => {
  assert.match(page, /requestSequence:\s*0,\s*reloadQueued:\s*false/);
  assert.match(page, /sequence !== state\.requestSequence/);
  assert.match(page, /requestedBranchId !== state\.branchId/);
  assert.match(page, /state\.conflicts = \[\];\s*state\.overrides = \[\];\s*state\.audit = \[\]/);
  assert.match(page, /if \(busy\) \{\s*state\.reloadQueued = true/);
  assert.match(page, /if \(state\.reloadQueued\)/);
});

test("server feature flags control override and conflict action states", () => {
  assert.match(html, /id="overrideFeatureState"[^>]*hidden/);
  assert.match(page, /managerOverrideEnabled === true/);
  assert.match(page, /Array\.from\(byId\("overrideForm"\)\.elements\)/);
  assert.match(page, /node\.disabled = !overrideEnabled/);
  assert.match(page, /conflictResolutionEnabled === true && item\.status === "OPEN"/);
  assert.match(page, /managerOverrideEnabled === true && item\.status === "ACTIVE"/);
  assert.match(page, /finally \{[\s\S]*applyFeatureState\(\)/);
});

test("mutations carry canonical branch and server-generated idempotency identities", () => {
  assert.match(page, /createBookingOperationalOverride[\s\S]*branchId: state\.branchId/);
  assert.match(page, /saveBookingBranchHours[\s\S]*branchId: state\.branchId/);
  assert.match(page, /clientRequestId: requestId\("override"\)/);
  assert.match(page, /clientRequestId: requestId\("hours"\)/);
  assert.match(page, /clientRequestId: requestId\("conflict"\)/);
  assert.match(createOverrideSource, /branchId: branchId, staffId: staffId, date: date/);
  assert.doesNotMatch(createOverrideSource, /staffId: record\.staffId/);
});

test("Staging previews are explicit zero-write dry runs and Production stays blocked", () => {
  assert.match(engine, /\["development", "test", "staging"\]/);
  assert.match(engine, /environment, dryRun: true/);
  assert.match(engine, /executionAllowed: false, writes: 0/);
  assert.match(gas, /data\.preview && config\.environment === "production"/);
  assert.match(gas, /environment: identity\.config\.environment, dryRun: true/);
  assert.match(gas, /executionAllowed: false, installed: false, writes: 0, checkpointWrites: 0/);
  assert.doesNotMatch(gas, /ScriptApp\.newTrigger/);
});

test("admin page is Arabic RTL, responsive, and uses safe DOM rendering", () => {
  assert.match(html, /<html lang="ar" dir="rtl">/);
  assert.match(html, /name="viewport" content="width=device-width, initial-scale=1"/);
  assert.match(html, /role="status" aria-live="polite"/);
  assert.match(page, /replaceChildren\(/);
  assert.match(page, /textContent =/);
  assert.doesNotMatch(page, /innerHTML\s*=/);
  assert.match(styles, /\.grid\s*>\s*\.panel\s*\{\s*min-width:\s*0/);
  assert.match(styles, /@media\s*\(max-width:760px\)[\s\S]*?\.grid\s*\{\s*grid-template-columns:\s*minmax\(0,1fr\)/);
});
