const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const phase5 = require("../scripts/booking-availability-phase5");

const gasPath = path.resolve(__dirname, "../scripts/booking-availability-phase5-gas.js");
const gasSource = fs.readFileSync(gasPath, "utf8");

function camel(header) {
  return header.toLowerCase().replace(/_([a-z])/g, (_all, letter) => letter.toUpperCase());
}

function createHarness(options = {}) {
  const rows = {};
  Object.keys(phase5.SHEET_SCHEMAS).forEach(name => { rows[name] = []; });
  Object.assign(rows, {
    Bookings: [], STAFF: [], ATTENDANCE_EVENTS: [], STAFF_ATTENDANCE_DAYS: [],
    BARBER_SCHEDULE: [], STAFF_SCHEDULE_OVERRIDES: [], STAFF_WORK_POLICIES: []
  });
  const writes = [];
  const control = {
    environment: options.environment || "test",
    detectorEnabled: options.detectorEnabled !== false,
    authenticated: options.authenticated !== false,
    expectedTriggerEmail: options.expectedTriggerEmail || "owner@example.com",
    effectiveTriggerEmail: options.effectiveTriggerEmail || "owner@example.com",
    failedScheduleStaff: new Set(), invalidZones: new Set(),
    inactiveScheduleStaff: new Set(), onLock: null, uuid: 0, lockCalls: 0,
    failConflictAuditBookingId: ""
  };
  const actor = {
    actorId: "owner-1", role: "OWNER", owner: true,
    permissions: phase5.PERMISSIONS, branchIds: []
  };
  const context = {
    console, Date, JSON, Number, String, Math, Object, Array,
    BookingAvailabilityPhase5: phase5,
    StaffAttendancePhase3: {
      buildEventState: events => ({
        state: events.length ? "CHECKED_IN" : "NOT_STARTED",
        openSession: false, openBreak: false, breaks: [], sessions: [], validEvents: events
      })
    },
    StaffSchedulingPhase2: {},
    Utilities: {
      getUuid: () => `uuid-${++control.uuid}`,
      formatDate: (_date, zone, format) => {
        if (control.invalidZones.has(zone)) throw new Error("Invalid timezone");
        if (format === "yyyy-MM-dd") return "2099-01-02";
        if (format === "H") return "10";
        if (format === "m") return "16";
        if (format === "EEEE") return "Friday";
        return "2099-01-02T10:16:00+02:00";
      }
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: name => ({
          BOOKING_AVAILABILITY_ENGINE: "PHASE5",
          BOOKING_PHASE2_PLANNED_ENABLED: "true",
          BOOKING_ATTENDANCE_LIVE_ENABLED: "true",
          BOOKING_MANAGER_OVERRIDE_ENABLED: "true",
          BOOKING_CONFLICT_RESOLUTION_ENABLED: "true",
          BOOKING_NO_CHECK_IN_DETECTOR_ENABLED: control.detectorEnabled ? "true" : "false",
          BOOKING_NO_CHECK_IN_TRIGGER_OWNER_EMAIL: control.expectedTriggerEmail
        })[name] || ""
      })
    },
    CacheService: { getScriptCache: () => ({ get: () => null, put: () => {} }) },
    LockService: { getScriptLock: () => ({
      tryLock: () => {
        control.lockCalls += 1;
        if (control.onLock) {
          const callback = control.onLock;
          control.onLock = null;
          callback();
        }
        return true;
      },
      releaseLock: () => {}
    }) },
    SpreadsheetApp: { getActive: () => ({
      getId: () => "sheet-test",
      getSheetByName: name => Object.hasOwn(rows, name) ? { name } : null
    }) },
    getCutHubEnvironmentConfig: () => ({
      environment: control.environment, spreadsheetId: "sheet-test"
    }),
    Session: { getEffectiveUser: () => ({ getEmail: () => control.effectiveTriggerEmail }) },
    schedulePhase2Actor: () => control.authenticated ? actor : null,
    schedulePhase2ReadRows: name => JSON.parse(JSON.stringify(rows[name] || [])),
    schedulePhase2ReadStaff: () => JSON.parse(JSON.stringify(rows.STAFF)),
    schedulePhase2ReadSchedules: () => JSON.parse(JSON.stringify(rows.BARBER_SCHEDULE)),
    schedulePhase2Headers: () => [],
    schedulePhase2Save: (name, _schema, idHeader, record) => {
      if (name === "BOOKING_AVAILABILITY_AUDIT" &&
          record.action === "EXISTING_BOOKING_CONFLICT_DETECTED" &&
          record.afterState && record.afterState.bookingId === control.failConflictAuditBookingId) {
        throw Object.assign(new Error("Injected item audit failure"), { code: "AUDIT_FAILED" });
      }
      const saved = JSON.parse(JSON.stringify(record));
      writes.push({ name, record: saved });
      const key = camel(idHeader);
      const collection = rows[name] || (rows[name] = []);
      const index = collection.findIndex(item => String(item[key]) === String(saved[key]));
      if (index >= 0) collection[index] = saved;
      else collection.push(saved);
      return saved;
    },
    attendancePhase3ReadDays: () => JSON.parse(JSON.stringify(rows.STAFF_ATTENDANCE_DAYS)),
    attendancePhase3ResolveSchedule: staff => {
      if (control.failedScheduleStaff.has(staff.staffId)) {
        throw Object.assign(new Error("Injected schedule failure"), { code: "SCHEDULE_FAILED" });
      }
      if (control.inactiveScheduleStaff.has(staff.staffId)) {
        return { active: false, classification: "NOT_SCHEDULED", shiftSegments: [] };
      }
      return {
        active: true, classification: "WORKING",
        shiftSegments: [{ shiftStart: "10:00", shiftEnd: "18:00" }],
        sourceIds: [`SCH-${staff.staffId}`]
      };
    },
    getAllBookingsV2: () => JSON.parse(JSON.stringify(rows.Bookings)),
    publicBookingServices: () => [],
    jsonOutput: value => value
  };
  vm.createContext(context);
  vm.runInContext(gasSource, context, { filename: gasPath });
  return { context, rows, writes, control, actor };
}

function addBranch(harness, branchId, zone = "Africa/Cairo") {
  harness.rows.BOOKING_BRANCH_REGISTRY.push({
    branchId, branchName: branchId, active: true, timeZone: zone,
    publicSelectable: true, closureStatus: "OPEN"
  });
}

function addStaffBooking(harness, branchId, staffId, bookingId) {
  harness.rows.STAFF.push({ staffId, branchId, active: true });
  if (bookingId) harness.rows.Bookings.push({
    id: bookingId, employeeId: staffId, branchId, date: "2099-01-02",
    time: "12:00", durationMinutes: 30, status: "confirmed", deleted: false
  });
}

function activeConflicts(rows) {
  return rows.BOOKING_AVAILABILITY_CONFLICTS.filter(item =>
    ["OPEN", "ACKNOWLEDGED"].includes(String(item.status).toUpperCase()));
}

test("one employee and one item failure are isolated from later employees and bookings", () => {
  const h = createHarness();
  addBranch(h, "BR-1");
  addStaffBooking(h, "BR-1", "S-1", "B-1");
  addStaffBooking(h, "BR-1", "S-2", "B-2");
  addStaffBooking(h, "BR-1", "S-3", "B-3");
  h.control.failedScheduleStaff.add("S-1");
  h.control.failConflictAuditBookingId = "B-2";
  const result = h.context.runBookingNoCheckInDetector({ clientRequestId: "detector-isolation-01" });
  assert.equal(result.status, "PARTIAL");
  assert.equal(result.failedRecords, 2);
  assert.deepEqual(Array.from(result.errorSummaries, item => item.scope), ["staff", "booking"]);
  assert.equal(activeConflicts(h.rows).some(item => item.bookingId === "B-3"), true);
});

test("one invalid branch timezone is reported once and does not stop the next branch", () => {
  const h = createHarness();
  addBranch(h, "BR-1", "Africa/Invalid_Test");
  addStaffBooking(h, "BR-1", "S-1", "B-1");
  addStaffBooking(h, "BR-1", "S-2", "B-2");
  addBranch(h, "BR-2");
  addStaffBooking(h, "BR-2", "S-3", "B-3");
  h.control.invalidZones.add("Africa/Invalid_Test");
  const result = h.context.runBookingNoCheckInDetector({});
  assert.equal(result.errorSummaries.filter(item => item.scope === "branch").length, 1);
  assert.equal(result.conflictsCreated, 1);
  assert.equal(activeConflicts(h.rows)[0].bookingId, "B-3");
});

test("server-side branch and staff caps cannot be raised by client input", () => {
  const staffHarness = createHarness();
  addBranch(staffHarness, "BR-1");
  for (let index = 1; index <= 41; index += 1) {
    addStaffBooking(staffHarness, "BR-1", `S-${String(index).padStart(2, "0")}`);
  }
  const staffResult = staffHarness.context.runBookingNoCheckInDetector({
    detectorLimits: { maxStaff: 999999, maxBookings: 999999, maxConflicts: 999999 }
  });
  assert.equal(staffResult.staffScanned, 40);
  assert.equal(staffResult.limits.maxStaff, 40);
  assert.equal(staffResult.limits.maxBookings, 150);
  assert.equal(staffResult.limits.maxConflicts, 30);
  assert.equal(staffResult.status, "PARTIAL");
  assert.ok(staffResult.continuationToken);

  const branchHarness = createHarness();
  for (let index = 1; index <= 6; index += 1) {
    const branchId = `BR-${index}`;
    addBranch(branchHarness, branchId);
    addStaffBooking(branchHarness, branchId, `S-${index}`);
  }
  const branchResult = branchHarness.context.runBookingNoCheckInDetector({
    detectorLimits: { maxBranches: 999999 }
  });
  assert.equal(branchResult.branchesScanned, 5);
  assert.equal(branchResult.limits.maxBranches, 5);
  assert.equal(branchResult.status, "PARTIAL");
});

test("conflict cap stops a high-volume employee and resumes after the last booking", () => {
  const h = createHarness();
  addBranch(h, "BR-1");
  addStaffBooking(h, "BR-1", "S-1");
  for (let index = 1; index <= 31; index += 1) h.rows.Bookings.push({
    id: `B-${String(index).padStart(2, "0")}`, employeeId: "S-1", branchId: "BR-1",
    date: "2099-01-02", time: "12:00", durationMinutes: 30,
    status: "confirmed", deleted: false
  });
  const first = h.context.runBookingNoCheckInDetector({
    detectorLimits: { maxConflicts: 999999, maxBookings: 999999 }
  });
  assert.equal(first.conflictsReviewed, 30);
  assert.equal(first.conflictsCreated, 30);
  assert.equal(first.status, "PARTIAL");
  const second = h.context.runBookingNoCheckInDetector({
    continuationToken: first.continuationToken
  });
  assert.equal(second.bookingsScanned, 1);
  assert.equal(second.conflictsCreated, 1);
  assert.equal(activeConflicts(h.rows).length, 31);
});

test("deadline stops before work and returns a resumable partial result", () => {
  const h = createHarness();
  addBranch(h, "BR-1");
  addStaffBooking(h, "BR-1", "S-1", "B-1");
  let calls = 0;
  h.context.bookingAvailabilityPhase5DetectorNowMs = () => (++calls === 1 ? 0 : 250000);
  const result = h.context.runBookingNoCheckInDetector({});
  assert.equal(result.status, "PARTIAL");
  assert.equal(result.bookingsScanned, 0);
  assert.ok(result.continuationToken);
  assert.equal(result.checkpointWritten, false);
});

test("continuation resumes at the deterministic next staff without duplicating prior work", () => {
  const h = createHarness();
  addBranch(h, "BR-1");
  addStaffBooking(h, "BR-1", "S-1", "B-1");
  addStaffBooking(h, "BR-1", "S-2", "B-2");
  const first = h.context.runBookingNoCheckInDetector({
    clientRequestId: "detector-resume-01", detectorLimits: { maxStaff: 1 }
  });
  assert.equal(first.status, "PARTIAL");
  assert.equal(first.conflictsCreated, 1);
  const second = h.context.runBookingNoCheckInDetector({
    clientRequestId: "detector-resume-02", detectorLimits: { maxStaff: 1 },
    continuationToken: first.continuationToken
  });
  assert.equal(second.conflictsCreated, 1);
  assert.equal(new Set(activeConflicts(h.rows).map(item => item.bookingId)).size, 2);
});

test("retry, duplicate invocation, and existing committed results remain idempotent", () => {
  const h = createHarness();
  addBranch(h, "BR-1");
  addStaffBooking(h, "BR-1", "S-1", "B-1");
  const first = h.context.runBookingNoCheckInDetector({ clientRequestId: "detector-retry-01" });
  const second = h.context.runBookingNoCheckInDetector({ clientRequestId: "detector-retry-01" });
  const third = h.context.runBookingNoCheckInDetector({ clientRequestId: "detector-overlap-02" });
  assert.equal(first.conflictsCreated, 1);
  assert.equal(second.conflictsCreated, 0);
  assert.equal(third.conflictsCreated, 0);
  assert.equal(second.conflictsAlreadyExisting, 1);
  assert.equal(third.conflictsAlreadyExisting, 1);
  assert.equal(activeConflicts(h.rows).length, 1);
  assert.equal(second.batchAuditReused, true);
  assert.equal(h.rows.BOOKING_AVAILABILITY_AUDIT.filter(item =>
    item.action.indexOf("NO_CHECK_IN_DETECTION_BATCH_") === 0).length, 2);
});

test("preview is zero-write and never persists a checkpoint or installs a trigger", () => {
  const h = createHarness();
  const before = h.writes.length;
  const preview = h.context.previewBookingNoCheckInTriggerInstallation({
    detectorLimits: { maxBranches: 9999 }
  });
  assert.equal(preview.executionAllowed, false);
  assert.equal(preview.writes, 0);
  assert.equal(preview.checkpointWrites, 0);
  assert.equal(preview.limits.maxBranches, 5);
  assert.equal(h.writes.length, before);
  assert.doesNotMatch(gasSource, /ScriptApp\s*\.\s*(newTrigger|getProjectTriggers|deleteTrigger)/);
  assert.doesNotMatch(gasSource, /setProperty\s*\(/);
});

test("attendance recorded under the mutation lock prevents a stale conflict", () => {
  const h = createHarness();
  addBranch(h, "BR-1");
  addStaffBooking(h, "BR-1", "S-1", "B-1");
  h.control.onLock = () => {
    h.rows.STAFF_ATTENDANCE_DAYS.push({
      attendanceDayId: "D-1", staffId: "S-1", attendanceDate: "2099-01-02",
      status: "OPEN", dayLifecycle: "OPEN"
    });
    h.rows.ATTENDANCE_EVENTS.push({ eventId: "E-1", attendanceDayId: "D-1" });
  };
  const result = h.context.runBookingNoCheckInDetector({});
  assert.equal(result.conflictsCreated, 0);
  assert.equal(result.skippedRecords, 1);
  assert.equal(result.revalidatedRecords, 1);
});

test("booking and schedule changes are revalidated immediately before mutation", () => {
  const bookingChange = createHarness();
  addBranch(bookingChange, "BR-1");
  addStaffBooking(bookingChange, "BR-1", "S-1", "B-1");
  bookingChange.control.onLock = () => { bookingChange.rows.Bookings[0].status = "cancelled"; };
  const bookingResult = bookingChange.context.runBookingNoCheckInDetector({});
  assert.equal(bookingResult.conflictsCreated, 0);
  assert.equal(bookingResult.skippedRecords, 1);
  assert.equal(bookingResult.sourceChangesRevalidated, 0);

  const scheduleChange = createHarness();
  addBranch(scheduleChange, "BR-1");
  addStaffBooking(scheduleChange, "BR-1", "S-1", "B-1");
  scheduleChange.control.onLock = () => { scheduleChange.control.inactiveScheduleStaff.add("S-1"); };
  const scheduleResult = scheduleChange.context.runBookingNoCheckInDetector({});
  assert.equal(scheduleResult.conflictsCreated, 0);
  assert.equal(scheduleResult.skippedRecords, 1);
  assert.equal(scheduleResult.sourceChangesRevalidated, 1);

  const hoursChange = createHarness();
  addBranch(hoursChange, "BR-1");
  addStaffBooking(hoursChange, "BR-1", "S-1", "B-1");
  hoursChange.control.onLock = () => { hoursChange.rows.BRANCH_BOOKING_HOURS.push({
    branchHoursId: "BH-1", branchId: "BR-1", weekday: "FRIDAY",
    openTime: "09:00", closeTime: "18:00", active: true
  }); };
  const hoursResult = hoursChange.context.runBookingNoCheckInDetector({});
  assert.equal(hoursResult.revalidatedRecords, 1);
  assert.equal(hoursResult.sourceChangesRevalidated, 1);
});

test("batch summary is accurate and partial work never reports full success", () => {
  const h = createHarness();
  addBranch(h, "BR-1");
  addStaffBooking(h, "BR-1", "S-1", "B-1");
  addStaffBooking(h, "BR-1", "S-2", "B-2");
  const result = h.context.runBookingNoCheckInDetector({
    detectorLimits: { maxBookings: 1 }
  });
  assert.deepEqual({
    branches: result.branchesScanned, staff: result.staffScanned,
    bookings: result.bookingsScanned, eligible: result.eligibleNoCheckIns,
    created: result.conflictsCreated, existing: result.conflictsAlreadyExisting,
    failed: result.failedRecords, checkpointWritten: result.checkpointWritten
  }, {
    branches: 1, staff: 2, bookings: 1, eligible: 2,
    created: 1, existing: 0, failed: 0, checkpointWritten: false
  });
  assert.equal(result.status, "PARTIAL");
  assert.ok(result.continuationToken);
  const batchAudit = h.rows.BOOKING_AVAILABILITY_AUDIT.find(item =>
    item.action === "NO_CHECK_IN_DETECTION_BATCH_PARTIAL");
  assert.equal(batchAudit.afterState.status, "PARTIAL");
});

test("production and staging execution remain gated and detector opt-in defaults closed", () => {
  for (const environment of ["production", "staging"]) {
    const h = createHarness({ environment });
    assert.throws(() => h.context.runBookingNoCheckInDetector({}),
      error => error.code === "PHASE5_ENVIRONMENT_BLOCKED");
  }
  const disabled = createHarness({ detectorEnabled: false });
  assert.throws(() => disabled.context.runBookingNoCheckInDetector({}),
    error => error.code === "AVAILABILITY_FEATURE_DISABLED");
  assert.equal(phase5.normalizeFlags({ BOOKING_AVAILABILITY_ENGINE: "PHASE5" })
    .noCheckInDetectorEnabled, false);
});

test("time-trigger identity requires the exact reviewed effective owner email", () => {
  const accepted = createHarness({ authenticated: false });
  const result = accepted.context.runBookingNoCheckInDetector({});
  assert.equal(result.status, "COMPLETE");
  const rejected = createHarness({
    authenticated: false, expectedTriggerEmail: "owner@example.com",
    effectiveTriggerEmail: "someone-else@example.com"
  });
  assert.throws(() => rejected.context.runBookingNoCheckInDetector({}),
    error => error.code === "NO_CHECK_IN_TRIGGER_IDENTITY_INVALID");
});
