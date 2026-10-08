function getUsersFromSheet(data) {
  try {
    if (!actorCanManageUsers(data || {})) {
      return jsonOutput({
        status: "error",
        message: "Only the system owner can view users."
      });
    }

    const users = readUsersFromSheet().map(sanitizeUser);
    return jsonOutput({ status: "success", users });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function loginUser(data) {
  let reservation = null;
  let finalized = false;
  const authRequestId = auth01RequestCorrelationId(data);
  const respond = payload => auth01CorrelatedJsonOutput(payload, authRequestId);
  try {
    const username = String(data.username || "");
    const password = String(data.password || "");
    const canonicalUsername = auth01CanonicalUsername(username);
    const users = readUsersFromSheet();
    if (auth01FindCanonicalUsernameCollisions(users).length) {
      throw auth01Error("AUTH01_USERNAME_COLLISION", "Authentication service is temporarily unavailable.");
    }
    let user = users.find(item => auth01CanonicalUsername(item.username) === canonicalUsername) || null;
    const runtimeOptions = auth01RuntimeOptions() || {};
    // Key continuity is a service-wide precondition, including unknown-user
    // attempts, so a broken identifier namespace cannot become an enumeration
    // oracle or create fresh epoch-zero state.
    auth01IdentifierKeyBytes(runtimeOptions);
    reservation = auth01ReserveLoginAttempt(user ? user.username : "", runtimeOptions);
    if (!reservation.allowed) {
      return respond({
        status: "error",
        message: "Invalid username or password."
      });
    }

    const verification = user
      ? auth01VerifyCredential(user, password, Object.assign({}, runtimeOptions, {
        allowLegacyPlaintext: !!runtimeOptions.allowLegacyPlaintext
      }))
      : auth01VerifyCredential(
        { password: "", passwordHash: auth01DummyModernCredential(runtimeOptions) },
        password,
        runtimeOptions
      );
    // Verification-class requests always pay at least one active-policy PBKDF2.
    // Throttle-denied requests are a separate class and perform no KDF. This
    // narrows user/credential-state timing without turning global denial into a
    // PBKDF2 amplification path.
    if (user && verification.state !== AUTH01_CREDENTIAL_STATES.MODERN_V1) {
      auth01RunDummyModernVerification(password, runtimeOptions);
    }
    if (!user || !verification.ok) {
      auth01FinalizeLoginAttempt(reservation, "failure", runtimeOptions);
      finalized = true;
      return respond({ status: "error", message: "Invalid username or password." });
    }
    if (verification.migrationEligible) {
      user = auth01MigrateCredential(user, password, verification, runtimeOptions);
    }
    auth01FinalizeLoginAttempt(reservation, "success", runtimeOptions);
    finalized = true;
    const session = createSessionForUser(user);

    logActivity(
      { sessionToken: session.token },
      "login",
      "system",
      user.username,
      `User logged in: ${user.displayName || user.username}`
    );

    return respond({
      status: "success",
      user: sanitizeUser(user),
      sessionToken: session.token,
      expiresAt: session.expiresAt,
      sessionCreated: true
    });
  } catch (error) {
    if (reservation && reservation.allowed && !finalized) {
      try { auth01FinalizeLoginAttempt(reservation, "system", auth01RuntimeOptions() || {}); }
      catch (finalizeError) {}
    }
    if (error && /^USERS_SCHEMA_/.test(String(error.code || ""))) {
      return respond({
        status: "error",
        code: "AUTHENTICATION_SERVICE_UNAVAILABLE",
        message: "Authentication service is temporarily unavailable."
      });
    }
    if (error && /^AUTH01_/.test(String(error.code || ""))) {
      return respond({
        status: "error",
        code: "AUTHENTICATION_SERVICE_UNAVAILABLE",
        message: "Authentication service is temporarily unavailable."
      });
    }
    return respond({ status: "error", message: "Authentication service is temporarily unavailable." });
  }
}

function logoutUser(data, authContext) {
  const request = data || {};
  const authRequestId = auth01RequestCorrelationId(request);
  const respond = payload => auth01CorrelatedJsonOutput(payload, authRequestId);
  const contextValid = !!authContext && AUTH01_AUTHENTICATED_SESSION_CONTEXTS.has(authContext);
  const revocation = contextValid ? revokeResolvedSession(authContext) : {
    ok: false,
    code: "INVALID_OR_UNKNOWN_SESSION",
    targetProven: false,
    revoked: false,
    alreadyRevoked: false,
    cacheRemovalAttempted: false,
    cacheRemovalFailed: false
  };

  if (contextValid && !revocation.ok) {
    return respond({
      status: "error",
      code: "LOGOUT_NOT_COMPLETED",
      logoutAccepted: false,
      clientCleanupAllowed: false
    });
  }

  if (contextValid && (revocation.revoked || revocation.alreadyRevoked)) {
    try {
      logActivity(
        {},
        "logout",
        "system",
        authContext.username,
        `User logged out: ${authContext.displayName || authContext.username}`
      );
    } catch (error) {
      Logger.log("Logout activity log failed: " + error.message);
    }
  }

  // Outward logout responses are deliberately uniform. They authorize local
  // credential cleanup but do not disclose whether a session existed or claim
  // that a server-side deletion was confirmed.
  return respond({
    status: "success",
    logoutAccepted: true,
    clientCleanupAllowed: true
  });
}

function createUserInSheet(data) {
  try {
    if (!actorCanManageUsers(data || {})) {
      return jsonOutput({
        status: "error",
        message: "Only the system owner can create users."
      });
    }

    const sheet = getUsersSheet();
    const username = String(data.username || "").trim();
    const password = String(data.password || "");
    const displayName = String(data.displayName || "").trim() || username;
    const permissions = Array.isArray(data.permissions) ? data.permissions : [];

    if (!username || !password || !displayName) {
      return jsonOutput({
        status: "error",
        message: "Please enter display name, username, and password."
      });
    }

    const users = readUsersFromSheet();
    if (users.some(user => auth01CanonicalUsername(user.username) === auth01CanonicalUsername(username))) {
      return jsonOutput({
        status: "error",
        message: "Username already exists."
      });
    }

    const finalPermissions = normalizeManagedPermissions(username, permissions);

    sheet.appendRow([
      username,
      "",
      displayName,
      stringifyPermissions(finalPermissions),
      getCairoDateKey(),
      createModernCredential(password, auth01RuntimeOptions() || undefined)
    ]);
    SpreadsheetApp.flush();
    const persistedRow = sheet.getLastRow();
    const persisted = sheet.getRange(persistedRow, 1, 1, 6).getValues()[0];
    const persistedUser = {
      username: String(persisted[0] || "").trim(),
      password: String(persisted[1] || ""),
      passwordHash: String(persisted[5] || "").trim()
    };
    if (auth01CanonicalUsername(persistedUser.username) !== auth01CanonicalUsername(username) ||
        persistedUser.password !== "" ||
        !auth01VerifyCredential(persistedUser, password, auth01RuntimeOptions() || undefined).ok) {
      throw auth01Error("AUTH01_USER_CREATE_WRITE_UNPROVEN", "User credential write could not be verified.");
    }

    logActivity(
      data,
      "create",
      "user",
      username,
      `Created user: ${displayName} (${username})`
    );

    return jsonOutput({
      status: "success",
      user: {
        username,
        displayName,
        permissions: finalPermissions
      }
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function updateUserInSheet(data) {
  try {
    if (!actorCanManageUsers(data || {})) {
      return jsonOutput({
        status: "error",
        message: "Only the system owner can update users."
      });
    }

    const sheet = getUsersSheet();
    const username = String(data.username || "").trim();

    if (!username) {
      return jsonOutput({ status: "error", message: "User name is required" });
    }

    const users = readUsersFromSheet();
    const user = users.find(item => item.username === username);

    if (!user) {
      return jsonOutput({ status: "error", message: "User not found." });
    }

    const oldDisplayName = user.displayName;
    const displayName = String(data.displayName || user.displayName).trim() || username;
    const password = String(data.password || "");
    const permissions = normalizeManagedPermissions(
      username,
      Array.isArray(data.permissions) ? data.permissions : user.permissions
    );

    if (password) auth01ReplaceCredential(
      user, password, Object.assign({}, auth01RuntimeOptions() || {}, { sheet })
    );
    sheet.getRange(user.rowNumber, 3, 1, 2).setValues([[
      displayName,
      stringifyPermissions(permissions)
    ]]);

    logActivity(
      data,
      "update",
      "user",
      username,
      `Updated user: ${oldDisplayName || username} -> ${displayName}`
    );

    return jsonOutput({
      status: "success",
      user: {
        username,
        displayName,
        permissions
      }
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function deleteUserFromSheet(data) {
  try {
    if (!actorCanManageUsers(data || {})) {
      return jsonOutput({
        status: "error",
        message: "Only the system owner can delete users."
      });
    }

    const sheet = getUsersSheet();
    const username = String(data.username || "").trim();

    if (username === "owner") {
      return jsonOutput({
        status: "error",
        message: "System owner cannot be deleted."
      });
    }

    const users = readUsersFromSheet();
    const user = users.find(item => item.username === username);

    if (!user) {
      return jsonOutput({ status: "error", message: "User not found." });
    }

    sheet.deleteRow(user.rowNumber);

    logActivity(
      data,
      "delete",
      "user",
      username,
      `Deleted user: ${user.displayName || username} (${username})`
    );

    return jsonOutput({ status: "success" });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

