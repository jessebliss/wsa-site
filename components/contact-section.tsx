"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ACADEMY_EMAIL, ACADEMY_PHONE, ACADEMY_PHONE_TEL, PARK } from "@/lib/utils";

const fields = [
  { name: "firstName", label: "First name", required: true, type: "text" },
  { name: "lastName", label: "Last name", required: true, type: "text" },
  { name: "email", label: "Email", required: true, type: "email" },
  { name: "subject", label: "Subject", required: false, type: "text" },
  { name: "phone", label: "Phone", required: true, type: "tel" },
] as const;

export function ContactSection() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json()) as { error?: string; message?: string };
    if (!response.ok) {
      setStatus("error");
      setError(body.error ?? "Message could not be sent.");
      return;
    }
    setStatus("sent");
    event.currentTarget.reset();
  }

  return (
    <section id="contact" className="scroll-mt-20 border-t border-border bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Contact</p>
          <h2 className="mt-2 font-display text-4xl uppercase">Talk to the academy</h2>
          <p className="mt-3 text-muted-foreground">
            Training is based at {PARK}.
          </p>
          <p className="mt-4 text-sm">
            <a className="font-semibold" href={`mailto:${ACADEMY_EMAIL}`}>{ACADEMY_EMAIL}</a>
            <br />
            <a className="font-semibold" href={`tel:${ACADEMY_PHONE_TEL}`}>{ACADEMY_PHONE}</a>
          </p>
          <a
            className="mt-4 inline-block text-sm font-semibold text-primary"
            href="https://maps.google.com/?q=Chuck+Rogers+Park+11950+San+Jose+Boulevard+Jacksonville+FL+32223"
          >
            Open Chuck Rogers Park in Google Maps
          </a>
        </div>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.name} className={field.name === "subject" ? "sm:col-span-2" : ""}>
              <Label htmlFor={field.name}>
                {field.label}
                {field.required ? "" : " (optional)"}
              </Label>
              <Input
                className="mt-1"
                id={field.name}
                name={field.name}
                type={field.type}
                required={field.required}
                autoComplete={field.name === "email" ? "email" : field.name === "phone" ? "tel" : "name"}
                inputMode={field.type === "tel" ? "tel" : undefined}
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <Label htmlFor="message">Message</Label>
            <Textarea className="mt-1" id="message" name="message" required />
          </div>
          {status === "sent" ? (
            <p className="sm:col-span-2 text-sm font-semibold text-green-800" role="status">
              Message sent. The academy will get back to you.
            </p>
          ) : null}
          {status === "error" ? (
            <p className="sm:col-span-2 text-sm font-semibold text-primary" role="alert">{error}</p>
          ) : null}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={status === "sending"} className="w-full sm:w-auto">
              {status === "sending" ? "Sending…" : "Submit"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
