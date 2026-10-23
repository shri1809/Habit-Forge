import { useState } from "react";
import { Link } from "react-router-dom";
import confetti from "canvas-confetti";
import {
  Flame,
  Zap,
  Snowflake,
  Trophy,
  Award,
  Shield,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Clock,
  Lock,
  ChevronDown,
  RotateCcw,
  Check,
  Star,
  Layers,
  Heart,
  Share2,
  Menu,
  X,
} from "lucide-react";
import logo from "../assets/logo.png";
import headerBg from "../assets/header-bg.png";
import Button from "../components/ui/Button";
import useSEO from "../hooks/useSEO";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  useSEO({
    title: "Gamified Habit Tracker & Routine Builder",
    description:
      "Forge unbreakable daily habits, gain XP, level up your character, and protect your streaks with freeze shields. HabitForge makes consistency fun and rewarding.",
  });

  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Interactive Demo Sandbox State
  const [demoHabits, setDemoHabits] = useState([
    { id: 1, title: "Drink 2.5L Water", category: "Health", icon: "💧", completed: false },
    { id: 2, title: "Code for 45 Minutes", category: "Coding", icon: "💻", completed: false },
    { id: 3, title: "10-Minute Mindfulness", category: "Mindset", icon: "🧘", completed: false },
    { id: 4, title: "Read 15 Pages", category: "Study", icon: "📚", completed: false },
  ]);
  const [demoXP, setDemoXP] = useState(70);
  const [demoStreak, setDemoStreak] = useState(3);
  const [demoLevel, setDemoLevel] = useState(1);
  const [xpFlyout, setXpFlyout] = useState(null);

  const handleDemoCheckIn = (id) => {
    setDemoHabits((prev) =>
      prev.map((habit) => {
        if (habit.id === id) {
          const nextState = !habit.completed;
          if (nextState) {
            // Trigger confetti
            confetti({
              particleCount: 40,
              spread: 60,
              origin: { y: 0.7 },
              colors: ["#10b981", "#34d399", "#06b6d4", "#f59e0b"],
            });

            const nextXP = demoXP + 10;
            setDemoXP(nextXP);
            setDemoStreak((s) => s + 1);

            // Level up threshold at 100 XP
            if (nextXP >= 100 && demoLevel === 1) {
              setDemoLevel(2);
            }

            // Show floating XP notification
            setXpFlyout("+10 XP!");
            setTimeout(() => setXpFlyout(null), 1800);
          } else {
            setDemoXP((x) => Math.max(0, x - 10));
            setDemoStreak((s) => Math.max(0, s - 1));
          }
          return { ...habit, completed: nextState };
        }
        return habit;
      })
    );
  };

  const resetDemo = () => {
    setDemoHabits((prev) => prev.map((h) => ({ ...h, completed: false })));
    setDemoXP(70);
    setDemoStreak(3);
    setDemoLevel(1);
  };

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(null);
  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: "How is HabitForge different from regular to-do list apps?",
      a: "Traditional habit trackers feel like work. HabitForge treats habit formation like an RPG game: every habit completed yields real XP, triggers celebratory confetti, unlocks tier badges, and builds visible streaks. You level up your character as you level up your real life.",
    },
    {
      q: "What happens if I miss a day? Does my streak reset to zero?",
      a: "Life happens. That's why HabitForge features Streak Freezes (❄️). You can earn or equip Streak Freezes that automatically consume on a missed day to preserve your hard-earned streak and prevent discouragement.",
    },
    {
      q: "How do the 18-hour smart email reminders work?",
      a: "If you add habits or have pending routines and haven't checked in for 18 hours, HabitForge sends an intelligent, motivating nudge to your inbox. It reminds you to complete your task before your day concludes, so your streak stays alive.",
    },
    {
      q: "Is HabitForge completely free to use?",
      a: "Yes! HabitForge offers a generous free tier that includes up to 5 concurrent active habits, complete XP leveling, streak tracking, streak freeze protection, 4-week activity heatmaps, and smart reminders with no credit card required.",
    },
    {
      q: "Can I export my data or delete my account anytime?",
      a: "Absolutely. You maintain 100% data ownership. You can download a complete JSON export of your routines, check-in history, and badge progress directly from your dashboard anytime.",
    },
  ];

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen relative selection:bg-emerald-500 selection:text-slate-950">
      {/* Ambient HabitForge Glow Effects */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-emerald-500/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none" />
      </div>

      {/* Top Navigation Bar */}
      <nav
        style={{ backgroundImage: `url(${headerBg})` }}
        className="sticky top-0 z-50 transition-all duration-300 border-b border-white/10 backdrop-blur-xl bg-slate-950/80 bg-cover bg-center bg-no-repeat shadow-[0_4px_25px_rgba(0,0,0,0.4)]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src={logo}
              alt="HabitForge Logo"
              className="w-8 h-8 opacity-95 group-hover:opacity-100 transition drop-shadow-[0_0_12px_rgba(16,185,129,0.35)]"
            />
            <span className="text-xl font-black text-white group-hover:text-emerald-400 transition tracking-tight">
              Habit<span className="text-emerald-400 group-hover:text-white transition">Forge</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-7 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <a href="#features" className="hover:text-emerald-400 transition-colors">
              Features
            </a>
            <a href="#interactive-demo" className="hover:text-emerald-400 transition-colors">
              Live Demo
            </a>
            <a href="#how-it-works" className="hover:text-emerald-400 transition-colors">
              How It Works
            </a>
            <a href="#gamification" className="hover:text-emerald-400 transition-colors">
              RPG System
            </a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">
              FAQ
            </a>
          </div>

          {/* Right Header CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            {user ? (
              <Link to="/dashboard">
                <Button variant="primary" size="sm" className="gap-2">
                  <span>Dashboard</span>
                  <ArrowRight size={14} />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button variant="primary" size="sm" className="gap-2 shadow-[0_0_15px_rgba(16,185,129,0.35)]">
                    <span>Forge Free</span>
                    <ArrowRight size={14} />
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex sm:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-white/10 bg-slate-950/95 backdrop-blur-2xl px-6 py-5 space-y-4">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-slate-300 hover:text-emerald-400"
            >
              Features
            </a>
            <a
              href="#interactive-demo"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-slate-300 hover:text-emerald-400"
            >
              Live Demo
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-slate-300 hover:text-emerald-400"
            >
              How It Works
            </a>
            <a
              href="#gamification"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-slate-300 hover:text-emerald-400"
            >
              RPG System
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-slate-300 hover:text-emerald-400"
            >
              FAQ
            </a>
            <div className="pt-3 border-t border-white/10 flex flex-col gap-2.5">
              {user ? (
                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" className="w-full justify-center">
                    Go to Dashboard →
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="glass" className="w-full justify-center">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="primary" className="w-full justify-center">
                      Start Forging Free →
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* HERO SECTION */}
      <header className="relative z-10 pt-16 pb-20 sm:pt-24 sm:pb-28 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-xs font-semibold mb-8 backdrop-blur-md shadow-sm">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-emerald-300">Level Up Your Daily Routines</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950">
              RPG Powered
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.08]">
            Turn Daily Consistency Into <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 drop-shadow-[0_0_35px_rgba(16,185,129,0.35)]">
              An Epic RPG Adventure.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            Forge unbreakable habits, earn XP on every completion, climb from Novice to Mythic Forge Master, and protect your hard-won streaks with Freeze Shields.
          </p>

          {/* Hero CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to={user ? "/dashboard" : "/auth"}>
              <Button variant="primary" size="lg" className="gap-2.5 shadow-[0_0_25px_rgba(16,185,129,0.4)] px-7 py-3.5 text-base">
                <span>{user ? "Continue Your Streak" : "Start Forging for Free"}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>

            <a href="#interactive-demo">
              <Button variant="glass" size="lg" className="gap-2 px-6 py-3.5 text-base">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>Try Live Demo</span>
              </Button>
            </a>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-16 max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-card p-4 rounded-xl text-center border border-white/10">
              <div className="text-2xl font-black text-emerald-400">+10 XP</div>
              <div className="text-xs text-slate-400 mt-1">Per Habit Check-in</div>
            </div>
            <div className="glass-card p-4 rounded-xl text-center border border-white/10">
              <div className="text-2xl font-black text-amber-400 flex items-center justify-center gap-1">
                <Flame size={20} className="fill-amber-400" /> Streaks
              </div>
              <div className="text-xs text-slate-400 mt-1">Consistency Multiplier</div>
            </div>
            <div className="glass-card p-4 rounded-xl text-center border border-white/10">
              <div className="text-2xl font-black text-cyan-400 flex items-center justify-center gap-1">
                <Snowflake size={20} /> Freezes
              </div>
              <div className="text-xs text-slate-400 mt-1">Loss Prevention Shield</div>
            </div>
            <div className="glass-card p-4 rounded-xl text-center border border-white/10">
              <div className="text-2xl font-black text-white">4-Week</div>
              <div className="text-xs text-slate-400 mt-1">Heatmap Analytics</div>
            </div>
          </div>
        </div>
      </header>

      {/* INTERACTIVE DEMO SANDBOX SECTION */}
      <section id="interactive-demo" className="relative z-10 py-20 border-t border-white/10 bg-slate-900/40 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-3">
              <Zap size={14} /> Instant Interactive Sandbox
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Experience the Check-In Rush
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Tap any habit card below to simulate a real check-in. Watch your XP grow, trigger celebratory confetti, and level up!
            </p>
          </div>

          {/* Interactive Demo Sandbox Card */}
          <div className="glass-card rounded-2xl p-6 sm:p-8 border border-emerald-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative overflow-hidden">
            {/* Header Status in Demo */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">
                    Level {demoLevel} {demoLevel === 1 ? "Novice Forger" : "Iron Apprentice 🛡️"}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Flame size={14} className="text-amber-400 fill-amber-400" />
                    <strong className="text-amber-300">{demoStreak} Day Streak</strong>
                  </span>
                </div>
                <div className="text-sm font-bold text-white mt-1">Your Daily Quest Log</div>
              </div>

              {/* Reset Demo Button */}
              <button
                type="button"
                onClick={resetDemo}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 transition"
              >
                <RotateCcw size={12} />
                <span>Reset Demo</span>
              </button>
            </div>

            {/* XP Progress Bar */}
            <div className="my-6">
              <div className="flex justify-between items-center text-xs font-semibold mb-2">
                <span className="text-slate-300">Experience Points (XP)</span>
                <span className="text-emerald-400 font-bold">{demoXP} / 100 XP</span>
              </div>
              <div className="w-full bg-slate-950/80 rounded-full h-3 p-0.5 border border-white/10 overflow-hidden relative">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                  style={{ width: `${Math.min(100, (demoXP / 100) * 100)}%` }}
                />
              </div>
              {demoLevel === 2 && (
                <div className="mt-2 text-xs text-center font-bold text-emerald-300 bg-emerald-500/10 py-1.5 rounded-lg border border-emerald-500/30 animate-pulse">
                  🎉 Level Up Achieved! You unlocked Level 2: Iron Apprentice!
                </div>
              )}
            </div>

            {/* Habit Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {demoHabits.map((habit) => (
                <div
                  key={habit.id}
                  onClick={() => handleDemoCheckIn(habit.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-center justify-between select-none ${
                    habit.completed
                      ? "bg-emerald-950/30 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                      : "bg-slate-950/60 hover:bg-slate-900 border-white/10 hover:border-emerald-500/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{habit.icon}</span>
                    <div>
                      <div
                        className={`text-sm font-bold transition ${
                          habit.completed ? "text-emerald-300 line-through" : "text-white"
                        }`}
                      >
                        {habit.title}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {habit.category} • Daily Quest
                      </div>
                    </div>
                  </div>

                  {/* Checkbox Button */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      habit.completed
                        ? "bg-emerald-500 text-slate-950 scale-105 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                        : "bg-slate-800/80 text-slate-500 hover:text-emerald-400 hover:bg-slate-700"
                    }`}
                  >
                    <Check size={18} className={habit.completed ? "stroke-[3]" : "opacity-40"} />
                  </div>
                </div>
              ))}
            </div>

            {/* Floating XP Pop Indicator */}
            {xpFlyout && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-slate-950 font-black text-lg px-4 py-2 rounded-xl shadow-2xl animate-bounce pointer-events-none">
                {xpFlyout}
              </div>
            )}

            {/* Live CTA Under Demo */}
            <div className="mt-8 pt-6 border-t border-white/10 text-center">
              <p className="text-xs text-slate-400 mb-3">
                Love the feel? Create your personalized routine quests in less than 30 seconds.
              </p>
              <Link to="/auth">
                <Button variant="primary" size="md" className="gap-2">
                  <span>Start Tracking Your Real Habits</span>
                  <ArrowRight size={14} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CORE FEATURES BENTO GRID */}
      <section id="features" className="relative z-10 py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-3">
              <Sparkles size={14} /> Built For Real Consistency
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Engineered For Habits That Actually Stick
            </h2>
            <p className="text-base text-slate-400 mt-4 leading-relaxed">
              Every feature in HabitForge is backed by behavioural psychology: gamified reward loops, loss aversion protections, and visual momentum proofs.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bento Card 1: RPG Leveling System */}
            <div className="glass-card rounded-2xl p-7 border border-white/10 hover:border-emerald-500/30 transition flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-5">
                  <Trophy size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">RPG Leveling & XP Engine</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Earn +10 base XP for every habit you complete, with dynamic bonus multipliers for long unbroken streaks. Climb through Novice, Iron Forger, Grandmaster, and Mythic Forge Master ranks.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-bold text-emerald-400">
                <span>Micro-dopamine feedback loop</span>
                <span>Level 1 → 25+</span>
              </div>
            </div>

            {/* Bento Card 2: Streak Freezes */}
            <div className="glass-card rounded-2xl p-7 border border-white/10 hover:border-cyan-500/30 transition flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-5">
                  <Snowflake size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Streak Freeze Protection</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Burnout, travel, and emergencies happen. HabitForge equips you with Freeze Shields that automatically trigger on missed days, preventing weeks of hard work from resetting to zero.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-bold text-cyan-400">
                <span>Zero discouragement</span>
                <span>Automatic Shield</span>
              </div>
            </div>

            {/* Bento Card 3: 4-Week Activity Heatmap */}
            <div className="glass-card rounded-2xl p-7 border border-white/10 hover:border-emerald-500/30 transition flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-5">
                  <BarChart3 size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">4-Week Activity Heatmap</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Inspect your visual consistency proof. A GitHub-inspired 28-day matrix tracks every check-in with color intensity shades from subtle emerald to glowing radiant green.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-bold text-emerald-400">
                <span>Visual momentum proof</span>
                <span>28-Day Window</span>
              </div>
            </div>

            {/* Bento Card 4: 18-Hour Smart Nudges */}
            <div className="glass-card rounded-2xl p-7 border border-white/10 hover:border-amber-500/30 transition flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-5">
                  <Clock size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">18-Hour Smart Email Nudges</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Never forget your routine. If 18 hours elapse without checking in on your active habit, our intelligent scheduler dispatches an elegant email reminder before your streak breaks.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-bold text-amber-400">
                <span>Zero spam, smart grouping</span>
                <span>18h Timer</span>
              </div>
            </div>

            {/* Bento Card 5: Category Specialization */}
            <div className="glass-card rounded-2xl p-7 border border-white/10 hover:border-teal-500/30 transition flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-5">
                  <Layers size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Multi-Category Analytics</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Balance your life across Health, Coding, Mindset, and Study. View completion percentage breakdowns, category distributions, and identify which routines need focus.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-bold text-teal-400">
                <span>Life balance metrics</span>
                <span>5 Core Categories</span>
              </div>
            </div>

            {/* Bento Card 6: Cryptographic Security & Export */}
            <div className="glass-card rounded-2xl p-7 border border-white/10 hover:border-emerald-500/30 transition flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-5">
                  <Lock size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Hardened Security & Ownership</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Engineered with 6-digit cryptographic email OTP authentication, NoSQL injection protection, rate-limiting, and 1-click JSON backup export for total data ownership.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-bold text-emerald-400">
                <span>100% Privacy first</span>
                <span>Instant JSON Export</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS 3-STEP WALKTHROUGH */}
      <section id="how-it-works" className="relative z-10 py-24 border-t border-white/10 bg-slate-900/30 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              How HabitForge Works
            </h2>
            <p className="text-sm sm:text-base text-slate-400 mt-3">
              Three simple steps to transform wishful thinking into consistent daily mastery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="glass-card rounded-2xl p-8 border border-white/10 relative">
              <div className="text-5xl font-black text-emerald-500/20 mb-4 font-mono">01</div>
              <h3 className="text-xl font-bold text-white mb-2.5">Forge Your Habit Quests</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Add daily or weekly habits with custom colors, icons, and categories. Choose from presets like "Daily Workout", "Code 1 Hour", or design your own bespoke routines.
              </p>
            </div>

            {/* Step 2 */}
            <div className="glass-card rounded-2xl p-8 border border-white/10 relative">
              <div className="text-5xl font-black text-emerald-500/20 mb-4 font-mono">02</div>
              <h3 className="text-xl font-bold text-white mb-2.5">Check In & Level Up</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Tap check-in each day to record your completion. Enjoy celebratory confetti animations, collect +10 XP, build unbroken streaks, and unlock rare achievement badges.
              </p>
            </div>

            {/* Step 3 */}
            <div className="glass-card rounded-2xl p-8 border border-white/10 relative">
              <div className="text-5xl font-black text-emerald-500/20 mb-4 font-mono">03</div>
              <h3 className="text-xl font-bold text-white mb-2.5">Protect Your Momentum</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Stay consistent over months and years with Streak Freeze shields. Review your 4-week activity heatmap, celebrate milestones, and watch yourself become unstoppable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* GAMIFICATION & BADGES VAULT SHOWCASE */}
      <section id="gamification" className="relative z-10 py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-3">
              <Award size={14} /> The Hall of Achievements
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Unlock Legendary Achievement Badges
            </h2>
            <p className="text-sm sm:text-base text-slate-400 mt-3">
              Every milestone unlocks a permanent commemorative badge in your profile.
            </p>
          </div>

          {/* Badges Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="glass-card rounded-2xl p-5 text-center border border-white/10 hover:border-amber-500/40 transition">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl mb-3">
                🔥
              </div>
              <div className="text-sm font-bold text-white">Streak Starter</div>
              <div className="text-[11px] text-slate-400 mt-1">3 Days in a row</div>
            </div>

            <div className="glass-card rounded-2xl p-5 text-center border border-white/10 hover:border-emerald-500/40 transition">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-2xl mb-3">
                ⚡
              </div>
              <div className="text-sm font-bold text-white">Consistency King</div>
              <div className="text-[11px] text-slate-400 mt-1">7 Days streak</div>
            </div>

            <div className="glass-card rounded-2xl p-5 text-center border border-white/10 hover:border-cyan-500/40 transition">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-2xl mb-3">
                🛡️
              </div>
              <div className="text-sm font-bold text-white">Cryo Guardian</div>
              <div className="text-[11px] text-slate-400 mt-1">Used a Freeze Shield</div>
            </div>

            <div className="glass-card rounded-2xl p-5 text-center border border-white/10 hover:border-purple-500/40 transition">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 text-2xl mb-3">
                🏆
              </div>
              <div className="text-sm font-bold text-white">Century Master</div>
              <div className="text-[11px] text-slate-400 mt-1">100 Completions</div>
            </div>

            <div className="glass-card rounded-2xl p-5 text-center border border-white/10 hover:border-teal-500/40 transition">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 text-2xl mb-3">
                ⚔️
              </div>
              <div className="text-sm font-bold text-white">Mythic Forger</div>
              <div className="text-[11px] text-slate-400 mt-1">Reached Level 10+</div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS / SOCIAL PROOF */}
      <section className="relative z-10 py-20 border-t border-white/10 bg-slate-900/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Loved by Builders, Athletes & Lifelong Learners
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-1 text-amber-400 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className="fill-amber-400" />
                ))}
              </div>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                "The XP and leveling system gives me the exact dopamine hit I need to write code and hit the gym every single day. The streak freeze saved me twice when I caught a fever!"
              </p>
              <div className="text-xs font-bold text-white">Alex R.</div>
              <div className="text-[11px] text-slate-400">Full-Stack Developer • Level 7</div>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-1 text-amber-400 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className="fill-amber-400" />
                ))}
              </div>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                "Other habit apps feel like a boring spreadsheet. HabitForge feels like a game I genuinely want to win. The 4-week activity heatmap is my favorite dashboard widget."
              </p>
              <div className="text-xs font-bold text-white">Maya S.</div>
              <div className="text-[11px] text-slate-400">UI/UX Designer • Level 9</div>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-1 text-amber-400 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className="fill-amber-400" />
                ))}
              </div>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                "The 18-hour reminder email is genuinely helpful without being annoying. It gently caught me on a crazy Friday and helped me maintain my 45-day meditation streak."
              </p>
              <div className="text-xs font-bold text-white">Daniel K.</div>
              <div className="text-[11px] text-slate-400">Engineering Lead • Level 12</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="relative z-10 py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Everything you need to know about the HabitForge experience.
            </p>
          </div>

          <div className="space-y-3.5">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="glass-card rounded-xl border border-white/10 overflow-hidden transition"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 focus:outline-none"
                  >
                    <span className="text-sm sm:text-base font-bold text-white">{faq.q}</span>
                    <ChevronDown
                      size={18}
                      className={`text-slate-400 transition-transform duration-200 shrink-0 ${
                        isOpen ? "rotate-180 text-emerald-400" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/5 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FINAL BOTTOM CALL TO ACTION */}
      <section className="relative z-10 py-20 border-t border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="glass-card rounded-3xl p-8 sm:p-14 border border-emerald-500/40 shadow-[0_20px_60px_rgba(16,185,129,0.25)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <img
              src={logo}
              alt="HabitForge Emblem"
              className="w-16 h-16 mx-auto mb-4 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]"
            />

            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight max-w-2xl mx-auto">
              Ready to Forge Your Best Self?
            </h2>

            <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
              Join thousands of creators, engineers, and achievers leveling up their daily habits today. Free forever on your core routines.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link to={user ? "/dashboard" : "/auth"}>
                <Button variant="primary" size="lg" className="gap-2.5 px-8 py-3.5 text-base shadow-[0_0_25px_rgba(16,185,129,0.4)]">
                  <span>{user ? "Open Your Dashboard" : "Start Forging Now — It's Free"}</span>
                  <ArrowRight size={16} />
                </Button>
              </Link>
            </div>

            <p className="text-[11px] text-slate-400 mt-4">
              No credit card required • Instant access in 30 seconds
            </p>
          </div>
        </div>
      </section>

      {/* RICH FOOTER */}
      <footer className="relative z-10 border-t border-white/10 bg-slate-950/80 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8 border-b border-white/10">
            {/* Logo & Tagline */}
            <div className="flex items-center gap-3">
              <img src={logo} alt="HabitForge" className="w-7 h-7" />
              <span className="text-base font-black text-white tracking-tight">
                Habit<span className="text-emerald-400">Forge</span>
              </span>
              <span className="text-xs text-slate-500 ml-2 hidden sm:inline">
                • Gamified Routine Platform
              </span>
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
              <a href="#features" className="hover:text-emerald-400 transition">
                Features
              </a>
              <a href="#interactive-demo" className="hover:text-emerald-400 transition">
                Live Demo
              </a>
              <a href="#how-it-works" className="hover:text-emerald-400 transition">
                How It Works
              </a>
              <a href="#faq" className="hover:text-emerald-400 transition">
                FAQ
              </a>
              <Link to="/auth" className="hover:text-emerald-400 transition">
                Sign In
              </Link>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div>© {new Date().getFullYear()} HabitForge. All rights reserved.</div>
            <div className="flex items-center gap-4">
              <a
                href="mailto:habitforgev@gmail.com"
                className="hover:text-slate-300 transition"
              >
                habitforgev@gmail.com
              </a>
              <span>•</span>
              <span>Encrypted & Hardened</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

