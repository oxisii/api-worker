import { describe, expect, it } from "vitest";
import {
	planCanonicalModelSync,
	type CanonicalModelAliasBindingInfo,
} from "../../apps/worker/src/services/canonical-model-registry";

function createBindingInfo(
	globalCanonicalModel: string | null,
	canonicalModels: string[],
): CanonicalModelAliasBindingInfo {
	return {
		globalCanonicalModel,
		canonicalModels: new Set(canonicalModels),
	};
}

describe("canonical model sync planning", () => {
	it("只在唯一命中时自动导入", () => {
		const result = planCanonicalModelSync({
			rules: [
				{
					canonical_model: "google/gemma-7b",
					import_regex: "^(?:@hf/google/)?gemma-7b(?:-it)?$",
				},
			],
			candidates: [
				{
					alias: "@hf/google/gemma-7b-it",
					hits: 3,
					last_seen_at: "2026-06-01T07:00:00.000Z",
					sources: ["usage_request", "pricing"],
				},
			],
			bindings: new Map(),
		});

		expect(result.imported).toEqual([
			expect.objectContaining({
				alias: "@hf/google/gemma-7b-it",
				canonical_model: "google/gemma-7b",
				sources: ["usage_request", "pricing"],
			}),
		]);
		expect(result.conflicts).toEqual([]);
		expect(result.invalid_rules).toEqual([]);
	});

	it("多个规则同时命中时进入冲突", () => {
		const result = planCanonicalModelSync({
			rules: [
				{ canonical_model: "gemma-family", import_regex: "gemma-7b" },
				{ canonical_model: "google/gemma-7b", import_regex: "^gemma-7b-it$" },
			],
			candidates: [
				{
					alias: "gemma-7b-it",
					hits: 1,
					last_seen_at: null,
					sources: ["usage_request"],
				},
			],
			bindings: new Map(),
		});

		expect(result.imported).toEqual([]);
		expect(result.conflicts).toEqual([
			expect.objectContaining({
				alias: "gemma-7b-it",
				matched_canonical_models: ["gemma-family", "google/gemma-7b"],
				reason: "multi_match",
			}),
		]);
	});

	it("多规则命中但已经手动归属到其中一个统一名时，不再重复记冲突", () => {
		const result = planCanonicalModelSync({
			rules: [
				{ canonical_model: "gemma-family", import_regex: "gemma-7b" },
				{ canonical_model: "google/gemma-7b", import_regex: "^gemma-7b-it$" },
			],
			candidates: [
				{
					alias: "gemma-7b-it",
					hits: 2,
					last_seen_at: null,
					sources: ["usage_request"],
				},
			],
			bindings: new Map([
				[
					"gemma-7b-it",
					createBindingInfo("google/gemma-7b", ["google/gemma-7b"]),
				],
			]),
		});

		expect(result.conflicts).toEqual([]);
		expect(result.already_bound).toBe(1);
	});

	it("已归属到其他统一名时进入冲突", () => {
		const result = planCanonicalModelSync({
			rules: [
				{ canonical_model: "google/gemma-7b", import_regex: "^gemma-7b-it$" },
			],
			candidates: [
				{
					alias: "gemma-7b-it",
					hits: 2,
					last_seen_at: null,
					sources: ["usage_upstream"],
				},
			],
			bindings: new Map([
				[
					"gemma-7b-it",
					createBindingInfo("legacy/gemma", ["legacy/gemma"]),
				],
			]),
		});

		expect(result.imported).toEqual([]);
		expect(result.conflicts).toEqual([
			expect.objectContaining({
				alias: "gemma-7b-it",
				existing_canonical_models: ["legacy/gemma"],
				reason: "existing_binding",
			}),
		]);
	});

	it("已全局归属到同一统一名时记为已存在，不重复导入", () => {
		const result = planCanonicalModelSync({
			rules: [
				{ canonical_model: "google/gemma-7b", import_regex: "^gemma-7b-it$" },
			],
			candidates: [
				{
					alias: "gemma-7b-it",
					hits: 5,
					last_seen_at: null,
					sources: ["attempt_request"],
				},
			],
			bindings: new Map([
				[
					"gemma-7b-it",
					createBindingInfo("google/gemma-7b", ["google/gemma-7b"]),
				],
			]),
		});

		expect(result.imported).toEqual([]);
		expect(result.already_bound).toBe(1);
	});

	it("非法正则会单独记录，不影响其他规则", () => {
		const result = planCanonicalModelSync({
			rules: [
				{ canonical_model: "broken/model", import_regex: "(" },
				{ canonical_model: "good/model", import_regex: "^good$" },
			],
			candidates: [
				{
					alias: "good",
					hits: 1,
					last_seen_at: null,
					sources: ["channel_capability"],
				},
			],
			bindings: new Map(),
		});

		expect(result.invalid_rules).toHaveLength(1);
		expect(result.invalid_rules[0]).toMatchObject({
			canonical_model: "broken/model",
			import_regex: "(",
		});
		expect(result.imported).toEqual([
			expect.objectContaining({
				alias: "good",
				canonical_model: "good/model",
			}),
		]);
	});

	it("基础规则不会吞掉明确版本线和显式子型号", () => {
		const result = planCanonicalModelSync({
			rules: [
				{
					canonical_model: "openai/gpt-5",
					import_regex:
						"^(?:openai/)?gpt-5(?:(?:-chat(?:-latest)?|-(?:high|low|medium)|-\\d{4}-\\d{2}-\\d{2}))?$",
				},
				{
					canonical_model: "openai/gpt-5.4",
					import_regex:
						"^(?:openai/)?gpt-5\\.4(?:\\.\\d+)*(?:(?:-(?:high|low|medium|xhigh|openai-compact)|\\((?:high|low|medium|xhigh)\\)|-\\d{4}-\\d{2}-\\d{2}))*$",
				},
				{
					canonical_model: "alibaba/qwen3-coder",
					import_regex:
						"^(?:(?:alibaba|qwen)/)?qwen3-coder(?:-(?!(?:plus|flash|next|480b-a35b)\\b)[\\w.-]+)?$",
				},
				{
					canonical_model: "alibaba/qwen3-coder-480b-a35b",
					import_regex:
						"^(?:(?:alibaba|qwen)/)?qwen3-coder-480b-a35b(?:-instruct)?$",
				},
				{
					canonical_model: "minimax/minimax-m2",
					import_regex:
						"^(?:(?:minimax|minimaxai)/)?minimax-m2(?:[-:][\\w-]+)*$",
				},
				{
					canonical_model: "minimax/minimax-m2.7",
					import_regex:
						"^(?:(?:minimax|minimaxai)/)?minimax-m2\\.7(?:[-:][\\w.]+)*$",
				},
			],
			candidates: [
				{
					alias: "gpt-5.4",
					hits: 1,
					last_seen_at: null,
					sources: ["usage_request"],
				},
				{
					alias: "qwen/qwen3-coder-480b-a35b-instruct",
					hits: 1,
					last_seen_at: null,
					sources: ["channel_capability"],
				},
				{
					alias: "minimax-m2.7",
					hits: 1,
					last_seen_at: null,
					sources: ["attempt_request"],
				},
			],
			bindings: new Map(),
		});

		expect(result.conflicts).toEqual([]);
		expect(result.imported).toEqual([
			expect.objectContaining({
				alias: "gpt-5.4",
				canonical_model: "openai/gpt-5.4",
			}),
			expect.objectContaining({
				alias: "qwen/qwen3-coder-480b-a35b-instruct",
				canonical_model: "alibaba/qwen3-coder-480b-a35b",
			}),
			expect.objectContaining({
				alias: "minimax-m2.7",
				canonical_model: "minimax/minimax-m2.7",
			}),
		]);
	});

	it("新版默认规则能覆盖本地高频的多种模型格式", () => {
		const result = planCanonicalModelSync({
			rules: [
				{
					canonical_model: "openai/gpt-5",
					import_regex:
						"^(?:openai/)?gpt-5(?:(?:-chat(?:-latest)?|-(?:high|low|medium)|-\\d{4}-\\d{2}-\\d{2}))?$",
				},
				{
					canonical_model: "openai/gpt-5.4",
					import_regex:
						"^(?:openai/)?gpt-5\\.4(?:\\.\\d+)*(?:-\\d{4}-\\d{2}-\\d{2})?$",
				},
				{
					canonical_model: "openai/gpt-5.2",
					import_regex:
						"^(?:openai/)?gpt-5\\.2(?:\\.\\d+)*(?:(?:-chat(?:-latest)?|-(?:high|low|medium|xhigh|openai-compact)|\\((?:auto|high|low|medium|xhigh)\\)|-\\d{4}-\\d{2}-\\d{2}))*$",
				},
				{
					canonical_model: "openai/gpt-5.2-codex",
					import_regex:
						"^(?:openai/)?gpt-5\\.2(?:\\.\\d+)*-codex(?:-openai-compact)?$",
				},
				{
					canonical_model: "openai/gpt-5.1-codex-max",
					import_regex:
						"^(?:openai/)?gpt-5\\.1(?:\\.\\d+)*-codex-max(?:-openai-compact)?$",
				},
				{
					canonical_model: "openai/gpt-5.4-mini",
					import_regex:
						"^(?:openai/)?gpt-5\\.4(?:\\.\\d+)*-mini(?:-\\d{4}-\\d{2}-\\d{2})?$",
				},
				{
					canonical_model: "openai/gpt-5.3-codex",
					import_regex:
						"^(?:openai/)?gpt-5\\.3(?:\\.\\d+)*-codex(?:(?:-(?:spark|high|low|medium|xhigh))?(?:-openai-compact)?|\\((?:high|low|medium|xhigh)\\))$",
				},
				{
					canonical_model: "anthropic/claude-sonnet-4.6",
					import_regex:
						"^(?:anthropic/)?claude-sonnet-4(?:[.-]6)(?:-\\d{8})?(?:-thinking)?$",
				},
				{
					canonical_model: "anthropic/claude-opus-4.8",
					import_regex:
						"^(?:anthropic/)?claude-opus-4(?:[.-]8)(?:-\\d{8})?(?:-(?:thinking|fast))?$",
				},
				{
					canonical_model: "google/gemini-3.1-pro-preview",
					import_regex:
						"^(?:google/)?gemini-3\\.1-pro-preview(?:-[\\w.-]+)?$",
				},
				{
					canonical_model: "google/gemma-7b",
					import_regex:
						"^(?:@hf/google/|@cf/google/|google/)?gemma-7b(?:-it(?:-lora)?)?$",
				},
				{
					canonical_model: "alibaba/qwen-max",
					import_regex:
						"^(?:(?:alibaba|qwen)/)?qwen-max(?:-(?:latest|\\d{4}-\\d{2}-\\d{2}))?(?:-(?:thinking|search))*$",
				},
				{
					canonical_model: "alibaba/qwen-plus",
					import_regex:
						"^(?:(?:alibaba|qwen)/)?qwen-plus(?:-(?:latest|\\d{4}-\\d{2}-\\d{2}))?(?:-us)?$",
				},
				{
					canonical_model: "alibaba/qwen3-max",
					import_regex:
						"^(?:(?:alibaba|qwen)/)?qwen3-max(?:-(?:preview|\\d{4}-\\d{2}-\\d{2}))?(?:-thinking)?$",
				},
				{
					canonical_model: "alibaba/qwen3-coder",
					import_regex:
						"^(?:(?:alibaba|qwen)/)?qwen3-coder(?:-(?!(?:plus|flash|next|480b-a35b)\\b)[\\w.-]+)?$",
				},
				{
					canonical_model: "alibaba/qwen3-coder-flash",
					import_regex:
						"^(?:(?:alibaba|qwen)/)?qwen3-coder-flash(?:-\\d{4}-\\d{2}-\\d{2})?$",
				},
				{
					canonical_model: "alibaba/qwen3-coder-next",
					import_regex:
						"^(?:(?:alibaba|qwen)/)?qwen3-coder-next(?:-thinking)?$",
				},
				{
					canonical_model: "alibaba/qwen3-next-80b-a3b",
					import_regex:
						"^(?:(?:alibaba|qwen)/)?qwen3-next-80b-a3b(?:-(?:instruct|thinking))?$",
				},
				{
					canonical_model: "alibaba/qwen3-coder-480b-a35b",
					import_regex:
						"^(?:(?:alibaba|qwen)/)?qwen3-coder-480b-a35b(?:-instruct)?$",
				},
				{
					canonical_model: "alibaba/qwen3-235b-a22b",
					import_regex:
						"^(?:(?:alibaba|qwen)/)?qwen3-235b-a22b(?:-(?:instruct|thinking(?:-\\d{4})?))?$",
				},
				{
					canonical_model: "alibaba/qwen3-vl-plus",
					import_regex: "^(?:(?:alibaba|qwen)/)?qwen3-vl-plus$",
				},
				{
					canonical_model: "alibaba/qwen3.5-122b-a10b",
					import_regex: "^(?:(?:alibaba|qwen)/)?qwen3\\.5-122b-a10b$",
				},
				{
					canonical_model: "alibaba/qwen3.5-plus",
					import_regex:
						"^(?:(?:alibaba|qwen)/)?qwen3\\.5-plus(?:-(?:search|thinking|image|image-edit))?$",
				},
				{
					canonical_model: "alibaba/qwq-32b",
					import_regex: "^(?:(?:alibaba|qwen)/)?qwq-32b$",
				},
				{
					canonical_model: "moonshot/moonshot-v1-8k",
					import_regex: "^(?:moonshot/)?moonshot-v1-8k$",
				},
				{
					canonical_model: "moonshot/kimi-k2",
					import_regex:
						"^(?:(?:moonshot|moonshotai)/)?kimi-k2(?:[-:][\\w.]+)*$",
				},
				{
					canonical_model: "moonshot/moonshot-v1-128k",
					import_regex: "^(?:moonshot/)?moonshot-v1-128k$",
				},
				{
					canonical_model: "zhipu/glm-4.7",
					import_regex: "^(?:(?:zhipu|z-ai)/)?glm-?4\\.7(?:[-:][\\w.]+)*$",
				},
				{
					canonical_model: "minimax/minimax-m2.1",
					import_regex:
						"^(?:(?:minimax|minimaxai)/)?minimax-m2\\.1(?:[-:][\\w.]+)*$",
				},
				{
					canonical_model: "deepseek/deepseek-v3.2",
					import_regex:
						"^(?:(?:deepseek|deepseek-ai)/)?deepseek-v3(?:[.-]2)(?:[-:][\\w.]+)*$",
				},
				{
					canonical_model: "x-ai/grok-4.20",
					import_regex: "^(?:x-ai/)?grok-4\\.20(?:-[\\w.-]+)?$",
				},
			],
			candidates: [
				{
					alias: "gpt-5",
					hits: 10,
					last_seen_at: null,
					sources: ["attempt_request"],
				},
				{
					alias: "gpt-5.4",
					hits: 9,
					last_seen_at: null,
					sources: ["usage_request"],
				},
				{
					alias: "gpt-5.2-chat-latest",
					hits: 8,
					last_seen_at: null,
					sources: ["channel_capability"],
				},
				{
					alias: "gpt-5.2-codex",
					hits: 8,
					last_seen_at: null,
					sources: ["channel_capability"],
				},
				{
					alias: "gpt-5.1-codex-max",
					hits: 7,
					last_seen_at: null,
					sources: ["attempt_upstream"],
				},
				{
					alias: "gpt-5.4-mini",
					hits: 7,
					last_seen_at: null,
					sources: ["attempt_request"],
				},
				{
					alias: "gpt-5.3-codex-openai-compact",
					hits: 6,
					last_seen_at: null,
					sources: ["attempt_upstream"],
				},
				{
					alias: "claude-sonnet-4-6",
					hits: 6,
					last_seen_at: null,
					sources: ["attempt_request"],
				},
				{
					alias: "claude-opus-4-8",
					hits: 5,
					last_seen_at: null,
					sources: ["usage_upstream"],
				},
				{
					alias: "gemini-3.1-pro-preview-customtools",
					hits: 4,
					last_seen_at: null,
					sources: ["pricing"],
				},
				{
					alias: "qwen-max-latest",
					hits: 7,
					last_seen_at: null,
					sources: ["pricing"],
				},
				{
					alias: "qwen-plus-us",
					hits: 4,
					last_seen_at: null,
					sources: ["pricing"],
				},
				{
					alias: "qwen3-max-preview",
					hits: 4,
					last_seen_at: null,
					sources: ["attempt_request"],
				},
				{
					alias: "qwen/qwen3-next-80b-a3b-instruct",
					hits: 4,
					last_seen_at: null,
					sources: ["channel_capability"],
				},
				{
					alias: "qwen/qwen3-coder-480b-a35b-instruct",
					hits: 4,
					last_seen_at: null,
					sources: ["channel_capability"],
				},
				{
					alias: "qwen3-235b-a22b-instruct",
					hits: 3,
					last_seen_at: null,
					sources: ["channel_capability"],
				},
				{
					alias: "qwen3-coder-flash-2025-07-28",
					hits: 3,
					last_seen_at: null,
					sources: ["attempt_request"],
				},
				{
					alias: "qwen3-coder-next",
					hits: 3,
					last_seen_at: null,
					sources: ["channel_capability"],
				},
				{
					alias: "qwen3-vl-plus",
					hits: 4,
					last_seen_at: null,
					sources: ["channel_capability"],
				},
				{
					alias: "qwen/qwen3.5-122b-a10b",
					hits: 5,
					last_seen_at: null,
					sources: ["channel_capability"],
				},
				{
					alias: "qwen3.5-plus-search",
					hits: 4,
					last_seen_at: null,
					sources: ["channel_capability"],
				},
				{
					alias: "qwen/qwq-32b",
					hits: 5,
					last_seen_at: null,
					sources: ["channel_capability"],
				},
				{
					alias: "@cf/google/gemma-7b-it-lora",
					hits: 2,
					last_seen_at: null,
					sources: ["attempt_upstream"],
				},
				{
					alias: "moonshot-v1-8k",
					hits: 3,
					last_seen_at: null,
					sources: ["attempt_request"],
				},
				{
					alias: "moonshotai/kimi-k2-thinking",
					hits: 3,
					last_seen_at: null,
					sources: ["attempt_upstream"],
				},
				{
					alias: "moonshot-v1-128k",
					hits: 2,
					last_seen_at: null,
					sources: ["attempt_request"],
				},
				{
					alias: "z-ai/glm4.7",
					hits: 5,
					last_seen_at: null,
					sources: ["attempt_request"],
				},
				{
					alias: "minimaxai/minimax-m2.1",
					hits: 2,
					last_seen_at: null,
					sources: ["attempt_request"],
				},
				{
					alias: "deepseek-ai/deepseek-v3.2",
					hits: 2,
					last_seen_at: null,
					sources: ["channel_capability"],
				},
				{
					alias: "grok-4.20-0309-non-reasoning",
					hits: 7,
					last_seen_at: null,
					sources: ["channel_capability"],
				},
			],
			bindings: new Map(),
		});

		expect(result.conflicts).toEqual([]);
		expect(result.imported).toEqual([
			expect.objectContaining({
				alias: "gpt-5",
				canonical_model: "openai/gpt-5",
			}),
			expect.objectContaining({
				alias: "gpt-5.4",
				canonical_model: "openai/gpt-5.4",
			}),
			expect.objectContaining({
				alias: "gpt-5.2-chat-latest",
				canonical_model: "openai/gpt-5.2",
			}),
			expect.objectContaining({
				alias: "gpt-5.2-codex",
				canonical_model: "openai/gpt-5.2-codex",
			}),
			expect.objectContaining({
				alias: "gpt-5.1-codex-max",
				canonical_model: "openai/gpt-5.1-codex-max",
			}),
			expect.objectContaining({
				alias: "gpt-5.4-mini",
				canonical_model: "openai/gpt-5.4-mini",
			}),
			expect.objectContaining({
				alias: "gpt-5.3-codex-openai-compact",
				canonical_model: "openai/gpt-5.3-codex",
			}),
			expect.objectContaining({
				alias: "claude-sonnet-4-6",
				canonical_model: "anthropic/claude-sonnet-4.6",
			}),
			expect.objectContaining({
				alias: "claude-opus-4-8",
				canonical_model: "anthropic/claude-opus-4.8",
			}),
			expect.objectContaining({
				alias: "gemini-3.1-pro-preview-customtools",
				canonical_model: "google/gemini-3.1-pro-preview",
			}),
			expect.objectContaining({
				alias: "qwen-max-latest",
				canonical_model: "alibaba/qwen-max",
			}),
			expect.objectContaining({
				alias: "qwen-plus-us",
				canonical_model: "alibaba/qwen-plus",
			}),
			expect.objectContaining({
				alias: "qwen3-max-preview",
				canonical_model: "alibaba/qwen3-max",
			}),
			expect.objectContaining({
				alias: "qwen/qwen3-next-80b-a3b-instruct",
				canonical_model: "alibaba/qwen3-next-80b-a3b",
			}),
			expect.objectContaining({
				alias: "qwen/qwen3-coder-480b-a35b-instruct",
				canonical_model: "alibaba/qwen3-coder-480b-a35b",
			}),
			expect.objectContaining({
				alias: "qwen3-235b-a22b-instruct",
				canonical_model: "alibaba/qwen3-235b-a22b",
			}),
			expect.objectContaining({
				alias: "qwen3-coder-flash-2025-07-28",
				canonical_model: "alibaba/qwen3-coder-flash",
			}),
			expect.objectContaining({
				alias: "qwen3-coder-next",
				canonical_model: "alibaba/qwen3-coder-next",
			}),
			expect.objectContaining({
				alias: "qwen3-vl-plus",
				canonical_model: "alibaba/qwen3-vl-plus",
			}),
			expect.objectContaining({
				alias: "qwen/qwen3.5-122b-a10b",
				canonical_model: "alibaba/qwen3.5-122b-a10b",
			}),
			expect.objectContaining({
				alias: "qwen3.5-plus-search",
				canonical_model: "alibaba/qwen3.5-plus",
			}),
			expect.objectContaining({
				alias: "qwen/qwq-32b",
				canonical_model: "alibaba/qwq-32b",
			}),
			expect.objectContaining({
				alias: "@cf/google/gemma-7b-it-lora",
				canonical_model: "google/gemma-7b",
			}),
			expect.objectContaining({
				alias: "moonshot-v1-8k",
				canonical_model: "moonshot/moonshot-v1-8k",
			}),
			expect.objectContaining({
				alias: "moonshotai/kimi-k2-thinking",
				canonical_model: "moonshot/kimi-k2",
			}),
			expect.objectContaining({
				alias: "moonshot-v1-128k",
				canonical_model: "moonshot/moonshot-v1-128k",
			}),
			expect.objectContaining({
				alias: "z-ai/glm4.7",
				canonical_model: "zhipu/glm-4.7",
			}),
			expect.objectContaining({
				alias: "minimaxai/minimax-m2.1",
				canonical_model: "minimax/minimax-m2.1",
			}),
			expect.objectContaining({
				alias: "deepseek-ai/deepseek-v3.2",
				canonical_model: "deepseek/deepseek-v3.2",
			}),
			expect.objectContaining({
				alias: "grok-4.20-0309-non-reasoning",
				canonical_model: "x-ai/grok-4.20",
			}),
		]);
	});

	it("GPT 包装前缀与 Gemini 稳定尾缀可以被安全归纳", () => {
		const result = planCanonicalModelSync({
			rules: [
				{
					canonical_model: "openai/gpt-5.3",
					import_regex:
						"^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\\.3(?:(?:-chat(?:-latest)?|-instant|-(?:high|low|medium|xhigh|openai-compact)|\\((?:auto|high|low|medium|xhigh)\\)|-\\d{4}-\\d{2}-\\d{2}))*$",
				},
				{
					canonical_model: "openai/gpt-5.3-codex",
					import_regex:
						"^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\\.3(?:\\.\\d+)*-codex(?:(?:-(?:spark|high|low|medium|xhigh))?(?:-openai-compact)?|\\((?:high|low|medium|xhigh)\\))$",
				},
				{
					canonical_model: "openai/gpt-5.4",
					import_regex:
						"^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\\.4(?:\\.\\d+)*(?:(?:-(?:high|low|medium|xhigh|openai-compact)|\\((?:high|low|medium|xhigh)\\)|-\\d{4}-\\d{2}-\\d{2}))*$",
				},
				{
					canonical_model: "anthropic/claude-sonnet-4.6",
					import_regex:
						"^(?:anthropic/)?claude-sonnet-4(?:[.-]6)(?:-\\d{8})?(?:-thinking)?$",
				},
				{
					canonical_model: "google/gemini-3-flash-preview",
					import_regex:
						"^(?:google/)?gemini-3-flash-preview(?:[-:][\\w.-]+)?$",
				},
			],
			candidates: [
				{
					alias: "cc-gpt-5.4",
					hits: 1,
					last_seen_at: null,
					sources: ["channel_capability"],
				},
				{
					alias: "claude-gpt-5.4",
					hits: 1,
					last_seen_at: null,
					sources: ["channel_capability"],
				},
				{
					alias: "gpt-5.3",
					hits: 1,
					last_seen_at: null,
					sources: ["usage_request"],
				},
				{
					alias: "gpt-5.3-chat",
					hits: 1,
					last_seen_at: null,
					sources: ["usage_request"],
				},
				{
					alias: "openai:gpt-5.3-codex",
					hits: 1,
					last_seen_at: null,
					sources: ["attempt_upstream"],
				},
				{
					alias: "gemini-3-flash-preview:cloud",
					hits: 1,
					last_seen_at: null,
					sources: ["pricing"],
				},
				{
					alias: "claude-sonnet-4-6",
					hits: 1,
					last_seen_at: null,
					sources: ["attempt_request"],
				},
			],
			bindings: new Map(),
		});

		expect(result.conflicts).toEqual([]);
		expect(result.imported).toEqual([
			expect.objectContaining({
				alias: "cc-gpt-5.4",
				canonical_model: "openai/gpt-5.4",
			}),
			expect.objectContaining({
				alias: "claude-gpt-5.4",
				canonical_model: "openai/gpt-5.4",
			}),
			expect.objectContaining({
				alias: "gpt-5.3",
				canonical_model: "openai/gpt-5.3",
			}),
			expect.objectContaining({
				alias: "gpt-5.3-chat",
				canonical_model: "openai/gpt-5.3",
			}),
			expect.objectContaining({
				alias: "openai:gpt-5.3-codex",
				canonical_model: "openai/gpt-5.3-codex",
			}),
			expect.objectContaining({
				alias: "gemini-3-flash-preview:cloud",
				canonical_model: "google/gemini-3-flash-preview",
			}),
			expect.objectContaining({
				alias: "claude-sonnet-4-6",
				canonical_model: "anthropic/claude-sonnet-4.6",
			}),
		]);
	});
});
