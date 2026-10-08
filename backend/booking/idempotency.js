function validateClientRequestId(value) {
  const requestId = String(value || "").trim();
  if (!requestId) return { ok: true, value: "" };
  if (requestId.length < 8 || requestId.length > 128 ||
      !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(requestId)) {
    return { ok: false, value: "", code: "INVALID_CLIENT_REQUEST_ID" };
  }
  return { ok: true, value: requestId };
}

function bookingRequestFingerprint(kind, values) {
  const canonical = JSON.stringify({
    kind: String(kind || ""),
    customerName: normalizeProtectedText(values.customerName, 100),
    customerPhone: normalizePublicPhone(values.customerPhone),
    employeeId: String(values.employeeId || "").trim(),
    date: normalizeDigits(String(values.date || "").trim()),
    time: normalizeDigits(String(values.time || "").trim()),
    serviceIds: (values.serviceIds || []).map((item) => String(item || "").trim()).sort(),
    manualService: normalizeProtectedText(values.manualService, 100),
    manualDuration: Number(values.manualDuration) || 0,
    note: normalizeProtectedText(values.note, 500)
  });
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    canonical,
    Utilities.Charset.UTF_8
  );
  return digest.map((byte) => (`0${(byte < 0 ? byte + 256 : byte).toString(16)}`).slice(-2)).join("");
}

function findBookingByClientRequestId(bookings, requestId) {
  const target = String(requestId || "").trim();
  return target
    ? (bookings || []).find((booking) => String(booking.clientRequestId || "").trim() === target) || null
    : null;
}

function bookingIdempotencyResult(existing, fingerprint, responseBuilder) {
  if (!existing) return null;
  if (!existing.clientRequestFingerprint || existing.clientRequestFingerprint !== fingerprint) {
    return bookingApiError("IDEMPOTENCY_KEY_REUSED", "This client request ID was already used for a different booking request.");
  }
  return responseBuilder(existing);
}

function findBookingRowV2(sheet, data) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const targetRow = Number(data.rowNumber || 0);
  const targetId = String(data.id || data.bookingId || "").trim();
  if (!targetId) return null;
  const headers = getBookingHeadersV2(sheet);
  const rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  for (let index = 0; index < rows.length; index++) {
    const rowNumber = index + 2;
    const storedId = String(bookingRowValueV2(rows[index], headers, "ID", ["BOOKING_ID"]) || "").trim();
    const booking = bookingFromRowV2(rows[index], rowNumber, headers);
    const idMatches = storedId && storedId === targetId;
    const rowMatches = targetRow && targetRow === rowNumber;
    if ((rowMatches && idMatches) || (!targetRow && idMatches)) {
      return { rowNumber, booking, row: rows[index] };
    }
  }
  return null;
}

