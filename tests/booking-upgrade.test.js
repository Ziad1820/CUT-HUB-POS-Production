const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "..");
const backendPath = path.join(root, "scripts", "app-script-final-owner-access.js");
const internalPath = path.join(root, "public", "assets", "js", "pages", "bookings.js");
const customerPath = path.join(root, "public", "assets", "js", "pages", "customer-booking.js");
const backendSource = fs.readFileSync(backendPath, "utf8");
const internalSource = fs.readFileSync(internalPath, "utf8");
const customerSource = fs.readFileSync(customerPath, "utf8");

const BOOKING_HEADERS = [
  "ID", "DATE", "TIME", "CUSTOMER", "PHONE", "EMPLOYEE", "SERVICE", "NOTE", "STATUS",
  "CREATED_AT", "UPDATED_AT", "SERVICE_ID", "DURATION_MINUTES", "SOURCE", "TRACKING_TOKEN",
  "REQUESTED_AT", "CONFIRMED_AT", "CONFIRMED_BY", "REJECTION_REASON", "PROPOSED_DATE",
  "PROPOSED_TIME", "HOLD_EXPIRES_AT", "CUSTOMER_RESPONSE", "EMPLOYEE_ID",
  "CANCELLED_AT", "CANCELLED_BY", "CANCELLATION_REASON", "COMPLETED_AT", "COMPLETED_BY",
  "DELETED", "DELETED_AT", "DELETED_BY", "SERVICE_IDS", "TOTAL_PRICE", "DELETION_REASON",
  "CLIENT_REQUEST_ID", "CLIENT_REQUEST_FINGERPRINT"
];

function createContext(options = {}) {
  const uuidValues = [...(options.uuidValues || ["uuid-1", "uuid-2", "uuid-3"])];
  const randomValues = [...(options.randomValues || [0.123456, 0.654321])];
  const sandboxMath = Object.create(Math);
  sandboxMath.random = () => randomValues.length ? randomValues.shift() : 0.999999;
  const context = {
    console, Date, JSON, Number, String, Set, Map, Math: sandboxMath,
    Utilities: {
      getUuid: () => uuidValues.length ? uuidValues.shift() : `uuid-${Date.now()}`,
      DigestAlgorithm: { SHA_256: "sha256" },
      Charset: { UTF_8: "utf8" },
      computeDigest: (_algorithm, value) => Array.from(crypto.createHash("sha256").update(value, "utf8").digest()),
      formatDate: (_date, _zone, format) => {
        if (format === "yyyy-MM-dd") return options.today || "2099-01-01";
        if (format === "HH:mm") return options.nowTime || "10:00";
        if (format === "EEEE") return options.weekday || "Wednesday";
        if (format === "yyyy-MM") return "2099-01";
        return "2099-01-01 10:00:00";
      }
    },
    Logger: { log: () => {} }
  };
  vm.createContext(context);
  vm.runInContext(backendSource, context, { filename: backendPath });
  if (!options.realSheetWriter) {
    context.writeSheetRowWithExplicitValues = (sheet, rowNumber, row) => {
      sheet.getRange(rowNumber, 1, 1, row.length).setValues([row]);
    };
  }
  return context;
}

function memoryHeaderSheet(headers) {
  const rows = [[...headers]];
  let maxColumns = headers.length;
  let inserts = 0;
  return {
    getLastColumn: () => rows[0].reduce((last, value, index) => String(value || "").trim() ? index + 1 : last, 0),
    getMaxColumns: () => maxColumns,
    insertColumnsAfter: (after, count) => {
      assert.equal(after, maxColumns);
      maxColumns += count;
      inserts += 1;
      while (rows[0].length < maxColumns) rows[0].push("");
    },
    getRange: (row, column, rowCount, columnCount) => ({
      getValues: () => Array.from({ length: rowCount }, (_, rowOffset) =>
        Array.from({ length: columnCount }, (_, columnOffset) => rows[row - 1 + rowOffset]?.[column - 1 + columnOffset] ?? "")),
      setValues: (values) => values.forEach((sourceRow, rowOffset) => sourceRow.forEach((value, columnOffset) => {
        if (!rows[row - 1 + rowOffset]) rows[row - 1 + rowOffset] = [];
        rows[row - 1 + rowOffset][column - 1 + columnOffset] = value;
      }))
    }),
    headers: () => rows[0],
    insertCount: () => inserts
  };
}

function createBookingHarness(options = {}) {
  const context = createContext({ uuidValues: options.uuidValues || ["new-id"] });
  const order = [];
  const appended = [];
  const existing = options.existing || [];
  const services = options.services || [
    { serviceId: "svc-1", name: "Haircut", durationMinutes: 30, price: 100 },
    { serviceId: "svc-2", name: "Beard", durationMinutes: 45, price: 80 }
  ];
  const barber = { staffId: "staff-1", name: "Sam" };
  const lock = {
    tryLock: () => {
      order.push("lock");
      return true;
    },
    releaseLock: () => order.push("release")
  };
  const sheet = {
    getLastRow: () => appended.length + 1,
    getLastColumn: () => BOOKING_HEADERS.length,
    getRangeList: () => ({ setNumberFormat: () => {} }),
    getRange: (row) => ({
      setNumberFormat: () => {},
      setValues: (values) => {
        if (row >= 2) {
          order.push("append");
          appended[row - 2] = [...values[0]];
        }
      }
    })
  };
  context.expirePendingBookingsUnderLock = () => order.push("expire");
  context.requirePermission = () => null;
  context.LockService = { getScriptLock: () => lock };
  context.getBookingsSheetV2 = () => {
    order.push("sheet");
    return sheet;
  };
  context.getBookingHeadersV2 = () => BOOKING_HEADERS;
  context.getAllBookingsV2 = () => {
    order.push("reload");
    return existing;
  };
  context.publicBookingServices = () => services;
  context.publicBookingBarbers = () => [barber];
  if (options.realValidation) {
    const realValidator = context.validateBookingAppointmentV2;
    context.getScheduleForBarber = () => options.schedule || ({
      scheduled: true, shiftStart: "12:00", shiftEnd: "18:00"
    });
    context.getAttendanceOverride = () => options.attendance || null;
    context.validateBookingAppointmentV2 = (appointment) => {
      order.push("validate");
      return realValidator(appointment);
    };
  } else {
    context.validateBookingAppointmentV2 = (appointment) => {
      order.push("validate");
      return {
        ok: true, barber, date: appointment.date, time: appointment.time,
        durationMinutes: appointment.durationMinutes
      };
    };
  }
  context.getCairoDateTime = () => "2099-01-01 10:00:00";
  context.SpreadsheetApp = { flush: () => order.push("flush") };
  context.logActivity = () => {};
  context.jsonOutput = (value) => value;
  return { context, order, appended, existing, services, barber };
}

function baseBooking(overrides = {}) {
  return {
    id: "booking-1", date: "2099-01-02", time: "12:00", customerName: "Customer",
    customerPhone: "01012345678", employee: "Sam", employeeId: "staff-1",
    service: "Haircut", serviceId: "svc-1", serviceIds: ["svc-1"], durationMinutes: 30,
    totalPrice: 100, note: "", status: "pending", source: "staff", trackingToken: "",
    createdAt: "2099-01-01 09:00:00", updatedAt: "2099-01-01 09:00:00",
    requestedAt: "", confirmedAt: "", confirmedBy: "", rejectionReason: "",
    proposedDate: "", proposedTime: "", holdExpiresAt: "", customerResponse: "",
    cancelledAt: "", cancelledBy: "", cancellationReason: "", completedAt: "",
    completedBy: "", deleted: false, deletedAt: "", deletedBy: "", deletionReason: "",
    ...overrides
  };
}

function updateHarness(booking) {
  const context = createContext();
  let writes = 0;
  let writtenBooking = null;
  context.expirePendingBookingsUnderLock = () => 0;
  context.requirePermission = () => null;
  context.LockService = { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) };
  context.SpreadsheetApp = { flush: () => {} };
  context.getBookingsSheetV2 = () => ({});
  context.findBookingRowV2 = () => ({ booking, rowNumber: 2, row: [] });
  context.writeBookingRowV2 = (_sheet, _row, value) => {
    writes += 1;
    writtenBooking = value;
  };
  context.getCairoDateTime = () => "2099-01-01 10:00:00";
  context.getActor = () => ({ displayName: "Manager" });
  context.logActivity = () => {};
  context.jsonOutput = (value) => value;
  return { context, writes: () => writes, written: () => writtenBooking };
}

function memoryBookingSheet(context, bookings) {
  const rows = [
    [...BOOKING_HEADERS],
    ...bookings.map((booking) => Array.from(context.bookingToRowV2(booking, BOOKING_HEADERS)))
  ];
  let writes = 0;
  return {
    getLastRow: () => rows.length,
    getLastColumn: () => BOOKING_HEADERS.length,
    getRangeList: () => ({ setNumberFormat: () => {} }),
    getRange: (row, column, rowCount, columnCount) => ({
      setNumberFormat: () => {},
      getValues: () => Array.from({ length: rowCount }, (_, rowOffset) =>
        Array.from({ length: columnCount }, (_, columnOffset) =>
          rows[row - 1 + rowOffset]?.[column - 1 + columnOffset] ?? "")),
      setValues: (values) => {
        writes += 1;
        values.forEach((sourceRow, rowOffset) => sourceRow.forEach((value, columnOffset) => {
          rows[row - 1 + rowOffset][column - 1 + columnOffset] = value;
        }));
      }
    }),
    writes: () => writes,
    rows: () => rows
  };
}

function actualRowUpdateHarness(bookings) {
  const context = createContext();
  const sheet = memoryBookingSheet(context, bookings);
  context.expirePendingBookingsUnderLock = () => 0;
  context.requirePermission = () => null;
  context.LockService = { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) };
  context.SpreadsheetApp = { flush: () => {} };
  context.getBookingsSheetV2 = () => sheet;
  context.getCairoDateTime = () => "2099-01-01 10:00:00";
  context.getActor = () => ({ displayName: "Manager" });
  context.logActivity = () => {};
  context.jsonOutput = (value) => value;
  return { context, sheet };
}

function formulaAwareSheet(headers, dataRows = []) {
  const rows = [[...headers], ...dataRows.map((row) => [...row])];
  const plainTextCells = new Set();
  const formulas = new Set();
  const parseA1 = (a1) => {
    const match = String(a1).match(/^([A-Z]+)(\d+)$/);
    let column = 0;
    for (const char of match[1]) column = column * 26 + char.charCodeAt(0) - 64;
    return { row: Number(match[2]), column };
  };
  const write = (row, column, values) => {
    values.forEach((sourceRow, rowOffset) => sourceRow.forEach((value, columnOffset) => {
      const targetRow = row + rowOffset;
      const targetColumn = column + columnOffset;
      while (rows.length < targetRow) rows.push([]);
      const key = `${targetRow}:${targetColumn}`;
      if (typeof value === "string" && /^[\s]*[=+\-@]/.test(value) && !plainTextCells.has(key)) {
        formulas.add(key);
        rows[targetRow - 1][targetColumn - 1] = 2;
      } else {
        formulas.delete(key);
        rows[targetRow - 1][targetColumn - 1] = value;
      }
    }));
  };
  return {
    getLastRow: () => rows.length,
    getLastColumn: () => headers.length,
    getRangeList: (a1Values) => ({
      setNumberFormat: (format) => {
        assert.equal(format, "@");
        a1Values.map(parseA1).forEach((cell) => plainTextCells.add(`${cell.row}:${cell.column}`));
      }
    }),
    getRange: (row, column, rowCount, columnCount) => {
      if (typeof row === "string") {
        const cell = parseA1(row);
        return { setNumberFormat: () => plainTextCells.add(`${cell.row}:${cell.column}`) };
      }
      return {
        setNumberFormat: () => {},
        getValues: () => Array.from({ length: rowCount }, (_, rowOffset) =>
          Array.from({ length: columnCount }, (_, columnOffset) =>
            rows[row - 1 + rowOffset]?.[column - 1 + columnOffset] ?? "")),
        setValues: (values) => write(row, column, values)
      };
    },
    appendRow: () => { throw new Error("appendRow must not be used"); },
    rows: () => rows,
    formulaCount: () => formulas.size,
    isPlainText: (row, column) => plainTextCells.has(`${row}:${column}`)
  };
}

function statefulCreationHarness() {
  const context = createContext({
    uuidValues: Array.from({ length: 40 }, (_, index) => `uuid-${index + 1}`),
    randomValues: Array.from({ length: 20 }, (_, index) => (index + 1) / 100)
  });
  const sheet = formulaAwareSheet(BOOKING_HEADERS);
  const lockEvents = [];
  context.requirePermission = () => null;
  context.LockService = {
    getScriptLock: () => ({
      tryLock: () => { lockEvents.push("acquire"); return true; },
      releaseLock: () => lockEvents.push("release")
    })
  };
  context.expirePendingBookingsUnderLock = () => 0;
  context.getBookingsSheetV2 = () => sheet;
  context.publicBookingServices = () => [
    { serviceId: "svc-30", name: "Haircut", durationMinutes: 30, price: 100 },
    { serviceId: "svc-75", name: "Long service", durationMinutes: 75, price: 200 }
  ];
  context.publicBookingBarbers = () => [{ staffId: "staff-1", name: "Sam" }];
  context.getScheduleForBarber = () => ({ scheduled: true, shiftStart: "12:00", shiftEnd: "20:00" });
  context.getAttendanceOverride = () => null;
  context.getCairoDateTime = () => "2099-01-01 10:00:00";
  context.SpreadsheetApp = { flush: () => lockEvents.push("flush") };
  context.logActivity = () => {};
  context.jsonOutput = (value) => value;
  return { context, sheet, lockEvents };
}

function creationPayload(kind, overrides = {}) {
  return {
    clientRequestId: `${kind}-request-0001`,
    serviceIds: ["svc-30"],
    employeeId: "staff-1",
    date: "2099-01-02",
    time: "12:00",
    customerName: "Customer",
    customerPhone: "01012345678",
    note: "",
    ...overrides
  };
}

const tests = [];
const test = (name, run) => tests.push({ name, run });

test("status transitions reject invalid, reverse, terminal, and same-state changes", () => {
  const context = createContext();
  assert.equal(context.normalizeBookingStatusV2("completed"), "done");
  assert.equal(context.bookingStatusIsTerminal("completed"), true);
  assert.equal(context.isBookingStatusTransitionAllowed("pending", "done"), false);
  assert.equal(context.isBookingStatusTransitionAllowed("confirmed", "done"), true);
  assert.equal(context.isBookingStatusTransitionAllowed("done", "pending"), false);
  assert.equal(context.isBookingStatusTransitionAllowed("cancelled", "done"), false);
  assert.equal(context.isBookingStatusTransitionAllowed("pending", "pending"), false);
  assert.equal(context.isRecognizedBookingStatusV2("administrator"), false);
});

test("overlap checks use employee IDs and cover the full booking duration", () => {
  const context = createContext();
  const bookings = [{
    id: "existing", date: "2099-01-02", time: "12:00", employee: "Old Name",
    employeeId: "staff-a", durationMinutes: 60, status: "confirmed", deleted: false
  }];
  assert.equal(context.bookingSlotIsFree("staff-a", "New Name", "2099-01-02", "11:30", 30, "", bookings), true);
  assert.equal(context.bookingSlotIsFree("staff-a", "New Name", "2099-01-02", "11:45", 30, "", bookings), false);
  assert.equal(context.bookingSlotIsFree("staff-a", "New Name", "2099-01-02", "12:30", 30, "", bookings), false);
  assert.equal(context.bookingSlotIsFree("staff-b", "Old Name", "2099-01-02", "12:00", 30, "", bookings), true);
});

test("expired holds and soft-deleted bookings never block availability", () => {
  const context = createContext();
  assert.equal(context.bookingBlocksSlot({ status: "expired", deleted: false }), false);
  assert.equal(context.bookingBlocksSlot({ status: "confirmed", deleted: true }), false);
  assert.equal(context.bookingBlocksSlot({
    status: "pending", holdExpiresAt: "2000-01-01T00:00:00.000Z", deleted: false
  }), false);
});

test("proposed bookings block the proposed slot instead of the old slot", () => {
  const context = createContext();
  const bookings = [{
    id: "proposal", date: "2099-01-02", time: "12:00", proposedDate: "2099-01-03",
    proposedTime: "15:00", employee: "Sam", employeeId: "staff-1",
    durationMinutes: 30, status: "proposed", deleted: false
  }];
  assert.equal(context.bookingSlotIsFree("staff-1", "Sam", "2099-01-02", "12:00", 30, "", bookings), true);
  assert.equal(context.bookingSlotIsFree("staff-1", "Sam", "2099-01-03", "15:00", 30, "", bookings), false);
});

test("appointment validation rejects missing schedules, absence, past times, bad grids, and shift overflow", () => {
  const context = createContext({ today: "2099-01-01", nowTime: "10:00" });
  const barber = { staffId: "staff-1", name: "Sam" };
  const options = {
    employeeId: "staff-1", date: "2099-01-02", time: "12:00",
    durationMinutes: 30, bookings: [], barbers: [barber]
  };
  context.getScheduleForBarber = () => ({ scheduled: false, shiftStart: "12:00", shiftEnd: "18:00" });
  context.getAttendanceOverride = () => null;
  assert.equal(context.validateBookingAppointmentV2(options).code, "EMPLOYEE_UNAVAILABLE");

  context.getScheduleForBarber = () => ({ scheduled: true, shiftStart: "12:00", shiftEnd: "18:00" });
  context.getAttendanceOverride = () => ({ unavailable: true });
  assert.equal(context.validateBookingAppointmentV2(options).code, "EMPLOYEE_UNAVAILABLE");

  context.getAttendanceOverride = () => null;
  assert.equal(context.validateBookingAppointmentV2({ ...options, time: "12:15" }).code, "SLOT_UNAVAILABLE");
  assert.equal(context.validateBookingAppointmentV2({ ...options, time: "17:30", durationMinutes: 60 }).code, "SLOT_UNAVAILABLE");
  assert.equal(context.validateBookingAppointmentV2({ ...options, date: "2098-12-31" }).code, "SLOT_UNAVAILABLE");
  assert.equal(context.validateBookingAppointmentV2({ ...options, time: "9:00" }).code, "INVALID_APPOINTMENT");
});

test("same-named employees do not conflict, while renamed employees still conflict by ID", () => {
  const context = createContext();
  context.getScheduleForBarber = () => ({ scheduled: true, shiftStart: "12:00", shiftEnd: "18:00" });
  context.getAttendanceOverride = () => null;
  const occupied = [{
    id: "existing", date: "2099-01-02", time: "12:00", employee: "Same Name",
    employeeId: "staff-a", durationMinutes: 30, status: "confirmed", deleted: false
  }];
  const otherEmployee = context.validateBookingAppointmentV2({
    employeeId: "staff-b", date: "2099-01-02", time: "12:00", durationMinutes: 30,
    bookings: occupied, barbers: [{ staffId: "staff-b", name: "Same Name" }]
  });
  assert.equal(otherEmployee.ok, true);
  const renamedEmployee = context.validateBookingAppointmentV2({
    employeeId: "staff-a", date: "2099-01-02", time: "12:00", durationMinutes: 30,
    bookings: occupied, barbers: [{ staffId: "staff-a", name: "New Name" }]
  });
  assert.equal(renamedEmployee.code, "SLOT_UNAVAILABLE");
});

test("legacy bookings use a name fallback only when one active employee matches", () => {
  const context = createContext();
  const legacyBooking = [{
    id: "legacy", date: "2099-01-02", time: "12:00", employee: "Same Name",
    employeeId: "", durationMinutes: 30, status: "confirmed", deleted: false
  }];
  const duplicateNames = [
    { staffId: "staff-a", name: "Same Name" },
    { staffId: "staff-b", name: "Same Name" }
  ];
  assert.equal(context.bookingSlotIsFree(
    "staff-a", "Same Name", "2099-01-02", "12:00", 30,
    "", legacyBooking, "12:00", duplicateNames
  ), true);
  assert.equal(context.bookingSlotIsFree(
    "staff-b", "Same Name", "2099-01-02", "12:00", 30,
    "", legacyBooking, "12:00", duplicateNames
  ), true);

  const uniqueName = [
    { staffId: "staff-a", name: "Same Name" },
    { staffId: "staff-b", name: "Different Name" }
  ];
  assert.equal(context.bookingSlotIsFree(
    "staff-a", "Same Name", "2099-01-02", "12:00", 30,
    "", legacyBooking, "12:00", uniqueName
  ), false);
});

test("internal creation owns identity and lifecycle fields, reloads under lock, and trusts service records", () => {
  const harness = createBookingHarness({
    uuidValues: ["duplicate", "unique"],
    existing: [{ id: "BOOK-duplicate", trackingToken: "CH-123456" }]
  });
  const result = harness.context.createBookingV2({
    id: "client-id", bookingId: "client-booking-id", status: "done", source: "public",
    trackingToken: "client-token", serviceIds: ["svc-1", "svc-2"],
    durationMinutes: 999, totalPrice: 1, employeeId: "staff-1",
    date: "2099-01-02", time: "12:00", customerName: "=Injected",
    customerPhone: "01012345678", note: "+Injected"
  });
  assert.equal(result.status, "success");
  assert.equal(result.booking.id, "BOOK-unique");
  assert.equal(result.booking.status, "pending");
  assert.equal(result.booking.source, "staff");
  assert.equal(result.booking.trackingToken, "");
  assert.equal(result.booking.durationMinutes, 75);
  assert.equal(result.booking.totalPrice, 180);
  assert.equal(result.booking.customerName, "=Injected");
  assert.equal(result.booking.note, "+Injected");
  assert.ok(harness.order.indexOf("lock") < harness.order.indexOf("reload"));
  assert.ok(harness.order.indexOf("reload") < harness.order.indexOf("validate"));
  assert.ok(harness.order.indexOf("validate") < harness.order.indexOf("append"));
  assert.ok(harness.order.indexOf("append") < harness.order.indexOf("flush"));
  assert.ok(harness.order.indexOf("flush") < harness.order.indexOf("release"));
  assert.ok(harness.order.indexOf("append") < harness.order.indexOf("release"));
});

test("creation rejects empty or unknown services and invalid manual durations", () => {
  const unknown = createBookingHarness();
  const unknownResult = unknown.context.createBookingV2({
    serviceIds: ["missing"], employeeId: "staff-1", date: "2099-01-02", time: "12:00",
    customerName: "Customer", customerPhone: "01012345678"
  });
  assert.equal(unknownResult.status, "error");
  assert.equal(unknown.appended.length, 0);

  const empty = createBookingHarness();
  const emptyResult = empty.context.createBookingV2({
    serviceIds: [], service: "", durationMinutes: 30, employeeId: "staff-1",
    date: "2099-01-02", time: "12:00", customerName: "Customer", customerPhone: "01012345678"
  });
  assert.equal(emptyResult.status, "error");
  assert.equal(empty.appended.length, 0);

  const invalidDuration = createBookingHarness();
  const durationResult = invalidDuration.context.createBookingV2({
    service: "@Manual", durationMinutes: 100000, employeeId: "staff-1",
    date: "2099-01-02", time: "12:00", customerName: "Customer", customerPhone: "01012345678"
  });
  assert.equal(durationResult.status, "error");

  const duplicate = createBookingHarness();
  const duplicateResult = duplicate.context.createBookingV2({
    serviceIds: ["svc-1", "svc-1"], employeeId: "staff-1",
    date: "2099-01-02", time: "12:00", customerName: "Customer",
    customerPhone: "01012345678"
  });
  assert.equal(duplicateResult.code, "INVALID_SERVICES");
  assert.equal(duplicate.appended.length, 0);
});

test("internal creation enforces shift, attendance, past-time, duration, and slot-grid rules", () => {
  const payload = {
    serviceIds: ["svc-1"], employeeId: "staff-1", date: "2099-01-02", time: "12:00",
    customerName: "Customer", customerPhone: "01012345678"
  };

  const outsideShift = createBookingHarness({ realValidation: true });
  assert.equal(outsideShift.context.createBookingV2({ ...payload, time: "11:30" }).code, "SLOT_UNAVAILABLE");
  assert.equal(outsideShift.appended.length, 0);

  const absent = createBookingHarness({ realValidation: true, attendance: { unavailable: true } });
  assert.equal(absent.context.createBookingV2(payload).code, "EMPLOYEE_UNAVAILABLE");
  assert.equal(absent.appended.length, 0);

  const past = createBookingHarness({ realValidation: true });
  assert.equal(past.context.createBookingV2({ ...payload, date: "2098-12-31" }).code, "SLOT_UNAVAILABLE");
  assert.equal(past.appended.length, 0);

  const overflow = createBookingHarness({
    realValidation: true,
    services: [{ serviceId: "svc-1", name: "Long Service", durationMinutes: 60, price: 100 }]
  });
  assert.equal(overflow.context.createBookingV2({ ...payload, time: "17:30" }).code, "SLOT_UNAVAILABLE");
  assert.equal(overflow.appended.length, 0);

  const offGrid = createBookingHarness({ realValidation: true });
  assert.equal(offGrid.context.createBookingV2({ ...payload, time: "12:15" }).code, "SLOT_UNAVAILABLE");
  assert.equal(offGrid.appended.length, 0);
});

test("tracking-token generation retries collisions", () => {
  const context = createContext({ randomValues: [0.123456, 0.654321] });
  assert.equal(
    context.generatePublicBookingTrackingToken([{ trackingToken: "CH-123456" }]),
    "CH-654321"
  );
});

test("public creation retries duplicate server IDs and tracking tokens under its lock", () => {
  const context = createContext({
    uuidValues: ["duplicate", "unique"],
    randomValues: [0.123456, 0.654321]
  });
  const order = [];
  const appended = [];
  const existing = [{ id: "BOOK-duplicate", trackingToken: "CH-123456" }];
  const barber = { staffId: "staff-1", name: "Sam" };
  context.expirePendingBookingsUnderLock = () => 0;
  context.LockService = {
    getScriptLock: () => ({
      tryLock: () => {
        order.push("lock");
        return true;
      },
      releaseLock: () => order.push("release")
    })
  };
  context.publicBookingServices = () => [
    { serviceId: "svc-1", name: "Haircut", durationMinutes: 30, price: 100 }
  ];
  context.publicBookingBarbers = () => [barber];
  context.getAllBookingsV2 = () => {
    order.push("reload");
    return existing;
  };
  context.getScheduleForBarber = () => ({ scheduled: true, shiftStart: "12:00", shiftEnd: "18:00" });
  context.getAttendanceOverride = () => null;
  context.getBookingsSheetV2 = () => ({
    getLastRow: () => appended.length + 1,
    getLastColumn: () => BOOKING_HEADERS.length,
    getRangeList: () => ({ setNumberFormat: () => {} }),
    getRange: (row) => ({
      setNumberFormat: () => {},
      setValues: (values) => {
        order.push("append");
        appended[row - 2] = [...values[0]];
      }
    })
  });
  context.getBookingHeadersV2 = () => BOOKING_HEADERS;
  context.getCairoDateTime = () => "2099-01-01 10:00:00";
  context.SpreadsheetApp = { flush: () => {} };
  context.logActivity = () => {};
  context.jsonOutput = (value) => value;
  const result = context.createPublicBookingRequest({
    id: "client-id", status: "done", source: "staff", trackingToken: "client-token",
    serviceIds: ["svc-1"], employeeId: "staff-1", date: "2099-01-02", time: "12:00",
    customerName: "Customer", customerPhone: "01012345678"
  });
  assert.equal(result.status, "success");
  assert.equal(result.bookingId, "BOOK-unique");
  assert.equal(result.trackingToken, "CH-654321");
  assert.equal(appended[0][BOOKING_HEADERS.indexOf("STATUS")], "pending");
  assert.equal(appended[0][BOOKING_HEADERS.indexOf("SOURCE")], "public");
  assert.ok(order.indexOf("lock") < order.indexOf("reload"));
  assert.ok(order.indexOf("reload") < order.indexOf("append"));
  assert.ok(order.indexOf("append") < order.indexOf("release"));
});

test("booking mutations reject row-only, stale, and mismatched identifiers", () => {
  const rowOnly = actualRowUpdateHarness([baseBooking()]);
  assert.equal(rowOnly.context.updateBookingV2({ rowNumber: 2, note: "changed" }).status, "error");
  assert.equal(rowOnly.sheet.writes(), 0);

  const stale = actualRowUpdateHarness([baseBooking()]);
  assert.equal(stale.context.updateBookingV2({
    rowNumber: 3, id: "booking-1", note: "changed"
  }).status, "error");
  assert.equal(stale.sheet.writes(), 0);

  const mismatch = actualRowUpdateHarness([
    baseBooking({ id: "booking-1" }),
    baseBooking({ id: "booking-2" })
  ]);
  assert.equal(mismatch.context.updateBookingV2({
    rowNumber: 2, id: "booking-2", note: "changed"
  }).status, "error");
  assert.equal(mismatch.sheet.writes(), 0);

  const valid = actualRowUpdateHarness([baseBooking()]);
  const result = valid.context.updateBookingV2({
    rowNumber: 2, id: "booking-1", note: "changed"
  });
  assert.equal(result.status, "success");
  assert.equal(result.booking.note, "changed");
  assert.equal(valid.sheet.writes(), 1);

  const deleteRowOnly = actualRowUpdateHarness([baseBooking()]);
  assert.equal(deleteRowOnly.context.deleteBooking({
    rowNumber: 2, reason: "cleanup"
  }).status, "error");
  assert.equal(deleteRowOnly.sheet.writes(), 0);

  const validDelete = actualRowUpdateHarness([baseBooking()]);
  const deleteResult = validDelete.context.deleteBooking({
    rowNumber: 2, id: "booking-1", reason: "cleanup"
  });
  assert.equal(deleteResult.status, "success");
  assert.equal(deleteResult.booking.deleted, true);
  assert.equal(validDelete.sheet.writes(), 1);
});

test("deleted and terminal bookings are immutable, including terminal same-state requests", () => {
  const deleted = updateHarness(baseBooking({ deleted: true }));
  assert.equal(deleted.context.updateBookingV2({ status: "confirmed" }).code, "BOOKING_DELETED");
  assert.equal(deleted.writes(), 0);

  const completed = updateHarness(baseBooking({ status: "done" }));
  assert.equal(completed.context.updateBookingV2({ status: "done" }).code, "BOOKING_IMMUTABLE");
  assert.equal(completed.writes(), 0);

  const cancelled = updateHarness(baseBooking({ status: "cancelled" }));
  assert.equal(cancelled.context.updateBookingV2({ status: "done" }).code, "BOOKING_IMMUTABLE");
  assert.equal(cancelled.writes(), 0);
});

test("actual completed and done sheet rows are normalized identically and remain immutable", () => {
  ["completed", "done"].forEach((storedStatus) => {
    const harness = actualRowUpdateHarness([baseBooking({ status: storedStatus })]);
    const found = harness.context.findBookingRowV2(harness.sheet, {
      rowNumber: 2, id: "booking-1"
    });
    assert.equal(found.booking.status, "done");
    const result = harness.context.updateBookingV2({
      rowNumber: 2, id: "booking-1", note: "forged edit"
    });
    assert.equal(result.code, "BOOKING_IMMUTABLE");
    assert.equal(harness.sheet.writes(), 0);
  });
});

test("nonterminal same-state requests are explicit no-ops and invalid statuses are rejected", () => {
  const unchanged = updateHarness(baseBooking());
  const result = unchanged.context.updateBookingV2({ status: "pending" });
  assert.equal(result.status, "success");
  assert.equal(result.unchanged, true);
  assert.equal(unchanged.writes(), 0);

  const invalid = updateHarness(baseBooking());
  assert.equal(invalid.context.updateBookingV2({ status: "administrator" }).code, "INVALID_STATUS");
  assert.equal(invalid.writes(), 0);

  const mixed = updateHarness(baseBooking({ status: "confirmed" }));
  assert.equal(mixed.context.updateBookingV2({
    status: "done", date: "2099-01-03", time: "12:00"
  }).code, "INVALID_UPDATE");
  assert.equal(mixed.writes(), 0);

  const hiddenProposal = updateHarness(baseBooking());
  assert.equal(hiddenProposal.context.updateBookingV2({
    status: "pending", proposedDate: "2099-01-03", proposedTime: "13:00"
  }).code, "INVALID_UPDATE");
  assert.equal(hiddenProposal.writes(), 0);
});

test("rejection metadata can only be written by a valid rejection transition", () => {
  const sameState = updateHarness(baseBooking({ source: "public" }));
  const sameStateResult = sameState.context.updateBookingV2({
    status: "pending", note: "ordinary note", rejectionReason: "forged"
  });
  assert.equal(sameStateResult.code, "INVALID_LIFECYCLE_METADATA");
  assert.equal(sameState.writes(), 0);

  const nonRejection = updateHarness(baseBooking({ source: "public" }));
  const nonRejectionResult = nonRejection.context.updateBookingV2({
    status: "cancelled", cancellationReason: "cancel", rejectionReason: "forged"
  });
  assert.equal(nonRejectionResult.code, "INVALID_LIFECYCLE_METADATA");
  assert.equal(nonRejection.writes(), 0);

  const validRejection = updateHarness(baseBooking({ source: "public" }));
  const validResult = validRejection.context.updateBookingV2({
    status: "rejected", rejectionReason: "=No availability"
  });
  assert.equal(validResult.status, "success");
  assert.equal(validRejection.written().status, "rejected");
  assert.equal(validRejection.written().rejectionReason, "=No availability");
});

test("protected booking and rating text follows the canonical outer-whitespace policy", () => {
  const context = createContext();
  const cases = [
    ["  =SUM(1,1)", "=SUM(1,1)"],
    ["\t=SUM(1,1)", "=SUM(1,1)"],
    ["\r=SUM(1,1)", "=SUM(1,1)"],
    ["value   ", "value"],
    ["value\t", "value"],
    ["value\n", "value"],
    ["  Ahmed Ali  ", "Ahmed Ali"],
    ["line one\nline two", "line one\nline two"],
    ["hello   world", "hello   world"],
    [" \t\r\n ", ""]
  ];
  cases.forEach(([input, expected]) => {
    assert.equal(context.normalizeProtectedText(input), expected);
  });

  const serialized = Array.from(context.bookingToRowV2(baseBooking({
    id: " structured-booking-id ",
    employeeId: " structured-employee-id ",
    serviceIds: [" structured-service-id "],
    status: " structured-status ",
    customerName: "  Ahmed Ali  ",
    employee: "\tSam\t",
    service: "\r=Manual\n",
    note: "line one\nline two",
    confirmedBy: "  Manager  ",
    rejectionReason: "\t=Rejected",
    cancelledBy: "  Manager  ",
    cancellationReason: "=Cancelled\n",
    completedBy: "\rManager",
    deletedBy: "Manager\t",
    deletionReason: "  =Deleted  "
  }), BOOKING_HEADERS));
  const valueOf = (header) => serialized[BOOKING_HEADERS.indexOf(header)];
  assert.equal(valueOf("CUSTOMER"), "Ahmed Ali");
  assert.equal(valueOf("EMPLOYEE"), "Sam");
  assert.equal(valueOf("SERVICE"), "=Manual");
  assert.equal(valueOf("NOTE"), "line one\nline two");
  assert.equal(valueOf("CONFIRMED_BY"), "Manager");
  assert.equal(valueOf("REJECTION_REASON"), "=Rejected");
  assert.equal(valueOf("CANCELLATION_REASON"), "=Cancelled");
  assert.equal(valueOf("DELETION_REASON"), "=Deleted");
  assert.equal(valueOf("ID"), " structured-booking-id ");
  assert.equal(valueOf("EMPLOYEE_ID"), " structured-employee-id ");
  assert.equal(valueOf("SERVICE_IDS"), " structured-service-id ");
  assert.equal(valueOf("STATUS"), " structured-status ");
});

test("required and optional protected fields use normalized values for validation", () => {
  const required = createBookingHarness();
  const missingCustomer = required.context.createPublicBookingRequest(
    creationPayload("public", { customerName: " \t\r\n " })
  );
  assert.equal(missingCustomer.status, "error");
  assert.equal(required.appended.length, 0);
  assert.equal(required.order.includes("lock"), false);

  const missingManualService = createBookingHarness();
  const missingManualResult = missingManualService.context.createBookingV2({
    service: " \t\r\n ", durationMinutes: 30, employeeId: "staff-1",
    date: "2099-01-02", time: "12:00", customerName: "Customer",
    customerPhone: "01012345678"
  });
  assert.equal(missingManualResult.status, "error");
  assert.equal(missingManualService.appended.length, 0);

  const optional = updateHarness(baseBooking({ note: "existing note" }));
  const optionalResult = optional.context.updateBookingV2({ note: " \t\r\n " });
  assert.equal(optionalResult.status, "success");
  assert.equal(optional.written().note, "");
});

test("cancellation, deletion, manual service, and rating comments are canonically normalized", () => {
  const cancellation = updateHarness(baseBooking());
  const cancelled = cancellation.context.updateBookingV2({
    status: "cancelled", cancellationReason: " \t-Formula\n"
  });
  assert.equal(cancelled.status, "success");
  assert.equal(cancellation.written().cancellationReason, "-Formula");

  const deletionContext = createContext();
  const deletedBooking = baseBooking();
  let deletedWrite = null;
  deletionContext.requirePermission = () => null;
  deletionContext.LockService = { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) };
  deletionContext.SpreadsheetApp = { flush: () => {} };
  deletionContext.getBookingsSheetV2 = () => ({});
  deletionContext.findBookingRowV2 = () => ({ booking: deletedBooking, rowNumber: 2, row: [] });
  deletionContext.getActor = () => ({ displayName: "Manager" });
  deletionContext.getCairoDateTime = () => "2099-01-01 10:00:00";
  deletionContext.writeBookingRowV2 = (_sheet, _row, booking) => { deletedWrite = booking; };
  deletionContext.logActivity = () => {};
  deletionContext.jsonOutput = (value) => value;
  assert.equal(deletionContext.deleteBooking({ reason: "\r@Formula\t" }).status, "success");
  assert.equal(deletedWrite.deletionReason, "@Formula");

  const manual = createBookingHarness();
  const manualResult = manual.context.createBookingV2({
    service: "  =Manual\t", durationMinutes: 30, employeeId: "staff-1",
    date: "2099-01-02", time: "12:00", customerName: "Customer",
    customerPhone: "01012345678"
  });
  assert.equal(manualResult.booking.service, "=Manual");

  const ratingContext = createContext({ uuidValues: ["rating-id"] });
  const ratingRows = [];
  ratingContext.LockService = { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) };
  ratingContext.findBookingByTrackingToken = () => ({ booking: baseBooking({
    status: "done", trackingToken: "CH-123456"
  }) });
  ratingContext.getBookingRatingsSheet = () => ({
    getLastRow: () => ratingRows.length + 1,
    getRangeList: () => ({ setNumberFormat: () => {} }),
    getRange: (row) => ({
      setNumberFormat: () => {},
      setValues: (values) => { ratingRows[row - 2] = [...values[0]]; }
    })
  });
  ratingContext.getRatingHeaders = () => [
    "RATING_ID", "BOOKING_ID", "TRACKING_TOKEN", "EMPLOYEE_ID", "EMPLOYEE_NAME",
    "RATING", "COMMENT", "SERVICE", "BOOKING_DATE", "CREATED_AT", "STATUS",
    "CUSTOMER_PHONE_HASH", "UPDATED_AT"
  ];
  ratingContext.getAllBookingRatings = () => [];
  ratingContext.hashBookingPhone = () => "hash";
  ratingContext.getCairoDateTime = () => "2099-01-01 10:00:00";
  ratingContext.SpreadsheetApp = { flush: () => {} };
  ratingContext.logActivity = () => {};
  ratingContext.jsonOutput = (value) => value;
  const rating = ratingContext.submitBookingRating({
    trackingToken: "CH-123456", phoneLast4: "5678", rating: 5,
    comment: "\r=Formula\nline two   here\t"
  });
  assert.equal(rating.status, "success");
  assert.equal(rating.rating.comment, "=Formula\nline two   here");
  assert.equal(ratingRows.length, 1);
});

test("canonical formula-like booking and rating text uses only explicit stringValue cells", () => {
  const context = createContext({ realSheetWriter: true });
  const requests = [];
  const makeSheet = (sheetId, headers) => ({
    getSheetId: () => sheetId,
    getLastRow: () => 1,
    getLastColumn: () => headers.length,
    getRange: () => ({ getValues: () => [[...headers]] })
  });
  context.SpreadsheetApp = {
    getActive: () => ({ getId: () => "spreadsheet-id" })
  };
  context.Sheets = {
    Spreadsheets: {
      batchUpdate: (body, spreadsheetId) => {
        assert.equal(spreadsheetId, "spreadsheet-id");
        requests.push(body.requests[0].updateCells);
      }
    }
  };
  const bookingSheet = makeSheet(101, BOOKING_HEADERS);
  const values = [
    ["=SUM(1,1)", "=SUM(1,1)"],
    ["+SUM(1,1)", "+SUM(1,1)"],
    ["-SUM(1,1)", "-SUM(1,1)"],
    ["@SUM(1,1)", "@SUM(1,1)"],
    ["  =SUM(1,1)", "=SUM(1,1)"],
    ["\t=SUM(1,1)", "=SUM(1,1)"],
    ["\r=SUM(1,1)", "=SUM(1,1)"],
    ["Normal readable text", "Normal readable text"]
  ];
  values.forEach(([value, expected], index) => {
    context.appendBookingRowV2(bookingSheet, baseBooking({
      id: `booking-${index}`,
      customerName: value,
      customerPhone: value,
      service: value,
      note: value,
      rejectionReason: value,
      cancellationReason: value,
      deletionReason: value
    }));
    const rowNumber = index + 2;
    ["CUSTOMER", "SERVICE", "NOTE", "REJECTION_REASON", "CANCELLATION_REASON", "DELETION_REASON"]
      .forEach((header) => {
        const column = BOOKING_HEADERS.indexOf(header) + 1;
        const cell = requests[index].rows[0].values[column - 1];
        assert.equal(cell.userEnteredValue.stringValue, expected);
        assert.deepEqual(Object.keys(cell.userEnteredValue), ["stringValue"]);
        assert.equal(Object.hasOwn(cell.userEnteredValue, "formulaValue"), false);
      });
    const phoneCell = requests[index].rows[0].values[BOOKING_HEADERS.indexOf("PHONE")];
    assert.equal(phoneCell.userEnteredValue.stringValue, value);
  });

  const ratingHeaders = [
    "RATING_ID", "BOOKING_ID", "TRACKING_TOKEN", "EMPLOYEE_ID", "EMPLOYEE_NAME",
    "RATING", "COMMENT", "SERVICE", "BOOKING_DATE", "CREATED_AT", "STATUS",
    "CUSTOMER_PHONE_HASH", "UPDATED_AT"
  ];
  const ratingSheet = makeSheet(202, ratingHeaders);
  context.getRatingHeaders = () => ratingHeaders;
  values.forEach(([comment], index) => context.appendBookingRatingRow(ratingSheet, {
    ratingId: `rating-${index}`, bookingId: `booking-${index}`, trackingToken: "token",
    employeeId: "staff-1", employeeName: "Sam", rating: 5, comment,
    service: "Haircut", bookingDate: "2099-01-02", createdAt: "now",
    status: "published", customerPhoneHash: "hash", updatedAt: "now"
  }));
  values.forEach(([, expected], index) => {
    const column = ratingHeaders.indexOf("COMMENT") + 1;
    const cell = requests[values.length + index].rows[0].values[column - 1];
    assert.equal(cell.userEnteredValue.stringValue, expected);
    assert.deepEqual(Object.keys(cell.userEnteredValue), ["stringValue"]);
    assert.equal(Object.hasOwn(cell.userEnteredValue, "formulaValue"), false);
  });

  context.writeBookingRowV2(bookingSheet, 20, baseBooking({
    note: "\t=Lifecycle rewrite\n"
  }));
  const lifecycleNote = requests[values.length * 2]
    .rows[0].values[BOOKING_HEADERS.indexOf("NOTE")].userEnteredValue;
  assert.equal(lifecycleNote.stringValue, "=Lifecycle rewrite");
  assert.deepEqual(Object.keys(lifecycleNote), ["stringValue"]);
  assert.equal(Object.hasOwn(lifecycleNote, "formulaValue"), false);

  context.writeBookingRatingRow(ratingSheet, 20, {
    ratingId: "rating-rewrite", bookingId: "booking-rewrite", trackingToken: "token",
    employeeId: "staff-1", employeeName: "Sam", rating: 5,
    comment: "\r=Moderation rewrite\t", service: "Haircut",
    bookingDate: "2099-01-02", createdAt: "now", status: "hidden",
    customerPhoneHash: "hash", updatedAt: "later"
  });
  const moderationComment = requests[(values.length * 2) + 1]
    .rows[0].values[ratingHeaders.indexOf("COMMENT")].userEnteredValue;
  assert.equal(moderationComment.stringValue, "=Moderation rewrite");
  assert.deepEqual(Object.keys(moderationComment), ["stringValue"]);
  assert.equal(Object.hasOwn(moderationComment, "formulaValue"), false);

  assert.equal(requests.every((request) => request.fields === "userEnteredValue"), true);
  assert.equal(requests.every((request) => request.start.columnIndex === 0), true);
});

test("safe sheet writer fails closed when the Sheets Advanced Service is unavailable", () => {
  const context = createContext({ realSheetWriter: true });
  context.SpreadsheetApp = { getActive: () => ({ getId: () => "spreadsheet-id" }) };
  const sheet = { getSheetId: () => 101 };
  assert.throws(
    () => context.writeSheetRowWithExplicitValues(sheet, 2, ["=SUM(1,1)"]),
    /SAFE_SHEET_WRITE_UNAVAILABLE/
  );
});

test("service active parsing preserves explicit false and legacy blank policy", () => {
  const context = createContext();
  assert.equal(context.parseServiceActiveFlag(false), false);
  assert.equal(context.parseServiceActiveFlag("FALSE"), false);
  assert.equal(context.parseServiceActiveFlag(0), false);
  assert.equal(context.parseServiceActiveFlag(true), true);
  assert.equal(context.parseServiceActiveFlag("TRUE"), true);
  assert.equal(context.parseServiceActiveFlag(""), true);
  assert.equal(context.parseServiceActiveFlag(null), true);
  assert.equal(context.parseServiceActiveFlag(undefined), true);
  assert.equal(context.parseServiceActiveFlag("unexpected"), false);

  const rows = [
    ["Boolean false", 100, false, 1, "disabled-bool", 30],
    ["String false", 100, "FALSE", 2, "disabled-string", 30],
    ["Numeric zero", 100, 0, 3, "disabled-zero", 30],
    ["Legacy blank", 100, "", 4, "legacy-blank", 30],
    ["Boolean true", 100, true, 5, "enabled-bool", 30],
    ["String true", 100, "TRUE", 6, "enabled-string", 30]
  ];
  context.SpreadsheetApp = {
    getActive: () => ({
      getSheetByName: () => ({
        getLastRow: () => rows.length + 1,
        getRange: () => ({ getValues: () => rows })
      })
    })
  };
  const services = Array.from(context.publicBookingServices());
  assert.deepEqual(
    services.map((service) => service.serviceId),
    ["legacy-blank", "enabled-bool", "enabled-string"]
  );

  const harness = statefulCreationHarness();
  harness.context.publicBookingServices = () => services;
  const internal = harness.context.createBookingV2(creationPayload("internal", {
    clientRequestId: "internal-disabled-service",
    serviceIds: ["disabled-bool"]
  }));
  const publicResult = harness.context.createPublicBookingRequest(creationPayload("public", {
    clientRequestId: "public-disabled-service",
    serviceIds: ["disabled-string"]
  }));
  assert.equal(internal.status, "error");
  assert.equal(publicResult.status, "error");
  assert.equal(harness.sheet.getLastRow(), 1);
});

test("idempotent creation recovers committed results and rejects key reuse", () => {
  const harness = statefulCreationHarness();
  const payload = creationPayload("internal");
  const first = harness.context.createBookingV2(payload);
  assert.equal(first.status, "success");
  const storedAfterFirst = harness.sheet.getLastRow();

  const retryAfterSimulatedTimeout = harness.context.createBookingV2(payload);
  assert.equal(retryAfterSimulatedTimeout.status, "success");
  assert.equal(retryAfterSimulatedTimeout.booking.id, first.booking.id);
  assert.equal(retryAfterSimulatedTimeout.booking.status, first.booking.status);
  assert.equal(retryAfterSimulatedTimeout.booking.date, first.booking.date);
  assert.equal(retryAfterSimulatedTimeout.booking.time, first.booking.time);
  assert.equal(harness.sheet.getLastRow(), storedAfterFirst);

  const concurrentModelRetry = harness.context.createBookingV2(payload);
  assert.equal(concurrentModelRetry.booking.id, first.booking.id);
  assert.equal(harness.sheet.getLastRow(), storedAfterFirst);

  const altered = harness.context.createBookingV2({ ...payload, note: "changed" });
  assert.equal(altered.code, "IDEMPOTENCY_KEY_REUSED");
  assert.equal(harness.sheet.getLastRow(), storedAfterFirst);

  const differentId = harness.context.createBookingV2({
    ...payload, clientRequestId: "internal-request-0002"
  });
  assert.equal(differentId.code, "SLOT_UNAVAILABLE");
  assert.equal(harness.sheet.getLastRow(), storedAfterFirst);
});

test("public idempotent retries return the original tracking and appointment fields", () => {
  const harness = statefulCreationHarness();
  const payload = creationPayload("public");
  const first = harness.context.createPublicBookingRequest(payload);
  const retry = harness.context.createPublicBookingRequest(payload);
  assert.equal(first.status, "success");
  assert.equal(retry.status, "success");
  assert.equal(retry.bookingId, first.bookingId);
  assert.equal(retry.trackingToken, first.trackingToken);
  assert.equal(retry.booking.status, first.booking.status);
  assert.equal(retry.booking.date, first.booking.date);
  assert.equal(retry.booking.time, first.booking.time);
  assert.equal(harness.sheet.getLastRow(), 2);
});

test("all public/internal creation combinations serialize and reject overlaps", () => {
  const run = (firstKind, secondKind, firstOverrides = {}, secondOverrides = {}) => {
    const harness = statefulCreationHarness();
    const call = (kind, payload) => kind === "public"
      ? harness.context.createPublicBookingRequest(payload)
      : harness.context.createBookingV2(payload);
    const first = call(firstKind, creationPayload(firstKind, {
      clientRequestId: `${firstKind}-request-first`,
      ...firstOverrides
    }));
    const second = call(secondKind, creationPayload(secondKind, {
      clientRequestId: `${secondKind}-request-second`,
      ...secondOverrides
    }));
    assert.equal(first.status, "success");
    assert.ok(["SLOT_UNAVAILABLE", "BOOKING_LOCK_TIMEOUT"].includes(second.code));
    assert.equal(harness.sheet.getLastRow(), 2);
    const stored = harness.context.getAllBookingsV2();
    assert.equal(stored.filter((booking) => harness.context.bookingBlocksSlot(booking)).length, 1);
  };
  run("public", "public");
  run("internal", "internal");
  run("public", "internal");
  run("internal", "public");
  run("internal", "public",
    { serviceIds: ["svc-75"], time: "12:00" },
    { serviceIds: ["svc-30"], time: "13:00" });
});

test("booking lock timeout is stable and performs no write", () => {
  const harness = statefulCreationHarness();
  harness.context.LockService = {
    getScriptLock: () => ({ tryLock: () => false, releaseLock: () => assert.fail("must not release") })
  };
  const result = harness.context.createBookingV2(creationPayload("internal"));
  assert.equal(result.code, "BOOKING_LOCK_TIMEOUT");
  assert.equal(harness.sheet.getLastRow(), 1);
});

test("client request IDs reject unsafe or unbounded values before locking", () => {
  const harness = statefulCreationHarness();
  ["=formula", "short", "unsafe key", `request-${"x".repeat(130)}`].forEach((clientRequestId) => {
    const result = harness.context.createBookingV2(creationPayload("internal", { clientRequestId }));
    assert.equal(result.code, "INVALID_CLIENT_REQUEST_ID");
  });
  assert.equal(harness.lockEvents.length, 0);
  assert.equal(harness.sheet.getLastRow(), 1);
});

test("booking options reject invalid duration overrides", () => {
  const context = createContext();
  context.expirePendingBookings = () => 0;
  context.publicBookingServices = () => [
    { serviceId: "svc-1", name: "Haircut", durationMinutes: 30, price: 100 }
  ];
  context.jsonOutput = (value) => value;
  const result = context.getPublicBookingOptions({ durationMinutes: -30 });
  assert.equal(result.code, "INVALID_APPOINTMENT");
  const duplicate = context.getPublicBookingOptions({ serviceIds: ["svc-1", "svc-1"] });
  assert.equal(duplicate.code, "INVALID_SERVICES");
  [{ forged: true }, "svc-1", null].forEach((serviceIds) => {
    const invalidType = context.getPublicBookingOptions({ serviceIds });
    assert.equal(invalidType.code, "INVALID_SERVICES");
  });
});

test("public and internal creation reject non-array serviceIds before locking or writing", () => {
  const harness = statefulCreationHarness();
  [{ forged: true }, "svc-30", null].forEach((serviceIds, index) => {
    const internal = harness.context.createBookingV2(creationPayload("internal", {
      clientRequestId: `invalid-internal-${index}`,
      serviceIds
    }));
    const publicResult = harness.context.createPublicBookingRequest(creationPayload("public", {
      clientRequestId: `invalid-public-${index}`,
      serviceIds
    }));
    assert.equal(internal.code, "INVALID_SERVICES");
    assert.equal(publicResult.code, "INVALID_SERVICES");
  });
  assert.equal(harness.lockEvents.length, 0);
  assert.equal(harness.sheet.getLastRow(), 1);
});

test("booking lists exclude soft-deleted rows unless an authorized actor explicitly requests them", () => {
  const context = createContext();
  context.expirePendingBookings = () => 0;
  context.requirePermission = () => null;
  context.actorHasPermission = () => false;
  context.getAllBookingsV2 = () => [
    baseBooking({ id: "live" }),
    baseBooking({ id: "deleted", deleted: true })
  ];
  context.jsonOutput = (value) => value;
  const normal = context.getBookingsV2({});
  assert.equal(normal.bookings.length, 1);
  assert.equal(normal.bookings[0].id, "live");
  const unauthorizedInclude = context.getBookingsV2({ includeDeleted: true });
  assert.equal(unauthorizedInclude.bookings.length, 1);
});

test("rating summaries calculate averages from published rows only", () => {
  const context = createContext();
  const ratings = [
    { employeeId: "barber-1", status: "published", rating: 5 },
    { employeeId: "barber-1", status: "published", rating: 3 },
    { employeeId: "barber-1", status: "hidden", rating: 1 },
    { employeeId: "barber-2", status: "published", rating: 5 }
  ].map((rating, index) => ({ ...rating, bookingId: `booking-${index + 1}` }));
  const bookings = ratings.map((rating) => ({ id: rating.bookingId, deleted: false }));
  const summary = context.calculateBarberRatingSummary("barber-1", ratings, bookings);
  assert.equal(summary.averageRating, 4);
  assert.equal(summary.ratingsCount, 2);
  assert.equal(summary.distribution[5], 1);
});

test("ratings for deleted bookings are excluded unless historical data is explicitly requested", () => {
  const context = createContext();
  const ratings = [
    {
      ratingId: "rating-active", bookingId: "active", employeeId: "barber-1",
      employeeName: "Sam", status: "published", rating: 5,
      bookingDate: "2099-01-02", createdAt: "2099-01-02 12:00:00"
    },
    {
      ratingId: "rating-deleted", bookingId: "deleted", employeeId: "barber-1",
      employeeName: "Sam", status: "published", rating: 1,
      bookingDate: "2099-01-02", createdAt: "2099-01-02 11:00:00"
    }
  ];
  const bookings = [
    { id: "active", deleted: false },
    { id: "deleted", deleted: true }
  ];
  const activeSummary = context.calculateBarberRatingSummary("barber-1", ratings, bookings);
  assert.equal(activeSummary.averageRating, 5);
  assert.equal(activeSummary.ratingsCount, 1);
  const historicalSummary = context.calculateBarberRatingSummary(
    "barber-1", ratings, bookings, true
  );
  assert.equal(historicalSummary.averageRating, 3);
  assert.equal(historicalSummary.ratingsCount, 2);

  context.getAllBookingRatings = () => ratings;
  context.getAllBookingsV2 = () => bookings;
  context.requirePermission = () => null;
  context.jsonOutput = (value) => value;
  const publicSummary = context.getBarberRatings({ employeeId: "barber-1" });
  assert.equal(publicSummary.averageRating, null);
  assert.equal(publicSummary.ratingsCount, 1);
  const activeAdmin = context.getRatingsAdmin({});
  assert.equal(activeAdmin.total, 1);
  assert.equal(activeAdmin.includeHistorical, false);
  assert.equal(activeAdmin.barberSummaries[0].averageRating, 5);
  const historicalAdmin = context.getRatingsAdmin({ includeHistorical: true });
  assert.equal(historicalAdmin.total, 2);
  assert.equal(historicalAdmin.includeHistorical, true);
});

test("public rating averages remain hidden until five active published ratings exist", () => {
  const context = createContext();
  const ratings = Array.from({ length: 6 }, (_, index) => ({
    bookingId: `booking-${index + 1}`,
    employeeId: "barber-1",
    status: index === 5 ? "hidden" : "published",
    rating: index % 2 ? 3 : 5
  }));
  const bookings = ratings.map((rating) => ({ id: rating.bookingId, deleted: false }));
  const four = context.calculatePublicBarberRatingSummary(
    "barber-1", ratings.slice(0, 4), bookings.slice(0, 4)
  );
  assert.equal(four.ratingsCount, 4);
  assert.equal(four.averageRating, null);
  const five = context.calculatePublicBarberRatingSummary("barber-1", ratings, bookings);
  assert.equal(five.ratingsCount, 5);
  assert.equal(five.averageRating, 4.2);

  context.expirePendingBookings = () => 0;
  context.publicBookingServices = () => [
    { serviceId: "svc-1", name: "Haircut", durationMinutes: 30, price: 100 }
  ];
  context.getAllBookingRatings = () => ratings.slice(0, 4);
  context.getAllBookingsV2 = () => bookings.slice(0, 4);
  context.publicBookingBarbers = () => [{ staffId: "barber-1", name: "Sam" }];
  context.availableSlotsForBarber = () => ({
    slots: [], availability: "unavailable", shiftStart: "", shiftEnd: ""
  });
  context.jsonOutput = (value) => value;
  const options = context.getPublicBookingOptions({ serviceIds: ["svc-1"] });
  assert.equal(options.barbers[0].ratingsCount, 4);
  assert.equal(options.barbers[0].averageRating, null);
});

test("booking migration appends missing headers once and preserves legacy aliases", () => {
  const context = createContext();
  const legacy = [
    "ID", "DATE", "TIME", "CUSTOMER", "PHONE", "EMPLOYEE", "SERVICE", "NOTE", "STATUS",
    "CREATED_AT", "UPDATED_AT", "SERVICE_ID", "DURATION_MINUTES", "SOURCE", "TRACKING_TOKEN",
    "REQUESTED_AT", "CONFIRMED_AT", "CONFIRMED_BY", "REJECTION_REASON", "PROPOSED_DATE",
    "PROPOSED_TIME", "HOLD_EXPIRES_AT", "CUSTOMER_RESPONSE", "EMPLOYEE_ID"
  ];
  legacy[14] = " Tracking-Code ";
  const sheet = memoryHeaderSheet(legacy);
  context.ensureBookingHeadersV2(sheet);
  context.ensureBookingHeadersV2(sheet);
  const normalized = sheet.headers().map(context.normalizeBookingHeader);
  assert.equal(normalized.filter((value) => value === "trackingcode").length, 1);
  assert.equal(normalized.filter((value) => value === "trackingtoken").length, 0);
  [
    "cancelledat", "completedat", "deleted", "serviceids", "totalprice", "deletionreason",
    "clientrequestid", "clientrequestfingerprint"
  ].forEach((header) => {
    assert.equal(normalized.filter((value) => value === header).length, 1);
  });
  assert.equal(sheet.insertCount(), 1);
});

test("backend routes use V2 APIs and separated permissions", () => {
  assert.match(backendSource, /data\.action === "createBooking"\) return createBookingV2/);
  assert.match(backendSource, /data\.action === "updateBooking"\) return updateBookingV2/);
  assert.match(backendSource, /requirePermission\(data, "create_bookings"/);
  assert.match(backendSource, /requirePermission\(data, "manage_bookings"/);
  assert.match(backendSource, /requirePermission\(data, "delete_bookings"/);
});

test("frontend search and customer verification retain their privacy safeguards", () => {
  assert.match(internalSource, /function localSearchMatch/);
  assert.match(internalSource, /customerName.*customerPhone.*employee.*service.*note.*trackingToken/s);
  assert.match(customerSource, /sessionStorage\.setItem\(phoneLast4Key/);
  assert.doesNotMatch(customerSource, /localStorage/);
  assert.doesNotMatch(customerSource, /\b(?:alert|prompt|confirm)\s*\(/);
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
else console.log(`\n${tests.length} booking upgrade tests passed.`);
