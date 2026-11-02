# KMAX Fitness Management System (KFMS)

> **Superseded:** This document is retained for historical reference only. Use [PRD.md](PRD.md) for the current project scope; the member portal and booking requirements below are no longer the approved scope.

## Product Requirements Document (PRD) — Version 1.0 Draft

**Date:** November 2, 2026  
**Status:** Planning draft — not yet approved by gym owner or staff  
**Product type:** Responsive public website + member portal + gym operations dashboard  
**Primary users:** KMAX gym visitors, members, trainers, reception staff, managers, and owner  
**Timezone:** Asia/Manila; currency: Philippine pesos (PHP)

> **How to read this document:** **Selected planning assumptions** are preferences supplied for this design exercise, not confirmed KMAX policies. Every rule labeled **ASSUMPTION** must be reviewed with KMAX management before real-world deployment. Dates, pricing, hours, class capacity, coaching arrangements, payment acceptance, and operating procedures remain unverified. Example numbers are illustrative only.

## 1. Executive summary

KMAX currently shares a monthly fitness class calendar and, according to the project brief, participants join classes by adding their names to a list circulated in a group chat. The planned platform replaces repeated manual list editing with an online timetable, reliable registration, a staff roster, and an optional staff-assisted booking flow. It also supports gym member records, membership expiration and renewal history, training appointments for boxing/taekwondo, and staff-operated sales and stock management for drinks and merchandise.

**Value proposition:** One source of truth for class schedules, registrations, membership standing, training sessions, and front-desk retail transactions.

**Success outcomes:** Fewer duplicate/overbooked registrations; faster membership lookup and renewal; more accurate training attendance; tracked counter sales and inventory changes; a useful public presence for the gym.

## 2. Inputs, decisions, and assumptions

### 2.1 Supplied inputs
- A November 2026 calendar image shows fitness program labels including MAXFIT, Cardio Blast Dance, HIIT, Yoga, S45, ABS-OLUTELY FIT, and MMA Strike. **Only the image's visible dates/program labels are supplied; exact session times, instructors, prices, and capacity are not supplied.**
- User describes the current group-chat process as a copy/paste list of participant names.
- User reports gym retail items such as water, Pocari Sweat, and Gatorade, plus boxing and taekwondo programs.
- Selected project assumptions: **mixed memberships**, **both self-booking and staff-assisted class booking**, **staff-operated counter POS**, **both group and private training**.

### 2.2 Assumptions to validate
- **A01:** KMAX offers time-based memberships and one-day/walk-in admission, plus prepaid training packages. Exact plans and prices are unknown.
- **A02:** Members may self-book after verifying or signing into an account linked to their member record; staff may book on behalf of a member or walk-in.
- **A03:** Some classes have a maximum capacity and a cutoff for booking/cancellation; actual values are set per session by staff.
- **A04:** Class eligibility may depend on an active membership, paid drop-in pass, or relevant session package. Owners will define the rules per program.
- **A05:** Boxing and taekwondo may have group classes, private appointments, coaches, and optional prepaid session credits; these may operate under different commercial policies.
- **A06:** Counter transactions can be logged with cash and manually verified e-wallet payment methods; no integrated payment gateway in MVP.
- **A07:** The gym will authorize use of its logo, class calendar content, photos, testimonials, and pricing on the public site.
- **A08:** Roles are Guest, Member, Trainer, Front Desk/Cashier, Manager/Admin, and Owner. One person may have several authorized staff roles.
- **A09:** No automatic grace period is given after a time-based membership expires unless the owner configures one.
- **A10:** Initial operational deployment is for a single KMAX gym branch; multi-branch management is future scope.
- **A11:** Staff will migrate legacy member records from an approved list with appropriate privacy safeguards; no automatic Facebook group-chat import.
- **A12:** Class waitlists, automated SMS, online payment collection, and recurring billing are not required in initial MVP.
- **A13:** A dedicated app-wide admin can define trainer availability, product catalog, price lists, and staff permissions.
- **A14:** Walk-ins can be represented by a minimal guest/customer record without being full account holders; required data and retention will be approved by management.

## 3. Product boundaries

### In scope — Initial operational MVP
1. **Public website:** Home, programs, gym information/gallery, current class calendar, contact/location, social links, accessible mobile layout, SEO basics. Show only owner-approved information.
2. **Staff access and administration:** Secure staff login, role-based access, dashboard, basic audit trail.
3. **Member registry:** Search/add/edit members; view membership and purchase history; manual membership enrollment and renewal with expiration tracking.
4. **Class scheduling and booking:** Staff-create/modify/cancel sessions; member self-booking; staff-assisted booking; enforce capacity, eligibility, uniqueness; attendance and cancellation.
5. **Boxing/taekwondo:** Represent both group sessions and private coach appointments. Staff book private appointments and avoid trainer time conflicts. Capture prepaid credits when packages are sold.
6. **Staff-operated POS:** Product catalog, paid/unpaid sale workflow, manual payment method, sale items and totals, inventory deduction upon completed sale, stock receiving/adjustments, low-stock view.
7. **Basic reporting:** Member status, expiring soon, bookings/attendance, daily POS totals, items sold, current stock.
8. **Basic member portal:** Linked account login, upcoming bookings, own membership expiration, cancellation if policy allows. Member portal may be feature-gated until identity linking is tested.

### Out of scope — Initial MVP
Integrated card/GCash payment gateway; automatic recurring charges; full accounting and BIR-compliant fiscal receipt integration; face recognition, biometric attendance, turnstiles; SMS/WhatsApp/Facebook Messenger automation; public exposure of class participant names; automatic Facebook scraping or GC sync; multi-branch tenancy; mobile native apps; advanced accounting, payroll, and loyalty rewards; automated waitlist; detailed personal training workout plans.

## 4. Users, roles, and permissions

| Role | What they can do | Important restriction |
|---|---|---|
| Guest / website visitor | Browse pages and public schedule; inquire through approved contact links | No private names, rosters, member details, or admin data |
| Member | View own profile, membership status and bookings; self-book/cancel permitted classes | Cannot see other members' contact details or payment history |
| Trainer | View sessions and attendance rosters assigned to them; mark attendance if authorized | No full gym finances, product margins, unrelated profiles |
| Front Desk / Cashier | Find/register members, assist bookings, record membership payments and POS transactions, check in participants | Cannot grant staff roles or edit security settings; voids may need approval |
| Manager / Admin | Manage schedules, capacity, trainers, member plans, products, inventory adjustments, reports, and authorized staff | Owner-restricted business/security settings remain protected |
| Owner | All management reports and operational configuration; assign/administer staff roles | Sensitive actions audited; strong authentication required |

**Authorization principle:** Enforce permissions server-side and in PostgreSQL Row Level Security. Hiding a button is not authorization. Trainer access is scoped to assigned sessions. Do not expose privileged keys to the browser.

## 5. Core user journeys

### J01 — New membership
Reception creates or locates a member -> chooses plan -> captures start/end dates and price snapshot -> records payment details and operator -> membership becomes eligible according to verified payment/activation rules -> receipt/reference is recorded -> renewal/expiry appears on dashboard.

### J02 — Membership renewal
Staff opens a member -> sees existing and historical terms -> selects renewal plan and effective start date -> records amount and manual payment confirmation -> new term is stored separately (old term is not overwritten) -> updated expiry is shown. Overlapping terms require defined policy or admin approval.

### J03 — Self-book a class
Member logs in -> opens calendar -> selects a specific session -> sees date, time, rules, open capacity -> clicks Join -> server checks member identity, eligibility, duplicate active booking, cutoff and capacity inside a transaction -> confirms one booking -> displays result in My Bookings.

### J04 — Staff-assisted group booking
Staff finds member/creates limited guest record -> opens session -> books on their behalf -> same eligibility and capacity validations apply unless an explicit audited override is granted -> booking appears on staff roster and (if account linked) in member portal.

### J05 — Group session / private coaching
Staff creates program session (group capacity N; private capacity 1) with coach/location/start/end -> checks trainer availability -> adds participant(s) -> where a prepaid package is used, reserves/consumes one credit according to attendance/payment rules -> staff marks completed, cancelled, no-show, or attended.

### J06 — Retail checkout
Cashier adds water/Pocari/Gatorade quantities -> system displays itemized price and total -> cashier confirms payment method and amount -> server saves the sale, items and stock movement as one transaction -> dashboard updates sales and stock. An unpaid cart does not deduct stock.

### J07 — Stock receiving / correction
Authorized staff records supplier/restock quantity or adjustment with reason -> inventory ledger is updated -> current stock is derived from movements -> adjustment is audited.

## 6. Functional requirements and testable acceptance criteria

| ID | Requirement | Acceptance criteria for MVP |
|---|---|---|
| WEB-01 | Responsive public website | Public home, programs, calendar, contact pages work on phone and desktop; no fabricated business details |
| WEB-02 | Public schedule | Approved future sessions show correct program, Manila-local date/time, and availability without participant identities |
| AUTH-01 | Secure role login | Unauthorized users cannot open protected routes or call protected operations; permission tests pass |
| MEM-01 | Member creation/search | Staff can create/search by approved identifiers; duplicates flagged; contact/profile changes audited where relevant |
| MEM-02 | Membership terms | Staff can create an initial term and renew without deleting historical terms; current status/expiry is accurate |
| MEM-03 | Expiry monitoring | Dashboard distinguishes active, expiring soon and expired using configurable threshold (default example: 7 days) |
| BOOK-01 | Session management | Admin can create/update/cancel group sessions, capacities, trainer and schedules; enrolled users see changes |
| BOOK-02 | Self-book and staff-book | Both pathways work with shared business validations and distinguish who created booking |
| BOOK-03 | No duplicates/overbooking | Repeated clicks or concurrent requests cannot create two active bookings for same person/session or exceed capacity |
| BOOK-04 | Cancellation and attendance | Authorized user can cancel under configured policy; staff marks attendance; released capacity becomes available |
| TRAIN-01 | Group and private training | Booking supports coach-led group sessions and private sessions with one participant, and rejects coach schedule conflicts |
| TRAIN-02 | Training credits | For credit-based packages, credits are issued through a recorded purchase and cannot fall below zero or be deducted twice |
| POS-01 | Counter checkout | Staff can complete a sale with item quantities, unit-price snapshots, payment method, and correct total |
| POS-02 | Inventory synchronization | Completed sales decrement stock exactly once; insufficient stock is rejected; incomplete carts do not change stock |
| POS-03 | Restocking and corrections | Authorized staff can add stock and adjust stock with reason; all movements are queryable |
| REPORT-01 | Operational dashboard | Counts and daily totals reflect saved transactions and bookings; no hard-coded demo metrics in production |
| SEC-01 | Privacy/access control | Members access only their own records; trainers only assigned rosters; visitors see no personal data |
| AUDIT-01 | Traceability | Payment modifications, booking overrides, voids, stock corrections and role changes retain timestamp, actor, and reason |

## 7. Detailed business rules (proposed, NOT YET VERIFIED)

### Memberships — A01, A04, A09
- **ASSUMPTION M1:** `time_based` memberships have start/end dates; `day_pass` access is valid for the selected date; `session_package` is tracked in credits, not as an expiry-only membership.
- **ASSUMPTION M2:** An active time-based membership means current Manila date falls within its paid effective term and membership is not suspended/voided. `Expiring soon` is a dashboard label layered on an otherwise active term.
- **ASSUMPTION M3:** Purchases may be pending, paid, voided, or refunded; only eligible paid/approved terms grant access. Manual e-wallet entries require staff confirmation.
- **ASSUMPTION M4:** A renewal is a new `membership_terms` row; historical price, dates and who processed it remain immutable except authorized audited corrections.
- **ASSUMPTION M5:** Scheduled expiration alerts are in-dashboard initially; outbound email/SMS reminders are optional later. No assumed grace period.

### Class registration — A02, A03, A04, A12, A14
- **ASSUMPTION B1:** Each class instance has capacity, session start/end, booking cutoff and cancellation cutoff. Staff controls values.
- **ASSUMPTION B2:** One active booking per member per session; cancelled rows are retained for history. Concurrent last-slot requests are serialized safely.
- **ASSUMPTION B3:** Eligibility can require active membership, day pass, purchased ticket, session credits, or authorized staff override, depending on program configuration; no universal rule is assumed.
- **ASSUMPTION B4:** A full class rejects new bookings in MVP. Waitlisting can be added later.
- **ASSUMPTION B5:** Booking/attendance/cancellation events are stored; no-shows are tracked without automatic penalties until management approves a policy.
- **ASSUMPTION B6:** Roster names and phone numbers are visible only to permitted staff/trainers, never in public calendar pages.

### Boxing and taekwondo — A05
- **ASSUMPTION T1:** Programs can have `group` or `private` session types. Private sessions have a single assigned client and coach.
- **ASSUMPTION T2:** Trainer time conflicts and private session overlaps are rejected unless an authorized override explicitly resolves them.
- **ASSUMPTION T3:** Package credits are decremented when attendance is confirmed, not merely when a slot is reserved; cancellation/no-show credit rules require owner confirmation. Reserve credits at booking to prevent overspending or use a separate reservation ledger.
- **ASSUMPTION T4:** Program age/guardian, skill level, gear, and waiver policies must be reviewed with the owner, especially for taekwondo participants who may be minors.

### POS and inventory — A06, A13
- **ASSUMPTION P1:** All prices are entered and approved by staff/owner; no price should be inferred from online sources.
- **ASSUMPTION P2:** An itemized sale captures price at sale time, quantity, operator, payment method, status and optional member/customer reference.
- **ASSUMPTION P3:** Stock changes only upon completed paid sales, receiving or authorized adjustments; rejected/cancelled sales do not deduct stock.
- **ASSUMPTION P4:** Voiding a completed sale is a separate reversal that restores stock if appropriate, with permission and audit log; never silently delete a transaction.
- **ASSUMPTION P5:** Prevent negative stock. Restock alerts use product-specific reorder thresholds. No online ordering in MVP.
- **ASSUMPTION P6:** The platform logs sales for internal operations; it does not claim to issue BIR-compliant receipts without a separately validated fiscal solution.

## 8. Data model / relational structure

### Identity and access
- `auth.users` (Supabase managed) **1—0..1** `members` via nullable `members.auth_user_id`; member records can exist without online accounts.
- `auth.users` **1—many** `staff_role_assignments`; assignments reference `roles` and optionally assigned trainer/branch scope.
- `members`: `id`, `auth_user_id?`, `member_code`, `full_name`, approved contact fields, `created_at`, `archived_at?`.
- `roles`, `staff_role_assignments`, `audit_logs`: role, permissions, actor, action, target, reason, before/after metadata where appropriate.

### Membership and payments
- `membership_plans` **1—many** `membership_terms` **many—1** `members`.
- `membership_terms`: `id`, `member_id`, `plan_id`, `starts_on`, `ends_on`, `price_snapshot`, `state`, `created_by`, `created_at`, `superseded_or_voided_at?`.
- `membership_payments` **many—1** `membership_terms`: amount, currency, method, reference, status, verified_by, timestamp. Prefer separate payment tables or a well-constrained shared `payments` table; do not use a loosely validated polymorphic reference.
- `day_passes`: optional admission purchases with `valid_on`, `member_id?`, linked payment; subject to verified gym policy.

### Programs, sessions, bookings
- `programs` **1—many** `class_sessions`: Yoga, HIIT, MAXFIT, Boxing, Taekwondo etc.
- `trainers` / authorized `staff_users` **1—many** `class_sessions` via `trainer_id`.
- `class_sessions`: `id`, `program_id`, `session_type` (`group`/`private`), `trainer_id`, `starts_at`, `ends_at`, `capacity`, `location?`, `status`, registration policy fields.
- `class_sessions` **1—many** `bookings` **many—1** `members`; booking has `status`, `booked_by`, `booked_at`, `cancelled_at?`, `attendance_status`, override reason if any.
- `training_packages` define purchasable plans; `member_training_packages` contain purchases; `credit_ledger` tracks issued, reserved, consumed, returned credits, linked to bookings and payment.
- Constraints: session `ends_at > starts_at`; capacity positive; private capacity 1; unique active booking by member/session; transactional capacity enforcement; trainer time-conflict validation.

### Counter retail
- `products` **1—many** `sale_items` **many—1** `sales`.
- `products`: SKU, name, active status, current price, cost (restricted), reorder threshold.
- `sales`: cashier, created_at, payment method, payment status, total, optional linked member, void/reversal metadata.
- `sale_items`: product, quantity, unit_price_snapshot, line_total.
- `inventory_movements`: product, delta quantity (+ received / - sold), reason/type, reference sale or adjustment, actor, timestamp.
- Use transactional sale completion to insert sale items, confirm payment, and record inventory movements together. Stock-on-hand = opening stock + sum of committed movements (optionally cached safely for performance).

### Relationship rules / indexes
- Foreign keys on all parent IDs; indexes on `members.member_code`, `membership_terms(member_id, starts_on, ends_on)`, `class_sessions(starts_at, program_id)`, `bookings(session_id, member_id)`, `sales(created_at)`, `inventory_movements(product_id, created_at)`.
- Use database-level uniqueness, check constraints and transactions in addition to application validations.
- Never depend on client-side counts for determining a last available booking slot or stock quantity.

## 9. Sitemap and primary screens

**Public:** `/`, `/about`, `/programs`, `/schedule`, `/contact`, `/login`  
**Member:** `/member/dashboard`, `/member/bookings`, `/member/membership`, `/member/profile`  
**Staff:** `/admin`, `/admin/members`, `/admin/members/[id]`, `/admin/memberships`, `/admin/programs`, `/admin/sessions`, `/admin/bookings`, `/admin/trainers`, `/admin/pos`, `/admin/products`, `/admin/inventory`, `/admin/reports`, `/admin/settings`

**Suggested layout:** Public-facing KMAX-branded responsive marketing site; practical, fast and low-friction operational dashboard. Keep shared design tokens but separate layouts/navigation. Ensure a cashier can record a sale on a phone/tablet. Staff should search members quickly by name or member code. Use clear status badges and confirmations for important mutations.

## 10. Technical architecture

- **App:** Next.js App Router + TypeScript, Tailwind CSS, accessible UI components.
- **Data and authentication:** Supabase PostgreSQL + Supabase Auth; Row Level Security and explicit grants/policies; server-side permission checks on all reads/writes.
- **Storage:** Owner-approved gym media only; restrict private member attachments.
- **Hosting:** Vercel or approved platform for web; managed database configured with secure credentials, backups and logging.
- **Design:** Modular monolith: public site, membership, scheduling, training, POS, inventory, reporting in one repository. Avoid premature microservices.
- **Transactions:** Database transactions and locking for last-slot booking, package-credit use, completed checkout, inventory changes and reversals.
- **Time and money:** Store timestamps in UTC; render Asia/Manila; monetary amounts as fixed-precision decimals or integer centavos; store currency as PHP.
- **Configuration:** Make capacity, cancellation cutoff, expiry warning threshold and business policies configurable after validation, rather than embedding magic numbers.
- **Environments:** Development, staging and production; migrations and seed data in version control; demo records never intermixed with real gym member data.

## 11. Security, privacy, compliance and nonfunctional requirements

- **Privacy:** Collect only necessary personal data, supply an owner-approved privacy notice, define purposes, lawful basis, retention and access/deletion request process; avoid exposing roster names to public visitors. Philippines Data Privacy Act (RA 10173) is relevant. Obtain legal/owner review before go-live.
- **Role security:** Every protected page, server action, API route and direct table path enforces access. Test RLS deny cases, not only allow cases. Service-role secrets remain server-side.
- **Authentication:** Secure login, password reset, session expiry, rate limiting; MFA strongly recommended for owner/admin accounts.
-**Authentication** FOR MEMBEWRS LOGIN MOBILE NUMBER AND NAME IS ENOUGH SINCE IITS NOT PRIVACY ONLY RESERVE AND ADMIN WILL APPROVE THE RESERVATION
- **Auditability:** Record actor/time/reason for role assignments, manual overrides, refunds/voids, stock adjustments and payment corrections.
- **Reliability:** No duplicate active booking, double credit deduction, oversold capacity, or negative stock when requests race.
- **Performance goals (proposed):** Core interactions feel responsive on typical mobile connections; agree measurable web performance thresholds during implementation. Prioritize readable forms and accessible mobile UX.
- **Operations:** Automatic database backups/restore test, error monitoring, staff onboarding guide, and safe rollback/migration procedure before production launch.
- **Accessibility:** Keyboard navigation, labeled form fields, readable contrast, and confirmations/error messages.
- **Minors:** Confirm whether programs involve minors; parental/guardian information and any waivers require explicit approved procedures.

## 12. Reports and metrics

**Dashboard data (derived, no fabricated production numbers):** active members, expiring in 7 days (threshold configurable), expired members, upcoming booked sessions, class fill rate, checked-in attendance, sales for day/week, top products, stock on hand, low-stock items, prepaid training-credit liability (future finance review).

**Success measurement (define baseline before pilot):** share of class registrations done via system; number of duplicate booking incidents; reception time to find member/expiry; time to check class roster; correctness of completed POS transactions and reconciled stock; percentage of trained staff successfully completing core workflows.

## 13. Delivery stages and exit gates

| Stage | Deliverable | Exit gate |
|---|---|---|
| 0. Discovery / approval | Confirm policies, class schedule, plans, owners, copy/media, roles, data collection; approve PRD | Owner/staff sign off critical assumptions and access policies |
| 1. Website and schedule | Public website, verified content, browseable class calendar, responsive UI | Content approved; mobile QA; no member data exposed |
| 2. Operations core | Auth/RBAC, member registry, membership history, admin session management, member/staff booking, attendance, group/private sessions | Security checks and booking concurrency/expiry tests pass |
| 3. POS and inventory | Counter checkout, product management, movements, refunds/voids, reports | Sales/stock reconciliation and permission tests pass |
| 4. Pilot and launch | Data migration, staff training, backups, documented procedures, limited live trial | Owner approves actual data, flows, privacy posture and rollback plan |
| Later | Waitlist, SMS, online payments, integrated accounting, multi-branch support | Separate discovery and PRD addendum |

**MVP definition:** A controlled pilot only qualifies as the **operational MVP** after Stages 1–3 are complete, core security tests pass and KMAX approves policies. Each prior stage is a testable intermediate increment, not necessarily a public production launch.

## 14. MVP end-to-end acceptance scenarios

1. **New member:** Given authorized reception staff, when they create a member, sell a defined membership and verify payment, then the member has a visible, accurate start/end date and the purchase is recorded.
2. **Expiry:** Given a member whose last paid time-based term ended yesterday in Manila time, when dashboard opens today, then member is marked expired and appears in the expired filter (unless a verified approved policy changes this).
3. **Renewal history:** Given an expired member, when staff renews for another period, then the previous term/payment remains in history and the new expiry is correct.
4. **Self and staff booking:** Given a session with two free slots and an eligible member, when member or staff submits a booking, then one active booking exists and the roster shows it.
5. **Concurrent final slot:** Given one slot remaining, when two requests book simultaneously, then exactly one succeeds, capacity is never exceeded, and the other receives a clear full-session message.
6. **Repeat booking:** Given a member already booked, when the same booking request is repeated, then no duplicate booking or duplicate credit consumption occurs.
7. **Eligibility:** Given a member without the required entitlement, when they try to book a restricted session, then booking is denied with an explanatory message; approved override, if supported, is audited.
8. **Cancellation:** Given a cancellable reservation, when it is cancelled, then the roster no longer counts it as active and the slot becomes available according to cancellation policy.
9. **Trainer conflict:** Given an instructor with a private appointment at 6 PM, when staff tries to schedule an overlapping appointment for that coach, then a conflict is displayed and double-booking is prevented.
10. **Training credits:** Given a valid package with one remaining credit, when attendance is confirmed for one applicable class, then the ledger reflects one consumption and another concurrent use is not allowed.
11. **Retail sale:** Given 10 bottled waters in stock, when cashier completes a paid sale of 2, then inventory becomes 8, itemized transaction is recorded and daily sales totals increase correctly.
12. **Insufficient inventory:** Given one item in stock, when two simultaneous checkouts each try to sell one, then only one completes and stock never becomes negative.
13. **Void:** Given a completed sale, when an authorized manager voids it with reason, then the sale is marked reversed, necessary stock reversal is logged and original transaction remains visible.
14. **Permissions:** Given public visitor, member, trainer and cashier test accounts, when each accesses unauthorized routes or data directly, then server/database reject access without exposing other users' records.
15. **Responsive operation:** Given a phone-sized viewport, staff can search a member and complete a test sale without broken layout or inaccessible controls.
16. **Reporting:** Given saved bookings, terms and sales, when dashboard reloads, then metrics match database records (not hard-coded placeholders).
17. **Data integrity:** Given failed mid-transaction booking/checkout, then no partial sale/stock change or inconsistent booking/credit record remains.

## 15. Decisions required from KMAX before production

**Priority 0 (blocking):** Owner authorization to build/deploy and use media; actual membership plans/prices and activation rules; allowed customer data; booking eligibility; class capacities/times; booking/cancellation cutoffs; boxing/taekwondo coach scheduling rules and pricing; who can edit payments, void transactions, and use booking overrides; accepted payment methods and receipt workflow; privacy ownership and retention.

**Priority 1 (before pilot):** Historical member import format; staff list and training schedule; exact product catalog/prices/opening stock; approved descriptions, photos and opening hours; expiry-warning threshold; data backup and handover owner; member account verification process and handling of minors.

**Priority 2 (later):** Automatic reminders, advanced analytics, waitlist, loyalty, integrated online payments, optional second branch.

## 16. Recommended Codex execution contract

- Read this PRD first. Do not invent business prices, schedules, capacity or personal data.
- Start with schema, migrations, RLS/role permission tests, and user-flow wireframes. Present a brief plan before implementation.
- Build vertical slices one at a time: (a) website/schedule -> (b) memberships -> (c) bookings -> (d) training -> (e) POS/inventory -> (f) reports.
- For each slice: implement database + validation + UI + permission checks + tests + README. Run lint, typecheck, tests and build before advancing.
- Keep unverified rules configurable/feature-gated. Use demo data clearly labeled as fictional; never seed realistic-looking data into production.
- Ask for explicit owner decisions before implementing policy-sensitive behavior, online billing or notifications.

## 17. External technical/legal references (for implementation review)

- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Next.js authentication and authorization: https://nextjs.org/docs/app/guides/authentication
- National Privacy Commission, Data Privacy Act: https://privacy.gov.ph/data-privacy-act/

**Document ownership:** Project planning draft for KMAX Fitness; subject to staff and owner validation.  
**Change control:** Record requirement changes with date, version, owner decision and impact on database/UI/tests.
