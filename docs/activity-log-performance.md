# Activity log performance — 2026-10-15

Scope: the Activity Log page, after Daily Closing in sidebar order.

The existing production backend already reads only the requested page (100 rows by default), rather than scanning or formatting all audit entries. No Apps Script runtime, permission, audit creation or deletion implementation was changed; production remains version 57.

Frontend changes:

- Repeated refresh or load-more clicks share the active read. A refresh during load-more supersedes its result and schedules one fresh first-page read. It cannot append the same page twice.
- Search text and date keys are prepared once per loaded record. Search and all existing combined filters remain local to the loaded records; they do not search unseen pages.
- Failed refresh or pagination retains displayed records, metrics, selection and pagination cursor, with a generic visible retry message. Provider errors and identifiers are not exposed in that message.
- Duplicate stable audit IDs across overlapping pages are displayed once. Existing date order, record identity and server paging contract are retained.
- Writes have an in-flight guard, cannot race this page's reads, and are never retried. Successful deletion requests a new first page. No live audit records were deleted in verification.
- Opt-in `?performance=1` records numeric API timing and page/filter timing without audit details or session information.

Verification: `tests/activity-log-performance.test.js` covers deduplication, superseded responses, read failures, overlapping pages, combined filters, single synthetic deletion, failed writes, and bounded backend reads. The same tests run against the isolated deployed frontend.

Live verification on the production alias:

| Operation | Full page operation time |
| --- | ---: |
| First 100 records | 3.855 s |
| Load 100 more (200 displayed) | 3.791 s |
| Refresh back to latest 100 | 3.911 s |
| Search and combined action filter on 200 records | 10–54 ms |

The refresh returned 100 unique audit IDs with an empty loading status and no warning/error logs. The combined search/action filter returned 19 matching updates. These are post-change measurements; no authenticated before-change timing was captured. The expired-session request was excluded. No production deletion was performed, so real deletion speed has not been measured.

The two measured successful refresh API calls spent about 3.50–3.60 s inside the relay's upstream Google requests, versus 3.81–3.86 s total browser API time. This indicates upstream Google latency dominates these reads; it does not isolate Apps Script execution from Sheets access or provider queuing. No data store migration or backend cache was introduced. External provider latency means six seconds is a target rather than a universal guarantee.

Final production deployment: `dpl_He8LrNb3SSTdvwJrM9B8S1VWLN36`. Served candidate HTML matched the tested source exactly. Nine focused tests passed and the full tracked suite passed **1,315 tests**. Apps Script remains version 57.
