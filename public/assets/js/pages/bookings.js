(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const elements = {
    formPanel: document.querySelector(".booking-form-panel"), form: $("bookingForm"),
    customerName: $("customerName"), customerPhone: $("customerPhone"), date: $("bookingDate"),
    time: $("bookingTime"), employee: $("bookingEmployee"), services: $("internalServices"),
    serviceSummary: $("internalServiceSummary"), otherFields: $("otherServiceFields"),
    otherName: $("otherServiceName"), otherDuration: $("otherServiceDuration"), note: $("bookingNote"),
    slotStatus: $("slotStatus"), save: $("saveBookingBtn"), clear: $("clearBookingBtn"),
    filterDate: $("filterDate"), status: $("statusFilter"), search: $("bookingSearch"),
    list: $("bookingsList"), sourceTabs: $("bookingSourceTabs"), today: $("todayBookingsCount"),
    confirmed: $("confirmedBookingsCount"), pending: $("pendingBookingsCount"),
    publicCount: $("publicBookingsCount"), staffCount: $("staffBookingsCount"), ratingsCount: $("ratingsCount"),
    modal: $("bookingModal"), modalTitle: $("bookingModalTitle"), modalBody: $("bookingModalBody"),
    modalActions: $("bookingModalActions"), toast: $("bookingToast"),
    ratingsDashboard: $("ratingsDashboard"), ratingsSummary: $("ratingsSummary"),
    ratingEmployee: $("ratingEmployeeFilter"), ratingStatus: $("ratingStatusFilter"),
    ratingFrom: $("ratingFromDate"), ratingTo: $("ratingToDate"),
    barberSummaries: $("barberRatingSummaries"), ratingsList: $("ratingsList")
  };
  const user = RomeoAuth.getCurrentUser();
  const can = (permission) => RomeoAuth.isOwnerUser(user) || RomeoAuth.hasPermission(permission);
  const state = {
    bookings: [], services: [], selectedServiceIds: new Set(), otherService: false,
    barbers: [], activeSource: "public", busy: false, modalOpen: false, lastFocus: null,
    ratings: [], ratingMeta: null, countdownTimer: null, refreshTimer: null,
    pendingCreateRequest: null
  };
  const text = (ar, en) => document.documentElement.lang === "en" ? en : ar;
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const todayKey = () => {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const get = (type) => parts.find((part) => part.type === type)?.value;
    return `${get("year")}-${get("month")}-${get("day")}`;
  };
  const formatDate = (date) => date ? new Intl.DateTimeFormat(document.documentElement.lang === "en" ? "en-GB" : "ar-EG", {
    timeZone: "Africa/Cairo", year: "numeric", month: "short", day: "numeric"
  }).format(new Date(`${date}T12:00:00`)) : "-";
  const formatTime = (time) => {
    if (!time) return "-";
    const [hour, minute] = time.split(":").map(Number);
    return new Intl.DateTimeFormat(document.documentElement.lang === "en" ? "en-US" : "ar-EG", { hour: "numeric", minute: "2-digit" })
      .format(new Date(2020, 0, 1, hour, minute));
  };
  const money = (value) => new Intl.NumberFormat(document.documentElement.lang === "en" ? "en-EG" : "ar-EG", {
    style: "currency", currency: "EGP", maximumFractionDigits: 0
  }).format(Number(value) || 0);
  const newClientRequestId = () => globalThis.crypto?.randomUUID
    ? `internal-${globalThis.crypto.randomUUID()}`
    : `internal-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
  const attachClientRequestId = (payload) => {
    const fingerprint = JSON.stringify(payload);
    if (!state.pendingCreateRequest || state.pendingCreateRequest.fingerprint !== fingerprint) {
      state.pendingCreateRequest = { fingerprint, id: newClientRequestId() };
    }
    return { ...payload, clientRequestId: state.pendingCreateRequest.id };
  };

  function normalizeBooking(item, index) {
    return {
      ...item,
      id: String(item.id || item.bookingId || `BOOK-${index + 2}`),
      customerName: String(item.customerName || item.customer || "").trim(),
      customerPhone: String(item.customerPhone || item.phone || "").trim(),
      employee: String(item.employee || item.barber || "").trim(),
      employeeId: String(item.employeeId || "").trim(),
      service: String(item.service || item.services || "").trim(),
      serviceId: String(item.serviceId || "").trim(),
      serviceIds: Array.isArray(item.serviceIds) ? item.serviceIds : String(item.serviceIds || item.serviceId || "").split(",").filter(Boolean),
      status: String(item.status || "pending").toLowerCase(),
      source: String(item.source || "staff").toLowerCase(),
      durationMinutes: Number(item.durationMinutes) || 30
    };
  }

  function notify(message, kind = "info") {
    elements.toast.textContent = message;
    elements.toast.dataset.kind = kind;
    elements.toast.classList.add("visible");
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => elements.toast.classList.remove("visible"), 4000);
  }

  function setButtonBusy(button, busy) {
    if (!button) return;
    button.disabled = busy;
    button.classList.toggle("is-loading", busy);
    button.setAttribute("aria-busy", String(busy));
  }

  function showModal({ title, body, confirmText, danger = false, onConfirm, onOpen }) {
    state.modalOpen = true;
    state.lastFocus = document.activeElement;
    elements.modalTitle.textContent = title;
    elements.modalBody.innerHTML = body;
    elements.modalActions.innerHTML = `
      <button type="button" class="soft-btn" data-modal-cancel>${text("إلغاء", "Cancel")}</button>
      <button type="button" class="primary-btn ${danger ? "danger-btn" : ""}" data-modal-confirm>${escapeHtml(confirmText)}</button>`;
    elements.modal.classList.remove("hidden");
    const close = () => {
      state.modalOpen = false;
      elements.modal.classList.add("hidden");
      state.lastFocus?.focus();
    };
    elements.modal.querySelector("[data-modal-cancel]").onclick = close;
    elements.modal.querySelector("[data-modal-confirm]").onclick = async (event) => {
      const button = event.currentTarget;
      setButtonBusy(button, true);
      try {
        const result = await onConfirm?.(elements.modalBody);
        if (result !== false) close();
      } finally {
        if (state.modalOpen) setButtonBusy(button, false);
      }
    };
    elements.modal.onclick = (event) => { if (event.target === elements.modal) close(); };
    requestAnimationFrame(() => {
      (elements.modalBody.querySelector("input,select,textarea,button") || elements.modal.querySelector("button"))?.focus();
      onOpen?.(elements.modalBody);
    });
  }

  async function fetchBookings({ silent = false } = {}) {
    if (state.busy || state.modalOpen) return;
    state.busy = true;
    if (!silent) elements.list.innerHTML = `<div class="empty-state"><span class="spinner"></span> ${text("جاري تحميل الحجوزات...", "Loading bookings...")}</div>`;
    try {
      const response = await RomeoApi.request({
        action: "getBookings",
        filters: { date: elements.filterDate.value, status: elements.status.value }
      });
      if (response?.status !== "success") throw new Error(response?.message || text("تعذر تحميل الحجوزات.", "Could not load bookings."));
      state.bookings = (response.bookings || []).map(normalizeBooking);
      render();
    } catch (error) {
      if (!silent) elements.list.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
      notify(error.message, "error");
    } finally {
      state.busy = false;
    }
  }

  function localSearchMatch(booking) {
    const query = elements.search.value.trim().toLowerCase();
    return !query || `${booking.customerName} ${booking.customerPhone} ${booking.employee} ${booking.service} ${booking.note || ""} ${booking.trackingToken || ""}`.toLowerCase().includes(query);
  }

  function bookingSort(a, b) {
    const rank = (booking) => booking.status === "pending" ? 0 : booking.status === "confirmed" ? 1 : 2;
    const rankDiff = rank(a) - rank(b);
    if (rankDiff) return rankDiff;
    if (a.status === "pending") return String(b.createdAt || b.requestedAt).localeCompare(String(a.createdAt || a.requestedAt));
    if (a.status === "confirmed") return `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
    return String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt));
  }

  function visibleBookings() {
    if (state.activeSource === "ratings") return [];
    return state.bookings.filter((booking) => booking.source === state.activeSource)
      .filter(localSearchMatch).sort(bookingSort);
  }

  function statusLabel(status) {
    return ({
      pending: text("بانتظار التأكيد", "Pending"), confirmed: text("مؤكد", "Confirmed"),
      proposed: text("موعد بديل مقترح", "Proposed"), rejected: text("مرفوض", "Rejected"),
      done: text("تم الحضور", "Completed"), cancelled: text("ملغي", "Cancelled"),
      expired: text("منتهي", "Expired")
    })[status] || status;
  }

  function normalizeEgyptianPhone(value) {
    let digits = String(value || "").replace(/\D/g, "");
    if (digits.startsWith("0020")) digits = digits.slice(4);
    else if (digits.startsWith("20") && digits.length === 12) digits = digits.slice(2);
    if (digits.length === 10 && digits.startsWith("1")) digits = `0${digits}`;
    return digits;
  }

  function holdCountdown(booking) {
    if (booking.status !== "pending" || !booking.holdExpiresAt) return "";
    const remaining = new Date(booking.holdExpiresAt).getTime() - Date.now();
    if (!Number.isFinite(remaining) || remaining <= 0) return text("انتهت مهلة الطلب", "Booking hold expired");
    const total = Math.floor(remaining / 1000);
    return `${text("تنتهي مهلة الطلب خلال", "Booking hold expires in")} ${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }

  function allowedActions(booking) {
    if (!can("manage_bookings")) return [];
    return ({
      pending: ["confirmed", "propose", "reject", "cancelled"],
      proposed: ["confirmed", "reject", "cancelled"],
      confirmed: ["done", "cancelled"]
    })[booking.status] || [];
  }

  function actionButton(action) {
    const labels = {
      confirmed: text("تأكيد", "Confirm"), propose: text("اقتراح موعد", "Propose time"),
      reject: text("رفض الطلب", "Reject"), done: text("تم الحضور", "Complete"),
      cancelled: text("إلغاء", "Cancel")
    };
    const classes = action === "confirmed" ? "confirm" : action === "done" ? "done" : ["reject", "cancelled"].includes(action) ? "cancel" : "";
    return `<button class="booking-action ${classes}" type="button" data-action="${action}">${labels[action]}</button>`;
  }

  function render() {
    const allVisible = state.bookings.filter(localSearchMatch);
    elements.today.textContent = allVisible.length;
    elements.confirmed.textContent = allVisible.filter((booking) => booking.status === "confirmed").length;
    elements.pending.textContent = allVisible.filter((booking) => booking.status === "pending").length;
    elements.publicCount.textContent = allVisible.filter((booking) => booking.source === "public").length;
    elements.staffCount.textContent = allVisible.filter((booking) => booking.source === "staff").length;
    elements.ratingsDashboard.classList.toggle("hidden", state.activeSource !== "ratings");
    elements.list.classList.toggle("hidden", state.activeSource === "ratings");
    document.querySelector(".booking-filters").classList.toggle("hidden", state.activeSource === "ratings");
    if (state.activeSource === "ratings") {
      if (can("view_ratings")) fetchRatings();
      else elements.ratingsDashboard.innerHTML = `<div class="empty-state">${text("لا تملك صلاحية عرض التقييمات.", "You do not have permission to view ratings.")}</div>`;
      return;
    }
    const rows = visibleBookings();
    if (!rows.length) {
      elements.list.innerHTML = `<div class="empty-state">${text("لا توجد حجوزات مطابقة.", "No matching bookings.")}</div>`;
      return;
    }
    elements.list.innerHTML = rows.map((booking) => {
      const newRequest = booking.source === "public" && booking.status === "pending";
      const actions = allowedActions(booking).map(actionButton).join("");
      const phone = normalizeEgyptianPhone(booking.customerPhone);
      return `<article class="booking-card ${newRequest ? "new-public-request" : ""}" data-id="${escapeHtml(booking.id)}">
        <div class="booking-top">
          <div class="booking-customer"><div>${newRequest ? `<span class="new-request-badge">${text("طلب جديد", "New request")}</span>` : ""}<strong>${escapeHtml(booking.customerName || "-")}</strong></div>
            <span>${escapeHtml(booking.customerPhone || "-")}</span></div>
          <div class="booking-time"><span>${formatDate(booking.date)} · ${escapeHtml(formatTime(booking.time))}</span>
            <span class="booking-status status-${escapeHtml(booking.status)}">${statusLabel(booking.status)}</span></div>
        </div>
        <div class="booking-meta">
          <span>${text("الموظف", "Employee")}: <strong>${escapeHtml(booking.employee)}</strong></span>
          <span>${text("الخدمة", "Service")}: <strong>${escapeHtml(booking.service)}</strong></span>
          <span>${text("المدة", "Duration")}: <strong>${booking.durationMinutes} ${text("دقيقة", "min")}</strong></span>
          ${booking.trackingToken ? `<span>${text("كود المتابعة", "Tracking token")}: <strong class="tracking-token">${escapeHtml(booking.trackingToken)}</strong> <button class="icon-copy" type="button" data-action="copy-token" aria-label="${text("نسخ الكود", "Copy token")}">⧉</button></span>` : ""}
        </div>
        ${booking.note ? `<div class="booking-note">${escapeHtml(booking.note)}</div>` : ""}
        ${booking.status === "proposed" ? `<div class="booking-note">${text("الموعد المقترح", "Proposed")}: ${formatDate(booking.proposedDate)} · ${formatTime(booking.proposedTime)}</div>` : ""}
        ${holdCountdown(booking) ? `<div class="hold-countdown" data-hold-id="${escapeHtml(booking.id)}">${escapeHtml(holdCountdown(booking))}</div>` : ""}
        <div class="booking-actions">
          ${actions}
          ${phone ? `<a class="booking-action" href="tel:${escapeHtml(phone)}">${text("اتصال", "Call")}</a><button class="booking-action" type="button" data-action="whatsapp">WhatsApp</button>` : ""}
          ${can("delete_bookings") ? `<button class="booking-action delete" type="button" data-action="delete">${text("حذف", "Delete")}</button>` : ""}
        </div>
      </article>`;
    }).join("");
  }

  async function loadServiceOptions() {
    const response = await RomeoApi.request({ action: "getPublicBookingOptions", date: elements.date.value });
    if (response?.status !== "success") throw new Error(response?.message || "Could not load services.");
    state.services = response.services || [];
    state.barbers = response.barbers || [];
    elements.employee.innerHTML = `<option value="">${text("اختر الموظف", "Choose employee")}</option>` +
      state.barbers.map((barber) => `<option value="${escapeHtml(barber.staffId)}">${escapeHtml(barber.name)}</option>`).join("");
    renderServiceOptions();
  }

  function renderServiceOptions() {
    elements.services.innerHTML = state.services.map((service) => `
      <label class="internal-service-choice">
        <input type="checkbox" data-service-id="${escapeHtml(service.serviceId)}" ${state.selectedServiceIds.has(String(service.serviceId)) ? "checked" : ""}>
        <span><strong>${escapeHtml(service.name)}</strong><small>${Number(service.durationMinutes) || 30} ${text("دقيقة", "min")} · ${escapeHtml(money(service.price))}</small></span>
      </label>`).join("") + `
      <label class="internal-service-choice other-choice"><input type="checkbox" data-other-service ${state.otherService ? "checked" : ""}>
        <span><strong>${text("خدمة أخرى", "Other Service")}</strong><small>${text("اسم ومدة يدويان", "Manual name and duration")}</small></span></label>`;
    const selected = state.services.filter((service) => state.selectedServiceIds.has(String(service.serviceId)));
    const duration = selected.reduce((sum, service) => sum + (Number(service.durationMinutes) || 30), 0);
    const price = selected.reduce((sum, service) => sum + (Number(service.price) || 0), 0);
    elements.serviceSummary.textContent = state.otherService
      ? text("أدخل اسم الخدمة ومدتها.", "Enter the service name and duration.")
      : selected.length ? `${selected.length} · ${duration} ${text("دقيقة", "min")} · ${money(price)}` : text("اختر خدمة واحدة أو أكثر", "Choose one or more services");
    elements.otherFields.classList.toggle("hidden", !state.otherService);
  }

  async function loadInternalSlots() {
    const employeeId = elements.employee.value;
    const serviceIds = [...state.selectedServiceIds];
    const duration = state.otherService ? Number(elements.otherDuration.value) : 0;
    elements.time.innerHTML = `<option value="">${text("جاري تحميل المواعيد...", "Loading appointments...")}</option>`;
    elements.time.disabled = true;
    if (!elements.date.value || !employeeId || (!state.otherService && !serviceIds.length) || (state.otherService && duration < 15)) {
      elements.slotStatus.textContent = text("اختر التاريخ والموظف والخدمات.", "Choose date, employee, and services.");
      return;
    }
    try {
      const response = await RomeoApi.request({
        action: "getPublicBookingOptions", date: elements.date.value, serviceIds,
        durationMinutes: state.otherService ? duration : undefined
      });
      if (response?.status !== "success") throw new Error(response?.message || "Could not load slots.");
      const barber = (response.barbers || []).find((item) => String(item.staffId) === String(employeeId));
      const slots = barber?.slots || [];
      elements.time.innerHTML = `<option value="">${slots.length ? text("اختر الموعد", "Choose appointment") : text("لا توجد مواعيد", "No appointments")}</option>` +
        slots.map((time) => `<option value="${escapeHtml(time)}">${escapeHtml(formatTime(time))}</option>`).join("");
      elements.time.disabled = !slots.length;
      elements.slotStatus.textContent = slots.length ? "" : text("لا توجد مواعيد متاحة للمدة المختارة.", "No available appointments for the selected duration.");
    } catch (error) {
      elements.slotStatus.textContent = error.message;
    }
  }

  async function createBooking(event) {
    event.preventDefault();
    const selected = state.services.filter((service) => state.selectedServiceIds.has(String(service.serviceId)));
    if ((!selected.length && !state.otherService) || (state.otherService && (!elements.otherName.value.trim() || Number(elements.otherDuration.value) < 15))) {
      return notify(text("اختر الخدمات أو أكمل بيانات الخدمة الأخرى.", "Select services or complete Other Service details."), "error");
    }
    const employeeOption = elements.employee.selectedOptions[0];
    setButtonBusy(elements.save, true);
    state.busy = true;
    try {
      const response = await RomeoApi.request(attachClientRequestId({
        action: "createBooking", customerName: elements.customerName.value.trim(),
        customerPhone: elements.customerPhone.value.trim(), date: elements.date.value, time: elements.time.value,
        employeeId: elements.employee.value, employee: employeeOption?.textContent || "",
        serviceId: state.otherService ? "" : selected[0]?.serviceId,
        serviceIds: state.otherService ? [] : selected.map((service) => service.serviceId),
        service: state.otherService ? elements.otherName.value.trim() : selected.map((service) => service.name).join(", "),
        durationMinutes: state.otherService ? Number(elements.otherDuration.value) : selected.reduce((sum, service) => sum + Number(service.durationMinutes || 30), 0),
        totalPrice: state.otherService ? 0 : selected.reduce((sum, service) => sum + Number(service.price || 0), 0),
        note: elements.note.value.trim(), status: "pending", source: "staff"
      }));
      if (response?.status !== "success") throw new Error(response?.message || text("تعذر حفظ الحجز.", "Could not save booking."));
      notify(text("تم حفظ الحجز.", "Booking saved."), "success");
      state.pendingCreateRequest = null;
      resetForm();
    } catch (error) {
      notify(error.message, "error");
    } finally {
      state.busy = false; setButtonBusy(elements.save, false); await fetchBookings();
    }
  }

  function resetForm() {
    const keepDate = elements.date.value;
    elements.form.reset(); elements.date.value = keepDate || todayKey();
    state.selectedServiceIds.clear(); state.otherService = false; state.pendingCreateRequest = null;
    renderServiceOptions(); loadInternalSlots();
  }

  async function updateStatus(booking, status, extra = {}, button) {
    setButtonBusy(button, true);
    state.busy = true;
    try {
      const response = await RomeoApi.request({ action: "updateBooking", id: booking.id, status, ...extra });
      if (response?.status !== "success") throw new Error(response?.message || text("تعذر تحديث الحجز.", "Could not update booking."));
      notify(text("تم تحديث الحجز.", "Booking updated."), "success");
      state.busy = false;
      await fetchBookings({ silent: true });
    } finally {
      state.busy = false;
      if (document.body.contains(button)) setButtonBusy(button, false);
    }
  }

  async function proposalModal(booking) {
    showModal({
      title: text("اقتراح موعد جديد", "Propose a new appointment"), confirmText: text("إرسال الاقتراح", "Send proposal"),
      body: `<label><span>${text("التاريخ", "Date")}</span><input id="proposalDate" type="date" min="${todayKey()}" value="${escapeHtml(booking.date)}"></label>
        <label><span>${text("الموعد المتاح", "Available appointment")}</span><select id="proposalTime" disabled><option>${text("جاري التحميل...", "Loading...")}</option></select></label>
        <small id="proposalStatus" aria-live="polite"></small>`,
      onOpen: (body) => {
        const load = async () => {
          const response = await RomeoApi.request({
            action: "getPublicBookingOptions", date: body.querySelector("#proposalDate").value,
            serviceIds: booking.serviceIds, durationMinutes: booking.serviceIds.length ? undefined : booking.durationMinutes
          });
          const barber = (response.barbers || []).find((item) => item.staffId === booking.employeeId || item.name === booking.employee);
          const select = body.querySelector("#proposalTime");
          const slots = barber?.slots || [];
          select.innerHTML = `<option value="">${slots.length ? text("اختر الموعد", "Choose time") : text("لا توجد مواعيد متاحة", "No available appointments")}</option>` +
            slots.map((time) => `<option value="${time}">${formatTime(time)}</option>`).join("");
          select.disabled = !slots.length;
          body.querySelector("#proposalStatus").textContent = slots.length ? "" : text("لا توجد مواعيد متاحة للمدة المختارة.", "No available appointments for the selected duration.");
        };
        body.querySelector("#proposalDate").onchange = load; load();
      },
      onConfirm: async (body) => {
        const proposedDate = body.querySelector("#proposalDate").value;
        const proposedTime = body.querySelector("#proposalTime").value;
        if (!proposedDate || !proposedTime) { notify(text("اختر موعدًا متاحًا.", "Choose an available appointment."), "error"); return false; }
        await updateStatus(booking, "proposed", { proposedDate, proposedTime });
        return true;
      }
    });
  }

  function reasonModal(booking, type) {
    const config = {
      reject: { title: text("رفض طلب الحجز", "Reject booking request"), label: text("سبب الرفض", "Rejection reason"), status: "rejected", key: "rejectionReason" },
      cancelled: { title: text("إلغاء الحجز", "Cancel booking"), label: text("سبب الإلغاء", "Cancellation reason"), status: "cancelled", key: "cancellationReason" },
      delete: { title: text("حذف الحجز", "Delete booking"), label: text("سبب الحذف", "Deletion reason"), status: null, key: "reason" }
    }[type];
    showModal({
      title: config.title, confirmText: type === "delete" ? text("حذف", "Delete") : text("تأكيد", "Confirm"), danger: true,
      body: `<p>${type === "delete" ? text("سيتم إخفاء الحجز مع الاحتفاظ بالصف في ورقة البيانات.", "The booking will be hidden while its sheet row is retained.") : ""}</p>
        <label><span>${config.label}</span><textarea id="actionReason" maxlength="500" required></textarea></label>`,
      onConfirm: async (body) => {
        const reason = body.querySelector("#actionReason").value.trim();
        if (!reason) { notify(config.label, "error"); return false; }
        if (type === "delete") {
          const response = await RomeoApi.request({ action: "deleteBooking", id: booking.id, reason });
          if (response?.status !== "success") throw new Error(response?.message || "Could not delete booking.");
          notify(text("تم حذف الحجز مع الاحتفاظ بصف البيانات.", "Booking soft-deleted."), "success");
          await fetchBookings({ silent: true });
        } else {
          await updateStatus(booking, config.status, { [config.key]: reason });
        }
        return true;
      }
    });
  }

  function whatsapp(booking) {
    const phone = normalizeEgyptianPhone(booking.customerPhone);
    if (!phone) return;
    const international = phone.startsWith("0") ? `20${phone.slice(1)}` : phone;
    const statusMessage = {
      pending: text("طلب حجزك قيد المراجعة", "your booking request is under review"),
      confirmed: text("تم تأكيد حجزك", "your booking is confirmed"),
      proposed: text("اقترحنا لك موعدًا بديلًا", "we proposed a different appointment"),
      cancelled: text("تم إلغاء الحجز", "your booking was cancelled"),
      done: text("شكرًا لزيارتك", "thank you for visiting")
    }[booking.status] || text("بخصوص حجزك", "regarding your booking");
    const message = `${text("مرحبًا", "Hello")} ${booking.customerName}، ${statusMessage}: ${booking.service} ${formatDate(booking.date)} ${formatTime(booking.time)}.`;
    window.open(`https://wa.me/${international}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  async function copyToken(booking) {
    try { await navigator.clipboard.writeText(booking.trackingToken); notify(text("تم نسخ الكود.", "Tracking token copied."), "success"); }
    catch (_) { notify(booking.trackingToken); }
  }

  async function handleAction(event) {
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) return;
    const card = button.closest("[data-id]");
    const booking = state.bookings.find((item) => item.id === card?.dataset.id);
    if (!booking) return;
    try {
      const action = button.dataset.action;
      if (action === "propose") proposalModal(booking);
      else if (action === "reject" || action === "cancelled" || action === "delete") reasonModal(booking, action);
      else if (action === "whatsapp") whatsapp(booking);
      else if (action === "copy-token") copyToken(booking);
      else await updateStatus(booking, action, {}, button);
    } catch (error) {
      notify(error.message || text("تعذر تنفيذ الإجراء.", "Could not complete action."), "error");
    }
  }

  async function fetchRatings() {
    if (!can("view_ratings") || state.busy) return;
    state.busy = true;
    elements.ratingsList.innerHTML = `<div class="empty-state">${text("جاري تحميل التقييمات...", "Loading ratings...")}</div>`;
    try {
      const response = await RomeoApi.request({
        action: "getRatingsAdmin",
        filters: { employeeId: elements.ratingEmployee.value, status: elements.ratingStatus.value, fromDate: elements.ratingFrom.value, toDate: elements.ratingTo.value, pageSize: 100 }
      });
      if (response?.status !== "success") throw new Error(response?.message || "Could not load ratings.");
      state.ratings = response.ratings || []; state.ratingMeta = response;
      elements.ratingsCount.textContent = response.total || 0;
      renderRatings();
    } catch (error) {
      elements.ratingsList.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    } finally { state.busy = false; }
  }

  function renderRatings() {
    const meta = state.ratingMeta || {};
    const change = Number(meta.currentMonthAverage || 0) - Number(meta.previousMonthAverage || 0);
    elements.ratingsSummary.innerHTML = `
      <div><span>${text("متوسط الشهر الحالي", "Current month average")}</span><strong>★ ${Number(meta.currentMonthAverage || 0).toFixed(1)}</strong></div>
      <div><span>${text("التغير عن الشهر السابق", "Change vs previous month")}</span><strong class="${change < 0 ? "negative" : ""}">${change >= 0 ? "+" : ""}${change.toFixed(1)}</strong></div>
      <div><span>${text("تقييمات منخفضة للمراجعة", "Low ratings to review")}</span><strong>${(meta.lowestRatings || []).length}</strong></div>`;
    elements.barberSummaries.innerHTML = (meta.barberSummaries || []).map((summary) => `
      <article><strong>${escapeHtml(summary.employeeName)}</strong><span>★ ${Number(summary.averageRating).toFixed(1)} · ${summary.ratingsCount}</span>
        <small>${[5,4,3,2,1].map((star) => `${star}★ ${summary.distribution?.[star] || 0}`).join(" · ")}</small></article>`).join("");
    const knownEmployee = elements.ratingEmployee.value;
    elements.ratingEmployee.innerHTML = `<option value="">${text("كل المصففين", "All barbers")}</option>` +
      (meta.barberSummaries || []).map((summary) => `<option value="${escapeHtml(summary.employeeId)}">${escapeHtml(summary.employeeName)}</option>`).join("");
    elements.ratingEmployee.value = knownEmployee;
    elements.ratingsList.innerHTML = state.ratings.length ? state.ratings.map((rating) => `
      <article class="rating-admin-card" data-rating-id="${escapeHtml(rating.ratingId)}">
        <div><strong>${escapeHtml(rating.employeeName)} · ${"★".repeat(rating.rating)}</strong><span class="rating-status status-${escapeHtml(rating.status)}">${escapeHtml(rating.status)}</span></div>
        <small>${formatDate(rating.bookingDate)} · ${escapeHtml(rating.service)}</small>
        <p>${escapeHtml(rating.comment || text("لا يوجد تعليق.", "No comment."))}</p>
        ${can("manage_ratings") ? `<div class="booking-actions">${["published","hidden","flagged"].map((status) => `<button class="booking-action" data-rating-status="${status}" ${rating.status === status ? "disabled" : ""}>${status}</button>`).join("")}</div>` : ""}
      </article>`).join("") : `<div class="empty-state">${text("لا توجد تقييمات مطابقة.", "No matching ratings.")}</div>`;
  }

  elements.ratingsList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-rating-status]");
    if (!button) return;
    setButtonBusy(button, true);
    const ratingId = button.closest("[data-rating-id]").dataset.ratingId;
    const response = await RomeoApi.request({ action: "updateRatingStatus", ratingId, ratingStatus: button.dataset.ratingStatus });
    if (response?.status !== "success") notify(response?.message || "Could not update rating.", "error");
    else { notify(text("تم تحديث حالة التقييم.", "Rating status updated."), "success"); await fetchRatings(); }
  });

  function updateCountdowns() {
    let shouldRefresh = false;
    document.querySelectorAll("[data-hold-id]").forEach((node) => {
      const booking = state.bookings.find((item) => item.id === node.dataset.holdId);
      const label = booking ? holdCountdown(booking) : "";
      node.textContent = label;
      if (booking?.status === "pending" && booking.holdExpiresAt && new Date(booking.holdExpiresAt).getTime() <= Date.now()) {
        booking.status = "expired"; shouldRefresh = true;
      }
    });
    if (shouldRefresh && !state.busy && !state.modalOpen) fetchBookings({ silent: true });
  }

  elements.form.addEventListener("submit", createBooking);
  elements.clear.addEventListener("click", resetForm);
  elements.services.addEventListener("change", (event) => {
    const service = event.target.closest("[data-service-id]");
    const other = event.target.closest("[data-other-service]");
    if (service) {
      state.otherService = false;
      if (service.checked) state.selectedServiceIds.add(service.dataset.serviceId);
      else state.selectedServiceIds.delete(service.dataset.serviceId);
    }
    if (other) {
      state.otherService = other.checked;
      if (state.otherService) state.selectedServiceIds.clear();
    }
    renderServiceOptions(); loadInternalSlots();
  });
  elements.date.addEventListener("change", loadInternalSlots);
  elements.employee.addEventListener("change", loadInternalSlots);
  elements.otherDuration.addEventListener("input", () => { clearTimeout(loadInternalSlots.timer); loadInternalSlots.timer = setTimeout(loadInternalSlots, 350); });
  elements.filterDate.addEventListener("change", fetchBookings);
  elements.status.addEventListener("change", fetchBookings);
  elements.search.addEventListener("input", render);
  elements.list.addEventListener("click", handleAction);
  elements.sourceTabs.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-source]");
    if (!tab) return;
    state.activeSource = tab.dataset.source;
    elements.sourceTabs.querySelectorAll("[data-source]").forEach((item) => {
      item.classList.toggle("active", item === tab); item.setAttribute("aria-selected", String(item === tab));
    });
    render();
  });
  [elements.ratingEmployee, elements.ratingStatus, elements.ratingFrom, elements.ratingTo].forEach((control) => control.addEventListener("change", fetchRatings));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.modalOpen) elements.modal.querySelector("[data-modal-cancel]")?.click();
    if (event.key === "Tab" && state.modalOpen) {
      const focusable = [...elements.modal.querySelectorAll("button,input,select,textarea")].filter((node) => !node.disabled);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  if (!can("create_bookings")) elements.formPanel.classList.add("hidden");
  if (!can("view_ratings")) document.querySelector(".ratings-tab")?.classList.add("hidden");
  elements.date.value = todayKey();
  elements.date.min = todayKey();
  elements.filterDate.value = todayKey();
  Promise.all([loadServiceOptions(), fetchBookings()]).catch((error) => notify(error.message, "error"));
  state.countdownTimer = setInterval(updateCountdowns, 1000);
  state.refreshTimer = setInterval(() => {
    if (!state.modalOpen && !state.busy) {
      if (state.activeSource === "ratings") fetchRatings();
      else fetchBookings({ silent: true });
    }
  }, 45000);
})();
