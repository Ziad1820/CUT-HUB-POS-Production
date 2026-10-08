const CORE_AUTH_PREVIEW_SHEETS = [
  {
    name: "USERS",
    role: "AUTHENTICATION",
    minimumColumns: 6,
    fieldsByPosition: [
      "USERNAME", "PASSWORD", "DISPLAY_NAME", "PERMISSIONS", "CREATED_AT", "PASSWORD_HASH"
    ]
  },
  {
    name: "ACTIVITY_LOG",
    role: "LOGIN_AUDIT_OPTIONAL_AT_RUNTIME",
    minimumColumns: 8,
    fieldsByPosition: [
      "LOG_ID", "ACTION", "ENTITY_TYPE", "ENTITY_ID", "USERNAME", "DISPLAY_NAME",
      "DETAILS", "CREATED_AT"
    ]
  },
  {
    name: "DATA",
    role: "DEFAULT_OWNER_DASHBOARD",
    minimumColumns: 13,
    fieldsByPosition: [
      "DATE_TIME", "CUSTOMER_NAME", "CUSTOMER_PHONE", "SERVICES", "PDF_URL", "TOTAL",
      "PAID_AMOUNT", "TIP_AMOUNT", "PAYMENT_METHOD", "BARBER", "NOTE",
      "DISCOUNT_PERCENT", "DISCOUNT_AMOUNT"
    ]
  },
  {
    name: "DAILY_CLOSINGS",
    role: "DEFAULT_OWNER_DASHBOARD",
    minimumColumns: 13,
    fieldsByPosition: [
      "CLOSING_ID", "DATE", "SALES_TOTAL", "CASH_TOTAL", "VISA_TOTAL", "INSTAPAY_TOTAL",
      "VODAFONE_CASH_TOTAL", "EXPENSES_TOTAL", "WITHDRAWALS_TOTAL", "NET_TOTAL",
      "CLOSED_BY_USERNAME", "CLOSED_BY_DISPLAY_NAME", "CLOSED_AT"
    ]
  },
  {
    name: "EXPENSES",
    role: "DEFAULT_OWNER_DASHBOARD_TOTALS",
    minimumColumns: 6,
    fieldsByPosition: ["CATEGORY", "AMOUNT", "TITLE", "NOTE", "DATE", "EXPENSE_ID"]
  },
  {
    name: "WITHDRAWLS",
    role: "DEFAULT_OWNER_DASHBOARD_TOTALS",
    minimumColumns: 5,
    fieldsByPosition: ["STAFF_NAME", "AMOUNT", "NOTE", "DATE", "WITHDRAWAL_ID"]
  }
];

function coreAuthPreviewAssertStagingOwner() {
  const config = getCutHubEnvironmentConfig();
  if (String(config.environment || "").trim().toLowerCase() !== "staging") {
    throw new Error("CORE_AUTH_PREVIEW_STAGING_ONLY");
  }
  if (
    !CUT_HUB_SPREADSHEET_ID_PATTERN.test(config.spreadsheetId) ||
    !CUT_HUB_SPREADSHEET_ID_PATTERN.test(config.stagingSpreadsheetId) ||
    config.spreadsheetId !== config.stagingSpreadsheetId
  ) {
    throw new Error("CORE_AUTH_PREVIEW_STAGING_IDENTITY_INVALID");
  }

  const strict = assertStagingEnvironment();
  let effectiveEmail = "";
  let activeEmail = "";
  let ownerEmail = "";
  try {
    effectiveEmail = String(Session.getEffectiveUser().getEmail() || "").trim().toLowerCase();
    activeEmail = String(Session.getActiveUser().getEmail() || "").trim().toLowerCase();
    const owner = DriveApp.getFileById(strict.spreadsheet.getId()).getOwner();
    ownerEmail = String(owner && owner.getEmail ? owner.getEmail() : "").trim().toLowerCase();
  } catch (error) {
    effectiveEmail = "";
    activeEmail = "";
    ownerEmail = "";
  }
  if (!effectiveEmail || !activeEmail || !ownerEmail ||
      effectiveEmail !== activeEmail || activeEmail !== ownerEmail) {
    throw new Error("CORE_AUTH_PREVIEW_OWNER_REQUIRED");
  }
  return {
    config: strict.config,
    spreadsheet: strict.spreadsheet,
    actorIdentity: effectiveEmail
  };
}

function coreAuthPreviewSheetState(spreadsheet, definition) {
  const sheet = spreadsheet.getSheetByName(definition.name);
  if (!sheet) {
    return {
      sheetName: definition.name,
      role: definition.role,
      exists: false,
      compatible: false,
      minimumColumns: definition.minimumColumns,
      missingColumns: definition.fieldsByPosition.map((field, index) => ({
        column: index + 1,
        field
      })),
      headerContract: definition.name === "USERS"
        ? "Columns 1-5 are positional; only column 6 has a literal header check in runtime source."
        : "Positional runtime contract; header labels are not validated by runtime source."
    };
  }

  const lastColumn = Math.max(0, Number(sheet.getLastColumn()) || 0);
  const width = Math.max(1, Math.min(definition.minimumColumns, lastColumn || definition.minimumColumns));
  const headers = sheet.getRange(1, 1, 1, width).getValues()[0]
    .map(value => String(value || "").trim());
  const missingColumns = definition.fieldsByPosition
    .map((field, index) => ({ column: index + 1, field }))
    .filter(item => item.column > lastColumn);
  const headerIssues = [];
  if (definition.name === "USERS" && lastColumn >= 6 && headers[5] !== "PASSWORD_HASH") {
    headerIssues.push({ column: 6, expected: "PASSWORD_HASH", actual: headers[5] || "" });
  }

  return {
    sheetName: definition.name,
    role: definition.role,
    exists: true,
    compatible: missingColumns.length === 0 && headerIssues.length === 0,
    minimumColumns: definition.minimumColumns,
    actualColumns: lastColumn,
    missingColumns,
    headerIssues,
    headerContract: definition.name === "USERS"
      ? "Columns 1-5 are positional; only column 6 has a literal header check in runtime source."
      : "Positional runtime contract; header labels are not validated by runtime source."
  };
}

function coreAuthPreviewOwnerState(spreadsheet) {
  const sheet = spreadsheet.getSheetByName("USERS");
  if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) {
    return {
      exists: false,
      credentialState: "NO_OWNER_RECORD",
      requiredFieldsPresent: false
    };
  }
  const width = Math.min(6, Math.max(1, sheet.getLastColumn()));
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, width).getValues();
  const owner = rows.find(row => String(row[0] || "").trim().toLowerCase() === "owner");
  if (!owner) {
    return {
      exists: false,
      credentialState: "NO_OWNER_RECORD",
      requiredFieldsPresent: false
    };
  }
  const hasPlaintext = Boolean(String(owner[1] || ""));
  const hasHash = Boolean(String(owner[5] || "").trim());
  return {
    exists: true,
    usernameIsCanonicalOwner: true,
    displayNamePresent: Boolean(String(owner[2] || "").trim()),
    permissionsStored: Boolean(String(owner[3] || "").trim()),
    createdAtPresent: Boolean(owner[4]),
    credentialState: hasHash && hasPlaintext
      ? "HASHED_WITH_PLAINTEXT_RETAINED"
      : (hasHash ? "HASHED_ONLY" : (hasPlaintext ? "PLAINTEXT_LEGACY" : "MISSING")),
    requiredFieldsPresent: hasHash || hasPlaintext
  };
}

function legacyPreviewStagingAuthenticationInitialization() {
  const identity = coreAuthPreviewAssertStagingOwner();
  const sheetStates = CORE_AUTH_PREVIEW_SHEETS.map(definition =>
    coreAuthPreviewSheetState(identity.spreadsheet, definition));
  const ownerRecord = coreAuthPreviewOwnerState(identity.spreadsheet);
  const missingCoreSheets = sheetStates.filter(item => !item.exists).map(item => item.sheetName);
  const incompatibleSheets = sheetStates.filter(item => item.exists && !item.compatible)
    .map(item => item.sheetName);
  const usersState = sheetStates.find(item => item.sheetName === "USERS");
  const initializationRequired = missingCoreSheets.length > 0 || !ownerRecord.exists;
  const blockers = [];
  if (initializationRequired) blockers.push("NO_APPROVED_CORE_BOOTSTRAP_EXISTS");
  if (!usersState.exists) blockers.push("USERS_COLUMNS_1_TO_5_HAVE_NO_LITERAL_CANONICAL_HEADERS_IN_SOURCE");
  if (incompatibleSheets.length) blockers.push("EXISTING_CORE_SHEET_INCOMPATIBLE");

  return {
    schemaVersion: "CORE_AUTH_PREVIEW_V2",
    dryRun: true,
    writes: 0,
    identity: {
      environment: identity.config.environment,
      expectedSpreadsheetId: identity.config.spreadsheetId,
      stagingSpreadsheetId: identity.config.stagingSpreadsheetId,
      actualSpreadsheetId: identity.spreadsheet.getId(),
      actorIdentity: identity.actorIdentity
    },
    canonicalAuthenticationSheet: "USERS",
    usersRuntimeColumnContract: CORE_AUTH_PREVIEW_SHEETS[0].fieldsByPosition.map((field, index) => ({
      column: index + 1,
      field,
      literalHeaderRequiredBySource: index === 5 ? "PASSWORD_HASH" : null
    })),
    missingCoreSheets,
    missingColumns: sheetStates.filter(item => item.missingColumns.length).map(item => ({
      sheetName: item.sheetName,
      columns: item.missingColumns
    })),
    existingCompatibleSheets: sheetStates.filter(item => item.compatible).map(item => item.sheetName),
    incompatibleSheets,
    sheetStates,
    requiredInitialOwnerRecordFields: [
      { column: 1, field: "USERNAME", requiredValue: "owner", requiredForLogin: true },
      { column: 2, field: "PASSWORD", requiredValue: "blank for a new secure record", requiredForLogin: false },
      { column: 3, field: "DISPLAY_NAME", requiredValue: "non-empty display name", requiredForLogin: false },
      { column: 4, field: "PERMISSIONS", requiredValue: "owner permissions are implicit", requiredForLogin: false },
      { column: 5, field: "CREATED_AT", requiredValue: "creation timestamp", requiredForLogin: false },
      { column: 6, field: "PASSWORD_HASH", requiredValue: "canonical cuthub$1 modern credential", requiredForLogin: true }
    ],
    passwordStorage: {
      hashAlgorithm: "PBKDF2-HMAC-SHA-256",
      credentialFormat: "cuthub$1",
      candidateIterations: AUTH01_CREDENTIAL_POLICY.iterations,
      stagingBenchmarkRequired: true,
      salted: true,
      plaintextFallbackAccepted: false,
      successfulLegacyLoginMigratesForward: true,
      successfulLegacyLoginClearsPlaintext: true,
      ownerRecord
    },
    initializationRequired,
    safeToInitialize: !initializationRequired && incompatibleSheets.length === 0,
    blockers
  };
}

