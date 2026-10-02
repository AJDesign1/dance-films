import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireAdmin, getManagedSchool } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminSidebar from "@/components/admin/AdminSidebar";
import styles from "./admin.module.css";

async function SidebarWithCount({ school }: { school: { id: string; slug: string; name: string } }) {
  const admin = createAdminClient();
  const { count } = await admin
    .from("invited_emails")
    .select("id", { count: "exact", head: true })
    .eq("school_id", school.id)
    .eq("status", "invited");
  return <AdminSidebar slug={school.slug} schoolName={school.name} invitedPending={count ?? 0} />;
}

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

  return (
    <div data-admin className={styles.shell}>
      {/* The optional badge must not hold up the entire admin page. */}
      <Suspense fallback={<AdminSidebar slug={school.slug} schoolName={school.name} invitedPending={0} />}>
        <SidebarWithCount school={school} />
      </Suspense>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
