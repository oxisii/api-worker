import {
	adaptAnthropicJsonToGemini,
	adaptAnthropicJsonToOpenAi,
	adaptAnthropicSseToGemini,
	adaptAnthropicSseToOpenAi,
} from "./anthropic";
import {
	adaptGeminiJsonToAnthropic,
	adaptGeminiJsonToOpenAi,
	adaptGeminiSseToAnthropic,
	adaptGeminiSseToOpenAi,
} from "./gemini";
import {
	adaptOpenAiChatJsonToResponses,
	adaptOpenAiChatSseToResponses,
	adaptOpenAiJsonToAnthropic,
	adaptOpenAiJsonToGemini,
	adaptOpenAiResponsesJsonToChat,
	adaptOpenAiResponsesSseToChat,
	adaptOpenAiSseToAnthropic,
	adaptOpenAiSseToGemini,
} from "./openai";
import type { AdapterFn, AdaptOptions } from "./shared";
const adapters: Record<string, AdapterFn> = {
	"openai->anthropic": async (options) => {
		if (options.isStream) {
			return adaptOpenAiSseToAnthropic(options);
		}
		return adaptOpenAiJsonToAnthropic(options);
	},
	"openai->gemini": async (options) => {
		if (options.isStream) {
			return adaptOpenAiSseToGemini(options);
		}
		return adaptOpenAiJsonToGemini(options);
	},
	"anthropic->openai": async (options) => {
		if (options.isStream) {
			return adaptAnthropicSseToOpenAi(options);
		}
		return adaptAnthropicJsonToOpenAi(options);
	},
	"anthropic->gemini": async (options) => {
		if (options.isStream) {
			return adaptAnthropicSseToGemini(options);
		}
		return adaptAnthropicJsonToGemini(options);
	},
	"gemini->openai": async (options) => {
		if (options.isStream) {
			return adaptGeminiSseToOpenAi(options);
		}
		return adaptGeminiJsonToOpenAi(options);
	},
	"gemini->anthropic": async (options) => {
		if (options.isStream) {
			return adaptGeminiSseToAnthropic(options);
		}
		return adaptGeminiJsonToAnthropic(options);
	},
};

export async function adaptChatResponse(
	options: AdaptOptions,
): Promise<Response> {
	if (
		options.upstreamProvider === options.downstreamProvider &&
		options.upstreamEndpoint === options.downstreamEndpoint
	) {
		return options.response;
	}
	if (
		options.upstreamProvider === "openai" &&
		options.downstreamProvider === "openai"
	) {
		if (
			options.upstreamEndpoint === "responses" &&
			options.downstreamEndpoint === "chat"
		) {
			return options.isStream
				? adaptOpenAiResponsesSseToChat(options)
				: adaptOpenAiResponsesJsonToChat(options);
		}
		if (
			options.upstreamEndpoint === "chat" &&
			options.downstreamEndpoint === "responses"
		) {
			return options.isStream
				? adaptOpenAiChatSseToResponses(options)
				: adaptOpenAiChatJsonToResponses(options);
		}
		return options.response;
	}
	const key = `${options.upstreamProvider}->${options.downstreamProvider}`;
	const adapter = adapters[key];
	if (!adapter) {
		return options.response;
	}
	return adapter(options);
}