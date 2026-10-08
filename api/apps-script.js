"use strict";

const settings = require("../config/apps-script-proxy.json");
const { requestGoogle } = require("../lib/apps-script-http");
const { randomUUID } = require("node:crypto");
const ENDPOINT = `https://script.google.com/macros/s/${settings.deploymentId}/exec`;

function createHandler(fetchUpstream = requestGoogle, log = console.warn) {
  return async function handler(req, res) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("CDN-Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const fail = (httpStatus, code, mayHaveCompleted = false) => {
      res.statusCode = httpStatus;
      res.end(JSON.stringify({ status: "error", code, message: "تعذر استلام رد الخدمة. حاول تحديث البيانات.",
        requestMayHaveCompleted: mayHaveCompleted }));
    };
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return fail(405, "METHOD_NOT_ALLOWED");
    }
    const origin = req.headers?.origin;
    if (origin) {
      try {
        const parsed = new URL(origin);
        if (parsed.protocol !== "https:" || parsed.host !== req.headers.host) return fail(403, "ORIGIN_NOT_ALLOWED");
      } catch (_) { return fail(403, "ORIGIN_NOT_ALLOWED"); }
    }
    let body;
    try {
      body = typeof req.body === "string" ? req.body : Buffer.isBuffer(req.body)
        ? req.body.toString("utf8") : JSON.stringify(req.body);
      if (!body) return fail(400, "INVALID_JSON_REQUEST");
      if (Buffer.byteLength(body) > settings.maxRequestBytes) return fail(413, "REQUEST_TOO_LARGE");
      const payload = JSON.parse(body);
      if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
          typeof payload.action !== "string" || !payload.action.trim()) return fail(400, "INVALID_REQUEST");
    } catch (_) { return fail(400, "INVALID_JSON_REQUEST"); }

    let phase = "EXECUTION";
    let upstreamStatus = null;
    let errorClass = null;
    let redirectClass = null;
    const report = () => {
      try { log(JSON.stringify({ event: "APPS_SCRIPT_RELAY_FAILURE", phase, upstreamStatus, errorClass, redirectClass })); } catch (_) {}
    };
    try {
      const signal = AbortSignal.timeout(settings.timeoutMs);
      let response = await fetchUpstream(`${ENDPOINT}?relayRequest=${randomUUID()}`, {
        method: "POST", redirect: "manual", cache: "no-store", signal,
        headers: { "Content-Type": "text/plain;charset=utf-8" }, body
      });
      upstreamStatus = response.status;
      if ([302, 303].includes(response.status)) {
        const location = response.headers.get("location");
        const url = location && new URL(location, ENDPOINT);
        if (!url || url.protocol !== "https:" || url.hostname !== "script.googleusercontent.com" ||
            url.pathname !== "/macros/echo" || url.username || url.password || url.port) {
          return fail(502, "UPSTREAM_REDIRECT_REJECTED", true);
        }
        // Execution is already complete. Fetch its one-time response with GET.
        // Never replay the POST, including after a failed content redirect.
        phase = "CONTENT";
        const visited = new Set();
        let contentUrl = url;
        for (let hop = 0; hop < 4; hop++) {
          if (visited.has(contentUrl.href)) return fail(502, "UPSTREAM_REDIRECT_LOOP", true);
          visited.add(contentUrl.href);
          response = await fetchUpstream(contentUrl.href, { method: "GET", redirect: "manual", cache: "no-store", signal });
          upstreamStatus = response.status;
          if (![302, 303, 307, 308].includes(response.status)) break;
          const nextLocation = response.headers.get("location");
          const next = nextLocation && new URL(nextLocation, contentUrl);
          const allowed = next && next.protocol === "https:" && next.hostname === "script.googleusercontent.com" &&
            next.pathname === "/macros/echo" && !next.username && !next.password && !next.port;
          redirectClass = allowed ? "GOOGLE_CONTENT" : next?.hostname === "accounts.google.com" ? "GOOGLE_AUTH"
            : next?.hostname === "www.google.com" && next.pathname.startsWith("/sorry/") ? "GOOGLE_RATE_LIMIT" : "REJECTED";
          if (!allowed) {
            report();
            return fail(502, "UPSTREAM_REDIRECT_REJECTED", true);
          }
          contentUrl = next;
        }
      }
      const media = String(response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
      if (!response.ok || media !== "application/json") {
        report();
        return fail(502, "UPSTREAM_RESPONSE_UNAVAILABLE", true);
      }
      const source = await response.text();
      if (Buffer.byteLength(source) > settings.maxResponseBytes) return fail(502, "UPSTREAM_RESPONSE_TOO_LARGE", true);
      const result = JSON.parse(source);
      if (!result || typeof result !== "object" || Array.isArray(result)) return fail(502, "UPSTREAM_INVALID_JSON", true);
      res.statusCode = 200;
      res.end(source);
    } catch (error) {
      // No bodies, URLs, cookies, session tokens, or provider HTML in logs.
      const code = error.code || error.cause?.code;
      errorClass = ["ECONNRESET", "ETIMEDOUT", "ABORT_ERR", "UND_ERR_SOCKET", "UND_ERR_CONNECT_TIMEOUT"].includes(code)
        ? code : error.name === "TimeoutError" ? "TIMEOUT" : "OTHER";
      report();
      return fail(502, "UPSTREAM_TRANSPORT_ERROR", true);
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
