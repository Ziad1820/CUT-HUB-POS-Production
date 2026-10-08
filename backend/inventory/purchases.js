function appendInventoryLog(entry) {
  const logColumns = ensureInventoryLogBarberColumns();
  const row = [
    entry.transactionId || `TXN-${Utilities.getUuid()}`,
    entry.dateTime || getCairoDateTime(),
    entry.itemId || "",
    entry.itemName || "",
    entry.batchId || "",
    entry.movementType || "",
    entry.stockBucket || "",
    inventoryNumber(entry.quantity),
    entry.unit || "",
    entry.invoiceId || "",
    entry.serviceId || "",
    entry.username || "",
    inventoryNumber(entry.balanceAfter),
    entry.note || "",
    entry.requestId || ""
  ];
  while (row.length < logColumns.width) row.push("");
  row[logColumns.barberIdColumn - 1] = entry.barberId || "";
  row[logColumns.barberNameColumn - 1] = entry.barberName || "";
  row[logColumns.balanceBeforeColumn - 1] = inventoryNumber(entry.balanceBefore);
  logColumns.sheet.appendRow(row);
}

function addInventoryPurchase(data) {
  const lock = LockService.getScriptLock();
  try {
    const permissionError = requirePermission(data, "view_inventory", "You do not have permission to add inventory purchases.");
    if (permissionError) return permissionError;
    lock.waitLock(30000);
    const input = data.purchase || data;
    const item = readInventoryItems().find((entry) => entry.itemId === inventoryText(input.itemId) && entry.active);
    if (!item) return jsonOutput({ status: "error", message: "Inventory item not found." });
    const packs = inventoryNumber(input.purchasedPacks);
    const packageSize = inventoryNumber(input.packageSize) || item.packageSize;
    const purchasePrice = inventoryNumber(input.purchasePrice);
    if (packs <= 0 || packageSize <= 0) return jsonOutput({ status: "error", message: "Purchase packs and package size must be greater than zero." });

    const previousStock = buildInventoryStock([item], readInventoryBatches())[item.itemId] || { totalQuantity: 0 };
    const batchId = `BAT-${Utilities.getUuid()}`;
    const now = getCairoDateTime();
    inventorySheet(INVENTORY_SHEETS.batches).appendRow([
      batchId,
      item.itemId,
      getDateKey(input.purchaseDate || getCairoDateKey(), TIME_ZONE) || getCairoDateKey(),
      inventoryText(input.supplier),
      packs,
      packageSize,
      item.usageUnit,
      packs,
      0,
      0,
      purchasePrice,
      getDateKey(input.expiryDate || "", TIME_ZONE) || "",
      "active",
      now,
      now
    ]);

    appendInventoryLog({
      itemId: item.itemId,
      itemName: item.name,
      batchId,
      movementType: "purchase",
      stockBucket: "sealed",
      quantity: packs,
      unit: "pack",
      username: getAuthenticatedUser(data)?.username || inventoryText(data.username),
      balanceAfter: previousStock.totalQuantity + (packs * packageSize),
      note: inventoryText(input.note),
      requestId: inventoryText(data.requestId || data.clientRequestId)
    });

    logActivity(data, "create", "inventory_purchase", batchId, `Purchased ${packs} pack(s) of ${item.name}`);
    return jsonOutput({ status: "success", batchId });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

function updateInventoryPurchase(data) {
  const lock = LockService.getScriptLock();
  try {
    const permissionError = requirePermission(data, "view_inventory", "You do not have permission to edit inventory purchases.");
    if (permissionError) return permissionError;
    lock.waitLock(30000);

    const input = data.purchase || data;
    const batch = readInventoryBatches().find((entry) => entry.batchId === inventoryText(input.batchId));
    if (!batch) return jsonOutput({ status: "error", message: "Inventory purchase not found." });
    const item = readInventoryItems().find((entry) => entry.itemId === batch.itemId);
    if (!item) return jsonOutput({ status: "error", message: "Inventory item not found." });

    const purchasedPacks = Math.floor(inventoryNumber(input.purchasedPacks));
    const committedPacks = Math.max(0, batch.purchasedPacks - batch.sealedPacks - batch.openedPacks);
    const minimumPacks = committedPacks + batch.openedPacks;
    if (purchasedPacks <= 0) return jsonOutput({ status: "error", message: "عدد العبوات يجب أن يكون أكبر من صفر." });
    if (purchasedPacks < minimumPacks) {
      return jsonOutput({
        status: "error",
        message: `لا يمكن تقليل عملية الشراء عن ${minimumPacks} عبوة لأن جزءًا منها تم استهلاكه بالفعل.`
      });
    }

    const newSealedPacks = purchasedPacks - committedPacks - batch.openedPacks;
    const now = getCairoDateTime();
    const updatedRow = [
      batch.batchId,
      batch.itemId,
      getDateKey(input.purchaseDate || batch.purchaseDate, TIME_ZONE) || batch.purchaseDate,
      inventoryText(input.supplier),
      purchasedPacks,
      batch.packageSize,
      batch.usageUnit,
      newSealedPacks,
      batch.openedPacks,
      batch.openedQuantity,
      inventoryNumber(input.purchasePrice),
      getDateKey(input.expiryDate || "", TIME_ZONE) || "",
      newSealedPacks <= 0 && batch.openedQuantity <= 0 ? "depleted" : "active",
      batch.createdAt,
      now
    ];
    inventorySheet(INVENTORY_SHEETS.batches).getRange(batch.rowNumber, 1, 1, updatedRow.length).setValues([updatedRow]);

    const currentStock = buildInventoryStock([item], readInventoryBatches())[item.itemId] || { totalQuantity: 0 };
    appendInventoryLog({
      itemId: item.itemId,
      itemName: item.name,
      batchId: batch.batchId,
      movementType: "purchase_edit",
      stockBucket: "sealed",
      quantity: newSealedPacks - batch.sealedPacks,
      unit: "pack",
      username: getAuthenticatedUser(data)?.username || inventoryText(data.username),
      balanceAfter: currentStock.totalQuantity,
      note: inventoryText(input.note) || `Purchase corrected from ${batch.purchasedPacks} to ${purchasedPacks} pack(s).`,
      requestId: inventoryText(data.requestId || data.clientRequestId)
    });
    logActivity(data, "update", "inventory_purchase", batch.batchId, `Updated purchase for ${item.name}: ${batch.purchasedPacks} -> ${purchasedPacks} pack(s)`);
    return jsonOutput({ status: "success", batchId: batch.batchId });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

