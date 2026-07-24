import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe signature verification needs the raw body + Node crypto.
export const runtime = "nodejs";

/**
 * Stripe webhook. On a verified `checkout.session.completed`, mark the order
 * paid and insert the entitlement (service role) — the single action that
 * unlocks a show. Idempotent: the entitlement has a unique (user, show) index.
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing_signature" }, { status: 400 });

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid";
    return NextResponse.json({ error: `signature_verification_failed: ${message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata ?? {};
    const orderId = meta.order_id;
    const userId = meta.user_id;
    const showId = meta.show_id;

    if (userId && showId) {
      const admin = createAdminClient();
      if (orderId) {
        await admin.from("orders").update({ status: "paid" }).eq("id", orderId);
      }
      // Insert the entitlement; ignore the conflict if it already exists.
      await admin
        .from("entitlements")
        .upsert(
          { user_id: userId, show_id: showId, source: "purchase" },
          { onConflict: "user_id,show_id", ignoreDuplicates: true },
        );
    }
  }

  return NextResponse.json({ received: true });
}
