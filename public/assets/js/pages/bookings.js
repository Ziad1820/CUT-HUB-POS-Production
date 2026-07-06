(function () {
  "use strict";

  if (window.RomeoAuth) {
    RomeoAuth.requireAuth("view_bookings");
  }

  const STAFF_STORAGE_KEY = "romeo-pos-staff-accounting-v2";
  const DEFAULT_STAFF = ["MOHAMED", "RAMDAN", "KAREEM", "KHALED"];
  let bookingsCache = [];
  let bookingsLoading = false;

  const elements = {
    form: document.getElementById("bookingForm"),
    customerName: document.getElementById("customerName"),
    customerPhone: document.getElementById("customerPhone"),
    bookingDate: document.getElementById("bookingDate"),
    bookingTime: document.getElementById("bookingTime"),
    bookingEmployee: document.getElementById("bookingEmployee"),
    bookingService: document.getElementById("bookingService"),
    bookingNote: document.getElementById("bookingNote"),
    clearBookingBtn: document.getElementById("clearBookingBtn"),
    filterDate: document.getElementById("filterDate"),
    statusFilter: document.getElementById("statusFilter"),
    bookingSearch: document.getElementById("bookingSearch"),
    bookingsList: document.getElementById("bookingsList"),
    todayBookingsCount: document.getElementById("todayBookingsCount"),
    confirmedBookingsCount: document.getElementById("confirmedBookingsCount"),
    pendingBookingsCount: document.getElementById("pendingBookingsCount")
  };

  function getLanguage() {
    return window.RomeoLanguage?.getCurrentLanguage?.()
      || localStorage.getItem("romeo-pos-language")
      || document.documentElement.lang
      || "ar";
  }

  function text(ar, en) {
    return getLanguage() === "en" ? en : ar;
  }

  function todayKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function loadBookings() {
    return bookingsCache;
  }

  function normalizeBooking(booking) {
    return {
      id: String(booking.id || booking.bookingId || "").trim(),
      bookingId: String(booking.bookingId || booking.id || "").trim(),
      rowNumber: Number(booking.rowNumber || 0),
      customerName: String(booking.customerName || booking.customer || "").trim(),
      customerPhone: String(booking.customerPhone || booking.phone || "").trim(),
      date: String(booking.date || booking.bookingDate || "").trim(),
      time: String(booking.time || booking.bookingTime || "").trim(),
      employee: String(booking.employee || booking.barber || "").trim(),
      service: String(booking.service || booking.services || "").trim(),
      note: String(booking.note || "").trim(),
      status: String(booking.status || "pending").trim() || "pending",
      createdAt: String(booking.createdAt || "").trim(),
      updatedAt: String(booking.updatedAt || "").trim()
    };
  }

  async function fetchBookings() {
    if (!window.RomeoApi?.request || bookingsLoading) return;

    bookingsLoading = true;
    if (elements.bookingsList) {
      elements.bookingsList.innerHTML = `<div class="empty-state">${text("جاري تحميل الحجوزات...", "Loading bookings...")}</div>`;
    }

    try {
      const response = await RomeoApi.request({
        action: "getBookings",
        filters: {
          date: elements.filterDate?.value || "",
          status: elements.statusFilter?.value || "",
          search: elements.bookingSearch?.value || ""
        }
      });

      if (response?.status !== "success") {
        throw new Error(response?.message || "Could not load bookings.");
      }

      bookingsCache = Array.isArray(response.bookings)
        ? response.bookings.map(normalizeBooking)
        : [];
    } catch (error) {
      console.error(error);
      if (elements.bookingsList) {
        elements.bookingsList.innerHTML = `<div class="empty-state">${escapeHtml(error.message || text("تعذر تحميل الحجوزات.", "Could not load bookings."))}</div>`;
      }
      bookingsCache = [];
    } finally {
      bookingsLoading = false;
      renderBookings();
    }
  }

  function normalizeStaffMember(member, index) {
    if (typeof member === "string") {
      return { name: member, code: member };
    }

    const name = member?.name || member?.staffName || member?.displayName || member?.barber || `Employee ${index + 1}`;
    const code = member?.code || member?.staffCode || name;
    return { name, code };
  }

  function getLocalStaff() {
    try {
      const saved = JSON.parse(localStorage.getItem(STAFF_STORAGE_KEY) || "[]");
      if (Array.isArray(saved) && saved.length) {
        return saved.map(normalizeStaffMember);
      }
    } catch (error) {
      console.warn("Could not read local staff", error);
    }

    return DEFAULT_STAFF.map(normalizeStaffMember);
  }

  function renderEmployeeOptions(staff = getLocalStaff()) {
    if (!elements.bookingEmployee) return;

    const currentValue = elements.bookingEmployee.value;
    const placeholder = text("اختر الموظف", "Choose employee");
    elements.bookingEmployee.innerHTML = `<option value="">${placeholder}</option>`;

    staff.forEach(member => {
      const option = document.createElement("option");
      option.value = member.name;
      option.textContent = member.name;
      option.dataset.code = member.code;
      elements.bookingEmployee.appendChild(option);
    });

    if (currentValue) {
      elements.bookingEmployee.value = currentValue;
    }
  }

  async function refreshStaffFromApi() {
    if (!window.RomeoApi?.request) return;

    try {
      const response = await RomeoApi.request({ action: "getStaff" });
      const staffRows = response?.staff || response?.employees || response?.data || [];
      if (Array.isArray(staffRows) && staffRows.length) {
        localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(staffRows));
        renderEmployeeOptions(staffRows.map(normalizeStaffMember));
      }
    } catch (error) {
      console.warn("Could not load staff from API", error);
    }
  }

  function applyStaticLanguage() {
    document.querySelectorAll("[data-i18n-ar][data-i18n-en]").forEach(element => {
      element.textContent = getLanguage() === "en" ? element.dataset.i18nEn : element.dataset.i18nAr;
    });

    document.querySelectorAll("[data-i18n-placeholder-ar][data-i18n-placeholder-en]").forEach(element => {
      element.placeholder = getLanguage() === "en"
        ? element.dataset.i18nPlaceholderEn
        : element.dataset.i18nPlaceholderAr;
    });

    renderEmployeeOptions();
  }

  function statusLabel(status) {
    const labels = {
      pending: text("بانتظار التأكيد", "Pending"),
      confirmed: text("مؤكد", "Confirmed"),
      done: text("تم الحضور", "Completed"),
      cancelled: text("ملغي", "Cancelled")
    };
    return labels[status] || labels.pending;
  }

  function formatDate(value) {
    if (!value) return "-";
    const parts = String(value).split("-");
    if (parts.length !== 3) return value;
    return getLanguage() === "en" ? value : `${parts[2]} / ${parts[1]} / ${parts[0]}`;
  }

  function getFilteredBookings() {
    const filterDate = elements.filterDate?.value || "";
    const status = elements.statusFilter?.value || "";
    const query = (elements.bookingSearch?.value || "").trim().toLowerCase();

    return loadBookings()
      .filter(booking => !filterDate || booking.date === filterDate)
      .filter(booking => !status || booking.status === status)
      .filter(booking => {
        if (!query) return true;
        return [
          booking.customerName,
          booking.customerPhone,
          booking.employee,
          booking.service,
          booking.note
        ].some(value => String(value || "").toLowerCase().includes(query));
      })
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  }

  function renderStats() {
    const selectedDate = elements.filterDate?.value || todayKey();
    const bookings = loadBookings().filter(booking => booking.date === selectedDate);

    if (elements.todayBookingsCount) elements.todayBookingsCount.textContent = bookings.length;
    if (elements.confirmedBookingsCount) {
      elements.confirmedBookingsCount.textContent = bookings.filter(booking => booking.status === "confirmed").length;
    }
    if (elements.pendingBookingsCount) {
      elements.pendingBookingsCount.textContent = bookings.filter(booking => booking.status === "pending").length;
    }
  }

  function renderBookings() {
    if (!elements.bookingsList) return;

    const bookings = getFilteredBookings();
    renderStats();

    if (!bookings.length) {
      elements.bookingsList.innerHTML = `<div class="empty-state">${text("لا توجد حجوزات مطابقة حاليا.", "No matching bookings yet.")}</div>`;
      return;
    }

    elements.bookingsList.innerHTML = bookings.map(booking => `
      <article class="booking-card" data-booking-id="${booking.id}">
        <div class="booking-top">
          <div class="booking-customer">
            <strong>${escapeHtml(booking.customerName)}</strong>
            <span>${escapeHtml(booking.customerPhone)}</span>
          </div>
          <div class="booking-time">
            <span>${formatDate(booking.date)} - ${escapeHtml(booking.time)}</span>
            <span class="booking-status status-${booking.status}">${statusLabel(booking.status)}</span>
          </div>
        </div>
        <div class="booking-meta">
          <span>${text("الموظف", "Employee")}: <strong>${escapeHtml(booking.employee)}</strong></span>
          <span>${text("الخدمة", "Service")}: <strong>${escapeHtml(booking.service)}</strong></span>
        </div>
        ${booking.note ? `<div class="booking-note">${escapeHtml(booking.note)}</div>` : ""}
        <div class="booking-actions">
          ${booking.status === "pending" ? `<button class="booking-action confirm" type="button" data-action="confirmed">${text("تأكيد", "Confirm")}</button>` : ""}
          ${booking.status !== "done" && booking.status !== "cancelled" ? `<button class="booking-action done" type="button" data-action="done">${text("تم الحضور", "Complete")}</button>` : ""}
          ${booking.status !== "cancelled" && booking.status !== "done" ? `<button class="booking-action cancel" type="button" data-action="cancelled">${text("إلغاء", "Cancel")}</button>` : ""}
          <button class="booking-action delete" type="button" data-action="delete">${text("حذف", "Delete")}</button>
        </div>
      </article>
    `).join("");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function clearForm() {
    elements.form?.reset();
    if (elements.bookingDate) elements.bookingDate.value = todayKey();
  }

  async function saveBooking(event) {
    event.preventDefault();

    const booking = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      customerName: elements.customerName.value.trim(),
      customerPhone: elements.customerPhone.value.trim(),
      date: elements.bookingDate.value,
      time: elements.bookingTime.value,
      employee: elements.bookingEmployee.value,
      service: elements.bookingService.value.trim(),
      note: elements.bookingNote.value.trim(),
      status: "pending",
      createdAt: new Date().toISOString()
    };

    if (!booking.customerName || !booking.customerPhone || !booking.date || !booking.time || !booking.employee || !booking.service) {
      alert(text("كمل بيانات الحجز الأساسية الأول.", "Please complete the required booking details first."));
      return;
    }

    try {
      const response = await RomeoApi.request({
        action: "createBooking",
        ...booking
      });

      if (response?.status !== "success") {
        throw new Error(response?.message || "Could not save booking.");
      }

      clearForm();
      if (elements.filterDate) elements.filterDate.value = booking.date;
      await fetchBookings();
    } catch (error) {
      alert(error.message || text("تعذر حفظ الحجز.", "Could not save booking."));
    }
  }

  async function updateBookingStatus(id, status) {
    const booking = loadBookings().find(item => item.id === id || item.bookingId === id);
    if (!booking) return;

    try {
      const response = await RomeoApi.request({
        action: "updateBooking",
        ...booking,
        id: booking.id,
        bookingId: booking.bookingId || booking.id,
        rowNumber: booking.rowNumber,
        status
      });

      if (response?.status !== "success") {
        throw new Error(response?.message || "Could not update booking.");
      }

      await fetchBookings();
    } catch (error) {
      alert(error.message || "Could not update booking.");
    }
  }

  async function deleteBooking(id) {
    const ok = confirm(text("هل تريد حذف هذا الحجز؟", "Delete this booking?"));
    if (!ok) return;

    const booking = loadBookings().find(item => item.id === id || item.bookingId === id);
    if (!booking) return;

    try {
      const response = await RomeoApi.request({
        action: "deleteBooking",
        id: booking.id,
        bookingId: booking.bookingId || booking.id,
        rowNumber: booking.rowNumber
      });

      if (response?.status !== "success") {
        throw new Error(response?.message || "Could not delete booking.");
      }

      await fetchBookings();
    } catch (error) {
      alert(error.message || "Could not delete booking.");
    }
  }

  function handleListClick(event) {
    const button = event.target.closest("[data-action]");
    const card = event.target.closest("[data-booking-id]");
    if (!button || !card) return;

    const action = button.dataset.action;
    const id = card.dataset.bookingId;

    if (action === "delete") {
      deleteBooking(id);
      return;
    }

    updateBookingStatus(id, action);
  }

  function wireSidebar() {
    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const logoutBtn = document.getElementById("logoutBtn");

    if (menuToggle && sidebar && sidebarOverlay && sidebar.dataset.bookingsReady !== "true") {
      sidebar.dataset.bookingsReady = "true";
      menuToggle.addEventListener("click", () => {
        sidebar.classList.add("active");
        sidebarOverlay.classList.add("active");
      });
      sidebarOverlay.addEventListener("click", () => {
        sidebar.classList.remove("active");
        sidebarOverlay.classList.remove("active");
      });
    }

    document.querySelectorAll(".sidebar-link[data-href]").forEach(link => {
      if (link.dataset.bookingsLinkReady === "true") return;
      link.dataset.bookingsLinkReady = "true";
      link.addEventListener("click", () => {
        window.location.href = link.dataset.href;
      });
    });

    if (logoutBtn && logoutBtn.dataset.bookingsLogoutReady !== "true") {
      logoutBtn.dataset.bookingsLogoutReady = "true";
      logoutBtn.addEventListener("click", () => window.RomeoAuth?.logout?.());
    }
  }

  function init() {
    if (elements.bookingDate) elements.bookingDate.value = todayKey();
    if (elements.filterDate) elements.filterDate.value = todayKey();

    applyStaticLanguage();
    wireSidebar();
    refreshStaffFromApi();
    fetchBookings();

    elements.form?.addEventListener("submit", saveBooking);
    elements.clearBookingBtn?.addEventListener("click", clearForm);
    elements.filterDate?.addEventListener("change", fetchBookings);
    elements.statusFilter?.addEventListener("change", fetchBookings);
    elements.bookingSearch?.addEventListener("input", renderBookings);
    elements.bookingsList?.addEventListener("click", handleListClick);

    window.addEventListener("romeo-language-change", () => {
      applyStaticLanguage();
      renderBookings();
    });
  }

  init();
})();
