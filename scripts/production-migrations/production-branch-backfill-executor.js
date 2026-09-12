/* global ScriptApp, SpreadsheetApp, PropertiesService, Session, DriveApp, LockService, Utilities, console */

/**
 * CUT HUB POS — Production Branch Backfill Executor
 * REVIEW DRAFT — DISARMED
 *
 * Scope:
 * - STAFF.BRANCH_ID assignment for all current staff rows
 * - Bookings.BRANCH_ID assignment for all existing booking rows
 *
 * This package intentionally does not modify any other field.
 */

var PROD_BRANCH_BACKFILL_EXECUTION_ARMED = false;

var PROD_BRANCH_BACKFILL_EXPECTED_SCRIPT_ID =
  "1UmjdRMGLukMt_0Be_ZL2krphwtZ-CQHPOiZ3GF10pY9-glgvoubfGflP";
var PROD_BRANCH_BACKFILL_EXPECTED_SPREADSHEET_ID =
  "1r0I9J-IZF1GhMC4Yvj73S8VdjJQxMfmOgP4v0ZFNOb0";

var PROD_BRANCH_BACKFILL_BRANCH_ID = "CUT_HUB_MAIN";
var PROD_BRANCH_BACKFILL_ENVIRONMENT_PROPERTY = "CUT_HUB_ENVIRONMENT";
var PROD_BRANCH_BACKFILL_SPREADSHEET_PROPERTY = "CUT_HUB_PRODUCTION_SPREADSHEET_ID";

var PROD_BRANCH_BACKFILL_TOKEN_PREFIX = "CUT_HUB_PROD_BRANCH_BACKFILL_TOKEN_V1_";
var PROD_BRANCH_BACKFILL_JOURNAL_PREFIX = "CUT_HUB_PROD_BRANCH_BACKFILL_JOURNAL_V1_";
var PROD_BRANCH_BACKFILL_TOKEN_TTL_MS = 5 * 60 * 1000;
var PROD_BRANCH_BACKFILL_LOCK_TIMEOUT_MS = 30000;

function prodBranchBackfillError(code, message, details) {
  var error = new Error(message || code);
  error.code = code;
  if (details !== undefined) error.details = details;
  return error;
}

function prodBranchBackfillText(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function prodBranchBackfillNormalizeHeader(value) {
  return prodBranchBackfillText(value).toUpperCase()
    .replace(/[\s-]+/g, "_").replace(/_+/g, "_");
}

function prodBranchBackfillStable(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map(prodBranchBackfillStable).join(",") + "]";
  }
  return "{" + Object.keys(value).sort().map(function (key) {
    return JSON.stringify(key) + ":" + prodBranchBackfillStable(value[key]);
  }).join(",") + "}";
}

function prodBranchBackfillHash(value) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    prodBranchBackfillStable(value),
    Utilities.Charset.UTF_8
  );
  return "sha256:" + bytes.map(function (value) {
    var byte = value < 0 ? value + 256 : value;
    return ("0" + byte.toString(16)).slice(-2);
  }).join("");
}

function prodBranchBackfillNow() {
  return new Date().toISOString();
}

function prodBranchBackfillIdentity() {
  var props = PropertiesService.getScriptProperties();
  var environment = prodBranchBackfillText(
    props.getProperty(PROD_BRANCH_BACKFILL_ENVIRONMENT_PROPERTY)
  ).toLowerCase();

  if (environment !== "production") {
    throw prodBranchBackfillError(
      "PRODUCTION_ENVIRONMENT_REQUIRED",
      "CUT_HUB_ENVIRONMENT must equal production."
    );
  }

  var configuredSpreadsheetId = prodBranchBackfillText(
    props.getProperty(PROD_BRANCH_BACKFILL_SPREADSHEET_PROPERTY)
  );
  if (configuredSpreadsheetId !== PROD_BRANCH_BACKFILL_EXPECTED_SPREADSHEET_ID) {
    throw prodBranchBackfillError(
      "PRODUCTION_SPREADSHEET_PIN_MISMATCH",
      "Production spreadsheet pin does not match reviewed identity."
    );
  }

  var scriptId = prodBranchBackfillText(ScriptApp.getScriptId());
  if (scriptId !== PROD_BRANCH_BACKFILL_EXPECTED_SCRIPT_ID) {
    throw prodBranchBackfillError(
      "PRODUCTION_SCRIPT_ID_MISMATCH",
      "Backfill runner is not inside the reviewed Production Apps Script project."
    );
  }

  var spreadsheet = SpreadsheetApp.getActive();
  if (!spreadsheet ||
      prodBranchBackfillText(spreadsheet.getId()) !== PROD_BRANCH_BACKFILL_EXPECTED_SPREADSHEET_ID) {
    throw prodBranchBackfillError(
      "PRODUCTION_ACTIVE_SPREADSHEET_MISMATCH",
      "Active spreadsheet is not the reviewed Production spreadsheet."
    );
  }

  var effectiveEmail = prodBranchBackfillText(Session.getEffectiveUser().getEmail()).toLowerCase();
  var activeEmail = prodBranchBackfillText(Session.getActiveUser().getEmail()).toLowerCase();
  var ownerEmail = "";
  try {
    var file = DriveApp.getFileById(spreadsheet.getId());
    var owner = file && file.getOwner ? file.getOwner() : null;
    ownerEmail = prodBranchBackfillText(owner && owner.getEmail ? owner.getEmail() : "").toLowerCase();
  } catch (_error) {
    ownerEmail = "";
  }

  if (!effectiveEmail || !activeEmail || !ownerEmail ||
      effectiveEmail !== activeEmail || activeEmail !== ownerEmail) {
    throw prodBranchBackfillError(
      "PRODUCTION_OWNER_REQUIRED",
      "Only the verified Production spreadsheet owner may run backfill controls."
    );
  }

  return {
    environment: environment,
    scriptId: scriptId,
    spreadsheet: spreadsheet,
    spreadsheetId: spreadsheet.getId(),
    actorIdentity: activeEmail
  };
}

function prodBranchBackfillHeaders(sheet) {
  if (!sheet || sheet.getLastColumn() < 1) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(prodBranchBackfillNormalizeHeader);
}

function prodBranchBackfillReadTargetRows(sheet, idHeader, branchHeader) {
  var headers = prodBranchBackfillHeaders(sheet);
  var idIndex = headers.indexOf(idHeader);
  var branchIndex = headers.indexOf(branchHeader);

  if (idIndex < 0) {
    throw prodBranchBackfillError(
      "BACKFILL_ID_HEADER_MISSING",
      "Required identity header is missing.",
      { sheetName: sheet.getName(), header: idHeader }
    );
  }
  if (branchIndex < 0) {
    throw prodBranchBackfillError(
      "BACKFILL_BRANCH_HEADER_MISSING",
      "BRANCH_ID header is required before backfill.",
      { sheetName: sheet.getName() }
    );
  }

  if (sheet.getLastRow() < 2) {
    return { headers: headers, idIndex: idIndex, branchIndex: branchIndex, rows: [] };
  }

  var values = sheet.getRange(
    2, 1, sheet.getLastRow() - 1, headers.length
  ).getValues();

  return {
    headers: headers,
    idIndex: idIndex,
    branchIndex: branchIndex,
    rows: values.map(function (row, offset) {
      return {
        rowNumber: offset + 2,
        id: prodBranchBackfillText(row[idIndex]),
        branchId: prodBranchBackfillText(row[branchIndex])
      };
    }).filter(function (row) {
      return !!row.id;
    })
  };
}

function prodBranchBackfillAssertUniqueIds(sheetName, rows) {
  var seen = {};
  var duplicates = [];
  rows.forEach(function (row) {
    if (seen[row.id]) duplicates.push(row.id);
    seen[row.id] = true;
  });
  if (duplicates.length) {
    throw prodBranchBackfillError(
      "BACKFILL_DUPLICATE_IDS",
      "Duplicate entity IDs block deterministic backfill.",
      { sheetName: sheetName, ids: duplicates }
    );
  }
}

function previewProductionBranchBackfill() {
  var identity = prodBranchBackfillIdentity();
  var spreadsheet = identity.spreadsheet;
  var staffSheet = spreadsheet.getSheetByName("STAFF");
  var bookingsSheet = spreadsheet.getSheetByName("Bookings");

  if (!staffSheet || !bookingsSheet) {
    throw prodBranchBackfillError(
      "BACKFILL_REQUIRED_SHEET_MISSING",
      "STAFF and Bookings must exist."
    );
  }

  var staff = prodBranchBackfillReadTargetRows(
    staffSheet, "ID", "BRANCH_ID"
  );
  var bookings = prodBranchBackfillReadTargetRows(
    bookingsSheet, "ID", "BRANCH_ID"
  );

  prodBranchBackfillAssertUniqueIds("STAFF", staff.rows);
  prodBranchBackfillAssertUniqueIds("Bookings", bookings.rows);

  var conflicts = [];
  var staffWrites = [];
  var bookingWrites = [];

  staff.rows.forEach(function (row) {
    if (row.branchId && row.branchId !== PROD_BRANCH_BACKFILL_BRANCH_ID) {
      conflicts.push({
        code: "STAFF_BRANCH_CONFLICT",
        rowNumber: row.rowNumber,
        id: row.id,
        branchId: row.branchId
      });
    } else if (!row.branchId) {
      staffWrites.push({
        rowNumber: row.rowNumber,
        id: row.id,
        value: PROD_BRANCH_BACKFILL_BRANCH_ID
      });
    }
  });

  bookings.rows.forEach(function (row) {
    if (row.branchId && row.branchId !== PROD_BRANCH_BACKFILL_BRANCH_ID) {
      conflicts.push({
        code: "BOOKING_BRANCH_CONFLICT",
        rowNumber: row.rowNumber,
        id: row.id,
        branchId: row.branchId
      });
    } else if (!row.branchId) {
      bookingWrites.push({
        rowNumber: row.rowNumber,
        id: row.id,
        value: PROD_BRANCH_BACKFILL_BRANCH_ID
      });
    }
  });

  var plan = {
    version: "PRODUCTION_BRANCH_BACKFILL_V1",
    dryRun: true,
    writes: 0,
    executionAllowed: false,
    executionArmed: PROD_BRANCH_BACKFILL_EXECUTION_ARMED === true,
    identity: {
      environment: identity.environment,
      scriptId: identity.scriptId,
      spreadsheetId: identity.spreadsheetId,
      actorIdentity: identity.actorIdentity
    },
    branchId: PROD_BRANCH_BACKFILL_BRANCH_ID,
    staff: {
      totalRows: staff.rows.length,
      pendingWrites: staffWrites.length,
      branchColumn: staff.branchIndex + 1,
      targets: staffWrites
    },
    bookings: {
      totalRows: bookings.rows.length,
      pendingWrites: bookingWrites.length,
      branchColumn: bookings.branchIndex + 1,
      targets: bookingWrites
    },
    conflicts: conflicts,
    safe: conflicts.length === 0
  };

  plan.planHash = prodBranchBackfillHash({
    branchId: plan.branchId,
    staff: {
      totalRows: plan.staff.totalRows,
      branchColumn: plan.staff.branchColumn,
      targets: plan.staff.targets
    },
    bookings: {
      totalRows: plan.bookings.totalRows,
      branchColumn: plan.bookings.branchColumn,
      targets: plan.bookings.targets
    },
    conflicts: plan.conflicts
  });

  console.log(JSON.stringify(plan, null, 2));
  return plan;
}

function prodBranchBackfillWithLocks(callback) {
  var scriptLock = LockService.getScriptLock();
  var documentLock = LockService.getDocumentLock ? LockService.getDocumentLock() : null;

  if (!scriptLock.tryLock(PROD_BRANCH_BACKFILL_LOCK_TIMEOUT_MS)) {
    throw prodBranchBackfillError(
      "BACKFILL_CONCURRENT_EXECUTION",
      "Another Production backfill is active."
    );
  }

  var documentLocked = false;
  try {
    if (documentLock) {
      documentLocked = documentLock.tryLock(PROD_BRANCH_BACKFILL_LOCK_TIMEOUT_MS);
      if (!documentLocked) {
        throw prodBranchBackfillError(
          "BACKFILL_CONCURRENT_EXECUTION",
          "Spreadsheet backfill lock is active."
        );
      }
    }
    return callback();
  } finally {
    if (documentLock && documentLocked) documentLock.releaseLock();
    scriptLock.releaseLock();
  }
}

function prodBranchBackfillTokenKey() {
  return PROD_BRANCH_BACKFILL_TOKEN_PREFIX + PROD_BRANCH_BACKFILL_BRANCH_ID;
}

function prodBranchBackfillJournalKey(requestId, identity) {
  return PROD_BRANCH_BACKFILL_JOURNAL_PREFIX +
    prodBranchBackfillHash({
      requestId: requestId,
      spreadsheetId: identity.spreadsheetId,
      actorIdentity: identity.actorIdentity
    }).slice(7, 31);
}

function prepareProductionBranchBackfill(data) {
  if (PROD_BRANCH_BACKFILL_EXECUTION_ARMED !== true) {
    throw prodBranchBackfillError(
      "PRODUCTION_BACKFILL_EXECUTION_DISARMED",
      "Production branch backfill execution is intentionally disarmed."
    );
  }

  data = data && typeof data === "object" ? data : {};
  var requestId = prodBranchBackfillText(data.requestId);
  if (!requestId || requestId.length > 160) {
    throw prodBranchBackfillError(
      "BACKFILL_REQUEST_ID_INVALID",
      "A valid requestId is required."
    );
  }

  var identity = prodBranchBackfillIdentity();

  return prodBranchBackfillWithLocks(function () {
    var plan = previewProductionBranchBackfill();
    if (plan.safe !== true) {
      throw prodBranchBackfillError(
        "BACKFILL_PREVIEW_NOT_SAFE",
        "Backfill preview contains conflicts."
      );
    }

    var token = Utilities.getUuid() + "-" + Utilities.getUuid();
    var expiresAt = new Date(Date.now() + PROD_BRANCH_BACKFILL_TOKEN_TTL_MS).toISOString();
    var tokenRecord = {
      tokenHash: prodBranchBackfillHash(token),
      requestId: requestId,
      planHash: plan.planHash,
      spreadsheetId: identity.spreadsheetId,
      actorIdentity: identity.actorIdentity,
      expiresAt: expiresAt
    };

    var journal = {
      status: "PREPARED",
      requestId: requestId,
      planHash: plan.planHash,
      branchId: PROD_BRANCH_BACKFILL_BRANCH_ID,
      spreadsheetId: identity.spreadsheetId,
      actorIdentity: identity.actorIdentity,
      staffWrites: [],
      bookingWrites: [],
      createdAt: prodBranchBackfillNow(),
      updatedAt: prodBranchBackfillNow(),
      finalResult: null
    };

    PropertiesService.getUserProperties().setProperty(
      prodBranchBackfillTokenKey(), JSON.stringify(tokenRecord)
    );
    PropertiesService.getScriptProperties().setProperty(
      prodBranchBackfillJournalKey(requestId, identity),
      JSON.stringify(journal)
    );

    return {
      status: "PREPARED",
      requestId: requestId,
      confirmationToken: token,
      expiresAt: expiresAt,
      planHash: plan.planHash,
      staffPendingWrites: plan.staff.pendingWrites,
      bookingPendingWrites: plan.bookings.pendingWrites
    };
  });
}

function prodBranchBackfillReadJson(store, key) {
  var raw = store.getProperty(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_error) {
    throw prodBranchBackfillError(
      "BACKFILL_STATE_CORRUPT",
      "Stored backfill state is invalid JSON."
    );
  }
}

function prodBranchBackfillReadPreparedToken(suppliedToken) {
  var store = PropertiesService.getUserProperties();
  var key = prodBranchBackfillTokenKey();
  var record = prodBranchBackfillReadJson(store, key);

  if (!record || !suppliedToken ||
      record.tokenHash !== prodBranchBackfillHash(suppliedToken)) {
    throw prodBranchBackfillError(
      "BACKFILL_TOKEN_INVALID",
      "Confirmation token is invalid or already consumed."
    );
  }

  if (Date.parse(record.expiresAt || "") <= Date.now()) {
    store.deleteProperty(key);
    throw prodBranchBackfillError(
      "BACKFILL_TOKEN_EXPIRED",
      "Confirmation token has expired."
    );
  }

  return { key: key, record: record, store: store };
}

function prodBranchBackfillWriteJournal(key, journal) {
  journal.updatedAt = prodBranchBackfillNow();
  PropertiesService.getScriptProperties().setProperty(key, JSON.stringify(journal));
}

function prodBranchBackfillApplyTargets(sheet, branchColumn, targets, journalBucket) {
  targets.forEach(function (target) {
    var range = sheet.getRange(target.rowNumber, branchColumn, 1, 1);
    var before = range.getValue();
    if (prodBranchBackfillText(before)) {
      if (prodBranchBackfillText(before) !== PROD_BRANCH_BACKFILL_BRANCH_ID) {
        throw prodBranchBackfillError(
          "BACKFILL_STATE_CHANGED",
          "A target row acquired a conflicting BRANCH_ID after preview.",
          { sheetName: sheet.getName(), rowNumber: target.rowNumber, id: target.id }
        );
      }
      return;
    }

    range.setValue(PROD_BRANCH_BACKFILL_BRANCH_ID);
    journalBucket.push({
      rowNumber: target.rowNumber,
      id: target.id,
      before: before,
      after: PROD_BRANCH_BACKFILL_BRANCH_ID
    });
  });
}

function prodBranchBackfillRollback(sheet, branchColumn, writes) {
  var failures = [];
  writes.slice().reverse().forEach(function (entry) {
    try {
      var range = sheet.getRange(entry.rowNumber, branchColumn, 1, 1);
      var current = prodBranchBackfillText(range.getValue());
      if (current !== PROD_BRANCH_BACKFILL_BRANCH_ID) {
        throw new Error("Backfilled cell changed after write.");
      }
      range.setValue(entry.before);
    } catch (error) {
      failures.push({
        rowNumber: entry.rowNumber,
        id: entry.id,
        message: prodBranchBackfillText(error && error.message || error)
      });
    }
  });
  return failures;
}

function executePreparedProductionBranchBackfill(data) {
  if (PROD_BRANCH_BACKFILL_EXECUTION_ARMED !== true) {
    throw prodBranchBackfillError(
      "PRODUCTION_BACKFILL_EXECUTION_DISARMED",
      "Production branch backfill execution is intentionally disarmed."
    );
  }
  if (!data || typeof data !== "object") {
    throw prodBranchBackfillError(
      "BACKFILL_CONFIRMATION_REQUIRED",
      "requestId and confirmationToken are required."
    );
  }

  var requestId = prodBranchBackfillText(data.requestId);
  var confirmationToken = prodBranchBackfillText(data.confirmationToken);
  if (!requestId || !confirmationToken) {
    throw prodBranchBackfillError(
      "BACKFILL_CONFIRMATION_REQUIRED",
      "requestId and confirmationToken are required."
    );
  }

  var identity = prodBranchBackfillIdentity();

  return prodBranchBackfillWithLocks(function () {
    var prepared = prodBranchBackfillReadPreparedToken(confirmationToken);
    if (prepared.record.requestId !== requestId ||
        prepared.record.spreadsheetId !== identity.spreadsheetId ||
        prepared.record.actorIdentity !== identity.actorIdentity) {
      throw prodBranchBackfillError(
        "BACKFILL_TOKEN_MISMATCH",
        "Prepared token binding is invalid."
      );
    }

    var journalKey = prodBranchBackfillJournalKey(requestId, identity);
    var journal = prodBranchBackfillReadJson(
      PropertiesService.getScriptProperties(), journalKey
    );
    if (!journal || journal.status !== "PREPARED") {
      throw prodBranchBackfillError(
        "BACKFILL_REQUEST_NOT_EXECUTABLE",
        "Backfill request is not PREPARED."
      );
    }

    var plan = previewProductionBranchBackfill();
    if (plan.safe !== true || plan.planHash !== prepared.record.planHash ||
        plan.planHash !== journal.planHash) {
      throw prodBranchBackfillError(
        "BACKFILL_PLAN_HASH_MISMATCH",
        "Live Production rows changed after preparation."
      );
    }

    var staffSheet = identity.spreadsheet.getSheetByName("STAFF");
    var bookingsSheet = identity.spreadsheet.getSheetByName("Bookings");

    prepared.store.deleteProperty(prepared.key);
    journal.status = "APPLYING";
    prodBranchBackfillWriteJournal(journalKey, journal);

    try {
      prodBranchBackfillApplyTargets(
        staffSheet, plan.staff.branchColumn, plan.staff.targets, journal.staffWrites
      );
      prodBranchBackfillWriteJournal(journalKey, journal);

      prodBranchBackfillApplyTargets(
        bookingsSheet, plan.bookings.branchColumn, plan.bookings.targets, journal.bookingWrites
      );
      prodBranchBackfillWriteJournal(journalKey, journal);

      var verification = previewProductionBranchBackfill();
      if (verification.staff.pendingWrites !== 0 ||
          verification.bookings.pendingWrites !== 0 ||
          verification.conflicts.length !== 0) {
        throw prodBranchBackfillError(
          "BACKFILL_FINAL_VERIFICATION_FAILED",
          "Backfill verification still reports pending writes or conflicts."
        );
      }

      var result = {
        status: "COMMITTED",
        requestId: requestId,
        branchId: PROD_BRANCH_BACKFILL_BRANCH_ID,
        staffRowsWritten: journal.staffWrites.length,
        bookingRowsWritten: journal.bookingWrites.length,
        totalRowsWritten: journal.staffWrites.length + journal.bookingWrites.length,
        completedAt: prodBranchBackfillNow()
      };

      journal.status = "COMMITTED";
      journal.finalResult = result;
      prodBranchBackfillWriteJournal(journalKey, journal);
      return result;
    } catch (caught) {
      var bookingRollbackFailures = prodBranchBackfillRollback(
        bookingsSheet, plan.bookings.branchColumn, journal.bookingWrites
      );
      var staffRollbackFailures = prodBranchBackfillRollback(
        staffSheet, plan.staff.branchColumn, journal.staffWrites
      );
      var failures = staffRollbackFailures.concat(bookingRollbackFailures);

      journal.status = failures.length ? "RECOVERY_REQUIRED" : "ROLLED_BACK";
      journal.rollbackFailures = failures;
      journal.error = {
        code: prodBranchBackfillText(caught && caught.code || "BACKFILL_FAILED"),
        message: prodBranchBackfillText(caught && caught.message || caught)
      };
      prodBranchBackfillWriteJournal(journalKey, journal);

      if (failures.length) {
        throw prodBranchBackfillError(
          "BACKFILL_RECOVERY_REQUIRED",
          "Backfill rollback could not be proven safe.",
          failures
        );
      }
      throw caught;
    }
  });
}
