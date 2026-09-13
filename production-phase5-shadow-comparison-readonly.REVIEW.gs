// LOCAL REVIEW ONLY. Temporary Production HEAD diagnostic; never bundle or deploy.
// Does not activate SHADOW. Requires the exact existing SHADOW baseline.
function previewProductionShadowComparisonReadOnly() {
  var stage = "identity";
  var code = "IDENTITY_CHECK_FAILED";
  try {
    var scriptId = "1UmjdRMGLukMt_0Be_ZL2krphwtZ-CQHPOiZ3GF10pY9-glgvoubfGflP";
    var spreadsheetId = "1r0I9J-IZF1GhMC4Yvj73S8VdjJQxMfmOgP4v0ZFNOb0";
    var props = PropertiesService.getScriptProperties();
    function requireValue(condition, failureCode) {
      if (!condition) { code = failureCode; throw new Error(failureCode); }
    }
    requireValue(ScriptApp.getScriptId() === scriptId, "SCRIPT_ID_MISMATCH");
    requireValue(props.getProperty("CUT_HUB_ENVIRONMENT") === "production", "ENVIRONMENT_MISMATCH");
    requireValue(props.getProperty("CUT_HUB_PRODUCTION_SPREADSHEET_ID") === spreadsheetId,
      "SPREADSHEET_PIN_MISMATCH");
    var spreadsheet = SpreadsheetApp.getActive();
    requireValue(spreadsheet && spreadsheet.getId() === spreadsheetId, "ACTIVE_SPREADSHEET_MISMATCH");
    function email(user) {
      return String(user && user.getEmail ? user.getEmail() : "").trim().toLowerCase();
    }
    var active = email(Session.getActiveUser());
    var effective = email(Session.getEffectiveUser());
    var owner = email(DriveApp.getFileById(spreadsheetId).getOwner());
    requireValue(active && effective && owner && active === effective && active === owner,
      "PRODUCTION_OWNER_REQUIRED");

    stage = "baseline";
    code = "BASELINE_CHECK_FAILED";
    var baselineFields = [
      ["BOOKING_AVAILABILITY_ENGINE", "engine", "SHADOW"],
      ["BOOKING_PHASE2_PLANNED_ENABLED", "plannedEnabled", "true"],
      ["BOOKING_ATTENDANCE_LIVE_ENABLED", "attendanceLiveEnabled", "false"],
      ["BOOKING_CUSTOMER_LIVE_REFRESH_ENABLED", "customerLiveRefreshEnabled", "false"],
      ["BOOKING_INTERNAL_LIVE_REFRESH_ENABLED", "internalLiveRefreshEnabled", "false"],
      ["BOOKING_MANAGER_OVERRIDE_ENABLED", "managerOverrideEnabled", "false"],
      ["BOOKING_CONFLICT_RESOLUTION_ENABLED", "conflictResolutionEnabled", "false"],
      ["BOOKING_NO_CHECK_IN_DETECTOR_ENABLED", "noCheckInDetectorEnabled", "false"]
    ];
    function readBaseline(failureCode) {
      var values = {};
      baselineFields.forEach(function (field) {
        values[field[1]] = props.getProperty(field[0]);
      });
      requireValue(baselineFields.every(function (field) {
        return values[field[1]] === field[2];
      }), failureCode);
      return values;
    }
    var baseline = readBaseline("BASELINE_MISMATCH");
    var canary = Object.freeze({
      branchId: "CUT_HUB_MAIN", date: "2026-09-30",
      serviceId: "SRV-bb949f91-2808-487f-aaa6-0d3e47790e37", staffId: "1784232573966",
      expectedStaffName: "osama", durationMinutes: 30,
      preparationMinutes: 0, cleanupMinutes: 0, audience: "public"
    });

    stage = "service";
    code = "SERVICE_READ_FAILED";
    var services = publicBookingServices().filter(function (service) {
      return service.serviceId === canary.serviceId;
    });
    requireValue(services.length === 1, "SERVICE_NOT_UNIQUE_OR_NOT_PUBLIC");
    var service = services[0];
    requireValue(service.active === true, "SERVICE_NOT_ACTIVE");
    requireValue(service.durationMinutes === canary.durationMinutes && service.preparationMinutes === canary.preparationMinutes &&
      service.cleanupMinutes === canary.cleanupMinutes, "SERVICE_TIMING_MISMATCH");

    stage = "staff";
    code = "STAFF_READ_FAILED";
    // Keep the complete public barber list for LEGACY's name-disambiguation behavior.
    var barbers = publicBookingBarbers();
    var matches = barbers.filter(function (barber) { return barber.staffId === canary.staffId; });
    requireValue(matches.length === 1, "STAFF_NOT_UNIQUE_OR_NOT_PUBLIC");
    var barber = matches[0];
    requireValue(barber.active === true && barber.isBarber === true, "STAFF_NOT_ACTIVE_PUBLIC_BARBER");
    requireValue(barber.branchId === canary.branchId, "STAFF_BRANCH_MISMATCH");
    requireValue(barber.name === canary.expectedStaffName, "STAFF_NAME_MISMATCH");

    stage = "snapshot";
    code = "SNAPSHOT_READ_FAILED";
    var snapshot = bookingAvailabilityPhase5RequestSnapshot();
    var snapshotStaff = snapshot.staff.filter(function (staff) { return staff.staffId === canary.staffId; });
    requireValue(snapshotStaff.length === 1 && snapshotStaff[0].active === true &&
      snapshotStaff[0].branchId === canary.branchId, "SNAPSHOT_STAFF_MISMATCH");
    var bookings = snapshot.bookings;
    var serviceSetHash = bookingServiceSetHash(services, [canary.serviceId]);

    stage = "comparison";
    code = "COMPARISON_FAILED";
    var evaluated = BookingAvailabilityPhase5.executeAuthoritativeEngine({
      mode: "SHADOW",
      legacy: function () {
        stage = "legacy";
        code = "LEGACY_CALLBACK_FAILED";
        var result = availableSlotsForBarberLegacy(barber, canary.date, canary.durationMinutes, bookings, barbers);
        stage = "comparison";
        code = "COMPARISON_FAILED";
        return result;
      },
      phase5: function () {
        try {
          var result = bookingAvailabilityPhase5Evaluate({
            employeeId: canary.staffId, branchId: canary.branchId, date: canary.date,
            audience: canary.audience, requestData: {}, durationMinutes: canary.durationMinutes,
            preparationMinutes: canary.preparationMinutes, cleanupMinutes: canary.cleanupMinutes, serviceSetHash: serviceSetHash,
            snapshot: snapshot, bookings: bookings, finalValidation: true
          });
          var safeResult = BookingAvailabilityPhase5.publicDto(result);
          // Match the public callback projection in availableSlotsForBarber.
          return {
            slots: (result.slots || []).map(function (slot) { return slot.start; }),
            availability: String(result.availability || "").toLowerCase(),
            shiftStart: "", shiftEnd: "", reasonCode: safeResult.reasonCode,
            availabilityToken: safeResult.availabilityToken, generatedAt: safeResult.generatedAt,
            ...(safeResult.scheduleSource ? { scheduleSource: safeResult.scheduleSource } : {}),
            ...(safeResult.operationalRestriction ? { operationalRestriction: safeResult.operationalRestriction } : {}),
            ...(safeResult.scheduleSourceIds ? { scheduleSourceIds: safeResult.scheduleSourceIds } : {}),
            ...(safeResult.versions ? { versions: safeResult.versions } : {}),
            ...(safeResult.managerOverrideAllowed ? { managerOverrideAllowed: true } : {})
          };
        } catch (ignored) {
          // The engine catches this safe replacement; never expose raw backend errors.
          var safeError = new Error("Phase 5 diagnostic callback failed.");
          safeError.code = "PHASE5_DIAGNOSTIC_CALLBACK_FAILED";
          throw safeError;
        }
      }
    });
    requireValue(evaluated && evaluated.authority === "LEGACY", "AUTHORITY_MISMATCH");
    var comparison = evaluated.comparison;
    requireValue(comparison && typeof comparison.equal === "boolean" &&
      typeof comparison.legacyHash === "string" && typeof comparison.phase5Hash === "string",
      "COMPARISON_SHAPE_INVALID");
    var output = {
      status: comparison.phase5Error ? "error" : "success",
      diagnostic: comparison.phase5Error ? "PRODUCTION_SHADOW_COMPARISON_READONLY_FAILED"
        : "PRODUCTION_SHADOW_COMPARISON_READONLY",
      identity: { scriptId: scriptId, spreadsheetId: spreadsheetId, environment: "production" },
      canary: { branchId: canary.branchId, date: canary.date, serviceId: canary.serviceId, staffId: canary.staffId },
      baseline: baseline, authority: evaluated.authority,
      comparison: {
        equal: comparison.equal, legacyHash: comparison.legacyHash, phase5Hash: comparison.phase5Hash,
        phase5Error: comparison.phase5Error ? { code: "PHASE5_DIAGNOSTIC_CALLBACK_FAILED" } : null
      },
      writes: { spreadsheet: 0, scriptProperties: 0, cache: 0, triggers: 0 }
    };
    if (comparison.phase5Error) {
      output.stage = "phase5";
      output.code = "PHASE5_DIAGNOSTIC_CALLBACK_FAILED";
    }
    stage = "baseline_recheck";
    code = "BASELINE_CHANGED_DURING_DIAGNOSTIC";
    readBaseline("BASELINE_CHANGED_DURING_DIAGNOSTIC");
    return output;
  } catch (ignored) {
    return { status: "error", diagnostic: "PRODUCTION_SHADOW_COMPARISON_READONLY_FAILED",
      stage: stage, code: code };
  }
}
