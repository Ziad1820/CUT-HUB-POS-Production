const USERS_HEADER_CONTRACT = Object.freeze([
  Object.freeze({ name: "USERNAME", aliases: Object.freeze(["USERNAME"]) }),
  Object.freeze({ name: "PASSWORD", aliases: Object.freeze(["PASSWORD"]) }),
  Object.freeze({ name: "DISPLAY_NAME", aliases: Object.freeze(["DISPLAY_NAME", "DISPLAY NAME"]) }),
  Object.freeze({ name: "PERMISSIONS", aliases: Object.freeze(["PERMISSIONS"]) }),
  Object.freeze({ name: "CREATED_AT", aliases: Object.freeze(["CREATED_AT", "CREATED AT"]) }),
  Object.freeze({ name: "PASSWORD_HASH", aliases: Object.freeze(["PASSWORD_HASH", "PASSWORD HASH"]) })
]);

function getUsersSheet() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("USERS");
  if (!sheet) {
    throw new Error("Sheet USERS not found");
  }
  ensureUsersSheetColumns(sheet);
  return sheet;
}

function ensureUsersSheetColumns(sheet) {
  const requiredColumns = 6;
  const currentColumns = sheet.getMaxColumns();
  if (currentColumns < requiredColumns) {
    sheet.insertColumnsAfter(currentColumns, requiredColumns - currentColumns);
  }

  const hashHeader = String(sheet.getRange(1, 6).getValue() || "").trim();
  if (!hashHeader) {
    sheet.getRange(1, 6).setValue("PASSWORD_HASH");
  }
}

function getUsersSheetReadOnly() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("USERS");
  if (!sheet) {
    throw schemaContractError(
      "USERS_SCHEMA_NOT_READY", "Sheet USERS not found.", { sheetName: "USERS" });
  }
  inspectPositionalSheetSchema(sheet, {
    sheetName: "USERS",
    label: "USERS",
    contract: USERS_HEADER_CONTRACT,
    notReadyCode: "USERS_SCHEMA_NOT_READY",
    incompatibleCode: "USERS_SCHEMA_INCOMPATIBLE",
    duplicateCode: "USERS_SCHEMA_DUPLICATE_HEADERS"
  });
  return sheet;
}

function parsePermissions(value) {
  return String(value || "")
    .split(",")
    .map(permission => permission.trim())
    .filter(Boolean);
}

function stringifyPermissions(permissions) {
  return (Array.isArray(permissions) ? permissions : [])
    .map(permission => String(permission || "").trim())
    .filter(Boolean)
    .join(",");
}

function normalizeManagedPermissions(username, permissions) {
  if (String(username || "").trim().toLowerCase() === "owner") {
    return ALL_PERMISSIONS;
  }

  const normalized = (Array.isArray(permissions) ? permissions : [])
    .map(permission => String(permission || "").trim())
    .filter(permission => permission && permission !== "manage_users");
  if (normalized.includes("view_attendance") && !normalized.includes("attendance.view")) {
    normalized.push("attendance.view");
  }
  return normalized;
}

function sanitizeUser(user) {
  return {
    username: user.username,
    displayName: user.displayName,
    permissions: normalizeManagedPermissions(user.username, user.permissions)
  };
}

