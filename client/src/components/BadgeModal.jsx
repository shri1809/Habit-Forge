import { Award, Crown, Footprints, Shield, X, Lock } from "lucide-react";
import Button from "./ui/Button";

const ALL_BADGES = [
  {
    name: "First Step",
    description: "Complete your first habit check-in.",
    icon: Footprints,
  },
  {
    name: "Consistency King",
    description: "Reach a 7-day streak on any habit.",
    icon: Crown,
  },
  {
    name: "Iron Will",
    description: "Maintain a 30-day streak on any habit.",
    icon: Shield,
  },
];

export default function BadgeModal({ isOpen, onClose, userBadges = [] }) {
  if (!isOpen) return null;

  const unlockedBadgeNames = new Set(userBadges.map((b) => b.name));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/15 w-full max-w-lg rounded-2xl p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.15)] relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.08]"
          title="Close"
        >
          <X size={20} />
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-purple-500/15 text-purple-400 rounded-xl border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Award size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Achievements & Badges</h3>
            <p className="text-xs text-slate-400">
              Unlock badges by building consistency and holding streaks.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {ALL_BADGES.map((badge) => {
            const Icon = badge.icon;
            const isUnlocked = unlockedBadgeNames.has(badge.name);

            return (
              <div
                key={badge.name}
                className={`flex items-center gap-4 p-4 rounded-xl border transition ${
                  isUnlocked
                    ? "bg-purple-950/25 backdrop-blur-md border-purple-500/35 text-white shadow-[0_4px_20px_rgba(168,85,247,0.15),inset_0_1px_0_0_rgba(255,255,255,0.1)]"
                    : "bg-white/[0.02] backdrop-blur-sm border-white/5 text-slate-500 opacity-60"
                }`}
              >
                <div
                  className={`p-3 rounded-xl ${
                    isUnlocked
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.25)]"
                      : "bg-slate-800/50 text-slate-600 border border-white/5"
                  }`}
                >
                  <Icon size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm text-slate-200">
                      {badge.name}
                    </h4>
                    {isUnlocked ? (
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]">
                        Unlocked
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                        <Lock size={12} /> Locked
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{badge.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}