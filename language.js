const RomeoLanguage = (() => {
  const STORAGE_KEY = "romeo-pos-language";
  const SUPPORTED = ["ar", "en"];

  const DICTIONARY = {
    en: {
      "Menu": "Menu",
      "cashier": "Cashier",
      "invoices": "Invoices",
      "income statement": "Income Statement",
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
      "cashier": "الكاشير",
      "Cashier": "الكاشير",
      "invoices": "الفواتير",
      "Invoices": "الفواتير",
      "income statement": "قائمة الدخل",
      "Income Statement": "قائمة الدخل",
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
    return DICTIONARY[language][key] || key;
  }

  function translatePlaceholder(value, language) {
    const key = normalize(value);
    return PLACEHOLDERS[language][key] || DICTIONARY[language][key] || key;
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
  }

  function saveLanguage(language) {
    const nextLanguage = SUPPORTED.includes(language) ? language : "ar";
    localStorage.setItem(STORAGE_KEY, nextLanguage);
    translateStaticText(nextLanguage);
    window.dispatchEvent(new CustomEvent("romeo-language-change", {
      detail: { language: nextLanguage }
    }));
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
  }

  document.addEventListener("DOMContentLoaded", init);
  if (document.readyState !== "loading") init();

  return {
    applyLanguage: translateStaticText,
    getCurrentLanguage,
    saveLanguage
  };
})();
