import type { Sale } from "./demo-store";

const manilaDay = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Manila" });

export function manilaDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = Object.fromEntries(manilaDay.formatToParts(date).map(({ type, value: part }) => [type, part]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function pesos(centavos: bigint) {
  return `₱${(centavos / BigInt(100)).toLocaleString("en-PH")}.${String(centavos % BigInt(100)).padStart(2, "0")}`;
}

export function summarizeCounterSales(sales: Sale[], from: string, to: string) {
  const validRange = !from || !to || from <= to;
  const filteredSales = validRange ? sales.filter((sale) => {
    const day = manilaDate(sale.createdAt);
    if (!day) return !from && !to;
    return (!from || day >= from) && (!to || day <= to);
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];

  let total = BigInt(0);
  let units = BigInt(0);
  const items = new Map<string, { name: string; units: bigint; total: bigint }>();
  const days = new Map<string, { count: number; total: bigint }>();
  for (const sale of filteredSales) {
    total += BigInt(sale.totalCentavos);
    const day = manilaDate(sale.createdAt);
    if (day) {
      const current = days.get(day) ?? { count: 0, total: BigInt(0) };
      days.set(day, { count: current.count + 1, total: current.total + BigInt(sale.totalCentavos) });
    }
    for (const line of sale.lines) {
      units += BigInt(line.quantity);
      const current = items.get(line.productId) ?? { name: line.name, units: BigInt(0), total: BigInt(0) };
      items.set(line.productId, { ...current, units: current.units + BigInt(line.quantity), total: current.total + BigInt(line.quantity) * BigInt(line.priceCentavos) });
    }
  }
  const dailySales = [...days.entries()].sort(([a], [b]) => b.localeCompare(a));
  const topProducts = [...items.entries()].sort((a, b) => a[1].units === b[1].units ? a[1].name.localeCompare(b[1].name) : a[1].units > b[1].units ? -1 : 1);
  const average = filteredSales.length ? (total + BigInt(Math.floor(filteredSales.length / 2))) / BigInt(filteredSales.length) : BigInt(0);
  return { validRange, filteredSales, total, units, dailySales, topProducts, average };
}
