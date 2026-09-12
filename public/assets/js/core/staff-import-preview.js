(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.RomeoStaffImportPreview = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const STAFF_HEADERS = Object.freeze([
    "NAME", "CODE", "SALARY", "PERCENTAGE", "ID", "BONUS", "DEDUCTION",
    "ACTIVE", "CREATED_AT", "UPDATED_AT", "IS_BARBER", "BRANCH_ID"
  ]);

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function normalizedCode(value) {
    return text(value).toUpperCase();
  }

  function finiteNumber(value) {
    const number = typeof value === "number" ? value : Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function canonicalExistingRow(row) {
    if (Array.isArray(row)) {
      return Object.fromEntries(STAFF_HEADERS.map((header, index) => [header, row[index]]));
    }
    const source = row || {};
    return {
      NAME: source.NAME ?? source.name ?? source.staffName,
      CODE: source.CODE ?? source.code ?? source.staffCode,
      SALARY: source.SALARY ?? source.salary ?? source.salaries,
      PERCENTAGE: source.PERCENTAGE ?? source.percentage ?? source.salaryPercentage,
      ID: source.ID ?? source.id ?? source.staffId,
      BONUS: source.BONUS ?? source.bonus,
      DEDUCTION: source.DEDUCTION ?? source.deduction,
      ACTIVE: source.ACTIVE ?? source.active,
      CREATED_AT: source.CREATED_AT ?? source.createdAt,
      UPDATED_AT: source.UPDATED_AT ?? source.updatedAt,
      IS_BARBER: source.IS_BARBER ?? source.isBarber,
      BRANCH_ID: source.BRANCH_ID ?? source.branchId
    };
  }

  function stable(value) {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === "object") {
      return Object.keys(value).sort().reduce((result, key) => {
        result[key] = stable(value[key]);
        return result;
      }, {});
    }
    return value;
  }

  function hash(value) {
    const input = JSON.stringify(stable(value));
    let result = 2166136261;
    for (let index = 0; index < input.length; index += 1) {
      result ^= input.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return (result >>> 0).toString(16).padStart(8, "0");
  }

  function duplicateGroups(records, selector) {
    const groups = {};
    records.forEach((record, index) => {
      const key = selector(record);
      if (!key) return;
      (groups[key] ||= []).push(index);
    });
    return Object.fromEntries(Object.entries(groups).filter(([, indexes]) => indexes.length > 1));
  }

  function rowsEqual(left, right) {
    return STAFF_HEADERS
      .filter(header => !["CREATED_AT", "UPDATED_AT"].includes(header))
      .every(header => {
      if (["SALARY", "PERCENTAGE", "BONUS", "DEDUCTION"].includes(header)) {
        return finiteNumber(left[header]) === finiteNumber(right[header]);
      }
      if (["ACTIVE", "IS_BARBER"].includes(header)) {
        return Boolean(left[header]) === Boolean(right[header]);
      }
      return text(left[header]) === text(right[header]);
      });
  }

  function previewLegacyStaffImport(options) {
    const input = options && typeof options === "object" ? options : {};
    const sourceRecords = Array.isArray(input.sourceRecords) ? input.sourceRecords : [];
    const existingRows = (Array.isArray(input.existingStaffRows) ? input.existingStaffRows : [])
      .map(canonicalExistingRow);
    const defaults = input.defaults && typeof input.defaults === "object" ? input.defaults : {};
    const branchById = input.branchById && typeof input.branchById === "object" ? input.branchById : {};
    const excludedSourceIds = new Set(
      (Array.isArray(input.excludedSourceIds) ? input.excludedSourceIds : []).map(text).filter(Boolean)
    );
    const validBranchIds = Array.isArray(input.validBranchIds)
      ? new Set(input.validBranchIds.map(text).filter(Boolean))
      : null;
    const importTimestamp = text(input.importTimestamp);
    const errors = [];
    const conflicts = [];

    const requiredDefaultFields = ["percentage", "bonus", "deduction", "active"];
    if (input.defaultsConfirmed !== true) {
      errors.push({ code: "STAFF_IMPORT_DEFAULTS_UNCONFIRMED" });
    }
    requiredDefaultFields.forEach(field => {
      if (!Object.prototype.hasOwnProperty.call(defaults, field)) {
        errors.push({ code: "STAFF_IMPORT_DEFAULT_UNRESOLVED", field });
      }
    });
    ["percentage", "bonus", "deduction"].forEach(field => {
      if (Object.prototype.hasOwnProperty.call(defaults, field) && finiteNumber(defaults[field]) === null) {
        errors.push({ code: "STAFF_IMPORT_DEFAULT_INVALID", field });
      }
    });
    if (Object.prototype.hasOwnProperty.call(defaults, "active") && typeof defaults.active !== "boolean") {
      errors.push({ code: "STAFF_IMPORT_DEFAULT_INVALID", field: "active" });
    }
    if (!importTimestamp || Number.isNaN(Date.parse(importTimestamp))) {
      errors.push({ code: "STAFF_IMPORT_TIMESTAMP_REQUIRED" });
    }

    const normalizedSources = sourceRecords.map((source, index) => ({
      index,
      source,
      id: text(source && (source.id ?? source.staffId)),
      name: text(source && (source.name ?? source.staffName)),
      code: normalizedCode(source && (source.code ?? source.staffCode)),
      salary: finiteNumber(source && (source.salary ?? source.salaries)),
      isBarber: source && typeof source.isBarber === "boolean" ? source.isBarber : null
    }));

    const includedSources = normalizedSources.filter(record => !excludedSourceIds.has(record.id));
    const foundSourceIds = new Set(normalizedSources.map(record => record.id).filter(Boolean));
    excludedSourceIds.forEach(id => {
      if (!foundSourceIds.has(id)) errors.push({ code: "STAFF_IMPORT_EXCLUSION_NOT_FOUND", id });
    });
    const duplicateIds = duplicateGroups(includedSources, record => record.id);
    const duplicateCodes = duplicateGroups(includedSources, record => record.code);
    Object.entries(duplicateIds).forEach(([id, sourceIndexes]) => {
      conflicts.push({ code: "STAFF_IMPORT_DUPLICATE_ID", id, sourceIndexes });
    });
    Object.entries(duplicateCodes).forEach(([code, sourceIndexes]) => {
      conflicts.push({ code: "STAFF_IMPORT_DUPLICATE_CODE", staffCode: code, sourceIndexes });
    });

    const existingById = new Map();
    const existingByCode = new Map();
    existingRows.forEach((row, index) => {
      const id = text(row.ID);
      const code = normalizedCode(row.CODE);
      if (id) {
        if (existingById.has(id)) conflicts.push({ code: "STAFF_EXISTING_DUPLICATE_ID", id });
        else existingById.set(id, { row, index });
      }
      if (code) {
        if (existingByCode.has(code)) conflicts.push({ code: "STAFF_EXISTING_DUPLICATE_CODE", staffCode: code });
        else existingByCode.set(code, { row, index });
      }
    });

    const records = normalizedSources.map(record => {
      const excluded = excludedSourceIds.has(record.id);
      const validationErrors = [];
      if (excluded) {
        return {
          sourceIndex: record.index,
          sourceRecord: record.source,
          sourceId: record.id,
          mappedStaffRow: null,
          status: "EXCLUDED_OPERATOR_DECISION",
          validationErrors: []
        };
      }
      if (!record.id) validationErrors.push({ code: "STAFF_IMPORT_ID_REQUIRED" });
      if (!record.name) validationErrors.push({ code: "STAFF_IMPORT_NAME_REQUIRED" });
      if (!record.code) validationErrors.push({ code: "STAFF_IMPORT_CODE_REQUIRED" });
      if (record.salary === null || record.salary < 0) validationErrors.push({ code: "STAFF_IMPORT_SALARY_INVALID" });
      if (record.isBarber === null) validationErrors.push({ code: "STAFF_IMPORT_BARBER_STATUS_REQUIRED" });

      const branchId = text(branchById[record.id]);
      if (!branchId) validationErrors.push({ code: "STAFF_IMPORT_BRANCH_REQUIRED" });
      if (branchId && validBranchIds && !validBranchIds.has(branchId)) {
        validationErrors.push({ code: "STAFF_IMPORT_BRANCH_INVALID", branchId });
      }

      const mappedRow = {
        NAME: record.name,
        CODE: record.code,
        SALARY: record.salary,
        PERCENTAGE: finiteNumber(defaults.percentage),
        ID: record.id,
        BONUS: finiteNumber(defaults.bonus),
        DEDUCTION: finiteNumber(defaults.deduction),
        ACTIVE: defaults.active,
        CREATED_AT: importTimestamp,
        UPDATED_AT: importTimestamp,
        IS_BARBER: record.isBarber,
        BRANCH_ID: branchId
      };

      let status = "PROPOSED_CREATE";
      const sameId = existingById.get(record.id);
      const sameCode = existingByCode.get(record.code);
      if (sameId) {
        if (rowsEqual(sameId.row, mappedRow)) status = "ALREADY_PRESENT";
        else validationErrors.push({ code: "STAFF_IMPORT_EXISTING_ID_CONFLICT", existingRow: sameId.index });
      }
      if (sameCode && text(sameCode.row.ID) !== record.id) {
        validationErrors.push({ code: "STAFF_IMPORT_EXISTING_CODE_CONFLICT", existingRow: sameCode.index });
      }

      return {
        sourceIndex: record.index,
        sourceRecord: record.source,
        mappedStaffRow: mappedRow,
        status,
        validationErrors
      };
    });

    records.forEach(record => {
      record.validationErrors.forEach(error => errors.push({ ...error, sourceIndex: record.sourceIndex }));
    });
    conflicts.forEach(conflict => errors.push(conflict));

    const proposedRows = records
      .filter(record => record.status === "PROPOSED_CREATE" && record.validationErrors.length === 0)
      .map(record => record.mappedStaffRow);
    const result = {
      schemaVersion: "STAFF_LOCAL_STORAGE_IMPORT_V1",
      dryRun: true,
      writes: 0,
      safe: errors.length === 0,
      sourceCount: sourceRecords.length,
      excludedCount: records.filter(record => record.status === "EXCLUDED_OPERATOR_DECISION").length,
      proposedCount: records.filter(record => record.status !== "EXCLUDED_OPERATOR_DECISION").length,
      headers: STAFF_HEADERS.slice(),
      sourceKey: "romeo-pos-staff-accounting-v2",
      uniqueness: { id: "REQUIRED_UNIQUE", code: "REQUIRED_UNIQUE_CASE_INSENSITIVE" },
      defaults: {
        percentage: finiteNumber(defaults.percentage),
        bonus: finiteNumber(defaults.bonus),
        deduction: finiteNumber(defaults.deduction),
        active: defaults.active,
        createdAt: importTimestamp,
        updatedAt: importTimestamp
      },
      records,
      excludedRecords: records
        .filter(record => record.status === "EXCLUDED_OPERATOR_DECISION")
        .map(record => ({ sourceIndex: record.sourceIndex, sourceId: record.sourceId,
          sourceRecord: record.sourceRecord })),
      duplicateConflicts: conflicts,
      errors,
      operationCount: proposedRows.length,
      proposedRows,
      alreadyPresentCount: records.filter(record => record.status === "ALREADY_PRESENT").length
    };
    result.planHash = hash({
      schemaVersion: result.schemaVersion,
      headers: result.headers,
      records: result.records.map(record => ({
        sourceIndex: record.sourceIndex,
        mappedStaffRow: record.mappedStaffRow,
        status: record.status,
        validationErrors: record.validationErrors
      }))
    });
    return Object.freeze(result);
  }

  return Object.freeze({ STAFF_HEADERS, previewLegacyStaffImport, hash });
});
