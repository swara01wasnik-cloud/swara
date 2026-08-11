// Returns true only when real Supabase keys are present (placeholder values don't count),
// so the app can keep running in mock mode until the user pastes their keys.
export function supabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return (
    url.includes("supabase.co") &&
    !url.includes("YOUR_PROJECT_REF") &&
    key.length > 10 &&
    !key.includes("YOUR_ANON_KEY")
  );
}
