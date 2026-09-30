import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20">
      <h1 className="font-display text-5xl uppercase">Page not found</h1>
      <p className="mt-3">That page is not on the Walker Sports Academy site.</p>
      <Link href="/" className="mt-6 inline-block font-semibold text-primary">Go home</Link>
    </div>
  );
}
