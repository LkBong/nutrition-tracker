import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
}

function Row({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums font-medium">
        {value != null ? `${Math.round(value)}${unit}` : "—"}
      </span>
    </div>
  );
}

export default function NutrientGrid({ fiber, sugar, sodium }: Props) {
  return (
    <Card>
      <CardHeader className="pb-0 pt-4">
        <CardTitle className="text-sm font-medium">Other Nutrients</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pb-4 pt-3">
        <Row label="Fiber" value={fiber} unit="g" />
        <Row label="Sugar" value={sugar} unit="g" />
        <Row label="Sodium" value={sodium} unit="mg" />
      </CardContent>
    </Card>
  );
}
