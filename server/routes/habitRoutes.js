import express from "express";
import {
  createHabit,
  getHabits,
  checkInHabit,
  getCompletionHistory,
  deleteHabit,
  archiveHabit,
  unarchiveHabit,
  buyStreakFreeze,
  getHabitAnalytics,
  exportUserData,
} from "../controllers/habitController.js";
import { protect, requireVerified } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(requireVerified);

router.route("/").post(createHabit).get(getHabits);
router.get("/history", getCompletionHistory);
router.get("/analytics", getHabitAnalytics);
router.get("/export", exportUserData);
router.post("/freeze/buy", buyStreakFreeze);
router.post("/:id/checkin", checkInHabit);
router.delete("/:id", deleteHabit);
router.patch("/:id/archive", archiveHabit);
router.patch("/:id/unarchive", unarchiveHabit);

export default router;