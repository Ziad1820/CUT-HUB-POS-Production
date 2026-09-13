# Minimal synthetic Staging data blueprint

Blueprint only. No row, account, file, property, or remote resource was created.

| Synthetic record | Purpose and dependencies | Expected owning sheet | Scenarios covered | Cleanup action |
|---|---|---|---|---|
| `BR-STG-CAIRO` | Active public branch; timezone `Africa/Cairo` | `BOOKING_BRANCH_REGISTRY` | public booking, attendance, PHASE5 | Remove/deactivate synthetic branch after dependent cleanup |
| `BR-STG-DST` | Active non-public branch using `<DST_IANA_TIMEZONE>` | `BOOKING_BRANCH_REGISTRY` | timezone/DST and internal-only access | Remove/deactivate after dependent cleanup |
| `BR-STG-INACTIVE` | Inactive branch | `BOOKING_BRANCH_REGISTRY` | inactive/public filtering and denial | Remove synthetic row |
| `BH-CAIRO-DAY` | Normal weekday hours for Cairo branch | `BRANCH_BOOKING_HOURS` | standard slot generation | Remove synthetic hours |
| `BH-CAIRO-OVERNIGHT` | `22:00–06:00`, valid effective range | `BRANCH_BOOKING_HOURS` | overnight hours and date boundary | Remove synthetic hours |
| `BH-DST-DAY` | Hours around a selected DST transition test date | `BRANCH_BOOKING_HOURS` | DST conversion/revalidation | Remove synthetic hours |
| `STF-SALARY` | Active BR-STG-CAIRO employee with complete monthly salary policy | `STAFF`, `STAFF_WORK_POLICIES` | attendance and salary settlement | Remove employee after dependent records |
| `STF-HOURLY` | Active BR-STG-DST employee with minute/hour rate | `STAFF`, `STAFF_WORK_POLICIES` | hourly payroll and DST | Remove employee after dependent records |
| `STF-INCOMPLETE-PAY` | Active employee missing required payroll basis | `STAFF`, `STAFF_WORK_POLICIES` | fail-closed payroll warnings | Remove employee/policy row |
| `STF-MISSING-CHECKIN` | Active employee scheduled before current test minute with no events | `STAFF` | no-check-in detector candidate | Resolve/remove conflicts, then employee |
| `SCH-SPLIT` | Two valid segments on one working day | `BARBER_SCHEDULE` | split shift and gap availability | Deactivate/remove synthetic schedule |
| `SCH-REST` | Rest-day classification | `BARBER_SCHEDULE` or schedule override | no work/no availability | Remove synthetic schedule record |
| `OVR-TRAINING` | Training classification for one staff/date | `STAFF_SCHEDULE_OVERRIDES` | non-working classification | Remove override |
| `OVR-PAID-LEAVE` | Approved paid leave | `STAFF_SCHEDULE_OVERRIDES`, `STAFF_LEAVE_LEDGER` | attendance/payroll paid leave | Remove paired synthetic records |
| `OVR-UNPAID-LEAVE` | Approved unpaid leave | `STAFF_SCHEDULE_OVERRIDES`, `STAFF_LEAVE_LEDGER` | deduction/no availability | Remove paired synthetic records |
| `OVR-BRANCH-CLOSED` | Branch closure for a bounded date/time | `STAFF_SCHEDULE_OVERRIDES` / branch registry | closure conflict and public filtering | Reopen/remove synthetic closure |
| `OVR-MANAGER` | Approved operational manager override inside planned shift | `BOOKING_OPERATIONAL_OVERRIDES` | internal capacity override/audit | Revoke then remove only under cleanup plan |
| `CUS-PUBLIC-01` | Synthetic customer name/phone token | `Bookings` | public Booking and tracking | Cancel/remove synthetic customer Booking data |
| `BKG-MULTI-SERVICE` | Two synthetic services with duration snapshots | `Bookings` | duration/price/service-set hashing | Cancel then remove synthetic Booking |
| `BKG-CONFLICT` | Future Booking for missing-check-in staff | `Bookings`, `BOOKING_AVAILABILITY_CONFLICTS` | conflict creation/idempotency | Resolve/dismiss conflict, cancel Booking |
| `BKG-ACCEPTED` | Confirmed future Booking | `Bookings` | accepted/availability validation | Cancel/remove Booking |
| `BKG-PROPOSED` | Proposed date/time Booking | `Bookings` | proposed-time revalidation | Reject/cancel/remove Booking |
| `BKG-CANCELED` | Canceled Booking retained as inactive evidence | `Bookings` | inactive filtering/no conflict | Remove only if retention plan permits |
| `ATT-EVENT-FLOW` | Check-in, break start/end, check-out for STF-SALARY | `ATTENDANCE_EVENTS`, `ATTENDANCE` | event projection and payroll minutes | Remove events/day in reverse dependency order |
| `ATT-CORRECTION-01` | Correction request with evidence | `ATTENDANCE_ADJUSTMENTS` | approval/rejection/audit | Close then remove synthetic adjustment |
| `ATT-OT-01` | Overtime request for completed day | `ATTENDANCE_OVERTIME_APPROVALS` | overtime approval/payroll snapshot | Close/remove request after settlement cleanup |
| `PAY-PERIOD-01` | Bounded period containing synthetic attendance only | `PAYROLL_ATTENDANCE_PERIODS` | period lifecycle and settlement | Remove settlements/adjustments before period |
| `PAY-ADJ-01` | Manual payroll adjustment with reason/evidence | `PAYROLL_ATTENDANCE_ADJUSTMENTS` | adjustment permissions and totals | Reverse/remove before period cleanup |

Use synthetic services and staff Booking eligibility records where required. Record exact baseline and expected row-count deltas before any future write. Cleanup order is conflicts/audits retained as required → Booking states → payroll children → attendance children → overrides/schedules/hours → staff → branches. Never apply this blueprint to Production.
