# Staff Scheduling Phase 2

Status: `PHASE 2 READY FOR ENGINEERING REVIEW`

Phase 2 implements recurring staff schedules and date-specific schedule
overrides only. It does not implement attendance events, payroll processing,
Booking Availability, deployment, or a live Google Sheets migration.

## 1. Existing-system inspection

- Page routing is static HTML with root redirect pages and shared sidebar
  normalization in `public/assets/js/utils/layout.js`.
- Browser authentication stores a session token; every API request is routed
  through `RomeoApi.request`. Server identity is reloaded from the `USERS`
  sheet by `getAuthenticatedUser`.
- The legacy permission model stores permission strings on users and grants
  the `owner` account the complete permission set.
- The legacy `BARBER_SCHEDULE` contract is eight positional columns. Existing
  Booking code has an unsafe header initializer, so Phase 2 does not call or
  reuse it.
- `STAFF` has stable staff IDs but no guaranteed branch column. Phase 2 reads
  `BRANCH_ID` only when it is explicitly present.
- Existing Booking locks and idempotency helpers are Booking-specific. Phase 2
  therefore owns isolated schedule lock, fingerprint, idempotency, and audit
  contracts.
- Existing pages use Arabic RTL markup, shared API/auth scripts, modal/dialog
  controls, mobile breakpoints, toasts, tables, and sidebar permissions.
- Safe tests are executable directly with Node. Worker-based aggregate
  `node --test` is avoided in this Windows environment because direct execution
  is the established reliable path.

### Conflict identified before implementation

The current `USERS` rows do not contain a trustworthy `STAFF_ID`, role, or
branch assignment. Inferring an employee from a display name or row number
would be unsafe. Phase 2 adds a migration-planned `SCHEDULE_USER_SCOPES` sheet
and fails closed for non-owner users until an explicit reviewed mapping exists.
The owner bypass remains explicit. No spreadsheet was changed to resolve this
conflict.

## 2. Architecture and file boundaries

- `scripts/staff-scheduling-phase2.js` is the pure domain, validation,
  resolution, repository-contract, service, and migration-planning module. It
  has no Google Sheets or network access.
- `scripts/staff-scheduling-phase2-gas.js` is the Apps Script adapter. It maps
  normalized headers, resolves server-side identity, acquires the script lock,
  and fails closed when the versioned write schema is absent.
- `scripts/build-staff-scheduling-phase2-bundle.js` creates the only supported
  Apps Script upload artifact,
  `scripts/staff-scheduling-phase2-apps-script-bundle.gs`, in the tested order
  schema → core → domain → adapter.
- `scripts/staff-attendance-schema.js` remains the shared Phase 1 schema
  contract. Phase 2 only appends schedule/override fields after the legacy
  prefix.
- `scripts/app-script-final-owner-access.js` has one isolated schedule router
  and the four schedule permissions. Existing Attendance and Booking routes
  are unchanged.
- `public/pages/schedule-management.html`,
  `public/assets/css/pages/schedule-management.css`, and
  `public/assets/js/pages/schedule-management.js` form the server-authoritative
  Arabic RTL management UI.
- `tests/staff-scheduling-phase2.test.js` covers domain essentials.
- `tests/staff-scheduling-phase2-contract.test.js` covers extended contracts,
  security, mutation behavior, compatibility, isolation, and UI surface.

## 3. Backend actions

Read actions:

- `listStaffSchedules`
- `getStaffWeeklySchedule`
- `listScheduleOverrides`
- `resolveStaffSchedule`
- `resolveStaffSchedulesRange`
- `getScheduleAuditHistory`
- `getSchedulePageData`
- `listScheduleUserScopes` (owner only)
- `previewStaffScheduleMigration` (owner only, zero-write)

Write actions:

- `saveScheduleSegment`
- `bulkSaveScheduleSegments`
- `deactivateScheduleSegment`
- `setWeeklyDayOff`
- `copyScheduleDay`
- `copyEmployeeSchedule`
- `applyScheduleDateRange`
- `createScheduleOverride`
- `transitionScheduleOverride`
- `cancelScheduleOverride`
- `reviewScheduleOverride`
- `saveScheduleUserScope` (owner only)

Every write requires a server-resolved actor, reason, permission, request ID,
script lock, idempotency fingerprint, complete validation, stable
response/error code, and audit record. Bulk operations validate all proposed
records before the first domain write. The GAS adapter journals row changes
inside the lock and compensates them if audit or idempotency persistence fails;
an `SCHEDULE_RECOVERY_<request ID>` marker remains only when compensation
cannot complete. Browser-supplied actor, staff name, timestamps, role, and
approval identity are ignored.

## 4. Permissions

- `schedule.view`
  - Employee: own staff ID only.
  - Manager: staff in explicitly assigned branches.
  - Owner: all staff.
- `schedule.manage`
  - Required for recurring schedule and non-leave override mutations.
  - Branch scope is enforced again on the server.
- `leave.request`
  - Employee can request only their own approved/unpaid/sick leave concepts.
  - New approval-controlled records are always `PENDING`.
- `leave.approve`
  - Required for approval/rejection.
  - The requester cannot approve their own request.
  - Approver branch scope is enforced without requiring `schedule.manage`.

Responses recursively remove salary, rates, deductions, settlements, and other
payroll-sensitive fields.

## 5. Recurring-schedule rules

- Canonical weekdays are `MONDAY` through `SUNDAY`; supported aliases are
  normalized.
- `SCHEDULE_ID` and `STAFF_ID` are stable; `STAFF_NAME` is copied from the
  authoritative staff record.
- Segment index is an integer from 1 to 20. Output ordering is segment index,
  then start time.
- Start/end must be valid non-equal clock times. End before start is an
  overnight segment.
- Required and allowed-break minutes are non-negative integers. Required
  minutes cannot exceed duration; required plus allowed break cannot exceed
  duration.
- Effective-from is required, effective-to is optional and inclusive, and the
  range cannot be reversed.
- Inactive/nonexistent staff cannot receive an active schedule.
- Active overlapping weekly intervals with overlapping effective ranges are
  rejected, including overnight overlap across the Sunday/Monday boundary.
- Exact active duplicates receive a distinct stable duplicate error when all
  identifying interval/range values match.
- Deletion is not exposed. Deactivation and weekly-rest assignment are soft
  changes with before/after audit evidence.

## 6. Override rules and precedence

Supported types:

`CUSTOM_SHIFT`, `DAY_OFF`, `APPROVED_LEAVE`, `UNPAID_LEAVE`, `SICK_LEAVE`,
`ABSENT`, `PARTIAL_ABSENCE`, `PLANNED_BREAK`, `TRAINING`, and
`BRANCH_CLOSED`.

- Custom shifts require shift times and valid required/break minutes and reject
  block fields.
- Partial absence, planned break, and training require a valid bounded block
  interval and reject shift fields.
- Full-day types reject stale shift and block fields.
- Branch closure must be branch or organization scope. Branch scope requires
  a branch ID.
- Leave records are created pending and require source evidence before
  approval.
- Status changes follow an explicit state machine. Cancellation records
  cancellation actor/time/reason and preserves the prior record in audit
  evidence.
- Rejected and cancelled records never affect resolution.
- Approved custom shifts replace recurring segments.
- Approved full-day precedence is deterministic:
  `BRANCH_CLOSED`, `ABSENT`, `UNPAID_LEAVE`, `SICK_LEAVE`,
  `APPROVED_LEAVE`, then `DAY_OFF`.
- Approved interval overrides remain structured blocked intervals.
- Missing schedule minutes fall back to the effective policy snapshot.
- Resolution returns Cairo timezone, source IDs/type, segments, minute totals,
  blocks, classification, rest/closure flags, warnings, and a deterministic
  trace. It contains no Booking behavior.

## 7. UI

The dedicated RTL/mobile page provides:

- weekly recurring grid and date-range cards;
- employee, branch, and active filters;
- multiple shift segments and visible overnight labels;
- required-work and allowed-break inputs;
- weekly-rest control with confirmation;
- copy-day and copy-employee dialogs;
- confirmed bulk effective-range application;
- custom shift, day off, leave, absence, planned break, training, and branch
  closure creation;
- leave approval/rejection and compensating cancellation;
- effective date display and server conflict details;
- unsaved-change warning, duplicate-submit lock, loading/empty/error states,
  permission-disabled controls, accessible native dialogs/toasts, and audit
  history.
- owner-only UI management for authenticated-user to staff/branch scope
  mappings, without direct Sheets editing.

The UI performs no optimistic write and reloads server-authoritative state
after each successful mutation.

## 8. Backward compatibility

- The original eight `BARBER_SCHEDULE` columns remain first and unchanged.
- Legacy reads resolve normalized header names, tolerate missing Phase 2
  columns, classify rows as `LEGACY_INHERITED_POLICY`, and never rewrite them.
- Unknown columns are preserved in migration plans.
- Duplicate normalized headers and a changed legacy prefix are blocking
  conditions.
- New writes require every versioned Phase 2 header; they do not call the
  legacy header-enforcement function.
- Staff identity never falls back to row position when an explicit ID exists.
  Generated positional legacy IDs are used only by the existing staff reader's
  pre-existing fallback and are not used to merge ambiguous schedule rows.

## 9. Migration dry-run

Only an isolated planner and owner-only preview adapter were added. The planner
requires exact environment, expected spreadsheet ID, and actual spreadsheet
ID. Production/staging previews additionally require explicit environment
review approval. It reports:

- sheets that would be created;
- blank sheets that would be initialized;
- append-only missing columns;
- preserved unknown columns;
- normalized duplicate headers;
- legacy-prefix incompatibility;
- structured blocking errors;
- rollback-created sheets and appended ranges;
- `writes: 0` and `historicalRowsTouched: 0`.

Repeated dry-runs are deterministic. No migration or spreadsheet access was
executed during Phase 2.

## 10. Test results

Safe local regression result after strict engineering review:
**260 passed, 0 failed**.

- Phase 1 attendance/core: 93
- Phase 2 essential scheduling: 10
- Phase 2 extended contract/UI/isolation: 28
- Phase 2 strict review, Apps Script bundle, adapter, compensation, and
  adversarial security: 21
- Existing Booking upgrade: 37
- Existing inventory negative-flow: 24
- Existing staging-environment mocks: 9
- Existing Booking production migration mocks: 13
- Existing standalone migration-runner mocks: 25

The Phase 2 matrix covers single/multiple/adjacent/overlapping/overnight
segments, zero duration, minute bounds, effective boundaries and overlaps,
inactive records, weekday normalization, copy operations, bulk/idempotent
writes, mocked lock failure, every override class, override conflicts and
precedence, rejected/cancelled exclusion, four-eyes approval, cancellation
evidence, policy fallback, inactive staff, deterministic trace, Cairo timezone,
self/branch/owner scope, actor authority, sensitive filtering, stable errors,
legacy parsing, append-only migration planning, duplicate headers, zero-write
dry-runs, UI controls, and explicit Booking/Attendance-event isolation.

No live staging concurrency test was run.

## 11. Files

Phase 2 created:

- `docs/staff-scheduling-phase-2.md`
- `scripts/staff-scheduling-phase2.js`
- `scripts/staff-scheduling-phase2-gas.js`
- `scripts/build-staff-scheduling-phase2-bundle.js`
- `scripts/staff-scheduling-phase2-apps-script-bundle.gs`
- `tests/staff-scheduling-phase2.test.js`
- `tests/staff-scheduling-phase2-contract.test.js`
- `tests/staff-scheduling-phase2-review.test.js`
- `public/pages/schedule-management.html`
- `public/assets/css/pages/schedule-management.css`
- `public/assets/js/pages/schedule-management.js`
- `schedule-management.html`

Phase 2 modified:

- `scripts/staff-attendance-schema.js`
- `scripts/app-script-final-owner-access.js`
- `public/assets/js/core/auth.js`
- `public/assets/js/utils/layout.js`
- `public/pages/system-access.html`

Pre-existing Phase 1 files were preserved:

- `docs/staff-attendance-phase-1.md`
- `docs/staff-attendance-phase-1-engineering-review.md`
- `scripts/staff-attendance-core.js`
- `tests/staff-attendance-core.test.js`

Pre-existing Booking & Rating files were not modified by Phase 2:

- `scripts/booking-rating-production-migration.js`
- `scripts/booking-rating-standalone-migration-runner/`
- `tests/booking-rating-production-migration.test.js`
- `tests/booking-rating-standalone-migration-runner.test.js`

## 12. Runtime-only validation remaining

- Upload only the generated Phase 2 Apps Script bundle plus the separately
  modified main application script. Do not upload the four constituent module
  files alongside the bundle.
- Review and execute the migration only in a separately approved future task.
- Configure reviewed `SCHEDULE_USER_SCOPES` mappings before non-owner use.
- Validate the deployed Apps Script runtime's sheet date serialization and
  script-lock behavior with test-only data.
- Perform mobile/browser accessibility and Arabic copy review against the
  actual hosted frontend.
- Run approved non-production concurrency tests later; none were run now.

## 13. Risks and blockers

- Non-owner access intentionally remains blocked until explicit user/staff/
  branch scope records exist.
- Legacy schedule rows without Phase 2 minute columns inherit policy values;
  operators should review the dry-run and policy configuration before any
  migration.
- Google Sheets cannot provide a true multi-row database transaction. Phase 2
  validates proposed bulk writes before writing and serializes them under one
  lock, but adapter-level runtime fault injection still belongs in the future
  non-production validation.
- The Apps Script files require controlled upload order because the scheduling
  domain depends on the approved Phase 1 schema/core globals.

There is no blocker to engineering review. Booking integration and Attendance
actions were not implemented.
