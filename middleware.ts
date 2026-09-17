import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Edge middleware uses ONLY the edge-safe config (no DB / bcrypt).
// The `authorized` callback in authConfig decides which routes are public.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
};
