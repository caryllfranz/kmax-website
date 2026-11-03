import type { Sale } from "./demo-store";

const manilaDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" });

function offsetDay(day: string, offset: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function summarizeCounterSales(sales: Sale[], today: string) {
  const todaySales: Sale[] = [];
  let todayTotal = BigInt(0);
  const startOfMonth = offsetDay(today, -29);
  const soldItems = new Map<string, { name: string; quantity: bigint }>();
  const salesDays = Array.from({ length: 7 }, (_, index) => ({ date: offsetDay(today, index - 6), total: BigInt(0) }));
  const dayTotals = new Map(salesDays.map((entry) => [entry.date, entry]));
  let hasRecentSales = false;

  for (const sale of sales) {
    const saleDay = manilaDate.format(new Date(sale.createdAt));
    if (saleDay === today) {
      todaySales.push(sale);
      todayTotal += BigInt(sale.totalCentavos);
    }
    const entry = dayTotals.get(saleDay);
    if (entry) {
      entry.total += BigInt(sale.totalCentavos);
      hasRecentSales = true;
    }
    if (saleDay >= startOfMonth && saleDay <= today) for (const line of sale.lines) {
      const item = soldItems.get(line.productId) ?? { name: line.name, quantity: BigInt(0) };
      item.quantity += BigInt(line.quantity);
      soldItems.set(line.productId, item);
    }
  }

  todaySales.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const topItems = [...soldItems.entries()].sort((a, b) => a[1].quantity === b[1].quantity ? a[1].name.localeCompare(b[1].name) : a[1].quantity > b[1].quantity ? -1 : 1).slice(0, 5);
  return {
    todaySales,
    todayTotal,
    salesDays,
    hasRecentSales,
    topItems,
    mostSold: topItems[0]?.[1].quantity ?? BigInt(0),
    maxDailySale: salesDays.reduce((max, entry) => entry.total > max ? entry.total : max, BigInt(0)),
  };
}
