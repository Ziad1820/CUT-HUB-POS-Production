(function () {
  const currentUser = typeof RomeoAuth !== "undefined" ? RomeoAuth.requireAuth() : null;
  if (!currentUser) return;

  const root = document.getElementById("dashboardRoot");
  const statusLine = document.getElementById("dashboardStatus");
  const privacyToggle = document.getElementById("privacyToggle");
  const languageToggle = document.getElementById("languageToggle");

  let isPrivate = false;
  let lastState = null;
  let activeDateKey = "";

  const LABELS = {
    ar: {
      live: "Ù„ÙˆØ­Ø© Ù…ØªØ§Ø¨Ø¹Ø© Ù…Ø¨Ø§Ø´Ø±Ø©",
      subtitle: "Ù†Ø¸Ø±Ø© Ø³Ø±ÙŠØ¹Ø© Ø¹Ù„Ù‰ Ù…Ø¨ÙŠØ¹Ø§Øª Ø§Ù„ÙŠÙˆÙ… ÙˆØ§Ù„Ø¹Ù…Ù„Ø§Ø¡ ÙˆØ§Ù„ØµØ§ÙÙŠ ÙˆØ£Ø¯Ø§Ø¡ Ø§Ù„ØµÙ†Ø§ÙŠØ¹ÙŠØ©.",
      today: "Ø§Ù„ÙŠÙˆÙ…",
      hide: "Ø¥Ø®ÙØ§Ø¡ Ø§Ù„Ø£Ø±Ù‚Ø§Ù…",
      show: "Ø¥Ø¸Ù‡Ø§Ø± Ø§Ù„Ø£Ø±Ù‚Ø§Ù…",
      todayInvoices: "Ø¹Ø¯Ø¯ ÙÙˆØ§ØªÙŠØ± Ø§Ù„ÙŠÙˆÙ…",
      todayCustomers: "Ø¹Ø¯Ø¯ Ø¹Ù…Ù„Ø§Ø¡ Ø§Ù„ÙŠÙˆÙ…",
      todaySales: "Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ù…Ø¨ÙŠØ¹Ø§Øª Ø§Ù„ÙŠÙˆÙ…",
      averageInvoice: "Ù…ØªÙˆØ³Ø· Ø§Ù„ÙØ§ØªÙˆØ±Ø©",
      staffToday: "Ø£Ø¯Ø§Ø¡ Ø§Ù„ØµÙ†Ø§ÙŠØ¹ÙŠØ© Ø§Ù„ÙŠÙˆÙ…",
      bestBarber: "Ø£ÙØ¶Ù„ ØµÙ†Ø§ÙŠØ¹ÙŠ Ø§Ù„ÙŠÙˆÙ…",
      barber: "Ø§Ù„ØµÙ†Ø§ÙŠØ¹ÙŠ",
      customers: "Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡",
      sales: "Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª",
      yesterdayCompare: "Ù…Ù‚Ø§Ø±Ù†Ø© Ø¨Ø§Ù„Ø£Ù…Ø³",
      yesterday: "Ø£Ù…Ø³",
      invoices: "Ø§Ù„ÙÙˆØ§ØªÙŠØ±",
      cashFlow: "Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª ÙˆØ§Ù„Ø³Ø­ÙˆØ¨Ø§Øª",
      expensesToday: "Ù…ØµØ±ÙˆÙØ§Øª Ø§Ù„ÙŠÙˆÙ…",
      withdrawalsToday: "Ø³Ø­ÙˆØ¨Ø§Øª Ø§Ù„ÙŠÙˆÙ…",
      netToday: "ØµØ§ÙÙŠ Ø§Ù„ÙŠÙˆÙ…",
      noData: "Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ù„ÙŠÙˆÙ… Ø­ØªÙ‰ Ø§Ù„Ø¢Ù†.",
      loading: "Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø£Ø±Ù‚Ø§Ù… Ø§Ù„Ø¯Ø§Ø´Ø¨ÙˆØ±Ø¯...",
      error: "ØªØ¹Ø°Ø± ØªØ­Ù…ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø¯Ø§Ø´Ø¨ÙˆØ±Ø¯.",
      menu: "Ø§Ù„Ù‚Ø§Ø¦Ù…Ø©",
      dashboard: "Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ…",
      cashier: "Ø§Ù„ÙƒØ§Ø´ÙŠØ±",
      invoicesPage: "Ø§Ù„ÙÙˆØ§ØªÙŠØ±",
      income: "Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¯Ø®Ù„",
      analysis: "ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª",
      closing: "ØªÙ‚ÙÙŠÙ„Ø© Ø§Ù„ÙŠÙˆÙ…",
      activity: "Ø³Ø¬Ù„ Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª",
      staffAccounting: "Ø­Ø³Ø§Ø¨Ø§Øª Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ†",
      access: "ØµÙ„Ø§Ø­ÙŠØ§Øª Ø§Ù„Ù†Ø¸Ø§Ù…",
      withdrawals: "Ø§Ù„Ø³Ø­ÙˆØ¨Ø§Øª",
      expenses: "Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª",
      inventory: "Ø§Ù„Ù…Ø®Ø²ÙˆÙ†",
      staffDiscount: "Ø®ØµÙˆÙ…Ø§Øª Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ†",
      attendance: "Ø§Ù„Ø­Ø¶ÙˆØ±",
      bookings: "Ø§Ù„Ø­Ø¬ÙˆØ²Ø§Øª",
      language: "Ø§Ù„Ù„ØºØ©",
      logout: "ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬"
    },
    en: {
      live: "Live dashboard",
      subtitle: "A fast daily view of sales, clients, net profit, and staff performance",
      today: "Today",
      hide: "Hide Numbers",
      show: "Show Numbers",
      todayInvoices: "Today Invoices",
      todayCustomers: "Today Customers",
      todaySales: "Today Sales",
      averageInvoice: "Average Invoice",
      staffToday: "Staff Today",
      bestBarber: "Best Barber Today",
      barber: "Barber",
      customers: "Customers",
      sales: "Sales",
      yesterdayCompare: "Compared With Yesterday",
      yesterday: "Yesterday",
      invoices: "Invoices",
      cashFlow: "Expenses & Withdrawals",
      expensesToday: "Today Expenses",
      withdrawalsToday: "Today Withdrawals",
      netToday: "Today Net",
      noData: "No dashboard data yet for today.",
      loading: "Loading dashboard numbers...",
      error: "Could not load dashboard data.",
      menu: "Menu",
      dashboard: "Dashboard",
      cashier: "Cashier",
      invoicesPage: "Invoices",
      income: "Income Statement",
      analysis: "Data Analysis",
      closing: "Daily Closing",
      activity: "Activity Log",
      staffAccounting: "Staff Accounting",
      access: "System Access",
      withdrawals: "Withdrawals",
      expenses: "Expenses",
      inventory: "Inventory",
      staffDiscount: "Staff Discount",
      attendance: "Attendance",
      bookings: "Bookings",
      language: "Language",
      logout: "Logout"
    }
  };

  LABELS.ar.subtitle = "نظرة سريعة على مبيعات اليوم والعملاء والصافي وأداء الموظفين.";
  LABELS.ar.staffToday = "أداء الموظفين اليوم";
  LABELS.ar.bestBarber = "أفضل موظف اليوم";
  LABELS.ar.barber = "الموظف";
  LABELS.ar.noData = "لا توجد بيانات للوحة التحكم اليوم.";

  function getLanguage() {
    return localStorage.getItem("romeo-pos-language") || "ar";
  }

  function t(key) {
    return (LABELS[getLanguage()] && LABELS[getLanguage()][key]) || LABELS.ar[key] || key;
  }

  function getLocale() {
    return "en-US";
  }

  function formatNumber(value) {
    return new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 0 }).format(Math.round(Number(value) || 0));
  }

  function formatMoney(value) {
    return `${formatNumber(value)} EGP`;
  }

  function dateKeyFromDate(date) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date);

    const values = {};
    parts.forEach(part => {
      if (part.type !== "literal") values[part.type] = part.value;
    });

    return `${values.year}-${values.month}-${values.day}`;
  }

  function dateFromDateKey(dateKey) {
    const parts = String(dateKey || "").split("-").map(Number);
    if (parts.length !== 3 || parts.some(part => !Number.isFinite(part))) {
      return new Date();
    }

    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function formatHeroDate(date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }

function getRelativeDateKey(offsetDays) {
  return dateKeyFromDate(new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000));
}

function padDatePart(value) {
  return String(value || "").padStart(2, "0");
}

function normalizeDigits(value) {
  return String(value || "").replace(/[\u0660-\u0669\u06F0-\u06F9]/g, digit => {
    const code = digit.charCodeAt(0);
    if (code >= 0x06F0) return String(code - 0x06F0);
    return String(code - 0x0660);
  });
}

function parseDateKey(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return dateKeyFromDate(value);
  }

  const text = normalizeDigits(String(value || "").trim());
  if (!text) return "";

  const ymd = text.match(/(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  if (ymd) {
    return `${ymd[1]}-${padDatePart(ymd[2])}-${padDatePart(ymd[3])}`;
  }

  const slashDate = text.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (slashDate) {
    const first = Number(slashDate[1]);
    const second = Number(slashDate[2]);
    const year = slashDate[3];
    const isMonthFirst = first <= 12 && second > 12;
    const day = isMonthFirst ? second : first;
    const month = isMonthFirst ? first : second;

    return `${year}-${padDatePart(month)}-${padDatePart(day)}`;
  }

  const monthNames = {
    jan: "01", january: "01",
    feb: "02", february: "02",
    mar: "03", march: "03",
    apr: "04", april: "04",
    may: "05",
    jun: "06", june: "06",
    jul: "07", july: "07",
    aug: "08", august: "08",
    sep: "09", sept: "09", september: "09",
    oct: "10", october: "10",
    nov: "11", november: "11",
    dec: "12", december: "12"
  };

  const dmyText = text.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/);
  if (dmyText) {
    const month = monthNames[dmyText[2].toLowerCase()];
    if (month) return `${dmyText[3]}-${month}-${padDatePart(dmyText[1])}`;
  }

  const mydText = text.match(/([A-Za-z]{3,9})\s+(\d{1,4})\s+(\d{1,4})/);
  if (mydText) {
    const month = monthNames[mydText[1].toLowerCase()];
    const firstNumber = Number(mydText[2]);
    const secondNumber = Number(mydText[3]);
    const year = firstNumber > 31 ? mydText[2] : mydText[3];
    const day = firstNumber > 31 ? mydText[3] : mydText[2];
    if (month && secondNumber) return `${year}-${month}-${padDatePart(day)}`;
  }

  const parsed = new Date(text.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? "" : dateKeyFromDate(parsed);
}

function getInvoiceDateCandidates(invoice) {
  if (!invoice) return "";

  return [
    invoice.dateKey,
    invoice.date,
    invoice.createdAt,
    invoice.invoiceDate,
    invoice.timestamp,
    invoice.createdOn,
    invoice.datetime,
    invoice.dateTime,
    invoice.rowDate,
    invoice.dateValue
  ].filter(value => value !== undefined && value !== null && value !== "");
}

function getInvoiceDateKey(invoice) {
  const candidates = getInvoiceDateCandidates(invoice);

  for (const value of candidates) {
    const key = parseDateKey(value);
    if (key) return key;
  }

  return "";
}

function invoiceMatchesDate(invoice, dateKey) {
  if (!invoice || !dateKey) return false;

  return getInvoiceDateCandidates(invoice).some(value => {
    const parsed = parseDateKey(value);
    return parsed === dateKey || String(value).trim().slice(0, 10) === dateKey;
  });
}

function getLegacyInvoiceDateKey(invoice) {
  if (!invoice) return "";
  return parseDateKey(invoice.dateKey || invoice.date || invoice.createdAt || invoice.invoiceDate || invoice.timestamp);
}

function getInvoicesForDate(invoices, dateKey) {
  return invoices.filter(invoice => invoiceMatchesDate(invoice, dateKey));
}

  function getPreviousDateKey(dateKey) {
    const parts = String(dateKey || "").split("-").map(Number);
    if (parts.length !== 3 || parts.some(part => !Number.isFinite(part))) {
      return getRelativeDateKey(-1);
    }

    const previousDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]) - 24 * 60 * 60 * 1000);
    return dateKeyFromDate(previousDate);
  }

  function toAmount(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function getCustomerIdentity(invoice, index) {
    const phone = String(invoice.customerPhone || "").replace(/\D/g, "");
    const name = String(invoice.customerName || "").trim().toLowerCase();
    return phone || name || `invoice-${index}`;
  }

  function getUniqueCustomerCount(invoices) {
    const unique = new Set();
    invoices.forEach((invoice, index) => unique.add(getCustomerIdentity(invoice, index)));
    return unique.size;
  }

  function calculateChange(todayValue, yesterdayValue) {
    const today = toAmount(todayValue);
    const yesterday = toAmount(yesterdayValue);
    if (!yesterday && !today) return 0;
    if (!yesterday) return 100;
    return ((today - yesterday) / yesterday) * 100;
  }

  function formatChange(value) {
    const rounded = Math.round(value);
    return `${rounded > 0 ? "+" : ""}${formatNumber(rounded)}%`;
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function getPreviewValue(preview, key, fallback) {
    const value = preview && preview[key];
    return value === undefined || value === null || value === "" ? fallback : toAmount(value);
  }

  function getPreviewValueAny(preview, keys, fallback) {
    for (const key of keys) {
      const value = preview && preview[key];
      if (value !== undefined && value !== null && value !== "") {
        return toAmount(value);
      }
    }

    return fallback;
  }

  async function fetchPreview(dateKey) {
    try {
      const result = await RomeoApi.request({
        action: "getDailyClosingPreview",
        date: dateKey,
        reportDate: dateKey
      });
      return result && result.preview ? result.preview : {};
    } catch (error) {
      return {};
    }
  }

  async function fetchDashboardTodayStats(dateKey) {
    try {
      const payload = { action: "dashboardTodayStats" };

      if (dateKey) {
        payload.date = dateKey;
        payload.reportDate = dateKey;
        payload.targetDate = dateKey;
      }

      const result = await RomeoApi.request(payload);

      return result && result.status === "success" ? result : {};
    } catch (error) {
      return {};
    }
  }

  function buildStaffRows(invoices) {
    const staffMap = new Map();

    invoices.forEach((invoice, index) => {
      const barber = String(invoice.barber || "").trim() || "-";
      if (!staffMap.has(barber)) {
        staffMap.set(barber, {
          barber,
          sales: 0,
          customers: new Set()
        });
      }

      const current = staffMap.get(barber);
      current.sales += toAmount(invoice.total);
      current.customers.add(getCustomerIdentity(invoice, index));
    });

    return Array.from(staffMap.values())
      .map(item => ({
        barber: item.barber,
        customers: item.customers.size,
        sales: item.sales
      }))
      .sort((a, b) => b.sales - a.sales || b.customers - a.customers || a.barber.localeCompare(b.barber));
  }

  function renderLabels() {
    const language = getLanguage();
    const direction = language === "en" ? "ltr" : "rtl";
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
    document.body.dir = direction;
    document.body.dataset.language = language;
    document.querySelectorAll("[data-label]").forEach(element => {
      element.textContent = t(element.dataset.label);
    });

    setText("heroKicker", t("live"));
    setText("heroSubtitle", t("subtitle"));
    const labelDate = activeDateKey ? dateFromDateKey(activeDateKey) : new Date();
    setText("todayLabel", `${t("today")} ${formatHeroDate(labelDate)}`);
    if (privacyToggle) privacyToggle.textContent = isPrivate ? t("show") : t("hide");

    const sidebar = document.getElementById("sidebar");
    if (sidebar) {
      const sidebarLabels = [
        ["dashboard.html", t("dashboard")],
        ["cashier.html", t("cashier")],
        ["invoices.html", t("invoicesPage")],
        ["income-statement.html", t("income")],
        ["data-analysis.html", t("analysis")],
        ["daily-closing.html", t("closing")],
        ["activity-log.html", t("activity")],
        ["staff-accounting.html", t("staffAccounting")],
        ["system-access.html", t("access")],
        ["withdrawals.html", t("withdrawals")],
        ["expenses.html", t("expenses")],
        ["enventory.html", t("inventory")],
        ["staff-discount.html", t("staffDiscount")],
        ["attendance.html", t("attendance")],
        ["bookings.html", t("bookings")]
      ];

      const heading = sidebar.querySelector("h3");
      if (heading) heading.textContent = t("menu");

      sidebarLabels.forEach(([href, label]) => {
        const link = sidebar.querySelector(`[data-href="${href}"]`);
        if (link) link.textContent = label;
      });

      const logout = document.getElementById("logoutBtn");
      if (logout) logout.textContent = t("logout");
      if (languageToggle) languageToggle.textContent = t("language");
    }
  }

  function renderChangePill(id, value) {
    const element = document.getElementById(id);
    if (!element) return;
    element.textContent = formatChange(value);
    element.classList.toggle("change-negative", value < 0);
    element.classList.toggle("change-positive", value >= 0);
  }

  function renderStaffTable(rows) {
    const body = document.getElementById("staffRows");
    if (!body) return;

    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="3">${t("noData")}</td></tr>`;
      return;
    }

    body.innerHTML = rows.map(row => `
      <tr>
        <td>${row.barber}</td>
        <td class="sensitive">${formatNumber(row.customers)}</td>
        <td class="sensitive">${formatMoney(row.sales)}</td>
      </tr>
    `).join("");
  }

  function renderState() {
    if (!lastState) return;

    renderLabels();

    const { today, yesterday, staffRows } = lastState;
    const averageInvoice = today.invoiceCount ? today.salesTotal / today.invoiceCount : 0;

    setText("todayInvoices", formatNumber(today.invoiceCount));
    setText("todayCustomers", formatNumber(today.customers));
    setText("todaySales", formatMoney(today.salesTotal));
    setText("averageInvoice", formatMoney(averageInvoice));

    setText("salesToday", formatMoney(today.salesTotal));
    setText("salesYesterday", formatMoney(yesterday.salesTotal));
    setText("customersToday", formatNumber(today.customers));
    setText("customersYesterday", formatNumber(yesterday.customers));
    setText("invoicesToday", formatNumber(today.invoiceCount));
    setText("invoicesYesterday", formatNumber(yesterday.invoiceCount));

    renderChangePill("salesChange", calculateChange(today.salesTotal, yesterday.salesTotal));
    renderChangePill("customersChange", calculateChange(today.customers, yesterday.customers));
    renderChangePill("invoicesChange", calculateChange(today.invoiceCount, yesterday.invoiceCount));

    setText("todayExpenses", formatMoney(today.expensesTotal));
    setText("todayWithdrawals", formatMoney(today.withdrawalsTotal));
    setText("todayNet", formatMoney(today.netTotal));

    const best = staffRows[0];
    setText("bestBarberName", best ? best.barber : "-");
    setText("bestBarberMeta", best ? `\u200E${formatNumber(best.customers)} customers | ${formatMoney(best.sales)}` : "-");
    renderStaffTable(staffRows);
  }

  function closeLanguageMenu() {
    const menu = document.getElementById("dashboardLanguageMenu");
    if (menu) menu.classList.remove("active");
  }

  function setDashboardLanguage(language) {
    localStorage.setItem("romeo-pos-language", language);
    if (window.RomeoLanguage && typeof RomeoLanguage.applyLanguage === "function") {
      RomeoLanguage.applyLanguage(language);
    }
    if (lastState) {
      renderState();
    } else {
      renderLabels();
    }
    renderLanguageMenu();
    closeLanguageMenu();
  }

  function renderLanguageMenu() {
    if (!languageToggle) return;

    let block = document.getElementById("dashboardLanguageBlock");
    if (!block) {
      block = document.createElement("div");
      block.id = "dashboardLanguageBlock";
      block.className = "dashboard-language-block";
    }

    const logoutButton = document.getElementById("logoutBtn");
    if (logoutButton && block.parentElement !== logoutButton.parentElement) {
      logoutButton.insertAdjacentElement("beforebegin", block);
    } else if (logoutButton && block.nextElementSibling !== logoutButton) {
      logoutButton.insertAdjacentElement("beforebegin", block);
    } else if (!block.parentElement) {
      languageToggle.insertAdjacentElement("beforebegin", block);
    }

    if (languageToggle.parentElement !== block) {
      block.insertBefore(languageToggle, block.firstChild);
    }

    let menu = document.getElementById("dashboardLanguageMenu");
    if (!menu) {
      menu = document.createElement("div");
      menu.id = "dashboardLanguageMenu";
      menu.className = "dashboard-language-menu";
      menu.innerHTML = `
        <div class="language-menu-options">
          <button type="button" data-language-choice="ar">Ø¹Ø±Ø¨ÙŠ</button>
          <button type="button" data-language-choice="en">English</button>
        </div>
      `;
      block.appendChild(menu);
      menu.addEventListener("click", event => {
        const choice = event.target.closest("[data-language-choice]");
        if (!choice) return;
        event.preventDefault();
        setDashboardLanguage(choice.dataset.languageChoice);
      });
    }

    const currentLanguage = getLanguage();
    menu.querySelectorAll("[data-language-choice]").forEach(button => {
      button.classList.toggle("active", button.dataset.languageChoice === currentLanguage);
    });
  }

async function loadDashboard() {
  console.log("loadDashboard started");

  if (statusLine) statusLine.textContent = t("loading");

  try {
    const requestedTodayKey = getRelativeDateKey(0);

    const [invoiceResponse, todayStatsResponse, todayPreviewResponse, yesterdayPreviewResponse] =
      await Promise.allSettled([
        RomeoApi.request({ action: "getInvoices" }),
        fetchDashboardTodayStats(requestedTodayKey),
        fetchPreview(requestedTodayKey),
        fetchPreview(getPreviousDateKey(requestedTodayKey))
      ]);

    const invoiceResult = invoiceResponse.status === "fulfilled" ? invoiceResponse.value : {};
    const todayStats = todayStatsResponse.status === "fulfilled" ? todayStatsResponse.value : {};
    const todayKey = todayStats.dateKey || requestedTodayKey;
    const yesterdayKey = getPreviousDateKey(todayKey);
    activeDateKey = todayKey;

    const todayPreview = todayPreviewResponse.status === "fulfilled" ? todayPreviewResponse.value : {};
    const yesterdayPreview = yesterdayPreviewResponse.status === "fulfilled" ? yesterdayPreviewResponse.value : {};

    console.log("invoiceResponse", invoiceResponse);
    console.log("todayStatsResponse", todayStatsResponse);
    console.log("invoiceResult", invoiceResult);
    console.log("todayStats", todayStats);
    console.log("todayPreview", todayPreview);

    const invoices = Array.isArray(invoiceResult.invoices)
      ? invoiceResult.invoices
      : (Array.isArray(todayStats.invoices) ? todayStats.invoices : []);

    const todayInvoices = getInvoicesForDate(invoices, todayKey);
    const yesterdayInvoices = getInvoicesForDate(invoices, yesterdayKey);

    const todaySalesFallback = todayInvoices.reduce((sum, invoice) => sum + toAmount(invoice.total), 0);
    const yesterdaySalesFallback = yesterdayInvoices.reduce((sum, invoice) => sum + toAmount(invoice.total), 0);

    const todaySalesTotal = getPreviewValue(todayPreview, "salesTotal", todaySalesFallback);
    const todayExpensesTotal = getPreviewValue(todayPreview, "expensesTotal", 0);
    const todayWithdrawalsTotal = getPreviewValue(todayPreview, "withdrawalsTotal", 0);

    const statsInvoiceCount = getPreviewValueAny(
      todayStats,
      ["todayInvoices", "todayInvoiceCount", "invoiceCount", "invoicesCount", "totalInvoices"],
      0
    );

    const statsCustomerCount = getPreviewValueAny(
      todayStats,
      ["todayCustomers", "todayCustomerCount", "customerCount", "customersCount", "totalCustomers"],
      0
    );

    const statsSalesTotal = getPreviewValueAny(
      todayStats,
      ["todaySales", "todaySalesTotal", "salesTotal", "totalSales"],
      todaySalesTotal
    );

    const todayInvoiceCount = statsInvoiceCount || todayInvoices.length;
    const todayCustomerCount = statsCustomerCount || getUniqueCustomerCount(todayInvoices);
    const finalTodaySalesTotal = statsSalesTotal || todaySalesFallback || todaySalesTotal;

    lastState = {
      today: {
        invoiceCount: todayInvoiceCount,
        customers: todayCustomerCount,
        salesTotal: finalTodaySalesTotal,
        expensesTotal: todayExpensesTotal,
        withdrawalsTotal: todayWithdrawalsTotal,
        netTotal: getPreviewValue(
          todayPreview,
          "netTotal",
          finalTodaySalesTotal - todayExpensesTotal - todayWithdrawalsTotal
        )
      },
      yesterday: {
        invoiceCount: yesterdayInvoices.length,
        customers: getUniqueCustomerCount(yesterdayInvoices),
        salesTotal: getPreviewValue(yesterdayPreview, "salesTotal", yesterdaySalesFallback)
      },
      staffRows: buildStaffRows(todayInvoices)
    };

    renderState();

    console.log("renderState executed");
    console.log("lastState", lastState);

    const hasDashboardNumbers =
      lastState.today.invoiceCount ||
      lastState.today.salesTotal ||
      lastState.today.expensesTotal ||
      lastState.today.withdrawalsTotal;

    if (statusLine) {
      statusLine.textContent = hasDashboardNumbers ? "" : `${t("noData")} (${todayKey})`;
    }
  } catch (error) {
    console.error(error);
    if (statusLine) statusLine.textContent = t("error");
  }
}
  if (privacyToggle) {
    privacyToggle.addEventListener("click", () => {
      isPrivate = !isPrivate;
      if (root) root.classList.toggle("private", isPrivate);
      renderLabels();
    });
  }

  if (languageToggle) {
    languageToggle.addEventListener("click", event => {
      event.preventDefault();
      renderLanguageMenu();
      document.getElementById("dashboardLanguageMenu")?.classList.toggle("active");
    });
  }

  document.addEventListener("click", event => {
    if (
      event.target.closest("#languageToggle") ||
      event.target.closest("#dashboardLanguageMenu")
    ) {
      return;
    }

    closeLanguageMenu();
  });

  renderLabels();
  renderLanguageMenu();
  loadDashboard();
})();

