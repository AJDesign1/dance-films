import { getManagedSchool } from "@/lib/admin";
import AdminHeader from "@/components/admin/AdminHeader";
import BrandingForm from "@/components/admin/BrandingForm";
import type { BrandingForm as FormT } from "./actions";
import styles from "../admin.module.css";

export default async function BrandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const school = (await getManagedSchool(slug))!;
  const t = school.theme ?? {};

  const initial: FormT = {
    name: school.name,
    platformName: school.platform_name ?? "",
    subdomain: school.slug,
    logoColourUrl: school.logo_colour_url ?? "",
    logoWhiteUrl: school.logo_white_url ?? "",
    signInImageUrl: school.hero_image_url ?? "",
    primary: t.primary ?? "#13D1C4",
    secondary: t.secondary ?? "#43576E",
    ink: t.ink ?? "#0B171B",
    paper: t.paper ?? "#F5F1E8",
    accentWarm: t.accentWarm ?? "#E8A54B",
    fontKey: t.font_key ?? "Big Shoulders Display",
    theme: t.theme === "light" ? "light" : "dark",
  };

  return (
    <>
      <AdminHeader title="Branding & configuration" />
      <div className={styles.content}>
        <BrandingForm schoolId={school.id} slug={slug} initial={initial} />
      </div>
    </>
  );
}
