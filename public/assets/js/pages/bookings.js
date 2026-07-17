(() => {
  "use strict";

  RomeoAuth?.requireAuth?.("view_bookings");

  const STAFF_KEY = "romeo-pos-staff-accounting-v2";
  const DEFAULT_STAFF = ["MOHAMED", "RAMDAN", "KAREEM", "KHALED"];
  let bookings = [];
  let loading = false;
  let activeSource = "public";

  const elements = {
    form: document.getElementById("bookingForm"),
    customerName: document.getElementById("customerName"),
    customerPhone: document.getElementById("customerPhone"),
    date: document.getElementById("bookingDate"),
    time: document.getElementById("bookingTime"),
    employee: document.getElementById("bookingEmployee"),
    service: document.getElementById("bookingService"),
    note: document.getElementById("bookingNote"),
    clear: document.getElementById("clearBookingBtn"),
    filterDate: document.getElementById("filterDate"),
    status: document.getElementById("statusFilter"),
    search: document.getElementById("bookingSearch"),
    sourceTabs: document.getElementById("bookingSourceTabs"),
    list: document.getElementById("bookingsList"),
    total: document.getElementById("todayBookingsCount"),
    confirmed: document.getElementById("confirmedBookingsCount"),
    pending: document.getElementById("pendingBookingsCount"),
    publicCount: document.getElementById("publicBookingsCount"),
    staffCount: document.getElementById("staffBookingsCount")
  };

  function language() {
    return RomeoLanguage?.getCurrentLanguage?.() || localStorage.getItem("romeo-pos-language") || "ar";
  }

  function text(ar, en) { return language() === "en" ? en : ar; }

  function todayKey() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function normalizeBooking(item) {
    return {
      id: String(item.id || item.bookingId || "").trim(),
      bookingId: String(item.bookingId || item.id || "").trim(),
      rowNumber: Number(item.rowNumber || 0),
      customerName: String(item.customerName || item.customer || "").trim(),
      customerPhone: String(item.customerPhone || item.phone || "").trim(),
      date: String(item.date || item.bookingDate || "").trim(),
      time: String(item.time || item.bookingTime || "").trim(),
      employee: String(item.employee || item.barber || "").trim(),
      employeeId: String(item.employeeId || "").trim(),
      service: String(item.service || item.services || "").trim(),
      serviceId: String(item.serviceId || "").trim(),
      durationMinutes: Number(item.durationMinutes || 30),
      note: String(item.note || "").trim(),
      status: String(item.status || "pending").trim(),
      source: String(item.source || "staff").trim().toLowerCase(),
      trackingToken: String(item.trackingToken || "").trim(),
      proposedDate: String(item.proposedDate || "").trim(),
      proposedTime: String(item.proposedTime || "").trim(),
      rejectionReason: String(item.rejectionReason || "").trim()
    };
  }

  async function fetchBookings() {
    if (loading) return;
    loading = true;
    elements.list.innerHTML = `<div class="empty-state">${text("جاري تحميل الحجوزات...", "Loading bookings...")}</div>`;
    try {
      const response = await RomeoApi.request({
        action: "getBookings",
        filters: { date: elements.filterDate.value, status: elements.status.value, search: elements.search.value.trim() }
      });
      if (response?.status !== "success") throw new Error(response?.message || "Could not load bookings.");
      bookings = (response.bookings || []).map(normalizeBooking);
    } catch (error) {
      bookings = [];
      elements.list.innerHTML = `<div class="empty-state">${escapeHtml(error.message || text("تعذر تحميل الحجوزات.", "Could not load bookings."))}</div>`;
    } finally {
      loading = false;
      render();
    }
  }

  function staffRecord(member, index) {
    if (typeof member === "string") return { name: member, code: member, id: member };
    return {
      name: member?.name || member?.staffName || member?.displayName || `Employee ${index + 1}`,
      code: member?.code || member?.staffCode || "",
      id: member?.id || member?.staffId || ""
    };
  }

  function localStaff() {
    try {
      const saved = JSON.parse(localStorage.getItem(STAFF_KEY) || "[]");
      if (Array.isArray(saved) && saved.length) return saved.map(staffRecord);
    } catch (error) { console.warn(error); }
    return DEFAULT_STAFF.map(staffRecord);
  }

  function renderStaff(rows = localStaff()) {
    const current = elements.employee.value;
    elements.employee.innerHTML = `<option value="">${text("اختر الموظف", "Choose employee")}</option>`;
    rows.forEach((member) => {
      const option = document.createElement("option");
      option.value = member.name;
      option.textContent = member.name;
      option.dataset.staffId = member.id || "";
      elements.employee.appendChild(option);
    });
    if (current) elements.employee.value = current;
  }

  async function loadStaff() {
    renderStaff();
    try {
      const response = await RomeoApi.request({ action: "getStaff" });
      if (response?.status === "success" && Array.isArray(response.staff)) {
        localStorage.setItem(STAFF_KEY, JSON.stringify(response.staff));
        renderStaff(response.staff.map(staffRecord));
      }
    } catch (error) { console.warn("Could not load staff", error); }
  }

  function statusLabel(status) {
    const labels = {
      pending: text("بانتظار التأكيد", "Pending"), confirmed: text("مؤكد", "Confirmed"),
      proposed: text("موعد بديل مقترح", "Proposed time"), rejected: text("مرفوض", "Rejected"),
      done: text("تم الحضور", "Completed"), cancelled: text("ملغي", "Cancelled"),
      expired: text("انتهت المهلة", "Expired")
    };
    return labels[status] || labels.pending;
  }

  function formatDate(value) {
    const parts = String(value || "").split("-");
    return language() === "en" || parts.length !== 3 ? value : `${parts[2]} / ${parts[1]} / ${parts[0]}`;
  }

  function bookingSource(booking) {
    return booking.source === "public" ? "public" : "staff";
  }

  function visibleBookings() {
    return bookings.filter((booking) => bookingSource(booking) === activeSource);
  }

  function renderSourceTabs() {
    elements.publicCount.textContent = bookings.filter((booking) => bookingSource(booking) === "public").length;
    elements.staffCount.textContent = bookings.filter((booking) => bookingSource(booking) === "staff").length;
    elements.sourceTabs.querySelectorAll("[data-source]").forEach((button) => {
      const active = button.dataset.source === activeSource;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function renderStats() {
    const date = elements.filterDate.value || todayKey();
    const rows = visibleBookings().filter((booking) => booking.date === date);
    elements.total.textContent = rows.length;
    elements.confirmed.textContent = rows.filter((booking) => booking.status === "confirmed").length;
    elements.pending.textContent = rows.filter((booking) => booking.status === "pending").length;
  }

  function render() {
    renderSourceTabs();
    renderStats();
    const rows = visibleBookings();
    if (!rows.length) {
      const emptyMessage = activeSource === "public"
        ? text("لا توجد طلبات حجز واردة من الموقع حاليًا.", "No website booking requests yet.")
        : text("لا توجد حجوزات داخلية مطابقة حاليًا.", "No matching internal bookings yet.");
      elements.list.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
      return;
    }
    elements.list.innerHTML = rows.map((booking) => `
      <article class="booking-card" data-booking-id="${escapeHtml(booking.id)}">
        <div class="booking-top">
          <div class="booking-customer"><strong>${escapeHtml(booking.customerName)}</strong><span>${escapeHtml(booking.customerPhone)}</span></div>
          <div class="booking-time"><span>${formatDate(booking.date)} - ${escapeHtml(booking.time)}</span><span class="booking-status status-${escapeHtml(booking.status)}">${statusLabel(booking.status)}</span></div>
        </div>
        <div class="booking-meta">
          <span>${text("الموظف", "Employee")}: <strong>${escapeHtml(booking.employee)}</strong></span>
          <span>${text("الخدمة", "Service")}: <strong>${escapeHtml(booking.service)}</strong></span>
          <span>${text("المصدر", "Source")}: <strong>${booking.source === "public" ? text("طلب عميل", "Customer request") : text("حجز داخلي", "Staff booking")}</strong></span>
          <span>${text("المدة", "Duration")}: <strong>${booking.durationMinutes} ${text("دقيقة", "minutes")}</strong></span>
        </div>
        ${booking.note ? `<div class="booking-note">${escapeHtml(booking.note)}</div>` : ""}
        ${booking.status === "proposed" ? `<div class="booking-note">${text("الموعد المقترح", "Proposed appointment")}: ${formatDate(booking.proposedDate)} - ${escapeHtml(booking.proposedTime)}</div>` : ""}
        ${booking.rejectionReason ? `<div class="booking-note">${escapeHtml(booking.rejectionReason)}</div>` : ""}
        <div class="booking-actions">
          ${booking.status === "pending" ? `<button class="booking-action confirm" type="button" data-action="confirmed">${text("تأكيد", "Confirm")}</button><button class="booking-action" type="button" data-action="propose">${text("اقتراح موعد", "Propose time")}</button>` : ""}
          ${["pending", "proposed"].includes(booking.status) ? `<button class="booking-action cancel" type="button" data-action="reject">${text("رفض الطلب", "Reject request")}</button>` : ""}
          ${booking.customerPhone ? '<button class="booking-action" type="button" data-action="whatsapp">WhatsApp</button>' : ""}
          ${booking.trackingToken ? `<button class="booking-action" type="button" data-action="copy-link">${text("نسخ رابط المتابعة", "Copy tracking link")}</button>` : ""}
          ${!["done", "cancelled", "rejected"].includes(booking.status) ? `<button class="booking-action done" type="button" data-action="done">${text("تم الحضور", "Complete")}</button>` : ""}
          ${!["cancelled", "done", "rejected"].includes(booking.status) ? `<button class="booking-action cancel" type="button" data-action="cancelled">${text("إلغاء", "Cancel")}</button>` : ""}
          <button class="booking-action delete" type="button" data-action="delete">${text("حذف", "Delete")}</button>
        </div>
      </article>`).join("");
  }

  function clearForm() {
    elements.form.reset();
    elements.date.value = todayKey();
  }

  async function saveBooking(event) {
    event.preventDefault();
    const option = elements.employee.selectedOptions[0];
    const payload = {
      action: "createBooking", customerName: elements.customerName.value.trim(),
      customerPhone: elements.customerPhone.value.trim(), date: elements.date.value,
      time: elements.time.value, employee: elements.employee.value,
      employeeId: option?.dataset.staffId || "", service: elements.service.value.trim(),
      note: elements.note.value.trim(), status: "pending", source: "staff"
    };
    try {
      const response = await RomeoApi.request(payload);
      if (response?.status !== "success") throw new Error(response?.message || "Could not save booking.");
      clearForm();
      elements.filterDate.value = payload.date;
      activeSource = "staff";
      await fetchBookings();
    } catch (error) { alert(error.message || text("تعذر حفظ الحجز.", "Could not save booking.")); }
  }

  function findBooking(id) { return bookings.find((booking) => booking.id === id || booking.bookingId === id); }

  async function updateStatus(id, status, extra = {}) {
    const booking = findBooking(id);
    if (!booking) return;
    const response = await RomeoApi.request({ action: "updateBooking", ...booking, ...extra, status });
    if (response?.status !== "success") throw new Error(response?.message || "Could not update booking.");
    await fetchBookings();
  }

  async function propose(id) {
    const booking = findBooking(id);
    const proposedDate = prompt(text("اكتب تاريخ الموعد البديل بالشكل YYYY-MM-DD", "Enter proposed date as YYYY-MM-DD"), booking?.date || todayKey());
    if (!proposedDate) return;
    const proposedTime = prompt(text("اكتب وقت الموعد البديل بالشكل HH:MM", "Enter proposed time as HH:MM"), booking?.time || "12:00");
    if (!proposedTime) return;
    await updateStatus(id, "proposed", { proposedDate, proposedTime });
  }

  async function reject(id) {
    const reason = prompt(text("اكتب سبب الرفض الذي سيظهر للعميل", "Enter the rejection reason"), text("الموعد غير متاح حاليًا.", "The appointment is unavailable."));
    if (reason === null) return;
    await updateStatus(id, "rejected", { rejectionReason: reason });
  }

  function whatsapp(id) {
    const booking = findBooking(id);
    if (!booking) return;
    let phone = booking.customerPhone.replace(/\D/g, "");
    if (phone.startsWith("0")) phone = `20${phone.slice(1)}`;
    const message = text(`مرحبًا ${booking.customerName}، بخصوص طلب حجز ${booking.service} مع ${booking.employee} يوم ${booking.date} الساعة ${booking.time}.`, `Hello ${booking.customerName}, regarding your booking on ${booking.date} at ${booking.time}.`);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  }

  async function copyLink(id) {
    const booking = findBooking(id);
    if (!booking?.trackingToken) return;
    const url = new URL("customer-booking.html", window.location.href);
    url.searchParams.set("tracking", booking.trackingToken);
    try { await navigator.clipboard.writeText(url.href); alert(text("تم نسخ رابط المتابعة.", "Tracking link copied.")); }
    catch (error) { prompt(text("انسخ رابط المتابعة", "Copy tracking link"), url.href); }
  }

  async function remove(id) {
    if (!confirm(text("هل تريد حذف هذا الحجز؟", "Delete this booking?"))) return;
    const booking = findBooking(id);
    const response = await RomeoApi.request({ action: "deleteBooking", id: booking.id, rowNumber: booking.rowNumber });
    if (response?.status !== "success") throw new Error(response?.message || "Could not delete booking.");
    await fetchBookings();
  }

  elements.list.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    const card = event.target.closest("[data-booking-id]");
    if (!button || !card) return;
    try {
      const action = button.dataset.action;
      const id = card.dataset.bookingId;
      if (action === "propose") await propose(id);
      else if (action === "reject") await reject(id);
      else if (action === "whatsapp") whatsapp(id);
      else if (action === "copy-link") await copyLink(id);
      else if (action === "delete") await remove(id);
      else await updateStatus(id, action);
    } catch (error) { alert(error.message || text("تعذر تنفيذ الإجراء.", "Could not complete the action.")); }
  });

  document.querySelectorAll("[data-i18n-ar][data-i18n-en]").forEach((node) => { node.textContent = language() === "en" ? node.dataset.i18nEn : node.dataset.i18nAr; });
  elements.date.value = todayKey();
  elements.filterDate.value = todayKey();
  elements.form.addEventListener("submit", saveBooking);
  elements.clear.addEventListener("click", clearForm);
  elements.filterDate.addEventListener("change", fetchBookings);
  elements.status.addEventListener("change", fetchBookings);
  elements.search.addEventListener("input", render);
  elements.sourceTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-source]");
    if (!button) return;
    activeSource = button.dataset.source === "staff" ? "staff" : "public";
    render();
  });
  window.addEventListener("romeo-language-change", render);
  loadStaff();
  fetchBookings();
})();
