"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type NameResult = { status: "error"; message: string } | { status: "ok" };

/** One-time name capture on first sign-in. RLS lets a user update only the
 * `name` column of their own profile (column-level grant), so this is safe. */
export async function saveName(name: string): Promise<NameResult> {
  const clean = name.trim();
  if (clean.length < 2) {
    return { status: "error", message: "Please enter your name." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ name: clean })
    .eq("id", user.id);

  if (error) return { status: "error", message: "Couldn't save your name. Please try again." };

  redirect("/shows");
}
