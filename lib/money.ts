export function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function dollarsToCents(value: string) {
  const cents = optionalDollarsToCents(value);
  if (cents <= 0) throw new Error("Price has to be more than zero.");
  return cents;
}

export function optionalDollarsToCents(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new Error("Enter a price in dollars, like 0, 5, or 12.50.");
  }
  return Math.round(Number(trimmed) * 100);
}

export function centsToDollarInput(cents: number) {
  return (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
}
