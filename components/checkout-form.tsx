"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/money";

export type CheckoutLine = { label: string; cents: number };

const GRADES = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "College"];

export function CheckoutForm({
  sessionId,
  priceCents,
  lines,
  waiver,
  allowPromo,
  intake = "session",
  coachName = "",
  flagRole = "",
  flagCoach = "",
}: {
  sessionId: string;
  priceCents: number;
  lines: CheckoutLine[];
  waiver: string;
  allowPromo: boolean;
  intake?: "session" | "intro";
  coachName?: string;
  flagRole?: "" | "quarterback" | "athlete";
  flagCoach?: string;
}) {
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [priceNote, setPriceNote] = useState(
    lines.some((line) => line.label !== "Session" && line.cents > 0)
      ? `${formatMoney(priceCents)} due today.`
      : `${formatMoney(priceCents)} before the card form.`,
  );
  const [displayCents, setDisplayCents] = useState(priceCents);
  const [displayLines, setDisplayLines] = useState(lines);

  async function quote(form: HTMLFormElement) {
    const data = new FormData(form);
    const response = await fetch("/api/checkout/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "quote",
        sessionId,
        email: String(data.get("email") ?? ""),
        promoCode: String(data.get("promoCode") ?? ""),
        ...(flagRole ? { flagRole, coachName: flagCoach } : {}),
      }),
    });
    const body = (await response.json()) as {
      error?: string;
      message?: string;
      amountCents?: number;
      lines?: CheckoutLine[];
    };
    if (!response.ok) {
      setError(body.error ?? "Could not check that price.");
      return;
    }
    setError("");
    if (body.message) setPriceNote(body.message);
    if (typeof body.amountCents === "number") setDisplayCents(body.amountCents);
    if (body.lines) setDisplayLines(body.lines);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/checkout/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "book",
        sessionId,
        parentName: intake === "intro" ? data.get("name") : data.get("parentName"),
        email: data.get("email"),
        phone: data.get("phone"),
        playerName: intake === "intro" ? data.get("name") : data.get("playerName"),
        school: data.get("school"),
        grade: data.get("grade"),
        social: data.get("social"),
        coachName: flagRole ? flagCoach : data.get("coachName"),
        flagRole: flagRole || undefined,
        promoCode: data.get("promoCode"),
        acceptWaiver: accepted,
      }),
    });
    const body = (await response.json()) as { error?: string; redirect?: string };
    if (!response.ok || !body.redirect) {
      setPending(false);
      setError(body.error ?? "Checkout could not start.");
      return;
    }
    window.location.href = body.redirect;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-xl bg-ink px-4 py-3 text-white">
        <p className="text-xs uppercase tracking-[0.16em] text-white/60">Due today</p>
        <p className="font-display text-4xl">{formatMoney(displayCents)}</p>
        {displayLines.length > 1 ? (
          <ul className="mt-2 space-y-1 text-sm">
            {displayLines.map((line) => (
              <li key={line.label} className="flex justify-between gap-3">
                <span>{line.label}</span>
                <span>{formatMoney(line.cents)}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="text-sm text-white/80">{priceNote}</p>
      </div>
      {intake === "intro" ? (
        <>
          <input type="hidden" name="coachName" value={coachName} />
          <div>
            <Label htmlFor="name">Name</Label>
            <Input className="mt-1" id="name" name="name" required autoComplete="name" />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input className="mt-1" id="phone" name="phone" type="tel" inputMode="tel" required autoComplete="tel" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input className="mt-1" id="email" name="email" type="email" required autoComplete="email" onBlur={(event) => quote(event.currentTarget.form!)} />
          </div>
          <div>
            <Label htmlFor="school">School</Label>
            <Input className="mt-1" id="school" name="school" required />
          </div>
          <div>
            <Label htmlFor="grade">Grade</Label>
            <select id="grade" name="grade" required defaultValue="" className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3">
              <option value="">Choose</option>
              {GRADES.map((grade) => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="social">Social</Label>
            <Input className="mt-1" id="social" name="social" required placeholder="@instagram" />
          </div>
        </>
      ) : (
        <>
          <div>
            <Label htmlFor="parentName">Parent name</Label>
            <Input className="mt-1" id="parentName" name="parentName" required autoComplete="name" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input className="mt-1" id="email" name="email" type="email" required autoComplete="email" onBlur={(event) => quote(event.currentTarget.form!)} />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input className="mt-1" id="phone" name="phone" type="tel" inputMode="tel" required autoComplete="tel" />
          </div>
          <div>
            <Label htmlFor="playerName">Player name</Label>
            <Input className="mt-1" id="playerName" name="playerName" required />
            <p className="mt-1 text-xs text-muted-foreground">One player per signup. A sibling is a second signup.</p>
          </div>
        </>
      )}
      {allowPromo ? (
        <div>
          <Label htmlFor="promoCode">Promo code (optional)</Label>
          <div className="mt-1 flex gap-2">
            <Input id="promoCode" name="promoCode" className="uppercase" />
            <Button type="button" variant="outline" onClick={(event) => quote(event.currentTarget.form!)}>
              Apply
            </Button>
          </div>
        </div>
      ) : null}
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
        {pending ? "Working…" : displayCents === 0 ? "Confirm spot" : "Continue to pay"}
      </Button>
    </form>
  );
}
