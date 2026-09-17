import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DEFAULT_TEMPLATES, TEMPLATE_VARIABLES } from "@/lib/email/templates";
import { TemplateForm } from "./template-form";
import type { NotificationType } from "@prisma/client";

const TYPES: { type: NotificationType; label: string }[] = [
  { type: "UPCOMING", label: "Upcoming (before due date)" },
  { type: "DUE_TODAY", label: "Due today" },
  { type: "OVERDUE", label: "Overdue" },
];

export default async function TemplatesPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const saved = await prisma.emailTemplate.findMany();
  const byType = new Map(saved.map((t) => [t.type, t]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email templates"
        description="Edit the reminder email templates. Defaults are seeded and used as a fallback."
        backHref="/reminders"
      />

      <Card>
        <CardHeader>
          <CardTitle>Available variables</CardTitle>
          <CardDescription>
            Use these placeholders in the subject or body; they are substituted when the email is
            generated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_VARIABLES.map((v) => (
              <code key={v} className="rounded bg-muted px-2 py-1 text-xs">{`{{${v}}}`}</code>
            ))}
          </div>
        </CardContent>
      </Card>

      {TYPES.map(({ type, label }) => {
        const t = byType.get(type) ?? DEFAULT_TEMPLATES[type];
        return (
          <Card key={type}>
            <CardHeader>
              <CardTitle>{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <TemplateForm type={type} subject={t.subject} body={t.body} readOnly={!isAdmin} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
