import express from "express";
import {
  registerUser,
  loginUser,
  getUserProfile,
  verifyOTP,
  resendOTP,
  verifyEmail,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

// OTP Verification endpoints (supporting both naming conventions)
router.post("/verify-email-otp", verifyOTP);
router.post("/verify-otp", verifyOTP);

// Resend OTP endpoints
router.post("/resend-email-otp", resendOTP);
router.post("/resend-otp", resendOTP);

// Backward-compatible verification link endpoint
router.post("/verify-email", verifyEmail);

router.get("/profile", protect, getUserProfile);

export default router;