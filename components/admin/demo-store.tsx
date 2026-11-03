"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";

export type MembershipTerm = { startsOn: string; endsOn: string };
export type Member = MembershipTerm & { id: string; name: string; mobile: string; history: MembershipTerm[] };
export type Product = { id: string; name: string; priceCentavos: number; stock: number };
export type SaleLine = { productId: string; name: string; quantity: number; priceCentavos: number };
export type Sale = { id: string; createdAt: string; totalCentavos: number; lines: SaleLine[] };
export type Session = { id: string; title: string; category: "Group class" | "Taekwondo" | "Coaching"; date: string; time: string; coach: string };
export type StockMovement = { id: string; productName: string; change: number; reason: string; createdAt: string };
export type WalkIn = { id: string; name: string; visitDate: string; amountCentavos: number; paidAt: string | null; paymentMethod: string | null };
export type NewWalkIn = { name: string; visitDate: string; amountCentavos: number; paid: boolean; paymentMethod: string | null };
export type Result = { ok: boolean; error?: string; retrySamePayload?: boolean };
export type DemoState = { members: Member[]; products: Product[]; sales: Sale[]; sessions: Session[]; movements: StockMovement[]; walkIns: WalkIn[] };
export type NewMember = MembershipTerm & { name: string; mobile: string };
export type NewProduct = Omit<Product, "id">;
export type NewSession = Omit<Session, "id">;
export type CartItem = { productId: string; quantity: number; priceCentavos: number };
export type PendingOperation = "member" | "renewal" | "product" | "adjustment" | "sale" | "schedule" | "walkin" | "walkin_payment";

export function validMobile(value: string) {
  const digits = value.replace(/[^0-9]/g, "");
  return /^[0-9+(). -]+$/.test(value) && digits.length >= 7 && digits.length <= 15;
}

export function manilaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function dayOffset(days: number) {
  const date = new Date(`${manilaToday()}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function initialData(): DemoState {
  return {
    members: [
      { id: "member-1", name: "Mika Santos (sample)", mobile: "09XX XXX 0001", startsOn: dayOffset(-20), endsOn: dayOffset(10), history: [] },
      { id: "member-2", name: "Andi Cruz (sample)", mobile: "09XX XXX 0002", startsOn: dayOffset(-50), endsOn: dayOffset(-5), history: [] },
      { id: "member-3", name: "Sam Reyes (sample)", mobile: "09XX XXX 0003", startsOn: dayOffset(-8), endsOn: dayOffset(22), history: [] },
    ],
    products: [
      { id: "product-1", name: "Water (sample)", priceCentavos: 3500, stock: 18 },
      { id: "product-2", name: "Sports drink (sample)", priceCentavos: 6500, stock: 9 },
      { id: "product-3", name: "Gym shirt (sample)", priceCentavos: 45000, stock: 4 },
    ],
    sales: [],
    sessions: [
      { id: "session-1", title: "Group class (sample)", category: "Group class", date: dayOffset(1), time: "18:00", coach: "To be confirmed" },
      { id: "session-2", title: "Taekwondo (sample)", category: "Taekwondo", date: dayOffset(2), time: "17:00", coach: "To be confirmed" },
      { id: "session-3", title: "Coaching time (sample)", category: "Coaching", date: dayOffset(3), time: "10:00", coach: "To be confirmed" },
    ],
    movements: [],
    walkIns: [],
  };
}

export type AdminStore = DemoState & {
  mode: "demo" | "live";
  rootPath: "/admin" | "/staff";
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  pendingOperations: PendingOperation[];
  acknowledgePending: (operation: PendingOperation) => Result;
  addMember: (input: NewMember) => Promise<Result>;
  renewMember: (id: string, input: MembershipTerm) => Promise<Result>;
  addProduct: (input: NewProduct) => Promise<Result>;
  adjustStock: (id: string, change: number, reason: string) => Promise<Result>;
  checkout: (items: CartItem[], paymentMethod?: string) => Promise<Result>;
  addSession: (input: NewSession) => Promise<Result>;
  updateSession: (id: string, input: NewSession) => Promise<Result>;
  removeSession: (id: string) => Promise<Result>;
  addWalkIn: (input: NewWalkIn) => Promise<Result>;
  payWalkIn: (id: string, paymentMethod: string) => Promise<Result>;
};
export const AdminContext = createContext<AdminStore | null>(null);
const id = () => crypto.randomUUID();
const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const validTerm = (term: MembershipTerm) => validDate(term.startsOn) && validDate(term.endsOn) && term.endsOn >= term.startsOn;

export function AdminDemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(initialData);
  const current = useRef(state);
  const update = (next: DemoState) => { current.current = next; setState(next); };

  async function addMember(input: NewMember): Promise<Result> {
    const name = input.name.trim();
    const mobile = input.mobile.trim();
    if (!name || !validMobile(mobile) || !validTerm(input)) return { ok: false, error: "Enter a name, a mobile number with 7–15 digits, and valid membership dates." };
    if (current.current.members.some((member) => member.mobile.replace(/\D/g, "") === mobile.replace(/\D/g, ""))) return { ok: false, error: "A sample member with this mobile number already exists." };
    update({ ...current.current, members: [...current.current.members, { ...input, id: id(), name, mobile, history: [] }] });
    return { ok: true };
  }

  async function renewMember(memberId: string, term: MembershipTerm): Promise<Result> {
    const member = current.current.members.find((item) => item.id === memberId);
    if (!member || !validTerm(term)) return { ok: false, error: "Enter valid start and expiry dates." };
    update({ ...current.current, members: current.current.members.map((item) => item.id === memberId ? { ...item, ...term, history: [...item.history, { startsOn: item.startsOn, endsOn: item.endsOn }] } : item) });
    return { ok: true };
  }

  async function addProduct(input: NewProduct): Promise<Result> {
    if (!input.name.trim() || !Number.isSafeInteger(input.priceCentavos) || input.priceCentavos < 0 || !Number.isSafeInteger(input.stock) || input.stock < 0) return { ok: false, error: "Enter a product name, a valid price, and a whole-number stock count." };
    update({ ...current.current, products: [...current.current.products, { ...input, name: input.name.trim(), id: id() }] });
    return { ok: true };
  }

  async function adjustStock(productId: string, change: number, reason: string): Promise<Result> {
    const product = current.current.products.find((item) => item.id === productId);
    if (!product || !Number.isSafeInteger(change) || change === 0 || !reason.trim()) return { ok: false, error: "Enter a whole-number adjustment and a reason." };
    if (!Number.isSafeInteger(product.stock + change) || product.stock + change < 0) return { ok: false, error: "The adjustment would make stock negative or exceed the supported amount." };
    update({ ...current.current, products: current.current.products.map((item) => item.id === productId ? { ...item, stock: item.stock + change } : item), movements: [{ id: id(), productName: product.name, change, reason: reason.trim(), createdAt: new Date().toISOString() }, ...current.current.movements] });
    return { ok: true };
  }

  async function checkout(items: CartItem[]): Promise<Result> {
    if (!items.length || new Set(items.map((item) => item.productId)).size !== items.length) return { ok: false, error: "Add products to the sale first." };
    const lines: SaleLine[] = [];
    for (const item of items) {
      const product = current.current.products.find((entry) => entry.id === item.productId);
      if (!product || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > product.stock || item.priceCentavos !== product.priceCentavos) return { ok: false, error: "Check prices and quantities against the available sample stock." };
      lines.push({ productId: product.id, name: product.name, quantity: item.quantity, priceCentavos: product.priceCentavos });
    }
    const createdAt = new Date().toISOString();
    const totalCentavos = lines.reduce((sum, line) => sum + line.quantity * line.priceCentavos, 0);
    if (!Number.isSafeInteger(totalCentavos)) return { ok: false, error: "The sample sale total is too large." };
    const sale: Sale = { id: id(), createdAt, lines, totalCentavos };
    update({ ...current.current, sales: [sale, ...current.current.sales], products: current.current.products.map((product) => ({ ...product, stock: product.stock - (items.find((item) => item.productId === product.id)?.quantity ?? 0) })), movements: [...lines.map((line) => ({ id: id(), productName: line.name, change: -line.quantity, reason: "Sample sale", createdAt })), ...current.current.movements] });
    return { ok: true };
  }

  async function addSession(input: NewSession): Promise<Result> {
    if (!input.title.trim() || !validDate(input.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) return { ok: false, error: "Enter a session name, date, and time." };
    update({ ...current.current, sessions: [...current.current.sessions, { ...input, id: id(), title: input.title.trim(), coach: input.coach.trim() || "To be confirmed" }] });
    return { ok: true };
  }

  async function updateSession(sessionId: string, input: NewSession): Promise<Result> {
    if (!current.current.sessions.some((session) => session.id === sessionId) || !input.title.trim() || !validDate(input.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) return { ok: false, error: "Enter a session name, date, and time." };
    update({ ...current.current, sessions: current.current.sessions.map((session) => session.id === sessionId ? { ...input, id: sessionId, title: input.title.trim(), coach: input.coach.trim() || "To be confirmed" } : session) });
    return { ok: true };
  }

  async function removeSession(sessionId: string): Promise<Result> { update({ ...current.current, sessions: current.current.sessions.filter((session) => session.id !== sessionId) }); return { ok: true }; }
  async function addWalkIn(input: NewWalkIn): Promise<Result> {
    const method = input.paymentMethod?.trim() || null;
    if (!input.name.trim() || !validDate(input.visitDate) || !Number.isSafeInteger(input.amountCentavos) || input.amountCentavos < 0 || (input.paid && !method) || (!input.paid && method)) return { ok: false, error: "Enter a name, date, valid amount, and payment details." };
    update({ ...current.current, walkIns: [{ id: id(), name: input.name.trim(), visitDate: input.visitDate, amountCentavos: input.amountCentavos, paidAt: input.paid ? new Date().toISOString() : null, paymentMethod: method }, ...current.current.walkIns] });
    return { ok: true };
  }

  async function payWalkIn(visitId: string, paymentMethod: string): Promise<Result> {
    const visit = current.current.walkIns.find((item) => item.id === visitId);
    if (!visit || visit.paidAt || !paymentMethod.trim()) return { ok: false, error: "Choose an unpaid visit and enter a payment method." };
    update({ ...current.current, walkIns: current.current.walkIns.map((item) => item.id === visitId ? { ...item, paymentMethod: paymentMethod.trim(), paidAt: new Date().toISOString() } : item) });
    return { ok: true };
  }
  return <AdminContext.Provider value={{ ...state, mode: "demo", rootPath: "/admin", loading: false, error: null, reload: async () => {}, pendingOperations: [], acknowledgePending: () => ({ ok: true }), addMember, renewMember, addProduct, adjustStock, checkout, addSession, updateSession, removeSession, addWalkIn, payWalkIn }}>{children}</AdminContext.Provider>;
}

export function useAdminDemo() {
  const store = useContext(AdminContext);
  if (!store) throw new Error("useAdminDemo must be used inside AdminDemoProvider");
  return store;
}
