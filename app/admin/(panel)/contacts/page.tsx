import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages" };

export default async function ContactsPage() {
  const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div>
      <h1 className="font-display text-4xl uppercase">Messages</h1>
      <ul className="mt-4 space-y-3">
        {messages.length === 0 ? <li className="text-sm text-muted-foreground">No messages yet.</li> : null}
        {messages.map((message) => (
          <li key={message.id} className="rounded-xl bg-white p-4 text-sm">
            <p className="font-semibold">{message.firstName} {message.lastName}</p>
            <p>{message.email} · {message.phone}</p>
            {message.subject ? <p className="mt-1 font-semibold">{message.subject}</p> : null}
            <p className="mt-1 whitespace-pre-wrap">{message.message}</p>
            <p className="mt-2 text-xs text-muted-foreground">{message.createdAt.toISOString()}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
