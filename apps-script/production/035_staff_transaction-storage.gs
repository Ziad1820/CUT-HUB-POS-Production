function staffTransactionSave(record) {
  record.updatedAt = bookingAvailabilityPhase5Now();
  // Bound each JSON cell before the write; Sheets has a per-cell size limit.
  ["beforeState", "businessState", "versionState", "auditState", "result", "compensationState"].forEach(key => {
    if (JSON.stringify(record[key]).length > 45000) throw new Error("STAFF transaction snapshot exceeds safe cell capacity.");
  });
  bookingAvailabilityPhase5SaveTransaction(record);
  SpreadsheetApp.flush();
  const matches = staffTransactionRecords().filter(item => item.transactionId === record.transactionId);
  if (matches.length !== 1) throw new Error("STAFF transaction persistence is unproven.");
  const saved = matches[0];
  Object.keys(record).forEach(key => {
    if (JSON.stringify(saved[key]) !== JSON.stringify(record[key])) throw new Error("STAFF transaction persistence verification failed: " + key);
  });
  return saved;
}

function staffTransactionCell(value) {
  return Object.prototype.toString.call(value) === "[object Date]"
    ? { date: value.toISOString() } : { value };
}

function staffTransactionValue(cell) {
  return Object.prototype.hasOwnProperty.call(cell, "date") ? new Date(cell.date) : cell.value;
}

// Comparison only: v2 seals and raw row/intent payloads retain their original representation.
function canonicalizeRecoveryDateValue_(value) {
  const invalid = () => { throw new Error("Invalid or ambiguous STAFF recovery date; no replay allowed."); };
  if (Object.prototype.toString.call(value) === "[object Date]") {
    if (!Number.isFinite(value.getTime())) return invalid();
    return value.toISOString();
  }
  if (typeof value !== "string") return invalid();
  const iso = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  const cairo = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(value);
  const parts = iso || cairo;
  if (!parts) return invalid();
  // Validate calendar/time components before parsing; Date.parse can roll invalid days forward.
  const wall = new Date(0);
  wall.setUTCFullYear(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
  wall.setUTCHours(Number(parts[4]), Number(parts[5]), Number(parts[6]), iso ? Number((parts[7] || "").padEnd(3, "0")) : 0);
  const wallText = wall.toISOString();
  if (wallText.slice(0, 19) !== parts[1] + "-" + parts[2] + "-" + parts[3] + "T" + parts[4] + ":" + parts[5] + ":" + parts[6])
    return invalid();
  if (iso) {
    if (parts[8] !== "Z" && (Number(parts[8].slice(1, 3)) > 14 || Number(parts[8].slice(4)) > 59 ||
        (Number(parts[8].slice(1, 3)) === 14 && Number(parts[8].slice(4)) !== 0) || parts[8] === "-00:00")) return invalid();
    const instant = new Date(value);
    if (!Number.isFinite(instant.getTime())) return invalid();
    return instant.toISOString();
  }
  // getCairoDateTime's exact persisted format, interpreted in the explicit backend zone.
  // Sample offsets on both sides of a Cairo DST boundary, then round-trip every candidate.
  // A skipped wall time has zero matches; an overlapping wall time has two and is rejected.
  if (TIME_ZONE !== "Africa/Cairo") return invalid();
  const offsets = new Set([-36, 0, 36].map(hours => {
    const offset = Utilities.formatDate(new Date(wall.getTime() + hours * 3600000), TIME_ZONE, "Z");
    if (!/^[+-]\d{4}$/.test(offset)) return invalid();
    return (offset[0] === "-" ? -1 : 1) * (Number(offset.slice(1, 3)) * 60 + Number(offset.slice(3)));
  }));
  const matches = Array.from(offsets).map(minutes => new Date(wall.getTime() - minutes * 60000))
    .filter(date => Utilities.formatDate(date, TIME_ZONE, "yyyy-MM-dd HH:mm:ss") === value);
  if (matches.length !== 1) return invalid();
  return matches[0].toISOString();
}

function staffTransactionComparisonCell_(cell, header, allowSealedBlank) {
  header = staffCanonicalHeader_(header);
  if (header !== "CREATED_AT" && header !== "UPDATED_AT") return JSON.stringify(cell);
  // Preserve an existing sealed blank preimage; a newly owned timestamp is required.
  if (allowSealedBlank && cell.value === "") return JSON.stringify(cell);
  return JSON.stringify({ date: canonicalizeRecoveryDateValue_(staffTransactionValue(cell)) });
}

function staffTransactionMatchesNext_(values, plan) {
  return values.length === plan.next.length && values.every((value, index) =>
    staffTransactionComparisonCell_(staffTransactionCell(value), plan.headers[index],
      !plan.columns.includes(index + 1) && plan.row[index].value === "") ===
    staffTransactionComparisonCell_(plan.next[index], plan.headers[index],
      !plan.columns.includes(index + 1) && plan.row[index].value === ""));
}

function staffTransactionPlan(sheet, rowNumber, updates, createRow) {
  const width = sheet.getLastColumn();
  const exists = rowNumber <= sheet.getLastRow();
  const values = exists ? sheet.getRange(rowNumber, 1, 1, width).getValues()[0] : Array(width).fill("");
  const formulas = values.map((_, index) => exists ? sheet.getRange(rowNumber, index + 1).getFormula() : "");
  const next = values.slice();
  const columns = createRow ? createRow.map((_, index) => index + 1) : updates.map(update => update.column);
  // A literal formula-like string cannot be safely restored with setValue.
  // Reject this unsupported preimage before INTENT or business mutation.
  if (columns.some(column => !formulas[column - 1] && typeof values[column - 1] === "string" &&
      values[column - 1].startsWith("="))) throw new Error("STAFF preimage requires operator review before mutation.");
  if (createRow) createRow.forEach((value, index) => { next[index] = value; });
  else updates.forEach(update => { next[update.column - 1] = update.next; });
  return { staffContract: 2, rowNumber, create: !!createRow, columns,
    headers: sheet.getRange(1, 1, 1, width).getValues()[0],
    row: values.map(staffTransactionCell), formulas, next: next.map(staffTransactionCell) };
}

function staffTransactionVerifyRow(plan, restored) {
  const sheet = getStaffSheet();
  if (!plan || plan.staffContract !== 2 || !Number.isInteger(plan.rowNumber) || plan.rowNumber < 2 ||
      typeof plan.create !== "boolean" || !Array.isArray(plan.headers) || !plan.headers.length ||
      !Array.isArray(plan.row) || !Array.isArray(plan.next) || !Array.isArray(plan.formulas) ||
      !Array.isArray(plan.columns) || [plan.row, plan.next, plan.formulas].some(values => values.length !== plan.headers.length) ||
      new Set(plan.columns).size !== plan.columns.length || plan.columns.some(column =>
        !Number.isInteger(column) || column < 1 || column > plan.headers.length) ||
      (plan.create && (plan.columns.length !== plan.headers.length || plan.row.some(cell => cell.value !== ""))) ||
      plan.formulas.some(value => typeof value !== "string")) throw new Error("Malformed STAFF recovery plan; no replay allowed.");
  [plan.row, plan.next].forEach(cells => cells.forEach(cell => {
    if (!cell || Object.keys(cell).length !== 1 ||
        !(Object.prototype.hasOwnProperty.call(cell, "value") &&
          ["string", "number", "boolean"].includes(typeof cell.value) &&
          (typeof cell.value !== "number" || Number.isFinite(cell.value))) &&
        !(typeof cell.date === "string" && new Date(cell.date).toISOString() === cell.date))
      throw new Error("Malformed STAFF cell snapshot; no replay allowed.");
  }));
  if (JSON.stringify(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]) !== JSON.stringify(plan.headers))
    throw new Error("STAFF recovery schema drift; no replay allowed.");
  if (plan.row.some((cell, index) => !plan.columns.includes(index + 1) &&
      JSON.stringify(cell) !== JSON.stringify(plan.next[index])) ||
      (plan.create && plan.formulas.some(formula => formula !== "")))
    throw new Error("STAFF intent changes unowned cells; no replay allowed.");
  const current = sheet.getRange(plan.rowNumber, 1, 1, plan.headers.length).getValues()[0];
  current.forEach((value, index) => {
    const header = plan.headers[index];
    const changed = plan.columns.indexOf(index + 1) !== -1;
    const blankPreimage = plan.row[index].value === "";
    const cell = staffTransactionComparisonCell_(staffTransactionCell(value), header, blankPreimage);
    const before = staffTransactionComparisonCell_(plan.row[index], header, blankPreimage);
    const after = staffTransactionComparisonCell_(plan.next[index], header, !changed && blankPreimage);
    const formula = sheet.getRange(plan.rowNumber, index + 1).getFormula();
    if (restored ? cell !== before || formula !== plan.formulas[index]
        : !((cell === before && formula === plan.formulas[index]) ||
            (changed && cell === after && formula === ""))) {
      throw new Error("STAFF row diverged from durable intent; no replay allowed.");
    }
  });
}

function staffTransactionRestore(plan) {
  staffTransactionVerifyRow(plan, false);
  const sheet = getStaffSheet();
  if (plan.create) sheet.getRange(plan.rowNumber, 1, 1, plan.headers.length).clearContent();
  else plan.columns.slice().reverse().forEach(column => {
    const range = sheet.getRange(plan.rowNumber, column);
    const formula = plan.formulas[column - 1];
    const value = staffTransactionValue(plan.row[column - 1]);
    if (formula) range.setFormula(formula);
    else if (typeof value === "string" && value.startsWith("=")) {
      throw new Error("Literal formula-like value needs operator recovery; refusing reinterpretation.");
    } else range.setValue(value);
  });
  SpreadsheetApp.flush();
  staffTransactionVerifyRow(plan, true);
}

function staffLifecycleTransaction(data, actor, id, branchId, action, plan, write) {
  staffTransactionGuard();
  staffTransactionVerifyRow(plan, true);
  const requestId = String(data.clientRequestId || Utilities.getUuid());
  if (!bookingAvailabilityPhase5ValidRequestId(requestId)) throw new Error("A valid STAFF request ID is required.");
  if (staffTransactionRecords().some(record => record.requestId === requestId))
    throw staffTransactionError("STAFF_REQUEST_REUSED", "STAFF request IDs cannot be reused. Reload and use a new request.");
  const identity = bookingAvailabilityPhase5AssertIdentity();
  const record = { transactionId: "BAT-" + Utilities.getUuid(), requestId, action,
    entityType: "STAFF_MEMBERSHIP", entityId: id, branchId, date: "", actorId: actor.actorId || "",
    environment: identity.config.environment, createdAt: bookingAvailabilityPhase5Now(),
    status: "INTENT", writeBoundary: "INTENT", beforeState: plan,
    businessState: {}, versionState: {}, auditState: {}, result: {},
    errorCode: "", errorMessage: "", compensationState: {}, recoveryRequired: false };
  if (schedulePhase2ReadRows("BOOKING_AVAILABILITY_TRANSACTIONS").some(item => item.transactionId === record.transactionId))
    throw new Error("STAFF transaction ID collision; no changes saved.");
  plan.staffIntegrity = staffTransactionIntegrity(record);
  // An unproven INTENT never reaches business writes.
  staffTransactionSave(record);
  let businessAttempted = false, metadataAttempted = false, finalAttempted = false;
  try {
    record.status = "BUSINESS_STARTED"; record.writeBoundary = "BUSINESS_STARTED";
    staffTransactionSave(record);
    businessAttempted = true;
    const result = write();
    staffTransactionVerifyRow(plan, false);
    const savedRow = getStaffSheet().getRange(plan.rowNumber, 1, 1, plan.headers.length).getValues()[0];
    if (!staffTransactionMatchesNext_(savedRow, plan)) throw new Error("STAFF business write verification failed.");
    record.businessState = result; record.status = "BUSINESS_WRITTEN"; record.writeBoundary = "BUSINESS";
    staffTransactionSave(record);
    metadataAttempted = true;
    record.versionState = bookingAvailabilityPhase5IncrementGeneration("staffMembership", "GLOBAL", "GLOBAL", actor, requestId) || {};
    SpreadsheetApp.flush();
    record.status = "VERSION_WRITTEN"; record.writeBoundary = "VERSION"; staffTransactionSave(record);
    record.auditState = bookingAvailabilityPhase5AppendAudit({ auditId: "BAU-" + record.transactionId,
      action, entityType: "STAFF_MEMBERSHIP", entityId: id, actorId: actor.actorId, actorRole: actor.role,
      reasonCode: "STAFF_MEMBERSHIP", beforeState: { transactionId: record.transactionId },
      afterState: { staffId: id, branchId }, requestId }) || {};
    SpreadsheetApp.flush();
    // These writers do not verify persistence themselves. Read their rows before committing.
    staffTransactionVerifyMetadata(record);
    record.status = "AUDIT_WRITTEN"; record.writeBoundary = "AUDIT"; staffTransactionSave(record);
    record.result = result; record.status = "COMMITTED"; record.writeBoundary = "RESULT";
    finalAttempted = true;
    staffTransactionSave(record);
    return result;
  } catch (error) {
    let restored = !businessAttempted;
    try { if (businessAttempted && !finalAttempted) { staffTransactionRestore(plan); restored = true; } } catch (_rollbackError) {}
    // Version/audit side effects may have happened even when their writers threw.
    record.status = restored && !metadataAttempted ? "COMPENSATED" : "RECOVERY_REQUIRED";
    record.recoveryRequired = record.status !== "COMPENSATED";
    record.writeBoundary = "FAILED"; record.result = {};
    record.errorCode = error.code || "STAFF_TRANSACTION_FAILED"; record.errorMessage = error.message;
    record.compensationState = { completed: restored, metadataUncertain: metadataAttempted };
    try { staffTransactionSave(record); } catch (_markerError) {
      // The verified INTENT/BUSINESS_STARTED snapshot remains the fallback recovery marker.
      record.recoveryRequired = true;
    }
    throw staffTransactionError(record.recoveryRequired ? "STAFF_RECOVERY_REQUIRED" : "STAFF_TRANSACTION_FAILED",
      record.recoveryRequired ? "STAFF transaction is uncertain. Owner recovery is required." : error.message, record.transactionId);
  }
}

