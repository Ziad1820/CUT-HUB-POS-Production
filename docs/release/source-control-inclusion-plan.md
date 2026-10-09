# Source-control release inclusion plan

No files are staged or committed by this plan. Human approval is required before any Git mutation.

## Accounting

- Original immutable RC required-untracked entries: **60/60 accounted individually below**.
- Current manifest required entries: **350**; current required untracked: **0**.
- Every required path retains its approved commit assignment after commit, independent of transient working-tree state.
- Excluded entries remain excluded and must not be silently added.

## Proposed commits

### 1. feat(attendance): add attendance and staff scheduling runtime

- Files: `.gitattributes`, `THIRD_PARTY_NOTICES.md`, `api/apps-script.js`, `apps-script/production/001_core_environment.gs`, `apps-script/production/002_core_http-router.gs`, `apps-script/production/003_auth_runtime-policy.gs`, `apps-script/production/004_auth_protected-reads.gs`, `apps-script/production/005_shared_cairo-clock.gs`, `apps-script/production/006_auth_sessions.gs`, `apps-script/production/007_auth_security-state.gs`, `apps-script/production/008_auth_authorization.gs`, `apps-script/production/009_audit_activity-log.gs`, `apps-script/production/010_auth_user-repository.gs`, `apps-script/production/011_auth_credential-policy.gs`, `apps-script/production/012_auth_crypto.gs`, `apps-script/production/013_auth_credentials.gs`, `apps-script/production/014_auth_identifiers.gs`, `apps-script/production/015_auth_credential-migration.gs`, `apps-script/production/016_auth_login-throttle.gs`, `apps-script/production/017_auth_user-actions.gs`, `apps-script/production/018_catalog_services.gs`, `apps-script/production/019_staging_legacy-auth-preview.gs`, `apps-script/production/020_shared_sheet-schema.gs`, `apps-script/production/021_inventory_repository.gs`, `apps-script/production/022_inventory_stock.gs`, `apps-script/production/023_inventory_item-actions.gs`, `apps-script/production/024_inventory_purchases.gs`, `apps-script/production/025_inventory_service-recipes.gs`, `apps-script/production/026_inventory_checkout-planning.gs`, `apps-script/production/027_inventory_checkout-transaction.gs`, `apps-script/production/028_inventory_barber-consumption.gs`, `apps-script/production/029_staff_legacy-staff.gs`, `apps-script/production/030_staff_branch-repository.gs`, `apps-script/production/031_staff_mutable-fields.gs`, `apps-script/production/032_staff_lifecycle-repository.gs`, `apps-script/production/033_staff_transaction-journal.gs`, `apps-script/production/034_staff_legacy-settlement.gs`, `apps-script/production/035_staff_transaction-storage.gs`, `apps-script/production/036_staff_transaction-integrity.gs`, `apps-script/production/037_staff_transaction-actions.gs`, `apps-script/production/038_staff_lifecycle-actions.gs`, `apps-script/production/039_attendance_legacy-attendance.gs`, `apps-script/production/040_accounting_daily-closing.gs`, `apps-script/production/041_accounting_monthly-closing.gs`, `apps-script/production/042_invoices_schema.gs`, `apps-script/production/043_invoices_mutations.gs`, `apps-script/production/044_invoices_queries.gs`, `apps-script/production/045_invoices_deletion.gs`, `apps-script/production/046_accounting_withdrawals.gs`, `apps-script/production/047_accounting_expenses.gs`, `apps-script/production/048_invoices_pdf.gs`, `apps-script/production/049_reports_sales-customers.gs`, `apps-script/production/061_shared_date-and-number.gs`, `apps-script/production/062_phase_staff-attendance-schema.gs`, `apps-script/production/063_phase_staff-attendance-core.gs`, `apps-script/production/064_phase_staff-scheduling-phase2.gs`, `apps-script/production/065_phase_staff-scheduling-phase2-gas.gs`, `apps-script/production/066_phase_staff-import-preview-staging.gs`, `apps-script/production/067_phase_staff-attendance-phase3.gs`, `apps-script/production/068_phase_staff-attendance-phase3-gas.gs`, `apps-script/production/071_phase_staff-schema-migration-staging-executor.gs`, `apps-script/production/072_phase_core-staging-auth-bootstrap.gs`, `apps-script/production/074_phase_branch-foundation-staging.gs`, `apps-script/production/075_phase_branch-registry-row-staging.gs`, `apps-script/production/076_availability_config-and-repository.gs`, `apps-script/production/077_availability_request-snapshot.gs`, `apps-script/production/078_availability_authorization-cache.gs`, `apps-script/production/080_availability_evaluation.gs`, `apps-script/production/081_availability_transactions.gs`, `apps-script/production/082_availability_audit-versions.gs`, `apps-script/production/083_availability_overrides.gs`, `apps-script/production/084_availability_conflicts.gs`, `apps-script/production/085_availability_work-policy-transactions.gs`, `apps-script/production/086_availability_mutation-conflicts.gs`, `apps-script/production/087_availability_branch-actions.gs`, `apps-script/production/088_availability_no-check-in-detector.gs`, `apps-script/production/089_availability_action-router.gs`, `apps-script/production/README.md`, `apps-script/production/appsscript.json`, `apps-script/production/baseline/044_invoices_queries.js`, `apps-script/production/source-map.json`, `backend/README.md`, `backend/accounting/daily-closing.js`, `backend/accounting/expenses.js`, `backend/accounting/monthly-closing.js`, `backend/accounting/withdrawals.js`, `backend/attendance/apps-script.js`, `backend/attendance/engine.js`, `backend/attendance/legacy-attendance.js`, `backend/audit/activity-log.js`, `backend/auth/authorization.js`, `backend/auth/credential-migration.js`, `backend/auth/credential-policy.js`, `backend/auth/credentials.js`, `backend/auth/crypto.js`, `backend/auth/identifiers.js`, `backend/auth/login-throttle.js`, `backend/auth/protected-reads.js`, `backend/auth/runtime-policy.js`, `backend/auth/security-state.js`, `backend/auth/sessions.js`, `backend/auth/user-actions.js`, `backend/auth/user-repository.js`, `backend/availability/action-router.js`, `backend/availability/audit-versions.js`, `backend/availability/authorization-cache.js`, `backend/availability/branch-actions.js`, `backend/availability/config-and-repository.js`, `backend/availability/conflicts.js`, `backend/availability/engine.js`, `backend/availability/evaluation.js`, `backend/availability/mutation-conflicts.js`, `backend/availability/no-check-in-detector.js`, `backend/availability/overrides.js`, `backend/availability/request-snapshot.js`, `backend/availability/transactions.js`, `backend/availability/work-policy-transactions.js`, `backend/catalog/services.js`, `backend/core/environment.js`, `backend/core/http-router.js`, `backend/inventory/barber-consumption.js`, `backend/inventory/checkout-planning.js`, `backend/inventory/checkout-transaction.js`, `backend/inventory/item-actions.js`, `backend/inventory/purchases.js`, `backend/inventory/repository.js`, `backend/inventory/service-recipes.js`, `backend/inventory/stock.js`, `backend/invoices/deletion.js`, `backend/invoices/mutations.js`, `backend/invoices/pdf.js`, `backend/invoices/queries.js`, `backend/invoices/schema.js`, `backend/reports/sales-customers.js`, `backend/scheduling/apps-script.js`, `backend/scheduling/engine.js`, `backend/shared/cairo-clock.js`, `backend/shared/date-and-number.js`, `backend/shared/sheet-schema.js`, `backend/staff/attendance-core.js`, `backend/staff/legacy-staff.js`, `backend/staff/schema.js`, `backend/staging/branch-foundation.js`, `backend/staging/branch-registry-row.js`, `backend/staging/core-auth-bootstrap.js`, `backend/staging/inventory-preview.js`, `backend/staging/legacy-auth-preview.js`, `backend/staging/staff-import-preview.js`, `backend/staging/staff-schema-migration.js`, `config/apps-script-proxy.json`, `config/backend-sources.json`, `lib/apps-script-http.js`, `public/assets/css/pages/attendance.css`, `public/assets/css/pages/schedule-management.css`, `public/assets/css/pages/staff-import-preview.css`, `public/assets/css/shared.css`, `public/assets/css/system-layout.css`, `public/assets/images/bank-building.png`, `public/assets/images/card.png`, `public/assets/images/money.png`, `public/assets/images/salonix-logo.svg`, `public/assets/images/walet.png`, `public/assets/js/pages/attendance.js`, `public/assets/js/pages/dashboard-analysis.js`, `public/assets/js/pages/schedule-management.js`, `public/assets/js/utils/keyboard-navigation.js`, `public/assets/js/utils/language.js`, `public/assets/js/utils/layout.js`, `public/assets/js/utils/text-fix.js`, `public/pages/attendance.html`, `public/pages/schedule-management.html`, `scripts/branch-foundation-staging.js`, `scripts/branch-registry-row-staging.js`, `scripts/core-staging-auth-bootstrap.js`, `scripts/staff-attendance-core.js`, `scripts/staff-attendance-phase3-gas.js`, `scripts/staff-attendance-phase3.js`, `scripts/staff-attendance-schema.js`, `scripts/staff-import-preview-staging.js`, `scripts/staff-scheduling-phase2-gas.js`, `scripts/staff-scheduling-phase2.js`, `scripts/staff-schema-migration-staging-executor.js`
- Purpose: isolate one reviewable release concern.
- Dependencies: Earlier phase contracts and shared authentication/API boundaries.
- Validation: associated manifest tests, syntax checks, deterministic generation where applicable, and `git diff --check`.
- Generated files: `scripts/branch-foundation-staging.js`, `scripts/branch-registry-row-staging.js`, `scripts/core-staging-auth-bootstrap.js`, `scripts/staff-attendance-core.js`, `scripts/staff-attendance-phase3-gas.js`, `scripts/staff-attendance-phase3.js`, `scripts/staff-attendance-schema.js`, `scripts/staff-import-preview-staging.js`, `scripts/staff-scheduling-phase2-gas.js`, `scripts/staff-scheduling-phase2.js`, `scripts/staff-schema-migration-staging-executor.js`.
- Rollback impact: revert this logical unit only after confirming later dependent commits are also reverted or regenerated; never leave aggregate output inconsistent with source.

### 2. feat(payroll): add payroll attendance runtime

- Files: `apps-script/production/069_phase_staff-payroll-attendance-phase4.gs`, `apps-script/production/070_phase_staff-payroll-attendance-phase4-gas.gs`, `backend/payroll/apps-script.js`, `backend/payroll/engine.js`, `public/assets/css/pages/payroll-attendance.css`, `public/assets/js/pages/payroll-attendance.js`, `public/pages/payroll-attendance.html`, `scripts/staff-payroll-attendance-phase4-gas.js`, `scripts/staff-payroll-attendance-phase4.js`
- Purpose: isolate one reviewable release concern.
- Dependencies: Earlier phase contracts and shared authentication/API boundaries.
- Validation: associated manifest tests, syntax checks, deterministic generation where applicable, and `git diff --check`.
- Generated files: `scripts/staff-payroll-attendance-phase4-gas.js`, `scripts/staff-payroll-attendance-phase4.js`.
- Rollback impact: revert this logical unit only after confirming later dependent commits are also reverted or regenerated; never leave aggregate output inconsistent with source.

### 3. feat(booking): add booking and availability runtime

- Files: `apps-script/production/050_booking_schema-and-validation.gs`, `apps-script/production/051_booking_repository.gs`, `apps-script/production/052_booking_idempotency.gs`, `apps-script/production/053_booking_service-snapshots.gs`, `apps-script/production/054_booking_legacy-availability.gs`, `apps-script/production/055_booking_availability-authority.gs`, `apps-script/production/056_booking_options.gs`, `apps-script/production/057_booking_public-actions.gs`, `apps-script/production/058_booking_internal-actions.gs`, `apps-script/production/059_booking_ratings.gs`, `apps-script/production/060_booking_legacy-actions.gs`, `apps-script/production/073_phase_booking-availability-phase5.gs`, `apps-script/production/079_availability_booking-occupancy.gs`, `backend/availability/booking-occupancy.js`, `backend/booking/availability-authority.js`, `backend/booking/idempotency.js`, `backend/booking/internal-actions.js`, `backend/booking/legacy-actions.js`, `backend/booking/legacy-availability.js`, `backend/booking/options.js`, `backend/booking/public-actions.js`, `backend/booking/ratings.js`, `backend/booking/repository.js`, `backend/booking/schema-and-validation.js`, `backend/booking/service-snapshots.js`, `public/assets/css/pages/booking-availability-admin.css`, `public/assets/css/pages/bookings.css`, `public/assets/css/pages/customer-booking.css`, `public/assets/js/core/api.js`, `public/assets/js/core/auth.js`, `public/assets/js/core/runtime-config.js`, `public/assets/js/core/staff-import-preview.js`, `public/assets/js/pages/booking-availability-admin.js`, `public/assets/js/pages/bookings.js`, `public/assets/js/pages/cashier.js`, `public/assets/js/pages/customer-booking.js`, `public/pages/activity-log.html`, `public/pages/booking-availability-admin.html`, `public/pages/bookings.html`, `public/pages/cashier.html`, `public/pages/customer-booking.html`, `public/pages/customer-data.html`, `public/pages/daily-closing.html`, `public/pages/dashboard.html`, `public/pages/enventory.html`, `public/pages/expenses.html`, `public/pages/income-statement.html`, `public/pages/invoices.html`, `public/pages/login.html`, `public/pages/staff-accounting.html`, `public/pages/staff-discount.html`, `public/pages/system-access.html`, `public/pages/withdrawals.html`, `scripts/booking-availability-phase5-gas.js`, `scripts/booking-availability-phase5.js`
- Purpose: isolate one reviewable release concern.
- Dependencies: Earlier phase contracts and shared authentication/API boundaries.
- Validation: associated manifest tests, syntax checks, deterministic generation where applicable, and `git diff --check`.
- Generated files: `scripts/booking-availability-phase5-gas.js`, `scripts/booking-availability-phase5.js`.
- Rollback impact: revert this logical unit only after confirming later dependent commits are also reverted or regenerated; never leave aggregate output inconsistent with source.

### 4. build(apps-script): add aggregate bundle and deployment package

- Files: `config/apps-script-deployment-package.json`, `scripts/app-script-final-owner-access.js`, `scripts/booking-availability-phase5-apps-script-bundle.gs`, `scripts/build-booking-availability-phase5-bundle.js`, `scripts/validate-apps-script-deployment-package.js`
- Purpose: isolate one reviewable release concern.
- Dependencies: Commits 1–3 and the Phase 5 bundle generator; commit source plus regenerated aggregate/deployment metadata together.
- Validation: associated manifest tests, syntax checks, deterministic generation where applicable, and `git diff --check`.
- Generated files: `scripts/app-script-final-owner-access.js`, `scripts/booking-availability-phase5-apps-script-bundle.gs`.
- Rollback impact: revert this logical unit only after confirming later dependent commits are also reverted or regenerated; never leave aggregate output inconsistent with source.

### 5. build(migrations): add isolated preview and migration tooling

- Files: `scripts/booking-rating-production-migration.js`, `scripts/booking-rating-standalone-migration-runner/appsscript.json`, `scripts/booking-rating-standalone-migration-runner/booking-rating-production-migration-core.js`, `scripts/booking-rating-standalone-migration-runner/standalone-migration-adapter.js`
- Purpose: isolate one reviewable release concern.
- Dependencies: Validated runtime/source commits 1–4.
- Validation: associated manifest tests, syntax checks, deterministic generation where applicable, and `git diff --check`.
- Generated files: none.
- Rollback impact: revert this logical unit only after confirming later dependent commits are also reverted or regenerated; never leave aggregate output inconsistent with source.

### 6. test: add phase and safety coverage

- Files: `tests/apps-script-deployment-package.test.js`, `tests/apps-script-http.test.js`, `tests/apps-script-proxy.test.js`, `tests/attendance-page-functional.test.js`, `tests/auth-navigation.test.js`, `tests/auth01-combined-runtime-package.test.js`, `tests/auth01-crypto-vectors.test.js`, `tests/auth01-local-implementation.test.js`, `tests/auth01-v25-browser-smoke-harness.test.js`, `tests/backend-modularization.test.js`, `tests/booking-availability-admin-functional.test.js`, `tests/booking-availability-phase5-contract.test.js`, `tests/booking-availability-phase5-gas.test.js`, `tests/booking-availability-phase5.test.js`, `tests/booking-no-check-in-detector.test.js`, `tests/booking-rating-production-migration.test.js`, `tests/booking-rating-standalone-migration-runner.test.js`, `tests/booking-upgrade.test.js`, `tests/branch-foundation-staging.test.js`, `tests/branch-registry-row-staging.test.js`, `tests/cashier-panel-height.test.js`, `tests/core-staging-auth-bootstrap.test.js`, `tests/customer-booking-branch.test.js`, `tests/customer-tracking-ratings.test.js`, `tests/dashboard-analysis-loading.test.js`, `tests/fixtures/auth01-v25-browser-smoke-harness.js`, `tests/frontend-api-configuration.test.js`, `tests/frontend-relay-queue.test.js`, `tests/internal-booking-branch.test.js`, `tests/invoice-load-more-recovery.test.js`, `tests/invoice-sheet-read-recovery.test.js`, `tests/legacy-staff-snapshot-export.test.js`, `tests/local-release-candidate.test.js`, `tests/migration-preview-diagnostics.test.js`, `tests/payroll-attendance-page-functional.test.js`, `tests/production-backend-modularization.test.js`, `tests/release-manifest.test.js`, `tests/schedule-management-functional.test.js`, `tests/schedule-work-policy-ui.test.js`, `tests/shared-system-layout.test.js`, `tests/source-control-inclusion-plan.test.js`, `tests/staff-attendance-core.test.js`, `tests/staff-attendance-phase3.test.js`, `tests/staff-import-preview-staging.test.js`, `tests/staff-import-preview.test.js`, `tests/staff-payroll-attendance-phase4.test.js`, `tests/staff-scheduling-phase2-contract.test.js`, `tests/staff-scheduling-phase2-review.test.js`, `tests/staff-scheduling-phase2.test.js`, `tests/staff-schema-migration-staging-executor.test.js`, `tests/staff-work-policy-management.test.js`, `tests/staging-environment.test.js`
- Purpose: isolate one reviewable release concern.
- Dependencies: Validated runtime/source commits 1–4.
- Validation: associated manifest tests, syntax checks, deterministic generation where applicable, and `git diff --check`.
- Generated files: none.
- Rollback impact: revert this logical unit only after confirming later dependent commits are also reverted or regenerated; never leave aggregate output inconsistent with source.

### 7. build(release): add deterministic validation tooling

- Files: `.gitignore`, `scripts/build-backend.js`, `scripts/build-local-release-candidate.js`, `scripts/build-production-apps-script.js`, `scripts/build-staff-attendance-phase3-bundle.js`, `scripts/build-staff-payroll-attendance-phase4-bundle.js`, `scripts/build-staff-scheduling-phase2-bundle.js`, `scripts/generate-release-manifest.js`, `scripts/generate-source-control-inclusion-plan.js`
- Purpose: isolate one reviewable release concern.
- Dependencies: Validated runtime/source commits 1–4.
- Validation: associated manifest tests, syntax checks, deterministic generation where applicable, and `git diff --check`.
- Generated files: none.
- Rollback impact: revert this logical unit only after confirming later dependent commits are also reverted or regenerated; never leave aggregate output inconsistent with source.

### 8. docs(release): add runbooks and Staging controls

- Files: `config/frontend-runtime-config.staging.example.js`, `docs/apps-script-content-redirect-fix.md`, `docs/backend-refactor-baseline.json`, `docs/backend-refactor-production-deployment.md`, `docs/booking-no-check-in-trigger-runbook.md`, `docs/cashier-responsive-layout-fix.md`, `docs/cashier-stacked-panel-height-fix.md`, `docs/dashboard-analysis-loading-fix.md`, `docs/dashboard-api-relay-deployment.md`, `docs/invoice-load-more-recovery.md`, `docs/release-manifest.md`, `docs/release/frontend-staging-configuration.md`, `docs/release/human-approval-packet.md`, `docs/release/human-checkpoint-matrix.md`, `docs/release/migration-execution-matrix.md`, `docs/release/migration-preview-operator-procedure.md`, `docs/release/original-rc-required-untracked-baseline.md`, `docs/release/pre-staging-gate-report.md`, `docs/release/release-candidate-inventory.md`, `docs/release/source-control-inclusion-plan.md`, `docs/release/staging-baseline-evidence-template.md`, `docs/release/staging-configuration-template.md`, `docs/release/staging-core-auth-bootstrap-runbook.md`, `docs/release/staging-data-blueprint.md`, `docs/release/staging-operator-input.md`, `docs/release/staging-schema-migration-execution-runbook.md`, `docs/release/staging-script-property-plan.md`, `docs/release/staging-test-account-matrix.md`, `docs/staff-attendance-phase-1.md`, `docs/staff-attendance-phase-3.md`, `docs/staff-payroll-attendance-phase-4.md`, `docs/staff-scheduling-phase-2.md`, `docs/staging-entry-checklist.md`, `docs/standalone-data-analysis-removal.md`
- Purpose: isolate one reviewable release concern.
- Dependencies: Validated runtime/source commits 1–4.
- Validation: associated manifest tests, syntax checks, deterministic generation where applicable, and `git diff --check`.
- Generated files: `docs/release-manifest.md`, `docs/release/human-approval-packet.md`, `docs/release/original-rc-required-untracked-baseline.md`, `docs/release/release-candidate-inventory.md`, `docs/release/source-control-inclusion-plan.md`.
- Rollback impact: revert this logical unit only after confirming later dependent commits are also reverted or regenerated; never leave aggregate output inconsistent with source.

## Complete current classification

| Path | Git state | Manifest classification | Git action | Proposed commit | Reproducibility |
|---|---|---|---|---:|---|
| `.apps-script-staging/` | untracked | excluded intentionally | intentionally exclude | — | direct/authoritative |
| `.clasp.json` | untracked | excluded intentionally | intentionally exclude | — | direct/authoritative |
| `.codex-daily-closing-inline-check.js` | untracked | unrelated/pre-existing | intentionally exclude | — | direct/authoritative |
| `.gitattributes` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `.gitignore` | tracked | authoritative source | include in tests/release tooling commit | 7 | direct/authoritative |
| `.sync-backups/` | untracked | unrelated/pre-existing | intentionally exclude | — | direct/authoritative |
| `.vscode/settings.json` | tracked | unrelated/pre-existing | intentionally exclude | — | direct/authoritative |
| `THIRD_PARTY_NOTICES.md` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `api/apps-script.js` | tracked | backend integration | include in application commit | 1 | direct/authoritative |
| `apps-script/production/001_core_environment.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/002_core_http-router.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/003_auth_runtime-policy.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/004_auth_protected-reads.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/005_shared_cairo-clock.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/006_auth_sessions.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/007_auth_security-state.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/008_auth_authorization.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/009_audit_activity-log.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/010_auth_user-repository.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/011_auth_credential-policy.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/012_auth_crypto.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/013_auth_credentials.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/014_auth_identifiers.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/015_auth_credential-migration.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/016_auth_login-throttle.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/017_auth_user-actions.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/018_catalog_services.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/019_staging_legacy-auth-preview.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/020_shared_sheet-schema.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/021_inventory_repository.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/022_inventory_stock.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/023_inventory_item-actions.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/024_inventory_purchases.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/025_inventory_service-recipes.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/026_inventory_checkout-planning.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/027_inventory_checkout-transaction.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/028_inventory_barber-consumption.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/029_staff_legacy-staff.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/030_staff_branch-repository.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/031_staff_mutable-fields.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/032_staff_lifecycle-repository.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/033_staff_transaction-journal.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/034_staff_legacy-settlement.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/035_staff_transaction-storage.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/036_staff_transaction-integrity.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/037_staff_transaction-actions.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/038_staff_lifecycle-actions.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/039_attendance_legacy-attendance.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/040_accounting_daily-closing.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/041_accounting_monthly-closing.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/042_invoices_schema.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/043_invoices_mutations.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/044_invoices_queries.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/045_invoices_deletion.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/046_accounting_withdrawals.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/047_accounting_expenses.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/048_invoices_pdf.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/049_reports_sales-customers.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/050_booking_schema-and-validation.gs` | tracked | authoritative source | include in application commit | 3 | direct/authoritative |
| `apps-script/production/051_booking_repository.gs` | tracked | authoritative source | include in application commit | 3 | direct/authoritative |
| `apps-script/production/052_booking_idempotency.gs` | tracked | authoritative source | include in application commit | 3 | direct/authoritative |
| `apps-script/production/053_booking_service-snapshots.gs` | tracked | authoritative source | include in application commit | 3 | direct/authoritative |
| `apps-script/production/054_booking_legacy-availability.gs` | tracked | authoritative source | include in application commit | 3 | direct/authoritative |
| `apps-script/production/055_booking_availability-authority.gs` | tracked | authoritative source | include in application commit | 3 | direct/authoritative |
| `apps-script/production/056_booking_options.gs` | tracked | authoritative source | include in application commit | 3 | direct/authoritative |
| `apps-script/production/057_booking_public-actions.gs` | tracked | authoritative source | include in application commit | 3 | direct/authoritative |
| `apps-script/production/058_booking_internal-actions.gs` | tracked | authoritative source | include in application commit | 3 | direct/authoritative |
| `apps-script/production/059_booking_ratings.gs` | tracked | authoritative source | include in application commit | 3 | direct/authoritative |
| `apps-script/production/060_booking_legacy-actions.gs` | tracked | authoritative source | include in application commit | 3 | direct/authoritative |
| `apps-script/production/061_shared_date-and-number.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/062_phase_staff-attendance-schema.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/063_phase_staff-attendance-core.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/064_phase_staff-scheduling-phase2.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/065_phase_staff-scheduling-phase2-gas.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/066_phase_staff-import-preview-staging.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/067_phase_staff-attendance-phase3.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/068_phase_staff-attendance-phase3-gas.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/069_phase_staff-payroll-attendance-phase4.gs` | tracked | authoritative source | include in application commit | 2 | direct/authoritative |
| `apps-script/production/070_phase_staff-payroll-attendance-phase4-gas.gs` | tracked | authoritative source | include in application commit | 2 | direct/authoritative |
| `apps-script/production/071_phase_staff-schema-migration-staging-executor.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/072_phase_core-staging-auth-bootstrap.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/073_phase_booking-availability-phase5.gs` | tracked | authoritative source | include in application commit | 3 | direct/authoritative |
| `apps-script/production/074_phase_branch-foundation-staging.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/075_phase_branch-registry-row-staging.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/076_availability_config-and-repository.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/077_availability_request-snapshot.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/078_availability_authorization-cache.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/079_availability_booking-occupancy.gs` | tracked | authoritative source | include in application commit | 3 | direct/authoritative |
| `apps-script/production/080_availability_evaluation.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/081_availability_transactions.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/082_availability_audit-versions.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/083_availability_overrides.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/084_availability_conflicts.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/085_availability_work-policy-transactions.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/086_availability_mutation-conflicts.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/087_availability_branch-actions.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/088_availability_no-check-in-detector.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/089_availability_action-router.gs` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/README.md` | tracked | documentation | include in application commit | 1 | direct/authoritative |
| `apps-script/production/appsscript.json` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/baseline/044_invoices_queries.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `apps-script/production/source-map.json` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `attendance.html` | tracked | excluded intentionally | intentionally exclude | — | direct/authoritative |
| `backend/README.md` | tracked | documentation | include in application commit | 1 | direct/authoritative |
| `backend/accounting/daily-closing.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/accounting/expenses.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/accounting/monthly-closing.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/accounting/withdrawals.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/attendance/apps-script.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/attendance/engine.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/attendance/legacy-attendance.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/audit/activity-log.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/auth/authorization.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/auth/credential-migration.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/auth/credential-policy.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/auth/credentials.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/auth/crypto.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/auth/identifiers.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/auth/login-throttle.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/auth/protected-reads.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/auth/runtime-policy.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/auth/security-state.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/auth/sessions.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/auth/user-actions.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/auth/user-repository.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/availability/action-router.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/availability/audit-versions.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/availability/authorization-cache.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/availability/booking-occupancy.js` | tracked | authoritative source | include in application commit | 3 | direct/authoritative |
| `backend/availability/branch-actions.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/availability/config-and-repository.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/availability/conflicts.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/availability/engine.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/availability/evaluation.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/availability/mutation-conflicts.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/availability/no-check-in-detector.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/availability/overrides.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/availability/request-snapshot.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/availability/transactions.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/availability/work-policy-transactions.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/booking/availability-authority.js` | tracked | authoritative source | include in application commit | 3 | direct/authoritative |
| `backend/booking/idempotency.js` | tracked | authoritative source | include in application commit | 3 | direct/authoritative |
| `backend/booking/internal-actions.js` | tracked | authoritative source | include in application commit | 3 | direct/authoritative |
| `backend/booking/legacy-actions.js` | tracked | authoritative source | include in application commit | 3 | direct/authoritative |
| `backend/booking/legacy-availability.js` | tracked | authoritative source | include in application commit | 3 | direct/authoritative |
| `backend/booking/options.js` | tracked | authoritative source | include in application commit | 3 | direct/authoritative |
| `backend/booking/public-actions.js` | tracked | authoritative source | include in application commit | 3 | direct/authoritative |
| `backend/booking/ratings.js` | tracked | authoritative source | include in application commit | 3 | direct/authoritative |
| `backend/booking/repository.js` | tracked | authoritative source | include in application commit | 3 | direct/authoritative |
| `backend/booking/schema-and-validation.js` | tracked | authoritative source | include in application commit | 3 | direct/authoritative |
| `backend/booking/service-snapshots.js` | tracked | authoritative source | include in application commit | 3 | direct/authoritative |
| `backend/catalog/services.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/core/environment.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/core/http-router.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/inventory/barber-consumption.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/inventory/checkout-planning.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/inventory/checkout-transaction.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/inventory/item-actions.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/inventory/purchases.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/inventory/repository.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/inventory/service-recipes.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/inventory/stock.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/invoices/deletion.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/invoices/mutations.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/invoices/pdf.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/invoices/queries.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/invoices/schema.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/payroll/apps-script.js` | tracked | authoritative source | include in application commit | 2 | direct/authoritative |
| `backend/payroll/engine.js` | tracked | authoritative source | include in application commit | 2 | direct/authoritative |
| `backend/reports/sales-customers.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/scheduling/apps-script.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/scheduling/engine.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/shared/cairo-clock.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/shared/date-and-number.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/shared/sheet-schema.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/staff/attendance-core.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/staff/legacy-staff.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/staff/schema.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/staging/branch-foundation.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/staging/branch-registry-row.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/staging/core-auth-bootstrap.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/staging/inventory-preview.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/staging/legacy-auth-preview.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/staging/staff-import-preview.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `backend/staging/staff-schema-migration.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `booking-availability-admin.html` | untracked | excluded intentionally | intentionally exclude | — | direct/authoritative |
| `bookings.html` | tracked | excluded intentionally | intentionally exclude | — | direct/authoritative |
| `cashier.html` | tracked | excluded intentionally | intentionally exclude | — | direct/authoritative |
| `config/apps-script-deployment-package.json` | tracked | operational runbook | include in application commit | 4 | direct/authoritative |
| `config/apps-script-proxy.json` | tracked | backend integration | include in application commit | 1 | direct/authoritative |
| `config/backend-sources.json` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `config/frontend-runtime-config.staging.example.js` | tracked | authoritative source | include in documentation commit | 8 | direct/authoritative |
| `docs/apps-script-content-redirect-fix.md` | tracked | documentation | include in documentation commit | 8 | direct/authoritative |
| `docs/backend-refactor-baseline.json` | tracked | documentation | include in documentation commit | 8 | direct/authoritative |
| `docs/backend-refactor-production-deployment.md` | tracked | documentation | include in documentation commit | 8 | direct/authoritative |
| `docs/booking-no-check-in-trigger-runbook.md` | tracked | operational runbook | include in documentation commit | 8 | direct/authoritative |
| `docs/cashier-responsive-layout-fix.md` | tracked | documentation | include in documentation commit | 8 | direct/authoritative |
| `docs/cashier-stacked-panel-height-fix.md` | tracked | documentation | include in documentation commit | 8 | direct/authoritative |
| `docs/dashboard-analysis-loading-fix.md` | tracked | documentation | include in documentation commit | 8 | direct/authoritative |
| `docs/dashboard-api-relay-deployment.md` | tracked | documentation | include in documentation commit | 8 | direct/authoritative |
| `docs/invoice-load-more-recovery.md` | tracked | documentation | include in documentation commit | 8 | direct/authoritative |
| `docs/release-manifest.md` | tracked | operational runbook | include in documentation commit | 8 | generated from scripts/generate-release-manifest.js |
| `docs/release/frontend-staging-configuration.md` | tracked | documentation | include in documentation commit | 8 | direct/authoritative |
| `docs/release/human-approval-packet.md` | tracked | documentation | include in documentation commit | 8 | generated from scripts/build-local-release-candidate.js |
| `docs/release/human-checkpoint-matrix.md` | tracked | documentation | include in documentation commit | 8 | direct/authoritative |
| `docs/release/migration-execution-matrix.md` | tracked | documentation | include in documentation commit | 8 | direct/authoritative |
| `docs/release/migration-preview-operator-procedure.md` | tracked | documentation | include in documentation commit | 8 | direct/authoritative |
| `docs/release/original-rc-required-untracked-baseline.md` | tracked | documentation | include in documentation commit | 8 | generated from scripts/generate-source-control-inclusion-plan.js |
| `docs/release/pre-staging-gate-report.md` | tracked | documentation | include in documentation commit | 8 | direct/authoritative |
| `docs/release/release-candidate-inventory.md` | tracked | documentation | include in documentation commit | 8 | generated from scripts/build-local-release-candidate.js |
| `docs/release/source-control-inclusion-plan.md` | tracked | documentation | include in documentation commit | 8 | generated from scripts/generate-source-control-inclusion-plan.js |
| `docs/release/staging-baseline-evidence-template.md` | tracked | documentation | include in documentation commit | 8 | direct/authoritative |
| `docs/release/staging-configuration-template.md` | tracked | documentation | include in documentation commit | 8 | direct/authoritative |
| `docs/release/staging-core-auth-bootstrap-runbook.md` | tracked | documentation | include in documentation commit | 8 | direct/authoritative |
| `docs/release/staging-data-blueprint.md` | tracked | documentation | include in documentation commit | 8 | direct/authoritative |
| `docs/release/staging-operator-input.md` | tracked | documentation | include in documentation commit | 8 | direct/authoritative |
| `docs/release/staging-schema-migration-execution-runbook.md` | tracked | operational runbook | include in documentation commit | 8 | direct/authoritative |
| `docs/release/staging-script-property-plan.md` | tracked | documentation | include in documentation commit | 8 | direct/authoritative |
| `docs/release/staging-test-account-matrix.md` | tracked | documentation | include in documentation commit | 8 | direct/authoritative |
| `docs/staff-attendance-phase-1-engineering-review.md` | untracked | documentation | intentionally exclude | — | direct/authoritative |
| `docs/staff-attendance-phase-1.md` | tracked | documentation | include in documentation commit | 8 | direct/authoritative |
| `docs/staff-attendance-phase-3-strict-review.md` | untracked | documentation | intentionally exclude | — | direct/authoritative |
| `docs/staff-attendance-phase-3.md` | tracked | documentation | include in documentation commit | 8 | direct/authoritative |
| `docs/staff-payroll-attendance-phase-4-strict-review.md` | untracked | documentation | intentionally exclude | — | direct/authoritative |
| `docs/staff-payroll-attendance-phase-4.md` | tracked | documentation | include in documentation commit | 8 | direct/authoritative |
| `docs/staff-scheduling-phase-2-engineering-review.md` | untracked | documentation | intentionally exclude | — | direct/authoritative |
| `docs/staff-scheduling-phase-2.md` | tracked | documentation | include in documentation commit | 8 | direct/authoritative |
| `docs/staging-entry-checklist.md` | tracked | operational runbook | include in documentation commit | 8 | direct/authoritative |
| `docs/standalone-data-analysis-removal.md` | tracked | documentation | include in documentation commit | 8 | direct/authoritative |
| `lib/apps-script-http.js` | tracked | backend integration | include in application commit | 1 | direct/authoritative |
| `login.html` | tracked | excluded intentionally | intentionally exclude | — | direct/authoritative |
| `public/assets/css/pages/attendance.css` | tracked | UI stylesheet | include in application commit | 1 | direct/authoritative |
| `public/assets/css/pages/booking-availability-admin.css` | tracked | UI stylesheet | include in application commit | 3 | direct/authoritative |
| `public/assets/css/pages/bookings.css` | tracked | UI stylesheet | include in application commit | 3 | direct/authoritative |
| `public/assets/css/pages/customer-booking.css` | tracked | UI stylesheet | include in application commit | 3 | direct/authoritative |
| `public/assets/css/pages/payroll-attendance.css` | tracked | UI stylesheet | include in application commit | 2 | direct/authoritative |
| `public/assets/css/pages/schedule-management.css` | tracked | UI stylesheet | include in application commit | 1 | direct/authoritative |
| `public/assets/css/pages/staff-import-preview.css` | tracked | UI stylesheet | include in application commit | 1 | direct/authoritative |
| `public/assets/css/shared.css` | tracked | UI stylesheet | include in application commit | 1 | direct/authoritative |
| `public/assets/css/system-layout.css` | tracked | UI stylesheet | include in application commit | 1 | direct/authoritative |
| `public/assets/images/bank-building.png` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `public/assets/images/card.png` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `public/assets/images/money.png` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `public/assets/images/salonix-logo.svg` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `public/assets/images/walet.png` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `public/assets/js/core/api.js` | tracked | UI JavaScript | include in application commit | 3 | direct/authoritative |
| `public/assets/js/core/auth.js` | tracked | UI JavaScript | include in application commit | 3 | direct/authoritative |
| `public/assets/js/core/runtime-config.js` | tracked | UI JavaScript | include in application commit | 3 | direct/authoritative |
| `public/assets/js/core/staff-import-preview.js` | tracked | UI JavaScript | include in application commit | 3 | direct/authoritative |
| `public/assets/js/pages/attendance.js` | tracked | UI JavaScript | include in application commit | 1 | direct/authoritative |
| `public/assets/js/pages/booking-availability-admin.js` | tracked | UI JavaScript | include in application commit | 3 | direct/authoritative |
| `public/assets/js/pages/bookings.js` | tracked | UI JavaScript | include in application commit | 3 | direct/authoritative |
| `public/assets/js/pages/cashier.js` | tracked | UI JavaScript | include in application commit | 3 | direct/authoritative |
| `public/assets/js/pages/customer-booking.js` | tracked | UI JavaScript | include in application commit | 3 | direct/authoritative |
| `public/assets/js/pages/dashboard-analysis.js` | tracked | UI JavaScript | include in application commit | 1 | direct/authoritative |
| `public/assets/js/pages/payroll-attendance.js` | tracked | UI JavaScript | include in application commit | 2 | direct/authoritative |
| `public/assets/js/pages/schedule-management.js` | tracked | UI JavaScript | include in application commit | 1 | direct/authoritative |
| `public/assets/js/utils/keyboard-navigation.js` | tracked | UI JavaScript | include in application commit | 1 | direct/authoritative |
| `public/assets/js/utils/language.js` | tracked | UI JavaScript | include in application commit | 1 | direct/authoritative |
| `public/assets/js/utils/layout.js` | tracked | UI JavaScript | include in application commit | 1 | direct/authoritative |
| `public/assets/js/utils/text-fix.js` | tracked | UI JavaScript | include in application commit | 1 | direct/authoritative |
| `public/pages/activity-log.html` | tracked | UI page | include in application commit | 3 | direct/authoritative |
| `public/pages/attendance.html` | tracked | UI page | include in application commit | 1 | direct/authoritative |
| `public/pages/booking-availability-admin.html` | tracked | UI page | include in application commit | 3 | direct/authoritative |
| `public/pages/bookings.html` | tracked | UI page | include in application commit | 3 | direct/authoritative |
| `public/pages/cashier.html` | tracked | UI page | include in application commit | 3 | direct/authoritative |
| `public/pages/customer-booking.html` | tracked | UI page | include in application commit | 3 | direct/authoritative |
| `public/pages/customer-data.html` | tracked | UI page | include in application commit | 3 | direct/authoritative |
| `public/pages/daily-closing.html` | tracked | UI page | include in application commit | 3 | direct/authoritative |
| `public/pages/dashboard.html` | tracked | UI page | include in application commit | 3 | direct/authoritative |
| `public/pages/enventory.html` | tracked | UI page | include in application commit | 3 | direct/authoritative |
| `public/pages/expenses.html` | tracked | UI page | include in application commit | 3 | direct/authoritative |
| `public/pages/income-statement.html` | tracked | UI page | include in application commit | 3 | direct/authoritative |
| `public/pages/invoices.html` | tracked | UI page | include in application commit | 3 | direct/authoritative |
| `public/pages/legacy-staff-snapshot-local.html` | untracked | excluded intentionally | intentionally exclude | — | direct/authoritative |
| `public/pages/login.html` | tracked | UI page | include in application commit | 3 | direct/authoritative |
| `public/pages/payroll-attendance.html` | tracked | UI page | include in application commit | 2 | direct/authoritative |
| `public/pages/schedule-management.html` | tracked | UI page | include in application commit | 1 | direct/authoritative |
| `public/pages/staff-accounting.html` | tracked | UI page | include in application commit | 3 | direct/authoritative |
| `public/pages/staff-discount.html` | tracked | UI page | include in application commit | 3 | direct/authoritative |
| `public/pages/system-access.html` | tracked | UI page | include in application commit | 3 | direct/authoritative |
| `public/pages/withdrawals.html` | tracked | UI page | include in application commit | 3 | direct/authoritative |
| `schedule-management.html` | untracked | excluded intentionally | intentionally exclude | — | direct/authoritative |
| `scripts/app-script-final-owner-access.js` | tracked | backend integration | include in application commit | 4 | generated from scripts/build-backend.js + config/backend-sources.json |
| `scripts/booking-availability-phase5-apps-script-bundle.gs` | tracked | generated bundle | include in application commit | 4 | generated from scripts/build-booking-availability-phase5-bundle.js + declared constituent sources |
| `scripts/booking-availability-phase5-gas.js` | tracked | backend integration | include in application commit | 3 | generated from scripts/build-backend.js + config/backend-sources.json |
| `scripts/booking-availability-phase5.js` | tracked | authoritative source | include in application commit | 3 | generated from scripts/build-backend.js + config/backend-sources.json |
| `scripts/booking-rating-production-migration.js` | tracked | migration source | include in migration tooling commit | 5 | direct/authoritative |
| `scripts/booking-rating-standalone-migration-runner/appsscript.json` | tracked | migration preview | include in migration tooling commit | 5 | direct/authoritative |
| `scripts/booking-rating-standalone-migration-runner/booking-rating-production-migration-core.js` | tracked | migration source | include in migration tooling commit | 5 | direct/authoritative |
| `scripts/booking-rating-standalone-migration-runner/standalone-migration-adapter.js` | tracked | migration source | include in migration tooling commit | 5 | direct/authoritative |
| `scripts/branch-foundation-staging.js` | tracked | authoritative source | include in application commit | 1 | generated from scripts/build-backend.js + config/backend-sources.json |
| `scripts/branch-registry-bootstrap-executor-staging.js` | untracked | excluded intentionally | intentionally exclude | — | direct/authoritative |
| `scripts/branch-registry-bootstrap-preview-staging.js` | untracked | excluded intentionally | intentionally exclude | — | direct/authoritative |
| `scripts/branch-registry-row-staging.js` | tracked | authoritative source | include in application commit | 1 | generated from scripts/build-backend.js + config/backend-sources.json |
| `scripts/build-backend.js` | tracked | authoritative source | include in tests/release tooling commit | 7 | direct/authoritative |
| `scripts/build-booking-availability-phase5-bundle.js` | tracked | authoritative source | include in application commit | 4 | direct/authoritative |
| `scripts/build-local-release-candidate.js` | tracked | authoritative source | include in tests/release tooling commit | 7 | direct/authoritative |
| `scripts/build-production-apps-script.js` | tracked | authoritative source | include in tests/release tooling commit | 7 | direct/authoritative |
| `scripts/build-staff-attendance-phase3-bundle.js` | tracked | authoritative source | include in tests/release tooling commit | 7 | direct/authoritative |
| `scripts/build-staff-payroll-attendance-phase4-bundle.js` | tracked | authoritative source | include in tests/release tooling commit | 7 | direct/authoritative |
| `scripts/build-staff-scheduling-phase2-bundle.js` | tracked | authoritative source | include in tests/release tooling commit | 7 | direct/authoritative |
| `scripts/core-staging-auth-bootstrap.js` | tracked | authoritative source | include in application commit | 1 | generated from scripts/build-backend.js + config/backend-sources.json |
| `scripts/generate-release-manifest.js` | tracked | authoritative source | include in tests/release tooling commit | 7 | direct/authoritative |
| `scripts/generate-source-control-inclusion-plan.js` | tracked | authoritative source | include in tests/release tooling commit | 7 | direct/authoritative |
| `scripts/owner-password-reset-staging.js` | tracked | excluded intentionally | intentionally exclude | — | direct/authoritative |
| `scripts/staff-attendance-core.js` | tracked | authoritative source | include in application commit | 1 | generated from scripts/build-backend.js + config/backend-sources.json |
| `scripts/staff-attendance-phase3-apps-script-bundle.gs` | tracked | generated bundle | intentionally exclude | — | generated from scripts/build-staff-attendance-phase3-bundle.js |
| `scripts/staff-attendance-phase3-gas.js` | tracked | backend integration | include in application commit | 1 | generated from scripts/build-backend.js + config/backend-sources.json |
| `scripts/staff-attendance-phase3.js` | tracked | authoritative source | include in application commit | 1 | generated from scripts/build-backend.js + config/backend-sources.json |
| `scripts/staff-attendance-schema.js` | tracked | authoritative source | include in application commit | 1 | generated from scripts/build-backend.js + config/backend-sources.json |
| `scripts/staff-bootstrap-executor-staging.js` | untracked | excluded intentionally | intentionally exclude | — | direct/authoritative |
| `scripts/staff-bootstrap-preview-staging.js` | untracked | excluded intentionally | intentionally exclude | — | direct/authoritative |
| `scripts/staff-import-preview-staging.js` | tracked | authoritative source | include in application commit | 1 | generated from scripts/build-backend.js + config/backend-sources.json |
| `scripts/staff-payroll-attendance-phase4-apps-script-bundle.gs` | tracked | generated bundle | intentionally exclude | — | generated from scripts/build-staff-payroll-attendance-phase4-bundle.js |
| `scripts/staff-payroll-attendance-phase4-gas.js` | tracked | backend integration | include in application commit | 2 | generated from scripts/build-backend.js + config/backend-sources.json |
| `scripts/staff-payroll-attendance-phase4.js` | tracked | authoritative source | include in application commit | 2 | generated from scripts/build-backend.js + config/backend-sources.json |
| `scripts/staff-scheduling-phase2-apps-script-bundle.gs` | tracked | generated bundle | intentionally exclude | — | generated from scripts/build-staff-scheduling-phase2-bundle.js |
| `scripts/staff-scheduling-phase2-gas.js` | tracked | backend integration | include in application commit | 1 | generated from scripts/build-backend.js + config/backend-sources.json |
| `scripts/staff-scheduling-phase2.js` | tracked | authoritative source | include in application commit | 1 | generated from scripts/build-backend.js + config/backend-sources.json |
| `scripts/staff-schema-migration-staging-executor.js` | tracked | authoritative source | include in application commit | 1 | generated from scripts/build-backend.js + config/backend-sources.json |
| `scripts/validate-apps-script-deployment-package.js` | tracked | authoritative source | include in tests/release tooling commit | 4 | direct/authoritative |
| `system-access.html` | tracked | excluded intentionally | intentionally exclude | — | direct/authoritative |
| `tests/apps-script-deployment-package.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/apps-script-http.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/apps-script-proxy.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/attendance-page-functional.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/auth-navigation.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/auth01-combined-runtime-package.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/auth01-crypto-vectors.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/auth01-local-implementation.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/auth01-v25-browser-smoke-harness.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/backend-modularization.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/booking-availability-admin-functional.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/booking-availability-phase5-contract.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/booking-availability-phase5-gas.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/booking-availability-phase5.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/booking-no-check-in-detector.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/booking-rating-production-migration.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/booking-rating-standalone-migration-runner.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/booking-upgrade.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/branch-foundation-staging.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/branch-registry-bootstrap-executor-staging.test.js` | untracked | test | intentionally exclude | — | direct/authoritative |
| `tests/branch-registry-bootstrap-preview-staging.test.js` | untracked | test | intentionally exclude | — | direct/authoritative |
| `tests/branch-registry-row-staging.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/cashier-panel-height.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/core-staging-auth-bootstrap.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/customer-booking-branch.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/customer-tracking-ratings.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/dashboard-analysis-loading.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/fixtures/auth01-v25-browser-smoke-harness.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/frontend-api-configuration.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/frontend-relay-queue.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/internal-booking-branch.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/invoice-load-more-recovery.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/invoice-sheet-read-recovery.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/legacy-staff-snapshot-export.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/legacy-staff-snapshot-local.test.js` | untracked | test | intentionally exclude | — | direct/authoritative |
| `tests/local-release-candidate.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/migration-preview-diagnostics.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/owner-password-reset-staging.test.js` | tracked | test | intentionally exclude | — | direct/authoritative |
| `tests/payroll-attendance-page-functional.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/production-backend-modularization.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/release-manifest.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/schedule-management-functional.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/schedule-work-policy-ui.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/shared-system-layout.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/source-control-inclusion-plan.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/staff-attendance-core.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/staff-attendance-phase3.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/staff-bootstrap-executor-staging.test.js` | untracked | test | intentionally exclude | — | direct/authoritative |
| `tests/staff-bootstrap-preview-staging.test.js` | untracked | test | intentionally exclude | — | direct/authoritative |
| `tests/staff-import-preview-staging.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/staff-import-preview.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/staff-payroll-attendance-phase4.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/staff-scheduling-phase2-contract.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/staff-scheduling-phase2-review.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/staff-scheduling-phase2.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/staff-schema-migration-staging-executor.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/staff-work-policy-management.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/staging-environment.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |

## Original 60 required untracked files

1. `config/apps-script-deployment-package.json`
2. `docs/booking-no-check-in-trigger-runbook.md`
3. `docs/release-manifest.md`
4. `docs/release/migration-execution-matrix.md`
5. `docs/release/pre-staging-gate-report.md`
6. `docs/release/staging-configuration-template.md`
7. `docs/release/staging-data-blueprint.md`
8. `docs/release/staging-test-account-matrix.md`
9. `docs/staff-attendance-phase-1.md`
10. `docs/staff-attendance-phase-3.md`
11. `docs/staff-payroll-attendance-phase-4.md`
12. `docs/staff-scheduling-phase-2.md`
13. `docs/staging-entry-checklist.md`
14. `public/assets/css/pages/booking-availability-admin.css`
15. `public/assets/css/pages/payroll-attendance.css`
16. `public/assets/css/pages/schedule-management.css`
17. `public/assets/js/pages/booking-availability-admin.js`
18. `public/assets/js/pages/payroll-attendance.js`
19. `public/assets/js/pages/schedule-management.js`
20. `public/pages/booking-availability-admin.html`
21. `public/pages/payroll-attendance.html`
22. `public/pages/schedule-management.html`
23. `scripts/booking-availability-phase5-apps-script-bundle.gs`
24. `scripts/booking-availability-phase5-gas.js`
25. `scripts/booking-availability-phase5.js`
26. `scripts/booking-rating-production-migration.js`
27. `scripts/booking-rating-standalone-migration-runner/appsscript.json`
28. `scripts/booking-rating-standalone-migration-runner/booking-rating-production-migration-core.js`
29. `scripts/booking-rating-standalone-migration-runner/standalone-migration-adapter.js`
30. `scripts/build-booking-availability-phase5-bundle.js`
31. `scripts/build-local-release-candidate.js`
32. `scripts/build-staff-attendance-phase3-bundle.js`
33. `scripts/build-staff-payroll-attendance-phase4-bundle.js`
34. `scripts/build-staff-scheduling-phase2-bundle.js`
35. `scripts/generate-release-manifest.js`
36. `scripts/staff-attendance-core.js`
37. `scripts/staff-attendance-phase3-gas.js`
38. `scripts/staff-attendance-phase3.js`
39. `scripts/staff-attendance-schema.js`
40. `scripts/staff-payroll-attendance-phase4-gas.js`
41. `scripts/staff-payroll-attendance-phase4.js`
42. `scripts/staff-scheduling-phase2-gas.js`
43. `scripts/staff-scheduling-phase2.js`
44. `scripts/validate-apps-script-deployment-package.js`
45. `tests/apps-script-deployment-package.test.js`
46. `tests/auth-navigation.test.js`
47. `tests/booking-availability-phase5-contract.test.js`
48. `tests/booking-availability-phase5-gas.test.js`
49. `tests/booking-availability-phase5.test.js`
50. `tests/booking-no-check-in-detector.test.js`
51. `tests/booking-rating-production-migration.test.js`
52. `tests/booking-rating-standalone-migration-runner.test.js`
53. `tests/local-release-candidate.test.js`
54. `tests/release-manifest.test.js`
55. `tests/staff-attendance-core.test.js`
56. `tests/staff-attendance-phase3.test.js`
57. `tests/staff-payroll-attendance-phase4.test.js`
58. `tests/staff-scheduling-phase2-contract.test.js`
59. `tests/staff-scheduling-phase2-review.test.js`
60. `tests/staff-scheduling-phase2.test.js`
