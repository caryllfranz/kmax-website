"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight, BarChart3, CalendarDays, CircleAlert, LayoutDashboard,
  LogOut, Package, ShoppingCart, UsersRound, UserRoundPlus,
} from "lucide-react";
import { signOutStaff } from "@/app/staff-login/actions";
import { useAdminDemo, type PendingOperation } from "./demo-store";
import styles from "./admin-shell.module.css";

const navigation = [
  { path: "", label: "Overview", icon: LayoutDashboard },
  { path: "/members", label: "Members", icon: UsersRound },
  { path: "/walk-ins", label: "Walk-ins", icon: UserRoundPlus },
  { path: "/pos", label: "Counter POS", icon: ShoppingCart },
  { path: "/inventory", label: "Inventory", icon: Package },
  { path: "/schedule", label: "Schedule", icon: CalendarDays },
  { path: "/reports", label: "Sales reports", icon: BarChart3 },
];

const operationLabels: Record<PendingOperation, string> = {
  member: "Member registration",
  renewal: "Membership renewal",
  product: "Product creation",
  adjustment: "Stock adjustment",
  sale: "Sale",
  schedule: "Schedule change",
  walkin: "Walk-in visit",
  walkin_payment: "Walk-in payment",
};

function WorkspaceContent({ children }: { children: ReactNode }) {
  const { loading, error, reload, pendingOperations, acknowledgePending } = useAdminDemo();
  const [checked, setChecked] = useState<Partial<Record<PendingOperation, boolean>>>({});
  const [notice, setNotice] = useState("");
  const [reviewVersion, setReviewVersion] = useState(0);

  return <>
    {loading && <p className={styles.empty} role="status">Loading staff data...</p>}
    {!loading && error && <section className={styles.panel} role="alert"><h1>Unable to load staff data</h1><p>{error}</p><button className={styles.recoveryButton} type="button" onClick={() => void reload()}>Try again</button></section>}
    {!loading && !error && pendingOperations.length > 0 && <section className={styles.recoveryNotice} aria-labelledby="pending-title">
      <h2 id="pending-title">Check an unconfirmed request</h2>
      <p>A connection issue may have interrupted a request. It might already be saved. Refresh the data and check the relevant records before entering it again.</p>
      {pendingOperations.includes("sale") && <p>Sales reports do not yet identify an unconfirmed request reliably. Ask an administrator to verify it before finishing this review or recording the sale again.</p>}
      {pendingOperations.some((operation) => operation === "walkin" || operation === "walkin_payment") && <p>Ask an administrator to verify an unconfirmed walk-in or payment before finishing this review or recording it again.</p>}
      <button className={styles.recoveryButton} type="button" onClick={() => void reload()}>Refresh records</button>
      {pendingOperations.map((operation) => <div className={styles.recoveryRow} key={operation}>
        <label><input type="checkbox" checked={!!checked[operation]} onChange={(event) => setChecked((current) => ({ ...current, [operation]: event.target.checked }))} /> I checked the records for {operationLabels[operation].toLowerCase()}.</label>
        <button className={styles.recoveryButton} type="button" disabled={!checked[operation]} onClick={() => {
          const result = acknowledgePending(operation);
          setNotice(result.ok ? `${operationLabels[operation]} review cleared.` : result.error || "Could not clear the review.");
          if (result.ok) setReviewVersion((current) => current + 1);
          setChecked((current) => ({ ...current, [operation]: false }));
        }}>Finish review</button>
      </div>)}
      {notice && <p role="status">{notice}</p>}
    </section>}
    <div key={reviewVersion} hidden={loading || !!error}>{children}</div>
  </>;
}

export default function AdminShell({ children, basePath = "/admin", staffName }: {
  children: ReactNode;
  basePath?: "/admin" | "/staff";
  staffName?: string;
}) {
  const pathname = usePathname();
  const isDemo = basePath === "/admin";

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#admin-content">Skip to dashboard content</a>
      <aside className={styles.sidebar}>
        <Link href={basePath} className={styles.brand} aria-label="KMAX staff dashboard">
          <span className={styles.brandMark}>
            <Image src="/images/kmax-mark.svg" alt="" width={40} height={27} />
          </span>
          <span className={styles.brandWords}><strong>KMAX</strong><small>ADMIN</small></span>
        </Link>

        <div className={styles.navLabel}>Manage</div>
        <nav className={styles.nav} aria-label="Dashboard navigation">
          {navigation.map(({ path, label, icon: Icon }) => {
            const href = `${basePath}${path}`;
            const active = path === "" ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={`${styles.navLink} ${active ? styles.active : ""}`} aria-current={active ? "page" : undefined}>
                <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.workspaceName}>KMAX <span>/</span> {isDemo ? "Demo workspace" : staffName || "Staff workspace"}</div>
          <div className={styles.topbarActions}>
            <Link href="/" className={styles.publicLink}>Public website <ArrowUpRight size={16} aria-hidden="true" /></Link>
            {!isDemo && <form action={signOutStaff}><button type="submit" className={styles.signOut}><LogOut size={16} aria-hidden="true" /> Sign out</button></form>}
          </div>
        </header>
        <div className={styles.demoNotice}>
          <CircleAlert size={17} aria-hidden="true" />
          <p>{isDemo ? <><strong>Demo only.</strong> Fictional data; changes reset on refresh. Do not enter real personal information.</> : <><strong>Testing only.</strong> Changes are saved to Supabase. Use fictional data until the dashboard is approved for real operations.</>}</p>
        </div>
        <main id="admin-content" className={styles.main}><WorkspaceContent>{children}</WorkspaceContent></main>
      </div>
    </div>
  );
}
