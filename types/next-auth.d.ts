import type { DefaultSession } from "next-auth";

// Augment NextAuth types so `session.user.role` / `.id` are typed everywhere.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "VIEWER";
    } & DefaultSession["user"];
  }

  interface User {
    role?: "ADMIN" | "VIEWER";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "ADMIN" | "VIEWER";
  }
}
