import { logout } from "@/app/admin/(panel)/actions";
import { AdminNav } from "@/components/admin-nav";
import { auth } from "@/lib/auth";

const adminLinks: [string, string][] = [
  ["Overview", "/admin"],
  ["Schedule", "/admin/schedule"],
  ["Types", "/admin/types"],
  ["Sessions", "/admin/sessions"],
  ["Fees", "/admin/fees"],
  ["Subscriptions", "/admin/subscriptions"],
  ["Participants", "/admin/participants"],
  ["Promo codes", "/admin/promos"],
  ["Waiver", "/admin/waiver"],
  ["Messages", "/admin/contacts"],
  ["Coaches", "/admin/coaches"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const coach = session?.user?.role === "coach";
  const links: [string, string][] = coach ? [["Availability", "/admin/availability"]] : adminLinks;

  return (
    <div className="min-h-screen">
      <div className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <p className="font-display text-xl uppercase">{coach ? "Coach" : "Admin"}</p>
          <form action={logout}>
            <button className="text-sm font-semibold" type="submit">Log out</button>
          </form>
        </div>
        <AdminNav links={links} />
      </div>
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </div>
  );
}
