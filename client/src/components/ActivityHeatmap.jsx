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
    if (count === 0) return "bg-slate-800 border-slate-700/50";
    if (count === 1) return "bg-emerald-800 border-emerald-700 text-emerald-100";
    if (count === 2) return "bg-emerald-600 border-emerald-500 text-white";
    return "bg-emerald-400 border-emerald-300 text-slate-950 font-bold";
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-200">
          Consistency Grid (Last 4 Weeks)
        </h3>
        <span className="text-xs text-slate-500">Completed Habits / Day</span>
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
              className={`h-10 rounded-lg border flex flex-col items-center justify-center transition-transform hover:scale-105 cursor-pointer ${getColorIntensity(
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
        <span className="w-3 h-3 rounded bg-slate-800 border border-slate-700 inline-block" />
        <span className="w-3 h-3 rounded bg-emerald-800 border border-emerald-700 inline-block" />
        <span className="w-3 h-3 rounded bg-emerald-600 border border-emerald-500 inline-block" />
        <span className="w-3 h-3 rounded bg-emerald-400 border border-emerald-300 inline-block" />
        <span>More</span>
      </div>
    </div>
  );
}