# Staging Script Property plan

Do not set properties from this document. Values are placeholders; safe initial state is Staging + `LEGACY`, all live/override/conflict/detector flags false, and no trigger.

| Property | Format / allowed values | Safe initial value | Phase | Sensitive | Consumer and validation | Missing/failure behavior | Rollback |
|---|---|---|---|---|---|---|---|
| `CUT_HUB_ENVIRONMENT` | lowercase `development`, `test`, `staging`, `production` | `staging` | before Preview | no | router and Phase 5 identity guards; exact normalized allow-list | router fails closed | restore reviewed prior value |
| `CUT_HUB_SPREADSHEET_ID` | Google Spreadsheet ID, `[A-Za-z0-9_-]{20,128}` | `<STAGING_SPREADSHEET_ID>` | before upload/Preview | operationally sensitive | router and migrations; must equal active ID | protected routing/preview fails closed | restore reviewed prior pin |
| `CUT_HUB_STAGING_SPREADSHEET_ID` | same ID format and same value as current Staging pin | `<STAGING_SPREADSHEET_ID>` | before Preview | operationally sensitive | Staging identity confirmation | Staging fails closed | restore reviewed prior pin |
| `CUT_HUB_BACKEND_VERSION` | immutable RC ID | `<NEW_RC_ID>` | before frontend test | no | status/identity evidence | version evidence incomplete | prior RC ID |
| `BOOKING_AVAILABILITY_ENGINE` | `LEGACY`, `SHADOW`, `PHASE5` | `LEGACY` | before frontend test | no | availability engine | defaults/validation must not elevate authority | `LEGACY` |
| `BOOKING_PHASE2_PLANNED_ENABLED` | `true` or `false` | `false` | before SHADOW | no | availability flags | disabled | `false` |
| `BOOKING_ATTENDANCE_LIVE_ENABLED` | `true` or `false` | `false` | before SHADOW | no | availability flags/calculation | disabled | `false` |
| `BOOKING_CUSTOMER_LIVE_REFRESH_ENABLED` | `true` or `false` | `false` | before SHADOW | no | customer availability | disabled | `false` |
| `BOOKING_INTERNAL_LIVE_REFRESH_ENABLED` | `true` or `false` | `false` | before SHADOW | no | internal availability | disabled | `false` |
| `BOOKING_MANAGER_OVERRIDE_ENABLED` | `true` or `false` | `false` | before PHASE5 | no | operational override adapter | disabled | `false` |
| `BOOKING_CONFLICT_RESOLUTION_ENABLED` | `true` or `false` | `false` | before PHASE5 | no | conflict mutation guard | disabled | `false` |
| `BOOKING_NO_CHECK_IN_DETECTOR_ENABLED` | `true` or `false` | `false` | before detector test | no | detector gate | disabled | `false` |
| `BOOKING_NO_CHECK_IN_TRIGGER_OWNER_EMAIL` | valid reviewed Google identity | `<TRIGGER_OWNER_EMAIL>` | before detector test; trigger install | yes—identity | detector owner check | detector/trigger gate fails | remove only under approved rollback |

Production-only isolated migration tooling additionally requires `CUT_HUB_PRODUCTION_SPREADSHEET_ID` to equal a valid `CUT_HUB_SPREADSHEET_ID` and the opened/active Production file. It has no safe Staging value and must not be set as part of this Staging preparation. No Spreadsheet ID is hardcoded in migration source.

CacheService availability is platform state, not a writable flag. Version/generation records must be observed through safe status APIs; no cache hit-rate claim is made. `BOOKING_RATING_PHONE_SALT` is secret and application-managed: never log, document, copy, or manually seed it during this preparation. Any additional deployed property must be inventoried and reviewed before configuration approval.
