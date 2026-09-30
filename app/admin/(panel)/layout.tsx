import Link from "next/link";
import { logout } from "@/app/admin/(panel)/actions";

const links = [
  ["Overview", "/admin"],
  ["Schedule", "/admin/schedule"],
  ["Plans", "/admin/plans"],
  ["Subscriptions", "/admin/subscriptions"],
  ["Participants", "/admin/participants"],
  ["Promo codes", "/admin/promos"],
  ["Waiver", "/admin/waiver"],
  ["Messages", "/admin/contacts"],
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <p className="font-display text-xl uppercase">WSA admin</p>
          <form action={logout}>
            <button className="text-sm font-semibold" type="submit">Log out</button>
          </form>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3" aria-label="Admin">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="shrink-0 rounded-full bg-white/10 px-3 py-2 text-sm font-semibold">
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </div>
  );
}
