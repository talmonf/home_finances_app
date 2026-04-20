# API route authorization audit

This documents how each HTTP API under `src/app/api` enforces authentication and **household scoping** (or super-admin exceptions). Last reviewed during the security assurance implementation.

## Legend

- **JWT**: `getToken` from `next-auth/jwt` with `NEXTAUTH_SECRET`.
- **Session**: `getAuthSession` / `getServerSession` from `@/lib/auth`.
- **Household**: `householdId` from token/session; queries use `where: { …, household_id: householdId }` (or equivalent scoped helpers).

| Route | Auth | Scoping / notes |
|-------|------|-----------------|
| `api/auth/[...nextauth]` | NextAuth | Public auth endpoints. |
| `api/auth/sync-session` | `getServerSession` | Session refresh; `callbackUrl` restricted to same-origin relative paths (`safeRelativeCallback`). |
| `api/import/upload` | JWT | Household only; `document` / `transactions` created with `household_id`. |
| `api/import/assist` | JWT | Document and transactions scoped; AI updates use `updateMany` with `household_id`. |
| `api/import/riseup/analyze` | JWT | Household only; in-memory analyze. |
| `api/import/riseup/commit` | JWT | Household only; FKs validated per `household_id`. |
| `api/rentals/contracts/upload` | JWT | Parent `rental` checked for `household_id`. |
| `api/jobs/documents/upload` | JWT | Job scoped to household. |
| `api/jobs/documents/[id]/download` | JWT | Document + household. |
| `api/cars/licenses` (POST) | JWT | Car and payment methods scoped. |
| `api/cars/licenses/[id]/download` | JWT | License scoped. |
| `api/cars/licenses/[id]/receipt` | JWT | License scoped; storage keys validated; DB updates use `updateMany` with `household_id`. |
| `api/cars/services/[id]/attachment` | JWT | Service scoped; `updateMany` with `household_id`. |
| `api/cars/services/[id]/download` | JWT | Service scoped. |
| `api/insurance-policies/[id]/policy-file` | JWT | Policy scoped; `updateMany` with `household_id`. |
| `api/insurance-policies/[id]/download` | JWT | Policy scoped. |
| `api/private-clinic/export` | Session | Household member; super-admin denied; job/client scope via `jobWherePrivateClinicScoped`. |
| `api/private-clinic/treatments` | `requireHouseholdMember` | Cursor page with `householdId` + family member scope. |
| `api/private-clinic/receipts` | `requireHouseholdMember` | Same pattern. |
| `api/private-clinic/import` | Session | Household; super-admin denied. |
| `api/private-clinic/import/tipulim` | Session | Household; `commitTipulimImport` validates `job_id` + household in lib. |
| `api/private-clinic/import/tipulim/example` | Session | Static example CSV; auth required. |
| `api/private-clinic/expense-image` | Session | Expense row scoped; `updateMany` with `household_id`. |
| `api/private-clinic/reports/therapist-diary` | Session | Audit rows filtered by allowed jobs. |
| `api/private-clinic/treatments/[id]/attachments` | JWT | Treatment scoped. |
| `api/private-clinic/treatment-attachments/[id]` | JWT | Attachment scoped; delete + S3. |
| `api/private-clinic/treatment-attachments/[id]/download` | JWT | Attachment scoped. |
| `api/private-clinic/treatment-attachments/[id]/transcribe` | JWT | Attachment scoped; transcription updates use `updateMany` with `household_id`. |

## Hardening applied

- Prefer **`updateMany` with `{ id, household_id }`** for writes after a scoped `findFirst`, so updates cannot target another tenant even if identifiers were reused incorrectly.

## Super-admin

Household-scoped APIs return **403** or **401** when `token.isSuperAdmin` or session has no `householdId`, as appropriate. Admin-only operations live under `src/app/admin` (server components / actions) and should continue to use `requireSuperAdmin` or equivalent—review when adding new admin APIs.
