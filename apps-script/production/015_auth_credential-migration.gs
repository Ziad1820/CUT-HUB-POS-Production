function resetOwnerPasswordEmergency() {
  const NEW_OWNER_PASSWORD = "change-this-password";
  if (NEW_OWNER_PASSWORD === "change-this-password") {
    throw new Error("Set NEW_OWNER_PASSWORD before running resetOwnerPasswordEmergency.");
  }

  const sheet = getUsersSheet();
  const users = readUsersFromSheet();
  const owner = users.find(user => String(user.username || "").trim().toLowerCase() === "owner");

  if (!owner) {
    throw new Error("Owner user was not found in USERS sheet.");
  }

  auth01ReplaceCredential(owner, NEW_OWNER_PASSWORD, Object.assign({}, auth01RuntimeOptions() || {}, { sheet }));
  Logger.log("Owner password was reset successfully.");
}

function readUsersFromSheet() {
  const sheet = getUsersSheetReadOnly();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) return [];

  const width = Math.max(6, sheet.getLastColumn());
  const headers = sheet.getRange(1, 1, 1, width).getValues()[0].map((value) =>
    String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_"));
  const preparationIndex = headers.indexOf("PREPARATION_MINUTES");
  const cleanupIndex = headers.indexOf("CLEANUP_MINUTES");
  const rows = sheet.getRange(2, 1, lastRow - 1, width).getValues();

  return rows
    .map((row, index) => ({
      rowNumber: index + 2,
      username: String(row[0] || "").trim(),
      password: String(row[1] || ""),
      displayName: String(row[2] || "").trim(),
      permissions: parsePermissions(row[3]),
      createdAt: row[4],
      passwordHash: String(row[5] || "").trim()
    }))
    .filter(user => user.username);
}

function auth01AcquireScriptLock(options) {
  const lock = options && options.lock ? options.lock : LockService.getScriptLock();
  if (!lock || typeof lock.tryLock !== "function" || !lock.tryLock(30000)) {
    throw auth01Error("AUTH01_LOCK_UNAVAILABLE", "Authentication service is temporarily unavailable.");
  }
  return lock;
}

function auth01FindCurrentUser(expected) {
  const canonical = auth01CanonicalUsername(expected && expected.username);
  return readUsersFromSheet().find(user =>
    user.rowNumber === Number(expected && expected.rowNumber) &&
    auth01CanonicalUsername(user.username) === canonical
  ) || null;
}

function auth01CredentialCells(sheet, rowNumber) {
  return {
    password: String(sheet.getRange(rowNumber, 2).getValue() || ""),
    passwordHash: String(sheet.getRange(rowNumber, 6).getValue() || "").trim()
  };
}

function auth01WriteMigrationJournal(properties, key, record) {
  const now = new Date().toISOString();
  const safe = {
    version: 1,
    requestId: String(record.requestId || ""),
    opaqueUserId: String(record.opaqueUserId || ""),
    rowNumber: Number(record.rowNumber || 0),
    sourceState: String(record.sourceState || ""),
    targetState: AUTH01_CREDENTIAL_STATES.MODERN_V1,
    status: String(record.status || "PREPARED"),
    phase: String(record.phase || "PREPARED"),
    createdAt: String(record.createdAt || now),
    updatedAt: now,
    recoveryRequired: !!record.recoveryRequired
  };
  const serialized = JSON.stringify(safe);
  if (serialized.length > AUTH01_MIGRATION_JOURNAL_POLICY.maximumSerializedBytes) {
    throw auth01Error("AUTH01_MIGRATION_JOURNAL_TOO_LARGE", "Migration recovery state is invalid.");
  }
  properties.setProperty(key, serialized);
  return safe;
}

function auth01ParseMigrationJournal(raw, now) {
  let journal;
  try { journal = JSON.parse(String(raw || "")); } catch (error) {
    throw auth01Error("AUTH01_MIGRATION_JOURNAL_CORRUPT", "Migration recovery state is invalid.");
  }
  const expected = [
    "createdAt", "opaqueUserId", "phase", "recoveryRequired", "requestId", "rowNumber",
    "sourceState", "status", "targetState", "updatedAt", "version"
  ];
  if (!journal || Array.isArray(journal) || typeof journal !== "object" ||
      Object.keys(journal).sort().join("|") !== expected.sort().join("|") || journal.version !== 1 ||
      ["PREPARED", "APPLYING", "RECOVERY_REQUIRED", "COMMITTED", "ABORTED"].indexOf(journal.status) === -1 ||
      typeof journal.phase !== "string" || journal.phase.length > 64 ||
      typeof journal.requestId !== "string" || !/^[A-Za-z0-9._:-]{1,128}$/.test(journal.requestId) ||
      typeof journal.opaqueUserId !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(journal.opaqueUserId) ||
      !Number.isSafeInteger(journal.rowNumber) || journal.rowNumber < 2 ||
      Object.keys(AUTH01_CREDENTIAL_STATES).map(key => AUTH01_CREDENTIAL_STATES[key])
        .indexOf(journal.sourceState) === -1 ||
      journal.targetState !== AUTH01_CREDENTIAL_STATES.MODERN_V1 ||
      typeof journal.recoveryRequired !== "boolean" ||
      journal.recoveryRequired !== (journal.status === "RECOVERY_REQUIRED")) {
    throw auth01Error("AUTH01_MIGRATION_JOURNAL_CORRUPT", "Migration recovery state is invalid.");
  }
  const createdAt = Date.parse(journal.createdAt);
  const updatedAt = Date.parse(journal.updatedAt);
  if (!Number.isFinite(createdAt) || !Number.isFinite(updatedAt) || createdAt > updatedAt ||
      createdAt < AUTH01_MIGRATION_JOURNAL_POLICY.earliestValidTimestampMs ||
      updatedAt > now + 5 * 60 * 1000) {
    throw auth01Error("AUTH01_MIGRATION_JOURNAL_CORRUPT", "Migration recovery state is invalid.");
  }
  return journal;
}

function auth01MigrationJournalSnapshot(options) {
  const properties = auth01ScriptProperties(options);
  const now = auth01Now(options);
  let all;
  try { all = properties.getProperties(); } catch (error) {
    throw auth01Error("AUTH01_MIGRATION_JOURNAL_STORE_UNAVAILABLE", "Migration recovery inventory is unavailable.");
  }
  const keys = Object.keys(all).filter(key => key.indexOf(AUTH01_MIGRATION_PREFIX) === 0).sort();
  const items = [];
  const counts = { total: keys.length, unresolved: 0, recoveryRequired: 0, malformed: 0, terminal: 0 };
  keys.forEach(key => {
    try {
      const journal = auth01ParseMigrationJournal(all[key], now);
      const unresolved = ["PREPARED", "APPLYING", "RECOVERY_REQUIRED"].indexOf(journal.status) !== -1;
      const terminal = journal.status === "COMMITTED" || journal.status === "ABORTED";
      if (unresolved) counts.unresolved += 1;
      if (journal.status === "RECOVERY_REQUIRED") counts.recoveryRequired += 1;
      if (terminal) counts.terminal += 1;
      items.push({
        key, status: journal.status, phase: journal.phase, updatedAt: journal.updatedAt,
        attentionRequired: unresolved && (journal.status === "RECOVERY_REQUIRED" ||
          now - Date.parse(journal.updatedAt) >= AUTH01_MIGRATION_JOURNAL_POLICY.attentionAfterMs),
        malformed: false, terminal
      });
    } catch (error) {
      counts.malformed += 1;
      items.push({ key, status: "MALFORMED", attentionRequired: true, malformed: true, terminal: false });
    }
  });
  return { properties, now, keys, items, counts };
}

function auth01MigrationJournalInventory(options) {
  const snapshot = auth01MigrationJournalSnapshot(options);
  const maximumScan = Math.min(
    AUTH01_MIGRATION_JOURNAL_POLICY.maximumInventoryScan,
    Math.max(1, Number(options && options.maximumScan) || AUTH01_MIGRATION_JOURNAL_POLICY.maximumInventoryScan)
  );
  const start = Math.max(0, Number(options && options.inventoryOffset) || 0);
  const pageSize = Math.min(
    AUTH01_MIGRATION_JOURNAL_POLICY.inventoryPageSize, maximumScan,
    Math.max(1, Number(options && options.inventoryPageSize) || AUTH01_MIGRATION_JOURNAL_POLICY.inventoryPageSize)
  );
  const inventory = snapshot.items.slice(start, start + pageSize);
  inventory.total = snapshot.counts.total;
  inventory.unresolved = snapshot.counts.unresolved;
  inventory.recoveryRequired = snapshot.counts.recoveryRequired;
  inventory.malformed = snapshot.counts.malformed;
  inventory.overflow = Math.max(0, snapshot.counts.total - (start + inventory.length));
  inventory.nextOffset = start + inventory.length < snapshot.counts.total ? start + inventory.length : null;
  return inventory;
}

function auth01CleanupTerminalMigrationJournals(options) {
  const snapshot = auth01MigrationJournalSnapshot(options);
  let deleted = 0;
  for (let index = 0; index < snapshot.items.length; index++) {
    const item = snapshot.items[index];
    if (deleted >= AUTH01_MIGRATION_JOURNAL_POLICY.maximumCleanupBatch) break;
    if (item.malformed || !item.terminal) continue;
    const journal = auth01ParseMigrationJournal(snapshot.properties.getProperty(item.key), snapshot.now);
    if (snapshot.now - Date.parse(journal.updatedAt) >= AUTH01_MIGRATION_JOURNAL_POLICY.terminalRetentionMs) {
      snapshot.properties.deleteProperty(item.key);
      deleted += 1;
    }
  }
  return {
    scanned: snapshot.items.length, deleted, retained: snapshot.items.length - deleted,
    totalBefore: snapshot.counts.total, overflow: Math.max(0, snapshot.counts.total - AUTH01_MIGRATION_JOURNAL_POLICY.maximumInventoryScan)
  };
}

function auth01EnsureMigrationJournalAdmission(options) {
  let snapshot = auth01MigrationJournalSnapshot(options);
  if (snapshot.counts.malformed > 0) {
    throw auth01Error("AUTH01_MIGRATION_JOURNAL_ATTENTION_REQUIRED", "Migration recovery state requires operator attention.");
  }
  const policy = AUTH01_MIGRATION_JOURNAL_POLICY;
  const needsCapacity = snapshot.counts.total >= policy.maximumTotalJournals;
  if (needsCapacity && snapshot.counts.terminal > 0) {
    auth01CleanupTerminalMigrationJournals(options);
    snapshot = auth01MigrationJournalSnapshot(options);
  }
  if (snapshot.counts.total >= policy.maximumTotalJournals ||
      snapshot.counts.unresolved >= policy.maximumUnresolvedJournals ||
      snapshot.counts.recoveryRequired >= policy.maximumRecoveryRequiredJournals) {
    throw auth01Error("AUTH01_MIGRATION_JOURNAL_CAPACITY_EXHAUSTED", "Migration recovery capacity is unavailable.");
  }
  return snapshot.counts;
}

function auth01MigrationResultUser(current, modernCredential) {
  return Object.assign({}, current, { password: "", passwordHash: modernCredential });
}

function auth01MigrateCredential(user, password, verification, options) {
  if (!verification || !verification.ok ||
      [AUTH01_CREDENTIAL_STATES.LEGACY_SHA256, AUTH01_CREDENTIAL_STATES.LEGACY_PLAINTEXT]
        .indexOf(verification.state) === -1) {
    throw auth01Error("AUTH01_MIGRATION_SOURCE_INVALID", "Credential migration source is invalid.");
  }
  const modernCredential = createModernCredential(password, options);
  const lock = auth01AcquireScriptLock(options);
  const properties = auth01ScriptProperties(options);
  const requestId = String((options && options.requestId) || Utilities.getUuid());
  const journalKey = AUTH01_MIGRATION_PREFIX + requestId;
  const sheet = options && options.sheet ? options.sheet : getUsersSheet();
  let journal = null;
  let current = null;
  try {
    current = auth01FindCurrentUser(user);
    if (!current) throw auth01Error("AUTH01_MIGRATION_ROW_CHANGED", "Credential row changed before migration.");
    const currentClassification = auth01ClassifyCredential(current, options);
    if (currentClassification.state === AUTH01_CREDENTIAL_STATES.MODERN_V1) {
      const committed = auth01VerifyCredential(current, password, options);
      if (!committed.ok) throw auth01Error("AUTH01_MIGRATION_ROW_CHANGED", "Credential changed before migration.");
      if (currentClassification.plaintextResidue) {
        sheet.getRange(current.rowNumber, 2).setValue("");
        SpreadsheetApp.flush();
        if (auth01CredentialCells(sheet, current.rowNumber).password !== "") {
          throw auth01Error("AUTH01_MIGRATION_RECOVERY_REQUIRED", "Plaintext cleanup requires recovery.");
        }
      }
      return auth01MigrationResultUser(current, current.passwordHash);
    }
    if (currentClassification.state !== verification.state ||
        current.passwordHash !== String(user.passwordHash || "") ||
        current.password !== String(user.password || "")) {
      throw auth01Error("AUTH01_MIGRATION_ROW_CHANGED", "Credential row changed before migration.");
    }

    auth01EnsureMigrationJournalAdmission(options);
    journal = auth01WriteMigrationJournal(properties, journalKey, {
      requestId,
      opaqueUserId: auth01OpaqueUserId(current.username, options),
      rowNumber: current.rowNumber,
      sourceState: currentClassification.state,
      status: "APPLYING",
      phase: "PREPARED"
    });
    sheet.getRange(current.rowNumber, 6).setValue(modernCredential);
    SpreadsheetApp.flush();
    let cells = auth01CredentialCells(sheet, current.rowNumber);
    if (cells.passwordHash !== modernCredential) {
      if (cells.passwordHash === current.passwordHash && cells.password === current.password) {
        properties.deleteProperty(journalKey);
        throw auth01Error("AUTH01_MIGRATION_WRITE_FAILED", "Credential migration did not start.");
      }
      auth01WriteMigrationJournal(properties, journalKey, Object.assign({}, journal, {
        status: "RECOVERY_REQUIRED", phase: "HASH_WRITE_UNPROVEN", recoveryRequired: true
      }));
      throw auth01Error("AUTH01_MIGRATION_RECOVERY_REQUIRED", "Credential migration requires recovery.");
    }
    journal = auth01WriteMigrationJournal(properties, journalKey, Object.assign({}, journal, {
      status: "APPLYING", phase: "MODERN_HASH_VERIFIED"
    }));
    sheet.getRange(current.rowNumber, 2).setValue("");
    SpreadsheetApp.flush();
    cells = auth01CredentialCells(sheet, current.rowNumber);
    if (cells.passwordHash !== modernCredential || cells.password !== "") {
      auth01WriteMigrationJournal(properties, journalKey, Object.assign({}, journal, {
        status: "RECOVERY_REQUIRED", phase: "PLAINTEXT_CLEAR_UNPROVEN", recoveryRequired: true
      }));
      throw auth01Error("AUTH01_MIGRATION_RECOVERY_REQUIRED", "Credential migration requires recovery.");
    }
    const persisted = auth01VerifyCredential(
      auth01MigrationResultUser(current, modernCredential), password, options
    );
    if (!persisted.ok) {
      auth01WriteMigrationJournal(properties, journalKey, Object.assign({}, journal, {
        status: "RECOVERY_REQUIRED", phase: "POST_WRITE_VERIFY_FAILED", recoveryRequired: true
      }));
      throw auth01Error("AUTH01_MIGRATION_RECOVERY_REQUIRED", "Credential migration requires recovery.");
    }
    properties.deleteProperty(journalKey);
    return auth01MigrationResultUser(current, modernCredential);
  } catch (error) {
    if (!journal || error.code === "AUTH01_MIGRATION_RECOVERY_REQUIRED") throw error;
    let cells = null;
    try { cells = current ? auth01CredentialCells(sheet, current.rowNumber) : null; } catch (readError) {}
    if (cells && cells.passwordHash === modernCredential && cells.password === "") {
      properties.deleteProperty(journalKey);
      return auth01MigrationResultUser(current, modernCredential);
    }
    if (cells && cells.passwordHash === current.passwordHash && cells.password === current.password) {
      properties.deleteProperty(journalKey);
      throw error;
    }
    auth01WriteMigrationJournal(properties, journalKey, Object.assign({}, journal, {
      status: "RECOVERY_REQUIRED", phase: "UNEXPECTED_FAILURE", recoveryRequired: true
    }));
    throw auth01Error("AUTH01_MIGRATION_RECOVERY_REQUIRED", "Credential migration requires recovery.");
  } finally {
    lock.releaseLock();
  }
}

function auth01ReplaceCredential(user, password, options) {
  const modernCredential = createModernCredential(password, options);
  const lock = auth01AcquireScriptLock(options);
  const properties = auth01ScriptProperties(options);
  const requestId = String((options && options.requestId) || Utilities.getUuid());
  const journalKey = AUTH01_MIGRATION_PREFIX + requestId;
  const sheet = options && options.sheet ? options.sheet : getUsersSheet();
  let journal = null;
  let current = null;
  try {
    current = auth01FindCurrentUser(user);
    if (!current) throw auth01Error("AUTH01_PASSWORD_CHANGE_ROW_CHANGED", "Credential row changed before password update.");
    auth01EnsureMigrationJournalAdmission(options);
    journal = auth01WriteMigrationJournal(properties, journalKey, {
      requestId,
      opaqueUserId: auth01OpaqueUserId(current.username, options),
      rowNumber: current.rowNumber,
      sourceState: auth01ClassifyCredential(current, options).state,
      status: "APPLYING",
      phase: "PREPARED"
    });
    const credentialEpoch = auth01IncrementCredentialEpoch(current.username, options);
    journal = auth01WriteMigrationJournal(properties, journalKey, Object.assign({}, journal, {
      status: "APPLYING", phase: "EPOCH_INCREMENTED"
    }));
    sheet.getRange(current.rowNumber, 6).setValue(modernCredential);
    SpreadsheetApp.flush();
    let cells = auth01CredentialCells(sheet, current.rowNumber);
    if (cells.passwordHash !== modernCredential) {
      if (cells.passwordHash === current.passwordHash && cells.password === current.password) {
        properties.deleteProperty(journalKey);
        throw auth01Error("AUTH01_PASSWORD_CHANGE_WRITE_FAILED", "Password update did not start.");
      }
      auth01WriteMigrationJournal(properties, journalKey, Object.assign({}, journal, {
        status: "RECOVERY_REQUIRED", phase: "HASH_WRITE_UNPROVEN", recoveryRequired: true
      }));
      throw auth01Error("AUTH01_MIGRATION_RECOVERY_REQUIRED", "Password update requires recovery.");
    }
    sheet.getRange(current.rowNumber, 2).setValue("");
    SpreadsheetApp.flush();
    cells = auth01CredentialCells(sheet, current.rowNumber);
    const updated = auth01MigrationResultUser(current, modernCredential);
    if (cells.password !== "" || cells.passwordHash !== modernCredential ||
        !auth01VerifyCredential(updated, password, options).ok) {
      auth01WriteMigrationJournal(properties, journalKey, Object.assign({}, journal, {
        status: "RECOVERY_REQUIRED", phase: "POST_WRITE_VERIFY_FAILED", recoveryRequired: true
      }));
      throw auth01Error("AUTH01_MIGRATION_RECOVERY_REQUIRED", "Password update requires recovery.");
    }
    properties.deleteProperty(journalKey);
    return { user: updated, credentialEpoch };
  } catch (error) {
    if (!journal || error.code === "AUTH01_MIGRATION_RECOVERY_REQUIRED") throw error;
    let cells = null;
    try { cells = current ? auth01CredentialCells(sheet, current.rowNumber) : null; } catch (readError) {}
    if (cells && cells.passwordHash === modernCredential && cells.password === "") {
      properties.deleteProperty(journalKey);
      return {
        user: auth01MigrationResultUser(current, modernCredential),
        credentialEpoch: auth01ReadCredentialEpoch(current.username, options)
      };
    }
    if (cells && cells.passwordHash === current.passwordHash && cells.password === current.password) {
      properties.deleteProperty(journalKey);
      throw error;
    }
    auth01WriteMigrationJournal(properties, journalKey, Object.assign({}, journal, {
      status: "RECOVERY_REQUIRED", phase: "UNEXPECTED_FAILURE", recoveryRequired: true
    }));
    throw auth01Error("AUTH01_MIGRATION_RECOVERY_REQUIRED", "Password update requires recovery.");
  } finally {
    lock.releaseLock();
  }
}

