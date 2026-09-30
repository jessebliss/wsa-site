import Stripe from "stripe";

const API_VERSION = "2026-08-26.dahlia";

let client: Stripe | null = null;

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Stripe is not configured. Add STRIPE_SECRET_KEY (test mode) before taking a card payment.",
    );
  }
  if (key.startsWith("sk_live_") && process.env.STRIPE_ALLOW_LIVE !== "true") {
    throw new Error(
      "Live Stripe keys are blocked until STRIPE_ALLOW_LIVE=true. Keep test keys until launch.",
    );
  }
  if (!client) {
    client = new Stripe(key, { apiVersion: API_VERSION });
  }
  return client;
}

export async function billingPortalUrl(customerId: string, returnUrl: string) {
  const stripe = getStripe();
  const existing = await stripe.billingPortal.configurations.list({ limit: 1 });
  if (existing.data.length === 0) {
    await stripe.billingPortal.configurations.create({
      business_profile: { headline: "Walker Sports Academy" },
      features: {
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        subscription_cancel: { enabled: true, mode: "at_period_end" },
      },
    });
  }
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
}
