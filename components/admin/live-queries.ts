import type { SupabaseClient } from "@supabase/supabase-js";
import type { DemoState, Member, Sale, Session } from "./demo-store";

type Row = Record<string, unknown>;
type QueryResult = { data: unknown; error: unknown };
const pageSize = 500;

function text(row: Row, key: string): string {
  if (typeof row[key] !== "string") throw new Error(`Invalid ${key} in staff data`);
  return row[key] as string;
}

function integer(row: Row, key: string, nonnegative = false): number {
  const value = row[key];
  const number = typeof value === "number" ? value : typeof value === "string" && /^-?\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(number) || (nonnegative && number < 0)) throw new Error(`Invalid ${key} in staff data`);
  return number;
}

function joined(row: Row, key: string): Row {
  const value = row[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Invalid ${key} in staff data`);
  return value as Row;
}

/** Read every available page; a server-side page cap may be smaller than our request. */
export async function keysetRows(fetch: (after: string | null) => PromiseLike<QueryResult>): Promise<Row[]> {
  const rows: Row[] = [];
  let after: string | null = null;
  for (;;) {
    const response = await fetch(after);
    if (response.error || !Array.isArray(response.data)) throw new Error("Could not load staff data");
    if (response.data.length === 0) return rows;
    for (const value of response.data) {
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid staff data");
      const row = value as Row;
      const id = text(row, "id");
      if (after !== null && id <= after) throw new Error("Staff data is not ordered by a unique key");
      after = id;
      rows.push(row);
    }
  }
}

function manilaParts(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid schedule date");
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

export async function readData(client: SupabaseClient): Promise<DemoState> {
  // Each term/sale line embeds its single parent. This avoids PostgREST's
  // embedded-collection row cap while reading each parent and child together.
  const [termRows, productRows, lineRows, sessionRows, movementRows, walkInRows] = await Promise.all([
    keysetRows((after) => {
      let query = client.from("membership_terms").select("id,member_id,starts_on,ends_on,plan_name,created_at,members!inner(id,full_name,mobile,archived)").eq("members.archived", false).order("id").limit(pageSize);
      if (after) query = query.gt("id", after);
      return query;
    }),
    keysetRows((after) => {
      let query = client.from("products").select("id,name,price_centavos,stock_on_hand").eq("active", true).order("id").limit(pageSize);
      if (after) query = query.gt("id", after);
      return query;
    }),
    keysetRows((after) => {
      let query = client.from("sale_items").select("id,sale_id,product_id,product_name,quantity,unit_price_centavos,sales!inner(id,created_at,total_centavos)").order("id").limit(pageSize);
      if (after) query = query.gt("id", after);
      return query;
    }),
    keysetRows((after) => {
      let query = client.from("schedule_entries").select("id,title,category,coach_name,starts_at,ends_at,status").neq("status", "cancelled").order("id").limit(pageSize);
      if (after) query = query.gt("id", after);
      return query;
    }),
    keysetRows((after) => {
      let query = client.from("stock_movements").select("id,quantity_change,reason,created_at,products!inner(name)").order("id").limit(pageSize);
      if (after) query = query.gt("id", after);
      return query;
    }),
    keysetRows((after) => {
      let query = client.from("walk_in_visits").select("id,full_name,visit_date,amount_centavos,paid_at,payment_method").order("id").limit(pageSize);
      if (after) query = query.gt("id", after);
      return query;
    }),
  ]);

  const terms = new Map<string, { member: Row; startsOn: string; endsOn: string; planName: string | null; createdAt: string; id: string }[]>();
  for (const row of termRows) {
    const memberId = text(row, "member_id");
    const member = joined(row, "members");
    if (text(member, "id") !== memberId) throw new Error("Invalid membership parent");
    const group = terms.get(memberId) ?? [];
    if (row.plan_name !== null && typeof row.plan_name !== "string") throw new Error("Invalid membership plan in staff data");
    group.push({ member, startsOn: text(row, "starts_on"), endsOn: text(row, "ends_on"), planName: row.plan_name, createdAt: text(row, "created_at"), id: text(row, "id") });
    terms.set(memberId, group);
  }
  const members: Member[] = [...terms].map(([id, group]) => {
    const recorded = group.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    const member = recorded[0].member;
    return { id, name: text(member, "full_name"), mobile: text(member, "mobile"), startsOn: recorded[0].startsOn, endsOn: recorded[0].endsOn, planName: recorded[0].planName, history: recorded.slice(1).map(({ startsOn, endsOn, planName }) => ({ startsOn, endsOn, planName })) };
  });

  const products = productRows.map((row) => ({ id: text(row, "id"), name: text(row, "name"), priceCentavos: integer(row, "price_centavos", true), stock: integer(row, "stock_on_hand", true) }));
  const groupedSales = new Map<string, Sale>();
  for (const row of lineRows) {
    const parent = joined(row, "sales");
    const saleId = text(row, "sale_id");
    if (text(parent, "id") !== saleId) throw new Error("Invalid sale parent");
    const existing = groupedSales.get(saleId);
    const createdAt = text(parent, "created_at");
    const totalCentavos = integer(parent, "total_centavos", true);
    if (existing && (existing.createdAt !== createdAt || existing.totalCentavos !== totalCentavos)) throw new Error("Inconsistent sale data");
    const sale = existing ?? { id: saleId, createdAt, totalCentavos, lines: [] };
    sale.lines.push({ productId: text(row, "product_id"), name: text(row, "product_name"), quantity: integer(row, "quantity", true), priceCentavos: integer(row, "unit_price_centavos", true) });
    groupedSales.set(saleId, sale);
  }
  const sales = [...groupedSales.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const sale of sales) {
    const sum = sale.lines.reduce((total, line) => total + BigInt(line.quantity) * BigInt(line.priceCentavos), BigInt(0));
    if (sum !== BigInt(sale.totalCentavos)) throw new Error("Sale data is incomplete or inconsistent");
  }

  const sessions: Session[] = sessionRows.map((row) => {
    const category = text(row, "category");
    const mapped: Session["category"] = category === "group_class" ? "Group class" : category === "taekwondo" ? "Taekwondo" : category === "coaching" ? "Coaching" : (() => { throw new Error("Invalid schedule category"); })();
    const end = row.ends_at === null ? null : manilaParts(text(row, "ends_at"));
    return { id: text(row, "id"), title: text(row, "title"), category: mapped, ...manilaParts(text(row, "starts_at")), endDate: end?.date ?? "", endTime: end?.time ?? "", coach: typeof row.coach_name === "string" ? row.coach_name : "" };
  }).sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));

  const movements = movementRows.map((row) => ({ id: text(row, "id"), productName: text(joined(row, "products"), "name"), change: integer(row, "quantity_change"), reason: text(row, "reason"), createdAt: text(row, "created_at") })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const walkIns = walkInRows.map((row) => {
    if (row.paid_at !== null && typeof row.paid_at !== "string") throw new Error("Invalid walk-in payment date");
    if (row.payment_method !== null && typeof row.payment_method !== "string") throw new Error("Invalid walk-in payment method");
    return { id: text(row, "id"), name: text(row, "full_name"), visitDate: text(row, "visit_date"), amountCentavos: integer(row, "amount_centavos", true), paidAt: row.paid_at, paymentMethod: row.payment_method };
  }).sort((a, b) => b.visitDate.localeCompare(a.visitDate) || b.id.localeCompare(a.id));
  return { members, products, sales, sessions, movements, walkIns };
}
