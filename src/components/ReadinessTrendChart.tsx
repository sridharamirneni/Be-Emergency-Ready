import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChevronDown, ShieldCheck, Sparkles, Target, TrendingUp } from 'lucide-react';
import { PreparednessTier, ReadinessTrendPoint } from '../types';
import {
  calculateReadinessTrendStats,
  generate30DayReadinessTrend,
} from '../utils/calculations';

interface ReadinessTrendChartProps {
  overallScore: number;
  waterScore: number;
  foodScore: number;
  tier: PreparednessTier;
  existingHistory?: ReadinessTrendPoint[];
}

type DayRangeOption = 30 | 14 | 7;

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
    payload?: ReadinessTrendPoint & { isToday?: boolean };
  }>;
  label?: string;
}

const CustomRechartsTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;

  const dataPoint = payload[0]?.payload;
  if (!dataPoint) return null;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/95 backdrop-blur-md p-3 shadow-xl text-xs space-y-1.5 min-w-[210px] z-50">
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
        <span className="font-bold text-white tabular-nums">
          {dataPoint.label} ({dataPoint.date})
        </span>
        {dataPoint.isToday && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Today • Live
          </span>
        )}
      </div>

      <div className="space-y-1 pt-0.5">
        <div className="flex items-center justify-between gap-2 font-semibold text-emerald-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Overall Readiness:
          </span>
          <span className="tabular-nums font-bold text-sm">{dataPoint.score}%</span>
        </div>

        <div className="flex items-center justify-between gap-2 text-sky-400 font-medium">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            Water Supply:
          </span>
          <span className="tabular-nums">{dataPoint.waterScore}%</span>
        </div>

        <div className="flex items-center justify-between gap-2 text-amber-400 font-medium">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Pantry Food:
          </span>
          <span className="tabular-nums">{dataPoint.foodScore}%</span>
        </div>
      </div>

      {dataPoint.milestoneNote && (
        <div className="pt-1.5 mt-1 border-t border-slate-800/80 text-[11px] text-slate-400 leading-snug">
          <span className="text-emerald-400 font-medium">Milestone: </span>
          {dataPoint.milestoneNote}
        </div>
      )}
    </div>
  );
};

export const ReadinessTrendChart: React.FC<ReadinessTrendChartProps> = ({
  overallScore,
  waterScore,
  foodScore,
  tier,
  existingHistory,
}) => {
  const [rangeDays, setRangeDays] = useState<DayRangeOption>(30);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const all30Points = useMemo(
    () =>
      generate30DayReadinessTrend(
        overallScore,
        waterScore,
        foodScore,
        existingHistory
      ),
    [overallScore, waterScore, foodScore, existingHistory]
  );

  const visiblePoints = useMemo(() => {
    const sliced = all30Points.slice(all30Points.length - rangeDays);
    const lastIdx = sliced.length - 1;
    return sliced.map((pt, idx) => ({
      ...pt,
      isToday: idx === lastIdx,
    }));
  }, [all30Points, rangeDays]);

  const stats = useMemo(
    () => calculateReadinessTrendStats(visiblePoints),
    [visiblePoints]
  );

  const strokeColor =
    overallScore >= 80 ? '#10b981' : overallScore >= 50 ? '#f59e0b' : '#f43f5e';

  return (
    <section
      aria-label="Readiness Trend Historical Chart"
      data-testid="readiness-trend-chart"
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/95 p-3.5 sm:p-4 shadow-xs space-y-3 min-w-0"
    >
      {/* Top Header & Summary Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Readiness Trend
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 tabular-nums">
                {stats.delta30d >= 0 ? `+${stats.delta30d}%` : `${stats.delta30d}%`} ({rangeDays}d)
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 tabular-nums">
                <Target className="w-3 h-3 text-emerald-500" />
                {stats.pointsTo100 === 0
                  ? '100% Full Preparedness Reached'
                  : `${stats.pointsTo100}% to 100% Full Preparedness`}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Historical preparedness progression over the last {rangeDays} days (
              {tier === 'tier2_10d' ? '10-Day Home Pantry Standard' : '72-Hour Baseline Standard'})
            </p>
          </div>
        </div>

        {/* Right Controls: Range Window Selector (7D / 14D / 30D) + Collapse Toggle */}
        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          <div
            role="group"
            aria-label="Readiness trend day range"
            className="inline-flex items-center rounded-lg p-0.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
          >
            {([7, 14, 30] as DayRangeOption[]).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setRangeDays(days)}
                aria-pressed={rangeDays === days}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold tabular-nums transition-colors cursor-pointer ${
                  rangeDays === days
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {days}D
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? 'Expand Readiness Trend Chart' : 'Collapse Readiness Trend Chart'}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:border-emerald-500/40 transition-colors cursor-pointer"
            title={isCollapsed ? 'Show Recharts Readiness Trend Chart' : 'Hide Chart'}
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
            />
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Recharts Area + Line Chart */}
          <div className="w-full h-[180px] sm:h-[210px] select-none pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={visiblePoints}
                margin={{ top: 12, right: 12, left: -18, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="readinessRechartsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35} />
                    <stop offset="85%" stopColor={strokeColor} stopOpacity={0.04} />
                    <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  strokeOpacity={0.35}
                  vertical={false}
                />

                <XAxis
                  dataKey="label"
                  stroke="#64748b"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={{ stroke: '#334155', strokeOpacity: 0.6 }}
                  interval={rangeDays === 30 ? 5 : rangeDays === 14 ? 2 : 1}
                />

                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 80, 100]}
                  stroke="#64748b"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  unit="%"
                />

                {/* 80% Readiness Target Threshold Line */}
                <ReferenceLine
                  y={80}
                  stroke="#10b981"
                  strokeDasharray="5 4"
                  strokeWidth={1.5}
                  label={{
                    value: '80% Ready Target',
                    position: 'insideTopLeft',
                    fill: '#10b981',
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />

                <Tooltip content={<CustomRechartsTooltip />} />

                {/* Secondary Water Supply Reference Line */}
                <Line
                  type="monotone"
                  dataKey="waterScore"
                  name="Water Readiness"
                  stroke="#38bdf8"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={false}
                  strokeOpacity={0.65}
                />

                {/* Primary Overall Readiness Area Curve */}
                <Area
                  type="monotone"
                  dataKey="score"
                  name="Overall Readiness"
                  stroke={strokeColor}
                  strokeWidth={2.5}
                  fill="url(#readinessRechartsGrad)"
                  activeDot={{
                    r: 6,
                    stroke: strokeColor,
                    strokeWidth: 2,
                    fill: '#0f172a',
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom Summary Footer Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/70 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>
                  Start ({visiblePoints[0]?.label}):{' '}
                  <strong className="text-slate-800 dark:text-slate-200 tabular-nums">
                    {stats.startScore}%
                  </strong>
                </span>
              </span>
              <span>•</span>
              <span>
                {rangeDays}d High:{' '}
                <strong className="text-slate-800 dark:text-slate-200 tabular-nums">
                  {stats.highScore}%
                </strong>
              </span>
              <span>•</span>
              <span>
                Days ≥80% Ready:{' '}
                <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {stats.daysAtOrAbove80}d
                </strong>
              </span>
            </div>

            <div className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <Sparkles className="w-3 h-3 text-emerald-500 shrink-0" />
              <span>Hover or tap any data point to inspect daily milestones</span>
            </div>
          </div>
        </>
      )}
    </section>
  );
};
