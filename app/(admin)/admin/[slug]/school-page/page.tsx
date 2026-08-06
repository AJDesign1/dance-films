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
    teamName: school.team_name ?? "",
    teamRole: school.team_role ?? "",
    teamBio: school.team_bio ?? "",
    teamTagline: school.team_tagline ?? "",
    teamImageUrl: school.team_image_url ?? "",
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
