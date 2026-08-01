# Staff payroll attendance Phase 4

Status: implemented locally and ready for engineering review. No migration, deployment,
production/staging access, commit, push, or merge was performed.

## 1. Existing payroll audit

The existing project stores salary in positional `STAFF` column 3 as a displayed major-unit EGP
number. The legacy staff-accounting read combines:

- salary;
- sales percentage;
- bonus;
- manual staff deduction;
- historical approved Attendance deductions joined by normalized staff name.

Legacy Attendance calculated `salary / 26 / 8`, accepted browser salary/time input, stored suggested
and approved monetary deductions in the daily row, and let staff accounting total those approved
deductions for the current month. The five legacy Attendance API actions are now blocked by the
Phase 3 router, so no new legacy Attendance approval can be created through active `doPost`.
Historical approved deductions remain visible in the legacy staff-accounting page only.

Commissions, product sales, tips, advances/withdrawals, bonuses, existing staff deductions, cashier
payments, income statements, and final payslip/payment execution are not read or changed by Phase 4.
Phase 4 is a separate attendance-adjustment ledger and CSV report.

Active authentication remains session-token based. `schedulePhase2Actor` resolves the authenticated
user, stable staff mapping, branch scope, owner status, and managed permissions. Browser actor,
role, branch, salary, rate, and timestamp fields are ignored.

## 2. Architecture and source of truth

Phase 4 source order:

1. `staff-attendance-schema.js`
2. Phase 1 calculation contracts
3. Phase 2 schedule domain and GAS adapter
4. Phase 3 attendance domain and GAS adapter
5. Phase 4 payroll attendance domain
6. Phase 4 GAS adapter

Safe future upload strategy: upload the generated Phase 4 bundle plus the modified main backend.
Do not upload Phase 2 or Phase 3 bundles separately and do not upload the eight constituent modules.

Every settlement reads only Phase 3 daily rows having a stable `ATTENDANCE_DAY_ID`. The source
snapshot includes:

- attendance day ID, staff ID, and date;
- Phase 3 calculation version and source-event hash;
- attendance status;
- required, worked, deficit, raw-overtime, eligible-overtime, and approved-overtime minutes;
- leave/absence classification;
- lock, reopen, open-session, open-break, and stale flags;
- policy and schedule snapshots;
- calculation warnings.

Phase 4 does not rebuild sessions, breaks, schedules, deficits, or approved overtime from browser
input or legacy Attendance columns. A missing daily aggregate for any calendar date in the period is
an explicit blocker, never inferred absence.

## 3. Schemas

### `PAYROLL_ATTENDANCE_PERIODS`

```text
PAYROLL_PERIOD_ID, SCOPE_TYPE, BRANCH_ID, START_DATE, END_DATE, TIMEZONE,
STATUS, CALCULATION_VERSION, SOURCE_EMPLOYEE_HASH, NOTES, CREATED_BY,
CREATED_AT, CALCULATED_BY, CALCULATED_AT, SUBMITTED_BY, SUBMITTED_AT,
APPROVED_BY, APPROVED_AT, LOCKED_BY, LOCKED_AT, REOPENED_BY, REOPENED_AT,
REOPEN_REASON, UPDATED_BY, UPDATED_AT, LAST_REQUEST_ID
```

### `PAYROLL_ATTENDANCE_SETTLEMENTS`

The complete ordered header list is:

```text
SETTLEMENT_ID, STAFF_ID, STAFF_NAME, PERIOD_START, PERIOD_END,
SETTLEMENT_PERIOD, REQUIRED_MINUTES, WORKED_MINUTES, DEFICIT_MINUTES,
RAW_OVERTIME_MINUTES, APPROVED_OVERTIME_MINUTES, ALLOWED_LEAVE_DAYS,
CONSUMED_LEAVE_DAYS, EXCESS_ABSENCE_DAYS, DEFICIT_VALUE, OVERTIME_VALUE,
EXCESS_ABSENCE_DEDUCTION, MANUAL_ADJUSTMENTS, NET_ATTENDANCE_ADJUSTMENT,
DAY_VALUE, DAY_VALUE_METHOD, POLICY_ID, POLICY_SNAPSHOT_JSON,
CALCULATION_VERSION, STATUS, APPROVED_BY, APPROVED_AT, LOCKED, LOCKED_AT,
LOCKED_BY, REOPENED_AT, REOPENED_BY, REOPEN_REASON, CREATED_AT, CREATED_BY,
UPDATED_AT, UPDATED_BY, LAST_REQUEST_ID, CURRENCY, DEFICIT_VALUE_MINOR,
OVERTIME_VALUE_MINOR, EXCESS_ABSENCE_DEDUCTION_MINOR,
MANUAL_ADJUSTMENTS_MINOR, NET_ATTENDANCE_ADJUSTMENT_MINOR,
PAYROLL_PERIOD_ID, SETTLEMENT_VERSION, STAFF_NAME_SNAPSHOT, BRANCH_ID,
SALARY_BASIS, BASE_SALARY_MINOR, CONTRACTUAL_MINUTES,
ATTENDED_REQUIRED_MINUTES, APPROVED_PAID_LEAVE_MINUTES,
UNPAID_LEAVE_MINUTES, ABSENCE_MINUTES, DEFICIT_RATE_MINOR_PER_MINUTE,
OVERTIME_RATE_MINOR_PER_MINUTE, BASE_PERIOD_AMOUNT_MINOR,
DEFICIT_DEDUCTION_MINOR, UNPAID_LEAVE_DEDUCTION_MINOR,
ABSENCE_DEDUCTION_MINOR, OVERTIME_COMPENSATION_MINOR,
GROSS_ATTENDANCE_ADJUSTMENT_MINOR, SOURCE_ATTENDANCE_DAY_IDS_JSON,
SOURCE_ATTENDANCE_SNAPSHOT_JSON, SOURCE_AGGREGATE_HASH,
SALARY_SNAPSHOT_JSON, WARNINGS_JSON, STALE, SUPERSEDES_SETTLEMENT_ID
```

The approved Phase 1 prefix remains in its original order. Existing Phase 1 minor-unit columns
remain authoritative where names overlap.

### `PAYROLL_ATTENDANCE_ADJUSTMENTS`

```text
ADJUSTMENT_ID, SETTLEMENT_ID, PAYROLL_PERIOD_ID, STAFF_ID, AMOUNT_MINOR,
DIRECTION, CATEGORY, REASON, STATUS, REQUESTED_BY, REQUESTED_AT, DECIDED_BY,
DECIDED_AT, DECISION_REASON, BEFORE_STATE_JSON, AFTER_STATE_JSON,
REVERSES_ADJUSTMENT_ID, REQUEST_ID, REQUEST_FINGERPRINT
```

### `PAYROLL_ATTENDANCE_AUDIT`

```text
ACTION_ID, ENTITY_TYPE, ENTITY_ID, ACTION, ACTOR_ID, ACTOR_NAME, ACTOR_ROLE,
STAFF_ID, BRANCH_ID, BEFORE_STATE_JSON, AFTER_STATE_JSON, REASON, TIMESTAMP,
REQUEST_ID
```

### `PAYROLL_ATTENDANCE_IDEMPOTENCY`

```text
REQUEST_ID, ACTION, ACTOR_ID, REQUEST_FINGERPRINT, RESPONSE_JSON, STATUS,
CREATED_AT, EXPIRES_AT
```

### `STAFF_WORK_POLICIES`

The approved existing prefix remains in its original order. Phase 4 appends these exact headers:

```text
CURRENCY_MINOR_SCALE, SALARY_BASIS, MONTHLY_SALARY_MINOR,
DEFICIT_RATE_MINOR_PER_MINUTE, DAILY_DEDUCTION_CAP_MINOR,
PERIOD_DEDUCTION_CAP_MINOR, OVERTIME_RATE_TYPE,
OVERTIME_RATE_MINOR_PER_MINUTE, OVERTIME_MULTIPLIER_BPS,
UNPAID_LEAVE_MULTIPLIER_BPS, ABSENCE_MULTIPLIER_BPS, SICK_LEAVE_PAID,
UNRESOLVED_BEHAVIOR
```

## 4. Period lifecycle

Allowed lifecycle:

```text
DRAFT -> CALCULATED -> UNDER_REVIEW -> APPROVED -> LOCKED
LOCKED -> REOPENED -> CALCULATED
CALCULATED -> CALCULATED (intentional recalculation)
REOPENED -> CALCULATED
old settlement version -> SUPERSEDED
```

- Creation requires `payroll_attendance.calculate`.
- Calculation/recalculation requires `payroll_attendance.calculate`.
- Submission requires `payroll_attendance.review`.
- Approval requires `payroll_attendance.approve`; the submitter cannot approve.
- Lock requires `payroll_attendance.lock`.
- Reopen requires `payroll_attendance.reopen` and a reason.
- Review, approval, and lock fail if a settlement is stale, unresolved, or review-required.
- Lock propagates to current employee settlement versions.
- Reopen never overwrites locked versions silently; it marks them reopened/stale until recalculation.
- Recalculation creates a new version and marks the previous current version `SUPERSEDED`.

## 5. Money convention and salary/rate precedence

Currency: EGP. Scale: 100 piastres per EGP. All persisted and calculated money is a safe integer.
Major-unit source values are parsed as decimal strings with at most two decimal places. Unsupported
currency, precision, negative compensation inputs, unsafe integers, and overflow fail explicitly.

Rounding is integer half-up at the final rational component:

```text
rounded = quotient + (remainder >= ceil(denominator / 2) ? 1 : 0)
```

No binary floating-point value participates in monetary multiplication or division.

Salary precedence:

1. staff `BASE_SALARY_MINOR`;
2. staff `SALARY_MINOR`;
3. staff salary major-unit value;
4. staff monthly salary;
5. policy `MONTHLY_SALARY_MINOR`;
6. policy fixed day value for daily basis;
7. policy hourly rate for hourly basis;
8. policy monthly salary.

Supported bases:

- `MONTHLY`: calendar-day prorated base-period amount; the period must not cross a month.
- `DAILY`: daily value multiplied by scheduled days.
- `HOURLY`: hourly value multiplied by contractual minutes / 60.
- `PER_MINUTE`: minute value multiplied by contractual minutes.

Deficit rate precedence:

1. fixed minor units per minute;
2. fixed hourly rate / 60;
3. salary-derived base-period amount / contractual minutes.

Overtime rate precedence:

1. fixed minor units per minute;
2. fixed hourly rate / 60;
3. salary-derived base rate;
4. apply integer basis-point multiplier.

The payroll policy resolved for every calendar date in the period must be identical. A temporary
mid-period policy override is detected even when the start and end resolve to the same policy.

## 6. Calculation order and formulas

Implemented order:

1. Validate period, authenticated identity, stable staff, and branch scope.
2. Load only Phase 3 daily aggregates.
3. Detect missing dates, duplicates, stale/open/unlocked/unresolved rows, and invalid overtime.
4. Resolve one effective payroll policy for the whole period.
5. Resolve and snapshot salary and rational rate inputs.
6. Snapshot every daily aggregate and source hash.
7. Aggregate minutes and classifications.
8. Apply daily and period caps.
9. Calculate deficit deduction.
10. Calculate unpaid-leave deduction.
11. Calculate absence deduction.
12. Calculate approved overtime compensation.
13. Sum only approved append-only manual adjustments.
14. Calculate gross and net attendance adjustment.
15. Produce warnings/blockers and review status.
16. Hash period boundaries/scope/version, employee identity/branch, daily aggregates, policy,
    salary, and approved-adjustment evidence. The period separately stores its eligible-employee
    set hash.
17. Persist a new settlement version.
18. Append audit.
19. Persist idempotency result.

Formulas:

```text
deficit deduction =
  sum(minorRate(day.deficitMinutes), dailyCap), then periodCap

unpaid leave deduction =
  minorRate(unpaidLeaveMinutes) * unpaidLeaveMultiplierBps / 10000

absence deduction =
  minorRate(absenceMinutes) * absenceMultiplierBps / 10000

overtime compensation =
  min(sum(currentApprovedMinutes), periodMinuteCap)
  * overtimeRateNumerator
  * overtimeMultiplierBps
  / overtimeRateDenominator
  / 10000

manual adjustment =
  approved credits - approved debits

net attendance adjustment =
  overtime compensation
  + manual adjustment
  - deficit deduction
  - unpaid-leave deduction
  - absence deduction
```

Phase 3 deficit already contains grace, lateness, early-departure, and excess-break effects. Phase 4
does not add those diagnostics again.

## 7. Leave and absence

- Approved paid leave and paid sick leave produce paid-leave minutes.
- Unpaid leave and policy-unpaid sick leave produce separate unpaid-leave deductions.
- Manager/planned absence produces a separate absence deduction and does not also consume deficit.
- Weekly rest/day off and branch closure are exempt.
- Training is paid/exempt.
- Partial absence uses the Phase 3 authoritative required/deficit minutes.
- Unscheduled attendance remains source evidence and is never converted to salary automatically.
- Paid leave consumption is compared with the configured allowance. Excess produces
  `LEAVE_ALLOWANCE_EXCEEDED` and blocks approval; it is not silently double-deducted.
- Missing, open, stale, or unlocked days produce review blockers, not inferred deductions.

## 8. Manual adjustments

Manual values never modify calculated deficit, leave, absence, or overtime components. A request
contains positive integer minor units, credit/debit direction, category, reason, requester, source
settlement, before state, request ID, and fingerprint. Approval/rejection appends a second decision
record referencing the request. The requester cannot decide it, a request cannot be decided twice,
and locked settlements reject changes. An approved decision makes the settlement stale until a new
version is calculated.

## 9. Staleness, transactions, and recovery

The settlement hash covers authoritative day snapshots, policy snapshot, salary snapshot, period,
and approved adjustments. The period separately hashes the eligible employee set.

Staleness includes:

- changed Phase 3 aggregate or source-event hash;
- reopened/stale attendance day;
- changed overtime approval;
- changed salary or policy;
- approved adjustment;
- changed employee set;
- missing/resolved date changes;
- reopened settlement period.

Locked settlements are never overwritten. Export rejects stale rows.

Mutation order:

```text
environment identity -> spreadsheet identity -> complete schema ->
request ID/reason -> script lock -> authenticated actor/scope/permission ->
idempotency -> validation/source hash -> recovery marker/journal ->
business writes -> audit -> idempotency result
```

The GAS adapter writes `PAYROLL_ATTENDANCE_RECOVERY_<requestId>`, journals append/update operations,
and compensates in reverse order. Successful writes and successful compensation delete the marker.
Incomplete compensation retains a marker and returns `PAYROLL_COMPENSATION_FAILED` without exposing
marker internals.

## 10. Actions and permissions

Reads:

- `listPayrollPeriods`
- `getEmployeePayrollSettlement`
- `listEmployeePayrollSettlements`
- `getPayrollSettlementAudit`
- `getUnresolvedPayrollBlockers`
- `previewPayrollAttendanceExport`
- `previewPayrollPhase4Migration`

Mutations:

- `createPayrollPeriod`
- `calculatePayrollPeriod`
- `recalculateEmployeePayrollSettlement`
- `recalculatePayrollPeriod`
- `submitPayrollPeriodForReview`
- `approvePayrollPeriod`
- `lockPayrollPeriod`
- `reopenPayrollPeriod`
- `requestPayrollManualAdjustment`
- `approvePayrollManualAdjustment`
- `rejectPayrollManualAdjustment`
- `exportPayrollAttendanceReport`

Permissions:

- `payroll_attendance.view`
- `payroll_attendance.calculate`
- `payroll_attendance.review`
- `payroll_attendance.approve`
- `payroll_attendance.lock`
- `payroll_attendance.reopen`
- `payroll_attendance.adjust`
- `payroll_attendance.export`

Legacy `view_attendance` and `view_staff_accounting` grant no Phase 4 access. Pure view roles receive
minute/status data but not salaries, rates, monetary components, or serialized financial evidence.
Payroll roles receive scoped financial DTOs. Employees can read only their own settlement when
explicitly granted Phase 4 view permission; list, blocker, and audit queries are self-filtered.
Organization-wide periods require owner scope. A non-owner with one reviewed branch who omits a
branch during creation is server-scoped to that branch. Missing/duplicate/inactive mappings and
missing or duplicate active `STAFF_ID` values fail closed.

## 11. UI and export

`public/pages/payroll-attendance.html` is an Arabic RTL responsive page with:

- period, branch, employee, and status filters;
- deficit/overtime/money/blocker summaries;
- period creation and lifecycle controls;
- employee settlement table and daily-source breakdown;
- salary/rate/calculation details for authorized roles;
- manual adjustment request and decision workflow;
- audit history;
- migration and export preview;
- server-backed unresolved blocker loading;
- locked CSV export;
- loading, empty, stale, denied, offline, and error states.

Rendering uses DOM nodes and `textContent`, not `innerHTML` or inline handlers. Mutation forms disable
their submit control while active. Money is formatted from integer minor units only.

Export format is UTF-8 CSV. It includes period/staff identity, minutes, all attendance monetary
components, currency, calculation version, source hash, status, warnings, approval, and lock
metadata. Cells beginning with `=`, `+`, `-`, or `@` are prefixed with an apostrophe before CSV
quoting. Authorized export requires a locked, non-stale period. It does not submit payment or call a
bank/payroll provider.

## 12. Legacy and migration behavior

Legacy settlement rows without Phase 4 period identity are historical and excluded from current
period queries. The legacy classifier:

- normalizes headers;
- rejects duplicate normalized headers;
- requires stable settlement and staff IDs;
- ignores blank rows;
- identifies unknown columns;
- marks rows read-only;
- detects duplicate settlement IDs as ambiguous.

New writes update only reviewed headers and preserve unknown physical columns. No historical row is
rewritten by the planner.

The Phase 4 migration planner is preview-only, identity-specific, append-only, duplicate-aware,
partial-schema aware, and reports source-data prerequisites. It always returns zero writes and zero
historical rows touched. The active handler blocks staging and production before actor resolution or
spreadsheet access. No migration was executed.

## 13. Local verification

Phase 4 has 67 focused tests covering:

- integer money and overflow;
- monthly/daily/hourly/per-minute salary bases and policy fallback;
- deficit caps and no double counting;
- overtime approval, caps, multiplier, staleness, and eligibility;
- paid/unpaid/sick leave, absence, rest, closure, partial absence, and allowance;
- missing/open/stale/unlocked days;
- deterministic hashes and snapshots;
- period lifecycle, multi-employee/branch scope, four-eyes approval, lock/reopen;
- settlement superseding and staleness;
- manual credits/debits and append-only decisions;
- role DTOs, forged inputs, employee self-view, and legacy permission denial;
- export authorization and formula injection;
- failure at every write boundary, retry, rollback, and recovery marker;
- legacy schema classification;
- migration zero-write behavior;
- generated bundle equality/loadability;
- UI/router wiring and Phase 5 isolation.

The strict Phase 4 review suite contains 94 dedicated tests. All safe local Phase 1–4, Booking,
inventory, and environment-mock suites must pass before handoff. Live staging tests were not run.

## 14. Phase boundary

Phase 4 produces attendance settlement records and an authorized CSV report only. It does not:

- execute salaries or bank transfers;
- submit to an external payroll provider;
- merge commissions, tips, advances, bonuses, or final payslips;
- generate Booking slots;
- filter Booking Availability;
- cancel or modify Bookings;
- implement any Attendance-to-Booking behavior;
- begin Phase 5.
