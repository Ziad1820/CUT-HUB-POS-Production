# Staff Attendance Phase 3

Status: strict engineering review completed locally; ready for human approval. No deployment,
migration, production access, or staging access was performed.

## 1. Existing Attendance audit

The active legacy implementation was inspected before Phase 3 changes:

- `public/pages/attendance.html` and `public/assets/js/pages/attendance.js` used the legacy actions `createAttendanceRecord`, `getAttendanceRecords`, `updateAttendanceStep`, `approveAttendanceDeduction`, and `deleteAttendanceRecord`.
- `scripts/app-script-final-owner-access.js` still contains those compatibility actions and a fixed-prefix `ATTENDANCE_HEADERS` implementation. The legacy `ensureAttendanceSheet()` can write headers and `deleteAttendanceRecord()` deletes rows. Phase 3 does not call either function.
- Legacy attendance combined time capture, deduction suggestion, deduction approval, and payroll
  consumption in one row. Historical functions remain for report/source compatibility, but the
  active router rejects all five legacy Attendance API actions with
  `ATTENDANCE_LEGACY_PATH_DISABLED`. A scoped `listLegacyAttendanceRecords` Phase 3 read exposes
  classified, immutable legacy rows without activating them as events.
- Authenticated identity comes from `getAuthenticatedUser()`. Stable staff/branch scope comes from the approved `SCHEDULE_USER_SCOPES` resolver in `schedulePhase2Actor()`. Duplicate or missing mappings fail closed.
- Phase 2 `resolveSchedule()` remains authoritative for recurring shifts, multiple segments, weekly day off, custom shifts, planned leave/absence, interval blocks, and closures.
- Phase 1 `calculateDailyAttendance()` remains authoritative for elapsed minutes, breaks, grace, rounding, deficits, and raw overtime.
- Existing settlement and staff-accounting code was inspected but not called or extended.

## 2. Defects and risks found

Corrected in Phase 3:

- Replaced the active browser page's client-entered timestamps and monetary deduction UI with server-authoritative actions and minute-only diagnostics.
- Isolated new append-only events, adjustments, overtime decisions, daily aggregates, audit, and idempotency from destructive legacy CRUD.
- Added exact permission checks, branch scope, stable error codes, request fingerprints, lock ordering, transaction compensation, and durable recovery markers.
- Added overnight employee-date resolution and explicit-offset elapsed calculations.
- Added safe DOM rendering, stale response suppression, duplicate submit prevention, focus trapping, unsaved-dialog warnings, live regions, offline state, and periodic resync.

Known boundary risks:

- Real Apps Script/Sheets compensation, native dialog behavior, Cairo DST behavior in Apps Script, concurrent external writers, and deployed routing require nonproduction runtime validation after approval.
- Branch identity remains dependent on the existing `STAFF.BRANCH_ID` and approved scope data.
- Correction withdrawal is intentionally unsupported in Phase 3; a reviewer must reject a pending
  correction. Only one pending correction per staff-day is allowed.

## 3. Architecture

Load order in the generated Apps Script bundle:

1. `staff-attendance-schema.js`
2. `staff-attendance-core.js`
3. `staff-scheduling-phase2.js`
4. `staff-scheduling-phase2-gas.js`
5. `staff-attendance-phase3.js`
6. `staff-attendance-phase3-gas.js`

Upload the generated Phase 3 bundle only; do not also upload its six source modules or the Phase 2 bundle. The separately modified main app router remains required.

Mutation order:

`environment identity -> spreadsheet identity -> complete schema -> request ID/reason -> script lock -> authenticated actor -> staff/branch scope -> permission -> idempotency -> state validation -> append evidence -> calculate daily result -> persist daily result -> append audit -> persist idempotency result`

The memory repository snapshots all collections. The GAS repository journals appended/updated rows. Audit or daily-result failure compensates all journaled writes. Incomplete compensation leaves `ATTENDANCE_RECOVERY_<requestId>` and returns `ATTENDANCE_COMPENSATION_FAILED`.

## 4. Exact headers

The first 24 `ATTENDANCE` columns remain unchanged:

`ID, DATE, STAFF_ID, STAFF_NAME, RECORD_TYPE, SHIFT_START, CHECK_IN, BREAK_OUT, BREAK_IN, CHECK_OUT, WORK_HOURS, BREAK_HOURS, LATE_HOURS, SHORT_HOURS, ABSENCE_DAYS, PENALTY_AMOUNT, PENALTY_REASON, SUGGESTED_DEDUCTION, APPROVED_DEDUCTION, APPROVAL_STATUS, APPROVED_BY, NOTE, CREATED_AT, UPDATED_AT`

Phase 3 appends:

`ATTENDANCE_DAY_ID, BRANCH_ID, ATTENDANCE_DATE, TIMEZONE, STATUS, SCHEDULE_SOURCE, SCHEDULE_SOURCE_IDS, SCHEDULED_START, SCHEDULED_END, SHIFT_SEGMENTS, REQUIRED_WORK_MINUTES_RAW, REQUIRED_WORK_MINUTES_ROUNDED, ALLOWED_BREAK_MINUTES, ACTUAL_CHECK_IN, ACTUAL_CHECK_OUT, SESSION_COUNT, PRESENCE_MINUTES_RAW, PRESENCE_MINUTES_ROUNDED, ACTUAL_BREAK_MINUTES_RAW, ACTUAL_BREAK_MINUTES_ROUNDED, PAID_BREAK_CREDIT_MINUTES_RAW, WORKED_MINUTES_RAW, WORKED_MINUTES_ROUNDED, CREDITED_WORK_MINUTES_RAW, LATE_MINUTES_RAW, LATE_MINUTES_ROUNDED, EARLY_LEAVE_MINUTES_RAW, EARLY_LEAVE_MINUTES_ROUNDED, EXCESS_BREAK_MINUTES_RAW, EXCESS_BREAK_MINUTES_ROUNDED, DEFICIT_MINUTES_RAW, DEFICIT_MINUTES_ROUNDED, RAW_OVERTIME_MINUTES, APPROVED_OVERTIME_MINUTES, OVERTIME_APPROVAL_STATUS, LEAVE_OR_ABSENCE_TYPE, OPEN_SESSION, OPEN_BREAK, CALCULATION_WARNINGS, POLICY_ID, POLICY_SNAPSHOT, SCHEDULE_SNAPSHOT, LAST_EVENT_AT, CALCULATED_AT, CALCULATION_VERSION, LOCKED, REOPENED_COUNT, REOPENED_AT, REOPENED_BY, LAST_ACTION_ID, LAST_REQUEST_ID`

`UPDATED_AT` is already in the protected legacy prefix and is therefore not duplicated.

The aggregate tail also includes `ELIGIBLE_OVERTIME_MINUTES`, `SOURCE_EVENT_IDS`,
`SOURCE_EVENT_HASH`, `STALE_CALCULATION`, and `DAY_LIFECYCLE`. These fields make daily evidence,
staleness, closure, and locking independently reviewable.

`ATTENDANCE_EVENTS`:

`EVENT_ID, ATTENDANCE_DAY_ID, STAFF_ID, STAFF_NAME, DATE, BRANCH_ID, TIMEZONE, EVENT_TYPE, EVENT_AT, SESSION_INDEX, BREAK_INDEX, EVENT_SEQUENCE, STATUS, REVERSES_EVENT_ID, SOURCE_ENTITY_TYPE, SOURCE_ENTITY_ID, REASON, CORRECTION_PAYLOAD_JSON, ACTOR_ID, ACTOR_NAME, ACTOR_ROLE, CREATED_AT, REQUEST_ID, REQUEST_FINGERPRINT`

`ATTENDANCE_ADJUSTMENTS`:

`ADJUSTMENT_ID, ATTENDANCE_DAY_ID, STAFF_ID, DATE, TYPE, BEFORE_STATE_JSON, PROPOSED_STATE_JSON, FINAL_STATE_JSON, REASON, STATUS, REQUESTED_AT, REQUESTED_BY, REVIEWED_AT, REVIEWED_BY, REVIEW_NOTE, APPLIED_AT, APPLIED_BY, ACTION_ID, REQUEST_ID, REQUEST_FINGERPRINT`

`ATTENDANCE_OVERTIME_APPROVALS`:

`OVERTIME_APPROVAL_ID, ATTENDANCE_DAY_ID, STAFF_ID, DATE, RAW_OVERTIME_MINUTES, APPROVED_OVERTIME_MINUTES, STATUS, DECISION_REASON, DECIDED_AT, DECIDED_BY, REVERSES_APPROVAL_ID, DAY_CALCULATION_VERSION, DAY_LAST_EVENT_AT, DAY_SOURCE_EVENT_HASH, STALE, CREATED_AT, CREATED_BY, REQUEST_ID, REQUEST_FINGERPRINT`

## 5. State machine

- `NOT_STARTED -> CHECKED_IN` by `CHECK_IN`.
- `CHECKED_IN -> ON_BREAK` by `BREAK_START`.
- `ON_BREAK -> CHECKED_IN` by `BREAK_END`.
- `CHECKED_IN -> CHECKED_OUT` by `CHECK_OUT`.
- `CHECKED_OUT -> CHECKED_IN` begins another non-overlapping same-day session while unlocked.
- `NOT_STARTED -> ABSENT` only by privileged `MANAGER_MARK_ABSENT`.
- `CLOSED` is a day lifecycle; `LOCKED` is an independent mutation guard. `REOPEN_DAY` changes
  the lifecycle to `REOPENED`, unlocks the day, and preserves the attendance outcome.
- Open-break checkout is rejected unless `attendance.correct`, explicit `closeOpenBreak`, and a reason are supplied; a real `BREAK_END` event is appended before `CHECK_OUT`.
- Cancellation appends `CANCEL_EVENT`; approved correction appends `CORRECTION`. Original evidence is never rewritten.

## 6. Backend actions

Reads:

- `getAttendanceDashboard`
- `getEmployeeAttendanceDay`
- `listAttendanceEvents`
- `listUnresolvedAttendanceDays`
- `listOpenAttendanceBreaks`
- `getAttendanceAuditHistory`
- `listLegacyAttendanceRecords`
- `previewAttendanceMigration`

Mutations:

- `attendanceCheckIn`
- `attendanceStartBreak`
- `attendanceEndBreak`
- `attendanceCheckOut`
- `markAttendanceAbsent`
- `requestAttendanceCorrection`
- `approveAttendanceCorrection`
- `rejectAttendanceCorrection`
- `cancelAttendanceEvent`
- `reopenAttendanceDay`
- `closeAttendanceDay`
- `recalculateAttendanceDay`
- `requestAttendanceOvertime`
- `approveAttendanceOvertime`
- `rejectAttendanceOvertime`

## 7. Permissions and scope

- `attendance.view`: scoped reads only.
- `attendance.self_action`: check-in/break/check-out for the mapped employee only.
- `attendance.manage`: branch-scoped manager actions, explicit actual absence, closure, and recalculation.
- `attendance.correct`: cancellations, protected correction capabilities, and reopening.
- `attendance.approve_adjustment`: correction review; requester self-approval is rejected.
- `attendance.approve_overtime`: daily overtime review; requester self-approval is rejected.

Owner authority is derived from the authenticated model. Request actor fields and browser timestamps are ignored. Missing/duplicate identity, staff, entity, scope, and idempotency mappings fail closed. Salary, rate, amount, deduction, settlement, credential, token, fingerprint, spreadsheet, and request metadata fields are recursively filtered from responses.

Legacy `view_attendance` grants read-only `attendance.view` compatibility. It does not grant self-action, management, correction, or approval.

## 8. Calculation order and formulas

1. Resolve the effective Phase 2 schedule/override.
2. Resolve the Cairo attendance date, normally the scheduled shift start date.
3. Remove events referenced by active cancellations and apply approved correction evidence.
4. Order remaining events by event instant, then `EVENT_SEQUENCE`, `CREATED_AT`, and `EVENT_ID`.
5. Build sessions.
6. Build completed breaks and flag open/invalid intervals.
7. `presence raw = sum(check-out - check-in)`.
8. `actual break raw = sum(break end - break start)`.
9. `worked raw = max(0, presence raw - actual break raw)`.
10. Paid-break credit follows Phase 1 policy; unpaid breaks receive no credit.
11. Required work minutes are resolved once from all schedule segments or effective policy.
12. Lateness and early departure are diagnostics after grace.
13. `excess break = max(0, actual break - allowed break - break grace)`.
14. `deficit = max(0, required - credited work - forgiven grace)`; diagnostics are not added again.
15. `raw overtime = max(0, credited work - required)`.
16. `eligible overtime = min(daily cap, rounded max(0, credited work - required))` only when
    the configured minimum threshold is met.
17. Approved overtime is resolved from a separate append-only approval record.
18. Rounding follows the Phase 1 increment/mode after raw values are retained.
19. Warnings and unresolved flags are produced.
20. Detached schedule and policy snapshots are persisted.

No monetary calculation is called by Phase 3.

## 9. Break behavior

Multiple completed breaks are supported. Breaks must be inside an open session, cannot overlap, and must have positive monotonic duration. Paid/unpaid policy, allowance, grace, and maximum single-break duration come from the effective policy. Open breaks remain explicit unresolved state. Checkout never silently invents a break end.

## 10. Corrections and reopening

Requests persist before/proposed state, requester, reason, request fingerprint, and timestamps. Approval or rejection is four-eyes and append-only. Approved insertion or timestamp replacement becomes a `CORRECTION` event. Accidental action cancellation becomes `CANCEL_EVENT` referencing the original. Locked days cannot change until `REOPEN_DAY`, which increments `REOPENED_COUNT` and records actor/reason.

## 11. Overtime

Raw overtime is diagnostic. A request snapshots raw minutes, eligible minutes, calculation version,
last event time, and the source-event hash. Approval/rejection appends a new decision referencing
the request. Approval cannot exceed current eligible overtime or the daily cap. A request cannot be
decided twice, and only one unresolved request may exist per day. Changed attendance deterministically
flags the decision stale and resolves approved minutes to zero. No payable value is calculated.

## 12. Attendance UI

The Arabic RTL mobile-first page provides date/branch/staff filters, unresolved/open-break filters, employee cards, planned shift, state, check-in/out, worked/deficit/raw/approved overtime minutes, warnings, self actions, actual absence, correction requests and reviews, overtime requests and reviews, cancellation, close/reopen, event history, and audit history.

The browser never chooses event timestamps. Timers are display-only and the dashboard resyncs every 60 seconds. Rendering uses `textContent`, DOM nodes, and `replaceChildren`; no `innerHTML` or inline handlers exist. Dialogs have accessible names, focus traps, escape handling, and unsaved input confirmation.

## 13. Legacy compatibility

- Header lookup is normalized and duplicate-aware.
- The original 24 columns remain ordered and unknown columns are preserved on supported Phase 3 aggregate updates.
- Historical rows without `ATTENDANCE_DAY_ID` are excluded from Phase 3 aggregate mutation and
  remain immutable legacy records. Blank rows are ignored; malformed timestamps, deleted flags,
  duplicate normalized headers, and duplicate staff/date rows receive explicit classifications.
- The Phase 1 reader reports missing protected headers as `INCOMPATIBLE_EXISTING_SCHEMA`.
- Phase 3 never infers stable identity from sheet row number.
- New writes fail until every reviewed Phase 3 header exists.

## 14. Migration planner

The planner is zero-write, append-only, deterministic, spreadsheet-specific, environment-specific, duplicate-aware, partial-schema aware, and reports `writes: 0`. It never touches historical rows. Phase 3 forces `executionAllowed: false` and adds `PHASE3_ENVIRONMENT_BLOCKED` for staging and production. No migration was run.

## 15. Tests

Phase 3 has 48 focused tests covering schema, state transitions, deterministic equal-time replay,
duplicate replay, locking, inactive staff, spoofing, scope, blocked days, absence, calculations,
breaks, overnight/DST, date resolution, raw/rounded values, cancellations, four-eyes corrections,
timestamp replacement, close/reopen, overtime/caps/staleness, every memory-transaction write
boundary, audit evidence, DTO filtering, legacy parsing/ambiguity, migration safety, bundle order,
GAS guards, UI safety, active wiring, and phase isolation.

Safe local regression result after implementation:

- Phase 1 core: 93 passed.
- Phase 2 essential: 10 passed.
- Phase 2 contract: 28 passed.
- Phase 2 strict review: 21 passed.
- Phase 3: 48 passed.
- Booking upgrade: 37 passed.
- Inventory negative-flow: 24 passed.
- Staging environment mocks: 9 passed.
- Booking production migration mocks: 13 passed.
- Standalone migration runner: 25 passed.

Total: 308 passed, 0 failed. Node syntax checks and `git diff --check` passed.

## 16. Phase boundaries

Phase 3 implements daily attendance diagnostics and daily minute approval only. It does not implement payroll-period monetary settlements, final deficit deductions, payable overtime settlement, leave allowance settlement, excess-absence monetary deductions, Booking Availability, or same-day Booking behavior.
