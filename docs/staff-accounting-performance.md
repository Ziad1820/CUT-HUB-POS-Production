# Staff accounting performance — 2026-10-15

## Source and scope

The deployed staff page had newer persisted-identity, individual mutation, branch, recovery and settlement UI than the old Git page. The existing isolated production frontend was used as the starting point and synchronized into Git before applying performance changes. These pre-existing deployed mutation flows were preserved. No real employee, approval, salary, settlement, recovery or withdrawal mutation is part of verification.

The former startup made one STAFF read, a withdrawal read, two activity requests per employee and a branch-list request (21 requests for nine employees). The new page sends one authenticated `getStaffAccountingPeriod` request for the whole selected period. Branch loading is deferred until Add Staff, whose existing handler already loads branches.

## Preserved financial and security behavior

- The new endpoint is routed through the existing strict protected-read authentication foundation. It requires server-owned `view_staff_accounting` permission (or the existing owner role); body permissions, STAFF rows, view flags and amounts cannot supply authority or override calculated values. No retry or persistent handler cache is enabled.
- Existing `getStaff` and `getWithdrawals` calculate salary settings, manual deductions, approved legacy attendance, minute accounting, approved overtime and withdrawals. Their implementations remain unchanged. Any component failure returns an error, not a partial financial result.
- DATA is read once as raw values and once as displayed values for all employees. Legacy client counts use displayed identity/date values while sales use raw amounts; this distinction is retained, including stable ID → code → name matching, name aliases, duplicate-name semantics and inclusive dates.
- Cairo date endpoints are resolved once for native Date sales cells, with validation and legacy fallback for unusual calendar boundaries. Legacy string parsing is retained. Existing standalone client/sales endpoints remain unchanged.
- The browser publishes a complete period at once, coalesces duplicate reads and keeps only the newest pending period. Stale results cannot replace the selected period. Failed reads keep prior figures with a visible stale-data message. Changing dates does not fabricate zero balances.
- Selection and search stay local. Employee writes retain the existing version checks, single-submission guards, confirmation/recovery controls and no-replay behavior. No real mutation latency is claimed.

## Validation

Focused tests compare every batched legacy count and sales total across ID/code/name precedence, displayed/raw identity differences, aliases, duplicate names, localized strings, zero values and Cairo month boundaries. Tests also cover authentication capability/permission boundaries, ignored client data, attendance metadata preservation, component failure, atomic publication, deduplication, latest-range wins and stale-data retention.

Nine focused performance tests pass, including exact old/new count and sales equivalence and one header read with relocated aliases and narrow physical sheets. The full tracked suite passes **1,324 tests**. The served HTML matched the tested isolated source. Production Apps Script is **v60**; Vercel deployment is `dpl_J7bTLZbVJ1dhD23QSsfRi1K2Umfx`.

Live measurements:

| Operation | Page operation time |
| --- | ---: |
| Initial aggregate release, first load | 11.193 s |
| Initial aggregate release, refresh | 8.414 s |
| Instrumented intermediate release | 6.534 s |
| Final release, October refresh | 9.688 s |
| Final release, switch to September | 5.880 s |
| Final release, return to October | 6.802 s |
| Select employee | 7–9 ms in measured selection samples |
| Search | 1–2 ms |

The final two requests spent 2.708 and 2.913 seconds in the measured staff/withdrawals/activity handler phases; the remaining browser time includes authentication, Google/provider wait, relay and transport. Header/data-read time was 0.952 and 1.071 seconds. The earlier three-header read measured 1.268 seconds. These observations show provider variability, not a universal before/after latency ratio. The original 21-request page did not have a full end-to-end timer, so no old total-load figure is invented.

All nine employees' displayed figures were captured before and after rollout. Seven individual accounts matched; two employees' sales/client counts and the overall totals changed while the production system was being used. This live comparison alone cannot prove financial equivalence under a fixed snapshot; the deterministic fixtures compare the old and new calculations on identical data. An independent October invoice-page check for the employee with the larger difference loaded all **28 invoices**, with no remaining page, and displayed **EGP 3,840**. Both the count and total matched the current staff account exactly. No invoice or employee record was edited in this check.

The six-second target was reached for the September request but **was not met consistently**. No financial result, attendance approval, authorization state or cross-request cache was weakened to hide this latency. Real employee writes were not exercised and their production latency remains unmeasured.
