"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { MOTION_MS } from "@/lib/constants/motion";
import type { ChartSeries } from "@/lib/normalizers/charts";

const GRID_STROKE = "rgba(148, 163, 184, 0.22)";
const AXIS_STROKE = "var(--text-secondary)";
const TOOLTIP_STYLE = {
  backgroundColor: "var(--bg-surface)",
  border: "1px solid var(--card-border)",
  borderRadius: "10px",
  color: "var(--text-primary)",
};

const PILLAR_COLOR_MAP: Record<string, string> = {
  visibility: "var(--score-visibility, #2563eb)",
  content: "var(--score-content, #0ea5e9)",
  technical: "var(--score-technical, #2dd4bf)",
  visual: "var(--score-visual, #8b5cf6)",
};

const SENTIMENT_COLOR_MAP: Record<string, string> = {
  positive: "var(--score-positive, #22c55e)",
  neutral: "var(--score-neutral, #94a3b8)",
  negative: "var(--score-negative, #ef4444)",
};

const PRIORITY_COLOR_MAP: Record<string, string> = {
  high: "var(--score-negative, #ef4444)",
  medium: "var(--warning-500, #f59e0b)",
  low: "var(--score-technical, #2dd4bf)",
};

function toSeriesData(series: ChartSeries) {
  return series.labels.map((label, index) => ({
    label,
    value: series.values[index] ?? 0,
  }));
}

function normalizeLabel(value: string) {
  return value.trim().toLowerCase();
}

function colorFromMap(value: string, map: Record<string, string>, fallback: string) {
  return map[normalizeLabel(value)] ?? fallback;
}

export function PillarBarChart({ series }: { series: ChartSeries }) {
  const data = toSeriesData(series);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis dataKey="label" stroke={AXIS_STROKE} />
        <YAxis stroke={AXIS_STROKE} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar
          dataKey="value"
          radius={6}
          barSize={18}
          isAnimationActive
          animationDuration={MOTION_MS.slow}
        >
          {data.map((entry) => (
            <Cell
              key={entry.label}
              fill={colorFromMap(
                entry.label,
                PILLAR_COLOR_MAP,
                "var(--score-visibility, #2563eb)"
              )}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SentimentDonutChart({ series }: { series: ChartSeries }) {
  const data = toSeriesData(series);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius={70}
          outerRadius={105}
          isAnimationActive
          animationDuration={MOTION_MS.slow}
        >
          {data.map((entry) => (
            <Cell
              key={entry.label}
              fill={colorFromMap(
                entry.label,
                SENTIMENT_COLOR_MAP,
                "var(--score-neutral, #94a3b8)"
              )}
            />
          ))}
        </Pie>
        <Legend formatter={(value) => <span style={{ color: "var(--text-primary)" }}>{value}</span>} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function PriorityStackChart({ series }: { series: ChartSeries }) {
  const data = toSeriesData(series);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis dataKey="label" stroke={AXIS_STROKE} />
        <YAxis stroke={AXIS_STROKE} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar
          dataKey="value"
          stackId="a"
          radius={6}
          barSize={18}
          isAnimationActive
          animationDuration={MOTION_MS.slow}
        >
          {data.map((entry) => (
            <Cell
              key={entry.label}
              fill={colorFromMap(
                entry.label,
                PRIORITY_COLOR_MAP,
                "var(--score-technical, #2dd4bf)"
              )}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendLineChart({
  points,
}: {
  points: Array<{ recorded_at: string; value: number }>;
}) {
  const data = points.map((point) => ({
    label: point.recorded_at.slice(5, 16),
    value: point.value,
  }));
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis dataKey="label" stroke={AXIS_STROKE} />
        <YAxis stroke={AXIS_STROKE} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--score-visibility, #2563eb)"
          strokeWidth={2}
          dot={{ r: 2.5, fill: "var(--score-visibility, #2563eb)" }}
          isAnimationActive
          animationDuration={MOTION_MS.slow}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CombinedTrendLineChart({
  points,
}: {
  points: Array<{
    recorded_at: string;
    share_of_voice: number;
    visibility_score: number;
  }>;
}) {
  const data = points.map((point) => ({
    label: point.recorded_at.slice(5, 16),
    share_of_voice: point.share_of_voice,
    visibility_score: point.visibility_score,
  }));

  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis dataKey="label" stroke={AXIS_STROKE} />
        <YAxis stroke={AXIS_STROKE} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend formatter={(value) => <span style={{ color: "var(--text-primary)" }}>{value}</span>} />
        <Line
          type="monotone"
          dataKey="visibility_score"
          name="Visibility Score"
          stroke="var(--score-visibility, #2563eb)"
          strokeWidth={2}
          dot={{ r: 2.3, fill: "var(--score-visibility, #2563eb)" }}
          isAnimationActive
          animationDuration={MOTION_MS.slow}
        />
        <Line
          type="monotone"
          dataKey="share_of_voice"
          name="Share of Voice"
          stroke="var(--score-content, #0ea5e9)"
          strokeDasharray="6 4"
          strokeWidth={2}
          dot={{ r: 2.8, stroke: "var(--score-content, #0ea5e9)", fill: "var(--bg-surface)" }}
          isAnimationActive
          animationDuration={MOTION_MS.slow}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
