"use client";

import { ArrowRight, BarChart3, Minus, Package, Plus, ReceiptText, Search, ShoppingBag, ShoppingCart, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { manilaToday, useAdminDemo } from "@/components/admin/demo-store";
import { summarizeCounterSales } from "@/components/admin/pos-analytics";
import styles from "@/components/admin/retail.module.css";
import visual from "@/components/admin/pos-visual.module.css";

function peso(centavos: number) {
  return `₱${Math.floor(centavos / 100).toLocaleString("en-PH")}.${String(centavos % 100).padStart(2, "0")}`;
}
function pesoTotal(centavos: bigint) {
  return `₱${(centavos / BigInt(100)).toLocaleString("en-PH")}.${String(centavos % BigInt(100)).padStart(2, "0")}`;
}
const saleTime = new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" });
const shortDate = new Intl.DateTimeFormat("en-PH", { month: "2-digit", day: "2-digit", timeZone: "UTC" });

export default function PosPage() {
  const { products, sales, mode, rootPath, checkout } = useAdminDemo();
  const isDemo = mode === "demo";
  const today = manilaToday();
  const { todaySales, todayTotal, salesDays, topItems, mostSold, maxDailySale, hasRecentSales } = summarizeCounterSales(sales, today);
  const totalStock = products.reduce((sum, product) => sum + BigInt(product.stock), BigInt(0));
  const stockPreview = [...products].sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name)).slice(0, 5);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [retryLines, setRetryLines] = useState<Array<(typeof products)[number] & { quantity: number }> | null>(null);
  const visibleProducts = products.filter((product) => product.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const lines = retryLines ?? products.flatMap((product) => cart[product.id] ? [{ ...product, quantity: cart[product.id] }] : []);
  let total = 0;
  let safeTotal = true;
  for (const line of lines) {
    const lineTotal = line.priceCentavos * line.quantity;
    if (!Number.isSafeInteger(lineTotal) || !Number.isSafeInteger(total + lineTotal)) safeTotal = false;
    else total += lineTotal;
  }
  const validStock = retryLines !== null || lines.every((line) => line.quantity <= line.stock);

  function changeQuantity(productId: string, change: number) {
    if (saving || retryLines) return;
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    setCart((current) => {
      const next = { ...current };
      const quantity = (next[productId] ?? 0) + change;
      if (quantity <= 0) delete next[productId];
      else if (quantity <= product.stock) next[productId] = quantity;
      return next;
    });
    setError("");
    setMessage("");
  }

  async function handleCheckout() {
    if (!safeTotal || !validStock || savingRef.current) return;
    if (!isDemo && !paymentMethod.trim()) { setError("Enter the payment method used at the counter."); return; }
    savingRef.current = true;
    setSaving(true);
    try {
      const result = await checkout(lines.map((line) => ({ productId: line.id, quantity: line.quantity, priceCentavos: line.priceCentavos })), paymentMethod.trim());
      if (!result.ok) { if (result.retrySamePayload) setRetryLines(lines); setError(result.error ?? "Could not complete the sale. Check sales history before retrying."); return; }
      setCart({});
      setRetryLines(null);
      setPaymentMethod("");
      setError("");
      setMessage(isDemo ? `Sample sale of ${peso(total)} recorded for this session.` : `Sale of ${peso(total)} recorded.`);
    } catch {
      if (!isDemo) setRetryLines(lines);
      setError(isDemo ? "Could not complete the sample sale." : "The sale could not be confirmed. Check sales history, then retry the same sale.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <div><span className={styles.kicker}>Counter operations</span><h1>Products &amp; sales</h1><p>{isDemo ? "Explore sample counter sales and stock." : "Record a sale and see your counter activity."}</p></div>
        <nav className={visual.pageLinks} aria-label="Counter shortcuts"><Link href={`${rootPath}/inventory`}>Manage inventory <ArrowRight size={15} aria-hidden="true" /></Link><Link href={`${rootPath}/reports`}>Sales reports <ArrowRight size={15} aria-hidden="true" /></Link></nav>
      </div>
      {isDemo && <div className={styles.demoInfo}>Demo only: prices and products are fictional. No payment is processed, and sales disappear when the demo is refreshed.</div>}
      {message && <div className={styles.notice} role="status">{message}<button type="button" aria-label="Dismiss message" onClick={() => setMessage("")}><X size={16} /></button></div>}
      <div className={styles.summary} aria-label="Counter overview">
        <div className={styles.summaryHero}><span>Counter sales today</span><strong>{pesoTotal(todayTotal)}</strong><small>{todaySales.length} {todaySales.length === 1 ? "transaction" : "transactions"} · POS only</small></div>
        <div><span>Products</span><strong>{products.length}</strong><small>In the catalog</small></div>
        <div><span>Items in stock</span><strong>{totalStock.toLocaleString("en-PH")}</strong><small>Units available</small></div>
        <div><span>Out of stock</span><strong>{products.filter((product) => product.stock === 0).length}</strong><small>Products unavailable</small></div>
      </div>
      <div className={styles.posLayout}>
        <section className={styles.panel} aria-labelledby="products-heading">
          <div className={styles.panelHeading}>
            <div><h2 id="products-heading">Counter sale</h2><p>Tap a product to add it to the order.</p></div>
            <label className={styles.search}><Search size={17} aria-hidden="true" /><span className={styles.srOnly}>Search products</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" /></label>
          </div>
          <div className={styles.productGrid}>
            {visibleProducts.map((product) => {
              const quantity = cart[product.id] ?? 0;
              const unavailable = saving || retryLines !== null || product.stock === 0 || quantity >= product.stock;
              return (
                <button className={`${styles.productCard} ${visual.productCard}`} key={product.id} type="button" onClick={() => changeQuantity(product.id, 1)} disabled={unavailable} aria-label={unavailable ? `${product.name}, unavailable` : `Add ${product.name} to sale`}>
                  <span className={styles.productIcon}><ShoppingBag size={20} aria-hidden="true" /></span>
                  {quantity > 0 && <span className={visual.inOrder} aria-hidden="true">{quantity} in order</span>}
                  <span className={styles.productName}>{product.name}</span>
                  <strong>{peso(product.priceCentavos)}</strong>
                  <span className={`${styles.stockText} ${product.stock === 0 ? styles.stockEmpty : styles.stockCount}`}>{product.stock === 0 ? "Out of stock" : `${product.stock} in stock`}</span>
                </button>
              );
            })}
          </div>
          {visibleProducts.length === 0 && <p className={styles.empty}>{products.length === 0 ? <>No products yet. <Link className={styles.textButton} href={`${rootPath}/inventory`}>Add products in Inventory</Link>.</> : "No products match that search."}</p>}
        </section>

        <section className={`${styles.panel} ${styles.cartPanel}`} aria-labelledby="cart-heading">
          <div className={styles.panelHeading}><div><h2 id="cart-heading">{isDemo ? "Sample order" : "Current order"}</h2><p>Review items before completing.</p></div><ShoppingCart size={20} aria-hidden="true" /></div>
          {lines.length ? (
            <ul className={styles.cartList}>
              {lines.map((line) => (
                <li className={styles.cartItem} key={line.id}>
                  <div className={styles.cartName}><strong>{line.name}</strong><span>{peso(line.priceCentavos)} each</span></div>
                  <div className={styles.cartBottom}>
                    <div className={styles.quantity}>
                      <button type="button" disabled={saving || retryLines !== null} aria-label={`Remove one ${line.name}`} onClick={() => changeQuantity(line.id, -1)}><Minus size={15} /></button>
                      <span aria-label={`Quantity ${line.quantity}`}>{line.quantity}</span>
                      <button type="button" aria-label={`Add one ${line.name}`} disabled={saving || retryLines !== null || line.quantity >= line.stock} onClick={() => changeQuantity(line.id, 1)}><Plus size={15} /></button>
                    </div>
                    <strong>{Number.isSafeInteger(line.priceCentavos * line.quantity) ? peso(line.priceCentavos * line.quantity) : "Amount too large"}</strong>
                  </div>
                </li>
              ))}
            </ul>
          ) : <div className={styles.emptyCart}><ShoppingCart size={24} aria-hidden="true" /><p>No items yet. Choose a product to start a {isDemo ? "sample " : ""}sale.</p></div>}
          <div className={styles.cartTotal}><span>Total</span><strong>{safeTotal ? peso(total) : "Amount too large"}</strong></div>
          {!isDemo && <label className={styles.paymentField}>Payment method <span>(record only)</span><input value={paymentMethod} disabled={saving || retryLines !== null} maxLength={64} onChange={(event) => setPaymentMethod(event.target.value)} placeholder="Enter the method used" /></label>}
          {!validStock && <p className={styles.error} role="alert">A quantity exceeds current stock. Reduce it before checkout.</p>}
          {!safeTotal && <p className={styles.error} role="alert">The total is too large. Reduce the quantities.</p>}
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button className={styles.primaryButton} type="button" disabled={saving || !lines.length || !safeTotal || !validStock} onClick={handleCheckout}>{saving ? "Saving…" : retryLines ? "Retry same sale" : isDemo ? "Complete sample sale" : "Record sale"}</button>
          <p className={styles.smallNote}>{isDemo ? "No payment or receipt is created." : "Payment is recorded only; no payment is processed here."}</p>
        </section>
      </div>
      <div className={visual.supportGrid}>
        <section className={`${styles.panel} ${visual.supportPanel}`} aria-labelledby="pos-stock-heading">
          <div className={styles.panelHeading}><div><h2 id="pos-stock-heading">Inventory</h2><p>Products with the fewest units on hand.</p></div><Link className={visual.panelLink} href={`${rootPath}/inventory`}>Manage stock <ArrowRight size={15} aria-hidden="true" /></Link></div>
          {stockPreview.length ? <div className={visual.stockTableWrap}><table className={visual.stockTable}><thead><tr><th scope="col">Product</th><th scope="col">Price</th><th scope="col">In stock</th><th scope="col">Status</th></tr></thead><tbody>{stockPreview.map((product) => <tr key={product.id}><th scope="row"><span className={visual.itemIcon}><Package size={16} aria-hidden="true" /></span>{product.name}</th><td>{peso(product.priceCentavos)}</td><td>{product.stock}</td><td><span className={`${styles.stockText} ${product.stock ? styles.stockCount : styles.stockEmpty}`}>{product.stock ? "In stock" : "Out of stock"}</span></td></tr>)}</tbody></table></div> : <div className={visual.empty}><Package size={20} aria-hidden="true" /><p>No products yet. Add products in Inventory to start a sale.</p><Link href={`${rootPath}/inventory`}>Go to inventory <ArrowRight size={15} aria-hidden="true" /></Link></div>}
        </section>
        <section className={`${styles.panel} ${visual.supportPanel}`} aria-labelledby="pos-sales-heading">
          <div className={styles.panelHeading}><div><h2 id="pos-sales-heading">Today’s sales</h2><p>Newest counter transactions, Philippine time.</p></div><Link className={visual.panelLink} href={`${rootPath}/reports`}>View all <ArrowRight size={15} aria-hidden="true" /></Link></div>
          {todaySales.length ? <ol className={visual.salesList}>{todaySales.slice(0, 5).map((sale) => <li key={sale.id}><span className={visual.itemIcon}><ReceiptText size={16} aria-hidden="true" /></span><div className={visual.saleInfo}><strong>{sale.lines.map((line) => `${line.quantity} × ${line.name}`).join(", ")}</strong><time dateTime={sale.createdAt}>{saleTime.format(new Date(sale.createdAt))}</time></div><b>{peso(sale.totalCentavos)}</b></li>)}</ol> : <div className={visual.empty}><ReceiptText size={20} aria-hidden="true" /><p>Sales recorded today will appear here.</p></div>}
        </section>
      </div>
      <div className={visual.chartGrid}>
        <section className={`${styles.panel} ${visual.chartPanel}`} aria-labelledby="pos-top-heading">
          <div className={styles.panelHeading}><div><h2 id="pos-top-heading">Top products</h2><p>Units sold in the last 30 days.</p></div><BarChart3 size={19} aria-hidden="true" /></div>
          {topItems.length ? <ul className={visual.topList}>{topItems.map(([id, item]) => <li key={id}><span>{item.name}</span><div className={visual.topTrack} aria-hidden="true"><div style={{ width: `${Number(item.quantity * BigInt(100) / mostSold)}%` }} /></div><strong>{item.quantity.toLocaleString("en-PH")}</strong></li>)}</ul> : <div className={visual.empty}><BarChart3 size={20} aria-hidden="true" /><p>Product rankings will appear after a sale.</p></div>}
        </section>
        <section className={`${styles.panel} ${visual.chartPanel}`} aria-labelledby="pos-daily-heading">
          <div className={styles.panelHeading}><div><h2 id="pos-daily-heading">Daily product sales</h2><p>Counter sales for the last 7 days.</p></div><Link className={visual.panelLink} href={`${rootPath}/reports`}>View report <ArrowRight size={15} aria-hidden="true" /></Link></div>
          {hasRecentSales ? <><div className={visual.barChart} role="img" tabIndex={0} aria-label={`Daily counter sales: ${salesDays.map((entry) => `${entry.date} ${pesoTotal(entry.total)}`).join(", ")}`}><div className={visual.scale}><span>{pesoTotal(maxDailySale)}</span><span>₱0</span></div><div className={visual.columns}>{salesDays.map((entry) => <div key={entry.date} className={visual.column}><div className={visual.columnTrack}><span style={{ height: `${maxDailySale ? Number(entry.total * BigInt(10000) / maxDailySale) / 100 : 0}%` }} title={`${entry.date}: ${pesoTotal(entry.total)}`} /></div><time dateTime={entry.date}>{shortDate.format(new Date(`${entry.date}T00:00:00Z`))}</time></div>)}</div></div><p className={visual.chartHint}>Swipe to see all dates.</p></> : <div className={visual.empty}><BarChart3 size={20} aria-hidden="true" /><p>Daily sales will appear after a counter sale is recorded.</p></div>}
        </section>
      </div>
      <p className={visual.note}>Counter sales only. Walk-in and membership payments are recorded separately.</p>
    </div>
  );
}
