import type { NotificationType } from "@prisma/client";

/**
 * Reminder email templates. Defaults live here and are seeded into the DB
 * (EmailTemplate) so they are editable in-app (spec §6.5). Rendering is a
 * simple `{{var}}` substitution — no external template engine.
 */

export type TemplateVars = {
  participantName: string;
  program: string;
  module: string;
  deliverable: string;
  dueDate: string;
  daysRemaining: string;
  daysOverdue: string;
  submissionLink: string;
};

export const TEMPLATE_VARIABLES: (keyof TemplateVars)[] = [
  "participantName",
  "program",
  "module",
  "deliverable",
  "dueDate",
  "daysRemaining",
  "daysOverdue",
  "submissionLink",
];

export const DEFAULT_TEMPLATES: Record<
  NotificationType,
  { subject: string; body: string }
> = {
  UPCOMING: {
    subject: "Reminder: {{deliverable}} is due on {{dueDate}}",
    body: `<p>Hi {{participantName}},</p>
<p>This is a friendly reminder that <strong>{{deliverable}}</strong> for
<strong>{{program}}</strong> is due on <strong>{{dueDate}}</strong>
({{daysRemaining}} day(s) remaining).</p>
<p>Please submit it here: <a href="{{submissionLink}}">{{submissionLink}}</a></p>
<p>— Manpower Transformation &amp; Training Team</p>`,
  },
  DUE_TODAY: {
    subject: "Due today: {{deliverable}}",
    body: `<p>Hi {{participantName}},</p>
<p><strong>{{deliverable}}</strong> for <strong>{{program}}</strong> is
<strong>due today ({{dueDate}})</strong>.</p>
<p>Please submit it here: <a href="{{submissionLink}}">{{submissionLink}}</a></p>
<p>— Manpower Transformation &amp; Training Team</p>`,
  },
  OVERDUE: {
    subject: "Overdue: {{deliverable}} was due on {{dueDate}}",
    body: `<p>Hi {{participantName}},</p>
<p>Our records show <strong>{{deliverable}}</strong> for
<strong>{{program}}</strong> is <strong>{{daysOverdue}} day(s) overdue</strong>
(was due {{dueDate}}).</p>
<p>Please submit it as soon as possible: <a href="{{submissionLink}}">{{submissionLink}}</a></p>
<p>— Manpower Transformation &amp; Training Team</p>`,
  },
};

/** Substitute `{{var}}` placeholders. Unknown variables are left as-is. */
export function renderTemplate(template: string, vars: Partial<TemplateVars>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    const value = (vars as Record<string, string | undefined>)[key];
    return value != null ? value : match;
  });
}
