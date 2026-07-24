import { getManagedSchool } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDuration } from "@/lib/format";
import AdminHeader from "@/components/admin/AdminHeader";
import ShowSelect from "@/components/admin/ShowSelect";
import PerformancesManager, { type PerfRow } from "@/components/admin/PerformancesManager";
import styles from "../admin.module.css";

/** Seconds → "1:12:40" or "58:20" (editable clock for the full-show field). */
function clock(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

export default async function PerformancesPage({
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
        <AdminHeader title="Performances" crumb="Shows" crumbHref={`/admin/${slug}/shows`} />
        <div className={styles.content}>
          <div className={`${styles.card} ${styles.cardPad}`} style={{ maxWidth: 520 }}>
            <div style={{ fontFamily: "var(--disp)", fontWeight: 700, fontSize: 20, textTransform: "uppercase" }}>No shows yet</div>
            <p style={{ color: "var(--text-2)", fontSize: 14, margin: "8px 0 0" }}>Create a show first, then add its performances.</p>
          </div>
        </div>
      </>
    );
  }

  const activeShow = showList.find((s) => s.id === show) ?? showList[0];

  const [{ data: video }, { data: perfs }, { data: cats }] = await Promise.all([
    admin.from("show_videos").select("full_show_vimeo_id, duration_seconds").eq("show_id", activeShow.id).maybeSingle(),
    admin.from("performances").select("id, title, vimeo_id, duration_seconds, sort_order").eq("show_id", activeShow.id).order("sort_order", { ascending: true }),
    admin.from("categories").select("id, name, kind, sort_order").eq("show_id", activeShow.id).order("sort_order", { ascending: true }),
  ]);

  const perfIds = (perfs ?? []).map((p) => p.id);
  const { data: links } = perfIds.length
    ? await admin.from("performance_categories").select("performance_id, category_id").in("performance_id", perfIds)
    : { data: [] as { performance_id: string; category_id: string }[] };

  const catKind = new Map((cats ?? []).map((c) => [c.id, c.kind]));
  const groupByPerf = new Map<string, string>();
  const styleByPerf = new Map<string, string>();
  for (const l of links ?? []) {
    const kind = catKind.get(l.category_id);
    if (kind === "group") groupByPerf.set(l.performance_id, l.category_id);
    else if (kind === "style") styleByPerf.set(l.performance_id, l.category_id);
  }

  const performances: PerfRow[] = (perfs ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    vimeoId: p.vimeo_id,
    duration: formatDuration(p.duration_seconds),
    groupId: groupByPerf.get(p.id) ?? "",
    styleId: styleByPerf.get(p.id) ?? "",
  }));

  const groups = (cats ?? []).filter((c) => c.kind === "group").map((c) => ({ id: c.id, name: c.name }));
  const styleCats = (cats ?? []).filter((c) => c.kind === "style").map((c) => ({ id: c.id, name: c.name }));

  return (
    <>
      <AdminHeader title={`${activeShow.title} — performances`} crumb="Shows" crumbHref={`/admin/${slug}/shows`} />
      <div className={styles.content}>
        <div style={{ marginBottom: 18 }}>
          <ShowSelect shows={showList} current={activeShow.id} />
        </div>
        <PerformancesManager
          slug={slug}
          showId={activeShow.id}
          fullVimeo={video?.full_show_vimeo_id ?? ""}
          fullDuration={clock(video?.duration_seconds ?? null)}
          performances={performances}
          groups={groups}
          styles={styleCats}
        />
      </div>
    </>
  );
}
