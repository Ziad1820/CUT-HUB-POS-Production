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
