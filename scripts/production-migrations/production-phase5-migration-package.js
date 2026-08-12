/* global ScriptApp, SpreadsheetApp, PropertiesService, Session, DriveApp, Utilities, console */

/**
 * CUT HUB POS — Phase 5 Production Migration Package
 * REVIEW DRAFT — PREVIEW ONLY / EXECUTION DISARMED
 *
 * This package is separate from the Phase 2/3/4 runner because Phase 5 has
 * different schema and business-data prerequisites.
 */

var PROD_PHASE5_EXECUTION_ARMED = false;

var PROD_PHASE5_EXPECTED_SCRIPT_ID =
  "1UmjdRMGLukMt_0Be_ZL2krphwtZ-CQHPOiZ3GF10pY9-glgvoubfGflP";
var PROD_PHASE5_EXPECTED_SPREADSHEET_ID =
  "1r0I9J-IZF1GhMC4Yvj73S8VdjJQxMfmOgP4v0ZFNOb0";

var PROD_PHASE5_ENVIRONMENT_PROPERTY = "CUT_HUB_ENVIRONMENT";
var PROD_PHASE5_SPREADSHEET_PROPERTY = "CUT_HUB_PRODUCTION_SPREADSHEET_ID";

var PROD_PHASE5_VERSION = "BOOKING_AVAILABILITY_PHASE5_V1";

var PROD_PHASE5_AUTHORITY_SCHEMAS = Object.freeze({
  BOOKING_BRANCH_REGISTRY: Object.freeze([
    "BRANCH_ID", "BRANCH_NAME", "ACTIVE", "TIME_ZONE", "PUBLIC_SELECTABLE",
    "CLOSURE_STATUS", "CLOSURE_REASON", "CREATED_AT", "CREATED_BY",
    "UPDATED_AT", "UPDATED_BY", "LAST_REQUEST_ID"
  ]),
  BRANCH_BOOKING_HOURS: Object.freeze([
    "BRANCH_HOURS_ID", "BRANCH_ID", "WEEKDAY", "OPEN_TIME", "CLOSE_TIME",
    "ACTIVE", "EFFECTIVE_FROM", "EFFECTIVE_TO", "CREATED_AT", "CREATED_BY",
    "UPDATED_AT", "UPDATED_BY", "LAST_REQUEST_ID"
  ]),
  BOOKING_AVAILABILITY_VERSIONS: Object.freeze([
    "VERSION_ID", "BRANCH_ID", "DATE", "BOOKING_VERSION", "SCHEDULE_VERSION",
    "ATTENDANCE_OPERATIONAL_VERSION", "OPERATIONAL_OVERRIDE_VERSION",
    "SERVICE_VERSION", "BRANCH_HOURS_VERSION", "UPDATED_AT", "UPDATED_BY"
  ]),
  BOOKING_AVAILABILITY_GENERATIONS: Object.freeze([
    "GENERATION_ID", "SCOPE_TYPE", "SCOPE_ID", "RECURRING_SCHEDULE_GENERATION",
    "SERVICE_GENERATION", "BRANCH_HOURS_GENERATION", "STAFF_MEMBERSHIP_GENERATION",
    "ATTENDANCE_OPERATIONAL_GENERATION", "OPERATIONAL_OVERRIDE_GENERATION",
    "BOOKING_OCCUPANCY_GENERATION", "EPOCH", "UPDATED_AT", "UPDATED_BY",
    "LAST_REQUEST_ID"
  ]),
  BOOKING_AVAILABILITY_TRANSACTIONS: Object.freeze([
    "TRANSACTION_ID", "REQUEST_ID", "ACTION", "ENTITY_TYPE", "ENTITY_ID",
    "BRANCH_ID", "DATE", "ACTOR_ID", "ENVIRONMENT", "STATUS", "WRITE_BOUNDARY",
    "BEFORE_STATE_JSON", "BUSINESS_STATE_JSON", "VERSION_STATE_JSON",
    "AUDIT_STATE_JSON", "RESULT_JSON", "ERROR_CODE", "ERROR_MESSAGE",
    "COMPENSATION_STATE_JSON", "RECOVERY_REQUIRED", "CREATED_AT", "UPDATED_AT"
  ]),
  BOOKING_OPERATIONAL_OVERRIDES: Object.freeze([
    "OPERATIONAL_OVERRIDE_ID", "BRANCH_ID", "STAFF_ID", "DATE", "START_TIME",
    "END_TIME", "STATUS", "REASON", "SOURCE_ATTENDANCE_DAY_ID",
    "SOURCE_EVENT_IDS_JSON", "CREATED_AT", "CREATED_BY", "REVOKED_AT",
    "REVOKED_BY", "REVOCATION_REASON", "LAST_REQUEST_ID"
  ]),
  BOOKING_AVAILABILITY_CONFLICTS: Object.freeze([
    "CONFLICT_ID", "CONFLICT_CODE", "BOOKING_ID", "BRANCH_ID", "STAFF_ID",
    "DATE", "SLOT_START", "SLOT_END", "STATUS", "SCHEDULE_SOURCE_IDS_JSON",
    "ATTENDANCE_DAY_ID", "ATTENDANCE_EVENT_IDS_JSON", "DETECTED_AT",
    "DETECTED_BY", "ACKNOWLEDGED_AT", "ACKNOWLEDGED_BY", "RESOLVED_AT",
    "RESOLVED_BY", "RESOLUTION_REASON", "DISMISSED_AT", "DISMISSED_BY",
    "DISMISSAL_REASON", "LAST_REQUEST_ID"
  ]),
  BOOKING_AVAILABILITY_AUDIT: Object.freeze([
    "AUDIT_ID", "ACTION", "ENTITY_TYPE", "ENTITY_ID", "BRANCH_ID", "STAFF_ID",
    "DATE", "ACTOR_ID", "ACTOR_ROLE", "REASON_CODE", "SOURCE_IDS_JSON",
    "BEFORE_STATE_JSON", "AFTER_STATE_JSON", "REQUEST_ID", "CREATED_AT"
  ])
});

var PROD_PHASE5_BOOKING_APPEND_HEADERS = Object.freeze([
  "BRANCH_ID", "AVAILABILITY_TOKEN", "SCHEDULE_VERSION",
  "ATTENDANCE_OPERATIONAL_VERSION", "OPERATIONAL_OVERRIDE_ID",
  "VALIDATED_AT", "VALIDATION_SOURCE_VERSION", "SERVICE_DURATION_SNAPSHOT",
  "PREPARATION_MINUTES_SNAPSHOT", "CLEANUP_MINUTES_SNAPSHOT",
  "OCCUPIED_START_TIME", "OCCUPIED_END_TIME", "SERVICE_CONFIGURATION_VERSION"
]);

var PROD_PHASE5_SERVICE_APPEND_HEADERS = Object.freeze([
  "PREPARATION_MINUTES", "CLEANUP_MINUTES"
]);

function prodPhase5Error(code, message, details) {
  var error = new Error(message || code);
  error.code = code;
  if (details !== undefined) error.details = details;
  return error;
}

function prodPhase5Text(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function prodPhase5NormalizeHeader(value) {
  return prodPhase5Text(value).toUpperCase()
    .replace(/[\s-]+/g, "_").replace(/_+/g, "_");
}

function prodPhase5Identity() {
  var props = PropertiesService.getScriptProperties();

  var environment = prodPhase5Text(
    props.getProperty(PROD_PHASE5_ENVIRONMENT_PROPERTY)
  ).toLowerCase();
  if (environment !== "production") {
    throw prodPhase5Error(
      "PRODUCTION_ENVIRONMENT_REQUIRED",
      "CUT_HUB_ENVIRONMENT must equal production."
    );
  }

  var configuredSpreadsheetId = prodPhase5Text(
    props.getProperty(PROD_PHASE5_SPREADSHEET_PROPERTY)
  );
  if (configuredSpreadsheetId !== PROD_PHASE5_EXPECTED_SPREADSHEET_ID) {
    throw prodPhase5Error(
      "PRODUCTION_SPREADSHEET_PIN_MISMATCH",
      "Production spreadsheet pin does not match reviewed identity."
    );
  }

  var scriptId = prodPhase5Text(ScriptApp.getScriptId());
  if (scriptId !== PROD_PHASE5_EXPECTED_SCRIPT_ID) {
    throw prodPhase5Error(
      "PRODUCTION_SCRIPT_ID_MISMATCH",
      "Phase 5 runner is not inside the reviewed Production Apps Script project."
    );
  }

  var spreadsheet = SpreadsheetApp.getActive();
  if (!spreadsheet ||
      prodPhase5Text(spreadsheet.getId()) !== PROD_PHASE5_EXPECTED_SPREADSHEET_ID) {
    throw prodPhase5Error(
      "PRODUCTION_ACTIVE_SPREADSHEET_MISMATCH",
      "Active spreadsheet is not the reviewed Production spreadsheet."
    );
  }

  var effectiveEmail = prodPhase5Text(Session.getEffectiveUser().getEmail()).toLowerCase();
  var activeEmail = prodPhase5Text(Session.getActiveUser().getEmail()).toLowerCase();
  var ownerEmail = "";
  try {
    var file = DriveApp.getFileById(spreadsheet.getId());
    var owner = file && file.getOwner ? file.getOwner() : null;
    ownerEmail = prodPhase5Text(owner && owner.getEmail ? owner.getEmail() : "").toLowerCase();
  } catch (_error) {
    ownerEmail = "";
  }

  if (!effectiveEmail || !activeEmail || !ownerEmail ||
      effectiveEmail !== activeEmail || activeEmail !== ownerEmail) {
    throw prodPhase5Error(
      "PRODUCTION_OWNER_REQUIRED",
      "Only the verified Production spreadsheet owner may preview Phase 5 migration."
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

function prodPhase5SheetHeaders(sheet) {
  if (!sheet || sheet.getLastColumn() < 1) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(prodPhase5NormalizeHeader);
}

function prodPhase5DuplicateHeaders(headers) {
  return headers.filter(function (header, index) {
    return header && headers.indexOf(header) !== index;
  });
}

function prodPhase5PlanCreateOrValidateAuthoritySheet(spreadsheet, name, expected, plan) {
  var sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    plan.createSheets.push({ sheetName: name, headers: expected.slice() });
    return;
  }

  var headers = prodPhase5SheetHeaders(sheet);
  var normalizedExpected = expected.map(prodPhase5NormalizeHeader);
  var duplicates = prodPhase5DuplicateHeaders(headers);
  if (duplicates.length) {
    plan.errors.push({
      code: "PHASE5_DUPLICATE_HEADERS",
      sheetName: name,
      headers: duplicates
    });
    return;
  }

  var unknown = headers.filter(function (header) {
    return header && normalizedExpected.indexOf(header) === -1;
  });
  if (unknown.length) {
    plan.errors.push({
      code: "PHASE5_UNKNOWN_AUTHORITY_COLUMNS",
      sheetName: name,
      headers: unknown
    });
    return;
  }

  if (headers.length !== normalizedExpected.length ||
      headers.some(function (header, index) {
        return header !== normalizedExpected[index];
      })) {
    plan.errors.push({
      code: "PHASE5_AUTHORITY_HEADER_ORDER_INCOMPATIBLE",
      sheetName: name
    });
    return;
  }

  plan.unchangedSheets.push(name);
}

function prodPhase5PlanAppendHeaders(spreadsheet, sheetName, requiredAppendHeaders, plan) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    plan.errors.push({
      code: "PHASE5_REQUIRED_BASE_SHEET_MISSING",
      sheetName: sheetName
    });
    return;
  }

  var headers = prodPhase5SheetHeaders(sheet);
  var duplicates = prodPhase5DuplicateHeaders(headers);
  if (duplicates.length) {
    plan.errors.push({
      code: "PHASE5_DUPLICATE_HEADERS",
      sheetName: sheetName,
      headers: duplicates
    });
    return;
  }

  var normalizedRequired = requiredAppendHeaders.map(prodPhase5NormalizeHeader);
  var present = normalizedRequired.filter(function (header) {
    return headers.indexOf(header) !== -1;
  });
  var missing = normalizedRequired.filter(function (header) {
    return headers.indexOf(header) === -1;
  });

  if (present.length && missing.length) {
    var firstPresentIndex = Math.min.apply(null, present.map(function (header) {
      return headers.indexOf(header);
    }));
    var expectedStart = headers.length - present.length;
    if (firstPresentIndex < expectedStart) {
      plan.errors.push({
        code: "PHASE5_APPEND_HEADERS_NOT_TRAILING",
        sheetName: sheetName
      });
      return;
    }
  }

  if (!missing.length) {
    plan.unchangedSheets.push(sheetName);
    return;
  }

  var startColumn = headers.length + 1;
  var endColumn = headers.length + missing.length;
  plan.appendColumns[sheetName] = missing.slice();
  plan.rollback.appendedColumnRanges.push({
    sheetName: sheetName,
    startColumn: startColumn,
    endColumn: endColumn,
    headers: missing.slice()
  });
}

function prodPhase5LiveDataPrerequisites(spreadsheet, plan) {
  var staff = spreadsheet.getSheetByName("STAFF");
  var bookings = spreadsheet.getSheetByName("Bookings");

  if (!staff) {
    plan.errors.push({ code: "PHASE5_STAFF_SHEET_MISSING" });
  } else {
    var staffHeaders = prodPhase5SheetHeaders(staff);
    if (staffHeaders.indexOf("BRANCH_ID") === -1) {
      plan.blockers.push({
        code: "PHASE5_STAFF_BRANCH_MAPPING_REQUIRED",
        message: "STAFF.BRANCH_ID must exist and be populated before Phase 5 can become authoritative."
      });
    }
  }

  if (!bookings) {
    plan.errors.push({ code: "PHASE5_BOOKINGS_SHEET_MISSING" });
  } else {
    var bookingHeaders = prodPhase5SheetHeaders(bookings);
    if (bookingHeaders.indexOf("BRANCH_ID") === -1) {
      plan.blockers.push({
        code: "PHASE5_BOOKING_BRANCH_BACKFILL_POLICY_REQUIRED",
        message: "Existing bookings need an approved branch assignment policy before Phase 5 authority activation."
      });
    }
  }
}

function previewProductionPhase5Migration() {
  var identity = prodPhase5Identity();
  var spreadsheet = identity.spreadsheet;

  var plan = {
    schemaVersion: PROD_PHASE5_VERSION,
    version: PROD_PHASE5_VERSION,
    mode: "PRODUCTION_PHASE5_ZERO_WRITE_PREVIEW",
    dryRun: true,
    writes: 0,
    executionAllowed: false,
    executionArmed: PROD_PHASE5_EXECUTION_ARMED === true,
    identity: {
      environment: identity.environment,
      scriptId: identity.scriptId,
      expectedSpreadsheetId: PROD_PHASE5_EXPECTED_SPREADSHEET_ID,
      actualSpreadsheetId: identity.spreadsheetId,
      timezone: identity.timezone,
      actorIdentity: identity.actorIdentity
    },
    createSheets: [],
    appendColumns: {},
    unchangedSheets: [],
    errors: [],
    blockers: [],
    rollback: {
      createdSheets: [],
      appendedColumnRanges: [],
      historicalRowsTouched: 0
    },
    activationPrerequisites: [
      "Phase 2 schema complete",
      "Phase 3 schema complete",
      "Phase 4 schema complete",
      "Canonical branch registry approved",
      "Branch hours approved",
      "STAFF branch mapping approved",
      "Historical booking branch policy approved",
      "Feature flags remain non-authoritative until smoke verification"
    ]
  };

  Object.keys(PROD_PHASE5_AUTHORITY_SCHEMAS).forEach(function (name) {
    prodPhase5PlanCreateOrValidateAuthoritySheet(
      spreadsheet,
      name,
      PROD_PHASE5_AUTHORITY_SCHEMAS[name],
      plan
    );
  });

  prodPhase5PlanAppendHeaders(
    spreadsheet,
    "Bookings",
    PROD_PHASE5_BOOKING_APPEND_HEADERS,
    plan
  );

  prodPhase5PlanAppendHeaders(
    spreadsheet,
    "SERVICES",
    PROD_PHASE5_SERVICE_APPEND_HEADERS,
    plan
  );

  prodPhase5LiveDataPrerequisites(spreadsheet, plan);

  plan.rollback.createdSheets = plan.createSheets.map(function (item) {
    return item.sheetName;
  });
  plan.safe = plan.errors.length === 0;
  plan.schemaReadyForExecutionReview = plan.safe === true;
  plan.activationReady = plan.safe === true && plan.blockers.length === 0;

  console.log(JSON.stringify(plan, null, 2));
  return plan;
}

function executeProductionPhase5Migration() {
  throw prodPhase5Error(
    "PRODUCTION_PHASE5_EXECUTION_NOT_IMPLEMENTED",
    "Phase 5 Production execution is intentionally absent from this review package."
  );
}

function previewProductionPhase5BranchConfiguration() {
  var identity = prodPhase5Identity();
  var weekdays = [
    "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY",
    "THURSDAY", "FRIDAY", "SATURDAY"
  ];
  var hours = weekdays.map(function (weekday) {
    return {
      weekday: weekday,
      openTime: "12:00",
      closeTime: "02:00",
      active: true,
      effectiveFrom: "",
      effectiveTo: ""
    };
  });

  return {
    dryRun: true,
    writes: 0,
    safe: true,
    branch: {
      branchId: "CUT_HUB_MAIN",
      branchName: "CUT HUB MAIN BRANCH",
      active: true,
      timeZone: "Africa/Cairo",
      publicSelectable: true,
      closureStatus: "OPEN",
      closureReason: ""
    },
    weeklyOpeningHours: hours,
    note: "12:00 -> 02:00 is intentionally cross-midnight; the Phase 5 interval engine treats an end time <= start time as next-day."
  };
}
