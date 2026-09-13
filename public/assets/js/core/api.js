(function () {
  const API_URL = String(window.ROMEO_API_URL || "").trim();
  const SESSION_KEY = "romeo-pos-session";
  let onlineState = navigator.onLine !== false;
  let offlineBanner = null;
  let sessionRedirectInProgress = false;

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

  const API_TIMEOUT_MS = 45000;

  function apiError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  function responseError(response, result) {
    const code = String(result && result.code || "");
    if (code) return apiError(code, result.message || "Request failed.");
    if (response.status === 401) return apiError("SESSION_EXPIRED", "انتهت جلسة الدخول. سجّل الدخول مرة أخرى.");
    if (response.status === 403) return apiError("PERMISSION_DENIED", "ليس لديك صلاحية لتنفيذ هذه العملية.");
    if (response.status === 409) return apiError("CONFLICT", "تعذر تنفيذ العملية بسبب تعارض. حاول مرة أخرى.");
    if (response.status === 429) return apiError("RATE_LIMITED", "الخادم مشغول مؤقتًا. حاول مرة أخرى بعد لحظات.");
    if (response.status === 503) return apiError("SERVER_ERROR", "تعذر إتمام العملية بسبب خطأ مؤقت في الخادم.");
    if (response.status >= 500) return apiError("SERVER_ERROR", "تعذر إتمام العملية بسبب خطأ مؤقت في الخادم.");
    return apiError("VALIDATION_FAILED", result && result.message || "تعذر تنفيذ الطلب.");
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

  async function request(payload, options) {
    const bodyPayload = withCurrentSession(payload);
    const timeoutMs = Number(options && options.timeoutMs) || API_TIMEOUT_MS;

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
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    let timedOut = false;
    const abortFromCaller = () => controller && controller.abort();
    const callerSignal = options && options.signal;
    if (callerSignal && controller) callerSignal.addEventListener("abort", abortFromCaller, { once: true });
    const timer = controller ? setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs) : null;
    try {
      response = await fetch(API_URL, {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(bodyPayload),
        signal: controller && controller.signal
      });
      setOnlineState(true);
    } catch (error) {
      if (controller && controller.signal.aborted && timedOut) {
        throw apiError("REQUEST_TIMEOUT", "استغرقت العملية وقتًا أطول من المتوقع، ولم يتم تأكيد نتيجتها بعد. تحقق من السجل قبل إعادة المحاولة.");
      }
      if (controller && controller.signal.aborted) throw apiError("REQUEST_ABORTED", "تم إلغاء الطلب.");
      if (browserReportsOffline()) {
        setOnlineState(false);
        throw new Error(getOfflineMessage());
      }
      setOnlineState(true);
      throw apiError("NETWORK_ERROR", getApiErrorMessage());
    } finally {
      if (timer) clearTimeout(timer);
      if (callerSignal && controller) callerSignal.removeEventListener("abort", abortFromCaller);
    }

    let result;
    try {
      result = await response.json();
    } catch (error) {
      throw apiError("INVALID_SERVER_RESPONSE", "تعذر قراءة استجابة الخادم. لم يتم تأكيد نتيجة العملية.");
    }

    if (!response.ok) throw responseError(response, result);
    if (result && result.sessionExpired) {
      redirectToLoginForExpiredSession();
      throw apiError("SESSION_EXPIRED", "انتهت جلسة الدخول. سجّل الدخول مرة أخرى.");
    }

    if (result && (result.status === "error" || result.success === false)) throw responseError(response, result);

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
