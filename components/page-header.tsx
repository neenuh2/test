import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function PageHeader({
  title,
  description,
  action,
  backHref,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
  backHref?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 pb-2">
      <div>
        {backHref && (
          <Link
            href={backHref}
            className="mb-1 inline-block text-sm text-muted-foreground hover:underline"
          >
            ← Back
          </Link>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && (
        <Link href={action.href} className={buttonVariants()}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
