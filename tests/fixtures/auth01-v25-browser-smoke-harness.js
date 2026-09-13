"use strict";

(function publish(factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory;
  if (typeof window !== "undefined") {
    Object.defineProperty(window, "createAuth01V25SmokeHarness", {
      value: factory,
      configurable: true,
      enumerable: false,
      writable: false
    });
  }
})(function createAuth01V25SmokeHarness(options = {}) {
  const request = options.request;
  if (typeof request !== "function") throw new Error("A request function is required.");
  const fingerprintToken = options.fingerprintToken || (async token => {
    const bytes = new TextEncoder().encode(String(token || ""));
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("");
  });
  let retainedToken = "";
  let safeTokenFingerprint = "";
  let loginRequestCount = 0;
  let loginSuccessCount = 0;
  let logoutRequestCount = 0;
  let logoutSemanticPass = false;
  let protectedReadPass = false;
  let revokedTokenReusePass = false;
  let revokedProbeUsed = false;
  let protectedHandlerExecuted = false;
  const lifecycle = [];

  async function observedRequest(payload) {
    const action = String(payload && payload.action || "");
    if (action === "loginUser") loginRequestCount += 1;
    if (action === "logoutUser" || action === "logout") logoutRequestCount += 1;
    const result = await request(payload);
    if (action === "loginUser" && result && result.status === "success" && result.sessionCreated === true) {
      loginSuccessCount += 1;
      retainedToken = String(result.sessionToken || result.token || "");
      safeTokenFingerprint = retainedToken ? await fingerprintToken(retainedToken) : "";
    }
    if ((action === "logoutUser" || action === "logout") && result) {
      logoutSemanticPass = result.status === "success" &&
        result.logoutAccepted === true &&
        result.clientCleanupAllowed === true &&
        !Object.prototype.hasOwnProperty.call(result, "revoked") &&
        !Object.prototype.hasOwnProperty.call(result, "alreadyRevoked");
    }
    return result;
  }

  function observeAuthEvent(event) {
    const detail = event && event.detail || {};
    if (detail.action !== "logout") return;
    if (["request-start", "response", "local-clear-start", "local-clear-complete", "redirect"]
      .includes(detail.phase)) lifecycle.push(detail.phase);
  }

  async function runProtectedRead(action = "getInvoices") {
    if (!retainedToken) throw new Error("No retained login token is available.");
    const result = await request({ action, sessionToken: retainedToken, authRequestId: "smoke-protected-read" });
    protectedReadPass = !!result && result.status === "success";
    return protectedReadPass;
  }

  async function runRevokedTokenProbe(action = "getInvoices") {
    if (!retainedToken || !logoutSemanticPass || revokedProbeUsed) {
      throw new Error("The revoked-token probe preconditions are not satisfied.");
    }
    revokedProbeUsed = true;
    const result = await request({ action, sessionToken: retainedToken, authRequestId: "smoke-revoked-probe" });
    revokedTokenReusePass = !!result && (result.authRequired === true || result.sessionExpired === true);
    protectedHandlerExecuted = !!result && result.status === "success";
    retainedToken = "";
    return revokedTokenReusePass;
  }

  function safeReport() {
    const clearStart = lifecycle.indexOf("local-clear-start");
    const clearComplete = lifecycle.indexOf("local-clear-complete");
    const redirect = lifecycle.indexOf("redirect");
    return Object.freeze({
      loginRequestCount,
      loginSuccessCount,
      safeTokenFingerprint,
      protectedReadPass,
      logoutRequestCount,
      logoutResponseSemanticPass: logoutSemanticPass,
      localClearAfterRevocation: lifecycle.indexOf("response") !== -1 &&
        clearStart > lifecycle.indexOf("response") && clearComplete > clearStart,
      redirectAfterLocalClear: redirect > clearComplete && clearComplete !== -1,
      revokedTokenReusePass,
      protectedHandlerExecuted
    });
  }

  return Object.freeze({
    observeAuthEvent,
    observedRequest,
    runProtectedRead,
    runRevokedTokenProbe,
    safeReport
  });
});
