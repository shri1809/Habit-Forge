import { describe, it, expect, vi, beforeEach } from "vitest";
import { forgotPassword, resetPasswordWithOTP } from "../controllers/authController.js";
import User from "../models/User.js";
import EmailVerificationCode from "../models/EmailVerificationCode.js";
import { hashOTP } from "../utils/otp.js";

describe("Password Reset via OTP (forgotPassword & resetPasswordWithOTP)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/auth/forgot-password", () => {
    it("rejects missing or invalid email address", async () => {
      const req = { body: { email: "invalid-email" } };
      let statusCode = 200;
      let jsonResponse = {};
      const res = {
        status: (code) => {
          statusCode = code;
          return res;
        },
        json: (data) => {
          jsonResponse = data;
          return res;
        },
      };

      await forgotPassword(req, res);
      expect(statusCode).toBe(400);
      expect(jsonResponse.message).toContain("valid email");
    });

    it("returns anti-enumeration generic success when user is not found", async () => {
      vi.spyOn(User, "findOne").mockResolvedValue(null);

      const req = { body: { email: "nonexistent@example.com" } };
      let statusCode = 200;
      let jsonResponse = {};
      const res = {
        status: (code) => {
          statusCode = code;
          return res;
        },
        json: (data) => {
          jsonResponse = data;
          return res;
        },
      };

      await forgotPassword(req, res);
      expect(statusCode).toBe(200);
      expect(jsonResponse.message).toContain("If an account with that email exists");
      expect(jsonResponse.maskedEmail).toBeDefined();
    });

    it("enforces 60-second resend cooldown timer", async () => {
      const mockUser = {
        _id: "6ad5fc596032f50f56702001",
        email: "test@example.com",
      };
      vi.spyOn(User, "findOne").mockResolvedValue(mockUser);

      // Sent 20 seconds ago
      const recentCode = {
        lastSentAt: new Date(Date.now() - 20 * 1000),
      };
      vi.spyOn(EmailVerificationCode, "findOne").mockReturnValue({
        sort: vi.fn().mockResolvedValue(recentCode),
      });

      const req = { body: { email: "test@example.com" } };
      let statusCode = 200;
      let jsonResponse = {};
      const res = {
        status: (code) => {
          statusCode = code;
          return res;
        },
        json: (data) => {
          jsonResponse = data;
          return res;
        },
      };

      await forgotPassword(req, res);
      expect(statusCode).toBe(429);
      expect(jsonResponse.message).toContain("Please wait");
      expect(jsonResponse.retryAfterSeconds).toBeGreaterThan(0);
    });

    it("issues 6-digit OTP code when user exists and cooldown has elapsed", async () => {
      const mockUser = {
        _id: "6ad5fc596032f50f56702001",
        email: "test@example.com",
      };
      vi.spyOn(User, "findOne").mockResolvedValue(mockUser);
      vi.spyOn(EmailVerificationCode, "findOne").mockReturnValue({
        sort: vi.fn().mockResolvedValue(null),
      });
      vi.spyOn(EmailVerificationCode, "updateMany").mockResolvedValue({ modifiedCount: 1 });
      vi.spyOn(EmailVerificationCode, "create").mockResolvedValue({});

      const req = { body: { email: "test@example.com" } };
      let statusCode = 200;
      let jsonResponse = {};
      const res = {
        status: (code) => {
          statusCode = code;
          return res;
        },
        json: (data) => {
          jsonResponse = data;
          return res;
        },
      };

      await forgotPassword(req, res);
      expect(statusCode).toBe(200);
      expect(jsonResponse.message).toContain("Password reset code sent");
      expect(EmailVerificationCode.create).toHaveBeenCalled();
    });
  });

  describe("POST /api/auth/reset-password", () => {
    it("validates that new password has at least 8 characters", async () => {
      const req = {
        body: {
          email: "test@example.com",
          otp: "123456",
          newPassword: "short",
        },
      };
      let statusCode = 200;
      let jsonResponse = {};
      const res = {
        status: (code) => {
          statusCode = code;
          return res;
        },
        json: (data) => {
          jsonResponse = data;
          return res;
        },
      };

      await resetPasswordWithOTP(req, res);
      expect(statusCode).toBe(400);
      expect(jsonResponse.message).toContain("at least 8 characters");
    });

    it("rejects when no active reset code exists", async () => {
      vi.spyOn(EmailVerificationCode, "findOne").mockReturnValue({
        sort: vi.fn().mockResolvedValue(null),
      });

      const req = {
        body: {
          email: "test@example.com",
          otp: "123456",
          newPassword: "ValidPassword123!",
        },
      };
      let statusCode = 200;
      let jsonResponse = {};
      const res = {
        status: (code) => {
          statusCode = code;
          return res;
        },
        json: (data) => {
          jsonResponse = data;
          return res;
        },
      };

      await resetPasswordWithOTP(req, res);
      expect(statusCode).toBe(400);
      expect(jsonResponse.message).toContain("Invalid or expired");
    });

    it("locks code when max attempts have been exceeded", async () => {
      const mockActiveCode = {
        email: "test@example.com",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attemptCount: 5,
        save: vi.fn().mockResolvedValue(true),
      };
      vi.spyOn(EmailVerificationCode, "findOne").mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockActiveCode),
      });

      const req = {
        body: {
          email: "test@example.com",
          otp: "123456",
          newPassword: "ValidPassword123!",
        },
      };
      let statusCode = 200;
      let jsonResponse = {};
      const res = {
        status: (code) => {
          statusCode = code;
          return res;
        },
        json: (data) => {
          jsonResponse = data;
          return res;
        },
      };

      await resetPasswordWithOTP(req, res);
      expect(statusCode).toBe(429);
      expect(jsonResponse.message).toContain("locked");
    });

    it("successfully resets password on correct OTP verification", async () => {
      const email = "test@example.com";
      const code = "654321";
      const codeHash = hashOTP(email, code);

      const mockActiveCode = {
        userId: "6ad5fc596032f50f56702001",
        email,
        codeHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attemptCount: 0,
        consumedAt: null,
        save: vi.fn().mockResolvedValue(true),
      };

      const mockUser = {
        _id: "6ad5fc596032f50f56702001",
        email,
        password: "oldHashedPassword",
        isVerified: false,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(EmailVerificationCode, "findOne").mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockActiveCode),
      });
      vi.spyOn(User, "findById").mockResolvedValue(mockUser);

      const req = {
        body: {
          email,
          otp: code,
          newPassword: "BrandNewSecretPassword2026!",
        },
      };
      let statusCode = 200;
      let jsonResponse = {};
      const res = {
        status: (code) => {
          statusCode = code;
          return res;
        },
        json: (data) => {
          jsonResponse = data;
          return res;
        },
      };

      await resetPasswordWithOTP(req, res);
      expect(statusCode).toBe(200);
      expect(jsonResponse.success).toBe(true);
      expect(jsonResponse.message).toContain("Password reset successful");
      expect(mockUser.password).toBe("BrandNewSecretPassword2026!");
      expect(mockUser.isVerified).toBe(true);
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockActiveCode.consumedAt).toBeDefined();
    });
  });
});

