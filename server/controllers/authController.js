import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import EmailVerificationCode from "../models/EmailVerificationCode.js";
import generateToken from "../utils/generateToken.js";
import { sendVerificationOtpEmail } from "../utils/sendEmail.js";
import { sanitizeTimezone } from "../utils/timezone.js";
import {
  generateOTP,
  hashOTP,
  verifyOTPHash,
  OTP_EXPIRATION_MINUTES,
  RESEND_COOLDOWN_SECONDS,
  MAX_OTP_ATTEMPTS,
  maskEmail,
} from "../utils/otp.js";

/**
 * Creates a signed temporary token identifying a user during email verification.
 */
const generatePendingVerificationToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, purpose: "email_verification" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
};

/**
 * Internal helper to generate, store, and send an email verification OTP.
 * Invalidates any prior active codes for the user.
 */
const issueVerificationOTP = async (user) => {
  const normalizedEmail = user.email.toLowerCase().trim();

  // Invalidate any existing unconsumed codes for this email and purpose
  await EmailVerificationCode.updateMany(
    {
      email: normalizedEmail,
      purpose: "email_verification",
      consumedAt: null,
    },
    { consumedAt: new Date() }
  );

  const otp = generateOTP();
  const codeHash = hashOTP(normalizedEmail, otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000);

  await EmailVerificationCode.create({
    userId: user._id,
    email: normalizedEmail,
    purpose: "email_verification",
    codeHash,
    expiresAt,
    lastSentAt: new Date(),
    attemptCount: 0,
  });

  try {
    await sendVerificationOtpEmail(normalizedEmail, otp);
  } catch (error) {
    console.error("Email send failed:", error.message);
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV MODE OTP] Verification Code for ${normalizedEmail}: ${otp}`);
    } else {
      throw error;
    }
  }

  return { otp, expiresAt };
};

// @desc    Register a new user and dispatch 6-digit verification OTP
// @route   POST /api/auth/register
export const registerUser = async (req, res) => {
  const { name, email, password, timezone, avatar } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Please provide all required fields" });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const userExists = await User.findOne({ email: normalizedEmail });
  if (userExists) {
    return res.status(400).json({ message: "User already exists" });
  }

  const safeTz = sanitizeTimezone(timezone);

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    timezone: safeTz,
    avatar: avatar || "User",
    isVerified: false,
  });

  try {
    await issueVerificationOTP(user);
    const verificationToken = generatePendingVerificationToken(user);

    res.status(201).json({
      message: "Registration successful! A 6-digit verification code has been sent to your email.",
      email: normalizedEmail,
      maskedEmail: maskEmail(normalizedEmail),
      verificationToken,
      expiresInMinutes: OTP_EXPIRATION_MINUTES,
      cooldownSeconds: RESEND_COOLDOWN_SECONDS,
    });
  } catch (error) {
    await User.findByIdAndDelete(user._id);
    return res.status(500).json({ message: "Failed to send verification email. Try again." });
  }
};

// @desc    Verify 6-digit email OTP
// @route   POST /api/auth/verify-email-otp or POST /api/auth/verify-otp
export const verifyOTP = async (req, res) => {
  const rawCode = req.body.otp || req.body.code;
  let targetEmail = req.body.email ? req.body.email.toLowerCase().trim() : null;

  // Extract from Authorization header if present
  if (
    !targetEmail &&
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.email) {
        targetEmail = decoded.email.toLowerCase().trim();
      }
    } catch {
      // Ignored; fallback to body check
    }
  }

  if (!rawCode) {
    return res.status(400).json({ message: "6-digit verification code is required" });
  }

  const trimmedCode = String(rawCode).trim();
  if (!/^\d{6}$/.test(trimmedCode)) {
    return res.status(400).json({ message: "Verification code must be exactly 6 numeric digits" });
  }

  if (!targetEmail) {
    return res.status(400).json({ message: "Email is required to verify code" });
  }

  const user = await User.findOne({ email: targetEmail });
  if (!user) {
    return res.status(400).json({ message: "Invalid or expired verification code." });
  }

  if (user.isVerified) {
    return res.status(200).json({
      message: "Your account is already verified! You can sign in.",
      alreadyVerified: true,
      verified: true,
      token: generateToken(user._id),
    });
  }

  const activeCode = await EmailVerificationCode.findOne({
    email: targetEmail,
    purpose: "email_verification",
    consumedAt: null,
  }).sort({ createdAt: -1 });

  if (!activeCode) {
    return res.status(400).json({
      message: "Invalid or expired verification code. Please request a new code.",
    });
  }

  // Attempt limit protection
  if (activeCode.attemptCount >= MAX_OTP_ATTEMPTS) {
    activeCode.consumedAt = new Date();
    await activeCode.save();
    return res.status(429).json({
      message: "Too many incorrect attempts. This code is now invalid. Please request a new code.",
    });
  }

  // Expiration check
  if (new Date() > activeCode.expiresAt) {
    activeCode.consumedAt = new Date();
    await activeCode.save();
    return res.status(400).json({
      message: "Verification code has expired. Please request a new code.",
    });
  }

  // Constant-time HMAC match
  const isValid = verifyOTPHash(targetEmail, trimmedCode, activeCode.codeHash);

  if (!isValid) {
    activeCode.attemptCount += 1;
    await activeCode.save();
    const remaining = Math.max(0, MAX_OTP_ATTEMPTS - activeCode.attemptCount);

    return res.status(400).json({
      message:
        remaining > 0
          ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
          : "Incorrect code. Maximum attempts reached. Please request a new code.",
      remainingAttempts: remaining,
    });
  }

  // Atomically consume code and mark user verified
  activeCode.consumedAt = new Date();
  await activeCode.save();

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpire = undefined;
  await user.save();

  // Return session token so frontend can transition directly or proceed to dashboard
  const token = generateToken(user._id);

  res.json({
    message: "Email verified successfully! Welcome to HabitForge.",
    verified: true,
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      level: user.level,
      xp: user.xp,
      streakFreezes: user.streakFreezes,
      badges: user.badges,
      isPremium: Boolean(user.isPremium),
    },
  });
};

// @desc    Resend 6-digit email OTP with rate limiting & anti-enumeration
// @route   POST /api/auth/resend-email-otp or POST /api/auth/resend-otp
export const resendOTP = async (req, res) => {
  let targetEmail = req.body.email ? req.body.email.toLowerCase().trim() : null;

  if (
    !targetEmail &&
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.email) {
        targetEmail = decoded.email.toLowerCase().trim();
      }
    } catch {
      // Ignored
    }
  }

  if (!targetEmail) {
    return res.status(400).json({ message: "Email is required" });
  }

  const user = await User.findOne({ email: targetEmail });

  const genericResponse = {
    message: "If an unverified account exists for this email, a new verification code has been sent.",
    cooldownSeconds: RESEND_COOLDOWN_SECONDS,
  };

  if (!user || user.isVerified) {
    return res.status(200).json(genericResponse);
  }

  // Check rate limit / cooldown
  const latestCode = await EmailVerificationCode.findOne({
    email: targetEmail,
    purpose: "email_verification",
    consumedAt: null,
  }).sort({ createdAt: -1 });

  if (latestCode && latestCode.lastSentAt) {
    const elapsedSeconds = Math.floor(
      (Date.now() - new Date(latestCode.lastSentAt).getTime()) / 1000
    );

    if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
      const retryAfterSeconds = RESEND_COOLDOWN_SECONDS - elapsedSeconds;
      return res.status(429).json({
        message: `Please wait ${retryAfterSeconds} seconds before requesting another code.`,
        retryAfterSeconds,
      });
    }
  }

  try {
    await issueVerificationOTP(user);
    res.status(200).json(genericResponse);
  } catch (error) {
    res.status(500).json({ message: "Failed to resend verification code. Please try again." });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
export const loginUser = async (req, res) => {
  const { email, password, timezone } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (user && (await bcrypt.compare(password, user.password))) {
    if (!user.isVerified) {
      const verificationToken = generatePendingVerificationToken(user);
      return res.status(403).json({
        message: "Please verify your email address before signing in.",
        isVerified: false,
        email: user.email,
        maskedEmail: maskEmail(user.email),
        verificationToken,
      });
    }

    if (timezone && sanitizeTimezone(timezone) !== user.timezone) {
      user.timezone = sanitizeTimezone(timezone);
      await user.save();
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      level: user.level,
      xp: user.xp,
      streakFreezes: user.streakFreezes,
      badges: user.badges,
      timezone: user.timezone || "UTC",
      avatar: user.avatar || "User",
      isPremium: Boolean(user.isPremium),
      token: generateToken(user._id),
    });
  } else {
    res.status(401).json({ message: "Invalid email or password" });
  }
};

// @desc    Backward-compatible verification endpoint
// @route   POST /api/auth/verify-email
export const verifyEmail = async (req, res) => {
  if (req.body.otp || req.body.code) {
    return verifyOTP(req, res);
  }

  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ message: "Verification token or code is missing" });
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    verificationToken: hashedToken,
    verificationTokenExpire: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ message: "Token is invalid or has expired" });
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpire = undefined;
  await user.save();

  res.json({
    message: "Email successfully verified! You can now log in.",
    verified: true,
  });
};

// @desc    Get user profile data
// @route   GET /api/auth/profile
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};