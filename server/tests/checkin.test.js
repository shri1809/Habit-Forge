import { describe, it, expect } from "vitest";
import {
  calculateStreak,
  calculateXPAndLevel,
  calculateLevel,
} from "../utils/gamification.js";
import { getUserLocalPeriod } from "../utils/timezone.js";

describe("Check-in Engine & Idempotency Rules", () => {
  it("resolves period keys based on habit frequency and user timezone", () => {
    const fixedTime = new Date("2026-09-23T14:30:00Z");

    const dailyUTC = getUserLocalPeriod("UTC", "daily", fixedTime);
    expect(dailyUTC.periodKey).toBe("2026-09-23");
    expect(dailyUTC.previousPeriod).toBe("2026-09-22");

    const weeklyUTC = getUserLocalPeriod("UTC", "weekly", fixedTime);
    expect(weeklyUTC.periodKey).toBe("2026-W39");
    expect(weeklyUTC.previousPeriod).toBe("2026-W38");

    // Crossing midnight into next day in Tokyo (UTC+9)
    const dailyTokyo = getUserLocalPeriod("Asia/Tokyo", "daily", fixedTime);
    expect(dailyTokyo.periodKey).toBe("2026-09-23"); // 14:30 UTC is 23:30 Tokyo
  });

  it("idempotently handles consecutive check-in attempts in the same period without modifying streak", () => {
    const currentPeriod = "2026-09-23";
    const previousPeriod = "2026-09-22";

    // First attempt today (completed yesterday)
    const firstCheckIn = calculateStreak("2026-09-22", 4, 0, {
      currentPeriod,
      previousPeriod,
      frequency: "daily",
    });
    expect(firstCheckIn).toEqual({ newStreak: 5, freezeUsed: false });

    // Second (duplicate/rapid retry) attempt on the same day
    const duplicateCheckIn = calculateStreak(currentPeriod, 5, 0, {
      currentPeriod,
      previousPeriod,
      frequency: "daily",
    });
    expect(duplicateCheckIn).toEqual({ newStreak: 5, freezeUsed: false });
  });

  it("handles missed periods deterministically", () => {
    const currentPeriod = "2026-09-23";
    const previousPeriod = "2026-09-22";

    // Missed 1 day with no freezes -> streak resets to 1 on check-in
    const resetCheckIn = calculateStreak("2026-09-21", 12, 0, {
      currentPeriod,
      previousPeriod,
      frequency: "daily",
    });
    expect(resetCheckIn.newStreak).toBe(1);
    expect(resetCheckIn.freezeUsed).toBe(false);

    // Missed 1 day with 1 freeze available -> streak preserved and incremented to 13
    const freezeCheckIn = calculateStreak("2026-09-21", 12, 1, {
      currentPeriod,
      previousPeriod,
      frequency: "daily",
    });
    expect(freezeCheckIn.newStreak).toBe(13);
    expect(freezeCheckIn.freezeUsed).toBe(true);

    // Missed multiple days -> streak resets even if freezes exist
    const multiMissCheckIn = calculateStreak("2026-09-15", 12, 3, {
      currentPeriod,
      previousPeriod,
      frequency: "daily",
    });
    expect(multiMissCheckIn.newStreak).toBe(1);
    expect(multiMissCheckIn.freezeUsed).toBe(false);
  });

  it("calculates XP and level increases according to RPG square-root formula", () => {
    // Check-in with streak = 1 -> Gained XP: 10 + 2 = 12
    const check1 = calculateXPAndLevel(0, 1, 1);
    expect(check1.gainedXP).toBe(12);
    expect(check1.totalXP).toBe(12);
    expect(check1.newLevel).toBe(1);
    expect(check1.leveledUp).toBe(false);

    // Starting at 15 XP, checking in with streak 5 -> Gained: 10 + 10 = 20 -> Total 35 XP
    // Level 2 threshold is 25 XP (sqrt(25)*0.2 + 1 = 2)
    const check2 = calculateXPAndLevel(15, 1, 5);
    expect(check2.gainedXP).toBe(20);
    expect(check2.totalXP).toBe(35);
    expect(check2.newLevel).toBe(2);
    expect(check2.leveledUp).toBe(true);
  });
});
