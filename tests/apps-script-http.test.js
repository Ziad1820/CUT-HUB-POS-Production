"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { createGoogleRequest } = require("../lib/apps-script-http");
const { deploymentId } = require("../config/apps-script-proxy.json");

test("Google requests use independent connections with exact body length and no browser credentials", async () => {
  const calls = [], body = '{"action":"createInvoice","sessionToken":"PRIVATE","note":"عربي"}';
  const adapter = createGoogleRequest((options, callback) => {
    const request = new EventEmitter();
    request.end = value => {
      calls.push({ options, value });
      const response = new EventEmitter(); response.statusCode = 200; response.headers = { "content-type": "application/json" };
      callback(response); response.emit("data", Buffer.from('{"status":"success"}')); response.emit("end");
    };
    return request;
  });
  const first = await adapter(`https://script.google.com/macros/s/${deploymentId}/exec`, { method: "POST", body });
  await adapter("https://script.googleusercontent.com/macros/echo?token=PRIVATE", { method: "GET" });
  assert.equal(await first.text(), '{"status":"success"}');
  for (const call of calls) {
    assert.equal(call.options.agent, false); assert.equal(call.options.headers.Cookie, undefined);
    assert.equal(call.options.headers.Origin, undefined); assert.equal(call.options.headers.Authorization, undefined);
  }
  assert.equal(calls[0].options.headers["Content-Length"], Buffer.byteLength(body));
  assert.equal(calls[0].value, body); assert.equal(calls[1].value, null);
});
test("adapter rejects a user-controlled upstream before opening any connection", async () => {
  let calls = 0; const adapter = createGoogleRequest(() => { calls++; });
  await assert.rejects(adapter("https://evil.test/exec", { method: "POST" }));
  await assert.rejects(adapter("http://script.googleusercontent.com/macros/echo", { method: "GET" }));
  assert.equal(calls, 0);
});
test("a socket reset is returned once without resending the business request", async () => {
  let calls = 0;
  const adapter = createGoogleRequest(() => {
    calls++; const request = new EventEmitter();
    request.end = () => queueMicrotask(() => request.emit("error", Object.assign(new Error("socket reset"), { code: "ECONNRESET" })));
    return request;
  });
  await assert.rejects(adapter(`https://script.google.com/macros/s/${deploymentId}/exec`, { method: "POST", body: "{}" }), { code: "ECONNRESET" });
  assert.equal(calls, 1);
});
