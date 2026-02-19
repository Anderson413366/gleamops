# Contributing to GleamOps

Thank you for your interest in contributing to GleamOps.

---

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- Supabase CLI

### Getting Started

```bash
git clone https://github.com/Anderson413366/gleamops.git
cd gleamops
pnpm install
cp .env.example apps/web/.env.local
# Fill in Supabase credentials
pnpm db:start
pnpm dev
```

### Quality Gates

Every PR must pass all three checks:

```bash
pnpm typecheck    # TypeScript — 0 errors across all 7 packages
pnpm lint         # ESLint — 0 errors, 0 warnings
pnpm build:web    # Next.js build — all routes compile
```

---

## Project Structure

This is a **Turborepo monorepo** with pnpm workspaces:

| Package | Purpose |
|---------|---------|
| `apps/web` | Next.js 15 web application |
| `apps/worker` | Background jobs |
| `apps/mobile` | Expo React Native |
| `packages/shared` | Types, Zod schemas, error catalog |
| `packages/domain` | Pure business rules (RBAC, status machine) |
| `packages/cleanflow` | Bid math engine (pure functions) |
| `packages/ui` | Design system (32 components) |

---

## Coding Standards

### API Routes — Thin Delegate Pattern

Every API route handler follows:

```
extractAuth → validateBody → service.method() → NextResponse.json()
```

Business logic goes in `src/modules/{domain}/`, not in route files. Routes should be ~20–40 lines max.

### Service Modules — Golden Module Pattern

```
src/modules/{domain}/
├── {domain}.service.ts       # Business logic, returns ServiceResult<T>
├── {domain}.repository.ts    # Supabase queries only
└── index.ts                  # Barrel export
```

### Frontend Components

- **Module pages**: `ChipTabs` + `SearchInput` + conditional tab rendering
- **Tables**: Fetch → filter → sort → paginate → render
- **Detail pages**: Back link → Avatar → Stat cards → Section cards → Edit + Deactivate
- **Forms**: `useForm` hook + Zod schema + optimistic locking via `version_etag`

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | `inventory-orders.service.ts` |
| Components | PascalCase | `EntityCardGrid` |
| Functions | camelCase | `getHrRecords()` |
| DB tables | snake_case | `hr_pto_requests` |
| DB columns | snake_case | `tenant_id`, `created_at` |
| Entity codes | PREFIX-NNNN | `CLI-1001`, `BID-000123` |

### Error Handling

- Use RFC 9457 Problem Details (`createProblemDetails()`)
- Return `ServiceResult<T>` from service functions
- Never throw from service layer; always return error objects

---

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes following the patterns above
3. Run all quality gates locally
4. Create a PR with a clear title and description
5. PR merges to `main` trigger automatic Vercel deployment

### Commit Messages

Use concise, descriptive commit messages:

```
feat: add proof-of-delivery upload to inventory orders
fix: resolve null handling in workforce-hr service
refactor: extract schedule routes to service module
docs: update README with verified repo stats
```

---

## What NOT to Change

- **Database**: Supabase is treated as read-only contract. Do not edit migrations, RLS policies, or stored procedures.
- **Business logic behavior**: Pure structural refactoring only unless feature work is explicitly scoped.
- **URL paths**: API routes and page URLs must remain stable.

---

## Code of Conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
