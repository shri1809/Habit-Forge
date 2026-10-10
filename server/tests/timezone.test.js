import { describe, it, expect } from "vitest";
import {
  getUserLocalPeriod,
  calculatePeriodDifference,
  sanitizeTimezone,
} from "../utils/timezone.js";

describe("Timezone Utilities", () => {
  it("sanitizes invalid or empty timezone to UTC", () => {
    expect(sanitizeTimezone("")).toBe("UTC");
    expect(sanitizeTimezone(null)).toBe("UTC");
    expect(sanitizeTimezone("Invalid/Zone")).toBe("UTC");
    expect(sanitizeTimezone("America/New_York")).toBe("America/New_York");
    expect(sanitizeTimezone("Asia/Tokyo")).toBe("Asia/Tokyo");
  });

  it("calculates accurate daily local periods across timezones for the same instant", () => {
    // 2026-09-23T23:30:00Z:
    // In UTC: 2026-09-23
    // In Tokyo (UTC+9): 2026-09-24 08:30:00 -> Date is 2026-09-24!
    // In New York (UTC-4 EDT): 2026-09-23 19:30:00 -> Date is 2026-09-23!
    const testInstant = new Date("2026-09-23T23:30:00Z");

    const utcPeriod = getUserLocalPeriod("UTC", "daily", testInstant);
    expect(utcPeriod.periodKey).toBe("2026-09-23");
    expect(utcPeriod.previousPeriod).toBe("2026-09-22");

    const tokyoPeriod = getUserLocalPeriod("Asia/Tokyo", "daily", testInstant);
    expect(tokyoPeriod.periodKey).toBe("2026-09-24");
    expect(tokyoPeriod.previousPeriod).toBe("2026-09-23");

    const nyPeriod = getUserLocalPeriod("America/New_York", "daily", testInstant);
    expect(nyPeriod.periodKey).toBe("2026-09-23");
    expect(nyPeriod.previousPeriod).toBe("2026-09-22");
  });

  it("calculates weekly ISO periods correctly", () => {
    // 2026-09-23 is a Wednesday in Week 39 of 2026
    const testInstant = new Date("2026-09-23T12:00:00Z");
    const weeklyPeriod = getUserLocalPeriod("UTC", "weekly", testInstant);
    expect(weeklyPeriod.periodKey).toBe("2026-W39");
    expect(weeklyPeriod.previousPeriod).toBe("2026-W38");
  });

  it("calculates discrete period difference accurately for daily and weekly habits", () => {
    expect(calculatePeriodDifference("2026-09-23", "2026-09-23", "daily")).toBe(0);
    expect(calculatePeriodDifference("2026-09-23", "2026-09-22", "daily")).toBe(1);
    expect(calculatePeriodDifference("2026-09-23", "2026-09-21", "daily")).toBe(2);
    expect(calculatePeriodDifference("2026-09-23", "2026-09-15", "daily")).toBe(8);

    expect(calculatePeriodDifference("2026-W39", "2026-W39", "weekly")).toBe(0);
    expect(calculatePeriodDifference("2026-W39", "2026-W38", "weekly")).toBe(1);
    expect(calculatePeriodDifference("2026-W39", "2026-W37", "weekly")).toBe(2);
  });
});
