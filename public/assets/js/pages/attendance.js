(function () {
  const STAFF_STORAGE_KEY = "romeo-pos-staff-accounting-v2";
  const DEFAULT_ATTENDANCE_STAFF = [
    { id: 1, name: "Ramdan", code: "R07", salary: 0 },
    { id: 2, name: "Khaled", code: "R08", salary: 2500 },
    { id: 3, name: "Mohamed Emmad", code: "R09", salary: 2500 },
    { id: 4, name: "Karem", code: "R01", salary: 5500 },
    { id: 5, name: "Eleby", code: "R03", salary: 3300 },
    { id: 6, name: "8atyh", code: "R02", salary: 3300 }
  ];

  const state = {
    staff: [],
    records: []
  };

  const elements = {
    form: document.getElementById("attendanceForm"),
    staffSelect: document.getElementById("staffSelect"),
    attendanceDate: document.getElementById("attendanceDate"),
    recordType: document.getElementById("recordType"),
    shiftStart: document.getElementById("shiftStart"),
    checkIn: document.getElementById("checkIn"),
    breakOut: document.getElementById("breakOut"),
    breakIn: document.getElementById("breakIn"),
    checkOut: document.getElementById("checkOut"),
    penaltyAmount: document.getElementById("penaltyAmount"),
    penaltyReason: document.getElementById("penaltyReason"),
    note: document.getElementById("attendanceNote"),
    saveBtn: document.getElementById("saveAttendanceBtn"),
    clearBtn: document.getElementById("clearAttendanceBtn"),
    refreshBtn: document.getElementById("refreshAttendanceBtn"),
    fromDate: document.getElementById("fromDate"),
    toDate: document.getElementById("toDate"),
    recordsList: document.getElementById("recordsList"),
    previewWorkHours: document.getElementById("previewWorkHours"),
    previewBreakHours: document.getElementById("previewBreakHours"),
    previewDeduction: document.getElementById("previewDeduction"),
    recordsCount: document.getElementById("recordsCount"),
    absenceCount: document.getElementById("absenceCount"),
    approvedTotal: document.getElementById("approvedTotal"),
    pendingTotal: document.getElementById("pendingTotal")
  };

  function getLanguage() {
    return window.RomeoLanguage?.getCurrentLanguage?.()
      || localStorage.getItem("romeo-pos-language")
      || "ar";
  }

  function text(ar, en) {
    return getLanguage() === "en" ? en : ar;
  }

  function todayKey() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function currentTimeKey() {
    const date = new Date();
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  function monthStartKey() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}-01`;
  }

  function numberValue(value) {
    const parsed = typeof value === "number"
      ? value
      : parseFloat(String(value || "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function money(value) {
    return `${numberValue(value).toLocaleString("en-US", { maximumFractionDigits: 2 })} ${getLanguage() === "en" ? "EGP" : "جنيه"}`;
  }

  function parseTime(value) {
    const parts = String(value || "").split(":");
    if (parts.length < 2) return null;
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return (hours * 60) + minutes;
  }

  function hoursBetween(startValue, endValue) {
    const start = parseTime(startValue);
    const end = parseTime(endValue);
    if (start === null || end === null || end < start) return 0;
    return (end - start) / 60;
  }

  function round(value) {
    return Math.round(numberValue(value) * 100) / 100;
  }

  function selectedStaff() {
    return state.staff.find(staff => String(staff.id) === elements.staffSelect.value) || null;
  }

  function normalizeStaffRecord(staff, index = 0) {
    const name = String(staff.name || staff.staffName || "").trim();
    return {
      id: staff.id || staff.staffId || `staff-${index}`,
      name,
      code: String(staff.code || staff.staffCode || "").trim().toUpperCase(),
      salary: numberValue(staff.salary || staff.salaries),
      isBarber: staff.isBarber !== false
    };
  }

  function getStoredStaffFallback() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STAFF_STORAGE_KEY) || "[]");
      const storedStaff = Array.isArray(parsed)
        ? parsed.map(normalizeStaffRecord).filter(staff => staff.name)
        : [];
      return storedStaff.length
        ? storedStaff
        : DEFAULT_ATTENDANCE_STAFF.map(normalizeStaffRecord);
    } catch (error) {
      return DEFAULT_ATTENDANCE_STAFF.map(normalizeStaffRecord);
    }
  }

  function calculatePreview() {
    const staff = selectedStaff();
    const salary = numberValue(staff?.salary);
    const hourlyRate = salary > 0 ? (salary / 26 / 8) : 0;
    const penalty = numberValue(elements.penaltyAmount.value);
    const type = elements.recordType.value;

    if (type === "absent") {
      const sameMonthAbsences = state.records.filter(record =>
        record.staffName === staff?.name &&
        String(record.date || "").slice(0, 7) === String(elements.attendanceDate.value || "").slice(0, 7) &&
        record.recordType === "absent"
      ).length;
      const dailyRate = salary > 0 ? salary / 26 : 0;
      const deduction = (sameMonthAbsences >= 4 ? dailyRate : 0) + penalty;
      return { workHours: 0, breakHours: 0, deduction: round(deduction) };
    }

    if (type === "penalty") {
      return { workHours: 0, breakHours: 0, deduction: round(penalty) };
    }

    if (!elements.checkOut.value) {
      return { workHours: 0, breakHours: 0, deduction: 0 };
    }

    const presenceHours = hoursBetween(elements.checkIn.value, elements.checkOut.value);
    const breakHours = hoursBetween(elements.breakOut.value, elements.breakIn.value);
    const workHours = Math.max(0, presenceHours - breakHours);
    const lateHours = Math.max(0, hoursBetween(elements.shiftStart.value || "12:00", elements.checkIn.value));
    const shortHours = Math.max(0, 8 - workHours);
    const missingHours = Math.max(lateHours, shortHours);
    return {
      workHours: round(workHours),
      breakHours: round(breakHours),
      deduction: round((missingHours * hourlyRate) + penalty)
    };
  }

  function updatePreview() {
    const preview = calculatePreview();
    elements.previewWorkHours.textContent = preview.workHours.toLocaleString("en-US", { maximumFractionDigits: 2 });
    elements.previewBreakHours.textContent = preview.breakHours.toLocaleString("en-US", { maximumFractionDigits: 2 });
    elements.previewDeduction.textContent = money(preview.deduction);
    document.querySelectorAll(".work-field").forEach(field => {
      field.style.display = elements.recordType.value === "work" ? "flex" : "none";
    });
  }

  function applyLanguage() {
    document.querySelectorAll("[data-i18n-ar][data-i18n-en]").forEach(element => {
      element.textContent = text(element.dataset.i18nAr, element.dataset.i18nEn);
    });
    document.querySelectorAll("[data-i18n-placeholder-ar][data-i18n-placeholder-en]").forEach(element => {
      element.placeholder = text(element.dataset.i18nPlaceholderAr, element.dataset.i18nPlaceholderEn);
    });
    updatePreview();
    renderRecords();
  }

  function fillStaffSelect() {
    elements.staffSelect.innerHTML = state.staff.length
      ? state.staff.map(staff => `<option value="${staff.id}">${staff.name}</option>`).join("")
      : `<option value="">${text("لا يوجد موظفين", "No staff")}</option>`;
  }

  async function loadStaff() {
    const data = await RomeoApi.request({ action: "getStaff" });
    if (data.status !== "success") {
      throw new Error(data.message || "Failed to load staff.");
    }
    state.staff = Array.isArray(data.staff) ? data.staff : [];
    fillStaffSelect();
  }

  function fillStaffSelectSafe() {
    const placeholder = text("اختر الموظف", "Choose employee");
    elements.staffSelect.innerHTML = `<option value="">${placeholder}</option>${
      state.staff.map(staff => `<option value="${staff.id}">${staff.name}</option>`).join("")
    }`;
  }

  async function loadStaffSafe() {
    state.staff = getStoredStaffFallback();
    fillStaffSelectSafe();

    try {
      const data = await RomeoApi.request({ action: "getStaff" });
      if (data.status === "success" && Array.isArray(data.staff) && data.staff.length) {
        state.staff = data.staff.map(normalizeStaffRecord).filter(staff => staff.name);
        localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(state.staff));
        fillStaffSelectSafe();
      }
    } catch (error) {
      console.warn("Staff sheet sync failed. Falling back to local staff cache.", error);
    }
    return;
    elements.staffSelect.innerHTML = `<option value="">${text("جاري تحميل الموظفين...", "Loading staff...")}</option>`;

    try {
      const data = await RomeoApi.request({ action: "getStaff" });
      if (data.status === "success" && Array.isArray(data.staff) && data.staff.length) {
        state.staff = data.staff.map(normalizeStaffRecord).filter(staff => staff.name);
        fillStaffSelectSafe();
        return;
      }
    } catch (error) {
      console.warn("Staff sheet sync failed. Falling back to local staff cache.", error);
    }

    state.staff = getStoredStaffFallback();
    fillStaffSelectSafe();
  }

  async function loadRecords() {
    elements.recordsList.innerHTML = `<div class="empty-state">${text("جاري تحميل سجلات الحضور...", "Loading attendance records...")}</div>`;
    const data = await RomeoApi.request({
      action: "getAttendanceRecords",
      fromDate: elements.fromDate.value,
      toDate: elements.toDate.value
    });
    if (data.status !== "success") {
      throw new Error(data.message || "Failed to load attendance records.");
    }
    state.records = Array.isArray(data.records) ? data.records : [];
    renderRecords();
    updatePreview();
  }

  function statusLabel(status) {
    if (status === "open") {
      return text("داخل الشيفت", "Open Shift");
    }

    return status === "approved"
      ? text("معتمد", "Approved")
      : text("بانتظار الاعتماد", "Pending");
  }

  function typeLabel(type) {
    if (type === "absent") return text("غياب", "Absence");
    if (type === "penalty") return text("عقوبة", "Penalty");
    return text("حضور", "Work");
  }

  function renderStats() {
    const stats = state.records.reduce((acc, record) => {
      acc.records += 1;
      acc.absence += record.recordType === "absent" ? 1 : 0;
      if (record.approvalStatus === "approved") {
        acc.approved += numberValue(record.approvedDeduction);
      } else if (record.approvalStatus !== "open") {
        acc.pending += numberValue(record.suggestedDeduction);
      }
      return acc;
    }, { records: 0, absence: 0, approved: 0, pending: 0 });

    elements.recordsCount.textContent = stats.records.toLocaleString("en-US");
    elements.absenceCount.textContent = stats.absence.toLocaleString("en-US");
    elements.approvedTotal.textContent = money(stats.approved);
    elements.pendingTotal.textContent = money(stats.pending);
  }

  function renderRecords() {
    renderStats();

    if (!state.records.length) {
      elements.recordsList.innerHTML = `<div class="empty-state">${text("لا توجد سجلات حضور في الفترة الحالية.", "No attendance records in this period.")}</div>`;
      return;
    }

    elements.recordsList.innerHTML = state.records.map(record => {
      const open = record.approvalStatus === "open";
      const pending = record.approvalStatus !== "approved" && !open;
      const statusClass = open ? "status-open" : pending ? "status-pending" : "status-approved";
      return `
        <article class="attendance-record" data-row-number="${record.rowNumber}">
          <div>
            <div class="record-title">${record.staffName || "-"}</div>
            <div class="record-meta">${record.date || "-"} - ${typeLabel(record.recordType)}</div>
          </div>
          <div class="record-cell"><span>${text("العمل", "Work")}</span><strong>${numberValue(record.workHours).toLocaleString("en-US")} ${text("ساعة", "h")}</strong></div>
          <div class="record-cell"><span>${text("البريك", "Break")}</span><strong>${numberValue(record.breakHours).toLocaleString("en-US")} ${text("ساعة", "h")}</strong></div>
          <div class="record-cell"><span>${text("مقترح", "Suggested")}</span><strong>${money(record.suggestedDeduction)}</strong></div>
          <div class="record-cell"><span>${text("الحالة", "Status")}</span><strong class="status-pill ${pending ? "status-pending" : "status-approved"}">${statusLabel(record.approvalStatus)}</strong></div>
          <div class="record-actions">
            <button class="primary-btn approve-record" type="button" ${pending ? "" : "disabled"}>${text("اعتماد", "Approve")}</button>
            <button class="danger-btn delete-record" type="button">${text("حذف", "Delete")}</button>
          </div>
        </article>
      `;
    }).join("");
  }

  async function saveRecord(event) {
    event.preventDefault();
    const staff = selectedStaff();
    if (!staff) {
      alert(text("اختار موظف الأول.", "Choose an employee first."));
      return;
    }

    elements.saveBtn.disabled = true;
    elements.saveBtn.textContent = text("جاري الحفظ...", "Saving...");

    try {
      const response = await RomeoApi.request({
        action: "createAttendanceRecord",
        staffId: staff.id,
        staffName: staff.name,
        salary: staff.salary,
        date: elements.attendanceDate.value,
        recordType: elements.recordType.value,
        shiftStart: elements.shiftStart.value,
        checkIn: elements.checkIn.value,
        breakOut: elements.breakOut.value,
        breakIn: elements.breakIn.value,
        checkOut: elements.checkOut.value,
        penaltyAmount: elements.penaltyAmount.value,
        penaltyReason: elements.penaltyReason.value,
        note: elements.note.value
      });

      if (response.status !== "success") {
        throw new Error(response.message || "Failed to save attendance.");
      }

      clearForm(false);
      await loadRecords();
    } catch (error) {
      alert(error.message);
    } finally {
      elements.saveBtn.disabled = false;
      elements.saveBtn.textContent = text("حفظ السجل", "Save Record");
    }
  }

  function clearForm(resetDate = true) {
    elements.recordType.value = "work";
    elements.shiftStart.value = "12:00";
    elements.checkIn.value = "";
    elements.breakOut.value = "";
    elements.breakIn.value = "";
    elements.checkOut.value = "";
    elements.penaltyAmount.value = "0";
    elements.penaltyReason.value = "";
    elements.note.value = "";
    if (resetDate) elements.attendanceDate.value = todayKey();
    updatePreview();
  }

  function findOpenRecord(staff) {
    return state.records.find(record =>
      record.recordType === "work" &&
      record.approvalStatus === "open" &&
      record.date === elements.attendanceDate.value &&
      String(record.staffName || "").trim().toLowerCase() === String(staff.name || "").trim().toLowerCase()
    );
  }

  async function runAttendanceStep(step) {
    const staff = selectedStaff();
    if (!staff) {
      alert(text("اختار موظف الأول.", "Choose an employee first."));
      return;
    }

    const timeValue = currentTimeKey();
    const inputByStep = {
      checkIn: elements.checkIn,
      breakOut: elements.breakOut,
      breakIn: elements.breakIn,
      checkOut: elements.checkOut
    };

    if (inputByStep[step]) {
      inputByStep[step].value = timeValue;
      updatePreview();
    }

    if (step === "checkIn") {
      if (findOpenRecord(staff)) {
        alert(text("الموظف ده عنده شيفت مفتوح بالفعل.", "This employee already has an open shift."));
        return;
      }

      const response = await RomeoApi.request({
        action: "createAttendanceRecord",
        staffId: staff.id,
        staffName: staff.name,
        salary: staff.salary,
        date: elements.attendanceDate.value,
        recordType: "work",
        shiftStart: elements.shiftStart.value,
        checkIn: timeValue,
        penaltyAmount: elements.penaltyAmount.value,
        penaltyReason: elements.penaltyReason.value,
        note: elements.note.value
      });

      if (response.status !== "success") {
        throw new Error(response.message || "Failed to check in.");
      }

      await loadRecords();
      return;
    }

    const openRecord = findOpenRecord(staff);
    if (!openRecord) {
      alert(text("لا يوجد شيفت مفتوح للموظف ده اليوم. سجل حضور الأول.", "No open shift for this employee today. Check in first."));
      return;
    }

    const response = await RomeoApi.request({
      action: "updateAttendanceStep",
      rowNumber: openRecord.rowNumber,
      step,
      time: timeValue,
      salary: staff.salary
    });

    if (response.status !== "success") {
      throw new Error(response.message || "Failed to update attendance.");
    }

    await loadRecords();
  }

  async function approveRecord(rowNumber) {
    const record = state.records.find(item => String(item.rowNumber) === String(rowNumber));
    if (!record) return;

    if (!confirm(text(`اعتماد خصم ${money(record.suggestedDeduction)} للموظف ${record.staffName}؟`, `Approve ${money(record.suggestedDeduction)} deduction for ${record.staffName}?`))) {
      return;
    }

    const response = await RomeoApi.request({
      action: "approveAttendanceDeduction",
      rowNumber: record.rowNumber
    });
    if (response.status !== "success") {
      throw new Error(response.message || "Failed to approve deduction.");
    }
    await loadRecords();
  }

  async function deleteRecord(rowNumber) {
    if (!confirm(text("تحذف سجل الحضور ده؟", "Delete this attendance record?"))) {
      return;
    }
    const response = await RomeoApi.request({
      action: "deleteAttendanceRecord",
      rowNumber
    });
    if (response.status !== "success") {
      throw new Error(response.message || "Failed to delete record.");
    }
    await loadRecords();
  }

  function bindEvents() {
    elements.form.addEventListener("submit", saveRecord);
    elements.clearBtn.addEventListener("click", () => clearForm(true));
    elements.refreshBtn.addEventListener("click", () => loadRecords().catch(error => alert(error.message)));
    document.querySelectorAll("[data-attendance-step]").forEach(button => {
      button.addEventListener("click", () => runAttendanceStep(button.dataset.attendanceStep).catch(error => alert(error.message)));
    });
    [elements.staffSelect, elements.recordType, elements.shiftStart, elements.checkIn, elements.breakOut, elements.breakIn, elements.checkOut, elements.penaltyAmount].forEach(element => {
      element.addEventListener("input", updatePreview);
      element.addEventListener("change", updatePreview);
    });
    elements.recordsList.addEventListener("click", event => {
      const recordElement = event.target.closest(".attendance-record");
      if (!recordElement) return;
      const rowNumber = recordElement.dataset.rowNumber;

      if (event.target.closest(".approve-record")) {
        approveRecord(rowNumber).catch(error => alert(error.message));
      }
      if (event.target.closest(".delete-record")) {
        deleteRecord(rowNumber).catch(error => alert(error.message));
      }
    });
    window.addEventListener("romeo-language-change", applyLanguage);
  }

  async function init() {
    elements.attendanceDate.value = todayKey();
    elements.fromDate.value = monthStartKey();
    elements.toDate.value = todayKey();
    bindEvents();
    applyLanguage();

    try {
      await loadStaffSafe();
      await loadRecords();
      updatePreview();
    } catch (error) {
      elements.recordsList.innerHTML = `<div class="empty-state">${error.message}</div>`;
    }
  }

  init();
})();
