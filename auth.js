const RomeoAuth = (() => {
  const API_URL = window.RomeoApi ? RomeoApi.API_URL : "https://script.google.com/macros/s/AKfycbwcR2YBF-tiaMXx8NQLdkvzmJQupO2Vj4f4VXU1F8UH4gZKjoGO-0MvVBiGhixJMebk/exec";
  const SESSION_KEY = "romeo-pos-session";
  const ALL_PERMISSIONS = [
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
    "view_bookings",
    "manage_users"
  ];

  const DEFAULT_OWNER = {
    username: "owner",
    displayName: "مالك النظام",
    permissions: [...ALL_PERMISSIONS]
  };

  let usersCache = null;

  async function apiRequest(payload) {
    if (window.RomeoApi && typeof RomeoApi.request === "function") {
      return RomeoApi.request(payload);
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("تعذر الاتصال بقاعدة بيانات المستخدمين.");
    }

    return response.json();
  }

  function normalizeUser(user) {
    const normalized = {
      username: String(user.username || "").trim(),
      displayName: String(user.displayName || user.username || "").trim(),
      permissions: Array.isArray(user.permissions) ? user.permissions : []
    };

    if (normalized.username === "owner") {
      normalized.permissions = [...ALL_PERMISSIONS];
    }

    return normalized;
  }

  function getCurrentSession() {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    try {
      return JSON.parse(stored);
    } catch (error) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  function saveSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user: normalizeUser(user) }));
  }

  function getCurrentUser() {
    const session = getCurrentSession();
    return session && session.user ? normalizeUser(session.user) : null;
  }

  async function login(username, password) {
    try {
      const result = await apiRequest({
        action: "loginUser",
        username: String(username || "").trim(),
        password: String(password || "")
      });

      if (result.status !== "success" || !result.user) {
        return {
          success: false,
          message: result.message || "اسم المستخدم أو كلمة المرور غير صحيحة."
        };
      }

      saveSession(result.user);
      return { success: true, user: normalizeUser(result.user) };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  function finishLogout() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.clear();
    window.location.href = "login.html";
  }

  let logoutInProgress = false;

  async function logout() {
    if (logoutInProgress) return;
    logoutInProgress = true;

    const currentUser = getCurrentUser();

    if (!currentUser || !window.RomeoApi || typeof RomeoApi.request !== "function") {
      finishLogout();
      return;
    }

    try {
      await RomeoApi.request({
        action: "logoutUser",
        currentUser,
        actor: currentUser,
        actorUserName: currentUser.username,
        actorDisplayName: currentUser.displayName
      });
    } catch (error) {
      console.warn("Logout activity log failed:", error);
    } finally {
      finishLogout();
    }
  }

  function hasPermission(permission) {
    const user = getCurrentUser();
    return !!user && user.permissions.includes(permission);
  }

  function requireAuth(permission) {
    const user = getCurrentUser();
    if (!user) {
      const currentPage = encodeURIComponent(window.location.pathname.split("/").pop() || "index.html");
      window.location.href = `login.html?returnTo=${currentPage}`;
      return null;
    }

    if (permission && !user.permissions.includes(permission)) {
      alert("ليس لديك صلاحية لفتح هذه الصفحة.");
      window.location.href = "index.html";
      return null;
    }

    return user;
  }

  function getReturnTo() {
    const params = new URLSearchParams(window.location.search);
    return params.get("returnTo") || "index.html";
  }

  async function getUsers(options = {}) {
    if (usersCache && !options.forceRefresh) {
      return usersCache;
    }

    const result = await apiRequest({ action: "getUsers" });
    if (result.status !== "success") {
      throw new Error(result.message || "تعذر تحميل المستخدمين.");
    }

    usersCache = Array.isArray(result.users) ? result.users.map(normalizeUser) : [];
    return usersCache;
  }

  async function createUser(userInput) {
    try {
      const result = await apiRequest({
        action: "createUser",
        displayName: String(userInput.displayName || "").trim(),
        username: String(userInput.username || "").trim(),
        password: String(userInput.password || ""),
        permissions: Array.isArray(userInput.permissions) ? userInput.permissions : []
      });

      if (result.status !== "success") {
        return { success: false, message: result.message || "تعذر إضافة المستخدم." };
      }

      usersCache = null;
      return { success: true, user: normalizeUser(result.user) };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async function updateUser(username, updates) {
    try {
      const result = await apiRequest({
        action: "updateUser",
        username: String(username || "").trim(),
        displayName: String(updates.displayName || "").trim(),
        password: String(updates.password || ""),
        permissions: Array.isArray(updates.permissions) ? updates.permissions : []
      });

      if (result.status !== "success") {
        return { success: false, message: result.message || "تعذر تعديل المستخدم." };
      }

      usersCache = null;

      const currentUser = getCurrentUser();
      if (currentUser && currentUser.username === username) {
        saveSession(result.user);
      }

      return { success: true, user: normalizeUser(result.user) };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async function deleteUser(username) {
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.username === username) {
      return { success: false, message: "لا يمكنك حذف المستخدم الحالي." };
    }

    try {
      const result = await apiRequest({
        action: "deleteUser",
        username: String(username || "").trim()
      });

      if (result.status !== "success") {
        return { success: false, message: result.message || "تعذر حذف المستخدم." };
      }

      usersCache = null;
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  return {
    ALL_PERMISSIONS,
    DEFAULT_OWNER,
    createUser,
    deleteUser,
    getCurrentUser,
    getReturnTo,
    getUsers,
    hasPermission,
    login,
    logout,
    requireAuth,
    updateUser
  };
})();
