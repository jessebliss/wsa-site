import { disablePromo, savePromo } from "@/app/admin/(panel)/actions";
import { AdminError } from "@/components/admin-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Promo codes" };

export default async function PromosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const promos = await prisma.promoCode.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div>
      <h1 className="font-display text-4xl uppercase">Promo codes</h1>
      <p className="mt-2 text-sm text-muted-foreground">One-time bookings only: camps, group drop-ins, and private lessons. Memberships are not discounted.</p>
      <AdminError message={params.error} />
      <form action={savePromo} className="mt-4 grid gap-3 rounded-2xl bg-white p-4">
        <div>
          <Label htmlFor="code">Code</Label>
          <Input className="mt-1 uppercase" id="code" name="code" required />
        </div>
        <div>
          <Label htmlFor="discountKind">Discount</Label>
          <select id="discountKind" name="discountKind" className="mt-1 h-11 w-full rounded-md border border-border px-3">
            <option value="percent">Percent off</option>
            <option value="amount">Dollars off</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="percent">Percent</Label>
            <Input className="mt-1" id="percent" name="percent" type="number" min={1} max={100} />
          </div>
          <div>
            <Label htmlFor="amount">Dollars</Label>
            <Input className="mt-1" id="amount" name="amount" />
          </div>
        </div>
        <Button type="submit">Create code</Button>
      </form>
      <ul className="mt-6 space-y-2">
        {promos.map((promo) => (
          <li key={promo.id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 text-sm">
            <div>
              <p className="font-semibold">{promo.code}</p>
              <p>{promo.percentOff ? `${promo.percentOff}% off` : formatMoney(promo.amountOffCents ?? 0)} off · {promo.active ? "Active" : "Off"}</p>
            </div>
            {promo.active ? (
              <form action={disablePromo}>
                <input type="hidden" name="id" value={promo.id} />
                <Button type="submit" variant="outline" size="sm">Turn off</Button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
