import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client (anon/publishable key only).
 * Safe for client components — RLS is the gate on everything it can touch.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
