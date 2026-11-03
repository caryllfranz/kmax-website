function manilaInstant(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const value = new Date(`${date}T${time}:00+08:00`);
  if (Number.isNaN(value.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(value);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  if (`${get("year")}-${get("month")}-${get("day")}` !== date || `${get("hour")}:${get("minute")}` !== time) return null;
  return value.toISOString();
}

export function scheduleInstants(date: string, time: string, endDate: string, endTime: string, requireEnd: boolean): { startsAt: string; endsAt: string | null } | null {
  const startsAt = manilaInstant(date, time);
  if (!startsAt) return null;
  if (!endTime) return requireEnd || endDate ? null : { startsAt, endsAt: null };
  const endsAt = manilaInstant(endDate || date, endTime);
  if (!endsAt || endsAt <= startsAt) return null;
  return { startsAt, endsAt };
}
