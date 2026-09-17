import { z } from "zod";
import { AuthorizationError } from "@/lib/rbac";

/** Standard shape returned by every mutating server action to the UI. */
export type ActionState = {
  ok?: boolean;
  error?: string;
  /** Field-level validation messages keyed by field name. */
  fieldErrors?: Record<string, string[]>;
};

/** Empty initial state for useFormState. */
export const emptyActionState: ActionState = {};

/**
 * Wrap the body of a server action so Zod and authorization errors become
 * a consistent ActionState instead of throwing. Redirect errors (thrown by
 * next/navigation) must propagate, so we rethrow anything we don't recognize.
 */
export async function runAction(
  fn: () => Promise<ActionState | void>
): Promise<ActionState> {
  try {
    const result = await fn();
    return result ?? { ok: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        error: "Please fix the highlighted fields.",
        fieldErrors: err.flatten().fieldErrors as Record<string, string[]>,
      };
    }
    if (err instanceof AuthorizationError) {
      return { error: err.message };
    }
    // Prisma unique-constraint violations surface a readable message.
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      const target = (err as { meta?: { target?: string[] } }).meta?.target;
      const field = Array.isArray(target) ? target.join(", ") : "value";
      return { error: `A record with this ${field} already exists.` };
    }
    // Framework errors (e.g. NEXT_REDIRECT) must bubble up.
    throw err;
  }
}
