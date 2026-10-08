# Dashboard Apps Script transport repair — 2026-10-08

The Production dashboard made direct browser requests to Apps Script. The reported failures were missing CORS headers and 404 responses from the ContentService redirect. Production requests now use `/api/apps-script` on the website's own origin.

The relay retains the original JSON payload and session fields, posts once to the fixed Production deployment, then reads only its approved Google ContentService redirect. It never retries an execution, including writes whose response was lost. Each execution has a fresh request identifier to avoid stale redirects; execution and result use separate TLS connections. Browser request concurrency is limited to two. Responses are never cached. Existing Apps Script authorization checks remain active.

## Deployed package

- Frontend baseline: `dpl_FGjgXQQFxhFFJJ5sq8WGDsB2usFn`; all 71 baseline source files verified against their deployed hashes before preparing the isolated candidate.
- Final website deployment: `dpl_DFRycZERbQFTdFi4NqVbp1ZEMya9`.
- Production website: https://cut-hub-pos-production.vercel.app
- Apps Script remains on version 39 with the existing deployment identifier. This repair changes the website transport, not the business functions.
- The isolated website candidate preserves the deployed frontend, including its existing diagnostics. Unrelated local staff-accounting changes and additional local diagnostic work were not deployed or committed as part of this repair.

## Verification and limits

- Full workspace regression run before the final connection changes: 1,498 passing tests.
- Final targeted transport, concurrency and frontend configuration run: 24 passing tests.
- Commit-only API subset separately passed both concurrency tests.
- Protected candidate live reads: branches succeeded with one branch; booking options succeeded with 27 services.
- Protected auth smoke retained `authRequired` and `sessionExpired`.
- The user confirmed that the dashboard CORS and 404 errors disappeared after refreshing.
- No production invoice, withdrawal, booking or financial write was created for testing. A lost upstream response still returns a JSON error with `requestMayHaveCompleted`; it must not be blindly retried.
- A live booking-options request exceeded the original 55-second deadline. The relay now allows 170 seconds within a 180-second function limit so slow Google executions can return normally without replay.
- Final browser check on the canonical Production hostname loaded the branch and all 27 service choices after this deadline adjustment, with the availability state displayed normally.

Rollback the website to the preceding deployment through Vercel if needed. Private snapshots and response bodies remain in the ignored local deployment directory.
