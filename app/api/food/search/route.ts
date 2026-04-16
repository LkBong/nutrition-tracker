import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchByText } from "@/lib/calorieninjas";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query || query.trim().length < 2) {
    return NextResponse.json({ error: "Query too short" }, { status: 400 });
  }

  const items = await searchByText(query.trim());

  if (!items.length) {
    return NextResponse.json([]);
  }

  const supabase = await createClient();

  // Cache and return
  const results = await Promise.all(
    items.map(async (item) => {
      const { data: existing } = await supabase
        .from("foods")
        .select("*")
        .ilike("name", item.name)
        .eq("source", "calorieninjas")
        .maybeSingle();

      if (existing) return { ...existing, serving_size_g: item.serving_size_g };

      const { data: inserted } = await supabase
        .from("foods")
        .insert({
          name: item.name,
          calories_kcal: item.per100g.calories_kcal,
          protein_g: item.per100g.protein_g,
          fat_g: item.per100g.fat_g,
          carbs_g: item.per100g.carbs_g,
          fiber_g: item.per100g.fiber_g,
          sugar_g: item.per100g.sugar_g,
          sodium_mg: item.per100g.sodium_mg,
          source: "calorieninjas",
        })
        .select()
        .single();

      return { ...inserted, serving_size_g: item.serving_size_g };
    })
  );

  return NextResponse.json(results.filter(Boolean));
}
