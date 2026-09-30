import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      if (path.startsWith("/admin/login")) return true;
      if (!path.startsWith("/admin")) return true;
      if (!auth?.user) return false;
      if (auth.user.role === "coach" && path !== "/admin/availability") {
        const host = request.headers.get("host") ?? request.nextUrl.host;
        const proto = request.nextUrl.protocol.replace(":", "");
        return Response.redirect(`${proto}://${host}/admin/availability`);
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = user.role ?? "admin";
        token.coachName = user.coachName ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role === "coach" ? "coach" : "admin";
        session.user.coachName = typeof token.coachName === "string" ? token.coachName : null;
        if (token.sub) session.user.id = token.sub;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
