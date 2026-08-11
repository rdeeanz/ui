# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository shape

This is the **shadcn/ui monorepo**: pnpm workspaces + [Turborepo](https://turbo.build/repo) + [changesets](https://github.com/changesets/changesets). Package manager is pinned (`pnpm@10.33.4`); use `pnpm`, not `npm`/`yarn`. The workspace globs are `apps/*` and `packages/*` only.

Workspace members:

| Path | Name | Role |
| --- | --- | --- |
| `apps/v4` | `v4` | The ui.shadcn.com Next.js website **and** the registry source of truth. Runs on port **4000**. |
| `packages/shadcn` | `shadcn` | The published `shadcn` CLI (`init`/`add`/…). Built with `tsup`. |
| `packages/react` | `@shadcn/react` | Runtime helpers consumed by the registry build. |
| `packages/helpers` | `@shadcn/helpers` | Shared helpers consumed by the registry build. |
| `packages/tests` | | Vitest test suite (has its own `vitest.config.ts`). |

> **Note:** `mafp5/` is a **separate, standalone Next.js/Cloudflare project**, not a workspace member. It is untracked in git and has its own `mafp5/CLAUDE.md`. Do not treat it as part of this monorepo; scope changes to one or the other deliberately.

## Common commands (run from repo root)

```bash
pnpm install          # install everything
pnpm dev              # turbo run dev across workspaces
pnpm build            # turbo run build
pnpm lint             # eslint across workspaces
pnpm lint:fix
pnpm typecheck        # tsc --noEmit across workspaces
pnpm format:write     # prettier write
pnpm check            # lint + typecheck + format:check (pre-PR gate)
```

Run a single workspace with `--filter`:

```bash
pnpm --filter=v4 dev        # website only (port 4000)
pnpm --filter=shadcn dev    # CLI in tsup --watch
```

## The registry pipeline (most important concept)

Components are **not** shipped as an importable library. They are source files under `apps/v4/registry/new-york-v4/{ui,example}` that a build step compiles into JSON served at `/r` on the website. The CLI then fetches that JSON (from `REGISTRY_URL`) and writes files into a consumer's project.

`pnpm registry:build` (root → `apps/v4`) is the pipeline: it builds `@shadcn/react`, `@shadcn/helpers`, and `shadcn`, then runs `scripts/build-registry.mts` via **bun** (so `bun` must be installed). Faster targeted modes (`--style`, `--registry`, `--examples`, `--indexes`) are documented in [apps/v4/registry/README.md](apps/v4/registry/README.md); always run the full `pnpm registry:build` before committing.

When adding or modifying a component: apply the change for **every style**, update the docs, then run `pnpm registry:build`.

### Registry bases parity (from `.cursor/rules`)

`apps/v4/registry/bases/base` (Base UI) and `apps/v4/registry/bases/radix` (Radix) are **parallel trees that must stay in sync**. A behavioral/visual change to one side must be mirrored on the other (`blocks/preview/**`, mirrored `ui/*`). Only diverge where the underlying APIs differ (import paths, Base UI vs Radix props). Never update just one side unless explicitly asked.

## Testing

Tests use [Vitest](https://vitest.dev). The root `pnpm test` is an **integration harness**, not a plain unit run: it builds the registry, boots the v4 dev server on `http://localhost:4000`, then runs tests against that live registry (via `start-server-and-test`). Because the CLI's tests exercise `add`/`init` against a real registry endpoint, the server must be up.

```bash
pnpm test              # full harness: registry build → v4 server → tests
pnpm test:dev          # turbo run test --force (assumes a server is already available)
```

For fast, server-independent iteration on the CLI, run its package suite directly:

```bash
pnpm --filter=shadcn test                    # vitest run for the CLI package
pnpm --filter=shadcn test <path/to/file>     # a single test file
pnpm --filter=shadcn exec vitest run -t "name of test"   # a single test by name
```

Note `packages/shadcn`'s own `test:dev` sets `REGISTRY_URL=http://localhost:4000/r` and `SHADCN_TEMPLATE_DIR=../../templates` — the local registry server is the dependency.

## Running the CLI against the local registry

```bash
pnpm dev                       # terminal 1: serves the local registry on :4000
pnpm shadcn <init|add|...>     # terminal 2: runs the CLI against that registry
pnpm shadcn add button -c ~/path/to/test-app   # target another project
```

`pnpm shadcn` (`shadcn:dev`) points the CLI at `http://localhost:4000/r`; `pnpm shadcn:prod` points it at the production registry.

## Commit convention

Conventional commits are enforced by commitlint (`.commitlintrc.json`): `category(scope): message`, where category is one of `feat`, `fix`, `refactor`, `docs`, `build`, `test`, `ci`, `chore`. Example: `feat(components): add new prop to the avatar component`.

## Toolchain notes

- Node version is pinned in `.nvmrc` (CI publishes on Node 24).
- The registry build requires **bun** in addition to Node/pnpm.
- Releases are managed with changesets (`pnpm release` → `changeset version`); publishing happens from `packages/shadcn`.
