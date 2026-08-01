# Repository-owner approval packet

This packet does not instruct or authorize deployment.

- Release Candidate: `CUT-HUB-POS-RC-187ae11-21ef391df981`
- Payload SHA-256: `21ef391df98149e01c719dc2f96d1e8fc0173d4c11f156c401d91946d200c40d`
- Required untracked files: **0**
- Dirty tree: **yes; not reproducible from Git alone**

## Included runtime

Frontend runtime is listed file-by-file in `docs/release/release-candidate-inventory.md`. The Apps Script application runtime is exactly:

1. `scripts/app-script-final-owner-access.js`
2. `scripts/booking-availability-phase5-apps-script-bundle.gs`

Migration sources are isolated under the migration subpackage and were not executed. Sequence: Identity/bootstrap → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5.

## Intentionally excluded

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
- `schedule-management.html` — Root compatibility wrapper duplicates public output; Vercel serves the public directory.
- `scripts/staff-attendance-phase3-apps-script-bundle.gs` — Obsolete for the aggregate package and overlaps globals already contained in Phase 5.
- `scripts/staff-payroll-attendance-phase4-apps-script-bundle.gs` — Obsolete for the aggregate package and overlaps globals already contained in Phase 5.
- `scripts/staff-scheduling-phase2-apps-script-bundle.gs` — Obsolete for the aggregate package and overlaps globals already contained in Phase 5.
- `system-access.html` — Root compatibility wrapper duplicates public output; Vercel serves the public directory.

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
