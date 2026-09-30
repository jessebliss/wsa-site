import Link from "next/link";
import { images } from "@/lib/content";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-ink text-white">
      <div className="mx-auto flex max-w-6xl items-center px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <img src={images.logo} alt="Walker Sports Academy" className="h-12 w-auto" />
        </Link>
      </div>
    </header>
  );
}
