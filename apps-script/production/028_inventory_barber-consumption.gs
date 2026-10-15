function readActiveInventoryBarbers() {
  const sheet = getStaffSheet();
  if (sheet.getLastRow() < 2) return [];
  const width = sheet.getLastColumn();
  const headers = staffResolveHeaders_(sheet.getRange(1, 1, 1, width).getValues()[0]);
  ["ID", "NAME", "ACTIVE", "IS_BARBER"].forEach(header => {
    if (headers.filter(value => value === header).length !== 1) throw new Error(
      "Invalid STAFF header: " + header);
  });
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, width).getValues();
  const idCounts = new Map();
  rows.forEach(row => {
    const id = inventoryText(row[headers.indexOf("ID")]);
    if (id) idCounts.set(id, (idCounts.get(id) || 0) + 1);
  });
  return rows.map(row => ({
    barberId: inventoryText(row[headers.indexOf("ID")]),
    barberName: inventoryText(row[headers.indexOf("NAME")]),
    active: inventoryBoolean(row[headers.indexOf("ACTIVE")], true),
    isBarber: inventoryBoolean(row[headers.indexOf("IS_BARBER")], true)
  })).filter(barber => barber.barberId && idCounts.get(barber.barberId) === 1 &&
    barber.barberName && barber.active && barber.isBarber);
}

function getBarberConsumptionReport(data) {
  try {
    const permissionError = requirePermission(data, "view_inventory", "You do not have permission to view barber consumption.");
    if (permissionError) return permissionError;

    const fromDate = getDateKey(data.fromDate || "", TIME_ZONE);
    const toDate = getDateKey(data.toDate || "", TIME_ZONE);
    const selectedBarberId = inventoryText(data.barberId);
    let dateBounds = null;
    if ((fromDate || toDate) && typeof Utilities !== "undefined" && Utilities.parseDate) {
      try {
        function midnight(key, nextDay) {
          if (nextDay) {
            const parts = key.split("-").map(Number);
            key = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + 1)).toISOString().slice(0, 10);
          }
          const date = Utilities.parseDate(key, TIME_ZONE, "yyyy-MM-dd");
          if (getDateKey(date, TIME_ZONE) !== key) throw new Error("DATE_BOUNDARY_NORMALIZED");
          return date.getTime();
        }
        dateBounds = { from: fromDate ? midnight(fromDate) : -Infinity, to: toDate ? midnight(toDate, true) : Infinity };
        if (isNaN(dateBounds.from) || isNaN(dateBounds.to)) dateBounds = null;
      } catch (_) { dateBounds = null; }
    }
    const dateKeys = new Map();
    const batchesById = {};
    // Cost lookup needs only size and price, not date conversion or display metadata.
    inventoryRows(inventorySheet(INVENTORY_SHEETS.batches), 15).forEach((row) => {
      const batchId = inventoryText(row[0]);
      if (batchId && inventoryText(row[1])) batchesById[batchId] = {
        packageSize: inventoryNumber(row[5]), purchasePrice: inventoryNumber(row[10])
      };
    });
    const itemsById = {};
    inventoryRows(inventorySheet(INVENTORY_SHEETS.items), 15).forEach((row) => {
      const itemId = inventoryText(row[0]);
      if (itemId && inventoryText(row[1])) itemsById[itemId] = {
        packageSize: inventoryNumber(row[5]), purchasePrice: inventoryNumber(row[6])
      };
    });
    const barberMap = {};
    readActiveInventoryBarbers().forEach((barber) => { barberMap[barber.barberId] = barber; });

    const groups = {};
    const invoices = {};
    let totalCost = 0;
    let totalMovements = 0;

    readInventoryLog(100000).forEach((entry) => {
      if (entry.movementType !== "service_consumption" || !entry.barberId) return;
      const text = normalizeDigits(String(entry.dateTime || "").trim());
      // Canonical/textual calendar dates retain the original parser. Other parseable
      // timestamps use the same Date conversion as getDateKey, before costly formatting.
      if (dateBounds && !/\d{4}[\/-]\d{1,2}[\/-]\d{1,2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{4}/.test(text)) {
        const time = new Date(text).getTime();
        if (!isNaN(time) && (time < dateBounds.from || time >= dateBounds.to)) return;
      }
      if (!dateKeys.has(text)) dateKeys.set(text, getDateKey(entry.dateTime, TIME_ZONE));
      const dateKey = dateKeys.get(text);
      if (fromDate && dateKey < fromDate) return;
      if (toDate && dateKey > toDate) return;
      if (selectedBarberId && entry.barberId !== selectedBarberId) return;

      if (!barberMap[entry.barberId]) {
        barberMap[entry.barberId] = { barberId: entry.barberId, barberName: entry.barberName || entry.barberId };
      }
      const quantity = Math.abs(inventoryNumber(entry.quantity));
      const batch = batchesById[entry.batchId];
      const item = itemsById[entry.itemId];
      const packageSize = inventoryNumber(batch?.packageSize || item?.packageSize);
      const purchasePrice = inventoryNumber(batch?.purchasePrice || item?.purchasePrice);
      const unitCost = packageSize > 0 ? purchasePrice / packageSize : 0;
      const cost = quantity * unitCost;
      const key = [entry.barberId, entry.itemId, entry.unit].join("|");
      if (!groups[key]) {
        groups[key] = {
          barberId: entry.barberId,
          barberName: entry.barberName || barberMap[entry.barberId].barberName,
          itemId: entry.itemId,
          itemName: entry.itemName,
          unit: entry.unit,
          quantity: 0,
          cost: 0,
          invoiceIds: {}
        };
      }
      groups[key].quantity += quantity;
      groups[key].cost += cost;
      if (entry.invoiceId) {
        groups[key].invoiceIds[entry.invoiceId] = true;
        invoices[entry.invoiceId] = true;
      }
      totalCost += cost;
      totalMovements += 1;
    });

    const rows = Object.keys(groups).map((key) => {
      const group = groups[key];
      return {
        barberId: group.barberId,
        barberName: group.barberName,
        itemId: group.itemId,
        itemName: group.itemName,
        unit: group.unit,
        quantity: group.quantity,
        cost: group.cost,
        invoiceCount: Object.keys(group.invoiceIds).length
      };
    }).sort((a, b) => a.barberName.localeCompare(b.barberName) || b.cost - a.cost || a.itemName.localeCompare(b.itemName));

    return jsonOutput({
      status: "success",
      barbers: Object.keys(barberMap).map((key) => barberMap[key]).sort((a, b) => a.barberName.localeCompare(b.barberName)),
      rows,
      summary: {
        totalCost,
        totalMovements,
        invoiceCount: Object.keys(invoices).length
      }
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

