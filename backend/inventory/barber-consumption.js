function readActiveInventoryBarbers() {
  const sheet = getStaffSheet();
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 11).getValues()
    .map((row, index) => ({
      barberId: inventoryText(row[1] || row[4] || `STAFF-${index + 1}`),
      barberName: inventoryText(row[0]),
      active: inventoryBoolean(row[7], true),
      isBarber: inventoryBoolean(row[10], true)
    }))
    .filter((barber) => barber.barberId && barber.barberName && barber.active && barber.isBarber);
}

function getBarberConsumptionReport(data) {
  try {
    const permissionError = requirePermission(data, "view_inventory", "You do not have permission to view barber consumption.");
    if (permissionError) return permissionError;

    const fromDate = getDateKey(data.fromDate || "", TIME_ZONE);
    const toDate = getDateKey(data.toDate || "", TIME_ZONE);
    const selectedBarberId = inventoryText(data.barberId);
    const batchesById = {};
    readInventoryBatches().forEach((batch) => { batchesById[batch.batchId] = batch; });
    const itemsById = {};
    readInventoryItems().forEach((item) => { itemsById[item.itemId] = item; });
    const barberMap = {};
    readActiveInventoryBarbers().forEach((barber) => { barberMap[barber.barberId] = barber; });

    const groups = {};
    const invoices = {};
    let totalCost = 0;
    let totalMovements = 0;

    readInventoryLog(100000).forEach((entry) => {
      if (entry.movementType !== "service_consumption" || !entry.barberId) return;
      const dateKey = getDateKey(entry.dateTime, TIME_ZONE);
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

