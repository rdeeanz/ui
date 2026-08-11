# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product

**Monitoring Availability Fasilitas Sipil** — an internal web app for PT Pelabuhan Indonesia (Persero) that tracks the periodic availability (readiness) of civil port facilities across all Regionals and Ports. It replaces manual, error-prone Excel reporting with structured input, automatic availability calculation, dashboards, and multi-level recap.

The domain, UI copy, and code identifiers are in **Bahasa Indonesia** — keep this consistent (e.g. `tersedia`, `siapPakai`, `rusakRingan`, `pelabuhan`). See [PRD.md](PRD.md) for the full spec and [.kiro/steering/](.kiro/steering/) for detailed steering docs.

## Tech Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript, ESM (`"type": "module"`).
- **UI:** shadcn/ui (style "new-york"), copied into [src/components/ui/](src/components/ui/) — not a dependency. Tailwind CSS v4 (config-less, via `@tailwindcss/postcss`). Icons from `lucide-react`. Use semantic tokens (`bg-primary`, `text-muted-foreground`), never raw colors.
- **Charts:** Recharts wrapped by the shadcn `Chart` component ([src/components/ui/chart.tsx](src/components/ui/chart.tsx)).
- **Data:** Server Components + Server Actions for mutations. Validation with `zod`. Forms with `react-hook-form`. Tables with `@tanstack/react-table`.
- **ORM:** Prisma 6. Dev DB is **SQLite** ([prisma/dev.db](prisma/dev.db)); production is **Cloudflare D1** (serverless SQLite). Schema is provider-agnostic.
- **Auth:** custom JWT sessions via `jose` (HS256), httpOnly cookie `map_session`. Passwords hashed with `bcryptjs`.
- **Deploy:** Cloudflare Workers via OpenNext adapter (`@opennextjs/cloudflare`).

## Commands

Dev server runs on **port 4100**.

- `npm run dev` — dev server (long-running; the user runs this manually).
- `npm run build` — `prisma generate && next build`.
- `npm run lint` — `next lint` (ESLint is ignored during builds, so run it explicitly).
- `npm run typecheck` — `tsc --noEmit`. **TypeScript build errors are NOT ignored** — keep types clean and prefer fixing errors over suppressing them.
- `npm run db:push` — push schema to dev DB. `npm run db:seed` — `tsx prisma/seed.ts`. `npm run db:reset` — force-reset then reseed.
- `npm run extract` — regenerate [prisma/seed-data.json](prisma/seed-data.json) from the source Excel via `python3 scripts/extract-seed.py`.

After code changes, run `npm run typecheck` (and `npm run lint` where relevant).

### Cloudflare (D1 + Workers)

- `npm run preview` — build + local workerd preview. `npm run deploy` — build + deploy.
- `npm run cf-typegen` — regenerate `cloudflare-env.d.ts` after editing [wrangler.jsonc](wrangler.jsonc).
- `npm run d1:migrate:local|remote` — apply migrations from `prisma/migrations/*.sql`.
- `npm run d1:seed:gen` — dump dev.db to `prisma/d1-seed.sql`; `d1:seed:local|remote` apply it.
- Secrets: `AUTH_SECRET` via `.dev.vars` locally, `wrangler secret put` in production.

## Architecture

### Routing

- [src/middleware.ts](src/middleware.ts) — JWT gate; redirects unauthenticated users to `/login`.
- [src/app/login/page.tsx](src/app/login/page.tsx) — public login page.
- `src/app/(app)/` — authenticated route group. Its `layout.tsx` calls `requireUser()` and wraps everything in `AppShell`. Contains the national dashboard (`/`), plus `regional/[id]`, `pelabuhan/[id]`, `inspeksi`, `inspeksi/[id]`, `rekap`, `histori`, `master`, `users`.
- [src/app/actions/](src/app/actions/) — `"use server"` Server Actions (`auth`, `inspeksi`, `master`, `users`, `import`).
- `src/app/api/export/rekap/route.ts` — Excel export route handler.

### `src/lib` — the source of truth for cross-cutting logic

- [prisma.ts](src/lib/prisma.ts) — `PrismaClient` singleton. On Cloudflare it's built from the D1 binding (`getCloudflareContext().env.DB`) via `@prisma/adapter-d1`, memoized per-request (WeakMap keyed on `env`) so `$transaction` batches share one client. Runtime does NOT use `DATABASE_URL`.
- [auth.ts](src/lib/auth.ts) — **server-only** (imports `"server-only"`): sessions, `authenticate()`. Never import into a client component.
- [roles.ts](src/lib/roles.ts) — **client-safe**: `Role` type, `ROLE_LABEL`, `can.*` capabilities. This is the file client components may import for role logic.
- [rbac.ts](src/lib/rbac.ts) — server: `requireUser`/`requireRole`, scope filters (`scopeFilterPelabuhan`, `analyticsScope`).
- [availability.ts](src/lib/availability.ts) — availability math + `id-ID` formatting (`formatPct`, `formatAngka`). **Authoritative** for all availability calculation.
- [analytics.ts](src/lib/analytics.ts) — aggregation queries for dashboards/recap.
- [import-xlsx.ts](src/lib/import-xlsx.ts) — Excel import parsing. [nav.ts](src/lib/nav.ts) — role-filtered nav items.

### Data model ([prisma/schema.prisma](prisma/schema.prisma))

Hierarchy: `Regional 1─* Pelabuhan 1─* Fasilitas *─1 KategoriFasilitas`; `Fasilitas 1─* ObjekFasilitas`. An `Inspeksi` is unique per `(pelabuhanId, periodeId)`; each `CatatanObjek` (the core fact record) is unique per `(inspeksiId, objekId)`. A `Periode` is a month+year (monthly frequency). Users can be scoped to a `regionalId` or `pelabuhanId`.

## Conventions (follow these when writing code)

- **Path alias:** `@/*` → `src/*`. Use it for all internal imports.
- **Server/client boundary:** `auth.ts`, `rbac.ts`, `prisma.ts` are server-only and must never reach the client. Client components import role logic from `roles.ts` only.
- **Server Actions:** start by resolving the session (`getSession()`), return `{ ok: false, message }` when unauthenticated, and check a `can.*` capability before mutating — no unauthenticated mutations. Return shape is `{ ok: boolean; message: string }` (`SaveResult`), surfaced via `sonner` toasts. Validate input with `zod`; wrap multi-row writes in `prisma.$transaction`; `revalidatePath(...)` affected routes.
- **Authenticated pages/layouts:** call `requireUser()`/`requireRole([...])`; scope queries with `scopeFilterPelabuhan(user)` / `analyticsScope(user)` so non-admins only see their own data.
- **Availability & numbers:** always compute via [availability.ts](src/lib/availability.ts) helpers and format with `formatPct`/`formatAngka` — never inline `toLocaleString` or manual division that could produce `#DIV/0!`.
- **UI:** compose from `components/ui` with semantic Tailwind tokens; keep pages as Server Components and push interactivity into small `"use client"` components. Add shadcn primitives via `npx shadcn@latest add <component>`, not by hand.
- **server-external packages:** `exceljs`, `@prisma/client`, `.prisma/client`, `jose`, `bcryptjs` are declared in `serverExternalPackages` ([next.config.mjs](next.config.mjs)) so OpenNext bundles the workerd entrypoint. Keep new server-only native libs there.
- **Audit trail:** record significant mutations to `AuditLog` (`aksi` ∈ CREATE/UPDATE/DELETE/LOGIN/VERIFY/IMPORT/EXPORT).

## Domain rules

- **Availability** (hierarchical simple averages, never area-weighted, always server-side): Objek = `siapPakai / tersedia × 100`, `null`/`N/A` when `tersedia = 0`. Fasilitas/Kategori/Pelabuhan/Regional each average the level below, ignoring nulls. Condition tiers (`tingkatKondisi`): ≥ 90% baik, 70–89% perhatian, < 70% kritis.
- **Input validation:** all quantities non-negative; `siapPakai ≤ tersedia`; `rusakRingan + rusakSedang + rusakBerat ≤ tersedia`.
- **Inspection workflow:** `DRAFT → DIAJUKAN → DIVERIFIKASI`. A `DIVERIFIKASI` inspeksi is locked (only ADMIN edits). PETUGAS/ADMIN submit (ajukan); PIC_REGIONAL/ADMIN verify or return (kembalikan).
- **Roles:** ADMIN (all master data/users/regionals), PETUGAS (own port input only), PIC_REGIONAL (review/verify own regional), MANAJEMEN (read-only national dashboards).
