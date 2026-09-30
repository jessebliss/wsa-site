"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { images } from "@/lib/content";
import { ACADEMY_PHONE, ACADEMY_PHONE_TEL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const links = [
  { href: "/", label: "Home" },
  { href: "/about-us", label: "About Us" },
  { href: "/qb-training", label: "QB Training" },
  { href: "/speed-agility", label: "Speed & Agility" },
  { href: "/book-session", label: "Book Session" },
  { href: "/alumni", label: "Alumni" },
  { href: "/#contact", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 bg-ink text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <img src={images.logo} alt="Walker Sports Academy" className="h-12 w-auto" />
        </Link>
        <nav className="hidden items-center gap-5 lg:flex" aria-label="Primary">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-semibold uppercase tracking-wide hover:text-red-300">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/book-session">Book</Link>
          </Button>
          <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu />
              </Button>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined}>
              <DialogTitle>Menu</DialogTitle>
              <nav className="mt-8 flex flex-col gap-1" aria-label="Mobile">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-md px-2 py-3 text-lg font-semibold uppercase tracking-wide hover:bg-white/10"
                  >
                    {link.label}
                  </Link>
                ))}
                <a href={`tel:${ACADEMY_PHONE_TEL}`} className="mt-4 px-2 text-sm text-white/70">
                  {ACADEMY_PHONE}
                </a>
              </nav>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
