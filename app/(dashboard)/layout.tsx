import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { doSignOut } from "./actions";

// Navigation is defined once; items are progressively wired up across phases.
const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/programs", label: "Programs" },
  { href: "/participants", label: "Participants" },
  { href: "/attendance", label: "Attendance" },
  { href: "/deliverables", label: "Deliverables" },
  { href: "/reminders", label: "Reminders" },
  { href: "/feedback", label: "Feedback" },
  { href: "/settings", label: "Settings" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { name, email, role } = session.user;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 border-r bg-card md:block">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-primary text-xs font-bold text-primary-foreground">
            TP
          </span>
          <span className="text-sm font-semibold">Training Monitor</span>
        </div>
        <nav className="flex flex-col gap-1 p-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main column */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-card px-4">
          <div className="text-sm text-muted-foreground md:hidden">
            Training Monitor
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium">{name ?? email}</div>
              <div className="text-xs text-muted-foreground">{role}</div>
            </div>
            <form action={doSignOut}>
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
