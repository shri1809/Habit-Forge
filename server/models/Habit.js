import mongoose from "mongoose";
const habitSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    frequency: {
      type: String,
      enum: ["daily", "weekly"],
      default: "daily",
    },
    color: {
      type: String,
      default: "#10B981", // default emerald green
    },
    icon: {
      type: String,
      default: "Zap",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    currentStreak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    lastCompletedDate: {
      type: String,
      default: null,
    },
    lastCompletedPeriod: {
      type: String, // e.g. "2026-09-23" for daily, "2026-W38" for weekly
      default: null,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    category: {
      type: String,
      enum: ["General", "Health", "Coding", "Study", "Mindset"],
      default: "General",
    },
  },
  { timestamps: true }
);
// Indexes
habitSchema.index({ user: 1, isArchived: 1 });
const Habit = mongoose.model("Habit", habitSchema);
export default Habit;