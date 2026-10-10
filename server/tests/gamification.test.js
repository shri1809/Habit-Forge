import { describe, it, expect } from "vitest";
import {
  calculateStreak,
  calculateLevel,
  calculateXPAndLevel,
  checkBadges,
} from "../utils/gamification.js";

describe("Gamification Utility Functions", () => {
  describe("calculateStreak - Daily Habits", () => {
    it("starts streak at 1 for the first check-in ever", () => {
      const result = calculateStreak(null, 0, 0);
      expect(result).toEqual({ newStreak: 1, freezeUsed: false });
    });

    it("keeps streak unchanged if already completed in the current period", () => {
      const result = calculateStreak("2026-09-23", 5, 0, {
        currentPeriod: "2026-09-23",
        previousPeriod: "2026-09-22",
        frequency: "daily",
      });
      expect(result).toEqual({ newStreak: 5, freezeUsed: false });
    });

    it("increments streak when check-in is consecutive (yesterday)", () => {
      const result = calculateStreak("2026-09-22", 3, 0, {
        currentPeriod: "2026-09-23",
        previousPeriod: "2026-09-22",
        frequency: "daily",
      });
      expect(result).toEqual({ newStreak: 4, freezeUsed: false });
    });

    it("uses a streak freeze if exactly one day was missed (2 days ago)", () => {
      const result = calculateStreak("2026-09-21", 5, 1, {
        currentPeriod: "2026-09-23",
        previousPeriod: "2026-09-22",
        frequency: "daily",
      });
      expect(result).toEqual({ newStreak: 6, freezeUsed: true });
    });

    it("resets streak to 1 if missed one day without freezes available", () => {
      const result = calculateStreak("2026-09-21", 5, 0, {
        currentPeriod: "2026-09-23",
        previousPeriod: "2026-09-22",
        frequency: "daily",
      });
      expect(result).toEqual({ newStreak: 1, freezeUsed: false });
    });

    it("resets streak to 1 if multiple days were missed even with freeze available", () => {
      const result = calculateStreak("2026-09-18", 10, 2, {
        currentPeriod: "2026-09-23",
        previousPeriod: "2026-09-22",
        frequency: "daily",
      });
      expect(result).toEqual({ newStreak: 1, freezeUsed: false });
    });
  });

  describe("calculateStreak - Weekly Habits", () => {
    it("starts weekly streak at 1 on first completion", () => {
      const result = calculateStreak(null, 0, 0, {
        currentPeriod: "2026-W38",
        previousPeriod: "2026-W37",
        frequency: "weekly",
      });
      expect(result).toEqual({ newStreak: 1, freezeUsed: false });
    });

    it("increments weekly streak if last completed in previous week", () => {
      const result = calculateStreak("2026-W37", 4, 0, {
        currentPeriod: "2026-W38",
        previousPeriod: "2026-W37",
        frequency: "weekly",
      });
      expect(result).toEqual({ newStreak: 5, freezeUsed: false });
    });

    it("keeps weekly streak if checked again in same week", () => {
      const result = calculateStreak("2026-W38", 4, 0, {
        currentPeriod: "2026-W38",
        previousPeriod: "2026-W37",
        frequency: "weekly",
      });
      expect(result).toEqual({ newStreak: 4, freezeUsed: false });
    });

    it("resets weekly streak to 1 if a week was skipped without freeze", () => {
      const result = calculateStreak("2026-W36", 4, 0, {
        currentPeriod: "2026-W38",
        previousPeriod: "2026-W37",
        frequency: "weekly",
      });
      expect(result).toEqual({ newStreak: 1, freezeUsed: false });
    });
  });

  describe("calculateLevel (RPG Sqrt Formula)", () => {
    it("returns level 1 for 0 XP and below", () => {
      expect(calculateLevel(0)).toBe(1);
      expect(calculateLevel(-5)).toBe(1);
    });

    it("reaches Level 2 at 25 XP threshold", () => {
      expect(calculateLevel(24)).toBe(1);
      expect(calculateLevel(25)).toBe(2);
    });

    it("reaches Level 3 at 100 XP threshold", () => {
      expect(calculateLevel(99)).toBe(2);
      expect(calculateLevel(100)).toBe(3);
    });

    it("reaches Level 4 at 225 XP and Level 5 at 400 XP", () => {
      expect(calculateLevel(225)).toBe(4);
      expect(calculateLevel(400)).toBe(5);
    });
  });

  describe("calculateXPAndLevel", () => {
    it("calculates gained XP with capped streak bonus", () => {
      // Base XP = 10, Streak Bonus = min(5 * 2, 20) = 10 -> Total Gained = 20
      const result = calculateXPAndLevel(0, 1, 5);
      expect(result.gainedXP).toBe(20);
      expect(result.totalXP).toBe(20);
      expect(result.newLevel).toBe(1);
      expect(result.leveledUp).toBe(false);
    });

    it("caps streak bonus at 20 XP for long streaks", () => {
      // Base XP = 10, Streak Bonus capped at 20 -> Gained = 30
      const result = calculateXPAndLevel(0, 1, 25);
      expect(result.gainedXP).toBe(30);
    });

    it("correctly triggers level up when crossing RPG threshold", () => {
      // Starting with 20 XP (Level 1), gaining 16 XP -> 36 XP (Level 2)
      const result = calculateXPAndLevel(20, 1, 3);
      expect(result.gainedXP).toBe(16);
      expect(result.totalXP).toBe(36);
      expect(result.newLevel).toBe(2);
      expect(result.leveledUp).toBe(true);
    });
  });

  describe("checkBadges", () => {
    it("awards 'First Step' on initial check-in", () => {
      const user = { badges: [] };
      const newBadges = checkBadges(user, 1, 1);
      expect(newBadges.some((b) => b.name === "First Step")).toBe(true);
    });

    it("awards 'Consistency King' when streak hits 7", () => {
      const user = { badges: [{ name: "First Step" }] };
      const newBadges = checkBadges(user, 7, 7);
      expect(newBadges.some((b) => b.name === "Consistency King")).toBe(true);
    });

    it("awards 'Iron Will' when streak hits 30", () => {
      const user = {
        badges: [{ name: "First Step" }, { name: "Consistency King" }],
      };
      const newBadges = checkBadges(user, 30, 30);
      expect(newBadges.some((b) => b.name === "Iron Will")).toBe(true);
    });

    it("does not re-award already earned badges", () => {
      const user = {
        badges: [
          { name: "First Step" },
          { name: "Consistency King" },
          { name: "Iron Will" },
        ],
      };
      const newBadges = checkBadges(user, 30, 30);
      expect(newBadges.length).toBe(0);
    });
  });
});