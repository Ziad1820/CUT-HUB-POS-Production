function auth01GenerateSalt(options) {
  if (options && typeof options.randomBytes === "function") {
    const injected = Array.prototype.slice.call(options.randomBytes(16) || []);
    if (injected.length !== 16) throw auth01Error("AUTH01_SALT_GENERATION_FAILED", "Injected salt must be 16 bytes.");
    return injected.map(value => Number(value) & 0xff);
  }
  const material = `${Utilities.getUuid()}|${Utilities.getUuid()}`;
  return auth01Sha256Bytes(auth01Utf8Bytes(material)).slice(0, 16);
}

function auth01EncodeModernCredential(iterations, salt, verifier) {
  return `cuthub$1$pbkdf2-sha256$i=${iterations},l=32$${auth01Base64UrlEncode(salt)}$${auth01Base64UrlEncode(verifier)}`;
}

function auth01ParseModernCredential(value, options) {
  const text = String(value || "");
  if (text.length > 256) return null;
  const parts = text.split("$");
  if (parts.length !== 6 || parts[0] !== "cuthub" || parts[1] !== "1" || parts[2] !== "pbkdf2-sha256") return null;
  const parameterMatch = /^i=([1-9][0-9]*),l=32$/.exec(parts[3]);
  if (!parameterMatch) return null;
  const iterations = Number(parameterMatch[1]);
  const policy = auth01CredentialPolicy(options);
  if (!Number.isSafeInteger(iterations) || iterations > policy.maximumIterations ||
      policy.allowedIterations.indexOf(iterations) === -1) return null;
  const salt = auth01Base64UrlDecodeCanonical(parts[4]);
  const verifier = auth01Base64UrlDecodeCanonical(parts[5]);
  if (!salt || salt.length !== 16 || !verifier || verifier.length !== 32) return null;
  const canonical = auth01EncodeModernCredential(iterations, salt, verifier);
  if (canonical !== text) return null;
  return { version: 1, algorithm: "pbkdf2-sha256", iterations, length: 32, salt, verifier, encoded: text };
}

function createModernCredential(password, options) {
  const policy = auth01CredentialPolicy(options);
  if (policy.allowedIterations.indexOf(policy.iterations) === -1 || policy.iterations > policy.maximumIterations) {
    throw auth01Error("AUTH01_KDF_POLICY_INVALID", "The credential policy is invalid.");
  }
  const salt = auth01GenerateSalt(options);
  const passwordBytes = auth01Utf8Bytes(auth01NormalizeModernPassword(password));
  const verifier = auth01Pbkdf2HmacSha256(passwordBytes, salt, policy.iterations, 32);
  return auth01EncodeModernCredential(policy.iterations, salt, verifier);
}

function auth01ClassifyCredential(user, options) {
  const password = String(user && user.password != null ? user.password : "");
  const passwordHash = String(user && user.passwordHash != null ? user.passwordHash : "").trim();
  const plaintextResidue = !!password && !!passwordHash;
  const modern = passwordHash ? auth01ParseModernCredential(passwordHash, options) : null;
  let state = AUTH01_CREDENTIAL_STATES.EMPTY;
  if (modern) state = AUTH01_CREDENTIAL_STATES.MODERN_V1;
  else if (/^[a-f0-9]{64}$/.test(passwordHash)) state = AUTH01_CREDENTIAL_STATES.LEGACY_SHA256;
  else if (passwordHash) state = AUTH01_CREDENTIAL_STATES.INVALID;
  else if (password) state = AUTH01_CREDENTIAL_STATES.LEGACY_PLAINTEXT;
  return { state, plaintextResidue, modern, passwordHashPresent: !!passwordHash, passwordPresent: !!password };
}

function hashPassword(password) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(password || ""),
    Utilities.Charset.UTF_8
  );
  return auth01BytesToHex(digest);
}

function auth01VerifyCredential(user, password, options) {
  const classification = auth01ClassifyCredential(user, options);
  const plainPassword = String(password || "");
  if (classification.state === AUTH01_CREDENTIAL_STATES.MODERN_V1) {
    const parsed = classification.modern;
    const candidate = auth01Pbkdf2HmacSha256(
      auth01Utf8Bytes(auth01NormalizeModernPassword(password)), parsed.salt,
      parsed.iterations, parsed.length
    );
    return { ok: auth01ConstantTimeEqual(candidate, parsed.verifier), state: classification.state, classification };
  }
  if (classification.state === AUTH01_CREDENTIAL_STATES.LEGACY_SHA256) {
    const stored = auth01HexToBytes(String(user.passwordHash || "").trim());
    const candidate = auth01HexToBytes(hashPassword(plainPassword));
    return {
      ok: !!stored && !!candidate && auth01ConstantTimeEqual(stored, candidate),
      state: classification.state,
      classification,
      migrationEligible: true
    };
  }
  if (classification.state === AUTH01_CREDENTIAL_STATES.LEGACY_PLAINTEXT) {
    const allowed = !!(options && options.allowLegacyPlaintext);
    const storedDigest = auth01Sha256Bytes(auth01Utf8Bytes(String(user.password || "")));
    const candidateDigest = auth01Sha256Bytes(auth01Utf8Bytes(plainPassword));
    return {
      ok: allowed && auth01ConstantTimeEqual(storedDigest, candidateDigest),
      state: classification.state,
      classification,
      migrationEligible: allowed
    };
  }
  return { ok: false, state: classification.state, classification, migrationEligible: false };
}

function auth01RunDummyModernVerification(password, options) {
  const parsed = auth01ParseModernCredential(auth01DummyModernCredential(options), options);
  const candidate = auth01Pbkdf2HmacSha256(
    auth01Utf8Bytes(auth01NormalizeModernPassword(password)), parsed.salt,
    parsed.iterations, parsed.length
  );
  auth01ConstantTimeEqual(candidate, parsed.verifier);
}

function verifyPassword(user, password) {
  return auth01VerifyCredential(user, password, {
    allowLegacyPlaintext: AUTH01_PLAINTEXT_COMPATIBILITY_DEFAULT
  }).ok;
}

