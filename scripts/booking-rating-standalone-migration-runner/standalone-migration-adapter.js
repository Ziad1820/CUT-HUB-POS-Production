const CUT_HUB_STANDALONE_MIGRATION_ENV_PROPERTY = "CUT_HUB_ENVIRONMENT";
const CUT_HUB_STANDALONE_MIGRATION_SPREADSHEET_PROPERTY = "CUT_HUB_SPREADSHEET_ID";
const CUT_HUB_STANDALONE_MIGRATION_CONFIRMATION_PROPERTY =
  "CUT_HUB_PRODUCTION_SPREADSHEET_ID";
const CUT_HUB_STANDALONE_MIGRATION_ENABLED_PROPERTY = "CUT_HUB_MIGRATION_RUNNER_ENABLED";
const CUT_HUB_STANDALONE_MIGRATION_EXECUTION_PROPERTY = "CUT_HUB_MIGRATION_EXECUTION_APPROVED";
const CUT_HUB_STANDALONE_SPREADSHEET_ID_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;

/**
 * Read-only standalone migration preview.
 */
function previewStandaloneBookingRatingProductionMigration() {
  return runBookingRatingProductionMigrationCore_(
    true,
    resolveStandaloneBookingRatingProductionMigrationIdentity_
  );
}

/**
 * Explicit standalone migration execution. Requires a separate approval
 * property in addition to every preview identity gate.
 */
function executeStandaloneBookingRatingProductionMigration() {
  return runBookingRatingProductionMigrationCore_(
    false,
    resolveStandaloneBookingRatingProductionMigrationIdentity_
  );
}

function resolveStandaloneBookingRatingProductionMigrationIdentity_(DRY_RUN) {
  const properties = PropertiesService.getScriptProperties();
  const environment = String(
    properties.getProperty(CUT_HUB_STANDALONE_MIGRATION_ENV_PROPERTY) || ""
  ).trim().toLowerCase();
  const configuredSpreadsheetId = String(
    properties.getProperty(CUT_HUB_STANDALONE_MIGRATION_SPREADSHEET_PROPERTY) || ""
  ).trim();
  const confirmedSpreadsheetId = String(
    properties.getProperty(CUT_HUB_STANDALONE_MIGRATION_CONFIRMATION_PROPERTY) || ""
  ).trim();
  const runnerEnabled = standaloneBookingRatingMigrationPropertyIsTrue_(
    properties.getProperty(CUT_HUB_STANDALONE_MIGRATION_ENABLED_PROPERTY)
  );
  const executionApproved = standaloneBookingRatingMigrationPropertyIsTrue_(
    properties.getProperty(CUT_HUB_STANDALONE_MIGRATION_EXECUTION_PROPERTY)
  );

  if (
    environment !== "production" ||
    !CUT_HUB_STANDALONE_SPREADSHEET_ID_PATTERN.test(configuredSpreadsheetId) ||
    !CUT_HUB_STANDALONE_SPREADSHEET_ID_PATTERN.test(confirmedSpreadsheetId) ||
    configuredSpreadsheetId !== confirmedSpreadsheetId ||
    !runnerEnabled
  ) {
    throw standaloneBookingRatingMigrationError_(
      "STANDALONE_MIGRATION_CONFIGURATION_INVALID",
      "Standalone production migration configuration is invalid."
    );
  }

  if (DRY_RUN !== true && !executionApproved) {
    throw standaloneBookingRatingMigrationError_(
      "STANDALONE_MIGRATION_EXECUTION_NOT_APPROVED",
      "Standalone production migration execution is not approved."
    );
  }

  const spreadsheet = SpreadsheetApp.openById(configuredSpreadsheetId);
  if (
    !spreadsheet ||
    spreadsheet.getId() !== configuredSpreadsheetId
  ) {
    throw standaloneBookingRatingMigrationError_(
      "STANDALONE_MIGRATION_SPREADSHEET_IDENTITY_MISMATCH",
      "Opened spreadsheet identity does not match the approved production spreadsheet."
    );
  }

  return {
    environment,
    configuredSpreadsheetId,
    confirmedSpreadsheetId,
    spreadsheet
  };
}

function standaloneBookingRatingMigrationPropertyIsTrue_(value) {
  return String(value == null ? "" : value).trim().toLowerCase() === "true";
}

function standaloneBookingRatingMigrationError_(code, safeMessage) {
  const error = new Error(code);
  error.code = code;
  error.safeMessage = safeMessage;
  return error;
}
