const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const validator = require("../scripts/validate-apps-script-deployment-package");
const builder = require("../scripts/build-booking-availability-phase5-bundle");

const root = path.resolve(__dirname, "..");
const config = JSON.parse(fs.readFileSync(
  path.join(root, "config/apps-script-deployment-package.json"), "utf8"));

test("the intended two-file Apps Script package has no duplicate globals or routers", () => {
  const result = validator.validatePackage();
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.deepEqual(config.filesInReviewOrder, [
    "scripts/app-script-final-owner-access.js",
    "scripts/booking-availability-phase5-apps-script-bundle.gs"
  ]);
});

test("the aggregate bundle is current and preserves the authoritative source order", () => {
  const stored = fs.readFileSync(path.join(root, config.aggregateBundle), "utf8");
  const generated = builder.buildBundle({ write: false });
  assert.equal(stored, generated.bundle);
  assert.deepEqual(generated.sourceOrder, builder.SOURCE_ORDER);
  let previous = -1;
  for (const source of builder.SOURCE_ORDER) {
    const index = stored.indexOf(`/* BEGIN ${source} */`);
    assert.ok(index > previous, `${source} must follow its declared predecessor`);
    previous = index;
  }
});

test("every constituent and earlier phase bundle is excluded when aggregate Phase 5 is used", () => {
  const excluded = new Set(config.excludedOverlappingSources);
  for (const source of builder.SOURCE_ORDER) assert.ok(excluded.has(`scripts/${source}`));
  for (const earlierBundle of [
    "scripts/staff-scheduling-phase2-apps-script-bundle.gs",
    "scripts/staff-attendance-phase3-apps-script-bundle.gs",
    "scripts/staff-payroll-attendance-phase4-apps-script-bundle.gs"
  ]) assert.ok(excluded.has(earlierBundle));
  assert.equal(config.filesInReviewOrder.some(file => excluded.has(file)), false);
});

test("validator rejects duplicate functions, constants, public handlers, and routers", () => {
  const errors = validator.validateSources([
    { path: "router-a.js", source: "function doPost() {}\nconst SHARED = 1;\nfunction publicAction() {}" },
    { path: "router-b.js", source: "function doPost() {}\nconst SHARED = 2;\nfunction publicAction() {}" }
  ], { router: "router-a.js" });
  const codes = new Set(errors.map(error => error.code));
  assert.ok(codes.has("DEPLOYMENT_FUNCTION_DUPLICATE"));
  assert.ok(codes.has("DEPLOYMENT_GLOBAL_CONFLICT"));
  assert.ok(codes.has("DEPLOYMENT_ROUTER_CONFLICT"));
});

test("migration preview remains exposed while migration execution is absent from Phase 5", () => {
  const bundle = builder.buildBundle({ write: false }).bundle;
  assert.match(bundle, /function bookingAvailabilityPhase5PreviewMigration\s*\(/);
  assert.match(bundle, /executionAllowed:\s*false/);
  assert.doesNotMatch(bundle, /function (?:execute|run)BookingAvailabilityMigration\s*\(/);
});

test("router keeps legacy and V2 booking paths while Phase 5 handlers resolve once", () => {
  const router = fs.readFileSync(path.join(root, config.router), "utf8");
  const bundle = builder.buildBundle({ write: false }).bundle;
  assert.match(router, /createBookingV2/);
  assert.match(router, /getAllBookingsV2/);
  assert.match(router, /createBooking/);
  for (const name of [
    "handleBookingAvailabilityPhase5Action",
    "runBookingNoCheckInDetector",
    "previewBookingNoCheckInTriggerInstallation"
  ]) {
    assert.equal((bundle.match(new RegExp(`function\\s+${name}\\s*\\(`, "g")) || []).length, 1);
  }
});

test("aggregate exposes the reviewed Staging migration controls exactly once", () => {
  const bundle = builder.buildBundle({ write: false }).bundle;
  for (const name of [
    "prepareStaffScheduleMigrationExecution", "prepareAttendanceMigrationExecution",
    "preparePayrollPhase4MigrationExecution", "executeStaffScheduleMigrationStaging",
    "executeAttendanceMigrationStaging", "executePayrollPhase4MigrationStaging",
    "executePreparedStaffScheduleMigrationStaging", "executePreparedAttendanceMigrationStaging",
    "executePreparedPayrollPhase4MigrationStaging", "diagnosticMigrationExecutionStatus",
    "diagnosticMigrationRecoveryStatus"
  ]) {
    assert.equal((bundle.match(new RegExp(`function\\s+${name}\\s*\\(`, "g")) || []).length, 1, name);
  }
});

test("aggregate exposes isolated Branch Foundation controls exactly once", () => {
  const bundle = builder.buildBundle({ write: false }).bundle;
  for (const name of [
    "previewBranchFoundationMigration", "prepareBranchFoundationMigration",
    "diagnosticPreviewBranchFoundationMigration",
    "executeBranchFoundationMigrationStaging",
    "executePreparedBranchFoundationMigrationStaging",
    "previewBranchConfigurationStaging"
  ]) {
    assert.equal((bundle.match(new RegExp(`function\\s+${name}\\s*\\(`, "g")) || []).length, 1, name);
  }
  assert.match(bundle, /migrationId:\s*"BRANCH_FOUNDATION_V1"/);
});

test("aggregate exposes canonical branch-row controls exactly once without direct execution", () => {
  const bundle = builder.buildBundle({ write: false }).bundle;
  for (const name of [
    "previewCanonicalBranchRegistryRow", "diagnosticPreviewCanonicalBranchRegistryRow",
    "prepareCanonicalBranchRegistryRow", "executePreparedCanonicalBranchRegistryRowStaging"
  ]) {
    assert.equal((bundle.match(new RegExp(`function\\s+${name}\\s*\\(`, "g")) || []).length, 1, name);
  }
  assert.match(bundle, /function\s+previewCanonicalBranchRegistryRow\s*\(\)\s*\{/);
  assert.match(bundle, /function\s+diagnosticPreviewCanonicalBranchRegistryRow\s*\(\)\s*\{/);
  assert.match(bundle, /function\s+prepareCanonicalBranchRegistryRow\s*\(\)\s*\{/);
  assert.match(bundle, /function\s+executePreparedCanonicalBranchRegistryRowStaging\s*\(\)\s*\{/);
  assert.match(bundle, /function\s+prepareCanonicalBranchRegistryRow\s*\(\)[\s\S]*?Utilities\.getUuid\(\)/);
  assert.doesNotMatch(bundle, /function\s+executeCanonicalBranchRegistryRowStaging\s*\(/);
});

test("aggregate exposes Core Authentication bootstrap controls exactly once", () => {
  const bundle = builder.buildBundle({ write: false }).bundle;
  for (const name of [
    "previewCoreStagingBootstrap", "prepareCoreStagingBootstrap",
    "executeCoreStagingBootstrap", "executePreparedCoreStagingBootstrap",
    "diagnosticCoreStagingBootstrapStatus", "diagnosticCoreStagingBootstrapRecovery",
    "previewStagingAuthenticationInitialization", "diagnosticPreviewStagingAuthenticationInitialization",
    "diagnosticPreviewCoreStagingBootstrap",
    "openCoreStagingBootstrapCredentialDialog", "stageCoreStagingBootstrapCredential"
  ]) {
    assert.equal((bundle.match(new RegExp(`function\\s+${name}\\s*\\(`, "g")) || []).length, 1, name);
  }
});

test("authentication initialization diagnostic is a top-level Staging wrapper", () => {
  const bundle = builder.buildBundle({ write: false }).bundle;
  assert.match(bundle, /^function diagnosticPreviewStagingAuthenticationInitialization\s*\(\)\s*\{/m);
  assert.match(bundle, /function diagnosticPreviewStagingAuthenticationInitialization\s*\(\)[\s\S]*?coreStagingBootstrapIdentityAndOwner\(\);[\s\S]*?previewStagingAuthenticationInitialization\(\);[\s\S]*?console\.log\(JSON\.stringify\(result, null, 2\)\);[\s\S]*?return result;/);
});

test("Core bootstrap preview diagnostic is a top-level Staging wrapper", () => {
  const bundle = builder.buildBundle({ write: false }).bundle;
  assert.match(bundle, /^function diagnosticPreviewCoreStagingBootstrap\s*\(\)\s*\{/m);
  assert.match(bundle, /function diagnosticPreviewCoreStagingBootstrap\s*\(\)[\s\S]*?coreStagingBootstrapIdentityAndOwner\(\);[\s\S]*?previewCoreStagingBootstrap\(\);[\s\S]*?console\.log\(JSON\.stringify\(result, null, 2\)\);[\s\S]*?return result;/);
});
