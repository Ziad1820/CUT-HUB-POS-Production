# Repository-owner approval packet

This packet does not instruct or authorize deployment.

- Release Candidate: `CUT-HUB-POS-RC-c7cdf5a-c370f1788782`
- Payload SHA-256: `c370f1788782d80c24ddf5fbbb3dc324f0a2bef21e8ea1fea2d1db12494586a3`
- Required untracked files: **0**
- Dirty tree: **yes; not reproducible from Git alone**

## Included runtime

Frontend runtime is listed file-by-file in `docs/release/release-candidate-inventory.md`. The Apps Script application runtime is exactly:

1. `scripts/app-script-final-owner-access.js`
2. `scripts/booking-availability-phase5-apps-script-bundle.gs`

Migration sources are isolated under the migration subpackage and were not executed. Sequence: Identity/bootstrap → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5.

## Intentionally excluded

- `.apps-script-staging/` — Local Staging bootstrap, credential-reset, deployment, or browser-extraction artifact; excluded from the Production release commit.
- `.clasp.json` — Local Staging bootstrap, credential-reset, deployment, or browser-extraction artifact; excluded from the Production release commit.
- `.codex-daily-closing-inline-check.js` — Local editor, backup, or scratch artifact; excluded from release.
- `.sync-backups/` — Local editor, backup, or scratch artifact; excluded from release.
- `.vscode/settings.json` — Local editor, backup, or scratch artifact; excluded from release.
- `attendance.html` — Root compatibility wrapper duplicates public output; Vercel serves the public directory.
- `booking-availability-admin.html` — Root compatibility wrapper duplicates public output; Vercel serves the public directory.
- `bookings.html` — Root compatibility wrapper duplicates public output; Vercel serves the public directory.
- `cashier.html` — Root compatibility wrapper duplicates public output; Vercel serves the public directory.
- `docs/staff-attendance-phase-1-engineering-review.md` — Historical engineering review; documentation-only and not deployed.
- `docs/staff-attendance-phase-3-strict-review.md` — Historical engineering review; documentation-only and not deployed.
- `docs/staff-payroll-attendance-phase-4-strict-review.md` — Historical engineering review; documentation-only and not deployed.
- `docs/staff-scheduling-phase-2-engineering-review.md` — Historical engineering review; documentation-only and not deployed.
- `login.html` — Root compatibility wrapper duplicates public output; Vercel serves the public directory.
- `public/pages/legacy-staff-snapshot-local.html` — Local Staging bootstrap, credential-reset, deployment, or browser-extraction artifact; excluded from the Production release commit.
- `schedule-management.html` — Root compatibility wrapper duplicates public output; Vercel serves the public directory.
- `scripts/branch-registry-bootstrap-executor-staging.js` — Local Staging bootstrap, credential-reset, deployment, or browser-extraction artifact; excluded from the Production release commit.
- `scripts/branch-registry-bootstrap-preview-staging.js` — Local Staging bootstrap, credential-reset, deployment, or browser-extraction artifact; excluded from the Production release commit.
- `scripts/owner-password-reset-staging.js` — Local Staging bootstrap, credential-reset, deployment, or browser-extraction artifact; excluded from the Production release commit.
- `scripts/staff-attendance-phase3-apps-script-bundle.gs` — Obsolete for the aggregate package and overlaps globals already contained in Phase 5.
- `scripts/staff-bootstrap-executor-staging.js` — Local Staging bootstrap, credential-reset, deployment, or browser-extraction artifact; excluded from the Production release commit.
- `scripts/staff-bootstrap-preview-staging.js` — Local Staging bootstrap, credential-reset, deployment, or browser-extraction artifact; excluded from the Production release commit.
- `scripts/staff-payroll-attendance-phase4-apps-script-bundle.gs` — Obsolete for the aggregate package and overlaps globals already contained in Phase 5.
- `scripts/staff-scheduling-phase2-apps-script-bundle.gs` — Obsolete for the aggregate package and overlaps globals already contained in Phase 5.
- `system-access.html` — Root compatibility wrapper duplicates public output; Vercel serves the public directory.
- `tests/branch-registry-bootstrap-executor-staging.test.js` — Local Staging bootstrap, credential-reset, deployment, or browser-extraction artifact; excluded from the Production release commit.
- `tests/branch-registry-bootstrap-preview-staging.test.js` — Local Staging bootstrap, credential-reset, deployment, or browser-extraction artifact; excluded from the Production release commit.
- `tests/legacy-staff-snapshot-local.test.js` — Local Staging bootstrap, credential-reset, deployment, or browser-extraction artifact; excluded from the Production release commit.
- `tests/owner-password-reset-staging.test.js` — Local Staging bootstrap, credential-reset, deployment, or browser-extraction artifact; excluded from the Production release commit.
- `tests/staff-bootstrap-executor-staging.test.js` — Local Staging bootstrap, credential-reset, deployment, or browser-extraction artifact; excluded from the Production release commit.
- `tests/staff-bootstrap-preview-staging.test.js` — Local Staging bootstrap, credential-reset, deployment, or browser-extraction artifact; excluded from the Production release commit.

## Risks and prerequisites

- Required files remain untracked and may be omitted without an approved source-control/release workflow.
- Identity/bootstrap execution remains in the router and must not be invoked without separate authorization.
- Booking rating execution exists only in the separate migration package.
- Staging Spreadsheet/project, backup, identities, row counts, test accounts, monitoring, and rollback ownership do not yet exist as verified evidence.
- Browser API endpoint and all security-sensitive Script Properties require authorized manual entry; no real values are stored in this candidate.
- Detector Staging/Production execution and trigger installation remain disabled/not approved.

## Decisions requested before the next phase

Approve or reject only the following preparatory actions:

1. Include the manifest-listed files in the controlled source-control/release workflow.
2. Provision an isolated Staging Spreadsheet and Apps Script project.
3. Prepare and verify a recoverable Staging backup/snapshot.
4. Enter the placeholder-defined Staging configuration through an authorized operator.
5. Run zero-write migration previews and retain their evidence.
6. Begin controlled Staging tests after the checklist gates pass.

No approval to deploy, execute a migration, install a trigger, enable Production, or modify real data is requested.
