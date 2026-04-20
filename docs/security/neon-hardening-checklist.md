# Neon (PostgreSQL) hardening checklist

The app uses `DATABASE_URL` with Prisma ([`src/lib/auth.ts`](../../src/lib/auth.ts), [`prisma.config.ts`](../../prisma.config.ts)).

## Connection and access

- [ ] **TLS**: Connection string uses the provider’s SSL settings (Neon defaults are TLS-enabled).
- [ ] **Credentials**: Strong password; rotate if exposed; never commit URLs to git.
- [ ] **Roles**: Prefer a **migration** role (DDL) separate from the **runtime** app role without `CREATE`/`DROP` on production from the app.

## Branching and data

- [ ] **Preview / dev branches** use **non-production** data; avoid copying production PII to insecure environments.
- [ ] **IP allowlist** (Neon feature) if your egress IPs are stable; otherwise rely on secret URL + TLS.

## Backups and recovery

- [ ] **PITR / snapshots** enabled per Neon plan; document **RPO** (e.g. continuous) and **RTO** (restore procedure).
- [ ] **Restore drill**: periodically restore to a throwaway branch and verify the app connects.

## Compliance

- [ ] **DPA** and SOC2/ISO reports stored in your vendor assurance pack ([`vendor-assurance-checklist.md`](./vendor-assurance-checklist.md)).
