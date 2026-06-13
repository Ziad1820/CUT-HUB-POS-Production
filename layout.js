(function () {
  const SIDEBAR_ORDER = [
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

  function getSidebarItemKey(item) {
    const href = String(item.dataset.href || "").trim();
    if (href) return href;

    const text = String(item.textContent || "").trim().toLowerCase();
    if (text.includes("data analysis") || text.includes("تحليل البيانات")) return "data-analysis.html";
    if (text.includes("daily closing") || text.includes("تقفيلة اليوم")) return "daily-closing.html";
    if (text.includes("activity log") || text.includes("سجل العمليات")) return "activity-log.html";
    if (text.includes("logout") || text.includes("تسجيل الخروج")) return "logout";
    if (text.includes("language")) return "language";

    return text;
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

    document.querySelectorAll(".sidebar-link[data-permission]").forEach(link => {
      if (!RomeoAuth.hasPermission(link.dataset.permission)) {
        link.style.display = "none";
      }
    });
  }

  function initSidebar() {
    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");

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
