function handleBookingAvailabilityPhase5Action(data) {
  try {
    if (data.action === "listPublicBookingBranches") {
      bookingAvailabilityPhase5AssertIdentity();
      return jsonOutput({
        status: "success", branches: bookingAvailabilityPhase5ListBranches(null, true)
      });
    }
    if (data.action === "previewBookingAvailabilityMigration") {
      return jsonOutput({
        status: "success", code: "AVAILABILITY_MIGRATION_PREVIEW_OK",
        migration: bookingAvailabilityPhase5PreviewMigration(data)
      });
    }
    bookingAvailabilityPhase5AssertIdentity();
    var actor = bookingAvailabilityPhase5Actor(data);
    if (data.action === "setBookingAttendanceIntegration") {
      if (!actor.owner || typeof data.enabled !== "boolean" ||
          !bookingAvailabilityPhase5Text(data.reason) ||
          !bookingAvailabilityPhase5ValidRequestId(data.clientRequestId)) {
        throw BookingAvailabilityPhase5.availabilityError("AVAILABILITY_OWNER_CONFIGURATION_REQUIRED",
          "Owner, explicit enable/disable, reason and request ID are required.");
      }
      return bookingAvailabilityPhase5WithLock(function () {
        actor = bookingAvailabilityPhase5Actor(data);
        if (!actor.owner) throw BookingAvailabilityPhase5.availabilityError("AVAILABILITY_PERMISSION_DENIED", "Owner required.");
        if (data.enabled) {
          // Check the authoritative schema before changing public availability.
          var snapshot = bookingAvailabilityPhase5RequestSnapshot();
          var today = Utilities.formatDate(new Date(), BookingAvailabilityPhase5.TIME_ZONE, "yyyy-MM-dd");
          var barbers = publicBookingBarbers();
          if (!barbers.length) throw BookingAvailabilityPhase5.availabilityError("AVAILABILITY_SETUP_REQUIRED", "Configure active bookable employees first.");
          barbers.forEach(function (staff) {
            var resolution = StaffAttendanceCore.resolveEffectivePolicy(snapshot.policies, staff.staffId, today);
            if (!staff.branchId || String(resolution.snapshot.settlementPeriod).toUpperCase() !== "DAILY") {
              throw BookingAvailabilityPhase5.availabilityError("AVAILABILITY_SETUP_REQUIRED",
                "Configure shift, break and minute prices for every active bookable employee before enabling integration.");
            }
          });
        }
        var properties = PropertiesService.getScriptProperties();
        var after = {
          BOOKING_AVAILABILITY_ENGINE: data.enabled ? "PHASE5" : "SHADOW",
          BOOKING_PHASE2_PLANNED_ENABLED: "true",
          BOOKING_ATTENDANCE_LIVE_ENABLED: String(data.enabled),
          BOOKING_CUSTOMER_LIVE_REFRESH_ENABLED: String(data.enabled),
          BOOKING_INTERNAL_LIVE_REFRESH_ENABLED: String(data.enabled),
          BOOKING_MANAGER_OVERRIDE_ENABLED: "false"
        };
        var before = {};
        Object.keys(after).forEach(function (key) { before[key] = properties.getProperty(key); });
        var result = bookingAvailabilityPhase5RunTransaction({
          data: data, requestId: data.clientRequestId, action: "BOOKING_ATTENDANCE_INTEGRATION",
          entityType: "BOOKING_ENGINE", entityId: "GLOBAL", actor: actor, beforeState: before,
          business: function () { properties.setProperties(after); return after; },
          version: function () {
            return bookingAvailabilityPhase5IncrementGeneration("recurringSchedule", "GLOBAL", "GLOBAL", actor, data.clientRequestId);
          },
          audit: function () {
            return bookingAvailabilityPhase5AppendAudit({ action: "BOOKING_ATTENDANCE_INTEGRATION",
              entityType: "BOOKING_ENGINE", entityId: "GLOBAL", actorId: actor.actorId, actorRole: actor.role,
              reasonCode: data.reason, beforeState: before, afterState: after, requestId: data.clientRequestId });
          },
          compensateBusiness: function () {
            Object.keys(before).forEach(function (key) {
              if (before[key] === null) properties.deleteProperty(key); else properties.setProperty(key, before[key]);
            });
          },
          response: function () { return { enabled: data.enabled }; }
        });
        return jsonOutput({ status: "success", integration: result });
      });
    }
    if (data.action === "getBookingAvailabilityFlags") {
      if (!bookingAvailabilityPhase5HasPermission(actor, "booking_availability.view")) {
        throw BookingAvailabilityPhase5.availabilityError(
          "AVAILABILITY_PERMISSION_DENIED", "Booking Availability permission is required.");
      }
      var currentFlags = bookingAvailabilityPhase5Flags();
      return jsonOutput({
        status: "success", flags: currentFlags,
        cacheStatus: {
          available: typeof CacheService !== "undefined",
          tokenVersioningEnabled: currentFlags.engine !== "LEGACY"
        },
        quotaEstimate: bookingAvailabilityPhase5QuotaEstimate(schedulePhase2ReadStaff().length)
      });
    }
    if (data.action === "listBookingBranches") {
      if (!bookingAvailabilityPhase5HasPermission(actor, "booking_availability.view")) {
        throw BookingAvailabilityPhase5.availabilityError(
          "AVAILABILITY_PERMISSION_DENIED", "Booking Availability permission is required.");
      }
      return jsonOutput({
        status: "success", branches: bookingAvailabilityPhase5ListBranches(actor, false),
        branchHours: bookingAvailabilityPhase5ListBranchHours(actor)
      });
    }
    if (data.action === "saveBookingBranchHours") {
      return jsonOutput({
        status: "success", branchHours: bookingAvailabilityPhase5SaveBranchHours(data, actor)
      });
    }
    if (data.action === "saveBookingBranchConfiguration") {
      return jsonOutput({
        status: "success",
        branch: bookingAvailabilityPhase5SaveBranchConfiguration(data, actor)
      });
    }
    if (data.action === "recoverBookingAvailabilityTransaction") {
      return jsonOutput({
        status: "success",
        recovery: bookingAvailabilityPhase5RecoverWorkPolicyTransaction(data, actor)
      });
    }
    if (data.action === "previewBookingNoCheckInTriggerInstallation") {
      return jsonOutput({
        status: "success", preview: previewBookingNoCheckInTriggerInstallation(data)
      });
    }
    if (data.action === "runBookingNoCheckInDetector") {
      return jsonOutput({
        status: "success", detector: runBookingNoCheckInDetector(data)
      });
    }
    if (data.action === "createBookingOperationalOverride") {
      return jsonOutput({
        status: "success", operationalOverride: bookingAvailabilityPhase5CreateOverride(data, actor)
      });
    }
    if (data.action === "revokeBookingOperationalOverride") {
      return jsonOutput({
        status: "success", operationalOverride: bookingAvailabilityPhase5RevokeOverride(data, actor)
      });
    }
    if (data.action === "listBookingAvailabilityConflicts") {
      if (!bookingAvailabilityPhase5HasPermission(actor, "booking_availability.view_restrictions")) {
        throw BookingAvailabilityPhase5.availabilityError(
          "AVAILABILITY_PERMISSION_DENIED", "Conflict viewing permission is required.");
      }
      var conflicts = schedulePhase2ReadRows("BOOKING_AVAILABILITY_CONFLICTS").filter(function (item) {
        if (actor.owner) return true;
        return (actor.branchIds || []).indexOf(item.branchId) !== -1;
      }).map(function (item) {
        return {
          conflictId: item.conflictId, conflictCode: item.conflictCode,
          bookingId: item.bookingId, branchId: item.branchId, staffId: item.staffId,
          date: item.date, slotStart: item.slotStart, slotEnd: item.slotEnd,
          status: item.status, detectedAt: item.detectedAt
        };
      });
      return jsonOutput({ status: "success", conflicts: conflicts });
    }
    if (data.action === "listBookingOperationalOverrides") {
      if (!bookingAvailabilityPhase5HasPermission(actor, "booking_availability.view_operational")) {
        throw BookingAvailabilityPhase5.availabilityError(
          "AVAILABILITY_PERMISSION_DENIED", "Operational availability permission is required.");
      }
      var overrides = schedulePhase2ReadRows("BOOKING_OPERATIONAL_OVERRIDES").filter(function (item) {
        return actor.owner || (actor.branchIds || []).indexOf(item.branchId) !== -1;
      }).map(function (item) {
        return {
          operationalOverrideId: item.operationalOverrideId, branchId: item.branchId,
          staffId: item.staffId, date: item.date, startTime: item.startTime,
          endTime: item.endTime, status: item.status, reason: item.reason
        };
      });
      return jsonOutput({ status: "success", operationalOverrides: overrides });
    }
    if (data.action === "listBookingAvailabilityAudit") {
      if (!bookingAvailabilityPhase5HasPermission(actor, "booking_availability.view_audit")) {
        throw BookingAvailabilityPhase5.availabilityError(
          "AVAILABILITY_PERMISSION_DENIED", "Booking Availability audit permission is required.");
      }
      var audits = schedulePhase2ReadRows("BOOKING_AVAILABILITY_AUDIT").filter(function (item) {
        return actor.owner || (actor.branchIds || []).indexOf(item.branchId) !== -1;
      }).map(function (item) {
        return {
          auditId: item.auditId, action: item.action, entityType: item.entityType,
          entityId: item.entityId, branchId: item.branchId, staffId: item.staffId,
          date: item.date, actorId: item.actorId, actorRole: item.actorRole,
          reasonCode: item.reasonCode, sourceIds: item.sourceIds,
          beforeState: item.beforeState, afterState: item.afterState,
          requestId: item.requestId, createdAt: item.createdAt
        };
      });
      return jsonOutput({ status: "success", audit: audits });
    }
    if (data.action === "transitionBookingAvailabilityConflict") {
      return jsonOutput({
        status: "success", conflict: bookingAvailabilityPhase5TransitionConflict(data, actor)
      });
    }
    throw BookingAvailabilityPhase5.availabilityError(
      "AVAILABILITY_ACTION_UNKNOWN", "Booking Availability action is not supported.");
  } catch (error) {
    return jsonOutput({
      status: "error", code: error.code || "AVAILABILITY_INTERNAL_ERROR",
      message: error.message || "Booking Availability request failed.",
      details: error.details || undefined
    });
  }
}

/* END booking-availability-phase5-gas.js */
