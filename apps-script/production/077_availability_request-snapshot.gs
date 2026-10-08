function bookingAvailabilityPhase5RequestSnapshot() {
  var staff = schedulePhase2ReadStaff();
  var versions = schedulePhase2ReadRows("BOOKING_AVAILABILITY_VERSIONS");
  var generations = schedulePhase2ReadRows("BOOKING_AVAILABILITY_GENERATIONS");
  var hours = bookingAvailabilityPhase5ReadBranchHours();
  var overrides = schedulePhase2ReadRows("BOOKING_OPERATIONAL_OVERRIDES");
  var attendanceDays = attendancePhase3ReadDays();
  var attendanceEvents = schedulePhase2ReadRows("ATTENDANCE_EVENTS");
  var bookings = getAllBookingsV2();
  var branches = schedulePhase2ReadRows("BOOKING_BRANCH_REGISTRY");
  var schedules = schedulePhase2ReadSchedules();
  var scheduleOverrides = schedulePhase2ReadRows("STAFF_SCHEDULE_OVERRIDES");
  var policies = schedulePhase2ReadRows("STAFF_WORK_POLICIES");
  var staffById = {};
  var attendanceDaysByStaffDate = {};
  var attendanceEventsByDayId = {};
  staff.forEach(function (item) { staffById[bookingAvailabilityPhase5Text(item.staffId)] = item; });
  attendanceDays.forEach(function (item) {
    var key = bookingAvailabilityPhase5Text(item.staffId) + "|" +
      bookingAvailabilityPhase5Text(item.attendanceDate || item.date);
    if (!attendanceDaysByStaffDate[key]) attendanceDaysByStaffDate[key] = [];
    attendanceDaysByStaffDate[key].push(item);
  });
  attendanceEvents.forEach(function (item) {
    var key = bookingAvailabilityPhase5Text(item.attendanceDayId);
    if (!attendanceEventsByDayId[key]) attendanceEventsByDayId[key] = [];
    attendanceEventsByDayId[key].push(item);
  });
  return {
    staff: staff, staffById: staffById, versions: versions, generations: generations,
    branchHours: hours, overrides: overrides, attendanceDays: attendanceDays,
    attendanceEvents: attendanceEvents, bookings: bookings, branches: branches,
    schedules: schedules, scheduleOverrides: scheduleOverrides, policies: policies,
    attendanceDaysByStaffDate: attendanceDaysByStaffDate,
    attendanceEventsByDayId: attendanceEventsByDayId
  };
}

function bookingAvailabilityPhase5QuotaEstimate(staffCount) {
  var count = Math.max(0, Number(staffCount) || 0);
  return {
    estimateOnly: true,
    authoritativeSheetReadsPerRequest: 12,
    authoritativeSheetWritesPerReadRequest: 0,
    cacheReadsPerStaff: 1,
    cacheWritesPerStaffMaximum: 1,
    note: "Fixed request snapshot estimate; measure Apps Script runtime and quotas before production claims."
  };
}

function bookingAvailabilityPhase5ResolveSchedule(staff, date, snapshot) {
  if (!snapshot || !snapshot.schedules || !snapshot.scheduleOverrides || !snapshot.policies) {
    return attendancePhase3ResolveSchedule(staff, date);
  }
  if (typeof StaffAttendanceCore === "undefined" ||
      typeof StaffSchedulingPhase2 === "undefined") {
    return attendancePhase3ResolveSchedule(staff, date);
  }
  var policyResolution;
  try {
    policyResolution = StaffAttendanceCore.resolveEffectivePolicy(
      snapshot.policies, staff.staffId, date);
  } catch (error) {
    if (error.code !== "POLICY_NOT_FOUND") throw error;
    policyResolution = { source: "SAFE_DEFAULT", policyId: "PHASE3_SAFE_DEFAULT",
      snapshot: { requiredDailyMinutes: 0, allowedBreakMinutes: 0 } };
  }
  return StaffSchedulingPhase2.resolveSchedule({
    staff: staff, date: date, schedules: snapshot.schedules,
    overrides: snapshot.scheduleOverrides, policyResolution: policyResolution
  });
}

function bookingAvailabilityPhase5Attendance(staff, date, snapshot) {
  var indexedDays = snapshot && snapshot.attendanceDaysByStaffDate;
  var days = indexedDays
    ? (indexedDays[bookingAvailabilityPhase5Text(staff.staffId) + "|" + date] || [])
    : ((snapshot && snapshot.attendanceDays) || attendancePhase3ReadDays()).filter(function (item) {
    return bookingAvailabilityPhase5Text(item.staffId) === bookingAvailabilityPhase5Text(staff.staffId) &&
      bookingAvailabilityPhase5Text(item.attendanceDate || item.date) === date;
  });
  if (days.length > 1) {
    var duplicate = new Error("Attendance day is ambiguous for Booking Availability.");
    duplicate.code = "AVAILABILITY_ATTENDANCE_DAY_AMBIGUOUS";
    throw duplicate;
  }
  var day = days[0] || null;
  var indexedEvents = snapshot && snapshot.attendanceEventsByDayId;
  var events = day ? (indexedEvents
    ? (indexedEvents[bookingAvailabilityPhase5Text(day.attendanceDayId)] || [])
    : ((snapshot && snapshot.attendanceEvents) ||
    schedulePhase2ReadRows("ATTENDANCE_EVENTS")).filter(function (item) {
    return bookingAvailabilityPhase5Text(item.attendanceDayId) ===
      bookingAvailabilityPhase5Text(day.attendanceDayId);
  })) : [];
  var eventState = StaffAttendancePhase3.buildEventState(events);
  return {
    attendanceDayId: day ? bookingAvailabilityPhase5Text(day.attendanceDayId) : "",
    state: day && String(day.status).toUpperCase() === "UNRESOLVED"
      ? "UNRESOLVED" : eventState.state,
    status: day ? bookingAvailabilityPhase5Text(day.status) : "NOT_STARTED",
    dayLifecycle: day ? bookingAvailabilityPhase5Text(day.dayLifecycle || "OPEN") : "OPEN",
    staleCalculation: !!(day && day.staleCalculation),
    openSession: eventState.openSession,
    openBreak: eventState.openBreak,
    breaks: eventState.breaks,
    actualCheckIn: day ? bookingAvailabilityPhase5Text(day.actualCheckIn) : "",
    actualCheckOut: day ? bookingAvailabilityPhase5Text(day.actualCheckOut) :
      (eventState.sessions.length ? bookingAvailabilityPhase5Text(
        eventState.sessions[eventState.sessions.length - 1].checkOutAt) : ""),
    sourceEventIds: eventState.validEvents.map(function (item) { return item.eventId; })
  };
}

