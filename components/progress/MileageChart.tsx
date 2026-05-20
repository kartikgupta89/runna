"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { WeeklyMileage } from "@/lib/training/stats";

interface MileageChartProps {
  data: WeeklyMileage[];
  units: "metric" | "imperial";
}

export function MileageChart({ data, units }: MileageChartProps) {
  const converted = data.map((d) => ({
    week: `W${d.weekNumber}`,
    Planned:
      units === "imperial"
        ? parseFloat((d.plannedKm * 0.621371).toFixed(1))
        : parseFloat(d.plannedKm.toFixed(1)),
    Actual:
      units === "imperial"
        ? parseFloat((d.actualKm * 0.621371).toFixed(1))
        : parseFloat(d.actualKm.toFixed(1)),
  }));

  const unitLabel = units === "imperial" ? "mi" : "km";

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold mb-3">Weekly mileage ({unitLabel})</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={converted} barSize={8} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval={Math.floor(converted.length / 8)}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid hsl(var(--border))",
            }}
            formatter={(value) => [`${value} ${unitLabel}`]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            iconType="circle"
            iconSize={8}
          />
          <Bar dataKey="Planned" fill="hsl(var(--muted-foreground))" opacity={0.4} radius={[2, 2, 0, 0]} />
          <Bar dataKey="Actual" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
