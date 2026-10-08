function bookingAvailabilityEngineMode() {
  if (typeof bookingAvailabilityPhase5Flags === "function") {
    return bookingAvailabilityPhase5Flags().engine;
  }
  return "LEGACY";
}

function bookingAvailabilityLiveRefreshEnabled(audience) {
  if (typeof bookingAvailabilityPhase5Flags !== "function") return false;
  const flags = bookingAvailabilityPhase5Flags();
  return audience === "internal"
    ? flags.internalLiveRefreshEnabled === true
    : flags.customerLiveRefreshEnabled === true;
}

function runBookingAvailabilityAuthority(legacyCallback, phase5Callback, context) {
  const mode = bookingAvailabilityEngineMode();
  if (typeof BookingAvailabilityPhase5 !== "undefined" &&
      typeof BookingAvailabilityPhase5.executeAuthoritativeEngine === "function") {
    return BookingAvailabilityPhase5.executeAuthoritativeEngine({
      mode,
      legacy: legacyCallback,
      phase5: phase5Callback,
      onComparison: (comparison) => {
        try {
          Logger.log(JSON.stringify({
            event: "booking_availability_shadow_comparison",
            context: context || {},
            comparison
          }));
        } catch (ignore) {}
      }
    }).result;
  }
  if (mode === "PHASE5") {
    const error = new Error("Booking Availability Phase 5 runtime is unavailable.");
    error.code = "PHASE5_AVAILABILITY_FAILED_CLOSED";
    throw error;
  }
  return legacyCallback();
}

function validateBookingAppointmentV2(options) {
  return runBookingAvailabilityAuthority(
    () => validateBookingAppointmentLegacyV2(options),
    () => {
      if (typeof bookingAvailabilityPhase5ValidateAppointment !== "function") {
        throw new Error("Booking Availability Phase 5 adapter is unavailable.");
      }
      const barber = resolveBookingBarberV2(options.employeeId, options.employeeName, options.barbers);
      if (!barber) {
        return bookingAppointmentValidationError(
          "EMPLOYEE_UNAVAILABLE", "The selected employee does not exist or is inactive.");
      }
      return bookingAvailabilityPhase5ValidateAppointment({
        ...options,
        barber,
        employeeId: barber.staffId,
        audience: options.audience || "public",
        requestData: options.requestData || {}
      });
    },
    {
      operation: "final_validation",
      employeeId: options.employeeId,
      date: options.date,
      time: options.time
    }
  );
}

function availableSlotsForBarberLegacy(barber, dateKey, durationMinutes, bookings, barbers) {
  const today = Utilities.formatDate(new Date(), TIME_ZONE, "yyyy-MM-dd");
  if (!dateKey || dateKey < today) return { slots: [], availability: "unavailable", shiftStart: "", shiftEnd: "" };
  const schedule = getScheduleForBarber(barber, dateKey, barbers);
  if (!schedule.scheduled) return { slots: [], availability: "unavailable", shiftStart: "", shiftEnd: "" };
  const attendance = getAttendanceOverride(barber, dateKey, barbers);
  if (attendance && attendance.unavailable) {
    return { slots: [], availability: "unavailable", shiftStart: schedule.shiftStart, shiftEnd: schedule.shiftEnd };
  }

  const shiftStart = attendance && attendance.shiftStart ? attendance.shiftStart : schedule.shiftStart;
  const shiftEnd = attendance && attendance.checkOut ? attendance.checkOut : schedule.shiftEnd;
  if (!isStrictBookingTime(shiftStart) || !isStrictBookingTime(shiftEnd)) {
    return { slots: [], availability: "unavailable", shiftStart, shiftEnd };
  }
  const startMinutes = bookingMinutes(shiftStart);
  let endMinutes = bookingMinutes(shiftEnd);
  if (startMinutes === null || endMinutes === null) {
    return { slots: [], availability: "unavailable", shiftStart, shiftEnd };
  }
  if (endMinutes <= startMinutes) endMinutes += 24 * 60;

  let earliest = startMinutes;
  if (dateKey === today) {
    const nowText = Utilities.formatDate(new Date(), TIME_ZONE, "HH:mm");
    const nowMinutes = bookingMinutes(nowText);
    earliest = Math.max(earliest, Math.ceil((nowMinutes + 15) / 30) * 30);
  }

  const slots = [];
  for (let minute = startMinutes; minute + durationMinutes <= endMinutes; minute += BOOKING_SLOT_INTERVAL_MINUTES) {
    const time = minutesToBookingTime(minute);
    if (minute >= earliest && bookingSlotIsFree(
      barber.staffId, barber.name, dateKey, time, durationMinutes,
      "", bookings, shiftStart, barbers
    )) slots.push(time);
  }

  let availability = slots.length ? "available" : "unavailable";
  if (dateKey === today && bookingMinutes(Utilities.formatDate(new Date(), TIME_ZONE, "HH:mm")) < startMinutes) availability = "not_started";
  return { slots, availability, shiftStart, shiftEnd };
}

function availableSlotsForBarber(barber, dateKey, durationMinutes, bookings, barbers, options) {
  const data = options || {};
  return runBookingAvailabilityAuthority(
    () => availableSlotsForBarberLegacy(barber, dateKey, durationMinutes, bookings, barbers),
    () => {
      if (typeof bookingAvailabilityPhase5Evaluate !== "function") {
        throw new Error("Booking Availability Phase 5 adapter is unavailable.");
      }
      const result = bookingAvailabilityPhase5Evaluate({
        employeeId: barber.staffId,
        branchId: data.branchId || barber.branchId,
        date: dateKey,
        audience: data.audience === "internal" ? "internal" : "public",
        requestData: data,
        durationMinutes,
        preparationMinutes: data.preparationMinutes || 0,
        cleanupMinutes: data.cleanupMinutes || 0,
        serviceSetHash: data.serviceSetHash || "",
        snapshot: data.availabilitySnapshot,
        bookings
      });
      const internalActor = data.audience === "internal" &&
          typeof schedulePhase2Actor === "function" ? schedulePhase2Actor(data) : null;
      const dtoPermissions = internalActor && internalActor.owner
        ? BookingAvailabilityPhase5.PERMISSIONS : ((internalActor && internalActor.permissions) || []);
      const safeResult = typeof BookingAvailabilityPhase5 !== "undefined" &&
          data.audience === "internal" &&
          typeof BookingAvailabilityPhase5.internalDto === "function"
        ? BookingAvailabilityPhase5.internalDto(result, dtoPermissions)
        : typeof BookingAvailabilityPhase5 !== "undefined" &&
            typeof BookingAvailabilityPhase5.publicDto === "function"
          ? BookingAvailabilityPhase5.publicDto(result)
        : { reasonCode: "UNAVAILABLE", availabilityToken: result.availabilityToken,
            generatedAt: result.generatedAt };
      return {
        slots: (result.slots || []).map((slot) => slot.start),
        availability: String(result.availability || "").toLowerCase(),
        shiftStart: "",
        shiftEnd: "",
        reasonCode: safeResult.reasonCode,
        availabilityToken: safeResult.availabilityToken,
        generatedAt: safeResult.generatedAt,
        ...(safeResult.scheduleSource ? { scheduleSource: safeResult.scheduleSource } : {}),
        ...(safeResult.operationalRestriction
          ? { operationalRestriction: safeResult.operationalRestriction } : {}),
        ...(safeResult.scheduleSourceIds ? { scheduleSourceIds: safeResult.scheduleSourceIds } : {}),
        ...(safeResult.versions ? { versions: safeResult.versions } : {}),
        ...(safeResult.managerOverrideAllowed
          ? { managerOverrideAllowed: true } : {})
      };
    },
    { operation: "slot_generation", employeeId: barber.staffId, date: dateKey }
  );
}

