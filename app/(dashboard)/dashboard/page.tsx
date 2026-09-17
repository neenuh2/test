import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Phase 0: empty protected dashboard shell. KPI cards, charts, at-risk table,
// and global filters are implemented in Phase 6.
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of attendance, deliverables, reminders, and feedback.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>
            This is the Phase 0 shell. Widgets are added in later build phases.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="list-inside list-disc space-y-1">
            <li>Phase 1 — data model &amp; admin CRUD</li>
            <li>Phase 2 — attendance</li>
            <li>Phase 3 — deliverables &amp; completion</li>
            <li>Phase 4 — due-date engine &amp; email</li>
            <li>Phase 5 — feedback</li>
            <li>Phase 6 — dashboard</li>
            <li>Phase 7 — hardening</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
