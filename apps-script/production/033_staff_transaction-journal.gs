// STAFF-only durable adapter. Booking's shared runner and recovery remain unchanged.
function staffTransactionError(code, message, transactionId) {
  const error = new Error(message);
  error.code = code;
  error.details = { recoveryRequired: code === "STAFF_RECOVERY_REQUIRED", transactionId: transactionId || "" };
  return error;
}

function staffTransactionResultError(error) {
  return jsonOutput({ status: "error", code: error.code || "STAFF_TRANSACTION_FAILED",
    message: error.message, recoveryRequired: !!(error.details && error.details.recoveryRequired),
    transactionId: error.details && error.details.transactionId || "" });
}

function staffTransactionStore() {
  if (typeof bookingAvailabilityPhase5SaveTransaction !== "function" ||
      typeof schedulePhase2ReadRows !== "function") {
    throw staffTransactionError("STAFF_TRANSACTION_STORE_UNAVAILABLE", "Existing transaction storage is required before STAFF writes.");
  }
  // Assert existing schemas only: never prepare/create a store or change flags.
  ["BOOKING_AVAILABILITY_TRANSACTIONS", "BOOKING_AVAILABILITY_GENERATIONS", "BOOKING_AVAILABILITY_AUDIT"]
    .forEach(name => { bookingAvailabilityPhase5RequireSheet(name);
      schedulePhase2AssertHeaders(name, BookingAvailabilityPhase5.SHEET_SCHEMAS[name]); });
}

function staffTransactionRecords() {
  return schedulePhase2ReadRows("BOOKING_AVAILABILITY_TRANSACTIONS")
    .filter(record => /^STAFF_MEMBER_(UPDATE|CREATE|DEACTIVATE)$/.test(record.action));
}

function staffTransactionGuard() {
  staffTransactionStore();
  const unresolved = staffTransactionRecords().find(record => {
    if (!record.beforeState || record.beforeState.staffContract !== 2)
      return staffSettlementClassify(record).blocking;
    return !record.beforeState || record.beforeState.staffContract !== 2 || !staffTransactionIntegrityValid(record) ||
    !["COMMITTED", "COMPENSATED"].includes(record.status) ||
    record.recoveryRequired === true || String(record.recoveryRequired).toUpperCase() === "TRUE" ||
    (record.status === "COMMITTED" && (record.writeBoundary !== "RESULT" ||
      !record.result || JSON.stringify(record.result) !== JSON.stringify(record.businessState)));
  });
  if (unresolved) throw staffTransactionError("STAFF_RECOVERY_REQUIRED",
    "An unresolved STAFF transaction blocks further STAFF writes. Owner recovery is required.", unresolved.transactionId);
}

