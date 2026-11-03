"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ReceiptText, RefreshCw } from "lucide-react";
import { manilaToday, useAdminDemo } from "@/components/admin/demo-store";
import { pesos, summarizeCounterSales } from "@/components/admin/sales-report";
import styles from "@/components/admin/workspace.module.css";
import report from "@/components/admin/reports.module.css";

const dateTime = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" });

function displayDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : dateTime.format(date);
}

export default function ReportsPage() {
  const { mode, rootPath, members, sales, reload, loading } = useAdminDemo();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [salesTable, setSalesTable] = useState(false);
  const [productsTable, setProductsTable] = useState(false);
  const isDemo = mode === "demo";
  const { validRange, filteredSales, total, units, dailySales, topProducts, average } = summarizeCounterSales(sales, from, to);

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

  const graphSales = dailySales.slice(0, 7).reverse();
  const highestDay = graphSales.reduce((highest, [, day]) => day.total > highest ? day.total : highest, BigInt(0));
  const highestUnits = topProducts[0]?.[1].units ?? BigInt(0);

  return <div className={styles.page}>
    <div className={styles.heading}>
      <div><h1>Sales &amp; reports</h1><p>See what sold and review counter activity.</p></div>
      <div className={report.headingActions}><Link href={`${rootPath}/pos`} className={report.posLink}>Counter POS <ArrowRight size={16} aria-hidden="true" /></Link>{!isDemo && <button type="button" className={styles.secondary} onClick={() => void reload()} disabled={loading}><RefreshCw size={16} aria-hidden="true" />{loading ? "Refreshing…" : "Refresh data"}</button>}</div>
    </div>
    <div className={styles.info}><ReceiptText size={19} aria-hidden="true" /><p>{isDemo ? "Demo totals only. No real payment, sales history, or cloud data is shown here." : "Counter sales only. Membership and walk-in payments, refunds, and reversals are not included. Refresh for the latest records."}</p></div>

    <section className={`${styles.panel} ${report.filterPanel}`} aria-labelledby="date-filter-title">
      <div><h2 id="date-filter-title">Date range</h2><p>Filter counter sales using Philippine time. Leave blank to show all records.</p></div>
      <div className={report.dateFields}>
        <label>From<input type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} /></label>
        <label>To<input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} /></label>
        {(from || to) && <button type="button" className={report.clearFilter} onClick={() => { setFrom(""); setTo(""); }}>Clear dates</button>}
      </div>
      {!validRange && <p className={styles.error} role="alert">The start date must be on or before the end date.</p>}
    </section>

    <div className={`${styles.metrics} ${report.salesMetrics}`} aria-label="Counter sales summary">
      <div className={report.primaryMetric}><span>Sales total</span><strong>{validRange ? pesos(total) : "—"}</strong><small>For the selected dates</small></div>
      <div><span>Transactions</span><strong>{validRange ? filteredSales.length : "—"}</strong><small>Completed counter sales</small></div>
      <div><span>Items sold</span><strong>{validRange ? units.toLocaleString("en-PH") : "—"}</strong><small>Units across these sales</small></div>
      <div><span>Average sale</span><strong>{validRange ? pesos(average) : "—"}</strong><small>Rounded to the nearest centavo</small></div>
    </div>

    <div className={report.chartGrid}>
      <section className={styles.panel} aria-labelledby="daily-sales-title">
        <div className={styles.panelHeading}><div><h2 id="daily-sales-title">Daily product sales</h2><p>{salesTable ? "All sales dates in the selected range." : "Latest seven recorded sales dates."}</p></div>{dailySales.length > 0 && <button className={styles.chartToggle} type="button" onClick={() => setSalesTable(!salesTable)}>{salesTable ? "View chart" : "View table"}</button>}</div>
        {dailySales.length ? salesTable ? <div className={styles.chartTableScroll}><table className={styles.chartTable}><thead><tr><th scope="col">Date</th><th scope="col">Sales</th><th scope="col">Total</th></tr></thead><tbody>{dailySales.map(([day, summary]) => <tr key={day}><td><time dateTime={day}>{day}</time></td><td>{summary.count}</td><td>{pesos(summary.total)}</td></tr>)}</tbody></table></div> : <div className={styles.barChart} aria-label="Product sales by day">
          <div className={styles.chartScale} aria-hidden="true"><span>{pesos(highestDay)}</span><span>{pesos(highestDay / BigInt(2))}</span><span>₱0</span></div>
          <div className={styles.barPlot}>{graphSales.map(([day, summary]) => <div className={styles.barColumn} role="img" key={day} aria-label={`${day}: ${pesos(summary.total)} across ${summary.count} sales`}>
            <div className={styles.barArea}><div className={styles.chartBar} style={{ height: `${highestDay ? Number((summary.total * BigInt(10000)) / highestDay) / 100 : 0}%` }} title={`${pesos(summary.total)} · ${summary.count} ${summary.count === 1 ? "sale" : "sales"}`} /></div><time dateTime={day}>{day.slice(5)}</time>
          </div>)}</div>
        </div> : <div className={styles.chartEmpty}><strong>{validRange ? "No sales in this date range" : "Choose a valid date range"}</strong><span>Completed counter sales will appear here.</span></div>}
      </section>

      <section className={styles.panel} aria-labelledby="top-products-title">
        <div className={styles.panelHeading}><div><h2 id="top-products-title">Top products</h2><p>Ranked by units sold in the selected dates.</p></div>{topProducts.length > 0 && <button className={styles.chartToggle} type="button" onClick={() => setProductsTable(!productsTable)}>{productsTable ? "View chart" : "View table"}</button>}</div>
        {topProducts.length ? productsTable ? <div className={styles.chartTableScroll}><table className={styles.chartTable}><thead><tr><th scope="col">Product</th><th scope="col">Units</th><th scope="col">Sales</th></tr></thead><tbody>{topProducts.map(([id, item]) => <tr key={id}><td>{item.name}</td><td>{item.units.toLocaleString("en-PH")}</td><td>{pesos(item.total)}</td></tr>)}</tbody></table></div> : <ul className={report.productChart}>{topProducts.slice(0, 7).map(([id, item]) => <li key={id}><div className={report.productLabel}><span>{item.name}</span><strong>{item.units.toLocaleString("en-PH")} sold</strong></div><div className={report.productTrack} aria-hidden="true"><span style={{ width: `${highestUnits ? Number(item.units * BigInt(10000) / highestUnits) / 100 : 0}%` }} /></div></li>)}</ul> : <div className={styles.chartEmpty}><strong>No product sales yet</strong><span>Sold items will appear here after a counter sale.</span></div>}
        {topProducts.length > 7 && !productsTable && <p className={report.chartHint}>Showing the top 7 products. Select “View table” to see all.</p>}
      </section>
    </div>

    <section className={`${styles.panel} ${report.historyPanel}`} aria-labelledby="sales-history">
      <div className={styles.panelHeading}><div><h2 id="sales-history">Sales history</h2><p>Open a sale to see its recorded items and prices.</p></div><span className={report.recordCount}>{filteredSales.length} {filteredSales.length === 1 ? "sale" : "sales"}</span></div>
      {filteredSales.length ? <div className={report.salesList}>{filteredSales.map((sale) => <details className={report.sale} key={sale.id}>
        <summary><span className={report.receiptIcon}><ReceiptText size={18} aria-hidden="true" /></span><span className={report.saleDetails}><strong>{displayDate(sale.createdAt)}</strong><small>{sale.lines.reduce((sum, line) => sum + BigInt(line.quantity), BigInt(0)).toLocaleString("en-PH")} items</small></span><strong className={report.saleAmount}>{pesos(BigInt(sale.totalCentavos))}</strong><span className={report.expandHint} aria-hidden="true">Details</span></summary>
        <ul className={report.saleLines}>{sale.lines.map((line) => <li key={line.productId}><span>{line.quantity} × {line.name}<small>{pesos(BigInt(line.priceCentavos))} each</small></span><strong>{pesos(BigInt(line.quantity) * BigInt(line.priceCentavos))}</strong></li>)}</ul>
      </details>)}</div> : <div className={styles.chartEmpty}><strong>{validRange ? "No sales found" : "Choose a valid date range"}</strong><span>{validRange ? "Try another date range or record a counter sale." : "Sales history will appear here for your selected dates."}</span></div>}
    </section>

    <section className={styles.panel} aria-labelledby="member-analytics-title">
      <div className={styles.panelHeading}><div><h2 id="member-analytics-title">Members today</h2><p>Based on saved term dates in Philippine time; the sales date filter does not apply.</p></div><Link href={`${rootPath}/members`} className={report.memberLink}>View members <ArrowRight size={15} aria-hidden="true" /></Link></div>
      <div className={report.memberMetrics}><div><strong>{members.length}</strong><span>Registered</span></div><div><strong>{statuses.current}</strong><span>Current term</span></div><div><strong>{statuses.upcoming}</strong><span>Upcoming</span></div><div><strong>{statuses.ended}</strong><span>Ended</span></div><div><strong>{renewals}</strong><span>Renewals recorded</span></div></div>
      {members.length > 0 && <><div className={styles.memberChart} role="img" aria-label={`${statuses.current} current, ${statuses.upcoming} upcoming, and ${statuses.ended} ended memberships`}><span className={styles.chartCurrent} style={{ flexGrow: statuses.current }} /><span className={styles.chartUpcoming} style={{ flexGrow: statuses.upcoming }} /><span className={styles.chartEnded} style={{ flexGrow: statuses.ended }} /></div><ul className={styles.chartLegend}><li><span className={styles.chartCurrent} aria-hidden="true" />Current <strong>{statuses.current}</strong></li><li><span className={styles.chartUpcoming} aria-hidden="true" />Upcoming <strong>{statuses.upcoming}</strong></li><li><span className={styles.chartEnded} aria-hidden="true" />Ended <strong>{statuses.ended}</strong></li></ul></>}
      <p className={report.memberNote}>Start and expiry dates are inclusive. Grace periods and pauses are not included.</p>
    </section>
  </div>;
}
