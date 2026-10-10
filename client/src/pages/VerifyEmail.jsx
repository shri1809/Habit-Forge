import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate, useLocation, Link } from "react-router-dom";
import { CheckCircle2, AlertCircle, Loader2, Mail, RefreshCw, ArrowLeft, ShieldCheck } from "lucide-react";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  // Redirect if user is already verified and authenticated
  useEffect(() => {
    if (user && user.isVerified) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  // Retrieve email from route state, query parameter, or sessionStorage
  const resolvedEmail =
    location.state?.email ||
    searchParams.get("email") ||
    sessionStorage.getItem("pending_verification_email") ||
    "";

  const [email, setEmail] = useState(resolvedEmail);
  const [isEditingEmail, setIsEditingEmail] = useState(!resolvedEmail);

  // 6-digit OTP array
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([]);

  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Resend cooldown timer in seconds (60s default)
  const [cooldown, setCooldown] = useState(60);
  const [resending, setResending] = useState(false);

  // Handle countdown interval
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Focus first input box on mount
  useEffect(() => {
    if (inputRefs.current[0] && !isEditingEmail) {
      inputRefs.current[0].focus();
    }
  }, [isEditingEmail]);

  // Backward-compatible token link fallback: if token is present in URL, auto-verify
  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) return;

    const verifyLegacyToken = async () => {
      setLoading(true);
      try {
        const res = await API.post("/auth/verify-email", { token });
        setIsSuccess(true);
        toast.success(res.data.message || "Email verified successfully!");
      } catch (err) {
        setErrorMessage(err.response?.data?.message || "Verification failed or token expired.");
      } finally {
        setLoading(false);
      }
    };

    verifyLegacyToken();
  }, [searchParams]);

  // Handle individual digit input
  const handleDigitChange = (index, value) => {
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) {
      const newOtp = [...otp];
      newOtp[index] = "";
      setOtp(newOtp);
      return;
    }

    const digit = cleaned.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setErrorMessage("");

    // Auto-advance to next input
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are populated
    const combined = newOtp.join("");
    if (combined.length === 6 && email.trim()) {
      submitVerification(combined);
    }
  };

  // Handle backspace and arrow navigation
  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle clipboard paste of full OTP code
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    const digits = pastedData.split("");
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = digits[i] || "";
    }
    setOtp(newOtp);
    setErrorMessage("");

    const nextIndex = Math.min(digits.length, 5);
    inputRefs.current[nextIndex]?.focus();

    if (pastedData.length === 6 && email.trim()) {
      submitVerification(pastedData);
    }
  };

  const submitVerification = async (codeToSubmit) => {
    const code = codeToSubmit || otp.join("");
    const targetEmail = email.trim().toLowerCase();

    if (!targetEmail) {
      setErrorMessage("Please specify your email address.");
      setIsEditingEmail(true);
      return;
    }

    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setErrorMessage("Please enter all 6 digits of the verification code.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const res = await API.post("/auth/verify-email-otp", {
        email: targetEmail,
        otp: code,
      });

      setIsSuccess(true);
      sessionStorage.removeItem("pending_verification_email");
      sessionStorage.removeItem("pending_verification_token");

      toast.success(res.data.message || "Account verified successfully!");

      // If server returned auth token and user, seamlessly update session
      if (res.data.token && res.data.user) {
        localStorage.setItem("habitforge_token", res.data.token);
        if (setUser) {
          setUser(res.data.user);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Invalid or expired verification code.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    const targetEmail = email.trim().toLowerCase();

    if (!targetEmail) {
      setErrorMessage("Please enter your email address to receive a verification code.");
      setIsEditingEmail(true);
      return;
    }

    setResending(true);
    setErrorMessage("");

    try {
      const res = await API.post("/auth/resend-email-otp", {
        email: targetEmail,
      });
      setCooldown(res.data.cooldownSeconds || 60);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      toast.success("A fresh verification code has been dispatched to your email!");
    } catch (err) {
      const retryAfter = err.response?.data?.retryAfterSeconds;
      if (retryAfter) {
        setCooldown(retryAfter);
      }
      toast.error(err.response?.data?.message || "Failed to resend code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const maskEmailDisplay = (addr) => {
    if (!addr || !addr.includes("@")) return addr;
    const [local, dom] = addr.trim().toLowerCase().split("@");
    if (local.length <= 2) return `${local[0]}*@${dom}`;
    return `${local[0]}***${local[local.length - 1]}@${dom}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full shadow-2xl space-y-6">
        {/* Header Icon */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-emerald-500/20">
            {isSuccess ? <CheckCircle2 size={32} /> : <ShieldCheck size={32} />}
          </div>
          <h2 className="text-2xl font-bold text-white">
            {isSuccess ? "Account Verified!" : "Verify Your Email"}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {isSuccess
              ? "Your email has been confirmed. You are ready to forge your habits."
              : "We sent a 6-digit confirmation code to your email address. Enter it below to activate your account."}
          </p>
        </div>

        {/* Success View */}
        {isSuccess ? (
          <div className="space-y-4 pt-2">
            <button
              onClick={() => navigate(user ? "/dashboard" : "/auth")}
              className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              {user ? "Continue to Dashboard" : "Sign In to HabitForge"}
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Target Email Info & Edit Option */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300 truncate">
                <Mail size={16} className="text-emerald-400 shrink-0" />
                {isEditingEmail ? (
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white focus:outline-none focus:border-emerald-500 text-xs w-48"
                  />
                ) : (
                  <span className="font-medium truncate" title={email}>
                    {maskEmailDisplay(email) || "No email specified"}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsEditingEmail(!isEditingEmail)}
                className="text-emerald-400 hover:text-emerald-300 font-semibold shrink-0 cursor-pointer ml-2"
              >
                {isEditingEmail ? "Done" : "Change"}
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs"
              >
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 6-Digit OTP Input Grid */}
            <div>
              <label
                htmlFor="otp-digit-0"
                className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 text-center"
              >
                6-Digit Security Code
              </label>
              <div
                className="flex items-center justify-center gap-2 sm:gap-2.5"
                onPaste={handlePaste}
              >
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-digit-${idx}`}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    maxLength={1}
                    aria-label={`Digit ${idx + 1} of 6-digit verification code`}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    disabled={loading}
                    className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all duration-200"
                  />
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                disabled={loading || otp.join("").length !== 6}
                onClick={() => submitVerification()}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Verifying...
                  </>
                ) : (
                  "Verify Code"
                )}
              </button>

              {/* Resend Code with Cooldown */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>Didn't receive the code?</span>
                <button
                  type="button"
                  disabled={cooldown > 0 || resending}
                  onClick={handleResend}
                  className={`font-semibold flex items-center gap-1 transition ${
                    cooldown > 0
                      ? "text-slate-500 cursor-not-allowed"
                      : "text-emerald-400 hover:text-emerald-300 cursor-pointer"
                  }`}
                >
                  <RefreshCw size={12} className={resending ? "animate-spin" : ""} />
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Code"}
                </button>
              </div>
            </div>

            {/* Back to Sign In */}
            <div className="text-center pt-2 border-t border-slate-800/80">
              <Link
                to="/auth"
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
              >
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}