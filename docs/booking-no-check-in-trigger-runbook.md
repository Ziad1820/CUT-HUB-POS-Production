# Booking no-check-in detector trigger runbook

> **NOT APPROVED FOR INSTALLATION.** This specification is local pre-Staging evidence only. Do not install, execute, remove, or modify a trigger until Staging has succeeded and a separate authorized change approves activation.

## Proposed trigger identity

- Callable function: `runBookingNoCheckInDetector`
- Proposed cadence: every five minutes.
- Installer/deployer: the reviewed Apps Script owner only.
- Runtime identity: `Session.getEffectiveUser().getEmail()` must exactly equal the normalized `BOOKING_NO_CHECK_IN_TRIGGER_OWNER_EMAIL` Script Property.
- The detector also requires an owner actor. An interactive invocation must use a valid owner session; a future time-driven invocation must satisfy the effective-user contract above.
- Do not use a manager, shared browser session, client-supplied actor, or client-supplied email as trigger identity.

## OAuth scope review

The future authorized operator must confirm the project manifest and consent screen before installation. The detector needs spreadsheet access and effective-user identity. Trigger administration additionally needs Apps Script trigger management:

- `https://www.googleapis.com/auth/spreadsheets`
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/script.scriptapp` for the separate installation/removal operation only

The wider CUT-HUB-POS project may already require Drive or other scopes for unrelated invoice functions. Do not broaden scopes solely for this detector without a separate review.

## Required Script Properties and accepted values

No property is changed by this runbook or the detector tests.

| Property | Accepted value | Safe default |
|---|---|---|
| `CUT_HUB_ENVIRONMENT` | Current code permits detector execution only for `development` or `test` | anything else blocks execution |
| `CUT_HUB_SPREADSHEET_ID` | Exact reviewed spreadsheet ID | missing/mismatch blocks execution |
| `BOOKING_AVAILABILITY_ENGINE` | detector requires `PHASE5`; system also recognizes `LEGACY`, `SHADOW` | `LEGACY` |
| `BOOKING_PHASE2_PLANNED_ENABLED` | `true`/`false` | closed unless normalized PHASE5 default applies; set explicitly for rollout |
| `BOOKING_ATTENDANCE_LIVE_ENABLED` | `true`/`false` | closed outside PHASE5 |
| `BOOKING_CONFLICT_RESOLUTION_ENABLED` | `true`/`false` | `false` |
| `BOOKING_NO_CHECK_IN_DETECTOR_ENABLED` | `true`/`false` | `false` |
| `BOOKING_NO_CHECK_IN_TRIGGER_OWNER_EMAIL` | exact reviewed lowercase owner/deployer email | missing blocks time-trigger identity |

Production and Staging execution remain blocked in code even if every flag is true. Removing that block requires a future explicit activation review.

## Preconditions

The future invocation must fail closed unless all are true:

1. Environment and Spreadsheet identity match.
2. Environment is permitted by the then-approved code. It is currently development/test only.
3. Actor is the owner or the effective trigger user matches the reviewed owner email.
4. Engine is `PHASE5`.
5. Planned availability, live attendance, conflict resolution, and detector flags are enabled.
6. Branch is active, open, uniquely configured, and has a usable IANA timezone.
7. Staff identity, schedule, attendance, and booking remain authoritative and unique at mutation time.

## Batch and time budget

Server-side caps are authoritative and client requests may only lower them:

| Limit | Default/server cap |
|---|---:|
| Branches per invocation | 5 |
| Staff members per invocation | 40 |
| Bookings inspected | 150 |
| Conflicts created | 30 |
| Detector work budget | 240,000 ms |
| Explicit execution safety margin | 30,000 ms before a 360,000 ms ceiling |

Each booking is re-read and revalidated while holding the existing script mutation lock. Do not raise these caps before Staging runtime and quota evidence exists.

## Checkpoint and continuation semantics

- Deterministic order is branch ID, staff ID, then booking ID.
- A partial result returns a versioned continuation object containing the source fingerprint, current branch/staff unit, and last completed booking ID.
- The source fingerprint covers deterministic units and active booking evidence. If booking evidence changes, continuation restarts from the beginning; deterministic transaction IDs and existing-conflict checks make that safe.
- Schedule, attendance, branch, and booking state are re-read immediately before each mutation, so a continued run never trusts its initial snapshot.
- `bookingAvailabilityPhase5DetectorCheckpointStorage()` is deliberately disabled. Its `save` and `clear` methods return `written:false` and do not touch Properties, Sheets, or Cache.
- Durable checkpoint writes are not approved. A future task may implement an audited store after Staging, without changing continuation semantics.

## Retry, locking, and overlap behavior

- Each conflict uses the existing transaction, compensation, version, audit, and script-lock patterns.
- Detector request identity is deterministic by branch, staff, and local date; conflict transaction identity also includes booking and evidence.
- An existing open/acknowledged matching conflict is a deterministic no-op and is counted as already existing.
- Two overlapping invocations serialize mutation revalidation through the existing script lock.
- Attendance recorded, booking cancellation/reschedule, schedule change, branch closure, or identity change before lock acquisition causes a safe skip or structured failure instead of a stale conflict.
- A transaction or per-conflict audit failure is isolated. Later bookings, staff, and branches continue; recovery-required transaction evidence remains authoritative.
- A partial batch is audited as `NO_CHECK_IN_DETECTION_BATCH_PARTIAL`, never as complete.

## Monitoring fields

Capture the returned batch summary and corresponding audit fields:

- run ID, start/end time, mode, and status
- branches/staff/bookings scanned
- eligible no-check-ins
- conflicts created and already existing
- skipped, failed, and revalidated records
- continuation token presence and `checkpointWritten`
- structured error scope/code/branch/staff/booking identifiers
- elapsed runtime, lock timeouts, transaction recovery markers, and duplicate-conflict count

Alert when:

- status is `PARTIAL` for three consecutive cadence windows
- a continuation fails to advance
- any `RECOVERY_REQUIRED` transaction exists
- lock timeouts or batch-audit failures occur
- invalid timezone, ambiguous identity, or spreadsheet mismatch occurs
- conflict creation reaches the cap repeatedly
- duplicate active conflicts for the same booking/code/evidence are nonzero
- runtime exceeds 210 seconds
- detector produces no audit/summary for two expected cadence windows after approved activation

## Verification procedures

### Zero duplicate conflicts

Group active conflicts by booking ID, conflict code, schedule source IDs, attendance day ID, and attendance event IDs. The count for every group must be one. Re-run the same detector input and confirm `conflictsCreated=0` and `conflictsAlreadyExisting` increases.

### Partial recovery

Retain the returned continuation object, correct the structured error cause, and invoke the next approved test run with that token. If the fingerprint is stale, expect a safe restart. Confirm previous conflict transactions are reused/no-op and the final batch is complete only when there is no continuation and no failure.

### Timezone behavior

Use at least Cairo plus one DST-observing IANA zone in isolated test branches. Confirm the local date and minute are calculated with the branch timezone. Invalid or unusable zones must produce one branch-scoped error and must not stop another branch.

### Exact grace boundary

For a first shift start of `10:00` and grace of 15 minutes:

- At `10:15`, the employee remains inside grace and no conflict is eligible.
- At the first minute strictly after the boundary (`10:16` with minute-resolution scheduling), eligibility may begin if attendance is still `NOT_STARTED`.
- Record check-in at the boundary and confirm lock-time revalidation suppresses conflict creation.

## Rollback and disablement

Preferred emergency disablement does not delete the trigger:

1. Set `BOOKING_NO_CHECK_IN_DETECTOR_ENABLED=false` through a separately authorized operator action.
2. If broader rollback is required, set the engine to `LEGACY` and close live conflict flags under the approved availability rollback plan.
3. Confirm subsequent invocations fail closed with `AVAILABILITY_FEATURE_DISABLED` and create no conflict.
4. Inspect open conflicts and recovery-required transactions; do not bulk-dismiss them without business review.

Future trigger removal procedure, only after authorization:

1. Enumerate project triggers as the owner/deployer.
2. Match exactly the handler `runBookingNoCheckInDetector` and the expected five-minute time-driven event.
3. Refuse removal if zero or multiple matches are found until identity is reconciled.
4. Delete only the uniquely matched trigger.
5. Verify no matching trigger remains and preserve the removal evidence in the operations log.

No trigger installation or removal code is present in the detector source.
