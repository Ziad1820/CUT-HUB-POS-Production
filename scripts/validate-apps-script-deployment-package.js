"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { SOURCE_ORDER, OUTPUT_NAME, buildBundle } =
  require("./build-booking-availability-phase5-bundle");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_CONFIG = path.join(ROOT, "config/apps-script-deployment-package.json");

function topLevelDeclarations(source) {
  const declarations = [];
  const patterns = [
    { kind: "function", expression: /^function\s+([A-Za-z_$][\w$]*)\s*\(/gm },
    { kind: "global", expression: /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\b/gm }
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.expression.exec(source))) {
      declarations.push({ name: match[1], kind: pattern.kind });
    }
  }
  return declarations;
}

function validateSources(files, packageDefinition = {}) {
  const errors = [];
  const names = new Map();
  const routerOwners = [];
  for (const file of files) {
    for (const declaration of topLevelDeclarations(file.source)) {
      const prior = names.get(declaration.name);
      if (prior) {
        errors.push({
          code: declaration.kind === "global" || prior.kind === "global"
            ? "DEPLOYMENT_GLOBAL_CONFLICT" : "DEPLOYMENT_FUNCTION_DUPLICATE",
          name: declaration.name, files: [prior.file, file.path]
        });
      } else names.set(declaration.name, { ...declaration, file: file.path });
      if (["doPost", "doGet"].includes(declaration.name)) {
        routerOwners.push({ name: declaration.name, file: file.path });
      }
    }
  }
  const router = packageDefinition.router;
  for (const owner of routerOwners) {
    if (router && owner.file !== router) {
      errors.push({ code: "DEPLOYMENT_ROUTER_CONFLICT", name: owner.name, file: owner.file });
    }
  }
  if (router && !routerOwners.some(owner => owner.name === "doPost" && owner.file === router)) {
    errors.push({ code: "DEPLOYMENT_ROUTER_MISSING", file: router });
  }
  return errors;
}

function validatePackage(configPath = DEFAULT_CONFIG) {
  const definition = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const packagePaths = definition.filesInReviewOrder || [];
  const errors = [];
  const aggregate = definition.aggregateBundle;
  const overlaps = new Set(definition.excludedOverlappingSources || []);
  if (packagePaths.includes(aggregate)) {
    for (const item of packagePaths) {
      if (overlaps.has(item)) {
        errors.push({ code: "DEPLOYMENT_AGGREGATE_SOURCE_OVERLAP", file: item });
      }
    }
  }
  const files = packagePaths.map(relativePath => {
    const absolutePath = path.join(ROOT, relativePath);
    if (!fs.existsSync(absolutePath)) {
      errors.push({ code: "DEPLOYMENT_FILE_MISSING", file: relativePath });
      return { path: relativePath, source: "" };
    }
    return { path: relativePath, source: fs.readFileSync(absolutePath, "utf8") };
  });
  errors.push(...validateSources(files, definition));
  if (aggregate && packagePaths.includes(aggregate)) {
    const stored = fs.readFileSync(path.join(ROOT, aggregate), "utf8");
    const generated = buildBundle({ write: false }).bundle;
    if (stored !== generated) errors.push({ code: "DEPLOYMENT_AGGREGATE_STALE", file: aggregate });
    if (path.basename(aggregate) !== OUTPUT_NAME) {
      errors.push({ code: "DEPLOYMENT_AGGREGATE_NAME_INVALID", file: aggregate });
    }
    const markers = SOURCE_ORDER.map(name => `/* BEGIN ${name} */`);
    let previous = -1;
    for (const marker of markers) {
      const index = stored.indexOf(marker);
      if (index < 0 || index <= previous) {
        errors.push({ code: "DEPLOYMENT_SOURCE_ORDER_INVALID", marker });
      }
      previous = index;
    }
  }
  return { valid: errors.length === 0, errors, definition, files };
}

if (require.main === module) {
  const result = validatePackage(process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_CONFIG);
  if (!result.valid) {
    console.error(JSON.stringify(result.errors, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`Deployment package valid: ${result.files.map(file => file.path).join(", ")}`);
  }
}

module.exports = { topLevelDeclarations, validateSources, validatePackage };
