import { redirect } from "next/navigation";

// Root simply forwards to the dashboard; middleware redirects to /login if
// the visitor is not authenticated.
export default function Home() {
  redirect("/dashboard");
}
