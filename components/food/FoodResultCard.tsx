import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  calories_kcal: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
  serving_size_g?: number;
}

interface Props {
  food: FoodItem;
  onSelect: (food: FoodItem) => void;
}

export default function FoodResultCard({ food, onSelect }: Props) {
  return (
    <Card
      className="cursor-pointer transition-colors hover:border-green-400 active:bg-accent"
      onClick={() => onSelect(food)}
    >
      <CardContent className="flex items-center justify-between py-3 px-4">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium capitalize">{food.name}</p>
          {food.brand && (
            <p className="truncate text-xs text-muted-foreground">{food.brand}</p>
          )}
          <div className="mt-1 flex flex-wrap gap-1">
            {food.calories_kcal != null && (
              <Badge variant="secondary" className="text-xs">
                {Math.round(food.calories_kcal)} kcal/100g
              </Badge>
            )}
          </div>
        </div>
        <div className="ml-3 text-right text-xs text-muted-foreground">
          <div>P: {food.protein_g != null ? `${food.protein_g}g` : "—"}</div>
          <div>F: {food.fat_g != null ? `${food.fat_g}g` : "—"}</div>
          <div>C: {food.carbs_g != null ? `${food.carbs_g}g` : "—"}</div>
        </div>
      </CardContent>
    </Card>
  );
}
