# Dashboard analysis loading state — 2026-10-09

The analysis header and refresh button both displayed a loading message. More seriously, `readStore()` changed those messages during chart rendering, so changing filters or language after a completed request could restore a false loading state.

Storage reads now have no UI side effects. Only the active network load changes the refresh button to “Refreshing…”. The header remains available for errors, empty results and date-range instructions. Success and failure restore the button to “Refresh”. Duplicate loading assignments and the deferred language update were removed.

The Production candidate preserves the existing deployed frontend and changes only `dashboard-analysis.js` plus its cache version in `dashboard.html`. Deployment: `dpl_AVLdp4CxJj6kHAdsdy37ohrQefLg`.

Verification: two lifecycle regressions cover success, later filter rendering, failure and storage reads; ten release-inventory checks also pass. No financial or business behavior changed. The authenticated dashboard was not available in the agent's browser session, so final visual confirmation requires refreshing the user's dashboard.
