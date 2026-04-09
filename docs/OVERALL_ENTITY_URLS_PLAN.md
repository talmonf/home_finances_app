# Overall plan: polymorphic entity URLs (`entity_urls`)

Household-scoped links attached to domain records via `(entity_kind, entity_id)`. Implemented for **insurance policies** and **savings policies** (migration `061_entity_urls_polymorphic.sql`).

## Done

- Table `entity_urls`: `household_id`, `entity_kind`, `entity_id`, `url`, optional `title` / `notes`, `sort_order`, timestamps.
- Enum `entity_url_entity_kind`: `insurance_policy`, `savings_policy`.
- Server actions: [`src/lib/entity-urls/actions.ts`](../src/lib/entity-urls/actions.ts) (create/delete, parent verification, safe redirect prefix `/dashboard/`).
- UI: [`src/components/entity-urls-panel.tsx`](../src/components/entity-urls-panel.tsx) embedded under each row on insurance and savings list pages.

## Still to do (rollout to other entities)

For each new entity type, complete **all** of the following and tick here.

| Entity (suggested `entity_kind` value) | Migration enum value | Extend `verifyEntityUrlParent` | Extend `parseEntityUrlEntityKind` | UI surface (list vs detail page) | On parent delete |
|----------------------------------------|----------------------|--------------------------------|-----------------------------------|-----------------------------------|------------------|
| Loans | `loan` | Yes | Yes | e.g. loan detail or list row | Delete matching `entity_urls` in same transaction when loan delete exists |
| Subscriptions | `subscription` | Yes | Yes | Subscription detail | Same |
| Donations | `donation` | Yes | Yes | Donation detail | Same |
| Cars | `car` | Yes | Yes | Car detail page | Same |
| Bank accounts | `bank_account` | Yes | Yes | Account detail | Same |
| Credit cards | `credit_card` | Yes | Yes | Cards list or detail | Same |
| Digital payment methods | `digital_payment_method` | Yes | Yes | Method detail | Same |
| Properties | `property` | Yes | Yes | Property detail | Same |
| Rentals | `rental` | Yes | Yes | Rental / property context | Same |
| Significant purchases | `significant_purchase` | Yes | Yes | List or detail | Same |
| Medical appointments | `medical_appointment` | Yes | Yes | Appointment detail | Same |
| Tasks | `task` | Yes | Yes | Task edit | Same |
| Studies & classes | `study_or_class` | Yes | Yes | Detail | Same |
| Identities | `identity` | Yes | Yes | Identity detail | Same |
| Jobs / job benefits | `job`, `job_benefit` | Yes | Yes | Job detail | Same |
| Private clinic (therapy) | e.g. `therapy_client` | Yes | Yes | Relevant clinic pages | Same |

**Postgres note:** Adding a value to `entity_url_entity_kind` requires a new migration, e.g. `ALTER TYPE entity_url_entity_kind ADD VALUE 'loan';` (idempotent `DO` block if you repeat checks).

## Optional improvements (any time)

- **Edit link** (not only add/remove): update action + inline form or modal.
- **Reorder** without numeric `sort_order`: drag-and-drop or up/down buttons.
- **Orphan cleanup:** If a parent row can be hard-deleted, always delete `entity_urls` with matching `(entity_kind, entity_id)` in the same mutation (no DB FK for polymorphic targets).
- **Household “all links” report** page: query `entity_urls` by `household_id` with labels resolved per `entity_kind` (optional).
- **Open redirect hardening:** Already limited to `/dashboard/` paths; keep that contract for any new `redirect_to` usage.

## Related: section-level useful links

Dashboard **section** links (system / household / user) live in `useful_links` — see [`USEFUL_LINKS.md`](./USEFUL_LINKS.md). That is separate from per-record `entity_urls`.

## Reference files

- Schema: [`prisma/schema.prisma`](../prisma/schema.prisma) — `EntityUrlEntityKind`, `entity_urls`.
- Validation: [`src/lib/entity-urls/validate.ts`](../src/lib/entity-urls/validate.ts).
- Parent checks: [`src/lib/entity-urls/verify-parent.ts`](../src/lib/entity-urls/verify-parent.ts).
- Migration index: [`prisma/migrations/000_INDEX.md`](../prisma/migrations/000_INDEX.md).
