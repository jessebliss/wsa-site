"use client";

import { useState } from "react";
import { reviewInvoice } from "@/app/admin/(panel)/actions";
import { Button } from "@/components/ui/button";

export type ReviewSlot = { id: string; label: string };

const REVIEW_LABEL = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  PROPOSED: "New time proposed",
} as const;

export function TransactionReview({
  invoiceId,
  number,
  parentName,
  playerName,
  reviewStatus,
  proposal,
  slots,
}: {
  invoiceId: string;
  number: number;
  parentName: string;
  playerName: string;
  reviewStatus: keyof typeof REVIEW_LABEL | null;
  proposal: string | null;
  slots: ReviewSlot[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-black/10 px-5 py-4">
      <p className="text-sm font-semibold">
        Invoice {number} · {parentName} · {playerName}
      </p>
      <p className="text-sm text-muted-foreground">
        {reviewStatus ? REVIEW_LABEL[reviewStatus] : "Not reviewed"}
        {proposal ? ` · ${proposal}` : ""}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <form action={reviewInvoice}>
          <input type="hidden" name="id" value={invoiceId} />
          <input type="hidden" name="decision" value="accept" />
          <Button type="submit" size="sm">Accept</Button>
        </form>
        <form action={reviewInvoice}>
          <input type="hidden" name="id" value={invoiceId} />
          <input type="hidden" name="decision" value="decline" />
          <Button type="submit" size="sm" variant="outline">Decline</Button>
        </form>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen((value) => !value)}>
          Propose a new time
        </Button>
      </div>
      {open ? (
        <form action={reviewInvoice} className="mt-3 grid gap-2">
          <input type="hidden" name="id" value={invoiceId} />
          <input type="hidden" name="decision" value="propose" />
          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No other times are on the calendar.</p>
          ) : (
            <>
              <label className="text-sm font-semibold" htmlFor={`slot-${invoiceId}`}>Another time</label>
              <select id={`slot-${invoiceId}`} name="slotId" required className="h-11 rounded-md border border-border bg-white px-3" defaultValue="">
                <option value="" disabled>Choose a time</option>
                {slots.map((slot) => (
                  <option key={slot.id} value={slot.id}>{slot.label}</option>
                ))}
              </select>
              <Button type="submit" size="sm">Save proposal</Button>
            </>
          )}
        </form>
      ) : null}
    </div>
  );
}
