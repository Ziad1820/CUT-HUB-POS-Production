(function () {
  const API_URL = "https://script.google.com/macros/s/AKfycby7F5IOkMt3jN4WZjP4SicqjZGocBPsuZFNCKEX8i4EeROARAf2N9zVO_jKtMoQe8EI/exec";
  const SESSION_KEY = "romeo-pos-session";

  function getCurrentUserFromSession() {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (!stored) return null;

      const session = JSON.parse(stored);
      const user = session && session.user ? session.user : null;
      if (!user || !user.username) return null;

      return {
        username: String(user.username || "").trim(),
        displayName: String(user.displayName || user.username || "").trim(),
        permissions: Array.isArray(user.permissions) ? user.permissions : []
      };
    } catch (error) {
      return null;
    }
  }

  function withCurrentUser(payload) {
    const nextPayload = { ...(payload || {}) };
    const user = getCurrentUserFromSession();

    if (!user || nextPayload.currentUser || nextPayload.actor) {
      return nextPayload;
    }

    nextPayload.currentUser = user;
    nextPayload.actor = user;
    nextPayload.actorUserName = user.username;
    nextPayload.actorDisplayName = user.displayName;

    return nextPayload;
  }

  async function request(payload) {
    const bodyPayload = withCurrentUser(payload);

    const response = await fetch(API_URL, {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(bodyPayload)
    });

    if (!response.ok) {
      throw new Error("تعذر الاتصال بقاعدة البيانات.");
    }

    return response.json();
  }

  window.RomeoApi = {
    API_URL,
    request
  };
})();
