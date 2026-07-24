import Link from "next/link";
import { getManagedSchool } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminHeader from "@/components/admin/AdminHeader";
import ShowsList, { type ShowRow } from "@/components/admin/ShowsList";
import styles from "../admin.module.css";

export default async function ShowsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const school = (await getManagedSchool(slug))!;
  const admin = createAdminClient();

  const { data: shows } = await admin
    .from("shows")
    .select("id, slug, title, season, show_year, price_pence, status")
    .eq("school_id", school.id)
    .order("sort_order", { ascending: true });

  const ids = (shows ?? []).map((s) => s.id);
  const { data: perfs } = ids.length
    ? await admin.from("performances").select("show_id").in("show_id", ids)
    : { data: [] as { show_id: string }[] };
  const perfCounts = new Map<string, number>();
  for (const p of perfs ?? []) perfCounts.set(p.show_id, (perfCounts.get(p.show_id) ?? 0) + 1);

  const rows: ShowRow[] = (shows ?? []).map((s) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    season: s.season,
    show_year: s.show_year,
    price_pence: s.price_pence,
    status: s.status,
    perfCount: perfCounts.get(s.id) ?? 0,
  }));

  return (
    <>
      <AdminHeader
        title="Shows"
        action={<Link href={`/admin/${slug}/shows/new`} className={styles.primaryBtn}>New show</Link>}
      />
      <div className={styles.content}>
        <ShowsList slug={slug} shows={rows} />
      </div>
    </>
  );
}
