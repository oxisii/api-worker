import { describe, expect, it } from "vitest";
import {
	calculateUsageCharge,
	resolveModelPrice,
} from "../../../../apps/worker/src/domains/pricing/calculator";
import type { ModelPriceRecord } from "../../../../apps/worker/src/domains/pricing/types";

const price = (
	patch: Partial<ModelPriceRecord> & Pick<ModelPriceRecord, "model_pattern">,
): ModelPriceRecord => ({
	id: patch.id ?? crypto.randomUUID(),
	provider: patch.provider ?? "openai",
	model_pattern: patch.model_pattern,
	model_name: patch.model_name ?? patch.model_pattern,
	currency: patch.currency ?? "USD",
	input_price_per_1m: patch.input_price_per_1m ?? 1,
	cache_read_price_per_1m: patch.cache_read_price_per_1m ?? 0.25,
	cache_write_price_per_1m: patch.cache_write_price_per_1m ?? 1.25,
	output_price_per_1m: patch.output_price_per_1m ?? 2,
	source: patch.source ?? "manual",
	source_url: patch.source_url ?? null,
	enabled: patch.enabled ?? 1,
	updated_at: patch.updated_at ?? "2026-05-30T00:00:00.000Z",
});

describe("pricing calculator", () => {
	it("优先选择手动精确价，再选择同步通配价", () => {
		const prices = [
			price({
				id: "sync-wildcard",
				model_pattern: "gpt-4o-*",
				source: "official_sync",
				input_price_per_1m: 2,
			}),
			price({
				id: "manual-exact",
				model_pattern: "gpt-4o-mini",
				source: "manual",
				input_price_per_1m: 3,
			}),
		];

		expect(resolveModelPrice(prices, "gpt-4o-mini")?.id).toBe("manual-exact");
		expect(resolveModelPrice(prices, "gpt-4o-2024")?.id).toBe("sync-wildcard");
		expect(resolveModelPrice(prices, "gpt-3.5")).toBeNull();
	});

	it("不再把旧内置价作为兜底价格", () => {
		const prices = [
			price({
				id: "old-builtin-wildcard",
				model_pattern: "gpt-*",
				source: "builtin" as never,
			}),
		];

		expect(resolveModelPrice(prices, "gpt-3.5")).toBeNull();
	});

	it("按普通输入、缓存命中、缓存写入和输出 token 计算下游销售额", () => {
		const result = calculateUsageCharge({
			model: "gpt-4o-mini",
			prices: [
				price({
					id: "manual-exact",
					model_pattern: "gpt-4o-mini",
					input_price_per_1m: 10,
					cache_read_price_per_1m: 2,
					cache_write_price_per_1m: 12,
					output_price_per_1m: 30,
					source: "manual",
				}),
			],
			markup: 1.5,
			usage: {
				totalTokens: 4000,
				promptTokens: 3000,
				completionTokens: 1000,
				cacheReadInputTokens: 500,
				cacheWriteInputTokens: 100,
				uncachedInputTokens: 2400,
			},
		});

		expect(result.status).toBe("ok");
		expect(result.amount).toBeCloseTo(0.0843, 8);
		expect(result.currency).toBe("USD");
		expect(result.source).toBe("manual");
		expect(result.detail).toMatchObject({
			price_id: "manual-exact",
			markup: 1.5,
			uncached_input_tokens: 2400,
			cache_read_input_tokens: 500,
			cache_write_input_tokens: 100,
			output_tokens: 1000,
		});
	});

	it("缺少模型价格时返回 missing_price 且金额为 0", () => {
		const result = calculateUsageCharge({
			model: "unknown-model",
			prices: [price({ model_pattern: "gpt-*" })],
			markup: 1.3,
			usage: {
				totalTokens: 100,
				promptTokens: 60,
				completionTokens: 40,
			},
		});

		expect(result).toMatchObject({
			status: "missing_price",
			amount: 0,
			currency: "USD",
			source: "none",
		});
	});
});
