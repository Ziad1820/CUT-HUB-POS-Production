/* global SpreadsheetApp, PropertiesService, LockService, Utilities, Session, DriveApp,
  console, getCutHubEnvironmentConfig, assertStagingEnvironment,
  previewStaffScheduleMigration, previewAttendanceMigration, previewPayrollPhase4Migration,
  previewBranchFoundationMigration */

var STAFF_SCHEMA_MIGRATION_JOURNAL_PREFIX = "STAFF_SCHEMA_MIGRATION_JOURNAL_";
var STAFF_SCHEMA_MIGRATION_TOKEN_PREFIX = "STAFF_SCHEMA_MIGRATION_TOKEN_";
var STAFF_SCHEMA_MIGRATION_TOKEN_TTL_MS = 5 * 60 * 1000;
var STAFF_SCHEMA_MIGRATION_LOCK_TIMEOUT_MS = 30000;
var STAFF_SCHEMA_MIGRATION_JOURNAL_MAX_BYTES = 8000;
var STAFF_SCHEMA_MIGRATION_PROPERTY_STORE_MAX_BYTES = 450000;
var STAFF_SCHEMA_MIGRATION_ERROR_MESSAGE_MAX_LENGTH = 500;

function staffSchemaMigrationError(code, message, details) {
  var error = new Error(message || code);
  error.code = code;
  if (details !== undefined) error.details = details;
  return error;
}

function staffSchemaMigrationCanonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map(staffSchemaMigrationCanonical).join(",") + "]";
  }
  return "{" + Object.keys(value).sort().map(function (key) {
    return JSON.stringify(key) + ":" + staffSchemaMigrationCanonical(value[key]);
  }).join(",") + "}";
}

function staffSchemaMigrationHash(value) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    staffSchemaMigrationCanonical(value),
    Utilities.Charset.UTF_8
  );
  return "sha256:" + bytes.map(function (value) {
    var byte = value < 0 ? value + 256 : value;
    return byte.toString(16).padStart(2, "0");
  }).join("");
}

function staffSchemaMigrationPlanHash(plan) {
  plan = plan || {};
  return staffSchemaMigrationHash({
    schemaVersion: plan.schemaVersion,
    version: plan.version,
    dryRun: plan.dryRun,
    writes: plan.writes,
    executionAllowed: plan.executionAllowed,
    identity: plan.identity || {},
    headerNormalization: plan.headerNormalization,
    createSheets: plan.createSheets || [],
    initializeBlankSheets: plan.initializeBlankSheets || [],
    appendColumns: plan.appendColumns || {},
    unchangedSheets: plan.unchangedSheets || [],
    preservedUnknownColumns: plan.preservedUnknownColumns || {},
    errors: plan.errors || [],
    rollback: plan.rollback || {},
    safe: plan.safe
  });
}

function staffSchemaMigrationNow() {
  return new Date().toISOString();
}

function staffSchemaMigrationPhaseDefinition(phase) {
  var key = String(phase || "").toUpperCase();
  var definitions = {
    PHASE2: {
      phase: "PHASE2", migrationId: "STAFF_SCHEDULING_PHASE2_SCHEMA",
      preview: function () {
        return previewStaffScheduleMigration({ environmentReviewApproved: true });
      }, previousPhase: ""
    },
    PHASE3: {
      phase: "PHASE3", migrationId: "ATTENDANCE_PHASE3_SCHEMA",
      preview: function () { return previewAttendanceMigration({}); }, previousPhase: "PHASE2"
    },
    PHASE4: {
      phase: "PHASE4", migrationId: "PAYROLL_ATTENDANCE_PHASE4_SCHEMA",
      preview: function () { return previewPayrollPhase4Migration({}); }, previousPhase: "PHASE3"
    },
    BRANCH_FOUNDATION: {
      phase: "BRANCH_FOUNDATION", migrationId: "BRANCH_FOUNDATION_V1",
      preview: function () { return previewBranchFoundationMigration({}); }, previousPhase: ""
    }
  };
  if (!definitions[key]) {
    throw staffSchemaMigrationError("MIGRATION_PHASE_INVALID", "Migration phase is unsupported.");
  }
  return definitions[key];
}

function staffSchemaMigrationPreflightStaging() {
  var config = getCutHubEnvironmentConfig();
  var environment = String(config.environment || "").trim().toLowerCase();
  if (environment !== "staging") {
    throw staffSchemaMigrationError(
      "MIGRATION_STAGING_ONLY", "Schema migration execution is restricted to Staging."
    );
  }
  if (!config.spreadsheetId || !config.stagingSpreadsheetId ||
      config.spreadsheetId !== config.stagingSpreadsheetId) {
    throw staffSchemaMigrationError(
      "MIGRATION_STAGING_PIN_MISMATCH", "Expected and Staging spreadsheet pins must match."
    );
  }
  var strict = assertStagingEnvironment();
  if (!strict || !strict.spreadsheet ||
      strict.spreadsheet.getId() !== config.spreadsheetId ||
      strict.spreadsheet.getId() !== config.stagingSpreadsheetId) {
    throw staffSchemaMigrationError(
      "MIGRATION_STAGING_IDENTITY_MISMATCH", "Strict Staging identity validation failed."
    );
  }
  return strict;
}

function staffSchemaMigrationAssertOwner(strict) {
  var effectiveEmail = "";
  var activeEmail = "";
  var ownerEmail = "";
  try {
    effectiveEmail = String(Session.getEffectiveUser().getEmail() || "").trim().toLowerCase();
    activeEmail = String(Session.getActiveUser().getEmail() || "").trim().toLowerCase();
    var file = DriveApp.getFileById(strict.spreadsheet.getId());
    var owner = file && file.getOwner ? file.getOwner() : null;
    ownerEmail = String(owner && owner.getEmail ? owner.getEmail() : "").trim().toLowerCase();
  } catch (_error) {
    effectiveEmail = "";
    ownerEmail = "";
  }
  if (!effectiveEmail || !activeEmail || !ownerEmail ||
      effectiveEmail !== activeEmail || activeEmail !== ownerEmail) {
    throw staffSchemaMigrationError(
      "MIGRATION_OWNER_REQUIRED", "Only the verified Staging spreadsheet owner can run schema migration controls."
    );
  }
  return { actorId: effectiveEmail, actorIdentity: effectiveEmail };
}

function staffSchemaMigrationIdentityAndOwner() {
  var strict = staffSchemaMigrationPreflightStaging();
  var actor = staffSchemaMigrationAssertOwner(strict);
  return {
    config: strict.config,
    spreadsheet: strict.spreadsheet,
    actorId: actor.actorId,
    actorIdentity: actor.actorIdentity
  };
}

function staffSchemaMigrationAssertPreview(plan, identity) {
  var errors = plan && Array.isArray(plan.errors) ? plan.errors : [];
  if (!plan || plan.safe !== true || errors.length !== 0 ||
      plan.dryRun !== true || Number(plan.writes) !== 0) {
    throw staffSchemaMigrationError(
      "MIGRATION_PREVIEW_NOT_SAFE", "The approved preview preconditions were not satisfied.",
      { errors: errors }
    );
  }
  var planIdentity = plan.identity || {};
  if (String(planIdentity.environment || "").toLowerCase() !== "staging" ||
      String(planIdentity.expectedSpreadsheetId || "") !== identity.spreadsheet.getId() ||
      String(planIdentity.actualSpreadsheetId || "") !== identity.spreadsheet.getId()) {
    throw staffSchemaMigrationError(
      "MIGRATION_PREVIEW_IDENTITY_MISMATCH", "Preview identity does not match strict Staging identity."
    );
  }
  return plan;
}

function staffSchemaMigrationPendingOperations(plan) {
  return (plan.createSheets || []).length +
    (plan.initializeBlankSheets || []).length +
    Object.keys(plan.appendColumns || {}).length;
}

function staffSchemaMigrationAssertExecutionOrder(definition, identity) {
  if (!definition.previousPhase) return;
  var previous = staffSchemaMigrationPhaseDefinition(definition.previousPhase);
  var previousPlan = staffSchemaMigrationAssertPreview(previous.preview(), identity);
  if (staffSchemaMigrationPendingOperations(previousPlan) !== 0) {
    throw staffSchemaMigrationError(
      "MIGRATION_EXECUTION_ORDER_REQUIRED",
      previous.phase + " schema must be complete before " + definition.phase + "."
    );
  }
}

function staffSchemaMigrationSchemaVersion(plan) {
  return String(plan.schemaVersion || plan.version || "");
}

function staffSchemaMigrationJournalKey(phase, requestId, spreadsheetId, actorIdentity) {
  return STAFF_SCHEMA_MIGRATION_JOURNAL_PREFIX +
    String(phase) + "_" +
    staffSchemaMigrationHash(String(spreadsheetId)).slice(7) + "_" +
    staffSchemaMigrationHash(String(actorIdentity)).slice(7) + "_" +
    staffSchemaMigrationHash(String(requestId)).slice(7);
}

function staffSchemaMigrationTokenKey(phase) {
  return STAFF_SCHEMA_MIGRATION_TOKEN_PREFIX + String(phase);
}

function staffSchemaMigrationReadJson(store, key) {
  var raw = store.getProperty(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (_error) {
    throw staffSchemaMigrationError("MIGRATION_STATE_CORRUPT", "Migration state is not valid JSON.");
  }
}

function staffSchemaMigrationWriteJournal(key, journal) {
  journal.updatedAt = staffSchemaMigrationNow();
  var payload = JSON.stringify(journal);
  var byteLength = typeof Utilities.newBlob === "function"
    ? Utilities.newBlob(payload).getBytes().length
    : unescape(encodeURIComponent(payload)).length;
  if (byteLength > STAFF_SCHEMA_MIGRATION_JOURNAL_MAX_BYTES) {
    throw staffSchemaMigrationError(
      "MIGRATION_JOURNAL_SIZE_LIMIT",
      "Migration journal exceeds the guarded Script Property size limit.",
      { byteLength: byteLength, maximumBytes: STAFF_SCHEMA_MIGRATION_JOURNAL_MAX_BYTES }
    );
  }
  var properties = PropertiesService.getScriptProperties();
  var current = properties.getProperties();
  var totalBytes = Object.keys(current).reduce(function (total, currentKey) {
    return total + (typeof Utilities.newBlob === "function"
      ? Utilities.newBlob(currentKey + current[currentKey]).getBytes().length
      : unescape(encodeURIComponent(currentKey + current[currentKey])).length);
  }, 0);
  var replacedBytes = current[key] ? (typeof Utilities.newBlob === "function"
    ? Utilities.newBlob(key + current[key]).getBytes().length
    : unescape(encodeURIComponent(key + current[key])).length) : 0;
  var projectedBytes = totalBytes - replacedBytes + byteLength +
    (typeof Utilities.newBlob === "function"
      ? Utilities.newBlob(key).getBytes().length
      : unescape(encodeURIComponent(key)).length);
  if (projectedBytes > STAFF_SCHEMA_MIGRATION_PROPERTY_STORE_MAX_BYTES) {
    throw staffSchemaMigrationError(
      "MIGRATION_PROPERTY_STORE_SIZE_LIMIT",
      "Migration journal would exceed the guarded Script Property store limit.",
      { projectedBytes: projectedBytes, maximumBytes: STAFF_SCHEMA_MIGRATION_PROPERTY_STORE_MAX_BYTES }
    );
  }
  properties.setProperty(key, payload);
}

function staffSchemaMigrationErrorDetail(error) {
  return {
    code: String(error && error.code || "MIGRATION_EXECUTION_FAILED").slice(0, 120),
    message: String(error && error.message || error || "Migration execution failed.")
      .slice(0, STAFF_SCHEMA_MIGRATION_ERROR_MESSAGE_MAX_LENGTH)
  };
}

function staffSchemaMigrationFingerprint(definition, requestId, planHash, identity, requestContext) {
  return staffSchemaMigrationHash({
    phase: definition.phase,
    migrationId: definition.migrationId,
    requestId: requestId,
    planHash: planHash,
    spreadsheetId: identity.spreadsheet.getId(),
    actorIdentity: identity.actorIdentity,
    requestContext: String(requestContext || "")
  });
}

function staffSchemaMigrationTryLocks(callback) {
  var scriptLock = LockService.getScriptLock();
  var documentLock = LockService.getDocumentLock ? LockService.getDocumentLock() : null;
  if (!scriptLock.tryLock(STAFF_SCHEMA_MIGRATION_LOCK_TIMEOUT_MS)) {
    throw staffSchemaMigrationError("MIGRATION_CONCURRENT_EXECUTION", "Another migration is active.");
  }
  var documentLocked = false;
  try {
    if (documentLock) {
      documentLocked = documentLock.tryLock(STAFF_SCHEMA_MIGRATION_LOCK_TIMEOUT_MS);
      if (!documentLocked) {
        throw staffSchemaMigrationError("MIGRATION_CONCURRENT_EXECUTION", "Spreadsheet migration lock is active.");
      }
    }
    return callback();
  } finally {
    if (documentLock && documentLocked) documentLock.releaseLock();
    scriptLock.releaseLock();
  }
}

function staffSchemaMigrationPrepare(phase, data) {
  data = data && typeof data === "object" ? data : {};
  var definition = staffSchemaMigrationPhaseDefinition(phase);
  var identity = staffSchemaMigrationIdentityAndOwner();
  var requestId = String(data.requestId || Utilities.getUuid() || "").trim();
  var requestContext = String(data.requestContext || "").trim();
  if (!requestId || requestId.length > 160) {
    throw staffSchemaMigrationError("MIGRATION_REQUEST_ID_INVALID", "A valid requestId is required.");
  }
  return staffSchemaMigrationTryLocks(function () {
    var journalKey = staffSchemaMigrationJournalKey(
      definition.phase, requestId, identity.spreadsheet.getId(), identity.actorIdentity
    );
    var scriptProperties = PropertiesService.getScriptProperties();
    var existing = staffSchemaMigrationReadJson(scriptProperties, journalKey);
    if (existing && ["APPLYING", "RECOVERY_REQUIRED"].indexOf(existing.status) !== -1) {
      throw staffSchemaMigrationError(
        "MIGRATION_REQUEST_NOT_PREPARABLE", "The existing request requires completion or recovery."
      );
    }
    staffSchemaMigrationAssertExecutionOrder(definition, identity);
    var plan = staffSchemaMigrationAssertPreview(definition.preview(), identity);
    var planHash = staffSchemaMigrationPlanHash(plan);
    var bindingPlanHash = existing && existing.status === "COMMITTED"
      ? existing.exactPlanHash : planHash;
    var fingerprint = staffSchemaMigrationFingerprint(
      definition, requestId, bindingPlanHash, identity, requestContext
    );
    if (existing && existing.requestFingerprint !== fingerprint) {
      throw staffSchemaMigrationError(
        "MIGRATION_REQUEST_ID_REUSED", "requestId was already bound to a different migration payload."
      );
    }
    var now = Date.now();
    var token = Utilities.getUuid() + "-" + Utilities.getUuid();
    var tokenRecord = {
      token: token,
      tokenHash: staffSchemaMigrationHash(token),
      phase: definition.phase,
      requestId: requestId,
      requestFingerprint: fingerprint,
      exactPlanHash: bindingPlanHash,
      spreadsheetId: identity.spreadsheet.getId(),
      actorIdentity: identity.actorIdentity,
      expiresAt: new Date(now + STAFF_SCHEMA_MIGRATION_TOKEN_TTL_MS).toISOString()
    };
    var journal = existing && existing.status === "COMMITTED" ? existing : {
      migrationId: definition.migrationId,
      schemaVersion: staffSchemaMigrationSchemaVersion(plan),
      phase: definition.phase,
      requestId: requestId,
      actorIdentity: identity.actorIdentity,
      expectedSpreadsheetId: identity.spreadsheet.getId(),
      startedTimestamp: staffSchemaMigrationNow(),
      completedTimestamp: "",
      status: "PREPARED",
      exactPlanHash: planHash,
      requestFingerprint: fingerprint,
      requestContext: requestContext,
      createdSheetNames: [],
      initializedBlankSheets: [],
      appendedColumnRanges: [],
      errorDetails: [],
      writes: 0,
      finalResult: null
    };
    if (journal.status !== "COMMITTED") staffSchemaMigrationWriteJournal(journalKey, journal);
    PropertiesService.getUserProperties().setProperty(
      staffSchemaMigrationTokenKey(definition.phase), JSON.stringify(tokenRecord)
    );
    var summary = {
      token: token,
      expiresAt: tokenRecord.expiresAt,
      phase: definition.phase,
      requestId: requestId,
      exactPlanHash: bindingPlanHash,
      spreadsheetId: tokenRecord.spreadsheetId,
      actorIdentity: tokenRecord.actorIdentity,
      createSheetNames: (plan.createSheets || []).map(function (item) { return item.sheetName; }),
      initializeBlankSheetNames: (plan.initializeBlankSheets || []).map(function (item) {
        return item.sheetName;
      }),
      appendColumnSheetNames: Object.keys(plan.appendColumns || {}),
      alreadyCommitted: journal.status === "COMMITTED"
    };
    console.log(JSON.stringify({
      tokenIssued: true,
      expiresAt: summary.expiresAt,
      phase: summary.phase,
      requestId: summary.requestId,
      exactPlanHash: summary.exactPlanHash,
      spreadsheetId: summary.spreadsheetId,
      actorIdentity: summary.actorIdentity,
      createSheetNames: summary.createSheetNames,
      initializeBlankSheetNames: summary.initializeBlankSheetNames,
      appendColumnSheetNames: summary.appendColumnSheetNames,
      alreadyCommitted: summary.alreadyCommitted
    }));
    return summary;
  });
}

function prepareStaffScheduleMigrationExecution(data) {
  return staffSchemaMigrationPrepare("PHASE2", data);
}

function prepareAttendanceMigrationExecution(data) {
  return staffSchemaMigrationPrepare("PHASE3", data);
}

function preparePayrollPhase4MigrationExecution(data) {
  return staffSchemaMigrationPrepare("PHASE4", data);
}

function prepareBranchFoundationMigration(data) {
  return staffSchemaMigrationPrepare("BRANCH_FOUNDATION", data);
}

function staffSchemaMigrationReadPreparedToken(phase, suppliedToken) {
  var userProperties = PropertiesService.getUserProperties();
  var key = staffSchemaMigrationTokenKey(phase);
  var record = staffSchemaMigrationReadJson(userProperties, key);
  if (!record || !suppliedToken || record.tokenHash !== staffSchemaMigrationHash(suppliedToken)) {
    throw staffSchemaMigrationError("MIGRATION_TOKEN_INVALID", "Confirmation token is invalid or already consumed.");
  }
  if (Date.parse(record.expiresAt || "") <= Date.now()) {
    userProperties.deleteProperty(key);
    throw staffSchemaMigrationError("MIGRATION_TOKEN_EXPIRED", "Confirmation token has expired.");
  }
  return { key: key, record: record, store: userProperties };
}

function staffSchemaMigrationHeaderValues(sheet) {
  var lastColumn = sheet.getLastColumn();
  if (!lastColumn) return [];
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function (value) {
    return String(value == null ? "" : value).trim().toUpperCase()
      .replace(/[\s-]+/g, "_").replace(/_+/g, "_");
  });
}

function staffSchemaMigrationEnsureColumns(sheet, count) {
  var maximum = sheet.getMaxColumns ? sheet.getMaxColumns() : sheet.getLastColumn();
  if (maximum < count) sheet.insertColumnsAfter(Math.max(1, maximum), count - maximum);
}

function staffSchemaMigrationOperations(plan) {
  var operations = [];
  (plan.createSheets || []).forEach(function (item) {
    operations.push({ type: "CREATE_SHEET", sheetName: item.sheetName, headers: item.headers || [] });
  });
  (plan.initializeBlankSheets || []).forEach(function (item) {
    operations.push({ type: "INITIALIZE_BLANK_SHEET", sheetName: item.sheetName, headers: item.headers || [] });
  });
  (plan.rollback && plan.rollback.appendedColumnRanges || []).forEach(function (item) {
    operations.push({
      type: "APPEND_COLUMNS", sheetName: item.sheetName,
      startColumn: item.startColumn, endColumn: item.endColumn, headers: item.headers || []
    });
  });
  return operations;
}

function staffSchemaMigrationEnrichOperation(spreadsheet, operation) {
  if (operation.type === "CREATE_SHEET") return operation;
  var sheet = spreadsheet.getSheetByName(operation.sheetName);
  if (!sheet) return operation;
  var maximum = sheet.getMaxColumns ? sheet.getMaxColumns() : sheet.getLastColumn();
  var required = operation.type === "APPEND_COLUMNS"
    ? operation.endColumn : operation.headers.length;
  operation.preExistingMaxColumns = maximum;
  operation.insertedColumnCount = Math.max(0, required - maximum);
  operation.insertedColumnStart = operation.insertedColumnCount
    ? required - operation.insertedColumnCount + 1 : 0;
  return operation;
}

function staffSchemaMigrationApplyOperation(spreadsheet, operation) {
  var sheet;
  if (operation.type === "CREATE_SHEET") {
    if (spreadsheet.getSheetByName(operation.sheetName)) {
      throw staffSchemaMigrationError("MIGRATION_STATE_CHANGED", "A planned missing sheet now exists.");
    }
    sheet = spreadsheet.insertSheet(operation.sheetName);
    staffSchemaMigrationEnsureColumns(sheet, operation.headers.length);
    if (operation.headers.length) {
      sheet.getRange(1, 1, 1, operation.headers.length).setValues([operation.headers]);
    }
    return;
  }
  sheet = spreadsheet.getSheetByName(operation.sheetName);
  if (!sheet) throw staffSchemaMigrationError("MIGRATION_STATE_CHANGED", "Planned sheet is missing.");
  if (operation.type === "INITIALIZE_BLANK_SHEET") {
    if (staffSchemaMigrationHeaderValues(sheet).filter(Boolean).length) {
      throw staffSchemaMigrationError("MIGRATION_STATE_CHANGED", "Planned blank sheet is no longer blank.");
    }
    staffSchemaMigrationEnsureColumns(sheet, operation.headers.length);
    sheet.getRange(1, 1, 1, operation.headers.length).setValues([operation.headers]);
    return;
  }
  if (operation.type === "APPEND_COLUMNS") {
    var headers = staffSchemaMigrationHeaderValues(sheet);
    if (headers.length + 1 !== operation.startColumn) {
      throw staffSchemaMigrationError("MIGRATION_STATE_CHANGED", "Append position changed after preview.");
    }
    staffSchemaMigrationEnsureColumns(sheet, operation.endColumn);
    sheet.getRange(1, operation.startColumn, 1, operation.headers.length)
      .setValues([operation.headers]);
  }
}

function staffSchemaMigrationRangeHasDataBelow(sheet, startColumn, width) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  var range = sheet.getRange(2, startColumn, lastRow - 1, width);
  var hasValue = range.getValues().some(function (row) {
    return row.some(function (value) { return value !== "" && value !== null; });
  });
  var hasFormula = typeof range.getFormulas === "function" &&
    range.getFormulas().some(function (row) {
      return row.some(function (formula) { return String(formula || "") !== ""; });
    });
  return hasValue || hasFormula;
}

function staffSchemaMigrationHeaderProof(headers) {
  var normalized = (headers || []).map(function (value) {
    return String(value == null ? "" : value).trim().toUpperCase()
      .replace(/[\s-]+/g, "_").replace(/_+/g, "_");
  });
  return { headerCount: normalized.length, headerHash: staffSchemaMigrationHash(normalized) };
}

function staffSchemaMigrationHeadersMatch(sheet, startColumn, proof) {
  if (!proof.headerCount) return true;
  var actual = sheet.getRange(1, startColumn, 1, proof.headerCount).getValues()[0];
  return staffSchemaMigrationHeaderProof(actual).headerHash === proof.headerHash;
}

function staffSchemaMigrationRollback(spreadsheet, journal) {
  var failures = [];
  var appended = (journal.appendedColumnRanges || []).slice().reverse();
  appended.forEach(function (item) {
    try {
      var sheet = spreadsheet.getSheetByName(item.sheetName);
      var width = item.endColumn - item.startColumn + 1;
      if (!sheet) throw new Error("Append target sheet is missing.");
      if (sheet.getLastColumn() < item.startColumn) return;
      if (sheet.getLastColumn() !== item.endColumn ||
          !staffSchemaMigrationHeadersMatch(sheet, item.startColumn, item) ||
          staffSchemaMigrationRangeHasDataBelow(sheet, item.startColumn, width)) {
        throw new Error("Appended columns are not provably unused.");
      }
      sheet.getRange(1, item.startColumn, 1, width).clearContent();
      if (item.insertedColumnCount) {
        sheet.deleteColumns(item.insertedColumnStart, item.insertedColumnCount);
      }
    } catch (error) {
      failures.push({
        operation: "APPEND_COLUMNS", sheetName: item.sheetName,
        message: String(error.message || error).slice(0, STAFF_SCHEMA_MIGRATION_ERROR_MESSAGE_MAX_LENGTH)
      });
    }
  });
  (journal.initializedBlankSheets || []).slice().reverse().forEach(function (item) {
    try {
      var sheet = spreadsheet.getSheetByName(item.sheetName);
      if (!sheet) throw new Error("Initialized sheet is missing.");
      if (!staffSchemaMigrationHeaderValues(sheet).filter(Boolean).length) return;
      if (sheet.getLastColumn() !== item.headerCount ||
          !staffSchemaMigrationHeadersMatch(sheet, 1, item) ||
          staffSchemaMigrationRangeHasDataBelow(sheet, 1, item.headerCount)) {
        throw new Error("Initialized headers are not provably unused.");
      }
      sheet.getRange(1, 1, 1, item.headerCount).clearContent();
      if (item.insertedColumnCount) {
        sheet.deleteColumns(item.insertedColumnStart, item.insertedColumnCount);
      }
    } catch (error) {
      failures.push({
        operation: "INITIALIZE_BLANK_SHEET", sheetName: item.sheetName,
        message: String(error.message || error).slice(0, STAFF_SCHEMA_MIGRATION_ERROR_MESSAGE_MAX_LENGTH)
      });
    }
  });
  (journal.createdSheets || []).slice().reverse().forEach(function (item) {
    try {
      var sheet = spreadsheet.getSheetByName(item.sheetName);
      if (!sheet) return;
      if (sheet.getLastRow() === 0) {
        spreadsheet.deleteSheet(sheet);
        return;
      }
      if (sheet.getLastColumn() !== item.headerCount ||
          !staffSchemaMigrationHeadersMatch(sheet, 1, item) ||
          sheet.getLastRow() > 1) {
        throw new Error("Created sheet is not provably header-only.");
      }
      spreadsheet.deleteSheet(sheet);
    } catch (error) {
      failures.push({
        operation: "CREATE_SHEET", sheetName: item.sheetName,
        message: String(error.message || error).slice(0, STAFF_SCHEMA_MIGRATION_ERROR_MESSAGE_MAX_LENGTH)
      });
    }
  });
  return failures;
}

function staffSchemaMigrationRecordOperation(journal, operation) {
  var proof = staffSchemaMigrationHeaderProof(operation.headers);
  if (operation.type === "CREATE_SHEET") {
    journal.createdSheetNames.push(operation.sheetName);
    journal.createdSheets = journal.createdSheets || [];
    journal.createdSheets.push({
      sheetName: operation.sheetName,
      headerCount: proof.headerCount,
      headerHash: proof.headerHash
    });
  } else if (operation.type === "INITIALIZE_BLANK_SHEET") {
    journal.initializedBlankSheets.push({
      sheetName: operation.sheetName,
      preExistingMaxColumns: operation.preExistingMaxColumns,
      insertedColumnStart: operation.insertedColumnStart,
      insertedColumnCount: operation.insertedColumnCount || 0,
      headerCount: proof.headerCount,
      headerHash: proof.headerHash
    });
  } else if (operation.type === "APPEND_COLUMNS") {
    journal.appendedColumnRanges.push({
      sheetName: operation.sheetName, startColumn: operation.startColumn,
      endColumn: operation.endColumn,
      preExistingMaxColumns: operation.preExistingMaxColumns,
      insertedColumnStart: operation.insertedColumnStart,
      insertedColumnCount: operation.insertedColumnCount || 0,
      headerCount: proof.headerCount,
      headerHash: proof.headerHash
    });
  }
}

function staffSchemaMigrationOperationProof(operation) {
  var proof = staffSchemaMigrationHeaderProof(operation.headers);
  return {
    type: operation.type,
    sheetName: operation.sheetName,
    startColumn: operation.startColumn || 1,
    endColumn: operation.endColumn || proof.headerCount,
    preExistingMaxColumns: operation.preExistingMaxColumns,
    insertedColumnStart: operation.insertedColumnStart || 0,
    insertedColumnCount: operation.insertedColumnCount || 0,
    headerCount: proof.headerCount,
    headerHash: proof.headerHash
  };
}

function staffSchemaMigrationExecute(phase, data) {
  if (!data || typeof data !== "object") {
    throw staffSchemaMigrationError(
      "MIGRATION_CONFIRMATION_REQUIRED", "No-argument migration execution is prohibited."
    );
  }
  var definition = staffSchemaMigrationPhaseDefinition(phase);
  var requestId = String(data.requestId || "").trim();
  var confirmationToken = String(data.confirmationToken || "").trim();
  if (!requestId || !confirmationToken) {
    throw staffSchemaMigrationError(
      "MIGRATION_CONFIRMATION_REQUIRED", "requestId and confirmationToken are required."
    );
  }
  var identity = staffSchemaMigrationIdentityAndOwner();
  return staffSchemaMigrationTryLocks(function () {
    var prepared = staffSchemaMigrationReadPreparedToken(definition.phase, confirmationToken);
    var token = prepared.record;
    if (token.phase !== definition.phase || token.requestId !== requestId ||
        token.spreadsheetId !== identity.spreadsheet.getId() ||
        token.actorIdentity !== identity.actorIdentity) {
      throw staffSchemaMigrationError("MIGRATION_TOKEN_MISMATCH", "Confirmation token binding is invalid.");
    }
    var journalKey = staffSchemaMigrationJournalKey(
      definition.phase, requestId, identity.spreadsheet.getId(), identity.actorIdentity
    );
    var journal = staffSchemaMigrationReadJson(PropertiesService.getScriptProperties(), journalKey);
    if (!journal || journal.requestFingerprint !== token.requestFingerprint ||
        journal.exactPlanHash !== token.exactPlanHash) {
      throw staffSchemaMigrationError("MIGRATION_PREPARED_STATE_MISMATCH", "Prepared journal does not match token.");
    }
    if (journal.status === "COMMITTED") {
      prepared.store.deleteProperty(prepared.key);
      return journal.finalResult;
    }
    if (journal.status !== "PREPARED") {
      throw staffSchemaMigrationError("MIGRATION_REQUEST_NOT_EXECUTABLE", "Migration request is not PREPARED.");
    }
    staffSchemaMigrationAssertExecutionOrder(definition, identity);
    var plan = staffSchemaMigrationAssertPreview(definition.preview(), identity);
    var planHash = staffSchemaMigrationPlanHash(plan);
    var fingerprint = staffSchemaMigrationFingerprint(
      definition, requestId, planHash, identity, journal.requestContext
    );
    if (planHash !== token.exactPlanHash || fingerprint !== token.requestFingerprint) {
      throw staffSchemaMigrationError("MIGRATION_PLAN_HASH_MISMATCH", "Schema changed after preparation.");
    }
    prepared.store.deleteProperty(prepared.key);
    journal.status = "APPLYING";
    staffSchemaMigrationWriteJournal(journalKey, journal);
    try {
      staffSchemaMigrationOperations(plan).forEach(function (operation) {
        operation = staffSchemaMigrationEnrichOperation(identity.spreadsheet, operation);
        journal.inFlightOperation = staffSchemaMigrationOperationProof(operation);
        staffSchemaMigrationRecordOperation(journal, operation);
        staffSchemaMigrationWriteJournal(journalKey, journal);
        staffSchemaMigrationApplyOperation(identity.spreadsheet, operation);
        journal.writes += 1;
        journal.inFlightOperation = null;
        staffSchemaMigrationWriteJournal(journalKey, journal);
      });
      var verification = staffSchemaMigrationAssertPreview(definition.preview(), identity);
      if (staffSchemaMigrationPendingOperations(verification) !== 0) {
        throw staffSchemaMigrationError("MIGRATION_FINAL_VERIFICATION_FAILED", "Final schema is incomplete.");
      }
      var result = {
        status: "COMMITTED", migrationId: definition.migrationId,
        phase: definition.phase, requestId: requestId,
        schemaVersion: journal.schemaVersion, exactPlanHash: planHash,
        expectedSpreadsheetId: identity.spreadsheet.getId(), actorIdentity: identity.actorIdentity,
        createdSheetNames: journal.createdSheetNames.slice(),
        appendedColumnRanges: journal.appendedColumnRanges.slice(),
        writes: journal.writes, historicalRowsTouched: 0,
        completedTimestamp: staffSchemaMigrationNow()
      };
      journal.status = "COMMITTED";
      journal.completedTimestamp = result.completedTimestamp;
      journal.finalResult = result;
      staffSchemaMigrationWriteJournal(journalKey, journal);
      return result;
    } catch (caught) {
      journal.inFlightOperation = null;
      journal.errorDetails.push(staffSchemaMigrationErrorDetail(caught));
      var rollbackFailures = staffSchemaMigrationRollback(identity.spreadsheet, journal);
      if (rollbackFailures.length) {
        journal.status = "RECOVERY_REQUIRED";
        journal.errorDetails = journal.errorDetails.concat(rollbackFailures);
      } else {
        journal.status = "ROLLED_BACK";
        journal.completedTimestamp = staffSchemaMigrationNow();
      }
      staffSchemaMigrationWriteJournal(journalKey, journal);
      if (rollbackFailures.length) {
        throw staffSchemaMigrationError(
          "MIGRATION_RECOVERY_REQUIRED", "Migration rollback could not be proven safe.", rollbackFailures
        );
      }
      throw caught;
    }
  });
}

function executeStaffScheduleMigrationStaging(data) {
  return staffSchemaMigrationExecute("PHASE2", data);
}

function executeAttendanceMigrationStaging(data) {
  return staffSchemaMigrationExecute("PHASE3", data);
}

function executePayrollPhase4MigrationStaging(data) {
  return staffSchemaMigrationExecute("PHASE4", data);
}

function executeBranchFoundationMigrationStaging(data) {
  return staffSchemaMigrationExecute("BRANCH_FOUNDATION", data);
}

function staffSchemaMigrationExecutePrepared(phase) {
  var definition = staffSchemaMigrationPhaseDefinition(phase);
  var record = staffSchemaMigrationReadJson(
    PropertiesService.getUserProperties(), staffSchemaMigrationTokenKey(definition.phase)
  );
  if (!record) {
    throw staffSchemaMigrationError(
      "MIGRATION_CONFIRMATION_REQUIRED", "Run the matching prepare function immediately before execution."
    );
  }
  return staffSchemaMigrationExecute(definition.phase, {
    requestId: record.requestId,
    confirmationToken: record.token
  });
}

function executePreparedStaffScheduleMigrationStaging() {
  return staffSchemaMigrationExecutePrepared("PHASE2");
}

function executePreparedAttendanceMigrationStaging() {
  return staffSchemaMigrationExecutePrepared("PHASE3");
}

function executePreparedPayrollPhase4MigrationStaging() {
  return staffSchemaMigrationExecutePrepared("PHASE4");
}

function executePreparedBranchFoundationMigrationStaging() {
  return staffSchemaMigrationExecutePrepared("BRANCH_FOUNDATION");
}

function staffSchemaMigrationDiagnostic(statuses) {
  staffSchemaMigrationIdentityAndOwner();
  var properties = PropertiesService.getScriptProperties().getProperties();
  var results = Object.keys(properties).filter(function (key) {
    return key.indexOf(STAFF_SCHEMA_MIGRATION_JOURNAL_PREFIX) === 0;
  }).map(function (key) {
    try { return JSON.parse(properties[key]); } catch (_error) { return null; }
  }).filter(Boolean).filter(function (journal) {
    return !statuses || statuses.indexOf(journal.status) !== -1;
  }).map(function (journal) {
    var manualRemediation = [];
    if (["APPLYING", "RECOVERY_REQUIRED"].indexOf(journal.status) !== -1) {
      manualRemediation.push(
        "Do not rerun this phase. Preserve a Spreadsheet backup and compare every item below before any manual change."
      );
      (journal.createdSheets || []).forEach(function (item) {
        manualRemediation.push(
          "Created sheet " + item.sheetName + ": delete only if it is completely empty, or if it has no rows " +
          "below row 1, its last used column equals " + item.headerCount +
          ", and row 1 hash equals " + item.headerHash + "."
        );
      });
      (journal.appendedColumnRanges || []).forEach(function (item) {
        manualRemediation.push(
          "Appended columns " + item.sheetName + "!" + item.startColumn + ":" + item.endColumn +
          ": if they are still trailing, their header hash equals " + item.headerHash +
          ", and every cell below row 1 has neither a value nor a formula, clear only the row 1 headers" +
          (item.insertedColumnCount
            ? " and delete only request-created physical columns " + item.insertedColumnStart + ":" + item.endColumn
            : "; do not delete any physical column") + "."
        );
      });
      (journal.initializedBlankSheets || []).forEach(function (item) {
        manualRemediation.push(
          "Initialized sheet " + item.sheetName + ": clear only row 1 columns 1:" + item.headerCount +
          " if the header hash equals " + item.headerHash +
          " and no value or formula exists below" +
          (item.insertedColumnCount
            ? "; delete only request-created physical columns " + item.insertedColumnStart + ":" + item.headerCount
            : "; do not delete any physical column") + "."
        );
      });
    }
    return {
      migrationId: journal.migrationId, schemaVersion: journal.schemaVersion,
      phase: journal.phase, requestId: journal.requestId, actorIdentity: journal.actorIdentity,
      expectedSpreadsheetId: journal.expectedSpreadsheetId,
      startedTimestamp: journal.startedTimestamp, completedTimestamp: journal.completedTimestamp,
      status: journal.status, exactPlanHash: journal.exactPlanHash,
      createdSheetNames: journal.createdSheetNames || [],
      appendedColumnRanges: journal.appendedColumnRanges || [],
      initializedBlankSheets: journal.initializedBlankSheets || [],
      inFlightOperation: journal.inFlightOperation || null,
      errorDetails: journal.errorDetails || [], writes: journal.writes || 0,
      manualRemediation: manualRemediation
    };
  });
  console.log(JSON.stringify(results));
  return results;
}

function diagnosticMigrationExecutionStatus() {
  return staffSchemaMigrationDiagnostic(null);
}

function diagnosticMigrationRecoveryStatus() {
  return staffSchemaMigrationDiagnostic(["APPLYING", "ROLLED_BACK", "RECOVERY_REQUIRED"]);
}
