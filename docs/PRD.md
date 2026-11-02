# KMAX Fitness — Product Requirements Document
## Scope revision 1.1 — November 2, 2026

**Status:** Planning draft; KMAX owner and staff approval pending  
**Product:** Public gym website and internal admin dashboard  
**Audience:** KMAX visitors and members; authorized staff and administrators  
**Locale:** Philippines; display business dates and times in Asia/Manila

> **Decision versus assumption:** **DECISION** means the requested project scope. **ASSUMPTION** means an unverified gym rule or planning proposal. KMAX must confirm assumptions before they become public claims or operational rules. Example content and numbers must never be presented as real KMAX information.

## 1. Product summary

KMAX Fitness needs two connected parts:

1. A public website that helps people learn about the community gym, find confirmed class information, and contact KMAX.
2. An internal dashboard for authorized staff to manage members, memberships, counter sales, stock, reports, and class schedules.

**DECISION:** Class registration continues through KMAX's existing Facebook Messenger group chat. The website explains that process and may link to an owner-approved access point when one is supplied. The website does not collect registrations.

**DECISION:** Members have no accounts or passwords. There is no member portal, online reservation flow, or booking system. Only staff and administrators authenticate to the internal dashboard.

**Intended outcomes:** Visitors can find reliable gym information; staff can track membership expiry and renewal history; counter sales and stock reconcile; managers can review sales; and the public schedule reflects approved staff updates.

## 2. Source material and content boundaries

- The supplied KMAX Facebook page is the public social destination: https://www.facebook.com/KMAXFitness.
- Supplied brand and community photos may guide the site's look. Permission to publish each asset and any accompanying claim requires KMAX approval.
- Supplied materials show activities and events, but do not establish which programs currently run or when they meet. Event posters are not evidence of current prices, opening hours, schedules, or policies.
- Exact address, contact methods beyond the Facebook page, membership plans and prices, class times, instructors, opening hours, payment methods, and operating policies are unverified. Publish these only after KMAX confirms them.
- The existing Messenger group chat is the registration channel, but its direct invite link and access procedure have not been supplied. Until confirmed, direct visitors to the official Facebook page for help reaching the group chat. Do not claim that the Facebook page itself registers them.

## 3. Scope and exclusions

### Part A — Public gym website

| Area | Required content and behavior |
|---|---|
| Homepage | Clear KMAX introduction, community imagery, links to key sections, and an obvious contact path. |
| About | Owner-approved gym story, values, and community information. |
| Facilities | Approved descriptions and photos of actual spaces and equipment. |
| Programs | Approved descriptions of current offerings, without fabricated coaches, prices, or promises. |
| Membership Information | Confirmed plan descriptions and joining/renewal guidance; prices only if approved. No online purchase or account creation. |
| Class Schedule | Confirmed upcoming classes with program, Manila-local date/time, and other approved details. Explain that registration happens in the existing Messenger group chat. No availability counter or attendee information. |
| Contact | Verified address, hours, and contact methods when supplied; link to the official Facebook page. |

The public website must work on phones and desktops, be accessible, and use replaceable imagery until KMAX approves photos. Authorized staff need a practical way to keep public class information current.

### Part B — Internal admin dashboard

| Area | Required content and behavior |
|---|---|
| Staff access | Secure staff/admin authentication; protected pages and operations; permissions matched to assigned responsibilities. |
| Member registry | Authorized staff register, find, and update members. Full name and mobile number are the previously chosen basic registration fields. Flag possible duplicates. |
| Memberships | Record initial terms, track expiry, renew memberships, and retain prior terms and payment history. Show active, expiring, and expired views using KMAX-approved rules. |
| Counter POS | Staff-operated checkout for drinks and merchandise, with itemized totals and durable transaction records. |
| Inventory | Product catalog, stock on hand, receiving, sale deductions, authorized corrections, and stock history. |
| Sales reports | Date-filtered sales totals, item sales, and operational summaries derived from saved transactions. |
| Class schedule management | Authorized staff create, edit, publish, and cancel schedule entries; published entries appear on the website. No attendee or registration management. |

### Explicitly out of scope

- Member login, passwords, profiles, and portal.
- Online class registration, reservations, approvals, waitlists, capacity holds, attendance rosters, and any booking API or workflow.
- Messenger automation, group-chat import, and automatic sync of chat registrations.
- Online checkout, payment gateway, recurring billing, and consumer e-commerce.
- Private coaching appointments, training-credit packages, and coach-conflict handling.
- Native apps, multi-branch operations, payroll, and full accounting or fiscal-receipt certification.

## 4. Users, access, and privacy

| User | Access |
|---|---|
| Visitor or member | Browse the public site and schedule; follow approved instructions for the existing Messenger group chat. No dashboard account. |
| Staff | Sign in to assigned internal functions, such as member records, memberships, POS, inventory, or schedules. |
| Administrator | Sign in to authorized management, reporting, and staff-access functions. |

**DECISION:** Staff and administrators require secure authentication. Every protected page and data operation must enforce authorization on the server. Public pages must not expose member names, mobile numbers, payment details, staff-only reports, or stock/cost information.

**ASSUMPTION A01 — Staff roles:** The exact division between cashier, receptionist, schedule editor, manager, and owner, including who may edit financial records or assign roles, is not approved. KMAX must confirm permissions before implementation.

**Privacy requirement:** Collect only data needed for approved operations. Before real member data is entered, KMAX must approve the privacy notice, retention period, access/deletion process, staff access, and handling of historical records. Philippine data privacy requirements need owner/legal review.

## 5. Core journeys

### J01 — Find the gym and a class

A visitor opens the site, learns about the gym, sees an approved class schedule in Manila local time, and finds clear instructions for registration through the existing Messenger group chat. The site does not ask for their name or mobile number for this purpose.

### J02 — Register a member

Authorized staff search for an existing member, check possible duplicates, enter the person's full name and mobile number, and record a KMAX-approved membership term. The dashboard shows the current expiry and retains who created or changed the record. The member receives no account or password.

### J03 — Renew a membership

Staff open the member record, review current and prior terms, enter approved renewal details, and record the payment or activation evidence required by KMAX. The old term remains in history; the dashboard calculates the new status and expiry from approved rules.

### J04 — Record a counter sale

Staff select approved products and quantities, review an itemized total, and complete the sale using an approved payment method. The sale is saved once and related stock is deducted once. Incomplete sales do not change stock.

### J05 — Receive or correct stock

Authorized staff record incoming quantity or a correction with a reason. The stock balance and movement history update together, retaining actor and time.

### J06 — Publish a schedule change

Authorized staff update a class entry and publish it according to KMAX's approval process. The public schedule shows the approved information. Registration remains in the existing Messenger group chat.

## 6. Functional requirements and acceptance criteria

| ID | Requirement | Acceptance criterion |
|---|---|---|
| WEB-01 | Public navigation and content | Home, About, Facilities, Programs, Membership Information, Class Schedule, and Contact are reachable and readable on phone and desktop. |
| WEB-02 | Verified information | Unconfirmed prices, schedules, trainers, testimonials, hours, and policies are absent or clearly identified as nonproduction placeholders. |
| WEB-03 | Class registration direction | The schedule states that registration uses the existing Messenger group chat and offers only an approved access/contact path; it has no registration form. |
| WEB-04 | Public schedule | Only published entries appear publicly, with correct Manila-local dates/times and no member or attendee data. |
| AUTH-01 | Protected dashboard | Unauthenticated users cannot open internal pages or call protected operations; staff see only authorized functions. |
| MEM-01 | Member registry | Authorized staff can create, find, and update members; possible duplicate full-name/mobile records are flagged; changes are attributable to an actor. |
| MEM-02 | Membership history | A renewal creates a new historical term or equivalent non-destructive record; prior term and payment details remain available to authorized staff. |
| MEM-03 | Expiry tracking | Dashboard status and expiring view reflect stored effective dates and KMAX-approved expiry/alert rules. |
| SCH-01 | Schedule management | Authorized staff can create, revise, publish, and cancel class entries; public display reflects their published state. |
| POS-01 | Counter checkout | Completed sales preserve product, quantity, price at sale time, total, operator, and payment state/method required by the approved process. |
| INV-01 | Sale and stock integrity | A completed sale changes stock exactly once; incomplete or failed sales do not; concurrent checkout cannot produce an invalid negative balance. |
| INV-02 | Stock management | Receiving and corrections record quantity, reason, actor, and time; current stock reconciles with movement history. |
| REPORT-01 | Sales and operations reports | Date-filtered sales and item totals reconcile with completed and reversed transactions; dashboard counts derive from stored records. |
| AUDIT-01 | Traceability | Membership corrections, payment changes, sale reversals, stock corrections, schedule publication, and role changes retain actor, time, and reason where applicable. |
| SEC-01 | Data separation | Public users cannot access member, staff, sales, or inventory data; unauthorized staff requests are rejected on the server. |

## 7. Unverified business rules and decisions to confirm

Every item below is an **ASSUMPTION**, not an approved KMAX policy. Implementation and public copy must wait for confirmation where the rule affects real operations.

| ID | Assumption to validate with KMAX | Why it matters |
|---|---|---|
| A02 — Membership offerings | Plan types, durations, joining rules, prices, discounts, and whether walk-ins or packages exist are unknown. | Public membership copy, member setup, and payment records. |
| A03 — Membership timing | Term start/end inclusivity, renewal start date, overlapping terms, grace periods, pauses, and activation after payment are unknown. | Accurate status and expiry. |
| A04 — Expiry alerts | The number of days that counts as “expiring soon” and whether reminders are used are unknown. | Dashboard filters and staff workflow. |
| A05 — Payments | Accepted methods, proof requirements, refund/void permissions, receipt process, and tax obligations are unknown. | POS, renewals, reports, and audit. |
| A06 — Inventory operations | Opening counts, reorder thresholds, sale-reversal behavior, correction approvals, and stocktake frequency are unknown. | Stock accuracy and controls. |
| A07 — Class schedule | Current programs, dates, times, instructors, locations, cancellation notice, and who may publish changes are unknown. | Accurate public schedule and staff permissions. |
| A08 — Public content | Address, opening hours, contact details, approved photos, logo use, program descriptions, and membership copy need confirmation. | Prevents false or unauthorized claims. |
| A09 — Messenger access | The group-chat link, join procedure, and exact wording for class registration have not been supplied. | Accurate public call to action. |
| A10 — Legacy data | Whether existing members, products, sales, and stock history will be imported is unknown. | Migration scope, privacy review, and opening balances. |

No class capacity or reservation limit is specified for this software because it does not accept class registrations. Real-world class limits remain a gym operating policy outside this software scope.

## 8. Conceptual records and integrity

This is information the eventual dashboard may need, not a finalized database schema.

- **Staff users and permissions:** Authenticated staff identity, assigned permissions, and audit events. No member authentication records.
- **Members:** Internal ID, full name, mobile number, creation/change metadata, and archival state if approved.
- **Memberships:** Approved plan snapshot, start/end dates, activation evidence, linked member, payment history, and renewal history. Preserve old terms rather than overwrite them.
- **Class schedule:** Program and public description, Manila-local display details, publication state, and change history. No participant, request, or booking records.
- **Products and stock:** Approved catalog and prices, stock movements, and current quantity derived or reconciled from those movements.
- **Counter sales:** Sale header, itemized lines with price snapshots, payment state, reversal metadata, and operator. Save a completed sale and its stock movements as one atomic operation.

Use database constraints and transactions for financial and stock integrity. Member lookup data, payments, staff identities, and audit logs are private. Keep fictional demo data separate from real gym records.

## 9. Sitemap and design direction

**Public:** Home (/), About (/about), Facilities (/facilities), Programs (/programs), Membership Information (/membership), Class Schedule (/classes), Contact (/contact). These may be pages or clearly navigable sections if the final design works better that way.

**Internal:** Dashboard (/admin), Members, Memberships, Class Schedule, POS, Inventory/Products, Sales Reports, and Staff Access/Settings. Exact URLs and screen grouping are implementation choices.

The public site should feel like a welcoming community gym while retaining KMAX's approved identity. The dashboard should favor fast member lookup, legible expiry states, clear totals, and usable phone/tablet counter flows. Temporary image placeholders must be replaceable. No invented testimonials or real-looking member data should appear in production content.

## 10. Technical, security, and quality direction

- The previously requested frontend stack is Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, and Lucide icons. No application work is part of this document revision.
- **ASSUMPTION A11 — Infrastructure:** Database, authentication provider, and hosting platform have not been approved. Choose them during implementation planning based on KMAX's security and operating needs.
- Require server-enforced staff authorization, secure sessions, recovery procedures, rate limiting, and protected secrets. Consider MFA for privileged staff during security design.
- Store timestamps consistently and display business dates in Asia/Manila. Store PHP amounts with exact decimal or integer-centavo representation; never use floating-point arithmetic for financial totals.
- Provide keyboard access, labeled forms, readable contrast, responsive layouts, and clear error/confirmation messages.
- Before live use, verify backups and restore, migration/rollback, error monitoring, staff training, and the approved privacy process.
- Do not connect real personal data to a prototype or use fictional data in production records.

## 11. Reporting and success measures

**Operational views:** Member totals by approved status, upcoming expiries, renewals over time, sales by date and product, current stock, and low-stock indicators if KMAX approves reorder thresholds. Reports must derive from saved records, not demo counters.

**Pilot measures to baseline:** Time to find a member and expiry; correctness of renewal history; ability to publish accurate schedule changes; counter sale and stock reconciliation; and staff completion of common workflows. Targets are not set until KMAX confirms current processes.

## 12. Delivery stages and exit gates

| Stage | Deliverable | Exit gate |
|---|---|---|
| 0. Discovery and approval | Confirm assumptions, business rules, content, media rights, staff permissions, privacy, and data sources. | KMAX owner/staff approve relevant decisions. |
| 1. Public website | The seven public areas, approved content, responsive layout, and schedule with Messenger group-chat guidance. | Content and schedule checked by KMAX; no member data or online registration. |
| 2. Internal operations | Staff authentication, member registry, membership history/expiry, and schedule management. | Permission, expiry, history, and publication checks pass. |
| 3. Counter operations and reporting | POS, inventory movements, sales reports, and dashboard summaries. | Transactions, stock, audit, and report totals reconcile. |
| 4. Controlled pilot | Approved data import if needed, staff training, backups, privacy review, and limited real-world trial. | KMAX signs off on procedures, security, and recovery. |

## 13. End-to-end acceptance scenarios

1. A visitor can reach every public area on a phone, view only approved schedule entries, and learn that class registration happens through the existing Messenger group chat without entering personal data on the site.
2. A visitor without staff credentials cannot access internal member records, sales, stock, or reports, including through direct requests.
3. Authorized staff can register a member by full name and mobile number after a duplicate check; no member login is created.
4. A renewal keeps the previous term and payment history visible while showing the correct new expiry under approved timing rules.
5. A member whose approved effective term has expired appears in the correct dashboard view; the expiring view uses the confirmed alert threshold.
6. A published class change appears on the public schedule in Manila local time; an unpublished draft or cancelled entry follows KMAX's confirmed display rules.
7. A completed counter sale records itemized prices and reduces stock once; an incomplete or failed sale leaves stock unchanged.
8. Simultaneous sales cannot make stock negative or duplicate a completed transaction.
9. An authorized stock correction retains reason, actor, and time, and the resulting balance reconciles with movement history.
10. Sales reports reconcile with completed and reversed transactions for the selected date range; unauthorized staff cannot view them.

## 14. Decisions required before live implementation

**Before public content is published:** Confirm address, hours, contact details, current programs and schedule, membership information, photo/logo rights, and how visitors reach the existing Messenger group chat.

**Before operational data is used:** Confirm staff permissions, membership plans and timing rules, expiry alert threshold, accepted payments and reversal process, privacy/retention procedures, inventory opening counts and corrections, and any legacy data import.

**Before production launch:** Approve authentication and hosting choices, backup/restore procedure, staff training, security review, and financial/receipt compliance process.

**Document owner:** KMAX Fitness project planning draft; subject to owner and staff validation.  
**Change control:** Record future scope and business-rule decisions with date, owner, and impact on content, operations, and tests.
