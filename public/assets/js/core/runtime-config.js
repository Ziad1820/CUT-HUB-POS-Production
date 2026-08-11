(function (window) {
  "use strict";

  // An authorized environment-specific release or local runtime step may set
  // this value before api.js loads. The repository default stays empty so a
  // missing endpoint fails closed and can never fall back to Production.
  window.ROMEO_API_URL = String(window.ROMEO_API_URL || "").trim();
})(window);
