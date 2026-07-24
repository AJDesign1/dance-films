"use server";

import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { vimeoEmbedUrl } from "@/lib/vimeo";

/**
 * Resolve a play URL on demand. The vimeo_id never leaves the server except
 * inside the returned iframe embed URL — it's not in the page markup or the
 * initial client payload. RLS re-verifies entitlement here: the select returns
 * a row only if the caller owns the show, so a guessed id yields null.
 */
export async function getEmbedUrl(kind: "full" | "perf", id: string): Promise<string | null> {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();

  if (kind === "perf") {
    const { data } = await supabase
      .from("performances")
      .select("vimeo_id")
      .eq("id", id)
      .maybeSingle();
    return data?.vimeo_id ? vimeoEmbedUrl(data.vimeo_id, { autoplay: true }) : null;
  }

  const { data } = await supabase
    .from("show_videos")
    .select("full_show_vimeo_id")
    .eq("show_id", id)
    .maybeSingle();
  return data?.full_show_vimeo_id ? vimeoEmbedUrl(data.full_show_vimeo_id, { autoplay: true }) : null;
}
