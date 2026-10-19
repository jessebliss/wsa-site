export type FeeSettings = {
  registrationFixedCents: number;
  registrationBps: number;
  taxFixedCents: number;
  taxBps: number;
};

export type ChargeLines = {
  sessionCents: number;
  registrationCents: number;
  taxCents: number;
  totalCents: number;
};

export const EMPTY_FEES: FeeSettings = {
  registrationFixedCents: 0,
  registrationBps: 0,
  taxFixedCents: 0,
  taxBps: 0,
};

/** Promo is already applied to sessionCents. Zero or unset fees add nothing. */
export function chargeLines(sessionCents: number, fees: FeeSettings | null | undefined): ChargeLines {
  const price = Math.max(0, sessionCents);
  const registrationFixed = Math.max(0, fees?.registrationFixedCents ?? 0);
  const registrationBps = Math.max(0, fees?.registrationBps ?? 0);
  const taxFixed = Math.max(0, fees?.taxFixedCents ?? 0);
  const taxBps = Math.max(0, fees?.taxBps ?? 0);
  const registrationCents =
    registrationFixed === 0 && registrationBps === 0
      ? 0
      : registrationFixed + Math.round((price * registrationBps) / 10000);
  const taxCents =
    taxFixed === 0 && taxBps === 0 ? 0 : taxFixed + Math.round(((price + registrationCents) * taxBps) / 10000);
  return {
    sessionCents: price,
    registrationCents,
    taxCents,
    totalCents: price + registrationCents + taxCents,
  };
}

export function checkoutLineItems(charge: ChargeLines) {
  const lines: { label: string; cents: number }[] = [{ label: "Session", cents: charge.sessionCents }];
  if (charge.registrationCents > 0) lines.push({ label: "Registration", cents: charge.registrationCents });
  if (charge.taxCents > 0) lines.push({ label: "Tax", cents: charge.taxCents });
  return lines;
}

export function bpsToPercentInput(bps: number) {
  if (!bps) return "";
  const percent = bps / 100;
  return Number.isInteger(percent) ? String(percent) : percent.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function percentToBps(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) throw new Error("Enter a percent like 7 or 7.5.");
  const bps = Math.round(Number(trimmed) * 100);
  if (bps > 10000) throw new Error("Percent has to be from 0 to 100.");
  return bps;
}
