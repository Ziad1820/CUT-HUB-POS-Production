// STAFF manual adjudication: append-only audit record; never retrofit legacy recovery metadata.
// SHA-256 is an integrity checksum, not a signature against an administrator rewriting the store.
function staffSettlementCanonical(value) {
  if (Array.isArray(value)) return value.map(staffSettlementCanonical);
  if (value && typeof value === "object") {
    if (Object.prototype.toString.call(value) === "[object Date]") return value.toISOString();
    const result = {};
    Object.keys(value).sort().forEach(key => { if (value[key] !== undefined) result[key] = staffSettlementCanonical(value[key]); });
    return result;
  }
  return value;
}

function staffSettlementHash(value) {
  return auth01BytesToHex(auth01Sha256Bytes(auth01Utf8Bytes(JSON.stringify(staffSettlementCanonical(value)))));
}

// Integrity inputs only: never rewrite raw sheet values or evidence payloads.
function staffSettlementCanonicalIdentity(value) {
  if (value === null || value === undefined || !String(value).trim())
    throw new Error("INVALID_SETTLEMENT_IDENTITY");
  return String(value).trim();
}

function staffSettlementTransactionHash(record) {
  const copy = Object.assign({}, record, { entityId: staffSettlementCanonicalIdentity(record.entityId) });
  delete copy._rowNumber; // Stable transaction ID + full historical contents, never row number alone.
  return staffSettlementHash(copy);
}

function staffSettlementIdentity(record) {
  if (!record || !/^BAT-[a-zA-Z0-9-]+$/.test(record.transactionId) ||
      !bookingAvailabilityPhase5ValidRequestId(record.requestId) ||
      !/^STAFF_MEMBER_(UPDATE|CREATE|DEACTIVATE)$/.test(record.action) ||
      record.entityType !== "STAFF_MEMBERSHIP" || !staffIdentityKey(record.entityId) ||
      typeof record.environment !== "string" || !record.environment ||
      !["INTENT", "BUSINESS_STARTED", "BUSINESS_WRITTEN", "VERSION_WRITTEN", "AUDIT_WRITTEN",
        "COMMITTED", "COMPENSATED", "RECOVERY_REQUIRED"].includes(record.status) ||
      (record.beforeState && record.beforeState.staffContract !== undefined && record.beforeState.staffContract !== 1))
    throw new Error("INVALID_LEGACY_TRANSACTION_IDENTITY");
  return { transactionId: record.transactionId, requestId: record.requestId, action: record.action,
    entityType: record.entityType, staffId: staffSettlementCanonicalIdentity(record.entityId), environment: record.environment,
    transactionHash: staffSettlementTransactionHash(record) };
}

function staffSettlementEvidence(evidence, identity) {
  if (!evidence || Object.keys(evidence).sort().join(",") !== "reference,sha256,summary,transactionHash" ||
      typeof evidence.reference !== "string" || evidence.reference.trim() !== evidence.reference ||
      !evidence.reference || evidence.reference.length > 1000 || /^[=+\-@]/.test(evidence.reference) ||
      !/^[a-f0-9]{64}$/.test(evidence.sha256) ||
      typeof evidence.summary !== "string" || !evidence.summary.trim() || evidence.summary.length > 4000 ||
      evidence.transactionHash !== identity.transactionHash)
    throw new Error("INVALID_EVIDENCE");
  // The authenticated owner attests to external evidence. This does not fetch or verify remote documents.
  return { reference: evidence.reference, sha256: evidence.sha256, summary: evidence.summary,
    transactionHash: evidence.transactionHash };
}

function staffSettlementAuditId(identity) {
  return "BAU-STAFF-MANUAL-" + staffSettlementHash({ transactionId: identity.transactionId });
}

function staffSettlementFingerprint(audit) {
  const copy = {};
  BookingAvailabilityPhase5.SHEET_SCHEMAS.BOOKING_AVAILABILITY_AUDIT.forEach(header => {
    const key = schedulePhase2Camel(header).replace(/Json$/, "");
    copy[key] = audit[key];
  });
  // Required audit identities share the exact generation/readback representation.
  ["auditId", "action", "entityType", "entityId", "staffId", "actorId", "actorRole",
    "reasonCode", "requestId"].forEach(key => {
    copy[key] = staffSettlementCanonicalIdentity(copy[key]);
  });
  // Branch/date are optional in this contract; do not turn absence into an identity.
  ["branchId", "date"].forEach(key => {
    if (copy[key] !== "") copy[key] = staffSettlementCanonicalIdentity(copy[key]);
  });
  copy.beforeState = Object.assign({}, audit.beforeState, {
    transactionId: staffSettlementCanonicalIdentity(audit.beforeState.transactionId)
  });
  copy.afterState = Object.assign({}, audit.afterState);
  copy.afterState.identity = Object.assign({}, audit.afterState.identity);
  ["transactionId", "requestId", "action", "entityType", "staffId", "environment",
    "transactionHash"].forEach(key => {
    copy.afterState.identity[key] = staffSettlementCanonicalIdentity(copy.afterState.identity[key]);
  });
  // Evidence reference/hash/summary/sourceIds remain byte-exact; no permissive fallback.
  delete copy.afterState.fingerprint;
  return staffSettlementHash(copy);
}

function staffSettlementClassify(record) {
  const result = { blocking: true, classification: "LEGACY_MANUAL_REVIEW", reason: "NO_MANUAL_SETTLEMENT", evidence: null };
  try {
    const identity = staffSettlementIdentity(record);
    if (identity.environment !== bookingAvailabilityPhase5AssertIdentity().config.environment)
      throw new Error("SETTLEMENT_RUNTIME_ENVIRONMENT_MISMATCH");
    const transactions = schedulePhase2ReadRows("BOOKING_AVAILABILITY_TRANSACTIONS");
    const exact = transactions.filter(item => item.transactionId === identity.transactionId);
    if (exact.length !== 1)
      throw new Error("TRANSACTION_MISSING_OR_AMBIGUOUS");
    if (staffSettlementTransactionHash(exact[0]) !== identity.transactionHash)
      throw new Error("TRANSACTION_CHANGED_DURING_SETTLEMENT");
    const auditId = staffSettlementAuditId(identity);
    const matches = schedulePhase2ReadRows("BOOKING_AVAILABILITY_AUDIT").filter(item =>
      item.auditId === auditId || (item.action === "STAFF_LEGACY_MANUAL_SETTLEMENT" &&
        (item.requestId === identity.requestId || item.beforeState && item.beforeState.transactionId === identity.transactionId ||
          item.afterState && item.afterState.identity && item.afterState.identity.transactionId === identity.transactionId)));
    if (!matches.length) return result;
    if (matches.length !== 1) throw new Error("SETTLEMENT_MISSING_OR_AMBIGUOUS");
    const audit = matches[0], settlement = audit.afterState;
    if (!settlement || settlement.contract !== "STAFF_MANUAL_SETTLEMENT_V1" ||
        settlement.decision !== "PROVEN_RESOLVED_MANUAL" ||
        JSON.stringify(staffSettlementCanonical(Object.assign({}, settlement.identity, {
          staffId: staffSettlementCanonicalIdentity(settlement.identity.staffId)
        }))) !== JSON.stringify(staffSettlementCanonical(identity)) ||
        audit.auditId !== auditId || audit.action !== "STAFF_LEGACY_MANUAL_SETTLEMENT" ||
        audit.entityType !== identity.entityType || !staffIdentityMatches(audit.entityId, identity.staffId) ||
        !staffIdentityMatches(audit.staffId, identity.staffId) || audit.branchId !== (record.branchId || "") ||
        audit.date !== "" || audit.actorRole !== "OWNER" || String(audit.actorId || "").toLowerCase() !== "owner" ||
        audit.reasonCode !== "PROVEN_RESOLVED_MANUAL" || audit.requestId !== identity.requestId ||
        JSON.stringify(audit.beforeState) !== JSON.stringify({ transactionId: identity.transactionId }) ||
        typeof audit.createdAt !== "string" || !Number.isFinite(Date.parse(audit.createdAt)))
      throw new Error("SETTLEMENT_IDENTITY_OR_OWNER_MISMATCH");
    const evidence = staffSettlementEvidence(settlement.evidence, identity);
    if (JSON.stringify(audit.sourceIds) !== JSON.stringify([evidence.reference, evidence.sha256]) ||
        !/^[a-f0-9]{64}$/.test(settlement.fingerprint) || settlement.fingerprint !== staffSettlementFingerprint(audit))
      throw new Error("SETTLEMENT_INTEGRITY_MISMATCH");
    result.blocking = false; result.classification = "MANUALLY_SETTLED";
    result.reason = "EXACT_OWNER_ADJUDICATION_RETAINED_HISTORY"; result.evidence = evidence;
  } catch (error) { result.reason = error.message; }
  return result;
}

function settleLegacyStaffTransaction(data) {
  try {
    validateCutHubRequestEnvironment();
    const denied = requirePermission(data, "view_staff_accounting", "Staff settlement permission is required.");
    if (denied) return denied;
    return withBookingMutationLock({ bookingRequestId: data && data.identity && data.identity.transactionId }, () => {
      const actor = schedulePhase2Actor(data);
      if (!actor || actor.owner !== true || actor.role !== "OWNER" || String(actor.actorId || "").toLowerCase() !== "owner")
        throw staffTransactionError("OWNER_REQUIRED", "Only authenticated owner can settle legacy STAFF transactions.");
      if (!data || Object.keys(data).some(key => !["action", "sessionToken", "token", "authToken", "identity", "evidence"].includes(key)))
        throw staffTransactionError("INVALID_EVIDENCE", "Only transaction identity and bounded evidence are accepted.");
      staffTransactionStore();
      const input = data.identity;
      const matches = schedulePhase2ReadRows("BOOKING_AVAILABILITY_TRANSACTIONS").filter(record =>
        input && record.transactionId === input.transactionId);
      if (matches.length !== 1) throw staffTransactionError("BLOCKED_CONFLICT", "Transaction missing or ambiguous.");
      const record = matches[0];
      let identity;
      try { identity = staffSettlementIdentity(record); }
      catch (error) { throw staffTransactionError("BLOCKED_CONFLICT", error.message); }
      let normalized;
      try { normalized = Object.assign({}, input, { staffId: staffSettlementCanonicalIdentity(input.staffId) }); }
      catch (error) { throw staffTransactionError("BLOCKED_CONFLICT", "Invalid settlement identity."); }
      if (JSON.stringify(staffSettlementCanonical(normalized)) !== JSON.stringify(staffSettlementCanonical(identity)) ||
          identity.environment !== bookingAvailabilityPhase5AssertIdentity().config.environment)
        throw staffTransactionError("BLOCKED_CONFLICT", "Transaction identity, contents or environment mismatch.");
      let evidence;
      try { evidence = staffSettlementEvidence(data.evidence, identity); }
      catch (error) { throw staffTransactionError("INVALID_EVIDENCE", error.message); }
      const existing = staffSettlementClassify(record);
      if (!existing.blocking) {
        if (staffSettlementHash(existing.evidence) !== staffSettlementHash(evidence))
          throw staffTransactionError("BLOCKED_CONFLICT", "Existing settlement uses different evidence; manual review required.");
        return jsonOutput({ status: "success", code: "ALREADY_SETTLED", transactionId: identity.transactionId });
      }
      if (existing.reason !== "NO_MANUAL_SETTLEMENT")
        throw staffTransactionError("BLOCKED_CONFLICT", existing.reason);
      const audit = { auditId: staffSettlementAuditId(identity), action: "STAFF_LEGACY_MANUAL_SETTLEMENT",
        entityType: identity.entityType, entityId: identity.staffId, staffId: identity.staffId,
        branchId: record.branchId || "", date: "", actorId: actor.actorId, actorRole: actor.role,
        reasonCode: "PROVEN_RESOLVED_MANUAL", sourceIds: [evidence.reference, evidence.sha256],
        beforeState: { transactionId: identity.transactionId }, afterState: {
          contract: "STAFF_MANUAL_SETTLEMENT_V1", decision: "PROVEN_RESOLVED_MANUAL", identity, evidence },
        requestId: identity.requestId, createdAt: bookingAvailabilityPhase5Now() };
      audit.afterState.fingerprint = staffSettlementFingerprint(audit);
      // Dedicated append, never shared upsert/undo: existing decisions cannot be overwritten or rolled back.
      const schema = BookingAvailabilityPhase5.SHEET_SCHEMAS.BOOKING_AVAILABILITY_AUDIT;
      const ready = schedulePhase2AssertHeaders("BOOKING_AVAILABILITY_AUDIT", schema);
      ready.sheet.appendRow(ready.headers.map(header => schema.includes(header) ? schedulePhase2CellValue(header, audit) : ""));
      SpreadsheetApp.flush();
      const verified = staffSettlementClassify(record);
      if (verified.blocking || staffSettlementHash(verified.evidence) !== staffSettlementHash(evidence))
        throw staffTransactionError("BLOCKED_CONFLICT", "Settlement persistence is unproven; manual review required.");
      return jsonOutput({ status: "success", code: "SETTLED", transactionId: identity.transactionId });
    });
  } catch (error) { return staffTransactionResultError(error); }
}

