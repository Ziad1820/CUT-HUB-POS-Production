function createWithdrawal(data) {
  const permissionError = requirePermission(data, "view_withdrawals", "You do not have permission to add withdrawals.");
  if (permissionError) return permissionError;

  const sheet = SpreadsheetApp.getActive().getSheetByName("WITHDRAWLS");
  if (!sheet) {
    return jsonOutput({ status: "error", message: "Sheet WITHDRAWLS not found" });
  }

  const withdrawalDate = data.date || getCairoDateKey();
  const lockedError = getLockedDateError(withdrawalDate, "Withdrawal");
  if (lockedError) {
    return jsonOutput({ status: "error", message: lockedError, locked: true });
  }

  sheet.appendRow([
    data.staffName || "",
    data.amount || 0,
    data.note || "",
    withdrawalDate,
    data.withdrawalId || ""
  ]);

  logActivity(
    data,
    "create",
    "withdrawal",
    data.withdrawalId || "",
    `Created withdrawal | Staff: ${data.staffName || "-"} | Amount: ${data.amount || 0} | Note: ${data.note || "-"}`
  );

  return jsonOutput({ status: "success" });
}

function getWithdrawals(data) {
  let range;
  try {
    range = getOptionalDateRange(data, null, true);
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
  const sheet = SpreadsheetApp.getActive().getSheetByName("WITHDRAWLS");
  if (!sheet || sheet.getLastRow() < 2) {
    return jsonOutput({ status: "success", withdrawals: [] });
  }

  const lastRow = sheet.getLastRow();
  const rows = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  const withdrawals = rows.map((row, index) => {
    const rowNumber = index + 2;
    const withdrawalId = row[4] || `WITHDRAWLS-${rowNumber}`;
    return {
      id: withdrawalId,
      withdrawalId,
      rowNumber,
      staffName: row[0] || "",
      staffCode: "",
      amount: parseSheetAmount(row[1]),
      note: row[2] || "",
      date: getDateKey(row[3], TIME_ZONE)
    };
  }).filter(withdrawal => isDateInOptionalRange(withdrawal.date, range)).reverse();

  return jsonOutput({ status: "success", withdrawals });
}

function deleteWithdrawal(data) {
  const permissionError = requirePermission(data, "view_withdrawals", "You do not have permission to delete withdrawals.");
  if (permissionError) return permissionError;

  const sheet = SpreadsheetApp.getActive().getSheetByName("WITHDRAWLS");
  if (!sheet) {
    return jsonOutput({ status: "error", message: "Sheet WITHDRAWLS not found" });
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return jsonOutput({ status: "error", message: "Withdrawal not found" });
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  const targetId = String(data.withdrawalId || "").trim();
  const targetName = String(data.staffName || "").trim();
  const targetAmount = parseSheetAmount(data.amount);
  const targetNote = String(data.note || "").trim();
  const targetDate = String(data.date || "").trim();

  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    const rowId = String(row[4] || "").trim();

    const idMatches = targetId && rowId && rowId === targetId;
    const fallbackMatches =
      String(row[0] || "").trim() === targetName &&
      parseSheetAmount(row[1]) === targetAmount &&
      String(row[2] || "").trim() === targetNote &&
      getDateKey(row[3], TIME_ZONE) === targetDate;

    if (idMatches || fallbackMatches) {
      const lockedError = getLockedDateError(row[3], "Withdrawal");
      if (lockedError) {
        return jsonOutput({ status: "error", message: lockedError, locked: true });
      }

      sheet.deleteRow(i + 2);

      logActivity(
        data,
        "delete",
        "withdrawal",
        rowId || targetId || `WITHDRAWLS-${i + 2}`,
        `Deleted withdrawal | Staff: ${row[0] || "-"} | Amount: ${row[1] || 0} | Note: ${row[2] || "-"}`
      );

      return jsonOutput({ status: "success" });
    }
  }

  return jsonOutput({ status: "error", message: "Withdrawal not found" });
}

