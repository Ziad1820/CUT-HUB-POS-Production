function getServiceRecipes(data) {
  try {
    const permissionError = requirePermission(data, "view_inventory", "You do not have permission to view service recipes.");
    if (permissionError) return permissionError;
    const recipes = inventoryRows(inventorySheet(INVENTORY_SHEETS.recipes), 11)
      .map((row) => ({
        recipeId: inventoryText(row[0]),
        serviceId: inventoryText(row[1]),
        serviceName: inventoryText(row[2]),
        itemId: inventoryText(row[3]),
        itemName: inventoryText(row[4]),
        quantity: inventoryNumber(row[5]),
        unit: inventoryText(row[6]),
        usageType: inventoryText(row[7]) || "consume",
        active: inventoryBoolean(row[8], true),
        createdAt: inventoryText(row[9]),
        updatedAt: inventoryText(row[10])
      }))
      .filter((recipe) => recipe.recipeId && recipe.serviceId && recipe.itemId && recipe.active);
    return jsonOutput({ status: "success", recipes });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

function saveServiceRecipe(data) {
  try {
    const permissionError = requirePermission(data, "view_inventory", "You do not have permission to edit service recipes.");
    if (permissionError) return permissionError;
    const serviceId = inventoryText(data.serviceId);
    const serviceName = inventoryText(data.serviceName);
    if (!serviceId || !serviceName) return jsonOutput({ status: "error", message: "Service is required." });
    const sheet = inventorySheet(INVENTORY_SHEETS.recipes);
    const existingRows = inventoryRows(sheet, 11);
    const keptRows = existingRows.filter((row) => inventoryText(row[1]) !== serviceId);
    const now = getCairoDateTime();
    const itemsById = {};
    readInventoryItems().forEach((item) => { itemsById[item.itemId] = item; });
    const recipeRows = (Array.isArray(data.ingredients) ? data.ingredients : [])
      .map((ingredient) => {
        const item = itemsById[inventoryText(ingredient.itemId)];
        const quantity = inventoryNumber(ingredient.quantity);
        if (!item || quantity <= 0) return null;
        return [
          `RCP-${Utilities.getUuid()}`,
          serviceId,
          serviceName,
          item.itemId,
          item.name,
          quantity,
          item.usageUnit,
          "consume",
          true,
          now,
          now
        ];
      })
      .filter(Boolean);

    const allRows = keptRows.concat(recipeRows);
    if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, 11).clearContent();
    if (allRows.length) sheet.getRange(2, 1, allRows.length, 11).setValues(allRows);
    logActivity(data, "update", "service_recipe", serviceId, `Saved inventory recipe for ${serviceName}. Ingredients: ${recipeRows.length}`);
    return jsonOutput({ status: "success", recipes: recipeRows.length });
  } catch (error) {
    return jsonOutput({ status: "error", message: error.message });
  }
}

