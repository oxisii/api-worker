import { safeJsonParse } from "../../../utils/json";
import {
	adaptChatJsonViaWasm,
	adaptSseLineViaWasm,
} from "../../../wasm/core";
import {
	closeAnthropicContentBlock,
	closeOpenAiResponsesToolCalls,
	ensureOpenAiResponsesToolCallStarted,
	extractOpenAiResponseText,
	extractOpenAiResponseUsage,
	extractOpenAiToolCallDeltas,
	openAiContentToText,
	parseJsonFromStreamLine,
	toOpenAiChatCompletionFromText,
	toOpenAiResponsesFromText,
	writeGeminiChunk,
	writeOpenAiResponsesChunk,
	writeOpenAiSseChunk,
	writeSseEvent,
	type AdaptOptions,
	type OpenAiResponsesToolCallState,
} from "./shared";
export async function adaptOpenAiResponsesJsonToChat(
	options: AdaptOptions,
): Promise<Response> {
	const payload = (await options.response
		.clone()
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	if (!payload) {
		throw new Error("Invalid OpenAI Responses JSON payload");
	}
	const text = extractOpenAiResponseText(payload);
	const usage = extractOpenAiResponseUsage(payload);
	const normalized = toOpenAiChatCompletionFromText(
		text,
		options.model,
		"stop",
		usage ?? undefined,
	);
	const headers = new Headers(options.response.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	headers.delete("content-length");
	return new Response(JSON.stringify(normalized), {
		status: options.response.status,
		headers,
	});
}

export async function adaptOpenAiChatJsonToResponses(
	options: AdaptOptions,
): Promise<Response> {
	const payload = (await options.response
		.clone()
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	if (!payload) {
		throw new Error("Invalid OpenAI Chat JSON payload");
	}
	const choices = Array.isArray(payload.choices)
		? (payload.choices as Record<string, unknown>[])
		: [];
	const firstChoice = choices[0] ?? {};
	const message =
		firstChoice.message && typeof firstChoice.message === "object"
			? (firstChoice.message as Record<string, unknown>)
			: {};
	const text = openAiContentToText(message.content);
	const usageRecord =
		payload.usage && typeof payload.usage === "object"
			? (payload.usage as Record<string, unknown>)
			: null;
	const usage = usageRecord
		? {
				inputTokens:
					typeof usageRecord.prompt_tokens === "number"
						? usageRecord.prompt_tokens
						: 0,
				outputTokens:
					typeof usageRecord.completion_tokens === "number"
						? usageRecord.completion_tokens
						: 0,
				totalTokens:
					typeof usageRecord.total_tokens === "number"
						? usageRecord.total_tokens
						: (typeof usageRecord.prompt_tokens === "number"
								? usageRecord.prompt_tokens
								: 0) +
							(typeof usageRecord.completion_tokens === "number"
								? usageRecord.completion_tokens
								: 0),
			}
		: undefined;
	const normalized = toOpenAiResponsesFromText(text, options.model, usage);
	const headers = new Headers(options.response.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	headers.delete("content-length");
	return new Response(JSON.stringify(normalized), {
		status: options.response.status,
		headers,
	});
}

export function adaptOpenAiResponsesSseToChat(options: AdaptOptions): Response {
	if (!options.response.body) {
		return options.response;
	}
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();
	const reader = options.response.body.getReader();
	const completionId = `chatcmpl_${Date.now()}`;
	const created = Math.floor(Date.now() / 1000);
	let buffer = "";
	let started = false;
	let stopped = false;

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						break;
					}
					buffer += decoder.decode(value, { stream: true });
					let newlineIndex = buffer.indexOf("\n");
					while (newlineIndex !== -1) {
						const line = buffer.slice(0, newlineIndex);
						buffer = buffer.slice(newlineIndex + 1);
						const parsed = parseJsonFromStreamLine(line);
						if (!parsed) {
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						const eventType =
							typeof parsed.type === "string" ? parsed.type : null;
						if (eventType === "response.output_text.delta") {
							if (!started) {
								started = true;
								writeOpenAiSseChunk(controller, encoder, {
									id: completionId,
									object: "chat.completion.chunk",
									created,
									model: options.model ?? "",
									choices: [
										{
											index: 0,
											delta: { role: "assistant" },
											finish_reason: null,
										},
									],
								});
							}
							const delta =
								typeof parsed.delta === "string" ? parsed.delta : "";
							if (delta) {
								writeOpenAiSseChunk(controller, encoder, {
									id: completionId,
									object: "chat.completion.chunk",
									created,
									model: options.model ?? "",
									choices: [
										{
											index: 0,
											delta: { content: delta },
											finish_reason: null,
										},
									],
								});
							}
						}
						if (eventType === "response.completed" && !stopped) {
							stopped = true;
							writeOpenAiSseChunk(controller, encoder, {
								id: completionId,
								object: "chat.completion.chunk",
								created,
								model: options.model ?? "",
								choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
							});
						}
						newlineIndex = buffer.indexOf("\n");
					}
				}
				controller.enqueue(encoder.encode("data: [DONE]\n\n"));
				controller.close();
			} catch (error) {
				controller.error(error);
			} finally {
				reader.releaseLock();
			}
		},
	});

	const headers = new Headers(options.response.headers);
	headers.set("content-type", "text/event-stream; charset=utf-8");
	headers.delete("content-length");
	return new Response(stream, { status: options.response.status, headers });
}

export function adaptOpenAiChatSseToResponses(options: AdaptOptions): Response {
	if (!options.response.body) {
		return options.response;
	}
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();
	const reader = options.response.body.getReader();
	const responseId = `resp_${Date.now()}`;
	const createdAt = Math.floor(Date.now() / 1000);
	let buffer = "";
	let text = "";
	let completed = false;
	let textOutputStarted = false;
	const toolCallState = new Map<number, OpenAiResponsesToolCallState>();

	const ensureTextOutputStarted = (
		controller: ReadableStreamDefaultController<Uint8Array>,
	) => {
		if (textOutputStarted) {
			return;
		}
		textOutputStarted = true;
		writeOpenAiResponsesChunk(controller, encoder, {
			type: "response.output_item.added",
			output_index: 0,
			item: {
				id: `${responseId}_msg`,
				type: "message",
				role: "assistant",
				content: [],
			},
		});
		writeOpenAiResponsesChunk(controller, encoder, {
			type: "response.content_part.added",
			item_id: `${responseId}_msg`,
			output_index: 0,
			content_index: 0,
			part: { type: "output_text", text: "" },
		});
	};

	const buildCompletedResponse = (
		controller: ReadableStreamDefaultController<Uint8Array>,
	): Record<string, unknown> => {
		const output: Array<Record<string, unknown>> = [];
		if (textOutputStarted || text) {
			if (textOutputStarted) {
				writeOpenAiResponsesChunk(controller, encoder, {
					type: "response.content_part.done",
					item_id: `${responseId}_msg`,
					output_index: 0,
					content_index: 0,
					part: { type: "output_text", text },
				});
				writeOpenAiResponsesChunk(controller, encoder, {
					type: "response.output_item.done",
					output_index: 0,
					item: {
						id: `${responseId}_msg`,
						type: "message",
						role: "assistant",
						content: [{ type: "output_text", text }],
					},
				});
			}
			output.push({
				type: "message",
				role: "assistant",
				content: [{ type: "output_text", text }],
			});
		}
		output.push(
			...closeOpenAiResponsesToolCalls(controller, encoder, toolCallState),
		);
		return {
			id: responseId,
			object: "response",
			model: options.model ?? "",
			output:
				output.length > 0
					? output
					: toOpenAiResponsesFromText(text, options.model).output,
			output_text: text,
		};
	};

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			try {
				writeOpenAiResponsesChunk(controller, encoder, {
					type: "response.created",
					response: {
						id: responseId,
						object: "response",
						model: options.model ?? "",
						created: createdAt,
					},
				});
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						break;
					}
					buffer += decoder.decode(value, { stream: true });
					let newlineIndex = buffer.indexOf("\n");
					while (newlineIndex !== -1) {
						const line = buffer.slice(0, newlineIndex);
						buffer = buffer.slice(newlineIndex + 1);
						const parsed = parseJsonFromStreamLine(line);
						if (!parsed) {
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						const choices = Array.isArray(parsed.choices)
							? (parsed.choices as Record<string, unknown>[])
							: [];
						const firstChoice = choices[0] ?? {};
						const delta =
							firstChoice.delta && typeof firstChoice.delta === "object"
								? (firstChoice.delta as Record<string, unknown>)
								: {};
						const content = openAiContentToText(delta.content);
						if (content) {
							ensureTextOutputStarted(controller);
							text += content;
							writeOpenAiResponsesChunk(controller, encoder, {
								type: "response.output_text.delta",
								delta: content,
							});
						}
						for (const toolCallDelta of extractOpenAiToolCallDeltas(parsed)) {
							const outputIndex =
								(textOutputStarted || text ? 1 : 0) + toolCallDelta.index;
							const state = toolCallState.get(toolCallDelta.index) ?? {
								outputIndex,
								itemId: toolCallDelta.id
									? `fc_${toolCallDelta.id}`
									: `${responseId}_fc_${toolCallDelta.index}`,
								callId:
									toolCallDelta.id ??
									`${responseId}_call_${toolCallDelta.index}`,
								name: null,
								argumentsText: "",
								started: false,
							};
							if (toolCallDelta.id) {
								state.callId = toolCallDelta.id;
								state.itemId = `fc_${toolCallDelta.id}`;
							}
							if (toolCallDelta.name) {
								state.name = toolCallDelta.name;
							}
							ensureOpenAiResponsesToolCallStarted(controller, encoder, state);
							if (toolCallDelta.argumentsChunk) {
								state.argumentsText += toolCallDelta.argumentsChunk;
								writeOpenAiResponsesChunk(controller, encoder, {
									type: "response.function_call_arguments.delta",
									item_id: state.itemId,
									output_index: state.outputIndex,
									delta: toolCallDelta.argumentsChunk,
								});
							}
							toolCallState.set(toolCallDelta.index, state);
						}
						if (firstChoice.finish_reason && !completed) {
							completed = true;
							writeOpenAiResponsesChunk(controller, encoder, {
								type: "response.completed",
								response: buildCompletedResponse(controller),
							});
						}
						newlineIndex = buffer.indexOf("\n");
					}
				}
				if (!completed) {
					writeOpenAiResponsesChunk(controller, encoder, {
						type: "response.completed",
						response: buildCompletedResponse(controller),
					});
				}
				controller.enqueue(encoder.encode("data: [DONE]\n\n"));
				controller.close();
			} catch (error) {
				controller.error(error);
			} finally {
				reader.releaseLock();
			}
		},
	});
	const headers = new Headers(options.response.headers);
	headers.set("content-type", "text/event-stream; charset=utf-8");
	headers.delete("content-length");
	return new Response(stream, { status: options.response.status, headers });
}

export async function adaptOpenAiJsonToAnthropic(
	options: AdaptOptions,
): Promise<Response> {
	const payload = (await options.response
		.clone()
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	if (!payload) {
		throw new Error("Invalid OpenAI JSON payload");
	}
	const wasmTransformed = adaptChatJsonViaWasm(
		"openai_to_anthropic",
		payload,
		options.model,
	);
	if (!wasmTransformed) {
		throw new Error("WASM transform failed: openai_to_anthropic");
	}
	const headers = new Headers(options.response.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	headers.delete("content-length");
	return new Response(JSON.stringify(wasmTransformed), {
		status: options.response.status,
		headers,
	});
}

export function adaptOpenAiSseToAnthropic(options: AdaptOptions): Response {
	if (!options.response.body) {
		return options.response;
	}
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();
	const reader = options.response.body.getReader();
	const messageId = `msg_${Date.now()}`;
	let buffer = "";
	let started = false;
	let stopped = false;
	let outputTokens = 0;
	let textBlockStarted = false;
	let textBlockClosed = false;
	const toolCallState = new Map<
		number,
		{
			id: string | null;
			name: string | null;
			started: boolean;
			closed: boolean;
			pendingArguments: string[];
		}
	>();

	const ensureMessageStart = (
		controller: ReadableStreamDefaultController<Uint8Array>,
	) => {
		if (started) {
			return;
		}
		started = true;
		writeSseEvent(controller, encoder, "message_start", {
			type: "message_start",
			message: {
				id: messageId,
				type: "message",
				role: "assistant",
				model: options.model ?? "",
				content: [],
				stop_reason: null,
				stop_sequence: null,
				usage: {
					input_tokens: 0,
					output_tokens: 0,
				},
			},
		});
	};

	const ensureTextBlockStart = (
		controller: ReadableStreamDefaultController<Uint8Array>,
	) => {
		if (textBlockStarted || textBlockClosed) {
			return;
		}
		ensureMessageStart(controller);
		textBlockStarted = true;
		writeSseEvent(controller, encoder, "content_block_start", {
			type: "content_block_start",
			index: 0,
			content_block: { type: "text", text: "" },
		});
	};

	const ensureToolUseBlockStart = (
		controller: ReadableStreamDefaultController<Uint8Array>,
		index: number,
		state: {
			id: string | null;
			name: string | null;
			started: boolean;
			closed: boolean;
			pendingArguments: string[];
		},
	) => {
		if (state.started || state.closed || !state.id || !state.name) {
			return;
		}
		if (textBlockStarted && !textBlockClosed) {
			closeAnthropicContentBlock(controller, encoder, 0);
			textBlockClosed = true;
		}
		ensureMessageStart(controller);
		state.started = true;
		writeSseEvent(controller, encoder, "content_block_start", {
			type: "content_block_start",
			index,
			content_block: {
				type: "tool_use",
				id: state.id,
				name: state.name,
				input: {},
			},
		});
		for (const pendingArguments of state.pendingArguments) {
			writeSseEvent(controller, encoder, "content_block_delta", {
				type: "content_block_delta",
				index,
				delta: {
					type: "input_json_delta",
					partial_json: pendingArguments,
				},
			});
		}
		state.pendingArguments = [];
	};

	const closeOpenBlocks = (
		controller: ReadableStreamDefaultController<Uint8Array>,
	) => {
		if (textBlockStarted && !textBlockClosed) {
			closeAnthropicContentBlock(controller, encoder, 0);
			textBlockClosed = true;
		}
		const startedToolBlocks = [...toolCallState.entries()]
			.filter(([, state]) => state.started && !state.closed)
			.sort(([left], [right]) => left - right);
		for (const [index, state] of startedToolBlocks) {
			closeAnthropicContentBlock(controller, encoder, index);
			state.closed = true;
		}
	};

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						break;
					}
					buffer += decoder.decode(value, { stream: true });
					let newlineIndex = buffer.indexOf("\n");
					while (newlineIndex !== -1) {
						const line = buffer.slice(0, newlineIndex).trim();
						buffer = buffer.slice(newlineIndex + 1);
						if (!line.startsWith("data:")) {
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						const payload = line.slice(5).trim();
						if (!payload) {
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						if (payload === "[DONE]") {
							break;
						}
						const parsed = safeJsonParse<Record<string, unknown> | null>(
							payload,
							null,
						);
						if (!parsed) {
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						const wasmLine = adaptSseLineViaWasm(
							parsed,
							"openai",
							"anthropic",
							options.model,
						);
						if (!wasmLine) {
							throw new Error("WASM SSE transform failed: openai_to_anthropic");
						}
						if (typeof wasmLine.outputTokens === "number") {
							outputTokens = wasmLine.outputTokens;
						}
						const toolCallDeltas = extractOpenAiToolCallDeltas(parsed);
						const deltaText =
							typeof wasmLine.text === "string" ? wasmLine.text : "";
						if (deltaText) {
							ensureTextBlockStart(controller);
							writeSseEvent(controller, encoder, "content_block_delta", {
								type: "content_block_delta",
								index: 0,
								delta: { type: "text_delta", text: deltaText },
							});
						}
						for (const toolCallDelta of toolCallDeltas) {
							const contentIndex =
								(textBlockStarted || textBlockClosed ? 1 : 0) +
								toolCallDelta.index;
							const state = toolCallState.get(contentIndex) ?? {
								id: null,
								name: null,
								started: false,
								closed: false,
								pendingArguments: [],
							};
							if (toolCallDelta.id) {
								state.id = toolCallDelta.id;
							}
							if (toolCallDelta.name) {
								state.name = toolCallDelta.name;
							}
							if (toolCallDelta.argumentsChunk) {
								if (state.started) {
									writeSseEvent(controller, encoder, "content_block_delta", {
										type: "content_block_delta",
										index: contentIndex,
										delta: {
											type: "input_json_delta",
											partial_json: toolCallDelta.argumentsChunk,
										},
									});
								} else {
									state.pendingArguments.push(toolCallDelta.argumentsChunk);
								}
							}
							ensureToolUseBlockStart(controller, contentIndex, state);
							toolCallState.set(contentIndex, state);
						}

						const stopReason =
							typeof wasmLine.stopReason === "string"
								? wasmLine.stopReason
								: null;
						if (stopReason && !stopped) {
							stopped = true;
							closeOpenBlocks(controller);
							writeSseEvent(controller, encoder, "message_delta", {
								type: "message_delta",
								delta: { stop_reason: stopReason, stop_sequence: null },
								usage: { output_tokens: outputTokens },
							});
							writeSseEvent(controller, encoder, "message_stop", {
								type: "message_stop",
							});
						}
						newlineIndex = buffer.indexOf("\n");
					}
				}
				if (started && !stopped) {
					closeOpenBlocks(controller);
					writeSseEvent(controller, encoder, "message_delta", {
						type: "message_delta",
						delta: { stop_reason: "end_turn", stop_sequence: null },
						usage: { output_tokens: outputTokens || 0 },
					});
					writeSseEvent(controller, encoder, "message_stop", {
						type: "message_stop",
					});
				}
				controller.close();
			} catch (error) {
				controller.error(error);
			} finally {
				reader.releaseLock();
			}
		},
	});

	const headers = new Headers(options.response.headers);
	headers.set("content-type", "text/event-stream; charset=utf-8");
	headers.delete("content-length");
	return new Response(stream, {
		status: options.response.status,
		headers,
	});
}

export async function adaptOpenAiJsonToGemini(
	options: AdaptOptions,
): Promise<Response> {
	const payload = (await options.response
		.clone()
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	if (!payload) {
		throw new Error("Invalid OpenAI JSON payload");
	}
	const wasmTransformed = adaptChatJsonViaWasm(
		"openai_to_gemini",
		payload,
		options.model,
	);
	if (!wasmTransformed) {
		throw new Error("WASM transform failed: openai_to_gemini");
	}
	const headers = new Headers(options.response.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	headers.delete("content-length");
	return new Response(JSON.stringify(wasmTransformed), {
		status: options.response.status,
		headers,
	});
}

export function adaptOpenAiSseToGemini(options: AdaptOptions): Response {
	if (!options.response.body) {
		return options.response;
	}
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();
	const reader = options.response.body.getReader();
	let buffer = "";
	let lastFinishReason: string | null = null;

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						break;
					}
					buffer += decoder.decode(value, { stream: true });
					let newlineIndex = buffer.indexOf("\n");
					while (newlineIndex !== -1) {
						const line = buffer.slice(0, newlineIndex);
						buffer = buffer.slice(newlineIndex + 1);
						const parsed = parseJsonFromStreamLine(line);
						if (!parsed) {
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						const wasmLine = adaptSseLineViaWasm(
							parsed,
							"openai",
							"gemini",
							options.model,
						);
						if (!wasmLine) {
							throw new Error("WASM SSE transform failed: openai_to_gemini");
						}
						const text = typeof wasmLine.text === "string" ? wasmLine.text : "";
						const finishReason =
							typeof wasmLine.finishReason === "string"
								? wasmLine.finishReason
								: null;
						if (finishReason) {
							lastFinishReason = finishReason;
						}
						if (text || finishReason) {
							writeGeminiChunk(controller, encoder, {
								candidates: [
									{
										content: {
											role: "model",
											parts: text ? [{ text }] : [],
										},
										finishReason: finishReason ?? undefined,
									},
								],
							});
						}
						newlineIndex = buffer.indexOf("\n");
					}
				}
				if (!lastFinishReason) {
					writeGeminiChunk(controller, encoder, {
						candidates: [
							{ content: { role: "model", parts: [] }, finishReason: "STOP" },
						],
					});
				}
				controller.close();
			} catch (error) {
				controller.error(error);
			} finally {
				reader.releaseLock();
			}
		},
	});
	const headers = new Headers(options.response.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	headers.delete("content-length");
	return new Response(stream, { status: options.response.status, headers });
}
