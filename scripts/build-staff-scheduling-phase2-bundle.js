"use strict";

const fs = require("node:fs");
const path = require("node:path");

const SOURCE_ORDER = Object.freeze([
  "staff-attendance-schema.js",
  "staff-attendance-core.js",
  "staff-scheduling-phase2.js",
  "staff-scheduling-phase2-gas.js"
]);
const OUTPUT_NAME = "staff-scheduling-phase2-apps-script-bundle.gs";

function buildBundle(options = {}) {
  const directory = __dirname;
  const sources = SOURCE_ORDER.map(name => ({
    name,
    source: fs.readFileSync(path.join(directory, name), "utf8").replace(/^\uFEFF/, "")
  }));
  const bundle = [
    "/* GENERATED FILE. Upload this bundle instead of its four source modules. */",
    "/* Required internal order: schema -> core -> scheduling domain -> GAS adapter. */",
    ...sources.map(item => `\n/* BEGIN ${item.name} */\n${item.source}\n/* END ${item.name} */`)
  ].join("\n");
  const outputPath = path.join(directory, OUTPUT_NAME);
  if (options.write !== false) fs.writeFileSync(outputPath, bundle, "utf8");
  return { bundle, outputPath, sourceOrder: [...SOURCE_ORDER] };
}

if (require.main === module) {
  const result = buildBundle();
  console.log(`Built ${result.outputPath}`);
}

module.exports = { SOURCE_ORDER, OUTPUT_NAME, buildBundle };
