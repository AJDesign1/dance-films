import { getManagedSchool } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminHeader from "@/components/admin/AdminHeader";
import ParentsManager, { type ParentRow } from "@/components/admin/ParentsManager";
import styles from "../admin.module.css";

export default async function ParentsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const school = (await getManagedSchool(slug))!;
  const admin = createAdminClient();

  const { data: invites } = await admin
    .from("invited_emails")
    .select("id, email, name, status")
    .eq("school_id", school.id)
    .order("created_at", { ascending: true });

  // "Signed up" is authoritative from profiles (status is also flipped on signup).
  const { data: profileRows } = await admin.from("profiles").select("email");
  const registered = new Set((profileRows ?? []).map((p) => p.email.toLowerCase()));

  const parents: ParentRow[] = (invites ?? []).map((i) => ({
    id: i.id,
    email: i.email,
    name: i.name,
    registered: i.status === "registered" || registered.has(i.email.toLowerCase()),
  }));

  return (
    <>
      <AdminHeader title="Invited parents" />
      <div className={styles.content}>
        <ParentsManager schoolId={school.id} slug={slug} parents={parents} />
      </div>
    </>
  );
}
