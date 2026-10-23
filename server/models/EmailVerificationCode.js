import mongoose from "mongoose";

const emailVerificationCodeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: ["email_verification", "password_reset"],
      default: "email_verification",
      required: true,
      index: true,
    },
    codeHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    consumedAt: {
      type: Date,
      default: null,
      index: true,
    },
    attemptCount: {
      type: Number,
      default: 0,
    },
    lastSentAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound indexes for fast, unambiguous lookup of active codes
emailVerificationCodeSchema.index(
  { email: 1, purpose: 1, consumedAt: 1, expiresAt: 1 },
  { name: "active_code_lookup" }
);

emailVerificationCodeSchema.index(
  { userId: 1, purpose: 1, consumedAt: 1 },
  { name: "user_active_codes" }
);

// Automatic TTL cleanup: documents expire 24 hours after expiresAt for auditing/rate-limiting
emailVerificationCodeSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 86400 }
);

const EmailVerificationCode =
  mongoose.models.EmailVerificationCode ||
  mongoose.model("EmailVerificationCode", emailVerificationCodeSchema);

export default EmailVerificationCode;

