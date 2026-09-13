# Zero-write Migration Preview operator procedure

Status: **BLOCKED—no verified isolated Staging resources or operator inputs are available.** This procedure does not authorize execution. Never call an execution/initialization entry point.

Global prerequisites: approved source scope; isolated Staging Spreadsheet/project; active ID matching both configured pins; authorized owner; recoverable backup; baseline evidence; reviewed RC; synthetic data only. For every step capture timestamp, operator/role, project fingerprint, redacted Spreadsheet fingerprint, source/RC hash, entry point, input, result, blockers, `writes=0`, `historicalRowsTouched=0` where returned, and reviewer approval.

| Order | Preview entry point | Role | Properties / environment | Expected target and schema evidence | Required result | Immediate stop conditions |
|---|---|---|---|---|---|---|
| Identity | `verifyStagingEnvironment` (read-only identity check) | project owner/operator | `CUT_HUB_ENVIRONMENT=staging`; both Spreadsheet pins equal active | isolated Staging identity, timezone, backend version | identity exact; no sheet/header mutation | missing/malformed/mismatched ID, unknown active file, wrong project/environment |
| Phase 1 | `StaffAttendanceCore.planSchemaMigration` through approved preview harness only | owner/reviewer | identity proven; Preview mode | Attendance foundation schemas and legacy aliases from source | `executionAllowed=false`; writes 0 | duplicate/unknown headers, order conflict, missing dependency |
| Phase 2 | `previewStaffScheduleMigration` | owner | identity proven; safe flags remain false | `BARBER_SCHEDULE`, overrides, audit, idempotency, scopes; append-only columns/aliases | Preview label; writes 0; execution unavailable | auth/scope error, conflict, any write/checkpoint |
| Phase 3 | `previewAttendanceMigration` | owner | identity proven | attendance/events/policies/adjustments/leave/overtime | execution blocked; writes 0 | Phase 2 incomplete, duplicate identities, incompatible schema |
| Phase 4 | `previewPayrollPhase4Migration` | owner | identity proven | periods, settlements, adjustments, audit/idempotency; snapshot/hash columns | execution blocked; writes 0 | Phase 3 incomplete, settlement/header conflict |
| Phase 5 | `bookingAvailabilityPhase5PreviewMigration` or action `previewBookingAvailabilityMigration` | owner | identity proven; engine `LEGACY`; all live/conflict/detector flags false | registry/hours/versions/generations/transactions/overrides/conflicts/audit plus Booking/Services appends | `executionAllowed=false`, `writes=0`, `historicalRowsTouched=0` | permission/identity error, unknown/order conflict, any mutation |

Approval is mandatory after each preview before continuing to the next. Identity/bootstrap `initializeBookingStagingEnvironment` and both booking-rating execution functions are execution entry points and are explicitly forbidden in this task. If any preview writes a row, header, checkpoint, property, cache marker, or audit event, stop, preserve evidence, and classify the candidate NO-GO.
