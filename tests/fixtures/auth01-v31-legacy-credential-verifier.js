"use strict";

// Minimal synthetic model of the immutable v31 credential-verification
// contract. The regression only needs to prove that a modern AUTH-01 record
// is not accepted by the legacy SHA-256/plaintext verifier.
function hashPassword(password) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(password || ""),
    Utilities.Charset.UTF_8
  );

  return digest
    .map(byte => {
      const value = byte < 0 ? byte + 256 : byte;
      return (`0${value.toString(16)}`).slice(-2);
    })
    .join("");
}

function verifyPassword(user, password) {
  const plainPassword = String(password || "");
  const storedHash = String(user.passwordHash || "").trim();
  if (storedHash && storedHash === hashPassword(plainPassword)) return true;

  return String(user.password || "") === plainPassword;
}
