import Link from "next/link";
import { markSessionPaid, upsertFromStripeSubscription } from "@/lib/billing";
import { stripeConfigured, getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payment" };

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  let detail = "If the payment went through, a receipt will be emailed. Your spot is confirmed when the payment finishes.";
  if (sessionId && stripeConfigured()) {
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.mode === "payment" && session.payment_status === "paid") {
        await markSessionPaid(session);
        detail = "Payment received. A receipt is on the way if email is configured, and the spot is confirmed.";
      } else if (session.mode === "subscription" && session.status === "complete") {
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await upsertFromStripeSubscription(sub, { ...sub.metadata, ...session.metadata });
        }
        detail = "Membership started. The receipt includes a Stripe link to update the card or cancel. Group bookings use the same email.";
      }
    } catch {
      detail = "We could not read the Stripe payment yet. If you were charged, the receipt email will confirm it.";
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="font-display text-5xl uppercase">Payment</h1>
      <p className="mt-3">{detail}</p>
      <Link href="/book-session" className="mt-6 inline-block text-sm font-semibold text-primary">Back to the schedule</Link>
    </div>
  );
}
