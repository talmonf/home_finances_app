# Database migration index

Run scripts in order by number. Check off each script after you run it.

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

---

**Future scripts:** When table structures change, new scripts will be added with the next number and **Type: ALTER** (e.g. `004_alter_transactions_add_foo.sql`). Run only those new ALTER scripts you haven’t run yet.
