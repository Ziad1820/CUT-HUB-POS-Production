const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const phase3 = require("../scripts/staff-attendance-phase3");
const schema = require("../scripts/staff-attendance-schema");

function camel(header) {
  return String(header).toLowerCase().replace(/_([a-z0-9])/g,
    (_match, character) => character.toUpperCase());
}

function completePolicy(overrides = {}) {
  const booleans = new Set([
    "allowMultipleBreaks", "excessBreakContributesToDeficit",
    "overtimeApprovalRequired", "leaveCarryForward", "leaveApprovalRequired",
    "hireDateProration", "terminationDateProration", "sickLeavePaid"
  ]);
  const numbers = new Set([
    "requiredDailyMinutes", "allowedBreakMinutes", "maxSingleBreakMinutes",
    "breakGraceMinutes", "graceLateMinutes", "graceEarlyLeaveMinutes",
    "deficitRatePerHour", "fixedLatePenalty", "dailyDeductionCap",
    "overtimeRatePerHour", "overtimeMultiplier", "minOvertimeThresholdMinutes",
    "dailyOvertimeCapMinutes", "periodOvertimeCapMinutes", "roundingIncrementMinutes",
    "monthlyAllowedLeaveDays", "maxCarryForwardDays", "excessAbsenceMultiplier",
    "excessAbsenceFixedAmount", "maxExcessAbsenceDeduction", "fixedDayValue",
    "monthlySalary", "workingDaysDivisor", "hourlyRate", "currencyMinorScale",
    "monthlySalaryMinor", "deficitRateMinorPerMinute", "dailyDeductionCapMinor",
    "periodDeductionCapMinor", "overtimeRateMinorPerMinute", "overtimeMultiplierBps",
    "unpaidLeaveMultiplierBps", "absenceMultiplierBps"
  ]);
  const enums = {
    breakPaymentType: "UNPAID", deficitRateType: "SALARY_DERIVED",
    overtimePolicy: "NONE", roundingMode: "NONE", settlementPeriod: "MONTHLY",
    partialLeaveUnit: "MINUTES", leaveResetPeriod: "MONTHLY",
    excessAbsencePolicy: "WORKING_HOURS_BASED",
    dayValueMethod: "MONTHLY_SALARY_DIVIDED_BY_WORKING_DAYS",
    salaryBasis: "MONTHLY", overtimeRateType: "SALARY_DERIVED",
    unresolvedBehavior: "BLOCK"
  };
  const policy = {};
  schema.SHEET_SCHEMAS.STAFF_WORK_POLICIES.map(camel).forEach(key => {
    if (["policyId", "active", "createdAt", "createdBy", "updatedAt", "updatedBy"].includes(key)) return;
    if (key === "staffId") policy[key] = "S1";
    else if (key === "effectiveFrom") policy[key] = "2026-08-10";
    else if (key === "effectiveTo") policy[key] = "2026-08-10";
    else if (key === "currency") policy[key] = "EGP";
    else if (key.endsWith("Json")) policy[key] = "[]";
    else if (booleans.has(key)) policy[key] = false;
    else if (numbers.has(key)) policy[key] = 0;
    else if (enums[key]) policy[key] = enums[key];
    else policy[key] = "";
  });
  policy.requiredDailyMinutes = 60;
  policy.currencyMinorScale = 2;
  return { ...policy, ...overrides };
}

function mapRealisticStoredPolicyRow(options = {}) {
  const headers = schema.SHEET_SCHEMAS.STAFF_WORK_POLICIES.slice();
  const populated = {
    POLICY_ID: "POL-STAGING-PAYROLL-OSAMA-20260809",
    STAFF_ID: "1784232573966", EFFECTIVE_FROM: "2026-08-09", EFFECTIVE_TO: "2026-08-09",
    REQUIRED_DAILY_MINUTES: 60, ALLOWED_BREAK_MINUTES: 0,
    BREAK_PAYMENT_TYPE: "UNPAID", ROUNDING_INCREMENT_MINUTES: 0,
    ROUNDING_MODE: "NONE", CURRENCY: "EGP", ACTIVE: "TRUE",
    CREATED_AT: "2026-08-09T15:09:45+03:00", CREATED_BY: "owner",
    UPDATED_AT: "2026-08-09T15:09:45+03:00", UPDATED_BY: "owner",
    CURRENCY_MINOR_SCALE: 2, SALARY_BASIS: "MONTHLY", UNRESOLVED_BEHAVIOR: "BLOCK"
  };
  const row = headers.map(header => Object.prototype.hasOwnProperty.call(populated, header)
    ? populated[header] : "");
  const sheet = {
    getLastRow: () => 2,
    getLastColumn: () => headers.length,
    getRange(rowNumber) {
      return { getValues: () => [rowNumber === 1 ? headers : row] };
    }
  };
  const context = {
    SpreadsheetApp: { getActive: () => ({ getSheetByName: name =>
      name === "STAFF_WORK_POLICIES" ? sheet : null }) },
    StaffSchedulingPhase2: { TIME_ZONE: "Africa/Cairo" },
    Utilities: { formatDate: value => String(value) }, console
  };
  vm.createContext(context);
  let adapter = fs.readFileSync(path.join(
    __dirname, "../scripts/staff-scheduling-phase2-gas.js"), "utf8");
  if (options.preFixJsonMapping) {
    adapter = adapter.replace(
      /\n        if \(name === "STAFF_WORK_POLICIES"\) \{\n          record\[canonicalJsonKey\] = canonicalJsonValue;\n        \}/,
      ""
    ).replace(/\n        var canonicalJsonKey = key;\n        var canonicalJsonValue = value === undefined \|\| value === null \? "" : String\(value\);/, "");
  }
  vm.runInContext(adapter, context);
  return context.schedulePhase2ReadRows("STAFF_WORK_POLICIES")[0];
}

function setup(options = {}) {
  const repository = options.repository || phase3.createMemoryRepository({
    staff: [
      { staffId: "S1", staffName: "Osama", branchId: "CUT_HUB_MAIN", active: true },
      { staffId: "S2", staffName: "Inactive", branchId: "CUT_HUB_MAIN", active: false }
    ],
    policies: options.policies || [], days: options.days || []
  });
  const actors = {
    owner: { actorId: "owner", actorName: "Owner", username: "owner", owner: true,
      permissions: ["attendance.manage"] },
    manager: { actorId: "manager", actorName: "Manager", role: "MANAGER",
      permissions: ["attendance.manage"] }
  };
  let uuid = 0;
  let locks = 0;
  const service = phase3.createService({
    repository,
    actorResolver: data => actors[data.as || "owner"],
    now: () => "2026-08-09T18:00:00+03:00",
    uuid: () => `uuid-${++uuid}`,
    withLock: (_details, callback) => { locks += 1; return callback(); },
    beforeWorkPolicyNormalization: options.beforeWorkPolicyNormalization
  });
  return {
    repository, locks: () => locks,
    execute(action, data = {}) {
      return service.execute(action, {
        action, as: data.as || "owner", requestId: data.requestId || `REQ-${++uuid}`,
        reason: data.reason || "controlled test", ...data
      });
    }
  };
}

function expectCode(fn, code) {
  assert.throws(fn, error => error && error.code === code);
}

test("owner creates one complete policy under the mutation lock with audit evidence", () => {
  const h = setup();
  const result = h.execute("createWorkPolicy", { policy: completePolicy(), requestId: "REQ-CREATE" });
  assert.equal(result.code, "CREATE_WORK_POLICY_OK");
  assert.match(result.workPolicy.policyId, /^POL-/);
  assert.equal(result.workPolicy.requiredDailyMinutes, 60);
  assert.equal(h.locks(), 1);
  const state = h.repository.getState();
  assert.equal(state.policies.length, 1);
  assert.equal(state.audit.length, 1);
  assert.equal(state.audit[0].action, "CREATE_WORK_POLICY");
});

test("duplicate create request replays the committed result without a second row", () => {
  const h = setup();
  const payload = { policy: completePolicy(), requestId: "REQ-REPLAY" };
  const first = h.execute("createWorkPolicy", payload);
  const second = h.execute("createWorkPolicy", payload);
  assert.deepEqual(second, first);
  assert.equal(h.repository.getState().policies.length, 1);
  assert.equal(h.repository.getState().audit.length, 1);
});

test("overlapping active employee policy is rejected", () => {
  const existing = { ...completePolicy({ effectiveFrom: "2026-08-01", effectiveTo: "2026-08-31" }),
    policyId: "POL-EXISTING", active: true };
  const h = setup({ policies: [existing] });
  expectCode(() => h.execute("createWorkPolicy", { policy: completePolicy() }),
    "WORK_POLICY_EFFECTIVE_OVERLAP");
});

test("invalid employee, date range, minutes, enum, and incomplete payload fail closed", () => {
  expectCode(() => setup().execute("createWorkPolicy", {
    policy: completePolicy({ staffId: "UNKNOWN" })
  }), "WORK_POLICY_STAFF_NOT_FOUND");
  expectCode(() => setup().execute("createWorkPolicy", {
    policy: completePolicy({ staffId: "S2" })
  }), "WORK_POLICY_STAFF_INACTIVE");
  expectCode(() => setup().execute("createWorkPolicy", {
    policy: completePolicy({ effectiveFrom: "2026-08-11", effectiveTo: "2026-08-10" })
  }), "WORK_POLICY_DATE_RANGE_INVALID");
  expectCode(() => setup().execute("createWorkPolicy", {
    policy: completePolicy({ requiredDailyMinutes: -1 })
  }), "WORK_POLICY_NUMBER_INVALID");
  expectCode(() => setup().execute("createWorkPolicy", {
    policy: completePolicy({ salaryBasis: "UNKNOWN" })
  }), "WORK_POLICY_ENUM_INVALID");
  const incomplete = completePolicy();
  delete incomplete.currency;
  expectCode(() => setup().execute("createWorkPolicy", { policy: incomplete }),
    "WORK_POLICY_FIELD_REQUIRED");
});

test("non-owner authorization is rejected server-side", () => {
  expectCode(() => setup().execute("createWorkPolicy", {
    as: "manager", policy: completePolicy()
  }), "WORK_POLICY_OWNER_REQUIRED");
});

test("audit failure rolls back the policy and idempotency rows", () => {
  const base = phase3.createMemoryRepository({
    staff: [{ staffId: "S1", staffName: "Osama", branchId: "CUT_HUB_MAIN", active: true }]
  });
  const repository = { ...base, appendAudit() { throw new Error("audit failed"); } };
  const h = setup({ repository });
  assert.throws(() => h.execute("createWorkPolicy", { policy: completePolicy() }), /audit failed/);
  assert.equal(base.getState().policies.length, 0);
  assert.equal(base.getState().idempotency.length, 0);
});

test("deactivation is soft, replay-safe, audited, and preserves referenced day snapshots", () => {
  const source = { ...completePolicy(), policyId: "POL-1", active: true,
    createdAt: "2026-08-01T00:00:00+03:00", createdBy: "owner" };
  const snapshot = { policyId: "POL-1", requiredDailyMinutes: 60 };
  const day = { attendanceDayId: "ATD-S1-2026-08-10", staffId: "S1",
    attendanceDate: "2026-08-10", policyId: "POL-1", policySnapshot: snapshot };
  const h = setup({ policies: [source], days: [day] });
  const payload = { policyId: "POL-1", requestId: "REQ-DEACTIVATE", reason: "test cleanup" };
  const first = h.execute("deactivateWorkPolicy", payload);
  const second = h.execute("deactivateWorkPolicy", payload);
  assert.deepEqual(second, first);
  const state = h.repository.getState();
  assert.equal(state.policies.length, 1);
  assert.equal(state.policies[0].active, false);
  assert.deepEqual(state.days[0].policySnapshot, snapshot);
  assert.equal(state.audit.length, 1);
  assert.equal(state.audit[0].action, "DEACTIVATE_WORK_POLICY");
});

test("explicit source-policy cloning remains complete and still enforces overlap", () => {
  const source = { ...completePolicy({ effectiveFrom: "2026-08-09", effectiveTo: "2026-08-09" }),
    policyId: "POL-SOURCE", active: true };
  const h = setup({ policies: [source] });
  const result = h.execute("createWorkPolicy", {
    sourcePolicyId: "POL-SOURCE", staffId: "S1", effectiveFrom: "2026-08-10",
    effectiveTo: "2026-08-10", requiredWorkMinutes: 60, allowedBreakMinutes: 0,
    salaryBasis: "MONTHLY", currency: "EGP"
  });
  assert.equal(result.code, "CREATE_WORK_POLICY_OK");
  assert.equal(h.repository.getState().policies.length, 2);
});

test("pre-fix real Sheets blank mapping reproduces the live canonical-field failure", () => {
  const source = mapRealisticStoredPolicyRow({ preFixJsonMapping: true });
  assert.equal(Object.prototype.hasOwnProperty.call(source, "overtimeAllowedWindowsJson"), false);
  assert.equal(source.overtimeAllowedWindows, null);
  const h = setup({ policies: [source] });
  assert.throws(() => h.execute("createWorkPolicy", {
    sourcePolicyId: "POL-STAGING-PAYROLL-OSAMA-20260809", staffId: "S1",
    effectiveFrom: "2026-08-10", effectiveTo: "2026-08-10",
    requiredWorkMinutes: 60, allowedBreakMinutes: 0,
    salaryBasis: "MONTHLY", currency: "EGP", requestId: "REQ-PRE-FIX"
  }), error => error && error.code === "WORK_POLICY_FIELD_REQUIRED" &&
    error.details && error.details.field === "overtimeAllowedWindowsJson");
});

test("real Sheets blank-cell mapping preserves canonical JSON fields through source clone", () => {
  const source = mapRealisticStoredPolicyRow();
  assert.equal(Object.prototype.hasOwnProperty.call(source, "overtimeAllowedWindowsJson"), true);
  assert.equal(source.overtimeAllowedWindowsJson, "");
  assert.equal(source.overtimeAllowedWindows, null);
  assert.equal(source.leaveTypesConsumingJson, "");
  assert.equal(source.leaveTypesExemptJson, "");
  let cloneImmediatelyBeforeValidation;
  const h = setup({
    policies: [source],
    beforeWorkPolicyNormalization: policy => { cloneImmediatelyBeforeValidation = policy; }
  });
  const result = h.execute("createWorkPolicy", {
    sourcePolicyId: "POL-STAGING-PAYROLL-OSAMA-20260809", staffId: "S1",
    effectiveFrom: "2026-08-10", effectiveTo: "2026-08-10",
    requiredWorkMinutes: 60, allowedBreakMinutes: 0,
    salaryBasis: "MONTHLY", currency: "EGP", requestId: "REQ-BLANK-JSON"
  });
  assert.equal(Object.prototype.hasOwnProperty.call(
    cloneImmediatelyBeforeValidation, "overtimeAllowedWindowsJson"), true);
  assert.equal(cloneImmediatelyBeforeValidation.overtimeAllowedWindowsJson, "");
  assert.equal(result.code, "CREATE_WORK_POLICY_OK");
  const created = h.repository.getState().policies.find(item =>
    item.policyId !== "POL-STAGING-PAYROLL-OSAMA-20260809");
  assert.equal(created.overtimeAllowedWindowsJson, "");
  assert.equal(created.leaveTypesConsumingJson, source.leaveTypesConsumingJson);
  assert.equal(created.leaveTypesExemptJson, source.leaveTypesExemptJson);
  assert.equal(created.unresolvedBehavior, source.unresolvedBehavior);
});
