import Habit from "../models/Habit.js";
import HabitCompletion from "../models/HabitCompletion.js";
import { getUserLocalPeriod } from "../utils/timezone.js";
import { sendHabitReminderEmail } from "../utils/sendEmail.js";

const EIGHTEEN_HOURS_MS = 18 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

let schedulerTimer = null;
let isEvaluating = false;

/**
 * Scans all active habits and sends email reminders to users who have added
 * habits but haven't checked in within 18 hours.
 *
 * @param {Object} options
 * @param {boolean} [options.dryRun=false] - If true, evaluates without sending emails or updating records
 * @returns {Promise<Object>} Summary of evaluation results
 */
export const checkAndSendHabitReminders = async ({ dryRun = false } = {}) => {
  if (isEvaluating) {
    return { skipped: true, reason: "Evaluation already in progress" };
  }

  isEvaluating = true;
  const now = new Date();
  const results = {
    totalActiveHabitsScanned: 0,
    overdueHabitsFound: 0,
    remindersDispatched: 0,
    recipientEmails: [],
  };

  try {
    // 1. Fetch all unarchived habits with user details
    const activeHabits = await Habit.find({ isArchived: false }).populate("user");
    results.totalActiveHabitsScanned = activeHabits.length;

    // Group overdue habits by user to avoid sending multiple emails at once
    const userOverdueMap = new Map();

    for (const habit of activeHabits) {
      const user = habit.user;
      if (!user || !user.email) continue;

      const createdAt = new Date(habit.createdAt || now);
      const timeSinceCreation = now.getTime() - createdAt.getTime();

      // Check 1: Must be at least 18 hours since the habit was created
      if (timeSinceCreation < EIGHTEEN_HOURS_MS) {
        continue;
      }

      // Check 2: Skip if a reminder email was already dispatched in the last 24 hours
      if (habit.lastReminderSentAt) {
        const timeSinceLastReminder = now.getTime() - new Date(habit.lastReminderSentAt).getTime();
        if (timeSinceLastReminder < TWENTY_FOUR_HOURS_MS) {
          continue;
        }
      }

      // Check 3: Check if habit is already completed in current period (user local timezone)
      const userTz = user.timezone || "UTC";
      const { periodKey: currentPeriod } = getUserLocalPeriod(userTz, habit.frequency || "daily");

      if (habit.lastCompletedPeriod === currentPeriod) {
        // User has completed today's check-in
        continue;
      }

      // Check 4: Check if any check-in occurred within the last 18 hours
      const recentCompletion = await HabitCompletion.findOne({
        habit: habit._id,
        completedAt: { $gte: new Date(now.getTime() - EIGHTEEN_HOURS_MS) },
      });

      if (recentCompletion) {
        continue;
      }

      // Habit is eligible for an 18-hour reminder
      results.overdueHabitsFound++;
      const userIdStr = user._id.toString();

      if (!userOverdueMap.has(userIdStr)) {
        userOverdueMap.set(userIdStr, {
          user,
          habits: [],
        });
      }

      userOverdueMap.get(userIdStr).habits.push(habit);
    }

    // 2. Dispatch grouped reminder emails
    for (const [, { user, habits }] of userOverdueMap) {
      if (habits.length === 0) continue;

      if (!dryRun) {
        try {
          await sendHabitReminderEmail({
            email: user.email,
            userName: user.name,
            habits,
            dashboardUrl: `${process.env.CLIENT_URL || "https://habit-forge-six-chi.vercel.app"}/dashboard`,
          });

          // Mark reminder timestamp on habits to prevent duplicate emails
          const habitIds = habits.map((h) => h._id);
          await Habit.updateMany(
            { _id: { $in: habitIds } },
            { $set: { lastReminderSentAt: now } }
          );

          results.remindersDispatched++;
          results.recipientEmails.push(user.email);
        } catch (emailErr) {
          console.error(`Failed to send habit reminder to ${user.email}:`, emailErr.message);
        }
      } else {
        results.remindersDispatched++;
        results.recipientEmails.push(user.email);
      }
    }

    if (results.remindersDispatched > 0) {
      console.log(
        `[HabitReminderService] Sent 18-hour check-in reminders to ${results.remindersDispatched} user(s) (${results.overdueHabitsFound} habits)`
      );
    }

    return results;
  } catch (error) {
    console.error("[HabitReminderService] Error evaluating reminders:", error);
    throw error;
  } finally {
    isEvaluating = false;
  }
};

/**
 * Starts the periodic background reminder scheduler.
 * Runs check every 30 minutes (or configured interval).
 *
 * @param {number} [intervalMs=1800000] - Interval in milliseconds (default: 30 minutes)
 */
export const startReminderScheduler = (intervalMs = 30 * 60 * 1000) => {
  if (schedulerTimer) {
    return;
  }

  // Initial delayed evaluation 30 seconds after server start
  setTimeout(() => {
    checkAndSendHabitReminders().catch((err) =>
      console.warn("[HabitReminderService] Initial check notice:", err.message)
    );
  }, 30 * 1000);

  // Recurring periodic evaluation
  schedulerTimer = setInterval(() => {
    checkAndSendHabitReminders().catch((err) =>
      console.warn("[HabitReminderService] Periodic check notice:", err.message)
    );
  }, intervalMs);

  console.log(`[HabitReminderService] Background 18-hour reminder scheduler active (interval: ${intervalMs / 60000}m)`);
};

/**
 * Stops the periodic background reminder scheduler.
 */
export const stopReminderScheduler = () => {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log("[HabitReminderService] Background reminder scheduler stopped.");
  }
};

