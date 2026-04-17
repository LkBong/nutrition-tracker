import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 2) {
    return NextResponse.json([]);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: logs } = await supabase
    .from("food_logs")
    .select("food_id")
    .eq("user_id", user.id)
    .order("logged_at", { ascending: false })
    .limit(200);

  const foodIds = [...new Set((logs ?? []).map((l) => l.food_id))];
  if (!foodIds.length) return NextResponse.json([]);

  const { data, error } = await supabase
    .from("foods")
    .select("*")
    .in("id", foodIds)
    .ilike("name", `%${q.trim()}%`)
    .limit(8);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}
