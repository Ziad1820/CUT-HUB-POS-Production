# CUT HUB POS — Production Migration Runner Review Draft

## Status

This package is **review-only** and **cannot execute a Production schema mutation**.

`PROD_MIGRATION_EXECUTION_ARMED = false`

The draft was intentionally designed so that even if it were accidentally uploaded to the Production Apps Script project, the only supported operator actions are identity diagnostics and zero-write preview calls.

## Pinned Production identity

- Apps Script Project ID: `1UmjdRMGLukMt_0Be_ZL2krphwtZ-CQHPOiZ3GF10pY9-glgvoubfGflP`
- Production spreadsheet ID: `1r0I9J-IZF1GhMC4Yvj73S8VdjJQxMfmOgP4v0ZFNOb0`
- Required environment property: `CUT_HUB_ENVIRONMENT=production`
- Required spreadsheet property: `CUT_HUB_PRODUCTION_SPREADSHEET_ID`
- Spreadsheet timezone: expected `Africa/Cairo`
- Operator: must be the effective + active Google account and Drive owner of the Production spreadsheet.

## Production branch mapping approved for later configuration

- Branch count: 1
- Proposed canonical ID: `CUT_HUB_MAIN`
- Display name: `CUT HUB MAIN BRANCH`
- Timezone: `Africa/Cairo`
- Active: `TRUE`
- Public selectable: `TRUE`
- Hours: daily `12:00` through `02:00` next day (cross-midnight)
- Current staff: all seven Production staff rows belong to this branch.
- Current services: all current Production services are intended to be available at this single branch.

**No branch row, branch hours, STAFF branch ID, booking branch ID, or service data is written by this draft.**

## Supported zero-write previews

Run one function at a time from the Apps Script editor only after this file is separately reviewed and deliberately uploaded:

- `diagnosticProductionMigrationRunner()`
- `previewProductionPhase2Migration()`
- `previewProductionPhase3Migration()`
- `previewProductionPhase4Migration()`
- `previewProductionBranchFoundationMigration()`

Expected requirements for every preview:

- Production identity passes.
- `dryRun === true`
- `writes === 0`
- no errors
- no conflicts
- exact plan hash is returned
- no migration journal or token is needed for preview

## Phase 5

Phase 5 execution is **not supported** by this runner.

It requires a separate Production migration package because Phase 5 has additional Booking/Services/branch/availability authority schemas and branch backfill policy.

## Why execution is disarmed

The repository's existing executor is explicitly Staging-only. It has strong locking, prepared-token, plan-hash, journal and rollback mechanisms, but Production identity and approvals must not be enabled by simply weakening the Staging guard.

This draft therefore:
1. creates a separate Production identity gate;
2. keeps Preview separate from Prepare;
3. blocks Prepare while the arming constant is false;
4. does not implement Execute at all.

## Required review before any Git or Apps Script mutation

1. Compare preview output from this draft against the live read-only Production inventory.
2. Add unit tests for:
   - wrong Script ID
   - wrong spreadsheet ID
   - wrong environment
   - wrong owner
   - stale/changed plan
   - STAFF unknown-column preservation
   - append position after `productCommissionPercentage`
   - cross-midnight branch-hours representation
3. Decide whether Phase 2/3/4/Branch Foundation use one common Production executor or phase-specific executors.
4. Implement execute only by adapting the repository's reviewed Staging transaction/rollback engine, not by calling legacy initializers.
5. Keep Phase 5 in a separate migration authorization.
6. Run full repository regression.
7. Review exact Git diff.
8. Only then consider a separate Git commit/push.
9. Only after that consider Apps Script upload/version/deployment authorization.
10. Only after a fresh zero-write Production preview consider per-phase migration authorization.

## Current Production safety state

- Native pre-migration Google Sheets backup exists and was verified structurally.
- Current Production Apps Script deployment: version 27.
- Rollback candidate identified: version 25.
- Installable trigger inventory: empty.
- Production schema writes performed by this draft: 0.
- Production deployments performed by this draft: 0.
- Git mutations performed by this draft: 0.
