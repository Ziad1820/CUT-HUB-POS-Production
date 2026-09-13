/* global BookingAvailabilityPhase5, DriveApp, Session,
  StaffSchedulingPhase2, assertStagingEnvironment, getCutHubEnvironmentConfig,
  schedulePhase2AssertHeaders, schedulePhase2ReadRows */

/**
 * Read-only, owner-authorized Staging preview for a reviewed STAFF append plan.
 * This module intentionally exposes no execute or mutation entry point.
 */

function staffImportPreviewError(code, message, details) {
  var error = new Error(message || code);
  error.code = code;
  if (details !== undefined) error.details = details;
  return error;
}

function staffImportPreviewText(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function staffImportPreviewStagingIdentityAndOwner() {
  var config = getCutHubEnvironmentConfig();
  var environment = staffImportPreviewText(config.environment).toLowerCase();
  if (environment !== "staging") {
    throw staffImportPreviewError(
      "STAFF_IMPORT_STAGING_ONLY", "STAFF import Preview is restricted to Staging."
    );
  }
  if (!config.spreadsheetId || !config.stagingSpreadsheetId ||
      config.spreadsheetId !== config.stagingSpreadsheetId) {
    throw staffImportPreviewError(
      "STAFF_IMPORT_STAGING_PIN_MISMATCH", "Expected and Staging Spreadsheet pins must match."
    );
  }
  var strict = assertStagingEnvironment();
  if (!strict || !strict.spreadsheet ||
      strict.spreadsheet.getId() !== config.spreadsheetId ||
      strict.spreadsheet.getId() !== config.stagingSpreadsheetId) {
    throw staffImportPreviewError(
      "STAFF_IMPORT_STAGING_IDENTITY_MISMATCH", "Strict Staging identity validation failed."
    );
  }
  var effectiveEmail = "";
  var activeEmail = "";
  var ownerEmail = "";
  try {
    effectiveEmail = staffImportPreviewText(Session.getEffectiveUser().getEmail()).toLowerCase();
    activeEmail = staffImportPreviewText(Session.getActiveUser().getEmail()).toLowerCase();
    ownerEmail = staffImportPreviewText(
      DriveApp.getFileById(strict.spreadsheet.getId()).getOwner().getEmail()
    ).toLowerCase();
  } catch (_error) {
    effectiveEmail = "";
    activeEmail = "";
    ownerEmail = "";
  }
  if (!effectiveEmail || !activeEmail || !ownerEmail ||
      effectiveEmail !== activeEmail || activeEmail !== ownerEmail) {
    throw staffImportPreviewError(
      "STAFF_IMPORT_OWNER_REQUIRED", "Only the verified interactive Staging owner can run this Preview."
    );
  }
  return { config: config, spreadsheet: strict.spreadsheet, actorIdentity: effectiveEmail };
}

function staffImportPreviewActiveBranches() {
  schedulePhase2AssertHeaders(
    "BOOKING_BRANCH_REGISTRY",
    BookingAvailabilityPhase5.SHEET_SCHEMAS.BOOKING_BRANCH_REGISTRY
  );
  return schedulePhase2ReadRows("BOOKING_BRANCH_REGISTRY").filter(function (branch) {
    var active = branch.active === true || String(branch.active || "").toUpperCase() === "TRUE";
    return active && staffImportPreviewText(branch.branchId) && staffImportPreviewText(branch.branchName);
  });
}

function staffImportPreviewCanonicalValue(row, header) {
  if (Object.prototype.hasOwnProperty.call(row, header)) return row[header];
  var camel = header.toLowerCase().replace(/_([a-z])/g, function (_match, letter) {
    return letter.toUpperCase();
  });
  return row[camel];
}

function staffImportPreviewNormalizeApprovedRows(rows) {
  var headers = StaffSchedulingPhase2.PHASE2_SHEET_SCHEMAS.STAFF;
  return rows.map(function (row) {
    var result = {};
    headers.forEach(function (header) {
      result[header] = staffImportPreviewCanonicalValue(row || {}, header);
    });
    return result;
  });
}

function staffImportPreviewNumber(value) {
  var number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function staffImportPreviewCode(value) {
  return staffImportPreviewText(value).toUpperCase();
}

function staffImportPreviewRowsEqual(left, right) {
  return StaffSchedulingPhase2.PHASE2_SHEET_SCHEMAS.STAFF.filter(function (header) {
    return header !== "CREATED_AT" && header !== "UPDATED_AT";
  }).every(function (header) {
    var leftValue = staffImportPreviewCanonicalValue(left, header);
    var rightValue = staffImportPreviewCanonicalValue(right, header);
    if (["SALARY", "PERCENTAGE", "BONUS", "DEDUCTION"].indexOf(header) !== -1) {
      return staffImportPreviewNumber(leftValue) === staffImportPreviewNumber(rightValue);
    }
    if (header === "ACTIVE" || header === "IS_BARBER") {
      return Boolean(leftValue) === Boolean(rightValue);
    }
    return staffImportPreviewText(leftValue) === staffImportPreviewText(rightValue);
  });
}

function staffImportPreviewHash(rows) {
  var input = JSON.stringify(rows.map(function (row) {
    return StaffSchedulingPhase2.PHASE2_SHEET_SCHEMAS.STAFF.map(function (header) {
      return staffImportPreviewCanonicalValue(row, header);
    });
  }));
  var result = 2166136261;
  for (var index = 0; index < input.length; index += 1) {
    result ^= input.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(16).padStart(8, "0");
}

function staffImportPreviewPlan(canonicalRows, existingRows) {
  var errors = [];
  var sourceIds = {};
  var sourceCodes = {};
  canonicalRows.forEach(function (row, index) {
    var id = staffImportPreviewText(row.ID);
    var code = staffImportPreviewCode(row.CODE);
    if (sourceIds[id] !== undefined) {
      errors.push({ code: "STAFF_IMPORT_DUPLICATE_ID", id: id,
        sourceIndexes: [sourceIds[id], index] });
    } else sourceIds[id] = index;
    if (sourceCodes[code] !== undefined) {
      errors.push({ code: "STAFF_IMPORT_DUPLICATE_CODE", staffCode: code,
        sourceIndexes: [sourceCodes[code], index] });
    } else sourceCodes[code] = index;
  });

  var existingById = {};
  var existingByCode = {};
  existingRows.forEach(function (row, index) {
    var id = staffImportPreviewText(staffImportPreviewCanonicalValue(row, "ID"));
    var code = staffImportPreviewCode(staffImportPreviewCanonicalValue(row, "CODE"));
    if (id) {
      if (existingById[id]) errors.push({ code: "STAFF_EXISTING_DUPLICATE_ID", id: id });
      else existingById[id] = { row: row, index: index };
    }
    if (code) {
      if (existingByCode[code]) errors.push({ code: "STAFF_EXISTING_DUPLICATE_CODE", staffCode: code });
      else existingByCode[code] = { row: row, index: index };
    }
  });

  var proposedRows = [];
  var unchangedCount = 0;
  canonicalRows.forEach(function (row, sourceIndex) {
    var id = staffImportPreviewText(row.ID);
    var code = staffImportPreviewCode(row.CODE);
    var sameId = existingById[id];
    var sameCode = existingByCode[code];
    if (sameId) {
      if (staffImportPreviewRowsEqual(sameId.row, row)) unchangedCount += 1;
      else errors.push({ code: "STAFF_IMPORT_EXISTING_ID_CONFLICT", sourceIndex: sourceIndex,
        existingRow: sameId.index });
      return;
    }
    if (sameCode) {
      errors.push({ code: "STAFF_IMPORT_EXISTING_CODE_CONFLICT", sourceIndex: sourceIndex,
        existingRow: sameCode.index });
      return;
    }
    proposedRows.push(row);
  });
  return { errors: errors, proposedRows: proposedRows, unchangedCount: unchangedCount,
    planHash: staffImportPreviewHash(canonicalRows) };
}

function previewStaffImportStaging(data) {
  data = data && typeof data === "object" ? data : {};
  try {
    var identity = staffImportPreviewStagingIdentityAndOwner();
    var approvedRows = Array.isArray(data.proposedRows) ? data.proposedRows : [];
    if (approvedRows.length !== 6) {
      throw staffImportPreviewError(
        "STAFF_IMPORT_APPROVED_ROW_COUNT_INVALID", "Exactly six approved STAFF rows are required.",
        { expected: 6, actual: approvedRows.length }
      );
    }
    var canonicalRows = staffImportPreviewNormalizeApprovedRows(approvedRows);
    schedulePhase2AssertHeaders("STAFF", StaffSchedulingPhase2.PHASE2_SHEET_SCHEMAS.STAFF);
    var existingRows = schedulePhase2ReadRows("STAFF");
    var activeBranches = staffImportPreviewActiveBranches();
    if (activeBranches.length !== 1) {
      throw staffImportPreviewError(
        "STAFF_IMPORT_CANONICAL_BRANCH_COUNT_INVALID",
        "Exactly one active canonical branch is required.", { activeBranchCount: activeBranches.length }
      );
    }
    var branchId = staffImportPreviewText(activeBranches[0].branchId);
    var timestamp = staffImportPreviewText(canonicalRows[0].CREATED_AT);
    var contractErrors = [];
    canonicalRows.forEach(function (row, index) {
      if (!staffImportPreviewText(row.NAME) || !staffImportPreviewText(row.CODE) ||
          !staffImportPreviewText(row.ID) || staffImportPreviewNumber(row.SALARY) === null ||
          staffImportPreviewNumber(row.SALARY) < 0 || typeof row.IS_BARBER !== "boolean") {
        contractErrors.push({ code: "STAFF_IMPORT_APPROVED_ROW_REQUIRED_VALUE_INVALID", sourceIndex: index });
      }
      if (staffImportPreviewNumber(row.PERCENTAGE) !== 0 ||
          staffImportPreviewNumber(row.BONUS) !== 0 ||
          staffImportPreviewNumber(row.DEDUCTION) !== 0 ||
          row.ACTIVE !== true || staffImportPreviewText(row.CREATED_AT) !== timestamp ||
          staffImportPreviewText(row.UPDATED_AT) !== timestamp ||
          staffImportPreviewText(row.BRANCH_ID) !== branchId) {
        contractErrors.push({ code: "STAFF_IMPORT_APPROVED_ROW_CONTRACT_INVALID", sourceIndex: index });
      }
    });
    if (!timestamp || Number.isNaN(Date.parse(timestamp))) {
      contractErrors.push({ code: "STAFF_IMPORT_TIMESTAMP_INVALID" });
    }
    var plan = staffImportPreviewPlan(canonicalRows, existingRows);
    var errors = contractErrors.concat(plan.errors || []);
    var safe = errors.length === 0;
    return {
      schemaVersion: "STAFF_STAGING_IMPORT_PREVIEW_V1",
      dryRun: true,
      writes: 0,
      safe: safe,
      identity: {
        environment: identity.config.environment,
        expectedSpreadsheetId: identity.config.spreadsheetId,
        actualSpreadsheetId: identity.spreadsheet.getId()
      },
      branch: { branchId: branchId, branchName: activeBranches[0].branchName },
      sourceCount: canonicalRows.length,
      existingStaffRowCount: existingRows.length,
      unchangedCount: plan.unchangedCount,
      proposedCount: plan.proposedRows.length,
      errors: errors,
      appendOperations: safe ? plan.proposedRows.map(function (row) {
        return { type: "APPEND_ROW", sheetName: "STAFF", row: row };
      }) : [],
      planHash: plan.planHash
    };
  } catch (error) {
    return {
      schemaVersion: "STAFF_STAGING_IMPORT_PREVIEW_V1",
      dryRun: true,
      writes: 0,
      safe: false,
      sourceCount: Array.isArray(data.proposedRows) ? data.proposedRows.length : 0,
      proposedCount: 0,
      appendOperations: [],
      errors: [{ code: error.code || "STAFF_IMPORT_PREVIEW_FAILED", message: error.message,
        details: error.details || null }]
    };
  }
}
