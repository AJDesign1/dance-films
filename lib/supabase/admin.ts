import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Service-role Supabase client — BYPASSES RLS.
 *
 * SERVER-ONLY. Never import this into a client component. Use exclusively for
 * privileged operations that must run behind server-side auth:
 *   - Stripe webhook → insert entitlements / mark orders paid
 *   - invite-allowlist checks before sending a magic link
 *   - admin writes (branding, shows, performances, grant/revoke)
 *
 * The `server-only` import makes the build fail if this ever reaches the client.
 */
import "server-only";

export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
