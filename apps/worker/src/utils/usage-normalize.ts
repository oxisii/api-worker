export type NormalizedUsage = {
	totalTokens: number;
	promptTokens: number;
	completionTokens: number;
	cacheReadInputTokens: number;
	cacheWriteInputTokens: number;
	uncachedInputTokens: number;
};

function toNumber(value: unknown): number | null {
	if (value === null || value === undefined) {
		return null;
	}
	const num = Number(value);
	return Number.isFinite(num) ? Math.max(0, Math.floor(num)) : null;
}

function pickNumberFromRecord(
	record: Record<string, unknown> | null,
	keys: string[],
): number | null {
	if (!record) {
		return null;
	}
	for (const key of keys) {
		const value = toNumber(record[key]);
		if (value !== null) {
			return value;
		}
	}
	return null;
}

function sumNumbersFromRecord(
	record: Record<string, unknown> | null,
	keys: string[],
): number | null {
	if (!record) {
		return null;
	}
	let total = 0;
	let found = false;
	for (const key of keys) {
		const value = toNumber(record[key]);
		if (value !== null) {
			total += value;
			found = true;
		}
	}
	return found ? total : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function findUsageRecord(payload: unknown): Record<string, unknown> | null {
	const data = asRecord(payload);
	if (!data) {
		return null;
	}
	const direct = asRecord(data.usage);
	if (direct) {
		return direct;
	}
	const response = asRecord(data.response);
	const responseUsage = asRecord(response?.usage);
	if (responseUsage) {
		return responseUsage;
	}
	const nestedData = asRecord(data.data);
	const nestedDataUsage = asRecord(nestedData?.usage);
	if (nestedDataUsage) {
		return nestedDataUsage;
	}
	const message = asRecord(data.message);
	const messageUsage = asRecord(message?.usage);
	if (messageUsage) {
		return messageUsage;
	}
	return data;
}

function findGeminiUsageMetadata(
	payload: unknown,
): Record<string, unknown> | null {
	const data = asRecord(payload);
	if (!data) {
		return null;
	}
	return (
		asRecord(data.usageMetadata) ??
		asRecord(data.usage_metadata) ??
		asRecord(asRecord(data.response)?.usageMetadata)
	);
}

export function normalizeUsageObject(payload: unknown): NormalizedUsage | null {
	const usageRecord = findUsageRecord(payload);
	const geminiMetadata = findGeminiUsageMetadata(payload);
	const explicitPromptTokens = pickNumberFromRecord(usageRecord, [
		"prompt_tokens",
		"promptTokens",
	]);
	const directInputTokens = pickNumberFromRecord(usageRecord, [
		"input_tokens",
		"inputTokens",
	]);
	const geminiPromptTokens = pickNumberFromRecord(geminiMetadata, [
		"promptTokenCount",
		"prompt_tokens",
		"inputTokenCount",
		"input_tokens",
	]);
	const promptTokens =
		explicitPromptTokens ?? directInputTokens ?? geminiPromptTokens;
	const completionTokens =
		pickNumberFromRecord(usageRecord, [
			"completion_tokens",
			"completionTokens",
			"output_tokens",
			"outputTokens",
		]) ??
		pickNumberFromRecord(geminiMetadata, [
			"candidatesTokenCount",
			"completionTokenCount",
			"output_tokens",
		]);
	const cacheReadInputTokens =
		pickNumberFromRecord(usageRecord, [
			"cache_read_input_tokens",
			"cacheReadInputTokens",
		]) ??
		pickNumberFromRecord(asRecord(usageRecord?.prompt_tokens_details), [
			"cached_tokens",
			"cachedTokens",
		]) ??
		pickNumberFromRecord(asRecord(usageRecord?.input_tokens_details), [
			"cached_tokens",
			"cachedTokens",
		]) ??
		pickNumberFromRecord(geminiMetadata, [
			"cachedContentTokenCount",
			"cached_content_token_count",
		]) ??
		0;
	const promptTokenDetails = asRecord(usageRecord?.prompt_tokens_details);
	const inputTokenDetails = asRecord(usageRecord?.input_tokens_details);
	const cacheWriteInputTokens =
		pickNumberFromRecord(usageRecord, [
			"cache_creation_input_tokens",
			"cacheCreationInputTokens",
			"cache_write_input_tokens",
			"cacheWriteInputTokens",
		]) ??
		pickNumberFromRecord(promptTokenDetails, [
			"cached_creation_tokens",
			"cachedCreationTokens",
		]) ??
		pickNumberFromRecord(inputTokenDetails, [
			"cached_creation_tokens",
			"cachedCreationTokens",
		]) ??
		sumNumbersFromRecord(usageRecord, [
			"claude_cache_creation_5_m_tokens",
			"claude_cache_creation_1_h_tokens",
			"claudeCacheCreation5MTokens",
			"claudeCacheCreation1HTokens",
		]) ??
		0;
	const hasClaudeCacheFields =
		usageRecord?.cache_read_input_tokens !== undefined ||
		usageRecord?.cache_creation_input_tokens !== undefined ||
		usageRecord?.cacheReadInputTokens !== undefined ||
		usageRecord?.cacheCreationInputTokens !== undefined;
	let resolvedPromptTokens = promptTokens;
	if (
		explicitPromptTokens === null &&
		directInputTokens !== null &&
		hasClaudeCacheFields
	) {
		resolvedPromptTokens =
			directInputTokens + cacheReadInputTokens + cacheWriteInputTokens;
	} else if (resolvedPromptTokens === null && directInputTokens !== null) {
		resolvedPromptTokens =
			directInputTokens + cacheReadInputTokens + cacheWriteInputTokens;
	}
	if (resolvedPromptTokens === null && geminiMetadata) {
		resolvedPromptTokens = pickNumberFromRecord(geminiMetadata, [
			"promptTokenCount",
			"prompt_tokens",
		]);
	}
	const resolvedCompletionTokens = completionTokens ?? 0;
	let totalTokens =
		pickNumberFromRecord(usageRecord, [
			"total_tokens",
			"totalTokens",
			"total",
			"tokens",
			"token_count",
		]) ??
		pickNumberFromRecord(geminiMetadata, ["totalTokenCount", "total_tokens"]);
	if (totalTokens === null && resolvedPromptTokens !== null) {
		totalTokens = resolvedPromptTokens + resolvedCompletionTokens;
	}
	if (totalTokens === null) {
		return null;
	}
	const finalPromptTokens =
		resolvedPromptTokens ?? Math.max(0, totalTokens - resolvedCompletionTokens);
	const uncachedInputTokens =
		explicitPromptTokens === null &&
		directInputTokens !== null &&
		hasClaudeCacheFields
			? directInputTokens
			: Math.max(
					0,
					finalPromptTokens - cacheReadInputTokens - cacheWriteInputTokens,
				);
	return {
		totalTokens,
		promptTokens: finalPromptTokens,
		completionTokens: resolvedCompletionTokens,
		cacheReadInputTokens,
		cacheWriteInputTokens,
		uncachedInputTokens,
	};
}

export function enrichNormalizedUsage(
	base: Pick<
		NormalizedUsage,
		"totalTokens" | "promptTokens" | "completionTokens"
	> | null,
	source: unknown,
): NormalizedUsage | null {
	const enriched = normalizeUsageObject(source);
	if (enriched) {
		return enriched;
	}
	if (!base) {
		return null;
	}
	return {
		...base,
		cacheReadInputTokens: 0,
		cacheWriteInputTokens: 0,
		uncachedInputTokens: Math.max(0, base.promptTokens),
	};
}
