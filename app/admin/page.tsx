"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Package, ReceiptText, UsersRound } from "lucide-react";
import { useAdminDemo } from "@/components/admin/demo-store";
import styles from "@/components/admin/admin-shell.module.css";

const pesos = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const dateFormat = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const saleDateFormat = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" });

function exactPesos(centavos: bigint) {
  return `₱${(centavos / BigInt(100)).toLocaleString("en-PH")}.${String(centavos % BigInt(100)).padStart(2, "0")}`;
}

function displayDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? "Not set" : dateFormat.format(date);
}

function displaySaleDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : saleDateFormat.format(date);
}

export default function AdminOverview() {
  const { mode, rootPath, members, products, sales, sessions } = useAdminDemo();
  const isDemo = mode === "demo";
  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const salesTotal = sales.reduce((sum, sale) => sum + BigInt(sale.totalCentavos), BigInt(0));
  const earliestExpiries = members.filter((member) => member.endsOn >= today).sort((a, b) => a.endsOn.localeCompare(b.endsOn)).slice(0, 5);
  const upcomingSessions = sessions.filter((session) => new Date(`${session.date}T${session.time}:00+08:00`).getTime() >= now.getTime());
  const scheduledSessions = [...upcomingSessions].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)).slice(0, 4);
  const stock = [...products].sort((a, b) => a.stock - b.stock).slice(0, 4);
  const recentSales = [...sales].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);

  return (
    <>
      <div className={styles.pageHeading}>
        <div>
          <span className={styles.pageKicker}>KMAX staff workspace</span>
          <h1>Overview</h1>
          <p>Your members, schedule, and counter activity in one place.</p>
        </div>
        {isDemo && <span className={styles.sampleBadge}>Demo data</span>}
      </div>

      <div className={styles.statsGrid} aria-label="Dashboard summary">
        <article className={`${styles.stat} ${styles.statPrimary}`}>
          <div className={styles.statLabel}><span>Members</span><UsersRound size={19} aria-hidden="true" /></div>
          <strong>{members.length}</strong>
          <p>{isDemo ? "Member records in this demo" : "Member records in the registry"}</p>
        </article>
        <article className={styles.stat}>
          <div className={styles.statLabel}><span>Upcoming sessions</span><CalendarDays size={19} aria-hidden="true" /></div>
          <strong>{upcomingSessions.length}</strong>
          <p>Classes and coaching</p>
        </article>
        <article className={styles.stat}>
          <div className={styles.statLabel}><span>Products</span><Package size={19} aria-hidden="true" /></div>
          <strong>{products.length}</strong>
          <p>{isDemo ? "Items in the demo catalog" : "Items in the catalog"}</p>
        </article>
        <article className={styles.stat}>
          <div className={styles.statLabel}><span>Sales total</span><ReceiptText size={19} aria-hidden="true" /></div>
          <strong className={styles.moneyStat}>{exactPesos(salesTotal)}</strong>
          <p>{sales.length} {isDemo ? "demo " : "loaded "}{sales.length === 1 ? "transaction" : "transactions"}</p>
        </article>
      </div>

      <div className={styles.overviewGrid}>
        <section className={styles.panel} aria-labelledby="expiry-title">
          <div className={styles.panelHeading}>
            <div><h2 id="expiry-title">Membership expiry</h2><p>Upcoming dates from each member’s latest recorded term</p></div>
            <Link href={`${rootPath}/members`} className={styles.panelLink}>View members <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          {earliestExpiries.length ? (
            <div className={styles.dataList}>
              {earliestExpiries.map((member) => (
                <div key={member.id} className={styles.dataRow}>
                  <div className={styles.rowIdentity}><span className={styles.avatar} aria-hidden="true">{member.name.trim().charAt(0).toUpperCase()}</span><div><strong>{member.name}</strong><small>{member.mobile}</small></div></div>
                  <div className={styles.rowEnd}><small>Expires</small><strong>{displayDate(member.endsOn)}</strong></div>
                </div>
              ))}
            </div>
          ) : <p className={styles.empty}>{isDemo ? "No upcoming membership dates in the demo." : "No upcoming membership expiry dates recorded."}</p>}
        </section>

        <section className={styles.panel} aria-labelledby="schedule-title">
          <div className={styles.panelHeading}>
            <div><h2 id="schedule-title">Schedule</h2><p>{isDemo ? "Upcoming sessions in the demo calendar" : "Upcoming sessions, Philippine time"}</p></div>
            <Link href={`${rootPath}/schedule`} className={styles.panelLink}>View schedule <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          {scheduledSessions.length ? (
            <div className={styles.dataList}>
              {scheduledSessions.map((session) => (
                <div key={session.id} className={styles.dataRow}>
                  <div className={styles.rowIdentity}><span className={styles.listIcon}><CalendarDays size={18} aria-hidden="true" /></span><div><strong>{session.title}</strong><small>{session.category}{session.coach ? ` · ${session.coach}` : ""}</small></div></div>
                  <div className={styles.rowEnd}><small>{displayDate(session.date)}</small><strong>{session.time || "Time TBA"}</strong></div>
                </div>
              ))}
            </div>
          ) : <p className={styles.empty}>{isDemo ? "No upcoming sessions in the demo." : "No upcoming sessions recorded."}</p>}
        </section>

        <section className={styles.panel} aria-labelledby="stock-title">
          <div className={styles.panelHeading}>
            <div><h2 id="stock-title">Stock at a glance</h2><p>Products with the fewest units</p></div>
            <Link href={`${rootPath}/inventory`} className={styles.panelLink}>Inventory <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          {stock.length ? (
            <div className={styles.compactList}>
              {stock.map((product) => <div key={product.id} className={styles.compactRow}><span>{product.name}</span><strong>{product.stock} {product.stock === 1 ? "unit" : "units"}</strong></div>)}
            </div>
          ) : <p className={styles.empty}>{isDemo ? "No products in the demo catalog yet." : "No products in the catalog yet."}</p>}
        </section>

        <section className={styles.panel} aria-labelledby="sales-title">
          <div className={styles.panelHeading}>
            <div><h2 id="sales-title">Recent sales</h2><p>{isDemo ? "Completed demo transactions" : "Recently loaded transactions"}</p></div>
            <Link href={`${rootPath}/reports`} className={styles.panelLink}>Sales reports <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          {recentSales.length ? (
            <div className={styles.compactList}>
              {recentSales.map((sale) => <div key={sale.id} className={styles.compactRow}><span>{displaySaleDate(sale.createdAt)}</span><strong>{pesos.format(sale.totalCentavos / 100)}</strong></div>)}
            </div>
          ) : <p className={styles.empty}>{isDemo ? "No demo sales yet. Start an order in Counter POS." : "No sales recorded yet."}</p>}
        </section>
      </div>
    </>
  );
}
