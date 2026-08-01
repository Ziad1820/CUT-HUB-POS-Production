(function (window) {
  "use strict";

  // An authorized environment-specific release step may set this value before
  // api.js loads. Keeping the repository default empty makes missing
  // configuration fail closed and prevents accidental Production fallback.
  window.ROMEO_API_URL = String(window.ROMEO_API_URL || "").trim();
})(window);
