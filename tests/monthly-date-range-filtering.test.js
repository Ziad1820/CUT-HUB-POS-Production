const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const dateRange = require(path.join(ROOT, "public/assets/js/utils/date-range.js"));

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("current month uses Cairo and includes the correct last day", () => {
  assert.deepEqual(dateRange.currentMonth(new Date("2026-08-13T12:00:00Z")), {
    fromDate: "2026-08-01",
    toDate: "2026-08-31"
  });
  assert.deepEqual(dateRange.currentMonth(new Date("2026-04-10T12:00:00Z")), {
    fromDate: "2026-04-01",
    toDate: "2026-04-30"
  });
});

test("month boundaries handle leap years and year transitions", () => {
  assert.equal(dateRange.currentMonth(new Date("2028-02-10T12:00:00Z")).toDate, "2028-02-29");
  assert.equal(dateRange.currentMonth(new Date("2027-02-10T12:00:00Z")).toDate, "2027-02-28");
  assert.deepEqual(dateRange.currentMonth(new Date("2026-12-31T12:00:00Z")), {
    fromDate: "2026-12-01",
    toDate: "2026-12-31"
  });
  assert.deepEqual(dateRange.currentMonth(new Date("2027-01-01T12:00:00Z")), {
    fromDate: "2027-01-01",
    toDate: "2027-01-31"
  });
});

test("today follows Cairo instead of UTC near midnight", () => {
  assert.equal(dateRange.today(new Date("2026-07-31T22:30:00Z")), "2026-08-01");
});

test("validation rejects empty, malformed, impossible, and reversed ranges", () => {
  assert.equal(dateRange.validate("", "2026-08-31").code, "DATE_RANGE_REQUIRED");
  assert.equal(dateRange.validate("2026-02-30", "2026-03-01").code, "DATE_RANGE_REQUIRED");
  assert.equal(dateRange.validate("2026-09-01", "2026-08-31").code, "DATE_RANGE_INVALID");
  assert.deepEqual(dateRange.validate("2026-08-01", "2026-08-31"), {
    ok: true,
    fromDate: "2026-08-01",
    toDate: "2026-08-31"
  });
});

test("inclusive membership includes both endpoints and supports cross-month ranges", () => {
  assert.equal(dateRange.includes("2026-08-01", "2026-08-01", "2026-08-31"), true);
  assert.equal(dateRange.includes("2026-08-31", "2026-08-01", "2026-08-31"), true);
  assert.equal(dateRange.includes("2026-09-01", "2026-08-15", "2026-09-15"), true);
  assert.equal(dateRange.includes("2026-09-16", "2026-08-15", "2026-09-15"), false);
});

test("period aggregation isolates months and supports an inclusive custom range", () => {
  const rows = [
    { date: "2026-07-10", amount: 100 },
    { date: "2026-07-20", amount: 40 },
    { date: "2026-08-01", amount: 60 },
    { date: "2026-08-10", amount: 140 },
    { date: "2026-08-31", amount: 5 }
  ];
  const total = (fromDate, toDate) => rows
    .filter(row => dateRange.includes(row.date, fromDate, toDate))
    .reduce((sum, row) => sum + row.amount, 0);

  assert.equal(total("2026-08-01", "2026-08-31"), 205);
  assert.equal(total("2026-07-01", "2026-07-31"), 140);
  assert.equal(total("2026-07-20", "2026-08-10"), 240);
});

test("staff configured values carry forward while period activity is isolated", () => {
  const configuredSalary = 3300;
  const configuredBonus = 100;
  const sales = [
    { date: "2026-07-31", amount: 500 },
    { date: "2026-08-01", amount: 200 }
  ];
  const augustSales = sales
    .filter(row => dateRange.includes(row.date, "2026-08-01", "2026-08-31"))
    .reduce((sum, row) => sum + row.amount, 0);

  assert.equal(augustSales, 200);
  assert.equal(configuredSalary, 3300);
  assert.equal(configuredBonus, 100);
});

test("Dashboard analysis defaults to current month and sends an explicit range", () => {
  const source = read("public/assets/js/pages/dashboard-analysis.js");
  assert.match(source, /RomeoDateRange\.setCurrentMonth\(elements\.fromDate, elements\.toDate\)/);
  assert.match(source, /action:\s*"getInvoices",\s*fromDate:\s*range\.fromDate,\s*toDate:\s*range\.toDate/s);
  assert.match(source, /action:\s*"getExpenses",\s*fromDate:\s*range\.fromDate,\s*toDate:\s*range\.toDate/);
  assert.match(source, /action:\s*"getWithdrawals",\s*fromDate:\s*range\.fromDate,\s*toDate:\s*range\.toDate/);
  assert.match(source, /periodExpenses\.forEach/);
  assert.match(source, /periodWithdrawals\.forEach/);
  assert.match(source, /addEventListener\("change", invalidateDateRange\)/);
});

test("Withdrawals and Expenses send explicit ranges and reset to current month", () => {
  for (const file of ["withdrawals.js", "expenses.js"]) {
    const source = read(`public/assets/js/pages/${file}`);
    assert.match(source, /RomeoDateRange\.setCurrentMonth\(elements\.filterFromDate, elements\.filterToDate\)/);
    assert.match(source, /fromDate:\s*range\.fromDate,\s*toDate:\s*range\.toDate/);
    assert.doesNotMatch(source, /filterFromDate\.value\s*=\s*""/);
  }
});

test("Staff accounting applies one selected range to clients, sales, and withdrawals", () => {
  const source = read("public/pages/staff-accounting.html");
  assert.match(source, /id="staffFromDate"/);
  assert.match(source, /id="staffToDate"/);
  assert.match(source, /action:\s*"getWithdrawals",\s*fromDate:\s*range\.fromDate,\s*toDate:\s*range\.toDate/s);
  assert.match(source, /action:\s*"staffClientCount",[\s\S]*?fromDate:\s*range\.fromDate,[\s\S]*?toDate:\s*range\.toDate/);
  assert.match(source, /action:\s*"staffTotalSales",[\s\S]*?fromDate:\s*range\.fromDate,[\s\S]*?toDate:\s*range\.toDate/);
  assert.equal((source.match(/id="staffFromDate"/g) || []).length, 1);
  assert.equal((source.match(/id="staffToDate"/g) || []).length, 1);
});

test("backend preserves unfiltered compatibility and filters all target reads inclusively", () => {
  const source = read("scripts/app-script-final-owner-access.js");
  assert.match(source, /if \(!hasFrom && !hasTo\) return null/);
  assert.match(source, /!range\.fromDate \|\| dateKey >= range\.fromDate/);
  assert.match(source, /!range\.toDate \|\| dateKey <= range\.toDate/);
  assert.match(source, /getOptionalDateRange\(data, filters\)/);
  assert.match(source, /getOptionalDateRange\(data, null, true\)/);
  assert.match(source, /filter\(withdrawal => isDateInOptionalRange\(withdrawal\.date, range\)\)/);
  assert.match(source, /filter\(expense => isDateInOptionalRange\(expense\.date, range\)\)/);
  assert.match(source, /rowBarber === barber && isDateInOptionalRange\(row\[0\], range\)/);
  assert.match(source, /rowBarber !== barber \|\| !isDateInOptionalRange\(row\[0\], range\)/);
});

test("canonical financial reads return a scoped empty result when legacy sheets are absent", () => {
  const source = read("scripts/app-script-final-owner-access.js");
  const invoices = source.slice(source.indexOf("function getInvoices(data)"), source.indexOf("function getDisplayDateTime"));
  const withdrawals = source.slice(source.indexOf("function getWithdrawals(data)"), source.indexOf("function deleteWithdrawal"));
  const expenses = source.slice(source.indexOf("function getExpenses(data)"), source.indexOf("function deleteExpense"));
  const clients = source.slice(source.indexOf("function getStaffClientCount(data)"), source.indexOf("function normalizeBarberName"));
  const sales = source.slice(source.indexOf("function getStaffTotalSales(data)"), source.indexOf("function getTodaySales"));

  assert.match(invoices, /getOptionalDateRange\(data, filters\)[\s\S]*?getSheetByName\("DATA"\)/);
  assert.match(invoices, /if \(!sheet\)[\s\S]*?status: "success"[\s\S]*?invoices: \[\][\s\S]*?hasMore: false[\s\S]*?totalMatches: 0/);
  assert.doesNotMatch(invoices, /Sheet DATA not found/);
  assert.match(withdrawals, /getOptionalDateRange\(data, null, true\)[\s\S]*?if \(!sheet \|\| sheet\.getLastRow\(\) < 2\)[\s\S]*?withdrawals: \[\]/);
  assert.match(expenses, /getOptionalDateRange\(data, null, true\)[\s\S]*?if \(!sheet \|\| sheet\.getLastRow\(\) < 2\)[\s\S]*?expenses: \[\]/);
  assert.match(clients, /if \(!sheet\)[\s\S]*?status: "success", totalClients: 0/);
  assert.match(sales, /getOptionalDateRange\(data, null, true\)[\s\S]*?if \(!sheet\)[\s\S]*?status: "success", totalSales: 0/);
});

test("Dashboard keeps the canonical getInvoices API and never substitutes lifetime data", () => {
  const source = read("public/assets/js/pages/dashboard-analysis.js");
  assert.match(source, /action: "getInvoices",\s*fromDate: range\.fromDate,\s*toDate: range\.toDate/s);
  assert.match(source, /invoices = loadedInvoices/);
  assert.match(source, /invoices = \[\][\s\S]*?filteredInvoices = \[\]/);
  assert.doesNotMatch(source, /localStorage[\s\S]{0,120}(invoice|DATA)/i);
});

test("all target pages load the one shared date-range helper", () => {
  for (const page of ["dashboard.html", "staff-accounting.html", "withdrawals.html", "expenses.html"]) {
    const source = read(`public/pages/${page}`);
    assert.equal((source.match(/assets\/js\/utils\/date-range\.js/g) || []).length, 1, page);
  }
});

test("modified Staff Accounting inline scripts remain syntactically valid", () => {
  const source = read("public/pages/staff-accounting.html");
  const scripts = [...source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1])
    .filter(script => script.trim());
  assert.ok(scripts.length > 0);
  scripts.forEach(script => assert.doesNotThrow(() => new Function(script)));
});
