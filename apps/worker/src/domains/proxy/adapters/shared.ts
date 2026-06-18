import { safeJsonParse } from "../../../utils/json";
import {
	adaptChatJsonViaWasm,
	adaptSseLineViaWasm,
	geminiUsageTokensViaWasm,
} from "../../../wasm/core";
import type { EndpointType, ProviderType } from "../../../services/provider-transform";

export type AdaptOptions = {
	response: Response;
	upstreamProvider: ProviderType;
	downstreamProvider: ProviderType;
	upstreamEndpoint: EndpointType;
	downstreamEndpoint: EndpointType;
	model: string | null;
	isStream: boolean;
};

export type AdapterFn = (options: AdaptOptions) => Promise<Response>;

export function isOpenAiHiddenTextPart(record: Record<string, unknown>): boolean {
	const type = typeof record.type === "string" ? record.type : null;
	if (
		type === "reasoning" ||
		type === "reasoning_text" ||
		type === "thinking"
	) {
		return true;
	}
	if (record.reasoning === true || record.thought === true) {
		return true;
	}
	return false;
}

export function readVisibleOpenAiTextPart(part: unknown): string {
	if (typeof part === "string") {
		return part;
	}
	if (!part || typeof part !== "object") {
		return "";
	}
	const record = part as Record<string, unknown>;
	if (isOpenAiHiddenTextPart(record)) {
		return "";
	}
	return typeof record.text === "string" ? record.text : "";
}

export function openAiContentToText(content: unknown): string {
	if (typeof content === "string") {
		return content;
	}
	if (!Array.isArray(content)) {
		return "";
	}
	return content.map((part) => readVisibleOpenAiTextPart(part)).join("");
}

export function anthropicContentToText(content: unknown): string {
	if (!Array.isArray(content)) {
		return "";
	}
	return content
		.map((part) => {
			if (!part || typeof part !== "object") {
				return "";
			}
			const record = part as Record<string, unknown>;
			if (record.type === "text" && typeof record.text === "string") {
				return record.text;
			}
			return "";
		})
		.join("");
}

export function geminiCandidateText(payload: Record<string, unknown>): string {
	const candidates = Array.isArray(payload.candidates)
		? (payload.candidates as Record<string, unknown>[])
		: [];
	const firstCandidate = candidates[0] ?? {};
	const content =
		firstCandidate.content && typeof firstCandidate.content === "object"
			? (firstCandidate.content as Record<string, unknown>)
			: {};
	const parts = Array.isArray(content.parts)
		? (content.parts as Record<string, unknown>[])
		: [];
	return parts
		.map((part) => {
			if (
				part.thought === true ||
				part.thoughtSignature !== undefined ||
				(part.partMetadata &&
					typeof part.partMetadata === "object" &&
					(part.partMetadata as Record<string, unknown>).thought === true)
			) {
				return "";
			}
			return typeof part.text === "string" ? part.text : "";
		})
		.join("");
}

export function geminiUsageTokens(payload: Record<string, unknown>): {
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
} {
	const usage = geminiUsageTokensViaWasm(payload);
	return usage ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
}

export function writeSseEvent(
	controller: ReadableStreamDefaultController<Uint8Array>,
	encoder: TextEncoder,
	event: string,
	data: Record<string, unknown>,
): void {
	controller.enqueue(encoder.encode(`event: ${event}\n`));
	controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

export function writeOpenAiSseChunk(
	controller: ReadableStreamDefaultController<Uint8Array>,
	encoder: TextEncoder,
	data: Record<string, unknown>,
): void {
	controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

export function writeOpenAiResponsesChunk(
	controller: ReadableStreamDefaultController<Uint8Array>,
	encoder: TextEncoder,
	data: Record<string, unknown>,
): void {
	controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

export function toOpenAiChatCompletionFromText(
	text: string,
	model: string | null,
	finishReason: string | null,
	usage?: {
		inputTokens: number;
		outputTokens: number;
		totalTokens: number;
	},
): Record<string, unknown> {
	return {
		id: `chatcmpl_${Date.now()}`,
		object: "chat.completion",
		created: Math.floor(Date.now() / 1000),
		model: model ?? "",
		choices: [
			{
				index: 0,
				message: {
					role: "assistant",
					content: text,
				},
				finish_reason: finishReason ?? "stop",
			},
		],
		usage: usage
			? {
					prompt_tokens: usage.inputTokens,
					completion_tokens: usage.outputTokens,
					total_tokens: usage.totalTokens,
				}
			: undefined,
	};
}

export function toOpenAiResponsesFromText(
	text: string,
	model: string | null,
	usage?: {
		inputTokens: number;
		outputTokens: number;
		totalTokens: number;
	},
): Record<string, unknown> {
	return {
		id: `resp_${Date.now()}`,
		object: "response",
		model: model ?? "",
		output: [
			{
				type: "message",
				role: "assistant",
				content: [
					{
						type: "output_text",
						text,
					},
				],
			},
		],
		output_text: text,
		usage: usage
			? {
					input_tokens: usage.inputTokens,
					output_tokens: usage.outputTokens,
					total_tokens: usage.totalTokens,
				}
			: undefined,
	};
}

export function parseJsonFromStreamLine(line: string): Record<string, unknown> | null {
	const trimmed = line.trim();
	if (!trimmed) {
		return null;
	}
	const payload = trimmed.startsWith("data:")
		? trimmed.slice(5).trim()
		: trimmed;
	if (!payload || payload === "[DONE]") {
		return null;
	}
	return safeJsonParse<Record<string, unknown> | null>(payload, null);
}

export type OpenAiStreamToolCallDelta = {
	index: number;
	id: string | null;
	name: string | null;
	argumentsChunk: string;
};

export type OpenAiResponsesToolCallState = {
	outputIndex: number;
	itemId: string;
	callId: string;
	name: string | null;
	argumentsText: string;
	started: boolean;
};

export function extractOpenAiToolCallDeltas(
	payload: Record<string, unknown>,
): OpenAiStreamToolCallDelta[] {
	const choices = Array.isArray(payload.choices)
		? (payload.choices as Record<string, unknown>[])
		: [];
	const firstChoice = choices[0];
	if (!firstChoice || typeof firstChoice !== "object") {
		return [];
	}
	const delta =
		firstChoice.delta && typeof firstChoice.delta === "object"
			? (firstChoice.delta as Record<string, unknown>)
			: null;
	if (!delta || !Array.isArray(delta.tool_calls)) {
		return [];
	}
	return delta.tool_calls.flatMap((rawToolCall, position) => {
		if (!rawToolCall || typeof rawToolCall !== "object") {
			return [];
		}
		const toolCall = rawToolCall as Record<string, unknown>;
		const fn =
			toolCall.function && typeof toolCall.function === "object"
				? (toolCall.function as Record<string, unknown>)
				: null;
		return [
			{
				index: typeof toolCall.index === "number" ? toolCall.index : position,
				id: typeof toolCall.id === "string" ? toolCall.id : null,
				name: typeof fn?.name === "string" ? fn.name : null,
				argumentsChunk: typeof fn?.arguments === "string" ? fn.arguments : "",
			},
		];
	});
}

export function closeAnthropicContentBlock(
	controller: ReadableStreamDefaultController<Uint8Array>,
	encoder: TextEncoder,
	index: number,
): void {
	writeSseEvent(controller, encoder, "content_block_stop", {
		type: "content_block_stop",
		index,
	});
}

export function extractOpenAiResponseUsage(payload: Record<string, unknown>): {
	inputTokens: number;
	outputTokens: number;
	totalTokens: number;
} | null {
	const usage = payload.usage;
	if (!usage || typeof usage !== "object") {
		return null;
	}
	const record = usage as Record<string, unknown>;
	const inputTokens =
		typeof record.input_tokens === "number" ? record.input_tokens : 0;
	const outputTokens =
		typeof record.output_tokens === "number" ? record.output_tokens : 0;
	const totalTokens =
		typeof record.total_tokens === "number"
			? record.total_tokens
			: inputTokens + outputTokens;
	return {
		inputTokens,
		outputTokens,
		totalTokens,
	};
}

export function extractOpenAiResponseText(payload: Record<string, unknown>): string {
	const output = Array.isArray(payload.output)
		? (payload.output as Record<string, unknown>[])
		: [];
	if (output.length > 0) {
		const chunks: string[] = [];
		for (const item of output) {
			if (
				item.type === "reasoning" ||
				item.type === "thinking" ||
				item.type === "reasoning_summary"
			) {
				continue;
			}
			const content = Array.isArray(item.content)
				? (item.content as Record<string, unknown>[])
				: [];
			for (const part of content) {
				const text = readVisibleOpenAiTextPart(part);
				if (text) {
					chunks.push(text);
				}
			}
		}
		return chunks.join("");
	}
	if (typeof payload.output_text === "string") {
		return payload.output_text;
	}
	return "";
}

export function writeGeminiChunk(
	controller: ReadableStreamDefaultController<Uint8Array>,
	encoder: TextEncoder,
	data: Record<string, unknown>,
): void {
	controller.enqueue(encoder.encode(`${JSON.stringify(data)}\n`));
}

export function ensureOpenAiResponsesToolCallStarted(
	controller: ReadableStreamDefaultController<Uint8Array>,
	encoder: TextEncoder,
	state: OpenAiResponsesToolCallState,
): void {
	if (state.started || !state.name) {
		return;
	}
	state.started = true;
	writeOpenAiResponsesChunk(controller, encoder, {
		type: "response.output_item.added",
		output_index: state.outputIndex,
		item: {
			id: state.itemId,
			type: "function_call",
			call_id: state.callId,
			name: state.name,
			arguments: "",
		},
	});
}

export function closeOpenAiResponsesToolCalls(
	controller: ReadableStreamDefaultController<Uint8Array>,
	encoder: TextEncoder,
	toolCallState: Map<number, OpenAiResponsesToolCallState>,
): Array<Record<string, unknown>> {
	const output: Array<Record<string, unknown>> = [];
	for (const [, state] of [...toolCallState.entries()].sort(
		([left], [right]) => left - right,
	)) {
		ensureOpenAiResponsesToolCallStarted(controller, encoder, state);
		if (!state.started) {
			continue;
		}
		writeOpenAiResponsesChunk(controller, encoder, {
			type: "response.function_call_arguments.done",
			item_id: state.itemId,
			output_index: state.outputIndex,
			arguments: state.argumentsText,
		});
		writeOpenAiResponsesChunk(controller, encoder, {
			type: "response.output_item.done",
			output_index: state.outputIndex,
			item: {
				id: state.itemId,
				type: "function_call",
				call_id: state.callId,
				name: state.name ?? "",
				arguments: state.argumentsText,
			},
		});
		output.push({
			id: state.itemId,
			type: "function_call",
			call_id: state.callId,
			name: state.name ?? "",
			arguments: state.argumentsText,
		});
	}
	return output;
}
