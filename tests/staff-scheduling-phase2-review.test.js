const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const scheduling = require("../scripts/staff-scheduling-phase2");
const schema = require("../scripts/staff-attendance-schema");
const { SOURCE_ORDER, buildBundle } = require("../scripts/build-staff-scheduling-phase2-bundle");

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

const staff = { staffId: "S-1", staffName: "Nour", branchId: "B-1", active: true };
const segment = {
  staffId: "S-1", weekday: "MONDAY", shiftStart: "09:00", shiftEnd: "17:00",
  segmentIndex: 1, requiredWorkMinutes: 420, allowedBreakMinutes: 60,
  effectiveFrom: "2026-01-01", effectiveTo: "", active: true
};
const manager = {
  username: "manager", actorId: "manager", actorName: "Manager", role: "MANAGER",
  branchIds: ["B-1"], permissions: ["schedule.view", "schedule.manage", "leave.approve"]
};

function serviceFixture(repository) {
  let serial = 0;
  return scheduling.createService({
    repository,
    actorResolver: () => manager,
    withLock: (_details, callback) => callback(),
    now: () => "2026-07-29T12:00:00.000Z",
    uuid: () => `R-${++serial}`
  });
}

class FakeRange {
  constructor(sheet, row, column, rowCount = 1, columnCount = 1) {
    this.sheet = sheet;
    this.row = row;
    this.column = column;
    this.rowCount = rowCount;
    this.columnCount = columnCount;
  }
  getValues() {
    const all = [this.sheet.headers, ...this.sheet.rows];
    return Array.from({ length: this.rowCount }, (_unused, rowOffset) =>
      Array.from({ length: this.columnCount }, (_none, columnOffset) =>
        all[this.row - 1 + rowOffset]?.[this.column - 1 + columnOffset] ?? ""));
  }
  getValue() { return this.getValues()[0][0]; }
  setValues(values) {
    for (let r = 0; r < this.rowCount; r += 1) {
      const targetRow = this.row - 1 + r;
      const target = targetRow === 0
        ? this.sheet.headers
        : (this.sheet.rows[targetRow - 1] ||= []);
      for (let c = 0; c < this.columnCount; c += 1) {
        target[this.column - 1 + c] = values[r][c];
      }
    }
  }
}

class FakeSheet {
  constructor(headers, rows = []) {
    this.headers = [...headers];
    this.rows = rows.map(row => [...row]);
  }
  getLastColumn() { return this.headers.length; }
  getLastRow() { return this.rows.length + 1; }
  getRange(row, column, rowCount, columnCount) {
    return new FakeRange(this, row, column, rowCount, columnCount);
  }
  appendRow(values) { this.rows.push([...values]); }
  deleteRow(rowNumber) { this.rows.splice(rowNumber - 2, 1); }
}

function gasHarness(
  sheetDefinitions,
  config = { environment: "test", spreadsheetId: "sheet-1" },
  authenticatedUser = { username: "owner", displayName: "Owner", permissions: [] }
) {
  const sheets = Object.fromEntries(Object.entries(sheetDefinitions)
    .map(([name, definition]) => [name, new FakeSheet(definition.headers, definition.rows)]));
  const propertyState = new Map();
  const spreadsheet = {
    getId: () => "sheet-1",
    getSheetByName: name => sheets[name] || null
  };
  const context = vm.createContext({
    console,
    SpreadsheetApp: { getActive: () => spreadsheet },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    Utilities: {
      getUuid: () => "UUID",
      formatDate: date => date.toISOString().slice(0, 10)
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: key => propertyState.get(key) || null,
        setProperty: (key, value) => propertyState.set(key, value),
        deleteProperty: key => propertyState.delete(key)
      })
    },
    getAuthenticatedUser: () => authenticatedUser,
    normalizeManagedPermissions: (_username, permissions) => permissions || [],
    getCutHubEnvironmentConfig: () => ({ ...config }),
    jsonOutput: value => value
  });
  vm.runInContext(buildBundle({ write: false }).bundle, context);
  return { context, sheets, propertyState, spreadsheet };
}

test("Apps Script bundle loads without CommonJS and exports required globals in exact dependency order", () => {
  assert.deepEqual(SOURCE_ORDER, [
    "staff-attendance-schema.js",
    "staff-attendance-core.js",
    "staff-scheduling-phase2.js",
    "staff-scheduling-phase2-gas.js"
  ]);
  const { bundle } = buildBundle({ write: false });
  const generated = fs.readFileSync(
    path.join(__dirname, "../scripts/staff-scheduling-phase2-apps-script-bundle.gs"), "utf8"
  );
  assert.equal(generated, bundle);
  const context = vm.createContext({ console });
  vm.runInContext(bundle, context, { filename: "staff-scheduling-phase2-apps-script-bundle.gs" });
  assert.ok(context.StaffAttendanceSchema);
  assert.ok(context.StaffAttendanceCore);
  assert.ok(context.StaffSchedulingPhase2);
  assert.equal(typeof context.handleStaffSchedulingPhase2Action, "function");
});

test("pure Phase 2 domain has no Sheets, network, browser, or production configuration access", () => {
  const source = fs.readFileSync(path.join(__dirname, "../scripts/staff-scheduling-phase2.js"), "utf8");
  [
    "SpreadsheetApp", "PropertiesService", "LockService", "UrlFetchApp",
    "fetch(", "window.", "document.", "CUT_HUB_SPREADSHEET_ID"
  ].forEach(token => assert.equal(source.includes(token), false, token));
});

test("audit failure rolls back the business write and idempotency record", () => {
  const repository = scheduling.createMemoryRepository({ staff: [staff] });
  repository.appendAudit = () => {
    throw scheduling.schedulingError("AUDIT_WRITE_FAILED", "Audit unavailable.");
  };
  const service = serviceFixture(repository);
  expectCode("AUDIT_WRITE_FAILED", () => service.execute("saveScheduleSegment", {
    ...segment, requestId: "AUDIT-FAIL", reason: "Failure injection"
  }));
  assert.equal(repository.state.schedules.length, 0);
  assert.equal(repository.state.audits.length, 0);
  assert.equal(repository.state.idempotency.length, 0);
});

test("every schedule mutation requires an auditable reason before locking or writing", () => {
  const repository = scheduling.createMemoryRepository({ staff: [staff] });
  let lockCalls = 0;
  const service = scheduling.createService({
    repository, actorResolver: () => manager,
    withLock: (_details, callback) => { lockCalls += 1; return callback(); }
  });
  expectCode("SCHEDULE_WRITE_REASON_REQUIRED", () => service.execute("saveScheduleSegment", {
    ...segment, requestId: "NO-REASON"
  }));
  assert.equal(lockCalls, 0);
  assert.equal(repository.state.schedules.length, 0);
});

test("bulk mid-write failure is compensated to all-or-nothing in the pure repository", () => {
  const repository = scheduling.createMemoryRepository({ staff: [staff] });
  const originalSave = repository.saveSchedule;
  let writes = 0;
  repository.saveSchedule = record => {
    writes += 1;
    if (writes === 2) throw scheduling.schedulingError("INJECTED_SECOND_WRITE_FAILURE", "Injected");
    return originalSave(record);
  };
  const service = serviceFixture(repository);
  expectCode("INJECTED_SECOND_WRITE_FAILURE", () => service.execute("bulkSaveScheduleSegments", {
    requestId: "BULK-FAIL", reason: "Failure injection",
    segments: [
      segment,
      { ...segment, segmentIndex: 2, shiftStart: "18:00", shiftEnd: "22:00", requiredWorkMinutes: 240, allowedBreakMinutes: 0 }
    ]
  }));
  assert.equal(repository.state.schedules.length, 0);
  assert.equal(repository.state.audits.length, 0);
  assert.equal(repository.state.idempotency.length, 0);
});

test("weekly day off is a persisted recurring record distinct from leave", () => {
  const repository = scheduling.createMemoryRepository({
    staff: [staff],
    schedules: [{ ...scheduling.validateScheduleSegment(segment, { staff }), scheduleId: "SHIFT-1" }]
  });
  const service = serviceFixture(repository);
  const result = service.execute("setWeeklyDayOff", {
    requestId: "DAY-OFF-1", staffId: "S-1", weekday: "MONDAY",
    effectiveFrom: "2026-08-01", reason: "Weekly rest"
  });
  assert.equal(result.dayOffRecord.recordType, "WEEKLY_DAY_OFF");
  const resolved = service.execute("resolveStaffSchedule", {
    staffId: "S-1", date: "2026-08-03"
  }).resolvedSchedule;
  assert.equal(resolved.classification, "WEEKLY_DAY_OFF");
  assert.equal(resolved.sourceType, "RECURRING_DAY_OFF");
  assert.equal(resolved.dayOff, true);
  assert.notEqual(resolved.classification, "APPROVED_LEAVE");
});

test("legacy blank, malformed, identity-less, and ambiguous rows fail safe without silent resolution", () => {
  const headers = schema.LEGACY_SCHEDULE_HEADERS;
  const blank = scheduling.normalizeLegacyScheduleRow(new Array(8).fill(""), headers, {});
  assert.equal(blank.compatibilityStatus, "LEGACY_BLANK_ROW");
  const malformed = scheduling.normalizeLegacyScheduleRow(
    ["ID-1", "S-1", "Nour", "MONDAY", "9am", "5pm", true, ""], headers, {}
  );
  assert.equal(malformed.resolutionEligible, false);
  assert.ok(malformed.warnings.includes("LEGACY_SHIFT_TIME_INVALID"));
  const shortClock = scheduling.normalizeLegacyScheduleRow(
    ["ID-SHORT", "S-1", "Nour", "MONDAY", "9:00", "17:00", true, ""], headers, {}
  );
  assert.equal(shortClock.resolutionEligible, true);
  assert.equal(shortClock.shiftStart, "09:00");
  const identityless = scheduling.normalizeLegacyScheduleRow(
    ["", "S-1", "Nour", "MONDAY", "09:00", "17:00", true, ""], headers, {}
  );
  assert.equal(identityless.resolutionEligible, false);
  assert.ok(identityless.warnings.includes("LEGACY_SCHEDULE_ID_MISSING"));
  const first = scheduling.normalizeLegacyScheduleRow(
    ["A", "S-1", "Nour", "MONDAY", "09:00", "17:00", true, ""], headers, {}
  );
  const second = scheduling.normalizeLegacyScheduleRow(
    ["B", "S-1", "Nour", "MONDAY", "12:00", "20:00", true, ""], headers, {}
  );
  const classified = scheduling.classifyLegacyScheduleRows([first, second]);
  assert.ok(classified.every(item => item.resolutionEligible === false));
  assert.ok(classified.every(item => item.warnings.includes("LEGACY_AMBIGUOUS_OVERLAP")));
});

test("unresolved legacy rows are excluded with explicit resolution warning and trace", () => {
  const unresolved = {
    scheduleId: "", legacyRowKey: "ROW-2", staffId: "S-1", staffName: "Nour",
    active: true, resolutionEligible: false, compatibilityStatus: "LEGACY_UNRESOLVED"
  };
  const resolved = scheduling.resolveSchedule({
    staff, date: "2026-08-03", schedules: [unresolved],
    policyResolution: { snapshot: { requiredDailyMinutes: 420, allowedBreakMinutes: 60 } }
  });
  assert.ok(resolved.warnings.includes("UNRESOLVED_LEGACY_SCHEDULE_ROWS_EXCLUDED"));
  assert.ok(resolved.resolutionTrace.some(item => item.step === "UNRESOLVED_LEGACY_ROWS"));
});

test("legacy records may be copied but cannot be edited, deactivated, or rewritten", () => {
  const legacy = {
    ...segment, scheduleId: "LEGACY-1", staffName: "Nour", legacy: true,
    readOnly: true, resolutionEligible: true, recordType: "SHIFT"
  };
  const repository = scheduling.createMemoryRepository({ staff: [staff], schedules: [legacy] });
  const service = serviceFixture(repository);
  expectCode("SCHEDULE_LEGACY_READ_ONLY", () => service.execute("saveScheduleSegment", {
    ...legacy, requestId: "LEGACY-EDIT", reason: "Forbidden"
  }));
  expectCode("SCHEDULE_LEGACY_READ_ONLY", () => service.execute("deactivateScheduleSegment", {
    scheduleId: "LEGACY-1", requestId: "LEGACY-DEACTIVATE", reason: "Forbidden"
  }));
  const copied = service.execute("copyScheduleDay", {
    requestId: "LEGACY-COPY", staffId: "S-1", fromWeekday: "MONDAY",
    toWeekdays: ["TUESDAY"], effectiveFrom: "2026-01-01", reason: "Safe copy"
  });
  assert.equal(copied.schedules[0].legacy, false);
  assert.equal(repository.getSchedule("LEGACY-1").readOnly, true);
});

test("duplicate scope rows require explicit repair and existing scope IDs remain stable", () => {
  const repository = scheduling.createMemoryRepository({
    staff: [staff],
    scopes: [
      { scopeId: "SC-1", username: "worker", staffId: "S-1", role: "EMPLOYEE", active: true },
      { scopeId: "SC-2", username: "worker", staffId: "S-1", role: "EMPLOYEE", active: false }
    ]
  });
  const service = scheduling.createService({
    repository,
    actorResolver: () => ({ ...manager, username: "owner", actorId: "owner", owner: true }),
    withLock: (_details, callback) => callback(),
    now: () => "2026-07-29T12:00:00.000Z", uuid: () => "NEW"
  });
  expectCode("SCHEDULE_SCOPE_AMBIGUOUS", () => service.execute("saveScheduleUserScope", {
    requestId: "SCOPE-AMBIGUOUS", username: "worker", staffId: "S-1",
    role: "EMPLOYEE", active: true, reason: "Ambiguous"
  }));
  const updated = service.execute("saveScheduleUserScope", {
    requestId: "SCOPE-REPAIR", scopeId: "SC-2", username: "worker",
    staffId: "S-1", role: "EMPLOYEE", active: false, reason: "Repair"
  });
  assert.equal(updated.scope.scopeId, "SC-2");
  assert.equal(repository.state.scopes.length, 2);
});

test("scope role, employee mapping, and manager branch requirements fail closed", () => {
  const repository = scheduling.createMemoryRepository({ staff: [staff] });
  const service = scheduling.createService({
    repository,
    actorResolver: () => ({ ...manager, username: "owner", actorId: "owner", owner: true }),
    withLock: (_details, callback) => callback(), uuid: () => "SCOPE"
  });
  expectCode("SCHEDULE_SCOPE_ROLE_INVALID", () => service.execute("saveScheduleUserScope", {
    requestId: "BAD-ROLE", username: "x", staffId: "S-1", role: "SUPERUSER",
    active: true, reason: "Invalid role"
  }));
  expectCode("SCHEDULE_SCOPE_STAFF_REQUIRED", () => service.execute("saveScheduleUserScope", {
    requestId: "NO-STAFF", username: "x", role: "EMPLOYEE", active: true, reason: "Missing staff"
  }));
  expectCode("SCHEDULE_SCOPE_BRANCH_REQUIRED", () => service.execute("saveScheduleUserScope", {
    requestId: "NO-BRANCH", username: "x", role: "MANAGER", active: true, reason: "Missing branch"
  }));
});

test("override lifecycle supports manager activation and employee withdrawal without weakening approval", () => {
  const repository = scheduling.createMemoryRepository({
    staff: [staff],
    overrides: [{
      overrideId: "CUSTOM-DRAFT", staffId: "S-1", staffName: "Nour",
      scopeType: "STAFF", date: "2026-08-05", type: "CUSTOM_SHIFT",
      status: "DRAFT", shiftStart: "10:00", shiftEnd: "18:00",
      requiredWorkMinutes: 420, allowedBreakMinutes: 60, reason: "Draft"
    }]
  });
  let actor = manager;
  let lifecycleSerial = 0;
  const service = scheduling.createService({
    repository, actorResolver: () => actor,
    withLock: (_details, callback) => callback(),
    now: () => "2026-07-29T12:00:00.000Z", uuid: () => `ID-${++lifecycleSerial}`
  });
  const activated = service.execute("transitionScheduleOverride", {
    requestId: "ACTIVATE", overrideId: "CUSTOM-DRAFT",
    nextStatus: "APPROVED", reason: "Publish custom shift"
  });
  assert.equal(activated.override.status, "APPROVED");
  assert.equal(activated.override.approvedBy, "manager");

  actor = {
    username: "employee", actorId: "employee", actorName: "Nour",
    role: "EMPLOYEE", staffId: "S-1", branchIds: ["B-1"],
    permissions: ["schedule.view", "leave.request"]
  };
  const requested = service.execute("createScheduleOverride", {
    requestId: "REQUEST", staffId: "S-1", date: "2026-08-06",
    type: "APPROVED_LEAVE", reason: "Personal leave"
  });
  const cancelled = service.execute("cancelScheduleOverride", {
    requestId: "WITHDRAW", overrideId: requested.override.overrideId,
    reason: "Request withdrawn"
  });
  assert.equal(cancelled.override.status, "CANCELLED");
  assert.equal(cancelled.override.cancelledBy, "employee");
});

test("all role response DTOs filter payroll and idempotency internals", () => {
  const repository = scheduling.createMemoryRepository({
    staff: [staff],
    schedules: [{
      ...segment, scheduleId: "SCH", salary: 5000, hourlyRate: 100,
      requestFingerprint: "secret", _rowNumber: 12
    }]
  });
  let actor = manager;
  const service = scheduling.createService({
    repository, actorResolver: () => actor, withLock: (_details, callback) => callback()
  });
  const managerDto = service.execute("listStaffSchedules", { limit: 10 }).schedules[0];
  ["salary", "hourlyRate", "requestFingerprint", "_rowNumber"].forEach(key => assert.equal(key in managerDto, false));
  actor = { username: "employee", actorId: "employee", role: "EMPLOYEE", staffId: "S-1", permissions: ["schedule.view"] };
  const employeeDto = service.execute("listStaffSchedules", { limit: 10 }).schedules[0];
  ["salary", "hourlyRate", "requestFingerprint", "_rowNumber"].forEach(key => assert.equal(key in employeeDto, false));
  actor = { username: "owner", actorId: "owner", role: "OWNER", owner: true, permissions: [] };
  const ownerDto = service.execute("listStaffSchedules", { limit: 10 }).schedules[0];
  ["salary", "hourlyRate", "requestFingerprint", "_rowNumber"].forEach(key => assert.equal(key in ownerDto, false));
  actor = { username: "none", actorId: "none", role: "EMPLOYEE", permissions: [] };
  expectCode("PERMISSION_DENIED", () => service.execute("listStaffSchedules", { limit: 10 }));
});

test("active source wiring includes route, permission, page assets, and no inline data rendering", () => {
  const main = fs.readFileSync(path.join(__dirname, "../scripts/app-script-final-owner-access.js"), "utf8");
  const layout = fs.readFileSync(path.join(__dirname, "../public/assets/js/utils/layout.js"), "utf8");
  const auth = fs.readFileSync(path.join(__dirname, "../public/assets/js/core/auth.js"), "utf8");
  const page = fs.readFileSync(path.join(__dirname, "../public/pages/schedule-management.html"), "utf8");
  const ui = fs.readFileSync(path.join(__dirname, "../public/assets/js/pages/schedule-management.js"), "utf8");
  assert.ok(main.includes("handleStaffSchedulingPhase2Action(data)"));
  assert.ok(main.includes('"schedule.view"') && main.includes('"leave.approve"'));
  assert.ok(layout.includes('"schedule-management.html": "schedule.view"'));
  assert.ok(auth.includes('"schedule.view"'));
  assert.ok(auth.includes('["schedule.view", "schedule-management.html"]'));
  assert.ok(page.includes("../assets/css/pages/schedule-management.css"));
  assert.ok(page.includes("../assets/js/pages/schedule-management.js"));
  assert.ok(page.includes('id="scopePanel"') && page.includes('id="scopeDialog"'));
  assert.ok(ui.includes('RomeoAuth.requireAuth("schedule.view")'));
  assert.ok(ui.includes('"saveScheduleUserScope"') && ui.includes('"listScheduleUserScopes"'));
  assert.equal(ui.includes("innerHTML"), false);
  assert.equal(/on(click|change|submit)=/i.test(page), false);
});

test("GAS adapter preserves unknown columns and rejects displaced protected legacy columns", () => {
  const headers = [...schema.SHEET_SCHEMAS.BARBER_SCHEDULE, "CUSTOM_NOTE"];
  const row = headers.map(header => ({
    SCHEDULE_ID: "SCH-1", STAFF_ID: "S-1", STAFF_NAME: "Nour", WEEKDAY: "MONDAY",
    SHIFT_START: "09:00", SHIFT_END: "17:00", ACTIVE: true, UPDATED_AT: "old",
    SEGMENT_INDEX: 1, REQUIRED_WORK_MINUTES: 420, ALLOWED_BREAK_MINUTES: 60,
    EFFECTIVE_FROM: "2026-01-01", RECORD_TYPE: "SHIFT", CUSTOM_NOTE: "preserve-me"
  })[header] ?? "");
  const { context, sheets } = gasHarness({
    BARBER_SCHEDULE: { headers, rows: [row] }
  });
  context.schedulePhase2Save(
    "BARBER_SCHEDULE", context.StaffSchedulingPhase2.PHASE2_SHEET_SCHEMAS.BARBER_SCHEDULE,
    "SCHEDULE_ID", {
      scheduleId: "SCH-1", staffId: "S-1", staffName: "Nour", weekday: "MONDAY",
      shiftStart: "10:00", shiftEnd: "18:00", active: true, updatedAt: "new",
      segmentIndex: 1, requiredWorkMinutes: 420, allowedBreakMinutes: 60,
      effectiveFrom: "2026-01-01", effectiveTo: "", recordType: "SHIFT"
    }
  );
  assert.equal(sheets.BARBER_SCHEDULE.rows[0][headers.indexOf("CUSTOM_NOTE")], "preserve-me");
  assert.equal(sheets.BARBER_SCHEDULE.rows[0][headers.indexOf("SHIFT_START")], "10:00");

  const displaced = gasHarness({
    BARBER_SCHEDULE: {
      headers: ["STAFF_ID", "SCHEDULE_ID", ...schema.LEGACY_SCHEDULE_HEADERS.slice(2)],
      rows: []
    }
  });
  expectCode("INCOMPATIBLE_LEGACY_SCHEDULE_PREFIX", () =>
    displaced.context.schedulePhase2AssertHeaders(
      "BARBER_SCHEDULE", displaced.context.StaffSchedulingPhase2.PHASE2_SHEET_SCHEMAS.BARBER_SCHEDULE
    ));
});

test("GAS adapter transaction restores updated rows and clears recovery marker after compensation", () => {
  const headers = [...schema.SHEET_SCHEMAS.BARBER_SCHEDULE];
  const row = headers.map(header => ({
    SCHEDULE_ID: "SCH-1", STAFF_ID: "S-1", STAFF_NAME: "Nour", WEEKDAY: "MONDAY",
    SHIFT_START: "09:00", SHIFT_END: "17:00", ACTIVE: true, UPDATED_AT: "old",
    SEGMENT_INDEX: 1, REQUIRED_WORK_MINUTES: 420, ALLOWED_BREAK_MINUTES: 60,
    EFFECTIVE_FROM: "2026-01-01", RECORD_TYPE: "SHIFT"
  })[header] ?? "");
  const { context, sheets, propertyState } = gasHarness({
    BARBER_SCHEDULE: { headers, rows: [row] }
  });
  assert.throws(() => context.schedulePhase2WithTransaction({
    action: "saveScheduleSegment", requestId: "ROLLBACK-1", actorId: "manager"
  }, () => {
    context.schedulePhase2Save(
      "BARBER_SCHEDULE", context.StaffSchedulingPhase2.PHASE2_SHEET_SCHEMAS.BARBER_SCHEDULE,
      "SCHEDULE_ID", {
        scheduleId: "SCH-1", staffId: "S-1", staffName: "Nour", weekday: "MONDAY",
        shiftStart: "12:00", shiftEnd: "20:00", active: true, updatedAt: "new",
        segmentIndex: 1, requiredWorkMinutes: 420, allowedBreakMinutes: 60,
        effectiveFrom: "2026-01-01", effectiveTo: "", recordType: "SHIFT"
      }
    );
    throw new Error("audit failed");
  }), /audit failed/);
  assert.deepEqual(sheets.BARBER_SCHEDULE.rows[0], row);
  assert.equal(propertyState.has("SCHEDULE_RECOVERY_ROLLBACK-1"), false);
});

test("GAS adapter leaves a durable recovery marker when compensation cannot complete", () => {
  const { context, propertyState } = gasHarness({});
  expectCode("SCHEDULE_COMPENSATION_FAILED", () => context.schedulePhase2WithTransaction({
    action: "bulkSaveScheduleSegments", requestId: "ROLLBACK-FAILED", actorId: "manager"
  }, () => {
    context.schedulePhase2RecordUndo({
      type: "UPDATE", sheetName: "MISSING_SHEET", rowNumber: 2, values: ["before"]
    });
    throw new Error("business failure");
  }));
  const marker = JSON.parse(propertyState.get("SCHEDULE_RECOVERY_ROLLBACK-FAILED"));
  assert.equal(marker.status, "COMPENSATION_FAILED");
  assert.equal(marker.requestId, "ROLLBACK-FAILED");
  assert.equal(marker.failures[0].code, "ROLLBACK_OPERATION_FAILED");
});

test("GAS adapter rejects missing write schema and incorrect environment or spreadsheet identity", () => {
  const missing = gasHarness({});
  expectCode("SCHEDULE_SCHEMA_NOT_READY", () => missing.context.schedulePhase2AssertWriteReady());
  const badEnvironment = gasHarness({}, { environment: "", spreadsheetId: "sheet-1" });
  expectCode("SCHEDULE_ENVIRONMENT_IDENTITY_INVALID", () =>
    badEnvironment.context.schedulePhase2AssertEnvironmentIdentity());
  const badSpreadsheet = gasHarness({}, { environment: "test", spreadsheetId: "wrong" });
  expectCode("SCHEDULE_SPREADSHEET_IDENTITY_MISMATCH", () =>
    badSpreadsheet.context.schedulePhase2AssertEnvironmentIdentity());
});

test("GAS actor resolution rejects duplicate active mappings and never trusts request actor fields", () => {
  const scopeHeaders = [...scheduling.PHASE2_SHEET_SCHEMAS.SCHEDULE_USER_SCOPES];
  const scopeRow = id => scopeHeaders.map(header => ({
    SCOPE_ID: id, USERNAME: "manager", ROLE: "MANAGER",
    BRANCH_IDS_JSON: '["B-1"]', ACTIVE: true
  })[header] ?? "");
  const staffHeaders = [
    "NAME", "CODE", "SALARY", "PERCENTAGE", "ID", "BONUS", "DEDUCTION",
    "ACTIVE", "CREATED_AT", "UPDATED_AT", "IS_BARBER", "BRANCH_ID"
  ];
  const { context } = gasHarness({
    SCHEDULE_USER_SCOPES: { headers: scopeHeaders, rows: [scopeRow("SC-1"), scopeRow("SC-2")] },
    STAFF: { headers: staffHeaders, rows: [["Nour", "N", 0, 0, "S-1", 0, 0, true, "", "", true, "B-1"]] }
  }, undefined, {
    username: "manager", displayName: "Manager", permissions: ["schedule.view", "schedule.manage"]
  });
  expectCode("SCHEDULE_SCOPE_AMBIGUOUS", () => context.schedulePhase2Actor({
    actorId: "owner", actorRole: "OWNER", staffId: "S-999", branchIds: ["B-999"]
  }));
});

test("migration planner covers legacy, complete, partial, missing, changed, and mismatched fixtures with zero writes", () => {
  const identity = {
    environment: "test", expectedSpreadsheetId: "sheet-1",
    actualSpreadsheetId: "sheet-1", environmentReviewApproved: true
  };
  const legacy = {
    BARBER_SCHEDULE: [...schema.LEGACY_SCHEDULE_HEADERS]
  };
  const legacyPlan = scheduling.planScheduleMigration(legacy, identity);
  assert.equal(legacyPlan.safe, true);
  assert.ok(legacyPlan.appendColumns.BARBER_SCHEDULE.includes("SEGMENT_INDEX"));
  assert.ok(legacyPlan.createSheets.some(item => item.sheetName === "SCHEDULE_USER_SCOPES"));

  const completeSheets = Object.fromEntries(Object.entries(scheduling.PHASE2_SHEET_SCHEMAS)
    .map(([name, headers]) => [name, [...headers]]));
  const complete = scheduling.planScheduleMigration(completeSheets, identity);
  assert.equal(complete.safe, true);
  assert.deepEqual(complete.createSheets, []);
  assert.deepEqual(complete.appendColumns, {});

  const partial = scheduling.planScheduleMigration({
    ...completeSheets,
    STAFF_SCHEDULE_OVERRIDES: completeSheets.STAFF_SCHEDULE_OVERRIDES.slice(0, 8)
  }, identity);
  assert.equal(partial.safe, true);
  assert.ok(partial.appendColumns.STAFF_SCHEDULE_OVERRIDES.length > 0);

  const incompatible = scheduling.planScheduleMigration({
    ...completeSheets,
    BARBER_SCHEDULE: [
      "STAFF_ID", "SCHEDULE_ID", ...schema.LEGACY_SCHEDULE_HEADERS.slice(2)
    ]
  }, identity);
  assert.equal(incompatible.safe, false);
  assert.ok(incompatible.errors.some(item => item.code === "INCOMPATIBLE_LEGACY_SCHEDULE_PREFIX"));

  const mismatch = scheduling.planScheduleMigration(legacy, {
    ...identity, actualSpreadsheetId: "other-sheet"
  });
  assert.equal(mismatch.safe, false);
  assert.ok(mismatch.errors.some(item => item.code === "SPREADSHEET_IDENTITY_MISMATCH"));

  const changed = scheduling.planScheduleMigration({
    BARBER_SCHEDULE: [...schema.LEGACY_SCHEDULE_HEADERS, "SEGMENT_INDEX"]
  }, identity);
  assert.notDeepEqual(changed, legacyPlan);
  [legacyPlan, complete, partial, incompatible, mismatch, changed].forEach(report => {
    assert.equal(report.writes, 0);
    assert.equal(report.rollback.historicalRowsTouched, 0);
  });
});

test("override creation ignores browser IDs and enforces strict scope, segment, and schedule-only semantics", () => {
  expectCode("OVERRIDE_STAFF_NOT_ALLOWED", () => scheduling.validateOverride({
    overrideId: "BROWSER-ID", staffId: "S-1", branchId: "B-1", scopeType: "BRANCH",
    date: "2026-08-01", type: "BRANCH_CLOSED", reason: "Closure", status: "APPROVED"
  }, {}));
  expectCode("OVERRIDE_SEGMENT_INDEX_INVALID", () => scheduling.validateOverride({
    staffId: "S-1", scopeType: "STAFF", date: "2026-08-01",
    type: "CUSTOM_SHIFT", reason: "Custom", status: "APPROVED",
    shiftStart: "09:00", shiftEnd: "17:00", requiredWorkMinutes: 420,
    allowedBreakMinutes: 60, segmentIndex: 1.5
  }, { staff }));
  const repository = scheduling.createMemoryRepository({ staff: [staff] });
  const service = serviceFixture(repository);
  const created = service.execute("createScheduleOverride", {
    requestId: "CREATE-STRICT", overrideId: "BROWSER-ID", staffId: "S-1",
    scopeType: "STAFF", date: "2026-08-01", type: "ABSENT",
    reason: "Planned schedule block only", status: "APPROVED"
  });
  assert.notEqual(created.override.overrideId, "BROWSER-ID");
  assert.equal(created.override.effectScope, "SCHEDULE_ONLY");
});

console.log(`Staff scheduling Phase 2 strict review tests passed: ${passed}`);
