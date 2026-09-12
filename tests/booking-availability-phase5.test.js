const test = require("node:test");
const assert = require("node:assert/strict");
const phase5 = require("../scripts/booking-availability-phase5");

function base(overrides = {}) {
  return {
    environment: "development",
    spreadsheetHash: "sheet",
    branchId: "BR-1",
    date: "2099-01-02",
    today: "2099-01-01",
    audience: "public",
    staff: { staffId: "STAFF-1", staffName: "Sam", branchId: "BR-1", active: true },
    branchOpen: true,
    branchSegments: [{ start: "09:00", end: "20:00" }],
    schedule: {
      active: true,
      sourceType: "RECURRING",
      sourceIds: ["SCH-1"],
      classification: "WORKING_DAY",
      shiftSegments: [{ shiftStart: "10:00", shiftEnd: "14:00" }],
      blockedIntervals: []
    },
    attendance: { state: "NOT_STARTED", dayLifecycle: "OPEN", breaks: [] },
    attendanceLiveEnabled: true,
    durationMinutes: 60,
    preparationMinutes: 0,
    cleanupMinutes: 0,
    serviceSetHash: "svc",
    bookings: [],
    versions: {
      bookingVersion: 1, scheduleVersion: 1, attendanceOperationalVersion: 1,
      operationalOverrideVersion: 1, serviceVersion: 1, branchHoursVersion: 1
    },
    generatedAt: "2099-01-01T10:00:00+02:00",
    serverNowMs: Date.parse("2099-01-01T10:00:00+02:00"),
    serverNowMinute: 600,
    ...overrides
  };
}

test("planned availability supports regular and multiple daily segments", () => {
  const result = phase5.calculateAvailability(base({
    schedule: {
      ...base().schedule,
      shiftSegments: [
        { shiftStart: "10:00", shiftEnd: "12:00" },
        { shiftStart: "14:00", shiftEnd: "16:00" }
      ]
    }
  }));
  assert.deepEqual(result.slots.map(item => item.start), [
    "10:00", "10:30", "11:00", "14:00", "14:30", "15:00"
  ]);
});

test("planned availability supports overnight shifts and branch hours", () => {
  const result = phase5.calculateAvailability(base({
    branchSegments: [{ start: "20:00", end: "03:00" }],
    schedule: {
      ...base().schedule,
      shiftSegments: [{ shiftStart: "22:00", shiftEnd: "02:00" }]
    },
    durationMinutes: 60
  }));
  assert.deepEqual(result.slots.map(item => item.start), [
    "22:00", "22:30", "23:00", "23:30", "00:00", "00:30", "01:00"
  ]);
});

test("service preparation and cleanup must fit wholly inside a segment", () => {
  const result = phase5.calculateAvailability(base({
    preparationMinutes: 15, cleanupMinutes: 15
  }));
  assert.equal(result.slots[0].start, "10:30");
  assert.equal(result.slots.at(-1).start, "12:30");
});

test("approved leave, weekly rest, and closure fail planned availability closed", () => {
  for (const classification of ["APPROVED_LEAVE", "WEEKLY_DAY_OFF", "BRANCH_CLOSED"]) {
    const result = phase5.calculateAvailability(base({
      schedule: { ...base().schedule, classification, shiftSegments: [] }
    }));
    assert.equal(result.availability, "UNAVAILABLE");
    assert.equal(result.slots.length, 0);
  }
});

test("custom shifts authorize only their explicit segments", () => {
  const result = phase5.calculateAvailability(base({
    schedule: {
      ...base().schedule, sourceType: "CUSTOM_SHIFT", sourceIds: ["OVR-1"],
      shiftSegments: [{ shiftStart: "16:00", shiftEnd: "18:00" }]
    }
  }));
  assert.deepEqual(result.slots.map(item => item.start), ["16:00", "16:30", "17:00"]);
  assert.equal(result.scheduleSource, "CUSTOM_SHIFT");
});

test("partial absence, planned break, and training intervals subtract slots", () => {
  const result = phase5.calculateAvailability(base({
    schedule: {
      ...base().schedule,
      blockedIntervals: [
        { type: "PLANNED_BREAK", start: "11:00", end: "12:00" },
        { type: "TRAINING", start: "13:00", end: "13:30" }
      ]
    }
  }));
  assert.deepEqual(result.slots.map(item => item.start), ["10:00", "12:00"]);
});

test("existing confirmed, proposed, and active holds are protected occupancy", () => {
  const bookings = [
    { id: "B1", status: "confirmed", date: "2099-01-02", time: "10:00", durationMinutes: 30 },
    { id: "B2", status: "proposed", proposedDate: "2099-01-02", proposedTime: "11:00", durationMinutes: 30 },
    { id: "B3", status: "pending", date: "2099-01-02", time: "12:00", durationMinutes: 30,
      holdExpiresAt: "2099-01-02T12:00:00Z" }
  ];
  const result = phase5.calculateAvailability(base({ durationMinutes: 30, bookings }));
  assert.deepEqual(result.slots.map(item => item.start), ["10:30", "11:30", "12:30", "13:00", "13:30"]);
  assert.deepEqual(bookings.map(item => item.status), ["confirmed", "proposed", "pending"]);
});

test("expired holds, cancelled, and deleted bookings do not block", () => {
  const bookings = [
    { status: "pending", date: "2099-01-02", time: "10:00", durationMinutes: 30,
      holdExpiresAt: "2000-01-01T00:00:00Z" },
    { status: "cancelled", date: "2099-01-02", time: "10:30", durationMinutes: 30 },
    { status: "confirmed", deleted: true, date: "2099-01-02", time: "11:00", durationMinutes: 30 }
  ];
  assert.equal(phase5.calculateAvailability(base({ durationMinutes: 30, bookings })).slots.length, 8);
});

test("no-check-in remains available through grace and fails closed after grace", () => {
  const during = phase5.calculateAvailability(base({
    date: "2099-01-01", today: "2099-01-01", serverNowMinute: 614
  }));
  assert.ok(during.slots.length > 0);
  const after = phase5.calculateAvailability(base({
    date: "2099-01-01", today: "2099-01-01", serverNowMinute: 616
  }));
  assert.equal(after.slots.length, 0);
  assert.equal(after.reasonCode, "NO_CHECK_IN");
});

test("late check-in restores only slots after server lead and preparation", () => {
  const result = phase5.calculateAvailability(base({
    date: "2099-01-01", today: "2099-01-01", serverNowMinute: 650,
    preparationMinutes: 10,
    attendance: { state: "CHECKED_IN", dayLifecycle: "OPEN", breaks: [] }
  }));
  assert.equal(result.slots[0].start, "11:30");
});

test("an open break blocks future customer slots and audited internal override restores them", () => {
  const openBreak = {
    state: "ON_BREAK", dayLifecycle: "OPEN", openBreak: true,
    breaks: [{ startedAt: "2099-01-01T10:30:00+02:00", endedAt: "" }]
  };
  const customer = phase5.calculateAvailability(base({
    date: "2099-01-01", today: "2099-01-01", serverNowMinute: 620, attendance: openBreak
  }));
  assert.equal(customer.slots.length, 0);
  const internal = phase5.calculateAvailability(base({
    date: "2099-01-01", today: "2099-01-01", serverNowMinute: 620,
    attendance: openBreak, audience: "internal",
    operationalOverrides: [{ operationalOverrideId: "OV-1", startTime: "10:00", endTime: "14:00" }]
  }));
  assert.ok(internal.slots.length > 0);
});

test("early checkout and absence block only new future slots", () => {
  const existing = [{ id: "B1", status: "confirmed", date: "2099-01-01", time: "13:00", durationMinutes: 30 }];
  const checkout = phase5.calculateAvailability(base({
    date: "2099-01-01", today: "2099-01-01", serverNowMinute: 660,
    bookings: existing,
    attendance: { state: "CHECKED_OUT", dayLifecycle: "OPEN",
      actualCheckOut: "2099-01-01T11:00:00+02:00", breaks: [] }
  }));
  assert.equal(checkout.slots.length, 0);
  assert.equal(existing[0].status, "confirmed");
  const absent = phase5.calculateAvailability(base({
    date: "2099-01-01", today: "2099-01-01", serverNowMinute: 600,
    attendance: { state: "ABSENT", dayLifecycle: "OPEN", breaks: [] }
  }));
  assert.equal(absent.slots.length, 0);
});

test("unresolved and reopened attendance fail closed except authorized internal override", () => {
  for (const attendance of [
    { state: "UNRESOLVED", dayLifecycle: "OPEN" },
    { state: "CHECKED_IN", dayLifecycle: "REOPENED" }
  ]) {
    const customer = phase5.calculateAvailability(base({
      date: "2099-01-01", today: "2099-01-01", attendance
    }));
    assert.equal(customer.slots.length, 0);
    const internal = phase5.calculateAvailability(base({
      date: "2099-01-01", today: "2099-01-01", attendance,
      audience: "internal",
      operationalOverrides: [{ operationalOverrideId: "OV-1", startTime: "10:00", endTime: "14:00" }]
    }));
    assert.ok(internal.slots.length > 0);
  }
});

test("unscheduled attendance and approved overtime never create planned availability", () => {
  const result = phase5.calculateAvailability(base({
    schedule: { active: true, classification: "NOT_SCHEDULED", shiftSegments: [] },
    attendance: { state: "CHECKED_IN", approvedOvertimeMinutes: 240 }
  }));
  assert.equal(result.slots.length, 0);
});

test("engine modes enforce one authority and shadow never affects output", () => {
  let legacyCalls = 0;
  let phase5Calls = 0;
  const callbacks = {
    legacy: () => { legacyCalls += 1; return { slots: ["legacy"] }; },
    phase5: () => { phase5Calls += 1; return { slots: ["phase5"] }; }
  };
  assert.deepEqual(phase5.executeAuthoritativeEngine({ mode: "LEGACY", ...callbacks }).result.slots, ["legacy"]);
  assert.equal(phase5Calls, 0);
  const shadow = phase5.executeAuthoritativeEngine({ mode: "SHADOW", ...callbacks });
  assert.deepEqual(shadow.result.slots, ["legacy"]);
  assert.equal(shadow.authority, "LEGACY");
  const cutover = phase5.executeAuthoritativeEngine({ mode: "PHASE5", ...callbacks });
  assert.deepEqual(cutover.result.slots, ["phase5"]);
  assert.equal(cutover.authority, "PHASE5");
  assert.equal(legacyCalls, 2);
  assert.equal(phase5Calls, 2);
});

test("Phase 5 mode fails closed and never invokes legacy fallback", () => {
  let legacyCalls = 0;
  assert.throws(() => phase5.executeAuthoritativeEngine({
    mode: "PHASE5",
    legacy: () => { legacyCalls += 1; return {}; },
    phase5: () => { throw new Error("schema missing"); }
  }), /schema missing/);
  assert.equal(legacyCalls, 0);
});

test("component versions and slots produce stable composite tokens", () => {
  const first = phase5.calculateAvailability(base());
  const second = phase5.calculateAvailability(base({ generatedAt: "different" }));
  assert.equal(first.availabilityToken, second.availabilityToken);
  const changed = phase5.calculateAvailability(base({
    versions: { ...base().versions, attendanceOperationalVersion: 2 }
  }));
  assert.notEqual(first.availabilityToken, changed.availabilityToken);
});

test("hybrid global and branch generations invalidate future availability deterministically", () => {
  const first = phase5.calculateAvailability(base({
    generations: {
      global: { recurringScheduleGeneration: 1, serviceGeneration: 2 },
      branch: { branchHoursGeneration: 3, bookingOccupancyGeneration: 4 }
    }
  }));
  for (const generations of [
    { global: { recurringScheduleGeneration: 2, serviceGeneration: 2 },
      branch: { branchHoursGeneration: 3, bookingOccupancyGeneration: 4 } },
    { global: { recurringScheduleGeneration: 1, serviceGeneration: 3 },
      branch: { branchHoursGeneration: 3, bookingOccupancyGeneration: 4 } },
    { global: { recurringScheduleGeneration: 1, serviceGeneration: 2 },
      branch: { branchHoursGeneration: 4, bookingOccupancyGeneration: 4 } }
  ]) {
    assert.notEqual(first.availabilityToken,
      phase5.calculateAvailability(base({ generations })).availabilityToken);
  }
});

test("generation overflow advances epoch and never emits unsafe integers", () => {
  const reset = phase5.nextGeneration(phase5.MAX_GENERATION, 7);
  assert.deepEqual(reset, { value: 1, epoch: 8, reset: true });
  assert.deepEqual(phase5.nextGeneration(8, 7), { value: 9, epoch: 7, reset: false });
  assert.equal(phase5.generationValue(Number.MAX_SAFE_INTEGER), 0);
});

test("canonical branches support explicit timezones and fail closed when inactive or ambiguous", () => {
  assert.deepEqual(phase5.validateBranchConfiguration({
    branchId: "BR-UTC", active: true, timeZone: "Etc/UTC", publicSelectable: true
  }, { publicAudience: true }), {
    branchId: "BR-UTC", active: true, timeZone: "Etc/UTC", publicSelectable: true
  });
  assert.equal(phase5.validateBranchConfiguration({
    branchId: "BR-LEGACY", active: true, timeZone: "", publicSelectable: false
  }).timeZone, "Africa/Cairo");
  assert.throws(() => phase5.validateBranchConfiguration({
    branchId: "BR-OFF", active: false, timeZone: "Africa/Cairo"
  }), error => error.code === "AVAILABILITY_BRANCH_INACTIVE");
  assert.throws(() => phase5.validateBranchConfiguration({
    branchId: "BR-PRIVATE", active: true, timeZone: "Africa/Cairo", publicSelectable: false
  }, { publicAudience: true }), error => error.code === "AVAILABILITY_BRANCH_NOT_PUBLIC");
});

test("delta polling returns unchanged, changed, removed, and full snapshot data", () => {
  const first = phase5.calculateAvailability(base());
  assert.equal(phase5.delta(first, first).unchanged, true);
  const next = phase5.calculateAvailability(base({
    schedule: { ...base().schedule, blockedIntervals: [{ start: "10:00", end: "11:00" }] }
  }));
  const result = phase5.delta(first, next);
  assert.equal(result.unchanged, false);
  assert.ok(result.removedSlots.length > 0);
  assert.ok(result.snapshot);
});

test("public DTO hides operational evidence while internal DTO is permission filtered", () => {
  const result = phase5.calculateAvailability(base());
  const publicResult = phase5.publicDto(result);
  assert.equal("versions" in publicResult, false);
  assert.equal("scheduleSourceIds" in publicResult, false);
  const limited = phase5.internalDto(result, ["booking_availability.view_operational"]);
  assert.equal(limited.scheduleSource, "RECURRING");
  assert.equal("versions" in limited, false);
  const manager = phase5.internalDto(result, [
    "booking_availability.view_operational", "booking_availability.view_restrictions",
    "booking_availability.override_internal"
  ]);
  assert.deepEqual(manager.versions, base().versions);
  assert.equal(manager.managerOverrideAllowed, true);
});

test("conflict lifecycle requires valid transition and evidence reason", () => {
  assert.equal(phase5.assertConflictTransition("OPEN", "ACKNOWLEDGED", "Manager reviewing"), true);
  assert.throws(() => phase5.assertConflictTransition("OPEN", "RESOLVED", "fixed"), /not allowed/i);
  assert.throws(() => phase5.assertConflictTransition("RESOLVED", "OPEN", "undo"), /not allowed/i);
});

test("past Booking dates fail closed even when a planned shift exists", () => {
  const result = phase5.calculateAvailability(base({
    date: "2098-12-31", today: "2099-01-01"
  }));
  assert.equal(result.availability, "UNAVAILABLE");
  assert.equal(result.reasonCode, "PAST_DATE");
  assert.deepEqual(result.slots, []);
});

test("overlapping effective schedule segments fail closed as ambiguous", () => {
  assert.throws(() => phase5.calculateAvailability(base({
    schedule: {
      ...base().schedule,
      shiftSegments: [
        { shiftStart: "10:00", shiftEnd: "12:00" },
        { shiftStart: "11:30", shiftEnd: "14:00" }
      ]
    }
  })), error => error.code === "AVAILABILITY_SCHEDULE_AMBIGUOUS");
});

test("operational overrides authorize only their fully covered interval", () => {
  const result = phase5.calculateAvailability(base({
    date: "2099-01-01", today: "2099-01-01", serverNowMinute: 620,
    attendance: { state: "ON_BREAK", dayLifecycle: "OPEN", openBreak: true, breaks: [] },
    audience: "internal",
    operationalOverrides: [{
      operationalOverrideId: "OV-NARROW", startTime: "11:00", endTime: "12:00"
    }]
  }));
  assert.deepEqual(result.slots.map(slot => slot.start), ["11:00"]);
  assert.ok(result.slots.every(slot => slot.operationalOverrideId === "OV-NARROW"));
});

test("existing Booking preparation and cleanup buffers remain protected occupancy", () => {
  const result = phase5.calculateAvailability(base({
    bookings: [{
      id: "BUFFERED", status: "confirmed", date: "2099-01-02", time: "11:00",
      durationMinutes: 30, preparationMinutes: 30, cleanupMinutes: 30
    }]
  }));
  assert.deepEqual(result.slots.map(slot => slot.start), ["12:00", "12:30", "13:00"]);
});

test("immutable Booking buffer snapshots do not change when current Service buffers change", () => {
  const booking = {
    id: "SNAPSHOT", status: "confirmed", date: "2099-01-02", time: "11:00",
    durationMinutes: 30, preparationMinutes: 0, cleanupMinutes: 0,
    serviceDurationSnapshot: 30, preparationMinutesSnapshot: 30,
    cleanupMinutesSnapshot: 30, serviceConfigurationVersion: "service-v1"
  };
  const before = phase5.calculateAvailability(base({ bookings: [booking] }));
  booking.preparationMinutes = 120;
  booking.cleanupMinutes = 120;
  const after = phase5.calculateAvailability(base({ bookings: [booking] }));
  assert.deepEqual(after.slots, before.slots);
  assert.equal(after.availabilityToken, before.availabilityToken);
});

test("persisted occupied interval is authoritative and malformed intervals fail closed", () => {
  const input = base();
  input.bookings = [{
    id: "B-SNAPSHOT", employeeId: "S-1", date: input.date, time: "10:00",
    status: "confirmed", durationMinutes: 30,
    serviceDurationSnapshot: 30, preparationMinutesSnapshot: 0,
    cleanupMinutesSnapshot: 0, occupiedStartTime: "09:30",
    occupiedEndTime: "11:00", serviceConfigurationVersion: "SERVICE-HASH-1"
  }];
  const result = phase5.calculateAvailability(input);
  assert.equal(result.slots.some(slot => slot.start === "10:30"), false);
  input.bookings[0].occupiedEndTime = "";
  assert.throws(() => phase5.calculateAvailability(input),
    error => error.code === "AVAILABILITY_BOOKING_SNAPSHOT_INVALID");
});

test("cross-midnight service and exact lead/grace boundaries are deterministic", () => {
  const overnight = phase5.calculateAvailability(base({
    durationMinutes: 60,
    branchSegments: [{ start: "20:00", end: "03:00" }],
    schedule: {
      ...base().schedule,
      shiftSegments: [{ shiftStart: "22:00", shiftEnd: "02:00" }]
    }
  }));
  assert.ok(overnight.slots.some(slot => slot.start === "23:30" && slot.end === "00:30"));
  const exactGrace = phase5.calculateAvailability(base({
    date: "2099-01-01", today: "2099-01-01", serverNowMinute: 615
  }));
  assert.ok(exactGrace.slots.length > 0);
  const exactLead = phase5.calculateAvailability(base({
    date: "2099-01-01", today: "2099-01-01", serverNowMinute: 615,
    attendance: { state: "CHECKED_IN", dayLifecycle: "OPEN", breaks: [] }
  }));
  assert.equal(exactLead.slots[0].start, "10:30");
});

test("a hold expiring exactly at the trusted server timestamp no longer blocks", () => {
  const expiry = "2099-01-02T08:00:00.000Z";
  const result = phase5.calculateAvailability(base({
    serverNowMs: Date.parse(expiry),
    bookings: [{
      status: "pending", date: "2099-01-02", time: "10:00",
      durationMinutes: 30, holdExpiresAt: expiry
    }]
  }));
  assert.ok(result.slots.some(slot => slot.start === "10:00"));
});

test("migration preview is append-only, zero-write, available in Staging, and blocked in Production", () => {
  const existing = {
    Bookings: ["ID"], SERVICES: ["NAME"],
    BRANCH_BOOKING_HOURS: ["BRANCH_HOURS_ID"]
  };
  const plan = phase5.planMigration(existing, {
    environment: "development", expectedSpreadsheetId: "sheet", actualSpreadsheetId: "sheet"
  });
  assert.equal(plan.executionAllowed, false);
  assert.equal(plan.dryRun, true);
  assert.equal(plan.environment, "development");
  assert.equal(plan.writes, 0);
  assert.equal(plan.historicalRowsTouched, 0);
  assert.ok(plan.plannedCreatedSheets.includes("BOOKING_AVAILABILITY_VERSIONS"));
  assert.ok(plan.plannedAppendedColumns.Bookings.includes("BRANCH_ID"));
  assert.ok(plan.plannedAppendedColumns.Bookings.includes("PREPARATION_MINUTES_SNAPSHOT"));
  assert.ok(plan.plannedCreatedSheets.includes("BOOKING_AVAILABILITY_TRANSACTIONS"));
  assert.ok(plan.plannedCreatedSheets.includes("BOOKING_BRANCH_REGISTRY"));
  assert.ok(plan.plannedAppendedColumns.SERVICES.includes("PREPARATION_MINUTES"));
  const staging = phase5.planMigration({}, {
    environment: "staging", expectedSpreadsheetId: "sheet", actualSpreadsheetId: "sheet"
  });
  assert.equal(staging.blocked, false);
  assert.equal(staging.executionAllowed, false);
  assert.equal(staging.writes, 0);
  const blocked = phase5.planMigration({}, {
    environment: "production", expectedSpreadsheetId: "sheet", actualSpreadsheetId: "sheet"
  });
  assert.equal(blocked.blocked, true);
  assert.equal(blocked.errors[0].code, "PHASE5_ENVIRONMENT_BLOCKED");
});

test("migration preview blocks duplicate, reordered, and unknown Phase 5 schema headers", () => {
  const identity = {
    environment: "test", expectedSpreadsheetId: "sheet", actualSpreadsheetId: "sheet"
  };
  const duplicate = phase5.planMigration({
    BRANCH_BOOKING_HOURS: ["BRANCH_HOURS_ID", "BRANCH_ID", "branch id"],
    Bookings: ["ID"], SERVICES: ["NAME"]
  }, identity);
  assert.ok(duplicate.errors.some(error => error.code === "PHASE5_DUPLICATE_HEADERS"));
  const reordered = phase5.planMigration({
    BRANCH_BOOKING_HOURS: ["BRANCH_ID", "BRANCH_HOURS_ID"],
    Bookings: ["ID", "SCHEDULE_VERSION"],
    SERVICES: ["NAME", "CLEANUP_MINUTES"]
  }, identity);
  assert.ok(reordered.errors.some(error => error.code === "PHASE5_SCHEMA_ORDER_INCOMPATIBLE"));
  assert.ok(reordered.errors.some(error => error.code === "PHASE5_APPEND_ORDER_INCOMPATIBLE"));
  const unknown = phase5.planMigration({
    BRANCH_BOOKING_HOURS: ["BRANCH_HOURS_ID", "UNREVIEWED_COLUMN"],
    Bookings: ["ID"], SERVICES: ["NAME"]
  }, identity);
  assert.ok(unknown.errors.some(error => error.code === "PHASE5_UNKNOWN_SCHEMA_COLUMNS"));
  assert.equal(unknown.writes, 0);
});
