"use strict";

// Node-only tooling. Runtime sources remain plain Apps Script globals.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const definition = require("../config/backend-sources.json");

const ROOT = path.resolve(__dirname, "..");

function manifestOutputs() {
  if (definition.version !== 1 || !Array.isArray(definition.outputs)) {
    throw new Error("Invalid backend source manifest");
  }
  const outputs = new Set();
  const sources = new Set();
  for (const output of definition.outputs) {
    if (!/^scripts\/[\w-]+\.js$/.test(output.path) || outputs.has(output.path) ||
        !Array.isArray(output.sources) || output.sources.length === 0) {
      throw new Error(`Invalid or duplicate backend output: ${output.path}`);
    }
    outputs.add(output.path);
    for (const source of output.sources) {
      if (!/^backend\/(?:[\w-]+\/)+[\w-]+\.js$/.test(source) || sources.has(source)) {
        throw new Error(`Invalid or repeated backend source: ${source}`);
      }
      sources.add(source);
    }
  }
  return definition.outputs;
}

function assemble(output) {
  const buffers = output.sources.map(source => {
    const buffer = fs.readFileSync(path.join(ROOT, source));
    // Compile independently so a split inside a function/comment fails early.
    new vm.Script(buffer.toString("utf8"), { filename: source });
    return buffer;
  });
  const buffer = Buffer.concat(buffers);
  new vm.Script(buffer.toString("utf8"), { filename: output.path });
  return buffer;
}

function readBackendSource(outputPath) {
  const output = manifestOutputs().find(item => item.path === outputPath);
  if (!output) throw new Error(`Unregistered backend output: ${outputPath}`);
  return assemble(output).toString("utf8");
}

function buildBackend(options = {}) {
  // Assemble and compile everything before writing any compatibility output.
  const files = manifestOutputs().map(output => ({ path: output.path, buffer: assemble(output) }));
  const sourceOverrides = Object.fromEntries(files.map(file =>
    [path.basename(file.path), file.buffer.toString("utf8")]));
  const { buildBundle, OUTPUT_NAME } = require("./build-booking-availability-phase5-bundle");
  const aggregate = buildBundle({ write: false, sourceOverrides });
  files.push({ path: `scripts/${OUTPUT_NAME}`, buffer: Buffer.from(aggregate.bundle, "utf8") });
  // The shared runtime namespace must also compile without duplicate globals.
  new vm.Script(files[0].buffer.toString("utf8") + "\n" + aggregate.bundle,
    { filename: "combined-apps-script-runtime.js" });
  const stale = files.filter(file => {
    const target = path.join(ROOT, file.path);
    return !fs.existsSync(target) || !fs.readFileSync(target).equals(file.buffer);
  }).map(file => file.path);
  if (options.write === true) {
    for (const file of files) {
      if (stale.includes(file.path)) fs.writeFileSync(path.join(ROOT, file.path), file.buffer);
    }
  }
  return { files, stale, valid: stale.length === 0, sourceCount: definition.outputs.flatMap(x => x.sources).length };
}

function checkBaseline(result = buildBackend()) {
  const baseline = require("../docs/backend-refactor-baseline.json");
  return baseline.files.filter(original => {
    const current = result.files.find(file => file.path === original.path);
    return !current || crypto.createHash("sha256").update(current.buffer).digest("hex") !== original.sha256;
  }).map(file => file.path);
}

if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    if (args.some(arg => !["--check", "--check-baseline"].includes(arg))) {
      throw new Error("Usage: node scripts/build-backend.js [--check] [--check-baseline]");
    }
    const checking = args.includes("--check") || args.includes("--check-baseline");
    const result = buildBackend({ write: !checking });
    const mismatches = args.includes("--check-baseline") ? checkBaseline(result) : [];
    if ((checking && !result.valid) || mismatches.length) {
      console.error(JSON.stringify({ stale: result.stale, baselineMismatches: mismatches }, null, 2));
      process.exitCode = 1;
    } else {
      console.log(`${checking ? "Verified" : "Built"} ${result.sourceCount} backend modules -> ${result.files.length} compatible outputs.`);
      if (args.includes("--check-baseline")) console.log("All outputs match the pre-refactor SHA-256 baseline.");
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { ROOT, manifestOutputs, assemble, readBackendSource, buildBackend, checkBaseline };
