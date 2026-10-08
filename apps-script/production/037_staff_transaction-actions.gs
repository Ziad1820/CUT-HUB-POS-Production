function inspectStaffMemberTransaction(data) {
  try {
    validateCutHubRequestEnvironment();
    const denied = requirePermission(data, "view_staff_accounting", "Staff inspection permission is required.");
    if (denied) return denied;
    return withBookingMutationLock({ bookingRequestId: data.transactionId }, () => {
      const actor = schedulePhase2Actor(data);
      if (!actor || !actor.owner) throw new Error("Only owner can inspect STAFF transactions.");
      return jsonOutput(Object.assign({ status: "success", readOnly: true }, staffTransactionInspect(data.transactionId)));
    });
  } catch (error) { return staffTransactionResultError(error); }
}

function recoverStaffMemberTransaction(data) {
  try {
    validateCutHubRequestEnvironment();
    const denied = requirePermission(data, "view_staff_accounting", "Staff recovery permission is required.");
    if (denied) return denied;
    return withBookingMutationLock({ bookingRequestId: data.transactionId }, () => {
      const actor = schedulePhase2Actor(data);
      if (!actor || !actor.owner) throw new Error("Only owner can recover STAFF transactions.");
      staffTransactionStore();
      const inspection = staffTransactionInspect(data.transactionId);
      if (!["RECOVERABLE_EXACT", "ALREADY_RESOLVED"].includes(inspection.classification))
        throw new Error(inspection.reason + "; manual review required; no replay allowed.");
      const record = staffTransactionRecords().find(item => item.transactionId === data.transactionId);
      const plan = record.beforeState;
      if (inspection.classification === "ALREADY_RESOLVED") return jsonOutput({ status: "success",
        recovered: true, resolution: record.status, transactionId: record.transactionId });
      record.status = "RECOVERY_REQUIRED"; record.recoveryRequired = true;
      // Discard stale metadata receipts before a repeatable monotonic invalidation.
      // A lost acknowledgement must not make the prior generation look like a row preimage.
      record.versionState = {}; record.auditState = {};
      record.writeBoundary = "RECOVERING"; staffTransactionSave(record);
      staffTransactionRestore(plan);
      // Invalidation generations are monotonic; do not decrement possibly observed cache versions.
      record.versionState = bookingAvailabilityPhase5IncrementGeneration("staffMembership", "GLOBAL", "GLOBAL", actor, record.requestId);
      record.auditState = bookingAvailabilityPhase5AppendAudit({ auditId: "BAU-" + record.transactionId + "-RECOVERY",
        action: "STAFF_TRANSACTION_RECOVERED", entityType: "STAFF_MEMBERSHIP", entityId: record.entityId,
        actorId: actor.actorId, actorRole: actor.role, reasonCode: "STAFF_COMPENSATED",
        beforeState: { transactionId: record.transactionId }, afterState: { restored: true }, requestId: record.requestId });
      SpreadsheetApp.flush(); staffTransactionVerifyMetadata(record);
      record.status = "COMPENSATED"; record.recoveryRequired = false; record.writeBoundary = "RECOVERED";
      record.result = {}; record.compensationState = { completed: true, metadataUncertain: false };
      staffTransactionSave(record);
      return jsonOutput({ status: "success", recovered: true, resolution: "COMPENSATED", transactionId: record.transactionId });
    });
  } catch (error) { return staffTransactionResultError(staffTransactionError("STAFF_RECOVERY_REQUIRED", error.message, data.transactionId)); }
}


