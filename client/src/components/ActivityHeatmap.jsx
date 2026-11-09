import { useEffect, useState, useMemo, useRef } from "react";
import { format, startOfWeek, subWeeks, addDays } from "date-fns";
import { Zap, Flame, Target, Trophy } from "lucide-react";
import API from "../api/axios";

// HabitForge Emerald Glass Theme Colors
const THEME_COLORS = {
  level0: "#0f172a", // Slate-900 (empty day)
  level0Stroke: "rgba(255, 255, 255, 0.08)",
  level1: "#064e3b", // Deep Emerald (1 check-in)
  level1Stroke: "#047857",
  level2: "#047857", // Emerald 700 (2 check-ins)
  level2Stroke: "#059669",
  level3: "#059669", // Vibrant Emerald (3 check-ins)
  level3Stroke: "#10b981",
  level4: "#10b981", // Radiant Emerald (4+ check-ins)
  level4Stroke: "#34d399",
  textMuted: "#94a3b8", // Slate 400
};

// Period-specific dimensions so 3 Months has generous, prominent squares!
const RANGES = [
  {
    id: "3m",
    label: "3 Months",
    weeks: 14,
    cellSize: 22,
    cellGap: 5,
    cellRadius: 4,
    fontSize: 10,
    dayLabelFontSize: 10,
    leftPad: 36,
    topPad: 24,
  },
  {
    id: "6m",
    label: "6 Months",
    weeks: 26,
    cellSize: 15,
    cellGap: 4,
    cellRadius: 3,
    fontSize: 9,
    dayLabelFontSize: 9,
    leftPad: 32,
    topPad: 22,
  },
  {
    id: "1y",
    label: "1 Year",
    weeks: 52,
    cellSize: 11,
    cellGap: 3,
    cellRadius: 2,
    fontSize: 9,
    dayLabelFontSize: 8,
    leftPad: 30,
    topPad: 20,
  },
];

export default function ActivityHeatmap() {
  const [historyMap, setHistoryMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeRange, setActiveRange] = useState("3m"); // Default to 3 months
  const [tooltip, setTooltip] = useState(null); // { x, y, count, dateStr }
  const containerRef = useRef(null);

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

  const selectedRange = RANGES.find((r) => r.id === activeRange) || RANGES[0];
  const {
    weeks: numWeeks,
    cellSize: CELL_SIZE,
    cellGap: CELL_GAP,
    cellRadius: CELL_RADIUS,
    fontSize: FONT_SIZE,
    dayLabelFontSize: DAY_LABEL_FONT_SIZE,
    leftPad: LEFT_PAD,
    topPad: TOP_PAD,
  } = selectedRange;

  const pitch = CELL_SIZE + CELL_GAP;

  /**
   * Build the week columns array starting from Sunday numWeeks ago through today.
   * Matches 7-day Sunday-to-Saturday columns with Mon/Wed/Fri labels.
   */
  const {
    weeks,
    monthLabels,
    totalCheckIns,
    activeDaysCount,
    totalPastDays,
    consistencyRate,
    bestStreakInPeriod,
    dailyAverage,
  } = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Current week's Sunday
    const currentSunday = startOfWeek(today, { weekStartsOn: 0 }); // 0 = Sunday
    // Start Sunday numWeeks ago
    const startSunday = subWeeks(currentSunday, numWeeks - 1);

    const weekCols = [];
    let curDate = new Date(startSunday);
    let totalInPeriod = 0;
    let activeDays = 0;
    let pastDays = 0;

    // Streak tracking within period
    let currentStreakCount = 0;
    let maxStreakCount = 0;

    for (let w = 0; w < numWeeks; w++) {
      const days = [];
      for (let r = 0; r < 7; r++) {
        const dateStr = format(curDate, "yyyy-MM-dd");
        const isFuture = curDate > today;
        const count = isFuture ? 0 : historyMap[dateStr] || 0;

        if (!isFuture) {
          pastDays += 1;
          if (count > 0) {
            totalInPeriod += count;
            activeDays += 1;
            currentStreakCount += 1;
            if (currentStreakCount > maxStreakCount) {
              maxStreakCount = currentStreakCount;
            }
          } else {
            currentStreakCount = 0;
          }
        }

        days.push({
          date: dateStr,
          dayIndex: r, // 0 = Sun, 1 = Mon, ..., 6 = Sat
          weekIndex: w,
          isFuture,
          count,
          monthName: format(curDate, "MMM"),
          formattedDate: format(curDate, "EEEE, MMMM d, yyyy"),
        });

        curDate = addDays(curDate, 1);
      }
      weekCols.push(days);
    }

    // Month label positions (place label above the first column where a new month starts)
    const labels = [];
    let lastMonth = "";
    weekCols.forEach((week, colIdx) => {
      const validDay = week.find((d) => !d.isFuture);
      if (!validDay) return;
      if (validDay.monthName !== lastMonth) {
        const lastCol = labels.length ? labels[labels.length - 1].colIdx : -99;
        if (colIdx - lastCol >= 2) {
          labels.push({ colIdx, label: validDay.monthName });
          lastMonth = validDay.monthName;
        }
      }
    });

    const rate = pastDays > 0 ? Math.round((activeDays / pastDays) * 100) : 0;
    const avg = activeDays > 0 ? (totalInPeriod / activeDays).toFixed(1) : "0";

    return {
      weeks: weekCols,
      monthLabels: labels,
      totalCheckIns: totalInPeriod,
      activeDaysCount: activeDays,
      totalPastDays: pastDays,
      consistencyRate: rate,
      bestStreakInPeriod: maxStreakCount,
      dailyAverage: avg,
    };
  }, [historyMap, numWeeks]);

  const getCellFill = (count) => {
    if (count <= 0) return THEME_COLORS.level0;
    if (count === 1) return THEME_COLORS.level1;
    if (count === 2) return THEME_COLORS.level2;
    if (count === 3) return THEME_COLORS.level3;
    return THEME_COLORS.level4;
  };

  const getCellStroke = (count) => {
    if (count <= 0) return THEME_COLORS.level0Stroke;
    if (count === 1) return THEME_COLORS.level1Stroke;
    if (count === 2) return THEME_COLORS.level2Stroke;
    if (count === 3) return THEME_COLORS.level3Stroke;
    return THEME_COLORS.level4Stroke;
  };

  const svgWidth = LEFT_PAD + numWeeks * pitch + 10;
  const svgHeight = TOP_PAD + 7 * pitch + 6;

  const handleCellMouseEnter = (day, e) => {
    if (day.isFuture) return;
    const rect = e.target.getBoundingClientRect();
    const containerRect = containerRef.current
      ? containerRef.current.getBoundingClientRect()
      : { left: 0, top: 0 };

    setTooltip({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 8,
      count: day.count,
      dateStr: day.formattedDate,
    });
  };

  const handleCellMouseLeave = () => {
    setTooltip(null);
  };

  const isThreeMonths = activeRange === "3m";

  return (
    <div
      ref={containerRef}
      className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.08)] relative text-slate-100"
    >
      {/* Header: Title, Subtitle, and Range Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            Consistency Calendar
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            <span className="font-bold text-emerald-400 font-mono text-sm">
              {totalCheckIns}
            </span>{" "}
            total check-in{totalCheckIns === 1 ? "" : "s"} across{" "}
            <span className="font-semibold text-slate-200">{activeDaysCount}</span> active day
            {activeDaysCount === 1 ? "" : "s"} in the last{" "}
            {selectedRange.label.toLowerCase()}
          </p>
        </div>

        {/* Range Buttons (3 Months default / 6 Months / 1 Year) */}
        <div className="flex items-center gap-1 bg-slate-950/80 border border-white/10 p-1 rounded-xl self-start sm:self-auto">
          {RANGES.map((range) => {
            const isActive = activeRange === range.id;
            return (
              <button
                key={range.id}
                type="button"
                onClick={() => {
                  setActiveRange(range.id);
                  setTooltip(null);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  isActive
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {range.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="h-36 flex items-center justify-center text-xs text-slate-500">
          Loading consistency data...
        </div>
      ) : (
        <div
          className={`flex flex-col ${
            isThreeMonths ? "lg:flex-row lg:items-start justify-between" : ""
          } gap-6`}
        >
          {/* Calendar SVG Container */}
          <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800 bg-slate-950/70 border border-white/5 rounded-xl p-4 sm:p-5 backdrop-blur-md flex-1">
            <div className="min-w-fit flex justify-start sm:justify-center py-1">
              <svg
                width={svgWidth}
                height={svgHeight}
                className="overflow-visible select-none"
                style={{ display: "block" }}
              >
                {/* Month Labels */}
                {monthLabels.map((m) => (
                  <text
                    key={`m-${m.colIdx}`}
                    x={LEFT_PAD + m.colIdx * pitch}
                    y={14}
                    fontSize={FONT_SIZE}
                    fill={THEME_COLORS.textMuted}
                    fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                    fontWeight="600"
                  >
                    {m.label}
                  </text>
                ))}

                {/* Day-of-Week Labels: Mon (row 1), Wed (row 3), Fri (row 5) */}
                <text
                  x={LEFT_PAD - 6}
                  y={TOP_PAD + 1 * pitch + CELL_SIZE * 0.75}
                  textAnchor="end"
                  fontSize={DAY_LABEL_FONT_SIZE}
                  fill={THEME_COLORS.textMuted}
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                  fontWeight="500"
                >
                  Mon
                </text>
                <text
                  x={LEFT_PAD - 6}
                  y={TOP_PAD + 3 * pitch + CELL_SIZE * 0.75}
                  textAnchor="end"
                  fontSize={DAY_LABEL_FONT_SIZE}
                  fill={THEME_COLORS.textMuted}
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                  fontWeight="500"
                >
                  Wed
                </text>
                <text
                  x={LEFT_PAD - 6}
                  y={TOP_PAD + 5 * pitch + CELL_SIZE * 0.75}
                  textAnchor="end"
                  fontSize={DAY_LABEL_FONT_SIZE}
                  fill={THEME_COLORS.textMuted}
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                  fontWeight="500"
                >
                  Fri
                </text>

                {/* 7-Row Grid of Contribution Cells */}
                {weeks.map((week, colIdx) => (
                  <g
                    key={`col-${colIdx}`}
                    transform={`translate(${LEFT_PAD + colIdx * pitch}, ${TOP_PAD})`}
                  >
                    {week.map((day) => {
                      if (day.isFuture) return null;

                      const y = day.dayIndex * pitch;
                      const fill = getCellFill(day.count);
                      const stroke = getCellStroke(day.count);

                      return (
                        <rect
                          key={day.date}
                          x={0}
                          y={y}
                          width={CELL_SIZE}
                          height={CELL_SIZE}
                          rx={CELL_RADIUS}
                          ry={CELL_RADIUS}
                          fill={fill}
                          stroke={stroke}
                          strokeWidth="1"
                          className="transition-all duration-150 hover:stroke-white hover:scale-105 cursor-pointer origin-center"
                          onMouseEnter={(e) => handleCellMouseEnter(day, e)}
                          onMouseLeave={handleCellMouseLeave}
                        >
                          <title>
                            {day.count === 0
                              ? `No habits completed on ${day.formattedDate}`
                              : `${day.count} habit${day.count === 1 ? "" : "s"} completed on ${day.formattedDate}`}
                          </title>
                        </rect>
                      );
                    })}
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Quick Consistency Stat Badges for Period (Balances and fills container in 3-Month mode) */}
          <div
            className={`grid grid-cols-2 ${
              isThreeMonths ? "lg:w-72 shrink-0" : "w-full sm:grid-cols-4"
            } gap-3`}
          >
            <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3.5 flex flex-col justify-between shadow-inner">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Check-Ins</span>
                <Zap size={15} className="text-amber-400" />
              </div>
              <div className="text-2xl font-black text-white mt-1.5 font-mono">
                {totalCheckIns}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5">logged in period</span>
            </div>

            <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3.5 flex flex-col justify-between shadow-inner">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Consistency</span>
                <Target size={15} className="text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 mt-1.5 font-mono">
                {consistencyRate}%
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5">
                {activeDaysCount} of {totalPastDays} days
              </span>
            </div>

            <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3.5 flex flex-col justify-between shadow-inner">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Best Streak</span>
                <Flame size={15} className="text-rose-400" />
              </div>
              <div className="text-2xl font-black text-white mt-1.5 font-mono">
                {bestStreakInPeriod}d
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5">longest run in range</span>
            </div>

            <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3.5 flex flex-col justify-between shadow-inner">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Daily Pace</span>
                <Trophy size={15} className="text-purple-400" />
              </div>
              <div className="text-2xl font-black text-purple-300 mt-1.5 font-mono">
                {dailyAverage}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5">habits / active day</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Tooltip */}
      {tooltip && (
        <div
          className="absolute z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full bg-slate-900/95 backdrop-blur-md text-white text-xs px-3 py-2 rounded-xl border border-emerald-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.5)] whitespace-nowrap"
          style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
        >
          <div className="flex items-center gap-1.5 font-bold text-emerald-400 font-mono">
            <span>
              {tooltip.count} {tooltip.count === 1 ? "check-in" : "check-ins"}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{tooltip.dateStr}</div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900/95" />
        </div>
      )}

      {/* Footer: Learn text on left, Less / More legend on right */}
      <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/10 text-xs text-slate-400">
        <span className="hover:text-emerald-400 transition-colors cursor-default">
          Habit consistency timeline
        </span>

        {/* Legend */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500 mr-0.5">Less</span>
          <span
            className="w-3 h-3 rounded-[3px] border inline-block"
            style={{
              backgroundColor: THEME_COLORS.level0,
              borderColor: THEME_COLORS.level0Stroke,
            }}
            title="0 completions"
          />
          <span
            className="w-3 h-3 rounded-[3px] border inline-block"
            style={{
              backgroundColor: THEME_COLORS.level1,
              borderColor: THEME_COLORS.level1Stroke,
            }}
            title="1 completion"
          />
          <span
            className="w-3 h-3 rounded-[3px] border inline-block"
            style={{
              backgroundColor: THEME_COLORS.level2,
              borderColor: THEME_COLORS.level2Stroke,
            }}
            title="2 completions"
          />
          <span
            className="w-3 h-3 rounded-[3px] border inline-block"
            style={{
              backgroundColor: THEME_COLORS.level3,
              borderColor: THEME_COLORS.level3Stroke,
            }}
            title="3 completions"
          />
          <span
            className="w-3 h-3 rounded-[3px] border inline-block"
            style={{
              backgroundColor: THEME_COLORS.level4,
              borderColor: THEME_COLORS.level4Stroke,
            }}
            title="4+ completions"
          />
          <span className="text-[11px] text-slate-500 ml-0.5">More</span>
        </div>
      </div>
    </div>
  );
}
