import { Resend } from "resend";

export async function sendReceipt(to: string, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RECEIPT_FROM_EMAIL;
  if (!key || !from) {
    console.info("Receipt not sent. RESEND_API_KEY or RECEIPT_FROM_EMAIL is unset.");
    return;
  }
  const resend = new Resend(key);
  const result = await resend.emails.send({ from, to, subject, text });
  if (result.error) {
    console.error("Resend receipt failed", result.error);
  }
}
