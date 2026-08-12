# CUT HUB POS — Production Booking Branch Backfill Preview

## Mode
READ-ONLY PREVIEW. No Production cells were written.

## Approved business rule
Production has one branch only:
- Branch ID: `CUT_HUB_MAIN`
- Display name: `CUT HUB MAIN BRANCH`

Therefore the proposed deterministic backfill policy is:
> Assign `CUT_HUB_MAIN` to every existing Booking row after the Phase 5 `BRANCH_ID` column is appended.

## Live Production Booking inventory
- Total existing booking rows: 26
- Duplicate IDs observed: 0
- Deleted=TRUE rows observed: 0
- Rows missing EMPLOYEE_ID: 5
- Rows eligible for deterministic branch assignment: 26
- Proposed BRANCH_ID cell writes during a separately approved backfill: 26

### Status distribution
- pending: 11
- confirmed: 6
- done: 6
- expired: 3

## Legacy-row note
The first 5 legacy bookings do not currently carry `EMPLOYEE_ID`.
This does not block branch assignment because the branch policy is organization-wide and there is only one Production branch.
It remains a separate legacy booking-data quality issue and must not be silently rewritten as part of this branch backfill.

## Proposed row policy
- Include `pending`, `confirmed`, `done`, and `expired` rows.
- Include all historical dates.
- Do not modify any field except the new Phase 5 `BRANCH_ID`.
- Do not infer or rewrite EMPLOYEE_ID, service IDs, timestamps, statuses, phone data, tokens, or prices.
- Fail closed if any row already has a non-empty BRANCH_ID different from `CUT_HUB_MAIN`.
- Fail closed if duplicate booking IDs appear before execution.
- Re-read the sheet immediately before execution and bind the plan to a hash/count.
- Execute only under a separate explicit Production approval.

## Preview result
`SAFE_DETERMINISTIC_SINGLE_BRANCH_BACKFILL`

Proposed target:
- 26 / 26 existing bookings -> `CUT_HUB_MAIN`
- 0 rows require branch-specific human mapping
- 0 rows are excluded by status
- 0 Production writes performed during this preview
