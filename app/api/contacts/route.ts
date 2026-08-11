import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/configured";

export const dynamic = "force-dynamic";

export async function GET() {
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

  const { data, error } = await supabase
    .from("contact_previews")
    .select("*")
    .eq("user_id", user.id)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ contacts: data ?? [] });
}

export async function POST(request: Request) {
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

  const body = await request.json();
  const contactId = body?.contact_id as string | undefined;

  if (!contactId) {
    return NextResponse.json({ error: "contact_id is required" }, { status: 400 });
  }

  if (contactId === user.id) {
    return NextResponse.json({ error: "You can't add yourself" }, { status: 400 });
  }

  // Make sure the target profile actually exists.
  const { data: target, error: targetError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", contactId)
    .maybeSingle();

  if (targetError) {
    return NextResponse.json({ error: targetError.message }, { status: 500 });
  }
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { error } = await supabase.from("contacts").insert({
    user_id: user.id,
    contact_id: contactId,
  });

  if (error) {
    // 23505 = unique_violation on (user_id, contact_id) → already a contact
    if (error.code === "23505") {
      return NextResponse.json({ error: "Already a contact" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
