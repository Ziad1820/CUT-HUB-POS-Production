const CUT_HUB_ENVIRONMENT_PROPERTY = "CUT_HUB_ENVIRONMENT";
const CUT_HUB_SPREADSHEET_ID_PROPERTY = "CUT_HUB_SPREADSHEET_ID";
const CUT_HUB_BACKEND_VERSION_PROPERTY = "CUT_HUB_BACKEND_VERSION";
const CUT_HUB_STAGING_SPREADSHEET_ID_PROPERTY = "CUT_HUB_STAGING_SPREADSHEET_ID";
const STAGING_CONFIGURATION_ERROR = "STAGING_CONFIGURATION_INVALID";
const CUT_HUB_SPREADSHEET_ID_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;

function getCutHubEnvironmentConfig() {
  const properties = PropertiesService.getScriptProperties();
  return {
    environment: String(properties.getProperty(CUT_HUB_ENVIRONMENT_PROPERTY) || "").trim().toLowerCase(),
    spreadsheetId: String(properties.getProperty(CUT_HUB_SPREADSHEET_ID_PROPERTY) || "").trim(),
    stagingSpreadsheetId: String(
      properties.getProperty(CUT_HUB_STAGING_SPREADSHEET_ID_PROPERTY) || "").trim(),
    backendVersion: String(properties.getProperty(CUT_HUB_BACKEND_VERSION_PROPERTY) || "").trim()
  };
}

function assertStagingEnvironment() {
  try {
    const identity = assertCutHubSpreadsheetIdentity();
    const config = identity.config;
    const spreadsheet = identity.spreadsheet;
    if (
      config.environment !== "staging" ||
      !CUT_HUB_SPREADSHEET_ID_PATTERN.test(config.stagingSpreadsheetId) ||
      config.spreadsheetId !== config.stagingSpreadsheetId
    ) {
      throw new Error(STAGING_CONFIGURATION_ERROR);
    }
    return { config, spreadsheet };
  } catch (error) {
    throw new Error(STAGING_CONFIGURATION_ERROR);
  }
}

function assertCutHubSpreadsheetIdentity() {
  try {
    const config = getCutHubEnvironmentConfig();
    const spreadsheet = SpreadsheetApp.getActive();
    const activeSpreadsheetId = spreadsheet && String(spreadsheet.getId() || "").trim();
    if (
      ["development", "test", "staging", "production"].indexOf(config.environment) === -1 ||
      !CUT_HUB_SPREADSHEET_ID_PATTERN.test(config.spreadsheetId) ||
      !spreadsheet ||
      !CUT_HUB_SPREADSHEET_ID_PATTERN.test(activeSpreadsheetId) ||
      activeSpreadsheetId !== config.spreadsheetId
    ) {
      throw new Error(STAGING_CONFIGURATION_ERROR);
    }
    return { config, spreadsheet };
  } catch (error) {
    throw new Error(STAGING_CONFIGURATION_ERROR);
  }
}

function validateCutHubRequestEnvironment() {
  const identity = assertCutHubSpreadsheetIdentity();
  if (identity.config.environment === "staging") return assertStagingEnvironment().config;
  return identity.config;
}

function getStagingIdentityValues() {
  const staging = assertStagingEnvironment();
  return {
    environment: staging.config.environment,
    spreadsheetName: staging.spreadsheet.getName(),
    spreadsheetId: staging.spreadsheet.getId(),
    timezone: staging.spreadsheet.getSpreadsheetTimeZone(),
    backendVersion: staging.config.backendVersion
  };
}

function verifyStagingEnvironment() {
  const identity = getStagingIdentityValues();
  Logger.log(JSON.stringify(identity));
  return identity;
}

function stagingIdentity() {
  const config = getCutHubEnvironmentConfig();
  if (config.environment !== "staging") {
    return jsonOutput({
      status: "error",
      code: "PERMISSION_DENIED",
      message: "This action is available only in staging."
    });
  }
  return jsonOutput(getStagingIdentityValues());
}

