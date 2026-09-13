# Staging configuration template

Placeholders only. Do not commit completed secrets, IDs, property values, or personal emails.

| Configuration | Placeholder | Required before |
|---|---|---|
| Environment identity | `<STAGING_ENVIRONMENT_NAME>` | migration preview |
| Active Spreadsheet identity | `<STAGING_SPREADSHEET_ID>` | migration preview |
| Independent Staging Spreadsheet pin | `<STAGING_SPREADSHEET_ID_CONFIRMATION>` | migration preview |
| Apps Script project identity | `<STAGING_APPS_SCRIPT_PROJECT_ID>` | migration preview |
| Deployment identity/version | `<STAGING_DEPLOYMENT_IDENTITY>` | SHADOW |
| Browser API endpoint injected before `api.js` | `<STAGING_APPS_SCRIPT_EXEC_URL>` | browser testing |
| Authorized operator | `<AUTHORIZED_OPERATOR_ID>` | migration preview |
| Owner identity | `<STAGING_OWNER_ID>` | migration preview |
| Trigger owner identity | `<TRIGGER_OWNER_EMAIL>` | detector/trigger installation |
| Backup evidence | `<BACKUP_REFERENCE>` | migration execution |
| Rollback owner | `<ROLLBACK_OWNER_ID>` | migration execution |
| Monitoring destination | `<MONITORING_DESTINATION>` | SHADOW |
| Branch registry | `<BRANCH_REGISTRY_REFERENCE>` | Phase 5 |
| Branch timezones | `<BRANCH_TIMEZONE_MAP>` | Phase 5 |
| Branch hours | `<BRANCH_HOURS_REFERENCE>` | Phase 5 |
| Staff identities | `<STAFF_IDENTITY_REFERENCE>` | Phase 2 |
| User scopes | `<USER_SCOPE_REFERENCE>` | Phase 2 |
| Attendance policies | `<ATTENDANCE_POLICY_REFERENCE>` | Phase 3 |
| Salary policies | `<SALARY_POLICY_REFERENCE>` | Phase 4 |
| Booking configuration | `<BOOKING_CONFIGURATION_REFERENCE>` | SHADOW |
| Availability engine | `<LEGACY_OR_SHADOW_OR_PHASE5>` | SHADOW/Phase 5 |
| Conflict resolution flag | `<TRUE_OR_FALSE>` | Phase 5 |
| No-check-in detector flag | `<TRUE_OR_FALSE>` | detector execution |
| Cache/version settings | `<CACHE_AND_VERSION_CONFIGURATION>` | SHADOW |

## Script Property names requiring authorized manual entry

```text
CUT_HUB_ENVIRONMENT=<STAGING_ENVIRONMENT_NAME>
CUT_HUB_SPREADSHEET_ID=<STAGING_SPREADSHEET_ID>
CUT_HUB_STAGING_SPREADSHEET_ID=<STAGING_SPREADSHEET_ID_CONFIRMATION>
CUT_HUB_BACKEND_VERSION=<RELEASE_CANDIDATE_ID>
BOOKING_AVAILABILITY_ENGINE=<LEGACY_OR_SHADOW_OR_PHASE5>
BOOKING_PHASE2_PLANNED_ENABLED=<TRUE_OR_FALSE>
BOOKING_ATTENDANCE_LIVE_ENABLED=<TRUE_OR_FALSE>
BOOKING_CUSTOMER_LIVE_REFRESH_ENABLED=<TRUE_OR_FALSE>
BOOKING_INTERNAL_LIVE_REFRESH_ENABLED=<TRUE_OR_FALSE>
BOOKING_MANAGER_OVERRIDE_ENABLED=<TRUE_OR_FALSE>
BOOKING_CONFLICT_RESOLUTION_ENABLED=<TRUE_OR_FALSE>
BOOKING_NO_CHECK_IN_DETECTOR_ENABLED=<TRUE_OR_FALSE>
BOOKING_NO_CHECK_IN_TRIGGER_OWNER_EMAIL=<TRIGGER_OWNER_EMAIL>
```

Safe initial state is `LEGACY`, live/override/conflict/detector flags false, and no trigger.

The frontend runtime intentionally contains no deployment URL. Before serving the Staging UI, an authorized release process must inject `window.ROMEO_API_URL=<STAGING_APPS_SCRIPT_EXEC_URL>` ahead of `public/assets/js/core/api.js`. Missing configuration fails closed and must never fall back to Production.

## Gate sequence

1. Before migration preview: isolated project/Spreadsheet identities, authorized operator, owner, and read-only evidence location.
2. Before migration execution: approved preview, backup, expected row counts, rollback owner, and separate execution authorization.
3. Before SHADOW: Booking configuration, monitoring, cache/version plan, and comparison acceptance thresholds.
4. Before PHASE5: branch registry/hours/timezones, staff/scope/policy completeness, successful SHADOW evidence, and rollback rehearsal.
5. Before detector execution: PHASE5 prerequisites, conflict handling, exact grace/timezone tests, monitoring, and explicit environment activation task. Current Staging/Production code gate blocks it.
6. Before trigger installation: successful Staging detector evidence, approved runbook, reviewed OAuth scopes, owner identity match, alert ownership, and separate trigger-installation approval.
