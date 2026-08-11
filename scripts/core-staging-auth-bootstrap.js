/* global SpreadsheetApp, PropertiesService, LockService, Utilities, Session, DriveApp,
  HtmlService, hashPassword, getCutHubEnvironmentConfig, assertStagingEnvironment,
  staffSchemaMigrationHash, staffSchemaMigrationCanonical, staffSchemaMigrationWriteJournal,
  staffSchemaMigrationReadJson, staffSchemaMigrationTryLocks, staffSchemaMigrationNow,
  staffSchemaMigrationErrorDetail, console */

var CORE_STAGING_BOOTSTRAP_SCHEMA_VERSION = "CORE_AUTH_BOOTSTRAP_V1";
var CORE_STAGING_BOOTSTRAP_ID = "CORE_AUTH_STAGING_BOOTSTRAP";
var CORE_STAGING_BOOTSTRAP_JOURNAL_PREFIX = "CORE_AUTH_BOOTSTRAP_JOURNAL_";
var CORE_STAGING_BOOTSTRAP_TOKEN_KEY = "CORE_AUTH_BOOTSTRAP_TOKEN";
var CORE_STAGING_BOOTSTRAP_CREDENTIAL_KEY = "CORE_AUTH_BOOTSTRAP_CREDENTIAL";
var CORE_STAGING_BOOTSTRAP_TOKEN_TTL_MS = 5 * 60 * 1000;
var CORE_STAGING_BOOTSTRAP_CREDENTIAL_TTL_MS = 10 * 60 * 1000;
var CORE_STAGING_BOOTSTRAP_PASSWORD_MIN_LENGTH = 12;
var CORE_STAGING_BOOTSTRAP_USERS_HEADERS = Object.freeze([
  "USERNAME", "PASSWORD", "DISPLAY_NAME", "PERMISSIONS", "CREATED_AT", "PASSWORD_HASH"
]);
var CORE_STAGING_BOOTSTRAP_OPTIONAL_DASHBOARD_SHEETS = Object.freeze([
  Object.freeze({
    sheetName: "DATA",
    absenceBehavior: "Dashboard invoice/stat endpoints return controlled errors; Promise.allSettled keeps the page open."
  }),
  Object.freeze({
    sheetName: "DAILY_CLOSINGS",
    absenceBehavior: "Daily-closing preview errors are caught by the Dashboard and rendered as an empty preview."
  }),
  Object.freeze({
    sheetName: "EXPENSES",
    absenceBehavior: "Dashboard aggregation safely treats the missing sheet as zero expenses."
  }),
  Object.freeze({
    sheetName: "WITHDRAWLS",
    absenceBehavior: "Dashboard aggregation safely treats the missing sheet as zero withdrawals."
  })
]);

function coreStagingBootstrapError(code, message, details) {
  var error = new Error(message || code);
  error.code = code;
  if (details !== undefined) error.details = details;
  return error;
}

function coreStagingBootstrapIdentityAndOwner() {
  var config = getCutHubEnvironmentConfig();
  var environment = String(config.environment || "").trim().toLowerCase();
  if (environment !== "staging") {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_STAGING_ONLY", "Core Authentication bootstrap is restricted to Staging."
    );
  }
  if (!config.spreadsheetId || !config.stagingSpreadsheetId ||
      config.spreadsheetId !== config.stagingSpreadsheetId) {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_STAGING_PIN_MISMATCH", "Expected and Staging Spreadsheet pins must match."
    );
  }
  var strict = assertStagingEnvironment();
  var effectiveEmail = "";
  var activeEmail = "";
  var ownerEmail = "";
  try {
    effectiveEmail = String(Session.getEffectiveUser().getEmail() || "").trim().toLowerCase();
    activeEmail = String(Session.getActiveUser().getEmail() || "").trim().toLowerCase();
    var file = DriveApp.getFileById(strict.spreadsheet.getId());
    var owner = file && file.getOwner ? file.getOwner() : null;
    ownerEmail = String(owner && owner.getEmail ? owner.getEmail() : "").trim().toLowerCase();
  } catch (_error) {
    effectiveEmail = "";
    activeEmail = "";
    ownerEmail = "";
  }
  if (!effectiveEmail || !activeEmail || !ownerEmail ||
      effectiveEmail !== activeEmail || activeEmail !== ownerEmail) {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_OWNER_REQUIRED",
      "Only the verified interactive Staging Spreadsheet owner can control Core Authentication bootstrap."
    );
  }
  if (!strict || !strict.spreadsheet ||
      strict.spreadsheet.getId() !== config.spreadsheetId ||
      strict.spreadsheet.getId() !== config.stagingSpreadsheetId) {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_STAGING_IDENTITY_MISMATCH", "Strict Staging identity validation failed."
    );
  }
  return {
    config: strict.config,
    spreadsheet: strict.spreadsheet,
    actorIdentity: effectiveEmail
  };
}

function coreStagingBootstrapHashText(value) {
  return staffSchemaMigrationHash(String(value == null ? "" : value));
}

function coreStagingBootstrapCredentialFingerprint(passwordHash) {
  return coreStagingBootstrapHashText("CORE_AUTH_CREDENTIAL:" + String(passwordHash || ""));
}

function coreStagingBootstrapValidPasswordHash(value) {
  return /^[a-f0-9]{64}$/.test(String(value || ""));
}

function coreStagingBootstrapHeaders(sheet) {
  var lastColumn = Math.max(0, Number(sheet.getLastColumn()) || 0);
  if (!lastColumn) return [];
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function (value) {
    return String(value == null ? "" : value);
  });
}

function coreStagingBootstrapHeadersExact(headers) {
  if (!Array.isArray(headers) || headers.length < CORE_STAGING_BOOTSTRAP_USERS_HEADERS.length) {
    return false;
  }
  return CORE_STAGING_BOOTSTRAP_USERS_HEADERS.every(function (header, index) {
    return headers[index] === header;
  });
}

function coreStagingBootstrapRowFingerprint(row) {
  return staffSchemaMigrationHash((row || []).slice(0, 6));
}

function coreStagingBootstrapReadUsersState(spreadsheet) {
  var sheet = spreadsheet.getSheetByName("USERS");
  if (!sheet) {
    return {
      exists: false,
      headersExact: false,
      headers: [],
      unknownTrailingColumns: [],
      rows: [],
      ownerRows: [],
      errors: []
    };
  }
  var headers = coreStagingBootstrapHeaders(sheet);
  var errors = [];
  if (typeof sheet.getRange(1, 1, 1, Math.max(1, headers.length)).getFormulas === "function") {
    var headerFormulas = sheet.getRange(1, 1, 1, Math.max(1, headers.length)).getFormulas()[0];
    if (headerFormulas.some(function (formula) { return String(formula || "") !== ""; })) {
      errors.push({ code: "CORE_USERS_HEADER_FORMULA_UNSAFE" });
    }
  }
  if (!coreStagingBootstrapHeadersExact(headers)) {
    errors.push({
      code: "CORE_USERS_HEADERS_INCOMPATIBLE",
      message: "USERS columns 1-6 must match the approved exact positional header order."
    });
  }
  var lastRow = Math.max(0, Number(sheet.getLastRow()) || 0);
  var rows = lastRow < 2 ? [] : sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  var formulas = lastRow < 2 || typeof sheet.getRange(2, 1, lastRow - 1, 6).getFormulas !== "function"
    ? [] : sheet.getRange(2, 1, lastRow - 1, 6).getFormulas();
  var usernames = {};
  rows.forEach(function (row, index) {
    var username = String(row[0] || "").trim();
    var normalized = username.toLowerCase();
    var password = String(row[1] || "");
    var displayName = String(row[2] || "").trim();
    var createdAt = row[4];
    var passwordHash = String(row[5] || "").trim();
    if (formulas[index] && formulas[index].some(function (formula) {
      return String(formula || "") !== "";
    })) {
      errors.push({ code: "CORE_USERS_FORMULA_UNSAFE", rowNumber: index + 2 });
    }
    if (!username) {
      errors.push({ code: "CORE_USERS_USERNAME_MISSING", rowNumber: index + 2 });
      return;
    }
    if (usernames[normalized]) {
      errors.push({ code: "CORE_USERS_USERNAME_DUPLICATE", rowNumber: index + 2 });
    }
    usernames[normalized] = true;
    if (password) errors.push({ code: "CORE_USERS_PLAINTEXT_PRESENT", rowNumber: index + 2 });
    if (!displayName) errors.push({ code: "CORE_USERS_DISPLAY_NAME_MISSING", rowNumber: index + 2 });
    if (!createdAt || !Number.isFinite(Date.parse(String(createdAt)))) {
      errors.push({ code: "CORE_USERS_CREATED_AT_INVALID", rowNumber: index + 2 });
    }
    if (!coreStagingBootstrapValidPasswordHash(passwordHash)) {
      errors.push({ code: "CORE_USERS_PASSWORD_HASH_INVALID", rowNumber: index + 2 });
    }
  });
  var ownerRows = rows.map(function (row, index) {
    return { row: row, rowNumber: index + 2 };
  }).filter(function (item) {
    return String(item.row[0] || "").trim().toLowerCase() === "owner";
  });
  if (ownerRows.length > 1) {
    errors.push({ code: "CORE_USERS_OWNER_DUPLICATE", count: ownerRows.length });
  }
  if (ownerRows.length === 1 && String(ownerRows[0].row[0] || "").trim() !== "owner") {
    errors.push({ code: "CORE_USERS_OWNER_USERNAME_NOT_CANONICAL", rowNumber: ownerRows[0].rowNumber });
  }
  return {
    exists: true,
    headersExact: coreStagingBootstrapHeadersExact(headers),
    headers: headers.slice(0, 6),
    unknownTrailingColumns: headers.slice(6),
    rows: rows,
    ownerRows: ownerRows,
    errors: errors
  };
}

function coreStagingBootstrapPlanHash(plan) {
  return staffSchemaMigrationHash({
    schemaVersion: plan.schemaVersion,
    dryRun: plan.dryRun,
    writes: plan.writes,
    identity: plan.identity,
    approvedUsersHeaders: plan.approvedUsersHeaders,
    mandatoryCoreSheets: plan.mandatoryCoreSheets,
    createSheets: plan.createSheets,
    createOwnerRecord: plan.createOwnerRecord,
    ownerUsername: plan.ownerUsername,
    ownerDisplayName: plan.ownerDisplayName,
    credentialFingerprint: plan.credentialFingerprint,
    preservedUnknownColumns: plan.preservedUnknownColumns,
    errors: plan.errors,
    blockers: plan.blockers,
    safeToInitialize: plan.safeToInitialize,
    completed: plan.completed
  });
}

function coreStagingBootstrapOptionalDashboardState(spreadsheet) {
  return CORE_STAGING_BOOTSTRAP_OPTIONAL_DASHBOARD_SHEETS.map(function (item) {
    return {
      sheetName: item.sheetName,
      exists: !!spreadsheet.getSheetByName(item.sheetName),
      mandatoryForPageOpen: false,
      absenceBehavior: item.absenceBehavior
    };
  });
}

function previewCoreStagingBootstrap(data) {
  data = data && typeof data === "object" ? data : {};
  var identity = coreStagingBootstrapIdentityAndOwner();
  if (!data.ownerDisplayName && !data.credentialFingerprint) {
    var stagedCredential = coreStagingBootstrapCredentialRecord();
    if (stagedCredential) {
      try {
        stagedCredential = coreStagingBootstrapValidateCredential(stagedCredential, identity);
        data = {
          ownerDisplayName: stagedCredential.ownerDisplayName,
          credentialFingerprint: stagedCredential.credentialFingerprint
        };
      } catch (_credentialError) {
        // Invalid or expired staged credentials remain a compact preview blocker and are never consumed here.
      }
    }
  }
  var users = coreStagingBootstrapReadUsersState(identity.spreadsheet);
  var ownerDisplayName = String(data.ownerDisplayName || "").trim();
  var credentialFingerprint = String(data.credentialFingerprint || "").trim();
  var errors = users.errors.slice();
  var blockers = [];
  var createSheets = [];
  var createOwnerRecord = false;
  var ownerRows = users.ownerRows;
  var missingMandatoryCoreSheets = users.exists ? [] : ["USERS"];
  var missingRequiredUsersColumns = users.exists && users.headersExact ? [] :
    CORE_STAGING_BOOTSTRAP_USERS_HEADERS.map(function (header, index) {
      return { column: index + 1, header: header };
    });
  var incompatibleCoreSheets = users.exists && !users.headersExact ? ["USERS"] : [];

  if (!users.exists) {
    createSheets.push({ sheetName: "USERS", headers: CORE_STAGING_BOOTSTRAP_USERS_HEADERS.slice() });
    createOwnerRecord = true;
  } else if (users.headersExact && ownerRows.length === 0) {
    if (users.rows.length) {
      errors.push({
        code: "CORE_USERS_EXISTING_DATA_WITHOUT_OWNER",
        message: "Existing USERS data without an owner cannot be proven safe for automatic bootstrap."
      });
    } else {
      createOwnerRecord = true;
    }
  }

  if (createOwnerRecord) {
    if (!ownerDisplayName) blockers.push({ code: "CORE_OWNER_DISPLAY_NAME_REQUIRED" });
    if (!/^sha256:[a-f0-9]{64}$/.test(credentialFingerprint)) {
      blockers.push({ code: "CORE_OWNER_CREDENTIAL_REQUIRED" });
    }
  }

  var ownerRecordState = "MISSING";
  if (ownerRows.length === 1) {
    var owner = ownerRows[0].row;
    var hasPlaintext = String(owner[1] || "") !== "";
    var validHash = coreStagingBootstrapValidPasswordHash(String(owner[5] || "").trim());
    ownerRecordState = validHash && !hasPlaintext ? "HASHED_ONLY" :
      (validHash ? "HASHED_WITH_PLAINTEXT_RETAINED" : (hasPlaintext ? "PLAINTEXT_LEGACY" : "MISSING"));
  } else if (ownerRows.length > 1) {
    ownerRecordState = "DUPLICATE";
  }

  var completed = users.exists && users.headersExact && errors.length === 0 &&
    ownerRows.length === 1 && ownerRecordState === "HASHED_ONLY";
  var plan = {
    schemaVersion: CORE_STAGING_BOOTSTRAP_SCHEMA_VERSION,
    dryRun: true,
    writes: 0,
    identity: {
      environment: identity.config.environment,
      expectedSpreadsheetId: identity.config.spreadsheetId,
      stagingSpreadsheetId: identity.config.stagingSpreadsheetId,
      actualSpreadsheetId: identity.spreadsheet.getId(),
      actorIdentity: identity.actorIdentity
    },
    approvedUsersHeaders: CORE_STAGING_BOOTSTRAP_USERS_HEADERS.slice(),
    mandatoryCoreSheets: ["USERS"],
    optionalDashboardDependencies: coreStagingBootstrapOptionalDashboardState(identity.spreadsheet),
    createSheets: createSheets,
    createOwnerRecord: createOwnerRecord,
    ownerUsername: "owner",
    ownerDisplayName: createOwnerRecord ? ownerDisplayName :
      (ownerRows.length === 1 ? String(ownerRows[0].row[2] || "").trim() : ""),
    credentialFingerprint: createOwnerRecord ? credentialFingerprint :
      (ownerRows.length === 1 && coreStagingBootstrapValidPasswordHash(ownerRows[0].row[5])
        ? coreStagingBootstrapCredentialFingerprint(String(ownerRows[0].row[5]).trim()) : ""),
    missingMandatoryCoreSheets: missingMandatoryCoreSheets,
    missingRequiredUsersColumns: missingRequiredUsersColumns,
    incompatibleCoreSheets: incompatibleCoreSheets,
    preservedUnknownColumns: users.headersExact ? users.unknownTrailingColumns.slice() : [],
    ownerRecordCount: ownerRows.length,
    ownerPasswordState: ownerRecordState,
    plaintextPasswordCellEmpty: ownerRows.length === 1 ? String(ownerRows[0].row[1] || "") === "" : null,
    errors: errors,
    blockers: blockers,
    safeToInitialize: errors.length === 0 && blockers.length === 0,
    completed: completed
  };
  plan.exactPlanHash = coreStagingBootstrapPlanHash(plan);
  return plan;
}

function previewStagingAuthenticationInitialization() {
  var plan = previewCoreStagingBootstrap({});
  return {
    schemaVersion: plan.schemaVersion,
    dryRun: plan.dryRun,
    writes: plan.writes,
    identity: plan.identity,
    canonicalAuthenticationSheet: "USERS",
    approvedUsersHeaders: plan.approvedUsersHeaders,
    missingCoreSheets: plan.missingMandatoryCoreSheets,
    missingColumns: plan.missingRequiredUsersColumns,
    existingCompatibleSheets: plan.incompatibleCoreSheets.length || plan.missingMandatoryCoreSheets.length
      ? [] : ["USERS"],
    incompatibleSheets: plan.incompatibleCoreSheets,
    optionalDashboardDependencies: plan.optionalDashboardDependencies,
    ownerRecordCount: plan.ownerRecordCount,
    passwordStorage: {
      hashAlgorithm: "SHA-256",
      salted: false,
      plaintextFallbackAcceptedByLogin: true,
      ownerPasswordState: plan.ownerPasswordState,
      plaintextPasswordCellEmpty: plan.plaintextPasswordCellEmpty
    },
    safeToInitialize: plan.safeToInitialize,
    completed: plan.completed,
    blockers: plan.blockers,
    errors: plan.errors
  };
}

function diagnosticPreviewStagingAuthenticationInitialization() {
  coreStagingBootstrapIdentityAndOwner();
  var result = previewStagingAuthenticationInitialization();
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function diagnosticPreviewCoreStagingBootstrap() {
  coreStagingBootstrapIdentityAndOwner();
  var result = previewCoreStagingBootstrap();
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function coreStagingBootstrapCredentialRecord() {
  return staffSchemaMigrationReadJson(
    PropertiesService.getUserProperties(), CORE_STAGING_BOOTSTRAP_CREDENTIAL_KEY
  );
}

function coreStagingBootstrapValidateCredential(record, identity) {
  if (!record || !coreStagingBootstrapValidPasswordHash(record.passwordHash)) {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_CREDENTIAL_REQUIRED", "Use the secure credential dialog before preparation."
    );
  }
  if (Date.parse(record.expiresAt || "") <= Date.now()) {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_CREDENTIAL_EXPIRED", "The staged owner credential has expired."
    );
  }
  if (record.spreadsheetId !== identity.spreadsheet.getId() ||
      record.actorIdentity !== identity.actorIdentity ||
      record.ownerUsername !== "owner" || !String(record.ownerDisplayName || "").trim() ||
      !String(record.requestId || "").trim()) {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_CREDENTIAL_MISMATCH", "The staged owner credential binding is invalid."
    );
  }
  if (record.credentialFingerprint !== coreStagingBootstrapCredentialFingerprint(record.passwordHash)) {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_CREDENTIAL_MISMATCH", "The staged owner credential fingerprint is invalid."
    );
  }
  return record;
}

function stageCoreStagingBootstrapCredential(data) {
  if (!data || typeof data !== "object") {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_CREDENTIAL_INPUT_REQUIRED", "Secure credential input is required."
    );
  }
  var identity = coreStagingBootstrapIdentityAndOwner();
  var password = data.password == null ? "" : String(data.password);
  var confirmation = data.passwordConfirmation == null ? "" : String(data.passwordConfirmation);
  var displayName = String(data.ownerDisplayName || "").trim();
  var requestId = String(data.requestId || Utilities.getUuid() || "").trim();
  if (password !== confirmation) {
    throw coreStagingBootstrapError(
      "PASSWORD_CONFIRMATION_MISMATCH", "Password confirmation does not match."
    );
  }
  if (Array.from(password).length < CORE_STAGING_BOOTSTRAP_PASSWORD_MIN_LENGTH) {
    throw coreStagingBootstrapError(
      "PASSWORD_TOO_SHORT",
      "Password must be at least " + CORE_STAGING_BOOTSTRAP_PASSWORD_MIN_LENGTH + " characters."
    );
  }
  if (!displayName || displayName.length > 160 || !requestId || requestId.length > 160) {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_CREDENTIAL_CONTEXT_INVALID", "Owner display name and requestId are required."
    );
  }
  var passwordHash = hashPassword(password);
  data.password = "";
  data.passwordConfirmation = "";
  password = "";
  confirmation = "";
  return staffSchemaMigrationTryLocks(function () {
    var now = Date.now();
    var record = {
      requestId: requestId,
      ownerUsername: "owner",
      ownerDisplayName: displayName,
      passwordHash: passwordHash,
      credentialFingerprint: coreStagingBootstrapCredentialFingerprint(passwordHash),
      spreadsheetId: identity.spreadsheet.getId(),
      actorIdentity: identity.actorIdentity,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + CORE_STAGING_BOOTSTRAP_CREDENTIAL_TTL_MS).toISOString()
    };
    var userProperties = PropertiesService.getUserProperties();
    userProperties.setProperty(CORE_STAGING_BOOTSTRAP_CREDENTIAL_KEY, JSON.stringify(record));
    userProperties.deleteProperty(CORE_STAGING_BOOTSTRAP_TOKEN_KEY);
    passwordHash = "";
    return {
      status: "CREDENTIAL_STAGED",
      requestId: requestId,
      ownerUsername: "owner",
      ownerDisplayName: displayName,
      expiresAt: record.expiresAt
    };
  });
}

function openCoreStagingBootstrapCredentialDialog() {
  coreStagingBootstrapIdentityAndOwner();
  var html = '<!doctype html><html><head><base target="_top"><style>' +
    'body{font:14px Arial,sans-serif;padding:18px;direction:rtl}label{display:block;margin:10px 0 4px}' +
    'input{box-sizing:border-box;width:100%;padding:8px}button{margin-top:16px;padding:9px 16px}' +
    '.hint{display:block;margin-top:4px;color:#555}#status{margin-top:12px;white-space:pre-wrap}</style></head><body>' +
    '<h3>تهيئة مالك Staging</h3><label>اسم العرض</label><input id="display" autocomplete="name">' +
    '<label>Request ID</label><input id="request" autocomplete="off">' +
    '<label for="password">كلمة المرور</label><input id="password" name="password" type="password" ' +
    'autocomplete="new-password" minlength="12" aria-describedby="password-requirements">' +
    '<span id="password-requirements" class="hint">الحد الأدنى: 12 حرفًا. تُحفظ المسافات كما أُدخلت.</span>' +
    '<label for="passwordConfirmation">تأكيد كلمة المرور</label>' +
    '<input id="passwordConfirmation" name="passwordConfirmation" type="password" ' +
    'autocomplete="new-password" minlength="12">' +
    '<button id="submit" type="button">تجهيز الاعتماد المؤقت</button><div id="status"></div><script>' +
    'document.getElementById("submit").onclick=function(){var b=this;b.disabled=true;' +
    'var p=document.getElementById("password"),c=document.getElementById("passwordConfirmation"),' +
    's=document.getElementById("status");' +
    'if(p.value!==c.value){s.textContent="PASSWORD_CONFIRMATION_MISMATCH: تأكيد كلمة المرور غير مطابق.";' +
    'b.disabled=false;return;}if(Array.from(p.value).length<12){' +
    's.textContent="PASSWORD_TOO_SHORT: يجب ألا تقل كلمة المرور عن 12 حرفًا.";b.disabled=false;return;}' +
    'var payload={ownerDisplayName:document.getElementById("display").value,' +
    'requestId:document.getElementById("request").value,password:p.value,passwordConfirmation:c.value};' +
    'google.script.run.withSuccessHandler(function(r){p.value="";c.value="";' +
    's.textContent="تم تجهيز الاعتماد. Request ID: "+r.requestId;' +
    'b.disabled=false;}).withFailureHandler(function(e){p.value="";c.value="";' +
    's.textContent=e.message||"فشل التجهيز";b.disabled=false;})' +
    '.stageCoreStagingBootstrapCredential(payload);};' +
    '</script></body></html>';
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(460).setHeight(520),
    "Core Authentication Bootstrap"
  );
  return { status: "CREDENTIAL_DIALOG_OPENED" };
}

function coreStagingBootstrapJournalKey(requestId, spreadsheetId, actorIdentity) {
  return CORE_STAGING_BOOTSTRAP_JOURNAL_PREFIX +
    coreStagingBootstrapHashText(spreadsheetId).slice(7) + "_" +
    coreStagingBootstrapHashText(actorIdentity).slice(7) + "_" +
    coreStagingBootstrapHashText(requestId).slice(7);
}

function coreStagingBootstrapRequestFingerprint(requestId, planHash, identity, credential) {
  return staffSchemaMigrationHash({
    bootstrapId: CORE_STAGING_BOOTSTRAP_ID,
    requestId: requestId,
    planHash: planHash,
    spreadsheetId: identity.spreadsheet.getId(),
    actorIdentity: identity.actorIdentity,
    ownerUsername: credential.ownerUsername,
    ownerDisplayName: credential.ownerDisplayName,
    credentialFingerprint: credential.credentialFingerprint
  });
}

function coreStagingBootstrapAssertPlan(plan) {
  if (!plan || plan.dryRun !== true || Number(plan.writes) !== 0 ||
      plan.safeToInitialize !== true || (plan.errors || []).length || (plan.blockers || []).length) {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_PREVIEW_NOT_SAFE", "Core Authentication preview is not safe to execute."
    );
  }
  return plan;
}

function coreStagingBootstrapPrepareSummary(plan, record, alreadyCommitted) {
  return {
    status: "PREPARED",
    requestId: record.requestId,
    ownerUsername: record.ownerUsername,
    ownerDisplayName: record.ownerDisplayName,
    expiresAt: record.expiresAt,
    exactPlanHash: record.exactPlanHash,
    spreadsheetId: record.spreadsheetId,
    createSheetNames: (plan.createSheets || []).map(function (item) { return item.sheetName; }),
    createOwnerRecord: plan.createOwnerRecord === true,
    alreadyCommitted: alreadyCommitted === true
  };
}

function prepareCoreStagingBootstrap(data) {
  data = data && typeof data === "object" ? data : {};
  var identity = coreStagingBootstrapIdentityAndOwner();
  return staffSchemaMigrationTryLocks(function () {
    var credential = coreStagingBootstrapValidateCredential(
      coreStagingBootstrapCredentialRecord(), identity
    );
    if (data.requestId && String(data.requestId).trim() !== credential.requestId) {
      throw coreStagingBootstrapError(
        "CORE_BOOTSTRAP_REQUEST_ID_MISMATCH", "requestId does not match the staged credential."
      );
    }
    var plan = coreStagingBootstrapAssertPlan(previewCoreStagingBootstrap({
      ownerDisplayName: credential.ownerDisplayName,
      credentialFingerprint: credential.credentialFingerprint
    }));
    var journalKey = coreStagingBootstrapJournalKey(
      credential.requestId, identity.spreadsheet.getId(), identity.actorIdentity
    );
    var scriptProperties = PropertiesService.getScriptProperties();
    var existing = staffSchemaMigrationReadJson(scriptProperties, journalKey);
    if (existing && existing.credentialFingerprint !== credential.credentialFingerprint) {
      throw coreStagingBootstrapError(
        "CORE_BOOTSTRAP_REQUEST_ID_REUSED", "requestId is already bound to different bootstrap context."
      );
    }
    if (!existing && plan.completed && plan.credentialFingerprint !== credential.credentialFingerprint) {
      throw coreStagingBootstrapError(
        "CORE_BOOTSTRAP_EXISTING_OWNER_CREDENTIAL_MISMATCH",
        "The staged credential does not match the existing hash-only owner record."
      );
    }
    if (existing && ["APPLYING", "RECOVERY_REQUIRED"].indexOf(existing.status) !== -1) {
      throw coreStagingBootstrapError(
        "CORE_BOOTSTRAP_REQUEST_NOT_PREPARABLE", "The request requires recovery before reuse."
      );
    }
    var planHash = existing && existing.status === "COMMITTED" ? existing.exactPlanHash : plan.exactPlanHash;
    var fingerprint = coreStagingBootstrapRequestFingerprint(
      credential.requestId, planHash, identity, credential
    );
    if (existing && existing.requestFingerprint !== fingerprint) {
      throw coreStagingBootstrapError(
        "CORE_BOOTSTRAP_REQUEST_ID_REUSED", "requestId is already bound to different bootstrap context."
      );
    }
    var token = Utilities.getUuid() + "-" + Utilities.getUuid();
    var expiresAt = new Date(Date.now() + CORE_STAGING_BOOTSTRAP_TOKEN_TTL_MS).toISOString();
    var tokenRecord = {
      token: token,
      tokenHash: coreStagingBootstrapHashText(token),
      bootstrapId: CORE_STAGING_BOOTSTRAP_ID,
      requestId: credential.requestId,
      requestFingerprint: fingerprint,
      exactPlanHash: planHash,
      spreadsheetId: identity.spreadsheet.getId(),
      actorIdentity: identity.actorIdentity,
      ownerUsername: credential.ownerUsername,
      ownerDisplayName: credential.ownerDisplayName,
      credentialFingerprint: credential.credentialFingerprint,
      expiresAt: expiresAt
    };
    var journal = existing && existing.status === "COMMITTED" ? existing : {
      bootstrapId: CORE_STAGING_BOOTSTRAP_ID,
      schemaVersion: CORE_STAGING_BOOTSTRAP_SCHEMA_VERSION,
      requestId: credential.requestId,
      actorIdentity: identity.actorIdentity,
      expectedSpreadsheetId: identity.spreadsheet.getId(),
      ownerUsername: credential.ownerUsername,
      ownerDisplayName: credential.ownerDisplayName,
      credentialFingerprint: credential.credentialFingerprint,
      startedTimestamp: staffSchemaMigrationNow(),
      completedTimestamp: "",
      status: "PREPARED",
      exactPlanHash: plan.exactPlanHash,
      requestFingerprint: fingerprint,
      operationIntents: [],
      completedOperations: [],
      createdSheetNames: [],
      ownerRowsCreated: [],
      inFlightOperation: null,
      errorDetails: [],
      writes: 0,
      finalResult: null
    };
    if (journal.status !== "COMMITTED") staffSchemaMigrationWriteJournal(journalKey, journal);
    PropertiesService.getUserProperties().setProperty(
      CORE_STAGING_BOOTSTRAP_TOKEN_KEY, JSON.stringify(tokenRecord)
    );
    token = "";
    var summary = coreStagingBootstrapPrepareSummary(
      plan, tokenRecord, journal.status === "COMMITTED"
    );
    console.log(JSON.stringify({
      status: summary.status,
      requestId: summary.requestId,
      ownerUsername: summary.ownerUsername,
      ownerDisplayName: summary.ownerDisplayName,
      expiresAt: summary.expiresAt,
      exactPlanHash: summary.exactPlanHash,
      spreadsheetId: summary.spreadsheetId,
      createSheetNames: summary.createSheetNames,
      createOwnerRecord: summary.createOwnerRecord,
      alreadyCommitted: summary.alreadyCommitted
    }));
    return summary;
  });
}

function coreStagingBootstrapReadPreparedToken(suppliedToken) {
  var store = PropertiesService.getUserProperties();
  var record = staffSchemaMigrationReadJson(store, CORE_STAGING_BOOTSTRAP_TOKEN_KEY);
  if (!record || !suppliedToken || record.tokenHash !== coreStagingBootstrapHashText(suppliedToken)) {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_TOKEN_INVALID", "Confirmation token is invalid or already consumed."
    );
  }
  if (Date.parse(record.expiresAt || "") <= Date.now()) {
    throw coreStagingBootstrapError("CORE_BOOTSTRAP_TOKEN_EXPIRED", "Confirmation token has expired.");
  }
  return { store: store, record: record };
}

function coreStagingBootstrapOperationProof(operation) {
  return {
    type: operation.type,
    sheetName: "USERS",
    headerHash: staffSchemaMigrationHash(CORE_STAGING_BOOTSTRAP_USERS_HEADERS),
    headerCount: CORE_STAGING_BOOTSTRAP_USERS_HEADERS.length,
    rowNumber: operation.rowNumber || 0,
    rowFingerprint: operation.rowFingerprint || ""
  };
}

function coreStagingBootstrapOperations(plan, credential) {
  var operations = [];
  if ((plan.createSheets || []).some(function (item) { return item.sheetName === "USERS"; })) {
    operations.push({ type: "CREATE_USERS_SHEET" });
  }
  if (plan.createOwnerRecord) {
    var row = [
      "owner", "", credential.ownerDisplayName, "", staffSchemaMigrationNow(), credential.passwordHash
    ];
    operations.push({
      type: "CREATE_OWNER_ROW",
      rowNumber: 2,
      row: row,
      rowFingerprint: coreStagingBootstrapRowFingerprint(row)
    });
  }
  return operations;
}

function coreStagingBootstrapTestPoint(name, details) {
  if (typeof coreStagingBootstrapFailureInjector === "function") {
    coreStagingBootstrapFailureInjector(name, details || {});
  }
}

function coreStagingBootstrapApplyOperation(spreadsheet, operation) {
  if (operation.type === "CREATE_USERS_SHEET") {
    if (spreadsheet.getSheetByName("USERS")) {
      throw coreStagingBootstrapError("CORE_BOOTSTRAP_STATE_CHANGED", "USERS now exists.");
    }
    var created = spreadsheet.insertSheet("USERS");
    var maximum = Math.max(1, Number(created.getMaxColumns ? created.getMaxColumns() : 1) || 1);
    if (maximum < CORE_STAGING_BOOTSTRAP_USERS_HEADERS.length) {
      created.insertColumnsAfter(maximum, CORE_STAGING_BOOTSTRAP_USERS_HEADERS.length - maximum);
    }
    created.getRange(1, 1, 1, CORE_STAGING_BOOTSTRAP_USERS_HEADERS.length)
      .setValues([CORE_STAGING_BOOTSTRAP_USERS_HEADERS.slice()]);
    coreStagingBootstrapTestPoint("AFTER_USERS_SHEET_WRITE_BEFORE_PROGRESS", operation);
    return;
  }
  if (operation.type === "CREATE_OWNER_ROW") {
    var sheet = spreadsheet.getSheetByName("USERS");
    if (!sheet || !coreStagingBootstrapHeadersExact(coreStagingBootstrapHeaders(sheet)) ||
        sheet.getLastRow() >= 2) {
      throw coreStagingBootstrapError(
        "CORE_BOOTSTRAP_STATE_CHANGED", "USERS is no longer a compatible header-only sheet."
      );
    }
    sheet.getRange(operation.rowNumber, 1, 1, 6).setValues([operation.row]);
    coreStagingBootstrapTestPoint("AFTER_OWNER_ROW_WRITE_BEFORE_PROGRESS", operation);
  }
}

function coreStagingBootstrapSheetHeaderProof(sheet) {
  return staffSchemaMigrationHash(coreStagingBootstrapHeaders(sheet).slice(0, 6));
}

function coreStagingBootstrapRollback(spreadsheet, journal) {
  var failures = [];
  var intendedOwner = (journal.operationIntents || []).filter(function (item) {
    return item.type === "CREATE_OWNER_ROW";
  }).slice(-1)[0];
  var intendedSheet = (journal.operationIntents || []).some(function (item) {
    return item.type === "CREATE_USERS_SHEET";
  });
  try {
    var sheet = spreadsheet.getSheetByName("USERS");
    if (!sheet) return failures;
    var headerProof = staffSchemaMigrationHash(CORE_STAGING_BOOTSTRAP_USERS_HEADERS);
    var lastRow = Math.max(0, Number(sheet.getLastRow()) || 0);
    if (intendedSheet) {
      if (lastRow === 0) {
        spreadsheet.deleteSheet(sheet);
        return failures;
      }
      var usedHeaders = coreStagingBootstrapHeaders(sheet);
      var headerFormulas = typeof sheet.getRange(1, 1, 1, Math.max(1, usedHeaders.length)).getFormulas === "function"
        ? sheet.getRange(1, 1, 1, Math.max(1, usedHeaders.length)).getFormulas()[0] : [];
      var requestOnlyHeaders = usedHeaders.length <= CORE_STAGING_BOOTSTRAP_USERS_HEADERS.length &&
        usedHeaders.every(function (value, index) {
          return value === "" || value === CORE_STAGING_BOOTSTRAP_USERS_HEADERS[index];
        }) && !headerFormulas.some(function (formula) { return String(formula || "") !== ""; });
      if (!requestOnlyHeaders) {
        throw new Error("Request-created USERS headers or formulas changed; automatic rollback is unsafe.");
      }
      if (lastRow > 2) throw new Error("Request-created USERS has unexpected rows.");
      if (lastRow === 2) {
        if (!intendedOwner) throw new Error("Owner row has no matching operation intent.");
        var createdRow = sheet.getRange(2, 1, 1, 6).getValues()[0];
        var createdFormulas = typeof sheet.getRange(2, 1, 1, 6).getFormulas === "function"
          ? sheet.getRange(2, 1, 1, 6).getFormulas()[0] : [];
        if (coreStagingBootstrapRowFingerprint(createdRow) !== intendedOwner.rowFingerprint) {
          throw new Error("Request-created owner row proof changed.");
        }
        if (createdFormulas.some(function (formula) { return String(formula || "") !== ""; })) {
          throw new Error("Request-created owner row contains a formula.");
        }
      }
      spreadsheet.deleteSheet(sheet);
      return failures;
    }
    if (coreStagingBootstrapSheetHeaderProof(sheet) !== headerProof) {
      throw new Error("USERS header proof changed; automatic rollback is unsafe.");
    }
    if (intendedOwner) {
      if (lastRow !== intendedOwner.rowNumber) {
        throw new Error("Owner row is not the exact trailing request-created row.");
      }
      var row = sheet.getRange(intendedOwner.rowNumber, 1, 1, 6).getValues()[0];
      var rowFormulas = typeof sheet.getRange(intendedOwner.rowNumber, 1, 1, 6).getFormulas === "function"
        ? sheet.getRange(intendedOwner.rowNumber, 1, 1, 6).getFormulas()[0] : [];
      if (coreStagingBootstrapRowFingerprint(row) !== intendedOwner.rowFingerprint) {
        throw new Error("Request-created owner row proof changed.");
      }
      if (rowFormulas.some(function (formula) { return String(formula || "") !== ""; })) {
        throw new Error("Request-created owner row contains a formula.");
      }
      sheet.deleteRow(intendedOwner.rowNumber);
    }
  } catch (error) {
    failures.push({
      operation: "CORE_AUTH_ROLLBACK",
      sheetName: "USERS",
      message: String(error.message || error).slice(0, 500)
    });
  }
  return failures;
}

function coreStagingBootstrapVerifyCompleted(identity, journal) {
  var verification = previewCoreStagingBootstrap({});
  if (verification.safeToInitialize !== true || verification.completed !== true ||
      verification.dryRun !== true || Number(verification.writes) !== 0 ||
      verification.missingMandatoryCoreSheets.length ||
      verification.missingRequiredUsersColumns.length ||
      verification.incompatibleCoreSheets.length ||
      verification.ownerRecordCount !== 1 || verification.ownerPasswordState !== "HASHED_ONLY" ||
      verification.plaintextPasswordCellEmpty !== true ||
      verification.errors.length || verification.blockers.length ||
      verification.identity.actualSpreadsheetId !== identity.spreadsheet.getId()) {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_FINAL_VERIFICATION_FAILED", "Final Core Authentication verification failed."
    );
  }
  var users = coreStagingBootstrapReadUsersState(identity.spreadsheet);
  var currentFingerprint = coreStagingBootstrapCredentialFingerprint(
    String(users.ownerRows[0].row[5] || "").trim()
  );
  if (currentFingerprint !== journal.credentialFingerprint) {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_FINAL_CREDENTIAL_MISMATCH", "Final owner credential does not match preparation."
    );
  }
  return verification;
}

function coreStagingBootstrapConsumeSecrets(prepared, credentialStore) {
  prepared.store.deleteProperty(CORE_STAGING_BOOTSTRAP_TOKEN_KEY);
  credentialStore.deleteProperty(CORE_STAGING_BOOTSTRAP_CREDENTIAL_KEY);
}

function executeCoreStagingBootstrap(data) {
  if (!data || typeof data !== "object") {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_CONFIRMATION_REQUIRED", "No-argument Core Authentication execution is prohibited."
    );
  }
  var requestId = String(data.requestId || "").trim();
  var confirmationToken = String(data.confirmationToken || "").trim();
  if (!requestId || !confirmationToken) {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_CONFIRMATION_REQUIRED", "requestId and confirmationToken are required."
    );
  }
  var identity = coreStagingBootstrapIdentityAndOwner();
  return staffSchemaMigrationTryLocks(function () {
    var prepared = coreStagingBootstrapReadPreparedToken(confirmationToken);
    var token = prepared.record;
    var credentialStore = PropertiesService.getUserProperties();
    var credential = coreStagingBootstrapValidateCredential(
      coreStagingBootstrapCredentialRecord(), identity
    );
    if (token.bootstrapId !== CORE_STAGING_BOOTSTRAP_ID ||
        token.requestId !== requestId || credential.requestId !== requestId ||
        token.spreadsheetId !== identity.spreadsheet.getId() ||
        token.actorIdentity !== identity.actorIdentity ||
        token.ownerUsername !== credential.ownerUsername ||
        token.ownerDisplayName !== credential.ownerDisplayName ||
        token.credentialFingerprint !== credential.credentialFingerprint) {
      throw coreStagingBootstrapError(
        "CORE_BOOTSTRAP_TOKEN_MISMATCH", "Prepared token binding is invalid."
      );
    }
    var journalKey = coreStagingBootstrapJournalKey(
      requestId, identity.spreadsheet.getId(), identity.actorIdentity
    );
    var journal = staffSchemaMigrationReadJson(
      PropertiesService.getScriptProperties(), journalKey
    );
    if (!journal || journal.requestFingerprint !== token.requestFingerprint ||
        journal.exactPlanHash !== token.exactPlanHash ||
        journal.credentialFingerprint !== credential.credentialFingerprint) {
      throw coreStagingBootstrapError(
        "CORE_BOOTSTRAP_PREPARED_STATE_MISMATCH", "Prepared journal does not match token."
      );
    }
    if (journal.status === "COMMITTED") {
      coreStagingBootstrapVerifyCompleted(identity, journal);
      coreStagingBootstrapConsumeSecrets(prepared, credentialStore);
      return journal.finalResult;
    }
    if (journal.status !== "PREPARED") {
      throw coreStagingBootstrapError(
        "CORE_BOOTSTRAP_REQUEST_NOT_EXECUTABLE", "Bootstrap request is not PREPARED."
      );
    }
    var plan = coreStagingBootstrapAssertPlan(previewCoreStagingBootstrap({
      ownerDisplayName: credential.ownerDisplayName,
      credentialFingerprint: credential.credentialFingerprint
    }));
    var fingerprint = coreStagingBootstrapRequestFingerprint(
      requestId, plan.exactPlanHash, identity, credential
    );
    if (plan.exactPlanHash !== token.exactPlanHash || fingerprint !== token.requestFingerprint) {
      throw coreStagingBootstrapError(
        "CORE_BOOTSTRAP_PLAN_HASH_MISMATCH", "Core schema changed after preparation."
      );
    }
    coreStagingBootstrapConsumeSecrets(prepared, credentialStore);
    journal.status = "APPLYING";
    staffSchemaMigrationWriteJournal(journalKey, journal);
    try {
      var operations = coreStagingBootstrapOperations(plan, credential);
      operations.forEach(function (operation) {
        var proof = coreStagingBootstrapOperationProof(operation);
        journal.inFlightOperation = proof;
        journal.operationIntents.push(proof);
        staffSchemaMigrationWriteJournal(journalKey, journal);
        coreStagingBootstrapApplyOperation(identity.spreadsheet, operation);
        journal.completedOperations.push(proof);
        if (operation.type === "CREATE_USERS_SHEET") journal.createdSheetNames.push("USERS");
        if (operation.type === "CREATE_OWNER_ROW") {
          journal.ownerRowsCreated.push({
            sheetName: "USERS", rowNumber: operation.rowNumber,
            rowFingerprint: operation.rowFingerprint
          });
        }
        journal.writes += 1;
        journal.inFlightOperation = null;
        staffSchemaMigrationWriteJournal(journalKey, journal);
      });
      coreStagingBootstrapTestPoint("AFTER_ALL_WRITES_BEFORE_VERIFICATION", {});
      coreStagingBootstrapVerifyCompleted(identity, journal);
      coreStagingBootstrapTestPoint("AFTER_VERIFICATION_BEFORE_COMMITTED", {});
      var result = {
        status: "COMMITTED",
        bootstrapId: CORE_STAGING_BOOTSTRAP_ID,
        schemaVersion: CORE_STAGING_BOOTSTRAP_SCHEMA_VERSION,
        requestId: requestId,
        expectedSpreadsheetId: identity.spreadsheet.getId(),
        actorIdentity: identity.actorIdentity,
        ownerUsername: "owner",
        ownerDisplayName: journal.ownerDisplayName,
        createdSheetNames: journal.createdSheetNames.slice(),
        ownerRowsCreated: journal.ownerRowsCreated.map(function (item) {
          return { sheetName: item.sheetName, rowNumber: item.rowNumber };
        }),
        writes: journal.writes,
        completedTimestamp: staffSchemaMigrationNow()
      };
      journal.status = "COMMITTED";
      journal.completedTimestamp = result.completedTimestamp;
      journal.finalResult = result;
      staffSchemaMigrationWriteJournal(journalKey, journal);
      return result;
    } catch (caught) {
      journal.errorDetails.push(staffSchemaMigrationErrorDetail(caught));
      var rollbackFailures = coreStagingBootstrapRollback(identity.spreadsheet, journal);
      journal.inFlightOperation = null;
      if (rollbackFailures.length) {
        journal.status = "RECOVERY_REQUIRED";
        journal.errorDetails = journal.errorDetails.concat(rollbackFailures);
      } else {
        journal.status = "ROLLED_BACK";
        journal.completedTimestamp = staffSchemaMigrationNow();
      }
      staffSchemaMigrationWriteJournal(journalKey, journal);
      if (rollbackFailures.length) {
        throw coreStagingBootstrapError(
          "CORE_BOOTSTRAP_RECOVERY_REQUIRED",
          "Core Authentication rollback could not be proven safe.", rollbackFailures
        );
      }
      throw caught;
    }
  });
}

function executePreparedCoreStagingBootstrap() {
  var record = staffSchemaMigrationReadJson(
    PropertiesService.getUserProperties(), CORE_STAGING_BOOTSTRAP_TOKEN_KEY
  );
  if (!record) {
    throw coreStagingBootstrapError(
      "CORE_BOOTSTRAP_CONFIRMATION_REQUIRED", "Run prepareCoreStagingBootstrap immediately before execution."
    );
  }
  return executeCoreStagingBootstrap({
    requestId: record.requestId,
    confirmationToken: record.token
  });
}

function coreStagingBootstrapDiagnostic(statuses) {
  coreStagingBootstrapIdentityAndOwner();
  var properties = PropertiesService.getScriptProperties().getProperties();
  var records = Object.keys(properties).filter(function (key) {
    return key.indexOf(CORE_STAGING_BOOTSTRAP_JOURNAL_PREFIX) === 0;
  }).map(function (key) {
    try { return JSON.parse(properties[key]); } catch (_error) { return null; }
  }).filter(Boolean).filter(function (journal) {
    return !statuses || statuses.indexOf(journal.status) !== -1;
  }).map(function (journal) {
    var remediation = [];
    if (["APPLYING", "RECOVERY_REQUIRED"].indexOf(journal.status) !== -1) {
      remediation.push("Do not rerun bootstrap until USERS is compared with the operation proofs.");
      if ((journal.operationIntents || []).some(function (item) {
        return item.type === "CREATE_USERS_SHEET";
      })) {
        remediation.push(
          "Delete USERS only if it was created by this request, columns 1-6 exactly match the approved headers, " +
          "and it contains no row except a provably matching request-created owner row."
        );
      } else if ((journal.operationIntents || []).some(function (item) {
        return item.type === "CREATE_OWNER_ROW";
      })) {
        remediation.push(
          "Delete only the exact trailing owner row if its stored row fingerprint still matches and no later row exists."
        );
      }
    }
    return {
      bootstrapId: journal.bootstrapId,
      schemaVersion: journal.schemaVersion,
      requestId: journal.requestId,
      actorIdentity: journal.actorIdentity,
      expectedSpreadsheetId: journal.expectedSpreadsheetId,
      ownerUsername: journal.ownerUsername,
      ownerDisplayName: journal.ownerDisplayName,
      startedTimestamp: journal.startedTimestamp,
      completedTimestamp: journal.completedTimestamp,
      status: journal.status,
      exactPlanHash: journal.exactPlanHash,
      createdSheetNames: journal.createdSheetNames || [],
      ownerRowsCreated: (journal.ownerRowsCreated || []).map(function (item) {
        return { sheetName: item.sheetName, rowNumber: item.rowNumber };
      }),
      inFlightOperation: journal.inFlightOperation ? {
        type: journal.inFlightOperation.type,
        sheetName: journal.inFlightOperation.sheetName,
        rowNumber: journal.inFlightOperation.rowNumber || 0
      } : null,
      errorDetails: journal.errorDetails || [],
      writes: journal.writes || 0,
      manualRemediation: remediation
    };
  });
  console.log(JSON.stringify(records));
  return records;
}

function diagnosticCoreStagingBootstrapStatus() {
  return coreStagingBootstrapDiagnostic(null);
}

function diagnosticCoreStagingBootstrapRecovery() {
  return coreStagingBootstrapDiagnostic(["APPLYING", "ROLLED_BACK", "RECOVERY_REQUIRED"]);
}
