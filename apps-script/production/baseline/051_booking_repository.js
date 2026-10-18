function ensureBookingHeadersV2(sheet) {
  const existingWidth = Math.max(1, sheet.getLastColumn());
  const current = sheet.getRange(1, 1, 1, existingWidth).getValues()[0];
  const existingKeys = {};
  current.forEach((header) => { if (header) existingKeys[canonicalBookingHeaderKey(header)] = true; });
  const missing = BOOKING_HEADERS_V2.filter((header) => !existingKeys[canonicalBookingHeaderKey(header)]);
  if (!missing.length) return;
  const hasHeaders = current.some((header) => String(header || "").trim());
  const startColumn = hasHeaders ? existingWidth + 1 : 1;
  const neededWidth = startColumn + missing.length - 1;
  if (sheet.getMaxColumns() < neededWidth) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), neededWidth - sheet.getMaxColumns());
  }
  sheet.getRange(1, startColumn, 1, missing.length).setValues([missing]);
}

function normalizeBookingHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function canonicalBookingHeaderKey(value) {
  const key = normalizeBookingHeader(value);
  return ({
    bookingid: "id",
    bookingdate: "date",
    bookingtime: "time",
    customername: "customer",
    customerphone: "phone",
    barber: "employee",
    employeename: "employee",
    services: "service",
    notes: "note",
    duration: "durationminutes",
    trackingcode: "trackingtoken",
    staffid: "employeeid"
  })[key] || key;
}

function getBookingHeadersV2(sheet) {
  const width = Math.max(1, sheet.getLastColumn());
  return sheet.getRange(1, 1, 1, width).getValues()[0].map((header) => String(header || "").trim());
}

function bookingHeaderIndexV2(headers, name, aliases) {
  const keys = [name].concat(aliases || []).map(canonicalBookingHeaderKey);
  return headers.findIndex((header) => keys.indexOf(canonicalBookingHeaderKey(header)) !== -1);
}

function bookingRowValueV2(row, headers, name, aliases) {
  const index = bookingHeaderIndexV2(headers, name, aliases);
  return index >= 0 ? row[index] : "";
}

function setBookingRowValueV2(row, headers, name, value, aliases) {
  const index = bookingHeaderIndexV2(headers, name, aliases);
  if (index >= 0) row[index] = value;
}

function getBookingsSheetV2() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("Bookings");
  if (!sheet) throw new Error("Sheet Bookings not found");
  ensureBookingHeadersV2(sheet);
  return sheet;
}

function getBookingsSheetV2ReadOnly() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("Bookings");
  if (!sheet) {
    throw schemaContractError(
      "BOOKING_SCHEMA_NOT_READY", "Sheet Bookings not found.", { sheetName: "Bookings" });
  }
  inspectNamedSheetSchema(sheet, {
    sheetName: "Bookings",
    label: "Bookings",
    expectedHeaders: BOOKING_HEADERS_V2,
    canonicalize: canonicalBookingHeaderKey,
    notReadyCode: "BOOKING_SCHEMA_NOT_READY",
    duplicateCode: "BOOKING_SCHEMA_DUPLICATE_HEADERS"
  });
  return sheet;
}

function getBarberScheduleSheet() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName("BARBER_SCHEDULE");
  if (!sheet) sheet = ss.insertSheet("BARBER_SCHEDULE");

  if (sheet.getMaxColumns() < BARBER_SCHEDULE_HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), BARBER_SCHEDULE_HEADERS.length - sheet.getMaxColumns());
  }
  const current = sheet.getRange(1, 1, 1, BARBER_SCHEDULE_HEADERS.length).getValues()[0];
  if (!current.some((value) => String(value || "").trim())) {
    sheet.getRange(1, 1, 1, BARBER_SCHEDULE_HEADERS.length).setValues([BARBER_SCHEDULE_HEADERS]);
  }
  return sheet;
}

function getBarberScheduleSheetReadOnly() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("BARBER_SCHEDULE");
  if (!sheet) {
    throw schemaContractError(
      "BARBER_SCHEDULE_SCHEMA_NOT_READY", "Sheet BARBER_SCHEDULE not found.",
      { sheetName: "BARBER_SCHEDULE" });
  }
  inspectPositionalSheetSchema(sheet, {
    sheetName: "BARBER_SCHEDULE",
    label: "BARBER_SCHEDULE",
    contract: BARBER_SCHEDULE_HEADERS.map((header) => ({ name: header, aliases: [header] })),
    notReadyCode: "BARBER_SCHEDULE_SCHEMA_NOT_READY",
    incompatibleCode: "BARBER_SCHEDULE_SCHEMA_INCOMPATIBLE",
    duplicateCode: "BARBER_SCHEDULE_SCHEMA_DUPLICATE_HEADERS"
  });
  return sheet;
}

function normalizeBookingStatusV2(value) {
  const status = String(value || "pending").trim().toLowerCase();
  if (status === "completed") return "done";
  return ["pending", "confirmed", "proposed", "rejected", "done", "cancelled", "expired"].indexOf(status) !== -1
    ? status
    : "pending";
}

function isRecognizedBookingStatusV2(value) {
  return ["pending", "confirmed", "proposed", "rejected", "done", "completed", "cancelled", "expired"]
    .indexOf(String(value || "").trim().toLowerCase()) !== -1;
}

function bookingFromRowV2(row, rowNumber, headers) {
  headers = headers || BOOKING_HEADERS_V2;
  const value = (name, aliases) => bookingRowValueV2(row, headers, name, aliases);
  const id = String(value("ID", ["BOOKING_ID"]) || "").trim() || `BOOK-${rowNumber}`;
  return {
    id,
    bookingId: id,
    rowNumber,
    date: getDateKey(value("DATE", ["BOOKING_DATE"]), TIME_ZONE) || String(value("DATE", ["BOOKING_DATE"]) || "").trim(),
    time: getBookingTimeValue(value("TIME", ["BOOKING_TIME"])),
    customerName: normalizeProtectedText(value("CUSTOMER", ["CUSTOMER_NAME"]), 100),
    customerPhone: String(value("PHONE", ["CUSTOMER_PHONE"]) || "").trim(),
    employee: normalizeProtectedText(value("EMPLOYEE", ["BARBER", "EMPLOYEE_NAME"]), 100),
    service: normalizeProtectedText(value("SERVICE", ["SERVICES"]), 500),
    note: normalizeProtectedText(value("NOTE", ["NOTES"]), 500),
    status: normalizeBookingStatusV2(value("STATUS")),
    createdAt: getDisplayDateTime(value("CREATED_AT")),
    updatedAt: getDisplayDateTime(value("UPDATED_AT")),
    serviceId: String(value("SERVICE_ID") || "").trim(),
    serviceIds: String(value("SERVICE_IDS") || value("SERVICE_ID") || "").split(",").map((item) => item.trim()).filter(Boolean),
    durationMinutes: Math.max(15, Number(value("DURATION_MINUTES", ["DURATION"])) || 30),
    totalPrice: Number(value("TOTAL_PRICE")) || 0,
    source: String(value("SOURCE") || "staff").trim(),
    trackingToken: String(value("TRACKING_TOKEN", ["TRACKING_CODE"]) || "").trim(),
    requestedAt: getDisplayDateTime(value("REQUESTED_AT")),
    confirmedAt: getDisplayDateTime(value("CONFIRMED_AT")),
    confirmedBy: normalizeProtectedText(value("CONFIRMED_BY"), 100),
    rejectionReason: normalizeProtectedText(value("REJECTION_REASON"), 500),
    proposedDate: getDateKey(value("PROPOSED_DATE"), TIME_ZONE) || String(value("PROPOSED_DATE") || "").trim(),
    proposedTime: getBookingTimeValue(value("PROPOSED_TIME")),
    holdExpiresAt: String(value("HOLD_EXPIRES_AT") || "").trim(),
    customerResponse: String(value("CUSTOMER_RESPONSE") || "").trim(),
    employeeId: String(value("EMPLOYEE_ID", ["STAFF_ID"]) || "").trim(),
    cancelledAt: getDisplayDateTime(value("CANCELLED_AT")),
    cancelledBy: normalizeProtectedText(value("CANCELLED_BY"), 100),
    cancellationReason: normalizeProtectedText(value("CANCELLATION_REASON"), 500),
    completedAt: getDisplayDateTime(value("COMPLETED_AT")),
    completedBy: normalizeProtectedText(value("COMPLETED_BY"), 100),
    deleted: parseSheetBoolean(value("DELETED"), false),
    deletedAt: getDisplayDateTime(value("DELETED_AT")),
    deletedBy: normalizeProtectedText(value("DELETED_BY"), 100),
    deletionReason: normalizeProtectedText(value("DELETION_REASON"), 500),
    clientRequestId: String(value("CLIENT_REQUEST_ID") || "").trim(),
    clientRequestFingerprint: String(value("CLIENT_REQUEST_FINGERPRINT") || "").trim(),
    branchId: String(value("BRANCH_ID") || "").trim(),
    availabilityToken: String(value("AVAILABILITY_TOKEN") || "").trim(),
    scheduleVersion: Number(value("SCHEDULE_VERSION")) || 0,
    attendanceOperationalVersion: Number(value("ATTENDANCE_OPERATIONAL_VERSION")) || 0,
    operationalOverrideId: String(value("OPERATIONAL_OVERRIDE_ID") || "").trim(),
    validatedAt: String(value("VALIDATED_AT") || "").trim(),
    validationSourceVersion: String(value("VALIDATION_SOURCE_VERSION") || "").trim(),
    serviceDurationSnapshot: Number(value("SERVICE_DURATION_SNAPSHOT")) ||
      Math.max(15, Number(value("DURATION_MINUTES", ["DURATION"])) || 30),
    preparationMinutesSnapshot: Math.max(0, Number(value("PREPARATION_MINUTES_SNAPSHOT")) || 0),
    cleanupMinutesSnapshot: Math.max(0, Number(value("CLEANUP_MINUTES_SNAPSHOT")) || 0),
    occupiedStartTime: String(value("OCCUPIED_START_TIME") || "").trim(),
    occupiedEndTime: String(value("OCCUPIED_END_TIME") || "").trim(),
    serviceConfigurationVersion: String(value("SERVICE_CONFIGURATION_VERSION") || "").trim()
  };
}

function bookingToRowV2(booking, headers, existingRow) {
  headers = headers || BOOKING_HEADERS_V2;
  const row = existingRow ? existingRow.slice() : new Array(headers.length).fill("");
  const values = {
    ID: booking.id, DATE: booking.date, TIME: booking.time,
    CUSTOMER: normalizeProtectedText(booking.customerName, 100),
    PHONE: booking.customerPhone,
    EMPLOYEE: normalizeProtectedText(booking.employee, 100),
    SERVICE: normalizeProtectedText(booking.service, 500),
    NOTE: normalizeProtectedText(booking.note, 500),
    STATUS: booking.status, CREATED_AT: booking.createdAt, UPDATED_AT: booking.updatedAt,
    SERVICE_ID: booking.serviceId, DURATION_MINUTES: booking.durationMinutes, SOURCE: booking.source,
    TRACKING_TOKEN: booking.trackingToken, REQUESTED_AT: booking.requestedAt, CONFIRMED_AT: booking.confirmedAt,
    CONFIRMED_BY: normalizeProtectedText(booking.confirmedBy, 100),
    REJECTION_REASON: normalizeProtectedText(booking.rejectionReason, 500),
    PROPOSED_DATE: booking.proposedDate,
    PROPOSED_TIME: booking.proposedTime, HOLD_EXPIRES_AT: booking.holdExpiresAt, CUSTOMER_RESPONSE: booking.customerResponse,
    EMPLOYEE_ID: booking.employeeId, CANCELLED_AT: booking.cancelledAt,
    CANCELLED_BY: normalizeProtectedText(booking.cancelledBy, 100),
    CANCELLATION_REASON: normalizeProtectedText(booking.cancellationReason, 500),
    COMPLETED_AT: booking.completedAt,
    COMPLETED_BY: normalizeProtectedText(booking.completedBy, 100),
    DELETED: booking.deleted === true, DELETED_AT: booking.deletedAt,
    DELETED_BY: normalizeProtectedText(booking.deletedBy, 100),
    SERVICE_IDS: Array.isArray(booking.serviceIds) ? booking.serviceIds.join(",") : (booking.serviceIds || booking.serviceId || ""),
    TOTAL_PRICE: Number(booking.totalPrice) || 0,
    DELETION_REASON: normalizeProtectedText(booking.deletionReason, 500),
    CLIENT_REQUEST_ID: booking.clientRequestId, CLIENT_REQUEST_FINGERPRINT: booking.clientRequestFingerprint,
    BRANCH_ID: booking.branchId, AVAILABILITY_TOKEN: booking.availabilityToken,
    SCHEDULE_VERSION: booking.scheduleVersion,
    ATTENDANCE_OPERATIONAL_VERSION: booking.attendanceOperationalVersion,
    OPERATIONAL_OVERRIDE_ID: booking.operationalOverrideId,
    VALIDATED_AT: booking.validatedAt,
    VALIDATION_SOURCE_VERSION: booking.validationSourceVersion,
    SERVICE_DURATION_SNAPSHOT: booking.serviceDurationSnapshot,
    PREPARATION_MINUTES_SNAPSHOT: booking.preparationMinutesSnapshot,
    CLEANUP_MINUTES_SNAPSHOT: booking.cleanupMinutesSnapshot,
    OCCUPIED_START_TIME: booking.occupiedStartTime,
    OCCUPIED_END_TIME: booking.occupiedEndTime,
    SERVICE_CONFIGURATION_VERSION: booking.serviceConfigurationVersion
  };
  Object.keys(values).forEach((name) => setBookingRowValueV2(row, headers, name, values[name]));
  return row;
}

function writeBookingRowV2(sheet, rowNumber, booking, existingRow) {
  const headers = getBookingHeadersV2(sheet);
  const row = bookingToRowV2(booking, headers, existingRow);
  writeSheetRowWithExplicitValues(sheet, rowNumber, row);
  return row;
}

function appendBookingRowV2(sheet, booking) {
  const rowNumber = sheet.getLastRow() + 1;
  return { rowNumber, row: writeBookingRowV2(sheet, rowNumber, booking) };
}

function sheetExtendedValue(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return { numberValue: (value.getTime() / 86400000) + 25569 };
  }
  if (typeof value === "boolean") return { boolValue: value };
  if (typeof value === "number" && Number.isFinite(value)) return { numberValue: value };
  return { stringValue: String(value == null ? "" : value) };
}

function writeSheetRowWithExplicitValues(sheet, rowNumber, row) {
  if (!sheet || typeof sheet.getSheetId !== "function" ||
      typeof Sheets === "undefined" || !Sheets.Spreadsheets ||
      typeof Sheets.Spreadsheets.batchUpdate !== "function") {
    const error = new Error("SAFE_SHEET_WRITE_UNAVAILABLE");
    error.code = "SAFE_SHEET_WRITE_UNAVAILABLE";
    error.businessMutationState = "NOT_STARTED";
    throw error;
  }
  const spreadsheet = SpreadsheetApp.getActive();
  if (!spreadsheet || typeof spreadsheet.getId !== "function") {
    const error = new Error("SAFE_SHEET_WRITE_UNAVAILABLE");
    error.code = "SAFE_SHEET_WRITE_UNAVAILABLE";
    error.businessMutationState = "NOT_STARTED";
    throw error;
  }
  Sheets.Spreadsheets.batchUpdate({
    requests: [{
      updateCells: {
        start: {
          sheetId: sheet.getSheetId(),
          rowIndex: Number(rowNumber) - 1,
          columnIndex: 0
        },
        rows: [{
          values: (row || []).map((value) => ({
            userEnteredValue: sheetExtendedValue(value)
          }))
        }],
        fields: "userEnteredValue"
      }
    }]
  }, spreadsheet.getId());
}

