import express from "express";
import {
  registerUser,
  loginUser,
  getUserProfile,
  verifyOTP,
  resendOTP,
  verifyEmail,
  forgotPassword,
  resetPasswordWithOTP,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);

// Password Reset via OTP endpoints
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPasswordWithOTP);

// OTP Verification endpoints (supporting both naming conventions)
router.post("/verify-email-otp", authLimiter, verifyOTP);
router.post("/verify-otp", authLimiter, verifyOTP);

// Resend OTP endpoints
router.post("/resend-email-otp", authLimiter, resendOTP);
router.post("/resend-otp", authLimiter, resendOTP);

// Backward-compatible verification link endpoint
router.post("/verify-email", authLimiter, verifyEmail);

router.get("/profile", protect, getUserProfile);

export default router;