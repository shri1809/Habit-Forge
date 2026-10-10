import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: {
        type: String
    },
    verificationTokenExpire: {
        type: Date
    },
    xp: {
        type: Number,
        default: 0,
    },
    level: {
        type: Number,
        default: 1,
    },
    badges: [
        {
            name: { type: String, required: true },
            description: { type: String},
            icon: { type: String, required: true },
            unlockedAt: { type: Date, default: Date.now },
        },
    ],
    isPremium: {
        type: Boolean,
        default: false,
    },
    streakFreezes: {
        type: Number,
        default: 0,
    },
    timezone: {
        type: String,
        default: "UTC",
    },
    avatar: {
        type: String,
        default: "User",
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare password helper
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;