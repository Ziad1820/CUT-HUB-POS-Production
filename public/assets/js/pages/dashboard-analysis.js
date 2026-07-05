(function () {
  const root = document.getElementById("dashboardAnalytics");
  if (!root) return;

  if (window.RomeoAuth && !RomeoAuth.hasPermission("view_data_analysis")) {
    root.classList.add("hidden");
    return;
  }

  const elements = {
    fromDate: document.getElementById("analysisFromDate"),
    toDate: document.getElementById("analysisToDate"),
    barberFilter: document.getElementById("analysisBarberFilter"),
    paymentFilter: document.getElementById("analysisPaymentFilter"),
    refreshBtn: document.getElementById("analysisRefreshBtn"),
    status: document.getElementById("analysisStatus"),
    totalSales: document.getElementById("analysisTotalSales"),
    invoiceCount: document.getElementById("analysisInvoiceCount"),
    averageInvoice: document.getElementById("analysisAverageInvoice"),
    uniqueCustomers: document.getElementById("analysisUniqueCustomers"),
    expectedMonthlyCustomers: document.getElementById("analysisExpectedMonthlyCustomers"),
    expectedMonthlySales: document.getElementById("analysisExpectedMonthlySales"),
    expectedDailyCustomers: document.getElementById("analysisExpectedDailyCustomers"),
    averageDailySales: document.getElementById("analysisAverageDailySales"),
    knownCustomers: document.getElementById("analysisKnownCustomers"),
    walkInInvoices: document.getElementById("analysisWalkInInvoices"),
    paymentBars: document.getElementById("analysisPaymentBars"),
    serviceBars: document.getElementById("analysisServiceBars"),
    dailyBars: document.getElementById("analysisDailyBars"),
    packageBars: document.getElementById("analysisPackageBars"),
    barberRows: document.getElementById("analysisBarberRows"),
    customerBars: document.getElementById("analysisCustomerBars"),
    insightsList: document.getElementById("analysisInsightsList")
  };

  const PAYMENT_TRANSLATIONS = {
    "نقدي": "Cash",
    "انستا باي": "Instapay",
    "فودافون كاش": "Vodafone Cash",
    "فيزا": "Visa"
  };

  let invoices = [];
  let filteredInvoices = [];

  function getLanguage() {
    return localStorage.getItem("romeo-pos-language") || "ar";
  }

  function localize(ar, en) {
    return getLanguage() === "en" ? en : ar;
  }

  function setStaticText(selector, arText, enText) {
    const element = document.querySelector(selector);
    if (element) element.textContent = localize(arText, enText);
  }

  function setMetricLabel(valueId, arText, enText) {
    const value = document.getElementById(valueId);
    const label = value?.previousElementSibling;
    if (label) label.textContent = localize(arText, enText);
  }

  function applyAnalyticsLanguage() {
    setStaticText("#dashboardAnalytics .analytics-header h2", "تحليل البيانات", "Data Analysis");
    setStaticText("#dashboardAnalytics .analytics-header p", "تحليل كامل للمبيعات والموظفين والعملاء والأداء الشهري.", "Full sales, staff, customers, and monthly performance analysis.");
    setStaticText("label[for='analysisFromDate']", "من تاريخ", "From Date");
    setStaticText("label[for='analysisToDate']", "إلى تاريخ", "To Date");
    setStaticText("label[for='analysisBarberFilter']", "الموظف", "Employee");
    setStaticText("label[for='analysisPaymentFilter']", "طريقة الدفع", "Payment Method");
    if (elements.refreshBtn && !elements.refreshBtn.disabled) elements.refreshBtn.textContent = localize("تحديث", "Refresh");

    setStaticText("[data-analysis-tab='overview']", "نظرة عامة", "Overview");
    setStaticText("[data-analysis-tab='sales']", "المبيعات", "Sales");
    setStaticText("[data-analysis-tab='staff']", "الموظفون", "Staff");
    setStaticText("[data-analysis-tab='customers']", "العملاء", "Customers");
    setStaticText("[data-analysis-tab='monthly']", "تحليل شهري", "Monthly Analysis");

    setMetricLabel("analysisTotalSales", "إجمالي المبيعات", "Total Sales");
    setMetricLabel("analysisInvoiceCount", "عدد الفواتير", "Invoices");
    setMetricLabel("analysisAverageInvoice", "متوسط الفاتورة", "Average Invoice");
    setMetricLabel("analysisUniqueCustomers", "عملاء مختلفون", "Unique Customers");
    setMetricLabel("analysisExpectedMonthlyCustomers", "العملاء المتوقعون شهريا", "Expected Monthly Customers");
    setMetricLabel("analysisExpectedMonthlySales", "المبيعات الشهرية المتوقعة", "Expected Monthly Sales");
    setMetricLabel("analysisExpectedDailyCustomers", "العملاء اليوميون المتوقعون", "Expected Daily Customers");
    setMetricLabel("analysisAverageDailySales", "متوسط المبيعات باليوم", "Average Daily Sales");
    setMetricLabel("analysisKnownCustomers", "عملاء معروفون", "Known Customers");
    setMetricLabel("analysisWalkInInvoices", "فواتير بدون بيانات عميل", "Walk-in Invoices");
    setMetricLabel("monthlyAvgRevenue", "متوسط الإيراد الشهري", "Average Revenue / Month");
    setMetricLabel("monthlyAvgGrowth", "متوسط النمو السنوي", "Average Growth / Year");
    setMetricLabel("monthlyExpensePercent", "نسبة المصروفات من المبيعات", "Expense % of Sales");
    setMetricLabel("monthlyProfitMargin", "هامش الربح", "Profit Margin");
    setMetricLabel("monthlyCustomerGrowth", "نمو العملاء", "Customer Growth");
    setMetricLabel("monthlyInvoiceRate", "معدل الفواتير", "Invoice Rate");
    setMetricLabel("monthlyRevenuePerBarber", "الإيراد لكل موظف", "Revenue / Employee");
    setMetricLabel("monthlyInventoryCost", "نسبة تكلفة المخزون", "Inventory Cost %");

    setStaticText("#analysisTabOverview .analytics-subpanel:nth-child(1) .analytics-title", "توزيع طرق الدفع", "Payment Mix");
    setStaticText("#analysisTabOverview .analytics-subpanel:nth-child(2) .analytics-title", "مؤشرات ذكية", "Smart Insights");
    setStaticText("#analysisTabSales .analytics-subpanel:nth-child(1) .analytics-title", "أفضل الخدمات", "Top Services");
    setStaticText("#analysisTabSales .analytics-subpanel:nth-child(2) .analytics-title", "اتجاه المبيعات اليومي", "Daily Sales Trend");
    setStaticText("#analysisTabSales .analytics-subpanel:nth-child(3) .analytics-title", "أفضل باقات الفواتير", "Top Invoice Packages");
    setStaticText("#analysisTabStaff .analytics-title", "أداء الموظفين", "Employee Performance");
    setStaticText("#analysisTabCustomers .analytics-subpanel:nth-child(1) .analytics-title", "ملخص العملاء", "Customer Snapshot");
    setStaticText("#analysisTabCustomers .analytics-subpanel:nth-child(2) .analytics-title", "أفضل العملاء", "Top Customers");
    setStaticText("#analysisTabMonthly .analytics-subpanel:nth-child(1) .analytics-title", "الاتجاه الشهري", "Monthly Trend");
    setStaticText("#analysisTabMonthly .analytics-subpanel:nth-child(2) .analytics-title", "اتجاه الأرباح", "Profit Trend");
    setStaticText("#analysisTabMonthly .analytics-subpanel:nth-child(3) .analytics-title", "المبيعات مقابل المصروفات", "Sales vs Expenses");
    setStaticText("#analysisTabMonthly .analytics-subpanel:nth-child(4) .analytics-title", "أفضل شهر أداء", "Top Performing Month");
    setStaticText("#analysisTabMonthly .analytics-subpanel:nth-child(5) .analytics-title", "العائد على الأصول والمؤشرات", "ROA & Indicators");
    setStaticText("#analysisTabMonthly .analytics-subpanel:nth-child(6) .analytics-title", "مقارنة شهر بشهر", "Month by Month Comparison");

    const staffHeaders = ["الموظف", "المبيعات", "الفواتير", "المتوسط", "النسبة", "الفواتير الشهرية المتوقعة", "الفواتير اليومية المتوقعة", "المبيعات الشهرية المتوقعة", "المبيعات اليومية المتوقعة", "التقييم"];
    const staffHeadersEn = ["Employee", "Sales", "Invoices", "Average", "Share", "Expected Monthly Invoices", "Expected Daily Invoices", "Expected Monthly Sales", "Expected Daily Sales", "Rating"];
    document.querySelectorAll("#analysisTabStaff thead th").forEach((th, index) => {
      th.textContent = localize(staffHeaders[index], staffHeadersEn[index]);
    });

    const monthlyHeaders = ["الشهر", "المبيعات", "المصروفات", "السحوبات", "صافي الربح", "العملاء", "الفواتير", "متوسط الفاتورة", "النمو"];
    const monthlyHeadersEn = ["Month", "Sales", "Expenses", "Withdrawals", "Net Profit", "Customers", "Invoices", "Average Invoice", "Growth"];
    document.querySelectorAll("#analysisTabMonthly thead th").forEach((th, index) => {
      th.textContent = localize(monthlyHeaders[index], monthlyHeadersEn[index]);
    });
  }

  function formatNumber(value, digits = 0) {
    return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: digits });
  }

  function formatMoney(value) {
    return `${formatNumber(Math.round(Number(value) || 0))} EGP`;
  }

  function parseAmount(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    let text = String(value || "").trim();
    if (!text) return 0;
    if (text.includes(",") && !text.includes(".")) {
      text = /,\d{1,2}$/.test(text) ? text.replace(",", ".") : text.replace(/,/g, "");
    } else {
      text = text.replace(/,/g, "");
    }
    const parsed = parseFloat(text.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function normalize(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function getDateKey(value) {
    const text = String(value || "").trim();
    const match = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    return match ? `${match[1]}-${String(match[2]).padStart(2, "0")}-${String(match[3]).padStart(2, "0")}` : "";
  }

  function getInvoiceDate(invoice) {
    return invoice.dateKey || getDateKey(invoice.date);
  }

  function toDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function getReferenceDate() {
    const candidate = elements.toDate.value || elements.fromDate.value || toDateKey(new Date());
    const match = String(candidate || "").match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!match) return new Date();
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  function getMonthProjectionContext() {
    const referenceDate = getReferenceDate();
    const year = referenceDate.getFullYear();
    const monthIndex = referenceDate.getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === monthIndex;
    const elapsedDays = Math.max(1, Math.min(isCurrentMonth ? today.getDate() : referenceDate.getDate(), daysInMonth));

    return {
      monthPrefix: `${year}-${String(monthIndex + 1).padStart(2, "0")}-`,
      daysInMonth,
      elapsedDays
    };
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function splitServices(value) {
    return normalize(value)
      .split(/[،,]/)
      .map(item => normalize(item))
      .filter(Boolean);
  }

  function getPaymentLabel(value) {
    const payment = normalize(value || localize("غير محدد", "Unknown"));
    const labels = {
      "نقدي": { ar: "نقدي", en: "Cash" },
      "Cash": { ar: "نقدي", en: "Cash" },
      "انستا باي": { ar: "انستا باي", en: "Instapay" },
      "Instapay": { ar: "انستا باي", en: "Instapay" },
      "فودافون كاش": { ar: "فودافون كاش", en: "Vodafone Cash" },
      "Vodafone Cash": { ar: "فودافون كاش", en: "Vodafone Cash" },
      "فيزا": { ar: "فيزا", en: "Visa" },
      "Visa": { ar: "فيزا", en: "Visa" }
    };
    return labels[payment] ? labels[payment][getLanguage()] : payment;
  }

  function groupBy(items, keyGetter) {
    const map = new Map();
    items.forEach(item => {
      const key = keyGetter(item);
      if (!map.has(key)) map.set(key, { key, total: 0, count: 0 });
      const entry = map.get(key);
      entry.total += parseAmount(item.total);
      entry.count += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total || b.count - a.count);
  }

  function renderBars(container, rows, options = {}) {
    if (!container) return;
    container.innerHTML = "";
    if (!rows.length) {
      container.innerHTML = `<div class="analytics-empty">${localize("لا توجد بيانات في الفترة الحالية.", "No data for the selected period.")}</div>`;
      return;
    }

    const maxValue = Math.max(...rows.map(row => options.valueGetter ? options.valueGetter(row) : row.total), 1);
    rows.slice(0, options.limit || 8).forEach(row => {
      const value = options.valueGetter ? options.valueGetter(row) : row.total;
      const percent = Math.max(4, Math.round((value / maxValue) * 100));
      const node = document.createElement("div");
      node.className = "analytics-bar-row";
      node.innerHTML = `
        <div class="analytics-bar-label">${escapeHtml(row.key)}</div>
        <div class="analytics-bar-value">${escapeHtml(options.formatValue ? options.formatValue(row) : formatMoney(row.total))}</div>
        <div class="analytics-bar-track"><div class="analytics-bar-fill" style="width:${percent}%"></div></div>
      `;
      container.appendChild(node);
    });
  }

  function renderSummary(items) {
    const total = items.reduce((sum, invoice) => sum + parseAmount(invoice.total), 0);
    const average = items.length ? total / items.length : 0;
    const customers = new Set(items.map(invoice => normalize(invoice.customerPhone || invoice.customerName)).filter(Boolean));
    const known = items.filter(invoice => normalize(invoice.customerName) || normalize(invoice.customerPhone)).length;

    elements.totalSales.textContent = formatMoney(total);
    elements.invoiceCount.textContent = formatNumber(items.length);
    elements.averageInvoice.textContent = formatMoney(average);
    elements.uniqueCustomers.textContent = formatNumber(customers.size);
    elements.knownCustomers.textContent = formatNumber(known);
    elements.walkInInvoices.textContent = formatNumber(Math.max(items.length - known, 0));
    renderMonthlyForecast(items);
  }

  function renderMonthlyForecast(items) {
    const { monthPrefix, daysInMonth, elapsedDays } = getMonthProjectionContext();
    const monthItems = items.filter(invoice => String(getInvoiceDate(invoice) || "").startsWith(monthPrefix));
    const monthlySalesSoFar = monthItems.reduce((sum, invoice) => sum + parseAmount(invoice.total), 0);
    const monthlyCustomersSoFar = new Set(monthItems.map(invoice => normalize(invoice.customerPhone || invoice.customerName)).filter(Boolean)).size;
    const expectedMonthlyCustomers = Math.round((monthlyCustomersSoFar / elapsedDays) * daysInMonth);
    const expectedMonthlySales = Math.round((monthlySalesSoFar / elapsedDays) * daysInMonth);
    const expectedDailyCustomers = daysInMonth ? expectedMonthlyCustomers / daysInMonth : 0;
    const averageDailySales = elapsedDays ? monthlySalesSoFar / elapsedDays : 0;

    elements.expectedMonthlyCustomers.textContent = formatNumber(expectedMonthlyCustomers);
    elements.expectedMonthlySales.textContent = formatMoney(expectedMonthlySales);
    elements.expectedDailyCustomers.textContent = formatNumber(Math.round(expectedDailyCustomers));
    if (elements.averageDailySales) {
      elements.averageDailySales.textContent = formatMoney(averageDailySales);
    }
  }

  function renderPaymentMix(items) {
    renderBars(
      elements.paymentBars,
      groupBy(items, invoice => getPaymentLabel(invoice.paymentMethod || invoice.payment || localize("غير محدد", "Unknown"))),
      { limit: 6 }
    );
  }

  function renderServices(items) {
    const serviceMap = new Map();
    items.forEach(invoice => {
      splitServices(invoice.services).forEach(service => {
        if (!serviceMap.has(service)) serviceMap.set(service, { key: service, total: 0, count: 0 });
        const entry = serviceMap.get(service);
        entry.count += 1;
        entry.total += parseAmount(invoice.total);
      });
    });
    const rows = Array.from(serviceMap.values()).sort((a, b) => b.count - a.count || b.total - a.total);
    renderBars(elements.serviceBars, rows, {
      limit: 10,
      valueGetter: row => row.count,
      formatValue: row => `${formatNumber(row.count)} ${localize("مرة", "times")}`
    });
  }

  function renderServicePackages(items) {
    const packageMap = new Map();
    items.forEach(invoice => {
      const services = splitServices(invoice.services);
      if (services.length < 2) return;
      const packageName = services.join(" + ");
      if (!packageMap.has(packageName)) packageMap.set(packageName, { key: packageName, total: 0, count: 0 });
      const entry = packageMap.get(packageName);
      entry.count += 1;
      entry.total += parseAmount(invoice.total);
    });
    const rows = Array.from(packageMap.values()).sort((a, b) => b.count - a.count || b.total - a.total);
    renderBars(elements.packageBars, rows, {
      limit: 10,
      valueGetter: row => row.count,
      formatValue: row => `${formatNumber(row.count)} ${localize("مرة", "times")} / ${formatMoney(row.total)}`
    });
  }

  function renderDailyTrend(items) {
    const rows = groupBy(items, invoice => getInvoiceDate(invoice) || localize("بدون تاريخ", "No date"))
      .sort((a, b) => String(a.key).localeCompare(String(b.key)));
    renderBars(elements.dailyBars, rows, { limit: 12 });
  }

  function renderBarbers(items) {
    const total = items.reduce((sum, item) => sum + parseAmount(item.total), 0);
    const rows = groupBy(items, invoice => normalize(invoice.barber) || localize("غير محدد", "Unknown"));
    const { monthPrefix, daysInMonth, elapsedDays } = getMonthProjectionContext();
    const monthRows = groupBy(
      items.filter(invoice => String(getInvoiceDate(invoice) || "").startsWith(monthPrefix)),
      invoice => normalize(invoice.barber) || localize("غير محدد", "Unknown")
    );
    const monthMap = new Map(monthRows.map(row => [row.key, row]));

    if (!rows.length) {
      elements.barberRows.innerHTML = `<tr><td colspan="10" class="analytics-empty">${localize("لا توجد بيانات في الفترة الحالية.", "No data for the selected period.")}</td></tr>`;
      return;
    }

    const enrichedRows = rows.map(row => {
      const average = row.count ? row.total / row.count : 0;
      const share = total ? Math.round((row.total / total) * 100) : 0;
      const monthRow = monthMap.get(row.key) || { total: 0, count: 0 };
      const expectedMonthlyInvoices = Math.round((monthRow.count / elapsedDays) * daysInMonth);
      const expectedMonthlySales = Math.round((monthRow.total / elapsedDays) * daysInMonth);
      return {
        ...row,
        average,
        share,
        expectedMonthlyInvoices,
        expectedDailyInvoices: daysInMonth ? expectedMonthlyInvoices / daysInMonth : 0,
        expectedMonthlySales,
        expectedDailySales: daysInMonth ? expectedMonthlySales / daysInMonth : 0
      };
    });

    const maxExpectedInvoices = Math.max(...enrichedRows.map(row => row.expectedMonthlyInvoices), 1);
    const maxExpectedSales = Math.max(...enrichedRows.map(row => row.expectedMonthlySales), 1);

    elements.barberRows.innerHTML = enrichedRows.map(row => {
      const score = Math.round(((row.expectedMonthlySales / maxExpectedSales) * 70) + ((row.expectedMonthlyInvoices / maxExpectedInvoices) * 30));
      const rating = score >= 85 ? localize("ممتاز", "Excellent") : score >= 65 ? localize("قوي", "Strong") : score >= 40 ? localize("متوسط", "Average") : localize("منخفض", "Low");
      return `
        <tr>
          <td>${escapeHtml(row.key)}</td>
          <td class="amount">${formatMoney(row.total)}</td>
          <td>${formatNumber(row.count)}</td>
          <td class="amount">${formatMoney(row.average)}</td>
          <td>${formatNumber(row.share)}%</td>
          <td>${formatNumber(row.expectedMonthlyInvoices)}</td>
          <td>${formatNumber(row.expectedDailyInvoices, 1)}</td>
          <td class="amount">${formatMoney(row.expectedMonthlySales)}</td>
          <td class="amount">${formatMoney(row.expectedDailySales)}</td>
          <td>${escapeHtml(rating)} (${formatNumber(score)}%)</td>
        </tr>
      `;
    }).join("");
  }

  function renderCustomers(items) {
    const customerMap = new Map();
    items.forEach(invoice => {
      const key = normalize(invoice.customerPhone || invoice.customerName);
      if (!key) return;
      const label = normalize(invoice.customerName) || key;
      if (!customerMap.has(key)) customerMap.set(key, { key: label, total: 0, count: 0 });
      const entry = customerMap.get(key);
      entry.total += parseAmount(invoice.total);
      entry.count += 1;
    });
    const rows = Array.from(customerMap.values()).sort((a, b) => b.total - a.total || b.count - a.count);
    renderBars(elements.customerBars, rows, {
      limit: 8,
      formatValue: row => `${formatMoney(row.total)} / ${formatNumber(row.count)}`
    });
  }

  function renderInsights(items) {
    const total = items.reduce((sum, item) => sum + parseAmount(item.total), 0);
    const payments = groupBy(items, invoice => getPaymentLabel(invoice.paymentMethod || invoice.payment || localize("غير محدد", "Unknown")));
    const barbers = groupBy(items, invoice => normalize(invoice.barber) || localize("غير محدد", "Unknown"));
    const days = groupBy(items, invoice => getInvoiceDate(invoice) || localize("بدون تاريخ", "No date"));
    const insights = [
      payments[0] && { title: localize("أعلى طريقة دفع", "Top payment method"), text: `${payments[0].key} - ${formatMoney(payments[0].total)}` },
      barbers[0] && { title: localize("أعلى موظف مبيعات", "Top employee by sales"), text: `${barbers[0].key} - ${formatMoney(barbers[0].total)}` },
      days[0] && { title: localize("أفضل يوم في الفترة", "Best day in period"), text: `${days.sort((a, b) => b.total - a.total)[0].key} - ${formatMoney(days[0].total)}` },
      { title: localize("متوسط قيمة الفاتورة", "Average ticket"), text: formatMoney(items.length ? total / items.length : 0) }
    ].filter(Boolean);

    elements.insightsList.innerHTML = insights.map(item => `
      <div class="analytics-insight">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.text)}</span>
      </div>
    `).join("");
  }

  function renderInsightsLocalized(items) {
    const total = items.reduce((sum, item) => sum + parseAmount(item.total), 0);
    const payments = groupBy(items, invoice => getPaymentLabel(invoice.paymentMethod || invoice.payment || localize("غير محدد", "Unknown")));
    const barbers = groupBy(items, invoice => normalize(invoice.barber) || localize("غير محدد", "Unknown"));
    const days = groupBy(items, invoice => getInvoiceDate(invoice) || localize("بدون تاريخ", "No date"));
    const bestDay = [...days].sort((a, b) => b.total - a.total)[0];
    const insights = [
      payments[0] && { title: localize("أعلى طريقة دفع", "Top payment method"), text: `${payments[0].key} - ${formatMoney(payments[0].total)}` },
      barbers[0] && { title: localize("أعلى موظف مبيعات", "Top employee by sales"), text: `${barbers[0].key} - ${formatMoney(barbers[0].total)}` },
      bestDay && { title: localize("أفضل يوم في الفترة", "Best day in period"), text: `${bestDay.key} - ${formatMoney(bestDay.total)}` },
      { title: localize("متوسط قيمة الفاتورة", "Average ticket"), text: formatMoney(items.length ? total / items.length : 0) }
    ].filter(Boolean);

    elements.insightsList.innerHTML = insights.map(item => `
      <div class="analytics-insight">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.text)}</span>
      </div>
    `).join("");
  }

  function readStore(key) {
    elements.refreshBtn.textContent = localize("جاري التحديث...", "Refreshing...");
    elements.status.textContent = localize("جاري تحميل التحليلات...", "Loading analysis...");

    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function rangeBounds() {
    return {
      from: elements.fromDate.value || "",
      to: elements.toDate.value || "",
      barber: elements.barberFilter.value || "",
      payment: elements.paymentFilter.value || ""
    };
  }

  function inRange(date, range) {
    return Boolean(date) && (!range.from || date >= range.from) && (!range.to || date <= range.to);
  }

  function monthRow(map, month) {
    if (!map.has(month)) {
      map.set(month, {
        month,
        sales: 0,
        expenses: 0,
        withdrawals: 0,
        inventoryCost: 0,
        invoices: 0,
        customers: new Set(),
        barbers: new Set()
      });
    }
    return map.get(month);
  }

  function inventoryCostByMonth(range) {
    const items = readStore("romeo-pos-inventory");
    const priceById = new Map(items.map(item => [String(item.id), parseAmount(item.buyPrice)]));
    const costs = new Map();

    readStore("romeo-pos-inventory-log").forEach(entry => {
      const movementDate = getDateKey(entry.date);
      if (!inRange(movementDate, range) || String(entry.type || "") !== "out") return;
      const month = movementDate.slice(0, 7);
      const unitCost = parseAmount(entry.buyPrice || entry.cost || entry.unitCost) || priceById.get(String(entry.itemId)) || 0;
      costs.set(month, (costs.get(month) || 0) + (parseAmount(entry.quantity) * unitCost));
    });

    return costs;
  }

  function buildMonthlyRows(items, range) {
    const rows = new Map();

    items.forEach(invoice => {
      const invoiceDate = getInvoiceDate(invoice);
      if (!inRange(invoiceDate, range)) return;
      const row = monthRow(rows, invoiceDate.slice(0, 7));
      row.sales += parseAmount(invoice.total);
      row.invoices += 1;
      const customer = normalize(invoice.customerPhone || invoice.customerName);
      const barber = normalize(invoice.barber);
      if (customer) row.customers.add(customer);
      if (barber) row.barbers.add(barber);
    });

    readStore("romeo-pos-expenses").forEach(expense => {
      const expenseDate = getDateKey(expense.date);
      if (inRange(expenseDate, range)) monthRow(rows, expenseDate.slice(0, 7)).expenses += parseAmount(expense.amount);
    });

    readStore("romeo-pos-withdrawals").forEach(withdrawal => {
      const withdrawalDate = getDateKey(withdrawal.date);
      if (inRange(withdrawalDate, range)) monthRow(rows, withdrawalDate.slice(0, 7)).withdrawals += parseAmount(withdrawal.amount);
    });

    inventoryCostByMonth(range).forEach((cost, month) => {
      monthRow(rows, month).inventoryCost += cost;
    });

    return Array.from(rows.values()).sort((a, b) => a.month.localeCompare(b.month)).map((row, index, list) => {
      const previous = list[index - 1];
      const netProfit = row.sales - row.expenses - row.withdrawals - row.inventoryCost;
      const previousProfit = previous ? previous.sales - previous.expenses - previous.withdrawals - previous.inventoryCost : 0;
      return {
        ...row,
        customerCount: row.customers.size,
        barberCount: row.barbers.size,
        averageInvoice: row.invoices ? row.sales / row.invoices : 0,
        netProfit,
        salesGrowth: previous && previous.sales ? ((row.sales - previous.sales) / previous.sales) * 100 : 0,
        profitGrowth: previous && previousProfit ? ((netProfit - previousProfit) / previousProfit) * 100 : 0,
        customerGrowth: previous && previous.customers.size ? ((row.customers.size - previous.customers.size) / previous.customers.size) * 100 : 0
      };
    });
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function percent(value) {
    return `${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
  }

  function chart(id, rows, getter, formatter, className = "") {
    const container = document.getElementById(id);
    if (!container) return;
    if (!rows.length) {
      container.innerHTML = `<div class="analytics-empty">${localize("لا توجد بيانات شهرية بعد.", "No monthly data yet.")}</div>`;
      return;
    }
    const max = Math.max(...rows.map(row => Math.abs(getter(row))), 1);
    container.innerHTML = rows.slice(-12).map(row => {
      const width = Math.max(4, Math.round((Math.abs(getter(row)) / max) * 100));
      return `
        <div class="monthly-chart-row">
          <div class="monthly-chart-label">${row.month}</div>
          <div class="monthly-chart-track"><div class="monthly-chart-fill ${className}" style="width:${width}%"></div></div>
          <div class="monthly-chart-value">${formatter(getter(row))}</div>
        </div>
      `;
    }).join("");
  }

  function salesVsExpenses(rows) {
    const container = document.getElementById("monthlySalesVsExpenses");
    if (!container) return;
    if (!rows.length) {
      container.innerHTML = `<div class="analytics-empty">${localize("لا توجد بيانات شهرية بعد.", "No monthly data yet.")}</div>`;
      return;
    }
    const max = Math.max(...rows.flatMap(row => [row.sales, row.expenses + row.withdrawals + row.inventoryCost]), 1);
    container.innerHTML = rows.slice(-8).map(row => {
      const costs = row.expenses + row.withdrawals + row.inventoryCost;
      return `
        <div class="monthly-chart-row">
          <div class="monthly-chart-label">${row.month} ${localize("المبيعات", "Sales")}</div>
          <div class="monthly-chart-track"><div class="monthly-chart-fill" style="width:${Math.max(4, Math.round((row.sales / max) * 100))}%"></div></div>
          <div class="monthly-chart-value">${formatMoney(row.sales)}</div>
        </div>
        <div class="monthly-chart-row">
          <div class="monthly-chart-label">${row.month} ${localize("التكاليف", "Costs")}</div>
          <div class="monthly-chart-track"><div class="monthly-chart-fill expense" style="width:${Math.max(4, Math.round((costs / max) * 100))}%"></div></div>
          <div class="monthly-chart-value">${formatMoney(costs)}</div>
        </div>
      `;
    }).join("");
  }

  function topMonths(rows) {
    const container = document.getElementById("monthlyTopMonths");
    if (!container) return;
    if (!rows.length) {
      container.innerHTML = `<div class="analytics-empty">${localize("لا توجد بيانات شهرية بعد.", "No monthly data yet.")}</div>`;
      return;
    }
    const topBy = getter => [...rows].sort((a, b) => getter(b) - getter(a))[0];
    const items = [
      [localize("أعلى المبيعات", "Highest Sales"), topBy(row => row.sales), row => formatMoney(row.sales)],
      [localize("أعلى الأرباح", "Highest Profit"), topBy(row => row.netProfit), row => formatMoney(row.netProfit)],
      [localize("أعلى عدد عملاء", "Highest Customers"), topBy(row => row.customerCount), row => formatNumber(row.customerCount)],
      [localize("أعلى متوسط فاتورة", "Highest Average Invoice"), topBy(row => row.averageInvoice), row => formatMoney(row.averageInvoice)]
    ];
    container.innerHTML = items.map(([title, row, formatter]) => `
      <div class="analytics-insight"><strong>${title}</strong><span>${row.month} - ${formatter(row)}</span></div>
    `).join("");
  }

  function monthlyTable(rows) {
    const body = document.getElementById("monthlyRows");
    if (!body) return;
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="9" class="analytics-empty">${localize("لا توجد بيانات شهرية بعد.", "No monthly data yet.")}</td></tr>`;
      return;
    }
    body.innerHTML = rows.map(row => `
      <tr>
        <td>${row.month}</td>
        <td class="amount">${formatMoney(row.sales)}</td>
        <td class="amount">${formatMoney(row.expenses)}</td>
        <td class="amount">${formatMoney(row.withdrawals)}</td>
        <td class="amount">${formatMoney(row.netProfit)}</td>
        <td>${formatNumber(row.customerCount)}</td>
        <td>${formatNumber(row.invoices)}</td>
        <td class="amount">${formatMoney(row.averageInvoice)}</td>
        <td>${percent(row.salesGrowth)}</td>
      </tr>
    `).join("");
  }

  function renderMonthly() {
    const range = rangeBounds();
    const rows = buildMonthlyRows(filteredInvoices, range);
    const totals = rows.reduce((sum, row) => {
      sum.sales += row.sales;
      sum.expenses += row.expenses;
      sum.withdrawals += row.withdrawals;
      sum.inventoryCost += row.inventoryCost;
      sum.profit += row.netProfit;
      sum.invoices += row.invoices;
      sum.barbers += row.barberCount;
      return sum;
    }, { sales: 0, expenses: 0, withdrawals: 0, inventoryCost: 0, profit: 0, invoices: 0, barbers: 0 });

    const growthRows = rows.slice(1);
    const avgSalesGrowth = growthRows.length ? growthRows.reduce((sum, row) => sum + row.salesGrowth, 0) / growthRows.length : 0;
    const avgProfitGrowth = growthRows.length ? growthRows.reduce((sum, row) => sum + row.profitGrowth, 0) / growthRows.length : 0;
    const avgCustomerGrowth = growthRows.length ? growthRows.reduce((sum, row) => sum + row.customerGrowth, 0) / growthRows.length : 0;
    const avgRevenue = rows.length ? totals.sales / rows.length : 0;
    const expensePercent = totals.sales ? ((totals.expenses + totals.withdrawals) / totals.sales) * 100 : 0;
    const inventoryPercent = totals.sales ? (totals.inventoryCost / totals.sales) * 100 : 0;
    const profitMargin = totals.sales ? (totals.profit / totals.sales) * 100 : 0;
    const revenuePerBarber = totals.barbers ? totals.sales / totals.barbers : 0;
    const invoiceRate = rows.length ? totals.invoices / rows.length : 0;
    const assetBase = totals.inventoryCost || (totals.expenses + totals.withdrawals) || totals.sales;
    const roa = assetBase ? (totals.profit / assetBase) * 100 : 0;

    setText("monthlyAvgRevenue", formatMoney(avgRevenue));
    setText("monthlyAvgGrowth", percent(avgSalesGrowth));
    setText("monthlyExpensePercent", percent(expensePercent));
    setText("monthlyProfitMargin", percent(profitMargin));
    setText("monthlyCustomerGrowth", percent(avgCustomerGrowth));
    setText("monthlyInvoiceRate", formatNumber(invoiceRate, 1));
    setText("monthlyRevenuePerBarber", formatMoney(revenuePerBarber));
    setText("monthlyInventoryCost", percent(inventoryPercent));

    chart("monthlySalesTrend", rows, row => row.sales, formatMoney);
    chart("monthlyProfitTrend", rows, row => row.netProfit, formatMoney, "expense");
    salesVsExpenses(rows);
    topMonths(rows);
    monthlyTable(rows);

    const indicators = document.getElementById("monthlyIndicators");
    if (indicators) {
      indicators.innerHTML = `
        <div class="indicator"><span>ROA</span><strong>${percent(roa)}</strong></div>
        <div class="indicator"><span>${localize("معدل نمو المبيعات", "Sales Growth")}</span><strong>${percent(avgSalesGrowth)}</strong></div>
        <div class="indicator"><span>${localize("معدل نمو الأرباح", "Profit Growth")}</span><strong>${percent(avgProfitGrowth)}</strong></div>
        <div class="indicator"><span>${localize("هامش الربح", "Profit Margin")}</span><strong>${percent(profitMargin)}</strong></div>
      `;
    }
  }

  function renderAll() {
    applyAnalyticsLanguage();
    renderSummary(filteredInvoices);
    renderPaymentMix(filteredInvoices);
    renderServices(filteredInvoices);
    renderServicePackages(filteredInvoices);
    renderDailyTrend(filteredInvoices);
    renderBarbers(filteredInvoices);
    renderCustomers(filteredInvoices);
    renderInsightsLocalized(filteredInvoices);
    renderMonthly();
  }

  function applyFilters() {
    const from = elements.fromDate.value;
    const to = elements.toDate.value;
    const barber = elements.barberFilter.value;
    const payment = elements.paymentFilter.value;

    filteredInvoices = invoices.filter(invoice => {
      const date = getInvoiceDate(invoice);
      const invoicePayment = normalize(invoice.paymentMethod || invoice.payment);
      return (!from || (date && date >= from)) &&
        (!to || (date && date <= to)) &&
        (!barber || normalize(invoice.barber) === barber) &&
        (!payment || invoicePayment === payment);
    });

    renderAll();
  }

  function renderFilterOptions() {
    const selectedBarber = elements.barberFilter.value;
    const selectedPayment = elements.paymentFilter.value;
    const barbers = [...new Set(invoices.map(invoice => normalize(invoice.barber)).filter(Boolean))].sort();
    const payments = [...new Set(invoices.map(invoice => normalize(invoice.paymentMethod || invoice.payment)).filter(Boolean))].sort();

    elements.barberFilter.innerHTML = `<option value="">${localize("كل الموظفين", "All employees")}</option>`;
    barbers.forEach(barber => {
      const option = document.createElement("option");
      option.value = barber;
      option.textContent = barber;
      elements.barberFilter.appendChild(option);
    });

    elements.paymentFilter.innerHTML = `<option value="">${localize("كل الطرق", "All methods")}</option>`;
    payments.forEach(payment => {
      const option = document.createElement("option");
      option.value = payment;
      option.textContent = getPaymentLabel(payment);
      elements.paymentFilter.appendChild(option);
    });

    if (barbers.includes(selectedBarber)) elements.barberFilter.value = selectedBarber;
    if (payments.includes(selectedPayment)) elements.paymentFilter.value = selectedPayment;
    if (elements.barberFilter.options[0]) elements.barberFilter.options[0].textContent = localize("كل الموظفين", "All employees");
    if (elements.paymentFilter.options[0]) elements.paymentFilter.options[0].textContent = localize("كل الطرق", "All methods");
  }

  async function loadInvoices() {
    elements.refreshBtn.disabled = true;
    elements.refreshBtn.textContent = localize("جاري التحديث...", "Refreshing...");
    elements.status.textContent = localize("جاري تحميل التحليلات...", "Loading analysis...");
    elements.refreshBtn.textContent = localize("جاري التحديث...", "Refreshing...");
    elements.status.textContent = localize("جاري تحميل التحليلات...", "Loading analysis...");

    try {
      const result = await RomeoApi.request({ action: "getInvoices" });
      if (result.status !== "success") throw new Error(result.message || "Could not load invoices.");
      invoices = Array.isArray(result.invoices) ? result.invoices : [];
      renderFilterOptions();
      applyFilters();
      elements.status.textContent = invoices.length ? "" : localize("لا توجد فواتير للتحليل.", "No invoices to analyze.");
    } catch (error) {
      console.error(error);
      invoices = [];
      filteredInvoices = [];
      renderAll();
      elements.status.textContent = localize("تعذر تحميل التحليلات.", "Could not load analysis.");
    } finally {
      elements.refreshBtn.disabled = false;
      setTimeout(applyAnalyticsLanguage, 0);
      elements.refreshBtn.textContent = localize("تحديث", "Refresh");
    }
  }

  document.querySelectorAll("[data-analysis-tab]").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-analysis-tab]").forEach(item => item.classList.remove("active"));
      document.querySelectorAll(".analytics-page").forEach(item => item.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(`analysisTab${button.dataset.analysisTab[0].toUpperCase()}${button.dataset.analysisTab.slice(1)}`)?.classList.add("active");
    });
  });

  [elements.fromDate, elements.toDate, elements.barberFilter, elements.paymentFilter].forEach(element => {
    if (element) element.addEventListener("change", applyFilters);
  });

  if (elements.refreshBtn) elements.refreshBtn.addEventListener("click", loadInvoices);
  window.addEventListener("romeo-language-change", () => {
    applyAnalyticsLanguage();
    renderFilterOptions();
    renderAll();
  });

  applyAnalyticsLanguage();
  loadInvoices();
})();
