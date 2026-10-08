function auth01ReadOnlyMigrationState(username, properties, options) {
  const opaqueUserId = auth01OpaqueUserId(username, options);
  const all = properties.getProperties();
  const now = auth01Now(options);
  let journalPresent = false;
  let inProgress = false;
  let recoveryRequired = false;
  let malformed = false;
  let recoveryArtifactCount = 0;

  Object.keys(all).filter(key => key.indexOf(AUTH01_MIGRATION_PREFIX) === 0).forEach(key => {
    const raw = String(all[key] || "");
    try {
      const journal = auth01ParseMigrationJournal(raw, now);
      if (journal.opaqueUserId !== opaqueUserId) return;
      journalPresent = true;
      if (journal.status === "PREPARED" || journal.status === "APPLYING") inProgress = true;
      if (journal.status === "RECOVERY_REQUIRED") {
        recoveryRequired = true;
        recoveryArtifactCount += 1;
      }
    } catch (error) {
      const match = /"opaqueUserId"\s*:\s*"([A-Za-z0-9_-]{43})"/.exec(raw);
      if (!match || match[1] !== opaqueUserId) return;
      journalPresent = true;
      malformed = true;
      recoveryArtifactCount += 1;
    }
  });

  return Object.freeze({
    journalPresent,
    inProgress,
    recoveryRequired,
    malformed,
    recoveryArtifactCount: Math.min(200, recoveryArtifactCount),
    classification: malformed
      ? "MALFORMED"
      : recoveryRequired
        ? "RECOVERY_REQUIRED"
        : inProgress
          ? "IN_PROGRESS"
          : journalPresent ? "RESOLVED" : "NONE"
  });
}

function auth01ReadOnlyThrottleSecurityState(username, properties, options) {
  const policy = auth01ThrottlePolicy(options);
  const now = auth01Now(options);
  const keys = auth01VersionedIdentifierPropertyKeys(username, AUTH01_THROTTLE_ACCOUNT_PREFIX, options);
  const propertyKeys = [keys.activeKey].concat(keys.legacyKey ? [keys.legacyKey] : []);
  let reservationCount = 0;
  let activeBlock = false;
  let malformed = false;

  propertyKeys.forEach(propertyKey => {
    const recoveryKey = AUTH01_THROTTLE_RECOVERY_PREFIX + auth01Base64UrlEncode(
      auth01Sha256Bytes(auth01Utf8Bytes(propertyKey))
    );
    if (properties.getProperty(recoveryKey)) malformed = true;

    const raw = properties.getProperty(propertyKey);
    if (raw == null || raw === "") return;
    try {
      const state = JSON.parse(raw);
      auth01ValidateThrottleState(state, raw, now, "ACCOUNT", policy);
      reservationCount += Object.keys(state.reservations).length;
      activeBlock = activeBlock || (state.status === "BLOCKED" && state.blockedUntil > now);
    } catch (error) {
      malformed = true;
    }
  });

  return Object.freeze({
    reservationCount: Math.min(policy.maximumReservations, reservationCount),
    activeBlock,
    malformed
  });
}

function getMyAuthSecurityState(_data, authContext) {
  return jsonOutput(auth01ReadSecurityState(authContext));
}

function auth01ReadSecurityState(authContext) {
  if (!authContext || !AUTH01_AUTHENTICATED_SESSION_CONTEXTS.has(authContext)) {
    return { status: "error", code: "AUTH_REQUIRED", authRequired: true };
  }

  try {
    const options = auth01RuntimeOptions() || {};
    const properties = auth01ScriptProperties(options);
    const canonicalUsername = auth01CanonicalUsername(authContext.username);
    const users = readUsersFromSheet();
    const user = users.find(item => auth01CanonicalUsername(item.username) === canonicalUsername) || null;
    if (!user || auth01FindCanonicalUsernameCollisions(users).length) {
      throw auth01Error("AUTH01_ACCOUNT_STATE_INCONSISTENT", "Authentication state is inconsistent.");
    }

    const credential = auth01ClassifyCredential(user, options);
    const credentialClass = [
      AUTH01_CREDENTIAL_STATES.MODERN_V1,
      AUTH01_CREDENTIAL_STATES.LEGACY_SHA256,
      AUTH01_CREDENTIAL_STATES.EMPTY
    ].indexOf(credential.state) !== -1 ? credential.state : AUTH01_CREDENTIAL_STATES.INVALID;
    const credentialStructureValid = credential.state === AUTH01_CREDENTIAL_STATES.MODERN_V1
      ? !!credential.modern
      : credential.state === AUTH01_CREDENTIAL_STATES.LEGACY_SHA256;
    const plaintextBlank = String(user.password || "") === "";
    const effectiveCredentialEpoch = auth01ReadCredentialEpoch(user.username, options);
    if (effectiveCredentialEpoch > 1000000000) {
      throw auth01Error("AUTH01_CREDENTIAL_EPOCH_INVALID", "Authentication state is inconsistent.");
    }

    let identifierVersion = "UNKNOWN";
    let identifierContinuity = "UNKNOWN";
    let currentFingerprint = "";
    try {
      identifierVersion = String(auth01ActiveIdentifierKeyVersion(options) || "").toUpperCase();
      currentFingerprint = auth01CurrentIdentifierFingerprint(options);
      identifierContinuity = "PASS";
    } catch (error) {
      identifierVersion = "UNKNOWN";
      identifierContinuity = "FAIL";
    }

    const sessionRecord = authContext.sessionRecord || {};
    const sessionEpoch = Number(sessionRecord.credentialEpoch == null ? 0 : sessionRecord.credentialEpoch);
    const sessionValid = auth01CanonicalUsername(sessionRecord.username) === canonicalUsername &&
      Number.isFinite(Date.parse(sessionRecord.expiresAt || "")) &&
      Date.parse(sessionRecord.expiresAt || "") > Date.now();
    const sessionEpochMatch = sessionValid && sessionEpoch === effectiveCredentialEpoch;
    const sessionIdentifierMatch = sessionValid && identifierContinuity === "PASS" &&
      typeof sessionRecord.identifierKeyFingerprint === "string" &&
      sessionRecord.identifierKeyFingerprint === currentFingerprint;
    const migration = auth01ReadOnlyMigrationState(user.username, properties, options);
    const throttle = auth01ReadOnlyThrottleSecurityState(user.username, properties, options);

    const cleanBindings = sessionValid && sessionEpochMatch && sessionIdentifierMatch &&
      identifierContinuity === "PASS" && !migration.inProgress &&
      !migration.recoveryRequired && !migration.malformed &&
      throttle.reservationCount === 0 && !throttle.activeBlock && !throttle.malformed;
    const authSecurityState = migration.recoveryRequired || migration.malformed
      ? "RECOVERY_REQUIRED"
      : credentialClass === AUTH01_CREDENTIAL_STATES.MODERN_V1 &&
          credentialStructureValid && plaintextBlank && cleanBindings
        ? "CLEAN_MODERN"
        : credentialClass === AUTH01_CREDENTIAL_STATES.LEGACY_SHA256 &&
            credentialStructureValid && plaintextBlank && cleanBindings
          ? "LEGACY_COMPAT"
          : "INCONSISTENT";

    return {
      status: "success",
      credentialClass,
      credentialStructureValid,
      plaintextBlank,
      effectiveCredentialEpoch,
      migrationJournalPresent: migration.journalPresent,
      migrationJournalState: migration.classification,
      migrationRecoveryRequired: migration.recoveryRequired || migration.malformed,
      recoveryArtifactCount: migration.recoveryArtifactCount,
      sessionValid,
      sessionEpochMatch,
      sessionIdentifierMatch,
      identifierVersion,
      identifierContinuity,
      targetThrottleReservationCount: throttle.reservationCount,
      targetThrottleActiveBlock: throttle.activeBlock,
      targetThrottleMalformed: throttle.malformed,
      authSecurityState
    };
  } catch (error) {
    return { status: "error", code: "AUTH_SECURITY_STATE_UNAVAILABLE" };
  }
}

