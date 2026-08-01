const assert = require("node:assert/strict");
const scheduling = require("../scripts/staff-scheduling-phase2");

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function expectCode(code, fn) {
  assert.throws(fn, (error) => error && error.code === code);
}

const staff = { staffId: "STAFF-1", staffName: "Mona", branchId: "BR-1", active: true };
const baseSegment = {
  staffId: "STAFF-1", weekday: "MONDAY", shiftStart: "09:00", shiftEnd: "17:00",
  segmentIndex: 1, requiredWorkMinutes: 420, allowedBreakMinutes: 60,
  effectiveFrom: "2026-01-01", effectiveTo: "", active: true
};

test("validates split and overnight recurring segments", () => {
  const split = scheduling.validateScheduleSegment(baseSegment, { staff });
  const overnight = scheduling.validateScheduleSegment({
    ...baseSegment, weekday: "FRIDAY", shiftStart: "22:00", shiftEnd: "06:00"
  }, { staff });
  assert.equal(split.durationMinutes, 480);
  assert.equal(overnight.durationMinutes, 480);
});

test("rejects overlapping recurring segments including week boundary", () => {
  const first = scheduling.validateScheduleSegment(baseSegment, { staff });
  const overlap = scheduling.validateScheduleSegment({
    ...baseSegment, shiftStart: "16:30", shiftEnd: "20:00", segmentIndex: 2,
    requiredWorkMinutes: 180, allowedBreakMinutes: 0
  }, { staff });
  expectCode("SCHEDULE_SHIFT_CONFLICT", () =>
    scheduling.assertNoScheduleConflicts(overlap, [{ ...first, scheduleId: "SCH-1" }]));
  const sundayNight = scheduling.validateScheduleSegment({
    ...baseSegment, weekday: "SUNDAY", shiftStart: "23:00", shiftEnd: "02:00",
    requiredWorkMinutes: 180, allowedBreakMinutes: 0
  }, { staff });
  const mondayEarly = scheduling.validateScheduleSegment({
    ...baseSegment, weekday: "MONDAY", shiftStart: "01:00", shiftEnd: "03:00",
    requiredWorkMinutes: 120, allowedBreakMinutes: 0
  }, { staff });
  expectCode("SCHEDULE_SHIFT_CONFLICT", () =>
    scheduling.assertNoScheduleConflicts(mondayEarly, [{ ...sundayNight, scheduleId: "SCH-2" }]));
});

test("enforces type-specific override fields and branch closure scope", () => {
  expectCode("OVERRIDE_FULL_DAY_FIELDS_INVALID", () => scheduling.validateOverride({
    type: "DAY_OFF", staffId: "STAFF-1", date: "2026-07-30", reason: "Roster",
    shiftStart: "09:00"
  }, { staff }));
  expectCode("BRANCH_CLOSURE_SCOPE_INVALID", () => scheduling.validateOverride({
    type: "BRANCH_CLOSED", scopeType: "STAFF", staffId: "STAFF-1",
    date: "2026-07-30", reason: "Maintenance"
  }, { staff }));
});

test("resolves approved full-day override before custom and recurring schedules", () => {
  const result = scheduling.resolveSchedule({
    staff, date: "2026-07-27",
    schedules: [{ ...baseSegment, scheduleId: "SCH-1" }],
    overrides: [
      {
        overrideId: "OVR-CUSTOM", staffId: "STAFF-1", scopeType: "STAFF",
        date: "2026-07-27", type: "CUSTOM_SHIFT", status: "APPROVED",
        shiftStart: "10:00", shiftEnd: "14:00", requiredWorkMinutes: 240,
        allowedBreakMinutes: 0, segmentIndex: 1
      },
      {
        overrideId: "OVR-OFF", staffId: "STAFF-1", scopeType: "STAFF",
        date: "2026-07-27", type: "DAY_OFF", status: "APPROVED"
      }
    ]
  });
  assert.equal(result.classification, "DAY_OFF");
  assert.deepEqual(result.sourceIds, ["OVR-OFF"]);
});

test("resolves custom shift over recurring and keeps interval blocks", () => {
  const result = scheduling.resolveSchedule({
    staff, date: "2026-07-27",
    schedules: [{ ...baseSegment, scheduleId: "SCH-1" }],
    overrides: [
      {
        overrideId: "OVR-CUSTOM", staffId: "STAFF-1", scopeType: "STAFF",
        date: "2026-07-27", type: "CUSTOM_SHIFT", status: "APPROVED",
        shiftStart: "10:00", shiftEnd: "18:00", requiredWorkMinutes: 420,
        allowedBreakMinutes: 60, segmentIndex: 1
      },
      {
        overrideId: "OVR-TRAIN", staffId: "STAFF-1", scopeType: "STAFF",
        date: "2026-07-27", type: "TRAINING", status: "APPROVED",
        blockStart: "12:00", blockEnd: "13:00"
      }
    ]
  });
  assert.equal(result.sourceType, "CUSTOM_SHIFT");
  assert.equal(result.shiftSegments[0].shiftStart, "10:00");
  assert.equal(result.blockedIntervals[0].type, "TRAINING");
});

test("migration preview is append-only, identity-gated, and preserves unknown columns", () => {
  const current = {
    BARBER_SCHEDULE: [
      "SCHEDULE_ID", "STAFF_ID", "STAFF_NAME", "WEEKDAY",
      "SHIFT_START", "SHIFT_END", "ACTIVE", "UPDATED_AT", "CUSTOM_NOTE"
    ]
  };
  const report = scheduling.planScheduleMigration(current, {
    environment: "development", expectedSpreadsheetId: "sheet-1",
    actualSpreadsheetId: "sheet-1", environmentReviewApproved: true
  });
  assert.equal(report.safe, true);
  assert.equal(report.writes, 0);
  assert.equal(report.rollback.historicalRowsTouched, 0);
  assert.deepEqual(report.preservedUnknownColumns.BARBER_SCHEDULE, ["CUSTOM_NOTE"]);
  assert.ok(report.appendColumns.BARBER_SCHEDULE.includes("SEGMENT_INDEX"));
  const blocked = scheduling.planScheduleMigration({}, {
    environment: "production", expectedSpreadsheetId: "sheet-1",
    actualSpreadsheetId: "sheet-1"
  });
  assert.equal(blocked.safe, false);
  assert.ok(blocked.errors.some((item) => item.code === "ENVIRONMENT_NOT_APPROVED"));
});

test("legacy schedule reads inherit policy without mutating row semantics", () => {
  const row = ["SCH-1", "STAFF-1", "Mona", "Monday", "09:00", "17:00", true, "2026-07-01"];
  const normalized = scheduling.normalizeLegacyScheduleRow(
    row,
    ["SCHEDULE_ID", "STAFF_ID", "STAFF_NAME", "WEEKDAY", "SHIFT_START", "SHIFT_END", "ACTIVE", "UPDATED_AT"],
    { requiredDailyMinutes: 420, allowedBreakMinutes: 60 }
  );
  assert.equal(normalized.compatibilityStatus, "LEGACY_INHERITED_POLICY");
  assert.equal(normalized.requiredWorkMinutes, 420);
  assert.equal(normalized.readOnly, true);
});

test("service enforces scope, idempotency, audit, and self-approval separation", () => {
  const repo = scheduling.createMemoryRepository({ staff: [staff] });
  let lockCalls = 0;
  const actor = {
    username: "manager", actorId: "manager", actorName: "Manager", branchIds: ["BR-1"],
    permissions: ["schedule.view", "schedule.manage", "leave.approve"]
  };
  const service = scheduling.createService({
    repository: repo,
    actorResolver: () => actor,
    withLock: (_details, fn) => { lockCalls += 1; return fn(); },
    now: () => "2026-07-29T12:00:00.000Z",
    uuid: (() => { let value = 0; return () => `ID-${++value}`; })()
  });
  const payload = { ...baseSegment, requestId: "REQ-1", reason: "Publish roster" };
  const created = service.execute("saveScheduleSegment", payload);
  const replay = service.execute("saveScheduleSegment", payload);
  assert.equal(replay.idempotentReplay, true);
  assert.equal(repo.state.schedules.length, 1);
  assert.equal(repo.state.audits.length, 1);
  assert.equal(lockCalls, 2);
  expectCode("IDEMPOTENCY_KEY_REUSED", () =>
    service.execute("saveScheduleSegment", { ...payload, shiftStart: "10:00" }));
  assert.equal(created.schedule.staffId, "STAFF-1");
});

test("employee leave request is pending and cannot be self-approved", () => {
  const repo = scheduling.createMemoryRepository({ staff: [staff] });
  let currentActor = {
    username: "mona", actorId: "mona", actorName: "Mona", staffId: "STAFF-1",
    branchIds: ["BR-1"], permissions: ["schedule.view", "leave.request"]
  };
  const service = scheduling.createService({
    repository: repo, actorResolver: () => currentActor, withLock: (_details, fn) => fn(),
    now: () => "2026-07-29T12:00:00.000Z", uuid: () => "LEAVE-1"
  });
  const created = service.execute("createScheduleOverride", {
    requestId: "REQ-LEAVE", staffId: "STAFF-1", date: "2026-08-02",
    type: "APPROVED_LEAVE", reason: "Annual leave"
  });
  assert.equal(created.override.status, "PENDING");
  currentActor = { ...currentActor, permissions: ["schedule.view", "leave.request", "leave.approve"] };
  expectCode("LEAVE_SELF_APPROVAL_FORBIDDEN", () => service.execute("reviewScheduleOverride", {
    requestId: "REQ-REVIEW", overrideId: created.override.overrideId,
    decision: "APPROVED", sourceEvidence: "manager-note", reason: "Self review forbidden"
  }));
});

test("salary and payroll fields are removed recursively from read responses", () => {
  assert.deepEqual(
    scheduling.filterSensitiveFields({ name: "Mona", salary: 100, nested: { hourlyRate: 20, safe: true } }),
    { name: "Mona", nested: { safe: true } }
  );
});

console.log(`Staff scheduling Phase 2 tests passed: ${passed}`);
