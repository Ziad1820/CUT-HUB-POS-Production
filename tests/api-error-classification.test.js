const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('public/assets/js/core/api.js', 'utf8');
function load(fetch) {
  const window = { addEventListener() {}, location: { pathname: '/cashier.html', href: 'https://x/cashier.html', replace() {} }, dispatchEvent() {} };
  const context = { window, fetch, navigator: { onLine: true }, document: { body: { classList: { toggle() {} }, appendChild() {} }, createElement() { return { style: {}, id: '', textContent: '' }; }, readyState: 'complete' }, localStorage: { getItem() { return null; }, removeItem() {} }, sessionStorage: { getItem() { return null; }, removeItem() {} }, CustomEvent: function() {}, AbortController, setTimeout, clearTimeout };
  vm.runInNewContext(source, context);
  return window.RomeoApi;
}
async function rejects(fetch, code) { await assert.rejects(() => load(fetch).request({ action: 'invoice' }, { timeoutMs: 5 }), error => error.code === code); }
(async () => {
  await rejects(() => Promise.reject(new Error('offline')), 'NETWORK_ERROR');
  await rejects(() => Promise.resolve({ ok: false, status: 409, json: async () => ({}) }), 'CONFLICT');
  await rejects(() => Promise.resolve({ ok: false, status: 503, json: async () => ({}) }), 'SERVER_ERROR');
  await rejects(() => Promise.resolve({ ok: true, status: 200, json: async () => { throw new Error('html'); } }), 'INVALID_SERVER_RESPONSE');
  await rejects((_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('abort')))), 'REQUEST_TIMEOUT');
  const abort = new AbortController();
  const request = load((_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('abort'))))).request({ action: 'invoice' }, { signal: abort.signal, timeoutMs: 1000 });
  abort.abort();
  await assert.rejects(() => request, error => error.code === 'REQUEST_ABORTED');
  await rejects(() => Promise.resolve({ ok: true, status: 200, json: async () => ({ status: 'error', code: 'LOCK_BUSY', message: 'busy' }) }), 'LOCK_BUSY');
  console.log('api-error-classification: 7 passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
