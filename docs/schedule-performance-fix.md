# Schedule loading and conflict feedback

The range resolver previously read schedules, overrides and work policies for every requested day. Production module 064 now reads policies and date-range overrides once per request, and schedules once per employee. A 14-day single-employee range uses 3 dataset reads instead of 42; this does not imply the same ratio for total network latency.

The weekly table previously displayed empty days during loading and waited for all other requests before rendering. It now shows an explicit loading or failure state, disables weekly edit/create controls until the weekly read succeeds, and renders successful weekly data independently of a range failure. Stale policy errors cannot overwrite a newer employee selection.

Overlapping recurring shifts remain rejected. The page explains in Arabic that the user should edit the existing shift or choose non-overlapping times/dates; internal compensation journal details are no longer displayed for this routine validation error. No existing schedules, attendance, staff policy rates, or booking flags are changed by the release.

Validation: production-engine 63-day range equals individual-day resolution including branch closure and midnight shifts; dataset read counters stay constant; frontend test preserves successful weekly data when range loading fails; attendance minute workflow and production modularization tests.
