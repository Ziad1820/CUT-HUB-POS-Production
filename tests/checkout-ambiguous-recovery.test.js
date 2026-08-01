const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('scripts/app-script-final-owner-access.js', 'utf8');
function setup({ serialize = payload => payload, lockError = null } = {}) {
  const rows = [['date','name','phone','services','pdf','total','paid','tip','payment','barber','note','discount','discount amount','Invoice Request ID']];
  let inventory = 0, pdf = 0, released = 0;
  const sheet = { getLastRow: () => rows.length, appendRow: r => rows.push([...r]), deleteRow: n => rows.splice(n - 1, 1), getRange: (r,c,rc,w) => ({ getValues: () => rows.slice(r - 1, r - 1 + rc).map(x => x.slice(c - 1, c - 1 + w)), getValue: () => rows[r - 1]?.[c - 1] }) };
  const context = { console, JSON, Math, Number, String, Set, Map, Date, Utilities: { getUuid: () => 'uuid', base64EncodeWebSafe: x => String(x), computeDigest: () => 'digest' } };
  vm.createContext(context); vm.runInContext(source, context);
  context.requirePermission=()=>null; context.getInvoiceDateTime=()=> '2026-07-31'; context.getLockedDateError=()=>''; context.prepareInventoryCheckout=()=>({}); context.ensureDataInvoiceColumns=()=>({invoiceRequestIdColumn:14}); context.createInvoicePdf=()=>{pdf++; return 'https://drive.google.com/file/d/id/view';}; context.getInvoicePaymentDetails=()=>({paidAmount:1,tipAmount:0}); context.applyInventoryCheckout=()=>{inventory++; return null;}; context.logActivity=()=>{}; context.jsonOutput=serialize;
  context.SpreadsheetApp={getActive:()=>({getSheetByName:()=>sheet})}; context.CacheService={getScriptCache:()=>({get:()=>null,put:()=>{}})}; context.LockService={getScriptLock:()=>({waitLock:()=>{if(lockError)throw lockError;},releaseLock:()=>released++})};
  return { context, rows, state:()=>({inventory,pdf,released}) };
}
const payload={idempotencyKey:'request-1',invoiceItems:[],total:1};
{ const h=setup({lockError:new Error('busy')}); const result=h.context.createInvoice(payload); assert.equal(result.code,'LOCK_BUSY'); assert.equal(h.rows.length,1); assert.deepEqual(h.state(),{inventory:0,pdf:0,released:1}); }
{ const h=setup({serialize:()=>{throw new Error('serialize');}}); assert.throws(()=>h.context.createInvoice(payload),/serialize/); assert.equal(h.rows.length,2); assert.deepEqual(h.state(),{inventory:1,pdf:1,released:1}); h.context.jsonOutput=x=>x; const retry=h.context.createInvoice(payload); assert.equal(retry.invoiceId,'DATA-2'); assert.equal(h.rows.length,2); assert.equal(h.state().inventory,1); }
console.log('checkout-ambiguous-recovery: 2 passed');
