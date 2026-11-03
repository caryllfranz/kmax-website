"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, CircleAlert, Package, ReceiptText, UsersRound } from "lucide-react";
import { useAdminDemo } from "@/components/admin/demo-store";
import styles from "@/components/admin/admin-shell.module.css";

const dateFormat = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const saleDateFormat = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" });
const manilaDate = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Manila" });
const shortDay = new Intl.DateTimeFormat("en-PH", { weekday: "short", day: "numeric", timeZone: "UTC" });

function exactPesos(centavos: bigint) {
  return `₱${(centavos / BigInt(100)).toLocaleString("en-PH")}.${String(centavos % BigInt(100)).padStart(2, "0")}`;
}

function displayDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? "Not set" : dateFormat.format(date);
}

function addDays(day: string, offset: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export default function AdminOverview() {
  const { mode, rootPath, members, products, sales, sessions } = useAdminDemo();
  const isDemo = mode === "demo";
  const now = new Date();
  const today = manilaDate.format(now);
  const nextWeek = addDays(today, 7);
  let currentCount = 0;
  let expiringCount = 0;
  let expiredCount = 0;
  const expiries = members.flatMap((member) => {
    const terms = [member, ...member.history];
    const current = terms.filter((term) => term.startsOn <= today && term.endsOn >= today).sort((a, b) => a.endsOn.localeCompare(b.endsOn))[0];
    if (current) {
      currentCount++;
      if (current.endsOn <= nextWeek) expiringCount++;
      return [{ member, endsOn: current.endsOn }];
    }
    if (!terms.some((term) => term.startsOn > today)) expiredCount++;
    return [];
  }).sort((a, b) => a.endsOn.localeCompare(b.endsOn)).slice(0, 5);

  const upcomingSessions = sessions.filter((session) => new Date(`${session.date}T${session.time}:00+08:00`).getTime() >= now.getTime());
  const scheduledSessions = [...upcomingSessions].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)).slice(0, 4);
  const outOfStock = products.filter((product) => product.stock === 0).length;
  const stock = [...products].sort((a, b) => a.stock - b.stock).slice(0, 4);
  const recentSales = [...sales].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
  const days = Array.from({ length: 7 }, (_, index) => ({ date: addDays(today, index - 6), total: BigInt(0), count: 0 }));
  const salesByDay = new Map(days.map((day) => [day.date, day]));
  for (const sale of sales) {
    const date = new Date(sale.createdAt);
    if (Number.isNaN(date.getTime())) continue;
    const day = salesByDay.get(manilaDate.format(date));
    if (day) { day.total += BigInt(sale.totalCentavos); day.count++; }
  }
  const salesToday = days[6];
  const maxSales = days.reduce((maximum, day) => day.total > maximum ? day.total : maximum, BigInt(0));
  const hasSales = days.some((day) => day.count > 0);

  return <>
    <div className={styles.pageHeading}>
      <div><h1>Overview</h1><p>Your members, schedule, and counter activity in one place.</p></div>
      {isDemo && <span className={styles.sampleBadge}>Demo data</span>}
    </div>

    <div className={styles.statsGrid} aria-label="Dashboard summary">
      <article className={`${styles.stat} ${styles.statPrimary}`}>
        <div className={styles.statLabel}><span>Current memberships</span><UsersRound size={19} aria-hidden="true" /></div>
        <strong>{currentCount}</strong><p>of {members.length} member records</p>
      </article>
      <article className={styles.stat}>
        <div className={styles.statLabel}><span>Expiring in 7 days</span><CircleAlert size={19} aria-hidden="true" /></div>
        <strong>{expiringCount}</strong><p>{expiredCount} with no current or future term</p>
      </article>
      <article className={styles.stat}>
        <div className={styles.statLabel}><span>Upcoming sessions</span><CalendarDays size={19} aria-hidden="true" /></div>
        <strong>{upcomingSessions.length}</strong><p>Classes and coaching</p>
      </article>
      <article className={styles.stat}>
        <div className={styles.statLabel}><span>Counter sales today</span><ReceiptText size={19} aria-hidden="true" /></div>
        <strong className={styles.moneyStat}>{exactPesos(salesToday.total)}</strong><p>{salesToday.count} {salesToday.count === 1 ? "transaction" : "transactions"} · Philippine time</p>
      </article>
    </div>

    <div className={styles.overviewGrid}>
      <section className={styles.panel} aria-labelledby="sales-chart-title">
        <div className={styles.panelHeading}><div><h2 id="sales-chart-title">Counter sales</h2><p>Last 7 days · Philippine time</p></div><Link href={`${rootPath}/reports`} className={styles.panelLink}>Sales reports <ArrowRight size={16} aria-hidden="true" /></Link></div>
        {hasSales ? <div className={styles.chart}>
          <div className={styles.chartBars} aria-hidden="true">{days.map((day) => <div className={styles.chartColumn} key={day.date}><span className={styles.chartAmount}>{exactPesos(day.total)}</span><div className={styles.chartTrack}><span className={styles.chartBar} style={{ height: `${maxSales > BigInt(0) ? Number(day.total * BigInt(100) / maxSales) : 0}%` }} /></div><span className={styles.chartDay}>{shortDay.format(new Date(`${day.date}T00:00:00Z`))}</span></div>)}</div>
          <ul className={styles.srOnly}>{days.map((day) => <li key={day.date}>{displayDate(day.date)}: {exactPesos(day.total)}, {day.count} transactions</li>)}</ul>
        </div> : <p className={styles.empty}>No counter sales in the last 7 days. The chart appears after a sale is recorded.</p>}
        <p className={styles.chartNote}>Counter sales only; walk-ins and membership payments are not included.</p>
      </section>

      <section className={styles.panel} aria-labelledby="attention-title">
        <div className={styles.panelHeading}><div><h2 id="attention-title">Needs attention</h2><p>Things to follow up</p></div></div>
        {expiringCount > 0 && <div className={styles.attentionRow}><span className={styles.attentionIcon}><CircleAlert size={18} /></span><span>{expiringCount} {expiringCount === 1 ? "membership expires" : "memberships expire"} within 7 days</span><Link href={`${rootPath}/members`}>View</Link></div>}
        {expiredCount > 0 && <div className={styles.attentionRow}><span className={styles.attentionIcon}><CircleAlert size={18} /></span><span>{expiredCount} {expiredCount === 1 ? "member has" : "members have"} no current or future term</span><Link href={`${rootPath}/members`}>View</Link></div>}
        {outOfStock > 0 && <div className={styles.attentionRow}><span className={styles.attentionIcon}><Package size={18} /></span><span>{outOfStock} {outOfStock === 1 ? "product is" : "products are"} out of stock</span><Link href={`${rootPath}/inventory`}>Inventory</Link></div>}
        {!expiringCount && !expiredCount && !outOfStock && <p className={styles.empty}>No items need attention right now.</p>}
        <p className={styles.chartNote}>The 7-day reminder is informational; membership rules are still to be confirmed.</p>
      </section>

      <section className={styles.panel} aria-labelledby="expiry-title">
        <div className={styles.panelHeading}><div><h2 id="expiry-title">Membership expiry</h2><p>Earliest current term expiry</p></div><Link href={`${rootPath}/members`} className={styles.panelLink}>View members <ArrowRight size={16} aria-hidden="true" /></Link></div>
        {expiries.length ? <div className={styles.dataList}>{expiries.map(({ member, endsOn }) => <div key={member.id} className={styles.dataRow}><div className={styles.rowIdentity}><span className={styles.avatar} aria-hidden="true">{member.name.trim().charAt(0).toUpperCase()}</span><div><strong>{member.name}</strong><small>{member.mobile}</small></div></div><div className={styles.rowEnd}><small>Expires</small><strong>{displayDate(endsOn)}</strong></div></div>)}</div> : <p className={styles.empty}>No current membership expiry dates recorded.</p>}
      </section>

      <section className={styles.panel} aria-labelledby="schedule-title">
        <div className={styles.panelHeading}><div><h2 id="schedule-title">Schedule</h2><p>Upcoming sessions, Philippine time</p></div><Link href={`${rootPath}/schedule`} className={styles.panelLink}>View schedule <ArrowRight size={16} aria-hidden="true" /></Link></div>
        {scheduledSessions.length ? <div className={styles.dataList}>{scheduledSessions.map((session) => <div key={session.id} className={styles.dataRow}><div className={styles.rowIdentity}><span className={styles.listIcon}><CalendarDays size={18} aria-hidden="true" /></span><div><strong>{session.title}</strong><small>{session.category}{session.coach ? ` · ${session.coach}` : ""}</small></div></div><div className={styles.rowEnd}><small>{displayDate(session.date)}</small><strong>{session.time || "Time TBA"}</strong></div></div>)}</div> : <p className={styles.empty}>No upcoming sessions recorded.</p>}
      </section>

      <section className={styles.panel} aria-labelledby="stock-title">
        <div className={styles.panelHeading}><div><h2 id="stock-title">Stock at a glance</h2><p>Products with the fewest units</p></div><Link href={`${rootPath}/inventory`} className={styles.panelLink}>Inventory <ArrowRight size={16} aria-hidden="true" /></Link></div>
        {stock.length ? <div className={styles.compactList}>{stock.map((product) => <div key={product.id} className={styles.compactRow}><span>{product.name}</span><strong>{product.stock} {product.stock === 1 ? "unit" : "units"}</strong></div>)}</div> : <p className={styles.empty}>No products in the catalog yet.</p>}
      </section>

      <section className={styles.panel} aria-labelledby="recent-sales-title">
        <div className={styles.panelHeading}><div><h2 id="recent-sales-title">Recent sales</h2><p>{isDemo ? "Completed demo transactions" : "Recently loaded transactions"}</p></div><Link href={`${rootPath}/reports`} className={styles.panelLink}>Sales reports <ArrowRight size={16} aria-hidden="true" /></Link></div>
        {recentSales.length ? <div className={styles.compactList}>{recentSales.map((sale) => <div key={sale.id} className={styles.compactRow}><span>{saleDateFormat.format(new Date(sale.createdAt))}</span><strong>{exactPesos(BigInt(sale.totalCentavos))}</strong></div>)}</div> : <p className={styles.empty}>No sales recorded yet.</p>}
      </section>
    </div>
  </>;
}
