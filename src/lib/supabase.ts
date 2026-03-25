import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function createBrowserSupabaseClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// Backward compat alias for existing code (waitlist form, etc.)
export function getSupabase() {
  if (typeof window === "undefined") return null;
  return createBrowserSupabaseClient();
}
