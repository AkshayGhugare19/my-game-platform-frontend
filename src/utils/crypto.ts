/**
 * AES-256-GCM password obfuscation in transit. Output format matches
 * gamify-engage-backend/src/utils/passwordCrypto.ts:
 *   enc:v1:<base64( iv(12) || ciphertext || tag(16) )>
 * Key = SHA-256(VITE_PASSWORD_SECRET) — must match backend PASSWORD_SECRET.
 */
const SECRET =
  import.meta.env.VITE_PASSWORD_SECRET ||
  "gamify-engage-shared-password-secret";
const ENC_PREFIX = "enc:v1:";

const getKey = async (): Promise<CryptoKey> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(SECRET)
  );
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt"]);
};

export const encryptPassword = async (plain: string): Promise<string> => {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(plain)
    )
  );
  const packed = new Uint8Array(iv.length + ciphertext.length);
  packed.set(iv, 0);
  packed.set(ciphertext, iv.length);
  let binary = "";
  packed.forEach((b) => (binary += String.fromCharCode(b)));
  return ENC_PREFIX + btoa(binary);
};
