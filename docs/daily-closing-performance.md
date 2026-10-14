# Daily closing performance

Story: day preview and history must render current financial data and preserve saved-day metadata, re-closing permissions and authoritative save calculations.

Before optimization on 2026-10-14 the current-day full preview took 8.110 s including the shared API queue; Google execution and content retrieval took 7.642 s. The history contained 44 rendered rows. No production closing, deletion or financial test transaction was submitted.

Full daily previews and their server-side save calculation now use the same bounded native totals read as cashier. Saved-day history lookup and all returned metadata remain intact. Duplicate history checks during save were retained. Cairo endpoints are validated against their calendar keys; an invalid or normalized midnight uses the original row parser instead of changing totals. No financial/authentication cache or permission change was introduced.

UI duplicate previews share one read and only the newest pending day is retained. Changing the date invalidates old responses. Displayed amounts are retained on refresh failure but an invalid/mismatched preview cannot enable or submit closing. Save is guarded against duplicate clicks, a date change during preparation, and stale preview dates. After a successful mutation, preview and history refresh together, both requesting a fresh read after any older in-flight read. Failed history refresh retains saved records and selection.

Opt-in page timers include preview pending wait and rendering; numeric shared API diagnostics recognize history reads too. No customer, session or financial values are logged by those timers.

Tests compare all money and saved-day metadata with prior production, validate new save/manager re-close/non-manager rejection and prove client preview money is ignored. Synthetic UI tests cover deduplication, latest day, date changes during preparation, failure retention, single write submission and parallel fresh post-write refresh. The full suite passed 1306 tests. The isolated deployed page passed the focused UI/save behavior checks.

Verified production Apps Script v57 is active on the existing deployment; uploaded and immutable sources were checked. Frontend dpl_7WuADuDxjFtNiTZd4fj89qgsuHmC is active on the existing domain with daily API timing tag 20261014-daily-timing-1. Version 56 first introduced full-preview native totals; v57 also filters saved-day history before formatting its metadata. Complete history still returns the same records in the same order; the lookup test formats one timestamp instead of 44 in its fixture. The server's separate saved-day checks before writing remain intact.

Live observations on 2026-10-14:

| Read | Elapsed |
| --- | ---: |
| Original v55 preview, API including shared queue | 8.110 s |
| Interim v56 preview, full page timer | 7.114 / 5.405 s |
| Final v57 preview, full page timer | 5.304 s |
| Previous-day v57 preview, double click sharing one read | 5.718 s |
| History, full page timer | 3.851 / 2.861 s |

Live sales were updated during the audit, so before/after amount snapshots were not treated as an equivalence test. The final current-day preview's six sales/tip/payment fields were independently compared against all 19 current-day invoices rendered by the invoice page; all matched. The save/permission/money equivalence tests use deterministic fixtures instead. No production invoice, closing or deletion was submitted by the audit.

A day change disabled closing until a matching successful preview. Double preview clicks shared one read. The history retained 44 rows. These are individual samples, not latency percentiles or a universal six-second guarantee; pending reads and external-provider response time can exceed the target. Real production closing-write wall-clock latency remains unmeasured.
