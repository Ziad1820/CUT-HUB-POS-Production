"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const vm = require("node:vm");
const ROOT = path.resolve(__dirname, "..");
const DIRECTORY = path.join(ROOT, "apps-script/production");
const sourceMap = require("../apps-script/production/source-map.json");
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");

function buildProductionPackage() {
  const registered = sourceMap.groups.flatMap(group => group.files);
  const byPath = new Map(registered.map(file => [file.path, file]));
  if (byPath.size !== registered.length) throw new Error("PRODUCTION_MODULE_DUPLICATE");
  const serverNames = sourceMap.fileOrder.filter(file => file !== "appsscript.json");
  if (serverNames.length !== registered.length || new Set(serverNames).size !== registered.length ||
      serverNames.some(file => !byPath.has(file))) throw new Error("PRODUCTION_FILE_ORDER_INVALID");
  const sources = new Map();
  const files = sourceMap.fileOrder.map(file => {
    if (!/^\d{3}_[A-Za-z0-9_-]+\.gs$/.test(file) && file !== "appsscript.json") throw new Error("PRODUCTION_FILE_PATH_INVALID");
    const source = fs.readFileSync(path.join(DIRECTORY, file), "utf8");
    sources.set(file, source);
    if (file !== "appsscript.json") {
      new vm.Script(source, { filename: file });
      if (sha256(source) !== byPath.get(file).sha256) throw new Error(`PRODUCTION_MODULE_CHANGED: ${file}`);
    } else if (JSON.parse(source).runtimeVersion !== "V8" || sha256(source) !== sourceMap.manifestSha256) {
      throw new Error("PRODUCTION_MANIFEST_CHANGED");
    }
    return { name: file.replace(/\.(gs|json)$/, ""), type: file.endsWith(".gs") ? "SERVER_JS" : "JSON", source };
  });
  for (const group of sourceMap.groups) {
    const reconstructed = group.files.map(file => sources.get(file.path)).join("");
    if (sha256(reconstructed) !== group.originalSha256 || Buffer.byteLength(reconstructed) !== group.originalBytes) {
      throw new Error(`PRODUCTION_BASELINE_CHANGED: ${group.originalName}`);
    }
  }
  new vm.Script(files.filter(file => file.type === "SERVER_JS").map(file => file.source).join("\n"));
  return { files };
}

if (require.main === module) {
  try {
    const result = buildProductionPackage();
    console.log(`Verified ${result.files.length - 1} Production modules against live version ${sourceMap.baselineVersion}.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { ROOT, DIRECTORY, sourceMap, sha256, buildProductionPackage };
