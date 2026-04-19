# Database migration index

Run scripts **in numeric order** (001 → 002 → …), not in the order listed below. The reference table is **newest first** so the latest script is at the top.

**Dates in brackets** are the **git first-commit date** (when the file was added to this repo). Replace them with the date you **applied** the script to a database if you track that separately.

**Do not edit scripts you have already run** (e.g. on production). New schema changes belong in the **next numbered** script only (`021_…`, `022_…`, …).

**If your database already has the full schema** (e.g. you see tables like `categories`, `payees`, `documents`, `source_records`, `transactions`, `studies_and_classes`, `subscriptions` and the related enums): **skip 001–003**. You only need to run **new ALTER scripts** (004, 005, …) when they are added for schema changes.

---

## Checklist (mark when run)

Check off each script after you run it. Newest first — same order as the detailed table below. Skip items your DB already has.

- [x] 083_therapy_receipts_client_program.sql (2026-04-19)
- [x] 082_therapy_program_visit_frequency.sql (2026-04-19)
- [x] 081_riseup_import_and_property_links.sql (—)
- [x] 080_users_show_useful_links.sql (2026-04-18)
- [x] 079_private_clinic_reminders_family_member.sql (2026-04-18)
- [x] 078_household_home_frequent_links.sql (2026-04-18)
- [x] 077_credit_cards_family_member_nullable.sql (2026-04-16)
- [x] 076_therapy_import_audits.sql (2026-04-16)
- [x] 075_therapy_clients_default_visit_type.sql (2026-04-16)
- [x] 074_therapy_receipt_allocations_consultations_travel.sql (2026-04-15)
- [x] 073_therapy_treatments_program_optional.sql (2026-04-15)
- [x] 072_therapy_receipts_covered_period.sql (2026-04-14)
- [x] 071_jobs_private_clinic_flag.sql (2026-04-14)
- [x] 070_therapy_treatment_payment_fields.sql (2026-04-14)
- [x] 069_therapy_clients_frequency_and_statuses.sql (2026-04-13)
- [x] 068_insurance_policy_company_notes_file.sql (2026-04-12)
- [x] 067_therapy_hebrew_transcription_provider.sql (2026-04-12)
- [x] 066_jobs_payment_links_privacy_entity_urls.sql (2026-04-11)
- [x] 065_private_clinic_insurance_reminders.sql (2026-04-11)
- [x] 064_subscriptions_transactions_jobs.sql (2026-04-10)
- [x] 063_therapy_treatment_attachments.sql (2026-04-10)
- [x] 062_useful_links.sql (2026-04-09)
- [x] 061_entity_urls_polymorphic.sql (2026-04-09)
- [x] 060_insurance_types_savings_policies.sql (2026-04-09)
- [x] 059_therapy_visit_type_default_amounts.sql (2026-04-09)
- [x] 058_therapy_note_labels_he.sql (2026-04-09)
- [x] 057_therapy_category_name_he.sql (2026-04-08)
- [x] 056_therapy_settings_nav_tabs.sql (2026-04-08)
- [x] 055_ui_language_preferences.sql (2026-04-07)
- [x] 054_therapy_clients_default_program_nullable.sql (2026-04-07)
- [x] 053_loans_interest_rate_fields.sql (2026-04-07)
- [x] 052_user_level_preferences.sql (2026-04-07)
- [x] 051_households_date_display_format.sql (2026-04-05)
- [x] 050_car_services_attachment_next_service.sql (2026-04-05)
- [x] 049_insurance_policies_car_only_premium.sql (2026-04-05)
- [x] 048_car_petrol_fillups_tanked_up_by.sql (2026-04-03)
- [x] 047_car_licenses_receipt.sql (2026-04-03)
- [x] 046_cars_purchase_extras.sql (2026-04-03)
- [x] 045_car_petrol_fillups.sql (2026-04-03)
- [x] 044_subscriptions_digital_payment_method.sql (2026-04-03)
- [x] 043_therapy_consultations_travel.sql (2026-04-03)
- [x] 042_therapy_clinic.sql (2026-04-03)
- [x] 041_loans.sql (2026-04-03)
- [x] 040_digital_payment_methods_family_and_cards.sql (2026-04-03)
- [x] 039_household_section_statuses.sql (2026-04-03)
- [x] 038_household_enabled_sections.sql (2026-04-03)
- [x] 037_donations_tax_authority_and_website.sql (2026-04-03)
- [x] 036_jobs_domain.sql (2026-04-01)
- [x] 035_cars_name_and_notes_cleanup.sql (2026-04-01)
- [x] 034_cars_domain.sql (2026-04-01)
- [x] 033_tasks_schedule_and_due_dates.sql (2026-03-31)
- [x] 032_tasks_links_and_assignee_validation.sql (2026-03-31)
- [x] 031_rentals_and_trips.sql (2026-03-30)
- [x] 030_subscriptions_monthly_day_of_month.sql (2026-03-30)
- [x] 029_subscriptions_cancelled_at.sql (2026-03-30)
- [x] 028_donations_payment_and_family_member.sql (2026-03-30)
- [x] 027_donations_add_category.sql (2026-03-30)
- [x] 026_drop_donation_commitments.sql (2026-03-30)
- [x] 025_donations.sql (2026-03-30)
- [x] 024_medical_appointments_payment_method_nullable.sql (2026-03-29)
- [x] 023_medical_appointments_drop_request_scope.sql (2026-03-29)
- [x] 022_medical_appointments_reimbursement_received.sql (2026-03-29)
- [x] 021_medical_appointments.sql (2026-03-29)
- [x] 020_subscriptions_optional_dates_currency_family_member.sql (2026-03-29)
- [x] 019_credit_cards_and_urls_followup.sql (2026-03-26)
- [x] 018_credit_card_cancellation_fields.sql (2026-03-24)
- [x] 017_align_database_to_app_repo.sql (2026-03-22)
- [x] 016_bank_account_members.sql (2026-03-22)
- [x] 015_digital_payment_method_linked_bank.sql (2026-03-22)
- [x] 014_digital_payment_methods.sql (2026-03-22)
- [x] 013_bank_accounts_date_closed.sql (2026-03-20)
- [x] 012_bank_accounts_fields.sql (2026-03-20)
- [x] 011_significant_purchases.sql (2026-03-20)
- [x] 010_identity_notes.sql (2026-03-19)
- [x] 009_identity_type_other.sql (2026-03-19)
- [x] 008_upcoming_renewals.sql (2026-03-19)
- [x] 007_properties_and_utilities.sql (2026-03-17)
- [x] 006_automatic_tasks.sql (2026-03-16)
- [x] 005_alter_family_members_phone_email_relationship.sql (2026-03-15)
- [x] 004_tasks.sql (2026-03-15)
- [x] 003_import_tables.sql (2026-03-14)
- [x] 002_studies_and_subscriptions.sql (2026-03-14)
- [x] 001_user_enums.sql (2026-03-14)

**Optional (not in default checklist):** `optional_migrate_legacy_digital_wallet.sql` (2026-03-22) — edit and run by hand if migrating from a legacy wallet table.

---

## Script reference (descriptions)

| #   | Script | Type | Description |
|-----|--------|------|-------------|
| 083 | `083_therapy_receipts_client_program.sql` (2026-04-19) | ALTER | `therapy_receipts`: optional `client_id` → `therapy_clients`, `program_id` → `therapy_service_programs` (indexes + FKs). |
| 082 | `082_therapy_program_visit_frequency.sql` (2026-04-19) | ALTER | `therapy_service_programs`: optional `visits_per_period_count`, `visits_per_period_weeks` (program-level default visit frequency). |
| 081 | `081_riseup_import_and_property_links.sql` (—) | ALTER | RiseUp: `properties.is_default_for_household`; `bank_accounts`/`credit_cards.property_id`; `property_utilities` payment FKs; `source_records.riseup_row`; `transactions` credit card, loan, RiseUp metadata columns. |
| 080 | `080_users_show_useful_links.sql` (2026-04-18) | ALTER | `users`: `show_useful_links` (boolean, default true) — super-admin toggle for dashboard useful-links UI per user. |
| 079 | `079_private_clinic_reminders_family_member.sql` (2026-04-18) | ALTER | `private_clinic_reminders`: optional `family_member_id` → `family_members` (per-practitioner manual reminders); backfill + index. |
| 078 | `078_household_home_frequent_links.sql` (2026-04-18) | ALTER | `households`: optional `home_frequent_links_json` (JSONB) for per-household home dashboard frequent-link shortcuts. |
| 077 | `077_credit_cards_family_member_nullable.sql` (2026-04-16) | ALTER | `credit_cards`: make `family_member_id` nullable to support auto-created cards from statement imports (including RiseUp). |
| 076 | `076_therapy_import_audits.sql` (2026-04-16) | CREATE | Add non-PII import audit trail (attempt status, duration, counts, failure details) linked to household user for superadmin visibility. |
| 075 | `075_therapy_clients_default_visit_type.sql` (2026-04-16) | ALTER | `therapy_clients`: add nullable `default_visit_type` to store client-level default visit type for treatment entry/import. |
| 074 | `074_therapy_receipt_allocations_consultations_travel.sql` (2026-04-15) | CREATE | Add receipt allocation tables for consultations and travel entries so organization receipts can fully link non-treatment income. |
| 073 | `073_therapy_treatments_program_optional.sql` (2026-04-15) | ALTER | `therapy_treatments`: make `program_id` nullable so sessions can exist without a service program (jobs with no programs). |
| 072 | `072_therapy_receipts_covered_period.sql` (2026-04-14) | ALTER | `therapy_receipts`: add `covered_period_start`/`covered_period_end` (DATE) for month coverage tracking + index for receivables reporting. |
| 071 | `071_jobs_private_clinic_flag.sql` (2026-04-14) | ALTER | `jobs`: add `is_private_clinic` boolean flag (default `true`) to drive import recipient type and bank strictness behavior. |
| 070 | `070_therapy_treatment_payment_fields.sql` (2026-04-14) | ALTER | `therapy_treatments`: optional `payment_date`, `payment_method` (bank transfer / digital payment), FK to `bank_accounts` or `digital_payment_methods`. |
| 069 | `069_therapy_clients_frequency_and_statuses.sql` (2026-04-13) | ALTER | `therapy_clients`: add `visits_per_period_count`, `visits_per_period_weeks`, `disability_status`, `rehab_basket_status` (private clinic client tracking fields). |
| 068 | `068_insurance_policy_company_notes_file.sql` (2026-04-12) | ALTER | `insurance_policies`: `insurance_company`, `notes`; optional policy document S3 columns (`policy_file_*`, `policy_storage_*`, `policy_file_uploaded_at`). |
| 067 | `067_therapy_hebrew_transcription_provider.sql` (2026-04-12) | ALTER | Enum `therapy_hebrew_transcription_provider`; `therapy_settings.hebrew_transcription_provider` (default `openrouter`). |
| 066 | `066_jobs_payment_links_privacy_entity_urls.sql` (2026-04-11) | ALTER | `jobs`: optional `bank_account_id`, `credit_card_id`; `households.show_entity_url_panels`. |
| 065 | `065_private_clinic_insurance_reminders.sql` (2026-04-11) | ALTER/CREATE | `insurance_policy_type`: `professional_liability`, `clinic_premises`; `insurance_policies`: contact + website; `therapy_clients.end_date`; `rentals.is_clinic_lease`; table `private_clinic_reminders`. |
| 064 | `064_subscriptions_transactions_jobs.sql` (2026-04-10) | ALTER | `subscriptions`: optional `job_id` → `jobs`; `transactions`: optional `job_id`, `subscription_id` → `subscriptions`; indexes. |
| 063 | `063_therapy_treatment_attachments.sql` (2026-04-10) | CREATE | `therapy_treatment_attachments`: S3 file metadata + optional transcription fields per treatment. |
| 062 | `062_useful_links.sql` (2026-04-09) | CREATE | Table `useful_links`: `scope` (`system` / `household` / `user`), `section_id` (dashboard section), optional `household_id` / `user_id`, URL + metadata. |
| 061 | `061_entity_urls_polymorphic.sql` (2026-04-09) | CREATE | Table `entity_urls`: polymorphic links (`entity_kind`, `entity_id`) per household; URL, optional title/notes, `sort_order`. Initial kinds: `insurance_policy`, `savings_policy`. |
| 060 | `060_insurance_types_savings_policies.sql` (2026-04-09) | ALTER/CREATE | `insurance_policies`: enum `insurance_policy_type`, optional `car_id`, `family_member_id`, `policy_number`; table `savings_policies` (balances, contributions, renewal/maturity). |
| 059 | `059_therapy_visit_type_default_amounts.sql` (2026-04-09) | CREATE | Table `therapy_visit_type_default_amounts`: default session fee per `therapy_visit_type` at job scope (`program_id` NULL) or program scope; partial unique indexes. |
| 058 | `058_therapy_note_labels_he.sql` (2026-04-09) | ALTER | `therapy_settings`: nullable `note_1_label_he`, `note_2_label_he`, `note_3_label_he`; optional backfill for default English labels. |
| 057 | `057_therapy_category_name_he.sql` (2026-04-08) | ALTER | `therapy_consultation_types`, `therapy_expense_categories`: nullable `name_he`; backfill Hebrew for default English rows. |
| 056 | `056_therapy_settings_nav_tabs.sql` (2026-04-08) | ALTER | `therapy_settings`: optional `nav_tabs_json` (JSONB) for per-tab private clinic nav visibility. |
| 055 | `055_ui_language_preferences.sql` (2026-04-07) | ALTER | `households`: add `ui_language` default (`en`); `users`: add nullable `ui_language` override. |
| 054 | `054_therapy_clients_default_program_nullable.sql` (2026-04-07) | ALTER | `therapy_clients`: make `default_program_id` nullable (default program optional). |
| 053 | `053_loans_interest_rate_fields.sql` (2026-04-07) | ALTER | `loans`: add fixed rate percent and index-linked rate fields (`interest_rate_linked_index` + delta percent). |
| 052 | `052_user_level_preferences.sql` (2026-04-07) | CREATE/ALTER | `users.date_display_format` override + `user_enabled_sections` table for per-user section visibility overrides. |
| 051 | `051_households_date_display_format.sql` (2026-04-05) | ALTER | `households`: enum `household_date_display_format` + `date_display_format` (default YMD) for per-household date display. |
| 050 | `050_car_services_attachment_next_service.sql` (2026-04-05) | ALTER | `car_services`: optional `next_service_at` (DATE); optional S3 attachment columns (same pattern as `car_licenses` receipts). |
| 049 | `049_insurance_policies_car_only_premium.sql` (2026-04-05) | ALTER | `insurance_policies`: `car_id` NOT NULL, drop `family_member_id`; add `policy_start_date`, `premium_paid`, `premium_currency`; car FK `ON DELETE CASCADE`. |
| 048 | `048_car_petrol_fillups_tanked_up_by.sql` (2026-04-03) | ALTER | `car_petrol_fillups`: optional `tanked_up_by_family_member_id` FK → `family_members`. |
| 047 | `047_car_licenses_receipt.sql` (2026-04-03) | ALTER | `car_licenses`: optional S3 receipt columns (`receipt_file_name`, `receipt_mime_type`, `receipt_storage_*`, `receipt_uploaded_at`). |
| 046 | `046_cars_purchase_extras.sql` (2026-04-03) | ALTER | `cars`: `purchased_from`, `purchase_odometer_km`, `extra_purchase_costs`, `extra_purchase_costs_notes`. |
| 045 | `045_car_petrol_fillups.sql` (2026-04-03) | CREATE | Table `car_petrol_fillups`: per-car petrol fill-ups (litres, odometer, amount, optional unique `transaction_id` → `transactions`). |
| 044 | `044_subscriptions_digital_payment_method.sql` (2026-04-03) | ALTER | subscriptions: optional `digital_payment_method_id` FK → `digital_payment_methods`, index. |
| 043 | `043_therapy_consultations_travel.sql` (2026-04-03) | CREATE | Consultation types, consultations (income/cost + tx links), travel entries (job XOR treatment + tx link). |
| 042 | `042_therapy_clinic.sql` (2026-04-03) | CREATE/ALTER | Extend `job_employment_type`; enums + tables for private clinic (therapy clients, programs, treatments, receipts, expenses, appointments). |
| 041 | `041_loans.sql` (2026-04-03) | CREATE | Table `loans`: loan amounts/currency, institution, repayment day of month, maturity, totals, purpose, notes. |
| 040 | `040_digital_payment_methods_family_and_cards.sql` (2026-04-03) | ALTER | digital_payment_methods: optional family_member_id, primary/secondary credit card links, explicit date_created. |
| 039 | `039_household_section_statuses.sql` (2026-04-03) | CREATE | Household setup "Done" tracking per dashboard section. |
| 038 | `038_household_enabled_sections.sql` (2026-04-03) | CREATE | Household dashboard section enablement toggles. |
| 037 | `037_donations_tax_authority_and_website.sql` (2026-04-03) | ALTER | donations: add Tax Authority submission flag + organization website URL. |
| 036 | `036_jobs_domain.sql` (2026-04-01) | CREATE | Jobs domain: enums `job_employment_type`, `job_payroll_period_type`; tables `jobs`, `job_benefits`, `job_documents`, `job_payroll_entries`. |
| 035 | `035_cars_name_and_notes_cleanup.sql` (2026-04-01) | ALTER | cars: add `custom_name`, `purchase_notes`, `sale_notes`; drop `vin`. |
| 034 | `034_cars_domain.sql` (2026-04-01) | CREATE/ALTER | Cars domain: tables `cars`, `car_services`, `car_licenses`; enum `car_purchase_payment_method`; link `insurance_policies.car_id` and `transactions.car_id`. |
| 033 | `033_tasks_schedule_and_due_dates.sql` (2026-03-31) | ALTER | tasks: add schedule_date (planned work date) and due_date (deadline). |
| 032 | `032_tasks_links_and_assignee_validation.sql` (2026-03-31) | ALTER | tasks: add two title+URL link pairs; add DB check to prevent selecting both family_member_id and assigned_user_id simultaneously. |
| 031 | `031_rentals_and_trips.sql` (2026-03-30) | CREATE | Enums rental_type (`long_term`, `short_term`), rental_payment_method; tables rentals, rental_tenants, rental_contracts, trips, trip_family_members; transactions: rental_id, trip_id (FKs + indexes). In the app, these are labeled **Lease (monthly rent)** and **Short stay (total for period)** via Prisma `@map` (`lease_monthly` / `short_stay`). |
| 030 | `030_subscriptions_monthly_day_of_month.sql` (2026-03-30) | ALTER | subscriptions: add monthly_day_of_month (1-31) |
| 029 | `029_subscriptions_cancelled_at.sql` (2026-03-30) | ALTER | subscriptions: add cancelled_at for Cancelled status |
| 028 | `028_donations_payment_and_family_member.sql` (2026-03-30) | ALTER | donations: add family_member + payment method linkage |
| 027 | `027_donations_add_category.sql` (2026-03-30) | ALTER | donations: add category field |
| 026 | `026_drop_donation_commitments.sql` (2026-03-30) | ALTER | Drop donation_commitments; add donations.renewal_date (optional reminder) |
| 025 | `025_donations.sql` (2026-03-30) | CREATE | Enum donation_kind + table donations (one-time / monthly commitment, org & Seif 46 fields) |
| 024 | `024_medical_appointments_payment_method_nullable.sql` (2026-03-29) | ALTER | medical_appointments: payment_method nullable (unknown at booking) |
| 023 | `023_medical_appointments_drop_request_scope.sql` (2026-03-29) | ALTER | medical_appointments: drop request scope columns + enum medical_reimbursement_request_scope |
| 022 | `022_medical_appointments_reimbursement_received.sql` (2026-03-29) | ALTER | medical_appointments: single reimbursement amount/date/source; drop per-channel amount_received |
| 021 | `021_medical_appointments.sql` (2026-03-29) | CREATE | Enums + table: medical_appointment_payment_method, medical_reimbursement_request_scope, medical_appointments |
| 020 | `020_subscriptions_optional_dates_currency_family_member.sql` (2026-03-29) | ALTER | subscriptions: optional dates, currency, optional family_member_id (UUID FK; repairs TEXT column if present) |
| 019 | `019_credit_cards_and_urls_followup.sql` (2026-03-26) | ALTER | Follow-up after 018: digital_wallet_identifier, charge_day_of_month, website_url fields + monthly_cost nullable + scheme enum values + settlement nullable |
| 018 | `018_credit_card_cancellation_fields.sql` (2026-03-24) | ALTER | credit_cards: consolidated migration (cancelled_at, notes, card_last_four required, monthly_cost, scheme, co_brand, product_name) |
| 017 | `017_align_database_to_app_repo.sql` (2026-03-22) | ALTER | Align legacy/broad schema to app repo (transactions, source_records, categories, …) |
| 016 | `016_bank_account_members.sql` (2026-03-22) | CREATE | bank_account_members (bank account ↔ family member) |
| 015 | `015_digital_payment_method_linked_bank.sql` (2026-03-22) | ALTER | digital_payment_methods: linked_bank_account_id → bank_accounts |
| 014 | `014_digital_payment_methods.sql` (2026-03-22) | CREATE | Enum + table: digital_payment_method_type, digital_payment_methods |
| 013 | `013_bank_accounts_date_closed.sql` (2026-03-20) | ALTER | bank_accounts: add date_closed |
| 012 | `012_bank_accounts_fields.sql` (2026-03-20) | ALTER | bank_accounts: add branch_name, sort_code, notes |
| 011 | `011_significant_purchases.sql` (2026-03-20) | CREATE | Significant purchases: warranty expiry + transaction linking |
| 010 | `010_identity_notes.sql` (2026-03-19) | ALTER | identities: add notes (optional) |
| 009 | `009_identity_type_other.sql` (2026-03-19) | ALTER | identities: add identity_type_other (free-text when type is Other) |
| 008 | `008_upcoming_renewals.sql` (2026-03-19) | CREATE | Upcoming renewals: add identity/insurance/donations tables + expiry/renewal columns |
| 007 | `007_properties_and_utilities.sql` (2026-03-17) | CREATE | Enums + tables: properties, property_utilities (homes & utility providers) |
| 006 | `006_automatic_tasks.sql` (2026-03-16) | NOOP | Documents that automatic tasks use existing tasks table (type = automatic) |
| 005 | `005_alter_family_members_phone_email_relationship.sql` (2026-03-15) | ALTER | family_members: add phone, email, relationship |
| 004 | `004_tasks.sql` (2026-03-15) | CREATE | Enums + table: task_type, task_status, task_priority, tasks |
| 003 | `003_import_tables.sql` (2026-03-14) | CREATE | Enums + tables: categories, payees, documents, source_records, transactions |
| 002 | `002_studies_and_subscriptions.sql` (2026-03-14) | CREATE | Enums + tables: studies_and_classes, subscriptions |
| 001 | `001_user_enums.sql` (2026-03-14) | CREATE | Enums: user_role, user_type (for users table) |

---

**Future scripts:** When table structures change, add a **new** numbered script only; do not modify older scripts that may already be applied. Run only those new ALTER scripts you haven’t run yet. Add the new row at the **top** of the table and checklist, with today’s date in brackets when you commit the file (or your DB apply date).
