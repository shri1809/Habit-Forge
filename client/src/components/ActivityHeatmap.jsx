import { useEffect, useState, useMemo, useRef } from "react";
import { format, startOfWeek, subWeeks, addDays } from "date-fns";
import API from "../api/axios";

// GitHub Dark Palette
const GITHUB_COLORS = {
  bg: "#0d1117",
  border: "#30363d",
  textMuted: "#7d8590",
  textPrimary: "#e6edf3",
  level0: "#161b22", // No activity
  level0Stroke: "#21262d",
  level1: "#0e4429", // 1 check-in
  level1Stroke: "#006d32",
  level2: "#006d32", // 2 check-ins
  level2Stroke: "#26a641",
  level3: "#26a641", // 3 check-ins
  level3Stroke: "#39d353",
  level4: "#39d353", // 4+ check-ins
  level4Stroke: "#39d353",
};

const RANGES = [
  { id: "3m", label: "3 Months", weeks: 14 },
  { id: "6m", label: "6 Months", weeks: 26 },
  { id: "1y", label: "1 Year", weeks: 52 },
];

const CELL_SIZE = 12; // 12px x 12px square
const CELL_GAP = 3;   // 3px pitch
const CELL_RADIUS = 2; // 2px corner radius
const PITCH = CELL_SIZE + CELL_GAP; // 15px
const LEFT_PAD = 32;  // Left margin for Mon/Wed/Fri labels
const TOP_PAD = 20;   // Top margin for Month labels

export default function ActivityHeatmap() {
  const [historyMap, setHistoryMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeRange, setActiveRange] = useState("3m"); // Default to 3 months
  const [tooltip, setTooltip] = useState(null); // { x, y, text }
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
  const numWeeks = selectedRange.weeks;

  /**
   * Build the week columns array starting from Sunday numWeeks ago through today.
   * Matches GitHub contribution graph layout: Sunday is row 0, Saturday is row 6.
   */
  const { weeks, monthLabels, totalCheckIns, activeDaysCount } = useMemo(() => {
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

    for (let w = 0; w < numWeeks; w++) {
      const days = [];
      for (let r = 0; r < 7; r++) {
        const dateStr = format(curDate, "yyyy-MM-dd");
        const isFuture = curDate > today;
        const count = isFuture ? 0 : historyMap[dateStr] || 0;

        if (!isFuture && count > 0) {
          totalInPeriod += count;
          activeDays += 1;
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

    // Compute month label positions (place label above the first column where a new month starts)
    const labels = [];
    let lastMonth = "";
    weekCols.forEach((week, colIdx) => {
      // Find first non-future day in this week
      const validDay = week.find((d) => !d.isFuture);
      if (!validDay) return;
      if (validDay.monthName !== lastMonth) {
        // Prevent collision if within 2 columns of previous label
        const lastCol = labels.length ? labels[labels.length - 1].colIdx : -99;
        if (colIdx - lastCol >= 2) {
          labels.push({ colIdx, label: validDay.monthName });
          lastMonth = validDay.monthName;
        }
      }
    });

    return {
      weeks: weekCols,
      monthLabels: labels,
      totalCheckIns: totalInPeriod,
      activeDaysCount: activeDays,
    };
  }, [historyMap, numWeeks]);

  const getCellFill = (count) => {
    if (count <= 0) return GITHUB_COLORS.level0;
    if (count === 1) return GITHUB_COLORS.level1;
    if (count === 2) return GITHUB_COLORS.level2;
    if (count === 3) return GITHUB_COLORS.level3;
    return GITHUB_COLORS.level4;
  };

  const getCellStroke = (count) => {
    if (count <= 0) return GITHUB_COLORS.level0Stroke;
    if (count === 1) return GITHUB_COLORS.level1Stroke;
    if (count === 2) return GITHUB_COLORS.level2Stroke;
    if (count === 3) return GITHUB_COLORS.level3Stroke;
    return GITHUB_COLORS.level4Stroke;
  };

  const svgWidth = LEFT_PAD + numWeeks * PITCH + 10;
  const svgHeight = TOP_PAD + 7 * PITCH + 4;

  const handleCellMouseEnter = (day, e) => {
    if (day.isFuture) return;
    const rect = e.target.getBoundingClientRect();
    const containerRect = containerRef.current
      ? containerRef.current.getBoundingClientRect()
      : { left: 0, top: 0 };

    const text =
      day.count === 0
        ? `No habits completed on ${day.formattedDate}`
        : `${day.count} habit${day.count === 1 ? "" : "s"} completed on ${day.formattedDate}`;

    setTooltip({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 8,
      text,
    });
  };

  const handleCellMouseLeave = () => {
    setTooltip(null);
  };

  return (
    <div
      ref={containerRef}
      className="bg-[#0d1117] border border-[#30363d] p-5 sm:p-6 rounded-2xl shadow-xl relative text-[#e6edf3]"
    >
      {/* Header with Title, Stats & Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#21262d]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-[#e6edf3] tracking-tight">
              Habit Consistency Calendar
            </h3>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              GitHub Style
            </span>
          </div>
          <p className="text-xs text-[#7d8590] mt-0.5">
            <span className="font-semibold text-emerald-400 font-mono">
              {totalCheckIns}
            </span>{" "}
            habit check-in{totalCheckIns === 1 ? "" : "s"} across{" "}
            <span className="font-semibold text-slate-200">{activeDaysCount}</span> active day
            {activeDaysCount === 1 ? "" : "s"} in the last{" "}
            {selectedRange.label.toLowerCase()}
          </p>
        </div>

        {/* Range Buttons (3 Months default / 6 Months / 1 Year) */}
        <div className="flex items-center gap-1 bg-[#161b22] border border-[#30363d] p-1 rounded-lg self-start sm:self-auto">
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
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  isActive
                    ? "bg-[#21262d] text-white shadow-sm font-semibold border border-[#30363d]"
                    : "text-[#7d8590] hover:text-[#e6edf3] hover:bg-white/[0.04]"
                }`}
              >
                {range.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="h-32 flex items-center justify-center text-xs text-[#7d8590]">
          Loading consistency data...
        </div>
      ) : (
        <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="min-w-fit flex justify-start sm:justify-center py-1">
            <svg
              width={svgWidth}
              height={svgHeight}
              className="overflow-visible select-none"
              style={{ display: "block" }}
            >
              {/* Month Labels (rendered above their start column) */}
              {monthLabels.map((m) => (
                <text
                  key={`m-${m.colIdx}`}
                  x={LEFT_PAD + m.colIdx * PITCH}
                  y={12}
                  fontSize="10"
                  fill={GITHUB_COLORS.textMuted}
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
                  fontWeight="500"
                >
                  {m.label}
                </text>
              ))}

              {/* Day-of-Week Labels on the Left: Mon (row 1), Wed (row 3), Fri (row 5) */}
              <text
                x={26}
                y={TOP_PAD + 1 * PITCH + 9}
                textAnchor="end"
                fontSize="9"
                fill={GITHUB_COLORS.textMuted}
                fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
              >
                Mon
              </text>
              <text
                x={26}
                y={TOP_PAD + 3 * PITCH + 9}
                textAnchor="end"
                fontSize="9"
                fill={GITHUB_COLORS.textMuted}
                fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
              >
                Wed
              </text>
              <text
                x={26}
                y={TOP_PAD + 5 * PITCH + 9}
                textAnchor="end"
                fontSize="9"
                fill={GITHUB_COLORS.textMuted}
                fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
              >
                Fri
              </text>

              {/* 7-Row Grid of Square Contribution Cells */}
              {weeks.map((week, colIdx) => (
                <g
                  key={`col-${colIdx}`}
                  transform={`translate(${LEFT_PAD + colIdx * PITCH}, ${TOP_PAD})`}
                >
                  {week.map((day) => {
                    // Do not render future days in the current week
                    if (day.isFuture) return null;

                    const y = day.dayIndex * PITCH;
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
                        className="transition-colors duration-100 hover:stroke-white cursor-pointer"
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
      )}

      {/* Floating Tooltip */}
      {tooltip && (
        <div
          className="absolute z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full bg-[#1f242c] text-white text-[11px] px-2.5 py-1.5 rounded-md border border-[#30363d] shadow-2xl whitespace-nowrap"
          style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
        >
          {tooltip.text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[#1f242c]" />
        </div>
      )}

      {/* Footer: Learn text on left, Less / More legend on right */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#21262d] text-[11px] text-[#7d8590]">
        <span className="hover:text-emerald-400 transition-colors cursor-default">
          Learn how we count habit streaks
        </span>

        {/* Legend */}
        <div className="flex items-center gap-1.5">
          <span>Less</span>
          <span
            className="w-[10px] h-[10px] rounded-[2px] border inline-block"
            style={{
              backgroundColor: GITHUB_COLORS.level0,
              borderColor: GITHUB_COLORS.level0Stroke,
            }}
            title="0 completions"
          />
          <span
            className="w-[10px] h-[10px] rounded-[2px] border inline-block"
            style={{
              backgroundColor: GITHUB_COLORS.level1,
              borderColor: GITHUB_COLORS.level1Stroke,
            }}
            title="1 completion"
          />
          <span
            className="w-[10px] h-[10px] rounded-[2px] border inline-block"
            style={{
              backgroundColor: GITHUB_COLORS.level2,
              borderColor: GITHUB_COLORS.level2Stroke,
            }}
            title="2 completions"
          />
          <span
            className="w-[10px] h-[10px] rounded-[2px] border inline-block"
            style={{
              backgroundColor: GITHUB_COLORS.level3,
              borderColor: GITHUB_COLORS.level3Stroke,
            }}
            title="3 completions"
          />
          <span
            className="w-[10px] h-[10px] rounded-[2px] border inline-block"
            style={{
              backgroundColor: GITHUB_COLORS.level4,
              borderColor: GITHUB_COLORS.level4Stroke,
            }}
            title="4+ completions"
          />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
