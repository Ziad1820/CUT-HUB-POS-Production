const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const source = read('production-phase5-shadow-behavior-readonly.REVIEW.gs');
const committed = name => require('node:child_process').execFileSync('git', ['show', '72b594b58e38569ef45039ff83902765db9ca71a:' + name], { encoding: 'utf8' });
const core = committed('scripts/booking-availability-phase5.js');
const router = committed('scripts/app-script-final-owner-access.js');
const gas = committed('scripts/booking-availability-phase5-gas.js');
const scriptId = '1UmjdRMGLukMt_0Be_ZL2krphwtZ-CQHPOiZ3GF10pY9-glgvoubfGflP';
const spreadsheetId = '1r0I9J-IZF1GhMC4Yvj73S8VdjJQxMfmOgP4v0ZFNOb0';
const baseline = {
  BOOKING_AVAILABILITY_ENGINE: 'SHADOW', BOOKING_PHASE2_PLANNED_ENABLED: 'true',
  BOOKING_ATTENDANCE_LIVE_ENABLED: 'false', BOOKING_CUSTOMER_LIVE_REFRESH_ENABLED: 'false',
  BOOKING_INTERNAL_LIVE_REFRESH_ENABLED: 'false', BOOKING_MANAGER_OVERRIDE_ENABLED: 'false',
  BOOKING_CONFLICT_RESOLUTION_ENABLED: 'false', BOOKING_NO_CHECK_IN_DETECTOR_ENABLED: 'false'
};
const plain = value => JSON.parse(JSON.stringify(value));
const expectedCanary = {
  branchId: 'CUT_HUB_MAIN', date: '2026-09-30',
  serviceId: 'SRV-bb949f91-2808-487f-aaa6-0d3e47790e37', staffId: '1784232573966',
  expectedStaffName: 'osama', durationMinutes: 30, preparationMinutes: 0,
  cleanupMinutes: 0, audience: 'public'
};
for (const [field, value] of [['shiftStart', '12:00'], ['shiftEnd', '02:00'], ['slots', ['12:30']], ['availability', 'unavailable']]) {
  test(`behavior distinguishes only ${field} without hiding shift differences`, () => {
    const h = harness(); h.state.legacyResult[field] = value;
    const result = h.run();
    assert.equal(result.status, 'success');
    assert.equal(result.behaviorEqual, false);
    assert.equal(result.slotsAvailabilityEqual, field.startsWith('shift'));
    for (const key of ['slots', 'availability', 'shiftStart', 'shiftEnd']) assert.equal(result.fieldEquality[key], key !== field);
    assert.deepEqual(result.legacyBehavior[field], value);
    assert.notEqual(result.behavioralHashes.legacy, result.behavioralHashes.phase5);
  });
}
for (const [label, legacy, phase5] of [
  ['ordering', ['12:30', '12:00'], ['12:00', '12:30']],
  ['duplicates', ['12:00', '12:00'], ['12:00']]
]) test(`slots preserve ${label} and affect equality`, () => {
  const h = harness(); h.state.legacyResult.slots = legacy;
  h.state.result.slots = phase5.map(start => ({ start }));
  const result = h.run();
  assert.deepEqual(result.legacyBehavior.slots, legacy);
  assert.deepEqual(result.phase5Behavior.slots, phase5);
  assert.equal(result.behaviorEqual, false);
  assert.equal(result.fieldEquality.slots, false);
});
test('behavior hashes ignore all callback metadata and no raw payload escapes', () => {
  const h = harness(), first = h.run();
  h.state.result.generatedAt = 'different'; h.state.result.availabilityToken = 'SECRET_TOKEN';
  h.state.result.reasonCode = 'NO_SHIFT'; h.state.legacyResult.privateCustomer = 'SECRET_CUSTOMER';
  const second = h.run();
  assert.deepEqual(second.behavioralHashes, first.behavioralHashes);
  assert.equal(second.behaviorEqual, true);
  assert.doesNotMatch(JSON.stringify(second), /SECRET|generatedAt|availabilityToken|reasonCode|privateCustomer/);
});
for (const [field, value] of [['slots', null], ['slots', [12]], ['availability', null], ['shiftStart', undefined], ['shiftEnd', 2]]) {
  test(`invalid legacy behavior type ${field}:${JSON.stringify(value)} fails closed`, () => {
    const h = harness(); h.state.legacyResult[field] = value;
    const result = failure(h, 'BEHAVIOR_TYPE_INVALID');
    assert.equal('behaviorEqual' in result, false);
  });
}
test('invalid Phase5 slot type fails closed', () => {
  const h = harness(); h.state.result.slots = [{ start: 12 }]; failure(h, 'BEHAVIOR_TYPE_INVALID');
});
test('authority other than LEGACY fails closed', () => {
  const h = harness(); h.context.BookingAvailabilityPhase5.executeAuthoritativeEngine = () => ({ authority: 'PHASE5' });
  failure(h, 'AUTHORITY_MISMATCH');
});
function harness() {
  const properties = { CUT_HUB_ENVIRONMENT: 'production', CUT_HUB_PRODUCTION_SPREADSHEET_ID: spreadsheetId,
    ...baseline, UNRELATED: '  unchanged\n\u0000  ' };
  const identity = { scriptId, spreadsheetId, active: 'owner@example.com', effective: 'owner@example.com', owner: 'owner@example.com' };
  const service = { serviceId: 'SRV-bb949f91-2808-487f-aaa6-0d3e47790e37', active: true,
    durationMinutes: 30, preparationMinutes: 0, cleanupMinutes: 0 };
  const barber = { staffId: '1784232573966', name: 'osama', branchId: 'CUT_HUB_MAIN', active: true, isBarber: true };
  const counters = { spreadsheet: 0, scriptProperties: 0, cache: 0, triggers: 0, http: 0 };
  const calls = { reads: [], legacy: [], phase5: [], dto: 0, engine: [] };
  const state = { legacyResult: { slots: ['12:00'], availability: 'available', shiftStart: '', shiftEnd: '' }, services: [service], barbers: [barber], onEvaluate: null,
    result: { slots: [{ start: '12:00', end: '12:30', status: 'AVAILABLE' }], availability: 'AVAILABLE',
      reasonCode: 'AVAILABLE', availabilityToken: 'test-availability', generatedAt: '2026-09-09T12:00:00',
      staffId: barber.staffId, branchId: barber.branchId, date: '2026-09-30', durationMinutes: 30 } };
  state.snapshot = { staff: [barber], bookings: [{ privateCustomer: 'DO_NOT_EXPOSE' }] };
  const forbid = kind => () => { counters[kind]++; throw new Error('FORBIDDEN'); };
  const props = { getProperty: key => { calls.reads.push(key); return properties[key] ?? null; },
    setProperty: forbid('scriptProperties'), setProperties: forbid('scriptProperties'),
    deleteProperty: forbid('scriptProperties'), deleteAllProperties: forbid('scriptProperties') };
  const context = vm.createContext({
    PropertiesService: { getScriptProperties: () => props, getUserProperties: forbid('scriptProperties'), getDocumentProperties: forbid('scriptProperties') },
    ScriptApp: { getScriptId: () => identity.scriptId, newTrigger: forbid('triggers'), deleteTrigger: forbid('triggers') },
    SpreadsheetApp: { getActive: () => identity.spreadsheetId === null ? null : ({ getId: () => identity.spreadsheetId,
      setValue: forbid('spreadsheet'), appendRow: forbid('spreadsheet') }) },
    Session: { getActiveUser: () => ({ getEmail: () => identity.active }), getEffectiveUser: () => ({ getEmail: () => identity.effective }) },
    DriveApp: { getFileById: id => { assert.equal(id, spreadsheetId); return { getOwner: () => ({ getEmail: () => identity.owner }) }; } },
    CacheService: { getScriptCache: () => ({ put: forbid('cache'), remove: forbid('cache'), get: forbid('cache') }) },
    UrlFetchApp: { fetch: forbid('http') },
    publicBookingServices: () => state.services,
    publicBookingBarbers: () => state.barbers,
    bookingAvailabilityPhase5RequestSnapshot: () => state.snapshot,
    bookingServiceSetHash: () => 'service-hash',
    availableSlotsForBarberLegacy: (...args) => { calls.legacy.push(args); return state.legacyResult; },
    bookingAvailabilityPhase5Evaluate: options => { calls.phase5.push(options); if (state.onEvaluate) state.onEvaluate(); return state.result; }
  });
  vm.runInContext(core, context);
  const realCore = context.BookingAvailabilityPhase5;
  context.BookingAvailabilityPhase5 = { ...realCore,
    executeAuthoritativeEngine: options => { calls.engine.push(options.mode); return realCore.executeAuthoritativeEngine(options); },
    publicDto: result => { calls.dto++; return realCore.publicDto(result); }
  };
  vm.runInContext(source, context);
  return { context, properties, identity, state, calls, counters, realCore,
    run: () => plain(context.previewProductionShadowBehaviorReadOnly()) };
}
function failure(h, code) {
  const result = h.run();
  assert.equal(result.status, 'error');
  assert.equal(result.diagnostic, 'PRODUCTION_SHADOW_BEHAVIOR_READONLY_FAILED');
  if (code) assert.equal(result.code, code);
  assert.deepEqual(h.counters, { spreadsheet: 0, scriptProperties: 0, cache: 0, triggers: 0, http: 0 });
  return result;
}

test('static zero-write and no HTTP/router/mutation calls; one public entry point', () => {
  assert.doesNotMatch(source, /\b(setProperty|setProperties|deleteProperty|deleteAllProperties|getUserProperties|getDocumentProperties|setValue|setValues|appendRow|clear|insertSheet|deleteSheet|createTrigger|newTrigger|deleteTrigger)\s*\(/);
  assert.doesNotMatch(source, /\b(UrlFetchApp|fetch|CacheService|schedulePhase2Save|bookingAvailabilityPhase5ValidateAppointment|getPublicBookingOptions|runBookingAvailabilityAuthority|executeProductionPhase5ShadowEngineOnly|rollbackProductionPhase5ShadowEngineOnly)\s*[.(]/);
  assert.doesNotMatch(source, /\.(put|putAll|remove|removeAll|setFormula|setFormulas|insertRows|deleteRows)\s*\(/);
  assert.match(source, /mode: "SHADOW"/);
  assert.equal((source.match(/^function /gm) || []).length, 1);
});
test('all nine exact literal canary values are frozen before use and reject mutation', () => {
  const h = harness();
  let captured;
  h.context.inspectFrozenCanary = value => {
    if (!Object.hasOwn(value, 'expectedStaffName')) return;
    captured = value;
    assert.equal(Object.isFrozen(value), true);
    assert.deepEqual(plain(value), expectedCanary);
    for (const key of Object.keys(expectedCanary)) {
      assert.equal(Reflect.set(value, key, 'MUTATED'), false);
      assert.equal(Reflect.deleteProperty(value, key), false);
      assert.throws(() => Object.defineProperty(value, key, { value: 'MUTATED' }), TypeError);
    }
    assert.equal(Reflect.set(value, 'extra', 'MUTATED'), false);
  };
  vm.runInContext(`(() => {
    const freeze = Object.freeze;
    Object.freeze = value => { const frozen = freeze(value); inspectFrozenCanary(frozen); return frozen; };
  })()`, h.context);
  const result = h.run();
  assert.equal(result.status, 'success');
  assert.ok(captured);
  assert.deepEqual(plain(captured), expectedCanary);
  assert.equal(h.calls.legacy[0][1], expectedCanary.date);
  assert.equal(h.calls.legacy[0][2], expectedCanary.durationMinutes);
  const options = h.calls.phase5[0];
  for (const key of ['branchId', 'date', 'durationMinutes', 'preparationMinutes', 'cleanupMinutes', 'audience']) {
    assert.equal(options[key], expectedCanary[key]);
  }
  assert.equal(options.employeeId, expectedCanary.staffId);
  assert.deepEqual(result.canary, Object.fromEntries(['branchId', 'date', 'serviceId', 'staffId'].map(key => [key, expectedCanary[key]])));
  assert.deepEqual(h.counters, { spreadsheet: 0, scriptProperties: 0, cache: 0, triggers: 0, http: 0 });
});
test('success exposes real engine comparison and no private payloads', () => {
  const h = harness(), before = JSON.stringify(h.properties), result = h.run();
  assert.equal(result.status, 'success');
  assert.equal(result.authority, 'LEGACY');
  assert.deepEqual(result.identity, { scriptId, spreadsheetId, environment: 'production' });
  assert.equal(result.behaviorEqual, true);
  assert.equal(result.slotsAvailabilityEqual, true);
  assert.deepEqual(result.legacyBehavior, { slots: ['12:00'], availability: 'available', shiftStart: '', shiftEnd: '' });
  assert.deepEqual(result.phase5Behavior, result.legacyBehavior);
  assert.deepEqual(result.fieldEquality, { slots: true, availability: true, shiftStart: true, shiftEnd: true });
  assert.equal(result.behavioralHashes.legacy, h.realCore.hash(result.legacyBehavior));
  assert.equal(result.behavioralHashes.phase5, h.realCore.hash(result.phase5Behavior));
  assert.deepEqual(Object.keys(result).sort(), ['status','diagnostic','identity','canary','baseline','authority','legacyBehavior','phase5Behavior','behaviorEqual','slotsAvailabilityEqual','fieldEquality','behavioralHashes','writes'].sort());
  assert.deepEqual(h.calls.engine, ['SHADOW']);
  assert.equal(h.calls.dto, 1);
  assert.equal(h.calls.legacy.length, 1);
  assert.equal(h.calls.legacy[0][0], h.state.barbers[0]);
  assert.equal(h.calls.legacy[0][1], '2026-09-30');
  assert.equal(h.calls.legacy[0][2], 30);
  assert.equal(h.calls.legacy[0][3], h.state.snapshot.bookings);
  assert.equal(h.calls.legacy[0][4], h.state.barbers);
  assert.equal(h.calls.phase5.length, 1);
  assert.equal(h.calls.phase5[0].finalValidation, true);
  assert.equal(h.calls.phase5[0].audience, 'public');
  assert.equal(JSON.stringify(h.properties), before);
  assert.deepEqual(result.writes, { spreadsheet: 0, scriptProperties: 0, cache: 0, triggers: 0 });
  assert.doesNotMatch(JSON.stringify(result), /owner@example|DO_NOT_EXPOSE|privateCustomer|stack|sessionToken/);
  for (const key of Object.keys(baseline)) assert.equal(h.calls.reads.filter(k => k === key).length, 2);
  assert.deepEqual(h.counters, { spreadsheet: 0, scriptProperties: 0, cache: 0, triggers: 0, http: 0 });
});
for (const value of [undefined, '', 'Production', 'PRODUCTION', ' production', 'production ']) {
  test(`environment exact guard rejects ${JSON.stringify(value)}`, () => { const h = harness(); h.properties.CUT_HUB_ENVIRONMENT = value; failure(h, 'ENVIRONMENT_MISMATCH'); });
}
for (const [key, value, code] of [
  ['scriptId', 'wrong', 'SCRIPT_ID_MISMATCH'], ['spreadsheetId', 'wrong', 'ACTIVE_SPREADSHEET_MISMATCH'],
  ['spreadsheetId', null, 'ACTIVE_SPREADSHEET_MISMATCH'], ['active', '', 'PRODUCTION_OWNER_REQUIRED'],
  ['effective', '', 'PRODUCTION_OWNER_REQUIRED'], ['owner', '', 'PRODUCTION_OWNER_REQUIRED'],
  ['active', 'other@example.com', 'PRODUCTION_OWNER_REQUIRED'], ['effective', 'other@example.com', 'PRODUCTION_OWNER_REQUIRED'],
  ['owner', 'other@example.com', 'PRODUCTION_OWNER_REQUIRED']
]) test(`identity rejects ${key}=${value}`, () => { const h = harness(); h.identity[key] = value; failure(h, code); });
test('configured spreadsheet pin must match', () => { const h = harness(); h.properties.CUT_HUB_PRODUCTION_SPREADSHEET_ID = 'wrong'; failure(h, 'SPREADSHEET_PIN_MISMATCH'); });
for (const [key, expected] of Object.entries(baseline)) {
  const invalid = [undefined, '', ` ${expected}`, `${expected} `, expected.toUpperCase() === expected ? expected.toLowerCase() : expected.toUpperCase(), expected === 'SHADOW' ? 'LEGACY' : expected === 'true' ? 'false' : 'true'];
  for (const value of invalid) test(`exact baseline rejects ${key}=${JSON.stringify(value)}`, () => {
    const h = harness(); h.properties[key] = value; failure(h, 'BASELINE_MISMATCH'); assert.equal(h.calls.engine.length, 0);
  });
  test(`recheck rejects concurrent change to ${key}`, () => {
    const h = harness(); h.state.onEvaluate = () => { h.properties[key] = 'changed'; };
    failure(h, 'BASELINE_CHANGED_DURING_DIAGNOSTIC'); assert.equal(h.properties[key], 'changed');
  });
}
for (const [label, change, code] of [
  ['missing service', h => { h.state.services = []; }, 'SERVICE_NOT_UNIQUE_OR_NOT_PUBLIC'],
  ['wrong service ID', h => { h.state.services[0].serviceId = 'other'; }, 'SERVICE_NOT_UNIQUE_OR_NOT_PUBLIC'],
  ['duplicate service', h => { h.state.services.push({ ...h.state.services[0] }); }, 'SERVICE_NOT_UNIQUE_OR_NOT_PUBLIC'],
  ['inactive service', h => { h.state.services[0].active = false; }, 'SERVICE_NOT_ACTIVE'],
  ['duration', h => { h.state.services[0].durationMinutes = 31; }, 'SERVICE_TIMING_MISMATCH'],
  ['preparation', h => { h.state.services[0].preparationMinutes = 1; }, 'SERVICE_TIMING_MISMATCH'],
  ['cleanup', h => { h.state.services[0].cleanupMinutes = 1; }, 'SERVICE_TIMING_MISMATCH'],
  ['missing staff', h => { h.state.barbers = []; }, 'STAFF_NOT_UNIQUE_OR_NOT_PUBLIC'],
  ['wrong staff ID', h => { h.state.barbers[0].staffId = 'other'; }, 'STAFF_NOT_UNIQUE_OR_NOT_PUBLIC'],
  ['duplicate staff', h => { h.state.barbers.push({ ...h.state.barbers[0] }); }, 'STAFF_NOT_UNIQUE_OR_NOT_PUBLIC'],
  ['inactive staff', h => { h.state.barbers[0].active = false; }, 'STAFF_NOT_ACTIVE_PUBLIC_BARBER'],
  ['not barber', h => { h.state.barbers[0].isBarber = false; }, 'STAFF_NOT_ACTIVE_PUBLIC_BARBER'],
  ['branch', h => { h.state.barbers[0].branchId = 'other'; }, 'STAFF_BRANCH_MISMATCH'],
  ['name', h => { h.state.barbers[0].name = 'other'; }, 'STAFF_NAME_MISMATCH'],
  ['snapshot fixture', h => { h.state.snapshot.staff = []; }, 'SNAPSHOT_STAFF_MISMATCH']
]) test(`canary rejects ${label} without writes`, () => { const h = harness(); change(h); failure(h, code); });
test('outer catch hides arbitrary error code, message and stack', () => {
  const h = harness(); h.context.publicBookingServices = () => { throw Object.assign(new Error('SECRET'), { code: 'SECRET' }); };
  const result = failure(h, 'SERVICE_READ_FAILED'); assert.doesNotMatch(JSON.stringify(result), /SECRET|stack/);
});
test('comparison construction failure is contained', () => {
  const h = harness(); h.context.BookingAvailabilityPhase5.executeAuthoritativeEngine = () => { throw new Error('SECRET_HASH_ERROR'); };
  const result = failure(h, 'COMPARISON_FAILED'); assert.doesNotMatch(JSON.stringify(result), /SECRET/);
});
test('LEGACY callback failure is contained', () => {
  const h = harness(); h.context.availableSlotsForBarberLegacy = () => { throw new Error('SECRET'); };
  failure(h, 'LEGACY_CALLBACK_FAILED');
});
test('Phase5 callback failure exposes safe comparison and fails diagnostic', () => {
  const h = harness(); h.state.onEvaluate = () => { throw new Error('SECRET'); };
  const result = failure(h, 'PHASE5_DIAGNOSTIC_CALLBACK_FAILED');
  assert.deepEqual(Object.keys(result).sort(), ['status', 'diagnostic', 'stage', 'code'].sort());
  assert.doesNotMatch(JSON.stringify(result), /SECRET|stack/);
});
test('diagnostic callback shape matches the current public router callback including optional fields', () => {
  const h = harness(); let captured;
  const dto = { reasonCode: 'AVAILABLE', availabilityToken: 't', generatedAt: 'now', scheduleSource: 's',
    operationalRestriction: 'r', scheduleSourceIds: ['id'], versions: { v: 1 }, managerOverrideAllowed: true };
  h.context.BookingAvailabilityPhase5.publicDto = () => dto;
  h.context.BookingAvailabilityPhase5.executeAuthoritativeEngine = options => {
    options.legacy(); captured = plain(options.phase5()); return { authority: 'LEGACY', comparison: { equal: false, legacyHash: 'a', phase5Hash: 'b', phase5Error: null } };
  };
  h.run();
  const functionSource = router.slice(router.indexOf('function availableSlotsForBarber('), router.indexOf('function bookingAvailabilityResponseCacheKey('));
  vm.runInContext(functionSource, h.context);
  h.context.runBookingAvailabilityAuthority = (_legacy, phase5) => phase5();
  const expected = plain(h.context.availableSlotsForBarber(h.state.barbers[0], '2026-09-30', 30,
    h.state.snapshot.bookings, h.state.barbers, { audience: 'public', branchId: 'CUT_HUB_MAIN' }));
  assert.deepEqual(captured, expected);
});
test('real GAS evaluate bypasses cache read/write with finalValidation true', () => {
  const h = harness(); vm.runInContext(gas, h.context);
  Object.assign(h.context, {
    bookingAvailabilityPhase5AssertIdentity: () => ({ config: { environment: 'production' }, spreadsheet: { getId: () => spreadsheetId } }),
    bookingAvailabilityPhase5Flags: () => ({ engine: 'SHADOW', plannedEnabled: true, attendanceLiveEnabled: false }),
    bookingAvailabilityPhase5RequestSnapshot: () => h.state.snapshot,
    bookingAvailabilityPhase5Branch: () => ({ timeZone: 'Africa/Cairo' }),
    bookingAvailabilityPhase5ReadVersions: () => ({}), bookingAvailabilityPhase5ReadGenerations: () => ({}),
    bookingAvailabilityPhase5ResolveSchedule: () => ({ active: true, shiftSegments: [] }),
    bookingAvailabilityPhase5BranchSegments: () => [{ start: '12:00', end: '02:00' }],
    bookingAvailabilityPhase5ActiveOverrides: () => [],
    Utilities: { formatDate: (_date, _zone, format) => format === 'yyyy-MM-dd' ? '2026-09-09' : format === 'H' ? '12' : format === 'm' ? '0' : '2026-09-09T12:00:00+03:00' }
  });
  assert.equal(h.run().status, 'success');
  assert.equal(h.counters.cache, 0);
});
