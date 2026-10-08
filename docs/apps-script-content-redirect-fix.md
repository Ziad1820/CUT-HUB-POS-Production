# Apps Script result redirects — 2026-10-09

The reported dashboard analysis failure occurred while loading `getWithdrawals`. Vercel logs for the deployed version showed `phase: CONTENT`, `upstreamStatus: 302`, resulting in HTTP 502. The execution had already returned its ContentService location; the relay treated a subsequent redirect as a failed JSON response.

The relay now follows up to four result GET requests, accepting only HTTPS `script.googleusercontent.com/macros/echo` destinations with no embedded credentials or non-default port. Relative redirects are resolved against the previous result URL. Loops, excess redirects and redirects outside the allowlist stop with an error. The original POST is still sent exactly once. No mutation or authentication request is replayed.

Failure diagnostics record only safe redirect classes, never signed URLs, response bodies or credentials. A redirect to Google authentication or rate limiting remains an error rather than being bypassed.

The missing `/favicon.ico` now resolves to the existing SALONIX SVG through a Vercel rewrite.

Deployment: `dpl_2gtq2cuJ5jGamKwpVm9HEhumAbY9`. The isolated candidate changes only the relay and Vercel configuration against the previous Production website.

Validation: 28 transport and loading regressions passed, including additional 302/307 result redirects, rejection of login/untrusted destinations, loop termination and no POST replay. The candidate's live `getWithdrawals` request without a session returned the normal `authRequired`/`sessionExpired` JSON; the favicon returned HTTP 200 with `image/svg+xml`. Authenticated financial data was not available to the agent, so the user's signed-in dashboard is the final end-to-end check.
