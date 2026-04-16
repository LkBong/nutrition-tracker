"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Props {
  actual: number;
  goal: number;
}

export default function CalorieProgressBar({ actual, goal }: Props) {
  const pct = Math.min(Math.round((actual / goal) * 100), 100);
  const remaining = Math.max(goal - actual, 0);
  const over = actual > goal ? actual - goal : 0;

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold tabular-nums">{Math.round(actual)}</p>
            <p className="text-sm text-muted-foreground">kcal consumed</p>
          </div>
          <div className="text-right">
            {over > 0 ? (
              <>
                <p className="text-lg font-semibold text-red-500 tabular-nums">+{Math.round(over)}</p>
                <p className="text-sm text-muted-foreground">over goal</p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold tabular-nums">{Math.round(remaining)}</p>
                <p className="text-sm text-muted-foreground">remaining</p>
              </>
            )}
          </div>
        </div>
        <Progress
          value={pct}
          className={over > 0 ? "[&>div]:bg-red-500" : "[&>div]:bg-green-600"}
        />
        <p className="mt-1.5 text-right text-xs text-muted-foreground">
          Goal: {goal} kcal
        </p>
      </CardContent>
    </Card>
  );
}
