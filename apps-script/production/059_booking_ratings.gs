const BOOKING_RATING_HEADERS = [
  "RATING_ID", "BOOKING_ID", "TRACKING_TOKEN", "EMPLOYEE_ID", "EMPLOYEE_NAME",
  "RATING", "COMMENT", "SERVICE", "BOOKING_DATE", "CREATED_AT", "STATUS",
  "CUSTOMER_PHONE_HASH", "UPDATED_AT"
];

function getBookingRatingsSheet() {
  const spreadsheet = SpreadsheetApp.getActive();
  let sheet = spreadsheet.getSheetByName("BOOKING_RATINGS");
  if (!sheet) sheet = spreadsheet.insertSheet("BOOKING_RATINGS");
  const width = Math.max(1, sheet.getLastColumn());
  const headers = sheet.getRange(1, 1, 1, width).getValues()[0];
  const existing = {};
  headers.forEach((header) => { if (header) existing[normalizeBookingHeader(header)] = true; });
  const missing = BOOKING_RATING_HEADERS.filter((header) => !existing[normalizeBookingHeader(header)]);
  if (missing.length) {
    const start = headers.some((header) => String(header || "").trim()) ? width + 1 : 1;
    const needed = start + missing.length - 1;
    if (sheet.getMaxColumns() < needed) sheet.insertColumnsAfter(sheet.getMaxColumns(), needed - sheet.getMaxColumns());
    sheet.getRange(1, start, 1, missing.length).setValues([missing]);
  }
  return sheet;
}

function getBookingRatingsSheetReadOnly(optional) {
  const sheet = SpreadsheetApp.getActive().getSheetByName("BOOKING_RATINGS");
  if (!sheet) {
    if (optional) return null;
    throw schemaContractError(
      "BOOKING_RATINGS_SCHEMA_NOT_READY", "Sheet BOOKING_RATINGS not found.",
      { sheetName: "BOOKING_RATINGS" });
  }
  inspectNamedSheetSchema(sheet, {
    sheetName: "BOOKING_RATINGS",
    label: "BOOKING_RATINGS",
    expectedHeaders: BOOKING_RATING_HEADERS,
    canonicalize: normalizeBookingHeader,
    notReadyCode: "BOOKING_RATINGS_SCHEMA_NOT_READY",
    duplicateCode: "BOOKING_RATINGS_SCHEMA_DUPLICATE_HEADERS"
  });
  return sheet;
}

function initializeBookingStagingEnvironment() {
  assertStagingEnvironment();
  const sheets = [
    getBookingsSheetV2(),
    getBookingRatingsSheet(),
    getBarberScheduleSheet()
  ];
  return {
    environment: "staging",
    spreadsheetId: getCutHubEnvironmentConfig().spreadsheetId,
    sheets: sheets.map((sheet) => ({
      name: sheet.getName(),
      headerCount: Math.max(0, sheet.getLastColumn())
    }))
  };
}

function getRatingHeaders(sheet) {
  return sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0]
    .map((header) => String(header || "").trim());
}

function ratingFromRow(row, headers, rowNumber) {
  const value = (name) => bookingRowValueV2(row, headers, name);
  return {
    rowNumber,
    ratingId: String(value("RATING_ID") || "").trim(),
    bookingId: String(value("BOOKING_ID") || "").trim(),
    trackingToken: String(value("TRACKING_TOKEN") || "").trim(),
    employeeId: String(value("EMPLOYEE_ID") || "").trim(),
    employeeName: normalizeProtectedText(value("EMPLOYEE_NAME"), 100),
    rating: Number(value("RATING")) || 0,
    comment: normalizeProtectedText(value("COMMENT"), 500),
    service: normalizeProtectedText(value("SERVICE"), 500),
    bookingDate: getDateKey(value("BOOKING_DATE"), TIME_ZONE) || String(value("BOOKING_DATE") || "").trim(),
    createdAt: getDisplayDateTime(value("CREATED_AT")),
    status: String(value("STATUS") || "published").trim().toLowerCase(),
    customerPhoneHash: String(value("CUSTOMER_PHONE_HASH") || "").trim(),
    updatedAt: getDisplayDateTime(value("UPDATED_AT"))
  };
}

function ratingToRow(rating, headers, existingRow) {
  const row = existingRow ? existingRow.slice() : new Array(headers.length).fill("");
  const values = {
    RATING_ID: rating.ratingId, BOOKING_ID: rating.bookingId, TRACKING_TOKEN: rating.trackingToken,
    EMPLOYEE_ID: rating.employeeId,
    EMPLOYEE_NAME: normalizeProtectedText(rating.employeeName, 100),
    RATING: rating.rating,
    COMMENT: normalizeProtectedText(rating.comment, 500),
    SERVICE: normalizeProtectedText(rating.service, 500),
    BOOKING_DATE: rating.bookingDate,
    CREATED_AT: rating.createdAt, STATUS: rating.status, CUSTOMER_PHONE_HASH: rating.customerPhoneHash,
    UPDATED_AT: rating.updatedAt
  };
  Object.keys(values).forEach((name) => setBookingRowValueV2(row, headers, name, values[name]));
  return row;
}

function writeBookingRatingRow(sheet, rowNumber, rating, existingRow) {
  const headers = getRatingHeaders(sheet);
  const row = ratingToRow(rating, headers, existingRow);
  writeSheetRowWithExplicitValues(sheet, rowNumber, row);
  return row;
}

function appendBookingRatingRow(sheet, rating) {
  const rowNumber = sheet.getLastRow() + 1;
  return { rowNumber, row: writeBookingRatingRow(sheet, rowNumber, rating) };
}

function getAllBookingRatings() {
  const sheet = getBookingRatingsSheetReadOnly(true);
  if (!sheet) return [];
  if (sheet.getLastRow() < 2) return [];
  const headers = getRatingHeaders(sheet);
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues()
    .map((row, index) => ratingFromRow(row, headers, index + 2));
}

function getActiveBookingRatings(ratings, bookings) {
  const ratingRows = Array.isArray(ratings) ? ratings : getAllBookingRatings();
  const bookingRows = Array.isArray(bookings) ? bookings : getAllBookingsV2();
  const activeBookingIds = new Set(
    bookingRows.filter((booking) => !booking.deleted).map((booking) => String(booking.id || "").trim())
  );
  return ratingRows.filter((rating) => activeBookingIds.has(String(rating.bookingId || "").trim()));
}

function publicRatingView(rating) {
  return {
    ratingId: rating.ratingId,
    bookingId: rating.bookingId,
    employeeId: rating.employeeId,
    employeeName: rating.employeeName,
    rating: rating.rating,
    comment: rating.comment,
    service: rating.service,
    bookingDate: rating.bookingDate,
    createdAt: rating.createdAt,
    status: rating.status
  };
}

function bookingRatingStatusForComment(comment) {
  const text = normalizeProtectedText(comment, 500);
  const blocked = /(fuck|shit|كس\s*م|شرموط|زبال)/i.test(text);
  const repeated = /(.)\1{9,}/i.test(text);
  const suspiciousUrl = /(?:https?:\/\/|www\.|bit\.ly|t\.me\/)/i.test(text);
  return blocked || repeated || suspiciousUrl ? "flagged" : "published";
}

function getRatingSalt() {
  const properties = PropertiesService.getScriptProperties();
  let salt = properties.getProperty("BOOKING_RATING_PHONE_SALT");
  if (!salt) {
    salt = Utilities.getUuid() + Utilities.getUuid();
    properties.setProperty("BOOKING_RATING_PHONE_SALT", salt);
  }
  return salt;
}

function hashBookingPhone(phone) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    `${getRatingSalt()}:${normalizePublicPhone(phone)}`,
    Utilities.Charset.UTF_8
  );
  return digest.map((byte) => (`0${(byte < 0 ? byte + 256 : byte).toString(16)}`).slice(-2)).join("");
}

function submitBookingRating(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const found = findBookingByTrackingToken(data.trackingToken, { forWrite: true });
    if (!found || !verifyBookingTrackingPhone(found.booking, data.phoneLast4)) return trackingVerificationError();
    if (found.booking.status !== "done") {
      return jsonOutput({ status: "error", code: "BOOKING_NOT_COMPLETED", message: "Only completed bookings can be rated." });
    }
    const ratingValue = Number(data.rating);
    if (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return jsonOutput({ status: "error", code: "INVALID_RATING", message: "Rating must be an integer from 1 to 5." });
    }
    const rawComment = normalizeProtectedText(data.comment);
    if (rawComment.length > 500) return jsonOutput({ status: "error", code: "INVALID_RATING", message: "Comment cannot exceed 500 characters." });
    const comment = normalizeProtectedText(rawComment, 500);
    const sheet = getBookingRatingsSheet();
    const headers = getRatingHeaders(sheet);
    const ratings = getAllBookingRatings();
    if (ratings.some((item) => item.bookingId === found.booking.id)) {
      return jsonOutput({ status: "error", code: "RATING_ALREADY_SUBMITTED", message: "A rating was already submitted for this booking." });
    }
    const now = getCairoDateTime();
    const rating = {
      ratingId: `RATE-${Utilities.getUuid()}`, bookingId: found.booking.id,
      trackingToken: found.booking.trackingToken, employeeId: found.booking.employeeId,
      employeeName: found.booking.employee, rating: ratingValue, comment,
      service: found.booking.service, bookingDate: found.booking.date, createdAt: now,
      status: bookingRatingStatusForComment(comment), customerPhoneHash: hashBookingPhone(found.booking.customerPhone),
      updatedAt: now
    };
    appendBookingRatingRow(sheet, rating);
    SpreadsheetApp.flush();
    logActivity({}, "submit", "booking_rating", rating.ratingId, `Submitted rating | Booking: ${rating.bookingId} | Employee: ${rating.employeeName} | Rating ID: ${rating.ratingId}`);
    return jsonOutput({ status: "success", rating: publicRatingView(rating) });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

function getBookingRating(data) {
  try {
    const found = findBookingByTrackingToken(data.trackingToken);
    if (!found || !verifyBookingTrackingPhone(found.booking, data.phoneLast4)) return trackingVerificationError();
    const rating = getAllBookingRatings().find((item) => item.bookingId === found.booking.id);
    return jsonOutput({ status: "success", rating: rating ? publicRatingView(rating) : null });
  } catch (error) {
    return bookingPublicErrorResponse(error, "BOOKING_RATING_READ_FAILED");
  }
}

function calculateBarberRatingSummary(employeeId, ratings, bookings, includeHistorical) {
  const ratingRows = Array.isArray(ratings) ? ratings : getAllBookingRatings();
  const activeRatings = includeHistorical ? ratingRows : getActiveBookingRatings(ratingRows, bookings);
  const rows = activeRatings.filter((item) =>
    item.status === "published" && (!employeeId || item.employeeId === employeeId)
  );
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  rows.forEach((item) => { if (distribution[item.rating] !== undefined) distribution[item.rating]++; });
  const total = rows.reduce((sum, item) => sum + item.rating, 0);
  return {
    averageRating: rows.length ? Math.round((total / rows.length) * 10) / 10 : 0,
    ratingsCount: rows.length,
    distribution
  };
}

function calculatePublicBarberRatingSummary(employeeId, ratings, bookings) {
  const summary = calculateBarberRatingSummary(employeeId, ratings, bookings, false);
  return {
    ...summary,
    averageRating: summary.ratingsCount >= PUBLIC_RATING_MINIMUM_COUNT
      ? summary.averageRating
      : null
  };
}

function getBarberRatings(data) {
  try {
    const employeeId = String(data.employeeId || "").trim();
    if (!employeeId) return jsonOutput({ status: "error", message: "employeeId is required." });
    return jsonOutput({ status: "success", ...calculatePublicBarberRatingSummary(employeeId) });
  } catch (error) {
    return bookingPublicErrorResponse(error, "BOOKING_RATINGS_READ_FAILED");
  }
}

function getRatingsAdmin(data) {
  try {
    const permissionError = requirePermission(data, "view_ratings", "You do not have permission to view ratings.");
    if (permissionError) return permissionError;
    const filters = data.filters || {};
    const employeeId = String(filters.employeeId || data.employeeId || "").trim();
    const status = String(filters.status || data.ratingStatus || "").trim().toLowerCase();
    const fromDate = getDateKey(filters.fromDate || data.fromDate || "", TIME_ZONE);
    const toDate = getDateKey(filters.toDate || data.toDate || "", TIME_ZONE);
    const search = String(filters.search || data.search || "").trim().toLowerCase();
    const page = Math.max(1, Number(filters.page || data.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize || data.pageSize) || 25));
    const includeHistorical = parseSheetBoolean(filters.includeHistorical || data.includeHistorical, false);
    const bookings = getAllBookingsV2();
    const storedRatings = getAllBookingRatings();
    const allRatings = includeHistorical ? storedRatings : getActiveBookingRatings(storedRatings, bookings);
    const filtered = allRatings.filter((item) => !employeeId || item.employeeId === employeeId)
      .filter((item) => !status || item.status === status)
      .filter((item) => !fromDate || item.bookingDate >= fromDate)
      .filter((item) => !toDate || item.bookingDate <= toDate)
      .filter((item) => !search || `${item.employeeName} ${item.service} ${item.comment} ${item.bookingId}`.toLowerCase().indexOf(search) !== -1)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const monthKey = Utilities.formatDate(new Date(), TIME_ZONE, "yyyy-MM");
    const previousDate = new Date();
    previousDate.setMonth(previousDate.getMonth() - 1);
    const previousMonthKey = Utilities.formatDate(previousDate, TIME_ZONE, "yyyy-MM");
    const monthSummary = (key) => {
      const rows = allRatings.filter((item) => item.status === "published" && item.bookingDate.indexOf(key) === 0);
      return rows.length ? Math.round((rows.reduce((sum, item) => sum + item.rating, 0) / rows.length) * 10) / 10 : 0;
    };
    const employeeIds = {};
    allRatings.forEach((item) => { if (item.employeeId) employeeIds[item.employeeId] = item.employeeName; });
    const barberSummaries = Object.keys(employeeIds).map((id) => ({
      employeeId: id, employeeName: employeeIds[id],
      ...calculateBarberRatingSummary(id, allRatings, bookings, includeHistorical)
    }));
    return jsonOutput({
      status: "success",
      ratings: filtered.slice((page - 1) * pageSize, page * pageSize).map(publicRatingView),
      total: filtered.length, page, pageSize, barberSummaries, includeHistorical,
      currentMonthAverage: monthSummary(monthKey),
      previousMonthAverage: monthSummary(previousMonthKey),
      lowestRatings: allRatings.filter((item) => item.rating <= 2).slice(-10).reverse().map(publicRatingView)
    });
  } catch (error) {
    return bookingErrorResponse(error, "BOOKING_RATINGS_ADMIN_READ_FAILED");
  }
}

function updateRatingStatus(data) {
  const lock = LockService.getScriptLock();
  try {
    const permissionError = requirePermission(data, "manage_ratings", "You do not have permission to moderate ratings.");
    if (permissionError) return permissionError;
    const nextStatus = String(data.ratingStatus || data.status || "").trim().toLowerCase();
    if (["published", "hidden", "flagged"].indexOf(nextStatus) === -1) {
      return jsonOutput({ status: "error", message: "Invalid rating status." });
    }
    lock.waitLock(10000);
    const sheet = getBookingRatingsSheet();
    const headers = getRatingHeaders(sheet);
    if (sheet.getLastRow() < 2) return jsonOutput({ status: "error", message: "Rating not found." });
    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
    const targetId = String(data.ratingId || "").trim();
    const index = rows.findIndex((row, rowIndex) => ratingFromRow(row, headers, rowIndex + 2).ratingId === targetId);
    if (index < 0) return jsonOutput({ status: "error", message: "Rating not found." });
    const rating = ratingFromRow(rows[index], headers, index + 2);
    const previousStatus = rating.status;
    rating.status = nextStatus;
    rating.updatedAt = getCairoDateTime();
    writeBookingRatingRow(sheet, index + 2, rating, rows[index]);
    SpreadsheetApp.flush();
    logActivity(data, "moderate", "booking_rating", rating.ratingId, `Rating moderation | Rating ID: ${rating.ratingId} | Previous: ${previousStatus} | Next: ${nextStatus} | Booking: ${rating.bookingId}`);
    return jsonOutput({ status: "success", rating: publicRatingView(rating) });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

