# Configurable shifts, minute deductions, approved overtime and booking attendance

The owner can configure a staff member from Schedule Management without cloning an
existing policy: effective dates, default shift start/end, required work minutes,
allowed break minutes, late grace, deduction price per minute and overtime price
per minute. No nine-hour shift or one-hour break is hard-coded. Existing weekly
shifts, weekly rest and approved date-specific exceptions retain their precedence.

The new simple contract uses existing policy columns: DAILY settlement,
FIXED_PER_MINUTE deduction and overtime rates, integer piastres, UNPAID break,
and explicit overtime approval. Existing policy contracts and historical attendance
snapshots retain their existing behavior. No schema migration is necessary.

Policy replacement ends the preceding effective range in the same journaled
transaction as creation. A same-start replacement before attendance exists
deactivates the original instead. Past effective dates and dates with recorded
attendance cannot be overwritten through the simple form. Existing day snapshots
preserve the prices, schedule and calculation used for that day.

Daily calculations expose separate late-arrival, early-departure and excess-break
minutes. Interval intersections exclude the gaps between split shifts, and break
minutes outside a shift do not also become a break deduction. Chargeable minutes
are bounded by required daily minutes. Full-minute deductions are priced in
integer piastres. Time outside scheduled segments is overtime evidence and does
not erase a late deduction. Pending, rejected or stale overtime is never paid.

Attendance records a planned break duration in the existing event JSON field;
the configured daily break allowance remains the financial allowance. An open
break keeps the employee unavailable until an explicit return, including after
the planned duration expires. Closed-day overtime can be requested and partly
approved by the owner. An owner may review a request they initiated for another
employee, but an employee cannot approve their own overtime. Decisions remain
append-only, permission checked, audited and idempotent.

Staff Accounting derives new attendance debits and approved overtime from unique
persisted staff/day records in the selected period. Reads never append deductions,
and duplicate days fail rather than charge twice. Existing approved legacy
deductions remain separate. Open, stale and reopened days are marked provisional
and excluded from financial totals until completed. The UI shows each dated
reason, minutes, price and amount, plus approved overtime. Commission, salary,
bonus, manual deduction and withdrawal calculations are preserved.

Payroll Attendance remains a review/export workflow. DAILY fixed-minute periods
use the same daily snapshots and prices, including effective rate changes within
a period. Its existing source-completeness, day-lock, review, approval, export and
manual-adjustment checks remain in place. Its report is not added a second time
to Staff Accounting.

## Booking activation

Live inspection on 2026-10-13 showed the current engine is SHADOW and attendance
and both live-refresh flags are disabled. Deployment alone does not activate the
new booking rules. An owner-only control in Booking Availability activates PHASE5,
planned schedules, attendance and both audience refresh flags together. Operational
manager overrides are disabled so both audiences follow the same factual attendance
rules. Activation checks schemas and requires effective DAILY policies for all
active bookable staff. Configure staff before enabling it; no staff prices, shifts,
attendance events or financial decisions are invented during deployment.

The switch uses the existing script lock, availability transaction journal,
generation invalidation and audit. A failed property update/audit compensates the
properties; unresolved transaction failures retain the existing recovery marker.
Same-day slots require check-in and stop on break/checkout. Future-date slots use
planned schedules. An updated cache contract prevents old cached slots crossing
the rule change. Existing confirmed bookings are not silently cancelled.

## Source and validation

The authoritative deployed package is `apps-script/production/`, not the historical
development compatibility bundles. Each intentionally changed module keeps its
original v38 bytes in `baseline/`; the package builder verifies both historical
integrity and current source hashes. Frontend deployment applies only this feature
to the previously verified live snapshot, preserving unrelated local drafts in
Staff Accounting and the API layer.

`tests/staff-minute-workflow.test.js` exercises the actual production engines:
first configuration, flexible/overnight shifts, separate deduction reasons,
late plus overtime, partial approval, rejection, duplicate approval retry,
effective policy changes, rollback, exact price parsing, provisional days,
period-report agreement, staff-accounting reads, both booking audiences and owner
activation/compensation. Live production financial test events are not fabricated.

Validation: the complete workspace suite passed 1,525 tests. After replacing an
unsupported Apps Script logical-assignment expression with ordinary assignment,
the 15 focused workflow/package checks passed again. Google accepted and verified
immutable version 41, replacing version 40 on the same deployment. No script
properties or staff financial records were changed by release. Frontend source
was checked against the isolated candidate; live Schedule Management loaded staff
and policy controls through the real authenticated session.
