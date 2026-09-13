"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const publicRoot = path.join(root, "public");

function filesBelow(directory, extension) {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...filesBelow(absolute, extension));
    else if (!extension || entry.name.endsWith(extension)) output.push(absolute);
  }
  return output;
}

const apiPath = path.join(publicRoot, "assets", "js", "core", "api.js");
const runtimeConfigPath = path.join(publicRoot, "assets", "js", "core", "runtime-config.js");
const authPath = path.join(publicRoot, "assets", "js", "core", "auth.js");
const customerBookingPath = path.join(publicRoot, "assets", "js", "pages", "customer-booking.js");
const apiSource = fs.readFileSync(apiPath, "utf8");
const runtimeConfigSource = fs.readFileSync(runtimeConfigPath, "utf8");
const authSource = fs.readFileSync(authPath, "utf8");
const productionApiUrl =
  "https://script.google.com/macros/s/AKfycbzWjM4X4JDTXRYe14oHL8m1Ex3GT9B8kMT6q8yp9eNMw6F6eSEY4zCXTYkyIL7K1ejR/exec";
const stagingApiUrl = "https://script.google.com/macros/s/staging-test/exec";

function resolveRuntimeConfig(hostname, injectedUrl) {
  const window = { location: { hostname }, ROMEO_API_URL: injectedUrl };
  vm.runInNewContext(runtimeConfigSource, { window, URL, Set });
  return window.ROMEO_API_URL;
}

const bypasses = filesBelow(path.join(publicRoot, "assets", "js"), ".js")
  .filter(file => file !== apiPath)
  .filter(file => /\bfetch\s*\(/.test(fs.readFileSync(file, "utf8")))
  .map(file => path.relative(root, file).replace(/\\/g, "/"));
assert.deepEqual(bypasses, [], `Direct frontend fetch callers: ${bypasses.join(", ")}`);

assert.match(fs.readFileSync(customerBookingPath, "utf8"), /RomeoApi\.request\(payload\)/);
assert.match(apiSource, /if \(!API_URL\)[\s\S]*API endpoint is not configured/);
assert.ok(apiSource.indexOf("if (!API_URL)") < apiSource.indexOf("fetch(API_URL"),
  "api.js must reject missing configuration before starting a request");
assert.match(authSource,
  /if \(!window\.RomeoApi \|\| typeof RomeoApi\.request !== "function"\)[\s\S]*API endpoint is not configured/);

assert.equal(resolveRuntimeConfig("cut-hub-pos-production.vercel.app"), productionApiUrl);
assert.equal(resolveRuntimeConfig("cut-hub-pos-production-ziad1820s-projects.vercel.app"), productionApiUrl);
assert.equal(resolveRuntimeConfig("cut-hub-pos-production-ziad1820-ziad1820s-projects.vercel.app"), productionApiUrl);
assert.equal(resolveRuntimeConfig("cut-hub-pos-production.vercel.app", stagingApiUrl), "");
assert.equal(resolveRuntimeConfig("127.0.0.1", stagingApiUrl), stagingApiUrl);
assert.equal(resolveRuntimeConfig("127.0.0.1"), "");
assert.equal(resolveRuntimeConfig("127.0.0.1", "not-a-url"), "");
assert.equal(resolveRuntimeConfig("example.com", productionApiUrl), productionApiUrl);

const publicFiles = filesBelow(publicRoot).filter(file => fs.statSync(file).isFile());
const endpointAuthorities = publicFiles.filter(file =>
  /https:\/\/script\.google\.com\/macros\/s\//i.test(fs.readFileSync(file, "utf8")));
assert.deepEqual(endpointAuthorities, [runtimeConfigPath],
  "runtime-config.js must be the only static Apps Script endpoint authority");
assert.equal(runtimeConfigSource.match(/https:\/\/script\.google\.com\/macros\/s\//ig)?.length, 1);
assert.match(runtimeConfigSource, new RegExp(productionApiUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

const publicText = publicFiles.map(file => fs.readFileSync(file, "utf8")).join("\n");
assert.doesNotMatch(publicText, /(?:URLSearchParams|searchParams)[\s\S]{0,120}(?:ROMEO_API_URL|api[_-]?url)/i);

for (const htmlPath of filesBelow(path.join(publicRoot, "pages"), ".html")) {
  const html = fs.readFileSync(htmlPath, "utf8");
  const apiIndex = html.search(/assets\/js\/core\/api\.js/);
  if (apiIndex === -1) continue;
  const configIndex = html.search(/assets\/js\/core\/runtime-config\.js/);
  assert.ok(configIndex !== -1 && configIndex < apiIndex,
    `${path.basename(htmlPath)} must load runtime-config.js before api.js`);
  const authIndex = html.search(/assets\/js\/core\/auth\.js/);
  if (authIndex !== -1) assert.ok(apiIndex < authIndex,
    `${path.basename(htmlPath)} must load api.js before auth.js`);
}

console.log("Frontend API configuration safety checks passed.");
