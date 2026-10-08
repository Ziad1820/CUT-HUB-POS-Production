const ATTENDANCE_HEADERS = [
  "ID",
  "DATE",
  "STAFF_ID",
  "STAFF_NAME",
  "RECORD_TYPE",
  "SHIFT_START",
  "CHECK_IN",
  "BREAK_OUT",
  "BREAK_IN",
  "CHECK_OUT",
  "WORK_HOURS",
  "BREAK_HOURS",
  "LATE_HOURS",
  "SHORT_HOURS",
  "ABSENCE_DAYS",
  "PENALTY_AMOUNT",
  "PENALTY_REASON",
  "SUGGESTED_DEDUCTION",
  "APPROVED_DEDUCTION",
  "APPROVAL_STATUS",
  "APPROVED_BY",
  "NOTE",
  "CREATED_AT",
  "UPDATED_AT"
];

function getAttendanceSheet() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName("ATTENDANCE");

  if (!sheet) {
    sheet = ss.insertSheet("ATTENDANCE");
  }

  ensureAttendanceHeaders(sheet);
  return sheet;
}

function ensureAttendanceHeaders(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, ATTENDANCE_HEADERS.length);
  const currentHeaders = headerRange.getValues()[0].map(value => String(value || "").trim());
  const hasHeaders = currentHeaders.some(Boolean);
  const matches = ATTENDANCE_HEADERS.every((header, index) => currentHeaders[index] === header);

  if (!hasHeaders || !matches) {
    headerRange.setValues([ATTENDANCE_HEADERS]);
  }
}

function getAttendanceSheetReadOnly() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("ATTENDANCE");
  if (!sheet) {
    throw schemaContractError(
      "ATTENDANCE_SCHEMA_NOT_READY", "Sheet ATTENDANCE not found.",
      { sheetName: "ATTENDANCE" });
  }
  inspectPositionalSheetSchema(sheet, {
    sheetName: "ATTENDANCE",
    label: "Legacy ATTENDANCE",
    contract: ATTENDANCE_HEADERS.map((header) => ({ name: header, aliases: [header] })),
    notReadyCode: "ATTENDANCE_SCHEMA_NOT_READY",
    incompatibleCode: "ATTENDANCE_SCHEMA_INCOMPATIBLE",
    duplicateCode: "ATTENDANCE_SCHEMA_DUPLICATE_HEADERS"
  });
  return sheet;
}

function normalizeLookupKey(value) {
  return String(value || "").trim().toLowerCase();
}

function parseTimeMinutes(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  const parts = text.split(":");
  if (parts.length < 2) return null;

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  return (hours * 60) + minutes;
}

function getHoursBetween(startValue, endValue) {
  const start = parseTimeMinutes(startValue);
  const end = parseTimeMinutes(endValue);

  if (start === null || end === null || end < start) {
    return 0;
  }

  return (end - start) / 60;
}

function roundHours(value) {
  return Math.round(parseSheetAmount(value) * 100) / 100;
}

function getMonthlyAbsenceCount(staffName, dateKey, excludeId) {
  const sheet = getAttendanceSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const monthKey = String(dateKey || "").slice(0, 7);
  const staffKey = normalizeLookupKey(staffName);
  const rows = sheet.getRange(2, 1, lastRow - 1, ATTENDANCE_HEADERS.length).getValues();

  return rows.filter(row => {
    const id = String(row[0] || "").trim();
    const rowDate = getDateKey(row[1], TIME_ZONE);
    const rowStaff = normalizeLookupKey(row[3]);
    const type = String(row[4] || "").trim();
    return id !== excludeId
      && rowDate.slice(0, 7) === monthKey
      && rowStaff === staffKey
      && type === "absent";
  }).length;
}

function calculateAttendanceValues(data) {
  const recordType = String(data.recordType || "work").trim();
  const salary = parseSheetAmount(data.salary);
  const dailyRate = salary > 0 ? salary / 26 : 0;
  const hourlyRate = dailyRate > 0 ? dailyRate / 8 : 0;
  const penaltyAmount = parseSheetAmount(data.penaltyAmount);
  const shiftStart = String(data.shiftStart || "12:00").trim();
  const checkIn = String(data.checkIn || "").trim();
  const checkOut = String(data.checkOut || "").trim();
  const breakOut = String(data.breakOut || "").trim();
  const breakIn = String(data.breakIn || "").trim();

  if (recordType === "absent") {
    const absenceCount = getMonthlyAbsenceCount(data.staffName, data.dateKey || data.date);
    const isPaidLeave = absenceCount < 4;
    return {
      workHours: 0,
      breakHours: 0,
      lateHours: 0,
      shortHours: 0,
      absenceDays: 1,
      suggestedDeduction: roundHours(isPaidLeave ? penaltyAmount : dailyRate + penaltyAmount)
    };
  }

  if (recordType === "penalty") {
    return {
      workHours: 0,
      breakHours: 0,
      lateHours: 0,
      shortHours: 0,
      absenceDays: 0,
      suggestedDeduction: roundHours(penaltyAmount)
    };
  }

  if (!checkOut) {
    return {
      workHours: 0,
      breakHours: 0,
      lateHours: 0,
      shortHours: 0,
      absenceDays: 0,
      suggestedDeduction: 0
    };
  }

  const presenceHours = getHoursBetween(checkIn, checkOut);
  const breakHours = getHoursBetween(breakOut, breakIn);
  const workHours = Math.max(0, presenceHours - breakHours);
  const lateHours = Math.max(0, getHoursBetween(shiftStart, checkIn));
  const shortHours = Math.max(0, 8 - workHours);
  const billableMissingHours = Math.max(lateHours, shortHours);
  const suggestedDeduction = (billableMissingHours * hourlyRate) + penaltyAmount;

  return {
    workHours: roundHours(workHours),
    breakHours: roundHours(breakHours),
    lateHours: roundHours(lateHours),
    shortHours: roundHours(shortHours),
    absenceDays: 0,
    suggestedDeduction: roundHours(suggestedDeduction)
  };
}

function attendanceRecordFromRow(row, rowNumber) {
  return {
    rowNumber,
    id: String(row[0] || "").trim(),
    date: getDateKey(row[1], TIME_ZONE),
    staffId: String(row[2] || "").trim(),
    staffName: String(row[3] || "").trim(),
    recordType: String(row[4] || "work").trim(),
    shiftStart: String(row[5] || "").trim(),
    checkIn: String(row[6] || "").trim(),
    breakOut: String(row[7] || "").trim(),
    breakIn: String(row[8] || "").trim(),
    checkOut: String(row[9] || "").trim(),
    workHours: parseSheetAmount(row[10]),
    breakHours: parseSheetAmount(row[11]),
    lateHours: parseSheetAmount(row[12]),
    shortHours: parseSheetAmount(row[13]),
    absenceDays: parseSheetAmount(row[14]),
    penaltyAmount: parseSheetAmount(row[15]),
    penaltyReason: String(row[16] || "").trim(),
    suggestedDeduction: parseSheetAmount(row[17]),
    approvedDeduction: parseSheetAmount(row[18]),
    approvalStatus: String(row[19] || "pending").trim(),
    approvedBy: String(row[20] || "").trim(),
    note: String(row[21] || "").trim(),
    createdAt: getDisplayDateTime(row[22]),
    updatedAt: getDisplayDateTime(row[23])
  };
}

function createAttendanceRecord(data) {
  try {
    const permissionError = requirePermission(data, "view_attendance", "You do not have permission to manage attendance.");
    if (permissionError) return permissionError;

    const sheet = getAttendanceSheet();
    const now = getCairoDateTime();
    const dateKey = getDateKey(data.date || data.dateKey || now, TIME_ZONE);
    const staffName = String(data.staffName || "").trim();

    if (!staffName) {
      return jsonOutput({ status: "error", message: "Staff name is required." });
    }

    const existingOpenRecord = findOpenAttendanceRecord(sheet, staffName, dateKey);
    if (String(data.recordType || "work").trim() === "work" && existingOpenRecord) {
      return jsonOutput({ status: "error", message: "This staff member already has an open attendance record today." });
    }

    const values = calculateAttendanceValues({ ...data, dateKey });
    const id = String(data.id || `ATT-${Utilities.getUuid()}`).trim();
    const row = [
      id,
      dateKey,
      String(data.staffId || "").trim(),
      staffName,
      String(data.recordType || "work").trim(),
      String(data.shiftStart || "12:00").trim(),
      String(data.checkIn || "").trim(),
      String(data.breakOut || "").trim(),
      String(data.breakIn || "").trim(),
      String(data.checkOut || "").trim(),
      values.workHours,
      values.breakHours,
      values.lateHours,
      values.shortHours,
      values.absenceDays,
      parseSheetAmount(data.penaltyAmount),
      String(data.penaltyReason || "").trim(),
      values.suggestedDeduction,
      0,
      String(data.recordType || "work").trim() === "work" && !String(data.checkOut || "").trim() ? "open" : "pending",
      "",
      String(data.note || "").trim(),
      now,
      now
    ];

    sheet.appendRow(row);
    logActivity(data, "create", "attendance", id, `Created attendance record for ${staffName} on ${dateKey}. Suggested deduction: ${values.suggestedDeduction}`);

    return jsonOutput({ status: "success", record: attendanceRecordFromRow(row, sheet.getLastRow()) });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function findOpenAttendanceRecord(sheet, staffName, dateKey) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const staffKey = normalizeLookupKey(staffName);
  const rows = sheet.getRange(2, 1, lastRow - 1, ATTENDANCE_HEADERS.length).getValues();

  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const record = attendanceRecordFromRow(rows[index], index + 2);
    if (
      record.date === dateKey &&
      normalizeLookupKey(record.staffName) === staffKey &&
      record.recordType === "work" &&
      !record.checkOut &&
      record.approvalStatus !== "approved"
    ) {
      return record;
    }
  }

  return null;
}

function updateAttendanceStep(data) {
  try {
    const permissionError = requirePermission(data, "view_attendance", "You do not have permission to update attendance.");
    if (permissionError) return permissionError;

    const sheet = getAttendanceSheet();
    const rowNumber = Number(data.rowNumber);
    if (!rowNumber || rowNumber < 2 || rowNumber > sheet.getLastRow()) {
      return jsonOutput({ status: "error", message: "Attendance record was not found." });
    }

    const step = String(data.step || "").trim();
    const timeValue = String(data.time || "").trim();
    const stepColumns = {
      checkIn: 7,
      breakOut: 8,
      breakIn: 9,
      checkOut: 10
    };

    if (!stepColumns[step] || !timeValue) {
      return jsonOutput({ status: "error", message: "Invalid attendance step." });
    }

    const row = sheet.getRange(rowNumber, 1, 1, ATTENDANCE_HEADERS.length).getValues()[0];
    const record = attendanceRecordFromRow(row, rowNumber);

    if (record.approvalStatus === "approved") {
      return jsonOutput({ status: "error", message: "Approved attendance records cannot be edited." });
    }

    const updatedRecord = {
      ...record,
      [step]: timeValue,
      salary: data.salary
    };
    const values = calculateAttendanceValues(updatedRecord);
    const status = step === "checkOut" ? "pending" : "open";
    const now = getCairoDateTime();

    sheet.getRange(rowNumber, stepColumns[step]).setValue(timeValue);
    sheet.getRange(rowNumber, 11, 1, 10).setValues([[
      values.workHours,
      values.breakHours,
      values.lateHours,
      values.shortHours,
      values.absenceDays,
      record.penaltyAmount,
      record.penaltyReason,
      values.suggestedDeduction,
      0,
      status
    ]]);
    sheet.getRange(rowNumber, 24).setValue(now);

    logActivity(data, "update", "attendance", record.id, `Updated attendance ${step} for ${record.staffName} on ${record.date}.`);

    return jsonOutput({
      status: "success",
      record: attendanceRecordFromRow(sheet.getRange(rowNumber, 1, 1, ATTENDANCE_HEADERS.length).getValues()[0], rowNumber)
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function getAttendanceRecords(data) {
  try {
    const permissionError = requirePermission(data, "view_attendance", "You do not have permission to view attendance.");
    if (permissionError) return permissionError;

    const sheet = getAttendanceSheetReadOnly();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return jsonOutput({ status: "success", records: [] });
    }

    const fromDate = getDateKey(data.fromDate || data.date || "", TIME_ZONE);
    const toDate = getDateKey(data.toDate || data.date || "", TIME_ZONE);
    const staffKey = normalizeLookupKey(data.staffName);
    const status = String(data.approvalStatus || "").trim();
    const rows = sheet.getRange(2, 1, lastRow - 1, ATTENDANCE_HEADERS.length).getValues();

    const records = rows
      .map((row, index) => attendanceRecordFromRow(row, index + 2))
      .filter(record => {
        if (fromDate && record.date < fromDate) return false;
        if (toDate && record.date > toDate) return false;
        if (staffKey && normalizeLookupKey(record.staffName) !== staffKey) return false;
        if (status && record.approvalStatus !== status) return false;
        return true;
      })
      .sort((a, b) => String(b.date).localeCompare(String(a.date)) || b.rowNumber - a.rowNumber);

    return jsonOutput({ status: "success", records });
  } catch (error) {
    return jsonOutput({
      status: "error",
      ...(error && error.code ? { code: error.code } : {}),
      message: error.message
    });
  }
}

function approveAttendanceDeduction(data) {
  try {
    const permissionError = requirePermission(data, "view_staff_accounting", "You do not have permission to approve deductions.");
    if (permissionError) return permissionError;

    const sheet = getAttendanceSheet();
    const rowNumber = Number(data.rowNumber);
    if (!rowNumber || rowNumber < 2 || rowNumber > sheet.getLastRow()) {
      return jsonOutput({ status: "error", message: "Attendance record was not found." });
    }

    const row = sheet.getRange(rowNumber, 1, 1, ATTENDANCE_HEADERS.length).getValues()[0];
    const record = attendanceRecordFromRow(row, rowNumber);
    const approvedDeduction = data.approvedDeduction === undefined || data.approvedDeduction === null || data.approvedDeduction === ""
      ? record.suggestedDeduction
      : parseSheetAmount(data.approvedDeduction);
    const actor = getActor(data);
    const now = getCairoDateTime();

    sheet.getRange(rowNumber, 19, 1, 6).setValues([[
      approvedDeduction,
      "approved",
      actor.displayName,
      record.note,
      record.createdAt || row[22],
      now
    ]]);

    logActivity(data, "update", "attendance", record.id, `Approved attendance deduction for ${record.staffName}. Amount: ${approvedDeduction}`);

    return jsonOutput({
      status: "success",
      record: {
        ...record,
        approvedDeduction,
        approvalStatus: "approved",
        approvedBy: actor.displayName,
        updatedAt: now
      }
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function deleteAttendanceRecord(data) {
  try {
    const permissionError = requirePermission(data, "view_staff_accounting", "You do not have permission to delete attendance records.");
    if (permissionError) return permissionError;

    const sheet = getAttendanceSheet();
    const rowNumber = Number(data.rowNumber);
    if (!rowNumber || rowNumber < 2 || rowNumber > sheet.getLastRow()) {
      return jsonOutput({ status: "error", message: "Attendance record was not found." });
    }

    const row = sheet.getRange(rowNumber, 1, 1, ATTENDANCE_HEADERS.length).getValues()[0];
    const record = attendanceRecordFromRow(row, rowNumber);
    sheet.deleteRow(rowNumber);

    logActivity(data, "delete", "attendance", record.id, `Deleted attendance record for ${record.staffName} on ${record.date}.`);
    return jsonOutput({ status: "success" });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function getApprovedAttendanceTotalsForCurrentMonth(data) {
  const range = getOptionalDateRange(data || {}, null, true);
  try {
    const today = getCairoDateKey();
    const monthKey = today.slice(0, 7);
    const sheet = getAttendanceSheetReadOnly();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return {};

    const rows = sheet.getRange(2, 1, lastRow - 1, ATTENDANCE_HEADERS.length).getValues();
    return rows.reduce((totals, row) => {
      const record = attendanceRecordFromRow(row, 0);
      if ((range ? !isDateInOptionalRange(record.date, range) : record.date.slice(0, 7) !== monthKey) ||
          record.approvalStatus !== "approved") {
        return totals;
      }

      const key = record.staffId ? `id:${record.staffId}` : `name:${normalizeLookupKey(record.staffName)}`;
      totals[key] = (totals[key] || 0) + record.approvedDeduction;
      return totals;
    }, {});
  } catch (error) {
    // A failed attendance read is not evidence of zero deduction.
    throw error;
  }
}
