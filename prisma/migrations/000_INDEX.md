# Database migration index

Run scripts in order by number. Check off each script after you run it.

**Do not edit scripts you have already run** (e.g. on production). New schema changes belong in the **next numbered** script only (`021_…`, `022_…`, …).

**If your database already has the full schema** (e.g. you see tables like `categories`, `payees`, `documents`, `source_records`, `transactions`, `studies_and_classes`, `subscriptions` and the related enums): **skip 001–003**. You only need to run **new ALTER scripts** (004, 005, …) when they are added for schema changes.

---

| #   | Script | Type | Description |
|-----|--------|------|-------------|
| 001 | `001_user_enums.sql` | CREATE | Enums: user_role, user_type (for users table) |
| 002 | `002_studies_and_subscriptions.sql` | CREATE | Enums + tables: studies_and_classes, subscriptions |
| 003 | `003_import_tables.sql` | CREATE | Enums + tables: categories, payees, documents, source_records, transactions |
| 004 | `004_tasks.sql` | CREATE | Enums + table: task_type, task_status, task_priority, tasks |
| 005 | `005_alter_family_members_phone_email_relationship.sql` | ALTER | family_members: add phone, email, relationship |
| 006 | `006_automatic_tasks.sql` | NOOP | Documents that automatic tasks use existing tasks table (type = automatic) |
| 007 | `007_properties_and_utilities.sql` | CREATE | Enums + tables: properties, property_utilities (homes & utility providers) |
| 008 | `008_upcoming_renewals.sql` | CREATE | Upcoming renewals: add identity/insurance/donations tables + expiry/renewal columns |
| 009 | `009_identity_type_other.sql` | ALTER | identities: add identity_type_other (free-text when type is Other) |
| 010 | `010_identity_notes.sql` | ALTER | identities: add notes (optional) |
| 011 | `011_significant_purchases.sql` | CREATE | Significant purchases: warranty expiry + transaction linking |
| 012 | `012_bank_accounts_fields.sql` | ALTER | bank_accounts: add branch_name, sort_code, notes |
| 013 | `013_bank_accounts_date_closed.sql` | ALTER | bank_accounts: add date_closed |
| 014 | `014_digital_payment_methods.sql` | CREATE | Enum + table: digital_payment_method_type, digital_payment_methods |
| 015 | `015_digital_payment_method_linked_bank.sql` | ALTER | digital_payment_methods: linked_bank_account_id → bank_accounts |
| 016 | `016_bank_account_members.sql` | CREATE | bank_account_members (bank account ↔ family member) |
| 017 | `017_align_database_to_app_repo.sql` | ALTER | Align legacy/broad schema to app repo (transactions, source_records, categories, …) |
| 018 | `018_credit_card_cancellation_fields.sql` | ALTER | credit_cards: consolidated migration (cancelled_at, notes, card_last_four required, monthly_cost, scheme, co_brand, product_name) |
| 019 | `019_credit_cards_and_urls_followup.sql` | ALTER | Follow-up after 018: digital_wallet_identifier, charge_day_of_month, website_url fields + monthly_cost nullable + scheme enum values + settlement nullable |
| 020 | `020_subscriptions_optional_dates_currency_family_member.sql` | ALTER | subscriptions: optional dates, currency, optional family_member_id (UUID FK; repairs TEXT column if present) |
| 021 | `021_medical_appointments.sql` | CREATE | Enums + table: medical_appointment_payment_method, medical_reimbursement_request_scope, medical_appointments |
| 022 | `022_medical_appointments_reimbursement_received.sql` | ALTER | medical_appointments: single reimbursement amount/date/source; drop per-channel amount_received |
| 023 | `023_medical_appointments_drop_request_scope.sql` | ALTER | medical_appointments: drop request scope columns + enum medical_reimbursement_request_scope |
| 024 | `024_medical_appointments_payment_method_nullable.sql` | ALTER | medical_appointments: payment_method nullable (unknown at booking) |
| 025 | `025_donations.sql` | CREATE | Enum donation_kind + table donations (one-time / monthly commitment, org & Seif 46 fields) |
| 026 | `026_drop_donation_commitments.sql` | ALTER | Drop donation_commitments; add donations.renewal_date (optional reminder) |

**Your checklist (mark when run; skip if your DB already has these):**

- [x] 001_user_enums.sql
- [x] 002_studies_and_subscriptions.sql
- [x] 003_import_tables.sql
- [x] 004_tasks.sql
- [x] 005_alter_family_members_phone_email_relationship.sql
- [x] 006_automatic_tasks.sql
- [x] 007_properties_and_utilities.sql
- [x] 008_upcoming_renewals.sql
- [x] 009_identity_type_other.sql
- [x] 010_identity_notes.sql
- [x] 011_significant_purchases.sql
- [x] 012_bank_accounts_fields.sql
- [x] 013_bank_accounts_date_closed.sql
- [x] 014_digital_payment_methods.sql
- [x] 015_digital_payment_method_linked_bank.sql
- [x] 016_bank_account_members.sql
- [x] 017_align_database_to_app_repo.sql
- [x] 018_credit_card_cancellation_fields.sql
- [x] 019_credit_cards_and_urls_followup.sql
- [x] 020_subscriptions_optional_dates_currency_family_member.sql
- [x] 021_medical_appointments.sql
- [x] 022_medical_appointments_reimbursement_received.sql
- [x] 023_medical_appointments_drop_request_scope.sql
- [x] 024_medical_appointments_payment_method_nullable.sql
- [x] 025_donations.sql
- [x] 026_drop_donation_commitments.sql

**Optional (not in default checklist):** `optional_migrate_legacy_digital_wallet.sql` — edit and run by hand if migrating from a legacy wallet table.

---

**Future scripts:** When table structures change, add a **new** numbered script only; do not modify older scripts that may already be applied. Run only those new ALTER scripts you haven’t run yet.
