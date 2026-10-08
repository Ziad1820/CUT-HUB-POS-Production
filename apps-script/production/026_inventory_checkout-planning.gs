function readActiveServiceRecipes() {
  return inventoryRows(inventorySheet(INVENTORY_SHEETS.recipes), 11)
    .map((row) => ({
      serviceId: inventoryText(row[1]),
      itemId: inventoryText(row[3]),
      quantity: inventoryNumber(row[5]),
      active: inventoryBoolean(row[8], true)
    }))
    .filter((recipe) => recipe.serviceId && recipe.itemId && recipe.quantity > 0 && recipe.active);
}

function inventoryBatchSortKey(batch) {
  return `${batch.expiryDate || "9999-12-31"}|${batch.purchaseDate || "9999-12-31"}|${batch.rowNumber}`;
}

function prepareInventoryCheckout(data) {
  const lines = Array.isArray(data.invoiceItems) ? data.invoiceItems : [];
  if (!lines.length) {
    return { enabled: false, lines: [], batchUpdates: [], newBatches: [], movements: [], insufficientItems: [] };
  }

  const allowNegativeInventory = data.allowNegativeInventory === true
    || String(data.allowNegativeInventory || "").trim().toLowerCase() === "true";
  const items = readInventoryItems();
  const itemsById = {};
  items.forEach((item) => { itemsById[item.itemId] = item; });
  const recipes = readActiveServiceRecipes();
  const batches = readInventoryBatches().map((batch) => ({ ...batch }));
  const stockBefore = buildInventoryStock(items, batches);
  const serviceRequirements = {};
  const productRequirements = {};

  lines.forEach((line) => {
    const lineQuantity = Math.max(1, inventoryQuantity(line.quantity) || 1);
    if (inventoryText(line.lineType) === "product") {
      const itemId = inventoryText(line.referenceId || line.itemId);
      if (!itemId) return;
      productRequirements[itemId] = inventoryQuantity((productRequirements[itemId] || 0) + lineQuantity);
      return;
    }

    const serviceId = inventoryText(line.referenceId || line.serviceId);
    const serviceName = inventoryText(line.itemName || line.name);
    recipes.filter((recipe) => recipe.serviceId === serviceId).forEach((recipe) => {
      const requirement = serviceRequirements[recipe.itemId] || {
        quantity: 0,
        serviceIds: [],
        serviceNames: []
      };
      requirement.quantity = inventoryQuantity(requirement.quantity + (recipe.quantity * lineQuantity));
      if (serviceId && requirement.serviceIds.indexOf(serviceId) === -1) requirement.serviceIds.push(serviceId);
      if (serviceName && requirement.serviceNames.indexOf(serviceName) === -1) requirement.serviceNames.push(serviceName);
      serviceRequirements[recipe.itemId] = requirement;
    });
  });

  const insufficientItems = [];
  const configurationItems = [];

  Object.keys(productRequirements).forEach((itemId) => {
    const item = itemsById[itemId];
    if (!item) {
      configurationItems.push({ itemName: "Inventory item", unit: "pack" });
      return;
    }
    const availableQuantity = inventoryQuantity(stockBefore[itemId]?.sealedPacks);
    const requiredQuantity = inventoryQuantity(productRequirements[itemId]);
    const projectedQuantity = inventoryQuantity(availableQuantity - requiredQuantity);
    if (!item.active || !item.saleEnabled || projectedQuantity < 0) {
      insufficientItems.push({
        itemId,
        itemName: item.name,
        unit: "pack",
        availableQuantity,
        requiredQuantity,
        projectedQuantity
      });
    }
  });

  Object.keys(serviceRequirements).forEach((itemId) => {
    const item = itemsById[itemId];
    if (!item) {
      configurationItems.push({ itemName: "Inventory item", unit: "unit" });
      return;
    }
    const availableQuantity = inventoryQuantity(stockBefore[itemId]?.totalQuantity);
    const requiredQuantity = inventoryQuantity(serviceRequirements[itemId].quantity);
    const projectedQuantity = inventoryQuantity(availableQuantity - requiredQuantity);
    if (!item.active || !item.serviceEnabled || projectedQuantity < 0) {
      insufficientItems.push({
        itemId,
        itemName: item.name,
        unit: item.usageUnit,
        availableQuantity,
        requiredQuantity,
        projectedQuantity
      });
    }
  });

  if (configurationItems.length) {
    return {
      success: false,
      enabled: true,
      error: true,
      code: "INVENTORY_CONFIGURATION_ERROR",
      message: "A service or product has an invalid inventory setup. Please review its inventory recipe.",
      items: configurationItems
    };
  }

  if (insufficientItems.length && !allowNegativeInventory) {
    return {
      success: false,
      enabled: true,
      error: true,
      inventoryError: true,
      code: "INSUFFICIENT_INVENTORY",
      message: "Some inventory items do not have enough stock.",
      items: insufficientItems,
      insufficientItems
    };
  }

  const changedRows = {};
  const newBatches = [];
  const movements = [];

  function createDeficitBatch(item) {
    const now = getCairoDateTime();
    const batch = {
      rowNumber: 0,
      batchId: `BAT-NEG-${Utilities.getUuid()}`,
      itemId: item.itemId,
      purchaseDate: getCairoDateKey(),
      supplier: "",
      purchasedPacks: 0,
      packageSize: item.packageSize > 0 ? item.packageSize : 1,
      usageUnit: item.usageUnit,
      sealedPacks: 0,
      openedPacks: 0,
      openedQuantity: 0,
      purchasePrice: item.purchasePrice,
      expiryDate: "",
      status: "negative",
      createdAt: now,
      updatedAt: now
    };
    batches.push(batch);
    newBatches.push(batch);
    return batch;
  }

  Object.keys(productRequirements).forEach((itemId) => {
    const item = itemsById[itemId];
    let remaining = productRequirements[itemId];
    const itemBatches = batches
      .filter((batch) => batch.itemId === itemId && isInventoryBatchUsable(batch))
      .sort((a, b) => inventoryBatchSortKey(a).localeCompare(inventoryBatchSortKey(b)));

    itemBatches.forEach((batch) => {
      if (remaining <= 0 || batch.sealedPacks <= 0) return;
      const used = inventoryQuantity(Math.min(batch.sealedPacks, remaining));
      batch.sealedPacks = inventoryQuantity(batch.sealedPacks - used);
      remaining = inventoryQuantity(remaining - used);
      if (batch.rowNumber) changedRows[batch.rowNumber] = batch;
      movements.push({ item, batch, movementType: "product_sale", stockBucket: "sealed", quantity: -used, unit: "pack" });
    });

    if (remaining > 0) {
      const deficitBatch = itemBatches[itemBatches.length - 1] || createDeficitBatch(item);
      deficitBatch.sealedPacks = inventoryQuantity(deficitBatch.sealedPacks - remaining);
      if (deficitBatch.rowNumber) changedRows[deficitBatch.rowNumber] = deficitBatch;
      movements.push({ item, batch: deficitBatch, movementType: "product_sale", stockBucket: "sealed", quantity: -remaining, unit: "pack" });
    }
  });

  Object.keys(serviceRequirements).forEach((itemId) => {
    const item = itemsById[itemId];
    const requirement = serviceRequirements[itemId];
    let remaining = requirement.quantity;
    const itemBatches = batches
      .filter((batch) => batch.itemId === itemId && isInventoryBatchUsable(batch))
      .sort((a, b) => inventoryBatchSortKey(a).localeCompare(inventoryBatchSortKey(b)));
    const movementDetails = {
      serviceId: requirement.serviceIds.join(","),
      serviceName: requirement.serviceNames.join("، ")
    };

    itemBatches.forEach((batch) => {
      if (remaining <= 0 || batch.openedQuantity <= 0) return;
      const used = inventoryQuantity(Math.min(batch.openedQuantity, remaining));
      batch.openedQuantity = inventoryQuantity(batch.openedQuantity - used);
      remaining = inventoryQuantity(remaining - used);
      if (batch.openedQuantity <= 0) batch.openedPacks = 0;
      if (batch.rowNumber) changedRows[batch.rowNumber] = batch;
      movements.push({
        item,
        batch,
        ...movementDetails,
        movementType: "service_consumption",
        stockBucket: "opened",
        quantity: -used,
        unit: item.usageUnit
      });
    });

    itemBatches.forEach((batch) => {
      while (remaining > 0 && batch.sealedPacks > 0) {
        batch.sealedPacks = inventoryQuantity(batch.sealedPacks - 1);
        const used = inventoryQuantity(Math.min(batch.packageSize, remaining));
        const leftover = inventoryQuantity(batch.packageSize - used);
        remaining = inventoryQuantity(remaining - used);
        batch.openedPacks = leftover > 0 ? 1 : 0;
        batch.openedQuantity = leftover;
        if (batch.rowNumber) changedRows[batch.rowNumber] = batch;
        movements.push({ item, batch, movementType: "open_pack", stockBucket: "sealed", quantity: -1, unit: "pack" });
        movements.push({
          item,
          batch,
          ...movementDetails,
          movementType: "service_consumption",
          stockBucket: "opened",
          quantity: -used,
          unit: item.usageUnit
        });
      }
    });

    if (remaining > 0) {
      const deficitBatch = itemBatches[itemBatches.length - 1] || createDeficitBatch(item);
      deficitBatch.openedPacks = 0;
      deficitBatch.openedQuantity = inventoryQuantity(deficitBatch.openedQuantity - remaining);
      if (deficitBatch.rowNumber) changedRows[deficitBatch.rowNumber] = deficitBatch;
      movements.push({
        item,
        batch: deficitBatch,
        ...movementDetails,
        movementType: "service_consumption",
        stockBucket: "opened",
        quantity: -remaining,
        unit: item.usageUnit
      });
    }
  });

  const balances = {};
  items.forEach((item) => {
    balances[item.itemId] = inventoryQuantity(stockBefore[item.itemId]?.totalQuantity);
  });
  movements.forEach((movement) => {
    movement.balanceBefore = inventoryQuantity(balances[movement.item.itemId]);
    if (movement.movementType === "product_sale") {
      balances[movement.item.itemId] = inventoryQuantity(
        balances[movement.item.itemId] - (Math.abs(movement.quantity) * movement.batch.packageSize)
      );
    } else if (movement.movementType === "service_consumption") {
      balances[movement.item.itemId] = inventoryQuantity(
        balances[movement.item.itemId] - Math.abs(movement.quantity)
      );
    }
    movement.balanceAfter = inventoryQuantity(balances[movement.item.itemId]);
  });

  return {
    enabled: true,
    lines,
    batchUpdates: Object.keys(changedRows).map((key) => changedRows[key]),
    newBatches,
    movements,
    itemsById,
    recipes,
    insufficientItems
  };
}

function estimateInvoiceLineCost(line, itemsById, recipes) {
  if (inventoryText(line.lineType) === "product") {
    return inventoryNumber(itemsById[inventoryText(line.referenceId)]?.purchasePrice);
  }
  const serviceId = inventoryText(line.referenceId || line.serviceId);
  return recipes
    .filter((recipe) => recipe.serviceId === serviceId)
    .reduce((sum, recipe) => {
      const item = itemsById[recipe.itemId];
      const unitCost = item && item.packageSize > 0 ? item.purchasePrice / item.packageSize : 0;
      return sum + (unitCost * recipe.quantity);
    }, 0);
}

