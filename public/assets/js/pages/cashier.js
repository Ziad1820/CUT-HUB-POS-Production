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
    const SERVICE_USAGE_STORAGE_KEY = "romeo-pos-service-usage";
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
    let availableProducts = [];
    let activeServiceFilter = "all";

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
    const normalizedMainHairServiceName = normalizeServiceName(mainHairServiceName);
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
    const serviceSearchInput = document.getElementById("serviceSearchInput");
    const serviceFilterTabs = document.getElementById("serviceFilterTabs");
    const servicesResultsText = document.getElementById("servicesResultsText");
    const cartPanel = document.getElementById("cartPanel");
    const reportDateInput = document.getElementById("reportDate");
    const cartItems = document.getElementById("cartItems");
    const totalAmount = document.getElementById("totalAmount");
    const serviceCount = document.getElementById("serviceCount");
    const discountPercentInput = document.getElementById("discountPercent");
    const discountSummaryRow = document.getElementById("discountSummaryRow");
    const discountAmountText = document.getElementById("discountAmountText");
    const offerBadge = document.getElementById("offerBadge");
    const customerNameInput = document.getElementById("customerName");
    const customerPhoneInput = document.getElementById("customerPhone");
    const customerSuggestions = document.getElementById("customerSuggestions");
    const paidAmountInput = document.getElementById("paidAmount");
    const tipAmountInput = document.getElementById("tipAmount");
    const remainingAmountInput = document.getElementById("remainingAmount");
    const invoiceNoteInput = document.getElementById("invoiceNote");
    const statusBox = document.getElementById("statusBox");
    const dailyNetCard = document.getElementById("dailyNetCard");
    const dailyNetAmount = document.getElementById("dailyNetAmount");
    const dailyNetBreakdown = document.getElementById("dailyNetBreakdown");
    const latestInvoicesTitle = document.getElementById("latestInvoicesTitle");
    const latestInvoicesList = document.getElementById("latestInvoicesList");
    const latestInvoiceModal = document.getElementById("latestInvoiceModal");
    const latestInvoiceModalTitle = document.getElementById("latestInvoiceModalTitle");
    const latestInvoiceDetails = document.getElementById("latestInvoiceDetails");
    const closeLatestInvoiceModalBtn = document.getElementById("closeLatestInvoiceModalBtn");
    const todaySalesAmount = document.getElementById("todaySalesAmount");
    const cashTodayTotal = document.getElementById("cashTodayTotal");
    const instapayTodayTotal = document.getElementById("instapayTodayTotal");
    const vodafoneTodayTotal = document.getElementById("vodafoneTodayTotal");
    const visaTodayTotal = document.getElementById("visaTodayTotal");
    const tipsTodayTotal = document.getElementById("tipsTodayTotal");
    const completeSaleBtn = document.getElementById("completeSaleBtn");
    const printBtn = document.getElementById("printBtn");
    const clearBtn = document.getElementById("clearBtn");
    const editPricesBtn = document.getElementById("editPricesBtn");
    const priceEditorModal = document.getElementById("priceEditorModal");
    const priceEditorList = document.getElementById("priceEditorList");
    const selectAllServicesForDelete = document.getElementById("selectAllServicesForDelete");
    const selectedServicesCount = document.getElementById("selectedServicesCount");
    const deleteSelectedServicesBtn = document.getElementById("deleteSelectedServicesBtn");
    const savePricesBtn = document.getElementById("savePricesBtn");
    const closePriceEditorBtn = document.getElementById("closePriceEditorBtn");
    const resetPricesBtn = document.getElementById("resetPricesBtn");
    const addServiceBtn = document.getElementById("addServiceBtn");
    const newServiceNameInput = document.getElementById("newServiceName");
    const newServicePriceInput = document.getElementById("newServicePrice");
    const quickBookingLink = document.getElementById("quickBookingLink");
    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const logoutBtn = document.getElementById("logoutBtn");
    const barberSelect = document.getElementById("barber");
    let customerDirectory = [];
    let customersLoaded = false;
    let customersLoading = false;
    let latestTodaySales = 0;
    let latestTodayTips = 0;
    let latestPaymentTotals = {};
    let latestTodayExpenses = 0;
    let selectedServiceNames = new Set();
    let latestTodayWithdrawals = 0;
    let invoiceSubmitInProgress = false;
    const STAFF_STORAGE_KEY = "romeo-pos-staff-accounting-v2";
    const LATEST_INVOICES_STORAGE_KEY = "romeo-pos-latest-invoices";
    const INVOICE_SUBMIT_LOCK_KEY = "romeo-pos-invoice-submit-lock";
    const INVOICE_SUBMIT_LOCK_TTL = 2 * 60 * 1000;
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
    let latestInvoices = [];
    let activeLatestInvoice = null;
    fixArabicInNode(document.body);

    function getCurrentPageLanguage() {
      const storedLanguage = localStorage.getItem("romeo-pos-language");
      if (storedLanguage === "en" || storedLanguage === "ar") return storedLanguage;

      const romeoLanguage = window.RomeoLanguage?.getCurrentLanguage?.();
      if (romeoLanguage) return romeoLanguage;

      if (document.documentElement.lang === "en" || document.documentElement.dir === "ltr" || document.body.dir === "ltr") {
        return "en";
      }

      return "ar";
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

    function escapeHtml(value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
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

    function getInvoiceFingerprint(invoice) {
      return JSON.stringify({
        date: invoice.dateKey || invoice.reportDate || invoice.date || "",
        customerName: normalizeServiceName(invoice.customerName || invoice.customer || "").toLowerCase(),
        customerPhone: String(invoice.customerPhone || "").replace(/\D/g, ""),
        services: normalizeServiceName(invoice.services || ""),
        total: numberValue(invoice.total),
        discountPercent: numberValue(invoice.discountPercent),
        discountAmount: numberValue(invoice.discountAmount),
        paidAmount: numberValue(invoice.paidAmount),
        tipAmount: numberValue(invoice.tipAmount),
        paymentMethod: normalizeServiceName(invoice.paymentMethod || invoice.payment || ""),
        barber: normalizeServiceName(invoice.barber || ""),
        offerType: normalizeServiceName(invoice.offerType || "")
      });
    }

    function readInvoiceSubmitLock() {
      try {
        return JSON.parse(localStorage.getItem(INVOICE_SUBMIT_LOCK_KEY) || "null");
      } catch (error) {
        localStorage.removeItem(INVOICE_SUBMIT_LOCK_KEY);
        return null;
      }
    }

    function getActiveInvoiceSubmitLock(fingerprint) {
      const lock = readInvoiceSubmitLock();
      if (!lock || lock.fingerprint !== fingerprint) {
        return null;
      }

      const lockAge = Date.now() - Number(lock.createdAt || 0);
      if (lockAge > INVOICE_SUBMIT_LOCK_TTL) {
        localStorage.removeItem(INVOICE_SUBMIT_LOCK_KEY);
        return null;
      }

      return lock;
    }

    function createInvoiceSubmitLock(fingerprint) {
      const lock = {
        fingerprint,
        requestId: `invoice-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        createdAt: Date.now()
      };
      localStorage.setItem(INVOICE_SUBMIT_LOCK_KEY, JSON.stringify(lock));
      return lock;
    }

    function clearInvoiceSubmitLock(lock) {
      const currentLock = readInvoiceSubmitLock();
      if (!lock || !currentLock || currentLock.requestId === lock.requestId) {
        localStorage.removeItem(INVOICE_SUBMIT_LOCK_KEY);
      }
    }

    function shouldKeepInvoiceLock(error) {
      const message = String(error?.message || error || "").toLowerCase();
      return /network|fetch|internet|connection|offline|timeout|اتصال|إنترنت|انترنت/.test(message);
    }

    function getInvoiceDateLabel(invoice) {
      const rawDate = invoice.dateKey || invoice.reportDate || invoice.date || invoice.createdAt || "";
      const text = String(rawDate || "").trim();
      const match = text.match(/(\d{4})-(\d{2})-(\d{2})/);
      return match ? match[0] : (text || "-");
    }

    function normalizeLatestInvoice(invoice) {
      return {
        invoiceId: invoice.invoiceId || invoice.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        rowNumber: invoice.rowNumber || "",
        date: getInvoiceDateLabel(invoice),
        dateKey: invoice.dateKey || invoice.reportDate || invoice.date || "",
        customerName: invoice.customerName || invoice.customer || "-",
        customerPhone: invoice.customerPhone || invoice.phone || "-",
        barber: invoice.barber || "-",
        services: invoice.services || (Array.isArray(invoice.items) ? invoice.items.map(item => item.name).join(", ") : "-"),
        paymentMethod: invoice.paymentMethod || invoice.payment || "-",
        total: numberValue(invoice.total),
        discountPercent: numberValue(invoice.discountPercent),
        discountAmount: numberValue(invoice.discountAmount),
        paidAmount: numberValue(invoice.paidAmount || invoice.total),
        tipAmount: numberValue(invoice.tipAmount),
        note: invoice.note || invoice.invoiceNote || "",
        pdfUrl: invoice.pdfUrl || ""
      };
    }

    function saveLatestInvoicesToStorage() {
      localStorage.setItem(LATEST_INVOICES_STORAGE_KEY, JSON.stringify(latestInvoices.slice(0, 5)));
    }

    function renderLatestInvoices() {
      if (!latestInvoicesTitle || !latestInvoicesList) {
        return;
      }

      latestInvoicesTitle.textContent = localizeText("آخر 5 فواتير", "Latest 5 Invoices");

      if (!latestInvoices.length) {
        latestInvoicesList.innerHTML = `
          <div class="latest-invoices-empty">
            ${localizeText("لا توجد فواتير حديثة حتى الآن.", "No recent invoices yet.")}
          </div>
        `;
        return;
      }

      latestInvoicesList.innerHTML = latestInvoices.slice(0, 5).map(invoice => `
        <article class="latest-invoice-row">
          <div>
            <span>${localizeText("التاريخ", "Date")}</span>
            <strong>${escapeHtml(invoice.date || "-")}</strong>
          </div>
          <div>
            <span>${localizeText("العميل", "Customer")}</span>
            <strong>${escapeHtml(invoice.customerName || "-")}</strong>
          </div>
          <div>
            <span>${localizeText("الموظف", "Employee")}</span>
            <strong>${escapeHtml(invoice.barber || "-")}</strong>
          </div>
          <div>
            <span>${localizeText("الخدمة", "Service")}</span>
            <strong>${escapeHtml(invoice.services || "-")}</strong>
          </div>
          <div>
            <span>${localizeText("الدفع", "Payment")}</span>
            <strong>${escapeHtml(invoice.paymentMethod || "-")}</strong>
          </div>
          <div class="latest-invoice-total">
            <span>${localizeText("الإجمالي", "Total")}</span>
            <strong>${escapeHtml(formatCurrency(invoice.total))}</strong>
          </div>
          <div>
            <button type="button" class="mini-btn dark" data-latest-invoice-id="${escapeHtml(invoice.invoiceId)}">
              ${localizeText("عرض", "View")}
            </button>
          </div>
        </article>
      `).join("");

      fixArabicInNode(latestInvoicesList);
    }

    function findLatestInvoice(invoiceId) {
      return latestInvoices.find(invoice => String(invoice.invoiceId) === String(invoiceId));
    }

    function canEditLatestInvoice(invoice) {
      return Boolean(invoice && invoice.invoiceId && invoice.rowNumber);
    }

    function getLatestInvoiceDateInput(invoice) {
      const match = String(invoice.dateKey || invoice.date || "").match(/(\d{4})-(\d{2})-(\d{2})/);
      return match ? match[0] : "";
    }

    function getLatestInvoiceBarberOptions(selectedValue) {
      const selected = String(selectedValue || "").trim();
      const options = [];
      const seen = new Set();

      function addOption(value, label) {
        const optionValue = String(value || "").trim();
        const optionLabel = String(label || value || "").trim();
        if (!optionValue || seen.has(optionValue.toLowerCase())) return;
        seen.add(optionValue.toLowerCase());
        options.push({ value: optionValue, label: optionLabel });
      }

      getStoredStaffForBarbers().forEach(staff => {
        addOption(getBarberSheetName(staff), staff.name);
      });

      if (selected) {
        addOption(selected, selected);
      }

      return [
        `<option value="">${escapeHtml(localizeText("اختر الموظف", "Choose employee"))}</option>`,
        ...options.map(option =>
          `<option value="${escapeHtml(option.value)}" ${option.value === selected ? "selected" : ""}>${escapeHtml(option.label)}</option>`
        )
      ].join("");
    }

    function getPaymentOptions(selectedValue) {
      const payments = ["نقدي", "انستا باي", "فودافون كاش", "فيزا"];
      const current = String(selectedValue || "").trim();
      const options = current && !payments.includes(current) ? [current, ...payments] : payments;

      return options.map(value =>
        `<option value="${escapeHtml(value)}" ${value === current ? "selected" : ""}>${escapeHtml(value)}</option>`
      ).join("");
    }

    function getDetailValue(id) {
      return document.getElementById(id)?.value?.trim() || "";
    }

    function setLatestInvoiceModalStatus(message, type = "") {
      const status = document.getElementById("latestInvoiceModalStatus");
      if (!status) return;
      status.textContent = message || "";
      status.className = `modal-status ${type}`.trim();
    }

    function renderLatestInvoiceDetails(invoice, editMode = false) {
      if (!latestInvoiceDetails) return;

      latestInvoiceModalTitle.textContent = localizeText("تفاصيل الفاتورة", "Invoice Details");
      const dateLabel = localizeText("التاريخ", "Date");
      const totalLabel = localizeText("الإجمالي", "Total");
      const customerLabel = localizeText("اسم العميل", "Customer Name");
      const phoneLabel = localizeText("رقم الهاتف", "Phone");
      const employeeLabel = localizeText("الموظف", "Employee");
      const paymentLabel = localizeText("طريقة الدفع", "Payment Method");
      const paidLabel = localizeText("المدفوع", "Paid Amount");
      const tipLabel = localizeText("مبلغ التيب", "Tip Amount");
      const discountLabel = localizeText("الخصم", "Discount");
      const servicesLabel = localizeText("الخدمات", "Services");
      const noteLabel = localizeText("الملاحظة", "Note");

      latestInvoiceDetails.innerHTML = editMode ? `
        <div class="detail-item"><span>${dateLabel}</span><input class="detail-input" id="latestEditInvoiceDate" type="date" value="${escapeHtml(getLatestInvoiceDateInput(invoice))}"></div>
        <div class="detail-item"><span>${totalLabel}</span><input class="detail-input" id="latestEditInvoiceTotal" type="number" min="0" step="1" value="${escapeHtml(invoice.total)}"></div>
        <div class="detail-item"><span>${customerLabel}</span><input class="detail-input" id="latestEditCustomerName" type="text" value="${escapeHtml(invoice.customerName || "")}"></div>
        <div class="detail-item"><span>${phoneLabel}</span><input class="detail-input" id="latestEditCustomerPhone" type="tel" value="${escapeHtml(invoice.customerPhone || "")}"></div>
        <div class="detail-item"><span>${employeeLabel}</span><select class="detail-input" id="latestEditInvoiceBarber">${getLatestInvoiceBarberOptions(invoice.barber || "")}</select></div>
        <div class="detail-item"><span>${paymentLabel}</span><select class="detail-input" id="latestEditPaymentMethod">${getPaymentOptions(invoice.paymentMethod || "")}</select></div>
        <div class="detail-item"><span>${discountLabel}</span><input class="detail-input" id="latestEditDiscountAmount" type="number" min="0" step="1" value="${escapeHtml(invoice.discountAmount || 0)}"></div>
        <div class="detail-item"><span>${paidLabel}</span><input class="detail-input" id="latestEditPaidAmount" type="number" min="0" step="1" value="${escapeHtml(invoice.paidAmount || invoice.total || 0)}"></div>
        <div class="detail-item"><span>${tipLabel}</span><input class="detail-input" id="latestEditTipAmount" type="number" min="0" step="1" value="${escapeHtml(invoice.tipAmount || 0)}"></div>
        <div class="detail-item full"><span>${servicesLabel}</span><textarea class="detail-input" id="latestEditInvoiceServices">${escapeHtml(invoice.services || "")}</textarea></div>
        <div class="detail-item full"><span>${noteLabel}</span><textarea class="detail-input" id="latestEditInvoiceNote">${escapeHtml(invoice.note || "")}</textarea></div>
        <div class="modal-status" id="latestInvoiceModalStatus"></div>
        <div class="modal-actions full">
          <button type="button" class="mini-btn" id="cancelLatestInvoiceEditBtn">${localizeText("إلغاء", "Cancel")}</button>
          <button type="button" class="mini-btn dark" id="saveLatestInvoiceEditBtn">${localizeText("حفظ", "Save")}</button>
        </div>
      ` : `
        <div class="detail-item"><span>${dateLabel}</span><strong>${escapeHtml(invoice.date || "-")}</strong></div>
        <div class="detail-item"><span>${totalLabel}</span><strong>${escapeHtml(formatCurrency(invoice.total))}</strong></div>
        <div class="detail-item"><span>${customerLabel}</span><strong>${escapeHtml(invoice.customerName || "-")}</strong></div>
        <div class="detail-item"><span>${phoneLabel}</span><strong>${escapeHtml(invoice.customerPhone || "-")}</strong></div>
        <div class="detail-item"><span>${employeeLabel}</span><strong>${escapeHtml(invoice.barber || "-")}</strong></div>
        <div class="detail-item"><span>${paymentLabel}</span><strong>${escapeHtml(invoice.paymentMethod || "-")}</strong></div>
        <div class="detail-item"><span>${discountLabel}</span><strong>${escapeHtml(invoice.discountAmount ? `${invoice.discountPercent || 0}% - ${formatCurrency(invoice.discountAmount)}` : "-")}</strong></div>
        <div class="detail-item"><span>${paidLabel}</span><strong>${escapeHtml(formatCurrency(invoice.paidAmount || invoice.total || 0))}</strong></div>
        <div class="detail-item"><span>${tipLabel}</span><strong>${escapeHtml(formatCurrency(invoice.tipAmount || 0))}</strong></div>
        <div class="detail-item full"><span>${servicesLabel}</span><strong>${escapeHtml(invoice.services || "-")}</strong></div>
        <div class="detail-item full"><span>${noteLabel}</span><strong>${escapeHtml(invoice.note || "-")}</strong></div>
        ${canEditLatestInvoice(invoice) ? `
          <div class="modal-actions full">
            <button type="button" class="mini-btn dark" id="editLatestInvoiceBtn">${localizeText("تعديل", "Edit")}</button>
          </div>
        ` : `<div class="modal-status error">${localizeText("لا يمكن تعديل فاتورة لم يتم تحميلها من الشيت.", "Invoices that were not loaded from the sheet cannot be edited.")}</div>`}
      `;

      fixArabicInNode(latestInvoiceDetails);
    }

    function openLatestInvoiceDetails(invoice) {
      activeLatestInvoice = invoice;
      renderLatestInvoiceDetails(invoice, false);
      latestInvoiceModal.classList.add("active");
    }

    function closeLatestInvoiceDetails() {
      latestInvoiceModal.classList.remove("active");
      activeLatestInvoice = null;
    }

    function getLatestInvoiceUpdatePayload(invoice) {
      const invoiceDate = getDetailValue("latestEditInvoiceDate");
      return {
        action: "updateInvoice",
        invoiceId: invoice.invoiceId,
        rowNumber: invoice.rowNumber,
        date: invoiceDate,
        dateKey: invoiceDate,
        customerName: getDetailValue("latestEditCustomerName"),
        customerPhone: getDetailValue("latestEditCustomerPhone"),
        services: getDetailValue("latestEditInvoiceServices"),
        total: numberValue(getDetailValue("latestEditInvoiceTotal")),
        discountPercent: numberValue(activeLatestInvoice?.discountPercent || 0),
        discountAmount: numberValue(getDetailValue("latestEditDiscountAmount")),
        paidAmount: numberValue(getDetailValue("latestEditPaidAmount")),
        tipAmount: numberValue(getDetailValue("latestEditTipAmount")),
        payment: getDetailValue("latestEditPaymentMethod"),
        paymentMethod: getDetailValue("latestEditPaymentMethod"),
        barber: getDetailValue("latestEditInvoiceBarber"),
        note: getDetailValue("latestEditInvoiceNote"),
        invoiceNote: getDetailValue("latestEditInvoiceNote"),
        pdfUrl: invoice.pdfUrl || ""
      };
    }

    async function saveLatestInvoiceEdit(button) {
      if (!activeLatestInvoice) return;

      if (!canEditLatestInvoice(activeLatestInvoice)) {
        setLatestInvoiceModalStatus(localizeText("لا يمكن تعديل فاتورة لم يتم تحميلها من الشيت.", "Invoices that were not loaded from the sheet cannot be edited."), "error");
        return;
      }

      const payload = getLatestInvoiceUpdatePayload(activeLatestInvoice);
      if (!payload.date) {
        setLatestInvoiceModalStatus(localizeText("اختار تاريخ الفاتورة.", "Choose invoice date."), "error");
        return;
      }

      button.disabled = true;
      button.textContent = localizeText("جاري الحفظ...", "Saving...");
      setLatestInvoiceModalStatus(localizeText("جاري حفظ التعديل...", "Saving invoice changes..."));

      try {
        const result = await RomeoApi.request(payload);
        if (result.status !== "success") {
          throw new Error(result.message || localizeText("تعذر حفظ تعديل الفاتورة.", "Could not save invoice changes."));
        }

        const updatedInvoice = normalizeLatestInvoice({ ...activeLatestInvoice, ...payload });
        activeLatestInvoice = updatedInvoice;
        latestInvoices = latestInvoices.map(invoice =>
          String(invoice.invoiceId) === String(updatedInvoice.invoiceId) ? updatedInvoice : invoice
        );
        saveLatestInvoicesToStorage();
        renderLatestInvoices();
        renderLatestInvoiceDetails(updatedInvoice, false);
        fetchTodaySales();
        loadLatestInvoicesFromSheet();
      } catch (error) {
        console.error(error);
        setLatestInvoiceModalStatus(error.message || localizeText("تعذر حفظ تعديل الفاتورة.", "Could not save invoice changes."), "error");
        button.disabled = false;
        button.textContent = localizeText("حفظ", "Save");
      }
    }

    function loadStoredLatestInvoices() {
      latestInvoices = getStoredList(LATEST_INVOICES_STORAGE_KEY)
        .map(normalizeLatestInvoice)
        .slice(0, 5);
      renderLatestInvoices();
    }

    async function loadLatestInvoicesFromSheet() {
      if (!isConnectionOnline()) {
        return;
      }

      try {
        const result = await RomeoApi.request({
          action: "getInvoices",
          limit: 5,
          offset: 0,
          filters: {}
        });

        if (result.status !== "success" || !Array.isArray(result.invoices)) {
          return;
        }

        latestInvoices = result.invoices
          .map(normalizeLatestInvoice)
          .slice(0, 5);
        saveLatestInvoicesToStorage();
        renderLatestInvoices();
      } catch (error) {
        console.warn("Latest invoices could not be loaded.", error);
      }
    }

    function addLatestInvoice(invoice) {
      const nextInvoice = normalizeLatestInvoice(invoice);
      latestInvoices = [
        nextInvoice,
        ...latestInvoices.filter(item => String(item.invoiceId) !== String(nextInvoice.invoiceId))
      ].slice(0, 5);
      saveLatestInvoicesToStorage();
      renderLatestInvoices();
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

    function getBarberPlaceholder() {
      return getCurrentPageLanguage() === "en" ? "Choose barber" : "اختر الحلاق";
    }

    function renderBarberOptions() {
      const currentValue = barberSelect.value;
      const staffList = getStoredStaffForBarbers();

      barberSelect.innerHTML = "";
      const placeholderOption = document.createElement("option");
      placeholderOption.value = "";
      placeholderOption.textContent = getBarberPlaceholder();
      barberSelect.appendChild(placeholderOption);

      staffList.forEach(staff => {
        const option = document.createElement("option");
        option.value = getBarberSheetName(staff);
        option.textContent = staff.name;
        option.dataset.staffId = staff.id;
        option.dataset.staffCode = staff.code || "";
        option.dataset.staffName = staff.name || "";
        barberSelect.appendChild(option);
      });

      barberSelect.value = Array.from(barberSelect.options).some(option => option.value === currentValue)
        ? currentValue
        : "";

      if (typeof RomeoLanguage !== "undefined") {
        RomeoLanguage.applyLanguage();
      }
    }

    function renderDailyNetRows(groups) {
      return groups.map(group => `
        <div class="daily-net-group">
          ${group.map(row => `
            <span class="daily-net-row">
              <span>${row.label}</span>
              <b>${row.value}</b>
            </span>
          `).join("")}
        </div>
      `).join("");
    }

    function setDailyNetLoading(isLoading) {
      if (!dailyNetCard || !dailyNetAmount || !dailyNetBreakdown) {
        return;
      }

      dailyNetCard.classList.toggle("is-loading", isLoading);

      if (!isLoading) {
        return;
      }

      const loadingText = localizeText("جاري تحميل أرقام اليوم...", "Loading day numbers...");
      dailyNetAmount.textContent = localizeText("جاري التحميل...", "Loading...");
      dailyNetBreakdown.className = "daily-net-loading";
      dailyNetBreakdown.innerHTML = `<span class="daily-net-spinner"></span><span>${loadingText}</span>`;
    }

    function updateDailyNet(todaySales, todayTips = latestTodayTips) {
      const withdrawalsTotal = numberValue(latestTodayWithdrawals);
      const expensesTotal = numberValue(latestTodayExpenses);
      const tipsTotal = numberValue(todayTips);
      const cashTotal = numberValue(latestPaymentTotals.cash);
      const instapayTotal = numberValue(latestPaymentTotals.instapay);
      const vodafoneCashTotal = numberValue(latestPaymentTotals.vodafoneCash);
      const visaTotal = numberValue(latestPaymentTotals.visa);
      const netTotal = numberValue(todaySales) + tipsTotal - expensesTotal - withdrawalsTotal;

      dailyNetAmount.textContent = formatSignedCurrency(netTotal);
      dailyNetCard.classList.toggle("is-negative", netTotal < 0);
      dailyNetBreakdown.className = "daily-net-details";
      dailyNetBreakdown.innerHTML = getCurrentPageLanguage() === "en"
        ? renderDailyNetRows([
          [
            { label: "Sales", value: formatCurrency(todaySales) },
            { label: "Tips", value: formatCurrency(tipsTotal) },
            { label: "Expenses", value: formatCurrency(expensesTotal) },
            { label: "Withdrawals", value: formatCurrency(withdrawalsTotal) }
          ],
          [
            { label: "Cash", value: formatCurrency(cashTotal) },
            { label: "Instapay", value: formatCurrency(instapayTotal) },
            { label: "Vodafone Cash", value: formatCurrency(vodafoneCashTotal) },
            { label: "Visa", value: formatCurrency(visaTotal) }
          ]
        ])
        : renderDailyNetRows([
          [
            { label: "المبيعات", value: formatCurrency(todaySales) },
            { label: "التيب", value: formatCurrency(tipsTotal) },
            { label: "المصروفات", value: formatCurrency(expensesTotal) },
            { label: "السحوبات", value: formatCurrency(withdrawalsTotal) }
          ],
          [
            { label: "النقدي", value: formatCurrency(cashTotal) },
            { label: "انستا باي", value: formatCurrency(instapayTotal) },
            { label: "فودافون كاش", value: formatCurrency(vodafoneCashTotal) },
            { label: "الفيزا", value: formatCurrency(visaTotal) }
          ]
        ]);
    }

    async function fetchDailyNetTotals() {
      try {
        const data = await RomeoApi.request({
          action: "getDailyClosingPreview",
          date: getReportDateKey()
        });

        if (data.status !== "success") {
          throw new Error(data.message || "Failed to load daily totals");
        }

        const preview = data.preview || {};
        latestTodayExpenses = numberValue(preview.expensesTotal);
        latestTodayWithdrawals = numberValue(preview.withdrawalsTotal);
        updateDailyNet(latestTodaySales, latestTodayTips);
      } catch (error) {
        console.warn("Daily net sheet totals are not available yet.", error);
        latestTodayExpenses = 0;
        latestTodayWithdrawals = 0;
        updateDailyNet(latestTodaySales, latestTodayTips);
      }
    }

    function updatePaymentMethodTotals(totals = {}) {
      latestPaymentTotals = { ...totals };
      const cashTotal = numberValue(totals.cash);
      const instapayTotal = numberValue(totals.instapay);
      const vodafoneCashTotal = numberValue(totals.vodafoneCash);
      const visaTotal = numberValue(totals.visa);
      const tipsTotal = numberValue(totals.tips);
      const salesWithTipsTotal = cashTotal + instapayTotal + vodafoneCashTotal + visaTotal;

      if (cashTodayTotal) cashTodayTotal.textContent = formatCurrency(cashTotal);
      if (instapayTodayTotal) instapayTodayTotal.textContent = formatCurrency(instapayTotal);
      if (vodafoneTodayTotal) vodafoneTodayTotal.textContent = formatCurrency(vodafoneCashTotal);
      if (visaTodayTotal) visaTodayTotal.textContent = formatCurrency(visaTotal);
      if (tipsTodayTotal) {
        tipsTodayTotal.textContent = formatCurrency(tipsTotal);
      }
      if (todaySalesAmount) {
        todaySalesAmount.textContent = formatCurrency(salesWithTipsTotal);
      }
      updateDailyNet(latestTodaySales, tipsTotal || latestTodayTips);
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
        if (cashTodayTotal) cashTodayTotal.textContent = loadingText;
        if (instapayTodayTotal) instapayTodayTotal.textContent = loadingText;
        if (vodafoneTodayTotal) vodafoneTodayTotal.textContent = loadingText;
        if (visaTodayTotal) visaTodayTotal.textContent = loadingText;
        if (tipsTodayTotal) {
          tipsTodayTotal.textContent = loadingText;
        }

        const data = await RomeoApi.request({
          action: "todayPaymentTotals",
          reportDate: getReportDateKey()
        });

        if (data.status !== "success") {
          throw new Error(data.message || "Failed to load payment totals");
        }

        updatePaymentMethodTotals({
          cash: firstNumberValue(data.cashTotal, data.cash, data.cashTodayTotal, data.naqdTotal, data["Ã™â€ Ã™â€šÃ˜Â¯Ã™Å "]),
          instapay: firstNumberValue(data.instapayTotal, data.instapay, data.instapayTodayTotal, data["Ã˜Â§Ã™â€ Ã˜Â³Ã˜ÂªÃ˜Â§ Ã˜Â¨Ã˜Â§Ã™Å "]),
          vodafoneCash: firstNumberValue(data.vodafoneCashTotal, data.vodafoneCash, data.vodafoneTotal, data["Ã™ÂÃ™Ë†Ã˜Â¯Ã˜Â§Ã™ÂÃ™Ë†Ã™â€  Ã™Æ’Ã˜Â§Ã˜Â´"]),
          visa: firstNumberValue(data.visaTotal, data.visa, data.visaTodayTotal, data["Ã™ÂÃ™Å Ã˜Â²Ã˜Â§"]),
          tips: firstNumberValue(data.tipTotal, data.todayTips, data.tipsTotal, data.totalTips)
        });
      } catch (error) {
        console.error(error);
        updatePaymentMethodTotals();
      }
    }

    function getTotal() {
      return Math.max(0, getGrossTotal() - getDiscountAmount());
    }

    function getGrossTotal() {
      const baseTotal = getSubtotalBeforePremium();
      return baseTotal + getPremiumExtra();
    }

    function getDiscountPercent() {
      return Math.min(100, Math.max(0, Number(discountPercentInput?.value) || 0));
    }

    function getDiscountAmount() {
      return Math.round(getGrossTotal() * getDiscountPercent() / 100);
    }

    function getPremiumExtra() {
      return document.getElementById("premiumOffer")?.checked ? premiumOfferExtra : 0;
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
      const eligibleItems = cart.filter(item =>
        item.lineType !== "product" && !hairOfferExcludedServices.has(normalizeServiceName(item.name))
      );
      const excludedItems = cart.filter(item =>
        item.lineType === "product" || hairOfferExcludedServices.has(normalizeServiceName(item.name))
      );
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
      const hasMainHairService = eligibleItems.some(item => normalizeServiceName(item.name) === normalizedMainHairServiceName);
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

    function isConnectionOnline() {
      return !window.RomeoConnectivity || window.RomeoConnectivity.isOnline();
    }

    function getOfflineStatusMessage() {
      return localizeText(
        "لا يوجد اتصال بالإنترنت. لا يمكن حفظ أي بيانات حتى يعود الاتصال.",
        "No internet connection. Data cannot be saved until the connection is restored."
      );
    }

    function updateOnlineControls() {
      const offline = !isConnectionOnline();
      [completeSaleBtn, addServiceBtn, savePricesBtn, resetPricesBtn].forEach(button => {
        if (button) button.disabled = offline;
      });

      if (offline) {
        showStatus(getOfflineStatusMessage(), "error");
      }
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
        const data = await RomeoApi.request({ action: "customerLookup" });
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
      setDailyNetLoading(true);
      try {
        if (todaySalesAmount) {
          todaySalesAmount.textContent = "Ã˜Â¬Ã˜Â§Ã˜Â±Ã™Å  Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã™â€¦Ã™Å Ã™â€ž...";
        }
        const data = await RomeoApi.request({
          action: "todaySales",
          reportDate: getReportDateKey()
        });

        if (data.status !== "success") {
          throw new Error(data.message || "Failed to load today's sales");
        }

        latestTodaySales = numberValue(data.todaySales);
        latestTodayTips = numberValue(data.todayTips);
        if (todaySalesAmount) {
          todaySalesAmount.textContent = formatCurrency(latestTodaySales);
        }
        await Promise.all([
          fetchDailyNetTotals(),
          fetchTodayPaymentTotals()
        ]);
      } catch (error) {
        console.error(error);
        latestTodaySales = 0;
        latestTodayTips = 0;
        if (todaySalesAmount) {
          todaySalesAmount.textContent = formatCurrency(0);
        }
        await fetchDailyNetTotals();
        updatePaymentMethodTotals();
      } finally {
        setDailyNetLoading(false);
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
        serviceId: String(service.serviceId || "").trim(),
        name: normalizeServiceName(service.name),
        price: numberValue(service.price),
        lineType: "service"
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

    function updateSelectedServicesControls() {
      const availableNames = availableServices.map(service => service.name);
      selectedServiceNames = new Set([...selectedServiceNames].filter(name => availableNames.includes(name)));

      const selectedCount = selectedServiceNames.size;
      const allSelected = availableServices.length > 0 && availableServices.every(service => selectedServiceNames.has(service.name));

      if (selectedServicesCount) {
        selectedServicesCount.textContent = `${selectedCount} محدد`;
      }

      if (deleteSelectedServicesBtn) {
        deleteSelectedServicesBtn.disabled = selectedCount === 0;
      }

      if (selectAllServicesForDelete) {
        selectAllServicesForDelete.disabled = availableServices.length === 0;
        selectAllServicesForDelete.checked = allSelected;
        selectAllServicesForDelete.indeterminate = selectedCount > 0 && !allSelected;
      }
    }

    async function loadInventoryProducts() {
      try {
        const result = await RomeoApi.request({ action: "getSellableProducts" });
        if (result.status !== "success" || !Array.isArray(result.products)) return;

        availableProducts = result.products
          .map(item => ({
            itemId: String(item.itemId || "").trim(),
            referenceId: String(item.itemId || "").trim(),
            lineType: "product",
            name: normalizeServiceName(item.name),
            price: numberValue(item.salePrice),
            sealedPacks: numberValue(item.sealedPacks)
          }))
          .filter(item => item.itemId && item.name);

        if (activeServiceFilter === "product") renderServices();
      } catch (error) {
        console.warn("Inventory products are not available yet", error);
      }
    }

    function renderPriceEditor() {
      priceEditorList.innerHTML = availableServices
        .map(
          (service, index) => `
            <div class="price-editor-row">
              <input class="price-editor-checkbox" type="checkbox" data-select-service="${index}" ${selectedServiceNames.has(service.name) ? "checked" : ""}>
              <strong>${service.name}</strong>
              <input type="number" min="0" step="1" data-service-index="${index}" value="${service.price}">
              <button class="danger-btn" type="button" onclick="deleteServiceFromMenu(${index})">Ã˜Â­Ã˜Â°Ã™Â</button>
            </div>
          `
        )
        .join("");
      updateSelectedServicesControls();
    }

    function syncCartPrices() {
      cart = cart.map(item => {
        if (item.lineType === "product") {
          const updatedProduct = availableProducts.find(product => product.itemId === item.referenceId);
          return updatedProduct ? { ...item, ...updatedProduct } : item;
        }
        const updatedService = availableServices.find(service => service.name === item.name);
        return updatedService ? { ...item, ...updatedService } : item;
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
      if (!isConnectionOnline()) {
        showStatus(getOfflineStatusMessage(), "error");
        updateOnlineControls();
        return;
      }

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
      if (!isConnectionOnline()) {
        showStatus(getOfflineStatusMessage(), "error");
        updateOnlineControls();
        return;
      }

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
      if (!isConnectionOnline()) {
        showStatus(getOfflineStatusMessage(), "error");
        updateOnlineControls();
        return;
      }

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
      if (!isConnectionOnline()) {
        showStatus(getOfflineStatusMessage(), "error");
        updateOnlineControls();
        return;
      }

      const service = availableServices[index];
      if (!service) {
        return;
      }

      if (!window.confirm(`Ã™â€¡Ã™â€ž Ã˜ÂªÃ˜Â±Ã™Å Ã˜Â¯ Ã˜Â­Ã˜Â°Ã™Â Ã˜Â®Ã˜Â¯Ã™â€¦Ã˜Â© ${service.name}Ã˜Å¸`)) {
        return;
      }

      availableServices.splice(index, 1);
      selectedServiceNames.delete(service.name);
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

    async function deleteSelectedServicesFromMenu() {
      if (!isConnectionOnline()) {
        showStatus(getOfflineStatusMessage(), "error");
        updateOnlineControls();
        return;
      }

      const selectedServices = availableServices.filter(service => selectedServiceNames.has(service.name));
      if (!selectedServices.length) {
        updateSelectedServicesControls();
        return;
      }

      if (!window.confirm(`هل تريد حذف ${selectedServices.length} خدمة؟`)) {
        return;
      }

      const selectedNames = new Set(selectedServices.map(service => service.name));
      availableServices = availableServices.filter(service => !selectedNames.has(service.name));
      cart = cart.filter(item => !selectedNames.has(item.name));
      selectedServiceNames.clear();

      const savedToSheet = await persistServices();
      renderPriceEditor();
      renderServices();
      renderCart();
      showStatus(
        savedToSheet
          ? "تم حذف الخدمات المحددة وحفظ التعديل في الشيت."
          : "تم حذف الخدمات المحددة على هذا الجهاز فقط، ولم يتم حفظ التعديل في الشيت.",
        savedToSheet ? "success" : "error"
      );
    }

    function setLoadingState(isLoading) {
      const offline = !isConnectionOnline();
      completeSaleBtn.disabled = isLoading || offline;
      printBtn.disabled = isLoading;
      clearBtn.disabled = isLoading;
      completeSaleBtn.textContent = isLoading ? "Ã˜Â¬Ã˜Â§Ã˜Â±Ã™Å  Ã˜Â§Ã™â€žÃ˜Â­Ã™ÂÃ˜Â¸..." : "Ã˜Â¥Ã˜ÂªÃ™â€¦Ã˜Â§Ã™â€¦ Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨";

      if (isLoading) {
        showStatus("جاري حفظ الفاتورة .....", "loading");
      } else if (offline) {
        showStatus(getOfflineStatusMessage(), "error");
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

    function getServiceUsage() {
      try {
        return JSON.parse(localStorage.getItem(SERVICE_USAGE_STORAGE_KEY) || "{}") || {};
      } catch (error) {
        return {};
      }
    }

    function saveServiceUsage(usage) {
      localStorage.setItem(SERVICE_USAGE_STORAGE_KEY, JSON.stringify(usage));
    }

    function recordServiceUsage(serviceName) {
      const normalizedName = normalizeServiceName(serviceName);
      if (!normalizedName) return;

      const usage = getServiceUsage();
      usage[normalizedName] = (Number(usage[normalizedName]) || 0) + 1;
      saveServiceUsage(usage);
    }

    function isPackageService(service) {
      const name = normalizeServiceName(service?.name || "");
      return /[+＋]/.test(name) || /باك|باكيج|باكيدج|package|pack|vip/i.test(name);
    }

    function isCareService(service) {
      const name = normalizeServiceName(service?.name || "").toLowerCase();
      return [
        "حمام",
        "ماسك",
        "بشرة",
        "صبغة",
        "معالج",
        "بروتين",
        "جلسة",
        "فوط",
        "فوتة",
        "فتلة",
        "شمع",
        "wax",
        "mask",
        "protein",
        "dye",
        "facial"
      ].some(keyword => name.includes(keyword));
    }

    function normalizeSearchText(value) {
      return normalizeServiceName(value)
        .toLowerCase()
        .replace(/[+＋]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    function serviceMatchesSearch(service, query) {
      const normalizedQuery = normalizeSearchText(query);
      if (!normalizedQuery) return true;

      const serviceName = normalizeSearchText(service.name);
      return normalizedQuery
        .split(" ")
        .filter(Boolean)
        .every(part => serviceName.includes(part));
    }

    function getFilteredServices() {
      const usage = getServiceUsage();
      const searchQuery = serviceSearchInput?.value || "";
      let indexedServices = availableServices.map((service, index) => ({ service, index }));

      if (activeServiceFilter === "popular") {
        indexedServices = indexedServices
          .filter(item => Number(usage[item.service.name]) > 0)
          .sort((a, b) => (Number(usage[b.service.name]) || 0) - (Number(usage[a.service.name]) || 0));

        if (!indexedServices.length) {
          indexedServices = availableServices.slice(0, 9).map((service, index) => ({ service, index }));
        }
      } else if (activeServiceFilter === "single") {
        indexedServices = indexedServices.filter(item => !isPackageService(item.service));
      } else if (activeServiceFilter === "package") {
        indexedServices = indexedServices.filter(item => isPackageService(item.service));
      } else if (activeServiceFilter === "care") {
        indexedServices = indexedServices.filter(item => isCareService(item.service));
      }

      return indexedServices.filter(item => serviceMatchesSearch(item.service, searchQuery));
    }

    function updateServiceFilterTabs() {
      if (!serviceFilterTabs) return;

      serviceFilterTabs.querySelectorAll("[data-service-filter]").forEach(tab => {
        tab.classList.toggle("active", tab.dataset.serviceFilter === activeServiceFilter);
      });
    }

    function updateServicesResultsText(count) {
      if (!servicesResultsText) return;

      const query = serviceSearchInput?.value.trim();
      if (query) {
        servicesResultsText.textContent = `${count} نتيجة بحث`;
        return;
      }

      const labels = {
        all: "كل الخدمات",
        popular: "الأكثر استخدامًا",
        single: "الخدمات الفردية",
        package: "الباكيدجات",
        care: "العناية",
        product: "المنتجات"
      };
      servicesResultsText.textContent = `${labels[activeServiceFilter] || "الخدمات"} - ${count}`;
    }

    function renderServices() {
      if (activeServiceFilter === "product") {
        const query = serviceSearchInput?.value || "";
        const filteredProducts = availableProducts
          .map((product, index) => ({ product, index }))
          .filter(item => serviceMatchesSearch(item.product, query));
        updateServiceFilterTabs();
        updateServicesResultsText(filteredProducts.length);

        if (!filteredProducts.length) {
          servicesGrid.innerHTML = `<div class="empty-state" data-no-translate="true">لا توجد منتجات متاحة للبيع.</div>`;
        } else {
          servicesGrid.innerHTML = filteredProducts.map(({ product, index }) => `
            <button class="service-btn" type="button" onclick="addProduct(${index})" ${product.sealedPacks <= 0 ? "disabled" : ""}>
              <span class="service-badge">منتج</span>
              <strong>${escapeHtml(product.name)}</strong>
              <span>${escapeHtml(formatCurrency(product.price))}</span>
              <small>المتاح: ${product.sealedPacks}</small>
            </button>
          `).join("");
        }
        fixArabicInNode(servicesGrid);
        syncServicesPanelHeight();
        return;
      }

      const filteredServices = getFilteredServices();
      updateServiceFilterTabs();
      updateServicesResultsText(filteredServices.length);

      if (!filteredServices.length) {
        servicesGrid.innerHTML = `<div class="empty-state" data-no-translate="true">لا توجد خدمات مطابقة.</div>`;
        fixArabicInNode(servicesGrid);
        syncServicesPanelHeight();
        return;
      }

      servicesGrid.innerHTML = filteredServices
        .map(
          ({ service, index }) => `
            <button class="service-btn ${isPackageService(service) ? "package-service" : ""}" type="button" onclick="addService(${index})">
              ${isPackageService(service) ? `<span class="service-badge">باكيدج</span>` : ""}
              <strong>${escapeHtml(service.name)}</strong>
              <span>${escapeHtml(formatCurrency(service.price))}</span>
            </button>
          `
        )
        .join("");
      fixArabicInNode(servicesGrid);
      syncServicesPanelHeight();
    }

    function renderCart() {
      if (cart.length === 0) {
        cartItems.innerHTML = `<div class="empty-state" data-no-translate="true">${localizeText("لم يتم اختيار أي خدمة حتى الآن.", "No service has been selected yet.")}</div>`;
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
      const discountAmount = getDiscountAmount();
      if (discountSummaryRow && discountAmountText) {
        discountSummaryRow.hidden = discountAmount <= 0;
        discountAmountText.textContent = `${getDiscountPercent()}% - ${formatCurrency(discountAmount)}`;
      }
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
      const service = availableServices[index];
      if (!service) return;

      cart.push({
        ...service,
        lineType: "service",
        referenceId: service.serviceId || ""
      });
      recordServiceUsage(service.name);
      clearStatus();
      renderServices();
      renderCart();
    }

    function addProduct(index) {
      const product = availableProducts[index];
      if (!product) return;

      const selectedCount = cart.filter(item => item.lineType === "product" && item.referenceId === product.itemId).length;
      if (selectedCount >= product.sealedPacks) {
        showStatus("الكمية المتاحة من هذا المنتج لا تكفي.", "error");
        return;
      }

      cart.push({ ...product });
      clearStatus();
      renderServices();
      renderCart();
    }

    function removeService(index) {
      cart.splice(index, 1);
      renderCart();
    }

    function updateRemaining() {
      const total = getTotal();
      const paid = Number(paidAmountInput.value) || 0;
      const tip = Number(tipAmountInput.value) || 0;
      const change = paid - total - tip;
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
      discountPercentInput.value = "";
      paidAmountInput.value = "";
      tipAmountInput.value = "";
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
        alert(localizeText("تعذر تجهيز الطباعة. حاول مرة أخرى.", "Could not prepare printing. Try again."));
        return;
      }

      const isEnglish = getCurrentPageLanguage() === "en";
      const invoiceLang = isEnglish ? "en" : "ar";
      const invoiceDir = isEnglish ? "ltr" : "rtl";
      const alignStart = isEnglish ? "left" : "right";
      const unregisteredText = localizeText("غير مسجل", "Not registered");
      const unspecifiedText = localizeText("غير محدد", "Not specified");
      const regularText = localizeText("عادي", "Regular");
      const customerName = invoice.customerName || unregisteredText;
      const customerPhone = invoice.customerPhone || unregisteredText;
      const barber = invoice.barber || unspecifiedText;
      const offerType = invoice.offerType || regularText;
      const paymentMethod = invoice.paymentMethod || unspecifiedText;
      const printedAt = new Date().toLocaleString("en-US", {
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
        <html lang="${invoiceLang}" dir="${invoiceDir}">
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
              direction: ${invoiceDir};
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
              text-align: ${alignStart};
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
              <h1 class="brand">CUT HUB</h1>
              <p class="subtitle">Your style, our passion</p>
            </section>

            <section class="content">
              <div class="meta">
                <div class="meta-box">
                  <span class="label">${localizeText("اسم العميل", "Customer Name")}</span>
                  <span class="value">${escapePrintHtml(customerName)}</span>
                </div>
                <div class="meta-box">
                  <span class="label">${localizeText("رقم العميل", "Customer Phone")}</span>
                  <span class="value">${escapePrintHtml(customerPhone)}</span>
                </div>
                <div class="meta-box">
                  <span class="label">${localizeText("الموظف", "Employee")}</span>
                  <span class="value">${escapePrintHtml(barber)}</span>
                </div>
                <div class="meta-box">
                  <span class="label">${localizeText("طريقة الدفع", "Payment Method")}</span>
                  <span class="value">${escapePrintHtml(paymentMethod)}</span>
                </div>
                <div class="meta-box">
                  <span class="label">${localizeText("نوع العرض", "Offer Type")}</span>
                  <span class="value">${escapePrintHtml(offerType)}</span>
                </div>
                <div class="meta-box">
                  <span class="label">${localizeText("التاريخ", "Date")}</span>
                  <span class="value">${escapePrintHtml(printedAt)}</span>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>${localizeText("الخدمة", "Service")}</th>
                    <th>${localizeText("السعر", "Price")}</th>
                  </tr>
                </thead>
                <tbody>${itemsRows}</tbody>
              </table>

              <div class="summary">
                <div class="summary-row">
                  <span>${localizeText("نسبة الخصم", "Discount Percent")}</span>
                  <strong>${escapePrintHtml(`${invoice.discountPercent || 0}%`)}</strong>
                </div>
                <div class="summary-row">
                  <span>${localizeText("مبلغ الخصم", "Discount Amount")}</span>
                  <strong>${escapePrintHtml(formatCurrency(invoice.discountAmount || 0))}</strong>
                </div>
                <div class="summary-row">
                  <span>${localizeText("المدفوع", "Paid")}</span>
                  <strong>${escapePrintHtml(formatCurrency(invoice.paidAmount))}</strong>
                </div>
                <div class="summary-row">
                  <span>Tip</span>
                  <strong>${escapePrintHtml(formatCurrency(invoice.tipAmount || 0))}</strong>
                </div>
                <div class="summary-row">
                  <span>${localizeText("الباقي", "Change")}</span>
                  <strong>${escapePrintHtml(formatCurrency(invoice.remainingAmount))}</strong>
                </div>
                <div class="summary-row total">
                  <span>${localizeText("الإجمالي", "Total")}</span>
                  <strong>${escapePrintHtml(formatCurrency(invoice.total))}</strong>
                </div>
              </div>
            </section>

            <footer class="footer">
              ${escapePrintHtml(localizeText("Your style, our passion", "Your style, our passion"))}<br>
              ${escapePrintHtml(localizeText("Thank you for visiting CUT HUB", "Thank you for visiting CUT HUB"))}
            </footer>
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
      const barber = document.getElementById("barber").value || localizeText("غير محدد", "Not specified");
      const paymentMethod = getSelectedPaymentMethod() || localizeText("غير محدد", "Not specified");
      const offerType = getSelectedOfferType();
      const total = getTotal();
      const discountPercent = getDiscountPercent();
      const discountAmount = getDiscountAmount();
      const paidAmount = Number(paidAmountInput.value) || 0;
      const tipAmount = Number(tipAmountInput.value) || 0;
      const remainingAmount = Math.max(0, paidAmount - total - tipAmount);

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
        discountPercent,
        discountAmount,
        paidAmount,
        tipAmount,
        remainingAmount,
        items: [...cart]
      });
    }

    async function completeSale() {
      clearStatus();

      if (!isConnectionOnline()) {
        showStatus(getOfflineStatusMessage(), "error");
        updateOnlineControls();
        return;
      }

      const customerName = customerNameInput.value.trim();
      const customerPhone = customerPhoneInput.value.trim();
      const barber = barberSelect.value;
      const selectedBarberOption = barberSelect.options[barberSelect.selectedIndex];
      const barberId = String(selectedBarberOption?.dataset.staffCode || selectedBarberOption?.dataset.staffId || barber).trim();
      const barberName = String(selectedBarberOption?.dataset.staffName || selectedBarberOption?.textContent || barber).trim();
      const paymentMethod = getSelectedPaymentMethod();
      const reportDate = getReportDateKey();
      const offerType = getSelectedOfferType();
      const total = getTotal();
      const subtotalBeforePremium = getSubtotalBeforePremium();
      const premiumExtra = getPremiumExtra();
      const discountPercent = getDiscountPercent();
      const discountAmount = getDiscountAmount();
      const paidAmount = Number(paidAmountInput.value) || 0;
      const tipAmount = Number(tipAmountInput.value) || 0;
      const remainingAmount = Math.max(0, paidAmount - total - tipAmount);
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
        reportDate,
        date: reportDate,
        dateKey: reportDate,
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
        discountPercent,
        discountAmount,
        barber,
        barberId,
        barberName,
        paidAmount,
        tipAmount,
        remainingAmount,
        note: invoiceNote,
        invoiceNote,
        invoiceItems: cart.map(item => ({
          lineType: item.lineType === "product" ? "product" : "service",
          referenceId: item.referenceId || item.serviceId || item.itemId || "",
          itemName: item.name,
          quantity: 1,
          unitPrice: numberValue(item.price)
        }))
      };

      if (invoiceSubmitInProgress) {
        showStatus(localizeText("جاري حفظ الفاتورة بالفعل. انتظر لحظات.", "Invoice is already being saved. Please wait."), "error");
        return;
      }

      const invoiceFingerprint = getInvoiceFingerprint(invoiceData);
      const activeLock = getActiveInvoiceSubmitLock(invoiceFingerprint);
      if (activeLock) {
        showStatus(localizeText(
          "الفاتورة دي اتبعتت للحفظ بالفعل. راجع آخر الفواتير قبل إعادة المحاولة.",
          "This invoice was already sent for saving. Check the latest invoices before trying again."
        ), "error");
        return;
      }

      const invoiceLock = createInvoiceSubmitLock(invoiceFingerprint);
      invoiceSubmitInProgress = true;
      invoiceData.clientRequestId = invoiceLock.requestId;
      invoiceData.idempotencyKey = invoiceLock.requestId;
      invoiceData.invoiceFingerprint = invoiceFingerprint;

      try {
        setLoadingState(true);
        const shouldPrint = window.confirm("Ù‡Ù„ ØªØ±ÙŠØ¯ Ø·Ø¨Ø§Ø¹Ø© Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ø¢Ù†ØŸ");

        const saveResult = await saveInvoice(invoiceData);
        clearInvoiceSubmitLock(invoiceLock);
        addLatestInvoice({
          ...invoiceData,
          ...(saveResult.invoice || saveResult.data || {}),
          invoiceId: saveResult.invoiceId || saveResult.id || saveResult.invoice?.invoiceId || saveResult.data?.invoiceId || invoiceData.invoiceId,
          rowNumber: saveResult.rowNumber || saveResult.invoice?.rowNumber || saveResult.data?.rowNumber || invoiceData.rowNumber,
          pdfUrl: saveResult.pdfUrl || saveResult.invoice?.pdfUrl || saveResult.data?.pdfUrl || invoiceData.pdfUrl
        });

        if (shouldPrint) {
          printInvoice({
            customerName,
            customerPhone,
            barber,
            paymentMethod,
            offerType,
            total,
            discountPercent,
            discountAmount,
            paidAmount,
            tipAmount,
            remainingAmount,
            items: [...cart]
          });
        }

        showStatus("Ã˜ÂªÃ™â€¦ Ã˜Â­Ã™ÂÃ˜Â¸ Ã˜Â§Ã™â€žÃ™ÂÃ˜Â§Ã˜ÂªÃ™Ë†Ã˜Â±Ã˜Â© Ã˜Â¨Ã™â€ Ã˜Â¬Ã˜Â§Ã˜Â­.", "success");
        resetForm();
        loadInventoryProducts();
        fetchTodaySales();
        loadLatestInvoicesFromSheet();
      } catch (error) {
        if (!shouldKeepInvoiceLock(error)) {
          clearInvoiceSubmitLock(invoiceLock);
        }
        showStatus(error.message || "Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â®Ã˜Â·Ã˜Â£ Ã˜Â£Ã˜Â«Ã™â€ Ã˜Â§Ã˜Â¡ Ã˜Â­Ã™ÂÃ˜Â¸ Ã˜Â§Ã™â€žÃ™ÂÃ˜Â§Ã˜ÂªÃ™Ë†Ã˜Â±Ã˜Â©.", "error");
      } finally {
        invoiceSubmitInProgress = false;
        setLoadingState(false);
      }
    }

    paidAmountInput.addEventListener("input", updateRemaining);
    tipAmountInput.addEventListener("input", updateRemaining);
    discountPercentInput.addEventListener("input", renderCart);
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

    });
    window.addEventListener("romeo-language-change", () => {
      renderBarberOptions();
      renderServices();
      renderCart();
      if (todaySalesAmount) {
        todaySalesAmount.textContent = formatCurrency(latestTodaySales);
      }
      updateRemaining();
      updateDailyNet(latestTodaySales, latestTodayTips);
      updatePaymentMethodTotals(latestPaymentTotals);
      renderLatestInvoices();
      updateOnlineControls();
    });
    window.addEventListener("romeo-connectivity-change", updateOnlineControls);
    window.addEventListener("pageshow", () => {
      renderBarberOptions();
      loadBarbersFromSheet();
      loadInventoryProducts();
      fetchTodaySales();
      updateOnlineControls();
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
    if (quickBookingLink) {
      quickBookingLink.addEventListener("click", () => {
        window.location.href = "bookings.html";
      });
    }
    completeSaleBtn.addEventListener("click", completeSale);
    printBtn.addEventListener("click", printCurrentInvoice);
    clearBtn.addEventListener("click", resetForm);
    editPricesBtn.addEventListener("click", openPriceEditor);
    if (serviceSearchInput) {
      serviceSearchInput.addEventListener("input", renderServices);
    }
    if (serviceFilterTabs) {
      serviceFilterTabs.addEventListener("click", event => {
        const tab = event.target.closest("[data-service-filter]");
        if (!tab) return;

        activeServiceFilter = tab.dataset.serviceFilter || "all";
        renderServices();
      });
    }
    closePriceEditorBtn.addEventListener("click", closePriceEditor);
    savePricesBtn.addEventListener("click", saveServicePrices);
    resetPricesBtn.addEventListener("click", resetServicePrices);
    addServiceBtn.addEventListener("click", addServiceToMenu);
    if (deleteSelectedServicesBtn) {
      deleteSelectedServicesBtn.addEventListener("click", deleteSelectedServicesFromMenu);
    }
    if (selectAllServicesForDelete) {
      selectAllServicesForDelete.addEventListener("change", event => {
        selectedServiceNames = event.target.checked
          ? new Set(availableServices.map(service => service.name))
          : new Set();
        renderPriceEditor();
      });
    }
    priceEditorList.addEventListener("change", event => {
      const checkbox = event.target.closest("[data-select-service]");
      if (!checkbox) return;

      const service = availableServices[Number(checkbox.dataset.selectService)];
      if (!service) return;

      if (checkbox.checked) {
        selectedServiceNames.add(service.name);
      } else {
        selectedServiceNames.delete(service.name);
      }

      updateSelectedServicesControls();
    });
    logoutBtn.addEventListener("click", () => RomeoAuth.logout());
    if (latestInvoicesList) {
      latestInvoicesList.addEventListener("click", event => {
        const button = event.target.closest("[data-latest-invoice-id]");
        if (!button) return;

        const invoice = findLatestInvoice(button.dataset.latestInvoiceId);
        if (invoice) {
          openLatestInvoiceDetails(invoice);
        }
      });
    }
    if (closeLatestInvoiceModalBtn) {
      closeLatestInvoiceModalBtn.addEventListener("click", closeLatestInvoiceDetails);
    }
    if (latestInvoiceModal) {
      latestInvoiceModal.addEventListener("click", event => {
        if (event.target === latestInvoiceModal) {
          closeLatestInvoiceDetails();
        }
      });
    }
    if (latestInvoiceDetails) {
      latestInvoiceDetails.addEventListener("click", event => {
        if (event.target.closest("#editLatestInvoiceBtn") && activeLatestInvoice) {
          renderLatestInvoiceDetails(activeLatestInvoice, true);
          return;
        }

        if (event.target.closest("#cancelLatestInvoiceEditBtn") && activeLatestInvoice) {
          renderLatestInvoiceDetails(activeLatestInvoice, false);
          return;
        }

        const saveButton = event.target.closest("#saveLatestInvoiceEditBtn");
        if (saveButton) {
          saveLatestInvoiceEdit(saveButton);
        }
      });
    }
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
    loadInventoryProducts();
    loadStoredLatestInvoices();
    loadLatestInvoicesFromSheet();
    fetchTodaySales();
    updateOnlineControls();
    fixArabicInNode(document.body);


