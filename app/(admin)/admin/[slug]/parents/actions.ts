"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export type ActionResult = { ok: true; message?: string } | { error: string };

export async function addParent(
  schoolId: string,
  slug: string,
  email: string,
  name: string,
): Promise<ActionResult> {
  await requireAdmin();
  const clean = email.trim().toLowerCase();
  if (!EMAIL_RE.test(clean)) return { error: "Enter a valid email address." };

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("invited_emails")
    .select("id")
    .eq("school_id", schoolId)
    .ilike("email", clean)
    .maybeSingle();
  if (existing) return { error: "That email is already invited." };

  const { error } = await admin
    .from("invited_emails")
    .insert({ school_id: schoolId, email: clean, name: name.trim() || null });
  if (error) return { error: "Couldn't add that parent. Please try again." };

  revalidatePath(`/admin/${slug}/parents`);
  return { ok: true };
}

export async function removeParent(inviteId: string, slug: string): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("invited_emails").delete().eq("id", inviteId);
  if (error) return { error: "Couldn't remove that parent." };
  revalidatePath(`/admin/${slug}/parents`);
  return { ok: true };
}

export async function bulkAddParents(
  schoolId: string,
  slug: string,
  text: string,
): Promise<ActionResult> {
  await requireAdmin();
  const found = Array.from(
    new Set(
      (text || "")
        .split(/[\s,;]+/)
        .map((x) => x.trim().toLowerCase())
        .filter((x) => EMAIL_RE.test(x)),
    ),
  );
  if (found.length === 0) return { error: "No valid emails found." };

  const admin = createAdminClient();
  const { data: existingRows } = await admin
    .from("invited_emails")
    .select("email")
    .eq("school_id", schoolId);
  const existing = new Set((existingRows ?? []).map((r) => r.email.toLowerCase()));
  const toAdd = found.filter((e) => !existing.has(e)).map((email) => ({ school_id: schoolId, email }));
  if (toAdd.length === 0) return { error: "All those emails are already invited." };

  const { error } = await admin.from("invited_emails").insert(toAdd);
  if (error) return { error: "Import failed. Please try again." };

  revalidatePath(`/admin/${slug}/parents`);
  return { ok: true, message: `${toAdd.length} added.` };
}
