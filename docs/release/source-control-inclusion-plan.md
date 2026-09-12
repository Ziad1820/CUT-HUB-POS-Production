# Source-control release inclusion plan

No files are staged or committed by this plan. Human approval is required before any Git mutation.

## Accounting

- Original immutable RC required-untracked entries: **60/60 accounted individually below**.
- Current manifest required entries: **144**; current required untracked: **0**.
- Every required path retains its approved commit assignment after commit, independent of transient working-tree state.
- Excluded entries remain excluded and must not be silently added.

## Proposed commits

### 1. feat(attendance): add attendance and staff scheduling runtime

- Files: `public/assets/css/pages/attendance.css`, `public/assets/css/pages/schedule-management.css`, `public/assets/css/pages/staff-import-preview.css`, `public/assets/css/shared.css`, `public/assets/css/system-layout.css`, `public/assets/images/bank-building.png`, `public/assets/images/card.png`, `public/assets/images/money.png`, `public/assets/images/salonix-logo.svg`, `public/assets/images/walet.png`, `public/assets/js/pages/attendance.js`, `public/assets/js/pages/schedule-management.js`, `public/assets/js/utils/keyboard-navigation.js`, `public/assets/js/utils/language.js`, `public/assets/js/utils/layout.js`, `public/assets/js/utils/text-fix.js`, `public/pages/attendance.html`, `public/pages/schedule-management.html`, `scripts/branch-foundation-staging.js`, `scripts/branch-registry-row-staging.js`, `scripts/core-staging-auth-bootstrap.js`, `scripts/staff-attendance-core.js`, `scripts/staff-attendance-phase3-gas.js`, `scripts/staff-attendance-phase3.js`, `scripts/staff-attendance-schema.js`, `scripts/staff-import-preview-staging.js`, `scripts/staff-scheduling-phase2-gas.js`, `scripts/staff-scheduling-phase2.js`, `scripts/staff-schema-migration-staging-executor.js`
- Purpose: isolate one reviewable release concern.
- Dependencies: Earlier phase contracts and shared authentication/API boundaries.
- Validation: associated manifest tests, syntax checks, deterministic generation where applicable, and `git diff --check`.
- Generated files: none.
- Rollback impact: revert this logical unit only after confirming later dependent commits are also reverted or regenerated; never leave aggregate output inconsistent with source.

### 2. feat(payroll): add payroll attendance runtime

- Files: `public/assets/css/pages/payroll-attendance.css`, `public/assets/js/pages/payroll-attendance.js`, `public/pages/payroll-attendance.html`, `scripts/staff-payroll-attendance-phase4-gas.js`, `scripts/staff-payroll-attendance-phase4.js`
- Purpose: isolate one reviewable release concern.
- Dependencies: Earlier phase contracts and shared authentication/API boundaries.
- Validation: associated manifest tests, syntax checks, deterministic generation where applicable, and `git diff --check`.
- Generated files: none.
- Rollback impact: revert this logical unit only after confirming later dependent commits are also reverted or regenerated; never leave aggregate output inconsistent with source.

### 3. feat(booking): add booking and availability runtime

- Files: `public/assets/css/pages/booking-availability-admin.css`, `public/assets/css/pages/bookings.css`, `public/assets/css/pages/customer-booking.css`, `public/assets/js/core/api.js`, `public/assets/js/core/auth.js`, `public/assets/js/core/runtime-config.js`, `public/assets/js/core/staff-import-preview.js`, `public/assets/js/pages/booking-availability-admin.js`, `public/assets/js/pages/bookings.js`, `public/assets/js/pages/cashier.js`, `public/assets/js/pages/customer-booking.js`, `public/pages/activity-log.html`, `public/pages/booking-availability-admin.html`, `public/pages/bookings.html`, `public/pages/cashier.html`, `public/pages/customer-booking.html`, `public/pages/customer-data.html`, `public/pages/daily-closing.html`, `public/pages/dashboard.html`, `public/pages/data-analysis.html`, `public/pages/enventory.html`, `public/pages/expenses.html`, `public/pages/income-statement.html`, `public/pages/invoices.html`, `public/pages/login.html`, `public/pages/staff-accounting.html`, `public/pages/staff-discount.html`, `public/pages/system-access.html`, `public/pages/withdrawals.html`, `scripts/booking-availability-phase5-gas.js`, `scripts/booking-availability-phase5.js`
- Purpose: isolate one reviewable release concern.
- Dependencies: Earlier phase contracts and shared authentication/API boundaries.
- Validation: associated manifest tests, syntax checks, deterministic generation where applicable, and `git diff --check`.
- Generated files: none.
- Rollback impact: revert this logical unit only after confirming later dependent commits are also reverted or regenerated; never leave aggregate output inconsistent with source.

### 4. build(apps-script): add aggregate bundle and deployment package

- Files: `config/apps-script-deployment-package.json`, `scripts/app-script-final-owner-access.js`, `scripts/booking-availability-phase5-apps-script-bundle.gs`, `scripts/build-booking-availability-phase5-bundle.js`, `scripts/validate-apps-script-deployment-package.js`
- Purpose: isolate one reviewable release concern.
- Dependencies: Commits 1–3 and the Phase 5 bundle generator; commit source plus regenerated aggregate/deployment metadata together.
- Validation: associated manifest tests, syntax checks, deterministic generation where applicable, and `git diff --check`.
- Generated files: `scripts/booking-availability-phase5-apps-script-bundle.gs`.
- Rollback impact: revert this logical unit only after confirming later dependent commits are also reverted or regenerated; never leave aggregate output inconsistent with source.

### 5. build(migrations): add isolated preview and migration tooling

- Files: `scripts/booking-rating-production-migration.js`, `scripts/booking-rating-standalone-migration-runner/appsscript.json`, `scripts/booking-rating-standalone-migration-runner/booking-rating-production-migration-core.js`, `scripts/booking-rating-standalone-migration-runner/standalone-migration-adapter.js`
- Purpose: isolate one reviewable release concern.
- Dependencies: Validated runtime/source commits 1–4.
- Validation: associated manifest tests, syntax checks, deterministic generation where applicable, and `git diff --check`.
- Generated files: none.
- Rollback impact: revert this logical unit only after confirming later dependent commits are also reverted or regenerated; never leave aggregate output inconsistent with source.

### 6. test: add phase and safety coverage

- Files: `tests/apps-script-deployment-package.test.js`, `tests/attendance-page-functional.test.js`, `tests/auth-navigation.test.js`, `tests/booking-availability-admin-functional.test.js`, `tests/booking-availability-phase5-contract.test.js`, `tests/booking-availability-phase5-gas.test.js`, `tests/booking-availability-phase5.test.js`, `tests/booking-no-check-in-detector.test.js`, `tests/booking-rating-production-migration.test.js`, `tests/booking-rating-standalone-migration-runner.test.js`, `tests/booking-upgrade.test.js`, `tests/branch-foundation-staging.test.js`, `tests/branch-registry-row-staging.test.js`, `tests/core-staging-auth-bootstrap.test.js`, `tests/customer-booking-branch.test.js`, `tests/customer-tracking-ratings.test.js`, `tests/frontend-api-configuration.test.js`, `tests/internal-booking-branch.test.js`, `tests/legacy-staff-snapshot-export.test.js`, `tests/local-release-candidate.test.js`, `tests/migration-preview-diagnostics.test.js`, `tests/payroll-attendance-page-functional.test.js`, `tests/release-manifest.test.js`, `tests/schedule-management-functional.test.js`, `tests/schedule-work-policy-ui.test.js`, `tests/shared-system-layout.test.js`, `tests/source-control-inclusion-plan.test.js`, `tests/staff-attendance-core.test.js`, `tests/staff-attendance-phase3.test.js`, `tests/staff-import-preview-staging.test.js`, `tests/staff-import-preview.test.js`, `tests/staff-payroll-attendance-phase4.test.js`, `tests/staff-scheduling-phase2-contract.test.js`, `tests/staff-scheduling-phase2-review.test.js`, `tests/staff-scheduling-phase2.test.js`, `tests/staff-schema-migration-staging-executor.test.js`, `tests/staff-work-policy-management.test.js`, `tests/staging-environment.test.js`
- Purpose: isolate one reviewable release concern.
- Dependencies: Validated runtime/source commits 1–4.
- Validation: associated manifest tests, syntax checks, deterministic generation where applicable, and `git diff --check`.
- Generated files: none.
- Rollback impact: revert this logical unit only after confirming later dependent commits are also reverted or regenerated; never leave aggregate output inconsistent with source.

### 7. build(release): add deterministic validation tooling

- Files: `.gitignore`, `scripts/build-local-release-candidate.js`, `scripts/build-staff-attendance-phase3-bundle.js`, `scripts/build-staff-payroll-attendance-phase4-bundle.js`, `scripts/build-staff-scheduling-phase2-bundle.js`, `scripts/generate-release-manifest.js`, `scripts/generate-source-control-inclusion-plan.js`
- Purpose: isolate one reviewable release concern.
- Dependencies: Validated runtime/source commits 1–4.
- Validation: associated manifest tests, syntax checks, deterministic generation where applicable, and `git diff --check`.
- Generated files: none.
- Rollback impact: revert this logical unit only after confirming later dependent commits are also reverted or regenerated; never leave aggregate output inconsistent with source.

### 8. docs(release): add runbooks and Staging controls

- Files: `config/frontend-runtime-config.staging.example.js`, `docs/booking-no-check-in-trigger-runbook.md`, `docs/release-manifest.md`, `docs/release/frontend-staging-configuration.md`, `docs/release/human-approval-packet.md`, `docs/release/human-checkpoint-matrix.md`, `docs/release/migration-execution-matrix.md`, `docs/release/migration-preview-operator-procedure.md`, `docs/release/original-rc-required-untracked-baseline.md`, `docs/release/pre-staging-gate-report.md`, `docs/release/release-candidate-inventory.md`, `docs/release/source-control-inclusion-plan.md`, `docs/release/staging-baseline-evidence-template.md`, `docs/release/staging-configuration-template.md`, `docs/release/staging-core-auth-bootstrap-runbook.md`, `docs/release/staging-data-blueprint.md`, `docs/release/staging-operator-input.md`, `docs/release/staging-schema-migration-execution-runbook.md`, `docs/release/staging-script-property-plan.md`, `docs/release/staging-test-account-matrix.md`, `docs/staff-attendance-phase-1.md`, `docs/staff-attendance-phase-3.md`, `docs/staff-payroll-attendance-phase-4.md`, `docs/staff-scheduling-phase-2.md`, `docs/staging-entry-checklist.md`
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
| `.gitignore` | tracked | authoritative source | include in tests/release tooling commit | 7 | direct/authoritative |
| `.sync-backups/` | untracked | unrelated/pre-existing | intentionally exclude | — | direct/authoritative |
| `.vscode/settings.json` | tracked | unrelated/pre-existing | intentionally exclude | — | direct/authoritative |
| `attendance.html` | tracked | excluded intentionally | intentionally exclude | — | direct/authoritative |
| `booking-availability-admin.html` | untracked | excluded intentionally | intentionally exclude | — | direct/authoritative |
| `bookings.html` | tracked | excluded intentionally | intentionally exclude | — | direct/authoritative |
| `cashier.html` | tracked | excluded intentionally | intentionally exclude | — | direct/authoritative |
| `config/apps-script-deployment-package.json` | tracked | operational runbook | include in application commit | 4 | direct/authoritative |
| `config/frontend-runtime-config.staging.example.js` | tracked | authoritative source | include in documentation commit | 8 | direct/authoritative |
| `docs/booking-no-check-in-trigger-runbook.md` | tracked | operational runbook | include in documentation commit | 8 | direct/authoritative |
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
| `public/pages/data-analysis.html` | tracked | UI page | include in application commit | 3 | direct/authoritative |
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
| `scripts/app-script-final-owner-access.js` | tracked | backend integration | include in application commit | 4 | direct/authoritative |
| `scripts/booking-availability-phase5-apps-script-bundle.gs` | tracked | generated bundle | include in application commit | 4 | generated from scripts/build-booking-availability-phase5-bundle.js + declared constituent sources |
| `scripts/booking-availability-phase5-gas.js` | tracked | backend integration | include in application commit | 3 | direct/authoritative |
| `scripts/booking-availability-phase5.js` | tracked | authoritative source | include in application commit | 3 | direct/authoritative |
| `scripts/booking-rating-production-migration.js` | tracked | migration source | include in migration tooling commit | 5 | direct/authoritative |
| `scripts/booking-rating-standalone-migration-runner/appsscript.json` | tracked | migration preview | include in migration tooling commit | 5 | direct/authoritative |
| `scripts/booking-rating-standalone-migration-runner/booking-rating-production-migration-core.js` | tracked | migration source | include in migration tooling commit | 5 | direct/authoritative |
| `scripts/booking-rating-standalone-migration-runner/standalone-migration-adapter.js` | tracked | migration source | include in migration tooling commit | 5 | direct/authoritative |
| `scripts/branch-foundation-staging.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `scripts/branch-registry-bootstrap-executor-staging.js` | untracked | excluded intentionally | intentionally exclude | — | direct/authoritative |
| `scripts/branch-registry-bootstrap-preview-staging.js` | untracked | excluded intentionally | intentionally exclude | — | direct/authoritative |
| `scripts/branch-registry-row-staging.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `scripts/build-booking-availability-phase5-bundle.js` | tracked | authoritative source | include in application commit | 4 | direct/authoritative |
| `scripts/build-local-release-candidate.js` | tracked | authoritative source | include in tests/release tooling commit | 7 | direct/authoritative |
| `scripts/build-staff-attendance-phase3-bundle.js` | tracked | authoritative source | include in tests/release tooling commit | 7 | direct/authoritative |
| `scripts/build-staff-payroll-attendance-phase4-bundle.js` | tracked | authoritative source | include in tests/release tooling commit | 7 | direct/authoritative |
| `scripts/build-staff-scheduling-phase2-bundle.js` | tracked | authoritative source | include in tests/release tooling commit | 7 | direct/authoritative |
| `scripts/core-staging-auth-bootstrap.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `scripts/generate-release-manifest.js` | tracked | authoritative source | include in tests/release tooling commit | 7 | direct/authoritative |
| `scripts/generate-source-control-inclusion-plan.js` | tracked | authoritative source | include in tests/release tooling commit | 7 | direct/authoritative |
| `scripts/owner-password-reset-staging.js` | untracked | excluded intentionally | intentionally exclude | — | direct/authoritative |
| `scripts/staff-attendance-core.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `scripts/staff-attendance-phase3-apps-script-bundle.gs` | untracked | generated bundle | intentionally exclude | — | generated from scripts/build-staff-attendance-phase3-bundle.js |
| `scripts/staff-attendance-phase3-gas.js` | tracked | backend integration | include in application commit | 1 | direct/authoritative |
| `scripts/staff-attendance-phase3.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `scripts/staff-attendance-schema.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `scripts/staff-bootstrap-executor-staging.js` | untracked | excluded intentionally | intentionally exclude | — | direct/authoritative |
| `scripts/staff-bootstrap-preview-staging.js` | untracked | excluded intentionally | intentionally exclude | — | direct/authoritative |
| `scripts/staff-import-preview-staging.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `scripts/staff-payroll-attendance-phase4-apps-script-bundle.gs` | untracked | generated bundle | intentionally exclude | — | generated from scripts/build-staff-payroll-attendance-phase4-bundle.js |
| `scripts/staff-payroll-attendance-phase4-gas.js` | tracked | backend integration | include in application commit | 2 | direct/authoritative |
| `scripts/staff-payroll-attendance-phase4.js` | tracked | authoritative source | include in application commit | 2 | direct/authoritative |
| `scripts/staff-scheduling-phase2-apps-script-bundle.gs` | untracked | generated bundle | intentionally exclude | — | generated from scripts/build-staff-scheduling-phase2-bundle.js |
| `scripts/staff-scheduling-phase2-gas.js` | tracked | backend integration | include in application commit | 1 | direct/authoritative |
| `scripts/staff-scheduling-phase2.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `scripts/staff-schema-migration-staging-executor.js` | tracked | authoritative source | include in application commit | 1 | direct/authoritative |
| `scripts/validate-apps-script-deployment-package.js` | tracked | authoritative source | include in tests/release tooling commit | 4 | direct/authoritative |
| `system-access.html` | tracked | excluded intentionally | intentionally exclude | — | direct/authoritative |
| `tests/apps-script-deployment-package.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/attendance-page-functional.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/auth-navigation.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
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
| `tests/core-staging-auth-bootstrap.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/customer-booking-branch.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/customer-tracking-ratings.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/frontend-api-configuration.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/internal-booking-branch.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/legacy-staff-snapshot-export.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/legacy-staff-snapshot-local.test.js` | untracked | test | intentionally exclude | — | direct/authoritative |
| `tests/local-release-candidate.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/migration-preview-diagnostics.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
| `tests/owner-password-reset-staging.test.js` | untracked | test | intentionally exclude | — | direct/authoritative |
| `tests/payroll-attendance-page-functional.test.js` | tracked | test | include in tests/release tooling commit | 6 | direct/authoritative |
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
