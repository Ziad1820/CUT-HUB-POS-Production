const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "public/assets/js/pages/bookings.js"), "utf8");
const html = fs.readFileSync(path.join(root, "public/pages/bookings.html"), "utf8");

function functionSource(name, nextName) {
  const start = source.indexOf(`function ${name}`);
  const end = source.indexOf(`function ${nextName}`, start + 1);
  assert.ok(start >= 0 && end > start, `${name} source must be present`);
  return source.slice(start, end);
}

test("Internal Booking has one required canonical branch control", () => {
  assert.equal((html.match(/id="bookingBranch"/g) || []).length, 1);
  assert.match(html, /<select id="bookingBranch" required>/);
  assert.equal((source.match(/branch:\s*\$\("bookingBranch"\)/g) || []).length, 1);
  assert.doesNotMatch(source, /state\.branchId\s*=/);
});

test("loadInternalSlots blocks without a branch and sends the selected branch", () => {
  const body = functionSource("loadInternalSlots", "scheduleInternalAvailabilityPoll");
  assert.match(body, /const branchId = elements\.branch\.value;/);
  const guard = body.indexOf("if (!branchId)");
  const request = body.indexOf("RomeoApi.request");
  assert.ok(guard >= 0 && request > guard, "missing branch must be rejected before the request");
  assert.match(body, /action: "getPublicBookingOptions", branchId,/);
});

test("CUT_HUB_MAIN propagates through the canonical branch value without a default constant", () => {
  assert.match(source, /elements\.branch\.value = String\(branches\[0\]\.branchId\)/);
  assert.doesNotMatch(source, /["']CUT_HUB_MAIN["']/);
});

test("branch changes invalidate stale slots and availability token", () => {
  const loadServices = functionSource("loadServiceOptions", "loadBranchOptions");
  const clear = functionSource("clearInternalAvailability", "changeInternalBranch");
  const change = functionSource("changeInternalBranch", "renderServiceOptions");
  assert.match(clear, /availabilityRequestSequence \+= 1/);
  assert.match(clear, /availabilityToken = ""/);
  assert.match(clear, /state\.barbers = \[\]/);
  assert.match(clear, /elements\.time\.disabled = true/);
  assert.match(change, /clearInternalAvailability\(\)/);
  assert.match(change, /state\.services = \[\]/);
  assert.match(source, /elements\.branch\.addEventListener\("change"/);
  assert.match(source, /if \(elements\.branch\.value !== branchId\) return;/);
  assert.match(loadServices, /elements\.slotStatus\.textContent = ""/);
});

test("booking submission uses the same required canonical branch", () => {
  const body = functionSource("createBooking", "resetForm");
  assert.match(body, /const branchId = elements\.branch\.value;/);
  const guard = body.indexOf("if (!branchId)");
  const request = body.indexOf("RomeoApi.request");
  assert.ok(guard >= 0 && request > guard, "missing branch must block booking creation");
  assert.match(body, /action: "createBooking", branchId,/);
});

test("reason-modal mutations refresh after the modal closes", () => {
  const body = functionSource("reasonModal", "whatsapp");
  assert.match(body, /setTimeout\(\(\) => fetchBookings\(\{ silent: true \}\), 0\)/);
});
