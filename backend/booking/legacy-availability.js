function publicBookingBarbers() {
  const sheet = getStaffSheet();
  if (sheet.getLastRow() < 2) return [];
  const width = typeof sheet.getLastColumn === "function" ? Math.max(11, sheet.getLastColumn()) : 11;
  const headers = width > 11
    ? sheet.getRange(1, 1, 1, width).getValues()[0].map((value) =>
      String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_"))
    : [];
  const branchIndex = headers.indexOf("BRANCH_ID");
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, width).getValues()
    .map((row, index) => ({
      staffId: String(row[4] || buildStaffId(index + 1)).trim(),
      name: String(row[0] || "").trim(),
      code: String(row[1] || "").trim(),
      active: parseSheetBoolean(row[7], true),
      isBarber: parseSheetBoolean(row[10], true),
      branchId: branchIndex >= 0 ? String(row[branchIndex] || "").trim() : ""
    }))
    .filter((barber) => barber.staffId && barber.name && barber.active && barber.isBarber);
}

function getUniqueActiveBarberByNameV2(employeeName, barbers) {
  const employeeKey = normalizeLookupKey(employeeName);
  if (!employeeKey) return null;
  const activeBarbers = Array.isArray(barbers) ? barbers : publicBookingBarbers();
  const matches = activeBarbers.filter((barber) => normalizeLookupKey(barber.name) === employeeKey);
  return matches.length === 1 ? matches[0] : null;
}

function bookingWeekday(dateKey) {
  const day = Utilities.formatDate(new Date(`${dateKey}T12:00:00`), TIME_ZONE, "EEEE");
  return String(day || "").trim().toLowerCase();
}

function normalizeScheduleWeekday(value) {
  const key = String(value || "").trim().toLowerCase();
  const aliases = {
    "0": "sunday", sun: "sunday", sunday: "sunday", "الأحد": "sunday", "الاحد": "sunday",
    "1": "monday", mon: "monday", monday: "monday", "الاثنين": "monday", "الإثنين": "monday",
    "2": "tuesday", tue: "tuesday", tuesday: "tuesday", "الثلاثاء": "tuesday",
    "3": "wednesday", wed: "wednesday", wednesday: "wednesday", "الأربعاء": "wednesday", "الاربعاء": "wednesday",
    "4": "thursday", thu: "thursday", thursday: "thursday", "الخميس": "thursday",
    "5": "friday", fri: "friday", friday: "friday", "الجمعة": "friday",
    "6": "saturday", sat: "saturday", saturday: "saturday", "السبت": "saturday"
  };
  return aliases[key] || key;
}

function getScheduleForBarber(barber, dateKey, barbers) {
  const sheet = getBarberScheduleSheetReadOnly();
  const weekday = bookingWeekday(dateKey);
  let matching = null;
  if (sheet.getLastRow() >= 2) {
    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, BARBER_SCHEDULE_HEADERS.length).getValues();
    matching = rows.find((row) => {
      const rowStaffId = String(row[1] || "").trim();
      const rowStaffName = normalizeLookupKey(row[2]);
      const rowDay = normalizeScheduleWeekday(row[3]);
      const active = parseSheetBoolean(row[6], true);
      const employeeMatches = rowStaffId
        ? rowStaffId === barber.staffId
        : String((getUniqueActiveBarberByNameV2(rowStaffName, barbers) || {}).staffId || "") === barber.staffId;
      return active && rowDay === weekday && employeeMatches;
    }) || null;
  }

  if (!matching) return { shiftStart: "12:00", shiftEnd: "02:00", scheduled: false };
  return {
    shiftStart: getBookingTimeValue(matching[4]) || "12:00",
    shiftEnd: getBookingTimeValue(matching[5]) || "02:00",
    scheduled: true
  };
}

function getAttendanceOverride(barber, dateKey, barbers) {
  const sheet = getAttendanceSheetReadOnly();
  if (sheet.getLastRow() < 2) return null;
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, ATTENDANCE_HEADERS.length).getValues();
  const matches = rows.filter((row) => {
    const rowDate = getDateKey(row[1], TIME_ZONE);
    const staffId = String(row[2] || "").trim();
    const staffName = normalizeLookupKey(row[3]);
    const employeeMatches = staffId
      ? staffId === barber.staffId
      : String((getUniqueActiveBarberByNameV2(staffName, barbers) || {}).staffId || "") === barber.staffId;
    return rowDate === dateKey && employeeMatches;
  });
  if (!matches.length) return null;
  const absent = matches.find((row) => String(row[4] || "").trim().toLowerCase() === "absent");
  if (absent) return { unavailable: true, recordType: "absent" };
  const work = matches.reverse().find((row) => String(row[4] || "work").trim().toLowerCase() === "work");
  return work ? {
    unavailable: false,
    recordType: "work",
    shiftStart: getBookingTimeValue(work[5]),
    checkIn: getBookingTimeValue(work[6]),
    checkOut: getBookingTimeValue(work[9])
  } : null;
}

function bookingMinutes(value) {
  const parts = String(value || "").trim().split(":");
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? (hours * 60) + minutes : null;
}

function minutesToBookingTime(value) {
  const normalized = ((Number(value) % (24 * 60)) + (24 * 60)) % (24 * 60);
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

function bookingTimelineMinutes(value, shiftStart) {
  let minutes = bookingMinutes(value);
  const startMinutes = bookingMinutes(shiftStart);
  if (minutes !== null && startMinutes !== null && minutes < startMinutes) minutes += 24 * 60;
  return minutes;
}

function bookingHoldIsActive(booking) {
  if (booking.status !== "pending") return false;
  if (!booking.holdExpiresAt) return true;
  const expires = new Date(booking.holdExpiresAt);
  return isNaN(expires.getTime()) || expires.getTime() > Date.now();
}

function bookingBlocksSlot(booking) {
  return !booking.deleted && (booking.status === "confirmed" || booking.status === "proposed" || bookingHoldIsActive(booking));
}

function isBookingStatusTransitionAllowed(currentStatus, nextStatus) {
  const allowed = {
    pending: ["confirmed", "proposed", "rejected", "cancelled", "expired"],
    proposed: ["confirmed", "rejected", "cancelled", "expired"],
    confirmed: ["done", "cancelled"],
    done: [],
    rejected: [],
    cancelled: [],
    expired: []
  };
  const current = normalizeBookingStatusV2(currentStatus);
  const next = normalizeBookingStatusV2(nextStatus);
  return current !== next && (allowed[current] || []).indexOf(next) !== -1;
}

function bookingStatusIsTerminal(status) {
  return ["done", "cancelled", "rejected", "expired"].indexOf(normalizeBookingStatusV2(status)) !== -1;
}

function getAllBookingsV2() {
  const sheet = getBookingsSheetV2ReadOnly();
  if (sheet.getLastRow() < 2) return [];
  const headers = getBookingHeadersV2(sheet);
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues()
    .map((row, index) => bookingFromRowV2(row, index + 2, headers));
}

function getAllBookingsV2ForWrite() {
  const sheet = getBookingsSheetV2();
  if (sheet.getLastRow() < 2) return [];
  const headers = getBookingHeadersV2(sheet);
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues()
    .map((row, index) => bookingFromRowV2(row, index + 2, headers));
}

function bookingEmployeeMatchesV2(booking, employeeId, employeeName, barbers) {
  const bookingEmployeeId = String(booking.employeeId || "").trim();
  const requestedEmployeeId = String(employeeId || "").trim();
  if (bookingEmployeeId && requestedEmployeeId) return bookingEmployeeId === requestedEmployeeId;
  if (bookingEmployeeId) return false;
  const bookingEmployeeName = normalizeLookupKey(booking.employee);
  if (!bookingEmployeeName) return false;
  const uniqueBarber = getUniqueActiveBarberByNameV2(bookingEmployeeName, barbers);
  if (!uniqueBarber) return false;
  if (requestedEmployeeId) {
    return String(uniqueBarber.staffId || "").trim() === requestedEmployeeId;
  }
  return bookingEmployeeName === normalizeLookupKey(employeeName);
}

function bookingSlotIsFree(employeeId, employeeName, dateKey, time, durationMinutes, excludeId, bookings, shiftStart, barbers) {
  const start = shiftStart ? bookingTimelineMinutes(time, shiftStart) : bookingMinutes(time);
  if (start === null) return false;
  const end = start + Math.max(15, Number(durationMinutes) || 30);
  const bookingRows = Array.isArray(bookings) ? bookings : getAllBookingsV2();
  return !bookingRows.some((booking) => {
    const occupiedDate = booking.status === "proposed" && booking.proposedDate ? booking.proposedDate : booking.date;
    const occupiedTime = booking.status === "proposed" && booking.proposedTime ? booking.proposedTime : booking.time;
    if (booking.id === excludeId || occupiedDate !== dateKey ||
        !bookingEmployeeMatchesV2(booking, employeeId, employeeName, barbers) ||
        !bookingBlocksSlot(booking)) return false;
    const otherStart = shiftStart ? bookingTimelineMinutes(occupiedTime, shiftStart) : bookingMinutes(occupiedTime);
    if (otherStart === null) return false;
    const otherEnd = otherStart + Math.max(15, Number(booking.durationMinutes) || 30);
    return start < otherEnd && end > otherStart;
  });
}

function resolveBookingBarberV2(employeeId, employeeName, barbers) {
  const rows = Array.isArray(barbers) ? barbers : publicBookingBarbers();
  const cleanId = String(employeeId || "").trim();
  if (cleanId) return rows.find((barber) => String(barber.staffId || "").trim() === cleanId) || null;
  const nameMatches = rows.filter((barber) => normalizeLookupKey(barber.name) === normalizeLookupKey(employeeName));
  return nameMatches.length === 1 ? nameMatches[0] : null;
}

function bookingAppointmentValidationError(code, message) {
  return { ok: false, code: code || "SLOT_UNAVAILABLE", message };
}

function validateBookingAppointmentLegacyV2(options) {
  const dateKey = String(options.date || "").trim();
  const time = normalizeDigits(String(options.time || "").trim());
  const durationMinutes = Number(options.durationMinutes);
  if (!isValidBookingDateKey(dateKey) || !isStrictBookingTime(time) || !isValidBookingDuration(durationMinutes)) {
    return bookingAppointmentValidationError("INVALID_APPOINTMENT", "The appointment date, time, or duration is invalid.");
  }
  const barber = resolveBookingBarberV2(options.employeeId, options.employeeName, options.barbers);
  if (!barber) return bookingAppointmentValidationError("EMPLOYEE_UNAVAILABLE", "The selected employee does not exist or is inactive.");
  const schedule = getScheduleForBarber(barber, dateKey, options.barbers);
  if (!schedule.scheduled) return bookingAppointmentValidationError("EMPLOYEE_UNAVAILABLE", "The selected employee is not scheduled to work on this date.");
  const attendance = getAttendanceOverride(barber, dateKey, options.barbers);
  if (attendance && attendance.unavailable) {
    return bookingAppointmentValidationError("EMPLOYEE_UNAVAILABLE", "The selected employee is absent or unavailable.");
  }
  const shiftStart = attendance && attendance.shiftStart ? attendance.shiftStart : schedule.shiftStart;
  const shiftEnd = attendance && attendance.checkOut ? attendance.checkOut : schedule.shiftEnd;
  if (!isStrictBookingTime(shiftStart) || !isStrictBookingTime(shiftEnd)) {
    return bookingAppointmentValidationError("INVALID_APPOINTMENT", "The employee schedule contains an invalid time.");
  }
  const shiftStartMinutes = bookingMinutes(shiftStart);
  let shiftEndMinutes = bookingMinutes(shiftEnd);
  const appointmentStart = bookingTimelineMinutes(time, shiftStart);
  if (shiftStartMinutes === null || shiftEndMinutes === null || appointmentStart === null) {
    return bookingAppointmentValidationError("INVALID_APPOINTMENT", "The employee schedule contains an invalid time.");
  }
  if (shiftEndMinutes <= shiftStartMinutes) shiftEndMinutes += 24 * 60;
  const appointmentEnd = appointmentStart + durationMinutes;
  if (appointmentStart < shiftStartMinutes || appointmentEnd > shiftEndMinutes ||
      (appointmentStart - shiftStartMinutes) % BOOKING_SLOT_INTERVAL_MINUTES !== 0) {
    return bookingAppointmentValidationError("SLOT_UNAVAILABLE", "The appointment is outside the employee shift or does not align with booking slots.");
  }
  const today = Utilities.formatDate(new Date(), TIME_ZONE, "yyyy-MM-dd");
  if (dateKey < today) return bookingAppointmentValidationError("SLOT_UNAVAILABLE", "Appointments cannot be created in the past.");
  if (dateKey === today) {
    const nowMinutes = bookingMinutes(Utilities.formatDate(new Date(), TIME_ZONE, "HH:mm"));
    if (appointmentStart < Math.ceil((nowMinutes + 15) / BOOKING_SLOT_INTERVAL_MINUTES) * BOOKING_SLOT_INTERVAL_MINUTES) {
      return bookingAppointmentValidationError("SLOT_UNAVAILABLE", "The appointment time is in the past.");
    }
  }
  const bookings = Array.isArray(options.bookings) ? options.bookings : getAllBookingsV2();
  if (!bookingSlotIsFree(
    barber.staffId, barber.name, dateKey, time, durationMinutes,
    options.excludeId || "", bookings, shiftStart, options.barbers
  )) {
    return bookingAppointmentValidationError("SLOT_UNAVAILABLE", "This appointment overlaps another active booking.");
  }
  return { ok: true, barber, date: dateKey, time, durationMinutes, shiftStart, shiftEnd };
}

function bookingEffectiveStatusV2(booking, nowMs) {
  const status = normalizeBookingStatusV2(booking && booking.status);
  if (status !== "pending" || !booking.holdExpiresAt) return status;
  const expiry = Date.parse(booking.holdExpiresAt);
  return Number.isFinite(expiry) && expiry <= (Number(nowMs) || Date.now())
    ? "expired" : status;
}

