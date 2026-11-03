"use client";

import { useRef, useState, type FormEvent } from "react";
import { CircleDollarSign, UserRoundPlus } from "lucide-react";
import { manilaToday, useAdminDemo } from "@/components/admin/demo-store";
import styles from "@/components/admin/workspace.module.css";

function peso(value: number) {
  return `₱${Math.floor(value / 100).toLocaleString("en-PH")}.${String(value % 100).padStart(2, "0")}`;
}

function parseAmount(value: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const amount = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(amount) ? amount : null;
}

export default function WalkInsPage() {
  const { walkIns, addWalkIn, payWalkIn, mode } = useAdminDemo();
  const isDemo = mode === "demo";
  const [name, setName] = useState("");
  const [visitDate, setVisitDate] = useState(manilaToday);
  const [amount, setAmount] = useState("");
  const [paid, setPaid] = useState(false);
  const [method, setMethod] = useState("");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [createLocked, setCreateLocked] = useState(false);
  const [paymentLocked, setPaymentLocked] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    const amountCentavos = parseAmount(amount);
    if (amountCentavos === null || !name.trim() || !visitDate || (paid && !method.trim())) {
      setError("Enter a name, visit date, valid amount, and payment method if paid.");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setNotice("");
    try {
      const result = await addWalkIn({ name: name.trim(), visitDate, amountCentavos, paid, paymentMethod: paid ? method.trim() : null });
      if (!result.ok) {
        setCreateLocked(Boolean(result.retrySamePayload));
        setError(result.error ?? "Could not record the visit.");
        return;
      }
      setName(""); setVisitDate(manilaToday()); setAmount(""); setPaid(false); setMethod("");
      setCreateLocked(false); setError("");
      setNotice(isDemo ? "Sample walk-in recorded for this demo." : "Walk-in visit recorded.");
    } catch {
      setCreateLocked(!isDemo);
      setError("The request could not be confirmed. Check the records before retrying.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function markPaid(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paymentId || !paymentMethod.trim() || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setNotice("");
    try {
      const result = await payWalkIn(paymentId, paymentMethod.trim());
      if (!result.ok) {
        setPaymentLocked(Boolean(result.retrySamePayload));
        setError(result.error ?? "Could not record the payment.");
        return;
      }
      setPaymentId(null); setPaymentMethod(""); setPaymentLocked(false); setError("");
      setNotice(isDemo ? "Sample payment recorded for this demo." : "Payment recorded.");
    } catch {
      setPaymentLocked(!isDemo);
      setError("The payment could not be confirmed. Check the records before retrying.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const visits = [...walkIns].sort((a, b) => b.visitDate.localeCompare(a.visitDate));
  const selected = walkIns.find((visit) => visit.id === paymentId);

  return <div className={styles.page}>
    <div className={styles.heading}>
      <div><span className={styles.kicker}>Staff workspace</span><h1>Walk-ins</h1><p>Record visits from people who are not members.</p></div>
    </div>
    <div className={styles.info}><UserRoundPlus size={19} aria-hidden="true" /><p>{isDemo ? "Demo records are fictional and reset on refresh. " : "Enter the amount agreed at the counter; no fee is set automatically. "}Payment details are recorded here; this does not process payments.</p></div>
    {notice && <p className={styles.success} role="status">{notice}</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.layout}>
      <section className={styles.panel} aria-labelledby="visits-heading">
        <div className={styles.panelHeading}><div><h2 id="visits-heading">Walk-in visits</h2><p>Payment status is recorded by staff.</p></div><span className={styles.count}>{visits.length} shown</span></div>
        {visits.length ? <div className={styles.list}>{visits.map((visit) => <article className={styles.row} key={visit.id}>
          <div className={styles.dateBlock}><strong>{visit.visitDate}</strong><span>{visit.paidAt ? "Paid" : "Unpaid"}</span></div>
          <div className={styles.rowBody}><strong>{visit.name}</strong><span>{peso(visit.amountCentavos)}{visit.paymentMethod ? ` · ${visit.paymentMethod}` : ""}</span></div>
          {!visit.paidAt && <button type="button" className={styles.secondary} disabled={saving || paymentLocked || createLocked} onClick={() => { setPaymentId(visit.id); setPaymentMethod(""); setError(""); }}>Record payment</button>}
        </article>)}</div> : <p className={styles.empty}>No walk-in visits recorded yet.</p>}
      </section>
      <div>
        {paymentId ? <section className={styles.panel} aria-labelledby="payment-heading">
          <div className={styles.panelHeading}><div><h2 id="payment-heading">Record payment</h2><p>{selected ? `${selected.name} · ${peso(selected.amountCentavos)}` : "Check the visit before recording payment."}</p></div><CircleDollarSign size={20} aria-hidden="true" /></div>
          <form className={styles.form} onSubmit={markPaid}>
            <label>Payment method<input required maxLength={64} value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} readOnly={paymentLocked} disabled={saving} placeholder="Method used at the counter" /></label>
            {paymentLocked && <p className={styles.error}>The request is unconfirmed. Keep these details unchanged for a safe retry or ask an administrator to review it.</p>}
            <div className={styles.formActions}><button className={styles.primary} type="submit" disabled={saving}>{saving ? "Saving…" : paymentLocked ? "Retry payment" : "Mark paid"}</button><button className={styles.secondary} type="button" disabled={saving || paymentLocked} onClick={() => { setPaymentId(null); setError(""); }}>Cancel</button></div>
          </form>
        </section> : <section className={styles.panel} aria-labelledby="walkin-form-heading">
          <div className={styles.panelHeading}><div><h2 id="walkin-form-heading">Add walk-in</h2><p>{isDemo ? "Use fictional details only." : "Enter the visit and payment details."}</p></div></div>
          <form className={styles.form} onSubmit={create}>
            <label>Full name<input required maxLength={150} value={name} onChange={(event) => setName(event.target.value)} readOnly={createLocked} disabled={saving} /></label>
            <label>Visit date<input required type="date" value={visitDate} onChange={(event) => setVisitDate(event.target.value)} readOnly={createLocked} disabled={saving} /></label>
            <label>Amount (₱)<input required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} readOnly={createLocked} disabled={saving} placeholder="0.00" /></label>
            <label>Payment status<select value={paid ? "paid" : "unpaid"} onChange={(event) => setPaid(event.target.value === "paid")} disabled={saving || createLocked}><option value="unpaid">Unpaid</option><option value="paid">Paid</option></select></label>
            {paid && <label>Payment method<input required maxLength={64} value={method} onChange={(event) => setMethod(event.target.value)} readOnly={createLocked} disabled={saving} placeholder="Method used at the counter" /></label>}
            {createLocked && <p className={styles.error}>The request is unconfirmed. Keep these details unchanged for a safe retry or ask an administrator to review it.</p>}
            <div className={styles.formActions}><button className={styles.primary} type="submit" disabled={saving}>{saving ? "Saving…" : createLocked ? "Retry same visit" : "Record visit"}</button></div>
          </form>
        </section>}
      </div>
    </div>
  </div>;
}
