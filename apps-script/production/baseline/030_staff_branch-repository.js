function listStaffBranches(data) {
  const permissionError = requirePermission(
    data,
    "view_staff_accounting",
    "Staff accounting permission is required."
  );
  if (permissionError) return permissionError;

  const actor = schedulePhase2Actor(data);
  const role = String(actor && actor.role || "").trim().toUpperCase();
  if (!actor || (!actor.owner && role !== "MANAGER")) {
    return jsonOutput({
      status: "error",
      code: "PERMISSION_DENIED",
      permissionDenied: true,
      message: "Staff branch management requires owner or manager scope."
    });
  }

  const branches = bookingAvailabilityPhase5ListBranches(actor, false)
    .filter(branch => branch.active === true)
    .map(branch => ({
      branchId: String(branch.branchId || "").trim(),
      branchName: String(branch.branchName || "").trim(),
      active: true
    }))
    .filter(branch => branch.branchId && branch.branchName);

  return jsonOutput({ status: "success", branches });
}
// Explicit STAFF legacy aliases only; raw headers/cells and sealed plans stay intact.
function staffCanonicalHeader_(value) {
  const header = String(value).trim().toUpperCase();
  const aliases = { "CREATED AT": "CREATED_AT", "UPDATED AT": "UPDATED_AT", "IS BARBER": "IS_BARBER" };
  return Object.prototype.hasOwnProperty.call(aliases, header) ? aliases[header] : header;
}

function staffResolveHeaders_(rawHeaders) {
  const headers = rawHeaders.map(staffCanonicalHeader_);
  const known = ["NAME", "CODE", "SALARY", "PERCENTAGE", "ID", "BONUS", "DEDUCTION",
    "ACTIVE", "CREATED_AT", "UPDATED_AT", "IS_BARBER", "BRANCH_ID", "PRODUCTCOMMISSIONPERCENTAGE"];
  known.forEach(header => {
    if (headers.filter(value => value === header).length > 1) {
      throw new Error("Invalid STAFF header: " + header + " (ambiguous alias)");
    }
  });
  return headers;
}

function getStaff(data) {
  try {
    const sheet = getStaffSheet();
    const lastRow = sheet.getLastRow();
    const attendanceTotals = getApprovedAttendanceTotalsForCurrentMonth(data);

    if (lastRow < 2) {
      return jsonOutput({ status: "success", staff: [] });
    }

    const headers = staffResolveHeaders_(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
    const staffHeaders = ["NAME", "CODE", "SALARY", "PERCENTAGE", "ID", "BONUS", "DEDUCTION",
      "ACTIVE", "CREATED_AT", "UPDATED_AT", "IS_BARBER"];
    staffHeaders.forEach(header => {
      if (headers.filter(value => value === header).length !== 1) throw new Error(`Invalid STAFF header: ${header}`);
    });
    const rawRows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
    const rows = rawRows.map(row => staffHeaders.map(header => row[headers.indexOf(header)]));
    const idCounts = {};
    rows.forEach(row => {
      const id = String(row[4] || "").trim();
      if (id) idCounts[id] = (idCounts[id] || 0) + 1;
    });
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
        id: String(row[4] || "").trim(),
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
        const attendanceDeduction = (staffMember.id && idCounts[staffMember.id] === 1 ? attendanceTotals[`id:${staffMember.id}`] || 0 : 0) +
          (nameCounts[nameKey] === 1 ? attendanceTotals[`name:${nameKey}`] || 0 : 0);
        return {
        id: staffMember.id,
        staffId: staffMember.id && idCounts[staffMember.id] === 1 ? staffMember.id : "",
        identityStatus: !staffMember.id ? "missing" : idCounts[staffMember.id] === 1 ? "persisted" : "ambiguous",
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

// Comparison keys only: preserve raw sheet cells and sealed transaction evidence.
function staffIdentityKey(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function staffIdentityMatches(left, right) {
  const key = staffIdentityKey(left);
  return !!key && key === staffIdentityKey(right);
}

