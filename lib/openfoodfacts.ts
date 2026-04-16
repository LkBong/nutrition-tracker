import type { NutrientsPer100g } from "./nutrients";

export interface OpenFoodFactsProduct {
  product_name: string;
  brands?: string;
  image_url?: string;
  nutriments: {
    "energy-kcal_100g"?: number;
    proteins_100g?: number;
    fat_100g?: number;
    carbohydrates_100g?: number;
    fiber_100g?: number;
    sugars_100g?: number;
    sodium_100g?: number;
  };
}

export interface BarcodeResult {
  name: string;
  brand?: string;
  imageUrl?: string;
  per100g: NutrientsPer100g;
}

export async function lookupBarcode(barcode: string): Promise<BarcodeResult | null> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,brands,image_url,nutriments`,
    { next: { revalidate: 86400 } } // cache for 24h
  );

  if (!res.ok) return null;
  const data: { status: number; product?: OpenFoodFactsProduct } = await res.json();
  if (data.status !== 1 || !data.product) return null;

  const { product } = data;
  const n = product.nutriments;

  return {
    name: product.product_name || "Unknown product",
    brand: product.brands,
    imageUrl: product.image_url,
    per100g: {
      calories_kcal: n["energy-kcal_100g"] ?? null,
      protein_g: n.proteins_100g ?? null,
      fat_g: n.fat_100g ?? null,
      carbs_g: n.carbohydrates_100g ?? null,
      fiber_g: n.fiber_100g ?? null,
      sugar_g: n.sugars_100g ?? null,
      sodium_mg: n.sodium_100g != null ? n.sodium_100g * 1000 : null,
    },
  };
}
