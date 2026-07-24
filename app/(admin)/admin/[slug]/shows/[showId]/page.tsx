import { notFound } from "next/navigation";
import { getManagedSchool } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminHeader from "@/components/admin/AdminHeader";
import ShowEditor, { type EditableShow } from "@/components/admin/ShowEditor";
import styles from "../../admin.module.css";

export default async function ShowEditorPage({ params }: { params: Promise<{ slug: string; showId: string }> }) {
  const { slug, showId } = await params;
  const school = (await getManagedSchool(slug))!;

  let show: EditableShow | null = null;
  if (showId !== "new") {
    const admin = createAdminClient();
    const { data } = await admin
      .from("shows")
      .select("id, title, season, show_year, price_pence, intro_text, artwork_url, status")
      .eq("id", showId)
      .eq("school_id", school.id)
      .maybeSingle();
    if (!data) notFound();
    show = data as EditableShow;
  }

  return (
    <>
      <AdminHeader title={show ? "Edit show" : "New show"} crumb="Shows" crumbHref={`/admin/${slug}/shows`} />
      <div className={styles.content}>
        <ShowEditor slug={slug} schoolId={school.id} show={show} />
      </div>
    </>
  );
}
