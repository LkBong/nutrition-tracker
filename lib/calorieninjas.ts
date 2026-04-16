import type { NutrientsPer100g } from "./nutrients";

export interface CalorieNinjasItem {
  name: string;
  serving_size_g: number;
  calories: number;
  protein_g: number;
  fat_total_g: number;
  carbohydrates_total_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
}

export interface NormalizedFoodItem {
  name: string;
  serving_size_g: number;
  per100g: NutrientsPer100g;
}

const BASE_URL = "https://api.calorieninjas.com/v1";

function getHeaders() {
  return { "X-Api-Key": process.env.CALORIENINJAS_API_KEY! };
}

/** Convert CalorieNinjas item (per serving) to per-100g values */
function normalizeItem(item: CalorieNinjasItem): NormalizedFoodItem {
  const s = item.serving_size_g || 100;
  const scale = 100 / s;
  return {
    name: item.name,
    serving_size_g: s,
    per100g: {
      calories_kcal: round(item.calories * scale),
      protein_g: round(item.protein_g * scale),
      fat_g: round(item.fat_total_g * scale),
      carbs_g: round(item.carbohydrates_total_g * scale),
      fiber_g: round(item.fiber_g * scale),
      sugar_g: round(item.sugar_g * scale),
      sodium_mg: round(item.sodium_mg * scale),
    },
  };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Text-based nutrition lookup — accepts natural language (e.g. "2 eggs and a banana") */
export async function searchByText(query: string): Promise<NormalizedFoodItem[]> {
  const res = await fetch(
    `${BASE_URL}/nutrition?query=${encodeURIComponent(query)}`,
    { headers: getHeaders() }
  );
  if (!res.ok) throw new Error(`CalorieNinjas text search failed: ${res.status}`);
  const data: { items: CalorieNinjasItem[] } = await res.json();
  return data.items.map(normalizeItem);
}

/** Image-based nutrition lookup */
export async function searchByImage(imageFile: File): Promise<NormalizedFoodItem[]> {
  const formData = new FormData();
  formData.append("file", imageFile);

  const res = await fetch(`${BASE_URL}/imagetextnutrition`, {
    method: "POST",
    headers: getHeaders(),
    body: formData,
  });
  if (!res.ok) throw new Error(`CalorieNinjas image recognition failed: ${res.status}`);
  const data: { items: CalorieNinjasItem[] } = await res.json();
  return data.items.map(normalizeItem);
}
