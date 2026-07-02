(function () {
  const SIDEBAR_ORDER = [
    "dashboard.html",
    "index.html",
    "invoices.html",
    "income-statement.html",
    "data-analysis.html",
    "daily-closing.html",
    "activity-log.html",
    "staff-accounting.html",
    "system-access.html",
    "withdrawals.html",
    "expenses.html",
    "enventory.html",
    "staff-discount.html",
    "attendance.html",
    "bookings.html",
    "language",
    "logout"
  ];

  const SIDEBAR_PERMISSIONS = {
    "dashboard.html": "access_cashier",
    "index.html": "access_cashier",
    "invoices.html": "view_invoices",
    "income-statement.html": "view_income_statement",
    "daily-closing.html": "view_daily_closing",
    "data-analysis.html": "view_data_analysis",
    "activity-log.html": "view_activity_log",
    "staff-accounting.html": "view_staff_accounting",
    "system-access.html": "manage_users",
    "withdrawals.html": "view_withdrawals",
    "expenses.html": "view_expenses",
    "enventory.html": "view_inventory",
    "staff-discount.html": "view_staff_discount",
    "attendance.html": "view_attendance",
    "bookings.html": "view_bookings"
  };

  function getSidebarItemKey(item) {
    const href = String(item.dataset.href || "").trim();
    if (href) return href;

    if (item.classList.contains("active")) {
      const currentPage = window.location.pathname.split("/").pop() || "index.html";
      return currentPage;
    }

    const text = String(item.textContent || "").trim().toLowerCase();
    if (text.includes("dashboard") || text.includes("لوحة التحكم")) return "dashboard.html";
    if (text.includes("cashier") || text.includes("الكاشير")) return "index.html";
    if (text.includes("invoice") || text.includes("الفواتير")) return "invoices.html";
    if (text.includes("income statement") || text.includes("قائمة الدخل")) return "income-statement.html";
    if (text.includes("data analysis") || text.includes("تحليل البيانات")) return "data-analysis.html";
    if (text.includes("daily closing") || text.includes("تقفيلة اليوم")) return "daily-closing.html";
    if (text.includes("activity log") || text.includes("سجل العمليات")) return "activity-log.html";
    if (text.includes("staff accounting") || text.includes("حسابات الموظفين")) return "staff-accounting.html";
    if (text.includes("system access") || text.includes("صلاحيات النظام")) return "system-access.html";
    if (text.includes("withdrawal") || text.includes("السحوبات")) return "withdrawals.html";
    if (text.includes("expense") || text.includes("المصروفات")) return "expenses.html";
    if (text.includes("inventory") || text.includes("enventory") || text.includes("المخزون")) return "enventory.html";
    if (text.includes("staff discount") || text.includes("خصومات الموظفين")) return "staff-discount.html";
    if (text.includes("attendance") || text.includes("الحضور")) return "attendance.html";
    if (text.includes("booking") || text.includes("الحجوزات")) return "bookings.html";
    if (text.includes("logout") || text.includes("تسجيل الخروج")) return "logout";
    if (text.includes("language") || text.includes("اللغة")) return "language";

    return text;
  }

  function getLanguage() {
    return localStorage.getItem("romeo-pos-language") || "ar";
  }

  function getDashboardLabel() {
    return getLanguage() === "en" ? "Dashboard" : "لوحة التحكم";
  }

  function ensureDashboardLink() {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar || sidebar.querySelector('[data-href="dashboard.html"]')) return;

    const link = document.createElement("button");
    link.type = "button";
    link.className = "sidebar-link";
    link.dataset.href = "dashboard.html";
    link.dataset.permission = SIDEBAR_PERMISSIONS["dashboard.html"];
    link.textContent = getDashboardLabel();

    const firstLink = sidebar.querySelector(".sidebar-link, #logoutBtn");
    if (firstLink) {
      sidebar.insertBefore(link, firstLink);
    } else {
      sidebar.appendChild(link);
    }
  }

  function normalizeSidebarOrder() {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;

    const items = Array.from(sidebar.querySelectorAll(".sidebar-link, #logoutBtn"));
    if (!items.length) return;

    const orderMap = new Map(SIDEBAR_ORDER.map((key, index) => [key, index]));
    const sorted = items
      .map((item, index) => ({ item, index, order: orderMap.get(getSidebarItemKey(item)) ?? 999 }))
      .sort((a, b) => a.order - b.order || a.index - b.index);

    sorted.forEach(({ item }) => sidebar.appendChild(item));
  }

  function filterPermissionLinks() {
    if (!window.RomeoAuth || typeof RomeoAuth.hasPermission !== "function") return;

    document.querySelectorAll(".sidebar-link").forEach(link => {
      const key = getSidebarItemKey(link);
      const permission = link.dataset.permission || SIDEBAR_PERMISSIONS[key] || "";

      if (permission) {
        link.dataset.permission = permission;
      }

      if (permission && !RomeoAuth.hasPermission(permission)) {
        link.style.display = "none";
      } else {
        link.style.display = "";
      }
    });
  }

  function protectCurrentPage() {
    if (!window.RomeoAuth || typeof RomeoAuth.requireAuth !== "function") return;

    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    const permission = SIDEBAR_PERMISSIONS[currentPage];

    if (permission) {
      RomeoAuth.requireAuth(permission);
    }
  }

  function initSidebar() {
    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");

    protectCurrentPage();
    ensureDashboardLink();
    normalizeSidebarOrder();

    if (!menuToggle || !sidebar || !sidebarOverlay || sidebar.dataset.layoutReady === "true") {
      filterPermissionLinks();
      return;
    }

    sidebar.dataset.layoutReady = "true";

    const openSidebar = () => {
      sidebar.scrollTop = 0;
      sidebar.classList.add("active");
      sidebarOverlay.classList.add("active");
    };

    const closeSidebar = () => {
      sidebar.classList.remove("active");
      sidebarOverlay.classList.remove("active");
    };

    menuToggle.addEventListener("click", openSidebar);
    sidebarOverlay.addEventListener("click", closeSidebar);

    document.querySelectorAll(".sidebar-link[data-href]").forEach(link => {
      link.addEventListener("click", () => {
        window.location.href = link.dataset.href;
      });
    });

    document.querySelectorAll("#logoutBtn").forEach(logoutButton => {
      if (logoutButton.dataset.logoutReady === "true") return;
      logoutButton.dataset.logoutReady = "true";
      logoutButton.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();

        if (window.RomeoAuth && typeof RomeoAuth.logout === "function") {
          RomeoAuth.logout();
          return;
        }

        localStorage.removeItem("romeo-pos-session");
        window.location.href = "login.html";
      });
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeSidebar();
    });

    filterPermissionLinks();
  }

  document.addEventListener("DOMContentLoaded", initSidebar);

  window.RomeoLayout = {
    initSidebar,
    filterPermissionLinks,
    normalizeSidebarOrder
  };
})();
