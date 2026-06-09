    const EXPENSES_KEY = "romeo-pos-expenses";
    const EXPENSE_CATEGORIES = [
      { id: "supplies", name: "Supplies", code: "SUP" },
      { id: "utilities", name: "Utilities", code: "UTL" },
      { id: "rent", name: "Rent", code: "RNT" },
      { id: "maintenance", name: "Maintenance", code: "MNT" },
      { id: "marketing", name: "Marketing", code: "MRK" },
      { id: "other", name: "Other", code: "OTH" }
    ];

    RomeoAuth.requireAuth();

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
        option.textContent = category.name;
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
      const filtered = EXPENSE_CATEGORIES.filter(category =>
        !query ||
        category.name.toLowerCase().includes(query) ||
        category.code.toLowerCase().includes(query)
      );

      elements.categoryList.innerHTML = "";

      filtered.forEach(category => {
        const total = getCategoryExpenses(category.id).reduce((sum, item) => sum + normalizeAmount(item.amount), 0);
        const card = document.createElement("button");
        card.type = "button";
        card.className = `category-card${category.id === selectedCategoryId ? " active" : ""}`;
        card.innerHTML = `
          <strong>${category.name}</strong>
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
        elements.categoryList.innerHTML = `<div class="history-empty">No category found.</div>`;
      }
    }

    function renderHero() {
      const category = getSelectedCategory();
      if (!category) {
        elements.categoryTitle.textContent = "No Category Selected";
        elements.categorySubtitle.textContent = "Ø§Ø®ØªØ± ØªØµÙ†ÙŠÙ Ù…Ù† Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø´Ù…Ø§Ù„ Ù„ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª.";
        elements.categoryCode.textContent = "--";
        return;
      }

      elements.categoryTitle.textContent = category.name;
      elements.categorySubtitle.textContent = `ÙƒÙ„ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª Ø§Ù„Ø®Ø§ØµØ© Ø¨ØªØµÙ†ÙŠÙ ${category.name} Ø³ØªØ¸Ù‡Ø± Ù‡Ù†Ø§ Ù…Ø¹ Ù…Ù„Ø®Øµ ØªÙ„Ù‚Ø§Ø¦ÙŠ ÙˆØ³Ø¬Ù„ ÙƒØ§Ù…Ù„.`;
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
        elements.historyList.innerHTML = `<div class="history-empty">Ù„Ø§ ÙŠÙˆØ¬Ø¯ ØªØµÙ†ÙŠÙ Ù…Ø®ØªØ§Ø± Ø§Ù„Ø¢Ù†.</div>`;
        return;
      }

      if (!sorted.length) {
        elements.historyList.innerHTML = `<div class="history-empty">Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…ØµØ±ÙˆÙØ§Øª Ù…Ø³Ø¬Ù„Ø© Ù„Ù‡Ø°Ø§ Ø§Ù„ØªØµÙ†ÙŠÙ Ø­ØªÙ‰ Ø§Ù„Ø¢Ù†.</div>`;
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

    function renderAll() {
      if (!EXPENSE_CATEGORIES.find(category => category.id === selectedCategoryId)) {
        selectedCategoryId = EXPENSE_CATEGORIES[0]?.id || null;
      }
      renderCategoryList();
      renderHero();
      renderSummary();
      renderHistory();
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
        alert("Ø§Ø®ØªØ§Ø± ØªØµÙ†ÙŠÙ ØµØ­ÙŠØ­.");
        return;
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        alert("Ø§ÙƒØªØ¨ Ù…Ø¨Ù„Øº Ù…ØµØ±ÙˆÙ ØµØ­ÙŠØ­.");
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
        alert(error.message || "ØªØ¹Ø°Ø± Ø­ÙØ¸ Ø§Ù„Ù…ØµØ±ÙˆÙ ÙÙŠ Ø§Ù„Ø´ÙŠØª.");
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
        alert(error.message || "ØªØ¹Ø°Ø± Ø­Ø°Ù Ø§Ù„Ù…ØµØ±ÙˆÙ Ù…Ù† Ø§Ù„Ø´ÙŠØª.");
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
    saveBtn.addEventListener("click", addExpense);
    clearBtn.addEventListener("click", clearForm);
    elements.historyList.addEventListener("click", async event => {
      const btn = event.target.closest("[data-delete-id]");
      if (!btn) return;
      if (!confirm("ØªØ­Ø°Ù Ø§Ù„Ù…ØµØ±ÙˆÙ Ø¯Ù‡ØŸ")) return;
      btn.disabled = true;
      btn.textContent = "Deleting...";
      await deleteExpense(Number(btn.dataset.deleteId));
    });
    menuToggle.addEventListener("click", openSidebar);
    sidebarOverlay.addEventListener("click", closeSidebar);
    document.getElementById("logoutBtn").addEventListener("click", () => RomeoAuth.logout());

    clearForm();
    renderAll();

