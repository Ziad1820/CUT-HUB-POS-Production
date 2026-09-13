# Staging Core Authentication Bootstrap

This runbook is for the existing CUT HUB POS Staging Apps Script HEAD project only. It must never be used in Production. It does not run or repeat Staff Scheduling Phase 2, Attendance Phase 3, or Payroll/Attendance Phase 4 migrations.

## Scope

The bootstrap creates only `USERS`, because it is the only physical sheet required for login. The approved headers, in exact positional order, are:

`USERNAME, PASSWORD, DISPLAY_NAME, PERMISSIONS, CREATED_AT, PASSWORD_HASH`

The owner row is created as `owner`, blank plaintext `PASSWORD`, the supplied non-empty display name, blank `PERMISSIONS`, an ISO timestamp, and the current login-compatible SHA-256 hash. The password, full hash, and raw confirmation token are never logged or returned.

`DATA`, `DAILY_CLOSINGS`, `EXPENSES`, and `WITHDRAWLS` are reported by preview but are not created. The Dashboard handles their absence through controlled API errors, `Promise.allSettled`, empty previews, or zero-value totals.

## Preconditions

1. Confirm `CUT_HUB_ENVIRONMENT=staging`.
2. Confirm `CUT_HUB_SPREADSHEET_ID` equals `CUT_HUB_STAGING_SPREADSHEET_ID`.
3. Confirm the active Spreadsheet ID matches both pins.
4. Run only as the interactive Drive owner. Effective user, active user, and Drive owner must be the same non-empty email.
5. Refresh the Apps Script editor after the reviewed Staging HEAD package is uploaded.

## Credential preparation

1. With the Staging Spreadsheet open, run `openCoreStagingBootstrapCredentialDialog` from the bound Apps Script project.
2. Enter a unique request ID, a non-empty owner display name, and the new password twice in the masked dialog.
3. The server hashes the password immediately. Only the hash and its non-reversible fingerprint are held temporarily in the preparing owner's User Properties for ten minutes. Plaintext is not stored in source, Sheet cells, logs, Script Properties, journals, or results.
4. Close the dialog after it reports the request ID. Do not share that request ID as a credential; it is an audit/idempotency identifier.

## Prepare and review

1. Run `previewCoreStagingBootstrap` and confirm it proposes only `USERS`. After the secure dialog, the preview reads the valid temporary owner-scoped credential binding without exposing or consuming it. Before credential staging it reports `CORE_OWNER_CREDENTIAL_REQUIRED`.
2. Run `prepareCoreStagingBootstrap` from the editor within ten minutes of credential staging.
3. Review the compact returned/logged summary. It must show only `USERS`, `createOwnerRecord=true`, the intended request ID, and the Staging Spreadsheet ID. It must not contain a password, full hash, or raw token.
4. Preparation writes only a size-guarded `PREPARED` journal to Script Properties and owner-scoped temporary credential/token records to User Properties. It performs no Sheet write.

## Execute once

1. Within five minutes of prepare, run `executePreparedCoreStagingBootstrap`.
2. Never run `executeCoreStagingBootstrap` directly from the editor; it rejects a missing argument object.
3. The wrapper validates the token, credential binding, request fingerprint, exact plan hash, Spreadsheet pins, and owner identity under Script then Document lock before consuming the temporary User Properties.
4. A successful result must be `COMMITTED`, create only `USERS`, create exactly one owner row, and report no credential material.

## Verify

1. Run `previewCoreStagingBootstrap` again.
2. Require `completed=true`, `safeToInitialize=true`, `dryRun=true`, `writes=0`, no missing mandatory sheets or columns, no incompatible sheets, exactly one owner, `ownerPasswordState=HASHED_ONLY`, `plaintextPasswordCellEmpty=true`, and empty errors/blockers.
3. Run `diagnosticCoreStagingBootstrapStatus` and confirm the request is `COMMITTED`.
4. Test login as `owner`, then confirm the Dashboard opens. Missing optional Dashboard data sheets may display empty totals until their separately reviewed initialization path is completed.

## Failure and recovery

Do not retry a request in `APPLYING` or `RECOVERY_REQUIRED`. Run `diagnosticCoreStagingBootstrapRecovery` and follow its non-mutating remediation text. Automatic rollback deletes `USERS` only when the journal proves this request created it and its exact headers/owner row are unchanged. For a pre-existing exact header-only `USERS`, rollback deletes only the exact trailing owner row created by the request. Any proof mismatch leaves data untouched and marks `RECOVERY_REQUIRED`.
