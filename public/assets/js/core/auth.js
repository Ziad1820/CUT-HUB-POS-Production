const RomeoAuth = (() => {
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

  const DEFAULT_OWNER = {
    username: "owner",
    displayName: "مالك النظام",
    permissions: [...ALL_PERMISSIONS]
  };

  let usersCache = null;
  let loginInProgress = false;
  let loginCompleted = false;
  let logoutInProgress = false;
  let logoutCompleted = false;
  const initializedLoginForms = new WeakSet();

  function createAuthRequestId(action) {
    const prefix = String(action || "auth").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 16) || "auth";
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return `${prefix}-${window.crypto.randomUUID()}`;
    }
    const random = Math.random().toString(36).slice(2);
    return `${prefix}-${Date.now().toString(36)}-${random}`.slice(0, 128);
  }

  function emitAuthObservation(action, phase, authRequestId, details = {}) {
    if (typeof window.dispatchEvent !== "function" || typeof window.CustomEvent !== "function") return;
    const safeDetails = {
      action: String(action || ""),
      phase: String(phase || ""),
      authRequestId: String(authRequestId || ""),
      success: details.success === true,
      revoked: details.revoked === true,
      clientCleanupAllowed: details.clientCleanupAllowed === true,
      serverConfirmedRevocation: details.serverConfirmedRevocation === true,
      blocked: details.blocked === true
    };
    window.dispatchEvent(new window.CustomEvent("romeo-auth-observation", { detail: safeDetails }));
  }

  async function apiRequest(payload) {
    if (!window.RomeoApi || typeof RomeoApi.request !== "function") {
      throw new Error("The application API endpoint is not configured.");
    }
    return RomeoApi.request(payload);
  }

  function isOwnerUser(user) {
    return String(user && user.username || "").trim().toLowerCase() === OWNER_USERNAME;
  }

  function normalizePermissions(value) {
    let permissions = [];
    if (Array.isArray(value)) {
      permissions = value;
    } else if (typeof value === "string") {
      const serialized = value.trim();
      if (serialized.startsWith("[")) {
        try {
          const parsed = JSON.parse(serialized);
          permissions = Array.isArray(parsed) ? parsed : [];
        } catch (_error) {
          permissions = serialized.split(",");
        }
      } else {
        permissions = serialized.split(",");
      }
    }

    return [...new Set(permissions
      .filter(permission => typeof permission === "string")
      .map(permission => permission.trim())
      .filter(Boolean))];
  }

  function normalizeUser(user) {
    const normalized = {
      username: String(user.username || "").trim(),
      displayName: String(user.displayName || user.username || "").trim(),
      permissions: normalizePermissions(user.permissions)
    };

    if (isOwnerUser(normalized)) {
      normalized.permissions = [...ALL_PERMISSIONS];
    } else {
      normalized.permissions = normalized.permissions.filter(permission => permission !== "manage_users");
      if (normalized.permissions.includes("view_attendance") &&
          !normalized.permissions.includes("attendance.view")) {
        normalized.permissions.push("attendance.view");
      }
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
    if (loginInProgress || loginCompleted) {
      return {
        success: false,
        blocked: true,
        inProgress: loginInProgress,
        message: "تسجيل الدخول قيد التنفيذ بالفعل."
      };
    }
    loginInProgress = true;
    const authRequestId = createAuthRequestId("login");
    emitAuthObservation("login", "request-start", authRequestId);
    try {
      const result = await apiRequest({
        action: "loginUser",
        authRequestId,
        username: String(username || "").trim(),
        password: String(password || "")
      });

      if (result.status !== "success" || !result.user) {
        emitAuthObservation("login", "response", authRequestId, { success: false });
        return {
          success: false,
          message: result.message || "اسم المستخدم أو كلمة المرور غير صحيحة."
        };
      }
      if (result.authRequestId !== authRequestId || result.sessionCreated !== true) {
        emitAuthObservation("login", "correlation-failed", authRequestId, { success: false });
        return { success: false, message: "تعذر التحقق من استجابة تسجيل الدخول." };
      }

      saveSession(result.user, result.sessionToken || result.token);
      loginCompleted = true;
      emitAuthObservation("login", "response", authRequestId, { success: true });
      return { success: true, user: normalizeUser(result.user), authRequestId };
    } catch (error) {
      emitAuthObservation("login", "transport-failed", authRequestId, { success: false });
      return { success: false, message: error.message };
    } finally {
      loginInProgress = false;
    }
  }

  function initializeLoginPage(options = {}) {
    const form = options.form || window.document?.getElementById("loginForm");
    if (!form || initializedLoginForms.has(form) || form.dataset?.authLoginReady === "true") return false;
    initializedLoginForms.add(form);
    if (form.dataset) form.dataset.authLoginReady = "true";
    const statusBox = options.statusBox || window.document?.getElementById("statusBox");
    const splash = options.splash || window.document?.getElementById("loginSplash");
    const submitButton = options.submitButton || form.querySelector?.('[type="submit"]');
    const usernameInput = options.usernameInput || window.document?.getElementById("username");
    const passwordInput = options.passwordInput || window.document?.getElementById("password");
    const navigate = typeof options.navigate === "function"
      ? options.navigate
      : target => { window.location.href = target; };
    const schedule = typeof options.schedule === "function" ? options.schedule : window.setTimeout.bind(window);
    let pageLoginInFlight = false;
    let navigationScheduled = false;

    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (pageLoginInFlight || navigationScheduled) return;
      pageLoginInFlight = true;
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.setAttribute?.("aria-busy", "true");
      }
      if (statusBox) {
        statusBox.textContent = "جاري تسجيل الدخول...";
        statusBox.className = "status";
      }

      const result = await login(usernameInput?.value?.trim() || "", passwordInput?.value || "");
      if (!result.success) {
        if (statusBox) {
          statusBox.textContent = result.message;
          statusBox.className = "status error";
        }
        pageLoginInFlight = false;
        if (submitButton && !result.inProgress) {
          submitButton.disabled = false;
          submitButton.setAttribute?.("aria-busy", "false");
        }
        return;
      }

      navigationScheduled = true;
      splash?.classList?.add("active");
      schedule(() => navigate(getReturnTo()), 1000);
    });
    return true;
  }

  function finishLogout(authRequestId) {
    const cleanup = {
      success: true,
      revoked: false,
      clientCleanupAllowed: true,
      serverConfirmedRevocation: false
    };
    emitAuthObservation("logout", "local-clear-start", authRequestId, cleanup);
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    emitAuthObservation("logout", "local-clear-complete", authRequestId, cleanup);
    emitAuthObservation("logout", "redirect", authRequestId, cleanup);
    window.location.replace("login.html");
  }

  const LOGOUT_FAILURE_MESSAGE = "تعذر تأكيد تسجيل الخروج من الخادم. يرجى المحاولة مرة أخرى.";

  function logoutFailureResult(options = {}) {
    const result = {
      success: false,
      revoked: false,
      message: LOGOUT_FAILURE_MESSAGE
    };
    if (options.inProgress) result.inProgress = true;
    if (!options.silent && typeof window.alert === "function") {
      window.alert(LOGOUT_FAILURE_MESSAGE);
    }
    return result;
  }

  async function logout() {
    if (logoutInProgress || logoutCompleted) {
      return logoutFailureResult({ inProgress: logoutInProgress, silent: true });
    }
    logoutInProgress = true;
    const authRequestId = createAuthRequestId("logout");

    if (!window.RomeoApi || typeof RomeoApi.request !== "function") {
      logoutInProgress = false;
      return logoutFailureResult();
    }

    try {
      emitAuthObservation("logout", "request-start", authRequestId);
      const result = await RomeoApi.request({
        action: "logoutUser",
        authRequestId
      });

      if (!result || result.status !== "success" || result.logoutAccepted !== true ||
          result.clientCleanupAllowed !== true ||
          result.authRequestId !== authRequestId) {
        emitAuthObservation("logout", "response", authRequestId, { success: false, revoked: false });
        return logoutFailureResult();
      }

      emitAuthObservation("logout", "response", authRequestId, {
        success: true,
        revoked: false,
        clientCleanupAllowed: true,
        serverConfirmedRevocation: false
      });
      finishLogout(authRequestId);
      logoutCompleted = true;
      return {
        success: true,
        revoked: false,
        clientCleanupAllowed: true,
        serverConfirmedRevocation: false,
        authRequestId,
      };
    } catch (error) {
      console.warn("Logout failed; authoritative revocation was not confirmed.");
      emitAuthObservation("logout", "transport-failed", authRequestId, { success: false, revoked: false });
      return logoutFailureResult();
    } finally {
      logoutInProgress = false;
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
      ["view_data_analysis", "data-analysis.html"],
      ["view_activity_log", "activity-log.html"],
      ["view_staff_accounting", "staff-accounting.html"],
      ["view_staff_discount", "staff-discount.html"],
      ["manage_users", "system-access.html"],
      ["view_withdrawals", "withdrawals.html"],
      ["view_expenses", "expenses.html"],
      ["view_inventory", "enventory.html"],
      ["attendance.view", "attendance.html"],
      ["view_attendance", "attendance.html"],
      ["schedule.view", "schedule-management.html"],
      ["payroll_attendance.view", "payroll-attendance.html"],
      ["view_bookings", "bookings.html"],
      ["booking_availability.view", "booking-availability-admin.html"]
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
    initializeLoginPage,
    isOwnerUser,
    login,
    logout,
    requireAuth,
    requireOwner,
    updateUser
  };
})();

if (typeof window !== "undefined") {
  window.RomeoAuth = RomeoAuth;
}
