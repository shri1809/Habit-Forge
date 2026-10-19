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
import { checkAndSendHabitReminders } from "../services/reminderService.js";
import { protect, requireVerified } from "../middleware/authMiddleware.js";

const router = express.Router();

// External cron trigger (can be pinged by cron-job.org or Render cron without user JWT)
router.get("/cron/reminders", async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (
    cronSecret &&
    req.headers["x-cron-secret"] !== cronSecret &&
    req.query.secret !== cronSecret
  ) {
    return res.status(401).json({ message: "Unauthorized cron request" });
  }
  try {
    const results = await checkAndSendHabitReminders({
      dryRun: req.query.dryRun === "true",
    });
    res.json({ message: "Reminder evaluation completed", ...results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.use(protect);
router.use(requireVerified);

// Authenticated trigger endpoint
router.post("/reminders/trigger", async (req, res) => {
  try {
    const results = await checkAndSendHabitReminders({
      dryRun: req.query.dryRun === "true",
    });
    res.json({ message: "Reminder evaluation completed", ...results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

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