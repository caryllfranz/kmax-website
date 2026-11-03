"use client";

import { PackagePlus, Plus, Search, X } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { useAdminDemo } from "@/components/admin/demo-store";
import styles from "@/components/admin/retail.module.css";

function peso(centavos: number) {
  return `₱${Math.floor(centavos / 100).toLocaleString("en-PH")}.${String(centavos % 100).padStart(2, "0")}`;
}

function displayMoment(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
  }).format(new Date(value));
}

export default function InventoryPage() {
  const { mode, products, movements, addProduct, adjustStock } = useAdminDemo();
  const isDemo = mode === "demo";
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [addError, setAddError] = useState("");
  const [adjustError, setAdjustError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState<"product" | "adjustment" | null>(null);
  const [productRetryLocked, setProductRetryLocked] = useState(false);
  const [adjustRetryLocked, setAdjustRetryLocked] = useState(false);
  const savingRef = useRef(false);
  const selectRef = useRef<HTMLSelectElement>(null);
  const visibleProducts = products.filter((product) => product.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const selected = products.find((product) => product.id === selectedId);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(data.get("price") ?? "").trim());
    if (!match) { setAddError("Enter a price using up to two decimal places."); return; }
    const priceCentavos = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
    if (!Number.isSafeInteger(priceCentavos)) { setAddError("The price is too large."); return; }
    savingRef.current = true;
    setSaving("product");
    setNotice("");
    try {
      const result = await addProduct({ name: String(data.get("name") ?? ""), priceCentavos, stock: Number(data.get("stock")) });
      if (!result.ok) { setAddError(result.error ?? "Could not add this product."); setProductRetryLocked(Boolean(result.retrySamePayload)); return; }
      form.reset();
      setAddError("");
      setProductRetryLocked(false);
      setShowAdd(false);
      setNotice(isDemo ? "Sample product added for this session." : "Product added.");
    } catch {
      setAddError(isDemo ? "Could not add this sample product." : "The request could not be confirmed. Check the records, then retry with the same details.");
      if (!isDemo) setProductRetryLocked(true);
    } finally {
      savingRef.current = false;
      setSaving(null);
    }
  }

  async function handleAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    if (!selected && !adjustRetryLocked) { setAdjustError("Select a product to adjust."); return; }
    savingRef.current = true;
    setSaving("adjustment");
    setNotice("");
    try {
      const result = await adjustStock(selectedId, Number(data.get("change")), String(data.get("reason") ?? ""));
      if (!result.ok) { setAdjustError(result.error ?? "Could not adjust stock."); setAdjustRetryLocked(Boolean(result.retrySamePayload)); return; }
      form.reset();
      setSelectedId("");
      setAdjustError("");
      setAdjustRetryLocked(false);
      setNotice(isDemo ? "Sample stock adjusted for this session." : "Stock adjustment recorded.");
    } catch {
      setAdjustError(isDemo ? "Could not adjust sample stock." : "The request could not be confirmed. Check the records, then retry with the same details.");
      if (!isDemo) setAdjustRetryLocked(true);
    } finally {
      savingRef.current = false;
      setSaving(null);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <div><span className={styles.kicker}>Counter operations</span><h1>Inventory</h1><p>{isDemo ? "Review sample products and practice stock adjustments." : "Review products and record stock changes."}</p></div>
        <button className={styles.primaryButton} type="button" aria-expanded={showAdd} aria-controls="add-product" disabled={saving !== null || productRetryLocked} onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? <X size={17} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}{showAdd ? "Close form" : "Add product"}
        </button>
      </div>
      <div className={styles.demoInfo}>{isDemo ? "Demo only: products, prices, and stock are fictional and reset when the page is refreshed." : "Stock changes and their reasons are recorded in stock history. If a request cannot be confirmed, check the history and retry with the same details."}</div>
      {notice && <div className={styles.notice} role="status">{notice}<button type="button" aria-label="Dismiss message" onClick={() => setNotice("")}><X size={16} /></button></div>}
      <section className={`${styles.panel} ${styles.formPanel}`} id="add-product" aria-labelledby="add-product-heading" hidden={!showAdd}>
          <div className={styles.panelHeading}><div><h2 id="add-product-heading">{isDemo ? "Add a sample product" : "Add a product"}</h2><p>{isDemo ? "Use fictional items and prices only." : "Enter the product, selling price, and starting stock."}</p></div></div>
          <form className={styles.addProductForm} onSubmit={handleAdd} aria-busy={saving === "product"}>
            <label>Product name<input name="name" autoComplete="off" maxLength={100} placeholder={isDemo ? "Sample product" : "Product name"} disabled={saving !== null} readOnly={productRetryLocked} required /></label>
            <label>Price (₱)<input name="price" type="text" inputMode="decimal" placeholder="0.00" disabled={saving !== null} readOnly={productRetryLocked} required /></label>
            <label>Starting stock<input name="stock" type="number" min="0" step="1" placeholder="0" disabled={saving !== null} readOnly={productRetryLocked} required /></label>
            {addError && <p className={styles.error} role="alert">{addError}</p>}
            {productRetryLocked && <p className={styles.error}>These details are locked for a safe retry. Keep this page open while you check the records.</p>}
            <div className={styles.formActions}><button className={styles.primaryButton} type="submit" disabled={saving !== null}>{saving === "product" ? "Saving…" : isDemo ? "Add sample product" : "Add product"}</button></div>
          </form>
      </section>

      <div className={styles.inventoryLayout}>
        <section className={`${styles.panel} ${styles.tablePanel}`} aria-labelledby="inventory-heading">
          <div className={styles.panelHeading}>
            <div><h2 id="inventory-heading">Products and stock</h2><p>{visibleProducts.length} {isDemo ? "sample " : ""}{visibleProducts.length === 1 ? "product" : "products"}</p></div>
            <label className={styles.search}><Search size={17} aria-hidden="true" /><span className={styles.srOnly}>Search products</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" /></label>
          </div>
          <p className={styles.tableHint}>Swipe to see all columns</p>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead><tr><th scope="col">Product</th><th scope="col">{isDemo ? "Sample price" : "Price"}</th><th scope="col">In stock</th><th scope="col"><span className={styles.srOnly}>Action</span></th></tr></thead>
              <tbody>{visibleProducts.map((product) => (
                <tr key={product.id}>
                  <th scope="row">{product.name}</th>
                  <td>{peso(product.priceCentavos)}</td>
                  <td><span className={product.stock === 0 ? styles.stockEmpty : styles.stockCount}>{product.stock === 0 ? "Out of stock" : product.stock}</span></td>
                  <td><button type="button" className={styles.textButton} aria-label={`Adjust stock for ${product.name}`} disabled={saving !== null || adjustRetryLocked} onClick={() => { setSelectedId(product.id); selectRef.current?.focus(); }}>Adjust</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {visibleProducts.length === 0 && <p className={styles.empty}>No products match that search.</p>}
        </section>

        <div className={styles.inventorySide}>
          <section className={styles.panel} aria-labelledby="adjust-heading">
            <div className={styles.panelHeading}><div><h2 id="adjust-heading">{isDemo ? "Adjust sample stock" : "Adjust stock"}</h2><p>Use a positive number to add stock or a negative number to remove it.</p></div><PackagePlus size={20} aria-hidden="true" /></div>
            <form className={styles.adjustForm} onSubmit={handleAdjustment} aria-busy={saving === "adjustment"}>
              <label>Product<select ref={selectRef} value={selectedId} onChange={(event) => setSelectedId(event.target.value)} disabled={saving !== null || adjustRetryLocked} required><option value="">{isDemo ? "Select a sample product" : "Select a product"}</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
              {selected && <p className={styles.selectedStock}>Current {isDemo ? "sample " : ""}stock: <strong>{selected.stock}</strong></p>}
              <label>Quantity change<input name="change" type="number" step="1" placeholder="For example, 5 or -2" disabled={saving !== null} readOnly={adjustRetryLocked} required /></label>
              <label>Reason<input name="reason" type="text" maxLength={160} placeholder={isDemo ? "For example, sample delivery" : "For example, delivery"} disabled={saving !== null} readOnly={adjustRetryLocked} required /></label>
              {adjustError && <p className={styles.error} role="alert">{adjustError}</p>}
              {adjustRetryLocked && <p className={styles.error}>These details are locked for a safe retry. Keep this page open while you check the history.</p>}
              <button className={styles.secondaryButton} type="submit" disabled={saving !== null} style={saving !== null ? { opacity: .6, cursor: "wait" } : undefined}>{saving === "adjustment" ? "Saving…" : isDemo ? "Save sample adjustment" : "Save adjustment"}</button>
            </form>
          </section>

          <section className={styles.panel} aria-labelledby="movements-heading">
            <div className={styles.panelHeading}><div><h2 id="movements-heading">Stock history</h2><p>{isDemo ? "Changes from this demo session." : "Recorded stock changes."}</p></div></div>
            {movements.length ? <ul className={styles.movementList}>{movements.map((movement) => <li key={movement.id}><div><strong>{movement.productName}</strong><span>{movement.reason} · {displayMoment(movement.createdAt)}</span></div><strong className={movement.change > 0 ? styles.increase : styles.decrease}>{movement.change > 0 ? "+" : ""}{movement.change}</strong></li>)}</ul> : <p className={styles.emptyInline}>No stock changes yet.</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
