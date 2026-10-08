"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync("public/assets/js/pages/dashboard-analysis.js", "utf8");

function setup(request) {
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, { value: "", textContent: "", disabled: false,
      classList: { add() {} }, addEventListener() {} });
    return nodes.get(id);
  };
  // Exercise the real lifecycle and storage reads without unrelated chart DOM.
  const instrumented = source.replace(/  applyAnalyticsLanguage\(\);\s*RomeoDateRange\.setCurrentMonth[\s\S]*?loadInvoices\(\);\s*\}\)\(\);\s*$/, `
    renderAll = () => { readStore("inventory"); readStore("inventory-log"); };
    renderFilterOptions = () => {};
    window.testAnalysis = { loadInvoices, applyFilters, readStore };
  })();`);
  const window = { addEventListener() {} };
  vm.runInNewContext(instrumented, { window, document: { getElementById: node, querySelectorAll: () => [] },
    localStorage: { getItem: key => key === "romeo-pos-language" ? "ar" : "[]" },
    RomeoDateRange: { validate: () => ({ ok: true }) }, RomeoApi: { request }, console: { error() {} } });
  return { api: window.testAnalysis, button: node("analysisRefreshBtn"), status: node("analysisStatus") };
}

test("refresh shows one loading indicator and clears it after success and later filter rendering", async () => {
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  const ui = setup(async () => { await pending; return { status: "success", invoices: [], expenses: [], withdrawals: [] }; });
  const completion = ui.api.loadInvoices();
  assert.equal(ui.button.disabled, true);
  assert.equal(ui.button.textContent, "جاري التحديث...");
  assert.equal(ui.status.textContent, "");
  finish(); await completion;
  assert.equal(ui.button.disabled, false);
  assert.equal(ui.button.textContent, "تحديث");
  assert.equal(ui.status.textContent, "لا توجد فواتير للتحليل.");
  ui.api.applyFilters();
  assert.equal(ui.button.textContent, "تحديث");
  assert.equal(ui.status.textContent, "لا توجد فواتير للتحليل.");
});

test("failure preserves the error and restores the refresh button despite storage reads", async () => {
  const ui = setup(async () => { throw new Error("offline"); });
  await ui.api.loadInvoices();
  assert.equal(ui.button.disabled, false);
  assert.equal(ui.button.textContent, "تحديث");
  assert.equal(ui.status.textContent, "تعذر تحميل التحليلات.");
  ui.api.readStore("inventory");
  assert.equal(ui.status.textContent, "تعذر تحميل التحليلات.");
  assert.equal(ui.button.textContent, "تحديث");
});
