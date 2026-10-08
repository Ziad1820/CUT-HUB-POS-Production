function createStaffMember(data) {
  try {
    validateCutHubRequestEnvironment();
    const permissionError = requirePermission(data, "view_staff_accounting", "You do not have permission to edit staff.");
    if (permissionError) return permissionError;
    return withBookingMutationLock({ bookingRequestId: data.clientRequestId || "STAFF-CREATE" }, () => {
      const staff = data.staff;
      if (!staff || typeof staff !== "object" || Array.isArray(staff)) throw new Error("Staff details are required.");
      const allowed = ["name", "code", "salary", "percentage", "bonus", "deduction", "isBarber", "productCommissionPercentage", "branchId"];
      if (Object.keys(staff).some(key => allowed.indexOf(key) === -1)) throw new Error("Unsupported staff field.");
      const name = staffLifecycleText(staff.name, "name");
      const code = staffLifecycleText(staff.code, "code").toUpperCase();
      const branchId = staffLifecycleText(staff.branchId, "branchId");
      const actor = staffLifecycleActor(data, branchId);
      // Closed branches are permitted; inactive or invalid branches are not.
      bookingAvailabilityPhase5Branch(branchId, { allowClosed: true });
      const fields = { NAME: name, CODE: code, BRANCH_ID: branchId, ACTIVE: true };
      for (const key of ["salary", "percentage", "bonus", "deduction", "productCommissionPercentage"]) {
        fields[key.toUpperCase()] = staffLifecycleNumber(staff[key] === undefined ? 0 : staff[key], key,
          key === "percentage" || key === "productCommissionPercentage");
      }
      if (staff.isBarber !== undefined && typeof staff.isBarber !== "boolean") throw new Error("Invalid barber flag.");
      fields.IS_BARBER = staff.isBarber === undefined ? true : staff.isBarber;
      staffTransactionGuard();
      const sheet = getStaffSheet();
      const headers = staffLifecycleSchema(sheet);
      // Never acknowledge a nonzero commission that this sheet cannot persist.
      if (headers.indexOf("PRODUCTCOMMISSIONPERCENTAGE") === -1 && fields.PRODUCTCOMMISSIONPERCENTAGE !== 0) {
        throw new Error("Product commission requires an existing productCommissionPercentage column.");
      }
      const rows = sheet.getLastRow() > 1
        ? sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues() : [];
      if (rows.some(row => String(row[headers.indexOf("CODE")] || "").trim().toUpperCase() === code)) {
        throw new Error("Staff code is already in use.");
      }
      const uuid = Utilities.getUuid();
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
        throw new Error("Staff UUID generation failed.");
      }
      const id = `STAFF-${uuid}`;
      if (rows.some(row => staffIdentityMatches(row[headers.indexOf("ID")], id))) throw new Error("Staff ID collision; no changes saved.");
      const now = getCairoDateTime();
      fields.ID = id; fields.CREATED_AT = now; fields.UPDATED_AT = now;
      const next = headers.map(header => Object.prototype.hasOwnProperty.call(fields, header) ? fields[header] : "");
      const rowNumber = sheet.getLastRow() + 1;
      const write = () => {
        sheet.getRange(rowNumber, 1, 1, headers.length).setValues([next]);
        SpreadsheetApp.flush();
        const saved = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
        return { staff: { id, staffId: id, identityStatus: "persisted", name, code, branchId,
          salary: fields.SALARY, percentage: fields.PERCENTAGE, bonus: fields.BONUS,
          deduction: fields.DEDUCTION, productCommissionPercentage: fields.PRODUCTCOMMISSIONPERCENTAGE,
          active: true, isBarber: fields.IS_BARBER, createdAt: getDisplayDateTime(now),
          updatedAt: getDisplayDateTime(now), version: JSON.stringify(saved) } };
      };
      const result = staffLifecycleTransaction(data, actor, id, branchId, "STAFF_MEMBER_CREATE",
        staffTransactionPlan(sheet, rowNumber, [], next), write);
      return jsonOutput({ status: "success", staff: result.staff });
    });
  } catch (error) {
    return staffTransactionResultError(error);
  }
}

function deactivateStaffMember(data) {
  try {
    validateCutHubRequestEnvironment();
    const permissionError = requirePermission(data, "view_staff_accounting", "You do not have permission to edit staff.");
    if (permissionError) return permissionError;
    const id = staffLifecycleText(staffIdentityKey(data.staffId), "stable staff ID");
    return withBookingMutationLock({ employeeId: id }, () => {
      staffTransactionGuard();
      const sheet = getStaffSheet();
      const headers = staffLifecycleSchema(sheet);
      const rows = sheet.getLastRow() > 1
        ? sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues() : [];
      const matches = rows.map((row, index) => ({ row, rowNumber: index + 2 }))
        .filter(item => staffIdentityMatches(item.row[headers.indexOf("ID")], id));
      if (matches.length !== 1) throw new Error("Staff ID is missing or ambiguous; no changes saved.");
      const target = matches[0];
      const value = header => target.row[headers.indexOf(header)];
      const branchId = String(value("BRANCH_ID") || "").trim();
      const actor = staffLifecycleActor(data, branchId);
      if (typeof data.expectedUpdatedAt !== "string" || data.expectedUpdatedAt !== getDisplayDateTime(value("UPDATED_AT")) ||
          data.expectedVersion !== JSON.stringify(target.row)) throw new Error("Staff data changed. Reload before saving.");
      if (!parseSheetBoolean(value("ACTIVE"), true)) throw new Error("Staff member is inactive.");
      const now = getCairoDateTime();
      const updates = [{ header: "ACTIVE", next: false }, { header: "UPDATED_AT", next: now }];
      const write = () => {
        updates.forEach(update => {
          update.column = headers.indexOf(update.header) + 1;
          update.previous = value(update.header);
          sheet.getRange(target.rowNumber, update.column).setValue(update.next);
        });
        SpreadsheetApp.flush();
        return { staffId: id, active: false, updatedAt: getDisplayDateTime(now),
          version: JSON.stringify(sheet.getRange(target.rowNumber, 1, 1, headers.length).getValues()[0]) };
      };
      const result = staffLifecycleTransaction(data, actor, id, branchId, "STAFF_MEMBER_DEACTIVATE",
        staffTransactionPlan(sheet, target.rowNumber, updates.map(update => ({ column: headers.indexOf(update.header) + 1, next: update.next }))), write);
      return jsonOutput({ status: "success", ...result });
    });
  } catch (error) {
    return staffTransactionResultError(error);
  }
}


function saveStaff(data) {
  try {
    const permissionError = requirePermission(data, "view_staff_accounting", "You do not have permission to edit staff.");
    if (permissionError) return permissionError;
    if (data.mode === "updateExisting") return updateExistingStaffMember(data);
    // STAFF-01 caller audit: bulk replacement cannot preserve branch/commission identity.
    // Keep the legacy route fail-closed while older clients are retired.
    return jsonOutput({ status: "error", code: "STAFF_BULK_SAVE_DISABLED",
      message: "Bulk staff replacement is disabled. Use staff lifecycle actions." });
  } catch (error) {
    return staffTransactionResultError(error);
  }
}

