import { getManagedSchool } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminHeader from "@/components/admin/AdminHeader";
import ShowSelect from "@/components/admin/ShowSelect";
import CategoriesManager, { type CatRow } from "@/components/admin/CategoriesManager";
import styles from "../admin.module.css";

export default async function CategoriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ show?: string }>;
}) {
  const { slug } = await params;
  const { show } = await searchParams;
  const school = (await getManagedSchool(slug))!;
  const admin = createAdminClient();

  const { data: shows } = await admin.from("shows").select("id, title").eq("school_id", school.id).order("sort_order", { ascending: true });
  const showList = shows ?? [];

  if (showList.length === 0) {
    return (
      <>
        <AdminHeader title="Categories" />
        <div className={styles.content}><EmptyShows /></div>
      </>
    );
  }

  const activeShow = showList.find((s) => s.id === show) ?? showList[0];

  const [{ data: cats }, { data: perfs }] = await Promise.all([
    admin.from("categories").select("id, name, kind, sort_order").eq("show_id", activeShow.id).order("sort_order", { ascending: true }),
    admin.from("performances").select("id").eq("show_id", activeShow.id),
  ]);
  const perfIds = (perfs ?? []).map((p) => p.id);
  const { data: links } = perfIds.length
    ? await admin.from("performance_categories").select("category_id").in("performance_id", perfIds)
    : { data: [] as { category_id: string }[] };
  const usage = new Map<string, number>();
  for (const l of links ?? []) usage.set(l.category_id, (usage.get(l.category_id) ?? 0) + 1);

  const toRow = (c: { id: string; name: string }): CatRow => ({ id: c.id, name: c.name, count: usage.get(c.id) ?? 0 });
  const groups = (cats ?? []).filter((c) => c.kind === "group").map(toRow);
  const styleRows = (cats ?? []).filter((c) => c.kind === "style").map(toRow);

  return (
    <>
      <AdminHeader title="Categories" crumb="Shows" crumbHref={`/admin/${slug}/shows`} />
      <div className={styles.content}>
        <div style={{ marginBottom: 18 }}>
          <ShowSelect shows={showList} current={activeShow.id} />
        </div>
        <CategoriesManager slug={slug} showId={activeShow.id} groups={groups} styles={styleRows} />
      </div>
    </>
  );
}

function EmptyShows() {
  return (
    <div className={`${styles.card} ${styles.cardPad}`} style={{ maxWidth: 520 }}>
      <div style={{ fontFamily: "var(--disp)", fontWeight: 700, fontSize: 20, textTransform: "uppercase" }}>No shows yet</div>
      <p style={{ color: "var(--text-2)", fontSize: 14, margin: "8px 0 0" }}>Create a show first, then add its class groups and dance styles.</p>
    </div>
  );
}
