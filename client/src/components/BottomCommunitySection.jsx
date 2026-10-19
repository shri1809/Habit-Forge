import { useState } from "react";
import { 
  Share2, 
  Copy, 
  Check, 
  Send, 
  Star, 
  MessageSquare, 
  Sparkles,
  Heart
} from "lucide-react";
import toast from "react-hot-toast";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function BottomCommunitySection() {
  const { user } = useAuth();

  // Invite Link State
  const [copied, setCopied] = useState(false);
  const inviteUrl = "https://habit-forge-six-chi.vercel.app/auth";

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Invitation link copied to clipboard!");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Could not copy link automatically. Please copy it manually.");
    }
  };

  const shareText = encodeURIComponent(
    "Join me on HabitForge! Build daily routine streaks, earn XP, and level up your life: "
  );
  const encodedUrl = encodeURIComponent(inviteUrl);

  // Feedback State
  const [rating, setRating] = useState(5);
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("Please enter a short feedback message.");
      return;
    }

    setSubmitting(true);
    try {
      await API.post("/feedback", {
        message: message.trim(),
        rating,
        category,
        email: user?.email,
        name: user?.name,
      });

      setSubmitted(true);
      setMessage("");
      toast.success("Feedback sent! Thank you for helping us improve HabitForge.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-16 pt-10 border-t border-slate-800/80 grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* 1. INVITE FRIENDS CARD */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-lg relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Share2 size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Invite Friends & Level Up
                <Sparkles size={16} className="text-emerald-400 animate-pulse" />
              </h3>
              <p className="text-xs text-slate-400">Habit building is 3x more effective with companions</p>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed mb-6">
            Share HabitForge with friends, colleagues, or study partners. Challenge each other to keep consistency streaks alive!
          </p>

          {/* Copyable Link Bar */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 flex items-center justify-between gap-3 mb-6">
            <span className="text-xs font-mono text-emerald-300 truncate pl-2 select-all">
              {inviteUrl}
            </span>
            <button
              onClick={handleCopyInvite}
              type="button"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-all active:scale-95 shrink-0"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? "Copied!" : "Copy Link"}</span>
            </button>
          </div>
        </div>

        {/* Quick Social Share Buttons */}
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
            Share directly via:
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={`https://api.whatsapp.com/send?text=${shareText}${encodedUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-colors"
            >
              WhatsApp
            </a>
            <a
              href={`https://t.me/share/url?url=${encodedUrl}&text=${shareText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-sky-950/40 hover:bg-sky-900/60 border border-sky-500/30 text-sky-300 text-xs font-medium transition-colors"
            >
              Telegram
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${shareText}&url=${encodedUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              Twitter / X
            </a>
            <a
              href={`mailto:?subject=Join me on HabitForge&body=${shareText}${encodedUrl}`}
              className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              Email
            </a>
          </div>
        </div>
      </div>

      {/* 2. FEEDBACK SECTION CARD */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Share Your Feedback</h3>
              <p className="text-xs text-slate-400">Delivered directly to habitforgev@gmail.com</p>
            </div>
          </div>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
              <Heart size={24} className="fill-emerald-400" />
            </div>
            <h4 className="text-base font-bold text-white">Thank You for Your Feedback!</h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Your thoughts help make HabitForge better for everyone.
            </p>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold underline pt-2"
            >
              Send another note
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitFeedback} className="space-y-4">
            {/* Category & Star Rating */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-slate-950/80 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500/60"
              >
                <option value="general">💡 General Feedback</option>
                <option value="feature_request">🚀 Feature Suggestion</option>
                <option value="bug_report">🐛 Report an Issue</option>
                <option value="praise">❤️ Kind Words</option>
              </select>

              {/* Interactive Star Rating */}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      size={18}
                      className={
                        star <= rating
                          ? "text-amber-400 fill-amber-400"
                          : "text-slate-600 hover:text-slate-400"
                      }
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Message Area */}
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What do you love? What can we improve? Let us know..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 resize-none transition-colors"
              maxLength={1500}
            />

            {/* Submit Button */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">
                {user ? `Logged in as ${user.email}` : "Submitting as guest"}
              </span>

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {submitting ? (
                  <span>Sending...</span>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Send Feedback</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}