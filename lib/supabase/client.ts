import { createBrowserClient } from "@supabase/ssr";

// Browser client — used in client components for auth + realtime.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
