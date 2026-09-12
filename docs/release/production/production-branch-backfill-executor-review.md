# CUT HUB POS — Production Branch Backfill Executor Review

## Status

Disarmed review package. No Production execution has been authorized or performed.

## Scope

Only two data mappings are in scope:

1. `STAFF.BRANCH_ID`
2. `Bookings.BRANCH_ID`

Target branch:
`CUT_HUB_MAIN`

No other field may be modified.

## Safety rules

- Exact Production Apps Script project ID is pinned.
- Exact Production spreadsheet ID is pinned.
- `CUT_HUB_ENVIRONMENT=production` required.
- Effective Google user, active Google user, and spreadsheet owner must match.
- `BRANCH_ID` headers must already exist before preview.
- Every STAFF ID and Booking ID must be unique.
- Existing non-empty branch values different from `CUT_HUB_MAIN` block the plan.
- Already-correct rows are idempotent and skipped.
- Plan hash binds row numbers, IDs, branch column positions, and target set.
- Prepare token expires after five minutes.
- Fresh preview is required immediately before execution.
- Only BRANCH_ID cells are written.
- Rollback changes only cells proven to still contain the value written by this operation.
- Any unprovable rollback becomes `RECOVERY_REQUIRED`.

## Current live preview already established

Bookings:
- 26 existing booking rows
- all are deterministic single-branch candidates
- statuses include pending, confirmed, done, expired
- 5 legacy rows are missing EMPLOYEE_ID; that is explicitly out of scope

STAFF:
- all current Production staff belong to the same branch by approved business mapping

## Required order before any backfill

1. Phase 2 schema appends `STAFF.BRANCH_ID`
2. Phase 5 schema appends `Bookings.BRANCH_ID`
3. Fresh read-only branch backfill preview
4. Separate execution authorization
5. STAFF branch backfill
6. Booking branch backfill
7. Fresh verification
8. Only later consider Phase 5 authority activation

## Current state

`PROD_BRANCH_BACKFILL_EXECUTION_ARMED = false`
