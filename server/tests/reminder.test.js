import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getHabitReminderHtml,
  sendHabitReminderEmail,
} from "../utils/sendEmail.js";
import { checkAndSendHabitReminders } from "../services/reminderService.js";
import Habit from "../models/Habit.js";
import HabitCompletion from "../models/HabitCompletion.js";

describe("18-Hour Habit Reminder Email Templates & Dispatcher", () => {
  it("renders habit reminder HTML with recipient name, habit details, and 18h warning", () => {
    const html = getHabitReminderHtml({
      userName: "Alex Johnson",
      habits: [
        {
          title: "Morning Meditation",
          category: "Mindset",
          currentStreak: 5,
        },
      ],
      dashboardUrl: "https://habitforge.app/dashboard",
    });

    expect(html).toContain("Time to check in, Alex!");
    expect(html).toContain("Morning Meditation");
    expect(html).toContain("Mindset");
    expect(html).toContain("18 hours");
    expect(html).toContain("🔥 5d streak");
    expect(html).toContain("+10 XP");
    expect(html).toContain("https://habitforge.app/dashboard");
  });

  it("handles multiple overdue habits gracefully in a single consolidated email", () => {
    const html = getHabitReminderHtml({
      userName: "Sam",
      habits: [
        { title: "Read 20 pages", category: "Study", currentStreak: 3 },
        { title: "Pushups 50x", category: "Health", currentStreak: 0 },
      ],
    });

    expect(html).toContain("Read 20 pages");
    expect(html).toContain("Pushups 50x");
    expect(html).toContain("Study");
    expect(html).toContain("Health");
  });

  it("dispatches habit reminder email via configured email dispatcher", async () => {
    const res = await sendHabitReminderEmail({
      email: "testuser@example.com",
      userName: "Test User",
      habits: [{ title: "Solve LeetCode", category: "Coding" }],
    });

    expect(res).toBeDefined();
    expect(res.provider).toBeDefined();
  });
});

describe("18-Hour Habit Reminder Evaluation Service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("skips habits that were created less than 18 hours ago", async () => {
    const mockUser = {
      _id: "6ad5fc596032f50f56702001",
      email: "user@test.com",
      name: "User One",
      timezone: "UTC",
    };

    // Created only 5 hours ago relative to current run time
    const mockRecentHabit = {
      _id: "6ad5fc596032f50f56702002",
      user: mockUser,
      title: "Drink Water",
      category: "Health",
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours old
      isArchived: false,
      lastReminderSentAt: null,
      lastCompletedPeriod: null,
    };

    vi.spyOn(Habit, "find").mockReturnValue({
      populate: vi.fn().mockResolvedValue([mockRecentHabit]),
    });

    const result = await checkAndSendHabitReminders({ dryRun: true });
    expect(result.overdueHabitsFound).toBe(0);
    expect(result.remindersDispatched).toBe(0);
  });

  it("skips habits that were already checked in for today's active period", async () => {
    const mockUser = {
      _id: "6ad5fc596032f50f56702001",
      email: "user@test.com",
      name: "User One",
      timezone: "UTC",
    };

    // Created 20 hours ago, but already completed today
    const mockCompletedHabit = {
      _id: "6ad5fc596032f50f56702003",
      user: mockUser,
      title: "Morning Run",
      category: "Health",
      frequency: "daily",
      createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000), // 20 hours old
      isArchived: false,
      lastReminderSentAt: null,
      // Will match current UTC period
      lastCompletedPeriod: new Date().toISOString().split("T")[0],
    };

    vi.spyOn(Habit, "find").mockReturnValue({
      populate: vi.fn().mockResolvedValue([mockCompletedHabit]),
    });

    const result = await checkAndSendHabitReminders({ dryRun: true });
    expect(result.overdueHabitsFound).toBe(0);
  });

  it("skips habits where a reminder was already sent in the last 24 hours", async () => {
    const mockUser = {
      _id: "6ad5fc596032f50f56702001",
      email: "user@test.com",
      name: "User One",
      timezone: "UTC",
    };

    // Created 24 hours ago, but reminder sent 2 hours ago
    const mockRemindedHabit = {
      _id: "6ad5fc596032f50f56702004",
      user: mockUser,
      title: "Write Code",
      category: "Coding",
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      isArchived: false,
      lastReminderSentAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      lastCompletedPeriod: null,
    };

    vi.spyOn(Habit, "find").mockReturnValue({
      populate: vi.fn().mockResolvedValue([mockRemindedHabit]),
    });

    const result = await checkAndSendHabitReminders({ dryRun: true });
    expect(result.overdueHabitsFound).toBe(0);
  });

  it("identifies habits overdue by >18 hours and dispatches reminders", async () => {
    const mockUser = {
      _id: "6ad5fc596032f50f56702001",
      email: "overdue@test.com",
      name: "Overdue User",
      timezone: "UTC",
    };

    // Created 19 hours ago, never completed, never reminded
    const mockOverdueHabit = {
      _id: "6ad5fc596032f50f56702005",
      user: mockUser,
      title: "Evening Yoga",
      category: "Health",
      frequency: "daily",
      createdAt: new Date(Date.now() - 19 * 60 * 60 * 1000), // 19 hours old
      isArchived: false,
      lastReminderSentAt: null,
      lastCompletedPeriod: "2026-01-01", // Old period
    };

    vi.spyOn(Habit, "find").mockReturnValue({
      populate: vi.fn().mockResolvedValue([mockOverdueHabit]),
    });
    vi.spyOn(HabitCompletion, "findOne").mockResolvedValue(null);
    vi.spyOn(Habit, "updateMany").mockResolvedValue({ modifiedCount: 1 });

    const result = await checkAndSendHabitReminders({ dryRun: false });
    expect(result.overdueHabitsFound).toBe(1);
    expect(result.remindersDispatched).toBe(1);
    expect(result.recipientEmails).toContain("overdue@test.com");
  });
});

