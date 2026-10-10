import moment from "moment-timezone";

/**
 * Validates and sanitizes an IANA timezone string, falling back to 'UTC'.
 * @param {string} tz - IANA timezone identifier (e.g. 'America/New_York', 'Asia/Kolkata')
 * @returns {string} Safe IANA timezone
 */
export const sanitizeTimezone = (tz) => {
  if (tz && typeof tz === "string" && moment.tz.zone(tz)) {
    return tz;
  }
  return "UTC";
};

/**
 * Computes localized period identifiers for daily or weekly tracking.
 * @param {string} timezone - User's IANA timezone
 * @param {'daily'|'weekly'} frequency - Habit frequency
 * @param {Date|string|number} [referenceDate=new Date()] - Reference timestamp
 * @returns {{ frequency: string, periodKey: string, previousPeriod: string, date: string, timezone: string }}
 */
export const getUserLocalPeriod = (
  timezone = "UTC",
  frequency = "daily",
  referenceDate = new Date()
) => {
  const safeTz = sanitizeTimezone(timezone);
  const m = moment(referenceDate).tz(safeTz);
  const dateStr = m.format("YYYY-MM-DD");

  if (frequency === "weekly") {
    const currentPeriod = `${m.isoWeekYear()}-W${String(m.isoWeek()).padStart(2, "0")}`;
    const prevM = m.clone().subtract(1, "isoWeek");
    const previousPeriod = `${prevM.isoWeekYear()}-W${String(prevM.isoWeek()).padStart(2, "0")}`;

    return {
      frequency: "weekly",
      periodKey: currentPeriod,
      previousPeriod,
      date: dateStr,
      timezone: safeTz,
    };
  }

  // Daily default
  const currentPeriod = dateStr;
  const previousPeriod = m.clone().subtract(1, "day").format("YYYY-MM-DD");

  return {
    frequency: "daily",
    periodKey: currentPeriod,
    previousPeriod,
    date: dateStr,
    timezone: safeTz,
  };
};

/**
 * Calculates the exact discrete difference in calendar periods (days or weeks)
 * between two period keys.
 * @param {string} currentPeriod - Current period string ('YYYY-MM-DD' or 'YYYY-Www')
 * @param {string} lastCompletedPeriod - Last recorded period string
 * @param {'daily'|'weekly'} frequency - Habit frequency
 * @returns {number|null} Difference in discrete periods (e.g., 1 for consecutive, 0 for same period)
 */
export const calculatePeriodDifference = (
  currentPeriod,
  lastCompletedPeriod,
  frequency = "daily"
) => {
  if (!lastCompletedPeriod || !currentPeriod) return null;

  if (frequency === "weekly") {
    const [currYear, currWeek] = currentPeriod.split("-W").map(Number);
    const [lastYear, lastWeek] = lastCompletedPeriod.split("-W").map(Number);

    const mCurr = moment()
      .isoWeekYear(currYear)
      .isoWeek(currWeek)
      .startOf("isoWeek");
    const mLast = moment()
      .isoWeekYear(lastYear)
      .isoWeek(lastWeek)
      .startOf("isoWeek");

    return Math.round(mCurr.diff(mLast, "weeks", true));
  }

  // Daily: format YYYY-MM-DD
  const mCurr = moment.utc(currentPeriod, "YYYY-MM-DD").startOf("day");
  const mLast = moment.utc(lastCompletedPeriod, "YYYY-MM-DD").startOf("day");

  return Math.round(mCurr.diff(mLast, "days", true));
};
