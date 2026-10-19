import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    userEmail: {
      type: String,
      trim: true,
      default: "anonymous@habitforge.app",
    },
    userName: {
      type: String,
      trim: true,
      default: "HabitForge Explorer",
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    category: {
      type: String,
      enum: ["general", "feature_request", "bug_report", "praise"],
      default: "general",
    },
    message: {
      type: String,
      required: [true, "Feedback message cannot be empty"],
      trim: true,
      maxlength: 2000,
    },
    emailDispatched: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Feedback", feedbackSchema);