(() => {
  "use strict";

  RomeoAuth.requireAuth("view_inventory");

  const elements = {
    search: document.getElementById("searchInput"),
    list: document.getElementById("itemList"),
    title: document.getElementById("itemTitle"),
    subtitle: document.getElementById("itemSubtitle"),
    badge: document.getElementById("itemCode"),
    currentStock: document.getElementById("currentStock"),
    minimumStock: document.getElementById("minimumStock"),
    buyPrice: document.getElementById("buyPrice"),
    lowStockCount: document.getElementById("lowStockCount"),
    name: document.getElementById("itemName"),
    barcode: document.getElementById("itemBarcode"),
    category: document.getElementById("itemCategory"),
    type: document.getElementById("itemType"),
    unit: document.getElementById("itemUsageUnit"),
    packageSize: document.getElementById("itemPackageSize"),
    minimum: document.getElementById("itemMinimum"),
    purchasePrice: document.getElementById("itemBuyPrice"),
    salePrice: document.getElementById("itemSalePrice"),
    serviceEnabled: document.getElementById("itemServiceEnabled"),
    saleEnabled: document.getElementById("itemSaleEnabled"),
    history: document.getElementById("historyList"),
    purchasePacks: document.getElementById("purchasePacks"),
    purchasePriceInput: document.getElementById("purchasePrice"),
    purchaseDate: document.getElementById("purchaseDate"),
    purchaseSupplier: document.getElementById("purchaseSupplier"),
    purchaseExpiry: document.getElementById("purchaseExpiry"),
    purchaseNote: document.getElementById("purchaseNote"),
    purchaseTitle: document.getElementById("purchaseFormTitle"),
    addItem: document.getElementById("addItemBtn"),
    refresh: document.getElementById("refreshBtn"),
    saveItem: document.getElementById("saveItemBtn"),
    deleteItem: document.getElementById("deleteItemBtn"),
    addPurchase: document.getElementById("addPurchaseBtn"),
    clearPurchase: document.getElementById("clearPurchaseBtn"),
    recipeService: document.getElementById("recipeServiceSelect"),
    recipeItems: document.getElementById("recipeItemsList"),
    saveRecipe: document.getElementById("saveRecipeBtn"),
    barberConsumptionSelect: document.getElementById("barberConsumptionSelect"),
    barberConsumptionFrom: document.getElementById("barberConsumptionFrom"),
    barberConsumptionTo: document.getElementById("barberConsumptionTo"),
    loadBarberConsumption: document.getElementById("loadBarberConsumptionBtn"),
    barberConsumptionCost: document.getElementById("barberConsumptionCost"),
    barberConsumptionInvoices: document.getElementById("barberConsumptionInvoices"),
    barberConsumptionMovements: document.getElementById("barberConsumptionMovements"),
    barberConsumptionRows: document.getElementById("barberConsumptionRows")
  };

  const state = {
    items: [],
    batches: [],
    log: [],
    services: [],
    recipes: [],
    barberReport: { barbers: [], rows: [], summary: {} },
    selectedId: "",
    editingBatchId: "",
    loading: false
  };

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatNumber(value) {
    return number(value).toLocaleString("en-US", { maximumFractionDigits: 2 });
  }

  function formatMoney(value) {
    return `${formatNumber(value)} جنيه`;
  }

  function unitLabel(unit) {
    return { g: "جرام", ml: "مللي", piece: "قطعة", pack: "عبوة" }[unit] || unit || "وحدة";
  }

  function typeLabel(type) {
    return { consumable: "مستهلك للخدمات", retail: "منتج للبيع", both: "استخدام وبيع" }[type] || type;
  }

  function today() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function currentMonthStart() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
  }

  function selectedItem() {
    return state.items.find(item => item.itemId === state.selectedId) || null;
  }

  function stockOf(item) {
    return item?.stock || { sealedPacks: 0, openedPacks: 0, openedQuantity: 0, totalQuantity: 0, stockValue: 0 };
  }

  function isLow(item) {
    return number(stockOf(item).totalQuantity) <= number(item.minimumStock);
  }

  function setBusy(busy) {
    state.loading = busy;
    [elements.addItem, elements.refresh, elements.saveItem, elements.deleteItem, elements.addPurchase, elements.loadBarberConsumption]
      .filter(Boolean)
      .forEach(button => { button.disabled = busy; });
  }

  function notify(message, type = "info") {
    if (window.showToast) {
      window.showToast(message, type);
      return;
    }
    window.alert(message);
  }

  async function request(payload) {
    const result = await RomeoApi.request(payload);
    if (!result || result.status !== "success") {
      throw new Error(result?.message || "تعذر تنفيذ العملية.");
    }
    return result;
  }

  function renderList() {
    const query = String(elements.search?.value || "").trim().toLowerCase();
    const items = state.items.filter(item => item.active !== false && (
      !query ||
      item.name.toLowerCase().includes(query) ||
      String(item.category || "").toLowerCase().includes(query) ||
      String(item.barcode || "").toLowerCase().includes(query)
    ));

    elements.list.innerHTML = items.length ? items.map(item => {
      const stock = stockOf(item);
      return `
        <button type="button" class="item-card${item.itemId === state.selectedId ? " active" : ""}${isLow(item) ? " low" : ""}" data-item-id="${escapeHtml(item.itemId)}">
          <strong>${escapeHtml(item.name)}</strong>
          <div class="item-meta">
            <span>${escapeHtml(typeLabel(item.itemType))}</span>
            <span>${formatNumber(stock.totalQuantity)} ${escapeHtml(unitLabel(item.usageUnit))}</span>
          </div>
        </button>
      `;
    }).join("") : '<div class="history-empty">لا توجد أصناف مطابقة.</div>';
  }

  function renderSelected() {
    const item = selectedItem();
    if (!item) {
      elements.title.textContent = "أضف أول صنف للمخزون";
      elements.subtitle.textContent = "عرّف الصنف وحجم العبوة وأسعاره، ثم احفظه.";
      elements.badge.textContent = "NEW";
      elements.currentStock.textContent = "0";
      elements.minimumStock.textContent = "0";
      elements.buyPrice.textContent = "0";
      clearItemForm();
      renderHistory();
      return;
    }

    const stock = stockOf(item);
    elements.title.textContent = item.name;
    elements.subtitle.textContent = `${typeLabel(item.itemType)} · ${formatNumber(item.packageSize)} ${unitLabel(item.usageUnit)} في العبوة · ${formatNumber(stock.sealedPacks)} عبوة مقفولة`;
    elements.badge.textContent = item.itemId.replace(/^ITM-/, "").slice(0, 8).toUpperCase();
    elements.currentStock.textContent = `${formatNumber(stock.totalQuantity)} ${unitLabel(item.usageUnit)}`;
    elements.minimumStock.textContent = `${formatNumber(item.minimumStock)} ${unitLabel(item.usageUnit)}`;
    elements.buyPrice.textContent = formatMoney(item.purchasePrice);
    elements.name.value = item.name || "";
    elements.barcode.value = item.barcode || "";
    elements.category.value = item.category || "";
    elements.type.value = item.itemType || "consumable";
    elements.unit.value = item.usageUnit || "piece";
    elements.packageSize.value = item.packageSize || "";
    elements.minimum.value = item.minimumStock || 0;
    elements.purchasePrice.value = item.purchasePrice || 0;
    elements.salePrice.value = item.salePrice || 0;
    elements.serviceEnabled.checked = item.serviceEnabled !== false;
    elements.saleEnabled.checked = item.saleEnabled === true;
    if (!elements.purchasePriceInput.value) elements.purchasePriceInput.value = item.purchasePrice || "";
    renderHistory();
  }

  function renderSummary() {
    elements.lowStockCount.textContent = state.items.filter(item => item.active !== false && isLow(item)).length;
  }

  function renderHistory() {
    const item = selectedItem();
    const rows = item ? state.log.filter(entry => entry.itemId === item.itemId) : [];
    elements.history.innerHTML = rows.length ? rows.slice(0, 100).map(entry => {
      const positive = number(entry.quantity) >= 0;
      return `
        <article class="history-item">
          <div class="history-top">
            <strong class="history-amount ${positive ? "in" : "out"}">${positive ? "+" : ""}${formatNumber(entry.quantity)} ${escapeHtml(unitLabel(entry.unit))}</strong>
            <div>
              <span>${escapeHtml(entry.movementType || "movement")}</span>
              ${entry.movementType === "purchase" && entry.batchId ? `<button type="button" class="history-edit-btn" data-edit-purchase="${escapeHtml(entry.batchId)}">تعديل عملية الشراء</button>` : ""}
            </div>
          </div>
          <div class="history-meta">
            <span>${escapeHtml(entry.dateTime)}</span>
            <span>${escapeHtml(entry.username || "-")}</span>
            ${entry.invoiceId ? `<span>${escapeHtml(entry.invoiceId)}</span>` : ""}
          </div>
          <div class="history-note">${escapeHtml(entry.note || "لا توجد ملاحظة")}</div>
        </article>
      `;
    }).join("") : '<div class="history-empty">لا توجد حركات مخزون لهذا الصنف حتى الآن.</div>';
  }

  function render() {
    if (state.selectedId && !state.items.some(item => item.itemId === state.selectedId && item.active !== false)) {
      state.selectedId = "";
    }
    if (!state.selectedId) state.selectedId = state.items.find(item => item.active !== false)?.itemId || "";
    renderList();
    renderSelected();
    renderSummary();
    renderRecipeEditor();
  }

  function selectedRecipeService() {
    return state.services.find(service => service.serviceId === elements.recipeService.value) || null;
  }

  function renderRecipeEditor() {
    const previousServiceId = elements.recipeService.value;
    elements.recipeService.innerHTML = state.services.length
      ? state.services.map(service => `<option value="${escapeHtml(service.serviceId)}">${escapeHtml(service.name)}</option>`).join("")
      : '<option value="">لا توجد خدمات</option>';

    if (previousServiceId && state.services.some(service => service.serviceId === previousServiceId)) {
      elements.recipeService.value = previousServiceId;
    }

    renderRecipeItems();
  }

  function renderRecipeItems() {
    const service = selectedRecipeService();
    const recipeMap = new Map(
      state.recipes
        .filter(recipe => recipe.serviceId === service?.serviceId)
        .map(recipe => [recipe.itemId, recipe])
    );
    const items = state.items.filter(item => item.active !== false && item.serviceEnabled !== false);
    elements.recipeItems.innerHTML = items.length ? items.map(item => {
      const recipe = recipeMap.get(item.itemId);
      return `
        <div class="recipe-row">
          <strong>${escapeHtml(item.name)}</strong>
          <input type="number" min="0" step="0.01" value="${recipe ? escapeHtml(recipe.quantity) : ""}" placeholder="0" data-recipe-item-id="${escapeHtml(item.itemId)}">
          <span>${escapeHtml(unitLabel(item.usageUnit))}</span>
        </div>
      `;
    }).join("") : '<div class="history-empty">أضف أصنافًا متاحة للخدمات أولًا.</div>';
  }

  function renderBarberConsumptionReport() {
    const report = state.barberReport || { barbers: [], rows: [], summary: {} };
    const selectedBarberId = elements.barberConsumptionSelect.value;
    elements.barberConsumptionSelect.innerHTML = [
      '<option value="">كل الحلاقين</option>',
      ...(report.barbers || []).map(barber => `<option value="${escapeHtml(barber.barberId)}">${escapeHtml(barber.barberName)}</option>`)
    ].join("");
    if ((report.barbers || []).some(barber => barber.barberId === selectedBarberId)) {
      elements.barberConsumptionSelect.value = selectedBarberId;
    }

    elements.barberConsumptionCost.textContent = formatMoney(report.summary?.totalCost || 0);
    elements.barberConsumptionInvoices.textContent = formatNumber(report.summary?.invoiceCount || 0);
    elements.barberConsumptionMovements.textContent = formatNumber(report.summary?.totalMovements || 0);
    elements.barberConsumptionRows.innerHTML = (report.rows || []).length
      ? report.rows.map(row => `
          <tr>
            <td><strong>${escapeHtml(row.barberName)}</strong></td>
            <td>${escapeHtml(row.itemName)}</td>
            <td>${formatNumber(row.quantity)} ${escapeHtml(unitLabel(row.unit))}</td>
            <td>${formatMoney(row.cost)}</td>
            <td>${formatNumber(row.invoiceCount)}</td>
          </tr>
        `).join("")
      : '<tr><td colspan="5">لا توجد بيانات استهلاك مطابقة للفترة المختارة.</td></tr>';
  }

  async function loadBarberConsumptionReport() {
    setBusy(true);
    try {
      const result = await request({
        action: "getBarberConsumptionReport",
        barberId: elements.barberConsumptionSelect.value,
        fromDate: elements.barberConsumptionFrom.value,
        toDate: elements.barberConsumptionTo.value
      });
      state.barberReport = {
        barbers: Array.isArray(result.barbers) ? result.barbers : [],
        rows: Array.isArray(result.rows) ? result.rows : [],
        summary: result.summary || {}
      };
      renderBarberConsumptionReport();
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  function clearItemForm() {
    elements.name.value = "";
    elements.barcode.value = "";
    elements.category.value = "";
    elements.type.value = "consumable";
    elements.unit.value = "piece";
    elements.packageSize.value = "";
    elements.minimum.value = "0";
    elements.purchasePrice.value = "0";
    elements.salePrice.value = "0";
    elements.serviceEnabled.checked = true;
    elements.saleEnabled.checked = false;
  }

  function clearPurchaseForm() {
    state.editingBatchId = "";
    elements.purchaseTitle.textContent = "إضافة عملية شراء";
    elements.addPurchase.textContent = "إضافة عملية شراء";
    elements.clearPurchase.textContent = "مسح البيانات";
    elements.purchasePacks.value = "";
    elements.purchasePriceInput.value = selectedItem()?.purchasePrice || "";
    elements.purchaseDate.value = today();
    elements.purchaseSupplier.value = "";
    elements.purchaseExpiry.value = "";
    elements.purchaseNote.value = "";
  }

  function startPurchaseEdit(batchId) {
    const batch = state.batches.find(entry => entry.batchId === batchId);
    if (!batch) return notify("تعذر العثور على عملية الشراء.", "error");
    if (batch.itemId !== state.selectedId) {
      state.selectedId = batch.itemId;
      render();
    }
    const purchaseLog = state.log.find(entry => entry.batchId === batchId && entry.movementType === "purchase");
    state.editingBatchId = batchId;
    elements.purchaseTitle.textContent = "تعديل عملية الشراء";
    elements.addPurchase.textContent = "حفظ تعديل الشراء";
    elements.clearPurchase.textContent = "إلغاء التعديل";
    elements.purchasePacks.value = batch.purchasedPacks;
    elements.purchasePriceInput.value = batch.purchasePrice;
    elements.purchaseDate.value = batch.purchaseDate || today();
    elements.purchaseSupplier.value = batch.supplier || "";
    elements.purchaseExpiry.value = batch.expiryDate || "";
    elements.purchaseNote.value = purchaseLog?.note || "";
    elements.purchasePacks.focus();
  }

  async function loadData({ preserveSelection = true } = {}) {
    const oldSelection = preserveSelection ? state.selectedId : "";
    setBusy(true);
    try {
      const [result, servicesResult, recipesResult] = await Promise.all([
        request({ action: "getInventoryData", limit: 500 }),
        request({ action: "getServices" }),
        request({ action: "getServiceRecipes" })
      ]);
      state.items = Array.isArray(result.items) ? result.items : [];
      state.batches = Array.isArray(result.batches) ? result.batches : [];
      state.log = Array.isArray(result.log) ? result.log : [];
      state.services = Array.isArray(servicesResult.services) ? servicesResult.services : [];
      state.recipes = Array.isArray(recipesResult.recipes) ? recipesResult.recipes : [];
      state.selectedId = oldSelection;
      render();
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function saveItem() {
    const name = elements.name.value.trim();
    const packageSize = number(elements.packageSize.value);
    if (!name) return notify("اكتب اسم الصنف.", "error");
    if (packageSize <= 0) return notify("اكتب حجم عبوة أكبر من صفر.", "error");
    setBusy(true);
    try {
      const result = await request({
        action: "saveInventoryItem",
        item: {
          itemId: state.selectedId,
          name,
          barcode: elements.barcode.value.trim(),
          category: elements.category.value.trim(),
          itemType: elements.type.value,
          usageUnit: elements.unit.value,
          packageSize,
          minimumStock: number(elements.minimum.value),
          purchasePrice: number(elements.purchasePrice.value),
          salePrice: number(elements.salePrice.value),
          serviceEnabled: elements.serviceEnabled.checked,
          saleEnabled: elements.saleEnabled.checked,
          active: true
        }
      });
      state.selectedId = result.itemId;
      await loadData();
      clearPurchaseForm();
      notify("تم حفظ الصنف بنجاح.", "success");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem() {
    const item = selectedItem();
    if (!item || !window.confirm(`هل تريد إيقاف الصنف ${item.name}؟`)) return;
    setBusy(true);
    try {
      await request({ action: "deleteInventoryItem", itemId: item.itemId });
      state.selectedId = "";
      await loadData({ preserveSelection: false });
      notify("تم إيقاف الصنف مع الاحتفاظ بسجله.", "success");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function addPurchase() {
    const item = selectedItem();
    if (!item) return notify("احفظ أو اختر صنفًا أولًا.", "error");
    const packs = number(elements.purchasePacks.value);
    if (packs <= 0) return notify("اكتب عدد العبوات المشتراة.", "error");
    setBusy(true);
    try {
      const editing = Boolean(state.editingBatchId);
      await request({
        action: editing ? "updateInventoryPurchase" : "addInventoryPurchase",
        purchase: {
          batchId: state.editingBatchId,
          itemId: item.itemId,
          purchasedPacks: packs,
          packageSize: item.packageSize,
          purchasePrice: number(elements.purchasePriceInput.value),
          purchaseDate: elements.purchaseDate.value || today(),
          supplier: elements.purchaseSupplier.value.trim(),
          expiryDate: elements.purchaseExpiry.value,
          note: elements.purchaseNote.value.trim()
        }
      });
      await loadData();
      clearPurchaseForm();
      notify(editing ? "تم تعديل عملية الشراء بنجاح." : "تمت إضافة عملية الشراء للمخزون.", "success");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function saveRecipe() {
    const service = selectedRecipeService();
    if (!service) return notify("اختر خدمة أولًا.", "error");
    const ingredients = [...elements.recipeItems.querySelectorAll("[data-recipe-item-id]")]
      .map(input => ({ itemId: input.dataset.recipeItemId, quantity: number(input.value) }))
      .filter(ingredient => ingredient.quantity > 0);
    setBusy(true);
    try {
      await request({
        action: "saveServiceRecipe",
        serviceId: service.serviceId,
        serviceName: service.name,
        ingredients
      });
      const result = await request({ action: "getServiceRecipes" });
      state.recipes = Array.isArray(result.recipes) ? result.recipes : [];
      renderRecipeItems();
      notify("تم حفظ استهلاك الخدمة.", "success");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  elements.list.addEventListener("click", event => {
    const card = event.target.closest("[data-item-id]");
    if (!card) return;
    state.selectedId = card.dataset.itemId;
    render();
    clearPurchaseForm();
  });
  elements.history.addEventListener("click", event => {
    const button = event.target.closest("[data-edit-purchase]");
    if (!button) return;
    startPurchaseEdit(button.dataset.editPurchase);
  });
  elements.search.addEventListener("input", renderList);
  elements.addItem.addEventListener("click", () => {
    state.selectedId = "";
    clearItemForm();
    elements.title.textContent = "صنف جديد";
    elements.badge.textContent = "NEW";
    elements.name.focus();
  });
  elements.refresh.addEventListener("click", () => loadData());
  elements.saveItem.addEventListener("click", saveItem);
  elements.deleteItem.addEventListener("click", deleteItem);
  elements.addPurchase.addEventListener("click", addPurchase);
  elements.clearPurchase.addEventListener("click", clearPurchaseForm);
  elements.recipeService.addEventListener("change", renderRecipeItems);
  elements.saveRecipe.addEventListener("click", saveRecipe);
  elements.loadBarberConsumption.addEventListener("click", loadBarberConsumptionReport);

  clearPurchaseForm();
  elements.barberConsumptionFrom.value = currentMonthStart();
  elements.barberConsumptionTo.value = today();
  loadData({ preserveSelection: false }).then(loadBarberConsumptionReport);
})();
