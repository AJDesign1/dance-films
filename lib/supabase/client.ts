import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * Browser Supabase client (anon/publishable key only).
 * Safe for client components — RLS is the gate on everything it can touch.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
