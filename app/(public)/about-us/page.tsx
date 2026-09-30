import { coaches, images } from "@/lib/content";

export const metadata = { title: "About Us" };

export default function AboutPage() {
  return (
    <>
      <section className="bg-ink text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 py-12 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-red-200">About</p>
            <h1 className="mt-2 font-display text-5xl uppercase">Walker Sports Academy</h1>
            <p className="mt-4 text-lg text-white/80">
              Walker Sports Academy is a sports company that provides elite quarterback training, speed & agility training, and sport specific training to the Jacksonville area as well as nationwide.
            </p>
          </div>
          <img src={images.aboutHero} alt="Quarterback training" className="h-64 w-full rounded-2xl object-cover" />
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="font-display text-4xl uppercase">Meet the team</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Our coaches bring unmatched experience to our athletes, having been former professional players and coaches, as well as competitors at the highest levels of college football. Their expertise is second to none, shaped by guidance from some of the greatest minds in football and sports.
        </p>
        <div className="mt-8 space-y-10">
          {coaches.map((coach) => (
            <article key={coach.name} className="grid gap-4 rounded-2xl bg-white p-4 sm:grid-cols-[180px_1fr] sm:p-6">
              <img src={coach.photo} alt={coach.name} className="h-56 w-full rounded-xl object-cover object-top sm:h-full" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{coach.role}</p>
                <h3 className="font-display text-3xl uppercase">{coach.name}</h3>
                <p className="mt-3 text-sm leading-relaxed">{coach.bio}</p>
                {coach.stops ? <p className="mt-3 text-sm font-semibold">Coaching stops: {coach.stops}</p> : null}
                <p className="mt-3 flex gap-4 text-sm font-semibold">
                  <a href={coach.instagram}>Instagram</a>
                  {coach.x ? <a href={coach.x}>X</a> : null}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
