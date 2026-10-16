import { getCurrentSchool } from "@/lib/school";
import { themeToCssVars, themeMode } from "@/lib/theme";
import { imageMetadata } from "@/lib/media";
import { ImageMetadataProvider } from "@/components/platform/ImageMetadata";

/**
 * Customer-platform shell. Loads the current school's theme from the DB and
 * applies it as CSS-variable overrides on the [data-app] wrapper, so every
 * screen inside this group renders as that school's brand. The dark/light
 * semantic set is chosen by the school's saved default.
 */
export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const school = await getCurrentSchool();
  const theme = school?.theme ?? {};
  const images = school ? await imageMetadata(school.id, [school.logo_colour_url, school.logo_white_url, school.hero_image_url, school.about_image_url, school.team_image_url].filter((u): u is string => !!u)) : {};

  return (
    <div
      data-app
      data-theme={themeMode(theme)}
      style={{ ...themeToCssVars(theme), minHeight: "100vh", background: "var(--desk)" }}
    >
      <ImageMetadataProvider images={images}>{children}</ImageMetadataProvider>
    </div>
  );
}
