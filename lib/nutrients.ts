export interface NutrientsPer100g {
  calories_kcal: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
}

export interface NutrientsTotal extends NutrientsPer100g {
  quantity_g: number;
}

/** Scale per-100g values to an actual portion size */
export function scaleNutrients(
  per100g: NutrientsPer100g,
  quantity_g: number
): NutrientsTotal {
  const scale = quantity_g / 100;
  return {
    quantity_g,
    calories_kcal: per100g.calories_kcal != null ? round(per100g.calories_kcal * scale) : null,
    protein_g: per100g.protein_g != null ? round(per100g.protein_g * scale) : null,
    fat_g: per100g.fat_g != null ? round(per100g.fat_g * scale) : null,
    carbs_g: per100g.carbs_g != null ? round(per100g.carbs_g * scale) : null,
    fiber_g: per100g.fiber_g != null ? round(per100g.fiber_g * scale) : null,
    sugar_g: per100g.sugar_g != null ? round(per100g.sugar_g * scale) : null,
    sodium_mg: per100g.sodium_mg != null ? round(per100g.sodium_mg * scale) : null,
  };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

export function sumNutrients(items: NutrientsTotal[]): NutrientsTotal {
  return items.reduce(
    (acc, item) => ({
      quantity_g: acc.quantity_g + item.quantity_g,
      calories_kcal: add(acc.calories_kcal, item.calories_kcal),
      protein_g: add(acc.protein_g, item.protein_g),
      fat_g: add(acc.fat_g, item.fat_g),
      carbs_g: add(acc.carbs_g, item.carbs_g),
      fiber_g: add(acc.fiber_g, item.fiber_g),
      sugar_g: add(acc.sugar_g, item.sugar_g),
      sodium_mg: add(acc.sodium_mg, item.sodium_mg),
    }),
    {
      quantity_g: 0,
      calories_kcal: 0,
      protein_g: 0,
      fat_g: 0,
      carbs_g: 0,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 0,
    }
  );
}

function add(a: number | null, b: number | null): number | null {
  if (a == null && b == null) return null;
  return (a ?? 0) + (b ?? 0);
}
