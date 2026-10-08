function bookingAvailabilityPhase5AppendAudit(record) {
  return schedulePhase2Save(
    "BOOKING_AVAILABILITY_AUDIT",
    BookingAvailabilityPhase5.SHEET_SCHEMAS.BOOKING_AVAILABILITY_AUDIT,
    "AUDIT_ID",
    {
      auditId: record.auditId || "BAU-" + Utilities.getUuid(),
      action: record.action, entityType: record.entityType, entityId: record.entityId,
      branchId: record.branchId, staffId: record.staffId, date: record.date,
      actorId: record.actorId, actorRole: record.actorRole,
      reasonCode: record.reasonCode, sourceIds: record.sourceIds || [],
      beforeState: record.beforeState || {}, afterState: record.afterState || {},
      requestId: record.requestId || "", createdAt: record.createdAt || bookingAvailabilityPhase5Now()
    }
  );
}

function bookingAvailabilityPhase5IncrementVersion(kind, branchId, date, actor) {
  var fieldByKind = {
    booking: "bookingVersion", schedule: "scheduleVersion",
    attendance: "attendanceOperationalVersion",
    operationalOverride: "operationalOverrideVersion",
    service: "serviceVersion", branchHours: "branchHoursVersion"
  };
  var field = fieldByKind[kind];
  if (!field) return null;
  bookingAvailabilityPhase5RequireSheet("BOOKING_AVAILABILITY_VERSIONS");
  var rows = schedulePhase2ReadRows("BOOKING_AVAILABILITY_VERSIONS").filter(function (item) {
    return bookingAvailabilityPhase5Text(item.branchId) === bookingAvailabilityPhase5Text(branchId) &&
      bookingAvailabilityPhase5Text(item.date) === bookingAvailabilityPhase5Text(date);
  });
  if (rows.length > 1) {
    var duplicate = new Error("Availability version scope is ambiguous.");
    duplicate.code = "AVAILABILITY_VERSION_AMBIGUOUS";
    throw duplicate;
  }
  var before = rows[0] ? JSON.parse(JSON.stringify(rows[0])) : null;
  var current = rows[0] || {
    versionId: "BAV-" + bookingAvailabilityPhase5Text(branchId) + "-" +
      bookingAvailabilityPhase5Text(date),
    branchId: branchId, date: date, bookingVersion: 0, scheduleVersion: 0,
    attendanceOperationalVersion: 0, operationalOverrideVersion: 0,
    serviceVersion: 0, branchHoursVersion: 0
  };
  var next = BookingAvailabilityPhase5.nextGeneration(current[field], 0);
  current[field] = next.value;
  current.updatedAt = bookingAvailabilityPhase5Now();
  current.updatedBy = actor ? actor.actorId : "system";
  schedulePhase2Save(
    "BOOKING_AVAILABILITY_VERSIONS",
    BookingAvailabilityPhase5.SHEET_SCHEMAS.BOOKING_AVAILABILITY_VERSIONS,
    "VERSION_ID", current
  );
  var generationKind = kind === "schedule" ? "recurringSchedule" : kind;
  var generationScope = ["service", "recurringSchedule", "staffMembership"].indexOf(
    generationKind) !== -1 ? "GLOBAL" : "BRANCH";
  var generationId = generationScope === "GLOBAL" ? "GLOBAL" : branchId;
  var generation = bookingAvailabilityPhase5IncrementGeneration(
    generationKind, generationScope, generationId, actor, "");
  return { before: before, after: current, generation: generation };
}

function bookingAvailabilityPhase5IncrementVersionOnly(kind, branchId, date, actor) {
  var fieldByKind = {
    booking: "bookingVersion", schedule: "scheduleVersion",
    attendance: "attendanceOperationalVersion",
    operationalOverride: "operationalOverrideVersion",
    service: "serviceVersion", branchHours: "branchHoursVersion"
  };
  var field = fieldByKind[kind];
  if (!field || !bookingAvailabilityPhase5Text(branchId) ||
      !bookingAvailabilityPhase5ValidDate(date)) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_VERSION_SCOPE_INVALID", "Availability version scope is invalid.");
  }
  bookingAvailabilityPhase5RequireSheet("BOOKING_AVAILABILITY_VERSIONS");
  var rows = schedulePhase2ReadRows("BOOKING_AVAILABILITY_VERSIONS").filter(function (item) {
    return bookingAvailabilityPhase5Text(item.branchId) === bookingAvailabilityPhase5Text(branchId) &&
      bookingAvailabilityPhase5Text(item.date) === bookingAvailabilityPhase5Text(date);
  });
  if (rows.length > 1) throw BookingAvailabilityPhase5.availabilityError(
    "AVAILABILITY_VERSION_AMBIGUOUS", "Availability version scope is ambiguous.");
  var before = rows[0] ? JSON.parse(JSON.stringify(rows[0])) : null;
  var current = rows[0] || {
    versionId: "BAV-" + bookingAvailabilityPhase5Text(branchId) + "-" + date,
    branchId: branchId, date: date, bookingVersion: 0, scheduleVersion: 0,
    attendanceOperationalVersion: 0, operationalOverrideVersion: 0,
    serviceVersion: 0, branchHoursVersion: 0
  };
  current[field] = BookingAvailabilityPhase5.nextGeneration(current[field], 0).value;
  current.updatedAt = bookingAvailabilityPhase5Now();
  current.updatedBy = actor ? actor.actorId : "system";
  schedulePhase2Save(
    "BOOKING_AVAILABILITY_VERSIONS",
    BookingAvailabilityPhase5.SHEET_SCHEMAS.BOOKING_AVAILABILITY_VERSIONS,
    "VERSION_ID", current
  );
  return { before: before, after: current };
}

