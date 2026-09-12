/* global SpreadsheetApp, LockService, Logger, HtmlService,
  staffImportPreviewStagingIdentityAndOwner, hashPassword */
"use strict";

/**
 * Isolated, editor-only credential reset for the existing Staging owner row.
 * This file is intentionally not connected to doPost, doGet, triggers, or bootstrap execution.
 */

var OWNER_PASSWORD_RESET_STAGING_SPREADSHEET_ID =
  "1TNR5WJ-I2U23-DPSaL70MVjPY_J_gsQm7ElLTTfmjtA";
var OWNER_PASSWORD_RESET_STAGING_SPREADSHEET_NAME = "CUT HUB POS - STAGING";
var OWNER_PASSWORD_RESET_MIN_LENGTH = 12;
var OWNER_PASSWORD_RESET_LOG_PREFIX = "OWNER_PASSWORD_RESET_RESULT=";
var OWNER_PASSWORD_RESET_HEADERS = Object.freeze([
  "USERNAME", "PASSWORD", "DISPLAY_NAME", "PERMISSIONS", "CREATED_AT", "PASSWORD_HASH"
]);

function ownerPasswordResetError(code, message, details) {
  var error = new Error(message || code);
  error.code = code;
  if (details !== undefined) error.details = details;
  return error;
}

function ownerPasswordResetText(value) {
  return String(value == null ? "" : value).trim();
}

function ownerPasswordResetValidHash(value) {
  return /^[a-f0-9]{64}$/.test(ownerPasswordResetText(value));
}

function ownerPasswordResetIdentity() {
  if (typeof staffImportPreviewStagingIdentityAndOwner !== "function") {
    throw ownerPasswordResetError(
      "OWNER_PASSWORD_RESET_IDENTITY_GUARD_UNAVAILABLE",
      "The verified Staging owner identity guard is unavailable."
    );
  }
  var identity = staffImportPreviewStagingIdentityAndOwner();
  var environment = ownerPasswordResetText(identity.config && identity.config.environment)
    .toLowerCase();
  var spreadsheet = identity.spreadsheet;
  var spreadsheetId = ownerPasswordResetText(spreadsheet && spreadsheet.getId());
  var spreadsheetName = ownerPasswordResetText(spreadsheet && spreadsheet.getName());
  var configuredId = ownerPasswordResetText(identity.config && identity.config.spreadsheetId);
  var stagingId = ownerPasswordResetText(identity.config && identity.config.stagingSpreadsheetId);
  var actorIdentity = ownerPasswordResetText(identity.actorIdentity).toLowerCase();
  if (environment !== "staging") {
    throw ownerPasswordResetError(
      "OWNER_PASSWORD_RESET_STAGING_ONLY", "Owner password reset is restricted to Staging."
    );
  }
  if (!spreadsheet || spreadsheetId !== OWNER_PASSWORD_RESET_STAGING_SPREADSHEET_ID ||
      spreadsheetName !== OWNER_PASSWORD_RESET_STAGING_SPREADSHEET_NAME ||
      configuredId !== spreadsheetId || stagingId !== spreadsheetId) {
    throw ownerPasswordResetError(
      "OWNER_PASSWORD_RESET_SPREADSHEET_IDENTITY_INVALID",
      "The authoritative Staging spreadsheet identity does not match."
    );
  }
  if (!actorIdentity) {
    throw ownerPasswordResetError(
      "OWNER_PASSWORD_RESET_OWNER_REQUIRED",
      "An authenticated interactive Staging owner is required."
    );
  }
  return {
    environment: environment,
    spreadsheet: spreadsheet,
    spreadsheetId: spreadsheetId,
    spreadsheetName: spreadsheetName,
    actorIdentity: actorIdentity
  };
}

function ownerPasswordResetReadState(identity) {
  var sheet = identity.spreadsheet.getSheetByName("USERS");
  if (!sheet) {
    throw ownerPasswordResetError("OWNER_PASSWORD_RESET_USERS_MISSING", "USERS is missing.");
  }
  var lastColumn = Math.max(6, Number(sheet.getLastColumn()) || 0);
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function (value) {
    return ownerPasswordResetText(value).toUpperCase().replace(/[\s-]+/g, "_");
  });
  var headersValid = OWNER_PASSWORD_RESET_HEADERS.every(function (header, index) {
    return headers[index] === header;
  });
  if (!headersValid) {
    throw ownerPasswordResetError(
      "OWNER_PASSWORD_RESET_USERS_SCHEMA_INVALID", "USERS headers are incompatible."
    );
  }
  var lastRow = Number(sheet.getLastRow()) || 0;
  var rows = lastRow > 1
    ? sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues()
    : [];
  var ownerRows = rows.map(function (row, index) {
    return { row: row, rowNumber: index + 2 };
  }).filter(function (item) {
    return ownerPasswordResetText(item.row[0]).toLowerCase() === "owner";
  });
  if (!ownerRows.length) {
    throw ownerPasswordResetError("OWNER_PASSWORD_RESET_OWNER_MISSING", "Owner row is missing.");
  }
  if (ownerRows.length !== 1) {
    throw ownerPasswordResetError(
      "OWNER_PASSWORD_RESET_OWNER_DUPLICATED", "Exactly one owner row is required."
    );
  }
  var owner = ownerRows[0];
  if (String(owner.row[0] == null ? "" : owner.row[0]).trim() !== "owner" ||
      String(owner.row[1] == null ? "" : owner.row[1]) !== "" ||
      !ownerPasswordResetText(owner.row[2]) || !owner.row[4] ||
      !ownerPasswordResetValidHash(owner.row[5])) {
    throw ownerPasswordResetError(
      "OWNER_PASSWORD_RESET_OWNER_ROW_INVALID", "The current owner row is not canonical."
    );
  }
  return { sheet: sheet, headers: headers, owner: owner, ownerCount: ownerRows.length };
}

function ownerPasswordResetValidatePassword(password) {
  if (typeof password !== "string" || !password) {
    throw ownerPasswordResetError(
      "OWNER_PASSWORD_RESET_PASSWORD_REQUIRED", "A password argument is required."
    );
  }
  if (Array.from(password).length < OWNER_PASSWORD_RESET_MIN_LENGTH) {
    throw ownerPasswordResetError(
      "OWNER_PASSWORD_RESET_PASSWORD_TOO_SHORT",
      "Password must contain at least " + OWNER_PASSWORD_RESET_MIN_LENGTH + " characters."
    );
  }
  return password;
}

function doGet() {
  ownerPasswordResetIdentity();
  var html = '<!doctype html><html lang="ar" dir="rtl"><head><base target="_top">' +
    '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>body{font:15px Arial,sans-serif;background:#f4f6f8;margin:0;padding:24px;color:#17202a}' +
    'main{max-width:460px;margin:30px auto;background:#fff;padding:24px;border-radius:14px;' +
    'box-shadow:0 8px 30px #0002}label{display:block;margin:16px 0 6px;font-weight:700}' +
    'input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #aab7b8;border-radius:8px}' +
    'button{width:100%;margin-top:22px;padding:12px;border:0;border-radius:8px;background:#1769aa;' +
    'color:#fff;font-weight:700}.hint{color:#566573;font-size:13px}#status{margin-top:16px;' +
    'padding:12px;border-radius:8px;white-space:pre-wrap}</style></head><body><main>' +
    '<h2>إعادة كلمة مرور مالك Staging</h2><p class="hint">هذه الصفحة مقيدة بمحرر مشروع Staging. ' +
    'استخدم كلمة جديدة من 12 حرفًا على الأقل.</p>' +
    '<label for="password">كلمة المرور الجديدة</label><input id="password" type="password" ' +
    'autocomplete="new-password" minlength="12">' +
    '<label for="confirmation">تأكيد كلمة المرور</label><input id="confirmation" type="password" ' +
    'autocomplete="new-password" minlength="12">' +
    '<button id="submit" type="button">تنفيذ إعادة الضبط على Staging</button><div id="status"></div>' +
    '<script>document.getElementById("submit").onclick=function(){var b=this,' +
    'p=document.getElementById("password"),c=document.getElementById("confirmation"),' +
    's=document.getElementById("status"),v=p.value;if(!v||v.length<12){s.textContent=' +
    '"استخدم كلمة مرور من 12 حرفًا على الأقل.";return}if(v!==c.value){s.textContent=' +
    '"تأكيد كلمة المرور غير مطابق.";return}b.disabled=true;' +
    'google.script.run.withSuccessHandler(function(r){p.value="";c.value="";v="";' +
    's.textContent=r.status==="COMMITTED"?"تمت إعادة الضبط بنجاح. ارجع إلى Codex واكتب ready.":' +
    '"لم تكتمل إعادة الضبط.";})' +
    '.withFailureHandler(function(){p.value="";c.value="";v="";b.disabled=false;' +
    's.textContent="لم تكتمل إعادة الضبط. ارجع إلى Codex بدون إعادة المحاولة.";})' +
    '.resetStagingOwnerPassword(v);};</script></main></body></html>';
  return HtmlService.createHtmlOutput(html)
    .setTitle("CUT HUB POS - Staging Owner Password Reset")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function ownerPasswordResetRowsEqualExceptCredentials(before, after) {
  if (!Array.isArray(before) || !Array.isArray(after) || before.length !== after.length) return false;
  return before.every(function (value, index) {
    if (index === 1 || index === 5) return true;
    return String(value == null ? "" : value) === String(after[index] == null ? "" : after[index]);
  });
}

function ownerPasswordResetRestoreCredentials(sheet, rowNumber, oldPassword, oldHash) {
  sheet.getRange(rowNumber, 2).setValue(oldPassword);
  sheet.getRange(rowNumber, 6).setValue(oldHash);
  SpreadsheetApp.flush();
  var restored = sheet.getRange(rowNumber, 1, 1, Math.max(6, sheet.getLastColumn()))
    .getValues()[0];
  return String(restored[1] == null ? "" : restored[1]) === String(oldPassword) &&
    String(restored[5] == null ? "" : restored[5]) === String(oldHash);
}

function ownerPasswordResetSafeLog(status, rowNumber, writes, verification) {
  var result = {
    status: status,
    operationType: "OWNER_PASSWORD_RESET",
    ownerUsername: "owner",
    rowNumber: rowNumber || 0,
    timestamp: new Date().toISOString(),
    writes: Number(writes) || 0,
    verificationStatus: verification || "NOT_COMPLETED"
  };
  Logger.log(OWNER_PASSWORD_RESET_LOG_PREFIX + JSON.stringify(result));
  return result;
}

function resetStagingOwnerPassword(password) {
  var identity = ownerPasswordResetIdentity();
  password = ownerPasswordResetValidatePassword(password);
  var lock = LockService.getScriptLock();
  var rowNumber = 0;
  var writes = 0;
  var result = null;
  var failure = null;
  var verification = "NOT_COMPLETED";
  var passwordHash = "";
  if (!lock.tryLock(30000)) {
    ownerPasswordResetSafeLog(
      "OWNER_PASSWORD_RESET_LOCK_UNAVAILABLE", 0, 0, verification
    );
    throw ownerPasswordResetError(
      "OWNER_PASSWORD_RESET_LOCK_UNAVAILABLE", "The reset lock is unavailable."
    );
  }
  try {
    passwordHash = hashPassword(password);
    password = "";
    if (!ownerPasswordResetValidHash(passwordHash)) {
      throw ownerPasswordResetError(
        "OWNER_PASSWORD_RESET_HASH_GENERATION_FAILED", "Canonical hash generation failed."
      );
    }
    var state = ownerPasswordResetReadState(identity);
    rowNumber = state.owner.rowNumber;
    var before = state.owner.row.slice();
    var oldPassword = String(before[1] == null ? "" : before[1]);
    var oldHash = String(before[5] == null ? "" : before[5]);
    if (oldHash === passwordHash) {
      throw ownerPasswordResetError(
        "OWNER_PASSWORD_RESET_PASSWORD_UNCHANGED",
        "The new password must differ from the current owner password."
      );
    }
    state.sheet.getRange(rowNumber, 2).setValue("");
    writes += 1;
    state.sheet.getRange(rowNumber, 6).setValue(passwordHash);
    writes += 1;
    SpreadsheetApp.flush();

    var afterState;
    try {
      afterState = ownerPasswordResetReadState(identity);
      var after = afterState.owner.row;
      if (afterState.owner.rowNumber !== rowNumber ||
          !ownerPasswordResetRowsEqualExceptCredentials(before, after) ||
          String(after[1] == null ? "" : after[1]) !== "" ||
          String(after[5] == null ? "" : after[5]) !== passwordHash ||
          !ownerPasswordResetValidHash(after[5])) {
        throw ownerPasswordResetError(
          "OWNER_PASSWORD_RESET_POST_WRITE_VERIFICATION_FAILED",
          "The reset did not verify after writing."
        );
      }
    } catch (verificationError) {
      var restored = false;
      try {
        restored = ownerPasswordResetRestoreCredentials(
          state.sheet, rowNumber, oldPassword, oldHash
        );
      } catch (_rollbackError) {
        restored = false;
      }
      if (!restored) {
        throw ownerPasswordResetError(
          "RECOVERY_REQUIRED", "Credential recovery requires operator review."
        );
      }
      verificationError.recovery = "ROLLED_BACK";
      throw verificationError;
    }

    verification = "HASHED_ONLY_VERIFIED";
    result = {
      status: "COMMITTED",
      operationType: "OWNER_PASSWORD_RESET",
      ownerUsername: "owner",
      rowNumber: rowNumber,
      timestamp: new Date().toISOString(),
      writes: writes,
      verificationStatus: verification
    };
  } catch (error) {
    failure = error;
  } finally {
    password = "";
    passwordHash = "";
    lock.releaseLock();
  }
  if (failure) {
    ownerPasswordResetSafeLog(
      failure.code || "OWNER_PASSWORD_RESET_FAILED",
      rowNumber, writes, verification
    );
    throw failure;
  }
  Logger.log(OWNER_PASSWORD_RESET_LOG_PREFIX + JSON.stringify(result));
  return result;
}

function verifyOwnerPasswordResetStateStaging() {
  var identity = ownerPasswordResetIdentity();
  var result = {
    ownerRowExists: false,
    ownerRowCount: 0,
    passwordState: "UNKNOWN",
    passwordHashState: "UNKNOWN",
    hashFormatValid: false,
    structurallyValid: false
  };
  try {
    var state = ownerPasswordResetReadState(identity);
    result.ownerRowExists = true;
    result.ownerRowCount = state.ownerCount;
    result.passwordState = String(state.owner.row[1] == null ? "" : state.owner.row[1]) === ""
      ? "EMPTY" : "NON_EMPTY";
    result.passwordHashState = ownerPasswordResetText(state.owner.row[5]) ? "PRESENT" : "MISSING";
    result.hashFormatValid = ownerPasswordResetValidHash(state.owner.row[5]);
    result.structurallyValid = result.ownerRowCount === 1 && result.passwordState === "EMPTY" &&
      result.passwordHashState === "PRESENT" && result.hashFormatValid;
  } catch (error) {
    if (error.code === "OWNER_PASSWORD_RESET_OWNER_MISSING") {
      result.passwordState = "UNKNOWN";
      result.passwordHashState = "UNKNOWN";
      return result;
    }
    throw error;
  }
  return result;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    LOG_PREFIX: OWNER_PASSWORD_RESET_LOG_PREFIX,
    MIN_LENGTH: OWNER_PASSWORD_RESET_MIN_LENGTH,
    identity: ownerPasswordResetIdentity,
    readState: ownerPasswordResetReadState,
    reset: resetStagingOwnerPassword,
    verify: verifyOwnerPasswordResetStateStaging,
    validHash: ownerPasswordResetValidHash
  };
}
