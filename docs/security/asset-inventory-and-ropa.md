# Asset inventory and record of processing (ROPA-style)

This document supports security and privacy assurance for **home_finances_app**. It is **not legal advice**; align with counsel for your jurisdiction(s).

## 1. Asset inventory

| Asset category | Examples in this application | Primary storage / transit |
|----------------|------------------------------|---------------------------|
| Authentication secrets | `NEXTAUTH_SECRET`, session JWT | Vercel env, HTTPS cookies |
| Account credentials | Password hashes (`bcrypt`), super-admin table | PostgreSQL |
| Identity / contact | User email, full name, household membership | PostgreSQL |
| Financial data | Transactions, accounts, loans, insurance, savings | PostgreSQL |
| Therapy / private clinic | Clients, treatments, receipts, appointments, diary exports | PostgreSQL |
| Uploaded files | Bank imports, contracts, job docs, car docs, therapy attachments | S3-compatible object storage |
| Audio for transcription | Therapy treatment attachments (paths via DB; bytes in S3) | S3 → app or AWS Transcribe / OpenAI Whisper |
| AI-assisted import | Transaction summaries and chat messages sent to LLM | HTTPS to OpenRouter or OpenAI |
| Operational logs | Vercel/runtime logs (must not contain secrets or bulk PII) | Vercel / host |

## 2. ROPA-style processing table

| Processing activity | Purpose | Data categories | Legal basis (placeholder) | Retention (placeholder) | Subprocessors |
|---------------------|---------|-----------------|---------------------------|---------------------------|---------------|
| User login | Authenticate users | Email, password hash, session | Contract / legitimate interest | Session + account lifetime | Vercel (host), PostgreSQL |
| Household finance management | Core product | Financial + household config | Contract | Per product policy | Neon (or self-hosted Postgres), Vercel |
| Private clinic / therapy module | Professional workflow | Client identifiers, clinical-adjacent metadata, amounts | Contract / professional obligation | Per product policy | Same as above |
| File upload / download | Attach documents to entities | File bytes, metadata | Contract | Per product policy | Object storage (e.g. AWS S3) |
| Import assist (AI) | Categorize imported transactions | Transaction IDs, descriptions, amounts, chat | Contract / consent for AI | Minimize; vendor retention per DPA | OpenRouter and/or OpenAI |
| Transcription (EN) | Text from audio | Audio via API; transcript | Contract / consent | Minimize; vendor retention | OpenRouter and/or OpenAI |
| Transcription (HE batch) | Hebrew transcription | S3 URIs, audio in S3 | Contract / consent | Per AWS + product policy | AWS Transcribe, S3 |
| Backups | Recovery | All DB categories | Legitimate interest / contract | Per Neon backup policy | Neon |
| Admin / support | Operate service | As needed for ticket | Legitimate interest | Ticket system policy | As used |

Fill **legal basis** and **retention** with your counsel and product terms.

## 3. Data-flow diagrams

### 3.1 Authentication (session JWT)

```mermaid
sequenceDiagram
  participant Browser
  participant NextAuth as NextAuth_API
  participant DB as PostgreSQL
  Browser->>NextAuth: POST credentials
  NextAuth->>DB: Validate user or super_admin bcrypt
  DB-->>NextAuth: User identity and role
  NextAuth-->>Browser: Set HttpOnly session cookie JWT
  Browser->>Browser: Subsequent requests include cookie
```

### 3.2 File upload (household-scoped)

```mermaid
sequenceDiagram
  participant Browser
  participant API as Next_route_handler
  participant DB as PostgreSQL
  participant S3 as Object_storage
  Browser->>API: Upload with session
  API->>API: JWT verify householdId
  API->>DB: Verify parent entity household_id
  API->>S3: PutObject private key
  API->>DB: Save metadata
```

### 3.3 Import assist (LLM)

```mermaid
sequenceDiagram
  participant Browser
  participant API as import_assist_route
  participant DB as PostgreSQL
  participant LLM as OpenRouter_or_OpenAI
  Browser->>API: POST documentId messages
  API->>API: JWT householdId
  API->>DB: Load document by household_id
  API->>LLM: Chat completions transaction summary
  LLM-->>API: Suggested categories payees
  API-->>Browser: Reply JSON
```

### 3.4 Transcription (English path vs Hebrew batch)

```mermaid
flowchart TB
  subgraph en [English_inline]
    A[Attachment_in_S3] --> B[App_reads_bytes_or_URL]
    B --> C[OpenRouter_or_OpenAI_Whisper]
    C --> D[Transcript_stored_DB]
  end
  subgraph he [Hebrew_batch_AWS]
    E[S3_MediaFileUri] --> F[AWS_Transcribe_batch]
    F --> G[Output_prefix_S3]
    G --> H[App_polls_completes]
    H --> D
  end
```

## 4. Trust boundaries

- **Browser**: XSS risk; CSP and safe React patterns reduce impact.
- **Vercel edge / Node**: JWT validation, **must** enforce `household_id` on every data access.
- **PostgreSQL**: Encryption at rest (provider); TLS in transit (`DATABASE_URL`).
- **Object storage**: Private buckets; app streams downloads after auth check.
- **External AI**: Highest privacy variance—minimize payloads, DPAs, zero-retention where available.

## 5. Review cadence

- Revisit this document when adding features, new subprocessors, or new regions.
