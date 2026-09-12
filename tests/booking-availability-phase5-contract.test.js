const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const phase5 = require("../scripts/booking-availability-phase5");
const builder = require("../scripts/build-booking-availability-phase5-bundle");

const ROOT = path.resolve(__dirname, "..");
const backendPath = path.join(ROOT, "scripts", "app-script-final-owner-access.js");
const backend = fs.readFileSync(backendPath, "utf8");
const gas = fs.readFileSync(path.join(ROOT, "scripts", "booking-availability-phase5-gas.js"), "utf8");
const customer = fs.readFileSync(path.join(ROOT, "public/assets/js/pages/customer-booking.js"), "utf8");
const internal = fs.readFileSync(path.join(ROOT, "public/assets/js/pages/bookings.js"), "utf8");

function backendContext() {
  const context = {
    console, Date, JSON, Number, String, Set, Map, Math,
    Utilities: {
      formatDate: (_date, _zone, format) => format === "yyyy-MM-dd" ? "2099-01-01" :
        format === "HH:mm" ? "10:00" : format === "EEEE" ? "Wednesday" : "2099-01-01 10:00:00"
    },
    Logger: { log: () => {} }
  };
  vm.createContext(context);
  vm.runInContext(backend, context, { filename: backendPath });
  context.BookingAvailabilityPhase5 = phase5;
  return context;
}

test("generated Apps Script bundle is deterministic and includes Phase 5 last", () => {
  const generated = builder.buildBundle({ write: false });
  const committed = fs.readFileSync(generated.outputPath, "utf8");
  assert.equal(committed, generated.bundle);
  assert.deepEqual(generated.sourceOrder.slice(-4), [
    "booking-availability-phase5.js", "branch-foundation-staging.js",
    "branch-registry-row-staging.js",
    "booking-availability-phase5-gas.js"
  ]);
  assert.deepEqual(generated.sourceOrder.slice(-8, -4), [
    "staff-payroll-attendance-phase4.js", "staff-payroll-attendance-phase4-gas.js",
    "staff-schema-migration-staging-executor.js", "core-staging-auth-bootstrap.js"
  ]);
  assert.doesNotThrow(() => new Function(committed));
});

test("legacy Attendance reads are isolated inside explicitly legacy Booking functions", () => {
  const directCalls = [...backend.matchAll(/getAttendanceOverride\s*\(/g)].map(match => match.index);
  assert.equal(directCalls.length, 3);
  const legacyValidatorStart = backend.indexOf("function validateBookingAppointmentLegacyV2");
  const selectorStart = backend.indexOf("function bookingAvailabilityEngineMode");
  const legacySlotsStart = backend.indexOf("function availableSlotsForBarberLegacy");
  const activeSlotsStart = backend.indexOf("function availableSlotsForBarber(", legacySlotsStart);
  assert.ok(directCalls[1] > legacyValidatorStart && directCalls[1] < selectorStart);
  assert.ok(directCalls[2] > legacySlotsStart && directCalls[2] < activeSlotsStart);
  assert.match(backend, /function validateBookingAppointmentV2\(options\)\s*\{\s*return runBookingAvailabilityAuthority/);
  assert.match(backend, /function availableSlotsForBarber\([^)]*\)\s*\{[\s\S]*runBookingAvailabilityAuthority/);
});

test("PHASE5 slot generation never invokes the legacy Attendance callback", () => {
  const context = backendContext();
  let phase5Calls = 0;
  context.bookingAvailabilityPhase5Flags = () => ({ engine: "PHASE5" });
  context.getAttendanceOverride = () => { throw new Error("legacy Attendance must not run"); };
  context.bookingAvailabilityPhase5Evaluate = () => {
    phase5Calls += 1;
    return {
      slots: [{ start: "12:00" }], availability: "AVAILABLE",
      reasonCode: "UNRESOLVED_ATTENDANCE", availabilityToken: "phase5-token",
      generatedAt: "now", versions: { attendanceOperationalVersion: 4 }
    };
  };
  const result = context.availableSlotsForBarber(
    { staffId: "STAFF-1", branchId: "BR-1", name: "Sam" },
    "2099-01-02", 30, [], [], { branchId: "BR-1" });
  assert.deepEqual(Array.from(result.slots), ["12:00"]);
  assert.equal(phase5Calls, 1);
  assert.equal(result.reasonCode, "OPERATIONALLY_UNAVAILABLE");
  assert.equal(Object.hasOwn(result, "versions"), false);
});

test("PHASE5 final validation never invokes the legacy validator and fails closed", () => {
  const context = backendContext();
  context.bookingAvailabilityPhase5Flags = () => ({ engine: "PHASE5" });
  context.resolveBookingBarberV2 = () => ({ staffId: "STAFF-1", branchId: "BR-1", name: "Sam" });
  context.validateBookingAppointmentLegacyV2 = () => { throw new Error("legacy validator must not run"); };
  context.bookingAvailabilityPhase5ValidateAppointment = () => ({
    ok: true, barber: { staffId: "STAFF-1", name: "Sam" },
    date: "2099-01-02", time: "12:00", durationMinutes: 30
  });
  assert.equal(context.validateBookingAppointmentV2({
    employeeId: "STAFF-1", date: "2099-01-02", time: "12:00", durationMinutes: 30
  }).ok, true);
  context.bookingAvailabilityPhase5ValidateAppointment = () => {
    throw Object.assign(new Error("schema missing"), { code: "AVAILABILITY_SCHEMA_NOT_READY" });
  };
  assert.throws(() => context.validateBookingAppointmentV2({
    employeeId: "STAFF-1", date: "2099-01-02", time: "12:00", durationMinutes: 30
  }), /schema missing/);
});

test("final Booking error wrapper preserves stable Phase 5 code and recovery details", () => {
  const context = backendContext();
  context.jsonOutput = value => value;
  const response = context.bookingErrorResponse(Object.assign(
    new Error("recovery required"), {
      code: "AVAILABILITY_RECOVERY_REQUIRED",
      details: { transactionId: "BAT-1", recoveryRequired: true }
    }), "BOOKING_INTERNAL_ERROR");
  assert.equal(response.code, "AVAILABILITY_RECOVERY_REQUIRED");
  assert.equal(response.details.transactionId, "BAT-1");
});

test("public wrappers preserve stable codes without exposing recovery internals", () => {
  const context = backendContext();
  context.jsonOutput = value => value;
  const response = context.bookingPublicErrorResponse(Object.assign(
    new Error("recovery required"), {
      code: "AVAILABILITY_RECOVERY_REQUIRED",
      details: { transactionId: "BAT-PRIVATE", recoveryRequired: true }
    }), "BOOKING_PUBLIC_ERROR");
  assert.equal(response.code, "AVAILABILITY_RECOVERY_REQUIRED");
  assert.equal(Object.hasOwn(response, "details"), false);
  assert.doesNotMatch(JSON.stringify(response), /BAT-PRIVATE|transactionId/);
});

test("nominal Booking reads never expire holds or invoke mutation helpers", () => {
  for (const [name, next] of [
    ["function getPublicBookingStatus", "function respondToBookingProposal"],
    ["function getBookingsV2", "function updateBookingV2"]
  ]) {
    const start = backend.indexOf(name);
    const end = backend.indexOf(next, start + name.length);
    const source = backend.slice(start, end);
    assert.doesNotMatch(source, /expirePendingBookings|writeBookingRowV2|appendBookingRowV2|setValues|appendRow/);
  }
  assert.match(backend, /status:\s*bookingEffectiveStatusV2\(booking\)/);
});

test("public options force public audience and explicit branch filtering", () => {
  const start = backend.indexOf("function getPublicBookingOptions");
  const end = backend.indexOf("function normalizePublicPhone", start);
  const source = backend.slice(start, end);
  assert.match(source, /audience:\s*"public"/);
  assert.match(source, /barber\.branchId === selectedBranchId/);
  assert.match(source, /bookingAvailabilityPhase5Branch\(/);
  assert.doesNotMatch(source, /audience:\s*data\.audience/);
});

test("active dispatcher exposes preview and permissioned conflict/override actions", () => {
  for (const action of [
    "previewBookingAvailabilityMigration", "getBookingAvailabilityFlags",
    "createBookingOperationalOverride", "revokeBookingOperationalOverride",
    "listBookingAvailabilityConflicts", "listBookingAvailabilityAudit",
    "transitionBookingAvailabilityConflict", "listPublicBookingBranches",
    "listBookingBranches", "saveBookingBranchHours",
    "saveBookingBranchConfiguration",
    "recoverBookingAvailabilityTransaction",
    "listBookingOperationalOverrides", "runBookingNoCheckInDetector",
    "previewBookingNoCheckInTriggerInstallation"
  ]) assert.ok(backend.includes(`"${action}"`));
  assert.match(gas, /booking_availability\.manage_override/);
  assert.match(gas, /booking_availability\.resolve_conflict/);
  assert.match(gas, /booking_availability\.view_audit/);
  assert.match(gas, /bookingAvailabilityPhase5AssertBranchScope/);
});

test("transaction, hybrid generation, branch registry, snapshots and error propagation are wired", () => {
  assert.match(gas, /function bookingAvailabilityPhase5RunTransaction/);
  assert.match(gas, /BOOKING_AVAILABILITY_TRANSACTIONS/);
  assert.match(gas, /bookingAvailabilityPhase5FailurePoint\(data, "AUDIT"\)/);
  assert.match(gas, /bookingAvailabilityPhase5IncrementGeneration/);
  assert.match(gas, /BOOKING_BRANCH_REGISTRY/);
  assert.match(gas, /AVAILABILITY_FOUR_EYES_REQUIRED/);
  assert.match(backend, /function commitBookingPhase5UnderCurrentLock/);
  assert.match(backend, /PREPARATION_MINUTES_SNAPSHOT/);
  assert.match(backend, /function bookingErrorResponse/);
  assert.doesNotMatch(gas, /ScriptApp\.newTrigger|create\(\)/);
});

test("Arabic RTL administration uses safe record DOM APIs and exposes all reviewed controls", () => {
  const html = fs.readFileSync(path.join(ROOT,
    "public/pages/booking-availability-admin.html"), "utf8");
  const script = fs.readFileSync(path.join(ROOT,
    "public/assets/js/pages/booking-availability-admin.js"), "utf8");
  assert.match(html, /<html lang="ar" dir="rtl">/);
  for (const id of [
    "conflicts", "overrideForm", "hoursForm", "branchForm", "audit",
    "migrationPreviewBtn", "triggerPreviewBtn", "engineSummary", "featureFlags",
    "engineBadge", "hoursRows", "newBranchBtn"
  ]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(script, /replaceChildren/);
  assert.match(script, /textContent/);
  assert.doesNotMatch(script, /\.innerHTML\s*=/);
  assert.match(script, /if \(busy\) return/);
  assert.match(script, /AVAILABILITY|FOUR_EYES|STALE/);
  assert.match(script, /getBookingAvailabilityFlags/);
  assert.match(script, /const user = RomeoAuth\.requireAuth\("booking_availability\.view"\);\s*if \(!user\) return;/);
  assert.match(script, /populateBranchForm/);
  assert.match(script, /populateHoursForm/);
  assert.match(script, /branch\.active !== false/);
  assert.match(script, /validateHoursRange/);
  assert.match(script, /غير متاح من الاستجابة/);
  assert.match(gas, /function bookingAvailabilityPhase5ListBranchHours/);
  assert.match(gas, /cacheStatus/);
  assert.match(gas, /AVAILABILITY_BRANCH_HOURS_EFFECTIVE_RANGE_INVALID/);
});

test("public Booking flow requires an explicit canonical branch selector", () => {
  const html = fs.readFileSync(path.join(ROOT, "public/pages/customer-booking.html"), "utf8");
  assert.match(html, /id="publicBranch" required/);
  assert.match(customer, /action:\s*"listPublicBookingBranches"/);
  assert.match(customer, /branchId:\s*elements\.branch\.value/);
});

test("nominal Service read no longer generates IDs or writes sheet rows", () => {
  const start = backend.indexOf("function getServices()");
  const end = backend.indexOf("function saveServices(", start);
  const source = backend.slice(start, end);
  assert.doesNotMatch(source, /getUuid|setValues|appendRow|batchUpdate/);
  assert.match(source, /serviceId:\s*String\(row\[4\]/);
});

test("public and internal polling use tokens, visibility pause, focus refresh, and backoff", () => {
  assert.match(customer, /availabilityPollDelay:\s*30000/);
  assert.match(customer, /ifNoneMatch:\s*silent\s*\?\s*state\.availabilityToken/);
  assert.match(customer, /document\.hidden/);
  assert.match(customer, /window\.addEventListener\("focus"/);
  assert.match(customer, /Math\.min\(300000/);
  assert.match(customer, /result\.delta === true/);
  assert.match(customer, /result\.removedStaffIds/);
  assert.match(internal, /availabilityPollDelay:\s*10000/);
  assert.match(internal, /audience:\s*"internal"/);
  assert.match(internal, /document\.hidden/);
  assert.match(internal, /window\.addEventListener\("focus"/);
  assert.match(internal, /Math\.min\(120000/);
  assert.match(internal, /response\.delta === true/);
  assert.match(internal, /response\.removedStaffIds/);
});

test("availability permissions are separate from Attendance and Payroll permissions", () => {
  for (const permission of phase5.PERMISSIONS) assert.ok(backend.includes(`"${permission}"`));
  assert.equal(phase5.PERMISSIONS.some(value =>
    value.startsWith("attendance.") || value.startsWith("payroll_")), false);
});

test("migration adapter is preview-only and contains no schema creation operation", () => {
  assert.match(gas, /previewBookingAvailabilityMigration/);
  assert.doesNotMatch(gas, /insertSheet|insertColumnsAfter|deleteSheet|deleteRow/);
  assert.match(gas, /Phase 5 preview cannot access production/);
});

test("Booking, Scheduling, and Attendance mutations publish version invalidation hooks", () => {
  const scheduling = fs.readFileSync(
    path.join(ROOT, "scripts/staff-scheduling-phase2-gas.js"), "utf8");
  const attendance = fs.readFileSync(
    path.join(ROOT, "scripts/staff-attendance-phase3-gas.js"), "utf8");
  assert.match(backend, /bookingAvailabilityPhase5AfterBookingMutationUnderLock/);
  assert.match(scheduling, /publishOperationalMutationUnderCurrentLock\("schedule"/);
  assert.match(attendance, /publishOperationalMutationUnderCurrentLock\("attendance"/);
});
