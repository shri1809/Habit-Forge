/**
 * seedDemo.js — HabitForge Demo Account Seeder
 *
 * Creates (or resets) a demo account with 90 days of realistic habit history.
 *
 * Usage:
 *   node server/scripts/seedDemo.js          (from project root)
 *   node scripts/seedDemo.js                 (from server/)
 *
 * The script is idempotent: running it again wipes and re-creates the demo data.
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// ── Models (import after dotenv so DB URI is available) ────────────────────────
import User from "../models/User.js";
import Habit from "../models/Habit.js";
import HabitCompletion from "../models/HabitCompletion.js";

// ── Config ─────────────────────────────────────────────────────────────────────
const DEMO_EMAIL = "demo@habitforge.app";
const DEMO_PASSWORD = "Demo@1234";
const DEMO_NAME = "Alex Forge";
const DEMO_TIMEZONE = "Asia/Kolkata";
const HISTORY_DAYS = 90;

/**
 * Deterministic pseudo-random using a seeded value so the history
 * is consistent across re-runs (same missed days each time).
 */
function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

/** Returns a YYYY-MM-DD string for `daysAgo` days before today (UTC). */
function dateStringDaysAgo(daysAgo) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/** Returns the ISO week period key ('YYYY-Www') for a date string. */
function isoWeekKey(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  const jan4 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7));
  const diff = d - startOfWeek1;
  const weekNum = Math.floor(diff / (7 * 24 * 3600 * 1000)) + 1;
  const year = d.getUTCMonth() === 11 && weekNum >= 52 ? d.getUTCFullYear() : d.getUTCFullYear();
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
}

/** Returns a Date object for a given YYYY-MM-DD string at a random morning hour. */
function completedAtForDate(dateStr, rng) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCHours(Math.floor(rng() * 14) + 5); // 05:00 – 18:59 UTC
  d.setUTCMinutes(Math.floor(rng() * 60));
  return d;
}

async function main() {
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/habitforge";
  console.log("🔌 Connecting to MongoDB…");
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
  console.log(`✅ Connected: ${mongoose.connection.host}`);

  // ── Wipe existing demo data ──────────────────────────────────────────────────
  const existing = await User.findOne({ email: DEMO_EMAIL });
  if (existing) {
    const habitIds = (await Habit.find({ user: existing._id })).map((h) => h._id);
    await HabitCompletion.deleteMany({ habit: { $in: habitIds } });
    await Habit.deleteMany({ user: existing._id });
    await User.deleteOneById(existing._id).catch(() =>
      User.findByIdAndDelete(existing._id)
    );
    console.log("🗑️  Cleared existing demo account.");
  }

  // ── Create demo user ─────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = new User({
    name: DEMO_NAME,
    email: DEMO_EMAIL,
    password: passwordHash,
    isVerified: true,
    timezone: DEMO_TIMEZONE,
    level: 1,
    xp: 0,
    streakFreezes: 2,
    badges: [],
    isPremium: false,
  });
  // Skip the pre-save hash (password is already hashed above)
  await User.collection.insertOne({
    name: user.name,
    email: user.email,
    password: passwordHash,
    isVerified: true,
    timezone: DEMO_TIMEZONE,
    level: 1,
    xp: 0,
    streakFreezes: 2,
    badges: [],
    isPremium: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const demoUser = await User.findOne({ email: DEMO_EMAIL });
  console.log(`👤 Created demo user: ${DEMO_EMAIL}`);

  // ── Define habits ────────────────────────────────────────────────────────────
  const habitDefs = [
    {
      title: "Morning Run 🏃",
      description: "30-minute jog before breakfast",
      category: "Health",
      color: "#10B981",
      icon: "Zap",
      frequency: "daily",
      completionRate: 0.88,  // ~88% completion over 90 days
      missGap: [30, 60],     // deterministic miss at day 30 and day 60 (2-day gaps, freeze used)
    },
    {
      title: "LeetCode Practice 💻",
      description: "Solve at least one algorithm problem",
      category: "Coding",
      color: "#6366F1",
      icon: "Code",
      frequency: "daily",
      completionRate: 0.80,
      missGap: [45],
    },
    {
      title: "Read 20 Pages 📚",
      description: "Non-fiction or technical book",
      category: "Study",
      color: "#F59E0B",
      icon: "BookOpen",
      frequency: "daily",
      completionRate: 0.75,
      missGap: [15, 55, 70],
    },
    {
      title: "10-Minute Meditation 🧘",
      description: "Morning mindfulness session",
      category: "Mindset",
      color: "#8B5CF6",
      icon: "Brain",
      frequency: "daily",
      completionRate: 0.85,
      missGap: [20, 65],
    },
    {
      title: "Weekly Project Review 📋",
      description: "Review progress on side project goals",
      category: "General",
      color: "#EC4899",
      icon: "Target",
      frequency: "weekly",
      completionRate: 0.90,
      missGap: [],
    },
  ];

  let totalXP = 0;
  let globalCompletions = 0;
  const badgeSet = new Set();

  for (const def of habitDefs) {
    const habit = await Habit.create({
      user: demoUser._id,
      title: def.title,
      description: def.description,
      category: def.category,
      color: def.color,
      icon: def.icon || "Zap",
      frequency: def.frequency,
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedPeriod: null,
    });

    const rng = seededRandom(def.title.charCodeAt(0) * 31 + def.title.length);
    const completionDocs = [];

    let currentStreak = 0;
    let longestStreak = 0;
    let lastPeriod = null;

    if (def.frequency === "daily") {
      // Build daily completions over HISTORY_DAYS (from oldest to newest)
      for (let daysAgo = HISTORY_DAYS - 1; daysAgo >= 0; daysAgo--) {
        const dateStr = dateStringDaysAgo(daysAgo);
        const shouldMiss =
          def.missGap.includes(daysAgo) ||             // forced miss at specific gaps
          rng() > def.completionRate;                  // probabilistic miss

        if (shouldMiss) {
          // Apply streak freeze if exactly 1 period would be missed and we have freezes
          const diff = lastPeriod
            ? Math.round((new Date(dateStr) - new Date(lastPeriod)) / 86400000)
            : null;
          if (diff !== null && diff > 2) {
            currentStreak = 1; // reset only on multi-day gaps (freeze already used at 2)
          }
          continue;
        }

        // Check idempotency
        const alreadyExists = completionDocs.some((c) => c.periodKey === dateStr);
        if (alreadyExists) continue;

        // Streak calculation
        if (!lastPeriod) {
          currentStreak = 1;
        } else {
          const diff = Math.round((new Date(dateStr) - new Date(lastPeriod)) / 86400000);
          if (diff === 1) {
            currentStreak += 1;
          } else if (diff === 2 && demoUser.streakFreezes > 0) {
            currentStreak += 1; // freeze applied
          } else {
            currentStreak = 1;
          }
        }
        longestStreak = Math.max(longestStreak, currentStreak);
        lastPeriod = dateStr;

        // XP formula
        const streakBonus = Math.min(currentStreak * 2, 20);
        const xpEarned = 10 + streakBonus;
        totalXP += xpEarned;
        globalCompletions += 1;

        completionDocs.push({
          habit: habit._id,
          user: demoUser._id,
          periodKey: dateStr,
          date: dateStr,
          xpEarned,
          completedAt: completedAtForDate(dateStr, rng),
          createdAt: completedAtForDate(dateStr, rng),
          updatedAt: completedAtForDate(dateStr, rng),
        });
      }
    } else {
      // Weekly habit — build week-keyed completions
      const seenWeeks = new Set();
      for (let daysAgo = HISTORY_DAYS - 1; daysAgo >= 0; daysAgo -= 7) {
        const dateStr = dateStringDaysAgo(daysAgo);
        const weekKey = isoWeekKey(dateStr);
        if (seenWeeks.has(weekKey)) continue;
        seenWeeks.add(weekKey);

        if (rng() > def.completionRate) continue;

        if (!lastPeriod) {
          currentStreak = 1;
        } else {
          currentStreak += 1;
        }
        longestStreak = Math.max(longestStreak, currentStreak);
        lastPeriod = weekKey;

        const streakBonus = Math.min(currentStreak * 2, 20);
        const xpEarned = 10 + streakBonus;
        totalXP += xpEarned;
        globalCompletions += 1;

        completionDocs.push({
          habit: habit._id,
          user: demoUser._id,
          periodKey: weekKey,
          date: dateStr,
          xpEarned,
          completedAt: completedAtForDate(dateStr, rng),
          createdAt: completedAtForDate(dateStr, rng),
          updatedAt: completedAtForDate(dateStr, rng),
        });
      }
    }

    // Insert completions
    if (completionDocs.length > 0) {
      await HabitCompletion.insertMany(completionDocs, { ordered: false }).catch(() => {});
    }

    // Update habit metadata
    await Habit.findByIdAndUpdate(habit._id, {
      currentStreak,
      longestStreak,
      lastCompletedPeriod: lastPeriod,
      lastCompletedDate: lastPeriod,
    });

    console.log(
      `  📌 "${def.title}" — ${completionDocs.length} completions, streak: ${currentStreak} (longest: ${longestStreak})`
    );

    // Badge criteria
    if (longestStreak >= 7) badgeSet.add("Consistency King");
    if (longestStreak >= 30) badgeSet.add("Iron Will");
  }

  // ── Assign badges ────────────────────────────────────────────────────────────
  if (globalCompletions >= 1) badgeSet.add("First Step");
  if (globalCompletions >= 100) badgeSet.add("Centurion");

  const badgeDocs = {
    "First Step":        { description: "Completed your first habit check-in!", icon: "🌱" },
    "Consistency King":  { description: "Reached a 7-day streak on any habit!", icon: "👑" },
    "Iron Will":         { description: "Maintained a 30-day streak on any habit!", icon: "🛡️" },
    "Centurion":         { description: "Logged 100 total habit check-ins!", icon: "💯" },
  };

  const badges = [...badgeSet].map((name) => ({
    name,
    ...(badgeDocs[name] || { description: "", icon: "🏆" }),
    unlockedAt: new Date(),
  }));

  // ── Level from XP: Level = floor(sqrt(XP) × 0.2) + 1 ───────────────────────
  const level = Math.floor(Math.sqrt(totalXP) * 0.2) + 1;

  await User.findByIdAndUpdate(demoUser._id, { xp: totalXP, level, badges });

  console.log(`\n✅ Demo account seeded successfully!`);
  console.log(`   📧 Email:        ${DEMO_EMAIL}`);
  console.log(`   🔑 Password:     ${DEMO_PASSWORD}`);
  console.log(`   ⚡ Total XP:     ${totalXP}`);
  console.log(`   🎖️  Level:        ${level}`);
  console.log(`   📅 Completions:  ${globalCompletions} over ${HISTORY_DAYS} days`);
  console.log(`   🏅 Badges:       ${badges.map((b) => b.name).join(", ")}`);

  await mongoose.disconnect();
  console.log("🔌 Disconnected.");
}

main().catch((err) => {
  console.error("❌ Seed script failed:", err);
  mongoose.disconnect();
  process.exit(1);
});
