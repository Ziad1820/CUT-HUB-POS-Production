(() => {
  "use strict";

  RomeoAuth.requireAuth("view_inventory");

  const elements = {
    search: document.getElementById("searchInput"),
    negativeFilter: document.getElementById("negativeStockFilterBtn"),
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
    negativeOnly: false,
    loading: false,
    fresh: false
  };

  let inventoryRead = null, reportRead = null, pendingReport = null, reportSequence = 0;
  const inventoryStatus = document.getElementById("inventoryStatus");
  const reportStatus = document.getElementById("inventoryReportStatus");
  function timing(operation, startedAt, outcome) {
    if (new URLSearchParams(window.location.search).get("performance") === "1")
      console.info("[INVENTORY_PERF] " + JSON.stringify({ operation, totalMs: Date.now() - startedAt, outcome }));
  }

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

  function today() { return RomeoDateRange.today(); }
  function currentMonthStart() { return today().slice(0, 8) + "01"; }

  function selectedItem() {
    return state.items.find(item => item.itemId === state.selectedId) || null;
  }

  function stockOf(item) {
    return item?.stock || { sealedPacks: 0, openedPacks: 0, openedQuantity: 0, totalQuantity: 0, stockValue: 0 };
  }

  function isLow(item) {
    return number(stockOf(item).totalQuantity) <= number(item.minimumStock);
  }

  function isNegative(item) {
    return number(stockOf(item).totalQuantity) < 0;
  }

  function updateControls() {
    const blocked = state.loading || Boolean(inventoryRead) || !state.fresh;
    [elements.addItem, elements.saveItem, elements.deleteItem, elements.addPurchase, elements.saveRecipe]
      .filter(Boolean).forEach(button => { button.disabled = blocked; });
    [elements.name, elements.barcode, elements.category, elements.type, elements.unit, elements.packageSize,
      elements.minimum, elements.purchasePrice, elements.salePrice, elements.serviceEnabled, elements.saleEnabled,
      elements.purchasePacks, elements.purchasePriceInput, elements.purchaseDate, elements.purchaseSupplier,
      elements.purchaseExpiry, elements.purchaseNote].forEach(input => { input.disabled = state.loading; });
    elements.recipeItems.querySelectorAll("[data-recipe-item-id]").forEach(input => { input.disabled = state.loading; });
    elements.refresh.disabled = state.loading;
    elements.loadBarberConsumption.disabled = false;
    [elements.clearPurchase, elements.recipeService].forEach(input => { input.disabled = state.loading; });
    elements.history.querySelectorAll("[data-edit-purchase]").forEach(button => { button.disabled = blocked; });
  }

  function setBusy(busy) {
    state.loading = busy;
    if (busy) state.fresh = false;
    updateControls();
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
    const items = window.RomeoInventoryFilters.filterItems(state.items, query, state.negativeOnly);

    elements.list.innerHTML = items.length ? items.map(item => {
      const stock = stockOf(item);
      return `
        <button type="button" class="item-card${item.itemId === state.selectedId ? " active" : ""}${isNegative(item) ? " negative" : (isLow(item) ? " low" : "")}" data-item-id="${escapeHtml(item.itemId)}">
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
      elements.currentStock.closest(".summary-card")?.classList.remove("negative");
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
    elements.currentStock.closest(".summary-card")?.classList.toggle("negative", isNegative(item));
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
    if (elements.negativeFilter) {
      const negativeCount = state.items.filter(item => item.active !== false && isNegative(item)).length;
      const english = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
      const label = elements.negativeFilter.querySelector("[data-negative-filter-label]");
      const count = elements.negativeFilter.querySelector("[data-negative-filter-count]");
      if (label) label.textContent = english ? "Negative Stock Items" : "الأصناف ذات الرصيد السالب";
      if (count) count.textContent = negativeCount;
      elements.negativeFilter.setAttribute("aria-pressed", String(state.negativeOnly));
      elements.negativeFilter.title = state.negativeOnly
        ? (english ? "Show all inventory" : "عرض كل المخزون")
        : (english ? "Show negative stock only" : "عرض المخزون السالب فقط");
    }
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
            ${entry.movementType === "service_consumption" && entry.balanceBefore !== null && entry.balanceBefore !== undefined
              ? `<span>الرصيد: ${formatNumber(entry.balanceBefore)} ← ${formatNumber(entry.balanceAfter)} ${escapeHtml(unitLabel(entry.unit))}</span>`
              : ""}
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

  function loadBarberConsumptionReport() {
    const range = RomeoDateRange.validate(elements.barberConsumptionFrom.value, elements.barberConsumptionTo.value);
    if (!range.ok) {
      ++reportSequence;
      reportStatus.textContent = "اختر فترة صحيحة؛ التقرير الظاهر من آخر تحميل ناجح.";
      return Promise.resolve(false);
    }
    const input = { action: "getBarberConsumptionReport", barberId: elements.barberConsumptionSelect.value,
      fromDate: range.fromDate, toDate: range.toDate };
    const key = JSON.stringify(input);
    if (reportRead?.key === key && !pendingReport) return reportRead.promise;
    if (pendingReport?.key === key) return pendingReport.promise;
    const job = { key, input, sequence: ++reportSequence, startedAt: Date.now() };
    job.promise = new Promise(resolve => { job.resolve = resolve; });
    if (reportRead) {
      if (pendingReport) pendingReport.resolve(false);
      pendingReport = job;
    } else startReportRead(job);
    return job.promise;
  }

  async function startReportRead(job) {
    reportRead = job;
    reportStatus.textContent = "جاري تحميل تقرير الاستهلاك...";
    const current = () => job.sequence === reportSequence && job.input.barberId === elements.barberConsumptionSelect.value &&
      job.input.fromDate === elements.barberConsumptionFrom.value && job.input.toDate === elements.barberConsumptionTo.value;
    let ok = false, outcome = "superseded";
    try {
      const result = await request(job.input);
      if (!current()) return;
      if (!Array.isArray(result.barbers) || !Array.isArray(result.rows) || !result.summary) throw Error("INVALID_REPORT");
      state.barberReport = { barbers: result.barbers, rows: result.rows, summary: result.summary };
      renderBarberConsumptionReport();
      reportStatus.textContent = "";
      ok = true; outcome = "success";
    } catch (_) {
      if (current()) { outcome = "error"; reportStatus.textContent = "تعذر تحديث التقرير؛ البيانات الظاهرة من آخر تحميل ناجح."; }
    } finally {
      reportRead = null;
      if (outcome === "superseded" && !pendingReport) reportStatus.textContent = "الفلاتر اتغيّرت؛ اضغط عرض التقرير لتحديث الأرقام.";
      timing("report", job.startedAt, outcome);
      job.resolve(ok);
      if (pendingReport) { const next = pendingReport; pendingReport = null; startReportRead(next); }
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

  function loadData({ preserveSelection = true, fresh = false } = {}) {
    if (state.loading && !fresh) return Promise.resolve(false);
    if (inventoryRead) return inventoryRead;
    if (!preserveSelection) state.selectedId = "";
    const startedAt = Date.now();
    inventoryStatus.textContent = "جاري تحميل المخزون...";
    // Start in a microtask so even immediate mock failures release the registered request.
    inventoryRead = Promise.resolve().then(async () => {
      let outcome = "error";
      try {
        const result = await request({ action: "getInventoryPage", limit: 500 });
        for (const key of ["items", "batches", "log", "services", "recipes"])
          if (!Array.isArray(result[key])) throw Error("INVALID_INVENTORY");
        state.items = result.items; state.batches = result.batches; state.log = result.log;
        state.services = result.services; state.recipes = result.recipes;
        state.fresh = true;
        render();
        inventoryStatus.textContent = "";
        outcome = "success";
        return true;
      } catch (_) {
        inventoryStatus.textContent = "تعذر تحديث المخزون؛ الأرصدة الظاهرة من آخر تحميل ناجح. حاول مرة أخرى.";
        return false;
      } finally {
        inventoryRead = null;
        updateControls();
        timing("inventory", startedAt, outcome);
      }
    });
    updateControls();
    return inventoryRead;
  }

  function canWrite() { return state.fresh && !state.loading && !inventoryRead; }

  async function writeInventory(action, onSuccess, message, afterRefresh) {
    if (!canWrite()) return false;
    const draftInputs = [elements.name, elements.barcode, elements.category, elements.type, elements.unit, elements.packageSize,
      elements.minimum, elements.purchasePrice, elements.salePrice, elements.serviceEnabled, elements.saleEnabled,
      elements.purchasePacks, elements.purchasePriceInput, elements.purchaseDate, elements.purchaseSupplier,
      elements.purchaseExpiry, elements.purchaseNote];
    const draft = draftInputs.map(input => ({ input, value: input.value, checked: input.checked }));
    const recipeDraft = [...elements.recipeItems.querySelectorAll("[data-recipe-item-id]")].map(input => ({ id: input.dataset.recipeItemId, value: input.value }));
    setBusy(true);
    let completed = false;
    try { const result = await action(); onSuccess?.(result); completed = true; }
    catch (_) { notify("تعذر تأكيد العملية؛ سنراجع البيانات قبل السماح بعملية أخرى.", "error"); }
    finally {
      const refreshed = await loadData({ fresh: true });
      if (!completed) {
        draft.forEach(({ input, value, checked }) => { input.value = value; input.checked = checked; });
        elements.recipeItems.querySelectorAll("[data-recipe-item-id]").forEach(input => {
          const saved = recipeDraft.find(row => row.id === input.dataset.recipeItemId); if (saved) input.value = saved.value;
        });
      }
      setBusy(false);
      if (completed && refreshed) { afterRefresh?.(); notify(message, "success"); }
      reportStatus.textContent = "حدّث تقرير الاستهلاك لمراجعة آخر البيانات.";
    }
    return completed;
  }

  async function saveItem() {
    if (!canWrite()) return;
    const name = elements.name.value.trim(), packageSize = number(elements.packageSize.value);
    if (!name) return notify("اكتب اسم الصنف.", "error");
    if (packageSize <= 0) return notify("اكتب حجم عبوة أكبر من صفر.", "error");
    const item = { itemId: state.selectedId, name, barcode: elements.barcode.value.trim(), category: elements.category.value.trim(),
      itemType: elements.type.value, usageUnit: elements.unit.value, packageSize, minimumStock: number(elements.minimum.value),
      purchasePrice: number(elements.purchasePrice.value), salePrice: number(elements.salePrice.value),
      serviceEnabled: elements.serviceEnabled.checked, saleEnabled: elements.saleEnabled.checked, active: true };
    return writeInventory(() => request({ action: "saveInventoryItem", item }), result => {
      state.selectedId = result.itemId;
    }, "تم حفظ الصنف بنجاح.", clearPurchaseForm);
  }

  async function deleteItem() {
    if (!canWrite()) return;
    const item = selectedItem();
    if (!item || !window.confirm("هل تريد إيقاف الصنف " + item.name + "؟")) return;
    return writeInventory(() => request({ action: "deleteInventoryItem", itemId: item.itemId }), () => {
      state.selectedId = "";
    }, "تم إيقاف الصنف مع الاحتفاظ بسجله.");
  }

  async function addPurchase() {
    if (!canWrite()) return;
    const item = selectedItem(), packs = number(elements.purchasePacks.value);
    if (!item) return notify("احفظ أو اختر صنفًا أولًا.", "error");
    if (packs <= 0) return notify("اكتب عدد العبوات المشتراة.", "error");
    const editing = Boolean(state.editingBatchId);
    const purchase = { batchId: state.editingBatchId, itemId: item.itemId, purchasedPacks: packs, packageSize: item.packageSize,
      purchasePrice: number(elements.purchasePriceInput.value), purchaseDate: elements.purchaseDate.value || today(),
      supplier: elements.purchaseSupplier.value.trim(), expiryDate: elements.purchaseExpiry.value, note: elements.purchaseNote.value.trim() };
    return writeInventory(() => request({ action: editing ? "updateInventoryPurchase" : "addInventoryPurchase", purchase }),
      null, editing ? "تم تعديل عملية الشراء بنجاح." : "تمت إضافة عملية الشراء للمخزون.", clearPurchaseForm);
  }

  async function saveRecipe() {
    if (!canWrite()) return;
    const service = selectedRecipeService();
    if (!service) return notify("اختر خدمة أولًا.", "error");
    const ingredients = [...elements.recipeItems.querySelectorAll("[data-recipe-item-id]")]
      .map(input => ({ itemId: input.dataset.recipeItemId, quantity: number(input.value) })).filter(ingredient => ingredient.quantity > 0);
    return writeInventory(() => request({ action: "saveServiceRecipe", serviceId: service.serviceId, serviceName: service.name, ingredients }),
      null, "تم حفظ استهلاك الخدمة.");
  }

  elements.list.addEventListener("click", event => {
    const card = event.target.closest("[data-item-id]");
    if (!card || state.loading) return;
    const startedAt = Date.now();
    state.selectedId = card.dataset.itemId;
    renderList(); renderSelected(); renderSummary();
    clearPurchaseForm();
    timing("selection", startedAt, "success");
  });
  elements.history.addEventListener("click", event => {
    const button = event.target.closest("[data-edit-purchase]");
    if (!button || !canWrite()) return;
    startPurchaseEdit(button.dataset.editPurchase);
  });
  elements.search.addEventListener("input", () => { const start = Date.now(); renderList(); timing("search", start, "success"); });
  elements.negativeFilter?.addEventListener("click", () => {
    const startedAt = Date.now();
    state.negativeOnly = !state.negativeOnly;
    renderList();
    renderSummary();
    timing("negative-filter", startedAt, "success");
  });
  window.addEventListener("romeo-language-change", renderSummary);
  elements.addItem.addEventListener("click", () => {
    if (!canWrite()) return;
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
  loadData({ preserveSelection: false });
  loadBarberConsumptionReport();
})();
