import type {
	ChargeableUsage,
	ChargeResult,
	ModelPriceRecord,
	ModelPriceSource,
} from "./types";
import {
	canonicalModelEquals,
	deriveCanonicalModel,
} from "../model-normalization";

const SOURCE_PRIORITY: Record<ModelPriceSource, number> = {
	manual: 3,
	official_sync: 2,
};

function normalizeModel(value: string | null | undefined): string {
	return (value ?? "").trim().toLowerCase();
}

function modelPatternMatches(
	pattern: string,
	model: string | null | undefined,
): boolean {
	const normalizedPattern = normalizeModel(pattern);
	const normalizedModel = normalizeModel(model);
	if (!normalizedPattern || !normalizedModel) {
		return false;
	}
	if (!normalizedPattern.includes("*")) {
		return normalizedPattern === normalizedModel;
	}
	const escaped = normalizedPattern
		.split("*")
		.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
		.join(".*");
	return new RegExp(`^${escaped}$`, "i").test(normalizedModel);
}

function patternSpecificity(pattern: string): number {
	return pattern.replace(/\*/g, "").length;
}

export function resolveModelPrice(
	prices: ModelPriceRecord[],
	model: string | null | undefined,
): ModelPriceRecord | null {
	const canonicalModel = deriveCanonicalModel(model);
	const candidates = prices.filter(
		(item) =>
			item.enabled !== 0 &&
			item.source !== ("builtin" as ModelPriceSource) &&
			((item.canonical_model &&
				canonicalModel &&
				canonicalModelEquals(item.canonical_model, canonicalModel)) ||
				modelPatternMatches(item.model_pattern, model)),
	);
	candidates.sort((left, right) => {
		const sourceDelta =
			SOURCE_PRIORITY[right.source] - SOURCE_PRIORITY[left.source];
		if (sourceDelta !== 0) {
			return sourceDelta;
		}
		const specificityDelta =
			patternSpecificity(right.model_pattern) -
			patternSpecificity(left.model_pattern);
		if (specificityDelta !== 0) {
			return specificityDelta;
		}
		return right.updated_at.localeCompare(left.updated_at);
	});
	return candidates[0] ?? null;
}

function safeCount(value: number | null | undefined): number {
	if (value === null || value === undefined || !Number.isFinite(value)) {
		return 0;
	}
	return Math.max(0, Math.floor(value));
}

function pricePart(tokens: number, pricePer1m: number, markup: number): number {
	const price = Number.isFinite(pricePer1m) ? pricePer1m : 0;
	return (tokens / 1_000_000) * price * markup;
}

export function calculateUsageCharge(input: {
	model: string | null | undefined;
	prices: ModelPriceRecord[];
	usage: ChargeableUsage;
	markup: number;
	defaultCurrency?: string;
}): ChargeResult {
	const price = resolveModelPrice(input.prices, input.model);
	const defaultCurrency = input.defaultCurrency ?? "USD";
	if (!price) {
		return {
			status: "missing_price",
			amount: 0,
			currency: defaultCurrency,
			source: "none",
			price: null,
			detail: {
				model: input.model ?? null,
				reason: "missing_price",
			},
		};
	}

	const markup =
		Number.isFinite(input.markup) && input.markup > 0 ? input.markup : 1;
	const completionTokens = safeCount(input.usage.completionTokens);
	const cacheReadInputTokens = safeCount(input.usage.cacheReadInputTokens);
	const cacheWriteInputTokens = safeCount(input.usage.cacheWriteInputTokens);
	const promptTokens = safeCount(input.usage.promptTokens);
	const providedUncached = input.usage.uncachedInputTokens;
	const uncachedInputTokens =
		providedUncached === null || providedUncached === undefined
			? Math.max(0, promptTokens - cacheReadInputTokens - cacheWriteInputTokens)
			: safeCount(providedUncached);
	const amount =
		pricePart(uncachedInputTokens, price.input_price_per_1m, markup) +
		pricePart(cacheReadInputTokens, price.cache_read_price_per_1m, markup) +
		pricePart(cacheWriteInputTokens, price.cache_write_price_per_1m, markup) +
		pricePart(completionTokens, price.output_price_per_1m, markup);

	return {
		status: "ok",
		amount,
		currency: price.currency || defaultCurrency,
		source: price.source,
		price,
		detail: {
			model: input.model ?? null,
			canonical_model:
				price.canonical_model ?? deriveCanonicalModel(input.model),
			price_id: price.id,
			provider: price.provider,
			price_canonical_model: price.canonical_model,
			model_pattern: price.model_pattern,
			source: price.source,
			markup,
			currency: price.currency || defaultCurrency,
			uncached_input_tokens: uncachedInputTokens,
			cache_read_input_tokens: cacheReadInputTokens,
			cache_write_input_tokens: cacheWriteInputTokens,
			output_tokens: completionTokens,
			input_price_per_1m: price.input_price_per_1m * markup,
			cache_read_price_per_1m: price.cache_read_price_per_1m * markup,
			cache_write_price_per_1m: price.cache_write_price_per_1m * markup,
			output_price_per_1m: price.output_price_per_1m * markup,
		},
	};
}
