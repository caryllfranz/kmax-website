import test from "node:test";
import assert from "node:assert/strict";
import { keysetRows, readData } from "../components/admin/live-queries.ts";

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

test("keyset paging reads past server-imposed short pages", async () => {
  const source = Array.from({ length: 7 }, (_, i) => ({ id: uuid(i + 1) }));
  const result = await keysetRows(async (after) => ({ data: source.filter((row) => !after || row.id > after).slice(0, 2), error: null }));
  assert.deepEqual(result, source);
});

test("keyset paging rejects repeated, out-of-order and invalid results", async () => {
  await assert.rejects(keysetRows(async () => ({ data: [{ id: uuid(1) }], error: null })), /unique key/);
  await assert.rejects(keysetRows(async () => ({ data: [{ id: uuid(2) }, { id: uuid(1) }], error: null })), /unique key/);
  await assert.rejects(keysetRows(async () => ({ data: null, error: new Error("network") })), /Could not load/);
});

test("to-one parent joins retain all sale lines and membership terms", async () => {
  const memberId = uuid(9001);
  const saleId = uuid(9002);
  const termRows = Array.from({ length: 1001 }, (_, i) => ({ id: uuid(i + 1), member_id: memberId, starts_on: "2026-01-01", ends_on: "2026-12-31", created_at: "2026-01-01T00:00:00Z", members: { id: memberId, full_name: "Sample", mobile: "09123456789", archived: false } }));
  const lineRows = Array.from({ length: 1001 }, (_, i) => ({ id: uuid(i + 1), sale_id: saleId, product_id: uuid(i + 1), product_name: "Sample", quantity: 1, unit_price_centavos: 100, sales: { id: saleId, created_at: "2026-01-01T00:00:00Z", total_centavos: 100100 } }));
  const tables = { membership_terms: termRows, sale_items: lineRows, products: [], schedule_entries: [], stock_movements: [], walk_in_visits: [] };
  const client = {
    from(table) {
      let after = null;
      let limit = Infinity;
      return {
        select() { return this; }, eq() { return this; }, neq() { return this; }, order() { return this; },
        limit(n) { limit = n; return this; }, gt(_key, value) { after = value; return this; },
        then(resolve, reject) {
          return Promise.resolve({ data: tables[table].filter((row) => !after || row.id > after).slice(0, Math.min(limit, 137)), error: null }).then(resolve, reject);
        },
      };
    },
  };
  const data = await readData(client);
  assert.equal(data.members.length, 1);
  assert.equal(data.members[0].history.length, 1000);
  assert.equal(data.sales.length, 1);
  assert.equal(data.sales[0].lines.length, 1001);
  assert.equal(data.sales[0].totalCentavos, 100100);
});

test("incomplete sale lines fail closed instead of reporting an inaccurate total", async () => {
  const saleId = uuid(2);
  const row = { id: uuid(1), sale_id: saleId, product_id: uuid(3), product_name: "Sample", quantity: 1, unit_price_centavos: 100, sales: { id: saleId, created_at: "2026-01-01T00:00:00Z", total_centavos: 200 } };
  const client = { from(table) {
    let after = null;
    return {
      select() { return this; }, eq() { return this; }, neq() { return this; }, order() { return this; }, limit() { return this; }, gt(_key, value) { after = value; return this; },
      then(resolve, reject) { return Promise.resolve({ data: table === "sale_items" && !after ? [row] : [], error: null }).then(resolve, reject); },
    };
  } };
  await assert.rejects(readData(client), /incomplete or inconsistent/);
});
