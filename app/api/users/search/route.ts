import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/configured";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!supabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q) {
    return NextResponse.json({ users: [] });
  }

  // The users I've already added — excluded from results.
  const { data: myContacts } = await supabase
    .from("contacts")
    .select("contact_id")
    .eq("user_id", user.id);

  const excludedIds = new Set<string>([user.id, ...(myContacts ?? []).map((c) => c.contact_id)]);

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, online, last_seen")
    .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users = (data ?? []).filter((p) => !excludedIds.has(p.id));

  return NextResponse.json({ users });
}
