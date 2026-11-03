import test from "node:test";
import assert from "node:assert/strict";
import { summarizeCounterSales } from "../components/admin/pos-analytics.ts";

const sale = (id, createdAt, totalCentavos, productId, quantity = 1) => ({
  id, createdAt, totalCentavos,
  lines: [{ productId, name: productId, quantity, priceCentavos: 1 }],
});

test("today uses Manila midnight and sums centavos exactly", () => {
  const result = summarizeCounterSales([
    sale("before", "2027-01-31T15:59:59Z", 50, "water"),
    sale("after", "2027-01-31T16:00:00Z", 9007199254740991, "water"),
    sale("later", "2027-02-01T02:00:00Z", 100, "juice"),
  ], "2027-02-01");
  assert.deepEqual(result.todaySales.map((entry) => entry.id), ["later", "after"]);
  assert.equal(result.todayTotal, 9007199254741091n);
  assert.equal(result.salesDays.at(-1).total, 9007199254741091n);
  assert.equal(result.salesDays.at(-2).total, 50n);
});

test("seven-day graph and 30-day product ranking include their first date only", () => {
  const result = summarizeCounterSales([
    sale("seven-start", "2027-01-25T16:00:00Z", 10, "seven", 2),
    sale("before-seven", "2027-01-25T15:59:59Z", 20, "older", 3),
    sale("thirty-start", "2027-01-02T16:00:00Z", 30, "oldest", 4),
    sale("before-thirty", "2027-01-02T15:59:59Z", 40, "excluded", 20),
    sale("future", "2027-02-01T16:00:00Z", 50, "future", 20),
  ], "2027-02-01");
  assert.equal(result.salesDays[0].date, "2027-01-26");
  assert.equal(result.salesDays[0].total, 10n);
  assert.equal(result.salesDays.reduce((sum, entry) => sum + entry.total, 0n), 10n);
  assert.deepEqual(result.topItems.map(([id, entry]) => [id, entry.quantity]), [["oldest", 4n], ["older", 3n], ["seven", 2n]]);
  assert.equal(result.hasRecentSales, true);
});

test("empty data shows no invented sales or products", () => {
  const result = summarizeCounterSales([], "2027-02-01");
  assert.equal(result.todayTotal, 0n);
  assert.equal(result.hasRecentSales, false);
  assert.equal(result.maxDailySale, 0n);
  assert.deepEqual(result.topItems, []);
  assert.equal(result.salesDays.length, 7);
});
