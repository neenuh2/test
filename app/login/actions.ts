"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export type LoginState = { error?: string };

/**
 * Server action for the credentials login form.
 * On success `signIn` throws a redirect (to /dashboard) which must propagate.
 * We only swallow AuthError to render an inline "invalid credentials" message.
 */
export async function authenticate(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    // Re-throw redirect and other framework errors.
    throw error;
  }
}
