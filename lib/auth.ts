import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Staff",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = process.env.ADMIN_EMAIL;
        const password = process.env.ADMIN_PASSWORD;
        const givenEmail = typeof credentials?.email === "string" ? credentials.email : "";
        const givenPassword = typeof credentials?.password === "string" ? credentials.password : "";
        if (email && password && givenEmail === email && givenPassword === password) {
          return { id: "admin", email, name: "Walker Sports Academy", role: "admin" as const, coachName: null };
        }
        const { prisma } = await import("@/lib/prisma");
        const { verifyPassword } = await import("@/lib/password");
        const staff = await prisma.staffUser.findUnique({
          where: { email: givenEmail.trim().toLowerCase() },
        });
        if (!staff) return null;
        const matches = await verifyPassword(givenPassword, staff.passwordHash);
        if (!matches) return null;
        return {
          id: staff.id,
          email: staff.email,
          name: staff.name,
          role: "coach" as const,
          coachName: staff.coachName,
        };
      },
    }),
  ],
});
