function getActivityLogSheet() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("ACTIVITY_LOG");
  if (!sheet) {
    throw new Error("Sheet ACTIVITY_LOG not found");
  }
  return sheet;
}

function logActivity(data, action, entityType, entityId, details) {
  try {
    const sheet = getActivityLogSheet();
    const actor = getActor(data || {});

    sheet.appendRow([
      Utilities.getUuid(),
      action || "",
      entityType || "",
      entityId || "",
      actor.userName,
      actor.displayName,
      details || "",
      getCairoDateTime()
    ]);

    SpreadsheetApp.flush();
  } catch (error) {
    Logger.log("Activity log failed: " + error.message);
  }
}

function getActivityLogs(data) {
  try {
    const sheet = getActivityLogSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      return jsonOutput({ status: "success", logs: [], hasMore: false, totalLogs: 0 });
    }

    const totalRows = lastRow - 1;
    const limit = Math.max(1, Math.min(Number(data.limit) || 100, 500));
    const offset = Math.max(0, Number(data.offset) || 0);
    const remainingRows = Math.max(0, totalRows - offset);

    if (!remainingRows) {
      return jsonOutput({ status: "success", logs: [], hasMore: false, totalLogs: totalRows });
    }

    const rowsToRead = Math.min(limit, remainingRows);
    const startRow = lastRow - offset - rowsToRead + 1;
    const rows = sheet.getRange(startRow, 1, rowsToRead, 8).getValues();

    const logs = rows
      .map((row, index) => ({
        rowNumber: startRow + index,
        logId: String(row[0] || "").trim(),
        action: String(row[1] || "").trim(),
        entityType: String(row[2] || "").trim(),
        entityId: String(row[3] || "").trim(),
        userName: String(row[4] || "").trim(),
        displayName: String(row[5] || "").trim(),
        details: String(row[6] || "").trim(),
        createdAt: getDisplayDateTime(row[7])
      }))
      .filter(log =>
        log.logId ||
        log.action ||
        log.entityType ||
        log.entityId ||
        log.userName ||
        log.displayName ||
        log.details ||
        log.createdAt
      )
      .reverse();

    return jsonOutput({
      status: "success",
      logs,
      hasMore: offset + rowsToRead < totalRows,
      totalLogs: totalRows
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function deleteActivityLog(data) {
  try {
    const permissionError = requirePermission(data, "manage_users", "Only managers can delete activity logs.");
    if (permissionError) return permissionError;

    const logId = String(data.logId || data.id || "").trim();
    const rowNumber = Number(data.rowNumber || 0);
    if (!logId && !rowNumber) {
      return jsonOutput({ status: "error", message: "Missing logId." });
    }

    const sheet = getActivityLogSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return jsonOutput({ status: "error", message: "Activity log not found." });
    }

    if (logId && !/^ROW-\d+$/i.test(logId) && !/^LOG-\d+$/i.test(logId)) {
      const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      const index = ids.findIndex(row => String(row[0] || "").trim() === logId);
      if (index !== -1) {
        sheet.deleteRow(index + 2);
        SpreadsheetApp.flush();
        return jsonOutput({ status: "success", message: "Activity log deleted." });
      }
    }

    if (rowNumber >= 2 && rowNumber <= lastRow) {
      sheet.deleteRow(rowNumber);
      SpreadsheetApp.flush();
      return jsonOutput({ status: "success", message: "Activity log deleted." });
    }

    return jsonOutput({ status: "error", message: "Activity log not found." });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function deleteActivityLogs(data) {
  try {
    const permissionError = requirePermission(data, "manage_users", "Only managers can delete activity logs.");
    if (permissionError) return permissionError;

    const logs = Array.isArray(data.logs) ? data.logs : [];
    if (!logs.length) {
      return jsonOutput({ status: "error", message: "No activity logs selected." });
    }

    const sheet = getActivityLogSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return jsonOutput({ status: "success", deletedCount: 0 });
    }

    const rowsToDelete = [];
    const requestedIds = logs
      .map(log => String(log.logId || log.id || "").trim())
      .filter(id => id && !/^ROW-\d+$/i.test(id) && !/^LOG-\d+$/i.test(id));

    if (requestedIds.length) {
      const idSet = new Set(requestedIds);
      const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      ids.forEach((row, index) => {
        const currentId = String(row[0] || "").trim();
        if (idSet.has(currentId)) rowsToDelete.push(index + 2);
      });
    }

    logs.forEach(log => {
      const rowNumber = Number(log.rowNumber || 0);
      if (rowNumber >= 2 && rowNumber <= lastRow) {
        rowsToDelete.push(rowNumber);
      }
    });

    const sortedRows = [...new Set(rowsToDelete)]
      .filter(row => row >= 2 && row <= lastRow)
      .sort((a, b) => b - a);

    let deletedCount = 0;
    for (let i = 0; i < sortedRows.length; i++) {
      const endRow = sortedRows[i];
      let startRow = endRow;
      while (i + 1 < sortedRows.length && sortedRows[i + 1] === startRow - 1) {
        i++;
        startRow = sortedRows[i];
      }

      const count = endRow - startRow + 1;
      sheet.deleteRows(startRow, count);
      deletedCount += count;
    }

    SpreadsheetApp.flush();
    return jsonOutput({ status: "success", deletedCount });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

