    let pendingFinanceDraft = null;
    const EXPENSE_CATEGORIES = [
      { id: "supplies", name: "Supplies", arName: "مستلزمات", code: "SUP" },
      { id: "utilities", name: "Utilities", arName: "مرافق", code: "UTL" },
      { id: "rent", name: "Rent", arName: "إيجار", code: "RNT" },
      { id: "maintenance", name: "Maintenance", arName: "صيانة", code: "MNT" },
      { id: "marketing", name: "Marketing", arName: "تسويق", code: "MRK" },
      { id: "other", name: "Other", arName: "أخرى", code: "OTH" }
    ];

    RomeoAuth.requireAuth("view_expenses");

    const API_URL = RomeoApi.API_URL;
    const elements = {
      searchInput: document.getElementById("searchInput"),
      categoryList: document.getElementById("categoryList"),
      categoryTitle: document.getElementById("categoryTitle"),
      categorySubtitle: document.getElementById("categorySubtitle"),
      categoryCode: document.getElementById("categoryCode"),
      categoryExpenses: document.getElementById("categoryExpenses"),
      categoryRecords: document.getElementById("categoryRecords"),
      allExpenses: document.getElementById("allExpenses"),
      averageExpense: document.getElementById("averageExpense"),
      expenseAmount: document.getElementById("expenseAmount"),
      expenseDate: document.getElementById("expenseDate"),
      paymentMethod: document.getElementById("expensePaymentMethod"),
      expenseCategory: document.getElementById("expenseCategory"),
      expenseTitle: document.getElementById("expenseTitle"),
      expenseNote: document.getElementById("expenseNote"),
      filterFromDate: document.getElementById("filterFromDate"),
      filterToDate: document.getElementById("filterToDate"),
      selectAllExpenses: document.getElementById("selectAllExpenses"),
      deleteSelectedBtn: document.getElementById("deleteSelectedBtn"),
      selectedExpensesCount: document.getElementById("selectedExpensesCount"),
      historyList: document.getElementById("historyList"),
      status: document.getElementById("expenseStatus")
    };

    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const saveBtn = document.getElementById("saveBtn");
    const clearBtn = document.getElementById("clearBtn");
    const applyDateFilterBtn = document.getElementById("applyDateFilterBtn");
    const clearDateFilterBtn = document.getElementById("clearDateFilterBtn");

    let expenseList = [];
    let expenseRead = null;
    let pendingExpenseRead = null;
    let expenseSequence = 0;
    let expenseWriteActive = false;
    let expensesFresh = false;
    let loadedExpenseRange = null;
    let selectedExpenseIds = new Set();
    let selectedCategoryId = EXPENSE_CATEGORIES[0]?.id || null;

    populateCategorySelect();

    if (!elements.expenseDate.value) {
      elements.expenseDate.value = RomeoDateRange.today();
      elements.paymentMethod.value = "cash";
    }
    RomeoDateRange.setCurrentMonth(elements.filterFromDate, elements.filterToDate);

    function normalizeAmount(value) {
      const amount = Number(value || 0);
      return Number.isFinite(amount)
        ? Math.round((amount + Number.EPSILON) * 100) / 100
        : 0;
    }

    function formatMoney(value) {
      return normalizeAmount(value).toLocaleString("en-US", {
        maximumFractionDigits: 2
      });
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

    function getCategoryLabel(category) {
      if (!category) return "";
      return localizeText(category.arName || category.name, category.name);
    }

    function applyPageLanguage() {
      document.querySelectorAll("[data-i18n-ar][data-i18n-en]").forEach(element => {
        element.textContent = localizeText(element.dataset.i18nAr, element.dataset.i18nEn);
      });
      document.querySelectorAll("[data-i18n-placeholder-ar][data-i18n-placeholder-en]").forEach(element => {
        element.placeholder = localizeText(element.dataset.i18nPlaceholderAr, element.dataset.i18nPlaceholderEn);
      });
      if (!saveBtn.disabled) {
        saveBtn.textContent = localizeText("إضافة مصروف", "Add Expense");
      }
      clearBtn.textContent = localizeText("مسح النموذج", "Clear Form");
    }

    function getExpenseCategoryId(value) {
      const normalized = String(value || "").trim().toLowerCase();
      const category = EXPENSE_CATEGORIES.find(item =>
        item.id.toLowerCase() === normalized ||
        item.name.toLowerCase() === normalized ||
        String(item.arName || "").toLowerCase() === normalized ||
        item.code.toLowerCase() === normalized
      );
      return category ? category.id : (EXPENSE_CATEGORIES[0]?.id || "other");
    }

    function paymentMethodLabel(method) {
      const labels = { cash: ["نقدي", "Cash"], instapay: ["انستا باي", "Instapay"], vodafone_cash: ["فودافون كاش", "Vodafone Cash"], visa: ["فيزا", "Visa"] };
      const label = labels[method || "cash"] || ["غير محددة", "Unspecified"];
      return localizeText(label[0], label[1]);
    }

    function normalizeExpenseFromSheet(expense) {
      return {
        id: String(expense.expenseId || expense.id || expense.rowNumber || Date.now()),
        rowNumber: expense.rowNumber || "",
        categoryId: expense.categoryId || getExpenseCategoryId(expense.category),
        amount: normalizeAmount(expense.amount),
        paymentMethod: expense.paymentMethod || "cash",
        date: expense.date || RomeoDateRange.today(),
        title: String(expense.title || "").trim(),
        note: String(expense.note || "").trim()
      };
    }

    function reportExpenseTiming(operation, startedAt, outcome) {
      if (new URLSearchParams(window.location.search).get("performance") === "1") {
        console.info("[EXPENSES_PERF] " + JSON.stringify({ operation, totalMs: Date.now() - startedAt, outcome }));
      }
    }

    function updateExpenseControls() {
      const blocked = expenseWriteActive || Boolean(expenseRead) || !expensesFresh;
      saveBtn.disabled = blocked || !getSelectedCategory();
      clearBtn.disabled = expenseWriteActive;
      [elements.paymentMethod, elements.expenseAmount, elements.expenseDate, elements.expenseCategory, elements.expenseTitle, elements.expenseNote].forEach(input => { input.disabled = expenseWriteActive; });
      elements.deleteSelectedBtn.disabled = blocked || selectedExpenseIds.size === 0;
      elements.historyList.querySelectorAll("[data-delete-id]").forEach(button => { button.disabled = blocked; });
    }

    function loadExpensesFromSheet({ fresh = false } = {}) {
      if (expenseWriteActive && !fresh) return Promise.resolve(false);
      const range = RomeoDateRange.validate(elements.filterFromDate.value, elements.filterToDate.value);
      if (!range.ok) {
        ++expenseSequence;
        elements.status.textContent = localizeText("اختر تاريخ بداية ونهاية صحيحين؛ الأرقام الظاهرة من آخر تحميل ناجح.", "Choose a valid period; displayed figures are from the last successful load.");
        return Promise.resolve(false);
      }
      const key = range.fromDate + ":" + range.toDate;
      if (!fresh && expenseRead?.key === key && !pendingExpenseRead) return expenseRead.promise;
      if (pendingExpenseRead?.key === key) return pendingExpenseRead.promise;
      const request = { key, range, sequence: ++expenseSequence, startedAt: Date.now() };
      request.promise = new Promise(resolve => { request.resolve = resolve; });
      if (expenseRead) {
        if (pendingExpenseRead) pendingExpenseRead.resolve(false);
        pendingExpenseRead = request;
      } else startExpenseRead(request);
      return request.promise;
    }

    async function startExpenseRead(request) {
      expenseRead = request;
      updateExpenseControls();
      elements.status.textContent = localizeText("جاري تحميل المصروفات...", "Loading expenses...");
      const isCurrent = () => request.sequence === expenseSequence &&
        request.range.fromDate === elements.filterFromDate.value && request.range.toDate === elements.filterToDate.value;
      let outcome = "superseded", ok = false;
      try {
        const data = await RomeoApi.request({ action: "getExpenses", fromDate: request.range.fromDate, toDate: request.range.toDate });
        if (!isCurrent()) return;
        if (data.status !== "success" || !Array.isArray(data.expenses)) throw new Error("EXPENSES_READ_FAILED");
        const nextExpenses = data.expenses.map(normalizeExpenseFromSheet);
        expenseList = nextExpenses;
        loadedExpenseRange = request.range;
        expensesFresh = true;
        selectedExpenseIds.clear();
        renderAll();
        elements.status.textContent = "";
        outcome = "success"; ok = true;
      } catch (error) {
        if (!isCurrent()) return;
        outcome = "error";
        elements.status.textContent = localizeText("تعذر تحديث المصروفات. الأرقام الظاهرة من آخر تحميل ناجح؛ حاول مرة أخرى.",
          "Could not refresh expenses. Displayed figures are from the last successful load; try again.");
      } finally {
        reportExpenseTiming("period", request.startedAt, outcome);
        expenseRead = null;
        if (outcome === "superseded" && !pendingExpenseRead) elements.status.textContent = localizeText("الفترة اتغيّرت؛ اضغط تطبيق الفلتر لتحديث الأرقام.", "Period changed; apply the filter to refresh figures.");
        updateExpenseControls();
        request.resolve(ok);
        if (pendingExpenseRead) {
          const next = pendingExpenseRead;
          pendingExpenseRead = null;
          startExpenseRead(next);
        }
      }
    }

    async function saveExpenseToSheet(expense) {
      const category = EXPENSE_CATEGORIES.find(item => item.id === expense.categoryId);
      const data = await RomeoApi.request({
        action: "expense",
        expenseId: expense.id,
        category: category ? category.name : expense.categoryId,
        amount: expense.amount,
        paymentMethod: expense.paymentMethod || "cash",
        title: expense.title,
        note: expense.note,
        date: expense.date
      });

      if (data.status !== "success") {
        throw new Error(data.message || "Failed to save expense");
      }
    }

    async function deleteExpenseFromSheet(expense) {
      const category = EXPENSE_CATEGORIES.find(item => item.id === expense.categoryId);
      const data = await RomeoApi.request({
        action: "deleteExpense",
        expenseId: expense.id,
        category: category ? category.name : expense.categoryId,
        amount: expense.amount,
        paymentMethod: expense.paymentMethod || "cash",
        title: expense.title,
        note: expense.note,
        date: expense.date
      });

      if (data.status !== "success") {
        throw new Error(data.message || "Failed to delete expense");
      }
    }

    function isNotFoundError(error) {
      const message = String(error?.message || error || "").toLowerCase();
      return message.includes("not found")
        || message.includes("notfound")
        || message.includes("not exist")
        || message.includes("does not exist")
        || message.includes("missing");
    }

    function populateCategorySelect() {
      const selectedValue = elements.expenseCategory.value || selectedCategoryId;
      elements.expenseCategory.innerHTML = "";
      EXPENSE_CATEGORIES.forEach(category => {
        const option = document.createElement("option");
        option.value = category.id;
        option.textContent = getCategoryLabel(category);
        elements.expenseCategory.appendChild(option);
      });
      elements.expenseCategory.value = selectedValue;
    }

    function getSelectedCategory() {
      return EXPENSE_CATEGORIES.find(category => category.id === selectedCategoryId) || null;
    }

    function isDateInFilter(dateValue) {
      const date = String(dateValue || "").slice(0, 10);
      const fromDate = loadedExpenseRange?.fromDate || elements.filterFromDate.value;
      const toDate = loadedExpenseRange?.toDate || elements.filterToDate.value;

      if (!date) return false;
      if (fromDate && date < fromDate) return false;
      if (toDate && date > toDate) return false;
      return true;
    }

    function getFilteredExpenses() {
      return expenseList.filter(item => isDateInFilter(item.date));
    }

    function getVisibleHistoryExpenses() {
      const category = getSelectedCategory();
      return category
        ? [...getCategoryExpenses(category.id)].sort((a, b) => new Date(b.date) - new Date(a.date))
        : [];
    }

    function updateSelectedExpensesState() {
      const category = getSelectedCategory();
      const visibleItems = getVisibleHistoryExpenses();
      const availableIds = new Set(visibleItems.map(item => String(item.id)));
      selectedExpenseIds = new Set(
        [...selectedExpenseIds].filter(id => availableIds.has(String(id)))
      );

      const selectedCount = selectedExpenseIds.size;
      const visibleIds = visibleItems.map(item => String(item.id));
      const visibleSelectedCount = visibleIds.filter(id => selectedExpenseIds.has(id)).length;
      updateExpenseControls();
      elements.selectedExpensesCount.textContent = currentLanguage() === "en"
        ? `${selectedCount} selected`
        : `${selectedCount} محدد`;
      elements.selectAllExpenses.disabled = !category || visibleIds.length === 0;
      elements.selectAllExpenses.checked = visibleIds.length > 0 && visibleSelectedCount === visibleIds.length;
      elements.selectAllExpenses.indeterminate = visibleSelectedCount > 0 && visibleSelectedCount < visibleIds.length;
    }

    function getCategoryExpenses(categoryId) {
      return getFilteredExpenses().filter(item => item.categoryId === categoryId);
    }

    function renderCategoryList() {
      const query = elements.searchInput.value.trim().toLowerCase();
      const filtered = EXPENSE_CATEGORIES.filter(category => {
        const label = getCategoryLabel(category);
        return !query ||
          label.toLowerCase().includes(query) ||
          category.name.toLowerCase().includes(query) ||
          category.code.toLowerCase().includes(query);
      });

      elements.categoryList.innerHTML = "";

      filtered.forEach(category => {
        const label = getCategoryLabel(category);
        const total = getCategoryExpenses(category.id).reduce((sum, item) => sum + normalizeAmount(item.amount), 0);
        const card = document.createElement("button");
        card.type = "button";
        card.className = `category-card${category.id === selectedCategoryId ? " active" : ""}`;
        card.innerHTML = `
          <strong>${label}</strong>
          <div class="category-meta">
            <span>${category.code}</span>
            <span>${formatMoney(total)}</span>
          </div>
        `;
        card.addEventListener("click", () => {
          const startedAt = Date.now();
          selectedCategoryId = category.id;
          elements.expenseCategory.value = category.id;
          renderAll();
          reportExpenseTiming("category", startedAt, "success");
        });
        elements.categoryList.appendChild(card);
      });

      if (!filtered.length) {
        elements.categoryList.innerHTML = `<div class="history-empty">${localizeText("لا يوجد تصنيف مطابق.", "No category found.")}</div>`;
      }
    }

    function renderSummary() {
      const category = getSelectedCategory();
      const categoryItems = category ? getCategoryExpenses(category.id) : [];
      const categoryTotal = categoryItems.reduce((sum, item) => sum + normalizeAmount(item.amount), 0);
      const filteredExpenses = getFilteredExpenses();
      const allTotal = filteredExpenses.reduce((sum, item) => sum + normalizeAmount(item.amount), 0);
      const average = filteredExpenses.length ? allTotal / filteredExpenses.length : 0;

      elements.categoryExpenses.textContent = formatMoney(categoryTotal);
      elements.categoryRecords.textContent = categoryItems.length;
      elements.allExpenses.textContent = formatMoney(allTotal);
      elements.averageExpense.textContent = formatMoney(average);
      updateSelectedExpensesState();
    }

    function renderHistory() {
      const category = getSelectedCategory();
      const sorted = getVisibleHistoryExpenses();
      elements.historyList.innerHTML = "";

      if (!category) {
        elements.historyList.innerHTML = `<div class="history-empty">${localizeText("لا يوجد تصنيف مختار الآن.", "No category is selected right now.")}</div>`;
        return;
      }

      if (!sorted.length) {
        elements.historyList.innerHTML = `<div class="history-empty">${localizeText("لا توجد مصروفات مسجلة لهذا التصنيف حتى الآن.", "No expenses have been recorded for this category yet.")}</div>`;
        return;
      }

      sorted.forEach(item => {
        const categoryLabel = getCategoryLabel(category);
        const row = document.createElement("article");
        row.className = "history-item";
        row.innerHTML = `
          <div class="history-top">
            <label class="history-select">
              <input type="checkbox" data-select-id="${item.id}" ${selectedExpenseIds.has(String(item.id)) ? "checked" : ""}>
              <div class="history-amount">${formatMoney(item.amount)}</div>
            </label>
            <button type="button" class="action-btn soft" data-delete-id="${item.id}">${localizeText("حذف", "Delete")}</button>
          </div>
          <div class="history-meta">
            <span>${paymentMethodLabel(item.paymentMethod)}</span>
            <span>${item.title || categoryLabel}</span>
            <span>${item.date}</span>
            <span>${category.code}</span>
          </div>
          <div class="history-note">${item.note || localizeText("لا توجد ملاحظة", "No note")}</div>
        `;
        elements.historyList.appendChild(row);
      });
      updateSelectedExpensesState();
    }

    function renderLocalizedHero() {
      const category = getSelectedCategory();
      if (!category) {
        elements.categoryTitle.textContent = localizeText("لم يتم اختيار تصنيف", "No Category Selected");
        elements.categorySubtitle.textContent = localizeText(
          "اختر تصنيف من القائمة لتسجيل المصروفات.",
          "Choose a category from the list to record expenses."
        );
        elements.categoryCode.textContent = "--";
        return;
      }

      const categoryLabel = getCategoryLabel(category);
      elements.categoryTitle.textContent = categoryLabel;
      elements.categorySubtitle.textContent = localizeText(
        `كل المصروفات الخاصة بتصنيف ${categoryLabel} ستظهر هنا مع ملخص تلقائي وسجل كامل.`,
        `All expenses for ${categoryLabel} will appear here with an automatic summary and full history.`
      );
      elements.categoryCode.textContent = category.code;
    }

    function renderAll() {
      applyPageLanguage();
      populateCategorySelect();
      if (!EXPENSE_CATEGORIES.find(category => category.id === selectedCategoryId)) {
        selectedCategoryId = EXPENSE_CATEGORIES[0]?.id || null;
      }
      renderCategoryList();
      renderLocalizedHero();
      renderSummary();
      renderHistory();
      updateExpenseControls();
    }

    function clearForm() {
      elements.expenseAmount.value = "";
      elements.expenseTitle.value = "";
      elements.expenseNote.value = "";
      elements.expenseDate.value = RomeoDateRange.today();
      elements.expenseCategory.value = selectedCategoryId || EXPENSE_CATEGORIES[0]?.id || "";
    }

    async function runExpenseWrite(action) {
      if (expenseWriteActive || expenseRead || !expensesFresh) return false;
      expenseWriteActive = true;
      expensesFresh = false;
      updateExpenseControls();
      let completed = false;
      try {
        await action();
        completed = true;
      } catch (error) {
        alert(localizeText("تعذر تأكيد العملية. سنراجع السجل قبل السماح بعملية أخرى.", "Could not confirm the operation. The history will be refreshed before another operation."));
      } finally {
        // Refresh once even after an uncertain or partially completed write; never replay writes.
        await loadExpensesFromSheet({ fresh: true });
        expenseWriteActive = false;
        updateExpenseControls();
        applyPageLanguage();
        elements.deleteSelectedBtn.textContent = localizeText("حذف المحدد", "Delete Selected");
      }
      return completed;
    }

    async function addExpenseLocalized() {
      if (expenseWriteActive || expenseRead || !expensesFresh) return;
      const amount = normalizeAmount(elements.expenseAmount.value);
      const categoryId = elements.expenseCategory.value;
      if (!EXPENSE_CATEGORIES.some(item => item.id === categoryId) || amount <= 0) {
        alert(localizeText("اختار تصنيف ومبلغ مصروف صحيحين.", "Choose a valid category and expense amount."));
        return;
      }
      const expense = { id: "", paymentMethod: elements.paymentMethod.value || "cash", categoryId, amount,
        date: elements.expenseDate.value || RomeoDateRange.today(),
        title: elements.expenseTitle.value.trim(), note: elements.expenseNote.value.trim() };
      const draftFingerprint = JSON.stringify(expense);
      if (!pendingFinanceDraft || pendingFinanceDraft.fingerprint !== draftFingerprint) {
        pendingFinanceDraft = { fingerprint: draftFingerprint, id: globalThis.crypto?.randomUUID?.() || `finance-${Date.now()}-${Math.random().toString(36).slice(2)}` };
      }
      expense.id = pendingFinanceDraft.id;
      await runExpenseWrite(async () => {
        saveBtn.textContent = localizeText("جاري الحفظ...", "Saving...");
        await saveExpenseToSheet(expense);
        pendingFinanceDraft = null;
        selectedCategoryId = categoryId;
        clearForm();
      });
    }

    async function deleteExpenseLocalized(id) {
      const expense = expenseList.find(item => String(item.id) === String(id));
      if (!expense) return;
      await runExpenseWrite(async () => {
        try { await deleteExpenseFromSheet(expense); }
        catch (error) { if (!isNotFoundError(error)) throw error; }
      });
    }

    async function deleteSelectedExpenses() {
      if (expenseWriteActive || expenseRead || !expensesFresh) return;
      const selectedItems = getVisibleHistoryExpenses().filter(item => selectedExpenseIds.has(String(item.id)));
      if (!selectedItems.length || !confirm(localizeText("تحذف المصروفات المحددة؟", "Delete selected expenses?"))) return;
      await runExpenseWrite(async () => {
        elements.deleteSelectedBtn.textContent = localizeText("جاري الحذف...", "Deleting...");
        for (const expense of selectedItems) {
          try { await deleteExpenseFromSheet(expense); }
          catch (error) { if (!isNotFoundError(error)) throw error; }
        }
      });
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

    elements.searchInput.addEventListener("input", () => {
      const startedAt = Date.now();
      renderCategoryList();
      reportExpenseTiming("search", startedAt, "success");
    });
    elements.expenseAmount.addEventListener("wheel", event => {
      event.preventDefault();
      elements.expenseAmount.blur();
    });
    elements.expenseCategory.addEventListener("change", event => {
      selectedCategoryId = event.target.value;
      renderAll();
    });
    saveBtn.addEventListener("click", addExpenseLocalized);
    clearBtn.addEventListener("click", clearForm);
    elements.deleteSelectedBtn.addEventListener("click", deleteSelectedExpenses);
    elements.selectAllExpenses.addEventListener("change", event => {
      const visibleIds = getVisibleHistoryExpenses().map(item => String(item.id));
      if (event.target.checked) {
        visibleIds.forEach(id => selectedExpenseIds.add(id));
      } else {
        visibleIds.forEach(id => selectedExpenseIds.delete(id));
      }
      renderHistory();
    });
    applyDateFilterBtn.addEventListener("click", loadExpensesFromSheet);
    clearDateFilterBtn.addEventListener("click", () => {
      RomeoDateRange.setCurrentMonth(elements.filterFromDate, elements.filterToDate);
      loadExpensesFromSheet();
    });
    elements.historyList.addEventListener("change", event => {
      const checkbox = event.target.closest("[data-select-id]");
      if (!checkbox) return;

      const id = String(checkbox.dataset.selectId);
      if (checkbox.checked) {
        selectedExpenseIds.add(id);
      } else {
        selectedExpenseIds.delete(id);
      }
      updateSelectedExpensesState();
    });
    elements.historyList.addEventListener("click", async event => {
      const btn = event.target.closest("[data-delete-id]");
      if (!btn || expenseWriteActive || expenseRead || !expensesFresh) return;
      event.stopImmediatePropagation();
      if (!confirm(localizeText("تحذف المصروف ده؟", "Delete this expense?"))) return;
      btn.disabled = true;
      btn.textContent = localizeText("جاري الحذف...", "Deleting...");
      await deleteExpenseLocalized(btn.dataset.deleteId);
    }, true);
    menuToggle.addEventListener("click", openSidebar);
    sidebarOverlay.addEventListener("click", closeSidebar);
    document.getElementById("logoutBtn").addEventListener("click", () => RomeoAuth.logout());
    window.addEventListener("romeo-language-change", renderAll);

    clearForm();
    renderAll();
    loadExpensesFromSheet();

