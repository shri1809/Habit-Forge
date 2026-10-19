import express from "express";
import { submitFeedback, getAllFeedback } from "../controllers/feedbackController.js";
import { optionalAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Allow both logged-in and guest users to submit feedback
router.post("/", optionalAuth || ((req, res, next) => next()), submitFeedback);

// View all stored feedback entries
router.get("/", getAllFeedback);

export default router;