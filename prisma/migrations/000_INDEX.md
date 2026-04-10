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
| 027 | `027_donations_add_category.sql` | ALTER | donations: add category field |
| 028 | `028_donations_payment_and_family_member.sql` | ALTER | donations: add family_member + payment method linkage |
| 029 | `029_subscriptions_cancelled_at.sql` | ALTER | subscriptions: add cancelled_at for Cancelled status |
| 030 | `030_subscriptions_monthly_day_of_month.sql` | ALTER | subscriptions: add monthly_day_of_month (1-31) |
| 031 | `031_rentals_and_trips.sql` | CREATE | Enums rental_type (`long_term`, `short_term`), rental_payment_method; tables rentals, rental_tenants, rental_contracts, trips, trip_family_members; transactions: rental_id, trip_id (FKs + indexes). In the app, these are labeled **Lease (monthly rent)** and **Short stay (total for period)** via Prisma `@map` (`lease_monthly` / `short_stay`). |
| 032 | `032_tasks_links_and_assignee_validation.sql` | ALTER | tasks: add two title+URL link pairs; add DB check to prevent selecting both family_member_id and assigned_user_id simultaneously. |
| 033 | `033_tasks_schedule_and_due_dates.sql` | ALTER | tasks: add schedule_date (planned work date) and due_date (deadline). |
| 034 | `034_cars_domain.sql` | CREATE/ALTER | Cars domain: tables `cars`, `car_services`, `car_licenses`; enum `car_purchase_payment_method`; link `insurance_policies.car_id` and `transactions.car_id`. |
| 035 | `035_cars_name_and_notes_cleanup.sql` | ALTER | cars: add `custom_name`, `purchase_notes`, `sale_notes`; drop `vin`. |
| 036 | `036_jobs_domain.sql` | CREATE | Jobs domain: enums `job_employment_type`, `job_payroll_period_type`; tables `jobs`, `job_benefits`, `job_documents`, `job_payroll_entries`. |
| 037 | `037_donations_tax_authority_and_website.sql` | ALTER | donations: add Tax Authority submission flag + organization website URL. |
| 038 | `038_household_enabled_sections.sql` | CREATE | Household dashboard section enablement toggles. |
| 039 | `039_household_section_statuses.sql` | CREATE | Household setup "Done" tracking per dashboard section. |
| 040 | `040_digital_payment_methods_family_and_cards.sql` | ALTER | digital_payment_methods: optional family_member_id, primary/secondary credit card links, explicit date_created. |
| 041 | `041_loans.sql` | CREATE | Table `loans`: loan amounts/currency, institution, repayment day of month, maturity, totals, purpose, notes. |
| 042 | `042_therapy_clinic.sql` | CREATE/ALTER | Extend `job_employment_type`; enums + tables for private clinic (therapy clients, programs, treatments, receipts, expenses, appointments). |
| 043 | `043_therapy_consultations_travel.sql` | CREATE | Consultation types, consultations (income/cost + tx links), travel entries (job XOR treatment + tx link). |
| 044 | `044_subscriptions_digital_payment_method.sql` | ALTER | subscriptions: optional `digital_payment_method_id` FK → `digital_payment_methods`, index. |
| 045 | `045_car_petrol_fillups.sql` | CREATE | Table `car_petrol_fillups`: per-car petrol fill-ups (litres, odometer, amount, optional unique `transaction_id` → `transactions`). |
| 046 | `046_cars_purchase_extras.sql` | ALTER | `cars`: `purchased_from`, `purchase_odometer_km`, `extra_purchase_costs`, `extra_purchase_costs_notes`. |
| 047 | `047_car_licenses_receipt.sql` | ALTER | `car_licenses`: optional S3 receipt columns (`receipt_file_name`, `receipt_mime_type`, `receipt_storage_*`, `receipt_uploaded_at`). |
| 048 | `048_car_petrol_fillups_tanked_up_by.sql` | ALTER | `car_petrol_fillups`: optional `tanked_up_by_family_member_id` FK → `family_members`. |
| 049 | `049_insurance_policies_car_only_premium.sql` | ALTER | `insurance_policies`: `car_id` NOT NULL, drop `family_member_id`; add `policy_start_date`, `premium_paid`, `premium_currency`; car FK `ON DELETE CASCADE`. |
| 050 | `050_car_services_attachment_next_service.sql` | ALTER | `car_services`: optional `next_service_at` (DATE); optional S3 attachment columns (same pattern as `car_licenses` receipts). |
| 051 | `051_households_date_display_format.sql` | ALTER | `households`: enum `household_date_display_format` + `date_display_format` (default YMD) for per-household date display. |
| 052 | `052_user_level_preferences.sql` | CREATE/ALTER | `users.date_display_format` override + `user_enabled_sections` table for per-user section visibility overrides. |
| 053 | `053_loans_interest_rate_fields.sql` | ALTER | `loans`: add fixed rate percent and index-linked rate fields (`interest_rate_linked_index` + delta percent). |
| 054 | `054_therapy_clients_default_program_nullable.sql` | ALTER | `therapy_clients`: make `default_program_id` nullable (default program optional). |
| 055 | `055_ui_language_preferences.sql` | ALTER | `households`: add `ui_language` default (`en`); `users`: add nullable `ui_language` override. |
| 056 | `056_therapy_settings_nav_tabs.sql` | ALTER | `therapy_settings`: optional `nav_tabs_json` (JSONB) for per-tab private clinic nav visibility. |
| 057 | `057_therapy_category_name_he.sql` | ALTER | `therapy_consultation_types`, `therapy_expense_categories`: nullable `name_he`; backfill Hebrew for default English rows. |
| 058 | `058_therapy_note_labels_he.sql` | ALTER | `therapy_settings`: nullable `note_1_label_he`, `note_2_label_he`, `note_3_label_he`; optional backfill for default English labels. |
| 059 | `059_therapy_visit_type_default_amounts.sql` | CREATE | Table `therapy_visit_type_default_amounts`: default session fee per `therapy_visit_type` at job scope (`program_id` NULL) or program scope; partial unique indexes. |
| 060 | `060_insurance_types_savings_policies.sql` | ALTER/CREATE | `insurance_policies`: enum `insurance_policy_type`, optional `car_id`, `family_member_id`, `policy_number`; table `savings_policies` (balances, contributions, renewal/maturity). |
| 061 | `061_entity_urls_polymorphic.sql` | CREATE | Table `entity_urls`: polymorphic links (`entity_kind`, `entity_id`) per household; URL, optional title/notes, `sort_order`. Initial kinds: `insurance_policy`, `savings_policy`. |
| 062 | `062_useful_links.sql` | CREATE | Table `useful_links`: `scope` (`system` / `household` / `user`), `section_id` (dashboard section), optional `household_id` / `user_id`, URL + metadata. |

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
- [x] 027_donations_add_category.sql
- [x] 028_donations_payment_and_family_member.sql
- [x] 029_subscriptions_cancelled_at.sql
- [x] 030_subscriptions_monthly_day_of_month.sql
- [x] 031_rentals_and_trips.sql
- [x] 032_tasks_links_and_assignee_validation.sql
- [x] 033_tasks_schedule_and_due_dates.sql
- [x] 034_cars_domain.sql
- [x] 035_cars_name_and_notes_cleanup.sql
- [x] 036_jobs_domain.sql
- [x] 037_donations_tax_authority_and_website.sql
- [x] 038_household_enabled_sections.sql
- [x] 039_household_section_statuses.sql
- [x] 040_digital_payment_methods_family_and_cards.sql
- [x] 041_loans.sql
- [x] 042_therapy_clinic.sql
- [x] 043_therapy_consultations_travel.sql
- [x] 044_subscriptions_digital_payment_method.sql
- [x] 045_car_petrol_fillups.sql
- [x] 046_cars_purchase_extras.sql
- [x] 047_car_licenses_receipt.sql
- [x] 048_car_petrol_fillups_tanked_up_by.sql
- [x] 049_insurance_policies_car_only_premium.sql
- [x] 050_car_services_attachment_next_service.sql
- [x] 051_households_date_display_format.sql
- [x] 052_user_level_preferences.sql
- [x] 053_loans_interest_rate_fields.sql
- [x] 054_therapy_clients_default_program_nullable.sql
- [x] 055_ui_language_preferences.sql
- [x] 056_therapy_settings_nav_tabs.sql
- [x] 057_therapy_category_name_he.sql
- [x] 058_therapy_note_labels_he.sql
- [x] 059_therapy_visit_type_default_amounts.sql
- [x] 060_insurance_types_savings_policies.sql
- [x] 061_entity_urls_polymorphic.sql
- [x] 062_useful_links.sql
- [x] 063_therapy_treatment_attachments.sql

**Optional (not in default checklist):** `optional_migrate_legacy_digital_wallet.sql` — edit and run by hand if migrating from a legacy wallet table.

---

**Future scripts:** When table structures change, add a **new** numbered script only; do not modify older scripts that may already be applied. Run only those new ALTER scripts you haven’t run yet.
