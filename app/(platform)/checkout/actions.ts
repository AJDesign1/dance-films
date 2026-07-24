"use server";

import { getUser } from "@/lib/auth";
import { getCurrentSchool } from "@/lib/school";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { getOrigin } from "@/lib/url";

export type CheckoutResult = { url: string } | { error: string };

/**
 * Create a Stripe Checkout Session (hosted, GBP) for the logged-in user + show.
 * A pending order is recorded first (service role); the entitlement is only
 * created later by the verified webhook. Returns the hosted checkout URL.
 */
export async function createCheckoutSession(slug: string): Promise<CheckoutResult> {
  const user = await getUser();
  if (!user) return { error: "Please sign in again." };

  const stripe = getStripe();
  if (!stripe) return { error: "Payments aren't configured yet. Please try again soon." };

  const school = await getCurrentSchool();
  if (!school) return { error: "Something went wrong. Please try again." };

  const supabase = await createClient();
  const { data: show } = await supabase
    .from("shows")
    .select("id, slug, title, show_year, price_pence, stripe_price_id")
    .eq("school_id", school.id)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!show) return { error: "That show isn't available." };

  // Already owned? Don't double-charge.
  const { data: existing } = await supabase.from("entitlements").select("id").eq("show_id", show.id).maybeSingle();
  if (existing) return { url: `/show/${show.slug}` };

  const origin = await getOrigin();
  const admin = createAdminClient();

  // Record a pending order (service role — orders aren't client-writable).
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .insert({ user_id: user.id, show_id: show.id, amount_pence: show.price_pence, currency: "gbp", status: "pending" })
    .select("id")
    .single();
  if (orderErr || !order) return { error: "Couldn't start checkout. Please try again." };

  const lineItem: import("stripe").Stripe.Checkout.SessionCreateParams.LineItem = show.stripe_price_id
    ? { price: show.stripe_price_id, quantity: 1 }
    : {
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: show.price_pence,
          product_data: {
            name: `${show.title}${show.show_year ? ` (${show.show_year})` : ""}`,
            description: "Full show + every performance",
          },
        },
      };

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [lineItem],
    customer_email: user.email,
    success_url: `${origin}/show/${show.slug}?purchase=success`,
    cancel_url: `${origin}/shows`,
    metadata: { order_id: order.id, user_id: user.id, show_id: show.id, school_id: school.id },
  });

  // Link the session to the order for reconciliation.
  await admin.from("orders").update({ stripe_session_id: session.id }).eq("id", order.id);

  if (!session.url) return { error: "Couldn't start checkout. Please try again." };
  return { url: session.url };
}
