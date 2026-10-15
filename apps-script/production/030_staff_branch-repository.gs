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

function getStaff(data, authenticatedContext) {
  try {
    const sheet = getStaffSheet();
    const lastRow = sheet.getLastRow();
    if (data && data.staffView === "cashier") {
      const permissionError = cashierContextAllows(authenticatedContext) ? null : requirePermission(data, "access_cashier", "Cashier permission is required.");
      if (permissionError) return permissionError;
      if (lastRow < 2) return jsonOutput({ status: "success", staff: [] });
      const headers = staffResolveHeaders_(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
      ["NAME", "CODE", "ID", "ACTIVE", "IS_BARBER"].forEach(header => {
        if (headers.filter(value => value === header).length !== 1) throw new Error(`Invalid STAFF header: ${header}`);
      });
      const rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
      const get = (row, name) => row[headers.indexOf(name)];
      const ids = {};
      rows.forEach(row => { const id = String(get(row, "ID") || "").trim(); if (id) ids[id] = (ids[id] || 0) + 1; });
      return jsonOutput({ status: "success", staff: rows.map(row => {
        const id = String(get(row, "ID") || "").trim();
        return { id, staffId: id && ids[id] === 1 ? id : "",
          name: String(get(row, "NAME") || "").trim(), code: String(get(row, "CODE") || "").trim().toUpperCase(),
          active: parseSheetBoolean(get(row, "ACTIVE"), true), isBarber: parseSheetBoolean(get(row, "IS_BARBER"), true) };
      }).filter(item => item.name && item.active) });
    }
    const attendanceTotals = getApprovedAttendanceTotalsForCurrentMonth(data);
    const minuteTotals = {};
    const seenDays = new Set();
    const selectedRange = getOptionalDateRange(data || {}, null, true);
    const currentMonth = getCairoDateKey().slice(0, 7);
    attendancePhase3ReadDays().forEach(day => {
      if (selectedRange ? !isDateInOptionalRange(day.attendanceDate, selectedRange) :
          day.attendanceDate.slice(0, 7) !== currentMonth) return;
      const entry = StaffAttendancePhase3.calculateMinuteAccounting(day);
      if (!entry) return;
      const key = `${day.staffId}:${day.attendanceDate}`;
      if (seenDays.has(key)) throw new Error("ATTENDANCE_ACCOUNTING_DAY_AMBIGUOUS");
      seenDays.add(key);
      const summary = minuteTotals[day.staffId] ||
        (minuteTotals[day.staffId] = { deductionMinor: 0, overtimeMinor: 0, entries: [] });
      summary.deductionMinor += entry.deductionMinor;
      summary.overtimeMinor += entry.overtimeMinor;
      summary.entries.push(entry);
    });

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
        const minuteSummary = staffMember.id && idCounts[staffMember.id] === 1 ? minuteTotals[staffMember.id] : null;
        const attendanceDeduction = (minuteSummary ? minuteSummary.deductionMinor / 100 : 0) +
          (staffMember.id && idCounts[staffMember.id] === 1 ? attendanceTotals[`id:${staffMember.id}`] || 0 : 0) +
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
        attendanceOvertime: minuteSummary ? minuteSummary.overtimeMinor / 100 : 0,
        attendanceEntries: minuteSummary ? minuteSummary.entries : [],
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

function getStaffAccountingPeriod(data, authenticatedContext) {
  if (!authenticatedContext || !authenticatedContext.user ||
      !(String(authenticatedContext.user.username || "").toLowerCase() === "owner" ||
        Array.isArray(authenticatedContext.permissions) && authenticatedContext.permissions.indexOf("view_staff_accounting") !== -1)) {
    return jsonOutput({ status: "error", code: "PERMISSION_DENIED", message: "Staff accounting permission is required." });
  }
  try {
    const range = getOptionalDateRange(data || {}, null, true);
    if (!range || !range.fromDate || !range.toDate) throw new Error("Both dates are required.");
    // Fixed server-owned projection. Ignore client STAFF rows, totals and view flags.
    const input = { action: "getStaffAccountingPeriod", fromDate: range.fromDate, toDate: range.toDate };
    const read = output => typeof output.getContent === "function" ? JSON.parse(output.getContent()) : output;
    const timing = {}, startedAt = Date.now();
    const staffResult = read(getStaff(input, authenticatedContext));
    timing.staffMs = Date.now() - startedAt;
    if (staffResult.status !== "success") return jsonOutput(staffResult);
    const withdrawalStartedAt = Date.now();
    const withdrawalsResult = read(getWithdrawals(input));
    timing.withdrawalsMs = Date.now() - withdrawalStartedAt;
    if (withdrawalsResult.status !== "success") return jsonOutput(withdrawalsResult);
    const activityStartedAt = Date.now();
    const activity = buildStaffAccountingActivity(input, staffResult.staff, timing);
    timing.activityMs = Date.now() - activityStartedAt;
    const staff = staffResult.staff.map((item, index) => Object.assign({}, item, activity[index]));
    return jsonOutput({ status: "success", fromDate: range.fromDate, toDate: range.toDate,
      staff, withdrawals: withdrawalsResult.withdrawals,
      ...(data.performance === true ? { performance: timing } : {}) });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function cashierContextAllows(context) {
  return !!context && !!context.user && (String(context.user.username || "").toLowerCase() === "owner" ||
    Array.isArray(context.permissions) && context.permissions.indexOf("access_cashier") !== -1);
}

function getCashierCatalog(data, authenticatedContext) {
  if (!cashierContextAllows(authenticatedContext)) return jsonOutput({ status: "error", code: "PERMISSION_DENIED", message: "Cashier permission is required." });
  try {
    const read = output => typeof output.getContent === "function" ? JSON.parse(output.getContent()) : output;
    const staff = read(getStaff(Object.assign({}, data, { staffView: "cashier" }), authenticatedContext));
    const services = read(getServices());
    if (staff.status !== "success" || services.status !== "success") return jsonOutput({ status: "error", message: "تعذر تحديث خدمات الكاشير والحلاقين." });
    const result = { status: "success", staff: staff.staff, services: services.services };
    if (data.includeRecentInvoices === true) {
      // Fixed read-only projection: client filters, limits and offsets cannot expand it.
      try { result.recentInvoices = read(getInvoices({ limit: 5, offset: 0, filters: {} })); }
      catch (_) { result.recentInvoices = { status: "error" }; }
    }
    return jsonOutput(result);
  } catch (_) { return jsonOutput({ status: "error", message: "تعذر تحديث خدمات الكاشير والحلاقين." }); }
}

// Comparison keys only: preserve raw sheet cells and sealed transaction evidence.
function staffIdentityKey(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function staffIdentityMatches(left, right) {
  const key = staffIdentityKey(left);
  return !!key && key === staffIdentityKey(right);
}

