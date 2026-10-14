# Income statement performance

Story: protected statement and monthly closing reads must show the latest requested period and retain the previous successful values if a refresh fails. No production closing, deletion or financial transaction is created by this audit.

The income calculation uses the existing three native bounded sheet reads. Cairo boundaries are calculated once instead of formatting the date of every Date cell. String cells retain the legacy parser. Nonexistent/normalized calendar boundaries fall back to that parser; repeated-hour days use separately resolved endpoints. All sales, tips, payment categories, expenses, withdrawals, customer counts and averages retain their prior formulas. The monthly lock still recalculates these values on the server and ignores the client summary.

The page has one active statement read and only the newest pending period. Duplicate clicks share a request; old responses cannot replace a newer or edited range. An error retains the last successful figures with a clear status instead of rendering false zero. Month lock remains unavailable while the requested statement is pending or failed. Closing refreshes share an in-flight read; a refresh after a completed mutation waits for it and performs a fresh read. Failed closing reads retain existing records and use a generic HTML-safe error row.

Opt-in numeric page timing covers full statement intent-to-render time, including a pending-read wait. Shared API diagnostics now also recognize the two income read actions, without logging amounts, period values, sessions or customer data.

Tests compare all financial fields against the previous production calculation using native Date and string cells, payment methods, missing expense/withdrawal tabs, repeated-hour Cairo dates and invalid boundaries. Synthetic monthly-lock tests prove authoritative server calculations are unchanged. UI tests cover deduplication, rapid periods, invalid/edited range response suppression, error retention and refresh after mutation. All 1296 tests in the cleaned tracked workspace passed, and the isolated deployed page passed its eight focused tests. (Previously untracked local test drafts were removed at the owner's explicit cleanup request.)

Production source v55 was verified against the candidate upload and immutable version and activated on the existing Apps Script deployment. Frontend dpl_7KfzBc7TUMjacQ1qaUhkKn6RbSuN is active on the existing domain; the income page references the API timing tag 20261014-income-timing-1. The live frontend was updated and measured while Apps Script was still v54, then measured again on v55, so both sides used the same frontend and month range.

Live measurements for 2026-10-01 through 2026-10-31 on 2026-10-14:

| Read | Before server optimization | After |
| --- | ---: | ---: |
| Statement, full intent-to-render | 7.625 s | 5.522 / 5.079 s |
| Monthly closing list, full read-to-render | 4.482 s | 3.214 / 2.846 s |
| Single-day statement (2026-10-14), two clicks sharing one request | Not measured | 4.702 s |

The statement Google execution dropped from 7.250 s to 5.199 s in these samples. All 13 visible financial/count metrics matched before and after. Rendering added only about 2 ms to the final 5.520 s API elapsed. Closing-list calculation was not changed; its timing difference is provider variance, not attributed to a faster formula. These observations do not guarantee a six-second ceiling, especially for a new period waiting behind an already running read. No auth cache, financial cache, extra concurrency, write replay or provider timeout masking was added.

Live invalid-range validation preserved the displayed figures and disabled month lock; the current-month view was restored afterward. Monthly refresh was clicked twice to verify shared reads. No mutation or closing button was submitted.
