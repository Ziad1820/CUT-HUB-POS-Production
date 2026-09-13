// Local VM only: production adapters run against in-memory read-only fixtures.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const root = path.join(__dirname, '..');
const BASE = '7ce47eafc796e5215e9a69d2faca130ae922d680';
const committed = file => execFileSync('git', ['show', `${BASE}:${file}`], { cwd: root, encoding: 'utf8', maxBuffer: 8e6 }).replace(/\r\n/g, '\n');
const source = fs.readFileSync(path.join(root, 'production-phase5-divergence-root-cause-readonly.REVIEW.gs'), 'utf8').replace(/\r\n/g, '\n');
const core = committed('scripts/booking-availability-phase5.js');
const gas = committed('scripts/booking-availability-phase5-gas.js');
const legacy = committed('scripts/app-script-final-owner-access.js');
const dependencies = ['staff-attendance-schema', 'staff-attendance-core', 'staff-scheduling-phase2'].map(n => committed(`scripts/${n}.js`));
function fn(text, name) {
  const match = new RegExp(`^([ ]*)function ${name}\\(`, 'm').exec(text);
  assert.ok(match, `function ${name} exists`);
  const end = text.indexOf('\n' + match[1] + '}', match.index);
  assert.ok(end > match.index);
  return text.slice(match.index, end + match[1].length + 2);
}
const plain = x => JSON.parse(JSON.stringify(x));
const scriptId = '1UmjdRMGLukMt_0Be_ZL2krphwtZ-CQHPOiZ3GF10pY9-glgvoubfGflP';
const spreadsheetId = '1r0I9J-IZF1GhMC4Yvj73S8VdjJQxMfmOgP4v0ZFNOb0';
const staffId = '1784232573966', branchId = 'CUT_HUB_MAIN', date = '2026-09-30';
const baseline = {
  BOOKING_AVAILABILITY_ENGINE: 'SHADOW', BOOKING_PHASE2_PLANNED_ENABLED: 'true',
  BOOKING_ATTENDANCE_LIVE_ENABLED: 'false', BOOKING_CUSTOMER_LIVE_REFRESH_ENABLED: 'false',
  BOOKING_INTERNAL_LIVE_REFRESH_ENABLED: 'false', BOOKING_MANAGER_OVERRIDE_ENABLED: 'false',
  BOOKING_CONFLICT_RESOLUTION_ENABLED: 'false', BOOKING_NO_CHECK_IN_DETECTOR_ENABLED: 'false'
};
const booking = (extra = {}) => ({ id: 'PRIVATE_BOOKING', employeeId: staffId, employee: 'PRIVATE_EMPLOYEE', date,
  time: '13:00', durationMinutes: 30, status: 'confirmed', customerName: 'PRIVATE_CUSTOMER',
  phone: 'PRIVATE_PHONE', email: 'PRIVATE_EMAIL', notes: 'PRIVATE_NOTES', serviceName: 'PRIVATE_SERVICE', ...extra });
function harness() {
  const state = { now: Date.parse('2026-09-13T09:00:00Z'), identity: { scriptId, spreadsheetId, active: 'owner@test', effective: 'owner@test', owner: 'owner@test' },
    properties: { ...baseline, CUT_HUB_ENVIRONMENT: 'production', CUT_HUB_PRODUCTION_SPREADSHEET_ID: spreadsheetId },
    services: [{ serviceId: 'SRV-bb949f91-2808-487f-aaa6-0d3e47790e37', active: true, durationMinutes: 30, preparationMinutes: 0, cleanupMinutes: 0 }],
    barbers: [{ staffId, name: 'osama', active: true, isBarber: true, branchId }],
    legacySchedule: { scheduled: true, shiftStart: '12:00', shiftEnd: '02:00' }, attendance: null,
    afterEvaluate: null, snapshots: 0, cacheAccess: 0, writes: 0, propertyReads: [], evalCalls: [] };
  state.data = { staff: [{ staffId, name: 'osama', active: true, branchId }], bookings: [],
    branches: [{ branchId, active: true, timeZone: 'Africa/Cairo', publicSelectable: true, closureStatus: 'OPEN' }],
    branchHours: [{ branchId, active: true, weekday: 'WEDNESDAY', openTime: '12:00', closeTime: '02:00' }],
    schedules: [{ scheduleId: 'SCH-1', staffId, active: true, weekday: 'WEDNESDAY', effectiveFrom: '2026-01-01', shiftStart: '12:00', shiftEnd: '02:00' }],
    scheduleOverrides: [], policies: [], versions: [], generations: [], overrides: [], attendanceDays: [], attendanceEvents: [] };
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [state.now])); } static now() { return state.now; } }
  const tables = { STAFF_SCHEDULE_OVERRIDES: 'scheduleOverrides', STAFF_WORK_POLICIES: 'policies',
    BOOKING_BRANCH_REGISTRY: 'branches', BOOKING_AVAILABILITY_VERSIONS: 'versions', BOOKING_AVAILABILITY_GENERATIONS: 'generations',
    BOOKING_OPERATIONAL_OVERRIDES: 'overrides', ATTENDANCE_EVENTS: 'attendanceEvents', BRANCH_BOOKING_HOURS: 'branchHours' };
  const forbidden = () => { state.writes++; throw Error('PRIVATE_WRITE'); };
  const context = vm.createContext({ Date: Clock,
    Utilities: { formatDate: (d, zone, pattern) => {
      if (pattern === 'EEEE') return 'Wednesday';
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
      const p = Object.fromEntries(parts.map(v => [v.type, v.value]));
      if (pattern === 'yyyy-MM-dd') return `${p.year}-${p.month}-${p.day}`;
      if (pattern === 'H') return p.hour;
      if (pattern === 'm') return p.minute;
      if (pattern === 'HH:mm') return `${p.hour}:${p.minute}`;
      return d.toISOString();
    } },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => { state.propertyReads.push(k); return state.properties[k] ?? null; }, setProperty: forbidden, setProperties: forbidden }) },
    ScriptApp: { getScriptId: () => state.identity.scriptId, newTrigger: forbidden },
    SpreadsheetApp: { getActive: () => ({ getId: () => state.identity.spreadsheetId, getSheetByName: () => ({}), setValue: forbidden }) },
    Session: { getActiveUser: () => ({ getEmail: () => state.identity.active }), getEffectiveUser: () => ({ getEmail: () => state.identity.effective }) },
    DriveApp: { getFileById: () => ({ getOwner: () => ({ getEmail: () => state.identity.owner }) }) },
    CacheService: { getScriptCache: () => ({ get: () => { state.cacheAccess++; throw Error('CACHE_READ'); }, put: forbidden, remove: forbidden }) },
    publicBookingServices: () => plain(state.services), publicBookingBarbers: () => plain(state.barbers),
    bookingServiceSetHash: () => 'hash',
    getScheduleForBarber: () => plain(state.legacySchedule), getAttendanceOverride: () => plain(state.attendance),
    schedulePhase2ReadStaff: () => plain(state.data.staff), schedulePhase2ReadSchedules: () => plain(state.data.schedules),
    schedulePhase2ReadRows: name => { assert.ok(tables[name], name); return plain(state.data[tables[name]]); },
    attendancePhase3ReadDays: () => [], getAllBookingsV2: () => plain(state.data.bookings),
    getCutHubEnvironmentConfig: () => ({ environment: 'production', spreadsheetId })
  });
  dependencies.forEach(s => vm.runInContext(s, context));
  vm.runInContext(core, context); vm.runInContext(gas, context);
  for (const name of ['normalizeLookupKey', 'getUniqueActiveBarberByNameV2', 'bookingEmployeeMatchesV2', 'bookingSlotIsFree',
    'bookingMinutes', 'bookingTimelineMinutes', 'bookingBlocksSlot', 'bookingHoldIsActive']) vm.runInContext(fn(legacy, name), context);
  const snapshot = context.bookingAvailabilityPhase5RequestSnapshot;
  context.bookingAvailabilityPhase5RequestSnapshot = () => { state.snapshots++; return snapshot(); };
  const evaluate = context.bookingAvailabilityPhase5Evaluate;
  context.bookingAvailabilityPhase5Evaluate = options => {
    state.evalCalls.push(options);
    const result = plain(evaluate(options));
    if (state.afterEvaluate) state.afterEvaluate(result);
    return result;
  };
  vm.runInContext(source, context);
  return { state, context, run: () => plain(context.previewProductionPhase5DivergenceReadOnly()) };
}
function success(h) { const r = h.run(); assert.equal(r.status, 'success', JSON.stringify(r)); assert.equal(h.state.writes, 0); assert.equal(h.state.cacheAccess, 0); return r; }
function failure(h, code) {
  const r = h.run(); assert.deepEqual(Object.keys(r).sort(), ['code', 'diagnostic', 'stage', 'status']);
  assert.equal(r.status, 'error'); assert.equal(r.diagnostic, 'PRODUCTION_PHASE5_DIVERGENCE_READONLY_FAILED');
  if (code) assert.equal(r.code, code); assert.doesNotMatch(JSON.stringify(r), /PRIVATE|stack|message/); return r;
}
test('syntax, one top-level function, zero persistent writes, no HTTP/router', () => {
  new vm.Script(source);
  assert.equal((source.match(/^function /gm) || []).length, 1);
  assert.doesNotMatch(source, /\b(setProperty|setProperties|deleteProperty|deleteAllProperties|getUserProperties|getDocumentProperties|setValue|setValues|setFormula|setFormulas|appendRow|clear|insertSheet|deleteSheet|newTrigger|deleteTrigger|fetch)\s*\(/);
  assert.doesNotMatch(source, /\b(UrlFetchApp|CacheService|doGet|doPost|jsonOutput|schedulePhase2Save|runBookingAvailabilityAuthority)\b|\.(put|remove)\s*\(/);
});
test('private pure copies exactly equal committed source, including dependency closure', () => {
  for (const [, name] of source.matchAll(/PINNED_CORE_COPY: (\w+)/g)) assert.equal(fn(source, name), fn(core, name), name);
  for (const name of ['bookingBlocks', 'bookingInterval', 'operationalDecision']) assert.match(source, new RegExp('PINNED_CORE_COPY: ' + name));
});
test('current runtime core and GAS equal pinned commit; trace core loop contract is pinned', () => {
  for (const [file, expected] of [['scripts/booking-availability-phase5.js', core], ['scripts/booking-availability-phase5-gas.js', gas]])
    assert.equal(fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n'), expected);
  assert.match(fn(core, 'calculateAvailability'), /data\.bookings \|\| \[\]/);
  assert.doesNotMatch(fn(core, 'calculateAvailability'), /employeeId/);
  assert.match(fn(gas, 'bookingAvailabilityPhase5Evaluate'), /if \(!data\.finalValidation\)[\s\S]*cache\.get/);
  assert.match(fn(gas, 'bookingAvailabilityPhase5Evaluate'), /if \(!data\.finalValidation\)[\s\S]*cache\.put/);
});
test('full adapter, one snapshot, final validation, cache bypass, both traces and zero counters', () => {
  const h = harness(), r = success(h);
  assert.equal(h.state.snapshots, 1); assert.equal(h.state.evalCalls.length, 1); assert.equal(h.state.evalCalls[0].finalValidation, true);
  assert.equal(h.state.evalCalls[0].bookings, h.state.evalCalls[0].snapshot.bookings);
  assert.equal(r.traceMatchesEvaluate, true); assert.deepEqual(r.rootCauseCandidates, []);
  assert.deepEqual(r.candidates.map(c => [c.start, c.end, c.firstEliminationStage]), [['13:00', '13:30', 'AVAILABLE'], ['13:30', '14:00', 'AVAILABLE']]);
  for (const c of r.candidates) { assert.equal(c.onGenerationGrid, true); assert.equal(c.insideSchedule, true); assert.equal(c.insideBranchHours, true); assert.equal(c.allowedByOperationalDecision, true); assert.equal(c.operationalReasonCode, 'AVAILABLE'); }
  assert.deepEqual(r.writes, { spreadsheet: 0, scriptProperties: 0, cache: 0, triggers: 0 });
});
for (const [field, value, code] of [['scriptId', 'bad', 'SCRIPT_ID_MISMATCH'], ['spreadsheetId', 'bad', 'ACTIVE_SPREADSHEET_MISMATCH'],
  ['active', '', 'PRODUCTION_OWNER_REQUIRED'], ['effective', 'other@test', 'PRODUCTION_OWNER_REQUIRED'], ['owner', 'other@test', 'PRODUCTION_OWNER_REQUIRED']])
  test(`identity guard ${field}`, () => { const h = harness(); h.state.identity[field] = value; failure(h, code); });
for (const field of ['CUT_HUB_ENVIRONMENT', 'CUT_HUB_PRODUCTION_SPREADSHEET_ID']) test(`exact ${field}`, () => {
  const h = harness(); h.state.properties[field] += ' '; failure(h);
});
for (const key of Object.keys(baseline)) for (const value of [null, true, 'TRUE', baseline[key] + ' ']) test(`exact baseline ${key}:${value}`, () => {
  const h = harness(); h.state.properties[key] = value; failure(h, 'BASELINE_MISMATCH');
});
for (const key of Object.keys(baseline)) test(`baseline recheck ${key}`, () => {
  const h = harness(); h.state.afterEvaluate = () => { h.state.properties[key] = 'changed'; }; failure(h, 'BASELINE_CHANGED_DURING_DIAGNOSTIC');
  assert.ok(h.state.propertyReads.filter(k => k === key).length >= 3);
});
test('immutable exact canary', () => {
  const h = harness(); const r = h.context.previewProductionPhase5DivergenceReadOnly();
  assert.equal(Object.isFrozen(r.canary), true); assert.equal(Reflect.set(r.canary, 'date', 'bad'), false);
  assert.deepEqual(plain(r.canary), { branchId, date, staffId, expectedStaffName: 'osama', audience: 'public',
    serviceId: h.state.services[0].serviceId, durationMinutes: 30, preparationMinutes: 0, cleanupMinutes: 0 });
});
for (const kind of ['service', 'barber', 'snapshot']) for (const change of ['missing', 'duplicate']) test(`exact ID ${kind} ${change}`, () => {
  const h = harness(), list = kind === 'service' ? h.state.services : kind === 'barber' ? h.state.barbers : h.state.data.staff;
  if (change === 'missing') list[0][kind === 'service' ? 'serviceId' : 'staffId'] = 'wrong'; else list.push({ ...list[0] });
  failure(h);
});
test('LEGACY scheduling projection excludes rows and attendance fields', () => {
  const h = harness(); h.state.attendance = { shiftStart: '12:30', checkOut: '01:30', checkIn: 'PRIVATE', notes: 'PRIVATE' };
  const r = success(h); assert.deepEqual(r.legacySchedule, { scheduled: true, shiftStart: '12:00', shiftEnd: '02:00', source: null,
    attendanceOverrideApplied: true, effectiveShiftStart: '12:30', effectiveShiftEnd: '01:30' });
  assert.ok(r.rootCauseCandidates.includes('SCHEDULE_RESOLVER_DIVERGENCE')); assert.doesNotMatch(JSON.stringify(r), /PRIVATE/);
});
test('absence removes LEGACY effective hours safely', () => {
  const h = harness(); h.state.attendance = { unavailable: true }; const r = success(h);
  assert.equal(r.legacySchedule.effectiveShiftStart, null); assert.equal(r.legacySchedule.attendanceOverrideApplied, true);
});
test('Phase5 schedule projection and equal effective hours have no false divergence', () => {
  const r = success(harness()); assert.deepEqual(r.phase5Schedule, { active: true, classification: 'WORKING_DAY', sourceType: 'RECURRING', sourceIds: ['SCH-1'],
    shiftSegments: [{ shiftStart: '12:00', shiftEnd: '02:00' }], blockedIntervals: [] }); assert.deepEqual(r.rootCauseCandidates, []);
});
test('branch eligibility mirrors active/branch/weekday/effective dates; overnight 12:00 to 02:00', () => {
  const h = harness(), base = h.state.data.branchHours[0];
  h.state.data.branchHours = [{ ...base, effectiveFrom: date, effectiveTo: date }, ...[
    { branchId: 'OTHER' }, { active: false }, { weekday: 'THURSDAY' }, { effectiveFrom: '2026-10-01' }, { effectiveTo: '2026-09-29' }
  ].map(v => ({ ...base, ...v }))];
  const before = plain(h.state.data.branchHours), r = success(h);
  assert.equal(r.branchHours.matchingRowCount, 1); assert.deepEqual(r.branchHours.branchSegments, [{ start: '12:00', end: '02:00' }]);
  assert.ok(r.phase5Result.slots.some(s => s.start === '01:30')); assert.deepEqual(h.state.data.branchHours, before);
});
test('branch intersection rejects candidates', () => {
  const h = harness(); h.state.data.branchHours[0].openTime = '14:00'; const r = success(h);
  assert.ok(r.candidates.every(c => c.firstEliminationStage === 'BRANCH_HOURS')); assert.ok(r.rootCauseCandidates.includes('BRANCH_HOURS_INTERSECTION'));
});
for (const [name, edit, code] of [
  ['past', h => { h.state.now = Date.parse('2026-10-01T10:00:00Z'); }, 'PAST_DATE'],
  ['closed', h => { h.state.data.branchHours = []; }, 'BRANCH_CLOSED'],
  ['no shift', h => { h.state.data.schedules = []; }, 'NO_SHIFT'],
  ['day off', h => { h.state.data.schedules[0].recordType = 'WEEKLY_DAY_OFF'; }, 'WEEKLY_DAY_OFF']
]) test(`early rejection ${name}`, () => { const h = harness(); edit(h); const r = success(h); assert.ok(r.earlyRejectionCodes.includes(code)); assert.ok(r.candidates.every(c => c.firstEliminationStage === 'NOT_EVALUABLE')); });
test('generation grid and schedule material divergence', () => {
  const h = harness(); h.state.data.schedules[0].shiftStart = '12:15'; const r = success(h);
  assert.ok(r.candidates.every(c => c.insideSchedule && !c.onGenerationGrid && c.firstEliminationStage === 'NOT_ON_GRID'));
  assert.ok(r.rootCauseCandidates.includes('GENERATION_GRID')); assert.ok(r.rootCauseCandidates.includes('SCHEDULE_RESOLVER_DIVERGENCE'));
});
test('outside schedule is traced with no generated candidate', () => {
  const h = harness(); h.state.data.schedules[0].shiftStart = '14:00'; const r = success(h); assert.ok(r.candidates.every(c => !c.insideSchedule && !c.finalAvailable));
});
test('schedule block eliminates only overlapping slot before operational stage', () => {
  const h = harness(); h.state.data.scheduleOverrides.push({ overrideId: 'OVR-1', status: 'APPROVED', date, scopeType: 'STAFF', staffId, type: 'TRAINING', blockStart: '13:00', blockEnd: '13:30' });
  const r = success(h); assert.equal(r.candidates[0].firstEliminationStage, 'SCHEDULE_BLOCK'); assert.equal(r.candidates[0].allowedByOperationalDecision, null); assert.equal(r.candidates[1].finalAvailable, true);
});
for (const [name, extra, count] of [['confirmed', {}, 1], ['proposed', { status: 'proposed', date: '2026-09-29', proposedDate: date, proposedTime: '13:00' }, 1],
  ['pending no expiry', { status: 'pending' }, 1], ['pending invalid expiry', { status: 'pending', holdExpiresAt: 'invalid' }, 1],
  ['pending future', { status: 'pending', holdExpiresAt: '2026-10-01T00:00:00Z' }, 1], ['pending expired', { status: 'pending', holdExpiresAt: '2026-09-01T00:00:00Z' }, 0],
  ['expired', { status: 'expired' }, 0], ['deleted', { deleted: true }, 0], ['done', { status: 'done' }, 0], ['cancelled', { status: 'cancelled' }, 0]])
  test(`current occupancy status ${name}`, () => { const h = harness(); h.state.data.bookings = [booking(extra)]; const r = success(h); assert.equal(r.occupancy.phase5BlockingIntervalCount, count); assert.equal(r.candidates[0].blockedByBooking, count === 1); });
test('duplicate bookings retain intervals under committed semantics', () => {
  const h = harness(); h.state.data.bookings = [booking(), booking()]; const r = success(h); assert.equal(r.occupancy.phase5BlockingIntervalCount, 2);
});
test('target staff occupancy blocks both engines without scope divergence', () => {
  const h = harness(); h.state.data.bookings = [booking()]; const r = success(h);
  assert.equal(r.occupancy.targetStaffBlockingIntervalCount, 1); assert.equal(r.occupancy.legacyBlockedAt1300, true); assert.equal(r.candidates[0].firstEliminationStage, 'BOOKING'); assert.deepEqual(r.rootCauseCandidates, []);
});
for (const extra of [{ employeeId: 'OTHER' }, { employeeId: '', employee: 'unmatched' }]) test(`other/unmatched staff Phase5 block versus LEGACY ${JSON.stringify(extra)}`, () => {
  const h = harness(); h.state.data.bookings = [booking(extra)]; const r = success(h);
  assert.equal(r.occupancy.otherOrUnmatchedStaffBlockingIntervalCount, 1); assert.equal(r.occupancy.legacyBlockedAt1300, false);
  assert.equal(r.occupancy.otherOrUnmatchedStaffBlocks1300, true); assert.equal(r.candidates[0].finalAvailable, false);
  assert.ok(r.rootCauseCandidates.includes('BOOKING_OCCUPANCY_SCOPE_DIVERGENCE'));
});
test('unique LEGACY name attribution used only for occupancy; no identity fallback', () => {
  const h = harness(); h.state.data.bookings = [booking({ employeeId: '', employee: 'OSAMA' })]; const r = success(h);
  assert.equal(r.occupancy.targetStaffBlockingIntervalCount, 1); assert.equal(r.occupancy.legacyBlockedAt1300, true);
});
test('non-overlapping other staff booking is not a root cause', () => {
  const h = harness(); h.state.data.bookings = [booking({ employeeId: 'OTHER', time: '15:00' })]; const r = success(h); assert.deepEqual(r.rootCauseCandidates, []); assert.ok(r.candidates.every(c => c.finalAvailable));
});
test('other staff scope classification suppressed if LEGACY also blocks', () => {
  const h = harness(); h.state.data.bookings = [booking(), booking({ employeeId: 'OTHER' })]; assert.deepEqual(success(h).rootCauseCandidates, []);
});
test('immutable occupancy snapshots and cleanup/preparation buffers honored', () => {
  const h = harness(); h.state.data.bookings = [booking({ time: '13:30', occupiedStartTime: '12:55', occupiedEndTime: '14:15', serviceDurationSnapshot: 30, preparationMinutesSnapshot: 35, cleanupMinutesSnapshot: 15 })];
  const r = success(h); assert.deepEqual(r.occupancy.phase5BlockingIntervals, [{ start: '12:55', end: '14:15' }]); assert.ok(r.candidates.every(c => c.blockedByBooking)); assert.equal(r.occupancy.legacyBlockedAt1300, false);
});
test('buffer snapshots without explicit occupied clocks and legacy zero buffer compatibility', () => {
  const h = harness(); h.state.data.bookings = [booking({ time: '13:30', preparationMinutesSnapshot: 15, cleanupMinutesSnapshot: 15 })];
  assert.deepEqual(success(h).occupancy.phase5BlockingIntervals, [{ start: '13:15', end: '14:15' }]);
  h.state.data.bookings = [booking({ preparationMinutes: 45, cleanupMinutes: 45 })];
  assert.deepEqual(success(h).occupancy.phase5BlockingIntervals, [{ start: '13:00', end: '13:30' }]);
});
test('overnight snapshot occupancy stays on the correct timeline', () => {
  const h = harness(); h.state.data.bookings = [booking({ time: '00:15', occupiedStartTime: '23:45', occupiedEndTime: '01:00', serviceDurationSnapshot: 30, preparationMinutesSnapshot: 30, cleanupMinutesSnapshot: 15 })];
  const r = success(h); assert.deepEqual(r.occupancy.phase5BlockingIntervals, [{ start: '23:45', end: '01:00' }]); assert.ok(r.candidates.every(c => c.finalAvailable));
});
test('malformed snapshot fails with safe stage code only', () => { const h = harness(); h.state.data.bookings = [booking({ occupiedStartTime: 'PRIVATE' })]; failure(h); });
test('attendance disabled allows current day regardless of absence/break and late server time', () => {
  const h = harness(); h.state.now = Date.parse('2026-09-30T20:00:00Z'); h.context.bookingAvailabilityPhase5Attendance = () => { throw Error('must not read'); };
  assert.ok(success(h).candidates.every(c => c.allowedByOperationalDecision && c.operationalReasonCode === 'AVAILABLE'));
});
for (const start of ['13:00', '13:30']) test(`trace mismatch ${start} fails closed without root causes`, () => {
  const h = harness(); h.state.afterEvaluate = r => { r.slots = r.slots.filter(s => s.start !== start); }; failure(h, 'TRACE_EVALUATE_MISMATCH');
});
for (const [name, mutate] of [
  ['schedule', s => { s.data.schedules[0].shiftStart = '12:30'; }], ['hours', s => { s.data.branchHours[0].effectiveTo = '2026-09-29'; }],
  ['booking', s => { s.data.bookings.push(booking()); }], ['staff', s => { s.data.staff[0].active = false; }],
  ['legacy attendance', s => { s.attendance = { shiftStart: '13:00' }; }], ['branch', s => { s.data.branches[0].closureStatus = 'CLOSED'; }],
  ['override', s => { s.data.scheduleOverrides.push({ scopeType: 'ORGANIZATION', date, status: 'APPROVED' }); }],
  ['policy', s => { s.data.policies.push({ staffId, active: true, requiredDailyMinutes: 50 }); }]
]) test(`input stability ${name}`, () => { const h = harness(); h.state.afterEvaluate = () => mutate(h.state); failure(h, 'INPUT_CHANGED_DURING_DIAGNOSTIC'); });
test('private unrelated field changes do not enter structural fingerprint', () => {
  const h = harness(); h.state.data.bookings = [booking({ time: '15:00' })]; h.state.afterEvaluate = () => { h.state.data.bookings[0].notes = 'different private'; }; success(h);
});
test('privacy exact output schemas, no raw rows, booking IDs, tokens, emails or backend errors', () => {
  const h = harness(); h.state.data.bookings = [booking()]; h.state.data.schedules[0].notes = 'PRIVATE_SCHEDULE';
  h.state.afterEvaluate = r => { r.generatedAt = 'PRIVATE_TIMESTAMP'; r.availabilityToken = 'PRIVATE_TOKEN'; r.versions = { secret: 'PRIVATE' }; };
  const r = success(h);
  assert.deepEqual(Object.keys(r).sort(), ['status', 'diagnostic', 'identity', 'canary', 'baseline', 'authority', 'legacySchedule', 'phase5Schedule', 'branchHours', 'occupancy', 'earlyRejectionCodes', 'candidates', 'phase5Result', 'traceMatchesEvaluate', 'rootCauseCandidates', 'writes'].sort());
  assert.deepEqual(Object.keys(r.phase5Result).sort(), ['availability', 'reasonCode', 'publicReasonCode', 'scheduleSource', 'operationalRestriction', 'slots'].sort());
  assert.doesNotMatch(JSON.stringify(r), /PRIVATE|owner@test|bookingId|customerName|phone|email|notes|serviceName|generatedAt|availabilityToken|versions|generations|snapshot/);
  h.context.getScheduleForBarber = () => { throw Error('PRIVATE_BACKEND_SECRET'); }; failure(h, 'INPUT_READ_FAILED');
});
test('LEGACY scheduling readers and employee filter still equal committed source', () => {
  const working = fs.readFileSync(path.join(root, 'scripts/app-script-final-owner-access.js'), 'utf8').replace(/\r\n/g, '\n');
  for (const name of ['availableSlotsForBarberLegacy', 'getScheduleForBarber', 'getAttendanceOverride', 'bookingSlotIsFree',
    'bookingEmployeeMatchesV2', 'bookingBlocksSlot', 'bookingHoldIsActive', 'getUniqueActiveBarberByNameV2']) {
    assert.equal(fn(working, name), fn(legacy, name), name);
    assert.doesNotMatch(fn(legacy, name), /\b(setValue|setValues|appendRow|setProperty|setProperties|insertSheet|newTrigger)\s*\(/);
  }
  const currentLegacy = fn(legacy, 'availableSlotsForBarberLegacy');
  assert.match(currentLegacy, /getScheduleForBarber\(barber, dateKey, barbers\)/);
  assert.match(currentLegacy, /getAttendanceOverride\(barber, dateKey, barbers\)/);
  assert.match(currentLegacy, /attendance && attendance\.shiftStart \? attendance\.shiftStart : schedule\.shiftStart/);
  assert.match(currentLegacy, /attendance && attendance\.checkOut \? attendance\.checkOut : schedule\.shiftEnd/);
});
test('typed Date branch hours have stable value fingerprints and detect changed time cells', () => {
  const h = harness();
  const hours = [{ ...h.state.data.branchHours[0], openTime: new h.context.Date('2026-09-30T09:00:00Z'), closeTime: new h.context.Date('2026-09-30T23:00:00Z') }];
  h.context.bookingAvailabilityPhase5ReadBranchHours = () => hours.map(v => ({ ...v }));
  success(h);
  h.state.afterEvaluate = () => { hours[0].openTime = new h.context.Date('2026-09-30T09:30:00Z'); };
  failure(h, 'INPUT_CHANGED_DURING_DIAGNOSTIC');
});
test('organization default policy is included in the input-stability guard', () => {
  const h = harness(); h.state.data.policies = [{ policyId: 'POL-DEFAULT', active: true, requiredDailyMinutes: 0, allowedBreakMinutes: 0 }];
  h.state.afterEvaluate = () => { h.state.data.policies[0].requiredDailyMinutes = 30; };
  failure(h, 'INPUT_CHANGED_DURING_DIAGNOSTIC');
});
test('equivalent adjacent and midnight-split effective shifts are not schedule divergence', () => {
  for (const split of ['14:00', '00:00']) {
    const h = harness(), s = h.state.data.schedules[0];
    h.state.data.schedules = [{ ...s, shiftEnd: split, segmentIndex: 1 }, { ...s, scheduleId: 'SCH-2', shiftStart: split, segmentIndex: 2 }];
    assert.ok(!success(h).rootCauseCandidates.includes('SCHEDULE_RESOLVER_DIVERGENCE'));
  }
});
test('closed safe metadata enum rejects arbitrary backend text', () => {
  for (const field of ['availability', 'reasonCode', 'scheduleSource', 'operationalRestriction']) {
    const h = harness(); h.state.afterEvaluate = r => { r[field] = 'PRIVATE_MESSAGE'; }; failure(h, 'UNSAFE_METADATA_VALUE');
  }
});
test('no shift with bookings still yields aggregate diagnostics and unevaluable candidates', () => {
  const h = harness(); h.state.data.schedules = []; h.state.data.bookings = [booking()];
  const r = success(h); assert.equal(r.occupancy.phase5BlockingIntervalCount, 1);
  assert.ok(r.candidates.every(c => c.firstEliminationStage === 'NOT_EVALUABLE' && c.allowedByOperationalDecision === null));
});
test('pending expiry crossing during diagnostic fails even when no candidate changes', () => {
  const h = harness(); h.state.data.bookings = [booking({ time: '16:00', status: 'pending', holdExpiresAt: new Date(h.state.now + 500).toISOString() })];
  h.state.afterEvaluate = () => { h.state.now += 1000; }; failure(h, 'INPUT_CHANGED_DURING_DIAGNOSTIC');
});
test('date rollover fails without returning stale early-rule analysis', () => {
  const h = harness(); h.state.afterEvaluate = () => { h.state.now += 86400000; }; failure(h, 'INPUT_CHANGED_DURING_DIAGNOSTIC');
});
test('duration snapshots and appointment preparation/cleanup preserve current adapter defaults', () => {
  const h = harness(); h.state.data.bookings = [booking({ time: '12:30', durationMinutes: 15, serviceDurationSnapshot: 75 })];
  const r = success(h); assert.deepEqual(r.occupancy.phase5BlockingIntervals, [{ start: '12:30', end: '13:45' }]);
  assert.ok(r.candidates.every(c => c.blockedByBooking)); assert.equal(r.occupancy.legacyBlockedAt1300, false);
});
test('ambiguous LEGACY employee name is unmatched and never attributed to target', () => {
  const h = harness(); h.state.barbers.push({ ...h.state.barbers[0], staffId: 'OTHER' });
  h.state.data.bookings = [booking({ employeeId: '', employee: 'osama' })];
  const r = success(h); assert.equal(r.occupancy.targetStaffBlockingIntervalCount, 0); assert.equal(r.occupancy.legacyBlockedAt1300, false);
});
test('exact early rules cannot silently accept inactive or wrong-branch snapshot staff', () => {
  for (const delta of [{ active: false }, { branchId: 'OTHER' }]) {
    const h = harness(); Object.assign(h.state.data.staff[0], delta); failure(h, 'SNAPSHOT_STAFF_MISMATCH');
  }
  assert.match(fn(core, 'calculateAvailability'), /reasons\.push\("STAFF_UNAVAILABLE"\)/);
  assert.match(fn(core, 'calculateAvailability'), /reasons\.push\("BRANCH_SCOPE_MISMATCH"\)/);
  assert.match(source, /earlyRejectionCodes\.push\("STAFF_UNAVAILABLE"\)/);
  assert.match(source, /earlyRejectionCodes\.push\("BRANCH_SCOPE_MISMATCH"\)/);
});
test('branch timezone comes from the same validated production branch configuration', () => {
  const h = harness(); h.state.data.branches[0].timeZone = 'Europe/London';
  assert.equal(success(h).branchHours.timeZone, 'Europe/London');
});
