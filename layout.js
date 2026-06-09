(function () {
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
    filterPermissionLinks
  };
})();
