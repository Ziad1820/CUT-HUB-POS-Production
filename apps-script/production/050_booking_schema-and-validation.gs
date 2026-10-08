const BOOKING_HEADERS_V2 = [
  "ID", "DATE", "TIME", "CUSTOMER", "PHONE", "EMPLOYEE", "SERVICE", "NOTE", "STATUS",
  "CREATED_AT", "UPDATED_AT", "SERVICE_ID", "DURATION_MINUTES", "SOURCE", "TRACKING_TOKEN",
  "REQUESTED_AT", "CONFIRMED_AT", "CONFIRMED_BY", "REJECTION_REASON", "PROPOSED_DATE",
  "PROPOSED_TIME", "HOLD_EXPIRES_AT", "CUSTOMER_RESPONSE", "EMPLOYEE_ID",
  "CANCELLED_AT", "CANCELLED_BY", "CANCELLATION_REASON", "COMPLETED_AT", "COMPLETED_BY",
  "DELETED", "DELETED_AT", "DELETED_BY", "SERVICE_IDS", "TOTAL_PRICE", "DELETION_REASON",
  "CLIENT_REQUEST_ID", "CLIENT_REQUEST_FINGERPRINT",
  "BRANCH_ID", "AVAILABILITY_TOKEN", "SCHEDULE_VERSION",
  "ATTENDANCE_OPERATIONAL_VERSION", "OPERATIONAL_OVERRIDE_ID",
  "VALIDATED_AT", "VALIDATION_SOURCE_VERSION", "SERVICE_DURATION_SNAPSHOT",
  "PREPARATION_MINUTES_SNAPSHOT", "CLEANUP_MINUTES_SNAPSHOT",
  "OCCUPIED_START_TIME", "OCCUPIED_END_TIME", "SERVICE_CONFIGURATION_VERSION"
];

const BOOKING_SLOT_INTERVAL_MINUTES = 30;
const MAX_BOOKING_DURATION_MINUTES = 12 * 60;
const MAX_BOOKING_TOTAL_PRICE = 1000000;
const BOOKING_LOCK_WAIT_MS = 10000;
const PUBLIC_RATING_MINIMUM_COUNT = 5;

// Canonical policy for user/operator-controlled booking and rating free text:
// trim only the outer whitespace boundary, preserve meaningful whitespace inside,
// and leave formula safety to the explicit stringValue sheet writer.
function normalizeProtectedText(value, maxLength) {
  let text = String(value == null ? "" : value).trim();
  if (Number.isFinite(Number(maxLength)) && Number(maxLength) >= 0) {
    text = text.slice(0, Number(maxLength)).replace(/\s+$/, "");
  }
  return text;
}

function parseServiceActiveFlag(value) {
  if (value === null || value === undefined || String(value).trim() === "") return true;
  if (value === false || value === 0) return false;
  if (value === true || value === 1) return true;
  const normalized = String(value).trim().toUpperCase();
  if (normalized === "FALSE" || normalized === "0") return false;
  if (normalized === "TRUE" || normalized === "1") return true;
  return false;
}

function bookingApiError(code, message) {
  return jsonOutput({ status: "error", code, message });
}

function bookingErrorResponse(error, fallbackCode) {
  return jsonOutput({
    status: "error",
    code: (error && error.code) || fallbackCode || "BOOKING_INTERNAL_ERROR",
    message: (error && error.message) || "Booking request failed.",
    ...((error && error.details) ? { details: error.details } : {})
  });
}

function bookingPublicErrorResponse(error, fallbackCode) {
  return jsonOutput({
    status: "error",
    code: (error && error.code) || fallbackCode || "BOOKING_PUBLIC_ERROR",
    message: (error && error.message) || "Booking request failed."
  });
}

function bookingMutationDiagnostic(event, details) {
  const safeDetails = details || {};
  const payload = {
    event,
    executionId: safeDetails.executionId || "",
    lockRequestedAt: safeDetails.lockRequestedAt || "",
    lockAcquiredAt: safeDetails.lockAcquiredAt || "",
    lockReleasedAt: safeDetails.lockReleasedAt || "",
    bookingRequestId: safeDetails.bookingRequestId || "",
    employeeId: safeDetails.employeeId || "",
    date: safeDetails.date || "",
    time: safeDetails.time || "",
    durationMinutes: Number(safeDetails.durationMinutes) || 0
  };
  try { Logger.log(JSON.stringify(payload)); } catch (ignore) {}
}

function withBookingMutationLock(details, callback) {
  const lock = LockService.getScriptLock();
  const diagnostic = {
    executionId: `EXEC-${Utilities.getUuid()}`,
    lockRequestedAt: new Date().toISOString(),
    bookingRequestId: String((details && details.bookingRequestId) || "").trim(),
    employeeId: String((details && details.employeeId) || "").trim(),
    date: String((details && details.date) || "").trim(),
    time: String((details && details.time) || "").trim(),
    durationMinutes: Number(details && details.durationMinutes) || 0
  };
  let acquired = false;
  bookingMutationDiagnostic("booking_lock_requested", diagnostic);
  try {
    if (typeof lock.tryLock === "function") {
      acquired = lock.tryLock(BOOKING_LOCK_WAIT_MS);
    } else {
      lock.waitLock(BOOKING_LOCK_WAIT_MS);
      acquired = true;
    }
    if (!acquired) {
      bookingMutationDiagnostic("booking_lock_timeout", diagnostic);
      return bookingApiError("BOOKING_LOCK_TIMEOUT", "The booking system is busy. Please retry this request.");
    }
    diagnostic.lockAcquiredAt = new Date().toISOString();
    bookingMutationDiagnostic("booking_lock_acquired", diagnostic);
    return callback(diagnostic);
  } catch (error) {
    if (!acquired && /lock|timeout/i.test(String(error && error.message || error))) {
      bookingMutationDiagnostic("booking_lock_timeout", diagnostic);
      return bookingApiError("BOOKING_LOCK_TIMEOUT", "The booking system is busy. Please retry this request.");
    }
    throw error;
  } finally {
    if (acquired) {
      diagnostic.lockReleasedAt = new Date().toISOString();
      try { lock.releaseLock(); } finally {
        bookingMutationDiagnostic("booking_lock_released", diagnostic);
      }
    }
  }
}

function isStrictBookingTime(value) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(normalizeDigits(String(value || "").trim()));
}

function isValidBookingDateKey(value) {
  const text = normalizeDigits(String(value || "").trim());
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 2000 || month < 1 || month > 12 || day < 1) return false;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth;
}

function isValidBookingDuration(value) {
  const duration = Number(value);
  return Number.isFinite(duration) && Number.isInteger(duration) &&
    duration >= 15 && duration <= MAX_BOOKING_DURATION_MINUTES;
}

function isValidBookingPrice(value) {
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 && price <= MAX_BOOKING_TOTAL_PRICE;
}

function generateUniqueBookingIdV2(bookings) {
  const existingIds = new Set((bookings || []).map((booking) => String(booking.id || "").trim()));
  for (let attempt = 0; attempt < 50; attempt++) {
    const id = `BOOK-${Utilities.getUuid()}`;
    if (!existingIds.has(id)) return id;
  }
  throw new Error("Could not create a unique booking ID. Please try again.");
}

const BARBER_SCHEDULE_HEADERS = [
  "SCHEDULE_ID", "STAFF_ID", "STAFF_NAME", "WEEKDAY", "SHIFT_START", "SHIFT_END", "ACTIVE", "UPDATED_AT"
];

