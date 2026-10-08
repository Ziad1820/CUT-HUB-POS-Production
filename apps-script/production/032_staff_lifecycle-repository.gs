// STAFF-01: lifecycle mutations use persisted identities and the existing script lock.
function staffLifecycleSchema(sheet) {
  const headers = staffResolveHeaders_(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
  const required = ["NAME", "CODE", "SALARY", "PERCENTAGE", "ID", "BONUS", "DEDUCTION",
    "ACTIVE", "CREATED_AT", "UPDATED_AT", "IS_BARBER", "BRANCH_ID"];
  required.forEach(header => {
    if (headers.filter(value => value === header).length !== 1) {
      throw new Error(`STAFF schema requires exactly one ${header} column.`);
    }
  });
  // Optional legacy commission is passthrough; ambiguous copies cannot be initialized safely.
  if (headers.filter(value => value === "PRODUCTCOMMISSIONPERCENTAGE").length > 1) {
    throw new Error("STAFF schema permits at most one PRODUCTCOMMISSIONPERCENTAGE column.");
  }
  return headers;
}

function staffLifecycleActor(data, branchId) {
  const actor = schedulePhase2Actor(data);
  if (!actor || (!actor.owner && !(actor.role === "MANAGER" && branchId &&
      Array.isArray(actor.branchIds) && actor.branchIds.indexOf(branchId) !== -1))) {
    throw new Error("Staff member is outside your permitted branch scope.");
  }
  return actor;
}

function staffLifecycleText(value, field) {
  if (typeof value !== "string" || /[\u0000-\u001f\u007f]/.test(value)) throw new Error(`Invalid ${field}.`);
  const text = value.trim();
  if (!text || /^[=+\-@]/.test(text)) throw new Error(`Invalid ${field}.`);
  return text;
}

function staffLifecycleNumber(value, field, percentage) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || (percentage && value > 100)) {
    throw new Error(`Invalid ${field}.`);
  }
  return value;
}

