import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:41731").replace(/\/$/, "");
}

export const PARK =
  "Chuck Rogers Park, 11950 San Jose Boulevard, Jacksonville, FL 32223";

export const CAMP_LOCATION = "7510 Baymeadows Way, Jacksonville, FL 32256";

export const ACADEMY_EMAIL = "media.walkersports@gmail.com";
export const ALUMNI_EMAIL = "info.walkersports@gmail.com";
export const ACADEMY_PHONE = "727-744-6880";
export const ACADEMY_PHONE_TEL = "+17277446880";
