# Retired payroll page

The standalone payroll attendance page and its page-only assets were removed on 2026-10-17 at the owner’s request. Navigation and login fallback no longer route to it. Old URLs redirect to staff accounting.

Attendance, scheduling, staff accounting minute deductions and explicitly approved overtime remain unchanged. Backend period records and payroll handlers are retained for compatibility and data preservation; no financial records or stored permissions were deleted. Backend bundle and access-control tests remain active.

## Historical performance measurements before removal

# Payroll attendance page performance and theme

The page now loads periods, the selected period's settlements and unresolved blockers through one read-only `getPayrollAttendancePage` request, replacing the previous sequential period read followed by two settlement/blocker requests. An omitted period ID selects the first authorized period, while an explicit empty ID clears the selection. A supplied ID must pass the original period/branch/organization checks. Details and audit use one `getPayrollAttendanceDetails` request; the audit staff/entity IDs come from the authorized settlement, never from caller-provided identities.

Both bundles invoke fixed original Phase 4 read handlers with one server-authenticated actor. Existing financial-field masking, employee self-scope, branch scope, source fingerprints, stale-source detection, review blockers and monetary calculations are preserved. No calculation/approval/locking/adjustment/export command is executed by a read bundle. Both new actions are explicitly classified as reads.

The production repository shares copied request-local datasets only for a server-owned list of read actions. Periods, staff, settlements, attendance days, policies and adjustments are each read once when needed. New requests read fresh data. Writes, unknown actions and default repository construction retain live reads, schema validation, locking and transactions. No shared or persistent financial response cache is added.

The browser combines identical pending reads and rejects superseded period responses. Loading/failure disables financial actions until an authoritative read succeeds; same-period failed refreshes retain displayed rows with an error. Mutations have a shared pending guard and never replay automatically, capture the chosen period, and refresh after confirmed success. Late detail responses cannot fill a closed dialog. Local filters remain local. `performance=1` logs only allowlisted action names and elapsed milliseconds.

The page and dialogs now match the shared SALONIX header, warm background, white rounded panels, brown/beige controls and financial-page typography. The canonical sidebar owns its positioning, wide tables scroll inside their panel, and the toolbar/summary adapt to narrower screens. Empty payroll-period state has an explicit message.

Tests use synthetic employees and attendance for financial comparisons, source changes, stale data, scope/financial masking, duplicate IDs, request deduplication and adjustment submission. Live financial mutations are not used for speed measurement. The live environment had no payroll periods at inspection, so live populated-period/detail timing cannot be claimed from the empty page.

Release verification on 2026-10-17: 1,396 tests passed. Apps Script v70 was verified after an interrupted upload left v69 and its source intact; the retry succeeded. Final Vercel deployment `dpl_HcsGSLJrm1xJcW2vbQFvmxkMSK3C` HTML/JS/CSS matched the tested files byte-for-byte before promotion. Script properties and financial/employee records were not modified for testing.

Live empty-page observations: first load 8.864 seconds, subsequent refresh 3.774 seconds, final page load 4.347 seconds. Two immediate refresh clicks produced one read transport. These individual observations do not guarantee a six-second maximum. The 777px viewport had no page-level horizontal overflow. The new-period dialog was opened and closed without submission; loading cleared correctly. Connectivity notifications now preserve a pending/failed-read status rather than claiming data freshness.
