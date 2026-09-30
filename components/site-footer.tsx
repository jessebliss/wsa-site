import Link from "next/link";
import { ACADEMY_EMAIL, ACADEMY_PHONE, ACADEMY_PHONE_TEL } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/about-us", label: "About Us" },
  { href: "/qb-training", label: "QB Training" },
  { href: "/speed-agility", label: "Speed & Agility" },
  { href: "/book-session", label: "Book Session" },
  { href: "/alumni", label: "Alumni" },
  { href: "/#contact", label: "Contact" },
];

export function SiteFooter() {
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="font-display text-2xl uppercase">Walker Sports Academy</p>
          <p className="mt-3 text-sm text-white/70">
            <a className="hover:text-white" href={`mailto:${ACADEMY_EMAIL}`}>{ACADEMY_EMAIL}</a>
          </p>
          <p className="text-sm text-white/70">
            <a className="hover:text-white" href={`tel:${ACADEMY_PHONE_TEL}`}>{ACADEMY_PHONE}</a>
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">Menu</p>
          <ul className="mt-3 space-y-2 text-sm">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-red-300">{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">Socials</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a className="hover:text-red-300" href="https://www.instagram.com/walkersportsacademy/">Instagram</a></li>
            <li><a className="hover:text-red-300" href="https://x.com/walkersports904">X</a></li>
          </ul>
        </div>
      </div>
      <p className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/50">
        © {new Date().getFullYear()} Walker Sports Academy. Jacksonville, Florida.
      </p>
    </footer>
  );
}
