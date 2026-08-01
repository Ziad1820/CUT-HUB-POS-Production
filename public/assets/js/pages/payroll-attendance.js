(function () {
  "use strict";

  const byId = id => document.getElementById(id);
  const user = window.RomeoAuth && RomeoAuth.requireAuth
    ? RomeoAuth.requireAuth("payroll_attendance.view") : null;
  if (!user) return;

  const state = {
    periods: [], period: null, settlements: [], selected: null,
    blockers: [], selectedAction: "", selectedAdjustment: null,
    requestSequence: 0, detailSequence: 0, loading: false
  };
  const periodDialog = byId("periodDialog");
  const actionDialog = byId("actionDialog");
  const detailsDialog = byId("detailsDialog");
  const adjustmentDialog = byId("adjustmentDialog");

  function has(permission) {
    return window.RomeoAuth && RomeoAuth.hasPermission(permission);
  }
  function node(tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value !== undefined) element.textContent = String(value);
    return element;
  }
  function money(minor) {
    const value = Number(minor || 0);
    if (!Number.isSafeInteger(value)) return "قيمة غير صالحة";
    const negative = value < 0;
    const absolute = Math.abs(value);
    const major = Math.floor(absolute / 100).toLocaleString("ar-EG");
    const fraction = (absolute % 100).toLocaleString("ar-EG", {
      minimumIntegerDigits: 2, useGrouping: false
    });
    return `${negative ? "-" : ""}${major}.${fraction} ج.م`;
  }
  function majorInputToMinor(value) {
    const source = String(value || "").trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(source)) {
      throw new Error("المبلغ يجب أن يحتوي على منزلتين عشريتين كحد أقصى.");
    }
    const parts = source.split(".");
    const result = Number(parts[0]) * 100 +
      Number((parts[1] || "").padEnd(2, "0"));
    if (!Number.isSafeInteger(result)) {
      throw new Error("المبلغ أكبر من الحد الآمن.");
    }
    return result;
  }
  function requestId(prefix) {
    if (window.crypto && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  function showMessage(message) {
    const box = byId("pageMessage");
    box.textContent = message || "";
    box.hidden = !message;
  }
  function errorMessage(error) {
    return error && (error.message || error.code) || "تعذر إكمال الطلب.";
  }
  async function api(payload) {
    const result = await RomeoApi.request(payload);
    if (!result || result.status === "error") {
      const caught = new Error(result && result.message || "تعذر إكمال الطلب.");
      caught.code = result && result.code;
      throw caught;
    }
    return result;
  }
  function option(label, value) { return new Option(label, value); }
  function currentPeriodId() { return byId("periodSelect").value; }
  function populatePeriods() {
    const select = byId("periodSelect");
    const current = select.value;
    select.replaceChildren(option("اختر فترة", ""));
    state.periods.forEach(period => {
      select.append(option(`${period.startDate} ← ${period.endDate} · ${period.status}`,
        period.payrollPeriodId));
    });
    select.value = state.periods.some(item => item.payrollPeriodId === current)
      ? current : (state.periods[0] && state.periods[0].payrollPeriodId || "");
  }
  function populateFilters() {
    const branch = byId("branchFilter");
    const staff = byId("staffFilter");
    const oldBranch = branch.value;
    const oldStaff = staff.value;
    const branches = new Set();
    const employees = new Map();
    state.settlements.forEach(item => {
      if (item.branchId) branches.add(item.branchId);
      employees.set(item.staffId, item.staffNameSnapshot || item.staffId);
    });
    branch.replaceChildren(option("كل الفروع", ""));
    [...branches].sort().forEach(value => branch.append(option(value, value)));
    staff.replaceChildren(option("كل الموظفين", ""));
    [...employees.entries()].sort((a, b) => a[1].localeCompare(b[1], "ar"))
      .forEach(([id, name]) => staff.append(option(name, id)));
    branch.value = oldBranch;
    staff.value = oldStaff;
  }
  function filteredSettlements() {
    return state.settlements.filter(item =>
      (!byId("branchFilter").value || item.branchId === byId("branchFilter").value) &&
      (!byId("staffFilter").value || item.staffId === byId("staffFilter").value) &&
      (!byId("statusFilter").value || item.status === byId("statusFilter").value));
  }
  function actionButton(label, action, settlement) {
    const button = node("button", "", label);
    button.type = "button";
    button.dataset.action = action;
    button.dataset.settlementId = settlement.settlementId;
    return button;
  }
  function renderSummary(items) {
    byId("employeeCount").textContent = String(items.length);
    byId("deficitMinutes").textContent = String(items.reduce((sum, item) =>
      sum + Number(item.deficitMinutes || 0), 0));
    byId("overtimeMinutes").textContent = String(items.reduce((sum, item) =>
      sum + Number(item.approvedOvertimeMinutes || 0), 0));
    const financialVisible = !items.length ||
      items.some((item) => item.netAttendanceAdjustmentMinor !== undefined);
    byId("deductionAmount").textContent = financialVisible
      ? money(items.reduce((sum, item) =>
        sum + Number(item.deficitDeductionMinor || 0) +
        Number(item.unpaidLeaveDeductionMinor || 0) +
        Number(item.absenceDeductionMinor || 0), 0)) : "محجوب";
    byId("overtimeAmount").textContent = financialVisible
      ? money(items.reduce((sum, item) =>
        sum + Number(item.overtimeCompensationMinor || 0), 0)) : "محجوب";
    byId("blockerCount").textContent = String(state.blockers.length);
  }
  function renderRows() {
    const body = byId("settlementRows");
    body.replaceChildren();
    const items = filteredSettlements();
    items.forEach(settlement => {
      const row = document.createElement("tr");
      const financial = settlement.netAttendanceAdjustmentMinor !== undefined;
      [
        settlement.staffNameSnapshot || settlement.staffId,
        settlement.stale ? "STALE" : settlement.status,
        settlement.requiredMinutes || 0,
        settlement.workedMinutes || 0,
        settlement.deficitMinutes || 0,
        settlement.approvedOvertimeMinutes || 0,
        financial ? money(Number(settlement.deficitDeductionMinor || 0) +
          Number(settlement.unpaidLeaveDeductionMinor || 0) +
          Number(settlement.absenceDeductionMinor || 0)) : "محجوب",
        financial ? money(settlement.overtimeCompensationMinor) : "محجوب",
        financial ? money(settlement.netAttendanceAdjustmentMinor) : "محجوب"
      ].forEach((value, index) => {
        const cell = document.createElement("td");
        if (index === 1) {
          cell.append(node("span",
            `status-badge ${settlement.stale ? "stale" :
              settlement.status === "REVIEW_REQUIRED" ? "warning" : ""}`, value));
        } else {
          cell.textContent = String(value);
        }
        row.append(cell);
      });
      const actions = node("td", "row-actions");
      actions.append(actionButton("تفاصيل", "details", settlement));
      if (has("payroll_attendance.calculate") && state.period &&
          ["CALCULATED", "REOPENED"].includes(state.period.status)) {
        actions.append(actionButton("إعادة حساب", "recalculateEmployeePayrollSettlement", settlement));
      }
      if (has("payroll_attendance.adjust") && state.period &&
          ["CALCULATED", "REOPENED"].includes(state.period.status)) {
        actions.append(actionButton("تعديل يدوي", "adjust", settlement));
      }
      row.append(actions);
      body.append(row);
    });
    body.setAttribute("aria-busy", "false");
    byId("emptyState").hidden = items.length > 0;
    renderSummary(items);
  }
  function renderPeriod() {
    const period = state.period;
    byId("periodStatus").textContent = period ? period.status : "—";
    byId("periodDates").textContent = period
      ? `${period.startDate} ← ${period.endDate}${period.branchId ? ` · ${period.branchId}` : ""}` : "—";
    const status = period && period.status;
    byId("calculateBtn").dataset.action = status === "DRAFT"
      ? "calculatePayrollPeriod" : "recalculatePayrollPeriod";
    byId("calculateBtn").hidden = !period || !has("payroll_attendance.calculate") ||
      !["DRAFT", "CALCULATED", "REOPENED"].includes(status);
    byId("reviewBtn").hidden = !period || !has("payroll_attendance.review") ||
      !["CALCULATED", "REOPENED"].includes(status);
    byId("approveBtn").hidden = !period || !has("payroll_attendance.approve") ||
      status !== "UNDER_REVIEW";
    byId("lockBtn").hidden = !period || !has("payroll_attendance.lock") || status !== "APPROVED";
    byId("reopenBtn").hidden = !period || !has("payroll_attendance.reopen") || status !== "LOCKED";
    byId("exportPreviewBtn").hidden = !period || !has("payroll_attendance.export");
    byId("exportBtn").hidden = !period || !has("payroll_attendance.export") || status !== "LOCKED";
    byId("createPeriodBtn").hidden = !has("payroll_attendance.calculate");
    byId("migrationPreviewBtn").hidden = String(user.username || "").toLowerCase() !== "owner";
  }
  async function loadPeriods(selectFirst) {
    const result = await api({ action: "listPayrollPeriods" });
    state.periods = result.payrollPeriods || [];
    populatePeriods();
    if (selectFirst && !byId("periodSelect").value && state.periods.length) {
      byId("periodSelect").value = state.periods[0].payrollPeriodId;
    }
  }
  async function loadSettlements() {
    const sequence = ++state.requestSequence;
    const periodId = currentPeriodId();
    state.loading = true;
    byId("settlementRows").replaceChildren();
    byId("settlementRows").setAttribute("aria-busy", "true");
    showMessage("");
    if (!periodId) {
      state.period = null;
      state.settlements = [];
      state.blockers = [];
      renderPeriod();
      renderRows();
      state.loading = false;
      return;
    }
    try {
      const [result, blockerResult] = await Promise.all([
        api({ action: "listEmployeePayrollSettlements", payrollPeriodId: periodId }),
        api({ action: "getUnresolvedPayrollBlockers", payrollPeriodId: periodId })
      ]);
      if (sequence !== state.requestSequence) return;
      state.period = result.payrollPeriod;
      state.settlements = result.settlements || [];
      state.blockers = blockerResult.blockers || [];
      populateFilters();
      renderPeriod();
      renderRows();
      byId("syncState").textContent = "البيانات محدثة";
    } catch (caught) {
      if (sequence !== state.requestSequence) return;
      state.settlements = [];
      state.blockers = [];
      renderRows();
      showMessage(errorMessage(caught));
      byId("syncState").textContent = "تعذر التحديث";
    } finally {
      if (sequence === state.requestSequence) state.loading = false;
    }
  }
  function openAction(action, settlement) {
    state.selectedAction = action;
    state.selected = settlement || null;
    if (!["approvePayrollManualAdjustment", "rejectPayrollManualAdjustment"].includes(action)) {
      state.selectedAdjustment = null;
    }
    const labels = {
      calculatePayrollPeriod: "حساب الفترة",
      recalculatePayrollPeriod: "إعادة حساب الفترة",
      submitPayrollPeriodForReview: "إرسال الفترة للمراجعة",
      approvePayrollPeriod: "اعتماد الفترة",
      lockPayrollPeriod: "قفل الفترة",
      reopenPayrollPeriod: "إعادة فتح الفترة",
      recalculateEmployeePayrollSettlement: "إعادة حساب تسوية الموظف"
      ,approvePayrollManualAdjustment: "اعتماد التعديل اليدوي"
      ,rejectPayrollManualAdjustment: "رفض التعديل اليدوي"
    };
    byId("actionDialogTitle").textContent = labels[action] || "تأكيد الإجراء";
    byId("actionReason").value = "";
    actionDialog.showModal();
    byId("actionReason").focus();
  }
  async function submitAction(event) {
    event.preventDefault();
    const action = state.selectedAction;
    const payload = {
      action,
      payrollPeriodId: currentPeriodId(),
      requestId: requestId("PAY"),
      reason: byId("actionReason").value.trim()
    };
    if (state.selected) {
      payload.staffId = state.selected.staffId;
      payload.settlementId = state.selected.settlementId;
    }
    if (state.selectedAdjustment) payload.adjustmentId = state.selectedAdjustment.adjustmentId;
    const button = byId("confirmActionBtn");
    button.disabled = true;
    try {
      await api(payload);
      actionDialog.close();
      if (detailsDialog.open) detailsDialog.close();
      state.selectedAdjustment = null;
      await loadPeriods(false);
      await loadSettlements();
    } catch (caught) {
      showMessage(errorMessage(caught));
    } finally {
      button.disabled = false;
    }
  }
  function detailMetric(label, value) {
    const article = node("article");
    article.append(node("span", "", label), node("strong", "", value));
    return article;
  }
  async function showDetails(settlement) {
    const sequence = ++state.detailSequence;
    const content = byId("detailsContent");
    content.replaceChildren(node("p", "", "جارٍ تحميل التفاصيل…"));
    detailsDialog.showModal();
    try {
      const [result, auditResult] = await Promise.all([
        api({ action: "getEmployeePayrollSettlement", settlementId: settlement.settlementId }),
        api({ action: "getPayrollSettlementAudit", entityId: settlement.settlementId, staffId: settlement.staffId })
      ]);
      if (sequence !== state.detailSequence) return;
      const item = result.settlement;
      content.replaceChildren();
      const grid = node("section", "detail-grid");
      [
        ["الراتب الأساسي", item.baseSalaryMinor === undefined ? "محجوب" : money(item.baseSalaryMinor)],
        ["أساس الراتب", item.salaryBasis || "—"],
        ["دقائق العجز", item.deficitMinutes || 0],
        ["خصم العجز", item.deficitDeductionMinor === undefined ? "محجوب" : money(item.deficitDeductionMinor)],
        ["إجازة بدون راتب", item.unpaidLeaveMinutes || 0],
        ["خصم الغياب", item.absenceDeductionMinor === undefined ? "محجوب" : money(item.absenceDeductionMinor)],
        ["الإضافي المعتمد", item.approvedOvertimeMinutes || 0],
        ["تعويض الإضافي", item.overtimeCompensationMinor === undefined ? "محجوب" : money(item.overtimeCompensationMinor)],
        ["صافي التعديل", item.netAttendanceAdjustmentMinor === undefined ? "محجوب" : money(item.netAttendanceAdjustmentMinor)],
        ["بصمة المصدر", item.sourceAggregateHash || "—"]
      ].forEach(([label, value]) => grid.append(detailMetric(label, value)));
      content.append(grid, node("h3", "", "مصادر الحضور اليومية"));
      (item.sourceAttendanceSnapshot || []).forEach(day => {
        content.append(node("div", "source-day",
          `${day.attendanceDate} · ${day.status} · مطلوب ${day.requiredMinutes} · عجز ${day.deficitMinutes} · إضافي ${day.approvedOvertimeMinutes}`));
      });
      content.append(node("h3", "", "التعديلات"));
      (result.adjustments || []).forEach(adjustment => {
        const row = node("div", "source-day",
          `${adjustment.category} · ${adjustment.direction} · ${money(adjustment.amountMinor)} · ${adjustment.status}`);
        if (adjustment.status === "PENDING" && has("payroll_attendance.adjust") &&
            state.period && ["CALCULATED", "REOPENED"].includes(state.period.status)) {
          const approve = node("button", "", "اعتماد");
          approve.addEventListener("click", () => decideAdjustment(adjustment, true));
          const reject = node("button", "", "رفض");
          reject.addEventListener("click", () => decideAdjustment(adjustment, false));
          row.append(" ", approve, " ", reject);
        }
        content.append(row);
      });
      content.append(node("h3", "", "سجل التدقيق"));
      (auditResult.audit || []).forEach(entry => {
        content.append(node("div", "source-day",
          `${entry.action} · ${entry.timestamp} · ${entry.actorName || entry.actorId} · ${entry.reason || "—"}`));
      });
    } catch (caught) {
      if (sequence !== state.detailSequence) return;
      content.replaceChildren(node("p", "page-message", errorMessage(caught)));
    }
  }
  async function decideAdjustment(adjustment, approved) {
    state.selectedAdjustment = adjustment;
    openAction(approved ? "approvePayrollManualAdjustment" : "rejectPayrollManualAdjustment");
  }
  function downloadCsv(result) {
    const blob = new Blob(["\uFEFF", result.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payroll-attendance-${currentPeriodId()}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
  async function exportReport(execute) {
    try {
      const result = await api({
        action: execute ? "exportPayrollAttendanceReport" : "previewPayrollAttendanceExport",
        payrollPeriodId: currentPeriodId(),
        requestId: execute ? requestId("PAYEXP") : undefined,
        reason: execute ? "Authorized payroll attendance CSV export" : undefined
      });
      if (execute) {
        downloadCsv(result);
      } else {
        byId("detailsContent").replaceChildren(node("pre", "", result.csv));
        detailsDialog.showModal();
      }
    } catch (caught) { showMessage(errorMessage(caught)); }
  }

  byId("periodSelect").addEventListener("change", loadSettlements);
  ["branchFilter", "staffFilter", "statusFilter"].forEach(id =>
    byId(id).addEventListener("change", renderRows));
  byId("refreshBtn").addEventListener("click", async () => {
    await loadPeriods(false); await loadSettlements();
  });
  document.querySelectorAll("[data-action]").forEach(button =>
    button.addEventListener("click", () => openAction(button.dataset.action)));
  byId("settlementRows").addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const settlement = state.settlements.find(item => item.settlementId === button.dataset.settlementId);
    if (!settlement) return;
    if (button.dataset.action === "details") showDetails(settlement);
    else if (button.dataset.action === "adjust") {
      state.selected = settlement;
      byId("adjustmentForm").reset();
      adjustmentDialog.showModal();
    } else openAction(button.dataset.action, settlement);
  });
  byId("actionForm").addEventListener("submit", submitAction);
  byId("createPeriodBtn").addEventListener("click", () => {
    byId("periodForm").reset();
    periodDialog.showModal();
  });
  byId("periodForm").addEventListener("submit", async event => {
    event.preventDefault();
    const submitter = event.submitter;
    if (submitter) submitter.disabled = true;
    try {
      const result = await api({
        action: "createPayrollPeriod", startDate: byId("periodStart").value,
        endDate: byId("periodEnd").value, branchId: byId("periodBranch").value.trim(),
        notes: byId("periodNotes").value.trim(), reason: byId("periodReason").value.trim(),
        requestId: requestId("PAYPER")
      });
      periodDialog.close();
      await loadPeriods(false);
      byId("periodSelect").value = result.payrollPeriod.payrollPeriodId;
      await loadSettlements();
    } catch (caught) { showMessage(errorMessage(caught)); }
    finally { if (submitter) submitter.disabled = false; }
  });
  byId("adjustmentForm").addEventListener("submit", async event => {
    event.preventDefault();
    const submitter = event.submitter;
    if (submitter) submitter.disabled = true;
    try {
      const amountMinor = majorInputToMinor(byId("adjustmentAmount").value);
      await api({
        action: "requestPayrollManualAdjustment",
        settlementId: state.selected.settlementId,
        amountMinor, direction: byId("adjustmentDirection").value,
        category: byId("adjustmentCategory").value.trim(),
        reason: byId("adjustmentReason").value.trim(),
        requestId: requestId("PAYADJ")
      });
      adjustmentDialog.close();
      await loadSettlements();
    } catch (caught) { showMessage(errorMessage(caught)); }
    finally { if (submitter) submitter.disabled = false; }
  });
  byId("exportPreviewBtn").addEventListener("click", () => exportReport(false));
  byId("exportBtn").addEventListener("click", () => exportReport(true));
  byId("migrationPreviewBtn").addEventListener("click", async () => {
    try {
      const result = await api({ action: "previewPayrollPhase4Migration" });
      byId("detailsContent").replaceChildren(node("pre", "", JSON.stringify(result.migration, null, 2)));
      detailsDialog.showModal();
    } catch (caught) { showMessage(errorMessage(caught)); }
  });
  document.querySelectorAll("[data-close-dialog]").forEach(button =>
    button.addEventListener("click", () => button.closest("dialog").close()));
  window.addEventListener("romeo-connectivity-change", event => {
    byId("syncState").textContent = event.detail.online ? "الاتصال متاح" : "غير متصل";
  });

  (async () => {
    try {
      await loadPeriods(true);
      await loadSettlements();
    } catch (caught) {
      showMessage(errorMessage(caught));
      byId("syncState").textContent = "تعذر التحميل";
    }
  })();
})();
