#!/usr/bin/env node
"use strict";

const EXPECTED_STAGING_SPREADSHEET_ID = "1tSMYYSNivpNTOJOuKMBVCoE7NKdr3VCzpCgOulcIsoI";

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    if (!key?.startsWith("--") || values[index + 1] === undefined) {
      throw new Error(`Invalid argument near ${key || "<end>"}.`);
    }
    result[key.slice(2)] = values[index + 1];
  }
  return result;
}

function requireArg(args, name) {
  const value = String(args[name] || "").trim();
  if (!value) throw new Error(`--${name} is required.`);
  return value;
}

async function post(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`The staging endpoint returned non-JSON content: ${text.slice(0, 200)}`);
  }
}

function minutes(value) {
  const [hour, minute] = String(value).split(":").map(Number);
  return hour * 60 + minute;
}

function overlaps(left, right) {
  const leftStart = minutes(left.time);
  const rightStart = minutes(right.time);
  return leftStart < rightStart + Number(right.durationMinutes) &&
    leftStart + Number(left.durationMinutes) > rightStart;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = requireArg(args, "url");
  const environment = requireArg(args, "environment").toLowerCase();
  if (environment !== "staging") throw new Error("--environment must be exactly staging.");
  const date = requireArg(args, "date");
  const employeeId = requireArg(args, "employee-id");
  const service30 = requireArg(args, "service-30-id");
  const service75 = requireArg(args, "service-75-id");
  const username = requireArg(args, "username");
  const password = String(process.env.CUT_HUB_STAGING_PASSWORD || "");
  if (!password) throw new Error("CUT_HUB_STAGING_PASSWORD must be set in the process environment.");
  const slots = requireArg(args, "slots").split(",").map((value) => value.trim()).filter(Boolean);
  if (slots.length < 5) throw new Error("--slots must supply five comma-separated, available start times.");

  const identity = await post(url, { action: "stagingIdentity" });
  if (identity.environment !== "staging" ||
      identity.spreadsheetId !== EXPECTED_STAGING_SPREADSHEET_ID) {
    throw new Error("Endpoint identity is not the confirmed CUT HUB staging spreadsheet.");
  }
  const login = await post(url, { action: "loginUser", username, password });
  const sessionToken = login.sessionToken || login.token;
  if (login.status !== "success" || !sessionToken) throw new Error("Staging login failed.");

  let sequence = 0;
  const createdBookingIds = [];
  const makePayload = (kind, time, durationKind, suffix) => {
    sequence++;
    const common = {
      clientRequestId: `staging-concurrency-${Date.now()}-${sequence}-${suffix}`,
      employeeId,
      date,
      time,
      serviceIds: [durationKind === 75 ? service75 : service30],
      customerName: "CUT HUB staging concurrency test",
      customerPhone: "01000000000",
      note: `staging-${suffix}`
    };
    return kind === "public"
      ? { action: "createPublicBookingRequest", ...common }
      : { action: "createBooking", sessionToken, ...common };
  };

  const scenarios = [
    { name: "public/public", kinds: ["public", "public"], time: slots[1], durations: [30, 30] },
    { name: "internal/internal", kinds: ["internal", "internal"], time: slots[2], durations: [30, 30] },
    { name: "public/internal", kinds: ["public", "internal"], time: slots[3], durations: [30, 30] },
    {
      name: "75-minute/overlapping-30-minute",
      kinds: ["internal", "public"],
      time: slots[4],
      secondTime: (() => {
        const start = minutes(slots[4]) + 60;
        return `${String(Math.floor(start / 60) % 24).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`;
      })(),
      durations: [75, 30]
    }
  ];

  const retryPayload = makePayload("public", slots[0], 30, "idempotent-retry");
  const retryResponses = await Promise.all([
    post(url, retryPayload),
    post(url, { ...retryPayload })
  ]);
  if (retryResponses.some((result) => result.status !== "success") ||
      retryResponses[0].bookingId !== retryResponses[1].bookingId ||
      retryResponses[0].trackingToken !== retryResponses[1].trackingToken) {
    throw new Error(`idempotent concurrent retry: expected two matching successful responses; got ${JSON.stringify(retryResponses)}`);
  }
  const retryReread = await post(url, { action: "getBookings", sessionToken, filters: { date } });
  const retryStored = (retryReread.bookings || [])
    .filter((booking) => booking.clientRequestId === retryPayload.clientRequestId);
  if (retryStored.length !== 1) {
    throw new Error(`idempotent concurrent retry: expected one stored row, found ${retryStored.length}.`);
  }
  createdBookingIds.push(retryStored[0].id);
  console.log("PASS idempotent concurrent retry");

  for (const scenario of scenarios) {
    const payloads = [
      makePayload(scenario.kinds[0], scenario.time, scenario.durations[0], `${scenario.name}-a`),
      makePayload(scenario.kinds[1], scenario.secondTime || scenario.time, scenario.durations[1], `${scenario.name}-b`)
    ];
    const responses = await Promise.all(payloads.map((payload) => post(url, payload)));
    const successes = responses.filter((result) => result.status === "success");
    const rejections = responses.filter((result) =>
      result.status === "error" && ["SLOT_UNAVAILABLE", "BOOKING_LOCK_TIMEOUT"].includes(result.code)
    );
    if (successes.length !== 1 || rejections.length !== 1) {
      throw new Error(`${scenario.name}: expected one success and one stable rejection; got ${JSON.stringify(responses)}`);
    }

    const reread = await post(url, {
      action: "getBookings",
      sessionToken,
      filters: { date }
    });
    if (reread.status !== "success") throw new Error(`${scenario.name}: booking re-read failed.`);
    const requestIds = new Set(payloads.map((payload) => payload.clientRequestId));
    const stored = (reread.bookings || []).filter((booking) => requestIds.has(booking.clientRequestId));
    const blocking = stored.filter((booking) =>
      !booking.deleted && ["pending", "confirmed", "proposed"].includes(booking.status)
    );
    if (stored.length !== 1 || blocking.length !== 1) {
      throw new Error(`${scenario.name}: expected exactly one complete stored blocking row, found ${stored.length}.`);
    }
    const storedBooking = stored[0];
    if (!storedBooking.id || !storedBooking.date || !storedBooking.time ||
        !storedBooking.employeeId || !storedBooking.customerName ||
        !storedBooking.service || !Number(storedBooking.durationMinutes)) {
      throw new Error(`${scenario.name}: the stored booking row is partial.`);
    }
    const employeeDayBlocking = (reread.bookings || []).filter((booking) =>
      !booking.deleted && booking.employeeId === employeeId && booking.date === date &&
      ["pending", "confirmed", "proposed"].includes(booking.status)
    );
    if (employeeDayBlocking.some((booking, index) =>
      employeeDayBlocking.slice(index + 1).some((other) => overlaps(booking, other)))) {
      throw new Error(`${scenario.name}: overlapping stored rows remain after re-read.`);
    }
    createdBookingIds.push(storedBooking.id);
    console.log(`PASS ${scenario.name}`);
  }
  console.log(`Created staging booking IDs for cleanup: ${createdBookingIds.join(", ")}`);
}

main().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exitCode = 1;
});
