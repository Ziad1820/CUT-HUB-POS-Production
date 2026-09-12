"use strict";

const fs = require("node:fs");
const path = require("node:path");

const SOURCE_ORDER = Object.freeze([
  "staff-attendance-schema.js",
  "staff-attendance-core.js",
  "staff-scheduling-phase2.js",
  "staff-scheduling-phase2-gas.js",
  "staff-attendance-phase3.js",
  "staff-attendance-phase3-gas.js"
]);
const OUTPUT_NAME = "staff-attendance-phase3-apps-script-bundle.gs";

function buildBundle(options = {}) {
  const sources = SOURCE_ORDER.map(name => ({
    name,
    source: fs.readFileSync(path.join(__dirname, name), "utf8").replace(/^\uFEFF/, "")
  }));
  const bundle = [
    "/* GENERATED FILE. Upload this bundle instead of the six constituent modules. */",
    "/* Order: schema -> Phase 1 core -> Phase 2 domain/adapter -> Phase 3 domain/adapter. */",
    ...sources.map(item => `\n/* BEGIN ${item.name} */\n${item.source}\n/* END ${item.name} */`)
  ].join("\n");
  const outputPath = path.join(__dirname, OUTPUT_NAME);
  if (options.write !== false) fs.writeFileSync(outputPath, bundle, "utf8");
  return { bundle, outputPath, sourceOrder: [...SOURCE_ORDER] };
}

if (require.main === module) console.log(`Built ${buildBundle().outputPath}`);

module.exports = { SOURCE_ORDER, OUTPUT_NAME, buildBundle };
