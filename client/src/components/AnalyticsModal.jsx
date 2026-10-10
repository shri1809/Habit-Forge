import { useEffect, useState } from "react";
import { BarChart3, X, Zap, Target, Award, Download } from "lucide-react";
import API from "../api/axios";
import toast from "react-hot-toast";
import Button from "./ui/Button";

export default function AnalyticsModal({ isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await API.get("/habits/analytics");
        setData(res.data);
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [isOpen]);

  const handleExportData = async () => {
    try {
      const response = await API.get("/habits/export");
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `habitforge-data-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Data export downloaded!");
    } catch {
      toast.error("Failed to export data");
    }
  };

  if (!isOpen) return null;

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
          <div className="p-2.5 bg-emerald-500/15 text-emerald-400 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <BarChart3 size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Habit Analytics</h3>
            <p className="text-xs text-slate-400">
              Overview of your consistency and productivity metrics.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500 py-8 text-center">Loading insights...</p>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/[0.04] backdrop-blur-sm border border-white/10 p-3.5 rounded-xl text-center shadow-inner">
                <Target size={18} className="mx-auto text-emerald-400 mb-1 drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                <span className="text-lg font-black text-white">{data?.totalHabits || 0}</span>
                <p className="text-[11px] text-slate-400">Total Habits</p>
              </div>

              <div className="bg-white/[0.04] backdrop-blur-sm border border-white/10 p-3.5 rounded-xl text-center shadow-inner">
                <Zap size={18} className="mx-auto text-amber-400 mb-1 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
                <span className="text-lg font-black text-white">{data?.totalCheckIns || 0}</span>
                <p className="text-[11px] text-slate-400">Check-Ins</p>
              </div>

              <div className="bg-white/[0.04] backdrop-blur-sm border border-white/10 p-3.5 rounded-xl text-center shadow-inner">
                <Award size={18} className="mx-auto text-purple-400 mb-1 drop-shadow-[0_0_6px_rgba(168,85,247,0.5)]" />
                <span className="text-lg font-black text-white">{data?.bestStreak || 0}d</span>
                <p className="text-[11px] text-slate-400">Best Streak</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs uppercase font-bold text-slate-400 mb-3 tracking-wider">
                Category Breakdown
              </h4>
              <div className="space-y-2">
                {data?.categoryCounts && Object.keys(data.categoryCounts).length > 0 ? (
                  Object.entries(data.categoryCounts).map(([cat, count]) => (
                    <div
                      key={cat}
                      className="flex items-center justify-between text-sm bg-white/[0.03] border border-white/10 px-3.5 py-2.5 rounded-xl shadow-sm"
                    >
                      <span className="text-slate-300 font-medium">{cat}</span>
                      <span className="text-emerald-400 font-bold">{count} habits</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No habit data available.</p>
                )}
              </div>
            </div>

            {/* --- EXPORT BUTTON PLACEMENT --- */}
            <div className="pt-3 border-t border-white/10 flex justify-end">
              <Button
                onClick={handleExportData}
                variant="glass"
                size="sm"
                className="flex items-center gap-1.5 text-xs bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-white/20 text-slate-200 px-3.5 py-2 rounded-xl font-medium shadow-sm"
              >
                <Download size={14} /> Export All Data (.JSON)
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}