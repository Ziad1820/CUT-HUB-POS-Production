function auth01CanonicalUsername(username) {
  const value = String(username == null ? "" : username).trim();
  const normalized = typeof value.normalize === "function" ? value.normalize("NFC") : value;
  return normalized.toLowerCase();
}

function auth01FindCanonicalUsernameCollisions(users) {
  const seen = {};
  const collisions = [];
  (users || []).forEach(user => {
    const stored = String(user && user.username != null ? user.username : "");
    const canonical = auth01CanonicalUsername(stored);
    if (!canonical) return;
    if (Object.prototype.hasOwnProperty.call(seen, canonical) && seen[canonical] !== stored) {
      collisions.push({ canonical, usernames: [seen[canonical], stored] });
    } else {
      seen[canonical] = stored;
    }
  });
  return collisions;
}

function auth01GenerateIdentifierKey(options) {
  if (options && typeof options.randomBytes === "function") {
    const bytes = Array.prototype.slice.call(options.randomBytes(32) || []);
    if (bytes.length !== 32) throw auth01Error("AUTH01_IDENTIFIER_KEY_INVALID", "Identifier key must be 32 bytes.");
    return auth01Base64UrlEncode(bytes);
  }
  const material = `${Utilities.getUuid()}|${Utilities.getUuid()}|${Utilities.getUuid()}|${Utilities.getUuid()}`;
  return auth01Base64UrlEncode(auth01Sha256Bytes(auth01Utf8Bytes(material)));
}

function auth01IdentifierKeyContract(version) {
  const normalized = String(version || "");
  const contract = AUTH01_IDENTIFIER_KEY_CONTRACTS[normalized];
  if (!contract) {
    throw auth01Error("AUTH01_IDENTIFIER_VERSION_INVALID", "Authentication identifier version is invalid.");
  }
  return contract;
}

function auth01ActiveIdentifierKeyVersion(options) {
  const raw = auth01ScriptProperties(options).getProperty(AUTH01_IDENTIFIER_ACTIVE_VERSION_PROPERTY);
  if (raw == null || raw === "") return "v1";
  const version = String(raw);
  auth01IdentifierKeyContract(version);
  return version;
}

function auth01IdentifierKeyFingerprint(rawKey, version) {
  const keyVersion = String(version || "v1");
  auth01IdentifierKeyContract(keyVersion);
  const bytes = auth01Base64UrlDecodeCanonical(rawKey);
  if (!bytes || bytes.length !== 32) {
    throw auth01Error("AUTH01_IDENTIFIER_KEY_INVALID", "Authentication identifier configuration is invalid.");
  }
  return auth01Base64UrlEncode(auth01Sha256Bytes(
    auth01Utf8Bytes(`CUT-HUB-POS|AUTH01:IDKEY:${keyVersion}|`).concat(bytes)
  ));
}

function auth01ProvisionIdentifierKey(options) {
  const properties = auth01ScriptProperties(options);
  const lock = auth01AcquireScriptLock(options);
  try {
    if (auth01ActiveIdentifierKeyVersion(options) !== "v1") {
      throw auth01Error(
        "AUTH01_IDENTIFIER_PROVISIONING_DISABLED",
        "Legacy identifier provisioning is disabled after version activation."
      );
    }
    const existingKey = properties.getProperty(AUTH01_IDENTIFIER_KEY_PROPERTY);
    const existingFingerprint = properties.getProperty(AUTH01_IDENTIFIER_FINGERPRINT_PROPERTY);
    if (existingKey || existingFingerprint) {
      if (!existingKey || !existingFingerprint ||
          auth01IdentifierKeyFingerprint(existingKey) !== existingFingerprint) {
        throw auth01Error("AUTH01_IDENTIFIER_KEY_CONTINUITY_INVALID", "Authentication identifier continuity is invalid.");
      }
      return { created: false, fingerprint: existingFingerprint };
    }
    const key = auth01GenerateIdentifierKey(options);
    const fingerprint = auth01IdentifierKeyFingerprint(key);
    properties.setProperty(AUTH01_IDENTIFIER_KEY_PROPERTY, key);
    properties.setProperty(AUTH01_IDENTIFIER_FINGERPRINT_PROPERTY, fingerprint);
    if (properties.getProperty(AUTH01_IDENTIFIER_KEY_PROPERTY) !== key ||
        properties.getProperty(AUTH01_IDENTIFIER_FINGERPRINT_PROPERTY) !== fingerprint) {
      throw auth01Error("AUTH01_IDENTIFIER_KEY_WRITE_FAILED", "Authentication identifier configuration could not be verified.");
    }
    return { created: true, fingerprint };
  } finally {
    lock.releaseLock();
  }
}

function auth01ProvisionIdentifierKeyV2(rawKey, options) {
  const candidateKey = String(rawKey || "");
  const candidateFingerprint = auth01IdentifierKeyFingerprint(candidateKey, "v2");
  const properties = auth01ScriptProperties(options);
  const contract = auth01IdentifierKeyContract("v2");
  const lock = auth01AcquireScriptLock(options);
  try {
    const activeVersion = auth01ActiveIdentifierKeyVersion(options);
    if (activeVersion !== "v1" && activeVersion !== "v2") {
      throw auth01Error("AUTH01_IDENTIFIER_VERSION_INVALID", "Authentication identifier version is invalid.");
    }
    const existingKey = properties.getProperty(contract.keyProperty);
    const existingFingerprint = properties.getProperty(contract.fingerprintProperty);
    if (existingKey || existingFingerprint) {
      if (!existingKey || !existingFingerprint ||
          auth01IdentifierKeyFingerprint(existingKey, "v2") !== existingFingerprint) {
        throw auth01Error(
          "AUTH01_IDENTIFIER_V2_CONTINUITY_INVALID",
          "Versioned authentication identifier continuity is invalid."
        );
      }
      return Object.freeze({ created: false, version: "v2", continuityPass: true });
    }
    try {
      properties.setProperties({
        [contract.keyProperty]: candidateKey,
        [contract.fingerprintProperty]: candidateFingerprint
      }, false);
    } catch (error) {
      const committedKey = properties.getProperty(contract.keyProperty);
      const committedFingerprint = properties.getProperty(contract.fingerprintProperty);
      if (committedKey !== candidateKey || committedFingerprint !== candidateFingerprint) {
        throw auth01Error(
          "AUTH01_IDENTIFIER_V2_PROVISION_FAILED",
          "Versioned authentication identifier provisioning was not committed."
        );
      }
    }
    if (properties.getProperty(contract.keyProperty) !== candidateKey ||
        properties.getProperty(contract.fingerprintProperty) !== candidateFingerprint) {
      throw auth01Error(
        "AUTH01_IDENTIFIER_V2_PROVISION_FAILED",
        "Versioned authentication identifier provisioning could not be verified."
      );
    }
    return Object.freeze({ created: true, version: "v2", continuityPass: true });
  } finally {
    lock.releaseLock();
  }
}

function auth01IdentifierActivationBlockers(properties) {
  let all;
  try { all = properties.getProperties(); } catch (error) {
    throw auth01Error("AUTH01_IDENTIFIER_ACTIVATION_STATE_UNAVAILABLE", "Identifier activation state is unavailable.");
  }
  let sessions = 0;
  let activeReservations = 0;
  let unresolvedMigrations = 0;
  Object.keys(all).forEach(key => {
    if (key.indexOf(SESSION_CACHE_PREFIX) === 0) {
      sessions += 1;
      return;
    }
    if (key.indexOf(AUTH01_THROTTLE_ACCOUNT_PREFIX) === 0 || key === AUTH01_THROTTLE_GLOBAL_KEY) {
      let state;
      try { state = JSON.parse(all[key]); } catch (error) {
        throw auth01Error("AUTH01_IDENTIFIER_ACTIVATION_STATE_INVALID", "Identifier activation state is invalid.");
      }
      if (!state || typeof state.reservations !== "object" || Array.isArray(state.reservations)) {
        throw auth01Error("AUTH01_IDENTIFIER_ACTIVATION_STATE_INVALID", "Identifier activation state is invalid.");
      }
      activeReservations += Object.keys(state.reservations).length;
      return;
    }
    if (key.indexOf(AUTH01_MIGRATION_PREFIX) === 0) {
      let journal;
      try { journal = JSON.parse(all[key]); } catch (error) {
        throw auth01Error("AUTH01_IDENTIFIER_ACTIVATION_STATE_INVALID", "Identifier activation state is invalid.");
      }
      if (!journal || ["COMMITTED", "ABORTED"].indexOf(journal.status) === -1) unresolvedMigrations += 1;
    }
  });
  return Object.freeze({ sessions, activeReservations, unresolvedMigrations });
}

function auth01ActivateIdentifierKeyV2(options) {
  const properties = auth01ScriptProperties(options);
  const lock = auth01AcquireScriptLock(options);
  try {
    auth01IdentifierKeyBytesForVersion("v1", options);
    auth01IdentifierKeyBytesForVersion("v2", options);
    const activeVersion = auth01ActiveIdentifierKeyVersion(options);
    if (activeVersion === "v2") {
      return Object.freeze({ activated: false, alreadyActive: true, version: "v2" });
    }
    if (activeVersion !== "v1") {
      throw auth01Error("AUTH01_IDENTIFIER_VERSION_INVALID", "Authentication identifier version is invalid.");
    }
    const blockers = auth01IdentifierActivationBlockers(properties);
    if (blockers.sessions || blockers.activeReservations || blockers.unresolvedMigrations) {
      throw auth01Error(
        "AUTH01_IDENTIFIER_ACTIVATION_BLOCKED",
        "Identifier activation requires contained sessions and quiescent authentication state."
      );
    }
    try {
      properties.setProperty(AUTH01_IDENTIFIER_ACTIVE_VERSION_PROPERTY, "v2");
    } catch (error) {
      if (properties.getProperty(AUTH01_IDENTIFIER_ACTIVE_VERSION_PROPERTY) !== "v2") {
        throw auth01Error("AUTH01_IDENTIFIER_ACTIVATION_FAILED", "Identifier activation was not committed.");
      }
    }
    if (auth01ActiveIdentifierKeyVersion(options) !== "v2") {
      throw auth01Error("AUTH01_IDENTIFIER_ACTIVATION_FAILED", "Identifier activation could not be verified.");
    }
    return Object.freeze({ activated: true, alreadyActive: false, version: "v2" });
  } finally {
    lock.releaseLock();
  }
}

function auth01ScriptProperties(options) {
  return options && options.properties ? options.properties : PropertiesService.getScriptProperties();
}

function auth01IdentifierKeyBytesForVersion(version, options) {
  const properties = auth01ScriptProperties(options);
  const contract = auth01IdentifierKeyContract(version);
  const raw = properties.getProperty(contract.keyProperty);
  const storedFingerprint = properties.getProperty(contract.fingerprintProperty);
  const bytes = auth01Base64UrlDecodeCanonical(raw);
  if (!bytes || bytes.length !== 32 || !storedFingerprint) {
    throw auth01Error("AUTH01_IDENTIFIER_KEY_MISSING", "Authentication identifier configuration is unavailable.");
  }
  const actualFingerprint = auth01IdentifierKeyFingerprint(raw, version);
  if (!auth01ConstantTimeEqual(
    auth01Utf8Bytes(actualFingerprint), auth01Utf8Bytes(storedFingerprint)
  )) {
    throw auth01Error("AUTH01_IDENTIFIER_KEY_CONTINUITY_INVALID", "Authentication identifier continuity is invalid.");
  }
  return bytes;
}

function auth01IdentifierKeyBytes(options) {
  return auth01IdentifierKeyBytesForVersion(auth01ActiveIdentifierKeyVersion(options), options);
}

function auth01CurrentIdentifierFingerprint(options) {
  const version = auth01ActiveIdentifierKeyVersion(options);
  const contract = auth01IdentifierKeyContract(version);
  auth01IdentifierKeyBytesForVersion(version, options);
  return auth01ScriptProperties(options).getProperty(contract.fingerprintProperty);
}

function auth01OpaqueUserIdForVersion(username, version, options) {
  const canonical = auth01CanonicalUsername(username);
  if (!canonical) throw auth01Error("AUTH01_USERNAME_INVALID", "User identifier is invalid.");
  const message = version === "v1"
    ? canonical
    : `CUT-HUB-POS|AUTH01:OPAQUE:${version}|${canonical}`;
  return auth01Base64UrlEncode(auth01HmacSha256Bytes(
    auth01IdentifierKeyBytesForVersion(version, options), auth01Utf8Bytes(message)
  ));
}

function auth01OpaqueUserId(username, options) {
  return auth01OpaqueUserIdForVersion(username, auth01ActiveIdentifierKeyVersion(options), options);
}

function auth01EpochPropertyKeyForVersion(username, version, options) {
  return AUTH01_EPOCH_PREFIX + auth01OpaqueUserIdForVersion(username, version, options);
}

function auth01EpochPropertyKey(username, options) {
  return auth01EpochPropertyKeyForVersion(username, auth01ActiveIdentifierKeyVersion(options), options);
}

function auth01VersionedIdentifierPropertyKeys(username, prefix, options) {
  const activeVersion = auth01ActiveIdentifierKeyVersion(options);
  const activeKey = prefix + auth01OpaqueUserIdForVersion(username, activeVersion, options);
  const legacyKey = activeVersion === "v2"
    ? prefix + auth01OpaqueUserIdForVersion(username, "v1", options)
    : "";
  return { activeVersion, activeKey, legacyKey };
}

function auth01ReadVersionedIdentifierProperty(username, prefix, options) {
  const properties = auth01ScriptProperties(options);
  const keys = auth01VersionedIdentifierPropertyKeys(username, prefix, options);
  const activeRaw = properties.getProperty(keys.activeKey);
  if (activeRaw != null && activeRaw !== "") {
    return { value: activeRaw, sourceKey: keys.activeKey, keys };
  }
  if (keys.legacyKey) {
    const legacyRaw = properties.getProperty(keys.legacyKey);
    if (legacyRaw != null && legacyRaw !== "") {
      return { value: legacyRaw, sourceKey: keys.legacyKey, keys };
    }
  }
  return { value: null, sourceKey: "", keys };
}

function auth01ReadCredentialEpoch(username, options) {
  const raw = auth01ReadVersionedIdentifierProperty(username, AUTH01_EPOCH_PREFIX, options).value;
  if (raw == null || raw === "") return 0;
  const epoch = Number(raw);
  if (!Number.isSafeInteger(epoch) || epoch < 0) {
    throw auth01Error("AUTH01_CREDENTIAL_EPOCH_INVALID", "Credential epoch state is invalid.");
  }
  return epoch;
}

function auth01IncrementCredentialEpoch(username, options) {
  const properties = auth01ScriptProperties(options);
  const key = auth01VersionedIdentifierPropertyKeys(username, AUTH01_EPOCH_PREFIX, options).activeKey;
  const current = auth01ReadCredentialEpoch(username, options);
  const next = current + 1;
  properties.setProperty(key, String(next));
  const committed = properties.getProperty(key);
  if (committed !== String(next) || auth01ReadCredentialEpoch(username, options) !== next) {
    throw auth01Error("AUTH01_CREDENTIAL_EPOCH_WRITE_FAILED", "Credential epoch could not be verified.");
  }
  return next;
}

function auth01IdentifierRetirementDecision(evidence) {
  const state = evidence || {};
  const eligible = state.activeVersion === "v2" &&
    state.v2ContinuityPass === true &&
    state.preRotationSessionsRemaining === 0 &&
    state.legacyEpochRecordsRemaining === 0 &&
    state.legacyThrottleRecordsRemaining === 0 &&
    state.rollbackWindowClosed === true;
  return Object.freeze({ eligible, retiredVersion: eligible ? "v1" : "" });
}

