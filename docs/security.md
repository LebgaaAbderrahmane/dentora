# Security model

> Draft: schema-level decisions are locked (ADRs 006/007/009/010/011); implementation lands in Phase 0.

## Data classification

| Class     | Examples                            | Protection                                                          |
| --------- | ----------------------------------- | ------------------------------------------------------------------- |
| Public    | clinic info, services list          | none                                                                |
| Internal  | staff, schedule, expenses           | RBAC                                                                |
| Sensitive | patients, medical history, invoices | RBAC + **field-level encryption** (AES-256-GCM)                     |
| Documents | X-rays, consents                    | RBAC + MinIO **server-side encryption** at rest + signed-URL access |

## Authentication & sessions

- httpOnly cookie sessions (JWT), server-side session store.
- **Logout-everywhere** (`/auth/revoke-all`) and automatic revocation on role change (Phase 0.5).
- CSRF protection on state-changing requests.

## Authorization

- RBAC with a granular permission matrix.
- Roles: `admin` · `dentist` · `receptionist` · `accountant` · `intern` · `patient`.
- Every request is checked against the role's permissions via middleware.

## Audit (ADR 007)

- Basic audit log from Phase 0: who viewed/edited what patient record, and when.
- Admin audit UI + retention policy in Phase 6.

## Encryption at rest (ADR 006)

- MedicalHistory and other sensitive fields encrypted field-level with AES-256-GCM.
- App-level key supplied via environment variable (not in DB).
- MinIO buckets encrypted server-side; objects never delivered directly — short-lived signed URLs.

## Network & infra

- Non-root containers; caddy terminates TLS (Let's Encrypt, automatic renewal).
- Rate limiting and helmet on the API.
- Backups are encrypted and off-host (ADR 010).

## Incident visibility (ADR 009)

- Sentry on `api` + `admin`/`portal` from Phase 0; structured request logs (pino).
- Restore drill and security/perf audit in Phase 6.5.

## Threat notes to revisit before launch

- Brute-force protection on login (rate limit already listed).
- File type/size validation on document uploads.
- S3/MinIO credential scoping (separate access key per bucket).
- Session expiry / idle timeout policy.
- Dependency scanning in CI (e.g. `pnpm audit`) — add in Phase 6.
