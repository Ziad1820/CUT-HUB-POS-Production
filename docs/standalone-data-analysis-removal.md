# Standalone analysis removal — 2026-10-09

The user requested removal of the separate Data Analysis page and its sidebar entry. `public/pages/data-analysis.html` is deleted. Its shared navigation entry, legacy sidebar buttons, translation selectors and authentication landing-page mapping are removed. The existing dashboard analytics module and `view_data_analysis` permission remain in place.

The former page URL redirects permanently to `/pages/dashboard.html`, which retains its normal permission checks. Auth, shared navigation and dashboard script versions were refreshed to avoid stale cached links. Users with only the removed page's permission are not granted dashboard access automatically.

The isolated website candidate contains 73 deployment files and preserves the current Production code. Deployment: `dpl_ASXK8fHvfQA4UcrjaQ3JG1yo5ieN`. Apps Script remains version 40.

The 45 authentication/navigation and shared-layout checks and 13 dashboard/configuration/release checks passed. No remaining reference to the deleted page exists in `public/`. The deployed shared-navigation file matched the local SHA-256; the old route returned HTTP 308 with `/pages/dashboard.html` as its destination. The user's unrelated staff-accounting edits were preserved; only this task's link removal and script-version changes are included in its staged page.
