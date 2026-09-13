const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const phase3 = require("../scripts/staff-attendance-phase3");
const schema = require("../scripts/staff-attendance-schema");
const core = require("../scripts/staff-attendance-core");
const { buildBundle, SOURCE_ORDER } = require("../scripts/build-staff-attendance-phase3-bundle");

const ROOT = path.resolve(__dirname, "..");

function schedule(overrides = {}) {
  return {
    date: "2026-07-29", sourceType: "RECURRING", sourceIds: ["SCH-1"],
    shiftSegments: [{ sourceId: "SCH-1", segmentIndex: 1, shiftStart: "09:00", shiftEnd: "17:00" }],
    requiredWorkMinutes: 480, allowedBreakMinutes: 0,
    classification: "WORKING_DAY", warnings: [], ...overrides
  };
}

function harness(options = {}) {
  const actors = {
    employee: {
      actorId: "employee", actorName: "Employee", role: "EMPLOYEE", staffId: "S1",
      permissions: ["attendance.view", "attendance.self_action"]
    },
    manager: {
      actorId: "manager", actorName: "Manager", role: "MANAGER", branchIds: ["B1"],
      permissions: ["attendance.view", "attendance.manage", "attendance.correct",
        "attendance.approve_adjustment", "attendance.approve_overtime"]
    },
    outsider: {
      actorId: "outsider", actorName: "Outsider", role: "MANAGER", branchIds: ["B2"],
      permissions: ["attendance.view", "attendance.manage", "attendance.correct"]
    }
  };
  const repository = options.repository || phase3.createMemoryRepository({
    staff: [
      { staffId: "S1", staffName: "Ali", branchId: "B1", active: true },
      { staffId: "S2", staffName: "Mona", branchId: "B2", active: true },
      { staffId: "S3", staffName: "Inactive", branchId: "B1", active: false }
    ],
    policies: [{
      policyId: "POL-1", staffId: "", effectiveFrom: "2026-01-01", effectiveTo: "2026-12-31",
      requiredDailyMinutes: 480, allowedBreakMinutes: 0, breakPaymentType: "UNPAID",
      dailyOvertimeCapMinutes: 120, active: true
    }],
    ...(options.seed || {})
  });
  let clock = options.now || "2026-07-29T09:00:00+03:00";
  let counter = 0;
  const service = phase3.createService({
    repository,
    actorResolver: data => actors[data.as || "employee"] || null,
    scheduleResolver: options.scheduleResolver || ((_staff, date) => schedule({ date })),
    now: () => clock,
    uuid: () => `uuid-${++counter}`,
    withLock: options.withLock || ((_details, callback) => callback())
  });
  return {
    repository, service, actors,
    setNow(value) { clock = value; },
    execute(action, data = {}) {
      return service.execute(action, {
        action, as: data.as || "employee", staffId: data.staffId || "S1",
        requestId: data.requestId || `REQ-${++counter}`, reason: data.reason || "test reason",
        ...data
      });
    }
  };
}

function errorCode(fn, code) {
  assert.throws(fn, error => error && error.code === code);
}

test("Phase 3 schema preserves the 24 legacy ATTENDANCE columns and appends exact required daily fields", () => {
  assert.deepEqual(schema.SHEET_SCHEMAS.ATTENDANCE.slice(0, 24), [...schema.LEGACY_ATTENDANCE_HEADERS]);
  for (const header of [
    "ATTENDANCE_DAY_ID", "BRANCH_ID", "ATTENDANCE_DATE", "TIMEZONE", "STATUS",
    "SCHEDULE_SOURCE", "SCHEDULE_SOURCE_IDS", "SCHEDULED_START", "SCHEDULED_END",
    "SHIFT_SEGMENTS", "REQUIRED_WORK_MINUTES_RAW", "REQUIRED_WORK_MINUTES_ROUNDED",
    "ALLOWED_BREAK_MINUTES", "ACTUAL_CHECK_IN", "ACTUAL_CHECK_OUT", "SESSION_COUNT",
    "PRESENCE_MINUTES_RAW", "PRESENCE_MINUTES_ROUNDED", "ACTUAL_BREAK_MINUTES_RAW",
    "ACTUAL_BREAK_MINUTES_ROUNDED", "WORKED_MINUTES_RAW", "WORKED_MINUTES_ROUNDED",
    "LATE_MINUTES_RAW", "LATE_MINUTES_ROUNDED", "EARLY_LEAVE_MINUTES_RAW",
    "EARLY_LEAVE_MINUTES_ROUNDED", "EXCESS_BREAK_MINUTES_RAW",
    "EXCESS_BREAK_MINUTES_ROUNDED", "DEFICIT_MINUTES_RAW",
    "DEFICIT_MINUTES_ROUNDED", "RAW_OVERTIME_MINUTES",
    "APPROVED_OVERTIME_MINUTES", "LEAVE_OR_ABSENCE_TYPE", "OPEN_SESSION",
    "OPEN_BREAK", "CALCULATION_WARNINGS", "POLICY_SNAPSHOT", "SCHEDULE_SNAPSHOT",
    "LAST_EVENT_AT", "CALCULATED_AT", "CALCULATION_VERSION", "LOCKED",
    "REOPENED_COUNT", "UPDATED_AT"
  ]) assert.ok(schema.SHEET_SCHEMAS.ATTENDANCE.includes(header), header);
});

test("initial check-in uses server time and ignores a browser-supplied timestamp", () => {
  const h = harness();
  const result = h.execute("attendanceCheckIn", { timestamp: "1999-01-01T00:00:00Z" });
  assert.equal(result.event.eventAt, "2026-07-29T09:00:00+03:00");
  assert.equal(result.attendanceDay.state, "CHECKED_IN");
});

test("repeated check-in and break-before-check-in return stable state codes", () => {
  const h = harness();
  errorCode(() => h.execute("attendanceStartBreak"), "ATTENDANCE_BREAK_BEFORE_CHECK_IN");
  h.execute("attendanceCheckIn");
  errorCode(() => h.execute("attendanceCheckIn"), "ATTENDANCE_SESSION_ALREADY_OPEN");
});

test("break start, repeated break, break end, and break-end-without-open-break are strict", () => {
  const h = harness();
  h.execute("attendanceCheckIn");
  h.setNow("2026-07-29T12:00:00+03:00");
  assert.equal(h.execute("attendanceStartBreak").attendanceDay.state, "ON_BREAK");
  errorCode(() => h.execute("attendanceStartBreak"), "ATTENDANCE_BREAK_ALREADY_OPEN");
  h.setNow("2026-07-29T12:30:00+03:00");
  assert.equal(h.execute("attendanceEndBreak").attendanceDay.state, "CHECKED_IN");
  errorCode(() => h.execute("attendanceEndBreak"), "ATTENDANCE_BREAK_NOT_OPEN");
});

test("checkout before check-in and checkout with an open break are rejected", () => {
  const h = harness();
  errorCode(() => h.execute("attendanceCheckOut"), "ATTENDANCE_SESSION_NOT_OPEN");
  h.execute("attendanceCheckIn");
  h.setNow("2026-07-29T12:00:00+03:00");
  h.execute("attendanceStartBreak");
  errorCode(() => h.execute("attendanceCheckOut"), "ATTENDANCE_OPEN_BREAK");
});

test("privileged explicit open-break resolution appends BREAK_END evidence and warning path", () => {
  const h = harness();
  h.execute("attendanceCheckIn");
  h.setNow("2026-07-29T12:00:00+03:00");
  h.execute("attendanceStartBreak");
  h.setNow("2026-07-29T17:00:00+03:00");
  const result = h.execute("attendanceCheckOut", { as: "manager", closeOpenBreak: true });
  assert.equal(result.attendanceDay.state, "CHECKED_OUT");
  assert.deepEqual(h.repository.getState().events.map(event => event.eventType),
    ["CHECK_IN", "BREAK_START", "BREAK_END", "CHECK_OUT"]);
});

test("multiple non-overlapping sessions are supported and summed", () => {
  const h = harness();
  h.execute("attendanceCheckIn");
  h.setNow("2026-07-29T13:00:00+03:00"); h.execute("attendanceCheckOut");
  h.setNow("2026-07-29T14:00:00+03:00"); h.execute("attendanceCheckIn");
  h.setNow("2026-07-29T18:00:00+03:00");
  const result = h.execute("attendanceCheckOut");
  assert.equal(result.attendanceDay.sessionCount, 2);
  assert.equal(result.attendanceDay.presenceMinutesRaw, 480);
});

test("completed attendance reads preserve the captured schedule and policy snapshots", () => {
  let activeSchedule = schedule();
  const h = harness({ scheduleResolver: () => activeSchedule });
  h.execute("attendanceCheckIn");
  h.setNow("2026-07-29T17:00:00+03:00");
  h.execute("attendanceCheckOut");

  const listPersistedDays = h.repository.listDays;
  h.repository.listDays = filters => listPersistedDays(filters).map(day => ({
    ...day, scheduleSnapshot: "", policySnapshot: "", sourceEventHash: "legacy-hash"
  }));
  activeSchedule = null;
  const dashboard = h.execute("getAttendanceDashboard", { as: "manager", date: "2026-07-29" });
  const day = dashboard.attendanceDays.find(item => item.staffId === "S1");
  assert.equal(day.scheduleSource, "RECURRING");
  assert.equal(day.scheduledStart, "09:00");
  assert.equal(day.requiredWorkMinutesRaw, 480);
  assert.equal(day.policyId, "POL-1");
  assert.equal(day.workedMinutesRaw, 480);
  assert.equal(day.state, "CHECKED_OUT");
});

test("zero, reversed, and non-monotonic intervals fail closed", () => {
  errorCode(() => phase3.buildEventState([
    { eventId: "1", eventType: "CHECK_IN", eventAt: "2026-07-29T10:00:00+03:00" },
    { eventId: "2", eventType: "CHECK_OUT", eventAt: "2026-07-29T10:00:00+03:00" }
  ]), "ATTENDANCE_ZERO_OR_REVERSED_INTERVAL");
  errorCode(() => phase3.buildEventState([
    { eventId: "1", eventType: "CHECK_IN", eventAt: "2026-07-29T10:00:00+03:00" },
    { eventId: "2", eventType: "CHECK_OUT", eventAt: "2026-07-29T09:00:00+03:00" }
  ]), "ATTENDANCE_SESSION_NOT_OPEN");
});

test("a regressed server clock cannot append a new factual attendance event", () => {
  const h = harness();
  h.setNow("2026-07-29T10:00:00+03:00");
  h.execute("attendanceCheckIn");
  h.setNow("2026-07-29T09:59:00+03:00");
  errorCode(() => h.execute("attendanceCheckOut"), "ATTENDANCE_EVENT_TIME_REGRESSION");
});

test("duplicate request replay returns the stored result and changed payload is rejected", () => {
  const h = harness();
  const first = h.execute("attendanceCheckIn", { requestId: "SAME" });
  const replay = h.execute("attendanceCheckIn", { requestId: "SAME" });
  assert.deepEqual(replay, first);
  errorCode(() => h.execute("attendanceCheckIn", {
    requestId: "SAME", reason: "different"
  }), "ATTENDANCE_IDEMPOTENCY_KEY_REUSED");
});

test("mock lock failure is surfaced without writes", () => {
  const h = harness({ withLock: () => { throw phase3.attendanceError("ATTENDANCE_WRITE_LOCK_TIMEOUT", "busy"); } });
  errorCode(() => h.execute("attendanceCheckIn"), "ATTENDANCE_WRITE_LOCK_TIMEOUT");
  assert.equal(h.repository.getState().events.length, 0);
});

test("inactive staff, spoofed staff, and out-of-branch manager actions fail closed", () => {
  const h = harness();
  errorCode(() => h.execute("attendanceCheckIn", { as: "manager", staffId: "S3" }),
    "ATTENDANCE_STAFF_INACTIVE");
  errorCode(() => h.execute("attendanceCheckIn", { staffId: "S2" }), "ATTENDANCE_PERMISSION_DENIED");
  errorCode(() => h.execute("attendanceCheckIn", { as: "manager", staffId: "S2" }),
    "ATTENDANCE_BRANCH_SCOPE_DENIED");
  errorCode(() => h.execute("markAttendanceAbsent", { as: "outsider", staffId: "S1" }),
    "ATTENDANCE_BRANCH_SCOPE_DENIED");
});

test("browser actor fields are ignored in favor of authenticated identity", () => {
  const h = harness();
  const result = h.execute("attendanceCheckIn", {
    actorId: "owner", actorRole: "OWNER", actor: { owner: true }
  });
  assert.equal(result.event.actorId, "employee");
  assert.equal(result.event.actorRole, "EMPLOYEE");
});

test("unknown identity and missing permission fail closed", () => {
  const h = harness();
  errorCode(() => h.service.execute("getAttendanceDashboard", { as: "missing" }),
    "ATTENDANCE_IDENTITY_UNKNOWN");
  h.actors.employee.permissions = ["attendance.view"];
  errorCode(() => h.execute("attendanceCheckIn"), "ATTENDANCE_PERMISSION_DENIED");
});

test("blocked planned leave prevents employee check-in but allows explicit manager override", () => {
  const h = harness({ scheduleResolver: (_staff, date) => schedule({
    date, shiftSegments: [], requiredWorkMinutes: 0, classification: "APPROVED_LEAVE"
  }) });
  errorCode(() => h.execute("attendanceCheckIn"), "ATTENDANCE_DAY_BLOCKED");
  const result = h.execute("attendanceCheckIn", { as: "manager", managerOverride: true });
  assert.equal(result.attendanceDay.status, "UNSCHEDULED_ATTENDANCE");
});

test("weekly day off, approved leave, closure, no schedule, and unscheduled attendance stay distinct", () => {
  for (const [classification, expected] of [
    ["WEEKLY_DAY_OFF", "WEEKLY_DAY_OFF"],
    ["APPROVED_LEAVE", "APPROVED_LEAVE"],
    ["BRANCH_CLOSED", "BRANCH_CLOSED"],
    ["NOT_SCHEDULED", "NOT_STARTED"]
  ]) {
    const result = phase3.calculateDay({
      attendanceDayId: "D", staff: { staffId: "S1", staffName: "Ali" },
      date: "2026-07-29", schedule: schedule({
        shiftSegments: [], requiredWorkMinutes: 0, classification
      }), events: [], overtimeApprovals: [], policy: {}, now: "2026-07-29T18:00:00+03:00"
    });
    assert.equal(result.status, expected);
  }
});

test("manager mark-absent is explicit and absence is never inferred from missing check-in", () => {
  const h = harness();
  const initial = h.execute("getAttendanceDashboard", { as: "manager", date: "2026-07-29" });
  assert.equal(initial.attendanceDays[0].status, "NOT_STARTED");
  const absent = h.execute("markAttendanceAbsent", { as: "manager" });
  assert.equal(absent.attendanceDay.status, "ABSENT");
});

test("8-hour, 10-hour, multiple-segment, late, early, and deficit diagnostics resolve required minutes once", () => {
  const result = core.calculateDailyAttendance({
    date: "2026-07-29", scheduledStart: "09:00", scheduledEnd: "19:00",
    requiredWorkMinutes: 600, checkIn: "09:30", checkOut: "18:30",
    breaks: [], policy: {}
  });
  assert.equal(result.presenceMinutesRaw, 540);
  assert.equal(result.lateMinutesRaw, 30);
  assert.equal(result.earlyLeaveMinutesRaw, 30);
  assert.equal(result.deficitMinutesRaw, 60);
});

test("paid, unpaid, multiple, excess, grace, and maximum-break policies use Phase 1 formulas", () => {
  const paid = core.calculateDailyAttendance({
    date: "2026-07-29", scheduledStart: "09:00", scheduledEnd: "17:00",
    requiredWorkMinutes: 480, checkIn: "09:00", checkOut: "17:00",
    breaks: [{ start: "11:00", end: "11:15" }, { start: "13:00", end: "14:00" }],
    policy: { allowedBreakMinutes: 60, breakGraceMinutes: 15, breakPaymentType: "PAID" }
  });
  assert.equal(paid.actualBreakMinutesRaw, 75);
  assert.equal(paid.excessBreakMinutesRaw, 0);
  assert.equal(paid.deficitMinutesRaw, 0);
  const unpaid = core.calculateDailyAttendance({
    date: "2026-07-29", scheduledStart: "09:00", scheduledEnd: "17:00",
    requiredWorkMinutes: 480, checkIn: "09:00", checkOut: "17:00",
    breaks: [{ start: "13:00", end: "14:30" }],
    policy: { allowedBreakMinutes: 60, breakPaymentType: "UNPAID" }
  });
  assert.equal(unpaid.excessBreakMinutesRaw, 30);
  assert.equal(unpaid.deficitMinutesRaw, 90);
});

test("overnight and Cairo DST elapsed-time attendance use explicit offsets", () => {
  const overnight = core.calculateDailyAttendance({
    date: "2026-04-23", scheduledStart: "23:00", scheduledEnd: "07:00",
    requiredWorkMinutes: 420,
    sessions: [{ checkInAt: "2026-04-23T23:00:00+02:00", checkOutAt: "2026-04-24T07:00:00+03:00" }],
    breaks: [], policy: {}
  });
  assert.equal(overnight.presenceMinutesRaw, 420);
});

test("attendance-date resolution assigns post-midnight events to the overnight shift start date", () => {
  const context = phase3.resolveAttendanceContext({
    staff: { staffId: "S1" }, serverNow: "2026-07-30T02:00:00+03:00",
    scheduleResolver: (_staff, date) => date === "2026-07-29"
      ? schedule({ date, shiftSegments: [{ shiftStart: "22:00", shiftEnd: "06:00" }] })
      : schedule({ date, shiftSegments: [], classification: "NOT_SCHEDULED" })
  });
  assert.equal(context.date, "2026-07-29");
});

test("raw and rounded minutes remain separate and daily overtime respects configured cap", () => {
  const h = harness({ seed: { policies: [{
    policyId: "P", staffId: "", effectiveFrom: "2026-01-01", effectiveTo: "2026-12-31",
    requiredDailyMinutes: 480, roundingIncrementMinutes: 15, roundingMode: "NEAREST",
    dailyOvertimeCapMinutes: 60, active: true
  }] } });
  h.execute("attendanceCheckIn");
  h.setNow("2026-07-29T18:07:00+03:00");
  const day = h.execute("attendanceCheckOut").attendanceDay;
  assert.equal(day.rawOvertimeMinutes, 67);
  assert.equal(day.workedMinutesRounded, 540);
});

test("cancel accidental event appends compensation and preserves immutable original evidence", () => {
  const h = harness();
  const checked = h.execute("attendanceCheckIn");
  const original = checked.event;
  const cancelled = h.execute("cancelAttendanceEvent", {
    as: "manager", eventId: original.eventId
  });
  assert.equal(cancelled.attendanceDay.state, "NOT_STARTED");
  const state = h.repository.getState();
  assert.equal(state.events.length, 2);
  assert.equal(state.events[0].eventId, original.eventId);
  assert.equal(state.events[1].reversesEventId, original.eventId);
});

test("append-only correction supports missing-event insertion and four-eyes approval", () => {
  const h = harness();
  const day = h.execute("attendanceCheckIn").attendanceDay;
  h.setNow("2026-07-29T17:00:00+03:00");
  const request = h.execute("requestAttendanceCorrection", {
    attendanceDayId: day.attendanceDayId,
    proposedState: { insertEventType: "CHECK_OUT", eventAt: "2026-07-29T17:00:00+03:00" }
  });
  errorCode(() => h.execute("approveAttendanceCorrection", {
    adjustmentId: request.adjustment.adjustmentId
  }), "ATTENDANCE_PERMISSION_DENIED");
  const approved = h.execute("approveAttendanceCorrection", {
    as: "manager", adjustmentId: request.adjustment.adjustmentId
  });
  assert.equal(approved.adjustment.status, "APPROVED");
  assert.equal(approved.attendanceDay.state, "CHECKED_OUT");
  assert.equal(h.repository.getState().events[0].eventType, "CHECK_IN");
});

test("timestamp replacement correction validates the referenced immutable event", () => {
  const h = harness();
  const checked = h.execute("attendanceCheckIn");
  errorCode(() => h.execute("requestAttendanceCorrection", {
    attendanceDayId: checked.attendanceDay.attendanceDayId,
    proposedState: {
      replacesEventId: "MISSING", eventAt: "2026-07-29T09:05:00+03:00"
    }
  }), "ATTENDANCE_CORRECTION_EVENT_NOT_FOUND");
  const request = h.execute("requestAttendanceCorrection", {
    attendanceDayId: checked.attendanceDay.attendanceDayId,
    proposedState: {
      replacesEventId: checked.event.eventId, eventAt: "2026-07-29T09:05:00+03:00"
    }
  });
  assert.equal(request.adjustment.status, "PENDING");
});

test("self-approval of adjustment is rejected even with elevated permission", () => {
  const h = harness();
  h.actors.manager.staffId = "S1";
  const day = h.execute("attendanceCheckIn").attendanceDay;
  const requested = h.execute("requestAttendanceCorrection", {
    as: "manager", attendanceDayId: day.attendanceDayId,
    proposedState: { insertEventType: "CHECK_OUT", eventAt: "2026-07-29T17:00:00+03:00" }
  });
  errorCode(() => h.execute("approveAttendanceCorrection", {
    as: "manager", adjustmentId: requested.adjustment.adjustmentId
  }), "ATTENDANCE_SELF_APPROVAL_FORBIDDEN");
});

test("close locks a resolved day; action fails until privileged reopen records evidence", () => {
  const h = harness();
  const open = h.execute("attendanceCheckIn");
  h.setNow("2026-07-29T17:00:00+03:00");
  const closedSession = h.execute("attendanceCheckOut");
  const locked = h.execute("closeAttendanceDay", {
    as: "manager", attendanceDayId: closedSession.attendanceDay.attendanceDayId
  });
  assert.equal(locked.attendanceDay.locked, true);
  errorCode(() => h.execute("attendanceCheckIn"), "ATTENDANCE_DAY_LOCKED");
  const reopened = h.execute("reopenAttendanceDay", {
    as: "manager", attendanceDayId: open.attendanceDay.attendanceDayId
  });
  assert.equal(reopened.attendanceDay.locked, false);
  assert.equal(reopened.attendanceDay.reopenedCount, 1);
});

test("reopen without permission is rejected", () => {
  const h = harness({ seed: { days: [{
    attendanceDayId: "ATD-S1-2026-07-29", staffId: "S1", staffName: "Ali",
    branchId: "B1", attendanceDate: "2026-07-29", locked: true
  }] } });
  errorCode(() => h.execute("reopenAttendanceDay", {
    attendanceDayId: "ATD-S1-2026-07-29"
  }), "ATTENDANCE_PERMISSION_DENIED");
});

test("overtime request, manager approval, cap enforcement, and self-approval rules are append-only", () => {
  const h = harness();
  h.execute("attendanceCheckIn");
  h.setNow("2026-07-29T18:00:00+03:00");
  const day = h.execute("attendanceCheckOut").attendanceDay;
  const requested = h.execute("requestAttendanceOvertime", { attendanceDayId: day.attendanceDayId });
  errorCode(() => h.execute("approveAttendanceOvertime", {
    as: "manager", overtimeApprovalId: requested.overtimeApproval.overtimeApprovalId,
    approvedMinutes: 121
  }), "ATTENDANCE_OVERTIME_EXCEEDS_ELIGIBLE");
  const approved = h.execute("approveAttendanceOvertime", {
    as: "manager", overtimeApprovalId: requested.overtimeApproval.overtimeApprovalId,
    approvedMinutes: 60
  });
  assert.equal(approved.attendanceDay.approvedOvertimeMinutes, 60);
  assert.equal(h.repository.getState().overtime.length, 2);
});

test("changed attendance makes a prior overtime approval stale and approved minutes resolve to zero", () => {
  const day = phase3.calculateDay({
    attendanceDayId: "D", staff: { staffId: "S1", staffName: "Ali" },
    date: "2026-07-29", schedule: schedule(),
    events: [
      { eventId: "1", eventType: "CHECK_IN", eventAt: "2026-07-29T09:00:00+03:00" },
      { eventId: "2", eventType: "CHECK_OUT", eventAt: "2026-07-29T18:00:00+03:00" }
    ],
    overtimeApprovals: [{
      status: "APPROVED", rawOvertimeMinutes: 30, approvedOvertimeMinutes: 30,
      createdAt: "2026-07-29T18:01:00+03:00", stale: false
    }],
    policy: {}, now: "2026-07-29T18:02:00+03:00"
  });
  assert.equal(day.rawOvertimeMinutes, 60);
  assert.equal(day.approvedOvertimeMinutes, 0);
  assert.ok(day.calculationWarnings.includes("STALE_OVERTIME_APPROVAL"));
});

test("audit failure rolls back event, day, audit, and idempotency writes", () => {
  const base = phase3.createMemoryRepository({
    staff: [{ staffId: "S1", staffName: "Ali", branchId: "B1", active: true }],
    policies: [{ policyId: "P", staffId: "", active: true,
      effectiveFrom: "2026-01-01", effectiveTo: "2026-12-31", requiredDailyMinutes: 480 }]
  });
  const repository = Object.create(base);
  repository.appendAudit = () => { throw phase3.attendanceError("AUDIT_WRITE_FAILED", "fault"); };
  const h = harness({ repository });
  errorCode(() => h.execute("attendanceCheckIn"), "AUDIT_WRITE_FAILED");
  assert.equal(base.getState().events.length, 0);
  assert.equal(base.getState().days.length, 0);
  assert.equal(base.getState().idempotency.length, 0);
});

test("before/after audit evidence is retained while response filtering removes sensitive fields", () => {
  const h = harness();
  h.execute("attendanceCheckIn");
  const audit = h.repository.getState().audit[0];
  assert.ok(audit.beforeStateJson);
  assert.ok(audit.afterStateJson);
  assert.deepEqual(phase3.filterSensitiveFields({
    staffId: "S1", salary: 10, hourlyRate: 3, nested: { token: "x", workedMinutes: 4 }
  }), { staffId: "S1", nested: { workedMinutes: 4 } });
});

test("legacy attendance reader remains immutable and malformed rows report explicit incompatibility", () => {
  const headers = [...schema.LEGACY_ATTENDANCE_HEADERS];
  const row = headers.map(header => ({
    ID: "OLD-1", DATE: "2026-07-29", STAFF_ID: "S1", STAFF_NAME: "Ali",
    CHECK_IN: "09:00", CHECK_OUT: "17:00"
  })[header] || "");
  const normalized = core.normalizeLegacyAttendanceRow(row, headers);
  assert.equal(normalized.readOnly, true);
  assert.equal(normalized.compatibilityStatus, "LEGACY_UNMIGRATED");
  errorCode(() => core.normalizeLegacyAttendanceRow(row, headers.slice(1)),
    "INCOMPATIBLE_EXISTING_SCHEMA");
});

test("migration preview is zero-write, permits approved staging review, and blocks production", () => {
  const existing = { ATTENDANCE: [...schema.LEGACY_ATTENDANCE_HEADERS] };
  const identity = {
    environment: "development", expectedSpreadsheetId: "DEV", actualSpreadsheetId: "DEV"
  };
  const first = phase3.planAttendanceMigration(existing, identity);
  const second = phase3.planAttendanceMigration(existing, identity);
  assert.deepEqual(first, second);
  assert.equal(first.writes, 0);
  assert.equal(first.executionAllowed, false);
  assert.ok(first.appendColumns.ATTENDANCE.length > 0);
  const duplicate = phase3.planAttendanceMigration({
    ATTENDANCE: ["ID", "ID"]
  }, identity);
  assert.ok(duplicate.errors.some(error => error.code === "DUPLICATE_HEADERS"));
  const staging = phase3.planAttendanceMigration({}, {
    environment: "staging", expectedSpreadsheetId: "X", actualSpreadsheetId: "X",
    environmentReviewApproved: true
  });
  assert.equal(staging.errors.some(error => error.code === "ENVIRONMENT_NOT_APPROVED"), false);
  assert.equal(staging.errors.some(error => error.code === "PHASE3_ENVIRONMENT_BLOCKED"), false);
  assert.equal(staging.safe, true);
  assert.equal(staging.writes, 0);
  assert.equal(staging.executionAllowed, false);
  const unapprovedStaging = phase3.planAttendanceMigration({}, {
    environment: "staging", expectedSpreadsheetId: "X", actualSpreadsheetId: "X"
  });
  assert.ok(unapprovedStaging.errors.some(error => error.code === "ENVIRONMENT_NOT_APPROVED"));
  const production = phase3.planAttendanceMigration({}, {
    environment: "production", expectedSpreadsheetId: "X", actualSpreadsheetId: "X"
  });
  assert.ok(production.errors.some(error => error.code === "PHASE3_ENVIRONMENT_BLOCKED"));
});

test("Apps Script bundle has exact dependency order, no CommonJS dependency, and matches generated source", () => {
  assert.deepEqual(SOURCE_ORDER, [
    "staff-attendance-schema.js", "staff-attendance-core.js",
    "staff-scheduling-phase2.js", "staff-scheduling-phase2-gas.js",
    "staff-attendance-phase3.js", "staff-attendance-phase3-gas.js"
  ]);
  const generated = buildBundle({ write: false }).bundle;
  const stored = fs.readFileSync(path.join(ROOT, "scripts/staff-attendance-phase3-apps-script-bundle.gs"), "utf8");
  assert.equal(stored, generated);
  const context = vm.createContext({});
  vm.runInContext(generated, context);
  assert.ok(context.StaffAttendancePhase3);
  assert.equal(typeof context.handleStaffAttendancePhase3Action, "function");
});

test("GAS Attendance reader normalizes Sheets date-only values in Cairo without changing timestamps", () => {
  const source = fs.readFileSync(path.join(ROOT, "scripts/staff-attendance-phase3-gas.js"), "utf8");
  const sheetDate = new Date("2026-08-08T21:00:00.000Z");
  const sheetTime = new Date("1899-12-30T13:54:51.000Z");
  const actualCheckIn = "2026-08-09T13:00:00+03:00";
  const calculatedAt = "2026-08-09T14:05:00+03:00";
  const context = vm.createContext({
    console,
    StaffAttendancePhase3: { TIME_ZONE: "Africa/Cairo" },
    Utilities: {
      formatDate(value, timezone, format) {
        assert.equal(timezone, "Africa/Cairo");
        if (format === "yyyy-MM-dd") {
          assert.equal(value.getTime(), sheetDate.getTime());
          return "2026-08-09";
        }
        assert.equal(format, "HH:mm");
        if (value.getTime() === sheetTime.getTime()) return "16:00";
        assert.equal(value.getTime(), new Date("1899-12-30T16:24:51.000Z").getTime());
        return "18:30";
      }
    },
    schedulePhase2Text(value) {
      return String(value === undefined || value === null ? "" : value).trim();
    },
    schedulePhase2ReadRows() {
      return [{
        attendanceDayId: "ATD-S1-2026-08-09",
        staffId: 1784232573966,
        attendanceDate: "2026-08-08T21:00:00.000Z",
        scheduledStart: sheetTime.toISOString(),
        scheduledEnd: "1899-12-30T16:24:51.000Z",
        timezone: "Africa/Cairo",
        actualCheckIn,
        calculatedAt,
        locked: false,
        openSession: false,
        openBreak: false,
        staleCalculation: false
      }];
    }
  });
  vm.runInContext(source, context);

  assert.equal(context.attendancePhase3DateOnly(sheetDate, "Africa/Cairo"), "2026-08-09");
  const rows = context.attendancePhase3ReadDays();
  assert.equal(rows[0].attendanceDate, "2026-08-09");
  assert.equal(rows[0].staffId, "1784232573966");
  assert.equal(rows[0].scheduledStart, "16:00");
  assert.equal(rows[0].scheduledEnd, "18:30");
  assert.equal(rows[0].actualCheckIn, actualCheckIn);
  assert.equal(rows[0].calculatedAt, calculatedAt);
});

test("GAS adapter enforces identity, complete schema, lock, append-only writes, rollback, and durable recovery marker", () => {
  const source = fs.readFileSync(path.join(ROOT, "scripts/staff-attendance-phase3-gas.js"), "utf8");
  for (const evidence of [
    "attendancePhase3AssertEnvironmentIdentity", "attendancePhase3AssertWriteReady",
    "LockService.getScriptLock", "ATTENDANCE_RECOVERY_", "schedulePhase2RollbackTransaction",
    "ATTENDANCE_COMPENSATION_FAILED", "appendOnly", "ATTENDANCE_APPEND_ID_COLLISION"
  ]) assert.ok(source.includes(evidence), evidence);
});

test("Attendance UI is Arabic RTL, text-safe, keyboard-aware, stale-response-safe, and contains no payroll values", () => {
  const html = fs.readFileSync(path.join(ROOT, "public/pages/attendance.html"), "utf8");
  const js = fs.readFileSync(path.join(ROOT, "public/assets/js/pages/attendance.js"), "utf8");
  assert.match(html, /lang="ar" dir="rtl"/);
  assert.match(html, /aria-labelledby="actionDialogTitle"/);
  assert.match(html, /aria-live="assertive"/);
  assert.doesNotMatch(js, /\.innerHTML\s*=/);
  assert.doesNotMatch(html, /\son[a-z]+=/i);
  assert.match(js, /replaceChildren/);
  assert.match(js, /requestSequence/);
  assert.match(js, /trapFocus/);
  assert.match(js, /setInterval\(loadDashboard, 60000\)/);
  assert.doesNotMatch(html + js, /salary|monetary deduction|payable overtime/i);
});

test("active router dispatches Phase 3 before Phase 2 and disables legacy attendance mutations", () => {
  const source = fs.readFileSync(path.join(ROOT, "scripts/app-script-final-owner-access.js"), "utf8");
  const phase3Index = source.indexOf("handleStaffAttendancePhase3Action");
  const phase2Index = source.indexOf("handleStaffSchedulingPhase2Action");
  assert.ok(phase3Index > 0 && phase3Index < phase2Index);
  const disabledIndex = source.indexOf("ATTENDANCE_LEGACY_PATH_DISABLED");
  assert.ok(disabledIndex > 0 && disabledIndex < phase3Index &&
    disabledIndex < source.indexOf("function createAttendanceRecord"));
  [
    "createAttendanceRecord", "getAttendanceRecords", "updateAttendanceStep",
    "approveAttendanceDeduction", "deleteAttendanceRecord"
  ].forEach(action => assert.ok(source.slice(0, disabledIndex).includes(`"${action}"`)));
});

test("Phase 3 source contains no payroll settlement or Booking Availability implementation", () => {
  const sources = [
    "scripts/staff-attendance-phase3.js",
    "scripts/staff-attendance-phase3-gas.js",
    "public/assets/js/pages/attendance.js"
  ].map(file => fs.readFileSync(path.join(ROOT, file), "utf8")).join("\n");
  assert.doesNotMatch(sources, /calculateSettlement|lockSettlement|PAYROLL_ATTENDANCE_SETTLEMENTS/);
  assert.doesNotMatch(sources, /getPublicBooking|createBooking|Booking Availability|availability/i);
});

test("strict review: legacy rows are classified, immutable, ambiguity-safe, and read through a non-write action", () => {
  const headers = [...schema.LEGACY_ATTENDANCE_HEADERS, "DELETED"];
  const base = [
    "L1", "2026-07-29", "S1", "Ali", "work", "09:00",
    "09:01", "", "", "17:00", 7.98, 0, 0, 0, 0, 0, "", 0, 0, "", "", "", "", ""
  ];
  const records = phase3.normalizeLegacyAttendanceRows(headers, [
    [...base, ""],
    [{ ...base }], // invalid non-scalar fixture must never activate
    [...base.slice(0, 6), "bad", ...base.slice(7), ""],
    [...base.slice(0, 2), "S1", ...base.slice(3), ""],
    [...base.slice(0, 1), "2026-07-30", ...base.slice(2), "TRUE"]
  ]);
  assert.equal(records[0].compatibilityStatus, "LEGACY_AMBIGUOUS");
  assert.equal(records[2].compatibilityStatus, "LEGACY_INVALID");
  assert.equal(records[3].compatibilityStatus, "LEGACY_AMBIGUOUS");
  assert.equal(records[4].compatibilityStatus, "LEGACY_DELETED");
  assert.ok(records.every(item => item.readOnly));
  assert.ok(!phase3.WRITE_ACTIONS.has("listLegacyAttendanceRecords"));

  const h = harness({ seed: { legacy: records } });
  const result = h.execute("listLegacyAttendanceRecords");
  assert.equal(result.readOnly, true);
  assert.ok(result.records.every(item => item.staffId === "S1"));
});

test("strict review: duplicate normalized legacy headers fail closed", () => {
  errorCode(() => phase3.normalizeLegacyAttendanceRows(
    ["ID", "staff id", "STAFF-ID"], [["L1", "S1", "S1"]]
  ), "ATTENDANCE_LEGACY_DUPLICATE_HEADERS");
});

test("strict review: equal timestamp replay uses explicit sequence and excludes administrative events", () => {
  const at = "2026-07-29T09:00:00+03:00";
  const state = phase3.buildEventState([
    { eventId: "Z", eventType: "CLOSE_DAY", eventAt: at, eventSequence: 1 },
    { eventId: "A", eventType: "CHECK_IN", eventAt: at, eventSequence: 2 }
  ]);
  assert.equal(state.sessions.length, 1);
  assert.equal(state.sessions[0].checkInAt, at);
  assert.equal(state.openSession, true);
});

test("strict review: DTO sanitizer removes nested secrets including serialized evidence", () => {
  const filtered = phase3.filterSensitiveFields({
    beforeStateJson: JSON.stringify({
      salary: 5000, hourlyRate: 25, recoveryMarker: "private", safe: "visible"
    }),
    policySnapshot: { requiredDailyMinutes: 480, salaryAmount: 9000 }
  });
  const serialized = JSON.stringify(filtered);
  assert.doesNotMatch(serialized, /salary|hourlyRate|recoveryMarker|5000|9000/i);
  assert.match(serialized, /visible/);
  assert.equal(filtered.policySnapshot.requiredDailyMinutes, 480);
});

test("strict review: UI invokes server filters, migration preview, event correction, and unpersisted-day evidence lookup", () => {
  const js = fs.readFileSync(path.join(ROOT, "public/assets/js/pages/attendance.js"), "utf8");
  assert.match(js, /listUnresolvedAttendanceDays/);
  assert.match(js, /listOpenAttendanceBreaks/);
  assert.match(js, /previewAttendanceMigration/);
  assert.match(js, /replacesEventId/);
  assert.match(js, /attendanceDate:\s*day\.attendanceDate/);
  assert.match(js, /selfStaffId/);
});

for (const boundary of ["appendEvent", "saveDay", "appendAudit", "saveIdempotency"]) {
  test(`strict review: ${boundary} failure leaves no event, aggregate, audit, or idempotency divergence`, () => {
    const base = phase3.createMemoryRepository({
      staff: [{ staffId: "S1", staffName: "Ali", branchId: "B1", active: true }],
      policies: [{
        policyId: "POL-1", effectiveFrom: "2026-01-01", effectiveTo: "2026-12-31",
        requiredDailyMinutes: 480, allowedBreakMinutes: 0, active: true
      }]
    });
    const repository = Object.create(base);
    repository[boundary] = function () {
      const error = new Error(`injected ${boundary} failure`);
      error.code = `INJECTED_${boundary.toUpperCase()}_FAILURE`;
      throw error;
    };
    const h = harness({ repository });
    errorCode(() => h.execute("attendanceCheckIn"), `INJECTED_${boundary.toUpperCase()}_FAILURE`);
    const state = base.getState();
    assert.equal(state.events.length, 0);
    assert.equal(state.days.length, 0);
    assert.equal(state.audit.length, 0);
    assert.equal(state.idempotency.length, 0);
  });
}
