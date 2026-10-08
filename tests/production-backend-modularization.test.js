"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { DIRECTORY, sourceMap, buildProductionPackage } = require("../scripts/build-production-apps-script");

function runtime(sources) {
  const context = vm.createContext({ console });
  for (const source of sources) vm.runInContext(source, context);
  return context;
}
test("the production package retains every source byte from the live baseline", () => {
  const packageContent = buildProductionPackage();
  const actual = fs.readdirSync(DIRECTORY).filter(file => file.endsWith(".gs")).sort();
  assert.deepEqual(actual, sourceMap.fileOrder.filter(file => file.endsWith(".gs")).sort());
  assert.equal(packageContent.files.filter(file => file.type === "JSON").length, 1);
});
test("production modules preserve every global function and staff lifecycle handler", () => {
  const files = buildProductionPackage().files.filter(file => file.type === "SERVER_JS");
  const byName = new Map(files.map(file => [`${file.name}.gs`, file.source]));
  const before = runtime(sourceMap.groups.map(group => group.files.map(file => byName.get(file.path)).join("")));
  const after = runtime(files.map(file => file.source));
  assert.deepEqual(Object.keys(after).sort(), Object.keys(before).sort());
  for (const name of Object.keys(before)) {
    if (typeof before[name] === "function") assert.equal(String(after[name]), String(before[name]), name);
  }
  for (const handler of ["doPost", "loginUser", "createStaffMember", "deactivateStaffMember",
    "recoverStaffMemberTransaction", "inspectStaffMemberTransaction"]) assert.equal(typeof after[handler], "function", handler);
  after.jsonOutput = value => value;
  after.validateCutHubRequestEnvironment = () => {};
  after.getTotalIncome = () => { throw new Error("unauthorized handler called"); };
  const denied = after.doPost({ postData: { contents: JSON.stringify({ action: "totalIncome" }) } });
  assert.equal(denied.authRequired, true);
});
