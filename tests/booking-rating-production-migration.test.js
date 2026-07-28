const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const migrationPath = path.join(root, "scripts", "booking-rating-production-migration.js");
const migrationSource = fs.readFileSync(migrationPath, "utf8");
const PRODUCTION_ID = "production-spreadsheet-id";

const LEGACY_HEADERS = [
  "ID", "DATE", "TIME", "CUSTOMER", "PHONE", "EMPLOYEE", "SERVICE", "NOTE", "STATUS",
  "CREATED_AT", "UPDATED_AT", "SERVICE_ID", "DURATION_MINUTES", "SOURCE", "TRACKING_TOKEN",
  "REQUESTED_AT", "CONFIRMED_AT", "CONFIRMED_BY", "REJECTION_REASON", "PROPOSED_DATE",
  "PROPOSED_TIME", "HOLD_EXPIRES_AT", "CUSTOMER_RESPONSE", "EMPLOYEE_ID"
];
const APPEND_HEADERS = [
  "CANCELLED_AT", "CANCELLED_BY", "CANCELLATION_REASON", "COMPLETED_AT", "COMPLETED_BY",
  "DELETED", "DELETED_AT", "DELETED_BY", "SERVICE_IDS", "TOTAL_PRICE", "DELETION_REASON",
  "CLIENT_REQUEST_ID", "CLIENT_REQUEST_FINGERPRINT"
];
const RATING_HEADERS = [
  "RATING_ID", "BOOKING_ID", "TRACKING_TOKEN", "EMPLOYEE_ID", "EMPLOYEE_NAME",
  "RATING", "COMMENT", "SERVICE", "BOOKING_DATE", "CREATED_AT", "STATUS",
  "CUSTOMER_PHONE_HASH", "UPDATED_AT"
];
const SCHEDULE_HEADERS = [
  "SCHEDULE_ID", "STAFF_ID", "STAFF_NAME", "WEEKDAY",
  "SHIFT_START", "SHIFT_END", "ACTIVE", "UPDATED_AT"
];

function createSheet(name, headers = [], dataRows = [], options = {}) {
  const rows = [headers.slice(), ...dataRows.map((row) => row.slice())];
  let maxColumns = options.maxColumns || Math.max(1, headers.length);
  let writes = 0;
  return {
    getName: () => name,
    getLastRow: () => {
      let last = 0;
      rows.forEach((row, index) => {
        if (row.some((value) => String(value ?? "") !== "")) last = index + 1;
      });
      return last;
    },
    getLastColumn: () => {
      let last = 0;
      rows.forEach((row) => row.forEach((value, index) => {
        if (String(value ?? "") !== "") last = Math.max(last, index + 1);
      }));
      return last;
    },
    getMaxRows: () => options.maxRows || 1000,
    getMaxColumns: () => maxColumns,
    insertColumnsAfter: (_after, count) => {
      maxColumns += count;
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
          const targetIndex = row - 1 + rowOffset;
          if (!rows[targetIndex]) rows[targetIndex] = [];
          sourceRow.forEach((value, columnOffset) => {
            rows[targetIndex][column - 1 + columnOffset] = value;
          });
        });
      }
    }),
    snapshot: () => JSON.parse(JSON.stringify(rows)),
    headers: () => rows[0].slice(),
    writeCount: () => writes
  };
}

function createHarness(options = {}) {
  const sheets = new Map();
  (options.sheets || []).forEach((sheet) => sheets.set(sheet.getName(), sheet));
  const logs = [];
  let insertCount = 0;
  let lockAcquisitions = 0;
  let lockReleases = 0;
  const spreadsheet = {
    getId: () => options.spreadsheetId || PRODUCTION_ID,
    getName: () => options.spreadsheetName || "CUT HUB POS",
    getSpreadsheetTimeZone: () => options.timezone || "Africa/Cairo",
    getSheets: () => Array.from(sheets.values()),
    getSheetByName: (name) => sheets.get(name) || null,
    insertSheet: (name) => {
      insertCount += 1;
      const sheet = createSheet(name);
      sheets.set(name, sheet);
      return sheet;
    }
  };
  const properties = {
    CUT_HUB_ENVIRONMENT: "production",
    CUT_HUB_SPREADSHEET_ID: PRODUCTION_ID,
    ...(options.properties || {})
  };
  const lock = {
    tryLock: () => {
      lockAcquisitions += 1;
      return options.lockAvailable !== false;
    },
    releaseLock: () => {
      lockReleases += 1;
    }
  };
  const context = {
    console,
    Date,
    Error,
    JSON,
    Math,
    Number,
    String,
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (name) => properties[name] ?? null
      })
    },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => options.noSpreadsheet ? null : spreadsheet,
      getActive: () => options.noSpreadsheet ? null : spreadsheet
    },
    LockService: {
      getScriptLock: () => lock
    },
    Logger: {
      log: (value) => logs.push(value)
    }
  };
  vm.createContext(context);
  vm.runInContext(migrationSource, context, { filename: migrationPath });
  return {
    context,
    spreadsheet,
    sheets,
    logs,
    insertCount: () => insertCount,
    lockAcquisitions: () => lockAcquisitions,
    lockReleases: () => lockReleases
  };
}

function baseProtectedSheets() {
  return [
    createSheet("SERVICES", ["name", "price", "active", "order", "serviceId", "durationMinutes"], [
      ["Haircut", 100, true, 1, "SRV-1", 30]
    ]),
    createSheet("STAFF", ["Staff Name", "Staff ID", "Active"], [["Ahmed", "STAFF-1", true]]),
    createSheet("ATTENDANCE", ["ID", "DATE"], [["ATT-1", "2026-07-29"]]),
    createSheet("USERS", ["username", "password"], [["owner", "redacted"]]),
    createSheet("ACTIVITY_LOG", ["logid", "action"], [["LOG-1", "login"]])
  ];
}

function migratedSheets() {
  return [
    createSheet("Bookings", [...LEGACY_HEADERS, ...APPEND_HEADERS], [
      ["BOOK-1", "2026-08-01", "10:00", "Customer"]
    ]),
    createSheet("BOOKING_RATINGS", RATING_HEADERS),
    createSheet("BARBER_SCHEDULE", SCHEDULE_HEADERS),
    ...baseProtectedSheets()
  ];
}

function snapshots(sheets) {
  return Object.fromEntries(Array.from(sheets.entries()).map(([name, sheet]) => [name, sheet.snapshot()]));
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertSheetSnapshotsEqual(before, sheets, excluded = []) {
  Object.entries(before).forEach(([name, value]) => {
    if (!excluded.includes(name)) assert.deepEqual(sheets.get(name).snapshot(), value, `${name} changed`);
  });
}

const tests = [];
function test(name, run) {
  tests.push({ name, run });
}

test("already migrated production is a no-op", () => {
  const harness = createHarness({ sheets: migratedSheets() });
  const before = snapshots(harness.sheets);
  const result = harness.context.runBookingRatingProductionMigration(false);
  assert.equal(result.status, "success");
  assert.deepEqual(plain(result.createdSheets), []);
  assert.deepEqual(plain(result.addedColumns), []);
  assert.equal(result.rowsModified, 0);
  assert.equal(result.cellsModified, 0);
  assert.equal(harness.insertCount(), 0);
  assertSheetSnapshotsEqual(before, harness.sheets);
});

test("missing BOOKING_RATINGS creates only the exact rating sheet", () => {
  const sheets = migratedSheets().filter((sheet) => sheet.getName() !== "BOOKING_RATINGS");
  const harness = createHarness({ sheets });
  const before = snapshots(harness.sheets);
  const result = harness.context.runBookingRatingProductionMigration(false);
  assert.deepEqual(Array.from(result.createdSheets), ["BOOKING_RATINGS"]);
  assert.deepEqual(harness.sheets.get("BOOKING_RATINGS").headers(), RATING_HEADERS);
  assert.equal(harness.insertCount(), 1);
  assertSheetSnapshotsEqual(before, harness.sheets);
});

test("missing booking upgrade headers are appended without changing existing cells", () => {
  const bookings = createSheet("Bookings", LEGACY_HEADERS, [
    ["BOOK-1", "2026-08-01", "10:00", "Existing Customer"]
  ], { maxColumns: 26 });
  const harness = createHarness({
    sheets: [bookings, createSheet("BOOKING_RATINGS", RATING_HEADERS),
      createSheet("BARBER_SCHEDULE", SCHEDULE_HEADERS), ...baseProtectedSheets()]
  });
  const dataBefore = bookings.snapshot()[1];
  const result = harness.context.runBookingRatingProductionMigration(false);
  assert.deepEqual(bookings.headers(), [...LEGACY_HEADERS, ...APPEND_HEADERS]);
  assert.deepEqual(bookings.snapshot()[1], dataBefore);
  assert.equal(result.addedColumns.length, 1);
  assert.equal(result.addedColumns[0].startColumn, 25);
  assert.equal(result.addedColumns[0].endColumn, 37);
  assert.equal(result.rowsModified, 0);
  assert.equal(result.cellsModified, 13);
});

test("partial booking upgrade headers append only the missing tail", () => {
  const existingUpgrade = APPEND_HEADERS.slice(0, 5);
  const bookings = createSheet("Bookings", [...LEGACY_HEADERS, ...existingUpgrade], [
    ["BOOK-1", "2026-08-01", "10:00", "Existing Customer"]
  ]);
  const harness = createHarness({
    sheets: [bookings, createSheet("BOOKING_RATINGS", RATING_HEADERS),
      createSheet("BARBER_SCHEDULE", SCHEDULE_HEADERS), ...baseProtectedSheets()]
  });
  const result = harness.context.runBookingRatingProductionMigration(false);
  assert.deepEqual(bookings.headers(), [...LEGACY_HEADERS, ...APPEND_HEADERS]);
  assert.deepEqual(
    Array.from(result.addedColumns[0].headers),
    APPEND_HEADERS.slice(existingUpgrade.length)
  );
});

test("dry run reports the complete plan and performs no writes", () => {
  const bookings = createSheet("Bookings", LEGACY_HEADERS, [["BOOK-1"]]);
  const protectedSheets = baseProtectedSheets();
  const harness = createHarness({ sheets: [bookings, ...protectedSheets] });
  const before = snapshots(harness.sheets);
  const result = harness.context.runBookingRatingProductionMigration(true);
  assert.equal(result.status, "dry-run");
  assert.deepEqual(Array.from(result.plannedCreatedSheets).sort(), ["BARBER_SCHEDULE", "BOOKING_RATINGS"]);
  assert.equal(result.plannedAddedColumns.length, 1);
  assert.equal(result.plannedCellsModified, 34);
  assert.deepEqual(plain(result.createdSheets), []);
  assert.deepEqual(plain(result.addedColumns), []);
  assert.equal(result.cellsModified, 0);
  assert.equal(harness.insertCount(), 0);
  assertSheetSnapshotsEqual(before, harness.sheets);
  Array.from(harness.sheets.values()).forEach((sheet) => assert.equal(sheet.writeCount(), 0));
});

test("second execution is idempotent", () => {
  const bookings = createSheet("Bookings", LEGACY_HEADERS, [["BOOK-1"]]);
  const harness = createHarness({ sheets: [bookings, ...baseProtectedSheets()] });
  const first = harness.context.runBookingRatingProductionMigration(false);
  const afterFirst = snapshots(harness.sheets);
  const writesAfterFirst = Array.from(harness.sheets.values())
    .reduce((total, sheet) => total + sheet.writeCount(), 0);
  const second = harness.context.runBookingRatingProductionMigration(false);
  const writesAfterSecond = Array.from(harness.sheets.values())
    .reduce((total, sheet) => total + sheet.writeCount(), 0);
  assert.equal(first.cellsModified, 34);
  assert.equal(second.cellsModified, 0);
  assert.deepEqual(plain(second.createdSheets), []);
  assert.deepEqual(plain(second.addedColumns), []);
  assert.equal(writesAfterSecond, writesAfterFirst);
  assertSheetSnapshotsEqual(afterFirst, harness.sheets);
});

test("legacy booking header aliases are accepted", () => {
  const aliases = LEGACY_HEADERS.map((header) => ({
    ID: "booking_id",
    DATE: "booking date",
    TIME: "booking-time",
    CUSTOMER: "customer_name",
    PHONE: "customer phone",
    EMPLOYEE: "barber",
    SERVICE: "services",
    NOTE: "notes",
    DURATION_MINUTES: "duration",
    TRACKING_TOKEN: "tracking code",
    EMPLOYEE_ID: "staff_id"
  })[header] || header.toLowerCase());
  const bookings = createSheet("Bookings", aliases, [["BOOK-1"]]);
  const harness = createHarness({
    sheets: [bookings, createSheet("BOOKING_RATINGS", RATING_HEADERS),
      createSheet("BARBER_SCHEDULE", SCHEDULE_HEADERS), ...baseProtectedSheets()]
  });
  const result = harness.context.runBookingRatingProductionMigration(false);
  assert.equal(result.addedColumns.length, 1);
  assert.deepEqual(bookings.headers().slice(-APPEND_HEADERS.length), APPEND_HEADERS);
});

test("unexpected booking columns are preserved and reported", () => {
  const headers = [...LEGACY_HEADERS, "PRODUCTION_ONLY_FIELD"];
  const bookings = createSheet("Bookings", headers, [["BOOK-1", ...Array(23).fill(""), "keep-me"]]);
  const harness = createHarness({
    sheets: [bookings, createSheet("BOOKING_RATINGS", RATING_HEADERS),
      createSheet("BARBER_SCHEDULE", SCHEDULE_HEADERS), ...baseProtectedSheets()]
  });
  const result = harness.context.runBookingRatingProductionMigration(false);
  assert.equal(bookings.headers()[24], "PRODUCTION_ONLY_FIELD");
  assert.equal(bookings.snapshot()[1][24], "keep-me");
  assert.deepEqual(bookings.headers().slice(-APPEND_HEADERS.length), APPEND_HEADERS);
  assert.ok(result.warnings.some((warning) => warning.includes("PRODUCTION_ONLY_FIELD")));
});

test("legacy production schema changes only booking headers and the missing ratings sheet", () => {
  const bookings = createSheet("Bookings", LEGACY_HEADERS, [["BOOK-1", "2026-08-01"]]);
  const schedule = createSheet("BARBER_SCHEDULE", SCHEDULE_HEADERS);
  const protectedSheets = baseProtectedSheets();
  const harness = createHarness({ sheets: [bookings, schedule, ...protectedSheets] });
  const before = snapshots(harness.sheets);
  const result = harness.context.runBookingRatingProductionMigration(false);
  assert.deepEqual(plain(result.createdSheets), ["BOOKING_RATINGS"]);
  assert.equal(result.addedColumns.length, 1);
  assertSheetSnapshotsEqual(before, harness.sheets, ["Bookings"]);
  assert.deepEqual(bookings.snapshot()[1], before.Bookings[1]);
  assert.equal(harness.sheets.get("SERVICES").writeCount(), 0);
  assert.equal(harness.sheets.get("STAFF").writeCount(), 0);
  assert.equal(harness.sheets.get("ATTENDANCE").writeCount(), 0);
  assert.equal(harness.sheets.get("USERS").writeCount(), 0);
  assert.equal(harness.sheets.get("ACTIVITY_LOG").writeCount(), 0);
});

test("partial existing ratings or schedule headers fail before any write", () => {
  for (const [name, headers] of [
    ["BOOKING_RATINGS", RATING_HEADERS.slice(0, -1)],
    ["BARBER_SCHEDULE", SCHEDULE_HEADERS.slice(0, -1)]
  ]) {
    const sheets = [
      createSheet("Bookings", LEGACY_HEADERS),
      createSheet("BOOKING_RATINGS", RATING_HEADERS),
      createSheet("BARBER_SCHEDULE", SCHEDULE_HEADERS),
      ...baseProtectedSheets()
    ].filter((sheet) => sheet.getName() !== name);
    sheets.push(createSheet(name, headers));
    const harness = createHarness({ sheets });
    const before = snapshots(harness.sheets);
    assert.throws(
      () => harness.context.runBookingRatingProductionMigration(false),
      (error) => error.code === "PRODUCTION_MIGRATION_SCHEMA_INVALID"
    );
    assert.equal(harness.insertCount(), 0);
    assertSheetSnapshotsEqual(before, harness.sheets);
  }
});

test("configuration mismatch and lock timeout fail closed", () => {
  const productionSheets = migratedSheets();
  const wrongEnvironment = createHarness({
    sheets: productionSheets,
    properties: { CUT_HUB_ENVIRONMENT: "staging" }
  });
  assert.throws(
    () => wrongEnvironment.context.runBookingRatingProductionMigration(true),
    (error) => error.code === "PRODUCTION_MIGRATION_CONFIGURATION_INVALID"
  );
  assert.equal(wrongEnvironment.lockAcquisitions(), 0);

  const wrongSpreadsheet = createHarness({
    sheets: migratedSheets(),
    spreadsheetId: "wrong-active-id"
  });
  assert.throws(
    () => wrongSpreadsheet.context.runBookingRatingProductionMigration(true),
    (error) => error.code === "PRODUCTION_MIGRATION_CONFIGURATION_INVALID"
  );
  assert.equal(wrongSpreadsheet.lockAcquisitions(), 0);

  const locked = createHarness({ sheets: migratedSheets(), lockAvailable: false });
  assert.throws(
    () => locked.context.runBookingRatingProductionMigration(true),
    (error) => error.code === "PRODUCTION_MIGRATION_LOCK_TIMEOUT"
  );
  assert.equal(locked.lockReleases(), 0);
});

test("stale migration plans fail before the first migration write", () => {
  const bookings = createSheet("Bookings", LEGACY_HEADERS, [["BOOK-1"]]);
  const harness = createHarness({
    sheets: [
      bookings,
      createSheet("BOOKING_RATINGS", RATING_HEADERS),
      createSheet("BARBER_SCHEDULE", SCHEDULE_HEADERS),
      ...baseProtectedSheets()
    ]
  });
  const before = harness.context.auditBookingRatingProductionSpreadsheet(harness.spreadsheet);
  const plan = harness.context.planBookingRatingProductionMigration(harness.spreadsheet, before);

  bookings.getRange(1, 1, 1, 1).setValues([["externally-changed-id"]]);
  const stateAfterExternalChange = snapshots(harness.sheets);
  const writesBeforeApply = Array.from(harness.sheets.values())
    .reduce((total, sheet) => total + sheet.writeCount(), 0);

  assert.throws(
    () => harness.context.applyBookingRatingProductionMigration(harness.spreadsheet, plan),
    (error) => error.code === "PRODUCTION_MIGRATION_STATE_CHANGED"
  );
  const writesAfterApply = Array.from(harness.sheets.values())
    .reduce((total, sheet) => total + sheet.writeCount(), 0);
  assert.equal(writesAfterApply, writesBeforeApply);
  assert.equal(harness.insertCount(), 0);
  assertSheetSnapshotsEqual(stateAfterExternalChange, harness.sheets);
});

test("migration report contains audit, verification, and rollback evidence", () => {
  const harness = createHarness({
    sheets: [createSheet("Bookings", LEGACY_HEADERS), ...baseProtectedSheets()]
  });
  const result = harness.context.runBookingRatingProductionMigration(false);
  assert.equal(result.before.spreadsheetId, PRODUCTION_ID);
  assert.equal(result.after.spreadsheetId, PRODUCTION_ID);
  assert.equal(result.before.timezone, "Africa/Cairo");
  assert.ok(result.before.existingTabs.includes("SERVICES"));
  assert.equal(result.after.headers.BOOKING_RATINGS.exists, true);
  assert.deepEqual(plain(result.rollback.createdSheets), ["BOOKING_RATINGS", "BARBER_SCHEDULE"]);
  assert.equal(result.rollback.addedColumns.length, 1);
  assert.equal(result.errors.length, 0);
  assert.ok(result.migrationTimestamp);
  assert.equal(harness.lockAcquisitions(), 1);
  assert.equal(harness.lockReleases(), 1);
  assert.equal(harness.logs.length, 1);
});

let failures = 0;
for (const { name, run } of tests) {
  try {
    run();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}`);
    console.error(error.stack || error);
  }
}

if (failures) {
  console.error(`\n${failures} production migration test(s) failed.`);
  process.exitCode = 1;
} else {
  console.log(`\n${tests.length} production migration tests passed.`);
}
