"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionResult = { ok: true } | { error: string };

export async function grantEntitlement(userId: string, showId: string, slug: string): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("entitlements")
    .upsert({ user_id: userId, show_id: showId, source: "granted" }, { onConflict: "user_id,show_id", ignoreDuplicates: true });
  if (error) return { error: "Couldn't grant access." };
  revalidatePath(`/admin/${slug}/users`);
  return { ok: true };
}

export async function revokeEntitlement(userId: string, showId: string, slug: string): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  // Removing the entitlement revokes access immediately (RLS gate). Any Stripe
  // refund is handled separately in the Stripe dashboard for V1.
  const { error } = await admin.from("entitlements").delete().eq("user_id", userId).eq("show_id", showId);
  if (error) return { error: "Couldn't revoke access." };
  revalidatePath(`/admin/${slug}/users`);
  return { ok: true };
}
