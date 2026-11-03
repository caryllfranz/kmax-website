"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { keysetRows } from "./live-queries";
import { canAttemptAttendance, parseAttendancePending, type AttendancePending } from "./attendance-pending";
import styles from "./class-attendance.module.css";

type Attendee = { id: string; full_name: string };
const pendingSlot = "kmax:attendance:pending";

function readPending(): AttendancePending | null {
  return parseAttendancePending(sessionStorage.getItem(pendingSlot));
}

function definiteFailure(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error) || typeof error.code !== "string") return false;
  return /^[0-9A-Z]{5}$/.test(error.code);
}

export default function GroupClassAttendance({ sessionId, sessionTitle, mode, onChanged, onDemoCount }: { sessionId: string; sessionTitle: string; mode: "demo" | "live"; onChanged: () => void | Promise<void>; onDemoCount: (sessionId: string, count: number) => void }) {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [name, setName] = useState("");
  const [lockedName, setLockedName] = useState<string | null>(null);
  const [pending, setPending] = useState<AttendancePending | null>(null);
  const [lostPayload, setLostPayload] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [loading, setLoading] = useState(mode === "live");
  const [ready, setReady] = useState(mode === "demo");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const client = useRef<SupabaseClient | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    if (mode === "demo") onDemoCount(sessionId, attendees.length);
  }, [mode, sessionId, attendees.length, onDemoCount]);

  useEffect(() => {
    if (mode !== "demo") return;
    return () => onDemoCount(sessionId, 0);
  }, [mode, sessionId, onDemoCount]);

  const load = useCallback(async (activeClient: SupabaseClient) => {
    const rows = await keysetRows((after) => {
      let query = activeClient.from("group_class_attendance").select("id,full_name").eq("session_id", sessionId)
        .is("removed_at", null).order("id").limit(500);
      if (after) query = query.gt("id", after);
      return query;
    });
    return rows.map((row) => {
      if (typeof row.id !== "string" || typeof row.full_name !== "string") throw new Error("Could not load attendance.");
      return { id: row.id, full_name: row.full_name };
    });
  }, [sessionId]);

  useEffect(() => {
    if (mode === "demo") return;
    let cancelled = false;
    void Promise.resolve().then(async () => {
      try {
        const request = readPending();
        const activeClient = createSupabaseBrowserClient();
        client.current = activeClient;
        const rows = await load(activeClient);
        if (!cancelled) { setPending(request); setLostPayload(request?.kind === "add"); setAttendees(rows); setReady(true); setLoading(false); }
      } catch {
        if (!cancelled) { setError("Could not load attendance or retry storage. Refresh and check your connection."); setLoading(false); }
      }
    });
    return () => { cancelled = true; client.current = null; };
  }, [load, mode]);

  async function write(kind: AttendancePending["kind"], attendanceId?: string) {
    if (busy.current || !client.current) return;
    if (!canAttemptAttendance(pending, sessionId, kind, attendanceId, lostPayload)) return;
    const trimmed = name.trim();
    if (kind === "add" && (!trimmed || trimmed.length > 150)) { setError("Enter a name of up to 150 characters."); return; }
    busy.current = true;
    setSaving(true); setError(""); setNotice("");
    let request: AttendancePending | null = pending;
    let existing = Boolean(request);
    try {
      const stored = readPending();
      if (stored) {
        existing = true;
        request = stored;
        if (stored.sessionId !== sessionId || stored.kind !== kind || (kind === "remove" && stored.attendanceId !== attendanceId)) throw new Error("Resolve the previous attendance request first.");
        if (kind === "add" && !pending) {
          setPending(stored); setLostPayload(true);
          setError("The original name is no longer available. Ask an administrator to review this request.");
          return;
        }
      } else {
        request = { key: crypto.randomUUID(), kind, sessionId, ...(attendanceId ? { attendanceId } : {}) };
        sessionStorage.setItem(pendingSlot, JSON.stringify(request));
      }
      setPending(request);
      if (kind === "add") setLockedName(trimmed);
      const response = kind === "add"
        ? await client.current.rpc("add_group_class_attendee", { p_idempotency_key: request.key, p_session_id: sessionId, p_full_name: trimmed })
        : await client.current.rpc("remove_group_class_attendee", { p_idempotency_key: request.key, p_attendance_id: attendanceId });
      if (response.error || !response.data) {
        if (!existing && definiteFailure(response.error)) {
          sessionStorage.removeItem(pendingSlot); setPending(null); setLockedName(null);
          setError("The request was rejected. Check the name and that this group class is still active.");
        } else setError("Could not confirm the request. Retry the same details; do not add the person again separately.");
        return;
      }
      sessionStorage.removeItem(pendingSlot); setPending(null); setLockedName(null);
      void onChanged();
      if (kind === "add") setName("");
      setNotice(kind === "add" ? "Attendee added." : "Attendee removed from the list.");
      try { setAttendees(await load(client.current)); }
      catch { setError("The change was saved, but the list could not refresh. Reload the page before making another change."); client.current = null; setReady(false); }
    } catch {
      setError("The request could not be confirmed. Check your connection and retry the same details.");
      try { setPending(readPending()); } catch { client.current = null; setReady(false); }
    } finally { busy.current = false; setSaving(false); }
  }

  async function clearReviewedRequest() {
    if (!reviewed || !pending || busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      const stored = readPending();
      if (!stored || stored.key !== pending.key || stored.kind !== "add") throw new Error("Pending request changed");
      sessionStorage.removeItem(pendingSlot);
    } catch {
      setError("Could not clear the pending request. Refresh and ask an administrator for help.");
      busy.current = false;
      setSaving(false);
      return;
    }

    setPending(null); setLostPayload(false); setReviewed(false); setLockedName(null); setError("");
    void onChanged();
    try {
      if (!client.current) throw new Error("Attendance connection unavailable");
      setAttendees(await load(client.current));
      setNotice("Attendance request review cleared and list refreshed.");
    } catch {
      setNotice("");
      setError("The review was cleared, but the list could not refresh. Reload the page before making another change.");
      client.current = null;
      setReady(false);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  function addDemo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 150) { setError("Enter a name of up to 150 characters."); return; }
    setAttendees((current) => [...current, { id: crypto.randomUUID(), full_name: trimmed }]);
    setName(""); setError(""); setNotice("Sample attendee added for this view.");
  }

  const pendingOtherSession = pending !== null && pending.sessionId !== sessionId;
  const pendingRemoval = pending?.kind === "remove" && !pendingOtherSession;
  return <section className={styles.panel} aria-label="Group class attendance">
    <div className={styles.heading}><div><h3>{sessionTitle} attendance</h3><p>Staff can list members and walk-ins for this class.</p></div><strong>{loading ? "Loading…" : ready ? `${attendees.length} ${attendees.length === 1 ? "person" : "people"}` : "Unavailable"}</strong></div>
    {mode === "demo" && <p className={styles.note}>Demo only: use fictional names. This list resets when closed.</p>}
    {pendingOtherSession && <p className={styles.error} role="alert">An attendance request for another class is unconfirmed. Return to that class and retry it first.</p>}
    {pending?.kind === "add" && !pendingOtherSession && !lostPayload && <p className={styles.note}>An earlier add is unconfirmed. Retry the same name; the saved request key prevents duplicates.</p>}
    {pending?.kind === "add" && !pendingOtherSession && lostPayload && <div className={styles.review}>
      <p>The original name is no longer available after closing or refreshing this view. Do not add it again until an administrator has verified the request outcome. A missing record alone may mean it is still processing.</p>
      <p>Request reference: <code>{pending.key}</code></p>
      <label><input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} /> An administrator verified this request and confirmed it is safe to clear.</label>
      <button type="button" disabled={!reviewed || saving} onClick={() => void clearReviewedRequest()}>Clear reviewed request</button>
    </div>}
    {pendingRemoval && <p className={styles.note}>An earlier removal is unconfirmed. Retry the same removal.</p>}
    {loading ? <p role="status">Loading attendance…</p> : <>
      <form className={styles.form} onSubmit={(event) => { if (mode === "demo") addDemo(event); else { event.preventDefault(); void write("add"); } }}>
        <label>Full name<input required maxLength={150} value={name} readOnly={saving || lockedName !== null || lostPayload} onChange={(event) => setName(event.target.value)} placeholder="Attendee name" /></label>
        <button type="submit" disabled={saving || pendingOtherSession || Boolean(pendingRemoval) || lostPayload || !ready}>{saving ? "Saving…" : pending?.kind === "add" && !pendingOtherSession && !lostPayload ? "Retry same name" : "Add name"}</button>
      </form>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.notice} role="status">{notice}</p>}
      {attendees.length ? <ol className={styles.list}>{attendees.map((attendee, index) => <li key={attendee.id}><span className={styles.person}><span className={styles.number} aria-hidden="true">{index + 1}</span><span>{attendee.full_name}</span></span><button type="button" disabled={saving || pendingOtherSession || (pending !== null && !(pending.kind === "remove" && pending.attendanceId === attendee.id)) || !ready} onClick={() => {
        if (mode === "demo") setAttendees((current) => current.filter((item) => item.id !== attendee.id));
        else void write("remove", attendee.id);
      }} aria-label={`Remove ${attendee.full_name}`}>{pendingRemoval && pending?.attendanceId === attendee.id ? "Retry removal" : "Remove"}</button></li>)}</ol> : <p className={styles.empty}>No names recorded for this class yet.</p>}
      {pendingRemoval && !attendees.some((item) => item.id === pending?.attendanceId) && <button className={styles.retry} type="button" disabled={saving || !ready} onClick={() => void write("remove", pending?.attendanceId)}>Retry unconfirmed removal</button>}
    </>}
    <p className={styles.note}>To correct a name, remove it and add the corrected name. No online reservation is created.</p>
  </section>;
}
