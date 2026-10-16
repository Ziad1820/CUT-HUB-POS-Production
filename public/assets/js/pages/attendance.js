(() => {
  "use strict";

  const user = RomeoAuth.requireAuth("attendance.view");
  if (!user) return;

  const state = {
    days: [], permissions: {}, serverNow: "", loading: false, requestSequence: 0,
    fresh: false, loadedDate: "", mutationActive: false, actionUncertain: false, selected: null, selectedAction: "", dirtyDialog: false, resyncTimer: null
  };
  const byId = id => document.getElementById(id);
  const cards = byId("attendanceCards");
  const message = byId("pageMessage");
  const actionDialog = byId("actionDialog");
  const detailsDialog = byId("detailsDialog");

  let attendanceRead = null, pendingRead = null, detailsSequence = 0;
  function timing(operation, startedAt, outcome) {
    if (new URLSearchParams(window.location.search).get("performance") === "1")
      console.info("[ATTENDANCE_PERF] " + JSON.stringify({ operation, totalMs: Date.now() - startedAt, outcome }));
  }
  function updateControls() {
    const blocked = state.loading || state.mutationActive || !state.fresh || state.loadedDate !== byId("attendanceDate").value;
    cards.querySelectorAll("button[data-action]").forEach(button => { button.disabled = blocked; });
    byId("confirmActionBtn").disabled = blocked || state.actionUncertain;
    byId("refreshBtn").disabled = state.mutationActive;
    ["attendanceDate", "branchFilter", "staffFilter", "unresolvedFilter", "openBreakFilter"].forEach(id => { byId(id).disabled = state.mutationActive; });
    cards.setAttribute("aria-busy", String(state.loading));
  }

  function create(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = String(value);
    return node;
  }
  function requestId(prefix) {
    if (crypto && typeof crypto.randomUUID === "function") return `${prefix}-${crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  function showMessage(value) {
    message.textContent = value || "";
    message.hidden = !value;
  }
  function errorMessage(error) {
    const code = error && error.code || "ATTENDANCE_NETWORK_ERROR";
    const messages = {
      ATTENDANCE_PERMISSION_DENIED: "ليس لديك صلاحية لهذا الإجراء.",
      ATTENDANCE_DAY_LOCKED: "اليوم مقفل. يجب إعادة فتحه أولاً.",
      ATTENDANCE_OPEN_BREAK: "يوجد بريك مفتوح. أنهِ البريك قبل الانصراف.",
      ATTENDANCE_DAY_BLOCKED: "خطة اليوم تمنع تسجيل الحضور.",
      ATTENDANCE_SELF_ONLY: "يمكنك تنفيذ الإجراء لنفسك فقط.",
      ATTENDANCE_IDEMPOTENCY_KEY_REUSED: "تم استخدام رقم الطلب ببيانات مختلفة.",
      ATTENDANCE_OVERTIME_STALE: "تغير الحضور بعد طلب الوقت الإضافي. أرسل طلباً جديداً.",
      ATTENDANCE_NETWORK_ERROR: navigator.onLine === false
        ? "لا يوجد اتصال. لم يتم إرسال أي تغيير."
        : "تعذر الاتصال بالخادم. حاول مرة أخرى."
    };
    return messages[code] || `${error.message || "تعذر تنفيذ الطلب"} (${code})`;
  }
  async function api(payload) {
    try {
      const result = await RomeoApi.request(payload);
      if (!result || result.status !== "success") {
        const error = new Error(result && result.message || "Attendance request failed.");
        error.code = result && result.code || "ATTENDANCE_REQUEST_FAILED";
        throw error;
      }
      return result;
    } catch (cause) {
      if (cause && cause.code) throw cause;
      const error = new Error(cause && cause.message || "Network error");
      error.code = "ATTENDANCE_NETWORK_ERROR";
      throw error;
    }
  }
  function todayKey() {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit"
    });
    return formatter.format(new Date());
  }
  function minutes(value) {
    const numeric = Number(value || 0);
    return `${Number.isFinite(numeric) ? Math.round(numeric) : 0} د`;
  }
  function clock(value) {
    if (!value) return "—";
    const instant = new Date(value);
    if (Number.isNaN(instant.getTime())) return String(value);
    return new Intl.DateTimeFormat("ar-EG", {
      timeZone: "Africa/Cairo", hour: "2-digit", minute: "2-digit"
    }).format(instant);
  }
  function clockWithDate(value, attendanceDate) {
    if (!value) return "—";
    const rendered = clock(value);
    const date = String(value).slice(0, 10);
    return date && attendanceDate && date !== attendanceDate
      ? `${rendered} (${date})` : rendered;
  }
  function elapsedMinutes(value) {
    if (!value || !state.serverNow) return 0;
    const start = Date.parse(value);
    const server = Date.parse(state.serverNow);
    if (!Number.isFinite(start) || !Number.isFinite(server)) return 0;
    return Math.max(0, Math.floor((server - start) / 60000));
  }
  function statusLabel(value) {
    return ({
      NOT_STARTED: "لم يبدأ", CHECKED_IN: "داخل العمل", ON_BREAK: "في بريك",
      CHECKED_OUT: "انصرف", PRESENT: "حاضر", PARTIALLY_PRESENT: "حضور جزئي",
      ABSENT: "غياب فعلي", APPROVED_LEAVE: "إجازة معتمدة",
      UNPAID_LEAVE: "إجازة غير مدفوعة", SICK_LEAVE: "إجازة مرضية",
      WEEKLY_DAY_OFF: "راحة أسبوعية", BRANCH_CLOSED: "الفرع مغلق",
      UNSCHEDULED_ATTENDANCE: "حضور بدون جدول", UNRESOLVED: "غير محلول",
      REOPENED: "أعيد فتحه"
    })[value] || value || "غير معروف";
  }
  function actionButton(label, action, day, className = "soft", entityId = "") {
    const button = create("button", className, label);
    button.type = "button";
    button.dataset.action = action;
    button.dataset.staffId = day.staffId;
    button.dataset.dayId = day.attendanceDayId;
    if (entityId) button.dataset.entityId = entityId;
    return button;
  }
  function metric(label, value) {
    const wrapper = create("div", "metric");
    wrapper.append(create("span", "", label), create("strong", "", value));
    return wrapper;
  }
  function renderCard(day) {
    const article = create("article", "attendance-card");
    article.dataset.dayId = day.attendanceDayId;
    const head = create("div", "card-head");
    const identity = create("div");
    identity.append(create("h2", "", day.staffName), create("p", "", day.branchId || "بدون فرع"));
    const pill = create("span", `state-pill ${day.openBreak || (day.calculationWarnings || []).length ? "warning" :
      ["CHECKED_IN", "ON_BREAK"].includes(day.state) ? "working" : ""}`, statusLabel(day.status || day.state));
    head.append(identity, pill);
    const schedule = create("div", "schedule-line",
      day.scheduledStart ? `الخطة: ${day.scheduledStart} — ${day.scheduledEnd} · ${minutes(day.requiredWorkMinutesRaw)} مطلوبة`
        : `الخطة: ${statusLabel(day.leaveOrAbsenceType || day.status)}`);
    const metrics = create("div", "metrics");
    metrics.append(
      metric("الحضور", clock(day.actualCheckIn)),
      metric("الانصراف", clockWithDate(day.actualCheckOut, day.attendanceDate)),
      metric("عدد الجلسات", String(day.sessionCount || 0)),
      metric("الجلسة الحالية", day.openSession
        ? minutes(elapsedMinutes(day.sessions && day.sessions.at(-1)?.checkInAt)) : "—"),
      metric("البريك الحالي", day.openBreak
        ? minutes(elapsedMinutes(day.breaks && day.breaks.at(-1)?.startedAt)) : "—"),
      metric("العمل", minutes(day.workedMinutesRaw)),
      metric("العجز التقديري", minutes(day.deficitMinutesRaw)),
      metric("تأخير الحضور", minutes(day.lateMinutesRaw)),
      metric("انصراف مبكر", minutes(day.earlyLeaveMinutesRaw)),
      metric("تجاوز البريك", minutes(day.excessBreakMinutesRaw)),
      metric("إضافي خام", minutes(day.rawOvertimeMinutes)),
      metric("إضافي مؤهل", minutes(day.eligibleOvertimeMinutes)),
      metric("إضافي معتمد", minutes(day.approvedOvertimeMinutes))
    );
    article.append(head, schedule, metrics);
    const warnings = [...(day.calculationWarnings || [])];
    if (day.staleCalculation) warnings.push("STALE_CALCULATION");
    if (warnings.length) {
      article.append(create("div", "warnings", `تنبيه: ${warnings.join(" · ")}`));
    }
    const actions = create("div", "card-actions");
    const self = day.staffId && day.staffId === (state.permissions.selfStaffId || "");
    if (state.permissions.selfAction || state.permissions.manage) {
      if (["NOT_STARTED", "CHECKED_OUT"].includes(day.state) && !day.locked) {
        actions.append(actionButton("تسجيل حضور", "attendanceCheckIn", day, "primary"));
      }
      if (day.state === "CHECKED_IN" && !day.locked) {
        actions.append(actionButton("بدء بريك", "attendanceStartBreak", day));
        actions.append(actionButton("انصراف", "attendanceCheckOut", day, "primary"));
      }
      if (day.state === "ON_BREAK" && !day.locked) {
        actions.append(actionButton("إنهاء البريك", "attendanceEndBreak", day, "primary"));
        if (state.permissions.correct) {
          actions.append(actionButton("انصراف مع إغلاق البريك", "attendanceCheckOut", day, "danger"));
        }
      }
    }
    if (state.permissions.manage && day.state === "NOT_STARTED" && !day.locked) {
      actions.append(actionButton("تسجيل غياب", "markAttendanceAbsent", day, "danger"));
    }
    if ((state.permissions.correct || self) && !day.locked) {
      actions.append(actionButton("طلب تصحيح", "requestAttendanceCorrection", day));
    }
    if ((state.permissions.selfAction || state.permissions.manage) &&
        day.eligibleOvertimeMinutes > 0 && !day.locked &&
        !(RomeoAuth.isOwnerUser(user) && state.permissions.approveOvertime)) {
      actions.append(actionButton("مراجعة الإضافي", "requestAttendanceOvertime", day));
    }
    if (state.permissions.approveOvertime) {
      if (RomeoAuth.isOwnerUser(user) && !day.locked && !day.openSession && !day.openBreak &&
          day.eligibleOvertimeMinutes > 0 && !(day.pendingOvertime || []).length &&
          !["APPROVED", "REJECTED"].includes(day.overtimeApprovalStatus)) {
        actions.append(actionButton("إضافة الوقت الإضافي", "reviewOvertime", day, "primary"));
      }
      (day.pendingOvertime || []).forEach(entry => {
        actions.append(actionButton("اعتماد الإضافي", "approveAttendanceOvertime", day,
          "primary", entry.overtimeApprovalId));
        actions.append(actionButton("رفض الإضافي", "rejectAttendanceOvertime", day,
          "danger", entry.overtimeApprovalId));
      });
    }
    if (state.permissions.approveAdjustment) {
      (day.pendingAdjustments || []).forEach(entry => {
        actions.append(actionButton("اعتماد التصحيح", "approveAttendanceCorrection", day,
          "primary", entry.adjustmentId));
        actions.append(actionButton("رفض التصحيح", "rejectAttendanceCorrection", day,
          "danger", entry.adjustmentId));
      });
    }
    if (state.permissions.manage && !day.locked && !day.openSession && !day.openBreak) {
      actions.append(actionButton("إقفال اليوم", "closeAttendanceDay", day));
    }
    if (state.permissions.correct && day.locked) {
      actions.append(actionButton("إعادة فتح", "reopenAttendanceDay", day, "danger"));
    }
    actions.append(actionButton("التفاصيل", "details", day));
    article.append(actions);
    return article;
  }
  function filteredDays() {
    return state.days.filter(day =>
      (!byId("branchFilter").value || day.branchId === byId("branchFilter").value) &&
      (!byId("staffFilter").value || day.staffId === byId("staffFilter").value) &&
      (!byId("unresolvedFilter").checked ||
        day.openSession || day.openBreak || (day.calculationWarnings || []).length || day.status === "UNRESOLVED") &&
      (!byId("openBreakFilter").checked || day.openBreak));
  }
  function render() {
    cards.replaceChildren();
    const visible = filteredDays();
    if (!visible.length) cards.append(create("div", "empty", "لا توجد حالات مطابقة."));
    else visible.forEach(day => cards.append(renderCard(day)));
    byId("totalCount").textContent = String(visible.length);
    byId("workingCount").textContent = String(visible.filter(day =>
      ["CHECKED_IN", "ON_BREAK"].includes(day.state)).length);
    byId("breakCount").textContent = String(state.days.filter(day => day.openBreak).length);
    byId("warningCount").textContent = String(state.days.filter(day =>
      day.openSession || day.openBreak || (day.calculationWarnings || []).length).length);
    updateControls();
  }
  function populateFilters(days) {
    const staffSelect = byId("staffFilter"), branchSelect = byId("branchFilter");
    const staffId = staffSelect.value, branchId = branchSelect.value;
    const staff = new Map(), branches = new Set();
    days.forEach(day => { staff.set(day.staffId, day.staffName); if (day.branchId) branches.add(day.branchId); });
    staffSelect.replaceChildren(new Option("كل الموظفين", ""));
    staff.forEach((name, id) => staffSelect.append(new Option(name, id)));
    branchSelect.replaceChildren(new Option("كل الفروع", ""));
    [...branches].sort().forEach(id => branchSelect.append(new Option(id, id)));
    staffSelect.value = staff.has(staffId) ? staffId : "";
    branchSelect.value = branches.has(branchId) ? branchId : "";
  }
  function applyLocalFilters() {
    const startedAt = Date.now(); render(); timing("filter", startedAt, "success");
  }
  function loadDashboard({ fresh = false } = {}) {
    if (state.mutationActive && !fresh) return Promise.resolve(false);
    const date = byId("attendanceDate").value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      ++state.requestSequence; state.fresh = false; updateControls();
      showMessage("اختر تاريخًا صحيحًا؛ البيانات الظاهرة من آخر تحميل ناجح.");
      return Promise.resolve(false);
    }
    if (!fresh && attendanceRead?.date === date && !pendingRead) return attendanceRead.promise;
    if (pendingRead?.date === date) return pendingRead.promise;
    const job = { date, sequence: ++state.requestSequence, startedAt: Date.now() };
    job.promise = new Promise(resolve => { job.resolve = resolve; });
    if (attendanceRead) { if (pendingRead) pendingRead.resolve(false); pendingRead = job; }
    else startDashboardRead(job);
    return job.promise;
  }
  async function startDashboardRead(job) {
    attendanceRead = job; state.loading = true; state.fresh = false; updateControls();
    byId("syncState").textContent = "جارٍ المزامنة…";
    showMessage("");
    const current = () => job.sequence === state.requestSequence && job.date === byId("attendanceDate").value;
    let ok = false, outcome = "superseded";
    try {
      // This is the same server-authorized day; all view filters narrow it locally.
      const result = await api({ action: "getAttendanceDashboard", date: job.date });
      if (!current()) return;
      if (!Array.isArray(result.attendanceDays) || result.date !== job.date || !result.permissions || !result.serverNow) throw Error("INVALID_ATTENDANCE");
      state.days = result.attendanceDays; state.permissions = result.permissions; state.serverNow = result.serverNow;
      state.loadedDate = job.date; state.fresh = true;
      populateFilters(state.days);
      byId("migrationPreviewBtn").hidden = !state.permissions.previewMigration;
      render(); byId("syncState").textContent = "متزامن " + clock(state.serverNow);
      ok = true; outcome = "success";
    } catch (error) {
      if (!current()) return;
      outcome = "error";
      showMessage("تعذر تحديث الحضور؛ البيانات الظاهرة من آخر تحميل ناجح. حدّث البيانات قبل تسجيل إجراء.");
      byId("syncState").textContent = "تعذر التحديث";
    } finally {
      attendanceRead = null; state.loading = false; updateControls();
      if (outcome === "superseded" && !pendingRead) showMessage("التاريخ اتغيّر؛ حدّث البيانات قبل تسجيل إجراء.");
      timing("dashboard", job.startedAt, outcome); job.resolve(ok);
      if (pendingRead) { const next = pendingRead; pendingRead = null; startDashboardRead(next); }
    }
  }
  function configureActionDialog(action, day, entityId) {
    state.actionUncertain = false;
    state.selectedAction = action;
    state.selected = day;
    state.dirtyDialog = false;
    byId("actionName").value = action;
    byId("actionStaffId").value = day.staffId;
    byId("actionDayId").value = day.attendanceDayId;
    byId("actionDayId").dataset.entityId = entityId || "";
    byId("actionReason").value = "";
    byId("approvedMinutesField").hidden = !["approveAttendanceOvertime"].includes(action);
    byId("approvedMinutes").value = day.eligibleOvertimeMinutes || 0;
    byId("plannedBreakField").hidden = action !== "attendanceStartBreak";
    byId("plannedBreakMinutes").value = day.allowedBreakMinutes || "";
    byId("plannedBreakMinutes").required = action === "attendanceStartBreak";
    const correction = action === "requestAttendanceCorrection";
    byId("correctionTypeField").hidden = !correction;
    byId("correctionEventField").hidden = !correction;
    byId("correctionTimeField").hidden = !correction;
    if (correction) {
      const replacing = Boolean(entityId);
      byId("correctionType").value = replacing ? "REPLACE_TIMESTAMP" : "INSERT_EVENT";
      byId("correctionType").disabled = replacing;
      byId("correctionEventField").hidden = replacing;
    } else {
      byId("correctionType").disabled = false;
    }
    const labels = {
      attendanceCheckIn: "تسجيل الحضور", attendanceStartBreak: "بدء البريك",
      attendanceEndBreak: "إنهاء البريك", attendanceCheckOut: "تسجيل الانصراف",
      markAttendanceAbsent: "تأكيد الغياب الفعلي", requestAttendanceCorrection: "طلب تصحيح",
      requestAttendanceOvertime: "طلب اعتماد الوقت الإضافي",
      approveAttendanceOvertime: "اعتماد دقائق الوقت الإضافي",
      rejectAttendanceOvertime: "رفض طلب الوقت الإضافي",
      approveAttendanceCorrection: "اعتماد تصحيح الحضور",
      rejectAttendanceCorrection: "رفض تصحيح الحضور",
      closeAttendanceDay: "إقفال يوم الحضور", reopenAttendanceDay: "إعادة فتح يوم الحضور",
      cancelAttendanceEvent: "إلغاء حدث عرضي بسجل تعويضي"
    };
    byId("actionDialogTitle").textContent = labels[action] || "تأكيد الإجراء";
    if (["attendanceCheckIn", "attendanceCheckOut", "attendanceStartBreak", "attendanceEndBreak"].includes(action)) {
      byId("actionReason").value = labels[action];
    }
    actionDialog.showModal();
    updateControls();
    byId("actionReason").focus();
  }
  async function showDetails(day) {
    const sequence = ++detailsSequence, startedAt = Date.now();
    let outcome = "error";
    byId("detailsContent").replaceChildren(create("p", "", "جارٍ تحميل سجل الأحداث والتدقيق…"));
    detailsDialog.showModal();
    try {
      const [eventResult, auditResult] = await Promise.all([
        api({
          action: "listAttendanceEvents",
          attendanceDayId: day.attendanceDayId,
          staffId: day.staffId,
          attendanceDate: day.attendanceDate
        }),
        api({ action: "getAttendanceAuditHistory", entityId: day.attendanceDayId, staffId: day.staffId })
      ]);
      if (sequence !== detailsSequence || !detailsDialog.open) return;
      outcome = "success";
      const content = byId("detailsContent");
      content.replaceChildren();
      content.append(create("h3", "", "الأحداث الأصلية والتعويضية"));
      (eventResult.events || []).forEach(event => {
        const row = create("div", "event-row",
          `${event.eventType} · ${clock(event.eventAt)} · ${event.actorName || event.actorId} · ${event.reason || "—"}`);
        if ((state.permissions.correct || state.permissions.selfAction) &&
            ["CHECK_IN", "BREAK_START", "BREAK_END", "CHECK_OUT"].includes(event.eventType)) {
          const correction = create("button", "secondary", "تصحيح الوقت");
          correction.type = "button";
          correction.addEventListener("click", () => {
            detailsDialog.close();
            configureActionDialog("requestAttendanceCorrection", day, event.eventId);
          });
          row.append(" ", correction);
        }
        if (state.permissions.correct &&
            ["CHECK_IN", "BREAK_START", "BREAK_END", "CHECK_OUT", "MANAGER_MARK_ABSENT"].includes(event.eventType)) {
          const cancel = create("button", "danger", "إلغاء الحدث");
          cancel.type = "button";
          cancel.addEventListener("click", () => {
            detailsDialog.close();
            configureActionDialog("cancelAttendanceEvent", day, event.eventId);
          });
          row.append(" ", cancel);
        }
        content.append(row);
      });
      content.append(create("h3", "", "التدقيق"));
      (auditResult.audit || []).forEach(entry => {
        content.append(create("div", "event-row",
          `${entry.action} · ${clock(entry.timestamp)} · ${entry.actorName || entry.actorId} · ${entry.reason || "—"}`));
      });
    } catch (error) {
      if (sequence === detailsSequence && detailsDialog.open) byId("detailsContent").replaceChildren(create("p", "warnings", errorMessage(error)));
    } finally { timing("details", startedAt, outcome); }
  }
  async function submitAction(event) {
    event.preventDefault();
    if (!state.selected || state.mutationActive || state.loading || !state.fresh || state.actionUncertain) return;
    const button = byId("confirmActionBtn");
    button.disabled = true;
    const action = state.selectedAction;
    const payload = {
      action, requestId: requestId("ATT"), reason: byId("actionReason").value.trim(),
      staffId: state.selected.staffId, attendanceDate: state.selected.attendanceDate,
      attendanceDayId: state.selected.attendanceDayId
    };
    if (action === "attendanceCheckOut" && state.selected.openBreak) payload.closeOpenBreak = true;
    if (action === "attendanceStartBreak") payload.plannedBreakMinutes = Number(byId("plannedBreakMinutes").value);
    if (action === "requestAttendanceCorrection") {
      const local = byId("correctionEventAt").value;
      if (!local) {
        showMessage("أدخل وقت الحدث المصحح.");
        button.disabled = false;
        return;
      }
      payload.correctionType = byId("correctionType").value;
      payload.proposedState = { eventAt: `${local}:00+03:00` };
      if (payload.correctionType === "REPLACE_TIMESTAMP") {
        payload.proposedState.replacesEventId = byId("actionDayId").dataset.entityId;
        if (!payload.proposedState.replacesEventId) {
          showMessage("اختر حدثاً من سجل اليوم لتصحيح توقيته.");
          button.disabled = false;
          return;
        }
      } else {
        payload.proposedState.insertEventType = byId("correctionEventType").value;
      }
    }
    if (action === "approveAttendanceOvertime") {
      payload.approvedMinutes = Number(byId("approvedMinutes").value);
    }
    if (["approveAttendanceOvertime", "rejectAttendanceOvertime"].includes(action)) {
      payload.overtimeApprovalId = byId("actionDayId").dataset.entityId;
    }
    if (["approveAttendanceCorrection", "rejectAttendanceCorrection"].includes(action)) {
      payload.adjustmentId = byId("actionDayId").dataset.entityId;
    }
    if (action === "cancelAttendanceEvent") {
      payload.eventId = byId("actionDayId").dataset.entityId;
    }
    state.mutationActive = true; state.fresh = false; updateControls();
    let failure = null;
    try {
      await api(payload);
      state.dirtyDialog = false; actionDialog.close();
    } catch (error) { failure = error; state.actionUncertain = true; }
    finally {
      await loadDashboard({ fresh: true });
      state.mutationActive = false; updateControls();
      if (failure) showMessage(errorMessage(failure) + " · راجع حالة اليوم قبل إرسال إجراء جديد؛ الطلب لم تتم إعادته تلقائيًا.");
    }
  }
  async function reviewOvertime(day) {
    if (state.mutationActive || state.loading || !state.fresh) return;
    state.mutationActive = true; state.fresh = false; updateControls();
    let result, failure;
    try { result = await api({ action: "requestAttendanceOvertime", attendanceDayId: day.attendanceDayId,
      requestId: requestId("OVT"), reason: "مراجعة المالك للوقت الإضافي" }); }
    catch (error) { failure = error; }
    finally {
      await loadDashboard({ fresh: true }); state.mutationActive = false; updateControls();
    }
    const refreshed = state.days.find(item => item.attendanceDayId === day.attendanceDayId);
    if (failure) showMessage(errorMessage(failure));
    else if (state.fresh && refreshed && result?.overtimeApproval?.overtimeApprovalId)
      configureActionDialog("approveAttendanceOvertime", refreshed, result.overtimeApproval.overtimeApprovalId);
  }
  function closeDialog(dialog) {
    if (dialog === actionDialog && state.dirtyDialog &&
        !window.confirm("يوجد سبب أو بيانات لم تُرسل. هل تريد الإغلاق؟")) return;
    if (state.mutationActive && dialog === actionDialog) return;
    if (dialog === detailsDialog) ++detailsSequence;
    state.dirtyDialog = false;
    dialog.close();
  }
  function trapFocus(dialog, event) {
    if (event.key !== "Tab") return;
    const focusable = [...dialog.querySelectorAll("button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])")]
      .filter(node => !node.closest("[hidden]"));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  cards.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button || state.loading || state.mutationActive || !state.fresh) return;
    const day = state.days.find(item => item.attendanceDayId === button.dataset.dayId);
    if (!day) return;
    if (button.dataset.action === "details") showDetails(day);
    else if (button.dataset.action === "reviewOvertime") {
      reviewOvertime(day);
    } else configureActionDialog(button.dataset.action, day, button.dataset.entityId);
  });
  byId("actionForm").addEventListener("submit", submitAction);
  byId("actionForm").addEventListener("input", () => { state.dirtyDialog = true; });
  document.querySelectorAll("[data-close-dialog]").forEach(button => button.addEventListener("click", () => {
    closeDialog(button.closest("dialog"));
  }));
  [actionDialog, detailsDialog].forEach(dialog => {
    dialog.addEventListener("keydown", event => trapFocus(dialog, event));
    dialog.addEventListener("cancel", event => {
      event.preventDefault();
      closeDialog(dialog);
    });
  });
  byId("refreshBtn").addEventListener("click", loadDashboard);
  byId("attendanceDate").addEventListener("change", loadDashboard);
  byId("branchFilter").addEventListener("change", () => {
    byId("staffFilter").value = "";
    applyLocalFilters();
  });
  byId("staffFilter").addEventListener("change", applyLocalFilters);
  byId("unresolvedFilter").addEventListener("change", applyLocalFilters);
  byId("openBreakFilter").addEventListener("change", applyLocalFilters);
  byId("migrationPreviewBtn").addEventListener("click", async () => {
    const button = byId("migrationPreviewBtn");
    button.disabled = true;
    try {
      const result = await api({ action: "previewAttendanceMigration" });
      byId("detailsContent").replaceChildren(
        create("pre", "attendance-json-preview", JSON.stringify(result, null, 2))
      );
      detailsDialog.showModal();
    } catch (error) {
      showMessage(errorMessage(error));
    } finally {
      button.disabled = false;
    }
  });
  window.addEventListener("romeo-connectivity-change", event => {
    byId("syncState").textContent = event.detail.online ? "الاتصال عاد؛ حدّث البيانات" : "غير متصل";
  });

  byId("attendanceDate").value = todayKey();
  loadDashboard();
  state.resyncTimer = window.setInterval(() => {
    if (!document.hidden && !actionDialog.open && !detailsDialog.open && !state.mutationActive && !attendanceRead) loadDashboard();
  }, 60000);
})();
