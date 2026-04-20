# AWS S3 and Transcribe hardening checklist

Use this when configuring the bucket and IAM used by [`src/lib/object-storage.ts`](../../src/lib/object-storage.ts) and transcription ([`src/lib/transcription/aws-transcribe-batch.ts`](../../src/lib/transcription/aws-transcribe-batch.ts)).

## S3 bucket

- [ ] **Block Public Access** enabled for the account and bucket.
- [ ] **Bucket policy** denies `s3:*` without TLS (`aws:SecureTransport`).
- [ ] **Default encryption** (SSE-S3 or SSE-KMS) aligned with app behavior: uploads set `ServerSideEncryption: AES256` unless `DISABLE_S3_SSE=true`.
- [ ] **Versioning** (optional) for recovery; **lifecycle rules** for old versions if cost-sensitive.
- [ ] **Separate buckets or prefixes** per environment (production vs staging vs preview).

## IAM user or role used by the app (Vercel env keys)

- [ ] **Least privilege**: only `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on the required prefix(es) (e.g. `{householdId}/...`).
- [ ] **No** `s3:*` on `*` unless unavoidable; rotate access keys on a schedule.
- [ ] **No root account keys** for application use.

## Amazon Transcribe (Hebrew batch path)

- [ ] **`TRANSCRIBE_DATA_ACCESS_ROLE_ARN`**: IAM role trusted by `transcribe.amazonaws.com` with minimal S3 read on input URI and write on output prefix.
- [ ] **Separate prefixes** for Transcribe input/output under the same or dedicated bucket.
- [ ] **CloudTrail** (optional) logging `transcribe` API calls in the account for audit.

## Evidence

Export (redacted) bucket policy, IAM policy JSON, and Block Public Access screenshot into your vendor / internal assurance folder.
