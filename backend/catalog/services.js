function getServices() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("SERVICES");
  if (!sheet) {
    return jsonOutput({ status: "error", message: "Sheet SERVICES not found" });
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return jsonOutput({ status: "success", services: [] });
  }

  const width = Math.max(6, sheet.getLastColumn());
  const headers = sheet.getRange(1, 1, 1, width).getValues()[0].map((value) =>
    String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_"));
  const preparationIndex = headers.indexOf("PREPARATION_MINUTES");
  const cleanupIndex = headers.indexOf("CLEANUP_MINUTES");
  const rows = sheet.getRange(2, 1, lastRow - 1, width).getValues();

  const services = rows
    .map((row, index) => ({
      name: String(row[0] || "").trim(),
      price: parseSheetAmount(row[1]),
      active: parseServiceActiveFlag(row[2]),
      order: Number(row[3]) || index + 1,
      serviceId: String(row[4] || "").trim(),
      durationMinutes: Math.max(15, Number(row[5]) || 30),
      preparationMinutes: preparationIndex >= 0 ? Math.max(0, Number(row[preparationIndex]) || 0) : 0,
      cleanupMinutes: cleanupIndex >= 0 ? Math.max(0, Number(row[cleanupIndex]) || 0) : 0
    }))
    .filter(service => service.name && service.active)
    .sort((a, b) => a.order - b.order)
    .map(service => ({
      name: service.name,
      price: service.price,
      serviceId: service.serviceId,
      durationMinutes: service.durationMinutes,
      preparationMinutes: service.preparationMinutes,
      cleanupMinutes: service.cleanupMinutes
    }));

  return jsonOutput({ status: "success", services });
}

function saveServices(data) {
  const permissionError = requirePermission(data, "edit_prices", "You do not have permission to edit prices.");
  if (permissionError) return permissionError;
  return withBookingMutationLock({
    bookingRequestId: String(data.clientRequestId || "SERVICES").trim()
  }, () => {

  const sheet = SpreadsheetApp.getActive().getSheetByName("SERVICES");
  if (!sheet) {
    return jsonOutput({ status: "error", message: "Sheet SERVICES not found" });
  }

  const services = Array.isArray(data.services) ? data.services : [];
  const lastRow = sheet.getLastRow();
  const width = Math.max(6, sheet.getLastColumn());
  const headers = sheet.getRange(1, 1, 1, width).getValues()[0].map((value) =>
    String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_"));
  const preparationIndex = headers.indexOf("PREPARATION_MINUTES");
  const cleanupIndex = headers.indexOf("CLEANUP_MINUTES");
  const existingRows = lastRow > 1
    ? sheet.getRange(2, 1, lastRow - 1, width).getValues()
    : [];
  const existingIds = {};

  existingRows.forEach((row) => {
    const name = String(row[0] || "").trim().toLowerCase();
    const serviceId = String(row[4] || "").trim();
    if (name && serviceId) existingIds[name] = {
      serviceId,
      durationMinutes: Math.max(15, Number(row[5]) || 30),
      preparationMinutes: preparationIndex >= 0 ? Math.max(0, Number(row[preparationIndex]) || 0) : 0,
      cleanupMinutes: cleanupIndex >= 0 ? Math.max(0, Number(row[cleanupIndex]) || 0) : 0
    };
  });

  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, width).clearContent();
  }

  const rows = services
    .filter(service => String(service.name || "").trim())
    .map((service, index) => {
      const name = String(service.name || "").trim();
      const existing = existingIds[name.toLowerCase()] || {};
      const row = new Array(width).fill("");
      row[0] = name;
      row[1] = parseSheetAmount(service.price);
      row[2] = "TRUE";
      row[3] = index + 1;
      row[4] = String(service.serviceId || existing.serviceId || `SRV-${Utilities.getUuid()}`).trim();
      row[5] = Math.max(15, Number(service.durationMinutes) || existing.durationMinutes || 30);
      if (preparationIndex >= 0) {
        row[preparationIndex] = Math.max(0,
          service.preparationMinutes === undefined
            ? Number(existing.preparationMinutes) || 0 : Number(service.preparationMinutes) || 0);
      }
      if (cleanupIndex >= 0) {
        row[cleanupIndex] = Math.max(0,
          service.cleanupMinutes === undefined
            ? Number(existing.cleanupMinutes) || 0 : Number(service.cleanupMinutes) || 0);
      }
      return row;
    });

  const responseServices = rows.map(row => ({
      name: row[0],
      price: row[1],
      serviceId: row[4],
      durationMinutes: row[5],
      preparationMinutes: preparationIndex >= 0 ? Number(row[preparationIndex]) || 0 : 0,
      cleanupMinutes: cleanupIndex >= 0 ? Number(row[cleanupIndex]) || 0 : 0
    }));
  const writeServices = () => {
    if (rows.length > 0) sheet.getRange(2, 1, rows.length, width).setValues(rows);
  };
  if (typeof bookingAvailabilityPhase5RunTransaction === "function" &&
      bookingAvailabilityEngineMode() === "PHASE5") {
    const requestId = String(data.clientRequestId || "SERVICES-SAVE").trim();
    const actor = bookingAvailabilityPhase5Actor(data, true);
    const result = bookingAvailabilityPhase5RunTransaction({
      data, requestId, action: "SERVICE_CONFIGURATION_SAVE",
      entityType: "SERVICES", entityId: "SERVICES", actor,
      beforeState: { rows: existingRows },
      business: () => { writeServices(); SpreadsheetApp.flush(); return { services: responseServices }; },
      version: () => bookingAvailabilityPhase5IncrementGeneration(
        "service", "GLOBAL", "GLOBAL", actor, requestId),
      audit: () => bookingAvailabilityPhase5AppendAudit({
        action: "SERVICE_CONFIGURATION_SAVED", entityType: "SERVICES",
        entityId: "SERVICES", actorId: actor ? actor.actorId : "system",
        actorRole: actor ? actor.role : "SYSTEM", reasonCode: "SERVICE_CONFIGURATION",
        beforeState: { count: existingRows.length }, afterState: { count: rows.length },
        requestId
      }),
      compensateBusiness: () => {
        if (existingRows.length) {
          sheet.getRange(2, 1, existingRows.length, width).setValues(existingRows);
        }
        if (rows.length > existingRows.length) {
          const surplus = rows.slice(existingRows.length).map(row => {
            const copy = row.slice(); copy[2] = "FALSE"; return copy;
          });
          sheet.getRange(2 + existingRows.length, 1, surplus.length, width).setValues(surplus);
        }
        SpreadsheetApp.flush();
      },
      response: value => value
    });
    logActivity(data, "update", "services", "SERVICES",
      `Saved services list. Total services: ${rows.length}`);
    return jsonOutput({ status: "success", services: result.services });
  }
  writeServices();
  logActivity(data, "update", "services", "SERVICES",
    `Saved services list. Total services: ${rows.length}`);
  if (typeof bookingAvailabilityPhase5AfterGlobalServiceMutationUnderLock === "function") {
    bookingAvailabilityPhase5AfterGlobalServiceMutationUnderLock(data);
  }
  return jsonOutput({ status: "success", services: responseServices });
  });
}

