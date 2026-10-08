// AUTH-01 cryptographic primitives implement RFC 8018 PBKDF2 using the
// SHA-256/HMAC construction specified by FIPS 180-4 and RFC 2104. The code is
// deliberately self-contained for the Apps Script V8 runtime and is verified
// by published PBKDF2-HMAC-SHA-256 known-answer vectors in the AUTH-01 suite.
const AUTH01_CREDENTIAL_POLICY = Object.freeze({
  formatVersion: 1,
  algorithm: "pbkdf2-sha256",
  iterations: 600000,
  allowedIterations: Object.freeze([600000]),
  maximumIterations: 1200000,
  saltBytes: 16,
  derivedKeyBytes: 32
});
const AUTH01_IDENTIFIER_KEY_PROPERTY = "AUTH01:IDKEY:v1";
const AUTH01_IDENTIFIER_FINGERPRINT_PROPERTY = "AUTH01:IDKEYFP:v1";
const AUTH01_IDENTIFIER_ACTIVE_VERSION_PROPERTY = "AUTH01:IDKEYACTIVE:v1";
const AUTH01_IDENTIFIER_KEY_CONTRACTS = Object.freeze({
  v1: Object.freeze({
    keyProperty: AUTH01_IDENTIFIER_KEY_PROPERTY,
    fingerprintProperty: AUTH01_IDENTIFIER_FINGERPRINT_PROPERTY
  }),
  v2: Object.freeze({
    keyProperty: "AUTH01:IDKEY:v2",
    fingerprintProperty: "AUTH01:IDKEYFP:v2"
  })
});
const AUTH01_EPOCH_PREFIX = "AUTH01:EPOCH:v1:";
const AUTH01_MIGRATION_PREFIX = "AUTH01:MIG:v1:";
const AUTH01_MIGRATION_JOURNAL_POLICY = Object.freeze({
  attentionAfterMs: 24 * 60 * 60 * 1000,
  terminalRetentionMs: 7 * 24 * 60 * 60 * 1000,
  earliestValidTimestampMs: Date.UTC(2000, 0, 1),
  maximumInventoryScan: 200,
  inventoryPageSize: 100,
  maximumCleanupBatch: 25,
  maximumTotalJournals: 180,
  maximumUnresolvedJournals: 40,
  maximumRecoveryRequiredJournals: 20,
  maximumSerializedBytes: 2048
});
const AUTH01_MODERN_PREFIX = "cuthub$";
const AUTH01_CREDENTIAL_STATES = Object.freeze({
  MODERN_V1: "MODERN_V1",
  LEGACY_SHA256: "LEGACY_SHA256",
  LEGACY_PLAINTEXT: "LEGACY_PLAINTEXT",
  INVALID: "INVALID",
  EMPTY: "EMPTY"
});
const AUTH01_PLAINTEXT_COMPATIBILITY_DEFAULT = false;
const AUTH01_SHA256_K = Object.freeze([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);

function auth01Error(code, message, details) {
  const error = new Error(message || code);
  error.code = code;
  if (details) error.details = details;
  return error;
}

function auth01CredentialPolicy(options) {
  const override = options && options.testPolicy;
  if (!override) return AUTH01_CREDENTIAL_POLICY;
  return {
    formatVersion: 1,
    algorithm: "pbkdf2-sha256",
    iterations: Number(override.iterations),
    allowedIterations: (override.allowedIterations || [Number(override.iterations)]).slice(),
    maximumIterations: Number(override.maximumIterations || override.iterations),
    saltBytes: 16,
    derivedKeyBytes: 32
  };
}

function auth01NormalizeModernPassword(password) {
  const value = String(password == null ? "" : password);
  return typeof value.normalize === "function" ? value.normalize("NFC") : value;
}

