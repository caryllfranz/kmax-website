import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/admin-shell";
import { LiveAdminProvider } from "@/components/admin/live-store";
import { getActiveStaff } from "@/lib/supabase/server";

async function VerifiedStaffLayout({ children }: { children: ReactNode }) {
  let staff: Awaited<ReturnType<typeof getActiveStaff>> = null;
  try {
    staff = await getActiveStaff();
  } catch {
    // Missing configuration and lookup errors must not grant access.
  }
  if (!staff || staff.active !== true || !["admin", "staff"].includes(staff.role)) redirect("/staff-login");

  return (
    <LiveAdminProvider staffId={staff.user_id}>
      <AdminShell basePath="/staff" staffName={staff.display_name}>{children}</AdminShell>
    </LiveAdminProvider>
  );
}

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<p>Checking staff access…</p>}>
      <VerifiedStaffLayout>{children}</VerifiedStaffLayout>
    </Suspense>
  );
}
