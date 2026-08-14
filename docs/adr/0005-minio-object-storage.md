# ADR 0005 — MinIO object storage with signed-URL delivery

- **Status:** Accepted
- **Date:** 2026-08-14

## Context

Patients have documents and X-rays. These binary files do not belong in PostgreSQL, and uploading/reading them must be access-controlled.

## Decision

- Self-hosted **MinIO** (S3-compatible) as the object store, running in Docker alongside PostgreSQL.
- The API stores only the object **key** on the relevant entity; files are never served through the app directly.
- Clients receive short-lived **signed URLs** for upload and download; MinIO buckets are private and server-side encrypted.

## Consequences

- S3-compatible: can swap MinIO for any S3 provider later without touching app code.
- Retrofit is done now, before any upload flow exists (cheaper than adding later).
- Adds one more service to operate and back up (bucket sync included in the backup strategy, ADR 010).
