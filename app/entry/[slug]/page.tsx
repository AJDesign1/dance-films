import { notFound } from "next/navigation";
import { loadSchoolBySlug } from "@/lib/school";
import { themeToCssVars, themeMode } from "@/lib/theme";
import LoginScreen from "@/components/platform/LoginScreen";

/**
 * The prerendered sign-in page, one per school: /entry/<slug>.
 *
 * Parents never see this path — middleware rewrites signed-out requests for
 * '/' and '/login' here. It exists so the first page a parent ever loads can
 * be served straight from the CDN instead of waking a serverless function
 * (cold boots measured at 3–7s; the cached /coming-soon page serves in
 * ~130ms). The tenant arrives as a path param rather than the usual
 * x-school-slug header because reading headers() would force dynamic
 * rendering and put the function back in the path — which is also why this
 * route lives outside the (platform) layout and mirrors its themed shell
 * instead.
 *
 * Safe to cache shared: it renders only the school's public branding — the
 * same anon-readable row the login page has always shown signed-out
 * visitors. Nothing entitled is here, and signing in is a server-action POST,
 * which never comes from the cache. Branding edits revalidate the page via
 * SCHOOLS_CACHE_TAG; the TTL is the self-healing safety net.
 */
export const revalidate = 300;

export function generateStaticParams() {
  // No build-time DB read: each school's page is generated on its first
  // visit, then served from the cache until revalidated.
  return [];
}

export default async function EntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const school = await loadSchoolBySlug(slug);
  if (!school) notFound();

  const theme = school.theme ?? {};
  return (
    <div
      data-app
      data-theme={themeMode(theme)}
      style={{ ...themeToCssVars(theme), minHeight: "100vh", background: "var(--desk)" }}
    >
      <LoginScreen
        schoolName={school.name}
        logoWhiteUrl={school.logo_white_url}
        heroImageUrl={school.hero_image_url}
      />
    </div>
  );
}
