# ADR 0005 — MinIO object storage (proxied delivery, envelope encryption)

- **Status:** Accepted
- **Date:** 2026-08-14 (initial) / **Amended 2026-08-15** (supersession below)

## Context

Patients have documents and X-rays. These binary files do not belong in PostgreSQL, and uploading/reading them must be access-controlled.

## Decision (original, 2026-08-14)

- Self-hosted **MinIO** (S3-compatible) as the object store, running in Docker alongside PostgreSQL.
- The API stores only the object **key** on the relevant entity; files are never served through the app directly.
- Clients receive short-lived **signed URLs** for upload and download; MinIO buckets are private and server-side encrypted.

## Supersession (2026-08-15) — 1.4 patient documents

The signed-URL delivery clause is **reversed** in favor of **proxied delivery through the API**. Rationale:

- Signed URLs bypass the API's RBAC and audit trail after issuance; a leaked link is usable until expiry. Every view must be attributable (`PATIENT_DOCUMENT_VIEW`).
- The API now **streams documents itself** with the same `requireRole` gate as other patient data, and logs a view audit each request.

Encryption is also upgraded from MinIO/server-side to **client-side envelope encryption** (consistent with ADR 006):

- Each object is encrypted with a per-object random **data key** (DEK, AES-256-GCM); the ciphertext is the object body.
- The DEK is wrapped under the app master key (`ENCRYPTION_KEY`) and stored on the object's metadata (`x-amz-meta-dentora-envelope-*`).
- The bucket stays private; MinIO never sees plaintext bytes or the unwrapped DEK.
- The DB `PatientDocument.size` is the **original plaintext length**, set at upload from the raw request bytes — never derived from the (larger) encrypted object size. `Content-Length` on download uses this original size so streamed/ranged clients never truncate or hang.

### Object key layout (1.4)

```
branch/{branchId}/patient/{patientId}/{documentId}
```

Scoped per branch → per patient → per document, enforced server-side by `findPatientOr404` + branch filter.

## Consequences

- S3-compatible: can swap MinIO for any S3 provider later without touching app crypto (envelope is self-contained, no provider KMS).
- Files are never directly reachable; the API is the only gateway, so RBAC + audit apply to every byte.
- Encryption travels with object metadata — moving off MinIO keeps decryptability as long as `ENCRYPTION_KEY` is retained.
- Adds one more service to operate and back up (bucket sync included in the backup strategy, ADR 010).
