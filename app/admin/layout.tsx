import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Proxy provides the fast redirect; this server check is the real authorization boundary.
  try { await requireAdmin(); } catch (error) { redirect(error instanceof Error && error.message === "FORBIDDEN" ? "/auth/login?error=forbidden" : "/auth/login"); }
  return <AdminShell>{children}</AdminShell>;
}
