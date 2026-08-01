# Staging operator input sheet

Placeholders only. Do not enter real identifiers, email addresses, URLs, customer data, or employee data in source control.

| Input | Placeholder | Required before |
|---|---|---|
| Staging Spreadsheet ID | `<STAGING_SPREADSHEET_ID>` | Apps Script upload; Migration Preview |
| Active Spreadsheet ID | `<ACTIVE_SPREADSHEET_ID>` | Migration Preview |
| Apps Script project ID | `<STAGING_APPS_SCRIPT_PROJECT_ID>` | Apps Script upload |
| Staging deployment URL | `<STAGING_APPS_SCRIPT_EXEC_URL>` | frontend Staging test |
| Authorized operator email | `<AUTHORIZED_OPERATOR_EMAIL>` | Apps Script upload; Migration Preview |
| Project owner email | `<PROJECT_OWNER_EMAIL>` | Apps Script upload |
| Rollback owner | `<ROLLBACK_OWNER_EMAIL>` | migration execution |
| Monitoring owner | `<MONITORING_OWNER_EMAIL>` | SHADOW |
| Trigger owner candidate | `<TRIGGER_OWNER_EMAIL>` | detector testing; trigger installation |
| Environment name | `<STAGING_ENVIRONMENT_NAME>`; must normalize to `staging` | Migration Preview |
| Expected branch IDs | `<SYNTHETIC_BRANCH_ID_LIST>` | migration execution; frontend test; SHADOW |
| Expected staff IDs | `<SYNTHETIC_STAFF_ID_LIST>` | migration execution; frontend test; SHADOW |
| Test account identities | `<TEST_ACCOUNT_ROLE_MAP>` | frontend Staging test |
| Backup location | `<STAGING_BACKUP_REFERENCE>` | migration execution |
| Baseline row counts | `<SHEET_ROW_COUNT_MAP>` | migration execution |

The account matrix must cover owner, manager, employee, payroll accountant/reviewer/approver, booking operator, restricted permission-only users, and public booking. Data must be synthetic. The two Spreadsheet ID fields and both Script Property pins must resolve to the same isolated Staging file. Trigger installation remains a later, separate approval and expected trigger count is zero.

Operator attestation: `<NAME>` / `<UTC_TIMESTAMP>` / `<EVIDENCE_LOCATION>` / `<REVIEWER>`.
