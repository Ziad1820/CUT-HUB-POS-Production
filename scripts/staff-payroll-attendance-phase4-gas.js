/* global StaffPayrollAttendancePhase4, SpreadsheetApp, LockService, PropertiesService,
  Utilities, console, getCutHubEnvironmentConfig, assertStagingEnvironment, jsonOutput, schedulePhase2Actor,
  schedulePhase2ReadRows, schedulePhase2Headers, schedulePhase2AssertHeaders,
  schedulePhase2AssertNoDuplicateHeaders, schedulePhase2Canonical, schedulePhase2Camel,
  schedulePhase2Sheet, schedulePhase2RecordUndo, schedulePhase2RollbackTransaction,
  attendancePhase3ReadDays, attendancePhase3Save */

var payrollAttendancePhase4Transaction = null;

function payrollAttendancePhase4Now() {
  return Utilities.formatDate(new Date(), StaffPayrollAttendancePhase4.TIME_ZONE,
    "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function payrollAttendancePhase4ReadJsonFields(record, fields) {
  fields.forEach(function (key) {
    if (typeof record[key] === "string") {
      try { record[key] = JSON.parse(record[key]); } catch (_error) { record[key] = []; }
    }
  });
  return record;
}

function payrollAttendancePhase4DateOnly(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, StaffPayrollAttendancePhase4.TIME_ZONE, "yyyy-MM-dd");
  }
  var source = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(source)) return source;
  if (/^\d{4}-\d{2}-\d{2}T/.test(source)) {
    var parsed = new Date(source);
    if (!isNaN(parsed.getTime())) {
      return Utilities.formatDate(parsed, StaffPayrollAttendancePhase4.TIME_ZONE, "yyyy-MM-dd");
    }
  }
  return source;
}

function payrollAttendancePhase4NormalizeDateOnlyFields(record, fields) {
  fields.forEach(function (key) {
    record[key] = payrollAttendancePhase4DateOnly(record[key]);
  });
  return record;
}

function payrollAttendancePhase4ReadPeriods() {
  return schedulePhase2ReadRows("PAYROLL_ATTENDANCE_PERIODS").map(function (item) {
    return payrollAttendancePhase4NormalizeDateOnlyFields(item, ["startDate", "endDate"]);
  });
}

function payrollAttendancePhase4ReadStaff() {
  var sheet = schedulePhase2Sheet("STAFF", true);
  if (sheet.getLastRow() < 2) return [];
  var width = Math.max(11, sheet.getLastColumn());
  var headers = schedulePhase2Headers(sheet);
  schedulePhase2AssertNoDuplicateHeaders("STAFF", headers);
  var branchIndex = headers.indexOf("BRANCH_ID");
  var salaryBasisIndex = headers.indexOf("SALARY_BASIS");
  var currencyIndex = headers.indexOf("CURRENCY");
  var salaryMinorIndex = headers.indexOf("BASE_SALARY_MINOR");
  var staff = sheet.getRange(2, 1, sheet.getLastRow() - 1, width).getValues()
    .map(function (row, index) {
      return {
        staffId: String(row[4] || "").trim(),
        staffName: String(row[0] || "").trim(),
        salary: row[2],
        salaryMinor: salaryMinorIndex >= 0 ? row[salaryMinorIndex] : "",
        salaryBasis: salaryBasisIndex >= 0 ? row[salaryBasisIndex] : "MONTHLY",
        currency: currencyIndex >= 0 ? row[currencyIndex] : "EGP",
        branchId: branchIndex >= 0 ? String(row[branchIndex] || "").trim() : "",
        active: row[7] === "" ? true : String(row[7]).toUpperCase() !== "FALSE",
        sourceRowNumber: index + 2
      };
    }).filter(function (staff) { return !!staff.staffName; });
  var active = staff.filter(function (item) { return item.active !== false; });
  if (active.some(function (item) { return !item.staffId; })) {
    var missingId = new Error("Active payroll staff requires a stable STAFF_ID.");
    missingId.code = "PAYROLL_STAFF_ID_REQUIRED";
    throw missingId;
  }
  var seen = {};
  active.forEach(function (item) {
    seen[item.staffId] = (seen[item.staffId] || 0) + 1;
  });
  if (Object.keys(seen).some(function (id) { return seen[id] > 1; })) {
    var duplicateId = new Error("Active payroll STAFF_ID values must be unique.");
    duplicateId.code = "PAYROLL_STAFF_ID_AMBIGUOUS";
    throw duplicateId;
  }
  return staff.map(function (item) {
    delete item.sourceRowNumber;
    return item;
  });
}

function payrollAttendancePhase4ReadSettlements() {
  return schedulePhase2ReadRows("PAYROLL_ATTENDANCE_SETTLEMENTS").map(function (item) {
    payrollAttendancePhase4NormalizeDateOnlyFields(item, ["periodStart", "periodEnd"]);
    payrollAttendancePhase4ReadJsonFields(item, [
      "sourceAttendanceDayIds", "sourceAttendanceSnapshot",
      "policySnapshot", "salarySnapshot", "warnings", "blockers"
    ]);
    item.locked = item.locked === true || String(item.locked).toUpperCase() === "TRUE";
    item.stale = item.stale === true || String(item.stale).toUpperCase() === "TRUE";
    return item;
  });
}

function payrollAttendancePhase4Unique(rows, key, value, code) {
  var matches = rows.filter(function (item) {
    return String(item[key] || "").trim() === String(value || "").trim();
  });
  if (matches.length > 1) {
    var duplicate = new Error("Duplicate payroll entity identity.");
    duplicate.code = code;
    throw duplicate;
  }
  return matches[0] || null;
}

function payrollAttendancePhase4WithTransaction(details, callback) {
  var properties = PropertiesService.getScriptProperties();
  var markerKey = "PAYROLL_ATTENDANCE_RECOVERY_" + details.requestId;
  var marker = {
    version: StaffPayrollAttendancePhase4.VERSION,
    action: details.action,
    requestId: details.requestId,
    actorId: details.actorId,
    status: "IN_PROGRESS",
    startedAt: payrollAttendancePhase4Now()
  };
  properties.setProperty(markerKey, JSON.stringify(marker));
  schedulePhase2Transaction = { entries: [] };
  payrollAttendancePhase4Transaction = schedulePhase2Transaction;
  try {
    var result = callback();
    properties.deleteProperty(markerKey);
    schedulePhase2Transaction = null;
    payrollAttendancePhase4Transaction = null;
    return result;
  } catch (caught) {
    var failures = schedulePhase2RollbackTransaction();
    schedulePhase2Transaction = null;
    payrollAttendancePhase4Transaction = null;
    if (failures.length) {
      marker.status = "COMPENSATION_FAILED";
      marker.failureCount = failures.length;
      marker.originalErrorCode = caught.code || "";
      properties.setProperty(markerKey, JSON.stringify(marker));
      var recoveryError = new Error("Payroll write failed and compensation was incomplete.");
      recoveryError.code = "PAYROLL_COMPENSATION_FAILED";
      recoveryError.details = { recoverable: true };
      throw recoveryError;
    }
    properties.deleteProperty(markerKey);
    throw caught;
  }
}

function payrollAttendancePhase4CreateRepository() {
  return {
    listPeriods: payrollAttendancePhase4ReadPeriods,
    getPeriod: function (id) {
      return payrollAttendancePhase4Unique(
        payrollAttendancePhase4ReadPeriods(),
        "payrollPeriodId", id, "PAYROLL_PERIOD_ID_AMBIGUOUS");
    },
    savePeriod: function (record) {
      return attendancePhase3Save("PAYROLL_ATTENDANCE_PERIODS",
        StaffPayrollAttendancePhase4.SHEET_SCHEMAS.PAYROLL_ATTENDANCE_PERIODS,
        "PAYROLL_PERIOD_ID", record, false);
    },
    listSettlements: function (filters) {
      filters = filters || {};
      return payrollAttendancePhase4ReadSettlements().filter(function (item) {
        return (!filters.payrollPeriodId || item.payrollPeriodId === filters.payrollPeriodId) &&
          (!filters.staffId || item.staffId === filters.staffId) &&
          (!filters.status || String(item.status).toUpperCase() ===
            String(filters.status).toUpperCase());
      });
    },
    getSettlement: function (id) {
      return payrollAttendancePhase4Unique(payrollAttendancePhase4ReadSettlements(),
        "settlementId", id, "PAYROLL_SETTLEMENT_ID_AMBIGUOUS");
    },
    saveSettlement: function (record) {
      return attendancePhase3Save("PAYROLL_ATTENDANCE_SETTLEMENTS",
        StaffPayrollAttendancePhase4.SHEET_SCHEMAS.PAYROLL_ATTENDANCE_SETTLEMENTS,
        "SETTLEMENT_ID", record, false);
    },
    listAdjustments: function (filters) {
      filters = filters || {};
      return schedulePhase2ReadRows("PAYROLL_ATTENDANCE_ADJUSTMENTS").filter(function (item) {
        return (!filters.settlementId || item.settlementId === filters.settlementId) &&
          (!filters.payrollPeriodId || item.payrollPeriodId === filters.payrollPeriodId) &&
          (!filters.status || String(item.status).toUpperCase() ===
            String(filters.status).toUpperCase());
      });
    },
    getAdjustment: function (id) {
      return payrollAttendancePhase4Unique(
        schedulePhase2ReadRows("PAYROLL_ATTENDANCE_ADJUSTMENTS"),
        "adjustmentId", id, "PAYROLL_ADJUSTMENT_ID_AMBIGUOUS");
    },
    appendAdjustment: function (record) {
      return attendancePhase3Save("PAYROLL_ATTENDANCE_ADJUSTMENTS",
        StaffPayrollAttendancePhase4.SHEET_SCHEMAS.PAYROLL_ATTENDANCE_ADJUSTMENTS,
        "ADJUSTMENT_ID", record, true);
    },
    listAttendanceDays: function (filters) {
      filters = filters || {};
      return attendancePhase3ReadDays().filter(function (item) {
        return (!filters.staffId || item.staffId === filters.staffId) &&
          (!filters.dateFrom || item.attendanceDate >= filters.dateFrom) &&
          (!filters.dateTo || item.attendanceDate <= filters.dateTo);
      });
    },
    listStaff: payrollAttendancePhase4ReadStaff,
    getStaff: function (id) {
      return payrollAttendancePhase4Unique(payrollAttendancePhase4ReadStaff(),
        "staffId", id, "PAYROLL_STAFF_ID_AMBIGUOUS");
    },
    listPolicies: function () { return schedulePhase2ReadRows("STAFF_WORK_POLICIES"); },
    appendAudit: function (record) {
      return attendancePhase3Save("PAYROLL_ATTENDANCE_AUDIT",
        StaffPayrollAttendancePhase4.SHEET_SCHEMAS.PAYROLL_ATTENDANCE_AUDIT,
        "ACTION_ID", record, true);
    },
    listAudit: function (filters) {
      filters = filters || {};
      return schedulePhase2ReadRows("PAYROLL_ATTENDANCE_AUDIT").filter(function (item) {
        return (!filters.entityId || item.entityId === filters.entityId) &&
          (!filters.staffId || item.staffId === filters.staffId);
      });
    },
    getIdempotency: function (id) {
      var item = payrollAttendancePhase4Unique(
        schedulePhase2ReadRows("PAYROLL_ATTENDANCE_IDEMPOTENCY"),
        "requestId", id, "PAYROLL_IDEMPOTENCY_AMBIGUOUS");
      if (item) {
        item.requestFingerprint = item.requestFingerprint || item.fingerprint;
        item.responseJson = typeof item.response === "object"
          ? JSON.stringify(item.response) : (item.responseJson || item.response || "");
      }
      return item;
    },
    saveIdempotency: function (record) {
      return attendancePhase3Save("PAYROLL_ATTENDANCE_IDEMPOTENCY",
        StaffPayrollAttendancePhase4.SHEET_SCHEMAS.PAYROLL_ATTENDANCE_IDEMPOTENCY,
        "REQUEST_ID", record, false);
    },
    withTransaction: payrollAttendancePhase4WithTransaction
  };
}

function payrollAttendancePhase4WithLock(_details, callback) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    var lockError = new Error("Another payroll attendance mutation is in progress.");
    lockError.code = "PAYROLL_WRITE_LOCK_TIMEOUT";
    throw lockError;
  }
  try { return callback(); } finally { lock.releaseLock(); }
}

function payrollAttendancePhase4Environment() {
  var config = getCutHubEnvironmentConfig();
  var spreadsheet = SpreadsheetApp.getActive();
  if (!config.environment ||
      ["development", "test", "staging", "production"].indexOf(config.environment) === -1) {
    var environmentError = new Error("Payroll environment identity is invalid.");
    environmentError.code = "PAYROLL_ENVIRONMENT_IDENTITY_INVALID";
    throw environmentError;
  }
  if (!config.spreadsheetId || !spreadsheet || spreadsheet.getId() !== config.spreadsheetId) {
    var spreadsheetError = new Error("Payroll spreadsheet identity does not match configuration.");
    spreadsheetError.code = "PAYROLL_SPREADSHEET_IDENTITY_MISMATCH";
    throw spreadsheetError;
  }
  return { config: config, spreadsheet: spreadsheet };
}

function payrollAttendancePhase4AssertSchema() {
  [
    "ATTENDANCE", "STAFF_WORK_POLICIES", "PAYROLL_ATTENDANCE_PERIODS",
    "PAYROLL_ATTENDANCE_SETTLEMENTS", "PAYROLL_ATTENDANCE_ADJUSTMENTS",
    "PAYROLL_ATTENDANCE_AUDIT", "PAYROLL_ATTENDANCE_IDEMPOTENCY"
  ].forEach(function (name) {
    schedulePhase2AssertHeaders(name, StaffPayrollAttendancePhase4.SHEET_SCHEMAS[name]);
  });
}

function payrollAttendancePhase4AssertPreviewEnvironment() {
  var config = getCutHubEnvironmentConfig();
  var environment = String(config.environment || "").toLowerCase();
  if (environment === "production") {
    var blocked = new Error("Phase 4 migration preview cannot access production.");
    blocked.code = "PHASE4_ENVIRONMENT_BLOCKED";
    throw blocked;
  }
  if (["development", "test", "staging"].indexOf(environment) === -1) {
    var invalid = new Error("Phase 4 migration preview requires a recognized environment identity.");
    invalid.code = "PAYROLL_ENVIRONMENT_IDENTITY_INVALID";
    throw invalid;
  }
  if (environment === "staging") {
    return assertStagingEnvironment().config;
  }
  return config;
}

function previewPayrollPhase4Migration(data) {
  var config = payrollAttendancePhase4AssertPreviewEnvironment();
  var identity = payrollAttendancePhase4Environment();
  var existing = {};
  Object.keys(StaffPayrollAttendancePhase4.SHEET_SCHEMAS).forEach(function (name) {
    var sheet = identity.spreadsheet.getSheetByName(name);
    existing[name] = sheet ? schedulePhase2Headers(sheet) : null;
  });
  return StaffPayrollAttendancePhase4.planMigration(existing, {
    environment: identity.config.environment,
    expectedSpreadsheetId: identity.config.spreadsheetId,
    actualSpreadsheetId: identity.spreadsheet.getId(),
    environmentReviewApproved: config.environment === "staging"
  });
}

function diagnosticPreviewPayrollPhase4Migration(data) {
  var config = getCutHubEnvironmentConfig();
  var environment = String(config.environment || "").toLowerCase();
  if (["development", "staging"].indexOf(environment) === -1) {
    var blocked = new Error("Payroll migration diagnostic preview is limited to development and staging.");
    blocked.code = "PAYROLL_DIAGNOSTIC_PREVIEW_ENVIRONMENT_BLOCKED";
    throw blocked;
  }
  if (environment === "staging") assertStagingEnvironment();
  var result = previewPayrollPhase4Migration(data);
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function payrollAttendancePhase4RunDiagnosticPreview(data) {
  var config = getCutHubEnvironmentConfig();
  var environment = String(config.environment || "").toLowerCase();
  if (["development", "staging"].indexOf(environment) === -1) {
    var blocked = new Error("Payroll migration diagnostic preview is limited to development and staging.");
    blocked.code = "PAYROLL_DIAGNOSTIC_PREVIEW_ENVIRONMENT_BLOCKED";
    throw blocked;
  }
  if (environment === "staging") assertStagingEnvironment();
  return previewPayrollPhase4Migration(data);
}

function diagnosticPreviewPayrollPhase4MigrationSummary(data) {
  var result = payrollAttendancePhase4RunDiagnosticPreview(data);
  console.log(JSON.stringify({
    schemaVersion: result.schemaVersion,
    version: result.version || StaffPayrollAttendancePhase4.VERSION,
    dryRun: result.dryRun,
    writes: result.writes,
    executionAllowed: result.executionAllowed,
    identity: result.identity,
    createSheetNames: (result.createSheets || []).map(function (item) { return item.sheetName; }),
    initializeBlankSheetNames: (result.initializeBlankSheets || []).map(function (item) {
      return item.sheetName;
    }),
    appendColumnSheetNames: Object.keys(result.appendColumns || {}),
    unchangedSheetNames: result.unchangedSheets || [],
    errorCodes: (result.errors || []).map(function (item) { return item.code; }),
    safe: result.safe
  }));
  return result;
}

function diagnosticPreviewPayrollPhase4MigrationSafety(data) {
  var result = payrollAttendancePhase4RunDiagnosticPreview(data);
  console.log(JSON.stringify({
    errors: result.errors || [],
    rollback: result.rollback || {},
    safe: result.safe,
    dryRun: result.dryRun,
    writes: result.writes,
    executionAllowed: result.executionAllowed,
    historicalRowsTouched: result.rollback && result.rollback.historicalRowsTouched
  }));
  return result;
}

function diagnosticPreviewPayrollPhase4MigrationSheets(data) {
  var result = payrollAttendancePhase4RunDiagnosticPreview(data);
  (result.createSheets || []).forEach(function (item) {
    console.log(JSON.stringify({
      sheetName: item.sheetName,
      headerCount: (item.headers || []).length,
      headers: item.headers || []
    }));
  });
  return result;
}

function diagnosticPreviewPayrollPhase4MigrationColumns(data) {
  var result = payrollAttendancePhase4RunDiagnosticPreview(data);
  console.log(JSON.stringify({
    appendColumns: result.appendColumns || {},
    preservedUnknownColumns: result.preservedUnknownColumns || {}
  }));
  return result;
}

function handleStaffPayrollAttendancePhase4Action(data) {
  try {
    if (!StaffPayrollAttendancePhase4 ||
        StaffPayrollAttendancePhase4.ACTIONS.indexOf(data.action) === -1) {
      throw StaffPayrollAttendancePhase4.error(
        "PAYROLL_ACTION_UNKNOWN", "Payroll attendance action is unsupported.");
    }
    if (data.action === "previewPayrollPhase4Migration") {
      payrollAttendancePhase4AssertPreviewEnvironment();
      var previewActor = schedulePhase2Actor(data);
      if (!previewActor || !previewActor.owner) {
        throw StaffPayrollAttendancePhase4.error(
          "PAYROLL_OWNER_REQUIRED", "Only owner can preview Phase 4 migration.");
      }
      return jsonOutput({
        status: "success", code: "PAYROLL_MIGRATION_PREVIEW_OK",
        migration: StaffPayrollAttendancePhase4.filterSecrets(
          previewPayrollPhase4Migration(data), true)
      });
    }
    payrollAttendancePhase4Environment();
    if (StaffPayrollAttendancePhase4.WRITE_ACTIONS.has(data.action)) {
      payrollAttendancePhase4AssertSchema();
    }
    var service = StaffPayrollAttendancePhase4.createService({
      repository: payrollAttendancePhase4CreateRepository(),
      actorResolver: schedulePhase2Actor,
      withLock: payrollAttendancePhase4WithLock,
      now: payrollAttendancePhase4Now,
      uuid: function () { return Utilities.getUuid(); }
    });
    return jsonOutput(service.execute(data.action, data));
  } catch (caught) {
    return jsonOutput({
      status: "error", code: caught.code || "PAYROLL_INTERNAL_ERROR",
      message: caught.message || "Payroll attendance request failed.",
      details: StaffPayrollAttendancePhase4.filterSecrets(caught.details || {}, false)
    });
  }
}
