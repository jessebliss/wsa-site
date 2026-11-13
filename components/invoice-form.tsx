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

  function chooseActivity(value: string) {
    setActivity(value);
    const found = activities.find((item) => item.value === value);
    if (found?.amountCents != null) setAmount(centsToDollarInput(found.amountCents));
  }

  const groups = ["Trainings", "Plans", "Sessions"];

  return (
    <form action={createInvoice} className="mt-4 grid gap-4 rounded-2xl bg-white p-4 sm:grid-cols-2">
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
      <div>
        <Label htmlFor="paymentMethod">How it is paid</Label>
        <select id="paymentMethod" name="paymentMethod" defaultValue="stripe" className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3">
          <option value="stripe">Stripe</option>
          <option value="venmo">Venmo</option>
        </select>
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
        <Label htmlFor="parentName">Parent name</Label>
        <Input className="mt-1" id="parentName" name="parentName" required autoComplete="name" />
      </div>
      <div>
        <Label htmlFor="playerName">Player name</Label>
        <Input className="mt-1" id="playerName" name="playerName" required />
      </div>
      <div>
        <Label htmlFor="invoiceEmail">Email</Label>
        <Input className="mt-1" id="invoiceEmail" name="email" type="email" required autoComplete="off" />
      </div>
      <div>
        <Label htmlFor="invoicePhone">Phone</Label>
        <Input className="mt-1" id="invoicePhone" name="phone" type="tel" inputMode="tel" required autoComplete="off" />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit">Send invoice</Button>
      </div>
    </form>
  );
}
