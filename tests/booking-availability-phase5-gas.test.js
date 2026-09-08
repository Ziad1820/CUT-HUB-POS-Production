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
  rows.STAFF_WORK_POLICIES = [];
  rows.STAFF_ATTENDANCE_IDEMPOTENCY = [];
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
  const scriptProperties = {};
  const configuredProperties = {
    BOOKING_AVAILABILITY_ENGINE: "PHASE5",
    BOOKING_PHASE2_PLANNED_ENABLED: "true",
    BOOKING_ATTENDANCE_LIVE_ENABLED: "true",
    BOOKING_MANAGER_OVERRIDE_ENABLED: "true",
    BOOKING_CONFLICT_RESOLUTION_ENABLED: "true",
    BOOKING_NO_CHECK_IN_DETECTOR_ENABLED: "true"
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
        getProperty: name => Object.prototype.hasOwnProperty.call(scriptProperties, name)
          ? scriptProperties[name] : configuredProperties[name] || "",
        setProperty: (name, value) => { scriptProperties[name] = String(value); },
        deleteProperty: name => { delete scriptProperties[name]; }
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
  return { context, rows, writes, clock, identity, scriptProperties };
}

function clockHarness() {
  const h = harness();
  const originalFormat = h.context.Utilities.formatDate;
  h.context.Utilities.formatDate = (date, zone, format) => format === "HH:mm"
    ? new Intl.DateTimeFormat("en-GB", {
      timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).format(date)
    : originalFormat(date, zone, format);
  return h;
}

const sheetNoon = () => new Date("1899-12-30T09:54:51.000Z");
const sheetTwoAm = () => new Date("1899-12-29T23:54:51.000Z");

function availabilityForClockSegments(branchSegments) {
  return phase5.calculateAvailability({
    branchId: "BR-1", date: "2099-01-02", today: "2099-01-01",
    staff: { staffId: "STAFF-1", branchId: "BR-1", active: true },
    branchSegments, durationMinutes: 60, preparationMinutes: 0, cleanupMinutes: 0,
    schedule: {
      active: true, classification: "WORKING_DAY",
      shiftSegments: [{ shiftStart: "12:00", shiftEnd: "02:00" }]
    }
  });
}

test("Phase 5 clock text formats typed Sheets time Dates in Cairo including historical offset", () => {
  const { context } = clockHarness();
  assert.equal(context.bookingAvailabilityPhase5ClockText(sheetNoon(), "Africa/Cairo"), "12:00");
  assert.equal(context.bookingAvailabilityPhase5ClockText(sheetTwoAm(), "Africa/Cairo"), "02:00");
});

test("Phase 5 clock text normalizes only valid clock strings and preserves blanks", () => {
  const { context } = clockHarness();
  for (const [value, expected] of [["12:00", "12:00"], ["2:00", "02:00"],
    ["0:00", "00:00"], ["23:59", "23:59"], ["", ""], ["  ", ""], [null, ""], [undefined, ""]]) {
    assert.equal(context.bookingAvailabilityPhase5ClockText(value), expected);
  }
});

test("Phase 5 clock text leaves malformed nonblank values invalid instead of inventing clocks", () => {
  const { context } = clockHarness();
  for (const value of ["24:00", "12:60", "2:0", "002:00", "12:00:00", "noon",
    "1899-12-30T09:54:51.000Z", 0, 0.5, false, new Date(NaN)]) {
    const text = context.bookingAvailabilityPhase5ClockText(value);
    assert.notEqual(text, "");
    assert.equal(context.bookingAvailabilityPhase5ClockMinutes(text), null);
    assert.throws(() => availabilityForClockSegments([{ start: text, end: "02:00" }]),
      error => error.code === "AVAILABILITY_INTERVAL_INVALID");
  }
});

test("Phase 5 clock text honors explicit zone and both default timezone fallbacks", () => {
  const { context } = clockHarness();
  assert.equal(context.bookingAvailabilityPhase5ClockText(sheetNoon(), "UTC"), "09:54");
  assert.equal(context.bookingAvailabilityPhase5ClockText(sheetNoon()), "12:00");
  context.BookingAvailabilityPhase5 = { ...phase5, TIME_ZONE: "" };
  assert.equal(context.bookingAvailabilityPhase5ClockText(sheetNoon()), "12:00");
  assert.throws(() => context.bookingAvailabilityPhase5ClockText(sheetNoon(), "invalid-zone"));
});

function addClockRows(h, timeZone = "Africa/Cairo") {
  h.rows.BOOKING_BRANCH_REGISTRY.push({ branchId: "BR-1", timeZone, active: true });
  h.rows.BRANCH_BOOKING_HOURS.push({
    branchHoursId: "BR-1-FRIDAY", branchId: "BR-1", weekday: "FRIDAY", active: true,
    openTime: sheetNoon(), closeTime: sheetTwoAm()
  });
}

test("Phase 5 branch segments normalize both direct and snapshot Date rows across midnight", () => {
  const h = clockHarness();
  addClockRows(h);
  const snapshot = h.context.bookingAvailabilityPhase5RequestSnapshot();
  for (const rows of [undefined, snapshot.branchHours]) {
    const segments = h.context.bookingAvailabilityPhase5BranchSegments("BR-1", "2099-01-02", "Africa/Cairo", rows);
    assert.deepEqual(JSON.parse(JSON.stringify(segments)), [{ start: "12:00", end: "02:00" }]);
    const availability = availabilityForClockSegments(segments);
    assert.equal(availability.slots[0].start, "12:00");
    assert.equal(availability.slots.at(-1).start, "01:00");
  }
  assert.equal(h.writes.length, 0);
});

test("Phase 5 branch listing serializes typed clocks as HH:mm without writes", () => {
  const h = clockHarness();
  addClockRows(h);
  const response = h.context.handleBookingAvailabilityPhase5Action({ action: "listBookingBranches" });
  assert.equal(response.status, "success");
  const serialized = JSON.parse(JSON.stringify(response));
  assert.equal(serialized.branchHours[0].openTime, "12:00");
  assert.equal(serialized.branchHours[0].closeTime, "02:00");
  assert.equal(h.writes.length, 0);
});

test("Phase 5 hours listing uses the matching branch timezone or default when unavailable", () => {
  const h = clockHarness();
  addClockRows(h, "UTC");
  assert.equal(h.context.bookingAvailabilityPhase5ListBranchHours({ owner: true })[0].openTime, "09:54");
  h.rows.BOOKING_BRANCH_REGISTRY.length = 0;
  assert.equal(h.context.bookingAvailabilityPhase5ListBranchHours({ owner: true })[0].openTime, "12:00");
});

test("Phase 5 restores typed time cells after the actual shared reader serializes them to ISO", () => {
  const h = clockHarness();
  addClockRows(h);
  const headers = ["BRANCH_ID", "WEEKDAY", "OPEN_TIME", "CLOSE_TIME", "ACTIVE"];
  const cells = [["BR-1", "FRIDAY", sheetNoon(), sheetTwoAm(), true]];
  const sheet = {
    getLastRow: () => cells.length + 1, getLastColumn: () => headers.length,
    getRange: (row, column, count, width) => ({
      getValues: () => cells.slice(row - 2, row - 2 + count).map(values => values.slice(column - 1, column - 1 + width))
    })
  };
  const sharedSource = fs.readFileSync(path.resolve(__dirname, "../scripts/staff-scheduling-phase2-gas.js"), "utf8");
  const readerSource = sharedSource.slice(sharedSource.indexOf("function schedulePhase2ReadRows("),
    sharedSource.indexOf("function schedulePhase2CellValue("));
  const previousReader = h.context.schedulePhase2ReadRows;
  vm.runInContext(readerSource, h.context);
  const sharedReader = h.context.schedulePhase2ReadRows;
  h.context.schedulePhase2Sheet = () => sheet;
  h.context.schedulePhase2Headers = () => headers;
  h.context.schedulePhase2AssertNoDuplicateHeaders = () => {};
  h.context.schedulePhase2Camel = camel;
  h.context.schedulePhase2ReadRows = name => name === "BRANCH_BOOKING_HOURS" ? sharedReader(name) : previousReader(name);
  const oldGetSheet = h.context.SpreadsheetApp.getActive().getSheetByName;
  h.context.SpreadsheetApp.getActive = () => ({
    getId: () => "sheet-test", getSheetByName: name => name === "BRANCH_BOOKING_HOURS" ? sheet : oldGetSheet(name)
  });
  assert.equal(sharedReader("BRANCH_BOOKING_HOURS")[0].openTime, "1899-12-30T09:54:51.000Z");
  const snapshot = h.context.bookingAvailabilityPhase5RequestSnapshot();
  assert.deepEqual(JSON.parse(JSON.stringify(h.context.bookingAvailabilityPhase5BranchSegments(
    "BR-1", "2099-01-02", "Africa/Cairo", snapshot.branchHours))), [{ start: "12:00", end: "02:00" }]);
  assert.equal(h.context.handleBookingAvailabilityPhase5Action({ action: "listBookingBranches" }).branchHours[0].openTime, "12:00");
  // A literal timestamp string in the sheet is not a typed time cell.
  cells[0][2] = "1899-12-30T09:54:51.000Z";
  const malformed = h.context.bookingAvailabilityPhase5BranchSegments("BR-1", "2099-01-02", "Africa/Cairo")[0];
  assert.equal(h.context.bookingAvailabilityPhase5ClockMinutes(malformed.start), null);
  assert.equal(h.writes.length, 0);
});

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

test("pre-write safe writer failure is compensated with zero effects and identical retry commits", () => {
  const { context, rows } = harness();
  let writerAvailable = false;
  let businessRows = 0;
  let versionWrites = 0;
  let auditWrites = 0;
  const options = {
    data: {}, requestId: "request-safe-writer-retry", action: "BOOKING_CREATE",
    entityType: "BOOKING", entityId: "B-SAFE", branchId: "BR-1", date: "2099-01-02",
    business: () => {
      if (!writerAvailable) throw Object.assign(new Error("SAFE_SHEET_WRITE_UNAVAILABLE"), {
        code: "SAFE_SHEET_WRITE_UNAVAILABLE", businessMutationState: "NOT_STARTED"
      });
      businessRows += 1;
      return { id: "B-SAFE" };
    },
    version: () => { versionWrites += 1; return { value: versionWrites }; },
    audit: () => { auditWrites += 1; return { auditId: "A-SAFE" }; },
    compensateBusiness: () => { throw new Error("must not compensate a proven pre-write failure"); },
    response: value => ({ ok: true, bookingId: value.id })
  };
  assert.throws(() => context.bookingAvailabilityPhase5RunTransaction(options),
    error => error.code === "SAFE_SHEET_WRITE_UNAVAILABLE");
  const transaction = rows.BOOKING_AVAILABILITY_TRANSACTIONS[0];
  assert.equal(transaction.status, "COMPENSATED");
  assert.deepEqual(Array.from(transaction.compensationState.steps), ["BUSINESS_NOT_WRITTEN"]);
  assert.equal(businessRows, 0);
  assert.equal(versionWrites, 0);
  assert.equal(auditWrites, 0);
  assert.equal(rows.Bookings.length, 0);

  writerAvailable = true;
  assert.deepEqual(context.bookingAvailabilityPhase5RunTransaction(options), {
    ok: true, bookingId: "B-SAFE"
  });
  assert.equal(rows.BOOKING_AVAILABILITY_TRANSACTIONS.length, 1);
  assert.equal(rows.BOOKING_AVAILABILITY_TRANSACTIONS[0].transactionId, transaction.transactionId);
  assert.equal(rows.BOOKING_AVAILABILITY_TRANSACTIONS[0].status, "COMMITTED");
  assert.equal(businessRows, 1);
  assert.equal(versionWrites, 1);
  assert.equal(auditWrites, 1);
});

test("rolled-back Schedule validation errors are compensated without a recovery marker", () => {
  const { context, rows } = harness();
  assert.throws(() => context.bookingAvailabilityPhase5RunOperationalMutationTransaction(
    "schedule", { action: "saveScheduleSegment", requestId: "schedule-overlap-safe" },
    () => { throw Object.assign(new Error("Schedule overlap."), {
      code: "SCHEDULE_SHIFT_CONFLICT"
    }); }), error => error.code === "SCHEDULE_SHIFT_CONFLICT");
  const transaction = rows.BOOKING_AVAILABILITY_TRANSACTIONS[0];
  assert.equal(transaction.status, "COMPENSATED");
  assert.equal(transaction.recoveryRequired, false);
  assert.deepEqual(Array.from(transaction.compensationState.steps), ["BUSINESS_NOT_WRITTEN"]);

  const uncertain = harness();
  assert.throws(() => uncertain.context.bookingAvailabilityPhase5RunOperationalMutationTransaction(
    "schedule", { action: "saveScheduleSegment", requestId: "schedule-uncertain" },
    () => { throw Object.assign(new Error("Rollback incomplete."), {
      code: "SCHEDULE_COMPENSATION_FAILED"
    }); }), error => error.code === "AVAILABILITY_RECOVERY_REQUIRED");
  assert.equal(uncertain.rows.BOOKING_AVAILABILITY_TRANSACTIONS[0].status,
    "RECOVERY_REQUIRED");
});

test("caught failure after durable intent is retryable but an unexplained stranded intent is not", () => {
  const caught = harness();
  const options = {
    data: { phase5FailurePoint: "INTENT" }, requestId: "request-intent-caught",
    action: "BOOKING_CREATE", entityType: "BOOKING", entityId: "B-INTENT",
    branchId: "BR-1", date: "2099-01-02",
    business: () => ({ id: "B-INTENT" }), version: () => ({ value: 1 }),
    audit: () => ({ auditId: "A-INTENT" }), compensateBusiness: () => {}
  };
  assert.throws(() => caught.context.bookingAvailabilityPhase5RunTransaction(options),
    error => error.code === "AVAILABILITY_INJECTED_FAILURE");
  assert.equal(caught.rows.BOOKING_AVAILABILITY_TRANSACTIONS[0].status, "COMPENSATED");
  assert.deepEqual(Array.from(
    caught.rows.BOOKING_AVAILABILITY_TRANSACTIONS[0].compensationState.steps),
  ["BUSINESS_NOT_STARTED"]);
  options.data = {};
  assert.deepEqual(caught.context.bookingAvailabilityPhase5RunTransaction(options), { id: "B-INTENT" });

  const stranded = harness();
  stranded.rows.BOOKING_AVAILABILITY_TRANSACTIONS.push({
    transactionId: "BAT-STRANDED", requestId: "request-intent-stranded",
    action: "BOOKING_CREATE", status: "INTENT", writeBoundary: "INTENT",
    compensationState: {}, recoveryRequired: false
  });
  assert.throws(() => stranded.context.bookingAvailabilityPhase5RunTransaction({
    ...options, requestId: "request-intent-stranded"
  }), error => error.code === "AVAILABILITY_RECOVERY_REQUIRED");
});

test("uncertain business failure must compensate before retry or remain recovery-required", () => {
  const compensated = harness();
  let compensatedEntity = 0;
  let compensatedAttempt = 0;
  const compensatedOptions = {
    data: {}, requestId: "request-business-compensated", action: "BOOKING_CREATE",
    entityType: "BOOKING", entityId: "B-COMP", branchId: "BR-1", date: "2099-01-02",
    business: () => {
      compensatedAttempt += 1;
      compensatedEntity = 1;
      if (compensatedAttempt === 1) throw new Error("outcome uncertain after write");
      return { id: "B-COMP" };
    },
    version: () => ({ value: 1 }), audit: () => ({ auditId: "A-COMP" }),
    compensateBusiness: () => { compensatedEntity = 0; }
  };
  assert.throws(() => compensated.context.bookingAvailabilityPhase5RunTransaction(compensatedOptions),
    /outcome uncertain/);
  assert.equal(compensatedEntity, 0);
  assert.equal(compensated.rows.BOOKING_AVAILABILITY_TRANSACTIONS[0].status, "COMPENSATED");
  assert.deepEqual(
    compensated.context.bookingAvailabilityPhase5RunTransaction(compensatedOptions),
    { id: "B-COMP" });
  assert.equal(compensatedEntity, 1);

  const uncertain = harness();
  let uncertainBusinessCalls = 0;
  const uncertainOptions = {
    data: {}, requestId: "request-business-uncertain", action: "BOOKING_CREATE",
    entityType: "BOOKING", entityId: "B-UNCERTAIN", branchId: "BR-1", date: "2099-01-02",
    business: () => { uncertainBusinessCalls += 1; throw new Error("write result unknown"); },
    compensateBusiness: () => { throw new Error("compensation could not prove rollback"); }
  };
  assert.throws(() => uncertain.context.bookingAvailabilityPhase5RunTransaction(uncertainOptions),
    error => error.code === "AVAILABILITY_RECOVERY_REQUIRED");
  assert.equal(uncertain.rows.BOOKING_AVAILABILITY_TRANSACTIONS[0].status, "RECOVERY_REQUIRED");
  assert.throws(() => uncertain.context.bookingAvailabilityPhase5RunTransaction(uncertainOptions),
    error => error.code === "AVAILABILITY_RECOVERY_REQUIRED");
  assert.equal(uncertainBusinessCalls, 1);
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

test("one-day Work Policy derives STAFF branch and invalidates one date exactly once", () => {
  const { context, rows } = harness();
  rows.STAFF.push({ staffId: "S-1", branchId: "BR-1", active: true });
  rows.BOOKING_BRANCH_REGISTRY.push({
    branchId: "BR-1", branchName: "Main", active: true,
    timeZone: "Africa/Cairo", publicSelectable: true, closureStatus: "OPEN"
  });
  const result = context.bookingAvailabilityPhase5RunOperationalMutationTransaction(
    "attendance", {
      action: "createWorkPolicy", requestId: "policy-scope-one-day",
      policy: { staffId: "S-1", effectiveFrom: "2099-01-02", effectiveTo: "2099-01-02" }
    }, () => ({ status: "success", code: "CREATE_WORK_POLICY_OK", workPolicy: {
      policyId: "POL-1", staffId: "S-1", effectiveFrom: "2099-01-02",
      effectiveTo: "2099-01-02", active: true
    } }));
  assert.equal(result.workPolicy.policyId, "POL-1");
  assert.equal(rows.BOOKING_AVAILABILITY_GENERATIONS.length, 1);
  assert.equal(rows.BOOKING_AVAILABILITY_GENERATIONS[0].scopeType, "BRANCH");
  assert.equal(rows.BOOKING_AVAILABILITY_GENERATIONS[0].scopeId, "BR-1");
  assert.equal(rows.BOOKING_AVAILABILITY_GENERATIONS[0].attendanceOperationalGeneration, 1);
  assert.equal(rows.BOOKING_AVAILABILITY_VERSIONS.length, 1);
  assert.equal(rows.BOOKING_AVAILABILITY_VERSIONS[0].branchId, "BR-1");
  assert.equal(rows.BOOKING_AVAILABILITY_VERSIONS[0].date, "2099-01-02");
  assert.equal(rows.BOOKING_AVAILABILITY_VERSIONS[0].attendanceOperationalVersion, 1);
  assert.equal(rows.BOOKING_AVAILABILITY_AUDIT.length, 1);
  assert.equal(rows.BOOKING_AVAILABILITY_TRANSACTIONS[0].status, "COMMITTED");
  assert.equal(rows.BOOKING_AVAILABILITY_TRANSACTIONS[0].branchId, "BR-1");
});

test("multi-day Work Policy invalidates every bounded date and one branch generation", () => {
  const { context, rows } = harness();
  rows.STAFF.push({ staffId: "S-1", branchId: "BR-1", active: true });
  rows.BOOKING_BRANCH_REGISTRY.push({
    branchId: "BR-1", branchName: "Main", active: true,
    timeZone: "Africa/Cairo", publicSelectable: true, closureStatus: "OPEN"
  });
  context.bookingAvailabilityPhase5RunOperationalMutationTransaction("attendance", {
    action: "createWorkPolicy", requestId: "policy-scope-multi-day",
    policy: { staffId: "S-1", effectiveFrom: "2099-01-02", effectiveTo: "2099-01-04" }
  }, () => ({ status: "success", code: "CREATE_WORK_POLICY_OK", workPolicy: {
    policyId: "POL-MULTI", staffId: "S-1", effectiveFrom: "2099-01-02",
    effectiveTo: "2099-01-04", active: true
  } }));
  assert.deepEqual(Array.from(rows.BOOKING_AVAILABILITY_VERSIONS, item => item.date),
    ["2099-01-02", "2099-01-03", "2099-01-04"]);
  assert.equal(rows.BOOKING_AVAILABILITY_GENERATIONS.length, 1);
  assert.equal(rows.BOOKING_AVAILABILITY_GENERATIONS[0].attendanceOperationalGeneration, 1);
});

test("Work Policy scope fails before business write for missing or forged STAFF branch", () => {
  const missing = harness();
  missing.rows.STAFF.push({ staffId: "S-1", branchId: "", active: true });
  let missingBusinessCalls = 0;
  assert.throws(() => missing.context.bookingAvailabilityPhase5RunOperationalMutationTransaction(
    "attendance", {
      action: "createWorkPolicy", requestId: "policy-missing-branch",
      policy: { staffId: "S-1", effectiveFrom: "2099-01-02", effectiveTo: "2099-01-02" }
    }, () => { missingBusinessCalls += 1; return {}; }),
  error => error.code === "AVAILABILITY_POLICY_STAFF_BRANCH_REQUIRED");
  assert.equal(missingBusinessCalls, 0);
  assert.equal(missing.rows.BOOKING_AVAILABILITY_TRANSACTIONS.length, 0);

  const forged = harness();
  forged.rows.STAFF.push({ staffId: "S-1", branchId: "BR-1", active: true });
  forged.rows.BOOKING_BRANCH_REGISTRY.push({
    branchId: "BR-1", branchName: "Main", active: true,
    timeZone: "Africa/Cairo", publicSelectable: true, closureStatus: "OPEN"
  });
  let forgedBusinessCalls = 0;
  assert.throws(() => forged.context.bookingAvailabilityPhase5RunOperationalMutationTransaction(
    "attendance", {
      action: "createWorkPolicy", requestId: "policy-forged-branch", branchId: "BR-2",
      policy: { staffId: "S-1", effectiveFrom: "2099-01-02", effectiveTo: "2099-01-02" }
    }, () => { forgedBusinessCalls += 1; return {}; }),
  error => error.code === "AVAILABILITY_POLICY_BRANCH_SCOPE_MISMATCH");
  assert.equal(forgedBusinessCalls, 0);
  assert.equal(forged.rows.BOOKING_AVAILABILITY_TRANSACTIONS.length, 0);
});

test("recovery completes the existing Work Policy transaction without duplicate effects", () => {
  const { context, rows, identity } = harness();
  rows.STAFF.push({ staffId: "S-1", branchId: "BR-1", active: true });
  rows.BOOKING_BRANCH_REGISTRY.push({
    branchId: "BR-1", branchName: "Main", active: true,
    timeZone: "Africa/Cairo", publicSelectable: true, closureStatus: "OPEN"
  });
  const businessState = { status: "success", code: "CREATE_WORK_POLICY_OK", workPolicy: {
    policyId: "POL-RECOVER", staffId: "S-1", effectiveFrom: "2099-01-02",
    effectiveTo: "2099-01-02", active: true
  } };
  rows.STAFF_WORK_POLICIES.push({
    policyId: "POL-RECOVER", staffId: "S-1", effectiveFrom: "2099-01-02",
    effectiveTo: "2099-01-02", active: true
  });
  rows.STAFF_ATTENDANCE_IDEMPOTENCY.push({
    requestId: "policy-recovery-original", action: "createWorkPolicy",
    status: "COMPLETED", response: businessState
  });
  rows.BOOKING_AVAILABILITY_TRANSACTIONS.push({
    transactionId: "BAT-RECOVER", requestId: "policy-recovery-original",
    action: "ATTENDANCE_AVAILABILITY_INVALIDATION", entityType: "ATTENDANCE_MUTATION",
    actorId: "owner-1", environment: "test", status: "RECOVERY_REQUIRED",
    writeBoundary: "FAILED", beforeState: {}, businessState,
    versionState: {}, auditState: {}, result: {},
    errorCode: "AVAILABILITY_GENERATION_SCOPE_INVALID",
    errorMessage: "Availability generation scope is invalid.",
    compensationState: { attempted: true, completed: false }, recoveryRequired: true
  });
  const input = {
    transactionId: "BAT-RECOVER", originalRequestId: "policy-recovery-original",
    requestId: "policy-recovery-attempt-01"
  };
  const first = context.bookingAvailabilityPhase5RecoverWorkPolicyTransaction(
    input, identity.actor);
  assert.equal(first.recovered, true);
  assert.equal(first.replay, false);
  assert.equal(rows.BOOKING_AVAILABILITY_TRANSACTIONS[0].status, "COMMITTED");
  assert.equal(rows.BOOKING_AVAILABILITY_TRANSACTIONS[0].recoveryRequired, false);
  assert.equal(rows.BOOKING_AVAILABILITY_GENERATIONS.length, 1);
  assert.equal(rows.BOOKING_AVAILABILITY_VERSIONS.length, 1);
  assert.equal(rows.BOOKING_AVAILABILITY_AUDIT.length, 1);
  const counts = {
    generations: rows.BOOKING_AVAILABILITY_GENERATIONS.length,
    versions: rows.BOOKING_AVAILABILITY_VERSIONS.length,
    audits: rows.BOOKING_AVAILABILITY_AUDIT.length
  };
  const replay = context.bookingAvailabilityPhase5RecoverWorkPolicyTransaction(
    input, identity.actor);
  assert.equal(replay.replay, true);
  assert.deepEqual(counts, {
    generations: rows.BOOKING_AVAILABILITY_GENERATIONS.length,
    versions: rows.BOOKING_AVAILABILITY_VERSIONS.length,
    audits: rows.BOOKING_AVAILABILITY_AUDIT.length
  });
});

test("recovery safely clears a legacy no-effect Schedule validation marker", () => {
  const { context, rows, identity, scriptProperties } = harness();
  rows.BOOKING_AVAILABILITY_TRANSACTIONS.push({
    transactionId: "BAT-SCHEDULE-VALIDATION", requestId: "schedule-overlap-legacy",
    action: "SCHEDULE_AVAILABILITY_INVALIDATION", entityType: "SCHEDULE_MUTATION",
    actorId: "owner-1", environment: "test", status: "RECOVERY_REQUIRED",
    writeBoundary: "FAILED", beforeState: {}, businessState: {}, versionState: {},
    auditState: {}, result: {}, errorCode: "SCHEDULE_SHIFT_CONFLICT",
    errorMessage: "Schedule segment conflicts with an active segment.",
    compensationState: { attempted: true, completed: false,
      errorCode: "AVAILABILITY_COMPENSATION_UNAVAILABLE" }, recoveryRequired: true
  });
  const input = { transactionId: "BAT-SCHEDULE-VALIDATION",
    originalRequestId: "schedule-overlap-legacy", requestId: "recover-schedule-safe" };
  const recovered = context.bookingAvailabilityPhase5RecoverWorkPolicyTransaction(
    input, identity.actor);
  assert.equal(recovered.compensated, true);
  assert.equal(recovered.replay, false);
  assert.equal(rows.BOOKING_AVAILABILITY_TRANSACTIONS[0].status, "COMPENSATED");
  assert.equal(rows.BOOKING_AVAILABILITY_TRANSACTIONS[0].recoveryRequired, false);
  assert.equal(rows.BOOKING_AVAILABILITY_GENERATIONS.length, 0);
  assert.equal(rows.BOOKING_AVAILABILITY_AUDIT.length, 0);
  assert.equal(context.bookingAvailabilityPhase5RecoverWorkPolicyTransaction(
    input, identity.actor).replay, true);

  rows.BOOKING_AVAILABILITY_TRANSACTIONS[0].status = "RECOVERY_REQUIRED";
  rows.BOOKING_AVAILABILITY_TRANSACTIONS[0].recoveryRequired = true;
  scriptProperties["SCHEDULE_RECOVERY_schedule-overlap-legacy"] = "uncertain";
  assert.throws(() => context.bookingAvailabilityPhase5RecoverWorkPolicyTransaction(
    input, identity.actor), error => error.code === "AVAILABILITY_RECOVERY_STATE_UNSUPPORTED");
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

test("operational override persists the validated staff identity and commits once", () => {
  const { context, rows, identity } = harness();
  rows.BOOKING_BRANCH_REGISTRY.push({
    branchId: "BR-1", branchName: "Main", active: true,
    timeZone: "Africa/Cairo", publicSelectable: true, closureStatus: "OPEN"
  });
  rows.STAFF.push({ staffId: "S-1", branchId: "BR-1", active: true });
  identity.actor = {
    actorId: "manager-1", role: "MANAGER", owner: false, branchIds: ["BR-1"],
    permissions: ["booking_availability.manage_override", "booking_availability.override_internal"]
  };
  const input = {
    branchId: "BR-1", staffId: "S-1", date: "2099-01-02",
    startTime: "10:30", endTime: "11:00", reason: "controlled test",
    clientRequestId: "override-create-01"
  };
  const created = context.bookingAvailabilityPhase5CreateOverride(input, identity.actor);
  assert.equal(created.staffId, "S-1");
  assert.equal(rows.BOOKING_OPERATIONAL_OVERRIDES.length, 1);
  assert.equal(rows.BOOKING_OPERATIONAL_OVERRIDES[0].staffId, "S-1");
  assert.equal(rows.BOOKING_AVAILABILITY_TRANSACTIONS[0].status, "COMMITTED");
  assert.equal(rows.BOOKING_AVAILABILITY_AUDIT.length, 1);
  const replay = context.bookingAvailabilityPhase5CreateOverride(input, identity.actor);
  assert.equal(replay.operationalOverrideId, created.operationalOverrideId);
  assert.equal(rows.BOOKING_OPERATIONAL_OVERRIDES.length, 1);
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
