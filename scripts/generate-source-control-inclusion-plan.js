"use strict";

const fs = require("node:fs");
const path = require("node:path");
const manifest = require("./generate-release-manifest");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT = "docs/release/source-control-inclusion-plan.md";
const BASELINE_INVENTORY = "docs/release/release-candidate-inventory.md";
const BASELINE_SNAPSHOT = "docs/release/original-rc-required-untracked-baseline.md";

function actionFor(entry) {
  if (!entry.required) return "intentionally exclude";
  if (entry.state === "tracked unchanged") return "requires human review";
  if (entry.classification === "test") return "include in tests/release tooling commit";
  if (["migration source", "migration preview"].includes(entry.classification) ||
      /booking-rating-(?:production-migration|standalone-migration-runner)/.test(entry.path)) {
    return "include in migration tooling commit";
  }
  if (entry.path.startsWith("docs/") ||
      entry.path === "config/frontend-runtime-config.staging.example.js") {
    return "include in documentation commit";
  }
  if (/scripts\/(?:build-|generate-|validate-)/.test(entry.path) &&
      !/build-booking-availability-phase5-bundle/.test(entry.path)) {
    return "include in tests/release tooling commit";
  }
  return "include in application commit";
}

function commitNumber(entry, action) {
  if (action === "include in migration tooling commit") return 5;
  if (entry.classification === "test") return 6;
  if (entry.path === "scripts/app-script-final-owner-access.js" ||
      entry.path === "scripts/booking-availability-phase5-apps-script-bundle.gs" ||
      entry.path === "config/apps-script-deployment-package.json" ||
      entry.path === "scripts/build-booking-availability-phase5-bundle.js" ||
      entry.path === "scripts/validate-apps-script-deployment-package.js") return 4;
  if (action === "include in tests/release tooling commit") return 7;
  if (action === "include in documentation commit") return 8;
  if (/payroll|phase4/.test(entry.path)) return 2;
  if (/attendance|schedule-management|scheduling|phase[123]/.test(entry.path)) return 1;
  if (/^public\/(?:pages|assets\/js\/core)\//.test(entry.path)) return 3;
  if (/booking|cashier|customer-booking|phase5/.test(entry.path)) return 3;
  return 1;
}

function baselineUntracked() {
  const snapshotPath = path.join(ROOT, BASELINE_SNAPSHOT);
  const sourcePath = fs.existsSync(snapshotPath) ? snapshotPath : path.join(ROOT, BASELINE_INVENTORY);
  const text = fs.readFileSync(sourcePath, "utf8");
  const match = text.match(/## Required untracked files, individually identified\s+([\s\S]*?)\s+## /);
  const section = match ? match[1] : text;
  return [...section.matchAll(/^(?:- |\d+\. )`([^`]+)`/gm)].map(item => item[1]);
}

function captureBaseline() {
  const text = fs.readFileSync(path.join(ROOT, BASELINE_INVENTORY), "utf8");
  const match = text.match(/## Required untracked files, individually identified\s+([\s\S]*?)\s+## /);
  if (!match) throw new Error("Original RC untracked section is unavailable.");
  const entries = [...match[1].matchAll(/^- `([^`]+)`/gm)].map(item => item[1]);
  if (entries.length !== 60) throw new Error(`Expected original RC list of 60; found ${entries.length}.`);
  const document = `# Original RC required-untracked baseline\n\n` +
    `Immutable accounting snapshot for \`CUT-HUB-POS-RC-6abc650-cd175c5a9ac7\`. ` +
    `It records the original **60** required untracked paths and contains no runtime data.\n\n` +
    entries.map((item, index) => `${index + 1}. \`${item}\``).join("\n") + "\n";
  fs.writeFileSync(path.join(ROOT, BASELINE_SNAPSHOT), document, "utf8");
  return entries;
}

function render() {
  const entries = manifest.buildEntries();
  const baseline = baselineUntracked();
  if (baseline.length !== 60) throw new Error(`Expected original RC list of 60; found ${baseline.length}.`);
  const records = entries.map(entry => {
    const action = actionFor(entry);
    return { ...entry, action, commit: commitNumber(entry, action) };
  });
  const rows = records.map(item =>
    `| \`${item.path}\` | ${item.state} | ${item.classification} | ${item.action} | ${item.required ? item.commit : "—"} | ${item.generated ? `generated from ${item.authority}` : "direct/authoritative"} |`).join("\n");
  const baselineRows = baseline.map((item, index) => `${index + 1}. \`${item}\``).join("\n");
  const titles = {
    1: "feat(attendance): add attendance and staff scheduling runtime",
    2: "feat(payroll): add payroll attendance runtime",
    3: "feat(booking): add booking and availability runtime",
    4: "build(apps-script): add aggregate bundle and deployment package",
    5: "build(migrations): add isolated preview and migration tooling",
    6: "test: add phase and safety coverage",
    7: "build(release): add deterministic validation tooling",
    8: "docs(release): add runbooks and Staging controls"
  };
  const commits = Object.entries(titles).map(([number, title]) => {
    const files = records.filter(item => item.required && item.commit === Number(number) &&
      item.state !== "tracked unchanged").map(item => `\`${item.path}\``);
    const generated = records.filter(item => item.required && item.commit === Number(number) &&
      item.generated).map(item => item.path);
    const dependency = Number(number) === 4
      ? "Commits 1–3 and the Phase 5 bundle generator; commit source plus regenerated aggregate/deployment metadata together."
      : Number(number) >= 5 ? "Validated runtime/source commits 1–4." : "Earlier phase contracts and shared authentication/API boundaries.";
    return `### ${number}. ${title}\n\n- Files: ${files.length ? files.join(", ") : "none pending (review tracked dependencies only)"}\n- Purpose: isolate one reviewable release concern.\n- Dependencies: ${dependency}\n- Validation: associated manifest tests, syntax checks, deterministic generation where applicable, and \`git diff --check\`.\n- Generated files: ${generated.length ? generated.map(item => `\`${item}\``).join(", ") : "none"}.\n- Rollback impact: revert this logical unit only after confirming later dependent commits are also reverted or regenerated; never leave aggregate output inconsistent with source.\n`;
  }).join("\n");
  const required = records.filter(item => item.required);
  const currentUntracked = required.filter(item => item.state === "untracked");
  return `# Source-control release inclusion plan\n\nNo files are staged or committed by this plan. Human approval is required before any Git mutation.\n\n## Accounting\n\n- Original immutable RC required-untracked entries: **${baseline.length}/60 accounted individually below**.\n- Current manifest required entries: **${required.length}**; current required untracked: **${currentUntracked.length}**.\n- Tracked-unchanged dependencies are marked \`requires human review\`; they need no new diff but remain release dependencies.\n- Excluded entries remain excluded and must not be silently added.\n\n## Proposed commits\n\n${commits}\n## Complete current classification\n\n| Path | Git state | Manifest classification | Git action | Proposed commit | Reproducibility |\n|---|---|---|---|---:|---|\n${rows}\n\n## Original 60 required untracked files\n\n${baselineRows}\n`;
}

function generate() {
  const document = render();
  const outputPath = path.join(ROOT, OUTPUT);
  fs.writeFileSync(outputPath, document, "utf8");
  return { outputPath, document };
}

if (require.main === module) {
  if (process.argv.includes("--capture-baseline")) captureBaseline();
  const result = generate();
  console.log(`Generated ${path.relative(ROOT, result.outputPath)}`);
}

module.exports = {
  OUTPUT, BASELINE_SNAPSHOT, actionFor, commitNumber, baselineUntracked,
  captureBaseline, render, generate
};
