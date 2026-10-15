# Inventory page performance

The inventory page originally fetched inventory, services and recipes in three requests, then fetched the barber report. Report loading disabled the main inventory controls. This update uses one `getInventoryPage` read and loads the report independently; the existing report remains automatic.

Apps Script combines the original `getInventoryData`, `getServices` and `getServiceRecipes` results, failing the entire response if a component fails. The route passes server-owned authentication context and requires inventory permission. The report reads only the original batch/item fields needed for costing, avoiding unrelated batch date conversions while preserving the original zero-value fallback semantics. Existing stock calculation, purchase, recipe mutation and checkout rules are retained.

`readInventoryLog` scans the most recent sheet rows until it finds the requested number of valid transaction IDs. Blank IDs do not consume the limit. Full batch reads reuse exact Date timestamp conversions within a snapshot without changing any returned fields. The original row fields, newest-first order and default/explicit limits are preserved. The large report limit still includes the same history as before; it is not reduced to the page's 500 records. Report dates without explicit calendar notation are checked using validated Cairo midnight boundaries before expensive formatting, with exact timestamp memoization and the original parser retained on normalized-midnight edges.

Frontend refreshes coalesce and publish all component arrays together. Failed or malformed refreshes retain the previous balances. The report has a separate latest-filter queue and retains its last successful figures on failure. Item selection no longer rebuilds the recipe editor. Search and negative-stock filtering remain local. Dates use the shared Cairo helper.

Inventory mutations are guarded against overlap. Exactly one authoritative read follows success, uncertain failure or partial results; mutations are never replayed. Failed reconciliation blocks further mutations until a successful read. Failed writes preserve form drafts. No real item, purchase or recipe is modified during production testing.

`?performance=1` reports numeric inventory/report/search/selection/negative-filter timing. API timing allows the two inventory reads and logs no request contents or inventory values.

Validation: `tests/inventory-performance.test.js` covers combined-response authorization, original log equivalence with blank IDs and bounded reads, atomic frontend state, independent report loading, newest report filters, write guards and uncertain-write reconciliation. Live read-only timings and baseline reconciliation are recorded after deployment.

Production validation on 2026-10-15:

- Vercel deployment dpl_HLt9qFuV2QtAGGKrvzhhN1wBSebn is active, with Apps Script v66.
- The full suite passed 1,368 tests; 13 inventory tests also passed against the isolated deployed JavaScript.
- Live item data matched the prior page: one active item (Coffee), 30 pieces, low-stock count zero, and 58 service choices.
- Report baseline matched: total cost 74.9 EGP, 10 invoices and 12 consumption movements. The same eight grouped rows were retained. No live item, recipe or purchase was saved, deleted or changed.
- Search/negative filtering took 0-1 ms and item selection 2 ms in observed interactions. An unsaved recipe quantity survived item selection; it was restored afterward without saving.
- Combined inventory rendering measured 6.850 s initially (v64) and 7.950 s on refresh (v66). Final refresh API time 7.663 s included Google execution 6.890 s, Google content 0.259 s and relay total 7.149 s. Relay total includes Google stages; they are not additive independent waits.
- Before historical timestamp filtering, report rendering measured 17.913 s and 21.669 s; the first filtered v65 measurement was 7.828 s; a later v66 repeat was 12.658 s (Google execution 12.151 s), with unchanged figures. These are small variable production samples, not a controlled benchmark.
- The six-second goal is not consistently achieved. Writes were tested synthetically and their real production duration remains unmeasured. Google execution dominates the observed waits; the isolated page no longer waits for the report to enable inventory controls.
