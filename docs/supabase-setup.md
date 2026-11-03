# KMAX Supabase foundation

The owner confirmed that Supabase project `hysyosgartvkrfeayyri` is for testing. The confirmed `<admin-email>` Auth user has an active admin profile there. Use fictional data only. The public `/admin` dashboard remains an in-memory demo; `/staff` is the authenticated test workspace. A separate production Supabase project and its own staff accounts, credentials, backups, and environment variables are still needed before launch.

## Before connecting real data

1. Use separate Supabase projects for development/testing and production. Test with fictional data only.
2. Confirm staff permissions, membership timing and expiry rules, payment handling, stock corrections, privacy/retention, backups and restore procedures with KMAX. The current migration gives every active `admin` and `staff` the same operational permissions; do not use it with real staff until that access is approved or narrowed.
3. Disable public sign-ups in Supabase Auth and provision staff through a trusted administrator. Members do not have accounts.
4. Verify `kmax_private` is **not** listed as an exposed Data API schema. Row-level security and column grants protect the public tables, but exposed schema configuration and security review still matter.
5. Test staff sign-in, session refresh, account recovery, and authorization against the actual Supabase project before using real personal or financial data. Staff sign-in, the session-refresh proxy, and the staff authorization checks are implemented, but account recovery is not yet provided in the application.

## Environment and migration

Copy `.env.example` to `.env.local`, then fill in the Supabase project URL and **publishable** key from the intended project. Both variables are public by design. Keep `.env.local` ignored. Never put a secret key, service-role key, database password, or access token in `NEXT_PUBLIC_*`, frontend code, or Git.

The migration is `supabase/migrations/20261102000000_kmax_core.sql`. Review it and the target project before applying it. If the CLI project has not been initialized, `supabase init` can create its local configuration. The planned commands are:

```sh
supabase link --project-ref <approved-project-ref>
supabase db push --dry-run
# Apply only after reviewing the migration, target, access policies, and backup plan:
supabase db push
```

The core, mobile-format, group-class attendance, and walk-in migrations were applied to the linked test project on November 3, 2026. The mobile-format constraint preserves existing rows but requires invalid legacy numbers to be corrected on update. Do not point development or preview branches at production data; set up a separate production project before launch.

## Provision the first administrator

After the migration is applied, a trusted operator creates or invites the staff user through Supabase Auth. Using the SQL editor as an administrator, insert that Auth user's UUID into `public.staff_profiles`:

```sql
insert into public.staff_profiles (user_id, display_name, role, active)
values ('<auth-user-uuid>'::uuid, '<staff-display-name>', 'admin', true);
```

Never put a password or private key in this SQL or commit it. Profiles cannot be created or promoted through the public Data API. Disabling a profile immediately blocks its database access; separately revoke the Auth session when appropriate. The signed-in user can read only their own active staff profile.

## Application contract

- `createSupabaseBrowserClient()` in `lib/supabase/client.ts` uses only the public URL and publishable key.
- `createSupabaseServerClient()` and `getActiveStaff()` in `lib/supabase/server.ts` use server cookies. `getActiveStaff()` verifies claims with Supabase, then checks the active staff profile; it returns `null` when either check fails. A session-refresh proxy is required for production SSR, and every protected server operation must independently authorize access.
- Member, product, term and schedule creation use the staff-authorized RPCs below. Other authenticated users are not staff just because they have a Supabase Auth account. Anonymous visitors can read only the permitted columns of published schedule entries.
- Monetary values are integer centavos. Individual product prices, line totals, sale totals, and recorded membership payments are restricted to JavaScript's safe-integer range. Aggregate reports still need exact arithmetic if totals can exceed that range.
- Date-only membership start/end values are supplied by staff. Schedule times are timestamps displayed in `Asia/Manila`; end time may be null. New schedules are drafts. Coaching is a time entry only, with no member assignment or booking.

The write RPCs accept a globally unique UUID `p_idempotency_key`. Generate one per user operation and keep the same key and identical payload for a retry. A key used by a different actor, operation, or payload is rejected. The private ledger stores a SHA-256 payload hash, actor, operation and result ID, not the original member name/mobile. If the outcome of a write is uncertain and the original payload is unavailable, reconcile the record before starting a new operation.

| RPC | Inputs besides `p_idempotency_key` | Result |
| --- | --- | --- |
| `create_member_with_term` | `p_full_name`, `p_mobile`, `p_starts_on`, `p_ends_on`; optional `p_plan_name`, `p_amount_paid_centavos`, `p_payment_method` | Member UUID. Member and initial term commit together. |
| `append_membership_term` | `p_member_id`, `p_starts_on`, `p_ends_on`; optional plan, amount and payment method as above | New term UUID. Previous terms are immutable through the API. |
| `create_product_with_stock` | `p_name`, `p_price_centavos`, `p_initial_stock`; optional `p_sku` | Product UUID. Opening stock and its movement commit together. |
| `record_stock_adjustment` | `p_product_id`, non-zero `p_quantity_change`, `p_reason` | Stock movement UUID. A negative result is rejected. |
| `create_schedule_entry` | `p_title`, `p_category` (`group_class`, `taekwondo`, `coaching`), `p_starts_at`; optional `p_ends_at`, `p_description`, `p_coach_name` | Draft schedule UUID. |
| `complete_sale` | `p_payment_method`, `p_items` array of `{ product_id, quantity, expected_unit_price_centavos }` | Sale UUID. Checks current prices and stock; records sale lines and stock deductions atomically. |

If a product price changed after the cart was displayed, checkout fails and the cashier must refresh and confirm the new total. Concurrent sales lock products in a consistent order and cannot make stock negative. No refund, void, receipt, taxation, offline POS, or automated public schedule synchronization is implemented by this migration.

## Verification performed

The migration was tested in an isolated local PostgreSQL 18 database with simulated Supabase roles and `auth.uid()`. Checks covered anonymous and inactive-staff denial, published schedule visibility, atomic member/term creation, retries and cross-actor key reuse, immutable terms, direct stock-write denial, stale prices, money bounds and failed-sale rollback. Two simultaneous sales for one remaining unit resulted in one committed sale and one insufficient-stock error. Cloud SQL checks using a simulated admin identity verified member and renewal creation, product stock, checkout and retries, stale-price rejection, group-class attendance, walk-in payment, and schedule creation inside transactions that were rolled back. The owner confirmed signing in, but browser interactions, PostgREST writes, deployment, backups, and network-retry recovery still require integration testing. Sales reports do not yet reliably identify an unconfirmed request after a refresh; have an administrator verify it before clearing the review or retrying the sale.
