"use client";

import { Minus, Plus, Search, ShoppingBag, ShoppingCart, X } from "lucide-react";
import { useRef, useState } from "react";
import { useAdminDemo } from "@/components/admin/demo-store";
import styles from "@/components/admin/retail.module.css";

function peso(centavos: number) {
  return `₱${Math.floor(centavos / 100).toLocaleString("en-PH")}.${String(centavos % 100).padStart(2, "0")}`;
}

export default function PosPage() {
  const { products, mode, checkout } = useAdminDemo();
  const isDemo = mode === "demo";
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
        <div><span className={styles.kicker}>Counter operations</span><h1>Point of sale</h1><p>{isDemo ? "Select sample items to try a counter sale." : "Select products for a counter sale."}</p></div>
      </div>
      {isDemo && <div className={styles.demoInfo}>Demo only: prices and products are fictional. No payment is processed, and sales disappear when the demo is refreshed.</div>}
      {message && <div className={styles.notice} role="status">{message}<button type="button" aria-label="Dismiss message" onClick={() => setMessage("")}><X size={16} /></button></div>}
      <div className={styles.posLayout}>
        <section className={styles.panel} aria-labelledby="products-heading">
          <div className={styles.panelHeading}>
            <div><h2 id="products-heading">Products</h2><p>{visibleProducts.length} {isDemo ? "sample " : ""}{visibleProducts.length === 1 ? "item" : "items"}</p></div>
            <label className={styles.search}><Search size={17} aria-hidden="true" /><span className={styles.srOnly}>Search products</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" /></label>
          </div>
          <div className={styles.productGrid}>
            {visibleProducts.map((product) => {
              const quantity = cart[product.id] ?? 0;
              const unavailable = saving || retryLines !== null || product.stock === 0 || quantity >= product.stock;
              return (
                <button className={styles.productCard} key={product.id} type="button" onClick={() => changeQuantity(product.id, 1)} disabled={unavailable} aria-label={unavailable ? `${product.name}, unavailable` : `Add ${product.name} to sale`}>
                  <span className={styles.productIcon}><ShoppingBag size={20} aria-hidden="true" /></span>
                  <span className={styles.productName}>{product.name}</span>
                  <strong>{peso(product.priceCentavos)}</strong>
                  <span className={styles.stockText}>{product.stock === 0 ? "Out of stock" : `${product.stock} in stock`}</span>
                </button>
              );
            })}
          </div>
          {visibleProducts.length === 0 && <p className={styles.empty}>No products match that search.</p>}
        </section>

        <section className={`${styles.panel} ${styles.cartPanel}`} aria-labelledby="cart-heading">
          <div className={styles.panelHeading}><div><h2 id="cart-heading">{isDemo ? "Sample sale" : "Current sale"}</h2><p>Review items before completing.</p></div><ShoppingCart size={20} aria-hidden="true" /></div>
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
    </div>
  );
}
