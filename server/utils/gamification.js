import { calculatePeriodDifference, getUserLocalPeriod } from "./timezone.js";

/**
 * Calculates the next streak count and whether a streak freeze should be applied.
 * Compatible with both daily and weekly frequencies.
 * 
 * @param {string|null} lastCompletedPeriod - Last recorded period ('YYYY-MM-DD' or 'YYYY-Www')
 * @param {number} [currentStreak=0] - Current active streak
 * @param {number} [streakFreezes=0] - Available streak freeze tokens
 * @param {Object} [options={}]
 * @param {string} [options.currentPeriod] - Explicit current period string
 * @param {string} [options.previousPeriod] - Explicit previous period string
 * @param {'daily'|'weekly'} [options.frequency='daily'] - Habit frequency
 * @returns {{ newStreak: number, freezeUsed: boolean }}
 */
export const calculateStreak = (
  lastCompletedPeriod,
  currentStreak = 0,
  streakFreezes = 0,
  options = {}
) => {
  const frequency = options.frequency || (lastCompletedPeriod?.includes("-W") ? "weekly" : "daily");
  
  // Resolve current period from options or default to UTC
  let currentPeriod = options.currentPeriod;
  let previousPeriod = options.previousPeriod;

  if (!currentPeriod || !previousPeriod) {
    const periodInfo = getUserLocalPeriod("UTC", frequency);
    currentPeriod = currentPeriod || periodInfo.periodKey;
    previousPeriod = previousPeriod || periodInfo.previousPeriod;
  }

  // First completion ever
  if (!lastCompletedPeriod) {
    return { newStreak: 1, freezeUsed: false };
  }

  // Already completed in this exact period
  if (lastCompletedPeriod === currentPeriod) {
    return { newStreak: currentStreak, freezeUsed: false };
  }

  // Calculate discrete calendar difference
  const periodDiff = calculatePeriodDifference(currentPeriod, lastCompletedPeriod, frequency);

  // Consecutive period (e.g. yesterday for daily, last week for weekly)
  if (periodDiff === 1) {
    return { newStreak: currentStreak + 1, freezeUsed: false };
  }

  // Missed exactly one period (e.g. 2 days ago) and user has a freeze available
  if (periodDiff === 2 && streakFreezes > 0) {
    return { newStreak: currentStreak + 1, freezeUsed: true };
  }

  // Streak broken / reset to 1 on completion
  return { newStreak: 1, freezeUsed: false };
};

/**
 * RPG Level progression formula: Level = floor(sqrt(XP) * 0.2) + 1
 * Thresholds:
 * - Level 1: 0 XP
 * - Level 2: 25 XP
 * - Level 3: 100 XP
 * - Level 4: 225 XP
 * - Level 5: 400 XP
 * 
 * @param {number} [totalXP=0]
 * @returns {number} Level (minimum 1)
 */
export const calculateLevel = (totalXP = 0) => {
  if (totalXP <= 0) return 1;
  return Math.floor(Math.sqrt(totalXP) * 0.2) + 1;
};

/**
 * Calculates XP gained from a check-in and evaluates level updates.
 * Base XP is 10, plus a streak bonus capped at 20 XP.
 * 
 * @param {number} [currentXP=0]
 * @param {number} [currentLevel=1]
 * @param {number} [streak=1]
 * @returns {{ gainedXP: number, totalXP: number, newLevel: number, leveledUp: boolean }}
 */
export const calculateXPAndLevel = (currentXP = 0, currentLevel = 1, streak = 1) => {
  const baseXP = 10;
  const streakBonus = Math.min(Math.max(streak, 1) * 2, 20); // capped at 20 XP bonus
  const gainedXP = baseXP + streakBonus;
  const totalXP = currentXP + gainedXP;

  const newLevel = calculateLevel(totalXP);

  return {
    gainedXP,
    totalXP,
    newLevel,
    leveledUp: newLevel > currentLevel,
  };
};

/**
 * Evaluates achievement badge criteria against user stats and current streak.
 * 
 * @param {Object} user - User document or state
 * @param {number} streak - Active streak on checked habit
 * @param {number} [totalCompletions=1] - Total habit completions recorded for user
 * @returns {Array<{ name: string, description: string, icon: string }>}
 */
export const checkBadges = (user, streak, totalCompletions = 1) => {
  const existingBadgeNames = new Set((user?.badges || []).map((b) => b.name));
  const newBadges = [];

  // First completion badge
  if (totalCompletions >= 1 && !existingBadgeNames.has("First Step")) {
    newBadges.push({
      name: "First Step",
      description: "Completed your first habit check-in!",
      icon: "🌱",
    });
  }

  // 7-day streak badge
  if (streak >= 7 && !existingBadgeNames.has("Consistency King")) {
    newBadges.push({
      name: "Consistency King",
      description: "Reached a 7-day streak on any habit!",
      icon: "👑",
    });
  }

  // 30-day streak badge
  if (streak >= 30 && !existingBadgeNames.has("Iron Will")) {
    newBadges.push({
      name: "Iron Will",
      description: "Maintained a 30-day streak on any habit!",
      icon: "🛡️",
    });
  }

  // Century badge (100 total check-ins)
  if (totalCompletions >= 100 && !existingBadgeNames.has("Centurion")) {
    newBadges.push({
      name: "Centurion",
      description: "Logged 100 total habit check-ins!",
      icon: "💯",
    });
  }

  return newBadges;
};

/**
 * Calculates level progression details including XP thresholds, XP into current level,
 * XP remaining to next level, and the progress percentage (0 - 100).
 * 
 * In HabitForge's RPG leveling formula:
 * Level = floor(sqrt(totalXP) * 0.2) + 1
 * 
 * Therefore, for any level L:
 * minXP(L) = (5 * (L - 1))^2 = 25 * (L - 1)^2
 * minXP(L + 1) = (5 * L)^2 = 25 * L^2
 * 
 * Level 1: 0 to 24 XP (Requires 25 XP to reach Level 2)
 * Level 2: 25 to 99 XP (Requires 75 XP to reach Level 3)
 * Level 3: 100 to 224 XP (Requires 125 XP to reach Level 4)
 * Level 4: 225 to 399 XP (Requires 175 XP to reach Level 5)
 * Level L: Requires 25 * (2L - 1) XP to reach Level L + 1
 * 
 * @param {number} [totalXP=0] - Total accumulated XP
 * @param {number} [level] - Optional level override (defaults to calculateLevel(totalXP))
 * @returns {{
 *   currentLevel: number,
 *   nextLevel: number,
 *   currentLevelMinXp: number,
 *   nextLevelMinXp: number,
 *   xpIntoLevel: number,
 *   xpNeededForNext: number,
 *   xpRemaining: number,
 *   progressPercent: number
 * }}
 */
export const calculateLevelProgress = (totalXP = 0, level) => {
  const safeXP = Math.max(0, Math.floor(Number(totalXP) || 0));
  const computedLevel = calculateLevel(safeXP);
  const currentLevel = Math.max(1, Math.floor(Number(level) || computedLevel));

  const currentLevelMinXp = 25 * Math.pow(currentLevel - 1, 2);
  const nextLevelMinXp = 25 * Math.pow(currentLevel, 2);
  const xpNeededForNext = nextLevelMinXp - currentLevelMinXp; // = 25 * (2 * currentLevel - 1)

  // Clamp accumulated XP within the current level bounds
  const xpIntoLevel = Math.max(0, Math.min(xpNeededForNext, safeXP - currentLevelMinXp));
  const xpRemaining = Math.max(0, xpNeededForNext - xpIntoLevel);

  // Calculate percentage, safely clamped between 0 and 100
  const progressPercent = xpNeededForNext > 0
    ? Math.min(100, Math.max(0, Math.round((xpIntoLevel / xpNeededForNext) * 100)))
    : 100;

  return {
    currentLevel,
    nextLevel: currentLevel + 1,
    currentLevelMinXp,
    nextLevelMinXp,
    xpIntoLevel,
    xpNeededForNext,
    xpRemaining,
    progressPercent,
  };
};

/**
 * Calculates completion progress for active habits.
 * 
 * @param {Array<{ isArchived?: boolean, isCompletedToday?: boolean }>} habits
 * @returns {{
 *   total: number,
 *   completed: number,
 *   remaining: number,
 *   progressPercent: number,
 *   allCompleted: boolean
 * }}
 */
export const calculateDailyHabitProgress = (habits = []) => {
  const safeHabits = Array.isArray(habits) ? habits : [];
  const activeHabits = safeHabits.filter((h) => !h.isArchived);
  const total = activeHabits.length;
  const completed = activeHabits.filter((h) => Boolean(h.isCompletedToday)).length;
  const remaining = Math.max(0, total - completed);
  const progressPercent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

  return {
    total,
    completed,
    remaining,
    progressPercent,
    allCompleted: total > 0 && completed === total,
  };
};