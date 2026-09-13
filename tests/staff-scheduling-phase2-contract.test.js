const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
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
  assert.throws(fn, error => error?.code === code);
}

const staff1 = { staffId: "S-1", staffName: "A", branchId: "B-1", active: true };
const staff2 = { staffId: "S-2", staffName: "B", branchId: "B-1", active: true };
const staff3 = { staffId: "S-3", staffName: "C", branchId: "B-2", active: true };
const segment = {
  staffId: "S-1", weekday: "MONDAY", shiftStart: "09:00", shiftEnd: "13:00",
  segmentIndex: 1, requiredWorkMinutes: 240, allowedBreakMinutes: 0,
  effectiveFrom: "2026-01-01", effectiveTo: "", active: true
};

function fixture(options = {}) {
  const repo = scheduling.createMemoryRepository({
    staff: options.staff || [staff1, staff2, staff3],
    schedules: options.schedules || [], overrides: options.overrides || [],
    policies: options.policies || []
  });
  let actor = options.actor || {
    username: "manager", actorId: "manager", actorName: "Manager", role: "MANAGER",
    branchIds: ["B-1"], permissions: ["schedule.view", "schedule.manage", "leave.approve"]
  };
  let serial = 0;
  const service = scheduling.createService({
    repository: repo,
    actorResolver: () => actor,
    withLock: options.withLock || ((_details, callback) => callback()),
    now: () => "2026-07-29T10:00:00.000Z",
    uuid: () => `T-${++serial}`
  });
  return { repo, service, setActor(value) { actor = value; } };
}

test("adjacent segments are accepted and deterministically ordered", () => {
  const first = scheduling.validateScheduleSegment(segment, { staff: staff1 });
  const second = scheduling.validateScheduleSegment({
    ...segment, segmentIndex: 2, shiftStart: "13:00", shiftEnd: "17:00"
  }, { staff: staff1 });
  scheduling.assertNoScheduleConflicts(second, [{ ...first, scheduleId: "ONE" }]);
  const resolved = scheduling.resolveSchedule({
    staff: staff1, date: "2026-07-27",
    schedules: [
      { ...second, scheduleId: "TWO" },
      { ...first, scheduleId: "ONE" }
    ]
  });
  assert.deepEqual(resolved.sourceIds, ["ONE", "TWO"]);
  assert.equal(resolved.requiredWorkMinutes, 480);
});

test("zero-duration shifts have a stable rejection code", () => {
  expectCode("ZERO_DURATION_INTERVAL", () =>
    scheduling.validateScheduleSegment({ ...segment, shiftEnd: "09:00" }, { staff: staff1 }));
});

test("required minutes and break allowance are bounded by duration", () => {
  expectCode("SCHEDULE_REQUIRED_EXCEEDS_SHIFT", () =>
    scheduling.validateScheduleSegment({ ...segment, requiredWorkMinutes: 241 }, { staff: staff1 }));
  expectCode("SCHEDULE_BREAK_INCOMPATIBLE", () =>
    scheduling.validateScheduleSegment({
      ...segment, requiredWorkMinutes: 220, allowedBreakMinutes: 30
    }, { staff: staff1 }));
});

test("invalid staff, inactive staff, weekday, and effective range are rejected", () => {
  expectCode("SCHEDULE_STAFF_NOT_FOUND", () =>
    scheduling.validateScheduleSegment(segment, { staff: staff2 }));
  expectCode("SCHEDULE_STAFF_INACTIVE", () =>
    scheduling.validateScheduleSegment(segment, { staff: { ...staff1, active: false } }));
  expectCode("SCHEDULE_WEEKDAY_INVALID", () =>
    scheduling.validateScheduleSegment({ ...segment, weekday: "FUNDAY" }, { staff: staff1 }));
  expectCode("SCHEDULE_EFFECTIVE_RANGE_INVALID", () =>
    scheduling.validateScheduleSegment({
      ...segment, effectiveFrom: "2026-08-01", effectiveTo: "2026-07-01"
    }, { staff: staff1 }));
});

test("weekday aliases normalize to canonical values", () => {
  assert.equal(scheduling.normalizeWeekday("mon"), "MONDAY");
  assert.equal(scheduling.normalizeWeekday("0"), "SUNDAY");
});

test("effective start and end are inclusive and inactive schedules are excluded", () => {
  const base = { ...segment, scheduleId: "SCH", effectiveFrom: "2026-07-27", effectiveTo: "2026-08-03" };
  const atStart = scheduling.resolveSchedule({ staff: staff1, date: "2026-07-27", schedules: [base] });
  const atEnd = scheduling.resolveSchedule({ staff: staff1, date: "2026-08-03", schedules: [base] });
  const inactive = scheduling.resolveSchedule({
    staff: staff1, date: "2026-07-27", schedules: [{ ...base, active: false }]
  });
  assert.equal(atStart.sourceType, "RECURRING");
  assert.equal(atEnd.sourceType, "RECURRING");
  assert.equal(inactive.classification, "NOT_SCHEDULED");
});

test("effective ranges may be disjoint but overlapping conflicting ranges are rejected", () => {
  const first = { ...scheduling.validateScheduleSegment({
    ...segment, effectiveTo: "2026-06-30"
  }, { staff: staff1 }), scheduleId: "OLD" };
  const later = scheduling.validateScheduleSegment({
    ...segment, effectiveFrom: "2026-07-01"
  }, { staff: staff1 });
  scheduling.assertNoScheduleConflicts(later, [first]);
  const overlap = scheduling.validateScheduleSegment({
    ...segment, effectiveFrom: "2026-06-15"
  }, { staff: staff1 });
  expectCode("SCHEDULE_SHIFT_CONFLICT", () =>
    scheduling.assertNoScheduleConflicts(overlap, [first]));
});

test("bulk save supports multiple shifts and idempotent replay", () => {
  const { repo, service } = fixture();
  const payload = {
    requestId: "BULK-1", reason: "Roster",
    segments: [
      segment,
      { ...segment, shiftStart: "14:00", shiftEnd: "18:00", segmentIndex: 2 }
    ]
  };
  const first = service.execute("bulkSaveScheduleSegments", payload);
  const replay = service.execute("bulkSaveScheduleSegments", payload);
  assert.equal(first.count, 2);
  assert.equal(repo.state.schedules.length, 2);
  assert.equal(replay.idempotentReplay, true);
});

test("copy day and copy employee schedule preserve stable staff identity", () => {
  const source = { ...scheduling.validateScheduleSegment(segment, { staff: staff1 }), scheduleId: "SOURCE" };
  const { repo, service } = fixture({ schedules: [source] });
  const day = service.execute("copyScheduleDay", {
    requestId: "COPY-DAY", staffId: "S-1", fromWeekday: "MONDAY",
    toWeekdays: ["TUESDAY"], effectiveFrom: "2026-01-01", reason: "Copy day"
  });
  assert.equal(day.schedules[0].weekday, "TUESDAY");
  const employee = service.execute("copyEmployeeSchedule", {
    requestId: "COPY-EMP", sourceStaffId: "S-1", targetStaffId: "S-2",
    effectiveFrom: "2026-01-01", reason: "Copy employee"
  });
  assert.ok(employee.schedules.every(item => item.staffId === "S-2" && item.staffName === "B"));
  assert.equal(repo.state.schedules.length, 4);
});

test("date-range assignment and weekly day off are audited mutations", () => {
  const { repo, service } = fixture();
  const applied = service.execute("applyScheduleDateRange", {
    requestId: "RANGE-1", staffId: "S-1", effectiveFrom: "2026-09-01",
    effectiveTo: "2026-09-30", segments: [segment], reason: "September"
  });
  assert.equal(applied.effectiveTo, "2026-09-30");
  const dayOff = service.execute("setWeeklyDayOff", {
    requestId: "OFF-1", staffId: "S-1", weekday: "MONDAY",
    effectiveFrom: "2026-09-01", reason: "Weekly rest"
  });
  assert.equal(dayOff.weeklyDayOff, true);
  assert.equal(repo.state.schedules[0].active, false);
  assert.equal(dayOff.dayOffRecord.recordType, "WEEKLY_DAY_OFF");
  assert.deepEqual(repo.state.audits[1].beforeState[0].active, true);
  assert.deepEqual(repo.state.audits[1].afterState[0].active, false);
});

test("lock failure prevents all writes", () => {
  const lockError = scheduling.schedulingError("SCHEDULE_WRITE_LOCK_TIMEOUT", "busy");
  const { repo, service } = fixture({ withLock: () => { throw lockError; } });
  expectCode("SCHEDULE_WRITE_LOCK_TIMEOUT", () =>
    service.execute("saveScheduleSegment", { ...segment, requestId: "LOCK-1", reason: "Test" }));
  assert.equal(repo.state.schedules.length, 0);
  assert.equal(repo.state.audits.length, 0);
});

test("custom, interval, and full-day override validators enforce their contracts", () => {
  const custom = scheduling.validateOverride({
    staffId: "S-1", date: "2026-08-01", type: "CUSTOM_SHIFT", reason: "Custom",
    shiftStart: "10:00", shiftEnd: "18:00", requiredWorkMinutes: 420,
    allowedBreakMinutes: 60, status: "APPROVED"
  }, { staff: staff1 });
  assert.equal(custom.shiftStart, "10:00");
  const intervalTypes = ["PARTIAL_ABSENCE", "PLANNED_BREAK", "TRAINING"];
  intervalTypes.forEach(type => {
    const result = scheduling.validateOverride({
      staffId: "S-1", date: "2026-08-01", type, reason: type,
      blockStart: "12:00", blockEnd: "13:00", status: "APPROVED"
    }, { staff: staff1 });
    assert.equal(result.blockStart, "12:00");
  });
  expectCode("OVERRIDE_INTERVAL_FIELDS_INVALID", () => scheduling.validateOverride({
    staffId: "S-1", date: "2026-08-01", type: "PLANNED_BREAK", reason: "Break",
    blockStart: "12:00", blockEnd: "13:00", shiftStart: "09:00"
  }, { staff: staff1 }));
});

test("all supported full-day classifications resolve", () => {
  ["DAY_OFF", "APPROVED_LEAVE", "UNPAID_LEAVE", "SICK_LEAVE", "ABSENT"].forEach(type => {
    const resolved = scheduling.resolveSchedule({
      staff: staff1, date: "2026-08-01",
      overrides: [{
        overrideId: `O-${type}`, staffId: "S-1", scopeType: "STAFF",
        date: "2026-08-01", type, status: "APPROVED"
      }]
    });
    assert.equal(resolved.classification, type);
  });
});

test("branch and organization closure target only applicable staff", () => {
  const closure = {
    overrideId: "CLOSE", branchId: "B-1", scopeType: "BRANCH",
    date: "2026-08-01", type: "BRANCH_CLOSED", status: "APPROVED"
  };
  assert.equal(scheduling.resolveSchedule({
    staff: staff1, date: closure.date, overrides: [closure]
  }).closure, true);
  assert.equal(scheduling.resolveSchedule({
    staff: staff3, date: closure.date, overrides: [closure]
  }).closure, false);
});

test("rejected and cancelled overrides never affect resolution", () => {
  ["REJECTED", "CANCELLED"].forEach(status => {
    const resolved = scheduling.resolveSchedule({
      staff: staff1, date: "2026-07-27",
      schedules: [{ ...segment, scheduleId: "SCH" }],
      overrides: [{
        overrideId: `OFF-${status}`, staffId: "S-1", scopeType: "STAFF",
        date: "2026-07-27", type: "DAY_OFF", status
      }]
    });
    assert.equal(resolved.classification, "WORKING_DAY");
  });
});

test("overlapping approved custom shifts and interval blocks are rejected", () => {
  const custom = {
    overrideId: "C-1", staffId: "S-1", scopeType: "STAFF", date: "2026-08-01",
    type: "CUSTOM_SHIFT", status: "APPROVED", shiftStart: "09:00", shiftEnd: "13:00"
  };
  expectCode("OVERRIDE_CUSTOM_SHIFT_CONFLICT", () =>
    scheduling.assertNoOverrideConflicts({
      ...custom, overrideId: "C-2", shiftStart: "12:00", shiftEnd: "15:00"
    }, [custom]));
  const block = {
    overrideId: "P-1", staffId: "S-1", scopeType: "STAFF", date: "2026-08-01",
    type: "PLANNED_BREAK", status: "APPROVED", blockStart: "12:00", blockEnd: "13:00"
  };
  expectCode("OVERRIDE_INTERVAL_CONFLICT", () =>
    scheduling.assertNoOverrideConflicts({
      ...block, overrideId: "P-2", blockStart: "12:30", blockEnd: "14:00"
    }, [block]));
});

test("full-day precedence is deterministic and produces warnings and trace", () => {
  const resolved = scheduling.resolveSchedule({
    staff: staff1, date: "2026-08-01",
    overrides: [
      { overrideId: "LEAVE", staffId: "S-1", scopeType: "STAFF", date: "2026-08-01", type: "APPROVED_LEAVE", status: "APPROVED" },
      { overrideId: "ABSENT", staffId: "S-1", scopeType: "STAFF", date: "2026-08-01", type: "ABSENT", status: "APPROVED" }
    ]
  });
  assert.equal(resolved.classification, "ABSENT");
  assert.ok(resolved.warnings.includes("MULTIPLE_FULL_DAY_OVERRIDES_RESOLVED_BY_PRECEDENCE"));
  assert.equal(resolved.resolutionTrace.at(-1).step, "FULL_DAY_BLOCK");
});

test("policy fallback, inactive staff, overnight, and Cairo timezone resolve", () => {
  const fallback = scheduling.resolveSchedule({
    staff: staff1, date: "2026-08-02",
    policyResolution: { snapshot: { requiredDailyMinutes: 450, allowedBreakMinutes: 45 } }
  });
  assert.equal(fallback.requiredWorkMinutes, 450);
  assert.equal(fallback.allowedBreakMinutes, 45);
  assert.equal(fallback.timezone, "Africa/Cairo");
  const inactive = scheduling.resolveSchedule({
    staff: { ...staff1, active: false }, date: "2026-08-02"
  });
  assert.equal(inactive.classification, "INACTIVE_STAFF");
  const overnight = scheduling.resolveSchedule({
    staff: staff1, date: "2026-07-31",
    schedules: [{
      ...segment, scheduleId: "NIGHT", weekday: "FRIDAY",
      shiftStart: "22:00", shiftEnd: "06:00"
    }]
  });
  assert.equal(overnight.shiftSegments[0].overnight, true);
});

test("manager-created leave remains pending and review requires separate approver evidence", () => {
  const { repo, service, setActor } = fixture();
  const created = service.execute("createScheduleOverride", {
    requestId: "LEAVE-CREATE", staffId: "S-1", date: "2026-08-05",
    type: "SICK_LEAVE", reason: "Medical", status: "APPROVED",
    sourceEvidence: "certificate"
  });
  assert.equal(created.override.status, "PENDING");
  setActor({
    username: "approver", actorId: "approver", role: "MANAGER", branchIds: ["B-1"],
    permissions: ["schedule.view", "leave.approve"]
  });
  const reviewed = service.execute("reviewScheduleOverride", {
    requestId: "LEAVE-REVIEW", overrideId: created.override.overrideId,
    decision: "APPROVED", reason: "Verified", sourceEvidence: "certificate"
  });
  assert.equal(reviewed.override.approvedBy, "approver");
  assert.equal(repo.state.audits.length, 2);
});

test("approval permission, invalid transition, and self-approval fail closed", () => {
  const pending = {
    overrideId: "LEAVE", staffId: "S-1", scopeType: "STAFF", date: "2026-08-01",
    type: "APPROVED_LEAVE", status: "PENDING", requestedBy: "employee",
    reason: "Leave"
  };
  const { service, setActor } = fixture({ overrides: [pending] });
  setActor({
    username: "outsider", actorId: "outsider", role: "MANAGER",
    branchIds: ["B-1"], permissions: ["schedule.view"]
  });
  expectCode("PERMISSION_DENIED", () => service.execute("reviewScheduleOverride", {
    requestId: "NO-PERM", overrideId: "LEAVE", decision: "APPROVED",
    sourceEvidence: "x", reason: "No permission"
  }));
  setActor({
    username: "employee", actorId: "employee", role: "EMPLOYEE", staffId: "S-1",
    branchIds: ["B-1"], permissions: ["schedule.view", "leave.approve"]
  });
  expectCode("LEAVE_SELF_APPROVAL_FORBIDDEN", () => service.execute("reviewScheduleOverride", {
    requestId: "SELF", overrideId: "LEAVE", decision: "APPROVED",
    sourceEvidence: "x", reason: "Self approval"
  }));
  expectCode("PERMISSION_DENIED", () => service.execute("transitionScheduleOverride", {
    requestId: "TRANSITION", overrideId: "LEAVE", nextStatus: "DRAFT", reason: "Invalid"
  }));
});

test("cancellation retains compensating evidence and immutable audit before state", () => {
  const approved = {
    overrideId: "DAY-OFF", staffId: "S-1", scopeType: "STAFF", date: "2026-08-01",
    type: "DAY_OFF", status: "APPROVED", reason: "Roster"
  };
  const { repo, service } = fixture({ overrides: [approved] });
  const result = service.execute("cancelScheduleOverride", {
    requestId: "CANCEL-1", overrideId: "DAY-OFF", reason: "Roster corrected"
  });
  assert.equal(result.compensatingEvidence, true);
  assert.equal(result.override.cancelledBy, "manager");
  assert.equal(repo.state.audits[0].beforeState.status, "APPROVED");
  assert.equal(repo.state.audits[0].afterState.status, "CANCELLED");
});

test("employee is self-only while branch manager can access assigned branch", () => {
  const seeded = [
    { ...segment, scheduleId: "SELF" },
    { ...segment, scheduleId: "PEER", staffId: "S-2", staffName: "B" },
    { ...segment, scheduleId: "OTHER", staffId: "S-3", staffName: "C" }
  ];
  const { service, setActor } = fixture({ schedules: seeded });
  setActor({
    username: "employee", actorId: "employee", role: "EMPLOYEE", staffId: "S-1",
    branchIds: ["B-1"], permissions: ["schedule.view"]
  });
  assert.deepEqual(service.execute("listStaffSchedules", { limit: 200 }).schedules.map(item => item.scheduleId), ["SELF"]);
  setActor({
    username: "manager", actorId: "manager", role: "MANAGER",
    branchIds: ["B-1"], permissions: ["schedule.view", "schedule.manage"]
  });
  assert.deepEqual(
    service.execute("listStaffSchedules", { limit: 200 }).schedules.map(item => item.scheduleId),
    ["SELF", "PEER"]
  );
  expectCode("SCHEDULE_SCOPE_DENIED", () => service.execute("saveScheduleSegment", {
    ...segment, staffId: "S-3", requestId: "OUTSIDE", reason: "No"
  }));
});

test("actor identity and approval identity are server-authoritative", () => {
  const { repo, service } = fixture();
  service.execute("saveScheduleSegment", {
    ...segment, requestId: "ACTOR", actorId: "browser-admin",
    actorRole: "OWNER", updatedBy: "browser-admin", reason: "Authoritative"
  });
  assert.equal(repo.state.schedules[0].updatedBy, "manager");
  assert.equal(repo.state.audits[0].actorId, "manager");
});

test("stable permission and idempotency errors are returned", () => {
  const { service, setActor } = fixture();
  setActor({ username: "viewer", actorId: "viewer", role: "MANAGER", branchIds: ["B-1"], permissions: ["schedule.view"] });
  expectCode("PERMISSION_DENIED", () => service.execute("saveScheduleSegment", {
    ...segment, requestId: "DENIED", reason: "No"
  }));
  setActor({ username: "manager", actorId: "manager", role: "MANAGER", branchIds: ["B-1"], permissions: ["schedule.view", "schedule.manage"] });
  service.execute("saveScheduleSegment", { ...segment, requestId: "REUSE", reason: "One" });
  expectCode("IDEMPOTENCY_KEY_REUSED", () => service.execute("saveScheduleSegment", {
    ...segment, requestId: "REUSE", reason: "Two"
  }));
});

test("dry-runs are idempotent and never describe historical row writes", () => {
  const sheets = {
    BARBER_SCHEDULE: ["SCHEDULE_ID", "STAFF_ID", "STAFF_NAME", "WEEKDAY", "SHIFT_START", "SHIFT_END", "ACTIVE", "UPDATED_AT"]
  };
  const identity = {
    environment: "development", expectedSpreadsheetId: "dev", actualSpreadsheetId: "dev",
    environmentReviewApproved: true
  };
  const first = scheduling.planScheduleMigration(sheets, identity);
  const second = scheduling.planScheduleMigration(sheets, identity);
  assert.deepEqual(first, second);
  assert.equal(first.writes, 0);
  assert.equal(first.rollback.historicalRowsTouched, 0);
});

test("migration reports duplicate and partial-schema blockers without reordering legacy prefix", () => {
  const duplicate = scheduling.planScheduleMigration({
    BARBER_SCHEDULE: ["SCHEDULE_ID", "STAFF_ID", "STAFF_NAME", "WEEKDAY", "SHIFT_START", "SHIFT_END", "ACTIVE", "UPDATED_AT", "active"]
  }, {
    environment: "development", expectedSpreadsheetId: "dev", actualSpreadsheetId: "dev",
    environmentReviewApproved: true
  });
  assert.ok(duplicate.errors.some(item => item.code === "DUPLICATE_HEADERS"));
  assert.deepEqual(
    scheduling.PHASE2_SHEET_SCHEMAS.BARBER_SCHEDULE.slice(0, 8),
    ["SCHEDULE_ID", "STAFF_ID", "STAFF_NAME", "WEEKDAY", "SHIFT_START", "SHIFT_END", "ACTIVE", "UPDATED_AT"]
  );
});

test("Phase 2 source is isolated from booking and attendance event actions", () => {
  const source = fs.readFileSync(path.join(__dirname, "../scripts/staff-scheduling-phase2.js"), "utf8");
  assert.equal(/createBooking|updateBooking|Booking Availability/i.test(source), false);
  assert.equal(/checkIn|checkOut|ATTENDANCE_EVENTS/.test(source), false);
  assert.equal(scheduling.ACTIONS.some(action => /booking|attendance(event|step|record)/i.test(action)), false);
});

test("UI exposes server-backed grid, range, bulk, day-off, override, and audit controls", () => {
  const html = fs.readFileSync(path.join(__dirname, "../public/pages/schedule-management.html"), "utf8");
  const js = fs.readFileSync(path.join(__dirname, "../public/assets/js/pages/schedule-management.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../public/assets/css/pages/schedule-management.css"), "utf8");
  [
    "weeklyBody", "rangeGrid", "staffFilter", "branchFilter", "activeOnly",
    "segmentDialog", "copyDayBtn", "copyEmployeeBtn", "applyRangeBtn",
    "addOverrideBtn", "auditList", "beforeunload", "migrationPreviewBtn",
    "migrationPreviewDialog", "decisionDialog", "decisionReason", "decisionEvidence"
  ].forEach(marker => assert.ok(html.includes(marker) || js.includes(marker), marker));
  assert.ok(js.includes('RomeoAuth.requireAuth("schedule.view")'));
  assert.ok(js.includes("requestId(action)"));
  assert.ok(js.includes('api("previewStaffScheduleMigration")'));
  assert.equal(/\b(?:prompt|confirm)\s*\(/.test(js), false);
  assert.ok(js.includes("requestDecision"));
  assert.ok(js.includes('sourceDialog.setAttribute("aria-busy", "true")'));
  assert.ok(js.includes("if (state.busy)"));
  assert.ok(html.indexOf('id="menuToggle"') < html.indexOf('class="header-copy"'));
  assert.ok(html.includes('class="actions header-actions"') && html.includes('id="refreshBtn"'));
  assert.ok(css.includes(".schedule-header{direction:ltr}"));
  assert.ok(css.includes(".schedule-header>.header-actions{direction:rtl;flex:0 0 auto"));
  assert.ok(css.includes(".filter-empty-state{grid-column:1/-1"));
  [
    "SCHEDULE_SCHEMA_NOT_READY",
    "INCOMPATIBLE_STAFF_POSITIONAL_PREFIX",
    "SCHEDULE_SCHEMA_DUPLICATE_HEADERS"
  ].forEach(code => assert.ok(js.includes(code), code));
  assert.ok(js.includes('classification.kind === "STAFF_SCHEMA"'));
  assert.ok(js.includes("staffFilter.disabled = eligibleStaff.length === 0"));
});

console.log(`Staff scheduling Phase 2 contract tests passed: ${passed}`);
