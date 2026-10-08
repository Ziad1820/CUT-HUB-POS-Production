function getBookingsSheet() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("Bookings");
  if (!sheet) {
    throw new Error("Sheet Bookings not found");
  }
  ensureBookingsColumns(sheet);
  return sheet;
}

function ensureBookingsColumns(sheet) {
  const headers = [
    "ID",
    "DATE",
    "TIME",
    "CUSTOMER",
    "PHONE",
    "EMPLOYEE",
    "SERVICE",
    "NOTE",
    "STATUS",
    "CREATED_AT",
    "UPDATED_AT"
  ];

  const currentColumns = sheet.getMaxColumns();
  if (currentColumns < headers.length) {
    sheet.insertColumnsAfter(currentColumns, headers.length - currentColumns);
  }

  const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const hasHeaders = currentHeaders.some(value => String(value || "").trim());
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function normalizeBookingStatus(value) {
  const status = String(value || "pending").trim().toLowerCase();
  const allowed = {
    pending: true,
    confirmed: true,
    done: true,
    cancelled: true
  };

  return allowed[status] ? status : "pending";
}

function bookingFromRow(row, rowNumber) {
  const id = String(row[0] || "").trim() || `BOOK-${rowNumber}`;

  return {
    id,
    bookingId: id,
    rowNumber,
    date: getDateKey(row[1], TIME_ZONE) || String(row[1] || "").trim(),
    time: getBookingTimeValue(row[2]),
    customerName: String(row[3] || "").trim(),
    customerPhone: String(row[4] || "").trim(),
    employee: String(row[5] || "").trim(),
    service: String(row[6] || "").trim(),
    note: String(row[7] || "").trim(),
    status: normalizeBookingStatus(row[8]),
    createdAt: getDisplayDateTime(row[9]),
    updatedAt: getDisplayDateTime(row[10])
  };
}

function getBookingTimeValue(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, TIME_ZONE, "HH:mm");
  }

  const text = normalizeDigits(String(value || "").trim());
  const timeMatch = text.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    return `${padDatePart(timeMatch[1])}:${timeMatch[2]}`;
  }

  return text;
}

function findBookingRow(sheet, data) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const targetRowNumber = Number(data.rowNumber || 0);
  const targetId = String(data.id || data.bookingId || "").trim();

  if (targetRowNumber >= 2 && targetRowNumber <= lastRow) {
    const row = sheet.getRange(targetRowNumber, 1, 1, 11).getValues()[0];
    const booking = bookingFromRow(row, targetRowNumber);
    if (!targetId || booking.id === targetId || targetId === `BOOK-${targetRowNumber}`) {
      return { rowNumber: targetRowNumber, row, booking };
    }
  }

  if (!targetId) return null;

  const rows = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
  for (let index = 0; index < rows.length; index++) {
    const rowNumber = index + 2;
    const booking = bookingFromRow(rows[index], rowNumber);
    if (booking.id === targetId || targetId === `BOOK-${rowNumber}`) {
      return { rowNumber, row: rows[index], booking };
    }
  }

  return null;
}

function createBooking(data) {
  try {
    const permissionError = requirePermission(data, "view_bookings", "You do not have permission to create bookings.");
    if (permissionError) return permissionError;

    const sheet = getBookingsSheet();
    const now = getCairoDateTime();
    const id = String(data.id || data.bookingId || Utilities.getUuid()).trim();
    const date = getDateKey(data.date || data.bookingDate || "", TIME_ZONE);
    const time = String(data.time || data.bookingTime || "").trim();
    const customerName = String(data.customerName || data.customer || "").trim();
    const customerPhone = String(data.customerPhone || data.phone || "").trim();
    const employee = String(data.employee || data.barber || "").trim();
    const service = String(data.service || data.services || "").trim();
    const note = String(data.note || "").trim();
    const status = normalizeBookingStatus(data.status);

    if (!date || !time || !customerName || !customerPhone || !employee || !service) {
      return jsonOutput({ status: "error", message: "Missing required booking fields." });
    }

    sheet.appendRow([
      id,
      date,
      time,
      customerName,
      customerPhone,
      employee,
      service,
      note,
      status,
      now,
      now
    ]);

    SpreadsheetApp.flush();
    const rowNumber = sheet.getLastRow();
    const booking = bookingFromRow(sheet.getRange(rowNumber, 1, 1, 11).getValues()[0], rowNumber);

    logActivity(
      data,
      "create",
      "booking",
      id,
      `Created booking | Customer: ${customerName} | Phone: ${customerPhone} | Date: ${date} ${time} | Employee: ${employee} | Service: ${service}`
    );

    return jsonOutput({ status: "success", booking });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function getBookings(data) {
  try {
    const permissionError = requirePermission(data, "view_bookings", "You do not have permission to view bookings.");
    if (permissionError) return permissionError;

    const sheet = getBookingsSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return jsonOutput({ status: "success", bookings: [] });
    }

    const filters = data.filters || {};
    const targetDate = getDateKey(filters.date || data.date || data.bookingDate || "", TIME_ZONE);
    const fromDate = getDateKey(filters.fromDate || data.fromDate || "", TIME_ZONE);
    const toDate = getDateKey(filters.toDate || data.toDate || "", TIME_ZONE);
    const targetStatus = String(filters.status || data.status || "").trim().toLowerCase();
    const search = String(filters.search || data.search || "").trim().toLowerCase();
    const rows = sheet.getRange(2, 1, lastRow - 1, 11).getValues();

    const bookings = rows
      .map((row, index) => bookingFromRow(row, index + 2))
      .filter(booking =>
        booking.id ||
        booking.date ||
        booking.time ||
        booking.customerName ||
        booking.customerPhone ||
        booking.employee ||
        booking.service
      )
      .filter(booking => !targetDate || booking.date === targetDate)
      .filter(booking => !fromDate || booking.date >= fromDate)
      .filter(booking => !toDate || booking.date <= toDate)
      .filter(booking => !targetStatus || booking.status === targetStatus)
      .filter(booking => {
        if (!search) return true;
        const haystack = `${booking.customerName} ${booking.customerPhone} ${booking.employee} ${booking.service} ${booking.note}`.toLowerCase();
        return haystack.indexOf(search) !== -1;
      })
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

    return jsonOutput({ status: "success", bookings });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function updateBooking(data) {
  try {
    const permissionError = requirePermission(data, "view_bookings", "You do not have permission to edit bookings.");
    if (permissionError) return permissionError;

    const sheet = getBookingsSheet();
    const found = findBookingRow(sheet, data);
    if (!found) {
      return jsonOutput({ status: "error", message: "Booking not found" });
    }

    const beforeUpdate = found.booking;
    const now = getCairoDateTime();
    const nextDate = getDateKey(data.date || data.bookingDate || beforeUpdate.date, TIME_ZONE);
    const updatedRow = [
      beforeUpdate.id,
      nextDate,
      String(data.time || data.bookingTime || beforeUpdate.time || "").trim(),
      String(data.customerName || data.customer || beforeUpdate.customerName || "").trim(),
      String(data.customerPhone || data.phone || beforeUpdate.customerPhone || "").trim(),
      String(data.employee || data.barber || beforeUpdate.employee || "").trim(),
      String(data.service || data.services || beforeUpdate.service || "").trim(),
      String(data.note !== undefined ? data.note : beforeUpdate.note || "").trim(),
      normalizeBookingStatus(data.status || beforeUpdate.status),
      beforeUpdate.createdAt || getCairoDateTime(),
      now
    ];

    if (!updatedRow[1] || !updatedRow[2] || !updatedRow[3] || !updatedRow[4] || !updatedRow[5] || !updatedRow[6]) {
      return jsonOutput({ status: "error", message: "Missing required booking fields." });
    }

    sheet.getRange(found.rowNumber, 1, 1, 11).setValues([updatedRow]);
    const booking = bookingFromRow(updatedRow, found.rowNumber);

    logActivity(
      data,
      "update",
      "booking",
      beforeUpdate.id,
      `Updated booking ${beforeUpdate.id} | Before: ${JSON.stringify(beforeUpdate)} | After: ${JSON.stringify(booking)}`
    );

    return jsonOutput({ status: "success", booking });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function deleteBooking(data) {
  try {
    const permissionError = requirePermission(data, "delete_bookings", "You do not have permission to delete bookings.");
    if (permissionError) return permissionError;
    return withBookingMutationLock({
      bookingRequestId: String(data.id || data.bookingId || "").trim()
    }, () => {
    const committedRetry = committedBookingMutationRetry(data);
    if (committedRetry) return jsonOutput({ status: "success", booking: committedRetry });
    const sheet = getBookingsSheetV2();
    const found = findBookingRowV2(sheet, data);
    if (!found) {
      return jsonOutput({ status: "error", message: "Booking not found" });
    }
    if (found.booking.deleted) return jsonOutput({ status: "success", booking: found.booking });
    const beforeBooking = JSON.parse(JSON.stringify(found.booking));
    const deletionReason = normalizeProtectedText(data.reason || data.deletionReason, 500);
    if (!deletionReason) return jsonOutput({ status: "error", message: "A deletion reason is required." });
    const actor = getActor(data);
    found.booking.deleted = true;
    found.booking.deletedAt = getCairoDateTime();
    found.booking.deletedBy = actor.displayName;
    found.booking.deletionReason = deletionReason;
    found.booking.updatedAt = found.booking.deletedAt;
    commitBookingPhase5UnderCurrentLock({
      data, requestId: data.clientRequestId, action: "BOOKING_DELETED",
      booking: found.booking, beforeState: beforeBooking,
      business: () => {
        writeBookingRowV2(sheet, found.rowNumber, found.booking, found.row);
        SpreadsheetApp.flush();
      },
      compensate: () => {
        writeBookingRowV2(sheet, found.rowNumber, beforeBooking, found.row);
        SpreadsheetApp.flush();
      }
    });
    logActivity(
      data,
      "soft_delete",
      "booking",
      found.booking.id,
      `Soft deleted booking | Customer: ${found.booking.customerName || "-"} | Date: ${found.booking.date || "-"} ${found.booking.time || "-"} | Employee: ${found.booking.employee || "-"} | Reason: ${found.booking.deletionReason || "-"}`
    );
    return jsonOutput({ status: "success", booking: found.booking });
    });
  } catch (error) {
    return bookingErrorResponse(error, "BOOKING_DELETE_FAILED");
  }
}

