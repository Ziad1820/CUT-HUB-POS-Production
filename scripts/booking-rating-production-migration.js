/**
 * One-time booking/rating production schema migration.
 *
 * This file is intentionally isolated from the application runtime. None of its
 * entry points are called by doPost(), doGet(), booking reads/writes, or normal
 * initialization.
 */

const BOOKING_RATING_PRODUCTION_MIGRATION_ENV_PROPERTY = "CUT_HUB_ENVIRONMENT";
const BOOKING_RATING_PRODUCTION_MIGRATION_SPREADSHEET_PROPERTY = "CUT_HUB_SPREADSHEET_ID";
const BOOKING_RATING_PRODUCTION_MIGRATION_LOCK_WAIT_MS = 30000;

const BOOKING_RATING_PRODUCTION_LEGACY_BOOKING_HEADERS = [
  "ID", "DATE", "TIME", "CUSTOMER", "PHONE", "EMPLOYEE", "SERVICE", "NOTE", "STATUS",
  "CREATED_AT", "UPDATED_AT", "SERVICE_ID", "DURATION_MINUTES", "SOURCE", "TRACKING_TOKEN",
  "REQUESTED_AT", "CONFIRMED_AT", "CONFIRMED_BY", "REJECTION_REASON", "PROPOSED_DATE",
  "PROPOSED_TIME", "HOLD_EXPIRES_AT", "CUSTOMER_RESPONSE", "EMPLOYEE_ID"
];

const BOOKING_RATING_PRODUCTION_BOOKING_HEADERS_TO_APPEND = [
  "CANCELLED_AT", "CANCELLED_BY", "CANCELLATION_REASON", "COMPLETED_AT", "COMPLETED_BY",
  "DELETED", "DELETED_AT", "DELETED_BY", "SERVICE_IDS", "TOTAL_PRICE", "DELETION_REASON",
  "CLIENT_REQUEST_ID", "CLIENT_REQUEST_FINGERPRINT"
];

const BOOKING_RATING_PRODUCTION_RATING_HEADERS = [
  "RATING_ID", "BOOKING_ID", "TRACKING_TOKEN", "EMPLOYEE_ID", "EMPLOYEE_NAME",
  "RATING", "COMMENT", "SERVICE", "BOOKING_DATE", "CREATED_AT", "STATUS",
  "CUSTOMER_PHONE_HASH", "UPDATED_AT"
];

const BOOKING_RATING_PRODUCTION_SCHEDULE_HEADERS = [
  "SCHEDULE_ID", "STAFF_ID", "STAFF_NAME", "WEEKDAY",
  "SHIFT_START", "SHIFT_END", "ACTIVE", "UPDATED_AT"
];

const BOOKING_RATING_PRODUCTION_AUDIT_SHEETS = [
  "Bookings", "BOOKING_RATINGS", "BARBER_SCHEDULE", "SERVICES",
  "STAFF", "ATTENDANCE", "USERS", "ACTIVITY_LOG"
];

/**
 * Read-only preview entry point for the Apps Script editor.
 */
function previewBookingRatingProductionMigration() {
  return runBookingRatingProductionMigration(true);
}

/**
 * Explicit write entry point. Run only in an approved production maintenance
 * window after reviewing previewBookingRatingProductionMigration().
 */
function executeBookingRatingProductionMigration() {
  return runBookingRatingProductionMigration(false);
}

/**
 * @param {boolean} DRY_RUN true performs no spreadsheet writes.
 */
function runBookingRatingProductionMigration(DRY_RUN) {
  if (typeof DRY_RUN !== "boolean") {
    throw bookingRatingProductionMigrationError(
      "PRODUCTION_MIGRATION_MODE_REQUIRED",
      "DRY_RUN must be explicitly true or false."
    );
  }

  const lock = LockService.getScriptLock();
  let acquired = false;
  try {
    const initialIdentity = assertBookingRatingProductionMigrationEnvironment();
    if (typeof lock.tryLock === "function") {
      acquired = lock.tryLock(BOOKING_RATING_PRODUCTION_MIGRATION_LOCK_WAIT_MS);
    } else {
      lock.waitLock(BOOKING_RATING_PRODUCTION_MIGRATION_LOCK_WAIT_MS);
      acquired = true;
    }
    if (!acquired) {
      throw bookingRatingProductionMigrationError(
        "PRODUCTION_MIGRATION_LOCK_TIMEOUT",
        "Could not acquire the production migration lock."
      );
    }

    const identity = assertBookingRatingProductionMigrationEnvironment();
    if (
      identity.configuredSpreadsheetId !== initialIdentity.configuredSpreadsheetId ||
      identity.spreadsheet.getId() !== initialIdentity.spreadsheet.getId()
    ) {
      throw bookingRatingProductionMigrationError(
        "PRODUCTION_MIGRATION_STATE_CHANGED",
        "Production migration identity changed while acquiring the lock."
      );
    }
    const timestamp = new Date().toISOString();
    const before = auditBookingRatingProductionSpreadsheet(identity.spreadsheet);
    const plan = planBookingRatingProductionMigration(identity.spreadsheet, before);

    let applied = {
      createdSheets: [],
      addedColumns: [],
      rowsModified: 0,
      cellsModified: 0
    };

    if (!DRY_RUN) {
      applied = applyBookingRatingProductionMigration(identity.spreadsheet, plan);
    }

    const after = DRY_RUN
      ? projectBookingRatingProductionMigrationAfterState(before, plan)
      : auditBookingRatingProductionSpreadsheet(identity.spreadsheet);

    const report = {
      status: DRY_RUN ? "dry-run" : "success",
      dryRun: DRY_RUN,
      migrationTimestamp: timestamp,
      environment: identity.environment,
      spreadsheetName: identity.spreadsheet.getName(),
      spreadsheetId: identity.spreadsheet.getId(),
      timezone: identity.spreadsheet.getSpreadsheetTimeZone(),
      before,
      after,
      plannedCreatedSheets: plan.createdSheets.map((item) => item.name),
      plannedAddedColumns: plan.addedColumns.map(bookingRatingProductionMigrationColumnReport),
      plannedRowsModified: 0,
      plannedCellsModified: plan.cellsModified,
      createdSheets: applied.createdSheets,
      addedColumns: applied.addedColumns,
      rowsModified: applied.rowsModified,
      cellsModified: applied.cellsModified,
      warnings: plan.warnings,
      errors: [],
      rollback: {
        spreadsheetId: identity.spreadsheet.getId(),
        migrationTimestamp: timestamp,
        addedColumns: applied.addedColumns,
        createdSheets: applied.createdSheets,
        instructions: [
          "Use the approved pre-migration native and XLSX backups as the source of truth.",
          "Verify that migration-created sheets contain no production rows before removing them.",
          "Verify that appended booking columns contain no production values before removing them.",
          "Perform rollback only under separate approval and preserve the original spreadsheet ID."
        ]
      }
    };

    Logger.log(JSON.stringify(report));
    return report;
  } catch (error) {
    const failure = {
      status: "error",
      dryRun: DRY_RUN,
      migrationTimestamp: new Date().toISOString(),
      errorCode: String(error && error.code || error && error.message || "PRODUCTION_MIGRATION_FAILED"),
      message: String(error && error.safeMessage || error && error.message || "Production migration failed.")
    };
    try {
      Logger.log(JSON.stringify(failure));
    } catch (ignore) {}
    throw error;
  } finally {
    if (acquired) lock.releaseLock();
  }
}

function assertBookingRatingProductionMigrationEnvironment() {
  const properties = PropertiesService.getScriptProperties();
  const environment = String(
    properties.getProperty(BOOKING_RATING_PRODUCTION_MIGRATION_ENV_PROPERTY) || ""
  ).trim().toLowerCase();
  const configuredSpreadsheetId = String(
    properties.getProperty(BOOKING_RATING_PRODUCTION_MIGRATION_SPREADSHEET_PROPERTY) || ""
  ).trim();
  const spreadsheet = typeof SpreadsheetApp.getActiveSpreadsheet === "function"
    ? SpreadsheetApp.getActiveSpreadsheet()
    : SpreadsheetApp.getActive();

  if (
    environment !== "production" ||
    !configuredSpreadsheetId ||
    !spreadsheet ||
    spreadsheet.getId() !== configuredSpreadsheetId
  ) {
    throw bookingRatingProductionMigrationError(
      "PRODUCTION_MIGRATION_CONFIGURATION_INVALID",
      "Production migration configuration is invalid."
    );
  }

  return {
    environment,
    configuredSpreadsheetId,
    spreadsheet
  };
}

function auditBookingRatingProductionSpreadsheet(spreadsheet) {
  const sheets = spreadsheet.getSheets();
  const tabs = sheets.map((sheet) => ({
    name: sheet.getName(),
    rowCount: Math.max(0, Number(sheet.getLastRow()) || 0),
    dataRowCount: Math.max(0, (Number(sheet.getLastRow()) || 0) - 1),
    columnCount: Math.max(0, Number(sheet.getLastColumn()) || 0),
    maxRowCount: typeof sheet.getMaxRows === "function"
      ? Math.max(0, Number(sheet.getMaxRows()) || 0)
      : null,
    maxColumnCount: typeof sheet.getMaxColumns === "function"
      ? Math.max(0, Number(sheet.getMaxColumns()) || 0)
      : null
  }));

  const headers = {};
  BOOKING_RATING_PRODUCTION_AUDIT_SHEETS.forEach((name) => {
    const sheet = spreadsheet.getSheetByName(name);
    headers[name] = sheet
      ? {
          exists: true,
          headers: readBookingRatingProductionMigrationHeaders(sheet)
        }
      : {
          exists: false,
          headers: []
        };
  });

  return {
    spreadsheetName: spreadsheet.getName(),
    spreadsheetId: spreadsheet.getId(),
    timezone: spreadsheet.getSpreadsheetTimeZone(),
    existingTabs: sheets.map((sheet) => sheet.getName()),
    tabs,
    headers
  };
}

function planBookingRatingProductionMigration(spreadsheet, before) {
  const warnings = [];
  const addedColumns = [];
  const createdSheets = [];
  const validatedSheets = [];
  const bookings = spreadsheet.getSheetByName("Bookings");

  if (!bookings) {
    throw bookingRatingProductionMigrationError(
      "PRODUCTION_MIGRATION_SCHEMA_INVALID",
      "Required Bookings sheet is missing."
    );
  }

  const bookingHeaders = before.headers.Bookings.headers;
  const bookingAnalysis = analyzeBookingRatingProductionMigrationHeaders(
    bookingHeaders,
    BOOKING_RATING_PRODUCTION_LEGACY_BOOKING_HEADERS,
    BOOKING_RATING_PRODUCTION_BOOKING_HEADERS_TO_APPEND,
    true
  );
  if (bookingAnalysis.missingRequired.length) {
    throw bookingRatingProductionMigrationError(
      "PRODUCTION_MIGRATION_SCHEMA_INVALID",
      `Bookings is missing required legacy headers: ${bookingAnalysis.missingRequired.join(", ")}`
    );
  }
  if (bookingAnalysis.duplicates.length) {
    throw bookingRatingProductionMigrationError(
      "PRODUCTION_MIGRATION_SCHEMA_INVALID",
      `Bookings contains duplicate canonical headers: ${bookingAnalysis.duplicates.join(", ")}`
    );
  }
  if (bookingAnalysis.unexpected.length) {
    warnings.push(`Bookings contains preserved unexpected headers: ${bookingAnalysis.unexpected.join(", ")}`);
  }
  if (bookingAnalysis.missingOptional.length) {
    addedColumns.push({
      sheetName: "Bookings",
      startColumn: bookingHeaders.length + 1,
      headers: bookingAnalysis.missingOptional,
      beforeHeaders: bookingHeaders.slice()
    });
  }

  planBookingRatingProductionValidatedSheet(
    spreadsheet,
    before,
    "BOOKING_RATINGS",
    BOOKING_RATING_PRODUCTION_RATING_HEADERS,
    createdSheets,
    validatedSheets,
    warnings
  );
  planBookingRatingProductionValidatedSheet(
    spreadsheet,
    before,
    "BARBER_SCHEDULE",
    BOOKING_RATING_PRODUCTION_SCHEDULE_HEADERS,
    createdSheets,
    validatedSheets,
    warnings
  );

  return {
    createdSheets,
    addedColumns,
    validatedSheets,
    cellsModified: addedColumns.reduce((total, item) => total + item.headers.length, 0) +
      createdSheets.reduce((total, item) => total + item.headers.length, 0),
    warnings
  };
}

function planBookingRatingProductionValidatedSheet(
  spreadsheet,
  before,
  sheetName,
  requiredHeaders,
  createdSheets,
  validatedSheets,
  warnings
) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    createdSheets.push({ name: sheetName, headers: requiredHeaders.slice() });
    return;
  }

  const current = before.headers[sheetName].headers;
  const analysis = analyzeBookingRatingProductionMigrationHeaders(
    current,
    requiredHeaders,
    [],
    false
  );
  if (analysis.missingRequired.length || analysis.duplicates.length) {
    const details = [];
    if (analysis.missingRequired.length) {
      details.push(`missing: ${analysis.missingRequired.join(", ")}`);
    }
    if (analysis.duplicates.length) {
      details.push(`duplicates: ${analysis.duplicates.join(", ")}`);
    }
    throw bookingRatingProductionMigrationError(
      "PRODUCTION_MIGRATION_SCHEMA_INVALID",
      `${sheetName} header validation failed (${details.join("; ")}).`
    );
  }
  if (analysis.unexpected.length) {
    warnings.push(`${sheetName} contains preserved unexpected headers: ${analysis.unexpected.join(", ")}`);
  }
  validatedSheets.push({
    sheetName,
    beforeHeaders: current.slice()
  });
}

function analyzeBookingRatingProductionMigrationHeaders(
  currentHeaders,
  requiredHeaders,
  optionalHeaders,
  useBookingAliases
) {
  const seen = {};
  const duplicates = [];
  const normalized = [];

  currentHeaders.forEach((header) => {
    if (!String(header || "").trim()) return;
    const key = bookingRatingProductionMigrationHeaderKey(header, useBookingAliases);
    normalized.push(key);
    if (seen[key]) duplicates.push(String(header));
    seen[key] = true;
  });

  const requiredKeys = {};
  requiredHeaders.forEach((header) => {
    requiredKeys[bookingRatingProductionMigrationHeaderKey(header, useBookingAliases)] = header;
  });
  const optionalKeys = {};
  optionalHeaders.forEach((header) => {
    optionalKeys[bookingRatingProductionMigrationHeaderKey(header, useBookingAliases)] = header;
  });

  const missingRequired = requiredHeaders.filter((header) =>
    !seen[bookingRatingProductionMigrationHeaderKey(header, useBookingAliases)]
  );
  const missingOptional = optionalHeaders.filter((header) =>
    !seen[bookingRatingProductionMigrationHeaderKey(header, useBookingAliases)]
  );
  const unexpected = currentHeaders.filter((header) => {
    if (!String(header || "").trim()) return false;
    const key = bookingRatingProductionMigrationHeaderKey(header, useBookingAliases);
    return !requiredKeys[key] && !optionalKeys[key];
  });

  return {
    normalized,
    missingRequired,
    missingOptional,
    duplicates,
    unexpected
  };
}

function bookingRatingProductionMigrationHeaderKey(value, useBookingAliases) {
  const key = String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (!useBookingAliases) return key;
  return ({
    bookingid: "id",
    bookingdate: "date",
    bookingtime: "time",
    customername: "customer",
    customerphone: "phone",
    barber: "employee",
    employeename: "employee",
    services: "service",
    notes: "note",
    duration: "durationminutes",
    trackingcode: "trackingtoken",
    staffid: "employeeid"
  })[key] || key;
}

function applyBookingRatingProductionMigration(spreadsheet, plan) {
  const applied = {
    createdSheets: [],
    addedColumns: [],
    rowsModified: 0,
    cellsModified: 0
  };

  assertBookingRatingProductionMigrationPlanIsCurrent(spreadsheet, plan);

  plan.addedColumns.forEach((item) => {
    const sheet = spreadsheet.getSheetByName(item.sheetName);
    assertBookingRatingProductionMigrationHeaderSnapshot(sheet, item.beforeHeaders);
    ensureBookingRatingProductionMigrationColumnCapacity(
      sheet,
      item.startColumn + item.headers.length - 1
    );
    sheet.getRange(1, item.startColumn, 1, item.headers.length).setValues([item.headers]);
    applied.addedColumns.push(bookingRatingProductionMigrationColumnReport(item));
    applied.cellsModified += item.headers.length;
  });

  plan.createdSheets.forEach((item) => {
    if (spreadsheet.getSheetByName(item.name)) {
      throw bookingRatingProductionMigrationError(
        "PRODUCTION_MIGRATION_STATE_CHANGED",
        `${item.name} appeared after migration planning. No automatic repair was attempted.`
      );
    }
    const sheet = spreadsheet.insertSheet(item.name);
    ensureBookingRatingProductionMigrationColumnCapacity(sheet, item.headers.length);
    sheet.getRange(1, 1, 1, item.headers.length).setValues([item.headers]);
    applied.createdSheets.push(item.name);
    applied.cellsModified += item.headers.length;
  });

  return applied;
}

function assertBookingRatingProductionMigrationPlanIsCurrent(spreadsheet, plan) {
  plan.addedColumns.forEach((item) => {
    assertBookingRatingProductionMigrationHeaderSnapshot(
      spreadsheet.getSheetByName(item.sheetName),
      item.beforeHeaders
    );
  });
  plan.validatedSheets.forEach((item) => {
    assertBookingRatingProductionMigrationHeaderSnapshot(
      spreadsheet.getSheetByName(item.sheetName),
      item.beforeHeaders
    );
  });
  plan.createdSheets.forEach((item) => {
    if (spreadsheet.getSheetByName(item.name)) {
      throw bookingRatingProductionMigrationError(
        "PRODUCTION_MIGRATION_STATE_CHANGED",
        `${item.name} appeared after migration planning. No automatic repair was attempted.`
      );
    }
  });
}

function assertBookingRatingProductionMigrationHeaderSnapshot(sheet, expectedHeaders) {
  if (!sheet) {
    throw bookingRatingProductionMigrationError(
      "PRODUCTION_MIGRATION_STATE_CHANGED",
      "A planned migration sheet disappeared before apply."
    );
  }
  const current = readBookingRatingProductionMigrationHeaders(sheet);
  if (JSON.stringify(current) !== JSON.stringify(expectedHeaders)) {
    throw bookingRatingProductionMigrationError(
      "PRODUCTION_MIGRATION_STATE_CHANGED",
      `${sheet.getName()} headers changed after migration planning.`
    );
  }
}

function ensureBookingRatingProductionMigrationColumnCapacity(sheet, requiredColumns) {
  const maxColumns = Math.max(1, Number(sheet.getMaxColumns()) || 1);
  if (maxColumns < requiredColumns) {
    sheet.insertColumnsAfter(maxColumns, requiredColumns - maxColumns);
  }
}

function readBookingRatingProductionMigrationHeaders(sheet) {
  const width = Math.max(0, Number(sheet.getLastColumn()) || 0);
  if (!width) return [];
  return sheet.getRange(1, 1, 1, width).getValues()[0]
    .map((header) => String(header == null ? "" : header).trim());
}

function projectBookingRatingProductionMigrationAfterState(before, plan) {
  const projected = JSON.parse(JSON.stringify(before));

  plan.addedColumns.forEach((item) => {
    projected.headers[item.sheetName].headers =
      projected.headers[item.sheetName].headers.concat(item.headers);
    const tab = projected.tabs.find((entry) => entry.name === item.sheetName);
    if (tab) {
      tab.columnCount = Math.max(tab.columnCount, item.startColumn + item.headers.length - 1);
      tab.maxColumnCount = tab.maxColumnCount == null
        ? null
        : Math.max(tab.maxColumnCount, tab.columnCount);
    }
  });

  plan.createdSheets.forEach((item) => {
    projected.existingTabs.push(item.name);
    projected.tabs.push({
      name: item.name,
      rowCount: 1,
      dataRowCount: 0,
      columnCount: item.headers.length,
      maxRowCount: null,
      maxColumnCount: null
    });
    projected.headers[item.name] = {
      exists: true,
      headers: item.headers.slice()
    };
  });

  projected.projected = true;
  return projected;
}

function bookingRatingProductionMigrationColumnReport(item) {
  return {
    sheetName: item.sheetName,
    startColumn: item.startColumn,
    endColumn: item.startColumn + item.headers.length - 1,
    headers: item.headers.slice()
  };
}

function bookingRatingProductionMigrationError(code, safeMessage) {
  const error = new Error(code);
  error.code = code;
  error.safeMessage = safeMessage;
  return error;
}
