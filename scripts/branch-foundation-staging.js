/* global BookingAvailabilityPhase5, getCutHubEnvironmentConfig, assertStagingEnvironment,
  staffSchemaMigrationAssertOwner, schedulePhase2Headers, schedulePhase2ReadRows */

var BRANCH_FOUNDATION_VERSION = "BRANCH_FOUNDATION_V1";
var BRANCH_FOUNDATION_SHEET = "BOOKING_BRANCH_REGISTRY";
var BRANCH_FOUNDATION_WEEKDAYS = [
  "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"
];

function branchFoundationPhase5Contract() {
  if (typeof BookingAvailabilityPhase5 !== "undefined") return BookingAvailabilityPhase5;
  if (typeof require === "function") return require("./booking-availability-phase5");
  throw branchFoundationError("BRANCH_FOUNDATION_CONTRACT_MISSING", "Phase 5 contract is unavailable.");
}

function branchFoundationError(code, message, details) {
  var error = new Error(message || code);
  error.code = code;
  if (details !== undefined) error.details = details;
  return error;
}

function branchFoundationNormalizeHeader(value) {
  return String(value == null ? "" : value).trim().toUpperCase()
    .replace(/[\s-]+/g, "_").replace(/_+/g, "_");
}

function branchFoundationIdentity() {
  var config = getCutHubEnvironmentConfig();
  var environment = String(config.environment || "").trim().toLowerCase();
  if (environment !== "staging") {
    throw branchFoundationError(
      "BRANCH_FOUNDATION_STAGING_ONLY", "Branch Foundation is restricted to Staging."
    );
  }
  if (!config.spreadsheetId || !config.stagingSpreadsheetId ||
      config.spreadsheetId !== config.stagingSpreadsheetId) {
    throw branchFoundationError(
      "BRANCH_FOUNDATION_STAGING_PIN_MISMATCH", "Staging spreadsheet pins must match."
    );
  }
  var strict = assertStagingEnvironment();
  if (!strict || !strict.spreadsheet ||
      strict.spreadsheet.getId() !== config.spreadsheetId ||
      strict.spreadsheet.getId() !== config.stagingSpreadsheetId) {
    throw branchFoundationError(
      "BRANCH_FOUNDATION_IDENTITY_MISMATCH", "Strict Staging identity validation failed."
    );
  }
  var actor = staffSchemaMigrationAssertOwner(strict);
  return {
    environment: "staging",
    expectedSpreadsheetId: config.spreadsheetId,
    actualSpreadsheetId: strict.spreadsheet.getId(),
    actorIdentity: actor.actorIdentity,
    spreadsheet: strict.spreadsheet
  };
}

function branchFoundationPlanMigration(existingHeaders, identity) {
  var expected = branchFoundationPhase5Contract()
    .SHEET_SCHEMAS[BRANCH_FOUNDATION_SHEET].slice();
  var errors = [];
  var createSheets = [];
  var unchangedSheets = [];
  var current = Array.isArray(existingHeaders) ? existingHeaders.map(branchFoundationNormalizeHeader) : null;
  var normalizedExpected = expected.map(branchFoundationNormalizeHeader);
  if (current === null) {
    createSheets.push({ sheetName: BRANCH_FOUNDATION_SHEET, headers: expected });
  } else {
    var duplicates = current.filter(function (header, index) {
      return header && current.indexOf(header) !== index;
    });
    var unknown = current.filter(function (header) {
      return header && normalizedExpected.indexOf(header) === -1;
    });
    if (duplicates.length) {
      errors.push({ code: "BRANCH_FOUNDATION_DUPLICATE_HEADERS", headers: duplicates });
    }
    if (unknown.length) {
      errors.push({ code: "BRANCH_FOUNDATION_UNKNOWN_COLUMNS", headers: unknown });
    }
    if (current.length !== normalizedExpected.length || current.some(function (header, index) {
      return header !== normalizedExpected[index];
    })) {
      errors.push({ code: "BRANCH_FOUNDATION_HEADER_ORDER_INCOMPATIBLE" });
    }
    if (!errors.length) unchangedSheets.push(BRANCH_FOUNDATION_SHEET);
  }
  return {
    schemaVersion: BRANCH_FOUNDATION_VERSION,
    version: BRANCH_FOUNDATION_VERSION,
    dryRun: true,
    writes: 0,
    executionAllowed: false,
    identity: {
      environment: String(identity && identity.environment || ""),
      expectedSpreadsheetId: String(identity && identity.expectedSpreadsheetId || ""),
      actualSpreadsheetId: String(identity && identity.actualSpreadsheetId || "")
    },
    headerNormalization: "TRIM_UPPERCASE_SPACES_HYPHENS_TO_UNDERSCORE",
    createSheets: createSheets,
    initializeBlankSheets: [],
    appendColumns: {},
    unchangedSheets: unchangedSheets,
    preservedUnknownColumns: {},
    errors: errors,
    rollback: {
      createdSheets: createSheets.map(function (item) { return item.sheetName; }),
      appendedColumnRanges: [],
      historicalRowsTouched: 0
    },
    safe: errors.length === 0
  };
}

function previewBranchFoundationMigration() {
  var identity = branchFoundationIdentity();
  var sheet = identity.spreadsheet.getSheetByName(BRANCH_FOUNDATION_SHEET);
  var headers = sheet ? schedulePhase2Headers(sheet) : null;
  return branchFoundationPlanMigration(headers, identity);
}

function diagnosticPreviewBranchFoundationMigration() {
  var result = previewBranchFoundationMigration();
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function branchConfigurationText(value) {
  return String(value == null ? "" : value).trim();
}

function branchConfigurationBoolean(value, field, errors) {
  if (typeof value !== "boolean") {
    errors.push({ code: "BRANCH_CONFIGURATION_BOOLEAN_REQUIRED", field: field });
    return false;
  }
  return value;
}

function branchConfigurationPreviewPlan(data, existingBranches) {
  data = data && typeof data === "object" ? data : {};
  existingBranches = Array.isArray(existingBranches) ? existingBranches : [];
  var errors = [];
  var branchId = branchConfigurationText(data.branchId);
  var branchName = branchConfigurationText(data.branchName);
  var timeZone = branchConfigurationText(data.timeZone);
  var closureStatus = branchConfigurationText(data.closureStatus).toUpperCase();
  var closureReason = branchConfigurationText(data.closureReason);
  var hours = Array.isArray(data.weeklyOpeningHours) ? data.weeklyOpeningHours : null;
  var active = branchConfigurationBoolean(data.active, "ACTIVE", errors);
  var publicSelectable = branchConfigurationBoolean(
    data.publicSelectable, "PUBLIC_SELECTABLE", errors
  );
  if (!branchId) errors.push({ code: "BRANCH_ID_REQUIRED" });
  if (!branchName) errors.push({ code: "BRANCH_NAME_REQUIRED" });
  if (!/^[A-Za-z_]+(?:\/[A-Za-z0-9_+\-]+)+$/.test(timeZone)) {
    errors.push({ code: "BRANCH_TIME_ZONE_INVALID" });
  }
  if (["OPEN", "CLOSED"].indexOf(closureStatus) === -1) {
    errors.push({ code: "BRANCH_CLOSURE_STATUS_INVALID" });
  }
  if (closureStatus === "CLOSED" && !closureReason) {
    errors.push({ code: "BRANCH_CLOSURE_REASON_REQUIRED" });
  }
  var exactMatches = existingBranches.filter(function (branch) {
    return branchConfigurationText(branch.branchId || branch.BRANCH_ID) === branchId;
  });
  var caseMatches = existingBranches.filter(function (branch) {
    var existingId = branchConfigurationText(branch.branchId || branch.BRANCH_ID);
    return existingId && branchId && existingId.toLowerCase() === branchId.toLowerCase() && existingId !== branchId;
  });
  if (exactMatches.length) errors.push({ code: "BRANCH_ID_DUPLICATE" });
  if (caseMatches.length) errors.push({ code: "BRANCH_ID_CASE_AMBIGUOUS" });
  if (active && existingBranches.some(function (branch) {
    return (branch.active === true || String(branch.ACTIVE).toLowerCase() === "true");
  })) {
    errors.push({ code: "SINGLE_BRANCH_ACTIVE_LIMIT" });
  }
  if (!hours || !hours.length) {
    errors.push({ code: "BRANCH_WEEKLY_HOURS_REQUIRED" });
  } else {
    var seen = {};
    hours.forEach(function (item, index) {
      var weekday = branchConfigurationText(item && item.weekday).toUpperCase();
      var openTime = branchConfigurationText(item && item.openTime);
      var closeTime = branchConfigurationText(item && item.closeTime);
      if (BRANCH_FOUNDATION_WEEKDAYS.indexOf(weekday) === -1) {
        errors.push({ code: "BRANCH_WEEKDAY_INVALID", index: index });
      } else if (seen[weekday]) {
        errors.push({ code: "BRANCH_WEEKDAY_DUPLICATE", weekday: weekday });
      }
      seen[weekday] = true;
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(openTime) ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(closeTime) || openTime === closeTime) {
        errors.push({ code: "BRANCH_HOURS_INVALID", index: index });
      }
    });
  }
  return {
    version: "BRANCH_CONFIGURATION_PREVIEW_V1",
    dryRun: true,
    writes: 0,
    safe: errors.length === 0,
    errors: errors,
    proposedBranch: {
      branchId: branchId,
      branchName: branchName,
      timeZone: timeZone,
      active: active,
      publicSelectable: publicSelectable,
      closureStatus: closureStatus,
      closureReason: closureReason
    },
    weeklyOpeningHours: hours || [],
    operations: errors.length ? [] : [{ type: "CREATE_BRANCH", branchId: branchId }].concat(
      (hours || []).map(function (item) {
        return { type: "CREATE_BRANCH_HOURS", branchId: branchId,
          weekday: branchConfigurationText(item.weekday).toUpperCase() };
      })
    )
  };
}

function previewBranchConfigurationStaging(data) {
  var identity = branchFoundationIdentity();
  var sheet = identity.spreadsheet.getSheetByName(BRANCH_FOUNDATION_SHEET);
  if (!sheet) {
    throw branchFoundationError(
      "BRANCH_FOUNDATION_SCHEMA_NOT_READY", "BOOKING_BRANCH_REGISTRY is required first."
    );
  }
  var headers = schedulePhase2Headers(sheet).map(branchFoundationNormalizeHeader);
  var expected = branchFoundationPhase5Contract().SHEET_SCHEMAS[BRANCH_FOUNDATION_SHEET]
    .map(branchFoundationNormalizeHeader);
  if (headers.length !== expected.length || headers.some(function (header, index) {
    return header !== expected[index];
  })) {
    throw branchFoundationError(
      "BRANCH_FOUNDATION_SCHEMA_INCOMPATIBLE", "Branch registry headers are incompatible."
    );
  }
  return branchConfigurationPreviewPlan(data, schedulePhase2ReadRows(BRANCH_FOUNDATION_SHEET));
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    VERSION: BRANCH_FOUNDATION_VERSION,
    SHEET: BRANCH_FOUNDATION_SHEET,
    WEEKDAYS: BRANCH_FOUNDATION_WEEKDAYS,
    planMigration: branchFoundationPlanMigration,
    previewConfiguration: branchConfigurationPreviewPlan
  };
}
