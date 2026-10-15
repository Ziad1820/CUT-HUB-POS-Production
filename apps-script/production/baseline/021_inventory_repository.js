function inventoryNumber(value) {
  const number = Number(String(value === null || value === undefined ? "" : value).replace(/,/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function inventoryQuantity(value) {
  return Math.round((inventoryNumber(value) + Number.EPSILON) * 1000000) / 1000000;
}

function inventoryBoolean(value, fallback) {
  if (value === true || value === false) return value;
  const text = inventoryText(value).toUpperCase();
  if (!text) return fallback;
  return ["TRUE", "YES", "Y", "1"].indexOf(text) !== -1;
}

function inventoryRows(sheet, width) {
  const lastRow = sheet.getLastRow();
  return lastRow < 2 ? [] : sheet.getRange(2, 1, lastRow - 1, width).getValues();
}

function readInventoryItems() {
  return inventoryRows(inventorySheet(INVENTORY_SHEETS.items), 15)
    .map((row, index) => ({
      rowNumber: index + 2,
      itemId: inventoryText(row[0]),
      name: inventoryText(row[1]),
      category: inventoryText(row[2]),
      itemType: inventoryText(row[3]) || "consumable",
      usageUnit: inventoryText(row[4]) || "piece",
      packageSize: inventoryNumber(row[5]),
      purchasePrice: inventoryNumber(row[6]),
      salePrice: inventoryNumber(row[7]),
      serviceEnabled: inventoryBoolean(row[8], true),
      saleEnabled: inventoryBoolean(row[9], false),
      minimumStock: inventoryNumber(row[10]),
      barcode: inventoryText(row[11]),
      active: inventoryBoolean(row[12], true),
      createdAt: inventoryText(row[13]),
      updatedAt: inventoryText(row[14])
    }))
    .filter((item) => item.itemId && item.name);
}

function readInventoryBatches() {
  return inventoryRows(inventorySheet(INVENTORY_SHEETS.batches), 15)
    .map((row, index) => ({
      rowNumber: index + 2,
      batchId: inventoryText(row[0]),
      itemId: inventoryText(row[1]),
      purchaseDate: getDateKey(row[2], TIME_ZONE) || inventoryText(row[2]),
      supplier: inventoryText(row[3]),
      purchasedPacks: inventoryNumber(row[4]),
      packageSize: inventoryNumber(row[5]),
      usageUnit: inventoryText(row[6]),
      sealedPacks: inventoryNumber(row[7]),
      openedPacks: inventoryNumber(row[8]),
      openedQuantity: inventoryNumber(row[9]),
      purchasePrice: inventoryNumber(row[10]),
      expiryDate: getDateKey(row[11], TIME_ZONE) || inventoryText(row[11]),
      status: inventoryText(row[12]) || "active",
      createdAt: inventoryText(row[13]),
      updatedAt: inventoryText(row[14])
    }))
    .filter((batch) => batch.batchId && batch.itemId);
}

function ensureInventoryLogBarberColumns() {
  const sheet = inventorySheet(INVENTORY_SHEETS.log);
  const barberIdColumn = ensureSheetHeaderColumn(sheet, BARBER_ID_HEADER_ALIASES, "barberId", 16);
  const barberNameColumn = ensureSheetHeaderColumn(sheet, BARBER_NAME_HEADER_ALIASES, "barberName", 17);
  const balanceBeforeColumn = ensureSheetHeaderColumn(
    sheet,
    BALANCE_BEFORE_HEADER_ALIASES,
    "balanceBefore",
    18
  );
  return {
    sheet,
    barberIdColumn,
    barberNameColumn,
    balanceBeforeColumn,
    width: Math.max(15, barberIdColumn, barberNameColumn, balanceBeforeColumn)
  };
}

function readInventoryLog(limit) {
  const logColumns = ensureInventoryLogBarberColumns();
  const rows = inventoryRows(logColumns.sheet, logColumns.width)
    .map((row) => ({
      transactionId: inventoryText(row[0]),
      dateTime: inventoryText(row[1]),
      itemId: inventoryText(row[2]),
      itemName: inventoryText(row[3]),
      batchId: inventoryText(row[4]),
      movementType: inventoryText(row[5]),
      stockBucket: inventoryText(row[6]),
      quantity: inventoryNumber(row[7]),
      unit: inventoryText(row[8]),
      invoiceId: inventoryText(row[9]),
      serviceId: inventoryText(row[10]),
      username: inventoryText(row[11]),
      balanceAfter: inventoryNumber(row[12]),
      note: inventoryText(row[13]),
      requestId: inventoryText(row[14]),
      barberId: inventoryText(row[logColumns.barberIdColumn - 1]),
      barberName: inventoryText(row[logColumns.barberNameColumn - 1]),
      balanceBefore: inventoryText(row[logColumns.balanceBeforeColumn - 1]) === ""
        ? null
        : inventoryNumber(row[logColumns.balanceBeforeColumn - 1])
    }))
    .filter((entry) => entry.transactionId)
    .reverse();

  return rows.slice(0, Math.max(1, Number(limit) || 200));
}

