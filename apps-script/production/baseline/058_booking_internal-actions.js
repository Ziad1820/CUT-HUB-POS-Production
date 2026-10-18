function createBookingV2(data) {
  try {
    const permissionError = requirePermission(data, "create_bookings", "You do not have permission to create bookings.");
    if (permissionError) return permissionError;
    if (!bookingServiceIdsInputIsValid(data)) {
      return bookingApiError("INVALID_SERVICES", "serviceIds must be an array.");
    }
    const requestIdValidation = validateClientRequestId(data.clientRequestId);
    if (!requestIdValidation.ok) {
      return bookingApiError("INVALID_CLIENT_REQUEST_ID", "clientRequestId must be 8-128 safe identifier characters.");
    }
    const clientRequestId = requestIdValidation.value;
    const requestedServiceIds = getPublicBookingServiceIds(data);
    const rawDate = normalizeDigits(String(data.date || data.bookingDate || "").trim());
    const rawTime = normalizeDigits(String(data.time || data.bookingTime || "").trim());
    const fingerprint = bookingRequestFingerprint("internal", {
      customerName: data.customerName || data.customer,
      customerPhone: data.customerPhone || data.phone,
      employeeId: data.employeeId,
      date: rawDate,
      time: rawTime,
      serviceIds: requestedServiceIds,
      manualService: data.service || data.services,
      manualDuration: data.durationMinutes,
      note: data.note
    });
    return withBookingMutationLock({
      bookingRequestId: clientRequestId,
      employeeId: data.employeeId,
      date: rawDate,
      time: rawTime,
      durationMinutes: data.durationMinutes
    }, (diagnostic) => {
    const sheet = getBookingsSheetV2();
    const now = getCairoDateTime();
    const bookings = getAllBookingsV2ForWrite();
    const existing = findBookingByClientRequestId(bookings, clientRequestId);
    const retry = bookingIdempotencyResult(existing, fingerprint, internalBookingCreationResponse);
    if (retry) return retry;
    if (bookingServiceIdsHaveDuplicates(requestedServiceIds)) {
      return jsonOutput({ status: "error", code: "INVALID_SERVICES", message: "Duplicate service IDs are not allowed." });
    }
    const knownServices = publicBookingServices();
    const selectedServices = knownServices.filter((service) => requestedServiceIds.indexOf(service.serviceId) !== -1);
    const otherService = requestedServiceIds.length === 0;
    const manualServiceName = normalizeProtectedText(data.service || data.services, 100);
    const manualDuration = Number(data.durationMinutes);
    if (otherService && (!manualServiceName || !isValidBookingDuration(manualDuration))) {
      return jsonOutput({ status: "error", message: "Other Service requires a service name and duration." });
    }
    if (!otherService && selectedServices.length !== requestedServiceIds.length) {
      return jsonOutput({ status: "error", message: "One or more selected services are unavailable." });
    }
    if (!otherService && !selectedServices.every((service) =>
      isValidBookingDuration(service.durationMinutes) && isValidBookingPrice(service.price))) {
      return jsonOutput({ status: "error", message: "The selected service configuration is invalid." });
    }
    const durationMinutes = otherService
      ? manualDuration
      : selectedServices.reduce((sum, service) => sum + Number(service.durationMinutes), 0);
    const totalPrice = otherService ? 0 : selectedServices.reduce((sum, service) => sum + Number(service.price), 0);
    const preparationMinutes = otherService ? 0 : selectedServices.reduce((sum, service) =>
      sum + Math.max(0, Number(service.preparationMinutes) || 0), 0);
    const cleanupMinutes = otherService ? 0 : selectedServices.reduce((sum, service) =>
      sum + Math.max(0, Number(service.cleanupMinutes) || 0), 0);
    diagnostic.durationMinutes = durationMinutes;
    if (!isValidBookingDuration(durationMinutes) || !isValidBookingPrice(totalPrice)) {
      return jsonOutput({ status: "error", message: "The selected service configuration is invalid." });
    }
    const barbers = publicBookingBarbers();
    if (!isValidBookingDateKey(rawDate) || !isStrictBookingTime(rawTime)) {
      return jsonOutput({ status: "error", code: "INVALID_APPOINTMENT", message: "The appointment date or time is invalid." });
    }
    const appointment = validateBookingAppointmentV2({
      employeeId: String(data.employeeId || "").trim(),
      branchId: data.branchId || ((barbers.find((item) =>
        item.staffId === String(data.employeeId || "").trim()) || {}).branchId),
      date: getDateKey(rawDate, TIME_ZONE),
      time: getBookingTimeValue(rawTime),
      durationMinutes, preparationMinutes, cleanupMinutes,
      serviceSetHash: bookingServiceSetHash(selectedServices, requestedServiceIds),
      bookings, barbers, audience: "internal", requestData: data
    });
    if (!appointment.ok) return jsonOutput({ status: "error", code: appointment.code, message: appointment.message });
    const barber = appointment.barber;
    const booking = {
      id: generateUniqueBookingIdV2(bookings),
      date: appointment.date,
      time: appointment.time,
      customerName: normalizeProtectedText(data.customerName || data.customer, 100),
      customerPhone: normalizePublicPhone(data.customerPhone || data.phone),
      employee: barber.name,
      service: otherService ? manualServiceName : selectedServices.map((service) => service.name).join(", "),
      note: normalizeProtectedText(data.note, 500), status: "pending",
      createdAt: now, updatedAt: now, serviceId: otherService ? "" : requestedServiceIds.join(","),
      serviceIds: otherService ? [] : requestedServiceIds,
      durationMinutes, totalPrice, source: "staff",
      trackingToken: "", requestedAt: now, confirmedAt: "", confirmedBy: "",
      rejectionReason: "", proposedDate: "", proposedTime: "", holdExpiresAt: "", customerResponse: "",
      employeeId: barber.staffId, cancelledAt: "", cancelledBy: "", cancellationReason: "",
      completedAt: "", completedBy: "", deleted: false, deletedAt: "", deletedBy: "",
      deletionReason: "", clientRequestId, clientRequestFingerprint: fingerprint,
      branchId: appointment.branchId || barber.branchId || "",
      availabilityToken: appointment.availabilityToken || "",
      scheduleVersion: Number(appointment.versions && appointment.versions.scheduleVersion) || 0,
      attendanceOperationalVersion:
        Number(appointment.versions && appointment.versions.attendanceOperationalVersion) || 0,
      operationalOverrideId: appointment.operationalOverrideId || "",
      validatedAt: now,
      validationSourceVersion: typeof BookingAvailabilityPhase5 !== "undefined"
        ? BookingAvailabilityPhase5.VERSION : "LEGACY"
    };
    applyBookingOccupancySnapshot(
      booking, preparationMinutes, cleanupMinutes,
      bookingServiceSetHash(selectedServices, requestedServiceIds));
    if (!booking.date || !booking.time || !booking.customerName || !isValidEgyptianMobile(booking.customerPhone) || !booking.employee || !booking.service) {
      return jsonOutput({ status: "error", message: "Missing required booking fields." });
    }
    let appended = null;
    commitBookingPhase5UnderCurrentLock({
      data, requestId: clientRequestId, action: "INTERNAL_BOOKING_CREATED",
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
    logActivity(data, "create", "booking", booking.id, `Created booking | Employee: ${booking.employee}`);
    return internalBookingCreationResponse(
      bookingFromRowV2(appended.row, appended.rowNumber, getBookingHeadersV2(sheet))
    );
    });
  } catch (error) {
    return bookingErrorResponse(error, "BOOKING_CREATE_FAILED");
  }
}

function getBookingsV2(data) {
  try {
    const permissionError = requirePermission(data, "view_bookings", "You do not have permission to view bookings.");
    if (permissionError) return permissionError;
    const filters = data.filters || {};
    const targetDate = getDateKey(filters.date || data.date || "", TIME_ZONE);
    const targetStatus = String(filters.status || data.status || "").trim().toLowerCase();
    const search = String(filters.search || data.search || "").trim().toLowerCase();
    const includeDeleted = parseSheetBoolean(filters.includeDeleted || data.includeDeleted, false) &&
      (actorHasPermission(data, "manage_bookings") || actorHasPermission(data, "delete_bookings"));
    const bookings = getAllBookingsV2().map((booking) => ({
      ...booking, status: bookingEffectiveStatusV2(booking)
    })).filter((booking) => includeDeleted || !booking.deleted)
      .filter((booking) => !targetDate || booking.date === targetDate)
      .filter((booking) => !targetStatus || booking.status === targetStatus)
      .filter((booking) => !search || `${booking.customerName} ${booking.customerPhone} ${booking.employee} ${booking.service} ${booking.note} ${booking.trackingToken}`.toLowerCase().indexOf(search) !== -1)
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    return jsonOutput({ status: "success", bookings });
  } catch (error) {
    return bookingErrorResponse(error, "BOOKING_LIST_FAILED");
  }
}

function updateBookingV2(data) {
  try {
    const permissionError = requirePermission(data, "manage_bookings", "You do not have permission to edit bookings.");
    if (permissionError) return permissionError;
    return withBookingMutationLock({
      bookingRequestId: String(data.id || data.bookingId || "").trim(),
      employeeId: data.employeeId,
      date: data.date || data.bookingDate || data.proposedDate,
      time: data.time || data.bookingTime || data.proposedTime,
      durationMinutes: data.durationMinutes
    }, () => {
    const committedRetry = committedBookingMutationRetry(data);
    if (committedRetry) return jsonOutput({ status: "success", booking: committedRetry });
    const sheet = getBookingsSheetV2();
    const found = findBookingRowV2(sheet, data);
    if (!found) return jsonOutput({ status: "error", message: "Booking not found" });
    const booking = found.booking;
    const beforeBooking = JSON.parse(JSON.stringify(booking));
    if (booking.deleted) {
      return jsonOutput({ status: "error", code: "BOOKING_DELETED", message: "Deleted bookings cannot be updated." });
    }
    if (bookingStatusIsTerminal(bookingEffectiveStatusV2(booking))) {
      return jsonOutput({ status: "error", code: "BOOKING_IMMUTABLE", message: "Terminal bookings cannot be updated." });
    }
    const requestedStatus = String(data.status || "").trim();
    if (requestedStatus && !isRecognizedBookingStatusV2(requestedStatus)) {
      return jsonOutput({ status: "error", code: "INVALID_STATUS", message: "The requested booking status is invalid." });
    }
    const nextStatus = requestedStatus ? normalizeBookingStatusV2(requestedStatus) : booking.status;
    const statusChanged = nextStatus !== booking.status;
    const hasDateInput = data.date !== undefined || data.bookingDate !== undefined;
    const hasTimeInput = data.time !== undefined || data.bookingTime !== undefined;
    const hasProposedDateInput = data.proposedDate !== undefined;
    const hasProposedTimeInput = data.proposedTime !== undefined;
    const hasRejectionReasonInput = data.rejectionReason !== undefined;
    if (hasRejectionReasonInput && !(statusChanged && nextStatus === "rejected")) {
      return jsonOutput({
        status: "error",
        code: "INVALID_LIFECYCLE_METADATA",
        message: "A rejection reason can only be supplied while rejecting a booking."
      });
    }
    if ((hasDateInput && !isValidBookingDateKey(data.date !== undefined ? data.date : data.bookingDate)) ||
        (hasTimeInput && !isStrictBookingTime(data.time !== undefined ? data.time : data.bookingTime)) ||
        (hasProposedDateInput && !isValidBookingDateKey(data.proposedDate)) ||
        (hasProposedTimeInput && !isStrictBookingTime(data.proposedTime))) {
      return jsonOutput({ status: "error", code: "INVALID_APPOINTMENT", message: "The appointment date or time is invalid." });
    }
    if (statusChanged && (hasDateInput || hasTimeInput) && nextStatus !== "confirmed") {
      return jsonOutput({ status: "error", code: "INVALID_UPDATE", message: "Appointment edits must be submitted separately from this status change." });
    }
    if ((hasProposedDateInput || hasProposedTimeInput) && nextStatus !== "proposed") {
      return jsonOutput({ status: "error", code: "INVALID_UPDATE", message: "Proposal times can only be set while proposing an appointment." });
    }
    if ((hasDateInput || hasTimeInput) && nextStatus === "proposed") {
      return jsonOutput({ status: "error", code: "INVALID_UPDATE", message: "Original appointment edits and proposal edits must be submitted separately." });
    }
    let nextDate = getDateKey(data.date || data.bookingDate || booking.date, TIME_ZONE);
    let nextTime = getBookingTimeValue(data.time || data.bookingTime || booking.time);
    const proposedDate = getDateKey(data.proposedDate || booking.proposedDate, TIME_ZONE);
    const proposedTime = getBookingTimeValue(data.proposedTime || booking.proposedTime);
    if (statusChanged && !isBookingStatusTransitionAllowed(booking.status, nextStatus)) {
      return jsonOutput({
        status: "error",
        code: "INVALID_STATUS_TRANSITION",
        message: `Booking status cannot change from ${booking.status} to ${nextStatus}.`
      });
    }
    const rejectionReason = statusChanged && nextStatus === "rejected"
      ? normalizeProtectedText(data.rejectionReason, 500)
      : booking.rejectionReason;
    if (statusChanged && nextStatus === "rejected" && booking.source === "public" && !rejectionReason) {
      return jsonOutput({ status: "error", message: "A rejection reason is required for public bookings." });
    }
    if (statusChanged && booking.status === "proposed" && nextStatus === "confirmed" && proposedDate && proposedTime) {
      nextDate = proposedDate;
      nextTime = proposedTime;
    }
    const timeChanged = nextDate !== booking.date || nextTime !== booking.time;
    const proposalChanged = proposedDate !== booking.proposedDate || proposedTime !== booking.proposedTime;
    const needsAppointmentValidation =
      (statusChanged && (nextStatus === "confirmed" || nextStatus === "proposed")) ||
      (!statusChanged && (timeChanged || (nextStatus === "proposed" && proposalChanged)));
    let appointment = null;
    let trustedServices = null;
    if (needsAppointmentValidation) {
      trustedServices = resolveTrustedBookingServiceTotals(booking, publicBookingServices());
      if (!trustedServices.ok) {
        return jsonOutput({ status: "error", code: trustedServices.code, message: trustedServices.message });
      }
      const appointmentDate = nextStatus === "proposed" ? proposedDate : nextDate;
      const appointmentTime = nextStatus === "proposed" ? proposedTime : nextTime;
      appointment = validateBookingAppointmentV2({
        employeeId: booking.employeeId, employeeName: booking.employee,
        branchId: booking.branchId,
        date: appointmentDate, time: appointmentTime, durationMinutes: trustedServices.durationMinutes,
        preparationMinutes: trustedServices.preparationMinutes,
        cleanupMinutes: trustedServices.cleanupMinutes,
        serviceSetHash: trustedServices.serviceSetHash,
        excludeId: booking.id, bookings: getAllBookingsV2ForWrite(), barbers: publicBookingBarbers(),
        audience: "internal", requestData: data
      });
      if (!appointment.ok) return jsonOutput({ status: "error", code: appointment.code, message: appointment.message });
    }
    const nextNote = data.note !== undefined ? normalizeProtectedText(data.note, 500) : booking.note;
    if (!statusChanged && !timeChanged && !proposalChanged && nextNote === booking.note) {
      return jsonOutput({ status: "success", booking, unchanged: true });
    }
    booking.date = nextDate;
    booking.time = nextTime;
    booking.status = nextStatus;
    booking.note = nextNote;
    booking.updatedAt = getCairoDateTime();
    booking.rejectionReason = rejectionReason;
    booking.proposedDate = proposedDate;
    booking.proposedTime = proposedTime;
    if (appointment && appointment.barber) {
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
        trustedServices.serviceSetHash, nextStatus === "proposed" ? proposedTime : booking.time);
    }
    const actor = getActor(data);
    if (statusChanged && nextStatus === "confirmed") {
      booking.confirmedAt = booking.updatedAt;
      booking.confirmedBy = actor.displayName;
      booking.customerResponse = booking.customerResponse || "confirmed_by_staff";
    }
    if (statusChanged && nextStatus === "rejected") booking.customerResponse = "rejected_by_staff";
    if (statusChanged && nextStatus === "cancelled") {
      booking.cancellationReason = normalizeProtectedText(data.cancellationReason, 500);
      booking.cancelledAt = booking.updatedAt;
      booking.cancelledBy = actor.displayName;
    }
    if (statusChanged && nextStatus === "done") {
      booking.completedAt = booking.updatedAt;
      booking.completedBy = actor.displayName;
    }
    const action = statusChanged
      ? (({ confirmed: "confirm", proposed: "propose", rejected: "reject", cancelled: "cancel", done: "complete" })[nextStatus] || "update")
      : "update";
    commitBookingPhase5UnderCurrentLock({
      data,
      requestId: data.clientRequestId,
      action: `BOOKING_${action.toUpperCase()}`,
      booking, beforeState: beforeBooking,
      business: () => {
        writeBookingRowV2(sheet, found.rowNumber, booking, found.row);
        SpreadsheetApp.flush();
      },
      compensate: () => {
        writeBookingRowV2(sheet, found.rowNumber, beforeBooking, found.row);
        SpreadsheetApp.flush();
      }
    });
    logActivity(data, action, "booking", booking.id, `Booking status | Previous: ${found.booking.status} | Next: ${nextStatus} | Employee: ${booking.employee} | Customer: ${booking.customerName}`);
    return jsonOutput({ status: "success", booking });
    });
  } catch (error) {
    return bookingErrorResponse(error, "BOOKING_UPDATE_FAILED");
  }
}

