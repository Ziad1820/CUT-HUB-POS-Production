(() => {
  "use strict";

  const elements = {
    bookingWorkspace: document.getElementById("bookingWorkspace"),
    trackingWorkspace: document.getElementById("trackingWorkspace"),
    trackingContent: document.getElementById("trackingContent"),
    openTracking: document.getElementById("openTrackingBtn"),
    newBooking: document.getElementById("newBookingBtn"),
    services: document.getElementById("publicServices"),
    serviceSummary: document.getElementById("serviceSelectionSummary"),
    date: document.getElementById("publicDate"),
    barberGrid: document.getElementById("barberGrid"),
    customerPanel: document.getElementById("customerPanel"),
    summary: document.getElementById("bookingSummary"),
    form: document.getElementById("publicBookingForm"),
    name: document.getElementById("publicCustomerName"),
    phone: document.getElementById("publicCustomerPhone"),
    note: document.getElementById("publicNote"),
    submit: document.getElementById("submitPublicBooking")
  };

  const state = {
    services: [],
    selectedServiceIds: new Set(),
    barbers: [],
    employeeId: "",
    employeeName: "",
    time: "",
    loading: false,
    reloadPending: false
  };

  async function publicRequest(payload) {
    const response = await fetch(RomeoApi.API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error("تعذر الاتصال بنظام الحجز.");
    const result = await response.json();
    if (result?.status === "error") {
      const error = new Error(result.message || "تعذر تنفيذ طلب الحجز.");
      error.code = result.code || "";
      throw error;
    }
    return result;
  }

  function todayKey() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function selectedServices() {
    return state.services.filter((service) => state.selectedServiceIds.has(service.serviceId));
  }

  function isStandaloneService(service) {
    const name = String(service?.name || "").toLowerCase();
    const separators = (name.match(/[-–—]/g) || []).length;
    return name
      && !/[+＋]/.test(name)
      && !/باك(?:ي)?دج|package|pack|vip/i.test(name)
      && separators < 2;
  }

  function selectedDuration() {
    return selectedServices().reduce((total, service) => total + (Number(service.durationMinutes) || 30), 0);
  }

  function renderServicePicker() {
    elements.services.innerHTML = state.services.map((service) => `
      <label class="service-choice">
        <input type="checkbox" data-service-id="${escapeHtml(service.serviceId)}" ${state.selectedServiceIds.has(service.serviceId) ? "checked" : ""}>
        <span class="service-choice-text">
          <span class="service-choice-name">${escapeHtml(service.name)}</span>
          <span class="service-choice-duration">${Number(service.durationMinutes) || 30} دقيقة</span>
        </span>
      </label>`).join("") || '<div class="service-picker-loading">لا توجد خدمات متاحة للحجز حاليًا.</div>';
    const count = selectedServices().length;
    elements.serviceSummary.textContent = count
      ? `${count} خدمة محددة - المدة الإجمالية ${selectedDuration()} دقيقة`
      : "اختر خدمة واحدة أو أكثر";
  }

  function formatDate(value) {
    const parts = String(value || "").split("-");
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
  }

  function formatTime12(value) {
    const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return value || "-";
    const hours = Number(match[1]) % 24;
    const period = hours >= 12 ? "PM" : "AM";
    return `${hours % 12 || 12}:${match[2]} ${period}`;
  }

  function statusText(status) {
    return ({
      pending: "طلبك بانتظار التأكيد",
      confirmed: "تم تأكيد الحجز",
      proposed: "CUT HUB اقترح عليك موعدًا بديلًا",
      rejected: "تعذر تأكيد الحجز",
      cancelled: "تم إلغاء الحجز",
      done: "تم تنفيذ الحجز",
      expired: "انتهت صلاحية الطلب"
    })[status] || "جاري مراجعة الطلب";
  }

  async function loadOptions() {
    if (state.loading) {
      state.reloadPending = true;
      return;
    }
    state.loading = true;
    state.employeeId = "";
    state.employeeName = "";
    state.time = "";
    elements.customerPanel.classList.add("hidden");
    elements.barberGrid.innerHTML = '<div class="empty-public-state">جاري تحميل المواعيد المتاحة...</div>';
    try {
      const requestedServiceIds = Array.from(state.selectedServiceIds);
      const response = await publicRequest({ action: "getPublicBookingOptions", date: elements.date.value, serviceIds: requestedServiceIds });
      if (response?.status !== "success") throw new Error(response?.message || "تعذر تحميل المواعيد.");
      state.services = Array.isArray(response.services) ? response.services.filter(isStandaloneService) : [];
      state.barbers = Array.isArray(response.barbers) ? response.barbers : [];
      const availableIds = new Set(state.services.map((service) => service.serviceId));
      state.selectedServiceIds = new Set(Array.from(state.selectedServiceIds).filter((id) => availableIds.has(id)));
      if (!state.selectedServiceIds.size && state.services[0]) state.selectedServiceIds.add(state.services[0].serviceId);
      renderServicePicker();
      renderBarbers();
    } catch (error) {
      elements.barberGrid.innerHTML = `<div class="empty-public-state">${escapeHtml(error.message || "تعذر تحميل المواعيد.")}</div>`;
    } finally {
      state.loading = false;
      if (state.reloadPending) {
        state.reloadPending = false;
        loadOptions();
      }
    }
  }

  function renderBarbers() {
    if (!state.barbers.length) {
      elements.barberGrid.innerHTML = '<div class="empty-public-state">لا توجد مواعيد متاحة في التاريخ المحدد.</div>';
      return;
    }
    const labels = { available: "متاح للحجز", unavailable: "غير متاح", not_started: "لم يبدأ الشيفت" };
    elements.barberGrid.innerHTML = state.barbers.map((barber) => `
      <article class="barber-card ${state.employeeId === barber.staffId ? "selected" : ""}" data-barber-id="${escapeHtml(barber.staffId)}">
        <div class="barber-head">
          <div><h3 class="barber-name">${escapeHtml(barber.name)}</h3><div class="barber-shift">الشيفت: ${escapeHtml(formatTime12(barber.shiftStart))} - ${escapeHtml(formatTime12(barber.shiftEnd))}</div></div>
          <span class="availability-badge ${escapeHtml(barber.availability)}">${labels[barber.availability] || labels.unavailable}</span>
        </div>
        <div class="slots">${(barber.slots || []).map((time) => `<button class="slot-btn ${state.employeeId === barber.staffId && state.time === time ? "selected" : ""}" type="button" data-time="${escapeHtml(time)}">${escapeHtml(formatTime12(time))}</button>`).join("") || '<span class="barber-shift">لا توجد مواعيد فارغة</span>'}</div>
      </article>`).join("");
  }

  function selectSlot(employeeId, time) {
    const barber = state.barbers.find((item) => item.staffId === employeeId);
    if (!barber || !(barber.slots || []).includes(time)) return;
    state.employeeId = employeeId;
    state.employeeName = barber.name;
    state.time = time;
    const serviceNames = selectedServices().map((service) => service.name).join("، ");
    elements.summary.textContent = `${serviceNames || "الخدمات"} مع ${barber.name} يوم ${formatDate(elements.date.value)} الساعة ${formatTime12(time)} - المدة ${selectedDuration()} دقيقة`;
    elements.customerPanel.classList.remove("hidden");
    renderBarbers();
    elements.customerPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submitBooking(event) {
    event.preventDefault();
    const services = selectedServices();
    if (!services.length || !state.employeeId || !state.time) return alert("اختار الخدمات والمصفف والميعاد الأول.");
    elements.submit.disabled = true;
    elements.submit.textContent = "جاري إرسال الطلب...";
    try {
      const response = await publicRequest({
        action: "createPublicBookingRequest",
        serviceId: services[0].serviceId,
        serviceIds: services.map((service) => service.serviceId),
        employeeId: state.employeeId,
        date: elements.date.value,
        time: state.time,
        customerName: elements.name.value.trim(),
        customerPhone: elements.phone.value.trim(),
        note: elements.note.value.trim()
      });
      if (response?.status !== "success") throw new Error(response?.message || "تعذر إرسال الطلب.");
      const url = new URL(window.location.href);
      url.search = "";
      url.searchParams.set("tracking", response.trackingToken);
      history.replaceState({}, "", url.href);
      showTracking(response.trackingToken);
    } catch (error) {
      alert(error.message || "تعذر إرسال الطلب.");
      if (error.code === "SLOT_UNAVAILABLE") await loadOptions();
    } finally {
      elements.submit.disabled = false;
      elements.submit.textContent = "إرسال طلب الحجز";
    }
  }

  async function showTracking(token) {
    if (!token) {
      const entered = prompt("اكتب كود متابعة الحجز:");
      if (!entered) return;
      token = entered.trim().toUpperCase();
    }
    elements.bookingWorkspace.classList.add("hidden");
    elements.trackingWorkspace.classList.remove("hidden");
    elements.trackingContent.className = "state-message";
    elements.trackingContent.textContent = "جاري تحميل حالة الحجز...";
    try {
      const response = await publicRequest({ action: "getPublicBookingStatus", trackingToken: token });
      if (response?.status !== "success") throw new Error(response?.message || "تعذر تحميل الحجز.");
      renderTracking(response.booking, token);
    } catch (error) {
      elements.trackingContent.className = "state-message";
      elements.trackingContent.textContent = error.message || "تعذر تحميل الحجز.";
    }
  }

  function renderTracking(booking, token) {
    const proposal = booking.status === "proposed" ? `
      <div class="booking-summary">الموعد المقترح: ${formatDate(booking.proposedDate)} الساعة ${escapeHtml(formatTime12(booking.proposedTime))}</div>
      <div class="proposal-actions">
        <button class="primary-action" type="button" data-proposal="accept">موافق على الموعد</button>
        <button class="primary-action danger-action" type="button" data-proposal="decline">غير مناسب</button>
      </div>` : "";
    elements.trackingContent.className = "tracking-card";
    elements.trackingContent.innerHTML = `
      <div class="tracking-status">${escapeHtml(statusText(booking.status))}</div>
      <div class="tracking-code-card">
        <span>كود متابعة الحجز</span>
        <strong dir="ltr">${escapeHtml(token)}</strong>
        <button class="secondary-action" type="button" data-copy-tracking>نسخ الكود</button>
        <small>احتفظ بالكود لمتابعة حالة طلبك في أي وقت.</small>
      </div>
      <div class="tracking-details">
        <div><span>الخدمة</span><strong>${escapeHtml(booking.service)}</strong></div>
        <div><span>الحلاق</span><strong>${escapeHtml(booking.employee)}</strong></div>
        <div><span>التاريخ</span><strong>${formatDate(booking.date)}</strong></div>
        <div><span>الوقت</span><strong>${escapeHtml(formatTime12(booking.time))}</strong></div>
      </div>
      ${booking.rejectionReason ? `<div class="booking-summary">${escapeHtml(booking.rejectionReason)}</div>` : ""}
      ${proposal}
      <div class="form-actions"><button class="secondary-action" type="button" data-refresh-status>تحديث الحالة</button></div>`;
    elements.trackingContent.querySelector("[data-copy-tracking]")?.addEventListener("click", (event) => copyTrackingToken(token, event.currentTarget));
    elements.trackingContent.querySelector("[data-refresh-status]")?.addEventListener("click", () => showTracking(token));
    elements.trackingContent.querySelectorAll("[data-proposal]").forEach((button) => button.addEventListener("click", () => respondToProposal(token, button.dataset.proposal)));
  }

  async function copyTrackingToken(token, button) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(token);
      } else {
        const input = document.createElement("textarea");
        input.value = token;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
      }
      const originalText = button.textContent;
      button.textContent = "تم النسخ";
      setTimeout(() => { button.textContent = originalText; }, 1800);
    } catch (error) {
      alert(`كود المتابعة: ${token}`);
    }
  }

  async function respondToProposal(token, responseValue) {
    try {
      const response = await publicRequest({ action: "respondToBookingProposal", trackingToken: token, response: responseValue });
      if (response?.status !== "success") throw new Error(response?.message || "تعذر تحديث الطلب.");
      renderTracking(response.booking, token);
    } catch (error) { alert(error.message || "تعذر تحديث الطلب."); }
  }

  function showNewBooking() {
    const url = new URL(window.location.href);
    url.search = "";
    history.replaceState({}, "", url.href);
    elements.trackingWorkspace.classList.add("hidden");
    elements.bookingWorkspace.classList.remove("hidden");
    loadOptions();
  }

  elements.date.min = todayKey();
  elements.date.value = todayKey();
  elements.services.addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-service-id]");
    if (!checkbox) return;
    if (checkbox.checked) state.selectedServiceIds.add(checkbox.dataset.serviceId);
    else state.selectedServiceIds.delete(checkbox.dataset.serviceId);
    renderServicePicker();
    if (!state.selectedServiceIds.size) {
      state.barbers = [];
      state.employeeId = "";
      state.time = "";
      elements.customerPanel.classList.add("hidden");
      elements.barberGrid.innerHTML = '<div class="empty-public-state">اختر خدمة واحدة على الأقل لعرض المواعيد.</div>';
      return;
    }
    loadOptions();
  });
  elements.date.addEventListener("change", loadOptions);
  elements.barberGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-time]");
    const card = event.target.closest("[data-barber-id]");
    if (button && card) selectSlot(card.dataset.barberId, button.dataset.time);
  });
  elements.form.addEventListener("submit", submitBooking);
  elements.openTracking.addEventListener("click", () => showTracking(""));
  elements.newBooking.addEventListener("click", showNewBooking);

  const trackingToken = new URLSearchParams(window.location.search).get("tracking");
  if (trackingToken) showTracking(trackingToken); else loadOptions();
})();
