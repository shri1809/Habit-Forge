import { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import API from "../api/axios";
import toast from "react-hot-toast";
import {
  KeyRound,
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  X,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import Button from "./ui/Button";

export default function ForgotPasswordModal({
  isOpen,
  defaultEmail = "",
  onClose,
  onSuccess,
}) {
  const [step, setStep] = useState(1); // 1: Email Request, 2: OTP & New Password
  const [email, setEmail] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  // Sync defaultEmail when modal opens
  useEffect(() => {
    if (isOpen) {
      setEmail(defaultEmail || "");
      setStep(1);
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
  }, [isOpen, defaultEmail]);

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  if (!isOpen) return null;

  // Step 1: Send OTP to Email
  const handleRequestOtp = async (e) => {
    e?.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please provide a valid email address.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await API.post("/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });

      toast.success(res.data.message || "Password reset code sent to your email!");
      setMaskedEmail(res.data.maskedEmail || email);
      setCountdown(res.data.cooldownSeconds || 60);
      setStep(2);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to send reset code. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Resend OTP
  const handleResendOtp = async () => {
    if (countdown > 0 || resending) return;

    setError("");
    setResending(true);

    try {
      const res = await API.post("/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });

      toast.success(res.data.message || "New reset code sent!");
      setCountdown(res.data.cooldownSeconds || 60);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to resend code.";
      setError(msg);
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  // Step 2: Verify OTP and Set New Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (!otp || otp.trim().length !== 6) {
      setError("Please enter the 6-digit verification code sent to your email.");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please verify both fields.");
      return;
    }

    setLoading(true);

    try {
      const res = await API.post("/auth/reset-password", {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword,
      });

      // Trigger celebratory confetti
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#10b981", "#34d399", "#38bdf8", "#f59e0b"],
      });

      toast.success(res.data.message || "Password reset successful! You can now sign in.");

      if (onSuccess) {
        onSuccess(email.trim().toLowerCase());
      }
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to reset password. Please check the code and try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900/90 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.1)] overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition focus:outline-none"
          aria-label="Close Modal"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
            {step === 1 ? <KeyRound size={22} /> : <Lock size={22} />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              {step === 1 ? "Reset Your Password" : "Set New Password"}
            </h3>
            <p className="text-xs text-slate-400">
              {step === 1
                ? "We'll send a 6-digit reset code to your email"
                : `Enter code sent to ${maskedEmail || email}`}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 flex items-start gap-2.5 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Enter Email */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                Account Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/20 transition shadow-inner"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              size="none"
              variant="primary"
              className="w-full py-2.5 px-4 rounded-xl mt-2 flex items-center justify-center gap-2"
            >
              {loading ? "Sending Code..." : "Send Reset Code →"}
            </Button>
          </form>
        )}

        {/* STEP 2: Enter OTP & New Password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {/* 6-Digit OTP Code Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase">
                  6-Digit Reset Code
                </label>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={countdown > 0 || resending}
                  className={`text-[11px] font-semibold transition ${
                    countdown > 0
                      ? "text-slate-500 cursor-not-allowed"
                      : "text-emerald-400 hover:text-emerald-300 cursor-pointer"
                  }`}
                >
                  {resending
                    ? "Sending..."
                    : countdown > 0
                    ? `Resend code in ${countdown}s`
                    : "Resend Code"}
                </button>
              </div>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-white/10 rounded-xl text-white placeholder-slate-600 text-center text-lg font-mono tracking-[0.35em] font-bold focus:outline-none focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/20 transition shadow-inner"
              />
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full px-3.5 py-2.5 pr-11 bg-slate-950/70 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/20 transition shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400 transition-colors p-1 focus:outline-none"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3.5 py-2.5 pr-11 bg-slate-950/70 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/20 transition shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400 transition-colors p-1 focus:outline-none"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              size="none"
              variant="primary"
              className="w-full py-2.5 px-4 rounded-xl mt-2 flex items-center justify-center gap-2"
            >
              {loading ? "Resetting Password..." : "Reset Password & Continue →"}
            </Button>

            {/* Back to Step 1 */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-slate-400 hover:text-slate-200 transition"
              >
                ← Change email address
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

