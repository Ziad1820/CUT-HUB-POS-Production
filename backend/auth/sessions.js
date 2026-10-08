function getSessionToken(data) {
  return String(data.sessionToken || data.token || data.authToken || "").trim();
}

function auth01RequestCorrelationId(data) {
  const value = String(data && data.authRequestId || "").trim();
  return value.length >= 8 && value.length <= 128 &&
    /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value) ? value : "";
}

function auth01CorrelatedJsonOutput(payload, authRequestId) {
  const response = Object.assign({}, payload || {});
  if (authRequestId) response.authRequestId = authRequestId;
  return jsonOutput(response);
}

function isValidSessionToken(token) {
  const value = String(token || "").trim();
  return value.length > 0 && value.length <= 256 && /^[A-Za-z0-9._:-]+$/.test(value);
}

function removeSessionCacheBestEffort(sessionKey) {
  try {
    CacheService.getScriptCache().remove(sessionKey);
    return { attempted: true, failed: false };
  } catch (error) {
    return { attempted: true, failed: true };
  }
}

function createSessionForUser(user) {
  const lock = auth01AcquireScriptLock();
  try {
    cleanupExpiredSessions();
    const token = `${Utilities.getUuid()}-${Utilities.getUuid()}`;
    const credentialEpoch = auth01ReadCredentialEpoch(user.username);
    const identifierKeyFingerprint = auth01CurrentIdentifierFingerprint();
    const session = {
      username: user.username,
      credentialEpoch,
      identifierKeyFingerprint,
      createdAt: getCairoDateTime(),
      expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString()
    };
    const serializedSession = JSON.stringify(session);

    PropertiesService.getScriptProperties().setProperty(SESSION_CACHE_PREFIX + token, serializedSession);
    try {
      CacheService
        .getScriptCache()
        .put(SESSION_CACHE_PREFIX + token, serializedSession, SESSION_CACHE_MAX_SECONDS);
    } catch (error) {
      // Cache is acceleration only; the authoritative property was committed.
    }

    return { token, expiresAt: session.expiresAt };
  } finally {
    lock.releaseLock();
  }
}

function cleanupExpiredSessions() {
  const properties = PropertiesService.getScriptProperties();
  const sessions = properties.getProperties();
  const now = Date.now();

  Object.keys(sessions).forEach((key) => {
    if (key.indexOf(SESSION_CACHE_PREFIX) !== 0) return;
    try {
      const session = JSON.parse(sessions[key]);
      if (Date.parse(session.expiresAt || "") > now) return;
    } catch (error) {
      // Invalid session records are removed below.
    }
    properties.deleteProperty(key);
    removeSessionCacheBestEffort(key);
  });
}

function auth01ResolvedSessionTarget(sessionKey, serializedSession, sessionRecord) {
  const target = Object.freeze({
    sessionPropertyKey: sessionKey,
    serializedSession,
    sessionRecord: Object.freeze(Object.assign({}, sessionRecord))
  });
  AUTH01_RESOLVED_SESSION_TARGETS.add(target);
  return target;
}

function readResolvedSessionTarget(token, options) {
  if (!isValidSessionToken(token)) return null;

  const strictReadOnly = !!(options && options.strictReadOnly);
  const sessionKey = SESSION_CACHE_PREFIX + token;
  let properties;
  let raw;

  try {
    properties = PropertiesService.getScriptProperties();
    // Script Properties is authoritative. A positive cache entry can never
    // resurrect a session whose durable property is absent.
    raw = properties.getProperty(sessionKey);
  } catch (error) {
    return null;
  }

  if (!raw) {
    if (!strictReadOnly) removeSessionCacheBestEffort(sessionKey);
    return null;
  }

  try {
    const session = JSON.parse(raw);
    const expiresAt = Date.parse(session.expiresAt || "");
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      if (!strictReadOnly) {
        try { properties.deleteProperty(sessionKey); } catch (error) {}
        removeSessionCacheBestEffort(sessionKey);
      }
      return null;
    }

    if (!strictReadOnly) {
      const remainingSeconds = Math.max(1, Math.floor((expiresAt - Date.now()) / 1000));
      try {
        CacheService.getScriptCache().put(
          sessionKey,
          raw,
          Math.min(remainingSeconds, SESSION_CACHE_MAX_SECONDS)
        );
      } catch (error) {
        // Cache is acceleration only; authoritative validation already passed.
      }
    }
    return auth01ResolvedSessionTarget(sessionKey, raw, session);
  } catch (error) {
    if (!strictReadOnly) {
      try { properties.deleteProperty(sessionKey); } catch (deleteError) {}
      removeSessionCacheBestEffort(sessionKey);
    }
    return null;
  }
}

function readSessionRecord(token) {
  const target = readResolvedSessionTarget(token);
  return target ? target.sessionRecord : null;
}

function revokeResolvedSession(authContext) {
  if (!authContext || typeof authContext !== "object" ||
      !AUTH01_RESOLVED_SESSION_TARGETS.has(authContext)) {
    return {
      ok: false,
      code: "AUTH_SESSION_CONTEXT_INVALID",
      targetProven: false,
      revoked: false,
      alreadyRevoked: false,
      cacheRemovalAttempted: false,
      cacheRemovalFailed: false
    };
  }

  const sessionKey = authContext.sessionPropertyKey;
  const resolvedRecord = authContext.serializedSession;
  if (typeof sessionKey !== "string" || sessionKey.indexOf(SESSION_CACHE_PREFIX) !== 0 ||
      typeof resolvedRecord !== "string" || !resolvedRecord) {
    return {
      ok: false,
      code: "AUTH_SESSION_CONTEXT_INVALID",
      targetProven: false,
      revoked: false,
      alreadyRevoked: false,
      cacheRemovalAttempted: false,
      cacheRemovalFailed: false
    };
  }

  let lock;
  try {
    lock = auth01AcquireScriptLock();
  } catch (error) {
    return {
      ok: false,
      code: "SESSION_REVOCATION_LOCK_UNAVAILABLE",
      targetProven: true,
      revoked: false,
      alreadyRevoked: false,
      cacheRemovalAttempted: false,
      cacheRemovalFailed: false
    };
  }

  try {
    const properties = PropertiesService.getScriptProperties();
    let existing;
    try {
      existing = properties.getProperty(sessionKey);
    } catch (error) {
      return {
        ok: false,
        code: "SESSION_PROPERTY_READ_FAILED",
        targetProven: true,
        revoked: false,
        alreadyRevoked: false,
        cacheRemovalAttempted: false,
        cacheRemovalFailed: false
      };
    }

    if (existing == null) {
      const cacheResult = removeSessionCacheBestEffort(sessionKey);
      return {
        ok: true,
        code: "ALREADY_REVOKED_CURRENT_SESSION",
        targetProven: true,
        revoked: false,
        alreadyRevoked: true,
        cacheRemovalAttempted: cacheResult.attempted,
        cacheRemovalFailed: cacheResult.failed
      };
    }

    if (existing !== resolvedRecord) {
      return {
        ok: false,
        code: "SESSION_TARGET_STATE_CHANGED",
        targetProven: true,
        revoked: false,
        alreadyRevoked: false,
        cacheRemovalAttempted: false,
        cacheRemovalFailed: false
      };
    }

    try {
      properties.deleteProperty(sessionKey);
    } catch (error) {
      return {
        ok: false,
        code: "SESSION_PROPERTY_DELETE_FAILED",
        targetProven: true,
        revoked: false,
        alreadyRevoked: false,
        cacheRemovalAttempted: false,
        cacheRemovalFailed: false
      };
    }

    try {
      if (properties.getProperty(sessionKey) != null) {
        return {
          ok: false,
          code: "SESSION_PROPERTY_DELETE_UNVERIFIED",
          targetProven: true,
          revoked: false,
          alreadyRevoked: false,
          cacheRemovalAttempted: false,
          cacheRemovalFailed: false
        };
      }
    } catch (error) {
      return {
        ok: false,
        code: "SESSION_PROPERTY_DELETE_UNVERIFIED",
        targetProven: true,
        revoked: false,
        alreadyRevoked: false,
        cacheRemovalAttempted: false,
        cacheRemovalFailed: false
      };
    }

    const cacheResult = removeSessionCacheBestEffort(sessionKey);
    return {
      ok: true,
      code: "REVOKED_CURRENT_SESSION",
      targetProven: true,
      revoked: true,
      alreadyRevoked: false,
      cacheRemovalAttempted: cacheResult.attempted,
      cacheRemovalFailed: cacheResult.failed
    };
  } finally {
    lock.releaseLock();
  }
}

function resolveAuthenticatedRequestContext(data, options) {
  const strictReadOnly = !!(options && options.strictReadOnly);
  const token = getSessionToken(data || {});
  const resolvedTarget = readResolvedSessionTarget(token, options);
  const session = resolvedTarget && resolvedTarget.sessionRecord;
  if (!session || !session.username) return null;

  const sessionUsername = auth01CanonicalUsername(session.username);
  const user = readUsersFromSheet().find(item =>
    auth01CanonicalUsername(item.username) === sessionUsername
  ) || null;
  if (!user) return null;

  const sessionEpoch = session.credentialEpoch == null ? 0 : Number(session.credentialEpoch);
  const currentFingerprint = auth01CurrentIdentifierFingerprint();
  if (typeof session.identifierKeyFingerprint !== "string" ||
      session.identifierKeyFingerprint !== currentFingerprint) {
    if (!strictReadOnly) revokeResolvedSession(resolvedTarget);
    return null;
  }
  const currentEpoch = auth01ReadCredentialEpoch(user.username);
  if (!Number.isSafeInteger(sessionEpoch) || sessionEpoch < 0 || sessionEpoch !== currentEpoch) {
    if (!strictReadOnly) revokeResolvedSession(resolvedTarget);
    return null;
  }

  const permissions = Object.freeze(normalizeManagedPermissions(user.username, user.permissions).slice());
  const authenticatedUser = Object.freeze({
    username: String(user.username || "").trim(),
    displayName: String(user.displayName || user.username || "").trim(),
    permissions
  });
  const authContext = Object.freeze({
    sessionPropertyKey: resolvedTarget.sessionPropertyKey,
    serializedSession: resolvedTarget.serializedSession,
    sessionRecord: resolvedTarget.sessionRecord,
    username: authenticatedUser.username,
    displayName: authenticatedUser.displayName,
    permissions,
    role: auth01CanonicalUsername(user.username) === "owner" ? "OWNER" : "USER",
    audience: "CUT_HUB_POS",
    branchScope: null,
    sessionMetadata: Object.freeze({
      createdAt: String(session.createdAt || ""),
      expiresAt: String(session.expiresAt || ""),
      credentialEpoch: sessionEpoch
    }),
    user: authenticatedUser
  });
  AUTH01_RESOLVED_SESSION_TARGETS.add(authContext);
  AUTH01_AUTHENTICATED_SESSION_CONTEXTS.add(authContext);
  return authContext;
}

