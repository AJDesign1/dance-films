import { getManagedSchool } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminHeader from "@/components/admin/AdminHeader";
import AccessCodesManager, { type AccessCodeRow } from "@/components/admin/AccessCodesManager";
import styles from "../admin.module.css";

export default async function AccessCodesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const school = (await getManagedSchool(slug))!;
  const admin = createAdminClient();

  const [{ data: codes }, { data: shows }] = await Promise.all([
    admin
      .from("access_codes")
      .select("id, code, status, show_id, created_at")
      .eq("school_id", school.id)
      .order("created_at", { ascending: false }),
    admin.from("shows").select("id, title").eq("school_id", school.id).order("sort_order", { ascending: true }),
  ]);

  const showById = new Map((shows ?? []).map((s) => [s.id, s.title]));

  const rows: AccessCodeRow[] = (codes ?? []).map((c) => ({
    id: c.id,
    code: c.code,
    status: c.status,
    showId: c.show_id,
    showTitle: c.show_id ? (showById.get(c.show_id) ?? null) : null,
  }));

  return (
    <>
      <AdminHeader title="Access codes" />
      <div className={styles.content}>
        <AccessCodesManager schoolId={school.id} slug={slug} codes={rows} shows={shows ?? []} />
      </div>
    </>
  );
}
