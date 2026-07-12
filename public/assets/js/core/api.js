(function () {
  const API_URL = "https://script.google.com/macros/s/AKfycbz1mPPamOTlxplr8W0VgNMX1RR160Faqy6hZOSLQ1wh8k0_46aI9kQXy8wvxirfy_4a/exec";
  const SESSION_KEY = "romeo-pos-session";
  let onlineState = navigator.onLine !== false;
  let offlineBanner = null;

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

    if (sessionToken && !nextPayload.sessionToken) {
      nextPayload.sessionToken = sessionToken;
    }

    return nextPayload;
  }

  async function request(payload) {
    const bodyPayload = withCurrentSession(payload);

    if (browserReportsOffline()) {
      setOnlineState(false);
      throw new Error(getOfflineMessage());
    }

    let response;
    try {
      response = await fetch(API_URL, {
        method: "POST",
        keepalive: true,
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
    }

    if (!response.ok) {
      throw new Error("تعذر الاتصال بقاعدة البيانات.");
    }

    return response.json();
  }

  window.RomeoApi = {
    API_URL,
    request
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
