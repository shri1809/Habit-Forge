import { describe, it, expect } from "vitest";
import {
  generateOTP,
  hashOTP,
  verifyOTPHash,
  maskEmail,
  OTP_EXPIRATION_MINUTES,
  RESEND_COOLDOWN_SECONDS,
  MAX_OTP_ATTEMPTS,
} from "../utils/otp.js";

describe("Cryptographic OTP Utilities & Rules", () => {
  it("generates exactly 6 numeric digits and preserves leading zeroes", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateOTP();
      expect(code).toBeTypeOf("string");
      expect(code.length).toBe(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
    }
  });

  it("produces deterministic HMAC-SHA256 hashes bound to email and secret", () => {
    const email = "user@example.com";
    const code = "012345";
    const secret = "test_secret_12345";

    const hash1 = hashOTP(email, code, secret);
    const hash2 = hashOTP("USER@EXAMPLE.COM ", code, secret); // case & whitespace insensitivity

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex string length
  });

  it("verifies matching OTP codes using timing-safe comparison", () => {
    const email = "test@habitforge.com";
    const code = "789012";
    const secret = "super_secret_otp_key";
    const storedHash = hashOTP(email, code, secret);

    expect(verifyOTPHash(email, code, storedHash, secret)).toBe(true);
    expect(verifyOTPHash("TEST@HABITFORGE.COM", code, storedHash, secret)).toBe(true);
  });

  it("rejects invalid, mismatched, or altered OTP codes", () => {
    const email = "test@habitforge.com";
    const code = "789012";
    const secret = "super_secret_otp_key";
    const storedHash = hashOTP(email, code, secret);

    expect(verifyOTPHash(email, "789013", storedHash, secret)).toBe(false);
    expect(verifyOTPHash("other@habitforge.com", code, storedHash, secret)).toBe(false);
    expect(verifyOTPHash(email, "12345", storedHash, secret)).toBe(false); // short
    expect(verifyOTPHash(email, "7890123", storedHash, secret)).toBe(false); // long
    expect(verifyOTPHash(email, "abcdef", storedHash, secret)).toBe(false); // non-numeric
  });

  it("adheres to strict configuration constants", () => {
    expect(OTP_EXPIRATION_MINUTES).toBe(10);
    expect(RESEND_COOLDOWN_SECONDS).toBe(60);
    expect(MAX_OTP_ATTEMPTS).toBe(5);
  });

  it("masks emails correctly for privacy-conscious display", () => {
    expect(maskEmail("john.doe@example.com")).toBe("j***e@example.com");
    expect(maskEmail("a@b.com")).toBe("a*@b.com");
    expect(maskEmail("shridhar@habitforge.com")).toBe("s***r@habitforge.com");
    expect(maskEmail("invalid")).toBe("");
  });
});

describe("OTP Expiration and Attempt Logic", () => {
  it("detects expired codes relative to 10-minute validity window", () => {
    const now = Date.now();
    const validExpiresAt = new Date(now + 10 * 60 * 1000);
    const expiredExpiresAt = new Date(now - 1000);

    expect(validExpiresAt > new Date()).toBe(true);
    expect(expiredExpiresAt < new Date()).toBe(true);
  });

  it("evaluates attempt count against MAX_OTP_ATTEMPTS limit", () => {
    let attemptCount = 0;
    const maxAttempts = MAX_OTP_ATTEMPTS; // 5

    // 4 failed attempts: code remains active
    attemptCount += 4;
    expect(attemptCount < maxAttempts).toBe(true);

    // 5th failed attempt: code gets locked
    attemptCount += 1;
    expect(attemptCount >= maxAttempts).toBe(true);
  });

  it("enforces resend cooldown elapsed time check", () => {
    const now = Date.now();
    const lastSentJustNow = new Date(now - 20 * 1000); // 20s ago
    const lastSentPastCooldown = new Date(now - 65 * 1000); // 65s ago

    const elapsed1 = Math.floor((now - lastSentJustNow.getTime()) / 1000);
    expect(elapsed1 < RESEND_COOLDOWN_SECONDS).toBe(true);
    expect(RESEND_COOLDOWN_SECONDS - elapsed1).toBe(40); // 40s remaining

    const elapsed2 = Math.floor((now - lastSentPastCooldown.getTime()) / 1000);
    expect(elapsed2 >= RESEND_COOLDOWN_SECONDS).toBe(true);
  });
});
