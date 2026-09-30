import Link from "next/link";
import { expireRegistration } from "@/lib/booking";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout canceled" };

export default async function CancelPage({
  searchParams,
}: {
  searchParams: Promise<{ registration?: string }>;
}) {
  const { registration } = await searchParams;
  if (registration) await expireRegistration(registration);

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="font-display text-5xl uppercase">Checkout canceled</h1>
      <p className="mt-3">No charge was completed. The spot was released so you can try again.</p>
      <Link href="/" className="mt-6 inline-block text-sm font-semibold text-primary">Back to the schedule</Link>
    </div>
  );
}
