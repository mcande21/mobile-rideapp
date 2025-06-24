// Utility for encrypting/decrypting the Woodstock address
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.WOODSTOCK_SECRET_KEY || "default_key_32byteslong123456789012"; // 32 bytes for AES-256
const IV = Buffer.alloc(16, 0); // Initialization vector (for demo, all zeros)

export function decryptWoodstockAddress(encrypted: string): string {
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), IV);
  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// For local dev: helper to encrypt the address (not used in prod)
export function encryptWoodstockAddress(address: string): string {
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), IV);
  let encrypted = cipher.update(address, "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
}
