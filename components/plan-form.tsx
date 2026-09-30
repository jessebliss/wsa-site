"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/money";

export function PlanForm({
  planId,
  priceCents,
  waiver,
}: {
  planId: string;
  priceCents: number;
  waiver: string;
}) {
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/checkout/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId,
        parentName: data.get("parentName"),
        email: data.get("email"),
        phone: data.get("phone"),
        playerName: data.get("playerName"),
        acceptWaiver: accepted,
      }),
    });
    const body = (await response.json()) as { error?: string; redirect?: string };
    if (!response.ok || !body.redirect) {
      setPending(false);
      setError(body.error ?? "Could not start the plan.");
      return;
    }
    window.location.href = body.redirect;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-xl bg-ink px-4 py-3 text-white">
        <p className="text-xs uppercase tracking-[0.16em] text-white/60">Monthly</p>
        <p className="font-display text-4xl">{formatMoney(priceCents)}</p>
        <p className="text-sm text-white/80">Promo codes do not apply to memberships.</p>
      </div>
      <div>
        <Label htmlFor="parentName">Parent name</Label>
        <Input className="mt-1" id="parentName" name="parentName" required />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input className="mt-1" id="email" name="email" type="email" required />
        <p className="mt-1 text-xs text-muted-foreground">This email is how group bookings find the plan. There is no password.</p>
      </div>
      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input className="mt-1" id="phone" name="phone" type="tel" inputMode="tel" required />
      </div>
      <div>
        <Label htmlFor="playerName">Player name</Label>
        <Input className="mt-1" id="playerName" name="playerName" required />
      </div>
      <div className="rounded-xl border border-border bg-muted/60 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide">Waiver</p>
        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-sans text-sm leading-relaxed">{waiver}</pre>
        <label className="mt-3 flex items-start gap-3 text-sm font-semibold">
          <Checkbox checked={accepted} onCheckedChange={(value) => setAccepted(value === true)} />
          <span>I accept this waiver before payment.</span>
        </label>
      </div>
      {error ? <p className="text-sm font-semibold text-primary" role="alert">{error}</p> : null}
      <Button type="submit" size="lg" className="sticky bottom-3 w-full" disabled={pending}>
        {pending ? "Working…" : "Continue to pay"}
      </Button>
    </form>
  );
}
