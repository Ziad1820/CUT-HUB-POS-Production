"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { fixture } = require("../scripts/audit-system-financial-validation");
const plain = value => JSON.parse(JSON.stringify(value));
function harness() {
  const h = fixture(["040_accounting_daily-closing.gs", "041_accounting_monthly-closing.gs",
    "044_invoices_queries.gs", "046_accounting_withdrawals.gs", "047_accounting_expenses.gs"]), c = h.context;
  const data = { DATA: [], EXPENSES: [], WITHDRAWLS: [], DAILY_CLOSINGS: [], MONTHLY_CLOSINGS: [] };
  const sheets = {};
  for (const name of Object.keys(data)) {
    const headers = [], rows = data[name]; let width = name === "EXPENSES" ? 6 : name === "WITHDRAWLS" ? 5 : 26;
    sheets[name] = { headers, getLastRow: () => rows.length + 1, getMaxColumns: () => width,
      insertColumnsAfter: (after, count) => { assert.equal(after, width); width += count; },
      appendRow: row => rows.push(Array.from(row)), deleteRow: row => rows.splice(row - 2, 1),
      getRange: (row, column, count = 1, columns = 1) => ({
        getValue: () => row === 1 ? headers[column - 1] : rows[row - 2]?.[column - 1],
        setValue: value => { assert.equal(row, 1); headers[column - 1] = value; },
        getValues: () => (row === 1 ? [headers] : rows.slice(row - 2, row - 2 + count)).map(values => Array.from({ length: columns }, (_, i) => values[column - 1 + i] ?? "")),
        setValues: values => values.forEach((value, i) => { rows[row - 2 + i] = Array.from(value); })
      }) };
  }
  Object.assign(c, { TIME_ZONE: "Africa/Cairo", normalizeDigits: String,
    getDateKey: value => value instanceof Date ? value.toISOString().slice(0, 10) : String(value || "").slice(0, 10),
    getDisplayDateTime: String, getRequestedDateKey: input => input.date,
    getActor: () => ({ userName: "owner", displayName: "Fixture" }), actorCanManageUsers: () => true,
    getCairoDateTime: () => "2026-10-17 12:00:00",
    SpreadsheetApp: { getActive: () => ({ getSheetByName: name => sheets[name] || null }) },
    getSheetRangeFromRow2: (sheet, start, width) => sheet.getLastRow() < 2 ? [] : sheet.getRange(2, start, sheet.getLastRow() - 1, width).getValues()
  });
  c.Utilities.parseDate = key => new Date(key + "T00:00:00Z");
  const send = input => c.doPost({ postData: { contents: JSON.stringify(input) } });
  return { c, data, sheets, send };
}
const methods = ["cash", "visa", "instapay", "vodafone_cash"];
function seed(h) {
  methods.forEach((method, i) => {
    h.data.DATA.push(["2026-10-17", "Fixture", "phone" + i, "Service", "", 400, 410, 10, method]);
    assert.equal(h.send({ action: "expense", amount: 10, category: "Fixture", date: "2026-10-17", expenseId: "E" + i, paymentMethod: method }).status, "success");
    assert.equal(h.send({ action: "withdrawal", amount: 20, staffName: "Fixture", date: "2026-10-17", withdrawalId: "W" + i, paymentMethod: method }).status, "success");
  });
  h.data.EXPENSES.push(["Legacy", 25, "", "", "2026-10-17", "OLD-E"]);
  h.data.WITHDRAWLS.push(["Legacy", 15, "", "2026-10-17", "OLD-W"]);
  h.data.EXPENSES.push(["Outside", 9999, "", "", "2026-09-01", "OUT", "visa"]);
}
test("each expense and withdrawal persists, reads and deduplicates its payment method", () => {
  const h = harness(); seed(h);
  assert.equal(h.sheets.EXPENSES.headers[6], "PAYMENT_METHOD"); assert.equal(h.sheets.WITHDRAWLS.headers[5], "PAYMENT_METHOD");
  const range = { fromDate: "2026-10-17", toDate: "2026-10-17" };
  const expenses = h.c.getExpenses(range).expenses, withdrawals = h.c.getWithdrawals(range).withdrawals;
  methods.forEach((method, i) => {
    assert.equal(expenses.find(x => x.expenseId === "E" + i).paymentMethod, method);
    assert.equal(withdrawals.find(x => x.withdrawalId === "W" + i).paymentMethod, method);
  });
  assert.equal(expenses.find(x => x.expenseId === "OLD-E").paymentMethod, "cash");
  const payload = { action: "expense", amount: 10, category: "Fixture", date: "2026-10-17", expenseId: "E2", paymentMethod: "instapay" };
  assert.equal(h.send(payload).duplicate, true);
  assert.equal(h.send({ ...payload, paymentMethod: "visa" }).code, "OPERATION_ID_CONFLICT");
  assert.equal(h.send({ ...payload, expenseId: "BAD", paymentMethod: "unknown" }).code, "INVALID_PAYMENT_METHOD");
  assert.equal(h.data.EXPENSES.length, 6);
});
test("daily native/fallback and monthly range deduct outflows once from their own methods, retaining gross income", () => {
  const h = harness(); seed(h);
  const expected = { cash: 340, visa: 380, instapay: 380, vodafone_cash: 380 };
  const daily = h.c.buildDailyClosingPreview("2026-10-17"), monthly = h.c.calculateIncomeStatementRange("2026-10-01", "2026-10-31");
  assert.deepEqual(plain(daily.paymentBalances), expected); assert.deepEqual(plain(monthly.paymentBalances), expected);
  assert.equal(daily.cashTotal, 410); assert.equal(monthly.totalIncome, 1640);
  assert.equal(monthly.totalExpenses, 65); assert.equal(monthly.totalWithdrawals, 95);
  assert.equal(monthly.netProfit, 1480); assert.equal(daily.netTotal, 1480);
  assert.equal(Object.values(plain(monthly.paymentBalances)).reduce((a, b) => a + b, 0), monthly.netProfit);
  h.c.Utilities.parseDate = () => { throw Error("force date fallback"); };
  assert.deepEqual(plain(h.c.buildDailyClosingPreview("2026-10-17").paymentBalances), expected);
  assert.deepEqual(plain(h.c.calculateIncomeStatementRange("2026-10-01", "2026-10-31").paymentBalances), expected);
});
test("daily and monthly snapshots persist authoritative balances and do not accept forged client summaries", () => {
  const h = harness(); seed(h);
  assert.equal(h.c.closeDay({ date: "2026-10-17", paymentBalances: { cash: 99999 } }).status, "success");
  const daily = plain(h.c.readDailyClosings()[0].paymentBalances);
  assert.deepEqual(daily, { cash: 340, visa: 380, instapay: 380, vodafone_cash: 380 });
  assert.equal(h.c.monthLock({ month: "2026-10", fromDate: "2026-10-01", toDate: "2026-10-31", summary: { netProfit: 99999 } }).status, "success");
  assert.deepEqual(plain(h.c.readMonthlyClosings()[0].paymentBalances), daily);
  h.data.EXPENSES[0][1] = 100;
  assert.deepEqual(plain(h.c.readDailyClosings()[0].paymentBalances), daily);
  assert.deepEqual(plain(h.c.readMonthlyClosings()[0].paymentBalances), daily);
});
test("negative method movements remain visible and deleting an identified expense restores only that method", () => {
  const h = harness();
  h.send({ action: "expense", amount: 50, expenseId: "E1", date: "2026-10-17", paymentMethod: "instapay" });
  assert.equal(h.c.calculateIncomeStatementRange("2026-10-17", "2026-10-17").paymentBalances.instapay, -50);
  assert.equal(h.c.deleteExpense({ expenseId: "E1" }).status, "success");
  assert.equal(h.c.calculateIncomeStatementRange("2026-10-17", "2026-10-17").paymentBalances.instapay, 0);
});
test("legacy column capacities, old snapshots, and conflicting headers are handled without rewriting old data", () => {
  const h = harness();
  h.data.EXPENSES.push(["Legacy", 5, "", "", "2026-10-17", "OLD"]);
  assert.equal(h.c.getExpenses({ fromDate: "2026-10-17", toDate: "2026-10-17" }).expenses[0].paymentMethod, "cash");
  h.data.DAILY_CLOSINGS.push(["OLD", "2026-10-17", 100, 100, 0, 0, 0, 5, 10, 85, "owner", "Fixture", "time"]);
  assert.equal(h.c.readDailyClosings()[0].paymentBalances.cash, 85);
  h.data.MONTHLY_CLOSINGS.push(["2026-09", "2026-09-01", "2026-09-30", 100, 5, 10, 85, "Fixture", "time"]);
  assert.equal(h.c.readMonthlyClosings()[0].paymentBalances, null);
  h.sheets.WITHDRAWLS.headers[5] = "OTHER_DATA";
  assert.equal(h.send({ action: "withdrawal", amount: 1, withdrawalId: "CONFLICT", paymentMethod: "cash" }).status, "error");
  assert.equal(h.data.WITHDRAWLS.length, 0); assert.equal(h.sheets.WITHDRAWLS.headers[5], "OTHER_DATA");
});
test("English Vodafone Cash and Arabic aliases do not get classified as generic cash", () => {
  const h = harness();
  for (const value of ["vodafone cash", "vodafone_cash", "فودافون كاش"]) {
    assert.equal(h.c.normalizePaymentMethod(value), "vodafone_cash"); assert.equal(h.c.financePaymentMethod(value), "vodafone_cash");
  }
});

test('income summary retains server method balances instead of subtracting everything from cash',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),source=fs.readFileSync('public/pages/income-statement.html','utf8');
 const c=vm.createContext({toAmount:x=>Number(x)||0});vm.runInContext(source.slice(source.indexOf('    function normalizeSummary('),source.indexOf('    function renderSummary(')),c);
 const result=c.normalizeSummary({totalSales:100,cashTotal:100,totalExpenses:25,totalWithdrawals:0,paymentBalances:{cash:100,visa:0,instapay:-25,vodafone_cash:0}});assert.equal(result.paymentBalances.cash,100);assert.equal(result.paymentBalances.instapay,-25);assert.equal(result.netProfit,75);
});
