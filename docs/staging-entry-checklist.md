# CUT-HUB-POS Staging entry checklist

> This is a blocking checklist, not authorization to perform any operation. Every item must have named evidence and reviewer approval before Staging begins.

## Release package

- [ ] `docs/release-manifest.md` regenerated and approved.
- [ ] Required tracked/untracked counts match the current working tree.
- [ ] Every required untracked file is explicitly accounted for; none is silently omitted.
- [ ] No file was staged merely to satisfy this checklist.
- [ ] `config/apps-script-deployment-package.json` contains only the router and Phase 5 aggregate bundle.
- [ ] `node scripts/validate-apps-script-deployment-package.js` passes.
- [ ] Aggregate bundle matches its generator byte-for-byte and deterministic rebuild hashes match.
- [ ] Constituent sources and Phase 2/3/4 aggregate bundles are excluded from the upload package.
- [ ] Migration runners are separated from the application package.

## Isolated environment and recovery

- [ ] A dedicated Staging Spreadsheet exists and is not Production.
- [ ] A timestamped backup/snapshot exists before any future migration execution.
- [ ] The expected Staging Spreadsheet ID is documented in restricted operational evidence.
- [ ] A dedicated Staging Apps Script project exists.
- [ ] An authorized operator will set `CUT_HUB_ENVIRONMENT=staging`; Codex has not set it.
- [ ] Spreadsheet/project/environment identities have a two-person cross-check.
- [ ] Rollback owner, decision threshold, communication channel, and restore procedure are named.
- [ ] `docs/booking-no-check-in-trigger-runbook.md` is reviewed; trigger remains NOT APPROVED.

## Required reference data

- [ ] Test branch registry contains stable branch IDs, names, active/public flags, closure state, and valid IANA timezones.
- [ ] Branch booking hours cover every test weekday, overnight interval, closure, and effective-date boundary.
- [ ] Employee identities are unique and mapped to exactly one intended branch/scope.
- [ ] Schedule user scopes contain permission-separated owner, manager, employee, payroll-only, booking-only, and availability-only accounts.
- [ ] Salary/work policies cover salaried, minute-rate, overtime, leave, and safe-default/error cases.
- [ ] No real customer, employee, payroll, attendance, booking, or production identifier is copied into test data unnecessarily.

## Migration evidence

- [ ] Migration order is approved: identity → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5.
- [ ] Every migration Preview reports `executionAllowed=false`, `writes=0`, and `historicalRowsTouched=0` where applicable.
- [ ] Preview evidence includes created sheets, appended columns, schema-order checks, duplicate headers, and blockers.
- [ ] Expected pre/post sheet row counts are documented for every affected sheet.
- [ ] Unknown columns, ambiguous headers, duplicate identities, and spreadsheet mismatches block entry.
- [ ] A separate explicit task and approval will be required before any migration execution.

## Test execution plan

- [ ] Browser/device matrix names supported Chromium, Firefox/Safari-equivalent coverage, desktop/tablet/mobile widths, and RTL/keyboard/screen-reader checks.
- [ ] Authentication matrix covers isolated permissions and session expiry.
- [ ] Attendance matrix covers exact grace, check-in/out, breaks, adjustments, leave, overtime, stale calculation, and duplicate requests.
- [ ] Scheduling matrix covers multi-segment/overnight shifts, overrides, approval/rejection dialogs, and Preview-only migration.
- [ ] Payroll matrix covers period creation, settlement snapshots/hashes, stale settlement handling, adjustments, and branch scope.
- [ ] Booking matrix covers legacy/V2 coexistence, cancellation/reschedule, rating migration Preview, and inventory-safe flows.
- [ ] Availability matrix covers LEGACY baseline, SHADOW comparison, PHASE5 gated rollout, branch config/hours, cache, conflicts, and rollback.
- [ ] Concurrency plan covers overlapping detector runs, simultaneous booking attempts, manager resolution, attendance during detection, and schedule/branch-hour changes.
- [ ] Test cleanup specifies exact rows/files/caches created and the reviewed restoration method.

## Monitoring and entry decision

- [ ] Monitoring captures request/run ID, actor, branch, latency, writes, versions/generations, transaction status, audit status, conflicts, retries, lock timeout, recovery markers, and error codes.
- [ ] Alerts and owners are configured for recovery-required transactions, duplicate conflicts, repeated partial batches, invalid timezone, identity mismatch, and runtime threshold.
- [ ] Expected baseline row counts and zero-duplicate queries are recorded before testing.
- [ ] Feature flags and safe defaults are recorded without exposing secret values.
- [ ] Trigger installation remains absent; detector Production and Staging execution remain code-gated.
- [ ] Final Staging entry decision is recorded as GO/NO-GO by authorized reviewers.

Staging is blocked while any checkbox is incomplete.
