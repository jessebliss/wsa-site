import QRCode from "qrcode";
import { privateBookingPath } from "@/lib/site-origin";

export async function CoachQrCard({ coach, origin }: { coach: string; origin: string }) {
  const url = `${origin}${privateBookingPath(coach)}`;
  const src = await QRCode.toDataURL(url, { width: 360, margin: 1, errorCorrectionLevel: "M" });
  return (
    <figure className="rounded-2xl bg-white p-4">
      {/* QR codes are generated images. next/image does not accept this data URL. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={`QR code for ${coach}`} width={180} height={180} className="h-44 w-44 bg-white" />
      <figcaption className="mt-3 font-semibold">{coach}</figcaption>
      <p className="mt-1 break-all text-xs text-muted-foreground">{url}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Scan this to book a private quarterback lesson. The calendar opens with this coach already selected.
      </p>
    </figure>
  );
}
