"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const manifest = require("../scripts/generate-release-manifest");
const plan = require("../scripts/generate-source-control-inclusion-plan");

const root = path.resolve(__dirname, "..");
const outputPath = path.join(root, plan.OUTPUT);
const actual = fs.readFileSync(outputPath, "utf8");
const expected = plan.render();

assert.equal(actual, expected, "Source-control plan must match its deterministic generator.");
assert.equal(plan.baselineUntracked().length, 60, "Original RC 60-file list must remain accounted.");

for (const entry of manifest.buildEntries()) {
  assert.ok(actual.includes(`| \`${entry.path}\` |`), `Missing current manifest entry: ${entry.path}`);
}

for (const entry of manifest.buildEntries().filter(item => item.required && item.state === "untracked")) {
  assert.notEqual(plan.actionFor(entry), "intentionally exclude", `Required untracked excluded: ${entry.path}`);
}

console.log("Source-control inclusion plan checks passed.");
