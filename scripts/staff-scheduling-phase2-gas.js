/* global StaffSchedulingPhase2, SpreadsheetApp, LockService, Utilities,
  getAuthenticatedUser, normalizeManagedPermissions, getCutHubEnvironmentConfig,
  readUsersFromSheet, jsonOutput */

/**
 * Google Apps Script adapter for Staff Scheduling Phase 2.
 *
 * This file never creates a sheet, writes headers, or runs a migration. All
 * mutations fail closed until the reviewed Phase 2 schema exists.
 */

function schedulePhase2Text(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function schedulePhase2Canonical(value) {
  return schedulePhase2Text(value).toUpperCase().replace(/[\s-]+/g, "_").replace(/_+/g, "_");
}

function schedulePhase2Camel(header) {
  return schedulePhase2Canonical(header).toLowerCase().replace(/_([a-z])/g, function (_match, letter) {
    return letter.toUpperCase();
  });
}

function schedulePhase2Sheet(name, required) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sheet && required) {
    var error = new Error("Required Phase 2 sheet is missing: " + name);
    error.code = "SCHEDULE_SCHEMA_NOT_READY";
    throw error;
  }
  return sheet;
}

function schedulePhase2Headers(sheet) {
  if (!sheet || sheet.getLastColumn() < 1) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(schedulePhase2Canonical);
}

function schedulePhase2AssertNoDuplicateHeaders(name, headers) {
  var duplicates = headers.filter(function (header, index) {
    return header && headers.indexOf(header) !== index;
  });
  if (duplicates.length) {
    var error = new Error("Duplicate normalized headers in " + name);
    error.code = "SCHEDULE_SCHEMA_DUPLICATE_HEADERS";
    error.details = { sheetName: name, headers: Array.from(new Set(duplicates)) };
    throw error;
  }
}

function schedulePhase2AssertHeaders(name, expected) {
  var sheet = schedulePhase2Sheet(name, true);
  var headers = schedulePhase2Headers(sheet);
  schedulePhase2AssertNoDuplicateHeaders(name, headers);
  if (name === "BARBER_SCHEDULE") {
    var legacyPrefix = [
      "SCHEDULE_ID", "STAFF_ID", "STAFF_NAME", "WEEKDAY",
      "SHIFT_START", "SHIFT_END", "ACTIVE", "UPDATED_AT"
    ];
    var displaced = legacyPrefix.some(function (header, index) {
      return headers[index] !== header;
    });
    if (displaced) {
      var prefixError = new Error("Protected legacy BARBER_SCHEDULE columns were displaced.");
      prefixError.code = "INCOMPATIBLE_LEGACY_SCHEDULE_PREFIX";
      throw prefixError;
    }
  }
  var missing = expected.filter(function (header) {
    return headers.indexOf(schedulePhase2Canonical(header)) === -1;
  });
  if (missing.length) {
    var missingError = new Error("Phase 2 schema is not ready for " + name + ": " + missing.join(", "));
    missingError.code = "SCHEDULE_SCHEMA_NOT_READY";
    missingError.details = { sheetName: name, missingHeaders: missing };
    throw missingError;
  }
  return { sheet: sheet, headers: headers };
}

function schedulePhase2ReadRows(name) {
  var sheet = schedulePhase2Sheet(name, false);
  if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) return [];
  var headers = schedulePhase2Headers(sheet);
  schedulePhase2AssertNoDuplicateHeaders(name, headers);
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues().map(function (row, offset) {
    var record = { _rowNumber: offset + 2 };
    headers.forEach(function (header, index) {
      var key = schedulePhase2Camel(header);
      var value = row[index];
      if (value instanceof Date) {
        value = /(^DATE$|_FROM$|_TO$)/.test(header)
          ? Utilities.formatDate(value, StaffSchedulingPhase2.TIME_ZONE, "yyyy-MM-dd")
          : value.toISOString();
      }
      if (/_JSON$/.test(header)) {
        try { value = value ? JSON.parse(String(value)) : (header === "BRANCH_IDS_JSON" ? [] : null); }
        catch (_error) { value = header === "BRANCH_IDS_JSON" ? [] : null; }
        key = key.replace(/Json$/, "");
      }
      record[key] = value;
    });
    if (record.requestFingerprint !== undefined) record.fingerprint = schedulePhase2Text(record.requestFingerprint);
    if (record.response !== undefined && typeof record.response === "string") {
      try { record.response = JSON.parse(record.response); } catch (_error) { record.response = null; }
    }
    return record;
  });
}

function schedulePhase2CellValue(header, record) {
  var key = schedulePhase2Camel(header);
  if (header === "REQUEST_FINGERPRINT") key = "fingerprint";
  if (header === "RESPONSE_JSON") key = "response";
  if (/_JSON$/.test(header)) {
    key = key.replace(/Json$/, "");
    return JSON.stringify(record[key] === undefined ? null : record[key]);
  }
  if (header === "BEFORE_STATE_JSON") return JSON.stringify(record.beforeState || null);
  if (header === "AFTER_STATE_JSON") return JSON.stringify(record.afterState || null);
  return record[key] === undefined || record[key] === null ? "" : record[key];
}

function schedulePhase2Save(name, schema, idHeader, record) {
  var ready = schedulePhase2AssertHeaders(name, schema);
  var idKey = schedulePhase2Camel(idHeader);
  var id = schedulePhase2Text(record[idKey]);
  var matches = schedulePhase2ReadRows(name).filter(function (item) {
    return schedulePhase2Text(item[idKey]) === id;
  });
  if (matches.length > 1) {
    var ambiguousError = new Error("Duplicate entity IDs exist in " + name);
    ambiguousError.code = "SCHEDULE_ENTITY_ID_AMBIGUOUS";
    ambiguousError.details = { sheetName: name, idHeader: idHeader, id: id };
    throw ambiguousError;
  }
  var existing = matches[0];
  var original = existing
    ? ready.sheet.getRange(existing._rowNumber, 1, 1, ready.headers.length).getValues()[0]
    : [];
  var schemaHeaders = schema.map(schedulePhase2Canonical);
  var values = ready.headers.map(function (header, index) {
    return schemaHeaders.indexOf(header) === -1
      ? (existing ? original[index] : "")
      : schedulePhase2CellValue(header, record);
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
      idHeader: schedulePhase2Canonical(idHeader), id: id
    });
    ready.sheet.appendRow(values);
  }
  return record;
}

function schedulePhase2ReadStaff() {
  var sheet = schedulePhase2Sheet("STAFF", true);
  if (sheet.getLastRow() < 2) return [];
  var width = Math.max(11, sheet.getLastColumn());
  var headers = schedulePhase2Headers(sheet);
  schedulePhase2AssertNoDuplicateHeaders("STAFF", headers);
  var branchIndex = headers.indexOf("BRANCH_ID");
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, width).getValues()
    .map(function (row, index) {
      return {
        staffId: schedulePhase2Text(row[4] || "STAFF-" + String(index + 1).padStart(3, "0")),
        staffName: schedulePhase2Text(row[0]),
        branchId: branchIndex >= 0 ? schedulePhase2Text(row[branchIndex]) : "",
        active: row[7] === "" ? true : String(row[7]).toUpperCase() !== "FALSE"
      };
    })
    .filter(function (staff) { return !!staff.staffName; });
}

function schedulePhase2ReadSchedules() {
  var sheet = schedulePhase2Sheet("BARBER_SCHEDULE", false);
  if (!sheet || sheet.getLastRow() < 2) return [];
  var headers = schedulePhase2Headers(sheet);
  schedulePhase2AssertNoDuplicateHeaders("BARBER_SCHEDULE", headers);
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  var normalized = rows.map(function (row) {
    var safeRow = row.map(function (value, index) {
      if (!(value instanceof Date)) return value;
      if (headers[index] === "SHIFT_START" || headers[index] === "SHIFT_END") {
        return Utilities.formatDate(value, StaffSchedulingPhase2.TIME_ZONE, "HH:mm");
      }
      if (/(^DATE$|_FROM$|_TO$)/.test(headers[index])) {
        return Utilities.formatDate(value, StaffSchedulingPhase2.TIME_ZONE, "yyyy-MM-dd");
      }
      return value.toISOString();
    });
    return StaffSchedulingPhase2.normalizeLegacyScheduleRow(safeRow, headers, {});
  });
  return StaffSchedulingPhase2.classifyLegacyScheduleRows(normalized);
}

var schedulePhase2Transaction = null;

function schedulePhase2RecordUndo(entry) {
  if (schedulePhase2Transaction) schedulePhase2Transaction.entries.push(entry);
}

function schedulePhase2RollbackTransaction() {
  var failures = [];
  var entries = schedulePhase2Transaction ? schedulePhase2Transaction.entries.slice().reverse() : [];
  entries.forEach(function (entry) {
    try {
      var sheet = schedulePhase2Sheet(entry.sheetName, true);
      if (entry.type === "UPDATE") {
        sheet.getRange(entry.rowNumber, 1, 1, entry.values.length).setValues([entry.values]);
      } else if (entry.type === "APPEND" && sheet.getLastRow() >= entry.rowNumber) {
        var headers = schedulePhase2Headers(sheet);
        var idIndex = headers.indexOf(entry.idHeader);
        var actualId = idIndex >= 0
          ? schedulePhase2Text(sheet.getRange(entry.rowNumber, idIndex + 1).getValue()) : "";
        if (actualId === entry.id) sheet.deleteRow(entry.rowNumber);
        else if (actualId) failures.push({
          sheetName: entry.sheetName, rowNumber: entry.rowNumber, code: "ROLLBACK_ROW_ID_MISMATCH"
        });
      }
    } catch (error) {
      failures.push({
        sheetName: entry.sheetName, rowNumber: entry.rowNumber,
        code: "ROLLBACK_OPERATION_FAILED", message: error.message
      });
    }
  });
  return failures;
}

function schedulePhase2WithTransaction(details, callback) {
  var properties = PropertiesService.getScriptProperties();
  var markerKey = "SCHEDULE_RECOVERY_" + details.requestId;
  var marker = {
    version: StaffSchedulingPhase2.PHASE2_VERSION,
    action: details.action, requestId: details.requestId, actorId: details.actorId,
    status: "IN_PROGRESS", startedAt: new Date().toISOString()
  };
  properties.setProperty(markerKey, JSON.stringify(marker));
  schedulePhase2Transaction = { entries: [] };
  try {
    var result = callback();
    properties.deleteProperty(markerKey);
    schedulePhase2Transaction = null;
    return result;
  } catch (error) {
    var failures = schedulePhase2RollbackTransaction();
    schedulePhase2Transaction = null;
    if (failures.length) {
      marker.status = "COMPENSATION_FAILED";
      marker.failures = failures;
      marker.originalError = { code: error.code || "", message: error.message || "" };
      properties.setProperty(markerKey, JSON.stringify(marker));
      var compensationError = new Error("Schedule write failed and compensation was incomplete.");
      compensationError.code = "SCHEDULE_COMPENSATION_FAILED";
      compensationError.details = { recoveryMarker: markerKey, failures: failures };
      throw compensationError;
    }
    properties.deleteProperty(markerKey);
    throw error;
  }
}

function schedulePhase2CreateRepository() {
  return {
    listStaff: schedulePhase2ReadStaff,
    getStaff: function (staffId) {
      return schedulePhase2ReadStaff().filter(function (item) {
        return item.staffId === schedulePhase2Text(staffId);
      })[0] || null;
    },
    listSchedules: function (filters) {
      filters = filters || {};
      return schedulePhase2ReadSchedules().filter(function (item) {
        return (!filters.staffId || item.staffId === filters.staffId) &&
          (!filters.weekday || item.weekday === filters.weekday) &&
          (filters.active === undefined || item.active === filters.active);
      });
    },
    getSchedule: function (id) {
      var matches = schedulePhase2ReadSchedules().filter(function (item) {
        return item.scheduleId === schedulePhase2Text(id);
      });
      if (matches.length > 1) {
        var error = new Error("Schedule ID is ambiguous.");
        error.code = "SCHEDULE_ENTITY_ID_AMBIGUOUS";
        throw error;
      }
      return matches[0] || null;
    },
    saveSchedule: function (record) {
      return schedulePhase2Save(
        "BARBER_SCHEDULE", StaffSchedulingPhase2.PHASE2_SHEET_SCHEMAS.BARBER_SCHEDULE,
        "SCHEDULE_ID", record
      );
    },
    listOverrides: function (filters) {
      filters = filters || {};
      return schedulePhase2ReadRows("STAFF_SCHEDULE_OVERRIDES").filter(function (item) {
        return (!filters.staffId || item.staffId === filters.staffId || item.scopeType !== "STAFF") &&
          (!filters.dateFrom || item.date >= filters.dateFrom) &&
          (!filters.dateTo || item.date <= filters.dateTo) &&
          (!filters.status || item.status === filters.status);
      });
    },
    getOverride: function (id) {
      var matches = schedulePhase2ReadRows("STAFF_SCHEDULE_OVERRIDES").filter(function (item) {
        return item.overrideId === schedulePhase2Text(id);
      });
      if (matches.length > 1) {
        var error = new Error("Override ID is ambiguous.");
        error.code = "SCHEDULE_ENTITY_ID_AMBIGUOUS";
        throw error;
      }
      return matches[0] || null;
    },
    saveOverride: function (record) {
      return schedulePhase2Save(
        "STAFF_SCHEDULE_OVERRIDES",
        StaffSchedulingPhase2.PHASE2_SHEET_SCHEMAS.STAFF_SCHEDULE_OVERRIDES,
        "OVERRIDE_ID", record
      );
    },
    listPolicies: function () { return schedulePhase2ReadRows("STAFF_WORK_POLICIES"); },
    appendAudit: function (record) {
      if (schedulePhase2ReadRows("STAFF_ATTENDANCE_AUDIT").some(function (item) {
        return item.actionId === record.actionId;
      })) {
        var error = new Error("Audit action ID collision.");
        error.code = "SCHEDULE_AUDIT_ID_COLLISION";
        throw error;
      }
      return schedulePhase2Save(
        "STAFF_ATTENDANCE_AUDIT",
        StaffSchedulingPhase2.PHASE2_SHEET_SCHEMAS.STAFF_ATTENDANCE_AUDIT,
        "ACTION_ID", record
      );
    },
    listAudit: function (filters) {
      filters = filters || {};
      return schedulePhase2ReadRows("STAFF_ATTENDANCE_AUDIT").filter(function (item) {
        return (!filters.entityId || item.entityId === filters.entityId) &&
          (!filters.staffId || item.staffId === filters.staffId);
      });
    },
    getIdempotency: function (requestId) {
      var matches = schedulePhase2ReadRows("STAFF_ATTENDANCE_IDEMPOTENCY").filter(function (item) {
        return item.requestId === schedulePhase2Text(requestId);
      });
      if (matches.length > 1) {
        var error = new Error("Idempotency request ID is ambiguous.");
        error.code = "SCHEDULE_IDEMPOTENCY_AMBIGUOUS";
        throw error;
      }
      return matches[0] || null;
    },
    saveIdempotency: function (record) {
      return schedulePhase2Save(
        "STAFF_ATTENDANCE_IDEMPOTENCY",
        StaffSchedulingPhase2.PHASE2_SHEET_SCHEMAS.STAFF_ATTENDANCE_IDEMPOTENCY,
        "REQUEST_ID", record
      );
    },
    listScopes: function () { return schedulePhase2ReadRows("SCHEDULE_USER_SCOPES"); },
    saveScope: function (record) {
      return schedulePhase2Save(
        "SCHEDULE_USER_SCOPES",
        StaffSchedulingPhase2.PHASE2_SHEET_SCHEMAS.SCHEDULE_USER_SCOPES,
        "SCOPE_ID", record
      );
    },
    withTransaction: schedulePhase2WithTransaction
  };
}

function schedulePhase2Actor(data) {
  var user = getAuthenticatedUser(data || {});
  if (!user) return null;
  var username = schedulePhase2Text(user.username);
  var owner = username.toLowerCase() === "owner";
  var activeScopes = schedulePhase2ReadRows("SCHEDULE_USER_SCOPES").filter(function (item) {
    return schedulePhase2Text(item.username).toLowerCase() === username.toLowerCase() &&
      (item.active === true || String(item.active).toUpperCase() === "TRUE");
  });
  if (!owner && activeScopes.length > 1) {
    var ambiguousError = new Error("Multiple active schedule scopes exist for this authenticated user.");
    ambiguousError.code = "SCHEDULE_SCOPE_AMBIGUOUS";
    throw ambiguousError;
  }
  var scope = activeScopes[0];
  if (!owner && !scope) {
    var error = new Error("A reviewed staff/branch scope mapping is required.");
    error.code = "SCHEDULE_SCOPE_NOT_CONFIGURED";
    throw error;
  }
  if (!owner) {
    var role = schedulePhase2Text(scope.role).toUpperCase();
    var branchIds = Array.isArray(scope.branchIds) ? scope.branchIds.filter(Boolean) : [];
    if (["EMPLOYEE", "MANAGER"].indexOf(role) === -1) {
      var roleError = new Error("Schedule scope role is invalid.");
      roleError.code = "SCHEDULE_SCOPE_ROLE_INVALID";
      throw roleError;
    }
    if (role === "EMPLOYEE") {
      var mappedStaff = schedulePhase2ReadStaff().filter(function (item) {
        return item.staffId === schedulePhase2Text(scope.staffId);
      })[0];
      if (!mappedStaff) {
        var staffError = new Error("Schedule scope staff mapping does not resolve.");
        staffError.code = "SCHEDULE_SCOPE_STAFF_NOT_FOUND";
        throw staffError;
      }
    }
    if (role === "MANAGER" && !branchIds.length) {
      var branchError = new Error("Manager schedule scope requires at least one branch.");
      branchError.code = "SCHEDULE_SCOPE_BRANCH_REQUIRED";
      throw branchError;
    }
  }
  return {
    username: username,
    actorId: username,
    actorName: schedulePhase2Text(user.displayName || username),
    role: owner ? "OWNER" : schedulePhase2Text(scope.role || "EMPLOYEE"),
    staffId: owner ? "" : schedulePhase2Text(scope.staffId),
    branchIds: owner ? [] : (Array.isArray(scope.branchIds) ? scope.branchIds : []),
    permissions: normalizeManagedPermissions(user.username, user.permissions),
    owner: owner
  };
}

function schedulePhase2WithLock(_details, callback) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    var error = new Error("Another schedule write is in progress.");
    error.code = "SCHEDULE_WRITE_LOCK_TIMEOUT";
    throw error;
  }
  try { return callback(); } finally { lock.releaseLock(); }
}

function schedulePhase2AssertWriteReady() {
  Object.keys(StaffSchedulingPhase2.PHASE2_SHEET_SCHEMAS).forEach(function (name) {
    schedulePhase2AssertHeaders(name, StaffSchedulingPhase2.PHASE2_SHEET_SCHEMAS[name]);
  });
}

function schedulePhase2AssertEnvironmentIdentity() {
  var config = getCutHubEnvironmentConfig();
  var spreadsheet = SpreadsheetApp.getActive();
  if (!config.environment || ["development", "test", "staging", "production"].indexOf(config.environment) === -1) {
    var environmentError = new Error("Schedule environment identity is missing or invalid.");
    environmentError.code = "SCHEDULE_ENVIRONMENT_IDENTITY_INVALID";
    throw environmentError;
  }
  if (!config.spreadsheetId || !spreadsheet || spreadsheet.getId() !== config.spreadsheetId) {
    var spreadsheetError = new Error("Schedule spreadsheet identity does not match configuration.");
    spreadsheetError.code = "SCHEDULE_SPREADSHEET_IDENTITY_MISMATCH";
    throw spreadsheetError;
  }
  return { config: config, spreadsheet: spreadsheet };
}

function previewStaffScheduleMigration(data) {
  var spreadsheet = SpreadsheetApp.getActive();
  var config = getCutHubEnvironmentConfig();
  var existing = {};
  Object.keys(StaffSchedulingPhase2.PHASE2_SHEET_SCHEMAS).forEach(function (name) {
    var sheet = spreadsheet.getSheetByName(name);
    existing[name] = sheet ? schedulePhase2Headers(sheet) : null;
  });
  return StaffSchedulingPhase2.planScheduleMigration(existing, {
    environment: config.environment,
    expectedSpreadsheetId: config.spreadsheetId,
    actualSpreadsheetId: spreadsheet.getId(),
    environmentReviewApproved: data.environmentReviewApproved === true
  });
}

function handleStaffSchedulingPhase2Action(data) {
  try {
    if (!StaffSchedulingPhase2 || StaffSchedulingPhase2.ACTIONS.indexOf(data.action) === -1) {
      throw StaffSchedulingPhase2.schedulingError("SCHEDULE_ACTION_UNKNOWN", "Schedule action is not supported.");
    }
    schedulePhase2AssertEnvironmentIdentity();
    if (data.action === "previewStaffScheduleMigration") {
      var previewActor = schedulePhase2Actor(data);
      if (!previewActor || !previewActor.owner) {
        throw StaffSchedulingPhase2.schedulingError("OWNER_REQUIRED", "Only owner can preview the migration.");
      }
      return jsonOutput({
        status: "success", code: "SCHEDULE_MIGRATION_PREVIEW_OK",
        migration: StaffSchedulingPhase2.filterSensitiveFields(previewStaffScheduleMigration(data))
      });
    }
    if (StaffSchedulingPhase2.WRITE_ACTIONS.has(data.action)) schedulePhase2AssertWriteReady();
    var service = StaffSchedulingPhase2.createService({
      repository: schedulePhase2CreateRepository(),
      actorResolver: schedulePhase2Actor,
      userResolver: function (username) {
        return readUsersFromSheet().filter(function (user) {
          return schedulePhase2Text(user.username).toLowerCase() ===
            schedulePhase2Text(username).toLowerCase();
        })[0] || null;
      },
      withLock: function (details, callback) {
        return schedulePhase2WithLock(details, function () {
          if (typeof publishOperationalMutationTransactionUnderCurrentLock === "function") {
            return publishOperationalMutationTransactionUnderCurrentLock(
              "schedule", data, callback);
          }
          var mutationResult = callback();
          if (typeof publishOperationalMutationUnderCurrentLock === "function") {
            publishOperationalMutationUnderCurrentLock("schedule", data, mutationResult);
          }
          return mutationResult;
        });
      },
      now: function () { return new Date().toISOString(); },
      uuid: function () { return Utilities.getUuid(); }
    });
    var result = service.execute(data.action, data);
    return jsonOutput(result);
  } catch (error) {
    return jsonOutput({
      status: "error",
      code: error.code || "SCHEDULE_INTERNAL_ERROR",
      message: error.message || "Schedule request failed.",
      details: error.details || undefined
    });
  }
}
