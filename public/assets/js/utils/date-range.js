(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.RomeoDateRange = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const TIME_ZONE = "Africa/Cairo";

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function cairoParts(now) {
    const values = {};
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(now || new Date()).forEach(part => {
      if (part.type !== "literal") values[part.type] = part.value;
    });
    return { year: Number(values.year), month: Number(values.month), day: Number(values.day) };
  }

  function isDateKey(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month < 1 || month > 12 || day < 1) return false;
    return day <= new Date(year, month, 0).getDate();
  }

  function currentMonth(now) {
    const parts = cairoParts(now);
    const lastDay = new Date(parts.year, parts.month, 0).getDate();
    return {
      fromDate: `${parts.year}-${pad(parts.month)}-01`,
      toDate: `${parts.year}-${pad(parts.month)}-${pad(lastDay)}`
    };
  }

  function today(now) {
    const parts = cairoParts(now);
    return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
  }

  function validate(fromDate, toDate) {
    if (!isDateKey(fromDate) || !isDateKey(toDate)) {
      return { ok: false, code: "DATE_RANGE_REQUIRED", message: "Choose valid from and to dates." };
    }
    if (fromDate > toDate) {
      return { ok: false, code: "DATE_RANGE_INVALID", message: "From date must be before to date." };
    }
    return { ok: true, fromDate, toDate };
  }

  function setCurrentMonth(fromInput, toInput, now) {
    const range = currentMonth(now);
    if (fromInput) fromInput.value = range.fromDate;
    if (toInput) toInput.value = range.toDate;
    return range;
  }

  function includes(dateKey, fromDate, toDate) {
    return isDateKey(dateKey) && dateKey >= fromDate && dateKey <= toDate;
  }

  return Object.freeze({ TIME_ZONE, cairoParts, today, isDateKey, currentMonth, validate, setCurrentMonth, includes });
});
