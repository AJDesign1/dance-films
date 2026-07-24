import { notFound } from "next/navigation";
import { requireAdmin, getManagedSchool } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminSidebar from "@/components/admin/AdminSidebar";
import styles from "./admin.module.css";

export default async function SchoolAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  await requireAdmin();
  const { slug } = await params;
  const school = await getManagedSchool(slug);
  if (!school) notFound();

  // Pending-invite badge count (service role).
  const admin = createAdminClient();
  const { count } = await admin
    .from("invited_emails")
    .select("id", { count: "exact", head: true })
    .eq("school_id", school.id)
    .eq("status", "invited");

  return (
    <div data-admin className={styles.shell}>
      <AdminSidebar slug={school.slug} schoolName={school.name} invitedPending={count ?? 0} />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
