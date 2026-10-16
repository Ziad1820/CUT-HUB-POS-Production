# Attendance page performance

The dashboard previously reread attendance, events, policies, schedule rows, overrides, adjustments and overtime for each employee. Apps Script now creates a request-local snapshot only for an explicit server-owned list of attendance read actions. Each source is read once and copied for each caller, including nested records and Date values. No snapshot is shared across requests. Mutation actions continue using the original live repository and lock/transaction/idempotency paths.

The attendance calculations, actor resolution, branch/self scope, duplicate-day checks, persisted policy/schedule snapshots, correction and overtime approval rules remain unchanged. Tests compare complete original and optimized dashboard results for nine employees, scoped actors and a completed 480-minute workday with a break and pending correction.

The page loads the server-authorized day once; branch, employee, unresolved and open-break filters narrow that day locally. This also keeps the selected date/branch/staff scope when showing issue filters; the prior special endpoints could return historic persisted days unrelated to the selected date. Selectors retain the full authorized day options. Summary counts follow the visible filters.

Concurrent identical date reads coalesce; only the newest pending date is retained. Stale responses cannot replace the current day. Failed reads retain the last successful cards and explicitly disable mutations until a successful refresh. Auto refresh skips hidden pages, open dialogs and active reads/writes. An open details dialog ignores responses after it is closed or superseded.

All attendance submission and owner overtime-review paths use a single mutation guard. Exactly one read-only reconciliation follows success or uncertain failure; no mutation is replayed. Failed submissions keep the dialog draft and require a fresh review before another submission. Overtime review only opens the approval dialog after reconciliation and never auto-approves.

Opt-in `?performance=1` logs numeric dashboard/filter/details timings. API timing allows the dashboard, events and audit reads, without request bodies, employee data or credentials.

Production tests use read-only views and details only. No real check-in, check-out, break, absence, correction, overtime approval, closing, reopening or migration is performed. Those writes are verified with synthetic API responses; production write latency is unmeasured.

Production verification on 2026-10-16:

- The active Vercel deployment is dpl_FTcRn6yji4TxhojT8rd1oPnMYaYY, with Apps Script v67. The previous deployed attendance JavaScript matched the original tracked source; the new candidate HTML matched the tested source before promotion.
- The complete nine employee cards matched the baseline byte-for-byte in their DOM text and stable day identities. Summary remained 9 employees, 0 working, 0 open breaks and 8 warnings. No records or schedules were changed.
- Selecting one employee showed 1 card; adding open-break filtering showed 0; selecting the main branch showed 7. Restoring filters returned all 9. Filters measured 0-4 ms without a new attendance request.
- Dashboard rendering measured 9.703 s initially and 8.453 s on manual refresh. Initial API 9.691 s included Google execution 9.345 s, Google content 0.146 s and relay total 9.492 s. Relay includes Google stages; they are not additive independent waits.
- Details completed successfully in 8.070 s; event/audit reads remained separate existing endpoints. The dialog was closed and the original selected date and all-view filters were restored.
- All 1,378 tests passed, including synthetic mutation/reconciliation, original-versus-snapshot results, cross-request freshness and stale detail response checks. The isolated deployed frontend passed its focused suite as well.
- The six-second target remains unmet for these remote reads. The main measured wait is Google execution. No production mutation latency is claimed; real attendance and payroll-affecting actions were not performed.

Visual alignment on 2026-10-16: the attendance page now uses the same SALONIX logo/name/slogan header, shared background/theme variables, financial-page panel borders/radii/shadows, warm input surfaces and gradient primary buttons as Expenses/Withdrawals. The attendance title and sync state sit in a separate introductory panel. Employee metrics, statuses, dialogs and responsive grids follow that theme. JavaScript, APIs, permissions, backend and attendance records are unchanged. Twenty existing attendance and shared-layout checks passed. Candidate HTML and CSS were byte-matched before promotion of Vercel deployment dpl_9jvwDTFWSs7e73z6HCKU53ybcEzD; browser verification confirmed the branded header and attendance data.
