# Page 1: Cashier performance audit

Measured 2026-10-13 using the authenticated live application, same browser, production Apps Script v43 before / v44 after. Timings are individual observations, not a percentile, SLA or benchmark against another database. No real invoice was created, edited or printed for testing.

| Measurement | Before | After |
|---|---:|---:|
| Startup read requests | 12 | 5 |
| All startup API responses complete | about 35.6 s | 16.5 s |
| Day totals ready | about 29.3 s for the initial load; 35.6 s for the duplicate load | 11.4 s |
| Staff refresh, including client queue | 5.37 s first request; duplicate 17.59 s | 4.35 s |
| Services refresh | 4.33 s | 4.42 s |
| Latest five invoices refresh | 12.99 s | 16.52 s |

Latest invoices finish later because day totals were prioritized ahead of background invoices, although overall startup and day figures finish much earlier. Local cached services render before fresh responses; their API timings do not represent time to the first usable service button.

The deployed cashier had unconditional `pageshow` reads as well as boot reads. The local source already had the persisted-page guard, so the fix was applied separately to the deployed snapshot. Preserved all other deployed cashier behavior. The page now refreshes on BFCache restoration, and performs one boot load.

The old sales → daily preview + payment totals chain repeated DATA reads and returned related numbers in separate responses. The existing daily closing preview includes all required totals, so cashier now uses it once, ignores stale date responses, and does not replace money with false zero when a refresh fails. No finance response cache was introduced. Staff loading requests `staffView: cashier`, enforces cashier permission and returns only identity/name/code/active/barber fields, skipping attendance and payroll aggregation. The normal staff-accounting response still uses its full historical logic.

Server-Timing measures Google execution-response wait, Google ContentService retrieval and total relay handler duration. Opt-in `?performance=1` client diagnostics record only allowlisted action names, HTTP status and numeric timings. No tokens, URLs, payloads, customer records or response bodies are logged. Existing local API edits were preserved and only the measurement addition staged. No concurrency increase or write retry was introduced.

After-release request measurements (milliseconds):

| Action | Client queue | Client network | Google execution wait | Google content | Relay total |
|---|---:|---:|---:|---:|---:|
| getStaff | 10 | 4344 | 3657.3 | 72.7 | 3730.1 |
| getServices | 6 | 4411 | 4086.0 | 83.3 | 4169.4 |
| getSellableProducts | 4416 | 4434 | 4084.3 | 183.5 | 4267.9 |
| getDailyClosingPreview | 4349 | 7077 | 6816.4 | 73.2 | 6889.6 |
| getInvoices | 8849 | 7670 | 7376.0 | 108.5 | 7484.6 |

Most relay time is spent awaiting Google, while the client queue adds delay as requests accumulate. These headers do not isolate Spreadsheet service time from Apps Script authentication, startup, Google networking or provider TLS. It would be inaccurate to blame Vercel or Sheets alone from this measurement.

Live draft-only checks: add a 110 EGP service and a 20 EGP service, add 30 EGP premium, apply 10% discount → 144 EGP total and 16 EGP discount; switch to Visa; search finds the matching service; clear returns an empty 0 EGP cart. Live day figures satisfy sales + tips − expenses − withdrawals = net. Invoice production engine tested with synthetic sheet/Drive adapters: save-once idempotency and PDF-failure rollback. Printing/saving a genuine production invoice was not performed.

Remaining recommendation: PDF conversion and Drive publication currently run synchronously inside the invoice lock, before persistence. Consider on-demand or background PDF generation only with an agreed change in invoice-document availability and recovery behavior. Do not remove lock, inventory checks, audit or idempotency to improve speed. A database migration must be scoped as a separate data-integrity project; Apps Script is already the backend and is not a replacement storage engine for Sheets.

References: [Google Apps Script performance best practices](https://developers.google.com/apps-script/guides/support/best-practices) recommends minimizing service calls and batching spreadsheet operations.

Release: Apps Script v44; Vercel `dpl_8NWDB64ZCL2ayQRep2qc2gudkZW3`. Page sequence continues with invoices, then the remaining sidebar pages; this report covers cashier only.
