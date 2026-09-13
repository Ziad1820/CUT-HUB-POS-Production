const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../production-phase5-shadow-engine-only-executor.REVIEW.gs'), 'utf8');
const scriptId = '1UmjdRMGLukMt_0Be_ZL2krphwtZ-CQHPOiZ3GF10pY9-glgvoubfGflP';
const spreadsheetId = '1r0I9J-IZF1GhMC4Yvj73S8VdjJQxMfmOgP4v0ZFNOb0';
const engine = 'BOOKING_AVAILABILITY_ENGINE';
const flags = {
  BOOKING_PHASE2_PLANNED_ENABLED: 'true',
  BOOKING_ATTENDANCE_LIVE_ENABLED: 'false',
  BOOKING_CUSTOMER_LIVE_REFRESH_ENABLED: 'false',
  BOOKING_INTERNAL_LIVE_REFRESH_ENABLED: 'false',
  BOOKING_MANAGER_OVERRIDE_ENABLED: 'false',
  BOOKING_CONFLICT_RESOLUTION_ENABLED: 'false',
  BOOKING_NO_CHECK_IN_DETECTOR_ENABLED: 'false'
};
function harness(overrides = {}) {
  const properties = { CUT_HUB_ENVIRONMENT: 'production', CUT_HUB_PRODUCTION_SPREADSHEET_ID: spreadsheetId,
    [engine]: 'LEGACY', ...flags, UNRELATED: '  Mixed Case\n\u0000exact bytes  ', ...overrides };
  const initial = { ...properties };
  const writes = [];
  const identity = { scriptId, spreadsheetId, active: 'owner@example.com', effective: 'owner@example.com', owner: 'owner@example.com' };
  const control = { held: false, releases: 0, lockAvailable: true, onLock: null, onWrite: null, missingSheet: false };
  const forbidden = () => { throw new Error('FORBIDDEN_SERVICE_CALL'); };
  const readOnlySheet = new Proxy({ getId: () => identity.spreadsheetId }, { get: (target, key) => target[key] || forbidden });
  const context = vm.createContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: key => Object.hasOwn(properties, key) ? properties[key] : null,
        setProperty: (key, value) => {
          assert.equal(control.held, true);
          assert.equal(key, engine);
          writes.push({ key, value });
          if (control.onWrite) return control.onWrite(key, value, writes.length);
          properties[key] = value;
        }
      }), getUserProperties: forbidden, getDocumentProperties: forbidden
    },
    ScriptApp: { getScriptId: () => identity.scriptId, newTrigger: forbidden, deleteTrigger: forbidden },
    SpreadsheetApp: { getActive: () => control.missingSheet ? null : readOnlySheet },
    Session: { getActiveUser: () => ({ getEmail: () => identity.active }), getEffectiveUser: () => ({ getEmail: () => identity.effective }) },
    DriveApp: { getFileById: id => { assert.equal(id, spreadsheetId); return { getOwner: () => ({ getEmail: () => identity.owner }) }; } },
    LockService: { getScriptLock: () => ({
      tryLock: () => { if (!control.lockAvailable) return false; control.held = true; if (control.onLock) control.onLock(); return true; },
      releaseLock: () => { control.held = false; control.releases++; }
    }) }
  });
  vm.runInContext(source, context);
  context.PROD_PHASE5_ENGINE_ONLY_ARMED = true;
  return { context, properties, initial, writes, identity, control,
    activate: () => context.executeProductionPhase5ShadowEngineOnly('CONFIRM_LEGACY_TO_SHADOW'),
    rollback: () => context.rollbackProductionPhase5ShadowEngineOnly('CONFIRM_SHADOW_TO_LEGACY') };
}

test('static scope: only literal engine setters; no other persistent services or writes', () => {
  assert.match(source, /var PROD_PHASE5_ENGINE_ONLY_ARMED = false;/);
  const setters = [...source.matchAll(/\.setProperty\(([^\n]+)\)/g)].map(match => match[1]);
  assert.equal(setters.length, 3);
  for (const setter of setters) assert.match(setter, /^"BOOKING_AVAILABILITY_ENGINE", "(?:SHADOW|LEGACY)"$/);
  assert.doesNotMatch(source, /getUserProperties|getDocumentProperties|setProperties|deleteProperty|deleteAllProperties|setValues?\s*\(|appendRow|insertSheet|deleteSheet|clear\s*\(|newTrigger|deleteTrigger|UrlFetchApp/);
});

test('preview is zero-write, disarmed, and reports exact proposal and seven flags', () => {
  const h = harness();
  h.context.PROD_PHASE5_ENGINE_ONLY_ARMED = false;
  const result = h.context.previewProductionPhase5ShadowEngineOnly();
  assert.equal(result.identity.scriptId, scriptId);
  assert.equal(result.identity.spreadsheetId, spreadsheetId);
  assert.equal(result.currentEngine, 'LEGACY');
  assert.equal(result.expectedEngine, 'LEGACY');
  assert.deepEqual(JSON.parse(JSON.stringify(result.flags)), flags);
  assert.equal(result.preconditionsPass, true);
  assert.equal(result.writesPlanned, 1);
  assert.equal(result.property, engine);
  assert.equal(result.before, 'LEGACY');
  assert.equal(result.after, 'SHADOW');
  assert.equal(result.executionAllowed, false);
  assert.deepEqual(h.writes, []);
  assert.deepEqual(h.properties, h.initial);
});

for (const scenario of ['script', 'configuredSpreadsheet', 'activeSpreadsheet', 'missingSheet', 'environment', 'environmentCase', 'environmentWhitespace', 'activeUser', 'effectiveUser', 'owner', 'missingOwner']) {
  test('identity guard refuses ' + scenario + ' for preview, activation and rollback', () => {
    for (const action of ['preview', 'activate', 'rollback']) {
      const h = harness(action === 'rollback' ? { [engine]: 'SHADOW' } : {});
      if (scenario === 'script') h.identity.scriptId += 'x';
      if (scenario === 'configuredSpreadsheet') h.properties.CUT_HUB_PRODUCTION_SPREADSHEET_ID += 'x';
      if (scenario === 'activeSpreadsheet') h.identity.spreadsheetId += 'x';
      if (scenario === 'missingSheet') h.control.missingSheet = true;
      if (scenario === 'environment') delete h.properties.CUT_HUB_ENVIRONMENT;
      if (scenario === 'environmentCase') h.properties.CUT_HUB_ENVIRONMENT = 'Production';
      if (scenario === 'environmentWhitespace') h.properties.CUT_HUB_ENVIRONMENT = ' production ';
      if (scenario === 'activeUser') h.identity.active = '';
      if (scenario === 'effectiveUser') h.identity.effective = 'other@example.com';
      if (scenario === 'owner') h.identity.owner = 'other@example.com';
      if (scenario === 'missingOwner') h.identity.owner = '';
      assert.throws(() => action === 'preview' ? h.context.previewProductionPhase5ShadowEngineOnly() : h[action]());
      assert.equal(h.writes.length, 0);
    }
  });
}

for (const value of [undefined, '', ' ', 'legacy', 'Legacy', ' LEGACY ', 'SHADOW', 'PHASE5']) {
  test('activation rejects exact-engine mismatch ' + JSON.stringify(value), () => {
    const h = harness({ [engine]: value });
    if (value === undefined) delete h.properties[engine];
    const preview = h.context.previewProductionPhase5ShadowEngineOnly();
    assert.equal(preview.preconditionsPass, false);
    assert.equal(preview.writesPlanned, 0);
    assert.throws(h.activate, /BASELINE_MISMATCH/);
    assert.equal(h.writes.length, 0);
  });
}

for (const [key, expected] of Object.entries(flags)) {
  test('activation and rollback require exact unchanged flag ' + key, () => {
    for (const value of [undefined, '', ' ', expected.toUpperCase(), ' ' + expected, expected === 'true' ? 'false' : 'true']) {
      for (const action of ['activate', 'rollback']) {
        const h = harness({ [engine]: action === 'activate' ? 'LEGACY' : 'SHADOW', [key]: value });
        if (value === undefined) delete h.properties[key];
        assert.throws(h[action], /BASELINE_MISMATCH/);
        assert.equal(h.writes.length, 0);
      }
    }
  });
}

for (const action of ['activate', 'rollback']) {
  test(action + ' changes precisely one Script Property and preserves all other bytes', () => {
    const before = action === 'activate' ? 'LEGACY' : 'SHADOW';
    const after = action === 'activate' ? 'SHADOW' : 'LEGACY';
    const h = harness({ [engine]: before });
    const result = h[action]();
    assert.deepEqual(h.writes, [{ key: engine, value: after }]);
    assert.deepEqual(h.properties, { ...h.initial, [engine]: after });
    assert.equal(result.before, before);
    assert.equal(result.after, after);
    assert.equal(result.writes, 1);
    assert.equal(result.writeAttempts, 1);
    assert.equal(h.control.releases, 1);
  });

  test(action + ' requires armed boolean and exact confirmation', () => {
    const h = harness({ [engine]: action === 'activate' ? 'LEGACY' : 'SHADOW' });
    h.context.PROD_PHASE5_ENGINE_ONLY_ARMED = false;
    assert.throws(h[action], /DISARMED/);
    h.context.PROD_PHASE5_ENGINE_ONLY_ARMED = 'true';
    assert.throws(h[action], /DISARMED/);
    h.context.PROD_PHASE5_ENGINE_ONLY_ARMED = true;
    const fn = action === 'activate' ? h.context.executeProductionPhase5ShadowEngineOnly : h.context.rollbackProductionPhase5ShadowEngineOnly;
    for (const input of [undefined, '', 'confirm_legacy_to_shadow', 'CONFIRM_LEGACY_TO_SHADOW ']) assert.throws(() => fn(input), /CONFIRMATION/);
    assert.equal(h.writes.length, 0);
  });

  test(action + ' rechecks identity, engine and flags inside lock', () => {
    for (const change of [h => { h.properties[engine] = 'PHASE5'; }, h => { h.properties.BOOKING_ATTENDANCE_LIVE_ENABLED = 'true'; }, h => { h.identity.scriptId = 'other'; }]) {
      const h = harness({ [engine]: action === 'activate' ? 'LEGACY' : 'SHADOW' });
      h.control.onLock = () => change(h);
      assert.throws(h[action]);
      assert.equal(h.writes.length, 0);
      assert.equal(h.control.releases, 1);
    }
  });
}

test('rollback refuses missing, blank, case-variant or non-SHADOW engine', () => {
  for (const value of [undefined, '', 'shadow', ' SHADOW ', 'LEGACY', 'PHASE5']) {
    const h = harness({ [engine]: value });
    assert.throws(h.rollback, /BASELINE_MISMATCH/);
    assert.equal(h.writes.length, 0);
  }
});

test('lock acquisition failure writes nothing', () => {
  const h = harness();
  h.control.lockAvailable = false;
  assert.throws(h.activate, /LOCK_UNAVAILABLE/);
  assert.equal(h.writes.length, 0);
});

test('failed activation verification immediately restores only LEGACY', () => {
  const h = harness();
  h.control.onWrite = (key, value, count) => { h.properties[key] = count === 1 ? 'INVALID' : value; };
  assert.throws(h.activate, error => error.message === 'ACTIVATION_FAILED_ROLLED_BACK' && error.writeAttempts === 2 && error.rollbackVerified);
  assert.deepEqual(h.writes, [{ key: engine, value: 'SHADOW' }, { key: engine, value: 'LEGACY' }]);
  assert.deepEqual(h.properties, h.initial);
  assert.equal(h.control.releases, 1);
});

test('setter exception after persistence also attempts engine-only recovery', () => {
  const h = harness();
  h.control.onWrite = (key, value, count) => { h.properties[key] = value; if (count === 1) throw new Error('service error'); };
  assert.throws(h.activate, /ACTIVATION_FAILED_ROLLED_BACK/);
  assert.deepEqual(h.properties, h.initial);
});

test('failed immediate recovery is reported without additional writes', () => {
  const h = harness();
  h.control.onWrite = () => { h.properties[engine] = 'INVALID'; };
  assert.throws(h.activate, error => error.message === 'ENGINE_RECOVERY_REQUIRED' && error.writeAttempts === 2 && !error.rollbackVerified);
  assert.equal(h.writes.length, 2);
  assert.equal(h.control.releases, 1);
});

test('dedicated rollback verifies its write and releases lock on failure', () => {
  const h = harness({ [engine]: 'SHADOW' });
  h.control.onWrite = () => {};
  assert.throws(h.rollback, /ROLLBACK_VERIFICATION_FAILED/);
  assert.deepEqual(h.writes, [{ key: engine, value: 'LEGACY' }]);
  assert.equal(h.control.releases, 1);
});
