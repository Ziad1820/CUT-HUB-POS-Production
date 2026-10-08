const TIME_ZONE = "Africa/Cairo";

const ALL_PERMISSIONS = [
  "access_dashboard",
  "access_cashier",
  "edit_prices",
  "view_invoices",
  "view_income_statement",
  "view_daily_closing",
  "view_data_analysis",
  "view_activity_log",
  "view_staff_accounting",
  "view_withdrawals",
  "view_expenses",
  "view_inventory",
  "view_staff_discount",
  "view_attendance",
  "attendance.view",
  "attendance.self_action",
  "attendance.manage",
  "attendance.correct",
  "attendance.approve_adjustment",
  "attendance.approve_overtime",
  "schedule.view",
  "schedule.manage",
  "leave.request",
  "leave.approve",
  "payroll_attendance.view",
  "payroll_attendance.calculate",
  "payroll_attendance.review",
  "payroll_attendance.approve",
  "payroll_attendance.lock",
  "payroll_attendance.reopen",
  "payroll_attendance.adjust",
  "payroll_attendance.export",
  "view_bookings",
  "create_bookings",
  "manage_bookings",
  "delete_bookings",
  "booking_availability.view",
  "booking_availability.view_operational",
  "booking_availability.view_restrictions",
  "booking_availability.manage_override",
  "booking_availability.resolve_conflict",
  "booking_availability.override_internal",
  "booking_availability.view_audit",
  "view_ratings",
  "manage_ratings",
  "manage_users"
];

const SESSION_TTL_SECONDS = 12 * 60 * 60;
const SESSION_CACHE_MAX_SECONDS = 6 * 60 * 60;
const SESSION_CACHE_PREFIX = "romeo-session-";
const AUTH01_RESOLVED_SESSION_TARGETS = new WeakSet();
const AUTH01_AUTHENTICATED_SESSION_CONTEXTS = new WeakSet();

