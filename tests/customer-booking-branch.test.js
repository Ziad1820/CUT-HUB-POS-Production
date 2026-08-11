const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "public/assets/js/pages/customer-booking.js"), "utf8");
const html = fs.readFileSync(path.join(root, "public/pages/customer-booking.html"), "utf8");

function functionSource(name, nextName) {
  const start = source.indexOf(`function ${name}`);
  const end = nextName
    ? source.indexOf(`function ${nextName}`, start + 1)
    : source.indexOf("\n\n  elements.services.addEventListener", start + 1);
  assert.ok(start >= 0 && end > start, `${name} source must be present`);
  return source.slice(start, end);
}

test("Customer Booking has one required canonical branch selector", () => {
  assert.equal((html.match(/id="publicBranch"/g) || []).length, 1);
  assert.match(html, /id="publicBranch" required/);
  assert.equal((source.match(/branch:\s*\$\("publicBranch"\)/g) || []).length, 1);
  assert.doesNotMatch(source, /["']CUT_HUB_MAIN["']/);
});

test("public availability sends the selected branch ID and rejects stale branch responses", () => {
  const body = functionSource("loadOptions", "scheduleAvailabilityPoll");
  assert.match(body, /const branchId = elements\.branch\.value/);
  assert.match(body, /action: "getPublicBookingOptions", branchId,/);
  assert.match(body, /elements\.branch\.value !== branchId/);
});

test("branch changes clear dependent services, barbers, slots, and token", () => {
  const clear = functionSource("clearPublicAvailability", "changePublicBranch");
  const change = functionSource("changePublicBranch", "loadOptions");
  assert.match(clear, /availabilityRequestSequence \+= 1/);
  assert.match(clear, /availabilityToken = ""/);
  assert.match(clear, /state\.barbers = \[\]/);
  assert.match(clear, /state\.services = \[\]/);
  assert.match(clear, /state\.selectedServiceIds\.clear\(\)/);
  assert.match(clear, /elements\.barberGrid\.replaceChildren\(\)/);
  assert.match(change, /clearPublicAvailability\(\{ clearServices: true \}\)/);
  assert.match(source, /elements\.branch\.addEventListener\("change", changePublicBranch\)/);
});

test("an in-flight old-branch request schedules the canonical branch reload", () => {
  const body = functionSource("loadOptions", "scheduleAvailabilityPoll");
  assert.match(body, /requestSequence !== state\.availabilityRequestSequence && elements\.branch\.value/);
  assert.match(body, /loadOptions\(\{ initial: true \}\)/);
});

test("date and service changes invalidate in-flight availability before reloading", () => {
  const services = functionSource("changePublicServices", "changePublicDate");
  const date = functionSource("changePublicDate", "loadOptions");
  const reset = functionSource("resetBooking");
  assert.match(services, /clearPublicAvailability\(\)/);
  assert.match(services, /loadOptions\(\)/);
  assert.match(date, /clearPublicAvailability\(\)/);
  assert.match(date, /loadOptions\(\)/);
  assert.match(reset, /clearPublicAvailability\(\)/);
  assert.match(source, /elements\.services\.addEventListener\("change", changePublicServices\)/);
  assert.match(source, /elements\.date\.addEventListener\("change", changePublicDate\)/);
});

test("public booking submission uses the same selected branch", () => {
  const body = functionSource("submitBooking", "showSuccess");
  assert.match(body, /action: "createPublicBookingRequest"/);
  assert.match(body, /branchId: elements\.branch\.value/);
});
