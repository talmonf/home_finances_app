# Vendor assurance checklist (subprocessors)

Collect and refresh **annually** or when a vendor changes subprocessors or regions.

| Vendor        | Purpose              | Documents to collect                                      | Owner / date |
|---------------|----------------------|------------------------------------------------------------|--------------|
| Vercel        | Hosting, edge        | DPA, SOC2 report, subprocessor list, data region           |              |
| Neon          | PostgreSQL           | DPA, SOC2/ISO, encryption & backup statements              |              |
| AWS           | S3, Transcribe       | DPA/BAA if applicable, IAM/bucket evidence (internal)      |              |
| OpenAI        | LLM / Whisper (opt.) | Data processing terms, zero-retention / enterprise options |              |
| OpenRouter    | LLM routing (opt.) | Terms, subprocessor list, data handling                  |              |

## Actions

- [ ] Store PDFs or links under a restricted internal folder (not in this repo if they are confidential).
- [ ] Subscribe to vendor **change notifications** for subprocessors and policy updates.
- [ ] Record **data residency** choices (e.g. EU vs US) next to each integration.
