import { getManagedSchool } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminHeader from "@/components/admin/AdminHeader";
import UsersManager, { type UserRow } from "@/components/admin/UsersManager";
import styles from "../admin.module.css";

function monthYear(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

export default async function UsersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const school = (await getManagedSchool(slug))!;
  const admin = createAdminClient();

  const [{ data: profiles }, { data: shows }] = await Promise.all([
    admin.from("profiles").select("id, name, email, created_at, is_admin").eq("is_admin", false).order("created_at", { ascending: false }),
    admin.from("shows").select("id, title").eq("school_id", school.id).order("sort_order", { ascending: true }),
  ]);

  const showList = shows ?? [];
  const userIds = (profiles ?? []).map((p) => p.id);
  const { data: ents } = userIds.length
    ? await admin.from("entitlements").select("user_id, show_id").in("user_id", userIds)
    : { data: [] as { user_id: string; show_id: string }[] };

  const ownedSet = new Set((ents ?? []).map((e) => `${e.user_id}:${e.show_id}`));

  const users: UserRow[] = (profiles ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    joined: monthYear(p.created_at),
    entitlements: showList.map((s) => ({
      showId: s.id,
      title: s.title,
      owned: ownedSet.has(`${p.id}:${s.id}`),
    })),
  }));

  return (
    <>
      <AdminHeader title="Users & access" />
      <div className={styles.content}>
        <UsersManager slug={slug} users={users} />
      </div>
    </>
  );
}
