"use strict";
// Preserve the immutable v38 source before registering deliberate runtime edits.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const base = path.join(root, "apps-script/production");
const mapPath = path.join(base, "source-map.json");
const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
const files = {
  "002_core_http-router.gs": ["doPost"],
  "030_staff_branch-repository.gs": ["getStaff"],
  "040_accounting_daily-closing.gs": ["buildDailyClosingPreview", "getDailyClosingPreview"],
  "042_invoices_schema.gs": ["findInvoiceByRequestId"],
  "043_invoices_mutations.gs": ["createInvoice", "updateInvoice"],
  "044_invoices_queries.gs": ["getInvoices", "readInvoiceDataSnapshot"],
  "045_invoices_deletion.gs": ["deleteInvoice"],
  "048_invoices_pdf.gs": ["createInvoicePdf"],
  "064_phase_staff-scheduling-phase2.gs": [],
  "065_phase_staff-scheduling-phase2-gas.gs": ["schedulePhase2CreateRepository"],
  "067_phase_staff-attendance-phase3.gs": [],
  "069_phase_staff-payroll-attendance-phase4.gs": [],
  "073_phase_booking-availability-phase5.gs": [],
  "078_availability_authorization-cache.gs": ["bookingAvailabilityPhase5CacheKey"],
  "089_availability_action-router.gs": ["handleBookingAvailabilityPhase5Action"]
};
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
fs.mkdirSync(path.join(base, "baseline"), { recursive: true });
for (const [name, changedGlobals] of Object.entries(files)) {
  const record = map.groups.flatMap(group => group.files).find(item => item.path === name);
  if (!record) throw new Error("PRODUCTION_SOURCE_NOT_REGISTERED");
  if (!record.baselineSourcePath) {
    const original = execFileSync("git", ["show", `HEAD:apps-script/production/${name}`], { cwd: root });
    if (hash(original) !== record.sha256) throw new Error("ORIGINAL_PRODUCTION_SOURCE_CHANGED");
    record.baselineSourcePath = `baseline/${name.replace(/\.gs$/, ".js")}`;
    fs.writeFileSync(path.join(base, record.baselineSourcePath), original);
  }
  record.currentSha256 = hash(fs.readFileSync(path.join(base, name)));
  record.changedGlobals = changedGlobals;
  if (name === "048_invoices_pdf.gs") record.addedGlobals = ["getInvoicePdf"];
  if (name === "030_staff_branch-repository.gs") record.addedGlobals = ["cashierContextAllows", "getCashierCatalog"];
  if (name === "040_accounting_daily-closing.gs") record.addedGlobals = ["buildCashierSummaryFromSheets"];
  record.changeReason = "Owner-configured minute attendance accounting and shared live booking availability";
}
fs.writeFileSync(mapPath, JSON.stringify(map, null, 2) + "\n");
console.log("Registered intentional production module changes; original source bytes preserved.");
