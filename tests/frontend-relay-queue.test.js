"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(process.env.CUT_HUB_API_SOURCE_OVERRIDE || path.join(__dirname, "../public/assets/js/core/api.js"), "utf8");

function setup(fetchImpl) {
  const window = { ROMEO_API_URL: "/api/apps-script", addEventListener() {}, dispatchEvent() {} };
  const document = { body: null, readyState: "loading", addEventListener() {} };
  vm.runInNewContext(source, { window, document, navigator: { onLine: true }, URL,
    console: { warn() {} }, CustomEvent: function () {},
    localStorage: { getItem: () => null },
    sessionStorage: { getItem: () => JSON.stringify({ sessionToken: "PRIVATE_SESSION" }) }, fetch: fetchImpl });
  return window.RomeoApi;
}
test("dashboard request bursts allow at most two executions and retain every payload", async () => {
  let active = 0, maximum = 0; const calls = [];
  const api = setup(async (url, options) => {
    const body = JSON.parse(options.body); calls.push({ url, options, body });
    active++; maximum = Math.max(maximum, active);
    await new Promise(resolve => setImmediate(resolve)); active--;
    return { ok: true, json: async () => ({ status: "success", index: body.index }) };
  });
  const payloads = Array.from({ length: 8 }, (_, index) => ({ action: "getInvoices", index }));
  const results = await Promise.all(payloads.map(payload => api.request(payload)));
  assert.equal(maximum, 2); assert.equal(calls.length, 8);
  assert.deepEqual(calls.map(call => call.body.index), payloads.map(payload => payload.index));
  assert.deepEqual(results.map(result => result.index), payloads.map(payload => payload.index));
  for (const call of calls) {
    assert.equal(call.url, "/api/apps-script"); assert.equal(call.options.cache, "no-store");
    assert.equal(call.body.sessionToken, "PRIVATE_SESSION");
  }
  assert.ok(payloads.every(payload => payload.sessionToken === undefined));
});
test("a failed execution releases its slot and is not retried", async () => {
  const calls = [];
  const api = setup(async (_url, options) => {
    const body = JSON.parse(options.body); calls.push(body.index);
    await new Promise(resolve => setImmediate(resolve));
    if (body.index === 0) throw new Error("PRIVATE_FAILURE");
    return { ok: true, json: async () => ({ status: "success" }) };
  });
  const results = await Promise.allSettled(Array.from({ length: 5 }, (_, index) => api.request({ action: "createInvoice", index })));
  assert.equal(results[0].status, "rejected"); assert.ok(results.slice(1).every(result => result.status === "fulfilled"));
  assert.deepEqual(calls, [0, 1, 2, 3, 4]);
});
