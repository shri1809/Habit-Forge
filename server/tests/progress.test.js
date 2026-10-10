import { describe, it, expect } from "vitest";
import {
  calculateLevel,
  calculateLevelProgress,
  calculateDailyHabitProgress,
} from "../utils/gamification.js";

describe("progressPercent & Level Progress Calculations", () => {
  describe("Level 1 Progress (0 - 24 XP, Target 25 XP)", () => {
    it("starts at 0% for 0 XP", () => {
      const result = calculateLevelProgress(0, 1);
      expect(result.currentLevel).toBe(1);
      expect(result.nextLevel).toBe(2);
      expect(result.currentLevelMinXp).toBe(0);
      expect(result.nextLevelMinXp).toBe(25);
      expect(result.xpNeededForNext).toBe(25);
      expect(result.xpIntoLevel).toBe(0);
      expect(result.xpRemaining).toBe(25);
      expect(result.progressPercent).toBe(0);
    });

    it("calculates exact progress at 12 XP (48%)", () => {
      const result = calculateLevelProgress(12, 1);
      expect(result.xpIntoLevel).toBe(12);
      expect(result.xpRemaining).toBe(13);
      expect(result.progressPercent).toBe(48); // Math.round((12 / 25) * 100) = 48
    });

    it("calculates exact progress at 24 XP (96%)", () => {
      const result = calculateLevelProgress(24, 1);
      expect(result.xpIntoLevel).toBe(24);
      expect(result.xpRemaining).toBe(1);
      expect(result.progressPercent).toBe(96); // Math.round((24 / 25) * 100) = 96
    });
  });

  describe("Level 2 Progress (25 - 99 XP, Target 100 XP, 75 XP Span)", () => {
    it("resets to 0% immediately upon crossing into Level 2 at 25 XP", () => {
      const result = calculateLevelProgress(25, 2);
      expect(result.currentLevel).toBe(2);
      expect(result.nextLevel).toBe(3);
      expect(result.currentLevelMinXp).toBe(25);
      expect(result.nextLevelMinXp).toBe(100);
      expect(result.xpNeededForNext).toBe(75);
      expect(result.xpIntoLevel).toBe(0);
      expect(result.xpRemaining).toBe(75);
      expect(result.progressPercent).toBe(0);
    });

    it("calculates mid-level progress accurately at 62 XP (49%)", () => {
      // (62 - 25) = 37 XP into level. 37 / 75 = 0.4933 -> 49%
      const result = calculateLevelProgress(62, 2);
      expect(result.xpIntoLevel).toBe(37);
      expect(result.xpRemaining).toBe(38);
      expect(result.progressPercent).toBe(49);
    });

    it("calculates late-level progress accurately at 99 XP (99%)", () => {
      // (99 - 25) = 74 XP into level. 74 / 75 = 0.9866 -> 99%
      const result = calculateLevelProgress(99, 2);
      expect(result.xpIntoLevel).toBe(74);
      expect(result.xpRemaining).toBe(1);
      expect(result.progressPercent).toBe(99);
    });
  });

  describe("Level 3 Progress (100 - 224 XP, Target 225 XP, 125 XP Span)", () => {
    it("resets to 0% at 100 XP", () => {
      const result = calculateLevelProgress(100, 3);
      expect(result.currentLevel).toBe(3);
      expect(result.nextLevel).toBe(4);
      expect(result.currentLevelMinXp).toBe(100);
      expect(result.nextLevelMinXp).toBe(225);
      expect(result.xpNeededForNext).toBe(125);
      expect(result.xpIntoLevel).toBe(0);
      expect(result.xpRemaining).toBe(125);
      expect(result.progressPercent).toBe(0);
    });

    it("calculates exact 50% midpoint at 162 XP", () => {
      // (162 - 100) = 62 XP into level. 62 / 125 = 0.496 -> 50%
      const result = calculateLevelProgress(162, 3);
      expect(result.xpIntoLevel).toBe(62);
      expect(result.progressPercent).toBe(50);
    });
  });

  describe("Higher Levels (Level 4, 5, 10)", () => {
    it("accurately calculates Level 4 thresholds (225 to 400 XP, 175 XP Span)", () => {
      const result = calculateLevelProgress(225);
      expect(result.currentLevel).toBe(4);
      expect(result.nextLevel).toBe(5);
      expect(result.currentLevelMinXp).toBe(225);
      expect(result.nextLevelMinXp).toBe(400);
      expect(result.xpNeededForNext).toBe(175);
      expect(result.progressPercent).toBe(0);
    });

    it("accurately calculates Level 10 thresholds (2025 to 2500 XP, 475 XP Span)", () => {
      // minXP(10) = 25 * 9^2 = 2025 XP
      // minXP(11) = 25 * 10^2 = 2500 XP
      const result = calculateLevelProgress(2025);
      expect(result.currentLevel).toBe(10);
      expect(result.nextLevel).toBe(11);
      expect(result.currentLevelMinXp).toBe(2025);
      expect(result.nextLevelMinXp).toBe(2500);
      expect(result.xpNeededForNext).toBe(475);
      expect(result.progressPercent).toBe(0);
    });
  });

  describe("Edge Cases & Robustness", () => {
    it("handles negative and zero XP gracefully", () => {
      const negativeResult = calculateLevelProgress(-100);
      expect(negativeResult.progressPercent).toBe(0);
      expect(negativeResult.xpIntoLevel).toBe(0);
      expect(negativeResult.currentLevel).toBe(1);

      const zeroResult = calculateLevelProgress(0);
      expect(zeroResult.progressPercent).toBe(0);
    });

    it("handles undefined, null, or non-numeric inputs", () => {
      const undefResult = calculateLevelProgress(undefined);
      expect(undefResult.progressPercent).toBe(0);
      expect(undefResult.currentLevel).toBe(1);

      const nullResult = calculateLevelProgress(null);
      expect(nullResult.progressPercent).toBe(0);

      const strResult = calculateLevelProgress("50");
      expect(strResult.currentLevel).toBe(2);
      expect(strResult.xpIntoLevel).toBe(25);
    });

    it("clamps progress safely when user level is out of sync with XP", () => {
      // User is level 2, but has only 10 XP: clamps to 0% without negative numbers
      const underXp = calculateLevelProgress(10, 2);
      expect(underXp.xpIntoLevel).toBe(0);
      expect(underXp.progressPercent).toBe(0);

      // User is level 1, but has 40 XP: clamps to 100% without overflowing
      const overXp = calculateLevelProgress(40, 1);
      expect(overXp.xpIntoLevel).toBe(25);
      expect(overXp.progressPercent).toBe(100);
    });

    it("guarantees progressPercent is always an integer between 0 and 100", () => {
      for (let xp = 0; xp <= 1000; xp += 7) {
        const res = calculateLevelProgress(xp);
        expect(res.progressPercent).toBeGreaterThanOrEqual(0);
        expect(res.progressPercent).toBeLessThanOrEqual(100);
        expect(Number.isInteger(res.progressPercent)).toBe(true);
        expect(res.xpRemaining).toBe(res.xpNeededForNext - res.xpIntoLevel);
      }
    });
  });

  describe("Daily Habit Progress Calculations", () => {
    it("returns 0% for empty habits array", () => {
      const result = calculateDailyHabitProgress([]);
      expect(result).toEqual({
        total: 0,
        completed: 0,
        remaining: 0,
        progressPercent: 0,
        allCompleted: false,
      });
    });

    it("correctly calculates partial completions (e.g. 2 of 4 = 50%)", () => {
      const habits = [
        { title: "Habit 1", isCompletedToday: true, isArchived: false },
        { title: "Habit 2", isCompletedToday: false, isArchived: false },
        { title: "Habit 3", isCompletedToday: true, isArchived: false },
        { title: "Habit 4", isCompletedToday: false, isArchived: false },
      ];
      const result = calculateDailyHabitProgress(habits);
      expect(result.total).toBe(4);
      expect(result.completed).toBe(2);
      expect(result.remaining).toBe(2);
      expect(result.progressPercent).toBe(50);
      expect(result.allCompleted).toBe(false);
    });

    it("returns 100% and allCompleted=true when all active habits are done", () => {
      const habits = [
        { title: "Habit 1", isCompletedToday: true, isArchived: false },
        { title: "Habit 2", isCompletedToday: true, isArchived: false },
      ];
      const result = calculateDailyHabitProgress(habits);
      expect(result.total).toBe(2);
      expect(result.completed).toBe(2);
      expect(result.progressPercent).toBe(100);
      expect(result.allCompleted).toBe(true);
    });

    it("ignores archived habits in daily completion calculations", () => {
      const habits = [
        { title: "Active 1", isCompletedToday: true, isArchived: false },
        { title: "Active 2", isCompletedToday: false, isArchived: false },
        { title: "Archived 1", isCompletedToday: false, isArchived: true },
        { title: "Archived 2", isCompletedToday: true, isArchived: true },
      ];
      const result = calculateDailyHabitProgress(habits);
      expect(result.total).toBe(2);
      expect(result.completed).toBe(1);
      expect(result.progressPercent).toBe(50);
    });
  });

  describe("Habit Deletion: XP Deduction and Reactive Progress Recalculation", () => {
    it("deducts habit completion XP and recalculates level & level progress percentage accurately", () => {
      // User initially has 35 XP (Level 2: 25-99 XP range)
      let userXp = 35;
      let userLevel = calculateLevel(userXp);
      expect(userLevel).toBe(2);

      const initialLevelProgress = calculateLevelProgress(userXp, userLevel);
      // 35 - 25 = 10 XP into Level 2. 10 / 75 = 13%
      expect(initialLevelProgress.progressPercent).toBe(13);
      expect(initialLevelProgress.xpIntoLevel).toBe(10);

      // Deleting a habit that had 2 completions (20 XP)
      const completionsToDelete = [{ xpEarned: 10 }, { xpEarned: 10 }];
      const xpToDeduct = completionsToDelete.reduce((sum, c) => sum + c.xpEarned, 0);
      expect(xpToDeduct).toBe(20);

      userXp = Math.max(0, userXp - xpToDeduct);
      userLevel = calculateLevel(userXp);

      expect(userXp).toBe(15);
      expect(userLevel).toBe(1); // Dropped back to Level 1

      // Recalculated level progress for Level 1 (0-24 XP range)
      const updatedLevelProgress = calculateLevelProgress(userXp, userLevel);
      expect(updatedLevelProgress.progressPercent).toBe(60); // 15 / 25 = 60%
      expect(updatedLevelProgress.xpIntoLevel).toBe(15);
      expect(updatedLevelProgress.xpRemaining).toBe(10);
    });

    it("floors XP at 0 when deducted XP exceeds user total XP", () => {
      let userXp = 15;
      const xpToDeduct = 30;

      userXp = Math.max(0, userXp - xpToDeduct);
      const userLevel = calculateLevel(userXp);
      const progress = calculateLevelProgress(userXp, userLevel);

      expect(userXp).toBe(0);
      expect(userLevel).toBe(1);
      expect(progress.progressPercent).toBe(0);
    });

    it("immediately recalculates daily habit progress when an incomplete habit is deleted", () => {
      const habits = [
        { _id: "h1", title: "Habit 1", isCompletedToday: true, isArchived: false },
        { _id: "h2", title: "Habit 2", isCompletedToday: false, isArchived: false },
      ];

      const beforeDelete = calculateDailyHabitProgress(habits);
      expect(beforeDelete.progressPercent).toBe(50);
      expect(beforeDelete.allCompleted).toBe(false);

      // Delete incomplete habit h2 without refresh
      const afterDeleteHabits = habits.filter((h) => h._id !== "h2");
      const afterDelete = calculateDailyHabitProgress(afterDeleteHabits);
      expect(afterDelete.total).toBe(1);
      expect(afterDelete.completed).toBe(1);
      expect(afterDelete.progressPercent).toBe(100);
      expect(afterDelete.allCompleted).toBe(true);
    });

    it("immediately recalculates daily habit progress when a completed habit is deleted", () => {
      const habits = [
        { _id: "h1", title: "Habit 1", isCompletedToday: true, isArchived: false },
        { _id: "h2", title: "Habit 2", isCompletedToday: true, isArchived: false },
        { _id: "h3", title: "Habit 3", isCompletedToday: false, isArchived: false },
      ];

      const beforeDelete = calculateDailyHabitProgress(habits);
      expect(beforeDelete.progressPercent).toBe(67);

      // Delete completed habit h2 without refresh
      const afterDeleteHabits = habits.filter((h) => h._id !== "h2");
      const afterDelete = calculateDailyHabitProgress(afterDeleteHabits);
      expect(afterDelete.total).toBe(2);
      expect(afterDelete.completed).toBe(1);
      expect(afterDelete.progressPercent).toBe(50);
      expect(afterDelete.allCompleted).toBe(false);
    });
  });
});


