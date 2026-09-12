# Staging baseline evidence template

Do not populate this source-controlled template with real IDs, emails, URLs, or business data.

| Evidence | Operator value |
|---|---|
| Spreadsheet fingerprint (redacted, e.g. first 4 / last 4) | `<REDACTED_SPREADSHEET_FINGERPRINT>` |
| Apps Script project fingerprint | `<REDACTED_PROJECT_FINGERPRINT>` |
| Environment property | `<EXPECTED_STAGING>` |
| Deployment fingerprint | `<REDACTED_DEPLOYMENT_FINGERPRINT>` |
| Backup UTC timestamp / owner / reference | `<UTC>` / `<OWNER>` / `<REFERENCE>` |
| Sheet names | `<SORTED_SHEET_NAME_LIST>` |
| Row counts | `<SHEET_ROW_COUNT_MAP>` |
| Header fingerprints | `<SHEET_HEADER_SHA256_MAP>` |
| Duplicate-ID queries/results | `<QUERY_AND_ZERO_OR_REVIEWED_RESULT>` |
| Orphan relationship checks | `<CHECK_AND_ZERO_OR_REVIEWED_RESULT>` |
| Branch registry / branch hours counts | `<COUNT>` / `<COUNT>` |
| Employee / user scope counts | `<COUNT>` / `<COUNT>` |
| Booking count by status | `<STATUS_COUNT_MAP>` |
| Attendance rows / payroll periods | `<COUNT>` / `<COUNT>` |
| Audit row counts by audit sheet | `<AUDIT_COUNT_MAP>` |
| Availability engine | `<EXPECTED_LEGACY>` |
| Feature flags | `<EXPECTED_ALL_DISABLED_MAP>` |
| Installed trigger list | `<EXPECTED_EMPTY_LIST>` |
| Expected installed trigger count | `0` |

Record collection command/query references, operator, UTC time, and reviewer beside every evidence attachment. Any unexpected trigger, non-LEGACY engine, enabled conflict/detector/live flag, identity mismatch, duplicate key, orphan, or unreviewed count drift blocks the next checkpoint.
