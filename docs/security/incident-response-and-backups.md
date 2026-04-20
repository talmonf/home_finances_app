# Incident response and backup / restore

## Incident response (outline)

1. **Detect**: Alerts from Vercel, Neon, AWS, or user reports; suspicious auth spikes (rate limits help).
2. **Contain**: Rotate `NEXTAUTH_SECRET`, database password, and S3/IAM keys if credentials are suspected; disable compromised accounts in DB.
3. **Eradicate**: Patch vulnerability; revoke leaked tokens.
4. **Recover**: Restore from Neon backup branch if data corrupted; redeploy known-good build.
5. **Notify**: Per legal counsel and applicable regulations (breach notification timelines vary by jurisdiction).

Document **internal contacts** and **escalation** outside this file (operational runbook).

## Backup and restore

| Item              | Mechanism                         | Target RPO (example) | Target RTO (example) |
|-------------------|-----------------------------------|----------------------|----------------------|
| PostgreSQL (Neon) | PITR / snapshots (per plan)       | Set per Neon config  | Set after drill      |
| Object storage    | Versioning + lifecycle (optional) | N/A                  | N/A                  |

### Restore drill (at least yearly)

- [ ] Create a **branch** from a point in time in Neon; verify `DATABASE_URL` connects and migrations are consistent.
- [ ] Confirm critical flows (login, one dashboard path, one file download) against restored data in an isolated environment.

Update the table with your actual RPO/RTO after measurement.
