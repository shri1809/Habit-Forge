import { useEffect, useState, useMemo } from "react";
import { format, subDays, startOfWeek, addDays } from "date-fns";
import API from "../api/axios";

const DAYS = 90;

export default function ActivityHeatmap() {
  const [historyMap, setHistoryMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null); // { date, label, count, x, y }

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

  /**
   * Build a 90-day calendar grid aligned to full weeks (Mon–Sun).
   * We pad backwards to the nearest Monday so columns are always
   * 7 days tall, like a GitHub contribution graph.
   */
  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = subDays(today, DAYS - 1);
    // Rewind to Monday of that week so columns are full weeks
    const gridStart = startOfWeek(startDate, { weekStartsOn: 1 });

    // Build flat list of days from gridStart to today
    const allDays = [];
    let d = new Date(gridStart);
    while (d <= today) {
      const dateStr = format(d, "yyyy-MM-dd");
      allDays.push({
        date: dateStr,
        label: format(d, "MMM d"),
        count: historyMap[dateStr] || 0,
        inRange: d >= startDate, // days before the 90-day window are "padding"
        dayOfWeek: d.getDay(), // 0 = Sun … 6 = Sat
      });
      d = addDays(d, 1);
    }

    // Split into weeks (columns of 7)
    const cols = [];
    for (let i = 0; i < allDays.length; i += 7) {
      cols.push(allDays.slice(i, i + 7));
    }

    // Month labels: show month name at the first column where the month appears
    const seenMonths = new Set();
    const labels = cols.map((col, colIdx) => {
      const firstInRange = col.find((day) => day.inRange);
      if (!firstInRange) return null;
      const month = format(new Date(firstInRange.date), "MMM");
      if (seenMonths.has(month)) return null;
      seenMonths.add(month);
      return { colIdx, label: month };
    });

    return { weeks: cols, monthLabels: labels.filter(Boolean) };
  }, [historyMap]);

  const getCell = (day) => {
    if (!day.inRange) {
      return "bg-transparent border-transparent cursor-default";
    }
    if (day.count === 0)
      return "bg-slate-800/40 border-white/5 text-slate-500 hover:border-white/20 cursor-pointer";
    if (day.count === 1)
      return "bg-emerald-900/60 border-emerald-500/30 text-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.15)] cursor-pointer";
    if (day.count === 2)
      return "bg-emerald-600/80 border-emerald-400/50 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)] cursor-pointer";
    return "bg-emerald-400 border-emerald-300 text-slate-950 font-bold shadow-[0_0_15px_rgba(52,211,153,0.5)] cursor-pointer";
  };

  const DAY_LABELS = ["Mon", "Wed", "Fri"];
  const DAY_LABEL_ROWS = [0, 2, 4]; // Mon=index 0, Wed=2, Fri=4 (0-indexed Mon-start)

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.08)] relative">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-200 tracking-tight">
            Consistency Grid
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Last 90 days · Completed Habits / Day</p>
        </div>
      </div>

      {loading ? (
        <div className="h-28 flex items-center justify-center text-xs text-slate-500">
          Loading consistency data...
        </div>
      ) : (
        <div className="overflow-x-auto pb-1">
          {/* Month labels row */}
          <div
            className="grid mb-1"
            style={{ gridTemplateColumns: `28px repeat(${weeks.length}, minmax(0,1fr))` }}
          >
            <div /> {/* spacer for day labels */}
            {weeks.map((_, colIdx) => {
              const ml = monthLabels.find((m) => m.colIdx === colIdx);
              return (
                <div key={colIdx} className="text-[10px] text-slate-500 text-center leading-none">
                  {ml ? ml.label : ""}
                </div>
              );
            })}
          </div>

          {/* Grid body: day-label column + week columns */}
          <div
            className="grid gap-x-1"
            style={{ gridTemplateColumns: `28px repeat(${weeks.length}, minmax(0,1fr))` }}
          >
            {/* Day-of-week labels (Mon / Wed / Fri) */}
            <div className="grid grid-rows-7 gap-y-1">
              {[0, 1, 2, 3, 4, 5, 6].map((row) => (
                <div
                  key={row}
                  className="h-[10px] flex items-center justify-end pr-1 text-[9px] text-slate-500"
                >
                  {DAY_LABEL_ROWS.includes(row) ? DAY_LABELS[DAY_LABEL_ROWS.indexOf(row)] : ""}
                </div>
              ))}
            </div>

            {/* Week columns */}
            {weeks.map((col, colIdx) => (
              <div key={colIdx} className="grid grid-rows-7 gap-y-1">
                {col.map((day, rowIdx) => (
                  <div
                    key={day.date}
                    title={
                      day.inRange
                        ? `${day.label}: ${day.count} completion${day.count === 1 ? "" : "s"}`
                        : undefined
                    }
                    className={`h-[10px] rounded-sm border transition-all duration-150 hover:scale-125 ${getCell(day)}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-4 text-xs text-slate-500">
        <span>Less</span>
        <span className="w-3 h-3 rounded-sm bg-slate-800/40 border border-white/10 inline-block" />
        <span className="w-3 h-3 rounded-sm bg-emerald-900/60 border border-emerald-500/30 inline-block" />
        <span className="w-3 h-3 rounded-sm bg-emerald-600/80 border border-emerald-400/50 inline-block" />
        <span className="w-3 h-3 rounded-sm bg-emerald-400 border border-emerald-300 inline-block" />
        <span>More</span>
      </div>
    </div>
  );
}
