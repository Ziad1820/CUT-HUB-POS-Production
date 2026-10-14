# Invoice page performance

Story: opening invoices, filtering and loading another page must read current protected invoice data, preserve order and money and present only the newest requested filters.

Baseline live measurements on 2026-10-14, including the shared API request queue: initial 25 records 3.910 s; load more to 50 records 3.603 s; from-date filter 8.378 s. Baseline date-filter Google execution measured 7.999 s.

The protected invoice reader now computes Cairo date boundaries once per request. Date cells use timestamp comparisons; strings retain the legacy date parser. Repeated-hour dates keep their calendar day, and a normalized nonexistent-midnight boundary falls back to the original row parser. Filter options, totals, order, pagination, stable source IDs and schema/read-recovery protections remain unchanged. No data cache, authorization change, write retry or permission expansion is introduced.

The page holds one active read and only the most recent pending read. Equivalent in-flight reads share a promise. Obsolete responses and errors cannot repaint newer filters or append an obsolete page. The existing 350 ms search debounce remains; manual refresh clears its pending timer. Existing rows, totals and selection remain on read failure; manual retry keeps the existing offset. No sale, edit, deletion or PDF creation was performed against production for performance tests.

Tests cover duplicate reads, latest pending filter replacement, stale append results, failure retention and old/new backend result equivalence including Cairo repeated-hour and invalid-boundary fallback cases. Production Apps Script v54 was verified against uploaded and immutable source snapshots; the existing deployment pointer was confirmed. Frontend dpl_NjAGKSjUwn4ay2JQueK5mz81GRv9 is active on the existing domain with asset tag 20261014-invoices-speed-2. Only the relevant blocks in the isolated deployed invoice source were patched; unrelated local drafts were preserved.

Live results after the change (2026-10-14):

| Operation | Elapsed seconds |
| --- | ---: |
| First 25 invoices, two rounds | 5.457 / 7.009 |
| Date filter from 2026-10-01, two rounds | 4.800 / 5.697 |
| Load more in that range, reaching 50 unique rows | 5.892 |

The final asset logs an opt-in numeric page timer covering pending-read wait, API request and rendering. In the second date-filter round API elapsed was 5.682 s and displayed-result elapsed was 5.697 s. The 7.009 s startup sample included 6.728 s of Google execution and content retrieval, leaving little time in table rendering. These are individual observations, not percentiles or a six-second guarantee. Initial loading and load-more baseline samples were lower in earlier rounds; their network variance is not claimed as a measured speed improvement. The repeatable code-level reduction is date conversion and excess pending reads.

The initial page and from-date filter rendered 25 records. Load more rendered 50 unique consecutive row IDs. Browser requests returned HTTP 200. Automated interleaving tests verify rapid-filter correctness and include full pending wait in reported time. Subsequent live rapid-filter/search testing stopped when the user moved the test tab back to cashier; no user draft or view was overwritten. Production edits, deletions and PDF generation were not timed or performed.

All 1575 regression tests pass; the isolated deployed invoice source also passes the focused behavior tests. Test fixtures compare previous and current result data rather than assert a synthetic network speed.
