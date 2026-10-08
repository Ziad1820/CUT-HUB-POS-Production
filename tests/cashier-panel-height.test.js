"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync(process.env.CUT_HUB_CASHIER_SOURCE_OVERRIDE || "public/assets/js/pages/cashier.js", "utf8");
const start = source.indexOf("    function syncServicesPanelHeight() {");
const end = source.indexOf("    function getServiceUsage()", start);
assert.ok(start >= 0 && end > start);

test("stacked cashier panels clear the old account height on resize", () => {
  const context = { window: { innerWidth: 1440 }, servicesPanel: { style: {} },
    cartPanel: { offsetHeight: 1800 }, requestAnimationFrame: callback => callback() };
  vm.runInNewContext(source.slice(start, end), context);
  context.syncServicesPanelHeight();
  assert.equal(context.servicesPanel.style.height, "1800px");
  for (const width of [1100, 1024, 961, 960, 375]) {
    context.window.innerWidth = width;
    context.servicesPanel.style.height = "1800px";
    context.syncServicesPanelHeight();
    assert.equal(context.servicesPanel.style.height, "", `width ${width}`);
  }
  context.window.innerWidth = 1101;
  context.syncServicesPanelHeight();
  assert.equal(context.servicesPanel.style.height, "1800px");
});
