import express from "express";
import { submitFeedback, getAllFeedback } from "../controllers/feedbackController.js";
import { optionalAuth, protect } from "../middleware/authMiddleware.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Allow both logged-in and guest users to submit feedback (rate limited)
router.post("/", authLimiter, optionalAuth || ((req, res, next) => next()), submitFeedback);

// View stored feedback entries (restricted to authenticated sessions)
router.get("/", protect, getAllFeedback);

export default router;
