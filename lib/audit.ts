import { prisma } from "@/lib/db";

/**
 * Append an audit-log entry for a create/update/delete on a core entity.
 * Deliberately stores only entity + id + a small meta object — never PII in
 * free text (spec §8). Failures here must not break the primary mutation.
 */
export async function audit(params: {
  userId?: string | null;
  action: "CREATE" | "UPDATE" | "DELETE";
  entity: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        meta: params.meta ? (params.meta as object) : undefined,
      },
    });
  } catch {
    // Best-effort; do not surface audit failures to the user.
  }
}
