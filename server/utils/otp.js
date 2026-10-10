import crypto from "crypto";

export const OTP_EXPIRATION_MINUTES = 10;
export const RESEND_COOLDOWN_SECONDS = 60;
export const MAX_OTP_ATTEMPTS = 5;

/**
 * Generates a cryptographically secure six-digit numeric OTP code.
 * Preserves leading zeroes (000000 - 999999).
 * 
 * @returns {string} 6-digit string
 */
export const generateOTP = () => {
  const num = crypto.randomInt(0, 1000000);
  return num.toString().padStart(6, "0");
};

/**
 * Securely hashes an OTP code bound to the user's normalized email address and server secret.
 * 
 * @param {string} email - User email address
 * @param {string} code - 6-digit OTP code
 * @param {string} [secret] - Optional secret override
 * @returns {string} HMAC-SHA256 hex digest
 */
export const hashOTP = (email, code, secret) => {
  const normalizedEmail = (email || "").toLowerCase().trim();
  const normalizedCode = (code || "").trim();
  const key =
    secret ||
    process.env.OTP_SECRET ||
    process.env.JWT_SECRET ||
    "habitforge_otp_secret_key_fixed";

  return crypto
    .createHmac("sha256", key)
    .update(`${normalizedEmail}:${normalizedCode}`)
    .digest("hex");
};

/**
 * Compares a candidate OTP against a stored hash using timing-safe comparison.
 * 
 * @param {string} email - User email address
 * @param {string} candidateCode - Candidate 6-digit code
 * @param {string} storedHash - Stored HMAC-SHA256 hex string
 * @param {string} [secret] - Optional secret override
 * @returns {boolean} True if matched
 */
export const verifyOTPHash = (email, candidateCode, storedHash, secret) => {
  if (!email || !candidateCode || !storedHash) return false;
  if (typeof candidateCode !== "string" || candidateCode.trim().length !== 6) return false;

  const candidateHash = hashOTP(email, candidateCode, secret);

  const candidateBuf = Buffer.from(candidateHash, "hex");
  const storedBuf = Buffer.from(storedHash, "hex");

  if (candidateBuf.length !== storedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(candidateBuf, storedBuf);
};

/**
 * Masks an email for safe display in UI/error messages.
 * e.g. "alexander@domain.com" -> "a***r@domain.com"
 * 
 * @param {string} email
 * @returns {string} Masked email
 */
export const maskEmail = (email) => {
  if (!email || typeof email !== "string" || !email.includes("@")) return "";
  const [localPart, domain] = email.trim().toLowerCase().split("@");
  if (localPart.length <= 2) {
    return `${localPart[0]}*@${domain}`;
  }
  return `${localPart[0]}***${localPart[localPart.length - 1]}@${domain}`;
};
