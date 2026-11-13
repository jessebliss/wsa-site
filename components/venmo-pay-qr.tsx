import QRCode from "qrcode";
import { venmoPayUrl } from "@/lib/invoices";

export async function VenmoPayQr({
  handle,
  totalCents,
  number,
}: {
  handle: string;
  totalCents: number;
  number: number;
}) {
  const url = venmoPayUrl(handle, totalCents, number);
  const src = await QRCode.toDataURL(url, { width: 280, margin: 1, errorCorrectionLevel: "M" });
  return (
    <figure className="mt-2">
      {/* QR codes are generated images. next/image does not accept this data URL. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={`Venmo code for invoice ${number}`} width={112} height={112} className="h-28 w-28 bg-white" />
      <figcaption className="mt-1 break-all text-xs">
        <a className="font-semibold text-primary" href={url}>Venmo pay link</a>
      </figcaption>
    </figure>
  );
}
