(() => {
  "use strict";
  const byId = id => document.getElementById(id);
  const user = RomeoAuth.requireAuth("booking_availability.view");
  if (!user) return;
  document.body.classList.remove("auth-pending");
  const owner = RomeoAuth.isOwnerUser(user);
  const can = permission => owner || RomeoAuth.hasPermission(permission);
  let busy = false;
  const WEEKDAY_LABELS = {
    SUNDAY: "الأحد", MONDAY: "الاثنين", TUESDAY: "الثلاثاء", WEDNESDAY: "الأربعاء",
    THURSDAY: "الخميس", FRIDAY: "الجمعة", SATURDAY: "السبت"
  };
  const FLAG_LABELS = {
    plannedEnabled: "الجداول المخططة", attendanceLiveEnabled: "الحضور اللحظي",
    customerLiveRefreshEnabled: "تحديث العميل المباشر",
    internalLiveRefreshEnabled: "التحديث الداخلي المباشر",
    managerOverrideEnabled: "استثناء المدير", conflictResolutionEnabled: "حل التعارضات"
  };
  const state = {
    branchId: "", branches: [], branchHours: [], conflicts: [], overrides: [], audit: [],
    flags: {}, cacheStatus: {}, quotaEstimate: null
  };
  const requestId = prefix => `${prefix}-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;

  function status(message, type) {
    const node = byId("status");
    node.textContent = message || "";
    node.className = `status ${type || ""}`.trim();
    if (type === "error" || type === "denied" || type === "stale" || type === "conflict") node.focus();
  }
  async function api(action, payload) {
    const response = await RomeoApi.request({ action, ...(payload || {}) });
    if (!response || response.status !== "success") {
      const error = new Error(response?.message || "تعذر تنفيذ الطلب.");
      error.code = response?.code || "REQUEST_FAILED";
      throw error;
    }
    return response;
  }
  function empty(container, message) {
    container.replaceChildren();
    const node = document.createElement("p");
    node.textContent = message;
    container.append(node);
  }
  function button(label, handler) {
    const node = document.createElement("button");
    node.type = "button"; node.textContent = label; node.addEventListener("click", handler);
    return node;
  }
  function boolLabel(value) {
    if (value === true) return "مفعّل";
    if (value === false) return "معطّل";
    return "غير متاح";
  }
  function renderEngineStatus() {
    const flags = state.flags || {};
    const engine = flags.engine || "غير معروف";
    const badge = byId("engineBadge");
    badge.textContent = engine;
    badge.dataset.engine = engine;
    const summary = byId("engineSummary");
    summary.replaceChildren();
    [
      ["المحرك النشط", engine],
      ["حل التعارضات", boolLabel(flags.conflictResolutionEnabled)],
      ["خدمة الكاش", state.cacheStatus?.available === true ? "متاحة" :
        state.cacheStatus?.available === false ? "غير متاحة" : "غير متاح من الاستجابة"],
      ["إبطال الكاش بالإصدارات", boolLabel(state.cacheStatus?.tokenVersioningEnabled)],
      ["قراءات Sheets المتوقعة/طلب", String(state.quotaEstimate?.authoritativeSheetReadsPerRequest ?? "غير متاح")]
    ].forEach(([label, value]) => {
      const wrapper = document.createElement("div");
      const term = document.createElement("dt"); term.textContent = label;
      const detail = document.createElement("dd"); detail.textContent = value;
      wrapper.append(term, detail); summary.append(wrapper);
    });
    const flagsNode = byId("featureFlags");
    flagsNode.replaceChildren();
    Object.entries(FLAG_LABELS).forEach(([key, label]) => {
      const item = document.createElement("span");
      item.className = `flag ${flags[key] === true ? "enabled" : "disabled"}`;
      item.textContent = `${label}: ${boolLabel(flags[key])}`;
      flagsNode.append(item);
    });
  }
  function currentBranch() {
    return state.branches.find(item => item.branchId === state.branchId) || null;
  }
  function populateBranchForm() {
    const form = byId("branchForm");
    const branch = currentBranch();
    form.branchId.value = branch?.branchId || "";
    form.branchId.readOnly = !!branch;
    form.branchName.value = branch?.branchName || "";
    form.timeZone.value = branch?.timeZone || "Africa/Cairo";
    form.closureStatus.value = branch?.closureStatus || "OPEN";
    form.closureReason.value = branch?.closureReason || "";
    form.active.checked = branch ? branch.active !== false : true;
    form.publicSelectable.checked = branch ? branch.publicSelectable === true : true;
  }
  function selectedHours() {
    return state.branchHours.filter(item => item.branchId === state.branchId);
  }
  function populateHoursForm(weekday) {
    const form = byId("hoursForm");
    const day = weekday || form.weekday.value || "SUNDAY";
    const record = selectedHours().find(item => item.weekday === day);
    form.weekday.value = day;
    form.openTime.value = record?.openTime || "";
    form.closeTime.value = record?.closeTime || "";
    form.effectiveFrom.value = record?.effectiveFrom || "";
    form.effectiveTo.value = record?.effectiveTo || "";
    form.active.checked = record ? record.active === true : true;
    validateHoursRange();
  }
  function validateHoursRange() {
    const form = byId("hoursForm");
    const invalid = form.effectiveFrom.value && form.effectiveTo.value &&
      form.effectiveFrom.value > form.effectiveTo.value;
    form.effectiveTo.setCustomValidity(invalid ? "تاريخ نهاية الساعات يجب ألا يسبق تاريخ البداية." : "");
    return !invalid;
  }
  function renderHours() {
    const body = byId("hoursRows");
    body.replaceChildren();
    const records = selectedHours().sort((a, b) =>
      Object.keys(WEEKDAY_LABELS).indexOf(a.weekday) - Object.keys(WEEKDAY_LABELS).indexOf(b.weekday));
    records.forEach(item => {
      const row = document.createElement("tr");
      const values = [
        WEEKDAY_LABELS[item.weekday] || item.weekday,
        `${item.openTime || "—"} – ${item.closeTime || "—"}`,
        `${item.effectiveFrom || "بدون بداية"} ← ${item.effectiveTo || "مفتوحة"}`,
        item.active ? "فعّالة" : "معطّلة"
      ];
      values.forEach(value => { const cell = document.createElement("td"); cell.textContent = value; row.append(cell); });
      const actions = document.createElement("td");
      actions.append(button("تعديل", () => {
        populateHoursForm(item.weekday);
        byId("hoursForm").scrollIntoView({ behavior: "smooth", block: "center" });
      }));
      row.append(actions); body.append(row);
    });
    byId("hoursEmpty").hidden = records.length > 0;
  }
  function populateSelectedBranch() {
    populateBranchForm();
    populateHoursForm();
    renderHours();
  }
  function renderRecords() {
    const conflicts = byId("conflicts");
    conflicts.replaceChildren();
    state.conflicts.forEach(item => {
      const card = document.createElement("div"); card.className = "record";
      const text = document.createElement("p");
      text.textContent = `${item.conflictCode} · ${item.date} ${item.slotStart} · ${item.status}`;
      const actions = document.createElement("div"); actions.className = "record-actions";
      if (item.status === "OPEN") actions.append(button("إقرار", () => transition(item, "ACKNOWLEDGED")));
      if (item.status === "ACKNOWLEDGED") {
        actions.append(button("حل", () => transition(item, "RESOLVED")));
        actions.append(button("استبعاد بسبب", () => transition(item, "DISMISSED_WITH_REASON")));
      }
      card.append(text, actions); conflicts.append(card);
    });
    if (!state.conflicts.length) empty(conflicts, "لا توجد تعارضات في هذا الفرع.");

    const overrides = byId("overrides"); overrides.replaceChildren();
    state.overrides.forEach(item => {
      const card = document.createElement("div"); card.className = "record";
      const text = document.createElement("p");
      text.textContent = `${item.staffId} · ${item.date} · ${item.startTime}–${item.endTime} · ${item.status}`;
      card.append(text);
      if (item.status === "ACTIVE") card.append(button("إلغاء الاستثناء", () => revoke(item)));
      overrides.append(card);
    });
    if (!state.overrides.length) empty(overrides, "لا توجد استثناءات تشغيلية.");

    const audit = byId("audit"); audit.replaceChildren();
    state.audit.slice(0, 100).forEach(item => {
      const card = document.createElement("div"); card.className = "record";
      card.textContent = `${item.createdAt} · ${item.action} · ${item.reasonCode}`;
      audit.append(card);
    });
    if (!state.audit.length) empty(audit, "لا توجد سجلات تدقيق متاحة.");
  }
  function mappedError(error) {
    const code = error?.code || "REQUEST_FAILED";
    if (code.includes("PERMISSION") || code.includes("SCOPE")) return ["ليس لديك صلاحية لهذا الإجراء.", "denied"];
    if (code.includes("STALE") || code.includes("SOURCE_CHANGED") || code.includes("RESCHEDULED")) return ["تغيرت البيانات. حدّث الصفحة ثم أعد المراجعة.", "stale"];
    if (code.includes("CONFLICT") || code.includes("FOUR_EYES")) return [error.message, "conflict"];
    return [`${error.message} (${code})`, "error"];
  }
  async function guarded(work) {
    if (busy) return;
    busy = true;
    document.querySelectorAll("button").forEach(node => { node.disabled = true; });
    status("جارٍ التحميل…", "loading");
    try { await work(); status("تم تحديث البيانات.", ""); }
    catch (error) { const mapped = mappedError(error); status(mapped[0], mapped[1]); }
    finally { busy = false; document.querySelectorAll("button").forEach(node => { node.disabled = false; }); }
  }
  async function fetchData() {
      const jobs = [
        api("getBookingAvailabilityFlags"),
        api("listBookingBranches"),
        can("booking_availability.view_restrictions")
          ? api("listBookingAvailabilityConflicts") : Promise.resolve({ conflicts: [] }),
        can("booking_availability.view_operational")
          ? api("listBookingOperationalOverrides") : Promise.resolve({ operationalOverrides: [] }),
        can("booking_availability.view_audit")
          ? api("listBookingAvailabilityAudit") : Promise.resolve({ audit: [] })
      ];
      const values = await Promise.all(jobs);
      const flagResult = values[0];
      const branches = values[1];
      state.flags = flagResult.flags || {};
      state.cacheStatus = flagResult.cacheStatus || {};
      state.quotaEstimate = flagResult.quotaEstimate || null;
      state.branches = (branches.branches || []).map(branch => ({
        ...branch,
        active: branch.active !== false,
        publicSelectable: branch.publicSelectable === true
      }));
      state.branchHours = branches.branchHours || [];
      renderEngineStatus();
      const select = byId("branchSelect"); select.replaceChildren();
      state.branches.forEach(branch => {
        const option = document.createElement("option");
        option.value = branch.branchId;
        option.textContent = `${branch.branchName || branch.branchId}${branch.active ? "" : " (غير نشط)"}`;
        select.append(option);
      });
      if (!state.branches.some(item => item.branchId === state.branchId)) state.branchId = select.value;
      select.value = state.branchId;
      state.conflicts = (values[2].conflicts || []).filter(item => item.branchId === state.branchId);
      state.overrides = (values[3].operationalOverrides || []).filter(item => item.branchId === state.branchId);
      state.audit = (values[4].audit || []).filter(item => item.branchId === state.branchId);
      populateSelectedBranch();
      renderRecords();
  }
  async function load() { await guarded(fetchData); }
  async function transition(item, next) {
    const reason = prompt("اكتب سبب القرار:");
    if (!reason) return;
    await guarded(async () => {
      await api("transitionBookingAvailabilityConflict", {
        conflictId: item.conflictId, status: next, reason,
        clientRequestId: requestId("conflict")
      });
      await fetchData();
    });
  }
  async function revoke(item) {
    const reason = prompt("اكتب سبب الإلغاء:");
    if (!reason) return;
    await guarded(async () => {
      await api("revokeBookingOperationalOverride", {
        operationalOverrideId: item.operationalOverrideId, reason,
        clientRequestId: requestId("revoke")
      });
      await fetchData();
    });
  }
  document.querySelectorAll("[data-permission]").forEach(node => {
    node.hidden = !can(node.dataset.permission);
  });
  document.querySelectorAll(".owner-only").forEach(node => { node.hidden = !owner; });
  byId("branchSelect").addEventListener("change", event => {
    state.branchId = event.target.value;
    populateSelectedBranch();
    load();
  });
  byId("refreshBtn").addEventListener("click", load);
  byId("overrideForm").addEventListener("submit", event => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget));
    guarded(async () => {
      await api("createBookingOperationalOverride", {
        ...values, branchId: state.branchId, clientRequestId: requestId("override")
      }); event.currentTarget.reset(); await fetchData();
    });
  });
  byId("hoursForm").addEventListener("submit", event => {
    event.preventDefault();
    if (!validateHoursRange() || !event.currentTarget.reportValidity()) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    guarded(async () => {
      await api("saveBookingBranchHours", {
        ...values, active: event.currentTarget.active.checked,
        branchId: state.branchId, clientRequestId: requestId("hours")
      }); await fetchData();
    });
  });
  byId("hoursForm").weekday.addEventListener("change", event => populateHoursForm(event.target.value));
  byId("hoursForm").effectiveFrom.addEventListener("change", validateHoursRange);
  byId("hoursForm").effectiveTo.addEventListener("change", validateHoursRange);
  byId("branchForm").addEventListener("submit", event => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget));
    guarded(async () => {
      await api("saveBookingBranchConfiguration", {
        ...values,
        active: event.currentTarget.active.checked,
        publicSelectable: event.currentTarget.publicSelectable.checked,
        clientRequestId: requestId("branch")
      });
      state.branchId = values.branchId;
      await fetchData();
    });
  });
  byId("newBranchBtn").addEventListener("click", () => {
    state.branchId = "";
    byId("branchSelect").value = "";
    populateBranchForm();
    byId("branchForm").branchId.focus();
  });
  byId("migrationPreviewBtn").addEventListener("click", () => guarded(async () => {
    const result = await api("previewBookingAvailabilityMigration");
    byId("preview").textContent = JSON.stringify(result.migration, null, 2);
  }));
  byId("triggerPreviewBtn").addEventListener("click", () => guarded(async () => {
    const result = await api("previewBookingNoCheckInTriggerInstallation");
    byId("preview").textContent = JSON.stringify(result.preview, null, 2);
  }));
  load();
})();
