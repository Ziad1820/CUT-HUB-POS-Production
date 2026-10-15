# Expenses page performance

The page already loaded its period with one `getExpenses` request. The change keeps that canonical read and its backend category/date/amount behavior. Apps Script v62 optimizes only the read; financial mutation endpoints remain unchanged.

- Concurrent identical periods share a request. While it is running, only the newest pending period is retained. Responses for edited or superseded periods cannot replace the displayed figures.
- Loaded figures stay attached to the last successful period. Invalid ranges and failed refreshes retain figures and selection, with an explicit status message instead of fabricated zero balances.
- The backend checks native dates against validated Cairo midnight boundaries before formatting historical rows, reuses conversions for identical timestamps, and retains the legacy parser when a midnight is normalized. Text dates retain their original handling, row identities and ordering.
- Category changes and search remain local. Removed overridden render functions, unused mutation wrappers and the redundant deletion listener. Rebuilding category options preserves the form's selected category. Form dates use the shared Cairo helper.
- Financial actions have a single active-operation guard. Exactly one authoritative read follows success, uncertain failure or partial bulk deletion. Writes are never automatically replayed; failed reconciliation blocks further mutations until a successful read. Bulk deletion retains its existing sequential backend calls.
- Opt-in `?performance=1` logs numeric period, category and search timing; the shared relay timing allows `getExpenses`. No financial contents or credentials are logged.

Validation: `tests/expenses-performance.test.js` covers request coalescing, latest-period publication, retained state, monetary rounding/category/count/average behavior, form preservation, duplicate-write prevention, uncertain save and partial/missing deletion reconciliation. Production verification uses read-only filters and category/search interactions. No live expense was created or deleted; real write duration is not measured.

Production verification on 2026-10-15 (same authenticated audit tab):

- Before the backend optimization, measured period requests were 6.367 s initial, 10.965 s day filter, and 5.183 s reset. This is a small variable sample, not a controlled benchmark.
- With v62, initial October period rendered in 3.683 s, October 14 in 3.347 s, and reset to October in 3.832 s. Category changes took 5 ms and search 1 ms in the observed interactions.
- Initial API 3.675 s: Google execution 3.270 s, Google content redirect 0.208 s, relay total 3.478 s. Relay total includes Google time; these are not additive independent stages. This sample points to Google as the dominant wait, not a guarantee for every request.
- All six October category totals matched the prior page: Supplies 19,935; the other five categories zero. Count 22 and average 906.14. October 14 matched before/after: 3 expenses, 560 total, 186.67 average.
- The full suite passed 1,355 tests. The 11 expense-specific tests also passed against the isolated deployed JavaScript.
- Production Vercel deployment: dpl_2WeaVrjqdQwXVEjDBt8kMHJEcYMb, paired with Apps Script v62. Git deployment uses the existing branch. Live writes remain unmeasured; external-service variance can exceed six seconds.
