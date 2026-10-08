function bookingAvailabilityResponseCacheKey(token, context) {
  if (!token || typeof BookingAvailabilityPhase5 === "undefined") return "";
  return `BA5RESP:${BookingAvailabilityPhase5.hash({
    token: String(token), audience: context.audience, date: context.date,
    serviceSetHash: context.serviceSetHash
  })}`;
}

function bookingAvailabilityCacheResponseSnapshot(token, context, barbers) {
  const key = bookingAvailabilityResponseCacheKey(token, context);
  if (!key) return;
  try {
    CacheService.getScriptCache().put(key, JSON.stringify({ barbers }), 120);
  } catch (ignore) {}
}

function bookingAvailabilityReadResponseSnapshot(token, context) {
  const key = bookingAvailabilityResponseCacheKey(token, context);
  if (!key) return null;
  try {
    const parsed = JSON.parse(CacheService.getScriptCache().get(key) || "null");
    return parsed && Array.isArray(parsed.barbers) ? parsed : null;
  } catch (ignore) {
    return null;
  }
}

function getBookingOptionsForAudience(data, forcedAudience) {
  const audience = forcedAudience === "internal" ? "internal" : "public";
  try {
    if (!bookingServiceIdsInputIsValid(data)) {
      return bookingApiError("INVALID_SERVICES", "serviceIds must be an array.");
    }
    const services = publicBookingServices();
    const selectedServices = getSelectedPublicBookingServices(data, services);
    const dateKey = getDateKey(data.date || "", TIME_ZONE) || Utilities.formatDate(new Date(), TIME_ZONE, "yyyy-MM-dd");
    const requestedServiceIds = getPublicBookingServiceIds(data);
    if (bookingServiceIdsHaveDuplicates(requestedServiceIds)) {
      return jsonOutput({ status: "error", code: "INVALID_SERVICES", message: "Duplicate service IDs are not allowed." });
    }
    const hasDurationOverride = !requestedServiceIds.length && data.durationMinutes !== undefined && data.durationMinutes !== "";
    if (hasDurationOverride && !isValidBookingDuration(Number(data.durationMinutes))) {
      return jsonOutput({ status: "error", code: "INVALID_APPOINTMENT", message: "The requested booking duration is invalid." });
    }
    const durationOverride = hasDurationOverride ? Number(data.durationMinutes) : 0;
    const durationMinutes = Math.max(15, durationOverride || selectedServices.reduce((total, service) => total + service.durationMinutes, 0) || 30);
    const preparationMinutes = selectedServices.reduce((total, service) =>
      total + Math.max(0, Number(service.preparationMinutes) || 0), 0);
    const cleanupMinutes = selectedServices.reduce((total, service) =>
      total + Math.max(0, Number(service.cleanupMinutes) || 0), 0);
    if (!isValidBookingDuration(durationMinutes)) {
      return jsonOutput({ status: "error", code: "INVALID_APPOINTMENT", message: "The requested booking duration is invalid." });
    }
    const bookings = getAllBookingsV2();
    const ratings = getAllBookingRatings();
    const availabilitySnapshot = typeof bookingAvailabilityPhase5RequestSnapshot === "function"
      && bookingAvailabilityEngineMode() === "PHASE5"
      ? bookingAvailabilityPhase5RequestSnapshot() : null;
    const selectedBranchId = String(data.branchId || "").trim();
    if (audience === "internal") {
      if (!selectedBranchId) {
        throw BookingAvailabilityPhase5.availabilityError(
          "AVAILABILITY_BRANCH_REQUIRED",
          "A branch must be selected explicitly."
        );
      }
      const actor = bookingAvailabilityPhase5Actor(data);
      if (!bookingAvailabilityPhase5HasPermission(actor, "booking_availability.view")) {
        throw BookingAvailabilityPhase5.availabilityError(
          "AVAILABILITY_PERMISSION_DENIED",
          "Booking Availability permission is required."
        );
      }
      bookingAvailabilityPhase5AssertBranchScope(actor, selectedBranchId);
    }
    if (availabilitySnapshot) {
      bookingAvailabilityPhase5Branch(
        selectedBranchId, { publicAudience: audience === "public" }, availabilitySnapshot.branches);
    }
    const activeBarbers = publicBookingBarbers().filter((barber) =>
      audience === "internal"
        ? barber.branchId === selectedBranchId
        : (!availabilitySnapshot || barber.branchId === selectedBranchId));
    const barbers = activeBarbers.map((barber) => {
      const summary = calculatePublicBarberRatingSummary(barber.staffId, ratings, bookings);
      return {
        staffId: barber.staffId,
        name: barber.name,
        code: barber.code,
        averageRating: summary.averageRating,
        ratingsCount: summary.ratingsCount,
        ...availableSlotsForBarber(barber, dateKey, durationMinutes, bookings, activeBarbers, inheritProtectedReadContext(data, {
          ...data,
          audience,
          branchId: selectedBranchId,
          availabilitySnapshot,
          preparationMinutes,
          cleanupMinutes,
          serviceSetHash: bookingServiceSetHash(selectedServices, requestedServiceIds)
        }))
      };
    });
    const responseToken = typeof BookingAvailabilityPhase5 !== "undefined"
      ? BookingAvailabilityPhase5.hash(barbers.map((barber) => ({
        staffId: barber.staffId, token: barber.availabilityToken || "", slots: barber.slots || []
      })))
      : "";
    const responseContext = {
      audience,
      date: dateKey,
      serviceSetHash: bookingServiceSetHash(selectedServices, requestedServiceIds)
    };
    if (data.ifNoneMatch && responseToken && data.ifNoneMatch === responseToken) {
      return jsonOutput({
        status: "success", unchanged: true, availabilityToken: responseToken,
        generatedAt: getCairoDateTime(), retryAfterSeconds: 30,
        liveRefreshEnabled: bookingAvailabilityLiveRefreshEnabled(audience)
      });
    }
    if (data.ifNoneMatch && responseToken) {
      const previous = bookingAvailabilityReadResponseSnapshot(data.ifNoneMatch, responseContext);
      if (previous) {
        const currentByStaff = new Map(barbers.map((barber) => [String(barber.staffId), barber]));
        const previousByStaff = new Map(previous.barbers.map((barber) => [String(barber.staffId), barber]));
        const changedBarbers = barbers.filter((barber) =>
          JSON.stringify(barber) !== JSON.stringify(previousByStaff.get(String(barber.staffId)) || null));
        const removedStaffIds = previous.barbers
          .map((barber) => String(barber.staffId))
          .filter((staffId) => !currentByStaff.has(staffId));
        bookingAvailabilityCacheResponseSnapshot(responseToken, responseContext, barbers);
        return jsonOutput({
          status: "success", unchanged: false, delta: true, date: dateKey, services,
          selectedServiceIds: selectedServices.map((service) => service.serviceId),
          durationMinutes, preparationMinutes, cleanupMinutes,
          changedBarbers, removedStaffIds, availabilityToken: responseToken,
          generatedAt: getCairoDateTime(),
          retryAfterSeconds: 30,
          liveRefreshEnabled: bookingAvailabilityLiveRefreshEnabled(audience)
        });
      }
    }
    bookingAvailabilityCacheResponseSnapshot(responseToken, responseContext, barbers);
    return jsonOutput({
      status: "success", date: dateKey, services,
      selectedServiceIds: selectedServices.map((service) => service.serviceId),
      durationMinutes, preparationMinutes, cleanupMinutes, barbers,
      availabilityToken: responseToken, generatedAt: getCairoDateTime(),
      retryAfterSeconds: 30,
      liveRefreshEnabled: bookingAvailabilityLiveRefreshEnabled(audience)
    });
  } catch (error) {
    return audience === "internal"
      ? bookingErrorResponse(error, "AVAILABILITY_OPTIONS_FAILED")
      : bookingPublicErrorResponse(error, "AVAILABILITY_OPTIONS_FAILED");
  }
}

function getPublicBookingOptions(data) {
  return getBookingOptionsForAudience(
    Object.assign({}, data || {}, { audience: "public" }), "public"
  );
}

function getInternalBookingOptions(data) {
  return getBookingOptionsForAudience(
    inheritProtectedReadContext(data, Object.assign({}, data || {}, { audience: "internal" })), "internal"
  );
}

