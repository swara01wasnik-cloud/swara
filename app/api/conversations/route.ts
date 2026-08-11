import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/configured";

export const dynamic = "force-dynamic";

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

  const { data: conversationId, error } = await supabase.rpc(
    "get_or_create_conversation",
    { other_user_id: contactId }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversation_id: conversationId });
}
