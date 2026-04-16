import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = request.nextUrl.searchParams.get("date"); // YYYY-MM-DD

  let query = supabase
    .from("food_logs")
    .select(`
      id,
      meal_type,
      quantity_g,
      logged_at,
      foods (
        id, name, brand, calories_kcal, protein_g, fat_g, carbs_g,
        fiber_g, sugar_g, sodium_mg
      )
    `)
    .eq("user_id", user.id)
    .order("logged_at", { ascending: true });

  if (date) {
    query = query
      .gte("logged_at", `${date}T00:00:00.000Z`)
      .lt("logged_at", `${date}T23:59:59.999Z`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { food_id, meal_type, quantity_g, logged_at } = body;

  if (!food_id || !quantity_g) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("food_logs")
    .insert({
      user_id: user.id,
      food_id,
      meal_type: meal_type ?? "snack",
      quantity_g,
      logged_at: logged_at ?? new Date().toISOString(),
    })
    .select(`
      id, meal_type, quantity_g, logged_at,
      foods (id, name, brand, calories_kcal, protein_g, fat_g, carbs_g,
             fiber_g, sugar_g, sodium_mg)
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing log id" }, { status: 400 });

  const { error } = await supabase
    .from("food_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}
