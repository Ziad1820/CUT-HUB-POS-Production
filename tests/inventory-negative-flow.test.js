const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const backendPath = path.join(root, "scripts", "app-script-final-owner-access.js");
const cashierPath = path.join(root, "public", "assets", "js", "pages", "cashier.js");
const inventoryFilterPath = path.join(root, "public", "assets", "js", "utils", "inventory-filters.js");
const backendSource = fs.readFileSync(backendPath, "utf8");
const cashierSource = fs.readFileSync(cashierPath, "utf8");
const inventoryFilterSource = fs.readFileSync(inventoryFilterPath, "utf8");

function createContext() {
  let uuid = 0;
  const context = {
    console,
    Date,
    JSON,
    Math,
    Number,
    String,
    Set,
    Map,
    Utilities: {
      getUuid: () => `uuid-${++uuid}`,
      formatDate: () => "2026-07-28",
      base64EncodeWebSafe: value => String(value),
      computeDigest: () => "digest"
    }
  };
  vm.createContext(context);
  vm.runInContext(backendSource, context, { filename: backendPath });
  context.getCairoDateKey = () => "2026-07-28";
  context.getCairoDateTime = () => "2026-07-28 12:00:00";
  return context;
}

function item(id, overrides = {}) {
  return {
    itemId: id,
    name: overrides.name || id,
    active: overrides.active ?? true,
    serviceEnabled: overrides.serviceEnabled ?? true,
    saleEnabled: overrides.saleEnabled ?? false,
    usageUnit: overrides.usageUnit || "g",
    packageSize: overrides.packageSize ?? 100,
    purchasePrice: overrides.purchasePrice ?? 50
  };
}

function batch(id, itemId, openedQuantity, overrides = {}) {
  return {
    rowNumber: overrides.rowNumber ?? 2,
    batchId: id,
    itemId,
    purchaseDate: "2026-07-01",
    supplier: "",
    purchasedPacks: overrides.purchasedPacks ?? 1,
    packageSize: overrides.packageSize ?? 100,
    usageUnit: overrides.usageUnit || "g",
    sealedPacks: overrides.sealedPacks ?? 0,
    openedPacks: openedQuantity > 0 ? 1 : 0,
    openedQuantity,
    purchasePrice: 50,
    expiryDate: "",
    status: overrides.status || "active",
    createdAt: "2026-07-01",
    updatedAt: "2026-07-01"
  };
}

function serviceLine(serviceId, quantity = 1, name = "Service") {
  return { lineType: "service", referenceId: serviceId, itemName: name, quantity, unitPrice: 100 };
}

function prepare({ items, batches, recipes, lines, allowNegativeInventory = false }) {
  const context = createContext();
  context.readInventoryItems = () => items.map(value => ({ ...value }));
  context.readInventoryBatches = () => batches.map(value => ({ ...value }));
  context.readActiveServiceRecipes = () => recipes.map(value => ({ ...value }));
  return context.prepareInventoryCheckout({ invoiceItems: lines, allowNegativeInventory });
}

function createMemorySheet(headers, initialMaxColumns = headers.length) {
  const rows = [[...headers]];
  let maxColumns = initialMaxColumns;
  let insertCalls = 0;
  while (rows[0].length < maxColumns) rows[0].push("");
  return {
    getMaxColumns: () => maxColumns,
    getLastColumn: () => rows.reduce((largest, row) => {
      for (let index = row.length - 1; index >= 0; index -= 1) {
        if (String(row[index] ?? "").trim()) return Math.max(largest, index + 1);
      }
      return largest;
    }, 0),
    getLastRow: () => rows.length,
    insertColumnsAfter: (after, count) => {
      assert.equal(after, maxColumns);
      maxColumns += count;
      insertCalls += 1;
      rows.forEach(row => {
        while (row.length < maxColumns) row.push("");
      });
    },
    getRange: (startRow, startColumn, rowCount = 1, columnCount = 1) => ({
      getValues: () => Array.from({ length: rowCount }, (_, rowOffset) => {
        const row = rows[startRow - 1 + rowOffset] || [];
        return Array.from({ length: columnCount }, (_, columnOffset) => row[startColumn - 1 + columnOffset] ?? "");
      }),
      getValue: () => rows[startRow - 1]?.[startColumn - 1] ?? "",
      setValue: value => {
        while (rows.length < startRow) rows.push([]);
        rows[startRow - 1][startColumn - 1] = value;
      },
      setValues: values => {
        values.forEach((valuesRow, rowOffset) => {
          while (rows.length < startRow + rowOffset) rows.push([]);
          valuesRow.forEach((value, columnOffset) => {
            rows[startRow - 1 + rowOffset][startColumn - 1 + columnOffset] = value;
          });
        });
      }
    }),
    appendRow: row => rows.push([...row]),
    _rows: rows,
    _insertCalls: () => insertCalls
  };
}

const tests = [];
function test(name, run) {
  tests.push({ name, run });
}

test("sufficient inventory completes without a warning", () => {
  const plan = prepare({
    items: [item("cream", { name: "Hair Cream" })],
    batches: [batch("b1", "cream", 30)],
    recipes: [{ serviceId: "treatment", itemId: "cream", quantity: 20, active: true }],
    lines: [serviceLine("treatment")]
  });
  assert.equal(plan.error, undefined);
  assert.equal(plan.insufficientItems.length, 0);
  assert.equal(plan.batchUpdates[0].openedQuantity, 10);
  assert.equal(plan.movements.filter(value => value.movementType === "service_consumption")[0].balanceAfter, 10);
});

test("zero inventory returns a structured confirmation response", () => {
  const plan = prepare({
    items: [item("cream", { name: "Hair Cream" })],
    batches: [],
    recipes: [{ serviceId: "treatment", itemId: "cream", quantity: 20, active: true }],
    lines: [serviceLine("treatment")]
  });
  assert.equal(plan.code, "INSUFFICIENT_INVENTORY");
  assert.equal(plan.success, false);
  assert.equal(typeof plan.items[0].availableQuantity, "number");
  assert.equal(typeof plan.items[0].requiredQuantity, "number");
  assert.equal(typeof plan.items[0].projectedQuantity, "number");
  assert.equal(JSON.stringify(plan.items[0]), JSON.stringify({
    itemId: "cream",
    itemName: "Hair Cream",
    unit: "g",
    availableQuantity: 0,
    requiredQuantity: 20,
    projectedQuantity: -20
  }));
});

test("partial inventory becomes negative only after explicit confirmation", () => {
  const blocked = prepare({
    items: [item("cream", { name: "Hair Cream" })],
    batches: [batch("b1", "cream", 10)],
    recipes: [{ serviceId: "treatment", itemId: "cream", quantity: 20, active: true }],
    lines: [serviceLine("treatment")]
  });
  assert.equal(blocked.items[0].projectedQuantity, -10);

  const allowed = prepare({
    items: [item("cream", { name: "Hair Cream" })],
    batches: [batch("b1", "cream", 10)],
    recipes: [{ serviceId: "treatment", itemId: "cream", quantity: 20, active: true }],
    lines: [serviceLine("treatment")],
    allowNegativeInventory: true
  });
  assert.equal(allowed.error, undefined);
  assert.equal(allowed.batchUpdates[0].openedQuantity, -10);
  assert.equal(allowed.movements.at(-1).balanceBefore, 0);
  assert.equal(allowed.movements.at(-1).balanceAfter, -10);
});

test("service quantities and repeated services aggregate accurately", () => {
  const plan = prepare({
    items: [item("cream", { name: "Hair Cream" })],
    batches: [batch("b1", "cream", 0)],
    recipes: [{ serviceId: "treatment", itemId: "cream", quantity: 0.1, active: true }],
    lines: [serviceLine("treatment", 1), serviceLine("treatment", 2)]
  });
  assert.equal(plan.items[0].requiredQuantity, 0.3);
  assert.equal(plan.items[0].projectedQuantity, -0.3);
});

test("multiple insufficient items are all returned without internal IDs in the message", () => {
  const plan = prepare({
    items: [
      item("cream-id", { name: "Hair Cream", usageUnit: "g" }),
      item("oil-id", { name: "Hair Oil", usageUnit: "ml" })
    ],
    batches: [],
    recipes: [
      { serviceId: "treatment", itemId: "cream-id", quantity: 20, active: true },
      { serviceId: "treatment", itemId: "oil-id", quantity: 5, active: true }
    ],
    lines: [serviceLine("treatment")]
  });
  assert.equal(plan.items.length, 2);
  assert.equal(JSON.stringify(Array.from(plan.items, value => value.itemName).sort()), JSON.stringify(["Hair Cream", "Hair Oil"]));
  assert.equal(plan.message.includes("cream-id"), false);
  assert.equal(plan.message.includes("oil-id"), false);
});

test("confirmed zero stock creates a negative batch and movement", () => {
  const plan = prepare({
    items: [item("cream", { name: "Hair Cream" })],
    batches: [],
    recipes: [{ serviceId: "treatment", itemId: "cream", quantity: 20, active: true }],
    lines: [serviceLine("treatment", 1, "Hair Cream Treatment")],
    allowNegativeInventory: true
  });
  assert.equal(plan.newBatches.length, 1);
  assert.equal(plan.newBatches[0].openedQuantity, -20);
  assert.equal(plan.movements[0].quantity, -20);
  assert.equal(plan.movements[0].balanceBefore, 0);
  assert.equal(plan.movements[0].balanceAfter, -20);
  assert.equal(plan.movements[0].serviceName, "Hair Cream Treatment");
});

test("duplicate submission protections remain active on client and server", () => {
  assert.match(cashierSource, /if \(invoiceSubmitInProgress\)/);
  assert.match(cashierSource, /confirmNegativeInventoryBtn\.disabled = true/);
  assert.match(backendSource, /LockService\.getScriptLock\(\)/);
  assert.match(backendSource, /invoice-request-\$\{requestId\}/);
  assert.match(backendSource, /invoice-fingerprint-\$\{fingerprintDigest\}/);
  assert.doesNotMatch(
    cashierSource.slice(cashierSource.indexOf("async function submitPreparedInvoice"), cashierSource.indexOf("function escapePrintHtml")),
    /window\.confirm/
  );
});

test("inventory is revalidated under the lock before a competing invoice can deduct", () => {
  const sharedItem = item("cream", { name: "Hair Cream" });
  const recipe = { serviceId: "treatment", itemId: "cream", quantity: 20, active: true };
  const first = prepare({
    items: [sharedItem],
    batches: [batch("b1", "cream", 30)],
    recipes: [recipe],
    lines: [serviceLine("treatment")]
  });
  assert.equal(first.error, undefined);
  assert.equal(first.batchUpdates[0].openedQuantity, 10);

  const second = prepare({
    items: [sharedItem],
    batches: [first.batchUpdates[0]],
    recipes: [recipe],
    lines: [serviceLine("treatment")]
  });
  assert.equal(second.code, "INSUFFICIENT_INVENTORY");
  assert.equal(second.items[0].availableQuantity, 10);
  assert.equal(second.items[0].projectedQuantity, -10);
});

test("movement totals reconcile exactly to required consumption and final balance", () => {
  const plan = prepare({
    items: [item("cream", { name: "Hair Cream" })],
    batches: [
      batch("b1", "cream", 5, { rowNumber: 2 }),
      batch("b2", "cream", 8, { rowNumber: 3 })
    ],
    recipes: [{ serviceId: "treatment", itemId: "cream", quantity: 20, active: true }],
    lines: [serviceLine("treatment")],
    allowNegativeInventory: true
  });
  const consumption = plan.movements.filter(entry => entry.movementType === "service_consumption");
  assert.equal(consumption.reduce((sum, entry) => sum + Math.abs(entry.quantity), 0), 20);
  assert.equal(consumption[0].balanceBefore, 13);
  assert.equal(consumption.at(-1).balanceAfter, -7);
  assert.equal(plan.batchUpdates.reduce((sum, entry) => sum + entry.openedQuantity, 0), -7);
});

test("negative inventory filter combines with search and resets cleanly", () => {
  const browser = { RomeoInventoryFilters: null };
  vm.runInNewContext(inventoryFilterSource, { window: browser });
  const items = [
    { name: "Hair Cream", category: "Hair", barcode: "111", active: true, stock: { totalQuantity: -2 } },
    { name: "Hair Oil", category: "Hair", barcode: "222", active: true, stock: { totalQuantity: 4 } },
    { name: "Face Mask", category: "Skin", barcode: "333", active: true, stock: { totalQuantity: -1 } }
  ];
  assert.equal(browser.RomeoInventoryFilters.filterItems(items, "", true).length, 2);
  assert.deepEqual(
    browser.RomeoInventoryFilters.filterItems(items, "cream", true).map(entry => entry.name),
    ["Hair Cream"]
  );
  assert.equal(browser.RomeoInventoryFilters.filterItems(items, "", false).length, 3);
});

test("header normalization treats capitalization, spacing, underscores, and dashes as equivalent", () => {
  const context = createContext();
  const invoiceVariants = [
    "invoice request id",
    "Invoice Request ID",
    " invoice request id ",
    "invoice_request_id",
    "invoice-request-id",
    "Invoice__Request - ID"
  ];
  const balanceVariants = [
    "balanceBefore",
    "Balance Before",
    " balanceBefore ",
    "balance_before",
    "balance-before"
  ];
  invoiceVariants.forEach(value => assert.equal(context.normalizeSheetHeader(value), "invoicerequestid"));
  balanceVariants.forEach(value => assert.equal(context.normalizeSheetHeader(value), "balancebefore"));
});

test("invoice request id reuses a legacy header at its actual column without duplication", () => {
  const context = createContext();
  const headers = Array(16).fill("");
  headers[15] = " Client Request-ID ";
  const sheet = createMemorySheet(headers, 16);
  const first = context.ensureDataInvoiceColumns(sheet);
  const second = context.ensureDataInvoiceColumns(sheet);
  assert.equal(first.invoiceRequestIdColumn, 16);
  assert.equal(second.invoiceRequestIdColumn, 16);
  assert.equal(sheet._insertCalls(), 0);

  const invoiceRow = Array(16).fill("");
  invoiceRow[4] = "https://example.com/invoice.pdf";
  invoiceRow[15] = "legacy-request";
  sheet.appendRow(invoiceRow);
  const found = context.findInvoiceByRequestId(sheet, "legacy-request");
  assert.equal(found.invoiceId, "DATA-2");
  assert.equal(found.pdfUrl, "https://example.com/invoice.pdf");
  assert.equal(sheet._rows[0].filter(value => context.normalizeSheetHeader(value) === "clientrequestid").length, 1);
});

test("repeated invoice header creation adds exactly one canonical column", () => {
  const context = createContext();
  const sheet = createMemorySheet(Array(13).fill(""), 13);
  const first = context.ensureDataInvoiceColumns(sheet);
  const second = context.ensureDataInvoiceColumns(sheet);
  assert.equal(first.invoiceRequestIdColumn, 14);
  assert.equal(second.invoiceRequestIdColumn, 14);
  assert.equal(sheet._insertCalls(), 1);
  assert.equal(sheet._rows[0].filter(value => context.normalizeSheetHeader(value) === "invoicerequestid").length, 1);
});

test("balanceBefore reuses a legacy header and writes to its actual column", () => {
  const context = createContext();
  const headers = Array(20).fill("");
  headers[15] = "barberId";
  headers[16] = "barberName";
  headers[19] = " Previous_Balance ";
  const sheet = createMemorySheet(headers, 20);
  context.inventorySheet = () => sheet;
  const first = context.ensureInventoryLogBarberColumns();
  const second = context.ensureInventoryLogBarberColumns();
  assert.equal(first.balanceBeforeColumn, 20);
  assert.equal(second.balanceBeforeColumn, 20);
  assert.equal(sheet._insertCalls(), 0);

  context.appendInventoryLog({
    transactionId: "TX-1",
    invoiceId: "DATA-2",
    balanceAfter: -5,
    balanceBefore: 10
  });
  assert.equal(sheet._rows[1][19], 10);
  assert.equal(sheet._rows[0].filter(value => context.normalizeSheetHeader(value) === "previousbalance").length, 1);
});

test("repeated balanceBefore creation adds exactly one canonical column", () => {
  const context = createContext();
  const headers = Array(17).fill("");
  headers[15] = "barberId";
  headers[16] = "barberName";
  const sheet = createMemorySheet(headers, 17);
  context.inventorySheet = () => sheet;
  const first = context.ensureInventoryLogBarberColumns();
  const second = context.ensureInventoryLogBarberColumns();
  assert.equal(first.balanceBeforeColumn, 18);
  assert.equal(second.balanceBeforeColumn, 18);
  assert.equal(sheet._insertCalls(), 1);
  assert.equal(sheet._rows[0].filter(value => context.normalizeSheetHeader(value) === "balancebefore").length, 1);
});

test("initial insufficient response performs no sheet, PDF, invoice, detail, movement, or cache writes", () => {
  const context = createContext();
  const writes = { schema: 0, pdf: 0, invoice: 0, inventory: 0, cache: 0 };
  context.requirePermission = () => null;
  context.getInvoiceDateTime = () => "2026-07-28 12:00:00";
  context.getLockedDateError = () => "";
  context.jsonOutput = payload => payload;
  context.prepareInventoryCheckout = () => ({
    success: false,
    error: true,
    code: "INSUFFICIENT_INVENTORY",
    message: "Some inventory items do not have enough stock.",
    items: [{ itemId: "cream", itemName: "Hair Cream", unit: "g", availableQuantity: 0, requiredQuantity: 20, projectedQuantity: -20 }]
  });
  context.ensureDataInvoiceColumns = () => { writes.schema += 1; };
  context.createInvoicePdf = () => { writes.pdf += 1; return "pdf"; };
  context.applyInventoryCheckout = () => { writes.inventory += 1; };
  context.LockService = { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) };
  context.CacheService = {
    getScriptCache: () => ({ get: () => null, put: () => { writes.cache += 1; } })
  };
  context.SpreadsheetApp = {
    getActive: () => ({ getSheetByName: () => ({ appendRow: () => { writes.invoice += 1; } }) })
  };

  const result = context.createInvoice({
    invoiceItems: [serviceLine("treatment")],
    idempotencyKey: "initial-check"
  });
  assert.equal(result.code, "INSUFFICIENT_INVENTORY");
  assert.equal(result.success, false);
  assert.deepEqual(writes, { schema: 0, pdf: 0, invoice: 0, inventory: 0, cache: 0 });
});

test("a repeated request id returns the persisted invoice without a second PDF or deduction", () => {
  const context = createContext();
  const rows = [["date", "name", "phone", "services", "pdf", "total", "paid", "tip", "payment", "barber", "note", "discount", "discount amount", "Invoice Request ID"]];
  let pdfCalls = 0;
  let inventoryCalls = 0;
  const dataSheet = {
    getMaxColumns: () => 14,
    getLastColumn: () => 14,
    getLastRow: () => rows.length,
    appendRow: row => rows.push([...row]),
    deleteRow: row => rows.splice(row - 1, 1),
    getRange: (row, column, rowCount, width) => ({
      getValues: () => rows.slice(row - 1, row - 1 + rowCount).map(value => value.slice(column - 1, column - 1 + width))
    })
  };
  context.requirePermission = () => null;
  context.getSessionToken = () => "";
  context.prepareInventoryCheckout = () => ({ enabled: true, lines: [], batchUpdates: [], newBatches: [], movements: [] });
  context.applyInventoryCheckout = () => { inventoryCalls += 1; return null; };
  context.createInvoicePdf = () => { pdfCalls += 1; return "https://drive.google.com/file/d/pdf-file-id/view"; };
  context.ensureDataInvoiceColumns = () => ({ invoiceRequestIdColumn: 14 });
  context.getInvoiceDateTime = () => "2026-07-28 12:00:00";
  context.getLockedDateError = () => "";
  context.getInvoicePaymentDetails = () => ({ paidAmount: 100, tipAmount: 0 });
  context.logActivity = () => {};
  context.jsonOutput = payload => payload;
  context.LockService = { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) };
  context.CacheService = { getScriptCache: () => ({ get: () => null, put: () => {} }) };
  context.SpreadsheetApp = { getActive: () => ({ getSheetByName: () => dataSheet }) };
  const payload = {
    invoiceItems: [serviceLine("treatment")],
    idempotencyKey: "persistent-request",
    total: 100
  };
  const first = context.createInvoice(payload);
  const second = context.createInvoice(payload);
  assert.equal(first.invoiceId, "DATA-2");
  assert.equal(second.invoiceId, "DATA-2");
  assert.equal(second.duplicate, true);
  assert.equal(rows.length, 2);
  assert.equal(pdfCalls, 1);
  assert.equal(inventoryCalls, 1);
});

test("a failure during deduction restores the full original batch row", () => {
  const context = createContext();
  const originalBatchRow = [
    "b1", "cream", "2026-07-01", "", 1, 100, "g", 0, 1, 10, 50, "", "active", "created", "updated"
  ];
  let batchRow = [...originalBatchRow];
  let statusWriteAttempts = 0;
  const batchSheet = {
    getLastRow: () => 2,
    getRange: (row, column, rowCount, width) => ({
      getValues: () => [[...batchRow]],
      setValues: values => {
        if (column === 1 && width === 15) batchRow = [...values[0]];
        if (column === 8 && width === 3) [batchRow[7], batchRow[8], batchRow[9]] = values[0];
      },
      setValue: value => {
        if (column === 13 && statusWriteAttempts++ === 0) throw new Error("simulated deduction write failure");
        batchRow[column - 1] = value;
      }
    }),
    appendRow: () => {},
    deleteRows: () => {}
  };
  const emptySheet = { getLastRow: () => 1, deleteRows: () => {} };
  context.inventorySheet = name => name === "INVENTORY_BATCHES" ? batchSheet : emptySheet;
  context.ensureInventoryLogBarberColumns = () => ({
    sheet: emptySheet,
    barberIdColumn: 16,
    barberNameColumn: 17,
    balanceBeforeColumn: 18,
    width: 18
  });
  const plan = {
    enabled: true,
    newBatches: [],
    batchUpdates: [{ rowNumber: 2, sealedPacks: 0, openedPacks: 0, openedQuantity: -10 }],
    movements: [],
    lines: [],
    itemsById: {},
    recipes: []
  };
  assert.throws(() => context.applyInventoryCheckout(plan, {}, "DATA-2"), /simulated deduction write failure/);
  assert.deepEqual(batchRow, originalBatchRow);
});

test("inventory writes are rolled back when a later inventory step fails", () => {
  const context = createContext();
  const originalBatchRow = [
    "b1", "cream", "2026-07-01", "", 1, 100, "g", 0, 1, 10, 50, "", "active", "created", "updated"
  ];
  let batchRow = [...originalBatchRow];
  let logRows = 1;

  const batchSheet = {
    getLastRow: () => 2,
    getRange: (row, column, rowCount, width) => ({
      getValues: () => [[...batchRow]],
      setValues: values => {
        if (column === 1 && width === 15) batchRow = [...values[0]];
        if (column === 8 && width === 3) {
          batchRow[7] = values[0][0];
          batchRow[8] = values[0][1];
          batchRow[9] = values[0][2];
        }
      },
      setValue: value => { batchRow[column - 1] = value; }
    }),
    appendRow: () => {},
    deleteRows: () => {}
  };
  const logSheet = {
    getLastRow: () => logRows,
    appendRow: () => { logRows += 1; },
    deleteRows: (start, count) => { logRows -= count; }
  };
  let invoiceItemRows = 1;
  const invoiceItemsSheet = {
    getLastRow: () => invoiceItemRows,
    getRange: () => ({ setValues: values => {
      invoiceItemRows += values.length;
      throw new Error("simulated inventory item write failure");
    } }),
    deleteRows: (start, count) => { invoiceItemRows -= count; }
  };

  context.inventorySheet = name => ({
    INVENTORY_BATCHES: batchSheet,
    INVENTORY_LOG: logSheet,
    INVOICE_ITEMS: invoiceItemsSheet
  })[name];
  context.ensureInventoryLogBarberColumns = () => ({
    sheet: logSheet,
    barberIdColumn: 16,
    barberNameColumn: 17,
    balanceBeforeColumn: 18,
    width: 18
  });
  context.appendInventoryLog = () => logSheet.appendRow([]);
  context.getAuthenticatedUser = () => ({ username: "cashier" });

  const plan = {
    enabled: true,
    newBatches: [],
    batchUpdates: [{ rowNumber: 2, sealedPacks: 0, openedPacks: 0, openedQuantity: -10 }],
    movements: [{
      item: item("cream"),
      batch: batch("b1", "cream", -10),
      movementType: "service_consumption",
      stockBucket: "opened",
      quantity: -20,
      unit: "g",
      balanceBefore: 10,
      balanceAfter: -10
    }],
    lines: [serviceLine("treatment")],
    itemsById: { cream: item("cream") },
    recipes: []
  };

  assert.throws(() => context.applyInventoryCheckout(plan, {}, "DATA-2"), /simulated inventory item write failure/);
  assert.deepEqual(batchRow, originalBatchRow);
  assert.equal(logRows, 1);
  assert.equal(invoiceItemRows, 1);
});

test("a movement write failure restores deducted stock and removes partial movement rows", () => {
  const context = createContext();
  const originalBatchRow = [
    "b1", "cream", "2026-07-01", "", 1, 100, "g", 0, 1, 10, 50, "", "active", "created", "updated"
  ];
  let batchRow = [...originalBatchRow];
  let logRows = 1;
  const batchSheet = {
    getLastRow: () => 2,
    getRange: (row, column, rowCount, width) => ({
      getValues: () => [[...batchRow]],
      setValues: values => {
        if (column === 1 && width === 15) batchRow = [...values[0]];
        if (column === 8 && width === 3) [batchRow[7], batchRow[8], batchRow[9]] = values[0];
      },
      setValue: value => { batchRow[column - 1] = value; }
    }),
    appendRow: () => {},
    deleteRows: () => {}
  };
  const logSheet = {
    getLastRow: () => logRows,
    appendRow: () => {
      logRows += 1;
      throw new Error("simulated movement write failure");
    },
    deleteRows: (start, count) => { logRows -= count; }
  };
  const invoiceItemsSheet = { getLastRow: () => 1, deleteRows: () => {} };
  context.inventorySheet = name => ({
    INVENTORY_BATCHES: batchSheet,
    INVENTORY_LOG: logSheet,
    INVOICE_ITEMS: invoiceItemsSheet
  })[name];
  context.ensureInventoryLogBarberColumns = () => ({
    sheet: logSheet,
    barberIdColumn: 16,
    barberNameColumn: 17,
    balanceBeforeColumn: 18,
    width: 18
  });
  context.getAuthenticatedUser = () => ({ username: "cashier" });
  const plan = {
    enabled: true,
    newBatches: [],
    batchUpdates: [{ rowNumber: 2, sealedPacks: 0, openedPacks: 0, openedQuantity: -10 }],
    movements: [{
      item: item("cream"),
      batch: batch("b1", "cream", -10),
      movementType: "service_consumption",
      stockBucket: "opened",
      quantity: -20,
      unit: "g",
      balanceBefore: 10,
      balanceAfter: -10
    }],
    lines: [],
    itemsById: { cream: item("cream") },
    recipes: []
  };
  assert.throws(() => context.applyInventoryCheckout(plan, {}, "DATA-2"), /simulated movement write failure/);
  assert.deepEqual(batchRow, originalBatchRow);
  assert.equal(logRows, 1);
});

test("invoice row and generated PDF are rolled back when inventory application fails", () => {
  const context = createContext();
  let dataRows = 1;
  let pdfTrashed = false;
  const dataSheet = {
    getMaxColumns: () => 13,
    getLastRow: () => dataRows,
    appendRow: () => { dataRows += 1; },
    deleteRow: () => { dataRows -= 1; }
  };
  context.requirePermission = () => null;
  context.getSessionToken = () => "";
  context.prepareInventoryCheckout = () => ({ enabled: true, lines: [], batchUpdates: [], newBatches: [], movements: [] });
  context.applyInventoryCheckout = () => { throw new Error("simulated inventory failure"); };
  context.createInvoicePdf = () => "https://drive.google.com/file/d/pdf-file-id/view?usp=sharing";
  context.ensureDataInvoiceColumns = () => ({ invoiceRequestIdColumn: 14 });
  context.getInvoiceDateTime = () => "2026-07-28 12:00:00";
  context.getLockedDateError = () => "";
  context.jsonOutput = payload => payload;
  context.LockService = {
    getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} })
  };
  context.CacheService = {
    getScriptCache: () => ({ get: () => null, put: () => {} })
  };
  context.SpreadsheetApp = {
    getActive: () => ({ getSheetByName: name => name === "DATA" ? dataSheet : null })
  };
  context.DriveApp = {
    getFileById: () => ({ setTrashed: value => { pdfTrashed = value; } })
  };

  const result = context.createInvoice({
    action: "invoice",
    customerName: "Test",
    total: 100,
    invoiceItems: [serviceLine("treatment")],
    idempotencyKey: "test-request"
  });
  assert.equal(result.code, "INVOICE_COMPLETION_FAILED");
  assert.equal(dataRows, 1);
  assert.equal(pdfTrashed, true);
});

test("a failure after invoice details are complete rolls back the whole business transaction", () => {
  const context = createContext();
  let dataRows = 1;
  let inventoryRolledBack = false;
  let pdfTrashed = false;
  const dataSheet = {
    getMaxColumns: () => 14,
    getLastRow: () => dataRows,
    appendRow: () => { dataRows += 1; },
    deleteRow: () => { dataRows -= 1; }
  };
  context.requirePermission = () => null;
  context.getSessionToken = () => "";
  context.prepareInventoryCheckout = () => ({ enabled: true, lines: [], batchUpdates: [], newBatches: [], movements: [] });
  context.applyInventoryCheckout = () => ({ invoiceId: "DATA-2" });
  context.rollbackInventoryCheckout = () => { inventoryRolledBack = true; };
  context.createInvoicePdf = () => "https://drive.google.com/file/d/pdf-file-id/view?usp=sharing";
  context.ensureDataInvoiceColumns = () => ({ invoiceRequestIdColumn: 14 });
  context.getInvoiceDateTime = () => "2026-07-28 12:00:00";
  context.getLockedDateError = () => "";
  context.logActivity = () => { throw new Error("simulated post-detail failure"); };
  context.jsonOutput = payload => payload;
  context.LockService = { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) };
  context.CacheService = { getScriptCache: () => ({ get: () => null, put: () => {} }) };
  context.SpreadsheetApp = { getActive: () => ({ getSheetByName: () => dataSheet }) };
  context.DriveApp = {
    getFileById: () => ({ setTrashed: value => { pdfTrashed = value; } })
  };
  const result = context.createInvoice({
    invoiceItems: [serviceLine("treatment")],
    idempotencyKey: "post-detail-failure",
    total: 100
  });
  assert.equal(result.code, "INVOICE_COMPLETION_FAILED");
  assert.equal(dataRows, 1);
  assert.equal(inventoryRolledBack, true);
  assert.equal(pdfTrashed, true);
});

test("PDF generation failure leaves no invoice row or inventory movement", () => {
  const context = createContext();
  let dataRows = 1;
  let inventoryCalls = 0;
  const dataSheet = {
    getMaxColumns: () => 13,
    getLastRow: () => dataRows,
    appendRow: () => { dataRows += 1; },
    deleteRow: () => { dataRows -= 1; }
  };
  context.requirePermission = () => null;
  context.getSessionToken = () => "";
  context.prepareInventoryCheckout = () => ({ enabled: true, lines: [], batchUpdates: [], newBatches: [], movements: [] });
  context.applyInventoryCheckout = () => { inventoryCalls += 1; };
  context.createInvoicePdf = () => { throw new Error("simulated PDF failure"); };
  context.ensureDataInvoiceColumns = () => ({ invoiceRequestIdColumn: 14 });
  context.getInvoiceDateTime = () => "2026-07-28 12:00:00";
  context.getLockedDateError = () => "";
  context.jsonOutput = payload => payload;
  context.LockService = { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) };
  context.CacheService = { getScriptCache: () => ({ get: () => null, put: () => {} }) };
  context.SpreadsheetApp = { getActive: () => ({ getSheetByName: () => dataSheet }) };
  const result = context.createInvoice({ invoiceItems: [serviceLine("treatment")], idempotencyKey: "pdf-failure" });
  assert.equal(result.code, "INVOICE_COMPLETION_FAILED");
  assert.equal(result.success, false);
  assert.equal(dataRows, 1);
  assert.equal(inventoryCalls, 0);
});

test("a PDF file is trashed if Drive sharing fails after file creation", () => {
  const context = createContext();
  let trashed = false;
  context.Utilities.newBlob = () => ({
    getAs: () => ({
      setName: () => ({})
    })
  });
  context.getInvoiceDateTime = () => "2026-07-28 12:00:00";
  context.DriveApp = {
    Access: { ANYONE_WITH_LINK: "anyone" },
    Permission: { VIEW: "view" },
    createFile: () => ({
      setSharing: () => { throw new Error("simulated sharing failure"); },
      setTrashed: value => { trashed = value; },
      getId: () => "orphan-pdf"
    })
  };
  assert.throws(() => context.createInvoicePdf({}), /simulated sharing failure/);
  assert.equal(trashed, true);
});

let failures = 0;
for (const entry of tests) {
  try {
    entry.run();
    console.log(`✓ ${entry.name}`);
  } catch (error) {
    failures += 1;
    console.error(`✗ ${entry.name}`);
    console.error(error.stack || error);
  }
}

if (failures) process.exitCode = 1;
else console.log(`\n${tests.length} inventory workflow tests passed.`);
