import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawOffset = parseInt(req.nextUrl.searchParams.get("offset") || "0");
    const rawLimit = parseInt(req.nextUrl.searchParams.get("limit") || "20");
    // Cap values to prevent unbounded DB queries
    const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset);
    const limit = Math.min(100, Math.max(1, isNaN(rawLimit) ? 20 : rawLimit));

    const { data, error, count } = await supabase
      .from("generations")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[generations] Supabase error:", error.message);
      return NextResponse.json(
        { error: "Failed to fetch generations." },
        { status: 500 }
      );
    }

    return NextResponse.json({ generations: data, total: count });
  } catch (err) {
    console.error("[generations] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch generations." },
      { status: 500 }
    );
  }
}
