import Habit from "../models/Habit.js";
import HabitCompletion from "../models/HabitCompletion.js";
import User from "../models/User.js";
import {
  calculateStreak,
  calculateLevel,
  calculateXPAndLevel,
  checkBadges,
} from "../utils/gamification.js";
import { getUserLocalPeriod } from "../utils/timezone.js";

// @desc    Create a new habit
// @route   POST /api/habits
export const createHabit = async (req, res) => {
  try {
    const { title, description, category, color, icon, frequency } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ message: "Habit title is required and must be text" });
    }

    if (title.trim().length > 100) {
      return res.status(400).json({ message: "Habit title cannot exceed 100 characters" });
    }

    // Check free tier habit limits
    const FREE_HABIT_LIMIT = Number(process.env.FREE_HABIT_LIMIT) || 5;
    if (!req.user.isPremium) {
      const activeCount = await Habit.countDocuments({
        user: req.user._id,
        isArchived: false,
      });

      if (activeCount >= FREE_HABIT_LIMIT) {
        return res.status(403).json({
          message: `Free tier is limited to ${FREE_HABIT_LIMIT} active habits. Upgrade to Pro for unlimited habits!`,
          code: "HABIT_LIMIT_REACHED",
        });
      }
    }

    const validCategories = ["General", "Health", "Coding", "Study", "Mindset"];
    const validFrequencies = ["daily", "weekly"];

    const habit = await Habit.create({
      user: req.user._id,
      title: title.trim(),
      description: description ? description.trim() : "",
      category: validCategories.includes(category) ? category : "General",
      frequency: validFrequencies.includes(frequency) ? frequency : "daily",
      color: color || "#10B981",
      icon: icon || "Zap",
    });

    res.status(201).json(habit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all user habits with period-specific completion status
// @route   GET /api/habits
export const getHabits = async (req, res) => {
  try {
    const userTz = req.user.timezone || "UTC";
    const dailyPeriod = getUserLocalPeriod(userTz, "daily").periodKey;
    const weeklyPeriod = getUserLocalPeriod(userTz, "weekly").periodKey;

    const showArchived = req.query.archived === "true";

    const habits = await Habit.find({
      user: req.user._id,
      isArchived: showArchived,
    }).sort({ createdAt: -1 });

    // Fetch completions in the current active periods for this user
    const activeCompletions = await HabitCompletion.find({
      user: req.user._id,
      periodKey: { $in: [dailyPeriod, weeklyPeriod] },
    });

    const completedHabitPeriodSet = new Set(
      activeCompletions.map((c) => `${c.habit.toString()}_${c.periodKey}`)
    );

    const habitsWithStatus = habits.map((habit) => {
      const expectedPeriod =
        habit.frequency === "weekly" ? weeklyPeriod : dailyPeriod;
      const isCompleted = completedHabitPeriodSet.has(
        `${habit._id.toString()}_${expectedPeriod}`
      );

      return {
        ...habit.toObject(),
        isCompletedToday: isCompleted, // UI property
        isCompletedInPeriod: isCompleted,
        currentPeriod: expectedPeriod,
      };
    });

    res.json(habitsWithStatus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Complete / Check-in a habit idempotently
// @route   POST /api/habits/:id/checkin
export const checkInHabit = async (req, res) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!habit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    const user = await User.findById(req.user._id);
    const userTz = user.timezone || req.body.timezone || "UTC";
    const frequency = habit.frequency || "daily";

    const { periodKey: currentPeriod, previousPeriod, date } = getUserLocalPeriod(
      userTz,
      frequency
    );

    // Fast check: already completed in this period?
    const existingCompletion = await HabitCompletion.findOne({
      habit: habit._id,
      periodKey: currentPeriod,
    });

    if (existingCompletion) {
      return res.status(200).json({
        message: `Habit already checked in for this ${frequency === "weekly" ? "week" : "day"}!`,
        alreadyCompleted: true,
        habit,
        gainedXP: 0,
        totalXP: user.xp,
        level: user.level,
        streakFreezes: user.streakFreezes,
        freezeUsed: false,
      });
    }

    // Atomic insert into HabitCompletion with unique compound index protection
    let completion;
    try {
      completion = await HabitCompletion.create({
        habit: habit._id,
        user: user._id,
        periodKey: currentPeriod,
        date,
        xpEarned: 10,
      });
    } catch (insertError) {
      if (insertError.code === 11000) {
        // Concurrency catch: another simultaneous request just completed this period
        return res.status(200).json({
          message: `Habit already checked in for this ${frequency === "weekly" ? "week" : "day"}!`,
          alreadyCompleted: true,
          habit,
          gainedXP: 0,
          totalXP: user.xp,
          level: user.level,
          streakFreezes: user.streakFreezes,
          freezeUsed: false,
        });
      }
      throw insertError;
    }

    // Calculate streak progression with freeze handling
    const lastPeriod = habit.lastCompletedPeriod || habit.lastCompletedDate;
    const { newStreak, freezeUsed } = calculateStreak(
      lastPeriod,
      habit.currentStreak || 0,
      user.streakFreezes || 0,
      {
        currentPeriod,
        previousPeriod,
        frequency,
      }
    );

    if (freezeUsed && user.streakFreezes > 0) {
      user.streakFreezes -= 1;
    }

    habit.currentStreak = newStreak;
    if (newStreak > (habit.longestStreak || 0)) {
      habit.longestStreak = newStreak;
    }
    habit.lastCompletedPeriod = currentPeriod;
    habit.lastCompletedDate = date;
    await habit.save();

    // Gamification calculations
    const { gainedXP, totalXP, newLevel } = calculateXPAndLevel(
      user.xp || 0,
      user.level || 1,
      newStreak
    );

    user.xp = totalXP;
    user.level = newLevel;

    // Update actual XP on completion record
    completion.xpEarned = gainedXP;
    await completion.save();

    // Evaluate badge triggers
    const totalCompletions = await HabitCompletion.countDocuments({
      user: user._id,
    });
    const newBadges = checkBadges(user, newStreak, totalCompletions);
    if (newBadges.length > 0) {
      user.badges.push(...newBadges);
    }

    await user.save();

    res.json({
      message: freezeUsed
        ? "Check-in successful! A Streak Freeze protected your streak."
        : "Check-in successful!",
      alreadyCompleted: false,
      habit,
      gainedXP,
      totalXP: user.xp,
      level: user.level,
      streakFreezes: user.streakFreezes,
      newBadges,
      freezeUsed,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user completion history (for heatmap and analytics)
// @route   GET /api/habits/history
export const getCompletionHistory = async (req, res) => {
  try {
    const logs = await HabitCompletion.find({ user: req.user._id })
      .sort({ date: 1 })
      .populate("habit", "title color category");

    // Aggregate completion counts per date
    const historyMap = {};
    logs.forEach((log) => {
      if (!historyMap[log.date]) {
        historyMap[log.date] = 0;
      }
      historyMap[log.date] += 1;
    });

    res.json({ logs, historyMap });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a habit and its completions
// @route   DELETE /api/habits/:id
export const deleteHabit = async (req, res) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!habit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    // Calculate total XP earned from this habit to deduct
    const completions = await HabitCompletion.find({
      habit: habit._id,
      user: req.user._id,
    });

    const xpToDeduct = completions.reduce(
      (sum, c) => sum + (Number(c.xpEarned) || 0),
      0
    );

    // Cascade delete completion records and habit
    await HabitCompletion.deleteMany({ habit: habit._id });
    await Habit.findByIdAndDelete(habit._id);

    // Update user's XP and recalculate level
    const user = await User.findById(req.user._id);
    if (user) {
      user.xp = Math.max(0, (user.xp || 0) - xpToDeduct);
      user.level = calculateLevel(user.xp);
      await user.save();
    }

    res.json({
      message: "Habit deleted successfully",
      deductedXp: xpToDeduct,
      totalXp: user ? user.xp : 0,
      level: user ? user.level : 1,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Archive a habit
// @route   PATCH /api/habits/:id/archive
export const archiveHabit = async (req, res) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!habit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    habit.isArchived = true;
    await habit.save();

    res.json({ message: "Habit archived successfully", habit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Unarchive / Restore a habit
// @route   PATCH /api/habits/:id/unarchive
export const unarchiveHabit = async (req, res) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!habit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    habit.isArchived = false;
    await habit.save();

    res.json({ message: "Habit restored successfully", habit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Purchase a streak freeze using XP
// @route   POST /api/habits/freeze/buy
export const buyStreakFreeze = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const FREEZE_COST = 50;

    if (user.xp < FREEZE_COST) {
      return res.status(400).json({
        message: `Not enough XP! A Streak Freeze costs ${FREEZE_COST} XP.`,
      });
    }

    user.xp -= FREEZE_COST;
    user.streakFreezes = (user.streakFreezes || 0) + 1;
    await user.save();

    res.json({
      message: "Streak Freeze acquired!",
      streakFreezes: user.streakFreezes,
      totalXp: user.xp,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user analytics and summary insights
// @route   GET /api/habits/analytics
export const getHabitAnalytics = async (req, res) => {
  try {
    const habits = await Habit.find({ user: req.user._id });
    const totalHabits = habits.length;

    const completions = await HabitCompletion.find({ user: req.user._id });
    const totalCheckIns = completions.length;

    const bestStreak = habits.reduce(
      (max, habit) => Math.max(max, habit.longestStreak || 0),
      0
    );

    // Distribution by category
    const categoryCounts = {};
    habits.forEach((habit) => {
      const cat = habit.category || "General";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    res.json({
      totalHabits,
      totalCheckIns,
      bestStreak,
      categoryCounts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Export user data (profile, habits, and completions)
// @route   GET /api/habits/export
export const exportUserData = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    const habits = await Habit.find({ user: req.user._id });
    const completions = await HabitCompletion.find({ user: req.user._id }).populate(
      "habit",
      "title category frequency"
    );

    const exportPayload = {
      user: {
        name: user.name,
        email: user.email,
        level: user.level,
        xp: user.xp,
        timezone: user.timezone,
        streakFreezes: user.streakFreezes,
        badges: user.badges,
        isPremium: user.isPremium,
      },
      habits,
      completionLogs: completions,
      exportedAt: new Date().toISOString(),
    };

    res.json(exportPayload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
