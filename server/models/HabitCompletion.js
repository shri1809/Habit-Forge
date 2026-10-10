import mongoose from "mongoose";

const habitCompletionSchema = new mongoose.Schema(
  {
    habit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Habit",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Normalized period key: YYYY-MM-DD for daily, YYYY-Www for weekly
    periodKey: {
      type: String,
      required: true,
      trim: true,
    },
    // Calendar date string (YYYY-MM-DD) in user's timezone for analytics
    date: {
      type: String,
      required: true,
      trim: true,
    },
    xpEarned: {
      type: Number,
      default: 10,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Strictly prevent duplicate completions for the same habit within the same period (daily or weekly)
habitCompletionSchema.index({ habit: 1, periodKey: 1 }, { unique: true });

// Analytical and query performance indexes
habitCompletionSchema.index({ user: 1, periodKey: 1 });
habitCompletionSchema.index({ user: 1, date: 1 });
habitCompletionSchema.index({ user: 1, completedAt: -1 });

const HabitCompletion =
  mongoose.models.HabitCompletion ||
  mongoose.model("HabitCompletion", habitCompletionSchema);

export default HabitCompletion;
