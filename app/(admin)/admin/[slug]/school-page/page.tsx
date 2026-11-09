import { getManagedSchool } from "@/lib/admin";
import AdminHeader from "@/components/admin/AdminHeader";
import SchoolPageForm from "@/components/admin/SchoolPageForm";
import type { SchoolPageForm as FormT } from "./actions";
import styles from "../admin.module.css";

export default async function SchoolPageContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const school = (await getManagedSchool(slug))!;

  const initial: FormT = {
    aboutText: school.about_text ?? "",
    aboutImageUrl: school.about_image_url ?? "",
    galleryImageUrls: school.gallery_image_urls ?? [],
    quoteText: school.quote_text ?? "",
    quoteName: school.quote_name ?? "",
    quoteRole: school.quote_role ?? "",
  };

  return (
    <>
      <AdminHeader title="School page" />
      <div className={styles.content}>
        <SchoolPageForm schoolId={school.id} slug={slug} schoolName={school.name} initial={initial} />
      </div>
    </>
  );
}
