import { saveWaiver } from "@/app/admin/(panel)/actions";
import { AdminError } from "@/components/admin-error";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Waiver" };

export default async function WaiverAdmin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const waiver = await prisma.waiver.findFirst({
    where: { isCurrent: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div>
      <h1 className="font-display text-4xl uppercase">Waiver</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        New signups accept the current text. Each acceptance stores the exact text that person agreed to.
      </p>
      <AdminError message={params.error} />
      <form action={saveWaiver} className="mt-4 space-y-3">
        <Label htmlFor="body">Waiver text</Label>
        <Textarea id="body" name="body" defaultValue={waiver?.body ?? ""} className="min-h-80" required />
        <Button type="submit" className="w-full sm:w-auto">Publish waiver</Button>
      </form>
    </div>
  );
}
