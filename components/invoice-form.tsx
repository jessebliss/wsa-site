"use client";

import { useState } from "react";
import { createInvoice } from "@/app/admin/(panel)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { centsToDollarInput } from "@/lib/money";

export type InvoiceActivity = {
  value: string;
  label: string;
  group: string;
  amountCents: number | null;
};

type PayMethod = "stripe" | "venmo" | "zelle";

export function InvoiceForm({
  activities,
  fees,
}: {
  activities: InvoiceActivity[];
  fees: {
    registrationFixed: string;
    registrationPercent: string;
    taxFixed: string;
    taxPercent: string;
  };
}) {
  const [activity, setActivity] = useState("misc");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PayMethod>("stripe");

  function chooseActivity(value: string) {
    setActivity(value);
    const found = activities.find((item) => item.value === value);
    if (found?.amountCents != null) setAmount(centsToDollarInput(found.amountCents));
  }

  const groups = ["Trainings", "Plans", "Sessions"];

  return (
    <form action={createInvoice} className="mt-4 grid gap-4 rounded-2xl bg-white p-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="paymentMethod">How it is paid</Label>
        <select
          id="paymentMethod"
          name="paymentMethod"
          value={method}
          onChange={(event) => setMethod(event.target.value as PayMethod)}
          className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3"
        >
          <option value="stripe">Stripe</option>
          <option value="venmo">Venmo</option>
          <option value="zelle">Zelle</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="activity">Activity</Label>
        <select
          id="activity"
          name="activity"
          required
          value={activity}
          onChange={(event) => chooseActivity(event.target.value)}
          className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3"
        >
          <option value="misc">Miscellaneous</option>
          {groups.map((group) => {
            const items = activities.filter((item) => item.group === group);
            if (items.length === 0) return null;
            return (
              <optgroup key={group} label={group}>
                {items.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </div>
      <div>
        <Label htmlFor="amount">Amount (USD)</Label>
        <Input className="mt-1" id="amount" name="amount" inputMode="decimal" required value={amount} onChange={(event) => setAmount(event.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <p className="text-sm text-muted-foreground">
          Fees start from the current checkout settings. Changing them here applies to this invoice only.
        </p>
      </div>
      <div>
        <Label htmlFor="registrationFixed">Registration fee (USD)</Label>
        <Input className="mt-1" id="registrationFixed" name="registrationFixed" inputMode="decimal" defaultValue={fees.registrationFixed} />
      </div>
      <div>
        <Label htmlFor="registrationPercent">Registration percent</Label>
        <Input className="mt-1" id="registrationPercent" name="registrationPercent" inputMode="decimal" defaultValue={fees.registrationPercent} />
      </div>
      <div>
        <Label htmlFor="taxFixed">Tax (USD)</Label>
        <Input className="mt-1" id="taxFixed" name="taxFixed" inputMode="decimal" defaultValue={fees.taxFixed} />
      </div>
      <div>
        <Label htmlFor="taxPercent">Tax percent</Label>
        <Input className="mt-1" id="taxPercent" name="taxPercent" inputMode="decimal" defaultValue={fees.taxPercent} />
      </div>
      <div>
        <Label htmlFor="invoiceParentName">Parent name</Label>
        <Input className="mt-1" id="invoiceParentName" name="parentName" required autoComplete="name" />
      </div>
      <div>
        <Label htmlFor="invoicePlayerName">Player name</Label>
        <Input className="mt-1" id="invoicePlayerName" name="playerName" required />
      </div>
      <div>
        <Label htmlFor="invoiceEmail">Email</Label>
        <Input className="mt-1" id="invoiceEmail" name="email" type="email" required autoComplete="off" />
      </div>
      <div>
        <Label htmlFor="invoicePhone">Phone</Label>
        <Input className="mt-1" id="invoicePhone" name="phone" type="tel" inputMode="tel" required autoComplete="off" />
      </div>
      {method === "venmo" ? (
        <div className="sm:col-span-2">
          <Label htmlFor="venmoHandle">Venmo handle</Label>
          <Input className="mt-1" id="venmoHandle" name="venmoHandle" placeholder="@username" autoComplete="off" />
          <p className="mt-1 text-sm text-muted-foreground">Leave this blank to save the invoice without a Venmo code.</p>
        </div>
      ) : null}
      {method === "zelle" ? (
        <div className="sm:col-span-2">
          <Label htmlFor="zelleRecipient">Zelle recipient</Label>
          <Input className="mt-1" id="zelleRecipient" name="zelleRecipient" required placeholder="Name, email, or phone" autoComplete="off" />
        </div>
      ) : null}
      <div className="sm:col-span-2">
        <Button type="submit">{method === "stripe" ? "Send invoice" : "Save invoice"}</Button>
      </div>
    </form>
  );
}
