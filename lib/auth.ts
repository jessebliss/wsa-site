import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Admin",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize(credentials) {
        const email = process.env.ADMIN_EMAIL;
        const password = process.env.ADMIN_PASSWORD;
        if (!email || !password) return null;
        const givenEmail = typeof credentials?.email === "string" ? credentials.email : "";
        const givenPassword = typeof credentials?.password === "string" ? credentials.password : "";
        if (givenEmail === email && givenPassword === password) {
          return { id: "admin", email, name: "Walker Sports Academy" };
        }
        return null;
      },
    }),
  ],
});
