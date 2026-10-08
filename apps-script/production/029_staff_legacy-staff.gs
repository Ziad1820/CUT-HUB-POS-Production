function getStaffSheet() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("STAFF");
  if (!sheet) {
    throw new Error("Sheet STAFF not found");
  }
  return sheet;
}

function parseSheetBoolean(value, defaultValue) {
  if (value === true || value === false) return value;

  const text = String(value || "").trim().toUpperCase();
  if (!text) return defaultValue;

  if (["TRUE", "YES", "1", "Y"].indexOf(text) !== -1) return true;
  if (["FALSE", "NO", "0", "N"].indexOf(text) !== -1) return false;

  return defaultValue;
}

function normalizeStaffForSheet(staff, index) {
  const name = String(staff.name || staff.staffName || "").trim();
  const code = String(staff.code || staff.staffCode || "").trim().toUpperCase();

  return {
    id: String(staff.staffId || staff.id || "").trim(),
    name,
    code,
    salary: parseSheetAmount(staff.salary || staff.salaries),
    percentage: parseSheetAmount(staff.percentage || staff.salaryPercentage),
    bonus: parseSheetAmount(staff.bonus),
    deduction: parseSheetAmount(staff.deduction || staff.debt || staff.lateDiscount),
    isBarber: parseSheetBoolean(staff.isBarber, true),
    active: parseSheetBoolean(staff.active, true)
  };
}

