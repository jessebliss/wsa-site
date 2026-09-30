import { login } from "@/app/admin/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata = { title: "Staff login" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Walker Sports Academy</p>
      <h1 className="font-display text-4xl uppercase">Staff login</h1>
      <p className="mt-2 text-sm text-muted-foreground">Coaches and the academy admin sign in here. Parents do not use this page.</p>
      <form action={login} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input className="mt-1" id="email" name="email" type="email" required autoComplete="username" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input className="mt-1" id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        {params.error ? <p className="text-sm font-semibold text-primary">That email or password does not match.</p> : null}
        <Button type="submit" className="w-full">Log in</Button>
      </form>
    </div>
  );
}
