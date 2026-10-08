function getAuthenticatedUser(data) {
  const protectedContext = protectedReadContext(data);
  if (protectedContext) return protectedContext.user;
  // Registered reads must never fall back to the cleanup-capable resolver.
  if (data && protectedReadCapability(data.action)) return null;
  const authContext = resolveAuthenticatedRequestContext(data);
  return authContext ? authContext.user : null;
}

function getActor(data) {
  const user = getAuthenticatedUser(data || {});
  if (!user) {
    return { userName: "system", displayName: "system" };
  }

  return {
    userName: user.username,
    displayName: user.displayName || user.username
  };
}

function getActorPermissions(data) {
  const user = getAuthenticatedUser(data || {});
  return user ? normalizeManagedPermissions(user.username, user.permissions) : [];
}

function actorCanManageUsers(data) {
  const user = getAuthenticatedUser(data || {});
  return !!user && String(user.username || "").trim().toLowerCase() === "owner";
}

function actorHasPermission(data, permission) {
  const user = getAuthenticatedUser(data || {});
  if (!user) return false;
  if (String(user.username || "").trim().toLowerCase() === "owner") return true;

  return normalizeManagedPermissions(user.username, user.permissions).indexOf(permission) !== -1;
}

function requirePermission(data, permission, message) {
  const user = getAuthenticatedUser(data || {});
  if (!user) {
    return jsonOutput({
      status: "error",
      sessionExpired: true,
      authRequired: true,
      message: "Your session has expired. Please sign in again."
    });
  }

  const username = String(user.username || "").trim().toLowerCase();
  const permissions = normalizeManagedPermissions(user.username, user.permissions);
  if (username === "owner" || permissions.indexOf(permission) !== -1) {
    return null;
  }

  return jsonOutput({
    status: "error",
    code: "PERMISSION_DENIED",
    permissionDenied: true,
    message: message || "You do not have permission to perform this action."
  });
}

