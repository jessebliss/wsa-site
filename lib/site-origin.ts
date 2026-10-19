import { headers } from "next/headers";
import { appUrl } from "@/lib/utils";

export async function publicOrigin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) return appUrl();
  const proto = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export function privateBookingPath(coach: string) {
  const params = new URLSearchParams({ training: "quarterback", coach });
  return `/?${params.toString()}`;
}
