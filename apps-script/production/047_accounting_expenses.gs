function createExpense(data) {
  const permissionError = requirePermission(data, "view_expenses", "You do not have permission to add expenses.");
  if (permissionError) return permissionError;
  return appendFinanceOnce(data, "EXPENSES", [data.category || "", data.amount, data.title || "", data.note || "", data.date || getCairoDateKey(), String(data.expenseId || "").trim()], "Expense");
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
  let dateBounds = null;
  if (range && typeof Utilities !== "undefined" && Utilities.parseDate) {
    try {
      function midnight(key, followingDay) {
        if (followingDay) {
          const parts = key.split("-").map(Number);
          key = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + 1)).toISOString().slice(0, 10);
        }
        const boundary = Utilities.parseDate(key, TIME_ZONE, "yyyy-MM-dd");
        if (getDateKey(boundary, TIME_ZONE) !== key) throw new Error("DATE_BOUNDARY_NORMALIZED");
        return boundary.getTime();
      }
      dateBounds = { from: range.fromDate ? midnight(range.fromDate) : -Infinity,
        to: range.toDate ? midnight(range.toDate, true) : Infinity };
      if (isNaN(dateBounds.from) || isNaN(dateBounds.to)) dateBounds = null;
    } catch (_) { dateBounds = null; }
  }
  // Format only matching dates. Reuse exact timestamp conversions within this read.
  const dateKeys = new Map();
  const expenses = rows.map((row, index) => {
    const rawDate = row[4];
    if (dateBounds && rawDate instanceof Date && !isNaN(rawDate.getTime()) &&
        (rawDate.getTime() < dateBounds.from || rawDate.getTime() >= dateBounds.to)) return null;
    const cacheKey = rawDate instanceof Date ? rawDate.getTime() : String(rawDate);
    const cacheType = rawDate instanceof Date ? "date:" : typeof rawDate + ":";
    const key = cacheType + cacheKey;
    if (!dateKeys.has(key)) dateKeys.set(key, getDateKey(rawDate, TIME_ZONE));
    const date = dateKeys.get(key);
    if (!isDateInOptionalRange(date, range)) return null;
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
      date
    };
  }).filter(Boolean).reverse();

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

