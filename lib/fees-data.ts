import { EMPTY_FEES, type FeeSettings } from "@/lib/fees";
import { prisma } from "@/lib/prisma";

export async function loadCheckoutFees(): Promise<FeeSettings> {
  const row = await prisma.checkoutFee.findUnique({ where: { id: "site" } });
  if (!row) return EMPTY_FEES;
  return {
    registrationFixedCents: row.registrationFixedCents,
    registrationBps: row.registrationBps,
    taxFixedCents: row.taxFixedCents,
    taxBps: row.taxBps,
  };
}
