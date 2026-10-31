import { saveCheckoutFees } from "@/app/admin/(panel)/actions";
import { AdminError } from "@/components/admin-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bpsToPercentInput } from "@/lib/fees";
import { loadCheckoutFees } from "@/lib/fees-data";
import { centsToDollarInput } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fees" };

export default async function FeesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const params = await searchParams;
  const fees = await loadCheckoutFees();

  return (
    <div>
      <h1 className="font-display text-4xl uppercase">Fees</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Registration and tax are added at checkout on one-time payments. A promo lowers the session price first. Registration is a fixed amount plus a percent of that price. Tax is a fixed amount plus a percent of the price and registration together. Memberships are not changed. Leave a field blank or at zero to skip it.
      </p>
      <AdminError message={params.error} />
      {params.saved === "1" ? <p className="mt-3 text-sm font-semibold text-primary">Saved.</p> : null}
      <form action={saveCheckoutFees} className="mt-4 grid gap-4 rounded-2xl bg-white p-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="registrationFixed">Registration fee (USD)</Label>
          <Input className="mt-1" id="registrationFixed" name="registrationFixed" inputMode="decimal" defaultValue={centsToDollarInput(fees.registrationFixedCents)} />
        </div>
        <div>
          <Label htmlFor="registrationPercent">Registration percent</Label>
          <Input className="mt-1" id="registrationPercent" name="registrationPercent" inputMode="decimal" placeholder="0" defaultValue={bpsToPercentInput(fees.registrationBps)} />
        </div>
        <div>
          <Label htmlFor="taxFixed">Tax (USD)</Label>
          <Input className="mt-1" id="taxFixed" name="taxFixed" inputMode="decimal" defaultValue={centsToDollarInput(fees.taxFixedCents)} />
        </div>
        <div>
          <Label htmlFor="taxPercent">Tax percent</Label>
          <Input className="mt-1" id="taxPercent" name="taxPercent" inputMode="decimal" placeholder="0" defaultValue={bpsToPercentInput(fees.taxBps)} />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit">Save fees</Button>
        </div>
      </form>
    </div>
  );
}
