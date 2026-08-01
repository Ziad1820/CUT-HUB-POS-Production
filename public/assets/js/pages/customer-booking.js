(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const elements = {
    bookingWorkspace: $("bookingWorkspace"), trackingWorkspace: $("trackingWorkspace"),
    services: $("publicServices"), serviceSummary: $("serviceSelectionSummary"),
    branch: $("publicBranch"), date: $("publicDate"), barberGrid: $("barberGrid"), anyBarber: $("anyBarberBtn"),
    customerPanel: $("customerPanel"), summary: $("bookingSummary"), form: $("publicBookingForm"),
    customerName: $("publicCustomerName"), customerPhone: $("publicCustomerPhone"), note: $("publicNote"),
    submit: $("submitPublicBooking"), trackingContent: $("trackingContent"),
    openTracking: $("openTrackingBtn"), newBooking: $("newBookingBtn"),
    toast: $("toastRegion"), live: $("liveStatus"), steps: $("stepIndicator"),
    modal: $("publicModal"), modalTitle: $("publicModalTitle"), modalBody: $("publicModalBody"),
    modalActions: $("publicModalActions"), language: $("languageToggle")
  };

  const state = {
    services: [], selectedServiceIds: new Set(), barbers: [], branches: [],
    employeeId: "", employeeName: "", time: "", loading: false,
    trackingToken: "", phoneLast4: "", language: "ar", lastFocus: null,
    pendingCreateRequest: null, availabilityToken: "", availabilityPollTimer: null,
    availabilityPollDelay: 30000, availabilityRequestSequence: 0,
    liveRefreshEnabled: false, pendingProposalRequests: {}
  };

  const copy = {
    ar: {
      loadingServices: "جاري تحميل الخدمات...", noServices: "لا توجد خدمات متاحة حاليًا.",
      chooseServices: "اختر خدمة واحدة أو أكثر", selected: "خدمة محددة",
      loadingSlots: "جاري تحميل المواعيد...", noSlots: "لا توجد مواعيد متاحة للمدة المختارة.",
      available: "متاح", unavailable: "غير متاح", notStarted: "لم يبدأ الدوام",
      newBarber: "مصفف جديد", ratings: "تقييم", earliest: "أقرب موعد", recommended: "موصى به",
      requiredSelection: "اختر الخدمات والمصفف والموعد أولًا.",
      invalidPhone: "أدخل رقم موبايل مصري صحيحًا يبدأ بـ 010 أو 011 أو 012 أو 015.",
      sending: "جاري إرسال الطلب...", sent: "تم إرسال طلب الحجز بنجاح.",
      slotGone: "هذا الموعد لم يعد متاحًا. احتفظنا ببياناتك؛ اختر موعدًا آخر.",
      error: "تعذر تنفيذ الطلب. حاول مرة أخرى.", verifyTitle: "التحقق من الحجز",
      verifyHelp: "أدخل كود المتابعة وآخر أربعة أرقام من رقم الهاتف.",
      open: "فتح الحجز", cancel: "إلغاء", expired: "انتهت مهلة الاحتفاظ بطلب الحجز.",
      expiredAgain: "يمكنك إرسال طلب حجز جديد.", newBooking: "ابدأ حجزًا جديدًا",
      requestPending: "هذا طلب حجز ويحتاج إلى تأكيد من الصالون.",
      thankYou: "شكرًا لمشاركتنا رأيك.", ratingQuestion: "كيف كانت تجربتك مع",
      submitRating: "إرسال التقييم", optionalComment: "تعليق اختياري", copyDone: "تم النسخ.",
      statuses: { pending: "بانتظار التأكيد", proposed: "موعد بديل مقترح", confirmed: "تم تأكيد الحجز", rejected: "تم رفض الطلب", done: "اكتمل الحجز", cancelled: "تم إلغاء الحجز", expired: "انتهت مهلة الطلب" }
    },
    en: {
      loadingServices: "Loading services...", noServices: "No services are currently available.",
      chooseServices: "Choose one or more services", selected: "selected services",
      loadingSlots: "Loading appointments...", noSlots: "No available appointments for the selected duration.",
      available: "Available", unavailable: "Unavailable", notStarted: "Shift not started",
      newBarber: "New Barber", ratings: "ratings", earliest: "Earliest appointment", recommended: "Recommended",
      requiredSelection: "Choose services, a barber, and an appointment first.",
      invalidPhone: "Enter a valid Egyptian mobile number starting with 010, 011, 012, or 015.",
      sending: "Sending booking request...", sent: "Booking request sent successfully.",
      slotGone: "That appointment is no longer available. Your details were kept; choose another time.",
      error: "The request could not be completed. Please try again.", verifyTitle: "Verify booking",
      verifyHelp: "Enter the tracking code and the last four phone digits.",
      open: "Open booking", cancel: "Cancel", expired: "The booking request hold has expired.",
      expiredAgain: "You can submit a new booking request.", newBooking: "Start a new booking",
      requestPending: "This is a booking request and requires confirmation from the salon.",
      thankYou: "Thank you for your feedback.", ratingQuestion: "How was your experience with",
      submitRating: "Submit rating", optionalComment: "Optional comment", copyDone: "Copied.",
      statuses: { pending: "Pending confirmation", proposed: "New appointment proposed", confirmed: "Booking confirmed", rejected: "Request rejected", done: "Booking completed", cancelled: "Booking cancelled", expired: "Request hold expired" }
    }
  };

  const tr = (key) => copy[state.language][key] || key;
  const newClientRequestId = () => globalThis.crypto?.randomUUID
    ? `public-${globalThis.crypto.randomUUID()}`
    : `public-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
  const attachClientRequestId = (payload) => {
    const fingerprint = JSON.stringify(payload);
    if (!state.pendingCreateRequest || state.pendingCreateRequest.fingerprint !== fingerprint) {
      state.pendingCreateRequest = { fingerprint, id: newClientRequestId() };
    }
    return { ...payload, clientRequestId: state.pendingCreateRequest.id };
  };
  function applyLanguage() {
    document.documentElement.lang = state.language;
    document.documentElement.dir = state.language === "ar" ? "rtl" : "ltr";
    elements.language.textContent = state.language === "ar" ? "English" : "العربية";
    document.querySelectorAll("[data-ui-ar][data-ui-en]").forEach((node) => {
      node.textContent = node.dataset[state.language === "ar" ? "uiAr" : "uiEn"];
    });
    elements.note.placeholder = state.language === "ar" ? "أي تفاصيل مهمة للحجز" : "Any important booking details";
    elements.customerPhone.placeholder = state.language === "ar" ? "010xxxxxxxx أو +2010xxxxxxxx" : "010xxxxxxxx or +2010xxxxxxxx";
  }
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const todayKey = () => {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const part = (type) => parts.find((item) => item.type === type)?.value;
    return `${part("year")}-${part("month")}-${part("day")}`;
  };
  const formatDate = (value) => value ? new Intl.DateTimeFormat(state.language === "ar" ? "ar-EG" : "en-GB", {
    timeZone: "Africa/Cairo", weekday: "short", year: "numeric", month: "short", day: "numeric"
  }).format(new Date(`${value}T12:00:00`)) : "";
  const formatTime = (value) => {
    if (!value) return "";
    const [hours, minutes] = value.split(":").map(Number);
    return new Intl.DateTimeFormat(state.language === "ar" ? "ar-EG" : "en-US", { hour: "numeric", minute: "2-digit" })
      .format(new Date(2020, 0, 1, hours, minutes));
  };
  const money = (value) => new Intl.NumberFormat(state.language === "ar" ? "ar-EG" : "en-EG", {
    style: "currency", currency: "EGP", maximumFractionDigits: 0
  }).format(Number(value) || 0);

  async function publicRequest(payload) {
    return RomeoApi.request(payload);
  }

  function notify(message, kind = "info") {
    elements.toast.textContent = message;
    elements.toast.dataset.kind = kind;
    elements.toast.classList.add("visible");
    elements.live.textContent = message;
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => elements.toast.classList.remove("visible"), 4200);
  }

  function setStep(step) {
    elements.steps.querySelectorAll("[data-step]").forEach((item) => {
      const number = Number(item.dataset.step);
      item.classList.toggle("active", number === step);
      item.classList.toggle("complete", number < step);
    });
  }

  function showModal({ title, body, confirmText = tr("open"), cancelText = tr("cancel"), onConfirm, onOpen }) {
    state.lastFocus = document.activeElement;
    elements.modalTitle.textContent = title;
    elements.modalBody.innerHTML = body;
    elements.modalActions.innerHTML = `
      <button class="secondary-action" type="button" data-modal-cancel>${escapeHtml(cancelText)}</button>
      <button class="primary-action" type="button" data-modal-confirm>${escapeHtml(confirmText)}</button>`;
    elements.modal.classList.remove("hidden");
    document.body.classList.add("modal-open");
    const close = () => {
      elements.modal.classList.add("hidden");
      document.body.classList.remove("modal-open");
      state.lastFocus?.focus();
    };
    elements.modal.querySelector("[data-modal-cancel]").onclick = close;
    elements.modal.querySelector("[data-modal-confirm]").onclick = async () => {
      const shouldClose = await onConfirm?.(elements.modalBody);
      if (shouldClose !== false) close();
    };
    elements.modal.onclick = (event) => { if (event.target === elements.modal) close(); };
    requestAnimationFrame(() => {
      const first = elements.modalBody.querySelector("input, textarea, button") || elements.modal.querySelector("button");
      first?.focus();
      onOpen?.(elements.modalBody);
    });
  }

  function selectedServices() {
    return state.services.filter((service) => state.selectedServiceIds.has(String(service.serviceId)));
  }
  function selectedDuration() {
    return selectedServices().reduce((sum, service) => sum + (Number(service.durationMinutes) || 30), 0);
  }
  function selectedPrice() {
    return selectedServices().reduce((sum, service) => sum + (Number(service.price) || 0), 0);
  }
  function isStandaloneService(service) {
    const name = String(service?.name || "").toLowerCase();
    return !/[+＋]/.test(name) && !/package|pack|vip|باكدج|بكدج/i.test(name);
  }

  function renderServices() {
    elements.services.setAttribute("aria-busy", "false");
    elements.services.innerHTML = state.services.map((service) => `
      <label class="service-choice">
        <input type="checkbox" data-service-id="${escapeHtml(service.serviceId)}" ${state.selectedServiceIds.has(String(service.serviceId)) ? "checked" : ""}>
        <span class="service-choice-text">
          <span class="service-choice-name">${escapeHtml(service.name)}</span>
          <span class="service-choice-duration">${Number(service.durationMinutes) || 30} ${state.language === "ar" ? "دقيقة" : "min"} · ${escapeHtml(money(service.price))}</span>
        </span>
      </label>`).join("") || `<div class="service-picker-loading">${tr("noServices")}</div>`;
    const count = selectedServices().length;
    elements.serviceSummary.textContent = count
      ? `${count} ${tr("selected")} · ${selectedDuration()} ${state.language === "ar" ? "دقيقة" : "min"} · ${money(selectedPrice())}`
      : tr("chooseServices");
  }

  function slotSortValue(time) {
    const [hour, minute] = String(time).split(":").map(Number);
    return ((hour < 6 ? hour + 24 : hour) * 60) + minute;
  }

  function earliestSlot() {
    return state.barbers.flatMap((barber) => (barber.slots || []).map((time) => ({ barber, time })))
      .sort((a, b) => slotSortValue(a.time) - slotSortValue(b.time))[0] || null;
  }

  function renderBarbers() {
    const earliest = earliestSlot();
    if (!state.barbers.length || !earliest) {
      elements.barberGrid.innerHTML = `<div class="empty-public-state">${tr("noSlots")}</div>`;
      return;
    }
    elements.barberGrid.innerHTML = state.barbers.map((barber) => {
      const rating = Number(barber.ratingsCount) >= 5
        ? `<span class="barber-rating" aria-label="${barber.averageRating} out of 5">★ ${Number(barber.averageRating).toFixed(1)} · ${barber.ratingsCount} ${tr("ratings")}</span>`
        : `<span class="barber-rating new">${tr("newBarber")}</span>`;
      const slots = (barber.slots || []).map((time) => {
        const recommended = earliest.barber.staffId === barber.staffId && earliest.time === time;
        return `<button class="slot-btn ${state.employeeId === barber.staffId && state.time === time ? "selected" : ""} ${recommended ? "recommended" : ""}"
          type="button" data-staff-id="${escapeHtml(barber.staffId)}" data-time="${escapeHtml(time)}"
          aria-label="${escapeHtml(formatTime(time))}${recommended ? `, ${tr("earliest")}` : ""}">
          ${escapeHtml(formatTime(time))}${recommended ? `<small>${tr("earliest")}</small>` : ""}
        </button>`;
      }).join("");
      return `<article class="barber-card ${state.employeeId === barber.staffId ? "selected" : ""}">
        <div class="barber-head"><div><h3 class="barber-name">${escapeHtml(barber.name)}</h3>${rating}</div>
          <span class="availability-badge ${escapeHtml(barber.availability)}">${barber.slots?.length ? tr("available") : tr(barber.availability === "not_started" ? "notStarted" : "unavailable")}</span>
        </div>
        <div class="slots">${slots || `<span class="barber-shift">${tr("noSlots")}</span>`}</div>
      </article>`;
    }).join("");
  }

  function selectSlot(staffId, time) {
    const barber = state.barbers.find((item) => String(item.staffId) === String(staffId));
    if (!barber || !(barber.slots || []).includes(time)) return;
    state.employeeId = barber.staffId;
    state.employeeName = barber.name;
    state.time = time;
    elements.customerPanel.classList.remove("hidden");
    elements.summary.innerHTML = `
      <dl class="summary-grid">
        <div><dt>${state.language === "ar" ? "الخدمات" : "Services"}</dt><dd>${escapeHtml(selectedServices().map((service) => service.name).join("، "))}</dd></div>
        <div><dt>${state.language === "ar" ? "المصفف" : "Barber"}</dt><dd>${escapeHtml(barber.name)}</dd></div>
        <div><dt>${state.language === "ar" ? "التاريخ والوقت" : "Date & time"}</dt><dd>${escapeHtml(formatDate(elements.date.value))} · ${escapeHtml(formatTime(time))}</dd></div>
        <div><dt>${state.language === "ar" ? "الإجمالي" : "Total"}</dt><dd>${selectedDuration()} ${state.language === "ar" ? "دقيقة" : "min"} · ${escapeHtml(money(selectedPrice()))}</dd></div>
      </dl>`;
    setStep(3);
    renderBarbers();
    elements.customerPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function loadOptions({ initial = false, silent = false } = {}) {
    if (!elements.branch.value) {
      elements.barberGrid.textContent = state.language === "ar"
        ? "اختر الفرع لعرض المواعيد." : "Choose a branch to view appointments.";
      return;
    }
    if (state.loading) return;
    state.loading = true;
    const requestSequence = ++state.availabilityRequestSequence;
    if (!silent) {
      elements.barberGrid.setAttribute("aria-busy", "true");
      elements.barberGrid.innerHTML = `<div class="loading-state"><span class="spinner"></span>${tr("loadingSlots")}</div>`;
    }
    try {
      const requested = [...state.selectedServiceIds];
      const result = await publicRequest({
        action: "getPublicBookingOptions", branchId: elements.branch.value,
        date: elements.date.value, serviceIds: requested,
        ifNoneMatch: silent ? state.availabilityToken : ""
      });
      if (result?.status !== "success") throw new Error(result?.message || tr("error"));
      if (requestSequence !== state.availabilityRequestSequence) return;
      state.liveRefreshEnabled = result.liveRefreshEnabled === true;
      state.availabilityPollDelay = Math.max(30000, Number(result.retryAfterSeconds || 30) * 1000);
      if (result.unchanged) return;
      state.availabilityToken = String(result.availabilityToken || "");
      state.services = (Array.isArray(result.services) ? result.services : []).filter(isStandaloneService);
      const valid = new Set(state.services.map((service) => String(service.serviceId)));
      state.selectedServiceIds = new Set([...state.selectedServiceIds].filter((id) => valid.has(id)));
      if (initial && !state.selectedServiceIds.size && state.services[0]) state.selectedServiceIds.add(String(state.services[0].serviceId));
      if (result.delta === true) {
        const removed = new Set((result.removedStaffIds || []).map(String));
        const merged = new Map(state.barbers
          .filter((barber) => !removed.has(String(barber.staffId)))
          .map((barber) => [String(barber.staffId), barber]));
        (result.changedBarbers || []).forEach((barber) =>
          merged.set(String(barber.staffId), barber));
        state.barbers = [...merged.values()];
      } else {
        state.barbers = Array.isArray(result.barbers) ? result.barbers : [];
      }
      if (!state.barbers.some((barber) => barber.staffId === state.employeeId && barber.slots?.includes(state.time))) {
        state.employeeId = ""; state.employeeName = ""; state.time = "";
        elements.customerPanel.classList.add("hidden");
      }
      renderServices();
      renderBarbers();
      setStep(state.selectedServiceIds.size ? 2 : 1);
    } catch (error) {
      state.availabilityPollDelay = Math.min(300000, Math.max(30000, state.availabilityPollDelay * 2));
      if (!silent) {
        elements.barberGrid.innerHTML = `<div class="empty-public-state">${escapeHtml(error.message || tr("error"))}</div>`;
        notify(error.message || tr("error"), "error");
      }
    } finally {
      state.loading = false;
      elements.barberGrid.setAttribute("aria-busy", "false");
      scheduleAvailabilityPoll();
    }
  }

  function scheduleAvailabilityPoll() {
    clearTimeout(state.availabilityPollTimer);
    if (!state.liveRefreshEnabled || document.hidden || !state.selectedServiceIds.size ||
        elements.bookingWorkspace.classList.contains("hidden")) return;
    state.availabilityPollTimer = setTimeout(() => loadOptions({ silent: true }),
      state.availabilityPollDelay);
  }

  function refreshAvailabilityOnReturn() {
    if (!document.hidden && state.liveRefreshEnabled && state.selectedServiceIds.size &&
        !elements.bookingWorkspace.classList.contains("hidden")) {
      clearTimeout(state.availabilityPollTimer);
      loadOptions({ silent: true });
    } else {
      scheduleAvailabilityPoll();
    }
  }

  function normalizedEgyptianPhone(value) {
    let digits = String(value || "").replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/\D/g, "");
    if (digits.startsWith("0020")) digits = digits.slice(4);
    else if (digits.startsWith("20") && digits.length === 12) digits = digits.slice(2);
    if (digits.length === 10 && digits.startsWith("1")) digits = `0${digits}`;
    return digits;
  }

  function phoneLast4Key(token) {
    return `cut-hub-booking-phone-last4:${String(token || "").toUpperCase()}`;
  }

  async function submitBooking(event) {
    event.preventDefault();
    const services = selectedServices();
    if (!services.length || !state.employeeId || !state.time) return notify(tr("requiredSelection"), "error");
    const phone = normalizedEgyptianPhone(elements.customerPhone.value);
    if (!/^01(?:0|1|2|5)\d{8}$/.test(phone)) return notify(tr("invalidPhone"), "error");
    elements.submit.disabled = true;
    elements.submit.classList.add("loading");
    elements.submit.textContent = tr("sending");
    try {
      const result = await publicRequest(attachClientRequestId({
        action: "createPublicBookingRequest",
        serviceId: services[0].serviceId, serviceIds: services.map((service) => service.serviceId),
        employeeId: state.employeeId, employee: state.employeeName,
        branchId: elements.branch.value, date: elements.date.value, time: state.time,
        customerName: elements.customerName.value.trim(), customerPhone: phone, note: elements.note.value.trim()
      }));
      if (result?.status !== "success") {
        if (result?.code === "SLOT_UNAVAILABLE") {
          state.employeeId = ""; state.employeeName = ""; state.time = "";
          elements.customerPanel.classList.add("hidden");
          await loadOptions();
          setStep(2);
          notify(tr("slotGone"), "error");
          return;
        }
        throw new Error(result?.message || tr("error"));
      }
      state.pendingCreateRequest = null;
      state.trackingToken = result.trackingToken;
      state.phoneLast4 = phone.slice(-4);
      sessionStorage.setItem(phoneLast4Key(state.trackingToken), state.phoneLast4);
      notify(tr("sent"), "success");
      showSuccess(result.trackingToken);
    } catch (error) {
      notify(error.message || tr("error"), "error");
    } finally {
      elements.submit.disabled = false;
      elements.submit.classList.remove("loading");
      elements.submit.textContent = state.language === "ar" ? "إرسال طلب الحجز" : "Submit booking request";
    }
  }

  function showSuccess(token) {
    setStep(4);
    elements.bookingWorkspace.classList.add("hidden");
    elements.trackingWorkspace.classList.remove("hidden");
    elements.trackingContent.className = "tracking-card success-card";
    elements.trackingContent.innerHTML = `
      <div class="success-mark" aria-hidden="true">✓</div>
      <h2>${escapeHtml(tr("sent"))}</h2>
      <p>${escapeHtml(tr("requestPending"))}</p>
      <div class="tracking-code-card"><span>${state.language === "ar" ? "كود المتابعة" : "Tracking code"}</span>
        <strong>${escapeHtml(token)}</strong><button class="secondary-action" type="button" data-copy-token>${state.language === "ar" ? "نسخ" : "Copy"}</button>
      </div>
      <div class="form-actions">
        <button class="primary-action" type="button" data-open-status>${state.language === "ar" ? "فتح صفحة المتابعة" : "Open tracking page"}</button>
        <button class="secondary-action" type="button" data-start-new>${tr("newBooking")}</button>
      </div>`;
    elements.trackingContent.querySelector("[data-copy-token]").onclick = () => copyText(token);
    elements.trackingContent.querySelector("[data-open-status]").onclick = () => {
      const url = new URL(location.href); url.search = ""; url.searchParams.set("tracking", token);
      history.replaceState({}, "", url); showTracking(token, state.phoneLast4);
    };
    elements.trackingContent.querySelector("[data-start-new]").onclick = resetBooking;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(String(text));
      notify(tr("copyDone"), "success");
    } catch (_) {
      notify(String(text));
    }
  }

  function requestTrackingVerification(token = "") {
    showModal({
      title: tr("verifyTitle"),
      body: `<p>${tr("verifyHelp")}</p>
        <label class="field"><span>${state.language === "ar" ? "كود المتابعة" : "Tracking code"}</span><input id="trackingTokenInput" autocomplete="off" value="${escapeHtml(token)}"></label>
        <label class="field"><span>${state.language === "ar" ? "آخر 4 أرقام من الهاتف" : "Last 4 phone digits"}</span><input id="phoneLast4Input" inputmode="numeric" maxlength="4" pattern="\\d{4}" autocomplete="off"></label>`,
      onConfirm: async (body) => {
        const enteredToken = body.querySelector("#trackingTokenInput").value.trim().toUpperCase();
        const last4 = body.querySelector("#phoneLast4Input").value.replace(/\D/g, "");
        if (!enteredToken || last4.length !== 4) {
          notify(tr("verifyHelp"), "error"); return false;
        }
        sessionStorage.setItem(phoneLast4Key(enteredToken), last4);
        const url = new URL(location.href); url.search = ""; url.searchParams.set("tracking", enteredToken);
        history.replaceState({}, "", url);
        await showTracking(enteredToken, last4);
        return true;
      }
    });
  }

  async function showTracking(token, phoneLast4) {
    state.trackingToken = String(token || "").trim().toUpperCase();
    state.phoneLast4 = phoneLast4 || sessionStorage.getItem(phoneLast4Key(state.trackingToken)) || "";
    if (state.phoneLast4.length !== 4) return requestTrackingVerification(state.trackingToken);
    elements.bookingWorkspace.classList.add("hidden");
    elements.trackingWorkspace.classList.remove("hidden");
    elements.trackingContent.className = "state-message";
    elements.trackingContent.textContent = state.language === "ar" ? "جاري تحميل حالة الحجز..." : "Loading booking status...";
    try {
      const result = await publicRequest({ action: "getPublicBookingStatus", trackingToken: state.trackingToken, phoneLast4: state.phoneLast4 });
      if (result?.status !== "success") {
        if (result?.code === "TRACKING_VERIFICATION_FAILED") sessionStorage.removeItem(phoneLast4Key(state.trackingToken));
        throw new Error(result?.message || tr("error"));
      }
      renderTracking(result.booking);
      if (result.booking.status === "done") await renderRating(result.booking);
    } catch (error) {
      elements.trackingContent.className = "state-message error-state";
      elements.trackingContent.innerHTML = `${escapeHtml(error.message || tr("error"))}<div class="form-actions"><button class="secondary-action" type="button" data-retry-verification>${tr("verifyTitle")}</button></div>`;
      elements.trackingContent.querySelector("[data-retry-verification]").onclick = () => requestTrackingVerification(state.trackingToken);
    }
  }

  function renderTracking(booking) {
    const expired = booking.status === "expired";
    const proposal = booking.status === "proposed" ? `
      <div class="proposal-card"><strong>${state.language === "ar" ? "الموعد المقترح" : "Proposed appointment"}</strong>
        <p>${escapeHtml(formatDate(booking.proposedDate))} · ${escapeHtml(formatTime(booking.proposedTime))}</p>
        <div class="proposal-actions"><button class="primary-action" type="button" data-proposal="accept">${state.language === "ar" ? "موافق" : "Accept"}</button>
        <button class="danger-action primary-action" type="button" data-proposal="decline">${state.language === "ar" ? "غير مناسب" : "Decline"}</button></div>
      </div>` : "";
    elements.trackingContent.className = "tracking-card";
    elements.trackingContent.innerHTML = `
      <div class="tracking-status status-${escapeHtml(booking.status)}">${escapeHtml(copy[state.language].statuses[booking.status] || booking.status)}</div>
      ${expired ? `<div class="expired-message"><strong>${tr("expired")}</strong><span>${tr("expiredAgain")}</span><button class="primary-action" type="button" data-start-new>${tr("newBooking")}</button></div>` : ""}
      <div class="tracking-code-card"><span>${state.language === "ar" ? "كود المتابعة" : "Tracking code"}</span><strong>${escapeHtml(state.trackingToken)}</strong><button class="secondary-action" type="button" data-copy-token>${state.language === "ar" ? "نسخ" : "Copy"}</button></div>
      <div class="tracking-details">
        <div><span>${state.language === "ar" ? "الخدمة" : "Service"}</span><strong>${escapeHtml(booking.service)}</strong></div>
        <div><span>${state.language === "ar" ? "المصفف" : "Barber"}</span><strong>${escapeHtml(booking.employee)}</strong></div>
        <div><span>${state.language === "ar" ? "التاريخ" : "Date"}</span><strong>${escapeHtml(formatDate(booking.date))}</strong></div>
        <div><span>${state.language === "ar" ? "الوقت والمدة" : "Time & duration"}</span><strong>${escapeHtml(formatTime(booking.time))} · ${Number(booking.durationMinutes) || 30} ${state.language === "ar" ? "دقيقة" : "min"}</strong></div>
      </div>
      ${booking.rejectionReason ? `<div class="booking-summary">${escapeHtml(booking.rejectionReason)}</div>` : ""}
      ${proposal}
      <div id="ratingMount"></div>
      <div class="form-actions"><button class="secondary-action" type="button" data-refresh-status>${state.language === "ar" ? "تحديث الحالة" : "Refresh status"}</button></div>`;
    elements.trackingContent.querySelector("[data-copy-token]").onclick = () => copyText(state.trackingToken);
    elements.trackingContent.querySelector("[data-refresh-status]").onclick = () => showTracking(state.trackingToken, state.phoneLast4);
    elements.trackingContent.querySelector("[data-start-new]")?.addEventListener("click", resetBooking);
    elements.trackingContent.querySelectorAll("[data-proposal]").forEach((button) => button.onclick = () => respondProposal(button.dataset.proposal, button));
  }

  async function respondProposal(response, button) {
    button.disabled = true;
    button.classList.add("loading");
    try {
      const key = `${state.trackingToken}:${response}`;
      state.pendingProposalRequests[key] ||= `proposal-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
      const result = await publicRequest({
        action: "respondToBookingProposal", trackingToken: state.trackingToken,
        phoneLast4: state.phoneLast4, response,
        clientRequestId: state.pendingProposalRequests[key]
      });
      if (result?.status !== "success") throw new Error(result?.message || tr("error"));
      delete state.pendingProposalRequests[key];
      notify(state.language === "ar" ? "تم تحديث الطلب." : "Booking updated.", "success");
      await showTracking(state.trackingToken, state.phoneLast4);
    } catch (error) {
      notify(error.message || tr("error"), "error");
      button.disabled = false; button.classList.remove("loading");
    }
  }

  const ratingLabels = {
    ar: ["", "سيئ جدًا", "سيئ", "جيد", "جيد جدًا", "ممتاز"],
    en: ["", "Very Poor", "Poor", "Good", "Very Good", "Excellent"]
  };

  async function renderRating(booking) {
    const mount = $("ratingMount");
    if (!mount) return;
    const result = await publicRequest({ action: "getBookingRating", trackingToken: state.trackingToken, phoneLast4: state.phoneLast4 });
    if (result?.status !== "success") return;
    if (result.rating) {
      mount.innerHTML = `<section class="rating-card read-only"><h3>${tr("thankYou")}</h3>
        <div class="stars readonly" aria-label="${result.rating.rating} out of 5">${"★".repeat(result.rating.rating)}${"☆".repeat(5 - result.rating.rating)}</div>
        <strong>${escapeHtml(ratingLabels[state.language][result.rating.rating])}</strong>
        ${result.rating.comment ? `<p>${escapeHtml(result.rating.comment)}</p>` : ""}</section>`;
      return;
    }
    mount.innerHTML = `<section class="rating-card"><h3>${tr("ratingQuestion")} ${escapeHtml(booking.employee)}?</h3>
      <div class="stars" role="radiogroup" aria-label="${state.language === "ar" ? "اختر تقييمًا" : "Choose a rating"}">
        ${[1, 2, 3, 4, 5].map((value) => `<button type="button" role="radio" aria-checked="false" data-rating="${value}" aria-label="${value} ${ratingLabels[state.language][value]}">☆</button>`).join("")}
      </div>
      <output id="ratingLabel"></output>
      <label class="field"><span>${tr("optionalComment")}</span><textarea id="ratingComment" maxlength="500"></textarea></label>
      <button class="primary-action" type="button" id="submitRatingBtn" disabled>${tr("submitRating")}</button>
    </section>`;
    let selected = 0;
    mount.querySelectorAll("[data-rating]").forEach((button) => button.onclick = () => {
      selected = Number(button.dataset.rating);
      mount.querySelectorAll("[data-rating]").forEach((star) => {
        const active = Number(star.dataset.rating) <= selected;
        star.textContent = active ? "★" : "☆";
        star.setAttribute("aria-checked", String(Number(star.dataset.rating) === selected));
      });
      $("ratingLabel").textContent = ratingLabels[state.language][selected];
      $("submitRatingBtn").disabled = false;
    });
    $("submitRatingBtn").onclick = async () => {
      const button = $("submitRatingBtn"); button.disabled = true; button.classList.add("loading");
      const response = await publicRequest({
        action: "submitBookingRating", trackingToken: state.trackingToken, phoneLast4: state.phoneLast4,
        rating: selected, comment: $("ratingComment").value.trim()
      });
      if (response?.status !== "success") {
        notify(response?.message || tr("error"), "error"); button.disabled = false; button.classList.remove("loading"); return;
      }
      notify(tr("thankYou"), "success");
      await renderRating(booking);
    };
  }

  function resetBooking() {
    const url = new URL(location.href); url.search = ""; history.replaceState({}, "", url);
    state.trackingToken = ""; state.phoneLast4 = ""; state.employeeId = ""; state.employeeName = ""; state.time = "";
    elements.form.reset(); elements.date.value = todayKey();
    elements.bookingWorkspace.classList.remove("hidden"); elements.trackingWorkspace.classList.add("hidden");
    elements.customerPanel.classList.add("hidden"); setStep(1); loadOptions({ initial: true });
    scrollTo({ top: 0, behavior: "smooth" });
  }

  elements.services.addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-service-id]");
    if (!checkbox) return;
    if (checkbox.checked) state.selectedServiceIds.add(checkbox.dataset.serviceId);
    else state.selectedServiceIds.delete(checkbox.dataset.serviceId);
    state.employeeId = ""; state.time = ""; renderServices(); loadOptions();
  });
  elements.date.addEventListener("change", () => { state.employeeId = ""; state.time = ""; loadOptions(); });
  elements.branch.addEventListener("change", () => {
    state.employeeId = ""; state.time = ""; state.availabilityToken = "";
    loadOptions({ initial: true });
  });
  elements.barberGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-time]");
    if (button) selectSlot(button.dataset.staffId, button.dataset.time);
  });
  elements.anyBarber.addEventListener("click", () => {
    const earliest = earliestSlot();
    if (!earliest) return notify(tr("noSlots"), "error");
    selectSlot(earliest.barber.staffId, earliest.time);
  });
  elements.form.addEventListener("submit", submitBooking);
  elements.openTracking.addEventListener("click", () => requestTrackingVerification());
  elements.newBooking.addEventListener("click", resetBooking);
  document.addEventListener("visibilitychange", refreshAvailabilityOnReturn);
  window.addEventListener("focus", refreshAvailabilityOnReturn);
  elements.language.addEventListener("click", () => {
    state.language = state.language === "ar" ? "en" : "ar";
    applyLanguage();
    renderServices(); renderBarbers();
    if (state.employeeId && state.time) selectSlot(state.employeeId, state.time);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.modal.classList.contains("hidden")) elements.modal.querySelector("[data-modal-cancel]")?.click();
    if (event.key === "Tab" && !elements.modal.classList.contains("hidden")) {
      const focusable = [...elements.modal.querySelectorAll("button, input, textarea, select, [tabindex]:not([tabindex='-1'])")].filter((node) => !node.disabled);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  elements.date.min = todayKey();
  elements.date.value = todayKey();
  applyLanguage();
  const trackingToken = new URLSearchParams(location.search).get("tracking");
  if (trackingToken) showTracking(trackingToken);
  else publicRequest({ action: "listPublicBookingBranches" }).then(result => {
    state.branches = Array.isArray(result?.branches) ? result.branches : [];
    state.branches.forEach(branch => {
      const option = document.createElement("option");
      option.value = branch.branchId;
      option.textContent = branch.branchName || branch.branchId;
      elements.branch.append(option);
    });
    if (state.branches.length === 1) elements.branch.value = state.branches[0].branchId;
    loadOptions({ initial: true });
  }).catch(error => notify(error.message || tr("error"), "error"));
})();
