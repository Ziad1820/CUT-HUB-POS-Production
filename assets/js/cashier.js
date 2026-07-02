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
      { name: "Ã˜Â´Ã˜Â¹Ã˜Â±", price: 110 },
      { name: "Ã˜Â¯Ã™â€šÃ™â€ ", price: 50 },
      { name: "Ã˜Â¯Ã™â€šÃ™â€  Ã˜Â¬Ã™Å Ã™â€žÃ™Å Ã˜Âª", price: 70 },
      { name: "Ã˜Â´Ã˜Â¹Ã˜Â± Ã˜Â·Ã™ÂÃ™â€ž", price: 80 },
      { name: "Ã˜Â³Ã˜Â´Ã™Ë†Ã˜Â§Ã˜Â±", price: 50 },
      { name: "Ã˜ÂªÃ™â€ Ã˜Â¹Ã™Å Ã™â€¦", price: 30 },
      { name: "Ã™ÂÃ˜ÂªÃ™â€žÃ˜Â©", price: 50 },
      { name: "Ã˜Â´Ã™â€¦Ã˜Â¹", price: 50 },
      { name: "Ã™ÂÃ™Ë†Ã˜Â·Ã˜Â© Ã˜Â³Ã˜Â®Ã™â€ Ã˜Â©", price: 20 },
      { name: "Ã™ÂÃ™Ë†Ã˜Â·Ã˜Â© Ã™â€ Ã˜Â¹Ã™â€ Ã˜Â§Ã˜Â¹", price: 20 },
      { name: "Ã˜ÂªÃ™Ë†Ã˜Â¨Ã™Æ’", price: 50 },
      { name: "Ã™â€¦Ã˜Â§Ã˜Â³Ã™Æ’", price: 50 },
      { name: "Ã˜ÂµÃ˜Â¨Ã˜ÂºÃ˜Â© Ã˜Â¯Ã™â€šÃ™â€ ", price: 50 },
      { name: "Ã˜ÂµÃ˜Â¨Ã˜ÂºÃ˜Â© Ã˜Â´Ã˜Â¹Ã˜Â±", price: 100 },
      { name: "Ã˜ÂµÃ˜Â¨Ã˜ÂºÃ˜Â© Ã˜Â³Ã˜Â¨Ã™â€žÃ™ÂÃ˜Â±", price: 600 },
      { name: "Ã˜Â­Ã™â€¦Ã˜Â§Ã™â€¦ Ã™Æ’Ã˜Â±Ã™Å Ã™â€¦ Ã˜Â¹Ã˜Â§Ã˜Â¯Ã™Å ", price: 50 },
      { name: "Ã˜Â­Ã™â€¦Ã˜Â§Ã™â€¦ Ã™Æ’Ã˜Â±Ã™Å Ã™â€¦ Ã˜Â¨Ã˜Â±Ã™Ë†", price: 100 },
      { name: "Ã˜Â­Ã™â€¦Ã˜Â§Ã™â€¦ Ã˜Â²Ã™Å Ã˜Âª", price: 50 },
      { name: "Ã™â€¦Ã˜Â¹Ã˜Â§Ã™â€žÃ˜Â¬ TCB", price: 100 },
      { name: "Ã˜Â¬Ã™â€žÃ˜Â³Ã˜Â© Ã™â€šÃ˜Â´Ã˜Â±Ã˜Â©", price: 50 },
      { name: "Ã˜Â¬Ã™â€žÃ˜Â³Ã˜Â© Ã˜Â¨Ã˜Â´Ã˜Â±Ã˜Â© Ã˜Â¹Ã˜Â§Ã˜Â¯Ã™Å Ã˜Â©", price: 200 },
      { name: "Ã˜Â¬Ã™â€žÃ˜Â³Ã˜Â© Ã˜Â¨Ã˜Â´Ã˜Â±Ã˜Â© Ã™â€žÃ™Å Ã˜Â²Ã˜Â±", price: 300 },
      { name: "Ã˜Â¨Ã˜Â±Ã™Ë†Ã˜ÂªÃ™Å Ã™â€  Ã˜Â¨Ã˜Â±Ã˜Â§Ã˜Â²Ã™Å Ã™â€žÃ™Å ", price: 500 },
      { name: "Ã˜Â¨Ã˜Â±Ã™Ë†Ã˜ÂªÃ™Å Ã™â€  CHI", price: 700 },
      { name: "Ã˜Â¨Ã˜Â§Ã™Æ’Ã™Å Ã˜ÂªÃ˜Â¬ Ã˜Â¹Ã˜Â±Ã™Å Ã˜Â³ Ã˜Â¯Ã˜Â§Ã˜Â®Ã™â€ž Ã˜Â§Ã™â€žÃ™ÂÃ˜Â±Ã˜Â¹", price: 1000 },
      { name: "Ã˜Â¨Ã˜Â§Ã™Æ’Ã™Å Ã˜Â¯Ã˜Â¬ Ã˜Â¹Ã˜Â±Ã™Å Ã˜Â³ Ã˜Â®Ã˜Â§Ã˜Â±Ã˜Â¬ Ã˜Â§Ã™â€žÃ™ÂÃ˜Â±Ã˜Â¹", price: 1500 }
    ];
    let availableServices = defaultServices.map(service => ({ ...service }));

    let cart = [];
    const twoServiceHairOfferPrice = 150;
    const threeServiceHairOfferPrice = 170;
    const fourServiceHairOfferPrice = 200;
    const fiveOrMoreHairOfferPrice = 230;
    const premiumOfferExtra = 30;
    const mainHairServiceName = "Ø´Ø¹Ø±";
    const hairOfferExcludedServices = new Set([
      "Ã˜Â´Ã˜Â¹Ã˜Â± Ã˜Â·Ã™ÂÃ™â€ž",
      "Ã˜ÂµÃ˜Â¨Ã˜ÂºÃ˜Â© Ã˜Â´Ã˜Â¹Ã˜Â±",
      "Ã˜ÂµÃ˜Â¨Ã˜ÂºÃ˜Â© Ã˜Â¯Ã™â€šÃ™â€ ",
      "Ã™â€¦Ã˜Â¹Ã˜Â§Ã™â€žÃ˜Â¬ TCB",
      "Ã˜Â¬Ã™â€žÃ˜Â³Ã˜Â© Ã˜Â¨Ã˜Â´Ã˜Â±Ã˜Â© Ã˜Â¹Ã˜Â§Ã˜Â¯Ã™Å Ã˜Â©",
      "Ã˜Â¬Ã™â€žÃ˜Â³Ã˜Â© Ã˜Â¨Ã˜Â´Ã˜Â±Ã˜Â© Ã™â€žÃ™Å Ã˜Â²Ã˜Â±",
      "Ã˜Â¨Ã˜Â±Ã™Ë†Ã˜ÂªÃ™Å Ã™â€  CHI",
      "Ã˜Â¨Ã˜Â±Ã™Ë†Ã˜ÂªÃ™Å Ã™â€  Ã˜Â¨Ã˜Â±Ã˜Â§Ã˜Â²Ã™Å Ã™â€žÃ™Å ",
      "Ã˜ÂµÃ˜Â¨Ã˜ÂºÃ˜Â© Ã˜Â³Ã˜Â¨Ã™â€žÃ™ÂÃ˜Â±",
      "Ã˜Â¨Ã˜Â§Ã™Æ’Ã™Å Ã˜ÂªÃ˜Â¬ Ã˜Â¹Ã˜Â±Ã™Å Ã˜Â³ Ã˜Â¯Ã˜Â§Ã˜Â®Ã™â€ž Ã˜Â§Ã™â€žÃ™ÂÃ˜Â±Ã˜Â¹",
      "Ã˜Â¨Ã˜Â§Ã™Æ’Ã™Å Ã˜Â¯Ã˜Â¬ Ã˜Â¹Ã˜Â±Ã™Å Ã˜Â³ Ã˜Â®Ã˜Â§Ã˜Â±Ã˜Â¬ Ã˜Â§Ã™â€žÃ™ÂÃ˜Â±Ã˜Â¹"
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
      "Ã˜Â´Ã˜Â¹Ã˜Â± Ã˜Â·Ã™ÂÃ™â€ž",
      "Ã˜ÂµÃ˜Â¨Ã˜ÂºÃ˜Â© Ã˜Â´Ã˜Â¹Ã˜Â±",
      "Ã˜ÂµÃ˜Â¨Ã˜ÂºÃ˜Â© Ã˜Â¯Ã™â€šÃ™â€ ",
      "Ã™â€¦Ã˜Â¹Ã˜Â§Ã™â€žÃ˜Â¬ TCB",
      "Ã˜Â¬Ã™â€žÃ˜Â³Ã˜Â© Ã˜Â¨Ã˜Â´Ã˜Â±Ã˜Â© Ã˜Â¹Ã˜Â§Ã˜Â¯Ã™Å Ã˜Â©",
      "Ã˜Â¬Ã™â€žÃ˜Â³Ã˜Â© Ã˜Â¨Ã˜Â´Ã˜Â±Ã˜Â© Ã™â€žÃ™Å Ã˜Â²Ã˜Â±",
      "Ã˜Â¨Ã˜Â±Ã™Ë†Ã˜ÂªÃ™Å Ã™â€  CHI",
      "Ã˜Â¨Ã˜Â±Ã™Ë†Ã˜ÂªÃ™Å Ã™â€  Ã˜Â¨Ã˜Â±Ã˜Â§Ã˜Â²Ã™Å Ã™â€žÃ™Å ",
      "Ã˜ÂµÃ˜Â¨Ã˜ÂºÃ˜Â© Ã˜Â³Ã˜Â¨Ã™â€žÃ™ÂÃ˜Â±",
      "Ã˜Â¨Ã˜Â§Ã™Æ’Ã™Å Ã˜ÂªÃ˜Â¬ Ã˜Â¹Ã˜Â±Ã™Å Ã˜Â³ Ã˜Â¯Ã˜Â§Ã˜Â®Ã™â€ž Ã˜Â§Ã™â€žÃ™ÂÃ˜Â±Ã˜Â¹",
      "Ã˜Â¨Ã˜Â§Ã™Æ’Ã™Å Ã˜Â¯Ã˜Â¬ Ã˜Â¹Ã˜Â±Ã™Å Ã˜Â³ Ã˜Â®Ã˜Â§Ã˜Â±Ã˜Â¬ Ã˜Â§Ã™â€žÃ™ÂÃ˜Â±Ã˜Â¹"
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
    let barberStaffList = null;
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
      if (Array.isArray(barberStaffList) && barberStaffList.length) {
        return barberStaffList;
      }

      const storedStaff = getStoredList(STAFF_STORAGE_KEY)
        .filter(staff => staff && String(staff.name || "").trim());

      return storedStaff.length
        ? storedStaff
        : DEFAULT_BARBER_STAFF.map(staff => ({ ...staff }));
    }

    function normalizeStaffForBarbers(staff, index = 0) {
      return {
        id: staff.id || staff.staffId || `staff-${index}`,
        name: String(staff.name || staff.staffName || "").trim(),
        code: String(staff.code || staff.staffCode || "").trim().toUpperCase(),
        isBarber: staff.isBarber !== false
      };
    }

    async function loadBarbersFromSheet() {
      try {
        const data = await RomeoApi.request({ action: "getStaff" });
        if (data.status !== "success" || !Array.isArray(data.staff)) {
          return;
        }

        const sheetStaff = data.staff
          .map(normalizeStaffForBarbers)
          .filter(staff => staff.name && staff.isBarber !== false);

        if (!sheetStaff.length) {
          return;
        }

        barberStaffList = sheetStaff;
        localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(sheetStaff));
        renderBarberOptions();
      } catch (error) {
        console.warn("Staff sheet sync is not available yet.", error);
      }
    }

    function getBarberSheetName(staff) {
      const code = String(staff.code || "").trim().toUpperCase();
      const fallback = String(staff.name || "").trim().toUpperCase();
      return BARBER_NAMES_BY_CODE[code] || fallback;
    }

    function renderBarberOptions() {
      const currentValue = barberSelect.value;
      const staffList = getStoredStaffForBarbers();

      barberSelect.innerHTML = '<option value="">Ã˜Â§Ã˜Â®Ã˜ÂªÃ˜Â± Ã˜Â§Ã™â€žÃ˜Â­Ã™â€žÃ˜Â§Ã™â€š</option>';
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
        const loadingText = localizeText("Ã˜Â¬Ã˜Â§Ã˜Â±Ã™Å  Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã™â€¦Ã™Å Ã™â€ž...", "Loading...");
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
          cash: firstNumberValue(data.cashTotal, data.cash, data.cashTodayTotal, data.naqdTotal, data["Ã™â€ Ã™â€šÃ˜Â¯Ã™Å "]),
          instapay: firstNumberValue(data.instapayTotal, data.instapay, data.instapayTodayTotal, data["Ã˜Â§Ã™â€ Ã˜Â³Ã˜ÂªÃ˜Â§ Ã˜Â¨Ã˜Â§Ã™Å "]),
          vodafoneCash: firstNumberValue(data.vodafoneCashTotal, data.vodafoneCash, data.vodafoneTotal, data["Ã™ÂÃ™Ë†Ã˜Â¯Ã˜Â§Ã™ÂÃ™Ë†Ã™â€  Ã™Æ’Ã˜Â§Ã˜Â´"]),
          visa: firstNumberValue(data.visaTotal, data.visa, data.visaTodayTotal, data["Ã™ÂÃ™Å Ã˜Â²Ã˜Â§"])
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
      return getSelectedOfferType() === "Ã˜Â¨Ã˜Â±Ã™Å Ã™â€¦Ã™Å Ã™Ë†Ã™â€¦" ? premiumOfferExtra : 0;
    }

    function getSelectedOfferType() {
      const selected = document.querySelector('input[name="offerType"]:checked');
      return selected ? selected.value : "Ã˜Â¹Ã˜Â§Ã˜Â¯Ã™Å ";
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
      const hasMainHairService = eligibleItems.some(item => normalizeServiceName(item.name) === mainHairServiceName);
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
          throw new Error(errorText || `Ã˜Â®Ã˜Â·Ã˜Â£ Ã™ÂÃ™Å  Ã˜ÂªÃ˜Â­Ã™â€¦Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€¦Ã™â€žÃ˜Â§Ã˜Â¡ (${response.status})`);
        }

        const data = await response.json();
        if (data.status !== "success") {
          throw new Error(data.message || "Ã˜ÂªÃ˜Â¹Ã˜Â°Ã˜Â± Ã˜ÂªÃ˜Â­Ã™â€¦Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€¦Ã™â€žÃ˜Â§Ã˜Â¡");
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
        showCustomerSuggestionMessage(error.message || "Ã˜ÂªÃ˜Â¹Ã˜Â°Ã˜Â± Ã˜ÂªÃ˜Â­Ã™â€¦Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€¦Ã™â€žÃ˜Â§Ã˜Â¡");
      } finally {
        customersLoading = false;
      }
    }

    async function fetchTodaySales() {
      try {
        todaySalesAmount.textContent = "Ã˜Â¬Ã˜Â§Ã˜Â±Ã™Å  Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã™â€¦Ã™Å Ã™â€ž...";
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
        showCustomerSuggestionMessage("Ã™â€žÃ˜Â§ Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã™â€ Ã˜ÂªÃ˜Â§Ã˜Â¦Ã˜Â¬ Ã™â€¦Ã˜Â´Ã˜Â§Ã˜Â¨Ã™â€¡Ã˜Â©");
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
        showCustomerSuggestionMessage("Ã˜Â¬Ã˜Â§Ã˜Â±Ã™Å  Ã˜ÂªÃ˜Â­Ã™â€¦Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€¦Ã™â€žÃ˜Â§Ã˜Â¡...");
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
        showStatus("Ã™â€žÃ™Å Ã˜Â³ Ã™â€žÃ˜Â¯Ã™Å Ã™Æ’ Ã˜ÂµÃ™â€žÃ˜Â§Ã˜Â­Ã™Å Ã˜Â© Ã™â€žÃ˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â£Ã˜Â³Ã˜Â¹Ã˜Â§Ã˜Â±.", "error");
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
              <button class="danger-btn" type="button" onclick="deleteServiceFromMenu(${index})">Ã˜Â­Ã˜Â°Ã™Â</button>
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
        showStatus("Ã˜Â§Ã™Æ’Ã˜ÂªÃ˜Â¨ Ã˜Â§Ã˜Â³Ã™â€¦ Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â¯Ã™â€¦Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯Ã˜Â© Ã˜Â£Ã™Ë†Ã™â€žÃ˜Â§Ã™â€¹.", "error");
        return;
      }

      if (availableServices.some(service => service.name === name)) {
        showStatus("Ã™â€¡Ã˜Â°Ã™â€¡ Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â¯Ã™â€¦Ã˜Â© Ã™â€¦Ã™Ë†Ã˜Â¬Ã™Ë†Ã˜Â¯Ã˜Â© Ã˜Â¨Ã˜Â§Ã™â€žÃ™ÂÃ˜Â¹Ã™â€ž.", "error");
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
          ? "Ã˜ÂªÃ™â€¦ Ã˜Â­Ã™ÂÃ˜Â¸ Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â¯Ã™â€¦Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯Ã˜Â© Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ˜Â´Ã™Å Ã˜Âª."
          : "Ã˜ÂªÃ™â€¦ Ã˜Â­Ã™ÂÃ˜Â¸ Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â¯Ã™â€¦Ã˜Â© Ã˜Â¹Ã™â€žÃ™â€° Ã™â€¡Ã˜Â°Ã˜Â§ Ã˜Â§Ã™â€žÃ˜Â¬Ã™â€¡Ã˜Â§Ã˜Â² Ã™ÂÃ™â€šÃ˜Â·Ã˜Å’ Ã™Ë†Ã™â€žÃ™â€¦ Ã™Å Ã˜ÂªÃ™â€¦ Ã˜Â­Ã™ÂÃ˜Â¸Ã™â€¡Ã˜Â§ Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ˜Â´Ã™Å Ã˜Âª.",
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
          ? "Ã˜ÂªÃ™â€¦ Ã˜Â­Ã™ÂÃ˜Â¸ Ã˜Â§Ã™â€žÃ˜Â£Ã˜Â³Ã˜Â¹Ã˜Â§Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯Ã˜Â© Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ˜Â´Ã™Å Ã˜Âª."
          : "Ã˜ÂªÃ™â€¦ Ã˜Â­Ã™ÂÃ˜Â¸ Ã˜Â§Ã™â€žÃ˜Â£Ã˜Â³Ã˜Â¹Ã˜Â§Ã˜Â± Ã˜Â¹Ã™â€žÃ™â€° Ã™â€¡Ã˜Â°Ã˜Â§ Ã˜Â§Ã™â€žÃ˜Â¬Ã™â€¡Ã˜Â§Ã˜Â² Ã™ÂÃ™â€šÃ˜Â·Ã˜Å’ Ã™Ë†Ã™â€žÃ™â€¦ Ã™Å Ã˜ÂªÃ™â€¦ Ã˜Â­Ã™ÂÃ˜Â¸Ã™â€¡Ã˜Â§ Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ˜Â´Ã™Å Ã˜Âª.",
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
          ? "Ã˜ÂªÃ™â€¦ Ã˜Â§Ã˜Â³Ã˜ÂªÃ˜Â±Ã˜Â¬Ã˜Â§Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â£Ã˜Â³Ã˜Â¹Ã˜Â§Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â£Ã˜ÂµÃ™â€žÃ™Å Ã˜Â© Ã™Ë†Ã˜Â­Ã™ÂÃ˜Â¸Ã™â€¡Ã˜Â§ Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ˜Â´Ã™Å Ã˜Âª."
          : "Ã˜ÂªÃ™â€¦ Ã˜Â§Ã˜Â³Ã˜ÂªÃ˜Â±Ã˜Â¬Ã˜Â§Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â£Ã˜Â³Ã˜Â¹Ã˜Â§Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â£Ã˜ÂµÃ™â€žÃ™Å Ã˜Â© Ã˜Â¹Ã™â€žÃ™â€° Ã™â€¡Ã˜Â°Ã˜Â§ Ã˜Â§Ã™â€žÃ˜Â¬Ã™â€¡Ã˜Â§Ã˜Â² Ã™ÂÃ™â€šÃ˜Â·Ã˜Å’ Ã™Ë†Ã™â€žÃ™â€¦ Ã™Å Ã˜ÂªÃ™â€¦ Ã˜Â­Ã™ÂÃ˜Â¸Ã™â€¡Ã˜Â§ Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ˜Â´Ã™Å Ã˜Âª.",
        savedToSheet ? "success" : "error"
      );
    }

    window.deleteServiceFromMenu = async index => {
      const service = availableServices[index];
      if (!service) {
        return;
      }

      if (!window.confirm(`Ã™â€¡Ã™â€ž Ã˜ÂªÃ˜Â±Ã™Å Ã˜Â¯ Ã˜Â­Ã˜Â°Ã™Â Ã˜Â®Ã˜Â¯Ã™â€¦Ã˜Â© ${service.name}Ã˜Å¸`)) {
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
          ? "Ã˜ÂªÃ™â€¦ Ã˜Â­Ã˜Â°Ã™Â Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â¯Ã™â€¦Ã˜Â© Ã™Ë†Ã˜Â­Ã™ÂÃ˜Â¸ Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€ž Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ˜Â´Ã™Å Ã˜Âª."
          : "Ã˜ÂªÃ™â€¦ Ã˜Â­Ã˜Â°Ã™Â Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â¯Ã™â€¦Ã˜Â© Ã˜Â¹Ã™â€žÃ™â€° Ã™â€¡Ã˜Â°Ã˜Â§ Ã˜Â§Ã™â€žÃ˜Â¬Ã™â€¡Ã˜Â§Ã˜Â² Ã™ÂÃ™â€šÃ˜Â·Ã˜Å’ Ã™Ë†Ã™â€žÃ™â€¦ Ã™Å Ã˜ÂªÃ™â€¦ Ã˜Â­Ã™ÂÃ˜Â¸ Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€ž Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ˜Â´Ã™Å Ã˜Âª.",
        savedToSheet ? "success" : "error"
      );
    };

    function setLoadingState(isLoading) {
      completeSaleBtn.disabled = isLoading;
      printBtn.disabled = isLoading;
      clearBtn.disabled = isLoading;
      completeSaleBtn.textContent = isLoading ? "Ã˜Â¬Ã˜Â§Ã˜Â±Ã™Å  Ã˜Â§Ã™â€žÃ˜Â­Ã™ÂÃ˜Â¸..." : "Ã˜Â¥Ã˜ÂªÃ™â€¦Ã˜Â§Ã™â€¦ Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨";

      if (isLoading) {
        showStatus("Loading... Ã˜Â¬Ã˜Â§Ã˜Â±Ã™Å  Ã˜Â­Ã™ÂÃ˜Â¸ Ã˜Â§Ã™â€žÃ™ÂÃ˜Â§Ã˜ÂªÃ™Ë†Ã˜Â±Ã˜Â© Ã™Ë†Ã˜Â§Ã™â€ Ã˜ÂªÃ˜Â¸Ã˜Â§Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â±Ã˜Â¯ Ã™â€¦Ã™â€  Google Sheets", "loading");
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
        cartItems.innerHTML = `<div class="empty-state">${localizeText("Ã™â€žÃ™â€¦ Ã™Å Ã˜ÂªÃ™â€¦ Ã˜Â§Ã˜Â®Ã˜ÂªÃ™Å Ã˜Â§Ã˜Â± Ã˜Â£Ã™Å  Ã˜Â®Ã˜Â¯Ã™â€¦Ã˜Â© Ã˜Â­Ã˜ÂªÃ™â€° Ã˜Â§Ã™â€žÃ˜Â¢Ã™â€ .", "No service has been selected yet.")}</div>`;
      } else {
        cartItems.innerHTML = cart
          .map(
            (item, index) => `
              <div class="cart-item">
                <button class="remove-btn" type="button" onclick="removeService(${index})">X</button>
                <div>
                  <strong>${item.name}</strong>
                  <small>Ã˜Â§Ã˜Â³Ã™â€¦ Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€¦Ã™Å Ã™â€ž? Ã˜Â§Ã˜Â³Ã™â€¦ Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€¦Ã™Å Ã™â€ž</small>
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
          ? `ØªÙ… ØªØ·Ø¨ÙŠÙ‚ Ø¹Ø±Ø¶ Ø§Ù„Ø®Ø¯Ù…ØªÙŠÙ† Ø¹Ù„Ù‰ ${eligibleItems.length} Ø®Ø¯Ù…Ø§Øª Ù…Ø·Ø§Ø¨Ù‚Ø© = 150 Ø¬Ù†ÙŠÙ‡`
          : "ØªÙ… ØªØ·Ø¨ÙŠÙ‚ Ø¹Ø±Ø¶ Ø§Ù„Ø®Ø¯Ù…ØªÙŠÙ†: Ø´Ø¹Ø± + Ø®Ø¯Ù…Ø© Ø«Ø§Ù†ÙŠØ© = 150 Ø¬Ù†ÙŠÙ‡";
        offerBadge.className = "offer-badge active";
      } else if (offerType === "three-services") {
        offerBadge.textContent = excludedItems.length > 0
          ? `ØªÙ… ØªØ·Ø¨ÙŠÙ‚ Ø¹Ø±Ø¶ 3 Ø®Ø¯Ù…Ø§Øª Ø¹Ù„Ù‰ ${eligibleItems.length} Ø®Ø¯Ù…Ø§Øª Ù…Ø·Ø§Ø¨Ù‚Ø© = 170 Ø¬Ù†ÙŠÙ‡`
          : "ØªÙ… ØªØ·Ø¨ÙŠÙ‚ Ø¹Ø±Ø¶ Ø§Ù„Ø«Ù„Ø§Ø« Ø®Ø¯Ù…Ø§Øª: Ø´Ø¹Ø± + Ø®Ø¯Ù…ØªÙŠÙ† = 170 Ø¬Ù†ÙŠÙ‡";
        offerBadge.className = "offer-badge active";
      } else if (offerType === "four-services") {
        offerBadge.textContent = excludedItems.length > 0
          ? `ØªÙ… ØªØ·Ø¨ÙŠÙ‚ Ø¹Ø±Ø¶ 4 Ø®Ø¯Ù…Ø§Øª Ø¹Ù„Ù‰ ${eligibleItems.length} Ø®Ø¯Ù…Ø§Øª Ù…Ø·Ø§Ø¨Ù‚Ø© = 200 Ø¬Ù†ÙŠÙ‡`
          : "ØªÙ… ØªØ·Ø¨ÙŠÙ‚ Ø¹Ø±Ø¶ Ø§Ù„Ø£Ø±Ø¨Ø¹ Ø®Ø¯Ù…Ø§Øª: Ø´Ø¹Ø± + 3 Ø®Ø¯Ù…Ø§Øª = 200 Ø¬Ù†ÙŠÙ‡";
        offerBadge.className = "offer-badge active";
      } else if (offerType === "five-or-more-services") {
        offerBadge.textContent = excludedItems.length > 0
          ? `ØªÙ… ØªØ·Ø¨ÙŠÙ‚ Ø¹Ø±Ø¶ 5 Ø®Ø¯Ù…Ø§Øª Ø£Ùˆ Ø£ÙƒØ«Ø± Ø¹Ù„Ù‰ ${eligibleItems.length} Ø®Ø¯Ù…Ø§Øª Ù…Ø·Ø§Ø¨Ù‚Ø© = 230 Ø¬Ù†ÙŠÙ‡`
          : "ØªÙ… ØªØ·Ø¨ÙŠÙ‚ Ø¹Ø±Ø¶ 5 Ø®Ø¯Ù…Ø§Øª Ø£Ùˆ Ø£ÙƒØ«Ø±: Ø´Ø¹Ø± + 4 Ø®Ø¯Ù…Ø§Øª Ø£Ùˆ Ø£ÙƒØ«Ø± = 230 Ø¬Ù†ÙŠÙ‡";
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
        throw new Error(result.message || "ØªØ¹Ø°Ø± Ø­ÙØ¸ Ø§Ù„ÙØ§ØªÙˆØ±Ø©.");
      }

      return result;
    }

    function escapePrintHtml(value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function printInvoice(invoice) {
      const invoiceFrame = document.createElement("iframe");
      invoiceFrame.setAttribute("title", "invoice-print");
      invoiceFrame.style.position = "fixed";
      invoiceFrame.style.right = "0";
      invoiceFrame.style.bottom = "0";
      invoiceFrame.style.width = "0";
      invoiceFrame.style.height = "0";
      invoiceFrame.style.border = "0";
      invoiceFrame.style.opacity = "0";
      invoiceFrame.style.pointerEvents = "none";
      document.body.appendChild(invoiceFrame);

      const invoiceWindow = invoiceFrame.contentWindow;
      if (!invoiceWindow) {
        invoiceFrame.remove();
        alert("ØªØ¹Ø°Ø± ØªØ¬Ù‡ÙŠØ² Ø§Ù„Ø·Ø¨Ø§Ø¹Ø©. Ø­Ø§ÙˆÙ„ Ù…Ø±Ø© Ø£Ø®Ø±Ù‰.");
        return;
      }

      const customerName = invoice.customerName || "ØºÙŠØ± Ù…Ø³Ø¬Ù„";
      const customerPhone = invoice.customerPhone || "ØºÙŠØ± Ù…Ø³Ø¬Ù„";
      const barber = invoice.barber || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯";
      const offerType = invoice.offerType || "Ø¹Ø§Ø¯ÙŠ";
      const paymentMethod = invoice.paymentMethod || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯";
      const printedAt = new Date().toLocaleString("ar-EG", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
      const itemsRows = invoice.items.map((item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${escapePrintHtml(item.name)}</td>
              <td>${escapePrintHtml(formatCurrency(item.price))}</td>
            </tr>
          `).join("");

      invoiceWindow.document.write(`
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>SALONIX Invoice</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 18px;
              color: #2a2118;
              background: #fff;
              font-family: Arial, "Tahoma", sans-serif;
              direction: rtl;
            }
            .invoice {
              width: 100%;
              max-width: 420px;
              margin: 0 auto;
              border: 1px solid #e4d4bd;
              border-radius: 18px;
              overflow: hidden;
            }
            .header {
              padding: 22px 18px;
              background: #3b2412;
              color: #fff;
              text-align: center;
            }
            .print-logo {
              width: 64px;
              height: 64px;
              margin: 0 auto 12px;
              display: block;
              filter: drop-shadow(0 10px 18px rgba(0,0,0,.22));
            }
            .brand {
              margin: 0;
              font-size: 24px;
              letter-spacing: 4px;
            }
            .subtitle {
              margin: 8px 0 0;
              font-size: 14px;
              letter-spacing: 1.5px;
              text-transform: uppercase;
              color: #ead9c1;
            }
            .content { padding: 18px; }
            .meta {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              margin-bottom: 16px;
            }
            .meta-box {
              padding: 10px 12px;
              border: 1px solid #ead9c1;
              border-radius: 12px;
              background: #fffaf3;
            }
            .label {
              display: block;
              margin-bottom: 4px;
              color: #806b58;
              font-size: 12px;
              font-weight: 700;
            }
            .value {
              font-size: 14px;
              font-weight: 800;
              word-break: break-word;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 12px 0 16px;
              overflow: hidden;
              border-radius: 12px;
            }
            th, td {
              padding: 10px 8px;
              border-bottom: 1px solid #ead9c1;
              text-align: right;
              font-size: 13px;
            }
            th {
              background: #f1e2ca;
              color: #5b3a1d;
            }
            .summary {
              padding: 14px;
              border-radius: 14px;
              background: #18794e;
              color: #fff;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              margin-bottom: 8px;
              font-size: 14px;
            }
            .summary-row.total {
              margin: 0;
              padding-top: 8px;
              border-top: 1px solid rgba(255,255,255,.25);
              font-size: 20px;
              font-weight: 900;
            }
            .footer {
              padding: 14px 18px 18px;
              text-align: center;
              color: #806b58;
              font-size: 12px;
            }
            @media print {
              body { padding: 0; }
              .invoice { border: none; border-radius: 0; max-width: none; }
            }
          </style>
        </head>
        <body>
          <main class="invoice">
            <section class="header">
              <svg class="print-logo" viewBox="0 0 160 160" aria-hidden="true">
                <defs>
                  <linearGradient id="printSalonixGradient" x1="20" y1="20" x2="140" y2="140" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stop-color="#f2dfbd"></stop>
                    <stop offset="0.48" stop-color="#b7863f"></stop>
                    <stop offset="1" stop-color="#18794e"></stop>
                  </linearGradient>
                </defs>
                <rect width="160" height="160" rx="36" fill="#2a1b0f"></rect>
                <g fill="url(#printSalonixGradient)">
                  <path d="M80 14c23 0 41 12 50 28 8 15 5 31-6 45 1-22-11-41-31-48-18-7-37-2-53 13C48 29 62 14 80 14Z"></path>
                  <path d="M146 80c0 23-12 41-28 50-15 8-31 5-45-6 22 1 41-11 48-31 7-18 2-37-13-53 23 8 38 22 38 40Z"></path>
                  <path d="M80 146c-23 0-41-12-50-28-8-15-5-31 6-45-1 22 11 41 31 48 18 7 37 2 53-13-8 23-22 38-40 38Z"></path>
                  <path d="M14 80c0-23 12-41 28-50 15-8 31-5 45 6-22-1-41 11-48 31-7 18-2 37 13 53-23-8-38-22-38-40Z"></path>
                </g>
                <circle cx="80" cy="80" r="22" fill="#fffaf2"></circle>
              </svg>
              <h1 class="brand">SALONIX</h1>
              <p class="subtitle">THE SMART WAY TO RUN YOUR SALON</p>
            </section>

            <section class="content">
              <div class="meta">
                <div class="meta-box">
                  <span class="label">Ø§Ø³Ù… Ø§Ù„Ø¹Ù…ÙŠÙ„</span>
                  <span class="value">${escapePrintHtml(customerName)}</span>
                </div>
                <div class="meta-box">
                  <span class="label">Ø±Ù‚Ù… Ø§Ù„Ø¹Ù…ÙŠÙ„</span>
                  <span class="value">${escapePrintHtml(customerPhone)}</span>
                </div>
                <div class="meta-box">
                  <span class="label">Ø§Ù„Ø­Ù„Ø§Ù‚</span>
                  <span class="value">${escapePrintHtml(barber)}</span>
                </div>
                <div class="meta-box">
                  <span class="label">Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„Ø¯ÙØ¹</span>
                  <span class="value">${escapePrintHtml(paymentMethod)}</span>
                </div>
                <div class="meta-box">
                  <span class="label">Ù†ÙˆØ¹ Ø§Ù„Ø¹Ø±Ø¶</span>
                  <span class="value">${escapePrintHtml(offerType)}</span>
                </div>
                <div class="meta-box">
                  <span class="label">Ø§Ù„ØªØ§Ø±ÙŠØ®</span>
                  <span class="value">${escapePrintHtml(printedAt)}</span>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Ø§Ù„Ø®Ø¯Ù…Ø©</th>
                    <th>Ø§Ù„Ø³Ø¹Ø±</th>
                  </tr>
                </thead>
                <tbody>${itemsRows}</tbody>
              </table>

              <div class="summary">
                <div class="summary-row">
                  <span>Ø§Ù„Ù…Ø¯ÙÙˆØ¹</span>
                  <strong>${escapePrintHtml(formatCurrency(invoice.paidAmount))}</strong>
                </div>
                <div class="summary-row">
                  <span>Ø§Ù„Ø¨Ø§Ù‚ÙŠ</span>
                  <strong>${escapePrintHtml(formatCurrency(invoice.remainingAmount))}</strong>
                </div>
                <div class="summary-row total">
                  <span>Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</span>
                  <strong>${escapePrintHtml(formatCurrency(invoice.total))}</strong>
                </div>
              </div>
            </section>

            <footer class="footer">Ø´ÙƒØ±Ø§ Ù„Ø²ÙŠØ§Ø±ØªÙƒÙ…</footer>
          </main>
        </body>
        </html>
      `);

      invoiceWindow.document.close();
      invoiceWindow.focus();
      invoiceWindow.print();
      setTimeout(() => invoiceFrame.remove(), 1200);
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
        showStatus("Ã˜Â§Ã˜Â®Ã˜ÂªÃ˜Â± Ã˜Â®Ã˜Â¯Ã™â€¦Ã˜Â© Ã™Ë†Ã˜Â§Ã˜Â­Ã˜Â¯Ã˜Â© Ã˜Â¹Ã™â€žÃ™â€° Ã˜Â§Ã™â€žÃ˜Â£Ã™â€šÃ™â€ž Ã™â€šÃ˜Â¨Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â·Ã˜Â¨Ã˜Â§Ã˜Â¹Ã˜Â©.", "error");
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
        showStatus("Ã˜Â§Ã˜Â®Ã˜ÂªÃ˜Â± Ã˜Â®Ã˜Â¯Ã™â€¦Ã˜Â© Ã™Ë†Ã˜Â§Ã˜Â­Ã˜Â¯Ã˜Â© Ã˜Â¹Ã™â€žÃ™â€° Ã˜Â§Ã™â€žÃ˜Â£Ã™â€šÃ™â€ž Ã™â€šÃ˜Â¨Ã™â€ž Ã˜Â¥Ã˜ÂªÃ™â€¦Ã˜Â§Ã™â€¦ Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨.", "error");
        return;
      }

      if (!customerName) {
        showStatus("Ã˜Â§Ã™Æ’Ã˜ÂªÃ˜Â¨ Ã˜Â§Ã˜Â³Ã™â€¦ Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€¦Ã™Å Ã™â€ž Ã˜Â£Ã™Ë†Ã™â€žÃ˜Â§Ã™â€¹.", "error");
        return;
      }

      if (!customerPhone) {
        showStatus("Ã˜Â§Ã™Æ’Ã˜ÂªÃ˜Â¨ Ã˜Â±Ã™â€šÃ™â€¦ Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€¦Ã™Å Ã™â€ž Ã˜Â£Ã™Ë†Ã™â€žÃ˜Â§Ã™â€¹.", "error");
        return;
      }

      if (!barber) {
        showStatus("Ã˜Â§Ã˜Â®Ã˜ÂªÃ˜Â± Ã˜Â§Ã˜Â³Ã™â€¦ Ã˜Â§Ã™â€žÃ˜Â­Ã™â€žÃ˜Â§Ã™â€š Ã˜Â§Ã™â€žÃ˜Â°Ã™Å  Ã™â€šÃ˜Â¯Ã™â€¦ Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â¯Ã™â€¦Ã˜Â©.", "error");
        return;
      }

      if (paidAmount <= 0) {
        showStatus("Ã˜Â§Ã™Æ’Ã˜ÂªÃ˜Â¨ Ã™â€šÃ™Å Ã™â€¦Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¯Ã™ÂÃ™Ë†Ã˜Â¹ Ã™â€šÃ˜Â¨Ã™â€ž Ã˜Â­Ã™ÂÃ˜Â¸ Ã˜Â§Ã™â€žÃ™ÂÃ˜Â§Ã˜ÂªÃ™Ë†Ã˜Â±Ã˜Â©.", "error");
        return;
      }

      if (paidAmount < total) {
        showStatus("Ã™â€šÃ™Å Ã™â€¦Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¯Ã™ÂÃ™Ë†Ã˜Â¹ Ã™Å Ã˜Â¬Ã˜Â¨ Ã˜Â£Ã™â€  Ã˜ÂªÃ™Æ’Ã™Ë†Ã™â€  Ã˜Â£Ã™Æ’Ã˜Â¨Ã˜Â± Ã™â€¦Ã™â€  Ã˜Â£Ã™Ë† Ã˜ÂªÃ˜Â³Ã˜Â§Ã™Ë†Ã™Å  Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¬Ã™â€¦Ã˜Â§Ã™â€žÃ™Å .", "error");
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
        const shouldPrint = window.confirm("Ù‡Ù„ ØªØ±ÙŠØ¯ Ø·Ø¨Ø§Ø¹Ø© Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ø¢Ù†ØŸ");

        await saveInvoice(invoiceData);

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

        showStatus("Ã˜ÂªÃ™â€¦ Ã˜Â­Ã™ÂÃ˜Â¸ Ã˜Â§Ã™â€žÃ™ÂÃ˜Â§Ã˜ÂªÃ™Ë†Ã˜Â±Ã˜Â© Ã˜Â¨Ã™â€ Ã˜Â¬Ã˜Â§Ã˜Â­.", "success");
        resetForm();
        fetchTodaySales();
      } catch (error) {
        showStatus(error.message || "Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â®Ã˜Â·Ã˜Â£ Ã˜Â£Ã˜Â«Ã™â€ Ã˜Â§Ã˜Â¡ Ã˜Â­Ã™ÂÃ˜Â¸ Ã˜Â§Ã™â€žÃ™ÂÃ˜Â§Ã˜ÂªÃ™Ë†Ã˜Â±Ã˜Â©.", "error");
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
        barberStaffList = null;
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
    window.addEventListener("pageshow", () => {
      renderBarberOptions();
      loadBarbersFromSheet();
    });
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
    loadBarbersFromSheet();
    loadStoredServicePrices();
    renderServices();
    renderCart();
    loadServicesFromSheet();
    fetchTodaySales();
    fixArabicInNode(document.body);


