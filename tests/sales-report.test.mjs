import test from "node:test";
import assert from "node:assert/strict";
import { manilaDate, pesos, summarizeCounterSales } from "../components/admin/sales-report.ts";

const sale = (id, createdAt, price, quantity = 1) => ({
  id,
  createdAt,
  totalCentavos: price * quantity,
  lines: [{ productId: "water", name: "Sample water", quantity, priceCentavos: price }],
});

test("sales date filters and daily totals use Philippine time and inclusive dates", () => {
  const beforeMidnight = sale("a", "2027-01-01T15:59:00Z", 100);
  const afterMidnight = sale("b", "2027-01-01T16:00:00Z", 250, 2);
  assert.equal(manilaDate(beforeMidnight.createdAt), "2027-01-01");
  assert.equal(manilaDate(afterMidnight.createdAt), "2027-01-02");
  const result = summarizeCounterSales([beforeMidnight, afterMidnight], "2027-01-02", "2027-01-02");
  assert.deepEqual(result.filteredSales.map((entry) => entry.id), ["b"]);
  assert.equal(result.total, 500n);
  assert.equal(result.units, 2n);
  assert.deepEqual(result.dailySales, [["2027-01-02", { count: 1, total: 500n }]]);
  assert.equal(result.topProducts[0][1].total, 500n);
});

test("empty and invalid ranges never invent sales or divide by zero", () => {
  const empty = summarizeCounterSales([], "", "");
  assert.equal(empty.total, 0n);
  assert.equal(empty.units, 0n);
  assert.equal(empty.average, 0n);
  assert.deepEqual(empty.dailySales, []);
  assert.equal(pesos(empty.total), "₱0.00");
  const invalid = summarizeCounterSales([sale("a", "2027-01-01T00:00:00Z", 100)], "2027-02-01", "2027-01-01");
  assert.equal(invalid.validRange, false);
  assert.equal(invalid.filteredSales.length, 0);
});

test("totals remain exact beyond JavaScript's safe integer and average rounds to a centavo", () => {
  const max = Number.MAX_SAFE_INTEGER;
  const result = summarizeCounterSales([sale("a", "2027-01-01T00:00:00Z", max), sale("b", "2027-01-01T01:00:00Z", max)], "", "");
  assert.equal(result.total, 18014398509481982n);
  assert.equal(result.topProducts[0][1].total, 18014398509481982n);
  assert.equal(pesos(result.total), "₱180,143,985,094,819.82");
  const fractionalAverage = summarizeCounterSales([sale("a", "2027-01-01T00:00:00Z", 1), sale("b", "2027-01-01T01:00:00Z", 0)], "", "");
  assert.equal(fractionalAverage.average, 1n);
});
