# Attendance, team schedules and booking reception — 2026-10-18

The owner approved a simpler four-page workflow: daily attendance cards, an all-staff seven-day schedule board, a unified reception calendar, and a two-step customer booking page. Existing payroll rules, minute rates, overtime approval, authorization, mutation locks, request identities, transaction evidence and operational availability remain authoritative.

## Behavior

- Routine check-in and return from break submit once and reconcile the authoritative attendance day. Break length is editable; checkout remains an explicit confirmation. Calculation details, corrections and approval actions are disclosed on demand. An open work session is not itself a review warning.
- The team board uses one scoped `getScheduleWeekBoard` request. Its repository snapshot memoizes source reads. Clicking a staff/day opens the existing shift editor. New shift fields use the employee's effective policy or remain empty; hours and break duration are not invented. Policy gaps are shown per employee. Copy and audit controls remain available in the employee details.
- Reception day/week/list views show internal and website bookings together, with source labels and local staff/status/search filters. Empty cells start a draft; they do not promise availability. The selected time is used only if the authoritative service-duration availability response still offers it. Requests are bounded to the selected week plus the preceding day for overnight carry-over.
- Internal bookings confirm immediately after the existing locked validation. Public bookings default to automatic confirmation, with an owner-only manual-confirmation setting. Existing pending bookings are unchanged; retry returns the previously committed booking regardless of later setting changes.
- `arrived` means the visit has started and continues occupying the original service interval. `done` completes service and releases occupancy. `no_show` is terminal and cannot be recorded before the appointment time. Arrival is restricted to the appointment date. Replanning a confirmed booking uses the existing validated proposal flow.
- Occupancy includes preparation/cleanup, proposed dates and overnight appointments. Arrival is included in operational conflict detection. Existing bookings are surfaced for manager review when attendance changes; they are not automatically cancelled.
- Public booking has two steps: service/date/barber/time, then customer details. A back button preserves details. Polling preserves a still-valid selection; invalidation returns to step one. Future-day availability is labelled as scheduled availability. A present-today label requires authoritative live-attendance integration metadata.

## Operational settings

Attendance integration was disabled when reviewed on production. The existing owner action checks current policies for every active bookable employee before enabling. No shifts, break values or minute rates may be invented to pass readiness. Branch hours remain owner-controlled. The confirmation setting and attendance integration are separate settings.

The production enable attempt was rejected with `POLICY_NOT_FOUND`; integration therefore remains disabled. Automatic public confirmation is active. The owner must finish effective employee work policies before enabling attendance linkage; a visual redesign does not substitute for this setup.

## Validation boundaries

`tests/booking-workflow-redesign.test.js` executes the actual production module package with isolated in-memory records. It covers confirmation modes, owner authorization, malformed settings, compensation on audit failure, creation/retry, availability rejection, arrival/completion/no-show, bounded range reads, proposal/overnight occupancy and scoped week-board requests. Existing attendance and booking concurrency tests continue to protect against duplicate writes and stale responses.

`tests/fixtures/booking-workflow-preview.cjs` serves the actual four UI pages locally with a deliberately separate mock API and fixture identity. It binds only to loopback and is never deployed. Browser write-flow tests use these fixtures only. Production browser checks are read-only except for the explicitly authorized, readiness-validated integration setting; no real attendance, booking or financial test record is created.

Release verification: 1,455 tests passed. Apps Script version 76 is active; the original 89-module package and immutable baseline are verified. The Vercel production alias points to `dpl_FxyHwSVjVVDvHGEYhZKPUVCJcPkL`. The published week board and attendance dashboard both returned nine authorized employee rows. The aggregate week read resolves its actor once from the original authenticated transport request; child service reads retain that actor and the real scheduling service continues enforcing branch scope. The regression test exercises this with the actual service, rather than a permissive aggregate stub.
