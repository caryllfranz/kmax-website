"use client";

import { useState } from "react";
import { ReceiptText, RefreshCw } from "lucide-react";
import { manilaToday, useAdminDemo } from "@/components/admin/demo-store";
import styles from "@/components/admin/workspace.module.css";

const dateTime = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" });
const manilaDay = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Manila" });

function displayDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : dateTime.format(date);
}

function manilaDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = Object.fromEntries(manilaDay.formatToParts(date).map(({ type, value: part }) => [type, part]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function pesos(centavos: bigint) {
  const whole = centavos / BigInt(100);
  const fraction = String(centavos % BigInt(100)).padStart(2, "0");
  return `₱${whole.toLocaleString("en-PH")}.${fraction}`;
}

export default function ReportsPage() {
  const { mode, members, sales, reload, loading } = useAdminDemo();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const isDemo = mode === "demo";
  const validRange = !from || !to || from <= to;
  const filteredSales = validRange ? sales.filter((sale) => {
    const day = manilaDate(sale.createdAt);
    if (!day) return !from && !to;
    return (!from || day >= from) && (!to || day <= to);
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];
  const today = manilaToday();
  const statuses = { current: 0, upcoming: 0, ended: 0 };
  let renewals = 0;
  for (const member of members) {
    const terms = [...member.history, member];
    renewals += member.history.length;
    if (terms.some((term) => term.startsOn <= today && term.endsOn >= today)) statuses.current++;
    else if (terms.some((term) => term.startsOn > today)) statuses.upcoming++;
    else statuses.ended++;
  }
  const total = filteredSales.reduce((sum, sale) => sum + BigInt(sale.totalCentavos), BigInt(0));
  const units = filteredSales.reduce((sum, sale) => sum + sale.lines.reduce((count, line) => count + line.quantity, 0), 0);
  const items = new Map<string, { name: string; units: number; total: bigint }>();
  const days = new Map<string, { count: number; total: bigint }>();
  for (const sale of filteredSales) {
    const day = manilaDate(sale.createdAt);
    if (!day) continue;
    const current = days.get(day) ?? { count: 0, total: BigInt(0) };
    days.set(day, { count: current.count + 1, total: current.total + BigInt(sale.totalCentavos) });
  }
  for (const sale of filteredSales) for (const line of sale.lines) {
    const current = items.get(line.productId) ?? { name: line.name, units: 0, total: BigInt(0) };
    items.set(line.productId, { ...current, units: current.units + line.quantity, total: current.total + BigInt(line.quantity) * BigInt(line.priceCentavos) });
  }
  const dailySales = [...days.entries()].sort(([a], [b]) => b.localeCompare(a));
  const highestDay = dailySales.reduce((highest, [, day]) => day.total > highest ? day.total : highest, BigInt(0));
  const average = filteredSales.length ? (total + BigInt(Math.floor(filteredSales.length / 2))) / BigInt(filteredSales.length) : BigInt(0);

  return <div className={styles.page}>
    <div className={styles.heading}>
      <div><span className={styles.kicker}>Staff workspace</span><h1>Reports &amp; analytics</h1><p>{isDemo ? "Explore sample member and counter activity." : "Review membership dates and recorded counter sales."}</p></div>
      {!isDemo && <button type="button" className={styles.secondary} onClick={() => void reload()} disabled={loading}><RefreshCw size={16} aria-hidden="true" />{loading ? "Refreshing…" : "Refresh data"}</button>}
    </div>
    <div className={styles.info}><ReceiptText size={19} aria-hidden="true" /><p>{isDemo ? "Demo totals only. No real payment, sales history, or cloud data is shown here." : "Figures reflect loaded records and may change after refresh. POS totals exclude membership and walk-in payments, refunds, and reversals."}</p></div>
    <section aria-labelledby="member-analytics-title">
      <div className={styles.panelHeading}><div><h2 id="member-analytics-title">Members today</h2><p>Based on saved term dates in Philippine time; the sales date filter does not apply.</p></div></div>
      <div className={styles.metrics}>
        <div><span>Registered members</span><strong>{members.length}</strong><small>Non-archived records</small></div>
        <div><span>Current term</span><strong>{statuses.current}</strong><small>At least one term includes today</small></div>
        <div><span>Upcoming term</span><strong>{statuses.upcoming}</strong><small>No current term, a future term exists</small></div>
        <div><span>Ended terms</span><strong>{statuses.ended}</strong><small>No current or future term</small></div>
        <div><span>Recorded renewals</span><strong>{renewals}</strong><small>All-time terms after initial registration</small></div>
      </div>
      <p className={styles.analyticsNote}>Date-based counts include both start and end dates. Grace periods, pauses, and other membership rules are not included.</p>
    </section>
    <section className={styles.panel} aria-labelledby="date-filter-title" style={{ marginBottom: 18 }}>
      <div className={styles.panelHeading}><div><h2 id="date-filter-title">Date range</h2><p>Optional filters use Philippine time. Leave both blank to show all loaded sales.</p></div></div>
      <div className={`${styles.form} ${styles.fields}`}>
        <label>From date<input type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} /></label>
        <label>To date<input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} /></label>
      </div>
      {!validRange && <p className={styles.error} role="alert">The start date must be on or before the end date.</p>}
    </section>
    <div className={styles.metrics}>
      <div><span>Sales total</span><strong>{validRange ? pesos(total) : "—"}</strong><small>Counter sales for selected dates</small></div>
      <div><span>Transactions</span><strong>{validRange ? filteredSales.length : "—"}</strong><small>{isDemo ? "Completed sample sales" : "Loaded sales in this range"}</small></div>
      <div><span>Items sold</span><strong>{validRange ? units : "—"}</strong><small>Units across these sales</small></div>
      <div><span>Average sale</span><strong>{validRange ? pesos(average) : "—"}</strong><small>Rounded to the nearest centavo</small></div>
    </div>
    <section className={`${styles.panel} ${styles.trendPanel}`} aria-labelledby="daily-sales-title">
      <div className={styles.panelHeading}><div><h2 id="daily-sales-title">Sales by day</h2><p>Counter totals by Philippine date for the selected range.</p></div></div>
      {dailySales.length ? <div className={styles.trendList}>{dailySales.map(([day, summary]) => <div className={styles.trendRow} key={day}>
        <div className={styles.trendDetails}><strong><time dateTime={day}>{day}</time></strong><span>{summary.count} {summary.count === 1 ? "sale" : "sales"}</span><b>{pesos(summary.total)}</b></div>
        <div className={styles.trendTrack} aria-hidden="true"><div style={{ width: `${highestDay ? Number((summary.total * BigInt(100)) / highestDay) : 0}%` }} /></div>
      </div>)}</div> : <p className={styles.empty}>{validRange ? "No sales match this date range." : "Choose a valid date range to view sales."}</p>}
    </section>
    <div className={styles.reportGrid}>
      <section className={styles.panel} aria-labelledby="sales-history"><div className={styles.panelHeading}><div><h2 id="sales-history">Sales</h2><p>Amounts use the price recorded at the time of the sale.</p></div></div>
        {filteredSales.length ? <div className={styles.list}>{filteredSales.map((sale) => <article key={sale.id} className={styles.row}><div className={styles.rowBody}><strong>{displayDate(sale.createdAt)}</strong><span>{sale.lines.reduce((sum, line) => sum + line.quantity, 0)} items{isDemo ? " · Demo sale" : ""}</span></div><strong className={styles.amount}>{pesos(BigInt(sale.totalCentavos))}</strong></article>)}</div> : <p className={styles.empty}>{validRange ? "No sales match this date range." : "Choose a valid date range to view sales."}</p>}
      </section>
      <section className={styles.panel} aria-labelledby="item-sales"><div className={styles.panelHeading}><div><h2 id="item-sales">Items sold</h2><p>Totals are calculated from the displayed sale lines.</p></div></div>
        {items.size ? <div className={styles.list}>{[...items.entries()].sort((a, b) => a[1].total === b[1].total ? 0 : a[1].total > b[1].total ? -1 : 1).map(([id, item]) => <div key={id} className={styles.row}><div className={styles.rowBody}><strong>{item.name}</strong><span>{item.units} units</span></div><strong className={styles.amount}>{pesos(item.total)}</strong></div>)}</div> : <p className={styles.empty}>{validRange ? "No items sold in this date range." : "Choose a valid date range to view item totals."}</p>}
      </section>
    </div>
  </div>;
}
