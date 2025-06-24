// encrypt-woodstock.js
// Usage: node encrypt-woodstock.js "YOUR_32_BYTE_SECRET_KEY" "69 Ratterman Rd Woodstock, NY 12498, USA"

const crypto = require("crypto");

if (process.argv.length < 4) {
  console.error("Usage: node encrypt-woodstock.js <32_byte_secret_key> <address>");
  process.exit(1);
}

const ENCRYPTION_KEY = process.argv[2];
const address = process.argv.slice(3).join(" ");
const IV = Buffer.alloc(16, 0); // 16 bytes IV (all zeros)

if (ENCRYPTION_KEY.length !== 32) {
  console.error("Secret key must be exactly 32 bytes (characters) for AES-256.");
  process.exit(1);
}

function encryptWoodstockAddress(address) {
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), IV);
  let encrypted = cipher.update(address, "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
}

const encrypted = encryptWoodstockAddress(address);
console.log("ENCRYPTED_WOODSTOCK_ADDRESS=", encrypted);
