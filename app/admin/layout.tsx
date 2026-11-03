import { Suspense, type ReactNode } from "react";
import AdminShell from "@/components/admin/admin-shell";
import { AdminDemoProvider } from "@/components/admin/demo-store";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<p>Loading demo workspace…</p>}>
      <AdminDemoProvider>
        <AdminShell>{children}</AdminShell>
      </AdminDemoProvider>
    </Suspense>
  );
}
