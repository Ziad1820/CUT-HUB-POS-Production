# Booking page performance

On 2026-10-17 the internal booking page was updated to load the branch catalog without generating appointments. The catalog preserves internal actor permission and branch scope, and uses the same active branch validation in Phase 5. It returns only services and staff identity fields, never slots. Public booking ignores this flag and retains the original flow.

After an employee and services are selected, the existing slot engine runs for the selected employee with the complete scoped roster still supplied to the engine. Without a selector the original full result remains available. Appointment submission continues to revalidate availability under the original mutation lock. No write or approval is cached, coalesced or automatically retried.

The page shares only identical pending read promises; results are evicted on completion or failure. Mutations invalidate pending read reuse. Ratings load when entering their tab or changing rating filters, rather than on every local render. Latest filters win; stale availability cannot restore appointments after clearing a selection, and silent refresh preserves a still-valid selected appointment. Hidden pages do not trigger periodic list refresh.

The shared sidebar and page shell replace duplicate menu bindings and inline styling. All business writes remain unchanged and are not exercised against production during performance verification.

Validation: synthetic backend comparison, permission/branch rejection, public contract, concurrent reads, stale slot/ratings response tests, and the complete system test suite. Live measurements are recorded after deployment; timings reflect individual observations rather than a guaranteed upper bound.

The initial catalog now includes the existing authorized branch list in the same request. A single active branch is selected server-side; zero/multiple branches return empty services/staff until an explicit selection. Status filtering uses the already-authorized current-date list locally, preserving the existing status/search/source results.

Live observations on production: original two-step branch/catalog loading in this round took 4.737 + 3.167 seconds (7.904 total). The combined bootstrap measured 7.144 seconds on its first run. Booking list reads measured 4.407–6.658 seconds, ratings 4.501–5.818 seconds, and selected-employee availability 9.389–9.533 seconds. This does not meet the six-second target for all server commands. Availability still depends on authoritative Apps Script/Sheets reads and is not replaced by stale cached availability. No live create/update/delete booking operation was executed.

Final published frontend (20261017-performance-3): combined catalog 5.490 seconds and booking list 6.101 seconds. Status filter was changed and restored through the live UI; no booking mutation was submitted. Viewport width and document scroll width both measured 777px. Full suite: 1,395 passed; release/inclusion checks: 10 passed.
