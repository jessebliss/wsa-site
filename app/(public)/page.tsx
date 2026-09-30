import Link from "next/link";
import { images } from "@/lib/content";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Home" };

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-ink text-white">
        <img src={images.training} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-200">Jacksonville, Florida</p>
          <h1 className="mt-3 max-w-xl font-display text-5xl uppercase leading-none sm:text-7xl">
            Welcome to Walker Sports Academy
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/85">
            Quarterback training and speed & agility for athletes in Jacksonville and nationwide.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg"><Link href="/book-session">Book a session</Link></Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10">
              <Link href="/about-us">Meet the coaches</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-12 md:grid-cols-3">
        <article className="rounded-2xl bg-white p-5">
          <img src={images.qbPoster} alt="Walker Sports Academy quarterback poster" className="mb-4 h-40 w-full rounded-xl object-cover" />
          <h2 className="font-display text-3xl uppercase">Quarterback training</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Our quarterback training focuses on developing the physical, technical, and mental skills required to excel at the highest level.
          </p>
          <Link href="/qb-training" className="mt-4 inline-block text-sm font-semibold text-primary">More info</Link>
        </article>
        <article className="rounded-2xl bg-white p-5">
          <img src={images.ryan} alt="Coach Ryan Walker" className="mb-4 h-40 w-full rounded-xl object-cover object-top" />
          <h2 className="font-display text-3xl uppercase">About our coaches</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Meet and learn more about our coaches that bring a wide pool of knowledge and experience from the professional and college ranks.
          </p>
          <Link href="/about-us" className="mt-4 inline-block text-sm font-semibold text-primary">More info</Link>
        </article>
        <article className="rounded-2xl bg-white p-5">
          <img src={images.speed1} alt="Speed and agility training" className="mb-4 h-40 w-full rounded-xl object-cover" />
          <h2 className="font-display text-3xl uppercase">Speed & agility training</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Our training program is designed using a scientific approach tailored to each athlete&apos;s sport and position.
          </p>
          <Link href="/speed-agility" className="mt-4 inline-block text-sm font-semibold text-primary">More info</Link>
        </article>
      </section>

      <section className="bg-ink text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 py-12 md:grid-cols-[180px_1fr]">
          <img src={images.mac} alt="Mac Jones" className="h-44 w-44 rounded-full object-cover" />
          <figure>
            <blockquote className="font-display text-2xl uppercase leading-tight sm:text-3xl">
              “Ryan has been a great coach, mentor, and friend over the years. His coaching on the field and in the film room is unmatched and appreciated every time.”
            </blockquote>
            <figcaption className="mt-3 text-sm text-white/70">Mac Jones / NFL quarterback — 49ers</figcaption>
          </figure>
        </div>
      </section>
    </>
  );
}
