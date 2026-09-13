# Staff Scheduling and Attendance — Phase 1 Review

Status date: 2026-07-29
Scope: audit, architecture, exact schemas, pure calculation/state engines, and unit tests
Excluded: deployment, Google Sheets writes, backend action wiring, production/staging access, and booking integration

## 1. Current-system audit

### Runtime and storage

- The browser application is served from `public/`; the backend is a single Google Apps Script file, `scripts/app-script-final-owner-access.js`.
- `TIME_ZONE` is fixed to `Africa/Cairo`. Server display timestamps use `Utilities.formatDate`.
- Normalized staff IDs exist in `STAFF` column 5 and are used by Booking V2. Attendance still accepts a caller-supplied `STAFF_ID` and primarily matches open records and monthly deductions by normalized staff name.
- Permissions are comma-separated values in `USERS`. `owner` implicitly receives every value in `ALL_PERMISSIONS`.
- The current activity log stores action, entity, actor names, details, and time, but not before/after JSON, actor role, affected staff ID, or request ID.

### Current attendance UI

- `public/pages/attendance.html` and `public/assets/js/pages/attendance.js` provide one form and a historical card list.
- A work row has one check-in, one break-out, one break-in, and one check-out. Absence and free-form penalty rows are separate record types.
- “Now” actions use browser local time. The browser also calculates a preview from browser-entered values and locally cached salary data.
- The UI includes hard-coded fallback staff records and salaries in local storage. This is unsafe for payroll and can display stale or unauthorized financial data.
- There is no employee-card dashboard, live server timer, multi-break workflow, state-derived button availability, manager correction flow, overtime review, schedule editor, leave editor, or settlement screen.
- Arabic RTL scaffolding exists, but several strings in source appear mojibake-encoded.

### Current attendance backend

- The legacy `ATTENDANCE` model has 24 positional columns and stores decimal hours and deductions directly in the daily row.
- `createAttendanceRecord` blocks only another open work record with the same normalized staff name and date.
- `updateAttendanceStep` accepts any of four fields in any order and overwrites an existing value. It does not enforce a state machine.
- The caller supplies event time, staff ID/name, shift start, and salary. Server time is used only for created/updated timestamps.
- There is no `LockService` around attendance writes and no request idempotency key.
- Only `view_attendance` is needed to create or mutate any employee’s attendance. Deduction approval and row deletion use `view_staff_accounting`.
- Approved rows cannot be edited, but deletion remains possible and physically removes history.
- The implementation supports one break only, rejects overnight intervals by returning zero, assumes eight required hours, derives hourly value from salary / 26 / 8, and treats the first four absences of a month as free.
- Monthly staff accounting totals approved deductions by staff name, not stable staff ID or immutable settlement.

### Current schedule and booking behavior

- `BARBER_SCHEDULE` currently has eight columns: `SCHEDULE_ID, STAFF_ID, STAFF_NAME, WEEKDAY, SHIFT_START, SHIFT_END, ACTIVE, UPDATED_AT`.
- Booking schedule reads are positional and select the first active matching weekday row; multiple segments and effective dates are not supported.
- Weekdays accept English names, numeric Sunday–Saturday values, and several Arabic aliases. The source Arabic aliases appear encoding-damaged.
- Missing schedules return an internal 12:00–02:00 fallback marked `scheduled: false`, so no slots are emitted.
- Booking currently reads `ATTENDANCE` as a same-day availability override. `absent` blocks the day; a work row may replace shift start and an early check-out shortens the end.
- Breaks do not block booking intervals, strict check-in mode does not exist, buffers are not applied in this attendance path, and minimum notice is fixed at 15 minutes.
- Booking conflict checks correctly use interval overlap and active booking statuses, and Booking V2 uses a script lock for mutations. That lock discipline is not shared by attendance.

### Current reports/payroll

- The attendance page shows row count, absence count, approved deductions, and pending deductions.
- Staff accounting adds current-month approved attendance deductions to manual staff deductions.
- There is no policy-effective-date ledger, raw/rounded minutes report, leave balance, overtime ledger, immutable payroll-period settlement, unresolved-record report, or permission-filtered financial export.

## 2. Defects and risks

| Severity | Finding | Consequence |
|---|---|---|
| Critical | `ensureAttendanceHeaders` rewrites the first 24 cells whenever they are not an exact legacy match. | A naïve schema rollout can relabel or corrupt a partial/extended sheet. It must be replaced before any migration is run. |
| Critical | Attendance steps have no state-machine validation. | Break-before-check-in, repeated/open break, check-out-before-check-in, and time overwrites are possible. |
| Critical | Browser/caller supplies payroll event times and salary. | Time and money calculations are tamperable and can differ by device timezone/cache. |
| Critical | `view_attendance` authorizes all attendance mutations. | Viewers can act for other employees; granular server permissions are absent. |
| High | No attendance lock or idempotency protection. | Concurrent taps/requests can create duplicate or lost state. |
| High | Physical deletion of attendance rows is allowed. | Audit and payroll evidence can be destroyed. |
| High | Name-based joins remain in attendance and accounting. | Renames or duplicate names can mix records or deductions. |
| High | One break and one row represent all daily state. | Multiple breaks, corrections, and reliable audit reconstruction are impossible. |
| High | Overnight time arithmetic returns zero when end is before start. | Overnight attendance and deductions are wrong. |
| High | Hard-coded eight hours and salary / 26 / 8. | Ten-hour shifts, employee policies, and alternative day-value rules are wrong. |
| High | “First four absences are free” conflates leave and absence. | Weekly days off, leave types, approval, proration, and excess penalties are incorrect. |
| High | Approved daily deductions feed accounting without an immutable settlement. | Historical payroll changes when operational rows or names change. |
| Medium | Attendance is used as a booking schedule override. | Planned and actual concepts are coupled and precedence cannot be expressed safely. |
| Medium | Schedule reads are positional and first-match only. | Added columns, multiple segments, and overlapping records are unsafe. |
| Medium | Activity log lacks before/after state and request identity. | Sensitive actions cannot be fully reconstructed. |
| Medium | Date parsing falls back to `new Date(text)`. | Ambiguous inputs can vary by runtime; DST and timezone behavior is not explicit. |
| Medium | Financial data is returned with general staff/attendance views. | Salary and deductions can be disclosed beyond payroll roles. |

The model is migratable without rewriting history because the first 24 attendance columns and all eight current schedule columns can remain in place. Migration is conditional on removing positional/header-rewrite behavior from the future wired backend and passing a dry run against an explicitly identified non-production copy.

## 3. Final architecture

The domain boundary is:

1. `BARBER_SCHEDULE`: effective-dated recurring weekly shift segments.
2. `STAFF_SCHEDULE_OVERRIDES`: approved date-specific replacement/block records.
3. `ATTENDANCE_EVENTS`: append-only actual attendance events and reversals.
4. `ATTENDANCE`: one calculated daily aggregate and legacy compatibility projection.
5. `STAFF_WORK_POLICIES`: effective-dated organization default (`STAFF_ID` blank) and employee override.
6. `STAFF_LEAVE_LEDGER`: append-only allowance consumption and reversal entries.
7. `ATTENDANCE_ADJUSTMENTS`: proposed corrections with before/proposed/final snapshots.
8. `ATTENDANCE_OVERTIME_APPROVALS`: append-only overtime decisions and reversals.
9. `PAYROLL_ATTENDANCE_SETTLEMENTS`: period ledger with policy snapshot and lock.
10. `STAFF_ATTENDANCE_AUDIT`: immutable sensitive-action evidence.
11. `STAFF_ATTENDANCE_IDEMPOTENCY`: request fingerprint and replay result.

Resolution rules:

- Stable `STAFF_ID` is authoritative. `STAFF_NAME` is a display snapshot only.
- A policy is selected by employee and work date; employee policy wins over organization default. Overlapping effective ranges are invalid.
- Approved full-day override wins over custom shift; custom shift replaces recurring segments; interval overrides block only their interval.
- Daily calculations are pure and versioned. Raw minute fields are never overwritten by rounded values.
- An approved/locked settlement contains an immutable policy snapshot. Later policy edits do not recalculate it.
- Every write is server-authorized, executed under a script lock where it can race, keyed by request ID, and followed by an immutable audit row.

## 4. Exact proposed headers

Canonical definitions are exported by `scripts/staff-attendance-schema.js`.

### BARBER_SCHEDULE

```text
SCHEDULE_ID, STAFF_ID, STAFF_NAME, WEEKDAY, SHIFT_START, SHIFT_END, ACTIVE,
UPDATED_AT, SEGMENT_INDEX, REQUIRED_WORK_MINUTES, ALLOWED_BREAK_MINUTES,
EFFECTIVE_FROM, EFFECTIVE_TO, CREATED_AT, CREATED_BY, UPDATED_BY
```

`SEGMENT_INDEX` makes multiple daily segments deterministic. The eight legacy columns remain first and all additions are appended.

### STAFF_SCHEDULE_OVERRIDES

```text
OVERRIDE_ID, STAFF_ID, STAFF_NAME, DATE, TYPE, SEGMENT_INDEX, SHIFT_START,
SHIFT_END, REQUIRED_WORK_MINUTES, ALLOWED_BREAK_MINUTES, BLOCK_START, BLOCK_END,
REASON, STATUS, APPROVED_BY, APPROVED_AT, CREATED_AT, CREATED_BY, UPDATED_AT,
UPDATED_BY
```

### ATTENDANCE

The existing 24 columns remain first:

```text
ID, DATE, STAFF_ID, STAFF_NAME, RECORD_TYPE, SHIFT_START, CHECK_IN, BREAK_OUT,
BREAK_IN, CHECK_OUT, WORK_HOURS, BREAK_HOURS, LATE_HOURS, SHORT_HOURS,
ABSENCE_DAYS, PENALTY_AMOUNT, PENALTY_REASON, SUGGESTED_DEDUCTION,
APPROVED_DEDUCTION, APPROVAL_STATUS, APPROVED_BY, NOTE, CREATED_AT, UPDATED_AT
```

Append:

```text
ATTENDANCE_DAY_ID, STATE, SCHEDULE_SOURCE, SCHEDULE_ID, OVERRIDE_ID,
SCHEDULED_START_AT, SCHEDULED_END_AT, CHECK_IN_AT, CHECK_OUT_AT,
PRESENCE_MINUTES_RAW, ACTUAL_BREAK_MINUTES_RAW, PAID_BREAK_CREDIT_MINUTES_RAW,
WORKED_MINUTES_RAW, CREDITED_WORK_MINUTES_RAW, REQUIRED_MINUTES_RAW,
LATE_MINUTES_RAW, EARLY_LEAVE_MINUTES_RAW, EXCESS_BREAK_MINUTES_RAW,
DEFICIT_MINUTES_RAW, RAW_OVERTIME_MINUTES_RAW, PRESENCE_MINUTES,
ACTUAL_BREAK_MINUTES, PAID_BREAK_CREDIT_MINUTES, WORKED_MINUTES,
CREDITED_WORK_MINUTES, REQUIRED_MINUTES, LATE_MINUTES, EARLY_LEAVE_MINUTES,
EXCESS_BREAK_MINUTES, DEFICIT_MINUTES, RAW_OVERTIME_MINUTES,
APPROVED_OVERTIME_MINUTES, OVERTIME_APPROVAL_STATUS, POLICY_ID,
POLICY_SNAPSHOT_JSON, CALCULATION_VERSION, LOCKED, REOPENED_AT, REOPENED_BY,
LAST_ACTION_ID, LAST_REQUEST_ID
```

### ATTENDANCE_EVENTS

```text
EVENT_ID, ATTENDANCE_DAY_ID, STAFF_ID, STAFF_NAME, DATE, EVENT_TYPE, EVENT_AT,
SESSION_INDEX, BREAK_INDEX, STATUS, REVERSES_EVENT_ID, SOURCE_ENTITY_TYPE,
SOURCE_ENTITY_ID, REASON, ACTOR_ID, ACTOR_NAME, ACTOR_ROLE, CREATED_AT,
REQUEST_ID, REQUEST_FINGERPRINT
```

### STAFF_WORK_POLICIES

```text
POLICY_ID, STAFF_ID, EFFECTIVE_FROM, EFFECTIVE_TO, REQUIRED_DAILY_MINUTES,
DEFAULT_SHIFT_START, DEFAULT_SHIFT_END, ALLOWED_BREAK_MINUTES,
BREAK_PAYMENT_TYPE, ALLOW_MULTIPLE_BREAKS, MAX_SINGLE_BREAK_MINUTES,
BREAK_GRACE_MINUTES, EXCESS_BREAK_CONTRIBUTES_TO_DEFICIT, GRACE_LATE_MINUTES,
GRACE_EARLY_LEAVE_MINUTES, DEFICIT_RATE_TYPE, DEFICIT_RATE_PER_HOUR,
FIXED_LATE_PENALTY, DAILY_DEDUCTION_CAP, OVERTIME_RATE_PER_HOUR,
OVERTIME_MULTIPLIER, OVERTIME_POLICY, OVERTIME_APPROVAL_REQUIRED,
MIN_OVERTIME_THRESHOLD_MINUTES, DAILY_OVERTIME_CAP_MINUTES,
PERIOD_OVERTIME_CAP_MINUTES, OVERTIME_ALLOWED_WINDOWS_JSON,
ROUNDING_INCREMENT_MINUTES, ROUNDING_MODE, SETTLEMENT_PERIOD,
MONTHLY_ALLOWED_LEAVE_DAYS, LEAVE_CARRY_FORWARD, MAX_CARRY_FORWARD_DAYS,
LEAVE_TYPES_CONSUMING_JSON, LEAVE_TYPES_EXEMPT_JSON, PARTIAL_LEAVE_UNIT,
LEAVE_APPROVAL_REQUIRED, LEAVE_RESET_PERIOD, HIRE_DATE_PRORATION,
TERMINATION_DATE_PRORATION, EXCESS_ABSENCE_POLICY, EXCESS_ABSENCE_MULTIPLIER,
EXCESS_ABSENCE_FIXED_AMOUNT, MAX_EXCESS_ABSENCE_DEDUCTION, DAY_VALUE_METHOD,
FIXED_DAY_VALUE, MONTHLY_SALARY, WORKING_DAYS_DIVISOR, HOURLY_RATE, CURRENCY, ACTIVE,
CREATED_AT, CREATED_BY, UPDATED_AT, UPDATED_BY
```

### ATTENDANCE_ADJUSTMENTS

```text
ADJUSTMENT_ID, ATTENDANCE_DAY_ID, STAFF_ID, DATE, TYPE, BEFORE_STATE_JSON,
PROPOSED_STATE_JSON, FINAL_STATE_JSON, REASON, STATUS, REQUESTED_AT,
REQUESTED_BY, REVIEWED_AT, REVIEWED_BY, REVIEW_NOTE, APPLIED_AT, APPLIED_BY,
ACTION_ID, REQUEST_ID
```

### STAFF_LEAVE_LEDGER

```text
LEAVE_ENTRY_ID, STAFF_ID, STAFF_NAME, PERIOD_KEY, DATE, LEAVE_TYPE,
SOURCE_OVERRIDE_ID, UNITS_DAYS, MINUTES, DIRECTION, STATUS, REVERSES_ENTRY_ID,
SETTLEMENT_ID, POLICY_ID, POLICY_SNAPSHOT_JSON, REASON, CREATED_AT, CREATED_BY,
REQUEST_ID
```

### ATTENDANCE_OVERTIME_APPROVALS

```text
OVERTIME_APPROVAL_ID, ATTENDANCE_DAY_ID, STAFF_ID, DATE, RAW_OVERTIME_MINUTES,
APPROVED_OVERTIME_MINUTES, STATUS, DECISION_REASON, DECIDED_AT, DECIDED_BY,
REVERSES_APPROVAL_ID, CREATED_AT, REQUEST_ID
```

### PAYROLL_ATTENDANCE_SETTLEMENTS

```text
SETTLEMENT_ID, STAFF_ID, STAFF_NAME, PERIOD_START, PERIOD_END, SETTLEMENT_PERIOD,
REQUIRED_MINUTES, WORKED_MINUTES, DEFICIT_MINUTES, RAW_OVERTIME_MINUTES,
APPROVED_OVERTIME_MINUTES, ALLOWED_LEAVE_DAYS, CONSUMED_LEAVE_DAYS,
EXCESS_ABSENCE_DAYS, DEFICIT_VALUE, OVERTIME_VALUE,
EXCESS_ABSENCE_DEDUCTION, MANUAL_ADJUSTMENTS, NET_ATTENDANCE_ADJUSTMENT,
DAY_VALUE, DAY_VALUE_METHOD, POLICY_ID, POLICY_SNAPSHOT_JSON,
CALCULATION_VERSION, STATUS, APPROVED_BY, APPROVED_AT, LOCKED, LOCKED_AT,
LOCKED_BY, REOPENED_AT, REOPENED_BY, REOPEN_REASON, CREATED_AT, CREATED_BY,
UPDATED_AT, UPDATED_BY, LAST_REQUEST_ID, CURRENCY, DEFICIT_VALUE_MINOR,
OVERTIME_VALUE_MINOR, EXCESS_ABSENCE_DEDUCTION_MINOR, MANUAL_ADJUSTMENTS_MINOR,
NET_ATTENDANCE_ADJUSTMENT_MINOR
```

### STAFF_ATTENDANCE_AUDIT

```text
ACTION_ID, ENTITY_TYPE, ENTITY_ID, ACTION, ACTOR_ID, ACTOR_NAME, ACTOR_ROLE,
STAFF_ID, BEFORE_STATE_JSON, AFTER_STATE_JSON, REASON, TIMESTAMP, REQUEST_ID
```

### STAFF_ATTENDANCE_IDEMPOTENCY

```text
REQUEST_ID, ACTION, ACTOR_ID, REQUEST_FINGERPRINT, RESPONSE_JSON, STATUS,
CREATED_AT, EXPIRES_AT
```

## 5. Calculation formulas

All timestamps used for payroll are server-authoritative Cairo instants. Civil date/time parsing does not use browser locale.

```text
presenceMinutesRaw = checkOutAt - checkInAt
actualBreakMinutesRaw = sum(completed break end - start)
workedMinutesRaw = max(0, presenceMinutesRaw - actualBreakMinutesRaw)
paidBreakCreditMinutesRaw =
  BREAK_PAYMENT_TYPE == PAID
    ? min(actualBreakMinutesRaw, allowedBreakMinutes)
    : 0
creditedWorkMinutesRaw = workedMinutesRaw + paidBreakCreditMinutesRaw
requiredMinutesRaw = resolved effective schedule/policy value
lateMinutesRaw = grace(scheduledStartAt, checkInAt)
earlyLeaveMinutesRaw = grace(checkOutAt, scheduledEndAt)
excessBreakMinutesRaw =
  max(0, actualBreakMinutesRaw - allowedBreakMinutes - breakGraceMinutes)
deficitMinutesRaw = max(0, requiredMinutesRaw - creditedWorkMinutesRaw)
rawOvertimeMinutesRaw = max(0, creditedWorkMinutesRaw - requiredMinutesRaw)
deficitValue = approvedDeficitMinutes / 60 × deficitRatePerHour
```

`workedMinutesRaw` remains physical work as required by the core definition. `creditedWorkMinutesRaw` is explicit so a paid-break policy does not falsify physical work. Lateness, early leave, excess break, and partial absence are explanatory components; the monetary deficit is derived once from credited work versus required work.

Raw values are retained. Display/settlement values use policy rounding (`NONE`, `FLOOR`, `CEIL`, or `NEAREST`) and an explicit increment.

## 6. Overtime-mode behavior

- `OFFSET_DEFICIT_ONLY`: approved overtime value offsets deficit value; surplus becomes zero and is not carried or paid.
- `OFFSET_THEN_PAY`: approved overtime value offsets deficit value first; remaining value is payable.
- `PAY_ALL_OVERTIME_SEPARATELY`: gross deficit and gross approved overtime remain separate; net is reported.
- `NO_OVERTIME`: raw overtime minutes remain diagnostic but monetary overtime is zero.

Approval, minimum threshold, multiplier, daily cap, period cap, and allowed windows are applied before monetary settlement. Unapproved overtime contributes zero approved minutes.

## 7. Leave and excess-absence behavior

- `DAY_OFF` is exempt and never consumes allowance.
- Consuming/exempt leave types are policy lists, not hard-coded payroll assumptions.
- A partial day is stored as minutes or a fraction and converted against that day’s required minutes.
- Allowance is effective-period based, optionally prorated for hire/termination dates, with optional capped carry-forward.
- `usedAllowanceDays = min(chargeableAbsenceDays, allowedLeaveDays)`.
- `excessAbsenceDays = max(0, chargeableAbsenceDays - allowedLeaveDays)`.
- Penalties preserve actual absence history. A multiplier changes only monetary value.
- `DAY_VALUE_MULTIPLIER`, `FIXED_AMOUNT_PER_DAY`, and `WORKING_HOURS_BASED` are supported with an optional period cap.
- A calculated penalty is provisional until a manager approves and locks the settlement.

The required example produces `1 × 400 × 2 = 800`.

## 8. Day-value methods

- `FIXED_DAY_VALUE`: explicit policy amount.
- `MONTHLY_SALARY_DIVIDED_BY_CALENDAR_DAYS`: salary / exact calendar days in period.
- `MONTHLY_SALARY_DIVIDED_BY_WORKING_DAYS`: salary / explicit resolved working-day divisor.
- `REQUIRED_DAILY_HOURS_AT_HOURLY_RATE`: required daily minutes / 60 × hourly rate.

The method, inputs, and result are included in the settlement policy snapshot. No salary is inferred from unrelated columns.

## 9. Booking precedence rules (design only; not implemented in this phase)

1. Active, bookable employee.
2. Approved date override.
3. Otherwise effective recurring schedule segments.
4. Day off, approved leave, absence, or branch closure blocks.
5. Custom shift replaces recurring segments.
6. Planned breaks and interval blocks remove only overlapping intervals.
7. Existing active bookings remove overlaps.
8. Service duration and configured pre/post buffers must fit completely.
9. Past-time and minimum-notice rules apply.
10. Same-day attendance modifies remaining availability.

Default recommendation remains `SCHEDULE_MODE`. `STRICT_CHECK_IN_MODE` is opt-in. Booking code must not be wired to these models until attendance phases are implemented, reviewed, and approved.

## 10. Attendance UI design

- Mobile-first Arabic RTL today dashboard with employee cards.
- Each card shows planned segments, state, server check-in, current break timer, worked/required minutes, deficit/overtime estimates, leave/absence, and warnings.
- Only state-valid actions are enabled: check in, start/end break, check out.
- Manager menu: mark absent, resolve open break, correct, cancel accidental action, reopen, approve overtime.
- Filters by employee and state; separate unresolved and approval queues.
- Accessible focus-trapped dialogs, explicit destructive confirmation, non-color-only status, and announced toasts.
- Browser timers interpolate from a server timestamp but never become payroll input.
- No salary/rate fields are sent to general attendance views.

## 11. Schedule UI design

- Dedicated route with weekly grid and monthly calendar views.
- Employee/date filters, multiple segment editor, required minutes, allowed break minutes, day-off toggle, and effective dates.
- Copy day, copy employee, copy prior week, template application, date-range assignment, and bulk save.
- Override/leave/absence editor with approval status and audit drawer.
- Client validation is advisory; the server repeats overlap, effective-date, identity, and permission validation.
- Dirty-state navigation warning and one validation summary before bulk save.
- The UI calls backend actions only; it never instructs operators to edit Sheets.

## 12. Permissions

The exact proposed permission values are:

```text
attendance.view
attendance.self_action
attendance.manage
attendance.correct
attendance.approve_adjustment
attendance.approve_overtime
schedule.view
schedule.manage
leave.request
leave.approve
payroll_policy.view
payroll_policy.manage
payroll_settlement.view
payroll_settlement.approve
```

Every action must check its permission server-side. Self-actions also require authenticated actor-to-`STAFF_ID` mapping. Financial responses require payroll policy/settlement permissions. `owner` bypass can remain for backward compatibility but must still generate audit evidence.

## 13. Non-destructive migration plan

No migration was executed.

1. Freeze reviewed source in an isolated branch/worktree; do not use production `@HEAD`.
2. Require explicit `environment`, expected spreadsheet ID, actual spreadsheet ID, and confirmation token.
3. Read headers only and generate a dry-run report.
4. Reject blank/duplicate headers, displaced legacy attendance columns, partial legacy schedule schemas, or overlapping policy ranges.
5. Preserve every existing row and physical column order.
6. Create a required sheet only when absent.
7. Append missing columns only; use header-name mapping thereafter.
8. Do not backfill or recalculate historical attendance automatically.
9. Record created sheets and appended column coordinates as rollback evidence.
10. Re-run dry run; it must report zero further changes.
11. Only after review, run against a disposable non-production copy, then verify row counts, cell checksums, permissions, and regression suites.
12. Production execution requires a separate approval and is outside this task.

`planSchemaMigration` is a pure zero-write planner. It reports incompatibilities and is deterministic/idempotent.

## 14. Files added in Phase 1

- `scripts/staff-attendance-schema.js`: versioned schemas and permissions.
- `scripts/staff-attendance-core.js`: pure date/time, schedule, daily calculation, leave, overtime, settlement, state-machine, approval, fingerprint, and dry-run planning logic.
- `tests/staff-attendance-core.test.js`: Phase 1 unit tests.
- `docs/staff-attendance-phase-1.md`: audit and review record.

No current backend, page, deployment, or migration runner was changed by this phase.

Future phase files should be isolated modules first, then deliberately wired into `app-script-final-owner-access.js`, `public/pages/`, `public/assets/js/pages/`, `public/assets/css/pages/`, permission controls, and navigation.

## 15. Tests

Phase 1 includes 93 focused tests after strict-review corrections, including the original 59:

- 8/10-hour and overnight shifts;
- paid/unpaid/multiple/excess/open/overlapping breaks;
- late/early diagnostics and no double-counted deficit;
- grace, rounding, fixed penalties, and deduction caps;
- weekly day off, leave allowance, proration, carry-forward, fractional leave;
- all excess-absence and day-value methods;
- all overtime modes, approval, threshold, multiplier, and caps;
- custom-shift/full-day precedence and multiple schedule segments;
- valid and invalid attendance transitions, self-action permission, manager auto-close/correction audit;
- overtime and adjustment approval;
- locked settlements and detached policy snapshots;
- dry-run zero writes, schema incompatibility, migration idempotency, and request fingerprints.

Phase 5 booking integration tests (booking conflict/fit/notice and same-day modes) are intentionally not added or wired now. They become mandatory before Phase 5 approval.

## 16. Phased rollout plan

- Phase 1 (this review): audit, schemas, pure engines, tests.
- Phase 2: schedule/override repositories, granular server permissions, weekly/monthly schedule UI, audit/idempotency/locking.
- Phase 3: attendance daily aggregate and break repository, state-machine actions, corrections, dashboard, compatibility projection.
- Phase 4: leave balances, effective policies, overtime/deficit approvals, locked settlements, permission-filtered reports/exports.
- Approval gate: attendance behavior and settlement reconciliation must pass on a disposable copy.
- Phase 5: booking resolver integration, same-day modes, cache invalidation, and end-to-end tests.

Each phase is reviewed independently. None implies deployment.

## 17. Backward-compatibility assessment

Backward compatibility is achievable with conditions:

- Preserve the legacy 24 attendance columns and legacy eight schedule columns in their current positions.
- Keep reading historical legacy rows through a compatibility adapter; treat absent new columns as `LEGACY_UNMIGRATED`.
- Write new rows by header name and optionally project safe legacy display values for the old attendance page during transition.
- Stop accepting salary and authoritative event time from the browser.
- Resolve identity by `STAFF_ID`; name-only legacy rows require a dry-run ambiguity report, never silent reassignment.
- Replace destructive header enforcement and row deletion before enabling new writes.
- Do not use new policy values to rewrite historical approved deductions or locked periods.
- Booking behavior remains unchanged until the separately approved Phase 5.

## 18. Final implementation decision

**PHASE 1 READY FOR HUMAN APPROVAL**

This decision covers isolated Phase 1 source and tests only. It is not approval to migrate, wire the backend, deploy, merge, or push.
