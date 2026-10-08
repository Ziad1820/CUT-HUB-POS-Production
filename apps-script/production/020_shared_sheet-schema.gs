const INVENTORY_SHEETS = {
  items: "INVENTORY_ITEMS",
  batches: "INVENTORY_BATCHES",
  recipes: "SERVICE_RECIPES",
  log: "INVENTORY_LOG",
  invoiceItems: "INVOICE_ITEMS"
};

function inventorySheet(name) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sheet) throw new Error(`Sheet ${name} not found`);
  return sheet;
}

function inventoryText(value) {
  return String(value === null || value === undefined ? "" : value).trim();
}

function normalizeSheetHeader(value) {
  return inventoryText(value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[\s_-]+/g, "");
}

function schemaContractError(code, message, details) {
  const error = new Error(message);
  error.code = code;
  if (details !== undefined) error.details = details;
  return error;
}

function inspectPositionalSheetSchema(sheet, options) {
  const contract = options.contract || [];
  const lastColumn = sheet && typeof sheet.getLastColumn === "function"
    ? sheet.getLastColumn() : 0;
  if (lastColumn < contract.length) {
    throw schemaContractError(
      options.notReadyCode,
      `${options.label} schema is missing required columns.`,
      { sheetName: options.sheetName, requiredColumns: contract.length, actualColumns: lastColumn }
    );
  }

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const normalized = headers.map(normalizeSheetHeader);
  const duplicateNormalized = normalized.filter((header, index) =>
    header && normalized.indexOf(header) !== index);
  if (duplicateNormalized.length) {
    throw schemaContractError(
      options.duplicateCode,
      `${options.label} schema contains duplicate headers.`,
      { sheetName: options.sheetName, headers: [...new Set(duplicateNormalized)] }
    );
  }

  contract.forEach((field, index) => {
    const accepted = (field.aliases || [field.name]).map(normalizeSheetHeader);
    const matches = normalized.reduce((result, header, headerIndex) => {
      if (accepted.indexOf(header) !== -1) result.push(headerIndex + 1);
      return result;
    }, []);
    if (matches.length > 1) {
      throw schemaContractError(
        options.duplicateCode,
        `${options.label} schema contains an ambiguous ${field.name} header.`,
        { sheetName: options.sheetName, header: field.name, columns: matches }
      );
    }
    if (accepted.indexOf(normalized[index]) === -1) {
      throw schemaContractError(
        options.incompatibleCode,
        `${options.label} protected header ${field.name} is missing or displaced.`,
        { sheetName: options.sheetName, header: field.name, expectedColumn: index + 1 }
      );
    }
  });

  return { headers, normalized };
}

function inspectNamedSheetSchema(sheet, options) {
  const lastColumn = sheet && typeof sheet.getLastColumn === "function"
    ? sheet.getLastColumn() : 0;
  if (lastColumn < 1) {
    throw schemaContractError(
      options.notReadyCode,
      `${options.label} schema is not initialized.`,
      { sheetName: options.sheetName }
    );
  }
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    .map((header) => String(header || "").trim());
  const canonicalize = options.canonicalize || normalizeSheetHeader;
  const keys = headers.map(canonicalize);
  const duplicateKeys = keys.filter((key, index) => key && keys.indexOf(key) !== index);
  if (duplicateKeys.length) {
    throw schemaContractError(
      options.duplicateCode,
      `${options.label} schema contains duplicate or ambiguous headers.`,
      { sheetName: options.sheetName, headers: [...new Set(duplicateKeys)] }
    );
  }
  const expectedKeys = (options.expectedHeaders || []).map(canonicalize);
  const missing = expectedKeys.filter((key) => keys.indexOf(key) === -1);
  if (missing.length) {
    throw schemaContractError(
      options.notReadyCode,
      `${options.label} schema is missing required headers.`,
      { sheetName: options.sheetName, missingHeaders: missing }
    );
  }
  return { headers, keys };
}

function findEquivalentHeaderColumn(headers, aliases) {
  const accepted = aliases.map(normalizeSheetHeader);
  for (let index = 0; index < headers.length; index += 1) {
    if (accepted.indexOf(normalizeSheetHeader(headers[index])) !== -1) return index + 1;
  }
  return 0;
}

function findSheetHeaderColumn(sheet, aliases, minimumWidth) {
  if (!sheet || typeof sheet.getRange !== "function") return 0;
  const lastColumn = typeof sheet.getLastColumn === "function" ? sheet.getLastColumn() : 0;
  const maxColumns = typeof sheet.getMaxColumns === "function" ? sheet.getMaxColumns() : 0;
  const desiredWidth = Math.max(Number(minimumWidth) || 0, lastColumn);
  const physicalWidth = maxColumns || lastColumn;
  const width = physicalWidth ? Math.min(physicalWidth, desiredWidth) : desiredWidth;
  if (width < 1) return 0;
  return findEquivalentHeaderColumn(
    sheet.getRange(1, 1, 1, width).getValues()[0],
    aliases
  );
}

function ensureSheetHeaderColumn(sheet, aliases, canonicalHeader, preferredColumn) {
  const existingColumn = findSheetHeaderColumn(sheet, aliases, preferredColumn);
  if (existingColumn) return existingColumn;

  const lastColumn = typeof sheet.getLastColumn === "function" ? sheet.getLastColumn() : 0;
  const targetColumn = lastColumn < preferredColumn ? preferredColumn : lastColumn + 1;
  const maxColumns = sheet.getMaxColumns();
  if (maxColumns < targetColumn) {
    sheet.insertColumnsAfter(maxColumns, targetColumn - maxColumns);
  }
  sheet.getRange(1, targetColumn).setValue(canonicalHeader);
  return targetColumn;
}

const INVOICE_REQUEST_ID_HEADER_ALIASES = [
  "invoice request id",
  "invoiceRequestId",
  "invoice idempotency key",
  "client request id",
  "request id",
  "idempotency key"
];

const BALANCE_BEFORE_HEADER_ALIASES = [
  "balanceBefore",
  "balance before",
  "previous balance",
  "stock balance before",
  "opening balance"
];

const BARBER_ID_HEADER_ALIASES = ["barberId", "barber id"];
const BARBER_CODE_HEADER_ALIASES = ["barberCode", "barber code"];
const BARBER_NAME_HEADER_ALIASES = ["barberName", "barber name"];

