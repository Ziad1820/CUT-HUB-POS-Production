/* global ScriptApp, SpreadsheetApp, PropertiesService, Session, DriveApp, LockService */
// REVIEW ONLY. Disarmed by default. Never include in the runtime bundle.
var PROD_PHASE5_ENGINE_ONLY_ARMED = false;

function prodPhase5EngineOnlyIdentity_() {
  var scriptId = "1UmjdRMGLukMt_0Be_ZL2krphwtZ-CQHPOiZ3GF10pY9-glgvoubfGflP";
  var spreadsheetId = "1r0I9J-IZF1GhMC4Yvj73S8VdjJQxMfmOgP4v0ZFNOb0";
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty("CUT_HUB_ENVIRONMENT") !== "production") throw new Error("ENVIRONMENT_MISMATCH");
  if (ScriptApp.getScriptId() !== scriptId) throw new Error("SCRIPT_ID_MISMATCH");
  if (props.getProperty("CUT_HUB_PRODUCTION_SPREADSHEET_ID") !== spreadsheetId) throw new Error("SPREADSHEET_PIN_MISMATCH");
  var sheet = SpreadsheetApp.getActive();
  if (!sheet || sheet.getId() !== spreadsheetId) throw new Error("ACTIVE_SPREADSHEET_MISMATCH");
  function email(user) {
    return String(user && user.getEmail ? user.getEmail() : "").trim().toLowerCase();
  }
  var active = email(Session.getActiveUser());
  var effective = email(Session.getEffectiveUser());
  var owner = email(DriveApp.getFileById(spreadsheetId).getOwner());
  if (!active || !effective || !owner || active !== effective || active !== owner) throw new Error("PRODUCTION_OWNER_REQUIRED");
  return { scriptId: scriptId, spreadsheetId: spreadsheetId, environment: "production", actorIdentity: active };
}

function prodPhase5EngineOnlyState_(expectedEngine) {
  var props = PropertiesService.getScriptProperties();
  var expectedFlags = {
    BOOKING_PHASE2_PLANNED_ENABLED: "true",
    BOOKING_ATTENDANCE_LIVE_ENABLED: "false",
    BOOKING_CUSTOMER_LIVE_REFRESH_ENABLED: "false",
    BOOKING_INTERNAL_LIVE_REFRESH_ENABLED: "false",
    BOOKING_MANAGER_OVERRIDE_ENABLED: "false",
    BOOKING_CONFLICT_RESOLUTION_ENABLED: "false",
    BOOKING_NO_CHECK_IN_DETECTOR_ENABLED: "false"
  };
  var engine = props.getProperty("BOOKING_AVAILABILITY_ENGINE");
  var flags = {};
  var mismatches = [];
  if (engine !== expectedEngine) mismatches.push("BOOKING_AVAILABILITY_ENGINE");
  Object.keys(expectedFlags).forEach(function (key) {
    flags[key] = props.getProperty(key);
    if (flags[key] !== expectedFlags[key]) mismatches.push(key);
  });
  return { currentEngine: engine, expectedEngine: expectedEngine, flags: flags,
    expectedFlags: expectedFlags, preconditionsPass: mismatches.length === 0, mismatches: mismatches };
}

function previewProductionPhase5ShadowEngineOnly() {
  var identity = prodPhase5EngineOnlyIdentity_();
  var state = prodPhase5EngineOnlyState_("LEGACY");
  return Object.assign({ identity: identity, writesPlanned: state.preconditionsPass ? 1 : 0,
    property: "BOOKING_AVAILABILITY_ENGINE", before: "LEGACY", after: "SHADOW",
    executionAllowed: false }, state);
}

function prodPhase5EngineOnlyGuard_(confirmation, expectedConfirmation) {
  if (PROD_PHASE5_ENGINE_ONLY_ARMED !== true) throw new Error("EXECUTION_DISARMED");
  if (confirmation !== expectedConfirmation) throw new Error("CONFIRMATION_REQUIRED");
}

function prodPhase5EngineOnlyLocked_(callback) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error("LOCK_UNAVAILABLE");
  try { return callback(); } finally { lock.releaseLock(); }
}

function prodPhase5EngineOnlyRequireState_(engine) {
  var state = prodPhase5EngineOnlyState_(engine);
  if (!state.preconditionsPass) throw new Error("BASELINE_MISMATCH: " + state.mismatches.join(","));
}

function executeProductionPhase5ShadowEngineOnly(confirmation) {
  prodPhase5EngineOnlyGuard_(confirmation, "CONFIRM_LEGACY_TO_SHADOW");
  return prodPhase5EngineOnlyLocked_(function () {
    var identity = prodPhase5EngineOnlyIdentity_();
    prodPhase5EngineOnlyRequireState_("LEGACY");
    var props = PropertiesService.getScriptProperties();
    var writeAttempts = 0;
    try {
      writeAttempts += 1;
      props.setProperty("BOOKING_AVAILABILITY_ENGINE", "SHADOW");
      if (props.getProperty("BOOKING_AVAILABILITY_ENGINE") !== "SHADOW") throw new Error("ACTIVATION_VERIFICATION_FAILED");
    } catch (error) {
      // A failed setter may already have persisted. Restore only the engine.
      // Other property writers must respect the same script lock during rollout.
      var restored = false;
      try {
        writeAttempts += 1;
        props.setProperty("BOOKING_AVAILABILITY_ENGINE", "LEGACY");
        restored = props.getProperty("BOOKING_AVAILABILITY_ENGINE") === "LEGACY";
      } catch (_rollbackError) { restored = false; }
      var failure = new Error(restored ? "ACTIVATION_FAILED_ROLLED_BACK" : "ENGINE_RECOVERY_REQUIRED");
      failure.writeAttempts = writeAttempts;
      failure.rollbackVerified = restored;
      // On a service exception the number of persisted writes cannot be known.
      throw failure;
    }
    return { identity: identity, property: "BOOKING_AVAILABILITY_ENGINE",
      before: "LEGACY", after: "SHADOW", writes: 1, writeAttempts: writeAttempts };
  });
}

function rollbackProductionPhase5ShadowEngineOnly(confirmation) {
  prodPhase5EngineOnlyGuard_(confirmation, "CONFIRM_SHADOW_TO_LEGACY");
  return prodPhase5EngineOnlyLocked_(function () {
    var identity = prodPhase5EngineOnlyIdentity_();
    prodPhase5EngineOnlyRequireState_("SHADOW");
    var props = PropertiesService.getScriptProperties();
    props.setProperty("BOOKING_AVAILABILITY_ENGINE", "LEGACY");
    if (props.getProperty("BOOKING_AVAILABILITY_ENGINE") !== "LEGACY") throw new Error("ROLLBACK_VERIFICATION_FAILED");
    return { identity: identity, property: "BOOKING_AVAILABILITY_ENGINE",
      before: "SHADOW", after: "LEGACY", writes: 1, writeAttempts: 1 };
  });
}
