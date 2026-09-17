import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth configuration.
 *
 * This file must NOT import anything that pulls in the database or bcrypt,
 * because it is consumed by `middleware.ts` which runs on the Edge runtime.
 * The Credentials provider (which needs Prisma + bcrypt) is added in
 * `lib/auth.ts`, which runs in the Node runtime.
 *
 * Keeping the config here is the seam that lets us later add an OIDC/SAML
 * provider (BPI SSO / Active Directory) without touching authorization logic.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  callbacks: {
    // Route protection. Everything under the app is protected except the
    // login page, the public feedback form, and auth endpoints.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      const isPublic =
        pathname.startsWith("/login") ||
        pathname.startsWith("/feedback/") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/public");

      if (isPublic) return true;
      return isLoggedIn;
    },
    // Persist id + role into the JWT so authorization checks don't hit the DB.
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // `role` is attached by the Credentials provider's authorize().
        token.role = (user as { role?: string }).role ?? "VIEWER";
      }
      return token;
    },
    // Expose id + role on the session for server-side RBAC checks.
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "VIEWER";
      }
      return session;
    },
  },
  providers: [], // Real providers are injected in lib/auth.ts
} satisfies NextAuthConfig;
