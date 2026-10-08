function getDateKey(value, timeZone) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, timeZone, "yyyy-MM-dd");
  }

  const text = normalizeDigits(String(value || "").trim());
  if (!text) return "";

  const ymd = text.match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
  if (ymd) {
    return `${ymd[1]}-${padDatePart(ymd[2])}-${padDatePart(ymd[3])}`;
  }

  const dmy = text.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (dmy) {
    return `${dmy[3]}-${padDatePart(dmy[2])}-${padDatePart(dmy[1])}`;
  }

  const parsed = new Date(text);
  return isNaN(parsed.getTime())
    ? ""
    : Utilities.formatDate(parsed, timeZone, "yyyy-MM-dd");
}

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

function normalizeDigits(value) {
  const digitMap = {
    "\u0660": "0", "\u0661": "1", "\u0662": "2", "\u0663": "3", "\u0664": "4",
    "\u0665": "5", "\u0666": "6", "\u0667": "7", "\u0668": "8", "\u0669": "9",
    "\u06F0": "0", "\u06F1": "1", "\u06F2": "2", "\u06F3": "3", "\u06F4": "4",
    "\u06F5": "5", "\u06F6": "6", "\u06F7": "7", "\u06F8": "8", "\u06F9": "9"
  };

  return String(value).replace(/[\u0660-\u0669\u06F0-\u06F9]/g, digit => digitMap[digit] || digit);
}
function parseSheetAmount(value) {
  if (typeof value === "number") return value;

  let text = String(value || "").trim();
  if (!text) return 0;

  if (text.includes(",") && !text.includes(".")) {
    text = /,\d{1,2}$/.test(text)
      ? text.replace(",", ".")
      : text.replace(/,/g, "");
  } else {
    text = text.replace(/,/g, "");
  }

  const num = parseFloat(text.replace(/[^\d.-]/g, ""));
  return isFinite(num) ? num : 0;
}
