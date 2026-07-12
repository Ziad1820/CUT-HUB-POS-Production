const RomeoAuth = (() => {
  const API_URL = window.RomeoApi ? RomeoApi.API_URL : "https://script.google.com/macros/s/AKfycbwTdBU-WyeaTSpdtgwviYId_2grOdCmTuA8ZapJHRl7YHrDXg4Bt9OaJfVWSe0YfHXY/exec";
  const SESSION_KEY = "romeo-pos-session";
  const OWNER_USERNAME = "owner";
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

    const requestPayload = { ...(payload || {}) };
    const sessionToken = getSessionToken();
    if (sessionToken && !requestPayload.sessionToken) {
      requestPayload.sessionToken = sessionToken;
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(requestPayload)
    });

    if (!response.ok) {
      throw new Error("تعذر الاتصال بقاعدة بيانات المستخدمين.");
    }

    return response.json();
  }

  function isOwnerUser(user) {
    return String(user && user.username || "").trim().toLowerCase() === OWNER_USERNAME;
  }

  function normalizeUser(user) {
    const normalized = {
      username: String(user.username || "").trim(),
      displayName: String(user.displayName || user.username || "").trim(),
      permissions: Array.isArray(user.permissions) ? user.permissions : []
    };

    if (isOwnerUser(normalized)) {
      normalized.permissions = [...ALL_PERMISSIONS];
    } else {
      normalized.permissions = normalized.permissions.filter(permission => permission !== "manage_users");
    }

    return normalized;
  }

  function getCurrentSession() {
    localStorage.removeItem(SESSION_KEY);
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    try {
      const session = JSON.parse(stored);
      if (!session || !session.user || !session.sessionToken) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }

      return session;
    } catch (error) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  function saveSession(user, sessionToken) {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      user: normalizeUser(user),
      sessionToken: String(sessionToken || "").trim()
    }));
  }

  function getCurrentUser() {
    const session = getCurrentSession();
    return session && session.user ? normalizeUser(session.user) : null;
  }

  function getSessionToken() {
    const session = getCurrentSession();
    return session && session.sessionToken ? String(session.sessionToken).trim() : "";
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

      saveSession(result.user, result.sessionToken || result.token);
      return { success: true, user: normalizeUser(result.user) };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  function finishLogout() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    window.location.replace("login.html");
  }

  let logoutInProgress = false;

  async function logout() {
    if (logoutInProgress) return;
    logoutInProgress = true;

    const sessionToken = getSessionToken();
    finishLogout();

    if (!sessionToken || !window.RomeoApi || typeof RomeoApi.request !== "function") {
      return;
    }

    try {
      await RomeoApi.request({
        action: "logoutUser",
        sessionToken
      });
    } catch (error) {
      console.warn("Logout activity log failed:", error);
    }
  }

  function hasPermission(permission) {
    const user = getCurrentUser();
    return !!user && user.permissions.includes(permission);
  }

  function requireOwner() {
    const user = requireAuth();
    if (!user) return null;

    if (!isOwnerUser(user)) {
      alert("هذه الصفحة متاحة لمالك النظام الأساسي فقط.");
      window.location.href = getFirstAllowedPage(user);
      return null;
    }

    return user;
  }

  function getFirstAllowedPage(user) {
    const permissionPages = [
      ["access_dashboard", "dashboard.html"],
      ["access_cashier", "cashier.html"],
      ["view_invoices", "invoices.html"],
      ["view_income_statement", "income-statement.html"],
      ["view_daily_closing", "daily-closing.html"],
      ["view_activity_log", "activity-log.html"],
      ["view_staff_accounting", "staff-accounting.html"],
      ["manage_users", "system-access.html"],
      ["view_withdrawals", "withdrawals.html"],
      ["view_expenses", "expenses.html"],
      ["view_inventory", "enventory.html"],
      ["view_attendance", "attendance.html"],
      ["view_bookings", "bookings.html"]
    ];

    const match = permissionPages.find(([permission]) => user.permissions.includes(permission));
    return match ? match[1] : "login.html";
  }

  function requireAuth(permission) {
    const user = getCurrentUser();
    if (!user) {
      const currentPage = encodeURIComponent(window.location.pathname.split("/").pop() || "dashboard.html");
      window.location.href = `login.html?returnTo=${currentPage}`;
      return null;
    }

    if (permission && !user.permissions.includes(permission)) {
      alert("ليس لديك صلاحية لفتح هذه الصفحة.");
      window.location.href = getFirstAllowedPage(user);
      return null;
    }

    return user;
  }

  function getReturnTo() {
    const params = new URLSearchParams(window.location.search);
    return params.get("returnTo") || "dashboard.html";
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
      const currentUser = getCurrentUser();
      if (!isOwnerUser(currentUser)) {
        return { success: false, message: "Only the system owner can manage users." };
      }

      const result = await apiRequest({
        action: "createUser",
        displayName: String(userInput.displayName || "").trim(),
        username: String(userInput.username || "").trim(),
        password: String(userInput.password || ""),
        permissions: Array.isArray(userInput.permissions)
          ? userInput.permissions.filter(permission => permission !== "manage_users")
          : []
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
      const currentUser = getCurrentUser();
      if (!isOwnerUser(currentUser)) {
        return { success: false, message: "Only the system owner can manage users." };
      }

      const result = await apiRequest({
        action: "updateUser",
        username: String(username || "").trim(),
        displayName: String(updates.displayName || "").trim(),
        password: String(updates.password || ""),
        permissions: Array.isArray(updates.permissions)
          ? updates.permissions.filter(permission => permission !== "manage_users")
          : []
      });

      if (result.status !== "success") {
        return { success: false, message: result.message || "تعذر تعديل المستخدم." };
      }

      usersCache = null;

      if (currentUser && currentUser.username === username) {
        saveSession(result.user, getSessionToken());
      }

      return { success: true, user: normalizeUser(result.user) };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async function deleteUser(username) {
    const currentUser = getCurrentUser();
    if (!isOwnerUser(currentUser)) {
      return { success: false, message: "Only the system owner can manage users." };
    }

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
    getSessionToken,
    getReturnTo,
    getUsers,
    hasPermission,
    isOwnerUser,
    login,
    logout,
    requireAuth,
    requireOwner,
    updateUser
  };
})();
