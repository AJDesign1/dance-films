"use client";

import { useRouter, usePathname } from "next/navigation";
import styles from "@/app/(admin)/admin/[slug]/admin.module.css";

/** Show picker that drives the ?show=<id> query param for a section. */
export default function ShowSelect({
  shows,
  current,
}: {
  shows: { id: string; title: string }[];
  current: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-2)" }}>Show</label>
      <select
        className={styles.select}
        style={{ width: "auto", minWidth: 220 }}
        value={current}
        onChange={(e) => router.push(`${pathname}?show=${e.target.value}`)}
      >
        {shows.map((s) => (
          <option key={s.id} value={s.id}>{s.title}</option>
        ))}
      </select>
    </div>
  );
}
