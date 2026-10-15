# System Access performance — 2026-10-15

The existing owner-only page already loads all users with one `getUsers` request. No new backend endpoint, authentication cache or permission shortcut was introduced. Apps Script stays at version 60.

Changes are limited to the page and the shared opt-in numeric timing allowlist:

- Concurrent user-list reads coalesce. Failed refresh retains existing cards and permissions and shows a generic error instead of clearing the list.
- A page mutation guard prevents duplicate save/create/delete submission and competing writes. Controls recover on failure; writes are never retried. A successful mutation still forces one authoritative list refresh. Reads in progress block saves/deletes so the post-write refresh cannot reuse a pre-write read.
- Local edit selection stays entirely local. Language rendering preserves each permission checkbox's checked and disabled state, including owner controls, rather than reverting a draft to defaults.
- Card buttons use delegated events and numeric indexes rather than inline username interpolation. Display labels are escaped. Owner deletion remains unavailable and the existing reserved-owner and `manage_users` restrictions remain intact.
- `?performance=1` reports numeric list-load and selection timings only. No username, password, permission list, session value or request body is logged.

Eleven focused synthetic tests cover read coalescing and failure retention, local editing, language/draft preservation, single-submit saves/creation/deletion, rejected or thrown writes with draft retention, owner protection, escaped rendering and loading/empty states during language initialization. No live account, password or permission is created, changed or deleted during performance verification. Real write latency is not claimed.

Live browser verification:

- Initial instrumented page load: **5.049 s**, including API **5.045 s** and Google upstream time **4.850 s**.
- Final page load: **5.250 s**, including API **5.248 s** and Google upstream time **5.050 s**.
- Local edit selection: below the millisecond timer's resolution in this sample (`0 ms`), with no new user-list or mutation request.
- All three rendered usernames, display names and permission descriptions exactly matched the pre-change DOM snapshot. Editing locked the username, left the password blank and selected the existing 16 permissions. Clear Fields restored the blank local draft. No console errors were observed.

Both measured loads met the six-second target; provider variability means this is not a universal guarantee. The upstream Google time dominates these samples. The page already used one list read before this change, so no reduction from multiple backend requests or before/after speedup ratio is claimed.

Full tracked suite: **1,335 tests passed**. Final Vercel deployment: `dpl_DSikixHKe5UFKmpa2fGGWa8bqGyi`; served HTML matched tested source and the production alias was verified. Apps Script and the shared authentication implementation were unchanged.
