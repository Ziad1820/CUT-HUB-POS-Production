"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createHandler } = require("../api/apps-script");

function response(status = 200, body = '{"status":"success","value":0}', headers = {}) {
  return { status, ok: status >= 200 && status < 300,
    headers: new Headers({ "content-type": "application/json", ...headers }), text: async () => body };
}
function sink() {
  return { headers: {}, setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(value) { this.body = value; } };
}
const req = body => ({ method: "POST", headers: { host: "cut-hub-pos-production.vercel.app",
  origin: "https://cut-hub-pos-production.vercel.app", cookie: "PRIVATE_COOKIE", authorization: "PRIVATE_HEADER" }, body });
test("independent executions cannot reuse a cached Google redirect", async () => {
  const urls = [];
  const handler = createHandler(async url => { urls.push(url); return response(); });
  await handler(req({ action: "totalIncome" }), sink());
  await handler(req({ action: "totalIncome" }), sink());
  assert.notEqual(urls[0], urls[1]);
  for (const value of urls) assert.match(new URL(value).search, /^\?relayRequest=[0-9a-f-]{36}$/);
});
test("relay posts the original JSON once, then reads the ContentService result with GET", async () => {
  const calls = [], logs = [], body = JSON.stringify({ action: "createInvoice", sessionToken: "PRIVATE_SESSION", total: 120 });
  const content = '{"status":"success","invoiceId":"fixture","total":120}';
  const handler = createHandler(async (...args) => {
    calls.push(args);
    return calls.length === 1 ? response(302, "", { location: "https://script.googleusercontent.com/macros/echo?token=PRIVATE_REDIRECT" })
      : response(200, content);
  }, entry => logs.push(entry));
  const res = sink(); await handler(req(body), res);
  assert.equal(res.statusCode, 200); assert.equal(res.body, content); assert.deepEqual(logs, []);
  assert.equal(calls.length, 2); assert.equal(calls[0][1].method, "POST"); assert.equal(calls[0][1].body, body);
  assert.equal(calls[0][1].headers.cookie, undefined); assert.equal(calls[0][1].headers.authorization, undefined);
  assert.equal(calls[0][1].headers.Origin, undefined);
  assert.equal(calls[1][1].method, "GET"); assert.equal(calls[1][1].body, undefined);
  assert.equal(calls[0][1].cache, "no-store"); assert.equal(calls[1][1].cache, "no-store");
  assert.equal(res.headers["cache-control"], "no-store"); assert.equal(res.headers["access-control-allow-origin"], undefined);
});
test("a 404 content redirect produces JSON without replaying a potentially completed write", async () => {
  const calls = [], logs = [];
  const handler = createHandler(async (...args) => {
    calls.push(args);
    return calls.length === 1 ? response(303, "", { location: "https://script.googleusercontent.com/macros/echo?key=PRIVATE" })
      : response(404, "PRIVATE_FINANCIAL_DATA", { "content-type": "text/html" });
  }, message => logs.push(message));
  const res = sink(); await handler(req('{"action":"createInvoice","sessionToken":"PRIVATE"}'), res);
  assert.equal(res.statusCode, 502); assert.equal(JSON.parse(res.body).requestMayHaveCompleted, true);
  assert.deepEqual(calls.map(call => call[1].method), ["POST", "GET"]);
  assert.doesNotMatch(JSON.stringify([res.body, logs]), /PRIVATE/);
});
test("extra ContentService redirects are followed as GET without repeating the execution", async () => {
  const calls = [];
  const replies = [
    response(302, "", { location: "https://script.googleusercontent.com/macros/echo?key=first" }),
    response(302, "", { location: "/macros/echo?key=second" }),
    response(307, "", { location: "/macros/echo?key=third" }),
    response(200, '{"status":"success","withdrawals":[]}')
  ];
  const res = sink();
  await createHandler(async (...args) => { calls.push(args); return replies.shift(); })(req({ action: "getWithdrawals" }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).status, "success");
  assert.deepEqual(calls.map(call => call[1].method), ["POST", "GET", "GET", "GET"]);
  assert.ok(calls.slice(1).every(call => call[1].body === undefined));
});
test("a result redirect cannot escape to a login page or untrusted host", async () => {
  const calls = [], res = sink();
  await createHandler(async (...args) => {
    calls.push(args);
    return response(302, "", { location: calls.length === 1
      ? "https://script.googleusercontent.com/macros/echo?key=first"
      : "https://accounts.google.com/ServiceLogin?private=hidden" });
  }, () => {})(req({ action: "getWithdrawals" }), res);
  assert.equal(res.statusCode, 502);
  assert.equal(JSON.parse(res.body).code, "UPSTREAM_REDIRECT_REJECTED");
  assert.equal(calls.length, 2);
  assert.doesNotMatch(res.body, /hidden/);
});
test("result redirect loops terminate without replaying a mutation", async () => {
  let calls = 0; const res = sink();
  await createHandler(async () => { calls++; return response(302, "", {
    location: "https://script.googleusercontent.com/macros/echo?key=loop"
  }); })(req({ action: "withdrawal" }), res);
  assert.equal(calls, 2);
  assert.equal(JSON.parse(res.body).code, "UPSTREAM_REDIRECT_LOOP");
});
test("network failure never retries a mutation or exposes exception details", async () => {
  let calls = 0; const logs = [], res = sink();
  await createHandler(async () => { calls++; throw new Error("PRIVATE_PROVIDER_DETAIL"); }, message => logs.push(message))(
    req('{"action":"closeDay"}'), res);
  assert.equal(calls, 1); assert.equal(res.statusCode, 502);
  assert.doesNotMatch(JSON.stringify([res.body, logs]), /PRIVATE/);
});
test("session expiration and authorization denials pass through unchanged", async () => {
  const body = '{"status":"error","sessionExpired":true,"authRequired":true}';
  const res = sink(); await createHandler(async () => response(200, body))(req({ action: "getInvoices" }), res);
  assert.equal(res.body, body); assert.equal(res.statusCode, 200);
});
for (const location of ["https://evil.test/macros/echo", "https://accounts.google.com/ServiceLogin",
  "http://script.googleusercontent.com/macros/echo", "https://script.googleusercontent.com/other",
  "https://script.googleusercontent.com@evil.test/macros/echo"]) {
  test(`redirect outside the approved ContentService endpoint is blocked: ${location}`, async () => {
    let calls = 0; const res = sink();
    await createHandler(async () => { calls++; return response(302, "", { location }); })(req('{"action":"getInvoices"}'), res);
    assert.equal(res.statusCode, 502); assert.equal(calls, 1);
  });
}
for (const body of [undefined, "not-json", "[]", "null", "{}", '{"action":12}']) {
  test(`invalid payload is rejected before contacting Apps Script: ${body}`, async () => {
    let calls = 0; const res = sink();
    await createHandler(async () => { calls++; })(req(body), res);
    assert.equal(res.statusCode, 400); assert.equal(calls, 0);
  });
}
test("cross-origin requests and GET cannot reach the upstream", async () => {
  let calls = 0; const handler = createHandler(async () => { calls++; });
  const cross = req('{"action":"getInvoices"}'); cross.headers.origin = "https://evil.test";
  const first = sink(); await handler(cross, first); assert.equal(first.statusCode, 403);
  const second = sink(); await handler({ ...req("{}"), method: "GET" }, second); assert.equal(second.statusCode, 405);
  assert.equal(calls, 0);
});
test("diagnostic failure cannot replace the relay error", async () => {
  const res = sink();
  await createHandler(async () => { throw new Error("upstream"); }, () => { throw new Error("logger"); })(req('{"action":"getInvoices"}'), res);
  assert.equal(res.statusCode, 502);
});
