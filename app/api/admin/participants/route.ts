import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { formatEtLong } from "@/lib/time";

export const dynamic = "force-dynamic";

function cell(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase();
  const registrations = await prisma.registration.findMany({
    where: email ? { email } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      session: true,
      waiverAcceptance: true,
      subscription: { include: { plan: true } },
    },
  });
  const subscriptions = await prisma.subscription.findMany({
    where: email ? { email } : undefined,
    orderBy: { createdAt: "desc" },
    include: { plan: true, waiverAcceptance: true },
  });

  const header = [
    "Type",
    "Created",
    "Parent",
    "Email",
    "Phone",
    "Player",
    "Name",
    "When (ET)",
    "Amount",
    "Payment status",
    "Waiver accepted",
    "Waiver text",
    "Attended",
  ];
  const rows = [
    header.join(","),
    ...registrations.map((row) =>
      [
        row.kind === "PLAN_CREDIT" ? "Included time" : "Drop-in",
        row.createdAt.toISOString(),
        row.parentName,
        row.email,
        row.phone,
        row.playerName,
        row.session?.title ?? "QB Introduction Session",
        row.session ? formatEtLong(row.session.startsAt) : "Not scheduled",
        formatMoney(row.amountCents),
        row.paymentStatus,
        row.waiverAcceptance.acceptedAt.toISOString(),
        row.waiverAcceptance.waiverText,
        row.attended == null ? "" : row.attended ? "yes" : "no",
      ]
        .map(cell)
        .join(","),
    ),
    ...subscriptions.map((row) =>
      [
        "Monthly session",
        row.createdAt.toISOString(),
        row.parentName,
        row.email,
        row.phone,
        row.playerName,
        row.plan?.name || row.planName || "Deleted session",
        row.currentPeriodEnd ? formatEtLong(row.currentPeriodEnd) : "",
        formatMoney(row.priceCents),
        row.status,
        row.waiverAcceptance?.acceptedAt.toISOString() ?? "",
        row.waiverAcceptance?.waiverText ?? "",
        "",
      ]
        .map(cell)
        .join(","),
    ),
  ];

  return new NextResponse(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=wsa-participants.csv",
    },
  });
}
