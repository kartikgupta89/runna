"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { FitnessTestRow } from "@/lib/db/dexie";

interface VdotTrendChartProps {
  tests: FitnessTestRow[];
}

export function VdotTrendChart({ tests }: VdotTrendChartProps) {
  if (tests.length === 0) return null;

  const data = tests
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((t, i) => ({
      label: `Test ${i + 1}`,
      VDOT: parseFloat(t.vdotResult.toFixed(1)),
      date: new Date(t.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    }));

  if (data.length < 2) {
    return (
      <div className="rounded-xl border bg-muted/30 px-4 py-6 text-center">
        <p className="text-2xl font-bold">{data[0].VDOT}</p>
        <p className="text-xs text-muted-foreground mt-1">Current VDOT</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Run another fitness test to see your trend
        </p>
      </div>
    );
  }

  const minVdot = Math.min(...data.map((d) => d.VDOT)) - 2;
  const maxVdot = Math.max(...data.map((d) => d.VDOT)) + 2;

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold mb-3">VDOT progression</h3>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            domain={[minVdot, maxVdot]}
            width={28}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid hsl(var(--border))",
            }}
            formatter={(value) => [`${value}`, "VDOT"]}
          />
          <Line
            type="monotone"
            dataKey="VDOT"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 4, fill: "hsl(var(--primary))" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
