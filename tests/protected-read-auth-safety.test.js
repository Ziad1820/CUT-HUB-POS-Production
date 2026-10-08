"use strict";
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { harness, modern, sheet } = require('./helpers/protected-read-auth-harness');
const root = path.resolve(__dirname, '..');
const actions = ['getBookings', 'getInternalBookingOptions', 'staffTotalSales', 'staffClientCount'];

function setup(options = {}) {
  const h = harness();
  const c = h.context;
  vm.runInContext(fs.readFileSync(path.join(root, 'scripts/booking-availability-phase5-apps-script-bundle.gs'), 'utf8'), c);
  const username = options.username || 'owner';
  h.users.rows.push([username, '', username, options.permissions || '', '', modern(h, 'test-only-password')]);
  const created = c.createSessionForUser({username});
  const headers = name => Array.from(vm.runInContext(name, c));
  const sheets = {
    USERS: h.users,
    Bookings: sheet([headers('BOOKING_HEADERS_V2')]),
    DATA: sheet([Array(10).fill('HEADER'), ['2026-09-24', '', '', '', '', 120, '', '', '', 'osama']]),
    SERVICES: sheet([['NAME', 'PRICE', 'ACTIVE', 'ORDER', 'ID', 'DURATION'], ['Haircut', 120, true, 1, 'S1', 30]]),
    STAFF: sheet([['NAME','CODE','SALARY','PERCENTAGE','ID','BONUS','DEDUCTION','ACTIVE','CREATED_AT','UPDATED_AT','IS_BARBER','BRANCH_ID'],
      ['osama','C07',0,0,'staff-1',0,0,true,'','',true,'CUT_HUB_MAIN']]),
    BARBER_SCHEDULE: sheet([headers('BARBER_SCHEDULE_HEADERS')]),
    ATTENDANCE: sheet([headers('ATTENDANCE_HEADERS')]),
    SCHEDULE_USER_SCOPES: sheet([['USERNAME','ROLE','STAFF_ID','BRANCH_IDS_JSON','ACTIVE'],
      [username,'MANAGER','','["CUT_HUB_MAIN"]',true]]),
    BOOKING_BRANCH_REGISTRY: sheet([['BRANCH_ID','ACTIVE','TIME_ZONE','PUBLIC_SELECTABLE'], ['CUT_HUB_MAIN',true,'Africa/Cairo',true]])
  };
  const bookingFixture={ID:'booking-1',DATE:'2026-09-24',TIME:'12:00',EMPLOYEE:'osama',
    EMPLOYEE_ID:'staff-1',STATUS:'confirmed',DURATION_MINUTES:30,BRANCH_ID:'CUT_HUB_MAIN'};
  sheets.Bookings.rows.push(headers('BOOKING_HEADERS_V2').map(key=>bookingFixture[key]??''));
  for (const name of ['BOOKING_AVAILABILITY_VERSIONS','BOOKING_AVAILABILITY_GENERATIONS','BRANCH_BOOKING_HOURS']) {
    sheets[name]=sheet([['ID']]);
  }
  // Local storage adapters retain real handlers/schema readers; every write is
  // counted. No network, login endpoint or deployed resource is used.
  for (const s of Object.values(sheets)) {
    const getRange = s.getRange;
    s.getRange = (...args) => { const r = getRange(...args); r.getDisplayValues = () => r.getValues().map(row => row.map(String)); return r; };
  }
  c.SpreadsheetApp.getActive = () => ({getSheetByName: name => sheets[name] || null, getId: () => 'local-only'});
  c.getCutHubEnvironmentConfig = () => ({environment:'test', spreadsheetId:'local-only'});
  c.validateCutHubRequestEnvironment = () => {};
  h.props.values.BOOKING_AVAILABILITY_ENGINE = options.engine || 'LEGACY';
  h.props.values.BOOKING_PHASE2_PLANNED_ENABLED = 'true';
  h.props.values.BOOKING_ATTENDANCE_LIVE_ENABLED = 'false';
  const effects = {set:0, delete:0, cachePut:[], cacheRemove:[], audit:0, resolutions:0, shadow:0};
  for (const [name, key] of [['setProperty','set'],['deleteProperty','delete'],['setProperties','set']]) {
    const original = h.props[name].bind(h.props);
    h.props[name] = (...args) => { effects[key]++; return original(...args); };
  }
  const cacheValues = {};
  c.CacheService.getScriptCache = () => ({
    get: key => cacheValues[key] || null,
    put(key,value,ttl) {effects.cachePut.push({key,value,ttl}); cacheValues[key] = value;},
    remove(key) {effects.cacheRemove.push(key); delete cacheValues[key];}
  });
  const resolver = c.resolveAuthenticatedRequestContext;
  c.resolveAuthenticatedRequestContext = (...args) => {effects.resolutions++; return resolver(...args);};
  c.logActivity = () => {effects.audit++;};
  effects.shadowEvents=[];
  c.Logger.log = message => {effects.shadow++;effects.shadowEvents.push(message);};
  const baseline = () => JSON.stringify({props:h.props.values, rows:Object.fromEntries(Object.entries(sheets).map(([k,v])=>[k,v.rows]))});
  const call = (action, extra={}) => c.doPost({postData:{contents:JSON.stringify({
    action, sessionToken:created.token, branchId:'CUT_HUB_MAIN', date:'2026-09-24',
    barber:'osama',fromDate:'2026-09-01',toDate:'2026-09-30',...extra
  })}});
  const noWrites = () => {
    assert.equal(effects.set,0); assert.equal(effects.delete,0); assert.equal(effects.audit,0);
    assert.equal(effects.cacheRemove.length,0);
    assert(!effects.cachePut.some(x=>x.key.startsWith('romeo-session-')));
    for (const s of Object.values(sheets)) assert.equal(s.writeCount(),0);
  };
  return {...h,c,sheets,created,effects,baseline,call,noWrites,cacheValues};
}

for (const action of actions) test(`${action}: full router duplicate read, one resolution each, no persistent effects`, () => {
  const h=setup(); const before=h.baseline();
  const first=h.call(action), second=h.call(action);
  assert.equal(first.status,'success',JSON.stringify(first)); assert.deepEqual(second,first);
  assert.equal(h.effects.resolutions,2); h.noWrites(); assert.equal(h.baseline(),before);
  if(action==='getBookings') {assert(Array.isArray(first.bookings));assert.equal(first.bookings.length,1);}
  if(action==='staffTotalSales') assert.equal(first.totalSales,120);
  if(action==='staffClientCount') assert.equal(first.totalClients,1);
  if(action==='getInternalBookingOptions') {
    assert.equal(first.barbers.length,1); assert.equal(first.services.length,1);
    assert.equal(h.effects.cachePut.length,2);
    assert(h.effects.cachePut.every(x=>x.key.startsWith('BA5RESP:')&&x.ttl===120));
  } else assert.equal(h.effects.cachePut.length,0);
});

const invalidCases = {
  missing: h => ({sessionToken:''}),
  revoked: h => {delete h.props.values['romeo-session-'+h.created.token];},
  expired: h => {const k='romeo-session-'+h.created.token; const s=JSON.parse(h.props.values[k]);s.expiresAt='2000-01-01';h.props.values[k]=JSON.stringify(s);},
  malformed: h => {h.props.values['romeo-session-'+h.created.token]='{';},
  epoch: h => {const k='romeo-session-'+h.created.token;const s=JSON.parse(h.props.values[k]);s.credentialEpoch=12;h.props.values[k]=JSON.stringify(s);},
  identifier: h => {const k='romeo-session-'+h.created.token;const s=JSON.parse(h.props.values[k]);s.identifierKeyFingerprint='wrong';h.props.values[k]=JSON.stringify(s);},
  missingUser: h => {h.users.rows.pop();},
  disabled: h => {h.users.rows[0].push('ACTIVE');h.users.rows[1].push(false);},
  dirtyCredential: h => {h.users.rows[1][1]='must-not-be-present';}
};
for (const action of actions) for (const [name,mutate] of Object.entries(invalidCases)) {
  test(`${action}: ${name} denies without cleanup or capability`,()=>{
    const h=setup();const extra=mutate(h)||{};const before=h.baseline();
    const r=h.call(action,extra);assert.equal(r.status,'error');
    if(name==='disabled') assert.equal(r.code,'USER_DISABLED');
    else if(name==='dirtyCredential') assert.equal(r.code,'AUTH_SECURITY_STATE_NOT_CLEAN');
    else assert.equal(r.authRequired,true);
    assert.equal(r.retrySafeAuth,undefined);assert.equal(h.effects.resolutions,1);
    h.noWrites();assert.equal(h.effects.cachePut.length,0);assert.equal(h.baseline(),before);
  });
}

test('permissions and branch scope deny with a single strict auth resolution',()=>{
  for(const [action,permissions,extra,code] of [
    ['getBookings','',{},'PERMISSION_DENIED'],
    ['getInternalBookingOptions','',{},'AVAILABILITY_PERMISSION_DENIED'],
    ['getInternalBookingOptions','booking_availability.view',{branchId:'OTHER'},'AVAILABILITY_BRANCH_SCOPE_DENIED']
  ]) {
    const h=setup({username:'reader',permissions});const before=h.baseline();
    assert.equal(h.call(action,extra).code,code);assert.equal(h.effects.resolutions,1);
    h.noWrites();assert.equal(h.baseline(),before);
  }
});

test('registry is immutable/default-deny and payload cannot grant capabilities or a trusted context',()=>{
  const h=setup();
  for(const action of ['createBooking','logout','__proto__','constructor','unknown']) assert.equal(h.c.protectedReadCapability(action),null);
  for(const action of actions) {
    const cap=h.c.protectedReadCapability(action);assert(Object.isFrozen(cap));
    assert.equal(cap.transportRetryEnabled,false);assert.equal(cap.persistentWritesAllowed,false);
  }
  const fake={action:'getBookings',retrySafeAuth:true,authContext:{user:{username:'owner'}},sessionToken:h.created.token};
  assert.equal(h.c.protectedReadContext(fake),null);assert.equal(h.c.getAuthenticatedUser(fake),null);
  assert.equal(h.call('getBookings',{sessionToken:'',...{retrySafe:true,authContext:fake}}).authRequired,true);
  h.noWrites();
});

test('stale cache cannot mask revocation between two attempts; expiry never rolls',()=>{
  const h=setup();const key='romeo-session-'+h.created.token;const raw=h.props.values[key];
  h.cacheValues[key]=raw;
  assert.equal(h.call('staffTotalSales').status,'success');assert.equal(h.props.values[key],raw);
  delete h.props.values[key]; // external revocation between executions
  assert.equal(h.call('staffTotalSales').authRequired,true);h.noWrites();
});

test('normal non-candidate auth retains expired-session cleanup',()=>{
  const h=setup();invalidCases.expired(h);
  assert.equal(h.call('totalIncome').authRequired,true);
  assert.equal(h.effects.delete,1);assert.equal(h.effects.cacheRemove.length,1);
});

for (const state of ['malformedThrottle','malformedMigration','legacyCredential','collision','identifierContinuity']) {
  test(`full clean-modern predicate rejects ${state} without effects`,()=>{
    const h=setup();
    if(state==='malformedThrottle') h.props.values['AUTH01:RL:v1:A:'+h.c.auth01OpaqueUserId('owner',h.runtimeOptions)]='{';
    if(state==='malformedMigration') h.props.values['AUTH01:MIG:v1:test']=JSON.stringify({opaqueUserId:h.c.auth01OpaqueUserId('owner',h.runtimeOptions)});
    if(state==='legacyCredential') h.users.rows[1][5]='a'.repeat(64);
    if(state==='collision') h.users.rows.push(['OWNER','','duplicate','','',h.users.rows[1][5]]);
    if(state==='identifierContinuity') h.props.values['AUTH01:IDKEYFP:v1']='wrong';
    const before=h.baseline(),r=h.call('getBookings');
    assert.equal(r.status,'error');assert.equal(h.effects.resolutions,1);
    assert(['AUTH_SECURITY_STATE_NOT_CLEAN','AUTH_SECURITY_STATE_UNAVAILABLE','AUTHENTICATION_SERVICE_UNAVAILABLE'].includes(r.code),r.code);
    h.noWrites();assert.equal(h.effects.cachePut.length,0);assert.equal(h.baseline(),before);
  });
}

test('both missing and populated auth cache are ignored without refresh',()=>{
  for(const populated of [false,true]) {
    const h=setup(),key='romeo-session-'+h.created.token;
    if(populated) h.cacheValues[key]='untrusted-cache-content';
    const before=h.baseline();
    assert.equal(h.call('staffClientCount').status,'success');
    assert.equal(h.call('staffClientCount').status,'success');
    assert.equal(h.effects.resolutions,2);h.noWrites();
    assert.equal(h.effects.cachePut.length,0);assert.equal(h.baseline(),before);
  }
});

for(const action of actions) test(`${action}: lost first response replay is safe in offline harness`,()=>{
  const h=setup();const before=h.baseline();
  const executeThenLoseResponse=()=>{
    const discarded=h.call(action);assert.equal(discarded.status,'success');
    throw Object.assign(new Error('Simulated response loss after server execution'),
      {status:404,contentType:'text/html',redirected:true});
  };
  assert.throws(executeThenLoseResponse,error=>error.status===404&&error.redirected);
  const replay=h.call(action);assert.equal(replay.status,'success');
  assert.equal(h.effects.resolutions,2);h.noWrites();assert.equal(h.baseline(),before);
});

test('trusted context is nonserializable by payload and actor scope is immutable/reused',()=>{
  const h=setup({username:'reader',permissions:'booking_availability.view'});
  const data={action:'getInternalBookingOptions',sessionToken:h.created.token};
  const context=h.c.resolveProtectedReadAuthContext(data);
  assert(Object.isFrozen(context));assert(!JSON.stringify(context).includes(h.created.token));
  assert.equal(context.sessionPropertyKey,undefined);assert.equal(context.serializedSession,undefined);
  const actor=h.c.schedulePhase2Actor(data);
  assert(Object.isFrozen(actor));assert(Object.isFrozen(actor.branchIds));
  assert.equal(h.c.schedulePhase2Actor(data),actor);
  const clone=h.c.inheritProtectedReadContext(data,{...data});
  assert.equal(h.c.schedulePhase2Actor(clone),actor);
  assert.equal(h.c.protectedReadContext(JSON.parse(JSON.stringify(data))),null);
  assert.equal(h.effects.resolutions,1);h.noWrites();
});

test('includeDeleted permission paths reuse context even on the second permission check',()=>{
  const h=setup({username:'reader',permissions:'view_bookings,delete_bookings'});
  assert.equal(h.call('getBookings',{includeDeleted:true}).status,'success');
  assert.equal(h.effects.resolutions,1);h.noWrites();
});

test('internal options SHADOW runs real evaluator and DTO authorization without auth re-resolution',()=>{
  const h=setup({engine:'SHADOW'});
  // Snapshot fixture replaces storage aggregation only; evaluator, actors,
  // permission/scope checks, engine dispatch and caches are production code.
  const staff={staffId:'staff-1',branchId:'CUT_HUB_MAIN',active:true};
  h.c.bookingAvailabilityPhase5RequestSnapshot=()=>({
    staff:[staff],staffById:{'staff-1':staff},versions:[],generations:[],branchHours:[],
    overrides:[],attendanceDays:[],attendanceEvents:[],bookings:[],
    branches:[{branchId:'CUT_HUB_MAIN',active:true,timeZone:'Africa/Cairo',publicSelectable:true}],
    schedules:[],scheduleOverrides:[],policies:[]
  });
  const first=h.call('getInternalBookingOptions');const second=h.call('getInternalBookingOptions');
  assert.equal(first.status,'success');assert.equal(second.status,'success');
  assert.equal(h.effects.resolutions,2);assert.equal(h.effects.shadow,2);h.noWrites();
  assert(h.effects.cachePut.some(x=>x.key.startsWith('BA5:')&&x.ttl===10),JSON.stringify(h.effects.shadowEvents));
  assert(h.effects.cachePut.some(x=>x.key.startsWith('BA5RESP:')&&x.ttl===120));
});
