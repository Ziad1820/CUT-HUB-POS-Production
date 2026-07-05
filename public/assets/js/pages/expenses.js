    const EXPENSES_KEY = "romeo-pos-expenses";
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
      historyList: document.getElementById("historyList")
    };

    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const saveBtn = document.getElementById("saveBtn");
    const clearBtn = document.getElementById("clearBtn");

    let expenseList = getExpenses();
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

    function getExpenses() {
      try {
        const parsed = JSON.parse(localStorage.getItem(EXPENSES_KEY) || "[]");
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        return [];
      }
    }

    function saveExpenses() {
      localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenseList));
    }

    async function saveExpenseToSheet(expense) {
      const category = EXPENSE_CATEGORIES.find(item => item.id === expense.categoryId);
      const response = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "expense",
          expenseId: expense.id,
          category: category ? category.name : expense.categoryId,
          amount: expense.amount,
          title: expense.title,
          note: expense.note,
          date: expense.date
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to save expense (${response.status})`);
      }

      const data = await response.json();
      if (data.status !== "success") {
        throw new Error(data.message || "Failed to save expense");
      }
    }

    async function deleteExpenseFromSheet(expense) {
      const category = EXPENSE_CATEGORIES.find(item => item.id === expense.categoryId);
      const response = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "deleteExpense",
          expenseId: expense.id,
          category: category ? category.name : expense.categoryId,
          amount: expense.amount,
          title: expense.title,
          note: expense.note,
          date: expense.date
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to delete expense (${response.status})`);
      }

      const data = await response.json();
      if (data.status !== "success") {
        throw new Error(data.message || "Failed to delete expense");
      }
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

    function getCategoryExpenses(categoryId) {
      return expenseList.filter(item => item.categoryId === categoryId);
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
      const allTotal = expenseList.reduce((sum, item) => sum + normalizeAmount(item.amount), 0);
      const average = expenseList.length ? allTotal / expenseList.length : 0;

      elements.categoryExpenses.textContent = formatMoney(categoryTotal);
      elements.categoryRecords.textContent = categoryItems.length;
      elements.allExpenses.textContent = formatMoney(allTotal);
      elements.averageExpense.textContent = formatMoney(average);
    }

    function renderHistory() {
      const category = getSelectedCategory();
      const items = category ? getCategoryExpenses(category.id) : [];
      const sorted = [...items].sort((a, b) => new Date(b.date) - new Date(a.date));
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
      const items = category ? getCategoryExpenses(category.id) : [];
      const sorted = [...items].sort((a, b) => new Date(b.date) - new Date(a.date));
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
            <div class="history-amount">${formatMoney(item.amount)}</div>
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
        expenseList.unshift(expense);
        selectedCategoryId = categoryId;
        saveExpenses();
        clearForm();
        renderAll();
      } catch (error) {
        console.error(error);
        alert(error.message || localizeText("تعذر حفظ المصروف في الشيت.", "Could not save the expense to the sheet."));
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Add Expense";
      }
    }

    async function deleteExpense(id) {
      const expense = expenseList.find(item => item.id === id);
      if (!expense) {
        return;
      }

      try {
        await deleteExpenseFromSheet(expense);
        expenseList = expenseList.filter(item => item.id !== id);
        saveExpenses();
        renderAll();
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
        expenseList.unshift(expense);
        selectedCategoryId = categoryId;
        saveExpenses();
        clearForm();
        renderAll();
      } catch (error) {
        console.error(error);
        alert(error.message || localizeText("تعذر حفظ المصروف في الشيت.", "Could not save the expense to the sheet."));
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = localizeText("إضافة مصروف", "Add Expense");
      }
    }

    async function deleteExpenseLocalized(id) {
      const expense = expenseList.find(item => item.id === id);
      if (!expense) return;

      try {
        await deleteExpenseFromSheet(expense);
        expenseList = expenseList.filter(item => item.id !== id);
        saveExpenses();
        renderAll();
      } catch (error) {
        console.error(error);
        alert(error.message || localizeText("تعذر حذف المصروف من الشيت.", "Could not delete the expense from the sheet."));
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
    elements.historyList.addEventListener("click", async event => {
      const btn = event.target.closest("[data-delete-id]");
      if (!btn) return;
      event.stopImmediatePropagation();
      if (!confirm(localizeText("تحذف المصروف ده؟", "Delete this expense?"))) return;
      btn.disabled = true;
      btn.textContent = localizeText("جاري الحذف...", "Deleting...");
      await deleteExpenseLocalized(Number(btn.dataset.deleteId));
    }, true);
    elements.historyList.addEventListener("click", async event => {
      const btn = event.target.closest("[data-delete-id]");
      if (!btn) return;
      if (!confirm(localizeText("تحذف المصروف ده؟", "Delete this expense?"))) return;
      btn.disabled = true;
      btn.textContent = localizeText("جاري الحذف...", "Deleting...");
      await deleteExpenseLocalized(Number(btn.dataset.deleteId));
    });
    menuToggle.addEventListener("click", openSidebar);
    sidebarOverlay.addEventListener("click", closeSidebar);
    document.getElementById("logoutBtn").addEventListener("click", () => RomeoAuth.logout());
    window.addEventListener("romeo-language-change", renderAll);

    clearForm();
    renderAll();

