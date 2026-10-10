/**
 * Client-side Gamification Utilities
 * Synchronized with server/utils/gamification.js RPG Level Formulas
 */

/**
 * RPG Level progression formula: Level = floor(sqrt(XP) * 0.2) + 1
 * 
 * @param {number} [totalXP=0]
 * @returns {number} Level (minimum 1)
 */
export const calculateLevel = (totalXP = 0) => {
  const safeXP = Math.max(0, Math.floor(Number(totalXP) || 0));
  if (safeXP <= 0) return 1;
  return Math.floor(Math.sqrt(safeXP) * 0.2) + 1;
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

