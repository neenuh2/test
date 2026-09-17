import { PageHeader } from "@/components/page-header";

// Placeholder — implemented in Phase 3.
export default function Page() {
  return (
    <div className="space-y-4">
      <PageHeader title="Deliverables & completion" description="Coming in Phase 3." />
      <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        This section is built in Phase 3 of the roadmap.
      </p>
    </div>
  );
}
