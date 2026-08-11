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
  const conversationId = searchParams.get("conversation_id");

  if (!conversationId) {
    return NextResponse.json({ error: "conversation_id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, content, type, media_path, media_mime, duration_seconds, read_at, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Media messages store a private storage path, not a URL — mint short-lived
  // signed URLs here so the client never needs direct bucket access.
  const rows = data ?? [];
  const mediaPaths = rows.filter((m) => m.media_path).map((m) => m.media_path as string);
  let signedByPath = new Map<string, string | null>();
  if (mediaPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("chat-media")
      .createSignedUrls(mediaPaths, 60 * 60);
    signedByPath = new Map(
      (signed ?? [])
        .filter((s) => s.signedUrl && !s.error)
        .map((s) => [s.path as string, s.signedUrl])
    );
  }

  const messages = rows.map((m) => ({
    ...m,
    media_url: m.media_path ? signedByPath.get(m.media_path) ?? null : null,
  }));

  return NextResponse.json({ messages });
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
  const conversationId = body?.conversation_id as string | undefined;
  const content = body?.content as string | undefined;
  const type = (body?.type as string | undefined) ?? "text";
  const mediaPath = body?.media_path as string | undefined;
  const mediaMime = body?.media_mime as string | undefined;
  const durationSeconds = body?.duration_seconds as number | undefined;

  if (!conversationId) {
    return NextResponse.json({ error: "conversation_id is required" }, { status: 400 });
  }
  if (type !== "text" && type !== "image" && type !== "audio") {
    return NextResponse.json({ error: "type must be text, image, or audio" }, { status: 400 });
  }
  if (type === "text" && (!content || !content.trim())) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }
  if (type !== "text" && !mediaPath) {
    return NextResponse.json({ error: "media_path is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: type === "text" ? content!.trim() : null,
      type,
      media_path: mediaPath ?? null,
      media_mime: mediaMime ?? null,
      duration_seconds: durationSeconds ?? null,
    })
    .select("id, conversation_id, sender_id, content, type, media_path, media_mime, duration_seconds, read_at, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let mediaUrl: string | null = null;
  if (data.media_path) {
    const { data: signed } = await supabase.storage
      .from("chat-media")
      .createSignedUrl(data.media_path, 60 * 60);
    mediaUrl = signed?.signedUrl ?? null;
  }

  return NextResponse.json({ message: { ...data, media_url: mediaUrl } }, { status: 201 });
}
