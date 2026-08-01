const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const builder = require("../scripts/build-local-release-candidate");

const root = path.resolve(__dirname, "..");

test("release inventory and payload hash are deterministic", () => {
  const first = builder.buildReleaseCandidate({
    writeRepositoryDocuments: false, writePackage: false
  });
  const second = builder.buildReleaseCandidate({
    writeRepositoryDocuments: false, writePackage: false
  });
  assert.equal(first.plan.packageSha256, second.plan.packageSha256);
  assert.equal(first.plan.rcId, second.plan.rcId);
  assert.equal(first.inventory, second.inventory);
  assert.equal(first.approval, second.approval);
});

test("every required file has a normalized path, SHA-256, size, role, and destination", () => {
  const { plan } = builder.buildReleaseCandidate({
    writeRepositoryDocuments: false, writePackage: false
  });
  const lower = new Set();
  for (const record of plan.records.filter(item => item.required)) {
    assert.doesNotMatch(record.path, /\\/);
    if ([builder.INVENTORY_PATH, builder.APPROVAL_PATH].includes(record.path)) {
      assert.equal(record.sha256, "—", "Self-referential RC evidence is outside its own hash");
    } else {
      assert.match(record.sha256, /^[a-f0-9]{64}$/);
    }
    assert.ok(record.size >= 0);
    assert.ok(record.role);
    assert.ok(record.destination);
    assert.equal(lower.has(record.path.toLowerCase()), false, record.path);
    lower.add(record.path.toLowerCase());
  }
});

test("generated repository inventory and approval packet match authoritative output", () => {
  const generated = builder.buildReleaseCandidate({
    writeRepositoryDocuments: false, writePackage: false
  });
  assert.equal(fs.readFileSync(path.join(root, builder.INVENTORY_PATH), "utf8"),
    generated.inventory);
  assert.equal(fs.readFileSync(path.join(root, builder.APPROVAL_PATH), "utf8"),
    generated.approval);
});

test("local package has exact Apps Script runtime and passes secret/path validation", () => {
  const result = builder.buildReleaseCandidate({
    writeRepositoryDocuments: false, writePackage: true
  });
  assert.deepEqual(result.validation.appFiles, [
    "app-script-final-owner-access.js",
    "booking-availability-phase5-apps-script-bundle.gs"
  ]);
  assert.equal(result.validation.valid, true, JSON.stringify(result.validation.errors));
  assert.deepEqual(result.validation.secretFindings, []);
  assert.equal(result.packageManifest.reproducibleFromGitAlone, false);
  assert.equal(result.packageManifest.dirtyTree, true);
});

test("frontend endpoint is configuration-only and fails closed when absent", () => {
  const api = fs.readFileSync(path.join(root, "public/assets/js/core/api.js"), "utf8");
  const auth = fs.readFileSync(path.join(root, "public/assets/js/core/auth.js"), "utf8");
  assert.match(api, /window\.ROMEO_API_URL/);
  assert.match(api, /if \(!API_URL\)/);
  assert.doesNotMatch(`${api}\n${auth}`, /script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/);
});
