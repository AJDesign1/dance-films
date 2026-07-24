"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/(admin)/admin/[slug]/admin.module.css";
import { initials } from "@/lib/format";
import { grantEntitlement, revokeEntitlement } from "@/app/(admin)/admin/[slug]/users/actions";

export type UserRow = {
  id: string;
  name: string | null;
  email: string;
  joined: string;
  entitlements: { showId: string; title: string; owned: boolean }[];
};

export default function UsersManager({ slug, users }: { slug: string; users: UserRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle(userId: string, showId: string, owned: boolean) {
    startTransition(async () => {
      const res = owned ? await revokeEntitlement(userId, showId, slug) : await grantEntitlement(userId, showId, slug);
      if (!("error" in res)) router.refresh();
    });
  }

  if (users.length === 0) {
    return (
      <div className={styles.card} style={{ padding: "50px 20px", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--disp)", fontWeight: 700, fontSize: 20, textTransform: "uppercase" }}>No users yet</div>
        <p style={{ color: "var(--text-2)", fontSize: 14, margin: "8px 0 0" }}>Parents appear here once they sign in.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {users.map((u) => {
        const ownedCount = u.entitlements.filter((e) => e.owned).length;
        return (
          <div key={u.id} className={`${styles.card} ${styles.cardPad}`}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ flex: "0 0 auto", width: 40, height: 40, borderRadius: "var(--r-pill)", background: "var(--surface-2)", color: "var(--text-2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15 }}>
                {initials(u.name ?? u.email)}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{u.name ?? "—"}</div>
                <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>{u.email} · joined {u.joined}</div>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>{ownedCount} owned</div>
            </div>
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)", display: "flex", flexWrap: "wrap", gap: 8 }}>
              {u.entitlements.map((e) => (
                <div key={e.showId} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 8px 6px 12px", borderRadius: "var(--r-pill)", border: `1px solid ${e.owned ? "var(--success)" : "var(--border)"}`, background: e.owned ? "var(--success-tint)" : "var(--surface-2)" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: e.owned ? "var(--success)" : "var(--text-2)" }}>{e.title}</span>
                  <button
                    disabled={pending}
                    onClick={() => toggle(u.id, e.showId, e.owned)}
                    style={{ padding: "4px 10px", borderRadius: "var(--r-pill)", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "var(--body)", background: e.owned ? "var(--danger-tint)" : "var(--accent)", color: e.owned ? "var(--danger)" : "#fff" }}
                  >
                    {e.owned ? "Revoke" : "Grant"}
                  </button>
                </div>
              ))}
              {u.entitlements.length === 0 && <span style={{ fontSize: 13, color: "var(--text-3)" }}>No shows to grant yet.</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
