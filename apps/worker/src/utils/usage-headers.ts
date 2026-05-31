import type { NormalizedUsage } from "./usage-normalize";

export const buildUsageHeaders = (
	usage: NormalizedUsage,
): Record<string, string> => {
	const payload = JSON.stringify({
		totalTokens: usage.totalTokens,
		promptTokens: usage.promptTokens,
		completionTokens: usage.completionTokens,
		cacheReadInputTokens: usage.cacheReadInputTokens,
		cacheWriteInputTokens: usage.cacheWriteInputTokens,
		uncachedInputTokens: usage.uncachedInputTokens,
	});
	return {
		"x-usage": payload,
		"x-openai-usage": payload,
		"x-usage-total-tokens": String(usage.totalTokens),
		"x-openai-usage-total-tokens": String(usage.totalTokens),
		"x-usage-prompt-tokens": String(usage.promptTokens),
		"x-openai-usage-prompt-tokens": String(usage.promptTokens),
		"x-usage-completion-tokens": String(usage.completionTokens),
		"x-openai-usage-completion-tokens": String(usage.completionTokens),
		"x-usage-cache-read-input-tokens": String(usage.cacheReadInputTokens),
		"x-usage-cache-write-input-tokens": String(usage.cacheWriteInputTokens),
		"x-usage-uncached-input-tokens": String(usage.uncachedInputTokens),
	};
};
