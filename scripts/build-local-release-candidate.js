"use strict";

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const releaseManifest = require("./generate-release-manifest");
const deploymentValidator = require("./validate-apps-script-deployment-package");

const ROOT = path.resolve(__dirname, "..");
const INVENTORY_PATH = "docs/release/release-candidate-inventory.md";
const APPROVAL_PATH = "docs/release/human-approval-packet.md";
const APPS_RUNTIME = Object.freeze([
  "scripts/app-script-final-owner-access.js",
  "scripts/booking-availability-phase5-apps-script-bundle.gs"
]);

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function readGitInfo() {
  const gitDir = releaseManifest.gitDirectory();
  const headValue = fs.readFileSync(path.join(gitDir, "HEAD"), "utf8").trim();
  if (!headValue.startsWith("ref:")) return { branch: "DETACHED", head: headValue };
  const ref = headValue.slice(4).trim();
  const loose = path.join(gitDir, ...ref.split("/"));
  let head = fs.existsSync(loose) ? fs.readFileSync(loose, "utf8").trim() : "";
  if (!head) {
    const packed = path.join(gitDir, "packed-refs");
    if (fs.existsSync(packed)) {
      const match = fs.readFileSync(packed, "utf8").split(/\r?\n/)
        .find(line => line.endsWith(` ${ref}`));
      if (match) head = match.split(" ")[0];
    }
  }
  if (!head) throw new Error(`Unable to resolve Git HEAD for ${ref}.`);
  return { branch: ref.replace(/^refs\/heads\//, ""), head };
}

function releaseRole(entry) {
  if (entry.path.startsWith(".sync-backups/") || entry.path.startsWith(".vscode/") ||
      entry.path === ".codex-daily-closing-inline-check.js") return "local-only artifact";
  if (!entry.required) return "intentionally excluded";
  if (/^public\//.test(entry.path) && [
    "UI page", "UI JavaScript", "UI stylesheet", "authoritative source"
  ].includes(entry.classification)) return "frontend runtime";
  if (APPS_RUNTIME.includes(entry.path)) return "Apps Script runtime";
  if (["migration source", "migration preview"].includes(entry.classification)) {
    return "migration package";
  }
  if (entry.classification === "test") return "test evidence";
  if (entry.classification === "documentation") return "documentation";
  if (entry.classification === "operational runbook") return "operations";
  return "authoritative build source";
}

function deploymentDestination(entry) {
  const role = releaseRole(entry);
  if (role === "frontend runtime") return `frontend/${entry.path.replace(/^public\//, "")}`;
  if (role === "Apps Script runtime") return `apps-script-application/${path.posix.basename(entry.path)}`;
  if (role === "migration package") return `migrations/${entry.path.replace(/^scripts\//, "")}`;
  if (role === "documentation") return `documentation/${entry.path.replace(/^docs\//, "")}`;
  if (role === "operations") return `operations/${entry.path.replace(/^(docs\/|config\/)/, "")}`;
  if (role === "test evidence") return "tests-manifest/TESTS-MANIFEST.json (hash entry only)";
  if (role === "authoritative build source") return "source control/build input; not copied into runtime payload";
  return "not packaged";
}

function fileRecord(entry) {
  if ([INVENTORY_PATH, APPROVAL_PATH].includes(entry.path)) {
    return { ...entry, role: releaseRole(entry), destination: deploymentDestination(entry),
      sha256: "—", size: 0 };
  }
  const absolute = path.join(ROOT, entry.path);
  if (!fs.existsSync(absolute) || fs.statSync(absolute).isDirectory()) {
    return { ...entry, role: releaseRole(entry), destination: deploymentDestination(entry),
      sha256: "—", size: 0 };
  }
  const content = fs.readFileSync(absolute);
  return { ...entry, role: releaseRole(entry), destination: deploymentDestination(entry),
    sha256: sha256(content), size: content.length };
}

function payloadRecords(records) {
  return records.filter(record => record.required && [
    "frontend runtime", "Apps Script runtime", "migration package", "documentation", "operations"
  ].includes(record.role) && ![INVENTORY_PATH, APPROVAL_PATH].includes(record.path));
}

function canonicalPackageHash(records) {
  const canonical = records.slice().sort((left, right) =>
    left.destination.localeCompare(right.destination)).map(record =>
    `${record.destination}\0${record.sha256}\0${record.size}`).join("\n");
  return sha256(Buffer.from(canonical, "utf8"));
}

function escapeCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function renderInventory(plan) {
  const categories = [
    "frontend runtime", "Apps Script runtime", "migration package", "test evidence",
    "documentation", "operations", "authoritative build source",
    "intentionally excluded", "local-only artifact"
  ];
  const sections = categories.map(role => {
    const rows = plan.records.filter(record => record.role === role).map(record =>
      `| \`${escapeCell(record.path)}\` | ${record.state} | ${record.sha256} | ${record.size} | ${record.phase} | ${record.role} | ${record.generated ? "generated" : "authoritative/direct"} | ${escapeCell(record.authority)} | ${escapeCell(record.destination)} | ${escapeCell(record.reason)} |`).join("\n");
    return `## ${role}\n\n` + (rows ?
      `| Path | Git state | SHA-256 | Bytes | Phase | Release role | Authority | Source dependency | Expected destination | Inclusion/exclusion reason |\n|---|---|---|---:|---|---|---|---|---|---|\n${rows}` : "None.");
  }).join("\n\n");
  const untracked = plan.records.filter(record => record.required && record.state === "untracked")
    .map(record => `- \`${record.path}\` — ${record.sha256}`).join("\n");
  return `# Local Release Candidate inventory\n\n` +
    `**LOCAL RELEASE CANDIDATE — NOT APPROVED FOR DEPLOYMENT**\n\n` +
    `Release Candidate: \`${plan.rcId}\`  \nPayload SHA-256: \`${plan.packageSha256}\`  \n` +
    `Git branch: \`${plan.git.branch}\`  \nHEAD: \`${plan.git.head}\`  \n` +
    `Dirty tree: **yes** — this candidate is not reproducible from Git alone.  \n` +
    `Required tracked: **${plan.requiredTracked}**  \nRequired untracked: **${plan.requiredUntracked}**  \n` +
    `Tracked modified: **${plan.trackedModified}**  \nExcluded entries: **${plan.excludedCount}**\n\n` +
    `## Required untracked files, individually identified\n\n${untracked || "None."}\n\n${sections}\n`;
}

function renderApprovalPacket(plan) {
  const excluded = plan.records.filter(record => !record.required)
    .map(record => `- \`${record.path}\` — ${record.reason}`).join("\n");
  return `# Repository-owner approval packet\n\n` +
    `This packet does not instruct or authorize deployment.\n\n` +
    `- Release Candidate: \`${plan.rcId}\`\n` +
    `- Payload SHA-256: \`${plan.packageSha256}\`\n` +
    `- Required untracked files: **${plan.requiredUntracked}**\n` +
    `- Dirty tree: **yes; not reproducible from Git alone**\n\n` +
    `## Included runtime\n\nFrontend runtime is listed file-by-file in \`docs/release/release-candidate-inventory.md\`. ` +
    `The Apps Script application runtime is exactly:\n\n1. \`scripts/app-script-final-owner-access.js\`\n` +
    `2. \`scripts/booking-availability-phase5-apps-script-bundle.gs\`\n\n` +
    `Migration sources are isolated under the migration subpackage and were not executed. Sequence: ` +
    `Identity/bootstrap → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5.\n\n` +
    `## Intentionally excluded\n\n${excluded}\n\n` +
    `## Risks and prerequisites\n\n` +
    `- Required files remain untracked and may be omitted without an approved source-control/release workflow.\n` +
    `- Identity/bootstrap execution remains in the router and must not be invoked without separate authorization.\n` +
    `- Booking rating execution exists only in the separate migration package.\n` +
    `- Staging Spreadsheet/project, backup, identities, row counts, test accounts, monitoring, and rollback ownership do not yet exist as verified evidence.\n` +
    `- Browser API endpoint and all security-sensitive Script Properties require authorized manual entry; no real values are stored in this candidate.\n` +
    `- Detector Staging/Production execution and trigger installation remain disabled/not approved.\n\n` +
    `## Decisions requested before the next phase\n\n` +
    `Approve or reject only the following preparatory actions:\n\n` +
    `1. Include the manifest-listed files in the controlled source-control/release workflow.\n` +
    `2. Provision an isolated Staging Spreadsheet and Apps Script project.\n` +
    `3. Prepare and verify a recoverable Staging backup/snapshot.\n` +
    `4. Enter the placeholder-defined Staging configuration through an authorized operator.\n` +
    `5. Run zero-write migration previews and retain their evidence.\n` +
    `6. Begin controlled Staging tests after the checklist gates pass.\n\n` +
    `No approval to deploy, execute a migration, install a trigger, enable Production, or modify real data is requested.\n`;
}

function createPlan() {
  const entries = releaseManifest.buildEntries();
  const records = entries.map(fileRecord);
  const git = readGitInfo();
  const payload = payloadRecords(records);
  const tests = records.filter(record => record.required && record.role === "test evidence")
    .map(record => ({ path: record.path, sha256: record.sha256, size: record.size }));
  const testsManifestContent = `${JSON.stringify({
    label: "LOCAL RELEASE CANDIDATE — NOT APPROVED FOR DEPLOYMENT", tests
  }, null, 2)}\n`;
  const testsManifestRecord = {
    path: "<generated-tests-manifest>",
    destination: "tests-manifest/TESTS-MANIFEST.json",
    sha256: sha256(Buffer.from(testsManifestContent, "utf8")),
    size: Buffer.byteLength(testsManifestContent, "utf8"),
    role: "test evidence manifest"
  };
  const packageHashRecords = payload.concat([testsManifestRecord]);
  const packageSha256 = canonicalPackageHash(packageHashRecords);
  const rcId = `CUT-HUB-POS-RC-${git.head.slice(0, 7)}-${packageSha256.slice(0, 12)}`;
  const allStates = releaseManifest.gitStates().states;
  return {
    records, payload, testsManifestContent, testsManifestRecord,
    packageHashRecords, git, packageSha256, rcId,
    requiredTracked: records.filter(record => record.required && record.state.startsWith("tracked")).length,
    requiredUntracked: records.filter(record => record.required && record.state === "untracked").length,
    trackedModified: [...allStates.values()].filter(state => state === "tracked modified").length,
    excludedCount: records.filter(record => !record.required).length
  };
}

function listFiles(directory) {
  const output = [];
  function walk(current) {
    for (const item of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, item.name);
      if (item.isDirectory()) walk(absolute);
      else output.push(path.relative(directory, absolute).replace(/\\/g, "/"));
    }
  }
  walk(directory);
  return output.sort();
}

function secretFindings(directory) {
  const findings = [];
  const binaryExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".ico", ".pdf"]);
  const patterns = [
    ["WINDOWS_ABSOLUTE_PATH", /(?:^|[\s"'`(])([A-Za-z]:[\\/][^\s"'`)]+)/m],
    ["PRIVATE_EMAIL", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
    ["PRIVATE_KEY", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
    ["BEARER_TOKEN", /\bBearer\s+[A-Za-z0-9._~+\/-]{12,}/i],
    ["SPREADSHEET_URL_ID", /docs\.google\.com\/spreadsheets\/d\/[A-Za-z0-9_-]+/i],
    ["APPS_SCRIPT_DEPLOYMENT_URL", /script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/i],
    ["HARDCODED_CREDENTIAL", /\b(?:password|secret|api[_-]?key|access[_-]?token)\s*[:=]\s*["'][^"'<]{6,}["']/i]
  ];
  for (const relative of listFiles(directory)) {
    const lower = relative.toLowerCase();
    if (/(^|\/)(?:\.env(?:\.|$)|.*backup.*|.*\.bak$)/.test(lower)) {
      findings.push({ file: relative, category: "FORBIDDEN_FILE_TYPE" });
    }
    if (binaryExtensions.has(path.extname(lower))) continue;
    const text = fs.readFileSync(path.join(directory, relative), "utf8");
    for (const [category, expression] of patterns) {
      if (expression.test(text)) findings.push({ file: relative, category });
    }
  }
  return findings;
}

function validateCandidate(directory, plan) {
  const errors = [];
  const actualHashRecords = [];
  for (const expectedRecord of plan.packageHashRecords) {
    const absolute = path.join(directory, ...expectedRecord.destination.split("/"));
    if (!fs.existsSync(absolute)) {
      errors.push({ code: "RC_PAYLOAD_FILE_MISSING", file: expectedRecord.destination });
      continue;
    }
    const content = fs.readFileSync(absolute);
    const actualRecord = {
      destination: expectedRecord.destination,
      sha256: sha256(content), size: content.length
    };
    actualHashRecords.push(actualRecord);
    if (actualRecord.sha256 !== expectedRecord.sha256 || actualRecord.size !== expectedRecord.size) {
      errors.push({ code: "RC_PAYLOAD_HASH_MISMATCH", file: expectedRecord.destination });
    }
  }
  if (actualHashRecords.length === plan.packageHashRecords.length &&
      canonicalPackageHash(actualHashRecords) !== plan.packageSha256) {
    errors.push({ code: "RC_PACKAGE_HASH_MISMATCH" });
  }
  const appsDir = path.join(directory, "apps-script-application");
  const appFiles = listFiles(appsDir);
  const expected = APPS_RUNTIME.map(item => path.posix.basename(item)).sort();
  if (JSON.stringify(appFiles) !== JSON.stringify(expected)) {
    errors.push({ code: "RC_APPS_RUNTIME_CONTENT_INVALID", files: appFiles });
  }
  const deployment = deploymentValidator.validatePackage();
  if (!deployment.valid) errors.push(...deployment.errors);
  const lowerPaths = new Map();
  for (const record of plan.records) {
    const key = record.path.toLowerCase();
    if (lowerPaths.has(key) && lowerPaths.get(key) !== record.path) {
      errors.push({ code: "RC_CASE_COLLISION", files: [lowerPaths.get(key), record.path] });
    }
    lowerPaths.set(key, record.path);
  }
  const findings = secretFindings(directory);
  errors.push(...findings.map(item => ({ code: "RC_SECRET_OR_PATH_FINDING", ...item })));
  const bundle = fs.readFileSync(path.join(appsDir,
    "booking-availability-phase5-apps-script-bundle.gs"), "utf8");
  if (!/\["development",\s*"test"\]\.indexOf\(identity\.config\.environment\)/.test(bundle)) {
    errors.push({ code: "RC_DETECTOR_PRODUCTION_GATE_MISSING" });
  }
  if (/ScriptApp\s*\.\s*(?:newTrigger|getProjectTriggers|deleteTrigger)/.test(bundle)) {
    errors.push({ code: "RC_TRIGGER_INSTALLATION_API_PRESENT" });
  }
  return { valid: errors.length === 0, errors, secretFindings: findings, appFiles };
}

function writeFileEnsuringDirectory(absolute, content) {
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content);
}

function buildReleaseCandidate(options = {}) {
  const plan = createPlan();
  const inventory = renderInventory(plan);
  const approval = renderApprovalPacket(plan);
  if (options.writeRepositoryDocuments !== false) {
    writeFileEnsuringDirectory(path.join(ROOT, INVENTORY_PATH), inventory);
    writeFileEnsuringDirectory(path.join(ROOT, APPROVAL_PATH), approval);
  }
  if (options.writePackage === false) return { plan, inventory, approval, directory: null };

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), `${plan.rcId}-`));
  for (const folder of [
    "frontend", "apps-script-application", "migrations", "tests-manifest",
    "documentation", "operations"
  ]) fs.mkdirSync(path.join(directory, folder), { recursive: true });
  for (const record of plan.payload) {
    const destination = path.join(directory, ...record.destination.split("/"));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(ROOT, record.path), destination);
  }
  writeFileEnsuringDirectory(path.join(directory, "tests-manifest/TESTS-MANIFEST.json"),
    plan.testsManifestContent);
  writeFileEnsuringDirectory(path.join(directory, "operations/release-candidate-inventory.md"), inventory);
  writeFileEnsuringDirectory(path.join(directory, "operations/human-approval-packet.md"), approval);
  const buildTimestamp = new Date().toISOString();
  const packageManifest = {
    label: "LOCAL RELEASE CANDIDATE — NOT APPROVED FOR DEPLOYMENT",
    releaseCandidateId: plan.rcId,
    packageSha256: plan.packageSha256,
    hashScope: "Deterministic deployment payload files; generated RC metadata is excluded.",
    buildTimestamp,
    gitBranch: plan.git.branch,
    headCommit: plan.git.head,
    dirtyTree: true,
    reproducibleFromGitAlone: false,
    trackedModifiedCount: plan.trackedModified,
    requiredTrackedCount: plan.requiredTracked,
    requiredUntrackedCount: plan.requiredUntracked,
    excludedEntryCount: plan.excludedCount,
    appsScriptRuntime: APPS_RUNTIME,
    payloadFiles: plan.packageHashRecords.map(record => ({
      source: record.path, destination: record.destination,
      sha256: record.sha256, size: record.size, role: record.role
    })).sort((left, right) => left.destination.localeCompare(right.destination))
  };
  writeFileEnsuringDirectory(path.join(directory, "PACKAGE-MANIFEST.json"),
    `${JSON.stringify(packageManifest, null, 2)}\n`);
  const validation = validateCandidate(directory, plan);
  if (!validation.valid) {
    const safe = validation.errors.map(error => ({ code: error.code, file: error.file || "" }));
    const failure = new Error(`Local Release Candidate validation failed: ${JSON.stringify(safe)}`);
    failure.code = "RC_VALIDATION_FAILED";
    throw failure;
  }
  return { plan, inventory, approval, directory, packageManifest, validation };
}

if (require.main === module) {
  const result = buildReleaseCandidate();
  console.log(JSON.stringify({
    releaseCandidateId: result.plan.rcId,
    directory: result.directory,
    packageSha256: result.plan.packageSha256,
    requiredTracked: result.plan.requiredTracked,
    requiredUntracked: result.plan.requiredUntracked,
    excluded: result.plan.excludedCount,
    validation: "PASS"
  }, null, 2));
}

module.exports = {
  APPS_RUNTIME, INVENTORY_PATH, APPROVAL_PATH, sha256, releaseRole,
  deploymentDestination, canonicalPackageHash, createPlan, renderInventory,
  renderApprovalPacket, secretFindings, validateCandidate, buildReleaseCandidate
};
