"use strict";
// Read-only audit: business writes exist only in isolated in-memory sheet fixtures.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function fixture(files) {
  const rows = [];
  const sheet = { appendRow: row => rows.push(row.slice()), getLastRow: () => rows.length + 1 };
  const cache = { get: () => null, put() {} };
  const context = vm.createContext({
    console, requirePermission: () => null, jsonOutput: value => value,
    validateCutHubRequestEnvironment() {}, getSessionToken: () => 'fixture-session-not-real',
    protectedReadCapability: () => null,
    resolveAuthenticatedRequestContext: () => ({ user: { username: 'fixture' }, permissions: ['access_cashier', 'view_expenses', 'view_withdrawals'] }),
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    CacheService: { getScriptCache: () => cache },
    SpreadsheetApp: { getActive: () => ({ getSheetByName: () => sheet }) },
    Utilities: { getUuid: () => 'fixture-uuid' },
    inventoryText: value => String(value || '').trim(),
    parseSheetAmount: value => Number(value) || 0,
    getInvoiceDateTime: () => '2026-10-17 12:00:00', getCairoDateKey: () => '2026-10-17',
    getLockedDateError: () => null, applyInventoryCheckout: () => null, logActivity() {}
  });
  for (const file of ["002_core_http-router.gs", ...files]) vm.runInContext(fs.readFileSync(path.join(root, 'apps-script/production', file), 'utf8'), context);
  context.jsonOutput = value => value; // ContentService transport is replaced, business handlers remain unchanged.
  context.findInvoiceByRequestId = () => null;
  context.ensureDataInvoiceColumns = () => ({ invoiceRequestIdColumn: 14 });
  return { context, rows };
}
function invoice(input) {
  const h = fixture(['042_invoices_schema.gs', '026_inventory_checkout-planning.gs', '043_invoices_mutations.gs']);
  const result = h.context.doPost({ postData: { contents: JSON.stringify({ action: "invoice", clientRequestId: 'fixture-only-request', customerName: 'Fixture', customerPhone: '01000000000', services: 'Fixture service', barber: 'Fixture staff', payment: 'cash', invoiceItems: [], ...input }) } });
  return { accepted: result.success === true, simulatedRows: h.rows.length, storedCustomerName: h.rows[0]?.[1], storedTotal: h.rows[0]?.[5], storedDiscountPercent: h.rows[0]?.[11], storedPayment: h.rows[0]?.[8] };
}
const cases = [
  { id: 'FIN-01', scenario: 'negative invoice total', expectedRejected: true, ...invoice({ total: -100, paidAmount: -100 }) },
  { id: 'FIN-02', scenario: 'discount over 100 percent and invalid payment', expectedRejected: true, ...invoice({ total: 10, discountPercent: 150, payment: 'fixture-invalid-method' }) }
];
for (const [file, action, idKey] of [
  ['046_accounting_withdrawals.gs', 'createWithdrawal', 'withdrawalId'],
  ['047_accounting_expenses.gs', 'createExpense', 'expenseId']
]) {
  const negative = fixture([file]);
  const route = action === "createWithdrawal" ? "withdrawal" : "expense";
  const negativeResult = negative.context.doPost({ postData: { contents: JSON.stringify({ action: route, amount: -50, staffName: "Fixture", category: "Fixture", [idKey]: "fixture-negative" }) } });
  cases.push({ id: action === 'createWithdrawal' ? 'FIN-03' : 'FIN-04', scenario: action + ' negative amount', expectedRejected: true, accepted: negativeResult.status === 'success', simulatedRows: negative.rows.length, storedAmount: negative.rows[0]?.[1] });
  const duplicate = fixture([file]);
  const payload = { action: route, amount: 50, staffName: 'Fixture', category: 'Fixture', [idKey]: 'fixture-same-business-id' };
  duplicate.context.doPost({ postData: { contents: JSON.stringify(payload) } });
  duplicate.context[action](payload);
  cases.push({ id: action === 'createWithdrawal' ? 'FIN-05' : 'FIN-06', scenario: action + ' repeated business identifier', expectedRows: 1, simulatedRows: duplicate.rows.length });
}
const textCase = invoice({ total: 10, customerName: '=1+1' });
cases.push({ id: 'TEXT-01', scenario: 'formula prefix reaches appendRow as customer name', expectedLiteralText: true, rawFormulaPrefix: String(textCase.storedCustomerName || '').startsWith('='), simulatedRows: textCase.simulatedRows });
const controls = [];
const valid = invoice({ total: 100, paidAmount: 100 });
controls.push({ scenario: 'valid invoice positive control', passed: valid.accepted && valid.storedTotal === 100 });
for (const blocked of ['locked-date', 'unauthenticated']) {
  const h = fixture(['042_invoices_schema.gs', '026_inventory_checkout-planning.gs', '043_invoices_mutations.gs']);
  if (blocked === 'locked-date') h.context.getLockedDateError = () => 'Fixture date is locked';
  else h.context.getSessionToken = () => null;
  const response = h.context.doPost({ postData: { contents: JSON.stringify({ action: 'invoice', total: 100 }) } });
  controls.push({ scenario: blocked + ' negative control', passed: h.rows.length === 0 && response.status === 'error' });
}
const failures = cases.filter(row => row.expectedLiteralText ? row.rawFormulaPrefix : row.expectedRejected ? row.accepted : row.simulatedRows !== row.expectedRows);
console.log(JSON.stringify({ auditOnly: true, networkCalls: 0, realWrites: 0, fixtureAuthorization: 'actual doPost JSON route with a mocked valid authenticated actor; permission enforcement audited separately', controls, cases, findingCount: failures.length }, null, 2));
// Findings are data, not unit-test successes. A nonzero exit code deliberately flags unmet invariants.
process.exitCode = failures.length || controls.some(row => !row.passed) ? 1 : 0;
