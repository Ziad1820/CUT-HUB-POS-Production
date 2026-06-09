    function decodeArabicMojibake(text) {
      if (typeof text !== "string" || !text) {
        return text;
      }

      return window.__decodeText ? window.__decodeText(text) : text;
    }

    function fixArabicInNode(node) {
      if (!node) {
        return;
      }

      if (node.nodeType === Node.TEXT_NODE) {
        const fixed = decodeArabicMojibake(node.nodeValue);
        if (fixed !== node.nodeValue) {
          node.nodeValue = fixed;
        }
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      ["placeholder", "title", "aria-label", "value"].forEach(attr => {
        if (!node.hasAttribute(attr)) {
          return;
        }

        const current = node.getAttribute(attr);
        const fixed = decodeArabicMojibake(current);
        if (fixed !== current) {
          node.setAttribute(attr, fixed);
          if ((node.tagName === "INPUT" || node.tagName === "TEXTAREA" || node.tagName === "OPTION") && attr === "value") {
            node.value = fixed;
          }
        }
      });

      Array.from(node.childNodes).forEach(fixArabicInNode);
    }

    RomeoAuth.requireAuth("access_cashier");

    const API_URL = RomeoApi.API_URL;
    const SERVICES_STORAGE_KEY = "romeo-pos-services";
    const defaultServices = [
      { name: "Ø´Ø¹Ø±", price: 110 },
      { name: "Ø¯Ù‚Ù†", price: 50 },
      { name: "Ø¯Ù‚Ù† Ø¬ÙŠÙ„ÙŠØª", price: 70 },
      { name: "Ø´Ø¹Ø± Ø·ÙÙ„", price: 80 },
      { name: "Ø³Ø´ÙˆØ§Ø±", price: 50 },
      { name: "ØªÙ†Ø¹ÙŠÙ…", price: 30 },
      { name: "ÙØªÙ„Ø©", price: 50 },
      { name: "Ø´Ù…Ø¹", price: 50 },
      { name: "ÙÙˆØ·Ø© Ø³Ø®Ù†Ø©", price: 20 },
      { name: "ÙÙˆØ·Ø© Ù†Ø¹Ù†Ø§Ø¹", price: 20 },
      { name: "ØªÙˆØ¨Ùƒ", price: 50 },
      { name: "Ù…Ø§Ø³Ùƒ", price: 50 },
      { name: "ØµØ¨ØºØ© Ø¯Ù‚Ù†", price: 50 },
      { name: "ØµØ¨ØºØ© Ø´Ø¹Ø±", price: 100 },
      { name: "ØµØ¨ØºØ© Ø³Ø¨Ù„ÙØ±", price: 600 },
      { name: "Ø­Ù…Ø§Ù… ÙƒØ±ÙŠÙ… Ø¹Ø§Ø¯ÙŠ", price: 50 },
      { name: "Ø­Ù…Ø§Ù… ÙƒØ±ÙŠÙ… Ø¨Ø±Ùˆ", price: 100 },
      { name: "Ø­Ù…Ø§Ù… Ø²ÙŠØª", price: 50 },
      { name: "Ù…Ø¹Ø§Ù„Ø¬ TCB", price: 100 },
      { name: "Ø¬Ù„Ø³Ø© Ù‚Ø´Ø±Ø©", price: 50 },
      { name: "Ø¬Ù„Ø³Ø© Ø¨Ø´Ø±Ø© Ø¹Ø§Ø¯ÙŠØ©", price: 200 },
      { name: "Ø¬Ù„Ø³Ø© Ø¨Ø´Ø±Ø© Ù„ÙŠØ²Ø±", price: 300 },
      { name: "Ø¨Ø±ÙˆØªÙŠÙ† Ø¨Ø±Ø§Ø²ÙŠÙ„ÙŠ", price: 500 },
      { name: "Ø¨Ø±ÙˆØªÙŠÙ† CHI", price: 700 },
      { name: "Ø¨Ø§ÙƒÙŠØªØ¬ Ø¹Ø±ÙŠØ³ Ø¯Ø§Ø®Ù„ Ø§Ù„ÙØ±Ø¹", price: 1000 },
      { name: "Ø¨Ø§ÙƒÙŠØ¯Ø¬ Ø¹Ø±ÙŠØ³ Ø®Ø§Ø±Ø¬ Ø§Ù„ÙØ±Ø¹", price: 1500 }
    ];
    let availableServices = defaultServices.map(service => ({ ...service }));

    let cart = [];
    const twoServiceHairOfferPrice = 150;
    const threeServiceHairOfferPrice = 170;
    const fourServiceHairOfferPrice = 200;
    const fiveOrMoreHairOfferPrice = 230;
    const premiumOfferExtra = 30;
    const hairOfferExcludedServices = new Set([
      "Ø´Ø¹Ø± Ø·ÙÙ„",
      "ØµØ¨ØºØ© Ø´Ø¹Ø±",
      "ØµØ¨ØºØ© Ø¯Ù‚Ù†",
      "Ù…Ø¹Ø§Ù„Ø¬ TCB",
      "Ø¬Ù„Ø³Ø© Ø¨Ø´Ø±Ø© Ø¹Ø§Ø¯ÙŠØ©",
      "Ø¬Ù„Ø³Ø© Ø¨Ø´Ø±Ø© Ù„ÙŠØ²Ø±",
      "Ø¨Ø±ÙˆØªÙŠÙ† CHI",
      "Ø¨Ø±ÙˆØªÙŠÙ† Ø¨Ø±Ø§Ø²ÙŠÙ„ÙŠ",
      "ØµØ¨ØºØ© Ø³Ø¨Ù„ÙØ±",
      "Ø¨Ø§ÙƒÙŠØªØ¬ Ø¹Ø±ÙŠØ³ Ø¯Ø§Ø®Ù„ Ø§Ù„ÙØ±Ø¹",
      "Ø¨Ø§ÙƒÙŠØ¯Ø¬ Ø¹Ø±ÙŠØ³ Ø®Ø§Ø±Ø¬ Ø§Ù„ÙØ±Ø¹"
    ]);

    defaultServices.forEach(service => {
      service.name = decodeArabicMojibake(service.name);
    });
    const normalizeServiceName = value => decodeArabicMojibake(String(value || ""))
      .replace(/\s+/g, " ")
      .trim();
    availableServices = availableServices.map(service => ({
      ...service,
      name: normalizeServiceName(service.name)
    }));
    hairOfferExcludedServices.clear();
    [
      "Ø´Ø¹Ø± Ø·ÙÙ„",
      "ØµØ¨ØºØ© Ø´Ø¹Ø±",
      "ØµØ¨ØºØ© Ø¯Ù‚Ù†",
      "Ù…Ø¹Ø§Ù„Ø¬ TCB",
      "Ø¬Ù„Ø³Ø© Ø¨Ø´Ø±Ø© Ø¹Ø§Ø¯ÙŠØ©",
      "Ø¬Ù„Ø³Ø© Ø¨Ø´Ø±Ø© Ù„ÙŠØ²Ø±",
      "Ø¨Ø±ÙˆØªÙŠÙ† CHI",
      "Ø¨Ø±ÙˆØªÙŠÙ† Ø¨Ø±Ø§Ø²ÙŠÙ„ÙŠ",
      "ØµØ¨ØºØ© Ø³Ø¨Ù„ÙØ±",
      "Ø¨Ø§ÙƒÙŠØªØ¬ Ø¹Ø±ÙŠØ³ Ø¯Ø§Ø®Ù„ Ø§Ù„ÙØ±Ø¹",
      "Ø¨Ø§ÙƒÙŠØ¯Ø¬ Ø¹Ø±ÙŠØ³ Ø®Ø§Ø±Ø¬ Ø§Ù„ÙØ±Ø¹"
    ].forEach(name => hairOfferExcludedServices.add(normalizeServiceName(name)));

    const servicesPanel = document.querySelector(".services-panel");
    const servicesGrid = document.getElementById("servicesGrid");
    const cartPanel = document.getElementById("cartPanel");
    const reportDateInput = document.getElementById("reportDate");
    const cartItems = document.getElementById("cartItems");
    const totalAmount = document.getElementById("totalAmount");
    const serviceCount = document.getElementById("serviceCount");
    const offerBadge = document.getElementById("offerBadge");
    const customerNameInput = document.getElementById("customerName");
    const customerPhoneInput = document.getElementById("customerPhone");
    const customerSuggestions = document.getElementById("customerSuggestions");
    const paidAmountInput = document.getElementById("paidAmount");
    const remainingAmountInput = document.getElementById("remainingAmount");
    const invoiceNoteInput = document.getElementById("invoiceNote");
    const statusBox = document.getElementById("statusBox");
    const dailyNetCard = document.getElementById("dailyNetCard");
    const dailyNetAmount = document.getElementById("dailyNetAmount");
    const dailyNetBreakdown = document.getElementById("dailyNetBreakdown");
    const todaySalesAmount = document.getElementById("todaySalesAmount");
    const cashTodayTotal = document.getElementById("cashTodayTotal");
    const instapayTodayTotal = document.getElementById("instapayTodayTotal");
    const vodafoneTodayTotal = document.getElementById("vodafoneTodayTotal");
    const visaTodayTotal = document.getElementById("visaTodayTotal");
    const completeSaleBtn = document.getElementById("completeSaleBtn");
    const printBtn = document.getElementById("printBtn");
    const clearBtn = document.getElementById("clearBtn");
    const editPricesBtn = document.getElementById("editPricesBtn");
    const priceEditorModal = document.getElementById("priceEditorModal");
    const priceEditorList = document.getElementById("priceEditorList");
    const savePricesBtn = document.getElementById("savePricesBtn");
    const closePriceEditorBtn = document.getElementById("closePriceEditorBtn");
    const resetPricesBtn = document.getElementById("resetPricesBtn");
    const addServiceBtn = document.getElementById("addServiceBtn");
    const newServiceNameInput = document.getElementById("newServiceName");
    const newServicePriceInput = document.getElementById("newServicePrice");
    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const logoutBtn = document.getElementById("logoutBtn");
    const barberSelect = document.getElementById("barber");
    let customerDirectory = [];
    let customersLoaded = false;
    let customersLoading = false;
    let latestTodaySales = 0;
    let latestPaymentTotals = {};
    const STAFF_STORAGE_KEY = "romeo-pos-staff-accounting-v2";
    const WITHDRAWALS_STORAGE_KEY = "romeo-pos-withdrawals";
    const EXPENSES_STORAGE_KEY = "romeo-pos-expenses";
    const BARBER_NAMES_BY_CODE = {
      R01: "KAREEM",
      R02: "8AYTH",
      R03: "ELEBY",
      R07: "RAMDAN",
      R08: "KHALED",
      R09: "MOHAMED"
    };
    const DEFAULT_BARBER_STAFF = [
      { id: 1, name: "Ramdan", code: "R07" },
      { id: 2, name: "Khaled", code: "R08" },
      { id: 3, name: "Mohamed Emmad", code: "R09" },
      { id: 4, name: "Karem", code: "R01" },
      { id: 5, name: "Eleby", code: "R03" },
      { id: 6, name: "8atyh", code: "R02" }
    ];
    fixArabicInNode(document.body);

    function getCurrentPageLanguage() {
      return window.RomeoLanguage?.getCurrentLanguage?.() || "ar";
    }

    function localizeText(arText, enText) {
      return getCurrentPageLanguage() === "en" ? enText : arText;
    }

    function formatCurrency(value) {
      const amount = Math.max(0, Math.round(numberValue(value)));
      return getCurrentPageLanguage() === "en"
        ? `${amount.toLocaleString("en-US")} EGP`
        : `${amount.toLocaleString("en-US")} جنيه`;
    }

    function formatSignedCurrency(value) {
      const rounded = Math.round(numberValue(value));
      const sign = rounded < 0 ? "-" : "";
      const amount = Math.abs(rounded);
      return getCurrentPageLanguage() === "en"
        ? `${sign}${amount.toLocaleString("en-US")} EGP`
        : `${sign}${amount.toLocaleString("en-US")} جنيه`;
    }

    function numberValue(value) {
      const parsed = typeof value === "number"
        ? value
        : parseFloat(String(value || "").replace(/[^\d.-]/g, ""));
      return Number.isFinite(parsed) ? parsed : 0;
    }

    function formatDateInputValue(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    function getReportDateKey() {
      return reportDateInput.value || formatDateInputValue(new Date());
    }

    function getStoredList(key) {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        return [];
      }
    }

    function getStoredStaffForBarbers() {
      const storedStaff = getStoredList(STAFF_STORAGE_KEY)
        .filter(staff => staff && String(staff.name || "").trim());

      return storedStaff.length
        ? storedStaff
        : DEFAULT_BARBER_STAFF.map(staff => ({ ...staff }));
    }

    function getBarberSheetName(staff) {
      const code = String(staff.code || "").trim().toUpperCase();
      const fallback = String(staff.name || "").trim().toUpperCase();
      return BARBER_NAMES_BY_CODE[code] || fallback;
    }

    function renderBarberOptions() {
      const currentValue = barberSelect.value;
      const staffList = getStoredStaffForBarbers();

      barberSelect.innerHTML = '<option value="">Ø§Ø®ØªØ± Ø§Ù„Ø­Ù„Ø§Ù‚</option>';
      staffList.forEach(staff => {
        const option = document.createElement("option");
        option.value = getBarberSheetName(staff);
        option.textContent = staff.name;
        option.dataset.staffId = staff.id;
        option.dataset.staffCode = staff.code || "";
        barberSelect.appendChild(option);
      });

      barberSelect.value = Array.from(barberSelect.options).some(option => option.value === currentValue)
        ? currentValue
        : "";

      if (typeof RomeoLanguage !== "undefined") {
        RomeoLanguage.applyLanguage();
      }
    }

    function getStoredTotalForDate(key, dateKey) {
      return getStoredList(key)
        .filter(item => item && item.date === dateKey)
        .reduce((sum, item) => sum + numberValue(item.amount), 0);
    }

    function updateDailyNet(todaySales) {
      const dateKey = getReportDateKey();
      const withdrawalsTotal = getStoredTotalForDate(WITHDRAWALS_STORAGE_KEY, dateKey);
      const expensesTotal = getStoredTotalForDate(EXPENSES_STORAGE_KEY, dateKey);
      const netTotal = numberValue(todaySales) - withdrawalsTotal - expensesTotal;

      dailyNetAmount.textContent = formatSignedCurrency(netTotal);
      dailyNetCard.classList.toggle("is-negative", netTotal < 0);
      dailyNetBreakdown.textContent = getCurrentPageLanguage() === "en"
        ? `Sales ${formatCurrency(todaySales)} - Withdrawals ${formatCurrency(withdrawalsTotal)} - Expenses ${formatCurrency(expensesTotal)}`
        : `المبيعات ${formatCurrency(todaySales)} - السحوبات ${formatCurrency(withdrawalsTotal)} - المصروفات ${formatCurrency(expensesTotal)}`;
    }

    function updatePaymentMethodTotals(totals = {}) {
      latestPaymentTotals = { ...totals };
      cashTodayTotal.textContent = formatCurrency(numberValue(totals.cash));
      instapayTodayTotal.textContent = formatCurrency(numberValue(totals.instapay));
      vodafoneTodayTotal.textContent = formatCurrency(numberValue(totals.vodafoneCash));
      visaTodayTotal.textContent = formatCurrency(numberValue(totals.visa));
    }

    function firstNumberValue(...values) {
      for (const value of values) {
        const parsed = numberValue(value);
        if (parsed !== 0 || value === 0 || value === "0") {
          return parsed;
        }
      }
      return 0;
    }

    async function fetchTodayPaymentTotals() {
      try {
        const loadingText = localizeText("Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...", "Loading...");
        cashTodayTotal.textContent = loadingText;
        instapayTodayTotal.textContent = loadingText;
        vodafoneTodayTotal.textContent = loadingText;
        visaTodayTotal.textContent = loadingText;

        const response = await fetch(API_URL, {
          method: "POST",
          body: JSON.stringify({
            action: "todayPaymentTotals",
            reportDate: getReportDateKey()
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `Failed to load payment totals (${response.status})`);
        }

        const data = await response.json();
        if (data.status !== "success") {
          throw new Error(data.message || "Failed to load payment totals");
        }

        updatePaymentMethodTotals({
          cash: firstNumberValue(data.cashTotal, data.cash, data.cashTodayTotal, data.naqdTotal, data["Ù†Ù‚Ø¯ÙŠ"]),
          instapay: firstNumberValue(data.instapayTotal, data.instapay, data.instapayTodayTotal, data["Ø§Ù†Ø³ØªØ§ Ø¨Ø§ÙŠ"]),
          vodafoneCash: firstNumberValue(data.vodafoneCashTotal, data.vodafoneCash, data.vodafoneTotal, data["ÙÙˆØ¯Ø§ÙÙˆÙ† ÙƒØ§Ø´"]),
          visa: firstNumberValue(data.visaTotal, data.visa, data.visaTodayTotal, data["ÙÙŠØ²Ø§"])
        });
      } catch (error) {
        console.error(error);
        updatePaymentMethodTotals();
      }
    }

    function getTotal() {
      const baseTotal = getSubtotalBeforePremium();
      return baseTotal + getPremiumExtra();
    }

    function getPremiumExtra() {
      return getSelectedOfferType() === "Ø¨Ø±ÙŠÙ…ÙŠÙˆÙ…" ? premiumOfferExtra : 0;
    }

    function getSelectedOfferType() {
      const selected = document.querySelector('input[name="offerType"]:checked');
      return selected ? selected.value : "Ø¹Ø§Ø¯ÙŠ";
    }

    function getSubtotalBeforePremium() {
      const { eligibleItems, excludedItems } = splitCartByHairOfferRules();
      const eligibleRegularTotal = eligibleItems.reduce((sum, item) => sum + item.price, 0);
      const excludedTotal = excludedItems.reduce((sum, item) => sum + item.price, 0);
      return getOfferBaseTotal(eligibleRegularTotal) + excludedTotal;
    }

    function splitCartByHairOfferRules() {
      const eligibleItems = cart.filter(item => !hairOfferExcludedServices.has(normalizeServiceName(item.name)));
      const excludedItems = cart.filter(item => hairOfferExcludedServices.has(normalizeServiceName(item.name)));
      return { eligibleItems, excludedItems };
    }

    function getOfferBaseTotal(regularTotal) {
      const offerType = getHairOfferType();
      if (offerType === "two-services") {
        return twoServiceHairOfferPrice;
      }

      if (offerType === "three-services") {
        return threeServiceHairOfferPrice;
      }

      if (offerType === "four-services") {
        return fourServiceHairOfferPrice;
      }

      if (offerType === "five-or-more-services") {
        return fiveOrMoreHairOfferPrice;
      }

      return regularTotal;
    }

    function getHairOfferType() {
      const { eligibleItems } = splitCartByHairOfferRules();
      const hasMainHairService = eligibleItems.some(item => normalizeServiceName(item.name) === "???");
      const eligibleCount = eligibleItems.length;

      if (!hasMainHairService) {
        return "none";
      }

      if (eligibleCount === 2) {
        return "two-services";
      }

      if (eligibleCount === 3) {
        return "three-services";
      }

      if (eligibleCount === 4) {
        return "four-services";
      }

      if (eligibleCount >= 5) {
        return "five-or-more-services";
      }

      return "none";
    }

    function showStatus(message, type) {
      statusBox.textContent = message;
      statusBox.className = `status ${type}`;
    }

    function clearStatus() {
      statusBox.textContent = "";
      statusBox.className = "status";
    }

    function sanitizePhoneInput() {
      customerPhoneInput.value = customerPhoneInput.value.replace(/\D/g, "");
    }

    function hideCustomerSuggestions() {
      customerSuggestions.classList.remove("active");
      customerSuggestions.innerHTML = "";
      customerPhoneInput.setAttribute("aria-expanded", "false");
    }

    function showCustomerSuggestionMessage(message) {
      customerSuggestions.innerHTML = "";
      const item = document.createElement("div");
      item.className = "customer-suggestion-message";
      item.textContent = message;
      customerSuggestions.appendChild(item);
      customerSuggestions.classList.add("active");
      customerPhoneInput.setAttribute("aria-expanded", "true");
    }

    async function loadCustomerDirectory() {
      if (customersLoaded || customersLoading) {
        return;
      }

      customersLoading = true;

      try {
        const response = await fetch(API_URL, {
          method: "POST",
          body: JSON.stringify({ action: "customerLookup" })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `Ø®Ø·Ø£ ÙÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ (${response.status})`);
        }

        const data = await response.json();
        if (data.status !== "success") {
          throw new Error(data.message || "ØªØ¹Ø°Ø± ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡");
        }

        customerDirectory = Array.isArray(data.customers)
          ? data.customers
              .map(customer => ({
                name: String(customer.name || "").trim(),
                phone: String(customer.phone || "").replace(/\D/g, "")
              }))
              .filter(customer => customer.name && customer.phone)
          : [];
        customersLoaded = true;
      } catch (error) {
        console.error(error);
        showCustomerSuggestionMessage(error.message || "ØªØ¹Ø°Ø± ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡");
      } finally {
        customersLoading = false;
      }
    }

    async function fetchTodaySales() {
      try {
        todaySalesAmount.textContent = "Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...";
        const response = await fetch(API_URL, {
          method: "POST",
          body: JSON.stringify({
            action: "todaySales",
            reportDate: getReportDateKey()
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `Failed to load today's sales (${response.status})`);
        }

        const data = await response.json();
        if (data.status !== "success") {
          throw new Error(data.message || "Failed to load today's sales");
        }

        latestTodaySales = numberValue(data.todaySales);
        todaySalesAmount.textContent = formatCurrency(latestTodaySales);
        updateDailyNet(latestTodaySales);
        fetchTodayPaymentTotals();
      } catch (error) {
        console.error(error);
        latestTodaySales = 0;
        todaySalesAmount.textContent = formatCurrency(0);
        updateDailyNet(latestTodaySales);
        updatePaymentMethodTotals();
      }
    }

    function renderCustomerSuggestions() {
      const query = customerPhoneInput.value.replace(/\D/g, "");

      if (query.length < 4) {
        hideCustomerSuggestions();
        return;
      }

      const matches = customerDirectory
        .filter(customer => customer.phone.includes(query))
        .slice(0, 8);

      customerSuggestions.innerHTML = "";

      if (!matches.length) {
        showCustomerSuggestionMessage("Ù„Ø§ ØªÙˆØ¬Ø¯ Ù†ØªØ§Ø¦Ø¬ Ù…Ø´Ø§Ø¨Ù‡Ø©");
        return;
      }

      matches.forEach(customer => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "customer-suggestion";
        option.setAttribute("role", "option");

        const name = document.createElement("strong");
        name.textContent = customer.name;

        const phone = document.createElement("span");
        phone.textContent = customer.phone;

        option.append(name, phone);
        option.addEventListener("click", () => {
          customerNameInput.value = customer.name;
          customerPhoneInput.value = customer.phone;
          hideCustomerSuggestions();
        });

        customerSuggestions.appendChild(option);
      });

      customerSuggestions.classList.add("active");
      customerPhoneInput.setAttribute("aria-expanded", "true");
    }

    async function handleCustomerPhoneInput() {
      sanitizePhoneInput();

      if (customerPhoneInput.value.length < 4) {
        hideCustomerSuggestions();
        return;
      }

      if (!customersLoaded) {
        showCustomerSuggestionMessage("Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡...");
      }

      await loadCustomerDirectory();

      if (customersLoaded) {
        renderCustomerSuggestions();
      }
    }

    function loadStoredServicePrices() {
      const storedServices = JSON.parse(localStorage.getItem(SERVICES_STORAGE_KEY) || "null");
      availableServices = Array.isArray(storedServices) && storedServices.length > 0
        ? storedServices.map(service => ({
            ...service,
            name: normalizeServiceName(service.name),
            price: Number(service.price) || 0
          }))
        : defaultServices.map(service => ({ ...service }));
    }

    function normalizeServiceRecord(service) {
      return {
        name: normalizeServiceName(service.name),
        price: numberValue(service.price)
      };
    }

    function applyServicesList(services) {
      const normalizedServices = Array.isArray(services)
        ? services.map(normalizeServiceRecord).filter(service => service.name)
        : [];

      availableServices = normalizedServices.length > 0
        ? normalizedServices
        : defaultServices.map(service => ({ ...service }));

      localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(availableServices));
      syncCartPrices();
      renderServices();
      renderCart();

      if (priceEditorModal.classList.contains("active")) {
        renderPriceEditor();
      }
    }

    async function loadServicesFromSheet() {
      try {
        const result = await RomeoApi.request({ action: "getServices" });
        if (result.status === "success" && Array.isArray(result.services)) {
          applyServicesList(result.services);
        }
      } catch (error) {
        console.warn("Using local services fallback", error);
      }
    }

    function applyUserPermissions() {
      if (!RomeoAuth.hasPermission("edit_prices")) {
        editPricesBtn.style.display = "none";
      }

      document.querySelectorAll(".sidebar-link[data-permission]").forEach(link => {
        if (!RomeoAuth.hasPermission(link.dataset.permission)) {
          link.style.display = "none";
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

    function openPriceEditor() {
      if (!RomeoAuth.hasPermission("edit_prices")) {
        showStatus("Ù„ÙŠØ³ Ù„Ø¯ÙŠÙƒ ØµÙ„Ø§Ø­ÙŠØ© Ù„ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ø£Ø³Ø¹Ø§Ø±.", "error");
        return;
      }

      renderPriceEditor();
      priceEditorModal.classList.add("active");
    }

    function closePriceEditor() {
      priceEditorModal.classList.remove("active");
    }

    function renderPriceEditor() {
      priceEditorList.innerHTML = availableServices
        .map(
          (service, index) => `
            <div class="price-editor-row">
              <strong>${service.name}</strong>
              <input type="number" min="0" step="1" data-service-index="${index}" value="${service.price}">
              <button class="danger-btn" type="button" onclick="deleteServiceFromMenu(${index})">Ø­Ø°Ù</button>
            </div>
          `
        )
        .join("");
    }

    function syncCartPrices() {
      cart = cart.map(item => {
        const updatedService = availableServices.find(service => service.name === item.name);
        return updatedService ? { ...updatedService } : item;
      }).filter(Boolean);
    }

    async function persistServices() {
      localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(availableServices));

      try {
        const currentUser = RomeoAuth.getCurrentUser ? RomeoAuth.getCurrentUser() : null;
        const result = await RomeoApi.request({
          action: "saveServices",
          services: availableServices,
          currentUser,
          actor: currentUser,
          changeType: "services_prices"
        });

        if (result.status !== "success") {
          throw new Error(result.message || "Could not save services to sheet");
        }

        return true;
      } catch (error) {
        console.error("Could not save services to sheet", error);
        return false;
      }
    }

    async function addServiceToMenu() {
      const name = newServiceNameInput.value.trim();
      const price = Number(newServicePriceInput.value) || 0;

      if (!name) {
        showStatus("Ø§ÙƒØªØ¨ Ø§Ø³Ù… Ø§Ù„Ø®Ø¯Ù…Ø© Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø© Ø£ÙˆÙ„Ø§Ù‹.", "error");
        return;
      }

      if (availableServices.some(service => service.name === name)) {
        showStatus("Ù‡Ø°Ù‡ Ø§Ù„Ø®Ø¯Ù…Ø© Ù…ÙˆØ¬ÙˆØ¯Ø© Ø¨Ø§Ù„ÙØ¹Ù„.", "error");
        return;
      }

      availableServices.push({ name, price });
      const savedToSheet = await persistServices();
      renderPriceEditor();
      renderServices();
      newServiceNameInput.value = "";
      newServicePriceInput.value = "";
      showStatus(
        savedToSheet
          ? "ØªÙ… Ø­ÙØ¸ Ø§Ù„Ø®Ø¯Ù…Ø© Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø© ÙÙŠ Ø§Ù„Ø´ÙŠØª."
          : "ØªÙ… Ø­ÙØ¸ Ø§Ù„Ø®Ø¯Ù…Ø© Ø¹Ù„Ù‰ Ù‡Ø°Ø§ Ø§Ù„Ø¬Ù‡Ø§Ø² ÙÙ‚Ø·ØŒ ÙˆÙ„Ù… ÙŠØªÙ… Ø­ÙØ¸Ù‡Ø§ ÙÙŠ Ø§Ù„Ø´ÙŠØª.",
        savedToSheet ? "success" : "error"
      );
    }

    async function saveServicePrices() {
      const inputs = priceEditorList.querySelectorAll("input[data-service-index]");

      inputs.forEach(input => {
        const index = Number(input.dataset.serviceIndex);
        const newPrice = Number(input.value) || 0;
        availableServices[index].price = newPrice;
      });

      const savedToSheet = await persistServices();
      syncCartPrices();
      renderServices();
      renderCart();
      closePriceEditor();
      showStatus(
        savedToSheet
          ? "ØªÙ… Ø­ÙØ¸ Ø§Ù„Ø£Ø³Ø¹Ø§Ø± Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø© ÙÙŠ Ø§Ù„Ø´ÙŠØª."
          : "ØªÙ… Ø­ÙØ¸ Ø§Ù„Ø£Ø³Ø¹Ø§Ø± Ø¹Ù„Ù‰ Ù‡Ø°Ø§ Ø§Ù„Ø¬Ù‡Ø§Ø² ÙÙ‚Ø·ØŒ ÙˆÙ„Ù… ÙŠØªÙ… Ø­ÙØ¸Ù‡Ø§ ÙÙŠ Ø§Ù„Ø´ÙŠØª.",
        savedToSheet ? "success" : "error"
      );
    }

    async function resetServicePrices() {
      availableServices = defaultServices.map(service => ({ ...service }));
      const savedToSheet = await persistServices();
      syncCartPrices();
      renderPriceEditor();
      renderServices();
      renderCart();
      showStatus(
        savedToSheet
          ? "ØªÙ… Ø§Ø³ØªØ±Ø¬Ø§Ø¹ Ø§Ù„Ø£Ø³Ø¹Ø§Ø± Ø§Ù„Ø£ØµÙ„ÙŠØ© ÙˆØ­ÙØ¸Ù‡Ø§ ÙÙŠ Ø§Ù„Ø´ÙŠØª."
          : "ØªÙ… Ø§Ø³ØªØ±Ø¬Ø§Ø¹ Ø§Ù„Ø£Ø³Ø¹Ø§Ø± Ø§Ù„Ø£ØµÙ„ÙŠØ© Ø¹Ù„Ù‰ Ù‡Ø°Ø§ Ø§Ù„Ø¬Ù‡Ø§Ø² ÙÙ‚Ø·ØŒ ÙˆÙ„Ù… ÙŠØªÙ… Ø­ÙØ¸Ù‡Ø§ ÙÙŠ Ø§Ù„Ø´ÙŠØª.",
        savedToSheet ? "success" : "error"
      );
    }

    window.deleteServiceFromMenu = async index => {
      const service = availableServices[index];
      if (!service) {
        return;
      }

      if (!window.confirm(`Ù‡Ù„ ØªØ±ÙŠØ¯ Ø­Ø°Ù Ø®Ø¯Ù…Ø© ${service.name}ØŸ`)) {
        return;
      }

      availableServices.splice(index, 1);
      cart = cart.filter(item => item.name !== service.name);
      const savedToSheet = await persistServices();
      renderPriceEditor();
      renderServices();
      renderCart();
      showStatus(
        savedToSheet
          ? "ØªÙ… Ø­Ø°Ù Ø§Ù„Ø®Ø¯Ù…Ø© ÙˆØ­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„ ÙÙŠ Ø§Ù„Ø´ÙŠØª."
          : "ØªÙ… Ø­Ø°Ù Ø§Ù„Ø®Ø¯Ù…Ø© Ø¹Ù„Ù‰ Ù‡Ø°Ø§ Ø§Ù„Ø¬Ù‡Ø§Ø² ÙÙ‚Ø·ØŒ ÙˆÙ„Ù… ÙŠØªÙ… Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„ ÙÙŠ Ø§Ù„Ø´ÙŠØª.",
        savedToSheet ? "success" : "error"
      );
    };

    function setLoadingState(isLoading) {
      completeSaleBtn.disabled = isLoading;
      printBtn.disabled = isLoading;
      clearBtn.disabled = isLoading;
      completeSaleBtn.textContent = isLoading ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸..." : "Ø¥ØªÙ…Ø§Ù… Ø§Ù„Ø­Ø³Ø§Ø¨";

      if (isLoading) {
        showStatus("Loading... Ø¬Ø§Ø±ÙŠ Ø­ÙØ¸ Ø§Ù„ÙØ§ØªÙˆØ±Ø© ÙˆØ§Ù†ØªØ¸Ø§Ø± Ø§Ù„Ø±Ø¯ Ù…Ù† Google Sheets", "loading");
      }
    }

    function syncServicesPanelHeight() {
      requestAnimationFrame(() => {
        if (window.innerWidth <= 960) {
          servicesPanel.style.height = "";
          return;
        }

        servicesPanel.style.height = `${cartPanel.offsetHeight}px`;
      });
    }

    function renderServices() {
      servicesGrid.innerHTML = availableServices
        .map(
          (service, index) => `
            <button class="service-btn" type="button" onclick="addService(${index})">
              <strong>${service.name}</strong>
              <span>${formatCurrency(service.price)}</span>
            </button>
          `
        )
        .join("");
      fixArabicInNode(servicesGrid);
      syncServicesPanelHeight();
    }

    function renderCart() {
      if (cart.length === 0) {
        cartItems.innerHTML = `<div class="empty-state">${localizeText("Ù„Ù… ÙŠØªÙ… Ø§Ø®ØªÙŠØ§Ø± Ø£ÙŠ Ø®Ø¯Ù…Ø© Ø­ØªÙ‰ Ø§Ù„Ø¢Ù†.", "No service has been selected yet.")}</div>`;
      } else {
        cartItems.innerHTML = cart
          .map(
            (item, index) => `
              <div class="cart-item">
                <button class="remove-btn" type="button" onclick="removeService(${index})">X</button>
                <div>
                  <strong>${item.name}</strong>
                  <small>Ø§Ø³Ù… Ø§Ù„Ø¹Ù…ÙŠÙ„? Ø§Ø³Ù… Ø§Ù„Ø¹Ù…ÙŠÙ„</small>
                </div>
                <span class="price">${formatCurrency(item.price)}</span>
                <span>#${index + 1}</span>
              </div>
            `
          )
          .join("");
      }
      fixArabicInNode(cartItems);

      const total = getTotal();
      serviceCount.textContent = cart.length;
      totalAmount.textContent = formatCurrency(total);
      const offerType = getHairOfferType();
      const { eligibleItems, excludedItems } = splitCartByHairOfferRules();
      if (offerType === "two-services") {
        offerBadge.textContent = excludedItems.length > 0
          ? `تم تطبيق عرض الخدمتين على ${eligibleItems.length} خدمات مطابقة = 150 جنيه`
          : "تم تطبيق عرض الخدمتين: شعر + خدمة ثانية = 150 جنيه";
        offerBadge.className = "offer-badge active";
      } else if (offerType === "three-services") {
        offerBadge.textContent = excludedItems.length > 0
          ? `تم تطبيق عرض 3 خدمات على ${eligibleItems.length} خدمات مطابقة = 170 جنيه`
          : "تم تطبيق عرض الثلاث خدمات: شعر + خدمتين = 170 جنيه";
        offerBadge.className = "offer-badge active";
      } else if (offerType === "four-services") {
        offerBadge.textContent = excludedItems.length > 0
          ? `تم تطبيق عرض 4 خدمات على ${eligibleItems.length} خدمات مطابقة = 200 جنيه`
          : "تم تطبيق عرض الأربع خدمات: شعر + 3 خدمات = 200 جنيه";
        offerBadge.className = "offer-badge active";
      } else if (offerType === "five-or-more-services") {
        offerBadge.textContent = excludedItems.length > 0
          ? `تم تطبيق عرض 5 خدمات أو أكثر على ${eligibleItems.length} خدمات مطابقة = 230 جنيه`
          : "تم تطبيق عرض 5 خدمات أو أكثر: شعر + 4 خدمات أو أكثر = 230 جنيه";
        offerBadge.className = "offer-badge active";
      } else {
        offerBadge.textContent = "";
        offerBadge.className = "offer-badge";
      }
      updateRemaining();
      syncServicesPanelHeight();
    }

    function addService(index) {
      cart.push({ ...availableServices[index] });
      clearStatus();
      renderCart();
    }

    function removeService(index) {
      cart.splice(index, 1);
      renderCart();
    }

    function updateRemaining() {
      const total = getTotal();
      const paid = Number(paidAmountInput.value) || 0;
      const change = paid - total;
      remainingAmountInput.value = change > 0 ? formatCurrency(change) : formatCurrency(0);
    }

    function getSelectedPaymentMethod() {
      const selected = document.querySelector('input[name="paymentMethod"]:checked');
      return selected ? selected.value : "";
    }

    function resetForm() {
      cart = [];
      customerNameInput.value = "";
      customerPhoneInput.value = "";
      document.getElementById("barber").value = "";
      paidAmountInput.value = "";
      invoiceNoteInput.value = "";
      document.getElementById("regularOffer").checked = true;
      document.getElementById("cash").checked = true;
      hideCustomerSuggestions();
      clearStatus();
      renderCart();
    }

    function handleTopMenuChange(event) {
      const target = event.target.value;
      if (!target) {
        return;
      }

      window.location.href = target;
    }

    async function saveInvoice(payload) {
      const result = await RomeoApi.request(payload);

      if (result.status !== "success") {
        throw new Error(result.message || "تعذر حفظ الفاتورة.");
      }

      return result;
    }

    function printInvoice(invoice) {
      const invoiceWindow = window.open("", "", "width=360,height=640");
      if (!invoiceWindow) {
        alert("Ø§Ù„Ù…ØªØµÙØ­ Ù…Ù†Ø¹ ÙØªØ­ Ù†Ø§ÙØ°Ø© Ø§Ù„Ø·Ø¨Ø§Ø¹Ø©. Ø§Ø³Ù…Ø­ Ø¨Ø§Ù„Ù†ÙˆØ§ÙØ° Ø§Ù„Ù…Ù†Ø¨Ø«Ù‚Ø© Ø«Ù… Ø¬Ø±Ù‘Ø¨ Ù…Ø±Ø© Ø£Ø®Ø±Ù‰.");
        return;
      }

      invoiceWindow.document.write(`
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>ÙØ§ØªÙˆØ±Ø© ROMEO</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #2a2118; }
            h2, p { margin: 0 0 10px; }
            .line { border-top: 1px dashed rgba(76,54,28,.58); margin: 12px 0; }
            .item { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .total { font-size: 20px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>ROMEO BARBERSHOP</h2>
          <p>Ø§Ø³Ù… Ø§Ù„Ø¹Ù…ÙŠÙ„: ${invoice.customerName || "ØºÙŠØ± Ù…Ø³Ø¬Ù„"}</p>
          <p>Ø±Ù‚Ù… Ø§Ù„Ø¹Ù…ÙŠÙ„: ${invoice.customerPhone || "ØºÙŠØ± Ù…Ø³Ø¬Ù„"}</p>
          <p>Ø§Ù„Ø­Ù„Ø§Ù‚: ${invoice.barber}</p>
          <p>Ù†ÙˆØ¹ Ø§Ù„Ø¹Ø±Ø¶: ${invoice.offerType || "Ø¹Ø§Ø¯ÙŠ"}</p>
          <p>Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„Ø¯ÙØ¹: ${invoice.paymentMethod}</p>
          <div class="line"></div>
          ${invoice.items.map(item => `<div class="item"><span>${item.name}</span><strong>${formatCurrency(item.price)}</strong></div>`).join("")}
          <div class="line"></div>
          <p class="total">Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ: ${formatCurrency(invoice.total)}</p>
          <p>Ø§Ù„Ù…Ø¯ÙÙˆØ¹: ${formatCurrency(invoice.paidAmount)}</p>
          <p>Ø§Ù„Ø¨Ø§Ù‚ÙŠ: ${formatCurrency(invoice.remainingAmount)}</p>
          <p>${new Date().toLocaleString("ar-EG")}</p>
        </body>
        </html>
      `);

      invoiceWindow.document.close();
      invoiceWindow.focus();
      invoiceWindow.print();
    }

    function printCurrentInvoice() {
      clearStatus();

      const customerName = customerNameInput.value.trim();
      const customerPhone = customerPhoneInput.value.trim();
      const barber = document.getElementById("barber").value || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯";
      const paymentMethod = getSelectedPaymentMethod() || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯";
      const offerType = getSelectedOfferType();
      const total = getTotal();
      const paidAmount = Number(paidAmountInput.value) || 0;
      const remainingAmount = Math.max(0, total - paidAmount);

      if (cart.length === 0) {
        showStatus("Ø§Ø®ØªØ± Ø®Ø¯Ù…Ø© ÙˆØ§Ø­Ø¯Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„ Ù‚Ø¨Ù„ Ø§Ù„Ø·Ø¨Ø§Ø¹Ø©.", "error");
        return;
      }

      printInvoice({
        customerName,
        customerPhone,
        barber,
        paymentMethod,
        offerType,
        total,
        paidAmount,
        remainingAmount,
        items: [...cart]
      });
    }

    async function completeSale() {
      clearStatus();

      const customerName = customerNameInput.value.trim();
      const customerPhone = customerPhoneInput.value.trim();
      const barber = document.getElementById("barber").value;
      const paymentMethod = getSelectedPaymentMethod();
      const offerType = getSelectedOfferType();
      const total = getTotal();
      const subtotalBeforePremium = getSubtotalBeforePremium();
      const premiumExtra = getPremiumExtra();
      const paidAmount = Number(paidAmountInput.value) || 0;
      const remainingAmount = Math.max(0, paidAmount - total);
      const invoiceNote = invoiceNoteInput.value.trim();

      if (cart.length === 0) {
        showStatus("Ø§Ø®ØªØ± Ø®Ø¯Ù…Ø© ÙˆØ§Ø­Ø¯Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„ Ù‚Ø¨Ù„ Ø¥ØªÙ…Ø§Ù… Ø§Ù„Ø­Ø³Ø§Ø¨.", "error");
        return;
      }

      if (!customerName) {
        showStatus("Ø§ÙƒØªØ¨ Ø§Ø³Ù… Ø§Ù„Ø¹Ù…ÙŠÙ„ Ø£ÙˆÙ„Ø§Ù‹.", "error");
        return;
      }

      if (!customerPhone) {
        showStatus("Ø§ÙƒØªØ¨ Ø±Ù‚Ù… Ø§Ù„Ø¹Ù…ÙŠÙ„ Ø£ÙˆÙ„Ø§Ù‹.", "error");
        return;
      }

      if (!barber) {
        showStatus("Ø§Ø®ØªØ± Ø§Ø³Ù… Ø§Ù„Ø­Ù„Ø§Ù‚ Ø§Ù„Ø°ÙŠ Ù‚Ø¯Ù… Ø§Ù„Ø®Ø¯Ù…Ø©.", "error");
        return;
      }

      if (paidAmount <= 0) {
        showStatus("Ø§ÙƒØªØ¨ Ù‚ÙŠÙ…Ø© Ø§Ù„Ù…Ø¯ÙÙˆØ¹ Ù‚Ø¨Ù„ Ø­ÙØ¸ Ø§Ù„ÙØ§ØªÙˆØ±Ø©.", "error");
        return;
      }

      if (paidAmount < total) {
        showStatus("Ù‚ÙŠÙ…Ø© Ø§Ù„Ù…Ø¯ÙÙˆØ¹ ÙŠØ¬Ø¨ Ø£Ù† ØªÙƒÙˆÙ† Ø£ÙƒØ¨Ø± Ù…Ù† Ø£Ùˆ ØªØ³Ø§ÙˆÙŠ Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ.", "error");
        return;
      }

      const invoiceData = {
        action: "invoice",
        customer: customerName,
        customerName,
        customerPhone,
        services: cart.map(item => item.name).join(", "),
        total,
        payment: paymentMethod,
        paymentMethod,
        offerType,
        subtotalBeforePremium,
        premiumExtra,
        barber,
        paidAmount,
        remainingAmount,
        note: invoiceNote,
        invoiceNote
      };

      try {
        setLoadingState(true);
        await saveInvoice(invoiceData);

        const shouldPrint = window.confirm("Ù‡Ù„ ØªØ±ÙŠØ¯ Ø·Ø¨Ø§Ø¹Ø© Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ø¢Ù†ØŸ");
        if (shouldPrint) {
          printInvoice({
            customerName,
            customerPhone,
            barber,
            paymentMethod,
            offerType,
            total,
            paidAmount,
            remainingAmount,
            items: [...cart]
          });
        }

        showStatus("ØªÙ… Ø­ÙØ¸ Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ø¨Ù†Ø¬Ø§Ø­.", "success");
        resetForm();
        fetchTodaySales();
      } catch (error) {
        showStatus(error.message || "Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø­ÙØ¸ Ø§Ù„ÙØ§ØªÙˆØ±Ø©.", "error");
      } finally {
        setLoadingState(false);
      }
    }

    paidAmountInput.addEventListener("input", updateRemaining);
    customerPhoneInput.addEventListener("input", handleCustomerPhoneInput);
    customerPhoneInput.addEventListener("focus", handleCustomerPhoneInput);
    customerPhoneInput.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        hideCustomerSuggestions();
      }
    });
    document.addEventListener("click", event => {
      if (!(event.target instanceof Element) || !event.target.closest(".customer-phone-field")) {
        hideCustomerSuggestions();
      }
    });
    window.addEventListener("storage", event => {
      if (event.key === STAFF_STORAGE_KEY) {
        renderBarberOptions();
      }

      if (event.key === WITHDRAWALS_STORAGE_KEY || event.key === EXPENSES_STORAGE_KEY) {
        updateDailyNet(latestTodaySales);
      }
    });
    window.addEventListener("romeo-language-change", () => {
      renderServices();
      renderCart();
      todaySalesAmount.textContent = formatCurrency(latestTodaySales);
      updateDailyNet(latestTodaySales);
      updatePaymentMethodTotals(latestPaymentTotals);
    });
    window.addEventListener("pageshow", renderBarberOptions);
    reportDateInput.addEventListener("change", fetchTodaySales);
    window.addEventListener("resize", syncServicesPanelHeight);
    if ("ResizeObserver" in window) {
      new ResizeObserver(syncServicesPanelHeight).observe(cartPanel);
    }
    document.querySelectorAll('input[name="offerType"]').forEach(input => {
      input.addEventListener("change", renderCart);
    });
    menuToggle.addEventListener("click", openSidebar);
    sidebarOverlay.addEventListener("click", closeSidebar);
    document.querySelectorAll(".sidebar-link[data-href]").forEach(link => {
      link.addEventListener("click", () => {
        window.location.href = link.dataset.href;
      });
    });
    completeSaleBtn.addEventListener("click", completeSale);
    printBtn.addEventListener("click", printCurrentInvoice);
    clearBtn.addEventListener("click", resetForm);
    editPricesBtn.addEventListener("click", openPriceEditor);
    closePriceEditorBtn.addEventListener("click", closePriceEditor);
    savePricesBtn.addEventListener("click", saveServicePrices);
    resetPricesBtn.addEventListener("click", resetServicePrices);
    addServiceBtn.addEventListener("click", addServiceToMenu);
    logoutBtn.addEventListener("click", () => RomeoAuth.logout());
    priceEditorModal.addEventListener("click", event => {
      if (event.target === priceEditorModal) {
        closePriceEditor();
      }
    });

    applyUserPermissions();
    reportDateInput.value = getReportDateKey();
    renderBarberOptions();
    loadStoredServicePrices();
    renderServices();
    renderCart();
    loadServicesFromSheet();
    fetchTodaySales();
    fixArabicInNode(document.body);

