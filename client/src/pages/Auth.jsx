import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import toast from "react-hot-toast";
import { AlertCircle } from "lucide-react";
import Button from "../components/ui/Button";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const normalizedEmail = email.toLowerCase().trim();

    try {
      if (isLogin) {
        // Attempt login
        await login(normalizedEmail, password);
        toast.success("Welcome back!");
        navigate("/dashboard");
      } else {
        // Attempt registration
        const res = await API.post("/auth/register", {
          name: name.trim(),
          email: normalizedEmail,
          password,
        });

        toast.success(res.data.message || "Verification code sent to your email!");

        // Persist pending verification state for page refresh resilience
        sessionStorage.setItem("pending_verification_email", normalizedEmail);
        if (res.data.verificationToken) {
          sessionStorage.setItem("pending_verification_token", res.data.verificationToken);
        }

        // Redirect immediately to the dedicated 6-digit OTP verification screen
        navigate("/verify-email", {
          state: {
            email: normalizedEmail,
            maskedEmail: res.data.maskedEmail,
          },
        });
      }
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message || "Authentication failed";

      if (status === 403) {
        // Unverified account state on login
        const unverifiedEmail = err.response?.data?.email || normalizedEmail;
        const masked = err.response?.data?.maskedEmail;

        sessionStorage.setItem("pending_verification_email", unverifiedEmail);
        if (err.response?.data?.verificationToken) {
          sessionStorage.setItem("pending_verification_token", err.response.data.verificationToken);
        }

        toast.error("Please verify your email address to sign in.");

        navigate("/verify-email", {
          state: {
            email: unverifiedEmail,
            maskedEmail: masked,
          },
        });
      } else {
        setError(message);
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient Glass Glow Lighting */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/15 rounded-full blur-[100px]" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-500/15 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 space-y-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.1)] relative z-10">
        <div className="text-center space-y-2">
          <img
            src={logo}
            alt="HabitForge Logo"
            className="w-16 h-16 mx-auto mb-2 opacity-90 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          />
          <h1 className="text-3xl font-extrabold text-emerald-400 tracking-tight">HabitForge</h1>
          <p className="text-sm text-slate-400">
            {isLogin ? "Welcome back! Level up your routines." : "Forge your habits, gain XP, level up."}
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm backdrop-blur-md">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3.5 py-2.5 bg-slate-950/60 backdrop-blur-md border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/20 transition text-sm shadow-inner"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-3.5 py-2.5 bg-slate-950/60 backdrop-blur-md border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/20 transition text-sm shadow-inner"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-slate-950/60 backdrop-blur-md border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/20 transition text-sm shadow-inner"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            size="none"
            variant="primary"
            className="w-full py-3 px-4 rounded-xl mt-2 flex items-center justify-center gap-2"
          >
            {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
          </Button>
        </form>

        <div className="text-center pt-2">
          <Button
            type="button"
            variant="ghost"
            size="none"
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            className="text-xs text-slate-400 hover:text-slate-200 py-1 px-2 rounded-lg"
          >
            {isLogin ? (
              <>Don't have an account? <span className="text-emerald-400 font-semibold">Sign up</span></>
            ) : (
              <>Already have an account? <span className="text-emerald-400 font-semibold">Log in</span></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}