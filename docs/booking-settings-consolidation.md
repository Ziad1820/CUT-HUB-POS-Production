# Booking settings consolidation

The standalone Booking Availability page was removed on 2026-10-17 at the owner's request. Its branch configuration, branch opening hours, attendance integration control, operational overrides, conflicts, and audit views moved into a closed-by-default Booking Settings section inside the Bookings page.

The page-only HTML and old CSS/JS assets were deleted; old URLs permanently redirect to /pages/bookings.html?settings=1. Navigation and login fallbacks no longer link to the retired page. Users need the existing Bookings page permission to reach that page; the settings section additionally retains booking_availability.view, per-section permissions and owner-only mutations. No permissions are granted or persisted by this change. A legacy availability-only user has no new page access and follows the existing fail-closed login fallback.

Settings make no server requests until opened. Controls and busy state are scoped to the settings container, leaving booking drafts and save buttons untouched. Closing and reopening does not register duplicate handlers. Existing backend actions, branch checks, idempotency request IDs and financial/operational validation are unchanged. No Apps Script deployment or data migration is required. No attendance integration flag or other saved business setting was changed.

Developer-only migration/trigger previews and cache/quota diagnostics were removed from the product UI. Their backend routines and tests remain available for maintenance. Attendance, employee work policy schedules, booking availability calculations, cashier and staff accounting integrations are unchanged.

Verification covers lazy initialization, permission rejection without requests, preservation of controls outside settings, existing branch/hour/override feature tests, retired asset absence and redirect, plus the full repository suite. Live verification is read-only: opening settings, checking fields and menu; no settings are saved and no operational records are created.
