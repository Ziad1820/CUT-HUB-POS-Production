"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { SOURCE_ORDER } = require("./build-booking-availability-phase5-bundle");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT = "docs/release-manifest.md";
const ALLOWED_CLASSIFICATIONS = Object.freeze([
  "authoritative source", "generated bundle", "UI page", "UI JavaScript",
  "UI stylesheet", "migration source", "migration preview", "backend integration",
  "test", "documentation", "operational runbook", "unrelated/pre-existing",
  "excluded intentionally"
]);

const explicitPaths = [
  "attendance.html", "bookings.html", "cashier.html", "login.html",
  "system-access.html", "schedule-management.html", "booking-availability-admin.html",
  "config/apps-script-deployment-package.json",
  "config/frontend-runtime-config.staging.example.js",
  "public/assets/js/core/api.js", "public/assets/js/core/auth.js",
  "public/assets/js/core/runtime-config.js",
  "public/assets/js/utils/layout.js", "public/assets/js/utils/text-fix.js",
  "public/assets/js/utils/keyboard-navigation.js", "public/assets/js/utils/language.js",
  "public/assets/css/shared.css",
  "public/assets/images/salonix-logo.svg", "public/assets/images/money.png",
  "public/assets/images/walet.png", "public/assets/images/card.png",
  "public/assets/images/bank-building.png",
  "public/assets/js/pages/attendance.js",
  "public/assets/js/pages/bookings.js", "public/assets/js/pages/cashier.js",
  "public/assets/js/pages/customer-booking.js",
  "public/assets/js/pages/schedule-management.js",
  "public/assets/js/pages/payroll-attendance.js",
  "public/assets/js/pages/booking-availability-admin.js",
  "public/assets/css/pages/attendance.css", "public/assets/css/pages/bookings.css",
  "public/assets/css/pages/customer-booking.css",
  "public/assets/css/pages/schedule-management.css",
  "public/assets/css/pages/payroll-attendance.css",
  "public/assets/css/pages/booking-availability-admin.css",
  "public/pages/login.html", "public/pages/attendance.html", "public/pages/bookings.html",
  "public/pages/cashier.html", "public/pages/customer-booking.html",
  "public/pages/schedule-management.html", "public/pages/payroll-attendance.html",
  "public/pages/booking-availability-admin.html", "public/pages/system-access.html",
  "public/pages/activity-log.html", "public/pages/customer-data.html",
  "public/pages/daily-closing.html", "public/pages/dashboard.html",
  "public/pages/data-analysis.html", "public/pages/enventory.html",
  "public/pages/expenses.html", "public/pages/income-statement.html",
  "public/pages/invoices.html", "public/pages/staff-accounting.html",
  "public/pages/staff-discount.html", "public/pages/withdrawals.html",
  "scripts/app-script-final-owner-access.js",
  "scripts/staff-attendance-schema.js", "scripts/staff-attendance-core.js",
  "scripts/staff-scheduling-phase2.js", "scripts/staff-scheduling-phase2-gas.js",
  "scripts/staff-attendance-phase3.js", "scripts/staff-attendance-phase3-gas.js",
  "scripts/staff-payroll-attendance-phase4.js", "scripts/staff-payroll-attendance-phase4-gas.js",
  "scripts/booking-availability-phase5.js", "scripts/booking-availability-phase5-gas.js",
  "scripts/staff-scheduling-phase2-apps-script-bundle.gs",
  "scripts/staff-attendance-phase3-apps-script-bundle.gs",
  "scripts/staff-payroll-attendance-phase4-apps-script-bundle.gs",
  "scripts/booking-availability-phase5-apps-script-bundle.gs",
  "scripts/build-staff-scheduling-phase2-bundle.js",
  "scripts/build-staff-attendance-phase3-bundle.js",
  "scripts/build-staff-payroll-attendance-phase4-bundle.js",
  "scripts/build-booking-availability-phase5-bundle.js",
  "scripts/validate-apps-script-deployment-package.js",
  "scripts/generate-release-manifest.js",
  "scripts/build-local-release-candidate.js",
  "scripts/generate-source-control-inclusion-plan.js",
  "scripts/booking-rating-production-migration.js",
  "scripts/booking-rating-standalone-migration-runner/appsscript.json",
  "scripts/booking-rating-standalone-migration-runner/booking-rating-production-migration-core.js",
  "scripts/booking-rating-standalone-migration-runner/standalone-migration-adapter.js",
  "tests/auth-navigation.test.js", "tests/staff-attendance-core.test.js",
  "tests/staff-scheduling-phase2.test.js", "tests/staff-scheduling-phase2-contract.test.js",
  "tests/staff-scheduling-phase2-review.test.js", "tests/staff-attendance-phase3.test.js",
  "tests/staff-payroll-attendance-phase4.test.js", "tests/booking-upgrade.test.js",
  "tests/booking-rating-production-migration.test.js",
  "tests/booking-rating-standalone-migration-runner.test.js",
  "tests/booking-availability-phase5.test.js",
  "tests/booking-availability-phase5-gas.test.js",
  "tests/booking-availability-phase5-contract.test.js",
  "tests/booking-no-check-in-detector.test.js",
  "tests/apps-script-deployment-package.test.js", "tests/release-manifest.test.js",
  "tests/local-release-candidate.test.js",
  "tests/staging-environment.test.js",
  "tests/frontend-api-configuration.test.js",
  "tests/source-control-inclusion-plan.test.js",
  "docs/staff-attendance-phase-1.md", "docs/staff-attendance-phase-1-engineering-review.md",
  "docs/staff-scheduling-phase-2.md", "docs/staff-scheduling-phase-2-engineering-review.md",
  "docs/staff-attendance-phase-3.md", "docs/staff-attendance-phase-3-strict-review.md",
  "docs/staff-payroll-attendance-phase-4.md",
  "docs/staff-payroll-attendance-phase-4-strict-review.md",
  "docs/booking-no-check-in-trigger-runbook.md", "docs/staging-entry-checklist.md",
  "docs/release/migration-execution-matrix.md",
  "docs/release/staging-configuration-template.md",
  "docs/release/staging-test-account-matrix.md",
  "docs/release/staging-data-blueprint.md",
  "docs/release/pre-staging-gate-report.md",
  "docs/release/release-candidate-inventory.md",
  "docs/release/human-approval-packet.md",
  "docs/release/source-control-inclusion-plan.md",
  "docs/release/original-rc-required-untracked-baseline.md",
  "docs/release/staging-operator-input.md",
  "docs/release/staging-script-property-plan.md",
  "docs/release/frontend-staging-configuration.md",
  "docs/release/migration-preview-operator-procedure.md",
  "docs/release/staging-baseline-evidence-template.md",
  "docs/release/human-checkpoint-matrix.md",
  OUTPUT,
  ".codex-daily-closing-inline-check.js", ".vscode/settings.json", ".sync-backups/"
];

function gitDirectory() {
  const marker = path.join(ROOT, ".git");
  const stat = fs.statSync(marker);
  if (stat.isDirectory()) return marker;
  const value = fs.readFileSync(marker, "utf8").trim();
  if (!value.startsWith("gitdir:")) throw new Error("Unsupported .git marker.");
  return path.resolve(ROOT, value.slice("gitdir:".length).trim());
}

function gitStates() {
  const index = fs.readFileSync(path.join(gitDirectory(), "index"));
  if (index.toString("ascii", 0, 4) !== "DIRC") throw new Error("Invalid Git index signature.");
  const version = index.readUInt32BE(4);
  if (![2, 3].includes(version)) throw new Error(`Unsupported Git index version ${version}.`);
  const count = index.readUInt32BE(8);
  const tracked = new Set();
  const hashes = new Map();
  let offset = 12;
  for (let entryIndex = 0; entryIndex < count; entryIndex += 1) {
    const entryStart = offset;
    const hash = index.subarray(offset + 40, offset + 60).toString("hex");
    const flags = index.readUInt16BE(offset + 60);
    const extended = (flags & 0x4000) !== 0;
    const pathStart = offset + (extended ? 64 : 62);
    let pathEnd = pathStart;
    while (pathEnd < index.length && index[pathEnd] !== 0) pathEnd += 1;
    const file = index.toString("utf8", pathStart, pathEnd).replace(/\\/g, "/");
    tracked.add(file);
    hashes.set(file, hash);
    offset = entryStart + Math.ceil((pathEnd - entryStart + 1) / 8) * 8;
  }
  const states = new Map();
  function blobHash(buffer) {
    return crypto.createHash("sha1").update(`blob ${buffer.length}\0`).update(buffer).digest("hex");
  }
  for (const file of tracked) {
    const absolute = path.join(ROOT, file);
    if (!fs.existsSync(absolute)) {
      states.set(file, "deleted");
      continue;
    }
    const content = fs.readFileSync(absolute);
    const normalized = Buffer.from(content.toString("utf8").replace(/\r\n/g, "\n"), "utf8");
    states.set(file, blobHash(content) === hashes.get(file) || blobHash(normalized) === hashes.get(file)
      ? "tracked unchanged" : "tracked modified");
  }
  return { tracked, states };
}

function phaseFor(file) {
  if (/auth|login|system-access|layout|api\.js/.test(file)) return "Authentication & navigation";
  if (/staff-attendance-phase-1|staff-attendance-(?:schema|core)/.test(file)) return "Phase 1 Attendance";
  if (/scheduling-phase2|schedule-management|staff-scheduling-phase-2/.test(file)) return "Phase 2 Scheduling";
  if (/payroll-attendance/.test(file)) return "Phase 4 Payroll Attendance";
  if (/attendance-phase3|staff-attendance-phase-3|attendance\.html|pages\/attendance|attendance\.css/.test(file)) return "Phase 3 Attendance";
  if (/booking-availability|no-check-in/.test(file)) return "Phase 5 Booking Availability";
  if (/booking-rating/.test(file)) return "Booking rating migration";
  if (/booking|cashier|customer-booking/.test(file)) return "Booking integration";
  if (/deployment-package/.test(file)) return "Deployment package";
  if (/release-manifest|staging-entry/.test(file)) return "Pre-Staging operations";
  return "Cross-phase/local";
}

function testsFor(file) {
  const tests = [];
  if (/auth|login|system-access|layout|api\.js/.test(file)) tests.push("tests/auth-navigation.test.js");
  if (/scheduling-phase2|schedule-management/.test(file)) tests.push(
    "tests/staff-scheduling-phase2.test.js", "tests/staff-scheduling-phase2-contract.test.js");
  if (/attendance-phase3|pages\/attendance|attendance\.css/.test(file)) tests.push(
    "tests/staff-attendance-phase3.test.js");
  if (/staff-attendance-(?:schema|core)|phase-1/.test(file)) tests.push(
    "tests/staff-attendance-core.test.js");
  if (/payroll-attendance/.test(file)) tests.push("tests/staff-payroll-attendance-phase4.test.js");
  if (/booking-availability|no-check-in/.test(file)) tests.push(
    "tests/booking-availability-phase5.test.js",
    "tests/booking-availability-phase5-gas.test.js",
    "tests/booking-availability-phase5-contract.test.js",
    "tests/booking-no-check-in-detector.test.js");
  if (/booking-rating/.test(file)) tests.push(
    "tests/booking-rating-production-migration.test.js",
    "tests/booking-rating-standalone-migration-runner.test.js");
  if (/pages\/bookings|customer-booking|cashier|booking-upgrade/.test(file)) {
    tests.push("tests/booking-upgrade.test.js");
  }
  if (/deployment-package|apps-script-final-owner-access|apps-script-bundle/.test(file)) {
    tests.push("tests/apps-script-deployment-package.test.js");
  }
  if (/release-manifest/.test(file)) tests.push("tests/release-manifest.test.js");
  return [...new Set(tests)].join("<br>") || "—";
}

function describe(file, sourceOrder) {
  const rootWrapper = /^[^/]+\.html$/.test(file);
  const earlierBundle = /staff-(?:scheduling-phase2|attendance-phase3|payroll-attendance-phase4)-apps-script-bundle\.gs$/.test(file);
  const historicalReview = /(?:engineering-review|strict-review)\.md$/.test(file);
  const localArtifact = file === ".codex-daily-closing-inline-check.js" ||
    file.startsWith(".vscode/") || file.startsWith(".sync-backups/");
  const generatedRcMetadata = [
    "docs/release/release-candidate-inventory.md",
    "docs/release/human-approval-packet.md"
  ].indexOf(file) !== -1;
  let classification = "authoritative source";
  let required = true;
  let generated = false;
  let authority = "—";
  let order = "Release evidence; not runtime-loaded";
  let reason = "Required source or verification evidence for the complete implementation.";

  if (localArtifact) {
    classification = "unrelated/pre-existing"; required = false;
    order = "Never package"; reason = "Local editor, backup, or scratch artifact; excluded from release.";
  } else if (generatedRcMetadata) {
    classification = "documentation"; required = true; generated = true;
    authority = "scripts/build-local-release-candidate.js";
    order = "Commit as release evidence; exclude from deployment payload and its own content hash";
    reason = "Generated approval/inventory evidence is required in source control but excluded from deployment payload hashing to avoid recursion.";
  } else if (rootWrapper) {
    classification = "excluded intentionally"; required = false;
    order = "Do not deploy";
    reason = "Root compatibility wrapper duplicates public output; Vercel serves the public directory.";
  } else if (file.endsWith(".html")) {
    classification = "UI page"; order = "Static public package";
    reason = "Runtime page for an in-scope workflow.";
  } else if (/public\/assets\/js\//.test(file)) {
    classification = "UI JavaScript";
    order = /core\/api/.test(file) ? "Browser: API before page module" :
      /core\/auth/.test(file) ? "Browser: auth before protected page initialization" :
        /utils\/layout/.test(file) ? "Browser: shared layout before/with page module" :
          "Browser: after shared core and page markup";
    reason = "Runtime client logic for an in-scope workflow.";
  } else if (/public\/assets\/css\//.test(file)) {
    classification = "UI stylesheet"; order = "Browser: linked by its UI page";
    reason = "Runtime RTL/accessibility styling for an in-scope page.";
  } else if (/public\/assets\/images\//.test(file)) {
    classification = "authoritative source"; order = "Static public asset loaded by UI page";
    reason = "Runtime visual asset referenced by an in-scope UI page.";
  } else if (file === "scripts/app-script-final-owner-access.js") {
    classification = "backend integration"; order = "Apps Script package review/load order 1";
    reason = "Sole doPost router plus authentication, authorization, environment identity, and legacy/V2 integration.";
  } else if (file === "scripts/booking-availability-phase5-apps-script-bundle.gs") {
    classification = "generated bundle"; generated = true;
    authority = "scripts/build-booking-availability-phase5-bundle.js + declared constituent sources";
    order = "Apps Script package review/load order 2";
    reason = "Only aggregate Phase 1-5 bundle intended for application upload.";
  } else if (earlierBundle) {
    classification = "generated bundle"; generated = true; required = false;
    authority = file.includes("scheduling") ? "scripts/build-staff-scheduling-phase2-bundle.js" :
      file.includes("phase3") ? "scripts/build-staff-attendance-phase3-bundle.js" :
        "scripts/build-staff-payroll-attendance-phase4-bundle.js";
    order = "Never upload with Phase 5 aggregate";
    reason = "Obsolete for the aggregate package and overlaps globals already contained in Phase 5.";
  } else if (sourceOrder.has(path.basename(file))) {
    classification = file.endsWith("-gas.js") ? "backend integration" : "authoritative source";
    order = `Aggregate internal order ${sourceOrder.get(path.basename(file))}; exclude direct upload`;
    reason = "Authoritative constituent of the generated aggregate bundle.";
  } else if (/build-.*-bundle\.js$|validate-apps-script|generate-(?:release-manifest|source-control-inclusion-plan)/.test(file)) {
    classification = "authoritative source"; order = "Local build/validation only";
    reason = "Deterministic local generator or package safety validator.";
  } else if (file.startsWith("tests/")) {
    classification = "test"; order = "Local validation only";
    reason = "Release-blocking local regression or safety evidence.";
  } else if (/booking-rating-production-migration|standalone-migration/.test(file)) {
    classification = file.endsWith("appsscript.json") ? "migration preview" : "migration source";
    order = "Separate migration project only; never application package";
    reason = "Migration artifact retained separately; execution requires a future explicit approval.";
  } else if (file === "config/apps-script-deployment-package.json") {
    classification = "operational runbook"; order = "Read by local package validator";
    reason = "Machine-readable allowlist and exclusion list for the future Apps Script package.";
  } else if (/booking-no-check-in-trigger-runbook|staging-entry-checklist|release-manifest/.test(file)) {
    classification = "operational runbook";
    if (file === OUTPUT) {
      generated = true; authority = "scripts/generate-release-manifest.js";
    }
    reason = "Required pre-Staging operational control document.";
  } else if (file.startsWith("docs/")) {
    classification = "documentation"; required = !historicalReview;
    if ([
      "docs/release/source-control-inclusion-plan.md",
      "docs/release/original-rc-required-untracked-baseline.md"
    ].includes(file)) {
      generated = true;
      authority = "scripts/generate-source-control-inclusion-plan.js";
    }
    reason = historicalReview ? "Historical engineering review; documentation-only and not deployed." :
      "Phase specification and operational reference; documentation-only and not runtime-loaded.";
  }
  return { classification, required, generated, authority, order, reason };
}

function buildEntries() {
  const { tracked, states } = gitStates();
  const sourceOrder = new Map(SOURCE_ORDER.map((name, index) => [name, index + 1]));
  return [...new Set(explicitPaths)].sort().map(file => {
    const normalized = file.replace(/\\/g, "/");
    const exists = normalized === OUTPUT || [
      "docs/release/release-candidate-inventory.md",
      "docs/release/human-approval-packet.md"
    ].includes(normalized) || fs.existsSync(path.join(ROOT, normalized));
    const state = states.get(normalized) || (tracked.has(normalized)
      ? "tracked unchanged" : "untracked");
    const description = describe(normalized, sourceOrder);
    return {
      path: normalized, state, phase: phaseFor(normalized),
      required: description.required, generated: description.generated,
      authority: description.authority, order: description.order,
      tests: testsFor(normalized), classification: description.classification,
      reason: exists ? description.reason : `${description.reason} Expected pre-Staging artifact is currently missing.`
    };
  });
}

function escapeCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function renderManifest(entries) {
  const requiredTracked = entries.filter(item => item.required &&
    item.state.startsWith("tracked")).length;
  const requiredUntracked = entries.filter(item => item.required && item.state === "untracked").length;
  const requiredUntrackedPaths = entries.filter(item => item.required && item.state === "untracked")
    .map(item => `- \`${item.path}\``).join("\n") || "- None";
  const excluded = entries.filter(item => !item.required).map(item =>
    `- \`${item.path}\` — ${item.reason}`).join("\n") || "- None";
  const rows = entries.map(item => `| \`${escapeCell(item.path)}\` | ${item.state} | ${item.phase} | ${item.classification} | ${item.required ? "yes" : "no"} | ${item.generated ? "yes" : "no"} | ${escapeCell(item.authority)} | ${escapeCell(item.order)} | ${escapeCell(item.tests)} | ${escapeCell(item.reason)} |`).join("\n");
  return `# CUT-HUB-POS deterministic release manifest\n\n` +
    `Generated locally by \`scripts/generate-release-manifest.js\`. Do not hand-edit. ` +
    `This document is release evidence, not authorization to deploy, migrate, install triggers, or modify data.\n\n` +
    `## Counts\n\n- Required tracked files: **${requiredTracked}**\n` +
    `- Required untracked files: **${requiredUntracked}**\n` +
    `- Total classified entries: **${entries.length}**\n\n` +
    `## Intended Apps Script application package\n\n1. \`scripts/app-script-final-owner-access.js\` — sole router/auth/integration file.\n` +
    `2. \`scripts/booking-availability-phase5-apps-script-bundle.gs\` — sole aggregate Phase 1-5 bundle.\n\n` +
    `Never upload constituent Phase 1-5 sources or earlier aggregate bundles with item 2. Migration runners remain a separate, non-executed package.\n\n` +
    `## Required untracked files\n\n${requiredUntrackedPaths}\n\n` +
    `## Intentionally excluded or documentation-only artifacts\n\n${excluded}\n\n` +
    `## Complete classified inventory\n\n` +
    `| Path | Git state | Phase | Classification | Required | Generated | Authoritative source | Load/deployment order | Associated tests | Inclusion/exclusion reason |\n` +
    `|---|---|---|---|---:|---:|---|---|---|---|\n${rows}\n`;
}

function generate(options = {}) {
  const entries = buildEntries();
  const document = renderManifest(entries);
  const outputPath = path.join(ROOT, OUTPUT);
  if (options.write !== false) fs.writeFileSync(outputPath, document, "utf8");
  return { entries, document, outputPath };
}

if (require.main === module) {
  const result = generate();
  console.log(`Generated ${path.relative(ROOT, result.outputPath)} (${result.entries.length} entries)`);
}

module.exports = {
  ALLOWED_CLASSIFICATIONS, OUTPUT, explicitPaths, gitDirectory, gitStates,
  buildEntries, renderManifest, generate
};
