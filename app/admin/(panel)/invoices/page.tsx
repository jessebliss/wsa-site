import { redirect } from "next/navigation";

export default async function InvoicesRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const single = Array.isArray(value) ? value[0] : value;
    if (single) query.set(key, single);
  }
  const qs = query.toString();
  redirect(qs ? `/admin/billing?${qs}` : "/admin/billing");
}
