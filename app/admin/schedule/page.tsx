"use client";

import { CalendarDays, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAdminDemo, type Session } from "@/components/admin/demo-store";
import GroupClassAttendance from "@/components/admin/group-class-attendance";
import { useGroupClassCounts } from "@/components/admin/use-group-class-counts";
import styles from "@/components/admin/workspace.module.css";
import scheduleStyles from "@/components/admin/schedule.module.css";

const formatDate = (value: string) => new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
function formatTime(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return value;
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}
const empty = { title: "", category: "Group class" as Session["category"], date: "", time: "", endDate: "", endTime: "", coach: "" };

export default function SchedulePage() {
  const { sessions, mode, addSession, updateSession, removeSession, pendingOperations } = useAdminDemo();
  const { counts, loading: countsLoading, error: countsError, refresh: refreshCounts, setDemoCount } = useGroupClassCounts(mode, sessions);
  const isDemo = mode === "demo";
  const [category, setCategory] = useState("All");
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [requiresEnd, setRequiresEnd] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [attendanceId, setAttendanceId] = useState<string | null>(null);
  const [retry, setRetry] = useState(false);
  const locked = saving || (retry && pendingOperations.includes("schedule"));
  const visible = [...sessions].filter((session) => category === "All" || session.category === category).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const endDate = form.endDate || form.date;
    if (((requiresEnd || form.endDate) && !form.endTime) || (form.endTime && (`${endDate}T${form.endTime}` <= `${form.date}T${form.time}`))) {
      setError("Enter an end date and time after the start.");
      return;
    }
    setSaving(true);
    const result = await (editing ? updateSession(editing, form) : addSession(form));
    setSaving(false);
    if (!result.ok) { setRetry(Boolean(result.retrySamePayload)); setError(result.error ?? "Check the session details and try again."); return; }
    setRetry(false);
    setNotice(isDemo ? (editing ? "Sample session updated for this demo." : "Sample session added for this demo.") : (editing ? "Session updated." : "Session saved as a draft."));
    setForm(empty); setEditing(null); setShowForm(false); setRequiresEnd(true); setError("");
  }
  function edit(session: Session) {
    setForm({ title: session.title, category: session.category, date: session.date, time: session.time, endDate: session.endDate, endTime: session.endTime, coach: session.coach });
    setRequiresEnd(Boolean(session.endTime));
    setEditing(session.id); setShowForm(true); setError("");
  }
  function close() { setShowForm(false); setEditing(null); setForm(empty); setRequiresEnd(true); setError(""); }
  async function remove(session: Session) {
    if (saving || (!isDemo && !window.confirm(`Cancel ${session.title}?`))) return;
    setSaving(true);
    const result = await removeSession(session.id);
    setSaving(false);
    if (!result.ok) { setError(result.error ?? "Could not update this session."); return; }
    if (editing === session.id) close();
    setNotice(isDemo ? "Sample session removed from this demo." : "Session cancelled.");
  }

  return <div className={styles.page}>
    <div className={`${styles.heading} ${scheduleStyles.heading}`}>
      <div><span className={styles.kicker}>Staff workspace</span><h1>Group classes &amp; schedule</h1><p>Manage class times and staff attendance lists.</p></div>
      <button type="button" className={styles.primary} disabled={locked} onClick={() => { close(); setShowForm(true); }}><Plus size={17} aria-hidden="true" /> Add session</button>
    </div>
    <div className={`${styles.info} ${scheduleStyles.info}`}><CalendarDays size={19} aria-hidden="true" /><p>{isDemo ? "Schedule preview only. Sample sessions are not published to the public website." : "New sessions are saved as drafts. The public schedule is not connected yet."} Class registration remains in the Messenger group chat.</p></div>
    {notice && <p className={styles.success} role="status">{notice}</p>}
    {error && !showForm && <p className={styles.error} role="alert">{error}</p>}
    <div className={scheduleStyles.summary} aria-label="Recorded sessions">
      {(["Group class", "Taekwondo", "Coaching"] as const).map((item) => <div key={item}><span>{item === "Group class" ? "Group classes" : item}</span><strong>{sessions.filter((session) => session.category === item).length}</strong><small>Recorded sessions</small></div>)}
    </div>
    <div className={scheduleStyles.layout}>
      <section className={`${styles.panel} ${scheduleStyles.schedulePanel}`} aria-labelledby="sessions-heading">
        <div className={styles.panelHeading}><div><h2 id="sessions-heading">Class schedule</h2><p>Dates and times are shown in Philippine time.</p></div><span className={styles.count}>{visible.length} shown</span></div>
        <div className={`${styles.filterRow} ${scheduleStyles.filterRow}`} aria-label="Filter sessions">
          {['All', 'Group class', 'Taekwondo', 'Coaching'].map((item) => <button type="button" key={item} className={category === item ? styles.filterActive : styles.filter} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
        {visible.length ? <div className={scheduleStyles.tableWrap} role="region" aria-label="Class schedule table" tabIndex={0}><table className={scheduleStyles.table}>
          <thead><tr><th scope="col">Class</th><th scope="col">When</th><th scope="col">Coach</th><th scope="col">Attendees</th><th scope="col"><span className={scheduleStyles.srOnly}>Actions</span></th></tr></thead>
          <tbody>{visible.map((session) => <tr key={session.id}>
            <th scope="row"><strong>{session.title}</strong><small>{session.category}</small></th>
            <td data-label="When"><div><strong>{formatDate(session.date)}</strong><small>{formatTime(session.time)} – {session.endTime ? `${session.endDate && session.endDate !== session.date ? `${formatDate(session.endDate)} ` : ""}${formatTime(session.endTime)}` : "End time not set"}</small></div></td>
            <td data-label="Coach">{session.coach || "Not set"}</td>
            <td data-label="Attendees">{session.category !== "Group class" ? "—" : countsLoading ? "Loading…" : countsError ? "Unavailable" : counts?.[session.id] === undefined ? "—" : counts[session.id]}</td>
            <td><div className={scheduleStyles.actions}>{session.category === "Group class" && <button className={scheduleStyles.attendance} type="button" disabled={locked} aria-expanded={attendanceId === session.id} aria-label={`View attendees for ${session.title}`} onClick={() => setAttendanceId((current) => current === session.id ? null : session.id)}>Attendees</button>}<button className={scheduleStyles.icon} type="button" disabled={locked} onClick={() => edit(session)} aria-label={`Edit ${session.title}`}><Pencil size={18} aria-hidden="true" /></button><button className={scheduleStyles.icon} type="button" disabled={locked} onClick={() => void remove(session)} aria-label={`${isDemo ? "Remove" : "Cancel"} ${session.title}`}><Trash2 size={18} aria-hidden="true" /></button></div></td>
          </tr>)}</tbody>
        </table></div> : <p className={styles.empty}>{isDemo ? "No sample sessions in this view. Add one to try the schedule." : "No sessions in this view. Add one to get started."}</p>}
        {countsError && <p className={styles.error} role="alert">Could not load attendee counts. <button type="button" className={styles.textButton} onClick={() => void refreshCounts()}>Try again</button></p>}
        {visible.filter((session) => session.id === attendanceId && session.category === "Group class").map((session) => <GroupClassAttendance key={session.id} sessionId={session.id} sessionTitle={session.title} mode={mode} onChanged={refreshCounts} onDemoCount={setDemoCount} />)}
      </section>
      {showForm ? <section className={styles.panel} aria-labelledby="session-form-heading">
        <div className={styles.panelHeading}><div><h2 id="session-form-heading">{editing ? "Edit session" : "Add a session"}</h2><p>{isDemo ? "Use fictional details while this is a demo." : "Times are in the Philippines (Asia/Manila)."}</p></div><button type="button" className={styles.iconButton} disabled={locked} onClick={close} aria-label="Close session form"><X size={18} /></button></div>
        <form onSubmit={save} className={`${styles.form} ${scheduleStyles.form}`}>
          <label>Session name<input required maxLength={80} readOnly={locked} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Group workout" /></label>
          <label>Category<select disabled={locked} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as Session["category"] })}><option>Group class</option><option>Taekwondo</option><option>Coaching</option></select></label>
          <div className={styles.fields}><label>Start date<input required type="date" readOnly={locked} value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value, endDate: (!editing || form.endTime) && (!form.endDate || form.endDate === form.date) ? event.target.value : form.endDate })} /></label><label>Start time<input required type="time" readOnly={locked} value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} /></label></div>
          <div className={styles.fields}><label>End date<input type="date" readOnly={locked} value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></label><label>End time<input required={requiresEnd || Boolean(form.endDate)} type="time" readOnly={locked} value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></label></div>
          {editing && !requiresEnd && !form.endTime && <p className={styles.optional}>No end time was recorded for this session. You can add one now.</p>}
          <label>Coach <span className={styles.optional}>(optional)</span><input maxLength={80} readOnly={locked} value={form.coach} onChange={(event) => setForm({ ...form, coach: event.target.value })} placeholder="To be confirmed" /></label>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.formActions}><button className={styles.primary} type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : isDemo ? "Add sample session" : "Save draft"}</button><button className={styles.secondary} type="button" onClick={close} disabled={locked}>Cancel</button></div>
        </form>
      </section> : <aside className={styles.help}><h2>About the schedule</h2><p>Keep class and coaching times together so staff can see what is planned.</p><p>Staff can list group-class attendees. Coaching is schedule-only; no online reservations are collected.</p><button type="button" className={styles.textButton} disabled={locked} onClick={() => { close(); setShowForm(true); }}>{isDemo ? "Add a sample session" : "Add a session"} <Plus size={16} /></button></aside>}
    </div>
  </div>;
}
