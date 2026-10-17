function createWithdrawal(data) {
  const permissionError = requirePermission(data, "view_withdrawals", "You do not have permission to add withdrawals.");
  if (permissionError) return permissionError;
  return appendFinanceOnce(data, "WITHDRAWLS", [data.staffName || "", data.amount, data.note || "", data.date || getCairoDateKey(), String(data.withdrawalId || "").trim()], "Withdrawal");
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
  const rows = readFinanceRows(sheet, 6);
  const withdrawals = rows.map((row, index) => {
    const rowNumber = index + 2;
    const withdrawalId = row[4] || `WITHDRAWLS-${rowNumber}`;
    return {
      id: withdrawalId,
      withdrawalId,
      rowNumber,
      staffName: row[0] || "",
      staffCode: "",
      paymentMethod: financePaymentMethod(row[5]),
      amount: parseSheetAmount(row[1]),
      note: row[2] || "",
      date: getDateKey(row[3], TIME_ZONE)
    };
  }).filter(withdrawal => isDateInOptionalRange(withdrawal.date, range)).reverse();

  return jsonOutput({ status: "success", withdrawals });
}

function getWithdrawalsPage(data, authenticatedContext) {
  if (!authenticatedContext || !authenticatedContext.user ||
      !(String(authenticatedContext.user.username || "").toLowerCase() === "owner" ||
        Array.isArray(authenticatedContext.permissions) && authenticatedContext.permissions.indexOf("view_withdrawals") !== -1)) {
    return jsonOutput({ status: "error", code: "PERMISSION_DENIED", message: "Withdrawals permission is required." });
  }
  try {
    const range = getOptionalDateRange(data || {}, null, true);
    if (!range || !range.fromDate || !range.toDate) throw new Error("Both dates are required.");
    const read = output => typeof output.getContent === "function" ? JSON.parse(output.getContent()) : output;
    const input = { action: "getWithdrawalsPage", fromDate: range.fromDate, toDate: range.toDate, staffView: "withdrawals" };
    const staff = read(getStaff(input, authenticatedContext));
    if (staff.status !== "success") return jsonOutput(staff);
    const withdrawals = read(getWithdrawals(input));
    if (withdrawals.status !== "success") return jsonOutput(withdrawals);
    return jsonOutput({ status: "success", fromDate: range.fromDate, toDate: range.toDate,
      staff: staff.staff, withdrawals: withdrawals.withdrawals });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
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

  const rows = readFinanceRows(sheet, 6);
  const targetId = String(data.withdrawalId || "").trim();
  const targetName = String(data.staffName || "").trim();
  const targetAmount = parseSheetAmount(data.amount);
  const targetNote = String(data.note || "").trim();
  const targetDate = String(data.date || "").trim();

  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    const rowId = String(row[4] || "").trim();

    const idMatches = targetId && rowId && rowId === targetId;
    const fallbackMatches = (!targetId || !rowId && targetId === `WITHDRAWLS-${i + 2}`) && financePaymentMethod(row[5]) === financePaymentMethod(data.paymentMethod ?? data.payment) &&
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

