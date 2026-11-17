import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { formatEt } from "@/lib/time";

export type TransactionRow = {
  id: string;
  number: number;
  program: string;
  parentName: string;
  playerName: string;
  paid: boolean;
  amount: string;
  confirmed: string;
  charge: string;
  bookedDay: string | null;
  sessionId: string | null;
  proposal: string | null;
};

function confirmedAt(paid: boolean, paidAt: Date | null) {
  if (!paid || !paidAt) return "";
  return `${formatEt(paidAt, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })} ET`;
}

export function transactionProposal(invoice: { proposedDay: string | null; proposedTime: string | null }) {
  if (!invoice.proposedDay || !invoice.proposedTime) return null;
  return `${invoice.proposedDay} at ${invoice.proposedTime}`;
}

export function toTransactionRow(invoice: {
  id: string;
  number: number;
  program: string | null;
  activity: string;
  customerName: string;
  playerName: string;
  status: "OPEN" | "PAID";
  totalCents: number;
  paidAt: Date | null;
  subscription: boolean;
  bookedDay: string | null;
  sessionId: string | null;
  proposedDay: string | null;
  proposedTime: string | null;
}): TransactionRow {
  const paid = invoice.status === "PAID";
  return {
    id: invoice.id,
    number: invoice.number,
    program: invoice.program?.trim() || invoice.activity,
    parentName: invoice.customerName,
    playerName: invoice.playerName,
    paid,
    amount: formatMoney(invoice.totalCents),
    confirmed: confirmedAt(paid, invoice.paidAt),
    charge: invoice.subscription ? "Subscription" : "One-time",
    bookedDay: invoice.bookedDay,
    sessionId: invoice.sessionId,
    proposal: transactionProposal(invoice),
  };
}

export function TransactionRows({ invoices }: { invoices: TransactionRow[] }) {
  return (
    <div className="mt-4">
      {invoices.length === 0 ? <p className="text-sm text-muted-foreground">No transactions yet.</p> : null}
      <ul className="space-y-2">
        {invoices.map((row, index) => (
          <li key={row.id} className={`rounded-xl p-3 ${index % 2 === 0 ? "bg-white" : "bg-muted"}`}>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm md:grid-cols-4 xl:grid-cols-8">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invoice</dt>
                <dd className="font-semibold">{row.number}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Program</dt>
                <dd>{row.program}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parent</dt>
                <dd>{row.parentName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Player</dt>
                <dd>{row.playerName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paid</dt>
                <dd>{row.paid ? "Paid" : "Unpaid"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amount</dt>
                <dd>{row.amount}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Confirmed</dt>
                <dd>{row.confirmed}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Charge</dt>
                <dd>{row.charge}</dd>
              </div>
            </dl>
            {row.bookedDay && row.sessionId ? (
              <Link
                href={`/admin/schedule?day=${encodeURIComponent(row.bookedDay)}&event=${encodeURIComponent(row.sessionId)}`}
                className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary"
              >
                Open this day on the calendar
              </Link>
            ) : null}
            {row.proposal ? <p className="mt-1 text-sm text-muted-foreground">Proposed {row.proposal}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
