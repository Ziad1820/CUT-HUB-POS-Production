function getStaffSheet() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("STAFF");
  if (!sheet) {
    throw new Error("Sheet STAFF not found");
  }
  return sheet;
}

function buildStaffId(index) {
  return `STAFF-${String(index).padStart(3, "0")}`;
}

function parseSheetBoolean(value, defaultValue) {
  if (value === true || value === false) return value;

  const text = String(value || "").trim().toUpperCase();
  if (!text) return defaultValue;

  if (["TRUE", "YES", "1", "Y"].indexOf(text) !== -1) return true;
  if (["FALSE", "NO", "0", "N"].indexOf(text) !== -1) return false;

  return defaultValue;
}

function normalizeStaffForSheet(staff, index) {
  const name = String(staff.name || staff.staffName || "").trim();
  const code = String(staff.code || staff.staffCode || "").trim().toUpperCase();

  return {
    id: String(staff.id || staff.staffId || buildStaffId(index + 1)).trim(),
    name,
    code,
    salary: parseSheetAmount(staff.salary || staff.salaries),
    percentage: parseSheetAmount(staff.percentage || staff.salaryPercentage),
    bonus: parseSheetAmount(staff.bonus),
    deduction: parseSheetAmount(staff.deduction || staff.debt || staff.lateDiscount),
    isBarber: parseSheetBoolean(staff.isBarber, true),
    active: parseSheetBoolean(staff.active, true)
  };
}

function getStaff(data) {
  try {
    const sheet = getStaffSheet();
    const lastRow = sheet.getLastRow();
    const attendanceTotals = getApprovedAttendanceTotalsForCurrentMonth(data);

    if (lastRow < 2) {
      return jsonOutput({ status: "success", staff: [] });
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
      .map(value => String(value).trim().toUpperCase());
    const staffHeaders = ["NAME", "CODE", "SALARY", "PERCENTAGE", "ID", "BONUS", "DEDUCTION",
      "ACTIVE", "CREATED_AT", "UPDATED_AT", "IS_BARBER"];
    staffHeaders.forEach(header => {
      if (headers.filter(value => value === header).length !== 1) throw new Error(`Invalid STAFF header: ${header}`);
    });
    const rawRows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
    const rows = rawRows.map(row => staffHeaders.map(header => row[headers.indexOf(header)]));
    const nameCounts = {};
    rows.forEach(row => {
      const key = normalizeLookupKey(row[0]);
      nameCounts[key] = (nameCounts[key] || 0) + 1;
    });

    const staff = rows
      .map((row, index) => ({
        rowNumber: index + 2,
        version: JSON.stringify(rawRows[index]),
        branchId: headers.indexOf("BRANCH_ID") >= 0 ? String(rawRows[index][headers.indexOf("BRANCH_ID")] || "").trim() : "",
        name: String(row[0] || "").trim(),
        code: String(row[1] || "").trim().toUpperCase(),
        salary: parseSheetAmount(row[2]),
        percentage: parseSheetAmount(row[3]),
        id: String(row[4] || buildStaffId(index + 1)).trim(),
        bonus: parseSheetAmount(row[5]),
        deduction: parseSheetAmount(row[6]),
        active: parseSheetBoolean(row[7], true),
        createdAt: getDisplayDateTime(row[8]),
        updatedAt: getDisplayDateTime(row[9]),
        isBarber: parseSheetBoolean(row[10], true)
      }))
      .filter(staffMember => staffMember.name && staffMember.active)
      .map(staffMember => {
        const nameKey = normalizeLookupKey(staffMember.name);
        const attendanceDeduction = (attendanceTotals[`id:${staffMember.id}`] || 0) +
          (nameCounts[nameKey] === 1 ? attendanceTotals[`name:${nameKey}`] || 0 : 0);
        return {
        id: staffMember.id,
        branchId: staffMember.branchId,
        name: staffMember.name,
        code: staffMember.code,
        salary: staffMember.salary,
        percentage: staffMember.percentage,
        bonus: staffMember.bonus,
        deduction: staffMember.deduction,
        attendanceDeduction,
        totalDeduction: staffMember.deduction + attendanceDeduction,
        updatedAt: staffMember.updatedAt,
        version: staffMember.version,
        isBarber: staffMember.isBarber
        };
      });

    return jsonOutput({ status: "success", staff });
  } catch (error) {
    return jsonOutput({
      status: "error",
      ...(error && error.code ? { code: error.code } : {}),
      message: error.message
    });
  }
}

// Single-member editor. The legacy list API remains separate for add/delete callers.
function updateExistingStaffMember(data) {
  assertStagingEnvironment();
  return withBookingMutationLock({ employeeId: data.staffId }, () => {
    const sheet = getStaffSheet();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
      .map(value => String(value).trim().toUpperCase());
    const required = ["NAME", "CODE", "SALARY", "PERCENTAGE", "ID", "BONUS",
      "DEDUCTION", "ACTIVE", "CREATED_AT", "UPDATED_AT", "IS_BARBER", "BRANCH_ID"];
    required.forEach(header => {
      if (headers.filter(value => value === header).length !== 1) {
        throw new Error(`STAFF schema requires exactly one ${header} column.`);
      }
    });
    const id = String(data.staffId || "").trim();
    if (!id) throw new Error("A stable staff ID is required.");
    const rows = sheet.getLastRow() > 1
      ? sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues() : [];
    const matches = rows.map((row, index) => ({ row, rowNumber: index + 2 }))
      .filter(item => String(item.row[headers.indexOf("ID")]).trim() === id);
    if (matches.length !== 1) throw new Error("Staff ID is missing or ambiguous; no changes saved.");
    const target = matches[0];
    const value = header => target.row[headers.indexOf(header)];
    if (!parseSheetBoolean(value("ACTIVE"), true)) throw new Error("Staff member is inactive.");
    const actor = schedulePhase2Actor(data);
    const branchId = String(value("BRANCH_ID") || "").trim();
    if (!actor || (!actor.owner && !(actor.role === "MANAGER" && branchId &&
        actor.branchIds.indexOf(branchId) !== -1))) {
      throw new Error("Staff member is outside your permitted branch scope.");
    }
    if (typeof data.expectedUpdatedAt !== "string" ||
        data.expectedUpdatedAt !== getDisplayDateTime(value("UPDATED_AT")) ||
        data.expectedVersion !== JSON.stringify(target.row)) {
      throw new Error("Staff data changed. Reload before saving.");
    }
    const changes = data.changes || {};
    const fields = { name: "NAME", code: "CODE", salary: "SALARY", percentage: "PERCENTAGE",
      bonus: "BONUS", deduction: "DEDUCTION", isBarber: "IS_BARBER" };
    if (Object.keys(changes).some(key => !fields[key])) throw new Error("Unsupported staff field.");
    const updates = [];
    Object.keys(changes).forEach(key => {
      let next = changes[key];
      if (["salary", "percentage", "bonus", "deduction"].indexOf(key) !== -1) {
        if (typeof next !== "number" || !Number.isFinite(next) || next < 0 ||
            (key === "percentage" && next > 100)) throw new Error(`Invalid ${key}.`);
      } else if (key === "isBarber") {
        if (typeof next !== "boolean") throw new Error("Invalid barber flag.");
        next = next ? "TRUE" : "FALSE";
      } else {
        next = String(next || "").trim();
        if (key === "code") next = next.toUpperCase();
        if (!next || /^[=+@]/.test(next)) throw new Error(`Invalid ${key}.`);
        if (key === "code" && rows.some((row, index) => index + 2 !== target.rowNumber &&
            String(row[headers.indexOf("CODE")]).trim().toUpperCase() === next)) {
          throw new Error("Staff code is already in use.");
        }
      }
      const column = headers.indexOf(fields[key]) + 1;
      const previous = target.row[column - 1];
      const same = key === "isBarber" ? parseSheetBoolean(previous, true) === changes[key]
        : previous === next;
      if (!same) updates.push({ column, previous, next });
    });
    if (!updates.length) return jsonOutput({ status: "success", updatedAt: data.expectedUpdatedAt, version: data.expectedVersion });
    const now = getCairoDateTime();
    updates.push({ column: headers.indexOf("UPDATED_AT") + 1, previous: value("UPDATED_AT"), next: now });
    const applied = [];
    const write = () => {
      updates.forEach(update => {
        // Retain formulas as well as values if compensation is required.
        update.formula = sheet.getRange(target.rowNumber, update.column).getFormula();
        applied.push(update);
        sheet.getRange(target.rowNumber, update.column).setValue(update.next);
      });
      SpreadsheetApp.flush();
      return { updatedAt: getDisplayDateTime(now),
        version: JSON.stringify(sheet.getRange(target.rowNumber, 1, 1, headers.length).getValues()[0]) };
    };
    const undo = () => {
      applied.slice().reverse().forEach(update =>
        sheet.getRange(target.rowNumber, update.column).setValue(update.formula || update.previous));
      SpreadsheetApp.flush();
    };
    let result;
    if (typeof bookingAvailabilityPhase5RunTransaction === "function" && bookingAvailabilityEngineMode() === "PHASE5") {
      const requestId = String(data.clientRequestId || Utilities.getUuid());
      result = bookingAvailabilityPhase5RunTransaction({
        data, requestId, action: "STAFF_MEMBER_UPDATE", entityType: "STAFF_MEMBERSHIP", entityId: id, actor,
        beforeState: { rowNumber: target.rowNumber, row: target.row }, business: write,
        version: () => bookingAvailabilityPhase5IncrementGeneration("staffMembership", "GLOBAL", "GLOBAL", actor, requestId),
        audit: () => bookingAvailabilityPhase5AppendAudit({
          action: "STAFF_MEMBER_UPDATED", entityType: "STAFF_MEMBERSHIP", entityId: id,
          actorId: actor.actorId, actorRole: actor.role, reasonCode: "STAFF_MEMBERSHIP",
          beforeState: { rowNumber: target.rowNumber }, afterState: { fields: Object.keys(changes) }, requestId
        }), compensateBusiness: undo, response: value => value
      });
    } else {
      try {
        result = write();
        logActivity(data, "update", "staff", id, "Updated staff member.");
      } catch (error) { undo(); throw error; }
    }
    return jsonOutput({ status: "success", updatedAt: result.updatedAt, version: result.version });
  });
}

function saveStaff(data) {
  try {
    const permissionError = requirePermission(data, "view_staff_accounting", "You do not have permission to edit staff.");
    if (permissionError) return permissionError;
    if (data.mode === "updateExisting") return updateExistingStaffMember(data);

    const sheet = getStaffSheet();
    const staffList = Array.isArray(data.staff) ? data.staff : [];
    const lastRow = sheet.getLastRow();
    const now = getCairoDateTime();
    const beforeRows = lastRow > 1
      ? sheet.getRange(2, 1, lastRow - 1, 11).getValues() : [];

    const rows = staffList
      .map(normalizeStaffForSheet)
      .filter(staff => staff.name)
      .map(staff => [
        staff.name,
        staff.code,
        staff.salary,
        staff.percentage,
        staff.id,
        staff.bonus,
        staff.deduction,
        staff.active ? "TRUE" : "FALSE",
        now,
        now,
        staff.isBarber ? "TRUE" : "FALSE"
      ]);

    const responseStaff = rows.map(row => ({
      name: row[0], code: row[1], salary: row[2], percentage: row[3],
      id: row[4], bonus: row[5], deduction: row[6], isBarber: row[10] !== "FALSE"
    }));
    const writeStaff = () => {
      if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, 11).clearContent();
      if (rows.length > 0) sheet.getRange(2, 1, rows.length, 11).setValues(rows);
    };
    if (typeof bookingAvailabilityPhase5RunTransaction === "function" &&
        bookingAvailabilityEngineMode() === "PHASE5") {
      return withBookingMutationLock({
        bookingRequestId: String(data.clientRequestId || "STAFF-SAVE").trim()
      }, () => {
        const requestId = String(data.clientRequestId || "STAFF-SAVE").trim();
        const actor = bookingAvailabilityPhase5Actor(data, true);
        const result = bookingAvailabilityPhase5RunTransaction({
          data, requestId, action: "STAFF_MEMBERSHIP_SAVE",
          entityType: "STAFF_MEMBERSHIP", entityId: "STAFF", actor,
          beforeState: { rows: beforeRows },
          business: () => { writeStaff(); SpreadsheetApp.flush(); return { staff: responseStaff }; },
          version: () => bookingAvailabilityPhase5IncrementGeneration(
            "staffMembership", "GLOBAL", "GLOBAL", actor, requestId),
          audit: () => bookingAvailabilityPhase5AppendAudit({
            action: "STAFF_MEMBERSHIP_SAVED", entityType: "STAFF_MEMBERSHIP",
            entityId: "STAFF", actorId: actor ? actor.actorId : "system",
            actorRole: actor ? actor.role : "SYSTEM", reasonCode: "STAFF_MEMBERSHIP",
            beforeState: { count: beforeRows.length }, afterState: { count: rows.length },
            requestId
          }),
          compensateBusiness: () => {
            const affected = Math.max(beforeRows.length, rows.length);
            if (affected) sheet.getRange(2, 1, affected, 11).clearContent();
            if (beforeRows.length) sheet.getRange(2, 1, beforeRows.length, 11).setValues(beforeRows);
            SpreadsheetApp.flush();
          },
          response: value => value
        });
        logActivity(data, "update", "staff", "STAFF",
          `Saved staff list. Total staff: ${rows.length}`);
        return jsonOutput({ status: "success", staff: result.staff });
      });
    }
    writeStaff();

    logActivity(
      data,
      "update",
      "staff",
      "STAFF",
      `Saved staff list. Total staff: ${rows.length}`
    );

    return jsonOutput({
      status: "success",
      staff: responseStaff
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

