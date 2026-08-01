const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const manifest = require("../scripts/generate-release-manifest");
const deployment = require("../config/apps-script-deployment-package.json");

const root = path.resolve(__dirname, "..");

test("release manifest is deterministic and matches the generated repository document", () => {
  const first = manifest.generate({ write: false });
  const second = manifest.generate({ write: false });
  assert.equal(first.document, second.document);
  assert.equal(fs.readFileSync(path.join(root, manifest.OUTPUT), "utf8"), first.document);
});

test("every entry uses an allowed classification and required generated files name authority", () => {
  const entries = manifest.buildEntries();
  const allowed = new Set(manifest.ALLOWED_CLASSIFICATIONS);
  for (const entry of entries) {
    assert.ok(allowed.has(entry.classification), `${entry.path}: ${entry.classification}`);
    assert.match(entry.state, /^(tracked modified|tracked unchanged|untracked|deleted|renamed)$/);
    if (entry.required && entry.generated) assert.notEqual(entry.authority, "—", entry.path);
  }
});

test("all required untracked files are explicitly listed in the document", () => {
  const generated = manifest.generate({ write: false });
  const requiredUntracked = generated.entries.filter(entry =>
    entry.required && entry.state === "untracked");
  assert.ok(requiredUntracked.length > 0);
  for (const entry of requiredUntracked) {
    assert.match(generated.document, new RegExp(`- \\\`${entry.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\\``));
  }
});

test("deployment allowlist and every overlap exclusion are represented", () => {
  const byPath = new Map(manifest.buildEntries().map(entry => [entry.path, entry]));
  for (const file of deployment.filesInReviewOrder) {
    assert.equal(byPath.get(file).required, true, file);
  }
  for (const file of deployment.excludedOverlappingSources) {
    assert.ok(byPath.has(file), file);
    assert.match(byPath.get(file).order, /exclude direct upload|Never upload/);
  }
});

test("no classified required file is missing from the local repository", () => {
  for (const entry of manifest.buildEntries().filter(item => item.required)) {
    assert.ok(fs.existsSync(path.join(root, entry.path)), entry.path);
  }
});

test("runtime, test, migration, and runbook roles cannot cross classification boundaries", () => {
  const entries = manifest.buildEntries();
  for (const entry of entries) {
    if (entry.required && entry.path.startsWith("public/")) {
      assert.ok(["UI page", "UI JavaScript", "UI stylesheet", "authoritative source"]
        .includes(entry.classification), entry.path);
    }
    if (entry.path.startsWith("tests/")) assert.equal(entry.classification, "test", entry.path);
    if (entry.classification === "test") assert.match(entry.path, /^tests\//, entry.path);
    if (["migration source", "migration preview"].includes(entry.classification)) {
      assert.match(entry.path, /^scripts\//, entry.path);
    }
    if (entry.classification === "operational runbook") {
      assert.doesNotMatch(entry.path, /^public\//, entry.path);
    }
  }
});
