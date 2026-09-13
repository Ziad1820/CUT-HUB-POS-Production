# Staging schema migration execution runbook

Status: implementation review only. The functions described here have not been pushed to Apps Script and no migration has been executed.

## Safety model

The authoritative executor is `scripts/staff-schema-migration-staging-executor.js`. It contains no sheet or header definitions. Every operation is derived from the matching live preview plan.

Before Spreadsheet access, the executor requires `CUT_HUB_ENVIRONMENT=staging` and exact equality between `CUT_HUB_SPREADSHEET_ID` and `CUT_HUB_STAGING_SPREADSHEET_ID`. It then requires `assertStagingEnvironment()` to prove that the active Spreadsheet matches both pins. Production and unknown environments fail before Spreadsheet access.

`Session.getEffectiveUser().getEmail()` and `Session.getActiveUser().getEmail()` must both be non-empty and exactly match the email returned by `DriveApp.getFileById(spreadsheetId).getOwner().getEmail()`. This blocks trigger/deployment execute-as-owner contexts whose active interactive user is missing or different. Shared-drive, aliased, hidden, or unavailable owner identity fails closed. The primary `execute*Staging(data)` entry points reject missing arguments and require both `requestId` and a short-lived confirmation token.

Each `prepare*Execution` function performs preview/planning only and writes no Sheet data. It creates a PREPARED journal in Script Properties and a phase-bound, owner-bound, Spreadsheet-bound token in that owner's User Properties. The raw token is omitted from console logs and journals; only the preparing owner receives it in the transient prepare return value and their User Property record. The token expires after five minutes and is deleted under both locks only after every binding and regenerated-plan check succeeds. The `executePrepared*Staging` editor wrappers cannot proceed unless this protected token state exists.

## Required evidence before authorization

- reviewed live preview output: `safe=true`, `errors=[]`, `dryRun=true`, `writes=0`;
- matching Staging environment, expected ID, Staging pin, and active ID;
- verified Spreadsheet owner/operator identity;
- immutable source/bundle hash and approved change/request reference;
- backup reference and baseline row/header counts;
- zero active `APPLYING` or `RECOVERY_REQUIRED` migration journals;
- reviewer approval for the exact plan hash logged by prepare.

## Exact Staging editor sequence

Do not run this sequence until the local implementation and generated package have been reviewed and explicitly authorized for Apps Script upload and migration execution.

1. Refresh the Apps Script editor and run `diagnosticMigrationExecutionStatus`. Stop if any journal is `APPLYING` or `RECOVERY_REQUIRED`.
2. Run `prepareStaffScheduleMigrationExecution`. Retain the compact log containing request ID, token expiry, exact plan hash, actor, Spreadsheet ID, and proposed sheet/column names. Obtain approval for that hash within five minutes.
3. Run `executePreparedStaffScheduleMigrationStaging` once. Retain the COMMITTED result. Re-run the Staff Scheduling preview and require zero pending operations.
4. Run `prepareAttendanceMigrationExecution`, review/approve its exact plan hash, then run `executePreparedAttendanceMigrationStaging` once. Retain the COMMITTED result and require a zero-pending Attendance preview.
5. Run `preparePayrollPhase4MigrationExecution`, review/approve its exact plan hash, then run `executePreparedPayrollPhase4MigrationStaging` once. Retain the COMMITTED result and require a zero-pending Payroll/Attendance preview.
6. Run `diagnosticMigrationExecutionStatus` and archive all three COMMITTED records. Run `diagnosticMigrationRecoveryStatus`; it must return no recovery-required record.

For an externally supplied request ID, call the prepare function programmatically with `{requestId, requestContext}` and then call the matching primary executor with `{requestId, confirmationToken}`. Reusing a request ID with a different request context is rejected. A fresh token for the same committed request returns its original committed result without Sheet writes.

## Journal and recovery

The durable journal records migration/schema/phase IDs, request ID and fingerprint, actor, expected Spreadsheet ID, timestamps, exact plan hash, status, created sheet names, initialized blank sheets, appended column ranges, write count, errors, and the final result. Its Script Property key includes full SHA-256 components for phase-scoped Spreadsheet ID, actor identity, and request ID. Serialized records are rejected above 8,000 UTF-8 bytes, aggregate Script Property usage is guarded at 450,000 bytes, and error text is bounded. Status transitions are `PREPARED -> APPLYING -> COMMITTED`, or `PREPARED -> APPLYING -> ROLLED_BACK/RECOVERY_REQUIRED`.

The executor records compact operation intent before each write and progress after it. Rollback removes only request-created sheets that are still exactly header-only. For appended/initialized headers it preserves pre-existing physical columns and formatting, deletes only physical columns inserted by this request, and treats formulas—including formulas returning an empty value—as protected data. Shifted ranges or any ambiguity stop destructive recovery and mark `RECOVERY_REQUIRED`. Recovery diagnostics include the exact recorded ranges, header counts/hashes, in-flight operation, and non-mutating manual checks.

No historical row is a normal write target. The executor does not install triggers or create named ranges/indexes, and does not change feature flags or other Script Properties.
