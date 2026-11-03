"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AdminContext, type AdminStore, type DemoState, type PendingOperation, type Result } from "@/components/admin/demo-store";
import { readData } from "@/components/admin/live-queries";
import { scheduleInstants } from "@/components/admin/schedule-time";

const emptyData: DemoState = { members: [], products: [], sales: [], sessions: [], movements: [], walkIns: [] };
const categories = { "Group class": "group_class", Taekwondo: "taekwondo", Coaching: "coaching" } as const;
const operations: PendingOperation[] = ["member", "renewal", "product", "adjustment", "sale", "schedule", "walkin", "walkin_payment"];

function pendingKey(operation: PendingOperation): { key: string; existing: boolean } {
  const slot = `kmax:pending:${operation}`;
  const stored = sessionStorage.getItem(slot);
  if (stored) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(stored)) throw new Error("Invalid pending request key");
    return { key: stored, existing: true };
  }
  const key = crypto.randomUUID();
  sessionStorage.setItem(slot, key);
  if (sessionStorage.getItem(slot) !== key) throw new Error("Could not keep the request key");
  return { key, existing: false };
}

function clearPending(operation: PendingOperation) {
  sessionStorage.removeItem(`kmax:pending:${operation}`);
}

function readPending(): PendingOperation[] {
  return operations.filter((operation) => sessionStorage.getItem(`kmax:pending:${operation}`) !== null);
}

async function payloadDigest(payload: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

function definiteDatabaseFailure(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error) || typeof error.code !== "string") return false;
  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  return /^[0-9A-Z]{5}$/.test(error.code) && !/idempotency|request key/i.test(message);
}

function writeError(error: unknown, operation?: PendingOperation): string {
  const message = error && typeof error === "object" && "message" in error && typeof error.message === "string" ? error.message : "";
  if (/idempotency|request key/i.test(message)) return "A previous request may have completed with different details. Check the records and retry the original details, or ask an administrator for help.";
  if (/price.*(changed|match)|expected.*price/i.test(message)) return "A product price changed. Refresh the data and review the sale before trying again.";
  if (/insufficient stock/i.test(message)) return "There is not enough stock. Refresh the data and review the quantities.";
  if (/staff access/i.test(message)) return "Your staff access could not be verified. Sign in again or ask an administrator.";
  return operation
    ? "The request could not be confirmed. Check the records, then retry with the same details; the retry key will be reused."
    : "The change could not be confirmed. Check your connection and staff access, then refresh the data.";
}

function rejectedError(error: unknown): string {
  const message = error && typeof error === "object" && "message" in error && typeof error.message === "string" ? error.message : "";
  if (/price.*(changed|match)|expected.*price/i.test(message)) return "A product price changed. Refresh the data and review the sale before trying again.";
  if (/insufficient stock/i.test(message)) return "There is not enough stock. Refresh the data and review the quantities.";
  if (/staff access/i.test(message)) return "Your staff access could not be verified. Sign in again or ask an administrator.";
  return "The server rejected the change. Check the details and staff access before trying again.";
}

export function LiveAdminProvider({ staffId, children }: { staffId: string; children: ReactNode }) {
  const [data, setData] = useState<DemoState>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>([]);
  const clientRef = useRef<SupabaseClient | null>(null);
  const mounted = useRef(false);
  const ready = useRef(false);
  const writing = useRef(false);
  const generation = useRef(0);
  const dataRef = useRef(data);
  const payloads = useRef<Partial<Record<PendingOperation, string>>>({});
  const saleSnapshot = useRef<{ intent: string; lines: { product_id: string; quantity: number; expected_unit_price_centavos: number }[] } | null>(null);

  const syncPending = useCallback(() => {
    try { if (mounted.current) setPendingOperations(readPending()); } catch { /* Writes remain blocked if safe retry storage is unavailable. */ }
  }, []);

  const reload = useCallback(async () => {
    const client = clientRef.current;
    const current = ++generation.current;
    if (!client) {
      if (mounted.current) { setError("Supabase is not configured. Ask an administrator to check the setup."); setLoading(false); }
      return;
    }
    if (mounted.current) setLoading(true);
    try {
      const { data: identity, error: authError } = await client.auth.getUser();
      if (authError || identity.user?.id !== staffId) throw new Error("Staff session is unavailable");
      syncPending();
      const next = await readData(client);
      if (mounted.current && current === generation.current) {
        dataRef.current = next;
        ready.current = true;
        setData(next);
        setError(null);
      }
    } catch {
      if (mounted.current && current === generation.current) {
        ready.current = false;
        dataRef.current = emptyData;
        setData(emptyData);
        setError("Could not load staff data. Check your connection and staff access, then try again.");
      }
    } finally {
      if (mounted.current && current === generation.current) setLoading(false);
    }
  }, [staffId, syncPending]);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    try { clientRef.current = createSupabaseBrowserClient(); } catch { clientRef.current = null; }
    void Promise.resolve().then(() => { if (!cancelled) return reload(); });
    return () => { cancelled = true; mounted.current = false; ready.current = false; generation.current += 1; clientRef.current = null; };
  }, [reload]);

  async function runWrite(action: (client: SupabaseClient, key?: string) => PromiseLike<{ error: unknown; data?: unknown }>, operation?: PendingOperation, payload?: unknown): Promise<Result> {
    const client = clientRef.current;
    if (!client || !ready.current) return { ok: false, error: "Refresh the staff data before making a change." };
    if (writing.current) return { ok: false, error: "Please wait for the current request to finish." };
    writing.current = true;
    try {
      const { data: identity, error: authError } = await client.auth.getUser();
      if (authError || identity.user?.id !== staffId) return { ok: false, error: "Your staff session could not be verified. Sign in again." };
      let key: string | undefined;
      let existing = false;
      if (operation) {
        let fingerprint: string;
        try { fingerprint = await payloadDigest(payload); } catch { return { ok: false, error: "A secure browser connection is required for safe retries." }; }
        const previous = payloads.current[operation];
        if (previous && previous !== fingerprint) return { ok: false, error: "A previous request is unconfirmed. Check the records and retry with the original details, or ask an administrator for help.", retrySamePayload: true };
        try {
          const pending = pendingKey(operation);
          key = pending.key;
          existing = pending.existing;
          if (existing && !previous) return { ok: false, error: "A request from an earlier page session is unconfirmed. Check the records and use the reconciliation notice before starting another request.", retrySamePayload: true };
        } catch { return { ok: false, error: "Safe retry storage is unavailable. Enable browser session storage before continuing." }; }
        payloads.current[operation] = fingerprint;
      }
      const response = await action(client, key);
      if (response.error || ("data" in response && response.data == null)) {
        if (operation && !existing && definiteDatabaseFailure(response.error)) {
          try { clearPending(operation); delete payloads.current[operation]; } catch { return { ok: false, error: "The request was rejected, but its retry key could not be cleared. Ask an administrator to review this browser session.", retrySamePayload: true }; }
          return { ok: false, error: rejectedError(response.error) };
        }
        return { ok: false, error: writeError(response.error, operation), retrySamePayload: Boolean(operation) };
      }
      let cleared = true;
      if (operation) { try { clearPending(operation); delete payloads.current[operation]; } catch { cleared = false; } }
      await reload();
      if (!cleared && mounted.current) setError("The change was saved, but the retry key could not be cleared. Ask an administrator to review this browser session.");
      return { ok: true };
    } catch (cause) {
      return { ok: false, error: writeError(cause, operation), retrySamePayload: Boolean(operation) };
    } finally {
      writing.current = false;
      syncPending();
    }
  }

  const store: AdminStore = {
    ...data, mode: "live", rootPath: "/staff", loading, error, reload, pendingOperations,
    acknowledgePending(operation) {
      if (writing.current) return { ok: false, error: "Wait for the current request to finish first." };
      if (!operations.includes(operation)) return { ok: false, error: "Unknown pending operation." };
      try {
        clearPending(operation);
        delete payloads.current[operation];
        if (operation === "sale") saleSnapshot.current = null;
        syncPending();
        return { ok: true };
      } catch {
        return { ok: false, error: "The pending key could not be cleared. Ask an administrator to review this browser session." };
      }
    },
    async addMember(input) {
      const payload = { p_full_name: input.name.trim(), p_mobile: input.mobile.trim(), p_starts_on: input.startsOn, p_ends_on: input.endsOn, p_plan_name: input.planName?.trim() || null };
      return runWrite((client, key) => client.rpc("create_member_with_term", { p_idempotency_key: key, ...payload }), "member", payload);
    },
    async renewMember(id, term) {
      const payload = { p_member_id: id, p_starts_on: term.startsOn, p_ends_on: term.endsOn, p_plan_name: term.planName?.trim() || null };
      return runWrite((client, key) => client.rpc("append_membership_term", { p_idempotency_key: key, ...payload }), "renewal", payload);
    },
    async addProduct(input) {
      if (!Number.isSafeInteger(input.priceCentavos) || input.priceCentavos < 0 || !Number.isSafeInteger(input.stock) || input.stock < 0) return { ok: false, error: "Enter a valid price and whole-number starting stock." };
      const payload = { p_name: input.name.trim(), p_price_centavos: input.priceCentavos, p_initial_stock: input.stock };
      return runWrite((client, key) => client.rpc("create_product_with_stock", { p_idempotency_key: key, ...payload }), "product", payload);
    },
    async adjustStock(id, change, reason) {
      if (!Number.isSafeInteger(change) || change === 0 || !reason.trim()) return { ok: false, error: "Enter a whole-number adjustment and a reason." };
      const payload = { p_product_id: id, p_quantity_change: change, p_reason: reason.trim() };
      return runWrite((client, key) => client.rpc("record_stock_adjustment", { p_idempotency_key: key, ...payload }), "adjustment", payload);
    },
    async checkout(items, paymentMethod) {
      if (!paymentMethod?.trim()) return { ok: false, error: "Enter the payment method before completing the sale." };
      if (!items.length || new Set(items.map((item) => item.productId)).size !== items.length) return { ok: false, error: "Add products to the sale first." };
      const intent = JSON.stringify({ items: [...items].sort((a, b) => a.productId.localeCompare(b.productId)), paymentMethod: paymentMethod.trim() });
      let lines = saleSnapshot.current?.lines;
      if (saleSnapshot.current && saleSnapshot.current.intent !== intent) return { ok: false, error: "A previous sale is unconfirmed. Retry the original sale or reconcile it first.", retrySamePayload: true };
      if (!lines) {
        const checked = items.map((item) => {
          const product = dataRef.current.products.find((entry) => entry.id === item.productId);
          if (!product || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > product.stock || !Number.isSafeInteger(item.priceCentavos) || item.priceCentavos < 0) return null;
          return { product_id: product.id, quantity: item.quantity, expected_unit_price_centavos: item.priceCentavos };
        });
        if (checked.some((line) => !line)) return { ok: false, error: "Check quantities against current stock." };
        lines = checked.filter((line): line is NonNullable<typeof line> => line !== null).sort((a, b) => a.product_id.localeCompare(b.product_id));
        saleSnapshot.current = { intent, lines };
      }
      const payload = { p_payment_method: paymentMethod.trim(), p_items: lines };
      const result = await runWrite((client, key) => client.rpc("complete_sale", { p_idempotency_key: key, ...payload }), "sale", payload);
      if (!result.retrySamePayload) saleSnapshot.current = null;
      return result;
    },
    async addSession(input) {
      const times = scheduleInstants(input.date, input.time, input.endDate, input.endTime, true);
      if (!times || !input.title.trim()) return { ok: false, error: "Enter a session name and valid start and end dates and times." };
      const payload = { p_title: input.title.trim(), p_category: categories[input.category], p_starts_at: times.startsAt, p_ends_at: times.endsAt, p_coach_name: input.coach.trim() || null };
      return runWrite((client, key) => client.rpc("create_schedule_entry", { p_idempotency_key: key, ...payload }), "schedule", payload);
    },
    async updateSession(id, input) {
      const previous = dataRef.current.sessions.find((session) => session.id === id);
      if (!previous) return { ok: false, error: "Session not found. Refresh the schedule and try again." };
      const times = scheduleInstants(input.date, input.time, input.endDate, input.endTime, Boolean(previous.endTime));
      if (!times || !input.title.trim()) return { ok: false, error: "Enter a session name and valid start and end dates and times." };
      return runWrite((client) => {
        let query = client.from("schedule_entries").update({ title: input.title.trim(), category: categories[input.category], starts_at: times.startsAt, ends_at: times.endsAt, coach_name: input.coach.trim() || null }).eq("id", id).neq("status", "cancelled");
        if (!previous.endTime && !times.endsAt) query = query.is("ends_at", null);
        return query.select("id").maybeSingle();
      });
    },
    async removeSession(id) {
      return runWrite((client) => client.from("schedule_entries").update({ status: "cancelled" }).eq("id", id).select("id").maybeSingle());
    },
    async addWalkIn(input) {
      const payload = { p_full_name: input.name.trim(), p_visit_date: input.visitDate, p_amount_centavos: input.amountCentavos, p_paid: input.paid, p_payment_method: input.paymentMethod?.trim() || null };
      return runWrite((client, key) => client.rpc("create_walk_in_visit", { p_idempotency_key: key, ...payload }), "walkin", payload);
    },
    async payWalkIn(id, paymentMethod) {
      const payload = { p_visit_id: id, p_payment_method: paymentMethod.trim() };
      return runWrite((client, key) => client.rpc("pay_walk_in_visit", { p_idempotency_key: key, ...payload }), "walkin_payment", payload);
    },
  };

  return <AdminContext.Provider value={store}>{children}</AdminContext.Provider>;
}
