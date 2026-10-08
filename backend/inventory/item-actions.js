function saveInventoryItem(data) {
  try {
    const permissionError = requirePermission(data, "view_inventory", "You do not have permission to edit inventory.");
    if (permissionError) return permissionError;
    const input = data.item || data;
    const name = inventoryText(input.name);
    const packageSize = inventoryNumber(input.packageSize);
    if (!name) return jsonOutput({ status: "error", message: "Item name is required." });
    if (packageSize <= 0) return jsonOutput({ status: "error", message: "Package size must be greater than zero." });

    const sheet = inventorySheet(INVENTORY_SHEETS.items);
    const existing = readInventoryItems().find((item) => item.itemId === inventoryText(input.itemId));
    const now = getCairoDateTime();
    const itemId = existing ? existing.itemId : `ITM-${Utilities.getUuid()}`;
    const row = [
      itemId,
      name,
      inventoryText(input.category),
      inventoryText(input.itemType) || "consumable",
      inventoryText(input.usageUnit) || "piece",
      packageSize,
      inventoryNumber(input.purchasePrice),
      inventoryNumber(input.salePrice),
      inventoryBoolean(input.serviceEnabled, true),
      inventoryBoolean(input.saleEnabled, false),
      inventoryNumber(input.minimumStock),
      inventoryText(input.barcode),
      inventoryBoolean(input.active, true),
      existing ? existing.createdAt : now,
      now
    ];

    if (existing) sheet.getRange(existing.rowNumber, 1, 1, row.length).setValues([row]);
    else sheet.appendRow(row);

    logActivity(data, existing ? "update" : "create", "inventory_item", itemId, `${existing ? "Updated" : "Created"} inventory item: ${name}`);
    return jsonOutput({ status: "success", itemId });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function deleteInventoryItem(data) {
  try {
    const permissionError = requirePermission(data, "view_inventory", "You do not have permission to edit inventory.");
    if (permissionError) return permissionError;
    const itemId = inventoryText(data.itemId);
    const item = readInventoryItems().find((entry) => entry.itemId === itemId);
    if (!item) return jsonOutput({ status: "error", message: "Inventory item not found." });
    inventorySheet(INVENTORY_SHEETS.items).getRange(item.rowNumber, 13).setValue(false);
    inventorySheet(INVENTORY_SHEETS.items).getRange(item.rowNumber, 15).setValue(getCairoDateTime());
    logActivity(data, "delete", "inventory_item", itemId, `Disabled inventory item: ${item.name}`);
    return jsonOutput({ status: "success" });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

