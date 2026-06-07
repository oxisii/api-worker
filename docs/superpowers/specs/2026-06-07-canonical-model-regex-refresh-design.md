# 统一模型正则补齐设计

## 背景

线上真实模型名已经明显超出当前仓库内置默认规则。问题不只在官方主型号缺失，还包括一批可稳定概括的包装前缀、提供商前缀与渠道后缀没有被安全吸收，导致统一模型散落、主系列缺口和错误自生 canonical 项长期共存。

这次修复聚焦默认统一模型规则，不改代理路由评分、前端分组 UI 和人工维护流程。

## 目标

- 补齐 `openai/gpt-5.3` 主系列默认规则。
- 让 `GPT` 家族支持受控包装前缀 `cc-` 与 `claude-`，但只在后缀明确进入 `gpt-*` 家族时生效。
- 让 `GPT` 家族支持线上已出现的 `openai:` 提供商包装。
- 让 `Gemini` 家族继续支持 `google/` 前缀，并补齐 `:cloud`、`:latest` 这类稳定尾缀。
- 用测试覆盖“可归纳变体被吸收”和“不会误吞其他家族”两类边界。
- 通过新迁移把现有线上 D1 一并修正，而不是只修新部署种子。

## 非目标

- 不尝试吞并所有平台套餐标记，如 `-2cc`、`-el`、`vercel:`、`:free`。
- 不处理明显像产品入口而非基础文本模型的名称，如 `gemini-auto`、`gemini-veo`。
- 不清理现有线上所有历史脏 canonical 项，只修正默认规则与后续自动归属方向。

## 线上观察结论

### GPT 家族

线上已存在稳定可概括名称：

- `cc-gpt-5.4`
- `cc-gpt-5.5`
- `claude-gpt-5.4`
- `openai:gpt-5.3-codex`
- `openai:gpt-5.4-2026-03-05`

同时 `gpt-5.3` 主系列本身存在缺口，当前仓库只覆盖了 `gpt-5.3-codex`。

### Gemini 家族

线上未发现 `cc-`、`claude-` 这类包装前缀。稳定可概括形式主要是：

- `google/gemini-*`
- `gemini-3-flash-preview:cloud`
- `gemini-3-flash-preview:latest`

因此 Gemini 只放宽提供商前缀和少量尾缀，不引入 GPT 那种包装前缀策略。

## 设计

### 1. GPT 家族包装前缀

对 `openai/gpt-*` 规则增加受控前缀：

- `cc-`
- `claude-`
- `openai:`
- 继续保留 `openai/`

实现原则：

- 只在模型主体明确以 `gpt-5` 家族开头时生效。
- 不新增通用 `claude-` 前缀规则，避免误吞 `claude-sonnet-*`、`claude-opus-*`。

### 2. GPT-5.3 主系列补齐

新增 `openai/gpt-5.3` 默认 canonical 及 regex，吸收：

- `gpt-5.3`
- `openai/gpt-5.3`
- `cc-gpt-5.3`
- `claude-gpt-5.3`
- `openai:gpt-5.3`
- `gpt-5.3-chat`
- `gpt-5.3-chat-latest`
- `gpt-5.3-instant`
- 日期版

`gpt-5.3-codex*` 继续由独立 codex 规则负责，避免主规则吞掉 codex 子线。

### 3. Gemini 尾缀放宽

对 preview 类 Gemini 规则把尾缀从仅 `-suffix` 放宽到 `-suffix` 或 `:suffix`，覆盖：

- `gemini-3-flash-preview:cloud`
- `gemini-3-flash-preview:latest`

不把 `gemini-auto`、`gemini-fast`、`gemini-search` 自动并到基础文本 canonical。

### 4. 数据落地点

需要同时修改三层：

- D1 新迁移：修正已上线数据库
- `0024` 默认种子：保障全新数据库正确
- `scripts/repair-local-d1.mjs`：保障本地半成功迁移修复脚本一致

## 测试策略

- `canonical-model-registry` 增加失败用例：
  - `cc-gpt-5.4` 命中 `openai/gpt-5.4`
  - `claude-gpt-5.4` 命中 `openai/gpt-5.4`
  - `openai:gpt-5.3-codex` 命中 `openai/gpt-5.3-codex`
  - `gpt-5.3` 与 `gpt-5.3-chat` 命中 `openai/gpt-5.3`
  - `google/gemini-3-flash-preview` 与 `gemini-3-flash-preview:cloud` 命中 `google/gemini-3-flash-preview`
- 增加防误吞断言：
  - `claude-sonnet-4.6` 仍命中 Claude 家族
  - `claude-gpt-5.4` 不得进入 Claude 家族

## 风险与控制

- 风险：GPT 前缀放宽后误吞真实 Claude 名称。
  - 控制：只在 `gpt-5` 家族主体前生效，不写通用 `claude-` 规则。
- 风险：线上已存在历史脏 canonical 项。
  - 控制：本次只修默认归类方向，不自动大规模重写历史手工项。
