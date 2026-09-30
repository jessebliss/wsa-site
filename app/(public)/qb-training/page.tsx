import Link from "next/link";
import { images } from "@/lib/content";
import { Button } from "@/components/ui/button";

export const metadata = { title: "QB Training" };

const blocks = [
  {
    title: "Intro session",
    image: images.qbThrow,
    alt: "Quarterback throwing",
    copy: "All quarterbacks must go through an introduction session to ensure that the first instruction is one-on-one for a proper evaluation to take place. The session will be filmed on pre and post coaching assessments with video feedback provided. After this, quarterbacks and the parents can schedule more sessions accordingly.",
  },
  {
    title: "Individual",
    image: images.qbDrill,
    alt: "Quarterback drill",
    copy: "Focuses on personalized development to enhance skills and mechanics. Sessions focus on throwing accuracy, arm strength, footwork, and pocket mobility, all tailored to the quarterback’s unique needs and playing style. Quarterbacks receive direct, one-on-one feedback to refine mechanics, improve timing, and increase consistency. This individualized approach ensures maximum attention to detail, promoting confidence, efficiency, and optimal performance on the field.",
  },
  {
    title: "Session details",
    image: images.training,
    alt: "Training session",
    copy: "WSA quarterback training focuses on developing the physical, technical, and mental skills required to excel at the highest level. Training includes enhancing arm strength, throwing accuracy, footwork, and pocket movement, while also improving decision-making, defensive recognition, and game awareness. Through position-specific drills, film study, and cutting-edge techniques, quarterbacks are prepared to perform under pressure and lead their team with confidence and precision.",
  },
  {
    title: "Film sessions",
    image: images.film,
    alt: "Film room",
    copy: "Film room sessions focus on developing mental sharpness, defensive recognition, and game strategy. Quarterbacks analyze opponent defenses, identify coverage schemes, and study tendencies to make quick, informed decisions on the field. Film sessions also emphasize self-evaluation, allowing quarterbacks to refine their mechanics, improve timing, and learn from past performances and raise their football IQ.",
  },
];

export default function QbPage() {
  return (
    <>
      <section className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 md:flex-row md:items-end md:justify-between">
          <div>
            <img src={images.qbLogo} alt="Walker Sports Academy" className="mb-4 h-16 w-auto" />
            <h1 className="font-display text-5xl uppercase">Quarterback training</h1>
            <p className="mt-3 max-w-xl text-white/75">$125 per session, or $425 per month for group quarterback sessions.</p>
          </div>
          <Button asChild size="lg"><Link href="/book-session?program=Quarterback+Training">See the schedule</Link></Button>
        </div>
      </section>
      <section className="mx-auto max-w-6xl space-y-8 px-4 py-12">
        {blocks.map((block) => (
          <article key={block.title} className="grid gap-4 rounded-2xl bg-white p-4 sm:grid-cols-[220px_1fr] sm:p-6">
            <img src={block.image} alt={block.alt} className="h-48 w-full rounded-xl object-cover sm:h-full" />
            <div>
              <h2 className="font-display text-3xl uppercase">{block.title}</h2>
              <p className="mt-3 text-sm leading-relaxed">{block.copy}</p>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
