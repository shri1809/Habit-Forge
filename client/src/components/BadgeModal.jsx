import { Award, Crown, Footprints, Shield, X, Lock } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl">
            <Award size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Achievements & Badges</h3>
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
                    ? "bg-slate-800/60 border-purple-500/30 text-white"
                    : "bg-slate-900/40 border-slate-800 text-slate-500 opacity-60"
                }`}
              >
                <div
                  className={`p-3 rounded-xl ${
                    isUnlocked
                      ? "bg-purple-500/20 text-purple-300"
                      : "bg-slate-800 text-slate-600"
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
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
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