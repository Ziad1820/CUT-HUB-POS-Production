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
      expenseCategory: document.getElementById("expenseCategory"),
      expenseTitle: document.getElementById("expenseTitle"),
      expenseNote: document.getElementById("expenseNote"),
      filterFromDate: document.getElementById("filterFromDate"),
      filterToDate: document.getElementById("filterToDate"),
      selectAllExpenses: document.getElementById("selectAllExpenses"),
      deleteSelectedBtn: document.getElementById("deleteSelectedBtn"),
      selectedExpensesCount: document.getElementById("selectedExpensesCount"),
      historyList: document.getElementById("historyList")
    };

    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const saveBtn = document.getElementById("saveBtn");
    const clearBtn = document.getElementById("clearBtn");
    const applyDateFilterBtn = document.getElementById("applyDateFilterBtn");
    const clearDateFilterBtn = document.getElementById("clearDateFilterBtn");

    let expenseList = [];
    let selectedExpenseIds = new Set();
    let selectedCategoryId = EXPENSE_CATEGORIES[0]?.id || null;

    populateCategorySelect();

    if (!elements.expenseDate.value) {
      elements.expenseDate.value = new Date().toISOString().slice(0, 10);
    }

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

    function normalizeExpenseFromSheet(expense) {
      return {
        id: String(expense.expenseId || expense.id || expense.rowNumber || Date.now()),
        rowNumber: expense.rowNumber || "",
        categoryId: expense.categoryId || getExpenseCategoryId(expense.category),
        amount: normalizeAmount(expense.amount),
        date: expense.date || new Date().toISOString().slice(0, 10),
        title: String(expense.title || "").trim(),
        note: String(expense.note || "").trim()
      };
    }

    async function loadExpensesFromSheet() {
      try {
        const data = await RomeoApi.request({ action: "getExpenses" });
        if (data.status !== "success") {
          throw new Error(data.message || "Failed to load expenses");
        }

        expenseList = Array.isArray(data.expenses)
          ? data.expenses.map(normalizeExpenseFromSheet)
          : [];
        renderAll();
      } catch (error) {
        console.error(error);
        elements.historyList.innerHTML = `<div class="history-empty">${localizeText("تعذر تحميل المصروفات من الشيت.", "Could not load expenses from the sheet.")}</div>`;
      }
    }

    async function saveExpenseToSheet(expense) {
      const category = EXPENSE_CATEGORIES.find(item => item.id === expense.categoryId);
      const data = await RomeoApi.request({
        action: "expense",
        expenseId: expense.id,
        category: category ? category.name : expense.categoryId,
        amount: expense.amount,
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

    function removeExpenseLocally(expense) {
      expenseList = expenseList.filter(item => String(item.id) !== String(expense.id));
      selectedExpenseIds.delete(String(expense.id));
      renderAll();
    }

    function populateCategorySelect() {
      elements.expenseCategory.innerHTML = "";
      EXPENSE_CATEGORIES.forEach(category => {
        const option = document.createElement("option");
        option.value = category.id;
        option.textContent = getCategoryLabel(category);
        elements.expenseCategory.appendChild(option);
      });
    }

    function getSelectedCategory() {
      return EXPENSE_CATEGORIES.find(category => category.id === selectedCategoryId) || null;
    }

    function isDateInFilter(dateValue) {
      const date = String(dateValue || "").slice(0, 10);
      const fromDate = elements.filterFromDate.value;
      const toDate = elements.filterToDate.value;

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
      elements.deleteSelectedBtn.disabled = selectedCount === 0;
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
          selectedCategoryId = category.id;
          elements.expenseCategory.value = category.id;
          renderAll();
        });
        elements.categoryList.appendChild(card);
      });

      if (!filtered.length) {
        elements.categoryList.innerHTML = `<div class="history-empty">${localizeText("لا يوجد تصنيف مطابق.", "No category found.")}</div>`;
      }
    }

    function renderHero() {
      const category = getSelectedCategory();
      if (!category) {
        elements.categoryTitle.textContent = "No Category Selected";
        elements.categorySubtitle.textContent = localizeText("اختر تصنيف من القائمة لتسجيل المصروفات.", "Choose a category from the list to record expenses.");
        elements.categoryCode.textContent = "--";
        return;
      }

      elements.categoryTitle.textContent = category.name;
      elements.categorySubtitle.textContent = localizeText(
        `كل المصروفات الخاصة بتصنيف ${category.name} ستظهر هنا مع ملخص تلقائي وسجل كامل.`,
        `All expenses for ${category.name} will appear here with an automatic summary and full history.`
      );
      elements.categoryCode.textContent = category.code;
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
        const row = document.createElement("article");
        row.className = "history-item";
        row.innerHTML = `
          <div class="history-top">
            <div class="history-amount">${formatMoney(item.amount)}</div>
            <button type="button" class="action-btn soft" data-delete-id="${item.id}">Delete</button>
          </div>
          <div class="history-meta">
            <span>${item.title || category.name}</span>
            <span>${item.date}</span>
            <span>${category.code}</span>
          </div>
          <div class="history-note">${item.note || "No note"}</div>
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

      elements.categoryTitle.textContent = category.name;
      elements.categorySubtitle.textContent = localizeText(
        `كل المصروفات الخاصة بتصنيف ${category.name} ستظهر هنا مع ملخص تلقائي وسجل كامل.`,
        `All expenses for ${category.name} will appear here with an automatic summary and full history.`
      );
      elements.categoryCode.textContent = category.code;
    }

    function localizeHistoryEmptyState() {
      const category = getSelectedCategory();
      const items = category ? getCategoryExpenses(category.id) : [];

      if (!category) {
        elements.historyList.innerHTML = `<div class="history-empty">${localizeText("لا يوجد تصنيف مختار الآن.", "No category is selected right now.")}</div>`;
        return;
      }

      if (!items.length) {
        elements.historyList.innerHTML = `<div class="history-empty">${localizeText("لا توجد مصروفات مسجلة لهذا التصنيف حتى الآن.", "No expenses have been recorded for this category yet.")}</div>`;
      }
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

    function localizeHistoryEmptyState() {
      const category = getSelectedCategory();
      const items = category ? getCategoryExpenses(category.id) : [];

      if (!category) {
        elements.historyList.innerHTML = `<div class="history-empty">${localizeText("لا يوجد تصنيف مختار الآن.", "No category is selected right now.")}</div>`;
        return;
      }

      if (!items.length) {
        elements.historyList.innerHTML = `<div class="history-empty">${localizeText("لا توجد مصروفات مسجلة لهذا التصنيف حتى الآن.", "No expenses have been recorded for this category yet.")}</div>`;
      }
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
      localizeHistoryEmptyState();
      applyPageLanguage();
    }

    function clearForm() {
      elements.expenseAmount.value = "";
      elements.expenseTitle.value = "";
      elements.expenseNote.value = "";
      elements.expenseDate.value = new Date().toISOString().slice(0, 10);
      elements.expenseCategory.value = selectedCategoryId || EXPENSE_CATEGORIES[0]?.id || "";
    }

    async function addExpense() {
      const amount = normalizeAmount(elements.expenseAmount.value);
      const categoryId = elements.expenseCategory.value;
      const category = EXPENSE_CATEGORIES.find(item => item.id === categoryId);

      if (!category) {
        alert(localizeText("اختار تصنيف صحيح.", "Choose a valid category."));
        return;
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        alert(localizeText("اكتب مبلغ مصروف صحيح.", "Enter a valid expense amount."));
        return;
      }

      const expense = {
        id: Date.now(),
        categoryId,
        amount,
        date: elements.expenseDate.value || new Date().toISOString().slice(0, 10),
        title: elements.expenseTitle.value.trim(),
        note: elements.expenseNote.value.trim()
      };

      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";

      try {
        await saveExpenseToSheet(expense);
        selectedCategoryId = categoryId;
        clearForm();
        await loadExpensesFromSheet();
      } catch (error) {
        console.error(error);
        alert(error.message || localizeText("تعذر حفظ المصروف في الشيت.", "Could not save the expense to the sheet."));
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Add Expense";
      }
    }

    async function deleteExpense(id) {
      const expense = expenseList.find(item => String(item.id) === String(id));
      if (!expense) {
        return;
      }

      try {
        await deleteExpenseFromSheet(expense);
        await loadExpensesFromSheet();
      } catch (error) {
        console.error(error);
        alert(error.message || localizeText("تعذر حذف المصروف من الشيت.", "Could not delete the expense from the sheet."));
      }
    }

    async function addExpenseLocalized() {
      const amount = normalizeAmount(elements.expenseAmount.value);
      const categoryId = elements.expenseCategory.value;
      const category = EXPENSE_CATEGORIES.find(item => item.id === categoryId);

      if (!category) {
        alert(localizeText("اختار تصنيف صحيح.", "Choose a valid category."));
        return;
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        alert(localizeText("اكتب مبلغ مصروف صحيح.", "Enter a valid expense amount."));
        return;
      }

      const expense = {
        id: Date.now(),
        categoryId,
        amount,
        date: elements.expenseDate.value || new Date().toISOString().slice(0, 10),
        title: elements.expenseTitle.value.trim(),
        note: elements.expenseNote.value.trim()
      };

      saveBtn.disabled = true;
      saveBtn.textContent = localizeText("جاري الحفظ...", "Saving...");

      try {
        await saveExpenseToSheet(expense);
        selectedCategoryId = categoryId;
        clearForm();
        await loadExpensesFromSheet();
      } catch (error) {
        console.error(error);
        alert(error.message || localizeText("تعذر حفظ المصروف في الشيت.", "Could not save the expense to the sheet."));
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = localizeText("إضافة مصروف", "Add Expense");
      }
    }

    async function deleteExpenseLocalized(id) {
      const expense = expenseList.find(item => String(item.id) === String(id));
      if (!expense) return;

      try {
        await deleteExpenseFromSheet(expense);
        await loadExpensesFromSheet();
      } catch (error) {
        if (isNotFoundError(error)) {
          removeExpenseLocally(expense);
          return;
        }
        console.error(error);
        alert(error.message || localizeText("تعذر حذف المصروف من الشيت.", "Could not delete the expense from the sheet."));
      }
    }

    async function deleteSelectedExpenses() {
      const selectedItems = expenseList.filter(item => selectedExpenseIds.has(String(item.id)));
      if (!selectedItems.length) {
        return;
      }

      if (!confirm(localizeText("تحذف المصروفات المحددة؟", "Delete selected expenses?"))) {
        return;
      }

      elements.deleteSelectedBtn.disabled = true;
      elements.deleteSelectedBtn.textContent = localizeText("جاري الحذف...", "Deleting...");

      try {
        for (const expense of selectedItems) {
          try {
            await deleteExpenseFromSheet(expense);
          } catch (error) {
            if (!isNotFoundError(error)) {
              throw error;
            }
          }
        }
        selectedExpenseIds.clear();
        await loadExpensesFromSheet();
      } catch (error) {
        console.error(error);
        alert(error.message || localizeText("تعذر حذف المصروفات المحددة.", "Could not delete selected expenses."));
      } finally {
        elements.deleteSelectedBtn.textContent = localizeText("حذف المحدد", "Delete Selected");
        updateSelectedExpensesState();
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

    elements.searchInput.addEventListener("input", renderCategoryList);
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
    applyDateFilterBtn.addEventListener("click", renderAll);
    clearDateFilterBtn.addEventListener("click", () => {
      elements.filterFromDate.value = "";
      elements.filterToDate.value = "";
      selectedExpenseIds.clear();
      renderAll();
    });
    elements.filterFromDate.addEventListener("change", renderAll);
    elements.filterToDate.addEventListener("change", renderAll);
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
      if (!btn) return;
      event.stopImmediatePropagation();
      if (!confirm(localizeText("تحذف المصروف ده؟", "Delete this expense?"))) return;
      btn.disabled = true;
      btn.textContent = localizeText("جاري الحذف...", "Deleting...");
      await deleteExpenseLocalized(btn.dataset.deleteId);
    }, true);
    elements.historyList.addEventListener("click", async event => {
      const btn = event.target.closest("[data-delete-id]");
      if (!btn) return;
      if (!confirm(localizeText("تحذف المصروف ده؟", "Delete this expense?"))) return;
      btn.disabled = true;
      btn.textContent = localizeText("جاري الحذف...", "Deleting...");
      await deleteExpenseLocalized(btn.dataset.deleteId);
    });
    menuToggle.addEventListener("click", openSidebar);
    sidebarOverlay.addEventListener("click", closeSidebar);
    document.getElementById("logoutBtn").addEventListener("click", () => RomeoAuth.logout());
    window.addEventListener("romeo-language-change", renderAll);

    clearForm();
    renderAll();
    loadExpensesFromSheet();

