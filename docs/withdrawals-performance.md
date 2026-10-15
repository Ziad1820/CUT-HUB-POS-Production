# Withdrawals performance — 2026-10-15

The old normal page-open path initiated two complete STAFF reads and three withdrawal reads: explicit startup reads, a second STAFF read on ordinary `pageshow`, and another withdrawal read after each STAFF response. STAFF also loaded unrelated payroll/attendance calculations.

The new page makes one `getWithdrawalsPage` request, combining the selected period's existing withdrawal read with an active staff identity/name/code projection. The router supplies the authenticated context, and the endpoint requires server-owned `view_withdrawals` permission or the owner account. Body permissions, staff rows, amounts and view flags cannot authorize or replace server data. Cashier projection authorization is preserved. The projection reads no salary or attendance data. The original creation, deletion, locked-period and audit handlers are unchanged.

Frontend behavior:

- One active read and the newest pending period, with duplicate requests coalesced and stale/mismatched period responses discarded. `pageshow` refreshes only restored back/forward-cache pages. Storage events request canonical data instead of replacing fresh staff with another page's cache.
- Staff and withdrawal records publish together. Dates/totals remain tied to the last successfully loaded period until a new one succeeds. Failure preserves previous rows, money and selection with a visible status; changing dates does not turn previous balances into misleading zeroes.
- No sample staff fallback. Cached staff can be displayed while loading but cannot authorize a financial submission. An empty canonical staff result is respected. The page does not overwrite the staff-accounting cache with a reduced staff projection.
- Writes are guarded against double submission and competing reads/writes, are never replayed, and request one authoritative refresh after success. Failed or partial writes reconcile the list with a read. Failed reconciliation disables further writes until a successful read. Bulk deletion still uses the existing sequential per-record backend operation; it has not been made atomic or assigned an invented speed claim.
- Form reset uses Cairo's current date. Employee selection and search are local. Opt-in timing logs contain operation names and numeric durations only.

The focused synthetic tests cover aggregation totals, read coalescing/latest-period ordering, stale/error retention, mismatched periods, single-submit saves, uncertain writes and failed reconciliation, partial bulk deletion, empty authoritative staff, minimal staff projection, and trusted permission boundaries. No real withdrawal is created or deleted in verification, so real write latency is not claimed.

Pre-rollout DOM baseline: nine employees, **140 withdrawals totaling EGP 18,495** for October. All nine employees' individual totals/counts and overall figures matched the post-rollout DOM exactly. Returning to the current month again showed the same count/total, an empty loading status and an enabled add button. No console errors were observed.

Live numeric timing:

| Operation | Page operation time |
| --- | ---: |
| Initial page load | 4.892 s |
| Change period to one day | 4.357 s |
| Reset to current month | 4.660 s |
| Local staff search | 0–1 ms |

The startup diagnostic showed exactly one `getWithdrawalsPage` API request (4.884 s; upstream Google 4.594 s). The old startup's two STAFF reads were visible, including a second read with 5.562 s of client queue and 11.778 s total; this was not the full old page operation, so no total before/after speedup ratio is claimed. Selection was exercised for all nine employees and remained local, without a measured selection-specific timer. All three measured new period reads met the six-second target; external latency can still vary.

Nine focused synthetic tests and the full tracked suite passed (**1,344 tests**). Final Apps Script version: **61**. Final Vercel deployment: `dpl_4DxjGUHMzCoQvUrj8HB95YHvtA7G`; served candidate HTML matched the tested source, and the production alias was verified.
