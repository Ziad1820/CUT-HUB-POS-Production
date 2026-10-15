function isInventoryBatchUsable(batch) {
  if (!batch || batch.status === "deleted" || batch.status === "expired") return false;
  return !batch.expiryDate || batch.expiryDate >= getCairoDateKey();
}

function buildInventoryStock(items, batches) {
  const stock = {};
  items.forEach((item) => {
    stock[item.itemId] = {
      sealedPacks: 0,
      openedPacks: 0,
      openedQuantity: 0,
      totalQuantity: 0,
      stockValue: 0
    };
  });

  batches.forEach((batch) => {
    if (!stock[batch.itemId] || !isInventoryBatchUsable(batch)) return;
    const entry = stock[batch.itemId];
    entry.sealedPacks += batch.sealedPacks;
    entry.openedPacks += batch.openedPacks;
    entry.openedQuantity += batch.openedQuantity;
    entry.totalQuantity += (batch.sealedPacks * batch.packageSize) + batch.openedQuantity;
    const unitCost = batch.packageSize > 0 ? batch.purchasePrice / batch.packageSize : 0;
    entry.stockValue += (batch.sealedPacks * batch.purchasePrice) + (batch.openedQuantity * unitCost);
  });

  return stock;
}

function getInventoryData(data) {
  try {
    const permissionError = requirePermission(data, "view_inventory", "You do not have permission to view inventory.");
    if (permissionError) return permissionError;
    const items = readInventoryItems();
    const batches = readInventoryBatches();
    const stock = buildInventoryStock(items, batches);
    return jsonOutput({
      status: "success",
      items: items.map((item) => ({ ...item, stock: stock[item.itemId] || {} })),
      batches,
      log: readInventoryLog(data.limit)
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function getSellableProducts(data) {
  try {
    const permissionError = requirePermission(data, "access_cashier", "You do not have permission to view sellable products.");
    if (permissionError) return permissionError;
    const items = readInventoryItems().filter((item) => item.active && item.saleEnabled);
    const stock = buildInventoryStock(items, readInventoryBatches());
    return jsonOutput({
      status: "success",
      products: items.map((item) => ({
        itemId: item.itemId,
        name: item.name,
        salePrice: item.salePrice,
        sealedPacks: inventoryNumber(stock[item.itemId]?.sealedPacks)
      }))
    });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

