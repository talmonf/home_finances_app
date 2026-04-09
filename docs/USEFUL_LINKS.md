# Useful links (system / household / user)

## Behavior

- **System** (`scope = system`): Super admin manages at [`/admin/useful-links`](../src/app/admin/useful-links/page.tsx). Visible to all households on the matching **dashboard section**, if that section is **enabled** for the member (household + user overrides).
- **Household** (`scope = household`): Super admin adds on **Edit household** ([`admin/households/[id]/edit`](../src/app/admin/households/[id]/edit/page.tsx)). Same visibility rules as system links.
- **User** (`scope = user`): Any household member can add **My links** from the amber banner on dashboard pages. Only that user sees them. Same section + enablement rules.

## Where it appears

The banner is injected from [`src/app/dashboard/layout.tsx`](../src/app/dashboard/layout.tsx) using:

- Request header `x-pathname` (set in [`middleware.ts`](../middleware.ts)).
- [`sectionIdFromDashboardPathname`](../src/lib/useful-links/pathname-to-section.ts) to map URL → `SectionId` (same ids as [`dashboard-sections.ts`](../src/lib/dashboard-sections.ts)).

If the mapped section is **disabled** for the user, the banner is not rendered (no links fetched for wrong sections).

Paths without a mapping (e.g. `/dashboard/transactions`, `/dashboard/household-settings`) show **no** useful-links banner.

## Database

Migration [`062_useful_links.sql`](../prisma/migrations/062_useful_links.sql), model `useful_links` in Prisma.

## Related

- Per-record URLs (insurance / savings rows): see [`docs/OVERALL_ENTITY_URLS_PLAN.md`](./OVERALL_ENTITY_URLS_PLAN.md) and `entity_urls`.
