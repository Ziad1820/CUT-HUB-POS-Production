    RomeoAuth.requireAuth("view_invoices");
    const API_URL = RomeoApi.API_URL;

    const elements = {
      searchInput: document.getElementById("searchInput"),
      dateFilter: document.getElementById("dateFilter"),
      barberFilter: document.getElementById("barberFilter"),
      paymentFilter: document.getElementById("paymentFilter"),
      clearFiltersBtn: document.getElementById("clearFiltersBtn"),
      reloadBtn: document.getElementById("reloadBtn"),
      invoiceRows: document.getElementById("invoiceRows"),
      visibleTotal: document.getElementById("visibleTotal"),
      visibleCount: document.getElementById("visibleCount"),
      allTotal: document.getElementById("allTotal"),
      selectedCount: document.getElementById("selectedCount"),
      selectAllInvoices: document.getElementById("selectAllInvoices"),
      deleteSelectedBtn: document.getElementById("deleteSelectedBtn"),
      invoiceModal: document.getElementById("invoiceModal"),
      closeModalBtn: document.getElementById("closeModalBtn"),
      invoiceDetails: document.getElementById("invoiceDetails")
    };

    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");

    let invoices = [];
    let filteredInvoices = [];
    let activeInvoice = null;
    let detailsEditMode = false;
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
        : `${amount.toLocaleString("ar-EG")} جنيه`;
    }

    function getCurrentPageLanguage() {
      return window.RomeoLanguage?.getCurrentLanguage?.() || "ar";
    }

    function localizeText(arText, enText) {
      return getCurrentPageLanguage() === "en" ? enText : arText;
    }

    const PAYMENT_TRANSLATIONS = {
      "Ù†Ù‚Ø¯ÙŠ": "Cash",
      "Ø§Ù†Ø³ØªØ§ Ø¨Ø§ÙŠ": "Instapay",
      "ÙÙˆØ¯Ø§ÙÙˆÙ† ÙƒØ§Ø´": "Vodafone Cash",
      "ÙÙŠØ²Ø§": "Visa"
    };

    const SERVICE_TRANSLATIONS = {
      "Ø´Ø¹Ø±": "Haircut",
      "Ø¯Ù‚Ù†": "Beard",
      "Ø¯Ù‚Ù† Ø¬ÙŠÙ„ÙŠØª": "Razor Shave",
      "Ø´Ø¹Ø± Ø·ÙÙ„": "Kids Haircut",
      "Ø³Ø´ÙˆØ§Ø±": "Blow Dry",
      "ØªÙ†Ø¹ÙŠÙ…": "Smoothing",
      "Ø´Ù…Ø¹": "Wax",
      "ÙØªÙ„Ø©": "Threading",
      "Ù…Ø§Ø³Ùƒ": "Mask",
      "ØµØ¨ØºØ© Ø¯Ù‚Ù†": "Beard Dye",
      "ØµØ¨ØºØ© Ø´Ø¹Ø±": "Hair Dye",
      "Ø­Ù…Ø§Ù… ÙƒØ±ÙŠÙ… Ø¹Ø§Ø¯ÙŠ": "Regular Hair Cream Bath",
      "ØµØ¨ØºØ© Ø³Ø¨Ù„ÙØ±": "Silver Dye",
      "Ø­Ù…Ø§Ù… Ø²ÙŠØª": "Oil Bath",
      "Ø­Ù…Ø§Ù… ÙƒØ±ÙŠÙ… Ø¨Ø±Ùˆ": "Pro Hair Cream Bath",
      "Ø¬Ù„Ø³Ø© Ù‚Ø´Ø±Ø©": "Dandruff Session",
      "Ù…Ø¹Ø§Ù„Ø¬ TCB": "TCB Treatment",
      "Ø¬Ù„Ø³Ø© Ø¨Ø´Ø±Ø© Ø¹Ø§Ø¯ÙŠØ©": "Regular Facial",
      "Ø¬Ù„Ø³Ø© Ø¨Ø´Ø±Ø© Ù„ÙŠØ²Ø±": "Laser Facial",
      "Ø¨Ø±ÙˆØªÙŠÙ† Ø¨Ø±Ø§Ø²ÙŠÙ„ÙŠ": "Brazilian Protein",
      "Ø¨Ø±ÙˆØªÙŠÙ† CHI": "CHI Protein",
      "Ø¨Ø§ÙƒÙŠØªØ¬ Ø¹Ø±ÙŠØ³ Ø¯Ø§Ø®Ù„ Ø§Ù„ÙØ±Ø¹": "Groom Package In Branch",
      "Ø¨Ø§ÙƒÙŠØ¯Ø¬ Ø¹Ø±ÙŠØ³ Ø®Ø§Ø±Ø¬ Ø§Ù„ÙØ±Ø¹": "Groom Package Out Branch"
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

    async function postToApi(payload) {
      const result = await RomeoApi.request(payload);
      if (result.status !== "success") {
        throw new Error(result.message || "ØªØ¹Ø°Ø± ØªÙ†ÙÙŠØ° Ø§Ù„Ø·Ù„Ø¨.");
      }
      return result;
    }

    async function loadInvoices() {
      elements.reloadBtn.disabled = true;
      elements.reloadBtn.textContent = localizeText("Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ø¯ÙŠØ«...", "Refreshing...");
      elements.invoiceRows.innerHTML = `<tr><td colspan="12" class="status-line">${localizeText("Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„ÙÙˆØ§ØªÙŠØ±...", "Loading invoices...")}</td></tr>`;

      try {
        const result = await postToApi({ action: "getInvoices" });
        invoices = Array.isArray(result.invoices) ? result.invoices : [];
        renderBarberOptions();
        renderPaymentOptions();
        applyFilters();
      } catch (error) {
        console.error(error);
        elements.invoiceRows.innerHTML = `<tr><td colspan="12" class="empty-state">${escapeHtml(error.message || localizeText("ØªØ¹Ø°Ø± ØªØ­Ù…ÙŠÙ„ Ø§Ù„ÙÙˆØ§ØªÙŠØ± Ù…Ù† Ø§Ù„Ø´ÙŠØª.", "Could not load invoices from the sheet."))}</td></tr>`;
        renderSummary([]);
      } finally {
        elements.reloadBtn.disabled = false;
        elements.reloadBtn.textContent = localizeText("ØªØ­Ø¯ÙŠØ«", "Refresh");
      }
    }

    function renderBarberOptions() {
      const currentValue = elements.barberFilter.value;
      const barbers = [...new Set(invoices.map(item => String(item.barber || "").trim()).filter(Boolean))].sort();

      elements.barberFilter.innerHTML = `<option value="">${localizeText("ÙƒÙ„ Ø§Ù„Ø­Ù„Ø§Ù‚ÙŠÙ†", "All barbers")}</option>`;
      barbers.forEach(barber => {
        const option = document.createElement("option");
        option.value = barber;
        option.textContent = barber;
        elements.barberFilter.appendChild(option);
      });

      if (barbers.includes(currentValue)) {
        elements.barberFilter.value = currentValue;
      }
    }

    function getInvoicePayment(invoice) {
      return String(invoice.paymentMethod || invoice.payment || "").trim();
    }

    function renderPaymentOptions() {
      const currentValue = elements.paymentFilter.value;
      const paymentMethods = [...new Set(invoices.map(getInvoicePayment).filter(Boolean))].sort();

      elements.paymentFilter.innerHTML = `<option value="">${localizeText("كل طرق الدفع", "All payment methods")}</option>`;
      paymentMethods.forEach(paymentMethod => {
        const option = document.createElement("option");
        option.value = paymentMethod;
        option.textContent = translateDataValue(paymentMethod, PAYMENT_TRANSLATIONS);
        elements.paymentFilter.appendChild(option);
      });

      if (paymentMethods.includes(currentValue)) {
        elements.paymentFilter.value = currentValue;
      }
    }

    function applyFilters() {
      const search = normalizeText(elements.searchInput.value);
      const targetDate = elements.dateFilter.value;
      const targetBarber = elements.barberFilter.value;
      const targetPayment = elements.paymentFilter.value;

      filteredInvoices = invoices.filter(invoice => {
        const matchesSearch = !search ||
          normalizeText(invoice.customerName).includes(search) ||
          normalizeText(invoice.customerPhone).includes(search);
        const matchesDate = !targetDate || getInvoiceDate(invoice) === targetDate;
        const matchesBarber = !targetBarber || String(invoice.barber || "").trim() === targetBarber;
        const matchesPayment = !targetPayment || getInvoicePayment(invoice) === targetPayment;
        return matchesSearch && matchesDate && matchesBarber && matchesPayment;
      });

      pruneSelectedInvoices();
      renderSummary(filteredInvoices);
      renderRows();
    }

    function renderSummary(items) {
      const visibleTotal = items.reduce((sum, item) => sum + parseAmount(item.total), 0);
      const allTotal = invoices.reduce((sum, item) => sum + parseAmount(item.total), 0);

      elements.visibleTotal.textContent = formatMoney(visibleTotal);
      elements.visibleCount.textContent = items.length.toLocaleString(getCurrentPageLanguage() === "en" ? "en-US" : "ar-EG");
      elements.allTotal.textContent = formatMoney(allTotal);
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
        `${totalSelected} ÙØ§ØªÙˆØ±Ø© Ù…Ø­Ø¯Ø¯Ø©`,
        `${totalSelected} selected`
      );
      elements.deleteSelectedBtn.disabled = totalSelected === 0;
      elements.deleteSelectedBtn.textContent = localizeText("Ø­Ø°Ù Ø§Ù„Ù…Ø­Ø¯Ø¯", "Delete Selected");

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
        elements.invoiceRows.innerHTML = `<tr><td colspan="12" class="empty-state">${localizeText("Ù„Ø§ ØªÙˆØ¬Ø¯ ÙÙˆØ§ØªÙŠØ± Ù…Ø·Ø§Ø¨Ù‚Ø© Ù„Ù„ÙÙ„Ø§ØªØ± Ø§Ù„Ø­Ø§Ù„ÙŠØ©.", "No invoices match the current filters.")}</td></tr>`;
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
          <td class="amount">${formatMoney(invoice.paidAmount || invoice.total || 0)}</td>
          <td class="amount">${formatMoney(invoice.tipAmount || 0)}</td>
          <td>${escapeHtml(formatServices(invoice.services || "-"))}</td>
          <td class="note-cell">${escapeHtml(invoice.note || invoice.invoiceNote || "-")}</td>
          <td>
            <div class="invoice-actions">
              <button type="button" class="mini-btn dark" data-action="view" data-id="${escapeHtml(invoice.invoiceId)}">${localizeText("Ø¹Ø±Ø¶", "View")}</button>
              <button type="button" class="mini-btn" data-action="pdf" data-id="${escapeHtml(invoice.invoiceId)}" ${invoice.pdfUrl ? "" : "disabled"}>PDF</button>
              <button type="button" class="mini-btn danger" data-action="delete" data-id="${escapeHtml(invoice.invoiceId)}">Delete</button>
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
      const paidLabel = "Paid Amount";
      const tipLabel = "Tip Amount";
      const servicesLabel = localizeText("الخدمات", "Services");
      const noteLabel = localizeText("الملاحظة", "Note");

      elements.invoiceDetails.innerHTML = editMode ? `
        <div class="detail-item"><span>${dateLabel}</span><input class="detail-input" id="editInvoiceDate" type="date" value="${escapeHtml(getDateInputValue(invoice))}"></div>
        <div class="detail-item"><span>${totalLabel}</span><input class="detail-input" id="editInvoiceTotal" type="number" min="0" step="1" value="${escapeHtml(parseAmount(invoice.total))}"></div>
        <div class="detail-item"><span>${customerLabel}</span><input class="detail-input" id="editCustomerName" type="text" value="${escapeHtml(invoice.customerName || "")}"></div>
        <div class="detail-item"><span>${phoneLabel}</span><input class="detail-input" id="editCustomerPhone" type="tel" value="${escapeHtml(invoice.customerPhone || "")}"></div>
        <div class="detail-item"><span>${barberLabel}</span><input class="detail-input" id="editInvoiceBarber" type="text" value="${escapeHtml(invoice.barber || "")}"></div>
        <div class="detail-item"><span>${paymentLabel}</span><select class="detail-input" id="editPaymentMethod">${getPaymentOptions(invoice.paymentMethod || invoice.payment || "")}</select></div>
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
        <div class="detail-item"><span>${paidLabel}</span><strong>${formatMoney(invoice.paidAmount || invoice.total || 0)}</strong></div>
        <div class="detail-item"><span>${tipLabel}</span><strong>${formatMoney(invoice.tipAmount || 0)}</strong></div>
        <div class="detail-item full"><span>${servicesLabel}</span><strong>${escapeHtml(formatServices(invoice.services || "-"))}</strong></div>
        <div class="detail-item full"><span>${noteLabel}</span><strong>${escapeHtml(invoice.note || invoice.invoiceNote || "-")}</strong></div>
        <div class="detail-item full"><span>PDF</span><strong>${invoice.pdfUrl ? `<a href="${escapeHtml(invoice.pdfUrl)}" target="_blank" rel="noopener">${localizeText("فتح الفاتورة", "Open Invoice")}</a>` : "-"}</strong></div>
        <div class="modal-actions full">
          <button type="button" class="mini-btn dark" id="editInvoiceBtn">${localizeText("تعديل", "Edit")}</button>
        </div>
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
      if (!confirm("Ù‡Ù„ ØªØ±ÙŠØ¯ Ø­Ø°Ù Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ù…Ù† Ø§Ù„Ø³ÙŠØ³ØªÙ… ÙˆØ§Ù„Ø´ÙŠØªØŸ")) {
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
        alert(error.message || "ØªØ¹Ø°Ø± Ø­Ø°Ù Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ù…Ù† Ø§Ù„Ø´ÙŠØª.");
        button.disabled = false;
        button.textContent = "Delete";
      }
    }

    async function deleteSelectedInvoices() {
      const selectedInvoices = invoices
        .filter(invoice => selectedInvoiceIds.has(String(invoice.invoiceId)))
        .sort((a, b) => Number(b.rowNumber || 0) - Number(a.rowNumber || 0));

      if (!selectedInvoices.length) return;

      const message = localizeText(
        `Ù‡Ù„ ØªØ±ÙŠØ¯ Ø­Ø°Ù ${selectedInvoices.length} ÙØ§ØªÙˆØ±Ø© Ù…Ù† Ø§Ù„Ø³ÙŠØ³ØªÙ… ÙˆØ§Ù„Ø´ÙŠØªØŸ`,
        `Delete ${selectedInvoices.length} selected invoice(s) from the system and sheet?`
      );

      if (!confirm(message)) return;

      elements.deleteSelectedBtn.disabled = true;
      elements.deleteSelectedBtn.textContent = localizeText("Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­Ø°Ù...", "Deleting...");

      try {
        for (const invoice of selectedInvoices) {
          await postToApi(getDeleteInvoicePayload(invoice));
        }

        selectedInvoiceIds.clear();
        await loadInvoices();
      } catch (error) {
        console.error(error);
        alert(error.message || localizeText("ØªØ¹Ø°Ø± Ø­Ø°Ù Ø§Ù„ÙÙˆØ§ØªÙŠØ± Ø§Ù„Ù…Ø­Ø¯Ø¯Ø© Ù…Ù† Ø§Ù„Ø´ÙŠØª.", "Could not delete selected invoices from the sheet."));
        updateSelectionUi();
      } finally {
        elements.deleteSelectedBtn.textContent = localizeText("Ø­Ø°Ù Ø§Ù„Ù…Ø­Ø¯Ø¯", "Delete Selected");
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

    elements.searchInput.addEventListener("input", applyFilters);
    elements.dateFilter.addEventListener("change", applyFilters);
    elements.barberFilter.addEventListener("change", applyFilters);
    elements.paymentFilter.addEventListener("change", applyFilters);
    elements.clearFiltersBtn.addEventListener("click", () => {
      elements.searchInput.value = "";
      elements.dateFilter.value = "";
      elements.barberFilter.value = "";
      elements.paymentFilter.value = "";
      applyFilters();
    });
    elements.reloadBtn.addEventListener("click", loadInvoices);
    elements.selectAllInvoices.addEventListener("change", event => {
      setVisibleInvoicesSelected(event.target.checked);
    });
    elements.deleteSelectedBtn.addEventListener("click", deleteSelectedInvoices);
    window.addEventListener("romeo-language-change", () => {
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

      if (button.dataset.action === "pdf" && invoice.pdfUrl) {
        window.open(invoice.pdfUrl, "_blank", "noopener");
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

    loadInvoices();

