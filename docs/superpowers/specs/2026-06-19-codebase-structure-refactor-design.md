# 代码结构重构设计

## 目标

本次重构统一仓库的目录和文件边界，让开发者能从路径判断代码职责：目录表示领域，文件表示该领域内的职责。重构必须保持现有运行行为不变，优先通过移动、拆分、合并和引用修正改善结构。

## 问题

当前结构同时存在两种组织方式：

- 用目录表达领域：`services/proxy/*`、`services/pricing/*`。
- 用文件名前缀表达领域：`channel-*`、`site-*`、`backup-*`、`checkin-*`。

文件粒度也不一致：

- 巨型文件承担太多职责，例如 `apps/ui/src/App.tsx`、`apps/ui/src/features/ChannelsView.tsx`、`apps/worker/src/domains/proxy/adapters/*`、`apps/worker/src/domains/proxy/route.ts`。
- 很小的文件独立存在，但只服务单一领域，例如 `usage-format.ts`、`pricing-sync.ts`、`call-token-selector.ts`、`stream-options.ts`。

仓库还跟踪了部分构建生成物，例如 `apps/worker/.wrangler-build/*`。这类文件会干扰源码目录判断。

## 结构规范

### 通用规则

- 一级应用仍保持 `apps/worker`、`apps/attempt-worker`、`apps/ui`、`apps/shared-core`。
- 应用内部按领域目录组织，不在同一层用大量前缀文件模拟目录。
- 目录名使用 kebab-case，表示稳定领域或子领域。
- 文件名使用 kebab-case，表示职责；React 组件文件可保留 PascalCase。
- `index.ts` 仅用于领域出口或库出口，不放主要实现。
- 小于 30 行且只被同领域使用的文件应合并，除非它是类型文件、框架约定入口或公共出口。
- 超过 400 行的源文件应拆分，优先抽出纯逻辑、子组件、请求构造、响应转换、持久化访问和类型定义。

### Worker

Worker 业务逻辑统一放入 `apps/worker/src/domains`。`routes` 只负责 HTTP 入参、鉴权上下文和响应，调用 domain。

目标结构：

```text
apps/worker/src/
  domains/
    backup/
    channel/
    checkin/
    model/
    pricing/
    proxy/
      adapters/
      attempt/
      request/
      response/
    settings/
    site/
    usage/
  routes/
  middleware/
  utils/
  wasm/
```

迁移映射：

- `services/channel-*`、`services/channels.ts` -> `domains/channel/*`
- `services/site-*` -> `domains/site/*`
- `services/backup*` -> `domains/backup/*`
- `services/checkin*` -> `domains/checkin/*`
- `services/pricing/*` -> `domains/pricing/*`
- `services/proxy/*`、`shared/proxy.ts`、`chat-response-adapter.ts` -> `domains/proxy/*`
- `services/settings.ts` -> `domains/settings/*`
- `services/usage*` -> `domains/usage/*`
- `services/model-*`、`models-index.ts`、`openai-model-list.ts`、`canonical-model-*` -> `domains/model/*`

### UI

UI 采用 `app` + `features` + `core` + `components`：

```text
apps/ui/src/
  app/
    App.tsx
    navigation.ts
    state.ts
    actions.ts
  features/
    channels/
    settings/
    pricing/
    canonical-models/
    dashboard/
    usage/
    tokens/
    models/
    login/
  core/
  components/ui/
```

规则：

- `app/App.tsx` 只做应用装配、数据流串联和顶层路由。
- feature 目录承载页面、局部组件、局部纯逻辑和局部类型。
- 只被一个 feature 使用的工具函数留在 feature 目录。
- 被多个 feature 使用的稳定模型、API、格式化工具留在 `core`。
- `components/ui` 保持纯 UI 组件，不引入业务概念。

### Tests

测试目录跟随源码领域：

```text
tests/
  unit/
    worker/
      backup/
      channel/
      checkin/
      model/
      pricing/
      proxy/
      settings/
      site/
      usage/
    ui/
      channels/
      settings/
      pricing/
      canonical-models/
      dashboard/
      usage/
      tokens/
      models/
    shared-core/
    scripts/
  e2e/
```

测试文件与被测领域同名或同职责命名，避免所有 worker 测试平铺。

### 生成物

- `apps/worker/.wrangler-build/*` 不应跟踪，应加入忽略并从仓库移除。
- `apps/worker/src/wasm/generated/*` 由 `build:wasm` 生成，但当前运行依赖该目录。保留跟踪，同时在 `apps/worker/src/wasm/README.md` 标记为生成边界。
- `apps/worker/.tmp-wasm-web/*` 如不被运行时引用，应移除跟踪并忽略；如被部署流程引用，应移动到明确的 generated 目录。

## 实施策略

重构按阶段提交，每个阶段保持可运行：

1. 建立规范文档和计划。
2. 清理生成物边界。
3. 迁移 worker 领域目录，保持导出和行为不变。
4. 拆分 worker 巨型 proxy、adapter、site、settings 文件。
5. 迁移 UI 到 `app` 和 feature 目录。
6. 拆分 UI 巨型页面和顶层状态。
7. 同步测试目录、文档引用和验证命令。

每个阶段必须执行：

```bash
bunx --bun biome format --write <changed-files>
bun run typecheck
bun run test
```

涉及 Playwright 配置或 e2e 路径时额外执行：

```bash
bun run test:e2e -- --list
```

涉及前端行为拆分时，最终阶段需要执行最小 e2e 回归。
