"use strict";

const fs = require("node:fs");
const path = require("node:path");

const SOURCE_ORDER = Object.freeze([
  "staff-attendance-schema.js",
  "staff-attendance-core.js",
  "staff-scheduling-phase2.js",
  "staff-scheduling-phase2-gas.js",
  "staff-import-preview-staging.js",
  "staff-attendance-phase3.js",
  "staff-attendance-phase3-gas.js",
  "staff-payroll-attendance-phase4.js",
  "staff-payroll-attendance-phase4-gas.js",
  "staff-schema-migration-staging-executor.js",
  "core-staging-auth-bootstrap.js",
  "booking-availability-phase5.js",
  "branch-foundation-staging.js",
  "branch-registry-row-staging.js",
  "booking-availability-phase5-gas.js"
]);
const OUTPUT_NAME = "booking-availability-phase5-apps-script-bundle.gs";

function normalizeLineEndings(source) {
  return String(source).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
}

function buildBundle(options = {}) {
  const sources = SOURCE_ORDER.map(name => ({
    name,
    source: normalizeLineEndings(
      fs.readFileSync(path.join(__dirname, name), "utf8")
    )
  }));
  const bundle = normalizeLineEndings([
    "/* GENERATED FILE. Upload this bundle instead of the constituent Phase 1-5 modules. */",
    "/* Order: schema -> Phase 1 core -> Phase 2 -> Phase 3 -> Phase 4 -> Staging schema executor -> Core Auth bootstrap -> Phase 5 contract -> Branch Foundation -> Canonical branch row -> Phase 5 GAS. */",
    ...sources.map(item => `\n/* BEGIN ${item.name} */\n${item.source}\n/* END ${item.name} */`)
  ].join("\n"));
  const outputPath = path.join(__dirname, OUTPUT_NAME);
  if (options.write !== false) fs.writeFileSync(outputPath, bundle, { encoding: "utf8" });
  return { bundle, outputPath, sourceOrder: [...SOURCE_ORDER] };
}

if (require.main === module) console.log(`Built ${buildBundle().outputPath}`);

module.exports = { SOURCE_ORDER, OUTPUT_NAME, normalizeLineEndings, buildBundle };
