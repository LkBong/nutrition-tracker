"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NutritionGoals } from "@/lib/tdee";

interface Props {
  protein: number;
  fat: number;
  carbs: number;
  goals: NutritionGoals;
}

const COLORS = {
  Protein: "#16a34a",
  Fat: "#f59e0b",
  Carbs: "#3b82f6",
};

export default function MacroDonut({ protein, fat, carbs, goals }: Props) {
  const data = [
    { name: "Protein", value: Math.round(protein), goal: goals.protein_g },
    { name: "Fat", value: Math.round(fat), goal: goals.fat_g },
    { name: "Carbs", value: Math.round(carbs), goal: goals.carbs_g },
  ];

  const total = protein + fat + carbs;

  return (
    <Card>
      <CardHeader className="pb-0 pt-4">
        <CardTitle className="text-sm font-medium">Macros</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        {total > 0 ? (
          <ResponsiveContainer width="100%" height={110}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={2}
                startAngle={90}
                endAngle={-270}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS]} />
                ))}
              </Pie>
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [`${Math.round(value)}g`, name]}
                contentStyle={{ fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[110px] items-center justify-center text-xs text-muted-foreground">
            No data yet
          </div>
        )}
        <div className="mt-1 space-y-0.5">
          {data.map((d) => (
            <div key={d.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: COLORS[d.name as keyof typeof COLORS] }}
                />
                {d.name}
              </div>
              <span className="tabular-nums text-muted-foreground">
                {d.value}g / {d.goal}g
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
