# LLM and transcription data handling

## Import assist ([`src/app/api/import/assist/route.ts`](../../src/app/api/import/assist/route.ts))

- Payloads are **sanitized** in [`src/lib/import-assist-llm.ts`](../../src/lib/import-assist-llm.ts): row count cap, truncated descriptions, limited chat history and message length.
- System prompt instructs the model **not** to invent transaction IDs and to avoid echoing **national IDs, card numbers, or full account numbers** when present in descriptions.
- **Contractual**: Prefer OpenAI Business / Enterprise or OpenRouter terms that cover **data processing**, **retention**, and **training opt-out** where required.

## Audio transcription ([`src/lib/transcription/`](../../src/lib/transcription/))

- **English / OpenAI path**: Audio is sent to OpenRouter or OpenAI Whisper endpoints; keep keys scoped and rotate on incident.
- **Hebrew / AWS batch**: Audio stays in S3; Transcribe reads via IAM role; see [`aws-s3-hardening-checklist.md`](./aws-s3-hardening-checklist.md).

## Logging

- API handlers should log **error messages** only, not full request bodies or LLM prompts (see import assist / upload error logging patterns).

## Operational

- Review provider dashboards for **API key** access and disable unused keys.
- Document which **models** are used (`OPENROUTER_MODEL`, `OPENAI_MODEL`, audio models) in your internal configuration register.
