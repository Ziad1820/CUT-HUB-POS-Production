const RomeoLanguage = (() => {
  const STORAGE_KEY = "romeo-pos-language";
  const SUPPORTED = ["ar", "en"];

  const DICTIONARY = {
    en: {
      "Menu": "Menu",
      "Dashboard": "Dashboard",
      "cashier": "Cashier",
      "invoices": "Invoices",
      "income statement": "Income Statement",
      "daily closing": "Daily Closing",
      "Daily Closing": "Daily Closing",
      "DATA ANALYSIS": "Data Analysis",
      "Data Analysis": "Data Analysis",
      "Activity Log": "Activity Log",
      "Audit trail for invoices, expenses, users, prices, and system actions": "Audit trail for invoices, expenses, users, prices, and system actions",
      "Search": "Search",
      "Search by user, action, or details": "Search by user, action, or details",
      "Action Type": "Action Type",
      "Entity Type": "Entity Type",
      "All actions": "All actions",
      "All types": "All types",
      "Update": "Update",
      "Create": "Create",
      "Login": "Login",
      "Day Closing": "Day Closing",
      "Invoice": "Invoice",
      "Expense": "Expense",
      "Withdrawal": "Withdrawal",
      "User": "User",
      "System": "System",
      "Date & Time": "Date & Time",
      "Details": "Details",
      "Total Logs": "Total Logs",
      "Deletes": "Deletes",
      "Updates": "Updates",
      "Creates": "Creates",
      "staff accounting": "Staff Accounting",
      "system access": "System Access",
      "Withdrawals": "Withdrawals",
      "Expenses": "Expenses",
      "Enventory": "Inventory",
      "staff Discount": "Staff Discount",
      "Attendance": "Attendance",
      "Bookings": "Bookings",
      "Customer Data": "Customer Data",
      "Language": "Language",
      "Logout": "Logout",
      "القائمة": "Menu",
      "عربي": "Arabic",
      "English": "English",

      "اسم العميل": "Customer Name",
      "رقم العميل": "Customer Phone",
      "تاريخ الإجماليات": "Totals Date",
      "اسم الحلاق": "Barber Name",
      "اختر الحلاق": "Select Barber",
      "الخدمات": "Services",
      "اضغط على أي خدمة لإضافتها مباشرة إلى الحساب.": "Click any service to add it directly to the bill.",
      "تعديل الأسعار": "Edit Prices",
      "الحساب الحالي": "Current Bill",
      "الخدمات المختارة ستظهر هنا مع السعر والإجمالي النهائي.": "Selected services will appear here with price and final total.",
      "عدد الخدمات": "Services Count",
      "الإجمالي": "Total",
      "عادي": "Regular",
      "بريميوم +30": "Premium +30",
      "المدفوع": "Paid",
      "الباقي": "Remaining",
      "ملاحظة الفاتورة": "Invoice Note",
      "إتمام الحساب": "Complete Sale",
      "طباعة الفاتورة": "Print Invoice",
      "مسح الكل": "Clear All",
      "صافي اليوم": "Today Net",
      "إجمالي مبيعات اليوم": "Today Sales Total",
      "إجمالي النقدي": "Cash Total",
      "إجمالي انستا باي": "Instapay Total",
      "إجمالي فودافون كاش": "Vodafone Cash Total",
      "إجمالي الفيزا": "Visa Total",
      "إضافة": "Add",
      "استرجاع الأسعار الأصلية": "Restore Original Prices",
      "إغلاق": "Close",
      "حفظ الأسعار": "Save Prices",

      "كل الفواتير المسجلة في الشيت مع البحث والفلترة والحذف": "All invoices saved in the sheet with search, filters, and delete",
      "بحث باسم العميل أو رقم الهاتف": "Search by customer name or phone",
      "فلترة بالتاريخ": "Filter by date",
      "فلترة بالحلاق": "Filter by barber",
      "كل الحلاقين": "All barbers",
      "مسح الفلاتر": "Clear Filters",
      "تحديث": "Refresh",
      "إجمالي المبيعات المعروضة": "Displayed Sales Total",
      "عدد الفواتير المعروضة": "Displayed Invoices",
      "إجمالي كل الفواتير": "All Invoices Total",
      "التاريخ": "Date",
      "رقم الهاتف": "Phone",
      "الحلاق": "Barber",
      "طريقة الدفع": "Payment Method",
      "الملاحظة": "Note",
      "إجراءات": "Actions",
      "جاري تحميل الفواتير...": "Loading invoices...",
      "تفاصيل الفاتورة": "Invoice Details",
      "عرض": "View",

      "Select Category": "Select Category",
      "Category Expenses": "Category Expenses",
      "Category Records": "Category Records",
      "Total Expenses": "Total Expenses",
      "Average Expense": "Average Expense",
      "Amount": "Amount",
      "Title": "Title",
      "Category": "Category",
      "Date": "Date",
      "Note": "Note",
      "Add Expense": "Add Expense",
      "Clear Form": "Clear Form",
      "No note": "No note",
      "Supplies": "Supplies",
      "Utilities": "Utilities",
      "Rent": "Rent",
      "Maintenance": "Maintenance",
      "Marketing": "Marketing",
      "Other": "Other",

      "Select Employee": "Select Employee",
      "Employee Withdrawals": "Employee Withdrawals",
      "Employee Records": "Employee Records",
      "Total Withdrawals": "Total Withdrawals",
      "Total Records": "Total Records",
      "Add Withdrawal": "Add Withdrawal",

      "Total Clients": "Total Clients",
      "Loading...": "Loading...",
      "Total staff sales": "Total Staff Sales",
      "Withdraw": "Withdraw",
      "Total income": "Total Income",
      "Net profit": "Net Profit",
      "Add Employee": "Add Employee",
      "Reset Data": "Reset Data",
      "Select Staff": "Select Staff",
      "Salaries": "Salaries",
      "Total Sales": "Total Sales",
      "Percentage Of Salaries": "Salary Percentage",
      "dedution": "Deduction",
      "Bonus": "Bonus",
      "Net Salary": "Net Salary",
      "Staff Name": "Staff Name",
      "Staff Code": "Staff Code",
      "Save Changes": "Save Changes",
      "Delete Employee": "Delete Employee",

      "إضافة أو تعديل مستخدم": "Add or Edit User",
      "اسم صاحب اليوزر": "Display Name",
      "اليوزر نيم": "Username",
      "الباسورد": "Password",
      "حفظ المستخدم": "Save User",
      "تفريغ الحقول": "Clear Fields",
      "المستخدمون الحاليون": "Current Users",
      "Delete": "Delete"
    },
    ar: {
      "Menu": "القائمة",
      "Dashboard": "لوحة التحكم",
      "cashier": "الكاشير",
      "Cashier": "الكاشير",
      "invoices": "الفواتير",
      "Invoices": "الفواتير",
      "income statement": "قائمة الدخل",
      "Income Statement": "قائمة الدخل",
      "daily closing": "تقفيلة اليوم",
      "Daily Closing": "تقفيلة اليوم",
      "DATA ANALYSIS": "تحليل البيانات",
      "Data Analysis": "تحليل البيانات",
      "Activity Log": "سجل العمليات",
      "Audit trail for invoices, expenses, users, prices, and system actions": "سجل متابعة للفواتير والمصروفات والمستخدمين والأسعار وعمليات النظام",
      "Search": "بحث",
      "Search by user, action, or details": "ابحث بالمستخدم أو العملية أو التفاصيل",
      "Action Type": "نوع العملية",
      "Entity Type": "نوع العنصر",
      "All actions": "كل العمليات",
      "All types": "كل الأنواع",
      "Update": "تعديل",
      "Create": "إضافة",
      "Login": "تسجيل دخول",
      "Day Closing": "تقفيلة يوم",
      "Invoice": "فاتورة",
      "Expense": "مصروف",
      "Withdrawal": "سحب",
      "User": "مستخدم",
      "System": "النظام",
      "Date & Time": "التاريخ والوقت",
      "Details": "تفاصيل العملية",
      "Total Logs": "إجمالي العمليات",
      "Deletes": "عمليات الحذف",
      "Updates": "عمليات التعديل",
      "Creates": "عمليات الإضافة",
      "From Date": "من تاريخ",
      "To Date": "إلى تاريخ",
      "Payment Method": "طريقة الدفع",
      "All methods": "كل الطرق",
      "Overview": "نظرة عامة",
      "Sales": "المبيعات",
      "Staff": "الموظفون",
      "Customers": "العملاء",
      "Total Sales": "إجمالي المبيعات",
      "Invoices": "الفواتير",
      "Average Invoice": "متوسط الفاتورة",
      "Unique Customers": "عملاء مختلفون",
      "Payment Mix": "توزيع طرق الدفع",
      "Smart Insights": "مؤشرات ذكية",
      "Top Services": "أفضل الخدمات",
      "Daily Sales Trend": "اتجاه المبيعات اليومية",
      "Barber Performance": "أداء الحلاقين",
      "Average": "المتوسط",
      "Share": "النسبة",
      "Customer Snapshot": "ملخص العملاء",
      "Known Customers": "عملاء معروفون",
      "Walk-in Invoices": "فواتير بدون بيانات عميل",
      "Top Customers": "أفضل العملاء",
      "staff accounting": "حسابات الموظفين",
      "Staff Accounting": "حسابات الموظفين",
      "system access": "صلاحيات النظام",
      "System Access": "صلاحيات النظام",
      "Withdrawals": "السحوبات",
      "Expenses": "المصروفات",
      "Enventory": "المخزون",
      "Inventory": "المخزون",
      "staff Discount": "خصومات الموظفين",
      "Staff Discount": "خصومات الموظفين",
      "Attendance": "الحضور",
      "Bookings": "الحجوزات",
      "Customer Data": "بيانات العملاء",
      "Language": "اللغة",
      "Logout": "تسجيل الخروج",
      "Arabic": "عربي",

      "Customer Name": "اسم العميل",
      "Customer Phone": "رقم العميل",
      "Totals Date": "تاريخ الإجماليات",
      "Barber Name": "اسم الحلاق",
      "Select Barber": "اختر الحلاق",
      "Services": "الخدمات",
      "Click any service to add it directly to the bill.": "اضغط على أي خدمة لإضافتها مباشرة إلى الحساب.",
      "Edit Prices": "تعديل الأسعار",
      "Current Bill": "الحساب الحالي",
      "Selected services will appear here with price and final total.": "الخدمات المختارة ستظهر هنا مع السعر والإجمالي النهائي.",
      "Services Count": "عدد الخدمات",
      "Total": "الإجمالي",
      "Regular": "عادي",
      "Premium +30": "بريميوم +30",
      "Paid": "المدفوع",
      "Remaining": "الباقي",
      "Invoice Note": "ملاحظة الفاتورة",
      "Complete Sale": "إتمام الحساب",
      "Print Invoice": "طباعة الفاتورة",
      "Clear All": "مسح الكل",
      "Today Net": "صافي اليوم",
      "Today Sales Total": "إجمالي مبيعات اليوم",
      "Cash Total": "إجمالي النقدي",
      "Instapay Total": "إجمالي انستا باي",
      "Vodafone Cash Total": "إجمالي فودافون كاش",
      "Visa Total": "إجمالي الفيزا",
      "Add": "إضافة",
      "Restore Original Prices": "استرجاع الأسعار الأصلية",
      "Close": "إغلاق",
      "Save Prices": "حفظ الأسعار",

      "Search by customer name or phone": "بحث باسم العميل أو رقم الهاتف",
      "Filter by date": "فلترة بالتاريخ",
      "Filter by barber": "فلترة بالحلاق",
      "All barbers": "كل الحلاقين",
      "Clear Filters": "مسح الفلاتر",
      "Refresh": "تحديث",
      "Displayed Sales Total": "إجمالي المبيعات المعروضة",
      "Displayed Invoices": "عدد الفواتير المعروضة",
      "All Invoices Total": "إجمالي كل الفواتير",
      "Date": "التاريخ",
      "Phone": "رقم الهاتف",
      "Barber": "الحلاق",
      "Payment Method": "طريقة الدفع",
      "Note": "الملاحظة",
      "Actions": "إجراءات",
      "Loading invoices...": "جاري تحميل الفواتير...",
      "Invoice Details": "تفاصيل الفاتورة",
      "View": "عرض",

      "Salary Percentage": "نسبة المرتب",
      "Deduction": "الخصم",
      "Add or Edit User": "إضافة أو تعديل مستخدم",
      "Display Name": "اسم صاحب اليوزر",
      "Username": "اليوزر نيم",
      "Password": "الباسورد",
      "Save User": "حفظ المستخدم",
      "Clear Fields": "تفريغ الحقول",
      "Current Users": "المستخدمون الحاليون"
    }
  };

  const PLACEHOLDERS = {
    en: {
      "اكتب اسم العميل": "Enter customer name",
      "اكتب رقم الموبايل": "Enter mobile number",
      "اكتب المدفوع": "Enter paid amount",
      "اكتب ملاحظة داخلية للفاتورة": "Write an internal invoice note",
      "اسم الخدمة الجديدة": "New service name",
      "السعر": "Price",
      "اكتب اسم العميل أو رقم الهاتف": "Enter customer name or phone",
      "اكتب تفاصيل المصروف أو أي ملاحظة إضافية": "Write expense details or note",
      "اكتب سبب السحب أو ملاحظات إضافية": "Write withdrawal reason or note",
      "مثال: أحمد": "Example: Ahmed",
      "مثال: ahmed": "Example: ahmed",
      "اكتب الباسورد": "Enter password"
    },
    ar: {
      "Enter customer name": "اكتب اسم العميل",
      "Enter mobile number": "اكتب رقم الموبايل",
      "Enter paid amount": "اكتب المدفوع",
      "Write an internal invoice note": "اكتب ملاحظة داخلية للفاتورة",
      "New service name": "اسم الخدمة الجديدة",
      "Price": "السعر",
      "Enter customer name or phone": "اكتب اسم العميل أو رقم الهاتف",
      "Write expense details or note": "اكتب تفاصيل المصروف أو أي ملاحظة إضافية",
      "Write withdrawal reason or note": "اكتب سبب السحب أو ملاحظات إضافية",
      "Example: Ahmed": "مثال: أحمد",
      "Example: ahmed": "مثال: ahmed",
      "Enter password": "اكتب الباسورد"
    }
  };

  function getCurrentLanguage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED.includes(stored) ? stored : "ar";
  }

  function normalize(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function translateText(value, language) {
    const key = normalize(value);
    if (DICTIONARY[language][key]) return DICTIONARY[language][key];

    for (const sourceLanguage of SUPPORTED) {
      const entries = DICTIONARY[sourceLanguage] || {};
      const match = Object.keys(entries).find(sourceKey => normalize(entries[sourceKey]) === key);
      if (match && DICTIONARY[language][match]) {
        return DICTIONARY[language][match];
      }
    }

    return key;
  }

  function translatePlaceholder(value, language) {
    const key = normalize(value);
    if (PLACEHOLDERS[language][key]) return PLACEHOLDERS[language][key];
    if (DICTIONARY[language][key]) return DICTIONARY[language][key];

    for (const sourceLanguage of SUPPORTED) {
      const placeholderEntries = PLACEHOLDERS[sourceLanguage] || {};
      const placeholderMatch = Object.keys(placeholderEntries).find(sourceKey => normalize(placeholderEntries[sourceKey]) === key);
      if (placeholderMatch && PLACEHOLDERS[language][placeholderMatch]) {
        return PLACEHOLDERS[language][placeholderMatch];
      }

      const dictionaryEntries = DICTIONARY[sourceLanguage] || {};
      const dictionaryMatch = Object.keys(dictionaryEntries).find(sourceKey => normalize(dictionaryEntries[sourceKey]) === key);
      if (dictionaryMatch && DICTIONARY[language][dictionaryMatch]) {
        return DICTIONARY[language][dictionaryMatch];
      }
    }

    return key;
  }

  function injectStyles() {
    if (document.getElementById("romeoLanguageStyles")) return;

    const style = document.createElement("style");
    style.id = "romeoLanguageStyles";
    style.textContent = `
      .language-block { direction: ltr; }
      .language-menu {
        display: none;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-top: 8px;
        padding: 8px;
        background: rgba(234,217,189,.55);
        border: 1px solid rgba(229,213,190,.9);
        border-radius: 16px;
      }
      .language-menu.active { display: grid; }
      .language-option {
        border: none;
        border-radius: 12px;
        padding: 10px 8px;
        background: #fffaf2;
        color: #2a2118;
        font-weight: 900;
        cursor: pointer;
      }
      .language-option.active {
        background: linear-gradient(135deg, #24180d, #5f4524);
        color: #fff;
      }
    `;
    document.head.appendChild(style);
  }

  function translateStaticText(language = getCurrentLanguage()) {
    document.documentElement.lang = language;
    document.body.dataset.language = language;

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.parentElement) return NodeFilter.FILTER_REJECT;
        if (node.parentElement.closest("script, style, textarea, [data-no-translate], .service-grid, #servicesGrid")) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(node => {
      const current = normalize(node.nodeValue);
      if (!current) return;
      const translated = translateText(current, language);
      if (translated !== current) {
        node.nodeValue = node.nodeValue.replace(current, translated);
      }
    });

    document.querySelectorAll("[placeholder]").forEach(element => {
      element.setAttribute("placeholder", translatePlaceholder(element.getAttribute("placeholder"), language));
    });

    document.querySelectorAll("[data-language-option]").forEach(option => {
      const optionLanguage = option.dataset.languageOption;
      option.classList.toggle("active", optionLanguage === language);
      option.textContent = optionLanguage === "ar"
        ? (language === "en" ? "Arabic" : "عربي")
        : "English";
    });

    const languageToggle = document.getElementById("languageToggle");
    if (languageToggle) {
      languageToggle.textContent = language === "ar" ? "اللغة" : "Language";
    }
  }

  function saveLanguage(language) {
    const nextLanguage = SUPPORTED.includes(language) ? language : "ar";
    localStorage.setItem(STORAGE_KEY, nextLanguage);
    translateStaticText(nextLanguage);
    window.dispatchEvent(new CustomEvent("romeo-language-change", {
      detail: { language: nextLanguage }
    }));
    window.setTimeout(() => translateStaticText(nextLanguage), 0);
  }

  function injectControl() {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar || document.getElementById("languageBlock")) return;

    injectStyles();

    const block = document.createElement("div");
    block.className = "language-block";
    block.id = "languageBlock";
    block.dataset.noTranslate = "true";
    block.innerHTML = `
      <button class="sidebar-link" type="button" id="languageToggle" aria-expanded="false">Language</button>
      <div class="language-menu" id="languageMenu">
        <button class="language-option" type="button" data-language-option="ar">عربي</button>
        <button class="language-option" type="button" data-language-option="en">English</button>
      </div>
    `;

    const logoutButton = sidebar.querySelector("#logoutBtn");
    if (logoutButton) {
      sidebar.insertBefore(block, logoutButton);
    } else {
      sidebar.appendChild(block);
    }

    const toggle = block.querySelector("#languageToggle");
    const menu = block.querySelector("#languageMenu");

    toggle.addEventListener("click", event => {
      event.stopPropagation();
      const isActive = menu.classList.toggle("active");
      toggle.setAttribute("aria-expanded", isActive ? "true" : "false");
    });

    block.querySelectorAll("[data-language-option]").forEach(option => {
      option.addEventListener("click", event => {
        event.stopPropagation();
        saveLanguage(option.dataset.languageOption);
        menu.classList.remove("active");
        toggle.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("click", event => {
      if (!block.contains(event.target)) {
        menu.classList.remove("active");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  function init() {
    injectControl();
    const currentLanguage = getCurrentLanguage();
    translateStaticText(currentLanguage);
    window.dispatchEvent(new CustomEvent("romeo-language-change", {
      detail: { language: currentLanguage }
    }));
    window.setTimeout(() => translateStaticText(currentLanguage), 0);
  }

  document.addEventListener("DOMContentLoaded", init);
  if (document.readyState !== "loading") init();

  return {
    applyLanguage: translateStaticText,
    getCurrentLanguage,
    saveLanguage
  };
})();

(function () {
  if (!/data-analysis\.html$/i.test(window.location.pathname)) return;

  function amount(value) {
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

  function dateKey(value) {
    const match = String(value || "").match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    return match ? `${match[1]}-${String(match[2]).padStart(2, "0")}-${String(match[3]).padStart(2, "0")}` : "";
  }

  function readStore(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function money(value) {
    return `${Math.round(Number(value) || 0).toLocaleString("en-US")} EGP`;
  }

  function percent(value) {
    return `${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
  }

  function number(value) {
    return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 1 });
  }

  function bounds() {
    return {
      from: document.getElementById("fromDate")?.value || "",
      to: document.getElementById("toDate")?.value || "",
      barber: document.getElementById("barberFilter")?.value || "",
      payment: document.getElementById("paymentFilter")?.value || ""
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

  function injectMonthlyTab() {
    if (document.getElementById("tab-monthly")) return;
    const customersButton = document.querySelector('.tab-btn[data-tab="customers"]');
    const app = document.querySelector(".app");
    if (!customersButton || !app) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "tab-btn";
    button.dataset.tab = "monthly";
    button.textContent = "Monthly Analysis";
    customersButton.insertAdjacentElement("afterend", button);

    const section = document.createElement("section");
    section.className = "tab-page";
    section.id = "tab-monthly";
    section.innerHTML = `
      <div class="metrics">
        <article class="metric success"><span>Average Revenue / Month</span><strong id="monthlyAvgRevenue">0 EGP</strong></article>
        <article class="metric"><span>Average Growth / Year</span><strong id="monthlyAvgGrowth">0%</strong></article>
        <article class="metric"><span>Expense % of Sales</span><strong id="monthlyExpensePercent">0%</strong></article>
        <article class="metric success"><span>Profit Margin</span><strong id="monthlyProfitMargin">0%</strong></article>
      </div>
      <div class="metrics">
        <article class="metric"><span>Customer Growth</span><strong id="monthlyCustomerGrowth">0%</strong></article>
        <article class="metric"><span>Invoice Rate</span><strong id="monthlyInvoiceRate">0</strong></article>
        <article class="metric"><span>Revenue / Barber</span><strong id="monthlyRevenuePerBarber">0 EGP</strong></article>
        <article class="metric"><span>Inventory Cost %</span><strong id="monthlyInventoryCost">0%</strong></article>
      </div>
      <div class="monthly-analysis-grid">
        <section class="panel">
          <h2 class="section-title">Monthly Trend</h2>
          <div class="monthly-chart" id="monthlySalesTrend"></div>
        </section>
        <section class="panel">
          <h2 class="section-title">Profit Trend</h2>
          <div class="monthly-chart" id="monthlyProfitTrend"></div>
        </section>
        <section class="panel">
          <h2 class="section-title">Sales vs Expenses</h2>
          <div class="monthly-chart" id="monthlySalesVsExpenses"></div>
        </section>
        <section class="panel">
          <h2 class="section-title">Top Performing Month</h2>
          <div class="insight-list" id="monthlyTopMonths"></div>
        </section>
        <section class="panel">
          <h2 class="section-title">ROA & Indicators</h2>
          <div class="indicator-list" id="monthlyIndicators"></div>
        </section>
        <section class="panel wide-panel">
          <h2 class="section-title">Month by Month Comparison</h2>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th class="amount">Sales</th>
                  <th class="amount">Expenses</th>
                  <th class="amount">Withdrawals</th>
                  <th class="amount">Net Profit</th>
                  <th>Customers</th>
                  <th>Invoices</th>
                  <th class="amount">Average Invoice</th>
                  <th>Growth</th>
                </tr>
              </thead>
              <tbody id="monthlyRows"><tr><td colspan="9" class="status-line">Loading...</td></tr></tbody>
            </table>
          </div>
        </section>
      </div>
    `;
    app.appendChild(section);

    button.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(item => item.classList.remove("active"));
      document.querySelectorAll(".tab-page").forEach(item => item.classList.remove("active"));
      button.classList.add("active");
      section.classList.add("active");
      renderMonthly();
    });

    ["fromDate", "toDate", "barberFilter", "paymentFilter", "refreshBtn"].forEach(id => {
      const element = document.getElementById(id);
      if (element) element.addEventListener(id === "refreshBtn" ? "click" : "change", () => setTimeout(renderMonthly, 600));
    });

    renderMonthly();
  }

  async function loadInvoices(range) {
    try {
      if (!window.RomeoApi || typeof RomeoApi.request !== "function") return [];
      const result = await RomeoApi.request({ action: "getInvoices" });
      if (result.status !== "success" || !Array.isArray(result.invoices)) return [];
      return result.invoices.filter(invoice => {
        const invoiceDate = dateKey(invoice.dateKey || invoice.date);
        const invoiceBarber = String(invoice.barber || "").trim();
        const invoicePayment = String(invoice.paymentMethod || invoice.payment || "").trim();
        return inRange(invoiceDate, range) &&
          (!range.barber || invoiceBarber === range.barber) &&
          (!range.payment || invoicePayment === range.payment);
      });
    } catch (error) {
      console.warn("Monthly analysis could not load invoices.", error);
      return [];
    }
  }

  function inventoryCostByMonth(range) {
    const items = readStore("romeo-pos-inventory");
    const priceById = new Map(items.map(item => [String(item.id), amount(item.buyPrice)]));
    const costs = new Map();

    readStore("romeo-pos-inventory-log").forEach(entry => {
      const movementDate = dateKey(entry.date);
      if (!inRange(movementDate, range) || String(entry.type || "") !== "out") return;
      const month = movementDate.slice(0, 7);
      const unitCost = amount(entry.buyPrice || entry.cost || entry.unitCost) || priceById.get(String(entry.itemId)) || 0;
      costs.set(month, (costs.get(month) || 0) + (amount(entry.quantity) * unitCost));
    });

    return costs;
  }

  function buildRows(invoices, range) {
    const rows = new Map();

    invoices.forEach(invoice => {
      const invoiceDate = dateKey(invoice.dateKey || invoice.date);
      if (!inRange(invoiceDate, range)) return;
      const row = monthRow(rows, invoiceDate.slice(0, 7));
      row.sales += amount(invoice.total);
      row.invoices += 1;
      const customer = String(invoice.customerPhone || invoice.customerName || "").trim();
      const barber = String(invoice.barber || "").trim();
      if (customer) row.customers.add(customer);
      if (barber) row.barbers.add(barber);
    });

    readStore("romeo-pos-expenses").forEach(expense => {
      const expenseDate = dateKey(expense.date);
      if (inRange(expenseDate, range)) monthRow(rows, expenseDate.slice(0, 7)).expenses += amount(expense.amount);
    });

    readStore("romeo-pos-withdrawals").forEach(withdrawal => {
      const withdrawalDate = dateKey(withdrawal.date);
      if (inRange(withdrawalDate, range)) monthRow(rows, withdrawalDate.slice(0, 7)).withdrawals += amount(withdrawal.amount);
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

  function chart(id, rows, getter, formatter, className = "") {
    const container = document.getElementById(id);
    if (!container) return;
    if (!rows.length) {
      container.innerHTML = `<div class="empty-state">No monthly data yet.</div>`;
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
      container.innerHTML = `<div class="empty-state">No monthly data yet.</div>`;
      return;
    }
    const max = Math.max(...rows.flatMap(row => [row.sales, row.expenses + row.withdrawals + row.inventoryCost]), 1);
    container.innerHTML = rows.slice(-8).map(row => {
      const costs = row.expenses + row.withdrawals + row.inventoryCost;
      return `
        <div class="monthly-chart-row">
          <div class="monthly-chart-label">${row.month} Sales</div>
          <div class="monthly-chart-track"><div class="monthly-chart-fill" style="width:${Math.max(4, Math.round((row.sales / max) * 100))}%"></div></div>
          <div class="monthly-chart-value">${money(row.sales)}</div>
        </div>
        <div class="monthly-chart-row">
          <div class="monthly-chart-label">${row.month} Costs</div>
          <div class="monthly-chart-track"><div class="monthly-chart-fill expense" style="width:${Math.max(4, Math.round((costs / max) * 100))}%"></div></div>
          <div class="monthly-chart-value">${money(costs)}</div>
        </div>
      `;
    }).join("");
  }

  function topMonths(rows) {
    const container = document.getElementById("monthlyTopMonths");
    if (!container) return;
    if (!rows.length) {
      container.innerHTML = `<div class="empty-state">No monthly data yet.</div>`;
      return;
    }
    const topBy = getter => [...rows].sort((a, b) => getter(b) - getter(a))[0];
    const items = [
      ["Highest Sales", topBy(row => row.sales), row => money(row.sales)],
      ["Highest Profit", topBy(row => row.netProfit), row => money(row.netProfit)],
      ["Highest Customers", topBy(row => row.customerCount), row => number(row.customerCount)],
      ["Highest Average Invoice", topBy(row => row.averageInvoice), row => money(row.averageInvoice)]
    ];
    container.innerHTML = items.map(([title, row, formatter]) => `
      <div class="insight"><strong>${title}</strong><span>${row.month} - ${formatter(row)}</span></div>
    `).join("");
  }

  function table(rows) {
    const body = document.getElementById("monthlyRows");
    if (!body) return;
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="9" class="empty-state">No monthly data yet.</td></tr>`;
      return;
    }
    body.innerHTML = rows.map(row => `
      <tr>
        <td>${row.month}</td>
        <td class="amount">${money(row.sales)}</td>
        <td class="amount">${money(row.expenses)}</td>
        <td class="amount">${money(row.withdrawals)}</td>
        <td class="amount">${money(row.netProfit)}</td>
        <td>${number(row.customerCount)}</td>
        <td>${number(row.invoices)}</td>
        <td class="amount">${money(row.averageInvoice)}</td>
        <td>${percent(row.salesGrowth)}</td>
      </tr>
    `).join("");
  }

  async function renderMonthly() {
    if (!document.getElementById("tab-monthly")) return;
    const range = bounds();
    const rows = buildRows(await loadInvoices(range), range);
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

    setText("monthlyAvgRevenue", money(avgRevenue));
    setText("monthlyAvgGrowth", percent(avgSalesGrowth));
    setText("monthlyExpensePercent", percent(expensePercent));
    setText("monthlyProfitMargin", percent(profitMargin));
    setText("monthlyCustomerGrowth", percent(avgCustomerGrowth));
    setText("monthlyInvoiceRate", number(invoiceRate));
    setText("monthlyRevenuePerBarber", money(revenuePerBarber));
    setText("monthlyInventoryCost", percent(inventoryPercent));

    chart("monthlySalesTrend", rows, row => row.sales, money);
    chart("monthlyProfitTrend", rows, row => row.netProfit, money, "expense");
    salesVsExpenses(rows);
    topMonths(rows);
    table(rows);

    const indicators = document.getElementById("monthlyIndicators");
    if (indicators) {
      indicators.innerHTML = `
        <div class="indicator"><span>ROA</span><strong>${percent(roa)}</strong></div>
        <div class="indicator"><span>Sales Growth</span><strong>${percent(avgSalesGrowth)}</strong></div>
        <div class="indicator"><span>Profit Growth</span><strong>${percent(avgProfitGrowth)}</strong></div>
        <div class="indicator"><span>Profit Margin</span><strong>${percent(profitMargin)}</strong></div>
      `;
    }
  }

  document.addEventListener("DOMContentLoaded", injectMonthlyTab);
  if (document.readyState !== "loading") injectMonthlyTab();
})();
