"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const backendPath = path.join(root, "scripts", "app-script-final-owner-access.js");
const source = fs.readFileSync(backendPath, "utf8");

const WRITE_METHODS = [
  "setValue", "setValues", "appendRow", "insertColumn", "insertColumns",
  "insertColumnAfter", "insertColumnsAfter", "insertColumnsBefore",
  "insertRow", "insertRows", "insertRowAfter", "insertRowBefore",
  "insertRowsAfter", "insertRowsBefore", "clear", "clearContent",
  "deleteRow", "deleteRows", "deleteColumn", "deleteColumns", "insertSheet", "deleteSheet"
];

function makeCounter() {
  return Object.fromEntries(WRITE_METHODS.map((name) => [name, 0]));
}

function totalWrites(counter) {
  return Object.values(counter).reduce((sum, value) => sum + value, 0);
}

function memorySheet(name, rows, counter, minimumColumns) {
  const values = (rows || []).map((row) => [...row]);
  if (!values.length) values.push([]);
  let maxColumns = Math.max(minimumColumns || 0, ...values.map((row) => row.length), 1);
  const ensureCell = (row, column) => {
    while (values.length <= row) values.push([]);
    while (values[row].length <= column) values[row].push("");
  };
  const write = (method) => { counter[method] += 1; };
  return {
    _counter: counter,
    getName: () => name,
    getMaxColumns: () => maxColumns,
    getLastColumn: () => values.reduce((last, row) => {
      for (let index = row.length - 1; index >= 0; index -= 1) {
        if (String(row[index] ?? "").trim()) return Math.max(last, index + 1);
      }
      return last;
    }, 0),
    getLastRow: () => values.reduce((last, row, index) =>
      row.some((value) => String(value ?? "").trim()) ? index + 1 : last, 0),
    getRange: (startRow, startColumn, rowCount = 1, columnCount = 1) => ({
      getValue: () => values[startRow - 1]?.[startColumn - 1] ?? "",
      getValues: () => Array.from({ length: rowCount }, (_, rowOffset) =>
        Array.from({ length: columnCount }, (_, columnOffset) =>
          values[startRow - 1 + rowOffset]?.[startColumn - 1 + columnOffset] ?? "")),
      getDisplayValues: () => Array.from({ length: rowCount }, (_, rowOffset) =>
        Array.from({ length: columnCount }, (_, columnOffset) =>
          String(values[startRow - 1 + rowOffset]?.[startColumn - 1 + columnOffset] ?? ""))),
      setValue: (value) => {
        write("setValue");
        ensureCell(startRow - 1, startColumn - 1);
        values[startRow - 1][startColumn - 1] = value;
      },
      setValues: (nextRows) => {
        write("setValues");
        nextRows.forEach((row, rowOffset) => row.forEach((value, columnOffset) => {
          ensureCell(startRow - 1 + rowOffset, startColumn - 1 + columnOffset);
          values[startRow - 1 + rowOffset][startColumn - 1 + columnOffset] = value;
        }));
      },
      clear: () => write("clear"),
      clearContent: () => write("clearContent")
    }),
    appendRow: (row) => { write("appendRow"); values.push([...row]); },
    insertColumn: () => write("insertColumn"),
    insertColumns: () => write("insertColumns"),
    insertColumnAfter: () => write("insertColumnAfter"),
    insertColumnsBefore: () => write("insertColumnsBefore"),
    insertColumnsAfter: (_after, count) => {
      write("insertColumnsAfter");
      maxColumns += count;
      values.forEach((row) => { while (row.length < maxColumns) row.push(""); });
    },
    insertRow: () => write("insertRow"),
    insertRows: () => write("insertRows"),
    insertRowAfter: () => write("insertRowAfter"),
    insertRowBefore: () => write("insertRowBefore"),
    insertRowsAfter: () => write("insertRowsAfter"),
    insertRowsBefore: () => write("insertRowsBefore"),
    deleteRow: () => write("deleteRow"),
    deleteRows: () => write("deleteRows"),
    deleteColumn: () => write("deleteColumn"),
    deleteColumns: () => write("deleteColumns"),
    _rows: values
  };
}

function workbook(sheets, counter) {
  const byName = new Map(Object.entries(sheets || {}));
  return {
    _counter: counter,
    getSheetByName: (name) => byName.get(name) || null,
    insertSheet: (name) => {
      counter.insertSheet += 1;
      const sheet = memorySheet(name, [[]], counter);
      byName.set(name, sheet);
      return sheet;
    },
    deleteSheet: (sheet) => {
      counter.deleteSheet += 1;
      if (sheet && typeof sheet.getName === "function") byName.delete(sheet.getName());
    },
    getId: () => "local-spreadsheet"
  };
}

function createContext(sheets = {}) {
  const suppliedCounters = Object.values(sheets)
    .map((sheet) => sheet && sheet._counter)
    .filter(Boolean);
  const counter = suppliedCounters[0] || makeCounter();
  suppliedCounters.forEach((sheetCounter) => {
    assert.equal(sheetCounter, counter, "all sheets must share one authoritative write counter");
  });
  const book = workbook(sheets, counter);
  const session = JSON.stringify({
    username: "owner", expiresAt: "2099-01-01T00:00:00.000Z"
  });
  const cache = { get: () => session, put: () => {}, remove: () => {} };
  const properties = {
    getProperty: () => session,
    getProperties: () => ({}),
    setProperty: () => {},
    deleteProperty: () => {}
  };
  const context = {
    console, Date, JSON, Math, Number, Object, String, Set, Map,
    SpreadsheetApp: { getActive: () => book, flush: () => {} },
    CacheService: { getScriptCache: () => cache },
    PropertiesService: { getScriptProperties: () => properties },
    Utilities: {
      getUuid: () => "uuid",
      formatDate: (_value, _zone, format) => {
        if (format === "yyyy-MM-dd") return "2099-01-02";
        if (format === "HH:mm") return "10:00";
        if (format === "EEEE") return "Wednesday";
        if (format === "yyyy-MM") return "2099-01";
        return "2099-01-02 10:00:00";
      },
      computeDigest: () => [1, 2, 3],
      DigestAlgorithm: { SHA_256: "SHA_256" },
      Charset: { UTF_8: "UTF_8" }
    },
    Logger: { log: () => {} }
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: backendPath });
  context.jsonOutput = (value) => value;
  return { context, counter, book };
}

function constant(context, expression) {
  return vm.runInContext(expression, context);
}

test("authoritative write harness observes range, sheet, and workbook mutations", () => {
  const counter = makeCounter();
  const sheet = memorySheet("SELF_CHECK", [["HEADER"]], counter, 1);
  const book = workbook({ SELF_CHECK: sheet }, counter);
  sheet.getRange(1, 1).setValue("value");
  sheet.getRange(1, 1).setValues([["value"]]);
  sheet.insertColumnsAfter(1, 1);
  sheet.insertColumnsBefore(1, 1);
  sheet.insertRowsAfter(1, 1);
  sheet.getRange(1, 1).clearContent();
  const created = book.insertSheet("CREATED_BY_SELF_CHECK");
  created.getRange(1, 1).setValue("nested workbook sheet write");
  book.deleteSheet(created);
  [
    "setValue", "setValues", "insertColumnsAfter", "insertColumnsBefore",
    "insertRowsAfter", "clearContent", "insertSheet", "deleteSheet"
  ].forEach((method) => assert.equal(
    counter[method], method === "setValue" ? 2 : 1, `${method} must be observed`));
  assert.equal(totalWrites(counter), 9);
});

test("empty-workbook context exposes all workbook and nested writes through its returned counter", () => {
  const { context, counter } = createContext();
  const book = context.SpreadsheetApp.getActive();
  const inserted = book.insertSheet("TEST");
  inserted.getRange(1, 1).setValue("nested write");
  book.deleteSheet(inserted);
  assert.equal(counter.insertSheet, 1);
  assert.equal(counter.setValue, 1);
  assert.equal(counter.deleteSheet, 1);
  assert.equal(totalWrites(counter), 3);
});

const INVOICE_HEADERS = [
  "date", "name", "phone", "services", "pdf", "total", "paid amount",
  "tip amount", "payment", "barber", "notes", "discount percent", "discount amount"
];
const USERS_HEADERS = [
  "USERNAME", "PASSWORD", "DISPLAY_NAME", "PERMISSIONS", "CREATED_AT", "PASSWORD_HASH"
];

function invoiceSheet(headers, counter) {
  return memorySheet("DATA", [headers, [
    "2099-01-02", "Customer", "01000000000", "Haircut", "pdf", 100, 100,
    0, "cash", "Barber", "", 0, 0
  ]], counter, headers.length);
}

function usersSheet(headers, counter) {
  return memorySheet("USERS", [headers, [
    "owner", "", "Owner", "*", "2099-01-01", "hash"
  ]], counter, headers.length);
}

test("getInvoices reads a correct schema with zero authoritative Spreadsheet writes", () => {
  const counter = makeCounter();
  const data = invoiceSheet(INVOICE_HEADERS, counter);
  const { context, counter: authoritativeCounter } = createContext({ DATA: data });
  assert.equal(authoritativeCounter, counter);
  const result = context.getInvoices({});
  assert.equal(result.status, "success");
  assert.equal(result.invoices.length, 1);
  assert.equal(totalWrites(authoritativeCounter), 0);
});

test("getInvoices reports a missing DATA schema without creating the sheet", () => {
  const { context, counter } = createContext();
  const result = context.getInvoices({});
  assert.equal(result.status, "error");
  assert.equal(result.code, "INVOICE_SCHEMA_NOT_READY");
  assert.equal(totalWrites(counter), 0);
});

for (const fixture of [
  { name: "missing", code: "INVOICE_SCHEMA_INCOMPATIBLE", headers: INVOICE_HEADERS.map((v, i) => i === 6 ? "" : v) },
  { name: "displaced", code: "INVOICE_SCHEMA_INCOMPATIBLE", headers: INVOICE_HEADERS.map((v, i) => i === 5 ? INVOICE_HEADERS[6] : i === 6 ? INVOICE_HEADERS[5] : v) },
  { name: "duplicate", code: "INVOICE_SCHEMA_DUPLICATE_HEADERS", headers: [...INVOICE_HEADERS, "total"] }
]) {
  test(`getInvoices ${fixture.name} schema fails explicitly with zero writes`, () => {
    const counter = makeCounter();
    const data = invoiceSheet(fixture.headers, counter);
    const { context, counter: authoritativeCounter } = createContext({ DATA: data });
    assert.equal(authoritativeCounter, counter);
    const result = context.getInvoices({});
    assert.equal(result.status, "error");
    assert.equal(result.code, fixture.code);
    assert.equal(totalWrites(authoritativeCounter), 0);
  });
}

test("getInvoices rejects distinct accepted aliases for one field with zero writes", () => {
  const counter = makeCounter();
  const data = invoiceSheet([...INVOICE_HEADERS, "customer"], counter);
  const { context, counter: authoritativeCounter } = createContext({ DATA: data });
  assert.equal(authoritativeCounter, counter);
  const result = context.getInvoices({});
  assert.equal(result.status, "error");
  assert.equal(result.code, "INVOICE_SCHEMA_DUPLICATE_HEADERS");
  assert.equal(totalWrites(authoritativeCounter), 0);
});

test("USERS authentication and reads accept the exact schema with zero schema writes", () => {
  const counter = makeCounter();
  const users = usersSheet(USERS_HEADERS, counter);
  const { context, counter: authoritativeCounter } = createContext({ USERS: users });
  assert.equal(authoritativeCounter, counter);
  assert.equal(context.readUsersFromSheet().length, 1);
  assert.equal(context.getAuthenticatedUser({ sessionToken: "valid" }).username, "owner");
  assert.equal(totalWrites(authoritativeCounter), 0);
});

for (const fixture of [
  { name: "missing", code: "USERS_SCHEMA_INCOMPATIBLE", headers: USERS_HEADERS.slice(0, 5) },
  { name: "displaced", code: "USERS_SCHEMA_INCOMPATIBLE", headers: [USERS_HEADERS[1], USERS_HEADERS[0], ...USERS_HEADERS.slice(2)] },
  { name: "duplicate", code: "USERS_SCHEMA_DUPLICATE_HEADERS", headers: [...USERS_HEADERS, "USERNAME"] }
]) {
  test(`USERS ${fixture.name} schema fails closed with zero writes`, () => {
    const counter = makeCounter();
    const users = usersSheet(fixture.headers, counter);
    const { context, counter: authoritativeCounter } = createContext({ USERS: users });
    assert.equal(authoritativeCounter, counter);
    assert.throws(() => context.readUsersFromSheet(), (error) => error.code === fixture.code);
    assert.equal(totalWrites(authoritativeCounter), 0);
  });
}

test("public login maps every USERS schema failure to one generic response", () => {
  const expected = {
    status: "error",
    code: "AUTHENTICATION_SERVICE_UNAVAILABLE",
    message: "Authentication service is temporarily unavailable."
  };
  const fixtures = [
    { name: "missing", build: () => ({}) },
    { name: "incomplete", build: (counter) => ({
      USERS: memorySheet("USERS", [USERS_HEADERS.slice(0, 5)], counter, 5)
    }) },
    { name: "displaced", build: (counter) => ({
      USERS: usersSheet([USERS_HEADERS[1], USERS_HEADERS[0], ...USERS_HEADERS.slice(2)], counter)
    }) },
    { name: "duplicate", build: (counter) => ({
      USERS: usersSheet([...USERS_HEADERS, "USERNAME"], counter)
    }) }
  ];
  fixtures.forEach((fixture) => {
    const fixtureCounter = makeCounter();
    const { context, counter } = createContext(fixture.build(fixtureCounter));
    if (fixture.name !== "missing") assert.equal(counter, fixtureCounter);
    const result = context.loginUser({ username: "unknown", password: "invalid" });
    assert.deepEqual(JSON.parse(JSON.stringify(result)), expected, fixture.name);
    assert.doesNotMatch(result.message, /USERS|sheet|header|column|schema|duplicate|displaced/i);
    assert.equal(counter.insertSheet, 0);
    assert.equal(totalWrites(counter), 0);
  });
});

test("public login preserves correct-schema success and invalid-credential behavior", () => {
  const counter = makeCounter();
  const users = memorySheet("USERS", [USERS_HEADERS, [
    "owner", "", "Owner", "*", "2099-01-01", "010203"
  ]], counter, USERS_HEADERS.length);
  const { context, counter: authoritativeCounter } = createContext({ USERS: users });
  assert.equal(authoritativeCounter, counter);
  const success = context.loginUser({ username: "owner", password: "secret" });
  assert.equal(success.status, "success");
  assert.equal(success.user.username, "owner");
  const rejected = context.loginUser({ username: "unknown", password: "invalid" });
  assert.equal(rejected.status, "error");
  assert.equal(rejected.message, "Invalid username or password.");
  assert.equal(Object.prototype.hasOwnProperty.call(rejected, "code"), false);
  assert.equal(totalWrites(authoritativeCounter), 0);
});

test("missing-token protected routing remains fail-closed without a fallback actor", () => {
  const { context, counter } = createContext();
  let handlerCalls = 0;
  context.validateCutHubRequestEnvironment = () => {};
  context.getServices = () => { handlerCalls += 1; return { status: "success" }; };
  const result = context.doPost({
    postData: { contents: JSON.stringify({
      action: "getServices", username: "owner", role: "owner", permissions: ["*"]
    }) }
  });
  assert.equal(result.status, "error");
  assert.equal(result.authRequired, true);
  assert.equal(result.sessionExpired, true);
  assert.equal(handlerCalls, 0);
  assert.equal(totalWrites(counter), 0);
});

test("getStaff reads ATTENDANCE without creating a sheet or rewriting headers", () => {
  const counter = makeCounter();
  const users = usersSheet(USERS_HEADERS, counter);
  const staff = memorySheet("STAFF", [[
    "NAME", "CODE", "SALARY", "PERCENTAGE", "ID", "BONUS", "DEDUCTION",
    "ACTIVE", "CREATED_AT", "UPDATED_AT", "IS_BARBER"
  ], ["Barber", "B1", 1000, 50, "staff-1", 0, 0, true, "", "", true]], counter, 11);
  const bootstrap = createContext({ USERS: users, STAFF: staff });
  const attendanceHeaders = Array.from(constant(bootstrap.context, "ATTENDANCE_HEADERS"));
  const attendance = memorySheet("ATTENDANCE", [attendanceHeaders], counter, attendanceHeaders.length);
  bootstrap.context.SpreadsheetApp = {
    getActive: () => workbook({ USERS: users, STAFF: staff, ATTENDANCE: attendance }, counter),
    flush: () => {}
  };
  const result = bootstrap.context.getStaff();
  assert.equal(result.status, "success");
  assert.equal(bootstrap.counter, counter);
  assert.equal(totalWrites(bootstrap.counter), 0);
});

test("getStaff reports missing ATTENDANCE without sheet creation", () => {
  const counter = makeCounter();
  const users = usersSheet(USERS_HEADERS, counter);
  const staff = memorySheet("STAFF", [["NAME"], ["Barber"]], counter, 11);
  const { context, counter: authoritativeCounter } = createContext({ USERS: users, STAFF: staff });
  assert.equal(authoritativeCounter, counter);
  const result = context.getStaff();
  assert.equal(result.status, "error");
  assert.equal(result.code, "ATTENDANCE_SCHEMA_NOT_READY");
  assert.equal(totalWrites(authoritativeCounter), 0);
});

function bookingRows(context, counter) {
  const headers = Array.from(constant(context, "BOOKING_HEADERS_V2"));
  const row = headers.map(() => "");
  const set = (name, value) => { row[headers.indexOf(name)] = value; };
  set("ID", "booking-1");
  set("DATE", "2099-01-02");
  set("TIME", "12:00");
  set("CUSTOMER", "Customer");
  set("PHONE", "01000001234");
  set("EMPLOYEE", "Barber");
  set("EMPLOYEE_ID", "staff-1");
  set("SERVICE", "Haircut");
  set("STATUS", "done");
  set("TRACKING_TOKEN", "TRACK-1");
  return memorySheet("Bookings", [headers, row], counter, headers.length);
}

test("public booking status and optional rating reads perform zero schema writes", () => {
  const counter = makeCounter();
  const initial = createContext();
  const bookings = bookingRows(initial.context, counter);
  const { context, book, counter: authoritativeCounter } = createContext({ Bookings: bookings });
  assert.equal(authoritativeCounter, counter);
  const status = context.getPublicBookingStatus({ trackingToken: "TRACK-1", phoneLast4: "1234" });
  assert.equal(status.status, "success");
  const rating = context.getBookingRating({ trackingToken: "TRACK-1", phoneLast4: "1234" });
  assert.equal(rating.status, "success");
  assert.equal(rating.rating, null);
  const summary = context.getBarberRatings({ employeeId: "staff-1" });
  assert.equal(summary.status, "success");
  assert.equal(book.getSheetByName("BOOKING_RATINGS"), null);
  assert.equal(authoritativeCounter.insertSheet, 0);
  assert.equal(totalWrites(authoritativeCounter), 0);
});

test("incomplete Booking schema fails explicitly without appending headers", () => {
  const counter = makeCounter();
  const initial = createContext();
  const headers = Array.from(constant(initial.context, "BOOKING_HEADERS_V2"));
  const bookings = memorySheet(
    "Bookings", [headers.filter((header) => header !== "TRACKING_TOKEN")], counter, headers.length);
  const { context, counter: authoritativeCounter } = createContext({ Bookings: bookings });
  assert.equal(authoritativeCounter, counter);
  const result = context.getPublicBookingStatus({ trackingToken: "TRACK-1", phoneLast4: "1234" });
  assert.equal(result.status, "error");
  assert.equal(result.code, "BOOKING_SCHEMA_NOT_READY");
  assert.equal(totalWrites(authoritativeCounter), 0);
});

test("duplicate equivalent Booking field fails explicitly with zero writes", () => {
  const counter = makeCounter();
  const initial = createContext();
  const headers = Array.from(constant(initial.context, "BOOKING_HEADERS_V2"));
  const bookings = memorySheet("Bookings", [[...headers, "BOOKING_ID"]], counter, headers.length + 1);
  const { context, counter: authoritativeCounter } = createContext({ Bookings: bookings });
  assert.equal(authoritativeCounter, counter);
  const result = context.getPublicBookingStatus({ trackingToken: "TRACK-1", phoneLast4: "1234" });
  assert.equal(result.status, "error");
  assert.equal(result.code, "BOOKING_SCHEMA_DUPLICATE_HEADERS");
  assert.equal(totalWrites(authoritativeCounter), 0);
});

test("incomplete rating schema fails explicitly without repair", () => {
  const counter = makeCounter();
  const initial = createContext();
  const bookings = bookingRows(initial.context, counter);
  const ratingHeaders = Array.from(constant(initial.context, "BOOKING_RATING_HEADERS"));
  const ratings = memorySheet(
    "BOOKING_RATINGS", [ratingHeaders.slice(0, -1)], counter, ratingHeaders.length);
  const { context, counter: authoritativeCounter } = createContext({ Bookings: bookings, BOOKING_RATINGS: ratings });
  assert.equal(authoritativeCounter, counter);
  const result = context.getBarberRatings({ employeeId: "staff-1" });
  assert.equal(result.status, "error");
  assert.equal(result.code, "BOOKING_RATINGS_SCHEMA_NOT_READY");
  assert.equal(totalWrites(authoritativeCounter), 0);
});

test("duplicate equivalent BOOKING_RATINGS field fails explicitly with zero writes", () => {
  const counter = makeCounter();
  const initial = createContext();
  const bookings = bookingRows(initial.context, counter);
  const headers = Array.from(constant(initial.context, "BOOKING_RATING_HEADERS"));
  const ratings = memorySheet(
    "BOOKING_RATINGS", [[...headers, "RATING ID"]], counter, headers.length + 1);
  const { context, counter: authoritativeCounter } = createContext({ Bookings: bookings, BOOKING_RATINGS: ratings });
  assert.equal(authoritativeCounter, counter);
  const result = context.getBarberRatings({ employeeId: "staff-1" });
  assert.equal(result.status, "error");
  assert.equal(result.code, "BOOKING_RATINGS_SCHEMA_DUPLICATE_HEADERS");
  assert.equal(totalWrites(authoritativeCounter), 0);
});

test("public booking options use read-only Booking, rating, schedule, and Attendance access", () => {
  const counter = makeCounter();
  const initial = createContext();
  const bookings = bookingRows(initial.context, counter);
  const scheduleHeaders = Array.from(constant(initial.context, "BARBER_SCHEDULE_HEADERS"));
  const attendanceHeaders = Array.from(constant(initial.context, "ATTENDANCE_HEADERS"));
  const staff = memorySheet("STAFF", [[
    "NAME", "CODE", "SALARY", "PERCENTAGE", "ID", "BONUS", "DEDUCTION",
    "ACTIVE", "CREATED_AT", "UPDATED_AT", "IS_BARBER"
  ], ["Barber", "B1", 0, 0, "staff-1", 0, 0, true, "", "", true]], counter, 11);
  const schedule = memorySheet("BARBER_SCHEDULE", [scheduleHeaders, [
    "schedule-1", "staff-1", "Barber", "wednesday", "12:00", "18:00", true, ""
  ]], counter, scheduleHeaders.length);
  const attendance = memorySheet("ATTENDANCE", [attendanceHeaders], counter, attendanceHeaders.length);
  const { context, book, counter: authoritativeCounter } = createContext({
    Bookings: bookings, STAFF: staff, BARBER_SCHEDULE: schedule, ATTENDANCE: attendance
  });
  assert.equal(authoritativeCounter, counter);
  context.publicBookingServices = () => [];
  context.bookingAvailabilityEngineMode = () => "LEGACY";
  const result = context.getPublicBookingOptions({ date: "2099-01-02" });
  assert.equal(result.status, "success");
  assert.equal(book.getSheetByName("BOOKING_RATINGS"), null);
  assert.equal(authoritativeCounter.insertSheet, 0);
  assert.equal(totalWrites(authoritativeCounter), 0);
});

test("admin Booking and rating reads use real read-only accessors with zero writes", () => {
  const counter = makeCounter();
  const initial = createContext();
  const bookings = bookingRows(initial.context, counter);
  const ratingHeaders = Array.from(constant(initial.context, "BOOKING_RATING_HEADERS"));
  const ratings = memorySheet("BOOKING_RATINGS", [ratingHeaders], counter, ratingHeaders.length);
  const { context, counter: authoritativeCounter } = createContext({ Bookings: bookings, BOOKING_RATINGS: ratings });
  assert.equal(authoritativeCounter, counter);
  context.requirePermission = () => null;
  const bookingResult = context.getBookingsV2({});
  const ratingResult = context.getRatingsAdmin({});
  assert.equal(bookingResult.status, "success");
  assert.equal(ratingResult.status, "success");
  assert.equal(totalWrites(authoritativeCounter), 0);
});

test("protected router read retains auth behavior but performs zero Spreadsheet schema writes", () => {
  const counter = makeCounter();
  const users = usersSheet(USERS_HEADERS, counter);
  const services = memorySheet("SERVICES", [[
    "ID", "NAME", "PRICE", "DURATION", "ACTIVE", "UPDATED_AT"
  ]], counter, 6);
  const { context, counter: authoritativeCounter } = createContext({ USERS: users, SERVICES: services });
  assert.equal(authoritativeCounter, counter);
  context.validateCutHubRequestEnvironment = () => {};
  const result = context.doPost({
    postData: { contents: JSON.stringify({ action: "getServices", sessionToken: "valid" }) }
  });
  assert.equal(result.status, "success");
  assert.equal(totalWrites(authoritativeCounter), 0);
});

test("protected router surfaces USERS schema drift without repairing it", () => {
  const counter = makeCounter();
  const users = usersSheet(USERS_HEADERS.slice(0, 5), counter);
  const services = memorySheet("SERVICES", [[
    "ID", "NAME", "PRICE", "DURATION", "ACTIVE", "UPDATED_AT"
  ]], counter, 6);
  const { context, counter: authoritativeCounter } = createContext({ USERS: users, SERVICES: services });
  assert.equal(authoritativeCounter, counter);
  context.validateCutHubRequestEnvironment = () => {};
  const result = context.doPost({
    postData: { contents: JSON.stringify({ action: "getServices", sessionToken: "valid" }) }
  });
  assert.equal(result.status, "error");
  assert.equal(result.code, "USERS_SCHEMA_INCOMPATIBLE");
  assert.equal(totalWrites(authoritativeCounter), 0);
});
