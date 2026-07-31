import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrigin } from "@/lib/url";

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const origin = await getOrigin();
  return NextResponse.redirect(`${origin}/login`, { status: 303 });
}
