// Existing targeted update fields: shared by mutation and v2 recovery ownership.
// UPDATED_AT is the automatic mutation timestamp, not a client-editable field.
const STAFF_UPDATE_MUTABLE_FIELDS = Object.freeze({
  name: "NAME", code: "CODE", salary: "SALARY", percentage: "PERCENTAGE",
  bonus: "BONUS", deduction: "DEDUCTION", isBarber: "IS_BARBER"
});

function updateExistingStaffMember(data) {
  validateCutHubRequestEnvironment();
  return withBookingMutationLock({ employeeId: data.staffId }, () => {
    staffTransactionGuard();
    const sheet = getStaffSheet();
    const headers = staffResolveHeaders_(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
    const required = ["NAME", "CODE", "SALARY", "PERCENTAGE", "ID", "BONUS",
      "DEDUCTION", "ACTIVE", "CREATED_AT", "UPDATED_AT", "IS_BARBER", "BRANCH_ID"];
    required.forEach(header => {
      if (headers.filter(value => value === header).length !== 1) {
        throw new Error(`STAFF schema requires exactly one ${header} column.`);
      }
    });
    const id = staffIdentityKey(data.staffId);
    if (!id) throw new Error("A stable staff ID is required.");
    const rows = sheet.getLastRow() > 1
      ? sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues() : [];
    const matches = rows.map((row, index) => ({ row, rowNumber: index + 2 }))
      .filter(item => staffIdentityMatches(item.row[headers.indexOf("ID")], id));
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
    if (changes.isBarber === true && !parseSheetBoolean(value("IS_BARBER"), true)) {
      bookingAvailabilityPhase5Branch(branchId, { allowClosed: true });
    }
    const fields = STAFF_UPDATE_MUTABLE_FIELDS;
    if (Object.keys(changes).some(key => !Object.prototype.hasOwnProperty.call(fields, key))) throw new Error("Unsupported staff field.");
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
        if (!next || /^[=+\-@]/.test(next) || /[\u0000-\u001f\u007f]/.test(next)) throw new Error(`Invalid ${key}.`);
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
    const write = () => {
      updates.forEach(update => {
        sheet.getRange(target.rowNumber, update.column).setValue(update.next);
      });
      SpreadsheetApp.flush();
      return { updatedAt: getDisplayDateTime(now),
        version: JSON.stringify(sheet.getRange(target.rowNumber, 1, 1, headers.length).getValues()[0]) };
    };
    const plan = staffTransactionPlan(sheet, target.rowNumber, updates);
    const result = staffLifecycleTransaction(data, actor, id, branchId, "STAFF_MEMBER_UPDATE",
      plan, write);
    return jsonOutput({ status: "success", updatedAt: result.updatedAt, version: result.version });
  });
}

