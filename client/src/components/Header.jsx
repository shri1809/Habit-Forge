import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
// 1. Import the logo again
import logo from "../assets/logo.png"; 
import headerBg from "../assets/header-bg.png";
import { User } from "lucide-react";
import { useState, useEffect } from "react";

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
    <header style={{backgroundImage: `url(${headerBg})`}} className={`sticky top-0 z-50 transition-all duration-300 ease-in-out border-b border-slate-800 bg-cover bg-center bg-no-repeat ${
    isScrolled ? "opacity-70 shadow-2xl" : "opacity-100 shadow-none"}`}>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left Side: Logo and Brand */}
        <Link to="/dashboard" className="flex items-center gap-2.5 group">
          <img 
            src={logo} 
            alt="HF" 
            className="w-8 h-8 opacity-90 group-hover:opacity-100 transition"
          />
          <span className="text-xl font-bold text-white group-hover:text-emerald-400 transition">
            Habit<span className="text-emerald-400 group-hover:text-white transition">Forge</span>
          </span>
        </Link>

        {/* Right Side: User Menu */}
        {user && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-emerald-400 border border-slate-700">
                <User size={16} />
              </div>
              <span>{user.name}</span>
              <span className="text-xs text-slate-500">Lv. {user.level}</span>
            </div>
            
            <button 
              type="button"
              onClick={logout}
              title="Sign Out"
              className="relative flex items-center justify-center p-3 rounded-2xl bg-teal-950/40 border border-emerald-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.15),inset_0_0_12px_rgba(16,185,129,0.1)] hover:border-emerald-400/60 hover:shadow-[0_0_25px_rgba(16,185,129,0.3),inset_0_0_15px_rgba(16,185,129,0.2)] transition-all duration-300 cursor-pointer"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="w-2 h-2 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.7)]" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}