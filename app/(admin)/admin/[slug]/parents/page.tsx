import { getManagedSchool } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminHeader from "@/components/admin/AdminHeader";
import ParentsManager, { type ParentRow } from "@/components/admin/ParentsManager";
import styles from "../admin.module.css";

export default async function ParentsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const school = (await getManagedSchool(slug))!;
  const admin = createAdminClient();

  const [{ data: invites }, { data: profileRows }, { data: shows }] = await Promise.all([
    admin.from("invited_emails").select("id, email, name, status").eq("school_id", school.id).order("created_at", { ascending: true }),
    // Only a signed-in parent has a profile — the id is what an entitlement attaches to.
    admin.from("profiles").select("id, email"),
    admin.from("shows").select("id, title").eq("school_id", school.id).order("sort_order", { ascending: true }),
  ]);

  const showList = shows ?? [];
  const profileByEmail = new Map((profileRows ?? []).map((p) => [p.email.toLowerCase(), p.id]));

  // Entitlements for the mapped profiles → "userId:showId" → source ('purchase' = paid by card, 'granted' = cash/comp).
  const userIds = Array.from(new Set(profileByEmail.values()));
  const { data: ents } = userIds.length
    ? await admin.from("entitlements").select("user_id, show_id, source").in("user_id", userIds)
    : { data: [] as { user_id: string; show_id: string; source: "purchase" | "granted" }[] };
  const sourceByKey = new Map((ents ?? []).map((e) => [`${e.user_id}:${e.show_id}`, e.source]));

  const parents: ParentRow[] = (invites ?? []).map((i) => {
    const userId = profileByEmail.get(i.email.toLowerCase()) ?? null;
    return {
      id: i.id,
      email: i.email,
      name: i.name,
      registered: userId !== null || i.status === "registered",
      userId,
      shows: showList.map((s) => ({
        showId: s.id,
        title: s.title,
        source: userId ? (sourceByKey.get(`${userId}:${s.id}`) ?? null) : null,
      })),
    };
  });

  return (
    <>
      <AdminHeader title="Invited parents" />
      <div className={styles.content}>
        <ParentsManager schoolId={school.id} slug={slug} parents={parents} hasShows={showList.length > 0} />
      </div>
    </>
  );
}
