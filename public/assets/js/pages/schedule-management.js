(function () {
  "use strict";

  const WEEKDAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
  const DAY_LABELS = {
    MONDAY: "الاثنين", TUESDAY: "الثلاثاء", WEDNESDAY: "الأربعاء",
    THURSDAY: "الخميس", FRIDAY: "الجمعة", SATURDAY: "السبت", SUNDAY: "الأحد"
  };
  const OVERRIDE_TYPES = [
    "CUSTOM_SHIFT", "DAY_OFF", "APPROVED_LEAVE", "UNPAID_LEAVE", "SICK_LEAVE",
    "ABSENT", "PARTIAL_ABSENCE", "PLANNED_BREAK", "TRAINING", "BRANCH_CLOSED"
  ];
  const OVERRIDE_LABELS = {
    CUSTOM_SHIFT: "وردية مخصصة", DAY_OFF: "إجازة يوم محدد", APPROVED_LEAVE: "إجازة مدفوعة مخططة",
    UNPAID_LEAVE: "إجازة غير مدفوعة مخططة", SICK_LEAVE: "إجازة مرضية مخططة",
    ABSENT: "غياب مخطط — مفهوم جدول فقط", PARTIAL_ABSENCE: "غياب جزئي مخطط",
    PLANNED_BREAK: "بريك مخطط", TRAINING: "تدريب", BRANCH_CLOSED: "إغلاق فرع"
  };
  const INTERVAL_TYPES = ["PARTIAL_ABSENCE", "PLANNED_BREAK", "TRAINING"];
  const state = {
    staff: [], schedules: [], overrides: [], resolved: [], scopes: [],
    permissions: {}, dirty: false, busy: false, decisionResolve: null
  };
  const byId = id => document.getElementById(id);

  function requestId(prefix) {
    const random = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${prefix}-${random}`;
  }

  function dateKey(date) {
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
  }

  function plusDays(value, days) {
    const date = new Date(`${value}T12:00:00`);
    date.setDate(date.getDate() + days);
    return dateKey(date);
  }

  function setStatus(message, type) {
    const banner = byId("statusBanner");
    banner.textContent = message || "";
    banner.className = `status ${type || ""}`.trim();
  }

  function toast(message, error) {
    const element = byId("toast");
    element.textContent = message;
    element.className = `toast show${error ? " error" : ""}`;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { element.className = "toast"; }, 3500);
  }

  function requestDecision(options) {
    const config = options || {};
    byId("decisionDialogTitle").textContent = config.title || "تأكيد الإجراء";
    byId("decisionConsequence").textContent = config.consequence || "";
    byId("decisionConfirmBtn").textContent = config.confirmLabel || "تأكيد";
    byId("decisionConfirmBtn").className = config.danger
      ? "primary-btn danger-confirm" : "primary-btn";
    const details = byId("decisionDetails");
    details.replaceChildren();
    (config.details || []).forEach(([label, value]) => {
      const row = document.createElement("div");
      const term = document.createElement("strong"); term.textContent = label;
      const detail = document.createElement("span"); detail.textContent = value || "—";
      row.append(term, detail); details.append(row);
    });
    const reasonField = byId("decisionReasonField");
    const evidenceField = byId("decisionEvidenceField");
    reasonField.hidden = config.reasonRequired === false;
    evidenceField.hidden = !config.evidenceRequired;
    byId("decisionReason").required = config.reasonRequired !== false;
    byId("decisionEvidence").required = !!config.evidenceRequired;
    byId("decisionReason").value = "";
    byId("decisionEvidence").value = config.defaultEvidence || "";
    byId("decisionDialog").showModal();
    return new Promise(resolve => { state.decisionResolve = resolve; });
  }

  function finishDecision(result) {
    if (byId("decisionDialog").open) byId("decisionDialog").close();
    const resolve = state.decisionResolve;
    state.decisionResolve = null;
    if (resolve) resolve(result);
  }

  async function api(action, payload) {
    let result;
    try {
      result = await RomeoApi.request({ action, ...(payload || {}) });
    } catch (cause) {
      const error = new Error(cause?.message || "تعذر الاتصال بالخادم.");
      error.code = cause?.code || "SCHEDULE_NETWORK_ERROR";
      throw error;
    }
    if (!result || result.status !== "success") {
      const error = new Error(result?.message || "تعذر تنفيذ الطلب.");
      error.code = result?.code || "REQUEST_FAILED";
      error.details = result?.details;
      throw error;
    }
    return result;
  }

  function option(value, label) {
    const node = document.createElement("option");
    node.value = value;
    node.textContent = label;
    return node;
  }

  function selectedStaff() {
    return state.staff.find(item => item.staffId === byId("staffFilter").value) || null;
  }

  function shiftLabel(item) {
    const overnight = item.overnight ||
      (item.shiftStart && item.shiftEnd && item.shiftEnd <= item.shiftStart);
    return `${item.shiftStart}–${item.shiftEnd}${overnight ? " (ليلي)" : ""}`;
  }

  function populateSelectors() {
    const staffFilter = byId("staffFilter");
    const previous = staffFilter.value;
    staffFilter.replaceChildren(option("", "اختر موظفًا"));
    const branch = byId("branchFilter").value;
    state.staff
      .filter(item => !byId("activeOnly").checked || item.active)
      .filter(item => !branch || item.branchId === branch)
      .forEach(item => staffFilter.appendChild(option(item.staffId, item.staffName)));
    staffFilter.value = state.staff.some(item => item.staffId === previous) ? previous : "";

    const target = byId("targetStaff");
    target.replaceChildren(option("", "اختر موظفًا"));
    state.staff.forEach(item => target.appendChild(option(item.staffId, item.staffName)));
    const scopeStaff = byId("scopeStaff");
    scopeStaff.replaceChildren(option("", "بدون موظف"));
    state.staff.forEach(item => scopeStaff.appendChild(option(item.staffId, item.staffName)));
  }

  function populateStaticOptions() {
    ["segmentWeekday", "sourceDay", "targetDay"].forEach(id => {
      const select = byId(id);
      WEEKDAYS.forEach(day => select.appendChild(option(day, DAY_LABELS[day])));
    });
    OVERRIDE_TYPES.forEach(type => byId("overrideType").appendChild(option(type, OVERRIDE_LABELS[type])));
  }

  function actionButton(label, action, id, danger) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = danger ? "secondary-btn danger" : "secondary-btn";
    button.textContent = label;
    button.dataset.action = action;
    button.dataset.id = id;
    return button;
  }

  function renderWeekly() {
    const body = byId("weeklyBody");
    body.replaceChildren();
    const staffId = byId("staffFilter").value;
    const records = state.schedules.filter(item => item.staffId === staffId && item.active !== false);
    const unresolved = records.filter(item => item.resolutionEligible === false);
    byId("validationSummary").textContent = unresolved.length
      ? `${unresolved.length} سجل قديم غير محلول تم استبعاده من الحساب: ${
        unresolved.flatMap(item => item.warnings || []).join("، ")}`
      : "";
    WEEKDAYS.forEach(day => {
      const dayRecords = records.filter(item => item.weekday === day);
      const dayOff = dayRecords.find(item => item.recordType === "WEEKLY_DAY_OFF");
      const rows = dayRecords.filter(item => (item.recordType || "SHIFT") === "SHIFT")
        .sort((a, b) => Number(a.segmentIndex) - Number(b.segmentIndex));
      const tr = document.createElement("tr");
      const values = [
        DAY_LABELS[day],
        dayOff ? "راحة أسبوعية" : (rows.map(item =>
          item.resolutionEligible === false
            ? "سجل قديم غير محلول" : shiftLabel(item)).join("، ") || "غير مجدول"),
        rows.reduce((sum, item) => sum + Number(item.requiredWorkMinutes || 0), 0) || "—",
        rows.reduce((sum, item) => sum + Number(item.allowedBreakMinutes || 0), 0) || "—",
        (dayOff ? [dayOff] : rows)
          .map(item => `${item.effectiveFrom}${item.effectiveTo ? ` ← ${item.effectiveTo}` : ""}`).join("، ") || "—"
      ];
      values.forEach(value => {
        const td = document.createElement("td");
        td.textContent = String(value);
        tr.appendChild(td);
      });
      const actions = document.createElement("td");
      actions.className = "row-actions";
      if (state.permissions.manage) {
        if (dayOff && !dayOff.readOnly) {
          actions.appendChild(actionButton("إلغاء الراحة", "deactivate-segment", dayOff.scheduleId, true));
        } else if (!dayRecords.some(item => item.readOnly)) {
          actions.appendChild(actionButton("تعيين راحة أسبوعية", "weekly-day-off", day));
        }
        rows.forEach(item => {
          if (item.readOnly) {
            const label = document.createElement("span");
            label.className = "tag";
            label.textContent = item.resolutionEligible === false
              ? "قديم غير محلول" : "قديم للقراءة فقط";
            actions.appendChild(label);
            return;
          }
          actions.appendChild(actionButton("تعديل", "edit-segment", item.scheduleId));
          actions.appendChild(actionButton("تعطيل", "deactivate-segment", item.scheduleId, true));
        });
      }
      tr.appendChild(actions);
      body.appendChild(tr);
    });
    byId("weeklyEmpty").hidden = !!records.length;
  }

  function renderRange() {
    const grid = byId("rangeGrid");
    grid.replaceChildren();
    state.resolved.forEach(item => {
      const card = document.createElement("article");
      card.className = `day-card ${item.shiftSegments?.length ? "" : "blocked"}`;
      const title = document.createElement("h3");
      title.textContent = item.date;
      const source = document.createElement("span");
      source.className = "tag";
      source.textContent = item.classification || item.sourceType;
      const shift = document.createElement("p");
      shift.textContent = item.shiftSegments?.length
        ? item.shiftSegments.map(shiftLabel).join("، ")
        : "لا توجد وردية";
      const minutes = document.createElement("p");
      minutes.textContent = `المطلوب: ${item.requiredWorkMinutes || 0} دقيقة · البريك: ${item.allowedBreakMinutes || 0}`;
      card.append(title, source, shift, minutes);
      if (item.blockedIntervals?.length) {
        const blocks = document.createElement("p");
        blocks.textContent = item.blockedIntervals.map(block => `${block.type}: ${block.start}–${block.end}`).join("، ");
        card.appendChild(blocks);
      }
      grid.appendChild(card);
    });
    byId("rangeEmpty").hidden = !!state.resolved.length;
  }

  function renderOverrides() {
    const body = byId("overrideBody");
    body.replaceChildren();
    state.overrides.forEach(item => {
      const tr = document.createElement("tr");
      [item.date, item.type, item.scopeType, item.status, item.reason].forEach(value => {
        const td = document.createElement("td");
        td.textContent = value || "—";
        tr.appendChild(td);
      });
      const actions = document.createElement("td");
      actions.className = "row-actions";
      if (item.status === "PENDING" && state.permissions.leaveApprove) {
        actions.append(actionButton("اعتماد", "approve-override", item.overrideId));
        actions.append(actionButton("رفض", "reject-override", item.overrideId, true));
      }
      if ((state.permissions.manage && ["DRAFT", "PENDING", "APPROVED"].includes(item.status)) ||
        (state.permissions.leaveRequest && ["DRAFT", "PENDING"].includes(item.status))) {
        actions.append(actionButton("إلغاء", "cancel-override", item.overrideId, true));
      }
      tr.appendChild(actions);
      body.appendChild(tr);
    });
  }

  function renderAudit(records) {
    const list = byId("auditList");
    list.replaceChildren();
    (records || []).slice().reverse().forEach(item => {
      const row = document.createElement("div");
      row.className = "audit-item";
      row.textContent = `${item.timestamp || ""} · ${item.actorName || item.actorId} · ${item.action} · ${item.reason || "بدون سبب"}`;
      list.appendChild(row);
    });
    if (!records?.length) list.textContent = "لا توجد تغييرات مسجلة.";
  }

  function renderScopes() {
    const body = byId("scopeBody");
    body.replaceChildren();
    state.scopes.forEach(item => {
      const tr = document.createElement("tr");
      [
        item.username, item.role,
        state.staff.find(staffMember => staffMember.staffId === item.staffId)?.staffName || item.staffId || "—",
        (item.branchIds || []).join("، ") || "—",
        item.active === true || String(item.active).toUpperCase() === "TRUE" ? "نعم" : "لا"
      ].forEach(value => {
        const td = document.createElement("td");
        td.textContent = value;
        tr.appendChild(td);
      });
      const actions = document.createElement("td");
      actions.appendChild(actionButton("تعديل", "edit-scope", item.scopeId));
      tr.appendChild(actions);
      body.appendChild(tr);
    });
    byId("scopeEmpty").hidden = !!state.scopes.length;
  }

  function applyPermissions() {
    document.querySelectorAll(".manage-only").forEach(item => {
      item.hidden = !state.permissions.manage;
    });
    document.querySelectorAll(".override-write").forEach(item => {
      item.hidden = !(state.permissions.manage || state.permissions.leaveRequest);
    });
    document.querySelectorAll(".owner-only").forEach(item => {
      item.hidden = !state.permissions.owner;
    });
    Array.from(byId("overrideType").options).forEach(item => {
      item.hidden = !state.permissions.manage &&
        !["APPROVED_LEAVE", "UNPAID_LEAVE", "SICK_LEAVE"].includes(item.value);
    });
    if (!state.permissions.manage) {
      byId("overrideScope").value = "STAFF";
      byId("overrideScope").disabled = true;
      byId("overrideBranch").disabled = true;
    }
  }

  async function loadPageData() {
    setStatus("جارٍ تحميل إعدادات الجداول…", "loading");
    const result = await api("getSchedulePageData");
    state.staff = result.staff || [];
    state.permissions = result.permissions || {};
    const branch = byId("branchFilter");
    branch.replaceChildren(option("", "كل الفروع"));
    (result.branches || []).forEach(id => branch.appendChild(option(id, id)));
    populateSelectors();
    applyPermissions();
    byId("scopePanel").hidden = !state.permissions.owner;
    if (state.permissions.owner) {
      const scopeResult = await api("listScheduleUserScopes");
      state.scopes = scopeResult.scopes || [];
      renderScopes();
    } else {
      state.scopes = [];
    }
    setStatus("");
  }

  async function loadSelected() {
    const staff = selectedStaff();
    if (!staff) {
      state.schedules = []; state.overrides = []; state.resolved = [];
      renderWeekly(); renderOverrides(); renderRange(); renderAudit([]);
      return;
    }
    setStatus("جارٍ تحميل الجدول…", "loading");
    document.querySelector("main").setAttribute("aria-busy", "true");
    state.schedules = []; state.overrides = []; state.resolved = [];
    renderWeekly(); renderOverrides(); renderRange(); renderAudit([]);
    const from = byId("rangeStart").value;
    const to = byId("rangeEnd").value;
    try {
      const [weekly, overrides, resolved, audit] = await Promise.all([
        api("getStaffWeeklySchedule", { staffId: staff.staffId }),
        api("listScheduleOverrides", { staffId: staff.staffId, dateFrom: from, dateTo: to, limit: 200 }),
        api("resolveStaffSchedulesRange", { staffIds: [staff.staffId], dateFrom: from, dateTo: to }),
        api("getScheduleAuditHistory", { staffId: staff.staffId })
      ]);
      state.schedules = weekly.schedules || [];
      state.overrides = overrides.overrides || [];
      state.resolved = resolved.resolvedSchedules || [];
      renderWeekly(); renderOverrides(); renderRange(); renderAudit(audit.audit || []);
      setStatus("");
    } catch (error) {
      const message = error.code === "PERMISSION_DENIED"
        ? "ليس لديك صلاحية لعرض بيانات الجدول المطلوبة."
        : `${error.code}: ${error.message}`;
      setStatus(message, "error");
    } finally {
      document.querySelector("main").setAttribute("aria-busy", "false");
    }
  }

  function openSegment(existing) {
    const today = dateKey(new Date());
    byId("segmentId").value = existing?.scheduleId || "";
    byId("segmentWeekday").value = existing?.weekday || "MONDAY";
    byId("segmentIndex").value = existing?.segmentIndex || 1;
    byId("segmentStart").value = existing?.shiftStart || "09:00";
    byId("segmentEnd").value = existing?.shiftEnd || "17:00";
    byId("requiredMinutes").value = existing?.requiredWorkMinutes ?? 420;
    byId("breakMinutes").value = existing?.allowedBreakMinutes ?? 60;
    byId("effectiveFrom").value = existing?.effectiveFrom === "0001-01-01" ? today : (existing?.effectiveFrom || today);
    byId("effectiveTo").value = existing?.effectiveTo || "";
    byId("segmentReason").value = "";
    state.dirty = false;
    byId("segmentDialog").showModal();
  }

  function updateOverrideFields() {
    const type = byId("overrideType").value;
    document.querySelectorAll(".override-shift").forEach(element => {
      element.hidden = type !== "CUSTOM_SHIFT";
    });
    document.querySelectorAll(".override-block").forEach(element => {
      element.hidden = !INTERVAL_TYPES.includes(type);
    });
    if (type === "BRANCH_CLOSED") byId("overrideScope").value = "BRANCH";
    else byId("overrideScope").value = "STAFF";
  }

  function openCopy(mode) {
    byId("copyMode").value = mode;
    const employee = mode === "employee";
    byId("copyTitle").textContent = employee ? "نسخ جدول موظف" : "نسخ فترات يوم";
    byId("sourceDayLabel").hidden = employee;
    byId("targetDayLabel").hidden = employee;
    byId("targetStaffLabel").hidden = !employee;
    byId("copyEffectiveFrom").value = dateKey(new Date());
    byId("copyReason").value = "";
    byId("copyDialog").showModal();
  }

  function openScope(existing) {
    byId("scopeId").value = existing?.scopeId || "";
    byId("scopeUsername").value = existing?.username || "";
    byId("scopeUsername").disabled = !!existing;
    byId("scopeRole").value = existing?.role || "EMPLOYEE";
    byId("scopeStaff").value = existing?.staffId || "";
    byId("scopeBranches").value = (existing?.branchIds || []).join(", ");
    byId("scopeActive").checked = existing
      ? existing.active === true || String(existing.active).toUpperCase() === "TRUE" : true;
    byId("scopeReason").value = "";
    state.dirty = false;
    byId("scopeDialog").showModal();
  }

  async function runMutation(button, action, payload, successMessage) {
    if (state.busy) return;
    state.busy = true;
    button.disabled = true;
    const sourceDialog = button.closest("dialog");
    if (sourceDialog) sourceDialog.setAttribute("aria-busy", "true");
    try {
      await api(action, { ...payload, requestId: requestId(action) });
      state.dirty = false;
      toast(successMessage);
      document.querySelectorAll("dialog[open]").forEach(dialog => dialog.close());
      await loadSelected();
    } catch (error) {
      const details = error.details ? ` · ${JSON.stringify(error.details)}` : "";
      const message = `${error.code}: ${error.message}${details}`;
      setStatus(message, "error");
      toast(message, true);
    } finally {
      state.busy = false;
      button.disabled = false;
      if (sourceDialog) sourceDialog.removeAttribute("aria-busy");
    }
  }

  function bindEvents() {
    byId("staffFilter").addEventListener("change", loadSelected);
    byId("branchFilter").addEventListener("change", () => {
      populateSelectors();
      loadSelected();
    });
    byId("activeOnly").addEventListener("change", () => {
      populateSelectors();
      loadSelected();
    });
    byId("loadRangeBtn").addEventListener("click", loadSelected);
    byId("refreshBtn").addEventListener("click", async () => { await loadPageData(); await loadSelected(); });
    byId("migrationPreviewBtn").addEventListener("click", async () => {
      const button = byId("migrationPreviewBtn");
      button.disabled = true;
      setStatus("جارٍ تجهيز معاينة الترحيل بدون أي كتابة…", "loading");
      try {
        const result = await api("previewStaffScheduleMigration");
        byId("migrationPreviewOutput").textContent = JSON.stringify(result.migration, null, 2);
        byId("migrationPreviewDialog").showModal();
        setStatus("");
      } catch (error) {
        setStatus(`${error.code}: ${error.message}`, "error");
      } finally {
        button.disabled = false;
      }
    });
    byId("addSegmentBtn").addEventListener("click", () => {
      if (!selectedStaff()) return toast("اختر موظفًا أولًا.", true);
      openSegment(null);
    });
    byId("addOverrideBtn").addEventListener("click", () => {
      if (!selectedStaff() && byId("overrideScope").value === "STAFF") return toast("اختر موظفًا أولًا.", true);
      byId("overrideDate").value = dateKey(new Date());
      byId("overrideType").value = state.permissions.manage ? "CUSTOM_SHIFT" : "APPROVED_LEAVE";
      byId("overrideReason").value = "";
      byId("sourceEvidence").value = "";
      updateOverrideFields();
      state.dirty = false;
      byId("overrideDialog").showModal();
    });
    byId("copyDayBtn").addEventListener("click", () => openCopy("day"));
    byId("copyEmployeeBtn").addEventListener("click", () => openCopy("employee"));
    byId("addScopeBtn").addEventListener("click", () => openScope(null));
    byId("applyRangeBtn").addEventListener("click", async () => {
      const staff = selectedStaff();
      const segments = state.schedules.filter(item =>
        item.staffId === staff?.staffId && item.active !== false &&
        (item.recordType || "SHIFT") === "SHIFT");
      if (!staff || !segments.length) return toast("اختر موظفًا لديه جدول أسبوعي أولًا.", true);
      const from = byId("rangeStart").value;
      const to = byId("rangeEnd").value;
      const decision = await requestDecision({
        title: "تطبيق الجدول على فترة",
        confirmLabel: "تطبيق الجدول",
        consequence: "سيتم إنشاء فترات فعّالة داخل النطاق المحدد بعد التحقق من التعارضات، مع تسجيل القرار في سجل التدقيق.",
        details: [["الموظف", staff.staffName], ["الفترة", `${from} ← ${to}`], ["عدد الفترات", String(segments.length)]]
      });
      if (!decision) return;
      runMutation(byId("applyRangeBtn"), "applyScheduleDateRange", {
        staffId: staff.staffId, effectiveFrom: from, effectiveTo: to,
        segments: segments.map(item => ({
          weekday: item.weekday, segmentIndex: item.segmentIndex,
          shiftStart: item.shiftStart, shiftEnd: item.shiftEnd,
          requiredWorkMinutes: item.requiredWorkMinutes,
          allowedBreakMinutes: item.allowedBreakMinutes, active: true
        })),
        reason: decision.reason
      }, "تم تطبيق الجدول على الفترة.");
    });
    byId("overrideType").addEventListener("change", updateOverrideFields);
    document.querySelectorAll("dialog:not(#decisionDialog) form input, dialog:not(#decisionDialog) form select").forEach(input => {
      input.addEventListener("input", () => { state.dirty = true; });
    });
    async function closeDialogSafely(dialog) {
      if (state.busy) {
        toast("انتظر حتى يكتمل الطلب الحالي قبل إغلاق النافذة.", true);
        return;
      }
      if (state.dirty) {
        const decision = await requestDecision({
          title: "تجاهل التغييرات غير المحفوظة",
          confirmLabel: "تجاهل وإغلاق",
          danger: true,
          reasonRequired: false,
          consequence: "سيتم فقد البيانات التي أدخلتها في هذه النافذة فقط، ولن تُرسل أي تغييرات إلى الخادم.",
          details: [["النافذة", dialog.getAttribute("aria-labelledby") ?
            byId(dialog.getAttribute("aria-labelledby"))?.textContent : "نموذج الجدول"]]
        });
        if (!decision) return;
      }
      state.dirty = false;
      dialog.close();
    }
    document.querySelectorAll("[data-close]").forEach(button => {
      button.addEventListener("click", () => closeDialogSafely(byId(button.dataset.close)));
    });
    document.querySelectorAll("dialog:not(#decisionDialog):not(#migrationPreviewDialog)").forEach(dialog => {
      dialog.addEventListener("cancel", event => {
        if (!state.dirty) return;
        event.preventDefault();
        closeDialogSafely(dialog);
      });
    });
    byId("decisionForm").addEventListener("submit", event => {
      event.preventDefault();
      finishDecision({
        reason: byId("decisionReason").value.trim(),
        evidence: byId("decisionEvidence").value.trim()
      });
    });
    byId("decisionCancelBtn").addEventListener("click", () => finishDecision(null));
    byId("decisionCloseBtn").addEventListener("click", () => finishDecision(null));
    byId("decisionDialog").addEventListener("cancel", event => {
      event.preventDefault(); finishDecision(null);
    });
    document.querySelectorAll("[data-close-preview]").forEach(button => {
      button.addEventListener("click", () => byId("migrationPreviewDialog").close());
    });

    byId("segmentForm").addEventListener("submit", event => {
      event.preventDefault();
      const staff = selectedStaff();
      runMutation(byId("saveSegmentBtn"), "saveScheduleSegment", {
        scheduleId: byId("segmentId").value, staffId: staff.staffId,
        weekday: byId("segmentWeekday").value, segmentIndex: Number(byId("segmentIndex").value),
        shiftStart: byId("segmentStart").value, shiftEnd: byId("segmentEnd").value,
        requiredWorkMinutes: Number(byId("requiredMinutes").value),
        allowedBreakMinutes: Number(byId("breakMinutes").value),
        effectiveFrom: byId("effectiveFrom").value, effectiveTo: byId("effectiveTo").value,
        active: true, reason: byId("segmentReason").value
      }, "تم حفظ فترة العمل.");
    });

    byId("overrideForm").addEventListener("submit", event => {
      event.preventDefault();
      const type = byId("overrideType").value;
      runMutation(byId("saveOverrideBtn"), "createScheduleOverride", {
        staffId: byId("overrideScope").value === "STAFF" ? selectedStaff()?.staffId : "",
        date: byId("overrideDate").value, type, scopeType: byId("overrideScope").value,
        branchId: byId("overrideScope").value === "BRANCH" ? byId("overrideBranch").value : "",
        shiftStart: type === "CUSTOM_SHIFT" ? byId("overrideStart").value : "",
        shiftEnd: type === "CUSTOM_SHIFT" ? byId("overrideEnd").value : "",
        requiredWorkMinutes: type === "CUSTOM_SHIFT" ? Number(byId("overrideRequired").value) : "",
        allowedBreakMinutes: type === "CUSTOM_SHIFT" ? Number(byId("overrideBreak").value) : "",
        blockStart: INTERVAL_TYPES.includes(type) ? byId("blockStart").value : "",
        blockEnd: INTERVAL_TYPES.includes(type) ? byId("blockEnd").value : "",
        reason: byId("overrideReason").value, sourceEvidence: byId("sourceEvidence").value,
        status: state.permissions.manage && !["APPROVED_LEAVE", "UNPAID_LEAVE", "SICK_LEAVE"].includes(type)
          ? "APPROVED" : "PENDING"
      }, "تم حفظ الاستثناء.");
    });

    byId("copyForm").addEventListener("submit", event => {
      event.preventDefault();
      const mode = byId("copyMode").value;
      const action = mode === "employee" ? "copyEmployeeSchedule" : "copyScheduleDay";
      const payload = mode === "employee"
        ? {
          sourceStaffId: selectedStaff().staffId, targetStaffId: byId("targetStaff").value,
          effectiveFrom: byId("copyEffectiveFrom").value, reason: byId("copyReason").value
        }
        : {
          staffId: selectedStaff().staffId, fromWeekday: byId("sourceDay").value,
          toWeekdays: [byId("targetDay").value], effectiveFrom: byId("copyEffectiveFrom").value,
          reason: byId("copyReason").value
        };
      runMutation(event.submitter, action, payload, "تم نسخ الجدول.");
    });

    byId("scopeForm").addEventListener("submit", async event => {
      event.preventDefault();
      if (state.busy) return;
      state.busy = true;
      byId("saveScopeBtn").disabled = true;
      try {
        await api("saveScheduleUserScope", {
          requestId: requestId("saveScheduleUserScope"),
          scopeId: byId("scopeId").value,
          username: byId("scopeUsername").value,
          role: byId("scopeRole").value,
          staffId: byId("scopeStaff").value,
          branchIds: byId("scopeBranches").value.split(",").map(value => value.trim()).filter(Boolean),
          active: byId("scopeActive").checked,
          reason: byId("scopeReason").value
        });
        state.dirty = false;
        byId("scopeDialog").close();
        await loadPageData();
        toast("تم حفظ ربط المستخدم.");
      } catch (error) {
        const details = error.details ? ` · ${JSON.stringify(error.details)}` : "";
        const message = `${error.code}: ${error.message}${details}`;
        setStatus(message, "error");
        toast(message, true);
      } finally {
        state.busy = false;
        byId("saveScopeBtn").disabled = false;
      }
    });

    byId("weeklyBody").addEventListener("click", async event => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const record = state.schedules.find(item => item.scheduleId === button.dataset.id);
      if (button.dataset.action === "edit-segment") openSegment(record);
      if (button.dataset.action === "deactivate-segment") {
        const decision = await requestDecision({
          title: record?.recordType === "WEEKLY_DAY_OFF" ? "إلغاء الراحة الأسبوعية" : "تعطيل فترة العمل",
          confirmLabel: "تأكيد التعطيل",
          danger: true,
          consequence: "سيبقى السجل محفوظًا للتدقيق لكنه لن يدخل في حساب الجدول الفعّال بعد التعطيل.",
          details: [
            ["الموظف", selectedStaff()?.staffName || record?.staffName],
            ["اليوم", DAY_LABELS[record?.weekday] || record?.weekday],
            ["الفترة", record?.recordType === "WEEKLY_DAY_OFF" ? "راحة أسبوعية" : shiftLabel(record || {})]
          ]
        });
        if (!decision) return;
        runMutation(button, "deactivateScheduleSegment", {
          scheduleId: record.scheduleId, staffId: record.staffId, reason: decision.reason
        }, "تم تعطيل الفترة.");
      }
      if (button.dataset.action === "weekly-day-off") {
        const staff = selectedStaff();
        const decision = await requestDecision({
          title: "تعيين راحة أسبوعية",
          confirmLabel: "تعيين يوم الراحة",
          consequence: "سيتم تعطيل فترات العمل النشطة في هذا اليوم وتسجيل يوم راحة أسبوعية بدلًا منها.",
          details: [["الموظف", staff.staffName], ["اليوم", DAY_LABELS[button.dataset.id]],
            ["فعّال من", byId("rangeStart").value]]
        });
        if (!decision) return;
        runMutation(button, "setWeeklyDayOff", {
          staffId: staff.staffId, weekday: button.dataset.id,
          effectiveFrom: byId("rangeStart").value,
          effectiveTo: "",
          reason: decision.reason
        }, "تم تعيين يوم الراحة الأسبوعية.");
      }
    });

    byId("overrideBody").addEventListener("click", async event => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const override = state.overrides.find(item => item.overrideId === button.dataset.id);
      if (!override) return;
      const approving = button.dataset.action === "approve-override";
      const rejecting = button.dataset.action === "reject-override";
      const decision = await requestDecision({
        title: approving ? "اعتماد طلب الجدول" : rejecting ? "رفض طلب الجدول" : "إلغاء الاستثناء",
        confirmLabel: approving ? "اعتماد" : rejecting ? "رفض" : "إلغاء الاستثناء",
        danger: !approving,
        evidenceRequired: approving,
        defaultEvidence: approving ? override.sourceEvidence : "",
        consequence: approving
          ? "سيصبح هذا الاستثناء معتمدًا ويؤثر في الجدول المحسوم بعد تحقق الخادم من فصل مقدم الطلب عن المعتمد."
          : rejecting
            ? "سيُحفظ الرفض وسببه في سجل التدقيق ولن يؤثر الطلب في الجدول المحسوم."
            : "سيتم إلغاء تأثير الاستثناء مع الاحتفاظ بالسجل السابق كدليل تدقيق.",
        details: [
          ["الموظف", state.staff.find(item => item.staffId === override.staffId)?.staffName || override.staffId],
          ["التاريخ", override.date], ["النوع", OVERRIDE_LABELS[override.type] || override.type],
          ["النطاق", override.scopeType],
          ["الفترة", override.shiftStart && override.shiftEnd
            ? `${override.shiftStart}–${override.shiftEnd}`
            : override.blockStart && override.blockEnd ? `${override.blockStart}–${override.blockEnd}` : "اليوم بالكامل"],
          ["الحالة الحالية", override.status], ["السبب الأصلي", override.reason]
        ]
      });
      if (!decision) return;
      if (button.dataset.action === "cancel-override") {
        runMutation(button, "cancelScheduleOverride", {
          overrideId: button.dataset.id, reason: decision.reason
        }, "تم إلغاء الاستثناء.");
      } else {
        const nextStatus = approving ? "APPROVED" : "REJECTED";
        runMutation(button, "reviewScheduleOverride", {
          overrideId: button.dataset.id, decision: nextStatus,
          reason: decision.reason, sourceEvidence: decision.evidence
        }, "تم تسجيل القرار.");
      }
    });

    byId("scopeBody").addEventListener("click", event => {
      const button = event.target.closest('button[data-action="edit-scope"]');
      if (!button) return;
      openScope(state.scopes.find(item => item.scopeId === button.dataset.id));
    });

    window.addEventListener("beforeunload", event => {
      if (!state.dirty) return;
      event.preventDefault();
      event.returnValue = "";
    });
  }

  async function init() {
    const authorizedUser = RomeoAuth.requireAuth("schedule.view");
    if (!authorizedUser) return;
    const today = dateKey(new Date());
    byId("rangeStart").value = today;
    byId("rangeEnd").value = plusDays(today, 13);
    populateStaticOptions();
    bindEvents();
    try {
      await loadPageData();
      if (state.staff.length === 1) {
        byId("staffFilter").value = state.staff[0].staffId;
        await loadSelected();
      } else {
        renderWeekly(); renderRange(); renderOverrides(); renderAudit([]);
      }
    } catch (error) {
      setStatus(`${error.code}: ${error.message}`, "error");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
