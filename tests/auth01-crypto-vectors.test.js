"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(
  __dirname, "../scripts/app-script-final-owner-access.js"
), "utf8");

function productionCrypto() {
  const context = {
    Date, JSON, Math, Number, Object, String, Boolean, Array, Set, Map, Error,
    console: { log() {}, warn() {}, error() {} },
    Utilities: {
      DigestAlgorithm: { SHA_256: "SHA_256" }, Charset: { UTF_8: "UTF_8" },
      computeDigest(_algorithm, input) {
        return Array.from(crypto.createHash("sha256").update(String(input), "utf8").digest(),
          value => value > 127 ? value - 256 : value);
      },
      base64EncodeWebSafe(input) { return Buffer.from(Array.from(input, value => value & 255)).toString("base64url"); },
      base64DecodeWebSafe(input) { return Array.from(Buffer.from(String(input), "base64url"), value => value > 127 ? value - 256 : value); },
      getUuid: () => "00000000-0000-4000-8000-000000000001"
    }
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "app-script-final-owner-access.js" });
  return context;
}

test("SHA-256 production primitive matches FIPS vectors", () => {
  const c = productionCrypto();
  for (const [message, expected] of [
    ["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
    ["abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"]
  ]) assert.equal(c.auth01BytesToHex(c.auth01Sha256Bytes(c.auth01Utf8Bytes(message))), expected);
});

test("HMAC-SHA-256 production primitive matches RFC 4231 short and long cases", () => {
  const c = productionCrypto();
  const cases = [
    [Buffer.alloc(20, 0x0b), Buffer.from("Hi There"), "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7"],
    [Buffer.from("Jefe"), Buffer.from("what do ya want for nothing?"), "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843"],
    [Buffer.alloc(131, 0xaa), Buffer.from("This is a test using a larger than block-size key and a larger than block-size data. The key needs to be hashed before being used by the HMAC algorithm."),
      "9b09ffa71b942fcb27635fbcd5b0e944bfdc63644f0713938a7f51535c3a35e2"]
  ];
  cases.forEach(([key, message, expected]) => assert.equal(
    c.auth01BytesToHex(c.auth01HmacSha256Bytes([...key], [...message])), expected
  ));
});

test("PBKDF2 production primitive matches 1, 2, and 4096 published vectors", () => {
  const c = productionCrypto();
  for (const [iterations, expected] of [
    [1, "120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b"],
    [2, "ae4d0c95af6b46d32d0adff928f06dd02a303f8ef3c251dfd6e2d85a95474c43"],
    [4096, "c5e478d59288c841aa530db6845c4c8d962893a001ce4e11a4963873aa98134a"]
  ]) assert.equal(c.auth01BytesToHex(c.auth01Pbkdf2HmacSha256(
    c.auth01Utf8Bytes("password"), c.auth01Utf8Bytes("salt"), iterations, 32
  )), expected);
});

test("PBKDF2 production primitive matches the 600000-iteration runtime policy vector", () => {
  const c = productionCrypto();
  const actual = c.auth01BytesToHex(c.auth01Pbkdf2HmacSha256(
    c.auth01Utf8Bytes("password"), c.auth01Utf8Bytes("salt"), 600000, 32
  ));
  assert.equal(actual, "669cfe52482116fda1aa2cbe409b2f56c8e4563752b7a28f6eaab614ee005178");
});

test("PBKDF2 long Unicode multi-block output matches hard-coded and Node-independent calculation", () => {
  const c = productionCrypto();
  const password = "Cafe\u0301-كلمة".normalize("NFC");
  const salt = "ملح-طويل";
  const actual = c.auth01Pbkdf2HmacSha256(c.auth01Utf8Bytes(password), c.auth01Utf8Bytes(salt), 4096, 48);
  const expected = "318289abcb69a3726b9d8d0bdd522e0b9907af38b56571a563d18aa1cffb76ecac9f34c63703000beaab3755e355ddc5";
  assert.equal(c.auth01BytesToHex(actual), expected);
  assert.equal(Buffer.from(actual).toString("hex"), crypto.pbkdf2Sync(password, salt, 4096, 48, "sha256").toString("hex"));
});
