function normalizePublicPhone(value) {
  let digits = normalizeDigits(String(value || "")).replace(/\D/g, "");
  if (digits.indexOf("0020") === 0) digits = digits.slice(4);
  else if (digits.indexOf("20") === 0 && digits.length === 12) digits = digits.slice(2);
  if (digits.length === 10 && digits.charAt(0) === "1") digits = `0${digits}`;
  return digits;
}

function isValidEgyptianMobile(value) {
  return /^01(?:0|1|2|5)\d{8}$/.test(normalizePublicPhone(value));
}

function verifyBookingTrackingPhone(booking, phoneLast4) {
  const expected = normalizePublicPhone(booking.customerPhone).slice(-4);
  const supplied = normalizeDigits(String(phoneLast4 || "")).replace(/\D/g, "");
  return supplied.length === 4 && expected && supplied === expected;
}

function trackingVerificationError() {
  return jsonOutput({
    status: "error",
    code: "TRACKING_VERIFICATION_FAILED",
    message: "The tracking code or phone verification digits are incorrect."
  });
}

function generatePublicBookingTrackingToken(bookings) {
  const existingTokens = new Set((bookings || []).map((booking) => String(booking.trackingToken || "").trim().toUpperCase()));
  for (let attempt = 0; attempt < 50; attempt++) {
    const token = `CH-${String(Math.floor(Math.random() * 1000000)).padStart(6, "0")}`;
    if (!existingTokens.has(token)) return token;
  }
  throw new Error("Could not create a unique booking tracking code. Please try again.");
}

function publicBookingCreationResponse(booking) {
  return jsonOutput({
    status: "success",
    bookingId: booking.id,
    trackingToken: booking.trackingToken,
    trackingPath: `customer-booking.html?tracking=${booking.trackingToken}`,
    booking: publicBookingView(booking)
  });
}

function internalBookingCreationResponse(booking) {
  return jsonOutput({ status: "success", booking });
}

function createPublicBookingRequest(data) {
  try {
    if (!bookingServiceIdsInputIsValid(data)) {
      return bookingApiError("INVALID_SERVICES", "serviceIds must be an array.");
    }
    const customerName = normalizeProtectedText(data.customerName, 100);
    const customerPhone = normalizePublicPhone(data.customerPhone);
    const rawDate = normalizeDigits(String(data.date || "").trim());
    const rawTime = normalizeDigits(String(data.time || "").trim());
    const dateKey = getDateKey(rawDate, TIME_ZONE);
    const time = getBookingTimeValue(rawTime);
    const employeeId = String(data.employeeId || "").trim();
    const serviceIds = getPublicBookingServiceIds(data);
    const requestIdValidation = validateClientRequestId(data.clientRequestId);
    if (!requestIdValidation.ok) {
      return bookingApiError("INVALID_CLIENT_REQUEST_ID", "clientRequestId must be 8-128 safe identifier characters.");
    }
    const clientRequestId = requestIdValidation.value;
    if (bookingServiceIdsHaveDuplicates(serviceIds)) {
      return jsonOutput({ status: "error", code: "INVALID_SERVICES", message: "Duplicate service IDs are not allowed." });
    }
    const note = normalizeProtectedText(data.note, 500);
    if (customerName.length < 2 || !isValidEgyptianMobile(customerPhone) ||
        !isValidBookingDateKey(rawDate) || !isStrictBookingTime(rawTime) ||
        !dateKey || !time || !employeeId || !serviceIds.length) {
      return jsonOutput({ status: "error", message: "Please complete all required booking details." });
    }
    const fingerprint = bookingRequestFingerprint("public", {
      customerName, customerPhone, employeeId, date: rawDate, time: rawTime, serviceIds, note
    });
    return withBookingMutationLock({
      bookingRequestId: clientRequestId, employeeId, date: dateKey, time
    }, (diagnostic) => {
      const sheet = getBookingsSheetV2();
      const bookings = getAllBookingsV2ForWrite();
      const existing = findBookingByClientRequestId(bookings, clientRequestId);
      const retry = bookingIdempotencyResult(existing, fingerprint, publicBookingCreationResponse);
      if (retry) return retry;

    const publicServices = publicBookingServices();
    const selectedServices = publicServices.filter((item) => serviceIds.indexOf(item.serviceId) !== -1);
    if (selectedServices.length !== serviceIds.length || !selectedServices.length) {
      return jsonOutput({ status: "error", message: "The selected service is no longer available." });
    }
    if (!selectedServices.every((service) =>
      isValidBookingDuration(service.durationMinutes) && isValidBookingPrice(service.price))) {
      return jsonOutput({ status: "error", message: "The selected service configuration is invalid." });
    }
    const durationMinutes = selectedServices.reduce((total, service) => total + Number(service.durationMinutes), 0);
    const totalPrice = selectedServices.reduce((sum, service) => sum + Number(service.price), 0);
    const preparationMinutes = selectedServices.reduce((sum, service) =>
      sum + Math.max(0, Number(service.preparationMinutes) || 0), 0);
    const cleanupMinutes = selectedServices.reduce((sum, service) =>
      sum + Math.max(0, Number(service.cleanupMinutes) || 0), 0);
    diagnostic.durationMinutes = durationMinutes;
    if (!isValidBookingDuration(durationMinutes) || !isValidBookingPrice(totalPrice)) {
      return jsonOutput({ status: "error", message: "The selected service configuration is invalid." });
    }
    const serviceName = selectedServices.map((service) => service.name).join("، ");
    const serviceId = selectedServices.map((service) => service.serviceId).join(",");
    const barbers = publicBookingBarbers();
    const appointment = validateBookingAppointmentV2({
      employeeId, branchId: data.branchId, date: dateKey, time, durationMinutes, preparationMinutes,
      cleanupMinutes, serviceSetHash: bookingServiceSetHash(selectedServices, serviceIds),
      bookings, barbers, audience: "public", requestData: data
    });
    if (!appointment.ok) return jsonOutput({ status: "error", code: appointment.code, message: appointment.message });
    const barber = appointment.barber;

    const now = new Date();
    const nowText = getCairoDateTime();
    const id = generateUniqueBookingIdV2(bookings);
    const token = generatePublicBookingTrackingToken(bookings);
    const booking = {
      id, date: dateKey, time, customerName, customerPhone, employee: barber.name,
      service: serviceName, note, status: "pending", createdAt: nowText, updatedAt: nowText,
      serviceId, serviceIds, durationMinutes,
      totalPrice,
      source: "public", trackingToken: token,
      requestedAt: nowText, confirmedAt: "", confirmedBy: "", rejectionReason: "",
      proposedDate: "", proposedTime: "", holdExpiresAt: new Date(now.getTime() + (15 * 60 * 1000)).toISOString(),
      customerResponse: "pending", employeeId, cancelledAt: "", cancelledBy: "",
      cancellationReason: "", completedAt: "", completedBy: "", deleted: false, deletedAt: "", deletedBy: "",
      deletionReason: "", clientRequestId, clientRequestFingerprint: fingerprint,
      branchId: appointment.branchId || barber.branchId || "",
      availabilityToken: appointment.availabilityToken || "",
      scheduleVersion: Number(appointment.versions && appointment.versions.scheduleVersion) || 0,
      attendanceOperationalVersion:
        Number(appointment.versions && appointment.versions.attendanceOperationalVersion) || 0,
      operationalOverrideId: appointment.operationalOverrideId || "",
      validatedAt: nowText,
      validationSourceVersion: typeof BookingAvailabilityPhase5 !== "undefined"
        ? BookingAvailabilityPhase5.VERSION : "LEGACY"
    };
    applyBookingOccupancySnapshot(
      booking, preparationMinutes, cleanupMinutes,
      bookingServiceSetHash(selectedServices, serviceIds));
    let appended = null;
    commitBookingPhase5UnderCurrentLock({
      data, requestId: clientRequestId, action: "PUBLIC_BOOKING_CREATED",
      booking, beforeState: {},
      business: () => {
        appended = appendBookingRowV2(sheet, booking);
        SpreadsheetApp.flush();
      },
      compensate: () => {
        booking.deleted = true;
        booking.deletedAt = getCairoDateTime();
        booking.deletedBy = "transaction-compensation";
        booking.deletionReason = "COMPENSATED_UNCOMMITTED_BOOKING";
        writeBookingRowV2(sheet, appended.rowNumber, booking, appended.row);
        SpreadsheetApp.flush();
      }
    });
    logActivity({}, "create", "booking", id, `Created public booking | Employee: ${barber.name}`);
    return publicBookingCreationResponse(booking);
    });
  } catch (error) {
    return bookingPublicErrorResponse(error, "BOOKING_CREATE_FAILED");
  }
}

function findBookingByTrackingToken(token, options) {
  const cleanToken = String(token || "").trim().toUpperCase();
  if (!cleanToken) return null;
  const sheet = options && options.forWrite
    ? getBookingsSheetV2() : getBookingsSheetV2ReadOnly();
  if (sheet.getLastRow() < 2) return null;
  const headers = getBookingHeadersV2(sheet);
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  for (let index = 0; index < rows.length; index++) {
    const booking = bookingFromRowV2(rows[index], index + 2, headers);
    if (!booking.deleted && String(booking.trackingToken || "").trim().toUpperCase() === cleanToken) {
      return { sheet, rowNumber: index + 2, booking, row: rows[index], headers };
    }
  }
  return null;
}

function publicBookingView(booking) {
  return {
    bookingId: booking.id,
    date: booking.date,
    time: booking.time,
    employee: booking.employee,
    service: booking.service,
    durationMinutes: booking.durationMinutes,
    status: bookingEffectiveStatusV2(booking),
    proposedDate: booking.proposedDate,
    proposedTime: booking.proposedTime,
    rejectionReason: booking.rejectionReason,
    customerResponse: booking.customerResponse,
    updatedAt: booking.updatedAt
  };
}

function getPublicBookingStatus(data) {
  try {
    const found = findBookingByTrackingToken(data.trackingToken);
    if (!found) return jsonOutput({ status: "error", message: "Booking request not found." });
    if (!verifyBookingTrackingPhone(found.booking, data.phoneLast4)) return trackingVerificationError();
    return jsonOutput({ status: "success", booking: publicBookingView(found.booking) });
  } catch (error) {
    return bookingPublicErrorResponse(error, "BOOKING_STATUS_FAILED");
  }
}

function respondToBookingProposal(data) {
  try {
    return withBookingMutationLock({
      bookingRequestId: String(data.trackingToken || "").trim()
    }, () => {
    const committedRetry = committedBookingMutationRetry(data);
    if (committedRetry) {
      return jsonOutput({ status: "success", booking: publicBookingView(committedRetry) });
    }
    const found = findBookingByTrackingToken(data.trackingToken, { forWrite: true });
    if (!found || found.booking.status !== "proposed") return jsonOutput({ status: "error", message: "There is no active appointment proposal." });
    if (!verifyBookingTrackingPhone(found.booking, data.phoneLast4)) return trackingVerificationError();
    const response = String(data.response || "").trim().toLowerCase();
    if (["accept", "reject"].indexOf(response) === -1) {
      return jsonOutput({ status: "error", code: "INVALID_RESPONSE", message: "The proposal response must be accept or reject." });
    }
    const accepted = response === "accept";
    const booking = found.booking;
    const beforeBooking = JSON.parse(JSON.stringify(booking));
    const responseStatus = accepted ? "confirmed" : "rejected";
    if (!isBookingStatusTransitionAllowed(booking.status, responseStatus)) {
      return jsonOutput({ status: "error", code: "INVALID_STATUS_TRANSITION", message: "The booking proposal can no longer be changed." });
    }
    booking.updatedAt = getCairoDateTime();
    if (!accepted) {
      booking.status = "rejected";
      booking.customerResponse = "declined";
      booking.rejectionReason = "Customer declined the proposed appointment.";
    } else {
      const trustedServices = resolveTrustedBookingServiceTotals(booking, publicBookingServices());
      if (!trustedServices.ok) {
        return jsonOutput({ status: "error", code: trustedServices.code, message: trustedServices.message });
      }
      const bookings = getAllBookingsV2ForWrite();
      const appointment = validateBookingAppointmentV2({
        employeeId: booking.employeeId, employeeName: booking.employee,
        branchId: booking.branchId,
        date: booking.proposedDate, time: booking.proposedTime,
        durationMinutes: trustedServices.durationMinutes,
        preparationMinutes: trustedServices.preparationMinutes,
        cleanupMinutes: trustedServices.cleanupMinutes,
        serviceSetHash: trustedServices.serviceSetHash,
        excludeId: booking.id, bookings, barbers: publicBookingBarbers(),
        audience: "public", requestData: data
      });
      if (!appointment.ok) return jsonOutput({ status: "error", code: appointment.code, message: appointment.message });
      booking.date = booking.proposedDate;
      booking.time = booking.proposedTime;
      booking.employeeId = appointment.barber.staffId;
      booking.employee = appointment.barber.name;
      booking.durationMinutes = trustedServices.durationMinutes;
      booking.totalPrice = trustedServices.totalPrice;
      booking.branchId = appointment.branchId || booking.branchId;
      booking.availabilityToken = appointment.availabilityToken || booking.availabilityToken;
      booking.scheduleVersion = Number(appointment.versions && appointment.versions.scheduleVersion) ||
        booking.scheduleVersion;
      booking.attendanceOperationalVersion =
        Number(appointment.versions && appointment.versions.attendanceOperationalVersion) ||
        booking.attendanceOperationalVersion;
      booking.validatedAt = booking.updatedAt;
      booking.validationSourceVersion = typeof BookingAvailabilityPhase5 !== "undefined"
        ? BookingAvailabilityPhase5.VERSION : "LEGACY";
      applyBookingOccupancySnapshot(
        booking, trustedServices.preparationMinutes, trustedServices.cleanupMinutes,
        trustedServices.serviceSetHash);
      booking.status = "confirmed";
      booking.customerResponse = "accepted";
      booking.confirmedAt = booking.updatedAt;
      booking.confirmedBy = "customer";
    }
    commitBookingPhase5UnderCurrentLock({
      data,
      requestId: data.clientRequestId ||
        `PROPOSAL-${String(data.trackingToken || "").replace(/[^A-Za-z0-9]/g, "")}-${response}`,
      action: accepted ? "BOOKING_PROPOSAL_ACCEPTED" : "BOOKING_PROPOSAL_REJECTED",
      booking, beforeState: beforeBooking,
      business: () => {
        writeBookingRowV2(found.sheet, found.rowNumber, booking, found.row);
        SpreadsheetApp.flush();
      },
      compensate: () => {
        writeBookingRowV2(found.sheet, found.rowNumber, beforeBooking, found.row);
        SpreadsheetApp.flush();
      }
    });
    logActivity({}, accepted ? "confirm" : "reject", "booking", booking.id, `Public proposal response | Previous: proposed | Next: ${booking.status} | Employee: ${booking.employee}`);
    return jsonOutput({ status: "success", booking: publicBookingView(booking) });
    });
  } catch (error) {
    return bookingPublicErrorResponse(error, "BOOKING_PROPOSAL_RESPONSE_FAILED");
  }
}

