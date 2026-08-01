# Migration execution matrix

This is a static, local-only preflight. No migration was executed and no remote preview was invoked.

Required dependency order:

`Identity/bootstrap → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5`

The Booking rating migration is a separate migration package and is never part of the Apps Script application package.

| Stage | Authoritative source | Preview entry point | Execution entry point | Authorization and environment guard | Idempotency/conflict handling | Expected sheets and headers | Backup/rollback/evidence | Current state |
|---|---|---|---|---|---|---|---|---|
| Identity/bootstrap | `scripts/app-script-final-owner-access.js` | `verifyStagingEnvironment` | `initializeBookingStagingEnvironment` exists and can create missing Booking/rating/schedule headers | Staging-only; active Spreadsheet must match both configured Spreadsheet identity properties | Repeated initialization avoids duplicate canonical headers | `Bookings`, `BOOKING_RATINGS`, `BARBER_SCHEDULE`; canonical Booking/rating/schedule headers and normalized aliases | Backup required before execution; record environment, project, active Spreadsheet, sheet/header counts | Execution exists inside the router rather than a separate migration package; do not invoke during preflight |
| Phase 1 Attendance | `staff-attendance-schema.js`, `staff-attendance-core.js` | `StaffAttendanceCore.planSchemaMigration` through later preview adapters | None | Development/test planning identity; Spreadsheet identity equality; Staging/Production execution not exposed | Duplicate normalized headers, legacy prefix conflict, and missing dependencies block; append-only plan | Attendance schema/policy foundations; exact schema constants in source | Preview: `writes=0`, `historicalRowsTouched=0`; rollback metadata names created sheets/appended ranges | Preview-only; execution disabled |
| Phase 2 Scheduling | `staff-scheduling-phase2.js`, `staff-scheduling-phase2-gas.js` | `previewStaffScheduleMigration` | None | Authenticated owner; environment and Spreadsheet guards | Strict legacy prefix/order; normalized duplicate detection; unknown legacy state is blocking/read-only | `BARBER_SCHEDULE`, `STAFF_SCHEDULE_OVERRIDES`, `STAFF_ATTENDANCE_AUDIT`, `STAFF_ATTENDANCE_IDEMPOTENCY`, `SCHEDULE_USER_SCOPES` | Backup required; capture created sheets, appended columns, blockers, zero historical writes | Preview-only; execution disabled |
| Phase 3 Attendance | `staff-attendance-phase3.js`, `staff-attendance-phase3-gas.js` | `previewAttendanceMigration` | None | Owner and identity checks; active preview blocks Staging/Production | Wraps core planner; incompatible schema, duplicate identity, and missing Phase 2 dependencies block | `ATTENDANCE`, `ATTENDANCE_EVENTS`, work policies, adjustments, leave ledger, overtime approvals | Backup required; preserve daily/event evidence and capture preview plan | Preview-only; execution disabled |
| Phase 4 Payroll Attendance | `staff-payroll-attendance-phase4.js`, `staff-payroll-attendance-phase4-gas.js` | `previewPayrollPhase4Migration` | None | Owner and identity checks; Staging/Production active preview blocked | Append-only settlement evolution; duplicate/ambiguous schema and missing Phase 3 dependencies block | Payroll periods, settlements, adjustments, audit, idempotency plus settlement snapshot/hash headers | Backup required; capture period/settlement row counts and preview rollback metadata | Preview-only; execution disabled |
| Phase 5 Booking Availability | `booking-availability-phase5.js`, `booking-availability-phase5-gas.js` | `bookingAvailabilityPhase5PreviewMigration` / action `previewBookingAvailabilityMigration` | None | Owner; exact environment and Spreadsheet identity; planner permits development/test only | Unknown Phase 5 columns, duplicate headers, incompatible order, partial append order, and missing dependencies block | Branch registry/hours, versions, generations, transactions, overrides, conflicts, audit; Booking/SERVICES append headers | Backup required; preview returns `executionAllowed=false`, `writes=0`, `historicalRowsTouched=0` | Preview-only; execution disabled |
| Booking rating, separate | `booking-rating-production-migration.js` and standalone runner directory | `previewBookingRatingProductionMigration` / `previewStandaloneBookingRatingProductionMigration` | `executeBookingRatingProductionMigration` and standalone equivalent exist | Explicit identity provider, environment/Spreadsheet checks, and execution confirmation required by source | Request/identity guards and canonical header reconciliation; inspect preview for partial prior state | `BOOKING_RATINGS` and Booking rating-related headers/aliases | Mandatory backup and retained preview evidence; rollback follows exact created/appended ranges | Execution code exists but is isolated from application package and was not run |

## Static safety findings

- Wrong Spreadsheet and wrong environment detection exist for all reviewed planners/adapters.
- Phase planners reject duplicate/conflicting schema and preserve append-only ordering.
- Phase 1–5 application migrations expose no execution entry point.
- Booking rating execution exists only in the separate migration package.
- Identity/bootstrap execution remains embedded in the router. This is a controlled-release risk and requires explicit operator approval and a future separation decision before use.
- No planner can prove a live backup exists; that is an operator gate.
- Static checks cannot prove live row counts, partially completed historical executions, or deployed project identity. Those remain Staging blockers.

## Required preview evidence

For every future authorized preview retain: operator, timestamp, environment, expected/actual Spreadsheet identity, source version/hash, planned sheets, planned columns, legacy aliases used, blockers, writes, historical rows touched, rollback metadata, and explicit reviewer decision. Execution requires a separate task and approval.
