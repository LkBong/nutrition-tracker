import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lookupBarcode } from "@/lib/openfoodfacts";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing barcode" }, { status: 400 });
  }

  const supabase = await createClient();

  // Check cache first
  const { data: cached } = await supabase
    .from("foods")
    .select("*")
    .eq("barcode", code)
    .single();

  if (cached) return NextResponse.json(cached);

  // Fetch from Open Food Facts
  const product = await lookupBarcode(code);
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Cache in database
  const { data: inserted, error } = await supabase
    .from("foods")
    .insert({
      name: product.name,
      brand: product.brand,
      barcode: code,
      calories_kcal: product.per100g.calories_kcal,
      protein_g: product.per100g.protein_g,
      fat_g: product.per100g.fat_g,
      carbs_g: product.per100g.carbs_g,
      fiber_g: product.per100g.fiber_g,
      sugar_g: product.per100g.sugar_g,
      sodium_mg: product.per100g.sodium_mg,
      source: "openfoodfacts",
      external_id: code,
    })
    .select()
    .single();

  if (error) {
    // Return the product data even if caching fails
    return NextResponse.json({ ...product.per100g, name: product.name, brand: product.brand });
  }

  return NextResponse.json(inserted);
}
