function rollbackInventoryCheckout(transaction) {
  if (!transaction) return;
  const batchSheet = inventorySheet(INVENTORY_SHEETS.batches);
  const logSheet = inventorySheet(INVENTORY_SHEETS.log);
  const invoiceItemsSheet = inventorySheet(INVENTORY_SHEETS.invoiceItems);

  (transaction.batchRows || []).forEach((snapshot) => {
    batchSheet.getRange(snapshot.rowNumber, 1, 1, snapshot.values.length).setValues([snapshot.values]);
  });

  function deleteMatchingAppendedRows(sheet, previousLastRow, width, matches) {
    const addedRows = sheet.getLastRow() - previousLastRow;
    if (addedRows <= 0) return;
    if (typeof sheet.getRange !== "function") {
      sheet.deleteRows(previousLastRow + 1, addedRows);
      return;
    }
    let rows;
    try {
      const range = sheet.getRange(previousLastRow + 1, 1, addedRows, width);
      if (!range || typeof range.getValues !== "function") throw new Error("Range values are unavailable");
      rows = range.getValues();
    } catch (error) {
      sheet.deleteRows(previousLastRow + 1, addedRows);
      return;
    }
    for (let index = rows.length - 1; index >= 0; index -= 1) {
      if (!matches(rows[index])) continue;
      const rowNumber = previousLastRow + 1 + index;
      if (typeof sheet.deleteRow === "function") sheet.deleteRow(rowNumber);
      else sheet.deleteRows(rowNumber, 1);
    }
  }

  deleteMatchingAppendedRows(
    invoiceItemsSheet,
    transaction.invoiceItemsLastRow,
    14,
    row => inventoryText(row[1]) === transaction.invoiceId
  );
  deleteMatchingAppendedRows(
    logSheet,
    transaction.logLastRow,
    18,
    row => inventoryText(row[9]) === transaction.invoiceId
  );
  const newBatchIds = transaction.newBatchIds || [];
  deleteMatchingAppendedRows(
    batchSheet,
    transaction.batchLastRow,
    15,
    row => newBatchIds.indexOf(inventoryText(row[0])) !== -1
  );
}

function applyInventoryCheckout(plan, data, invoiceId) {
  if (!plan.enabled) return null;
  const batchSheet = inventorySheet(INVENTORY_SHEETS.batches);
  const logSheet = ensureInventoryLogBarberColumns().sheet;
  const invoiceItemsSheet = inventorySheet(INVENTORY_SHEETS.invoiceItems);
  const now = getCairoDateTime();
  const transaction = {
    batchLastRow: batchSheet.getLastRow(),
    logLastRow: logSheet.getLastRow(),
    invoiceItemsLastRow: invoiceItemsSheet.getLastRow(),
    invoiceId,
    newBatchIds: (plan.newBatches || []).map(batch => batch.batchId),
    batchRows: (plan.batchUpdates || []).map((batch) => ({
      rowNumber: batch.rowNumber,
      values: batchSheet.getRange(batch.rowNumber, 1, 1, 15).getValues()[0]
    }))
  };

  try {
    (plan.newBatches || []).forEach((batch) => {
      batchSheet.appendRow([
        batch.batchId,
        batch.itemId,
        batch.purchaseDate,
        batch.supplier,
        batch.purchasedPacks,
        batch.packageSize,
        batch.usageUnit,
        batch.sealedPacks,
        batch.openedPacks,
        batch.openedQuantity,
        batch.purchasePrice,
        batch.expiryDate,
        "negative",
        batch.createdAt || now,
        now
      ]);
    });

    plan.batchUpdates.forEach((batch) => {
      batchSheet.getRange(batch.rowNumber, 8, 1, 3).setValues([[batch.sealedPacks, batch.openedPacks, batch.openedQuantity]]);
      const isNegative = batch.sealedPacks < 0 || batch.openedQuantity < 0;
      batchSheet.getRange(batch.rowNumber, 13).setValue(
        isNegative ? "negative" : (batch.sealedPacks <= 0 && batch.openedQuantity <= 0 ? "depleted" : "active")
      );
      batchSheet.getRange(batch.rowNumber, 15).setValue(now);
    });

    const actor = getAuthenticatedUser(data);
    const requestId = inventoryText(data.idempotencyKey || data.clientRequestId);
    const invoiceBarberId = inventoryText(data.barberId || data.barberCode || data.barber);
    const invoiceBarberName = inventoryText(data.barberName || data.barber);
    plan.movements.forEach((movement) => {
      const isBarberConsumption = movement.movementType === "service_consumption";
      const serviceLabel = inventoryText(movement.serviceName);
      appendInventoryLog({
        itemId: movement.item.itemId,
        itemName: movement.item.name,
        batchId: movement.batch.batchId,
        movementType: movement.movementType,
        stockBucket: movement.stockBucket,
        quantity: movement.quantity,
        unit: movement.unit,
        invoiceId,
        serviceId: inventoryText(movement.serviceId),
        username: actor ? actor.username : "",
        balanceBefore: movement.balanceBefore,
        balanceAfter: movement.balanceAfter,
        note: serviceLabel
          ? `Automatic inventory movement for ${invoiceId} | Service: ${serviceLabel}`
          : `Automatic inventory movement for ${invoiceId}`,
        requestId,
        barberId: isBarberConsumption ? invoiceBarberId : "",
        barberName: isBarberConsumption ? invoiceBarberName : ""
      });
    });

    const grossInvoiceTotal = Math.max(0, inventoryNumber(data.subtotalBeforePremium) + inventoryNumber(data.premiumExtra));
    const invoiceDiscount = inventoryNumber(data.discountAmount);
    const itemRows = plan.lines.map((line) => {
      const quantity = Math.max(1, inventoryNumber(line.quantity) || 1);
      const unitPrice = inventoryNumber(line.unitPrice || line.price);
      const grossTotal = unitPrice * quantity;
      const allocatedDiscount = grossInvoiceTotal > 0 ? (grossTotal / grossInvoiceTotal) * invoiceDiscount : 0;
      const unitCost = estimateInvoiceLineCost(line, plan.itemsById, plan.recipes);
      return [
        `INI-${Utilities.getUuid()}`,
        invoiceId,
        inventoryText(line.lineType) || "service",
        inventoryText(line.referenceId || line.serviceId || line.itemId),
        inventoryText(line.itemName || line.name),
        quantity,
        unitPrice,
        grossTotal,
        inventoryNumber(data.discountPercent),
        allocatedDiscount,
        Math.max(0, grossTotal - allocatedDiscount),
        unitCost,
        unitCost * quantity,
        now
      ];
    });
    if (itemRows.length) {
      invoiceItemsSheet.getRange(invoiceItemsSheet.getLastRow() + 1, 1, itemRows.length, 14).setValues(itemRows);
    }
    return transaction;
  } catch (error) {
    try { rollbackInventoryCheckout(transaction); } catch (rollbackError) {
      console.error("Inventory rollback failed:", rollbackError);
    }
    throw error;
  }
}

