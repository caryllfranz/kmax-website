"use client";

import { CalendarDays, ChevronRight, Plus, Search, UserRound, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAdminDemo, validMobile } from "@/components/admin/demo-store";
import { isActiveStatus, membershipStatus, termFor, timeLeft } from "@/components/admin/members-term";
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
  const status = membershipStatus(startsOn, endsOn, today);
  const categoryStyles = { current: styles.current, expiring: styles.expiring, expired: styles.ended, upcoming: styles.upcoming };
  return { ...status, style: categoryStyles[status.category] };
}

function StatusBadges({ status }: { status: ReturnType<typeof statusFor> }) {
  if (status.category === "expiring") {
    return <span className={styles.statusGroup}>
      <span className={`${styles.status} ${styles.current}`}>Active</span>
      <span className={`${styles.status} ${styles.expiring}`}>{status.label}</span>
    </span>;
  }
  return <span className={`${styles.status} ${status.style}`}>{status.label}</span>;
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toLocaleUpperCase()).join("");
}

export default function MembersPage() {
  const { members, mode, addMember, renewMember, pendingOperations } = useAdminDemo();
  const isDemo = mode === "demo";
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "current" | "expiring" | "expired" | "upcoming">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addMobile, setAddMobile] = useState("");
  const [addPlan, setAddPlan] = useState("");
  const [renewPlan, setRenewPlan] = useState("");
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
  const counts = { all: members.length, current: 0, expiring: 0, expired: 0, upcoming: 0 };
  for (const member of members) {
    const term = termFor(member, today);
    counts[statusFor(term.startsOn, term.endsOn, today).category]++;
  }
  const visibleMembers = members.filter((member) => {
    const term = termFor(member, today);
    const category = statusFor(term.startsOn, term.endsOn, today).category;
    const matchesFilter = filter === "all" || (filter === "current" ? isActiveStatus(category) : category === filter);
    return matchesFilter && (member.name.toLocaleLowerCase().includes(query) || member.mobile.includes(query));
  });
  const selected = members.find((member) => member.id === selectedId);
  const selectedTerm = selected ? termFor(selected, today) : null;
  const selectedStatus = selectedTerm ? statusFor(selectedTerm.startsOn, selectedTerm.endsOn, today) : null;
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
      planName: addPlan || null,
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
    setAddPlan("");
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
      planName: renewPlan || null,
    });
    setSaving(false);
    if (!result.ok) {
      setRenewRetry(Boolean(result.retrySamePayload));
      setRenewError(result.error ?? "Could not renew this membership. Check the dates and try again.");
      return;
    }
    form.reset();
    setRenewPlan("");
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
            <label>Membership plan<select value={addPlan} onChange={(event) => setAddPlan(event.target.value)} disabled={addLocked}><option value="">Not specified</option><option value="Monthly">Monthly</option><option value="Quarterly">Quarterly</option></select></label>
            <label>Start date<input name="startsOn" readOnly={addLocked} type="date" required /></label>
            <label>Expiry date<input name="endsOn" readOnly={addLocked} type="date" required /></label>
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
            <div className={styles.listActions}><label className={styles.search}>
                <Search size={17} aria-hidden="true" />
                <span className={styles.srOnly}>Search by name or mobile number</span>
                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or mobile" />
              </label>
              <button className={styles.primaryButton} type="button" aria-expanded={showAdd} aria-controls="add-demo-member" disabled={addLocked} onClick={() => { if (showAdd) { setAddName(""); setAddMobile(""); setAddPlan(""); } setShowAdd(!showAdd); setAddError(""); }}>
                {showAdd ? <X size={17} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}
                {showAdd ? "Close form" : "Add member"}
              </button></div>
          </div>
          <div className={styles.filters} aria-label="Filter memberships">
            {([ ["all", "All"], ["current", "Active"], ["expiring", "Expiring"], ["expired", "Expired"], ["upcoming", "Upcoming"] ] as const).map(([value, label]) => <button key={value} type="button" className={filter === value ? styles.filterActive : styles.filter} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label} ({value === "current" ? counts.current + counts.expiring : counts[value]})</button>)}
          </div>
          <p className={styles.tableHint}>Swipe to see all columns</p>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead><tr><th scope="col">Member</th><th scope="col">Plan</th><th scope="col">Expires</th><th scope="col">Time left</th><th scope="col">Status</th><th scope="col"><span className={styles.srOnly}>Actions</span></th></tr></thead>
              <tbody>
                {visibleMembers.map((member) => {
                  const term = termFor(member, today);
                  const status = statusFor(term.startsOn, term.endsOn, today);
                  return (
                    <tr key={member.id} className={selectedId === member.id ? styles.selectedRow : ""}>
                      <th scope="row"><span className={styles.memberName}><span className={styles.avatar} aria-hidden="true">{initials(member.name)}</span><span>{member.name}<small className={styles.memberMobile}>{member.mobile}</small></span></span></th>
                      <td data-label="Plan">{term.planName || "Not specified"}</td>
                      <td data-label="Expiry date"><time className={styles.dateCell} dateTime={term.endsOn}>{displayDate(term.endsOn)}</time></td>
                      <td data-label="Time left">{timeLeft(term.endsOn, today)}</td>
                      <td data-label="Term status"><StatusBadges status={status} /></td>
                      <td><button className={styles.detailsButton} type="button" aria-label={`View details and renewal for ${member.name}`} aria-pressed={selectedId === member.id} disabled={renewLocked} onClick={() => { setSelectedId(member.id); setRenewPlan(""); setRenewError(""); }}>Renew <ChevronRight size={16} aria-hidden="true" /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {visibleMembers.length === 0 && <div className={styles.emptyList}>No matching members. Try another name or number.</div>}
          <p className={styles.tableFooter}>Active includes terms expiring soon. Shows the earliest current expiry, otherwise the nearest upcoming or most recently expired term. The 7-day reminder is informational, not a gym policy. Dates use Philippine time.</p>
        </section>

        <aside className={`${styles.card} ${styles.detailCard}`} aria-label="Membership details">
          {selected && selectedTerm && selectedStatus ? (
            <>
              <div className={styles.detailTop}>
                <div><span className={styles.eyebrow}>Membership details</span><h2>{selected.name}</h2><p>{selected.mobile}</p></div>
                <button className={styles.iconButton} type="button" aria-label="Close member details" disabled={renewLocked} onClick={() => { setSelectedId(null); setRenewError(""); }}><X size={18} /></button>
              </div>
              <div className={styles.currentTerm}>
                <span><CalendarDays size={16} aria-hidden="true" /> {selectedStatus.category === "upcoming" ? "Next upcoming term" : selectedStatus.category === "expired" ? "Most recently expired term" : "Current term"}</span>
                <strong>{displayDate(selectedTerm.startsOn)} – {displayDate(selectedTerm.endsOn)}</strong>
                <span>{selectedTerm.planName || "Plan not specified"}</span>
                <StatusBadges status={selectedStatus} />
              </div>
              {selectedTerm !== selected && <div className={styles.recordedTerm}><strong>Latest recorded term</strong><span>{selected.planName || "Plan not specified"} · {displayDate(selected.startsOn)} – {displayDate(selected.endsOn)}</span></div>}
              <div className={styles.history}>
                <h3>Previous terms</h3>
                {selected.history.length ? <ul>{selected.history.map((term, index) => <li key={`${term.startsOn}-${term.endsOn}-${index}`}><span>{term.planName || "Plan not specified"}: </span><time dateTime={term.startsOn}>{displayDate(term.startsOn)}</time> – <time dateTime={term.endsOn}>{displayDate(term.endsOn)}</time></li>)}</ul> : <p>No previous terms recorded.</p>}
              </div>
              <form key={selected.id} className={styles.renewForm} onSubmit={handleRenew}>
                <h3>Renew membership</h3>
                <p>{isDemo ? "Enter fictional dates to try a renewal." : "Enter the approved dates for this renewal."} Previous terms remain in history.</p>
                <label>Membership plan<select value={renewPlan} onChange={(event) => setRenewPlan(event.target.value)} disabled={renewLocked}><option value="">Not specified</option><option value="Monthly">Monthly</option><option value="Quarterly">Quarterly</option></select></label>
                <label>New start date<input name="startsOn" readOnly={renewLocked} type="date" required /></label>
                <label>New expiry date<input name="endsOn" readOnly={renewLocked} type="date" required /></label>
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
