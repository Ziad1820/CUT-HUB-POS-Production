    const STAFF_SOURCE_KEY = "romeo-pos-staff-accounting-v2";
    RomeoAuth.requireAuth("view_withdrawals");

    const API_URL = RomeoApi.API_URL;
    const elements = {
      searchInput: document.getElementById("searchInput"),
      employeeList: document.getElementById("employeeList"),
      employeeTitle: document.getElementById("employeeTitle"),
      employeeSubtitle: document.getElementById("employeeSubtitle"),
      employeeCode: document.getElementById("employeeCode"),
      employeeWithdrawals: document.getElementById("employeeWithdrawals"),
      employeeRecords: document.getElementById("employeeRecords"),
      allWithdrawals: document.getElementById("allWithdrawals"),
      allRecords: document.getElementById("allRecords"),
      withdrawAmount: document.getElementById("withdrawAmount"),
      withdrawDate: document.getElementById("withdrawDate"),
      withdrawNote: document.getElementById("withdrawNote"),
      filterFromDate: document.getElementById("filterFromDate"),
      filterToDate: document.getElementById("filterToDate"),
      selectAllWithdrawals: document.getElementById("selectAllWithdrawals"),
      deleteSelectedBtn: document.getElementById("deleteSelectedBtn"),
      selectedWithdrawalsCount: document.getElementById("selectedWithdrawalsCount"),
      historyList: document.getElementById("historyList"),
      status: document.getElementById("withdrawalStatus")
    };

    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const saveBtn = document.getElementById("saveBtn");
    const clearBtn = document.getElementById("clearBtn");
    const applyDateFilterBtn = document.getElementById("applyDateFilterBtn");
    const clearDateFilterBtn = document.getElementById("clearDateFilterBtn");

    function formatMoney(value) {
      return Number(value || 0).toLocaleString("en-US");
    }

    function currentLanguage() {
      return window.RomeoLanguage?.getCurrentLanguage?.()
        || localStorage.getItem("romeo-pos-language")
        || document.body?.dataset.language
        || "ar";
    }

    function localizeText(arText, enText) {
      return currentLanguage() === "en" ? enText : arText;
    }

    function applyPageLanguage() {
      document.querySelectorAll("[data-i18n-ar][data-i18n-en]").forEach(element => {
        element.textContent = localizeText(element.dataset.i18nAr, element.dataset.i18nEn);
      });
      document.querySelectorAll("[data-i18n-placeholder-ar][data-i18n-placeholder-en]").forEach(element => {
        element.placeholder = localizeText(element.dataset.i18nPlaceholderAr, element.dataset.i18nPlaceholderEn);
      });
      if (!saveBtn.disabled) saveBtn.textContent = localizeText("إضافة سحب", "Add Withdrawal");
      clearBtn.textContent = localizeText("مسح النموذج", "Clear Form");
    }

    function normalizeStaff(staff, index = 0) {
      return {
        id: staff.id || staff.staffId || `staff-${index}`,
        name: String(staff.name || staff.staffName || "").trim(),
        code: String(staff.code || staff.staffCode || "").trim().toUpperCase()
      };
    }

    function getStaff() {
      try {
        const parsed = JSON.parse(localStorage.getItem(STAFF_SOURCE_KEY) || "[]");
        return Array.isArray(parsed) && parsed.length
          ? parsed.map(normalizeStaff).filter(staff => staff.name)
          : [];
      } catch (error) {
        return [];
      }
    }

    function findStaffForWithdrawal(withdrawal, availableStaff = staffList) {
      const staffCode = String(withdrawal.staffCode || "").trim().toUpperCase();
      const staffName = String(withdrawal.staffName || "").trim().toLowerCase();
      return availableStaff.find(staff =>
        (staffCode && String(staff.code || "").trim().toUpperCase() === staffCode) ||
        (staffName && String(staff.name || "").trim().toLowerCase() === staffName)
      ) || null;
    }

    let staffList = getStaff();
    let withdrawalList = [];
    let withdrawalRead = null;
    let pendingWithdrawalRead = null;
    let withdrawalSequence = 0;
    let withdrawalWriteActive = false;
    let staffFresh = false;
    let loadedWithdrawalRange = null;
    let selectedWithdrawalIds = new Set();
    let selectedId = staffList[0]?.id || null;

    if (!elements.withdrawDate.value) {
      elements.withdrawDate.value = RomeoDateRange.today();
    }
    RomeoDateRange.setCurrentMonth(elements.filterFromDate, elements.filterToDate);

    function normalizeWithdrawalFromSheet(withdrawal, availableStaff = staffList) {
      const staff = findStaffForWithdrawal(withdrawal, availableStaff);
      return {
        id: String(withdrawal.withdrawalId || withdrawal.id || withdrawal.rowNumber || Date.now()),
        rowNumber: withdrawal.rowNumber || "",
        staffId: staff ? staff.id : String(withdrawal.staffName || withdrawal.staffCode || "unknown"),
        staffName: withdrawal.staffName || staff?.name || "",
        staffCode: withdrawal.staffCode || staff?.code || "",
        amount: Number(withdrawal.amount || 0),
        date: withdrawal.date || new Date().toISOString().slice(0, 10),
        note: String(withdrawal.note || "").trim()
      };
    }

    function reportWithdrawalTiming(operation, startedAt, outcome) {
      if (new URLSearchParams(window.location.search).get("performance") === "1") {
        console.info("[WITHDRAWALS_PERF] " + JSON.stringify({ operation, totalMs: Date.now() - startedAt, outcome }));
      }
    }

    function updateWithdrawalControls() {
      const blocked = withdrawalWriteActive || Boolean(withdrawalRead) || !staffFresh;
      saveBtn.disabled = blocked || !getSelectedStaff();
      clearBtn.disabled = withdrawalWriteActive;
      elements.deleteSelectedBtn.disabled = blocked || selectedWithdrawalIds.size === 0;
      elements.historyList.querySelectorAll("[data-delete-id]").forEach(button => { button.disabled = blocked; });
    }

    function loadWithdrawalsFromSheet({ fresh = false } = {}) {
      if (withdrawalWriteActive && !fresh) return Promise.resolve(false);
      const range = RomeoDateRange.validate(elements.filterFromDate.value, elements.filterToDate.value);
      if (!range.ok) {
        ++withdrawalSequence;
        elements.status.textContent = localizeText("اختر تاريخ بداية ونهاية صحيحين؛ الأرقام الظاهرة من آخر تحميل ناجح.", "Choose a valid period; displayed figures are from the last successful load.");
        return Promise.resolve(false);
      }
      const key = range.fromDate + ":" + range.toDate;
      if (!fresh && withdrawalRead?.key === key && !pendingWithdrawalRead) return withdrawalRead.promise;
      if (pendingWithdrawalRead?.key === key) return pendingWithdrawalRead.promise;
      const request = { key, range, sequence: ++withdrawalSequence, startedAt: Date.now() };
      request.promise = new Promise(resolve => { request.resolve = resolve; });
      if (withdrawalRead) {
        if (pendingWithdrawalRead) pendingWithdrawalRead.resolve(false);
        pendingWithdrawalRead = request;
      } else startWithdrawalRead(request);
      return request.promise;
    }

    async function startWithdrawalRead(request) {
      withdrawalRead = request;
      updateWithdrawalControls();
      elements.status.textContent = localizeText("جاري تحميل السحوبات...", "Loading withdrawals...");
      const isCurrent = () => request.sequence === withdrawalSequence &&
        request.range.fromDate === elements.filterFromDate.value && request.range.toDate === elements.filterToDate.value;
      let outcome = "superseded", ok = false;
      try {
        const data = await RomeoApi.request({ action: "getWithdrawalsPage", fromDate: request.range.fromDate, toDate: request.range.toDate });
        if (!isCurrent()) return;
        if (data.status !== "success" || !Array.isArray(data.staff) || !Array.isArray(data.withdrawals) ||
            data.fromDate !== request.range.fromDate || data.toDate !== request.range.toDate) throw new Error("WITHDRAWALS_READ_FAILED");
        const nextStaff = data.staff.map(normalizeStaff).filter(staff => staff.name);
        const nextWithdrawals = data.withdrawals.map(item => normalizeWithdrawalFromSheet(item, nextStaff));
        staffList = nextStaff;
        withdrawalList = nextWithdrawals;
        loadedWithdrawalRange = request.range;
        staffFresh = true;
        selectedWithdrawalIds.clear();
        renderAll();
        elements.status.textContent = "";
        outcome = "success"; ok = true;
      } catch (error) {
        if (!isCurrent()) return;
        outcome = "error";
        elements.status.textContent = localizeText("تعذر تحديث السحوبات. الأرقام الظاهرة من آخر تحميل ناجح؛ حاول مرة أخرى.",
          "Could not refresh withdrawals. Displayed figures are from the last successful load; try again.");
      } finally {
        reportWithdrawalTiming("period", request.startedAt, outcome);
        withdrawalRead = null;
        updateWithdrawalControls();
        request.resolve(ok);
        if (pendingWithdrawalRead) {
          const next = pendingWithdrawalRead;
          pendingWithdrawalRead = null;
          startWithdrawalRead(next);
        }
      }
    }

    async function saveWithdrawalToSheet(withdrawal) {
      const data = await RomeoApi.request({
        action: "withdrawal",
        withdrawalId: withdrawal.id,
        staffName: withdrawal.staffName,
        staffCode: withdrawal.staffCode,
        amount: withdrawal.amount,
        note: withdrawal.note,
        date: withdrawal.date
      });

      if (data.status !== "success") {
        throw new Error(data.message || "Failed to save withdrawal");
      }
    }

    async function deleteWithdrawalFromSheet(withdrawal) {
      const data = await RomeoApi.request({
        action: "deleteWithdrawal",
        withdrawalId: withdrawal.id,
        staffName: withdrawal.staffName,
        amount: withdrawal.amount,
        note: withdrawal.note,
        date: withdrawal.date
      });

      if (data.status !== "success") {
        throw new Error(data.message || "Failed to delete withdrawal");
      }
    }

    function getSelectedStaff() {
      return staffList.find(staff => staff.id === selectedId) || null;
    }

    function isDateInFilter(dateValue) {
      const date = String(dateValue || "").slice(0, 10);
      const fromDate = loadedWithdrawalRange?.fromDate || elements.filterFromDate.value;
      const toDate = loadedWithdrawalRange?.toDate || elements.filterToDate.value;

      if (!date) return false;
      if (fromDate && date < fromDate) return false;
      if (toDate && date > toDate) return false;
      return true;
    }

    function getFilteredWithdrawals() {
      return withdrawalList.filter(item => isDateInFilter(item.date));
    }

    function getEmployeeWithdrawals(staffId) {
      return getFilteredWithdrawals().filter(item => item.staffId === staffId);
    }

    function getVisibleHistoryWithdrawals() {
      const staff = getSelectedStaff();
      return staff
        ? [...getEmployeeWithdrawals(staff.id)].sort((a, b) => new Date(b.date) - new Date(a.date))
        : [];
    }

    function updateSelectedWithdrawalsState() {
      const availableIds = new Set(withdrawalList.map(item => String(item.id)));
      selectedWithdrawalIds = new Set(
        [...selectedWithdrawalIds].filter(id => availableIds.has(String(id)))
      );

      const selectedCount = selectedWithdrawalIds.size;
      const visibleIds = getVisibleHistoryWithdrawals().map(item => String(item.id));
      const visibleSelectedCount = visibleIds.filter(id => selectedWithdrawalIds.has(id)).length;
      updateWithdrawalControls();
      elements.selectedWithdrawalsCount.textContent = currentLanguage() === "en"
        ? `${selectedCount} selected`
        : `${selectedCount} محدد`;
      elements.selectAllWithdrawals.disabled = visibleIds.length === 0;
      elements.selectAllWithdrawals.checked = visibleIds.length > 0 && visibleSelectedCount === visibleIds.length;
      elements.selectAllWithdrawals.indeterminate = visibleSelectedCount > 0 && visibleSelectedCount < visibleIds.length;
    }

    function renderEmployeeList() {
      const query = elements.searchInput.value.trim().toLowerCase();
      const filtered = staffList.filter(staff =>
        !query ||
        String(staff.name || "").toLowerCase().includes(query) ||
        String(staff.code || "").toLowerCase().includes(query)
      );

      elements.employeeList.innerHTML = "";

      filtered.forEach(staff => {
        const total = getEmployeeWithdrawals(staff.id).reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const card = document.createElement("button");
        card.type = "button";
        card.className = `employee-card${staff.id === selectedId ? " active" : ""}`;
        card.innerHTML = `
          <strong>${staff.name}</strong>
          <div class="employee-meta">
            <span>${staff.code}</span>
            <span>${formatMoney(total)}</span>
          </div>
        `;
        card.addEventListener("click", () => {
          selectedId = staff.id;
          renderAll();
        });
        elements.employeeList.appendChild(card);
      });

      if (!filtered.length) {
        elements.employeeList.innerHTML = `<div class="history-empty">No employee found.</div>`;
      }
    }

    function renderHero() {
      const staff = getSelectedStaff();
      if (!staff) {
        elements.employeeTitle.textContent = "No Employee Selected";
        elements.employeeSubtitle.textContent = "Ø§ÙØªØ­ ØµÙØ­Ø© Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ† Ø£ÙˆÙ„Ù‹Ø§ Ø£Ùˆ Ø£Ø¶Ù Ù…ÙˆØ¸ÙÙ‹Ø§ Ù‡Ù†Ø§ÙƒØŒ Ø«Ù… Ø§Ø±Ø¬Ø¹ Ù‡Ù†Ø§ Ù„ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø³Ø­ÙˆØ¨Ø§Øª.";
        elements.employeeCode.textContent = "--";
        return;
      }

      elements.employeeTitle.textContent = staff.name;
      elements.employeeSubtitle.textContent = `Ø³Ø¬Ù„ ÙƒÙ„ Ø§Ù„Ø³Ø­ÙˆØ¨Ø§Øª Ø§Ù„Ø®Ø§ØµØ© Ø¨Ù€ ${staff.name} Ù…Ù† Ù‡Ù†Ø§ØŒ Ù…Ø¹ Ø§Ù„ØªØ§Ø±ÙŠØ® ÙˆØ§Ù„Ù…Ù„Ø§Ø­Ø¸Ø©.`;
      elements.employeeCode.textContent = staff.code;
    }

    function renderLocalizedHero() {
      const staff = getSelectedStaff();
      if (!staff) {
        elements.employeeTitle.textContent = localizeText("لم يتم اختيار موظف", "No Employee Selected");
        elements.employeeSubtitle.textContent = localizeText(
          "افتح صفحة الموظفين أولا أو أضف موظفا هناك، ثم ارجع هنا لتسجيل السحوبات.",
          "Open the staff page first or add a staff member there, then come back here to record withdrawals."
        );
        elements.employeeCode.textContent = "--";
        return;
      }

      elements.employeeTitle.textContent = staff.name;
      elements.employeeSubtitle.textContent = localizeText(
        `سجل كل السحوبات الخاصة بـ ${staff.name} من هنا، مع التاريخ والملاحظة.`,
        `Record all withdrawals for ${staff.name} here, with date and note.`
      );
      elements.employeeCode.textContent = staff.code;
    }

    function renderSummary() {
      const staff = getSelectedStaff();
      const employeeItems = staff ? getEmployeeWithdrawals(staff.id) : [];
      const employeeTotal = employeeItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const filteredWithdrawals = getFilteredWithdrawals();
      const allTotal = filteredWithdrawals.reduce((sum, item) => sum + Number(item.amount || 0), 0);

      elements.employeeWithdrawals.textContent = formatMoney(employeeTotal);
      elements.employeeRecords.textContent = employeeItems.length;
      elements.allWithdrawals.textContent = formatMoney(allTotal);
      elements.allRecords.textContent = filteredWithdrawals.length;
      updateSelectedWithdrawalsState();
    }

    function renderHistory() {
      const staff = getSelectedStaff();
      const sorted = getVisibleHistoryWithdrawals();
      elements.historyList.innerHTML = "";

      if (!staff) {
        elements.historyList.innerHTML = `<div class="history-empty">Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…ÙˆØ¸Ù Ù…Ø®ØªØ§Ø± Ø§Ù„Ø¢Ù†.</div>`;
        return;
      }

      if (!sorted.length) {
        elements.historyList.innerHTML = `<div class="history-empty">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø³Ø­ÙˆØ¨Ø§Øª Ù…Ø³Ø¬Ù„Ø© Ù„Ù‡Ø°Ø§ Ø§Ù„Ù…ÙˆØ¸Ù Ø­ØªÙ‰ Ø§Ù„Ø¢Ù†.</div>`;
        return;
      }

      sorted.forEach(item => {
        const row = document.createElement("article");
        row.className = "history-item";
        row.innerHTML = `
          <div class="history-top">
            <label class="history-select">
              <input type="checkbox" data-select-id="${item.id}" ${selectedWithdrawalIds.has(String(item.id)) ? "checked" : ""}>
              <div>
                <div class="history-amount">${formatMoney(item.amount)}</div>
              </div>
            </label>
            <button type="button" class="action-btn soft" data-delete-id="${item.id}">${localizeText("حذف", "Delete")}</button>
          </div>
          <div class="history-meta">
            <span>${staff.name}</span>
            <span>${item.date}</span>
          </div>
          <div class="history-note">${item.note || "No note"}</div>
        `;
        elements.historyList.appendChild(row);
      });
      updateSelectedWithdrawalsState();
    }

    function localizeHistoryEmptyState() {
      const staff = getSelectedStaff();
      const items = staff ? getEmployeeWithdrawals(staff.id) : [];

      if (!staff) {
        elements.historyList.innerHTML = `<div class="history-empty">${localizeText("لا يوجد موظف مختار الآن.", "No employee is selected right now.")}</div>`;
        return;
      }

      if (!items.length) {
        elements.historyList.innerHTML = `<div class="history-empty">${localizeText("لا توجد سحوبات مسجلة لهذا الموظف حتى الآن.", "No withdrawals have been recorded for this employee yet.")}</div>`;
      }
    }

    function renderAll() {
      applyPageLanguage();
      if (!staffList.find(staff => staff.id === selectedId)) {
        selectedId = staffList[0]?.id || null;
      }
      renderEmployeeList();
      renderLocalizedHero();
      renderSummary();
      renderHistory();
      localizeHistoryEmptyState();
      applyPageLanguage();
      updateWithdrawalControls();
    }

    function clearForm() {
      elements.withdrawAmount.value = "";
      elements.withdrawNote.value = "";
      elements.withdrawDate.value = RomeoDateRange.today();
    }

    async function addWithdrawal() {
      if (withdrawalWriteActive || withdrawalRead || !staffFresh) return;
      const staff = getSelectedStaff();
      const amount = Number(elements.withdrawAmount.value);
      if (!staff || !Number.isFinite(amount) || amount <= 0) {
        alert(localizeText("اختر الموظف وأدخل مبلغ سحب صحيحًا.", "Choose a staff member and enter a valid amount."));
        return;
      }
      const withdrawal = { id: Date.now(), staffId: staff.id, staffName: staff.name, staffCode: staff.code,
        amount, date: elements.withdrawDate.value || RomeoDateRange.today(), note: elements.withdrawNote.value.trim() };
      withdrawalWriteActive = true;
      updateWithdrawalControls();
      saveBtn.textContent = localizeText("جاري الحفظ...", "Saving...");
      try {
        await saveWithdrawalToSheet(withdrawal);
        clearForm();
        staffFresh = false;
        await loadWithdrawalsFromSheet({ fresh: true });
      } catch (error) {
        staffFresh = false;
        alert(localizeText("لم يتأكد حفظ السحب. راجع السجل قبل أي محاولة أخرى.", "Withdrawal save was not confirmed. Review the history before trying again."));
        await loadWithdrawalsFromSheet({ fresh: true });
      } finally {
        withdrawalWriteActive = false;
        updateWithdrawalControls();
        saveBtn.textContent = localizeText("إضافة سحب", "Add Withdrawal");
      }
    }

    async function deleteWithdrawal(id) {
      if (withdrawalWriteActive || withdrawalRead || !staffFresh) return;
      const withdrawal = withdrawalList.find(item => String(item.id) === String(id));
      if (!withdrawal) return;
      withdrawalWriteActive = true;
      updateWithdrawalControls();
      try {
        await deleteWithdrawalFromSheet(withdrawal);
        staffFresh = false;
        await loadWithdrawalsFromSheet({ fresh: true });
      } catch (error) {
        staffFresh = false;
        alert(localizeText("لم يتأكد الحذف. راجع السجل قبل أي محاولة أخرى.", "Deletion was not confirmed. Review the history before trying again."));
        await loadWithdrawalsFromSheet({ fresh: true });
      } finally {
        withdrawalWriteActive = false;
        updateWithdrawalControls();
      }
    }

    async function deleteSelectedWithdrawals() {
      if (withdrawalWriteActive || withdrawalRead || !staffFresh) return;
      const selectedItems = withdrawalList.filter(item => selectedWithdrawalIds.has(String(item.id)));
      if (!selectedItems.length || !confirm(localizeText("تحذف السحوبات المحددة؟", "Delete selected withdrawals?"))) return;
      withdrawalWriteActive = true;
      updateWithdrawalControls();
      elements.deleteSelectedBtn.textContent = localizeText("جاري الحذف...", "Deleting...");
      try {
        for (const withdrawal of selectedItems) await deleteWithdrawalFromSheet(withdrawal);
        selectedWithdrawalIds.clear();
      } catch (error) {
        alert(localizeText("لم يكتمل الحذف. راجع السجل لمعرفة المتبقي قبل المحاولة مرة أخرى.", "Deletion did not complete. Review the remaining history before trying again."));
      } finally {
        staffFresh = false;
        await loadWithdrawalsFromSheet({ fresh: true });
        withdrawalWriteActive = false;
        elements.deleteSelectedBtn.textContent = localizeText("حذف المحدد", "Delete Selected");
        updateSelectedWithdrawalsState();
      }
    }

    function openSidebar() {
      sidebar.classList.add("active");
      sidebarOverlay.classList.add("active");
    }

    function closeSidebar() {
      sidebar.classList.remove("active");
      sidebarOverlay.classList.remove("active");
    }

    document.querySelectorAll(".sidebar-link[data-permission]").forEach(link => {
      if (!RomeoAuth.hasPermission(link.dataset.permission)) {
        link.style.display = "none";
      }
    });

    document.querySelectorAll(".sidebar-link[data-href]").forEach(link => {
      link.addEventListener("click", () => {
        window.location.href = link.dataset.href;
      });
    });

    elements.searchInput.addEventListener("input", () => { const startedAt = Date.now(); renderEmployeeList(); reportWithdrawalTiming("search", startedAt, "success"); });
    saveBtn.addEventListener("click", addWithdrawal);
    clearBtn.addEventListener("click", () => { if (!withdrawalWriteActive) clearForm(); });
    elements.deleteSelectedBtn.addEventListener("click", deleteSelectedWithdrawals);
    elements.selectAllWithdrawals.addEventListener("change", event => {
      const visibleIds = getVisibleHistoryWithdrawals().map(item => String(item.id));
      if (event.target.checked) {
        visibleIds.forEach(id => selectedWithdrawalIds.add(id));
      } else {
        visibleIds.forEach(id => selectedWithdrawalIds.delete(id));
      }
      renderHistory();
    });
    applyDateFilterBtn.addEventListener("click", loadWithdrawalsFromSheet);
    clearDateFilterBtn.addEventListener("click", () => {
      RomeoDateRange.setCurrentMonth(elements.filterFromDate, elements.filterToDate);
      loadWithdrawalsFromSheet();
    });
    elements.historyList.addEventListener("click", async event => {
      const checkbox = event.target.closest("[data-select-id]");
      if (checkbox) {
        const id = String(checkbox.dataset.selectId);
        if (checkbox.checked) {
          selectedWithdrawalIds.add(id);
        } else {
          selectedWithdrawalIds.delete(id);
        }
        updateSelectedWithdrawalsState();
        return;
      }

      const btn = event.target.closest("[data-delete-id]");
      if (!btn) return;
      if (!confirm("ØªØ­Ø°Ù Ø¹Ù…Ù„ÙŠØ© Ø§Ù„Ø³Ø­Ø¨ Ø¯ÙŠØŸ")) return;
      btn.disabled = true;
      btn.textContent = localizeText("جاري الحذف...", "Deleting...");
      await deleteWithdrawal(btn.dataset.deleteId);
    });
    menuToggle.addEventListener("click", openSidebar);
    sidebarOverlay.addEventListener("click", closeSidebar);
    document.getElementById("logoutBtn").addEventListener("click", () => RomeoAuth.logout());
    window.addEventListener("storage", event => {
      if (event.key === STAFF_SOURCE_KEY) loadWithdrawalsFromSheet();
    });
    window.addEventListener("romeo-language-change", renderAll);
    window.addEventListener("pageshow", event => {
      if (event.persisted) loadWithdrawalsFromSheet();
    });
    [elements.filterFromDate, elements.filterToDate].forEach(input => input.addEventListener("change", () => {
      ++withdrawalSequence;
      if (pendingWithdrawalRead) { pendingWithdrawalRead.resolve(false); pendingWithdrawalRead = null; }
      elements.status.textContent = localizeText("اضغط تطبيق الفترة؛ الأرقام الظاهرة من آخر تحميل ناجح.", "Apply this period; displayed figures are from the last successful load.");
    }));

    applyPageLanguage();
    renderAll();
    loadWithdrawalsFromSheet();
