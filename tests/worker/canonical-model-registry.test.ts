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

	it("新版默认规则能覆盖本地高频的多种模型格式", () => {
		const result = planCanonicalModelSync({
			rules: [
				{
					canonical_model: "openai/gpt-5",
					import_regex:
						"^(?:openai/)?gpt-5(?:\\.\\d+)?(?:-chat(?:-latest)?)?(?:-\\d{4}-\\d{2}-\\d{2})?$",
				},
				{
					canonical_model: "openai/gpt-5-codex",
					import_regex:
						"^(?:openai/)?gpt-5(?:\\.\\d+)?-codex(?:-(?:mini|max|spark))?$",
				},
				{
					canonical_model: "anthropic/claude-sonnet-4.6",
					import_regex:
						"^(?:anthropic/)?claude-sonnet-4(?:[.-]6)(?:-\\d{8})?(?:-thinking)?$",
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
					canonical_model: "moonshot/moonshot-v1-8k",
					import_regex: "^(?:moonshot/)?moonshot-v1-8k$",
				},
				{
					canonical_model: "zhipu/glm-4.6",
					import_regex: "^(?:(?:zhipu|z-ai)/)?glm-4\\.6$",
				},
				{
					canonical_model: "x-ai/grok-4.20",
					import_regex: "^(?:x-ai/)?grok-4\\.20(?:-[\\w.-]+)?$",
				},
			],
			candidates: [
				{
					alias: "gpt-5.4",
					hits: 10,
					last_seen_at: null,
					sources: ["attempt_request"],
				},
				{
					alias: "gpt-5.3-codex-spark",
					hits: 8,
					last_seen_at: null,
					sources: ["channel_capability"],
				},
				{
					alias: "claude-sonnet-4-6",
					hits: 6,
					last_seen_at: null,
					sources: ["attempt_request"],
				},
				{
					alias: "gemini-3.1-pro-preview-customtools",
					hits: 4,
					last_seen_at: null,
					sources: ["pricing"],
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
					alias: "z-ai/glm-4.6",
					hits: 5,
					last_seen_at: null,
					sources: ["attempt_request"],
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
				alias: "gpt-5.4",
				canonical_model: "openai/gpt-5",
			}),
			expect.objectContaining({
				alias: "gpt-5.3-codex-spark",
				canonical_model: "openai/gpt-5-codex",
			}),
			expect.objectContaining({
				alias: "claude-sonnet-4-6",
				canonical_model: "anthropic/claude-sonnet-4.6",
			}),
			expect.objectContaining({
				alias: "gemini-3.1-pro-preview-customtools",
				canonical_model: "google/gemini-3.1-pro-preview",
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
				alias: "z-ai/glm-4.6",
				canonical_model: "zhipu/glm-4.6",
			}),
			expect.objectContaining({
				alias: "grok-4.20-0309-non-reasoning",
				canonical_model: "x-ai/grok-4.20",
			}),
		]);
	});
});
