# Staging test-account and permission matrix

No accounts are created by this document. Use synthetic account identifiers only and never place real personal emails in repository files.

| Synthetic account | Required permissions | Prohibited permissions | Branch scope / employee binding | Intended and negative scenarios | Cleanup |
|---|---|---|---|---|---|
| `<ACCOUNT_OWNER>` | Owner authority; all reviewed permissions | None beyond owner policy | All branches; no employee binding required | All admin pages, previews, configuration; verify audit identity and owner-only operations | Disable/delete synthetic account and sessions |
| `<ACCOUNT_MANAGER_BR1>` | Attendance/schedule operational view and approval; Booking availability operational/override permissions for BR1 | Payroll approval, user administration, BR2 access | BR1 only; optional manager staff binding | Schedule approval, attendance correction, override/conflict view; reject BR2 access | Remove scope and synthetic sessions |
| `<ACCOUNT_EMPLOYEE_BR1>` | Employee self attendance/schedule view | Payroll, branch config, conflict resolution, other staff access | BR1; bound to `<STAFF_BR1_EMPLOYEE>` | Self check-in/break/out and own schedule; deny another employee | Remove scope/binding and sessions |
| `<ACCOUNT_PAYROLL_ACCOUNTANT>` | Payroll view and preparation permissions | Payroll final approval, Booking override, branch config | Reviewed payroll branches; no employee binding | Prepare periods/adjustments; deny final approval and Booking operations | Remove scopes and generated draft data |
| `<ACCOUNT_PAYROLL_REVIEWER>` | Payroll view/review | Final approval unless policy grants it; Booking administration | Reviewed payroll branches | Review settlement evidence/stale flags; deny approval | Remove scopes and review artifacts |
| `<ACCOUNT_PAYROLL_APPROVER>` | Payroll view and explicit approval | User administration and unrelated Booking override | Approved payroll branches | Approval/rejection with evidence; deny out-of-scope branch | Remove scopes and approval test data |
| `<ACCOUNT_BOOKING_OPERATOR>` | Booking operational access and permitted Booking actions | Payroll, attendance adjustment, branch registry owner operations | BR1 and/or BR2 as declared | Accept/propose/cancel Booking; deny payroll and owner configuration | Remove scope and synthetic bookings |
| `<ACCOUNT_PAYROLL_ONLY>` | `payroll_attendance.view` only | All Booking Availability, attendance mutation, schedule admin permissions | One reviewed branch or payroll scope | Post-login routing to Payroll; verify no Login loop and deny Availability | Remove permission/sessions |
| `<ACCOUNT_AVAILABILITY_ONLY>` | `booking_availability.view` only | Payroll, conflict resolution, override, attendance mutation | One reviewed branch | Post-login routing to Availability; view-only restrictions and cross-branch denial | Remove permission/sessions |
| `<PUBLIC_BOOKING_CUSTOMER>` | None; public Booking surface only | Every internal permission and internal fields | Public-selectable branch only; no employee binding | Public branch/staff/slot visibility and Booking tracking; deny inactive/private branch and internal closure reason | Cancel/remove synthetic Booking and customer reference |

Every negative test must confirm both UI denial and authoritative backend denial. Cleanup must preserve audit evidence required by the test plan and remove only synthetic records under an approved Staging cleanup procedure.
