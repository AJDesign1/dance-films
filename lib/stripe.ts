import "server-only";
import Stripe from "stripe";

/**
 * Server-only Stripe client. Returns null when STRIPE_SECRET_KEY isn't set yet,
 * so the checkout flow can degrade gracefully ("payments not configured")
 * until keys are added. Never import this into a client component.
 */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}
