(function () {
  const currentUser = window.RomeoAuth ? RomeoAuth.requireAuth() : null;
  if (!currentUser) return;

  const root = document.getElementById("dashboardRoot");
  const statusLine = document.getElementById("dashboardStatus");
  const privacyToggle = document.getElementById("privacyToggle");
  const languageToggle = document.getElementById("languageToggle");

  let isPrivate = false;
  let lastState = null;

  const LABELS = {
    ar: {
      live: "لوحة متابعة مباشرة",
      subtitle: "نظرة سريعة على مبيعات اليوم والعملاء والصافي وأداء الصنايعية.",
      today: "اليوم",
      hide: "إخفاء الأرقام",
      show: "إظهار الأرقام",
      todayInvoices: "عدد فواتير اليوم",
      todayCustomers: "عدد عملاء اليوم",
      todaySales: "إجمالي مبيعات اليوم",
      averageInvoice: "متوسط الفاتورة",
      staffToday: "أداء الصنايعية اليوم",
      bestBarber: "أفضل صنايعي اليوم",
      barber: "الصنايعي",
      customers: "العملاء",
      sales: "المبيعات",
      yesterdayCompare: "مقارنة بالأمس",
      yesterday: "أمس",
      invoices: "الفواتير",
      cashFlow: "المصروفات والسحوبات",
      expensesToday: "مصروفات اليوم",
      withdrawalsToday: "سحوبات اليوم",
      netToday: "صافي اليوم",
      noData: "لا توجد بيانات لليوم حتى الآن.",
      loading: "جاري تحميل أرقام الداشبورد...",
      error: "تعذر تحميل بيانات الداشبورد.",
      menu: "القائمة",
      dashboard: "لوحة التحكم",
      cashier: "الكاشير",
      invoicesPage: "الفواتير",
      income: "قائمة الدخل",
      analysis: "تحليل البيانات",
      closing: "تقفيلة اليوم",
      activity: "سجل العمليات",
      staffAccounting: "حسابات الموظفين",
      access: "صلاحيات النظام",
      withdrawals: "السحوبات",
      expenses: "المصروفات",
      inventory: "المخزون",
      staffDiscount: "خصومات الموظفين",
      attendance: "الحضور",
      bookings: "الحجوزات",
      language: "Language",
      logout: "تسجيل الخروج"
    },
    en: {
      live: "Live dashboard",
      subtitle: "A fast daily view of sales, clients, net profit, and staff performance.",
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

  function getLanguage() {
    return localStorage.getItem("romeo-pos-language") || "ar";
  }

  function t(key) {
    return (LABELS[getLanguage()] && LABELS[getLanguage()][key]) || LABELS.ar[key] || key;
  }

  function getLocale() {
    return getLanguage() === "en" ? "en-US" : "ar-EG";
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

  function getRelativeDateKey(offsetDays) {
    return dateKeyFromDate(new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000));
  }

  function getInvoiceDateKey(invoice) {
    return String(invoice.dateKey || invoice.date || "").slice(0, 10);
  }

  function getInvoicesForDate(invoices, dateKey) {
    return invoices.filter(invoice => getInvoiceDateKey(invoice) === dateKey);
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
    document.documentElement.lang = getLanguage();
    document.documentElement.dir = getLanguage() === "en" ? "ltr" : "rtl";
    document.querySelectorAll("[data-label]").forEach(element => {
      element.textContent = t(element.dataset.label);
    });

    setText("heroKicker", t("live"));
    setText("heroSubtitle", t("subtitle"));
    setText("todayLabel", `${t("today")} ${new Date().toLocaleDateString(getLocale(), { day: "2-digit", month: "short", year: "numeric" })}`);
    if (privacyToggle) privacyToggle.textContent = isPrivate ? t("show") : t("hide");

    const sidebar = document.getElementById("sidebar");
    if (sidebar) {
      const sidebarLabels = [
        ["dashboard.html", t("dashboard")],
        ["index.html", t("cashier")],
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
    setText("bestBarberMeta", best ? `${formatNumber(best.customers)} ${t("customers")} | ${formatMoney(best.sales)}` : "-");
    renderStaffTable(staffRows);
  }

  async function loadDashboard() {
    if (statusLine) statusLine.textContent = t("loading");

    try {
      const invoiceResult = await RomeoApi.request({ action: "getInvoices" });
      const invoices = Array.isArray(invoiceResult.invoices) ? invoiceResult.invoices : [];
      const todayKey = getRelativeDateKey(0);
      const yesterdayKey = getPreviousDateKey(todayKey);
      const [todayPreviewResponse, yesterdayPreviewResponse] = await Promise.allSettled([
        fetchPreview(todayKey),
        fetchPreview(yesterdayKey)
      ]);

      const todayPreview = todayPreviewResponse.status === "fulfilled" ? todayPreviewResponse.value : {};
      const yesterdayPreview = yesterdayPreviewResponse.status === "fulfilled" ? yesterdayPreviewResponse.value : {};
      const todayInvoices = getInvoicesForDate(invoices, todayKey);
      const yesterdayInvoices = getInvoicesForDate(invoices, yesterdayKey);

      const todaySalesFallback = todayInvoices.reduce((sum, invoice) => sum + toAmount(invoice.total), 0);
      const yesterdaySalesFallback = yesterdayInvoices.reduce((sum, invoice) => sum + toAmount(invoice.total), 0);

      const todaySalesTotal = getPreviewValue(todayPreview, "salesTotal", todaySalesFallback);
      const todayExpensesTotal = getPreviewValue(todayPreview, "expensesTotal", 0);
      const todayWithdrawalsTotal = getPreviewValue(todayPreview, "withdrawalsTotal", 0);

      lastState = {
        today: {
          invoiceCount: todayInvoices.length,
          customers: getUniqueCustomerCount(todayInvoices),
          salesTotal: todaySalesTotal,
          expensesTotal: todayExpensesTotal,
          withdrawalsTotal: todayWithdrawalsTotal,
          netTotal: getPreviewValue(todayPreview, "netTotal", todaySalesTotal - todayExpensesTotal - todayWithdrawalsTotal)
        },
        yesterday: {
          invoiceCount: yesterdayInvoices.length,
          customers: getUniqueCustomerCount(yesterdayInvoices),
          salesTotal: getPreviewValue(yesterdayPreview, "salesTotal", yesterdaySalesFallback)
        },
        staffRows: buildStaffRows(todayInvoices)
      };

      renderState();
      const hasDashboardNumbers = todayInvoices.length || todaySalesTotal || todayExpensesTotal || todayWithdrawalsTotal;
      if (statusLine) statusLine.textContent = hasDashboardNumbers ? "" : `${t("noData")} (${todayKey})`;
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
      const nextLanguage = getLanguage() === "en" ? "ar" : "en";
      localStorage.setItem("romeo-pos-language", nextLanguage);
      renderState();
    });
  }

  renderLabels();
  loadDashboard();
})();
