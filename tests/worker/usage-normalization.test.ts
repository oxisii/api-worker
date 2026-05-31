import { describe, expect, it } from "vitest";
import { normalizeUsageObject } from "../../apps/worker/src/utils/usage-normalize";
import { buildUsageHeaders } from "../../apps/worker/src/utils/usage-headers";

describe("usage cache normalization", () => {
	it("从 OpenAI usage 提取 cached_tokens", () => {
		expect(
			normalizeUsageObject({
				prompt_tokens: 3000,
				completion_tokens: 1000,
				total_tokens: 4000,
				prompt_tokens_details: {
					cached_tokens: 512,
				},
			}),
		).toMatchObject({
			totalTokens: 4000,
			promptTokens: 3000,
			completionTokens: 1000,
			cacheReadInputTokens: 512,
			cacheWriteInputTokens: 0,
			uncachedInputTokens: 2488,
		});
	});

	it("从 Claude usage 提取 cache read 和 cache creation tokens", () => {
		expect(
			normalizeUsageObject({
				usage: {
					input_tokens: 900,
					output_tokens: 120,
					cache_read_input_tokens: 700,
					cache_creation_input_tokens: 300,
				},
			}),
		).toMatchObject({
			totalTokens: 2020,
			promptTokens: 1900,
			completionTokens: 120,
			cacheReadInputTokens: 700,
			cacheWriteInputTokens: 300,
			uncachedInputTokens: 900,
		});
	});

	it("从 OpenAI 兼容的 Anthropic usage 提取 cached_creation_tokens", () => {
		expect(
			normalizeUsageObject({
				prompt_tokens: 40829,
				completion_tokens: 1,
				total_tokens: 40830,
				usage_source: "anthropic",
				prompt_tokens_details: {
					cached_tokens: 0,
					cached_creation_tokens: 40765,
				},
				input_tokens: 40829,
				output_tokens: 0,
				claude_cache_creation_5_m_tokens: 40765,
				claude_cache_creation_1_h_tokens: 0,
			}),
		).toMatchObject({
			totalTokens: 40830,
			promptTokens: 40829,
			completionTokens: 1,
			cacheReadInputTokens: 0,
			cacheWriteInputTokens: 40765,
			uncachedInputTokens: 64,
		});
	});

	it("从 Gemini usageMetadata 提取 cachedContentTokenCount", () => {
		expect(
			normalizeUsageObject({
				usageMetadata: {
					promptTokenCount: 1400,
					candidatesTokenCount: 600,
					totalTokenCount: 2000,
					cachedContentTokenCount: 500,
				},
			}),
		).toMatchObject({
			totalTokens: 2000,
			promptTokens: 1400,
			completionTokens: 600,
			cacheReadInputTokens: 500,
			cacheWriteInputTokens: 0,
			uncachedInputTokens: 900,
		});
	});

	it("从完整 x-usage header 保留缓存读写字段", () => {
		const headers = buildUsageHeaders({
			totalTokens: 2200,
			promptTokens: 1600,
			completionTokens: 600,
			cacheReadInputTokens: 500,
			cacheWriteInputTokens: 100,
			uncachedInputTokens: 1000,
		});
		const payload = JSON.parse(headers["x-usage"]);

		expect(payload).toMatchObject({
			totalTokens: 2200,
			promptTokens: 1600,
			completionTokens: 600,
			cacheReadInputTokens: 500,
			cacheWriteInputTokens: 100,
			uncachedInputTokens: 1000,
		});
		expect(normalizeUsageObject(payload)).toMatchObject({
			cacheReadInputTokens: 500,
			cacheWriteInputTokens: 100,
			uncachedInputTokens: 1000,
		});
	});
});
