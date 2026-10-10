import { useEffect, useState } from "react";
import { format, subDays } from "date-fns";
import API from "../api/axios";

export default function ActivityHeatmap() {
  const [historyMap, setHistoryMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await API.get("/habits/history");
        setHistoryMap(data.historyMap || {});
      } catch (err) {
        console.error("Failed to fetch completion history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  // Generate the last 28 days (4 full weeks) in chronological order
  const days = Array.from({ length: 28 }, (_, i) => {
    const dateObj = subDays(new Date(), 27 - i);
    const dateStr = format(dateObj, "yyyy-MM-dd");
    const count = historyMap[dateStr] || 0;
    return {
      date: dateStr,
      label: format(dateObj, "MMM d"),
      count,
    };
  });

  const getColorIntensity = (count) => {
    if (count === 0) return "bg-slate-800/40 border-white/5 text-slate-500 hover:border-white/20";
    if (count === 1) return "bg-emerald-900/60 border-emerald-500/30 text-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.15)]";
    if (count === 2) return "bg-emerald-600/80 border-emerald-400/50 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]";
    return "bg-emerald-400 border-emerald-300 text-slate-950 font-bold shadow-[0_0_15px_rgba(52,211,153,0.5)]";
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.08)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-200 tracking-tight">
          Consistency Grid (Last 4 Weeks)
        </h3>
        <span className="text-xs text-slate-400">Completed Habits / Day</span>
      </div>

      {loading ? (
        <div className="h-14 flex items-center justify-center text-xs text-slate-500">
          Loading consistency data...
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => (
            <div
              key={day.date}
              title={`${day.label}: ${day.count} completion${day.count === 1 ? "" : "s"}`}
              className={`h-10 rounded-lg border flex flex-col items-center justify-center transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.08] active:scale-[0.94] cursor-pointer backdrop-blur-sm select-none ${getColorIntensity(
                day.count
              )}`}
            >
              <span className="text-[10px] opacity-75">{day.label.split(" ")[1]}</span>
              {day.count > 0 && <span className="text-xs">{day.count}</span>}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 mt-4 text-xs text-slate-500">
        <span>Less</span>
        <span className="w-3 h-3 rounded bg-slate-800/40 border border-white/10 inline-block" />
        <span className="w-3 h-3 rounded bg-emerald-900/60 border border-emerald-500/30 inline-block" />
        <span className="w-3 h-3 rounded bg-emerald-600/80 border border-emerald-400/50 inline-block" />
        <span className="w-3 h-3 rounded bg-emerald-400 border border-emerald-300 inline-block" />
        <span>More</span>
      </div>
    </div>
  );
}