    const STAFF_SOURCE_KEY = "romeo-pos-staff-accounting-v2";
    RomeoAuth.requireAuth("view_withdrawals");

    const API_URL = RomeoApi.API_URL;
    const DEFAULT_STAFF = [
      { id: 1, name: "Ramdan", code: "R07" },
      { id: 2, name: "Khaled", code: "R08" },
      { id: 3, name: "Mohamed Emmad", code: "R09" },
      { id: 4, name: "Karem", code: "R01" },
      { id: 5, name: "Eleby", code: "R03" },
      { id: 6, name: "8atyh", code: "R02" }
    ];
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
      historyList: document.getElementById("historyList")
    };

    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const saveBtn = document.getElementById("saveBtn");
    const clearBtn = document.getElementById("clearBtn");

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
          : DEFAULT_STAFF.map(staff => ({ ...staff }));
      } catch (error) {
        return DEFAULT_STAFF.map(staff => ({ ...staff }));
      }
    }

    async function loadStaffFromSheet() {
      try {
        const data = await RomeoApi.request({ action: "getStaff" });
        if (data.status !== "success" || !Array.isArray(data.staff)) {
          return;
        }

        const sheetStaff = data.staff
          .map(normalizeStaff)
          .filter(staff => staff.name);

        if (!sheetStaff.length) {
          return;
        }

        staffList = sheetStaff;
        selectedId = staffList.some(staff => staff.id === selectedId)
          ? selectedId
          : staffList[0]?.id || null;
        localStorage.setItem(STAFF_SOURCE_KEY, JSON.stringify(sheetStaff));
        renderAll();
        loadWithdrawalsFromSheet();
      } catch (error) {
        console.warn("Staff sheet sync is not available yet.", error);
      }
    }

    function findStaffForWithdrawal(withdrawal) {
      const staffCode = String(withdrawal.staffCode || "").trim().toUpperCase();
      const staffName = String(withdrawal.staffName || "").trim().toLowerCase();
      return staffList.find(staff =>
        (staffCode && String(staff.code || "").trim().toUpperCase() === staffCode) ||
        (staffName && String(staff.name || "").trim().toLowerCase() === staffName)
      ) || null;
    }

    let staffList = getStaff();
    let withdrawalList = [];
    let selectedId = staffList[0]?.id || null;

    if (!elements.withdrawDate.value) {
      elements.withdrawDate.value = new Date().toISOString().slice(0, 10);
    }

    function normalizeWithdrawalFromSheet(withdrawal) {
      const staff = findStaffForWithdrawal(withdrawal);
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

    async function loadWithdrawalsFromSheet() {
      try {
        const data = await RomeoApi.request({ action: "getWithdrawals" });
        if (data.status !== "success") {
          throw new Error(data.message || "Failed to load withdrawals");
        }

        withdrawalList = Array.isArray(data.withdrawals)
          ? data.withdrawals.map(normalizeWithdrawalFromSheet)
          : [];
        renderAll();
      } catch (error) {
        console.error(error);
        elements.historyList.innerHTML = `<div class="history-empty">${localizeText("تعذر تحميل السحوبات من الشيت.", "Could not load withdrawals from the sheet.")}</div>`;
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

    function getEmployeeWithdrawals(staffId) {
      return withdrawalList.filter(item => item.staffId === staffId);
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
      const allTotal = withdrawalList.reduce((sum, item) => sum + Number(item.amount || 0), 0);

      elements.employeeWithdrawals.textContent = formatMoney(employeeTotal);
      elements.employeeRecords.textContent = employeeItems.length;
      elements.allWithdrawals.textContent = formatMoney(allTotal);
      elements.allRecords.textContent = withdrawalList.length;
    }

    function renderHistory() {
      const staff = getSelectedStaff();
      const items = staff ? getEmployeeWithdrawals(staff.id) : [];
      const sorted = [...items].sort((a, b) => new Date(b.date) - new Date(a.date));
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
            <div>
              <div class="history-amount">${formatMoney(item.amount)}</div>
            </div>
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
    }

    function clearForm() {
      elements.withdrawAmount.value = "";
      elements.withdrawNote.value = "";
      elements.withdrawDate.value = new Date().toISOString().slice(0, 10);
    }

    async function addWithdrawal() {
      const staff = getSelectedStaff();
      const amount = Number(elements.withdrawAmount.value);

      if (!staff) {
        alert("Ø§Ø®ØªØ§Ø± Ù…ÙˆØ¸Ù Ø§Ù„Ø£ÙˆÙ„.");
        return;
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        alert("Ø§ÙƒØªØ¨ Ù…Ø¨Ù„Øº Ø³Ø­Ø¨ ØµØ­ÙŠØ­.");
        return;
      }

      const withdrawal = {
        id: Date.now(),
        staffId: staff.id,
        staffName: staff.name,
        staffCode: staff.code,
        amount,
        date: elements.withdrawDate.value || new Date().toISOString().slice(0, 10),
        note: elements.withdrawNote.value.trim()
      };

      saveBtn.disabled = true;
      saveBtn.textContent = localizeText("جاري الحفظ...", "Saving...");

      try {
        await saveWithdrawalToSheet(withdrawal);
        clearForm();
        await loadWithdrawalsFromSheet();
      } catch (error) {
        console.error(error);
        alert(error.message || "ØªØ¹Ø°Ø± Ø­ÙØ¸ Ø§Ù„Ø³Ø­Ø¨ ÙÙŠ Ø§Ù„Ø´ÙŠØª.");
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = localizeText("إضافة سحب", "Add Withdrawal");
      }
    }

    async function deleteWithdrawal(id) {
      const withdrawal = withdrawalList.find(item => String(item.id) === String(id));
      if (!withdrawal) {
        return;
      }

      try {
        await deleteWithdrawalFromSheet(withdrawal);
        await loadWithdrawalsFromSheet();
      } catch (error) {
        console.error(error);
        alert(error.message || "ØªØ¹Ø°Ø± Ø­Ø°Ù Ø§Ù„Ø³Ø­Ø¨ Ù…Ù† Ø§Ù„Ø´ÙŠØª.");
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

    elements.searchInput.addEventListener("input", renderEmployeeList);
    saveBtn.addEventListener("click", addWithdrawal);
    clearBtn.addEventListener("click", clearForm);
    elements.historyList.addEventListener("click", async event => {
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
      if (event.key === STAFF_SOURCE_KEY) {
        staffList = getStaff();
        renderAll();
      }
    });
    window.addEventListener("romeo-language-change", renderAll);
    window.addEventListener("pageshow", () => {
      staffList = getStaff();
      renderAll();
      loadStaffFromSheet();
    });

    applyPageLanguage();
    renderAll();
    loadStaffFromSheet();
    loadWithdrawalsFromSheet();
