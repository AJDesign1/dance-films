"use server";

import { randomInt } from "crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionResult = { ok: true } | { error: string };

// Excludes visually ambiguous characters (0/O, 1/I/L) — these get read aloud
// or copied off a flyer by hand, so typos matter more than for a UUID.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateCode(length = 8): string {
  let out = "";
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}

/** Generate a code that isn't already taken within this school (collision is
 * astronomically unlikely at 32^8, but cheap to guard anyway). */
async function uniqueCode(admin: ReturnType<typeof createAdminClient>, schoolId: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateCode();
    const { data: clash } = await admin
      .from("access_codes")
      .select("id")
      .eq("school_id", schoolId)
      .eq("code", candidate)
      .maybeSingle();
    if (!clash) return candidate;
  }
  // Vanishingly unlikely to be reached; fall back to one more attempt unchecked.
  return generateCode();
}

export async function createAccessCode(
  schoolId: string,
  slug: string,
  showId: string | null,
): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const code = await uniqueCode(admin, schoolId);

  const { error } = await admin
    .from("access_codes")
    .insert({ school_id: schoolId, show_id: showId, code });
  if (error) return { error: "Couldn't create the access code." };

  revalidatePath(`/admin/${slug}/access-codes`);
  return { ok: true };
}

export async function regenerateAccessCode(id: string, slug: string): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: row } = await admin.from("access_codes").select("school_id").eq("id", id).maybeSingle();
  if (!row) return { error: "Not found." };

  const code = await uniqueCode(admin, row.school_id);
  const { error } = await admin.from("access_codes").update({ code }).eq("id", id);
  if (error) return { error: "Couldn't regenerate the code." };

  revalidatePath(`/admin/${slug}/access-codes`);
  return { ok: true };
}

export async function updateAccessCodeShow(
  id: string,
  slug: string,
  showId: string | null,
): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("access_codes").update({ show_id: showId }).eq("id", id);
  if (error) return { error: "Couldn't update." };
  revalidatePath(`/admin/${slug}/access-codes`);
  return { ok: true };
}

export async function toggleAccessCodeStatus(
  id: string,
  slug: string,
  next: "active" | "disabled",
): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("access_codes").update({ status: next }).eq("id", id);
  if (error) return { error: "Couldn't update status." };
  revalidatePath(`/admin/${slug}/access-codes`);
  return { ok: true };
}

export async function removeAccessCode(id: string, slug: string): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("access_codes").delete().eq("id", id);
  if (error) return { error: "Couldn't remove the code." };
  revalidatePath(`/admin/${slug}/access-codes`);
  return { ok: true };
}
