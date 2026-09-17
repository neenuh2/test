import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Training Program Monitoring",
  description:
    "BPI Consumer Bank — Manpower Transformation & Training. Attendance, deliverables, reminders, and feedback in one dashboard.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
