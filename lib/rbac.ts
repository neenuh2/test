export type AppRole = "ADMIN" | "VIEWER";

/**
 * Centralized authorization helpers.
 *
 * All server-side permission checks go through here so that when BPI SSO is
 * introduced, only the role-mapping in the auth callbacks changes — not each
 * call site. Route handlers and server actions call `requireAdmin()` /
 * `requireUser()` before performing work.
 */

export async function getCurrentUser() {
  // Lazy import so pure helpers (isAdmin) can be imported without pulling in
  // next-auth / the Edge runtime (keeps this module unit-testable).
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  return session?.user ?? null;
}

export function isAdmin(role?: string | null): boolean {
  return role === "ADMIN";
}

export class AuthorizationError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Ensure there is a logged-in user; returns the user or throws. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError("Authentication required");
  return user;
}

/** Ensure the current user is an ADMIN; returns the user or throws. */
export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdmin(user.role)) throw new AuthorizationError("Admin access required");
  return user;
}
