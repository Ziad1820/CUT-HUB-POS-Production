"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { fixture, invoice, runAudit } = require("../scripts/audit-system-financial-validation");

for (const [field, value] of [["total", -1], ["total", "abc"], ["total", null], ["total", true],
  ["total", {}], ["total", ""], ["total", "Infinity"], ["total", 1e30], ["paidAmount", -1],
  ["tipAmount", -1], ["tipAmount", null], ["paidAmount", null], ["discountAmount", null],
  ["discountPercent", -1], ["discountPercent", 101], ["discountAmount", -1],
  ["payment", "unknown"], ["payment", "not cash"], ["payment", ""]]) {
  test(`invoice rejects ${field}=${JSON.stringify(value)} before writing`, () => {
    const result = invoice({ total: 100, paidAmount: 100, [field]: value });
    assert.equal(result.accepted, false); assert.equal(result.simulatedRows, 0);
  });
}
test("valid Arabic and English payment aliases and rounded discount totals remain accepted", () => {
  for (const payment of ["cash", "Visa", "instapay", "vodafone_cash", "نقدي", "فيزا", "انستا باي", "فودافون كاش"]) {
    assert.equal(invoice({ total: 90, paidAmount: 100, tipAmount: 10, discountPercent: 10,
      discountAmount: 10, subtotalBeforePremium: 100, premiumExtra: 0, payment }).accepted, true, payment);
  }
  assert.equal(invoice({ total: 0, paidAmount: 0, discountPercent: 100 }).accepted, true);
});
test("inconsistent gross, discount, total, or tender/tip is rejected", () => {
  for (const input of [{ total: 100, paidAmount: 10 }, { total: 100, paidAmount: 100, tipAmount: 20 },
    { total: 80, subtotalBeforePremium: 100, discountAmount: 10, discountPercent: 10 },
    { total: 0, subtotalBeforePremium: 100, discountAmount: 200, discountPercent: 100 }]) {
    assert.equal(invoice(input).simulatedRows, 0);
  }
});
test("invoice edit uses the same financial guard before accessing the sheet", () => {
  const h = fixture(["043_invoices_mutations.gs"]);
  for (const input of [{ total: -5 }, { total: 5, discountPercent: 120 }, { total: 5, payment: "unknown" }]) {
    const result = h.context.updateInvoice({ payment: "cash", ...input });
    assert.match(result.code, /INVALID_/); assert.equal(h.rows.length, 0);
  }
});
test("invoice edit can explicitly clear previous tip and discounts", () => {
  const h = fixture(["043_invoices_mutations.gs"]), c = h.context;
  const row = ["2026-10-17", "Fixture", "01000000000", "Fixture", "", 90, 100, 10, "cash", "Fixture", "", 10, 10, "request-id"];
  h.rows.push(row);
  c.getInvoiceRequestIdColumn = () => 14; c.TIME_ZONE = "Africa/Cairo";
  c.getDateKey = value => String(value).slice(0, 10); c.getDisplayDateTime = value => value;
  const sheet = c.SpreadsheetApp.getActive().getSheetByName();
  sheet.getRange = (r, col, count = 1, width = 1) => ({ getValue: () => row[col - 1],
    getValues: () => [row.slice(col - 1, col - 1 + width)], setValues: values => row.splice(0, 13, ...values[0]) });
  const result = c.updateInvoice({ rowNumber: 2, invoiceId: "DATA-2", total: 100, paidAmount: 100,
    tipAmount: 0, discountPercent: 0, discountAmount: 0, payment: "cash" });
  assert.equal(result.status, "success"); assert.equal(row[7], 0); assert.equal(row[11], 0); assert.equal(row[12], 0);
});

for (const [file, route, key] of [["046_accounting_withdrawals.gs", "withdrawal", "withdrawalId"],
  ["047_accounting_expenses.gs", "expense", "expenseId"]]) {
  const setup = () => {
    const h = fixture([file]);
    const send = input => h.context.doPost({ postData: { contents: JSON.stringify({ action: route,
      amount: 50, staffName: "Fixture", category: "Fixture", title: "Fixture", date: "2026-10-17", [key]: "stable-id", ...input }) } });
    return { ...h, send };
  };
  test(`${route}: durable deduplication, changed payload conflicts and distinct IDs remain distinct`, () => {
    const h = setup(); assert.equal(h.send({}).status, "success");
    assert.equal(h.send({}).duplicate, true); assert.equal(h.rows.length, 1);
    for (const change of [{ amount: 60 }, { note: "changed" }, { date: "2026-10-18" },
      route === "expense" ? { title: "changed" } : { staffName: "changed" }]) {
      assert.equal(h.send(change).code, "OPERATION_ID_CONFLICT");
    }
    assert.equal(h.rows.length, 1);
    assert.equal(h.send({ [key]: "distinct-id" }).status, "success"); assert.equal(h.rows.length, 2);
  });
  test(`${route}: rejects missing ID and malformed/nonpositive amounts`, () => {
    const h = setup();
    for (const amount of [-10, 0, null, true, {}, "", "oops", "Infinity"]) assert.equal(h.send({ amount }).status, "error");
    assert.equal(h.send({ [key]: "" }).code, "INVALID_OPERATION_ID"); assert.equal(h.rows.length, 0);
  });
  test(`${route}: lock covers lookup and append; committed retry succeeds even after date locks`, () => {
    const h = setup(); let held = false;
    h.context.LockService.getScriptLock = () => ({ waitLock() { held = true; }, releaseLock() { held = false; } });
    const sheet = h.context.SpreadsheetApp.getActive().getSheetByName(), append = sheet.appendRow, range = sheet.getRange;
    sheet.appendRow = row => { assert.equal(held, true); append(row); };
    sheet.getRange = (...args) => { assert.equal(held, true); return range(...args); };
    h.send({}); assert.equal(held, false);
    h.context.getLockedDateError = () => "locked";
    assert.equal(h.send({}).duplicate, true); assert.equal(held, false);
    assert.equal(h.send({ [key]: "new-id" }).locked, true); assert.equal(h.rows.length, 1);
  });
  test(`${route}: lost append acknowledgement and logging failure never duplicate committed rows`, () => {
    const h = setup(), sheet = h.context.SpreadsheetApp.getActive().getSheetByName(), append = sheet.appendRow;
    sheet.appendRow = row => { append(row); throw Error("lost acknowledgement"); };
    assert.equal(h.send({}).code, "FINANCE_SAVE_UNCONFIRMED");
    assert.equal(h.send({}).duplicate, true); assert.equal(h.rows.length, 1);
    sheet.appendRow = append;
    h.context.logActivity = () => { throw Error("logging unavailable"); };
    assert.equal(h.send({ [key]: "new-id" }).auditPending, true);
    assert.equal(h.send({ [key]: "new-id" }).duplicate, true); assert.equal(h.rows.length, 2);
  });
}
test("cashier payload uses stable staff ID and separate code, including when the code differs", () => {
  const source = fs.readFileSync(process.env.CUT_HUB_CASHIER_SOURCE_OVERRIDE || "public/assets/js/pages/cashier.js", "utf8");
  const start = source.indexOf("const barberId = String(");
  const end = source.indexOf("const paymentMethod = getSelectedPaymentMethod();", start);
  const result = vm.runInNewContext(source.slice(start, end) + "({barberId, barberCode, barberName})", {
    selectedBarberOption: { dataset: { staffId: "STAFF-FIXTURE-123", staffCode: "C09", staffName: "Fixture" } }, barber: "Fixture"
  });
  assert.equal(result.barberId, "STAFF-FIXTURE-123"); assert.equal(result.barberCode, "C09");
  assert.doesNotMatch(source, /BARBER_NAMES_BY_CODE|DEFAULT_BARBER_STAFF/);
});
test("all six financial audit cases are repaired; formula input remains separately tracked", () => {
  const result = runAudit();
  assert.ok(result.controls.every(item => item.passed));
  for (const item of result.cases.filter(item => item.id.startsWith("FIN-"))) {
    if (item.expectedRejected) { assert.equal(item.accepted, false); assert.equal(item.simulatedRows, 0); }
    else assert.equal(item.simulatedRows, 1);
  }
  assert.equal(result.findingCount, 1);
  assert.equal(result.cases.find(item => item.id === "TEXT-01").rawFormulaPrefix, true);
});
