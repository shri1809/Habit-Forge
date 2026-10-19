import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import {
  Plus,
  Check,
  Flame,
  Trophy,
  Award,
  Trash2,
  Archive,
  RotateCcw,
  Snowflake,
  BarChart3,
} from "lucide-react";
import confetti from "canvas-confetti";
import ActivityHeatmap from "../components/ActivityHeatmap";
import BadgeModal from "../components/BadgeModal";
import AnalyticsModal from "../components/AnalyticsModal";
import toast from "react-hot-toast";
import ConfirmModal from "../components/ConfirmModal";
import {
  calculateLevelProgress,
  calculateDailyHabitProgress,
} from "../utils/gamification";
import Button from "../components/ui/Button";
import useSEO from "../hooks/useSEO";
import BottomCommunitySection from "../components/BottomCommunitySection";

export default function Dashboard() {
  const { user, setUser } = useAuth();

  useSEO({
    title: "Daily Habits & Consistency Dashboard",
    description:
      "Track your habits, build consistency streaks, earn XP, and level up your daily routines with HabitForge.",
  });

  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState("");
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [category, setCategory] = useState("General");
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState(null);

  useEffect(() => {
    let isCurrent = true;
    API.get("/habits")
      .then(({ data }) => {
        if (isCurrent) setHabits(data);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (isCurrent) setLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  const handleCreateHabit = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setError("");

    try {
      const { data } = await API.post("/habits", { title: newTitle, category });
      setHabits([data, ...habits]);
      setNewTitle("");
      setCategory("General");
      toast.success("Habit created successfully!");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to create habit";
      setError(msg);
      toast.error(msg);
    }
  };

  const handleCheckIn = async (habitId) => {
    try {
      const { data } = await API.post(`/habits/${habitId}/checkin`);

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });

      if (data.freezeUsed) {
        toast("Streak Freeze consumed to protect your streak!", {
          icon: "❄️",
        });
      } else {
        toast.success(`Check-in recorded! +${data.gainedXP} XP`);
      }

      if (data.newBadges?.length) {
        data.newBadges.forEach((b) => {
          toast.success(`Achievement Unlocked: ${b.name}!`, {
            icon: "🏆",
          });
        });
      }

      // FIXED: Changed 'id' to 'habitId' to correctly match the function parameter
      setHabits((prevHabits) =>
        prevHabits.map((h) =>
          h._id === habitId
            ? {
                ...h,
                isCompletedToday: true,
                currentStreak: (h.currentStreak || 0) + 1,
              }
            : h,
        ),
      );

      setUser((prev) => ({
        ...prev,
        xp: data.totalXp,
        level: data.level,
        streakFreezes: data.streakFreezes,
        badges: data.newBadges?.length
          ? [...prev.badges, ...data.newBadges]
          : prev.badges,
      }));
    } catch (err) {
      toast.error(err.response?.data?.message || "Check-in failed");
    }
  };

  const handleDeleteHabit = async () => {
    if (!habitToDelete) return;
    try {
      const { data } = await API.delete(`/habits/${habitToDelete}`);
      setHabits((prev) => prev.filter((h) => h._id !== habitToDelete));
      if (data && typeof data.totalXp === "number") {
        setUser((prev) => ({
          ...prev,
          xp: data.totalXp,
          level: data.level ?? prev.level,
        }));
      }
      toast.success(
        data?.deductedXp > 0
          ? `Habit removed (-${data.deductedXp} XP)`
          : "Habit removed",
      );
    } catch {
      toast.error("Failed to delete habit");
    } finally {
      setHabitToDelete(null);
    }
  };

  const handleArchiveHabit = async (habitId) => {
    try {
      await API.patch(`/habits/${habitId}/archive`);
      setHabits((prev) =>
        prev.map((h) => (h._id === habitId ? { ...h, isArchived: true } : h)),
      );
      toast.success("Habit archived");
    } catch {
      toast.error("Failed to archive habit");
    }
  };

  const handleUnarchiveHabit = async (habitId) => {
    try {
      await API.patch(`/habits/${habitId}/unarchive`);
      setHabits((prev) =>
        prev.map((h) => (h._id === habitId ? { ...h, isArchived: false } : h)),
      );
      toast.success("Habit restored to active list");
    } catch {
      toast.error("Failed to restore habit");
    }
  };

  const handleBuyFreeze = async () => {
    try {
      const { data } = await API.post("/habits/freeze/buy");
      setUser((prev) => ({
        ...prev,
        xp: data.totalXp,
        streakFreezes: data.streakFreezes,
      }));
      toast.success("Streak Freeze acquired! ❄️");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to buy streak freeze");
    }
  };

  const {
    currentLevel,
    nextLevel,
    xpIntoLevel,
    xpNeededForNext,
    xpRemaining,
    progressPercent,
  } = calculateLevelProgress(user?.xp, user?.level);

  const {
    total: totalActiveHabits,
    completed: completedHabitsCount,
    progressPercent: habitsProgressPercent,
    allCompleted: allHabitsCompleted,
  } = calculateDailyHabitProgress(habits);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 relative overflow-hidden">
      {/* Ambient Glass Glow Lighting */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px]" />
        <div className="absolute -bottom-32 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px]" />
      </div>

      <main className="max-w-4xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/50 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.08)]">
          <div className="flex-1 w-full sm:w-auto">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Welcome, {user?.name}
            </h1>
            <p className="text-sm text-slate-400 mb-3">
              Keep your momentum alive today!
            </p>

            {/* Level & XP Progress Bar */}
            <div className="max-w-md">
              <div className="flex justify-between items-center text-xs mb-1.5 font-semibold">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">
                    Level {currentLevel}
                  </span>
                  <span className="text-[10px] text-emerald-300/80 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono">
                    Next: Lv. {nextLevel}
                  </span>
                </div>
                <span className="text-slate-400">
                  {xpIntoLevel} / {xpNeededForNext} XP ({progressPercent}%)
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Level ${currentLevel} progression: ${progressPercent}% towards Level ${nextLevel}`}
                className="w-full h-3 bg-slate-950/60 rounded-full overflow-hidden border border-white/10 p-0.5 shadow-inner"
              >
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1 font-medium">
                <span>
                  {progressPercent}% towards Level {nextLevel}
                </span>
                <span>
                  {xpRemaining > 0
                    ? `${xpRemaining} XP to go`
                    : "Level Up Ready!"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsAnalyticsModalOpen(true)}
              size="sm"
              className="flex items-center gap-1.5 text-sm bg-white/[0.06] hover:bg-white/[0.12] backdrop-blur-md border border-white/10 hover:border-white/20 text-slate-200 px-3.5 py-1.5 rounded-xl shadow-sm"
            >
              <BarChart3 size={16} /> Insights
            </Button>
          </div>
        </header>

        {/* Gamification Stats Banner */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 hover:border-white/20 p-5 rounded-2xl flex items-center gap-4 shadow-[0_8px_30px_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.08)] transition-all duration-300 hover:-translate-y-0.5">
            <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <Trophy size={28} />
            </div>
            <div>
              <p className="text-xs uppercase font-semibold text-slate-400">
                Level
              </p>
              <h2 className="text-2xl font-black text-white">
                Level {user?.level || 1}
              </h2>
            </div>
          </div>
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 hover:border-white/20 p-5 rounded-2xl flex items-center gap-4 shadow-[0_8px_30px_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.08)] transition-all duration-300 hover:-translate-y-0.5">
            <div className="p-3 bg-amber-500/15 text-amber-400 rounded-xl border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
              <Flame size={28} />
            </div>
            <div>
              <p className="text-xs uppercase font-semibold text-slate-400">
                Total XP
              </p>
              <h2 className="text-2xl font-black text-white">
                {user?.xp || 0} XP
              </h2>
            </div>
          </div>
          <div
            onClick={() => setIsBadgeModalOpen(true)}
            className="bg-slate-900/40 backdrop-blur-xl border border-white/10 hover:border-purple-500/40 p-5 rounded-2xl flex items-center gap-4 cursor-pointer shadow-[0_8px_30px_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.08)] transition-all duration-300 hover:-translate-y-0.5 group"
          >
            <div className="p-3 bg-purple-500/15 text-purple-400 rounded-xl border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
              <Award size={28} />
            </div>
            <div>
              <p className="text-xs uppercase font-semibold text-slate-400">
                Badges
              </p>
              <h2 className="text-2xl font-black text-white">
                {user?.badges?.length || 0} Unlocked
              </h2>
            </div>
          </div>
          {/* Streak Freeze Store Card */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 hover:border-white/20 p-5 rounded-2xl flex items-center justify-between gap-2 shadow-[0_8px_30px_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.08)] transition-all duration-300 hover:-translate-y-0.5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-cyan-500/15 text-cyan-400 rounded-xl border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                <Snowflake size={28} />
              </div>
              <div>
                <p className="text-xs uppercase font-semibold text-slate-400">
                  Freezes
                </p>
                <h2 className="text-2xl font-black text-white">
                  {user?.streakFreezes || 0}
                </h2>
              </div>
            </div>
            <Button
              size="none"
              onClick={handleBuyFreeze}
              title="Buy 1 Freeze for 50 XP"
              rippleColor="rgba(6, 182, 212, 0.4)"
              className="text-[11px] bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 px-2.5 py-1.5 rounded-lg font-semibold shadow-sm"
            >
              +50 XP
            </Button>
          </div>
        </section>

        {/* Consistency Grid */}
        <ActivityHeatmap />

        {/* Habit Creation Form */}
        <form
          onSubmit={handleCreateHabit}
          className="flex flex-col sm:flex-row gap-3"
        >
          <input
            type="text"
            placeholder="Add a new habit (e.g. Read 15 mins, Gym, Code)..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/20 transition shadow-inner"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-slate-900/60 backdrop-blur-xl border border-white/10 text-slate-300 rounded-xl px-3 py-3 focus:outline-none focus:border-emerald-400/60 transition cursor-pointer text-sm shadow-inner"
          >
            <option value="General" className="bg-slate-900 text-white">
              General
            </option>
            <option value="Health" className="bg-slate-900 text-white">
              Health
            </option>
            <option value="Coding" className="bg-slate-900 text-white">
              Coding
            </option>
            <option value="Study" className="bg-slate-900 text-white">
              Study
            </option>
            <option value="Mindset" className="bg-slate-900 text-white">
              Mindset
            </option>
          </select>
          <Button
            type="submit"
            size="none"
            rippleColor="rgba(255, 255, 255, 0.4)"
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3),inset_0_1px_0_0_rgba(255,255,255,0.3)]"
          >
            <Plus size={20} /> Add
          </Button>
        </form>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm backdrop-blur-md">
            {error}
          </div>
        )}

        {/* Habits List */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-slate-200">
                {showArchived ? "Archived Habits" : "Today's Habits"}
              </h3>
              {!showArchived && totalActiveHabits > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/[0.05] text-slate-300 border border-white/10 backdrop-blur-sm">
                    {completedHabitsCount}/{totalActiveHabits} (
                    {habitsProgressPercent}%)
                  </span>
                  {allHabitsCompleted && (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">
                      ✨ All done today!
                    </span>
                  )}
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="none"
              onClick={() => setShowArchived((prev) => !prev)}
              className="text-xs font-semibold text-slate-400 hover:text-emerald-400 self-start sm:self-auto py-1 px-2 rounded-lg"
            >
              {showArchived ? "Show Active" : "Show Archived"}
            </Button>
          </div>

          {!showArchived && totalActiveHabits > 0 && (
            <div className="w-full bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-xl p-3 flex items-center gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.15),inset_0_1px_0_0_rgba(255,255,255,0.05)]">
              <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                Daily Goal:
              </span>
              <div
                role="progressbar"
                aria-valuenow={habitsProgressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Daily habits progress: ${habitsProgressPercent}%`}
                className="flex-1 h-2 bg-slate-950/60 rounded-full overflow-hidden border border-white/10"
              >
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                  style={{ width: `${habitsProgressPercent}%` }}
                />
              </div>
              <span className="text-xs font-bold text-emerald-400 whitespace-nowrap">
                {habitsProgressPercent}%
              </span>
            </div>
          )}

          {loading ? (
            <p className="text-slate-500">Loading your habits...</p>
          ) : habits.length === 0 ? (
            <div className="text-center py-10 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl text-slate-400 shadow-[0_8px_30px_rgba(0,0,0,0.2),inset_0_1px_0_0_rgba(255,255,255,0.05)]">
              No habits tracked yet. Add your first habit above!
            </div>
          ) : (
            habits
              .filter((habit) => Boolean(habit.isArchived) === showArchived)
              .map((habit) => (
                <div
                  key={habit._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-900/45 backdrop-blur-xl border border-white/10 rounded-xl hover:border-emerald-500/30 hover:bg-slate-900/60 transition-all duration-200 shadow-[0_4px_20px_rgba(0,0,0,0.2),inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                >
                  {/* Left Side: Habit Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-white text-base tracking-tight">
                        {habit.title}
                      </h4>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-white/[0.05] text-slate-300 border border-white/10">
                        {habit.category || "General"}
                      </span>
                    </div>
                    <div className="mt-1">
                      <span className="flex items-center text-xs font-semibold text-amber-400">
                        <Flame
                          size={14}
                          className="mr-1 inline drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                        />
                        {habit.currentStreak || 0} day streak
                      </span>
                    </div>
                  </div>

                  {/* Right Side: Actions */}
                  <div className="flex items-center gap-2">
                    {!showArchived ? (
                      <>
                        <Button
                          disabled={habit.isCompletedToday}
                          onClick={() => handleCheckIn(habit._id)}
                          size="none"
                          rippleColor={
                            habit.isCompletedToday
                              ? "transparent"
                              : "rgba(255, 255, 255, 0.45)"
                          }
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-sm transition ${
                            habit.isCompletedToday
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-default"
                              : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-[0_0_15px_rgba(16,185,129,0.35)]"
                          }`}
                        >
                          <Check size={16} />
                          {habit.isCompletedToday ? "Done" : "Check In"}
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleArchiveHabit(habit._id)}
                          className="p-2 text-slate-400 hover:text-amber-400 hover:bg-white/[0.08] border border-transparent hover:border-white/10 rounded-lg"
                          title="Archive habit"
                        >
                          <Archive size={16} />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleUnarchiveHabit(habit._id)}
                        className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-white/[0.08] border border-transparent hover:border-white/10 rounded-lg"
                        title="Restore habit"
                      >
                        <RotateCcw size={16} />
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setHabitToDelete(habit._id)}
                      rippleColor="rgba(239, 68, 68, 0.4)"
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-white/[0.08] border border-transparent hover:border-white/10 rounded-lg"
                      title="Delete habit"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))
          )}
        </section>
      </main>

      <BadgeModal
        isOpen={isBadgeModalOpen}
        onClose={() => setIsBadgeModalOpen(false)}
        userBadges={user?.badges || []}
      />
      <AnalyticsModal
        isOpen={isAnalyticsModalOpen}
        onClose={() => setIsAnalyticsModalOpen(false)}
      />
      <ConfirmModal
        isOpen={Boolean(habitToDelete)}
        title="Delete Habit?"
        message="This will permanently delete the habit and its check-in records."
        confirmLabel="Delete Habit"
        onConfirm={handleDeleteHabit}
        onClose={() => setHabitToDelete(null)}
      />
      <div className="...">
        {/* All your existing habits, heatmaps, badges, etc. */}

        {/* Bottom Section: Invite Friends & Feedback */}
        <BottomCommunitySection />
      </div>
    </div>
  );
}
