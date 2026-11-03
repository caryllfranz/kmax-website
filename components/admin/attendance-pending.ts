export type AttendancePending = { key: string; sessionId: string; kind: "add" | "remove"; attendanceId?: string };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseAttendancePending(raw: string | null): AttendancePending | null {
  if (!raw) return null;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object") throw new Error("Invalid pending request");
  const pending = value as AttendancePending;
  if (typeof pending.key !== "string" || !uuid.test(pending.key) || typeof pending.sessionId !== "string" || !uuid.test(pending.sessionId)
    || !["add", "remove"].includes(pending.kind) || (pending.kind === "remove" && (!pending.attendanceId || !uuid.test(pending.attendanceId)))) {
    throw new Error("Invalid pending request");
  }
  return { key: pending.key, sessionId: pending.sessionId, kind: pending.kind, ...(pending.kind === "remove" ? { attendanceId: pending.attendanceId } : {}) };
}

export function canAttemptAttendance(pending: AttendancePending | null, sessionId: string, kind: AttendancePending["kind"], attendanceId: string | undefined, lostPayload: boolean) {
  if (kind === "add" && lostPayload) return false;
  return !pending || (pending.sessionId === sessionId && pending.kind === kind && (kind !== "remove" || pending.attendanceId === attendanceId));
}
