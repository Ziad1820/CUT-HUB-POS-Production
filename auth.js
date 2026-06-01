const RomeoAuth = (() => {
  const USERS_KEY = "romeo-pos-users";
  const SESSION_KEY = "romeo-pos-session";
  const ALL_PERMISSIONS = [
    "access_cashier",
    "edit_prices",
    "view_income_statement",
    "view_staff_accounting",
    "manage_users"
  ];

  const DEFAULT_OWNER = {
    username: "owner",
    password: "owner123",
    displayName: "مالك النظام",
    permissions: [...ALL_PERMISSIONS]
  };

  function ensureUsers() {
    const stored = localStorage.getItem(USERS_KEY);
    if (!stored) {
      localStorage.setItem(USERS_KEY, JSON.stringify([DEFAULT_OWNER]));
      return [DEFAULT_OWNER];
    }

    try {
      const users = JSON.parse(stored);
      if (!Array.isArray(users) || users.length === 0) {
        localStorage.setItem(USERS_KEY, JSON.stringify([DEFAULT_OWNER]));
        return [DEFAULT_OWNER];
      }

      const hasOwner = users.some(user => user.username === DEFAULT_OWNER.username);
      if (!hasOwner) {
        const mergedUsers = [DEFAULT_OWNER, ...users];
        localStorage.setItem(USERS_KEY, JSON.stringify(mergedUsers));
        return mergedUsers;
      }

      return users;
    } catch (error) {
      localStorage.setItem(USERS_KEY, JSON.stringify([DEFAULT_OWNER]));
      return [DEFAULT_OWNER];
    }
  }

  function getUsers() {
    return ensureUsers();
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function getCurrentSession() {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) {
      return null;
    }

    try {
      return JSON.parse(stored);
    } catch (error) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  function getCurrentUser() {
    const session = getCurrentSession();
    if (!session || !session.username) {
      return null;
    }

    return getUsers().find(user => user.username === session.username) || null;
  }

  function login(username, password) {
    const user = getUsers().find(item =>
      item.username === String(username || "").trim() &&
      item.password === String(password || "")
    );

    if (!user) {
      return { success: false, message: "اسم المستخدم أو كلمة المرور غير صحيحة." };
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify({ username: user.username }));
    return { success: true, user };
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "login.html";
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

  function createUser(userInput) {
    const users = getUsers();
    const username = String(userInput.username || "").trim();
    const password = String(userInput.password || "");
    const displayName = String(userInput.displayName || "").trim() || username;
    const permissions = Array.isArray(userInput.permissions) ? userInput.permissions : [];

    if (!username || !password || !displayName) {
      return { success: false, message: "اكتب اسم صاحب اليوزر واسم المستخدم وكلمة المرور." };
    }

    if (users.some(user => user.username === username)) {
      return { success: false, message: "اسم المستخدم موجود بالفعل." };
    }

    const user = { username, password, displayName, permissions };
    users.push(user);
    saveUsers(users);
    return { success: true, user };
  }

  function updateUser(username, updates) {
    const users = getUsers();
    const index = users.findIndex(user => user.username === username);
    if (index === -1) {
      return { success: false, message: "المستخدم غير موجود." };
    }

    if (username === DEFAULT_OWNER.username) {
      updates.permissions = [...ALL_PERMISSIONS];
    }

    users[index] = {
      ...users[index],
      displayName: String(updates.displayName || users[index].displayName).trim(),
      password: String(updates.password || users[index].password),
      permissions: Array.isArray(updates.permissions) ? updates.permissions : users[index].permissions
    };

    saveUsers(users);
    return { success: true, user: users[index] };
  }

  function deleteUser(username) {
    if (username === DEFAULT_OWNER.username) {
      return { success: false, message: "لا يمكن حذف مالك النظام." };
    }

    const currentUser = getCurrentUser();
    if (currentUser && currentUser.username === username) {
      return { success: false, message: "لا يمكنك حذف المستخدم الحالي." };
    }

    const users = getUsers().filter(user => user.username !== username);
    saveUsers(users);
    return { success: true };
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
