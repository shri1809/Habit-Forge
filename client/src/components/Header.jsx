import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
// 1. Import the logo again
import logo from "../assets/logo.png"; 
import headerBg from "../assets/header-bg.png";
import { User } from "lucide-react";
import { useState, useEffect } from "react";
import Button from "./ui/Button";

export default function Header() {
  const { user, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 1) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
      
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      style={{ backgroundImage: `url(${headerBg})` }}
      className={`sticky top-0 z-50 transition-all duration-300 ease-in-out border-b border-white/10 backdrop-blur-xl bg-slate-950/75 bg-cover bg-center bg-no-repeat ${
        isScrolled
          ? "bg-slate-950/85 border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.1)]"
          : "shadow-[0_4px_20px_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.06)]"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left Side: Logo and Brand */}
        <Link to="/dashboard" className="flex items-center gap-2.5 group">
          <img 
            src={logo} 
            alt="HF" 
            className="w-8 h-8 opacity-90 group-hover:opacity-100 transition drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]"
          />
          <span className="text-xl font-bold text-white group-hover:text-emerald-400 transition tracking-tight">
            Habit<span className="text-emerald-400 group-hover:text-white transition">Forge</span>
          </span>
        </Link>

        {/* Right Side: User Menu */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 text-sm text-slate-200 bg-white/[0.05] backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full shadow-sm">
              <div className="w-6 h-6 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                <User size={13} />
              </div>
              <span className="font-medium text-xs">{user.name}</span>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                Lv. {user.level}
              </span>
            </div>
            
            <Button 
              type="button"
              onClick={logout}
              title="Sign Out"
              size="icon"
              rippleColor="rgba(52, 211, 153, 0.4)"
              className="relative p-2.5 rounded-xl bg-teal-950/40 border border-emerald-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.15),inset_0_0_12px_rgba(16,185,129,0.1)] hover:border-emerald-400/60 hover:shadow-[0_0_25px_rgba(16,185,129,0.3),inset_0_0_15px_rgba(16,185,129,0.2)] transition-all duration-300"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="w-3.5 h-3.5 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.7)]" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth="2.2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </Button>
          </div>
        )}
      </nav>
    </header>
  );
}