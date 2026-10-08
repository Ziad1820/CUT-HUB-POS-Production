(function (window) {
  "use strict";

  const PRODUCTION_API_URL =
    "https://script.google.com/macros/s/AKfycbzWjM4X4JDTXRYe14oHL8m1Ex3GT9B8kMT6q8yp9eNMw6F6eSEY4zCXTYkyIL7K1ejR/exec";
  const PRODUCTION_HOSTS = new Set([
    "cut-hub-pos-production.vercel.app",
    "cut-hub-pos-production-ziad1820s-projects.vercel.app",
    "cut-hub-pos-production-ziad1820-ziad1820s-projects.vercel.app"
  ]);
  const PRODUCTION_RELAY_PATH = "/api/apps-script";

  function normalizeAppsScriptUrl(value) {
    const candidate = String(value || "").trim();
    if (!candidate) return "";

    try {
      const parsed = new URL(candidate);
      const validPath = /^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(parsed.pathname);
      if (parsed.protocol !== "https:" || parsed.hostname !== "script.google.com" ||
          parsed.username || parsed.password || parsed.search || parsed.hash || !validPath) return "";
      return parsed.href;
    } catch (error) {
      return "";
    }
  }

  const hostname = String(window.location?.hostname || "").trim().toLowerCase();
  const injectedUrl = String(window.ROMEO_API_URL || "").trim();

  const productionPreview = /^cut-hub-pos-production-[a-z0-9]+-ziad1820s-projects\.vercel\.app$/.test(hostname);
  if (PRODUCTION_HOSTS.has(hostname) || productionPreview) {
    // Production accepts only its pinned endpoint. A conflicting injection
    // fails closed instead of silently selecting another environment.
    window.ROMEO_API_URL = injectedUrl && injectedUrl !== PRODUCTION_RELAY_PATH &&
      normalizeAppsScriptUrl(injectedUrl) !== PRODUCTION_API_URL
      ? ""
      : PRODUCTION_RELAY_PATH;
    return;
  }

  // Staging and local runtimes must inject their own valid Apps Script URL.
  // Unknown, missing, or malformed configuration remains empty and api.js
  // refuses to send a request.
  window.ROMEO_API_URL = normalizeAppsScriptUrl(injectedUrl);
})(window);
