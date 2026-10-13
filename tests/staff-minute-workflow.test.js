"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
function runtime() {
  const context = vm.createContext({ console, Utilities: {
    DigestAlgorithm: { SHA_256: "sha256" }, Charset: { UTF_8: "utf8" },
    computeDigest: (_algorithm, value) => Array.from(require("node:crypto").createHash("sha256").update(value).digest())
  } });
  for (const file of ["062_phase_staff-attendance-schema.gs", "063_phase_staff-attendance-core.gs",
    "064_phase_staff-scheduling-phase2.gs", "067_phase_staff-attendance-phase3.gs",
    "069_phase_staff-payroll-attendance-phase4.gs", "073_phase_booking-availability-phase5.gs",
    "030_staff_branch-repository.gs", "089_availability_action-router.gs"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "../apps-script/production", file), "utf8"), context);
  }
  return context;
}
function harness() {
  const c = runtime(), p = c.StaffAttendancePhase3;
  const repo = p.createMemoryRepository({ staff: [{ staffId: "S1", staffName: "Staff", branchId: "B1", active: true }] });
  let time = "2026-10-13T08:00:00+03:00", date = "2026-10-13", sequence = 0;
  const service = p.createService({ repository: repo, now: () => time, uuid: () => `uuid${++sequence}`,
    actorResolver: () => ({ actorId: "owner", username: "owner", owner: true, permissions: [] }),
    scheduleResolver: (staff, date) => {
      let policyResolution;
      try { policyResolution = c.StaffAttendanceCore.resolveEffectivePolicy(repo.listPolicies(), staff.staffId, date); }
      catch (error) { if (error.code !== "POLICY_NOT_FOUND") throw error; policyResolution = { snapshot: {} }; }
      return c.StaffSchedulingPhase2.resolveSchedule({ staff, date, schedules: [], overrides: [], policyResolution });
    } });
  const execute = (action, input = {}) => service.execute(action, {
    action, requestId: `REQUEST-${++sequence}`, reason: "owner decision", staffId: "S1", ...input
  });
  const configure = (overrides = {}) => execute("createWorkPolicy", { simpleMinutePolicy: true,
    effectiveFrom: "2026-10-13", defaultShiftStart: "10:00", defaultShiftEnd: "19:00",
    requiredWorkMinutes: 480, allowedBreakMinutes: 60, graceLateMinutes: 0,
    deficitRateMinorPerMinute: 200, overtimeRateMinorPerMinute: 300, ...overrides });
  return { c, p, repo, execute, configure,
    date: value => { date = value; time = `${date}T08:00:00+03:00`; },
    at: value => { time = `${date}T${value}:00+03:00`; } };
}
function finish(h, checkIn = "10:00", breakEnd = "14:00", checkOut = "19:00") {
  h.at(checkIn); h.execute("attendanceCheckIn");
  h.at("13:00"); h.execute("attendanceStartBreak", { plannedBreakMinutes: 60 });
  h.at(breakEnd); h.execute("attendanceEndBreak");
  h.at(checkOut); h.execute("attendanceCheckOut");
  return h.repo.listDays({}).at(-1);
}
test("first owner policy configures variable hours, break and exact integer prices without a source", () => {
  const h = harness(); h.configure({ defaultShiftEnd: "17:30", requiredWorkMinutes: 420, allowedBreakMinutes: 30 });
  const policy = h.repo.listPolicies()[0];
  assert.equal(policy.requiredDailyMinutes, 420);
  assert.equal(policy.allowedBreakMinutes, 30);
  assert.equal(policy.deficitRateMinorPerMinute, 200);
  assert.equal(policy.overtimeApprovalRequired, true);
  assert.equal(h.repo.listAudit({}).length, 1);
  assert.throws(() => h.configure({ defaultShiftEnd: "11:00" }), { code: "WORK_POLICY_SHIFT_TOO_SHORT" });
});
test("planned shift fallback supports overnight work without a fixed nine-hour constant", () => {
  const h = harness(); h.configure({ defaultShiftStart: "20:00", defaultShiftEnd: "05:00" });
  const staff = h.repo.getStaff("S1");
  const resolved = h.c.StaffSchedulingPhase2.resolveSchedule({ staff, date: "2026-10-13", schedules: [], overrides: [],
    policyResolution: h.c.StaffAttendanceCore.resolveEffectivePolicy(h.repo.listPolicies(), "S1", "2026-10-13") });
  assert.equal(resolved.shiftSegments[0].overnight, true);
  assert.equal(resolved.requiredWorkMinutes, 480);
});
test("late, early and excess break have distinct prices and no double total", () => {
  const h = harness(); h.configure();
  const day = finish(h, "10:10", "14:20", "18:45");
  const entry = h.p.calculateMinuteAccounting(day);
  assert.deepEqual(Array.from(entry.reasons, item => item.minutes), [10, 15, 20]);
  assert.equal(entry.deductionMinor, 9000);
  assert.equal(entry.overtimeMinor, 0);
  assert.equal(day.deficitMinutesRaw, 45);
});
test("overtime does not offset late minutes and enters accounting only after explicit owner approval", () => {
  const h = harness(); h.configure();
  let day = finish(h, "10:10", "14:00", "19:30");
  assert.equal(day.eligibleOvertimeMinutes, 30);
  assert.equal(h.p.calculateMinuteAccounting(day).deductionMinor, 2000);
  assert.equal(h.p.calculateMinuteAccounting(day).overtimeMinor, 0);
  const request = h.execute("requestAttendanceOvertime", { attendanceDayId: day.attendanceDayId });
  h.execute("approveAttendanceOvertime", { overtimeApprovalId: request.overtimeApproval.overtimeApprovalId,
    approvedMinutes: 15, requestId: "APPROVAL-ONCE" });
  day = h.repo.listDays({})[0];
  assert.equal(h.p.calculateMinuteAccounting(day).overtimeMinor, 4500);
  assert.equal(h.p.calculateMinuteAccounting(day).deductionMinor, 2000);
  h.execute("approveAttendanceOvertime", { overtimeApprovalId: request.overtimeApproval.overtimeApprovalId,
    approvedMinutes: 15, requestId: "APPROVAL-ONCE" });
  assert.equal(h.repo.listOvertime({}).filter(item => item.status === "APPROVED").length, 1);
  assert.throws(() => h.execute("approveAttendanceOvertime", { overtimeApprovalId: request.overtimeApproval.overtimeApprovalId,
    approvedMinutes: 15 }), { code: "ATTENDANCE_OVERTIME_ALREADY_REVIEWED" });
});
test("rejected overtime remains zero in employee accounts", () => {
  const h = harness(); h.configure(); const day = finish(h, "10:00", "14:00", "19:30");
  const request = h.execute("requestAttendanceOvertime", { attendanceDayId: day.attendanceDayId });
  h.execute("rejectAttendanceOvertime", { overtimeApprovalId: request.overtimeApproval.overtimeApprovalId });
  assert.equal(h.p.calculateMinuteAccounting(h.repo.listDays({})[0]).overtimeMinor, 0);
});
test("new settings do not rewrite a day snapshot, and replacement preserves the earlier effective range", () => {
  const h = harness(); const first = h.configure(); finish(h);
  assert.throws(() => h.configure({ replacePolicyId: first.workPolicy.policyId }), { code: "WORK_POLICY_RECORDED_DAYS_PROTECTED" });
  h.configure({ replacePolicyId: first.workPolicy.policyId, effectiveFrom: "2026-10-14", deficitRateMinorPerMinute: 500 });
  assert.equal(h.repo.getPolicy(first.workPolicy.policyId).effectiveTo, "2026-10-13");
  assert.equal(h.repo.listDays({})[0].policySnapshot.deficitRateMinorPerMinute, 200);
});
test("monthly review uses the same daily prices as accounts across a mid-period configuration change", () => {
  const h = harness(); const first = h.configure();
  let day = finish(h, "10:10", "14:00", "19:00");
  h.execute("closeAttendanceDay", { attendanceDayId: day.attendanceDayId });
  h.configure({ replacePolicyId: first.workPolicy.policyId, effectiveFrom: "2026-10-14", deficitRateMinorPerMinute: 500 });
  h.date("2026-10-14"); day = finish(h, "10:10", "14:00", "19:00");
  h.execute("closeAttendanceDay", { attendanceDayId: day.attendanceDayId });
  const days = h.repo.listDays({});
  const settlement = h.c.StaffPayrollAttendancePhase4.calculateEmployeeSettlement({
    period: { payrollPeriodId: "P1", startDate: "2026-10-13", endDate: "2026-10-14" },
    staff: { ...h.repo.getStaff("S1"), salary: "5000" }, policies: h.repo.listPolicies(), days
  });
  assert.equal(settlement.deficitDeductionMinor, 7000);
  assert.equal(days.reduce((sum, item) => sum + h.p.calculateMinuteAccounting(item).deductionMinor, 0), 7000);
});
test("replacement ending the previous policy rolls back if audit persistence fails", () => {
  const h = harness(); const first = h.configure();
  const before = JSON.stringify(h.repo.getState());
  h.repo.appendAudit = () => { throw new Error("audit unavailable"); };
  assert.throws(() => h.configure({ replacePolicyId: first.workPolicy.policyId, effectiveFrom: "2026-10-14" }), /audit unavailable/);
  assert.equal(JSON.stringify(h.repo.getState()), before);
});
test("new form parses decimal prices exactly and does not require an existing policy", () => {
  const c = vm.createContext({ RomeoAuth: { requireAuth: () => null }, document: { addEventListener() {} } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../public/assets/js/pages/schedule-management.js"), "utf8"), c);
  const input = { staffId: "S1", effectiveFrom: "2026-10-13", reason: "set prices", defaultShiftStart: "10:00",
    defaultShiftEnd: "19:00", requiredWorkMinutes: "480", allowedBreakMinutes: "60", graceLateMinutes: "0",
    deductionPerMinute: "0.29", overtimePerMinute: "2.05" };
  const result = c.buildMinuteWorkPolicyPayload(input, "REQ-PRICE");
  assert.equal(result.deficitRateMinorPerMinute, 29);
  assert.equal(result.overtimeRateMinorPerMinute, 205);
  assert.equal(result.replacePolicyId, "");
  assert.throws(() => c.buildMinuteWorkPolicyPayload({ ...input, deductionPerMinute: "0.001" }, "REQ-BAD"));
});
test("open sessions and reopened days stay provisional, not financial zero evidence", () => {
  const h = harness(); h.configure(); h.at("10:10"); h.execute("attendanceCheckIn");
  assert.equal(h.p.calculateMinuteAccounting(h.repo.listDays({})[0]).provisional, true);
  const other = harnessWithClosedDay(); const closed = finish(other);
  other.execute("closeAttendanceDay", { attendanceDayId: closed.attendanceDayId });
  other.execute("reopenAttendanceDay", { attendanceDayId: closed.attendanceDayId });
  assert.equal(other.p.calculateMinuteAccounting(other.repo.listDays({})[0]).provisional, true);
});
function harnessWithClosedDay() { const h = harness(); h.configure(); return h; }
test("same-day availability blocks before check-in, open break and checkout for both audiences; future dates use schedules", () => {
  const c = runtime();
  const base = { date: "2026-10-13", today: "2026-10-13", branchId: "B1",
    staff: { staffId: "S1", branchId: "B1", active: true }, branchOpen: true,
    branchSegments: [{ start: "10:00", end: "19:00" }],
    schedule: { active: true, classification: "WORKING_DAY", shiftSegments: [{ shiftStart: "10:00", shiftEnd: "19:00" }] },
    durationMinutes: 30, serverNowMinute: 600, generatedAt: "2026-10-13T10:00:00+03:00",
    attendanceLiveEnabled: true, operationalOverrides: [{ startTime: "10:00", endTime: "19:00" }] };
  for (const audience of ["public", "internal"]) {
    for (const state of ["NOT_STARTED", "ON_BREAK", "CHECKED_OUT"]) {
      assert.equal(c.BookingAvailabilityPhase5.calculateAvailability({ ...base, audience, attendance: { state, openBreak: true } }).slots.length, 0);
    }
    assert.ok(c.BookingAvailabilityPhase5.calculateAvailability({ ...base, audience, attendance: { state: "CHECKED_IN" } }).slots.length > 0);
    assert.ok(c.BookingAvailabilityPhase5.calculateAvailability({ ...base, audience, date: "2026-10-14", attendance: { state: "NOT_STARTED" } }).slots.length > 0);
  }
});
test("staff read derives period totals from unique daily records; repeated reads never write", () => {
  const h = harness(); h.configure(); finish(h, "10:10", "14:20", "18:45");
  const headers = ["NAME", "CODE", "SALARY", "PERCENTAGE", "ID", "BONUS", "DEDUCTION", "ACTIVE", "CREATED_AT", "UPDATED_AT", "IS_BARBER"];
  const row = ["Staff", "S1", 5000, 10, "S1", 0, 0, true, "", "", true];
  Object.assign(h.c, { getStaffSheet: () => ({ getLastRow: () => 2, getLastColumn: () => headers.length,
    getRange: start => ({ getValues: () => start === 1 ? [headers] : [row] }) }),
    getApprovedAttendanceTotalsForCurrentMonth: () => ({}), attendancePhase3ReadDays: () => h.repo.listDays({}),
    staffResolveHeaders_: x => x, parseSheetAmount: Number, parseSheetBoolean: x => x,
    getDisplayDateTime: x => x, normalizeLookupKey: x => String(x).toLowerCase(), jsonOutput: x => x,
    getOptionalDateRange: () => null, getCairoDateKey: () => "2026-10-13" });
  for (let read = 0; read < 2; read++) {
    const result = h.c.getStaff({}); assert.equal(result.status, "success");
    assert.equal(result.staff[0].attendanceDeduction, 90);
    assert.equal(result.staff[0].attendanceEntries.length, 1);
  }
  assert.equal(h.repo.listDays({}).length, 1);
});
test("booking activation requires owner and configured staff; failures restore the previous flags", () => {
  const h = harness(); h.configure(); const properties = new Map([["BOOKING_AVAILABILITY_ENGINE", "SHADOW"]]);
  let isOwner = false, ready = false, failAudit = false;
  Object.assign(h.c, {
    bookingAvailabilityPhase5AssertIdentity() {},
    bookingAvailabilityPhase5Actor: () => ({ owner: isOwner, actorId: "owner" }),
    bookingAvailabilityPhase5Text: value => String(value || "").trim(),
    bookingAvailabilityPhase5ValidRequestId: () => true,
    bookingAvailabilityPhase5WithLock: callback => callback(),
    bookingAvailabilityPhase5RequestSnapshot: () => ({ policies: ready ? h.repo.listPolicies() : [] }),
    publicBookingBarbers: () => h.repo.listStaff(),
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => properties.get(key) ?? null,
      setProperties: values => Object.entries(values).forEach(([key, value]) => properties.set(key, value)),
      setProperty: (key, value) => properties.set(key, value), deleteProperty: key => properties.delete(key) }) },
    bookingAvailabilityPhase5IncrementGeneration() {},
    bookingAvailabilityPhase5AppendAudit() { if (failAudit) throw new Error("AUDIT_FAILURE"); },
    bookingAvailabilityPhase5RunTransaction(options) {
      try { options.business(); options.version(); options.audit(); return options.response(); }
      catch (error) { options.compensateBusiness(); throw error; }
    }, jsonOutput: value => value
  });
  h.c.Utilities.formatDate = () => "2026-10-13";
  const request = { action: "setBookingAttendanceIntegration", enabled: true, reason: "owner setup", clientRequestId: "CONFIG-ONE" };
  assert.equal(h.c.handleBookingAvailabilityPhase5Action(request).status, "error");
  assert.equal(properties.get("BOOKING_AVAILABILITY_ENGINE"), "SHADOW");
  isOwner = true;
  assert.equal(h.c.handleBookingAvailabilityPhase5Action(request).status, "error");
  ready = true; failAudit = true;
  assert.equal(h.c.handleBookingAvailabilityPhase5Action(request).status, "error");
  assert.equal(properties.get("BOOKING_AVAILABILITY_ENGINE"), "SHADOW");
  failAudit = false;
  assert.equal(h.c.handleBookingAvailabilityPhase5Action(request).status, "success");
  assert.equal(properties.get("BOOKING_AVAILABILITY_ENGINE"), "PHASE5");
  assert.equal(properties.get("BOOKING_ATTENDANCE_LIVE_ENABLED"), "true");
  assert.equal(properties.get("BOOKING_CUSTOMER_LIVE_REFRESH_ENABLED"), "true");
  assert.equal(properties.get("BOOKING_INTERNAL_LIVE_REFRESH_ENABLED"), "true");
  assert.equal(properties.get("BOOKING_MANAGER_OVERRIDE_ENABLED"), "false");
});
