"use client";

import { CalendarDays, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAdminDemo, type Session } from "@/components/admin/demo-store";
import GroupClassAttendance from "@/components/admin/group-class-attendance";
import styles from "@/components/admin/workspace.module.css";

const formatDate = (value: string) => new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
const empty = { title: "", category: "Group class" as Session["category"], date: "", time: "", coach: "" };

export default function SchedulePage() {
  const { sessions, mode, addSession, updateSession, removeSession, pendingOperations } = useAdminDemo();
  const isDemo = mode === "demo";
  const [category, setCategory] = useState("All");
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
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
    setSaving(true);
    const result = await (editing ? updateSession(editing, form) : addSession(form));
    setSaving(false);
    if (!result.ok) { setRetry(Boolean(result.retrySamePayload)); setError(result.error ?? "Check the session details and try again."); return; }
    setRetry(false);
    setNotice(isDemo ? (editing ? "Sample session updated for this demo." : "Sample session added for this demo.") : (editing ? "Session updated." : "Session saved as a draft."));
    setForm(empty); setEditing(null); setShowForm(false); setError("");
  }
  function edit(session: Session) {
    setForm({ title: session.title, category: session.category, date: session.date, time: session.time, coach: session.coach });
    setEditing(session.id); setShowForm(true); setError("");
  }
  function close() { setShowForm(false); setEditing(null); setForm(empty); setError(""); }
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
    <div className={styles.heading}>
      <div><span className={styles.kicker}>Staff workspace</span><h1>Schedule</h1><p>Plan group classes, taekwondo, and coaching times.</p></div>
      <button type="button" className={styles.primary} disabled={locked} onClick={() => { close(); setShowForm(true); }}><Plus size={17} aria-hidden="true" /> Add session</button>
    </div>
    <div className={styles.info}><CalendarDays size={19} aria-hidden="true" /><p>{isDemo ? "Schedule preview only. Sample sessions are not published to the public website." : "New sessions are saved as drafts. The public schedule is not connected yet."} Class registration remains in the Messenger group chat.</p></div>
    {notice && <p className={styles.success} role="status">{notice}</p>}
    {error && !showForm && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.layout}>
      <section className={styles.panel} aria-labelledby="sessions-heading">
        <div className={styles.panelHeading}><div><h2 id="sessions-heading">Sessions</h2><p>Dates and times are shown in Philippine time.</p></div><span className={styles.count}>{visible.length} shown</span></div>
        <div className={styles.filterRow} aria-label="Filter sessions">
          {['All', 'Group class', 'Taekwondo', 'Coaching'].map((item) => <button type="button" key={item} className={category === item ? styles.filterActive : styles.filter} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
        {visible.length ? <div className={styles.list}>{visible.map((session) => <article key={session.id} className={styles.row}>
          <div className={styles.dateBlock}><strong>{formatDate(session.date)}</strong><span>{session.time}</span></div>
          <div className={styles.rowBody}><strong>{session.title}</strong><span>{session.category} · {session.coach}</span></div>
          <div className={styles.rowActions}>{session.category === "Group class" && <button className={styles.attendanceButton} type="button" disabled={locked} aria-expanded={attendanceId === session.id} onClick={() => setAttendanceId((current) => current === session.id ? null : session.id)}>Attendance</button>}<button type="button" disabled={locked} onClick={() => edit(session)} aria-label={`Edit ${session.title}`}><Pencil size={16} aria-hidden="true" /></button><button type="button" disabled={locked} onClick={() => void remove(session)} aria-label={`${isDemo ? "Remove" : "Cancel"} ${session.title}`}><Trash2 size={16} aria-hidden="true" /></button></div>
        </article>)}</div> : <p className={styles.empty}>{isDemo ? "No sample sessions in this view. Add one to try the schedule." : "No sessions in this view. Add one to get started."}</p>}
        {visible.filter((session) => session.id === attendanceId && session.category === "Group class").map((session) => <GroupClassAttendance key={session.id} sessionId={session.id} mode={mode} />)}
      </section>
      {showForm ? <section className={styles.panel} aria-labelledby="session-form-heading">
        <div className={styles.panelHeading}><div><h2 id="session-form-heading">{editing ? "Edit session" : "Add a session"}</h2><p>{isDemo ? "Use fictional details while this is a demo." : "Times are in the Philippines (Asia/Manila)."}</p></div><button type="button" className={styles.iconButton} disabled={locked} onClick={close} aria-label="Close session form"><X size={18} /></button></div>
        <form onSubmit={save} className={styles.form}>
          <label>Session name<input required maxLength={80} readOnly={locked} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Group workout" /></label>
          <label>Category<select disabled={locked} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as Session["category"] })}><option>Group class</option><option>Taekwondo</option><option>Coaching</option></select></label>
          <div className={styles.fields}><label>Date<input required type="date" readOnly={locked} value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label><label>Start time<input required type="time" readOnly={locked} value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} /></label></div>
          <label>Coach <span className={styles.optional}>(optional)</span><input maxLength={80} readOnly={locked} value={form.coach} onChange={(event) => setForm({ ...form, coach: event.target.value })} placeholder="To be confirmed" /></label>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.formActions}><button className={styles.primary} type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : isDemo ? "Add sample session" : "Save draft"}</button><button className={styles.secondary} type="button" onClick={close} disabled={locked}>Cancel</button></div>
        </form>
      </section> : <aside className={styles.help}><h2>About the schedule</h2><p>Keep class and coaching times together so staff can see what is planned.</p><p>Staff can list group-class attendees. Coaching is schedule-only; no online reservations are collected.</p><button type="button" className={styles.textButton} onClick={() => setShowForm(true)}>{isDemo ? "Add a sample session" : "Add a session"} <Plus size={16} /></button></aside>}
    </div>
  </div>;
}
