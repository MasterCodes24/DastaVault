const crypto = require("crypto");

const ALGO = "aes-256-gcm";
const KEY = crypto.createHash("sha256").update(String(process.env.AES_SECRET || "dastavault_dev_secret_key")).digest();

// SHA-256 hash of a raw buffer -> hex string
const sha256Hash = (buffer) => {
  return crypto.createHash("sha256").update(buffer).digest("hex");
};

// AES-256-GCM encrypt: returns { encrypted, iv, authTag } all hex-encoded
const encryptBuffer = (buffer) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
};

// AES-256-GCM decrypt: takes encrypted buffer + hex iv/authTag -> original buffer
const decryptBuffer = (encryptedBuffer, ivHex, authTagHex) => {
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
};

module.exports = { sha256Hash, encryptBuffer, decryptBuffer };
