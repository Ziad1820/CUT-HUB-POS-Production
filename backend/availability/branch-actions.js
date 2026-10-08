function bookingAvailabilityPhase5ListBranches(actor, publicAudience) {
  bookingAvailabilityPhase5RequireSheet("BOOKING_BRANCH_REGISTRY");
  return schedulePhase2ReadRows("BOOKING_BRANCH_REGISTRY").filter(function (item) {
    var active = item.active === true || String(item.active).toUpperCase() === "TRUE";
    if (publicAudience) {
      return active && (item.publicSelectable === true ||
        String(item.publicSelectable).toUpperCase() === "TRUE");
    }
    if (actor.owner) return true;
    return active && (actor.branchIds || []).indexOf(item.branchId) !== -1;
  }).map(function (item) {
    return {
      branchId: item.branchId, branchName: item.branchName,
      active: item.active === true || String(item.active).toUpperCase() === "TRUE",
      timeZone: item.timeZone || BookingAvailabilityPhase5.TIME_ZONE,
      publicSelectable: item.publicSelectable === true ||
        String(item.publicSelectable).toUpperCase() === "TRUE",
      closureStatus: item.closureStatus || "OPEN",
      closureReason: publicAudience ? "" : (item.closureReason || "")
    };
  });
}

function bookingAvailabilityPhase5ListBranchHours(actor) {
  if (!actor.owner &&
      !bookingAvailabilityPhase5HasPermission(actor, "booking_availability.view_operational") &&
      !bookingAvailabilityPhase5HasPermission(actor, "booking_availability.manage_override")) {
    return [];
  }
  bookingAvailabilityPhase5RequireSheet("BRANCH_BOOKING_HOURS");
  var branches = schedulePhase2ReadRows("BOOKING_BRANCH_REGISTRY");
  return bookingAvailabilityPhase5ReadBranchHours().filter(function (item) {
    return actor.owner || (actor.branchIds || []).indexOf(item.branchId) !== -1;
  }).map(function (item) {
    var matches = branches.filter(function (branch) {
      return bookingAvailabilityPhase5Text(branch.branchId) === bookingAvailabilityPhase5Text(item.branchId);
    });
    var timeZone = matches.length === 1 ? bookingAvailabilityPhase5Text(matches[0].timeZone) : "";
    return {
      branchHoursId: item.branchHoursId, branchId: item.branchId,
      weekday: String(item.weekday || "").toUpperCase(),
      openTime: bookingAvailabilityPhase5ClockText(item.openTime, timeZone),
      closeTime: bookingAvailabilityPhase5ClockText(item.closeTime, timeZone),
      active: item.active === true || String(item.active).toUpperCase() === "TRUE",
      effectiveFrom: item.effectiveFrom || "", effectiveTo: item.effectiveTo || ""
    };
  });
}

function bookingAvailabilityPhase5SaveBranchHours(data, actor) {
  if (!actor.owner && !bookingAvailabilityPhase5HasPermission(
      actor, "booking_availability.manage_override")) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_PERMISSION_DENIED", "Branch-hours management permission is required.");
  }
  var branchId = bookingAvailabilityPhase5Text(data.branchId);
  bookingAvailabilityPhase5AssertBranchScope(actor, branchId);
  var branch = bookingAvailabilityPhase5Branch(branchId, { allowClosed: true });
  var requestId = bookingAvailabilityPhase5Text(data.clientRequestId);
  var weekday = String(data.weekday || "").toUpperCase();
  var openTime = bookingAvailabilityPhase5Text(data.openTime);
  var closeTime = bookingAvailabilityPhase5Text(data.closeTime);
  var effectiveFrom = bookingAvailabilityPhase5Text(data.effectiveFrom);
  var effectiveTo = bookingAvailabilityPhase5Text(data.effectiveTo);
  if (!bookingAvailabilityPhase5ValidRequestId(requestId) ||
      ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
        .indexOf(weekday) === -1 ||
      bookingAvailabilityPhase5ClockMinutes(openTime) === null ||
      bookingAvailabilityPhase5ClockMinutes(closeTime) === null || openTime === closeTime) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_BRANCH_HOURS_INVALID", "Valid branch hours and request ID are required.");
  }
  if ((effectiveFrom && !bookingAvailabilityPhase5ValidDate(effectiveFrom)) ||
      (effectiveTo && !bookingAvailabilityPhase5ValidDate(effectiveTo)) ||
      (effectiveFrom && effectiveTo && effectiveFrom > effectiveTo)) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_BRANCH_HOURS_EFFECTIVE_RANGE_INVALID",
      "Branch-hours effective dates must be valid and ordered.");
  }
  return bookingAvailabilityPhase5WithLock(function () {
    var id = branchId + "-" + weekday;
    var rows = schedulePhase2ReadRows("BRANCH_BOOKING_HOURS").filter(function (item) {
      return bookingAvailabilityPhase5Text(item.branchHoursId) === id;
    });
    if (rows.length > 1) throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_BRANCH_HOURS_AMBIGUOUS", "Branch hours are ambiguous.");
    var before = rows[0] ? JSON.parse(JSON.stringify(rows[0])) : null;
    var now = bookingAvailabilityPhase5Now();
    var record = rows[0] || {
      branchHoursId: id, branchId: branchId, weekday: weekday,
      createdAt: now, createdBy: actor.actorId
    };
    record.openTime = openTime; record.closeTime = closeTime;
    record.active = data.active !== false;
    record.effectiveFrom = effectiveFrom;
    record.effectiveTo = effectiveTo;
    record.updatedAt = now; record.updatedBy = actor.actorId; record.lastRequestId = requestId;
    return bookingAvailabilityPhase5RunTransaction({
      data: data, requestId: requestId, action: "BRANCH_HOURS_SAVE",
      entityType: "BRANCH_BOOKING_HOURS", entityId: id, branchId: branchId,
      actor: actor, beforeState: before || {},
      business: function () {
        schedulePhase2Save(
          "BRANCH_BOOKING_HOURS",
          BookingAvailabilityPhase5.SHEET_SCHEMAS.BRANCH_BOOKING_HOURS,
          "BRANCH_HOURS_ID", record);
        return record;
      },
      version: function () {
        return bookingAvailabilityPhase5IncrementGeneration(
          "branchHours", "BRANCH", branchId, actor, requestId);
      },
      audit: function () {
        return bookingAvailabilityPhase5AppendAudit({
          action: "BRANCH_BOOKING_HOURS_SAVED", entityType: "BRANCH_BOOKING_HOURS",
          entityId: id, branchId: branchId, actorId: actor.actorId, actorRole: actor.role,
          reasonCode: "BRANCH_HOURS_CONFIGURATION", beforeState: before || {},
          afterState: record, requestId: requestId
        });
      },
      compensateBusiness: function () {
        if (!before) {
          record.active = false;
          record.updatedAt = bookingAvailabilityPhase5Now();
          record.updatedBy = "transaction-compensation";
          schedulePhase2Save("BRANCH_BOOKING_HOURS",
            BookingAvailabilityPhase5.SHEET_SCHEMAS.BRANCH_BOOKING_HOURS,
            "BRANCH_HOURS_ID", record);
        } else {
          schedulePhase2Save("BRANCH_BOOKING_HOURS",
            BookingAvailabilityPhase5.SHEET_SCHEMAS.BRANCH_BOOKING_HOURS,
            "BRANCH_HOURS_ID", before);
        }
      },
      response: function () {
        return {
          branchId: branch.branchId, weekday: weekday, openTime: openTime,
          closeTime: closeTime, active: record.active
        };
      }
    });
  });
}

function bookingAvailabilityPhase5SaveBranchConfiguration(data, actor) {
  if (!actor.owner) throw BookingAvailabilityPhase5.availabilityError(
    "AVAILABILITY_OWNER_REQUIRED", "Only owner can manage the canonical branch registry.");
  var branchId = bookingAvailabilityPhase5Text(data.branchId);
  var branchName = bookingAvailabilityPhase5Text(data.branchName);
  var timeZone = bookingAvailabilityPhase5Text(data.timeZone) ||
    BookingAvailabilityPhase5.TIME_ZONE;
  var requestId = bookingAvailabilityPhase5Text(data.clientRequestId);
  if (!branchId || !branchName || !bookingAvailabilityPhase5ValidRequestId(requestId)) {
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_BRANCH_CONFIGURATION_INVALID",
      "Stable branch ID, branch name, timezone, and request ID are required.");
  }
  var candidate = {
    branchId: branchId, branchName: branchName, active: data.active !== false,
    timeZone: timeZone, publicSelectable: data.publicSelectable === true,
    closureStatus: String(data.closureStatus || "OPEN").toUpperCase(),
    closureReason: bookingAvailabilityPhase5Text(data.closureReason)
  };
  if (candidate.active) BookingAvailabilityPhase5.validateBranchConfiguration(candidate);
  return bookingAvailabilityPhase5WithLock(function () {
    var matches = schedulePhase2ReadRows("BOOKING_BRANCH_REGISTRY").filter(function (item) {
      return bookingAvailabilityPhase5Text(item.branchId) === branchId;
    });
    if (matches.length > 1) throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_BRANCH_AMBIGUOUS", "Branch registry identity is ambiguous.");
    var before = matches[0] ? JSON.parse(JSON.stringify(matches[0])) : null;
    var now = bookingAvailabilityPhase5Now();
    var record = matches[0] || {
      branchId: branchId, createdAt: now, createdBy: actor.actorId
    };
    Object.keys(candidate).forEach(function (key) { record[key] = candidate[key]; });
    record.updatedAt = now; record.updatedBy = actor.actorId; record.lastRequestId = requestId;
    return bookingAvailabilityPhase5RunTransaction({
      data: data, requestId: requestId, action: "BRANCH_CONFIGURATION_SAVE",
      entityType: "BOOKING_BRANCH", entityId: branchId, branchId: branchId,
      actor: actor, beforeState: before || {},
      business: function () {
        schedulePhase2Save("BOOKING_BRANCH_REGISTRY",
          BookingAvailabilityPhase5.SHEET_SCHEMAS.BOOKING_BRANCH_REGISTRY,
          "BRANCH_ID", record);
        return record;
      },
      version: function () {
        return bookingAvailabilityPhase5IncrementGeneration(
          "branchHours", "BRANCH", branchId, actor, requestId);
      },
      audit: function () {
        return bookingAvailabilityPhase5AppendAudit({
          action: "BOOKING_BRANCH_CONFIGURATION_SAVED", entityType: "BOOKING_BRANCH",
          entityId: branchId, branchId: branchId, actorId: actor.actorId,
          actorRole: actor.role, reasonCode: "BRANCH_CONFIGURATION",
          beforeState: before || {}, afterState: record, requestId: requestId
        });
      },
      compensateBusiness: function () {
        var compensation = before || Object.assign({}, record, {
          active: false, publicSelectable: false,
          closureStatus: "CLOSED", closureReason: "COMPENSATED_UNCOMMITTED_BRANCH"
        });
        schedulePhase2Save("BOOKING_BRANCH_REGISTRY",
          BookingAvailabilityPhase5.SHEET_SCHEMAS.BOOKING_BRANCH_REGISTRY,
          "BRANCH_ID", compensation);
      }
    });
  });
}

