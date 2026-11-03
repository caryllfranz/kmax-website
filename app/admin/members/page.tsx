"use client";

import { CalendarDays, ChevronRight, Plus, Search, UserRound, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAdminDemo, validMobile } from "@/components/admin/demo-store";
import styles from "@/components/admin/members.module.css";

function manilaToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "UTC", day: "numeric", month: "short", year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}

function normalizeMobile(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("63") ? `0${digits.slice(2)}` : digits;
}

function statusFor(startsOn: string, endsOn: string, today: string) {
  if (startsOn > today) return { label: "Upcoming", style: styles.upcoming };
  if (endsOn < today) return { label: "Ended", style: styles.ended };
  return { label: "Current", style: styles.current };
}

export default function MembersPage() {
  const { members, mode, addMember, renewMember, pendingOperations } = useAdminDemo();
  const isDemo = mode === "demo";
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addMobile, setAddMobile] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addError, setAddError] = useState("");
  const [renewError, setRenewError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [addRetry, setAddRetry] = useState(false);
  const [renewRetry, setRenewRetry] = useState(false);
  const addLocked = saving || (addRetry && pendingOperations.includes("member"));
  const renewLocked = saving || (renewRetry && pendingOperations.includes("renewal"));
  const today = manilaToday();
  const query = search.trim().toLocaleLowerCase();
  const visibleMembers = members.filter((member) =>
    member.name.toLocaleLowerCase().includes(query) || member.mobile.includes(query),
  );
  const selected = members.find((member) => member.id === selectedId);
  const nameToCheck = addName.trim().replace(/\s+/g, " ").toLocaleLowerCase();
  const mobileToCheck = normalizeMobile(addMobile);
  const possibleDuplicates = members.filter((member) =>
    (nameToCheck.length > 0 && member.name.trim().replace(/\s+/g, " ").toLocaleLowerCase() === nameToCheck) ||
    (mobileToCheck.length >= 7 && normalizeMobile(member.mobile) === mobileToCheck),
  );

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const mobile = String(data.get("mobile") ?? "").trim();
    if (!validMobile(mobile)) {
      setAddError("Enter a mobile number with 7–15 digits. Spaces, +, parentheses, periods, and hyphens are allowed.");
      return;
    }
    setSaving(true);
    const result = await addMember({
      name: String(data.get("name") ?? ""),
      mobile,
      startsOn: String(data.get("startsOn") ?? ""),
      endsOn: String(data.get("endsOn") ?? ""),
    });
    setSaving(false);
    if (!result.ok) {
      setAddRetry(Boolean(result.retrySamePayload));
      setAddError(result.error ?? "Could not add this member. Check the details and try again.");
      return;
    }
    form.reset();
    setAddName("");
    setAddMobile("");
    setAddRetry(false);
    setAddError("");
    setShowAdd(false);
    setNotice(isDemo ? "Demo member added for this session." : "Member added.");
  }

  async function handleRenew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || saving) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(true);
    const result = await renewMember(selected.id, {
      startsOn: String(data.get("startsOn") ?? ""),
      endsOn: String(data.get("endsOn") ?? ""),
    });
    setSaving(false);
    if (!result.ok) {
      setRenewRetry(Boolean(result.retrySamePayload));
      setRenewError(result.error ?? "Could not renew this membership. Check the dates and try again.");
      return;
    }
    form.reset();
    setRenewRetry(false);
    setRenewError("");
    setNotice(isDemo ? `Demo membership renewed for ${selected.name}.` : `Membership term saved for ${selected.name}.`);
  }

  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>Member management</span>
          <h1>Members</h1>
          <p>Find members, check membership dates, and review renewals.</p>
        </div>
        <button className={styles.primaryButton} type="button" aria-expanded={showAdd} aria-controls="add-demo-member" disabled={addLocked} onClick={() => { if (showAdd) { setAddName(""); setAddMobile(""); } setShowAdd(!showAdd); setAddError(""); }}>
          {showAdd ? <X size={17} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}
          {showAdd ? "Close form" : "Add member"}
        </button>
      </div>

      {notice && <div className={styles.notice} role="status">{notice}<button type="button" aria-label="Dismiss message" onClick={() => setNotice("")}><X size={16} /></button></div>}

      {showAdd && (
        <section id="add-demo-member" className={styles.card} aria-labelledby="add-member-heading">
          <div className={styles.cardHeader}>
            <div><h2 id="add-member-heading">{isDemo ? "Add a demo member" : "Add a member"}</h2><p>{isDemo ? "Use fictional information only. Entries disappear when the demo is refreshed." : "Record the member’s name, mobile number, and approved membership dates."}</p></div>
          </div>
          <form className={styles.addForm} onSubmit={handleAdd}>
            <label>Full name<input name="name" value={addName} onChange={(event) => setAddName(event.target.value)} readOnly={addLocked} type="text" autoComplete="off" maxLength={100} required placeholder={isDemo ? "Fictional name" : "Full name"} /></label>
            <label>Mobile number<input name="mobile" value={addMobile} onChange={(event) => setAddMobile(event.target.value)} readOnly={addLocked} type="tel" inputMode="tel" autoComplete="off" maxLength={32} required aria-describedby="mobile-hint" placeholder={isDemo ? "Fictional number" : "Mobile number"} /><small id="mobile-hint">7–15 digits; spaces and + ( ) . - are allowed.</small></label>
            <label>Start date<input name="startsOn" readOnly={addLocked} type="date" required /></label>
            <label>End date<input name="endsOn" readOnly={addLocked} type="date" required /></label>
            {possibleDuplicates.length > 0 && <p role="status" style={{ gridColumn: "1 / -1" }}><strong>Possible existing member:</strong> {possibleDuplicates.slice(0, 3).map((member) => member.name).join(", ")}{possibleDuplicates.length > 3 ? ` and ${possibleDuplicates.length - 3} more` : ""}. Check the member list before adding; people may share a number or name.</p>}
            {addError && <p className={styles.error} role="alert">{addError}</p>}
            <div className={styles.formActions}><button className={styles.primaryButton} type="submit" disabled={saving}>{saving ? "Saving…" : isDemo ? "Add demo member" : "Add member"}</button></div>
          </form>
        </section>
      )}

      <div className={styles.contentGrid}>
        <section className={styles.card} aria-labelledby="member-list-heading">
          <div className={styles.listHeader}>
            <div><h2 id="member-list-heading">Member list</h2><p>{visibleMembers.length} {visibleMembers.length === 1 ? "member" : "members"} shown</p></div>
            <label className={styles.search}>
              <Search size={17} aria-hidden="true" />
              <span className={styles.srOnly}>Search by name or mobile number</span>
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or mobile" />
            </label>
          </div>
          <p className={styles.tableHint}>Swipe to see all columns</p>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead><tr><th scope="col">Member</th><th scope="col">Mobile</th><th scope="col">Latest term dates</th><th scope="col">Latest term status</th><th scope="col"><span className={styles.srOnly}>Actions</span></th></tr></thead>
              <tbody>
                {visibleMembers.map((member) => {
                  const status = statusFor(member.startsOn, member.endsOn, today);
                  return (
                    <tr key={member.id} className={selectedId === member.id ? styles.selectedRow : ""}>
                      <th scope="row"><span className={styles.memberName}><span className={styles.avatar} aria-hidden="true"><UserRound size={17} /></span>{member.name}</span></th>
                      <td>{member.mobile}</td>
                      <td><span className={styles.dateCell}><time dateTime={member.startsOn}>{displayDate(member.startsOn)}</time> – <time dateTime={member.endsOn}>{displayDate(member.endsOn)}</time></span></td>
                      <td><span className={`${styles.status} ${status.style}`}>{status.label}</span></td>
                      <td><button className={styles.detailsButton} type="button" aria-label={`View details for ${member.name}`} aria-pressed={selectedId === member.id} disabled={renewLocked} onClick={() => { setSelectedId(member.id); setRenewError(""); }}>Details <ChevronRight size={16} aria-hidden="true" /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {visibleMembers.length === 0 && <div className={styles.emptyList}>No matching members. Try another name or number.</div>}
          <p className={styles.tableFooter}>Statuses compare the dates shown with today in Manila. Membership policies are still to be confirmed.</p>
        </section>

        <aside className={`${styles.card} ${styles.detailCard}`} aria-label="Membership details">
          {selected ? (
            <>
              <div className={styles.detailTop}>
                <div><span className={styles.eyebrow}>Membership details</span><h2>{selected.name}</h2><p>{selected.mobile}</p></div>
                <button className={styles.iconButton} type="button" aria-label="Close member details" disabled={renewLocked} onClick={() => { setSelectedId(null); setRenewError(""); }}><X size={18} /></button>
              </div>
              <div className={styles.currentTerm}>
                <span><CalendarDays size={16} aria-hidden="true" /> Latest recorded term</span>
                <strong>{displayDate(selected.startsOn)} – {displayDate(selected.endsOn)}</strong>
              </div>
              <div className={styles.history}>
                <h3>Previous terms</h3>
                {selected.history.length ? <ul>{selected.history.map((term, index) => <li key={`${term.startsOn}-${term.endsOn}-${index}`}><time dateTime={term.startsOn}>{displayDate(term.startsOn)}</time> – <time dateTime={term.endsOn}>{displayDate(term.endsOn)}</time></li>)}</ul> : <p>No previous terms recorded.</p>}
              </div>
              <form key={selected.id} className={styles.renewForm} onSubmit={handleRenew}>
                <h3>Renew membership</h3>
                <p>{isDemo ? "Enter fictional dates to try a renewal." : "Enter the approved dates for this renewal."} Previous terms remain in history.</p>
                <label>New start date<input name="startsOn" readOnly={renewLocked} type="date" required /></label>
                <label>New end date<input name="endsOn" readOnly={renewLocked} type="date" required /></label>
                {renewError && <p className={styles.error} role="alert">{renewError}</p>}
                <button className={styles.secondaryButton} type="submit" disabled={saving}>{saving ? "Saving…" : isDemo ? "Save demo renewal" : "Save renewal"}</button>
              </form>
            </>
          ) : (
            <div className={styles.emptyDetails}><span className={styles.emptyIcon}><UserRound size={22} aria-hidden="true" /></span><h2>Membership details</h2><p>Select a member to see their dates and renewal history.</p></div>
          )}
        </aside>
      </div>
    </div>
  );
}
