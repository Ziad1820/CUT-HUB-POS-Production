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

function harness() {
  const rows = {};
  Object.keys(phase5.SHEET_SCHEMAS).forEach(name => { rows[name] = []; });
  rows.Bookings = [];
  rows.STAFF = [];
  rows.ATTENDANCE_EVENTS = [];
  rows.STAFF_ATTENDANCE_DAYS = [];
  const writes = [];
  let uuid = 0;
  const clock = { hour: 10, minute: 16 };
  const identity = {
    actor: {
      actorId: "owner-1", role: "OWNER", owner: true,
      permissions: phase5.PERMISSIONS, branchIds: ["BR-1", "BR-2"]
    },
    duplicate: false
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
      getUuid: () => `uuid-${++uuid}`,
      formatDate: (_date, zone, format) => {
        if (format === "yyyy-MM-dd") return "2099-01-02";
        if (format === "H") return zone === "UTC" ? String(clock.hour - 2) : String(clock.hour);
        if (format === "m") return String(clock.minute);
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
           BOOKING_NO_CHECK_IN_DETECTOR_ENABLED: "true"
        })[name] || ""
      })
    },
    CacheService: { getScriptCache: () => ({ get: () => null, put: () => {} }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    SpreadsheetApp: {
      getActive: () => ({
        getId: () => "sheet-test",
        getSheetByName: name => Object.hasOwn(rows, name) ? { name } : null
      })
    },
    getCutHubEnvironmentConfig: () => ({
      environment: "test", spreadsheetId: "sheet-test"
    }),
    schedulePhase2Actor: data => {
      if (identity.duplicate) throw Object.assign(
        new Error("Duplicate authenticated identity."), { code: "ACTOR_IDENTITY_AMBIGUOUS" });
      if (data && Object.prototype.hasOwnProperty.call(data, "__actor")) return data.__actor;
      return identity.actor;
    },
    schedulePhase2ReadRows: name => rows[name] || [],
    schedulePhase2ReadStaff: () => rows.STAFF,
    schedulePhase2ReadSchedules: () => [],
    schedulePhase2Headers: () => [],
    schedulePhase2Save: (name, _schema, idHeader, record) => {
      writes.push({ name, record: JSON.parse(JSON.stringify(record)) });
      const key = camel(idHeader);
      const collection = rows[name] || (rows[name] = []);
      const index = collection.findIndex(item => String(item[key]) === String(record[key]));
      const saved = JSON.parse(JSON.stringify(record));
      if (index >= 0) collection[index] = saved;
      else collection.push(saved);
      return saved;
    },
    attendancePhase3ReadDays: () => rows.STAFF_ATTENDANCE_DAYS || [],
    attendancePhase3ResolveSchedule: () => ({
      active: true, classification: "WORKING",
      shiftSegments: [{ shiftStart: "10:00", shiftEnd: "14:00" }], sourceIds: ["SCH-1"]
    }),
    getAllBookingsV2: () => rows.Bookings,
    publicBookingServices: () => [],
    jsonOutput: value => value
  };
  vm.createContext(context);
  vm.runInContext(gasSource, context, { filename: gasPath });
  return { context, rows, writes, clock, identity };
}

test("transaction writes durable intent and returns the original committed result on retry", () => {
  const { context, rows } = harness();
  let businessCalls = 0;
  const options = {
    data: {}, requestId: "request-committed-1", action: "TEST_MUTATION",
    entityType: "TEST", entityId: "E-1", branchId: "BR-1", date: "2099-01-02",
    business: () => { businessCalls += 1; return { id: "E-1", value: 7 }; },
    version: () => ({ value: 1 }),
    audit: () => ({ auditId: "A-1" }),
    compensateBusiness: () => {},
    response: value => ({ ok: true, value: value.value })
  };
  assert.deepEqual(context.bookingAvailabilityPhase5RunTransaction(options), { ok: true, value: 7 });
  assert.equal(rows.BOOKING_AVAILABILITY_TRANSACTIONS[0].status, "COMMITTED");
  assert.deepEqual(context.bookingAvailabilityPhase5RunTransaction(options), { ok: true, value: 7 });
  assert.equal(businessCalls, 1);
});

test("version failure compensates a persisted business write and records exact evidence", () => {
  const { context, rows } = harness();
  let entity = 0;
  assert.throws(() => context.bookingAvailabilityPhase5RunTransaction({
    data: {}, requestId: "request-version-fail", action: "BOOKING_CREATE",
    entityType: "BOOKING", entityId: "B-1", branchId: "BR-1", date: "2099-01-02",
    business: () => { entity = 1; return { id: "B-1" }; },
    version: () => { throw Object.assign(new Error("version failed"), { code: "VERSION_FAILED" }); },
    compensateBusiness: () => { entity = 0; }
  }), error => error.code === "VERSION_FAILED");
  assert.equal(entity, 0);
  assert.equal(rows.BOOKING_AVAILABILITY_TRANSACTIONS[0].status, "COMPENSATED");
  assert.equal(rows.BOOKING_AVAILABILITY_TRANSACTIONS[0].errorCode, "VERSION_FAILED");
});

test("audit failure compensates authority change; failed compensation leaves recovery marker", () => {
  const first = harness();
  let entity = "before";
  assert.throws(() => first.context.bookingAvailabilityPhase5RunTransaction({
    data: {}, requestId: "request-audit-fail-1", action: "OVERRIDE_CREATE",
    entityType: "OVERRIDE", entityId: "O-1", branchId: "BR-1", date: "2099-01-02",
    business: () => { entity = "after"; return { id: "O-1" }; },
    version: () => ({ value: 2 }),
    audit: () => { throw Object.assign(new Error("audit failed"), { code: "AUDIT_FAILED" }); },
    compensateBusiness: () => { entity = "before"; }
  }), error => error.code === "AUDIT_FAILED");
  assert.equal(entity, "before");

  const second = harness();
  assert.throws(() => second.context.bookingAvailabilityPhase5RunTransaction({
    data: {}, requestId: "request-recovery-1", action: "CONFLICT_CREATE",
    entityType: "CONFLICT", entityId: "C-1", branchId: "BR-1", date: "2099-01-02",
    business: () => ({ id: "C-1" }),
    version: () => ({ value: 1 }),
    audit: () => { throw new Error("audit failed"); },
    compensateBusiness: () => { throw new Error("compensation failed"); }
  }), error => Boolean(error.code === "AVAILABILITY_RECOVERY_REQUIRED" &&
      error.details.transactionId));
  assert.equal(second.rows.BOOKING_AVAILABILITY_TRANSACTIONS[0].status, "RECOVERY_REQUIRED");
  assert.equal(second.rows.BOOKING_AVAILABILITY_TRANSACTIONS[0].recoveryRequired, true);
});

test("read-only branch and migration preview paths perform zero authoritative writes", () => {
  const { context, rows, writes } = harness();
  rows.BOOKING_BRANCH_REGISTRY.push({
    branchId: "BR-1", branchName: "Main", active: true,
    timeZone: "Africa/Cairo", publicSelectable: true, closureStatus: "OPEN",
    closureReason: "internal note"
  });
  rows.BOOKING_BRANCH_REGISTRY.push({
    branchId: "BR-2", branchName: "Inactive", active: false,
    timeZone: "Africa/Cairo", publicSelectable: false, closureStatus: "CLOSED"
  });
  rows.BRANCH_BOOKING_HOURS.push({
    branchHoursId: "BR-1-MONDAY", branchId: "BR-1", weekday: "MONDAY",
    openTime: "09:00", closeTime: "18:00", active: true,
    effectiveFrom: "2099-01-01", effectiveTo: ""
  });
  const publicBranches = context.bookingAvailabilityPhase5ListBranches(null, true);
  assert.equal(publicBranches.length, 1);
  assert.equal(publicBranches[0].closureReason, "");
  const ownerBranches = context.bookingAvailabilityPhase5ListBranches({ owner: true }, false);
  assert.equal(ownerBranches.length, 2);
  assert.equal(ownerBranches[0].closureReason, "internal note");
  assert.equal(ownerBranches[1].active, false);
  assert.equal(context.bookingAvailabilityPhase5ListBranchHours({ owner: true }).length, 1);
  assert.equal(context.bookingAvailabilityPhase5ListBranchHours({
    owner: false, branchIds: ["BR-1"], permissions: ["booking_availability.view"]
  }).length, 0);
  context.bookingAvailabilityPhase5PreviewMigration({ __actor: {
    actorId: "owner", owner: true, role: "OWNER", permissions: [], branchIds: []
  } });
  assert.equal(writes.length, 0);
});

test("permission and branch-scope matrix fails closed for cross-branch and inactive actors", () => {
  const { context } = harness();
  assert.throws(() => context.bookingAvailabilityPhase5AssertBranchScope({
    actorId: "manager", owner: false, branchIds: ["BR-1"], permissions: []
  }, "BR-2"), error => error.code === "AVAILABILITY_BRANCH_SCOPE_DENIED");
  assert.equal(context.bookingAvailabilityPhase5HasPermission({
    owner: false, permissions: ["booking_availability.view"]
  }, "booking_availability.view"), true);
  assert.equal(context.bookingAvailabilityPhase5HasPermission({
    owner: false, active: false, permissions: []
  }, "booking_availability.view"), false);
});

test("branch hours reject malformed and reversed effective ranges before writing", () => {
  const { context, rows, writes, identity } = harness();
  rows.BOOKING_BRANCH_REGISTRY.push({
    branchId: "BR-1", branchName: "Main", active: true,
    timeZone: "Africa/Cairo", publicSelectable: true, closureStatus: "OPEN"
  });
  const base = {
    branchId: "BR-1", weekday: "MONDAY", openTime: "22:00", closeTime: "06:00",
    active: true, clientRequestId: "hours-range-01"
  };
  for (const dates of [
    { effectiveFrom: "2099-02-30", effectiveTo: "" },
    { effectiveFrom: "2099-03-02", effectiveTo: "2099-03-01" }
  ]) {
    assert.throws(() => context.bookingAvailabilityPhase5SaveBranchHours(
      { ...base, ...dates }, identity.actor),
    error => error.code === "AVAILABILITY_BRANCH_HOURS_EFFECTIVE_RANGE_INVALID");
  }
  assert.equal(writes.length, 0);
  const saved = context.bookingAvailabilityPhase5SaveBranchHours({
    ...base, clientRequestId: "hours-range-02",
    effectiveFrom: "2099-03-01", effectiveTo: "2099-03-31"
  }, identity.actor);
  assert.equal(saved.openTime, "22:00");
  assert.equal(saved.closeTime, "06:00");
  assert.equal(rows.BRANCH_BOOKING_HOURS[0].effectiveFrom, "2099-03-01");
  assert.equal(rows.BRANCH_BOOKING_HOURS[0].effectiveTo, "2099-03-31");
});

test("realistic role matrix keeps Booking authority separate from Attendance and Payroll", () => {
  const { context } = harness();
  const roles = {
    employeeSelf: { owner: false, branchIds: ["BR-1"], permissions: ["booking_availability.view"] },
    bookingOnly: { owner: false, branchIds: ["BR-1"], permissions: ["booking_availability.view"] },
    attendanceOnly: { owner: false, branchIds: ["BR-1"], permissions: ["attendance.view"] },
    payrollOnly: { owner: false, branchIds: ["BR-1"], permissions: ["payroll_attendance.view"] },
    inactive: { owner: false, active: false, branchIds: [], permissions: [] },
    owner: { owner: true, branchIds: [], permissions: [] }
  };
  assert.equal(context.bookingAvailabilityPhase5HasPermission(
    roles.employeeSelf, "booking_availability.view"), true);
  assert.equal(context.bookingAvailabilityPhase5HasPermission(
    roles.bookingOnly, "booking_availability.view"), true);
  assert.equal(context.bookingAvailabilityPhase5HasPermission(
    roles.attendanceOnly, "booking_availability.view"), false);
  assert.equal(context.bookingAvailabilityPhase5HasPermission(
    roles.payrollOnly, "booking_availability.view"), false);
  assert.equal(context.bookingAvailabilityPhase5HasPermission(
    roles.inactive, "booking_availability.view"), false);
  assert.equal(context.bookingAvailabilityPhase5HasPermission(
    roles.owner, "booking_availability.resolve_conflict"), true);
  assert.throws(() => context.bookingAvailabilityPhase5Actor({
    __actor: null
  }), error => error.code === "AVAILABILITY_AUTH_REQUIRED");
});

test("unknown, duplicate and forged identities plus forged branch/staff fail closed", () => {
  const { context, rows, identity } = harness();
  identity.actor = null;
  assert.throws(() => context.bookingAvailabilityPhase5Actor({ actorId: "forged-owner" }),
    error => error.code === "AVAILABILITY_AUTH_REQUIRED");
  identity.duplicate = true;
  assert.throws(() => context.bookingAvailabilityPhase5Actor({}),
    error => error.code === "ACTOR_IDENTITY_AMBIGUOUS");
  identity.duplicate = false;
  identity.actor = {
    actorId: "manager-1", role: "MANAGER", owner: false,
    branchIds: ["BR-1"], permissions: [
      "booking_availability.manage_override", "booking_availability.override_internal"
    ]
  };
  assert.throws(() => context.bookingAvailabilityPhase5CreateOverride({
    branchId: "BR-2", staffId: "S-2", date: "2099-01-02",
    startTime: "10:00", endTime: "11:00", reason: "test",
    clientRequestId: "forged-branch-1"
  }, identity.actor), error => error.code === "AVAILABILITY_BRANCH_SCOPE_DENIED");
  rows.BOOKING_BRANCH_REGISTRY.push({
    branchId: "BR-1", branchName: "Main", active: true,
    timeZone: "Africa/Cairo", publicSelectable: true, closureStatus: "OPEN"
  });
  rows.STAFF.push({ staffId: "S-2", branchId: "BR-2", active: true });
  assert.throws(() => context.bookingAvailabilityPhase5CreateOverride({
    branchId: "BR-1", staffId: "S-2", date: "2099-01-02",
    startTime: "10:00", endTime: "11:00", reason: "test",
    clientRequestId: "forged-staff-01"
  }, identity.actor), error => error.code === "AVAILABILITY_OVERRIDE_STAFF_INVALID");
});

test("malformed, oversized, wrong-audience, wrong-branch and wrong-date cache entries miss safely", () => {
  const { context } = harness();
  const input = {
    staff: { staffId: "S-1" }, branchId: "BR-1", date: "2099-01-02", audience: "public"
  };
  assert.equal(context.bookingAvailabilityPhase5CachedResult("{", input), null);
  const valid = JSON.stringify({
    staffId: "S-1", branchId: "BR-1", date: "2099-01-02",
    audience: "public", slots: [], availabilityToken: "token"
  });
  assert.ok(context.bookingAvailabilityPhase5CachedResult(valid, input));
  for (const changed of [
    { ...input, audience: "internal" }, { ...input, branchId: "BR-2" },
    { ...input, date: "2099-01-03" }
  ]) assert.equal(context.bookingAvailabilityPhase5CachedResult(valid, changed), null);
  assert.equal(context.bookingAvailabilityPhase5CachedResult("x".repeat(100000), input), null);
});

test("scheduled no-check-in detector respects exact grace, closure, later check-in and idempotency", () => {
  const { context, rows, clock } = harness();
  rows.BOOKING_BRANCH_REGISTRY.push({
    branchId: "BR-1", branchName: "Main", active: true,
    timeZone: "Africa/Cairo", publicSelectable: true, closureStatus: "OPEN"
  });
  rows.STAFF.push({ staffId: "S-1", branchId: "BR-1", active: true });
  rows.Bookings.push({
    id: "B-1", employeeId: "S-1", branchId: "BR-1",
    date: "2099-01-02", time: "12:00", durationMinutes: 30,
    status: "confirmed", deleted: false
  });
  rows.Bookings.push({
    id: "B-2", employeeId: "S-1", branchId: "BR-1",
    date: "2099-01-02", time: "13:00", durationMinutes: 30,
    status: "confirmed", deleted: false
  });
  clock.minute = 15;
  assert.equal(context.runBookingNoCheckInDetector({}).createdConflictCount, 0);
  clock.minute = 16;
  assert.equal(context.runBookingNoCheckInDetector({}).createdConflictCount, 2);
  assert.equal(rows.BOOKING_AVAILABILITY_CONFLICTS[0].conflictCode, "NO_CHECK_IN_CONFLICT");
  assert.equal(new Set(rows.BOOKING_AVAILABILITY_TRANSACTIONS.map(
    item => item.requestId)).size, rows.BOOKING_AVAILABILITY_TRANSACTIONS.length);
  assert.equal(context.runBookingNoCheckInDetector({}).createdConflictCount, 0);
  rows.STAFF_ATTENDANCE_DAYS.push({
    attendanceDayId: "D-1", staffId: "S-1", attendanceDate: "2099-01-02",
    status: "OPEN", dayLifecycle: "OPEN"
  });
  rows.ATTENDANCE_EVENTS.push({ eventId: "E-1", attendanceDayId: "D-1" });
  assert.equal(context.runBookingNoCheckInDetector({}).createdConflictCount, 0);
  rows.BOOKING_BRANCH_REGISTRY[0].closureStatus = "CLOSED";
  assert.equal(context.runBookingNoCheckInDetector({}).evaluatedStaffCount, 0);
  assert.doesNotMatch(gasSource, /ScriptApp\.newTrigger/);
});

test("conflict revalidation rejects inactive, rescheduled and disappeared restrictions", () => {
  const { context, rows, identity } = harness();
  rows.STAFF.push({ staffId: "S-1", branchId: "BR-1", active: true });
  rows.Bookings.push({
    id: "B-1", employeeId: "S-1", branchId: "BR-1",
    date: "2099-01-02", time: "12:00", status: "confirmed", deleted: false
  });
  const conflict = {
    conflictId: "C-1", conflictCode: "NO_CHECK_IN_CONFLICT", bookingId: "B-1",
    branchId: "BR-1", staffId: "S-1", date: "2099-01-02", slotStart: "12:00",
    status: "ACKNOWLEDGED", attendanceDayId: "", attendanceEventIds: []
  };
  assert.equal(context.bookingAvailabilityPhase5RevalidateConflict(
    conflict, identity.actor).id, "B-1");
  rows.Bookings[0].time = "12:30";
  assert.throws(() => context.bookingAvailabilityPhase5RevalidateConflict(
    conflict, identity.actor), error => error.code === "AVAILABILITY_CONFLICT_RESCHEDULED");
  rows.Bookings[0].time = "12:00";
  rows.Bookings[0].status = "cancelled";
  assert.throws(() => context.bookingAvailabilityPhase5RevalidateConflict(
    conflict, identity.actor), error => error.code === "AVAILABILITY_CONFLICT_BOOKING_INACTIVE");
  rows.Bookings[0].status = "confirmed";
  rows.STAFF_ATTENDANCE_DAYS.push({
    attendanceDayId: "D-1", staffId: "S-1", attendanceDate: "2099-01-02",
    status: "OPEN", dayLifecycle: "OPEN"
  });
  rows.ATTENDANCE_EVENTS.push({ eventId: "E-1", attendanceDayId: "D-1" });
  assert.throws(() => context.bookingAvailabilityPhase5RevalidateConflict(
    conflict, identity.actor),
  error => error.code === "AVAILABILITY_CONFLICT_RESTRICTION_DISAPPEARED");
});
