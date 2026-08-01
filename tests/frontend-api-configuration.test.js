"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

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
const authPath = path.join(publicRoot, "assets", "js", "core", "auth.js");
const customerBookingPath = path.join(publicRoot, "assets", "js", "pages", "customer-booking.js");
const apiSource = fs.readFileSync(apiPath, "utf8");
const authSource = fs.readFileSync(authPath, "utf8");

const bypasses = filesBelow(path.join(publicRoot, "assets", "js"), ".js")
  .filter(file => file !== apiPath)
  .filter(file => /\bfetch\s*\(/.test(fs.readFileSync(file, "utf8")))
  .map(file => path.relative(root, file).replace(/\\/g, "/"));
assert.deepEqual(bypasses, [], `Direct frontend fetch callers: ${bypasses.join(", ")}`);

assert.match(fs.readFileSync(customerBookingPath, "utf8"), /RomeoApi\.request\(payload\)/);
assert.match(apiSource, /if \(!API_URL\)[\s\S]*API endpoint is not configured/);
assert.match(authSource,
  /if \(!window\.RomeoApi \|\| typeof RomeoApi\.request !== "function"\)[\s\S]*API endpoint is not configured/);

const publicText = filesBelow(publicRoot).filter(file => fs.statSync(file).isFile())
  .map(file => fs.readFileSync(file, "utf8")).join("\n");
assert.doesNotMatch(publicText, /https:\/\/script\.google\.com\/macros\/s\//i);
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
