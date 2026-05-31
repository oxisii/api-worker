# Lightweight Pricing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add lightweight model pricing, cache token accounting, and downstream charge logging to the current API aggregation site.

**Architecture:** Keep pricing as a small Worker service backed by D1. Built-in prices seed defaults, manual prices override synced prices, synced prices override built-ins, and proxy usage recording stores a charge snapshot on each usage log.

**Tech Stack:** Cloudflare Workers, Hono, D1, Vite/Hono JSX UI, Vitest, Playwright.

---

### Task 1: Pricing Core

**Files:**
- Create: `apps/worker/src/services/pricing/types.ts`
- Create: `apps/worker/src/services/pricing/builtin.ts`
- Create: `apps/worker/src/services/pricing/calculator.ts`
- Create: `tests/worker/pricing-calculator.test.ts`

- [ ] Add tests for price priority, wildcard matching, markup, cache token pricing, and missing price fallback.
- [ ] Implement focused pricing types, built-in model prices, and calculator helpers.

### Task 2: Usage Normalization And Persistence

**Files:**
- Modify: `apps/worker/src/utils/usage.ts`
- Modify: `apps/worker/src/services/usage.ts`
- Modify: `apps/attempt-worker/src/routes/attempt.ts`
- Modify: `apps/worker/src/shared/proxy.ts`
- Modify: `apps/worker/src/services/proxy/attempt-runner.ts`
- Modify: `apps/worker/src/wasm/core.ts`
- Modify: `apps/worker/wasm/src/lib.rs`
- Modify: `tests/worker/usage-recording.test.ts`

- [ ] Add tests for cache token extraction from OpenAI, Claude, and Gemini usage payloads.
- [ ] Extend normalized usage with cache read/write and uncached input token fields.
- [ ] Persist cache and charge fields in `usage_logs`.

### Task 3: D1 Schema And Pricing API

**Files:**
- Create: `apps/worker/migrations/0020_add_pricing.sql`
- Modify: `apps/worker/src/db/schema.sql`
- Create: `apps/worker/src/services/pricing/repo.ts`
- Create: `apps/worker/src/services/pricing/sync.ts`
- Create: `apps/worker/src/routes/pricing.ts`
- Modify: `apps/worker/src/index.ts`

- [ ] Add D1 table and usage log columns.
- [ ] Add listing, create/update/delete, seed, and sync endpoints.
- [ ] Seed built-in prices when the pricing API is first read.

### Task 4: Settings And Scheduler

**Files:**
- Modify: `apps/worker/src/services/settings.ts`
- Modify: `apps/worker/src/routes/settings.ts`
- Modify: `apps/worker/src/services/checkin-scheduler.ts`

- [ ] Add pricing sync settings.
- [ ] Run pricing sync from the existing scheduler when enabled.

### Task 5: UI Integration

**Files:**
- Modify: `apps/ui/src/core/types.ts`
- Modify: `apps/ui/src/core/constants.ts`
- Modify: `apps/ui/src/App.tsx`
- Modify: `apps/ui/src/features/SettingsView.tsx`
- Modify: `apps/ui/src/features/ModelsView.tsx`
- Modify: `apps/ui/src/features/UsageView.tsx`
- Modify: `apps/ui/src/features/DashboardView.tsx`
- Modify: `apps/ui/src/styles.css`

- [ ] Add settings controls for pricing sync and markup.
- [ ] Add a compact model pricing panel to the Models page.
- [ ] Add usage log columns for cache tokens and charge amount.
- [ ] Add dashboard sales amount summaries.

### Task 6: Verification

**Files:**
- Modify docs if behavior changes need README mention.

- [ ] Format changed files.
- [ ] Run typecheck.
- [ ] Run unit tests.
- [ ] Run minimal backend request verification.
- [ ] Run minimal frontend automated regression.
