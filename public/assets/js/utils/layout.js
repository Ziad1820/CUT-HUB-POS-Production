(function (root, factory) {
  const api = factory(root);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.RomeoLayout = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const SIDEBAR_PERMISSIONS = Object.freeze({
    "dashboard.html": "access_dashboard",
    "cashier.html": "access_cashier",
    "invoices.html": "view_invoices",
    "income-statement.html": "view_income_statement",
    "data-analysis.html": "view_data_analysis",
    "daily-closing.html": "view_daily_closing",
    "activity-log.html": "view_activity_log",
    "staff-accounting.html": "view_staff_accounting",
    "system-access.html": "manage_users",
    "withdrawals.html": "view_withdrawals",
    "expenses.html": "view_expenses",
    "enventory.html": "view_inventory",
    "attendance.html": "attendance.view",
    "schedule-management.html": "schedule.view",
    "payroll-attendance.html": "payroll_attendance.view",
    "bookings.html": "view_bookings",
    "booking-availability-admin.html": "booking_availability.view"
  });

  const NAVIGATION_ITEMS = Object.freeze([
    { href: "dashboard.html", permission: "access_dashboard", ar: "لوحة التحكم", en: "Dashboard" },
    { href: "cashier.html", permission: "access_cashier", ar: "الكاشير", en: "Cashier" },
    { href: "invoices.html", permission: "view_invoices", ar: "الفواتير", en: "Invoices" },
    { href: "income-statement.html", permission: "view_income_statement", ar: "قائمة الدخل", en: "Income Statement" },
    { href: "data-analysis.html", permission: "view_data_analysis", ar: "تحليل البيانات", en: "Data Analysis" },
    { href: "daily-closing.html", permission: "view_daily_closing", ar: "تقفيلة اليوم", en: "Daily Closing" },
    { href: "activity-log.html", permission: "view_activity_log", ar: "سجل العمليات", en: "Activity Log" },
    { href: "staff-accounting.html", permission: "view_staff_accounting", ar: "حسابات الموظفين", en: "Staff Accounting" },
    { href: "system-access.html", permission: "manage_users", ar: "صلاحيات النظام", en: "System Access" },
    { href: "withdrawals.html", permission: "view_withdrawals", ar: "السحوبات", en: "Withdrawals" },
    { href: "expenses.html", permission: "view_expenses", ar: "المصروفات", en: "Expenses" },
    { href: "enventory.html", permission: "view_inventory", ar: "المخزون", en: "Inventory" },
    { href: "attendance.html", permission: "attendance.view", ar: "الحضور", en: "Attendance" },
    { href: "schedule-management.html", permission: "schedule.view", ar: "جداول الموظفين", en: "Staff Scheduling" },
    { href: "payroll-attendance.html", permission: "payroll_attendance.view", ar: "تسويات الحضور", en: "Attendance Settlements" },
    { href: "bookings.html", permission: "view_bookings", ar: "الحجوزات", en: "Bookings" },
    { href: "booking-availability-admin.html", permission: "booking_availability.view", ar: "إتاحة الحجوزات", en: "Booking Availability" }
  ]);

  function normalizeLanguage(value) {
    return value === "en" ? "en" : "ar";
  }

  function currentPage(pathname) {
    return String(pathname || "").split("/").pop() || "dashboard.html";
  }

  function buildNavigation(options) {
    const input = options && typeof options === "object" ? options : {};
    const language = normalizeLanguage(input.language);
    const page = currentPage(input.pathname || input.currentPage);
    const hasPermission = typeof input.hasPermission === "function"
      ? input.hasPermission
      : () => false;
    return NAVIGATION_ITEMS
      .filter(item => hasPermission(item.permission) === true)
      .map(item => ({
        href: item.href,
        permission: item.permission,
        label: item[language],
        active: item.href === page
      }));
  }

  function getLanguage() {
    if (!root || !root.localStorage) return "ar";
    return normalizeLanguage(root.localStorage.getItem("romeo-pos-language"));
  }

  function authHasPermission(permission) {
    return Boolean(root && root.RomeoAuth &&
      typeof root.RomeoAuth.hasPermission === "function" &&
      root.RomeoAuth.hasPermission(permission));
  }

  function protectCurrentPage() {
    if (!root || !root.document || !root.RomeoAuth ||
        typeof root.RomeoAuth.requireAuth !== "function") return;
    const page = currentPage(root.location && root.location.pathname);
    const item = NAVIGATION_ITEMS.find(candidate => candidate.href === page);
    if (item) root.RomeoAuth.requireAuth(item.permission);
  }

  function ensureSidebarShell(sidebar) {
    let heading = sidebar.querySelector("h3");
    if (!heading) {
      heading = root.document.createElement("h3");
      sidebar.prepend(heading);
    }
    heading.textContent = getLanguage() === "en" ? "Menu" : "القائمة";

    Array.from(sidebar.children).forEach(child => {
      if (child.classList && child.classList.contains("sidebar-link")) child.remove();
    });

    let navigation = sidebar.querySelector("[data-system-navigation]");
    if (!navigation) {
      navigation = root.document.createElement("nav");
      navigation.className = "system-navigation";
      navigation.dataset.systemNavigation = "true";
      navigation.setAttribute("aria-label", getLanguage() === "en" ? "System navigation" : "التنقل في النظام");
      heading.insertAdjacentElement("afterend", navigation);
    }

    let logoutButton = sidebar.querySelector("#logoutBtn");
    if (!logoutButton) {
      logoutButton = root.document.createElement("button");
      logoutButton.type = "button";
      logoutButton.id = "logoutBtn";
      sidebar.appendChild(logoutButton);
    }
    logoutButton.textContent = getLanguage() === "en" ? "Logout" : "تسجيل الخروج";
    return navigation;
  }

  function renderNavigation() {
    if (!root || !root.document) return [];
    const sidebar = root.document.getElementById("sidebar");
    if (!sidebar) return [];
    const navigation = ensureSidebarShell(sidebar);
    const items = buildNavigation({
      language: getLanguage(),
      pathname: root.location && root.location.pathname,
      hasPermission: authHasPermission
    });
    navigation.replaceChildren();
    items.forEach(item => {
      const button = root.document.createElement("button");
      button.type = "button";
      button.className = `sidebar-link${item.active ? " active" : ""}`;
      button.dataset.href = item.href;
      button.dataset.permission = item.permission;
      button.textContent = item.label;
      if (item.active) button.setAttribute("aria-current", "page");
      navigation.appendChild(button);
    });
    return items;
  }

  function filterPermissionLinks() {
    return renderNavigation();
  }

  function normalizeSidebarOrder() {
    return renderNavigation();
  }

  function initSidebar() {
    if (!root || !root.document) return;
    protectCurrentPage();
    const menuToggle = root.document.getElementById("menuToggle");
    const sidebar = root.document.getElementById("sidebar");
    const sidebarOverlay = root.document.getElementById("sidebarOverlay");
    renderNavigation();
    if (!menuToggle || !sidebar || !sidebarOverlay || sidebar.dataset.layoutReady === "true") return;

    sidebar.dataset.layoutReady = "true";
    const closeSidebar = () => {
      sidebar.classList.remove("active");
      sidebarOverlay.classList.remove("active");
      menuToggle.setAttribute("aria-expanded", "false");
    };
    const openSidebar = () => {
      sidebar.scrollTop = 0;
      sidebar.classList.add("active");
      sidebarOverlay.classList.add("active");
      menuToggle.setAttribute("aria-expanded", "true");
    };
    menuToggle.setAttribute("aria-controls", "sidebar");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.addEventListener("click", openSidebar);
    sidebarOverlay.addEventListener("click", closeSidebar);
    sidebar.addEventListener("click", event => {
      const link = event.target.closest(".sidebar-link[data-href]");
      if (!link) return;
      closeSidebar();
      root.location.href = link.dataset.href;
    });

    const logoutButton = sidebar.querySelector("#logoutBtn");
    if (logoutButton) logoutButton.addEventListener("click", async event => {
      event.preventDefault();
      event.stopPropagation();
      if (root.RomeoAuth && typeof root.RomeoAuth.logout === "function") {
        if (logoutButton.disabled) return;
        logoutButton.disabled = true;
        logoutButton.setAttribute("aria-busy", "true");
        let result = null;
        try {
          result = await root.RomeoAuth.logout();
        } catch (error) {
          if (typeof root.alert === "function") {
            root.alert("تعذر تأكيد تسجيل الخروج من الخادم. يرجى المحاولة مرة أخرى.");
          }
        }
        if (!result || (result.success !== true && result.inProgress !== true)) {
          logoutButton.disabled = false;
          logoutButton.setAttribute("aria-busy", "false");
        }
        return;
      }
      if (typeof root.alert === "function") {
        root.alert("تعذر تأكيد تسجيل الخروج من الخادم. يرجى المحاولة مرة أخرى.");
      }
    });
    root.document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeSidebar();
    });
    root.addEventListener("romeo-language-change", renderNavigation);
  }

  if (root && root.document) {
    root.document.addEventListener("DOMContentLoaded", initSidebar);
  }

  return Object.freeze({
    NAVIGATION_ITEMS,
    SIDEBAR_PERMISSIONS,
    buildNavigation,
    currentPage,
    initSidebar,
    renderNavigation,
    filterPermissionLinks,
    normalizeSidebarOrder
  });
});
