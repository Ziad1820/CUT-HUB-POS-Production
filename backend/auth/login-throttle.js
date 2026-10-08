const AUTH01_THROTTLE_GLOBAL_KEY = "AUTH01:RL:v1:G";
const AUTH01_THROTTLE_ACCOUNT_PREFIX = "AUTH01:RL:v1:A:";
const AUTH01_THROTTLE_CACHE_PREFIX = "AUTH01:RL:C:v1:";
const AUTH01_THROTTLE_RECOVERY_PREFIX = "AUTH01:RL:RECOVERY:v1:";
const AUTH01_THROTTLE_STATE_MAX_BYTES = 8192;
const AUTH01_THROTTLE_HISTORY_HORIZON_MS = 400 * 24 * 60 * 60 * 1000;
const AUTH01_THROTTLE_CLOCK_SKEW_MS = 5 * 60 * 1000;
// Availability/security guarantee: denied requests cannot extend blockedUntil,
// and every individual account/global cooldown is bounded by the configured
// maximum. Re-blocking requires a fresh full threshold of reserved failures in
// a newly opened window; one sparse request cannot perpetuate an existing block.
// This deliberately does NOT claim that a password-only endpoint can guarantee
// a legitimate caller a verification slot against a continuously active attacker
// who knows the same username and races every fresh budget. Without an additional
// trusted signal (for example a challenge/device factor), those callers are
// indistinguishable before password verification. That sustained-race condition
// is an explicit residual availability risk, not a throttle-state lockout.
// The AUTH-01 objective here is bounded application rate limiting with no
// attacker-extendable single-probe state and a hard bound on PBKDF2 work per
// window.
const AUTH01_THROTTLE_POLICY = Object.freeze({
  accountFailureThreshold: 5,
  accountWindowMs: 15 * 60 * 1000,
  accountInitialCooldownMs: 30 * 1000,
  accountMaximumCooldownMs: 15 * 60 * 1000,
  globalFailureThreshold: 100,
  globalUnknownFailureThreshold: 80,
  globalWindowMs: 5 * 60 * 1000,
  globalInitialCooldownMs: 60 * 1000,
  globalMaximumCooldownMs: 5 * 60 * 1000,
  reservationTtlMs: 2 * 60 * 1000,
  maximumReservations: 120
});

function auth01ThrottlePolicy(options) {
  const override = options && options.throttlePolicy;
  const policy = override ? Object.assign({}, AUTH01_THROTTLE_POLICY, override) : AUTH01_THROTTLE_POLICY;
  if (override && !Object.prototype.hasOwnProperty.call(override, "globalUnknownFailureThreshold")) {
    policy.globalUnknownFailureThreshold = Math.max(
      1, Math.min(policy.globalFailureThreshold, Math.floor(policy.globalFailureThreshold * 0.8))
    );
  }
  const positiveIntegers = [
    "accountFailureThreshold", "accountWindowMs", "accountInitialCooldownMs",
    "accountMaximumCooldownMs", "globalFailureThreshold", "globalUnknownFailureThreshold",
    "globalWindowMs", "globalInitialCooldownMs", "globalMaximumCooldownMs",
    "reservationTtlMs", "maximumReservations"
  ];
  if (positiveIntegers.some(key => !Number.isSafeInteger(policy[key]) || policy[key] < 1) ||
      policy.globalUnknownFailureThreshold > policy.globalFailureThreshold ||
      policy.accountInitialCooldownMs > policy.accountMaximumCooldownMs ||
      policy.globalInitialCooldownMs > policy.globalMaximumCooldownMs ||
      policy.maximumReservations < Math.max(policy.accountFailureThreshold, policy.globalFailureThreshold)) {
    throw auth01Error("AUTH01_THROTTLE_POLICY_INVALID", "Authentication throttle policy is invalid.");
  }
  return policy;
}

function auth01Now(options) {
  const now = options && typeof options.now === "function" ? Number(options.now()) : Date.now();
  if (!Number.isSafeInteger(now) || now < 0) {
    throw auth01Error("AUTH01_TIME_INVALID", "Authentication service time is invalid.");
  }
  return now;
}

function auth01ThrottleCache(options) {
  try {
    return options && options.cache ? options.cache : CacheService.getScriptCache();
  } catch (error) {
    return null;
  }
}

function auth01ThrottleLock(options) {
  const lock = options && typeof options.lockFactory === "function"
    ? options.lockFactory()
    : (options && options.lock ? options.lock : LockService.getScriptLock());
  if (!lock || typeof lock.tryLock !== "function" || !lock.tryLock(5000)) {
    throw auth01Error("AUTH01_THROTTLE_LOCK_UNAVAILABLE", "Authentication service is temporarily unavailable.");
  }
  return lock;
}

function auth01EmptyThrottleState(now, scope) {
  return {
    version: 1,
    scope,
    status: "OPEN",
    windowStartedAt: now,
    failures: 0,
    unknownFailures: 0,
    backoffLevel: 0,
    blockedUntil: 0,
    reservations: {},
    finalizations: {},
    updatedAt: now
  };
}

function auth01ThrottleInteger(value, minimum, maximum) {
  return Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}

function auth01ThrottleRecordIdValid(value) {
  return typeof value === "string" && /^[A-Za-z0-9._:-]{1,128}$/.test(value);
}

function auth01EncodeThrottleFinalization(outcome, finalizedAt) {
  return ({ failure: "F", success: "S", system: "E" })[outcome] + ":" + finalizedAt;
}

function auth01DecodeThrottleFinalization(value) {
  const match = /^([FSE]):([0-9]{1,16})$/.exec(String(value || ""));
  if (!match) return null;
  return {
    outcome: ({ F: "failure", S: "success", E: "system" })[match[1]],
    finalizedAt: Number(match[2])
  };
}

function auth01ValidateThrottleState(state, raw, now, scope, policy) {
  const expected = [
    "backoffLevel", "blockedUntil", "failures", "finalizations", "reservations",
    "scope", "status", "unknownFailures", "updatedAt", "version", "windowStartedAt"
  ];
  const maximumCooldown = scope === "GLOBAL"
    ? policy.globalMaximumCooldownMs : policy.accountMaximumCooldownMs;
  const maximumFailures = scope === "GLOBAL"
    ? policy.globalFailureThreshold : policy.accountFailureThreshold;
  if (!state || Array.isArray(state) || typeof state !== "object" || state.version !== 1 ||
      state.scope !== scope || ["OPEN", "BLOCKED"].indexOf(state.status) === -1 ||
      Object.keys(state).sort().join("|") !== expected.sort().join("|") ||
      typeof raw !== "string" || raw.length > AUTH01_THROTTLE_STATE_MAX_BYTES ||
      !auth01ThrottleInteger(state.windowStartedAt, 0, now + AUTH01_THROTTLE_CLOCK_SKEW_MS) ||
      state.windowStartedAt < Math.max(0, now - AUTH01_THROTTLE_HISTORY_HORIZON_MS) ||
      !auth01ThrottleInteger(state.updatedAt, state.windowStartedAt, now + AUTH01_THROTTLE_CLOCK_SKEW_MS) ||
      !auth01ThrottleInteger(state.failures, 0, maximumFailures) ||
      !auth01ThrottleInteger(state.unknownFailures, 0, state.failures) ||
      (scope === "ACCOUNT" && state.unknownFailures !== 0) ||
      (scope === "GLOBAL" && state.unknownFailures > policy.globalUnknownFailureThreshold) ||
      state.backoffLevel !== 0 ||
      !auth01ThrottleInteger(state.blockedUntil, 0, now + maximumCooldown) ||
      (state.status === "BLOCKED") !== (state.blockedUntil > 0) ||
      (state.blockedUntil && state.blockedUntil < state.updatedAt) ||
      !state.reservations || Array.isArray(state.reservations) || typeof state.reservations !== "object" ||
      !state.finalizations || Array.isArray(state.finalizations) || typeof state.finalizations !== "object") {
    throw auth01Error("AUTH01_THROTTLE_STATE_CORRUPT", "Authentication throttle state is invalid.");
  }
  const reservationIds = Object.keys(state.reservations);
  const finalizationIds = Object.keys(state.finalizations);
  const finalizationSet = {};
  finalizationIds.forEach(id => { finalizationSet[id] = true; });
  if (reservationIds.some(id => finalizationSet[id])) {
    throw auth01Error("AUTH01_THROTTLE_STATE_CORRUPT", "Authentication throttle reservation/finalization state overlaps.");
  }
  if (reservationIds.length > policy.maximumReservations ||
      finalizationIds.length > policy.maximumReservations ||
      reservationIds.length + finalizationIds.length > policy.maximumReservations) {
    throw auth01Error("AUTH01_THROTTLE_STATE_CORRUPT", "Authentication throttle state is invalid.");
  }
  reservationIds.forEach(id => {
    const item = state.reservations[id];
    if (!auth01ThrottleRecordIdValid(id) || !item || Array.isArray(item) ||
        Object.keys(item).sort().join("|") !== (scope === "GLOBAL" ? "expiresAt|kind" : "expiresAt") ||
        (scope === "GLOBAL" && ["K", "U"].indexOf(item.kind) === -1) ||
        !auth01ThrottleInteger(item.expiresAt, state.updatedAt, now + policy.reservationTtlMs)) {
      throw auth01Error("AUTH01_THROTTLE_STATE_CORRUPT", "Authentication throttle reservation is invalid.");
    }
  });
  finalizationIds.forEach(id => {
    const item = auth01DecodeThrottleFinalization(state.finalizations[id]);
    if (!auth01ThrottleRecordIdValid(id) || !item ||
        !auth01ThrottleInteger(item.finalizedAt, Math.max(0, now - AUTH01_THROTTLE_HISTORY_HORIZON_MS),
          now + AUTH01_THROTTLE_CLOCK_SKEW_MS)) {
      throw auth01Error("AUTH01_THROTTLE_STATE_CORRUPT", "Authentication throttle finalization is invalid.");
    }
  });
  return state;
}

function auth01NormalizeThrottleState(state, now, windowMs, scope, policy) {
  const retainedFinalizations = {};
  Object.keys(state.finalizations).forEach(id => {
    const finalization = auth01DecodeThrottleFinalization(state.finalizations[id]);
    if (finalization && finalization.finalizedAt + policy.reservationTtlMs > now) {
      retainedFinalizations[id] = state.finalizations[id];
    }
  });
  const blockExpired = state.status === "BLOCKED" && state.blockedUntil <= now;
  const windowExpired = now - state.windowStartedAt >= windowMs;
  if (blockExpired || (state.status === "OPEN" && windowExpired)) {
    state = auth01EmptyThrottleState(now, scope);
    state.finalizations = retainedFinalizations;
  } else {
    Object.keys(state.reservations).forEach(id => {
      if (state.reservations[id].expiresAt <= now) delete state.reservations[id];
    });
    state.finalizations = retainedFinalizations;
    state.updatedAt = now;
  }
  return state;
}

function auth01ThrottleRecoveryMarker(properties, key, code, now) {
  const markerKey = AUTH01_THROTTLE_RECOVERY_PREFIX + auth01Base64UrlEncode(
    auth01Sha256Bytes(auth01Utf8Bytes(key))
  );
  const marker = JSON.stringify({ version: 1, code: String(code), detectedAt: now });
  try { properties.setProperty(markerKey, marker); } catch (error) {}
}

function auth01ReadThrottleState(properties, key, now, windowMs, scope, policy, fallbackKey) {
  let raw;
  let sourceKey = key;
  try {
    raw = properties.getProperty(key);
    if ((raw == null || raw === "") && fallbackKey) {
      raw = properties.getProperty(fallbackKey);
      if (raw != null && raw !== "") sourceKey = fallbackKey;
    }
  } catch (error) {
    throw auth01Error("AUTH01_THROTTLE_STORE_UNAVAILABLE", "Authentication service is temporarily unavailable.");
  }
  if (raw == null || raw === "") return auth01EmptyThrottleState(now, scope);
  let parsed;
  try { parsed = JSON.parse(raw); } catch (error) {
    auth01ThrottleRecoveryMarker(properties, sourceKey, "MALFORMED_JSON", now);
    throw auth01Error("AUTH01_THROTTLE_STATE_CORRUPT", "Authentication throttle state is invalid.");
  }
  try {
    auth01ValidateThrottleState(parsed, raw, now, scope, policy);
  } catch (error) {
    auth01ThrottleRecoveryMarker(properties, sourceKey, error.code || "INVALID_SCHEMA", now);
    throw error;
  }
  return auth01NormalizeThrottleState(parsed, now, windowMs, scope, policy);
}

function auth01WriteThrottleState(properties, key, state, now, scope, policy) {
  try {
    const raw = JSON.stringify(state);
    auth01ValidateThrottleState(state, raw, now, scope, policy);
    properties.setProperty(key, raw);
  } catch (error) {
    if (error && error.code === "AUTH01_THROTTLE_STATE_CORRUPT") throw error;
    throw auth01Error("AUTH01_THROTTLE_STORE_UNAVAILABLE", "Authentication service is temporarily unavailable.");
  }
}

function auth01CacheKeyForProperty(propertyKey) {
  if (propertyKey === AUTH01_THROTTLE_GLOBAL_KEY) return AUTH01_THROTTLE_CACHE_PREFIX + "G";
  return AUTH01_THROTTLE_CACHE_PREFIX + "A:" + propertyKey.slice(AUTH01_THROTTLE_ACCOUNT_PREFIX.length);
}

function auth01CacheBlockedUntil(cache, propertyKey) {
  if (!cache) return 0;
  try { return Math.max(0, Number(cache.get(auth01CacheKeyForProperty(propertyKey))) || 0); }
  catch (error) { return 0; }
}

function auth01CacheBlock(cache, propertyKey, blockedUntil, now) {
  if (!cache || blockedUntil <= now) return;
  try {
    cache.put(
      auth01CacheKeyForProperty(propertyKey), String(blockedUntil),
      Math.max(1, Math.min(21600, Math.ceil((blockedUntil - now) / 1000)))
    );
  } catch (error) {
    // Cache is acceleration only; durable state remains authoritative.
  }
}

function auth01CacheClear(cache, propertyKey) {
  if (!cache) return;
  try { cache.remove(auth01CacheKeyForProperty(propertyKey)); } catch (error) {}
}

function auth01ApplyThrottleFailure(state, now, threshold, windowMs, initialCooldown, maximumCooldown, kind) {
  state.failures = Math.min(threshold, state.failures + 1);
  if (state.scope === "GLOBAL" && kind === "U") {
    state.unknownFailures = Math.min(state.failures, state.unknownFailures + 1);
  }
  if (state.failures < threshold) return;
  auth01StartThrottleCooldown(state, now, threshold, windowMs, initialCooldown, maximumCooldown);
}

function auth01StartThrottleCooldown(state, now, threshold, windowMs, initialCooldown, maximumCooldown) {
  state.backoffLevel = Math.min(32, Math.max(0, state.failures - threshold));
  const cooldown = Math.min(maximumCooldown, initialCooldown * Math.pow(2, state.backoffLevel));
  state.blockedUntil = Math.min(
    now + maximumCooldown,
    Math.max(now + cooldown, state.windowStartedAt + windowMs)
  );
  state.status = "BLOCKED";
}

function auth01ReserveLoginAttempt(knownUsername, options) {
  const policy = auth01ThrottlePolicy(options);
  const now = auth01Now(options);
  const properties = auth01ScriptProperties(options);
  const cache = auth01ThrottleCache(options);
  const accountKeys = knownUsername
    ? auth01VersionedIdentifierPropertyKeys(knownUsername, AUTH01_THROTTLE_ACCOUNT_PREFIX, options)
    : null;
  const accountKey = accountKeys ? accountKeys.activeKey : "";
  const accountLegacyKey = accountKeys ? accountKeys.legacyKey : "";
  const cacheKeys = [AUTH01_THROTTLE_GLOBAL_KEY].concat(accountKey ? [accountKey] : []);
  if (cacheKeys.some(key => auth01CacheBlockedUntil(cache, key) > now)) {
    return { allowed: false, reason: "COOLDOWN" };
  }
  const lock = auth01ThrottleLock(options);
  try {
    const globalState = auth01ReadThrottleState(
      properties, AUTH01_THROTTLE_GLOBAL_KEY, now, policy.globalWindowMs, "GLOBAL", policy
    );
    const accountState = accountKey
      ? auth01ReadThrottleState(
        properties, accountKey, now, policy.accountWindowMs, "ACCOUNT", policy, accountLegacyKey
      )
      : null;
    const globalInflight = Object.keys(globalState.reservations).length;
    const globalUnknownInflight = Object.keys(globalState.reservations)
      .filter(id => globalState.reservations[id].kind === "U").length;
    const accountInflight = accountState ? Object.keys(accountState.reservations).length : 0;
    const unknownLaneDenied = !accountKey &&
      globalState.unknownFailures + globalUnknownInflight >= policy.globalUnknownFailureThreshold;
    let globalDenied = globalState.status === "BLOCKED" ||
      globalInflight >= policy.maximumReservations ||
      globalState.failures + globalInflight >= policy.globalFailureThreshold;
    if (unknownLaneDenied && !globalDenied) {
      auth01WriteThrottleState(properties, AUTH01_THROTTLE_GLOBAL_KEY, globalState, now, "GLOBAL", policy);
      return { allowed: false, reason: "GLOBAL_UNKNOWN_LIMIT" };
    }
    if (globalDenied) {
      if (globalState.status !== "BLOCKED") {
        auth01StartThrottleCooldown(
          globalState, now, policy.globalFailureThreshold,
          policy.globalWindowMs,
          policy.globalInitialCooldownMs, policy.globalMaximumCooldownMs
        );
      }
      auth01WriteThrottleState(properties, AUTH01_THROTTLE_GLOBAL_KEY, globalState, now, "GLOBAL", policy);
      auth01CacheBlock(cache, AUTH01_THROTTLE_GLOBAL_KEY, globalState.blockedUntil, now);
      return { allowed: false, reason: "GLOBAL_LIMIT" };
    }
    let accountDenied = !!accountState && accountInflight >= policy.accountFailureThreshold;
    if (accountState && !accountDenied) {
      accountDenied = accountState.status === "BLOCKED" ||
        accountState.failures + accountInflight >= policy.accountFailureThreshold;
    }
    if (accountState && accountDenied) {
      if (accountState.status !== "BLOCKED") {
        auth01StartThrottleCooldown(
          accountState, now, policy.accountFailureThreshold,
          policy.accountWindowMs,
          policy.accountInitialCooldownMs, policy.accountMaximumCooldownMs
        );
      }
      auth01WriteThrottleState(properties, accountKey, accountState, now, "ACCOUNT", policy);
      auth01CacheBlock(cache, accountKey, accountState.blockedUntil, now);
      return { allowed: false, reason: "ACCOUNT_LIMIT" };
    }
    const reservationId = String((options && options.reservationId) || Utilities.getUuid());
    const expiresAt = now + policy.reservationTtlMs;
    if (!auth01ThrottleRecordIdValid(reservationId)) {
      throw auth01Error("AUTH01_THROTTLE_RESERVATION_INVALID", "Authentication service is temporarily unavailable.");
    }
    if (globalState.reservations[reservationId] || globalState.finalizations[reservationId] ||
        (accountState && (accountState.reservations[reservationId] || accountState.finalizations[reservationId]))) {
      throw auth01Error("AUTH01_THROTTLE_RESERVATION_COLLISION", "Authentication service is temporarily unavailable.");
    }
    globalState.reservations[reservationId] = { expiresAt, kind: accountKey ? "K" : "U" };
    auth01WriteThrottleState(properties, AUTH01_THROTTLE_GLOBAL_KEY, globalState, now, "GLOBAL", policy);
    if (accountState) {
      accountState.reservations[reservationId] = { expiresAt };
      auth01WriteThrottleState(properties, accountKey, accountState, now, "ACCOUNT", policy);
    }
    return { allowed: true, reservationId, accountKey, createdAt: now };
  } finally {
    lock.releaseLock();
  }
}

function auth01FinalizeLoginAttempt(reservation, outcome, options) {
  if (!reservation || !reservation.allowed || !reservation.reservationId) return;
  if (["failure", "success", "system"].indexOf(outcome) === -1) {
    throw auth01Error("AUTH01_THROTTLE_OUTCOME_INVALID", "Authentication service is temporarily unavailable.");
  }
  const policy = auth01ThrottlePolicy(options);
  const now = auth01Now(options);
  const properties = auth01ScriptProperties(options);
  const cache = auth01ThrottleCache(options);
  const lock = auth01ThrottleLock(options);
  try {
    const globalState = auth01ReadThrottleState(
      properties, AUTH01_THROTTLE_GLOBAL_KEY, now, policy.globalWindowMs, "GLOBAL", policy
    );
    const globalFinal = auth01DecodeThrottleFinalization(globalState.finalizations[reservation.reservationId]);
    if (globalFinal && globalFinal.outcome !== outcome) {
      throw auth01Error("AUTH01_THROTTLE_FINALIZATION_CONFLICT", "Authentication service is temporarily unavailable.");
    }
    const globalReservation = globalState.reservations[reservation.reservationId] || null;
    const globalReserved = !!globalReservation;
    if (!globalFinal && globalReserved) {
      delete globalState.reservations[reservation.reservationId];
      globalState.finalizations[reservation.reservationId] = auth01EncodeThrottleFinalization(outcome, now);
    }
    if (!globalFinal && globalReserved && outcome === "failure") {
      auth01ApplyThrottleFailure(
        globalState, now, policy.globalFailureThreshold,
        policy.globalWindowMs,
        policy.globalInitialCooldownMs, policy.globalMaximumCooldownMs,
        globalReservation.kind
      );
    }
    auth01WriteThrottleState(properties, AUTH01_THROTTLE_GLOBAL_KEY, globalState, now, "GLOBAL", policy);
    auth01CacheBlock(cache, AUTH01_THROTTLE_GLOBAL_KEY, globalState.blockedUntil, now);

    if (reservation.accountKey) {
      const accountState = auth01ReadThrottleState(
        properties, reservation.accountKey, now, policy.accountWindowMs, "ACCOUNT", policy
      );
      const accountFinal = auth01DecodeThrottleFinalization(accountState.finalizations[reservation.reservationId]);
      if (accountFinal && accountFinal.outcome !== outcome) {
        throw auth01Error("AUTH01_THROTTLE_FINALIZATION_CONFLICT", "Authentication service is temporarily unavailable.");
      }
      const accountReserved = !!accountState.reservations[reservation.reservationId];
      if (!accountFinal && accountReserved) {
        delete accountState.reservations[reservation.reservationId];
        accountState.finalizations[reservation.reservationId] = auth01EncodeThrottleFinalization(outcome, now);
        if (outcome === "success") {
          accountState.failures = 0;
          accountState.backoffLevel = 0;
          accountState.blockedUntil = 0;
          accountState.status = "OPEN";
          accountState.windowStartedAt = now;
          auth01CacheClear(cache, reservation.accountKey);
        } else if (outcome === "failure") {
          auth01ApplyThrottleFailure(
            accountState, now, policy.accountFailureThreshold,
            policy.accountWindowMs,
            policy.accountInitialCooldownMs, policy.accountMaximumCooldownMs
          );
        }
      }
      auth01WriteThrottleState(properties, reservation.accountKey, accountState, now, "ACCOUNT", policy);
      auth01CacheBlock(cache, reservation.accountKey, accountState.blockedUntil, now);
    }
  } catch (error) {
    if (error && /^AUTH01_/.test(String(error.code || ""))) throw error;
    throw auth01Error("AUTH01_THROTTLE_STORE_UNAVAILABLE", "Authentication service is temporarily unavailable.");
  } finally {
    lock.releaseLock();
  }
}

function auth01DummyModernCredential(options) {
  const policy = auth01CredentialPolicy(options);
  return auth01EncodeModernCredential(
    policy.iterations, new Array(16).fill(0), new Array(32).fill(0)
  );
}

function auth01RuntimeOptions() {
  // Production code has no request-controlled override. Unit/benchmark harnesses
  // may replace this function inside their isolated VM only.
  return null;
}

