function getCairoDateTime() {
  return Utilities.formatDate(new Date(), TIME_ZONE, "yyyy-MM-dd HH:mm:ss");
}

function getInvoiceDateTime(data) {
  const selectedDate = getDateKey(data.reportDate || data.date || data.dateKey || "", TIME_ZONE);
  const currentTime = Utilities.formatDate(new Date(), TIME_ZONE, "HH:mm:ss");
  return selectedDate ? `${selectedDate} ${currentTime}` : getCairoDateTime();
}

function getCairoDateKey() {
  return Utilities.formatDate(new Date(), TIME_ZONE, "yyyy-MM-dd");
}

function getRequestedDateKey(data, timeZone) {
  const requestedDate = String(data.reportDate || data.date || "").trim();
  if (requestedDate) return getDateKey(requestedDate, timeZone);
  return Utilities.formatDate(new Date(), timeZone, "yyyy-MM-dd");
}

