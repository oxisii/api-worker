export type ResponsesAffinityFamily = "openai" | "azure_openai" | "other";

export const classifyResponsesAffinityFamily = (
	baseUrl: string | null | undefined,
): ResponsesAffinityFamily => {
	if (!baseUrl) {
		return "other";
	}
	try {
		const hostname = new URL(baseUrl).hostname.toLowerCase();
		if (hostname === "api.openai.com") {
			return "openai";
		}
		if (
			hostname.endsWith(".openai.azure.com") ||
			hostname.endsWith(".services.ai.azure.com")
		) {
			return "azure_openai";
		}
		return "other";
	} catch {
		return "other";
	}
};

export const shouldAllowResponsesAffinityFallback = (
	channels: Array<{ base_url?: string | null }>,
) => {
	const families = new Set(
		channels.map((channel) =>
			classifyResponsesAffinityFamily(channel.base_url),
		),
	);
	return !(families.has("openai") && families.has("azure_openai"));
};
