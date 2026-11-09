# HabitForge

> **Build streaks. Earn XP. Level up your life.**  
> A full-stack habit-tracking PWA with gamification, timezone-aware streak logic, and email reminders.

---

## Table of Contents

1. [Live Demo](#live-demo)
2. [Tech Stack](#tech-stack)
3. [Features](#features)
4. [Architecture Overview](#architecture-overview)
5. [Streak Calculation Algorithm](#streak-calculation-algorithm)
6. [Timezone Handling](#timezone-handling)
7. [Missed Days & Streak Freeze Mechanic](#missed-days--streak-freeze-mechanic)
8. [Analytics & Export](#analytics--export)
9. [18-Hour Inactivity Reminder](#18-hour-inactivity-reminder)
10. [Gamification System](#gamification-system)
11. [Security Controls](#security-controls)
12. [Running Locally](#running-locally)
13. [Environment Variables](#environment-variables)
14. [Demo Account](#demo-account)
15. [Running Tests](#running-tests)
16. [API Reference](#api-reference)

---

## Live Demo

| Environment | URL |
|---|---|
| **Frontend (Vercel)** | https://habit-forge-six-chi.vercel.app |
| **Backend API (Render)** | https://habit-forge-1r4b.onrender.com |

> **Demo Account** — see the [Demo Account](#demo-account) section for credentials and pre-seeded 90-day history.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 4, React Router 7, Axios |
| Backend | Node.js 22, Express 5, Mongoose 9, MongoDB Atlas |
| Auth | JWT (7-day expiry), bcryptjs (10 salt rounds), 6-digit HMAC-SHA256 OTP |
| Email | Nodemailer (Brevo SMTP), Resend HTTP API |
| Gamification | XP, levelling, streak freezes, achievement badges |
| Testing | Vitest 5, Supertest — 93 tests across 8 suites |
| Security | Helmet, CORS, express-rate-limit, NoSQL sanitizer, CSP |
| Deployment | Vercel (frontend + edge headers), Render (backend), MongoDB Atlas |

---

## Features

- 🔐 **Secure auth** — register, login, 6-digit OTP email verification, forgot-password via OTP
- 🏆 **Gamified streaks** — XP, RPG levelling, streak freezes, achievement badges
- 📅 **Timezone-aware tracking** — daily/weekly habits keyed to the user's local calendar day
- 🔔 **18-hour inactivity reminders** — scheduled email alerts for missed check-ins
- 📊 **Analytics** — 90-day completion heatmap, category breakdown, best-streak summary
- 📤 **Data export** — JSON (full profile dump) and CSV (habit + completion log)
- 🌐 **PWA-ready** — `manifest.json`, service-worker-ready, offline-capable shell
- ♿ **Accessible** — ARIA labels, keyboard navigation, focus management throughout
- 🔒 **Hardened** — 7 CVEs patched, `security.txt`, CSP at the edge, no OTP leakage in production

---

## Architecture Overview

```
client/ (React + Vite)
├── src/
│   ├── api/axios.js          ← Axios instance: baseURL, JWT header, x-user-timezone header
│   ├── context/AuthContext   ← Global auth state: user, login, logout, register
│   ├── pages/                ← Home, Auth, Dashboard, VerifyEmail, ...
│   └── components/           ← Habit cards, heatmap, gamification UI, community section

server/ (Express + Mongoose)
├── controllers/
│   ├── authController.js     ← Register, login, OTP verify, forgot-password
│   └── habitController.js    ← CRUD, check-in (streak engine), analytics, export
├── models/
│   ├── User.js               ← XP, level, badges, timezone, streakFreezes
│   ├── Habit.js              ← currentStreak, longestStreak, lastCompletedPeriod
│   └── HabitCompletion.js    ← periodKey (YYYY-MM-DD | YYYY-Www), date, xpEarned
├── utils/
│   ├── gamification.js       ← calculateStreak, calculateXPAndLevel, checkBadges
│   └── timezone.js           ← getUserLocalPeriod, calculatePeriodDifference
└── services/reminderService  ← 18-hour inactivity check, email dispatch
```

---

## Streak Calculation Algorithm

Streaks are computed in [`server/utils/gamification.js → calculateStreak()`](server/utils/gamification.js).

### Key Concepts

| Term | Definition |
|---|---|
| **Period key** | A string uniquely identifying one tracking period for a habit — `YYYY-MM-DD` for daily habits, `YYYY-Www` (ISO week) for weekly habits |
| **Period difference** | The number of discrete calendar periods between two period keys (see `calculatePeriodDifference` in [`timezone.js`](server/utils/timezone.js)) |
| **Current streak** | The unbroken run of consecutive completed periods immediately preceding (and including) the current completion |

### Algorithm (Step by Step)

```
INPUT:
  lastCompletedPeriod  — period key of the most recent check-in (or null)
  currentStreak        — the stored streak count on the Habit document
  streakFreezes        — number of Streak Freeze tokens the user holds
  options.currentPeriod  — today's period key (from getUserLocalPeriod in user's timezone)
  options.previousPeriod — yesterday's period key

STEP 1: First-ever completion
  IF lastCompletedPeriod IS null
    → newStreak = 1   (streak starts)

STEP 2: Same period — idempotent check-in
  IF lastCompletedPeriod == currentPeriod
    → newStreak = currentStreak unchanged   (no double-counting)

STEP 3: Compute period difference
  diff = calculatePeriodDifference(currentPeriod, lastCompletedPeriod, frequency)
  — For daily: diff = (currentDate - lastDate) in calendar days
  — For weekly: diff = (currentISOWeek - lastISOWeek) in ISO weeks

STEP 4: Consecutive period (diff == 1)
  → newStreak = currentStreak + 1   (streak grows)

STEP 5: One missed period with a freeze (diff == 2 AND streakFreezes > 0)
  → newStreak = currentStreak + 1
  → consume one freeze token (freezeUsed = true)

STEP 6: Broken streak (diff >= 3, or diff == 2 with no freezes)
  → newStreak = 1   (reset; this completion starts a new streak)

OUTPUT: { newStreak, freezeUsed }
```

### Why Period Keys Instead of Raw Timestamps?

Using normalized string keys (`YYYY-MM-DD`, `YYYY-Www`) decouples streak tracking from the UTC wall clock. A user in `Asia/Kolkata` who checks in at 23:50 IST and again at 00:10 IST the following day gets two separate period keys (`2026-11-09` and `2026-11-10`) — correctly incrementing their streak — even though both timestamps fall within the same UTC calendar day.

This also makes idempotency trivial: a MongoDB unique compound index on `{ habit, periodKey }` in `HabitCompletion` prevents any duplicate completion for the same habit in the same period, regardless of network retries or double taps.

---

## Timezone Handling

All timezone logic lives in [`server/utils/timezone.js`](server/utils/timezone.js), powered by **moment-timezone**.

### Flow

```
1. Browser detects timezone
   Intl.DateTimeFormat().resolvedOptions().timeZone  →  "Asia/Kolkata"

2. Frontend sends timezone on every API request
   Request header:  x-user-timezone: Asia/Kolkata
   Login body:      { timezone: "Asia/Kolkata" }

3. Backend sanitizes and persists it
   sanitizeTimezone("Asia/Kolkata")        →  validates against IANA list
   User.timezone = "Asia/Kolkata"          →  saved to MongoDB

4. Per-request period resolution
   getUserLocalPeriod("Asia/Kolkata", "daily")
   →  moment(now).tz("Asia/Kolkata").format("YYYY-MM-DD")
   →  { periodKey: "2026-11-09", previousPeriod: "2026-11-08", ... }

5. Streak engine receives timezone-local period keys
   calculateStreak(lastCompletedPeriod, currentStreak, freezes, { currentPeriod, previousPeriod })
```

### Period Key Examples

| User's local time | Timezone | periodKey (daily) | periodKey (weekly) |
|---|---|---|---|
| 2026-11-09 23:55 | `Asia/Kolkata` | `2026-11-09` | `2026-W46` |
| 2026-11-09 00:05 | `America/New_York` | `2026-11-09` | `2026-W46` |
| 2026-11-10 00:05 | `America/New_York` | `2026-11-10` | `2026-W46` |

### Invalid Timezone Fallback

`sanitizeTimezone(tz)` calls `moment.tz.zone(tz)`. If the provided string is not a valid IANA zone (e.g., a malformed or spoofed header), it falls back to `"UTC"` — preventing crashes and ensuring consistent behavior.

---

## Missed Days & Streak Freeze Mechanic

### What counts as a "missed day"?

A period is missed if the user does **not** record a check-in (`HabitCompletion` document) for a habit during that period key. This is determined lazily at the time of the **next** check-in:

- `diff == 1` → consecutive → streak grows normally
- `diff == 2` → exactly one period was skipped
- `diff >= 3` → two or more periods were skipped → streak resets to 1

> There is no active "miss detection" running in the background for streak purposes. The 18-hour reminder (see below) is a separate process that sends email notifications proactively, but it does not modify streak data.

### Streak Freeze

A **Streak Freeze** is a consumable token that bridges a single skipped period:

| Scenario | Without Freeze | With Freeze |
|---|---|---|
| Checked in every day | Streak +1 | Streak +1 |
| Missed exactly 1 day (`diff == 2`) | Streak resets to 1 | Streak +1 (freeze consumed) |
| Missed 2+ days (`diff >= 3`) | Streak resets to 1 | Streak resets to 1 (freeze not consumed) |

**Cost:** 50 XP per freeze token (`POST /api/habits/freeze/buy`).  
**Cap:** One freeze can bridge at most one missing period between two check-ins. Freezes cannot bridge multi-day gaps.

```
Example timeline (daily habit, user holds 1 freeze):

Day 1  → check-in  → streak = 1
Day 2  → check-in  → streak = 2
Day 3  → (missed)
Day 4  → check-in  → diff = 2, freeze consumed → streak = 3 ✅
Day 5  → check-in  → streak = 4 ✅
Day 6  → (missed)
Day 7  → (missed)
Day 8  → check-in  → diff = 3, no freeze available → streak = 1 🔄
```

---

## Analytics & Export

### Heatmap (`GET /api/habits/:id/history`)

Returns `HabitCompletion` records for a given habit within a date range. The frontend renders a **28-day rolling completion grid** using the `date` field (YYYY-MM-DD in user's local timezone).

> **Note:** The displayed grid covers the most recent 28 days. Full historical data (all completions since account creation) is available through the data export endpoints.

### Export Formats

HabitForge supports **two export formats**:

#### JSON Export (`GET /api/habits/export`)
Returns a full structured dump of the authenticated user's data:
```json
{
  "user":    { "name", "email", "level", "xp", "timezone", "badges", ... },
  "habits":  [ { "title", "currentStreak", "longestStreak", ... } ],
  "completionLogs": [ { "date", "periodKey", "xpEarned", "habit": { "title", "category" } } ],
  "exportedAt": "2026-11-09T14:30:00.000Z"
}
```

#### CSV Export (`GET /api/habits/export?format=csv`)
Returns a downloadable flat file with one row per completion event:
```csv
date,habit_title,category,frequency,xp_earned,period_key,completed_at
2026-11-09,Morning Run,Health,daily,22,2026-11-09,2026-11-09T05:30:00.000Z
2026-11-09,Read 20 Pages,Study,daily,14,2026-11-09,2026-11-09T07:15:00.000Z
...
```

Both formats include the full history since account creation — not just the 28-day heatmap window.

---

## 18-Hour Inactivity Reminder

Implemented in [`server/services/reminderService.js`](server/services/reminderService.js).

### How It Works

```
Every 30 minutes (background interval):
  FOR each habit in HabitCompletion:
    1. Find the user's current period key (timezone-aware)
    2. Check if the habit has NOT been completed in the current period
    3. If the habit was last completed >= 18 hours ago (or never):
       → dispatch email to user: "Complete task: '<title>' & check in"
       → update habit.lastReminderSentAt to now (prevents re-sending within same period)
```

The 18-hour threshold is computed by comparing `habit.lastReminderSentAt` (or habit creation time) against `Date.now()`. An email is only sent once per period — the `lastReminderSentAt` guard ensures users are not spammed.

The scheduler is started at server boot via `startReminderScheduler()` in [`server.js`](server/server.js#L116).

External cron-job.org / Render cron can also ping `GET /api/habits/cron/reminders` with the `x-cron-secret` header for serverless-safe triggering.

---

## Gamification System

### XP Formula

```
baseXP       = 10          (every check-in)
streakBonus  = min(streak × 2, 20)   (capped at +20 XP for streaks of 10+)
gainedXP     = baseXP + streakBonus
```

| Streak | XP Gained |
|---|---|
| 1 | 12 |
| 5 | 20 |
| 10+ | 30 (maximum) |

### Level Formula

```
Level = floor(sqrt(totalXP) × 0.2) + 1

minXP(Level L) = 25 × (L − 1)²

Level 1 →    0 XP
Level 2 →   25 XP  (need 25 to advance)
Level 3 →  100 XP  (need 75 to advance)
Level 4 →  225 XP  (need 125 to advance)
Level 5 →  400 XP  (need 175 to advance)
Level L+1 requires: 25 × (2L − 1) XP from Level L
```

### Badges

| Badge | Condition |
|---|---|
| 🌱 First Step | First ever check-in |
| 👑 Consistency King | 7-day streak on any habit |
| 🛡️ Iron Will | 30-day streak on any habit |
| 💯 Centurion | 100 total check-ins across all habits |

---

## Security Controls

| Control | Implementation |
|---|---|
| **HTTP security headers** | Helmet.js (CSP, HSTS, X-Frame-Options, nosniff, referrer-policy) + Vercel edge headers |
| **CORS** | Whitelist-only: `localhost:5173`, production Vercel URL, Render URL |
| **Rate limiting** | Auth routes: 15 req / 15 min · API: 200 req / 15 min (express-rate-limit) |
| **NoSQL injection** | Recursive `$`-operator sanitizer on `req.body`, `req.query`, `req.params` |
| **Password hashing** | bcryptjs, 10 salt rounds |
| **JWT** | 7-day expiry, `Authorization: Bearer` header (CSRF-immune) |
| **OTP security** | HMAC-SHA256 keyed on email + server secret, 10-min expiry, 5-attempt lockout |
| **OTP production guard** | `sandboxOtp` field only included in API responses when `NODE_ENV=development AND ALLOW_SANDBOX_OTP=true` |
| **Secret management** | `.env` excluded from git via `.gitignore`; `.env.example` with placeholders committed |
| **Dependency CVEs** | 0 vulnerabilities (`npm audit` clean across client and server) |
| **`security.txt`** | RFC 9116 contact disclosure at `/.well-known/security.txt` |

---

## Running Locally

### Prerequisites

- Node.js >= 18
- MongoDB (local or Atlas URI)
- npm or pnpm

### Setup

```bash
# 1. Clone
git clone https://github.com/shri1809/Habit-Forge.git
cd Habit-Forge

# 2. Install dependencies
npm install --prefix server
npm install --prefix client

# 3. Configure environment (copy and fill in values)
cp server/.env.example server/.env
# Edit server/.env — see Environment Variables below

# 4. (Optional) Seed a demo account with 90 days of history
node server/scripts/seedDemo.js

# 5. Start backend (port 5000)
npm run dev --prefix server

# 6. Start frontend (port 5173)
npm run dev --prefix client
```

Frontend: http://localhost:5173  
Backend health: http://localhost:5000/health

---

## Environment Variables

Create `server/.env` using `server/.env.example` as a template:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>

# JWT
JWT_SECRET=<strong-random-secret-min-32-chars>
JWT_EXPIRES_IN=7d

# OTP
OTP_SECRET=<strong-random-secret-min-32-chars>
# Set to "true" in development ONLY to expose sandbox OTP in API responses
ALLOW_SANDBOX_OTP=true

# Email (Brevo SMTP — free tier, no custom domain required)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<your-brevo-login-email>
SMTP_PASS=<your-brevo-smtp-key>
EMAIL_FROM=habitforgev@gmail.com

# Email (Resend — optional fallback)
RESEND_API_KEY=re_<your-resend-api-key>

# Cron endpoint protection
CRON_SECRET=<random-secret-for-cron-endpoint>

# App
CLIENT_URL=http://localhost:5173
FREE_HABIT_LIMIT=5
```

---

## Demo Account

A demo account with **90 days of pre-seeded activity history** is available on the live production site:

| Field | Value |
|---|---|
| **Email** | `demo@habitforge.app` |
| **Password** | `Demo@1234` |

The demo account includes:
- 5 habits across Health, Coding, Study, Mindset, and General categories
- ~85% completion rate over 90 days (mimicking realistic human behavior)
- Streak freezes used at two deliberate gaps in history
- Level 6 with badges: First Step, Consistency King, Iron Will
- Multiple completed and partially-completed weeks for the weekly habit

To re-seed or reset the demo account locally:
```bash
node server/scripts/seedDemo.js
```

> The seed script is safe to re-run — it deletes and recreates the demo user, habits, and completion records each time.

---

## Running Tests

```bash
# All 93 tests across 8 suites
npm test --prefix server

# Individual test suites
npx vitest run tests/gamification.test.js   # Streak + XP + badge logic
npx vitest run tests/timezone.test.js       # Period key calculations
npx vitest run tests/checkin.test.js        # Check-in idempotency
npx vitest run tests/reminder.test.js       # 18-hour reminder dispatch
npx vitest run tests/forgot_password.test.js # OTP password reset flow
npx vitest run tests/security.test.js       # Helmet, CORS, rate-limit, injection
```

---

## API Reference

All endpoints are prefixed with `/api`. Protected endpoints require `Authorization: Bearer <token>`.

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register; triggers OTP email |
| POST | `/auth/login` | — | Login; returns JWT |
| POST | `/auth/verify-otp` | — | Verify 6-digit email OTP |
| POST | `/auth/resend-otp` | — | Resend OTP (60-second cooldown) |
| POST | `/auth/forgot-password` | — | Send password reset OTP |
| POST | `/auth/reset-password` | — | Validate OTP and set new password |
| GET  | `/auth/profile` | ✅ | Fetch authenticated user profile |

### Habits

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET  | `/habits` | ✅ | List all habits with current-period completion status |
| POST | `/habits` | ✅ | Create a new habit |
| POST | `/habits/:id/checkin` | ✅ | Check in; runs streak engine and awards XP |
| GET  | `/habits/:id/history` | ✅ | Completion history (heatmap data) |
| DELETE | `/habits/:id` | ✅ | Delete habit and cascade completions (XP adjusted) |
| PATCH | `/habits/:id/archive` | ✅ | Archive habit |
| PATCH | `/habits/:id/unarchive` | ✅ | Restore archived habit |
| POST | `/habits/freeze/buy` | ✅ | Purchase streak freeze (50 XP) |
| GET  | `/habits/analytics` | ✅ | Totals, best streak, category breakdown |
| GET  | `/habits/export` | ✅ | Export data as JSON |
| GET  | `/habits/export?format=csv` | ✅ | Export completion log as CSV |
| GET  | `/habits/cron/reminders` | secret | Trigger 18-hour reminder scan |

### Feedback

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/feedback` | optional | Submit user feedback |
| GET  | `/feedback` | ✅ | View all feedback (admin) |
