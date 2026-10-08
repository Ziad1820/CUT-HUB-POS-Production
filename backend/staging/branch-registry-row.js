/* global BookingAvailabilityPhase5, PropertiesService, Utilities, console,
  branchFoundationIdentity, branchFoundationNormalizeHeader,
  staffSchemaMigrationTryLocks, staffSchemaMigrationHash,
  staffSchemaMigrationJournalKey, staffSchemaMigrationTokenKey,
  staffSchemaMigrationReadJson, staffSchemaMigrationWriteJournal,
  staffSchemaMigrationNow, staffSchemaMigrationError */

var BRANCH_REGISTRY_ROW_VERSION = "CANONICAL_BRANCH_REGISTRY_ROW_V1";
var BRANCH_REGISTRY_ROW_PHASE = "BRANCH_REGISTRY_ROW";
var BRANCH_REGISTRY_ROW_SHEET = "BOOKING_BRANCH_REGISTRY";
var BRANCH_REGISTRY_ROW_TOKEN_TTL_MS = 5 * 60 * 1000;
var BRANCH_REGISTRY_ROW_APPROVED = Object.freeze({
  BRANCH_ID: "CUT_HUB_MAIN",
  BRANCH_NAME: "CUT HUB POS STAGING",
  ACTIVE: true,
  TIME_ZONE: "Africa/Cairo",
  PUBLIC_SELECTABLE: true,
  CLOSURE_STATUS: "OPEN",
  CLOSURE_REASON: ""
});

function branchRegistryRowContract() {
  if (typeof BookingAvailabilityPhase5 !== "undefined") return BookingAvailabilityPhase5;
  if (typeof require === "function") return require("./booking-availability-phase5");
  throw new Error("Booking Availability contract is unavailable.");
}

function branchRegistryRowExpectedHeaders() {
  return branchRegistryRowContract().SHEET_SCHEMAS[BRANCH_REGISTRY_ROW_SHEET].slice();
}

function branchRegistryRowNormalized(value) {
  if (typeof branchFoundationNormalizeHeader === "function") {
    return branchFoundationNormalizeHeader(value);
  }
  return String(value == null ? "" : value).trim().toUpperCase()
    .replace(/[\s-]+/g, "_").replace(/_+/g, "_");
}

function branchRegistryRowBusinessValues(row) {
  row = Array.isArray(row) ? row : [];
  return {
    BRANCH_ID: String(row[0] == null ? "" : row[0]).trim(),
    BRANCH_NAME: String(row[1] == null ? "" : row[1]).trim(),
    ACTIVE: row[2] === true || String(row[2]).trim().toLowerCase() === "true",
    TIME_ZONE: String(row[3] == null ? "" : row[3]).trim(),
    PUBLIC_SELECTABLE: row[4] === true || String(row[4]).trim().toLowerCase() === "true",
    CLOSURE_STATUS: String(row[5] == null ? "" : row[5]).trim().toUpperCase(),
    CLOSURE_REASON: String(row[6] == null ? "" : row[6]).trim()
  };
}

function branchRegistryRowBusinessEqual(left, right) {
  return Object.keys(BRANCH_REGISTRY_ROW_APPROVED).every(function (key) {
    return left[key] === right[key];
  });
}

function branchRegistryRowPreviewPlan(headers, rows, identity) {
  var expectedHeaders = branchRegistryRowExpectedHeaders();
  var normalizedHeaders = Array.isArray(headers) ? headers.map(branchRegistryRowNormalized) : [];
  var normalizedExpected = expectedHeaders.map(branchRegistryRowNormalized);
  var errors = [];
  if (normalizedHeaders.length !== normalizedExpected.length ||
      normalizedHeaders.some(function (header, index) {
        return header !== normalizedExpected[index];
      })) {
    errors.push({ code: "BRANCH_REGISTRY_HEADERS_INCOMPATIBLE" });
  }
  rows = Array.isArray(rows) ? rows : [];
  var exactMatches = rows.filter(function (row) {
    return String(row[0] == null ? "" : row[0]).trim() === BRANCH_REGISTRY_ROW_APPROVED.BRANCH_ID;
  });
  var caseVariants = rows.filter(function (row) {
    var branchId = String(row[0] == null ? "" : row[0]).trim();
    return branchId && branchId !== BRANCH_REGISTRY_ROW_APPROVED.BRANCH_ID &&
      branchId.toLowerCase() === BRANCH_REGISTRY_ROW_APPROVED.BRANCH_ID.toLowerCase();
  });
  if (exactMatches.length > 1) {
    errors.push({ code: "BRANCH_REGISTRY_DUPLICATE_ID", count: exactMatches.length });
  } else if (exactMatches.length === 1 && !branchRegistryRowBusinessEqual(
    branchRegistryRowBusinessValues(exactMatches[0]), BRANCH_REGISTRY_ROW_APPROVED
  )) {
    errors.push({ code: "BRANCH_REGISTRY_ID_CONFLICT" });
  }
  if (caseVariants.length) {
    errors.push({ code: "BRANCH_REGISTRY_CASE_AMBIGUOUS", count: caseVariants.length });
  }
  var identical = exactMatches.length === 1 && errors.length === 0;
  var operations = [];
  if (!errors.length && !identical) {
    operations.push({
      type: "APPEND_ROW",
      sheetName: BRANCH_REGISTRY_ROW_SHEET,
      values: {
        BRANCH_ID: BRANCH_REGISTRY_ROW_APPROVED.BRANCH_ID,
        BRANCH_NAME: BRANCH_REGISTRY_ROW_APPROVED.BRANCH_NAME,
        ACTIVE: BRANCH_REGISTRY_ROW_APPROVED.ACTIVE,
        TIME_ZONE: BRANCH_REGISTRY_ROW_APPROVED.TIME_ZONE,
        PUBLIC_SELECTABLE: BRANCH_REGISTRY_ROW_APPROVED.PUBLIC_SELECTABLE,
        CLOSURE_STATUS: BRANCH_REGISTRY_ROW_APPROVED.CLOSURE_STATUS,
        CLOSURE_REASON: BRANCH_REGISTRY_ROW_APPROVED.CLOSURE_REASON,
        CREATED_AT: "SERVER_TIMESTAMP",
        CREATED_BY: "VERIFIED_ACTOR",
        UPDATED_AT: "SERVER_TIMESTAMP",
        UPDATED_BY: "VERIFIED_ACTOR",
        LAST_REQUEST_ID: "EXECUTION_REQUEST_ID"
      }
    });
  }
  return {
    schemaVersion: BRANCH_REGISTRY_ROW_VERSION,
    version: BRANCH_REGISTRY_ROW_VERSION,
    dryRun: true,
    writes: 0,
    identity: {
      environment: String(identity && identity.environment || ""),
      expectedSpreadsheetId: String(identity && identity.expectedSpreadsheetId || ""),
      actualSpreadsheetId: String(identity && identity.actualSpreadsheetId || "")
    },
    sheetName: BRANCH_REGISTRY_ROW_SHEET,
    expectedHeaders: expectedHeaders,
    registryStateFingerprint: branchRegistryRowContract().hash({
      headers: normalizedHeaders,
      rows: rows
    }),
    proposedBranch: Object.assign({}, BRANCH_REGISTRY_ROW_APPROVED),
    operations: operations,
    unchanged: identical,
    errors: errors,
    safe: errors.length === 0
  };
}

function branchRegistryRowReadState(identity) {
  var sheet = identity.spreadsheet.getSheetByName(BRANCH_REGISTRY_ROW_SHEET);
  if (!sheet) {
    throw staffSchemaMigrationError(
      "BRANCH_REGISTRY_SCHEMA_NOT_READY", "BOOKING_BRANCH_REGISTRY is required."
    );
  }
  var lastColumn = sheet.getLastColumn();
  var headers = lastColumn ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0] : [];
  var lastRow = sheet.getLastRow();
  var rows = lastRow > 1
    ? sheet.getRange(2, 1, lastRow - 1, Math.max(1, lastColumn)).getValues()
    : [];
  return { sheet: sheet, headers: headers, rows: rows };
}

function previewCanonicalBranchRegistryRow() {
  var identity = branchFoundationIdentity();
  var state = branchRegistryRowReadState(identity);
  return branchRegistryRowPreviewPlan(state.headers, state.rows, identity);
}

function diagnosticPreviewCanonicalBranchRegistryRow() {
  var result = previewCanonicalBranchRegistryRow();
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function branchRegistryRowPlanHash(plan) {
  return staffSchemaMigrationHash({
    schemaVersion: plan.schemaVersion,
    identity: plan.identity,
    sheetName: plan.sheetName,
    expectedHeaders: plan.expectedHeaders,
    registryStateFingerprint: plan.registryStateFingerprint,
    proposedBranch: plan.proposedBranch,
    operations: plan.operations,
    unchanged: plan.unchanged,
    errors: plan.errors,
    safe: plan.safe,
    dryRun: plan.dryRun,
    writes: plan.writes
  });
}

function branchRegistryRowAssertPlan(plan) {
  if (!plan || plan.safe !== true || plan.dryRun !== true || Number(plan.writes) !== 0 ||
      !Array.isArray(plan.errors) || plan.errors.length !== 0 ||
      !Array.isArray(plan.operations) || plan.operations.length > 1) {
    throw staffSchemaMigrationError(
      "BRANCH_REGISTRY_PREVIEW_NOT_SAFE", "Canonical branch row preview is not executable."
    );
  }
  return plan;
}

function branchRegistryRowFingerprint(requestId, planHash, identity) {
  return staffSchemaMigrationHash({
    phase: BRANCH_REGISTRY_ROW_PHASE,
    version: BRANCH_REGISTRY_ROW_VERSION,
    requestId: requestId,
    planHash: planHash,
    spreadsheetId: identity.spreadsheet.getId(),
    actorIdentity: identity.actorIdentity,
    approvedBranch: BRANCH_REGISTRY_ROW_APPROVED
  });
}

function branchRegistryRowPrepare(data) {
  data = data && typeof data === "object" ? data : {};
  var requestId = String(data.requestId || "").trim();
  if (!requestId || requestId.length > 160) {
    throw staffSchemaMigrationError(
      "BRANCH_REGISTRY_REQUEST_ID_REQUIRED", "An explicit requestId is required."
    );
  }
  var identity = branchFoundationIdentity();
  return staffSchemaMigrationTryLocks(function () {
    var journalKey = staffSchemaMigrationJournalKey(
      BRANCH_REGISTRY_ROW_PHASE, requestId,
      identity.spreadsheet.getId(), identity.actorIdentity
    );
    var scriptStore = PropertiesService.getScriptProperties();
    var existing = staffSchemaMigrationReadJson(scriptStore, journalKey);
    if (existing && ["APPLYING", "RECOVERY_REQUIRED"].indexOf(existing.status) !== -1) {
      throw staffSchemaMigrationError(
        "BRANCH_REGISTRY_REQUEST_NOT_PREPARABLE", "The request requires recovery."
      );
    }
    var plan = branchRegistryRowAssertPlan(previewCanonicalBranchRegistryRow());
    var livePlanHash = branchRegistryRowPlanHash(plan);
    var bindingPlanHash = existing && existing.status === "COMMITTED"
      ? existing.exactPlanHash : livePlanHash;
    var fingerprint = branchRegistryRowFingerprint(requestId, bindingPlanHash, identity);
    if (existing && existing.requestFingerprint !== fingerprint) {
      throw staffSchemaMigrationError(
        "BRANCH_REGISTRY_REQUEST_ID_REUSED", "requestId is bound to different state."
      );
    }
    var rawToken = Utilities.getUuid() + "-" + Utilities.getUuid();
    var tokenRecord = {
      token: rawToken,
      tokenHash: staffSchemaMigrationHash(rawToken),
      phase: BRANCH_REGISTRY_ROW_PHASE,
      requestId: requestId,
      exactPlanHash: bindingPlanHash,
      requestFingerprint: fingerprint,
      spreadsheetId: identity.spreadsheet.getId(),
      actorIdentity: identity.actorIdentity,
      expiresAt: new Date(Date.now() + BRANCH_REGISTRY_ROW_TOKEN_TTL_MS).toISOString()
    };
    var journal = existing && existing.status === "COMMITTED" ? existing : {
      migrationId: BRANCH_REGISTRY_ROW_VERSION,
      schemaVersion: BRANCH_REGISTRY_ROW_VERSION,
      phase: BRANCH_REGISTRY_ROW_PHASE,
      requestId: requestId,
      actorIdentity: identity.actorIdentity,
      expectedSpreadsheetId: identity.spreadsheet.getId(),
      startedTimestamp: staffSchemaMigrationNow(),
      completedTimestamp: "",
      status: "PREPARED",
      exactPlanHash: livePlanHash,
      requestFingerprint: fingerprint,
      createdSheetNames: [],
      appendedColumnRanges: [],
      insertedRows: [],
      errorDetails: [],
      writes: 0,
      finalResult: null
    };
    if (journal.status !== "COMMITTED") staffSchemaMigrationWriteJournal(journalKey, journal);
    PropertiesService.getUserProperties().setProperty(
      staffSchemaMigrationTokenKey(BRANCH_REGISTRY_ROW_PHASE), JSON.stringify(tokenRecord)
    );
    return {
      tokenIssued: true,
      expiresAt: tokenRecord.expiresAt,
      requestId: requestId,
      phase: BRANCH_REGISTRY_ROW_PHASE,
      exactPlanHash: bindingPlanHash,
      operationCount: plan.operations.length,
      operationSummary: plan.operations.map(function (operation) {
        return {
          type: operation.type,
          sheetName: operation.sheetName,
          branchId: operation.values && operation.values.BRANCH_ID || ""
        };
      }),
      proposedBranch: plan.proposedBranch,
      alreadyCommitted: journal.status === "COMMITTED"
    };
  });
}

function prepareCanonicalBranchRegistryRow() {
  var result = branchRegistryRowPrepare({ requestId: Utilities.getUuid() });
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function branchRegistryRowValues(identity, requestId, timestamp) {
  return [
    BRANCH_REGISTRY_ROW_APPROVED.BRANCH_ID,
    BRANCH_REGISTRY_ROW_APPROVED.BRANCH_NAME,
    BRANCH_REGISTRY_ROW_APPROVED.ACTIVE,
    BRANCH_REGISTRY_ROW_APPROVED.TIME_ZONE,
    BRANCH_REGISTRY_ROW_APPROVED.PUBLIC_SELECTABLE,
    BRANCH_REGISTRY_ROW_APPROVED.CLOSURE_STATUS,
    BRANCH_REGISTRY_ROW_APPROVED.CLOSURE_REASON,
    timestamp,
    identity.actorIdentity,
    timestamp,
    identity.actorIdentity,
    requestId
  ];
}

function branchRegistryRowValuesEqual(left, right) {
  return Array.isArray(left) && Array.isArray(right) && left.length === right.length &&
    left.every(function (value, index) { return value === right[index]; });
}

function branchRegistryRowRollback(sheet, journal) {
  var operation = journal.inFlightOperation || (journal.insertedRows || [])[0];
  if (!operation) return [];
  try {
    if (sheet.getLastRow() < operation.rowNumber) return [];
    if (sheet.getLastRow() !== operation.rowNumber) {
      throw new Error("Inserted row is no longer the last row.");
    }
    var actual = sheet.getRange(operation.rowNumber, 1, 1, operation.values.length).getValues()[0];
    if (!branchRegistryRowValuesEqual(actual, operation.values)) {
      throw new Error("Inserted row no longer matches the request proof.");
    }
    sheet.deleteRow(operation.rowNumber);
    return [];
  } catch (error) {
    return [{
      operation: "APPEND_ROW",
      rowNumber: operation.rowNumber,
      message: String(error && error.message || error).slice(0, 500)
    }];
  }
}

function branchRegistryRowExecutePrepared() {
  var identity = branchFoundationIdentity();
  return staffSchemaMigrationTryLocks(function () {
    var tokenKey = staffSchemaMigrationTokenKey(BRANCH_REGISTRY_ROW_PHASE);
    var userStore = PropertiesService.getUserProperties();
    var token = staffSchemaMigrationReadJson(userStore, tokenKey);
    if (!token || token.phase !== BRANCH_REGISTRY_ROW_PHASE || !token.token ||
        token.tokenHash !== staffSchemaMigrationHash(token.token)) {
      throw staffSchemaMigrationError(
        "BRANCH_REGISTRY_TOKEN_INVALID", "Prepared token is missing or invalid."
      );
    }
    if (Date.parse(token.expiresAt || "") <= Date.now()) {
      userStore.deleteProperty(tokenKey);
      throw staffSchemaMigrationError("BRANCH_REGISTRY_TOKEN_EXPIRED", "Prepared token expired.");
    }
    if (token.spreadsheetId !== identity.spreadsheet.getId() ||
        token.actorIdentity !== identity.actorIdentity) {
      throw staffSchemaMigrationError(
        "BRANCH_REGISTRY_TOKEN_MISMATCH", "Prepared token identity does not match."
      );
    }
    var journalKey = staffSchemaMigrationJournalKey(
      BRANCH_REGISTRY_ROW_PHASE, token.requestId,
      identity.spreadsheet.getId(), identity.actorIdentity
    );
    var journal = staffSchemaMigrationReadJson(
      PropertiesService.getScriptProperties(), journalKey
    );
    if (!journal || journal.requestFingerprint !== token.requestFingerprint ||
        journal.exactPlanHash !== token.exactPlanHash) {
      throw staffSchemaMigrationError(
        "BRANCH_REGISTRY_PREPARED_STATE_MISMATCH", "Prepared journal does not match token."
      );
    }
    if (journal.status === "COMMITTED") {
      userStore.deleteProperty(tokenKey);
      return journal.finalResult;
    }
    if (journal.status !== "PREPARED") {
      throw staffSchemaMigrationError(
        "BRANCH_REGISTRY_REQUEST_NOT_EXECUTABLE", "Request is not PREPARED."
      );
    }
    var plan = branchRegistryRowAssertPlan(previewCanonicalBranchRegistryRow());
    var planHash = branchRegistryRowPlanHash(plan);
    var fingerprint = branchRegistryRowFingerprint(token.requestId, planHash, identity);
    if (planHash !== token.exactPlanHash || fingerprint !== token.requestFingerprint) {
      throw staffSchemaMigrationError(
        "BRANCH_REGISTRY_PLAN_DRIFT", "Branch registry state changed after preparation."
      );
    }
    userStore.deleteProperty(tokenKey);
    journal.status = "APPLYING";
    staffSchemaMigrationWriteJournal(journalKey, journal);
    var state = branchRegistryRowReadState(identity);
    try {
      if (plan.operations.length === 1) {
        var timestamp = new Date().toISOString();
        var values = branchRegistryRowValues(identity, token.requestId, timestamp);
        var operation = {
          type: "APPEND_ROW",
          sheetName: BRANCH_REGISTRY_ROW_SHEET,
          rowNumber: state.sheet.getLastRow() + 1,
          values: values
        };
        journal.inFlightOperation = operation;
        staffSchemaMigrationWriteJournal(journalKey, journal);
        state.sheet.getRange(operation.rowNumber, 1, 1, values.length).setValues([values]);
        journal.insertedRows.push(operation);
        journal.inFlightOperation = null;
        journal.writes = 1;
        staffSchemaMigrationWriteJournal(journalKey, journal);
      }
      var verification = branchRegistryRowAssertPlan(previewCanonicalBranchRegistryRow());
      if (!verification.unchanged || verification.operations.length !== 0) {
        throw staffSchemaMigrationError(
          "BRANCH_REGISTRY_FINAL_VERIFICATION_FAILED", "Canonical branch row verification failed."
        );
      }
      var result = {
        status: "COMMITTED",
        migrationId: BRANCH_REGISTRY_ROW_VERSION,
        phase: BRANCH_REGISTRY_ROW_PHASE,
        requestId: token.requestId,
        exactPlanHash: planHash,
        spreadsheetId: identity.spreadsheet.getId(),
        actorIdentity: identity.actorIdentity,
        branchId: BRANCH_REGISTRY_ROW_APPROVED.BRANCH_ID,
        insertedRowNumber: journal.insertedRows.length
          ? journal.insertedRows[0].rowNumber : 0,
        writes: journal.writes,
        completedTimestamp: staffSchemaMigrationNow()
      };
      journal.status = "COMMITTED";
      journal.completedTimestamp = result.completedTimestamp;
      journal.finalResult = result;
      staffSchemaMigrationWriteJournal(journalKey, journal);
      return result;
    } catch (caught) {
      journal.errorDetails.push({
        code: String(caught && caught.code || "BRANCH_REGISTRY_EXECUTION_FAILED").slice(0, 120),
        message: String(caught && caught.message || caught).slice(0, 500)
      });
      var rollbackFailures = branchRegistryRowRollback(state.sheet, journal);
      journal.inFlightOperation = rollbackFailures.length ? journal.inFlightOperation : null;
      journal.status = rollbackFailures.length ? "RECOVERY_REQUIRED" : "ROLLED_BACK";
      if (rollbackFailures.length) journal.errorDetails = journal.errorDetails.concat(rollbackFailures);
      else journal.completedTimestamp = staffSchemaMigrationNow();
      staffSchemaMigrationWriteJournal(journalKey, journal);
      if (rollbackFailures.length) {
        throw staffSchemaMigrationError(
          "BRANCH_REGISTRY_RECOVERY_REQUIRED",
          "Canonical branch row rollback could not be proven safe.", rollbackFailures
        );
      }
      throw caught;
    }
  });
}

function executePreparedCanonicalBranchRegistryRowStaging() {
  var result = branchRegistryRowExecutePrepared();
  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    VERSION: BRANCH_REGISTRY_ROW_VERSION,
    APPROVED: BRANCH_REGISTRY_ROW_APPROVED,
    previewPlan: branchRegistryRowPreviewPlan
  };
}
