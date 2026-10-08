function previewStagingInventorySchema() {
  const ss = SpreadsheetApp.getActive();

  const schemas = {
    INVENTORY_ITEMS: [
      "ITEM_ID", "NAME", "CATEGORY", "ITEM_TYPE", "USAGE_UNIT",
      "PACKAGE_SIZE", "PURCHASE_PRICE", "SALE_PRICE",
      "SERVICE_ENABLED", "SALE_ENABLED", "MINIMUM_STOCK",
      "BARCODE", "ACTIVE", "CREATED_AT", "UPDATED_AT"
    ],

    INVENTORY_BATCHES: [
      "BATCH_ID", "ITEM_ID", "PURCHASE_DATE", "SUPPLIER",
      "PURCHASED_PACKS", "PACKAGE_SIZE", "USAGE_UNIT",
      "SEALED_PACKS", "OPENED_PACKS", "OPENED_QUANTITY",
      "PURCHASE_PRICE", "EXPIRY_DATE", "STATUS",
      "CREATED_AT", "UPDATED_AT"
    ],

    SERVICE_RECIPES: [
      "RECIPE_ID", "SERVICE_ID", "SERVICE_NAME",
      "ITEM_ID", "ITEM_NAME", "QUANTITY", "UNIT",
      "USAGE_TYPE", "ACTIVE", "CREATED_AT", "UPDATED_AT"
    ],

    INVENTORY_LOG: [
      "TRANSACTION_ID", "DATE_TIME", "ITEM_ID", "ITEM_NAME",
      "BATCH_ID", "MOVEMENT_TYPE", "STOCK_BUCKET", "QUANTITY",
      "UNIT", "INVOICE_ID", "SERVICE_ID", "USERNAME",
      "BALANCE_AFTER", "NOTE", "REQUEST_ID",
      "barberId", "barberName", "balanceBefore"
    ],

    INVOICE_ITEMS: [
      "INVOICE_ITEM_ID", "INVOICE_ID", "LINE_TYPE",
      "REFERENCE_ID", "ITEM_NAME", "QUANTITY",
      "UNIT_PRICE", "GROSS_TOTAL", "DISCOUNT_PERCENT",
      "DISCOUNT_AMOUNT", "NET_TOTAL", "UNIT_COST",
      "TOTAL_COST", "CREATED_AT"
    ]
  };

  const result = Object.keys(schemas).map(name => {
    const expectedHeaders = schemas[name];
    const sheet = ss.getSheetByName(name);

    if (!sheet) {
      return {
        sheetName: name,
        exists: false,
        expectedHeaders,
        existingHeaders: [],
        rowCount: 0
      };
    }

    const width = Math.max(sheet.getLastColumn(), expectedHeaders.length);
    const existingHeaders = width
      ? sheet.getRange(1, 1, 1, width).getDisplayValues()[0]
      : [];

    return {
      sheetName: name,
      exists: true,
      expectedHeaders,
      existingHeaders,
      rowCount: Math.max(0, sheet.getLastRow() - 1)
    };
  });

  console.log(JSON.stringify(result, null, 2));
  return result;
}
