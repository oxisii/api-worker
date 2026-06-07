# Canonical Model Regex Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐 GPT 与 Gemini 家族的安全宽松规则，并通过新迁移让线上和新部署都得到一致结果。

**Architecture:** 先用 `planCanonicalModelSync` 单测固定期望归类，再同步修改 D1 迁移、默认种子和本地修复脚本。实现层不改业务逻辑，只更新统一模型默认规则与数据迁移。

**Tech Stack:** TypeScript, Vitest, Cloudflare D1 SQL, Wrangler, Bun

---

### Task 1: 固定失败测试

**Files:**
- Modify: `tests/worker/canonical-model-registry.test.ts`
- Test: `tests/worker/canonical-model-registry.test.ts`

- [ ] **Step 1: 写失败测试**

补一组候选别名，覆盖 `cc-gpt-*`、`claude-gpt-*`、`openai:`、`gpt-5.3` 主线和 Gemini `:cloud` 尾缀。

- [ ] **Step 2: 运行测试确认失败**

Run: `bunx --bun vitest run tests/worker/canonical-model-registry.test.ts`

Expected: 至少一条关于 `gpt-5.3`、包装前缀或 Gemini `:cloud` 的断言失败。

- [ ] **Step 3: 提交最小测试变更**

暂不提交 git，只保留工作区变更继续实现。

### Task 2: 修正默认迁移规则

**Files:**
- Modify: `apps/worker/migrations/0024_refresh_canonical_model_defaults.sql`
- Create: `apps/worker/migrations/0030_expand_gpt_wrappers_and_gemini_suffixes.sql`

- [ ] **Step 1: 更新默认种子**

在 `0024` 中：

- 新增 `openai/gpt-5.3`
- 更新 `GPT` 家族 regex，允许 `cc-`、`claude-`、`openai:` 包装
- 更新 Gemini preview regex，允许 `:cloud` 与 `:latest`

- [ ] **Step 2: 新增线上迁移**

在 `0030` 中用 `UPDATE` / `INSERT ... ON CONFLICT` 修正已上线数据库的相同规则。

- [ ] **Step 3: 运行测试确认仍可能未全绿**

Run: `bunx --bun vitest run tests/worker/canonical-model-registry.test.ts`

Expected: 如果本地修复脚本常量尚未同步，可能仍有失败；否则进入下一步。

### Task 3: 同步本地修复脚本

**Files:**
- Modify: `scripts/repair-local-d1.mjs`

- [ ] **Step 1: 同步默认规则常量**

把 `canonicalModelDefaults` 中对应 `GPT` 与 Gemini 规则改成和迁移一致。

- [ ] **Step 2: 同步 legacy upgrade 判断**

若某些旧 regex 需要被新 regex 接管，把升级映射补齐，避免本地修复脚本停留在旧规则。

- [ ] **Step 3: 跑目标测试**

Run: `bunx --bun vitest run tests/worker/canonical-model-registry.test.ts tests/worker/domestic-version-conflict.test.ts`

Expected: PASS

### Task 4: 回归验证

**Files:**
- No code changes expected

- [ ] **Step 1: 格式化变更文件**

Run: `bunx --bun biome format --write docs/superpowers/specs/2026-06-07-canonical-model-regex-refresh-design.md docs/superpowers/plans/2026-06-07-canonical-model-regex-refresh.md tests/worker/canonical-model-registry.test.ts apps/worker/migrations/0024_refresh_canonical_model_defaults.sql apps/worker/migrations/0030_expand_gpt_wrappers_and_gemini_suffixes.sql scripts/repair-local-d1.mjs`

- [ ] **Step 2: 跑类型检查**

Run: `bun run typecheck`

Expected: PASS

- [ ] **Step 3: 跑完整测试**

Run: `bun run test`

Expected: PASS

- [ ] **Step 4: 做后端直接请求验证**

启动本地 worker 后，用 `Invoke-RestMethod` 请求管理接口，确认修复后的统一模型接口可正常返回结果。

- [ ] **Step 5: 准备交付说明**

列出变更文件、执行命令、结果与剩余风险。
