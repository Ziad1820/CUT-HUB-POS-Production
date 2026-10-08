// Backend-owned foundations only. None of these capabilities enables replay.
const PROTECTED_READ_CAPABILITIES = Object.freeze(Object.fromEntries(
  ["getBookings", "getInternalBookingOptions", "staffTotalSales", "staffClientCount"]
    .map(action => [action, Object.freeze({
      protectedRead: true,
      authMode: "STRICT_READ_ONLY",
      persistentWritesAllowed: false,
      retryEligibilityFoundation: true,
      transportRetryEnabled: false,
      authCacheWritesAllowed: false,
      handlerCacheEffectsAllowed: action === "getInternalBookingOptions"
    })])
));
const PROTECTED_READ_CONTEXTS = new WeakMap();
const PROTECTED_READ_ACTORS = new WeakMap();

function protectedReadCapability(action) {
  return typeof action === "string" &&
    Object.prototype.hasOwnProperty.call(PROTECTED_READ_CAPABILITIES, action)
    ? PROTECTED_READ_CAPABILITIES[action] : null;
}

function protectedReadContext(data) {
  if (!data || typeof data !== "object") return null;
  const context = PROTECTED_READ_CONTEXTS.get(data);
  return context && context.action === data.action ? context : null;
}

function inheritProtectedReadContext(source, target) {
  const context = protectedReadContext(source);
  if (context && target && target.action === context.action) {
    PROTECTED_READ_CONTEXTS.set(target, context);
  }
  return target;
}

function protectedReadCachedActor(data) {
  const context = protectedReadContext(data);
  return context ? PROTECTED_READ_ACTORS.get(context) || null : null;
}

function protectedReadRememberActor(data, actor) {
  const context = protectedReadContext(data);
  if (!context) return actor;
  const trustedActor = Object.freeze(Object.assign({}, actor, {
    permissions: Object.freeze((actor.permissions || []).slice()),
    branchIds: Object.freeze((actor.branchIds || []).slice())
  }));
  PROTECTED_READ_ACTORS.set(context, trustedActor);
  return trustedActor;
}

function protectedReadUserEnabled(username) {
  // The legacy USERS contract has no enable flag. Honor optional explicit
  // account flags when present; never infer login status from STAFF.ACTIVE.
  const sheet = getUsersSheetReadOnly();
  const width = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, width).getValues()[0]
    .map(value => String(value || "").trim().toUpperCase());
  const flags = headers.map((name, index) => ({ name, index }))
    .filter(item => ["ACTIVE", "ENABLED", "DISABLED"].includes(item.name));
  if (!flags.length) return true;
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, width).getValues();
  const row = rows.find(item => auth01CanonicalUsername(item[0]) === auth01CanonicalUsername(username));
  if (!row) return false;
  return flags.every(({ name, index }) => {
    const value = String(row[index]).trim().toUpperCase();
    return name === "DISABLED" ? ["FALSE", "0", "NO"].includes(value)
      : ["TRUE", "1", "YES"].includes(value);
  });
}

function resolveProtectedReadAuthContext(data) {
  const capability = protectedReadCapability(data && data.action);
  if (!capability) return null;
  const authenticated = resolveAuthenticatedRequestContext(data, { strictReadOnly: true });
  if (!authenticated) return null;
  const security = auth01ReadSecurityState(authenticated);
  if (security.status !== "success" || security.authSecurityState !== "CLEAN_MODERN") {
    const error = new Error("A clean modern authentication state is required.");
    error.code = security.code || "AUTH_SECURITY_STATE_NOT_CLEAN";
    throw error;
  }
  if (!protectedReadUserEnabled(authenticated.username)) {
    const error = new Error("The authenticated account is disabled.");
    error.code = "USER_DISABLED";
    throw error;
  }
  // Keep session token/property/raw record out of the downstream capability.
  const context = Object.freeze({
    action: data.action,
    user: authenticated.user,
    permissions: authenticated.permissions,
    securityState: "CLEAN_MODERN",
    authMode: capability.authMode,
    retrySafeAuth: true,
    transportRetryEnabled: false
  });
  PROTECTED_READ_CONTEXTS.set(data, context);
  return context;
}

