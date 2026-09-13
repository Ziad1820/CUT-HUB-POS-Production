# CUT HUB POS — Phase 5 Production Migration Review

## Status

Preview-only review package. No Production execution path is implemented.

## Exact release contracts used

Authority sheets:
- BOOKING_BRANCH_REGISTRY
- BRANCH_BOOKING_HOURS
- BOOKING_AVAILABILITY_VERSIONS
- BOOKING_AVAILABILITY_GENERATIONS
- BOOKING_AVAILABILITY_TRANSACTIONS
- BOOKING_OPERATIONAL_OVERRIDES
- BOOKING_AVAILABILITY_CONFLICTS
- BOOKING_AVAILABILITY_AUDIT

Bookings append:
- 13 fields, starting after the current 42-column Production schema.

Services append:
- PREPARATION_MINUTES
- CLEANUP_MINUTES

## Approved branch preview

- Branch ID: CUT_HUB_MAIN
- Name: CUT HUB MAIN BRANCH
- Timezone: Africa/Cairo
- Active: true
- Public selectable: true
- Weekly hours: 12:00 to 02:00 next day, all seven weekdays.

## Important activation gates

Schema readiness and Phase 5 activation are different approvals.

Before Phase 5 becomes authoritative:
- Phase 2/3/4 schema must be complete.
- STAFF.BRANCH_ID must exist and all current staff must be mapped.
- BOOKING_BRANCH_REGISTRY and BRANCH_BOOKING_HOURS must be configured.
- Existing historical/current Bookings need an explicit branch assignment policy.
- Feature flags must remain non-authoritative until validation is complete.
- No no-check-in trigger is installed or enabled during migration.

## Current package behavior

- identity checks only
- exact schema preview only
- zero writes
- no feature flag change
- no branch data write
- no booking backfill
- no service data rewrite
- no trigger change
- no deployment
