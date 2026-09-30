import Link from "next/link";
import { images } from "@/lib/content";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Speed & Agility" };

export default function SpeedPage() {
  return (
    <>
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <img src={images.speedMark} alt="" className="mb-4 h-16 w-auto" />
          <h1 className="font-display text-5xl uppercase">Speed & agility</h1>
          <p className="mt-4 max-w-3xl text-lg text-white/80">
            Our training program is designed using a scientific approach tailored to each athlete&apos;s sport and position. This ensures that the techniques and training our athletes receive are effective, safe, and grounded in the latest research. By following this evidence-based methodology, our athletes can trust that they are gaining the proper proactive and reactive knowledge, along with refined movement patterns, to perform at their best both on and off their respective playing surfaces.
          </p>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-12 md:grid-cols-2">
        <article className="rounded-2xl bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Per session</p>
          <p className="font-display text-5xl">$40</p>
          <p className="mt-2">Drop in any session.</p>
          <Button asChild className="mt-4"><Link href="/book-session?program=Speed+%26+Agility">Book a drop-in</Link></Button>
        </article>
        <article className="rounded-2xl bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Monthly</p>
          <p className="font-display text-5xl">$275</p>
          <p className="mt-2">Twice a week. Eight group speed sessions each month.</p>
          <Button asChild className="mt-4" variant="ink"><Link href="/book-session#plans">See monthly plans</Link></Button>
        </article>
        <img src={images.speed1} alt="Speed training" className="h-64 w-full rounded-2xl object-cover" />
        <img src={images.speed2} alt="Agility training" className="h-64 w-full rounded-2xl object-cover" />
      </section>
    </>
  );
}
