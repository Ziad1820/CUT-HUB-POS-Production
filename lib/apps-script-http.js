"use strict";
const https = require("node:https");
const settings = require("../config/apps-script-proxy.json");

function createGoogleRequest(requestHTTPS = https.request) {
  return function requestGoogle(target, options) {
    const url = new URL(target);
    const execution = url.hostname === "script.google.com" && url.pathname === `/macros/s/${settings.deploymentId}/exec` &&
      (!url.search || (/^\?relayRequest=[0-9a-f-]{36}$/.test(url.search)));
    const content = url.hostname === "script.googleusercontent.com" && url.pathname === "/macros/echo";
    if (url.protocol !== "https:" || url.username || url.password || url.port || (!execution && !content)) {
      return Promise.reject(new Error("UPSTREAM_HOST_REJECTED"));
    }
    return new Promise((resolve, reject) => {
      const body = options.method === "POST" ? String(options.body || "") : null;
      const headers = { "Cache-Control": "no-cache" };
      if (body !== null) {
        headers["Content-Type"] = "text/plain;charset=utf-8";
        headers["Content-Length"] = Buffer.byteLength(body);
      }
      // Each Google execution and one-time result gets a fresh TLS connection.
      // Reusing a provider-closed socket must never cause a POST replay.
      const request = requestHTTPS({ protocol: "https:", hostname: url.hostname,
        path: url.pathname + url.search, method: options.method, headers,
        agent: false, signal: options.signal }, response => {
        const chunks = []; let bytes = 0;
        response.on("data", chunk => {
          bytes += chunk.length;
          if (bytes > settings.maxResponseBytes) request.destroy(new Error("UPSTREAM_BODY_LIMIT"));
          else chunks.push(chunk);
        });
        response.on("error", reject);
        response.on("aborted", () => reject(new Error("UPSTREAM_STREAM_ABORTED")));
        response.on("end", () => {
          const buffer = Buffer.concat(chunks), status = response.statusCode || 502;
          resolve({ status, ok: status >= 200 && status < 300,
            headers: { get(name) {
              const value = response.headers[name.toLowerCase()];
              return typeof value === "string" ? value : null;
            } }, text: async () => buffer.toString("utf8") });
        });
      });
      request.on("error", reject);
      request.end(body);
    });
  };
}
module.exports = { createGoogleRequest, requestGoogle: createGoogleRequest() };
