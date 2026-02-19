# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in GleamOps, please report it responsibly.

**Email:** security@gleamops.com

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a timeline for resolution.

---

## Security Architecture

### Multi-Tenant Isolation

- Every business table has a `tenant_id` column
- PostgreSQL Row-Level Security (RLS) policies enforce tenant isolation
- `current_tenant_id()` reads the tenant from the JWT — no client-side bypass possible
- Tenant B cannot read or write Tenant A's data under any circumstance

### Authentication

- Supabase Auth handles sign-in (email/password, OAuth)
- `custom_access_token_hook` injects `tenant_id` and `role` into the JWT
- Next.js middleware validates auth on every request
- Unauthenticated requests redirect to `/login`

### Authorization (RBAC)

Six roles with hierarchical permissions:

| Role | Level |
|------|-------|
| `OWNER_ADMIN` | Full access |
| `MANAGER` | Manage operations, staff, inventory |
| `SUPERVISOR` | Manage assigned sites/teams |
| `SALES` | Pipeline and proposals only |
| `INSPECTOR` | Quality inspections only |
| `CLEANER` | Assigned tickets only |

Site scoping further restricts which locations a user can access.

### Data Protection

- **Soft delete only** — `archived_at` column, no hard deletes
- **Optimistic locking** — `version_etag` UUID prevents concurrent overwrites
- **Audit trail** — `writeAuditMutation()` logs all state changes
- **Service role key** — Server-side only, never exposed to the client

### Environment Variables

Sensitive keys (`SUPABASE_SERVICE_ROLE_KEY`, `SENDGRID_API_KEY`) must never be prefixed with `NEXT_PUBLIC_` and are only available server-side.

---

## Supported Versions

| Version | Supported |
|---------|-----------|
| Current (`main`) | Yes |

---

## Disclosure Policy

We follow responsible disclosure. Please do not publicly disclose vulnerabilities until we have had an opportunity to address them.
