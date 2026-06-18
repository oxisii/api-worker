# Codebase Structure Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the repository so source files are grouped by domain directories, oversized files are split by responsibility, trivial one-off modules are merged, generated artifacts have explicit boundaries, and tests/docs follow the same structure.

**Architecture:** Worker business logic moves from mixed `services/*` prefixes into `domains/*` directories while routes remain HTTP adapters. UI moves to `app/*` plus per-feature directories, with `core` reserved for shared cross-feature logic. Refactoring is staged and behavior-preserving, using existing tests as regression protection.

**Tech Stack:** Bun, TypeScript, Hono, Hono JSX, Vite, Vitest, Playwright, Biome, Cloudflare Workers, Wrangler, Rust/WASM for request transformation.

---

### Task 1: Document Structure Rules And Generated Boundaries

**Files:**
- Create: `docs/superpowers/specs/2026-06-19-codebase-structure-refactor-design.md`
- Create: `docs/superpowers/plans/2026-06-19-codebase-structure-refactor.md`
- Modify: `.gitignore`
- Create: `apps/worker/src/wasm/README.md`
- Remove from git: `apps/worker/.wrangler-build/*`

- [ ] Add the design and implementation plan documents.
- [ ] Add ignore rules for `apps/worker/.wrangler-build/` and `apps/worker/.tmp-wasm-web/`.
- [ ] Remove tracked `.wrangler-build` artifacts with `git rm -r --cached apps/worker/.wrangler-build`.
- [ ] Add `apps/worker/src/wasm/README.md` explaining that `generated/` is produced by `bun --filter api-worker build:wasm` and intentionally tracked until deployment no longer needs generated WASM files in source.
- [ ] Run `bunx --bun biome format --write .gitignore docs/superpowers/specs/2026-06-19-codebase-structure-refactor-design.md docs/superpowers/plans/2026-06-19-codebase-structure-refactor.md apps/worker/src/wasm/README.md`.
- [ ] Run `bun run typecheck`.
- [ ] Run `bun run test`.
- [ ] Commit with message `chore: 记录代码结构重构规范`.

### Task 2: Move Worker Channel Domain

**Files:**
- Create directory: `apps/worker/src/domains/channel/`
- Move from legacy channel service files into `apps/worker/src/domains/channel/*`
- Modify imports in `apps/worker/src/routes/*`, `apps/worker/src/domains/*`, `tests/unit/worker/*`
- Move channel tests to `tests/unit/worker/channel/`

- [x] Move channel files into `apps/worker/src/domains/channel/` with concise responsibility names: `attemptability.ts`, `call-token-repo.ts`, `call-token-types.ts`, `effective-models.ts`, `metadata.ts`, `model-capabilities.ts`, `models.ts`, `recovery-task.ts`, `recovery.ts`, `repo.ts`, `routing.ts`, `status.ts`, `testing.ts`, `types.ts`, `index.ts`.
- [x] Merge the trivial channel re-export into `domains/channel/models.ts` and update imports.
- [x] Move matching tests into `tests/unit/worker/channel/`.
- [x] Mechanically update imports to `domains/channel/*`.
- [x] Run targeted channel tests with `bunx --bun vitest run tests/unit/worker/channel`.
- [x] Run required format, typecheck, and test commands.
- [x] Commit with message `refactor: 整理 worker channel 领域`.

### Task 3: Move Remaining Worker Domains

**Files:**
- Create directories under `apps/worker/src/domains/`: `site`, `backup`, `checkin`, `pricing`, `model`, `usage`, `settings`
- Move matching files from `apps/worker/src/services/`
- Move matching tests under `tests/unit/worker/<domain>/`

- [ ] Move `site-*` files to `domains/site/` and update tests/imports.
- [ ] Move `backup*` files to `domains/backup/` and update routes/imports.
- [ ] Move `checkin*` files to `domains/checkin/` and update durable object export in `apps/worker/src/index.ts`.
- [ ] Move `pricing/*` to `domains/pricing/` and update imports.
- [ ] Move `canonical-model-*`, `model-*`, `models-index.ts`, `openai-model-list.ts` to `domains/model/`.
- [ ] Move `usage.ts` and `usage-events.ts` to `domains/usage/`.
- [ ] Move `settings.ts` to `domains/settings/index.ts`.
- [ ] Move tests into matching domain folders.
- [ ] Run focused domain tests, then required full checks.
- [ ] Commit with message `refactor: 整理 worker 领域目录`.

### Task 4: Split Worker Proxy And Response Adapter

**Files:**
- Create directories: `apps/worker/src/domains/proxy/adapters/`, `attempt/`, `request/`, `response/`
- Move proxy helper files into `apps/worker/src/domains/proxy/*`
- Split `apps/worker/src/services/chat-response-adapter.ts`
- Move proxy route implementation into proxy domain and keep route re-export if needed

- [ ] Move existing proxy helper files into domain subdirectories by responsibility.
- [ ] Split chat response adapter into provider-specific files: `adapters/openai.ts`, `adapters/anthropic.ts`, `adapters/gemini.ts`, `adapters/sse.ts`, `adapters/usage.ts`, and `adapters/index.ts`.
- [ ] Move route implementation from `shared/proxy.ts` to `domains/proxy/route.ts`; keep `routes/proxy.ts` as the Hono route entry.
- [ ] Update tests under `tests/unit/worker/proxy/`.
- [ ] Run proxy and adapter tests, then required full checks.
- [ ] Commit with message `refactor: 拆分 worker proxy 领域`.

### Task 5: Move UI App And Feature Directories

**Files:**
- Create `apps/ui/src/app/`
- Create feature directories under `apps/ui/src/features/`
- Move existing feature files into matching folders
- Update imports and tests under `tests/unit/ui/`

- [x] Move UI root implementation to `apps/ui/src/app/App.tsx` and leave a minimal root entry for Vite.
- [x] Move feature view files into directories: `channels/`, `settings/`, `pricing/`, `canonical-models/`, `dashboard/`, `usage/`, `tokens/`, `models/`, `login/`, `layout/`.
- [x] Move feature-local helper files into the same directories, for example channel model row helpers into `features/channels/model-rows.ts`.
- [x] Move matching UI tests into `tests/unit/ui/<feature>/`.
- [x] Update imports.
- [x] Run UI unit tests, typecheck, and full tests.
- [x] Commit with message `refactor: 整理 ui feature 目录`.

### Task 6: Split UI Giant Files

**Files:**
- Split `apps/ui/src/app/App.tsx`
- Split `apps/ui/src/features/channels/ChannelsView.tsx`
- Split `SettingsView.tsx`, `CanonicalModelsView.tsx`, `PricingView.tsx`, `UsageView.tsx`, `DashboardView.tsx`, and `TokensView.tsx` where each remains above 400 lines after moves

- [x] Extract app navigation and route helpers into `apps/ui/src/app/navigation.ts`.
- [x] Extract app data state initialization and reducers into `apps/ui/src/app/state.ts`.
- [x] Extract app action and query helpers into `apps/ui/src/app/actions.ts`.
- [x] Split `channels/ChannelsView.tsx` into cohesive subcomponents/helpers including `SitesTable.tsx`, `ChannelModelsPanel.tsx`, `VerificationAttemptDetails.tsx`, `call-token-dnd.ts`, `constants.ts`, `display.ts`, and `cleanup-groups.ts`.
- [x] Split other large views only where a cohesive subcomponent or pure helper can be extracted without changing behavior.
- [x] Add or move focused tests for extracted pure helpers.
- [x] Run required checks and e2e list.
- [x] Commit with message `refactor: 拆分 ui 大型视图`.

### Task 7: Final Documentation And Regression

**Files:**
- Modify README or docs where old paths are mentioned
- Update any remaining test path references in `docs/superpowers/*`

- [x] Search for legacy worker/UI path references and verify runtime imports use new domain/feature paths.
- [x] Update documentation references to new paths.
- [ ] Run `bunx --bun biome format --write <changed-files>`.
- [ ] Run `bun run typecheck`.
- [ ] Run `bun run test`.
- [ ] Run `bun run test:e2e -- --list`.
- [ ] Run the smallest practical Playwright regression for the moved UI paths.
- [ ] Commit with message `docs: 同步重构后的目录说明`.
