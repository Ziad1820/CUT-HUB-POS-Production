# Frontend Staging API configuration

The repository default is deliberately empty. An authorized environment-specific build step must create the deployed `runtime-config.js` value from `config/frontend-runtime-config.staging.example.js` without committing the real URL.

Required load order on every page is `runtime-config.js` → `api.js` → `auth.js` (when protected) → page module. `RomeoApi.request` is the only request boundary; authentication and customer booking both delegate to it and fail closed if the client/configuration is unavailable.

Controls:

1. Substitute only `<STAGING_APPS_SCRIPT_EXEC_URL>` in the Staging artifact; never change source to a real deployment URL.
2. Keep Staging and Production artifacts/configuration stores separate.
3. Reject query-string, form, localStorage, sessionStorage, or user-input overrides.
4. Confirm the URL origin/path against operator evidence without printing the full value in logs.
5. Missing URL must produce the controlled “API endpoint is not configured” error. It must not fall back to Production.
6. Run `node tests/frontend-api-configuration.test.js` before packaging and after any page/script-order change.

No real deployment URL is stored in this repository or release documentation.
