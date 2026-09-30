import type { DefaultSession } from "@auth/core/types";

declare module "@auth/core/types" {
  interface User {
    role?: "admin" | "coach";
    coachName?: string | null;
  }

  interface Session {
    user: {
      id?: string;
      role?: "admin" | "coach";
      coachName?: string | null;
    } & DefaultSession["user"];
  }
}
