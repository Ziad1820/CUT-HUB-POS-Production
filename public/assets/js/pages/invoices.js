    RomeoAuth.requireAuth("view_invoices");
    const API_URL = RomeoApi.API_URL;

    const elements = {
      searchInput: document.getElementById("searchInput"),
      fromDateFilter: document.getElementById("fromDateFilter"),
      toDateFilter: document.getElementById("toDateFilter"),
      barberFilter: document.getElementById("barberFilter"),
      paymentFilter: document.getElementById("paymentFilter"),
      clearFiltersBtn: document.getElementById("clearFiltersBtn"),
      reloadBtn: document.getElementById("reloadBtn"),
      invoiceRows: document.getElementById("invoiceRows"),
      visibleTotal: document.getElementById("visibleTotal"),
      visibleCount: document.getElementById("visibleCount"),
      selectedCount: document.getElementById("selectedCount"),
      selectAllInvoices: document.getElementById("selectAllInvoices"),
      deleteSelectedBtn: document.getElementById("deleteSelectedBtn"),
      invoiceModal: document.getElementById("invoiceModal"),
      closeModalBtn: document.getElementById("closeModalBtn"),
      invoiceDetails: document.getElementById("invoiceDetails"),
      loadMoreBtn: document.getElementById("loadMoreBtn")
    };

    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");

    let invoices = [];
    let filteredInvoices = [];
    let activeInvoice = null;
    let detailsEditMode = false;
    let nextOffset = 0;
    let hasMoreInvoices = false;
    let totalMatches = 0;
    let filterTimer = null;
    let filterOptions = { barbers: [], paymentMethods: [] };
    const PAGE_SIZE = 25;
    const selectedInvoiceIds = new Set();

    function parseAmount(value) {
      if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
      }

      let text = String(value || "").trim();
      if (!text) return 0;

      text = text
        .replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
        .replace(/[۰-۹]/g, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));

      if (text.includes(",") && !text.includes(".")) {
        text = /,\d{1,2}$/.test(text)
          ? text.replace(",", ".")
          : text.replace(/,/g, "");
      } else {
        text = text.replace(/,/g, "");
      }

      const amount = parseFloat(text.replace(/[^\d.-]/g, ""));
      return Number.isFinite(amount) ? amount : 0;
    }

    function formatMoney(value) {
      const amount = Math.round(parseAmount(value));
      return getCurrentPageLanguage() === "en"
        ? `${amount.toLocaleString("en-US")} EGP`
        : `${amount.toLocaleString("en-US")} جنيه`;
    }

    function getCurrentPageLanguage() {
      return window.RomeoLanguage?.getCurrentLanguage?.()
        || localStorage.getItem("romeo-pos-language")
        || document.body?.dataset.language
        || "ar";
    }

    function localizeText(arText, enText) {
      return getCurrentPageLanguage() === "en" ? enText : arText;
    }

    function updateFixedUiText() {
      if (!elements.reloadBtn.disabled) {
        elements.reloadBtn.textContent = localizeText("تحديث", "Update");
      }
      elements.clearFiltersBtn.textContent = localizeText("مسح الفلاتر", "Clear Filters");
      const headers = document.querySelectorAll("thead th");
      const tableLabels = [
        "",
        localizeText("التاريخ", "Date"),
        localizeText("اسم العميل", "Customer Name"),
        localizeText("الهاتف", "Phone"),
        localizeText("الحلاق", "Barber"),
        localizeText("طريقة الدفع", "Payment Method"),
        localizeText("الإجمالي", "Total"),
        localizeText("نسبة الخصم", "Discount %"),
        localizeText("مبلغ الخصم", "Discount Amount"),
        localizeText("المدفوع", "Paid Amount"),
        localizeText("مبلغ التيب", "Tip Amount"),
        localizeText("الخدمات", "Services"),
        localizeText("الملاحظة", "Note"),
        localizeText("الإجراءات", "Actions")
      ];
      headers.forEach((header, index) => {
        if (tableLabels[index]) header.textContent = tableLabels[index];
      });

      const fromDateLabel = document.querySelector("label[for='fromDateFilter']");
      const toDateLabel = document.querySelector("label[for='toDateFilter']");
      if (fromDateLabel) fromDateLabel.textContent = localizeText("من تاريخ", "From Date");
      if (toDateLabel) toDateLabel.textContent = localizeText("إلى تاريخ", "To Date");
    }

    const PAYMENT_TRANSLATIONS = {
      "نقدي": "Cash",
      "انستا باي": "Instapay",
      "فودافون كاش": "Vodafone Cash",
      "فيزا": "Visa"
    };

    const SERVICE_TRANSLATIONS = {
      "شعر": "Haircut",
      "دقن": "Beard",
      "دقن جيليت": "Razor Shave",
      "شعر طفل": "Kids Haircut",
      "سشوار": "Blow Dry",
      "تنعيم": "Smoothing",
      "شمع": "Wax",
      "فتلة": "Threading",
      "ماسك": "Mask",
      "صبغة دقن": "Beard Dye",
      "صبغة شعر": "Hair Dye",
      "حمام كريم عادي": "Regular Hair Cream Bath",
      "صبغة سيلفر": "Silver Dye",
      "حمام زيت": "Oil Bath",
      "حمام كريم برو": "Pro Hair Cream Bath",
      "جلسة قشرة": "Dandruff Session",
      "معالج TCB": "TCB Treatment",
      "جلسة بشرة عادية": "Regular Facial",
      "جلسة بشرة ليزر": "Laser Facial",
      "بروتين برازيلي": "Brazilian Protein",
      "بروتين CHI": "CHI Protein",
      "باكيتج عريس داخل الفرع": "Groom Package In Branch",
      "باكيدج عريس خارج الفرع": "Groom Package Out Branch"
    };

    function translateDataValue(value, dictionary) {
      const text = String(value || "").trim();
      if (!text || text === "-") return "-";
      if (getCurrentPageLanguage() !== "en") return text;
      return dictionary[text] || text;
    }

    function formatServices(value) {
      const text = String(value || "").trim();
      return text || "-";
    }

    function getDateInputValue(invoice) {
      const value = invoice.dateKey || invoice.date || "";
      const match = String(value).match(/(\d{4})-(\d{2})-(\d{2})/);
      return match ? match[0] : "";
    }

    function normalizeText(value) {
      return String(value || "").trim().toLowerCase();
    }

    function escapeHtml(value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function getInvoiceDate(invoice) {
      return invoice.dateKey || String(invoice.date || "").slice(0, 10);
    }

    function getServerFilters() {
      const fromDate = elements.fromDateFilter.value;
      const toDate = elements.toDateFilter.value;
      return {
        search: elements.searchInput.value.trim(),
        date: fromDate && fromDate === toDate ? fromDate : "",
        fromDate,
        toDate,
        barber: elements.barberFilter.value,
        payment: elements.paymentFilter.value
      };
    }

    function updateLoadMoreUi() {
      if (!elements.loadMoreBtn) return;

      elements.loadMoreBtn.hidden = !hasMoreInvoices;
      elements.loadMoreBtn.textContent = localizeText("تحميل المزيد", "Load More");
    }

    function scheduleFilterReload() {
      window.clearTimeout(filterTimer);
      filterTimer = window.setTimeout(() => loadInvoices(), 350);
    }

    async function postToApi(payload) {
      const result = await RomeoApi.request(payload);
      if (result.status !== "success") {
        throw new Error(result.message || "تعذر تنفيذ الطلب.");
      }
      return result;
    }

    function getInvoicesFromResult(result) {
      if (Array.isArray(result.invoices)) return result.invoices;
      if (Array.isArray(result.data)) return result.data;
      if (Array.isArray(result.rows)) return result.rows;
      if (Array.isArray(result.records)) return result.records;
      return [];
    }

    async function loadInvoices(options = {}) {
      const append = Boolean(options.append);
      const offset = append ? nextOffset : 0;

      elements.reloadBtn.disabled = true;
      if (elements.loadMoreBtn) elements.loadMoreBtn.disabled = true;
      elements.reloadBtn.textContent = localizeText("جاري التحديث...", "Updating...");

      if (!append) {
        invoices = [];
        filteredInvoices = [];
        nextOffset = 0;
        hasMoreInvoices = false;
        totalMatches = 0;
        selectedInvoiceIds.clear();
        updateLoadMoreUi();
        elements.invoiceRows.innerHTML = `<tr><td colspan="14" class="status-line">${localizeText("جاري تحميل الفواتير...", "Loading invoices...")}</td></tr>`;
      }

      try {
        const result = await postToApi({
          action: "getInvoices",
          limit: PAGE_SIZE,
          offset,
          filters: getServerFilters()
        });

        const nextInvoices = getInvoicesFromResult(result);
        if (!nextInvoices.length && Number(result.totalMatches || 0) > 0) {
          throw new Error(localizeText(
            "قاعدة البيانات رجعت عدد فواتير لكن لم ترجع بيانات الصفوف. اضغط تحديث أو جرب تحميل دفعة أقل.",
            "The database returned invoice matches but no invoice rows. Refresh or try loading a smaller batch."
          ));
        }
        invoices = append ? invoices.concat(nextInvoices) : nextInvoices;
        filteredInvoices = invoices;
        nextOffset = Number(result.nextOffset || invoices.length || 0);
        hasMoreInvoices = Boolean(result.hasMore);
        totalMatches = Number(result.totalMatches || invoices.length || 0);
        filterOptions = {
          barbers: Array.isArray(result.filterOptions?.barbers) ? result.filterOptions.barbers : [],
          paymentMethods: Array.isArray(result.filterOptions?.paymentMethods) ? result.filterOptions.paymentMethods : []
        };
        renderBarberOptions();
        renderPaymentOptions();
        pruneSelectedInvoices();
        renderSummary(filteredInvoices);
        renderRows();
        updateLoadMoreUi();
      } catch (error) {
        console.error(error);
        const message = String(error?.message || "");
        const friendlyMessage = message.includes("Unexpected token")
          ? localizeText(
            "تعذر قراءة رد قاعدة البيانات. اضغط تحديث مرة أخرى.",
            "Could not read the database response. Please refresh again."
          )
          : (message || localizeText("تعذر تحميل الفواتير من الشيت.", "Could not load invoices from the sheet."));
        elements.invoiceRows.innerHTML = `<tr><td colspan="14" class="empty-state">${escapeHtml(friendlyMessage)}</td></tr>`;
        renderSummary([]);
        hasMoreInvoices = false;
        updateLoadMoreUi();
      } finally {
        elements.reloadBtn.disabled = false;
        if (elements.loadMoreBtn) elements.loadMoreBtn.disabled = false;
        elements.reloadBtn.textContent = localizeText("تحديث", "Update");
      }
    }
    function renderBarberOptions() {
      const currentValue = elements.barberFilter.value;
      const sourceBarbers = filterOptions.barbers.length
        ? filterOptions.barbers
        : invoices.map(item => String(item.barber || "").trim()).filter(Boolean);
      const barbers = [...new Set(sourceBarbers)].sort();

      elements.barberFilter.innerHTML = `<option value="">${localizeText("كل الحلاقين", "all barbers")}</option>`;
      if (currentValue && !barbers.includes(currentValue)) {
        const option = document.createElement("option");
        option.value = currentValue;
        option.textContent = currentValue;
        elements.barberFilter.appendChild(option);
      }
      barbers.forEach(barber => {
        const option = document.createElement("option");
        option.value = barber;
        option.textContent = barber;
        elements.barberFilter.appendChild(option);
      });

      if (currentValue) {
        elements.barberFilter.value = currentValue;
      }
    }

    function getInvoicePayment(invoice) {
      return String(invoice.paymentMethod || invoice.payment || "").trim();
    }

    function renderPaymentOptions() {
      const currentValue = elements.paymentFilter.value;
      const sourcePaymentMethods = filterOptions.paymentMethods.length
        ? filterOptions.paymentMethods
        : invoices.map(getInvoicePayment).filter(Boolean);
      const paymentMethods = [...new Set(sourcePaymentMethods)].sort();

      elements.paymentFilter.innerHTML = `<option value="">${localizeText("كل طرق الدفع", "All Payment Methods")}</option>`;
      if (currentValue && !paymentMethods.includes(currentValue)) {
        const option = document.createElement("option");
        option.value = currentValue;
        option.textContent = translateDataValue(currentValue, PAYMENT_TRANSLATIONS);
        elements.paymentFilter.appendChild(option);
      }
      paymentMethods.forEach(paymentMethod => {
        const option = document.createElement("option");
        option.value = paymentMethod;
        option.textContent = translateDataValue(paymentMethod, PAYMENT_TRANSLATIONS);
        elements.paymentFilter.appendChild(option);
      });

      if (currentValue) {
        elements.paymentFilter.value = currentValue;
      }
    }

    function applyFilters() {
      loadInvoices();
    }

    function renderSummary(items) {
      const visibleTotal = items.reduce((sum, item) => sum + parseAmount(item.total), 0);

      elements.visibleTotal.textContent = formatMoney(visibleTotal);
      elements.visibleCount.textContent = items.length.toLocaleString("en-US");
    }

    function pruneSelectedInvoices() {
      const validIds = new Set(invoices.map(invoice => String(invoice.invoiceId)));
      [...selectedInvoiceIds].forEach(invoiceId => {
        if (!validIds.has(invoiceId)) {
          selectedInvoiceIds.delete(invoiceId);
        }
      });
    }

    function updateSelectionUi() {
      const visibleIds = filteredInvoices.map(invoice => String(invoice.invoiceId));
      const selectedVisibleCount = visibleIds.filter(invoiceId => selectedInvoiceIds.has(invoiceId)).length;
      const totalSelected = selectedInvoiceIds.size;

      elements.selectedCount.textContent = localizeText(
        `${totalSelected} فاتورة محددة`,
        `${totalSelected} selected`
      );
      elements.deleteSelectedBtn.disabled = totalSelected === 0;
      elements.deleteSelectedBtn.textContent = localizeText("حذف المحدد", "Delete Selected");

      if (elements.selectAllInvoices) {
        elements.selectAllInvoices.checked = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
        elements.selectAllInvoices.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleIds.length;
        elements.selectAllInvoices.disabled = visibleIds.length === 0;
      }

      document.querySelectorAll(".invoice-checkbox").forEach(checkbox => {
        checkbox.checked = selectedInvoiceIds.has(String(checkbox.value));
      });
    }

    function setVisibleInvoicesSelected(checked) {
      filteredInvoices.forEach(invoice => {
        const invoiceId = String(invoice.invoiceId);
        if (checked) {
          selectedInvoiceIds.add(invoiceId);
        } else {
          selectedInvoiceIds.delete(invoiceId);
        }
      });
      updateSelectionUi();
    }

    function renderRows() {
      elements.invoiceRows.innerHTML = "";

      if (!filteredInvoices.length) {
        elements.invoiceRows.innerHTML = `<tr><td colspan="14" class="empty-state">${localizeText("لا توجد فواتير مطابقة للفلاتر الحالية.", "No invoices match the current filters.")}</td></tr>`;
        updateSelectionUi();
        return;
      }

      filteredInvoices.forEach(invoice => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td class="select-cell">
            <input type="checkbox" class="invoice-checkbox" value="${escapeHtml(invoice.invoiceId)}" aria-label="Select invoice">
          </td>
          <td>${escapeHtml(invoice.date || invoice.dateKey || "")}</td>
          <td>${escapeHtml(invoice.customerName || "-")}</td>
          <td>${escapeHtml(invoice.customerPhone || "-")}</td>
          <td>${escapeHtml(invoice.barber || "-")}</td>
          <td>${escapeHtml(translateDataValue(invoice.paymentMethod || invoice.payment || "-", PAYMENT_TRANSLATIONS))}</td>
          <td class="amount">${formatMoney(invoice.total)}</td>
          <td class="amount">${invoice.discountAmount ? `${parseAmount(invoice.discountPercent)}%` : "-"}</td>
          <td class="amount">${invoice.discountAmount ? formatMoney(invoice.discountAmount) : "-"}</td>
          <td class="amount">${formatMoney(invoice.paidAmount || invoice.total || 0)}</td>
          <td class="amount">${formatMoney(invoice.tipAmount || 0)}</td>
          <td>${escapeHtml(formatServices(invoice.services || "-"))}</td>
          <td class="note-cell">${escapeHtml(invoice.note || invoice.invoiceNote || "-")}</td>
          <td>
            <div class="invoice-actions">
              <button type="button" class="mini-btn dark" data-action="view" data-id="${escapeHtml(invoice.invoiceId)}">${localizeText("عرض", "View")}</button>
              ${invoice.pdfUrl
                ? `<a class="mini-btn" href="${escapeHtml(invoice.pdfUrl)}" target="_blank" rel="noopener">PDF</a>`
                : `<button type="button" class="mini-btn" disabled>PDF</button>`}
              <button type="button" class="mini-btn danger" data-action="delete" data-id="${escapeHtml(invoice.invoiceId)}">${localizeText("حذف", "Delete")}</button>
            </div>
          </td>
        `;
        elements.invoiceRows.appendChild(row);
      });

      updateSelectionUi();
    }

    function findInvoice(invoiceId) {
      return invoices.find(item => String(item.invoiceId) === String(invoiceId));
    }

    function canEditInvoice(invoice) {
      return Boolean(invoice && invoice.invoiceId && invoice.rowNumber);
    }

    function getBarberEditOptions(selectedValue) {
      const current = String(selectedValue || "").trim();
      const sourceBarbers = filterOptions.barbers.length
        ? filterOptions.barbers
        : invoices.map(item => String(item.barber || "").trim()).filter(Boolean);
      const barbers = [...new Set(sourceBarbers)];

      if (current && !barbers.includes(current)) {
        barbers.unshift(current);
      }

      const placeholder = localizeText("اختر الموظف", "Choose employee");
      return [
        `<option value="">${escapeHtml(placeholder)}</option>`,
        ...barbers.map(barber =>
          `<option value="${escapeHtml(barber)}" ${barber === current ? "selected" : ""}>${escapeHtml(barber)}</option>`
        )
      ].join("");
    }

    function getPaymentOptions(selectedValue) {
      const payments = [
        ["نقدي", "نقدي"],
        ["انستا باي", "انستا باي"],
        ["فودافون كاش", "فودافون كاش"],
        ["فيزا", "فيزا"]
      ];

      const current = String(selectedValue || "").trim();
      if (current && !payments.some(([value]) => value === current)) {
        payments.unshift([current, current]);
      }

      return payments.map(([value, label]) =>
        `<option value="${escapeHtml(value)}" ${value === current ? "selected" : ""}>${escapeHtml(label)}</option>`
      ).join("");
    }

    function getDetailValue(id) {
      return document.getElementById(id)?.value?.trim() || "";
    }

    function renderDetails(invoice, editMode = false) {
      const payment = translateDataValue(invoice.paymentMethod || invoice.payment || "-", PAYMENT_TRANSLATIONS);
      const dateLabel = localizeText("التاريخ", "Date");
      const totalLabel = localizeText("الإجمالي", "Total");
      const customerLabel = localizeText("اسم العميل", "Customer Name");
      const phoneLabel = localizeText("رقم الهاتف", "Phone");
      const barberLabel = localizeText("الحلاق", "Barber");
      const paymentLabel = localizeText("طريقة الدفع", "Payment Method");
      const paidLabel = localizeText("المدفوع", "Paid Amount");
      const tipLabel = localizeText("مبلغ التيب", "Tip Amount");
      const discountLabel = localizeText("الخصم", "Discount");
      const servicesLabel = localizeText("الخدمات", "Services");
      const noteLabel = localizeText("الملاحظة", "Note");

      elements.invoiceDetails.innerHTML = editMode ? `
        <div class="detail-item"><span>${dateLabel}</span><input class="detail-input" id="editInvoiceDate" type="date" value="${escapeHtml(getDateInputValue(invoice))}"></div>
        <div class="detail-item"><span>${totalLabel}</span><input class="detail-input" id="editInvoiceTotal" type="number" min="0" step="1" value="${escapeHtml(parseAmount(invoice.total))}"></div>
        <div class="detail-item"><span>${customerLabel}</span><input class="detail-input" id="editCustomerName" type="text" value="${escapeHtml(invoice.customerName || "")}"></div>
        <div class="detail-item"><span>${phoneLabel}</span><input class="detail-input" id="editCustomerPhone" type="tel" value="${escapeHtml(invoice.customerPhone || "")}"></div>
        <div class="detail-item"><span>${barberLabel}</span><select class="detail-input" id="editInvoiceBarber">${getBarberEditOptions(invoice.barber || "")}</select></div>
        <div class="detail-item"><span>${paymentLabel}</span><select class="detail-input" id="editPaymentMethod">${getPaymentOptions(invoice.paymentMethod || invoice.payment || "")}</select></div>
        <div class="detail-item"><span>${discountLabel}</span><input class="detail-input" id="editDiscountAmount" type="number" min="0" step="1" value="${escapeHtml(parseAmount(invoice.discountAmount))}"></div>
        <div class="detail-item"><span>${paidLabel}</span><input class="detail-input" id="editPaidAmount" type="number" min="0" step="1" value="${escapeHtml(parseAmount(invoice.paidAmount || invoice.total))}"></div>
        <div class="detail-item"><span>${tipLabel}</span><input class="detail-input" id="editTipAmount" type="number" min="0" step="1" value="${escapeHtml(parseAmount(invoice.tipAmount))}"></div>
        <div class="detail-item full"><span>${servicesLabel}</span><textarea class="detail-input" id="editInvoiceServices">${escapeHtml(formatServices(invoice.services || ""))}</textarea></div>
        <div class="detail-item full"><span>${noteLabel}</span><textarea class="detail-input" id="editInvoiceNote">${escapeHtml(invoice.note || invoice.invoiceNote || "")}</textarea></div>
        <div class="detail-item full"><span>PDF</span><strong>${invoice.pdfUrl ? `<a href="${escapeHtml(invoice.pdfUrl)}" target="_blank" rel="noopener">${localizeText("فتح الفاتورة", "Open Invoice")}</a>` : "-"}</strong></div>
        <div class="modal-status" id="invoiceModalStatus"></div>
        <div class="modal-actions full">
          <button type="button" class="mini-btn" id="cancelEditInvoiceBtn">${localizeText("إلغاء", "Cancel")}</button>
          <button type="button" class="mini-btn dark" id="saveInvoiceEditBtn">${localizeText("حفظ", "Save")}</button>
        </div>
      ` : `
        <div class="detail-item"><span>${dateLabel}</span><strong>${escapeHtml(invoice.date || invoice.dateKey || "-")}</strong></div>
        <div class="detail-item"><span>${totalLabel}</span><strong>${formatMoney(invoice.total)}</strong></div>
        <div class="detail-item"><span>${customerLabel}</span><strong>${escapeHtml(invoice.customerName || "-")}</strong></div>
        <div class="detail-item"><span>${phoneLabel}</span><strong>${escapeHtml(invoice.customerPhone || "-")}</strong></div>
        <div class="detail-item"><span>${barberLabel}</span><strong>${escapeHtml(invoice.barber || "-")}</strong></div>
        <div class="detail-item"><span>${paymentLabel}</span><strong>${escapeHtml(payment)}</strong></div>
        <div class="detail-item"><span>${discountLabel}</span><strong>${invoice.discountAmount ? `${parseAmount(invoice.discountPercent)}% - ${formatMoney(invoice.discountAmount)}` : "-"}</strong></div>
        <div class="detail-item"><span>${paidLabel}</span><strong>${formatMoney(invoice.paidAmount || invoice.total || 0)}</strong></div>
        <div class="detail-item"><span>${tipLabel}</span><strong>${formatMoney(invoice.tipAmount || 0)}</strong></div>
        <div class="detail-item full"><span>${servicesLabel}</span><strong>${escapeHtml(formatServices(invoice.services || "-"))}</strong></div>
        <div class="detail-item full"><span>${noteLabel}</span><strong>${escapeHtml(invoice.note || invoice.invoiceNote || "-")}</strong></div>
        <div class="detail-item full"><span>PDF</span><strong>${invoice.pdfUrl ? `<a href="${escapeHtml(invoice.pdfUrl)}" target="_blank" rel="noopener">${localizeText("فتح الفاتورة", "Open Invoice")}</a>` : "-"}</strong></div>
        ${canEditInvoice(invoice) ? `
          <div class="modal-actions full">
            <button type="button" class="mini-btn dark" id="editInvoiceBtn">${localizeText("تعديل", "Edit")}</button>
          </div>
        ` : `<div class="modal-status error">${localizeText("لا يمكن تعديل فاتورة لم يتم تحميلها من الشيت.", "Invoices that were not loaded from the sheet cannot be edited.")}</div>`}
      `;
    }

    function openDetails(invoice) {
      activeInvoice = invoice;
      detailsEditMode = false;
      renderDetails(invoice, false);
      elements.invoiceModal.classList.add("active");
    }

    function setModalStatus(message, type = "") {
      const status = document.getElementById("invoiceModalStatus");
      if (!status) return;
      status.textContent = message || "";
      status.className = `modal-status ${type}`.trim();
    }

    function getUpdateInvoicePayload(invoice) {
      const invoiceDate = getDetailValue("editInvoiceDate");
      return {
        action: "updateInvoice",
        invoiceId: invoice.invoiceId,
        rowNumber: invoice.rowNumber,
        date: invoiceDate,
        dateKey: invoiceDate,
        customerName: getDetailValue("editCustomerName"),
        customerPhone: getDetailValue("editCustomerPhone"),
        services: getDetailValue("editInvoiceServices"),
        total: parseAmount(getDetailValue("editInvoiceTotal")),
        discountPercent: parseAmount(invoice.discountPercent),
        discountAmount: parseAmount(getDetailValue("editDiscountAmount")),
        paidAmount: parseAmount(getDetailValue("editPaidAmount")),
        tipAmount: parseAmount(getDetailValue("editTipAmount")),
        payment: getDetailValue("editPaymentMethod"),
        paymentMethod: getDetailValue("editPaymentMethod"),
        barber: getDetailValue("editInvoiceBarber"),
        note: getDetailValue("editInvoiceNote"),
        invoiceNote: getDetailValue("editInvoiceNote"),
        pdfUrl: invoice.pdfUrl || ""
      };
    }

    async function saveInvoiceEdit(button) {
      if (!activeInvoice) return;

      if (!canEditInvoice(activeInvoice)) {
        setModalStatus(localizeText("لا يمكن تعديل فاتورة لم يتم تحميلها من الشيت.", "Invoices that were not loaded from the sheet cannot be edited."), "error");
        return;
      }

      const payload = getUpdateInvoicePayload(activeInvoice);
      if (!payload.date) {
        setModalStatus(localizeText("اختار تاريخ الفاتورة.", "Choose invoice date."), "error");
        return;
      }

      button.disabled = true;
      button.textContent = localizeText("جاري الحفظ...", "Saving...");
      setModalStatus(localizeText("جاري حفظ التعديل...", "Saving invoice changes..."));

      try {
        await postToApi(payload);
        await loadInvoices();
        const updatedInvoice = findInvoice(activeInvoice.invoiceId) || { ...activeInvoice, ...payload };
        activeInvoice = updatedInvoice;
        detailsEditMode = false;
        renderDetails(updatedInvoice, false);
      } catch (error) {
        console.error(error);
        setModalStatus(error.message || localizeText("تعذر حفظ تعديل الفاتورة.", "Could not save invoice changes."), "error");
        button.disabled = false;
        button.textContent = localizeText("حفظ", "Save");
      }
    }

    function getDeleteInvoicePayload(invoice) {
      return {
        action: "deleteInvoice",
        invoiceId: invoice.invoiceId,
        rowNumber: invoice.rowNumber,
        customerName: invoice.customerName,
        customerPhone: invoice.customerPhone,
        total: invoice.total,
        pdfUrl: invoice.pdfUrl,
        date: invoice.dateKey || invoice.date
      };
    }

    async function deleteInvoice(invoice, button) {
      if (!confirm(localizeText("هل تريد حذف الفاتورة من السيستم والشيت؟", "Delete this invoice from the system and sheet?"))) {
        return;
      }

      button.disabled = true;
      button.textContent = "Deleting...";

      try {
        await postToApi(getDeleteInvoicePayload(invoice));
        selectedInvoiceIds.delete(String(invoice.invoiceId));
        await loadInvoices();
      } catch (error) {
        console.error(error);
        alert(error.message || localizeText("تعذر حذف الفاتورة من الشيت.", "Could not delete the invoice from the sheet."));
        button.disabled = false;
        button.textContent = localizeText("حذف", "Delete");
      }
    }

    async function deleteSelectedInvoices() {
      const selectedInvoices = invoices
        .filter(invoice => selectedInvoiceIds.has(String(invoice.invoiceId)))
        .sort((a, b) => Number(b.rowNumber || 0) - Number(a.rowNumber || 0));

      if (!selectedInvoices.length) return;

      const message = localizeText(
        `هل تريد حذف ${selectedInvoices.length} فاتورة من السيستم والشيت؟`,
        `Delete ${selectedInvoices.length} selected invoice(s) from the system and sheet?`
      );

      if (!confirm(message)) return;

      elements.deleteSelectedBtn.disabled = true;
      elements.deleteSelectedBtn.textContent = localizeText("جاري الحذف...", "Deleting...");

      try {
        for (const invoice of selectedInvoices) {
          await postToApi(getDeleteInvoicePayload(invoice));
        }

        selectedInvoiceIds.clear();
        await loadInvoices();
      } catch (error) {
        console.error(error);
        alert(error.message || localizeText("تعذر حذف الفواتير المحددة من الشيت.", "Could not delete selected invoices from the sheet."));
        updateSelectionUi();
      } finally {
        elements.deleteSelectedBtn.textContent = localizeText("حذف المحدد", "Delete Selected");
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

    elements.searchInput.addEventListener("input", scheduleFilterReload);
    elements.fromDateFilter.addEventListener("change", applyFilters);
    elements.toDateFilter.addEventListener("change", applyFilters);
    elements.barberFilter.addEventListener("change", applyFilters);
    elements.paymentFilter.addEventListener("change", applyFilters);
    elements.clearFiltersBtn.addEventListener("click", () => {
      elements.searchInput.value = "";
      elements.fromDateFilter.value = "";
      elements.toDateFilter.value = "";
      elements.barberFilter.value = "";
      elements.paymentFilter.value = "";
      loadInvoices();
    });
    elements.reloadBtn.addEventListener("click", () => loadInvoices());
    if (elements.loadMoreBtn) {
      elements.loadMoreBtn.addEventListener("click", () => loadInvoices({ append: true }));
    }
    elements.selectAllInvoices.addEventListener("change", event => {
      setVisibleInvoicesSelected(event.target.checked);
    });
    elements.deleteSelectedBtn.addEventListener("click", deleteSelectedInvoices);
    window.addEventListener("romeo-language-change", () => {
      updateFixedUiText();
      renderBarberOptions();
      renderPaymentOptions();
      renderSummary(filteredInvoices);
      renderRows();
    });
    elements.invoiceRows.addEventListener("change", event => {
      const checkbox = event.target.closest(".invoice-checkbox");
      if (!checkbox) return;

      const invoiceId = String(checkbox.value);
      if (checkbox.checked) {
        selectedInvoiceIds.add(invoiceId);
      } else {
        selectedInvoiceIds.delete(invoiceId);
      }

      updateSelectionUi();
    });
    elements.invoiceRows.addEventListener("click", event => {
      const button = event.target.closest("[data-action]");
      if (!button) return;

      const invoice = findInvoice(button.dataset.id);
      if (!invoice) return;

      if (button.dataset.action === "view") {
        openDetails(invoice);
      }

      if (button.dataset.action === "delete") {
        deleteInvoice(invoice, button);
      }
    });
    elements.closeModalBtn.addEventListener("click", () => elements.invoiceModal.classList.remove("active"));
    elements.invoiceModal.addEventListener("click", event => {
      if (event.target === elements.invoiceModal) {
        elements.invoiceModal.classList.remove("active");
      }
    });
    elements.invoiceDetails.addEventListener("click", event => {
      const editButton = event.target.closest("#editInvoiceBtn");
      if (editButton && activeInvoice) {
        detailsEditMode = true;
        renderDetails(activeInvoice, true);
        return;
      }

      const cancelButton = event.target.closest("#cancelEditInvoiceBtn");
      if (cancelButton && activeInvoice) {
        detailsEditMode = false;
        renderDetails(activeInvoice, false);
        return;
      }

      const saveButton = event.target.closest("#saveInvoiceEditBtn");
      if (saveButton) {
        saveInvoiceEdit(saveButton);
      }
    });
    menuToggle.addEventListener("click", openSidebar);
    sidebarOverlay.addEventListener("click", closeSidebar);
    document.getElementById("logoutBtn").addEventListener("click", () => RomeoAuth.logout());

    updateFixedUiText();
    loadInvoices();

