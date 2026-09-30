import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contactSchema, zodMessage } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter the contact fields and try again." }, { status: 400 });
  }
  const parsed = contactSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) }, { status: 400 });
  }
  const data = parsed.data;
  await prisma.contactMessage.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      subject: data.subject ? data.subject : null,
      message: data.message,
      phone: data.phone,
    },
  });
  return NextResponse.json({
    ok: true,
    message: "Message sent. The academy will get back to you.",
  });
}
