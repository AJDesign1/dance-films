import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import type { Database } from "./database.types";
import { sharedCookieDomain } from "@/lib/cookieDomain";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Server Supabase client bound to the request's auth cookies (anon key).
 * Use in Server Components, Route Handlers and Server Actions. Still
 * subject to RLS — this is the logged-in user's view of the data.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const h = await headers();
  const domain = sharedCookieDomain(h.get("x-forwarded-host") ?? h.get("host"));

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options, domain }),
            );
          } catch {
            // Called from a Server Component — cookies are read-only here.
            // Session refresh is handled in middleware, so this is safe to ignore.
          }
        },
      },
    },
  );
}
