"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  data: { date: string; calories: number }[];
  goalCalories?: number;
}

export default function WeeklyTrendChart({ data, goalCalories }: Props) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date + "T12:00:00").toLocaleDateString("en-GB", {
      weekday: "short",
    }),
  }));

  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm font-medium">7-Day Calorie Trend</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [`${value} kcal`, "Calories"]}
              contentStyle={{ fontSize: 12 }}
            />
            {goalCalories && (
              <ReferenceLine
                y={goalCalories}
                stroke="#16a34a"
                strokeDasharray="4 2"
                label={{ value: "Goal", position: "right", fontSize: 10, fill: "#16a34a" }}
              />
            )}
            <Line
              type="monotone"
              dataKey="calories"
              stroke="#16a34a"
              strokeWidth={2}
              dot={{ r: 3, fill: "#16a34a" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
