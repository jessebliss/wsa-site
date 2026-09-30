import { alumniAlso, alumniPhotos } from "@/lib/content";
import { ALUMNI_EMAIL, ACADEMY_PHONE, ACADEMY_PHONE_TEL } from "@/lib/utils";

export const metadata = { title: "Alumni" };

export default function AlumniPage() {
  return (
    <>
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h1 className="font-display text-5xl uppercase">Alumni</h1>
          <p className="mt-4 max-w-3xl text-lg text-white/80">
            Coach Ryan Walker has had the pleasure of working with and developing the following quarterbacks over the years. This number only continues to grow as every year more and more of his players start to ascend to the next level while seeing significant playing time and reaching new heights with their respective teams.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="font-display text-3xl uppercase">Not listed below</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {alumniAlso.map((name) => (
            <li key={name} className="rounded-lg bg-white px-3 py-2 text-sm font-semibold">{name}</li>
          ))}
        </ul>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {alumniPhotos.map((src) => (
            <img key={src} src={src} alt="Alumni quarterback" className="aspect-[3/4] w-full rounded-xl object-cover" />
          ))}
        </div>
        <div className="mt-10 rounded-2xl bg-white p-6">
          <h2 className="font-display text-4xl uppercase">Who&apos;s next?</h2>
          <p className="mt-2">Become the next great one to develop and reach your dreams and goals.</p>
          <p className="mt-4 text-sm font-semibold">
            <a href={`mailto:${ALUMNI_EMAIL}`}>{ALUMNI_EMAIL}</a>
            <br />
            <a href={`tel:${ACADEMY_PHONE_TEL}`}>{ACADEMY_PHONE}</a>
          </p>
        </div>
      </section>
    </>
  );
}
