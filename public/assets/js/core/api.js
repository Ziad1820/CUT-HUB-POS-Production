(function () {
  const API_URL = String(window.ROMEO_API_URL || "").trim();
  const SESSION_KEY = "romeo-pos-session";
  let onlineState = navigator.onLine !== false;
  let offlineBanner = null;
  let sessionRedirectInProgress = false;
  let relayActiveRequests = 0;
  const relayQueue = [];

  function acquireRelaySlot() {
    if (API_URL !== "/api/apps-script") return Promise.resolve(() => {});
    return new Promise(resolve => {
      const enter = () => {
        relayActiveRequests += 1;
        let released = false;
        resolve(() => {
          if (released) return;
          released = true;
          relayActiveRequests -= 1;
          const next = relayQueue.shift();
          if (next) next();
        });
      };
      if (relayActiveRequests < 2) enter();
      else relayQueue.push(enter);
    });
  }



  function getLanguage() {
    return localStorage.getItem("romeo-pos-language") === "en" ? "en" : "ar";
  }

  function getOfflineMessage() {
    return getLanguage() === "en"
      ? "No internet connection. Saving data is paused until the connection is restored."
      : "لا يوجد اتصال بالإنترنت. تم إيقاف حفظ البيانات مؤقتا حتى يعود الاتصال.";
  }

  function ensureOfflineBanner() {
    if (offlineBanner || !document.body) return offlineBanner;

    offlineBanner = document.createElement("div");
    offlineBanner.id = "romeoOfflineBanner";
    offlineBanner.style.cssText = [
      "position:fixed",
      "left:16px",
      "right:16px",
      "bottom:16px",
      "z-index:9999",
      "display:none",
      "padding:14px 18px",
      "border-radius:16px",
      "background:#8f2f24",
      "color:#fff",
      "font-weight:900",
      "text-align:center",
      "box-shadow:0 18px 40px rgba(0,0,0,.22)"
    ].join(";");
    document.body.appendChild(offlineBanner);
    return offlineBanner;
  }

  function setOnlineState(isOnline) {
    onlineState = Boolean(isOnline);
    document.body?.classList.toggle("is-offline", !onlineState);

    const banner = ensureOfflineBanner();
    if (banner) {
      banner.textContent = getOfflineMessage();
      banner.style.display = onlineState ? "none" : "block";
    }

    window.dispatchEvent(new CustomEvent("romeo-connectivity-change", {
      detail: { online: onlineState }
    }));
  }

  function isOnline() {
    return onlineState;
  }

  function browserReportsOffline() {
    return navigator.onLine === false;
  }

  function getApiErrorMessage() {
    return getLanguage() === "en"
      ? "Could not reach the database. Please try again."
      : "تعذر الاتصال بقاعدة البيانات. حاول مرة أخرى.";
  }

  function getCurrentSessionToken() {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (!stored) return null;

      const session = JSON.parse(stored);
      const token = session && (session.sessionToken || session.token || session.user?.sessionToken);
      return token ? String(token).trim() : null;
    } catch (error) {
      return null;
    }
  }

  function withCurrentSession(payload) {
    const nextPayload = { ...(payload || {}) };
    const sessionToken = getCurrentSessionToken();

    if (nextPayload.action === "logoutUser" || nextPayload.action === "logout") {
      // Logout has one credential source: the canonical session captured by
      // this transport wrapper. Callers cannot supply a second revocation
      // selector that differs from the authenticated request credential.
      delete nextPayload.sessionToken;
      delete nextPayload.token;
      delete nextPayload.authToken;
      if (sessionToken) nextPayload.sessionToken = sessionToken;
      return nextPayload;
    }

    if (sessionToken && !nextPayload.sessionToken) {
      nextPayload.sessionToken = sessionToken;
    }

    return nextPayload;
  }

  function redirectToLoginForExpiredSession() {
    if (sessionRedirectInProgress) return;
    sessionRedirectInProgress = true;

    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);

    const currentPage = window.location.pathname.split("/").pop() || "dashboard.html";
    if (currentPage.toLowerCase() === "login.html") return;

    const loginUrl = new URL("login.html", window.location.href);
    loginUrl.searchParams.set("reason", "session-expired");
    loginUrl.searchParams.set("returnTo", currentPage);
    window.location.replace(loginUrl.href);
  }

  async function request(payload) {
    const bodyPayload = withCurrentSession(payload);

    if (!API_URL) {
      throw new Error(getLanguage() === "en"
        ? "The application API endpoint is not configured."
        : "Ù„Ù… ÙŠØªÙ… Ø¥Ø¹Ø¯Ø§Ø¯ Ø±Ø§Ø¨Ø· Ø®Ø¯Ù…Ø© Ø§Ù„ØªØ·Ø¨ÙŠÙ‚.");
    }

    if (browserReportsOffline()) {
      setOnlineState(false);
      throw new Error(getOfflineMessage());
    }

    let response;
    let releaseSlot;
    try {
      releaseSlot = await acquireRelaySlot();
      response = await fetch(API_URL, {
        method: "POST",
        keepalive: true,
        cache: "no-store",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(bodyPayload)
      });
      setOnlineState(true);
    } catch (error) {
      if (browserReportsOffline()) {
        setOnlineState(false);
        throw new Error(getOfflineMessage());
      }
      setOnlineState(true);
      throw new Error(getApiErrorMessage());
    } finally {
      if (releaseSlot) releaseSlot();
    }

    if (!response.ok) {
      throw new Error("تعذر الاتصال بقاعدة البيانات.");
    }

    const result = await response.json();
    if (result && result.sessionExpired) {
      redirectToLoginForExpiredSession();
      return new Promise(() => {});
    }

    return result;
  }

  window.RomeoApi = {
    API_URL,
    request,
    redirectToLoginForExpiredSession
  };

  window.RomeoConnectivity = {
    isOnline,
    setOnlineState
  };

  window.addEventListener("online", () => setOnlineState(true));
  window.addEventListener("offline", () => setOnlineState(false));
  window.addEventListener("romeo-language-change", () => {
    if (!onlineState) setOnlineState(false);
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setOnlineState(navigator.onLine !== false));
  } else {
    setOnlineState(navigator.onLine !== false);
  }
})();
