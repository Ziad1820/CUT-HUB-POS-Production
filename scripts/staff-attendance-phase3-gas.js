/* global StaffAttendancePhase3, StaffSchedulingPhase2, SpreadsheetApp, LockService,
  PropertiesService, Utilities, console, getCutHubEnvironmentConfig, assertStagingEnvironment, getAuthenticatedUser,
  normalizeManagedPermissions, jsonOutput, schedulePhase2Actor, schedulePhase2ReadRows,
  schedulePhase2ReadStaff, schedulePhase2ReadSchedules, schedulePhase2Headers,
  schedulePhase2AssertHeaders, schedulePhase2AssertNoDuplicateHeaders,
  schedulePhase2Canonical, schedulePhase2Camel, schedulePhase2Sheet,
  schedulePhase2RecordUndo, schedulePhase2RollbackTransaction */

var attendancePhase3Transaction = null;

function attendancePhase3IsoNow() {
  return Utilities.formatDate(new Date(), StaffAttendancePhase3.TIME_ZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function attendancePhase3CellValue(header, record) {
  var key = schedulePhase2Camel(header);
  var value = record[key];
  if (/_JSON$/.test(header)) {
    if (value === undefined) value = record[key.replace(/Json$/, "")];
    return typeof value === "string" ? value : JSON.stringify(value === undefined ? null : value);
  }
  if (Array.isArray(value) || (value && typeof value === "object")) return JSON.stringify(value);
  return value === undefined || value === null ? "" : value;
}

function attendancePhase3Save(name, schema, idHeader, record, appendOnly) {
  var ready = schedulePhase2AssertHeaders(name, schema);
  var idKey = schedulePhase2Camel(idHeader);
  var entityId = String(record[idKey] || "").trim();
  if (!entityId) {
    var idError = new Error("Stable entity ID is required.");
    idError.code = "ATTENDANCE_ENTITY_ID_REQUIRED";
    throw idError;
  }
  var matches = schedulePhase2ReadRows(name).filter(function (item) {
    return String(item[idKey] || "").trim() === entityId;
  });
  if (matches.length > 1) {
    var duplicateError = new Error("Duplicate entity IDs exist in " + name);
    duplicateError.code = "ATTENDANCE_ENTITY_ID_AMBIGUOUS";
    throw duplicateError;
  }
  if (appendOnly && matches.length) {
    var collisionError = new Error("Append-only entity ID collision in " + name);
    collisionError.code = "ATTENDANCE_APPEND_ID_COLLISION";
    throw collisionError;
  }
  var existing = matches[0];
  var original = existing
    ? ready.sheet.getRange(existing._rowNumber, 1, 1, ready.headers.length).getValues()[0] : [];
  var schemaSet = {};
  schema.map(schedulePhase2Canonical).forEach(function (header) { schemaSet[header] = true; });
  var values = ready.headers.map(function (header, index) {
    return schemaSet[header] ? attendancePhase3CellValue(header, record)
      : (existing ? original[index] : "");
  });
  if (existing) {
    schedulePhase2RecordUndo({
      type: "UPDATE", sheetName: name, rowNumber: existing._rowNumber, values: original
    });
    ready.sheet.getRange(existing._rowNumber, 1, 1, values.length).setValues([values]);
  } else {
    var rowNumber = ready.sheet.getLastRow() + 1;
    schedulePhase2RecordUndo({
      type: "APPEND", sheetName: name, rowNumber: rowNumber,
      idHeader: schedulePhase2Canonical(idHeader), id: entityId
    });
    ready.sheet.appendRow(values);
  }
  return record;
}

function attendancePhase3WithTransaction(details, callback) {
  var properties = PropertiesService.getScriptProperties();
  var markerKey = "ATTENDANCE_RECOVERY_" + details.requestId;
  var marker = {
    version: StaffAttendancePhase3.PHASE3_VERSION, action: details.action,
    requestId: details.requestId, actorId: details.actorId,
    status: "IN_PROGRESS", startedAt: attendancePhase3IsoNow()
  };
  properties.setProperty(markerKey, JSON.stringify(marker));
  schedulePhase2Transaction = { entries: [] };
  attendancePhase3Transaction = schedulePhase2Transaction;
  try {
    var result = callback();
    properties.deleteProperty(markerKey);
    schedulePhase2Transaction = null;
    attendancePhase3Transaction = null;
    return result;
  } catch (error) {
    var failures = schedulePhase2RollbackTransaction();
    schedulePhase2Transaction = null;
    attendancePhase3Transaction = null;
    if (failures.length) {
      marker.status = "COMPENSATION_FAILED";
      marker.failures = failures;
      marker.originalError = { code: error.code || "", message: error.message || "" };
      properties.setProperty(markerKey, JSON.stringify(marker));
      var recoveryError = new Error("Attendance write failed and compensation was incomplete.");
      recoveryError.code = "ATTENDANCE_COMPENSATION_FAILED";
      recoveryError.details = { recoveryMarker: markerKey, failures: failures };
      throw recoveryError;
    }
    properties.deleteProperty(markerKey);
    throw error;
  }
}

function attendancePhase3DateOnly(value, timezone) {
  var resolvedTimezone = String(timezone || StaffAttendancePhase3.TIME_ZONE || "Africa/Cairo");
  if (Object.prototype.toString.call(value) === "[object Date]" &&
      !isNaN(value.getTime())) {
    return Utilities.formatDate(value, resolvedTimezone, "yyyy-MM-dd");
  }
  var text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    var instant = new Date(text);
    if (!isNaN(instant.getTime())) {
      return Utilities.formatDate(instant, resolvedTimezone, "yyyy-MM-dd");
    }
  }
  return text;
}

function attendancePhase3TimeOnly(value, timezone) {
  var resolvedTimezone = String(timezone || StaffAttendancePhase3.TIME_ZONE || "Africa/Cairo");
  if (Object.prototype.toString.call(value) === "[object Date]" &&
      !isNaN(value.getTime())) {
    return Utilities.formatDate(value, resolvedTimezone, "HH:mm");
  }
  var text = String(value || "").trim();
  if (/^\d{2}:\d{2}$/.test(text)) return text;
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    var instant = new Date(text);
    if (!isNaN(instant.getTime())) {
      return Utilities.formatDate(instant, resolvedTimezone, "HH:mm");
    }
  }
  return text;
}

function attendancePhase3ReadDays() {
  var rows = schedulePhase2ReadRows("ATTENDANCE");
  return rows.filter(function (item) { return !!String(item.attendanceDayId || "").trim(); })
    .map(function (item) {
      item.attendanceDate = attendancePhase3DateOnly(item.attendanceDate, item.timezone);
      item.scheduledStart = attendancePhase3TimeOnly(item.scheduledStart, item.timezone);
      item.scheduledEnd = attendancePhase3TimeOnly(item.scheduledEnd, item.timezone);
      item.staffId = schedulePhase2Text(item.staffId);
      [
        "scheduleSourceIds", "shiftSegments", "calculationWarnings",
        "policySnapshot", "scheduleSnapshot", "sourceEventIds", "sessions", "breaks"
      ].forEach(function (key) {
        if (typeof item[key] === "string") {
          try { item[key] = JSON.parse(item[key]); } catch (_error) { item[key] = []; }
        }
      });
      item.locked = item.locked === true || String(item.locked).toUpperCase() === "TRUE";
      item.openSession = item.openSession === true || String(item.openSession).toUpperCase() === "TRUE";
      item.openBreak = item.openBreak === true || String(item.openBreak).toUpperCase() === "TRUE";
      item.staleCalculation = item.staleCalculation === true ||
        String(item.staleCalculation).toUpperCase() === "TRUE";
      return item;
    });
}

function attendancePhase3ReadLegacy() {
  var sheet = schedulePhase2Sheet("ATTENDANCE", false);
  if (!sheet || sheet.getLastRow() < 2) return [];
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  return StaffAttendancePhase3.normalizeLegacyAttendanceRows(headers, rows)
    .filter(function (item) {
      return !String(item.attendanceDayId || "").trim();
    });
}

function attendancePhase3Unique(rows, key, value, code) {
  var matches = rows.filter(function (item) {
    return String(item[key] || "").trim() === String(value || "").trim();
  });
  if (matches.length > 1) {
    var error = new Error("Duplicate attendance entity mapping.");
    error.code = code;
    throw error;
  }
  return matches[0] || null;
}

function attendancePhase3CreateRepository() {
  return {
    listStaff: schedulePhase2ReadStaff,
    getStaff: function (staffId) {
      return attendancePhase3Unique(schedulePhase2ReadStaff(), "staffId", staffId,
        "ATTENDANCE_STAFF_ID_AMBIGUOUS");
    },
    listDays: function (filters) {
      filters = filters || {};
      return attendancePhase3ReadDays().filter(function (item) {
        return (!filters.staffId || item.staffId === filters.staffId) &&
          (!filters.date || item.attendanceDate === filters.date) &&
          (!filters.dateFrom || item.attendanceDate >= filters.dateFrom) &&
          (!filters.dateTo || item.attendanceDate <= filters.dateTo);
      });
    },
    getDay: function (dayId) {
      return attendancePhase3Unique(attendancePhase3ReadDays(), "attendanceDayId", dayId,
        "ATTENDANCE_DAY_ID_AMBIGUOUS");
    },
    saveDay: function (record) {
      var existing = attendancePhase3ReadDays().filter(function (item) {
        return item.attendanceDayId === record.attendanceDayId;
      });
      if (existing.length > 1) {
        var ambiguous = new Error("Attendance day ID is ambiguous.");
        ambiguous.code = "ATTENDANCE_DAY_ID_AMBIGUOUS";
        throw ambiguous;
      }
      if (existing[0] && !existing[0].attendanceDayId) {
        var legacy = new Error("Legacy attendance rows are immutable.");
        legacy.code = "ATTENDANCE_LEGACY_READ_ONLY";
        throw legacy;
      }
      return attendancePhase3Save("ATTENDANCE",
        StaffAttendancePhase3.SHEET_SCHEMAS.ATTENDANCE, "ATTENDANCE_DAY_ID", record, false);
    },
    listEvents: function (filters) {
      filters = filters || {};
      return schedulePhase2ReadRows("ATTENDANCE_EVENTS").filter(function (item) {
        return (!filters.attendanceDayId || item.attendanceDayId === filters.attendanceDayId) &&
          (!filters.staffId || item.staffId === filters.staffId);
      });
    },
    getEvent: function (eventId) {
      return attendancePhase3Unique(schedulePhase2ReadRows("ATTENDANCE_EVENTS"),
        "eventId", eventId, "ATTENDANCE_EVENT_ID_AMBIGUOUS");
    },
    appendEvent: function (record) {
      return attendancePhase3Save("ATTENDANCE_EVENTS",
        StaffAttendancePhase3.SHEET_SCHEMAS.ATTENDANCE_EVENTS, "EVENT_ID", record, true);
    },
    listAdjustments: function (filters) {
      filters = filters || {};
      return schedulePhase2ReadRows("ATTENDANCE_ADJUSTMENTS").filter(function (item) {
        return (!filters.attendanceDayId || item.attendanceDayId === filters.attendanceDayId) &&
          (!filters.status || String(item.status).toUpperCase() === String(filters.status).toUpperCase());
      });
    },
    getAdjustment: function (adjustmentId) {
      return attendancePhase3Unique(schedulePhase2ReadRows("ATTENDANCE_ADJUSTMENTS"),
        "adjustmentId", adjustmentId, "ATTENDANCE_ADJUSTMENT_ID_AMBIGUOUS");
    },
    saveAdjustment: function (record) {
      return attendancePhase3Save("ATTENDANCE_ADJUSTMENTS",
        StaffAttendancePhase3.SHEET_SCHEMAS.ATTENDANCE_ADJUSTMENTS,
        "ADJUSTMENT_ID", record, false);
    },
    listOvertime: function (filters) {
      filters = filters || {};
      return schedulePhase2ReadRows("ATTENDANCE_OVERTIME_APPROVALS").filter(function (item) {
        return !filters.attendanceDayId || item.attendanceDayId === filters.attendanceDayId;
      });
    },
    getOvertime: function (approvalId) {
      return attendancePhase3Unique(schedulePhase2ReadRows("ATTENDANCE_OVERTIME_APPROVALS"),
        "overtimeApprovalId", approvalId, "ATTENDANCE_OVERTIME_ID_AMBIGUOUS");
    },
    appendOvertime: function (record) {
      return attendancePhase3Save("ATTENDANCE_OVERTIME_APPROVALS",
        StaffAttendancePhase3.SHEET_SCHEMAS.ATTENDANCE_OVERTIME_APPROVALS,
        "OVERTIME_APPROVAL_ID", record, true);
    },
    listPolicies: function () { return schedulePhase2ReadRows("STAFF_WORK_POLICIES"); },
    getPolicy: function (policyId) {
      return attendancePhase3Unique(schedulePhase2ReadRows("STAFF_WORK_POLICIES"),
        "policyId", policyId, "WORK_POLICY_ID_AMBIGUOUS");
    },
    savePolicy: function (record) {
      return attendancePhase3Save("STAFF_WORK_POLICIES",
        StaffAttendancePhase3.SHEET_SCHEMAS.STAFF_WORK_POLICIES,
        "POLICY_ID", record, false);
    },
    listLegacy: attendancePhase3ReadLegacy,
    appendAudit: function (record) {
      return attendancePhase3Save("STAFF_ATTENDANCE_AUDIT",
        StaffAttendancePhase3.SHEET_SCHEMAS.STAFF_ATTENDANCE_AUDIT,
        "ACTION_ID", record, true);
    },
    listAudit: function (filters) {
      filters = filters || {};
      return schedulePhase2ReadRows("STAFF_ATTENDANCE_AUDIT").filter(function (item) {
        return (!filters.entityId || item.entityId === filters.entityId) &&
          (!filters.staffId || item.staffId === filters.staffId);
      });
    },
    getIdempotency: function (requestId) {
      var row = attendancePhase3Unique(schedulePhase2ReadRows("STAFF_ATTENDANCE_IDEMPOTENCY"),
        "requestId", requestId, "ATTENDANCE_IDEMPOTENCY_AMBIGUOUS");
      if (row) {
        row.requestFingerprint = row.requestFingerprint || row.fingerprint;
        row.responseJson = typeof row.response === "object"
          ? JSON.stringify(row.response) : (row.responseJson || row.response || "");
      }
      return row;
    },
    saveIdempotency: function (record) {
      return attendancePhase3Save("STAFF_ATTENDANCE_IDEMPOTENCY",
        StaffAttendancePhase3.SHEET_SCHEMAS.STAFF_ATTENDANCE_IDEMPOTENCY,
        "REQUEST_ID", record, false);
    },
    withTransaction: attendancePhase3WithTransaction
  };
}

function attendancePhase3ResolveSchedule(staff, date) {
  var policies = schedulePhase2ReadRows("STAFF_WORK_POLICIES");
  var policyResolution;
  try {
    policyResolution = StaffAttendanceCore.resolveEffectivePolicy(policies, staff.staffId, date);
  } catch (error) {
    if (error.code !== "POLICY_NOT_FOUND") throw error;
    policyResolution = { source: "SAFE_DEFAULT", policyId: "PHASE3_SAFE_DEFAULT",
      snapshot: { requiredDailyMinutes: 0, allowedBreakMinutes: 0 } };
  }
  return StaffSchedulingPhase2.resolveSchedule({
    staff: staff, date: date, schedules: schedulePhase2ReadSchedules(),
    overrides: schedulePhase2ReadRows("STAFF_SCHEDULE_OVERRIDES"),
    policyResolution: policyResolution
  });
}

function attendancePhase3WithLock(_details, callback) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    var error = new Error("Another attendance mutation is in progress.");
    error.code = "ATTENDANCE_WRITE_LOCK_TIMEOUT";
    throw error;
  }
  try { return callback(); } finally { lock.releaseLock(); }
}

function attendancePhase3AssertEnvironmentIdentity() {
  var config = getCutHubEnvironmentConfig();
  var spreadsheet = SpreadsheetApp.getActive();
  if (!config.environment ||
      ["development", "test", "staging", "production"].indexOf(config.environment) === -1) {
    var environmentError = new Error("Attendance environment identity is invalid.");
    environmentError.code = "ATTENDANCE_ENVIRONMENT_IDENTITY_INVALID";
    throw environmentError;
  }
  if (!config.spreadsheetId || !spreadsheet || spreadsheet.getId() !== config.spreadsheetId) {
    var spreadsheetError = new Error("Attendance spreadsheet identity does not match configuration.");
    spreadsheetError.code = "ATTENDANCE_SPREADSHEET_IDENTITY_MISMATCH";
    throw spreadsheetError;
  }
  return { config: config, spreadsheet: spreadsheet };
}

function attendancePhase3AssertWriteReady() {
  [
    "ATTENDANCE", "ATTENDANCE_EVENTS", "ATTENDANCE_ADJUSTMENTS",
    "ATTENDANCE_OVERTIME_APPROVALS", "STAFF_WORK_POLICIES",
    "STAFF_ATTENDANCE_AUDIT", "STAFF_ATTENDANCE_IDEMPOTENCY"
  ].forEach(function (name) {
    schedulePhase2AssertHeaders(name, StaffAttendancePhase3.SHEET_SCHEMAS[name]);
  });
}

function attendancePhase3AssertPreviewEnvironment() {
  var config = getCutHubEnvironmentConfig();
  var environment = String(config.environment || "").toLowerCase();
  if (environment === "production") {
    var blocked = new Error("Phase 3 migration preview cannot access production.");
    blocked.code = "PHASE3_ENVIRONMENT_BLOCKED";
    throw blocked;
  }
  if (["development", "test", "staging"].indexOf(environment) === -1) {
    var invalid = new Error("Phase 3 migration preview requires a recognized environment identity.");
    invalid.code = "ATTENDANCE_ENVIRONMENT_IDENTITY_INVALID";
    throw invalid;
  }
  if (environment === "staging") {
    return assertStagingEnvironment().config;
  }
  return config;
}

function previewAttendanceMigration(data) {
  data = data && typeof data === "object" ? data : {};
  var config = attendancePhase3AssertPreviewEnvironment();
  var identity = attendancePhase3AssertEnvironmentIdentity();
  var existing = {};
  Object.keys(StaffAttendancePhase3.SHEET_SCHEMAS).forEach(function (name) {
    var sheet = identity.spreadsheet.getSheetByName(name);
    existing[name] = sheet ? schedulePhase2Headers(sheet) : null;
  });
  return StaffAttendancePhase3.planAttendanceMigration(existing, {
    environment: identity.config.environment,
    expectedSpreadsheetId: identity.config.spreadsheetId,
    actualSpreadsheetId: identity.spreadsheet.getId(),
    environmentReviewApproved: config.environment === "staging"
  });
}

function diagnosticPreviewAttendanceMigration(data) {
  var config = getCutHubEnvironmentConfig();
  var environment = String(config.environment || "").toLowerCase();
  if (["development", "staging"].indexOf(environment) === -1) {
    var blocked = new Error("Attendance migration diagnostic preview is limited to development and staging.");
    blocked.code = "ATTENDANCE_DIAGNOSTIC_PREVIEW_ENVIRONMENT_BLOCKED";
    throw blocked;
  }
  if (environment === "staging") assertStagingEnvironment();
  var result = previewAttendanceMigration(data);
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function attendancePhase3RunDiagnosticPreview(data) {
  var config = getCutHubEnvironmentConfig();
  var environment = String(config.environment || "").toLowerCase();
  if (["development", "staging"].indexOf(environment) === -1) {
    var blocked = new Error("Attendance migration diagnostic preview is limited to development and staging.");
    blocked.code = "ATTENDANCE_DIAGNOSTIC_PREVIEW_ENVIRONMENT_BLOCKED";
    throw blocked;
  }
  if (environment === "staging") assertStagingEnvironment();
  return previewAttendanceMigration(data);
}

function diagnosticPreviewAttendanceMigrationSummary(data) {
  var result = attendancePhase3RunDiagnosticPreview(data);
  console.log(JSON.stringify({
    schemaVersion: result.schemaVersion,
    dryRun: result.dryRun,
    writes: result.writes,
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

function diagnosticPreviewAttendanceMigrationSheets(data) {
  var result = attendancePhase3RunDiagnosticPreview(data);
  (result.createSheets || []).forEach(function (item) {
    console.log(JSON.stringify({
      sheetName: item.sheetName,
      headerCount: (item.headers || []).length,
      headers: item.headers || []
    }));
  });
  return result;
}

function diagnosticPreviewAttendanceMigrationColumns(data) {
  var result = attendancePhase3RunDiagnosticPreview(data);
  console.log(JSON.stringify({
    appendColumns: result.appendColumns || {},
    preservedUnknownColumns: result.preservedUnknownColumns || {}
  }));
  return result;
}

function diagnosticPreviewAttendanceMigrationSafety(data) {
  var result = attendancePhase3RunDiagnosticPreview(data);
  console.log(JSON.stringify({
    errors: result.errors || [],
    rollback: result.rollback || {},
    safe: result.safe,
    dryRun: result.dryRun,
    writes: result.writes,
    historicalRowsTouched: result.rollback && result.rollback.historicalRowsTouched
  }));
  return result;
}

function handleStaffAttendancePhase3Action(data) {
  try {
    if (!StaffAttendancePhase3 ||
        StaffAttendancePhase3.ACTIONS.indexOf(data.action) === -1) {
      throw StaffAttendancePhase3.attendanceError(
        "ATTENDANCE_ACTION_UNKNOWN", "Attendance action is not supported.");
    }
    if (data.action === "previewAttendanceMigration") {
      attendancePhase3AssertPreviewEnvironment();
      var previewActor = schedulePhase2Actor(data);
      if (!previewActor || !previewActor.owner) {
        throw StaffAttendancePhase3.attendanceError(
          "ATTENDANCE_OWNER_REQUIRED", "Only owner can preview attendance migration.");
      }
      return jsonOutput({
        status: "success", code: "ATTENDANCE_MIGRATION_PREVIEW_OK",
        migration: StaffAttendancePhase3.filterSensitiveFields(previewAttendanceMigration(data))
      });
    }
    attendancePhase3AssertEnvironmentIdentity();
    if (StaffAttendancePhase3.WRITE_ACTIONS.has(data.action)) attendancePhase3AssertWriteReady();
    var service = StaffAttendancePhase3.createService({
      repository: attendancePhase3CreateRepository(),
      actorResolver: schedulePhase2Actor,
      scheduleResolver: attendancePhase3ResolveSchedule,
      withLock: function (details, callback) {
        return attendancePhase3WithLock(details, function () {
          if (typeof publishOperationalMutationTransactionUnderCurrentLock === "function") {
            return publishOperationalMutationTransactionUnderCurrentLock(
              "attendance", data, callback);
          }
          var mutationResult = callback();
          if (typeof publishOperationalMutationUnderCurrentLock === "function") {
            publishOperationalMutationUnderCurrentLock("attendance", data, mutationResult);
          }
          return mutationResult;
        });
      },
      now: attendancePhase3IsoNow,
      uuid: function () { return Utilities.getUuid(); }
    });
    var result = service.execute(data.action, data);
    return jsonOutput(result);
  } catch (error) {
    return jsonOutput({
      status: "error", code: error.code || "ATTENDANCE_INTERNAL_ERROR",
      message: error.message || "Attendance request failed.",
      details: StaffAttendancePhase3.filterSensitiveFields(error.details || undefined)
    });
  }
}
