export type SiteCallTokenInput = {
	name?: string;
	api_key?: string;
	priority?: number;
};

export type NormalizedSiteCallToken = {
	name: string;
	api_key: string;
	priority: number;
};

const trimCallTokenValue = (value: unknown): string => {
	if (typeof value !== "string") {
		return "";
	}
	return value.trim();
};

export const normalizeCallTokens = (
	rawTokens: SiteCallTokenInput[] | undefined,
	fallbackApiKey: string | undefined,
): NormalizedSiteCallToken[] => {
	const tokens =
		rawTokens?.map((token, index) => ({
			name: trimCallTokenValue(token.name) || `调用令牌${index + 1}`,
			api_key: trimCallTokenValue(token.api_key),
			priority: Math.max(0, Number(token.priority ?? index) || 0),
			index,
		})) ?? [];
	const filtered = tokens
		.filter((token) => token.api_key.length > 0)
		.sort((left, right) =>
			left.priority === right.priority
				? left.index - right.index
				: left.priority - right.priority,
		)
		.map((token, index) => ({
			name: token.name,
			api_key: token.api_key,
			priority: index,
		}));
	if (filtered.length > 0) {
		return filtered;
	}
	const fallback = trimCallTokenValue(fallbackApiKey);
	if (fallback) {
		return [
			{
				name: "主调用令牌",
				api_key: fallback,
				priority: 0,
			},
		];
	}
	return [];
};
