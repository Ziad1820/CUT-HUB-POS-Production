const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const backendPath = path.join(root, "scripts", "app-script-final-owner-access.js");
const backendSource = fs.readFileSync(backendPath, "utf8");
const STAGING_ID = "1tSMYYSNivpNTOJOuKMBVCoE7NKdr3VCzpCgOulcIsoI";

function createSheet(name, initialHeaders = []) {
  const rows = [[...initialHeaders]];
  let maxColumns = Math.max(1, initialHeaders.length);
  let writes = 0;
  return {
    getName: () => name,
    getLastColumn: () => rows[0].reduce(
      (last, value, index) => String(value || "").trim() ? index + 1 : last,
      0
    ),
    getMaxColumns: () => maxColumns,
    insertColumnsAfter: (_after, count) => {
      maxColumns += count;
      while (rows[0].length < maxColumns) rows[0].push("");
      writes += 1;
    },
    getRange: (row, column, rowCount, columnCount) => ({
      getValues: () => Array.from({ length: rowCount }, (_, rowOffset) =>
        Array.from({ length: columnCount }, (_, columnOffset) =>
          rows[row - 1 + rowOffset]?.[column - 1 + columnOffset] ?? ""
        )
      ),
      setValues: (values) => {
        writes += 1;
        values.forEach((sourceRow, rowOffset) => {
          if (!rows[row - 1 + rowOffset]) rows[row - 1 + rowOffset] = [];
          sourceRow.forEach((value, columnOffset) => {
            rows[row - 1 + rowOffset][column - 1 + columnOffset] = value;
          });
        });
      }
    }),
    writeCount: () => writes,
    headers: () => [...rows[0]]
  };
}

function createHarness(options = {}) {
  const properties = { ...(options.properties || {}) };
  const logs = [];
  const sheets = new Map();
  (options.sheets || []).forEach((sheet) => sheets.set(sheet.getName(), sheet));
  let insertCount = 0;
  const spreadsheet = options.noActiveSpreadsheet ? null : {
    getId: () => options.activeSpreadsheetId || STAGING_ID,
    getName: () => options.spreadsheetName || "TEST CUT HUB POS",
    getSpreadsheetTimeZone: () => options.timezone || "Africa/Cairo",
    getSheetByName: (name) => sheets.get(name) || null,
    insertSheet: (name) => {
      insertCount += 1;
      const sheet = createSheet(name);
      sheets.set(name, sheet);
      return sheet;
    }
  };
  const context = {
    console,
    Date,
    JSON,
    Number,
    String,
    Set,
    Map,
    Math,
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (name) => properties[name] ?? null
      })
    },
    SpreadsheetApp: {
      getActive: () => spreadsheet
    },
    Logger: {
      log: (value) => logs.push(value)
    },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: (value) => ({
        value,
        setMimeType() {
          return this;
        }
      })
    }
  };
  vm.createContext(context);
  vm.runInContext(backendSource, context, { filename: backendPath });
  return {
    context,
    properties,
    spreadsheet,
    sheets,
    logs,
    insertCount: () => insertCount
  };
}

function stagingProperties(overrides = {}) {
  return {
    CUT_HUB_ENVIRONMENT: "staging",
    CUT_HUB_SPREADSHEET_ID: STAGING_ID,
    CUT_HUB_BACKEND_VERSION: "test-version",
    ...overrides
  };
}

function outputJson(output) {
  return JSON.parse(output.value);
}

const tests = [];
function test(name, run) {
  tests.push({ name, run });
}

test("correct staging configuration succeeds", () => {
  const { context } = createHarness({ properties: stagingProperties() });
  const result = context.assertStagingEnvironment();
  assert.equal(result.config.environment, "staging");
  assert.equal(result.spreadsheet.getId(), STAGING_ID);
});

test("wrong active or configured spreadsheet ID fails closed", () => {
  const wrongActive = createHarness({
    properties: stagingProperties(),
    activeSpreadsheetId: "wrong-active-id"
  });
  assert.throws(
    () => wrongActive.context.assertStagingEnvironment(),
    (error) => error.message === "STAGING_CONFIGURATION_INVALID"
  );

  const wrongConfigured = createHarness({
    properties: stagingProperties({ CUT_HUB_SPREADSHEET_ID: "wrong-configured-id" }),
    activeSpreadsheetId: "wrong-configured-id"
  });
  assert.throws(
    () => wrongConfigured.context.assertStagingEnvironment(),
    (error) => error.message === "STAGING_CONFIGURATION_INVALID"
  );
});

test("missing and wrong environments fail for staging-only functions", () => {
  const missing = createHarness({ properties: {} });
  assert.throws(
    () => missing.context.verifyStagingEnvironment(),
    (error) => error.message === "STAGING_CONFIGURATION_INVALID"
  );

  const production = createHarness({
    properties: stagingProperties({ CUT_HUB_ENVIRONMENT: "production" })
  });
  assert.throws(
    () => production.context.initializeBookingStagingEnvironment(),
    (error) => error.message === "STAGING_CONFIGURATION_INVALID"
  );
});

test("verifyStagingEnvironment is read-only and logs only its returned identity", () => {
  const bookings = createSheet("Bookings", ["ID"]);
  const { context, logs, insertCount } = createHarness({
    properties: stagingProperties(),
    sheets: [bookings]
  });
  const result = context.verifyStagingEnvironment();
  assert.deepEqual(
    JSON.parse(JSON.stringify(result)),
    {
      environment: "staging",
      spreadsheetName: "TEST CUT HUB POS",
      spreadsheetId: STAGING_ID,
      timezone: "Africa/Cairo",
      backendVersion: "test-version"
    }
  );
  assert.equal(bookings.writeCount(), 0);
  assert.equal(insertCount(), 0);
  assert.deepEqual(JSON.parse(logs[0]), JSON.parse(JSON.stringify(result)));
});

test("initializeBookingStagingEnvironment is idempotent", () => {
  const bookings = createSheet("Bookings", ["ID"]);
  const harness = createHarness({
    properties: stagingProperties(),
    sheets: [bookings]
  });
  const first = harness.context.initializeBookingStagingEnvironment();
  const firstWrites = [...harness.sheets.values()]
    .reduce((total, sheet) => total + sheet.writeCount(), 0);
  const second = harness.context.initializeBookingStagingEnvironment();
  const secondWrites = [...harness.sheets.values()]
    .reduce((total, sheet) => total + sheet.writeCount(), 0);

  assert.equal(harness.insertCount(), 2);
  assert.deepEqual(
    Array.from(harness.sheets.keys()).sort(),
    ["BARBER_SCHEDULE", "BOOKING_RATINGS", "Bookings"].sort()
  );
  assert.equal(secondWrites, firstWrites);
  assert.deepEqual(JSON.parse(JSON.stringify(second)), JSON.parse(JSON.stringify(first)));
  assert.deepEqual(
    JSON.parse(JSON.stringify(first.sheets)),
    [
    { name: "Bookings", headerCount: 37 },
      { name: "BOOKING_RATINGS", headerCount: 13 },
      { name: "BARBER_SCHEDULE", headerCount: 8 }
    ]
  );
});

test("stagingIdentity exposes exactly the allowed fields", () => {
  const { context } = createHarness({ properties: stagingProperties() });
  const result = outputJson(context.stagingIdentity());
  assert.deepEqual(
    Object.keys(result).sort(),
    ["backendVersion", "environment", "spreadsheetId", "spreadsheetName", "timezone"].sort()
  );
  assert.equal(result.environment, "staging");
  assert.equal(result.spreadsheetId, STAGING_ID);
});

test("stagingIdentity is unavailable outside staging", () => {
  for (const environment of ["", "production"]) {
    const { context } = createHarness({
      properties: stagingProperties({ CUT_HUB_ENVIRONMENT: environment })
    });
    const result = outputJson(context.stagingIdentity());
    assert.equal(result.status, "error");
    assert.equal(result.code, "PERMISSION_DENIED");
    assert.equal(Object.prototype.hasOwnProperty.call(result, "spreadsheetId"), false);
  }
});

test("doPost enforces staging identity and preserves production and unset routing", () => {
  const staging = createHarness({ properties: stagingProperties() });
  const identity = outputJson(staging.context.doPost({
    postData: {
      type: "application/json",
      contents: "{\"action\":\"stagingIdentity\"}"
    }
  }));
  assert.equal(identity.spreadsheetId, STAGING_ID);

  const invalidStaging = createHarness({
    properties: stagingProperties(),
    activeSpreadsheetId: "wrong-id"
  });
  const rejected = outputJson(invalidStaging.context.doPost({
    postData: { contents: JSON.stringify({ action: "stagingIdentity" }) }
  }));
  assert.equal(rejected.code, "STAGING_CONFIGURATION_INVALID");

  for (const environment of ["production", ""]) {
    const harness = createHarness({
      properties: stagingProperties({ CUT_HUB_ENVIRONMENT: environment }),
      noActiveSpreadsheet: true
    });
    harness.context.getTotalIncome = () => ({ status: "success", total: 42 });
    harness.context.jsonOutput = (value) => value;
    const result = harness.context.doPost({
      postData: { contents: JSON.stringify({ action: "totalIncome" }) }
    });
    assert.deepEqual(JSON.parse(JSON.stringify(result)), { status: "success", total: 42 });
  }
});

test("doPost accepts original JSON stagingIdentity requests and contains parse failures", () => {
  const staging = createHarness({ properties: stagingProperties() });
  const original = outputJson(staging.context.doPost({
    postData: {
      type: "application/json",
      contents: "{\"action\":\"stagingIdentity\"}"
    }
  }));
  assert.equal(original.environment, "staging");
  assert.equal(original.spreadsheetId, STAGING_ID);

  const malformed = outputJson(staging.context.doPost({
    postData: {
      type: "application/json",
      contents: "{'action':'stagingIdentity'}"
    }
  }));
  assert.deepEqual(
    JSON.parse(JSON.stringify(malformed)),
    {
      status: "error",
      code: "INVALID_JSON_REQUEST",
      message: "The request body must be a valid JSON object."
    }
  );
});

let failures = 0;
for (const entry of tests) {
  try {
    entry.run();
    console.log(`PASS ${entry.name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${entry.name}`);
    console.error(error.stack || error);
  }
}

if (failures) process.exitCode = 1;
else console.log(`\n${tests.length} staging environment tests passed.`);
