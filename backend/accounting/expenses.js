function createExpense(data) {
  const permissionError = requirePermission(data, "view_expenses", "You do not have permission to add expenses.");
  if (permissionError) return permissionError;

  const sheet = SpreadsheetApp.getActive().getSheetByName("EXPENSES");
  if (!sheet) {
    return jsonOutput({ status: "error", message: "Sheet EXPENSES not found" });
  }

  const expenseDate = data.date || getCairoDateKey();
  const lockedError = getLockedDateError(expenseDate, "Expense");
  if (lockedError) {
    return jsonOutput({ status: "error", message: lockedError, locked: true });
  }

  sheet.appendRow([
    data.category || "",
    data.amount || 0,
    data.title || "",
    data.note || "",
    expenseDate,
    data.expenseId || ""
  ]);

  logActivity(
    data,
    "create",
    "expense",
    data.expenseId || "",
    `Created expense | Category: ${data.category || "-"} | Title: ${data.title || "-"} | Amount: ${data.amount || 0}`
  );

  return jsonOutput({ status: "success" });
}

function getExpenses(data) {
  let range;
  try {
    range = getOptionalDateRange(data, null, true);
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
  const sheet = SpreadsheetApp.getActive().getSheetByName("EXPENSES");
  if (!sheet || sheet.getLastRow() < 2) {
    return jsonOutput({ status: "success", expenses: [] });
  }

  const lastRow = sheet.getLastRow();
  const rows = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  const expenses = rows.map((row, index) => {
    const rowNumber = index + 2;
    const expenseId = row[5] || `EXPENSES-${rowNumber}`;
    return {
      id: expenseId,
      expenseId,
      rowNumber,
      category: row[0] || "",
      amount: parseSheetAmount(row[1]),
      title: row[2] || "",
      note: row[3] || "",
      date: getDateKey(row[4], TIME_ZONE)
    };
  }).filter(expense => isDateInOptionalRange(expense.date, range)).reverse();

  return jsonOutput({ status: "success", expenses });
}

function deleteExpense(data) {
  const permissionError = requirePermission(data, "view_expenses", "You do not have permission to delete expenses.");
  if (permissionError) return permissionError;

  const sheet = SpreadsheetApp.getActive().getSheetByName("EXPENSES");
  if (!sheet) {
    return jsonOutput({ status: "error", message: "Sheet EXPENSES not found" });
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return jsonOutput({ status: "error", message: "Expense not found" });
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  const targetId = String(data.expenseId || "").trim();
  const targetCategory = String(data.category || "").trim();
  const targetAmount = parseSheetAmount(data.amount);
  const targetTitle = String(data.title || "").trim();
  const targetNote = String(data.note || "").trim();
  const targetDate = String(data.date || "").trim();

  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    const rowId = String(row[5] || "").trim();

    const idMatches = targetId && rowId && rowId === targetId;
    const fallbackMatches =
      String(row[0] || "").trim() === targetCategory &&
      parseSheetAmount(row[1]) === targetAmount &&
      String(row[2] || "").trim() === targetTitle &&
      String(row[3] || "").trim() === targetNote &&
      getDateKey(row[4], TIME_ZONE) === targetDate;

    if (idMatches || fallbackMatches) {
      const lockedError = getLockedDateError(row[4], "Expense");
      if (lockedError) {
        return jsonOutput({ status: "error", message: lockedError, locked: true });
      }

      sheet.deleteRow(i + 2);

      logActivity(
        data,
        "delete",
        "expense",
        rowId || targetId || `EXPENSES-${i + 2}`,
        `Deleted expense | Category: ${row[0] || "-"} | Title: ${row[2] || "-"} | Amount: ${row[1] || 0}`
      );

      return jsonOutput({ status: "success" });
    }
  }

  return jsonOutput({ status: "error", message: "Expense not found" });
}

