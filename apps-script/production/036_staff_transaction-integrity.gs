function staffTransactionVerifyMetadata(record) {
  [["BOOKING_AVAILABILITY_GENERATIONS", "generationId", record.versionState.after || record.versionState],
    ["BOOKING_AVAILABILITY_AUDIT", "auditId", record.auditState]].forEach(([name, key, expected]) => {
    if (!expected[key]) throw new Error("STAFF required metadata identity is missing.");
    const rows = schedulePhase2ReadRows(name).filter(item => item[key] === expected[key]);
    if (rows.length !== 1 || Object.keys(expected).some(field =>
        field !== "_rowNumber" && expected[field] !== undefined && JSON.stringify(rows[0][field]) !== JSON.stringify(expected[field])))
      throw new Error("STAFF required metadata persistence is unproven.");
  });
}

// v2 seals immutable identity + full preimage/intent. This is an integrity checksum,
// not an authentication signature against an attacker who can rewrite the store.
function staffTransactionIntegrity(record) {
  const plan = Object.assign({}, record.beforeState);
  delete plan.staffIntegrity;
  const payload = { contract: "STAFF_RECOVERY_V2", transactionId: record.transactionId,
    requestId: record.requestId, action: record.action, entityType: record.entityType,
    entityId: record.entityId, branchId: record.branchId, environment: record.environment, plan };
  return auth01BytesToHex(auth01Sha256Bytes(auth01Utf8Bytes(JSON.stringify(payload))));
}

function staffTransactionIntegrityValid(record) {
  try { return record.beforeState.staffContract === 2 &&
    /^[a-f0-9]{64}$/.test(record.beforeState.staffIntegrity) &&
    record.beforeState.staffIntegrity === staffTransactionIntegrity(record); }
  catch (_error) { return false; }
}

function staffTransactionVerifyIdentity(record) {
  const plan = record.beforeState;
  if (record.entityType !== "STAFF_MEMBERSHIP" ||
      !/^STAFF_MEMBER_(UPDATE|CREATE|DEACTIVATE)$/.test(record.action) ||
      !staffIdentityKey(record.entityId) ||
      typeof record.branchId !== "string" || !record.branchId.trim() ||
      !bookingAvailabilityPhase5ValidRequestId(record.requestId) ||
      record.environment !== bookingAvailabilityPhase5AssertIdentity().config.environment)
    throw new Error("STAFF transaction identity/environment mismatch");
  if (!Array.isArray(plan.headers) || plan.headers.some(header => typeof header !== "string" || !header) ||
      new Set(plan.headers).size !== plan.headers.length) throw new Error("STAFF headers ambiguous");
  const headers = staffResolveHeaders_(plan.headers);
  const idColumn = headers.indexOf("ID"), branchColumn = headers.indexOf("BRANCH_ID");
  if (idColumn < 0 || branchColumn < 0 || !Array.isArray(plan.row) || !Array.isArray(plan.next) ||
      !Array.isArray(plan.columns) || plan.create !== (record.action === "STAFF_MEMBER_CREATE"))
    throw new Error("STAFF action/plan mismatch");
  if (!plan.next[idColumn] || !staffIdentityMatches(plan.next[idColumn].value, record.entityId) ||
      !plan.next[branchColumn] || plan.next[branchColumn].value !== record.branchId ||
      (!plan.create && (!plan.row[idColumn] || !staffIdentityMatches(plan.row[idColumn].value, record.entityId) ||
        !plan.row[branchColumn] || plan.row[branchColumn].value !== record.branchId)))
    throw new Error("STAFF exact ID/branch preimage mismatch");
  if (!plan.create) {
    const allowed = record.action === "STAFF_MEMBER_UPDATE"
      ? Object.values(STAFF_UPDATE_MUTABLE_FIELDS).concat("UPDATED_AT")
      : ["ACTIVE", "UPDATED_AT"];
    if (!plan.columns.length || plan.columns.some(column => !allowed.includes(headers[column - 1])))
      throw new Error("STAFF action/column mismatch");
  }
  const sheet = getStaffSheet();
  const ids = sheet.getLastRow() < 2 ? [] : sheet.getRange(2, idColumn + 1, sheet.getLastRow() - 1, 1).getValues();
  const matches = ids.map((row, index) => ({ id: row[0], rowNumber: index + 2 }))
    .filter(item => staffIdentityMatches(item.id, record.entityId));
  if (matches.length > 1 || matches.some(item => item.rowNumber !== plan.rowNumber) ||
      (!plan.create && matches.length !== 1)) throw new Error("STAFF ID/row missing or ambiguous");
}

function staffTransactionInspect(transactionId) {
  const result = { transactionId: String(transactionId || ""), classification: "AMBIGUOUS_MANUAL_REVIEW",
    reason: "EVIDENCE_UNAVAILABLE", automaticRecoveryAllowed: false, manualReviewRequired: true,
    evidence: { source: "persisted-local-contract", integrity: false, fullWidthSnapshot: false,
      legacyAutoRecoverySupported: false } };
  try {
    staffTransactionStore();
    // Read ALL transactions so a colliding non-STAFF transaction cannot be hidden by filtering.
    const records = schedulePhase2ReadRows("BOOKING_AVAILABILITY_TRANSACTIONS");
    const matches = records.filter(record => record.transactionId === transactionId);
    if (!transactionId || matches.length !== 1) throw new Error("TRANSACTION_MISSING_OR_AMBIGUOUS");
    const record = matches[0], plan = record.beforeState;
    if (!/^STAFF_MEMBER_(UPDATE|CREATE|DEACTIVATE)$/.test(record.action) || record.entityType !== "STAFF_MEMBERSHIP")
      throw new Error("WRONG_TRANSACTION_ACTION_OR_ENTITY");
    if (!plan || plan.staffContract !== 2) {
      const manual = staffSettlementClassify(record);
      if (!manual.blocking) {
        result.classification = manual.classification; result.reason = manual.reason;
        result.manualReviewRequired = false; result.evidence.manualSettlement = manual.evidence;
        return result; // Historical resolution only; automatic recovery remains disabled.
      }
    }
    const audits = schedulePhase2ReadRows("BOOKING_AVAILABILITY_AUDIT").filter(item =>
      (record.requestId && item.requestId === record.requestId) ||
      (item.beforeState && item.beforeState.transactionId === transactionId) ||
      item.auditId === "BAU-" + transactionId || item.auditId === "BAU-" + transactionId + "-RECOVERY");
    result.evidence.linkedAuditCount = audits.length;
    if (audits.some(item => item.entityType !== record.entityType || (plan && plan.staffContract === 2 ? !staffIdentityMatches(item.entityId, record.entityId) : item.entityId !== record.entityId) ||
        item.requestId !== record.requestId || ![record.action, "STAFF_TRANSACTION_RECOVERED"].includes(item.action) ||
        !item.beforeState || item.beforeState.transactionId !== transactionId ||
        (item.afterState && (plan && plan.staffContract === 2
          ? Object.prototype.hasOwnProperty.call(item.afterState, "staffId") && !staffIdentityMatches(item.afterState.staffId, record.entityId)
          : item.afterState.staffId && item.afterState.staffId !== record.entityId)) ||
        (item.afterState && item.afterState.branchId && item.afterState.branchId !== record.branchId)) ||
        new Set(audits.map(item => item.auditId)).size !== audits.length)
      throw new Error("CONFLICTING_OR_AMBIGUOUS_AUDIT");
    if (!plan || plan.staffContract !== 2) {
      // Historical audit stores IDs/counts; generations are invalidation counters, not row snapshots.
      // Even v1 full plans have no independently persisted integrity contract. Never retrofit a seal.
      result.classification = audits.length ? "AMBIGUOUS_MANUAL_REVIEW" : "UNRECOVERABLE_LEGACY";
      result.reason = audits.length ? "LEGACY_PARTIAL_AUDIT_NO_EXACT_PREIMAGE" : "LEGACY_NO_VERIFIABLE_FULL_WIDTH_PLAN";
      return result;
    }
    if (!staffTransactionIntegrityValid(record)) throw new Error("PLAN_INTEGRITY_MISSING_OR_MISMATCH");
    result.evidence.integrity = true;
    staffTransactionVerifyIdentity(record);
    if (record.versionState && Object.keys(record.versionState).length) {
      const expected = record.versionState.after || record.versionState;
      const versions = schedulePhase2ReadRows("BOOKING_AVAILABILITY_GENERATIONS").filter(item => item.generationId === expected.generationId);
      if (versions.length !== 1 || expected.scopeType !== "GLOBAL" || expected.scopeId !== "GLOBAL" ||
          expected.lastRequestId !== record.requestId || Object.keys(expected).some(key =>
            key !== "_rowNumber" && JSON.stringify(versions[0][key]) !== JSON.stringify(expected[key])))
        throw new Error("CONFLICTING_OR_UNPROVEN_VERSION");
    }
    staffTransactionVerifyRow(plan, false);
    result.evidence.fullWidthSnapshot = true;
    if (!["INTENT", "BUSINESS_STARTED", "BUSINESS_WRITTEN", "VERSION_WRITTEN", "AUDIT_WRITTEN",
      "COMMITTED", "COMPENSATED", "RECOVERY_REQUIRED"].includes(record.status) ||
      typeof record.recoveryRequired !== "boolean") throw new Error("TRANSACTION_STATE_INVALID");
    if (record.status === "COMPENSATED" && !record.recoveryRequired) {
      staffTransactionVerifyRow(plan, true);
      if (!record.compensationState || record.compensationState.completed !== true ||
          record.compensationState.metadataUncertain !== false) throw new Error("COMPENSATION_UNPROVEN");
      if (record.writeBoundary === "RECOVERED") staffTransactionVerifyMetadata(record);
      else if (record.writeBoundary !== "FAILED") throw new Error("COMPENSATION_BOUNDARY_INVALID");
      result.classification = "ALREADY_RESOLVED"; result.reason = "EXACT_COMPENSATED_PREIMAGE";
    } else if (record.status === "COMMITTED" && !record.recoveryRequired && record.writeBoundary === "RESULT" &&
        record.result && Object.keys(record.result).length &&
        JSON.stringify(record.result) === JSON.stringify(record.businessState)) {
      const sheet = getStaffSheet();
      const current = sheet.getRange(plan.rowNumber, 1, 1, plan.headers.length).getValues()[0];
      if (!staffTransactionMatchesNext_(current, plan))
        throw new Error("COMMITTED_ROW_UNPROVEN");
      plan.columns.forEach(column => {
        if (sheet.getRange(plan.rowNumber, column).getFormula() !== "") throw new Error("COMMITTED_FORMULA_UNPROVEN");
      });
      staffTransactionVerifyMetadata(record);
      result.classification = "ALREADY_RESOLVED"; result.reason = "EXACT_COMMITTED_RESULT_AND_METADATA";
    } else {
      result.classification = "RECOVERABLE_EXACT"; result.reason = "SEALED_FULL_WIDTH_PREIMAGE_AND_EXACT_ID";
      result.automaticRecoveryAllowed = true;
    }
    result.manualReviewRequired = false;
  } catch (error) { result.reason = error.message; }
  return result;
}

