/* global SpreadsheetApp, PropertiesService, LockService, Utilities, Session, DriveApp, ScriptApp, console,
  previewStaffScheduleMigration, previewAttendanceMigration, previewPayrollPhase4Migration,
  previewBranchFoundationMigration */

/**
 * CUT HUB POS — Production Staff/Attendance/Payroll/Branch Migration Runner
 * REVIEW DRAFT — execution is intentionally DISARMED.
 *
 * Purpose:
 * - production-only identity pinning
 * - zero-write previews for Phase 2 / Phase 3 / Phase 4 / Branch Foundation
 * - deterministic plan hashing
 * - owner-only prepare tokens
 * - generic create-sheet / initialize-blank-sheet / append-column execution model
 * - rollback journal
 *
 * IMPORTANT:
 * - This file is NOT routed through doGet/doPost.
 * - PHASE5 execution is intentionally unsupported here.
 * - PROD_MIGRATION_EXECUTION_ARMED must remain false until a separate code-review,
 *   test pass, Git authorization, Apps Script upload/version/deployment authorization,
 *   and per-phase Production execution authorization are completed.
 */

var PROD_MIGRATION_EXECUTION_ARMED = false;

var PROD_MIGRATION_EXPECTED_SCRIPT_ID =
  "1UmjdRMGLukMt_0Be_ZL2krphwtZ-CQHPOiZ3GF10pY9-glgvoubfGflP";
var PROD_MIGRATION_EXPECTED_SPREADSHEET_ID =
  "1r0I9J-IZF1GhMC4Yvj73S8VdjJQxMfmOgP4v0ZFNOb0";
var PROD_MIGRATION_ENVIRONMENT_PROPERTY = "CUT_HUB_ENVIRONMENT";
var PROD_MIGRATION_SPREADSHEET_PROPERTY = "CUT_HUB_PRODUCTION_SPREADSHEET_ID";

var PROD_MIGRATION_JOURNAL_PREFIX = "CUT_HUB_PROD_PHASE_SCHEMA_JOURNAL_V1_";
var PROD_MIGRATION_TOKEN_PREFIX = "CUT_HUB_PROD_PHASE_SCHEMA_TOKEN_V1_";
var PROD_MIGRATION_TOKEN_TTL_MS = 5 * 60 * 1000;
var PROD_MIGRATION_LOCK_TIMEOUT_MS = 30000;
var PROD_MIGRATION_ERROR_MAX = 500;

function prodMigrationError(code, message, details) {
  var error = new Error(message || code);
  error.code = code;
  if (details !== undefined) error.details = details;
  return error;
}

function prodMigrationText(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function prodMigrationCanonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map(prodMigrationCanonical).join(",") + "]";
  }
  return "{" + Object.keys(value).sort().map(function (key) {
    return JSON.stringify(key) + ":" + prodMigrationCanonical(value[key]);
  }).join(",") + "}";
}

function prodMigrationHash(value) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    prodMigrationCanonical(value),
    Utilities.Charset.UTF_8
  );
  return "sha256:" + bytes.map(function (value) {
    var byte = value < 0 ? value + 256 : value;
    return ("0" + byte.toString(16)).slice(-2);
  }).join("");
}

function prodMigrationNow() {
  return new Date().toISOString();
}

function prodMigrationPhaseDefinition(phase) {
  var key = prodMigrationText(phase).toUpperCase();
  var definitions = {
    PHASE2: {
      phase: "PHASE2",
      migrationId: "STAFF_SCHEDULING_PHASE2_SCHEMA",
      previousPhase: "",
      preview: function () {
        return previewStaffScheduleMigration({ environmentReviewApproved: true });
      }
    },
    PHASE3: {
      phase: "PHASE3",
      migrationId: "ATTENDANCE_PHASE3_SCHEMA",
      previousPhase: "PHASE2",
      preview: function () {
        return previewAttendanceMigration({});
      }
    },
    PHASE4: {
      phase: "PHASE4",
      migrationId: "PAYROLL_ATTENDANCE_PHASE4_SCHEMA",
      previousPhase: "PHASE3",
      preview: function () {
        return previewPayrollPhase4Migration({});
      }
    },
    BRANCH_FOUNDATION: {
      phase: "BRANCH_FOUNDATION",
      migrationId: "BRANCH_FOUNDATION_V1",
      previousPhase: "",
      preview: function () {
        return previewBranchFoundationMigration({});
      }
    }
  };
  if (key === "PHASE5") {
    throw prodMigrationError(
      "PHASE5_EXECUTION_UNSUPPORTED",
      "Phase 5 execution is intentionally not implemented in this runner. Use a separately reviewed Phase 5 Production migration package."
    );
  }
  if (!definitions[key]) {
    throw prodMigrationError("MIGRATION_PHASE_INVALID", "Unsupported Production migration phase.");
  }
  return definitions[key];
}

function prodMigrationIdentity() {
  var props = PropertiesService.getScriptProperties();

  var environment = prodMigrationText(
    props.getProperty(PROD_MIGRATION_ENVIRONMENT_PROPERTY)
  ).toLowerCase();
  if (environment !== "production") {
    throw prodMigrationError(
      "PRODUCTION_ENVIRONMENT_REQUIRED",
      "CUT_HUB_ENVIRONMENT must equal production."
    );
  }

  var configuredSpreadsheetId = prodMigrationText(
    props.getProperty(PROD_MIGRATION_SPREADSHEET_PROPERTY)
  );
  if (!configuredSpreadsheetId) {
    throw prodMigrationError(
      "PRODUCTION_SPREADSHEET_PIN_REQUIRED",
      "CUT_HUB_PRODUCTION_SPREADSHEET_ID is required."
    );
  }
  if (configuredSpreadsheetId !== PROD_MIGRATION_EXPECTED_SPREADSHEET_ID) {
    throw prodMigrationError(
      "PRODUCTION_SPREADSHEET_PIN_MISMATCH",
      "Configured Production spreadsheet does not match the reviewed Production spreadsheet."
    );
  }

  var scriptId = prodMigrationText(ScriptApp.getScriptId());
  if (scriptId !== PROD_MIGRATION_EXPECTED_SCRIPT_ID) {
    throw prodMigrationError(
      "PRODUCTION_SCRIPT_ID_MISMATCH",
      "Runner is not executing inside the reviewed Production Apps Script project."
    );
  }

  var spreadsheet = SpreadsheetApp.getActive();
  if (!spreadsheet || prodMigrationText(spreadsheet.getId()) !== configuredSpreadsheetId) {
    throw prodMigrationError(
      "PRODUCTION_ACTIVE_SPREADSHEET_MISMATCH",
      "Active spreadsheet is not the pinned Production spreadsheet."
    );
  }

  var effectiveEmail = prodMigrationText(Session.getEffectiveUser().getEmail()).toLowerCase();
  var activeEmail = prodMigrationText(Session.getActiveUser().getEmail()).toLowerCase();
  var ownerEmail = "";
  try {
    var file = DriveApp.getFileById(spreadsheet.getId());
    var owner = file && file.getOwner ? file.getOwner() : null;
    ownerEmail = prodMigrationText(owner && owner.getEmail ? owner.getEmail() : "").toLowerCase();
  } catch (_ownerError) {
    ownerEmail = "";
  }
  if (!effectiveEmail || !activeEmail || !ownerEmail ||
      effectiveEmail !== activeEmail || activeEmail !== ownerEmail) {
    throw prodMigrationError(
      "PRODUCTION_OWNER_REQUIRED",
      "Only the verified Production spreadsheet owner may run migration controls."
    );
  }

  return {
    environment: environment,
    scriptId: scriptId,
    spreadsheet: spreadsheet,
    spreadsheetId: spreadsheet.getId(),
    spreadsheetName: spreadsheet.getName(),
    timezone: spreadsheet.getSpreadsheetTimeZone(),
    actorIdentity: activeEmail
  };
}

function prodMigrationPlanHash(plan) {
  plan = plan || {};
  return prodMigrationHash({
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
    conflicts: plan.conflicts || [],
    rollback: plan.rollback || {},
    safe: plan.safe
  });
}

function prodMigrationPendingOperations(plan) {
  return (plan.createSheets || []).length +
    (plan.initializeBlankSheets || []).length +
    Object.keys(plan.appendColumns || {}).length;
}

function prodMigrationAssertZeroWritePreview(plan, identity) {
  var errors = plan && Array.isArray(plan.errors) ? plan.errors : [];
  var conflicts = plan && Array.isArray(plan.conflicts) ? plan.conflicts : [];

  if (!plan || plan.dryRun !== true || Number(plan.writes) !== 0) {
    throw prodMigrationError(
      "MIGRATION_PREVIEW_NOT_ZERO_WRITE",
      "Production migration preview must be dryRun=true and writes=0."
    );
  }
  if (errors.length || conflicts.length) {
    throw prodMigrationError(
      "MIGRATION_PREVIEW_HAS_BLOCKERS",
      "Production migration preview contains errors or conflicts.",
      { errors: errors, conflicts: conflicts }
    );
  }

  var planIdentity = plan.identity || {};
  var environment = prodMigrationText(planIdentity.environment).toLowerCase();
  var expectedId = prodMigrationText(planIdentity.expectedSpreadsheetId);
  var actualId = prodMigrationText(planIdentity.actualSpreadsheetId);

  if (environment && environment !== "production") {
    throw prodMigrationError(
      "MIGRATION_PREVIEW_ENVIRONMENT_MISMATCH",
      "Preview did not identify Production."
    );
  }
  if (expectedId && expectedId !== identity.spreadsheetId) {
    throw prodMigrationError(
      "MIGRATION_PREVIEW_EXPECTED_ID_MISMATCH",
      "Preview expected spreadsheet ID differs from reviewed Production."
    );
  }
  if (actualId && actualId !== identity.spreadsheetId) {
    throw prodMigrationError(
      "MIGRATION_PREVIEW_ACTUAL_ID_MISMATCH",
      "Preview actual spreadsheet ID differs from reviewed Production."
    );
  }

  return plan;
}

function previewProductionMigrationPhase(phase) {
  var identity = prodMigrationIdentity();
  var definition = prodMigrationPhaseDefinition(phase);
  var plan = prodMigrationAssertZeroWritePreview(definition.preview(), identity);

  var result = {
    mode: "PRODUCTION_ZERO_WRITE_PREVIEW",
    phase: definition.phase,
    migrationId: definition.migrationId,
    environment: identity.environment,
    scriptId: identity.scriptId,
    spreadsheetId: identity.spreadsheetId,
    spreadsheetName: identity.spreadsheetName,
    timezone: identity.timezone,
    actorIdentity: identity.actorIdentity,
    dryRun: true,
    writes: 0,
    executionArmed: PROD_MIGRATION_EXECUTION_ARMED === true,
    planHash: prodMigrationPlanHash(plan),
    pendingOperations: prodMigrationPendingOperations(plan),
    createSheets: plan.createSheets || [],
    initializeBlankSheets: plan.initializeBlankSheets || [],
    appendColumns: plan.appendColumns || {},
    unchangedSheets: plan.unchangedSheets || [],
    preservedUnknownColumns: plan.preservedUnknownColumns || {},
    safe: plan.safe === true,
    executionAllowedByPlanner: plan.executionAllowed === true,
    errors: plan.errors || [],
    conflicts: plan.conflicts || [],
    rollback: plan.rollback || {}
  };

  console.log(JSON.stringify(result, null, 2));
  return result;
}

function previewProductionPhase2Migration() {
  return previewProductionMigrationPhase("PHASE2");
}
function previewProductionPhase3Migration() {
  return previewProductionMigrationPhase("PHASE3");
}
function previewProductionPhase4Migration() {
  return previewProductionMigrationPhase("PHASE4");
}
function previewProductionBranchFoundationMigration() {
  return previewProductionMigrationPhase("BRANCH_FOUNDATION");
}

function prodMigrationTokenKey(phase) {
  return PROD_MIGRATION_TOKEN_PREFIX + prodMigrationText(phase).toUpperCase();
}

function prodMigrationJournalKey(phase, requestId, spreadsheetId, actorIdentity) {
  return PROD_MIGRATION_JOURNAL_PREFIX +
    prodMigrationText(phase).toUpperCase() + "_" +
    prodMigrationHash(spreadsheetId).slice(7, 23) + "_" +
    prodMigrationHash(actorIdentity).slice(7, 23) + "_" +
    prodMigrationHash(requestId).slice(7, 23);
}

function prodMigrationReadJson(store, key) {
  var raw = store.getProperty(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_error) {
    throw prodMigrationError("MIGRATION_STATE_CORRUPT", "Stored migration state is invalid JSON.");
  }
}

function prodMigrationWithLocks(callback) {
  var scriptLock = LockService.getScriptLock();
  var documentLock = LockService.getDocumentLock ? LockService.getDocumentLock() : null;

  if (!scriptLock.tryLock(PROD_MIGRATION_LOCK_TIMEOUT_MS)) {
    throw prodMigrationError("MIGRATION_CONCURRENT_EXECUTION", "Another migration is active.");
  }

  var documentLocked = false;
  try {
    if (documentLock) {
      documentLocked = documentLock.tryLock(PROD_MIGRATION_LOCK_TIMEOUT_MS);
      if (!documentLocked) {
        throw prodMigrationError("MIGRATION_CONCURRENT_EXECUTION", "Spreadsheet migration lock is active.");
      }
    }
    return callback();
  } finally {
    if (documentLock && documentLocked) documentLock.releaseLock();
    scriptLock.releaseLock();
  }
}

function prepareProductionMigrationPhase(phase, data) {
  if (PROD_MIGRATION_EXECUTION_ARMED !== true) {
    throw prodMigrationError(
      "PRODUCTION_EXECUTION_DISARMED",
      "Execution is intentionally disarmed in this review draft. Preview functions remain available."
    );
  }

  data = data && typeof data === "object" ? data : {};
  var identity = prodMigrationIdentity();
  var definition = prodMigrationPhaseDefinition(phase);
  var plan = prodMigrationAssertZeroWritePreview(definition.preview(), identity);

  if (plan.safe !== true) {
    throw prodMigrationError(
      "MIGRATION_PREVIEW_NOT_SAFE",
      "Planner did not mark the Production preview safe."
    );
  }

  var requestId = prodMigrationText(data.requestId);
  var requestContext = prodMigrationText(data.requestContext);
  if (!requestId || requestId.length > 160) {
    throw prodMigrationError("MIGRATION_REQUEST_ID_INVALID", "A valid requestId is required.");
  }

  return prodMigrationWithLocks(function () {
    var planHash = prodMigrationPlanHash(plan);
    var token = Utilities.getUuid() + "-" + Utilities.getUuid();
    var expiresAt = new Date(Date.now() + PROD_MIGRATION_TOKEN_TTL_MS).toISOString();
    var journalKey = prodMigrationJournalKey(
      definition.phase, requestId, identity.spreadsheetId, identity.actorIdentity
    );
    var tokenRecord = {
      tokenHash: prodMigrationHash(token),
      phase: definition.phase,
      migrationId: definition.migrationId,
      requestId: requestId,
      requestContext: requestContext,
      planHash: planHash,
      spreadsheetId: identity.spreadsheetId,
      scriptId: identity.scriptId,
      actorIdentity: identity.actorIdentity,
      expiresAt: expiresAt
    };
    var journal = {
      status: "PREPARED",
      phase: definition.phase,
      migrationId: definition.migrationId,
      requestId: requestId,
      requestContext: requestContext,
      exactPlanHash: planHash,
      expectedSpreadsheetId: identity.spreadsheetId,
      expectedScriptId: identity.scriptId,
      actorIdentity: identity.actorIdentity,
      createdAt: prodMigrationNow(),
      updatedAt: prodMigrationNow(),
      createdSheets: [],
      initializedBlankSheets: [],
      appendedColumnRanges: [],
      writes: 0,
      errorDetails: []
    };

    PropertiesService.getScriptProperties().setProperty(journalKey, JSON.stringify(journal));
    PropertiesService.getUserProperties().setProperty(
      prodMigrationTokenKey(definition.phase),
      JSON.stringify(tokenRecord)
    );

    return {
      status: "PREPARED",
      phase: definition.phase,
      requestId: requestId,
      confirmationToken: token,
      expiresAt: expiresAt,
      exactPlanHash: planHash,
      spreadsheetId: identity.spreadsheetId,
      scriptId: identity.scriptId,
      pendingOperations: prodMigrationPendingOperations(plan)
    };
  });
}

/**
 * Intentionally hard-blocked until the reviewed production executor is completed.
 * This prevents this draft from performing any sheet mutation if accidentally uploaded.
 */
function executePreparedProductionMigrationPhase() {
  throw prodMigrationError(
    "PRODUCTION_EXECUTION_NOT_IMPLEMENTED",
    "Prepared Production execution is intentionally absent from the review draft."
  );
}

function diagnosticProductionMigrationRunner() {
  var identity = prodMigrationIdentity();
  return {
    status: "READY_FOR_ZERO_WRITE_PREVIEW",
    executionArmed: PROD_MIGRATION_EXECUTION_ARMED === true,
    scriptId: identity.scriptId,
    spreadsheetId: identity.spreadsheetId,
    spreadsheetName: identity.spreadsheetName,
    environment: identity.environment,
    timezone: identity.timezone,
    actorIdentity: identity.actorIdentity,
    supportedPreviewPhases: ["PHASE2", "PHASE3", "PHASE4", "BRANCH_FOUNDATION"],
    phase5ExecutionSupported: false
  };
}


/* =========================
 * V2 REVIEW EXECUTOR ENGINE
 * =========================
 *
 * This section implements the reviewed generic execution/rollback mechanics.
 * IMPORTANT: PROD_MIGRATION_EXECUTION_ARMED remains false by default.
 * Nothing here can be reached from prepare while disarmed.
 */

function prodMigrationHeaderValues(sheet) {
  var lastColumn = sheet.getLastColumn();
  if (!lastColumn) return [];
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function (value) {
    return prodMigrationText(value).toUpperCase()
      .replace(/[\s-]+/g, "_").replace(/_+/g, "_");
  });
}

function prodMigrationEnsureColumns(sheet, count) {
  var maximum = sheet.getMaxColumns ? sheet.getMaxColumns() : sheet.getLastColumn();
  if (maximum < count) {
    sheet.insertColumnsAfter(Math.max(1, maximum), count - maximum);
  }
}

function prodMigrationOperations(plan) {
  var operations = [];
  (plan.createSheets || []).forEach(function (item) {
    operations.push({
      type: "CREATE_SHEET",
      sheetName: item.sheetName,
      headers: (item.headers || []).slice()
    });
  });
  (plan.initializeBlankSheets || []).forEach(function (item) {
    operations.push({
      type: "INITIALIZE_BLANK_SHEET",
      sheetName: item.sheetName,
      headers: (item.headers || []).slice()
    });
  });
  (plan.rollback && plan.rollback.appendedColumnRanges || []).forEach(function (item) {
    operations.push({
      type: "APPEND_COLUMNS",
      sheetName: item.sheetName,
      startColumn: item.startColumn,
      endColumn: item.endColumn,
      headers: (item.headers || []).slice()
    });
  });
  return operations;
}

function prodMigrationHeaderProof(headers) {
  var normalized = (headers || []).map(function (value) {
    return prodMigrationText(value).toUpperCase()
      .replace(/[\s-]+/g, "_").replace(/_+/g, "_");
  });
  return {
    headerCount: normalized.length,
    headerHash: prodMigrationHash(normalized)
  };
}

function prodMigrationHeadersMatch(sheet, startColumn, proof) {
  if (!proof.headerCount) return true;
  var actual = sheet.getRange(1, startColumn, 1, proof.headerCount).getValues()[0];
  return prodMigrationHeaderProof(actual).headerHash === proof.headerHash;
}

function prodMigrationRangeHasDataBelow(sheet, startColumn, width) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  var range = sheet.getRange(2, startColumn, lastRow - 1, width);
  var values = range.getValues();
  var hasValues = values.some(function (row) {
    return row.some(function (value) {
      return value !== "" && value !== null && value !== undefined;
    });
  });
  var hasFormulas = typeof range.getFormulas === "function" &&
    range.getFormulas().some(function (row) {
      return row.some(function (formula) { return prodMigrationText(formula) !== ""; });
    });
  return hasValues || hasFormulas;
}

function prodMigrationEnrichOperation(spreadsheet, operation) {
  if (operation.type === "CREATE_SHEET") return operation;
  var sheet = spreadsheet.getSheetByName(operation.sheetName);
  if (!sheet) return operation;

  var maximum = sheet.getMaxColumns ? sheet.getMaxColumns() : sheet.getLastColumn();
  var required = operation.type === "APPEND_COLUMNS"
    ? operation.endColumn
    : operation.headers.length;

  operation.preExistingMaxColumns = maximum;
  operation.insertedColumnCount = Math.max(0, required - maximum);
  operation.insertedColumnStart = operation.insertedColumnCount
    ? required - operation.insertedColumnCount + 1
    : 0;

  return operation;
}

function prodMigrationApplyOperation(spreadsheet, operation) {
  var sheet;

  if (operation.type === "CREATE_SHEET") {
    if (spreadsheet.getSheetByName(operation.sheetName)) {
      throw prodMigrationError("MIGRATION_STATE_CHANGED", "A planned missing sheet now exists.");
    }
    sheet = spreadsheet.insertSheet(operation.sheetName);
    prodMigrationEnsureColumns(sheet, operation.headers.length);
    if (operation.headers.length) {
      sheet.getRange(1, 1, 1, operation.headers.length).setValues([operation.headers]);
    }
    return;
  }

  sheet = spreadsheet.getSheetByName(operation.sheetName);
  if (!sheet) {
    throw prodMigrationError("MIGRATION_STATE_CHANGED", "Planned sheet is missing.");
  }

  if (operation.type === "INITIALIZE_BLANK_SHEET") {
    if (prodMigrationHeaderValues(sheet).filter(Boolean).length) {
      throw prodMigrationError("MIGRATION_STATE_CHANGED", "Planned blank sheet is no longer blank.");
    }
    prodMigrationEnsureColumns(sheet, operation.headers.length);
    if (operation.headers.length) {
      sheet.getRange(1, 1, 1, operation.headers.length).setValues([operation.headers]);
    }
    return;
  }

  if (operation.type === "APPEND_COLUMNS") {
    var headers = prodMigrationHeaderValues(sheet);
    if (headers.length + 1 !== operation.startColumn) {
      throw prodMigrationError(
        "MIGRATION_STATE_CHANGED",
        "Append position changed after preview."
      );
    }

    prodMigrationEnsureColumns(sheet, operation.endColumn);
    sheet.getRange(1, operation.startColumn, 1, operation.headers.length)
      .setValues([operation.headers]);
    return;
  }

  throw prodMigrationError("MIGRATION_OPERATION_INVALID", "Unsupported migration operation.");
}

function prodMigrationRecordOperation(journal, operation) {
  var proof = prodMigrationHeaderProof(operation.headers);

  if (operation.type === "CREATE_SHEET") {
    journal.createdSheets.push({
      sheetName: operation.sheetName,
      headerCount: proof.headerCount,
      headerHash: proof.headerHash
    });
  } else if (operation.type === "INITIALIZE_BLANK_SHEET") {
    journal.initializedBlankSheets.push({
      sheetName: operation.sheetName,
      preExistingMaxColumns: operation.preExistingMaxColumns || 0,
      insertedColumnStart: operation.insertedColumnStart || 0,
      insertedColumnCount: operation.insertedColumnCount || 0,
      headerCount: proof.headerCount,
      headerHash: proof.headerHash
    });
  } else if (operation.type === "APPEND_COLUMNS") {
    journal.appendedColumnRanges.push({
      sheetName: operation.sheetName,
      startColumn: operation.startColumn,
      endColumn: operation.endColumn,
      preExistingMaxColumns: operation.preExistingMaxColumns || 0,
      insertedColumnStart: operation.insertedColumnStart || 0,
      insertedColumnCount: operation.insertedColumnCount || 0,
      headerCount: proof.headerCount,
      headerHash: proof.headerHash
    });
  }
}

function prodMigrationRollback(spreadsheet, journal) {
  var failures = [];

  (journal.appendedColumnRanges || []).slice().reverse().forEach(function (item) {
    try {
      var sheet = spreadsheet.getSheetByName(item.sheetName);
      var width = item.endColumn - item.startColumn + 1;
      if (!sheet) throw new Error("Append target sheet is missing.");

      if (sheet.getLastColumn() < item.startColumn) return;

      if (sheet.getLastColumn() !== item.endColumn ||
          !prodMigrationHeadersMatch(sheet, item.startColumn, item) ||
          prodMigrationRangeHasDataBelow(sheet, item.startColumn, width)) {
        throw new Error("Appended columns are not provably unused.");
      }

      sheet.getRange(1, item.startColumn, 1, width).clearContent();

      if (item.insertedColumnCount) {
        sheet.deleteColumns(item.insertedColumnStart, item.insertedColumnCount);
      }
    } catch (error) {
      failures.push({
        operation: "APPEND_COLUMNS",
        sheetName: item.sheetName,
        message: prodMigrationText(error && error.message || error).slice(0, PROD_MIGRATION_ERROR_MAX)
      });
    }
  });

  (journal.initializedBlankSheets || []).slice().reverse().forEach(function (item) {
    try {
      var sheet = spreadsheet.getSheetByName(item.sheetName);
      if (!sheet) throw new Error("Initialized sheet is missing.");

      if (!prodMigrationHeaderValues(sheet).filter(Boolean).length) return;

      if (sheet.getLastColumn() !== item.headerCount ||
          !prodMigrationHeadersMatch(sheet, 1, item) ||
          prodMigrationRangeHasDataBelow(sheet, 1, item.headerCount)) {
        throw new Error("Initialized headers are not provably unused.");
      }

      sheet.getRange(1, 1, 1, item.headerCount).clearContent();

      if (item.insertedColumnCount) {
        sheet.deleteColumns(item.insertedColumnStart, item.insertedColumnCount);
      }
    } catch (error) {
      failures.push({
        operation: "INITIALIZE_BLANK_SHEET",
        sheetName: item.sheetName,
        message: prodMigrationText(error && error.message || error).slice(0, PROD_MIGRATION_ERROR_MAX)
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
          !prodMigrationHeadersMatch(sheet, 1, item) ||
          sheet.getLastRow() > 1) {
        throw new Error("Created sheet is not provably header-only.");
      }

      spreadsheet.deleteSheet(sheet);
    } catch (error) {
      failures.push({
        operation: "CREATE_SHEET",
        sheetName: item.sheetName,
        message: prodMigrationText(error && error.message || error).slice(0, PROD_MIGRATION_ERROR_MAX)
      });
    }
  });

  return failures;
}

function prodMigrationWriteJournal(key, journal) {
  journal.updatedAt = prodMigrationNow();
  var payload = JSON.stringify(journal);
  PropertiesService.getScriptProperties().setProperty(key, payload);
}

function prodMigrationReadPreparedToken(phase, suppliedToken) {
  var store = PropertiesService.getUserProperties();
  var key = prodMigrationTokenKey(phase);
  var record = prodMigrationReadJson(store, key);

  if (!record || !suppliedToken || record.tokenHash !== prodMigrationHash(suppliedToken)) {
    throw prodMigrationError(
      "MIGRATION_TOKEN_INVALID",
      "Confirmation token is invalid or already consumed."
    );
  }

  if (Date.parse(record.expiresAt || "") <= Date.now()) {
    store.deleteProperty(key);
    throw prodMigrationError("MIGRATION_TOKEN_EXPIRED", "Confirmation token has expired.");
  }

  return { key: key, record: record, store: store };
}

function executePreparedProductionMigrationPhaseV2(phase, data) {
  if (PROD_MIGRATION_EXECUTION_ARMED !== true) {
    throw prodMigrationError(
      "PRODUCTION_EXECUTION_DISARMED",
      "Production execution is intentionally disarmed."
    );
  }
  if (!data || typeof data !== "object") {
    throw prodMigrationError(
      "MIGRATION_CONFIRMATION_REQUIRED",
      "requestId and confirmationToken are required."
    );
  }

  var requestId = prodMigrationText(data.requestId);
  var confirmationToken = prodMigrationText(data.confirmationToken);
  if (!requestId || !confirmationToken) {
    throw prodMigrationError(
      "MIGRATION_CONFIRMATION_REQUIRED",
      "requestId and confirmationToken are required."
    );
  }

  var identity = prodMigrationIdentity();
  var definition = prodMigrationPhaseDefinition(phase);

  return prodMigrationWithLocks(function () {
    var prepared = prodMigrationReadPreparedToken(definition.phase, confirmationToken);
    var token = prepared.record;

    if (token.phase !== definition.phase ||
        token.requestId !== requestId ||
        token.spreadsheetId !== identity.spreadsheetId ||
        token.scriptId !== identity.scriptId ||
        token.actorIdentity !== identity.actorIdentity) {
      throw prodMigrationError("MIGRATION_TOKEN_MISMATCH", "Confirmation token binding is invalid.");
    }

    var journalKey = prodMigrationJournalKey(
      definition.phase,
      requestId,
      identity.spreadsheetId,
      identity.actorIdentity
    );
    var journal = prodMigrationReadJson(
      PropertiesService.getScriptProperties(),
      journalKey
    );

    if (!journal ||
        journal.exactPlanHash !== token.planHash ||
        journal.expectedSpreadsheetId !== identity.spreadsheetId ||
        journal.expectedScriptId !== identity.scriptId ||
        journal.actorIdentity !== identity.actorIdentity) {
      throw prodMigrationError(
        "MIGRATION_PREPARED_STATE_MISMATCH",
        "Prepared journal does not match the confirmation token."
      );
    }

    if (journal.status === "COMMITTED") {
      prepared.store.deleteProperty(prepared.key);
      return journal.finalResult;
    }

    if (journal.status !== "PREPARED") {
      throw prodMigrationError(
        "MIGRATION_REQUEST_NOT_EXECUTABLE",
        "Migration request is not PREPARED."
      );
    }

    var plan = prodMigrationAssertZeroWritePreview(definition.preview(), identity);
    if (plan.safe !== true) {
      throw prodMigrationError(
        "MIGRATION_PREVIEW_NOT_SAFE",
        "Planner did not mark the Production preview safe."
      );
    }

    var currentPlanHash = prodMigrationPlanHash(plan);
    if (currentPlanHash !== token.planHash) {
      throw prodMigrationError(
        "MIGRATION_PLAN_HASH_MISMATCH",
        "Schema changed after preparation."
      );
    }

    prepared.store.deleteProperty(prepared.key);
    journal.status = "APPLYING";
    prodMigrationWriteJournal(journalKey, journal);

    try {
      prodMigrationOperations(plan).forEach(function (operation) {
        operation = prodMigrationEnrichOperation(identity.spreadsheet, operation);
        journal.inFlightOperation = {
          type: operation.type,
          sheetName: operation.sheetName,
          startColumn: operation.startColumn || 1,
          endColumn: operation.endColumn || operation.headers.length,
          headerHash: prodMigrationHeaderProof(operation.headers).headerHash
        };
        prodMigrationRecordOperation(journal, operation);
        prodMigrationWriteJournal(journalKey, journal);

        prodMigrationApplyOperation(identity.spreadsheet, operation);

        journal.writes += 1;
        journal.inFlightOperation = null;
        prodMigrationWriteJournal(journalKey, journal);
      });

      var verification = prodMigrationAssertZeroWritePreview(
        definition.preview(),
        identity
      );

      if (prodMigrationPendingOperations(verification) !== 0) {
        throw prodMigrationError(
          "MIGRATION_FINAL_VERIFICATION_FAILED",
          "Final schema verification still reports pending operations."
        );
      }

      var result = {
        status: "COMMITTED",
        phase: definition.phase,
        migrationId: definition.migrationId,
        requestId: requestId,
        exactPlanHash: currentPlanHash,
        expectedSpreadsheetId: identity.spreadsheetId,
        expectedScriptId: identity.scriptId,
        actorIdentity: identity.actorIdentity,
        writes: journal.writes,
        historicalRowsTouched: 0,
        createdSheets: (journal.createdSheets || []).slice(),
        initializedBlankSheets: (journal.initializedBlankSheets || []).slice(),
        appendedColumnRanges: (journal.appendedColumnRanges || []).slice(),
        completedTimestamp: prodMigrationNow()
      };

      journal.status = "COMMITTED";
      journal.completedTimestamp = result.completedTimestamp;
      journal.finalResult = result;
      prodMigrationWriteJournal(journalKey, journal);
      return result;
    } catch (caught) {
      journal.inFlightOperation = null;
      journal.errorDetails = journal.errorDetails || [];
      journal.errorDetails.push({
        code: prodMigrationText(caught && caught.code || "MIGRATION_EXECUTION_FAILED"),
        message: prodMigrationText(caught && caught.message || caught).slice(0, PROD_MIGRATION_ERROR_MAX)
      });

      var rollbackFailures = prodMigrationRollback(identity.spreadsheet, journal);
      if (rollbackFailures.length) {
        journal.status = "RECOVERY_REQUIRED";
        journal.errorDetails = journal.errorDetails.concat(rollbackFailures);
      } else {
        journal.status = "ROLLED_BACK";
        journal.completedTimestamp = prodMigrationNow();
      }
      prodMigrationWriteJournal(journalKey, journal);

      if (rollbackFailures.length) {
        throw prodMigrationError(
          "MIGRATION_RECOVERY_REQUIRED",
          "Migration rollback could not be proven safe.",
          rollbackFailures
        );
      }

      throw caught;
    }
  });
}
